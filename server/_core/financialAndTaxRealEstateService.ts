import {
  BROKER_OFFICIAL_PHONE,
  BROKER_OFFICIAL_WHATSAPP_LINK
} from "./commercialFunnelService";
import { VALOR_UVT_2026, liquidarImpuestosVenta, type TaxCalculationResult } from "./taxEngine";
import { hasCtlTextMarkers, isExplicitCtlStudyRequest } from "./ctlTitleStudyService";
import { isPotUrbanNormRequest } from "./potUrbanNormService";
import { isIduInquiry } from "./iduValorizacionService";
import { generateFinancialAndTaxPdf } from "./jania/legalDocumentPdfService";
import { hasContractDraftMarkers, isContractMinutaOrAuditRequest } from "./legalContractService";

export const UVR_REFERENCIA_2026 = 390.5;
export const SMMLV_REFERENCIA_2026 = 1_423_500;
export const LIMITE_20K_UVT_2026 = 20_000 * VALOR_UVT_2026; // $1.006.360.000
export const LIMITE_50K_UVT_2026 = 50_000 * VALOR_UVT_2026; // $2.515.900.000
export const EXENCION_5K_UVT_2026 = 5_000 * VALOR_UVT_2026; // $251.590.000

export type FinancialPropertyType =
  | "apartamento"
  | "casa"
  | "apartaestudio"
  | "local"
  | "bodega"
  | "oficina"
  | "inmueble";

export interface FinancialTaxParsedQuery {
  isFinancialTaxRequest: boolean;
  isConceptualOnly: boolean;
  hasConcreteNumbers: boolean;
  needsDataGuidance: boolean;
  wantsMortgageOrLeasing: boolean;
  wantsInvestmentRoi: boolean;
  wantsTaxPlanning: boolean;
  incluyeUvr: boolean;
  quiereRentaCorta: boolean;
  propertyType: FinancialPropertyType;
  esVis: boolean;
  esViviendaHabitacion: boolean;
  valorInmuebleCop: number;
  montoCreditoCop: number;
  cuotaInicialCop: number;
  ltvSolicitadoPct?: number;
  plazoAnos: number;
  tasaEaPct: number;
  tasaUvrRealEaPct: number;
  opcionCompraLeasingPct: number;
  ingresoMensualDeclaradoCop?: number;
  canonMensualCop: number;
  administracionMensualCop: number;
  predialAnualCop: number;
  vacanciaPct?: number;
  ocupacionRentaCortaPct?: number;
  costoFiscalCop: number;
  anosPosesion: number;
  vendedorEsPersonaJuridica: boolean;
}

export interface MortgageOptionBreakdown {
  modalidad: string;
  ltvPct: number;
  montoFinanciadoCop: number;
  cuotaInicialCop: number;
  opcionCompraPct: number;
  opcionCompraCop: number;
  plazoMeses: number;
  tasaEaPct: number;
  tasaMensualPct: number;
  cuotaMensualSinSegurosCop: number;
  segurosEstimadosMensualesCop: number;
  cuotaMensualConSegurosCop: number;
  totalInteresesEstimadosCop: number;
  ingresoMinimo30PctLey546Cop: number;
  ingresoReferencial40PctCop: number;
}

export interface UvrSimulationSummary {
  uvrReferenciaCop: number;
  tasaRealUvrEaPct: number;
  inflacionAnualReferenciaPct: number;
  montoInicialUvr: number;
  cuotaInicialMensualUvr: number;
  cuotaMes1SinSegurosCop: number;
  cuotaMes1ConSegurosCop: number;
  cuotaProyectadaAnio5ConSegurosCop: number;
  notaRiesgoInflacion: string;
}

export interface MortgageVsLeasingResult {
  valorInmuebleCop: number;
  esVis: boolean;
  plazoAnos: number;
  tasaEaUsadaPct: number;
  creditoHipotecario: MortgageOptionBreakdown;
  leasingHabitacional80: MortgageOptionBreakdown;
  leasingHabitacional85: MortgageOptionBreakdown;
  simulacionUvr?: UvrSimulationSummary;
  capacidadIngresoUsuario?: {
    ingresoMensualCop: number;
    relacionCuotaIngresoCreditoPct: number;
    relacionCuotaIngresoLeasingPct: number;
    viabilidadLey546: string;
  };
  comparativoResumen: string[];
}

export interface RentaCortaVsTradicionalComparison {
  rentaTradicional: {
    ocupacionPct: number;
    canonMensualCop: number;
    ingresoEfectivoAnualCop: number;
    opexAnualCop: number;
    noiAnualCop: number;
    capRateNetoPct: number;
  };
  rentaCorta: {
    ocupacionPct: number;
    tarifaNocheEquivalenteCop: number;
    ingresoBrutoPotencialAnualCop: number;
    ingresoEfectivoAnualCop: number;
    opexAnualCop: number;
    noiAnualCop: number;
    capRateNetoPct: number;
    notaRegulatoriaPhYRnt: string;
  };
}

export interface InvestmentRoiResult {
  valorInmuebleCop: number;
  propertyType: FinancialPropertyType;
  canonMensualBrutoCop: number;
  rentaBrutaAnualCop: number;
  yieldMensualBrutoPct: number;
  capRateBrutoPct: number;
  vacanciaAplicadaPct: number;
  ingresoEfectivoAnualCop: number;
  opexDesglose: {
    administracionAnualCop: number;
    administracionACargoPropietario: boolean;
    predialAnualCop: number;
    mantenimientoAnualCop: number;
    gestionInmobiliariaAnualCop: number;
    totalOpexAnualCop: number;
  };
  noiAnualCop: number;
  capRateNetoPct: number;
  esApalancado: boolean;
  capitalPropioInvertidoCop: number;
  servicioDeudaAnualCop: number;
  flujoCajaAnualNetoCop: number;
  flujoCajaMensualNetoCop: number;
  cashOnCashPct: number;
  puntoEquilibrio: {
    ocupacionMinimaPct: number;
    mesesMinimosAno: number;
    canonMensualEquilibrioCop: number;
  };
  comparativaRentaTradicionalVsCorta?: RentaCortaVsTradicionalComparison;
  observacionesInversion: string[];
}

export interface TaxPreliquidationResult {
  taxEngineBase: TaxCalculationResult;
  valorVentaCop: number;
  costoFiscalUsadoCop: number;
  costoFiscalFueEstimado: boolean;
  anosPosesion: number;
  esViviendaHabitacion: boolean;
  esVis: boolean;
  vendedorEsPersonaJuridica: boolean;
  retencionFuenteNotarialCop: number;
  tarifaRetencionPct: number;
  gananciaOcasionalCop: number;
  exencionVivienda5000UvtCop: number;
  esRentaOrdinariaMenor2Anos: boolean;
  impuestoTimbreEstimadoCop: number;
  tarifaMarginalTimbreLabel: string;
  totalTributosEstimadosCop: number;
  netoEstimadoAntesNotarialesCop: number;
  notasNormativas: string[];
}

export interface FinancialAndTaxReport {
  querySummary: string;
  hasConcreteNumbers: boolean;
  propertyType: FinancialPropertyType;
  valorInmuebleCop: number;
  mortgageVsLeasing?: MortgageVsLeasingResult;
  investmentRoi?: InvestmentRoiResult;
  taxPreliquidation?: TaxPreliquidationResult;
  whatsappSummary: string;
  analyzedAtIso: string;
}

export interface FinancialAndTaxWhatsAppResult {
  isFinancialTaxRequest: boolean;
  needsDataGuidance: boolean;
  report?: FinancialAndTaxReport;
  responseText: string;
  reactionEmoji: string;
  pdfBuffer?: Buffer;
  pdfFileName?: string;
}

