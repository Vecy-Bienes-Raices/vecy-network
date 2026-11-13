/**
 * Motor Especializado de Propiedad Horizontal (Ley 675 de 2001), Auditoria de Reglamentos PH (RPH),
 * Vivienda Turistica (Airbnb / RNT - Decreto 1074/2015 y Ley 2068/2020) y Prefactibilidad de Subdivision/Englobe (v34.17 — $0 COP)
 * Punto 6 — Skill 6 de JanIA (Doctrina Eduardo A. Rivera & Jani Alves)
 */

import {
  extractTextSnippetsFromPdfBuffer,
  hasCtlTextMarkers,
  isExplicitCtlStudyRequest
} from "./ctlTitleStudyService";
import { isIduInquiry } from "./iduValorizacionService";
import {
  GeneratedLegalPdfResult,
  generatePropiedadHorizontalPdf
} from "./jania/legalDocumentPdfService";
import { invokeLLM } from "./llm";

export type PhMode = "calc" | "audit" | "prefeasibility" | "guidance";
export type PhSeverity = "ALTA" | "MEDIA" | "BAJA" | "OK";
export type PhRiskLevel = "VERDE" | "AMARILLO" | "ROJO";
export type PhSubdivisionOperation =
  | "desenglobe"
  | "subdivision"
  | "englobe"
  | "reforma_rph"
  | "constitucion_ph";

export interface PhAuditFinding {
  severidad: PhSeverity;
  titulo: string;
  hallazgo: string;
  fundamentoLegal: string;
  recomendacion: string;
}

export interface PhCalculationsResult {
  presupuestoTotalCop?: number;
  coeficienteUnidadPct?: number;
  expensaUnidadCop?: number;
  sumaCoeficientesPct?: number;
  sumaCoeficientesValida?: boolean;
  areaPrivadaUnidadM2?: number;
  areaPrivadaTotalM2?: number;
  capitalMoraCop?: number;
  mesesMora?: number;
  tasaMoraReportadaMensualPct?: number;
  tasaMoraReportadaAnualPct?: number;
  ibcReferenciaEaPct: number;
  tasaMoraMaxLegalEaPct: number;
  tasaMoraMaxLegalMensualPct: number;
  excedeTopeUsuraMora?: boolean;
  interesMoraMaxLegalCop?: number;
  quorumAsistenciaPct?: number;
  quorumAprobacionPct?: number;
  cuotaExtraordinariaVecesMensual?: number;
  requiereMayoriaCalificada70?: boolean;
  mayoriaValida?: boolean;
  plazoImpugnacionMeses: number;
  solidaridadCompraventaArt29: string;
}

export interface PhPrefeasibilityResult {
  operacion: PhSubdivisionOperation;
  operacionLabel: string;
  areaBaseM2?: number;
  unidadesResultantes?: number;
  requiereCuraduria: boolean;
  requiereAsamblea70Pct: boolean;
  requiereReformaRphEscritura: boolean;
  checklistTecnicoNotarial: string[];
  alertasClave: string[];
}

export interface PropiedadHorizontalReport {
  mode: Exclude<PhMode, "guidance">;
  headline: string;
  normativeFramework: string;
  riskLevel: PhRiskLevel;
  riskHeadline: string;
  summaryPoints: string[];
  calculations?: PhCalculationsResult;
  findings: PhAuditFinding[];
  prefeasibility?: PhPrefeasibilityResult;
  recommendedNextSteps: string[];
  requesterName?: string;
}

export interface PropiedadHorizontalWhatsAppResult {
  handled: boolean;
  mode: PhMode;
  whatsappReply: string;
  pdfResult?: GeneratedLegalPdfResult;
  report?: PropiedadHorizontalReport;
  reactionEmoji: string;
}

/**
 * Tasa de Interes Bancario Corriente (IBC) de referencia para calculo deterministico de tope 1.5x (Art. 30 Ley 675).
 * Se advierte siempre verificar la certificacion mensual vigente de la Superintendencia Financiera de Colombia.
 */
export const IBC_REFERENCIA_EA_PCT = 18.5;
export const TASA_MORA_MAX_EA_PCT = Number((IBC_REFERENCIA_EA_PCT * 1.5).toFixed(2)); // 27.75% E.A.
export const TASA_MORA_MAX_MENSUAL_PCT = Number(
  ((Math.pow(1 + TASA_MORA_MAX_EA_PCT / 100, 1 / 12) - 1) * 100).toFixed(2)
); // ~2.06% M.V.

const VECY_PH_BROKER_CTA =
  "\n\n🏢 *Acompañamiento Técnico, Notarial y PH VECY BIENES RAÍCES:*\n" +
  "Para reformas a RPH, recálculo de coeficientes, impugnación de actas, validación de RNT o desenglobes ante Curaduría, Notaría y ORIP, agenda asesoría directa con *Eduardo A. Rivera & Jani Alves*:\n" +
  "📞 *+57 316 656 9719* | 👉 https://wa.me/573166569719";

