/**
 * SERVICIO OFICIAL DE CONSULTA EMPRESARIAL RUES (CONFECÁMARAS) — VECY NETWORK
 * Conector HTTP directo ultraligero (Cero Puppeteer / Cero Navegador) hacia el backend
 * de producción de RUES (elasticprd.rues.org.co) con cifrado OpenSSL AES-256-CBC nativo.
 *
 * Flujo en 2 pasos (150ms - 350ms):
 * 1. Búsqueda Multi-Vía (/api/ConsultasRUES/BusquedaAvanzadaRM por NIT, Razón Social o Matrícula)
 *    con priorización inteligente de la "Sociedad o Persona Jurídica Principal" sobre sucursales/establecimientos.
 * 2. Extracción paralela de expediente (/api/Expediente/DetalleRM), vínculos societarios
 *    (/api/ConsultarVinculos) y facultades (/api/ConsultFacultadesXCamYMatricula),
 *    diferenciando jurídicamente al Representante Legal Principal (plenas facultades)
 *    de los Representantes Legales Suplentes o Judiciales (facultades restringidas).
 */

import crypto from "crypto";

function formatTitleCase(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

export function formatRuesDate(raw?: string): string | undefined {
  const clean = String(raw || "").trim();
  if (!clean || clean === "0" || clean === "00000000") return undefined;
  if (/^\d{8}$/.test(clean)) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  }
  return clean;
}

const RUES_ELASTIC_BASE_URL = "https://elasticprd.rues.org.co";
const RUES_AES_PASSPHRASE = "qwerty";
const RUES_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

export interface RepresentanteLegalInfo {
  nombre: string;
  numeroIdentificacion: string;
  numeroFormateado: string;
  tipoDocumento: string;
  cargo: string;
  tipoVinculoRaw: string;
  esPrincipal: boolean;
  advertenciaFacultades?: string;
}

export interface RuesActividadEconomica {
  codigo: string;
  descripcion: string;
}

export interface RuesEstablecimientoInfo {
  razonSocial: string;
  categoria: string;
  camaraComercio: string;
  matricula: string;
  fechaMatricula?: string;
  fechaRenovacion?: string;
  ultimoAnoRenovado?: string;
  estado: string;
}

export interface RuesCompanyDetail {
  found: boolean;
  idRm: string;
  nit: string;
  dv: string;
  razonSocial: string;
  sigla?: string;
  tipoSociedad?: string;
  organizacionJuridica: string;
  organizacionJuridicaRaw?: string;
  categoria: string;
  esSociedadPrincipal: boolean;
  codigoCamara: string;
  camaraComercio: string;
  matricula: string;
  estadoMatricula: string;
  ultimoAnoRenovado?: string;
  fechaMatricula?: string;
  fechaRenovacion?: string;
  ciiuPrincipalCodigo?: string;
  ciiuPrincipalDescripcion?: string;
  actividadesEconomicas?: RuesActividadEconomica[];
  representantePrincipal?: RepresentanteLegalInfo;
  representantesPrincipales: RepresentanteLegalInfo[];
  representantesSuplentes: RepresentanteLegalInfo[];
  todosRepresentantes: RepresentanteLegalInfo[];
  establecimientos?: RuesEstablecimientoInfo[];
  direccionComercial?: string;
  telefonoComercial?: string;
  resumenFacultades?: string;
  source: string;
}

const ruesCache = new Map<string, { data: RuesCompanyDetail; timestamp: number }>();

/**
 * Cifra un payload JSON con el algoritmo exacto esperado por RUES (CryptoJS OpenSSL AES-256-CBC Salted__ con MD5 EVP_BytesToKey).
 * Implementado en Node.js puro (módulo nativo `crypto`), sin dependencias externas ni navegador.
 */
export function encryptRuesPayload(payload: Record<string, any>): string {
  const plaintext = JSON.stringify(payload);
  const password = Buffer.from(RUES_AES_PASSPHRASE, "utf8");
  const salt = crypto.randomBytes(8);

  let derived = Buffer.alloc(0);
  let block = Buffer.alloc(0);
  while (derived.length < 48) {
    const md5 = crypto.createHash("md5");
    md5.update(block);
    md5.update(password);
    md5.update(salt);
    block = md5.digest();
    derived = Buffer.concat([derived, block]);
  }

  const key = derived.subarray(0, 32);
  const iv = derived.subarray(32, 48);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  return Buffer.concat([Buffer.from("Salted__", "utf8"), salt, encrypted]).toString("base64");
}

/**
 * Construye el identificador compuesto ID_RM de RUES: codigo_camara (sin ceros a la izquierda) + matricula (10 dígitos con ceros a la izquierda).
 */
export function buildRuesIdRm(codCamara: string, matricula: string): string {
  const cleanMat = String(matricula || "").trim().padStart(10, "0");
  const cleanCam = String(codCamara || "").trim().replace(/^0+/, "");
  return `${cleanCam}${cleanMat}`;
}

/**
 * Limpia ceros a la izquierda de un documento y lo formatea con puntos de miles para lectura ejecutiva.
 */
export function cleanAndFormatDocNumber(rawDoc: string): { clean: string; formatted: string } {
  const digits = String(rawDoc || "").replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return { clean: "", formatted: "" };
  const formatted = Number(digits).toLocaleString("es-CO");
  return { clean: digits, formatted };
}

