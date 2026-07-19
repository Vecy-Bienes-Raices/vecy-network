import { getDb } from "../db";
import { and, eq } from "drizzle-orm";
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
    
    return norm.split(/,|\/|\s+y\s+|\s+o\s+|\s+e\s+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  };

  const reqPhrases = splitPhrases(reqZoneRaw);
  const propPhrases = splitPhrases(propZoneRaw);

  const reqExpanded = reqPhrases.flatMap(expandirZona);
  const propExpanded = propPhrases.flatMap(expandirZona);

  // Palabras genéricas geográficas que no deben ser usadas para coincidencia parcial
  const palabrasGenericas = new Set([
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

  // 0. Evitar auto-match (mismo broker)
  const propBroker = (property.idUsuarioWhatsapp || "").split('@')[0];
  const reqBroker = (requirement.idUsuarioWhatsapp || "").split('@')[0];
  if (propBroker && reqBroker && propBroker === reqBroker) {
    blockers.push("Auto-match: el inmueble y el requerimiento pertenecen al mismo asesor.");
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  // A. transactionType (Venta o Arriendo)
  const reqBiz = (requirement.tipoNegocioDeseado || requirement.transactionType || "").toLowerCase();
  const propBiz = (property.transactionType || "").toLowerCase();
  if (!reqBiz || !propBiz || reqBiz !== propBiz) {
    blockers.push(`Incompatibilidad de negocio: deseado ${reqBiz}, ofrecido ${propBiz}`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  positives.push(`Tipo de negocio coincide: ${reqBiz}`);

  // B. city (Ciudad)
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
  const reqLoc   = normalizarTextoGeografico(requirement.addressLocality || "");
  const propLoc  = normalizarTextoGeografico(property.addressLocality || "");

  // ── FILTRO DURO 1: Tipo de inmueble ──
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

  // ── FILTRO DURO 3: Ubicación / Barrio ──
  if (reqZone && propZone) {
    const geoResult = matchesGeography(
      requirement.zonaDeseada || requirement.addressNeighborhood || "",
      property.zone || property.addressNeighborhood || "",
      requirement.addressLocality || "",
      property.addressLocality || "",
      requirement.ciudadDeseada || requirement.city || "",
      property.addressCity || property.city || ""
    );
    if (!geoResult.matches) {
      blockers.push(`Ubicación incompatible: requerida zona ${requirement.zonaDeseada || ""}, ofrecida ${property.zone || ""}`);
      return buildExplanationResult(0, blockers, positives, negatives);
    }
    positives.push(`Ubicación compatible en zona: ${property.zone || ""}`);
  }

  // ── FILTRO DURO 4: Estrato ──
  if (reqEstrato >= 1 && pEstrato >= 1 && reqEstrato !== pEstrato) {
    blockers.push(`Estrato incompatible: deseado ${reqEstrato}, ofrecido ${pEstrato}`);
    return buildExplanationResult(0, blockers, positives, negatives);
  }
  if (reqEstrato >= 1) {
    positives.push(`Estrato compatible: ${pEstrato}`);
  }

  let score = 0;
  let totalW = 0;
  let hardFail = false;

  // 5. Precio
  if (budgetMax > 0 && price > 0) {
    const low  = budgetMax * 0.95;
    const high = budgetMax * 1.05;
    const budMinOk = budgetMin > 0 ? price >= budgetMin * 0.95 : true;
    if (price >= low && price <= high && budMinOk) {
      const diff = Math.abs(price - budgetMax) / budgetMax;
      score += diff <= 0.01 ? 12 : 10;
      positives.push(`Precio de $${price.toLocaleString()} dentro de la tolerancia del presupuesto máximo de $${budgetMax.toLocaleString()}`);
    } else {
      blockers.push(`Precio $${price.toLocaleString()} fuera del rango de tolerancia para presupuesto $${budgetMax.toLocaleString()}`);
      hardFail = true;
    }
    totalW += 12;
  }

  // 6. Área
  if (reqAreaMin > 0 && propArea > 0) {
    if (propArea < reqAreaMin) {
      blockers.push(`Área de ${propArea}m² es menor a la mínima requerida de ${reqAreaMin}m²`);
      hardFail = true;
    } else {
      const exceso = propArea - reqAreaMin;
      score += exceso <= 20 ? 10 : exceso <= 50 ? 7 : 4;
      positives.push(`Área de ${propArea}m² es compatible con el requerimiento de ${reqAreaMin}m²`);
      if (exceso > 50) {
        negatives.push(`Área excede el requerimiento por más de 50m² (${exceso}m² de exceso)`);
      }
    }
    totalW += 10;
  }

  // 7. Habitaciones
  if (reqBedrooms >= 0 && pBedrooms >= 0) {
    if (pBedrooms < reqBedrooms) {
      blockers.push(`Habitaciones ofrecidas (${pBedrooms}) menores a las requeridas (${reqBedrooms})`);
      hardFail = true;
    } else {
      score += pBedrooms === reqBedrooms ? 8 : pBedrooms === reqBedrooms + 1 ? 6 : 3;
      positives.push(`Habitaciones ofrecidas (${pBedrooms}) son compatibles con las requeridas (${reqBedrooms})`);
      if (pBedrooms > reqBedrooms + 1) {
        negatives.push(`Habitaciones ofrecidas (${pBedrooms}) exceden las requeridas (${reqBedrooms}) por más de 1`);
      }
    }
    totalW += 8;
  }

  // 8. Baños
  if (reqBathrooms >= 0 && pBathrooms >= 0) {
    if (pBathrooms < reqBathrooms) {
      blockers.push(`Baños ofrecidos (${pBathrooms}) menores a los requeridos (${reqBathrooms})`);
      hardFail = true;
    } else {
      score += pBathrooms === reqBathrooms ? 5 : 4;
      positives.push(`Baños ofrecidos (${pBathrooms}) son compatibles con los requeridos (${reqBathrooms})`);
    }
    totalW += 5;
  }

  // 9. Parqueaderos
  if (reqGarages >= 0 && pGarages >= 0) {
    if (pGarages < reqGarages) {
      blockers.push(`Parqueaderos ofrecidos (${pGarages}) menores a los requeridos (${reqGarages})`);
      hardFail = true;
    } else {
      score += pGarages === reqGarages ? 5 : 4;
      positives.push(`Parqueaderos ofrecidos (${pGarages}) son compatibles con los requeridos (${reqGarages})`);
    }
    totalW += 5;
  }

  // 10. Administración
  if (reqAdminMax >= 0 && pAdminFee > 0) {
    if (pAdminFee > reqAdminMax) {
      blockers.push(`Cuota de administración ($${pAdminFee.toLocaleString()}) supera la máxima requerida ($${reqAdminMax.toLocaleString()})`);
      hardFail = true;
    } else {
      const ratio = pAdminFee / reqAdminMax;
      score += ratio <= 1.0 && ratio >= 0.85 ? 7 : 5;
      positives.push(`Administración de $${pAdminFee.toLocaleString()} es compatible con el máximo de $${reqAdminMax.toLocaleString()}`);
    }
    totalW += 7;
  }

  if (hardFail) {
    return buildExplanationResult(0, blockers, positives, negatives);
  }

  const compScore = totalW > 0 ? Math.round((score / totalW) * 40) : 40;
  const finalScore = Math.min(100, 60 + compScore);

  return buildExplanationResult(finalScore, blockers, positives, negatives);
}

export function calcularScoreMatch(requirement: any, property: any): number {
  return explicarMatch(requirement, property).score;
}

export function evaluarMatch(requirement: any, property: any): boolean {
  return calcularScoreMatch(requirement, property) >= 70;
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
      if (score >= 70) {
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
      if (score >= 70) {
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

        // ── FILTRO 1: Mismo tipo de negocio (Venta / Arriendo) ──────────────
        const pBiz = (prop.transactionType || "").toLowerCase();
        const rBiz = (req.tipoNegocioDeseado || "").toLowerCase();
        if (!pBiz || !rBiz || pBiz !== rBiz) continue;

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

        // ── FILTRO 5: Área dentro de un rango pequeño (±10%) ─────────────────
        const pArea = parseFloat(String(prop.areaTotal || prop.areaPrivate || "0"));
        const rAreaMin = parseFloat(String(req.areaMin || "0"));
        // Solo hay areaMin en requerimientos, usar ±10% como límite superior
        if (pArea > 0 && rAreaMin > 0) {
          const areaMaxLimit = rAreaMin * 1.10;
          const areaMinLimit = rAreaMin * 0.90;
          if (pArea < areaMinLimit || pArea > areaMaxLimit) continue;
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

        // ── REGISTRO EN BASE DE DATOS ─────────────────────────────────────────
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
