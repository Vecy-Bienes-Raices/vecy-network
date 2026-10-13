/**
 * VECY NETWORK — PARSER DOCTRINAL DE REQUERIMIENTOS Y DEMANDAS (v33.02)
 * Arquitectura especializada para interpretación exhaustiva de la jerga
 * inmobiliaria de corretaje en Colombia y Bogotá (Rangos MM, cuadrantes viales,
 * barrios emblemáticos y requerimientos específicos de confort).
 */

import { normalizarTextoGeografico } from "./geography";
import { parseStreetCarreraBoundaries, esFormatoCuadrante } from "./matching";

export interface ParsedDemand {
  rawText: string;
  operationType: 'venta' | 'arriendo';
  propertyType: 'apartment' | 'house' | 'office' | 'commercial' | 'warehouse' | 'land' | 'building' | 'farm' | 'loft' | 'consultorio';
  budgetMin?: number;
  budgetMax?: number;
  budgetFormatted: string;
  currency: 'COP' | 'USD';
  isCashPayment: boolean; // Efectivo / contado
  bedroomsMin?: number;
  hasStudy: boolean;
  bathroomsMin?: number;
  areaMin?: number;
  areaMax?: number;
  garagesMin?: number;
  garageType?: 'independiente' | 'lineal' | 'mixto';
  hasStorage: boolean; // Depósito
  adminFeeMax?: number;
  adminFeeFormatted?: string;
  // Ubicación geográfica Bogotá
  city: string;
  barrios: string[];
  streetMin?: number;
  streetMax?: number;
  carreraMin?: number;
  carreraMax?: number;
  locationSummary: string;
  // Confort y características
  hasBalcony: boolean;
  hasTerrace: boolean;
  hasElevator: boolean;
  isExterior: boolean;
  floorMin?: number;
  isHighFloor: boolean;
  isGroundFloor: boolean;
  isWellLit: boolean; // Iluminado / luz natural
}

// 🏛️ LISTADO AUTORITATIVO DE BARRIOS EMBLEMÁTICOS DE BOGOTÁ Y SABANA NORTE
export const BOGOTA_EMBLEMATIC_BARRIOS = [
  "pasadena", "batan", "el batan", "alhambra", "belmira", "san patricio",
  "chico", "el chico", "chico norte", "chico reservado", "navarra", "rosales",
  "los rosales", "santa barbara", "santa barbara alta", "santa barbara occidental",
  "cedritos", "chapinero", "chapinero alto", "usaquen", "pontevedra", "bella suiza",
  "multicentro", "unicentro", "santa paula", "contador", "la carolina", "el refugio",
  "cabrera", "la cabrera", "el nogal", "nogal", "antiguo country", "virrey", "el virrey",
  "santa ana", "santa ana oriental", "bosque medina", "victoria norte", "mazuren",
  "colina campestre", "la colina", "prado veraniego", "niza", "polo club", "el polo",
  "castellana", "la castellana", "rincon del chico", "santa fe", "salitre", "ciudad salitre",
  "teusaquillo", "la soledad", "palermo", "quinta camacho", "la merced", "san diego",
  "chía", "cajicá", "cota", "sopó", "tabio", "tenjo", "la calera"
];

/**
 * Normaliza un número en notación colombiana/latina:
 * "1.000" -> 1000
 * "1,000" -> 1000
 * "650" -> 650
 * "1.2" / "1,2" -> 1.2
 */
function parseColombianNumberStr(str: string): number {
  if (!str) return 0;
  const clean = str.trim();
  // Caso decimal explícito tipo 1.5 o 1,5
  if (/^\d+[.,]\d{1,2}$/.test(clean)) {
    return parseFloat(clean.replace(',', '.'));
  }
  // Caso miles tipo 1.000 o 1,000 o 1.200
  const normalized = clean.replace(/[.,]/g, '');
  return parseFloat(normalized) || 0;
}

/**
 * Extracción de presupuesto en millones de pesos con notación "MM", "millones" o rangos
 */