function stripMentions(text?: string | null): string {
  return String(text || "")
    .replace(/@\d{7,18}\b/g, " ")
    .replace(/@jania\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNoAccents(value?: string | null): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatCop(amount: number): string {
  return `$${Math.round(amount || 0).toLocaleString("es-CO")}`;
}

function formatPct(pct: number, decimals = 2): string {
  return `${Number.isFinite(pct) ? pct.toFixed(decimals) : "0.00"}%`;
}

function parseRawMonetaryToken(rawNumber: string, unitToken?: string): number {
  let numStr = String(rawNumber || "").trim().replace(/\s+/g, "");
  if (!numStr) return 0;

  const unit = normalizeNoAccents(unitToken).toLowerCase();
  const hasMillionUnit = /^(?:millones|millon|m|mdp|mm)$/.test(unit);
  const hasThousandUnit = /^mil$/.test(unit);

  if (hasMillionUnit) {
    // Ej: "1.250 millones" o "480 millones" o "2,8 millones" o "2.8M"
    if (/^\d{1,3}\.\d{3}$/.test(numStr)) {
      const val = parseFloat(numStr.replace(/\./g, ""));
      return val * 1_000_000;
    }
    const normalized = numStr.replace(/,/g, ".");
    const val = parseFloat(normalized);
    return Number.isFinite(val) ? Math.round(val * 1_000_000) : 0;
  }

  if (hasThousandUnit) {
    if (/^\d{1,3}\.\d{3}$/.test(numStr)) {
      const val = parseFloat(numStr.replace(/\./g, ""));
      return val * 1_000;
    }
    const val = parseFloat(numStr.replace(/,/g, "."));
    return Number.isFinite(val) ? Math.round(val * 1_000) : 0;
  }

  // Número entero con separadores de miles colombianos (ej: 450.000.000 o 2.800.000)
  if (/^\d{1,3}(?:\.\d{3}){1,4}$/.test(numStr)) {
    return parseInt(numStr.replace(/\./g, ""), 10) || 0;
  }
  if (/^\d{1,3}(?:,\d{3}){1,4}$/.test(numStr)) {
    return parseInt(numStr.replace(/,/g, ""), 10) || 0;
  }

  const digits = parseInt(numStr.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(digits) ? digits : 0;
}

function extractMoneyByLabels(clean: string, labelPattern: RegExp): number {
  const moneyRegex =
    /(?:\$\s*)?(\d{1,3}(?:[.,]\d{3}){1,4}|\d+(?:[.,]\d+)?)(?:\s*(millones|mill[oó]n|mdp|mm|m\b|mil\b))?/gi;
  let match: RegExpExecArray | null;
  while ((match = moneyRegex.exec(clean)) !== null) {
    const startIdx = match.index;
    const prefix = clean.slice(Math.max(0, startIdx - 52), startIdx);
    const suffix = clean.slice(startIdx + match[0].length, Math.min(clean.length, startIdx + match[0].length + 28));
    if (!labelPattern.test(prefix) && !labelPattern.test(suffix)) continue;
    // Evitar confundir cifras UVT ("5.000 UVT" o "20.000 UVT") o áreas ("85 m2") o años ("2008")
    if (/^\s*(?:uvt|m2|metros|a[ñn]os?|meses|%)/i.test(suffix)) continue;
    const parsed = parseRawMonetaryToken(match[1], match[2]);
    if (parsed >= 50_000) {
      return parsed;
    }
  }
  return 0;
}

function extractAllCopAmounts(clean: string): number[] {
  const amounts: number[] = [];
  const moneyRegex =
    /(?:\$\s*)?(\d{1,3}(?:[.,]\d{3}){1,4}|\d+(?:[.,]\d+)?)(?:\s*(millones|mill[oó]n|mdp|mm|m\b|mil\b))?/gi;
  let match: RegExpExecArray | null;
  while ((match = moneyRegex.exec(clean)) !== null) {
    const rawFull = match[0];
    const hasDollar = rawFull.trim().startsWith("$");
    const hasUnit = Boolean(match[2]);
    const suffix = clean.slice(match.index + rawFull.length, Math.min(clean.length, match.index + rawFull.length + 20));
    const prefix = clean.slice(Math.max(0, match.index - 22), match.index);
    if (/^\s*(?:uvt|m2|metros|a[ñn]os?|meses|%)/i.test(suffix)) continue;
    if (/\b(?:chip|matr[ií]cula|c[eé]dula|c\.?c\.?|nit|tel|cel)\b/i.test(prefix)) continue;

    const val = parseRawMonetaryToken(match[1], match[2]);
    if (val >= 200_000 && (hasDollar || hasUnit || val >= 1_000_000)) {
      amounts.push(val);
    }
  }
  return amounts;
}

/**
 * Detecta preguntas puramente conceptuales de finanzas/tributación sin cifras concretas
 * para evitar interceptar dudas teóricas (ej. "¿Qué es el Cap Rate?").
 */
export function isConceptualFinancialOrTaxQuestion(text?: string | null): boolean {
  const clean = stripMentions(text);
  if (!clean) return false;
  const norm = normalizeNoAccents(clean).toLowerCase();

  const hasConcreteMoney = extractAllCopAmounts(clean).length > 0;
  if (hasConcreteMoney) return false;

  const normNoLeadingPunct = norm.replace(/^[¿¡\s]+/, "");
  const isHowToPassiveQuestion =
    /\bcomo\s+se\s+(?:liquida|calcula|aplica|determina|paga|mide|opera|maneja|cobra|declara)\b/i.test(normNoLeadingPunct);
  const isConceptualForm =
    /^(?:(?:hola\s+)?)?(?:jania\s*,?\s*)?(?:[¿¡\s]*)(?:que\s+es|cual\s+es\s+la\s+diferencia|cuales?\s+son\s+(?:las\s+tarifas|los\s+topes|los\s+requisitos)|diferencia\s+entre|como\s+funciona|como\s+aplica|como\s+se\s+(?:liquida|calcula|aplica|determina|paga|mide|opera|maneja|cobra|declara)|para\s+que\s+sirve|explicame|explica|me\s+explicas|que\s+significa|cuando\s+aplica|cuando\s+se\s+paga|cuanto\s+es\s+la\s+tarifa\s+de|de\s+cuanto\s+es)\b/i.test(
      normNoLeadingPunct
    ) ||
    /\b(?:que\s+es\s+(?:el\s+|la\s+|un\s+)?(?:cap\s*rate|roi|cash[-\s]*on[-\s]*cash|yield|leasing\s+habitacional|uvr|ganancia\s+ocasional|impuesto\s+de\s+timbre|ley\s+546|ltv)|diferencia\s+entre\s+(?:credito\s+hipotecario|pesos)\s+y\s+(?:leasing|uvr))\b/i.test(
      normNoLeadingPunct
    );

  const asksToCalculate =
    !isHowToPassiveQuestion &&
    /\b(?:simula(?:me|r)?|calcula(?:me|r)?|hazme\s+(?:la\s+|una\s+|un\s+)?(?:simulaci[oó]n|c[aá]lculo|pre-?liquidaci[oó]n)|pre-?liquida(?:me|r)?|liqu[ií]da(?:me|r)|eval[uú]a(?:me|r)?\s+(?:la\s+|esta\s+)?(?:inversi[oó]n|rentabilidad))\b/i.test(
      norm
    );

  return isConceptualForm && !asksToCalculate;
}

/**
 * Parser integral de consultas financieras, hipotecarias, leasing, Cap Rate/ROI y tributación inmobiliaria.
 */
export function parseFinancialAndTaxQuery(text?: string | null): FinancialTaxParsedQuery {
  const clean = stripMentions(text);
  const norm = normalizeNoAccents(clean).toLowerCase();

  const empty: FinancialTaxParsedQuery = {
    isFinancialTaxRequest: false,
    isConceptualOnly: false,
    hasConcreteNumbers: false,
    needsDataGuidance: false,
    wantsMortgageOrLeasing: false,
    wantsInvestmentRoi: false,
    wantsTaxPlanning: false,
    incluyeUvr: false,
    quiereRentaCorta: false,
    propertyType: "inmueble",
    esVis: false,
    esViviendaHabitacion: false,
    valorInmuebleCop: 0,
    montoCreditoCop: 0,
    cuotaInicialCop: 0,
    plazoAnos: 20,
    tasaEaPct: 11.5,
    tasaUvrRealEaPct: 6.8,
    opcionCompraLeasingPct: 1,
    canonMensualCop: 0,
    administracionMensualCop: 0,
    predialAnualCop: 0,
    costoFiscalCop: 0,
    anosPosesion: 2,
    vendedorEsPersonaJuridica: false
  };

  if (!clean) return empty;

  // Evitar capturar agradecimientos o mensajes de satisfacción pura sin cifras ni verbo de cálculo (Protocolo v34.11)
  const hasCopAmountsInText = extractAllCopAmounts(clean).length > 0;
  const hasActionRequestVerb =
    /\b(?:simula(?:me|r)?|calcula(?:me|r)?|pre-?liquida(?:me|r)?|liqu[ií]da(?:me|r)?|eval[uú]a(?:me|r)?|proyecta(?:me|r)?|necesito|quiero\s+(?:simular|calcular|saber|evaluar|ver)|hazme|puedes\s+(?:simular|calcular|evaluar)|ayudame\s+(?:a\s+)?(?:simular|calcular|evaluar)|cuanto\s+(?:queda|seria|paga|da))\b/i.test(
      norm
    );
  const looksLikeGratitudeOrPraiseOnly =
    !hasCopAmountsInText &&
    !hasActionRequestVerb &&
    /\b(?:gracias|muchas\s+gracias|mil\s+gracias|excelente|genial|perfecto|muy\s+(?:bien|buen[oa]?|complet[oa]?|util|clar[oa]?)|quede\s+(?:muy\s+)?satisfech[oa]?|me\s+encanto|me\s+gusto|super\s+(?:bien|complet[oa]?|util))\b/i.test(
      norm
    );
  if (looksLikeGratitudeOrPraiseOnly) return empty;

  // Guardas estrictas de precedencia para no colisionar con CTL, POT, Minutas/Auditoria Contractual, IDU, Factura Predial o Gastos Notariales puros
  if (hasCtlTextMarkers(clean) || isExplicitCtlStudyRequest(clean)) return empty;
  if (isPotUrbanNormRequest(clean)) return empty;
  if (hasContractDraftMarkers(clean) || isContractMinutaOrAuditRequest(clean)) return empty;
  if (isIduInquiry(clean)) return empty;
  if (/\bCHIP\s+AAA[0-9A-Z]{5,10}\b/i.test(clean) && /\b(?:predial|factura|shd)\b/i.test(norm)) {
    return empty;
  }

  const wantsMortgageOrLeasing =
    /\b(?:credito\s+hipotecari|hipotecari[oa]|leasing\s+habitacional|simulaci[oó]n\s+(?:financiera|hipotecaria|de\s+credito|de\s+leasing)|simula(?:me|r)?\s+(?:un\s+)?(?:credito|leasing|hipoteca|cuota)|cuota\s+mensual|capacidad\s+de\s+endeudamiento|ingreso\s+minimo\s+(?:familiar|requerido)|ley\s+546|\buvr\b|\bltv\b|opcion\s+de\s+compra|credito\s+vs\.?\s*leasing|leasing\s+vs\.?\s*credito)\b/i.test(
      norm
    );

  const wantsInvestmentRoi =
    /\b(?:cap\s*rate|cash[-\s]*on[-\s]*cash|\broi\b|\byield\b|rentabilidad\s+(?:inmobiliaria|bruta|neta|anual|mensual|del\s+inmueble|de\s+inversion)|punto\s+de\s+equilibrio|break[-\s]*even|vacancia|renta\s+corta\s+vs|renta\s+tradicional\s+vs|flujo\s+de\s+caja|retorno\s+(?:de\s+|sobre\s+la\s+)?inversion)\b/i.test(
      norm
    ) ||
    (/\b(?:evalua|calcula|analiza|simula|proyecta)\b.{0,35}\b(?:inversion|rentabilidad|renta\s+corta|airbnb)\b/i.test(
      norm
    ) &&
      extractAllCopAmounts(clean).length > 0);

  const wantsTaxPlanning =
    /\b(?:ganancia\s+ocasional|costo\s+fiscal|impuesto\s+de\s+timbre|\btimbre\b|5\.?000\s*uvt|art(?:iculo)?\.?\s*311-1|art(?:iculo)?\.?\s*314|planeacion\s+tributaria|pre-?liquidacion\s+tributaria|impuestos?\s+(?:por|de)\s+(?:la\s+)?venta|utilidad\s+fiscal|renta\s+liquida\s+ordinaria|tributos?\s+de\s+venta)\b/i.test(
      norm
    ) ||
    (/\bretencion\s+en\s+la\s+fuente\b/i.test(norm) &&
      /\b(?:ganancia|timbre|costo\s+fiscal|posesion|vivienda\s+de\s+habitacion|uvt|tributari)\b/i.test(norm));

  const hasSkill4Domain = wantsMortgageOrLeasing || wantsInvestmentRoi || wantsTaxPlanning;
  if (!hasSkill4Domain) return empty;

  // Excluir solicitudes puramente de gastos notariales/escrituración si no pidieron explícitamente ganancia ocasional, timbre, hipotecario ni ROI
  const isPureNotarialOnly =
    /\b(?:gastos?\s+notariales|derechos?\s+notariales|beneficencia|impuesto\s+de\s+registro|liquidacion\s+notarial|cuanto\s+cobra\s+la\s+notaria)\b/i.test(
      norm
    ) &&
    !wantsInvestmentRoi &&
    !/\b(?:ganancia\s+ocasional|timbre|costo\s+fiscal|cuota\s+mensual|ley\s+546|simula)\b/i.test(norm);
  if (isPureNotarialOnly) return empty;

  // Excluir ACM puros si el usuario solo pide avalúo/ACM/valor m2 sin datos financieros/tributarios propios
  const isPureAcmOnly =
    /\b(?:acm|analisis\s+comparativo\s+de\s+mercado|sondeo\s+de\s+mercado|avaluo\s+comercial)\b/i.test(norm) &&
    !wantsMortgageOrLeasing &&
    !wantsInvestmentRoi &&
    !wantsTaxPlanning;
  if (isPureAcmOnly) return empty;

  if (isConceptualFinancialOrTaxQuestion(clean)) {
    return {
      ...empty,
      isConceptualOnly: true,
      wantsMortgageOrLeasing,
      wantsInvestmentRoi,
      wantsTaxPlanning
    };
  }

  // Tipología
  let propertyType: FinancialPropertyType = "inmueble";
  if (/\bapartaestudio\b/i.test(norm)) propertyType = "apartaestudio";
  else if (/\b(?:apartamento|apto)\b/i.test(norm)) propertyType = "apartamento";
  else if (/\bcasa\b/i.test(norm)) propertyType = "casa";
  else if (/\blocal\b/i.test(norm)) propertyType = "local";
  else if (/\bbodega\b/i.test(norm)) propertyType = "bodega";
  else if (/\boficina\b/i.test(norm)) propertyType = "oficina";

  const esVis = /\b(?:vis|vip|interes\s+social|interes\s+prioritario)\b/i.test(norm) && !/\bno[\s-]*vis\b/i.test(norm);
  const esViviendaHabitacion =
    /\b(?:vivienda\s+de\s+habitacion|casa\s+de\s+habitacion|mi\s+vivienda\s+habitual|habitacion\s+principal|art\.?\s*311-1)\b/i.test(
      norm
    );
  const incluyeUvr = /\buvr\b/i.test(norm);
  const quiereRentaCorta =
    /\b(?:renta\s+corta|airbnb|booking|turistic[ao]|corta\s+estancia|dias)\b/i.test(norm) ||
    propertyType === "apartaestudio";
  const vendedorEsPersonaJuridica = /\b(?:persona\s+juridica|empresa\s+vende|sociedad\s+vende|constructora)\b/i.test(norm);

  // Extracción de montos etiquetados
  let valorInmuebleCop = extractMoneyByLabels(
    clean,
    /\b(?:valor(?:\s+comercial|\s+del?\s+inmueble|\s+de\s+venta|\s+compra)?|precio(?:\s+de\s+venta)?|inmueble\s+de|apartamento\s+de|apto\s+de|casa\s+de|apartaestudio\s+de|local\s+de|bodega\s+de|oficina\s+de|venta\s+(?:de|en|por)|compra\s+(?:de|en|por)|propiedad\s+de|no[\s-]*vis\s+de|vis\s+de)\b/i
  );
  const montoCreditoCop = extractMoneyByLabels(
    clean,
    /\b(?:credito\s+(?:de|por)|monto\s+(?:a\s+financiar|del\s+credito)|financiar|prestamo\s+(?:de|por)|financiacion\s+(?:de|por))\b/i
  );
  const cuotaInicialCop = extractMoneyByLabels(clean, /\b(?:cuota\s+inicial|inicial\s+de|aporte\s+inicial)\b/i);
  const canonMensualCop = extractMoneyByLabels(
    clean,
    /\b(?:canon(?:\s+mensual)?|arriendo(?:\s+mensual)?|renta\s+(?:mensual|estimada)|arrendado\s+en|alquiler(?:\s+mensual)?)\b/i
  );
  const administracionMensualCop = extractMoneyByLabels(
    clean,
    /\b(?:administracion|admon|cuota\s+de\s+administracion)\b/i
  );
  const predialAnualCop = extractMoneyByLabels(
    clean,
    /\b(?:predial(?:\s+anual)?|impuesto\s+predial)\b/i
  );
  const costoFiscalCop = extractMoneyByLabels(
    clean,
    /\b(?:costo\s+fiscal|comprad[oa]\s+(?:en|por)|adquirid[oa]\s+(?:en|por)|escritura\s+(?:anterior|original)\s+(?:en|de|por)|base\s+fiscal)\b/i
  );
  const ingresoMensualDeclaradoCop = extractMoneyByLabels(
    clean,
    /\b(?:ingresos?\s+(?:mensuales|familiares)?|salario|sueldo|gano|ganamos)\b/i
  );

  // Fallback si solo se dio un valor monetario grande sin etiqueta previa explícita
  if (valorInmuebleCop <= 0) {
    const allAmounts = extractAllCopAmounts(clean);
    const largePurchase = allAmounts.find((v) => v >= 50_000_000);
    if (largePurchase) {
      valorInmuebleCop = largePurchase;
    } else if (montoCreditoCop > 0) {
      // Inferir valor comercial de referencia a partir del crédito con LTV 70%
      valorInmuebleCop = Math.round(montoCreditoCop / (esVis ? 0.8 : 0.7));
    }
  }

  // Plazo
  let plazoAnos = 20;
  const yearsMatch = norm.match(/\b(?:a\s+|plazo\s+(?:de\s+)?)?(\d{1,2})\s*anos\b/);
  const monthsMatch = norm.match(/\b(\d{2,3})\s*meses\b/);
  if (yearsMatch) {
    const y = parseInt(yearsMatch[1], 10);
    if (y >= 3 && y <= 30) plazoAnos = y;
  } else if (monthsMatch) {
    const m = parseInt(monthsMatch[1], 10);
    if (m >= 24 && m <= 360) plazoAnos = Math.max(2, Math.round(m / 12));
  }

  // Años de posesión (tributario)
  let anosPosesion = 2;
  const posesionMatch =
    norm.match(/\b(?:posesion\s+(?:de\s+)?|hace\s+|comprad[oa]\s+hace\s+|tenencia\s+(?:de\s+)?|poseid[oa]\s+(?:por\s+)?)(\d{1,2})\s*anos?\b/) ||
    norm.match(/\b(\d{1,2})\s*anos?\s+de\s+(?:posesion|tenencia|comprad[oa])\b/);
  if (posesionMatch) {
    anosPosesion = parseInt(posesionMatch[1], 10);
  } else if (/\bmenos\s+de\s+2\s*anos?\b/.test(norm)) {
    anosPosesion = 1;
  }

  // Tasas (% E.A.)
  let tasaEaPct = 11.5;
  const tasaMatch = norm.match(/\b(?:tasa\s*(?:del?\s*|de\s*)?|al\s+|ea\s*(?:del?\s*)?)(\d{1,2}(?:[.,]\d{1,2})?)\s*%\s*(?:e\.?\s*a\.?|efectiv[ao]\s+anual)?/i);
  if (tasaMatch) {
    const t = parseFloat(tasaMatch[1].replace(",", "."));
    if (t >= 3 && t <= 28) tasaEaPct = t;
  }

  let tasaUvrRealEaPct = 6.8;
  const uvrRateMatch = norm.match(/\buvr\s*(?:\+|mas)\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i);
  if (uvrRateMatch) {
    const ur = parseFloat(uvrRateMatch[1].replace(",", "."));
    if (ur >= 2 && ur <= 15) tasaUvrRealEaPct = ur;
  }

  // LTV / Cuota inicial %
  let ltvSolicitadoPct: number | undefined;
  const ltvMatch = norm.match(/\b(?:ltv|financiar(?:ia|emos)?|financiacion)\s*(?:del?\s*)?(\d{2})\s*%/i);
  if (ltvMatch) {
    const ltv = parseInt(ltvMatch[1], 10);
    if (ltv >= 20 && ltv <= 90) ltvSolicitadoPct = ltv;
  } else {
    const inicialPctMatch = norm.match(/\bcuota\s+inicial\s*(?:del?\s*)?(\d{1,2})\s*%/i);
    if (inicialPctMatch) {
      const ini = parseInt(inicialPctMatch[1], 10);
      if (ini >= 10 && ini <= 80) ltvSolicitadoPct = 100 - ini;
    }
  }

  // Opción de compra leasing
  let opcionCompraLeasingPct = 1;
  const opcionMatch = norm.match(/\bopcion\s+de\s+compra\s*(?:del?\s*)?(\d{1,2}(?:[.,]\d+)?)\s*%/i);
  if (opcionMatch) {
    const op = parseFloat(opcionMatch[1].replace(",", "."));
    if (op >= 0 && op <= 30) opcionCompraLeasingPct = op;
  }

  // Vacancia / Ocupación
  let vacanciaPct: number | undefined;
  const vacMatch = norm.match(/\bvacancia\s*(?:del?\s*)?(\d{1,2}(?:[.,]\d+)?)\s*%/i);
  if (vacMatch) {
    vacanciaPct = parseFloat(vacMatch[1].replace(",", "."));
  }
  let ocupacionRentaCortaPct: number | undefined;
  const occMatch = norm.match(/\bocupacion\s*(?:del?\s*)?(\d{2,3})\s*%/i);
  if (occMatch) {
    ocupacionRentaCortaPct = Math.min(98, Math.max(20, parseInt(occMatch[1], 10)));
  }

  const hasConcreteNumbers = valorInmuebleCop > 0 || montoCreditoCop > 0 || canonMensualCop > 0;

  return {
    isFinancialTaxRequest: true,
    isConceptualOnly: false,
    hasConcreteNumbers,
    needsDataGuidance: !hasConcreteNumbers,
    wantsMortgageOrLeasing,
    wantsInvestmentRoi,
    wantsTaxPlanning,
    incluyeUvr,
    quiereRentaCorta,
    propertyType,
    esVis,
    esViviendaHabitacion,
    valorInmuebleCop,
    montoCreditoCop,
    cuotaInicialCop,
    ltvSolicitadoPct,
    plazoAnos,
    tasaEaPct,
    tasaUvrRealEaPct,
    opcionCompraLeasingPct,
    ingresoMensualDeclaradoCop: ingresoMensualDeclaradoCop > 0 ? ingresoMensualDeclaradoCop : undefined,
    canonMensualCop,
    administracionMensualCop,
    predialAnualCop,
    vacanciaPct,
    ocupacionRentaCortaPct,
    costoFiscalCop,
    anosPosesion,
    vendedorEsPersonaJuridica
  };
}

export function isFinancialOrTaxSimulationRequest(text?: string | null): boolean {
  return parseFinancialAndTaxQuery(text).isFinancialTaxRequest;
}

/**
 * Calcula cuota mensual francesa en Pesos a partir de tasa Efectiva Anual y opcionalmente valor residual (opción de compra leasing).
 */
function calculateFrenchMonthlyPayment(params: {
  principal: number;
  eaDecimal: number;
  months: number;
  residualValue?: number;
}): {
  monthlyRate: number;
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
} {
  const { principal, eaDecimal, months, residualValue = 0 } = params;
  if (principal <= 0 || months <= 0) {
    return { monthlyRate: 0, monthlyPayment: 0, totalPaid: 0, totalInterest: 0 };
  }
  const monthlyRate = Math.pow(1 + eaDecimal, 1 / 12) - 1;
  if (monthlyRate <= 0) {
    const pmt = (principal - residualValue) / months;
    return { monthlyRate: 0, monthlyPayment: Math.round(pmt), totalPaid: Math.round(principal), totalInterest: 0 };
  }
  const discountFactor = Math.pow(1 + monthlyRate, -months);
  const pvNet = Math.max(0, principal - residualValue * discountFactor);
  const monthlyPayment = (pvNet * monthlyRate) / (1 - discountFactor);
  const totalPaid = monthlyPayment * months + residualValue;
  const totalInterest = Math.max(0, totalPaid - principal);

  return {
    monthlyRate,
    monthlyPayment: Math.round(monthlyPayment),
    totalPaid: Math.round(totalPaid),
    totalInterest: Math.round(totalInterest)
  };
}

function estimateMonthlyInsurances(loanAmount: number, propertyValue: number): number {
  const vidaDeudor = loanAmount * 0.00055; // ~0.055% mensual sobre saldo inicial
  const incendioTerremoto = propertyValue * 0.8 * 0.00022; // ~0.022% sobre 80% parte destructible
  return Math.round(vidaDeudor + incendioTerremoto);
}

/**
 * Simula Crédito Hipotecario (Ley 546) vs Leasing Habitacional (80% y 85%) y UVR opcional.
 */
export function simulateMortgageVsLeasing(params: {
  valorInmuebleCop: number;
  esVis?: boolean;
  plazoAnos?: number;
  tasaEaPct?: number;
  tasaUvrRealEaPct?: number;
  incluyeUvr?: boolean;
  ltvCreditoPct?: number;
  opcionCompraLeasingPct?: number;
  ingresoMensualDeclaradoCop?: number;
}): MortgageVsLeasingResult {
  const valorInmuebleCop = Math.max(0, Math.round(params.valorInmuebleCop));
  const esVis = Boolean(params.esVis);
  const plazoAnos = Math.min(30, Math.max(3, params.plazoAnos || 20));
  const meses = plazoAnos * 12;
  const tasaEaUsadaPct = params.tasaEaPct ?? 11.5;
  const tasaEaDec = tasaEaUsadaPct / 100;
  const opcionCompraPct = params.opcionCompraLeasingPct ?? 1;

  // Regla LTV: Crédito Hipotecario tradicional max 70% No-VIS / 80% VIS
  const maxLtvCredito = esVis ? 80 : 70;
  const ltvCredito = params.ltvCreditoPct ? Math.min(maxLtvCredito, Math.max(20, params.ltvCreditoPct)) : maxLtvCredito;
  const montoCredito = Math.round(valorInmuebleCop * (ltvCredito / 100));
  const cuotaInicialCredito = valorInmuebleCop - montoCredito;

  const pmtCredito = calculateFrenchMonthlyPayment({
    principal: montoCredito,
    eaDecimal: tasaEaDec,
    months: meses
  });
  const segCredito = estimateMonthlyInsurances(montoCredito, valorInmuebleCop);
  const cuotaConSegCredito = pmtCredito.monthlyPayment + segCredito;

  const creditoHipotecario: MortgageOptionBreakdown = {
    modalidad: `Crédito Hipotecario Tradicional (${esVis ? "VIS" : "No-VIS"} - Ley 546)`,
    ltvPct: ltvCredito,
    montoFinanciadoCop: montoCredito,
    cuotaInicialCop: cuotaInicialCredito,
    opcionCompraPct: 0,
    opcionCompraCop: 0,
    plazoMeses: meses,
    tasaEaPct: tasaEaUsadaPct,
    tasaMensualPct: Number((pmtCredito.monthlyRate * 100).toFixed(3)),
    cuotaMensualSinSegurosCop: pmtCredito.monthlyPayment,
    segurosEstimadosMensualesCop: segCredito,
    cuotaMensualConSegurosCop: cuotaConSegCredito,
    totalInteresesEstimadosCop: pmtCredito.totalInterest,
    ingresoMinimo30PctLey546Cop: Math.round(cuotaConSegCredito / 0.3),
    ingresoReferencial40PctCop: Math.round(cuotaConSegCredito / 0.4)
  };

  // Leasing Habitacional 80% y 85% (opción de compra sobre valor del inmueble)
  const buildLeasingOption = (ltvLeasingPct: number, labelSuffix: string): MortgageOptionBreakdown => {
    const montoLeasing = Math.round(valorInmuebleCop * (ltvLeasingPct / 100));
    const cuotaInicialLeasing = valorInmuebleCop - montoLeasing;
    const opcionCompraCop = Math.round(valorInmuebleCop * (opcionCompraPct / 100));
    const pmtLeasing = calculateFrenchMonthlyPayment({
      principal: montoLeasing,
      eaDecimal: tasaEaDec,
      months: meses,
      residualValue: opcionCompraCop
    });
    const segLeasing = estimateMonthlyInsurances(montoLeasing, valorInmuebleCop);
    const cuotaConSegLeasing = pmtLeasing.monthlyPayment + segLeasing;

    return {
      modalidad: `Leasing Habitacional ${labelSuffix} (Dto. 2555/2010)`,
      ltvPct: ltvLeasingPct,
      montoFinanciadoCop: montoLeasing,
      cuotaInicialCop: cuotaInicialLeasing,
      opcionCompraPct,
      opcionCompraCop,
      plazoMeses: meses,
      tasaEaPct: tasaEaUsadaPct,
      tasaMensualPct: Number((pmtLeasing.monthlyRate * 100).toFixed(3)),
      cuotaMensualSinSegurosCop: pmtLeasing.monthlyPayment,
      segurosEstimadosMensualesCop: segLeasing,
      cuotaMensualConSegurosCop: cuotaConSegLeasing,
      totalInteresesEstimadosCop: pmtLeasing.totalInterest,
      ingresoMinimo30PctLey546Cop: Math.round(cuotaConSegLeasing / 0.3),
      ingresoReferencial40PctCop: Math.round(cuotaConSegLeasing / 0.4)
    };
  };

  const leasingHabitacional80 = buildLeasingOption(80, "80% LTV");
  const leasingHabitacional85 = buildLeasingOption(85, "85% LTV");

  let simulacionUvr: UvrSimulationSummary | undefined;
  if (params.incluyeUvr) {
    const tasaRealUvr = params.tasaUvrRealEaPct ?? 6.8;
    const inflacionRef = 5.0;
    const montoUvr = montoCredito / UVR_REFERENCIA_2026;
    const pmtUvr = calculateFrenchMonthlyPayment({
      principal: montoUvr,
      eaDecimal: tasaRealUvr / 100,
      months: meses
    });
    const cuotaMes1Cop = Math.round(pmtUvr.monthlyPayment * UVR_REFERENCIA_2026);
    const cuotaMes1ConSeg = cuotaMes1Cop + segCredito;
    const factorInflacion5Anos = Math.pow(1 + inflacionRef / 100, 5);
    const cuotaAnio5ConSeg = Math.round(cuotaMes1Cop * factorInflacion5Anos) + segCredito;

    simulacionUvr = {
      uvrReferenciaCop: UVR_REFERENCIA_2026,
      tasaRealUvrEaPct: tasaRealUvr,
      inflacionAnualReferenciaPct: inflacionRef,
      montoInicialUvr: Math.round(montoUvr),
      cuotaInicialMensualUvr: Math.round(pmtUvr.monthlyPayment),
      cuotaMes1SinSegurosCop: cuotaMes1Cop,
      cuotaMes1ConSegurosCop: cuotaMes1ConSeg,
      cuotaProyectadaAnio5ConSegurosCop: cuotaAnio5ConSeg,
      notaRiesgoInflacion:
        "En UVR la cuota inicia más baja que en Pesos, pero tanto el saldo como el canon mensual se reajustan diariamente con la inflación (IPC). En Pesos cuota fija conoces el valor exacto desde el mes 1 hasta el final."
    };
  }

  let capacidadIngresoUsuario: MortgageVsLeasingResult["capacidadIngresoUsuario"];
  if (params.ingresoMensualDeclaradoCop && params.ingresoMensualDeclaradoCop > 0) {
    const ing = params.ingresoMensualDeclaradoCop;
    const relCred = (creditoHipotecario.cuotaMensualConSegurosCop / ing) * 100;
    const relLeas = (leasingHabitacional80.cuotaMensualConSegurosCop / ing) * 100;
    const viabilidadLey546 =
      relCred <= 30
        ? "✅ Cumple holgadamente el límite legal del 30% de Ley 546 de 1999."
        : relLeas <= 40
        ? "⚠️ Supera el 30% de Ley 546 para crédito tradicional; podría evaluarse en rango referencial hasta 40% en leasing habitacional o sumando ingresos familiares."
        : "🚨 Supera el 40% de los ingresos declarados: se recomienda aumentar cuota inicial, ampliar plazo o consolidar ingresos familiares.";
    capacidadIngresoUsuario = {
      ingresoMensualCop: ing,
      relacionCuotaIngresoCreditoPct: Number(relCred.toFixed(1)),
      relacionCuotaIngresoLeasingPct: Number(relLeas.toFixed(1)),
      viabilidadLey546
    };
  }

  const ahorroCuotaInicial80 = Math.max(0, creditoHipotecario.cuotaInicialCop - leasingHabitacional80.cuotaInicialCop);
  const comparativoResumen = [
    `Cuota inicial: Crédito ${ltvCredito}% requiere ${formatCop(creditoHipotecario.cuotaInicialCop)} (${100 - ltvCredito}%), mientras Leasing 80% requiere ${formatCop(leasingHabitacional80.cuotaInicialCop)} (ahorro de liquidez inicial de ${formatCop(ahorroCuotaInicial80)}) y Leasing 85% solo ${formatCop(leasingHabitacional85.cuotaInicialCop)} (15%).`,
    `Ley 546 de 1999 (tope 30%): exige ingresos familiares mínimos de ${formatCop(creditoHipotecario.ingresoMinimo30PctLey546Cop)}/mes para crédito y ${formatCop(leasingHabitacional80.ingresoMinimo30PctLey546Cop)}/mes para leasing 80% (rango ampliado referencial 40%: ${formatCop(leasingHabitacional80.ingresoReferencial40PctCop)}/mes).`,
    `Ventaja jurídica y registral del Leasing: el banco figura como propietario inicial; no constituyes hipoteca a tu nombre al inicio y si cedes el contrato antes de ejercer la opción de compra (${opcionCompraPct}% = ${formatCop(leasingHabitacional80.opcionCompraCop)}), optimizas costos de registro frente a una compraventa tradicional.`
  ];

  return {
    valorInmuebleCop,
    esVis,
    plazoAnos,
    tasaEaUsadaPct,
    creditoHipotecario,
    leasingHabitacional80,
    leasingHabitacional85,
    simulacionUvr,
    capacidadIngresoUsuario,
    comparativoResumen
  };
}

/**
 * Evalúa rentabilidad inmobiliaria: Cap Rate bruto y neto, Cash-on-Cash, Yield mensual,
 * punto de equilibrio y comparativa Renta Tradicional vs Renta Corta.
 */
export function evaluateInvestmentAndYield(params: {
  valorInmuebleCop: number;
  canonMensualCop?: number;
  propertyType?: FinancialPropertyType;
  administracionMensualCop?: number;
  predialAnualCop?: number;
  vacanciaPct?: number;
  ocupacionRentaCortaPct?: number;
  quiereRentaCorta?: boolean;
  cuotaInicialCop?: number;
  servicioDeudaAnualCop?: number;
}): InvestmentRoiResult {
  const valorInmuebleCop = Math.max(1, Math.round(params.valorInmuebleCop));
  const propertyType = params.propertyType || "apartamento";
  const esComercial = propertyType === "local" || propertyType === "bodega" || propertyType === "oficina";

  // Si no envió canon pero pidió evaluar rentabilidad sobre un valor, estimar yield referencial conservador (0.55% residencial / 0.75% comercial)
  const canonMensualBrutoCop =
    params.canonMensualCop && params.canonMensualCop > 0
      ? Math.round(params.canonMensualCop)
      : Math.round(valorInmuebleCop * (esComercial ? 0.0075 : 0.0055));

  const rentaBrutaAnualCop = canonMensualBrutoCop * 12;
  const yieldMensualBrutoPct = (canonMensualBrutoCop / valorInmuebleCop) * 100;
  const capRateBrutoPct = (rentaBrutaAnualCop / valorInmuebleCop) * 100;

  const vacanciaPct =
    params.vacanciaPct !== undefined
      ? Math.min(60, Math.max(0, params.vacanciaPct))
      : params.quiereRentaCorta && propertyType === "apartaestudio"
      ? 25
      : 8.33; // 1 mes/año estándar en renta tradicional

  const ocupacionPct = 100 - vacanciaPct;
  const ingresoEfectivoAnualCop = Math.round(rentaBrutaAnualCop * (ocupacionPct / 100));

  const admonMensual = params.administracionMensualCop ?? 0;
  // En renta tradicional normalmente la administración la paga el inquilino excepto durante meses vacantes;
  // en renta corta o si el usuario especificó admon como costo propio la descontamos proporcionalmente o completa según modelo.
  const administracionACargoPropietario = Boolean(params.quiereRentaCorta && propertyType === "apartaestudio");
  const administracionAnualCop = administracionACargoPropietario
    ? Math.round(admonMensual * 12)
    : Math.round(admonMensual * 12 * (vacanciaPct / 100));

  const predialAnualCop =
    params.predialAnualCop && params.predialAnualCop > 0
      ? Math.round(params.predialAnualCop)
      : Math.round(valorInmuebleCop * (esComercial ? 0.0085 : 0.006)); // Referencia catastral ~60-70% avalúo x tarifa

  const mantenimientoAnualCop = Math.round(ingresoEfectivoAnualCop * 0.05);
  const gestionInmobiliariaAnualCop = Math.round(
    ingresoEfectivoAnualCop * (administracionACargoPropietario ? 0.15 : 0.08)
  );
  const totalOpexAnualCop =
    administracionAnualCop + predialAnualCop + mantenimientoAnualCop + gestionInmobiliariaAnualCop;

  const noiAnualCop = ingresoEfectivoAnualCop - totalOpexAnualCop;
  const capRateNetoPct = (noiAnualCop / valorInmuebleCop) * 100;

  const servicioDeudaAnualCop = Math.max(0, Math.round(params.servicioDeudaAnualCop || 0));
  const esApalancado = servicioDeudaAnualCop > 0 && (params.cuotaInicialCop || 0) > 0;
  const gastosCierreCompraEst = Math.round(valorInmuebleCop * 0.022);
  const capitalPropioInvertidoCop = esApalancado
    ? Math.round((params.cuotaInicialCop || 0) + gastosCierreCompraEst)
    : Math.round(valorInmuebleCop + gastosCierreCompraEst);

  const flujoCajaAnualNetoCop = noiAnualCop - servicioDeudaAnualCop;
  const flujoCajaMensualNetoCop = Math.round(flujoCajaAnualNetoCop / 12);
  const cashOnCashPct = (flujoCajaAnualNetoCop / Math.max(1, capitalPropioInvertidoCop)) * 100;

  // Punto de equilibrio para cubrir costos fijos (OPEX fijo + servicio deuda si aplica)
  const costosFijosAnualesCop =
    Math.round(admonMensual * 12) + predialAnualCop + Math.round(valorInmuebleCop * 0.003) + servicioDeudaAnualCop;
  const ocupacionMinimaPct = Math.min(100, Math.max(0, (costosFijosAnualesCop / Math.max(1, rentaBrutaAnualCop)) * 100));
  const mesesMinimosAno = Number(((ocupacionMinimaPct / 100) * 12).toFixed(1));
  const canonMensualEquilibrioCop = Math.round(costosFijosAnualesCop / 12);

  let comparativaRentaTradicionalVsCorta: RentaCortaVsTradicionalComparison | undefined;
  if (params.quiereRentaCorta || propertyType === "apartaestudio") {
    // Escenario Renta Tradicional (91.67% ocupación, 1 mes vacancia/año)
    const occTrad = 91.67;
    const ingTrad = Math.round(rentaBrutaAnualCop * (occTrad / 100));
    const opexTrad = Math.round(admonMensual * 12 * 0.0833) + predialAnualCop + Math.round(ingTrad * 0.13);
    const noiTrad = ingTrad - opexTrad;

    // Escenario Renta Corta (ocupación 70% o dada por usuario, tarifa equivalente +55% sobre canon diario)
    const occCorta = params.ocupacionRentaCortaPct ?? 70;
    const tarifaNocheEquiv = Math.round((canonMensualBrutoCop / 30) * 1.55);
    const ingBrutoCorta = tarifaNocheEquiv * 365;
    const ingEfecCorta = Math.round(ingBrutoCorta * (occCorta / 100));
    // En renta corta propietario asume 100% administración, servicios/internet (~$350k/mes) + 18% comisión plataforma/operador + mantenimiento
    const serviciosInternetAnual = 350_000 * 12;
    const opexCorta =
      Math.round(admonMensual * 12) +
      predialAnualCop +
      serviciosInternetAnual +
      Math.round(ingEfecCorta * 0.22);
    const noiCorta = ingEfecCorta - opexCorta;

    comparativaRentaTradicionalVsCorta = {
      rentaTradicional: {
        ocupacionPct: occTrad,
        canonMensualCop: canonMensualBrutoCop,
        ingresoEfectivoAnualCop: ingTrad,
        opexAnualCop: opexTrad,
        noiAnualCop: noiTrad,
        capRateNetoPct: Number(((noiTrad / valorInmuebleCop) * 100).toFixed(2))
      },
      rentaCorta: {
        ocupacionPct: occCorta,
        tarifaNocheEquivalenteCop: tarifaNocheEquiv,
        ingresoBrutoPotencialAnualCop: ingBrutoCorta,
        ingresoEfectivoAnualCop: ingEfecCorta,
        opexAnualCop: opexCorta,
        noiAnualCop: noiCorta,
        capRateNetoPct: Number(((noiCorta / valorInmuebleCop) * 100).toFixed(2)),
        notaRegulatoriaPhYRnt:
          "Renta corta (< 30 días) exige Registro Nacional de Turismo (RNT), póliza y autorización expresa en el Reglamento de Propiedad Horizontal (Ley 675/2001 y Decreto 1836/2021)."
      }
    };
  }

  const observacionesInversion = [
    `Yield mensual bruto de ${formatPct(yieldMensualBrutoPct)} y Cap Rate neto de ${formatPct(capRateNetoPct)} (${esComercial ? "referencia comercial saludable en Colombia: 8%–11% anual" : "referencia residencial tradicional en Colombia: 5%–7% anual más valorización"}).`,
    `El punto de equilibrio exige al menos ${formatPct(ocupacionMinimaPct, 1)} de ocupación anual (~${mesesMinimosAno} meses/año) o un canon mínimo de ${formatCop(canonMensualEquilibrioCop)}/mes para cubrir costos fijos${esApalancado ? " y cuota financiera" : ""}.`,
    esApalancado
      ? `Con apalancamiento, el Cash-on-Cash sobre capital propio (${formatCop(capitalPropioInvertidoCop)}) es de ${formatPct(cashOnCashPct)} (${flujoCajaMensualNetoCop >= 0 ? "flujo positivo" : "requiere aporte mensual de bolsillo"} de ${formatCop(flujoCajaMensualNetoCop)}/mes).`
      : `Escenario evaluado 100% con recursos propios (incluye ~2.2% estimado de cierre registral/notarial); si apalancas con crédito o leasing, recuerda comparar Cap Rate vs tasa EA para evitar apalancamiento negativo.`
  ];

  return {
    valorInmuebleCop,
    propertyType,
    canonMensualBrutoCop,
    rentaBrutaAnualCop,
    yieldMensualBrutoPct: Number(yieldMensualBrutoPct.toFixed(2)),
    capRateBrutoPct: Number(capRateBrutoPct.toFixed(2)),
    vacanciaAplicadaPct: vacanciaPct,
    ingresoEfectivoAnualCop,
    opexDesglose: {
      administracionAnualCop,
      administracionACargoPropietario,
      predialAnualCop,
      mantenimientoAnualCop,
      gestionInmobiliariaAnualCop,
      totalOpexAnualCop
    },
    noiAnualCop,
    capRateNetoPct: Number(capRateNetoPct.toFixed(2)),
    esApalancado,
    capitalPropioInvertidoCop,
    servicioDeudaAnualCop,
    flujoCajaAnualNetoCop,
    flujoCajaMensualNetoCop,
    cashOnCashPct: Number(cashOnCashPct.toFixed(2)),
    puntoEquilibrio: {
      ocupacionMinimaPct: Number(ocupacionMinimaPct.toFixed(1)),
      mesesMinimosAno,
      canonMensualEquilibrioCop
    },
    comparativaRentaTradicionalVsCorta,
    observacionesInversion
  };
}

/**
 * Pre-liquidación tributaria orientativa para venta inmobiliaria en Colombia:
 * - Retención en la Fuente Notarial (1% Art. 398 E.T.)
 * - Ganancia Ocasional (15% Art. 314 E.T. / Ley 2277/2022) + Exención 5.000 UVT Vivienda Habitación (Art. 311-1 E.T.)
 * - Referencia Impuesto de Timbre Nacional en escrituración (>20.000 UVT: 1.5%; >50.000 UVT: 3.0%)
 */
export function calculateRealEstateTaxPreliquidation(params: {
  valorVentaCop: number;
  costoFiscalCop?: number;
  anosPosesion?: number;
  esViviendaHabitacion?: boolean;
  esVis?: boolean;
  vendedorEsPersonaJuridica?: boolean;
}): TaxPreliquidationResult {
  const valorVentaCop = Math.max(0, Math.round(params.valorVentaCop));
  const anosPosesion = Math.max(0, params.anosPosesion ?? 2);
  const esViviendaHabitacion = Boolean(params.esViviendaHabitacion);
  const esVis = Boolean(params.esVis);
  const vendedorEsPersonaJuridica = Boolean(params.vendedorEsPersonaJuridica);

  const costoFiscalFueEstimado = !params.costoFiscalCop || params.costoFiscalCop <= 0;
  // Si el usuario no aporta costo fiscal, se usa referencia ilustrativa 70% claramente marcada como estimada
  const costoFiscalUsadoCop = costoFiscalFueEstimado
    ? Math.round(valorVentaCop * 0.7)
    : Math.round(params.costoFiscalCop!);

  const taxEngineBase = liquidarImpuestosVenta({
    precioVenta: valorVentaCop,
    costoFiscal: costoFiscalUsadoCop,
    anosPosesion,
    esViviendaHabitacion
  });

  // Retención en la fuente ante notaría (Art. 398 E.T.)
  let tarifaRetencionPct = 1.0;
  let retencionFuenteNotarialCop = taxEngineBase.retencionFuente;
  if (vendedorEsPersonaJuridica) {
    tarifaRetencionPct = 0;
    retencionFuenteNotarialCop = 0;
  } else if (esVis) {
    tarifaRetencionPct = 0;
    retencionFuenteNotarialCop = 0;
  }

  // Referencia de Impuesto de Timbre en enajenación de inmuebles por escritura pública (Art. 519 E.T. / Ley 2277 de 2022)
  let impuestoTimbreEstimadoCop = 0;
  let tarifaMarginalTimbreLabel = "0% (No supera 20.000 UVT = $1.006.360.000)";
  if (valorVentaCop > LIMITE_50K_UVT_2026) {
    const tramoMedio = Math.round((LIMITE_50K_UVT_2026 - LIMITE_20K_UVT_2026) * 0.015);
    const tramoAlto = Math.round((valorVentaCop - LIMITE_50K_UVT_2026) * 0.03);
    impuestoTimbreEstimadoCop = tramoMedio + tramoAlto;
    tarifaMarginalTimbreLabel = "1.5% (20.000–50.000 UVT) + 3.0% sobre exceso de 50.000 UVT";
  } else if (valorVentaCop > LIMITE_20K_UVT_2026) {
    impuestoTimbreEstimadoCop = Math.round((valorVentaCop - LIMITE_20K_UVT_2026) * 0.015);
    tarifaMarginalTimbreLabel = "1.5% sobre cuantía que excede 20.000 UVT ($1.006.360.000)";
  }

  const gananciaOcasionalCop = taxEngineBase.gananciaOcasional;
  // Nota: La retención del 1% en notaría es un anticipo del impuesto de renta/ganancia ocasional, no un impuesto adicional doble,
  // pero el vendedor debe tener presente el desembolso inmediato en notaría (1%) vs la liquidación anual DIAN (15% menos retención descontada).
  const saldoNetoGananciaOcasionalDespuesRetencion = Math.max(0, gananciaOcasionalCop - retencionFuenteNotarialCop);
  const totalTributosEstimadosCop =
    retencionFuenteNotarialCop + saldoNetoGananciaOcasionalDespuesRetencion + impuestoTimbreEstimadoCop;
  const netoEstimadoAntesNotarialesCop = Math.max(0, valorVentaCop - totalTributosEstimadosCop);

  const notasNormativas: string[] = [
    `UVT de referencia 2026: ${formatCop(VALOR_UVT_2026)} | Umbral 20.000 UVT: ${formatCop(LIMITE_20K_UVT_2026)}.`,
    vendedorEsPersonaJuridica
      ? "Vendedor Persona Jurídica: No aplica retención del 1% del Art. 398 E.T. en notaría (declara por régimen ordinario según RUT/autorretención)."
      : esVis
      ? "Primera venta de Vivienda de Interés Social (VIS): exenta de retención en la fuente."
      : "Retención en la Fuente (Art. 398 E.T.): 1.0% sobre el valor de venta recaudado directamente por el Notario; constituye anticipo descontable en la declaración de renta.",
    taxEngineBase.esRentaOrdinaria
      ? "Posesión inferior a 2 años: la utilidad fiscal NO tributa como Ganancia Ocasional del 15%, sino como Renta Líquida Ordinaria (tarifa progresiva DIAN 0%–39% según cédula general)."
      : `Ganancia Ocasional (Art. 314 E.T. / Ley 2277 de 2022): tarifa del 15% sobre utilidad fiscal (${formatCop(taxEngineBase.utilidadCalculada)}). ${
          esViviendaHabitacion
            ? `Exención Art. 311-1 E.T. aplicada: ${formatCop(taxEngineBase.exencionViviendaAplicada)} (tope 5.000 UVT = ${formatCop(EXENCION_5K_UVT_2026)}, sujeto a depósito en AFC o pago de crédito/nueva vivienda).`
            : "Si corresponde a casa o apartamento de habitación, recuerda evaluar la exención parcial de hasta 5.000 UVT del Art. 311-1 E.T."
        }`,
    impuestoTimbreEstimadoCop > 0
      ? `Impuesto de Timbre referencial (Art. 519 E.T. / cuantía > 20.000 UVT): ${formatCop(impuestoTimbreEstimadoCop)} (${tarifaMarginalTimbreLabel}). Validar vigencia transitoria aplicable y reparto entre partes en escritura con tu contador y notaría.`
      : "Impuesto de Timbre: $0 COP al no superar las 20.000 UVT ($1.006.360.000).",
    "Nota de alcance: esta pre-liquidación tributaria es independiente de los derechos notariales (50/50), beneficencia y registro ORIP."
  ];

  if (costoFiscalFueEstimado) {
    notasNormativas.unshift(
      `⚠️ Costo fiscal no suministrado: se modeló una base ilustrativa del 70% (${formatCop(costoFiscalUsadoCop)}). Verifica el valor de escritura anterior, reajuste fiscal (Art. 70/73 E.T.) o avalúo catastral aplicable.`
    );
  }

  return {
    taxEngineBase,
    valorVentaCop,
    costoFiscalUsadoCop,
    costoFiscalFueEstimado,
    anosPosesion,
    esViviendaHabitacion,
    esVis,
    vendedorEsPersonaJuridica,
    retencionFuenteNotarialCop,
    tarifaRetencionPct,
    gananciaOcasionalCop,
    exencionVivienda5000UvtCop: taxEngineBase.exencionViviendaAplicada,
    esRentaOrdinariaMenor2Anos: taxEngineBase.esRentaOrdinaria,
    impuestoTimbreEstimadoCop,
    tarifaMarginalTimbreLabel,
    totalTributosEstimadosCop,
    netoEstimadoAntesNotarialesCop,
    notasNormativas
  };
}

/**
 * Construye el reporte integral financiero/inversión/tributario y su resumen estructurado para WhatsApp.
 */
export function buildFinancialAndTaxReport(parsed: FinancialTaxParsedQuery): FinancialAndTaxReport {
  const valorInmueble = parsed.valorInmuebleCop > 0 ? parsed.valorInmuebleCop : 400_000_000;

  let mortgageVsLeasing: MortgageVsLeasingResult | undefined;
  if (parsed.wantsMortgageOrLeasing) {
    mortgageVsLeasing = simulateMortgageVsLeasing({
      valorInmuebleCop: valorInmueble,
      esVis: parsed.esVis,
      plazoAnos: parsed.plazoAnos,
      tasaEaPct: parsed.tasaEaPct,
      tasaUvrRealEaPct: parsed.tasaUvrRealEaPct,
      incluyeUvr: parsed.incluyeUvr,
      ltvCreditoPct: parsed.ltvSolicitadoPct,
      opcionCompraLeasingPct: parsed.opcionCompraLeasingPct,
      ingresoMensualDeclaradoCop: parsed.ingresoMensualDeclaradoCop
    });
  }

  let investmentRoi: InvestmentRoiResult | undefined;
  if (parsed.wantsInvestmentRoi) {
    const deudaAnual = mortgageVsLeasing
      ? mortgageVsLeasing.creditoHipotecario.cuotaMensualConSegurosCop * 12
      : 0;
    const cuotaIni = mortgageVsLeasing
      ? mortgageVsLeasing.creditoHipotecario.cuotaInicialCop
      : parsed.cuotaInicialCop;

    investmentRoi = evaluateInvestmentAndYield({
      valorInmuebleCop: valorInmueble,
      canonMensualCop: parsed.canonMensualCop,
      propertyType: parsed.propertyType,
      administracionMensualCop: parsed.administracionMensualCop,
      predialAnualCop: parsed.predialAnualCop,
      vacanciaPct: parsed.vacanciaPct,
      ocupacionRentaCortaPct: parsed.ocupacionRentaCortaPct,
      quiereRentaCorta: parsed.quiereRentaCorta,
      cuotaInicialCop: cuotaIni,
      servicioDeudaAnualCop: deudaAnual
    });
  }

  let taxPreliquidation: TaxPreliquidationResult | undefined;
  if (parsed.wantsTaxPlanning) {
    taxPreliquidation = calculateRealEstateTaxPreliquidation({
      valorVentaCop: valorInmueble,
      costoFiscalCop: parsed.costoFiscalCop,
      anosPosesion: parsed.anosPosesion,
      esViviendaHabitacion: parsed.esViviendaHabitacion,
      esVis: parsed.esVis,
      vendedorEsPersonaJuridica: parsed.vendedorEsPersonaJuridica
    });
  }

  const blocks: string[] = [];
  blocks.push(
    `📊 *ANÁLISIS FINANCIERO, RENTABILIDAD Y PLANEACIÓN TRIBUTARIA INMOBILIARIA — VECY BIENES RAÍCES* 🇨🇴\n` +
      `🏠 *Inmueble base:* ${parsed.propertyType.toUpperCase()} | *Valor de referencia:* ${formatCop(valorInmueble)} COP`
  );

  if (mortgageVsLeasing) {
    const ch = mortgageVsLeasing.creditoHipotecario;
    const lh80 = mortgageVsLeasing.leasingHabitacional80;
    const lh85 = mortgageVsLeasing.leasingHabitacional85;
    let mBlock =
      `\n💳 *1. SIMULACIÓN HIPOTECARIA VS. LEASING HABITACIONAL (${mortgageVsLeasing.plazoAnos} años | ${mortgageVsLeasing.tasaEaUsadaPct}% E.A.):*\n` +
      `• *Crédito Hipotecario (${ch.ltvPct}% LTV ${mortgageVsLeasing.esVis ? "VIS" : "No-VIS"}):*\n` +
      `  - Monto financiable: ${formatCop(ch.montoFinanciadoCop)} | Cuota inicial: ${formatCop(ch.cuotaInicialCop)}\n` +
      `  - Cuota mensual sin seguros: ${formatCop(ch.cuotaMensualSinSegurosCop)} | Con seguros ref.: *${formatCop(ch.cuotaMensualConSegurosCop)}/mes*\n` +
      `  - Ingreso mínimo familiar Ley 546 (30%): *${formatCop(ch.ingresoMinimo30PctLey546Cop)}/mes* (ref. 40%: ${formatCop(ch.ingresoReferencial40PctCop)})\n` +
      `• *Leasing Habitacional (80% LTV | Opción compra ${lh80.opcionCompraPct}% = ${formatCop(lh80.opcionCompraCop)}):*\n` +
      `  - Monto financiable: ${formatCop(lh80.montoFinanciadoCop)} | Cuota inicial (20%): ${formatCop(lh80.cuotaInicialCop)}\n` +
      `  - Canon sin seguros: ${formatCop(lh80.cuotaMensualSinSegurosCop)} | Con seguros ref.: *${formatCop(lh80.cuotaMensualConSegurosCop)}/mes*\n` +
      `  - Ingreso mínimo Ley 546 (30%): *${formatCop(lh80.ingresoMinimo30PctLey546Cop)}/mes* (rango máx. 40%: ${formatCop(lh80.ingresoReferencial40PctCop)})\n` +
      `• *Leasing Ampliado (85% LTV):* Financia ${formatCop(lh85.montoFinanciadoCop)} | Cuota inicial ${formatCop(lh85.cuotaInicialCop)} | Canon c/seguros *${formatCop(lh85.cuotaMensualConSegurosCop)}/mes*`;

    if (mortgageVsLeasing.simulacionUvr) {
      const u = mortgageVsLeasing.simulacionUvr;
      mBlock +=
        `\n• *Referencia en UVR (UVR + ${u.tasaRealUvrEaPct}% E.A., UVR ref. ${formatCop(u.uvrReferenciaCop)}):*\n` +
        `  - Cuota mes 1: ${u.cuotaInicialMensualUvr.toLocaleString("es-CO")} UVR (~${formatCop(u.cuotaMes1ConSegurosCop)} c/seguros) -> Año 5 est. (IPC ${u.inflacionAnualReferenciaPct}%): ~${formatCop(u.cuotaProyectadaAnio5ConSegurosCop)}/mes.`;
    }
    if (mortgageVsLeasing.capacidadIngresoUsuario) {
      const cap = mortgageVsLeasing.capacidadIngresoUsuario;
      mBlock += `\n• *Tu capacidad (${formatCop(cap.ingresoMensualCop)}/mes):* ${cap.relacionCuotaIngresoCreditoPct}% en crédito / ${cap.relacionCuotaIngresoLeasingPct}% en leasing. ${cap.viabilidadLey546}`;
    }
    blocks.push(mBlock);
  }

  if (investmentRoi) {
    let rBlock =
      `\n📈 *${mortgageVsLeasing ? "2" : "1"}. EVALUACIÓN DE INVERSIÓN Y RENTABILIDAD (CAP RATE / ROI):*\n` +
      `• *Canon mensual evaluado:* ${formatCop(investmentRoi.canonMensualBrutoCop)}/mes (Renta bruta anual: ${formatCop(investmentRoi.rentaBrutaAnualCop)})\n` +
      `• *Yield Mensual Bruto:* *${formatPct(investmentRoi.yieldMensualBrutoPct)}* | *Cap Rate Bruto:* *${formatPct(investmentRoi.capRateBrutoPct)}*\n` +
      `• *OPEX Anual Est. (Vacancia ${investmentRoi.vacanciaAplicadaPct}% + Predial + Mant. + Gestión):* ${formatCop(investmentRoi.opexDesglose.totalOpexAnualCop)}\n` +
      `• *NOI Anual:* ${formatCop(investmentRoi.noiAnualCop)} | *Cap Rate Neto:* *${formatPct(investmentRoi.capRateNetoPct)}*\n` +
      `• *Cash-on-Cash Return:* *${formatPct(investmentRoi.cashOnCashPct)}* (Flujo neto: ${formatCop(investmentRoi.flujoCajaMensualNetoCop)}/mes sobre capital propio ${formatCop(investmentRoi.capitalPropioInvertidoCop)})\n` +
      `• *Punto de Equilibrio:* ${formatPct(investmentRoi.puntoEquilibrio.ocupacionMinimaPct, 1)} de ocupación (~${investmentRoi.puntoEquilibrio.mesesMinimosAno} meses/año) o canon mínimo de ${formatCop(investmentRoi.puntoEquilibrio.canonMensualEquilibrioCop)}/mes.`;

    if (investmentRoi.comparativaRentaTradicionalVsCorta) {
      const c = investmentRoi.comparativaRentaTradicionalVsCorta;
      rBlock +=
        `\n• *Comparativa Renta Tradicional vs. Renta Corta:*\n` +
        `  - Tradicional (${c.rentaTradicional.ocupacionPct}% ocup.): NOI ${formatCop(c.rentaTradicional.noiAnualCop)}/año (*Cap Neto ${c.rentaTradicional.capRateNetoPct}%*)\n` +
        `  - Renta Corta (${c.rentaCorta.ocupacionPct}% ocup., ~${formatCop(c.rentaCorta.tarifaNocheEquivalenteCop)}/noche): NOI ${formatCop(c.rentaCorta.noiAnualCop)}/año (*Cap Neto ${c.rentaCorta.capRateNetoPct}%*)\n` +
        `  - ⚠️ ${c.rentaCorta.notaRegulatoriaPhYRnt}`;
    }
    blocks.push(rBlock);
  }

  if (taxPreliquidation) {
    const idx = (mortgageVsLeasing ? 1 : 0) + (investmentRoi ? 1 : 0) + 1;
    const t = taxPreliquidation;
    const tBlock =
      `\n🏛️ *${idx}. PRE-LIQUIDACIÓN TRIBUTARIA DE VENTA INMOBILIARIA (DIAN / E.T. 2026):*\n` +
      `• *Valor Venta:* ${formatCop(t.valorVentaCop)} | *Costo Fiscal${t.costoFiscalFueEstimado ? " (Est. 70%)" : ""}:* ${formatCop(t.costoFiscalUsadoCop)} | *Posesión:* ${t.anosPosesion} año(s)\n` +
      `• *Retención en la Fuente (Notaría - Art. 398 E.T.):* *${formatCop(t.retencionFuenteNotarialCop)}* (${t.tarifaRetencionPct}%)${t.retencionFuenteNotarialCop > 0 ? " _(anticipo descontable en renta)_" : ""}\n` +
      `• *Utilidad Fiscal:* ${formatCop(t.taxEngineBase.utilidadCalculada)}${
        t.exencionVivienda5000UvtCop > 0
          ? ` | *Exención Vivienda Habitación (Art. 311-1 E.T.):* -${formatCop(t.exencionVivienda5000UvtCop)}`
          : ""
      }\n` +
      `• *${t.esRentaOrdinariaMenor2Anos ? "Renta Líquida Ordinaria (<2 años)" : "Ganancia Ocasional (15% Art. 314 E.T.)"}:* ${
        t.esRentaOrdinariaMenor2Anos
          ? "⚠️ Posesión < 2 años: tributa en cédula general (tarifa progresiva 0%–39% Art. 241 E.T.)."
          : `*${formatCop(t.gananciaOcasionalCop)}*`
      }\n` +
      `• *Impuesto de Timbre Ref. (>20.000 UVT):* *${formatCop(t.impuestoTimbreEstimadoCop)}* _(${t.tarifaMarginalTimbreLabel})_\n` +
      `• *Neto Estimado antes de gastos notariales/registro (50/50 aparte):* *${formatCop(t.netoEstimadoAntesNotarialesCop)}*`;
    blocks.push(tBlock);
  }

  blocks.push(
    `\n📲 *Gestión de Crédito Aliado, Leasing y Planeación Patrimonial VECY:* Comunícate con *Eduardo A. Rivera* y *Jani Alves* en nuestra línea oficial de bróker: *${BROKER_OFFICIAL_PHONE}* (${BROKER_OFFICIAL_WHATSAPP_LINK}).`
  );

  const summaryParts: string[] = [];
  if (mortgageVsLeasing) summaryParts.push("Crédito vs Leasing");
  if (investmentRoi) summaryParts.push("Cap Rate / ROI");
  if (taxPreliquidation) summaryParts.push("Tributación Venta");

  return {
    querySummary: `${summaryParts.join(" + ")} | ${parsed.propertyType} ${formatCop(valorInmueble)}`,
    hasConcreteNumbers: parsed.hasConcreteNumbers,
    propertyType: parsed.propertyType,
    valorInmuebleCop: valorInmueble,
    mortgageVsLeasing,
    investmentRoi,
    taxPreliquidation,
    whatsappSummary: blocks.join("\n"),
    analyzedAtIso: new Date().toISOString()
  };
}

/**
 * Orquestador end-to-end para WhatsApp (DM y Grupos):
 * 1. Discrimina consultas conceptuales sin cifras vs solicitudes con intención real.
 * 2. Ejecuta cálculos determinísticos a $0 COP (Crédito/Leasing/UVR, Cap Rate/ROI, Tributación Venta).
 * 3. Si hay cifras concretas, genera la Ficha Financiera y Tributaria Preliminar en PDF Membretado de VECY.
 */
export async function analyzeFinancialAndTaxFromWhatsAppInput(params: {
  text?: string | null;
  requesterName?: string | null;
  generatePdf?: boolean;
}): Promise<FinancialAndTaxWhatsAppResult> {
  const parsed = parseFinancialAndTaxQuery(params.text);

  if (!parsed.isFinancialTaxRequest) {
    return {
      isFinancialTaxRequest: false,
      needsDataGuidance: false,
      responseText: "",
      reactionEmoji: ""
    };
  }

  if (parsed.needsDataGuidance) {
    return {
      isFinancialTaxRequest: true,
      needsDataGuidance: true,
      reactionEmoji: "💳",
      responseText:
        `💳 *SIMULADOR FINANCIERO, RENTABILIDAD Y TRIBUTACIÓN INMOBILIARIA — VECY BIENES RAÍCES* 🇨🇴\n\n` +
        `Con el mayor gusto realizo el cálculo exacto y te genero tu *Ficha Financiera y Tributaria Preliminar en PDF Membretado*.\n\n` +
        `Envíame por favor las cifras clave según lo que necesites:\n` +
        `1️⃣ *Crédito Hipotecario vs. Leasing:* Valor del inmueble (VIS o No-VIS), plazo (ej. 20 años), tasa E.A. (o Pesos/UVR) e ingresos familiares.\n` +
        `2️⃣ *Inversión / Cap Rate / Cash-on-Cash:* Valor comercial del inmueble, canon mensual esperado (o renta corta), administración y predial anual.\n` +
        `3️⃣ *Tributación Venta (DIAN):* Valor de venta, costo fiscal o valor de compra anterior, años de posesión y si es vivienda de habitación.\n\n` +
        `📲 Para gestión directa con bancos aliados y estructuración patrimonial: *${BROKER_OFFICIAL_PHONE}* (${BROKER_OFFICIAL_WHATSAPP_LINK}).`
    };
  }

  const report = buildFinancialAndTaxReport(parsed);

  let pdfBuffer: Buffer | undefined;
  let pdfFileName: string | undefined;

  if (params.generatePdf !== false && report.hasConcreteNumbers) {
    try {
      const pdfRes = await generateFinancialAndTaxPdf(report, {
        requestedBy: params.requesterName || undefined
      });
      pdfBuffer = pdfRes.pdfBuffer;
      pdfFileName = pdfRes.fileName;
    } catch (pdfErr: any) {
      console.warn("[financialAndTaxRealEstateService] Error generando PDF:", pdfErr?.message || pdfErr);
    }
  }

  const pdfNotice =
    pdfBuffer && pdfFileName
      ? `\n\n📄 *Adjunto:* Ficha Financiera y Tributaria Preliminar en PDF Membretado (*${pdfFileName}*).`
      : "";

  return {
    isFinancialTaxRequest: true,
    needsDataGuidance: false,
    report,
    responseText: `${report.whatsappSummary}${pdfNotice}`,
    reactionEmoji: "💳",
    pdfBuffer,
    pdfFileName
  };
}