const RUES_SOCRATA_URL = "https://www.datos.gov.co/resource/c82u-588k.json";
let elasticGeoBlockedUntil = 0;

/**
 * Diccionario de códigos CIIU Rev. 4 A.C. más frecuentes en el sector empresarial e inmobiliario colombiano.
 */
export const CIIU_DESCRIPTIONS: Record<string, string> = {
  "1103": "Producción de malta, elaboración de cervezas y otras bebidas malteadas",
  "4111": "Construcción de edificios residenciales",
  "4112": "Construcción de edificios no residenciales",
  "4210": "Construcción de carreteras y vías de ferrocarril",
  "4220": "Construcción de proyectos de servicio público",
  "4290": "Construcción de otras obras de ingeniería civil",
  "4311": "Demolición",
  "4312": "Preparación del terreno",
  "4321": "Instalaciones eléctricas",
  "4322": "Instalaciones de fontanería, calefacción y aire acondicionado",
  "4330": "Terminación y acabado de edificios y obras de ingeniería civil",
  "4390": "Otras actividades especializadas para la construcción de edificios y obras de ingeniería civil",
  "4511": "Comercio de vehículos automotores nuevos",
  "4512": "Comercio de vehículos automotores usados",
  "4610": "Comercio al por mayor a cambio de una retribución o por contrata",
  "4663": "Comercio al por mayor de materiales de construcción, artículos de ferretería, pinturas y productos de vidrio",
  "4690": "Comercio al por mayor no especializado",
  "4711": "Comercio al por menor en establecimientos no especializados con surtido compuesto principalmente por alimentos",
  "4752": "Comercio al por menor de artículos de ferretería, pinturas y productos de vidrio",
  "4921": "Transporte de pasajeros",
  "4922": "Transporte mixto",
  "4923": "Transporte de carga por carretera",
  "5210": "Almacenamiento y depósito",
  "5229": "Otras actividades complementarias al transporte",
  "5511": "Alojamiento en hoteles",
  "5519": "Otros tipos de alojamientos para visitantes",
  "5611": "Expendio a la mesa de comidas preparadas",
  "6201": "Actividades de desarrollo de sistemas informáticos (planificación, análisis, diseño, programación, pruebas)",
  "6202": "Actividades de consultoría informática y actividades de administración de instalaciones informáticas",
  "6311": "Procesamiento de datos, alojamiento (hosting) y actividades relacionadas",
  "6412": "Bancos comerciales",
  "6492": "Actividades financieras de fondos de empleados y otras formas asociativas del sector solidario",
  "6499": "Otras actividades de servicio financiero, excepto las de seguros y pensiones n.c.p.",
  "6619": "Otras actividades auxiliares de las actividades de servicios financieros n.c.p.",
  "6810": "Actividades inmobiliarias realizadas con bienes propios o arrendados",
  "6820": "Actividades inmobiliarias realizadas a cambio de una retribución o por contrata",
  "6910": "Actividades jurídicas",
  "6920": "Actividades de contabilidad, teneduría de libros, auditoría financiera y asesoría tributaria",
  "7010": "Actividades de administración empresarial",
  "7020": "Actividades de consultoría de gestión",
  "7111": "Actividades de arquitectura",
  "7112": "Actividades de ingeniería y otras actividades conexas de consultoría técnica",
  "7310": "Publicidad",
  "7490": "Otras actividades profesionales, científicas y técnicas n.c.p.",
  "7710": "Alquiler y arrendamiento de vehículos automotores",
  "7730": "Alquiler y arrendamiento de otros tipos de maquinaria, equipo y bienes tangibles n.c.p.",
  "8010": "Actividades de seguridad privada",
  "8110": "Actividades combinadas de apoyo a instalaciones",
  "8211": "Actividades combinadas de servicios administrativos de oficina",
  "8299": "Otras actividades de servicio de apoyo a las empresas n.c.p.",
  "8544": "Educación superior",
  "8610": "Actividades de hospitales y clínicas, con internación",
  "8621": "Actividades de la práctica médica, sin internación",
  "9499": "Actividades de otras asociaciones n.c.p."
};

export function formatOrganizacionJuridica(raw: string): string {
  const upper = (raw || "").toUpperCase().trim();
  if (!upper) return "Sociedad Comercial";
  if (upper.includes("SIMPLIFICADA") || upper.includes("S.A.S") || /\bSAS\b/.test(upper)) {
    return "Sociedad por Acciones Simplificada (S.A.S.)";
  }
  if (upper.includes("ANONIMA") || upper.includes("ANÓNIMA")) {
    return "Sociedad Anónima (S.A.)";
  }
  if (upper.includes("LIMITADA") || upper.includes("LTDA")) {
    return "Sociedad Limitada (LTDA.)";
  }
  if (upper.includes("COMANDITA POR ACCIONES")) {
    return "Sociedad en Comandita por Acciones (S.C.A.)";
  }
  if (upper.includes("COMANDITA SIMPLE")) {
    return "Sociedad en Comandita Simple (S. en C.)";
  }
  if (upper.includes("UNIPERSONAL")) {
    return "Empresa Unipersonal (E.U.)";
  }
  if (upper.includes("SIN ANIMO DE LUCRO") || upper.includes("ESAL")) {
    return "Entidad Sin Ánimo de Lucro (ESAL)";
  }
  return formatTitleCase(raw);
}

/**
 * Realiza una petición POST directa al backend ElasticSearch de RUES.
 * Si detecta bloqueo geográfico (HTTP 403 de AWS ELB fuera de Colombia), activa caché de conmutación rápida a Datos Abiertos.
 */