export function extractDemandBudget(text: string, isRent: boolean): {
  budgetMin?: number;
  budgetMax?: number;
  budgetFormatted: string;
  isCashPayment: boolean;
  currency: 'COP' | 'USD';
} {
  const isUSD = /\b(?:usd|dolares|dólares|\$us)\b/i.test(text);
  const isCashPayment = /\b(?:en\s+efectivo|de\s+contado|contado|efectivo|cash|recursos\s+propios)\b/i.test(text);
  
  // 1. Rango explícito con MM o Millones: "$650–670 MM", "$650 - $670 MM", "650 a 670 MM", "entre 600 y 700 millones"
  const rangePattern = /(?:presupuesto|valor|hasta|entre)?\s*\$?\s*(\d{1,4}(?:[.,]\d{3})*|\d+(?:[.,]\d+)?)\s*(?:a|y|–|-|hasta)\s*\$?\s*(\d{1,4}(?:[.,]\d{3})*|\d+(?:[.,]\d+)?)\s*(?:mm|millones?|millón|m\b)/i;
  const rangeMatch = text.match(rangePattern);
  if (rangeMatch) {
    const rawMin = parseColombianNumberStr(rangeMatch[1]);
    const rawMax = parseColombianNumberStr(rangeMatch[2]);
    const multiplier = isRent ? 1_000_000 : 1_000_000;
    const bMin = Math.round(rawMin * multiplier);
    const bMax = Math.round(rawMax * multiplier);
    return {
      budgetMin: bMin,
      budgetMax: bMax,
      budgetFormatted: `$${rawMin} a $${rawMax} MM ${isUSD ? 'USD' : 'COP'}`,
      isCashPayment,
      currency: isUSD ? 'USD' : 'COP'
    };
  }

  // 2. Valor único con MM: "$320 MM", "$1.000 MM", "1.200 MM", "$1000MM"
  const mmSinglePattern = /\$?\s*(\d{1,4}(?:[.,]\d{3})*|\d+(?:[.,]\d+)?)\s*mm\b/i;
  const mmMatch = text.match(mmSinglePattern);
  if (mmMatch) {
    const rawNum = parseColombianNumberStr(mmMatch[1]);
    // En venta: si rawNum es 1000, 1000 MM = 1.000.000.000 COP
    const bMax = Math.round(rawNum * 1_000_000);
    return {
      budgetMax: bMax,
      budgetFormatted: `$${rawNum.toLocaleString('es-CO')} MM ${isUSD ? 'USD' : 'COP'}`,
      isCashPayment,
      currency: isUSD ? 'USD' : 'COP'
    };
  }

  // 3. Formato "millones" o "millón" o "mil millones": "1.000 millones", "mil millones", "650 millones"
  if (/\bmil\s+millones\b/i.test(text)) {
    return {
      budgetMax: 1_000_000_000,
      budgetFormatted: "$1.000 MM COP",
      isCashPayment,
      currency: 'COP'
    };
  }

  const millPattern = /\$?\s*(\d{1,4}(?:[.,]\d{3})*|\d+(?:[.,]\d+)?)\s*(?:millones?|millón)\b/i;
  const millMatch = text.match(millPattern);
  if (millMatch) {
    const rawNum = parseColombianNumberStr(millMatch[1]);
    const bMax = Math.round(rawNum * 1_000_000);
    return {
      budgetMax: bMax,
      budgetFormatted: `$${rawNum.toLocaleString('es-CO')} MM ${isUSD ? 'USD' : 'COP'}`,
      isCashPayment,
      currency: isUSD ? 'USD' : 'COP'
    };
  }

  // 4. Formato de número completo directo en pesos: "$320.000.000", "$650000000"
  const fullCOPPattern = /\$?\s*(\d{2,3}(?:[.,]\d{3}){2})\b/;
  const fullMatch = text.match(fullCOPPattern);
  if (fullMatch) {
    const bMax = parseColombianNumberStr(fullMatch[1]);
    const mmVal = (bMax / 1_000_000).toFixed(0);
    return {
      budgetMax: bMax,
      budgetFormatted: `$${mmVal} MM COP`,
      isCashPayment,
      currency: 'COP'
    };
  }

  return {
    budgetFormatted: "No especificado / Abierto",
    isCashPayment,
    currency: isUSD ? 'USD' : 'COP'
  };
}

/**
 * Extracción de ubicación geográfica, cuadrantes viales y barrios emblemáticos de Bogotá
 */
