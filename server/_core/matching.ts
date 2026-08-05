import { getDb } from "../db";
import { and, eq, sql } from "drizzle-orm";
import { propertyMatches, properties, requirements } from "../../drizzle/schema";
import { normalizarTextoGeografico } from "./geography";
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

  // 4. Fallback de Asesor / Sistema registrado en la BD de VECY Network
  if (item.id != null) {
    return "573192919978"; // Teléfono Oficial Canal VECY Network
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
function checkTransactionCompatibility(reqType: string, propType: string, propAccepted: string[] = []): boolean {
  if (!reqType || !propType) return false;
  const r = reqType.toLowerCase();
  const p = propType.toLowerCase();

  // Igualdad exacta siempre aplica
  if (r === p) return true;

  // Revisar acceptedTransactionTypes de la propiedad
  if (propAccepted.length > 0 && propAccepted.includes(r)) return true;

  // Reglas de compatibilidad cruzada del mercado colombiano (v17.2):

  // 1. "venta_o_arriendo": compatible con venta, arriendo o arriendo con opción de compra
  if (p === "venta_o_arriendo" && (r === "venta" || r === "arriendo" || r === "arriendo_con_opcion_de_compra")) return true;
  if (r === "venta_o_arriendo" && (p === "venta" || p === "arriendo" || p === "arriendo_con_opcion_de_compra")) return true;

  // 2. "venta_permuta": compatible con venta o permuta
  if (p === "venta_permuta" && (r === "venta" || r === "permuta")) return true;
  if (r === "venta_permuta" && (p === "venta" || p === "permuta")) return true;

  // 3. "arriendo_con_opcion_de_compra": compatible con "venta" pura
  if (p === "arriendo_con_opcion_de_compra" && r === "venta") return true;
  if (r === "arriendo_con_opcion_de_compra" && p === "venta") return true;

  // NOTA DOCTRINAL VECY (v17.2): "arriendo_con_opcion_de_compra" JAMÁS coincide con "arriendo" puro.
  // Coincide con: arriendo_con_opcion_de_compra, venta_o_arriendo y venta.

  return false;
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
}

export function parseStreetCarreraBoundaries(text: string): StreetCarreraBoundaries {
  const norm = (text || "").toLowerCase();
  const res: StreetCarreraBoundaries = {};

  const streetRangeMatch = norm.match(/(?:entre|de|cll|calle|calles)\s*:?\s*(\d{1,3})\s*(?:a|y|-|hasta)\s*(\d{1,3})/i);
  if (streetRangeMatch) {
    const n1 = parseInt(streetRangeMatch[1], 10);
    const n2 = parseInt(streetRangeMatch[2], 10);
    if (!isNaN(n1) && !isNaN(n2)) {
      res.minStreet = Math.min(n1, n2);
      res.maxStreet = Math.max(n1, n2);
    }
  }

  const carreraRangeMatch = norm.match(/(?:entre|de|cra|carrera|carreras)\s*:?\s*(circunvalar|cerros|\d{1,3})\s*(?:a|y|-|hasta)\s*(\d{1,3})/i);
  if (carreraRangeMatch) {
    const rawN1 = carreraRangeMatch[1];
    const n1 = (rawN1 === "circunvalar" || rawN1 === "cerros") ? 1 : parseInt(rawN1, 10);
    const n2 = parseInt(carreraRangeMatch[2], 10);
    if (!isNaN(n1) && !isNaN(n2)) {
      res.minCarrera = Math.min(n1, n2);
      res.maxCarrera = Math.max(n1, n2);
    }
  }

  return res;
}

export function parsePropertyAddressNumbers(text: string): PropertyAddressNumbers {
  const norm = (text || "").toLowerCase();
  const res: PropertyAddressNumbers = {};

  const streetMatch = norm.match(/(?:calle|cll|cll\.)\s*(\d{1,3})/i);
  if (streetMatch) {
    const sNum = parseInt(streetMatch[1], 10);
    if (!isNaN(sNum)) res.street = sNum;
  }

  const carreraMatch = norm.match(/(?:carrera|cra|cra\.)\s*(\d{1,3})/i);
  if (carreraMatch) {
    const cNum = parseInt(carreraMatch[1], 10);
    if (!isNaN(cNum)) res.carrera = cNum;
  }

  if (streetMatch && !res.carrera) {
    const afterNumMatch = norm.match(/#\s*(\d{1,3})/);
    if (afterNumMatch) {
      const cNum = parseInt(afterNumMatch[1], 10);
      if (!isNaN(cNum)) res.carrera = cNum;
    }
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

  // Si no se especifica barrio/zona ni localidad en el requerimiento, pasa
  if (!reqZone && !reqLoc) {
    return { matches: true, score: 25 }; // Todo el municipio pasa
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

  const reqPhrases = splitPhrases(reqZoneRaw);
  const propPhrases = splitPhrases(propZoneRaw);

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

function buildExplanationResult(score: number, blockers: string[], positives: string[], negatives: string[]): MatchExplanation {
  return {
    score,
    blockers,
    positives,
    negatives,
    confidence: 1.0,
    generatedAt: new Date().toISOString(),
    engineVersion: "VRIF-2.0"
  };
}

export function explicarMatch(requirement: any, property: any): MatchExplanation {
  const blockers: string[] = [];
  const positives: string[] = [];
  const negatives: string[] = [];

  // -1. Rechazar Requerimientos o Inmuebles vacíos o con datos basura ("NA")
  const reqText = (requirement.rawText || requirement.name || "").trim().toUpperCase();
  const propText = (property.rawText || property.name || "").trim().toUpperCase();
  if (reqText === "NA" || reqText === "" || propText === "NA" || propText === "") {
    blockers.push("Registro con información insuficiente ('NA' o campos sin especificar).");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── REGLA DOCTRINAL DE REQUERIMIENTO MÍNIMO OBLIGATORIO COMPLETO ──
  // La demanda DEBE especificar obligatoriamente: Presupuesto, Barrio/Zona Específico, Tipo de Inmueble, Tipo de Negocio y Habitaciones.
  // Estrato es opcional ("obvia el estrato"). Si falta alguno de los 5 pilares clave, el requerimiento se descarta al 0%.
  const reqRawString = (requirement.rawText || requirement.name || "").trim();
  const reqTextLow = reqRawString.toLowerCase();
  
  const SECTORES_BOGOTA_SABANA = [
    "cedritos", "usaquen", "usaquén", "chico", "chicó", "chapinero", "suba", "engativa", "engativá",
    "teusaquillo", "kennedy", "fontibon", "fontibón", "salitre", "rosales", "colina", "niza", "cabrera",
    "nogal", "recreo", "castellana", "patricio", "barbara", "bárbara", "belmira", "suiza", "navarra", "floresta",
    "granada", "santa barbara", "santa bárbara", "chico reservado", "chico norte", "rincon del chico",
    "rincón del chicó", "pasadena", "batan", "batán", "la carolina", "alambra", "mazuren", "mazurén", "calleja",
    "virrey", "el retiro", "antiguo country", "los rosales", "chia", "chía", "cajica", "cajicá", "cota", "sopó"
  ];

  const reqZoneRawClean = (requirement.zonaDeseada || requirement.addressNeighborhood || "").trim().toLowerCase();
  const hasColZone = reqZoneRawClean !== "" && reqZoneRawClean !== "na" && reqZoneRawClean !== "bogota" && reqZoneRawClean !== "bogotá";
  const hasTextZone = SECTORES_BOGOTA_SABANA.some(sector => reqTextLow.includes(sector)) || /zona|sector|barrio|calle|cra|carrera/i.test(reqTextLow);
  const hasSpecificReqZone = hasColZone || hasTextZone;

  // Presupuesto explícito en columna o en rawText (ej: 600-700mll, 400millones, $350.Mm)
  let budgetMaxCheck = parseFloat(String(requirement.presupuestoMax || "0"));
  if (budgetMaxCheck <= 0) {
    const mP = reqTextLow.match(/([\d.]+)\s*(?:-|a)?\s*([\d.]+)?\s*(millones|millón|mll|mlls|mm|m|M)\b/i)
            || reqTextLow.match(/(?:presupuesto|busco|hasta|canon|valor)\s*:?\s*\$?([\d.]+)\s*(millones|millón|mll|mlls|mm|m|M)?/i);
    if (mP) {
      let rawVal = mP[2] ? mP[2] : mP[1];
      let valR = parseFloat(rawVal.replace(/\./g, ""));
      if (!isNaN(valR)) {
        if (valR < 1000) valR *= 1000000;
        budgetMaxCheck = valR;
      }
    }
  }
  const hasReqBudget = budgetMaxCheck > 0;

  const hasReqBedrooms = (requirement.habitacionesMin != null && Number(requirement.habitacionesMin) > 0) || /(\d+)\s*(?:hab|habitaciones|alcoba|alcobas|alc|dormitorio|cuarto|cuartos|hb)/i.test(reqTextLow);
  const hasReqBathrooms = (requirement.banosMin != null && Number(requirement.banosMin) > 0) || /(\d+(?:\.\d+)?)\s*(?:baño|baños|wc|bñ)/i.test(reqTextLow);
  const hasReqArea = (parseFloat(String(requirement.areaMin || requirement.areaMinimaM2 || "0")) > 0) || /(\d+)\s*(?:m2|mts|metros)/i.test(reqTextLow);
  const hasReqType = !!(requirement.tipoInmuebleDeseado || requirement.propertyType) || /apto|apartamento|casa|oficina|lote|bodega|local|finca|apartaestudio|loft/i.test(reqTextLow);
  const hasReqBizType = !!(requirement.tipoNegocioDeseado || requirement.transactionType) || /venta|vendo|compro|compra|arriendo|alquilo|renta/i.test(reqTextLow);
  const hasReqGarages = (requirement.parqueaderosMin != null && Number(requirement.parqueaderosMin) > 0) || /garaje|parqueadero|ptero/i.test(reqTextLow);
  const hasReqAdmin = (requirement.adminFeeMax != null && Number(requirement.adminFeeMax) > 0) || /admon|administracion|administración/i.test(reqTextLow);

  const missingMandatoryFields: string[] = [];
  if (!hasSpecificReqZone) missingMandatoryFields.push("Ubicación / Barrio Específico");
  if (!hasReqBudget) missingMandatoryFields.push("Presupuesto Máximo");
  if (!hasReqBedrooms) missingMandatoryFields.push("Habitaciones");
  if (!hasReqType) missingMandatoryFields.push("Tipo de Inmueble");
  if (!hasReqBizType) missingMandatoryFields.push("Tipo de Negocio");

  if (reqRawString.length < 25 || missingMandatoryFields.length > 0) {
    blockers.push(`Requerimiento incompleto: Falta especificación obligatoria de [${missingMandatoryFields.join(", ")}] en la demanda. Descartado por Doctrina de Requerimiento Mínimo Completo.`);
    return buildExplanationResult(0, blockers, positives, negatives);
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

  const reqCity = resolveCityField(requirement.ciudadDeseada || "", requirement.city || "");
  const propCity = resolveCityField(property.addressCity || "", property.city || "");
  if (reqCity && propCity && reqCity !== propCity && reqCity !== "bogota" && propCity !== "bogota") {
    blockers.push(`Incompatibilidad de ciudad: deseada ${reqCity}, ofrecida ${propCity}`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  positives.push(`Ciudad coincide: ${reqCity}`);

  let price       = parseFloat(String(property.price || "0"));
  let budgetMax   = parseFloat(String(requirement.presupuestoMax || "0"));
  const budgetMin = parseFloat(String(requirement.presupuestoMin || "0"));

  // Extraer presupuesto del rawText si la columna está en 0.00
  if (budgetMax <= 0 && requirement.rawText) {
    const rawR = requirement.rawText.toLowerCase();
    const matchPresu = rawR.match(/presupuesto\s*:?\s*\$?([\d.]+)\s*(millones|millón|m|M)?/i);
    if (matchPresu) {
      let valR = parseFloat(matchPresu[1].replace(/\./g, ""));
      if (!isNaN(valR)) {
        if (valR < 1000) valR *= 1000000;
        budgetMax = valR;
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

  // ── FILTRO DURO 0: Inmueble Vacío o Incompleto sin Datos Prediales Mínimos (Tolerancia Cero) ──
  const hasZeroSpecs = price <= 0 && propArea <= 0 && pBedrooms <= 0 && pBathrooms <= 0;
  if (hasZeroSpecs) {
    blockers.push("Inmueble incompleto sin datos prediales mínimos (Precio, Área, Habitaciones y Baños en N/E).");
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

  // ── FILTRO DURO 0D: Múltiples Campos Técnicos Esenciales en N/E ──
  let missingTechCount = 0;
  if (price <= 0) missingTechCount++;
  if (propArea <= 0) missingTechCount++;
  if (pBedrooms <= 0) missingTechCount++;
  if (pBathrooms <= 0) missingTechCount++;
  if (pGarages <= 0) missingTechCount++;

  // Bloquear solo si faltan 4 o más campos técnicos o si no hay precio
  if (price <= 0 || missingTechCount >= 4) {
    blockers.push(`Oferta con información insuficiente (${missingTechCount} campos técnicos clave en N/E).`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── FILTRO DURO 0E: Incompatibilidad Geográfica Estricta de Ciudad (Ej: Cali vs Bogotá) ──
  const reqCityNorm = (requirement.ciudadDeseada || requirement.city || requirement.rawText || "").toLowerCase();
  const propCityNorm = (property.addressCity || property.city || property.zone || property.rawText || "").toLowerCase();

  const isReqCali = reqCityNorm.includes("cali");
  const isPropCali = propCityNorm.includes("cali");
  const isReqBogota = reqCityNorm.includes("bogota") || reqCityNorm.includes("bogotá");
  const isPropBogota = propCityNorm.includes("bogota") || propCityNorm.includes("bogotá");

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

  // ── FILTRO DURO 4: Ubicación / Barrio Estricto ──
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

  // ── FILTRO DURO 6 v20.0: Campana de Tolerancia de Área ──────────────────────
  // Zona Roja   (-5%):  propArea < reqMin * 0.95 → Bloqueo absoluto (0%)
  // Zona Confort (0–15%): reqMin * 0.95 ≤ propArea ≤ reqMin * 1.15 → Puntaje completo
  // Zona Grande (+15%): propArea > reqMin * 1.15 → Pasa con advertencia informativa
  let areaOversize = false;
  if (reqAreaMin > 0) {
    if (propArea > 0) {
      if (propArea < reqAreaMin * 0.95) {
        blockers.push(`Área ofrecida (${propArea} m²) es INFERIOR al piso mínimo exigido (${reqAreaMin} m² - tolerancia -5%)`);
        return buildExplanationResult(0, blockers, positives, negatives);
      } else if (propArea > reqAreaMin * 1.15) {
        areaOversize = true;
        positives.push(`✅ Área de ${propArea} m² cumple lo exigido (${reqAreaMin} m²). ⚠️ Inmueble significativamente más grande (+${Math.round((propArea / reqAreaMin - 1) * 100)}%)`);
      } else {
        positives.push(`✅ Área de ${propArea} m² dentro de la campana de confort (${reqAreaMin} m² ±15%)`);
      }
    } else {
      negatives.push(`Área del inmueble no especificada expresamente (requerimiento pide mínimo ${reqAreaMin} m²). Pendiente confirmar con captador.`);
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

  // ── FILTRO DURO 8: Habitaciones Mínimas (NUNCA MENOR QUE - REGLA CERO FALLIDOS) ──
  if (effectiveReqBeds > 0) {
    if (pBedrooms >= 0) {
      if (pBedrooms < effectiveReqBeds) {
        blockers.push(`Atributo Fallido (Habitaciones): Ofrecidas (${pBedrooms}) son inferiores a las exigidas (${effectiveReqBeds}). Match Inviable (0%).`);
        return buildExplanationResult(0, blockers, positives, negatives);
      } else {
        positives.push(`Habitaciones ofrecidas (${pBedrooms}) satisfacen la solicitud de (${effectiveReqBeds})`);
      }
    } else {
      blockers.push(`No se pueden verificar las habitaciones requeridas (${effectiveReqBeds}) por falta de información en la oferta.`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }

  // ── FILTRO DURO 9: Baños Mínimos (REGLA CERO FALLIDOS) ──
  if (effectiveReqBaths > 0 && pBathrooms >= 0 && pBathrooms < effectiveReqBaths) {
    blockers.push(`Atributo Fallido (Baños): Ofrecidos (${pBathrooms}) son inferiores a los requeridos (${effectiveReqBaths}). Match Inviable (0%).`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── FILTRO DURO 10: Parqueaderos (REGLA CERO FALLIDOS) ────
  if (effectiveReqGarages > 0 && pGarages >= 0 && pGarages < effectiveReqGarages) {
    blockers.push(`Atributo Fallido (Parqueaderos): Ofrecidos (${pGarages}) son inferiores a los requeridos (${effectiveReqGarages}). Match Inviable (0%).`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── FILTRO DURO 11 v20.0: Matriz de Intencionalidad Humana (Bloqueos por Choque de Intención) ──
  const propRawTextLower = (property.rawText || property.description || "").toLowerCase();
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

  // 10. Antigüedad / Año de Construcción (4 pts — NUEVO v20.0) ─────────────────
  // Fuentes: property.antiguedadAnos (años) o property.yearBuilt (año absoluto)
  const reqAntiguedadMax = requirement.antiguedadMax != null ? Number(requirement.antiguedadMax) : -1;
  const propAntiguedadAnos = property.antiguedadAnos != null ? Number(property.antiguedadAnos) : -1;
  const propYearBuilt = property.yearBuilt != null ? Number(property.yearBuilt) : -1;

  // Calcular antigüedad efectiva de la propiedad
  let propAge = propAntiguedadAnos;
  if (propAge < 0 && propYearBuilt > 0) {
    propAge = new Date().getFullYear() - propYearBuilt;
  }

  if (reqAntiguedadMax >= 0 && propAge >= 0) {
    if (propAge <= reqAntiguedadMax) {
      earnedPoints += 4;
      positives.push(`✅ Antigüedad: ${propAge} años (máximo pedido: ${reqAntiguedadMax} años)`);
    } else if (propAge <= reqAntiguedadMax * 1.20) {
      earnedPoints += 2; // Tolerancia 20%
      negatives.push(`⚠️ Antigüedad ${propAge} años excede ligeramente el máximo pedido (${reqAntiguedadMax} años)`);
    } else {
      negatives.push(`Antigüedad ${propAge} años supera el máximo exigido de ${reqAntiguedadMax} años`);
    }
  } else if (reqAntiguedadMax < 0 && propAge >= 0) {
    // La demanda no especifica antigüedad → crédito neutral
    earnedPoints += 3;
    if (propAge > 0) positives.push(`ℹ️ Antigüedad de la oferta: ${propAge} años (sin restricción por la demanda)`);
  } else {
    // Sin datos de antigüedad en ambas partes → crédito neutral mínimo
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

  return buildExplanationResult(finalPercentage, blockers, positives, negatives);
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
  return calcularScoreMatch(requirement, property) >= 85;
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

    // Carga TODOS los requerimientos activos — el score se encarga de filtrar compatibilidad
    const activeRequirements = await db
      .select()
      .from(requirements)
      .where(eq(requirements.status, "active"));

    const validMatches = [];

    for (const req of activeRequirements) {
      const explanation = explicarMatch(req, property);
      const score = explanation.score;
      if (score >= 85) {
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

    // Carga TODOS los inmuebles disponibles — el score se encarga de filtrar compatibilidad
    const availableProperties = await db
      .select()
      .from(properties)
      .where(eq(properties.available, true));

    const validMatches = [];

    for (const prop of availableProperties) {
      const explanation = explicarMatch(req, prop);
      const score = explanation.score;
      if (score >= 85) {
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
    let props: typeof properties.$inferSelect[] = [];
    let reqs: typeof requirements.$inferSelect[] = [];

    if (propertyId) {
      props = await db.select().from(properties).where(eq(properties.id, propertyId));
    } else {
      props = await db.select().from(properties);
    }

    if (requirementId) {
      reqs = await db.select().from(requirements).where(eq(requirements.id, requirementId));
    } else {
      reqs = await db.select().from(requirements);
    }

    const { users } = await import("../../drizzle/schema");

    const formatCurrency = (val: number) =>
      new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

    // Limpia el JID/teléfono a un número colombiano real (57XXXXXXXXXX)
    const cleanPhone = (raw: string): string => {
      if (!raw) return "";
      // Extraer solo dígitos
      let digits = raw.replace(/[^0-9]/g, "");
      // Quitar el código 57 si ya está incluido al inicio para reconstruirlo limpio
      if (digits.startsWith("57") && digits.length > 11) {
        digits = digits.slice(2);
      }
      // Si empieza con 0 (celular colombiano local), quitar el 0
      if (digits.startsWith("0") && digits.length === 10) {
        digits = digits.slice(1);
      }
      // Solo aceptar números de Colombia: 10 dígitos empezando por 3
      if (digits.length === 10 && digits.startsWith("3")) {
        return `57${digits}`;
      }
      // Si ya tiene 12 dígitos y empieza con 57, es válido
      if (digits.length === 12 && digits.startsWith("57")) {
        return digits;
      }
      // Retornar vacío si no es un número colombiano real
      return "";
    };

    for (const prop of props) {
      for (const req of reqs) {

        // ── FILTRO 1: Compatibilidad inteligente de tipo de negocio ─────────
        const pBiz = (prop.transactionType || "").toLowerCase();
        const rBiz = (req.tipoNegocioDeseado || "").toLowerCase();
        const pAccepted: string[] = Array.isArray(prop.acceptedTransactionTypes)
          ? (prop.acceptedTransactionTypes as string[]).map((t: string) => t.toLowerCase())
          : [];
        if (!pBiz || !rBiz || !checkTransactionCompatibility(rBiz, pBiz, pAccepted)) continue;

        // ── FILTRO 2: Mismo tipo de inmueble ─────────────────────────────────
        const pType = (prop.propertyType || "").toLowerCase();
        const rType = (req.tipoInmuebleDeseado || "").toLowerCase();
        if (!pType || !rType || pType !== rType) continue;

        // ── FILTRO 3: Misma ciudad ────────────────────────────────────────────
        const pCity = normalizarTextoGeografico(prop.city || prop.addressCity || "");
        const rCity = normalizarTextoGeografico(req.ciudadDeseada || "");
        if (!pCity || !rCity || pCity !== rCity) continue;

        // ── FILTRO 4: Mismo barrio (zona) — coincidencia estricta ─────────────
        const pZone = normalizarTextoGeografico(prop.zone || prop.addressNeighborhood || "");
        const rZone = normalizarTextoGeografico(req.zonaDeseada || req.addressNeighborhood || "");
        // Si el requerimiento especifica zona, DEBE coincidir exactamente o por inclusión
        if (rZone && pZone) {
          const zonaMatch = rZone === pZone || rZone.includes(pZone) || pZone.includes(rZone);
          if (!zonaMatch) continue;
        }

        // ── FILTRO 5: Área (Metraje en Duro) — Debe ser >= al mínimo exigido ───
        const pArea = parseFloat(String(prop.areaTotal || prop.areaPrivate || "0"));
        const rAreaMin = parseFloat(String(req.areaMin || "0"));
        if (pArea > 0 && rAreaMin > 0) {
          const areaMinLimit = rAreaMin * 0.90;
          if (pArea < areaMinLimit) continue;
        }

        // ── FILTRO 6: Precio dentro del presupuesto (incluida administración) ──
        const price = parseFloat(String(prop.price || "0"));
        const adminFee = parseFloat(String(prop.adminFee || "0"));
        const totalCost = price + adminFee; // Para arriendo la admin suma al costo real
        const budgetMax = parseFloat(String(req.presupuestoMax || "0"));
        const budgetMin = parseFloat(String(req.presupuestoMin || "0"));
        if (budgetMax > 0 && totalCost > budgetMax * 1.05) continue; // Tolerancia del 5%
        if (budgetMin > 0 && price < budgetMin * 0.90) continue;

        // ── FILTRO 7: Habitaciones ────────────────────────────────────────────
        const pBedrooms = Number(prop.bedrooms || 0);
        const rBedrooms = Number(req.habitacionesMin || 0);
        // Si el requerimiento especifica habitaciones, el inmueble debe tenerlas
        if (rBedrooms > 0 && pBedrooms > 0 && pBedrooms < rBedrooms) continue;

        // ── CÁLCULO DE SCORE & EXPLICACIÓN ─────────────────────────────────────
        const explanation = explicarMatch(req, prop);
        const score = explanation.score;
        if (score < 85) continue;

        // ── FILTRO ANTI-DUPLICADOS POR TELÉFONO Y TEXTO ─────────────────────
        const propPhone = cleanPhone(prop.idUsuarioWhatsapp || "");
        const reqPhone = cleanPhone(req.idUsuarioWhatsapp || "");
        
        // Evitar múltiples matches si el mismo solicitante publicó el mismo requerimiento varias veces
        const existingSamePhone = await db.select({ id: propertyMatches.id, reqRaw: requirements.rawText }).from(propertyMatches)
          .innerJoin(requirements, eq(propertyMatches.requirementId, requirements.id))
          .where(
            and(
              eq(propertyMatches.propertyId, prop.id),
              sql`${requirements.idUsuarioWhatsapp} = ${req.idUsuarioWhatsapp ?? ""}`
            )
          );

        const isDuplicateReqPost = existingSamePhone.some(m => 
          m.reqRaw && req.rawText && (m.reqRaw.trim() === req.rawText.trim() || m.reqRaw.includes(req.rawText.substring(0, 50)))
        );

        if (isDuplicateReqPost) continue;

        let matchId: number;
        let isNewMatch = false;

        const existing = await db.select().from(propertyMatches).where(
          and(
            eq(propertyMatches.propertyId, prop.id),
            eq(propertyMatches.requirementId, req.id)
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
          isNewMatch = true;
          const [newMatch] = await db.insert(propertyMatches).values({
            propertyId: prop.id,
            requirementId: req.id,
            matchScore: score.toFixed(2),
            matchReason: `VECY Core Engine: Match estricto ${score}%`,
            matchExplanation: explanation,
            ipc: ipcObj,
            status: "suggested",
            ownerConfirmed: false,
            seekerConfirmed: false,
          }).returning();
          matchId = newMatch.id;
          // Emitir evento desacoplado
          vrifEvents.emit("match:created", matchId);
          console.log(`[Matching-Engine] ✅ Match #${matchId} (${score}%) registrado y evento emitido.`);

          // Enviar Briefing de Inteligencia a Administradores (Eduardo & Jani) solo si score >= 85%
          if (score >= 85) {
            const reportMsg = buildBigTechAdminReport(prop, req, score);
            sendDirectAlertToAdmins(reportMsg).catch(aErr => console.error("[Matching-Engine] Error al notificar reporte a admin:", aErr));
          }
        }
      }
    }
  } catch (err: any) {
    console.error("[Matching-Engine] Error running match engine:", err.message || err);
  }
}

async function sendDirectAlertToAdmins(message: string): Promise<void> {
  const adminPhone = process.env.ADMIN_PHONE || "573192919978";

  const matchBot = (global as any).janiaMatchBotInstance;
  if (matchBot && matchBot.isReady) {
    console.log(`[Matching-Notification] Enviando alerta de Match al administrador (${adminPhone}) vía Baileys...`);
    await matchBot.queuedSend(`${adminPhone}@s.whatsapp.net`, message).catch((e: any) => console.error("Error al notificar a administrador por Baileys:", e));
    return;
  }

  const wwebClient = (global as any).whatsappClient;
  if (wwebClient) {
    console.log(`[Matching-Notification] Enviando alerta de Match al administrador (${adminPhone}) vía WWEBJS...`);
    await wwebClient.sendMessage(`${adminPhone}@c.us`, message).catch((e: any) => console.error("Error al notificar a administrador por WWEBJS:", e));
    return;
  }

  console.warn("[Matching-Notification] Ningún cliente de WhatsApp disponible en global para enviar la alerta.");
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
