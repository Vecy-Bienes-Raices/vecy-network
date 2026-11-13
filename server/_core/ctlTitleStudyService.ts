import zlib from "node:zlib";
import { invokeLLM } from "./llm";
import {
  BROKER_OFFICIAL_PHONE,
  BROKER_OFFICIAL_WHATSAPP_LINK
} from "./commercialFunnelService";
import { generateCtlStudyPdf } from "./jania/legalDocumentPdfService";

export type CtlVerdictCode = "VERDE" | "AMARILLO" | "ROJO";

export type CtlVerdictLabel =
  | "🟢 VIABLE PARA COMPRAVENTA Y CRÉDITO"
  | "🟡 VIABLE CON SANEAMIENTO PREVIO EN ESCRITURA"
  | "🔴 RIESGO CRÍTICO / BLOQUEO DE NEGOCIO";

export type CtlAnnotationCategory =
  | "TRADICION_DOMINIO"
  | "FALSA_TRADICION"
  | "GRAVAMEN_HIPOTECA"
  | "MEDIDA_CAUTELAR_EMBARGO"
  | "MEDIDA_CAUTELAR_DEMANDA"
  | "PROHIBICION_ENAJENAR"
  | "LIMITACION_PATRIMONIO_FAMILIA"
  | "LIMITACION_VIVIENDA_FAMILIAR"
  | "LIMITACION_CONDICION_RESOLUTORIA"
  | "LIMITACION_USUFRUCTO"
  | "LIMITACION_SERVIDUMBRE"
  | "LIMITACION_FIDEICOMISO"
  | "SUCESION_ILIQUIDA"
  | "CANCELACION"
  | "PROPIEDAD_HORIZONTAL_O_TRAMITE"
  | "OTRA_ANOTACION";

export interface CtlOwnerInfo {
  nombre: string;
  identificacion?: string;
  porcentaje?: string;
  tipoDerecho?: string;
}

export interface CtlAnnotation {
  numero: number;
  fecha: string;
  year?: number | null;
  radicacion?: string;
  docTipoNumeroFecha?: string;
  oficinaOrigen?: string;
  codigoNaturaleza?: string;
  especificacion: string;
  valor?: string;
  de?: string;
  a?: string;
  tieneXTitularDominio?: boolean;
  anotacionCanceladaRef?: number | null;
  estadoTexto?: string;
}

export interface CtlParsedDocument {
  esCertificadoTradicionLibertad: boolean;
  razonNoEsCtl?: string;
  matriculaInmobiliaria?: string;
  orip?: string;
  fechaImpresion?: string;
  estadoFolio?: string;
  departamentoMunicipio?: string;
  chip?: string;
  cedulaCatastral?: string;
  direccion?: string;
  tipoPredio?: string;
  complementacionResumen?: string;
  totalAnotacionesReportadas?: number | null;
  propietariosActuales?: CtlOwnerInfo[];
  anotaciones: CtlAnnotation[];
  notasOCR?: string;
}

export interface CtlAnnotationAuditItem {
  numero: number;
  fecha: string;
  codigoNaturaleza?: string;
  especificacion: string;
  categoria: CtlAnnotationCategory;
  estado:
    | "ACTIVA"
    | "CANCELADA"
    | "HISTORICA_TRADICION"
    | "INFORMATIVA"
    | "ALERTA_CRITICA";
  canceladaPorAnotacion?: number | null;
  cancelaAnotacion?: number | null;
  de?: string;
  a?: string;
  impactoJuridico: string;
}

export interface CtlPropertyMetadata {
  matriculaInmobiliaria: string;
  orip: string;
  fechaImpresion: string;
  estadoFolio: string;
  departamentoMunicipio: string;
  chip: string;
  cedulaCatastral: string;
  direccion: string;
  tipoPredio: string;
  complementacionResumen: string;
  propietariosActuales: CtlOwnerInfo[];
  totalAnotacionesReportadas: number | null;
}

export interface CtlTraditionAnalysis {
  tradicion10AnosContinua: boolean;
  tradicion20AnosContinua: boolean;
  anioPrimeraAnotacion: number | null;
  aniosHistorialEnFolio: number | null;
  cadenaDominioResumen: string;
  tieneFalsaTradicion: boolean;
  falsaTradicionSaneada: boolean;
  anotacionesFalsaTradicion: number[];
  observacionesTradicion: string[];
}

export interface CtlTitleStudyReport {
  metadata: CtlPropertyMetadata;
  verdictCode: CtlVerdictCode;
  verdictLabel: CtlVerdictLabel;
  verdictEmoji: "🟢" | "🟡" | "🔴";
  riskHeadline: string;
  tradition: CtlTraditionAnalysis;
  gravamenesVigentes: CtlAnnotationAuditItem[];
  limitacionesVigentes: CtlAnnotationAuditItem[];
  alertasCriticasVigentes: CtlAnnotationAuditItem[];
  gravamenesCancelados: CtlAnnotationAuditItem[];
  auditoriaAnotaciones: CtlAnnotationAuditItem[];
  recomendacionesNotariales: string[];
  documentosFaltantesOIncompletos: string[];
  whatsappSummary: string;
  fullReportText: string;
  analyzedAtIso: string;
  sourceType: "PDF" | "IMAGEN" | "TEXTO";
}

export interface CtlWhatsAppExecutionResult {
  isCtlRequest: boolean;
  isCtlDocument: boolean;
  needsMediaGuidance: boolean;
  report?: CtlTitleStudyReport;
  responseText: string;
  pdfBuffer?: Buffer;
  pdfFileName?: string;
  reactionEmoji: string;
}

function normalizeUpperNoAccents(value?: string | null): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function extractYearFromDateString(dateStr?: string | null): number | null {
  const raw = String(dateStr || "");
  const m = raw.match(/\b(19\d{2}|20\d{2})\b/);
  if (!m) return null;
  const yr = Number(m[1]);
  return yr >= 1900 && yr <= 2100 ? yr : null;
}

function extractNatCode(codigo?: string | null, especificacion?: string | null): string | undefined {
  const combined = `${codigo || ""} ${especificacion || ""}`;
  const m = combined.match(/\b(0[1-9]\d{2})\b/);
  return m ? m[1] : undefined;
}

function isConceptualCtlQuestion(text: string): boolean {
  const norm = normalizeUpperNoAccents(text);
  const asksConceptOrPrice =
    /\b(?:QUE\s+ES\s+(?:UN|EL|UNA|LA)?\s*(?:ESTUDIO\s+DE\s+TITULOS|FALSA\s+TRADICION|PATRIMONIO\s+DE\s+FAMILIA|AFECTACION\s+A\s+VIVIENDA|CERTIFICADO\s+DE\s+TRADICION|FOLIO\s+DE\s+MATRICULA)|PARA\s+QUE\s+SIRVE\s+(?:EL|UN)\s*(?:ESTUDIO\s+DE\s+TITULOS|CTL|CERTIFICADO\s+DE\s+TRADICION)|COMO\s+SE\s+(?:HACE|LEE|DESCARGA|SACA)\s+UN\s+(?:ESTUDIO\s+DE\s+TITULOS|CERTIFICADO\s+DE\s+TRADICION|CTL)|CUANTO\s+(?:CUESTA|VALE|COBRAN)\s+(?:UN|EL)\s+(?:ESTUDIO\s+DE\s+TITULOS|CERTIFICADO\s+DE\s+TRADICION)|QUE\s+MIRA\s+UN\s+BANCO)\b/.test(
      norm
    );
  return asksConceptOrPrice && !hasCtlTextMarkers(text);
}

/**
 * Detecta si un texto pegado contiene estructura real de un Certificado de Tradición y Libertad (SNR).
 */