export function extractDemandLocation(text: string): {
  city: string;
  barrios: string[];
  streetMin?: number;
  streetMax?: number;
  carreraMin?: number;
  carreraMax?: number;
  locationSummary: string;
} {
  const norm = normalizarTextoGeografico(text);
  const detectedBarrios: string[] = [];

  for (const b of BOGOTA_EMBLEMATIC_BARRIOS) {
    const bNorm = normalizarTextoGeografico(b);
    // Verificamos límite de palabra
    const regex = new RegExp(`\\b${bNorm}\\b`, 'i');
    if (regex.test(norm)) {
      // Capitalizar nombre bonito
      const pretty = b.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (!detectedBarrios.includes(pretty)) {
        detectedBarrios.push(pretty);
      }
    }
  }

  // Detectar cuadrantes de Calles y Carreras
  let streetMin: number | undefined;
  let streetMax: number | undefined;
  let carreraMin: number | undefined;
  let carreraMax: number | undefined;

  if (esFormatoCuadrante(text) || /\bcalles?\b|\bcras?\b|\bcarreras?\b/i.test(text)) {
    const boundaries = parseStreetCarreraBoundaries(text);
    if (boundaries.minStreet !== undefined) streetMin = boundaries.minStreet;
    if (boundaries.maxStreet !== undefined) streetMax = boundaries.maxStreet;
    if (boundaries.minCarrera !== undefined) carreraMin = boundaries.minCarrera;
    if (boundaries.maxCarrera !== undefined) carreraMax = boundaries.maxCarrera;
  }

  // Corredor común Bogotá: Auto Norte y Cra 7
  if ((text.toLowerCase().includes("auto norte") || text.toLowerCase().includes("autonorte")) && 
      (text.toLowerCase().includes("cra 7") || text.toLowerCase().includes("carrera 7") || text.toLowerCase().includes("séptima") || text.toLowerCase().includes("septima") || text.toLowerCase().includes("cra. 7"))) {
    carreraMin = carreraMin ?? 7;
    carreraMax = carreraMax ?? 45;
  }

  // Detección de "Arriba de Av. Caracas" o "Arriba de la Séptima"
  if (/arriba\s+de\s+(?:la\s+)?(?:av\.?\s*)?caracas/i.test(text)) {
    // Caracas es Cra 14. "Arriba" en Bogotá es el oriente (menor número de carrera: Cra 1 a 14)
    carreraMin = 1;
    carreraMax = Math.min(carreraMax ?? 14, 14);
  } else if (/arriba\s+de\s+(?:la\s+)?(?:cra\.?\s*7|séptima|septima)/i.test(text)) {
    carreraMin = 1;
    carreraMax = Math.min(carreraMax ?? 7, 7);
  }

  // Construir resumen de ubicación
  const summaryParts: string[] = [];
  if (detectedBarrios.length > 0) {
    summaryParts.push(detectedBarrios.join(", "));
  }
  if (streetMin && streetMax) {
    summaryParts.push(`Calles ${streetMin} a ${streetMax}`);
  } else if (streetMin) {
    summaryParts.push(`Desde Calle ${streetMin}`);
  }
  if (carreraMin && carreraMax) {
    summaryParts.push(`Carreras ${carreraMin} a ${carreraMax}`);
  }

  const locationSummary = summaryParts.length > 0 ? summaryParts.join(" • ") : "Bogotá (Zona General)";

  return {
    city: "Bogotá",
    barrios: detectedBarrios,
    streetMin,
    streetMax,
    carreraMin,
    carreraMax,
    locationSummary
  };
}

/**
 * Extracción de características de confort y físicas
 */
