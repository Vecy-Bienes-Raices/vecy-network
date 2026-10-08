/**
 * VECY NETWORK — PARSER Y EVALUADOR INMOBILIARIO COLOMBIANO
 * Módulo compartido de alta precisión para extracción de jerga, monedas, metrajes,
 * cuotas de administración y evaluación condicional de negocio dual (Venta y Arriendo).
 */

export interface ParsedListing {
  salePriceCOP?: number;
  rentPriceCOP?: number;
  adminFeeCOP?: number;
  adminIncluded: boolean;
  adminNeedsInquiry: boolean;
  areaM2?: number;
  maxAgeYears?: number;
  bedrooms?: number;
  hasCBS: boolean;
  demandsCBSMandatory: boolean;
  hasStudio: boolean;
  demandsStudioMandatory: boolean;
  demandsBalconyOrTerrace: boolean;
  hasTerrace: boolean;
  hasBalcony: boolean;
  hasPatio: boolean;
  terraceAreaM2?: number;
  balconyAreaM2?: number;
  patioAreaM2?: number;
  floor?: number;
  minFloorRequired?: number;
  isThirdPartyCommission: boolean;      // Es tercería
  prohibitsThirdPartyCommission: boolean; // No tercería
  buildingOrComplex?: string;
}

/**
 * Determina si el texto inmediatamente precedente a una cifra de m² indica que
 * corresponde a una terraza, balcón, patio o espacio exterior y NO al área del inmueble.
 */
export function isOutdoorAreaPreceding(precedingText: string): boolean {
  if (!precedingText) return false;
  const clean = precedingText.toLowerCase().trim();
  return /\b(?:terraza|balc[oó]n|balcon|patio|jard[ií]n)(?:[^\w\n]+(?:privada|exclusiva|social|amplia|hermosa|espectacular|exterior|cubierta|descubierta))?(?:[^\w\n]+(?:de|con|desde|aprox|aproximadamente))?(?:[^\w\n]+(?:al\s+menos|m[ií]nimo|m[ií]n|min|por\s+lo\s+menos|m[aá]s\s+de|mas\s+de|superior\s+a|mayor\s+a|[>≥]=?))?$/i.test(clean)
    || /\+\s*(?:al\s+menos|m[ií]nimo|m[ií]n|min)?$/i.test(clean);
}

