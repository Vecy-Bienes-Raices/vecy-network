import { getDb } from "../db";
import { and, eq, sql } from "drizzle-orm";
import { propertyMatches, properties, requirements, matchFeedback } from "../../drizzle/schema";
import { normalizarTextoGeografico, isLasSantasZone, isBarrioInLasSantas, BARRIOS_LAS_SANTAS } from "./geography";
import { lookupBarriosByPerimeter } from "./geo-lookup";
import { VECY_VERSION_LABEL } from "../../shared/const";
import { extractFallbackDataFromText } from "./janIA";

/**
 * Caché en memoria de pares rechazados por feedback doctrinal humano (v31.4)
 * Clave: `${propertyId}_${requirementId}`
 */
let cachedRejectedPairs: Set<string> | null = null;
let lastRejectedPairsFetch = 0;
const REJECTED_PAIRS_TTL_MS = 25000; // 25 segundos

export async function getRejectedPairsSet(): Promise<Set<string>> {
  const now = Date.now();
  if (cachedRejectedPairs && (now - lastRejectedPairsFetch < REJECTED_PAIRS_TTL_MS)) {
    return cachedRejectedPairs;
  }
  try {
    const db = await getDb();
    if (!db) return cachedRejectedPairs || new Set();
    const rejected = await db
      .select({ propertyId: matchFeedback.propertyId, requirementId: matchFeedback.requirementId })
      .from(matchFeedback)
      .where(eq(matchFeedback.action, 'rechazado'));

    const set = new Set<string>();
    for (const r of rejected) {
      if (r.propertyId && r.requirementId) {
        set.add(`${r.propertyId}_${r.requirementId}`);
      }
    }
    cachedRejectedPairs = set;
    lastRejectedPairsFetch = now;
    return set;
  } catch (e: any) {
    console.error("[Matching] Error cargando rejected pairs cache:", e.message);
    return cachedRejectedPairs || new Set();
  }
}

export function invalidateRejectedPairsCache() {
  cachedRejectedPairs = null;
  lastRejectedPairsFetch = 0;
}

export function isPairRejectedInMemory(propertyId: number | string, requirementId: number | string): boolean {
  if (!cachedRejectedPairs) return false;
  return cachedRejectedPairs.has(`${propertyId}_${requirementId}`);
}

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
 * Compatibilidad inteligente de tipos de transacción (Doctrina VECY Network - 8 Reglas):
 * 1. Venta ↔ Venta (100% Compatible)
 * 2. Arriendo ↔ Arriendo (100% Compatible)
 * 3. Arriendo Puro ↔ Venta o Arriendo / Vendo o Arriendo (100% Compatible)
 * 4. Venta Pura ↔ Venta o Arriendo / Vendo o Arriendo (100% Compatible)
 * 5. Venta ↔ Venta/Permuta (100% Compatible)
 * 6. Venta ↔ Arriendo Puro → 0% BLOQUEO ABSOLUTO
 * 7. Arriendo Puro ↔ Arriendo con Opción de Compra → 0% BLOQUEO ABSOLUTO (Regla Doctrinal v17.2)
 * 8. Requerimiento "Arriendo con Opción de Compra" ↔ "Arriendo con Opción de Compra", "Venta o Arriendo" o "Venta" (100% Compatible)
 */
const TRANSACTION_COMPATIBILITY_MATRIX: Record<string, Set<string>> = {
  venta: new Set(["venta", "venta_o_arriendo", "venta_permuta"]),
  arriendo: new Set(["arriendo", "venta_o_arriendo", "arriendo_temporal"]),
  venta_o_arriendo: new Set(["venta", "arriendo", "venta_o_arriendo", "venta_permuta", "arriendo_temporal"]),
  arriendo_temporal: new Set(["arriendo_temporal", "arriendo", "venta_o_arriendo"]),
  arriendo_con_opcion_de_compra: new Set(["arriendo_con_opcion_de_compra"]),
  permuta: new Set(["permuta", "venta_permuta"]),
  venta_permuta: new Set(["venta_permuta", "permuta"]),
  aporte: new Set(["aporte"]),
};

/**
 * Extrae el porcentaje de permuta de un texto (ej: "50/50", "70/30", "venta 60% permuta 40%")
 * Retorna { ventaPct, permutaPct } o null si no hay porcentaje explícito.
 */
export function extractPermutaPercentage(text: string): { ventaPct: number; permutaPct: number } | null {
  const t = (text || "").toLowerCase();
  // Formato "XX/YY" (ej: "50/50", "70/30")
  const slashMatch = t.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
  if (slashMatch) {
    const a = parseInt(slashMatch[1], 10);
    const b = parseInt(slashMatch[2], 10);
    if (a + b === 100) {
      // Determinar cuál es venta y cuál permuta por contexto
      const ventaFirst = t.indexOf("venta") < t.indexOf("permuta") || !t.includes("permuta");
      return ventaFirst ? { ventaPct: a, permutaPct: b } : { ventaPct: b, permutaPct: a };
    }
  }
  // Formato "venta X% / permuta Y%" o "X% venta Y% permuta"
  const pctMatch = t.match(/(?:venta|vdo|vdo\.)\s*(\d{1,3})\s*%.*?(?:permuta|carro|vehiculo|bien)\s*(\d{1,3})\s*%/);
  if (pctMatch) {
    return { ventaPct: parseInt(pctMatch[1], 10), permutaPct: parseInt(pctMatch[2], 10) };
  }
  return null;
}

export function checkTransactionCompatibility(reqType: string | null | undefined, propType: string | null | undefined, propAccepted: string[] = []): boolean {
  if (!reqType || !propType) return false;
  let r = reqType.toLowerCase().trim();
  let p = propType.toLowerCase().trim();

  if (r.startsWith("venta_permuta")) r = "venta_permuta";
  if (p.startsWith("venta_permuta")) p = "venta_permuta";

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
  const norm = String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const res: StreetCarreraBoundaries = {};

  // 1. Rango de Calles:
  // Excluir terminantemente unidades de área (m2, mts), precio (millones, mdp), habitaciones, baños, etc.
  // Caso 1A: Con prefijo explícito de calle (calle, calles, clle, cll, cna)
  const explicitStreetRegex = /(?:entre|de)?\s*(?:la|las)?\s*(?:calle|calles|clle|cll|cna)\s*(\d{1,3})\s*(?:a|y|-|hasta)\s*(?:la|las)?\s*(?:calle|calles|clle|cll|cna)?\s*(\d{1,3})(?!\s*(?:m2|mts|mt2|metros|millones|mdp|hab|bano|alcoba|parqueadero))/i;
  let streetMatch = norm.match(explicitStreetRegex);

  // Caso 1B: 'de la 100 a la 127' o 'entre la 86 y la 92' en contexto geográfico sin unidades métricas
  if (!streetMatch) {
    const contextStreetRegex = /(?:entre|de)\s+(?:la|las)\s+(\d{1,3})\s+(?:a|y|-|hasta)\s+(?:la|las)\s+(\d{1,3})(?!\s*(?:m2|mts|mt2|metros|millones|mdp|hab|bano|alcoba|parqueadero|garaje|piso|ano))/i;
    const candidate = norm.match(contextStreetRegex);
    if (candidate) {
      const n1 = parseInt(candidate[1], 10);
      const n2 = parseInt(candidate[2], 10);
      if (!isNaN(n1) && !isNaN(n2) && n1 >= 20 && n1 <= 250 && n2 >= 20 && n2 <= 250) {
        streetMatch = candidate;
      }
    }
  }

  // Caso 1C: 'calle 100 a 127' o 'cll 86 a 92'
  if (!streetMatch) {
    const singlePrefixRegex = /(?:calle|calles|clle|cll)\s+(\d{1,3})\s*(?:a|y|-|hasta)\s*(\d{1,3})(?!\s*(?:m2|mts|mt2|metros|millones|mdp|hab|bano))/i;
    const candidate = norm.match(singlePrefixRegex);
    if (candidate) {
      streetMatch = candidate;
    }
  }

  if (streetMatch) {
    const n1 = parseInt(streetMatch[1], 10);
    const n2 = parseInt(streetMatch[2], 10);
    if (!isNaN(n1) && !isNaN(n2) && (n1 > 20 || n2 > 20)) {
      res.minStreet = Math.min(n1, n2);
      res.maxStreet = Math.max(n1, n2);
    }
  }

  // 2. Rango de Carreras:
  // Caso 2A: 'entre 7 y autopista' / 'séptima y autopista' / 'entre la 7 y la autopista'
  const autoMatch = norm.match(/(?:entre|de)?\s*(?:la)?\s*(?:cra|carrera)?\s*(?:la)?\s*(7|septima)\s*(?:a|y|-|hasta)\s*(?:la)?\s*(?:autopista|autonorte)/i);
  if (autoMatch) {
    res.minCarrera = 7;
    // Si la calle es < 100, la autopista en Chapinero es Carrera 20. Si es >= 100 en Usaquén, es Cra 45.
    const isUnder100 = res.maxStreet && res.maxStreet <= 100;
    res.maxCarrera = isUnder100 ? 20 : 45;
  }

  // Caso 2B: 'entre cra 7 y 15', 'entre carrera 9 y 15'
  if (!res.minCarrera || !res.maxCarrera) {
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
  }

  // 3. Orientación en cuadrante arterial
  const mencionaAutopistaNorte = norm.includes("autopista norte") || norm.includes("autonorte");
  const orienteAutopista = norm.includes("arriba de la autopista") || norm.includes("oriente de la autopista") || norm.includes("sobre la autopista");
  const occidenteAutopista = norm.includes("abajo de la autopista") || norm.includes("occidente de la autopista");

  if (mencionaAutopistaNorte || orienteAutopista) {
    if (!occidenteAutopista) {
      if (!res.minCarrera) res.minCarrera = 1;
      const isUnder100 = res.maxStreet && res.maxStreet <= 100;
      if (!res.maxCarrera) res.maxCarrera = isUnder100 ? 20 : 44;
    }
  }
  if (occidenteAutopista) {
    const isUnder100 = res.maxStreet && res.maxStreet <= 100;
    if (!res.minCarrera) res.minCarrera = isUnder100 ? 20 : 45;
  }

  if (norm.includes("arriba de la septima") || norm.includes("arriba de la 7")) {
    if (!res.minCarrera) res.minCarrera = 1;
    if (!res.maxCarrera) res.maxCarrera = 7;
  } else if (norm.includes("abajo de la septima") || norm.includes("abajo de la 7")) {
    if (!res.minCarrera) res.minCarrera = 7;
  }

  return res;
}