export function extractDemandFeatures(text: string): {
  bedroomsMin?: number;
  hasStudy: boolean;
  bathroomsMin?: number;
  areaMin?: number;
  areaMax?: number;
  garagesMin?: number;
  garageType?: 'independiente' | 'lineal' | 'mixto';
  hasStorage: boolean;
  adminFeeMax?: number;
  adminFeeFormatted?: string;
  hasBalcony: boolean;
  hasTerrace: boolean;
  hasElevator: boolean;
  isExterior: boolean;
  floorMin?: number;
  isHighFloor: boolean;
  isGroundFloor: boolean;
  isWellLit: boolean;
} {
  // Habitaciones y estudio: "3 alcobas + estudio", "3 habs + estudio", "2 alcobas"
  const hasStudy = /\b(?:estudio|star\s+de\s+tv|estar|hall\s+de\s+alcobas|\+\s*estudio)\b/i.test(text);
  
  let bedroomsMin: number | undefined;
  const bedMatch = text.match(/(\d+)\s*(?:alcobas?|habitaciones?|habs?|cuartos?|dormitorios?)/i);
  if (bedMatch) {
    bedroomsMin = parseInt(bedMatch[1], 10);
  } else if (/\bapartaestudio\b|\b1\s*hab\b/i.test(text)) {
    bedroomsMin = 1;
  }

  // Baños
  let bathroomsMin: number | undefined;
  const bathMatch = text.match(/(\d+)\s*(?:baños?|baths?)/i);
  if (bathMatch) {
    bathroomsMin = parseInt(bathMatch[1], 10);
  }

  // Área m²: "80 a 100 m2", "mínimo 90 mts", "90 m2"
  let areaMin: number | undefined;
  let areaMax: number | undefined;

  const areaRangeMatch = text.match(/(\d{2,4})\s*(?:a|–|-|hasta)\s*(\d{2,4})\s*(?:m2|mts2?|metros)/i);
  if (areaRangeMatch) {
    areaMin = parseInt(areaRangeMatch[1], 10);
    areaMax = parseInt(areaRangeRange_fix(areaRangeMatch[2]), 10);
  } else {
    const singleAreaMatch = text.match(/(?:m[ií]nimo|desde|superior\s+a|mayor\s+a)?\s*(\d{2,4})\s*(?:m2|mts2?|metros)/i);
    if (singleAreaMatch) {
      areaMin = parseInt(singleAreaMatch[1], 10);
    }
  }

  function areaRangeRange_fix(s: string): string {
    return s;
  }

  // Garajes / Parqueaderos
  let garagesMin: number | undefined;
  let garageType: 'independiente' | 'lineal' | 'mixto' | undefined;

  const garMatch = text.match(/(\d+)\s*(?:parqueaderos?|garajes?|pqs?|estacionamientos?)/i);
  if (garMatch) {
    garagesMin = parseInt(garMatch[1], 10);
  } else if (/\bcon\s+parqueadero\b|\bcon\s+garaje\b/i.test(text)) {
    garagesMin = 1;
  }

  if (/\b(?:independientes?|separados?)\b/i.test(text)) {
    garageType = 'independiente';
  } else if (/\blineal(?:es)?\b|\bservidumbre\b/i.test(text)) {
    garageType = 'lineal';
  }

  // Depósito / Cuarto útil
  const hasStorage = /\b(?:dep[oó]sito|cuarto\s+[uú]til|locker)\b/i.test(text);

  // Administración máxima
  let adminFeeMax: number | undefined;
  let adminFeeFormatted: string | undefined;

  const admonMatch = text.match(/(?:adm[oó]n|administraci[oó]n|cuota)[^$\d\n]*(?:max|hasta|tope)?\s*[:\s]*\$?\s*(\d{1,4}(?:[.,]\d{3})*|\d+)\s*(?:mil|k|mm|millones)?/i);
  if (admonMatch) {
    const rawVal = admonMatch[1].replace(/[.,]/g, '');
    const num = parseInt(rawVal, 10);
    if (num > 0) {
      if (/mil|k\b/i.test(admonMatch[0]) || num < 2000) {
        adminFeeMax = num * 1_000;
      } else {
        adminFeeMax = num;
      }
      adminFeeFormatted = `$${adminFeeMax.toLocaleString('es-CO')} COP`;
    }
  }

  // Comodidades
  const hasBalcony = /\bbalc[oó]n\b/i.test(text);
  const hasTerrace = /\bterraza\b/i.test(text);
  const hasElevator = /\bascensor|elevador\b/i.test(text);
  const isExterior = /\bexterior|vista\s+exterior|esquinero\b/i.test(text);
  const isWellLit = /\b(?:iluminado|luz\s+natural|excelente\s+luz|sol\s+de\s+la\s+tarde|sol\s+de\s+la\s+mañana)\b/i.test(text);

  // Pisos
  let floorMin: number | undefined;
  const floorMatch = text.match(/piso\s*(\d+)/i);
  if (floorMatch) {
    floorMin = parseInt(floorMatch[1], 10);
  }
  const isHighFloor = /\bpiso\s+alto|pisos\s+altos\b/i.test(text);
  const isGroundFloor = /\bprimer\s+piso|piso\s+1\b/i.test(text);

  return {
    bedroomsMin,
    hasStudy,
    bathroomsMin,
    areaMin,
    areaMax,
    garagesMin,
    garageType,
    hasStorage,
    adminFeeMax,
    adminFeeFormatted,
    hasBalcony,
    hasTerrace,
    hasElevator,
    isExterior,
    floorMin,
    isHighFloor,
    isGroundFloor,
    isWellLit
  };
}