export function hasCtlTextMarkers(text?: string | null): boolean {
  const raw = String(text || "");
  if (raw.trim().length < 25) return false;
  const norm = normalizeUpperNoAccents(raw);

  const hasSnrHeader =
    (/\bCERTIFICADO\s+DE\s+TRADICION(?:\s+Y\s+LIBERTAD)?\b/.test(norm) &&
      /\b(?:MATRICULA|ANOTACION|ESTADO\s+DEL\s+FOLIO|FECHA\s+DE\s+IMPRESION|ORIP|RADICACION|SUPERINTENDENCIA)\b/.test(
        norm
      )) ||
    (/\bSUPERINTENDENCIA\s+DE\s+NOTARIADO\s+Y\s+REGISTRO\b/.test(norm) &&
      /\b(?:MATRICULA|ANOTACION|FOLIO|ORIP|CEDULA\s+CATASTRAL|CHIP)\b/.test(norm)) ||
    /\bOFICINA\s+DE\s+REGISTRO\s+DE\s+INSTRUMENTOS\s+PUBLICOS\b/.test(norm) ||
    /\bNRO\.?\s*MATRICULA\b/.test(norm) ||
    /\bMATRICULA\s+INMOBILIARIA\s*[:#-]?\s*\d{2,3}[A-Z]?\s*-\s*\d{3,}\b/.test(norm) ||
    (/\bESTADO\s+DEL\s+FOLIO\b/.test(norm) && /\b(?:FECHA\s+DE\s+IMPRESION|CIRCULO\s+REGISTRAL|ORIP|PIN)\b/.test(norm));

  const hasAnnotationsStructure =
    /\bANOTACION\s*(?:[:#-]\s*)?(?:(?:NRO|NO\.?|#|NUMERO)\s*[:#-]?\s*)?0*\d{1,3}\b/.test(norm) &&
    /\b(?:ESPECIFICACION|NATURALEZA\s+JURIDICA|RADICACION|COMPRAVENTA|HIPOTECA|EMBARGO|PATRIMONIO|AFECTACION|FALSA\s+TRADICION|0[1-9]\d{2})\b/.test(
      norm
    );

  const multipleSnrCodes = (norm.match(/\b0[1-9]\d{2}\s+[A-Z]{4,}/g) || []).length >= 2;

  return hasSnrHeader || hasAnnotationsStructure || multipleSnrCodes;
}

/**
 * Detecta si el usuario solicita explícitamente ejecutar un Estudio de Títulos SNR sobre un CTL.
 * Excluye preguntas puramente conceptuales o de precios cuando no hay texto/anotaciones del CTL.
 */
export function isExplicitCtlStudyRequest(text?: string | null): boolean {
  const raw = String(text || "").trim();
  if (!raw) return false;
  if (hasCtlTextMarkers(raw)) return true;
  if (isConceptualCtlQuestion(raw)) return false;

  const norm = normalizeUpperNoAccents(raw);
  return (
    /\b(?:HAZ(?:ME|NOS)?|REALIZA(?:R|ME|NOS)?|EJECUTA(?:R|ME|NOS)?|GENERA(?:R|ME|NOS)?|EMITE|PRACTICA(?:R|ME)?)\s+(?:UN\s+|EL\s+)?(?:ESTUDIO\s+DE\s+TITULOS|ANALISIS\s+(?:JURIDICO\s+)?DEL?\s*(?:CTL|CERTIFICADO\s+DE\s+TRADICION)|DICTAMEN\s+(?:DEL\s+)?(?:CTL|CERTIFICADO\s+DE\s+TRADICION))\b/.test(
      norm
    ) ||
    /\b(?:REVISA(?:R|ME|NOS)?|ANALIZA(?:R|ME|NOS)?|AUDITA(?:R|ME|NOS)?|ESTUDIA(?:R|ME|NOS)?|VERIFICA(?:R|ME|NOS)?)\s+(?:ESTE\s+|EL\s+|MI\s+|ESE\s+)?(?:CTL|CERTIFICADO\s+DE\s+TRADICION(?:\s+Y\s+LIBERTAD)?|FOLIO\s+DE\s+MATRICULA)\b/.test(
      norm
    ) ||
    /\b(?:ESTUDIO\s+DE\s+TITULOS)\s+(?:ADJUNT[OA]|DEL?\s+(?:PDF|ARCHIVO|INMUEBLE|APTO|APARTAMENTO|CASA|LOTE|FOLIO|CERTIFICADO))\b/.test(
      norm
    ) ||
    /\b(?:ADJUNT[OA]|TE\s+(?:ENVIO|MANDO|PASO|COMPARTO)|AQUI\s+(?:ESTA|TIENES|VA))\s+(?:EL\s+|MI\s+)?(?:CTL|CERTIFICADO\s+DE\s+TRADICION)\b/.test(
      norm
    )
  );
}

/**
 * Extrae texto legible de un PDF digital (incluyendo flujos comprimidos FlateDecode) usando zlib nativo de Node,
 * sin dependencias externas. Útil para pre-chequeo de CTL y parseo determinístico a $0 COP en digital/tests.
 */
export function extractTextSnippetsFromPdfBuffer(pdfBase64?: string | null): string {
  if (!pdfBase64) return "";
  try {
    const rawBuf = Buffer.from(pdfBase64, "base64");
    if (rawBuf.length < 10) return "";
    const latin = rawBuf.toString("latin1");
    const collectedChunks: string[] = [];

    const extractLiteralText = (chunk: string): string => {
      const literals: string[] = [];
      // A) Extraer strings PDF entre paréntesis (...) respetando escapes básicos
      const parenRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
      let match: RegExpExecArray | null;
      while ((match = parenRegex.exec(chunk)) !== null) {
        const inner = match[1]
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, " ")
          .replace(/\\t/g, " ")
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\");
        if (!/[\x00-\x08\x0E-\x1F]/.test(inner) && /[A-Za-z0-9ÁÉÍÓÚáéíóúÑñ]{2,}/.test(inner)) {
          literals.push(inner);
        }
      }
      // B) Extraer strings hexadecimales PDF <455354...> generados por pdf-lib / StandardFonts
      const hexRegex = /<([0-9A-Fa-f]{4,})>/g;
      let hexMatch: RegExpExecArray | null;
      while ((hexMatch = hexRegex.exec(chunk)) !== null) {
        const hexStr = hexMatch[1];
        if (hexStr.length % 2 === 0 && hexStr.length <= 2000) {
          const decodedHex = Buffer.from(hexStr, "hex").toString("latin1").replace(/\0/g, "");
          if (!/[\x00-\x08\x0E-\x1F]/.test(decodedHex) && /[A-Za-z0-9ÁÉÍÓÚáéíóúÑñ]{2,}/.test(decodedHex)) {
            literals.push(decodedHex);
          }
        }
      }
      return literals.length > 0 ? literals.join(" ") : "";
    };

    // 1. Streams FlateDecode y contenido textual PDF
    let searchPos = 0;
    let totalExtractedLen = 0;
    const MAX_LEN = 250_000;
    while (searchPos < latin.length && totalExtractedLen < MAX_LEN) {
      const streamIdx = latin.indexOf("stream", searchPos);
      if (streamIdx === -1) break;
      const dictLookback = latin.slice(Math.max(0, streamIdx - 320), streamIdx);
      let dataStart = streamIdx + 6;
      if (latin[dataStart] === "\r" && latin[dataStart + 1] === "\n") dataStart += 2;
      else if (latin[dataStart] === "\n" || latin[dataStart] === "\r") dataStart += 1;

      const endIdx = latin.indexOf("endstream", dataStart);
      if (endIdx === -1) break;
      searchPos = endIdx + 9;

      // Omitir XObjects de imagen (logos/QR/escaneos crudos dentro de otros objetos) para no leer píxeles como texto
      if (/\/Subtype\s*\/Image\b/i.test(dictLookback)) {
        continue;
      }

      const sliceBuf = rawBuf.subarray(dataStart, endIdx);
      let decodedText = "";
      try {
        const inflated = zlib.inflateSync(sliceBuf);
        decodedText = inflated.toString("latin1");
      } catch {
        // Puede ser stream sin compresión o con filtro diferente
        decodedText = sliceBuf.toString("latin1");
      }

      const looksLikeContentStream = /\b(?:BT|ET|Tf|Tj|TJ|Td|TD|Tm)\b/.test(decodedText);
      const cleanLit = looksLikeContentStream ? extractLiteralText(decodedText) : "";
      if (cleanLit) {
        collectedChunks.push(cleanLit);
        totalExtractedLen += cleanLit.length;
      } else if (/CERTIFICADO\s+DE\s+TRADICI|MATRICULA|ANOTACION|SUPERINTENDENCIA|ESTUDIO\s+DE\s+TITULOS/i.test(decodedText)) {
        const plainAscii = decodedText.replace(/[^\x20-\x7E\xC0-\xFF\n\r]/g, " ");
        collectedChunks.push(plainAscii);
        totalExtractedLen += plainAscii.length;
      }
    }

    // 2. Fallback directo sobre texto plano si no había bloques stream (por ej. texto incrustado directo)
    if (collectedChunks.length === 0) {
      const topLit = extractLiteralText(latin);
      if (topLit) {
        collectedChunks.push(topLit);
      } else {
        const readableLines = latin
          .replace(/[^\x20-\x7E\xC0-\xFF\n\r]/g, " ")
          .replace(/[ ]{2,}/g, " ");
        collectedChunks.push(readableLines.slice(0, 80_000));
      }
    }

    return collectedChunks.join("\n").replace(/[ \t]{2,}/g, " ").trim();
  } catch {
    return "";
  }
}

/**
 * Parser determinístico de CTL SNR en texto plano (pegado por WhatsApp o extraído de PDF digital).
 */
export function parseCtlFromPlainText(rawText: string): CtlParsedDocument {
  const clean = String(rawText || "").replace(/\r\n/g, "\n").trim();
  const isCtl = hasCtlTextMarkers(clean);
  if (!isCtl) {
    return {
      esCertificadoTradicionLibertad: false,
      razonNoEsCtl: "El texto no contiene encabezados o anotaciones características de un Certificado de Tradición y Libertad SNR.",
      anotaciones: []
    };
  }

  const pickField = (regex: RegExp): string => {
    const m = clean.match(regex);
    return m && m[1] ? m[1].replace(/\s+/g, " ").trim() : "";
  };

  const matriculaInmobiliaria =
    pickField(/(?:NRO\.?\s*MATR[IÍ]CULA|MATR[IÍ]CULA\s+INMOBILIARIA)\s*[:#-]?\s*([0-9A-Z]{2,4}\s*-\s*\d{3,10})/i) ||
    pickField(/\b(\d{2,3}[NC]?\s*-\s*\d{4,9})\b/);
  const orip = pickField(/(?:OFICINA\s+DE\s+REGISTRO(?:\s+DE\s+INSTRUMENTOS\s+P[UÚ]BLICOS)?|ORIP|C[IÍ]RCULO\s+REGISTRAL)\s*[:#-]?\s*([^\n]{3,80})/i);
  const fechaImpresion = pickField(/FECHA\s+DE\s+IMPRESI[OÓ]N\s*[:#-]?\s*([^\n]{6,50})/i);
  const estadoFolio = pickField(/ESTADO\s+DEL\s+FOLIO\s*[:#-]?\s*([^\n]{3,35})/i);
  const departamentoMunicipio = pickField(/(?:DEPTO|DEPARTAMENTO)\s*[:#-]?\s*([^\n]{3,80})/i);
  const chip = pickField(/\bCHIP\s*[:#-]?\s*([A-Z0-9-]{6,25})/i);
  const cedulaCatastral = pickField(/(?:C[EÉ]DULA\s+CATASTRAL|REFERENCIA\s+CATASTRAL|C[OÓ]DIGO\s+CATASTRAL)\s*[:#-]?\s*([A-Z0-9-]{6,40})/i);
  const direccion = pickField(/(?:DIRECCI[OÓ]N\s+(?:DEL\s+INMUEBLE)?|NOMENCLATURA)\s*[:#-]?\s*([^\n]{5,120})/i);
  const complementacionResumen = pickField(/COMPLEMENTACI[OÓ]N\s*[:#-]?\s*([^\n]{10,450})/i);
  const totalMatch = clean.match(/(?:NRO\s+TOTAL\s+DE\s+ANOTACIONES|TOTAL\s+ANOTACIONES)\s*[:#-]?\s*(\d{1,3})/i);
  const totalAnotacionesReportadas = totalMatch ? Number(totalMatch[1]) : null;

  const anotaciones: CtlAnnotation[] = [];
  const blockRegex =
    /(?:^|\n)\s*ANOTACI[OÓ]N\s*(?:[:#-]\s*)?(?:(?:NRO\.?|NO\.?|#|N[UÚ]MERO)\s*[:#-]?\s*)?0*(\d{1,3})\b([\s\S]*?)(?=(?:\n\s*ANOTACI[OÓ]N\s*(?:[:#-]\s*)?(?:(?:NRO\.?|NO\.?|#|N[UÚ]MERO)\s*[:#-]?\s*)?0*\d{1,3}\b)|$)/gi;

  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockRegex.exec(clean)) !== null) {
    const numero = Number(blockMatch[1]);
    const body = blockMatch[2] || "";
    const fechaMatch =
      body.match(/FECHA\s*[:#-]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i) ||
      body.match(/\b(\d{1,2}[-/]\d{1,2}[-/]\d{4})\b/);
    const fecha = fechaMatch ? fechaMatch[1] : "";
    const year = extractYearFromDateString(fecha || body);
    const radMatch = body.match(/RADICACI[OÓ]N\s*[:#-]?\s*([A-Z0-9-]{4,35})/i);
    const especMatch = body.match(
      /(?:ESPECIFICACI[OÓ]N|NATURALEZA\s+JUR[IÍ]DICA|ACTO)\s*[:#-]?\s*([^\n]{4,180})/i
    );
    let especificacion = especMatch ? especMatch[1].trim() : "";
    if (!especificacion) {
      const codeLine = body.match(/\b(0[1-9]\d{2})\s+([A-ZÁÉÍÓÚÑ][^\n]{3,140})/i);
      especificacion = codeLine ? `${codeLine[1]} ${codeLine[2].trim()}` : body.split("\n")[0]?.trim() || "ANOTACIÓN REGISTRADA";
    }
    const codigoNaturaleza = extractNatCode(especificacion, body);
    const valorMatch = body.match(/VALOR\s*(?:ACTO)?\s*[:#-]?\s*(\$?\s*[\d.,]{4,25})/i);
    const deMatch = body.match(/(?:^|\n)\s*DE\s*[:#-]?\s*([^\n]{3,220})/i);
    const aMatch = body.match(/(?:^|\n)\s*A\s*[:#-]?\s*([^\n]{3,220})/i);
    const cancelRefMatch = body.match(
      /SE\s+CANCELA\s+(?:LA\s+)?ANOTACI[OÓ]N\s*(?:NRO\.?|NO\.?|#)?\s*0*(\d{1,3})/i
    );

    const aLine = aMatch ? aMatch[1].trim() : "";
    const tieneXTitularDominio = /\bX\b|\(X\)|TITULAR\s+DE\s+DOMINIO/i.test(`${aLine} ${body}`);

    anotaciones.push({
      numero,
      fecha: fecha || (year ? `${year}` : "Sin fecha legible"),
      year,
      radicacion: radMatch ? radMatch[1] : undefined,
      codigoNaturaleza,
      especificacion: especificacion.replace(/\s+/g, " ").trim(),
      valor: valorMatch ? valorMatch[1].trim() : undefined,
      de: deMatch ? deMatch[1].trim() : undefined,
      a: aLine || undefined,
      tieneXTitularDominio,
      anotacionCanceladaRef: cancelRefMatch ? Number(cancelRefMatch[1]) : null
    });
  }

  // Fallback si listaron actos numerados sin la palabra repetida "ANOTACIÓN"
  if (anotaciones.length === 0) {
    const lineCodeRegex = /(?:^|\n)\s*(\d{1,3})[.)-]\s*(?:(\d{1,2}[-/]\d{1,2}[-/]\d{4})\s*[-|:]?\s*)?(0[1-9]\d{2})?\s*([^\n]{8,180})/g;
    let lm: RegExpExecArray | null;
    while ((lm = lineCodeRegex.exec(clean)) !== null) {
      const numero = Number(lm[1]);
      const rest = lm[4].trim();
      const fecha = lm[2] || (rest.match(/\b(\d{1,2}[-/]\d{1,2}[-/]\d{4})\b/)?.[1] ?? "");
      const code = lm[3] || extractNatCode(undefined, rest);
      if (code || /\b(?:COMPRAVENTA|HIPOTECA|EMBARGO|PATRIMONIO|AFECTACION|FALSA\s+TRADICION|CANCELACION|SUCESION|USUFRUCTO|DEMANDA)\b/i.test(rest)) {
        anotaciones.push({
          numero,
          fecha: fecha || "Sin fecha legible",
          year: extractYearFromDateString(fecha || rest),
          codigoNaturaleza: code,
          especificacion: code && !rest.startsWith(code) ? `${code} ${rest}` : rest,
          tieneXTitularDominio: /\bX\b|\(X\)/i.test(rest)
        });
      }
    }
  }

  // Extraer propietarios si hay sección explícita "PROPIETARIOS"
  const propietariosActuales: CtlOwnerInfo[] = [];
  const propSectionMatch = clean.match(
    /(?:PROPIETARIOS?\s+ACTUALES?|TITULARES?\s+DE\s+DOMINIO)\s*[:#-]?\s*([^\n]{4,220}(?:\n[^\n]{4,140}){0,4})/i
  );
  if (propSectionMatch) {
    const lines = propSectionMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 3 && !/^ANOTACI[OÓ]N/i.test(l));
    for (const line of lines) {
      const pct = line.match(/(\d{1,3}(?:[.,]\d{1,2})?\s*%)/)?.[1];
      const docId = line.match(/\b(?:CC|C\.C\.|NIT|CE)\s*[:#.]?\s*([\d.-]{5,15})/i)?.[1];
      const nombre = line
        .replace(/(\d{1,3}(?:[.,]\d{1,2})?\s*%)/g, "")
        .replace(/\b(?:CC|C\.C\.|NIT|CE)\s*[:#.]?\s*[\d.-]{5,15}/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      if (nombre.length >= 3) {
        propietariosActuales.push({
          nombre,
          identificacion: docId,
          porcentaje: pct || undefined,
          tipoDerecho: "Titular de dominio (X)"
        });
      }
    }
  }

  return {
    esCertificadoTradicionLibertad: true,
    matriculaInmobiliaria: matriculaInmobiliaria || undefined,
    orip: orip || undefined,
    fechaImpresion: fechaImpresion || undefined,
    estadoFolio: estadoFolio || undefined,
    departamentoMunicipio: departamentoMunicipio || undefined,
    chip: chip || undefined,
    cedulaCatastral: cedulaCatastral || undefined,
    direccion: direccion || undefined,
    complementacionResumen: complementacionResumen || undefined,
    totalAnotacionesReportadas,
    propietariosActuales,
    anotaciones
  };
}

/**
 * Clasifica una anotación SNR colombiana con reglas jurídicas estrictas.
 * Precedencia: Cancelaciones primero -> Falsa Tradición -> Prohibiciones/Embargos/Demandas ->
 * Sucesión ilíquida -> Limitaciones -> Hipoteca -> Tradición de dominio -> RPH/Trámite.
 */
export function classifyCtlAnnotation(ann: CtlAnnotation): {
  categoria: CtlAnnotationCategory;
  cancelsTargetCategory?: CtlAnnotationCategory | "ANY";
  impactoBase: string;
} {
  const code = (ann.codigoNaturaleza || extractNatCode(ann.codigoNaturaleza, ann.especificacion) || "").trim();
  const norm = normalizeUpperNoAccents(`${code} ${ann.especificacion}`);

  // 1. CANCELACIONES Y LEVANTAMIENTOS (siempre evaluar ANTES que los gravámenes para no confundir "CANCELACION HIPOTECA" con "HIPOTECA")
  const isCancellation =
    (/^08(?:4[1-9]|[5-9]\d)/.test(code) ||
      /\b(?:CANCELACION|LEVANTAMIENTO|DESEMBARGO|EXTINCION\s+DEL?\s+(?:USUFRUCTO|PATRIMONIO|GRAVAMEN|HIPOTECA|FIDEICOMISO)|RENUNCIA\s+(?:AL?\s+)?USUFRUCTO|CONSOLIDACION\s+(?:DEL\s+)?USUFRUCTO|TERMINACION\s+(?:DE\s+)?(?:AFECTACION|EMBARGO|DEMANDA))\b/.test(
        norm
      )) &&
    !/\bNO\s+CANCELADA\b/.test(norm);

  if (isCancellation) {
    let target: CtlAnnotationCategory | "ANY" = "ANY";
    if (/HIPOTECA|0205|0206|0215|0843/.test(norm)) target = "GRAVAMEN_HIPOTECA";
    else if (/EMBARGO|DESEMBARGO|042[7-9]|043\d|0841/.test(norm)) target = "MEDIDA_CAUTELAR_EMBARGO";
    else if (/DEMANDA|041[5-9]|0842/.test(norm)) target = "MEDIDA_CAUTELAR_DEMANDA";
    else if (/PATRIMONIO\s+DE\s+FAMILIA|031[5-7]|0845/.test(norm)) target = "LIMITACION_PATRIMONIO_FAMILIA";
    else if (/VIVIENDA\s+FAMILIAR|0304|0844/.test(norm)) target = "LIMITACION_VIVIENDA_FAMILIAR";
    else if (/CONDICION\s+RESOLUTORIA|PACTO|0309|031[01]/.test(norm)) target = "LIMITACION_CONDICION_RESOLUTORIA";
    else if (/USUFRUCTO|033[1-4]/.test(norm)) target = "LIMITACION_USUFRUCTO";
    else if (/SERVIDUMBRE|032[5-8]/.test(norm)) target = "LIMITACION_SERVIDUMBRE";
    else if (/FIDEICOMISO|031[2-4]/.test(norm)) target = "LIMITACION_FIDEICOMISO";
    else if (/PROHIBICION|EXTINCION|04[4-6]\d/.test(norm)) target = "PROHIBICION_ENAJENAR";

    return {
      categoria: "CANCELACION",
      cancelsTargetCategory: target,
      impactoBase: "Extingue registralmente un gravamen, medida cautelar o limitación inscrita anteriormente."
    };
  }

  // 2. FALSA TRADICIÓN (Código 06xx / Derechos y Acciones / Posesión sin dominio pleno)
  if (
    /^06\d{2}/.test(code) ||
    /\b(?:FALSA\s+TRADICION|DERECHOS\s+Y\s+ACCIONES|POSESION\s+(?:MATERIAL|INSCRITA)|VENTA\s+(?:DE\s+)?COSA\s+AJENA|DERECHOS\s+CUOTA\s+DE\s+POSESION|MEJORAS\s+EN\s+TERRENO\s+AJENO)\b/.test(
      norm
    )
  ) {
    return {
      categoria: "FALSA_TRADICION",
      impactoBase:
        "ALERTA ROJA: No transfiere dominio pleno ni propiedad real inscrita (Art. 756 C.C. / Código 0600). Inviable para crédito hipotecario y alto riesgo patrimonial salvo saneamiento judicial/Ley 1561 posterior."
    };
  }

  // 3. PROHIBICIÓN DE ENAJENAR / EXTINCIÓN DE DOMINIO / RESTITUCIÓN DE TIERRAS / VIS-VIP
  if (
    /^04(?:4\d|5\d|6\d)/.test(code) ||
    /\b(?:EXTINCION\s+DE\s+DOMINIO|RESTITUCION\s+DE\s+TIERRAS|PROHIBICION\s+(?:DE\s+)?(?:ENAJENAR|TRANSFERIR)|SUSPENSION\s+(?:DEL\s+)?PODER\s+DISPOSITIVO|MEDIDA\s+CAUTELAR\s+(?:FISCALIA|PENAL))\b/.test(
      norm
    )
  ) {
    return {
      categoria: "PROHIBICION_ENAJENAR",
      impactoBase:
        "BLOQUEO LEGAL: Restricción o prohibición absoluta de enajenar/disponer del inmueble o medida de extinción/restitución."
    };
  }

  // 4. EMBARGO
  if (/^04(?:2[7-9]|3[0-5])/.test(code) || /\bEMBARGO\b/.test(norm)) {
    return {
      categoria: "MEDIDA_CAUTELAR_EMBARGO",
      impactoBase:
        "BLOQUEO JURÍDICO (Art. 1521 C.C.): El bien está fuera del comercio mientras el embargo permanezca vigente sin oficio de desembargo registrado."
    };
  }

  // 5. INSCRIPCIÓN DE DEMANDA
  if (/^041[5-9]/.test(code) || /\b(?:INSCRIPCION\s+DE\s+DEMANDA|DEMANDA\s+EN\s+PROCESO)\b/.test(norm)) {
    return {
      categoria: "MEDIDA_CAUTELAR_DEMANDA",
      impactoBase:
        "RIESGO LITIGIOSO (Art. 591 CGP): Quien adquiera el inmueble queda sujeto a las resultas del proceso judicial pendiente."
    };
  }

  // 6. SUCESIÓN ILÍQUIDA / DERECHOS HERENCIALES SIN ADJUDICACIÓN
  if (
    !/\b(?:ADJUDICACION|PARTICION|LIQUIDACION)\b/.test(norm) &&
    /\b(?:SUCESION\s+ILIQUIDA|DERECHOS\s+HERENCIALES|DERECHOS\s+SUCESORALES|APERTURA\s+(?:DE\s+)?SUCESION|JUICIO\s+DE\s+SUCESION)\b/.test(
      norm
    )
  ) {
    return {
      categoria: "SUCESION_ILIQUIDA",
      impactoBase:
        "SUCESIÓN SIN LIQUIDAR: El inmueble aún integra masa herencial ilíquida o derechos sucesorales sin partición/adjudicación registrada."
    };
  }

  // 7. PATRIMONIO DE FAMILIA INEMBARGABLE (Ley 70/1931)
  if (/^031[5-7]/.test(code) || /\bPATRIMONIO\s+DE\s+FAMILIA\b/.test(norm)) {
    return {
      categoria: "LIMITACION_PATRIMONIO_FAMILIA",
      impactoBase:
        "Limitación Ley 70/1931: Impide enajenación y crédito hipotecario hasta su cancelación previa/simultánea (si existen hijos menores requiere autorización judicial o de Defensor de Familia)."
    };
  }

  // 8. AFECTACIÓN A VIVIENDA FAMILIAR (Ley 258/1996)
  if (/^0304/.test(code) || /\bAFECTACION\s+A\s+VIVIENDA\s+FAMILIAR\b/.test(norm)) {
    return {
      categoria: "LIMITACION_VIVIENDA_FAMILIAR",
      impactoBase:
        "Limitación Ley 258/1996: Requiere levantamiento/cancelación por escritura pública firmada por ambos cónyuges o compañeros permanentes."
    };
  }

  // 9. CONDICIÓN RESOLUTORIA / PACTO COMISORIO / RETROVENTA
  if (/^0309|^031[01]/.test(code) || /\b(?:CONDICION\s+RESOLUTORIA|PACTO\s+COMISORIO|PACTO\s+DE\s+RETROVENTA)\b/.test(norm)) {
    return {
      categoria: "LIMITACION_CONDICION_RESOLUTORIA",
      impactoBase:
        "Limitación al dominio: Debe cancelarse por escritura de cumplimiento o renuncia antes/simultáneamente con la nueva venta."
    };
  }

  // 10. USUFRUCTO / USO Y HABITACIÓN
  if (/^033[1-4]/.test(code) || /\b(?:USUFRUCTO|DERECHO\s+DE\s+USO|DERECHO\s+DE\s+HABITACION|CONSTITUCION\s+DE\s+USUFRUCTO)\b/.test(norm)) {
    return {
      categoria: "LIMITACION_USUFRUCTO",
      impactoBase:
        "Desmembración del dominio: El propietario solo ostenta la nuda propiedad; el usufructuario debe concurrir a cancelar o renunciar en escritura."
    };
  }

  // 11. SERVIDUMBRE
  if (/^032[5-8]/.test(code) || /\bSERVIDUMBRE\b/.test(norm)) {
    return {
      categoria: "LIMITACION_SERVIDUMBRE",
      impactoBase:
        "Limitación real: Gravamen permanente sobre franja/uso del predio; verificar en escritura de constitución que no afecte área edificable o acceso."
    };
  }

  // 12. FIDEICOMISO CIVIL (distinto de fiducia mercantil traslaticia 0164/0168)
  if (
    (/^031[2-4]/.test(code) || /\b(?:FIDEICOMISO\s+CIVIL|PROPIEDAD\s+FIDUCIARIA|CONSTITUCION\s+DE\s+FIDEICOMISO)\b/.test(norm)) &&
    !/\bFIDUCIA\s+MERCANTIL\b/.test(norm)
  ) {
    return {
      categoria: "LIMITACION_FIDEICOMISO",
      impactoBase:
        "Limitación fiduciaria civil: El bien está sujeto a condición de restitución a favor de fideicomisario; requiere revocatoria o comparecencia conjunta."
    };
  }

  // 13. HIPOTECA
  if (/^02(?:0[56]|15)/.test(code) || /\bHIPOTECA\b/.test(norm)) {
    return {
      categoria: "GRAVAMEN_HIPOTECA",
      impactoBase:
        "Gravamen real vigente (persecución sobre el inmueble): Exige paz y salvo del acreedor y cancelación simultánea o subrogación en escritura pública."
    };
  }

  // 14. TRADICIÓN DE DOMINIO PLENO
  if (
    /^01\d{2}/.test(code) ||
    /\b(?:COMPRAVENTA|ADJUDICACION\s+(?:EN\s+)?SUCESION|LIQUIDACION\s+(?:DE\s+)?(?:LA\s+)?SOCIEDAD\s+CONYUGAL|DACION\s+EN\s+PAGO|DONACION|PERMUTA|REMATE|DECLARACION\s+DE\s+PERTENENCIA|SANEAMIENTO\s+(?:DE\s+)?TITULACION|LEY\s+1561|FIDUCIA\s+MERCANTIL|APORTE\s+EN\s+SOCIEDAD|ADJUDICACION\s+LIQUIDACION)\b/.test(
      norm
    )
  ) {
    return {
      categoria: "TRADICION_DOMINIO",
      impactoBase: "Modo translaticio de dominio pleno."
    };
  }

  // 15. PROPIEDAD HORIZONTAL / TRÁMITES URBANÍSTICOS / ACTUALIZACIONES
  if (
    /^0319|^0320|^09\d{2}/.test(code) ||
    /\b(?:REGLAMENTO\s+DE\s+PROPIEDAD\s+HORIZONTAL|DESENGLOBE|ENGLOBE|LOTEO|ACLARACION|ACTUALIZACION\s+DE\s+NOMENCLATURA|CAMBIO\s+DE\s+RAZON\s+SOCIAL|COMPLEMENTACION|CORRECCION|ENGLOBAMIENTO|RELOTEO)\b/.test(
      norm
    )
  ) {
    return {
      categoria: "PROPIEDAD_HORIZONTAL_O_TRAMITE",
      impactoBase: "Acto administrativo, urbanístico o de reglamento de propiedad horizontal."
    };
  }

  return {
    categoria: "OTRA_ANOTACION",
    impactoBase: "Anotación registral informativa o complementaria."
  };
}

function tokenizeEntities(str?: string | null): string[] {
  return normalizeUpperNoAccents(str)
    .split(/[^A-Z0-9]+/)
    .filter((t) => t.length >= 4 && !/^(?:LTDA|BANCO|SAS|CORP|NIT|PARA|CON|DEL|LOS|LAS)$/.test(t));
}

function entitiesOverlap(a?: string | null, b?: string | null): boolean {
  const ta = tokenizeEntities(a);
  const tb = new Set(tokenizeEntities(b));
  return ta.some((w) => tb.has(w));
}

function inferOwnersFromAnnotations(annotations: CtlAnnotation[]): CtlOwnerInfo[] {
  if (annotations.length === 0) return [];
  const sorted = [...annotations].sort((a, b) => a.numero - b.numero);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const ann = sorted[i];
    const cls = classifyCtlAnnotation(ann);
    if (
      (cls.categoria === "TRADICION_DOMINIO" || cls.categoria === "FALSA_TRADICION") &&
      ann.a &&
      ann.a.trim().length >= 3
    ) {
      const parts = ann.a
        .split(/\n|;|(?=\b(?:CC|NIT|CE)\b)/i)
        .map((p) => p.replace(/\bX\b/g, "").trim())
        .filter((p) => p.length >= 3);

      const list: CtlOwnerInfo[] = [];
      for (const p of parts.slice(0, 6)) {
        const pct = p.match(/(\d{1,3}(?:[.,]\d{1,2})?\s*%)/)?.[1];
        const cleanName = p.replace(/(\d{1,3}(?:[.,]\d{1,2})?\s*%)/g, "").trim();
        if (cleanName.length >= 3) {
          list.push({
            nombre: cleanName,
            porcentaje: pct || (parts.length === 1 ? "100%" : undefined),
            tipoDerecho:
              cls.categoria === "FALSA_TRADICION"
                ? "Falsa tradición (sin dominio pleno)"
                : ann.tieneXTitularDominio
                ? "Titular de dominio (X)"
                : "Adquirente en última tradición"
          });
        }
      }
      if (list.length > 0) return list;
    }
  }
  return [];
}

/**
 * Motor jurídico determinístico: audita anotación por anotación, cruza gravámenes vs cancelaciones,
 * evalúa tradición de 10 y 20 años, detecta Falsa Tradición (0600) y emite el Semáforo VECY.
 */
export function auditCtlParsedDocument(
  parsed: CtlParsedDocument,
  sourceType: "PDF" | "IMAGEN" | "TEXTO" = "PDF"
): CtlTitleStudyReport {
  const sorted = [...(parsed.anotaciones || [])].sort((a, b) => a.numero - b.numero);
  const auditItems: CtlAnnotationAuditItem[] = [];
  const auditByNumber = new Map<number, CtlAnnotationAuditItem>();

  const encumbranceCategories = new Set<CtlAnnotationCategory>([
    "GRAVAMEN_HIPOTECA",
    "MEDIDA_CAUTELAR_EMBARGO",
    "MEDIDA_CAUTELAR_DEMANDA",
    "PROHIBICION_ENAJENAR",
    "LIMITACION_PATRIMONIO_FAMILIA",
    "LIMITACION_VIVIENDA_FAMILIAR",
    "LIMITACION_CONDICION_RESOLUTORIA",
    "LIMITACION_USUFRUCTO",
    "LIMITACION_SERVIDUMBRE",
    "LIMITACION_FIDEICOMISO",
    "SUCESION_ILIQUIDA",
    "FALSA_TRADICION"
  ]);

  // Paso 1 & 2: clasificar en orden cronológico y cruzar cancelaciones
  for (const ann of sorted) {
    const cls = classifyCtlAnnotation(ann);
    const annYear = ann.year ?? extractYearFromDateString(ann.fecha);
    if (!ann.year && annYear) ann.year = annYear;

    if (cls.categoria === "CANCELACION") {
      let targetItem: CtlAnnotationAuditItem | undefined;

      // a) Referencia explícita por número de anotación cancelada
      if (ann.anotacionCanceladaRef) {
        const candidate = auditByNumber.get(ann.anotacionCanceladaRef);
        if (candidate && (candidate.estado === "ACTIVA" || candidate.estado === "ALERTA_CRITICA")) {
          targetItem = candidate;
        }
      }

      // b) Búsqueda retrospectiva por categoría + coincidencia de acreedor/partes
      if (!targetItem) {
        const candidates = [...auditItems]
          .reverse()
          .filter(
            (item) =>
              (item.estado === "ACTIVA" || item.estado === "ALERTA_CRITICA") &&
              encumbranceCategories.has(item.categoria) &&
              (cls.cancelsTargetCategory === "ANY" || item.categoria === cls.cancelsTargetCategory)
          );

        if (candidates.length > 0) {
          targetItem =
            candidates.find(
              (c) =>
                entitiesOverlap(`${ann.de || ""} ${ann.a || ""}`, `${c.de || ""} ${c.a || ""}`) ||
                entitiesOverlap(ann.especificacion, c.especificacion)
            ) || candidates[0];
        }
      }

      if (targetItem) {
        targetItem.estado = "CANCELADA";
        targetItem.canceladaPorAnotacion = ann.numero;
        targetItem.impactoJuridico = `${targetItem.impactoJuridico} [SANEADA: Cancelada en Anotación #${ann.numero}]`;
      }

      const cancelAudit: CtlAnnotationAuditItem = {
        numero: ann.numero,
        fecha: ann.fecha || "Sin fecha",
        codigoNaturaleza: ann.codigoNaturaleza || extractNatCode(undefined, ann.especificacion),
        especificacion: ann.especificacion,
        categoria: "CANCELACION",
        estado: "INFORMATIVA",
        cancelaAnotacion: targetItem?.numero ?? ann.anotacionCanceladaRef ?? null,
        de: ann.de,
        a: ann.a,
        impactoJuridico: targetItem
          ? `Cancela registralmente la Anotación #${targetItem.numero} (${targetItem.especificacion}).`
          : cls.impactoBase
      };
      auditItems.push(cancelAudit);
      auditByNumber.set(ann.numero, cancelAudit);
      continue;
    }

    // Saneamiento legal sobre actuaciones previas (ej. 0151 Pertenencia / Ley 1561 sanea Falsa Tradición previa; 0101 Adjudicación sanea Sucesión previa)
    const upperSpec = normalizeUpperNoAccents(`${ann.codigoNaturaleza || ""} ${ann.especificacion}`);
    const curesFalsaTradicion =
      /^0151/.test(ann.codigoNaturaleza || "") ||
      /\b(?:DECLARACION\s+DE\s+PERTENENCIA|SANEAMIENTO\s+(?:DE\s+)?TITULACION|LEY\s+1561|PRESCRIPCION\s+ADQUISITIVA)\b/.test(
        upperSpec
      );
    const curesSucesion =
      /^0101/.test(ann.codigoNaturaleza || "") ||
      /\b(?:ADJUDICACION\s+(?:EN\s+)?SUCESION|PARTICION\s+(?:DE\s+)?HERENCIA)\b/.test(upperSpec);

    if (curesFalsaTradicion) {
      for (const prev of auditItems) {
        if (prev.categoria === "FALSA_TRADICION" && prev.estado !== "CANCELADA") {
          prev.estado = "CANCELADA";
          prev.canceladaPorAnotacion = ann.numero;
          prev.impactoJuridico += ` [SANEADA por título pleno en Anotación #${ann.numero}]`;
        }
      }
    }
    if (curesSucesion) {
      for (const prev of auditItems) {
        if (prev.categoria === "SUCESION_ILIQUIDA" && prev.estado !== "CANCELADA") {
          prev.estado = "CANCELADA";
          prev.canceladaPorAnotacion = ann.numero;
          prev.impactoJuridico += ` [LIQUIDADA en Anotación #${ann.numero}]`;
        }
      }
    }

    // Respetar si el propio documento SNR ya marcaba explícitamente CANCELADA / INVALIDA la anotación
    const explicitCancelledInDoc = /\b(?:CANCELADA|INVALIDA|ANULADA|EXTINGUIDA)\b/i.test(ann.estadoTexto || "");

    let estado: CtlAnnotationAuditItem["estado"] = "INFORMATIVA";
    if (explicitCancelledInDoc) {
      estado = "CANCELADA";
    } else if (
      cls.categoria === "FALSA_TRADICION" ||
      cls.categoria === "MEDIDA_CAUTELAR_EMBARGO" ||
      cls.categoria === "MEDIDA_CAUTELAR_DEMANDA" ||
      cls.categoria === "PROHIBICION_ENAJENAR" ||
      cls.categoria === "SUCESION_ILIQUIDA"
    ) {
      estado = "ALERTA_CRITICA";
    } else if (
      cls.categoria === "GRAVAMEN_HIPOTECA" ||
      cls.categoria === "LIMITACION_PATRIMONIO_FAMILIA" ||
      cls.categoria === "LIMITACION_VIVIENDA_FAMILIAR" ||
      cls.categoria === "LIMITACION_CONDICION_RESOLUTORIA" ||
      cls.categoria === "LIMITACION_USUFRUCTO" ||
      cls.categoria === "LIMITACION_SERVIDUMBRE" ||
      cls.categoria === "LIMITACION_FIDEICOMISO"
    ) {
      estado = "ACTIVA";
    } else if (cls.categoria === "TRADICION_DOMINIO") {
      estado = "HISTORICA_TRADICION";
    }

    const item: CtlAnnotationAuditItem = {
      numero: ann.numero,
      fecha: ann.fecha || "Sin fecha",
      codigoNaturaleza: ann.codigoNaturaleza || extractNatCode(undefined, ann.especificacion),
      especificacion: ann.especificacion,
      categoria: cls.categoria,
      estado,
      de: ann.de,
      a: ann.a,
      impactoJuridico: cls.impactoBase
    };
    auditItems.push(item);
    auditByNumber.set(ann.numero, item);
  }

  // Paso 3: Categorías resultantes
  const alertasCriticasVigentes = auditItems.filter((a) => a.estado === "ALERTA_CRITICA");
  const gravamenesVigentes = auditItems.filter(
    (a) => a.estado === "ACTIVA" && a.categoria === "GRAVAMEN_HIPOTECA"
  );
  const limitacionesVigentes = auditItems.filter(
    (a) => a.estado === "ACTIVA" && a.categoria !== "GRAVAMEN_HIPOTECA"
  );
  const gravamenesCancelados = auditItems.filter(
    (a) => a.estado === "CANCELADA" && encumbranceCategories.has(a.categoria)
  );

  // Paso 4: Análisis de Tradición (10 y 20 años) + Falsa Tradición (0600)
  const refYear =
    extractYearFromDateString(parsed.fechaImpresion) || new Date().getFullYear();
  const years = sorted
    .map((a) => a.year ?? extractYearFromDateString(a.fecha))
    .filter((y): y is number => typeof y === "number" && y >= 1900);
  const compYear = extractYearFromDateString(parsed.complementacionResumen);
  const earliestYear =
    years.length > 0
      ? compYear && compYear < Math.min(...years)
        ? compYear
        : Math.min(...years)
      : compYear;

  const aniosHistorialEnFolio = earliestYear ? Math.max(0, refYear - earliestYear) : null;
  const anotacionesFalsa = auditItems
    .filter((a) => a.categoria === "FALSA_TRADICION")
    .map((a) => a.numero);
  const falsaTradicionActiva = auditItems.some(
    (a) => a.categoria === "FALSA_TRADICION" && a.estado === "ALERTA_CRITICA"
  );
  const tieneFalsaTradicion = anotacionesFalsa.length > 0;
  const falsaTradicionSaneada = tieneFalsaTradicion && !falsaTradicionActiva;

  const hasTradicionPlena = auditItems.some((a) => a.categoria === "TRADICION_DOMINIO");
  const firstParsedNum = sorted[0]?.numero ?? null;
  const documentosFaltantesOIncompletos: string[] = [];

  if (sorted.length === 0) {
    documentosFaltantesOIncompletos.push(
      "No fue posible leer anotaciones estructuradas del certificado; enviar el PDF original descargado de la SNR o fotografías legibles de todas las páginas."
    );
  } else if (firstParsedNum && firstParsedNum > 1) {
    documentosFaltantesOIncompletos.push(
      `Las páginas recibidas inician en la Anotación #${firstParsedNum}; faltan las anotaciones #1 a #${firstParsedNum - 1} para verificar el historial completo.`
    );
  }
  if (
    parsed.totalAnotacionesReportadas &&
    sorted.length < parsed.totalAnotacionesReportadas &&
    sorted.length > 0
  ) {
    documentosFaltantesOIncompletos.push(
      `El folio reporta ${parsed.totalAnotacionesReportadas} anotaciones, pero solo se procesaron ${sorted.length}. Verificar páginas intermedias o finales.`
    );
  }

  const mentionsFolioMatriz = /\b(?:FOLIO\s+MATRIZ|DESENGLOBE|MATRIZ|SEGREGACION)\b/i.test(
    `${parsed.complementacionResumen || ""} ${sorted.map((s) => s.especificacion).join(" ")}`
  );

  const observacionesTradicion: string[] = [];
  if (falsaTradicionActiva) {
    observacionesTradicion.push(
      `ALERTA ROJA FALSA TRADICIÓN (Cód. 0600 / Derechos y Acciones) vigente en anotación(es) #${anotacionesFalsa.join(", #")}. No acredita dominio pleno.`
    );
  } else if (falsaTradicionSaneada) {
    observacionesTradicion.push(
      `Falsa tradición histórica en anotación(es) #${anotacionesFalsa.join(", #")}, saneada posteriormente mediante título de dominio pleno.`
    );
  }

  const tradicion10AnosContinua =
    !falsaTradicionActiva &&
    hasTradicionPlena &&
    ((aniosHistorialEnFolio !== null && aniosHistorialEnFolio >= 10) || mentionsFolioMatriz);
  const tradicion20AnosContinua =
    !falsaTradicionActiva &&
    hasTradicionPlena &&
    aniosHistorialEnFolio !== null &&
    aniosHistorialEnFolio >= 20;

  if (aniosHistorialEnFolio !== null) {
    observacionesTradicion.push(
      `Historial verificable en folio/complementación desde ${earliestYear} (${aniosHistorialEnFolio} años al corte ${refYear}).`
    );
  } else {
    observacionesTradicion.push(
      "No se detectó año legible en las anotaciones iniciales para cuantificar el rango exacto de 10 y 20 años."
    );
  }
  if (aniosHistorialEnFolio !== null && aniosHistorialEnFolio < 20 && mentionsFolioMatriz) {
    observacionesTradicion.push(
      "El folio proviene de desenglobe/matriz reciente; para estudio de títulos bancario estricto a 20 años debe revisarse también el folio de mayor extensión (matriz)."
    );
  }

  const traditionCount = auditItems.filter((a) => a.categoria === "TRADICION_DOMINIO").length;
  const cadenaDominioResumen = falsaTradicionActiva
    ? `Cadena interrumpida o defectuosa por FALSA TRADICIÓN sin sanear (${traditionCount} actos de dominio pleno detectados).`
    : hasTradicionPlena
    ? `Cadena traslaticia continua de dominio pleno (${traditionCount} acto(s) de tradición identificados, ${gravamenesCancelados.length} cancelaciones cruzadas).`
    : "No se identificaron actos traslaticios de dominio pleno en el fragmento analizado.";

  // Paso 5: Metadatos y Propietarios
  const propietariosFinal =
    parsed.propietariosActuales && parsed.propietariosActuales.length > 0
      ? parsed.propietariosActuales
      : inferOwnersFromAnnotations(sorted);

  const estadoFolioUpper = normalizeUpperNoAccents(parsed.estadoFolio || "ACTIVO");
  const isFolioClosedOrVoid = /\b(?:CERRADO|ANULADO)\b/.test(estadoFolioUpper);
  if (isFolioClosedOrVoid) {
    documentosFaltantesOIncompletos.push(
      `El folio registra estado "${parsed.estadoFolio}"; debe solicitarse el nuevo folio derivado o matrícula abierta vigente.`
    );
  }

  const metadata: CtlPropertyMetadata = {
    matriculaInmobiliaria: parsed.matriculaInmobiliaria || "No legible / Por confirmar en folio",
    orip: parsed.orip || "No especificada en el fragmento",
    fechaImpresion: parsed.fechaImpresion || "No legible / Verificar vigencia (< 30 días)",
    estadoFolio: parsed.estadoFolio || "ACTIVO (inferido)",
    departamentoMunicipio: parsed.departamentoMunicipio || "Colombia",
    chip: parsed.chip || "No reportado en CTL",
    cedulaCatastral: parsed.cedulaCatastral || "No reportada en CTL",
    direccion: parsed.direccion || "No especificada en encabezado",
    tipoPredio: parsed.tipoPredio || "Urbano / Inmueble registrado",
    complementacionResumen: parsed.complementacionResumen || "Sin complementación detallada en páginas enviadas.",
    propietariosActuales: propietariosFinal,
    totalAnotacionesReportadas: parsed.totalAnotacionesReportadas ?? (sorted.length || null)
  };

  // Paso 6: Semáforo y Recomendaciones Notariales Accionables
  const recomendacionesNotariales: string[] = [];

  if (falsaTradicionActiva) {
    recomendacionesNotariales.push(
      "BLOQUEO POR FALSA TRADICIÓN (Cód. 0600): Abstenerse de firmar promesa o compraventa directa de dominio pleno. Exigir saneamiento previo de la titulación (Ley 1561 de 2012 o proceso de declaración de pertenencia)."
    );
  }
  if (alertasCriticasVigentes.some((a) => a.categoria === "MEDIDA_CAUTELAR_EMBARGO")) {
    recomendacionesNotariales.push(
      "BLOQUEO POR EMBARGO VIGENTE (Art. 1521 C.C.): Existe objeto ilícito en la enajenación. Exigir pago de la obligación, auto judicial de terminación/desembargo y registro efectivo del oficio de levantamiento en la ORIP antes de escriturar."
    );
  }
  if (alertasCriticasVigentes.some((a) => a.categoria === "MEDIDA_CAUTELAR_DEMANDA")) {
    recomendacionesNotariales.push(
      "INSCRIPCIÓN DE DEMANDA VIGENTE (Art. 591 CGP): NO escriturar hasta que el vendedor aporte constancia de terminación del proceso y cancelación registral de la medida cautelar."
    );
  }
  if (alertasCriticasVigentes.some((a) => a.categoria === "PROHIBICION_ENAJENAR")) {
    recomendacionesNotariales.push(
      "PROHIBICIÓN DE ENAJENAR / MEDIDA PENAL O VIS-VIP: Inmueble impedido para transferencia; validar levantamiento oficial ante entidad competente."
    );
  }
  if (alertasCriticasVigentes.some((a) => a.categoria === "SUCESION_ILIQUIDA")) {
    recomendacionesNotariales.push(
      "SUCESIÓN ILÍQUIDA: Culminar primero el trámite sucesoral (notarial o judicial) y registrar la escritura/sentencia de adjudicación (Cód. 0101) antes de vender."
    );
  }

  if (gravamenesVigentes.length > 0) {
    const nums = gravamenesVigentes.map((g) => `#${g.numero}`).join(", ");
    recomendacionesNotariales.push(
      `CANCELACIÓN SIMULTÁNEA DE HIPOTECA (${nums}): Solicitar certificación de saldo y paz y salvo al acreedor hipotecario y otorgar minuta de cancelación simultánea o subrogación bancaria en la misma escritura pública.`
    );
  }
  if (limitacionesVigentes.some((l) => l.categoria === "LIMITACION_PATRIMONIO_FAMILIA")) {
    recomendacionesNotariales.push(
      "LEVANTAMIENTO DE PATRIMONIO DE FAMILIA (Ley 70/1931): Debe cancelarse mediante escritura pública; si existen hijos menores de edad, exige autorización previa de Juez de Familia o Defensor de Familia (ICBF)."
    );
  }
  if (limitacionesVigentes.some((l) => l.categoria === "LIMITACION_VIVIENDA_FAMILIAR")) {
    recomendacionesNotariales.push(
      "CANCELACIÓN DE AFECTACIÓN A VIVIENDA FAMILIAR (Ley 258/1996): Exigir la comparecencia y firma de AMBOS cónyuges o compañeros permanentes en la escritura de levantamiento/compraventa."
    );
  }
  if (limitacionesVigentes.some((l) => l.categoria === "LIMITACION_CONDICION_RESOLUTORIA")) {
    recomendacionesNotariales.push(
      "CONDICIÓN RESOLUTORIA VIGENTE: Exigir comparecencia del vendedor anterior o acreedor en escritura para declarar cumplido el pago/obligación y cancelar la condición."
    );
  }
  if (limitacionesVigentes.some((l) => l.categoria === "LIMITACION_USUFRUCTO")) {
    recomendacionesNotariales.push(
      "USUFRUCTO VIGENTE: El titular solo ostenta nuda propiedad; debe concurrir el usufructuario a renunciar/cancelar el usufructo en la misma escritura (o aportar registro civil de defunción si falleció)."
    );
  }
  if (limitacionesVigentes.some((l) => l.categoria === "LIMITACION_FIDEICOMISO")) {
    recomendacionesNotariales.push(
      "FIDEICOMISO CIVIL VIGENTE: Requiere revocatoria expresa o comparecencia del constituyente/fiduciario y fideicomisario conforme a la escritura constitutiva."
    );
  }
  if (limitacionesVigentes.some((l) => l.categoria === "LIMITACION_SERVIDUMBRE")) {
    recomendacionesNotariales.push(
      "SERVIDUMBRE INSCRITA: Revisar escritura de constitución para validar ubicación exacta y confirmar que no restringe el uso proyectado."
    );
  }

  let verdictCode: CtlVerdictCode = "VERDE";
  let verdictLabel: CtlVerdictLabel = "🟢 VIABLE PARA COMPRAVENTA Y CRÉDITO";
  let verdictEmoji: "🟢" | "🟡" | "🔴" = "🟢";
  let riskHeadline =
    "Folio saneado con cadena traslaticia de dominio pleno y sin gravámenes o medidas cautelares vigentes.";

  if (alertasCriticasVigentes.length > 0 || isFolioClosedOrVoid || sorted.length === 0) {
    verdictCode = "ROJO";
    verdictLabel = "🔴 RIESGO CRÍTICO / BLOQUEO DE NEGOCIO";
    verdictEmoji = "🔴";
    riskHeadline = falsaTradicionActiva
      ? "Se detectó FALSA TRADICIÓN (Cód. 0600 / derechos y acciones sin dominio pleno) o bloqueo registral crítico."
      : sorted.length === 0
      ? "No fue posible verificar las anotaciones registrales del certificado para certificar viabilidad."
      : `Existen ${alertasCriticasVigentes.length} alerta(s) crítica(s) vigente(s) (embargo, demanda, prohibición o sucesión ilíquida) que impiden el cierre inmediato.`;
  } else if (
    gravamenesVigentes.length > 0 ||
    limitacionesVigentes.length > 0 ||
    documentosFaltantesOIncompletos.length > 0 ||
    !tradicion10AnosContinua
  ) {
    verdictCode = "AMARILLO";
    verdictLabel = "🟡 VIABLE CON SANEAMIENTO PREVIO EN ESCRITURA";
    verdictEmoji = "🟡";
    riskHeadline =
      gravamenesVigentes.length > 0 || limitacionesVigentes.length > 0
        ? `Presenta ${gravamenesVigentes.length + limitacionesVigentes.length} gravamen(es)/limitación(es) vigente(s) subsanables mediante escritura de cancelación simultánea o autorización legal.`
        : "Tradición sin gravámenes bloqueantes en lo leído, pero requiere completar páginas o validar folio matriz a 10/20 años.";
  } else {
    recomendacionesNotariales.push(
      "Verificar vigencia del CTL (< 30 días), paz y salvo de impuesto predial e IDU (valorización), administración de PH (si aplica) y coincidencia exacta de cédulas y porcentajes de los vendedores en notaría."
    );
  }

  if (parsed.notasOCR) {
    recomendacionesNotariales.push(`Nota de lectura documental: ${parsed.notasOCR}`);
  }

  const tradition: CtlTraditionAnalysis = {
    tradicion10AnosContinua,
    tradicion20AnosContinua,
    anioPrimeraAnotacion: earliestYear,
    aniosHistorialEnFolio,
    cadenaDominioResumen,
    tieneFalsaTradicion,
    falsaTradicionSaneada,
    anotacionesFalsaTradicion: anotacionesFalsa,
    observacionesTradicion
  };

  const ownersText =
    propietariosFinal.length > 0
      ? propietariosFinal
          .map(
            (o) =>
              `• ${o.nombre}${o.identificacion ? ` (ID: ${o.identificacion})` : ""}${o.porcentaje ? ` — *${o.porcentaje}*` : ""}${o.tipoDerecho ? ` [${o.tipoDerecho}]` : ""}`
          )
          .join("\n")
      : "• No fue posible confirmar el titular actual con (X) en el fragmento analizado.";

  const activeItemsText =
    [...alertasCriticasVigentes, ...gravamenesVigentes, ...limitacionesVigentes].length > 0
      ? [...alertasCriticasVigentes, ...gravamenesVigentes, ...limitacionesVigentes]
          .map((item) => {
            const icon = item.estado === "ALERTA_CRITICA" ? "🔴" : "🟡";
            return `${icon} *Anot. #${item.numero}* (${item.fecha}${item.codigoNaturaleza ? ` | Cód. ${item.codigoNaturaleza}` : ""}): ${item.especificacion}\n   ↳ _${item.impactoJuridico}_`;
          })
          .join("\n")
      : "✅ Sin gravámenes, embargos ni limitaciones vigentes detectadas.";

  const cancelledItemsText =
    gravamenesCancelados.length > 0
      ? gravamenesCancelados
          .slice(0, 8)
          .map(
            (c) =>
              `• ✅ *Anot. #${c.numero}* (${c.especificacion}) → Cancelada en *Anot. #${c.canceladaPorAnotacion ?? "posterior"}*`
          )
          .join("\n")
      : "• No se registran gravámenes históricos con cancelación cruzada.";

  const auditPreview =
    auditItems.length > 0
      ? auditItems
          .slice(0, 12)
          .map((item) => {
            const tag =
              item.estado === "ALERTA_CRITICA"
                ? "🔴 CRÍTICA"
                : item.estado === "ACTIVA"
                ? "🟡 VIGENTE"
                : item.estado === "CANCELADA"
                ? "✅ CANCELADA"
                : item.estado === "HISTORICA_TRADICION"
                ? "📜 TRADICIÓN"
                : "ℹ️ INFO";
            return `• *#${item.numero}* [${item.fecha}] ${item.codigoNaturaleza ? `(${item.codigoNaturaleza}) ` : ""}${item.especificacion} — *${tag}*`;
          })
          .join("\n") +
        (auditItems.length > 12 ? `\n_(+ ${auditItems.length - 12} anotaciones adicionales detalladas en el PDF adjunto)_` : "")
      : "• Sin anotaciones legibles para listar.";

  const recsText = recomendacionesNotariales.map((r, i) => `${i + 1}. ${r}`).join("\n");
  const missingText =
    documentosFaltantesOIncompletos.length > 0
      ? `\n\n⚠️ *VALIDACIÓN DOCUMENTAL PENDIENTE:*\n${documentosFaltantesOIncompletos.map((d) => `• ${d}`).join("\n")}`
      : "";

  const patrimonialRiskBlock =
    `🛡️ *ALERTA DE RIESGO PATRIMONIAL Y ACOMPAÑAMIENTO VECY:*\n` +
    `Este estudio automatizado es una auditoría jurídica preliminar y *NO sustituye la verificación documental integral previa a la firma de promesa o escritura pública*. Un gravamen no advertido, falsa tradición o embargo de último minuto puede comprometer todo tu patrimonio.\n` +
    `📲 Para revisión notarial definitiva, saneamiento de títulos o cierre blindado con *Eduardo Rivera y Jani Alves — VECY BIENES RAÍCES*, contáctanos directamente al *${BROKER_OFFICIAL_PHONE}* 👉 ${BROKER_OFFICIAL_WHATSAPP_LINK}`;

  const whatsappSummary =
    `⚖️ *ESTUDIO DE TÍTULOS SNR — VECY BIENES RAÍCES*\n\n` +
    `*DICTAMEN JURÍDICO:* ${verdictLabel}\n` +
    `_${riskHeadline}_\n\n` +
    `📌 *DATOS DEL FOLIO DE MATRÍCULA:*\n` +
    `• *Matrícula:* ${metadata.matriculaInmobiliaria}\n` +
    `• *ORIP:* ${metadata.orip}\n` +
    `• *Estado / Impresión:* ${metadata.estadoFolio} | ${metadata.fechaImpresion}\n` +
    `• *CHIP / Céd. Catastral:* ${metadata.chip} / ${metadata.cedulaCatastral}\n` +
    `• *Dirección:* ${metadata.direccion}\n\n` +
    `👤 *PROPIETARIOS ACTUALES DETECTADOS:*\n${ownersText}\n\n` +
    `🕰️ *TRADICIÓN (10 Y 20 AÑOS) Y FALSA TRADICIÓN (0600):*\n` +
    `• *Tradición 10 años:* ${tradicion10AnosContinua ? "✅ Continua" : "⚠️ Incompleta / No acreditada"}\n` +
    `• *Tradición 20 años:* ${tradicion20AnosContinua ? "✅ Continua" : "⚠️ Parcial o folio < 20 años"}\n` +
    `• *Falsa Tradición (0600):* ${falsaTradicionActiva ? "🔴 DETECTADA VIGENTE" : falsaTradicionSaneada ? "🟡 Histórica ya saneada" : "✅ No detectada"}\n` +
    `• ${cadenaDominioResumen}\n\n` +
    `🔎 *GRAVÁMENES, EMBARGOS Y LIMITACIONES ACTIVAS:*\n${activeItemsText}\n\n` +
    `♻️ *CRUCE CON CANCELACIONES HISTÓRICAS:*\n${cancelledItemsText}\n\n` +
    `📋 *RESUMEN DE ANOTACIONES AUDITADAS (${auditItems.length}):*\n${auditPreview}\n\n` +
    `📝 *RECOMENDACIONES NOTARIALES ACCIONABLES:*\n${recsText}` +
    `${missingText}\n\n` +
    `📄 *Adjunto te entrego el Concepto Jurídico Completo en PDF Membretado de VECY BIENES RAÍCES.*\n\n` +
    `${patrimonialRiskBlock}\n\n` +
    `Un servicio de cortesía de *VECY BIENES RAÍCES* 🤝.`;

  const fullReportText =
    `ESTUDIO DE TITULOS SNR — VECY BIENES RAICES\n` +
    `DICTAMEN: ${verdictLabel}\n` +
    `RESUMEN: ${riskHeadline}\n\n` +
    `MATRICULA: ${metadata.matriculaInmobiliaria} | ORIP: ${metadata.orip}\n` +
    `FECHA IMPRESION: ${metadata.fechaImpresion} | ESTADO: ${metadata.estadoFolio}\n` +
    `CHIP: ${metadata.chip} | CEDULA CATASTRAL: ${metadata.cedulaCatastral}\n` +
    `DIRECCION: ${metadata.direccion}\n` +
    `COMPLEMENTACION: ${metadata.complementacionResumen}\n\n` +
    `PROPIETARIOS:\n${propietariosFinal.map((o) => `- ${o.nombre} ${o.porcentaje || ""}`).join("\n") || "- Por confirmar"}\n\n` +
    `TRADICION 10/20 ANOS:\n${observacionesTradicion.join("\n")}\n\n` +
    `ANOTACIONES AUDITADAS:\n` +
    auditItems
      .map(
        (a) =>
          `#${a.numero} [${a.fecha}] (${a.codigoNaturaleza || "S/C"}) ${a.especificacion} -> ${a.estado} | ${a.impactoJuridico}`
      )
      .join("\n") +
    `\n\nRECOMENDACIONES:\n${recsText}`;

  return {
    metadata,
    verdictCode,
    verdictLabel,
    verdictEmoji,
    riskHeadline,
    tradition,
    gravamenesVigentes,
    limitacionesVigentes,
    alertasCriticasVigentes,
    gravamenesCancelados,
    auditoriaAnotaciones: auditItems,
    recomendacionesNotariales,
    documentosFaltantesOIncompletos,
    whatsappSummary,
    fullReportText,
    analyzedAtIso: new Date().toISOString(),
    sourceType
  };
}

/**
 * Extractor multimodal Gemini para PDFs e imágenes de Certificados de Tradición y Libertad (SNR Colombia).
 * Discrimina primero si el documento adjunto es realmente un CTL SNR para no interferir con flyers o listados de inmuebles.
 */
export async function extractCtlDocumentWithGemini(params: {
  pdfBuffer?: string;
  pdfMimeType?: string;
  imageBuffer?: string;
  userPromptText?: string;
}): Promise<CtlParsedDocument | null> {
  const { pdfBuffer, pdfMimeType, imageBuffer, userPromptText } = params;
  if (!pdfBuffer && !imageBuffer) return null;

  const systemPrompt =
    `Eres un abogado experto en Derecho Inmobiliario Colombiano y Registro de Instrumentos Públicos (Superintendencia de Notariado y Registro - SNR).\n` +
    `Tu tarea es analizar la imagen o PDF adjunto para determinar:\n` +
    `1) PRIMERO si corresponde real y legítimamente a un **Certificado de Tradición y Libertad (CTL)** de la SNR de Colombia (folio de matrícula inmobiliaria).\n` +
    `   - Si es un flyer comercial de venta/arriendo, una foto de un apartamento/casa, una factura predial, una cédula, o un PDF comercial de listado de inmuebles (ej. "ARRIENDO CARRERA 17"), DEBES responder con "esCertificadoTradicionLibertad": false y "razonNoEsCtl" explicándolo.\n` +
    `2) Si SÍ es un Certificado de Tradición y Libertad (CTL), extrae con precisión quirúrgica TODA la información visible:\n` +
    `   - matriculaInmobiliaria (ej: 50N-20145890), orip, fechaImpresion, estadoFolio, departamentoMunicipio, chip, cedulaCatastral, direccion, tipoPredio, complementacionResumen, totalAnotacionesReportadas.\n` +
    `   - propietariosActuales (los titulares con "X" o señalados como propietarios actuales, con identificación y porcentaje si aparece).\n` +
    `   - anotaciones: CADA anotación legible, en orden numérico, con numero (entero), fecha, codigoNaturaleza (4 dígitos ej. "0125", "0600", "0205", "0427", "0843"), especificacion exacta, valor, de, a, tieneXTitularDominio (boolean), anotacionCanceladaRef (número entero si dice "SE CANCELA ANOTACIÓN No. X", si no null), estadoTexto ("VIGENTE" o "CANCELADA" si el folio lo imprime).\n` +
    `Responde ÚNICAMENTE en JSON válido siguiendo el esquema.`;

  const schema = {
    type: "object",
    properties: {
      esCertificadoTradicionLibertad: { type: "boolean" },
      razonNoEsCtl: { type: "string" },
      matriculaInmobiliaria: { type: "string" },
      orip: { type: "string" },
      fechaImpresion: { type: "string" },
      estadoFolio: { type: "string" },
      departamentoMunicipio: { type: "string" },
      chip: { type: "string" },
      cedulaCatastral: { type: "string" },
      direccion: { type: "string" },
      tipoPredio: { type: "string" },
      complementacionResumen: { type: "string" },
      totalAnotacionesReportadas: { type: "number" },
      notasOCR: { type: "string" },
      propietariosActuales: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nombre: { type: "string" },
            identificacion: { type: "string" },
            porcentaje: { type: "string" },
            tipoDerecho: { type: "string" }
          },
          required: ["nombre"]
        }
      },
      anotaciones: {
        type: "array",
        items: {
          type: "object",
          properties: {
            numero: { type: "number" },
            fecha: { type: "string" },
            radicacion: { type: "string" },
            codigoNaturaleza: { type: "string" },
            especificacion: { type: "string" },
            valor: { type: "string" },
            de: { type: "string" },
            a: { type: "string" },
            tieneXTitularDominio: { type: "boolean" },
            anotacionCanceladaRef: { type: "number" },
            estadoTexto: { type: "string" }
          },
          required: ["numero", "especificacion"]
        }
      }
    },
    required: ["esCertificadoTradicionLibertad", "anotaciones"]
  };

  try {
    const res = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            userPromptText?.trim() ||
            "Analiza este archivo adjunto. Confirma si es un Certificado de Tradición y Libertad (SNR) y, de serlo, extrae metadatos, propietarios y TODAS las anotaciones."
        }
      ],
      responseFormat: { type: "json_object", schema },
      highReasoning: true,
      temperature: 0.1,
      imageBuffer,
      pdfBuffer,
      pdfMimeType: pdfBuffer ? pdfMimeType || "application/pdf" : undefined
    });

    const content = res?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as CtlParsedDocument;
    if (typeof parsed.esCertificadoTradicionLibertad !== "boolean") return null;
    parsed.anotaciones = Array.isArray(parsed.anotaciones) ? parsed.anotaciones : [];
    return parsed;
  } catch (err: any) {
    console.warn("[JanIA-CTL] ⚠️ Error en extractor multimodal Gemini:", err?.message || err);
    return null;
  }
}

export function buildCtlMediaGuidanceMessage(): string {
  return (
    `⚖️ *ESTUDIO DE TÍTULOS SNR — VECY BIENES RAÍCES*\n\n` +
    `¡Con mucho gusto realizo tu *Estudio de Títulos preliminar*! 📋\n\n` +
    `Para auditar el folio anotación por anotación (tradición a 10 y 20 años, detección de falsa tradición código 0600, cruce de gravámenes/embargos con sus cancelaciones y dictamen en PDF membretado), envíame por favor:\n` +
    `1. El *PDF original del Certificado de Tradición y Libertad (SNR)*, o\n` +
    `2. *Fotografías nítidas de todas las páginas* desde el encabezado hasta la última anotación.\n` +
    `_(También puedes pegar aquí el texto completo de las anotaciones si ya lo extrajiste)._`
  );
}

/**
 * Orquestador principal de Estudio de Títulos para DM y Grupos de WhatsApp.
 * - Si hay PDF/imagen: valida primero que sea un CTL real SNR (vía Gemini multimodal o texto extraído del PDF digital).
 * - Si no es CTL (ej. flyer comercial o PDF de listado en arriendo), retorna `isCtlDocument: false` para no interferir con moderación/flyer.
 * - Si es CTL o texto pegado con anotaciones SNR: ejecuta auditoría jurídica completa + genera PDF membretado VECY.
 */
export async function analyzeCtlFromWhatsAppInput(params: {
  text?: string | null;
  imageBuffer?: string;
  pdfBuffer?: string;
  pdfMimeType?: string;
  requesterName?: string | null;
}): Promise<CtlWhatsAppExecutionResult> {
  const cleanText = String(params.text || "").trim();
  const hasPdf = Boolean(params.pdfBuffer);
  const hasImage = Boolean(params.imageBuffer);
  const textHasMarkers = hasCtlTextMarkers(cleanText);
  const explicitRequest = isExplicitCtlStudyRequest(cleanText);

  // Caso A: Ni media ni marcadores ni solicitud explícita
  if (!hasPdf && !hasImage && !textHasMarkers && !explicitRequest) {
    return {
      isCtlRequest: false,
      isCtlDocument: false,
      needsMediaGuidance: false,
      responseText: "",
      reactionEmoji: "👍"
    };
  }

  // Caso B: Pidió explícitamente estudio de títulos sin enviar archivo ni pegar anotaciones
  if (!hasPdf && !hasImage && !textHasMarkers && explicitRequest) {
    return {
      isCtlRequest: true,
      isCtlDocument: false,
      needsMediaGuidance: true,
      responseText: buildCtlMediaGuidanceMessage(),
      reactionEmoji: "📋"
    };
  }

  // Caso C: Texto pegado directo con estructura de CTL (sin archivo adjunto)
  if (!hasPdf && !hasImage && textHasMarkers) {
    const parsed = parseCtlFromPlainText(cleanText);
    if (!parsed.esCertificadoTradicionLibertad) {
      return {
        isCtlRequest: explicitRequest,
        isCtlDocument: false,
        needsMediaGuidance: false,
        responseText: "",
        reactionEmoji: "👍"
      };
    }
    const report = auditCtlParsedDocument(parsed, "TEXTO");
    let pdfBuffer: Buffer | undefined;
    let pdfFileName: string | undefined;
    try {
      const pdfRes = await generateCtlStudyPdf(report, {
        requestedBy: params.requesterName || undefined
      });
      pdfBuffer = pdfRes.pdfBuffer;
      pdfFileName = pdfRes.fileName;
    } catch (pdfErr: any) {
      console.warn("[JanIA-CTL] ⚠️ Error generando PDF de Estudio de Títulos:", pdfErr?.message || pdfErr);
    }
    return {
      isCtlRequest: true,
      isCtlDocument: true,
      needsMediaGuidance: false,
      report,
      responseText: report.whatsappSummary,
      pdfBuffer,
      pdfFileName,
      reactionEmoji: report.verdictEmoji
    };
  }

  // Caso D: Llega PDF o Imagen
  const pdfExtractedText = hasPdf ? extractTextSnippetsFromPdfBuffer(params.pdfBuffer) : "";
  const pdfTextLooksLikeCtl = hasCtlTextMarkers(pdfExtractedText);

  // Si es PDF digital con texto abundante claramente comercial (no CTL) y el usuario ni siquiera pidió estudio de títulos,
  // evitar gastar llamada LLM innecesaria si es un listado evidente? Cuidado con CMaps raros: si hay duda, dejamos decidir a Gemini multimodal.
  let parsed: CtlParsedDocument | null = await extractCtlDocumentWithGemini({
    pdfBuffer: params.pdfBuffer,
    pdfMimeType: params.pdfMimeType,
    imageBuffer: params.imageBuffer,
    userPromptText: cleanText || undefined
  });

  // Fallback determinístico si Gemini no estuvo disponible (ej. entorno test/offline o rate limit) pero el PDF digital sí tiene marcadores SNR claros
  if (!parsed && pdfTextLooksLikeCtl) {
    parsed = parseCtlFromPlainText(pdfExtractedText);
  } else if (!parsed && textHasMarkers) {
    parsed = parseCtlFromPlainText(cleanText);
  }

  // Si no se identificó como CTL SNR válido
  if (!parsed || !parsed.esCertificadoTradicionLibertad) {
    // Si el usuario pidió explícitamente un estudio de títulos y adjuntó otro archivo distinto al CTL
    if (explicitRequest) {
      return {
        isCtlRequest: true,
        isCtlDocument: false,
        needsMediaGuidance: true,
        responseText:
          `⚠️ El archivo adjunto no corresponde a un *Certificado de Tradición y Libertad (SNR)* legible.\n\n` +
          buildCtlMediaGuidanceMessage(),
        reactionEmoji: "⚠️"
      };
    }
    return {
      isCtlRequest: false,
      isCtlDocument: false,
      needsMediaGuidance: false,
      responseText: "",
      reactionEmoji: "👍"
    };
  }

  // Si Gemini leyó muy pocas anotaciones de un PDF digital y nuestro parser de texto encontró más, complementar
  if (pdfTextLooksLikeCtl) {
    const plainParsed = parseCtlFromPlainText(pdfExtractedText);
    if (plainParsed.anotaciones.length > (parsed.anotaciones?.length || 0)) {
      parsed.anotaciones = plainParsed.anotaciones;
    }
    if (!parsed.matriculaInmobiliaria && plainParsed.matriculaInmobiliaria) {
      parsed.matriculaInmobiliaria = plainParsed.matriculaInmobiliaria;
    }
    if (!parsed.chip && plainParsed.chip) {
      parsed.chip = plainParsed.chip;
    }
    if (!parsed.cedulaCatastral && plainParsed.cedulaCatastral) {
      parsed.cedulaCatastral = plainParsed.cedulaCatastral;
    }
  }

  const report = auditCtlParsedDocument(parsed, hasPdf ? "PDF" : "IMAGEN");
  let pdfBuffer: Buffer | undefined;
  let pdfFileName: string | undefined;
  try {
    const pdfRes = await generateCtlStudyPdf(report, {
      requestedBy: params.requesterName || undefined
    });
    pdfBuffer = pdfRes.pdfBuffer;
    pdfFileName = pdfRes.fileName;
  } catch (pdfErr: any) {
    console.warn("[JanIA-CTL] ⚠️ Error generando PDF membretado de Estudio de Títulos:", pdfErr?.message || pdfErr);
  }

  return {
    isCtlRequest: true,
    isCtlDocument: true,
    needsMediaGuidance: false,
    report,
    responseText: report.whatsappSummary,
    pdfBuffer,
    pdfFileName,
    reactionEmoji: report.verdictEmoji
  };
}

