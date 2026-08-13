import { getDb } from "../db";
import { and, eq, sql } from "drizzle-orm";
import { propertyMatches, properties, requirements } from "../../drizzle/schema";
import { normalizarTextoGeografico } from "./geography";
import { lookupBarriosByPerimeter } from "./geo-lookup";
import { VECY_VERSION_LABEL } from "../../shared/const";

/**
 * Motor de Matching VECY CORE v12.00 (TypeScript)
 * Calcula el matchScore en TypeScript para evaluar lógicas complejas de JSONB,
 * rangos de área y tolerancias de campos N/A por tipo de inmueble.
 */

function hasAledanos(text: string): boolean {
  if (!text) return false;
  const n = normalizarTextoGeografico(text);
  return n.includes("aledan") || n.includes("cercan") || n.includes("alrededor") || n.includes("similar") || n.includes("proxim") || n.includes("otro");
}

export function extractRealPhone(item: any): string | null {
  if (!item) return null;

  // 1. Revisar campos directos de teléfono y usuario
  const candidates = [
    item.idUsuarioWhatsapp,
    item.origenId,
    item.contactPhone,
    item.brokerPhone,
    item.phone,
    item.usuarioWhatsapp,
    item.contactNumber,
    item.sellerPhone,
    item.captadorPhone,
    item.user?.phone,
    item.user?.idUsuarioWhatsapp,
    item.user?.contactPhone
  ];

  for (const cand of candidates) {
    if (!cand) continue;
    const clean = String(cand).split("@")[0].replace(/\D/g, "");
    // Rechazar identificadores numéricos de grupos de WhatsApp o hilos de Baileys
    if (clean.startsWith("11") || clean.startsWith("12036") || clean.startsWith("1203") || clean.length > 13) {
      continue;
    }
    // Celular Colombia: 12 dígitos (573XXXXXXXXX) o 10 dígitos (3XXXXXXXXX)
    if (clean.length === 12 && clean.startsWith("573")) return clean;
    if (clean.length === 10 && clean.startsWith("3")) return `57${clean}`;
    // Fijo Colombia: 12 dígitos (5760XXXXXXXX) o 10 dígitos (60XXXXXXXX)
    if (clean.length === 12 && clean.startsWith("5760")) return clean;
    if (clean.length === 10 && clean.startsWith("60")) return `57${clean}`;
    // Internacionales válidos (entre 10 y 12 dígitos)
    if (clean.length >= 10 && clean.length <= 12) return clean;
  }

  // 2. Buscar en el contenido textual completo (rawText, description, name, etc.)
  const textToSearch = `${item.rawText || ""} ${item.description || ""} ${item.name || ""} ${item.rawMessage || ""}`;
  const phoneMatches = textToSearch.match(/(?:\+?57\s*)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g);
  if (phoneMatches && phoneMatches.length > 0) {
    const rawMatch = phoneMatches[0].replace(/\D/g, "");
    const clean10 = rawMatch.startsWith("57") && rawMatch.length === 12 ? rawMatch.substring(2) : rawMatch;
    if (clean10.length === 10 && clean10.startsWith("3")) {
      return `57${clean10}`;
    }
  }

  // 3. Barrido de contingencia en metadatos JSONB (metadata, rawJson, extraData)
  const jsonSources = [item.metadata, item.rawJson, item.extraData];
  for (const jsonSrc of jsonSources) {
    if (!jsonSrc) continue;
    const str = typeof jsonSrc === "string" ? jsonSrc : JSON.stringify(jsonSrc);
    const jsonMatches = str.match(/(?:\+?57\s*)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g);
    if (jsonMatches && jsonMatches.length > 0) {
      const rawMatch = jsonMatches[0].replace(/\D/g, "");
      const clean10 = rawMatch.startsWith("57") && rawMatch.length === 12 ? rawMatch.substring(2) : rawMatch;
      if (clean10.length === 10 && clean10.startsWith("3")) {
        return `57${clean10}`;
      }
    }
  }

  return null;
}

/**
 * Compatibilidad inteligente de tipos de transacción.
 * Implementa la lógica real del mercado inmobiliario colombiano:
 * - Una propiedad en "venta_o_arriendo" es compatible con requerimientos de "venta" O "arriendo"
 * - Un requerimiento de "arriendo" es compatible con propiedades "arriendo_con_opcion_de_compra"
 * - Un requerimiento de "arriendo_con_opcion_de_compra" es compatible con "venta_o_arriendo"
 * - Un requerimiento de "venta" es compatible con "venta_permuta"
 * - La compatibilidad también revisa el array acceptedTransactionTypes de la propiedad
 */
const TRANSACTION_COMPATIBILITY_MATRIX: Record<string, Set<string>> = {
  venta: new Set(["venta", "venta_o_arriendo", "venta_permuta", "arriendo_con_opcion_de_compra"]),
  arriendo: new Set(["arriendo", "venta_o_arriendo", "arriendo_temporal"]),
  venta_o_arriendo: new Set(["venta", "arriendo", "venta_o_arriendo", "venta_permuta", "arriendo_temporal", "arriendo_con_opcion_de_compra"]),
  arriendo_temporal: new Set(["arriendo_temporal", "arriendo", "venta_o_arriendo"]),
  arriendo_con_opcion_de_compra: new Set(["arriendo_con_opcion_de_compra", "venta", "venta_o_arriendo"]),
  permuta: new Set(["permuta", "venta_permuta"]),
  venta_permuta: new Set(["venta_permuta", "venta", "permuta", "venta_o_arriendo"]),
  aporte: new Set(["aporte"]),
};

export function checkTransactionCompatibility(reqType: string | null | undefined, propType: string | null | undefined, propAccepted: string[] = []): boolean {
  if (!reqType || !propType) return false;
  const r = reqType.toLowerCase().trim();
  const p = propType.toLowerCase().trim();

  if (propAccepted.length > 0 && propAccepted.includes(r)) return true;

  const compatibleSet = TRANSACTION_COMPATIBILITY_MATRIX[r];
  if (!compatibleSet) return false;

  return compatibleSet.has(p);
}

/**
 * 🎯 Motor Matemático de Matriz Vectorial 15-Dimensional (CVP - Closest Vector Problem en Lattices)
 * Basado en la teoría de empaquetamiento de hiperesferas S^14 y proyección reticular.
 */
export function calculateCvpVector15DMatch(requirement: any, property: any): { cvpScore: number; distance: number; vectorReq: number[]; vectorProp: number[] } {
  const vReq: number[] = new Array(15).fill(0);
  const vProp: number[] = new Array(15).fill(0);

  // 1. Precio (Normalización logarítmica en escala 0-1)
  const reqMax = parseFloat(String(requirement.presupuestoMax || "0"));
  const propPrice = parseFloat(String(property.price || "0"));
  if (reqMax > 0 && propPrice > 0) {
    vReq[0] = Math.log10(reqMax);
    vProp[0] = Math.log10(propPrice);
  }

  // 2. Área M2
  const reqArea = parseFloat(String(requirement.areaMin || requirement.areaMinimaM2 || "0"));
  const propArea = parseFloat(String(property.areaTotal || property.areaConstruidaM2 || "0"));
  vReq[1] = reqArea > 0 ? reqArea / 100 : 0;
  vProp[1] = propArea > 0 ? propArea / 100 : 0;

  // 3. Habitaciones
  vReq[2] = Number(requirement.habitacionesMin || 0);
  vProp[2] = Number(property.bedrooms || 0);

  // 4. Baños
  vReq[3] = Number(requirement.banosMin || 0);
  vProp[3] = Number(property.bathrooms || 0);

  // 5. Parqueaderos (Ponderado por independencia)
  vReq[4] = Number(requirement.parqueaderosMin || 0);
  const garP = Number(property.garages || 0);
  const garType = String(property.garageType || "").toLowerCase();
  vProp[4] = garType === "lineal" ? garP * 0.7 : garP;

  // 6. Estrato
  const estratoReq = Array.isArray(requirement.estratoDeseado) ? Number(requirement.estratoDeseado[0] || 0) : Number(requirement.estratoDeseado || 0);
  vReq[5] = estratoReq;
  vProp[5] = Number(property.stratum || property.estrato || 0);

  // 7. Antigüedad
  vReq[6] = Number(requirement.antiguedadMax || 0);
  vProp[6] = Number(property.antiguedadAnos || 0);

  // 8. Administración
  vReq[7] = parseFloat(String(requirement.adminFeeMax || "0")) / 100000;
  vProp[7] = parseFloat(String(property.adminFee || "0")) / 100000;

  // 9. Balcón / Terraza
  const reqText = String(requirement.rawText || "").toLowerCase();
  const propText = String(property.rawText || "").toLowerCase();
  vReq[8] = (reqText.includes("balcon") || reqText.includes("balcón") || reqText.includes("terraza")) ? 1 : 0;
  vProp[8] = (propText.includes("balcon") || propText.includes("balcón") || propText.includes("terraza") || property.hasBalcony || property.hasTerrace) ? 1 : 0;

  // 10. Ascensor
  vReq[9] = reqText.includes("ascensor") ? 1 : 0;
  vProp[9] = (propText.includes("ascensor") || property.hasElevator) ? 1 : 0;

  // 11. Equipamiento Conjunto (Club House / Gym)
  vReq[10] = (reqText.includes("club house") || reqText.includes("gimnasio") || reqText.includes("piscina")) ? 1 : 0;
  vProp[10] = (propText.includes("club house") || propText.includes("gimnasio") || propText.includes("piscina")) ? 1 : 0;

  // 12. Depósito / Bodega Interna
  vReq[11] = (reqText.includes("deposito") || reqText.includes("depósito") || reqText.includes("bodega")) ? 1 : 0;
  vProp[11] = (propText.includes("deposito") || propText.includes("depósito") || propText.includes("bodega") || property.hasStorage) ? 1 : 0;

  // 13. Permuta / Vehículo parte de pago
  vReq[12] = (reqText.includes("permuta") || reqText.includes("carro")) ? 1 : 0;
  vProp[12] = (propText.includes("permuta") || propText.includes("recibe vehiculo")) ? 1 : 0;

  // 14. Calidad de Vida (Silencioso / Sin Vías Principales)
  vReq[13] = (reqText.includes("silencioso") || reqText.includes("tranquilo")) ? 1 : 0;
  vProp[13] = (!propText.includes("ruidoso") && !propText.includes("via principal")) ? 1 : 0;

  // 15. Ganga Index (<70% presupuesto)
  vReq[14] = 1;
  vProp[14] = (reqMax > 0 && propPrice > 0 && propPrice <= reqMax * 0.70) ? 1.5 : 1;

  // Distancia Euclídea de CVP
  let sumSq = 0;
  for (let i = 0; i < 15; i++) {
    const diff = vReq[i] - vProp[i];
    sumSq += diff * diff;
  }
  const distance = Math.sqrt(sumSq);

  // Cosine Similarity en Hiperesfera S^14
  let dot = 0, normReq = 0, normProp = 0;
  for (let i = 0; i < 15; i++) {
    dot += vReq[i] * vProp[i];
    normReq += vReq[i] * vReq[i];
    normProp += vProp[i] * vProp[i];
  }
  const normDenom = Math.sqrt(normReq) * Math.sqrt(normProp);
  const cosSim = normDenom > 0 ? (dot / normDenom) : 0.8;
  const cvpScore = Math.min(100, Math.max(0, Math.round(cosSim * 100)));

  return { cvpScore, distance, vectorReq: vReq, vectorProp: vProp };
}


export interface StreetCarreraBoundaries {
  minStreet?: number;
  maxStreet?: number;
  minCarrera?: number;
  maxCarrera?: number;
}

export interface PropertyAddressNumbers {
  street?: number;
  carrera?: number;
  isAutoNorte?: boolean;
}

export function esFormatoCuadrante(texto: string): boolean {
  if (!texto) return false;
  const norm = (texto || "").toLowerCase();
  return (
    /(?:entre|calle|clle|cll|carrera|cra|autopista|circunvalar|septima)/i.test(norm) &&
    /\d/.test(norm)
  );
}

export function parseStreetCarreraBoundaries(text: string): StreetCarreraBoundaries {
  const norm = (text || "").toLowerCase();
  const res: StreetCarreraBoundaries = {};

  // 1. Rango de Calles: "entre la 106 y la 127", "entre 106 y 127", "calle 100 a 127", "cll 100 a 127", "de la 80 a la 94"
  const streetRangeMatch = norm.match(
    /(?:entre|de|cll|calle|calles)?\s*(?:la|las)?\s*(?:calle|clle|cll|cna|cera)?\s*(\d{1,3})\s*(?:a|y|-|hasta)\s*(?:la|las)?\s*(?:calle|clle|cll|cna|cera)?\s*(\d{1,3})/i
  );
  if (streetRangeMatch) {
    const n1 = parseInt(streetRangeMatch[1], 10);
    const n2 = parseInt(streetRangeMatch[2], 10);
    // Filtrar falsos positivos de rangos pequeños o de horas/habitaciones
    if (!isNaN(n1) && !isNaN(n2) && (n1 > 20 || n2 > 20)) {
      res.minStreet = Math.min(n1, n2);
      res.maxStreet = Math.max(n1, n2);
    }
  }

  // 2. Rango de Carreras: "entre cra 7 y 15", "entre la 7 y la 15"
  const carreraRangeMatch = norm.match(/(?:cra|carrera|carreras)\s*(?:la|las)?\s*(circunvalar|cerros|\d{1,3})\s*(?:a|y|-|hasta)\s*(?:la|las)?\s*(\d{1,3})/i);
  if (carreraRangeMatch) {
    const rawN1 = carreraRangeMatch[1];
    const n1 = (rawN1 === "circunvalar" || rawN1 === "cerros") ? 1 : parseInt(rawN1, 10);
    const n2 = parseInt(carreraRangeMatch[2], 10);
    if (!isNaN(n1) && !isNaN(n2)) {
      res.minCarrera = Math.min(n1, n2);
      res.maxCarrera = Math.max(n1, n2);
    }
  }

  // 3. Orientación en cuadrante arterial (Autopista Norte = Cra 45, Séptima = Cra 7)
  if (norm.includes("arriba de la autopista") || norm.includes("oriente de la autopista")) {
    res.maxCarrera = 45;
    res.minCarrera = 1;
  } else if (norm.includes("abajo de la autopista") || norm.includes("occidente de la autopista")) {
    res.minCarrera = 45;
  }

  if (norm.includes("arriba de la septima") || norm.includes("arriba de la séptima") || norm.includes("arriba de la 7")) {
    res.maxCarrera = 7;
    res.minCarrera = 1;
  } else if (norm.includes("abajo de la septima") || norm.includes("abajo de la séptima") || norm.includes("abajo de la 7")) {
    res.minCarrera = 7;
  }

  return res;
}

