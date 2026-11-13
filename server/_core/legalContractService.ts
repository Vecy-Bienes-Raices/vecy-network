/**
 * Motor Especializado de Minutas Juridicas Personalizadas y Auditoria de Riesgos Contractuales Inmobiliarios Colombia (v34.16 — $0 COP)
 * Punto 5 — Skill 5 de JanIA (Doctrina Eduardo A. Rivera & Jani Alves)
 *
 * Soporta generacion personalizada en PDF Membretado de VECY BIENES RAICES y auditoria juridica de:
 * - Promesa de Compraventa (Art. 1611 C.C., Art. 89 Ley 153/1887, arras confirmatorias vs retractatorias vs clausula penal, credito/FNA/leasing, condicion suspensiva estudio de titulos)
 * - Arrendamiento de Vivienda Urbana (Ley 820 de 2003: tope 1%, IPC, prohibicion depositos Art. 16, preaviso 3 meses Art. 22)
 * - Arrendamiento de Local Comercial (Codigo de Comercio Arts. 518-524: renovacion 2 anos, desahucio 6 meses, prima, cesion Art. 523)
 * - Contrato de Corretaje / Consignacion VECY (Arts. 1340-1346 C.Co.: 3% venta / 1 canon arriendo, cero cobros por publicacion, esquema 40/20/40)
 * - Otrosi Modificatorio / Cesion de Posicion Contractual / Acta de Entrega Anticipada e Inventario
 */

import {
  extractTextSnippetsFromPdfBuffer,
  hasCtlTextMarkers,
  isExplicitCtlStudyRequest
} from "./ctlTitleStudyService";
import { isIduInquiry } from "./iduValorizacionService";
import {
  ContractRiskAuditFindingPdf,
  GeneratedLegalPdfResult,
  LegalDocumentPdfParams,
  LegalDocumentType,
  generateContractRiskAuditPdf,
  generateLegalDocumentPdf
} from "./jania/legalDocumentPdfService";
import { invokeLLM } from "./llm";
import { isExplicitNotarialLiquidationRequest } from "./notarialExpenseService";
import { isPotUrbanNormRequest } from "./potUrbanNormService";
import { extractChipAndCedulaForPredial } from "./predialService";

export type ContractRiskSeverity = "ALTA" | "MEDIA" | "BAJA" | "OK";

export interface ContractAuditReport {
  contractTypeDetected: LegalDocumentType;
  contractLabel: string;
  normativeRegime: string;
  riskLevel: "VERDE" | "AMARILLO" | "ROJO";
  riskHeadline: string;
  summaryPoints: string[];
  findings: ContractAuditFinding[];
  missingClauses: string[];
  recommendedNextSteps: string[];
  requesterName?: string;
}

export type ContractAuditFinding = ContractRiskAuditFindingPdf;

export interface ParsedContractRequest {
  mode: "generate" | "audit" | "guidance";
  tipoDocumento: LegalDocumentType;
  params: LegalDocumentPdfParams;
  hasConcreteData: boolean;
  missingHintFields: string[];
}

export interface LegalContractWhatsAppResult {
  handled: boolean;
  mode: "generate" | "audit" | "guidance";
  tipoDocumento: LegalDocumentType;
  whatsappReply: string;
  pdfResult?: GeneratedLegalPdfResult;
  auditReport?: ContractAuditReport;
  reactionEmoji: string;
}

const VECY_BROKER_CTA =
  "\n\n⚖️ *Validación Jurídica Presencial y Firma Notarial:*\n" +
  "Para blindaje final, revisión de folios SNR originales, pólizas de arrendamiento o firma notarial asistida con *VECY BIENES RAÍCES* (Eduardo A. Rivera & Jani Alves), agenda tu acompañamiento en nuestro Bróker Oficial:\n" +
  "📞 *+57 316 656 9719* | 👉 https://wa.me/573166569719";