async function postRuesEncrypted(path: string, payload: Record<string, any>, timeoutMs: number = 5000): Promise<any> {
  if (!process.env.RUES_PROXY_URL && Date.now() < elasticGeoBlockedUntil) {
    return null;
  }

  const baseUrl = process.env.RUES_PROXY_URL || RUES_ELASTIC_BASE_URL;
  const encryptedBody = encryptRuesPayload(payload);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "https://www.rues.org.co",
        "Referer": "https://www.rues.org.co/",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "x-request-id": crypto.randomUUID(),
        "app-name": "RuesFront"
      },
      body: JSON.stringify({ dataBody: encryptedBody }),
      signal: controller.signal
    });

    if (res.status === 403) {
      elasticGeoBlockedUntil = Date.now() + 15 * 60 * 1000;
      return null;
    }
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await res.json();
    }
    return await res.text();
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const SPANISH_STOPWORDS = new Set([
  "DE", "DEL", "LA", "EL", "LOS", "LAS", "Y", "E", "EN", "A", "O", "U"
]);

const GENERIC_SECTOR_PREFIXES = new Set([
  "CONSTRUCTORA", "INMOBILIARIA", "GRUPO", "COMPANIA", "COMPAÑIA", "CORPORACION", "ORGANIZACION"
]);

/**
 * Normaliza una razón social eliminando acentos, caracteres especiales y formas societarias
 * (S.A.S., S.A., LTDA, S.C.A., E.U., BIC, etc.) para comparación jurídica y búsqueda de alta precisión.
 */
export function normalizeCorporateName(raw: string): string {
  if (!raw) return "";
  let clean = raw
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " Y ")
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const corporateTokensRegex = /\b(?:SOCIEDAD POR ACCIONES SIMPLIFICADAS?|SOCIEDADES POR ACCIONES SIMPLIFICADAS?|SOCIEDAD ANONIMA|SOCIEDAD LIMITADA|SOCIEDAD EN COMANDITA POR ACCIONES|SOCIEDAD EN COMANDITA SIMPLE|SOCIEDAD EN COMANDITA|SOCIEDAD COLECTIVA|EMPRESA UNIPERSONAL|EMPRESA SOCIAL DEL ESTADO|EMPRESA DE SERVICIOS PUBLICOS|COMERCIALIZADORA INTERNACIONAL|DE BENEFICIO E INTERES COLECTIVO|BENEFICIO E INTERES COLECTIVO|ENTIDAD SIN ANIMO DE LUCRO|SUCURSAL(?: EN)? COLOMBIA|EN LIQUIDACION(?: JUDICIAL)?|EN REESTRUCTURACION|EN CONCORDATO|S A S|SAS|S A|SA|LTDA|LIMITADA|S C A|SCA|S EN C POR A|S EN C|E U|EU|E S E|ESE|E S P|ESP|B I C|BIC|C I|CI|Y CIA|CIA|Y COMPANIA|COMPANIA)\b/gi;

  let prev = "";
  while (prev !== clean) {
    prev = clean;
    clean = clean.replace(corporateTokensRegex, " ").replace(/\s+/g, " ").trim();
  }

  return clean;
}

function getCoreTokens(normalizedStr: string): string[] {
  return normalizedStr
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !SPANISH_STOPWORDS.has(w));
}

/**
 * Evalúa el nivel de coincidencia entre una razón social candidata de RUES
 * y el término consultado por el usuario, descartando homónimos lejanos o empresas genéricas.
 */
export function evaluateRazonSocialMatch(query: string, recordRazon: string, recordSigla?: string): number {
  const cleanQ = (query || "").trim().toUpperCase();
  const cleanR = (recordRazon || "").trim().toUpperCase();
  const cleanS = (recordSigla || "").trim().toUpperCase();

  if (cleanR === cleanQ || (cleanS && cleanS === cleanQ)) return 100; // Coincidencia exacta perfecta
  if (cleanR.includes(cleanQ) || (cleanS && cleanS.includes(cleanQ))) {
    // Si lo contiene, penalizamos ligeramente si la diferencia de longitud es muy grande (evitar genéricos)
    const targetMatch = cleanR.includes(cleanQ) ? cleanR : cleanS;
    const diffLength = targetMatch.length - cleanQ.length;
    return 80 - Math.min(diffLength, 30);
  }
  return 0; // Si no contiene el término exacto buscado, descartar (retorna 0 para evitar falsos positivos como "Multiempresas" vs otra empresa lejana)
}

/**
 * Selecciona y prioriza siempre la "Sociedad o Persona Jurídica Principal" y con matrícula ACTIVA
 * por encima de sucursales, agencias o establecimientos de comercio, aplicando filtro riguroso
 * de coincidencia exacta o de alta proximidad sobre la razón social cuando se consulta por nombre.
 */
