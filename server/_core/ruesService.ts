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
import { formatTitleCase } from "../routers/agenda";

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

export interface RuesCompanyDetail {
  found: boolean;
  idRm: string;
  nit: string;
  dv: string;
  razonSocial: string;
  sigla?: string;
  organizacionJuridica: string;
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
  representantePrincipal?: RepresentanteLegalInfo;
  representantesPrincipales: RepresentanteLegalInfo[];
  representantesSuplentes: RepresentanteLegalInfo[];
  todosRepresentantes: RepresentanteLegalInfo[];
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

/**
 * Realiza una petición POST directa al backend ElasticSearch de RUES.
 */
async function postRuesEncrypted(path: string, payload: Record<string, any>, timeoutMs: number = 6500): Promise<any> {
  const encryptedBody = encryptRuesPayload(payload);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${RUES_ELASTIC_BASE_URL}${path}`, {
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

/**
 * Selecciona y prioriza siempre la "Sociedad o Persona Jurídica Principal" y con matrícula ACTIVA
 * por encima de sucursales, agencias o establecimientos de comercio.
 */
export function selectPrincipalRuesRecord(registros: any[], targetNit?: string): any | null {
  if (!Array.isArray(registros) || registros.length === 0) return null;

  const scored = registros.map((reg) => {
    let score = 0;
    const cat = String(reg.categoria || reg.categoria_matricula || "").toUpperCase();
    const est = String(reg.estado_matricula || "").toUpperCase();
    const org = String(reg.organizacion_juridica || "").toUpperCase();
    const regNit = String(reg.nit || "").replace(/\D/g, "");

    if (targetNit && regNit === targetNit) score += 100;
    if (cat.includes("SOCIEDAD") || cat.includes("PRINCIPAL") || cat.includes("PERSONA JURIDICA")) {
      score += 50;
    }
    if (cat.includes("ESTABLECIMIENTO") || cat.includes("SUCURSAL") || cat.includes("AGENCIA")) {
      score -= 30;
    }
    if (est === "ACTIVA") score += 25;
    if (org && !org.includes("ESTABLECIMIENTO")) score += 10;
    if (Number(reg.ultimo_ano_renovado || 0) >= 2024) score += 10;

    return { reg, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.reg || registros[0];
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

    // Determinar si en el texto de facultades/nombramientos aparece como Judicial o Suplente específico
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

    // Si aún no hay ningún Principal registrado y el vínculo es "Representante Legal - Principal",
    // el primero en el orden de inscripción mercantil es el Representante Legal Principal titular.
    // Si una sociedad lista múltiples como "Principal" pero ya existe el titular n° 1 (ej. Presidente),
    // el primero es el Representante Legal Principal titular y los subsiguientes se listan como Principales Adjuntos / Judiciales.
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

  // Si todos fueron marcados como suplentes pero hay al menos 1 registro, promover el primero como principal registrado
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

/**
 * Consulta en tiempo real el Registro Único Empresarial y Social (RUES - Confecámaras)
 * mediante peticiones HTTP directas (cero Puppeteer).
 */
export async function queryRuesDirectHttp(query: string): Promise<RuesCompanyDetail | null> {
  const clean = (query || "").trim();
  if (!clean) return null;

  const digitsMatch = clean.match(/\b(\d{7,10})(?:-\d)?\b/);
  const baseNit = digitsMatch ? digitsMatch[1] : "";
  const cacheKey = baseNit ? `NIT:${baseNit}` : `RAZON:${clean.toUpperCase()}`;

  const cached = ruesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < RUES_CACHE_TTL_MS) {
    return cached.data;
  }

  // En entorno de pruebas automatizadas (NODE_ENV === 'test'), evitar llamadas externas lentas si no se requiere red en vivo
  if (process.env.NODE_ENV === "test" && !process.env.FORCE_LIVE_RUES_TEST) {
    return null;
  }

  try {
    // PASO 1: Búsqueda avanzada en Registro Mercantil (por NIT o por Razón Social)
    let searchPayload: Record<string, any>;
    if (baseNit) {
      searchPayload = { nit: baseNit };
    } else {
      const cleanRazon = clean
        .replace(/\b(?:consultar|verificar|revisar|empresa|sociedad|constructora|inmobiliaria|en\s+rues|rues|nit|por\s+favor|hola|jania)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      searchPayload = { razon: (cleanRazon || clean).toUpperCase() };
    }

    const searchRes = await postRuesEncrypted("/api/ConsultasRUES/BusquedaAvanzadaRM", searchPayload);
    const registros: any[] = searchRes?.registros || [];

    if (!Array.isArray(registros) || registros.length === 0) {
      return null;
    }

    const mainRecord = selectPrincipalRuesRecord(registros, baseNit || undefined);
    if (!mainRecord) return null;

    const codCamara = String(mainRecord.cod_camara || "04").trim();
    const matricula = String(mainRecord.matricula || "").trim();
    const idRm = String(mainRecord.id_rm || buildRuesIdRm(codCamara, matricula)).trim();

    // PASO 2: Extracción paralela de DetalleRM, Vínculos (Representantes Legales) y Facultades
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
    const camaraComercio = formatTitleCase(camaraRaw);
    const organizacionJuridica = formatTitleCase(
      String(mainRecord.organizacion_juridica || det.organizacion_juridica || "Sociedad Comercial").trim()
    );
    const categoria = String(mainRecord.categoria || "SOCIEDAD ó PERSONA JURIDICA PRINCIPAL").trim();
    const estadoMatricula = formatTitleCase(String(mainRecord.estado_matricula || det.estado || "ACTIVA").trim());
    const ultimoAnoRenovado = String(
      mainRecord.ultimo_ano_renovado || (det.fecha_renovacion ? String(det.fecha_renovacion).slice(0, 4) : "")
    ).trim();

    const ciiuPrincipalCodigo = String(det.cod_ciiu_act_econ_pri || "").trim() || undefined;
    const ciiuPrincipalDescripcion = String(det.desc_ciiu_act_econ_pri || "").trim() || undefined;

    const result: RuesCompanyDetail = {
      found: true,
      idRm,
      nit,
      dv,
      razonSocial,
      sigla: String(det.sigla || mainRecord.sigla || "").trim() || undefined,
      organizacionJuridica,
      categoria,
      esSociedadPrincipal:
        categoria.toUpperCase().includes("SOCIEDAD") || categoria.toUpperCase().includes("PRINCIPAL"),
      codigoCamara: codCamara,
      camaraComercio,
      matricula: matricula.replace(/^0+/, "") || matricula,
      estadoMatricula,
      ultimoAnoRenovado: ultimoAnoRenovado && ultimoAnoRenovado !== "0" ? ultimoAnoRenovado : undefined,
      fechaMatricula: det.fecha_matricula || undefined,
      fechaRenovacion: det.fecha_renovacion || undefined,
      ciiuPrincipalCodigo,
      ciiuPrincipalDescripcion,
      representantePrincipal: classifiedReps.representantePrincipal,
      representantesPrincipales: classifiedReps.principales,
      representantesSuplentes: classifiedReps.suplentes,
      todosRepresentantes: classifiedReps.todos,
      source: "RUES — Registro Único Empresarial y Social (Confecámaras)"
    };

    ruesCache.set(cacheKey, { data: result, timestamp: Date.now() });
    if (nit) {
      ruesCache.set(`NIT:${nit}`, { data: result, timestamp: Date.now() });
    }
    return result;
  } catch (_) {
    return null;
  }
}
