import { getDb } from "../db";
import { and, eq, sql } from "drizzle-orm";
import { propertyMatches, properties, requirements } from "../../drizzle/schema";
import { normalizarTextoGeografico } from "./geography";

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

  const textToSearch = `${item.rawText || ""} ${item.description || ""}`;

  // 1. Buscar en el texto del mensaje por cualquier celular colombiano de 10 dígitos (ej: 3124431225)
  const phoneMatches = textToSearch.match(/(?:\+?57\s*)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g);
  if (phoneMatches && phoneMatches.length > 0) {
    const rawMatch = phoneMatches[0].replace(/\D/g, "");
    const clean10 = rawMatch.startsWith("57") && rawMatch.length === 12 ? rawMatch.substring(2) : rawMatch;
    if (clean10.length === 10 && clean10.startsWith("3")) {
      return `57${clean10}`;
    }
  }

  // 2. Revisar idUsuarioWhatsapp, contactPhone, brokerPhone, etc.
  const candidates = [
    item.idUsuarioWhatsapp,
    item.contactPhone,
    item.brokerPhone,
    item.phone,
    item.usuarioWhatsapp
  ];

  for (const cand of candidates) {
    if (!cand) continue;
    const clean = String(cand).split("@")[0].replace(/\D/g, "");
    // Rechazar identificadores numéricos de grupos de WhatsApp o hilos de Baileys
    if (clean.startsWith("11") || clean.startsWith("12036") || clean.startsWith("1203") || clean.length > 13) {
      continue;
    }
    // Celular Colombia: 10 dígitos (3XXXXXXXXX) o 12 dígitos (573XXXXXXXXX)
    if (clean.length === 12 && clean.startsWith("573")) {
      return clean;
    }
    if (clean.length === 10 && clean.startsWith("3")) {
      return `57${clean}`;
    }
    // Fijo Colombia: 10 dígitos (60XXXXXXXX) o 12 dígitos (5760XXXXXXXX)
    if (clean.length === 12 && clean.startsWith("5760")) {
      return clean;
    }
    if (clean.length === 10 && clean.startsWith("60")) {
      return `57${clean}`;
    }
    // Internacionales válidos (entre 10 y 12 dígitos)
    if (clean.length >= 10 && clean.length <= 12) {
      return clean;
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

  // Si no se especifica barrio/zona ni localidad en el requerimiento, pasa
  if (!reqZone && !reqLoc) {
    return { matches: true, score: 25 }; // Todo el municipio pasa
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

  // Rechazar requerimientos sin criterios específicos de búsqueda (zona, presupuesto, habitaciones o área)
  const reqZoneRawClean = (requirement.zonaDeseada || requirement.addressNeighborhood || "").trim().toLowerCase();
  const hasSpecificReqZone = reqZoneRawClean !== "" && reqZoneRawClean !== "na" && reqZoneRawClean !== "bogota" && reqZoneRawClean !== "bogotá";
  const hasReqBudget = parseFloat(String(requirement.presupuestoMax || "0")) > 0 || parseFloat(String(requirement.presupuestoMin || "0")) > 0;
  const hasReqBedrooms = requirement.habitacionesMin != null && Number(requirement.habitacionesMin) > 0;
  const hasReqArea = parseFloat(String(requirement.areaMin || requirement.areaMinimaM2 || "0")) > 0;

  if (!hasSpecificReqZone && !hasReqBudget && !hasReqBedrooms && !hasReqArea) {
    blockers.push("El requerimiento carece de criterios específicos (zona, presupuesto, habs o área).");
    return buildExplanationResult(0, blockers, positives, negatives);
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
      "granada", "colsubsidio"
    ];
    
    const isBogotaSector = (val: string) => {
      return SECTORES_BOGOTA.some(sector => val.includes(sector));
    };

    if (CIUDADES_CO.some(c => n1.includes(c) || n1 === c)) return n1;
    if (CIUDADES_CO.some(c => n2.includes(c) || n2 === c)) return n2;
    
    if (isBogotaSector(n1) || isBogotaSector(n2)) {
      return "bogota";
    }

    return n1 || n2;
  };

  const reqCity = resolveCityField(requirement.ciudadDeseada || "", requirement.city || "");
  const propCity = resolveCityField(property.addressCity || "", property.city || "");
  if (!reqCity || !propCity || reqCity !== propCity) {
    blockers.push(`Incompatibilidad de ciudad: deseada ${reqCity}, ofrecida ${propCity}`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  positives.push(`Ciudad coincide: ${reqCity}`);

  const price       = parseFloat(String(property.price || "0"));
  const budgetMax   = parseFloat(String(requirement.presupuestoMax || "0"));
  const budgetMin   = parseFloat(String(requirement.presupuestoMin || "0"));

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

  // ── FILTRO DURO 6: Área Mínima (Metraje en Duro - NUNCA MENOR QUE) ──
  if (reqAreaMin > 0) {
    if (propArea > 0) {
      if (propArea < reqAreaMin * 0.98) {
        blockers.push(`Área ofrecida (${propArea} m²) es INFERIOR al mínimo exigido (${reqAreaMin} m²)`);
        return buildExplanationResult(0, blockers, positives, negatives);
      } else {
        positives.push(`Área de ${propArea} m² cumple con el mínimo exigido de ${reqAreaMin} m²`);
      }
    } else {
      blockers.push(`No se puede verificar el área mínima requerida de ${reqAreaMin} m² (información no especificada en la oferta).`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }

  // ── FILTRO DURO 7: Presupuesto Máximo (TOLERANCIA CERO 0%) ──
  if (budgetMax > 0) {
    const isReqRent = reqBiz.includes("arriendo");
    const isReqSale = reqBiz.includes("venta") || reqBiz.includes("permuta");

    // Para Arriendos: Si (Canon + Administración de la oferta) > Canon Máximo de la demanda → 0%
    if (isReqRent && propBiz.includes("arriendo")) {
      const propRent = property.priceRent ? parseFloat(String(property.priceRent)) : price;
      if (propRent > 0) {
        const adminVal = pAdminFee > 0 ? pAdminFee : 0;
        const totalRent = propRent + adminVal;
        if (totalRent > budgetMax) {
          blockers.push(`Canon de arriendo total ($${totalRent.toLocaleString()}) supera el presupuesto máximo de $${budgetMax.toLocaleString()}`);
          return buildExplanationResult(0, blockers, positives, negatives);
        }
      }
    }

    // Para Ventas: Si el Precio de Venta de la oferta > Presupuesto Máximo de Venta de la demanda → 0%
    if (isReqSale && propBiz.includes("venta") && price > 0) {
      if (price > budgetMax) {
        blockers.push(`Precio de venta $${price.toLocaleString()} supera el presupuesto máximo de $${budgetMax.toLocaleString()}`);
        return buildExplanationResult(0, blockers, positives, negatives);
      }
    }
  }

  // ── FILTRO DURO 8: Habitaciones Mínimas (NUNCA MENOR QUE) ──
  if (reqBedrooms > 0) {
    if (pBedrooms >= 0) {
      if (pBedrooms < reqBedrooms) {
        blockers.push(`Habitaciones ofrecidas (${pBedrooms}) son inferiores a las exigidas (${reqBedrooms})`);
        return buildExplanationResult(0, blockers, positives, negatives);
      } else {
        positives.push(`Habitaciones ofrecidas (${pBedrooms}) satisfacen la solicitud de (${reqBedrooms})`);
      }
    } else {
      blockers.push(`No se pueden verificar las habitaciones requeridas (${reqBedrooms}) por falta de información en la oferta.`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
  }

  // ── FILTRO DURO 9: Baños Mínimos ──
  if (reqBathrooms > 0 && pBathrooms >= 0 && pBathrooms < reqBathrooms) {
    blockers.push(`Baños ofrecidos (${pBathrooms}) son inferiores a los requeridos (${reqBathrooms})`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── FILTRO DURO 10: Parqueaderos Mínimos ──
  if (reqGarages > 0 && pGarages >= 0 && pGarages < reqGarages) {
    blockers.push(`Parqueaderos ofrecidos (${pGarages}) son inferiores a los requeridos (${reqGarages})`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // ── PONDERACIÓN MATEMÁTICA REAL Y RIGUROSA (0% a 100%) ──
  // REGLA DOCTRINAL v17.4: El denominador SIEMPRE incluye TODOS los campos.
  // Campos N/E en la demanda → crédito parcial (campo "no restringido").
  // Campos N/E en la oferta cuando la demanda sí exige → 0 puntos.
  let earnedPoints = 0;
  const totalPossible = 100; // Denominador fijo = 100 puntos siempre

  // 1. Tipo Inmueble (15 pts) — Ya pasó el filtro duro, siempre coincide
  earnedPoints += 15;

  // 2. Tipo Negocio (15 pts) — Ya pasó el filtro duro, siempre coincide
  earnedPoints += 15;

  // 3. Ubicación (20 pts)
  earnedPoints += Math.round((geoResult.score / 25) * 20);

  // 4. Presupuesto (15 pts)
  if (budgetMax > 0) {
    // El requerimiento SÍ especifica presupuesto máximo
    if (price > 0) {
      if (price <= budgetMax)            earnedPoints += 15;          // Dentro del rango → 15 pts
      else if (price <= budgetMax * 1.01) earnedPoints += 13;        // Marginal 1% → 13 pts
      else if (price <= budgetMax * 1.05) earnedPoints += 9;         // Marginal 5% → 9 pts
      else negatives.push(`Precio $${price.toLocaleString()} supera presupuesto $${budgetMax.toLocaleString()}`);
    } else {
      negatives.push("Presupuesto no especificado en la oferta (N/E)");
      // 0 pts: la oferta no informó precio y la demanda sí lo exige
    }
  } else {
    // La demanda NO especifica presupuesto → crédito neutral parcial (10/15)
    earnedPoints += 10;
  }

  // 5. Área (10 pts)
  if (reqAreaMin > 0) {
    if (propArea > 0) {
      if (propArea >= reqAreaMin)       earnedPoints += 10;
      else if (propArea >= reqAreaMin * 0.98) earnedPoints += 7;  // Margen 2%
      else negatives.push(`Área ${propArea} m² es inferior a la requerida ${reqAreaMin} m²`);
    } else {
      negatives.push("Área no especificada en la oferta (N/E)");
      // 0 pts
    }
  } else {
    // La demanda NO especifica área mínima → crédito neutral parcial (7/10)
    earnedPoints += 7;
  }

  // 6. Habitaciones (10 pts)
  if (reqBedrooms > 0) {
    if (pBedrooms >= 0) {
      if (pBedrooms >= reqBedrooms)     earnedPoints += 10;
      else negatives.push(`Habitaciones (${pBedrooms}) inferiores a las requeridas (${reqBedrooms})`);
    } else {
      negatives.push("Habitaciones no especificadas en la oferta (N/E)");
      // 0 pts
    }
  } else {
    // La demanda NO especifica habitaciones → crédito neutral parcial (7/10)
    earnedPoints += 7;
  }

  // 7. Baños (5 pts)
  if (reqBathrooms > 0) {
    if (pBathrooms >= 0) {
      if (pBathrooms >= reqBathrooms)   earnedPoints += 5;
      else negatives.push(`Baños (${pBathrooms}) inferiores a los requeridos (${reqBathrooms})`);
    } else {
      negatives.push("Baños no especificados en la oferta (N/E)");
      // 0 pts
    }
  } else {
    // No restringido → crédito neutral (4/5)
    earnedPoints += 4;
  }

  // 8. Parqueaderos (5 pts)
  if (reqGarages > 0) {
    if (pGarages >= 0) {
      if (pGarages >= reqGarages)       earnedPoints += 5;
      else negatives.push(`Parqueaderos (${pGarages}) inferiores a los requeridos (${reqGarages})`);
    } else {
      negatives.push("Parqueaderos no especificados en la oferta (N/E)");
      // 0 pts
    }
  } else {
    // No restringido → crédito neutral (4/5)
    earnedPoints += 4;
  }

  // 9. Estrato (5 pts — bonus si coincide)
  if (reqEstrato >= 1 && pEstrato >= 1) {
    if (reqEstrato === pEstrato) earnedPoints += 5;
    // Si no coincide ya lo bloqueó el filtro duro anterior
  } else {
    // No restringido → crédito neutral (3/5)
    earnedPoints += 3;
  }

  // Total: max 100 pts (15+15+20+15+10+10+5+5+5 = 100)
  let finalPercentage = Math.min(100, Math.round((earnedPoints / totalPossible) * 100));

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
      props = await db.select().from(properties).where(eq(properties.available, true));
    }

    if (requirementId) {
      reqs = await db.select().from(requirements).where(eq(requirements.id, requirementId));
    } else {
      reqs = await db.select().from(requirements).where(eq(requirements.status, "active"));
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
        }
      }
    }
  } catch (err: any) {
    console.error("[Matching-Engine] Error running match engine:", err.message || err);
  }
}

async function sendDirectAlertToAdmins(message: string): Promise<void> {

  const matchBot = (global as any).janiaMatchBotInstance;
  if (matchBot && matchBot.isReady) {
    console.log("[Matching-Notification] Enviando alerta de Match a administradores vía Baileys...");
    await matchBot.queuedSend("573192919978@s.whatsapp.net", message).catch((e: any) => console.error("Error al notificar a Eduardo por Baileys:", e));
    await matchBot.queuedSend("573188096811@s.whatsapp.net", message).catch((e: any) => console.error("Error al notificar a Jani por Baileys:", e));
    return;
  }

  const wwebClient = (global as any).whatsappClient;
  if (wwebClient) {
    console.log("[Matching-Notification] Enviando alerta de Match a administradores vía WWEBJS...");
    await wwebClient.sendMessage("573192919978@c.us", message).catch((e: any) => console.error("Error al notificar a Eduardo por WWEBJS:", e));
    await wwebClient.sendMessage("573188096811@c.us", message).catch((e: any) => console.error("Error al notificar a Jani por WWEBJS:", e));
    return;
  }

  console.warn("[Matching-Notification] Ningún cliente de WhatsApp disponible en global para enviar la alerta.");
}