export function selectPrincipalRuesRecord(
  registros: any[],
  targetNit?: string,
  targetRazon?: string
): any | null {
  if (!Array.isArray(registros) || registros.length === 0) return null;

  const cleanTargetNit = (targetNit || "").replace(/\D/g, "").replace(/^0+/, "");
  const cleanTargetRazon = (targetRazon || "").trim();

  // Si se consulta por Razón Social (sin NIT explícito), filtrar primero con rigor de coincidencia
  let eligibleRecords = registros;

  if (!cleanTargetNit && cleanTargetRazon) {
    const matchingRecords = registros.filter((reg) => {
      const candRazon = String(reg.razon_social || reg.nombre || "").trim();
      const candSigla = String(reg.sigla || "").trim();
      const matchScore = evaluateRazonSocialMatch(cleanTargetRazon, candRazon, candSigla);
      return matchScore > 0;
    });

    // Si NINGÚN registro contiene el término exacto buscado, descartar para evitar falsos positivos
    if (matchingRecords.length === 0) {
      return null;
    }
    eligibleRecords = matchingRecords;
  }

  const scored = eligibleRecords.map((reg) => {
    let score = 0;
    const cat = String(reg.categoria || reg.categoria_matricula || "").toUpperCase();
    const est = String(reg.estado_matricula || "").toUpperCase();
    const org = String(reg.organizacion_juridica || "").toUpperCase();
    const regNit = String(reg.nit || reg.numero_identificacion || "").replace(/\D/g, "").replace(/^0+/, "");
    const candRazon = String(reg.razon_social || reg.nombre || "").trim();
    const candSigla = String(reg.sigla || "").trim();

    if (cleanTargetNit && regNit === cleanTargetNit) score += 1000;

    if (cleanTargetRazon) {
      const matchScore = evaluateRazonSocialMatch(cleanTargetRazon, candRazon, candSigla);
      score += matchScore * 10;
    }

    if (cat.includes("SOCIEDAD") || cat.includes("PRINCIPAL") || cat.includes("PERSONA JURIDICA")) {
      score += 50;
    }
    if (cat.includes("ESTABLECIMIENTO") || cat.includes("SUCURSAL") || cat.includes("AGENCIA")) {
      score -= 30;
    }
    if (est === "ACTIVA") score += 25;
    if (org && !org.includes("ESTABLECIMIENTO")) score += 10;
    if (Number(reg.ultimo_ano_renovado || 0) >= 2024) score += 10;
    if (reg.representante_legal || reg.num_identificacion_representante_legal) score += 15;

    return { reg, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.reg || null;
}

/**
 * Clasifica y enriquece los representantes legales extraídos de RUES,
 * distinguiendo el Representante Legal Principal (plenas facultades)
 * de los Suplentes y Representantes Judiciales (facultades restringidas).
 */
export function classifyRepresentantesLegales(
  vinculosRaw: any[],
  facultadesHtml?: string
): {
  representantePrincipal?: RepresentanteLegalInfo;
  representantesSuplentes: RepresentanteLegalInfo[];
  principales: RepresentanteLegalInfo[];
  suplentes: RepresentanteLegalInfo[];
  todos: RepresentanteLegalInfo[];
} {
  if (!Array.isArray(vinculosRaw) || vinculosRaw.length === 0) {
    return { representantesSuplentes: [], principales: [], suplentes: [], todos: [] };
  }

  const cleanFacultades = (facultadesHtml || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  const seenDocs = new Set<string>();
  const principales: RepresentanteLegalInfo[] = [];
  const suplentes: RepresentanteLegalInfo[] = [];
  const todos: RepresentanteLegalInfo[] = [];

  for (const item of vinculosRaw) {
    const rawDoc = String(item.numero_identificacion || "").trim();
    const { clean: cleanDoc, formatted: formattedDoc } = cleanAndFormatDocNumber(rawDoc);
    const rawName = String(item.nombre || "").trim();
    if (!rawName) continue;

    const dedupeKey = cleanDoc || rawName.toUpperCase();
    if (seenDocs.has(dedupeKey)) continue;
    seenDocs.add(dedupeKey);

    const nombre = formatTitleCase(rawName);
    const tipoVinculoRaw = String(item.tipovinculo || "Representante Legal").trim();
    const upperVinculo = tipoVinculoRaw.toUpperCase();

    let cargoEspecifico = tipoVinculoRaw;
    let isJudicialOnly = false;

    if (cleanFacultades && cleanDoc) {
      const docRegex = new RegExp(`(.{0,160}${cleanDoc}.{0,120})`, "i");
      const m = cleanFacultades.match(docRegex);
      if (m && m[1]) {
        const snippet = m[1].toUpperCase();
        if (snippet.includes("PRESIDENTE") && !snippet.includes("SUPLENTE")) {
          cargoEspecifico = "Presidente / Representante Legal Principal";
        } else if (snippet.includes("GERENTE GENERAL") || (snippet.includes("GERENTE") && !snippet.includes("SUPLENTE") && !snippet.includes("SUBGERENTE"))) {
          cargoEspecifico = "Gerente General / Representante Legal Principal";
        } else if (snippet.includes("JUDICIAL")) {
          cargoEspecifico = "Representante Legal Judicial y Administrativo";
          isJudicialOnly = true;
        } else if (snippet.includes("PRIMER SUPLENTE")) {
          cargoEspecifico = "Primer Suplente del Representante Legal";
        } else if (snippet.includes("SEGUNDO SUPLENTE")) {
          cargoEspecifico = "Segundo Suplente del Representante Legal";
        } else if (snippet.includes("SUPLENTE") || snippet.includes("SUBGERENTE")) {
          cargoEspecifico = "Representante Legal Suplente";
        }
      }
    }

    const isSuplenteKeyword =
      upperVinculo.includes("SUPLENTE") ||
      upperVinculo.includes("JUDICIAL") ||
      upperVinculo.includes("APODERADO") ||
      upperVinculo.includes("SEGUNDO") ||
      upperVinculo.includes("TERCER") ||
      isJudicialOnly;

    const isFirstPrincipal = principales.length === 0 && !isSuplenteKeyword;

    const info: RepresentanteLegalInfo = {
      nombre,
      numeroIdentificacion: cleanDoc,
      numeroFormateado: formattedDoc,
      tipoDocumento: "C.C.",
      cargo: isFirstPrincipal
        ? (cargoEspecifico.includes("Principal") ? cargoEspecifico : "Representante Legal Principal")
        : (isSuplenteKeyword ? cargoEspecifico : "Representante Legal Alterno / Conjunto"),
      tipoVinculoRaw,
      esPrincipal: isFirstPrincipal,
      advertenciaFacultades: isFirstPrincipal
        ? "Titular con plenas facultades legales y estatutarias para obligar a la sociedad."
        : "Actúa únicamente en ausencia temporal/definitiva del Principal o con facultades específicas según estatutos."
    };

    todos.push(info);
    if (isFirstPrincipal) {
      principales.push(info);
    } else {
      suplentes.push(info);
    }
  }

  if (principales.length === 0 && todos.length > 0) {
    const first = todos[0];
    first.esPrincipal = true;
    principales.push(first);
    suplentes.shift();
  }

  return {
    representantePrincipal: principales[0],
    representantesSuplentes: suplentes,
    principales,
    suplentes,
    todos
  };
}

export function extractActividadesEconomicas(sourceRecord: any): RuesActividadEconomica[] {
  if (!sourceRecord) return [];
  const items: RuesActividadEconomica[] = [];
  const seen = new Set<string>();

  const candidates = [
    { code: sourceRecord.cod_ciiu_act_econ_pri, desc: sourceRecord.desc_ciiu_act_econ_pri },
    { code: sourceRecord.cod_ciiu_act_econ_sec, desc: sourceRecord.desc_ciiu_act_econ_sec },
    { code: sourceRecord.ciiu3 || sourceRecord.cod_ciiu_act_econ_adi1, desc: sourceRecord.desc_ciiu3 },
    { code: sourceRecord.ciiu4 || sourceRecord.cod_ciiu_act_econ_adi2, desc: sourceRecord.desc_ciiu4 }
  ];

  for (const cand of candidates) {
    const code = String(cand.code || "").trim();
    if (!code || code === "0" || code === "0000" || seen.has(code)) continue;
    seen.add(code);
    const desc =
      String(cand.desc || "").trim() ||
      CIIU_DESCRIPTIONS[code] ||
      "Actividad económica mercantil registrada en RUES";
    items.push({ codigo: code, descripcion: desc });
  }
  return items;
}

export function extractEstablecimientos(registros: any[], mainRecord: any): RuesEstablecimientoInfo[] {
  if (!Array.isArray(registros) || registros.length <= 1 || !mainRecord) return [];
  const mainMat = String(mainRecord.matricula || "").replace(/^0+/, "");
  const mainNit = String(mainRecord.nit || mainRecord.numero_identificacion || "").replace(/\D/g, "").replace(/^0+/, "");
  const list: RuesEstablecimientoInfo[] = [];
  const seenMat = new Set<string>();
  if (mainMat) seenMat.add(mainMat);

  for (const reg of registros) {
    const mat = String(reg.matricula || "").replace(/^0+/, "");
    if (!mat || seenMat.has(mat)) continue;
    const cat = String(reg.categoria_matricula || reg.categoria || "").toUpperCase();
    const regNit = String(reg.nit || reg.numero_identificacion || "").replace(/\D/g, "").replace(/^0+/, "");

    const isEstablecimientoOrBranch =
      cat.includes("ESTABLECIMIENTO") ||
      cat.includes("SUCURSAL") ||
      cat.includes("AGENCIA") ||
      (mainNit && regNit === mainNit && !cat.includes("PERSONA NATURAL"));

    if (!isEstablecimientoOrBranch) continue;
    seenMat.add(mat);

    const camRaw = String(reg.camara_comercio || reg.nom_camara || reg.camara || "BOGOTA").trim();
    list.push({
      razonSocial: String(reg.razon_social || "").trim() || "Establecimiento de Comercio",
      categoria: formatTitleCase(cat || "Establecimiento de Comercio"),
      camaraComercio: camRaw.toUpperCase() === "BOGOTA" ? "Bogotá D.C." : formatTitleCase(camRaw),
      matricula: mat,
      fechaMatricula: formatRuesDate(reg.fecha_matricula),
      fechaRenovacion: formatRuesDate(reg.fecha_renovacion),
      ultimoAnoRenovado: reg.ultimo_ano_renovado ? String(reg.ultimo_ano_renovado).trim() : undefined,
      estado: formatTitleCase(String(reg.estado_matricula || reg.estado || "ACTIVA").trim())
    });
  }
  return list;
}

/**
 * Motor Nacional de Datos Abiertos RUES — Confecámaras (datos.gov.co/resource/c82u-588k.json).
 * Opera a nivel mundial sin restricciones geográficas (200 OK en Contabo VPS en ~150-500ms),
 * cubriendo las 57 Cámaras de Comercio de Colombia (>9.3 millones de matrículas) con Representante Legal Principal.
 */
async function queryDatosGovSocrataRues(
  baseNit: string,
  cleanRazon: string,
  timeoutMs: number = 6500,
  targetRazon?: string
): Promise<RuesCompanyDetail | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let registros: any[] = [];

    if (baseNit) {
      const cleanDigits = baseNit.replace(/\D/g, "").replace(/^0+/, "");
      const [byNumIdRes, byNitRes] = await Promise.all([
        fetch(`${RUES_SOCRATA_URL}?numero_identificacion=${encodeURIComponent(cleanDigits)}&$limit=15`, {
          headers: { Accept: "application/json" },
          signal: controller.signal
        }).catch(() => null),
        fetch(`${RUES_SOCRATA_URL}?nit=${encodeURIComponent(cleanDigits)}&$limit=15`, {
          headers: { Accept: "application/json" },
          signal: controller.signal
        }).catch(() => null)
      ]);

      const listA = byNumIdRes && byNumIdRes.ok ? await byNumIdRes.json().catch(() => []) : [];
      const listB = byNitRes && byNitRes.ok ? await byNitRes.json().catch(() => []) : [];
      registros = [...(Array.isArray(listA) ? listA : []), ...(Array.isArray(listB) ? listB : [])];
    } else if (cleanRazon && cleanRazon.length >= 3) {
      const coreSearchTerm = normalizeCorporateName(cleanRazon) || cleanRazon.toUpperCase().trim();
      const safeRazon = coreSearchTerm.replace(/'/g, "''");
      const whereClause = `upper(razon_social) like '%${safeRazon}%'`;
      const res = await fetch(`${RUES_SOCRATA_URL}?$where=${encodeURIComponent(whereClause)}&$limit=20`, {
        headers: { Accept: "application/json" },
        signal: controller.signal
      }).catch(() => null);
      if (res && res.ok) {
        const list = await res.json().catch(() => []);
        if (Array.isArray(list)) registros = list;
      }
    }

    if (!Array.isArray(registros) || registros.length === 0) {
      return null;
    }

    const mainRecord = selectPrincipalRuesRecord(
      registros,
      baseNit || undefined,
      baseNit ? undefined : (targetRazon || cleanRazon)
    );
    if (!mainRecord) return null;

    const codCamara = String(mainRecord.codigo_camara || mainRecord.cod_camara || "04").trim();
    const matricula = String(mainRecord.matricula || "").trim();
    const idRm = buildRuesIdRm(codCamara, matricula);
    const razonSocial = String(mainRecord.razon_social || "").trim();
    if (!razonSocial) return null;

    const nit = String(mainRecord.nit || mainRecord.numero_identificacion || baseNit).replace(/\D/g, "").replace(/^0+/, "");
    const dv = String(mainRecord.digito_verificacion || mainRecord.dv || "").trim();
    const camaraRaw = String(mainRecord.camara_comercio || mainRecord.nom_camara || "BOGOTA").trim();
    const camaraComercio = camaraRaw.toUpperCase() === "BOGOTA" ? "Bogotá D.C." : formatTitleCase(camaraRaw);
    const tipoSociedadRaw = String(mainRecord.tipo_sociedad || "SOCIEDAD COMERCIAL").trim();
    const tipoSociedad = formatTitleCase(tipoSociedadRaw);
    const orgRaw = String(mainRecord.organizacion_juridica || mainRecord.tipo_sociedad || "Sociedad Comercial").trim();
    const organizacionJuridica = formatOrganizacionJuridica(orgRaw);
    const organizacionJuridicaRaw = formatTitleCase(orgRaw).replace(/\bSas\b/g, "SAS").replace(/\bS\.a\.s\b/gi, "S.A.S.");
    const categoria = String(mainRecord.categoria_matricula || mainRecord.categoria || "SOCIEDAD ó PERSONA JURIDICA PRINCIPAL ó ESAL").trim();
    const estadoMatricula = formatTitleCase(String(mainRecord.estado_matricula || "ACTIVA").trim());
    const ultimoAnoRenovado = String(
      mainRecord.ultimo_ano_renovado || (mainRecord.fecha_renovacion ? String(mainRecord.fecha_renovacion).slice(0, 4) : "")
    ).trim();

    const actividadesEconomicas = extractActividadesEconomicas(mainRecord);
    const ciiuPrincipalCodigo = actividadesEconomicas[0]?.codigo || String(mainRecord.cod_ciiu_act_econ_pri || "").trim() || undefined;
    const ciiuPrincipalDescripcion =
      actividadesEconomicas[0]?.descripcion || (ciiuPrincipalCodigo ? CIIU_DESCRIPTIONS[ciiuPrincipalCodigo] : undefined);

    const establecimientos = extractEstablecimientos(registros, mainRecord);

    const repNameRaw = String(mainRecord.representante_legal || "").trim();
    const repDocRaw = String(mainRecord.num_identificacion_representante_legal || "").trim();
    const repClaseRaw = String(mainRecord.clase_identificacion_rl || "").toUpperCase();
    const { clean: cleanRepDoc, formatted: formattedRepDoc } = cleanAndFormatDocNumber(repDocRaw);

    let representantePrincipal: RepresentanteLegalInfo | undefined;
    const representantesPrincipales: RepresentanteLegalInfo[] = [];

    if (repNameRaw) {
      const tipoDocRep = repClaseRaw.includes("EXTRANJER")
        ? "C.E."
        : repClaseRaw.includes("PASAPORTE")
          ? "Pasaporte"
          : "C.C.";

      representantePrincipal = {
        nombre: formatTitleCase(repNameRaw),
        numeroIdentificacion: cleanRepDoc,
        numeroFormateado: formattedRepDoc || cleanRepDoc,
        tipoDocumento: tipoDocRep,
        cargo: "Representante Legal Principal",
        tipoVinculoRaw: "Representante Legal - Principal",
        esPrincipal: true,
        advertenciaFacultades: "Titular con plenas facultades legales y estatutarias para obligar a la sociedad."
      };
      representantesPrincipales.push(representantePrincipal);
    }

    return {
      found: true,
      idRm,
      nit,
      dv,
      razonSocial,
      sigla: String(mainRecord.sigla || "").trim() || undefined,
      tipoSociedad,
      organizacionJuridica,
      organizacionJuridicaRaw,
      categoria,
      esSociedadPrincipal:
        categoria.toUpperCase().includes("SOCIEDAD") || categoria.toUpperCase().includes("PRINCIPAL"),
      codigoCamara: codCamara,
      camaraComercio,
      matricula: matricula.replace(/^0+/, "") || matricula,
      estadoMatricula,
      ultimoAnoRenovado: ultimoAnoRenovado && ultimoAnoRenovado !== "0" ? ultimoAnoRenovado : undefined,
      fechaMatricula: formatRuesDate(mainRecord.fecha_matricula),
      fechaRenovacion: formatRuesDate(mainRecord.fecha_renovacion),
      ciiuPrincipalCodigo,
      ciiuPrincipalDescripcion,
      actividadesEconomicas,
      representantePrincipal,
      representantesPrincipales,
      representantesSuplentes: [],
      todosRepresentantes: representantesPrincipales,
      establecimientos,
      direccionComercial: String(mainRecord.direccion_comercial || mainRecord.dir_comercial || mainRecord.direccion || "").trim() || undefined,
      telefonoComercial: String(mainRecord.telefono_comercial_1 || mainRecord.telefono_comercial || mainRecord.telefono_1 || mainRecord.telefono || "").trim() || undefined,
      source: "RUES — Registro Único Empresarial y Social (Confecámaras / Datos Abiertos)"
    };
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Consulta en tiempo real el Registro Único Empresarial y Social (RUES - Confecámaras)
 * mediante peticiones HTTP directas (cero Puppeteer), combinando el conector criptográfico
 * ElasticSearch RUES y el motor nacional Socrata de Datos Abiertos de Colombia (57 Cámaras de Comercio).
 */
export async function queryRuesDirectHttp(query: string): Promise<RuesCompanyDetail | null> {
  const clean = (query || "").trim();
  if (!clean) return null;

  const digitsMatch = clean.match(/\b(\d{7,10})(?:-\d)?\b/);
  let baseNit = digitsMatch ? digitsMatch[1] : "";
  // Si el usuario envió los 10 dígitos seguidos incluyendo el DV (ej. 9007888328), separar los 9 dígitos base del NIT
  if (baseNit.length === 10 && /^[89]/.test(baseNit)) {
    baseNit = baseNit.slice(0, 9);
  }

  const cleanRazon = clean
    .replace(/\b(?:consultar|verificar|verif[ií]came|revisar|rev[ií]same|empresa|sociedad|en\s+rues|rues|nit|este|esta|el|la|por\s+favor|hola|jania)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const targetRazonName = cleanRazon || clean;
  const cacheKey = baseNit ? `NIT:${baseNit}` : `RAZON:${targetRazonName.toUpperCase()}`;

  const cached = ruesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < RUES_CACHE_TTL_MS) {
    return cached.data;
  }

  // En entorno de pruebas automatizadas (NODE_ENV === 'test'), evitar llamadas externas lentas si no se requiere red en vivo
  if (process.env.NODE_ENV === "test" && !process.env.FORCE_LIVE_RUES_TEST) {
    return null;
  }

  try {
    // MOTOR 1: Endpoint directo ElasticSearch RUES (óptimo desde IP Colombia o proxy)
    let searchPayload: Record<string, any>;
    if (baseNit) {
      searchPayload = { nit: baseNit };
    } else {
      const coreSearchTerm = normalizeCorporateName(targetRazonName) || targetRazonName.toUpperCase().trim();
      searchPayload = { razon: coreSearchTerm };
    }

    const searchRes = await postRuesEncrypted("/api/ConsultasRUES/BusquedaAvanzadaRM", searchPayload);
    const registros: any[] = searchRes?.registros || [];

    if (Array.isArray(registros) && registros.length > 0) {
      const mainRecord = selectPrincipalRuesRecord(
        registros,
        baseNit || undefined,
        baseNit ? undefined : targetRazonName
      );
      if (mainRecord) {
        const codCamara = String(mainRecord.cod_camara || "04").trim();
        const matricula = String(mainRecord.matricula || "").trim();
        const idRm = String(mainRecord.id_rm || buildRuesIdRm(codCamara, matricula)).trim();

        const [detalleRes, vinculosRes, facultadesRes] = await Promise.all([
          postRuesEncrypted("/api/Expediente/DetalleRM", { id: idRm }),
          postRuesEncrypted("/api/ConsultarVinculos", { IDRM: idRm }),
          codCamara && matricula
            ? postRuesEncrypted("/api/ConsultFacultadesXCamYMatricula", {
                codigo_camara: codCamara,
                matricula: matricula.padStart(10, "0")
              })
            : Promise.resolve(null)
        ]);

        const det = detalleRes?.registros || {};
        const vinculosList: any[] = vinculosRes?.registros || [];
        const facultadesHtml = typeof facultadesRes === "string" ? facultadesRes : "";

        const classifiedReps = classifyRepresentantesLegales(vinculosList, facultadesHtml);

        const razonSocial = String(det.razon_social || mainRecord.razon_social || "").trim();
        const nit = String(det.numero_identificacion || mainRecord.nit || baseNit).replace(/\D/g, "");
        const dv = String(det.dv || mainRecord.dv || "").trim();
        const camaraRaw = String(det.camara || mainRecord.nom_camara || "BOGOTA").trim();
        const camaraComercio = camaraRaw.toUpperCase() === "BOGOTA" ? "Bogotá D.C." : formatTitleCase(camaraRaw);
        const tipoSociedadRaw = String(det.tipo_sociedad || mainRecord.tipo_sociedad || "SOCIEDAD COMERCIAL").trim();
        const tipoSociedad = formatTitleCase(tipoSociedadRaw);
        const orgRaw = String(det.organizacion_juridica || mainRecord.organizacion_juridica || "Sociedad Comercial").trim();
        const organizacionJuridica = formatOrganizacionJuridica(orgRaw);
        const organizacionJuridicaRaw = formatTitleCase(orgRaw).replace(/\bSas\b/g, "SAS").replace(/\bS\.a\.s\b/gi, "S.A.S.");
        const categoria = String(det.categoria_matricula || mainRecord.categoria || "SOCIEDAD ó PERSONA JURIDICA PRINCIPAL ó ESAL").trim();
        const estadoMatricula = formatTitleCase(String(mainRecord.estado_matricula || det.estado || "ACTIVA").trim());
        const ultimoAnoRenovado = String(
          mainRecord.ultimo_ano_renovado || det.ultimo_ano_renovado || (det.fecha_renovacion ? String(det.fecha_renovacion).slice(0, 4) : "")
        ).trim();

        const actividadesEconomicas = extractActividadesEconomicas(det.cod_ciiu_act_econ_pri ? det : mainRecord);
        const ciiuPrincipalCodigo = actividadesEconomicas[0]?.codigo || String(det.cod_ciiu_act_econ_pri || "").trim() || undefined;
        const ciiuPrincipalDescripcion =
          actividadesEconomicas[0]?.descripcion ||
          String(det.desc_ciiu_act_econ_pri || "").trim() ||
          (ciiuPrincipalCodigo ? CIIU_DESCRIPTIONS[ciiuPrincipalCodigo] : undefined);

        const establecimientos = extractEstablecimientos(registros, mainRecord);

        const result: RuesCompanyDetail = {
          found: true,
          idRm,
          nit,
          dv,
          razonSocial,
          sigla: String(det.sigla || mainRecord.sigla || "").trim() || undefined,
          tipoSociedad,
          organizacionJuridica,
          organizacionJuridicaRaw,
          categoria,
          esSociedadPrincipal:
            categoria.toUpperCase().includes("SOCIEDAD") || categoria.toUpperCase().includes("PRINCIPAL"),
          codigoCamara: codCamara,
          camaraComercio,
          matricula: matricula.replace(/^0+/, "") || matricula,
          estadoMatricula,
          ultimoAnoRenovado: ultimoAnoRenovado && ultimoAnoRenovado !== "0" ? ultimoAnoRenovado : undefined,
          fechaMatricula: formatRuesDate(det.fecha_matricula || mainRecord.fecha_matricula),
          fechaRenovacion: formatRuesDate(det.fecha_renovacion || mainRecord.fecha_renovacion),
          ciiuPrincipalCodigo,
          ciiuPrincipalDescripcion,
          actividadesEconomicas,
          representantePrincipal: classifiedReps.representantePrincipal,
          representantesPrincipales: classifiedReps.principales,
          representantesSuplentes: classifiedReps.suplentes,
          todosRepresentantes: classifiedReps.todos,
          establecimientos,
          direccionComercial: String(det.dir_comercial || det.direccion_comercial || det.direccion || mainRecord.dir_comercial || mainRecord.direccion_comercial || mainRecord.direccion || "").trim() || undefined,
          telefonoComercial: String(det.tel_comercial_1 || det.telefono_comercial_1 || det.telefono_1 || det.telefono || mainRecord.tel_comercial_1 || mainRecord.telefono_comercial_1 || mainRecord.telefono_1 || mainRecord.telefono || "").trim() || undefined,
          source: "RUES — Registro Único Empresarial y Social (Confecámaras)"
        };

        ruesCache.set(cacheKey, { data: result, timestamp: Date.now() });
        if (nit) {
          ruesCache.set(`NIT:${nit}`, { data: result, timestamp: Date.now() });
        }
        return result;
      }
    }

    // MOTOR 2: Respaldo directo Socrata Datos Abiertos de Colombia (57 Cámaras de Comercio — 0 Geo-Block desde VPS)
    const socrataResult = await queryDatosGovSocrataRues(
      baseNit,
      targetRazonName,
      6500,
      baseNit ? undefined : targetRazonName
    );
    if (socrataResult && socrataResult.found) {
      ruesCache.set(cacheKey, { data: socrataResult, timestamp: Date.now() });
      if (socrataResult.nit) {
        ruesCache.set(`NIT:${socrataResult.nit}`, { data: socrataResult, timestamp: Date.now() });
      }
      return socrataResult;
    }

    return null;
  } catch (_) {
    return null;
  }
}