export function parsePropertyAddressNumbers(text: string): PropertyAddressNumbers {
  const norm = (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const res: PropertyAddressNumbers = {};

  // 1. Detección estricta de CALLE (Calle, Cll, Cl, C/)
  const streetMatch = norm.match(/(?:calle|cll|cl|c\/)\s*#?\s*(\d{1,3})\b/i);
  if (streetMatch) {
    const sNum = parseInt(streetMatch[1], 10);
    if (!isNaN(sNum) && sNum > 0 && sNum <= 260) res.street = sNum;
  }

  // 2. Detección estricta de CARRERA (Carrera, Cra, Cr, Kra, Kr, K/)
  const carreraMatch = norm.match(/(?:carrera|cra|cr|kra|kr|k\/|\bk\b)\s*#?\s*(\d{1,3})\b/i);
  if (carreraMatch) {
    const cNum = parseInt(carreraMatch[1], 10);
    if (!isNaN(cNum) && cNum > 0 && cNum <= 160) res.carrera = cNum;
  }

  // 3. Ejes Arteriales Clave (Autopista Norte)
  if (norm.includes("autonorte") || norm.includes("autopista norte")) {
    res.isAutoNorte = true;
  }

  return res;
}

export function matchesGeography(
  reqZoneRaw: string,
  propZoneRaw: string,
  reqLocRaw: string,
  propLocRaw: string,
  reqCityRaw: string,
  propCityRaw: string
): { matches: boolean; score: number } {
  const reqCity = normalizarTextoGeografico(reqCityRaw || "");
  const propCity = normalizarTextoGeografico(propCityRaw || "");
  const reqZone = normalizarTextoGeografico(reqZoneRaw || "");
  const propZone = normalizarTextoGeografico(propZoneRaw || "");
  const reqLoc = normalizarTextoGeografico(reqLocRaw || "");
  const propLoc = normalizarTextoGeografico(propLocRaw || "");

  // 1. SIEMPRE: Municipio / Ciudad exacto es obligatorio (Filtro duro)
  if (reqCity && propCity && reqCity !== propCity) {
    return { matches: false, score: 0 };
  }

  // 1.3 Delimitación de Perímetro Vial (Calles y Carreras - Bounding Box Guard)
  const reqBoundaries = parseStreetCarreraBoundaries(`${reqZoneRaw} ${reqLocRaw}`);
  const propNumbers = parsePropertyAddressNumbers(propZoneRaw);

  if (propNumbers.street && reqBoundaries.minStreet && reqBoundaries.maxStreet) {
    if (propNumbers.street < reqBoundaries.minStreet || propNumbers.street > reqBoundaries.maxStreet) {
      return { matches: false, score: 0 };
    }
  }

  if (propNumbers.carrera && reqBoundaries.minCarrera && reqBoundaries.maxCarrera) {
    if (propNumbers.carrera < reqBoundaries.minCarrera || propNumbers.carrera > reqBoundaries.maxCarrera) {
      return { matches: false, score: 0 };
    }
  }

  // 1.4 Guard de Cuadrante No Resuelto (Bug #3 Fix)
  if (esFormatoCuadrante(reqZoneRaw) && !reqBoundaries.minStreet && !reqBoundaries.minCarrera) {
    return { matches: false, score: 0 };
  }

  // 1.4 Guard de Sabana Norte Campestre vs Bogotá Urbano DENSIDAD (Regla Doctrinal v21.20)
  const reqFullNorm = normalizarTextoGeografico(`${reqZoneRaw} ${reqLocRaw} ${reqCityRaw}`);
  const propFullNorm = normalizarTextoGeografico(`${propZoneRaw} ${propLocRaw} ${propCityRaw}`);

  const sabanaSuburbanSectors = [
    "san simon", "guaymaral", "hacienda fontanar", "fontanar", "fagua", "potosi",
    "sindamanoy", "yerbabuena", "yerbabona", "briceno", "hatogrande", "chia", "sopo", "cajica", "cota", "la calera"
  ];
  
  const reqAskaSabana = sabanaSuburbanSectors.some(sec => reqFullNorm.includes(sec));
  const bogotaUrbanSectors = [
    "prado veraniego", "cedritos", "chico", "chico norte", "chico reservado", "chapinero",
    "santa barbara", "pasadena", "alhambra", "batán", "el batan", "niza", "metropolis", "polo club", "castellana"
  ];
  const propIsUrbanBogota = bogotaUrbanSectors.some(sec => propFullNorm.includes(sec));

  if (reqAskaSabana && propIsUrbanBogota) {
    console.log(`[Matching-Guard] Bloqueo 0%: Requerimiento busca Sabana Norte (${reqZoneRaw}) pero inmueble está en Bogotá Urbano (${propZoneRaw})`);
    return { matches: false, score: 0 };
  }

  // 1.44 Guard Doctrinal v22.5: Incompatibilidad entre Santa Bárbara (Usaquén) y Virrey / Rincón del Chicó (Chapinero)
  const isSantaBarbaraProp = propFullNorm.includes("santa barbara");
  const isVirreyReq = reqFullNorm.includes("virrey") || reqFullNorm.includes("rincon del chico");
  const isSantaBarbaraReq = reqFullNorm.includes("santa barbara");
  const isVirreyProp = propFullNorm.includes("virrey") || propFullNorm.includes("rincon del chico");
  if ((isSantaBarbaraProp && isVirreyReq) || (isSantaBarbaraReq && isVirreyProp)) {
    if (!hasAledanos(reqZoneRaw) && !hasAledanos(propZoneRaw)) {
      console.log(`[Matching-Guard] Bloqueo 0%: Incompatibilidad geográfica entre Santa Bárbara y Virrey / Rincón del Chicó ('${reqZoneRaw}' ↔ '${propZoneRaw}')`);
      return { matches: false, score: 0 };
    }
  }

  // 1.45 Guard Doctrinal v21.21: Cardinales y Zonas Genéricas ("Norte", "Sur", "Oriente", "Occidente", "Centro", "Sabana")
  // "Norte" NO es un barrio ni vereda. No puede coincidir como nombre de barrio ni dar 20 puntos por coincidir la palabra "Norte".
  const GENERIC_CARDINAL_TERMS = new Set([
    "norte", "sur", "oriente", "occidente", "centro", "sabana", "sabana norte", "sabana occidente",
    "zona norte", "zona sur", "zona oriente", "zona occidente", "zona centro",
    "bogota norte", "bogotá norte", "bogota sur", "bogotá sur", "bogota centro", "bogotá centro",
    "bogota occidente", "bogotá occidente", "cualquiera", "varias zonas", "varios barrios",
    "toda la ciudad", "sin especificar", "n/e", "na", "n/a", "por definir"
  ]);

  const isReqGeneric = !reqZone || GENERIC_CARDINAL_TERMS.has(reqZone.toLowerCase().trim());
  const isPropGeneric = !propZone || GENERIC_CARDINAL_TERMS.has(propZone.toLowerCase().trim());

  // Si la zona es genérica (ej: "Norte") y NO hay delimitación vial de calles/carreras coincidentes ni barrio específico, BLOQUEAR (0%)
  if (isReqGeneric || isPropGeneric) {
    const hasStreetBoundaryMatch = (propNumbers.street && reqBoundaries.minStreet !== undefined && reqBoundaries.maxStreet !== undefined && propNumbers.street >= reqBoundaries.minStreet && propNumbers.street <= reqBoundaries.maxStreet)
                                || (propNumbers.carrera && reqBoundaries.minCarrera !== undefined && reqBoundaries.maxCarrera !== undefined && propNumbers.carrera >= reqBoundaries.minCarrera && propNumbers.carrera <= reqBoundaries.maxCarrera);
    if (!hasStreetBoundaryMatch) {
      console.log(`[Matching-Guard] Bloqueo 0%: Ubicación genérica o no especificada en barrio/vereda real ('${reqZoneRaw}' ↔ '${propZoneRaw}').`);
      return { matches: false, score: 0 };
    }
  }

  // Si la zona/localidad requerida es genérica de ciudad (ej. "bogota", "medellin", "cali"), y hay barrio en la propiedad
  const stopCities = new Set(["bogota", "bogotá", "medellin", "medellín", "cali", "barranquilla", "cartagena", "bucaramanga", "colombia"]);
  if (!reqZone || stopCities.has(reqZone.toLowerCase().trim())) {
    return { matches: true, score: 20 };
  }

  // 1.5 Guard de Sub-barrios y Micro-sectores Estrictos (v20.0 Precisión Catastral)
  const tieneAledanosInicial = hasAledanos(reqZoneRaw);
  if (reqZone && propZone && !tieneAledanosInicial) {
    const s1 = reqZone.toLowerCase();
    const s2 = propZone.toLowerCase();
    
    const orientaciones = ["oriental", "occidental", "norte", "sur", "alta", "alto", "baja", "bajo", "reservado", " central"];
    const tieneDiffOrientacion = orientaciones.some(o => 
      (s1.includes(o) && !s2.includes(o)) || (!s1.includes(o) && s2.includes(o))
    );

    const tieneNum1 = s1.match(/\b(i|ii|iii|iv|v|1|2|3|4)\b/);
    const tieneNum2 = s2.match(/\b(i|ii|iii|iv|v|1|2|3|4)\b/);
    const diffNum = tieneNum1 && tieneNum2 && tieneNum1[0] !== tieneNum2[0];

    if (tieneDiffOrientacion || diffNum) {
      return { matches: false, score: 0 };
    }
  }

  // 2. Definimos las equivalencias de zonas coloquiales (F4)
  const equivalenciasZonas: Record<string, string[]> = {
    "las santas": [
      "santa barbara oriental", "santa barbara central", "santa barbara occidental",
      "santa ana oriental", "santa ana occidental", "santa paula", "santa bibiana",
      "san patricio", "navarra", "chico navarra", "molinos norte", "usaquen", "multicentro"
    ],
    "zona santas": [
      "santa barbara oriental", "santa barbara central", "santa barbara occidental",
      "santa ana oriental", "santa ana occidental", "santa paula", "santa bibiana",
      "san patricio", "navarra", "chico navarra", "molinos norte", "usaquen", "multicentro"
    ],
    "santas de usaquen": [
      "santa barbara oriental", "santa barbara central", "santa barbara occidental",
      "santa ana oriental", "santa ana occidental", "santa paula", "santa bibiana",
      "san patricio", "navarra", "chico navarra", "molinos norte", "usaquen", "multicentro"
    ],
    "sector santas": [
      "santa barbara oriental", "santa barbara central", "santa barbara occidental",
      "santa ana oriental", "santa ana occidental", "santa paula", "santa bibiana",
      "san patricio", "navarra", "chico navarra", "molinos norte", "usaquen", "multicentro"
    ],
    "barrios santa norte": [
      "santa barbara oriental", "santa barbara central", "santa barbara occidental",
      "santa ana oriental", "santa ana occidental", "santa paula", "santa bibiana",
      "san patricio", "navarra", "chico navarra", "molinos norte", "usaquen", "multicentro"
    ],
    "el chico": ["chico norte", "chico reservado", "chico reservado norte", "chico", "chico navarra", "chico sur"],
    "chico": ["chico norte", "chico reservado", "chico reservado norte", "chico", "chico navarra", "chico sur"],
    "lagos": ["lagos de torca", "club los lagartos", "el lago"],
    "las lomas": ["lomas de niza", "lomas"]
  };

  // Helper para expandir una frase si es zona coloquial o devolverla tal cual
  const expandirZona = (phrase: string): string[] => {
    if (equivalenciasZonas[phrase]) {
      return equivalenciasZonas[phrase];
    }
    return [phrase];
  };

  // Helper para limpiar y extraer frases individuales
  const splitPhrases = (text: string): string[] => {
    if (!text) return [];
    let norm = normalizarTextoGeografico(text);
    
    // Quitar frases de proximidad
    norm = norm.replace(/\b(u\s+)?otros\s+barrios\s+aledanos\b/gi, "");
    norm = norm.replace(/\b(y|o|u)\s+aledanos\b/gi, "");
    norm = norm.replace(/\b(y|o|u)\s+sectores\s+cercanos\b/gi, "");
    norm = norm.replace(/\b(y|o|u)\s+alrededores\b/gi, "");
    norm = norm.replace(/\b(y|o)\s+similares\b/gi, "");
    norm = norm.replace(/\baledanos\b/gi, "");
    norm = norm.replace(/\bcercanos\b/gi, "");
    norm = norm.replace(/\balrededores\b/gi, "");

    const stopGeoWords = new Set([
      "bogota", "bogota d c", "bogota dc", "d c", "dc", "colombia",
      "medellin", "cali", "barranquilla", "cartagena", "bucaramanga",
      "pereira", "manizales", "cucuta", "ibague", "santa marta"
    ]);
    
    return norm.split(/,|\/|\s+y\s+|\s+o\s+|\s+e\s+/)
      .map(p => p.trim())
      .filter(p => p.length > 0 && !stopGeoWords.has(p));
  };

  const extractNeighborhoodTokens = (text: string): string[] => {
    if (!text) return [];
    const norm = normalizarTextoGeografico(text);
    const found: string[] = [];

    const knownNeighborhoods = [
      "cedritos", "santa paula", "santa barbara", "santa barbara central", "santa barbara occidental",
      "santa barbara oriental", "santa ana", "santa ana alta", "santa ana oriental", "santa ana occidental",
      "chico", "chico norte", "chico reservado", "chico navarra", "rosales", "los rosales", "el virrey",
      "la cabrera", "nogal", "el nogal", "antiguo country", "country club", "la calleja", "bella suiza",
      "el contador", "san patricio", "molinos norte", "batán", "el batan", "pasadena", "alhambra",
      "colina", "colina campestre", "suba", "niza", "pontevedra", "morato", "salitre", "ciudad salitre",
      "hayuelos", "modelia", "fontibon", "teusaquillo", "la soledad", "palermo", "chapinero",
      "chapinero alto", "quinta camacho", "marly", "bosque izquierdo", "macarena", "la macarena",
      "centro internacional", "usaquen", "multicentro", "el poblado", "poblado", "laureles",
      "envigado", "sabaneta", "belen", "estadio", "conquistadores", "granada", "el peñon",
      "juanambú", "ciudad jardin", "san fernando", "valle del lili", "el prado", "alto prado",
      "riomar", "villa santos", "buenavista", "cabecera", "cañaveral", "ruitoque", "sotomayor"
    ];

    for (const n of knownNeighborhoods) {
      if (norm.includes(n)) {
        found.push(n);
      }
    }
    return found;
  };

  let reqPhrases = splitPhrases(reqZoneRaw);
  let propPhrases = splitPhrases(propZoneRaw);

  const reqExtracted = extractNeighborhoodTokens(reqZoneRaw);
  const propExtracted = extractNeighborhoodTokens(propZoneRaw);

  if (reqPhrases.length === 0 && reqExtracted.length > 0) reqPhrases = reqExtracted;
  else if (reqExtracted.length > 0) reqPhrases = Array.from(new Set([...reqPhrases, ...reqExtracted]));

  if (propPhrases.length === 0 && propExtracted.length > 0) propPhrases = propExtracted;
  else if (propExtracted.length > 0) propPhrases = Array.from(new Set([...propPhrases, ...propExtracted]));

  // Inserción IDECA Catastral (1,230 sectores Bogotá): resolver perímetros viales en barrios reales
  if (reqBoundaries.minStreet && reqBoundaries.maxStreet) {
    try {
      const idecaRes = lookupBarriosByPerimeter({
        calleNorte: reqBoundaries.maxStreet,
        calleSur: reqBoundaries.minStreet,
        craOriente: reqBoundaries.minCarrera || 1,
        craOccidente: reqBoundaries.maxCarrera || 30,
        ciudad: "bogota"
      });
      if (idecaRes.barrios && idecaRes.barrios.length > 0) {
        const idecaNorm = idecaRes.barrios.map(b => normalizarTextoGeografico(b));
        reqPhrases = Array.from(new Set([...reqPhrases, ...idecaNorm]));
      }
    } catch (idecaErr) {
      console.warn("[Matching-IDECA] Error resolviendo perímetro en matching:", idecaErr);
    }
  }

  const reqExpanded = reqPhrases.flatMap(expandirZona);
  const propExpanded = propPhrases.flatMap(expandirZona);

  // Palabras genéricas geográficas que no deben ser usadas para coincidencia parcial de barrio
  const palabrasGenericas = new Set([
    "bogota", "bogotá", "colombia", "medellin", "medellín", "cali", "barranquilla", "bucaramanga",
    "santa", "santo", "san", "del", "los", "las", "la", "el", "villa", "vista",
    "alto", "altos", "bajo", "bajos", "nueva", "nuevo", "valle", "valles",
    "portal", "portales", "rincon", "brisas", "colina", "colinas", "bosque",
    "bosques", "prado", "prados", "real", "lago", "lagos", "norte", "sur",
    "occidente", "oriente", "centro", "sector", "zona", "barrio", "vereda"
  ]);

  const esCoincidenciaAproximada = (p1: string, p2: string): boolean => {
    if (p1 === p2) return true;
    if (palabrasGenericas.has(p1) || palabrasGenericas.has(p2)) {
      return false;
    }
    return p1.includes(p2) || p2.includes(p1);
  };

  // 3. Evaluar coincidencia nominal en barrios (con expansión de zonas coloquiales)
  if (reqExpanded.length > 0 && propExpanded.length > 0) {
    for (const rp of reqExpanded) {
      for (const pp of propExpanded) {
        if (esCoincidenciaAproximada(rp, pp)) {
          return { matches: true, score: 25 };
        }
      }
    }
  }

  // 4. Si el requerimiento pide barrios específicos pero NO menciona "aledaños", "cercanos", etc.
  // entonces la ubicación DEBE ser exacta. Si no ha coincidido arriba, descartamos (0).
  const tieneAledanos = hasAledanos(reqZoneRaw);

  if (!tieneAledanos) {
    if (reqExpanded.length > 0) {
      return { matches: false, score: 0 };
    }
  }

  // 5. CASO 4: El requerimiento incluye "aledaños", "cercanos", "u otros":
  // Aceptamos propiedades en barrios contiguos del mismo municipio y la misma localidad/comuna.
  if (tieneAledanos && reqLoc && propLoc && reqLoc !== "bogota" && propLoc !== "bogota" && reqLoc === propLoc) {
    return { matches: true, score: 15 };
  }

  // 6. Si no hay match nominal ni por localidad aledaña, y ambos especifican algo concreto, es mismatch.
  const isReqLocSpec = reqLoc && reqLoc !== "bogota";
  const isPropLocSpec = propLoc && propLoc !== "bogota";
  const isReqZoneSpec = reqZone && reqZone !== "bogota" && reqExpanded.length > 0;
  const isPropZoneSpec = propZone && propZone !== "bogota" && propExpanded.length > 0;

  if ((isReqLocSpec || isReqZoneSpec) && (isPropLocSpec || isPropZoneSpec)) {
    return { matches: false, score: 0 };
  }

  // 7. Misma ciudad por defecto (si al menos uno es genérico y no hay mismatch explícito)
  if (reqCity && propCity && reqCity === propCity) {
    return { matches: true, score: 10 };
  }

  return { matches: false, score: 0 };
}

import { vrifEvents } from "./events";

export interface MatchExplanation {
  score: number;
  blockers: string[];
  positives: string[];
  negatives: string[];
  confidence: number;
  generatedAt: string;
  engineVersion: string; // VRIF Engine Version (e.g. VRIF-2.0)
  ipc?: MatchIpc;
  isStrictCompliant?: boolean;
  missingFields?: string[];
}

export interface MatchIpc {
  score: number;
  factors: {
    matching: number;
    freshness: number;
    brokerTrust: number;
    dataQuality: number;
    marketDemand: number;
  };
  generatedAt: string;
  version: string;
}

export function calcularIPC(requirement: any, property: any, matchScore: number): MatchIpc {
  // 1. Matching
  const matching = Math.round(matchScore);

  // 2. Freshness (Recencia)
  const propAgeDays = Math.max(0, (Date.now() - new Date(property.createdAt || new Date()).getTime()) / (1000 * 60 * 60 * 24));
  const reqAgeDays = Math.max(0, (Date.now() - new Date(requirement.createdAt || new Date()).getTime()) / (1000 * 60 * 60 * 24));
  
  const getAgeFactor = (days: number) => {
    if (days <= 3) return 100;
    if (days <= 7) return 90;
    if (days <= 15) return 75;
    if (days <= 30) return 55;
    return 30;
  };
  const freshness = Math.round((getAgeFactor(propAgeDays) + getAgeFactor(reqAgeDays)) / 2);

  // 3. Broker Trust (Confianza)
  const propBrokerHasInfo = property.idUsuarioWhatsapp ? 90 : 70;
  const reqBrokerHasInfo = requirement.idUsuarioWhatsapp ? 90 : 70;
  const brokerTrust = Math.round((propBrokerHasInfo + reqBrokerHasInfo) / 2);

  // 4. Data Quality (Completitud)
  const getCompletitud = (item: any, isProp: boolean) => {
    let fields = 6;
    let present = 0;
    const priceVal = isProp ? item.price : (item.presupuestoMax || item.presupuestoMin);
    if (priceVal && parseFloat(String(priceVal)) > 0) present++;
    const areaVal = isProp ? item.areaTotal : item.areaMin;
    if (areaVal && parseFloat(String(areaVal)) > 0) present++;
    const bedVal = isProp ? item.bedrooms : item.habitacionesMin;
    if (bedVal && Number(bedVal) > 0) present++;
    const bathVal = isProp ? item.bathrooms : item.banosMin;
    if (bathVal && Number(bathVal) > 0) present++;
    const zoneVal = isProp ? item.zone : item.zonaDeseada;
    if (zoneVal && zoneVal.trim() !== "" && zoneVal !== "NA") present++;
    if (item.idUsuarioWhatsapp) present++;
    return Math.round((present / fields) * 100);
  };
  const dataQuality = Math.round((getCompletitud(property, true) + getCompletitud(requirement, false)) / 2);

  // 5. Market Demand (Precio / Demanda)
  const priceNum = parseFloat(String(property.price || "0"));
  let marketDemand = 70;
  if (priceNum > 0) {
    if (priceNum <= 300_000_000) marketDemand = 95;
    else if (priceNum <= 600_000_000) marketDemand = 85;
    else if (priceNum <= 1_200_000_000) marketDemand = 75;
    else marketDemand = 60;
  }

  // Weight formula: IPC = 40% matching + 20% freshness + 10% brokerTrust + 20% dataQuality + 10% marketDemand
  const finalScore = Math.round(
    (matching * 0.4) +
    (freshness * 0.2) +
    (brokerTrust * 0.1) +
    (dataQuality * 0.2) +
    (marketDemand * 0.1)
  );

  return {
    score: finalScore,
    factors: {
      matching,
      freshness,
      brokerTrust,
      dataQuality,
      marketDemand
    },
    generatedAt: new Date().toISOString(),
    version: "VRIF-2.0"
  };
}

function buildExplanationResult(
  score: number, 
  blockers: string[], 
  positives: string[], 
  negatives: string[],
  isStrictCompliant: boolean = true,
  missingFields: string[] = []
): MatchExplanation {
  return {
    score,
    blockers,
    positives,
    negatives,
    confidence: 1.0,
    generatedAt: new Date().toISOString(),
    engineVersion: "VRIF-2.0",
    isStrictCompliant,
    missingFields
  };
}

export function explicarMatch(requirement: any, property: any): MatchExplanation {
  const blockers: string[] = [];
  const positives: string[] = [];
  const negatives: string[] = [];

  // ── FILTRO DURO 0A: DATOS EN DURO OBLIGATORIOS (Doctrinal v22.1) ──────────────────────────────
  // REGLA: Si CUALQUIERA de los datos en duro es N/E (no especificado) en el INMUEBLE o en el
  // REQUERIMIENTO, ese registro NO PUEDE participar en ningún MATCH. Score 0%. No se muestra.
  // Datos en duro: Tipo de Inmueble, Tipo de Negocio, Ciudad/Municipio, Barrio/Vereda.

  const isNA = (v: string | null | undefined) =>
    !v || v.trim() === "" || v.trim().toUpperCase() === "NA" || v.trim().toUpperCase() === "N/E"
    || v.trim().toUpperCase() === "N/A" || v.trim() === "-";

  // Tipo de Inmueble obligatorio en ambos
  const propTypeHard = property.propertyType || property.tipoInmueble || "";
  const reqTypeHard  = requirement.tipoInmuebleDeseado || requirement.propertyType || "";
  if (isNA(propTypeHard)) {
    blockers.push("⛔ Inmueble Incompleto: Tipo de Inmueble no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  if (isNA(reqTypeHard)) {
    blockers.push("⛔ Requerimiento Incompleto: Tipo de Inmueble deseado no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // Tipo de Negocio obligatorio en ambos
  const propBizHard = property.transactionType || "";
  const reqBizHard  = requirement.tipoNegocioDeseado || requirement.transactionType || "";
  if (isNA(propBizHard)) {
    blockers.push("⛔ Inmueble Incompleto: Tipo de Negocio no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  if (isNA(reqBizHard)) {
    blockers.push("⛔ Requerimiento Incompleto: Tipo de Negocio deseado no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // Ciudad/Municipio obligatorio en ambos
  const propCityHard = property.addressCity || property.city || "";
  const reqCityHard  = requirement.addressCity || requirement.ciudadDeseada || "";
  if (isNA(propCityHard)) {
    blockers.push("⛔ Inmueble Incompleto: Ciudad/Municipio no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  if (isNA(reqCityHard)) {
    blockers.push("⛔ Requerimiento Incompleto: Ciudad/Municipio deseado no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // Barrio/Vereda/Caserío obligatorio en ambos
  const propBarrioHard = property.zone || property.addressNeighborhood || "";
  const reqBarrioHard  = requirement.zonaDeseada || requirement.addressNeighborhood || "";
  if (isNA(propBarrioHard)) {
    blockers.push("⛔ Inmueble Incompleto: Barrio/Vereda no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  if (isNA(reqBarrioHard)) {
    blockers.push("⛔ Requerimiento Incompleto: Barrio/Vereda deseado no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── CAMPO 4: Localidad / Comuna — BLOQUEADOR DURO (Doctrinal v22.1) ──
  // Si AMBOS tienen Localidad/Comuna y son distintas → 0% ABSOLUTO. No se almacena ni muestra.
  // Nota: La localidad se deduce del barrio via deducirGeografiaTripartita en janIA.ts.
  // Si el barrio coincide, la localidad siempre coincide. Este filtro atrapa inconsistencias.
  const propLocalidadHard = property.addressLocality || "";
  const reqLocalidadHard  = requirement.addressLocality || "";
  const bothLocalidadKnown = !isNA(propLocalidadHard) && !isNA(reqLocalidadHard);
  if (bothLocalidadKnown) {
    const normPropLoc = normalizarTextoGeografico(propLocalidadHard);
    const normReqLoc  = normalizarTextoGeografico(reqLocalidadHard);
    if (normPropLoc !== normReqLoc && !normPropLoc.includes(normReqLoc) && !normReqLoc.includes(normPropLoc)) {
      blockers.push(`⛔ Localidad/Comuna Incompatible: buscada "${reqLocalidadHard}", ofrecida "${propLocalidadHard}". MATCH IMPOSIBLE.`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }

  // ── RESUMEN: 5 DATOS EN DURO VALIDADOS (v22.1) ──
  // ✅ 1. Tipo de Inmueble — obligatorio y compatible
  // ✅ 2. Tipo de Negocio  — obligatorio y compatible
  // ✅ 3. Barrio/Vereda    — obligatorio, exacto, sin sub-calificadores conflictivos
  // ✅ 4. Localidad/Comuna — obligatorio cuando disponible, exacta
  // ✅ 5. Ciudad/Municipio — obligatorio y compatible (se valida abajo)


  // ── REGLA DOCTRINAL DE COTEJO COMPLETO 100% VERDE/AMARILLO (CERO GRISES, CERO ROJOS) ──
  // Para que un match sea elegible, la demanda Y la oferta DEBEN tener especificadas las 8 características clave:
  // [Tipo de inmueble, Tipo de negocio, Ubicación/Barrio, Presupuesto, Área total, Habitaciones, Baños, Parqueaderos].
  // Si cualquiera de estos datos queda en Gris (Dato Pendiente / N/E) o Rojo (Fallido), el match se DESCALIFICA al 0%.

  const reqRawString = (requirement.rawText || requirement.name || "").trim();
  const reqTextLow = reqRawString.toLowerCase();
  const propRawString = (property.rawText || property.description || property.name || "").trim();
  const propTextLow = propRawString.toLowerCase();
  
  const SECTORES_BOGOTA_SABANA = [
    "cedritos", "usaquen", "usaquén", "chico", "chicó", "chapinero", "suba", "engativa", "engativá",
    "teusaquillo", "kennedy", "fontibon", "fontibón", "salitre", "rosales", "colina", "niza", "cabrera",
    "nogal", "recreo", "castellana", "patricio", "barbara", "bárbara", "belmira", "suiza", "navarra", "floresta",
    "granada", "santa barbara", "santa bárbara", "chico reservado", "chico norte", "rincon del chico",
    "rincón del chicó", "pasadena", "batan", "batán", "la carolina", "alambra", "mazuren", "mazurén", "calleja",
    "virrey", "el retiro", "antiguo country", "los rosales", "chia", "chía", "cajica", "cajicá", "cota", "sopó"
  ];

  // 1. Ubicación / Barrio
  const reqZoneRawClean = (requirement.zonaDeseada || requirement.addressNeighborhood || "").trim().toLowerCase();
  const hasColZone = reqZoneRawClean !== "" && reqZoneRawClean !== "na" && reqZoneRawClean !== "bogota" && reqZoneRawClean !== "bogotá";
  const hasTextZone = SECTORES_BOGOTA_SABANA.some(sector => reqTextLow.includes(sector)) || /zona|sector|barrio|calle|cra|carrera/i.test(reqTextLow);
  const hasSpecificReqZone = hasColZone || hasTextZone;

  // 2. Presupuesto Máximo Demanda (extracción desde columna o rawText)
  let budgetMaxCheck = parseFloat(String(requirement.presupuestoMax || "0"));
  if (budgetMaxCheck <= 0) {
    const mP = reqTextLow.match(/(?:ppto|presupuesto|busco|hasta|canon|valor)\s*:?\s*\$?([\d.]+)\s*(millones|millón|mll|mlls|mm|m|M)?/i)
            || reqTextLow.match(/\$?\s*([\d.]+)\s*(millones|millón|mll|mlls|mm|m|M)\b/i);
    if (mP) {
      let valR = parseFloat(mP[1].replace(/\./g, ""));
      if (!isNaN(valR)) {
        if (valR < 1000) valR *= 1000000;
        budgetMaxCheck = valR;
      }
    }
  }
  const hasReqBudget = budgetMaxCheck > 0;

  // 3. Área Total Demanda
  let reqAreaCheck = parseFloat(String(requirement.areaMin || requirement.areaMinimaM2 || "0"));
  if (reqAreaCheck <= 0) {
    const mRA = reqTextLow.match(/(?:mínimo|min|de|área)?\s*([\d.,]+)\s*(?:m2|mts|m²|metros)/i);
    if (mRA) {
      let valRA = parseFloat(mRA[1].replace(/\./g, "").replace(",", "."));
      if (!isNaN(valRA) && valRA > 10 && valRA < 10000) reqAreaCheck = valRA;
    }
  }
  const hasReqArea = reqAreaCheck > 0;

  // 4. Habitaciones Demanda
  let reqBedsCheck = requirement.habitacionesMin ? Number(requirement.habitacionesMin) : 0;
  if (reqBedsCheck <= 0) {
    const mB = reqTextLow.match(/(\d+(?:\s*-\s*\d+)?)\s*(?:hab|habitaciones|alcoba|alcobas|alc|dormitorio|cuarto|cuartos|hb)/i);
    if (mB) reqBedsCheck = parseInt(mB[1].split("-")[0].trim(), 10);
  }
  const hasReqBedrooms = reqBedsCheck > 0;

  // 5. Baños Demanda
  let reqBathsCheck = requirement.banosMin ? Number(requirement.banosMin) : 0;
  if (reqBathsCheck <= 0) {
    const mW = reqTextLow.match(/(\d+(?:\.\d+)?)\s*(?:o\s*más\s*)?(?:wc|baño|baños|bñ)/i) || reqTextLow.match(/(\d+)\s*hab\s*con\s*baño/i);
    if (mW) reqBathsCheck = parseFloat(mW[1]);
  }
  const hasReqBathrooms = reqBathsCheck > 0;

  // 6. Parqueaderos Demanda
  let reqGaragesCheck = requirement.parqueaderosMin ? Number(requirement.parqueaderosMin) : 0;
  if (reqGaragesCheck <= 0) {
    const mG = reqTextLow.match(/(?:parqueadero|parqueaderos|garaje|garajes|ptero|g\.)\s*\.?\s*(\d+)/i)
            || reqTextLow.match(/(\d+)\s*(?:parqueadero|parqueaderos|garaje|garajes|ptero|g\.|individuales)/i)
            || /garajes|parqueaderos/i.test(reqTextLow);
    if (mG && mG[1]) reqGaragesCheck = parseInt(mG[1], 10);
    else if (/garajes|parqueaderos/i.test(reqTextLow)) reqGaragesCheck = 1;
  }
  const hasReqGarages = reqGaragesCheck > 0;
  const hasReqAdmin = (requirement.adminFeeMax != null && Number(requirement.adminFeeMax) > 0) || /admon|administracion|administración/i.test(reqTextLow);

  // 7 & 8. Tipo de Inmueble y Negocio Demanda
  const hasReqType = !!(requirement.tipoInmuebleDeseado || requirement.propertyType) || /apto|apartamento|casa|oficina|lote|bodega|local|finca|apartaestudio|loft/i.test(reqTextLow);
  const hasReqBizType = !!(requirement.tipoNegocioDeseado || requirement.transactionType) || /venta|vendo|compro|compra|arriendo|alquilo|renta/i.test(reqTextLow);

  // VERIFICACIÓN DATOS OBLIGATORIOS OFERTA
  let propPriceCheck = parseFloat(String(property.price || "0"));
  if (propPriceCheck <= 0 && property.rentPrice) propPriceCheck = parseFloat(String(property.rentPrice));
  if (propPriceCheck <= 0) {
    const mPP = propTextLow.match(/(?:venta|precio|valor|canon|arriendo)\s*:?\s*\$?([\d.,]+)\s*(millones|millón|m|M)?/i);
    if (mPP) {
      let valP = parseFloat(mPP[1].replace(/\./g, "").replace(/,/g, ""));
      if (!isNaN(valP) && valP > 1000) propPriceCheck = valP;
    }
  }

  let propAreaCheck = parseFloat(String(property.areaTotal || property.areaPrivate || "0"));
  if (propAreaCheck <= 0) {
    const mPA = propTextLow.match(/área\s*:?\s*([\d.,]+)/i) || propTextLow.match(/([\d.,]+)\s*(?:m2|mts|m²|metros)/i);
    if (mPA) {
      let valA = parseFloat(mPA[1].replace(/\./g, "").replace(",", "."));
      if (!isNaN(valA) && valA > 10 && valA < 10000) propAreaCheck = valA;
    }
  }

  let propBedsCheck = property.bedrooms ? Number(property.bedrooms) : 0;
  if (propBedsCheck <= 0) {
    const mPB = propTextLow.match(/(\d+)\s*(?:hab|habitaciones|alcoba|alcobas|alc|dormitorio)/i);
    if (mPB) propBedsCheck = parseInt(mPB[1], 10);
  }

  let propBathsCheck = property.bathrooms ? Number(property.bathrooms) : 0;
  if (propBathsCheck <= 0) {
    const mPBa = propTextLow.match(/(\d+)\s*(?:wc|baño|baños|bñ)/i);
    if (mPBa) propBathsCheck = parseInt(mPBa[1], 10);
  }

  let propGaragesCheck = property.garages ? Number(property.garages) : 0;
  if (propGaragesCheck <= 0) {
    const mPG = propTextLow.match(/(\d+)\s*(?:parqueo|parqueos|parqueadero|parqueaderos|garaje|garajes|ptero)/i)
             || propTextLow.match(/(?:parqueo|parqueos|parqueadero|parqueaderos|garaje|garajes|ptero)\s*:?\s*(\d+)/i);
    if (mPG) propGaragesCheck = parseInt(mPG[1], 10);
  }

  const missingReqFields: string[] = [];
  if (!hasSpecificReqZone) missingReqFields.push("Ubicación / Barrio");
  if (!hasReqBudget) missingReqFields.push("Presupuesto Máx.");
  if (!hasReqArea) missingReqFields.push("Área Total");
  if (!hasReqBedrooms) missingReqFields.push("Habitaciones");
  if (!hasReqBathrooms) missingReqFields.push("Baños");
  if (!hasReqGarages) missingReqFields.push("Parqueaderos");
  if (!hasReqType) missingReqFields.push("Tipo de Inmueble");
  if (!hasReqBizType) missingReqFields.push("Tipo de Negocio");

  const missingPropFields: string[] = [];
  if (propPriceCheck <= 0) missingPropFields.push("Precio Oferta");
  if (propAreaCheck <= 0) missingPropFields.push("Área Oferta");
  if (propBedsCheck <= 0) missingPropFields.push("Habitaciones Oferta");
  if (propBathsCheck <= 0) missingPropFields.push("Baños Oferta");
  if (propGaragesCheck <= 0) missingPropFields.push("Parqueaderos Oferta");

  const isStrictCompliant = missingReqFields.length === 0 && missingPropFields.length === 0;
  const missingFieldsList = [...missingReqFields.map(f => `${f} (Demanda)`), ...missingPropFields.map(f => `${f} (Oferta)`)];

  if (!isStrictCompliant) {
    negatives.push(`Dato Pendiente por Enriquecer: Faltan especificaciones [${missingFieldsList.join(", ")}].`);
  }

  // Puntuación por Completitud de la Ficha de Demanda (Entre más completa, mayor prioridad VECY)
  let completenessBonus = 0;
  if (hasReqArea) completenessBonus += 2;
  if (hasReqBathrooms) completenessBonus += 2;
  if (hasReqGarages) completenessBonus += 2;
  if (hasReqAdmin) completenessBonus += 2;
  if (reqRawString.length > 120) completenessBonus += 2;

  if (completenessBonus >= 6) {
    positives.push(`✨ Requerimiento de Alta Fidelidad: Ficha de demanda ultra-completa con ${8 + Math.round(completenessBonus / 2)} especificaciones detalladas (+${completenessBonus}% Bono Prioridad).`);
  }

  // 0. Evitar auto-match (mismo broker)
  const propBroker = (property.idUsuarioWhatsapp || "").split('@')[0];
  const reqBroker = (requirement.idUsuarioWhatsapp || "").split('@')[0];
  if (propBroker && reqBroker && propBroker === reqBroker) {
    blockers.push("Auto-match: el inmueble y el requerimiento pertenecen al mismo asesor.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── FILTRO DURO 1: Tipo de Negocio (arriendo vs venta NUNCA coinciden) ──
  const reqBiz = (requirement.tipoNegocioDeseado || requirement.transactionType || "").toLowerCase();
  const propBiz = (property.transactionType || "").toLowerCase();
  const propAccepted: string[] = Array.isArray(property.acceptedTransactionTypes)
    ? (property.acceptedTransactionTypes as string[]).map((t: string) => t.toLowerCase())
    : [];

  const transactionCompatible = checkTransactionCompatibility(reqBiz, propBiz, propAccepted);
  if (!transactionCompatible) {
    blockers.push(`Incompatibilidad de negocio: buscado '${reqBiz}', ofrecido '${propBiz}'`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  positives.push(`Tipo de negocio compatible: req='${reqBiz}' ↔ prop='${propBiz}'`);

  // ── FILTRO DURO 2: Ciudad ──
  const CIUDADES_CO = ["bogota", "medellin", "cali", "barranquilla", "cartagena",
    "bucaramanga", "pereira", "manizales", "cucuta", "ibague", "santa marta",
    "villavicencio", "pasto", "monteria", "valledupar", "sincelejo", "chia",
    "zipaquira", "cajica", "envigado", "bello", "sabaneta", "itagui", "tenjo", "mosquera"];

  const resolveCityField = (raw1: string, raw2: string): string => {
    const n1 = normalizarTextoGeografico(raw1 || "");
    const n2 = normalizarTextoGeografico(raw2 || "");
    
    const SECTORES_BOGOTA = [
      "cedritos", "usaquen", "chico", "chapinero", "suba", "engativa", 
      "teusaquillo", "kennedy", "fontibon", "bosa", "salitre", "rosales", 
      "colina", "niza", "cabrera", "nogal", "recreo", "castellana", 
      "patricio", "barbara", "belmira", "suiza", "navarra", "floresta",
      "granada", "colsubsidio", "santa barbara", "santa bárbara", "chico reservado",
      "chico norte", "rincon del chico", "rincón del chicó", "norte"
    ];
    
    const isBogotaSector = (val: string) => {
      return val === "" || val === "bogota" || val === "bogotá" || SECTORES_BOGOTA.some(sector => val.includes(sector));
    };

    if (isBogotaSector(n1) || isBogotaSector(n2)) {
      return "bogota";
    }

    if (CIUDADES_CO.some(c => n1.includes(c) || n1 === c)) return n1;
    if (CIUDADES_CO.some(c => n2.includes(c) || n2 === c)) return n2;

    return n1 || n2 || "bogota";
  };

  const reqCity = resolveCityField(requirement.ciudadDeseada || requirement.addressCity || "", requirement.city || "");
  const propCity = resolveCityField(property.addressCity || "", property.city || "");

  // ── FILTRO DURO CIUDAD (Doctrinal v22.1) ──
  // Si ambas ciudades están definidas y NO coinciden → 0% ABSOLUTO. NO se almacena ni muestra.
  const reqCityNorm = normalizarTextoGeografico(reqCity);
  const propCityNorm = normalizarTextoGeografico(propCity);
  const bothCitiesKnown = reqCityNorm && propCityNorm && reqCityNorm !== "colombia";
  if (bothCitiesKnown && reqCityNorm !== propCityNorm) {
    const sameCity = reqCityNorm.includes(propCityNorm) || propCityNorm.includes(reqCityNorm);
    if (!sameCity) {
      blockers.push(`⛔ Ciudad Incompatible: buscada "${reqCity}", ofrecida "${propCity}". MATCH IMPOSIBLE.`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }
  positives.push(`Ciudad coincide: ${reqCity}`);

  // ── FILTRO DURO BARRIO/VEREDA (Doctrinal v22.1) ──
  // Sub-barrio exacto: "Calleja Alta" ≠ "Calleja Baja". Si calificadores difieren → 0% ABSOLUTO.
  const SUB_QUALS_MATCHING = ["alta", "alto", "baja", "bajo", "norte", "sur", "oriental", "occidental", "reservado"];
  const reqBarrioNorm = normalizarTextoGeografico(requirement.zonaDeseada || requirement.addressNeighborhood || "");
  const propBarrioNorm = normalizarTextoGeografico(property.zone || property.addressNeighborhood || "");
  const GENERIC_ZONES_SET = new Set(["bogota", "bogota d c", "medellin", "cali", "barranquilla", "colombia", "norte", "sur", "centro", "n/e", "na", ""]);
  const reqBarrioIsSpecific = reqBarrioNorm && !GENERIC_ZONES_SET.has(reqBarrioNorm);
  const propBarrioIsSpecific = propBarrioNorm && !GENERIC_ZONES_SET.has(propBarrioNorm);

  if (reqBarrioIsSpecific && propBarrioIsSpecific) {
    const reqHasQual = SUB_QUALS_MATCHING.some(q => reqBarrioNorm.includes(q));
    const propHasQual = SUB_QUALS_MATCHING.some(q => propBarrioNorm.includes(q));
    if (reqHasQual && propHasQual && reqBarrioNorm !== propBarrioNorm) {
      const conflictingQuals = SUB_QUALS_MATCHING.filter(q => reqBarrioNorm.includes(q) !== propBarrioNorm.includes(q));
      if (conflictingQuals.length > 0) {
        blockers.push(`⛔ Sub-barrio Incompatible: "${requirement.zonaDeseada}" ≠ "${property.zone}". MATCH IMPOSIBLE.`);
        return buildExplanationResult(0, blockers, positives, negatives);
      }
    }
  }


function isPhoneNumberNotPrice(val: number | string | null | undefined, rawText?: string): boolean {
  if (val === undefined || val === null || val === "" || val === 0 || val === "0") return false;
  const numStr = String(val).replace(/\D/g, "");
  if (numStr.length === 10 && numStr.startsWith("3")) return true;
  if (numStr.length === 12 && numStr.startsWith("573")) return true;
  if (rawText) {
    const rawLower = rawText.toLowerCase();
    if (rawLower.includes(numStr) && numStr.length >= 8) {
      if (/wa|whatsapp|cel|celular|tel|telefono|teléfono|contacto|llamar/i.test(rawLower)) return true;
    }
  }
  return false;
}

  let price       = parseFloat(String(property.price || "0"));
  let budgetMax   = parseFloat(String(requirement.presupuestoMax || "0"));
  const budgetMin = parseFloat(String(requirement.presupuestoMin || "0"));

  if (isPhoneNumberNotPrice(price, property.rawText)) price = 0;
  if (isPhoneNumberNotPrice(budgetMax, requirement.rawText)) budgetMax = 0;

  // ── SANIDAD PREDIAL DE PRECIOS EN EL MOTOR v20.0 ──────────────────────────────
  // Para Venta, si price < 30.000.000 (ej. $1.200.000 cuota de administración),
  // ese valor NO es el precio de venta. Re-parsear el rawText para encontrar el valor real (ej. $950.000.000).
  const isSaleMatch = (property.transactionType || "").toLowerCase().includes("venta") || !(property.transactionType || "").toLowerCase().includes("arriendo");
  if (isSaleMatch && price > 0 && price < 30_000_000 && property.rawText) {
    const rawP = property.rawText.toLowerCase();
    const saleMatch = rawP.match(/(?:v\/venta\/|precio\s*(?:de\s*)?venta|venta)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|m|M)?/i)
                   || rawP.match(/venta\/.*?\$?\s*([\d.]{7,12})/i);
    if (saleMatch) {
      let rawNum = parseFloat(saleMatch[1].replace(/\./g, "").replace(/,/g, ""));
      const unitStr = (saleMatch[2] || "").toLowerCase();
      const mult = unitStr.includes("mil millon") ? 1_000_000_000
        : unitStr.includes("millon") || unitStr === "m" ? 1_000_000
        : rawNum < 10_000 ? 1_000_000 : 1;
      let valP = rawNum * mult;
      if (!isNaN(valP) && valP >= 30_000_000) {
        price = valP; // Corregir price a $950.000.000
      }
    }
  }

  // Sanidad Predial de Precios y Presupuestos:
  let isReqRent = (requirement.tipoNegocioDeseado || requirement.transactionType || "").toLowerCase().includes("arriendo");
  
  // Re-extraer presupuesto si el valor de presupuestoMax en BD es espurio (ej. > 50.000.000 para arriendo o 0)
  if (requirement.rawText && (budgetMax <= 0 || (isReqRent && budgetMax > 50_000_000))) {
    const rawR = requirement.rawText.toLowerCase();
    const matchPresu = rawR.match(/(?:presupuesto|ppto|canon|valor|hasta|máximo|max)\s*(?:máximo|max)?\s*:?\s*\$?([\d.,]+)\s*(millones|millón|mll|mlls|mm)?/i);
    if (matchPresu) {
      let valStr = matchPresu[1].replace(/\./g, "").replace(/,/g, ".");
      let valR = parseFloat(valStr);
      if (!isNaN(valR)) {
        const unit = (matchPresu[2] || "").toLowerCase();
        if (unit.includes("millon") || unit.includes("mll") || unit.includes("mm")) {
          valR *= 1_000_000;
        } else if (valR < 1000) {
          valR *= 1_000_000;
        }
        if (valR > 0) budgetMax = valR;
      }
    }
  }

  const propArea    = parseFloat(String(property.areaTotal || property.area || "0"));
  const reqAreaMin  = parseFloat(String(requirement.areaMin || requirement.areaMinimaM2 || "0"));

  const pBedrooms   = property.bedrooms   != null ? Number(property.bedrooms)   : -1;
  const reqBedrooms = requirement.habitacionesMin != null ? Number(requirement.habitacionesMin) : -1;

  const pBathrooms  = property.bathrooms  != null ? Number(property.bathrooms)  : -1;
  const reqBathrooms = requirement.banosMin != null ? Number(requirement.banosMin) : -1;

  const pGarages    = property.garages    != null ? Number(property.garages)    : -1;
  const reqGarages  = requirement.parqueaderosMin != null ? Number(requirement.parqueaderosMin) : -1;

  const pAdminFee   = property.adminFee   != null ? parseFloat(String(property.adminFee))   : -1;
  const reqAdminMax = requirement.adminFeeMax != null ? parseFloat(String(requirement.adminFeeMax)) : -1;

  const pEstrato    = property.stratum    != null ? Number(property.stratum)    :
                      property.estrato    != null ? Number(property.estrato)    : -1;
  const reqEstrato  = requirement.estratoDeseado != null ? Number(requirement.estratoDeseado) : -1;

  const reqType  = (requirement.tipoInmuebleDeseado || requirement.propertyType || "").toLowerCase().trim();
  const propType = (property.propertyType || "").toLowerCase().trim();

  const reqZone  = normalizarTextoGeografico(requirement.zonaDeseada || requirement.addressNeighborhood || "");
  const propZone = normalizarTextoGeografico(property.zone || property.addressNeighborhood || "");

  // ── FILTRO DURO 0: Inmueble/Requerimiento Vacío o Sin Contenido Legible (Tolerancia Cero) ──
  const propTextClean = (property.rawText || property.description || property.name || "").trim();
  const reqTextClean = (requirement.rawText || requirement.name || "").trim();

  if (propTextClean.length < 8 || reqTextClean.length < 8) {
    blockers.push("Publicación vacía o sin contenido textual legible en una de las partes. Match Inviable (0%).");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  const validPropSpecsCount = (price > 0 || (property.rentPrice && parseFloat(String(property.rentPrice)) > 0) ? 1 : 0) +
                              (propArea > 0 ? 1 : 0) +
                              (pBedrooms > 0 ? 1 : 0) +
                              (pBathrooms > 0 ? 1 : 0) +
                              (pGarages > 0 ? 1 : 0);

  if (validPropSpecsCount < 2) {
    blockers.push("Inmueble incompleto sin datos prediales mínimos en la oferta (menos de 2 atributos especificados). Match Inviable (0%).");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── FILTRO DURO 0B: Teléfono de Contacto Obligatorio (Tolerancia Cero) ──
  const propRealPhone = extractRealPhone(property);
  const reqRealPhone = extractRealPhone(requirement);

  if (!propRealPhone || !reqRealPhone) {
    blockers.push("Match no comercializable: Falta número de teléfono de contacto real en una de las partes.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── FILTRO DURO 0C: Oferta sin precio vs Demanda con Presupuesto Especificado (Tolerancia Cero 0%) ──
  if (budgetMax > 0 && price <= 0 && (!property.rentPrice || parseFloat(String(property.rentPrice)) <= 0)) {
    blockers.push("Match inviable: La oferta NO especifica precio (N/E) y el requerimiento exige presupuesto.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── FILTRO DURO 0D: Completitud de Ficha (Exigir publicaciones con especificaciones ricas) ──
  let reqFilledCount = 0;
  if (reqType) reqFilledCount++;
  if (reqBiz) reqFilledCount++;
  if (reqZone || requirement.ciudadDeseada) reqFilledCount++;
  if (budgetMax > 0) reqFilledCount++;
  if (reqAreaMin > 0) reqFilledCount++;
  if (reqBedrooms > 0) reqFilledCount++;
  if (reqBathrooms > 0) reqFilledCount++;
  if (reqGarages > 0) reqFilledCount++;

  let propFilledCount = 0;
  if (propType) propFilledCount++;
  if (propBiz) propFilledCount++;
  if (propZone || property.addressCity) propFilledCount++;
  if (price > 0 || (property.rentPrice && parseFloat(String(property.rentPrice)) > 0)) propFilledCount++;
  if (propArea > 0) propFilledCount++;
  if (pBedrooms > 0) propFilledCount++;
  if (pBathrooms > 0) propFilledCount++;
  if (pGarages > 0) propFilledCount++;

  if (reqFilledCount < 4 || propFilledCount < 4) {
    blockers.push(`Ficha incompleta (Demanda: ${reqFilledCount}/8 especificaciones, Oferta: ${propFilledCount}/8 especificaciones). Se requieren publicaciones con datos detallados.`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── FILTRO DURO 0E: Incompatibilidad Geográfica Estricta de Ciudad (ya manejado arriba en v22.1) ──
  // (bloque legado reemplazado por reqCityNorm2 para evitar conflicto de variables)
  const reqCityNorm2 = (requirement.ciudadDeseada || requirement.addressCity || requirement.city || requirement.rawText || "").toLowerCase();
  const propCityNorm2 = (property.addressCity || property.city || property.zone || property.rawText || "").toLowerCase();

  const isReqCali = reqCityNorm2.includes("cali");
  const isPropCali = propCityNorm2.includes("cali");
  const isReqBogota = reqCityNorm2.includes("bogota") || reqCityNorm2.includes("bogotá");
  const isPropBogota = propCityNorm2.includes("bogota") || propCityNorm2.includes("bogotá");

  if ((isReqCali && isPropBogota && !isPropCali) || (isReqBogota && isPropCali && !isPropBogota)) {
    blockers.push(`Incompatibilidad geográfica de ciudad: Requerimiento en ${isReqCali ? "Cali" : "Bogotá"} vs Oferta en ${isPropCali ? "Cali" : "Bogotá"}.`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── FILTRO DURO 3: Tipo de inmueble ──
  if (reqType && propType) {
    const aliases: Record<string, string[]> = {
      "apartamento": ["apto", "apartamento", "apartment"],
      "apto":        ["apto", "apartamento", "apartment"],
      "apartment":   ["apto", "apartamento", "apartment"],
      "casa":        ["casa", "chalet", "casa campestre", "house"],
      "house":       ["casa", "chalet", "casa campestre", "house"],
      "finca":       ["finca", "finca raiz", "finca raíz", "farm"],
      "farm":        ["finca", "finca raiz", "finca raíz", "farm"],
      "lote":        ["lote", "terreno", "predio", "land"],
      "terreno":     ["lote", "terreno", "predio", "land"],
      "predio":      ["lote", "terreno", "predio", "land"],
      "land":        ["lote", "terreno", "predio", "land"],
      "bodega":      ["bodega", "bodega industrial", "warehouse"],
      "warehouse":   ["bodega", "bodega industrial", "warehouse"],
      "local":       ["local", "local comercial", "commercial"],
      "commercial":  ["local", "local comercial", "commercial"],
      "oficina":     ["oficina", "consultorio", "office"],
      "office":      ["oficina", "consultorio", "office"],
    };
    const reqAlias  = aliases[reqType]  || [reqType];
    const propAlias = aliases[propType] || [propType];
    if (!reqAlias.some(a => propAlias.includes(a))) {
      blockers.push(`Tipo de activo incompatible: deseado ${reqType}, ofrecido ${propType}`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }

  // Regla estricta: Apartamento vs Apartaestudio vs Loft no coinciden
  const cleanText = (t: string) => (t || "").toLowerCase().trim().replace(/[\s\-_,.]+/g, " ");
  const reqRawText = cleanText(requirement.rawText || requirement.name || "");
  const propRawText = cleanText(property.rawText || property.name || "");
  
  const reqIsStudio = reqRawText.includes("apartaestudio") || reqRawText.includes("aparta estudio");
  const propIsStudio = propRawText.includes("apartaestudio") || propRawText.includes("aparta estudio");
  
  const reqIsLoft = reqRawText.includes("loft") || reqType === "loft";
  const propIsLoft = propRawText.includes("loft") || propType === "loft";

  let reqSubtype = "apartamento_estandar";
  if (reqType === "apartment" || reqType === "apartamento") {
    if (reqIsStudio) reqSubtype = "apartaestudio";
    else if (reqIsLoft) reqSubtype = "loft";
  }

  let propSubtype = "apartamento_estandar";
  if (propType === "apartment" || propType === "apartamento") {
    if (propIsStudio) propSubtype = "apartaestudio";
    else if (propIsLoft) propSubtype = "loft";
  }

  if ((reqType === "apartment" || reqType === "apartamento") && (propType === "apartment" || propType === "apartamento")) {
    if (reqSubtype !== propSubtype) {
      blockers.push(`Subtipo de apartamento incompatible: deseado ${reqSubtype}, ofrecido ${propSubtype}`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }

  positives.push(`Tipo de activo compatible: ${propType}`);

  // ── FILTRO DURO 4: Ubicación / Barrio Estricto (Incluye cuadrante perimetral) ──
  const geoResult = matchesGeography(
    requirement.zonaDeseada || requirement.addressNeighborhood || "",
    property.zone || property.addressNeighborhood || "",
    requirement.addressLocality || "",
    property.addressLocality || "",
    requirement.ciudadDeseada || requirement.city || "",
    property.addressCity || property.city || ""
  );

  if (!geoResult.matches) {
    blockers.push(`Ubicación incompatible: requerida zona '${requirement.zonaDeseada || ""}', ofrecida '${property.zone || ""}'`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  positives.push(`Ubicación compatible en zona: ${property.zone || ""}`);

  // ── FILTRO DURO 5: Estrato ──
  if (reqEstrato >= 1 && pEstrato >= 1 && reqEstrato !== pEstrato) {
    blockers.push(`Estrato incompatible: deseado ${reqEstrato}, ofrecido ${pEstrato}`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── FILTRO DURO 6: Área Mínima (NUNCA MENOR QUE EL SOLICITADO - REGLA CERO MENOR ÁREA) ──────────────────────
  let areaOversize = false;
  if (reqAreaMin > 0) {
    if (propArea > 0) {
      if (propArea < reqAreaMin) {
        blockers.push(`Área ofrecida (${propArea} m²) es INFERIOR al mínimo exigido (${reqAreaMin} m²). Match inviable (0%).`);
        return buildExplanationResult(0, blockers, positives, negatives);
      } else if (propArea > reqAreaMin * 1.15) {
        areaOversize = true;
        positives.push(`✅ Área de ${propArea} m² cumple lo exigido (${reqAreaMin} m²). ⚠️ Inmueble significativamente más grande (+${Math.round((propArea / reqAreaMin - 1) * 100)}%)`);
      } else {
        positives.push(`✅ Área de ${propArea} m² dentro de la campana de confort (${reqAreaMin} m² ±15%)`);
      }
    } else {
      blockers.push(`No se puede verificar el área requerida (${reqAreaMin} m²) por falta de información en la oferta.`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }

  // ── FILTRO DURO 7: Presupuesto Máximo (TOLERANCIA CERO ABSOLUTA EN TECHO FINANCIERO) ──
  if (budgetMax > 0) {
    const isReqRent = reqBiz.includes("arriendo");
    
    if (isReqRent) {
      let propRent = property.rentPrice ? parseFloat(String(property.rentPrice)) : 0;
      if (propRent <= 0 && property.rawText) {
        const rawP = property.rawText.toLowerCase();
        const matchRentP = rawP.match(/(?:arriendo|canon|renta)\s*:?\s*\$?([\d.]+)\s*(millones|millón|m|M)?/i);
        if (matchRentP) {
          let valP = parseFloat(matchRentP[1].replace(/\./g, ""));
          if (!isNaN(valP)) {
            if (valP < 1000) valP *= 1000000;
            propRent = valP;
          }
        }
      }
      if (propRent <= 0 && price > 0 && price < 100000000) {
        propRent = price;
      }
      
      const adminVal = pAdminFee > 0 ? pAdminFee : 0;
      const totalRent = propRent + adminVal;

      if (propRent <= 0 && price > 100000000) {
        blockers.push(`Guillotina Financiera (Tolerancia Cero): La oferta no especifica canon de arriendo y su precio de venta ($${price.toLocaleString()}) no aplica para una búsqueda de arriendo de $${budgetMax.toLocaleString()}`);
        return buildExplanationResult(0, blockers, positives, negatives);
      }

      if (totalRent > budgetMax) {
        blockers.push(`Guillotina Financiera (Tolerancia Cero): Canon de arriendo total ($${totalRent.toLocaleString()}) supera el presupuesto máximo de $${budgetMax.toLocaleString()}`);
        return buildExplanationResult(0, blockers, positives, negatives);
      }

      const reqRentMin = requirement.presupuestoMin ? parseFloat(String(requirement.presupuestoMin)) : 0;
      if (reqRentMin > 0 && totalRent < reqRentMin * 0.85) {
        positives.push(`🔥 Oportunidad Financiera (Ganga): Canon total ($${totalRent.toLocaleString()}) está por debajo del rango mínimo presupuestado ($${reqRentMin.toLocaleString()}).`);
      } else {
        positives.push(`✅ Presupuesto de arriendo cumple: Total $${totalRent.toLocaleString()} (Canon + Admón) <= Máximo $${budgetMax.toLocaleString()}`);
      }
    } else {
      // Para Compras / Ventas:
      let salePrice = price;
      if (salePrice > budgetMax) {
        blockers.push(`Guillotina Financiera (Tolerancia Cero): El precio de la propiedad ($${salePrice.toLocaleString()}) supera el presupuesto máximo del comprador ($${budgetMax.toLocaleString()}). Match inviable (0%).`);
        return buildExplanationResult(0, blockers, positives, negatives);
      }

      if (salePrice < budgetMax * 0.70) {
        blockers.push(`Incompatibilidad de Segmento Comercial: El precio del inmueble ($${salePrice.toLocaleString()}) está más de un 30% por debajo del presupuesto del comprador ($${budgetMax.toLocaleString()}). Inmueble de categoría o segmento inferior no apto para la demanda.`);
        return buildExplanationResult(0, blockers, positives, negatives);
      }
    }
  }

  // ── INFERENCIA DE ESPECIFICACIONES MÍNIMAS EN LA DEMANDA DESDE RAWTEXT ──
  let effectiveReqBeds = reqBedrooms;
  if (effectiveReqBeds <= 0) {
    const mB = reqTextLow.match(/(\d+(?:\s*-\s*\d+)?)\s*(?:hab|habitaciones|alcoba|alcobas|alc|dormitorio)/i);
    if (mB) effectiveReqBeds = parseInt(mB[1].split("-")[0].trim(), 10);
  }

  let effectiveReqBaths = reqBathrooms;
  if (effectiveReqBaths <= 0) {
    const mW = reqTextLow.match(/(\d+(?:\.\d+)?)\s*(?:o\s*más\s*)?(?:wc|baño|baños|bñ)/i)
            || reqTextLow.match(/(\d+)\s*hab\s*con\s*baño/i);
    if (mW) effectiveReqBaths = parseFloat(mW[1]);
  }

  let effectiveReqGarages = reqGarages;
  if (effectiveReqGarages <= 0) {
    const mG = reqTextLow.match(/(?:parqueadero|parqueaderos|garaje|garajes|ptero|g\.)\s*\.?\s*(\d+)/i)
            || reqTextLow.match(/(\d+)\s*(?:parqueadero|parqueaderos|garaje|garajes|ptero|g\.|individuales)/i);
    if (mG) effectiveReqGarages = parseInt(mG[1], 10);
  }

  // ── FILTRO DE ADMINISTRACIÓN MÁXIMA (GUILLOTINA ADMIN) ──
  const reqAdminMaxVal = requirement.adminFeeMax ? parseFloat(String(requirement.adminFeeMax)) : 0;
  if (reqAdminMaxVal > 0 && pAdminFee > 0 && pAdminFee > reqAdminMaxVal) {
    blockers.push(`Guillotina Financiera (Administración): Cuota de administración de $${pAdminFee.toLocaleString()} supera el máximo aceptado de $${reqAdminMaxVal.toLocaleString()}`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  const propRawTextLower = (property.rawText || property.description || "").toLowerCase();

  // ── FILTRO DURO 8: Habitaciones Mínimas (REGLA DOCTRINAL v22.4: Oferta < Demanda = BLOQUEO 0%) ──
  if (effectiveReqBeds > 0) {
    if (pBedrooms >= 0) {
      if (pBedrooms < effectiveReqBeds) {
        blockers.push(`Atributo Fallido (Habitaciones): Ofrecidas (${pBedrooms}) son inferiores a las exigidas (${effectiveReqBeds}). Match Inviable (0%).`);
        return buildExplanationResult(0, blockers, positives, negatives);
      } else {
        positives.push(`Habitaciones ofrecidas (${pBedrooms}) iguales o superiores a las exigidas (${effectiveReqBeds}) — Cumplimiento Confort`);
      }
    } else {
      blockers.push(`No se pueden verificar las habitaciones requeridas (${effectiveReqBeds}) por falta de información en la oferta.`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }

  // ── FILTRO DURO 9: Baños Mínimos (REGLA DOCTRINAL v22.4: Oferta < Demanda = BLOQUEO 0%) ──
  if (effectiveReqBaths > 0) {
    if (pBathrooms >= 0) {
      if (pBathrooms < effectiveReqBaths) {
        blockers.push(`Atributo Fallido (Baños): Ofrecidos (${pBathrooms}) son inferiores a los requeridos (${effectiveReqBaths}). Match Inviable (0%).`);
        return buildExplanationResult(0, blockers, positives, negatives);
      } else {
        positives.push(`Baños ofrecidos (${pBathrooms}) iguales o superiores a los requeridos (${effectiveReqBaths}) — Cumplimiento Confort`);
      }
    } else {
      blockers.push(`No se pueden verificar los baños requeridos (${effectiveReqBaths}) por falta de información en la oferta.`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }

  // ── FILTRO DURO 10: Parqueaderos Mínimos (REGLA DOCTRINAL v22.4: Oferta < Demanda = BLOQUEO 0%) ──
  if (effectiveReqGarages > 0) {
    if (pGarages >= 0) {
      if (pGarages < effectiveReqGarages) {
        blockers.push(`Atributo Fallido (Parqueaderos): Ofrecidos (${pGarages}) son inferiores a los requeridos (${effectiveReqGarages}). Match Inviable (0%).`);
        return buildExplanationResult(0, blockers, positives, negatives);
      } else {
        positives.push(`Parqueaderos ofrecidos (${pGarages}) iguales o superiores a los requeridos (${effectiveReqGarages}) — Cumplimiento Confort`);
      }
    } else {
      blockers.push(`No se pueden verificar los parqueaderos requeridos (${effectiveReqGarages}) por falta de información en la oferta.`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }

  // ── FILTRO DURO 10B: Depósitos Mínimos (REGLA DOCTRINAL v22.4: Oferta < Demanda = BLOQUEO 0%) ──
  let effectiveReqDeposits = 0;
  if (requirement.hasStorage || reqTextLow.includes("con deposito") || reqTextLow.includes("con depósito") || reqTextLow.includes("exige deposito") || reqTextLow.includes("exige depósito") || reqTextLow.includes("bodega")) {
    const mDep = reqTextLow.match(/(\d+)\s*(?:depósito|depósitos|deposito|depositos|bodega|bodegas)/i);
    effectiveReqDeposits = mDep ? parseInt(mDep[1], 10) : 1;
  }

  let propDeposits = 0;
  if (property.hasStorage || propRawTextLower.includes("deposito") || propRawTextLower.includes("depósito") || propRawTextLower.includes("bodega")) {
    const mPropDep = propRawTextLower.match(/(\d+)\s*(?:depósito|depósitos|deposito|depositos|bodega|bodegas)/i);
    propDeposits = mPropDep ? parseInt(mPropDep[1], 10) : (property.storageUnits ? Number(property.storageUnits) : 1);
  }
  if (propRawTextLower.includes("sin deposito") || propRawTextLower.includes("sin depósito") || propRawTextLower.includes("no tiene deposito") || propRawTextLower.includes("no tiene depósito")) {
    propDeposits = 0;
  }

  if (effectiveReqDeposits > 0) {
    if (propDeposits < effectiveReqDeposits) {
      blockers.push(`Atributo Fallido (Depósitos): Depósitos/bodegas ofrecidos (${propDeposits}) son inferiores a los exigidos (${effectiveReqDeposits}). Match Inviable (0%).`);
      return buildExplanationResult(0, blockers, positives, negatives);
    } else {
      positives.push(`Depósitos ofrecidos (${propDeposits}) iguales o superiores a los exigidos (${effectiveReqDeposits}) — Cumplimiento Confort`);
    }
  }

  // ── FILTRO DURO 10C: Balcones Mínimos (REGLA DOCTRINAL v22.4: Oferta < Demanda = BLOQUEO 0%) ──
  let effectiveReqBalconies = 0;
  if (requirement.hasBalcony || reqTextLow.includes("con balcon") || reqTextLow.includes("con balcón") || reqTextLow.includes("exige balcon") || reqTextLow.includes("exige balcón") || reqTextLow.includes("balcones")) {
    const mBal = reqTextLow.match(/(\d+)\s*(?:balcón|balcones|balcon)/i);
    effectiveReqBalconies = mBal ? parseInt(mBal[1], 10) : 1;
  }

  let propBalconies = 0;
  if (property.hasBalcony || propRawTextLower.includes("balcon") || propRawTextLower.includes("balcón") || propRawTextLower.includes("balcones")) {
    const mPropBal = propRawTextLower.match(/(\d+)\s*(?:balcón|balcones|balcon)/i);
    propBalconies = mPropBal ? parseInt(mPropBal[1], 10) : (property.balconies ? Number(property.balconies) : 1);
  }
  if (propRawTextLower.includes("sin balcon") || propRawTextLower.includes("sin balcón") || propRawTextLower.includes("no tiene balcon") || propRawTextLower.includes("no tiene balcón")) {
    propBalconies = 0;
  }

  if (effectiveReqBalconies > 0) {
    if (propBalconies < effectiveReqBalconies) {
      blockers.push(`Atributo Fallido (Balcones): Balcones ofrecidos (${propBalconies}) son inferiores a los exigidos (${effectiveReqBalconies}). Match Inviable (0%).`);
      return buildExplanationResult(0, blockers, positives, negatives);
    } else {
      positives.push(`Balcones ofrecidos (${propBalconies}) iguales o superiores a los exigidos (${effectiveReqBalconies}) — Cumplimiento Confort`);
    }
  }

  // ── FILTRO DURO 10D: Terrazas Mínimas (REGLA DOCTRINAL v22.4: Oferta < Demanda = BLOQUEO 0%) ──
  let effectiveReqTerraces = 0;
  if (requirement.hasTerrace || reqTextLow.includes("con terraza") || reqTextLow.includes("exige terraza") || reqTextLow.includes("terrazas")) {
    const mTer = reqTextLow.match(/(\d+)\s*(?:terraza|terrazas)/i);
    effectiveReqTerraces = mTer ? parseInt(mTer[1], 10) : 1;
  }

  let propTerraces = 0;
  if (property.hasTerrace || propRawTextLower.includes("terraza") || propRawTextLower.includes("terrazas")) {
    const mPropTer = propRawTextLower.match(/(\d+)\s*(?:terraza|terrazas)/i);
    propTerraces = mPropTer ? parseInt(mPropTer[1], 10) : (property.terraces ? Number(property.terraces) : 1);
  }
  if (propRawTextLower.includes("sin terraza") || propRawTextLower.includes("no tiene terraza")) {
    propTerraces = 0;
  }

  if (effectiveReqTerraces > 0) {
    if (propTerraces < effectiveReqTerraces) {
      blockers.push(`Atributo Fallido (Terrazas): Terrazas ofrecidas (${propTerraces}) son inferiores a las exigidas (${effectiveReqTerraces}). Match Inviable (0%).`);
      return buildExplanationResult(0, blockers, positives, negatives);
    } else {
      positives.push(`Terrazas ofrecidas (${propTerraces}) iguales o superiores a las exigidas (${effectiveReqTerraces}) — Cumplimiento Confort`);
    }
  }

  // ── FILTRO DURO 11 v20.0: Matriz de Intencionalidad Humana (Bloqueos por Choque de Intención) ──
  const reqRawTextLower = (requirement.rawText || "").toLowerCase();

  // A. Choque de Permuta ("NO PERMUTA" vs "ENTREGO CARRO / PARTE DE PAGO")
  const propRejectsPermute = propRawTextLower.includes("no permuta") || 
                             propRawTextLower.includes("sin permuta") || 
                             propRawTextLower.includes("solo efectivo") || 
                             propRawTextLower.includes("no se acepta permuta") ||
                             propRawTextLower.includes("no se reciben vehiculos");

  const reqOffersTradeIn = requirement.tipoNegocioDeseado === "permuta" || 
                           reqRawTextLower.includes("entrego carro") || 
                           reqRawTextLower.includes("doy carro") || 
                           reqRawTextLower.includes("recibo vehiculo") || 
                           reqRawTextLower.includes("parte de pago") || 
                           reqRawTextLower.includes("pelo a pelo");

  if (propRejectsPermute && reqOffersTradeIn) {
    blockers.push("Choque de Intención Negocial: La oferta especifica 'NO PERMUTA / Solo Efectivo' y la demanda busca entregar vehículo u otro bien en parte de pago.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // B. Choque de Calidad de Vida (Exige "Silencioso / Sin Vías Principales" vs "Sobre Vía Principal / Ruidoso")
  const reqDemandsQuiet = reqRawTextLower.includes("silencioso") || 
                          reqRawTextLower.includes("tranquilo") || 
                          reqRawTextLower.includes("nada sobre vias principales") || 
                          reqRawTextLower.includes("sin vias principales") || 
                          reqRawTextLower.includes("no vias principales") || 
                          reqRawTextLower.includes("sin ruido");

  const propIsMainRoadNoise = propRawTextLower.includes("sobre avenida") || 
                              propRawTextLower.includes("via principal") || 
                              propRawTextLower.includes("frente a avenida") || 
                              propRawTextLower.includes("zona de alto trafico") || 
                              propRawTextLower.includes("zona ruidosa");

  if (reqDemandsQuiet && propIsMainRoadNoise) {
    blockers.push("Choque de Calidad de Vida: El comprador exige inmueble silencioso sin vías principales y la oferta está situada sobre vía principal o zona ruidosa.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  // Auditoría de tipo de garaje (independiente vs lineal) v20.0
  const propGarageType = (property.garageType || "").toLowerCase();
  const reqGarageTypeRaw = (requirement.rawText || "").toLowerCase();
  const reqWantsIndependent = reqGarageTypeRaw.includes("independiente") || reqGarageTypeRaw.includes("libre") || reqGarageTypeRaw.includes("no lineal");
  
  let garageComfortPenalty = 0;
  if (reqGarages > 0 && pGarages >= reqGarages) {
    if (reqWantsIndependent && propGarageType === "lineal") {
      garageComfortPenalty = 1; // Castigo duro: -30 pts
      negatives.push(`⚠️ Parqueadero(s) ofrecidos son LINEALES (servidumbre). El demandante exige ESTRICTAMENTE independientes (-30 pts).`);
    } else if (propGarageType === "independiente" && pGarages > reqGarages) {
      garageComfortPenalty = 2; // bono de excedente independiente
      positives.push(`✅ Excedente de parqueaderos independientes (${pGarages} ofrecidos vs ${reqGarages} requeridos) — Bono de confort`);
    } else if (propGarageType === "lineal" && pGarages >= reqGarages) {
      negatives.push(`ℹ️ Parqueadero(s) lineales/servidumbre — requiere mover vehículos para acceder.`);
    }
  }

  // Auditoría de Confort Técnico (Luz y Ventilación Natural)
  const reqWantsLightAir = reqGarageTypeRaw.includes("luz natural") || 
                            reqGarageTypeRaw.includes("ventilacion natural") || 
                            reqGarageTypeRaw.includes("vista panoramica") || 
                            reqGarageTypeRaw.includes("iluminacion");

  const propHasLightAir = propRawTextLower.includes("luz natural") || 
                          propRawTextLower.includes("ventilacion natural") || 
                          propRawTextLower.includes("vista panoramica") || 
                          propRawTextLower.includes("iluminado") || 
                          propRawTextLower.includes("exterior");

  let lightAirBonus = false;
  if (reqWantsLightAir && propHasLightAir) {
    lightAirBonus = true;
    positives.push(`✨ Confort Técnico Coincidente: Inmueble con luz/ventilación natural y vista privilegiada (+15 pts)`);
  }

  // ── PONDERACIÓN v20.0: Compatibilidad Humana de Alta Inferencia ──────────────
  // Distribución de 100 pts:
  //   Tipo Inmueble  15 | Tipo Negocio 15 | Ubicación 20 | Presupuesto 15
  //   Área           10 | Habitaciones 10 | Baños      4  | Parqueaderos 4
  //   Estrato         3 | Antigüedad   4  = 100 ✅
  let earnedPoints = 0;
  const totalPossible = 100;

  // 1. Tipo Inmueble (15 pts) — pasó filtro duro
  earnedPoints += 15;

  // 2. Tipo Negocio (15 pts) — pasó filtro duro
  earnedPoints += 15;

  // 3. Ubicación (20 pts)
  earnedPoints += Math.round((geoResult.score / 25) * 20);

  // 4. Presupuesto (15 pts) — bifurcado por tipo de negocio
  const reqBizForScore = reqBiz.toLowerCase();
  const isReqRentForScore = reqBizForScore.includes("arriendo");
  const isReqSaleForScore = reqBizForScore.includes("venta") || reqBizForScore.includes("permuta");

  let effectivePrice = price;
  if (isReqRentForScore) {
    const rp = property.rentPrice ? parseFloat(String(property.rentPrice)) : 0;
    if (rp > 0) effectivePrice = rp;
    else if (price > 0 && price < 100_000_000) effectivePrice = price;
  } else if (isReqSaleForScore && propBiz === "venta_o_arriendo" && price > 0 && price < 100_000_000) {
    effectivePrice = 0; // price tiene valor de arriendo, no de venta → 0 pts
  }

  if (budgetMax > 0) {
    if (effectivePrice > 0) {
      if (effectivePrice < budgetMax) {
        earnedPoints += 15;
        positives.push(`💰 Oportunidad: precio $${effectivePrice.toLocaleString()} por debajo del presupuesto $${budgetMax.toLocaleString()}`);
      } else if (effectivePrice === budgetMax)             earnedPoints += 15;
      else if (effectivePrice <= budgetMax * 1.01) earnedPoints += 13;
      else if (effectivePrice <= budgetMax * 1.05) earnedPoints += 9;
      else negatives.push(`Precio $${effectivePrice.toLocaleString()} supera presupuesto $${budgetMax.toLocaleString()}`);
    } else {
      negatives.push("Presupuesto no especificado en la oferta (N/E)");
    }
  } else {
    earnedPoints += 10; // sin restricción de presupuesto → crédito neutral
  }

  // 5. Área v20.0 — Campana de Tolerancia (10 pts)
  if (reqAreaMin > 0) {
    if (propArea > 0) {
      if (propArea >= reqAreaMin && !areaOversize)       earnedPoints += 10; // Zona confort exacta
      else if (areaOversize)                             earnedPoints += 10; // Más grande: pasa completo + advertencia ya registrada
      else if (propArea >= reqAreaMin * 0.95)            earnedPoints += 6;  // Zona gris [-5%, 0%)
      // Si < 0.95 ya fue bloqueado arriba
    } else {
      negatives.push("Área no especificada en la oferta (N/E)");
    }
  } else {
    earnedPoints += 7; // demanda sin restricción de área → crédito neutral
  }

  // 6. Habitaciones (10 pts)
  if (reqBedrooms > 0) {
    if (pBedrooms >= 0) {
      if (pBedrooms >= reqBedrooms)     earnedPoints += 10;
      else negatives.push(`Habitaciones (${pBedrooms}) inferiores a las requeridas (${reqBedrooms})`);
    } else {
      negatives.push("Habitaciones no especificadas en la oferta (N/E)");
    }
  } else {
    earnedPoints += 7; // sin restricción → crédito neutral
  }

  // 7. Baños (4 pts — redistribuido desde 5)
  if (reqBathrooms > 0) {
    if (pBathrooms >= 0) {
      if (pBathrooms >= reqBathrooms)   earnedPoints += 4;
      else negatives.push(`Baños (${pBathrooms}) inferiores a los requeridos (${reqBathrooms})`);
    } else {
      negatives.push("Baños no especificados en la oferta (N/E)");
    }
  } else {
    earnedPoints += 3; // crédito neutral
  }

  // 8. Parqueaderos v20.0 — Auditoría de Confort (4 pts — redistribuido desde 5)
  if (reqGarages > 0) {
    if (pGarages >= 0) {
      if (pGarages >= reqGarages) {
        if (garageComfortPenalty === 1) {
          // Parqueaderos lineales cuando se piden independientes → 40% del atributo
          earnedPoints += Math.round(4 * 0.40);
        } else if (garageComfortPenalty === 2) {
          // Excedente de independientes → 4 pts + bono de confort (ya contabilizado en positives)
          earnedPoints += 4;
        } else {
          earnedPoints += 4;
        }
      } else {
        negatives.push(`Parqueaderos (${pGarages}) inferiores a los requeridos (${reqGarages})`);
      }
    } else {
      negatives.push("Parqueaderos no especificados en la oferta (N/E)");
    }
  } else {
    earnedPoints += 3; // crédito neutral
  }

  // 9. Estrato (3 pts — redistribuido para dar espacio a antigüedad)
  if (reqEstrato >= 1 && pEstrato >= 1) {
    if (reqEstrato === pEstrato) earnedPoints += 3;
    // Si no coincide ya lo bloqueó el filtro duro anterior
  } else {
    earnedPoints += 2; // crédito neutral
  }

  // 10. Antigüedad / Año de Construcción (4 pts) ─────────────────
  let reqAntiguedadMax = requirement.antiguedadMax != null ? Number(requirement.antiguedadMax) : -1;
  if (reqAntiguedadMax < 0 && requirement.rawText) {
    const mAntig = requirement.rawText.toLowerCase().match(/(?:máximo|max|hasta)\s*(\d{1,2})\s*años?\s*(?:de\s*)?(?:construido|construccion|construcción|antigüedad|antiguedad)?/i)
                || requirement.rawText.toLowerCase().match(/(\d{1,2})\s*años?\s*(?:de\s*)?(?:construido|antigüedad)/i);
    if (mAntig) {
      reqAntiguedadMax = parseInt(mAntig[1], 10);
    }
  }

  const propAntiguedadAnos = property.antiguedadAnos != null ? Number(property.antiguedadAnos) : -1;
  const propYearBuilt = property.yearBuilt != null ? Number(property.yearBuilt) : -1;

  let propAge = propAntiguedadAnos;
  if (propAge < 0 && propYearBuilt > 0) {
    propAge = new Date().getFullYear() - propYearBuilt;
  }
  if (propAge < 0 && property.rawText) {
    const mPropAge = property.rawText.toLowerCase().match(/(?:edificio\s*de|antigüedad|antiguedad|tiene)\s*(\d{1,2})\s*años/i)
                  || property.rawText.toLowerCase().match(/(\d{1,2})\s*años\s*(?:de\s*)?(?:antigüedad|construido)/i);
    if (mPropAge) {
      propAge = parseInt(mPropAge[1], 10);
    }
  }

  if (reqAntiguedadMax >= 0 && propAge >= 0) {
    if (propAge <= reqAntiguedadMax) {
      earnedPoints += 4;
      positives.push(`✅ Antigüedad: ${propAge} años (máximo pedido: ${reqAntiguedadMax} años)`);
    } else {
      blockers.push(`Antigüedad del inmueble (${propAge} años) SUPERA el máximo exigido de (${reqAntiguedadMax} años). Match inviable (0%).`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  } else if (reqAntiguedadMax < 0 && propAge >= 0) {
    earnedPoints += 3;
    if (propAge > 0) positives.push(`ℹ️ Antigüedad de la oferta: ${propAge} años (sin restricción por la demanda)`);
  } else {
    earnedPoints += 2;
  }

  // 10. Intersección Semántica de Comodidades (Vestier 100%, Balcón/Terraza 70%, Entorno 100%/80%)
  const semRes = evaluarInterseccionComodidadesSemanticas(requirement, property);
  if (semRes.positives.length > 0) {
    positives.push(...semRes.positives);
  }

  // Aplicación de Pesos de Afinidad Profunda (v20.0 Big Tech Weights)
  if (garageComfortPenalty === 1) {
    earnedPoints -= 30; // Castigo duro por servidumbre (-30 pts)
  }
  if (lightAirBonus) {
    earnedPoints += 15; // Bono de confort por luz/ventilación (+15 pts)
  }

  // Total: max 100 pts
  let finalPercentage = Math.max(0, Math.min(100, Math.round((earnedPoints / totalPossible) * 100)));

  // REGLA CRÍTICA DOCTRINAL VECY (v17.4):
  // Un MATCH del 100% se otorga EXCLUSIVAMENTE si TODOS los campos solicitados
  // por la demanda están presentes en la oferta y coinciden plenamente.
  // Cualquier campo N/E cuando el requerimiento SÍ lo especifica → máximo 84%.
  const hasMissingSpecifiedFields = (reqAreaMin > 0 && propArea <= 0) ||
                                    (reqBedrooms > 0 && pBedrooms < 0) ||
                                    (reqBathrooms > 0 && pBathrooms < 0) ||
                                    (reqGarages > 0 && pGarages < 0) ||
                                    (budgetMax > 0 && price <= 0) ||
                                    (reqZone && (!propZone || propZone === "bogota"));

  if (hasMissingSpecifiedFields) {
    finalPercentage = Math.min(84, finalPercentage);
  }

  return buildExplanationResult(finalPercentage, blockers, positives, negatives, isStrictCompliant, missingFieldsList);
}

export interface SemanticAmenitiesResult {
  vestierScore: number;       // 0 a 1.0 (100% coincidencia exacta, ej. Vestier vs Walk-in-closet)
  balconTerrasaScore: number; // 0 a 1.0 (1.0 exacta, 0.70 parcial por analogía espacio abierto)
  entornoScore: number;       // 0 a 1.0 (1.0 exterior frente a parque / vista verde, 0.80 interior silencioso)
  positives: string[];
}

/**
 * Matriz de Intersección Semántica de Comodidades (v17.9)
 * Evalúa la equivalencia entre Vestier ↔ Walk-in-closet, Balcón ↔ Terraza y Entorno.
 */
export function evaluarInterseccionComodidadesSemanticas(req: any, prop: any): SemanticAmenitiesResult {
  const reqText = `${req.rawText || ""} ${req.description || ""}`.toLowerCase();
  const propText = `${prop.rawText || ""} ${prop.description || ""}`.toLowerCase();

  const positives: string[] = [];

  // 1. CRUCE VESTIER / WALK-IN CLOSET (100% Coincidencia Exacta)
  const reqHasVestier = req.hasWalkInCloset || reqText.includes("vestier") || reqText.includes("walk") || reqText.includes("closet");
  const propHasVestier = prop.hasWalkInCloset || propText.includes("vestier") || propText.includes("walk") || propText.includes("closet");
  
  let vestierScore = 0;
  if (reqHasVestier && propHasVestier) {
    vestierScore = 1.0; // 100% de puntos
    positives.push("Homologación Semántica: Coincidencia Exacta entre Vestier y Walk-in Closet (100%)");
  }

  // 2. CRUCE BALCÓN / TERRAZA (100% Exacto si coinciden, 70% Parcial por analogía espacio abierto)
  const reqHasBalcony = req.hasBalcony || reqText.includes("balcon") || reqText.includes("balcón");
  const reqHasTerrace = req.hasTerrace || reqText.includes("terraza") || reqText.includes("patio");
  const propHasBalcony = prop.hasBalcony || propText.includes("balcon") || propText.includes("balcón");
  const propHasTerrace = prop.hasTerrace || propText.includes("terraza") || propText.includes("patio");

  let balconTerrasaScore = 0;
  if (reqHasBalcony && propHasBalcony) {
    balconTerrasaScore = 1.0; // Exacta 100%
    positives.push("Coincidencia Exacta de Balcón (100%)");
  } else if (reqHasTerrace && propHasTerrace) {
    balconTerrasaScore = 1.0; // Exacta 100%
    positives.push("Coincidencia Exacta de Terraza (100%)");
  } else if ((reqHasBalcony && propHasTerrace) || (reqHasTerrace && propHasBalcony)) {
    balconTerrasaScore = 0.70; // Analogía 70%
    positives.push("Homologación Semántica: Coincidencia Parcial por Analogía de Espacio Abierto (Balcón ↔ Terraza 70%)");
  }

  // 3. CRUCE DE ENTORNO Y ESTILO DE VIDA (Vista verde / Silencioso / Exterior / Interior)
  const reqWantsGreen = reqText.includes("vista verde") || reqText.includes("parque") || reqText.includes("cerros") || reqText.includes("tranquilo");
  const propIsParkFront = propText.includes("vista verde") || propText.includes("frente a parque") || propText.includes("exterior");
  const propIsSilentInterior = propText.includes("interior") || propText.includes("silencioso");

  let entornoScore = 0;
  if (reqWantsGreen && propIsParkFront) {
    entornoScore = 1.0; // 100%
    positives.push("Entorno: Coincidencia Exacta Vista Verde / Exterior frente a Parque (100%)");
  } else if (reqWantsGreen && propIsSilentInterior) {
    entornoScore = 0.80; // 80%
    positives.push("Entorno: Coincidencia Parcial Vista Verde ↔ Interior Silencioso (80%)");
  }

  return { vestierScore, balconTerrasaScore, entornoScore, positives };
}

export function calcularScoreMatch(requirement: any, property: any): number {
  return explicarMatch(requirement, property).score;
}

export function evaluarMatch(requirement: any, property: any): boolean {
  return calcularScoreMatch(requirement, property) >= 80;
}

/**
 * Busca requerimientos que hagan match con un inmueble recién publicado.
 */
export async function findMatchesForProperty(propertyId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const [property] = await db.select().from(properties).where(eq(properties.id, propertyId));
    if (!property) return [];

    // Carga requerimientos activos en la misma ciudad para pre-filtrado rápido (Guillotina Capa 2 - Addendum v7)
    const activeRequirements = await db
      .select()
      .from(requirements)
      .where(
        and(
          eq(requirements.status, "active"),
          sql`LOWER(${requirements.ciudadDeseada}) = LOWER(${property.city || 'Bogotá'})`
        )
      );

    const validMatches = [];

    for (const req of activeRequirements) {
      const explanation = explicarMatch(req, property);
      const score = explanation.score;
      if (score >= 80) {
        let matchId: number;
        const existing = await db.select().from(propertyMatches).where(
          and(
            eq(propertyMatches.propertyId, propertyId),
            eq(propertyMatches.requirementId, req.id)
          )
        ).limit(1);
        const ipcObj = calcularIPC(req, property, score);
        explanation.ipc = ipcObj;
        if (existing.length > 0) {
          matchId = existing[0].id;
          await db.update(propertyMatches).set({
            matchScore: score.toFixed(2),
            matchExplanation: explanation,
            ipc: ipcObj,
            createdAt: new Date()
          }).where(eq(propertyMatches.id, matchId));
        } else {
          const [newMatch] = await db.insert(propertyMatches).values({
            propertyId: propertyId,
            requirementId: req.id,
            matchScore: score.toFixed(2),
            matchReason: `VECY CORE TS Scoring: ${score.toFixed(2)}/100`,
            matchExplanation: explanation,
            ipc: ipcObj,
            status: "suggested",
            ownerConfirmed: false,
            seekerConfirmed: false,
          }).returning();
          matchId = newMatch.id;
          // Emitir evento de dominio desacoplado
          vrifEvents.emit("match:created", matchId);
        }

        validMatches.push({
          ...req,
          score: score,
          matchId: matchId,
          idUsuarioWhatsapp: req.idUsuarioWhatsapp,
        });
      }
    }

    console.log(`[Matching] Inmueble #${propertyId}: ${validMatches.length} matches detectados.`);
    return validMatches;
  } catch (e: any) {
    console.error("[Matching] Error en findMatchesForProperty:", e.message);
    return [];
  }
}

/**
 * Busca inmuebles que hagan match con un requerimiento recién publicado.
 */
export async function findMatchesForRequirement(requirementId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const [req] = await db.select().from(requirements).where(eq(requirements.id, requirementId));
    if (!req) return [];

    // Carga inmuebles disponibles en la misma ciudad para pre-filtrado rápido (Guillotina Capa 2 - Addendum v7)
    const availableProperties = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.available, true),
          sql`LOWER(${properties.city}) = LOWER(${req.ciudadDeseada || 'Bogotá'})`
        )
      );

    const validMatches = [];

    for (const prop of availableProperties) {
      const explanation = explicarMatch(req, prop);
      const score = explanation.score;
      if (score >= 80) {
        let matchId: number;
        const existing = await db.select().from(propertyMatches).where(
          and(
            eq(propertyMatches.propertyId, prop.id),
            eq(propertyMatches.requirementId, requirementId)
          )
        ).limit(1);
        const ipcObj = calcularIPC(req, prop, score);
        explanation.ipc = ipcObj;
        if (existing.length > 0) {
          matchId = existing[0].id;
          await db.update(propertyMatches).set({
            matchScore: score.toFixed(2),
            matchExplanation: explanation,
            ipc: ipcObj,
            createdAt: new Date()
          }).where(eq(propertyMatches.id, matchId));
        } else {
          const [newMatch] = await db.insert(propertyMatches).values({
            propertyId: prop.id,
            requirementId: requirementId,
            matchScore: score.toFixed(2),
            matchReason: `VECY CORE TS Scoring: ${score.toFixed(2)}/100`,
            matchExplanation: explanation,
            ipc: ipcObj,
            status: "suggested",
            ownerConfirmed: false,
            seekerConfirmed: false,
          }).returning();
          matchId = newMatch.id;
          // Emitir evento de dominio desacoplado
          vrifEvents.emit("match:created", matchId);
        }

        validMatches.push({
          ...prop,
          score: score,
          matchId: matchId,
          idUsuarioWhatsapp: prop.idUsuarioWhatsapp,
        });
      }
    }

    console.log(`[Matching] Requerimiento #${requirementId}: ${validMatches.length} matches detectados.`);
    return validMatches;
  } catch (e: any) {
    console.error("[Matching] Error en findMatchesForRequirement:", e.message);
    return [];
  }
}

/**
 * MÓDULO 5 & MÓDULO 6: Motor de Match Real y Alertas Directas y Confidenciales a Socios
 * Reglas estrictas de Eduardo: mismo tipo, mismo barrio/ciudad, área ±10%, precio+admin dentro del presupuesto, mismas habitaciones.
 */
export async function executeMatchEngine(propertyId: number | null, requirementId: number | null): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    if (!propertyId && !requirementId) {
      console.log(`[MATCHING-FULL] 🚀 Recalculando matches para TODAS las propiedades activas en DB...`);
      const activeProps = await db.select({ id: properties.id }).from(properties).where(eq(properties.available, true));
      let totalMatches = 0;
      for (const p of activeProps) {
        const matches = await findMatchesForProperty(p.id);
        totalMatches += matches.length;
      }
      console.log(`[MATCHING-FULL] ✅ Recálculo completo finalizado. ${activeProps.length} propiedades evaluadas, ${totalMatches} matches registrados/actualizados.`);
      return;
    }

    if (requirementId) {
      console.log(`[MATCHING-RPC] ⚡ Ejecutando RPC Supabase para Requerimiento #${requirementId}...`);
      const matchRows: any[] = await db.execute(
        sql`SELECT * FROM match_properties_for_requirement(${requirementId}, 80.0)`
      ) as any[];
      let insertedCount = 0;
      for (const m of matchRows) {
        await db.insert(propertyMatches).values({
          propertyId: m.property_id,
          requirementId: requirementId,
          matchScore: String(m.match_score),
          matchReason: m.match_reason || `RPC v21.21 score=${m.match_score}`,
          status: "suggested",
          ownerConfirmed: false,
          seekerConfirmed: false,
          createdAt: new Date(),
        }).onConflictDoNothing();
        insertedCount++;
        if (Number(m.match_score) >= 85) {
          sendDirectAlertToAdmins(
            `🚀 *VECY INTEL: Match #${m.property_id}↔${requirementId} (${m.match_score}%)*\n🏠 Propiedad: ${m.property_name || m.property_id} (${m.property_city || ''})\n💰 Precio: $${Number(m.property_price || 0).toLocaleString('es-CO')}\n👉 Ver en panel: https://vecy-network.vercel.app/admin`
          ).catch(() => {});
        }
      }
      console.log(`[MATCHING-RPC] ✅ ${insertedCount} matches registrados en Supabase para Requerimiento #${requirementId}.`);
    } else if (propertyId) {
      console.log(`[MATCHING-RPC] ⚡ Ejecutando RPC Supabase para Propiedad #${propertyId}...`);
      const matchRows: any[] = await db.execute(
        sql`SELECT * FROM match_requirements_for_property(${propertyId}, 80.0)`
      ) as any[];
      let insertedCount = 0;
      for (const m of matchRows) {
        await db.insert(propertyMatches).values({
          propertyId: propertyId,
          requirementId: m.requirement_id,
          matchScore: String(m.match_score),
          matchReason: m.match_reason || `RPC v21.21 score=${m.match_score}`,
          status: "suggested",
          ownerConfirmed: false,
          seekerConfirmed: false,
          createdAt: new Date(),
        }).onConflictDoNothing();
        insertedCount++;
        if (Number(m.match_score) >= 85) {
          sendDirectAlertToAdmins(
            `🚀 *VECY INTEL: Match #${propertyId}↔${m.requirement_id} (${m.match_score}%)*\n👉 Ver en panel: https://vecy-network.vercel.app/admin`
          ).catch(() => {});
        }
      }
      console.log(`[MATCHING-RPC] ✅ ${insertedCount} matches registrados en Supabase para Propiedad #${propertyId}.`);
    }
  } catch (err: any) {
    console.error(`[MATCHING-RPC-ERROR] Error ejecutando RPC:`, err?.message || err);
  }
}

async function sendDirectAlertToAdmins(message: string): Promise<void> {
  // Notificaciones de Match a WhatsApp desactivadas por preferencia del usuario.
  // Los matches se registran exclusivamente en Supabase y se visualizan en el Panel Web Admin.
  console.log(`[Matching-Notification-Disabled] Match registrado en DB (alerta WhatsApp desactivada por usuario).`);
  return;
}

/**
 * Genera el Reporte de Inteligencia de Negocio Big Tech (v20.0 Concierge)
 * Se envía exclusivamente a Eduardo y Jani (+573192919978 / +573188096811).
 */
export function buildBigTechAdminReport(prop: any, req: any, score: number): string {
  const formatCOP = (val: any) => {
    const num = parseFloat(String(val));
    if (isNaN(num) || num === 0) return "N/E";
    return `$${num.toLocaleString('es-CO')}`;
  };

  const propPriceStr = prop.price ? formatCOP(prop.price) : "N/E";
  const reqBudgetStr = req.presupuestoMax ? formatCOP(req.presupuestoMax) : "N/E";

  const propBroker = (prop.idUsuarioWhatsapp || 'Captador').replace(/\D/g, "");
  const reqBroker = (req.idUsuarioWhatsapp || 'Requiriente').replace(/\D/g, "");

  let intentReason = `El cliente busca inmueble en ${req.zonaDeseada || prop.zone || 'Bogotá'}`;
  if (req.rawText && req.rawText.toLowerCase().includes("silencioso")) {
    intentReason += " y exige huir del ruido de las vías principales. Este inmueble cumple el criterio de tranquilidad.";
  } else if (req.rawText && req.rawText.toLowerCase().includes("luz natural")) {
    intentReason += " y prioriza iluminación y ventilación natural.";
  } else {
    intentReason += ". Coincidencia de alta intencionalidad comercial.";
  }

  let techDetails = `Coincide en distribución (${prop.bedrooms || 'N/E'} habs, ${prop.bathrooms || 'N/E'} baños)`;
  if (prop.garageType === 'independiente') {
    techDetails += " y tiene garajes independientes ✅";
  } else if (prop.garageType === 'lineal') {
    techDetails += " (⚠️ garajes en servidumbre)";
  }

  return `🚀 *VECY INTEL: Oportunidad de Cierre Detectada (${score}% MATCH)*
👤 *ASESORES:* +${propBroker} ↔ +${reqBroker}
🏠 *OFERTA #${prop.id}:* ${prop.name || prop.title || 'Inmueble'} (${propPriceStr})
📋 *DEMANDA #${req.id}:* ${req.name || 'Requerimiento'} (${reqBudgetStr})
🧠 *INTENCIÓN:* ${intentReason}
⚖️ *TÉCNICO:* ${techDetails}.
💰 *ESTRATEGIA:* Eduardo / Jani, coincidencia de alta probabilidad validada. ¡Vayan por esa comisión! 🚀

👉 Ver en el panel web: https://vecy-network.vercel.app/admin`;
}