export function parsePropertyAddressNumbers(text: string): PropertyAddressNumbers {
  const norm = String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

export const KNOWN_BARRIOS_CANONICAL = [
  "santa bárbara occidental", "santa barbara occidental", "santa bárbara oriental", "santa barbara oriental",
  "santa bárbara central", "santa barbara central", "santa bárbara alta", "santa barbara alta",
  "santa bárbara norte", "santa barbara norte", "santa bárbara", "santa barbara",
  "santa ana occidental", "santa ana oriental", "santa ana central", "santa ana alta", "santa ana",
  "chico reservado norte", "chico reservado", "chico norte iii", "chico norte ii", "chico norte", "rincón del chicó", "rincon del chico", "chico navarra", "el chicó", "chico",
  "cedritos", "los cedros", "santa paula", "santa bibiana", "santa teresa", "san patricio", "navarra", "molinos norte", "la calleja", "calleja baja", "calleja alta",
  "bella suiza", "el contador", "la carolina", "mazurén", "mazuren", "country club", "antiguo country", "nuevo country", "usaquén", "usaquen", "multicentro",
  "north point", "san cristóbal norte", "san cristobal norte",
  "alameda 170", "alameda norte", "la alameda", "barrio alameda", "alameda", "san antonio noroccidental", "san antonio norte", "alcalá", "alcala", "belmira", "portales del norte", "san cipriano", "toberín", "toberin", "villa magdala",
  "los rosales alto", "rosales alto", "los rosales bajo", "rosales bajo", "los rosales", "rosales",
  "el refugio", "refugio", "la cabrera", "cabrera", "el nogal", "nogal", "el virrey", "el retiro", "el lago", "quinta camacho", "chapinero alto", "chapinero central", "chapinero",
  "la castellana", "castellana", "polo club", "polo", "san felipe",
  "colina campestre", "colina", "san josé de bavaria", "san jose de bavaria", "carmel club", "alejandría", "alejandria", "cantalejo", "sotavento", "victoria norte", "britalia norte", "niza norte", "niza", "la alhambra", "alhambra", "pasadena", "batán", "batan", "el batán", "el batan", "prado veraniego", "pontevedra", "morato", "la floresta", "floresta", "suba",
  "ciudad salitre", "salitre", "hayuelos", "modelia", "fontibón", "fontibon", "teusaquillo", "la soledad", "palermo", "quinta paredes", "la esmeralda", "nicolás de federmann", "nicolas de federmann",
  "ciudad jardín norte", "ciudad jardin norte", "ciudad jardín sur", "ciudad jardin sur", "ciudad jardín", "ciudad jardin",
  "álamos norte", "alamos norte", "álamos sur", "alamos sur", "álamos", "alamos",
  "la candelaria centro", "candelaria centro", "candelaria la nueva", "candelaria sur", "la candelaria", "candelaria",
  "el poblado", "poblado", "laureles", "envigado", "sabaneta", "belén", "belen", "estadio", "conquistadores", "granada", "el peñón", "el peñon",
  "juanambú", "juanambu", "san fernando", "valle del lili", "el prado", "alto prado", "riomar", "villa santos", "buenavista", "cabecera", "cañaveral", "canaveral", "ruitoque", "sotomayor"
];
KNOWN_BARRIOS_CANONICAL.sort((a, b) => b.length - a.length);

export function extractAllBarriosFromText(text: string): string[] {
  if (!text) return [];
  let norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const found: string[] = [];
  for (const b of KNOWN_BARRIOS_CANONICAL) {
    const bNorm = b.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const reg = new RegExp(`\\b${bNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "i");
    if (reg.test(norm)) {
      found.push(b.charAt(0).toUpperCase() + b.slice(1));
      norm = norm.replace(reg, " ");
    }
  }
  return found;
}

// ─── Catálogo de Límites Viales por Barrio (Bogotá Norte / Chapinero / Usaquén / Suba) ───
export const BOGOTA_BARRIO_STREET_BOUNDS: Record<string, { minStreet: number; maxStreet: number; minCra?: number; maxCra?: number }> = {
  // Chapinero
  "rosales": { minStreet: 70, maxStreet: 85, minCra: 1, maxCra: 7 },
  "los rosales": { minStreet: 70, maxStreet: 85, minCra: 1, maxCra: 7 },
  "rosales alto": { minStreet: 70, maxStreet: 85, minCra: 1, maxCra: 5 },
  "rosales bajo": { minStreet: 70, maxStreet: 85, minCra: 5, maxCra: 7 },
  "el nogal": { minStreet: 76, maxStreet: 82, minCra: 7, maxCra: 15 },
  "nogal": { minStreet: 76, maxStreet: 82, minCra: 7, maxCra: 15 },
  "el retiro": { minStreet: 81, maxStreet: 85, minCra: 11, maxCra: 15 },
  "retiro": { minStreet: 81, maxStreet: 85, minCra: 11, maxCra: 15 },
  "la cabrera": { minStreet: 84, maxStreet: 88, minCra: 7, maxCra: 15 },
  "cabrera": { minStreet: 84, maxStreet: 88, minCra: 7, maxCra: 15 },
  "antiguo country": { minStreet: 84, maxStreet: 88, minCra: 15, maxCra: 20 },
  "el virrey": { minStreet: 85, maxStreet: 90, minCra: 7, maxCra: 20 },
  "virrey": { minStreet: 85, maxStreet: 90, minCra: 7, maxCra: 20 },
  "parque el virrey": { minStreet: 85, maxStreet: 90, minCra: 7, maxCra: 20 },
  "chico": { minStreet: 88, maxStreet: 100, minCra: 7, maxCra: 15 },
  "el chico": { minStreet: 88, maxStreet: 100, minCra: 7, maxCra: 15 },
  "chico norte": { minStreet: 92, maxStreet: 100, minCra: 11, maxCra: 15 },
  "chico norte ii": { minStreet: 94, maxStreet: 100, minCra: 11, maxCra: 15 },
  "chico norte iii": { minStreet: 94, maxStreet: 100, minCra: 15, maxCra: 20 },
  "chico reservado": { minStreet: 92, maxStreet: 98, minCra: 7, maxCra: 11 },
  "chico reservado norte": { minStreet: 94, maxStreet: 100, minCra: 7, maxCra: 11 },
  "quinta camacho": { minStreet: 67, maxStreet: 72, minCra: 7, maxCra: 15 },
  "chapinero alto": { minStreet: 53, maxStreet: 72, minCra: 1, maxCra: 7 },
  "chapinero central": { minStreet: 53, maxStreet: 67, minCra: 7, maxCra: 14 },
  // Usaquén
  "rincon del chico": { minStreet: 100, maxStreet: 106, minCra: 9, maxCra: 15 },
  "rincón del chicó": { minStreet: 100, maxStreet: 106, minCra: 9, maxCra: 15 },
  "navarra": { minStreet: 106, maxStreet: 116, minCra: 15, maxCra: 20 },
  "chico navarra": { minStreet: 106, maxStreet: 116, minCra: 15, maxCra: 20 },
  "san patricio": { minStreet: 106, maxStreet: 116, minCra: 15, maxCra: 19 },
  "santa paula": { minStreet: 106, maxStreet: 116, minCra: 11, maxCra: 15 },
  "santa bibiana": { minStreet: 100, maxStreet: 106, minCra: 15, maxCra: 20 },
  "santa ana": { minStreet: 108, minCra: 7, maxCra: 9, maxStreet: 116 },
  "santa ana oriental": { minStreet: 108, maxStreet: 116, minCra: 1, maxCra: 7 },
  "santa ana occidental": { minStreet: 108, maxStreet: 116, minCra: 7, maxCra: 9 },
  "santa barbara": { minStreet: 116, maxStreet: 127, minCra: 7, maxCra: 19 },
  "santa barbara central": { minStreet: 116, maxStreet: 127, minCra: 11, maxCra: 15 },
  "santa barbara occidental": { minStreet: 116, maxStreet: 127, minCra: 15, maxCra: 19 },
  "santa barbara oriental": { minStreet: 116, maxStreet: 127, minCra: 7, maxCra: 11 },
  "santa barbara alta": { minStreet: 116, maxStreet: 127, minCra: 1, maxCra: 7 },
  "la carolina": { minStreet: 127, maxStreet: 134, minCra: 9, maxCra: 15 },
  "la calleja": { minStreet: 127, maxStreet: 134, minCra: 15, maxCra: 19 },
  "country club": { minStreet: 127, maxStreet: 134, minCra: 15, maxCra: 19 },
  "multicentro": { minStreet: 122, maxStreet: 127, minCra: 11, maxCra: 15 },
  "unicentro": { minStreet: 122, maxStreet: 127, minCra: 11, maxCra: 15 },
  "cedritos": { minStreet: 134, maxStreet: 153, minCra: 7, maxCra: 19 },
  "los cedros": { minStreet: 134, maxStreet: 153, minCra: 7, maxCra: 19 },
  "el contador": { minStreet: 134, maxStreet: 140, minCra: 9, maxCra: 19 },
  "contador": { minStreet: 134, maxStreet: 140, minCra: 9, maxCra: 19 },
  "belmira": { minStreet: 138, maxStreet: 147, minCra: 7, maxCra: 9 },
  "toberin": { minStreet: 161, maxStreet: 170, minCra: 16, maxCra: 21 },
  "toberín": { minStreet: 161, maxStreet: 170, minCra: 16, maxCra: 21 },
  // Suba
  "pasadena": { minStreet: 100, maxStreet: 106, minCra: 45, maxCra: 55 },
  "alhambra": { minStreet: 114, maxStreet: 116, minCra: 45, maxCra: 55 },
  "la alhambra": { minStreet: 114, maxStreet: 116, minCra: 45, maxCra: 55 },
  "el batan": { minStreet: 122, maxStreet: 127, minCra: 45, maxCra: 55 },
  "batan": { minStreet: 122, maxStreet: 127, minCra: 45, maxCra: 55 },
  "prado veraniego": { minStreet: 128, maxStreet: 138, minCra: 45, maxCra: 55 },
  "niza": { minStreet: 118, maxStreet: 129, minCra: 60, maxCra: 72 },
  "colina campestre": { minStreet: 134, maxStreet: 160, minCra: 55, maxCra: 72 },
  "colina": { minStreet: 134, maxStreet: 160, minCra: 55, maxCra: 72 },
  // Barrios Unidos
  "polo club": { minStreet: 80, maxStreet: 87, minCra: 20, maxCra: 28 },
  "polo": { minStreet: 80, maxStreet: 87, minCra: 20, maxCra: 28 },
  "la castellana": { minStreet: 92, maxStreet: 100, minCra: 28, maxCra: 50 },
  "castellana": { minStreet: 92, maxStreet: 100, minCra: 28, maxCra: 50 },
};

export function matchesGeography(
  reqZoneRaw: string,
  propZoneRaw: string,
  reqLocRaw: string,
  propLocRaw: string,
  reqCityRaw: string,
  propCityRaw: string,
  reqFullText?: string,
  propFullText?: string
): { matches: boolean; score: number } {
  const reqCity = normalizarTextoGeografico(reqCityRaw || "");
  const propCity = normalizarTextoGeografico(propCityRaw || "");
  const reqZone = normalizarTextoGeografico(reqZoneRaw || "");
  const propZone = normalizarTextoGeografico(propZoneRaw || "");
  const reqLoc = normalizarTextoGeografico(reqLocRaw || "");
  const propLoc = normalizarTextoGeografico(propLocRaw || "");

  const isBogotaCityAlias = (c: string) => {
    return c === "bogota" || c === "bogota d c" || c === "bogota dc" || c === "distrito capital" || c === "bogota d.c.";
  };

  const isSameCanonicalCity = (c1: string, c2: string) => {
    if (!c1 || !c2) return true;
    if (c1 === c2) return true;
    if (isBogotaCityAlias(c1) && isBogotaCityAlias(c2)) return true;
    if (c1.includes(c2) || c2.includes(c1)) return true;
    return false;
  };

  // 1. SIEMPRE: Municipio / Ciudad exacto es obligatorio (Filtro duro)
  if (reqCity && propCity && !isSameCanonicalCity(reqCity, propCity)) {
    return { matches: false, score: 0 };
  }

  // 1.3 Delimitación de Perímetro Vial (Calles y Carreras - Bounding Box Guard)
  const reqBoundaries = parseStreetCarreraBoundaries(`${reqZoneRaw} ${reqLocRaw} ${reqFullText || ""}`);
  const propNumbers = parsePropertyAddressNumbers(`${propZoneRaw} ${propFullText || ""}`);

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

  // 1.35 Bounding Box Catastral por Barrio (Regla Doctrinal v31.4)
  // Si la oferta no especifica número de calle exacto, pero está en un barrio con límites viales conocidos:
  if (reqBoundaries.minStreet && reqBoundaries.maxStreet) {
    const propCleanNorm = normalizarTextoGeografico(`${propZoneRaw} ${propFullText || ""}`);
    for (const [barrioKey, bounds] of Object.entries(BOGOTA_BARRIO_STREET_BOUNDS)) {
      if (propCleanNorm.includes(barrioKey)) {
        // Validar si el rango de calles del barrio ofertado tiene solapamiento con el perímetro exigido
        if (bounds.maxStreet < reqBoundaries.minStreet || bounds.minStreet > reqBoundaries.maxStreet) {
          console.log(`[Matching-Guard] Bloqueo 0%: Barrio de oferta '${barrioKey}' (Calles ${bounds.minStreet}-${bounds.maxStreet}) fuera del perímetro exigido (Calles ${reqBoundaries.minStreet}-${reqBoundaries.maxStreet})`);
          return { matches: false, score: 0 };
        }
        if (reqBoundaries.maxCarrera && bounds.minCra && bounds.minCra > reqBoundaries.maxCarrera) {
          console.log(`[Matching-Guard] Bloqueo 0%: Barrio de oferta '${barrioKey}' (Cra ${bounds.minCra}+) supera carrera máxima exigida (${reqBoundaries.maxCarrera})`);
          return { matches: false, score: 0 };
        }
        if (reqBoundaries.minCarrera && bounds.maxCra && bounds.maxCra < reqBoundaries.minCarrera) {
          console.log(`[Matching-Guard] Bloqueo 0%: Barrio de oferta '${barrioKey}' (Cra <=${bounds.maxCra}) por debajo de carrera mínima exigida (${reqBoundaries.minCarrera})`);
          return { matches: false, score: 0 };
        }
        break;
      }
    }
  }

  // 1.4 Guard de Cuadrante No Resuelto (Bug #3 Fix)
  if (esFormatoCuadrante(reqZoneRaw) && !reqBoundaries.minStreet && !reqBoundaries.minCarrera) {
    return { matches: false, score: 0 };
  }

  // 1.4 Guard de Sabana Norte Campestre vs Bogotá Urbano DENSIDAD (Regla Doctrinal v21.20)
  const reqFullNorm = normalizarTextoGeografico(`${reqZoneRaw} ${reqLocRaw} ${reqCityRaw} ${reqFullText || ""}`);
  const propFullNorm = normalizarTextoGeografico(`${propZoneRaw} ${propLocRaw} ${propCityRaw} ${propFullText || ""}`);

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

  // 1.46 Guard Doctrinal v28.9 / v29.4: Familias Chicó y Delimitación Catastral IDECA de Rincón del Chicó
  // - Chicó Tradicional (El Chicó, Chicó Norte, Chicó Reservado) = CHAPINERO.
  // - Chicó Navarra / Navarra = USAQUÉN.
  // - Rincón del Chicó: 
  //     * Con Calle >= 100 o 'Usaquén' = USAQUÉN (Sector catastral oficial IDECA al norte de Calle 100).
  //     * Con Calle < 100 o 'Chapinero' = CHAPINERO (Sector tradicional al sur de Calle 100).
  const isRinconChicoReq = reqFullNorm.includes("rincon del chico") || reqFullNorm.includes("rincón del chicó");
  const isRinconChicoProp = propFullNorm.includes("rincon del chico") || propFullNorm.includes("rincón del chicó");
  
  const reqStreetNum = parsePropertyAddressNumbers(reqFullText || reqZoneRaw || "").street;
  const propStreetNum = parsePropertyAddressNumbers(propFullText || propZoneRaw || "").street;
  
  const isRinconUsaquenReq = isRinconChicoReq && (reqFullNorm.includes("usaquen") || (reqStreetNum !== undefined && reqStreetNum >= 100));
  const isRinconUsaquenProp = isRinconChicoProp && (propFullNorm.includes("usaquen") || (propStreetNum !== undefined && propStreetNum >= 100));
  
  const isChicoNavarraReq = reqFullNorm.includes("chico navarra") || reqFullNorm.includes("navarra") || isRinconUsaquenReq;
  const isChicoNavarraProp = propFullNorm.includes("chico navarra") || propFullNorm.includes("navarra") || isRinconUsaquenProp;
  const isChicoTradicionalReq = (reqFullNorm.includes("chico") || reqFullNorm.includes("chicó")) && !isChicoNavarraReq;
  const isChicoTradicionalProp = (propFullNorm.includes("chico") || propFullNorm.includes("chicó")) && !isChicoNavarraProp;

  if ((isChicoNavarraReq && isChicoTradicionalProp) || (isChicoTradicionalReq && isChicoNavarraProp)) {
    console.log(`[Matching-Guard] Bloqueo 0%: Chicó Usaquén (Navarra / Rincón del Chicó Cll >= 100) vs Chicó Chapinero ('${reqZoneRaw}' ↔ '${propZoneRaw}')`);
    return { matches: false, score: 0 };
  }

  // 1.47 Guard Doctrinal v29.4: Rosales Alto vs Rosales Bajo
  // Rosales Bajo = Sector plano / caminable (entre Cra 7 y Circunvalar / Cra 5).
  // Rosales Alto = Sector de montaña / ladera oriental (arriba de la Circunvalar).
  // Bloqueo absoluto cuando una parte exige explícitamente Alto o Bajo y la otra es lo opuesto.
  const isRosalesAltoReq = reqFullNorm.includes("rosales alto") || reqFullNorm.includes("rosales parte alta") || reqFullNorm.includes("rosales arriba");
  const isRosalesBajoReq = reqFullNorm.includes("rosales bajo") || reqFullNorm.includes("rosales parte baja") || reqFullNorm.includes("rosales abajo") || reqFullNorm.includes("rosales plano");
  const isRosalesAltoProp = propFullNorm.includes("rosales alto") || propFullNorm.includes("rosales parte alta") || propFullNorm.includes("rosales arriba");
  const isRosalesBajoProp = propFullNorm.includes("rosales bajo") || propFullNorm.includes("rosales parte baja") || propFullNorm.includes("rosales abajo") || propFullNorm.includes("rosales plano");

  if ((isRosalesBajoReq && isRosalesAltoProp) || (isRosalesAltoReq && isRosalesBajoProp)) {
    console.log(`[Matching-Guard] Bloqueo 0%: Rosales Alto vs Rosales Bajo ('${reqZoneRaw}' ↔ '${propZoneRaw}')`);
    return { matches: false, score: 0 };
  }

  // 1.48 Guard Doctrinal v29.4: Homónimos de Extremos Opuestos (Ciudad Jardín Norte vs Sur, Álamos Norte vs Sur, Candelaria Centro vs Sur, Calleja Alta vs Baja)
  const isCjNorteReq = reqFullNorm.includes("ciudad jardin norte") || reqFullNorm.includes("ciudad jardin (norte)");
  const isCjSurReq = reqFullNorm.includes("ciudad jardin sur") || reqFullNorm.includes("ciudad jardin (sur)");
  const isCjNorteProp = propFullNorm.includes("ciudad jardin norte") || propFullNorm.includes("ciudad jardin (norte)");
  const isCjSurProp = propFullNorm.includes("ciudad jardin sur") || propFullNorm.includes("ciudad jardin (sur)");
  if ((isCjNorteReq && isCjSurProp) || (isCjSurReq && isCjNorteProp)) {
    console.log(`[Matching-Guard] Bloqueo 0%: Incompatibilidad Ciudad Jardín Norte vs Ciudad Jardín Sur ('${reqZoneRaw}' ↔ '${propZoneRaw}')`);
    return { matches: false, score: 0 };
  }

  const isAlamosNorteReq = reqFullNorm.includes("alamos norte") || reqFullNorm.includes("álamos norte");
  const isAlamosSurReq = reqFullNorm.includes("alamos sur") || reqFullNorm.includes("álamos sur");
  const isAlamosNorteProp = propFullNorm.includes("alamos norte") || propFullNorm.includes("álamos norte");
  const isAlamosSurProp = propFullNorm.includes("alamos sur") || propFullNorm.includes("álamos sur");
  if ((isAlamosNorteReq && isAlamosSurProp) || (isAlamosSurReq && isAlamosNorteProp)) {
    console.log(`[Matching-Guard] Bloqueo 0%: Incompatibilidad Álamos Norte vs Álamos Sur ('${reqZoneRaw}' ↔ '${propZoneRaw}')`);
    return { matches: false, score: 0 };
  }

  const isCandelariaCentroReq = reqFullNorm.includes("candelaria centro") || (reqFullNorm.includes("candelaria") && !reqFullNorm.includes("nueva") && !reqFullNorm.includes("sur"));
  const isCandelariaSurReq = reqFullNorm.includes("candelaria la nueva") || reqFullNorm.includes("candelaria sur");
  const isCandelariaCentroProp = propFullNorm.includes("candelaria centro") || (propFullNorm.includes("candelaria") && !propFullNorm.includes("nueva") && !propFullNorm.includes("sur"));
  const isCandelariaSurProp = propFullNorm.includes("candelaria la nueva") || propFullNorm.includes("candelaria sur");
  if ((isCandelariaCentroReq && isCandelariaSurProp) || (isCandelariaSurReq && isCandelariaCentroProp)) {
    console.log(`[Matching-Guard] Bloqueo 0%: Incompatibilidad La Candelaria Centro vs Candelaria Sur/La Nueva ('${reqZoneRaw}' ↔ '${propZoneRaw}')`);
    return { matches: false, score: 0 };
  }

  const isCallejaAltaReq = reqFullNorm.includes("calleja alta") || reqFullNorm.includes("la calleja alta");
  const isCallejaBajaReq = reqFullNorm.includes("calleja baja") || reqFullNorm.includes("la calleja baja");
  const isCallejaAltaProp = propFullNorm.includes("calleja alta") || propFullNorm.includes("la calleja alta");
  const isCallejaBajaProp = propFullNorm.includes("calleja baja") || propFullNorm.includes("la calleja baja");
  if ((isCallejaAltaReq && isCallejaBajaProp) || (isCallejaBajaReq && isCallejaAltaProp)) {
    console.log(`[Matching-Guard] Bloqueo 0%: Incompatibilidad Calleja Alta vs Calleja Baja ('${reqZoneRaw}' ↔ '${propZoneRaw}')`);
    return { matches: false, score: 0 };
  }

  // 1.481 Guard Doctrinal v31.4: Incompatibilidad Absoluta El Virrey vs El Nogal / Rincón del Chicó / Polo Club
  // El Virrey (Cl 85-90, Chapinero) es un micro-sector estrictamente delimitado alrededor del Parque El Virrey.
  // Es incompatible con El Nogal (Cl 76-82), Rincón del Chicó (Cl 100-106) y Polo Club (Barrios Unidos / occidente de Autopista).
  const isVirreySpecificReq = (reqFullNorm.includes("virrey") || reqFullNorm.includes("parque el virrey")) && !reqFullNorm.includes("nogal") && !reqFullNorm.includes("rincon del chico") && !reqFullNorm.includes("rincón del chicó");
  const isNogalProp = propFullNorm.includes("el nogal") || propFullNorm.includes("nogal");
  const isRinconProp = propFullNorm.includes("rincon del chico") || propFullNorm.includes("rincón del chicó");
  const isPoloProp = propFullNorm.includes("polo club") || propFullNorm.includes("polo");

  if (isVirreySpecificReq && (isNogalProp || isRinconProp || isPoloProp)) {
    if (!hasAledanos(reqZoneRaw)) {
      console.log(`[Matching-Guard] Bloqueo 0%: Requerimiento pide El Virrey pero oferta es incompatible ('${reqZoneRaw}' ↔ '${propZoneRaw}')`);
      return { matches: false, score: 0 };
    }
  }

  // Si la oferta es en El Virrey y la demanda pide expresamente El Nogal o Rincón del Chicó sin pedir Virrey:
  const isVirreyPropSpecific = (propFullNorm.includes("virrey") || propFullNorm.includes("parque el virrey")) && !propFullNorm.includes("nogal") && !propFullNorm.includes("rincon del chico") && !propFullNorm.includes("rincón del chicó");
  const isNogalReq = (reqFullNorm.includes("el nogal") || reqFullNorm.includes("nogal")) && !reqFullNorm.includes("virrey");
  const isRinconReq = (reqFullNorm.includes("rincon del chico") || reqFullNorm.includes("rincón del chicó")) && !reqFullNorm.includes("virrey");
  if (isVirreyPropSpecific && (isNogalReq || isRinconReq)) {
    if (!hasAledanos(reqZoneRaw)) {
      console.log(`[Matching-Guard] Bloqueo 0%: Oferta en El Virrey incompatible con demanda ('${reqZoneRaw}' ↔ '${propZoneRaw}')`);
      return { matches: false, score: 0 };
    }
  }

  // 1.482 Guard Doctrinal v31.4: Incompatibilidad Absoluta Rosales vs Chicó Tradicional
  // Rosales (al oriente de Cra 7, ladera de los cerros) vs Chicó (al occidente de Cra 7).
  // Solo se permite si la demanda solicita explícitamente AMBOS en su texto (ej: "Rosales o Chicó") o aledaños.
  const isRosalesReqOnly = (reqFullNorm.includes("rosales") || reqFullNorm.includes("los rosales")) && !reqFullNorm.includes("chico") && !reqFullNorm.includes("chicó") && !hasAledanos(reqZoneRaw);
  const isChicoPropOnly = (propFullNorm.includes("chico") || propFullNorm.includes("chicó")) && !propFullNorm.includes("chico navarra") && !propFullNorm.includes("rosales");
  if (isRosalesReqOnly && isChicoPropOnly) {
    console.log(`[Matching-Guard] Bloqueo 0%: Requerimiento exclusivo en Rosales incompatible con oferta en Chicó ('${reqZoneRaw}' ↔ '${propZoneRaw}')`);
    return { matches: false, score: 0 };
  }

  const isChicoReqOnly = (reqFullNorm.includes("chico") || reqFullNorm.includes("chicó")) && !reqFullNorm.includes("chico navarra") && !reqFullNorm.includes("rosales") && !hasAledanos(reqZoneRaw);
  const isRosalesPropOnly = (propFullNorm.includes("rosales") || propFullNorm.includes("los rosales")) && !propFullNorm.includes("chico") && !propFullNorm.includes("chicó");
  if (isChicoReqOnly && isRosalesPropOnly) {
    console.log(`[Matching-Guard] Bloqueo 0%: Requerimiento exclusivo en Chicó incompatible con oferta en Rosales ('${reqZoneRaw}' ↔ '${propZoneRaw}')`);
    return { matches: false, score: 0 };
  }

  // 1.483 Guard Doctrinal v31.4: Incompatibilidad Absoluta El Nogal vs Chicó Norte / Chicó Reservado
  // El Nogal (Cl 76-82) vs Chicó Norte / Chicó Reservado (Cl 92-100). Distancia > 10 cuadras comerciales.
  const isNogalReqOnly = (reqFullNorm.includes("el nogal") || reqFullNorm.includes("nogal")) && !reqFullNorm.includes("chico") && !reqFullNorm.includes("chicó") && !hasAledanos(reqZoneRaw);
  const isChicoNortePropOnly = (propFullNorm.includes("chico norte") || propFullNorm.includes("chico reservado")) && !propFullNorm.includes("nogal");
  if (isNogalReqOnly && isChicoNortePropOnly) {
    console.log(`[Matching-Guard] Bloqueo 0%: Requerimiento exclusivo en El Nogal incompatible con oferta en Chicó Norte/Reservado ('${reqZoneRaw}' ↔ '${propZoneRaw}')`);
    return { matches: false, score: 0 };
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

    const orientaciones = ["oriental", "occidental", "norte", "sur", "alta", "alto", "baja", "bajo", "reservado", " central", "navarra"];
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
      "santa barbara", "santa barbara alta", "santa barbara oriental", "santa barbara central", "santa barbara occidental", "santa barbara norte",
      "santa ana", "santa ana oriental", "santa ana occidental", "santa ana alta", "santa ana central",
      "santa paula", "santa bibiana", "san patricio", "navarra", "chico navarra", "molinos norte", "usaquen", "multicentro"
    ],
    "santas": [
      "santa barbara", "santa barbara alta", "santa barbara oriental", "santa barbara central", "santa barbara occidental", "santa barbara norte",
      "santa ana", "santa ana oriental", "santa ana occidental", "santa ana alta", "santa ana central",
      "santa paula", "santa bibiana", "san patricio", "navarra", "chico navarra", "molinos norte", "usaquen", "multicentro"
    ],
    "zona santas": [
      "santa barbara", "santa barbara alta", "santa barbara oriental", "santa barbara central", "santa barbara occidental", "santa barbara norte",
      "santa ana", "santa ana oriental", "santa ana occidental", "santa ana alta", "santa ana central",
      "santa paula", "santa bibiana", "san patricio", "navarra", "chico navarra", "molinos norte", "usaquen", "multicentro"
    ],
    "sector santas": [
      "santa barbara", "santa barbara alta", "santa barbara oriental", "santa barbara central", "santa barbara occidental", "santa barbara norte",
      "santa ana", "santa ana oriental", "santa ana occidental", "santa ana alta", "santa ana central",
      "santa paula", "santa bibiana", "san patricio", "navarra", "chico navarra", "molinos norte", "usaquen", "multicentro"
    ],
    "sector de las santas": [
      "santa barbara", "santa barbara alta", "santa barbara oriental", "santa barbara central", "santa barbara occidental", "santa barbara norte",
      "santa ana", "santa ana oriental", "santa ana occidental", "santa ana alta", "santa ana central",
      "santa paula", "santa bibiana", "san patricio", "navarra", "chico navarra", "molinos norte", "usaquen", "multicentro"
    ],
    "santas de usaquen": [
      "santa barbara", "santa barbara alta", "santa barbara oriental", "santa barbara central", "santa barbara occidental", "santa barbara norte",
      "santa ana", "santa ana oriental", "santa ana occidental", "santa ana alta", "santa ana central",
      "santa paula", "santa bibiana", "san patricio", "navarra", "chico navarra", "molinos norte", "usaquen", "multicentro"
    ],
    "barrios santa norte": [
      "santa barbara", "santa barbara alta", "santa barbara oriental", "santa barbara central", "santa barbara occidental", "santa barbara norte",
      "santa ana", "santa ana oriental", "santa ana occidental", "santa ana alta", "santa ana central",
      "santa paula", "santa bibiana", "san patricio", "navarra", "chico navarra", "molinos norte", "usaquen", "multicentro"
    ],
    // REGLA DOCTRINAL v28.9: Todos los Chicó son CHAPINERO, excepto Navarra = Usaquén.
    "el chico": ["chico", "chico sur", "chico norte", "chico reservado", "chico reservado norte"],
    "chico": ["el chico", "chico sur", "chico norte", "chico reservado", "chico reservado norte"],
    "chico norte": ["chico norte", "chico norte ii", "chico norte iii", "chico reservado norte", "chico reservado", "chico", "el chico"],
    "chico reservado": ["chico reservado norte", "chico norte", "chico norte ii", "chico norte iii", "chico", "el chico"],
    "chico reservado norte": ["chico reservado", "chico norte", "chico norte ii", "chico norte iii"],
    // Navarra → USAQUÉN (incompatible con TODOS los Chicó de Chapinero):
    "chico navarra": ["chico navarra", "navarra"],
    "navarra": ["chico navarra", "navarra"],
    // Rosales: Distinción Doctrinal v29.4
    "rosales alto": ["rosales alto", "los rosales alto", "rosales parte alta"],
    "rosales bajo": ["rosales bajo", "los rosales bajo", "rosales parte baja"],
    "rosales": ["rosales", "los rosales", "rosales alto", "rosales bajo", "los rosales alto", "los rosales bajo"],
    "los rosales": ["rosales", "los rosales", "rosales alto", "rosales bajo", "los rosales alto", "los rosales bajo"],
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
    norm = norm.replace(/\by\s+aleda[nñ]os\b/gi, "");
    norm = norm.replace(/\baleda[nñ]os\b/gi, "");
    norm = norm.replace(/\by\s+alrededores\b/gi, "");
    norm = norm.replace(/\balrededores\b/gi, "");

    const parts = norm.split(/[,;\/\-\n|]|\by\b|\bo\b/gi);
    return parts.map(p => p.trim()).filter(p => p.length >= 2);
  };

  const extractNeighborhoodTokens = (text: string): string[] => {
    if (!text) return [];
    let norm = normalizarTextoGeografico(text);
    const found: string[] = [];

    // Catálogo canónico de barrios reales
    const knownNeighborhoods = [
      // Familia 2 Chicó: USAQUÉN Cls 100-106
      "chico reservado norte", "chico reservado", "chico norte iii", "chico norte ii", "chico norte",
      // Familia 3 Chicó: USAQUÉN ~Cls 106-120
      "chico navarra",
      // Familia 1 Chicó: CHAPINERO Cls 88-100 (Rincón del Chicó = junto al Parque El Virrey, Chapinero)
      "rincon del chico", "chico",
      // Barrios Usaquén Cls 100-127 (oriente Autopista Norte)
      "cedritos", "los cedros", "santa paula", "santa bibiana", "santa teresa", "san patricio",
      "navarra", "molinos norte", "la calleja", "calleja baja", "calleja alta",
      "bella suiza", "el contador", "la carolina", "mazuren", "country club", "antiguo country", "nuevo country", "usaquen", "multicentro",
      "alameda 170", "alameda norte", "la alameda", "alameda", "san antonio noroccidental", "san antonio norte", "alcala", "belmira", "portales del norte", "san cipriano", "toberin", "villa magdala",
      // Chapinero
      "los rosales alto", "rosales alto", "los rosales bajo", "rosales bajo", "los rosales", "rosales",
      "la cabrera", "el nogal", "nogal", "el virrey", "el retiro", "el lago", "quinta camacho", "chapinero alto", "chapinero central", "chapinero",
      "la castellana", "castellana", "polo club", "polo", "san felipe",
      // Suba (Prado Veraniego está al OESTE de la Autopista Norte, pertenece a Suba, NO a Usaquén)
      "colina campestre", "colina", "san jose de bavaria", "carmel club", "alejandria", "cantalejo", "sotavento", "victoria norte", "britalia norte", "niza norte", "niza", "alhambra", "la alhambra", "pasadena", "batan", "el batan", "prado veraniego", "pontevedra", "morato", "la floresta", "floresta", "suba",
      "ciudad salitre", "salitre", "hayuelos", "modelia", "fontibon", "teusaquillo", "la soledad", "palermo", "quinta paredes", "la esmeralda", "nicolas de federmann",
      "el poblado", "poblado", "laureles", "envigado", "sabaneta", "belen", "estadio", "conquistadores", "granada", "el peñon",
      "juanambu", "ciudad jardin", "san fernando", "valle del lili", "el prado", "alto prado", "riomar", "villa santos", "buenavista", "cabecera", "canaveral", "ruitoque", "sotomayor"
    ];

    // Ordenar de mayor a menor longitud para que compuestos como "chico navarra" se procesen antes que "chico"
    knownNeighborhoods.sort((a, b) => b.length - a.length);

    for (const n of knownNeighborhoods) {
      const reg = new RegExp(`\\b${n}\\b`, "i");
      if (reg.test(norm)) {
        found.push(n);
        // Consumir el token encontrado para no extraer subcadenas espurias (ej: no extraer "chico" de "chico navarra")
        norm = norm.replace(reg, " ");
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
      const defaultMaxCra = (reqBoundaries.maxStreet <= 100) ? 20 : 45;
      const idecaRes = lookupBarriosByPerimeter({
        calleNorte: reqBoundaries.maxStreet,
        calleSur: reqBoundaries.minStreet,
        craOriente: reqBoundaries.minCarrera || 1,
        craOccidente: reqBoundaries.maxCarrera || defaultMaxCra,
        ciudad: "bogota"
      });
      if (idecaRes.barrios && idecaRes.barrios.length > 0) {
        const idecaNorm = idecaRes.barrios.map(b => normalizarTextoGeografico(b));
        // Si el requerimiento NO especificó ningún barrio por nombre, poblar con los del perímetro
        if (reqPhrases.length === 0) {
          reqPhrases = idecaNorm;
        } else if (hasAledanos(reqZoneRaw)) {
          // Solo si pide aledaños, agregar los barrios adicionales del perímetro
          reqPhrases = Array.from(new Set([...reqPhrases, ...idecaNorm]));
        }
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
    return p1.trim() === p2.trim(); // LOS BARRIOS DEBEN SER 100% IDÉNTICOS
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

export function isNonRealEstateText(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const forbidden = [
    // Minería, Canteras, Carbón y Materiales Pétreos
    "cantera", "canteras", "mina de", "minas de", "carbon termico", "carbon mineral", "carbon coque", "antracita",
    "caliza", "piedra y arena", "arena y piedra", "triturado", "recebo", "balasto", "viaje de arena", "viajes de arena",
    "petroleo", "gasolina", "crudo", "esmeraldas", "oro de aluvion", "chatarra", "lingotes",
    // Materiales de Construcción y Ferretería
    "cemento", "varilla", "varillas", "ladrillo", "ladrillos", "bloque estructural", "tejas de zinc",
    "hierro figurado", "material de construccion", "materiales de construccion", "concreto premezclado",
    // Maquinaria Pesada, Vehículos y Transporte
    "volqueta", "volquetas", "retroexcavadora", "maquinaria amarilla", "tractomula", "tractomulas",
    "cargador frontal", "camion sencillo", "camiones doble troque", "transporte de carga", "fletes pesados",
    // Servicios No Inmobiliarios, Empleo, Finanzas y Cripto
    "prestamos de dinero", "creditos al instante", "prestamos gota a gota", "trading", "criptomonedas", "bitcoin",
    "inversionistas forex", "oferta de empleo", "se busca conductor", "se busca vigilante", "servicios de mudanza"
  ];
  return forbidden.some(term => t.includes(term));
}

export function normalizeCanonicalCity(city: string | null | undefined): string {
  if (!city) return "Bogotá";
  const c = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (c.includes("bogota")) return "Bogotá";
  if (c.includes("cali")) return "Cali";
  if (c.includes("medellin")) return "Medellín";
  if (c.includes("barranquilla")) return "Barranquilla";
  if (c.includes("bucaramanga")) return "Bucaramanga";
  if (c.includes("cartagena")) return "Cartagena";
  if (c.includes("pereira")) return "Pereira";
  if (c.includes("manizales")) return "Manizales";
  if (c.includes("armenia")) return "Armenia";
  if (c.includes("chia")) return "Chía";
  if (c.includes("cajica")) return "Cajicá";
  if (c.includes("cota")) return "Cota";
  if (c.includes("sopo")) return "Sopó";
  return city.trim();
}

export function extractTrueCityFromText(rawText: string | null | undefined, fallbackCity: string | null | undefined): string {
  const t = (rawText || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const bogotaKeywords = [
    "chico", "rosales", "cedritos", "santa barbara", "chapinero", "la cabrera", "el nogal", "el retiro", "virrey",
    "calle 94", "calle 93", "calle 100", "calle 85", "calle 116", "calle 127", "calle 134", "calle 140", "calle 147", "calle 153", "calle 170", "calle 72", "calle 80",
    "carrera 7", "carrera 9", "carrera 11", "carrera 15", "carrera 19", "carrera 30",
    "usaquen", "suba", "niza", "alhambra", "pasadena", "batan", "colina campestre", "polo club", "castellana", "teusaquillo", "salitre", "santa ana", "santa paula", "santa bibiana", "san patricio", "toberin", "mazuren"
  ];

  const caliKeywords = [
    "el penon", "granada cali", "san antonio cali", "ciudad jardin cali", "santa monica cali", "pance", "cristales cali", "chipichape", "san fernando cali", "valle del lili", "santa teresita cali", "menga", "dapa"
  ];

  const medellinKeywords = [
    "el poblado", "laureles", "envigado", "sabaneta", "belen", "conquistadores", "el tesoro", "las lomas", "patio bonito", "ciudad del rio"
  ];

  if (bogotaKeywords.some(k => t.includes(k))) return "Bogotá";
  if (caliKeywords.some(k => t.includes(k))) return "Cali";
  if (medellinKeywords.some(k => t.includes(k))) return "Medellín";

  return normalizeCanonicalCity(fallbackCity);
}

/**
 * Doctrina v31.5: Detección estricta de publicaciones huecas, frases sueltas, teasers o comentarios de chat
 * que carecen de ficha técnica o especificaciones mínimas en su texto original.
 */
export function isHollowListing(rawText: string | null | undefined, name?: string | null, externalUrl?: string | null): { isHollow: boolean; reason: string } {
  if (!rawText || rawText.trim() === '') {
    return { isHollow: true, reason: 'Texto original vacío o nulo' };
  }
  const clean = rawText.trim();

  // Si contiene un enlace web externo verificado, cuenta con ficha técnica en la web
  if (/https?:\/\/[^\s]+/i.test(clean) || (externalUrl && /https?:\/\/[^\s]+/i.test(externalUrl))) {
    return { isHollow: false, reason: 'Ficha técnica en enlace web externo' };
  }

  const words = clean.split(/\s+/).filter(Boolean);

  // Mensajes de saludo, avisos o frases fragmentadas típicas de chat
  const lower = clean.toLowerCase();
  const isGreetingOrTeaser = (
    lower === 'como están? 🤗' ||
    lower === 'buen día 🤗☀️' ||
    (lower.startsWith('hola ') && words.length < 8) ||
    (lower.startsWith('buenas ') && words.length < 8) ||
    lower === 'en santa barbara' ||
    lower === '*en santa barbara*' ||
    lower === 'en la cabrera' ||
    lower === '*en la cabrera*' ||
    lower === '*requerimiento*' ||
    lower === '*requerimientos*' ||
    lower === 'inversion' ||
    (lower.includes('comparto requerimiento:') && words.length < 10) ||
    (lower.includes('busco para cliente') && words.length < 8) ||
    (lower.includes('quién tiene') && words.length < 8) ||
    (lower.includes('quien tiene') && words.length < 8) ||
    (lower.includes('quién mandó') && words.length < 8) ||
    (lower.includes('quien mando') && words.length < 8) ||
    (lower.includes('cuál es el presupuesto') && words.length < 8) ||
    (lower.includes('sigue estando disponible') && words.length < 8)
  );
  if (isGreetingOrTeaser) {
    return { isHollow: true, reason: `Mensaje conversacional informal o teaser sin ficha técnica: "${clean.slice(0, 60)}"` };
  }

  // Si tiene menos de 15 palabras sin enlace web:
  if (words.length < 15) {
    const hasPrice = /(?:\$|\b(?:millones|mdp|cop|pesos|canon|precio|valor|renta|arriendo)\b|\d{3,}\.\d{3})/i.test(clean);
    const hasArea = /(?:\b(?:m2|mts|metros)\b)/i.test(clean);
    const hasRooms = /(?:\b(?:alcobas?|hab(?:itaciones)?|cuartos?|dormitorios?|baños?)\b)/i.test(clean);
    const hasLocation = /(?:\b(?:calle|carrera|cll|cra|diagonal|transversal|clle|cr|chico|rosales|cabrera|nogal|cedritos|santa barbara|usaquen|suba|chapinero|salitre)\b)/i.test(clean);

    let technicalSignals = 0;
    if (hasPrice) technicalSignals++;
    if (hasArea) technicalSignals++;
    if (hasRooms) technicalSignals++;
    if (hasLocation) technicalSignals++;

    // Debe contener al menos 2 datos técnicos explícitos en el texto mismo
    if (technicalSignals < 2) {
      return {
        isHollow: true,
        reason: `Frase suelta sin ficha técnica mínima (${words.length} palabras, ${technicalSignals}/4 datos técnicos verificables): "${clean.slice(0, 60)}"`
      };
    }
  }

  return { isHollow: false, reason: 'Publicación con contenido suficiente' };
}

export function explicarMatch(requirement: any, property: any): MatchExplanation {
  const blockers: string[] = [];
  const positives: string[] = [];
  const negatives: string[] = [];

  // ── FILTRO DURO 00-HOLLOW: ANTI-PUBLICACIONES HUECAS O FRASES SUELTAS (Doctrinal v31.5) ──
  const propHollow = isHollowListing(property.rawText, property.name, property.externalUrl || property.enlace_origen);
  if (propHollow.isHollow) {
    blockers.push(`⛔ Oferta Inviable (Publicación Hueca / Frase Suelta): ${propHollow.reason}. MATCH IMPOSIBLE 0%.`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  const reqHollow = isHollowListing(requirement.rawText, requirement.name, requirement.externalUrl || requirement.enlace_origen);
  if (reqHollow.isHollow) {
    blockers.push(`⛔ Demanda Inviable (Requerimiento Hueco / Frase Suelta): ${reqHollow.reason}. MATCH IMPOSIBLE 0%.`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── FILTRO DURO 00-VETO: VETO DOCTRINAL HUMANO (JanIA Feedback Memory v31.4) ──
  if (property.id && requirement.id && isPairRejectedInMemory(property.id, requirement.id)) {
    blockers.push("⛔ Descarte Doctrinal Humano (JanIA Feedback Memory): Este emparejamiento fue descartado manualmente por el operador comercial. JanIA respeta este veto absoluto y no volverá a sugerir esta pareja. MATCH INVIABLE 0%.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── FILTRO DURO 00: PUBLICACIÓN NO INMOBILIARIA (Materiales, Canteras, etc.) ──
  if (isNonRealEstateText(requirement.rawText) || isNonRealEstateText(requirement.name) || isNonRealEstateText(property.rawText) || isNonRealEstateText(property.name)) {
    blockers.push("⛔ Publicación No Inmobiliaria: Solicitud de materiales de construcción, canteras o maquinaria. MATCH IMPOSIBLE 0%.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── FILTRO DURO 00-A: ANTI-AUTO-MATCH / ANTI-CLON (Misma Publicación o Mismo Enlace) ──
  const propRawClean = (property.rawText || property.description || property.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const reqRawClean = (requirement.rawText || requirement.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const propLink = (property.externalUrl || property.enlace_origen || "").trim().toLowerCase();
  const reqLink = (requirement.externalUrl || requirement.enlace_origen || "").trim().toLowerCase();
  const isSharedPhotoLink = propLink.length > 15 && reqLink.length > 15 && propLink === reqLink;
  const isExactClone = propRawClean.length > 30 && reqRawClean.length > 30 && (propRawClean === reqRawClean || propRawClean.includes(reqRawClean) || reqRawClean.includes(propRawClean));

  if (isExactClone || isSharedPhotoLink) {
    blockers.push("⛔ Auto-Match / Publicación Duplicada: La oferta y la demanda contienen la misma publicación clonada. MATCH IMPOSIBLE 0%.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── FILTRO DURO 0B: INCOMPATIBILIDAD GEOGRÁFICA REAL DEDUCIDA DEL TEXTO ──
  const propRealCity = extractTrueCityFromText(property.rawText || property.name, property.addressCity || property.city);
  const reqRealCity = extractTrueCityFromText(requirement.rawText || requirement.name, requirement.addressCity || requirement.ciudadDeseada);

  if (propRealCity && reqRealCity && normalizeCanonicalCity(propRealCity).toLowerCase() !== normalizeCanonicalCity(reqRealCity).toLowerCase()) {
    blockers.push(`⛔ Incompatibilidad Geográfica Real: Oferta en ${propRealCity} vs Demanda en ${reqRealCity}. MATCH IMPOSIBLE 0%.`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── FILTRO DURO 0A: DATOS EN DURO OBLIGATORIOS (Doctrinal v22.1) ──────────────────────────────
  // REGLA: Si CUALQUIERA de los datos en duro es N/E (no especificado) en el INMUEBLE o en el
  // REQUERIMIENTO, ese registro NO PUEDE participar en ningún MATCH. Score 0%. No se muestra.
  // Datos en duro: Tipo de Inmueble, Tipo de Negocio, Ciudad/Municipio, Barrio/Vereda.

  const isNA = (v: string | null | undefined) =>
    !v || v.trim() === "" || v.trim().toUpperCase() === "NA" || v.trim().toUpperCase() === "N/E"
    || v.trim().toUpperCase() === "N/A" || v.trim() === "-";

  // Tipo de Inmueble obligatorio en ambos
  let propTypeHard = property.propertyType || (property as any).tipoInmueble || (property as any).property_type || "";
  let reqTypeHard = requirement.tipoInmuebleDeseado || requirement.propertyType || (requirement as any).property_type || "";
  if (!propTypeHard && property.rawText) {
    const fb = extractFallbackDataFromText(property.rawText);
    if (fb.propertyType) propTypeHard = fb.propertyType;
  }
  if (!reqTypeHard && requirement.rawText) {
    const fb = extractFallbackDataFromText(requirement.rawText);
    if (fb.propertyType) reqTypeHard = fb.propertyType;
  }
  if (isNA(propTypeHard)) {
    blockers.push("⛔ Inmueble Incompleto: Tipo de Inmueble no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  if (isNA(reqTypeHard)) {
    blockers.push("⛔ Requerimiento Incompleto: Tipo de Inmueble deseado no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // Tipo de Negocio obligatorio en ambos
  let propBizHard = property.transactionType || (property as any).transaction_type || "";
  let reqBizHard = requirement.tipoNegocioDeseado || requirement.transactionType || (requirement as any).transaction_type || "";
  if (property.rawText) {
    const fb = extractFallbackDataFromText(property.rawText);
    if (fb.transactionType) propBizHard = fb.transactionType;
  }
  if (requirement.rawText) {
    const fb = extractFallbackDataFromText(requirement.rawText);
    if (fb.transactionType) reqBizHard = fb.transactionType;
  }
  if (isNA(propBizHard)) {
    blockers.push("⛔ Inmueble Incompleto: Tipo de Negocio no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  if (isNA(reqBizHard)) {
    blockers.push("⛔ Requerimiento Incompleto: Tipo de Negocio deseado no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // Ciudad/Municipio obligatorio en ambos (con resolución canónica de texto/zona)
  let propCityHard = property.addressCity || (property as any).address_city || property.city || "";
  if (!propCityHard || isNA(propCityHard)) {
    const rawProp = (property.rawText || property.zone || (property as any).address_neighborhood || "").toLowerCase();
    if (rawProp.includes("cali") || rawProp.includes("jamundi") || rawProp.includes("yumbo")) propCityHard = "Cali";
    else if (rawProp.includes("medellin") || rawProp.includes("envigado") || rawProp.includes("poblado") || rawProp.includes("laureles")) propCityHard = "Medellín";
    else if (rawProp.includes("chia") || rawProp.includes("cajica")) propCityHard = "Chía";
    else if (rawProp.length > 0) propCityHard = "Bogotá";
  }

  let reqCityHard = requirement.addressCity || (requirement as any).address_city || requirement.ciudadDeseada || "";
  if (!reqCityHard || isNA(reqCityHard)) {
    const rawReq = (requirement.rawText || requirement.zonaDeseada || (requirement as any).address_neighborhood || "").toLowerCase();
    if (rawReq.includes("cali") || rawReq.includes("jamundi") || rawReq.includes("yumbo")) reqCityHard = "Cali";
    else if (rawReq.includes("medellin") || rawReq.includes("envigado") || rawReq.includes("poblado") || rawReq.includes("laureles")) reqCityHard = "Medellín";
    else if (rawReq.includes("chia") || rawReq.includes("cajica")) reqCityHard = "Chía";
    else if (rawReq.length > 0) reqCityHard = "Bogotá";
  }

  if (isNA(propCityHard)) {
    blockers.push("⛔ Inmueble Incompleto: Ciudad/Municipio no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  if (isNA(reqCityHard)) {
    blockers.push("⛔ Requerimiento Incompleto: Ciudad/Municipio deseado no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // Barrio/Vereda/Caserío obligatorio en ambos
  let propBarrioHard = property.zone || property.addressNeighborhood || (property as any).address_neighborhood || "";
  let reqBarrioHard = requirement.zonaDeseada || requirement.addressNeighborhood || (requirement as any).address_neighborhood || "";
  if (property.rawText) {
    const fb = extractFallbackDataFromText(property.rawText);
    if (fb.zone && (!propBarrioHard || !property.rawText.toLowerCase().includes(propBarrioHard.toLowerCase()))) {
      propBarrioHard = fb.zone;
    }
  }
  if (requirement.rawText) {
    const fb = extractFallbackDataFromText(requirement.rawText);
    if (fb.zone && (!reqBarrioHard || !requirement.rawText.toLowerCase().includes(reqBarrioHard.toLowerCase()))) {
      reqBarrioHard = fb.zone;
    }
  }
  if (isNA(propBarrioHard)) {
    blockers.push("⛔ Inmueble Incompleto: Barrio/Vereda no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  if (isNA(reqBarrioHard)) {
    blockers.push("⛔ Requerimiento Incompleto: Barrio/Vereda deseado no especificado (N/E). No puede participar en Matches.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── FILTRO DURO 0A-BIS: DEMANDA CIEGA / SIN PARÁMETROS FÍSICOS O FINANCIEROS (Doctrinal v27.2) ──
  const reqRawCheckText = (requirement.rawText || requirement.name || "").toLowerCase();
  const hasBudgetSpec = (requirement.presupuestoMax != null && parseFloat(String(requirement.presupuestoMax)) > 0) ||
    /(?:ppto|presupuesto|hasta|valor|canon)\s*:?\s*\$?([\d.]+)/i.test(reqRawCheckText) ||
    /\$?\s*([\d.]+)\s*(?:millones|millon|mll|mlls|mm|m)\b/i.test(reqRawCheckText) ||
    /(?:abierto|sin\s*limite|ilimitado|negociable\s*sin\s*tope)/i.test(reqRawCheckText);

  const hasAreaSpec = (requirement.areaMin != null && parseFloat(String(requirement.areaMin)) > 0) ||
    /(?:m2|mts|m²|metros)/i.test(reqRawCheckText);

  const hasBedroomsSpec = (requirement.habitacionesMin != null && parseInt(String(requirement.habitacionesMin), 10) > 0) ||
    /(?:hab|habitacion|habitaciones|alcoba|alcobas|dormitorio|cuarto)/i.test(reqRawCheckText);

  if (!hasBudgetSpec && !hasAreaSpec && !hasBedroomsSpec) {
    blockers.push("⛔ Demanda con Datos Insuficientes: El requerimiento no especifica Presupuesto, Área ni Habitaciones para contrastar. Match Inviable (0%).");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── FILTRO DURO 0A-TER: INCOMPATIBILIDAD DE ESTADO DE CONSERVACIÓN (Doctrinal v27.2 / v31.4) ──
  const propRawCheckText = (property.rawText || property.description || property.name || "").toLowerCase();
  const isReqParaRemodelar = /\b(para remodelar|por remodelar|a remodelar|para reformar|a reformar|para reconstruir|destruido|precio de oportunidad|de oportunidad)\b/i.test(reqRawCheckText);
  const isPropRemodelado = /\b(remodelad[oa]|totalmente remodelad[oa]|completamente remodelad[oa]|estrenar|para estrenar|a estrenar|nuevo|sobre planos)\b/i.test(propRawCheckText);
  const isPropParaRemodelar = /\b(para remodelar|por remodelar|a remodelar|para reformar|a reformar|remodelar|para actualizar|por actualizar|a actualizar|en obra gris|en obra negra|antiguo sin remodelar)\b/i.test(propRawCheckText);
  const isReqModernoOEstrenar = /\b(moderno[s]?|moderna[s]?|contempor[aá]neo[s]?|excelentes acabados|acabados de lujo|full acabados|acabados modernos|estilo moderno|para estrenar|a estrenar|estrenar|nuevo|sobre planos|no remodelar|no para remodelar|cero remodelaci[oó]n|sin remodelar nada)\b/i.test(reqRawCheckText);

  if (isReqParaRemodelar && isPropRemodelado && !isPropParaRemodelar) {
    blockers.push("⛔ Incompatibilidad de Estado del Inmueble (Tolerancia Cero 0%): Requerimiento exige inmueble 'Para Remodelar / Precio de Oportunidad' y la oferta es un inmueble 'Ya Remodelado / A Estrenar'. Match Inviable (0%).");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  if (isReqModernoOEstrenar && isPropParaRemodelar && !isPropRemodelado) {
    blockers.push("⛔ Incompatibilidad de Estado del Inmueble (Tolerancia Cero 0% Doctrinal v31.4): El requerimiento exige expresamente inmueble 'Moderno / A Estrenar / Excelentes Acabados' y la oferta es 'Para Remodelar / Por Actualizar'. Match Inviable (0%).");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── CAMPO 4: Localidad / Comuna — BLOQUEADOR DURO (Doctrinal v22.1) ──
  // Si AMBOS tienen Localidad/Comuna y son distintas → 0% ABSOLUTO. No se almacena ni muestra.
  // Nota: La localidad se deduce del barrio via deducirGeografiaTripartita en janIA.ts.
  // Si el barrio coincide, la localidad siempre coincide. Este filtro atrapa inconsistencias.
  const propLocalidadHard = property.addressLocality || "";
  const reqLocalidadHard = requirement.addressLocality || "";
  const bothLocalidadKnown = !isNA(propLocalidadHard) && !isNA(reqLocalidadHard);
  if (bothLocalidadKnown) {
    const normPropLoc = normalizarTextoGeografico(propLocalidadHard);
    const normReqLoc = normalizarTextoGeografico(reqLocalidadHard);
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
  const isReqOpenBudget = /(?:ppto|presupuesto|canon|precio|valor)\s*(?:es\s*)?:?\s*(?:abierto|sin\s*l[ií]mite|ilimitado|negociable\s*sin\s*tope)\b/i.test(reqTextLow);
  const hasReqBudget = budgetMaxCheck > 0 || isReqOpenBudget;

  if (isReqOpenBudget) {
    positives.push("💰 Presupuesto Abierto en la Demanda: 100% de Cumplimiento Financiero / Sin Restricción de Presupuesto.");
  }

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
  let reqBiz = (requirement.tipoNegocioDeseado || requirement.transactionType || "").toLowerCase();
  let propBiz = (property.transactionType || "").toLowerCase();
  if (property.rawText) {
    const fb = extractFallbackDataFromText(property.rawText);
    if (fb.transactionType) propBiz = fb.transactionType.toLowerCase();
  }
  if (requirement.rawText) {
    const fb = extractFallbackDataFromText(requirement.rawText);
    if (fb.transactionType) reqBiz = fb.transactionType.toLowerCase();
  }
  const propAccepted: string[] = Array.isArray(property.acceptedTransactionTypes)
    ? (property.acceptedTransactionTypes as string[]).map((t: string) => t.toLowerCase())
    : [];

  const transactionCompatible = checkTransactionCompatibility(reqBiz, propBiz, propAccepted);
  if (!transactionCompatible) {
    blockers.push(`Incompatibilidad de negocio: buscado '${reqBiz}', ofrecido '${propBiz}'`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  positives.push(`Tipo de negocio compatible: req='${reqBiz}' ↔ prop='${propBiz}'`);

  // ── FILTRO DURO 1.5: Inmueble Vendido Ocupado/Rentando (Solo Inversionista) vs Comprador con Crédito/Habitar ──
  const propTextCleanLow = (property.rawText || property.description || property.name || "").toLowerCase();
  const reqTextCleanLow = (requirement.rawText || requirement.name || "").toLowerCase();
  const isPropInvestorOnly = /\b(?:para inversionista|inversionistas|arrendado|rentando actualmente|con contrato vigente)\b/i.test(propTextCleanLow) && !/\b(?:desocupado|entrega inmediata|libre|para habitar)\b/i.test(propTextCleanLow);
  const isReqCreditOrHabitar = /\b(?:cr[eé]dito|crédito bancolombia|crédito davivienda|crédito hipotecario|para habitar|para vivir|entrega inmediata)\b/i.test(reqTextCleanLow);
  if (isPropInvestorOnly && isReqCreditOrHabitar) {
    blockers.push("Incompatibilidad de Condición: Oferta se vende ocupada/rentando (Solo para Inversionista) vs Demanda busca predio con crédito/entrega para habitar.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

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

  const reqCityNorm = normalizarTextoGeografico(reqCity);
  const propCityNorm = normalizarTextoGeografico(propCity);

  const propBarriosInText = extractAllBarriosFromText((property as any).rawText || (property as any).description || property.name || "");
  const reqBarriosInText = extractAllBarriosFromText((requirement as any).rawText || (requirement as any).description || requirement.name || "");

  const rawPropBarrio = propBarriosInText[0] || property.zone || property.addressNeighborhood || "";
  const rawReqBarriosList = reqBarriosInText.length > 0
    ? reqBarriosInText
    : [requirement.zonaDeseada || requirement.addressNeighborhood || ""].filter(Boolean);

  const reqLocality = requirement.addressLocality || requirement.localidadDeseada || "";
  const propLocality = property.addressLocality || property.locality || "";

  let geoValidation = { matches: false, score: 0 };
  const barriosToTest = rawReqBarriosList.length > 0 ? rawReqBarriosList : [""];
  for (const rBarrio of barriosToTest) {
    const res = matchesGeography(
      rBarrio,
      rawPropBarrio,
      reqLocality,
      propLocality,
      reqCity,
      propCity,
      (requirement as any).rawText || requirement.name || "",
      (property as any).rawText || (property as any).description || property.name || ""
    );
    if (res.matches) {
      geoValidation = res;
      break;
    }
  }

  if (!geoValidation.matches) {
    blockers.push(`⛔ Geografía Incompatible: Requerimiento="${rawReqBarriosList.join(', ') || reqCity}" ≠ Oferta="${rawPropBarrio || propCity}". MATCH IMPOSIBLE (0%).`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  positives.push(`Geografía compatible: ${rawPropBarrio || propCity} (${geoValidation.score} pts)`);




  function isPhoneNumberNotPrice(val: number | string | null | undefined, rawText?: string): boolean {
    if (val === undefined || val === null || val === "" || val === 0 || val === "0") return false;
    const numStr = String(val).replace(/\D/g, "");

    // Si termina en 5 o más ceros (ej: 3.500.000.000, 3.000.000.000, 3.200.000.000), es un PRECIO o PRESUPUESTO en miles de millones, NUNCA un teléfono
    if (/000000$/.test(numStr) || /00000$/.test(numStr)) {
      return false;
    }

    if (numStr.length === 10 && numStr.startsWith("3")) {
      if (rawText && /(?:\$|precio|valor|ppto|presupuesto|canon|hasta|venta)\s*3\d{9}/i.test(rawText)) return false;
      return true;
    }
    if (numStr.length === 12 && numStr.startsWith("573")) {
      if (rawText && /(?:\$|precio|valor|ppto|presupuesto|canon|hasta|venta)\s*573\d{9}/i.test(rawText)) return false;
      return true;
    }
    if (rawText) {
      const rawLower = rawText.toLowerCase();
      if (rawLower.includes(numStr) && numStr.length >= 8) {
        if (/wa|whatsapp|cel|celular|tel|telefono|teléfono|contacto|llamar/i.test(rawLower)) return true;
      }
    }
    return false;
  }

  let price = parseFloat(String(property.price || "0"));
  let budgetMax = parseFloat(String(requirement.presupuestoMax || "0"));
  const budgetMin = parseFloat(String(requirement.presupuestoMin || "0"));

  if (isPhoneNumberNotPrice(price, property.rawText)) price = 0;
  if (isPhoneNumberNotPrice(budgetMax, requirement.rawText)) budgetMax = 0;

  // ── SANIDAD PREDIAL DE PRECIOS EN EL MOTOR v20.0 / v25.4 / v31.3 ──────────────────────────────
  const isSaleMatch = (property.transactionType || "").toLowerCase().includes("venta") || !(property.transactionType || "").toLowerCase().includes("arriendo");
  if (isSaleMatch) {
    if ((price <= 0 || price < 30_000_000) && property.rawText) {
      const fbP = extractFallbackDataFromText(property.rawText);
      if (fbP.price >= 30_000_000) {
        price = fbP.price;
        if ((!property.adminFee || parseFloat(String(property.adminFee)) <= 0) && fbP.adminFee > 0) {
          (property as any).adminFee = fbP.adminFee;
        }
      } else {
        price = 0; // En venta, valores < 30M son cuotas de administración o residuos, NUNCA precio de venta
      }
    } else if (price > 0 && price < 30_000_000) {
      price = 0;
    }
  }

  // Sanidad Predial de Precios y Presupuestos:
  let isReqRent = (requirement.tipoNegocioDeseado || requirement.transactionType || "").toLowerCase().includes("arriendo");

  let reqAreaMin = parseFloat(String(requirement.areaMin || requirement.areaMinimaM2 || "0"));
  let reqAreaMax = 0;
  let pBedrooms = property.bedrooms != null ? Number(property.bedrooms) : -1;
  let reqBedrooms = requirement.habitacionesMin != null ? Number(requirement.habitacionesMin) : -1;
  let pBathrooms = property.bathrooms != null ? Number(property.bathrooms) : -1;
  let reqBathrooms = requirement.banosMin != null ? Number(requirement.banosMin) : -1;
  let pGarages = property.garages != null ? Number(property.garages) : -1;
  let reqGarages = requirement.parqueaderosMin != null ? Number(requirement.parqueaderosMin) : -1;

  if (requirement.rawText) {
    const fbR = extractFallbackDataFromText(requirement.rawText);
    if (budgetMax <= 0 || (isReqRent && budgetMax > 50_000_000) || (!isReqRent && budgetMax < 100_000_000)) {
      if (fbR.presupuestoMax >= 300_000) {
        budgetMax = fbR.presupuestoMax;
      }
    }
    if (reqAreaMin <= 0 && fbR.areaMin) {
      reqAreaMin = fbR.areaMin;
    }
    if (fbR.areaMax) {
      reqAreaMax = fbR.areaMax;
    }
    if (reqBedrooms <= 0 && fbR.bedroomsMin) {
      reqBedrooms = fbR.bedroomsMin;
    }
    if (reqBathrooms <= 0 && fbR.bathrooms) {
      reqBathrooms = fbR.bathrooms;
    }
    if (reqGarages <= 0 && fbR.garages) {
      reqGarages = fbR.garages;
    }
  }

  let propArea = parseFloat(String(property.areaTotal || property.area || "0"));
  if (property.rawText) {
    const fbP = extractFallbackDataFromText(property.rawText);
    if (price <= 0 && fbP.price) price = fbP.price;
    if (propArea <= 0 && fbP.area) propArea = fbP.area;
    if (pBedrooms <= 0 && fbP.bedrooms) pBedrooms = fbP.bedrooms;
    if (pBathrooms <= 0 && fbP.bathrooms) pBathrooms = fbP.bathrooms;
    if (pGarages <= 0 && fbP.garages) pGarages = fbP.garages;
  }

  const pAdminFee = property.adminFee != null ? parseFloat(String(property.adminFee)) : -1;
  const reqAdminMax = requirement.adminFeeMax != null ? parseFloat(String(requirement.adminFeeMax)) : -1;

  const pEstrato = property.stratum != null ? Number(property.stratum) :
    property.estrato != null ? Number(property.estrato) : -1;
  const reqEstrato = requirement.estratoDeseado != null ? Number(requirement.estratoDeseado) : -1;

  const reqType = (requirement.tipoInmuebleDeseado || requirement.propertyType || "").toLowerCase().trim();
  const propType = (property.propertyType || "").toLowerCase().trim();

  const reqZone = normalizarTextoGeografico(requirement.zonaDeseada || requirement.addressNeighborhood || "");
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

  // ── REVISIÓN DE CONTACTO: Teléfono de Contacto (Informativo / Prioridad) ──
  const propRealPhone = extractRealPhone(property);
  const reqRealPhone = extractRealPhone(requirement);

  if (!propRealPhone || !reqRealPhone) {
    negatives.push("Teléfono de contacto directo pendiente por verificar en una de las partes.");
  } else {
    positives.push(`Contacto verificado: +${reqRealPhone} ↔ +${propRealPhone}`);
  }

  // ── FILTRO DURO 0C: Oferta sin precio vs Demanda con Presupuesto Especificado (Tolerancia Cero 0%) ──
  const effectivePropPriceForCheck = isSaleMatch ? price : (price > 0 ? price : (property.rentPrice ? parseFloat(String(property.rentPrice)) : 0));
  if (budgetMax > 0 && effectivePropPriceForCheck <= 0) {
    blockers.push("Match inviable: La oferta NO especifica precio comercial válido (N/E) y el requerimiento exige presupuesto.");
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

  if (reqFilledCount < 3 || propFilledCount < 3) {
    blockers.push(`Ficha poco robusta (Demanda: ${reqFilledCount}/8 especificaciones, Oferta: ${propFilledCount}/8 especificaciones). Se requieren publicaciones con datos básicos mínimos (al menos 3 especificaciones).`);
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

  // ── FILTRO DURO 3: Tipo de Inmueble y Compatibilidad de Uso de Suelo (Tolerancia Cero v29.0) ──
  // Taxonomía completa Colombia: Ley 388/1997 + tipologías comerciales y residenciales
  const deduceFullType = (typeRaw: string, text: string): string => {
    const t = (typeRaw || "").toLowerCase().trim();
    // ── Tipos exactos por BD ──
    if (t === "consultorio") return "consultorio";
    if (t === "warehouse" || t === "bodega") return "warehouse";
    if (t === "office" || t === "oficina") return "office";
    if (t === "commercial" || t === "local") return "commercial";
    if (t === "farm" || t === "finca") return "farm";
    if (t === "land" || t === "lote" || t === "terreno" || t === "predio") return "land";
    if (t === "building" || t === "edificio") return "building";
    if (t === "hotel" || t === "hostal" || t === "aparta_hotel" || t === "motel" || t === "aparta_suit") return "hotel";
    if (t === "cabin" || t === "cabaña") return "cabin";
    if (t === "loft" || t === "apartaestudio" || t === "apartasuite" || t === "aparta_suite") return "loft";
    if (t === "villa") return "villa";
    if (t === "house" || t === "casa" || t.includes("casa_")) return "house";
    if (t === "penthouse" || t === "pent_house" || t === "ph") return "apartment";

    const clean = (text || "").toLowerCase().trim().replace(/[\s\-_,.]+/g, " ");
    // Consultorios / clínicas
    if (clean.includes("consultorio") || clean.includes("consultorios") || clean.includes("odontol") || clean.includes("medic")) {
      return "consultorio";
    }
    // Bodega industrial
    if (clean.includes("bodega") || clean.includes("bodegas") || clean.includes("warehouse")) {
      return "warehouse";
    }
    // Local comercial (antes de "oficina" para no colisionar)
    if (clean.includes("local comercial") || clean.includes("locales comerciales") || /\blocal\b/.test(clean) || /\blocales\b/.test(clean)) {
      return "commercial";
    }
    // Oficinas / edificio de oficinas
    if (clean.includes("oficina") || clean.includes("oficinas") || /\boffice\b/.test(clean)) {
      return "office";
    }
    // Villa
    if (/\bvilla\b/.test(clean) && !clean.includes("villa magdala") && !clean.includes("villa santos") && !clean.includes("villavicencio")) {
      return "villa";
    }
    // Hotel / hostal / aparta-hotel / motel / aparta-suite
    if (clean.includes("aparta hotel") || clean.includes("aparta-hotel") || clean.includes("apartahotel") ||
        clean.includes("aparta suit") || clean.includes("aparta-suit") || clean.includes("apartasuit") ||
        clean.includes("motel") || clean.includes("hostal") || clean.includes("hostel")) {
      return "hotel";
    }
    if (/\bhotel\b/.test(clean)) return "hotel";
    // Casa (todas sus subclases: conjunto, condominio, barrio, campestre, quinta)
    // IMPORTANTE: Verificar primero que no sea apartamento
    if ((clean.includes("casa") || clean.includes("townhouse") || clean.includes("chalet") || clean.includes("house")) &&
        !clean.includes("apartamento") && !clean.includes("apto")) {
      return "house";
    }
    // Cabaña
    if (clean.includes("cabaña") || clean.includes("cabana") || clean.includes("cabañas") || clean.includes("cabin")) {
      return "cabin";
    }
    // Finca / casa campestre
    if (clean.includes("finca") || clean.includes("farm") || (clean.includes("campestre") && !clean.includes("casa campestre"))) {
      return "farm";
    }
    // Lote / Terreno / Suelo (Urbano, Rural, Expansión, Suburbano, Protección)
    if (clean.includes("lote") || clean.includes("terreno") || clean.includes("predio") || clean.includes("land") ||
        clean.includes("suelo urbano") || clean.includes("suelo rural") || clean.includes("suelo suburbano") ||
        clean.includes("suelo expansion") || clean.includes("suelo de expansion") || clean.includes("suelo proteccion")) {
      return "land";
    }
    // Apartaestudio / Loft / Apartasuite (subclase residencial)
    if (clean.includes("apartaestudio") || clean.includes("aparta estudio") || clean.includes("apartasuite") ||
        clean.includes("aparta suite") || clean.includes("loft")) {
      return "loft";
    }
    // Apartamento (estándar, dúplex, penthouse, PH, apartamento en edificio)
    if (clean.includes("apartamento") || clean.includes("apto") || clean.includes("penthouse") ||
        clean.includes("pent house") || /\bph\b/.test(clean) || clean.includes("apartment")) {
      return "apartment";
    }
    // Edificio (completo, residencial o comercial)
    if (clean.includes("se vende edificio") || clean.includes("edificio en venta") || clean.includes("edificio completo") ||
        clean.includes("building") || clean.startsWith("edificio")) {
      return "building";
    }
    return "apartment";
  };

  const effectivePropType = deduceFullType(propType, property.rawText || property.name || property.description || "");
  const effectiveReqType = deduceFullType(reqType, requirement.rawText || requirement.name || "");

  // CATEGORÍAS DE USO (TOLERANCIA CERO: UN APARTAMENTO NUNCA ES UN CONSULTORIO U OFICINA)
  const RESIDENCIALES = new Set(["apartment", "house", "loft", "cabin"]);
  const NO_RESIDENCIALES = new Set(["consultorio", "office", "commercial", "warehouse", "land", "farm"]);

  // BLOQUEO DURO: Residencial vs No Residencial (Consultorio, Local, Bodega, Oficina)
  if (
    (RESIDENCIALES.has(effectiveReqType) && NO_RESIDENCIALES.has(effectivePropType)) ||
    (NO_RESIDENCIALES.has(effectiveReqType) && RESIDENCIALES.has(effectivePropType))
  ) {
    blockers.push(`Incompatibilidad de uso de suelo y tipología (Tolerancia Cero 0%): Requerimiento ${effectiveReqType} (no residencial) vs Inmueble ${effectivePropType} (residencial).`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // BLOQUEO DURO: Lote / Terreno
  if (
    (effectiveReqType === "land" && effectivePropType !== "land") ||
    (effectivePropType === "land" && effectiveReqType !== "land")
  ) {
    blockers.push(`Incompatibilidad de tipología: Lote/Terreno no coincide con inmueble edificado (${effectivePropType} ↔ ${effectiveReqType}).`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // BLOQUEO DURO: Bodega vs Consultorio / Oficina
  if (
    (effectiveReqType === "warehouse" && effectivePropType !== "warehouse") ||
    (effectivePropType === "warehouse" && effectiveReqType !== "warehouse")
  ) {
    blockers.push(`Incompatibilidad de tipología: Bodega industrial no coincide con ${effectivePropType === "warehouse" ? effectiveReqType : effectivePropType}.`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  if (effectiveReqType && effectivePropType) {
    const aliases: Record<string, string[]> = {
      "apartamento": ["apto", "apartamento", "apartment"],
      "apto": ["apto", "apartamento", "apartment"],
      "apartment": ["apto", "apartamento", "apartment"],
      "casa": ["casa", "house", "townhouse"],
      "house": ["casa", "house", "townhouse"],
      "finca": ["finca", "finca raiz", "finca raíz", "farm", "casa campestre", "casa de campo"],
      "farm": ["finca", "finca raiz", "finca raíz", "farm", "casa campestre", "casa de campo"],
      "lote": ["lote", "terreno", "predio", "land"],
      "terreno": ["lote", "terreno", "predio", "land"],
      "predio": ["lote", "terreno", "predio", "land"],
      "land": ["lote", "terreno", "predio", "land"],
      "bodega": ["bodega", "bodega industrial", "warehouse"],
      "warehouse": ["bodega", "bodega industrial", "warehouse"],
      "local": ["local", "local comercial", "commercial"],
      "commercial": ["local", "local comercial", "commercial"],
      "oficina": ["oficina", "office"],
      "office": ["oficina", "office"],
      "consultorio": ["consultorio"],
      "building": ["building", "edificio"],
      "edificio": ["building", "edificio"],
      "hotel": ["hotel", "hostal"],
      "cabin": ["cabin", "cabaña", "cabana"],
      "cabaña": ["cabin", "cabaña", "cabana"],
      "loft": ["loft", "apartaestudio", "apartasuite"],
      "apartaestudio": ["loft", "apartaestudio", "apartasuite"],
    };
    const reqAlias = aliases[effectiveReqType] || [effectiveReqType];
    const propAlias = aliases[effectivePropType] || [effectivePropType];

    // Compatibilidad doctrinal: Apartaestudio / Loft es subclase residencial de 1 alcoba
    const isLoftProp = (aliases["loft"] || []).includes(effectivePropType);
    const isLoftReq = (aliases["loft"] || []).includes(effectiveReqType);
    const isAptoProp = (aliases["apartment"] || []).includes(effectivePropType);
    const isAptoReq = (aliases["apartment"] || []).includes(effectiveReqType);

    const isLoftAptoCrossCompatible = 
      (isLoftReq && isAptoProp && (pBedrooms <= 1 || propArea <= 65 || propArea === 0)) ||
      (isAptoReq && isLoftProp && (reqBedrooms <= 1 || reqAreaMin <= 65 || reqAreaMin === 0));

    if (!reqAlias.some(a => propAlias.includes(a)) && !isLoftAptoCrossCompatible) {
      blockers.push(`Tipo de activo incompatible (Tolerancia Cero 0%): deseado ${effectiveReqType}, ofrecido ${effectivePropType}`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }

  // ── REGLA DOCTRINAL v22.8 / v26.7: SUBTIPOS EXACTOS DE PROPIEDAD ──
  // Categorías: Apartaestudio/Apartasuite/Loft ≠ Apartamento Estándar ≠ PentHouse ≠ Dúplex/Tríplex ≠ Casa Urbana ≠ Casa Campestre/Finca
  const cleanText = (t: string) => (t || "").toLowerCase().trim().replace(/[\s\-_,.]+/g, " ");
  const reqRawText = cleanText(requirement.rawText || requirement.name || "");
  const propRawText = cleanText(property.rawText || property.name || "");

  const getHorizontalPropertySubtype = (type: string, raw: string): string => {
    const t = (type || "").toLowerCase().trim();
    const r = (raw || "").toLowerCase().trim();

    // ── HOTELES y ALOJAMIENTO (antes de todo para evitar colisiones) ──
    if (t === "hotel" || r.includes("hotel") || r.includes("hostal") || r.includes("aparta hotel") ||
        r.includes("aparta suit") || r.includes("motel")) {
      if (r.includes("aparta hotel") || r.includes("apartahotel") || r.includes("aparta-hotel")) return "aparta_hotel";
      if (r.includes("aparta suit") || r.includes("apartasuite") || r.includes("aparta-suit")) return "aparta_suit";
      if (r.includes("motel")) return "motel";
      if (r.includes("hostal") || r.includes("hostel")) return "hostal";
      return "hotel";
    }

    // ── VILLA ──
    if (t === "villa" || (/\bvilla\b/.test(r) && !r.includes("villa magdala") && !r.includes("villavicencio"))) {
      return "villa";
    }

    // ── BODEGA INDUSTRIAL ──
    if (t === "warehouse" || t === "bodega" || r.includes("bodega")) return "bodega";

    // ── LOCAL COMERCIAL ──
    if (t === "commercial" || t === "local" || r.includes("local comercial") || /\blocal\b/.test(r)) return "local";

    // ── OFICINA / EDIFICIO DE OFICINAS ──
    if (t === "office" || r.includes("oficina")) {
      if (r.includes("edificio")) return "edificio_oficinas";
      return "oficina";
    }

    // ── EDIFICIO (Residencial o Comercial) ──
    if (t === "building" || r.includes("edificio")) {
      if (r.includes("apartamento") || r.includes("apto") || r.includes("residencial")) return "edificio_residencial";
      if (r.includes("oficina") || r.includes("local") || r.includes("comercial")) return "edificio_comercial";
      return "edificio";
    }

    // ── LOTE / TERRENO — Subclases según Ley 388/1997 ──
    if (t === "land" || r.includes("lote") || r.includes("terreno") || r.includes("predio")) {
      if (r.includes("suelo rural") || r.includes("rural")) return "lote_rural";
      if (r.includes("suelo suburbano") || r.includes("suburbano") || r.includes("campestre")) return "lote_suburbano";
      if (r.includes("suelo expansion") || r.includes("expansion urbana")) return "lote_expansion";
      if (r.includes("suelo proteccion") || r.includes("proteccion ambiental") || r.includes("reserva")) return "lote_proteccion";
      return "lote_urbano"; // Default: suelo urbano
    }

    // ── FINCA / CASA CAMPESTRE ──
    if (t === "farm" || t === "finca" || r.includes("finca") || r.includes("casa de campo")) {
      return "finca";
    }

    // ── CABAÑA ──
    if (t === "cabin" || r.includes("cabaña") || r.includes("cabana")) return "cabaña";

    // ── APARTAESTUDIO / LOFT / APARTA-SUITE ──
    if (r.includes("apartaestudio") || r.includes("aparta estudio") ||
        r.includes("suite ejecutiva") || r.includes("alcoba independiente") ||
        t === "apartaestudio" || t === "studio") {
      return "apartaestudio";
    }
    if (r.includes("loft") || t === "loft") return "loft";

    // ── PENTHOUSE / PH (Dúplex o Estándar) ──
    const isPH = r.includes("penthouse") || r.includes("pent house") || /\bph\b/.test(r) || t === "penthouse";
    const isDuplex = r.includes("duplex") || r.includes("dúplex") || r.includes("triplex") || r.includes("tríplex");
    if (isPH && isDuplex) return "penthouse_duplex";
    if (isPH) return "penthouse";
    if (isDuplex) return "apartamento_duplex";

    // ── CASAS — Subclases completas ──
    if (t === "house" || t === "casa" || r.includes("casa")) {
      // Casa Campestre en Condominio o Conjunto
      if ((r.includes("campestre") || r.includes("campo")) && (r.includes("conjunto") || r.includes("condominio"))) return "casa_campestre_condominio";
      // Casa Campestre sola
      if (r.includes("campestre") || r.includes("finca raiz") || r.includes("finca raíz")) return "casa_campestre";
      // Casa Quinta (grande, con jardines extensos)
      if (r.includes("quinta") || r.includes("mansion")) return "casa_quinta";
      // Casa de Condominio (cerrado, puertas privadas, sin portería común)
      if (r.includes("condominio")) return "casa_condominio";
      // Casa de Conjunto (portería compartida, zonas comunes)
      if (r.includes("conjunto") || r.includes("unidad") || r.includes("urbanizacion") || r.includes("urbanización")) return "casa_conjunto";
      // Casa de Barrio (sin conjunto ni condominio)
      if (r.includes("barrio") || (!r.includes("conjunto") && !r.includes("condominio"))) return "casa_barrio";
      return "casa_urbana";
    }

    // ── APARTAMENTO ESTÁNDAR (default residencial) ──
    if (t === "apartment" || t === "apartamento" || t === "apto") {
      return "apartamento_estandar";
    }

    return t;
  };

  // Grupo de compatibilidad de subtipos (subtipos que pueden emparejarse entre sí)
  const SUBTYPE_COMPATIBILITY_GROUPS: Record<string, string[]> = {
    // Casas — todas las subclases son compatibles entre sí cuando el req no especifica subclase
    "casa_urbana": ["casa_urbana", "casa_barrio", "casa_conjunto", "casa_condominio"],
    "casa_barrio": ["casa_urbana", "casa_barrio"],
    "casa_conjunto": ["casa_urbana", "casa_barrio", "casa_conjunto", "casa_condominio"],
    "casa_condominio": ["casa_urbana", "casa_barrio", "casa_conjunto", "casa_condominio"],
    "casa_campestre": ["casa_campestre", "casa_campestre_condominio", "casa_quinta", "finca"],
    "casa_campestre_condominio": ["casa_campestre", "casa_campestre_condominio", "casa_quinta"],
    "casa_quinta": ["casa_campestre", "casa_campestre_condominio", "casa_quinta"],
    "finca": ["finca", "casa_campestre", "casa_campestre_condominio"],
    // Apartamentos — estándar y dúplex son compatibles; penthouse NO es estándar
    "apartamento_estandar": ["apartamento_estandar", "apartamento_duplex"],
    "apartamento_duplex": ["apartamento_estandar", "apartamento_duplex"],
    "penthouse": ["penthouse", "penthouse_duplex"],
    "penthouse_duplex": ["penthouse", "penthouse_duplex"],
    // Lotes — todos son incompatibles entre sí excepto dentro de la misma familia
    "lote_urbano": ["lote_urbano"],
    "lote_rural": ["lote_rural", "lote_suburbano"],
    "lote_suburbano": ["lote_rural", "lote_suburbano"],
    "lote_expansion": ["lote_expansion"],
    "lote_proteccion": ["lote_proteccion"],
    // Hoteles y alojamiento
    "hotel": ["hotel", "hostal", "aparta_hotel", "aparta_suit", "motel"],
    "hostal": ["hotel", "hostal"],
    "aparta_hotel": ["aparta_hotel", "aparta_suit", "hotel"],
    "aparta_suit": ["aparta_hotel", "aparta_suit", "hotel"],
    "motel": ["motel"],
    // Edificios
    "edificio": ["edificio", "edificio_residencial", "edificio_comercial", "edificio_oficinas"],
    "edificio_residencial": ["edificio", "edificio_residencial"],
    "edificio_comercial": ["edificio", "edificio_comercial", "edificio_oficinas"],
    "edificio_oficinas": ["edificio", "edificio_comercial", "edificio_oficinas", "oficina"],
  };

  const reqSubtype = getHorizontalPropertySubtype(reqType, reqRawText);
  const propSubtype = getHorizontalPropertySubtype(propType, propRawText);

  if (reqSubtype && propSubtype && reqSubtype !== propSubtype) {
    // Verificar grupo de compatibilidad antes de bloquear
    const compatGroup = SUBTYPE_COMPATIBILITY_GROUPS[reqSubtype];
    const isCompatibleSubtype = compatGroup ? compatGroup.includes(propSubtype) : false;
    if (!isCompatibleSubtype) {
      blockers.push(`Subtipo de activo incompatible (Tolerancia Cero 0%): Requerimiento exige estrictamente '${reqSubtype}' y la oferta es '${propSubtype}'. No clasifica para Match.`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }

  positives.push(`Tipo de activo compatible: ${propSubtype || propType}`);

  // ── FILTRO DURO 4: Ubicación / Barrio Estricto (Incluye cuadrante perimetral) ──
  let geoResult = { matches: false, score: 0 };
  for (const rBarrio of barriosToTest) {
    const res = matchesGeography(
      rBarrio,
      rawPropBarrio,
      requirement.addressLocality || "",
      property.addressLocality || "",
      requirement.ciudadDeseada || requirement.city || "",
      property.addressCity || property.city || "",
      (requirement as any).rawText || requirement.name || "",
      (property as any).rawText || (property as any).description || property.name || ""
    );
    if (res.matches) {
      geoResult = res;
      break;
    }
  }

  if (!geoResult.matches) {
    blockers.push(`Ubicación incompatible: requerida zona '${rawReqBarriosList.join(', ') || ""}', ofrecida '${rawPropBarrio || ""}'`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  positives.push(`Ubicación compatible en zona: ${rawPropBarrio || ""}`);

  // ── FILTRO DURO 5: Estrato ──
  if (reqEstrato >= 1 && pEstrato >= 1 && reqEstrato !== pEstrato) {
    blockers.push(`Estrato incompatible: deseado ${reqEstrato}, ofrecido ${pEstrato}`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── FILTRO DURO 6: Área (REGLA DOCTRINAL v27.4: Mínimo exigido con Tolerancia 0% e Inmueble dentro de Rango) ──
  if (reqAreaMin > 0) {
    if (propArea > 0) {
      if (propArea < reqAreaMin) {
        blockers.push(`Guillotina de Área Estricta (Tolerancia 0%): Área ofrecida (${propArea} m²) es inferior al mínimo exigido (${reqAreaMin} m²). Match inviable (0%).`);
        return buildExplanationResult(0, blockers, positives, negatives);
      }
      if (reqAreaMax > 0 && propArea > reqAreaMax * 1.35) {
        blockers.push(`Guillotina de Área Estricta: Área ofrecida (${propArea} m²) excede desproporcionadamente (+35%) el rango máximo buscado (${reqAreaMax} m²). Match inviable (0%).`);
        return buildExplanationResult(0, blockers, positives, negatives);
      }
      positives.push(`✅ Área de ${propArea} m² cumple plenamente el requerimiento mínimo (${reqAreaMin} m²)`);
    } else {
      blockers.push(`No se puede verificar el área requerida (${reqAreaMin} m²) por falta de información en la oferta.`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }


  // ── FILTRO DURO 7: Presupuesto (REGLA DOCTRINAL: Máximo 1% por debajo o igual, si sobrepasa = 0%) ──
  if (isReqOpenBudget) {
    positives.push(`✅ Presupuesto Abierto en la Demanda: 100% de Cumplimiento Financiero con el valor comercial ofertado.`);
  } else if (budgetMax > 0) {
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

      const budgetMin = requirement.presupuestoMin ? parseFloat(String(requirement.presupuestoMin)) : 0;

      if (totalRent > budgetMax) {
        blockers.push(`Guillotina Financiera (Tolerancia Cero): Canon de arriendo total ($${totalRent.toLocaleString()}) supera el presupuesto máximo de $${budgetMax.toLocaleString()}`);
        return buildExplanationResult(0, blockers, positives, negatives);
      }

      if (budgetMin > 0) {
        const lowerRentLimit = budgetMin * 0.95;
        if (totalRent < lowerRentLimit) {
          blockers.push(`Guillotina Financiera: Canon de arriendo total ($${totalRent.toLocaleString()}) está por debajo del segmento solicitado (mínimo $${lowerRentLimit.toLocaleString()}).`);
          return buildExplanationResult(0, blockers, positives, negatives);
        }
        positives.push(`✅ Presupuesto de arriendo cumple: Total $${totalRent.toLocaleString()} dentro del rango (mín $${lowerRentLimit.toLocaleString()} a máx $${budgetMax.toLocaleString()})`);
      } else {
        positives.push(`✅ Presupuesto de arriendo cumple: Total $${totalRent.toLocaleString()} dentro del presupuesto máximo ($${budgetMax.toLocaleString()})`);
      }
    } else {
      // Para Compras / Ventas:
      const budgetMin = requirement.presupuestoMin ? parseFloat(String(requirement.presupuestoMin)) : 0;
      let salePrice = price;

      if (salePrice <= 0 || salePrice < 30_000_000) {
        blockers.push(`Guillotina Financiera (Tolerancia Cero): La oferta no especifica un precio de venta comercial válido (N/E o menor a $30M) para contrastar con el presupuesto máximo de $${budgetMax.toLocaleString()}. Match inviable (0%).`);
        return buildExplanationResult(0, blockers, positives, negatives);
      }

      if (salePrice > budgetMax) {
        blockers.push(`Guillotina Financiera (Tolerancia Cero): El precio de la propiedad ($${salePrice.toLocaleString()}) supera el presupuesto máximo del comprador ($${budgetMax.toLocaleString()}). Match inviable (0%).`);
        return buildExplanationResult(0, blockers, positives, negatives);
      }

      if (budgetMin > 0) {
        const lowerSaleLimit = budgetMin * 0.95;
        if (salePrice < lowerSaleLimit) {
          blockers.push(`Guillotina Financiera: El precio del inmueble ($${salePrice.toLocaleString()}) está por debajo del segmento solicitado (mínimo $${lowerSaleLimit.toLocaleString()}).`);
          return buildExplanationResult(0, blockers, positives, negatives);
        }
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
    else if (/\b(?:parqueaderos|garajes|estacionamientos|pks)\b/i.test(reqTextLow)) {
      effectiveReqGarages = 2; // "garajes" en plural sin número -> exige mínimo 2
    }
  }

  // ── FILTRO DE ADMINISTRACIÓN MÁXIMA (Presupuesto de Administración) ──
  let reqAdminMaxVal = requirement.adminFeeMax ? parseFloat(String(requirement.adminFeeMax)) : 0;
  if (reqAdminMaxVal <= 0 && requirement.rawText) {
    const rawReqLow = requirement.rawText.toLowerCase();
    const adminMaxMatch = rawReqLow.match(/(?:administraci[oó]n|admin|admon|cta\s*admon)\s*(?:m[aá]xima|max|hasta|tope|no\s*mayor\s*a|no\s*superior\s*a)?\s*:?\s*(?:aprox\.?|mensual)?\s*\$?\s*([\d.,\s]+?)(?:-|\s|\(|\/|\+|$|\n)/i);
    if (adminMaxMatch) {
      const parsedAdmin = parseFloat(adminMaxMatch[1].replace(/[.,\s]/g, ''));
      if (!isNaN(parsedAdmin) && parsedAdmin >= 10_000 && parsedAdmin <= 30_000_000 && !isPhoneNumberNotPrice(parsedAdmin, requirement.rawText)) {
        reqAdminMaxVal = parsedAdmin;
      }
    }
  }

  let effectivePropAdmin = pAdminFee;
  if (effectivePropAdmin <= 0 && property.rawText) {
    const rawPropLow = property.rawText.toLowerCase();
    const adminPropMatch = rawPropLow.match(/(?:administraci[oó]n|admin|admon|cta\s*admon)\s*:?\s*(?:aprox\.?|mensual)?\s*\$?\s*([\d.,\s]+?)(?:-|\s|\(|\/|\+|$|\n)/i);
    if (adminPropMatch) {
      const parsedAdmin = parseFloat(adminPropMatch[1].replace(/[.,\s]/g, ''));
      if (!isNaN(parsedAdmin) && parsedAdmin >= 10_000 && parsedAdmin <= 30_000_000 && !isPhoneNumberNotPrice(parsedAdmin, property.rawText)) {
        effectivePropAdmin = parsedAdmin;
      }
    }
  }

  if (reqAdminMaxVal > 0 && effectivePropAdmin > 0) {
    if (effectivePropAdmin > reqAdminMaxVal) {
      blockers.push(`Guillotina Financiera (Administración): Cuota de administración de $${effectivePropAdmin.toLocaleString()} supera el máximo aceptado de $${reqAdminMaxVal.toLocaleString()}`);
      return buildExplanationResult(0, blockers, positives, negatives);
    } else {
      positives.push(`Administración favorable: $${effectivePropAdmin.toLocaleString()} dentro del presupuesto máx de $${reqAdminMaxVal.toLocaleString()}`);
    }
  }


  const propRawTextLower = (property.rawText || property.description || "").toLowerCase();
  const isReqSingleRoomSubtype = reqSubtype === "apartaestudio" || reqSubtype === "loft";

  // ── FILTRO DURO 8: Habitaciones (REGLA DOCTRINAL v22.8: DOS BRAZOS ESTRICTOS) ──
  if (effectiveReqBeds > 0) {
    if (pBedrooms >= 0) {
      if (effectiveReqBeds === 1 || isReqSingleRoomSubtype) {
        // BRAZO A: Búsqueda Estricta de 1 Habitación / Apartaestudio / Aparta Suite / Loft
        // Solo se permite exactamente 1 habitación (o 1 habitación con estudio si no es un apto familiar de múltiples alcobas)
        if (pBedrooms !== 1) {
          blockers.push(`Regla Doctrinal de 1 Alcoba (Tolerancia Cero): La demanda busca estrictamente 1 habitación / apartaestudio y la oferta tiene ${pBedrooms} habitaciones. Match Inviable (0%).`);
          return buildExplanationResult(0, blockers, positives, negatives);
        } else {
          positives.push(`Habitaciones exactas (1 alcoba) para apartaestudio / apartasuite — Cumplimiento Perfecto`);
        }
      } else {
        // BRAZO B: Búsqueda Familiar (a partir de 2 Habitaciones)
        if (pBedrooms < effectiveReqBeds) {
          blockers.push(`Atributo Fallido (Habitaciones): Ofrecidas (${pBedrooms}) son inferiores a las exigidas (${effectiveReqBeds}). Match Inviable (0%).`);
          return buildExplanationResult(0, blockers, positives, negatives);
        } else if (pBedrooms > effectiveReqBeds + 1) {
          // Si supera por más de 1 habitación (ej. pide 2 y la oferta tiene 4 o 5) -> Desborde de escala
          blockers.push(`Desborde de Escala en Habitaciones: La demanda busca ${effectiveReqBeds} habitaciones y la oferta tiene ${pBedrooms} habitaciones (máximo permitido ${effectiveReqBeds + 1} de confort). Match Inviable (0%).`);
          return buildExplanationResult(0, blockers, positives, negatives);
        } else {
          positives.push(`Habitaciones ofrecidas (${pBedrooms}) compatibles con las exigidas (${effectiveReqBeds}) dentro del margen de confort — Cumplimiento`);
        }
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

  // C. Choque de Tipología Arquitectónica ("NO DUPLEX" vs "DUPLEX / 2 NIVELES") (Doctrina v22.4)
  const reqRejectsDuplex = reqRawTextLower.includes("no duplex") ||
    reqRawTextLower.includes("no dúplex") ||
    reqRawTextLower.includes("cero duplex") ||
    reqRawTextLower.includes("sin duplex") ||
    reqRawTextLower.includes("nada de duplex") ||
    reqRawTextLower.includes("sin escaleras") ||
    reqRawTextLower.includes("un solo nivel") ||
    reqRawTextLower.includes("un solo piso");

  const propIsDuplex = propRawTextLower.includes("duplex") ||
    propRawTextLower.includes("dúplex") ||
    propRawTextLower.includes("dos niveles") ||
    propRawTextLower.includes("2 niveles") ||
    propRawTextLower.includes("dos pisos") ||
    propRawTextLower.includes("2 pisos") ||
    (property.name || "").toLowerCase().includes("duplex") ||
    (property.name || "").toLowerCase().includes("dúplex");

  if (reqRejectsDuplex && propIsDuplex) {
    blockers.push("Choque de Tipología Expresa: El cliente exige expresamente 'NO DUPLEX' y el inmueble ofrecido es DÚPLEX / Dos Niveles. Match Inviable (0%).");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // D. Choque de Nivel ("NO PRIMER PISO" vs "PISO 1")
  const reqRejectsFirstFloor = reqRawTextLower.includes("no primer piso") ||
    reqRawTextLower.includes("no 1er piso") ||
    reqRawTextLower.includes("no piso 1") ||
    reqRawTextLower.includes("piso alto");

  const propIsFirstFloor = propRawTextLower.includes("primer piso") ||
    propRawTextLower.includes("piso 1") ||
    propRawTextLower.includes("piso primero") ||
    propRawTextLower.includes("1er piso");

  if (reqRejectsFirstFloor && propIsFirstFloor && !reqRawTextLower.includes("primer piso")) {
    blockers.push("Choque de Nivel Expreso: El cliente exige expresamente 'NO PRIMER PISO' y la oferta está en Piso 1. Match Inviable (0%).");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // E. Choque de Accesibilidad / Ascensor Obligatorio (Doctrina v25.0)
  const reqDemandsElevator = reqRawTextLower.includes("con ascensor") ||
    reqRawTextLower.includes("exige ascensor") ||
    reqRawTextLower.includes("obligatorio ascensor") ||
    reqRawTextLower.includes("adulto mayor") ||
    reqRawTextLower.includes("tercera edad") ||
    reqRawTextLower.includes("discapacidad") ||
    reqRawTextLower.includes("no escaleras");

  const propNoElevator = propRawTextLower.includes("sin ascensor") ||
    propRawTextLower.includes("no tiene ascensor") ||
    propRawTextLower.includes("por escaleras") ||
    propRawTextLower.includes("acceso por escaleras");

  if (reqDemandsElevator && propNoElevator) {
    blockers.push("Choque de Accesibilidad: El cliente exige obligatoriamente ASCENSOR (por edad/movilidad) y el inmueble ofrecido es por ESCALERAS / Sin Ascensor. Match Inviable (0%).");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // F. Choque de Orientación Visual (Exige "Solo Exterior" vs "Interior") (Doctrina v25.0)
  const reqDemandsExterior = reqRawTextLower.includes("solo exterior") ||
    reqRawTextLower.includes("estrictamente exterior") ||
    reqRawTextLower.includes("nada interior") ||
    reqRawTextLower.includes("cero interior") ||
    reqRawTextLower.includes("no interior");

  const propIsInterior = propRawTextLower.includes("es interior") ||
    propRawTextLower.includes("vista interior") ||
    propRawTextLower.includes("apartamento interior") ||
    propRawTextLower.includes("apto interior");

  if (reqDemandsExterior && propIsInterior) {
    blockers.push("Choque de Orientación Visual: El cliente exige expresamente 'SOLO EXTERIOR' y el inmueble ofrecido es INTERIOR. Match Inviable (0%).");
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

  // Auditoría de Confort Técnico, Vistas y Luz Natural (Doctrina v25.0)
  const reqWantsLightAir = reqRawTextLower.includes("luz natural") ||
    reqRawTextLower.includes("ventilacion natural") ||
    reqRawTextLower.includes("vista panoramica") ||
    reqRawTextLower.includes("vista a la ciudad") ||
    reqRawTextLower.includes("vista a la montana") ||
    reqRawTextLower.includes("vista a cerros") ||
    reqRawTextLower.includes("vista verde") ||
    reqRawTextLower.includes("frente a parque") ||
    reqRawTextLower.includes("iluminacion") ||
    reqRawTextLower.includes("iluminado") ||
    reqRawTextLower.includes("esquinero") ||
    reqRawTextLower.includes("sol de manana") ||
    reqRawTextLower.includes("sol de tarde");

  const propHasLightAir = propRawTextLower.includes("luz natural") ||
    propRawTextLower.includes("ventilacion natural") ||
    propRawTextLower.includes("vista panoramica") ||
    propRawTextLower.includes("vista a la ciudad") ||
    propRawTextLower.includes("vista a la montana") ||
    propRawTextLower.includes("vista a cerros") ||
    propRawTextLower.includes("vista verde") ||
    propRawTextLower.includes("frente a parque") ||
    propRawTextLower.includes("iluminado") ||
    propRawTextLower.includes("exterior") ||
    propRawTextLower.includes("esquinero") ||
    propRawTextLower.includes("sol de manana") ||
    propRawTextLower.includes("sol de tarde");

  let lightAirBonus = false;
  if (reqWantsLightAir && propHasLightAir) {
    lightAirBonus = true;
    positives.push(`✨ Confort Técnico & Visual Coincidente: Inmueble con excelente iluminación, vista privilegiada / panorámica / verde (+15 pts)`);
  }

  // Auditoría de Climatización y Chimeneas (Gas / Leña / Bioetanol)
  const reqWantsFireplace = reqRawTextLower.includes("chimenea");
  const propHasFireplace = propRawTextLower.includes("chimenea") || propRawTextLower.includes("a gas") || propRawTextLower.includes("a lena") || propRawTextLower.includes("bioetanol") || propRawTextLower.includes("alcohol");
  if (reqWantsFireplace && propHasFireplace) {
    positives.push(`🔥 Climatización & Calidez: Cuenta con chimenea compatible (gas / leña / bioetanol)`);
  }

  // Auditoría de Distribución y Ambientes (Sala-Comedor Independiente)
  const reqWantsIndependentLiving = reqRawTextLower.includes("sala independiente") || reqRawTextLower.includes("comedor independiente") || reqRawTextLower.includes("sala y comedor independiente");
  const propHasIndependentLiving = propRawTextLower.includes("sala independiente") || propRawTextLower.includes("comedor independiente") || propRawTextLower.includes("sala y comedor independiente") || propRawTextLower.includes("ambientes separados");
  if (reqWantsIndependentLiving && propHasIndependentLiving) {
    positives.push(`🛋️ Distribución Espacial: Sala y comedor independientes con ambientes diferenciados`);
  }

  // Auditoría de Zonas Comunes & Club House (Piscina, Gym, Zonas Verdes, Seguridad 24/7)
  const reqWantsClubHouse = reqRawTextLower.includes("club house") || reqRawTextLower.includes("piscina") || reqRawTextLower.includes("gimnasio") || reqRawTextLower.includes("zonas verdes") || reqRawTextLower.includes("vigilancia 24");
  const propHasClubHouse = propRawTextLower.includes("club house") || propRawTextLower.includes("piscina") || propRawTextLower.includes("gimnasio") || propRawTextLower.includes("zonas verdes") || propRawTextLower.includes("vigilancia 24") || propRawTextLower.includes("porteria 24");
  if (reqWantsClubHouse && propHasClubHouse) {
    positives.push(`🏊 Amenidades & Seguridad: Conjunto / Edificio con Club House, zonas húmedas/verdes y vigilancia 24/7`);
  }

  // Auditoría de Entorno Urbano & Cercanías (Comercio, Hospitales, Transporte Masivo)
  const reqWantsNearTransport = reqRawTextLower.includes("transmilenio") || reqRawTextLower.includes("transporte") || reqRawTextLower.includes("centros comerciales") || reqRawTextLower.includes("hospitales") || reqRawTextLower.includes("clinicas");
  const propHasNearTransport = propRawTextLower.includes("transmilenio") || propRawTextLower.includes("estacion") || propRawTextLower.includes("centros comerciales") || propRawTextLower.includes("hospitales") || propRawTextLower.includes("clinicas") || propRawTextLower.includes("vias de acceso");
  if (reqWantsNearTransport && propHasNearTransport) {
    positives.push(`🚇 Conectividad & Servicios: Excelente ubicación cercana a transporte masivo, comercio y centros de salud`);
  }

  // Auditoría de Tipologías Especiales (Casas, Fincas, Bodegas, Oficinas, Locales)
  if (propType === "warehouse") {
    if (propRawTextLower.includes("triple altura") || propRawTextLower.includes("muelle") || propRawTextLower.includes("trifasica") || propRawTextLower.includes("tonelada")) {
      positives.push(`🏭 Especificaciones Industriales: Cuenta con altura libre, muelle de carga y capacidad eléctrica trifásica`);
    }
  } else if (propType === "farm") {
    if (propRawTextLower.includes("piscina") || propRawTextLower.includes("kiosko") || propRawTextLower.includes("bbq") || propRawTextLower.includes("mayordomo") || propRawTextLower.includes("nacimiento")) {
      positives.push(`🌳 Dotación Campestre: Finca con casa de mayordomo, quiosco BBQ, piscina o fuentes hídricas`);
    }
  } else if (propType === "commercial" || propType === "office") {
    if (propRawTextLower.includes("vitrina") || propRawTextLower.includes("bateria") || propRawTextLower.includes("habilitacion") || propRawTextLower.includes("trafico")) {
      positives.push(`💼 Vocación Comercial / Corporativa: Excelente vitrina, alto flujo peatonal y batería de servicios`);
    }
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
  } else if (isReqSaleForScore) {
    if (effectivePrice < 30_000_000) {
      effectivePrice = 0; // en ventas, valores < 30M son cuotas de administración o N/E
    }
  }

  if (budgetMax > 0) {
    if (effectivePrice > 0) {
      if (effectivePrice < budgetMax) {
        earnedPoints += 15;
        positives.push(`💰 Oportunidad: precio $${effectivePrice.toLocaleString()} por debajo del presupuesto $${budgetMax.toLocaleString()}`);
      } else if (effectivePrice === budgetMax) earnedPoints += 15;
      else if (effectivePrice <= budgetMax * 1.01) earnedPoints += 13;
      else if (effectivePrice <= budgetMax * 1.05) earnedPoints += 9;
      else negatives.push(`Precio $${effectivePrice.toLocaleString()} supera presupuesto $${budgetMax.toLocaleString()}`);
    } else {
      negatives.push("Presupuesto no especificado en la oferta (N/E)");
    }
  } else {
    earnedPoints += 10; // sin restricción de presupuesto → crédito neutral
  }

  // 5. Área v27.4 — Mínimo Exigido con Tolerancia 0% (10 pts)
  if (reqAreaMin > 0) {
    if (propArea > 0) {
      if (propArea >= reqAreaMin) earnedPoints += 10;
    } else {
      negatives.push("Área no especificada en la oferta (N/E)");
    }
  } else {
    earnedPoints += 7; // demanda sin restricción de área → crédito neutral
  }


  // 6. Habitaciones (10 pts)
  if (reqBedrooms > 0) {
    if (pBedrooms >= 0) {
      if (pBedrooms >= reqBedrooms) earnedPoints += 10;
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
      if (pBathrooms >= reqBathrooms) earnedPoints += 4;
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

  // ── ESTADÍSTICA Y TABULACIÓN DOCTRINAL DE MATCH VECY ──
  // 1. Si cualquiera de los 5 primeros campos en duro NO COINCIDE 100% (no está en verde) -> 0% (SACADO DE ALLÍ)
  if (blockers.length > 0) {
    return buildExplanationResult(0, blockers, positives, negatives, false, missingFieldsList);
  }

  // 2. Con los 5 campos en duro 100% en VERDE, calculamos la completitud BILATERAL de los campos de ahí hacia abajo:
  // Si a la demanda le faltan tanto presupuesto como área Y habitaciones (demanda totalmente ciega), es inviable
  const hasCoreDemandSpec = (budgetMaxCheck > 0 || isReqOpenBudget) && (hasReqArea || hasReqBedrooms);
  if (!hasCoreDemandSpec && missingReqFields.length >= 4) {
    blockers.push(`Demanda incompleta: a la demanda le faltan especificaciones cuantitativas esenciales (${missingReqFields.join(", ")}). Match Inviable (0%).`);
    return buildExplanationResult(0, blockers, positives, negatives, false, missingFieldsList);
  }

  let totalDownstreamSpecs = 8;
  let filledDownstreamSpecs = 0;

  // 1. Precio / Presupuesto
  if ((price > 0 && budgetMaxCheck > 0) || isReqOpenBudget) filledDownstreamSpecs++;
  // 2. Admin Fee
  if ((pAdminFee > 0 || /administraci[oó]n|admon|admin/i.test(property.rawText || "")) && hasReqAdmin) filledDownstreamSpecs++;
  else if (pAdminFee > 0) filledDownstreamSpecs += 0.5;
  // 3. Área Total
  if (propArea > 0 && hasReqArea) filledDownstreamSpecs++;
  // 4. Habitaciones
  if (pBedrooms > 0 && hasReqBedrooms) filledDownstreamSpecs++;
  // 5. Baños
  if (pBathrooms > 0 && hasReqBathrooms) filledDownstreamSpecs++;
  // 6. Parqueaderos
  if (pGarages > 0 && hasReqGarages) filledDownstreamSpecs++;
  // 7. Estrato
  if (pEstrato > 0) filledDownstreamSpecs += 0.5;
  if (reqEstrato > 0 && pEstrato === reqEstrato) filledDownstreamSpecs += 0.5;
  // 8. Antigüedad
  if (propAge >= 0) filledDownstreamSpecs++;

  const completionRatio = Math.min(1.0, filledDownstreamSpecs / totalDownstreamSpecs);

  let finalPercentage = 80;
  if (completionRatio >= 0.85) {
    finalPercentage = 100;
    positives.push(`🌟 MATCH PERFECTO 100%: 5 campos en duro 100% en verde + TODAS las líneas de abajo 100% llenas y compatibles!`);
  } else if (completionRatio >= 0.65) {
    finalPercentage = 90;
    positives.push(`✅ Match 90%: 5 campos en duro 100% en verde + alta compatibilidad en especificaciones (${Math.round(completionRatio * 100)}%)`);
  } else if (completionRatio >= 0.40) {
    finalPercentage = 85;
    positives.push(`✅ Match 85%: 5 campos en duro 100% en verde + compatibilidad en especificaciones (${Math.round(completionRatio * 100)}%)`);
  } else {
    finalPercentage = 80;
    positives.push(`✅ Match 80%: 5 campos en duro 100% en verde + especificaciones cuantitativas básicas`);
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
    if (isHollowListing(property.rawText, property.name, property.externalUrl).isHollow) {
      console.log(`[MATCHING-FILTER] ⛔ Propiedad #${propertyId} omitida por ser publicación hueca o frase suelta sin ficha técnica.`);
      return [];
    }

    // Carga requerimientos activos para cotejo en memoria con resolución geográfica canónica (matchesGeography)
    const activeRequirements = await db
      .select()
      .from(requirements)
      .where(eq(requirements.status, "active"));

    const rejectedSet = await getRejectedPairsSet();
    const validMatches = [];

    for (const req of activeRequirements) {
      if (rejectedSet.has(`${propertyId}_${req.id}`)) {
        await db.delete(propertyMatches).where(
          and(
            eq(propertyMatches.propertyId, propertyId),
            eq(propertyMatches.requirementId, req.id)
          )
        );
        continue;
      }
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
      } else {
        // Si el score bajó de 80 o es inviable, purgar de la base de datos
        await db.delete(propertyMatches).where(
          and(
            eq(propertyMatches.propertyId, propertyId),
            eq(propertyMatches.requirementId, req.id)
          )
        );
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
    if (isHollowListing(req.rawText, req.name, req.enlaceOrigen).isHollow) {
      console.log(`[MATCHING-FILTER] ⛔ Requerimiento #${requirementId} omitido por ser frase suelta sin criterios de búsqueda.`);
      return [];
    }

    // Carga inmuebles disponibles para cotejo en memoria con resolución geográfica canónica (matchesGeography)
    const availableProperties = await db
      .select()
      .from(properties)
      .where(eq(properties.available, true));

    const rejectedSet = await getRejectedPairsSet();
    const validMatches = [];

    for (const prop of availableProperties) {
      if (rejectedSet.has(`${prop.id}_${requirementId}`)) {
        await db.delete(propertyMatches).where(
          and(
            eq(propertyMatches.propertyId, prop.id),
            eq(propertyMatches.requirementId, requirementId)
          )
        );
        continue;
      }
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
      } else {
        // Si el score bajó de 80 o es inviable, purgar de la base de datos
        await db.delete(propertyMatches).where(
          and(
            eq(propertyMatches.propertyId, prop.id),
            eq(propertyMatches.requirementId, requirementId)
          )
        );
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
      console.log(`[MATCHING-TS] ⚡ Ejecutando Motor Autoritativo TypeScript para Requerimiento #${requirementId}...`);
      const matches = await findMatchesForRequirement(requirementId);
      console.log(`[MATCHING-TS] ✅ ${matches.length} matches validados por TypeScript para Requerimiento #${requirementId}.`);
    } else if (propertyId) {
      console.log(`[MATCHING-TS] ⚡ Ejecutando Motor Autoritativo TypeScript para Propiedad #${propertyId}...`);
      const matches = await findMatchesForProperty(propertyId);
      console.log(`[MATCHING-TS] ✅ ${matches.length} matches validados por TypeScript para Propiedad #${propertyId}.`);
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