/**
 * Función Principal del Parser Doctrinal de Demandas (v33.02)
 */
export function parseDemandText(rawText: string): ParsedDemand {
  const text = rawText || "";
  
  // Detección de Operación: Venta vs Arriendo
  const isRent = /\b(?:arriendo|alquiler|arrendar|alquilar|canon|renta)\b/i.test(text) && 
                !/\b(?:compro|compra|comprar|busco\s+comprar)\b/i.test(text);
  const operationType: 'venta' | 'arriendo' = isRent ? 'arriendo' : 'venta';

  // Detección de Tipo de Inmueble
  let propertyType: ParsedDemand['propertyType'] = 'apartment';
  if (/\bcasa\b|\bcasas\b/i.test(text)) propertyType = 'house';
  else if (/\boficina\b/i.test(text)) propertyType = 'office';
  else if (/\blocal\b|\blocal\s+comercial\b/i.test(text)) propertyType = 'commercial';
  else if (/\bbodega\b/i.test(text)) propertyType = 'warehouse';
  else if (/\blote\b|\bterreno\b/i.test(text)) propertyType = 'land';
  else if (/\bedificio\b/i.test(text)) propertyType = 'building';
  else if (/\bfinca\b/i.test(text)) propertyType = 'farm';
  else if (/\bloft\b/i.test(text)) propertyType = 'loft';
  else if (/\bconsultorio\b/i.test(text)) propertyType = 'consultorio';

  // Presupuesto
  const budgetInfo = extractDemandBudget(text, isRent);

  // Ubicación
  const locationInfo = extractDemandLocation(text);

  // Características
  const featuresInfo = extractDemandFeatures(text);

  return {
    rawText,
    operationType,
    propertyType,
    budgetMin: budgetInfo.budgetMin,
    budgetMax: budgetInfo.budgetMax,
    budgetFormatted: budgetInfo.budgetFormatted,
    currency: budgetInfo.currency,
    isCashPayment: budgetInfo.isCashPayment,
    bedroomsMin: featuresInfo.bedroomsMin,
    hasStudy: featuresInfo.hasStudy,
    bathroomsMin: featuresInfo.bathroomsMin,
    areaMin: featuresInfo.areaMin,
    areaMax: featuresInfo.areaMax,
    garagesMin: featuresInfo.garagesMin,
    garageType: featuresInfo.garageType,
    hasStorage: featuresInfo.hasStorage,
    adminFeeMax: featuresInfo.adminFeeMax,
    adminFeeFormatted: featuresInfo.adminFeeFormatted,
    city: locationInfo.city,
    barrios: locationInfo.barrios,
    streetMin: locationInfo.streetMin,
    streetMax: locationInfo.streetMax,
    carreraMin: locationInfo.carreraMin,
    carreraMax: locationInfo.carreraMax,
    locationSummary: locationInfo.locationSummary,
    hasBalcony: featuresInfo.hasBalcony,
    hasTerrace: featuresInfo.hasTerrace,
    hasElevator: featuresInfo.hasElevator,
    isExterior: featuresInfo.isExterior,
    floorMin: featuresInfo.floorMin,
    isHighFloor: featuresInfo.isHighFloor,
    isGroundFloor: featuresInfo.isGroundFloor,
    isWellLit: featuresInfo.isWellLit
  };
}
