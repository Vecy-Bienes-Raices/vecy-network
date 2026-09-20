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
  floor?: number;
  minFloorRequired?: number;
  isThirdPartyCommission: boolean;      // Es tercería
  prohibitsThirdPartyCommission: boolean; // No tercería
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
    isThirdPartyCommission: false,
    prohibitsThirdPartyCommission: false,
  };

  // 1. EXTRACCIÓN DE PRECIO DE VENTA (Soporta "$1 450 Millones", "$1.450M", "$1'450 Millones", "Presupuesto para compra:\n■ Max $1700M")
  const saleMatch = text.match(/(?:presupuesto\s*(?:para\s*)?compra|precio\s*(?:de\s*)?venta|valor\s*(?:de\s*)?venta|para\s*compra)[^$\d\n]*(?:\n[^$\d\n]*)?(?:max|hasta|tope)?\s*\$?\s*(\d{1,4}(?:[\s.'’]\d{3})*|\d+)\s*(?:millones?|mill[oó]n|mm|m\b)/i)
    || text.match(/(?:venta|comprar|compra)[^\d\n]*\$?\s*(\d{1,3}(?:[\s.'’]\d{3})*|\d+)\s*(?:millones|mill[oó]n|m\b)/i);
  if (saleMatch) {
    const cleanNum = saleMatch[1].replace(/[\s.'’]/g, "");
    result.salePriceCOP = parseInt(cleanNum, 10) * 1_000_000;
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

  // 4. ÁREA TOTAL (Mínimo 160m, 230M2, 160 mts, 160 m2, Área: 230)
  const areaMatch = text.match(/(?:m[ií]nimo|[\u00e1a]rea)[^\d\n]*(\d{2,4})\s*(?:m2|mts2|metros|m\b|mt|mts|m²)/i)
    || text.match(/(?:^|[\s▪︎•\-])(\d{2,4})\s*(?:m2|mts2|m²|mt2|mts|metros)/i);
  if (areaMatch) {
    result.areaM2 = parseInt(areaMatch[1], 10);
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

  // 9. ESPACIO EXTERIOR (Balcón / Terraza)
  result.demandsBalconyOrTerrace = /balc[oó]n|terraza/i.test(text);

  // 10. FILTROS DE PISO
  const minFloorMatch = text.match(/piso\s+(\d+)\s+(?:hacia\s+arriba|en\s+adelante)/i);
  if (minFloorMatch) result.minFloorRequired = parseInt(minFloorMatch[1], 10);

  const exactFloorMatch = text.match(/piso[:\s]+(\d+)/i);
  if (exactFloorMatch) result.floor = parseInt(exactFloorMatch[1], 10);

  // 11. COMISIÓN / TERCERÍA (Regla de Guillotina)
  result.prohibitsThirdPartyCommission = /no\s+tercer[ií]a|sin\s+terceros/i.test(text);
  result.isThirdPartyCommission = /en\s+tercer[ií]a|\btercer[ií]a\b/i.test(text);

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

  const isIncluded = /incluid[ao]|inc\b|con\s+(?:admi?n|adm[oó]n|adm\b)/i.test(clean);
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
  const match = clean.match(/(?:m[aá]ximo|hasta|tope|menor\s*a|no\s*mayor\s*a)?\s*(\d{1,2})\s*a[ñn]os(?:\s*de\s*antig[uü]edad)?/i);
  return match ? parseInt(match[1], 10) : null;
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

