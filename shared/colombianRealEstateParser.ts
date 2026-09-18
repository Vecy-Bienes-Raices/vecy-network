/**
 * VECY NETWORK — PARSER Y EVALUADOR INMOBILIARIO COLOMBIANO
 * Módulo compartido de alta precisión para extracción de jerga, monedas, metrajes,
 * cuotas de administración y evaluación condicional de negocio dual (Venta y Arriendo).
 */

/**
 * 1. Extractor de Moneda y Cifras en Jerga Inmobiliaria Colombiana
 * Soporta:
 * - "$1 450 Millones", "$1.450M", "$1450 millones", "$1'450.000.000" -> 1.450.000.000 COP
 * - "Max $1700M" -> 1.700.000.000 COP
 * - "$10M" -> 10.000.000 COP
 * - "max $2M de administración" -> 2.000.000 COP
 * - "800k", "800 mil", "500 k" -> 800.000 / 500.000 COP
 * - "$8.300.000", "$9.500.000" -> 8.300.000 / 9.500.000 COP
 */
export function parseColombianCurrency(rawText: string): number | null {
  if (!rawText) return null;
  const clean = rawText
    .toLowerCase()
    .replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0\u200E\u200F\u2028\u2029]/g, "")
    .replace(/[*_~]/g, "")
    .replace(/,/g, ".");

  // Caso A: Cifra completa directa con puntos o comillas de miles: ej: "$1.450.000.000", "$8.300.000", "1'450.000.000"
  const fullMatch = clean.match(/(?:(?:cop|\$)\s*)?(\d{1,3}(?:[.'’]\d{3}){2,3})/);
  if (fullMatch) {
    const val = parseInt(fullMatch[1].replace(/[.'’]/g, ""), 10);
    if (!isNaN(val) && val > 0) return val;
  }

  // Caso B: Millones con separación por espacios, puntos, comillas o compacto:
  // Ejemplos: "$1 450 Millones", "$1.450M", "$1450 millones", "1700M", "10M", "2M", "11 millones", "1.450 mm"
  const millionMatch = clean.match(/(?:(?:cop|\$)\s*)?(\d{1,4}(?:[\s.'’]\d{3})*|\d+(?:\.\d+)?)\s*(?:mil\s*millones?|millones|millón|mm|m\b)/i);
  if (millionMatch) {
    const rawNumber = millionMatch[1].replace(/[\s'’]/g, "");
    const value = parseFloat(rawNumber);
    if (!isNaN(value)) {
      if (clean.includes("mil millon")) {
        return Math.round(value * 1_000_000_000);
      }
      // Si capturó 1450 -> 1.450.000.000 | Si capturó 1.45 -> 1.450.000.000 | Si capturó 10 -> 10.000.000
      return value < 10000 ? Math.round(value * 1_000_000) : Math.round(value);
    }
  }

  // Caso C: Miles con k o mil: ej: "800k", "800 mil", "500 k", "2000 mil"
  const thousandMatch = clean.match(/(?:(?:cop|\$)\s*)?(\d+(?:\.\d+)?)\s*(?:mil|k\b)/i);
  if (thousandMatch) {
    const val = parseFloat(thousandMatch[1]);
    if (!isNaN(val)) return Math.round(val * 1_000);
  }

  // Caso D: Taquigrafía de miles con un solo punto (ej: "3.500" para arriendo -> 3.500.000)
  const shortThousandMatch = clean.match(/(?:(?:cop|\$)\s*)?(\d{1,3})\.(\d{3})\b/);
  if (shortThousandMatch) {
    const n = parseInt(shortThousandMatch[1] + shortThousandMatch[2], 10);
    return n * 1_000;
  }

  return null;
}

/**
 * 2. Extractor de Área con 'm', 'm2', 'M2', 'mts', 'metros'
 * Soporta "Mínimo 160m", "230M2", "160 m2", "160 mts", "área: 230"
 */
export function parseArea(rawText: string): number | null {
  if (!rawText) return null;
  const clean = rawText
    .toLowerCase()
    .replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0\u200E\u200F\u2028\u2029]/g, "")
    .replace(/[*_~]/g, "");

  // Rango: "160 a 200 m2" o "de 160-200 mt"
  const rangeMatch = clean.match(/(?:área|area|superficie)?\s*(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:m2|mts2|mts|mt2|metros(?:\s+cuadrados)?|m²|m\b)?\s*(?:a|-|hasta)\s*(\d+(?:[.,]\d+)?)\s*(?:m2|mts2|mts|mt2|metros(?:\s+cuadrados)?|m²|m\b)/i);
  if (rangeMatch) {
    const val = parseFloat(rangeMatch[1].replace(",", "."));
    if (!isNaN(val) && val > 10 && val < 50000) return val;
  }

  // Valor directo con o sin prefijo: "Minimo 160m", "230M2", "160 m2", "área: 230"
  const match = clean.match(/(?:área|area|minimo|mínimo|maximo|máximo|superficie|desde)?\s*[:\s]*(\d+(?:[.,]\d+)?)\s*(?:m2|mts2|m²|mt2|mts|metros(?:\s+cuadrados)?|m\b)/i);
  if (match) {
    const val = parseFloat(match[1].replace(",", "."));
    if (!isNaN(val) && val > 10 && val < 50000) return val;
  }

  return null;
}

/**
 * 3. Extractor de Administración colombiana (+ Adm, incluida, max $2M)
 */
export function parseAdminFee(rawText: string): { fee: number | null; isIncluded: boolean; requiresInquiry: boolean } {
  if (!rawText) return { fee: null, isIncluded: false, requiresInquiry: false };
  const clean = rawText.toLowerCase().replace(/[*_~]/g, "");

  const isIncluded = /incluid[ao]|inc\b|con\s+(?:admi?n|adm[oó]n|adm\b)/i.test(clean);
  const requiresInquiry = /\+\s*(?:admi?n|adm[oó]n|adm\b)|\b(?:mas|más)\s*(?:admi?n|adm[oó]n|adm\b)/i.test(clean);

  // Buscar monto explícito: "max $2M de administración", "800 mil admin", "admon $450.000", "cuota: $600k"
  const feeMatch = clean.match(/(?:max|máximo|hasta|tope|de|valor)?\s*(?:cop|\$)?\s*(\d+(?:[\s.'’]\d+)*)\s*(?:m|millones|millon|mil|k)?\s*(?:de\s+)?(?:admi?n|administraci[oó]n|cuota)/i)
    || clean.match(/(?:admi?n|administraci[oó]n|cuota)\s*(?:de|es)?\s*:?\s*(?:cop|\$)?\s*(\d+(?:[\s.'’]\d+)*)\s*(?:m|millones|millon|mil|k)?/i);

  let fee: number | null = null;
  if (feeMatch) {
    fee = parseColombianCurrency(feeMatch[0]);
  }

  return { fee, isIncluded, requiresInquiry };
}

/**
 * 4. Extractor de Antigüedad Máxima
 * Soporta "*Maximo* 20 años de antiguedad", "hasta 15 años", "máximo 10 años"
 */
export function parseMaxAge(rawText: string): number | null {
  if (!rawText) return null;
  const clean = rawText.toLowerCase().replace(/[*_~]/g, "");
  const match = clean.match(/(?:m[aá]ximo|hasta|tope|menor\s*a|no\s*mayor\s*a)?\s*(\d{1,2})\s*a[ñn]os(?:\s*de\s*antig[uü]edad)?/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * 5. Algoritmo para Negocio Dual (Venta y Arriendo Simultáneos)
 * Cuando ambos aceptan compra o alquiler, evalúa los dos carriles y entrega el reporte de afinidad.
 */
export function evaluateDualBusinessMatch(prop: {
  priceSale?: number | null;
  priceRent?: number | null;
  adminRequiresInquiry?: boolean;
  rawText?: string | null;
}, req: {
  budgetBuyMax?: number | null;
  budgetRentMax?: number | null;
  rawText?: string | null;
}) {
  const cleanPropText = (prop.rawText || "").toLowerCase();
  const cleanReqText = (req.rawText || "").toLowerCase();

  const isSaleViable = (prop.priceSale || 0) > 0 && (req.budgetBuyMax || 0) > 0;
  const isRentViable = (prop.priceRent || 0) > 0 && (req.budgetRentMax || 0) > 0;

  const results = {
    isDual: isSaleViable && isRentViable,
    saleEvaluation: null as any,
    rentEvaluation: null as any,
    bestTrack: "NONE" as "SALE" | "RENT" | "BOTH",
    finalScore: 0
  };

  // 1. Evaluar Venta
  if (isSaleViable) {
    const pSale = prop.priceSale!;
    const rBuyMax = req.budgetBuyMax!;
    const saleRatio = pSale <= rBuyMax ? 1.0 : Math.max(0, 1 - (pSale - rBuyMax) / rBuyMax);
    results.saleEvaluation = {
      propVal: `$${(pSale / 1_000_000).toLocaleString("es-CO")}M`,
      reqVal: `Hasta $${(rBuyMax / 1_000_000).toLocaleString("es-CO")}M`,
      status: pSale <= rBuyMax ? "exact" : (saleRatio >= 0.95 ? "warn" : "missing"),
      scoreRatio: saleRatio,
      propPrice: pSale,
      reqBudget: rBuyMax
    };
  }

  // 2. Evaluar Arriendo
  if (isRentViable) {
    const pRent = prop.priceRent!;
    const rRentMax = req.budgetRentMax!;
    const rentRatio = pRent <= rRentMax ? 1.0 : Math.max(0, 1 - (pRent - rRentMax) / rRentMax);
    results.rentEvaluation = {
      propVal: `$${(pRent / 1_000_000).toLocaleString("es-CO")}M ${prop.adminRequiresInquiry ? "(+ Adm por verificar)" : ""}`.trim(),
      reqVal: `Hasta $${(rRentMax / 1_000_000).toLocaleString("es-CO")}M`,
      status: pRent <= rRentMax ? "exact" : (rentRatio >= 0.90 ? "warn" : "missing"),
      scoreRatio: rentRatio,
      propRent: pRent,
      reqBudgetRent: rRentMax
    };
  }

  // Si ambos son viables, toma el carril que mejor beneficie la negociación
  if (isSaleViable && isRentViable) {
    results.bestTrack = "BOTH";
    results.finalScore = Math.max(results.saleEvaluation.scoreRatio, results.rentEvaluation.scoreRatio);
  } else if (isSaleViable) {
    results.bestTrack = "SALE";
    results.finalScore = results.saleEvaluation.scoreRatio;
  } else if (isRentViable) {
    results.bestTrack = "RENT";
    results.finalScore = results.rentEvaluation.scoreRatio;
  }

  return results;
}

/**
 * 6. Regla de Oro para Formateo de Celdas
 * NUNCA muestra "Flexible / Sin restricción" si en el texto original había un requisito explícito.
 */
export function formatRequirementField(value: any, unit: string, originalSnippet?: string): string {
  if (value !== null && value !== undefined && value > 0) {
    return `${value} ${unit}`;
  }
  if (originalSnippet && originalSnippet.trim().length > 0) {
    return originalSnippet.trim();
  }
  return "Sin restricción especificada";
}