function normalizeText(text: string): string {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function stripMentions(text: string): string {
  return String(text || "")
    .replace(/@\d{7,18}\b/g, " ")
    .replace(/@jania\b/gi, " ")
    .trim();
}

function formatCop(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-CO")} COP`;
}

function mediaInputToBase64(val?: Buffer | string | null): string | null {
  if (!val) return null;
  if (Buffer.isBuffer(val)) return val.length > 0 ? val.toString("base64") : null;
  const trimmed = String(val).trim();
  if (!trimmed) return null;
  return trimmed.replace(/^data:[^;]+;base64,/i, "");
}

function parseCopNumberFromMatch(numStr: string, unitStr?: string): number | undefined {
  if (!numStr) return undefined;
  const unit = normalizeText(unitStr || "");
  if (unit.includes("millon") || unit === "m" || unit === "mm") {
    const cleaned = parseFloat(numStr.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(cleaned) ? cleaned * 1_000_000 : undefined;
  }
  const hasDotThousands = /^\d{1,3}(?:\.\d{3})+$/.test(numStr);
  const cleaned = hasDotThousands
    ? parseFloat(numStr.replace(/\./g, ""))
    : parseFloat(numStr.replace(/,/g, ""));
  return Number.isFinite(cleaned) ? cleaned : undefined;
}

/**
 * Detecta si el texto contiene clausulas o contenido real de un Reglamento PH (RPH) o Acta de Asamblea.
 */
export function hasPhDocumentMarkers(text: string): boolean {
  const raw = String(text || "");
  if (!raw || raw.trim().length < 25) return false;
  if (hasCtlTextMarkers(raw)) return false;

  const norm = normalizeText(raw);

  // No robar borradores contractuales puros de compraventa/arriendo/corretaje salvo que sean especificamente de PH/RPH/Asamblea
  const isPureContractDraft =
    /\b(?:promesa\s+de\s+compraventa|promitente\s+(?:vendedor|comprador)|contrato\s+de\s+arrendamiento|ley\s+820\s+de\s+2003|contrato\s+de\s+corretaje|codigo\s+de\s+comercio.*51[89])\b/i.test(
      norm
    ) &&
    !/\b(?:reglamento\s+de\s+propiedad\s+horizontal|\brph\b|asamblea\s+(?:general\s+)?de\s+copropietarios|consejo\s+de\s+administracion|coeficiente(?:s)?\s+de\s+copropiedad|ley\s+675)\b/i.test(
      norm
    );
  if (isPureContractDraft) return false;

  const markers = [
    /\breglamento\s+de\s+propiedad\s+horizontal\b/i,
    /\basamblea\s+(?:general\s+)?(?:ordinaria\s+|extraordinaria\s+)?de\s+copropietarios\b/i,
    /\bacta\s+(?:no\.?|numero)?\s*\d*\s*(?:de\s+)?(?:asamblea|consejo\s+de\s+administracion)\b/i,
    /\b(?:art[ií]culo|cl[aá]usula|par[aá]grafo)\s+\d+[^.\n]{0,80}\b(?:prohib\w*|sancion\w*|multa\w*|mascotas?|airbnb|vivienda\s+turistica|renta\s+corta|coeficiente)\b/i,
    /\b(?:prohib\w*|sancion\w*|multa\w*)\b.{0,65}\b(?:mascotas?|perros?|gatos?|airbnb|renta\s+corta|vivienda\s+turistica|alquiler\s+por\s+dias|hospedaje|ascensor)\b/i,
    /\b(?:corte|suspension|suspender|restring\w*)\b.{0,55}\b(?:agua|energia|gas|citofonia|ascensor|porteria|acceso|servicios?\s+publicos?)\b/i,
    /\b(?:ley\s+675(?:\s+de\s+2001)?|\brph\b)\b.{0,80}\b(?:articulo|clausula|paragrafo|prohib\w*|sancion\w*|multa\w*|bienes?\s+comunes?)\b/i,
    /\b(?:bienes?\s+comunes?\s+(?:no\s+esenciales|de\s+uso\s+exclusivo)|fachada|cerramiento\s+de\s+(?:terraza|balcon))\b/i
  ];

  let hits = 0;
  for (const rx of markers) {
    if (rx.test(norm)) hits += 1;
  }

  if (hits >= 2) return true;
  if (
    hits >= 1 &&
    norm.length >= 75 &&
    /\b(?:copropietarios?|administracion|administrador|consejo|asamblea|reglamento|rph|bienes\s+comunes|vivienda\s+turistica|airbnb|mascotas|prohib\w*|sancion\w*)\b/i.test(
      norm
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Excluye preguntas puramente teoricas/conceptuales sobre PH cuando no traen cifras, documentos ni accion de calculo/auditoria/prefactibilidad.
 */
export function isConceptualPhQuestion(text: string): boolean {
  const raw = stripMentions(text);
  if (!raw) return false;
  if (hasPhDocumentMarkers(raw)) return false;

  const norm = normalizeText(raw).replace(/^[¿?\s!¡]+/, "");

  // Si hay cifras operativas de calculo (coeficiente %, presupuesto $, mora %, quorum %, area m2, unidades) o verbos explicitos de ejecucion/PDF -> NO es meramente conceptual
  const hasOperationalNumbers =
    /\b\d+(?:[.,]\d+)?\s*%/.test(norm) ||
    /\$?\s*\d+(?:[.,]\d+)?\s*(?:millones?|\bmm\b)\b/i.test(norm) ||
    /\$\s*\d{1,3}(?:[.,]\d{3})+/.test(norm) ||
    /\b\d+(?:[.,]\d+)?\s*(?:m2|mts2?|metros?\s*cuadrados?)\b/i.test(norm) ||
    /\b\d+\s*(?:unidades?|apartamentos?|aptos?|lotes?|locales?|meses?\s+(?:de\s+)?mora)\b/i.test(norm);

  const hasExplicitToolAction =
    /\b(?:calcula(?:me|r)?|liquida(?:me|r)?|simula(?:me|r)?|valida(?:me|r)?|verifica(?:me|r)?|audita(?:me|r)?|auditoria|revisa(?:me|r)?\s+(?:este|esta|el|la|mi)|analiza(?:me|r)?\s+(?:este|esta|el|la|mi)|genera(?:me|r)?|haz(?:me)?|emite|en\s+pdf|prefactibilidad|concepto\s+(?:tecnico|juridico)?\s*(?:ph|de\s+propiedad\s+horizontal|de\s+desenglobe|de\s+englobe|de\s+subdivision))\b/i.test(
      norm
    );

  if (hasOperationalNumbers || hasExplicitToolAction) return false;

  const conceptualPattern =
    /^(?:hola[\s,!]*)?(?:que\s+(?:es|son|significa|dice|establece)|cual\s+es\s+(?:el|la|los|las)|como\s+(?:funciona|se\s+calcula|se\s+elige|opera|se\s+aplica)|explicame\s+(?:que\s+es|como\s+funciona)|cuando\s+(?:aplica|se\s+necesita)|se\s+puede|es\s+legal)\b/i.test(
      norm
    ) ||
    /\b(?:que\s+dice\s+el\s+articulo\s+\d+\s+de\s+la\s+ley\s+675|que\s+es\s+(?:el\s+|la\s+)?(?:coeficiente\s+de\s+copropiedad|propiedad\s+horizontal|ley\s+675|quorum\s+calificado|expensas\s+comunes|rnt|registro\s+nacional\s+de\s+turismo))\b/i.test(
      norm
    );

  return conceptualPattern;
}

/**
 * Discriminador principal del Skill 6 (Propiedad Horizontal Ley 675, Auditoria RPH/Actas, RNT/Airbnb y Subdivision/Englobe).
 * Mantiene precedencia segura frente a CTL, POT, FinTax, Minutas/Contratos, IDU, Predial y Notarial.
 */
export function isPropiedadHorizontalRequest(text: string, hasMedia = false): boolean {
  const raw = stripMentions(text);
  if (!raw && !hasMedia) return false;
  const norm = normalizeText(raw);

  // 1) Guardas estrictas contra otras Skills
  if (hasCtlTextMarkers(raw) || isExplicitCtlStudyRequest(raw)) return false;
  if (isIduInquiry(raw)) return false;

  // Predial puro con CHIP
  if (
    /\bCHIP\s+AAA[0-9A-Z]{5,10}\b/i.test(raw) &&
    /\b(?:predial|factura|shd)\b/i.test(norm) &&
    !/\b(?:propiedad\s+horizontal|ley\s*675|\brph\b|desenglobe|englobe|subdivision|coeficiente)\b/i.test(norm)
  ) {
    return false;
  }

  // POT puro (Decreto 555 / SINUPOT / IDECA / UPL / UPZ / IO / IC / norma urbana / uso del suelo)
  const hasExplicitPotTerms =
    /\b(?:pot\b|decreto\s*555|sinupot|ideca|mapas\s*bogota|norma\s+urbana|normativa\s+urbana|cedula\s+normativa|tratamiento\s+urbanistico|area\s+de\s+actividad|indice\s+de\s+ocupacion|indice\s+de\s+construccion|edificabilidad|uso\s+del?\s+suelo|antejardin|\bupl\b|\bupz\b)\b/i.test(
      norm
    );
  const hasPhSubdivisionOrRph =
    /\b(?:propiedad\s+horizontal|ley\s*675|\brph\b|reglamento\s+(?:de\s+)?(?:ph|propiedad\s+horizontal)|asamblea\s+(?:general\s+)?de\s+copropietarios|coeficiente(?:s)?\s+de\s+copropiedad|desenglobe|englobe|subdivision\s+(?:en\s+ph|de\s+(?:lote|casa|inmueble|apartamento|predio)|urbana)|reforma\s+(?:al\s+|del\s+)?rph)\b/i.test(
      norm
    );
  if (hasExplicitPotTerms && !hasPhSubdivisionOrRph) return false;

  // Skill 4 FinTax puro (Cap Rate, ROI, Yield, Hipotecario, Leasing, Ganancia Ocasional, Timbre)
  const hasFinTaxLexicon =
    /\b(?:cap\s*rate|cash[-\s]*on[-\s]*cash|\broi\b|\byield\b|credito\s+hipotecari|leasing\s+habitacional|ley\s+546|ganancia\s+ocasional|impuesto\s+de\s+timbre|costo\s+fiscal|5\.?000\s*uvt|renta\s+corta\s+vs\s+tradicional|punto\s+de\s+equilibrio)\b/i.test(
      norm
    );
  if (hasFinTaxLexicon && !hasPhSubdivisionOrRph && !/\b(?:rnt|decreto\s*1074|ley\s*2068|prohib)\b/i.test(norm)) {
    return false;
  }

  // Skill 5 Minutas/Contratos puros (Promesa, Arriendo Ley 820 / C.Co., Corretaje, Otrosi) salvo que sea RPH / Acta PH / Desenglobe
  const isExplicitSkill5ContractCreation =
    /\b(?:redacta\w*|elabora\w*|hazme|genera\w*|prepara\w*|audita\w*)\b.{0,45}\b(?:minuta|promesa\s+de\s+compraventa|contrato\s+de\s+(?:arrendamiento|arriendo|corretaje|consignacion)|otrosi|acta\s+de\s+entrega)\b/i.test(
      norm
    ) &&
    !/\b(?:desenglobe|englobe|subdivision|reforma\s+(?:al\s+|del\s+)?(?:rph|reglamento\s+(?:de\s+)?ph)|asamblea\s+(?:general\s+)?de\s+copropietarios)\b/i.test(
      norm
    );
  if (isExplicitSkill5ContractCreation) {
    return false;
  }

  const hasContractSkill5Lexicon =
    /\b(?:promesa\s+de\s+compraventa|minuta\s+(?:de\s+)?(?:compraventa|arrendamiento|arriendo|corretaje)|contrato\s+de\s+(?:arrendamiento|arriendo|corretaje|consignacion)|otrosi|acta\s+de\s+entrega|pacto\s+de\s+retroventa|cesion\s+de\s+leasing)\b/i.test(
      norm
    );
  if (hasContractSkill5Lexicon && !hasPhSubdivisionOrRph && !hasPhDocumentMarkers(raw)) {
    return false;
  }

  // Gastos notariales puros de compraventa
  if (
    /\b(?:gastos?\s+(?:de\s+)?notaria|derechos?\s+notariales|liquidacion\s+notarial|beneficencia\s+y\s+registro)\b/i.test(
      norm
    ) &&
    !hasPhSubdivisionOrRph &&
    !/\b(?:paz\s+y\s+salvo\s+(?:de\s+)?administracion|art(?:iculo)?\.?\s*29\s+ley\s*675)\b/i.test(norm)
  ) {
    return false;
  }

  // Marketing audit puro
  if (
    /\b(?:swap\s+test|auditoria\s+de\s+marketing|\baida\b|\bicp\b)\b/i.test(norm) &&
    !hasPhSubdivisionOrRph &&
    !hasPhDocumentMarkers(raw)
  ) {
    return false;
  }

  // Agradecimiento puro / satisfaccion sin accion ni documento
  const looksLikeGratitudeOnly =
    !hasPhDocumentMarkers(raw) &&
    !/\b(?:calcula|liquida|audita|revisa|analiza|valida|genera|hazme|dame|prefactibilidad)\b/i.test(norm) &&
    /\b(?:gracias|muchas\s+gracias|mil\s+gracias|excelente|genial|perfecto|quede\s+(?:muy\s+)?satisfech|me\s+encanto|me\s+gusto)\b/i.test(
      norm
    );
  if (looksLikeGratitudeOnly) return false;

  if (isConceptualPhQuestion(raw)) return false;

  // 2) Deteccion positiva Skill 6
  if (hasPhDocumentMarkers(raw)) return true;

  const hasPhCoreKeyword =
    /\b(?:propiedad\s+horizontal|ley\s*675|\brph\b|reglamento\s+(?:de\s+)?(?:ph|propiedad\s+horizontal)|asamblea\s+(?:general\s+)?de\s+copropietarios|consejo\s+de\s+administracion|coeficiente(?:s)?\s+de\s+copropiedad|expensas?\s+(?:comunes?|ordinarias?|extraordinarias?)|cuota\s+(?:de\s+administracion|extraordinaria)|paz\s+y\s+salvo\s+(?:de\s+)?administracion|impugna(?:r|cion)\s+(?:de\s+)?acta|quorum\s+(?:calificado|asamblea)|mayoria\s+calificada\s+del?\s*70%|desenglobe|englobe|subdivision\s+(?:de\s+|en\s+)?(?:ph|propiedad\s+horizontal|lote|casa|predio|inmueble|apartamento)|reforma\s+(?:al\s+|del\s+)?(?:rph|reglamento)|vivienda\s+turistica|\brnt\b|registro\s+nacional\s+de\s+turismo|decreto\s*1074|ley\s*2068)\b/i.test(
      norm
    );

  if (hasPhCoreKeyword) {
    // Asegurar que si viene con Airbnb/renta corta sin otros terminos PH solo entre cuando haya contexto PH/RNT/prohibicion
    return true;
  }

  // Caso especifico: Airbnb / renta corta en contexto de conjunto/edificio/copropiedad/acta/prohibicion
  if (
    /\b(?:airbnb|renta\s+corta|alquiler\s+(?:por\s+dias|turistico))\b/i.test(norm) &&
    /\b(?:conjunto|edificio|copropiedad|administracion|administrador|asamblea|consejo|reglamento|prohib|restring|multa|sancion|rnt)\b/i.test(
      norm
    )
  ) {
    return true;
  }

  // Media adjunta (PDF/imagen) con mencion explicita de RPH / Acta / Asamblea / PH
  if (
    hasMedia &&
    /\b(?:reglamento|\brph\b|propiedad\s+horizontal|ley\s*675|asamblea|acta|copropiedad|desenglobe|englobe)\b/i.test(
      norm
    )
  ) {
    return true;
  }

  return false;
}

function detectPhSubdivisionOperation(norm: string): PhSubdivisionOperation {
  if (/\benglobe\b/i.test(norm)) return "englobe";
  if (/\bdesenglobe\b/i.test(norm)) return "desenglobe";
  if (/\bsubdivision\b|\bsubdividir\b|\bsegregar\b|\bsegregacion\b/i.test(norm)) return "subdivision";
  if (/\breforma\s+(?:al\s+|del\s+)?(?:rph|reglamento)\b/i.test(norm)) return "reforma_rph";
  return "constitucion_ph";
}

function extractPhNumbers(raw: string): {
  presupuestoTotalCop?: number;
  coeficienteUnidadPct?: number;
  listaCoeficientesPct: number[];
  areaPrivadaUnidadM2?: number;
  areaPrivadaTotalM2?: number;
  capitalMoraCop?: number;
  mesesMora?: number;
  tasaMoraReportadaMensualPct?: number;
  tasaMoraReportadaAnualPct?: number;
  quorumAsistenciaPct?: number;
  quorumAprobacionPct?: number;
  cuotaExtraordinariaVecesMensual?: number;
  unidadesResultantes?: number;
} {
  const norm = normalizeText(raw);

  // Presupuesto mensual total o cuota extraordinaria global
  let presupuestoTotalCop: number | undefined;
  const presMatch = raw.match(
    /(?:presupuesto(?:\s+mensual)?|expensa(?:s)?\s+(?:comunes?\s+)?totales?|cuota\s+extraordinaria\s+total)\s*(?:de|:|es)?\s*\$?\s*(\d{1,4}(?:[.,]\d{1,3})*)\s*(millones?|mm|m\b)?/i
  );
  if (presMatch) {
    presupuestoTotalCop = parseCopNumberFromMatch(presMatch[1], presMatch[2]);
  }

  // Capital en mora o cuota mensual vencida
  let capitalMoraCop: number | undefined;
  const moraCapMatch = raw.match(
    /(?:mora|deuda|capital(?:\s+adeudado)?|saldo\s+vencido|cuota\s+(?:mensual|de\s+administracion|ordinaria))\s*(?:de|:|por)?\s*\$?\s*(\d{1,4}(?:[.,]\d{1,3})*)\s*(millones?|mm|m\b)?/i
  );
  if (moraCapMatch) {
    capitalMoraCop = parseCopNumberFromMatch(moraCapMatch[1], moraCapMatch[2]);
  }

  // Coeficiente de la unidad
  let coeficienteUnidadPct: number | undefined;
  const coefMatch = raw.match(
    /(?:coeficiente(?:\s+de\s+copropiedad)?|indice)\s*(?:de|:|es|del)?\s*(\d+(?:[.,]\d+)?)\s*%/i
  );
  if (coefMatch) {
    const val = parseFloat(coefMatch[1].replace(",", "."));
    if (Number.isFinite(val) && val > 0 && val <= 100) {
      coeficienteUnidadPct = val;
    }
  }

  // Lista de coeficientes (ej: "coeficientes 25%, 25%, 30%, 20%" o "25% + 30% + 40%")
  const listaCoeficientesPct: number[] = [];
  if (/\bcoeficientes?\b/i.test(norm)) {
    const listBlock = raw.match(/coeficientes?[^.;\n]{0,120}/i)?.[0] || "";
    const pctMatches = Array.from(listBlock.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g));
    if (pctMatches.length >= 2) {
      for (const m of pctMatches) {
        const val = parseFloat(m[1].replace(",", "."));
        if (Number.isFinite(val) && val > 0 && val <= 100) {
          listaCoeficientesPct.push(val);
        }
      }
    }
  }

  // Areas privadas para calculo de coeficiente
  let areaPrivadaUnidadM2: number | undefined;
  let areaPrivadaTotalM2: number | undefined;
  const areaUnitMatch = raw.match(
    /(?:unidad|apartamento|apto|casa|local|oficina|area\s+privada(?:\s+de\s+la\s+unidad)?)\s*(?:de|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mts2?|metros?\s*cuadrados?)/i
  );
  if (areaUnitMatch) {
    areaPrivadaUnidadM2 = parseFloat(areaUnitMatch[1].replace(",", "."));
  }
  const areaTotMatch = raw.match(
    /(?:area\s+(?:privada\s+)?total(?:\s+construida)?|total\s+copropiedad|lote\s+total|superficie\s+total)\s*(?:de|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mts2?|metros?\s*cuadrados?)/i
  );
  if (areaTotMatch) {
    areaPrivadaTotalM2 = parseFloat(areaTotMatch[1].replace(",", "."));
  }
  if (!areaPrivadaUnidadM2) {
    const genericArea = raw.match(/\b(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mts2?|metros?\s*cuadrados?)\b/i);
    if (genericArea) {
      areaPrivadaUnidadM2 = parseFloat(genericArea[1].replace(",", "."));
    }
  }

  // Meses de mora
  let mesesMora: number | undefined;
  const mesesMatch = raw.match(/(\d{1,2})\s*meses?(?:\s+de)?\s+(?:mora|atraso|vencid)/i);
  if (mesesMatch) {
    mesesMora = parseInt(mesesMatch[1], 10);
  }

  // Tasa de mora reportada por la administracion
  let tasaMoraReportadaMensualPct: number | undefined;
  let tasaMoraReportadaAnualPct: number | undefined;
  const tasaMesMatch = raw.match(
    /(?:inter[eé]s(?:es)?(?:\s+de\s+mora)?|mora|cobran)\s*(?:del?|al)?\s*(\d+(?:[.,]\d+)?)\s*%\s*(?:mensual|mes|m\.?v\.?)/i
  );
  if (tasaMesMatch) {
    tasaMoraReportadaMensualPct = parseFloat(tasaMesMatch[1].replace(",", "."));
  }
  const tasaAnualMatch = raw.match(
    /(?:inter[eé]s(?:es)?(?:\s+de\s+mora)?|mora|cobran)\s*(?:del?|al)?\s*(\d+(?:[.,]\d+)?)\s*%\s*(?:anual|e\.?a\.?)/i
  );
  if (tasaAnualMatch) {
    tasaMoraReportadaAnualPct = parseFloat(tasaAnualMatch[1].replace(",", "."));
  }

  // Quorum / aprobacion
  let quorumAsistenciaPct: number | undefined;
  let quorumAprobacionPct: number | undefined;
  const qAsistMatch = raw.match(
    /(?:qu[oó]rum|asistencia|asisti[oó]|presentes?)\s*(?:del?|con)?\s*(\d+(?:[.,]\d+)?)\s*%/i
  );
  if (qAsistMatch) {
    quorumAsistenciaPct = parseFloat(qAsistMatch[1].replace(",", "."));
  }
  const qAprobMatch = raw.match(
    /(?:aprobad[oa]|aprob[oó]|votos?\s+a\s+favor|votaci[oó]n(?:\s+del?)?|mayor[ií]a\s+del?)\s*(?:con\s+(?:el\s+)?)?(\d+(?:[.,]\d+)?)\s*%/i
  );
  if (qAprobMatch) {
    quorumAprobacionPct = parseFloat(qAprobMatch[1].replace(",", "."));
  }

  // Cuota extraordinaria veces mensual
  let cuotaExtraordinariaVecesMensual: number | undefined;
  const vecesMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*veces\s+(?:el\s+valor\s+de\s+)?(?:la\s+)?(?:expensa|cuota|administraci[oó]n)/i);
  if (vecesMatch) {
    cuotaExtraordinariaVecesMensual = parseFloat(vecesMatch[1].replace(",", "."));
  }

  // Unidades resultantes en desenglobe / subdivision
  let unidadesResultantes: number | undefined;
  const uniMatch = raw.match(/(?:en|dividir\s+en|sacar)\s+(\d{1,3})\s*(?:unidades?|apartamentos?|aptos?|lotes?|locales?|folios?|matr[ií]culas?)/i);
  if (uniMatch) {
    unidadesResultantes = parseInt(uniMatch[1], 10);
  }

  return {
    presupuestoTotalCop,
    coeficienteUnidadPct,
    listaCoeficientesPct,
    areaPrivadaUnidadM2,
    areaPrivadaTotalM2,
    capitalMoraCop,
    mesesMora,
    tasaMoraReportadaMensualPct,
    tasaMoraReportadaAnualPct,
    quorumAsistenciaPct,
    quorumAprobacionPct,
    cuotaExtraordinariaVecesMensual,
    unidadesResultantes
  };
}

/**
 * Ejecuta calculos deterministicos de Ley 675 de 2001 (coeficientes, expensas, quorums, mora 1.5x IBC, impugnacion y solidaridad Art. 29).
 */
export function calculatePropiedadHorizontalMetrics(raw: string): {
  calculations: PhCalculationsResult;
  findings: PhAuditFinding[];
  summaryPoints: string[];
} {
  const norm = normalizeText(raw);
  const nums = extractPhNumbers(raw);
  const findings: PhAuditFinding[] = [];
  const summaryPoints: string[] = [];

  let coeficienteFinal = nums.coeficienteUnidadPct;
  if (!coeficienteFinal && nums.areaPrivadaUnidadM2 && nums.areaPrivadaTotalM2 && nums.areaPrivadaTotalM2 > 0) {
    coeficienteFinal = Number(((nums.areaPrivadaUnidadM2 / nums.areaPrivadaTotalM2) * 100).toFixed(4));
    summaryPoints.push(
      `Coeficiente calculado por área privada (${nums.areaPrivadaUnidadM2} m² / ${nums.areaPrivadaTotalM2} m²): ${coeficienteFinal}% (sujeto a ponderación si coexiste uso comercial Art. 26 Ley 675).`
    );
  }

  let sumaCoeficientesPct: number | undefined;
  let sumaCoeficientesValida: boolean | undefined;
  if (nums.listaCoeficientesPct.length >= 2) {
    sumaCoeficientesPct = Number(
      nums.listaCoeficientesPct.reduce((acc, v) => acc + v, 0).toFixed(4)
    );
    sumaCoeficientesValida = Math.abs(sumaCoeficientesPct - 100) <= 0.05;
    if (!sumaCoeficientesValida) {
      findings.push({
        severidad: "ALTA",
        titulo: "Descuadre en sumatoria de coeficientes de copropiedad",
        hallazgo: `Los coeficientes suministrados suman ${sumaCoeficientesPct}% (diferencia de ${Math.abs(
          100 - sumaCoeficientesPct
        ).toFixed(4)}% frente al 100.000% obligatorio).`,
        fundamentoLegal: "Artículos 25 y 26 de la Ley 675 de 2001 (la suma de coeficientes debe ser igual a 100%).",
        recomendacion:
          "Recalcular la tabla de coeficientes en asamblea (70%) y protocolizar corrección mediante escritura pública de reforma al RPH."
      });
    } else {
      findings.push({
        severidad: "OK",
        titulo: "Sumatoria de coeficientes válida",
        hallazgo: `Los coeficientes suman exactamente ${sumaCoeficientesPct}% (conforme al 100%).`,
        fundamentoLegal: "Artículo 25 de la Ley 675 de 2001.",
        recomendacion: "Conservar tabla de coeficientes protocolizada."
      });
    }
    summaryPoints.push(`Sumatoria de coeficientes evaluada: ${sumaCoeficientesPct}% (${sumaCoeficientesValida ? "Válida" : "Descuadrada"}).`);
  }

  let expensaUnidadCop: number | undefined;
  if (nums.presupuestoTotalCop && coeficienteFinal) {
    expensaUnidadCop = Math.round(nums.presupuestoTotalCop * (coeficienteFinal / 100));
    summaryPoints.push(
      `Expensa común calculada sobre ${formatCop(nums.presupuestoTotalCop)} al coeficiente ${coeficienteFinal}%: ${formatCop(expensaUnidadCop)} mensuales.`
    );
  }

  // Mora maxima legal (1.5x IBC Art. 30 Ley 675)
  let excedeTopeUsuraMora: boolean | undefined;
  const tasaReportadaMensual =
    nums.tasaMoraReportadaMensualPct ??
    (nums.tasaMoraReportadaAnualPct !== undefined
      ? Number(((Math.pow(1 + nums.tasaMoraReportadaAnualPct / 100, 1 / 12) - 1) * 100).toFixed(2))
      : undefined);

  if (tasaReportadaMensual !== undefined) {
    excedeTopeUsuraMora = tasaReportadaMensual > TASA_MORA_MAX_MENSUAL_PCT + 0.05;
    if (excedeTopeUsuraMora) {
      findings.push({
        severidad: "ALTA",
        titulo: "Interés de mora superior al tope legal (1.5x IBC)",
        hallazgo: `Se reporta cobro de ${tasaReportadaMensual}% mensual, superando el tope referencial máximo de ${TASA_MORA_MAX_MENSUAL_PCT}% M.V. (${TASA_MORA_MAX_EA_PCT}% E.A. = 1.5x IBC ${IBC_REFERENCIA_EA_PCT}% E.A.).`,
        fundamentoLegal: "Artículo 30 de la Ley 675 de 2001, Artículo 884 del Código de Comercio y Artículo 305 del Código Penal.",
        recomendacion:
          "Solicitar por escrito a la Administración reliquidación inmediata ajustada a 1.5x IBC certificado por la Superfinanciera para el mes respectivo, sin capitalización de intereses."
      });
    } else {
      findings.push({
        severidad: "OK",
        titulo: "Tasa de mora dentro del límite legal",
        hallazgo: `La tasa indicada (${tasaReportadaMensual}% mensual) no supera el tope referencial de ${TASA_MORA_MAX_MENSUAL_PCT}% M.V. (1.5x IBC).`,
        fundamentoLegal: "Artículo 30 de la Ley 675 de 2001.",
        recomendacion: "Verificar mensualmente la certificación del IBC de la Superfinanciera."
      });
    }
  }

  let interesMoraMaxLegalCop: number | undefined;
  const capitalBaseMora = nums.capitalMoraCop ?? expensaUnidadCop;
  if (capitalBaseMora && (nums.mesesMora || /\bmora|inter[eé]s\b/i.test(norm))) {
    const meses = nums.mesesMora || 1;
    interesMoraMaxLegalCop = Math.round(capitalBaseMora * (TASA_MORA_MAX_MENSUAL_PCT / 100) * meses);
    summaryPoints.push(
      `Interés moratorio máximo legal estimado (1.5x IBC ≈ ${TASA_MORA_MAX_MENSUAL_PCT}% M.V. sobre ${formatCop(
        capitalBaseMora
      )} por ${meses} mes(es)): ${formatCop(interesMoraMaxLegalCop)} (sin anatocismo).`
    );
  }

  // Quorum y mayoria calificada 70% (Arts. 45 y 46 Ley 675)
  const requires70ByTopic =
    /\b(?:reforma\s+(?:al\s+|del\s+)?(?:rph|reglamento)|cambio\s+de\s+destinaci[oó]n|desafectaci[oó]n|uso\s+exclusivo|reconstrucci[oó]n|extinci[oó]n|airbnb|vivienda\s+tur[ií]stica|renta\s+corta)\b/i.test(
      norm
    ) ||
    (nums.cuotaExtraordinariaVecesMensual !== undefined && nums.cuotaExtraordinariaVecesMensual > 4);

  let mayoriaValida: boolean | undefined;
  const votoEfectivoPct = nums.quorumAprobacionPct ?? nums.quorumAsistenciaPct;
  if (votoEfectivoPct !== undefined) {
    if (requires70ByTopic) {
      mayoriaValida = votoEfectivoPct >= 70;
      if (!mayoriaValida) {
        findings.push({
          severidad: "ALTA",
          titulo: "Decisión inválida por falta de mayoría calificada del 70%",
          hallazgo: `El asunto exige mayoría calificada del 70% del total de coeficientes de la copropiedad, pero solo se alcanzó ${votoEfectivoPct}%. Incluso en segunda convocatoria aplica el 70% del Art. 46.`,
          fundamentoLegal: "Artículo 46 de la Ley 675 de 2001 y Artículo 49 (Impugnación dentro de los 2 meses siguientes).",
          recomendacion:
            "Impugnar el acta ante el Juez Civil dentro de los 2 meses calendario siguientes a su publicación/comunicación (Art. 49 Ley 675 y Art. 382 C.G.P.)."
        });
      } else {
        findings.push({
          severidad: "OK",
          titulo: "Mayoría calificada del 70% cumplida",
          hallazgo: `La decisión alcanzó ${votoEfectivoPct}% del total de coeficientes (>= 70%).`,
          fundamentoLegal: "Artículo 46 de la Ley 675 de 2001.",
          recomendacion: "Si modifica el RPH, elevar el acta a escritura pública e inscribirla en la ORIP."
        });
      }
    } else if (nums.quorumAsistenciaPct !== undefined) {
      mayoriaValida = nums.quorumAsistenciaPct > 50;
      summaryPoints.push(
        `Quórum en primera convocatoria evaluado (${nums.quorumAsistenciaPct}%): ${
          mayoriaValida
            ? "Válido (>50% de coeficientes Art. 45)."
            : "Insuficiente para primera convocatoria (<=50%). Requiere segunda convocatoria (Art. 45 inc. 2)."
        }`
      );
    }
  } else if (nums.cuotaExtraordinariaVecesMensual !== undefined) {
    summaryPoints.push(
      nums.cuotaExtraordinariaVecesMensual > 4
        ? `Cuota extraordinaria equivale a ${nums.cuotaExtraordinariaVecesMensual} veces la expensa mensual (>4x): EXIGE mayoría calificada del 70% (Art. 46 num. 2 Ley 675).`
        : `Cuota extraordinaria de ${nums.cuotaExtraordinariaVecesMensual} veces la expensa mensual (<=4x): procede por mayoría simple en asamblea válida (Art. 45 Ley 675).`
    );
  }

  if (summaryPoints.length === 0) {
    summaryPoints.push(
      "Parámetros legales Ley 675/2001: Tope mora 1.5x IBC (Art. 30), Mayoría calificada 70% (Art. 46), Impugnación 2 meses (Art. 49) y Solidaridad paz y salvo (Art. 29)."
    );
  }

  return {
    calculations: {
      presupuestoTotalCop: nums.presupuestoTotalCop,
      coeficienteUnidadPct: coeficienteFinal,
      expensaUnidadCop,
      sumaCoeficientesPct,
      sumaCoeficientesValida,
      areaPrivadaUnidadM2: nums.areaPrivadaUnidadM2,
      areaPrivadaTotalM2: nums.areaPrivadaTotalM2,
      capitalMoraCop: capitalBaseMora,
      mesesMora: nums.mesesMora,
      tasaMoraReportadaMensualPct: tasaReportadaMensual,
      tasaMoraReportadaAnualPct: nums.tasaMoraReportadaAnualPct,
      ibcReferenciaEaPct: IBC_REFERENCIA_EA_PCT,
      tasaMoraMaxLegalEaPct: TASA_MORA_MAX_EA_PCT,
      tasaMoraMaxLegalMensualPct: TASA_MORA_MAX_MENSUAL_PCT,
      excedeTopeUsuraMora,
      interesMoraMaxLegalCop,
      quorumAsistenciaPct: nums.quorumAsistenciaPct,
      quorumAprobacionPct: nums.quorumAprobacionPct,
      cuotaExtraordinariaVecesMensual: nums.cuotaExtraordinariaVecesMensual,
      requiereMayoriaCalificada70: requires70ByTopic,
      mayoriaValida,
      plazoImpugnacionMeses: 2,
      solidaridadCompraventaArt29:
        "Art. 29 Ley 675: Solidaridad entre vendedor y comprador por expensas comunes insolutas al momento de la escritura; exigir Paz y Salvo de Administración."
    },
    findings,
    summaryPoints
  };
}

/**
 * Auditoria deterministica de Reglamentos PH (RPH) y Actas de Asamblea:
 * Vivienda Turistica (Airbnb/RNT), Mascotas, Uso Comercial, Reformas y Sanciones.
 */
export function auditPhRegulationOrMinutes(
  draftText: string,
  requesterName?: string
): PropiedadHorizontalReport {
  const norm = normalizeText(draftText);
  const findings: PhAuditFinding[] = [];
  const calcData = calculatePropiedadHorizontalMetrics(draftText);
  findings.push(...calcData.findings);

  const isMinutesOrCouncil =
    /\b(?:acta\s+(?:de\s+)?(?:asamblea|consejo)|consejo\s+de\s+administraci[oó]n|administrador(?:a)?|circular|manual\s+de\s+convivencia|mayor[ií]a\s+simple|mitad\s+m[aá]s\s+uno)\b/i.test(
      norm
    );
  const isRegisteredRph =
    /\b(?:reglamento\s+de\s+propiedad\s+horizontal|\brph\b|escritura\s+p[uú]blica|inscrit[oa]\s+en\s+(?:la\s+)?orip|reforma\s+estatutaria\s+(?:con\s+)?70%)\b/i.test(
      norm
    );

  // 1) Vivienda Turistica / Renta Corta / Airbnb / RNT
  if (
    /\b(?:airbnb|renta\s+corta|vivienda\s+tur[ií]stica|alquiler\s+(?:por\s+d[ií]as|tur[ií]stico|temporal)|hospedaje|\brnt\b|registro\s+nacional\s+de\s+turismo)\b/i.test(
      norm
    )
  ) {
    const bansAirbnb = /\b(?:proh[ií]b\w*|no\s+se\s+permite\w*|veta\w*|restring\w*)\b/i.test(
      norm
    );
    if (bansAirbnb && isMinutesOrCouncil && !/\b70%\b.*\bescritura\b/i.test(norm)) {
      findings.push({
        severidad: "ALTA",
        titulo: "Prohibición de vivienda turística (Airbnb / renta corta) sin reforma válida al RPH",
        hallazgo:
          "Se pretende prohibir la vivienda turística o renta corta mediante acta por mayoría simple, circular, manual de convivencia o decisión del Consejo/Administrador, sin reforma estatutaria al Reglamento PH aprobada con 70% e inscrita en ORIP.",
        fundamentoLegal:
          "Artículos 46 y 49 de la Ley 675 de 2001, Decreto 1074 de 2015 (Decreto 2590 de 2009) y Artículo 38 de la Ley 2068 de 2020.",
        recomendacion:
          "La restricción es jurídicamente ineficaz e impugnable dentro de los 2 meses siguientes (Art. 49 Ley 675). Si la copropiedad desea prohibirla, debe convocar asamblea, lograr 70% del total de coeficientes y elevar la reforma a Escritura Pública inscrita en ORIP. Si el RPH no la prohíbe, el propietario debe operar con RNT activo, TRA, SIRE y póliza civil."
      });
    } else if (bansAirbnb && isRegisteredRph) {
      findings.push({
        severidad: "OK",
        titulo: "Prohibición expresa de vivienda turística en Reglamento PH (RPH)",
        hallazgo:
          "El Reglamento de Propiedad Horizontal debidamente protocolizado e inscrito restringe expresamente la destinación de vivienda turística / alojamiento por días.",
        fundamentoLegal: "Ley 675 de 2001, Sentencia C-318 de 2002 y Decreto 1074 de 2015.",
        recomendacion:
          "Cláusula oponible a propietarios y arrendatarios. Operar renta corta sin reforma del 70% expone a multas policivas, suspensión del RNT y acciones estatutarias."
      });
    } else {
      findings.push({
        severidad: "MEDIA",
        titulo: "Régimen de Vivienda Turística y Registro Nacional de Turismo (RNT)",
        hallazgo:
          "Cuando el RPH no prohíbe expresamente la vivienda turística, la actividad es lícita pero exige cumplimiento estricto de formalidades turísticas ante MinCIT y la copropiedad.",
        fundamentoLegal: "Decreto 1074 de 2015 (Art. 2.2.4.4.12.2), Ley 2068 de 2020 Art. 38 y Ley 675 de 2001.",
        recomendacion:
          "Acreditar ante la Administración: (1) RNT activo en RUES, (2) Tarjeta de Registro de Alojamiento (TRA), (3) reporte SIRE de extranjeros, (4) póliza de responsabilidad civil y (5) registro previo de huéspedes en portería."
      });
    }
  }

  // 2) Mascotas
  if (/\b(?:mascota|mascotas|perro|perros|gato|gatos|animal(?:es)?\s+de\s+compa[nñ][ií]a)\b/i.test(norm)) {
    const bansPets =
      /\b(?:proh[ií]b\w*|no\s+se\s+permiten?)\b.{0,50}\b(?:tenencia|mascotas?|perros?|gatos?|ascensor|ingreso|acceso|zonas?\s+comunes?)\b/i.test(
        norm
      );
    if (bansPets) {
      findings.push({
        severidad: "ALTA",
        titulo: "Prohibición absoluta de mascotas o restricción de acceso en ascensor",
        hallazgo:
          "Prohibir la tenencia de mascotas en unidades privadas o impedir su circulación por ascensores/portería constituye una cláusula abusiva e inconstitucional.",
        fundamentoLegal:
          "Sentencias Corte Constitucional T-035/1997, T-119/1998 y C-439/2011; Ley 1801 de 2016 y Ley 2054 de 2020.",
        recomendacion:
          "Reemplazar la prohibición por reglas proporcionales de convivencia: uso de correa, bozal únicamente para perros de manejo especial (Ley 1801/2016), carné de vacunas y recolección obligatoria de excretas."
      });
    } else {
      findings.push({
        severidad: "OK",
        titulo: "Regulación razonable de convivencia con mascotas",
        hallazgo: "Las medidas evaluadas regulan convivencia sin prohibir la tenencia.",
        fundamentoLegal: "Ley 675 de 2001 y Ley 1801 de 2016.",
        recomendacion: "Asegurar que el acceso por zonas comunes y ascensores no se bloquee de forma absoluta."
      });
    }
  }

  // 3) Suspension ilegal de servicios esenciales / citofonia / acceso / multas ilegales
  if (
    /\b(?:corte|cortar|suspender|suspensi[oó]n|bloquear|impedir)\b.{0,65}\b(?:agua|acueducto|energ[ií]a|luz|gas|citofon[ií]a|ascensor|porter[ií]a|acceso|ingreso|parqueadero|tarjeta\s+de\s+acceso)\b/i.test(
      norm
    )
  ) {
    findings.push({
      severidad: "ALTA",
      titulo: "Suspensión ilegal de servicios públicos esenciales, citofonía o acceso por mora",
      hallazgo:
        "La copropiedad no puede suspender servicios públicos domiciliarios, citofonía, uso de ascensor ni impedir el ingreso peatonal/vehicular a la unidad privada como mecanismo de cobro.",
      fundamentoLegal:
        "Sentencias Corte Constitucional T-035/1997, T-630/1997, T-454/2017 y Artículos 59-60 de la Ley 675 de 2001.",
      recomendacion:
        "Eliminar esta sanción de inmediato. Solo puede restringirse el uso de bienes comunes NO esenciales (piscina, salón social, BBQ) previo debido proceso (descargos ante Consejo/Asamblea) y acudir al proceso ejecutivo de cobro (Art. 48 Ley 675)."
    });
  }

  if (
    /\b(?:multa|sanci[oó]n)\b.{0,60}\b(?:sin\s+descargos|directamente\s+el\s+administrador|administrador\s+impondr[aá]|3\s*veces|4\s*veces|5\s*veces|15\s*veces)\b/i.test(
      norm
    )
  ) {
    findings.push({
      severidad: "ALTA",
      titulo: "Sanción pecuniaria irregular o sin debido proceso (Art. 59-60 Ley 675)",
      hallazgo:
        "Las multas en PH no pueden imponerse de plano por el Administrador sin derecho de defensa ni superar 2 expensas mensuales por infracción (máximo 10 acumuladas).",
      fundamentoLegal: "Artículos 59 y 60 de la Ley 675 de 2001.",
      recomendacion:
        "Garantizar pliego de cargos, término de descargos, valoración de pruebas ante el Consejo/Asamblea y resolución motivada impugnable dentro de 1 mes (sanciones) o 2 meses (actas)."
    });
  }

  // 4) Reformas en fachada / bienes comunes / uso comercial
  if (
    /\b(?:fachada|cerramiento|terraza|balc[oó]n|bienes?\s+comunes?|reforma\s+locativa|uso\s+comercial|oficina|local)\b/i.test(
      norm
    )
  ) {
    findings.push({
      severidad: "MEDIA",
      titulo: "Control de bienes comunes, fachada y cambio de destinación",
      hallazgo:
        "Toda intervención en fachada o bienes comunes de uso exclusivo requiere autorización previa de Asamblea (70% si altera fachada/coeficientes o asigna uso exclusivo) y licencia en Curaduría Urbana si modifica área o estructura.",
      fundamentoLegal: "Artículos 18, 22, 23, 46 y 73 de la Ley 675 de 2001; Decreto 1077 de 2015.",
      recomendacion:
        "Distinguir adecuaciones internas no estructurales (permitidas en horarios reglamentarios) frente a alteraciones de fachada o cambio de uso comercial (exigen reforma RPH 70% y compatibilidad POT)."
    });
  }

  if (findings.length === 0) {
    findings.push({
      severidad: "OK",
      titulo: "Revisión preliminar sin cláusulas abusivas evidentes en el fragmento analizado",
      hallazgo:
        "El texto analizado no exhibe prohibiciones absolutas de mascotas, corte de servicios esenciales ni restricciones de Airbnb por mayoría simple.",
      fundamentoLegal: "Ley 675 de 2001 y Decreto 1074 de 2015.",
      recomendacion:
        "Validar contra el texto completo de la Escritura Pública del RPH inscrita en la ORIP para confirmar coeficientes y quórums."
    });
  }

  const highCount = findings.filter((f) => f.severidad === "ALTA").length;
  const medCount = findings.filter((f) => f.severidad === "MEDIA").length;
  const riskLevel: PhRiskLevel = highCount > 0 ? "ROJO" : medCount > 0 ? "AMARILLO" : "VERDE";

  const riskHeadline =
    riskLevel === "ROJO"
      ? `Detectados ${highCount} hallazgo(s) crítico(s) contrarios a la Ley 675/2001 o jurisprudencia constitucional.`
      : riskLevel === "AMARILLO"
      ? `Detectados ${medCount} punto(s) de ajuste preventivo o verificación formal ante ORIP/MinCIT.`
      : "Cláusulas y parámetros ajustados al régimen de Propiedad Horizontal vigente.";

  return {
    mode: "audit",
    headline: "AUDITORÍA JURÍDICA DE REGLAMENTO PH / ACTA DE ASAMBLEA (LEY 675 DE 2001)",
    normativeFramework:
      "Ley 675 de 2001, Decreto 1074 de 2015 / Ley 2068 de 2020 (RNT) y Jurisprudencia Constitucional",
    riskLevel,
    riskHeadline,
    summaryPoints: [
      `Semáforo de cumplimiento PH: ${riskLevel} (Críticos: ${highCount} | Preventivos: ${medCount})`,
      ...calcData.summaryPoints
    ],
    calculations: calcData.calculations,
    findings,
    recommendedNextSteps: [
      "Verificar si la disposición evaluada consta en Escritura Pública de RPH inscrita en el Folio de Matrícula ORIP o solo en acta/circular.",
      "Si existe decisión de asamblea contraria al Art. 46 o abusiva, interponer acción de impugnación dentro de los 2 meses siguientes (Art. 49 Ley 675).",
      "Para reforma estatutaria, demanda de impugnación o habilitación de RNT, agendar revisión con VECY al +57 316 656 9719."
    ],
    requesterName
  };
}

/**
 * Prefactibilidad Tecnica-Notarial de Desenglobe, Subdivision, Englobe o Reforma al RPH.
 */
export function buildPhPrefeasibilityReport(
  raw: string,
  requesterName?: string
): PropiedadHorizontalReport {
  const norm = normalizeText(raw);
  const nums = extractPhNumbers(raw);
  const operacion = detectPhSubdivisionOperation(norm);

  const labelMap: Record<PhSubdivisionOperation, string> = {
    desenglobe: "DESENGLOBE Y APERTURA DE MATRÍCULAS INMOBILIARIAS",
    subdivision: "SUBDIVISIÓN URBANA / ARQUITECTÓNICA DE UNIDADES O LOTES",
    englobe: "ENGLOBE PREDIAL Y UNIFICACIÓN DE FOLIOS",
    reforma_rph: "REFORMA AL REGLAMENTO DE PROPIEDAD HORIZONTAL (RPH)",
    constitucion_ph: "CONSTITUCIÓN DE PROPIEDAD HORIZONTAL (LEY 675 DE 2001)"
  };

  const isEnglobe = operacion === "englobe";
  const requiereAsamblea70Pct =
    operacion === "reforma_rph" ||
    operacion === "desenglobe" ||
    /\b(?:propiedad\s+horizontal|\bph\b|\brph\b|edificio|conjunto|apartamento|garaje|dep[oó]sito)\b/i.test(norm);

  const checklistTecnicoNotarial: string[] = [
    "1. Estudio de Títulos SNR previo (Folios de Matrícula matriz y derivados) verificando linderos, cabida y ausencia de embargos o limitaciones que impidan englobar/desenglobar.",
    isEnglobe
      ? "2. Identidad de titularidad y régimen: los predios a englobar deben pertenecer al mismo propietario (o copropietarios en idéntica proporción), ser colindantes y estar libres de hipotecas contradictorias o con autorización del acreedor."
      : "2. Levantamiento topográfico y planos arquitectónicos / de Propiedad Horizontal con cuadro de áreas privadas, áreas comunes, linderos exactos y cálculo de nuevos coeficientes (sumatoria 100.000% — Arts. 25-26 Ley 675).",
    "3. Trámite en Curaduría Urbana (Decreto 1077 de 2015): Licencia de Subdivisión Urbana / Reloteo o Licencia de Construcción (modificación/adecuación) verificando áreas mínimas, frentes, parqueaderos y norma POT vigente.",
    ...(requiereAsamblea70Pct
      ? [
          "4. Acta de Asamblea General de Copropietarios aprobando la reforma al RPH / desenglobe con mayoría calificada mínima del 70% del total de coeficientes (Art. 46 Ley 675 de 2001)."
        ]
      : []),
    "5. Paz y Salvos obligatorios para escrituración: Impuesto Predial al día, Paz y Salvo de Valorización IDU (Bogotá) y Paz y Salvo de Administración PH (Art. 29 Ley 675).",
    `6. Escritura Pública ante Notaría de ${
      isEnglobe ? "Englobe y actualización de linderos" : "Desenglobe / Constitución o Reforma al RPH"
    }, protocolizando planos aprobados, licencia de Curaduría y acta (si aplica).`,
    "7. Registro en ORIP (SNR) para apertura de nuevos Folios de Matrícula segregados (o cierre en folio único en englobe) y radicación ante Catastro (UAECD / IGAC) para expedición de nuevos códigos CHIP."
  ];

  const alertasClave: string[] = [
    "Si uno de los inmuebles tiene hipoteca o leasing vigente, se requiere autorización expresa de la entidad financiera (división o sustitución de garantía) antes de otorgar escritura.",
    "La subdivisión física sin licencia de Curaduría ni reforma al RPH genera unidades ilegales sin matrícula independiente ni servicios públicos autónomos (inviables para crédito hipotecario)."
  ];

  if (nums.areaPrivadaUnidadM2 && nums.unidadesResultantes && nums.unidadesResultantes >= 2) {
    const prom = Math.round((nums.areaPrivadaUnidadM2 / nums.unidadesResultantes) * 10) / 10;
    alertasClave.unshift(
      `Estimación geométrica preliminar: ${nums.areaPrivadaUnidadM2} m² divididos en ${nums.unidadesResultantes} unidades arrojan ~${prom} m² brutos por unidad (validar área mínima habitable y parqueaderos exigidos en Curaduría).`
    );
  }

  return {
    mode: "prefeasibility",
    headline: `PREFACTIBILIDAD TÉCNICO-NOTARIAL: ${labelMap[operacion]}`,
    normativeFramework:
      "Ley 675 de 2001 (Arts. 5, 25, 26, 46), Decreto 1077 de 2015 (Curadurías) y Estatuto Registral Ley 1579 de 2012",
    riskLevel: "AMARILLO",
    riskHeadline:
      "Operación viable condicionada a planos, licencia urbanística de Curaduría, quórum 70% (si está en PH) y escritura en Notaría/ORIP.",
    summaryPoints: [
      `Operación evaluada: ${labelMap[operacion]}`,
      nums.areaPrivadaUnidadM2 ? `Área base reportada: ${nums.areaPrivadaUnidadM2} m²` : "Área base: Por precisar en levantamiento topográfico/planos",
      `Requiere Curaduría Urbana: SÍ | Requiere Asamblea PH 70%: ${requiereAsamblea70Pct ? "SÍ (Art. 46 Ley 675)" : "No (salvo sometimiento a RPH)"}`
    ],
    findings: alertasClave.map((a, idx) => ({
      severidad: "MEDIA" as PhSeverity,
      titulo: `Alerta Técnica / Registral #${idx + 1}`,
      hallazgo: a,
      fundamentoLegal: "Ley 675 de 2001, Decreto 1077 de 2015 y Ley 1579 de 2012.",
      recomendacion: "Validar viabilidad con arquitecto/curador y abogado inmobiliario antes de suscribir promesas de compraventa sobre unidades futuras."
    })),
    prefeasibility: {
      operacion,
      operacionLabel: labelMap[operacion],
      areaBaseM2: nums.areaPrivadaUnidadM2,
      unidadesResultantes: nums.unidadesResultantes,
      requiereCuraduria: true,
      requiereAsamblea70Pct,
      requiereReformaRphEscritura: requiereAsamblea70Pct,
      checklistTecnicoNotarial,
      alertasClave
    },
    recommendedNextSteps: [
      "Realizar Estudio de Títulos SNR del folio matriz antes de iniciar planos o licencias.",
      "Coordinar levantamiento arquitectónico, recálculo de coeficientes y minuta de reforma/desenglobe con VECY al +57 316 656 9719."
    ],
    requesterName
  };
}

function formatPhWhatsAppReply(
  report: PropiedadHorizontalReport,
  pdfResult?: GeneratedLegalPdfResult
): string {
  const semaphoreBadge =
    report.riskLevel === "ROJO"
      ? "🔴 *SEMÁFORO ROJO — Riesgo / Invalidez Jurídica Detectada*"
      : report.riskLevel === "AMARILLO"
      ? "🟡 *SEMÁFORO AMARILLO — Requiere Validación Técnica/Registral*"
      : "🟢 *SEMÁFORO VERDE — Conforme a la Ley 675 de 2001*";

  const summaryBlock = report.summaryPoints.map((p) => `• ${p}`).join("\n");

  let extraBlock = "";
  if (report.mode === "calc" && report.calculations) {
    const c = report.calculations;
    const calcLines: string[] = [];
    if (c.expensaUnidadCop !== undefined) {
      calcLines.push(`• *Expensa calculada:* ${formatCop(c.expensaUnidadCop)} / mes`);
    }
    if (c.interesMoraMaxLegalCop !== undefined) {
      calcLines.push(
        `• *Tope mora máximo legal (1.5x IBC ≈ ${c.tasaMoraMaxLegalMensualPct}% M.V.):* ${formatCop(c.interesMoraMaxLegalCop)}`
      );
    }
    calcLines.push(`• *Mayoría calificada reformas / >4x cuota / bienes comunes:* 70% coeficientes (Art. 46)`);
    calcLines.push(`• *Caducidad impugnación de actas:* ${c.plazoImpugnacionMeses} meses (Art. 49)`);
    calcLines.push(`• *Solidaridad compraventa:* Exigir Paz y Salvo Administración (Art. 29)`);
    extraBlock = `\n\n📐 *Parámetros Ley 675 de 2001:*\n${calcLines.join("\n")}`;
  }

  if (report.findings.length > 0) {
    const findingsText = report.findings
      .slice(0, 4)
      .map(
        (f, i) =>
          `${i + 1}. *[${f.severidad}] ${f.titulo}:* ${f.hallazgo}\n   📌 _Norma:_ ${f.fundamentoLegal}\n   ✍️ _Acción:_ ${f.recomendacion}`
      )
      .join("\n\n");
    extraBlock += `\n\n⚖️ *Hallazgos y Validaciones:*\n${findingsText}`;
  }

  if (report.prefeasibility) {
    extraBlock += `\n\n🏗️ *Checklist Técnico-Notarial (${report.prefeasibility.operacionLabel}):*\n${report.prefeasibility.checklistTecnicoNotarial.join(
      "\n"
    )}`;
  }

  const pdfBlock = pdfResult
    ? `\n\n📄 *Adjunto:* Concepto Técnico-Jurídico PH Membretado *${pdfResult.fileName}* (Radicado: \`${pdfResult.verificationCode}\`).`
    : "";

  return (
    `🏢 *${report.headline}*\n` +
    `${semaphoreBadge}\n` +
    `📚 *Marco normativo:* ${report.normativeFramework}\n\n` +
    `${summaryBlock}` +
    extraBlock +
    pdfBlock +
    VECY_PH_BROKER_CTA
  );
}

/**
 * Orquestador unificado DM y Grupos para Skill 6:
 * Propiedad Horizontal (Ley 675/2001), Auditoria RPH/Actas (texto/PDF/imagen), Vivienda Turistica RNT y Subdivision/Englobe.
 * Opera deterministico a $0 COP en NODE_ENV=test y texto legible.
 */
export async function analyzePropiedadHorizontalFromWhatsAppInput(input: {
  text?: string;
  pdfBuffer?: Buffer | string | null;
  pdfMimeType?: string | null;
  imageBuffer?: Buffer | string | null;
  imageMimeType?: string | null;
  requesterName?: string;
}): Promise<PropiedadHorizontalWhatsAppResult> {
  const rawText = String(input.text || "").trim();
  const pdfBase64 = mediaInputToBase64(input.pdfBuffer);
  const imgBase64 = mediaInputToBase64(input.imageBuffer);
  const hasMedia = Boolean(pdfBase64 || imgBase64);

  let extractedMediaText = "";
  if (pdfBase64) {
    try {
      const snippets = extractTextSnippetsFromPdfBuffer(pdfBase64);
      if (snippets && snippets.trim().length > 0) {
        extractedMediaText = snippets.trim();
      }
    } catch {
      extractedMediaText = "";
    }
  }

  // Vision LLM solo fuera de NODE_ENV=test cuando llega imagen o PDF escaneado sin texto seleccionable
  if (
    process.env.NODE_ENV !== "test" &&
    extractedMediaText.trim().length < 40 &&
    (imgBase64 || pdfBase64)
  ) {
    try {
      const targetBase64 = pdfBase64 || imgBase64;
      const mime = pdfBase64
        ? input.pdfMimeType || "application/pdf"
        : input.imageMimeType || "image/jpeg";
      if (targetBase64) {
        const llmRes = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "Extrae integramente en texto plano los articulos, clausulas, coeficientes, quorums, sanciones, restricciones de mascotas o vivienda turistica/Airbnb y decisiones de este Reglamento PH o Acta de Asamblea."
            },
            {
              role: "user",
              content: [
                { type: "text", text: rawText || "Transcribe el contenido del Reglamento PH o Acta adjunta." },
                {
                  type: "image_url",
                  image_url: { url: `data:${mime};base64,${targetBase64}` }
                }
              ]
            }
          ]
        });
        const content = llmRes?.choices?.[0]?.message?.content;
        if (typeof content === "string" && content.trim().length > 20) {
          extractedMediaText = content.trim();
        }
      }
    } catch {
      // Fallback manejado abajo
    }
  }

  const combinedText = [rawText, extractedMediaText].filter(Boolean).join("\n\n");

  if (!isPropiedadHorizontalRequest(rawText || combinedText, hasMedia)) {
    return {
      handled: false,
      mode: "guidance",
      whatsappReply: "",
      reactionEmoji: "🏢"
    };
  }

  const norm = normalizeText(combinedText);

  // Caso especial: adjunto media ilegible sin texto
  if (hasMedia && extractedMediaText.trim().length < 30 && !hasPhDocumentMarkers(rawText)) {
    return {
      handled: true,
      mode: "audit",
      whatsappReply:
        `🏢 Recibí tu archivo de Reglamento PH / Acta, pero no logré extraer texto legible para auditarlo con rigor de Ley 675.\n` +
        `Por favor envíame una foto más nítida, un PDF con texto seleccionable o pega directamente los artículos/puntos del acta (mascotas, Airbnb/RNT, sanciones, quórum o cuotas) y te entrego el *Concepto Técnico-Jurídico PH en PDF*.` +
        VECY_PH_BROKER_CTA,
      reactionEmoji: "🏢"
    };
  }

  // Determinar sub-modo: Audit RPH/Acta vs Prefactibilidad Desenglobe/Englobe vs Calculos Ley 675
  const isAuditMode =
    hasPhDocumentMarkers(combinedText) ||
    /\b(?:audita(?:me|r)?|revisa(?:me|r)?|analiza(?:me|r)?)\b.{0,45}\b(?:reglamento|\brph\b|acta|manual\s+de\s+convivencia|circular|prohibici[oó]n|sanci[oó]n|cl[aá]usula)\b/i.test(
      norm
    ) ||
    /\b(?:proh[ií]b|prohibido|multa|sanci[oó]n|airbnb|renta\s+corta|vivienda\s+tur[ií]stica|mascotas|corte\s+de\s+(?:agua|energ[ií]a|citofon[ií]a))\b/i.test(
      norm
    );

  const isPrefeasibilityMode =
    /\b(?:desenglobe|englobe|subdivisi[oó]n|subdividir|segregar|segregaci[oó]n|reforma\s+(?:al\s+|del\s+)?(?:rph|reglamento)|constituci[oó]n\s+de\s+(?:ph|propiedad\s+horizontal))\b/i.test(
      norm
    );

  const nums = extractPhNumbers(combinedText);
  const hasCalcNumbers = Boolean(
    nums.presupuestoTotalCop ||
      nums.coeficienteUnidadPct ||
      nums.listaCoeficientesPct.length >= 2 ||
      nums.capitalMoraCop ||
      nums.tasaMoraReportadaMensualPct !== undefined ||
      nums.tasaMoraReportadaAnualPct !== undefined ||
      nums.quorumAsistenciaPct !== undefined ||
      nums.quorumAprobacionPct !== undefined ||
      nums.cuotaExtraordinariaVecesMensual !== undefined ||
      (nums.areaPrivadaUnidadM2 && nums.areaPrivadaTotalM2)
  );

  let report: PropiedadHorizontalReport;
  if (isPrefeasibilityMode && !hasPhDocumentMarkers(combinedText)) {
    report = buildPhPrefeasibilityReport(combinedText, input.requesterName);
  } else if (isAuditMode) {
    report = auditPhRegulationOrMinutes(combinedText, input.requesterName);
  } else if (hasCalcNumbers || /\b(?:expensa|coeficiente|mora|qu[oó]rum|impugna|paz\s+y\s+salvo|art(?:[ií]culo|\.?)\s*29)\b/i.test(norm)) {
    const calc = calculatePropiedadHorizontalMetrics(combinedText);
    const highCount = calc.findings.filter((f) => f.severidad === "ALTA").length;
    const medCount = calc.findings.filter((f) => f.severidad === "MEDIA").length;
    const riskLevel: PhRiskLevel = highCount > 0 ? "ROJO" : medCount > 0 ? "AMARILLO" : "VERDE";

    report = {
      mode: "calc",
      headline: "CÁLCULO Y VALIDACIÓN DE PROPIEDAD HORIZONTAL (LEY 675 DE 2001)",
      normativeFramework:
        "Ley 675 de 2001 (Arts. 25, 26, 29, 30, 45, 46, 49) y Código General del Proceso (Art. 382)",
      riskLevel,
      riskHeadline:
        riskLevel === "ROJO"
          ? `Alerta normativa: se detectaron ${highCount} incumplimiento(s) a la Ley 675 de 2001.`
          : "Liquidación y parámetros validados conforme a la Ley 675 de 2001.",
      summaryPoints: calc.summaryPoints,
      calculations: calc.calculations,
      findings: calc.findings,
      recommendedNextSteps: [
        "Exigir Paz y Salvo de Administración en toda compraventa de unidad en PH (solidaridad Art. 29 Ley 675).",
        "Verificar certificación mensual del IBC Superfinanciera para liquidar mora máxima (1.5x IBC — Art. 30 Ley 675).",
        "Para revisión de actas, impugnaciones (2 meses Art. 49) o reformas al RPH, contactar a VECY al +57 316 656 9719."
      ],
      requesterName: input.requesterName
    };
  } else {
    return {
      handled: true,
      mode: "guidance",
      whatsappReply:
        `🏢 *Motor Especializado de Propiedad Horizontal VECY (Ley 675 de 2001 — $0 COP)*\n\n` +
        `Puedo generarte de inmediato un *Concepto Técnico-Jurídico PH en PDF Membretado* si me compartes cualquiera de estos datos:\n` +
        `1️⃣ *Cálculos Ley 675:* Presupuesto total y coeficiente % (o área privada / total), monto y meses de mora (tope 1.5x IBC Art. 30), o quórum % de asamblea.\n` +
        `2️⃣ *Auditoría RPH / Acta / Vivienda Turística (Airbnb / RNT):* Pega las cláusulas o adjunta el PDF/foto del Reglamento PH o Acta de Asamblea.\n` +
        `3️⃣ *Prefactibilidad de Desenglobe / Subdivisión / Englobe:* Indica la operación, área en m², unidades resultantes y si ya está sometido a PH.` +
        VECY_PH_BROKER_CTA,
      reactionEmoji: "🏢"
    };
  }

  const pdfResult = await generatePropiedadHorizontalPdf(report, {
    requestedBy: input.requesterName
  });

  return {
    handled: true,
    mode: report.mode,
    whatsappReply: formatPhWhatsAppReply(report, pdfResult),
    pdfResult,
    report,
    reactionEmoji: report.riskLevel === "ROJO" ? "🚨" : "🏢"
  };
}