function normalizeText(text: string): string {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatCopAmount(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-CO")} COP`;
}

/**
 * Detecta si el texto corresponde a un borrador contractual o clausulado real pegado/extraido para revision.
 */
export function hasContractDraftMarkers(text: string): boolean {
  const raw = String(text || "");
  if (!raw || raw.trim().length < 25) return false;
  if (hasCtlTextMarkers(raw)) return false;
  // No capturar Reglamentos PH ni Actas de Asamblea Ley 675 como borradores de compraventa/arriendo
  if (
    /\b(?:reglamento\s+de\s+propiedad\s+horizontal|\brph\b|asamblea\s+(?:general\s+)?de\s+copropietarios|coeficiente(?:s)?\s+de\s+copropiedad|ley\s+675\s+de\s+2001)\b/i.test(
      raw
    ) &&
    !/\b(?:promesa\s+de\s+compraventa|promitente\s+(?:vendedor|comprador)|contrato\s+de\s+(?:arrendamiento|corretaje)|ley\s+820)\b/i.test(
      raw
    )
  ) {
    return false;
  }

  const markers = [
    /\bcl[aá]usula\s+(?:primera|segunda|tercera|cuarta|quinta|sexta|s[eé]ptima|octava|novena|d[eé]cima|\d+)/i,
    /\bentre\s+los\s+suscritos\b/i,
    /\bpromitente\s+(?:vendedor|comprador|cedente|cesionario)\b/i,
    /\b(?:el|la)\s+arrendador(?:a)?\b.*\b(?:el|la)\s+arrendatario(?:a)?\b/is,
    /\b(?:el|la)\s+comitente\b.*\b(?:el|la)\s+corredor\b/is,
    /\bobjeto\s+del\s+contrato\b/i,
    /\bcl[aá]usula\s+penal\b/i,
    /\bdeposito\s+(?:en\s+efectivo|de\s+garant[ií]a)\b/i,
    /\brenuncia\s+(?:expresa\s+)?(?:al\s+)?derecho\s+de\s+renovaci[oó]n\b/i,
    /\bm[eé]rito\s+ejecutivo\b/i,
    /\bcodigo\s+de\s+comercio\b.*\bart(?:iculo)?\.?\s*51[89]\b/i,
    /\bley\s+820\s+de\s+2003\b/i,
    /\botros[ií]\s+(?:modificatorio|no\.?|al\s+contrato)\b/i,
    /\bacta\s+de\s+(?:entrega|restituci[oó]n)\b/i
  ];

  let hits = 0;
  for (const rx of markers) {
    if (rx.test(raw)) hits += 1;
  }

  if (hits >= 2) return true;
  if (
    hits >= 1 &&
    raw.length >= 90 &&
    /\b(cl[aá]usula|par[aá]grafo|arras|canon|incremento|desahucio|renovaci[oó]n|penal|dep[oó]sito|saneamiento|evicci[oó]n)\b/i.test(
      raw
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Excluye preguntas puramente teoricas/conceptuales sin solicitud de minuta ni borrador para auditar.
 */
export function isConceptualContractQuestion(text: string): boolean {
  const raw = String(text || "").trim();
  if (!raw) return false;
  if (hasContractDraftMarkers(raw)) return false;

  const explicitActionOrReview =
    /\b(hazme|red[aá]ctame|redacta|elabora(?:me)?|genera(?:me)?|prepara(?:me)?|crea(?:me)?|env[ií]ame|dame|emite|en\s+pdf|minuta\s+(?:personalizada|de)|audita(?:me)?|auditor[ií]a|revisa(?:me)?\s+(?:este|el|mi|esta|estas)?\s*(?:contrato|borrador|promesa|otros[ií]|cl[aá]usula)|analiza(?:me)?\s+(?:este|el|mi|estas)?\s*(?:contrato|borrador|cl[aá]usula)|riesgos?\s+contractual(?:es)?)\b/i.test(
      raw
    );
  if (explicitActionOrReview) return false;

  const norm = normalizeText(raw).replace(/^[¿?\s]+/, "");
  const conceptualStarter =
    /^(?:jania\s+)?(?:hola[\s,!]*)?(?:@?\d+\s+)?[¿?\s]*(?:que\s+(?:es|son|significa|dice|diferencia)|como\s+(?:funciona|se\s+calcula|se\s+aplica|opera)|cual\s+es\s+la\s+diferencia|explicame\s+(?:que\s+es|como\s+funciona)|se\s+puede\s+(?:pedir|cobrar|renunciar)|cuanto\s+(?:puede\s+subir|es\s+el\s+preaviso|se\s+paga)|es\s+legal\s+(?:pedir|cobrar))\b/i.test(
      norm
    );
  if (conceptualStarter) return true;

  if (
    /\b(que\s+es\s+(?:la|el|un|una)\s+(?:arras|clausula\s+penal|otrosi|derecho\s+de\s+renovacion|prima\s+comercial|desahucio)|diferencia\s+entre\s+arras)\b/i.test(
      norm
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Discriminador principal del Skill 5: determina si un mensaje corresponde a generacion de minuta
 * juridica personalizada o a auditoria de clausulas/riesgos contractuales.
 * Respeta precedencia estricta frente a CTL, POT, FinTax, IDU, Predial y Notarial.
 */
export function isContractMinutaOrAuditRequest(text: string, hasMedia = false): boolean {
  const raw = String(text || "").trim();
  if (!raw && !hasMedia) return false;

  if (hasCtlTextMarkers(raw) || isExplicitCtlStudyRequest(raw)) return false;
  if (isPotUrbanNormRequest(raw)) return false;
  if (isIduInquiry(raw)) return false;
  const predialCheck = extractChipAndCedulaForPredial(raw);
  const hasContractLexicon = /\b(?:promesa|minuta|contrato|arrendamiento|arriendo|corretaje|consignaci[oó]n|otros[ií]|cl[aá]usula|audita|auditor[ií]a)\b/i.test(raw);
  if ((predialCheck.found && /\b(?:predial|factura\s+predial|impuesto\s+predial|shd)\b/i.test(raw)) || (/\bCHIP\s+AAA[0-9A-Z]{5,10}\b/i.test(raw) && !hasContractLexicon)) {
    return false;
  }

  const hasExplicitContractDocVerb =
    /\b(hazme|red[aá]cta(?:me)?|elabora(?:me)?|genera(?:me)?|prepara(?:me)?|crea(?:me)?|env[ií]a(?:me)?|dame|emite|necesito|quiero)\b.*\b(minuta|promesa\s+de\s+compraventa|contrato(?:\s+de)?\s+(?:arrendamiento|arriendo|corretaje|consignaci[oó]n|compraventa|vivienda|comercial)?|otros[ií]|cesi[oó]n\s+de\s+(?:contrato|leasing)|acta\s+de\s+entrega|pacto\s+de\s+retroventa|carta\s+de\s+(?:terminaci[oó]n|restituci[oó]n|presentaci[oó]n))\b/is.test(
      raw
    ) ||
    /\b(minuta\s+(?:de|para|personalizada)|otros[ií]\s+(?:de|para|modificatorio)|contrato\s+de\s+corretaje\s+vecy)\b/i.test(
      raw
    );

  const hasExplicitAuditIntent =
    /\b(?:(?:audita(?:me)?|revisa(?:me)?|analiza(?:me)?|eval[uú]a(?:me)?)\s+(?:este|esta|el|la|mi|las|los)?\s*(?:contrato|borrador(?:\s+de\s+contrato)?|promesa(?:\s+de\s+compraventa)?|otros[ií]|cl[aá]usula|cl[aá]usulas|minuta|riesgos?\s+contractual(?:es)?)|auditor[ií]a\s+(?:contractual|jur[ií]dica\s+(?:de|del)\s+(?:contrato|minuta|promesa)|de\s+cl[aá]usulas?|de\s+riesgos?\s+contractuales?)|riesgos?\s+contractual(?:es)?|cl[aá]usulas?\s+abusivas?|vac[ií]os?\s+(?:contractuales?|jur[ií]dicos?))\b/i.test(
      raw
    ) ||
    (/\b(?:audita(?:me)?|revisa(?:me)?|analiza(?:me)?)\b/i.test(raw) &&
      /\b(?:contrato|promesa|cl[aá]usula|otros[ií]|borrador)\b/i.test(raw) &&
      !/\b(?:aviso|anuncio|marketing|swap\s+test|\baida\b|\bicp\b|flyer|copy)\b/i.test(raw));

  const hasDraft = hasContractDraftMarkers(raw);

  // Evitar captura de auditorias de marketing inmobiliario (Swap Test / AIDA / avisos comerciales)
  if (
    /\b(?:aviso|anuncio|marketing|swap\s+test|\baida\b|\bicp\b|puntuaci[oó]n\s+global|flyer|copy\s+comercial)\b/i.test(
      raw
    ) &&
    !hasDraft
  ) {
    return false;
  }

  // Evitar captura de Propiedad Horizontal (Ley 675), RPH, Actas de Asamblea, RNT/Airbnb PH o Desenglobe/Englobe (Skill 6)
  if (
    /\b(?:propiedad\s+horizontal|ley\s*675|\brph\b|reglamento\s+(?:de\s+)?ph|asamblea\s+(?:general\s+)?de\s+copropietarios|coeficiente(?:s)?\s+de\s+copropiedad|expensas?\s+comunes?|desenglobe|englobe|subdivisi[oó]n\s+(?:de\s+|en\s+)?ph|vivienda\s+tur[ií]stica|\brnt\b)\b/i.test(
      raw
    ) &&
    !hasExplicitContractDocVerb &&
    !hasDraft
  ) {
    return false;
  }

  // Evitar captura de simulaciones puramente financieras/tributarias sin intencion contractual
  const looksPureFinTax =
    /\b(simula(?:r|dor|ci[oó]n)?|cuota\s+mensual|cap\s+rate|cash\s*on\s*cash|yield|roi|ganancia\s+ocasional|impuesto\s+de\s+timbre|retenci[oó]n\s+en\s+la\s+fuente)\b/i.test(
      raw
    ) &&
    !hasExplicitContractDocVerb &&
    !hasExplicitAuditIntent &&
    !hasDraft;
  if (looksPureFinTax) return false;

  // Evitar captura de liquidaciones notariales puras
  if (
    isExplicitNotarialLiquidationRequest(raw) &&
    !hasExplicitContractDocVerb &&
    !hasExplicitAuditIntent &&
    !hasDraft
  ) {
    return false;
  }

  if (isConceptualContractQuestion(raw)) return false;

  if (hasDraft || hasExplicitAuditIntent || hasExplicitContractDocVerb) {
    return true;
  }

  // Solicitud explicita con palabra "minuta" + en pdf / datos
  if (/\bminuta\b/i.test(raw) && /\b(pdf|arrendamiento|promesa|corretaje|otros[ií]|comercial|vivienda|retroventa|leasing)\b/i.test(raw)) {
    return true;
  }

  // Mensaje con adjunto (PDF o imagen) donde se menciona contrato/promesa/arriendo/clausula para revisar
  if (
    hasMedia &&
    /\b(contrato|minuta|promesa|arrendamiento|arriendo|otros[ií]|cl[aá]usula|borrador|corretaje|revisa|audita|analiza)\b/i.test(
      raw
    )
  ) {
    return true;
  }

  return false;
}

export function detectContractDocumentType(text: string): LegalDocumentType {
  const norm = normalizeText(text);

  if (/\botrosi\b|\bmodificacion\s+(?:de\s+)?(?:canon|plazo|contrato)\b|\bprorroga\s+contractual\b|\bterminacion\s+anticipada\b/.test(norm)) {
    if (/\bacta\s+de\s+entrega\b/.test(norm) && !/\botrosi\b/.test(norm)) {
      return "acta_entrega_inmueble";
    }
    return "otrosi_modificatorio";
  }
  if (/\bacta\s+de\s+(?:entrega|restitucion)\b|\bentrega\s+anticipada\s+e?\s*inventario\b/.test(norm)) {
    return "acta_entrega_inmueble";
  }
  if (/\bcesion\s+(?:de\s+)?(?:contrato\s+de\s+)?leasing\b/.test(norm)) {
    return "cesion_leasing";
  }
  if (/\bpacto\s+(?:de\s+)?retroventa\b|\bretroventa\b/.test(norm)) {
    return "pacto_retroventa";
  }
  if (/\bcorretaje\b|\bconsignacion\b|\bencargo\s+(?:de\s+)?(?:venta|arriendo|mediacion)\b|\bcomitente\b/.test(norm)) {
    return "contrato_corretaje";
  }
  if (/\bcarta\s+de\s+(?:terminacion|no\s+prorroga|preaviso)\b|\bpreaviso\s+(?:de\s+)?(?:terminacion|arriendo)\b/.test(norm)) {
    return "carta_terminacion_arriendo";
  }
  if (/\bcarta\s+(?:de\s+)?(?:restitucion|solicitud\s+de\s+entrega)\b/.test(norm)) {
    return "carta_restitucion_inmueble";
  }
  if (/\bcarta\s+de\s+presentacion\b|\bregistro\s+de\s+punta\b/.test(norm)) {
    return "carta_presentacion_cliente";
  }
  if (/\bpromesa\s+(?:de\s+)?compraventa\b|\bpromitente\s+(?:vendedor|comprador)\b|\bcompraventa\b/.test(norm)) {
    return "promesa_compraventa";
  }
  if (
    /\b(?:arrendamiento|arriendo|contrato)\b.*\b(?:local\s+comercial|comercial|bodega|oficina|consultorio|establecimiento)\b|\bart(?:iculo)?s?\.?\s*51[89]\b|\bart(?:iculo)?s?\.?\s*52[0-4]\b|\bprima\s+comercial\b|\brenovacion\s+comercial\b/.test(
      norm
    )
  ) {
    return "contrato_arrendamiento_comercial";
  }
  if (
    /\b(?:arrendamiento|arriendo|contrato)\b.*\b(?:vivienda|apartamento|casa|apto|habitacional|residencial)\b|\bley\s*820\b/.test(
      norm
    )
  ) {
    return "contrato_arrendamiento_vivienda";
  }
  if (/\b(?:arrendamiento|arriendo|canon)\b/.test(norm)) {
    return "contrato_arrendamiento_vivienda";
  }
  return "minuta_general";
}

function extractMoneyValueString(text: string): string | undefined {
  // Buscar valores tipo "$650.000.000", "650 millones", "$3.500.000", "3,2 millones"
  const millonesMatch = text.match(
    /(?:\$|valor|precio|canon|cuant[ií]a|venta|arriendo|por)?\s*\$?\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:millones?(?:\s+de\s+pesos)?|\bM\b|\bMM\b)/i
  );
  if (millonesMatch) {
    const numeric = Number(millonesMatch[1].replace(",", "."));
    if (Number.isFinite(numeric) && numeric > 0) {
      return formatCopAmount(numeric * 1_000_000);
    }
  }
  const fullCopMatch = text.match(/\$\s*(\d{1,3}(?:[.,]\d{3}){2,3})\b/);
  if (fullCopMatch) {
    const cleanNum = Number(fullCopMatch[1].replace(/[.,]/g, ""));
    if (Number.isFinite(cleanNum) && cleanNum >= 100_000) {
      return formatCopAmount(cleanNum);
    }
  }
  const plainCopMatch = text.match(
    /(?:valor|precio|canon|arriendo|venta)\s*(?:de|:)?\s*\$?\s*(\d{6,11})\b/i
  );
  if (plainCopMatch) {
    const cleanNum = Number(plainCopMatch[1]);
    if (Number.isFinite(cleanNum) && cleanNum >= 100_000) {
      return formatCopAmount(cleanNum);
    }
  }
  return undefined;
}

function cleanCapturedEntityName(rawName: string | undefined): string | undefined {
  if (!rawName) return undefined;
  const cleaned = rawName
    .replace(/\b(?:con\s+)?(?:cc|c\.c\.?|c[eé]dula|nit|identificad[oa]\s+con)\b.*$/i, "")
    .replace(/[.,;:\-()]+$/g, "")
    .trim();
  if (cleaned.length < 3 || cleaned.length > 90) return undefined;
  return cleaned;
}

/**
 * Extrae parametros estructurados desde lenguaje natural del usuario para personalizar una minuta o detectar auditoria.
 */
export function parseContractGenerationData(
  text: string,
  hasMedia = false
): ParsedContractRequest {
  const raw = String(text || "").trim();
  const tipoDocumento = detectContractDocumentType(raw);

  const hasExplicitDraftGenerationVerb =
    /\b(hazme|red[aá]cta(?:me)?|elabora(?:me)?|genera(?:me)?|prepara(?:me)?|crea(?:me)?|emite)\b/i.test(raw);
  const hasExplicitAuditVerb =
    /\b(?:(?:audita(?:me)?|revisa(?:me)?|analiza(?:me)?|eval[uú]a(?:me)?)\s+(?:este|esta|el|la|mi|las|los)?\s*(?:contrato|borrador(?:\s+de\s+contrato)?|promesa(?:\s+de\s+compraventa)?|otros[ií]|cl[aá]usula|cl[aá]usulas|minuta|riesgos?\s+contractual(?:es)?)|auditor[ií]a\s+(?:contractual|jur[ií]dica|de\s+cl[aá]usulas?|de\s+riesgos?)|riesgos?\s+contractual(?:es)?|cl[aá]usulas?\s+abusivas?|vac[ií]os?\s+(?:contractuales?|jur[ií]dicos?))\b/i.test(
      raw
    ) ||
    (/\b(?:audita(?:me)?|revisa(?:me)?|analiza(?:me)?)\b/i.test(raw) &&
      /\b(?:contrato|promesa|cl[aá]usula|otros[ií]|borrador)\b/i.test(raw));
  const hasNumberedOrTitledClauses =
    /\bcl[aá]usula\s+(?:primera|segunda|tercera|\d+)\b|\bentre\s+los\s+suscritos\b/i.test(raw);

  const isAuditMode =
    hasExplicitAuditVerb ||
    hasNumberedOrTitledClauses ||
    (!hasExplicitDraftGenerationVerb && hasContractDraftMarkers(raw)) ||
    (hasMedia && !hasExplicitDraftGenerationVerb);

  const isGuidanceOnly =
    !isAuditMode &&
    /^(?:jania\s+)?(?:qu[eé]\s+datos|qu[eé]\s+informaci[oó]n|qu[eé]\s+requisitos|c[oó]mo\s+(?:me\s+haces|pido|solicito))\s+.*(?:minuta|contrato|promesa|otros[ií])/i.test(
      raw
    );

  // Partes
  let nombreRemitente: string | undefined;
  let documentoRemitente: string | undefined;
  let nombreDestinatario: string | undefined;
  let documentoDestinatario: string | undefined;

  const partAMatch = raw.match(
    /(?:promitente\s+vendedor(?:a)?|vendedor(?:a)?|arrendador(?:a)?|comitente|propietario(?:a)?|cedente|parte\s*a)\s*[:=\-]?\s*([A-ZÁÉÍÓÚÑa-záéíóúñ.\s]{3,70}?)(?:\s*(?:con\s+)?(?:cc|c\.c\.?|c[eé]dula|nit|id)?\s*[:#.]?\s*([\d.\-]{5,16}))?(?=\s*(?:,|;|\n|\by\b|promitente\s+comprador|comprador|arrendatario|inquilino|corredor|cesionario|inmueble|direcci[oó]n|matr[ií]cula|chip|$))/i
  );
  if (partAMatch) {
    nombreRemitente = cleanCapturedEntityName(partAMatch[1]);
    if (partAMatch[2]) documentoRemitente = partAMatch[2].trim();
  }

  const partBMatch = raw.match(
    /(?:promitente\s+comprador(?:a)?|comprador(?:a)?|arrendatario(?:a)?|inquilino(?:a)?|corredor(?:a)?|cesionario(?:a)?|parte\s*b)\s*[:=\-]?\s*([A-ZÁÉÍÓÚÑa-záéíóúñ.\s]{3,70}?)(?:\s*(?:con\s+)?(?:cc|c\.c\.?|c[eé]dula|nit|id)?\s*[:#.]?\s*([\d.\-]{5,16}))?(?=\s*(?:,|;|\n|inmueble|direcci[oó]n|matr[ií]cula|chip|valor|precio|canon|plazo|$))/i
  );
  if (partBMatch) {
    nombreDestinatario = cleanCapturedEntityName(partBMatch[1]);
    if (partBMatch[2]) documentoDestinatario = partBMatch[2].trim();
  }

  // Fallback "entre X (CC ...) y Y (CC ...)"
  if (!nombreRemitente && !nombreDestinatario) {
    const entreMatch = raw.match(
      /\bentre\s+([A-ZÁÉÍÓÚÑa-záéíóúñ.\s]{3,55}?)(?:\s*(?:\(|con\s+)?(?:cc|c\.c\.?|nit)\s*[:#.]?\s*([\d.\-]{5,16})\)?)?\s+y\s+([A-ZÁÉÍÓÚÑa-záéíóúñ.\s]{3,55}?)(?:\s*(?:\(|con\s+)?(?:cc|c\.c\.?|nit)\s*[:#.]?\s*([\d.\-]{5,16})\)?)?(?=\s*(?:,|;|\n|sobre|inmueble|para|$))/i
    );
    if (entreMatch) {
      nombreRemitente = cleanCapturedEntityName(entreMatch[1]);
      if (entreMatch[2]) documentoRemitente = entreMatch[2].trim();
      nombreDestinatario = cleanCapturedEntityName(entreMatch[3]);
      if (entreMatch[4]) documentoDestinatario = entreMatch[4].trim();
    }
  }

  // Identificaciones adicionales sueltas si quedaron sin asignar
  const idMatches = Array.from(
    raw.matchAll(/\b(?:cc|c\.c\.?|c[eé]dula|nit)\s*(?:no\.?|n[uú]mero|#|:)?\s*([\d.\-]{6,15})\b/gi)
  ).map((m) => m[1]);
  if (!documentoRemitente && idMatches[0]) documentoRemitente = idMatches[0];
  if (!documentoDestinatario && idMatches[1]) documentoDestinatario = idMatches[1];

  // Matricula y CHIP
  const matriculaMatch = raw.match(
    /\bmatr[ií]cula(?:\s+inmobiliaria)?(?:\s*(?:no\.?|n[uú]mero|#|:))?\s*([0-9]{2,3}[A-Z]?-[0-9]{3,10}|[0-9]{5,10})\b/i
  );
  const matriculaInmobiliaria = matriculaMatch ? matriculaMatch[1].toUpperCase() : undefined;

  const chipMatch = raw.match(/\b(AAA[0-9]{4}[A-Z]{4})\b/i);
  const chipCatastral = chipMatch ? chipMatch[1].toUpperCase() : undefined;

  // Direccion
  let direccionInmueble: string | undefined;
  const dirExplicit = raw.match(
    /(?:direcci[oó]n|ubicado\s+en|inmueble\s+en|local\s+en|apartamento\s+en|casa\s+en)\s*[:=]?\s*([^,\n;]{5,80}?)(?=\s*(?:,|;|\n|matr[ií]cula|chip|valor|precio|canon|en\s+la\s+ciudad|ciudad|$))/i
  );
  if (dirExplicit) {
    direccionInmueble = dirExplicit[1].trim();
  } else {
    const streetMatch = raw.match(
      /\b((?:calle|cll?|carrera|cra|kr|avenida|av|transversal|tv|diagonal|dg)\s+\d+[a-z]?(?:\s*(?:#|no\.?)\s*\d+[a-z]?\s*-\s*\d+[a-z]?)?[^,\n;]{0,40})/i
    );
    if (streetMatch) {
      direccionInmueble = streetMatch[1].trim();
    }
  }

  // Ciudad
  const cityMatch = raw.match(
    /\b(bogot[aá](?:\s+d\.?c\.?)?|medell[ií]n|cali|barranquilla|cartagena|ch[ií]a|cajic[aá]|sop[oó]|envigado|sabaneta|bucaramanga|pereira|manizales|santa\s+marta|villavicencio|ibagu[eé]|neiva|c[uú]cuta)\b/i
  );
  const ciudad = cityMatch ? cityMatch[1].trim() : undefined;

  // Valor negocio o canon
  const valorNegocioOCanon = extractMoneyValueString(raw);

  // Plazo en meses
  let plazoMeses: number | undefined;
  const plazoMesesMatch = raw.match(/\bplazo\s*(?:de|:)?\s*(\d{1,3})\s*mes(?:es)?\b|\b(\d{1,3})\s*meses\b/i);
  if (plazoMesesMatch) {
    plazoMeses = Number(plazoMesesMatch[1] || plazoMesesMatch[2]);
  } else {
    const plazoAnosMatch = raw.match(/\bplazo\s*(?:de|:)?\s*(\d{1,2})\s*a[nñ]os?\b|\b(\d{1,2})\s*a[nñ]os?\b/i);
    if (plazoAnosMatch && /\b(plazo|duraci[oó]n|t[eé]rmino|contrato)\b/i.test(raw)) {
      plazoMeses = Number(plazoAnosMatch[1] || plazoAnosMatch[2]) * 12;
    }
  }

  // Forma de pago
  const paymentFragments: string[] = [];
  if (/\bcr[eé]dito\s+hipotecario\b/i.test(raw)) paymentFragments.push("Credito hipotecario aprobado");
  if (/\bfna\b|\bfondo\s+nacional\s+del\s+ahorro\b/i.test(raw)) {
    paymentFragments.push("Financiacion Fondo Nacional del Ahorro (FNA)");
  }
  if (/\bleasing\s+habitacional\b/i.test(raw)) paymentFragments.push("Desembolso mediante Leasing Habitacional");
  if (/\brecursos\s+propios\b|\bcontado\b|\befectivo\b|\btransferencia\b/i.test(raw)) {
    paymentFragments.push("Recursos propios / transferencia bancaria verificada");
  }
  const formaPagoExplicit = raw.match(/forma\s+de\s+pago\s*[:=\-]?\s*([^\n.;]{5,140})/i);
  const formaPagoDetalle = formaPagoExplicit
    ? formaPagoExplicit[1].trim()
    : paymentFragments.length > 0
    ? paymentFragments.join(" + ")
    : undefined;

  // Tipo de arras / clausula penal
  let tipoArras: "confirmatorias" | "retractatorias" | "penal" | undefined;
  if (/\barras\s+retractatorias\b|\barras\s+penitenciales\b/i.test(raw)) {
    tipoArras = "retractatorias";
  } else if (/\barras\s+confirmatorias\b/i.test(raw)) {
    tipoArras = "confirmatorias";
  } else if (/\bcl[aá]usula\s+penal\b/i.test(raw)) {
    tipoArras = "penal";
  } else if (/\barras\b/i.test(raw)) {
    tipoArras = "confirmatorias";
  }

  const arrasValMatch = raw.match(
    /(?:arras|cl[aá]usula\s+penal|penalidad)\s*(?:de|del|por|:)?\s*(?:\w+\s+){0,2}?(\d{1,2}\s*%|\$\s*[\d.,]+|\d{1,3}\s+millones|\d{1,2}\s+c[aá]nones)/i
  );
  const valorArrasOPenalidad = arrasValMatch ? arrasValMatch[1].trim() : undefined;

  // Notaria / fechas
  const notariaMatch = raw.match(/\b(notar[ií]a\s+\d{1,3}(?:\s+de\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+)?)/i);
  const notaria = notariaMatch ? notariaMatch[1].trim() : undefined;

  const fechaEscMatch = raw.match(
    /(?:escritura(?:ci[oó]n)?|firma\s+de\s+escritura)\s*(?:el|para\s+el|el\s+d[ií]a|:)?\s*(\d{1,2}\s+de\s+[a-z]+\s+de\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i
  );
  const fechaEscritura = fechaEscMatch ? fechaEscMatch[1].trim() : undefined;

  const fechaEntMatch = raw.match(
    /(?:entrega(?:\s+material|\s+anticipada)?|inicio)\s*(?:el|para\s+el|el\s+d[ií]a|a\s+partir\s+del|:)?\s*(\d{1,2}\s+de\s+[a-z]+\s+de\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i
  );
  const fechaEntrega = fechaEntMatch ? fechaEntMatch[1].trim() : undefined;

  // Administracion y comision
  const adminMatch = raw.match(/administraci[oó]n(?:\s+(?:mensual|del?\s+(?:conjunto|edificio)))?\s*(?:de|vale|cuesta|es\s+de|:|=)?\s*\$?\s*([\d.,]+(?:\s*(?:mil|millones))?)/i);
  const canonAdministracion = adminMatch ? `$${adminMatch[1].trim()} COP` : undefined;

  // Si en contrato de corretaje o arriendo el total informado incluye administracion, calcular el canon neto sin administracion
  let effectiveValorNegocioOCanon = valorNegocioOCanon;
  const includesAdminInRental =
    /\b(?:arriendo|arrendamiento|canon)\b/i.test(raw) &&
    /(?:inclu[iy](?:e|endo)\s+(?:la\s+)?(?:administraci[oó]n|admon)|inclu[ií]d[oa]\s+(?:(?:el\s+valor\s+de\s+)?(?:la\s+)?)?(?:administraci[oó]n|admon)|con\s+(?:la\s+)?(?:administraci[oó]n|admon)\s+incluida|(?:administraci[oó]n|admon)\s+incluida)/i.test(
      raw
    );
  const parseRoughCop = (val?: string): number | undefined => {
    if (!val) return undefined;
    const mMill = val.match(/(\d+(?:[.,]\d{1,2})?)\s*mill/i);
    if (mMill) return Math.round(Number(mMill[1].replace(",", ".")) * 1_000_000);
    const mMil = val.match(/(\d+(?:[.,]\d{1,2})?)\s*mil/i);
    if (mMil) return Math.round(Number(mMil[1].replace(",", ".")) * 1_000);
    const digits = Number(val.replace(/[^\d]/g, ""));
    return Number.isFinite(digits) && digits >= 50_000 ? digits : undefined;
  };
  const totalRentalNum = parseRoughCop(valorNegocioOCanon);
  const adminFeeNum = parseRoughCop(canonAdministracion);

  const comisionMatch = raw.match(
    /comisi[oó]n\s*(?:del|de|:)?\s*(\d{1,2}(?:[.,]\d)?\s*%|\d\s+c[aá]non(?:es)?|un\s+c[aá]non)/i
  );
  const porcentajeComision = comisionMatch ? comisionMatch[1].trim() : undefined;

  // Clausulas especiales (condicion suspensiva, entrega anticipada, cesion, etc.)
  const specialNotes: string[] = [];
  if (includesAdminInRental && totalRentalNum && adminFeeNum && totalRentalNum > adminFeeNum) {
    const netCanon = totalRentalNum - adminFeeNum;
    effectiveValorNegocioOCanon = `${formatCopAmount(netCanon)} (canon neto sin administracion; total ${formatCopAmount(totalRentalNum)} - admon ${formatCopAmount(adminFeeNum)})`;
    specialNotes.push(
      `Liquidacion de honorarios en arriendo sobre canon neto sin administracion: ${formatCopAmount(totalRentalNum)} total menos ${formatCopAmount(adminFeeNum)} de administracion = ${formatCopAmount(netCanon)} netos.`
    );
  }
  if (/\b(?:entrega\s+anticipada|terminaci[oó]n\s+anticipada|sin\s+penalidad)\b/i.test(raw)) {
    specialNotes.push("Acuerdo expreso sobre entrega anticipada / terminacion sin penalidad adicional previo paz y salvo.");
  }
  if (/\b(?:mascotas|pet\s*friendly)\b/i.test(raw)) {
    specialNotes.push("Autorizacion expresa para tenencia responsable de mascota domestica sin deterioro del inmueble.");
  }
  if (/\bcondici[oó]n\s+suspensiva\b|\bestudio\s+de\s+t[ií]tulos\b/i.test(raw)) {
    specialNotes.push("Condicion suspensiva expresa sujeta a Estudio de Titulos SNR favorable de 10 y 20 anos.");
  }
  if (/\b50\s*\/\s*50\b|\bgastos\s+notariales\b/i.test(raw)) {
    specialNotes.push("Distribucion de gastos notariales por mitades (50/50) y cancelacion de gravamenes 100% vendedor.");
  }

  const params: LegalDocumentPdfParams = {
    tipoDocumento,
    nombreRemitente,
    documentoRemitente,
    nombreDestinatario,
    documentoDestinatario,
    direccionInmueble,
    ciudad,
    valorNegocioOCanon: effectiveValorNegocioOCanon,
    matriculaInmobiliaria,
    chipCatastral,
    plazoMeses,
    fechaEntrega,
    fechaEscritura,
    notaria,
    formaPagoDetalle,
    tipoArras,
    valorArrasOPenalidad,
    canonAdministracion,
    porcentajeComision,
    tipoOtrosi:
      tipoDocumento === "otrosi_modificatorio"
        ? /\bcesi[oó]n\b/i.test(raw)
          ? "OTROSI DE CESION CONTRACTUAL"
          : /\bentrega\s+anticipada\b/i.test(raw)
          ? "OTROSI DE TERMINACION Y ENTREGA ANTICIPADA"
          : "OTROSI MODIFICATORIO DE CONTRATO"
        : undefined,
    conCondicionEstudioTitulos: true,
    clausulasEspeciales: specialNotes.length > 0 ? specialNotes.join(" ") : undefined
  };

  const hasConcreteData = Boolean(
    nombreRemitente ||
      nombreDestinatario ||
      documentoRemitente ||
      documentoDestinatario ||
      matriculaInmobiliaria ||
      chipCatastral ||
      direccionInmueble ||
      valorNegocioOCanon ||
      plazoMeses ||
      formaPagoDetalle ||
      notaria ||
      valorArrasOPenalidad
  );

  const missingHintFields: string[] = [];
  if (!nombreRemitente || !nombreDestinatario) missingHintFields.push("Nombres completos y CC/NIT de ambas partes");
  if (!direccionInmueble && !matriculaInmobiliaria) missingHintFields.push("Dirección exacta y Matrícula Inmobiliaria SNR / CHIP");
  if (!valorNegocioOCanon) missingHintFields.push("Precio total de venta o canon mensual");
  if (tipoDocumento === "promesa_compraventa" && (!notaria || !fechaEscritura)) {
    missingHintFields.push("Fecha, hora y Notaría exacta de escrituración (Art. 1611 C.C.)");
  }

  return {
    mode: isGuidanceOnly ? "guidance" : isAuditMode ? "audit" : "generate",
    tipoDocumento,
    params,
    hasConcreteData,
    missingHintFields
  };
}

/**
 * Auditoria deterministica de clausulas y riesgos contractuales bajo normativa colombiana ($0 COP).
 */
export function auditContractDraftText(
  draftText: string,
  options?: { requesterName?: string; hintType?: LegalDocumentType }
): ContractAuditReport {
  const raw = String(draftText || "").trim();
  const norm = normalizeText(raw);
  const detectedType = options?.hintType || detectContractDocumentType(raw);

  const findings: ContractAuditFinding[] = [];
  const missingClauses: string[] = [];

  const isVivienda =
    detectedType === "contrato_arrendamiento_vivienda" ||
    (/\b(arrendamiento|arriendo|canon|arrendatario)\b/.test(norm) &&
      /\b(vivienda|apartamento|casa|ley\s*820|familiar|residencial)\b/.test(norm) &&
      !/\blocal\s+comercial\b/.test(norm));

  const isComercial =
    detectedType === "contrato_arrendamiento_comercial" ||
    /\b(local\s+comercial|establecimiento\s+de\s+comercio|art(?:iculo)?s?\.?\s*51[89]|52[0-4]|prima\s+comercial)\b/.test(
      norm
    );

  const isPromesa =
    detectedType === "promesa_compraventa" ||
    /\b(promesa\s+(?:de\s+)?compraventa|promitente\s+vendedor|promitente\s+comprador|escritura\s+publica)\b/.test(
      norm
    );

  const isCorretaje =
    detectedType === "contrato_corretaje" ||
    /\b(corretaje|consignacion\s+inmobiliaria|comitente|corredor)\b/.test(norm);

  const isOtrosiOrEntrega =
    detectedType === "otrosi_modificatorio" ||
    detectedType === "acta_entrega_inmueble" ||
    /\b(otrosi|entrega\s+anticipada|terminacion\s+anticipada|cesion\s+de\s+(?:contrato|posicion))\b/.test(
      norm
    );

  // 1) Reglas imperativas de Vivienda Urbana (Ley 820 de 2003)
  if (isVivienda) {
    if (
      /\b(deposito|garantia\s+en\s+efectivo|fianza\s+en\s+dinero|caucion\s+real)\b/.test(norm) &&
      !/\bno\s+(?:se\s+)?exig(?:e|en)\s+deposito|prohibicion\s+de\s+depositos\b/.test(norm)
    ) {
      findings.push({
        severidad: "ALTA",
        titulo: "Deposito en efectivo o caucion real prohibida en vivienda urbana",
        hallazgo:
          "El borrador exige o contempla un deposito en dinero efectivo o caucion real para garantizar obligaciones de vivienda.",
        fundamentoLegal:
          "Articulo 16 de la Ley 820 de 2003 (prohibe expresamente exigir depositos en dinero efectivo o cauciones reales en arrendamiento de vivienda urbana).",
        redaccionSugerida:
          "Suprimir todo deposito en efectivo y pactar: 'En acatamiento del Art. 16 de la Ley 820 de 2003, no se exigen depositos en dinero efectivo; la garantia se constituye mediante poliza colectiva de arrendamiento o codeudor solidario solvente.'"
      });
    }

    if (
      /(?:reajuste|incremento|aumento).{0,55}(?:ipc\s*\+|smmlv|s\.m\.m\.l\.v|salario\s+minimo|uvt|\b(?:9|10|12|15|20)\s*%)/.test(
        norm
      )
    ) {
      findings.push({
        severidad: "ALTA",
        titulo: "Reajuste anual superior al tope legal del IPC",
        hallazgo:
          "Se estipula incremento del canon ligado al SMMLV, IPC + puntos adicionales o porcentaje fijo superior al IPC DANE.",
        fundamentoLegal:
          "Articulo 20 de la Ley 820 de 2003 (el reajuste anual en vivienda urbana no puede exceder el 100% del IPC del ano calendario inmediatamente anterior).",
        redaccionSugerida:
          "'Vencidos cada doce (12) meses de ejecucion, el canon podra incrementarse hasta en un porcentaje equivalente al 100% del IPC certificado por el DANE para el ano anterior (Art. 20 Ley 820 de 2003).'"
      });
    }

    if (
      /(?:terminacion\s+unilateral\s+sin\s+indemnizacion|preaviso\s+(?:de\s+)?(?:15|30)\s+dias|1\s+mes\s+de\s+preaviso|desalojo\s+inmediato\s+sin\s+proceso|restitucion\s+en\s+24\s+horas)/.test(
        norm
      )
    ) {
      findings.push({
        severidad: "ALTA",
        titulo: "Preaviso inferior a 3 meses o clausula de desalojo extrajudicial ilegal",
        hallazgo:
          "El texto pretende reducir el preaviso legal a 15/30 dias, suprimir la indemnizacion o pactar desalojo sin proceso judicial.",
        fundamentoLegal:
          "Articulos 22 a 25 de la Ley 820 de 2003 (preaviso minimo de 3 meses e indemnizacion) y Articulo 384 del C.G.P. (restitucion requiere proceso judicial o conciliacion).",
        redaccionSugerida:
          "'La no prorroga o terminacion anticipada se sujetara estrictamente al preaviso escrito minimo de tres (3) meses y causales de los Arts. 22 a 25 de la Ley 820 de 2003.'"
      });
    }

    if (
      /(?:clausula\s+penal|multa).{0,50}(?:[4-9]|1\d)\s*(?:canones|meses)|(?:30|40|50|100)\s*%/.test(norm)
    ) {
      findings.push({
        severidad: "MEDIA",
        titulo: "Clausula penal excesiva o desproporcionada",
        hallazgo:
          "La multa fijada supera los 3 canones mensuales habituales, exponiendose a reduccion judicial por lesividad.",
        fundamentoLegal:
          "Articulo 1601 del Codigo Civil (reduccion de pena enorme) y Arts. 22-24 Ley 820 de 2003.",
        redaccionSugerida:
          "'En caso de incumplimiento culpable se causara una clausula penal equivalente a tres (3) canones mensuales de arrendamiento vigentes.'"
      });
    }

    if (!/\binventario\b|\bacta\s+de\s+entrega\b/.test(norm)) {
      missingClauses.push("Acta de Entrega e Inventario Fisico fotografico anexo al inicio y restitucion.");
    }
    if (!/\bservicios\s+publicos\b/.test(norm)) {
      missingClauses.push("Responsabilidad expresa de servicios publicos domiciliarios y paz y salvo final.");
    }
  }

  // 2) Reglas imperativas de Local Comercial (Arts. 518-524 C.Co.)
  if (isComercial) {
    if (
      /renuncia.{0,50}(?:renovacion|518)|sin\s+derecho\s+a\s+renovacion|no\s+aplica.{0,30}518|no\s+habra\s+renovacion\s+aun\s+despues\s+de\s+2\s+anos/.test(
        norm
      )
    ) {
      findings.push({
        severidad: "ALTA",
        titulo: "Pacto ineficaz contra el derecho de renovacion comercial",
        hallazgo:
          "El contrato pretende que el arrendatario renuncie anticipadamente al derecho de renovacion tras 2 anos de ocupacion.",
        fundamentoLegal:
          "Articulos 518 y 524 del Codigo de Comercio: las normas de proteccion comercial son de orden publico; cualquier estipulacion en contrario es INEFICAZ DE PLENO DERECHO.",
        redaccionSugerida:
          "'Cumplidos dos (2) anos consecutivos con un mismo establecimiento mercantil, operara el derecho de renovacion en los terminos imperativos de los Arts. 518 a 524 del Codigo de Comercio.'"
      });
    }

    if (
      /(?:desahucio|preaviso).{0,40}(?:1|2|3|4|5)\s+mes|(?:desahucio|preaviso).{0,30}(?:30|60|90)\s+dias/.test(
        norm
      )
    ) {
      findings.push({
        severidad: "ALTA",
        titulo: "Desahucio comercial inferior al minimo legal de 6 meses",
        hallazgo:
          "Se establece un preaviso/desahucio menor a seis (6) meses para la restitucion por causales legales comerciales.",
        fundamentoLegal:
          "Articulo 520 del Codigo de Comercio (desahucio obligatorio con no menos de seis [6] meses de anticipacion).",
        redaccionSugerida:
          "'En los casos del Art. 518 nums. 2 y 3 C.Co., el arrendador debera desahuciar al arrendatario con una anticipacion NO menor a seis (6) meses a la fecha de terminacion.'"
      });
    }

    if (!/\biva\b|\bimpuesto\s+sobre\s+las\s+ventas\b/.test(norm)) {
      missingClauses.push("Definicion expresa del regimen de IVA comercial sobre el canon (Estatuto Tributario).");
    }
    if (!/\buso\s+de\s+suelo\b|\bpot\b/.test(norm)) {
      missingClauses.push("Verificacion previa de uso de suelo POT y destinacion mercantil autorizada.");
    }
    if (!/\b523\b|\bestablecimiento\s+de\s+comercio\b|\bcesion\b/.test(norm)) {
      missingClauses.push("Regulacion de subarriendo y cesion en bloque de establecimiento (Art. 523 C.Co.).");
    }
  }

  // 3) Reglas de validez de Promesa de Compraventa (Art. 1611 C.C. / Art. 89 Ley 153/1887)
  if (isPromesa) {
    if (!/\bnotaria\b/.test(norm) || !/\b(?:hora|fecha|dia)\b/.test(norm)) {
      findings.push({
        severidad: "ALTA",
        titulo: "Falta de determinacion de fecha, hora y Notaria exacta (Riesgo de Nulidad Absoluta)",
        hallazgo:
          "La promesa no fija de forma inequivoca la fecha, hora y Notaria especifica para otorgar la escritura publica definitiva.",
        fundamentoLegal:
          "Articulo 1611 numeral 3 del Codigo Civil y Articulo 89 de la Ley 153 de 1887: la promesa debe fijar un plazo o condicion que determine la epoca de celebracion del contrato prometido so pena de nulidad absoluta.",
        redaccionSugerida:
          "'La Escritura Publica de Compraventa se otorgara el dia [FECHA EXACTA] a las [HORA] en la Notaria [NUMERO] del Circulo de [CIUDAD].'"
      });
    }

    if (/\barras\b/.test(norm) && !/\b(?:confirmatorias|retractatorias|penitenciales)\b/.test(norm)) {
      findings.push({
        severidad: "MEDIA",
        titulo: "Ambiguedad juridica en la naturaleza de las arras",
        hallazgo:
          "Se menciona la palabra 'arras' sin precisar si son confirmatorias de ejecucion o retractatorias/penitenciales.",
        fundamentoLegal:
          "Articulos 1859 a 1861 del Codigo Civil: si no se especifica el caracter confirmatorio, la ley tiende a presumir facultad de retracto (perdida/devolucion doblada).",
        redaccionSugerida:
          "'ARRAS CONFIRMATORIAS DE EJECUCION (ART. 1861 C.C.): Las partes pactan expresamente arras confirmatorias imputables al precio, sin derecho a retracto unilateral, acompanadas de clausula penal ejecutiva del 10% (Art. 1592 C.C.).'"
      });
    }

    if (!/\bcondicion\s+suspensiva\b|\bestudio\s+de\s+titulos\b|\bfalsa\s+tradicion\b/.test(norm)) {
      findings.push({
        severidad: "MEDIA",
        titulo: "Ausencia de condicion suspensiva por Estudio de Titulos SNR favorable",
        hallazgo:
          "No se subordina el perfeccionamiento/desembolso a la verificacion limpia del Certificado de Tradicion y Libertad (10 y 20 anos).",
        fundamentoLegal:
          "Articulos 1530 y 1536 del Codigo Civil (obligaciones condicionales) y prevencion contra falsa tradicion o embargos.",
        redaccionSugerida:
          "'CONDICION SUSPENSIVA DE ESTUDIO DE TITULOS: Los desembolsos quedan condicionados a estudio favorable del CTL SNR (10 y 20 anos) sin falsa tradicion, embargos ni gravamenes no saneables; de lo contrario el comprador podra resolver sin penalidad.'"
      });
    }

    if (
      /(?:asume\s+todos\s+los\s+embargos|sin\s+responsabilidad\s+por\s+eviccion|renuncia\s+al\s+saneamiento)/.test(
        norm
      )
    ) {
      findings.push({
        severidad: "ALTA",
        titulo: "Exoneracion abusiva de saneamiento por eviccion y gravamenes",
        hallazgo:
          "Se pretende eximir al vendedor del saneamiento por eviccion o trasladar embargos/litigios al comprador.",
        fundamentoLegal:
          "Articulos 1893 a 1909 del Codigo Civil (obligacion de saneamiento y nulidad de renuncia ante mala fe del vendedor).",
        redaccionSugerida:
          "'El PROMITENTE VENDEDOR garantiza tradicion limpia y responde legalmente por el saneamiento por eviccion y vicios redhibitorios conforme a los Arts. 1880 y 1893 C.C.'"
      });
    }

    if (!/\bmatricula\b|\bfolio\b|\blinderos\b/.test(norm)) {
      missingClauses.push("Individualizacion registral completa: Folio de Matricula Inmobiliaria SNR, CHIP y remision a linderos.");
    }
    if (!/\bley\s*258\b|\bafectacion\s+a\s+vivienda\b|\bpatrimonio\s+de\s+familia\b/.test(norm)) {
      missingClauses.push("Declaracion y levantamiento de Afectacion a Vivienda Familiar (Ley 258/1996) o Patrimonio de Familia (Ley 70/1931).");
    }
    if (!/\bgastos\s+notariales\b|\bretencion\b|\bregistro\b/.test(norm)) {
      missingClauses.push("Distribucion clara de gastos notariales (50/50), retencion en la fuente (vendedor 1%) y beneficencia/registro ORIP (comprador).");
    }
  }

  // 4) Corretaje VECY (Arts. 1340-1346 C.Co.)
  if (isCorretaje) {
    if (/(?:cobro\s+anticipado|tarifa\s+de\s+publicacion|fee\s+inicial|pago\s+por\s+promocion)/.test(norm)) {
      findings.push({
        severidad: "MEDIA",
        titulo: "Cobro anticipado por publicacion ajeno al corretaje a exito VECY",
        hallazgo:
          "El borrador contempla cobros por publicacion o pauta previa antes del cierre de la operacion.",
        fundamentoLegal:
          "Articulo 1341 del Codigo de Comercio y Doctrina VECY BIENES RAICES (comision exclusivamente a exito: 3% venta / 1 canon neto de arriendo sin incluir administracion, $0 COP por publicacion).",
        redaccionSugerida:
          "'El corredor no cobrara suma alguna por publicacion o promocion previa; los honorarios (3% venta o 1 canon neto de arriendo sin incluir administracion) se causan unicamente a exito al cerrarse el negocio.'"
      });
    }
    if (!/\b12\s+meses\b|\breserva\b/.test(norm)) {
      missingClauses.push("Clausula de reserva de clientes presentados durante 12 meses para evitar elusion de honorarios.");
    }
  }

  // 5) Otrosi / Entrega anticipada / Cesion
  if (isOtrosiOrEntrega) {
    if (!/\bpaz\s+y\s+salvo\b|\bservicios\s+publicos\b/.test(norm)) {
      findings.push({
        severidad: "MEDIA",
        titulo: "Entrega anticipada / Otrosi sin condicion de paz y salvo de servicios y administracion",
        hallazgo:
          "Falta estipular verificacion de lectura de medidores y paz y salvo de administracion PH antes de liberar obligaciones.",
        fundamentoLegal:
          "Articulo 2005 del Codigo Civil y Ley 820 de 2003.",
        redaccionSugerida:
          "'La recepcion del inmueble mediante entrega anticipada se formalizara con Acta de Inventario, lectura final de contadores y paz y salvo de servicios publicos y administracion PH.'"
      });
    }
  }

  if (findings.length === 0) {
    findings.push({
      severidad: "OK",
      titulo: "No se detectaron clausulas abiertamente contrarias a normas imperativas en el texto analizado",
      hallazgo:
        "Las estipulaciones suministradas no presentan violaciones flagrantes a la Ley 820 de 2003 ni al Codigo de Comercio en el fragmento evaluado.",
      fundamentoLegal: "Control preventivo VECY sobre normas de orden publico civil y comercial colombiano.",
      redaccionSugerida:
        "Mantener el equilibrio obligacional e incorporar todas las clausulas esenciales faltantes listadas abajo antes de firma definitiva."
    });
  }

  const highCount = findings.filter((f) => f.severidad === "ALTA").length;
  const medCount = findings.filter((f) => f.severidad === "MEDIA").length;
  const riskLevel: "VERDE" | "AMARILLO" | "ROJO" =
    highCount > 0 ? "ROJO" : medCount > 0 ? "AMARILLO" : "VERDE";

  const contractLabel = isPromesa
    ? "PROMESA DE COMPRAVENTA"
    : isComercial
    ? "ARRENDAMIENTO LOCAL COMERCIAL"
    : isVivienda
    ? "ARRENDAMIENTO VIVIENDA URBANA"
    : isCorretaje
    ? "CONTRATO DE CORRETAJE"
    : isOtrosiOrEntrega
    ? "OTROSI / ENTREGA ANTICIPADA"
    : "CONTRATO INMOBILIARIO";

  const normativeRegime = isPromesa
    ? "Codigo Civil (Arts. 1592, 1611, 1859-1861, 1893), Ley 153/1887 Art. 89 y C.G.P."
    : isComercial
    ? "Codigo de Comercio Colombiano (Arts. 518 a 524 y Art. 384 C.G.P.)"
    : isVivienda
    ? "Ley 820 de 2003 (Vivienda Urbana), Codigo Civil y C.G.P."
    : isCorretaje
    ? "Codigo de Comercio (Arts. 1340 a 1346) y Doctrina Colaborativa VECY"
    : "Legislacion Civil, Comercial e Inmobiliaria de Colombia";

  const riskHeadline =
    riskLevel === "ROJO"
      ? `${highCount} riesgo(s) critico(s) detectado(s) — corregir antes de firmar.`
      : riskLevel === "AMARILLO"
      ? `${medCount} ajuste(s) preventivo(s) recomendado(s) y ${missingClauses.length} vacio(s) por blindar.`
      : "Estructura equilibrada; verificar datos registrales y completar anexos.";

  return {
    contractTypeDetected: detectedType,
    contractLabel,
    normativeRegime,
    riskLevel,
    riskHeadline,
    summaryPoints: [
      `Tipo contractual identificado: ${contractLabel}`,
      `Hallazgos criticos (ALTA): ${highCount} | Ajustes preventivos (MEDIA): ${medCount} | Vacios detectados: ${missingClauses.length}`,
      "Analisis automatizado preventivo bajo doctrina juridica de VECY BIENES RAICES."
    ],
    findings,
    missingClauses,
    recommendedNextSteps: [
      "Reemplazar o ajustar cada clausula marcada en ALTA/MEDIA usando las redacciones sugeridas en este informe.",
      "Cruzar la identificacion del inmueble y gravamenes contra un Certificado de Tradicion y Libertad (CTL SNR) reciente.",
      "Agendar validacion notarial presencial o firma electronica certificada (Ley 527/1999) con VECY al +57 316 656 9719."
    ],
    requesterName: options?.requesterName
  };
}

function formatContractAuditWhatsAppReply(
  report: ContractAuditReport,
  pdfResult?: GeneratedLegalPdfResult
): string {
  const semaphore =
    report.riskLevel === "ROJO"
      ? "🔴 *SEMÁFORO ROJO (Riesgo Alto — No firmar sin corregir)*"
      : report.riskLevel === "AMARILLO"
      ? "🟡 *SEMÁFORO AMARILLO (Ajustes Preventivos Recomendados)*"
      : "🟢 *SEMÁFORO VERDE (Estructura Equilibrada)*";

  const topFindings = report.findings
    .slice(0, 4)
    .map(
      (f, idx) =>
        `${idx + 1}. *[${f.severidad}] ${f.titulo}:* ${f.hallazgo}\n   📌 _Norma:_ ${f.fundamentoLegal}\n   ✍️ _Sugerencia:_ ${f.redaccionSugerida}`
    )
    .join("\n\n");

  const missingBlock =
    report.missingClauses.length > 0
      ? `\n\n⚠️ *Vacíos / Cláusulas Esenciales Faltantes:*\n${report.missingClauses
          .slice(0, 4)
          .map((m) => `• ${m}`)
          .join("\n")}`
      : "";

  const pdfLine = pdfResult
    ? `\n\n📄 *Adjunto:* Auditoría Jurídica Membretada *${pdfResult.fileName}* (Radicado: \`${pdfResult.verificationCode}\`) con el análisis completo y propuestas de redacción listas para corregir.`
    : "";

  return (
    `⚖️ *AUDITORÍA DE RIESGOS CONTRACTUALES — ${report.contractLabel}*\n` +
    `${semaphore}\n` +
    `📚 *Régimen:* ${report.normativeRegime}\n\n` +
    `${topFindings}` +
    missingBlock +
    pdfLine +
    VECY_BROKER_CTA
  );
}

function formatCustomMinutaWhatsAppReply(
  parsed: ParsedContractRequest,
  pdfResult: GeneratedLegalPdfResult
): string {
  const { params } = parsed;
  const details: string[] = [];
  if (params.nombreRemitente || params.nombreDestinatario) {
    details.push(
      `• *Partes:* ${params.nombreRemitente || "[Parte A]"} ↔ ${params.nombreDestinatario || "[Parte B]"}`
    );
  }
  if (params.direccionInmueble || params.matriculaInmobiliaria || params.chipCatastral) {
    details.push(
      `• *Inmueble:* ${params.direccionInmueble || "[Por definir]"} | Matrícula: ${
        params.matriculaInmobiliaria || "[Pendiente]"
      } | CHIP: ${params.chipCatastral || "[Pendiente]"}`
    );
  }
  if (params.valorNegocioOCanon) details.push(`• *Cuantía / Canon:* ${params.valorNegocioOCanon}`);
  if (params.formaPagoDetalle) details.push(`• *Forma de pago:* ${params.formaPagoDetalle}`);
  if (params.tipoArras || params.valorArrasOPenalidad) {
    details.push(
      `• *Arras / Penalidad:* ${params.tipoArras || "confirmatorias"} (${
        params.valorArrasOPenalidad || "10% pactado"
      })`
    );
  }
  if (params.notaria || params.fechaEscritura) {
    details.push(
      `• *Escrituración:* ${params.fechaEscritura || "[Fecha por definir]"} en ${
        params.notaria || "[Notaría por definir]"
      }`
    );
  }
  if (params.plazoMeses) details.push(`• *Plazo:* ${params.plazoMeses} meses`);

  const missingBlock =
    parsed.missingHintFields.length > 0
      ? `\n\n📝 *Campos marcados entre corchetes para completar antes de firma notarial:*\n${parsed.missingHintFields
          .map((m) => `• ${m}`)
          .join("\n")}`
      : "";

  return (
    `📑 *MINUTA PERSONALIZADA GENERADA — ${pdfResult.title}*\n` +
    `📚 *Marco normativo:* ${pdfResult.normativeFramework}\n` +
    (details.length > 0 ? `\n*Datos incorporados en tu minuta:*\n${details.join("\n")}` : "") +
    `\n\n📎 *Adjunto:* PDF Membretado de VECY BIENES RAÍCES (*${pdfResult.fileName}* | Radicado: \`${pdfResult.verificationCode}\`), listo para revisión jurídica/notarial y firma electrónica (Ley 527/1999).` +
    missingBlock +
    VECY_BROKER_CTA
  );
}

/**
 * Orquestador unificado DM y Grupos para Skill 5:
 * - Genera Minuta Personalizada en PDF Membretado VECY (Promesa, Arriendo Vivienda/Comercial, Corretaje VECY, Otrosi/Cesion/Entrega).
 * - O ejecuta Auditoria de Riesgos Contractuales sobre texto, PDF o imagen adjunta, entregando informe y PDF.
 * Opera a $0 COP deterministico en NODE_ENV=test y en todo texto legible.
 */
function mediaInputToBase64(val?: Buffer | string | null): string | null {
  if (!val) return null;
  if (Buffer.isBuffer(val)) return val.length > 0 ? val.toString("base64") : null;
  const trimmed = String(val).trim();
  if (!trimmed) return null;
  return trimmed.replace(/^data:[^;]+;base64,/i, "");
}

export async function analyzeContractOrMinutaFromWhatsAppInput(input: {
  text?: string;
  pdfBuffer?: Buffer | string | null;
  pdfMimeType?: string | null;
  imageBuffer?: Buffer | string | null;
  imageMimeType?: string | null;
  requesterName?: string;
  requesterRole?: "agente_inmobiliario" | "propietario_directo" | "comprador_inversionista" | "arrendatario" | null;
}): Promise<LegalContractWhatsAppResult> {
  const rawText = String(input.text || "").trim();
  const pdfBase64 = mediaInputToBase64(input.pdfBuffer);
  const imgBase64 = mediaInputToBase64(input.imageBuffer);
  const hasMedia = Boolean(pdfBase64 || imgBase64);

  // 1) Extraer texto si viene PDF o imagen para auditoria de clausulas
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

  // En produccion (fuera de NODE_ENV=test), si viene imagen o PDF escaneado sin texto seleccionable, usar Vision LLM
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
                "Extrae integramente en texto plano las clausulas, partes, valores, arras, plazos, reajustes, depositos y penalidades de este borrador de contrato inmobiliario colombiano. Responde solo con el texto contractual transcrito."
            },
            {
              role: "user",
              content: [
                { type: "text", text: rawText || "Transcribe las clausulas del contrato adjunto." },
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
      // Fallback amable abajo si el escaneo no pudo leerse
    }
  }

  const combinedText = [rawText, extractedMediaText].filter(Boolean).join("\n\n");

  if (!isContractMinutaOrAuditRequest(rawText || combinedText, hasMedia)) {
    return {
      handled: false,
      mode: "guidance",
      tipoDocumento: "minuta_general",
      whatsappReply: "",
      reactionEmoji: "📑"
    };
  }

  const parsed = parseContractGenerationData(rawText || combinedText, hasMedia);

  // Caso A: Guia sobre que datos enviar
  if (parsed.mode === "guidance") {
    return {
      handled: true,
      mode: "guidance",
      tipoDocumento: parsed.tipoDocumento,
      whatsappReply:
        `📑 *Generador de Minutas y Auditoría Contractual VECY (100% Gratis)*\n\n` +
        `Para redactarte la *Minuta Personalizada en PDF Membretado* (Promesa de Compraventa, Arrendamiento Vivienda Ley 820 o Local Comercial C.Co., Corretaje VECY u Otrosí), envíame en un solo mensaje:\n` +
        `1️⃣ *Partes:* Nombres completos y CC/NIT.\n` +
        `2️⃣ *Inmueble:* Dirección, ciudad, Matrícula SNR y/o CHIP.\n` +
        `3️⃣ *Condiciones:* Precio o canon mensual, forma de pago (contado/crédito/FNA/leasing), plazo, fecha/notaría de escritura y arras/cláusula penal.\n\n` +
        `⚖️ *¿Prefieres auditar un contrato?* Pega aquí las cláusulas o adjunta el PDF/foto del borrador y te entrego el análisis de riesgos y cláusulas abusivas en PDF.` +
        VECY_BROKER_CTA,
      reactionEmoji: "📑"
    };
  }

  // Caso B: Auditoria de Riesgos Contractuales (texto / PDF / imagen)
  if (parsed.mode === "audit") {
    const textToAudit = extractedMediaText.trim().length >= 30 ? `${rawText}\n${extractedMediaText}` : rawText;

    if (textToAudit.trim().length < 30 && hasMedia) {
      return {
        handled: true,
        mode: "audit",
        tipoDocumento: parsed.tipoDocumento,
        whatsappReply:
          `⚖️ Recibí tu archivo, pero no logré extraer texto legible de las cláusulas para auditarlo con rigor jurídico.\n` +
          `Por favor envíame una foto más nítida, un PDF con texto seleccionable o pega directamente las cláusulas clave (canon/precio, incrementos, depósitos, arras, plazo, renovación/desahucio) y te entrego la *Auditoría de Riesgos Contractuales en PDF*.` +
          VECY_BROKER_CTA,
        reactionEmoji: "⚖️"
      };
    }

    const auditReport = auditContractDraftText(textToAudit, {
      requesterName: input.requesterName,
      hintType: parsed.tipoDocumento !== "minuta_general" ? parsed.tipoDocumento : undefined
    });
    const pdfResult = await generateContractRiskAuditPdf(auditReport);
    return {
      handled: true,
      mode: "audit",
      tipoDocumento: auditReport.contractTypeDetected,
      whatsappReply: formatContractAuditWhatsAppReply(auditReport, pdfResult),
      pdfResult,
      auditReport,
      reactionEmoji: "⚖️"
    };
  }

  // Caso C: Generacion de Minuta Personalizada en PDF Membretado
  if (parsed.params.tipoDocumento === "contrato_corretaje") {
    const mentionsColleagueScheme = /\b(?:40\/20\/40|colega|inmobiliaria|punta\s+captadora|corredor\s+aliado)\b/i.test(
      rawText
    );
    const mentionsDirectOwnerText = /\b(?:mi\s+(?:apartamento|casa|inmueble|propiedad|lote|finca|local|oficina|bodega)|propietario\s+directo|soy\s+(?:el\s+)?propietario|due[ñn]o\s+directo)\b/i.test(
      rawText
    );
    parsed.params.esPropietarioDirecto =
      input.requesterRole === "propietario_directo" ||
      (input.requesterRole !== "agente_inmobiliario" && mentionsDirectOwnerText && !mentionsColleagueScheme);
  }
  const pdfResult = await generateLegalDocumentPdf(parsed.params);
  return {
    handled: true,
    mode: "generate",
    tipoDocumento: parsed.tipoDocumento,
    whatsappReply: formatCustomMinutaWhatsAppReply(parsed, pdfResult),
    pdfResult,
    reactionEmoji: "📑"
  };
}