export function parseColombianListing(rawText: string): ParsedListing {
  if (!rawText) {
    return {
      adminIncluded: false,
      adminNeedsInquiry: false,
      hasCBS: false,
      demandsCBSMandatory: false,
      hasStudio: false,
      demandsStudioMandatory: false,
      demandsBalconyOrTerrace: false,
      hasTerrace: false,
      hasBalcony: false,
      hasPatio: false,
      isThirdPartyCommission: false,
      prohibitsThirdPartyCommission: false,
    };
  }

  const text = rawText
    .replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0\u200E\u200F\u2028\u2029]/g, "")
    .replace(/[*_~]/g, ""); // Limpiar caracteres invisibles y markdown (*Maximo* -> Maximo)

  const result: ParsedListing = {
    adminIncluded: false,
    adminNeedsInquiry: false,
    hasCBS: false,
    demandsCBSMandatory: false,
    hasStudio: false,
    demandsStudioMandatory: false,
    demandsBalconyOrTerrace: false,
    hasTerrace: false,
    hasBalcony: false,
    hasPatio: false,
    isThirdPartyCommission: false,
    prohibitsThirdPartyCommission: false,
  };

  // 1. EXTRACCIÓN DE PRECIO DE VENTA (Soporta "$1 450 Millones", "$1.450M", "$1'450 Millones", "Presupuesto para compra:\n■ Max $1700M", "$6.000 millones máximo")
  const saleMatch = text.match(/(?:presupuesto\s*(?:para\s*)?compra|precio\s*(?:de\s*)?venta|valor\s*(?:de\s*)?venta|para\s*compra)[^$\d\n]*(?:\n[^$\d\n]*)?(?:max|hasta|tope)?\s*\$?\s*(\d{1,4}(?:[\s.'’]\d{3})*|\d+)\s*(?:millones?|mill[oó]n|mm|m\b)/i)
    || text.match(/(?:venta|comprar|compra)[^\d\n]*\$?\s*(\d{1,3}(?:[\s.'’]\d{3})*|\d+)\s*(?:millones|mill[oó]n|m\b)/i);
  if (saleMatch) {
    const cleanNum = saleMatch[1].replace(/[\s.'’]/g, "");
    result.salePriceCOP = parseInt(cleanNum, 10) * 1_000_000;
  } else {
    // Rescate directo de cifras en millones sin prefijo explícito (ej: "$6.000 millones máximo", "6000 millones max", "hasta $2500M")
    const directSaleMatch = text.match(/(?:(?:hasta|max|máximo|tope|techo|de)\s*)?\$?\s*(\d{1,4}(?:[.,\s']\d{1,3})*|\d+)\s*(?:mil\s*millones?|millones?|mill[oó]n|mm)\b(?:\s*(?:m[aá]ximo|max|tope))?/i);
    if (directSaleMatch && directSaleMatch.index !== undefined) {
      const preceding = text.slice(Math.max(0, directSaleMatch.index - 20), directSaleMatch.index);
      if (!/admin|admon|canon|arriendo|alquiler|mes\b/i.test(preceding)) {
        const cleanNum = directSaleMatch[1].replace(/[\s.'’]/g, "");
        const parsedN = parseInt(cleanNum, 10);
        if (!isNaN(parsedN) && parsedN > 0) {
          result.salePriceCOP = parsedN * 1_000_000;
        }
      }
    }
  }

  // 2. EXTRACCIÓN DE PRECIO DE ARRIENDO (Soporta "$11 millones", "$10M", "alquiler: $10M", "Presupuesto para alquiler:\n■: $10M")
  const rentMatch = text.match(/(?:presupuesto\s*(?:para\s*)?(?:alquiler|arriendo)|canon|para\s*(?:alquiler|arriendo))[^\d\n]*(?:\n[^\d\n]*)?(?:max|hasta|tope)?\s*[:\s\-]*\$?\s*(\d{1,3}(?:[\s.'’]\d{3})*|\d+)\s*(?:millones?|mill[oó]n|mm|m\b)/i)
    || text.match(/(?:arriendo|arrendamiento|alquiler)[^\d\n]*\$?\s*(\d{1,3}(?:[\s.'’]\d{3})*|\d+)\s*(?:millones|mill[oó]n|m\b)/i);
  if (rentMatch) {
    const cleanNum = rentMatch[1].replace(/[\s.'’]/g, "");
    result.rentPriceCOP = parseInt(cleanNum, 10) * 1_000_000;
  }

  // 3. EXTRACCIÓN DE ADMINISTRACIÓN (Monto numérico o "+ Adm" / "incluida")
  if (/\b(?:con|incluida|incluye)\s+(?:la\s+)?admi?n/i.test(text)) {
    result.adminIncluded = true;
  } else if (/\+\s*adm|\bmas\s+admi?n/i.test(text)) {
    result.adminNeedsInquiry = true;
  }

  const adminValMatch = text.match(/(?:admin(?:istraci[oó]n)?|admon)[^\d\n]*\$?\s*(\d{1,3}(?:[\s.'’]\d{3})*|\d+)\s*(?:millones|mill[oó]n|m|mil|k\b)?/i);
  if (adminValMatch) {
    const cleanNum = parseInt(adminValMatch[1].replace(/[\s.'’]/g, ""), 10);
    const multiplier = /mill|m\b/i.test(adminValMatch[0]) ? 1_000_000 : (/mil|k\b/i.test(adminValMatch[0]) ? 1_000 : 1);
    result.adminFeeCOP = cleanNum * multiplier;
  }

  // 4. ESPACIO EXTERIOR PREVIO (Para no confundir áreas de terraza/balcón con el área del inmueble)
  const outdoorInfo = parseOutdoorAreas(text);
  result.demandsBalconyOrTerrace = outdoorInfo.hasBalcony || outdoorInfo.hasTerrace;
  result.hasTerrace = outdoorInfo.hasTerrace;
  result.hasBalcony = outdoorInfo.hasBalcony;
  result.hasPatio = outdoorInfo.hasPatio;
  if (outdoorInfo.terraceArea) result.terraceAreaM2 = outdoorInfo.terraceArea;
  if (outdoorInfo.balconyArea) result.balconyAreaM2 = outdoorInfo.balconyArea;
  if (outdoorInfo.patioArea) result.patioAreaM2 = outdoorInfo.patioArea;

  // 5. ÁREA TOTAL (Mínimo 160m, 230M2, 160 mts, 160 m2, Área: 230)
  const allAreaMatches = Array.from(text.matchAll(/(?:(?:m[ií]nimo|[\u00e1a]rea)[^\d\n]*(\d{2,4})\s*(?:m2|mts2|metros|m\b|mt|mts|m²))|(?:(?:^|[\s▪︎•\-])(\d{2,4})\s*(?:m2|mts2|m²|mt2|mts|metros))/gi));
  for (const m of allAreaMatches) {
    const numStr = m[1] || m[2];
    if (!numStr) continue;
    const parsedVal = parseInt(numStr, 10);
    // Si este número coincide con la medida de terraza, balcón o patio ya identificada, descartar como área construida
    if (outdoorInfo.terraceArea && parsedVal === outdoorInfo.terraceArea) continue;
    if (outdoorInfo.balconyArea && parsedVal === outdoorInfo.balconyArea) continue;
    if (outdoorInfo.patioArea && parsedVal === outdoorInfo.patioArea) continue;

    const mIdx = m.index ?? 0;
    const preceding = text.slice(Math.max(0, mIdx - 45), mIdx);
    if (isOutdoorAreaPreceding(preceding)) continue;

    result.areaM2 = parsedVal;
    break;
  }

  // 5. ANTIGÜEDAD (*Maximo* 20 años, 38 años)
  const ageMatch = text.match(/(?:m[aá]ximo\s+)?(\d{1,2})\s*a[ñn]os(?:\s+de\s+antig[uü]edad)?/i);
  if (ageMatch) {
    result.maxAgeYears = parseInt(ageMatch[1], 10);
  }

  // 6. HABITACIONES (3 habitaciones, 2 alcobas, 3 cuartos)
  const bedMatch = text.match(/(\d+)\s*(?:habitaciones|alcobas|habs|cuartos|dormitorios)/i);
  if (bedMatch) result.bedrooms = parseInt(bedMatch[1], 10);

  // 7. CUARTO DE SERVICIO (CBS)
  result.hasCBS = /\bcbs\b|cuarto\s+(?:de\s+)?servicio|alcoba\s+(?:de\s+)?servicio/i.test(text);
  result.demandsCBSMandatory = /(?:cbs|cuarto\s+(?:de\s+)?servicio|alcoba\s+(?:de\s+)?servicio)[^\n]*(?:indispensable|imprescindible|obligatorio|si\s*o\s*si|innegociable|excluyente|exige)/i.test(text) ||
    /(?:indispensable|imprescindible|obligatorio|si\s*o\s*si|innegociable|excluyente)[^\n]*(?:cbs|cuarto\s+(?:de\s+)?servicio)/i.test(text);

  // 8. ESTUDIO / ESTAR DE TV
  result.hasStudio = /\bestudio\b|star\s+de\s+tv|estar\s+tv/i.test(text);
  result.demandsStudioMandatory = /(?:estudio|star)[^\n]*(?:obligatorio|imprescindible|excluyente)/i.test(text);



  // 10. FILTROS DE PISO
  const minFloorMatch = text.match(/piso\s+(\d+)\s+(?:hacia\s+arriba|en\s+adelante)/i);
  if (minFloorMatch) result.minFloorRequired = parseInt(minFloorMatch[1], 10);

  const exactFloorMatch = text.match(/piso[:\s]+(\d+)/i);
  if (exactFloorMatch) result.floor = parseInt(exactFloorMatch[1], 10);

  // 11. COMISIÓN / TERCERÍA (Regla de Guillotina)
  result.prohibitsThirdPartyCommission = /no\s+tercer[ií]a|sin\s+terceros/i.test(text);
  result.isThirdPartyCommission = /en\s+tercer[ií]a|\btercer[ií]a\b/i.test(text);

  // 12. CONDOMINIO / CONJUNTO / EDIFICIO (v32.57)
  const complexFound = extractBuildingOrComplex(text);
  if (complexFound) result.buildingOrComplex = complexFound;

  return result;
}

export interface FinancialEvaluation {
  saleScore: number | null;        // 0 a 100 si aplica venta
  rentScore: number | null;        // 0 a 100 si aplica arriendo
  financialScore: number;          // Score financiero consolidado
  bestRoute: 'VENTA' | 'ARRIENDO' | 'AMBAS' | 'NINGUNA';
  saleStatus: 'exact' | 'warn' | 'missing' | 'na';
  rentStatus: 'exact' | 'warn' | 'missing' | 'na';
  adminStatus: 'exact' | 'warn' | 'pending' | 'na';
  details: {
    saleDiffCOP?: number;
    rentDiffCOP?: number;
    adminDiffCOP?: number;
  };
}

export function evaluateDualFinancials(
  prop: { priceSale?: number; priceRent?: number; adminFee?: number; adminIncluded?: boolean },
  req: { budgetSaleMax?: number; budgetRentMax?: number; adminFeeMax?: number }
): FinancialEvaluation {
  let saleScore: number | null = null;
  let rentScore: number | null = null;
  let saleStatus: 'exact' | 'warn' | 'missing' | 'na' = 'na';
  let rentStatus: 'exact' | 'warn' | 'missing' | 'na' = 'na';
  let adminStatus: 'exact' | 'warn' | 'pending' | 'na' = 'na';
  const details: any = {};

  // 1. EVALUAR VÍA DE VENTA
  if (prop.priceSale && req.budgetSaleMax) {
    details.saleDiffCOP = req.budgetSaleMax - prop.priceSale;
    if (prop.priceSale <= req.budgetSaleMax) {
      saleScore = 100; // En o por debajo de presupuesto
      saleStatus = 'exact';
    } else if (prop.priceSale <= req.budgetSaleMax * 1.05) {
      saleScore = 75;  // Margen negociable hasta +5%
      saleStatus = 'warn';
    } else {
      saleScore = 0;   // Fuera de rango
      saleStatus = 'missing';
    }
  }

  // 2. EVALUAR VÍA DE ARRIENDO
  if (prop.priceRent && req.budgetRentMax) {
    details.rentDiffCOP = req.budgetRentMax - prop.priceRent;
    if (prop.priceRent <= req.budgetRentMax) {
      rentScore = 100;
      rentStatus = 'exact';
    } else if (prop.priceRent <= req.budgetRentMax * 1.10) {
      // En arriendo colombiano hasta un 10% es margen negociable
      rentScore = 70;
      rentStatus = 'warn';
    } else {
      rentScore = 0;
      rentStatus = 'missing';
    }
  }

  // 3. EVALUAR ADMINISTRACIÓN
  if (req.adminFeeMax) {
    if (prop.adminIncluded) {
      adminStatus = 'exact'; // Incluida = Cumplimiento perfecto
    } else if (prop.adminFee) {
      details.adminDiffCOP = req.adminFeeMax - prop.adminFee;
      adminStatus = prop.adminFee <= req.adminFeeMax ? 'exact' : 'warn';
    } else {
      adminStatus = 'pending'; // "+ Adm" sin monto -> Requiere averiguar
    }
  }

  // 4. CONSOLIDACIÓN DE LA DOCTRINA COMERCIAL
  let financialScore = 0;
  let bestRoute: 'VENTA' | 'ARRIENDO' | 'AMBAS' | 'NINGUNA' = 'NINGUNA';

  if (saleScore !== null && rentScore !== null) {
    if (saleScore >= 75 && rentScore >= 70) {
      bestRoute = 'AMBAS';
      financialScore = Math.max(saleScore, rentScore);
    } else if (saleScore >= 75) {
      bestRoute = 'VENTA';
      financialScore = saleScore;
    } else if (rentScore >= 70) {
      bestRoute = 'ARRIENDO';
      financialScore = rentScore;
    } else {
      financialScore = 0;
    }
  } else if (saleScore !== null) {
    financialScore = saleScore;
    bestRoute = saleScore >= 75 ? 'VENTA' : 'NINGUNA';
  } else if (rentScore !== null) {
    financialScore = rentScore;
    bestRoute = rentScore >= 70 ? 'ARRIENDO' : 'NINGUNA';
  }

  return { saleScore, rentScore, financialScore, bestRoute, saleStatus, rentStatus, adminStatus, details };
}

/**
 * Extractor de Moneda y Cifras en Jerga Inmobiliaria Colombiana
 */
export function parseColombianCurrency(rawText: string): number | null {
  if (!rawText) return null;
  const clean = rawText
    .toLowerCase()
    .replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0\u200E\u200F\u2028\u2029]/g, "")
    .replace(/[*_~]/g, "")
    .replace(/[\u2013\u2014]/g, "-");

  // Caso A: Cifra completa directa con puntos o comillas de miles: ej: "$1.450.000.000", "$8.300.000", "1'450.000.000"
  const fullMatch = clean.match(/(?:(?:cop|\$)\s*)?(\d{1,3}(?:[.'’]\d{3}){2,3})/);
  if (fullMatch) {
    const val = parseInt(fullMatch[1].replace(/[.'’]/g, ""), 10);
    if (!isNaN(val) && val > 0) return val;
  }

  // Caso B: Millones con separación por espacios, puntos, comillas, comas o compacto (ej: "1,800 MILLONES", "1.450M", "$1 450 Millones")
  const millionMatch = clean.match(/(?:(?:cop|\$)\s*)?(\d{1,4}(?:[\s.'’,]\d{3})*|\d+(?:[.,]\d+)?)\s*(?:mil\s*millones?|millones|millón|mm|m\b)/i);
  if (millionMatch) {
    const rawNumber = millionMatch[1].replace(/[\s'’]/g, "");
    if (clean.includes("mil millon")) {
      const v = parseFloat(rawNumber.replace(",", "."));
      return Math.round(v * 1_000_000_000);
    }
    // Si tiene formato de miles con punto o coma (ej: "1.800", "1,800", "1.450") seguido de millones -> 1.800 * 1M = 1.800.000.000
    if (/^\d{1,4}[.,]\d{3}$/.test(rawNumber)) {
      const parsedThousands = parseInt(rawNumber.replace(/[.,]/g, ""), 10);
      return parsedThousands * 1_000_000;
    }
    const value = parseFloat(rawNumber.replace(",", "."));
    if (!isNaN(value)) {
      return value < 10000 ? Math.round(value * 1_000_000) : Math.round(value);
    }
  }

  // Caso C: Miles con k o mil: ej: "800k", "800 mil", "500 k", "2000 mil"
  const thousandMatch = clean.match(/(?:(?:cop|\$)\s*)?(\d+(?:[.,]\d+)?)\s*(?:mil|k\b)/i);
  if (thousandMatch) {
    const val = parseFloat(thousandMatch[1].replace(",", "."));
    if (!isNaN(val)) return Math.round(val * 1_000);
  }

  // Caso D: Taquigrafía de miles con un solo punto (ej: "3.500" para arriendo -> 3.500.000)
  const shortThousandMatch = clean.match(/(?:(?:cop|\$)\s*)?(\d{1,3})[.,](\d{3})\b/);
  if (shortThousandMatch) {
    const n = parseInt(shortThousandMatch[1] + shortThousandMatch[2], 10);
    return n * 1_000;
  }

  return null;
}

/**
 * Extractor de Área con 'm', 'm2', 'M2', 'mts', 'metros'
 */
export function parseArea(rawText: string): number | null {
  if (!rawText) return null;
  const clean = rawText
    .toLowerCase()
    .replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0\u200E\u200F\u2028\u2029]/g, "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[*_~]/g, "");

  // Rango: "M2: 180 - 200", "160 a 200 m2" o "de 160-200 mt"
  const rangeMatch = clean.match(/(?:área|area|superficie|m2|mts2|mts|mt2|metros(?:\s+cuadrados)?|m²)?\s*:?\s*(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:m2|mts2|mts|mt2|metros(?:\s+cuadrados)?|m²|m\b)?\s*(?:a|-|hasta)\s*(\d+(?:[.,]\d+)?)\s*(?:m2|mts2|mts|mt2|metros(?:\s+cuadrados)?|m²|m\b)?/i);
  if (rangeMatch && (rangeMatch[1] || rangeMatch[2])) {
    const hasAreaCtx = /(?:área|area|superficie|m2|mts2|mts|mt2|metros|m²)/i.test(rangeMatch[0]);
    const val = parseFloat(rangeMatch[1].replace(",", "."));
    if (hasAreaCtx && !isNaN(val) && val > 10 && val < 50000) return val;
  }

  // Valor directo con o sin prefijo: "M2: 180", "Minimo 160m", "230M2", "160 m2", "160 mts", "área: 230"
  const matchWithUnit = clean.match(/(?:área|area|minimo|mínimo|maximo|máximo|superficie|desde)?\s*[:\s]*(\d+(?:[.,]\d+)?)\s*(?:m2|mts2|m²|mt2|mts|metros(?:\s+cuadrados)?|m\b)/i);
  if (matchWithUnit) {
    const val = parseFloat(matchWithUnit[1].replace(",", "."));
    if (!isNaN(val) && val > 10 && val < 50000) return val;
  }

  const matchWithPrefix = clean.match(/(?:área|area|superficie|m2|mts2|mt2|mts|m²)\s*[:\s]+(\d+(?:[.,]\d+)?)/i);
  if (matchWithPrefix) {
    const val = parseFloat(matchWithPrefix[1].replace(",", "."));
    if (!isNaN(val) && val > 10 && val < 50000) return val;
  }

  return null;
}

/**
 * Extractor de Administración colombiana (+ Adm, incluida, max $2M)
 */
export function parseAdminFee(rawText: string): { fee: number | null; isIncluded: boolean; requiresInquiry: boolean } {
  if (!rawText) return { fee: null, isIncluded: false, requiresInquiry: false };
  const clean = rawText.toLowerCase().replace(/[*_~]/g, "");

  const isIncluded = /(?:administraci[oó]n|admin|admon|adm)\s*(?:est[aá]|va)?\s*incluid[ao]|incluid[ao]\s*(?:la\s*)?(?:administraci[oó]n|admin|admon|adm)|(?:admi?n|adm[oó]n)\s*inc\b|con\s+(?:admi?n|adm[oó]n|adm\b)/i.test(clean);
  const requiresInquiry = /\+\s*(?:admi?n|adm[oó]n|adm\b)|\b(?:mas|más)\s*(?:admi?n|adm[oó]n|adm\b)/i.test(clean);

  const feeMatch = clean.match(/(?:max|máximo|hasta|tope|de|valor)?\s*(?:cop|\$)?\s*(\d+(?:[\s.'’]\d+)*)\s*(?:m|millones|millon|mil|k)?\s*(?:de\s+)?(?:admin|admon|admón|adm|administraci[oó]n|cuota)/i)
    || clean.match(/(?:admin|admon|admón|adm|administraci[oó]n|cuota)(?:[^\d\n]*?)\$?\s*(\d+(?:[\s.'’]\d+)*)\s*(?:m|millones|millon|mil|k)?/i);

  let fee: number | null = null;
  if (feeMatch) {
    fee = parseColombianCurrency(feeMatch[0]);
  }

  return { fee, isIncluded, requiresInquiry };
}

/**
 * Extractor de Antigüedad Máxima
 */
export function parseMaxAge(rawText: string): number | null {
  if (!rawText) return null;
  const clean = rawText.toLowerCase().replace(/[*_~]/g, "");
  
  // 1. Patrones explícitos de límite máximo o antigüedad requerida
  const explicitMatch = clean.match(/(?:antig[üu]edad|edad)(?:\s*(?:m[aá]xima|max|de|hasta|menor\s*a|tope|no\s*mayor\s*a|:))?\s*(\d{1,2})\s*a[ñn]os?/i)
    || clean.match(/(?:m[aá]ximo|hasta|tope|menor\s*a|no\s*mayor\s*a)\s*(\d{1,2})\s*a[ñn]os?(?:\s*(?:de\s*)?antig[üu]edad)?/i)
    || clean.match(/(\d{1,2})\s*a[ñn]os?\s*(?:de\s*)?(?:antig[üu]edad|construid[oa]|construcci[oó]n)/i)
    || clean.match(/(?:m[aá]ximo|hasta|tope|menor\s*a|no\s*mayor\s*a)?\s*(\d{1,2})\s*a[ñn]os(?:\s*de\s*antig[uü]edad)?/i);
    
  return explicitMatch ? parseInt(explicitMatch[1], 10) : null;
}

/**
 * Extractor y clasificador de Tipología de Cocina
 */
export function parseKitchenType(rawText: string, structured?: any): "Abierta" | "Abierta tipo Isla" | "Americana" | "Cerrada" | "Integral" | null {
  if (structured) {
    const s = String(structured).toLowerCase();
    if (s.includes("isla")) return "Abierta tipo Isla";
    if (s.includes("americana")) return "Americana";
    if (s.includes("abierta")) return "Abierta";
    if (s.includes("cerrada") || s.includes("independiente") || s.includes("tradicional") || s.includes("clasica")) return "Cerrada";
    if (s.includes("integral")) return "Integral";
  }
  if (!rawText) return null;
  const t = rawText.toLowerCase().replace(/[*_~]/g, "");
  if (/\b(?:tipo\s*isla|cocinas?\s*(?:con|tipo)?\s*isla|isla\s*central)\b/i.test(t)) return "Abierta tipo Isla";
  if (/\b(?:cocinas?\s*(?:tipo|estilo)?\s*americanas?|americana)\b/i.test(t)) return "Americana";
  if (/\b(?:cocinas?\s*abiertas?|aman\s*(?:las\s*)?cocinas?\s*abiertas?|quieren\s*cocinas?\s*abiertas?|prefieren\s*cocinas?\s*abiertas?|les\s*encantan?\s*(?:las\s*)?cocinas?\s*abiertas?|cocinas?\s*integradas?|cocinas?\s*semi\s*abiertas?)\b/i.test(t)) return "Abierta";
  if (/\b(?:cocinas?\s*cerradas?|cocinas?\s*independientes?|cocinas?\s*tradicional(?:es)?|cocinas?\s*cl[aá]sicas?)\b/i.test(t)) return "Cerrada";
  if (/\b(?:cocina\s*integral|integral\s*abierta)\b/i.test(t)) {
    if (t.includes("abierta") || t.includes("americana") || t.includes("isla")) return "Abierta";
    return "Integral";
  }
  return null;
}

export function formatRequirementField(value: any, unit: string, originalSnippet?: string): string {
  if (value !== null && value !== undefined && value > 0) {
    return `${value} ${unit}`;
  }
  if (originalSnippet && originalSnippet.trim().length > 0) {
    return originalSnippet.trim();
  }
  return "Sin restricción especificada";
}

export interface DualBusinessEvaluation {
  isDual: boolean;
  bestTrack: "SALE" | "RENT" | "BOTH" | "NONE";
  saleEvaluation: {
    propVal?: string;
    reqVal?: string;
    status: "exact" | "warn" | "missing" | "na";
    scoreRatio: number;
    score?: number;
    propPrice?: number;
    reqBudget?: number;
  };
  rentEvaluation: {
    propVal?: string;
    reqVal?: string;
    status: "exact" | "warn" | "missing" | "na";
    scoreRatio: number;
    score?: number;
    propRent?: number;
    reqBudgetRent?: number;
  };
  finalScore: number;
}

export function evaluateDualBusinessMatch(
  prop: { priceSale?: number; priceRent?: number; adminRequiresInquiry?: boolean; rawText?: string },
  req: { budgetBuyMax?: number; budgetRentMax?: number; rawText?: string }
): DualBusinessEvaluation {
  const isSaleViable = Boolean((prop.priceSale || 0) > 0 && (req.budgetBuyMax || 0) > 0);
  const isRentViable = Boolean((prop.priceRent || 0) > 0 && (req.budgetRentMax || 0) > 0);
  const isDual = isSaleViable && isRentViable;

  let saleEvaluation: DualBusinessEvaluation["saleEvaluation"] = {
    status: "na",
    scoreRatio: 0
  };

  if (isSaleViable) {
    const pSale = prop.priceSale!;
    const rBuyMax = req.budgetBuyMax!;
    const saleRatio = pSale <= rBuyMax ? 1.0 : Math.max(0, 1 - (pSale - rBuyMax) / rBuyMax);
    saleEvaluation = {
      propVal: `$${(pSale / 1_000_000).toLocaleString("es-CO")}M`,
      reqVal: `Hasta $${(rBuyMax / 1_000_000).toLocaleString("es-CO")}M`,
      status: pSale <= rBuyMax ? "exact" : (saleRatio >= 0.95 ? "warn" : "missing"),
      scoreRatio: saleRatio,
      score: saleRatio,
      propPrice: pSale,
      reqBudget: rBuyMax
    };
  }

  let rentEvaluation: DualBusinessEvaluation["rentEvaluation"] = {
    status: "na",
    scoreRatio: 0
  };

  if (isRentViable) {
    const pRent = prop.priceRent!;
    const rRentMax = req.budgetRentMax!;
    const rentRatio = pRent <= rRentMax ? 1.0 : Math.max(0, 1 - (pRent - rRentMax) / rRentMax);
    rentEvaluation = {
      propVal: `$${(pRent / 1_000_000).toLocaleString("es-CO")}M ${prop.adminRequiresInquiry ? "(+ Adm por verificar)" : ""}`.trim(),
      reqVal: `Hasta $${(rRentMax / 1_000_000).toLocaleString("es-CO")}M`,
      status: pRent <= rRentMax ? "exact" : (rentRatio >= 0.90 ? "warn" : "missing"),
      scoreRatio: rentRatio,
      score: rentRatio,
      propRent: pRent,
      reqBudgetRent: rRentMax
    };
  }

  let bestTrack: "SALE" | "RENT" | "BOTH" | "NONE" = "NONE";
  let finalScore = 0;

  if (isSaleViable && isRentViable) {
    bestTrack = "BOTH";
    finalScore = Math.max(saleEvaluation.scoreRatio, rentEvaluation.scoreRatio);
  } else if (isSaleViable) {
    bestTrack = "SALE";
    finalScore = saleEvaluation.scoreRatio;
  } else if (isRentViable) {
    bestTrack = "RENT";
    finalScore = rentEvaluation.scoreRatio;
  }

  return {
    isDual,
    bestTrack,
    saleEvaluation,
    rentEvaluation,
    finalScore
  };
}

/**
 * Analiza el nivel de vigilancia y seguridad en un texto inmobiliario colombiano (Doctrina v31.90).
 * Retorna:
 * - "24_7": Vigilancia privada / portería física las 24 horas confirmada.
 * - "automated": Edificio automatizado, portería remota/virtual, acceso digital o conserje diurno (NO es 24h presencial).
 * - "none": Sin vigilancia especificada o explícitamente sin portería.
 */
export function parseSecurityType(text: string): "24_7" | "automated" | "none" {
  if (!text) return "none";
  const lower = text.toLowerCase();

  // 1. Detectar si es expresamente edificio automatizado, portería virtual/remota o conserje
  const isAutomatedOrConserje = /\b(?:ed(?:ificio)?\s*automatizado|automatizado|porter[ií]a\s*remota|porter[ií]a\s*virtual|porter[ií]a\s*inteligente|acceso\s*digital|acceso\s*inteligente|cerradura\s*digital|sin\s*porter[ií]a|sin\s*vigilancia|sin\s*celadur[ií]a|no\s*tiene\s*vigilancia|no\s*cuenta\s*con\s*vigilancia|porter[ií]a\s*(?:solo\s*)?de\s*d[ií]a|conserje\s*diurno|conserjer[ií]a\s*diurna|solo\s*conserje)\b/i.test(lower) ||
    (/\bconserje\b/i.test(lower) && !/\b(?:24\s*horas|24\/7|24h|permanente)\b/i.test(lower));

  if (isAutomatedOrConserje) {
    return "automated";
  }

  // 2. Detectar si tiene seguridad / vigilancia 24 horas confirmada
  const has24h = /\b(?:seguridad\s*(?:las\s*)?24\s*(?:horas|h|hrs)|seguridad\s*24\/7|vigilancia\s*(?:las\s*)?24\s*(?:horas|h|hrs)|vigilancia\s*24\/7|porter[ií]a\s*(?:las\s*)?24\s*(?:horas|h|hrs)|porter[ií]a\s*24\/7|celadur[ií]a\s*(?:las\s*)?24\s*(?:horas|h|hrs)|celadur[ií]a\s*24\/7|porter[ií]a\s*permanente|vigilancia\s*permanente|seguridad\s*permanente|guardas?\s*24\s*horas|celador\s*24\s*horas)\b/i.test(lower) ||
    /\b(?:24\s*horas|24\/7)\s*(?:de\s*)?(?:vigilancia|seguridad|porter[ií]a|celadur[ií]a)\b/i.test(lower);

  if (has24h) {
    return "24_7";
  }

  return "none";
}

/**
 * Determina si la demanda exige obligatoriamente seguridad o vigilancia 24 horas (Doctrina v31.90).
 */
export function demands24hSecurity(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return /\b(?:seguridad\s*(?:las\s*)?24\s*(?:horas|h|hrs)|seguridad\s*24\/7|vigilancia\s*(?:las\s*)?24\s*(?:horas|h|hrs)|vigilancia\s*24\/7|porter[ií]a\s*(?:las\s*)?24\s*(?:horas|h|hrs)|porter[ií]a\s*24\/7|celadur[ií]a\s*(?:las\s*)?24\s*(?:horas|h|hrs)|celadur[ií]a\s*24\/7|guarda\s*(?:de\s*seguridad)?\s*24\s*(?:horas|h|hrs)|portero\s*24\s*horas|celador\s*24\s*horas|exige\s*(?:seguridad|vigilancia|porter[ií]a)\s*24|seguridad\s*privada\s*24)\b/i.test(lower);
}

/**
 * Evalúa la coherencia de segmento financiero y piso de precio/canon (Doctrina Eduardo v31.107).
 * Regla Doctrinal del 90 al 95% del Presupuesto Máximo (budgetMax * mínimo 0.95 / máximo 0.90).
 * Para $1.700 MM, ninguna propiedad por debajo de $1.530 MM puede hacer match (0% Match).
 * En el mercado inmobiliario, una oferta con un precio significativamente inferior (< 90% del presupuesto o < 90% del mínimo)
 * corresponde a un segmento socioeconómico, estado de conservación o nivel de acabados totalmente
 * ajeno al demandado. No se admiten propiedades alejadas del precio buscado (Regla Doctrinal de Eduardo).
 * Aplica con igual rigor a venta y a canon de arriendo.
 */
export function checkFinancialSegmentCoherence(params: {
  budgetMax: number;
  offeredPrice: number;
  offeredArea?: number;
  isSale: boolean;
  budgetMin?: number;
}): { isCompatible: boolean; reason?: string } {
  const { budgetMax, offeredPrice, isSale, budgetMin } = params;
  if (!budgetMax || budgetMax <= 0 || !offeredPrice || offeredPrice <= 0) {
    return { isCompatible: true };
  }

  // 1. Si la demanda especificó un rango con mínimo explícito (ej: "entre 850 y 1000MM"):
  if (budgetMin && budgetMin > 0) {
    const minFloor = budgetMin * 0.90; // Tolerancia máxima del 10% por debajo del mínimo expresado
    if (offeredPrice < minFloor) {
      const minLabel = `$${(budgetMin / 1_000_000).toLocaleString("es-CO")}M`;
      const offLabel = `$${(offeredPrice / 1_000_000).toLocaleString("es-CO")}M`;
      return {
        isCompatible: false,
        reason: `Precio por Debajo del Piso Solicitado: La demanda exige expresamente un mínimo de ${minLabel} y la oferta tiene un valor de ${offLabel} (inferior al piso admisible de $${(minFloor / 1_000_000).toLocaleString("es-CO")}M). Choque de segmento.`
      };
    }
  }

  // 2. Si la demanda especificó presupuesto techo único (ej: "1700 millones", "hasta 1300MM"):
  // Doctrina Eduardo v31.107: Piso infranqueable del 90 al 95% del presupuesto máximo (budgetMax * mínimo 0.95 / máximo 0.90).
  // Para $1.700 MM, ninguna propiedad por debajo de $1.530 MM (90%) puede hacer match (0% Match).
  const floorRatio = 0.90;
  const minAllowedPrice = budgetMax * floorRatio;

  if (offeredPrice < minAllowedPrice) {
    const pct = Math.round((offeredPrice / budgetMax) * 100);
    if (isSale) {
      return {
        isCompatible: false,
        reason: `Desproporción de Segmento Comercial: El demandante busca en el segmento de $${(budgetMax / 1_000_000).toLocaleString("es-CO")}M y la oferta cuesta apenas $${(offeredPrice / 1_000_000).toLocaleString("es-CO")}M (${pct}% del presupuesto). No corresponde a la gama ni confort esperado (piso mínimo admisible: 90% = $${(minAllowedPrice / 1_000_000).toLocaleString("es-CO")}M).`
      };
    } else {
      return {
        isCompatible: false,
        reason: `Desproporción de Segmento en Arriendo: El canon ofertado de $${(offeredPrice / 1_000_000).toLocaleString("es-CO")}M representa solo el ${pct}% del canon presupuestado ($${(budgetMax / 1_000_000).toLocaleString("es-CO")}M). No corresponde a la categoría solicitada (piso mínimo admisible: 90% = $${(minAllowedPrice / 1_000_000).toLocaleString("es-CO")}M).`
      };
    }
  }

  return { isCompatible: true };
}

export interface ParsedOutdoorAreas {
  terraceArea: number | null;
  balconyArea: number | null;
  patioArea: number | null;
  hasTerrace: boolean;
  hasBalcony: boolean;
  hasPatio: boolean;
  terraceCount: number;
  balconyCount: number;
  summaryOfferLabel: string;
  summaryReqLabel: string;
}

/**
 * Analizador y extractor universal de medidas de espacios exteriores (Terraza, Balcón, Patio)
 * en la jerga inmobiliaria colombiana (Doctrina v31.91).
 * Soporta expresiones como:
 * - "138M2 +72 TERRAZA", "+ 72 TERRAZA", "138M2 + 72M2 TERRAZA"
 * - "TERRAZA DE 72M2", "HERMOSA TERRAZA DE 72 MTS", "CONECTA A HERMOSA TERRAZA DE 72M2"
 * - "72M2 DE TERRAZA", "72 METROS DE TERRAZA"
 * - "75M2 + 2 BALCÓN", "BALCÓN DE 4M2", "BALCÓN 2M2", "2M2 DE BALCÓN"
 * - "PATIO DE 15M2", "+ 20 PATIO"
 */
export function parseOutdoorAreas(rawText: string): ParsedOutdoorAreas {
  if (!rawText) {
    return {
      terraceArea: null,
      balconyArea: null,
      patioArea: null,
      hasTerrace: false,
      hasBalcony: false,
      hasPatio: false,
      terraceCount: 0,
      balconyCount: 0,
      summaryOfferLabel: "Sin dato especificado",
      summaryReqLabel: "Flexible / No exigido",
    };
  }

  const clean = rawText
    .replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0\u200E\u200F\u2028\u2029]/g, " ")
    .replace(/[*_~]/g, " ")
    .toLowerCase();

  const hasTerrace = /\bterrazas?\b/i.test(clean);
  const hasBalcony = /\bbalc[oó]n(?:es)?\b/i.test(clean);
  const hasPatio = /\bpatio(?:s)?\b|\bjard[ií]n(?:es)?\b/i.test(clean);

  let terraceArea: number | null = null;
  let balconyArea: number | null = null;
  let patioArea: number | null = null;

  // 1. TERRAZA: EXTRACCIÓN DE ÁREA EN M2
  // Caso A: Sintaxis aditiva clásica colombiana (ej: "138M2 +72 TERRAZA", "+ 72 TERRAZA", "138M2 + 72M2 TERRAZA")
  const plusTerraceMatch = clean.match(/(?:^|[^\d])\+\s*(\d{1,4}(?:[.,]\d+)?)\s*(?:m2|mts2?|m²|mt2|metros)?\s*(?:de\s+)?(?:hermosa\s+|amplia\s+|gran\s+|privada\s+)?terrazas?/i);
  if (plusTerraceMatch) {
    const val = parseFloat(plusTerraceMatch[1].replace(",", "."));
    if (!isNaN(val) && val > 0 && val <= 2000) {
      terraceArea = val;
    }
  }

  // Caso B: "terraza de 72m2", "hermosa terraza de 72 mts", "conecta a hermosa terraza de 72m2", "terraza privada de 72 m2", "terraza de al menos 50m2"
  if (terraceArea === null) {
    const phraseTerraceMatch = clean.match(/(?:terraza|terrazas)\s+(?:privada|exclusiva|social|amplia|hermosa|espectacular|cubierta|descubierta)?\s*(?:de\s+|con\s+|de\s*aprox(?:imadamente)?\s*|desde\s+)?(?:al\s+menos\s+|m[ií]nimo\s+|m[ií]n\s*[:.]?\s*|por\s+lo\s+menos\s+|m[aá]s\s+de\s+|superior\s+a\s+|mayor\s+a\s+|[>≥]=?\s*)?(\d{1,4}(?:[.,]\d+)?)\s*(?:m2|mts2?|m²|mt2|metros(?:\s*cuadrados)?)/i);
    if (phraseTerraceMatch) {
      const val = parseFloat(phraseTerraceMatch[1].replace(",", "."));
      if (!isNaN(val) && val > 0 && val <= 2000) {
        terraceArea = val;
      }
    }
  }

  // Caso C: Inverso: "72m2 de terraza", "72 mts de terraza", "72 metros de terraza"
  if (terraceArea === null) {
    const invTerraceMatch = clean.match(/(\d{1,4}(?:[.,]\d+)?)\s*(?:m2|mts2?|m²|mt2|metros(?:\s*cuadrados)?)\s*(?:de\s+)?(?:hermosa\s+|amplia\s+|gran\s+|privada\s+)?terrazas?/i);
    if (invTerraceMatch) {
      const val = parseFloat(invTerraceMatch[1].replace(",", "."));
      if (!isNaN(val) && val > 0 && val <= 2000) {
        terraceArea = val;
      }
    }
  }

  // Caso D: Con dos puntos o guión: "terraza: 72 m2", "terraza - 72 mts", "terraza 72 m2"
  if (terraceArea === null) {
    const colonTerraceMatch = clean.match(/(?:terraza|terrazas)\s*[:=-]\s*(\d{1,4}(?:[.,]\d+)?)\s*(?:m2|mts2?|m²|metros)?/i)
      || clean.match(/(?:terraza|terrazas)\s+(\d{1,4}(?:[.,]\d+)?)\s*(?:m2|mts2?|m²|metros)/i);
    if (colonTerraceMatch) {
      const val = parseFloat(colonTerraceMatch[1].replace(",", "."));
      if (!isNaN(val) && val > 0 && val <= 2000) {
        terraceArea = val;
      }
    }
  }

  // 2. BALCÓN: EXTRACCIÓN DE ÁREA EN M2
  // Caso A: Sintaxis aditiva (ej: "+2 BALCÓN", "+ 2M2 BALCÓN", "75M2 + 4 BALCON")
  const plusBalconyMatch = clean.match(/(?:^|[^\d])\+\s*(\d{1,3}(?:[.,]\d+)?)\s*(?:m2|mts2?|m²|metros)?\s*(?:de\s+)?(?:hermoso\s+|amplio\s+|privado\s+)?balc[oó]n(?:es)?/i);
  if (plusBalconyMatch) {
    const val = parseFloat(plusBalconyMatch[1].replace(",", "."));
    if (!isNaN(val) && val > 0 && val <= 150) {
      balconyArea = val;
    }
  }

  // Caso B: "balcón de 4m2", "balcón exterior de 2 mts", "balcón con 3 metros", "balcón de al menos 2 m2"
  if (balconyArea === null) {
    const phraseBalconyMatch = clean.match(/(?:balc[oó]n|balcones)\s+(?:privado|exterior|social|amplio|hermoso|cubierto)?\s*(?:de\s+|con\s+|de\s*aprox(?:imadamente)?\s*|desde\s+)?(?:al\s+menos\s+|m[ií]nimo\s+|m[ií]n\s*[:.]?\s*|por\s+lo\s+menos\s+|m[aá]s\s+de\s+|superior\s+a\s+|mayor\s+a\s+|[>≥]=?\s*)?(\d{1,3}(?:[.,]\d+)?)\s*(?:m2|mts2?|m²|mt2|metros(?:\s*cuadrados)?)/i);
    if (phraseBalconyMatch) {
      const val = parseFloat(phraseBalconyMatch[1].replace(",", "."));
      if (!isNaN(val) && val > 0 && val <= 150) {
        balconyArea = val;
      }
    }
  }

  // Caso C: Inverso: "2m2 de balcón", "4 mts de balcón"
  if (balconyArea === null) {
    const invBalconyMatch = clean.match(/(\d{1,3}(?:[.,]\d+)?)\s*(?:m2|mts2?|m²|mt2|metros(?:\s*cuadrados)?)\s*(?:de\s+)?(?:hermoso\s+|amplio\s+|privado\s+)?balc[oó]n(?:es)?/i);
    if (invBalconyMatch) {
      const val = parseFloat(invBalconyMatch[1].replace(",", "."));
      if (!isNaN(val) && val > 0 && val <= 150) {
        balconyArea = val;
      }
    }
  }

  // Caso D: Con dos puntos o espacio directo: "balcón: 3 m2", "balcón 4 m2"
  if (balconyArea === null) {
    const colonBalconyMatch = clean.match(/(?:balc[oó]n|balcones)\s*[:=-]\s*(\d{1,3}(?:[.,]\d+)?)\s*(?:m2|mts2?|m²|metros)?/i)
      || clean.match(/(?:balc[oó]n|balcones)\s+(\d{1,3}(?:[.,]\d+)?)\s*(?:m2|mts2?|m²|metros)/i);
    if (colonBalconyMatch) {
      const val = parseFloat(colonBalconyMatch[1].replace(",", "."));
      if (!isNaN(val) && val > 0 && val <= 150) {
        balconyArea = val;
      }
    }
  }

  // 3. PATIO: EXTRACCIÓN DE ÁREA EN M2
  const patioMatch = clean.match(/(?:^|[^\d])\+\s*(\d{1,4}(?:[.,]\d+)?)\s*(?:m2|mts2?|m²|metros)?\s*(?:de\s+)?patio/i)
    || clean.match(/patio\s+(?:privado\s+)?(?:de\s+|con\s+)?(\d{1,4}(?:[.,]\d+)?)\s*(?:m2|mts2?|m²|metros)/i)
    || clean.match(/(\d{1,4}(?:[.,]\d+)?)\s*(?:m2|mts2?|m²|metros)\s*(?:de\s+)?patio/i);
  if (patioMatch) {
    const val = parseFloat(patioMatch[1].replace(",", "."));
    if (!isNaN(val) && val > 0 && val <= 1000) {
      patioArea = val;
    }
  }

  // 4. CONTEO DE UNIDADES (distinguiendo de medidas de m2)
  let terraceCount = 0;
  if (hasTerrace) {
    if (/\b(?:2|dos)\s*terrazas\b/i.test(clean)) {
      terraceCount = 2;
    } else if (/\b(?:3|tres)\s*terrazas\b/i.test(clean)) {
      terraceCount = 3;
    } else {
      terraceCount = 1;
    }
  }

  let balconyCount = 0;
  if (hasBalcony) {
    if (/\b(?:2|dos)\s*balcones\b/i.test(clean)) {
      balconyCount = 2;
    } else if (/\b(?:3|tres)\s*balcones\b/i.test(clean)) {
      balconyCount = 3;
    } else {
      balconyCount = 1;
    }
  }

  // 5. CONSTRUCCIÓN DE ETIQUETA INFORMATIVA PARA OFERTA
  let summaryOfferLabel = "Sin dato especificado";
  if (hasBalcony && hasTerrace) {
    if (balconyArea && terraceArea) {
      summaryOfferLabel = `Sí (Balcón ${balconyArea} m² + Terraza ${terraceArea} m²)`;
    } else if (terraceArea) {
      summaryOfferLabel = `Sí (Balcón + Terraza ${terraceArea} m²)`;
    } else if (balconyArea) {
      summaryOfferLabel = `Sí (Balcón ${balconyArea} m² + Terraza)`;
    } else {
      summaryOfferLabel = "Sí (Balcón y Terraza)";
    }
  } else if (hasTerrace) {
    summaryOfferLabel = terraceArea ? `Sí (Terraza Privada ${terraceArea} m²)` : "Sí (Cuenta con Terraza)";
  } else if (hasBalcony) {
    summaryOfferLabel = balconyArea ? `Sí (Balcón ${balconyArea} m²)` : "Sí (Cuenta con Balcón)";
  } else if (hasPatio) {
    summaryOfferLabel = patioArea ? `Sí (Patio ${patioArea} m²)` : "Sí (Cuenta con Patio)";
  }

  // 6. CONSTRUCCIÓN DE ETIQUETA INFORMATIVA PARA DEMANDA
  let summaryReqLabel = "Flexible / No exigido";
  if (hasTerrace) {
    summaryReqLabel = terraceArea ? `Exige Terraza ≥ ${terraceArea} m²` : "Exige Terraza";
  } else if (hasBalcony) {
    summaryReqLabel = balconyArea ? `Exige Balcón ≥ ${balconyArea} m²` : "Exige Balcón";
  } else if (hasPatio) {
    summaryReqLabel = patioArea ? `Exige Patio ≥ ${patioArea} m²` : "Exige Patio";
  }

  return {
    terraceArea,
    balconyArea,
    patioArea,
    hasTerrace,
    hasBalcony,
    hasPatio,
    terraceCount,
    balconyCount,
    summaryOfferLabel,
    summaryReqLabel,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZACIÓN DOCTRINAL DE BARRIOS Y PURIFICACIÓN GEOGRÁFICA (v32.56)
// Casillas 1 a 5 Núcleo Duro Innegociable: Erradicación de Nombres de Ciudad
// o Zonas Genéricas en el Campo Barrio/Vereda.
// ─────────────────────────────────────────────────────────────────────────────

export const CIUDADES_Y_DEPTOS_COLOMBIA = [
  "bogota", "bogota d c", "bogota dc", "distrito capital", "cundinamarca",
  "medellin", "cali", "barranquilla", "cartagena", "bucaramanga", "pereira",
  "manizales", "cucuta", "ibague", "santa marta", "villavicencio", "pasto",
  "monteria", "valledupar", "sincelejo", "armenia", "popayan", "neiva", "tunja",
  "riohacha", "florencia", "yopal", "quibdo", "colombia"
];

export const GENERIC_ZONE_WORDS = new Set([
  "norte", "sur", "oriente", "occidente", "centro", "nororiente", "noroccidente", "suroriente", "suroccidente",
  "sabana", "sabana norte", "sabana occidente", "sabana centro", "toda la ciudad", "varias zonas", "varios barrios",
  "zona", "zonas", "sector", "sectores", "barrio", "barrios", "ciudad", "ciudades", "alrededores",
  "cualquiera", "por definir", "sin especificar", "indiferente", "flexible", "n e", "na", "n a", "null", "undefined",
  "no especificado", "n e no especificado", "d c", "dc", "dto capital", "distrito capital",
  "n", "e", "d", "c", "no", "especificado", "definir", "sin", "varias", "varios", "todos", "todas"
]);

const CIUDADES_Y_DEPTOS_REGEX = /\b(?:bogot[aá](?:\s*,?\s*d\.?\s*c\.?)?|distrito\s+capital|cundinamarca|medell[ií]n|cali|barranquilla|cartagena|bucaramanga|pereira|manizales|c[uú]cuta|ibagu[eé]|santa\s+marta|villavicencio|pasto|monter[ií]a|valledupar|sincelejo|armenia|popay[aá]n|neiva|tunja|riohacha|florencia|yopal|quibd[oó]|colombia)\b/gi;

/**
 * Extrae el nombre puro del barrio/vereda a partir de un texto de zona o ubicación,
 * eliminando nombres de ciudades ("Bogotá, D.C.", "Cali"), países, departamentos y
 * términos genéricos ("Norte", "Sur", etc.).
 * Si el texto SOLO contiene una ciudad o zona genérica (ej: "Bogotá, D.C." o "Bogotá"), retorna null.
 * Si el texto contiene un barrio legítimo (ej: "Chicó, Bogotá", "Cedritos"), retorna el barrio ("Chicó", "Cedritos").
 */
export function extractPureBarrio(zn: string | null | undefined): string | null {
  if (!zn || typeof zn !== "string") return null;
  const raw = zn.trim();
  if (!raw) return null;

  const normWhole = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
  if (!normWhole || GENERIC_ZONE_WORDS.has(normWhole)) return null;
  if (CIUDADES_Y_DEPTOS_COLOMBIA.some(c => normWhole === c || normWhole === `${c} d c` || normWhole === `${c} dc`)) return null;

  // Si todas las palabras que componen el texto son genéricas, ciudades o conectores, es genérico
  const words = normWhole.split(/\s+/).filter(Boolean);
  const isAllGeneric = words.length > 0 && words.every(w => 
    GENERIC_ZONE_WORDS.has(w) || 
    CIUDADES_Y_DEPTOS_COLOMBIA.includes(w) || 
    w === "de" || w === "la" || w === "el" || w === "los" || w === "las" || w === "en" || w === "y" || w === "del"
  );
  if (isAllGeneric) return null;

  // 1. Probar división por delimitadores habituales (coma, punto y coma, slash, barra vertical)
  const parts = raw.split(/[,;/|]+/).map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    const norm = part.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
    if (!norm || norm.length < 2) continue;
    if (GENERIC_ZONE_WORDS.has(norm)) continue;
    if (CIUDADES_Y_DEPTOS_COLOMBIA.some(c => norm === c || norm === `${c} d c` || norm === `${c} dc`)) continue;
    const stripped = norm.replace(CIUDADES_Y_DEPTOS_REGEX, "").trim();
    if (!stripped || stripped.length < 2 || GENERIC_ZONE_WORDS.has(stripped)) continue;
    
    // Devolver la parte limpia sin ciudad residual
    const cleanedPart = part.replace(CIUDADES_Y_DEPTOS_REGEX, "").replace(/^[\s,;/-]+|[\s,;/-]+$/g, "").trim();
    if (cleanedPart && cleanedPart.length >= 2) {
      return cleanedPart;
    }
  }

  // 2. Si no hubo delimitadores o ninguna parte separada fue válida, limpiar la cadena completa
  const strippedWhole = normWhole.replace(CIUDADES_Y_DEPTOS_REGEX, "").replace(/\s+/g, " ").trim();
  if (!strippedWhole || strippedWhole.length < 2 || GENERIC_ZONE_WORDS.has(strippedWhole)) {
    return null;
  }

  const cleaned = raw.replace(CIUDADES_Y_DEPTOS_REGEX, "").replace(/^[\s,;/-]+|[\s,;/-]+$/g, "").trim();
  return (cleaned && cleaned.length >= 2) ? cleaned : null;
}


/**
 * Determina si una zona dada es puramente un nombre de ciudad, departamento,
 * país o cardinal genérico (sin un barrio o vereda legítimo específico).
 */
export function isCityOrGenericZone(zn: string | null | undefined): boolean {
  if (!zn || typeof zn !== "string") return true;
  return extractPureBarrio(zn) === null;
}

export const FAMOUS_EXCLUSIVE_COMPLEXES: string[] = [
  "peñas blancas", "penas blancas",
  "sierras del este",
  "cerros de los alpes",
  "torres del parque",
  "torres de fenicia",
  "bosque medina",
  "altos de yerbabuena",
  "ruitoque condominio", "ruitoque",
  "sindamanoy",
  "aposentos",
  "hato grande", "hatogrande",
  "san simon", "san simón",
  "guaymaral",
  "la pradera de potosi", "la pradera de potosí",
  "el peñon", "el peñón",
  "lakeside",
  "la reserva",
  "castillo grande", "castillogrande",
  "palma real",
  "teka",
  "montearroyo",
  "altos del retiro",
  "bosques de la cañada",
  "parque central bavaria",
  "torres de atrio",
  "torres del bosque",
  "altos de la cabrera",
  "bosque de los nogales",
  "viscaya", "vizcaya",
  "los alpes",
  "santa helena",
  "la floresta",
  "el refugio"
];

/**
 * Extrae el nombre del Condominio, Conjunto Residencial o Edificio a partir del
 * texto de la publicación o su título.
 * Detecta tanto prefijos explícitos (Edificio, Conjunto, Condominio, Torres, etc.)
 * como condominios y edificios reconocidos / exclusivos del corretaje colombiano.
 */
export function extractBuildingOrComplex(rawText?: string | null, title?: string | null): string | null {
  const combined = `${title || ""} ${rawText || ""}`.trim();
  if (!combined) return null;

  const LOWERCASE_CONNECTORS = new Set(["de", "del", "la", "las", "el", "los", "en", "y"]);
  const formatTitleCase = (str: string): string => {
    return str
      .split(/\s+/)
      .map((w, i) => {
        const lower = w.toLowerCase();
        if (i > 0 && LOWERCASE_CONNECTORS.has(lower)) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(" ");
  };

  // 1. Búsqueda por edificios/condominios insignes o exclusivos
  for (const famous of FAMOUS_EXCLUSIVE_COMPLEXES) {
    const rx = new RegExp(`\\b${famous.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (rx.test(combined)) {
      if (famous.includes("peñas") || famous.includes("penas")) return "Edificio Peñas Blancas";
      if (famous.includes("sierras del este")) return "Sierras del Este";
      if (famous.includes("cerros de los alpes")) return "Cerros de los Alpes";
      if (famous.includes("torres del parque")) return "Torres del Parque";
      if (famous.includes("ruitoque")) return "Ruitoque Condominio";
      if (famous.includes("altos de yerbabuena")) return "Altos de Yerbabuena";
      if (famous.includes("sindamanoy")) return "Condominio Sindamanoy";
      if (famous.includes("aposentos")) return "Condominio Aposentos";
      if (famous.includes("hato grande") || famous.includes("hatogrande")) return "Hato Grande";
      if (famous.includes("san simon") || famous.includes("san simón")) return "Condominio San Simón";
      if (famous.includes("guaymaral")) return "Condominio Guaymaral";
      if (famous.includes("pradera de potosi")) return "La Pradera de Potosí";
      if (famous.includes("el peñon") || famous.includes("el peñón")) return "Condominio El Peñón";
      if (famous.includes("castillo grande")) return "Castillo Grande";
      if (famous.includes("bosque medina")) return "Bosque Medina";
      
      return formatTitleCase(famous);
    }
  }

  // 2. Extracción mediante prefijo arquitectónico explícito
  const prefixMatch = combined.match(/\b(?:edificio|ed\.|conjunto(?:\s*residencial|\s*cerrado)?|condominio(?:\s*campestre)?|torre[s]?(?:\s*(?:de|del|las|los))?|urbanizaci[oó]n|residencias?|complejo(?:\s*residencial)?)\s+([A-Za-z0-9ÁÉÍÓÚáéíóúñÑ'’\-]+(?:\s+(?:de\s+|del\s+|la\s+|las\s+|el\s+|los\s+|y\s+)?[A-Za-z0-9ÁÉÍÓÚáéíóúñÑ'’\-]+){0,3})/i);
  if (prefixMatch) {
    let captured = prefixMatch[1].trim();
    // Limpiar palabras cortadas o sufijos que no pertenecen al nombre (números, metrajes, precios, habs)
    captured = captured.replace(/\s+(?:con|\d+|en|para|piso|área|area|precio|valor|canon|apto|casa|venta|arriendo|hab|alcobas?).*$/i, '').trim();
    if (captured.length >= 3 && !/^(?:inteligente|nuevo|antiguo|esquinero|campestre|residencial|comercial)$/i.test(captured) && !isCityOrGenericZone(captured)) {
      return formatTitleCase(captured);
    }
  }

  // 3. Patrón corto en demandas o avisos: "Apto en <Nombre>" donde Nombre no es ciudad ni barrio
  const aptoEnMatch = combined.match(/\b(?:apto|apartamento|casa|ph|penthouse)\s+en\s+([A-Za-z0-9ÁÉÍÓÚáéíóúñÑ'’\-]+(?:\s+[A-Za-z0-9ÁÉÍÓÚáéíóúñÑ'’\-]+){0,2})/i);
  if (aptoEnMatch) {
    let nameCandidate = aptoEnMatch[1].trim();
    nameCandidate = nameCandidate.replace(/\s+(?:con|\d+|en|para|piso|área|area|precio|valor|canon|hab|alcobas?).*$/i, '').trim();
    if (nameCandidate.length >= 4 && !isCityOrGenericZone(nameCandidate)) {
      const norm = nameCandidate.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (FAMOUS_EXCLUSIVE_COMPLEXES.some(f => norm.includes(f) || f.includes(norm))) {
        return formatTitleCase(nameCandidate);
      }
    }
  }

  return null;
}



