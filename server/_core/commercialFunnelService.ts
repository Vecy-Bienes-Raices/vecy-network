/**
 * SERVICIO DE EMBUDO COMERCIAL Y PERSUASIÓN EJECUTIVA (DOCTRINA VECY v33.01)
 *
 * Módulo para inyección de autoridad jurídica, alertas de riesgo patrimonial y
 * estocada de cierre comercial hacia la línea oficial de bróker (+57 316 656 9719).
 */

export const BROKER_OFFICIAL_PHONE = "+57 316 656 9719";
export const BROKER_OFFICIAL_WHATSAPP_LINK = "https://wa.me/573166569719";

/**
 * Llamado a la Acción y Cierre Comercial Institucional (Firma Obligatoria Doctrinal)
 */
export const COMMERCIAL_CLOSING_CTA =
  "Para estructurar esta minuta a la medida de tu negocio, liquidar tus impuestos o gestionar la recuperación de tu comisión con nuestro acompañamiento directo, comunícate con nuestra Dirección de Operaciones y Estrategia Legal: Eduardo A. Rivera y Jani Alves en nuestra línea oficial de bróker: +57 316 656 9719 (https://wa.me/573166569719).";

/**
 * Alerta de Riesgo Patrimonial (Paso 2 Obligatorio Doctrinal)
 */
export const PATRIMONIAL_RISK_ALERT =
  "⚠️ *Alerta de Riesgo Patrimonial:* Recuerda que los contratos y liquidaciones no son formatos genéricos de internet; un vacío en arras, plazos o retenciones acarrea glosas de la DIAN o litigios costosos.";

/**
 * Patrones de detección de Consultas de Alto Valor:
 * a) Comisiones adeudadas o by-passing (Arts. 1340-1346 C.Co, Ley 527 de 1999).
 * b) Redacción de contratos: Corretaje, Promesas (Art. 1611 C.C.), Arras, Hipotecas (Art. 2432 C.C.), Retroventa (Art. 1939 C.C.).
 * c) Liquidaciones tributarias/notariales: Ganancia ocasional (Ley 2277/2022), Exención 5.000 UVT (Art. 311-1 E.T.), Retención en la fuente (Art. 398/401 E.T.), Derechos notariales 50/50 y registro.
 * d) Estudios de títulos, sucesiones ilíquidas, embargos (Art. 1521 C.C.) y saneamiento predial.
 */
export const HIGH_VALUE_PATTERNS = {
  // a) Comisiones y by-passing
  commissions: /(?:comisi[oó]n|comisiones|honorarios?\s*(?:de\s*)?corretaje|by-?passing|saltar(?:se)?\s*al\s*(?:asesor|agente|captador)|no\s*(?:me\s*)?pagaron\s*(?:la\s*)?comisi[oó]n|cobro\s*de\s*comisi[oó]n|recuperar\s*(?:la\s*)?comisi[oó]n|comisi[oó]n\s*adeudada|acuerdo\s*de\s*puntas|puntas\s*compartidas|correo\s*certificado|mailsuite|ley\s*527|no\s*repudio|art[ií]culos?\s*134[0-6]|c[oó]digo\s*de\s*comercio.*corretaje)/i,

  // b) Contratos, promesas, arras, hipotecas, retroventa
  contracts: /(?:contrato\s*(?:de\s*)?corretaje|promesa\s*(?:de\s*)?compraventa|art[ií]culo\s*1611|arras\s*(?:de\s*retracto|confirmatorias)?|cl[aá]usula\s*penal|minuta\s*notarial|hipoteca\s*abierta|l[ií]mite\s*de\s*cuant[ií]a|art[ií]culo\s*2432|pacto\s*(?:de\s*)?retroventa|art[ií]culo\s*1939|redacci[oó]n\s*de\s*contrato|redactar\s*(?:la\s*)?promesa|estructurar\s*contrato|minuta\s*de\s*compraventa)/i,

  // c) Tributario, ganancia ocasional, 5.000 UVT, retención en la fuente, notarial
  taxes: /(?:ganancia\s*ocasional|ley\s*2277|tarifa\s*15%|5\.?000\s*uvt|art[ií]culo\s*311-1|casa\s*de\s*habitaci[oó]n|retenci[oó]n\s*en\s*la\s*fuente|art[ií]culo\s*398|art[ií]culo\s*401|derechos\s*notariales|gastos\s*notariales|liquidaci[oó]n\s*notarial|impuesto\s*de\s*registro|beneficencia|notar[ií]a\s*y\s*registro)/i,

  // d) Estudio de títulos, sucesiones, embargos, saneamiento
  titles: /(?:estudio\s*de\s*t[ií]tulos|sucesi[oó]n\s*il[ií]quida|sucesi[oó]n|embargo|art[ií]culo\s*1521|saneamiento\s*predial|tradici[oó]n\s*(?:de\s*)?(?:10|20)\s*a[ñn]os|cancelaci[oó]n\s*de\s*hipoteca|afectaci[oó]n\s*(?:a\s*)?vivienda\s*familiar|ley\s*258|patrimonio\s*de\s*familia|ley\s*70)/i,
};

/**
 * Evalúa si un texto corresponde a una Consulta de Alto Valor
 */
export function isHighValueLegalOrTaxInquiry(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const clean = text.trim();
  return (
    HIGH_VALUE_PATTERNS.commissions.test(clean) ||
    HIGH_VALUE_PATTERNS.contracts.test(clean) ||
    HIGH_VALUE_PATTERNS.taxes.test(clean) ||
    HIGH_VALUE_PATTERNS.titles.test(clean)
  );
}

/**
 * Retorna el marco normativo específico para enriquecer diagnósticos determinísticos
 */
export function getNormativeFrameworkDiagnosis(text: string): string {
  const clean = text.trim();

  if (HIGH_VALUE_PATTERNS.commissions.test(clean)) {
    return (
      "🏛️ *Marco Normativo y Diagnóstico Jurídico:*\n" +
      "Conforme a los Artículos 1340 a 1346 del Código de Comercio, el corretaje genera el derecho irrenunciable al pago de la comisión una vez perfeccionado el negocio mediado. Asimismo, bajo la Ley 527 de 1999 (Principio de Equivalencia Funcional y No Repudio de Mensajes de Datos) y el Decreto 2364 de 2012, las solicitudes de visita y acuerdos de comisión remitidos por canales electrónicos certificados (tales como correos con logs SMTP/MailSuite) constituyen prueba plena e inalterable ante la jurisdicción civil y comercial frente a maniobras de by-passing."
    );
  }

  if (HIGH_VALUE_PATTERNS.contracts.test(clean)) {
    return (
      "🏛️ *Marco Normativo y Diagnóstico Jurídico:*\n" +
      "Bajo el Artículo 1611 del Código Civil (subrogado por la Ley 153 de 1887), la promesa de compraventa exige para su plena validez: constar por escrito, que el negocio no esté prohibido por las leyes, que contenga plazo o condición que fije la época de otorgamiento (fecha, hora y notaría exacta), y la determinación cabal del inmueble con linderos y folio de matrícula SNR. Respecto a garantías, las arras confirmatorias y de retracto exigen redacción expresa para no confundirse con la cláusula penal compensatoria. Tratándose de garantías reales, la hipoteca abierta con límite de cuantía (Art. 2432 C.C.) y el pacto de retroventa (Art. 1939 C.C.) requieren escritura pública formal y estricta reserva temporal."
    );
  }

  if (HIGH_VALUE_PATTERNS.taxes.test(clean)) {
    return (
      "🏛️ *Marco Normativo y Diagnóstico Tributario:*\n" +
      "De conformidad con la Reforma Tributaria (Ley 2277 de 2022), la tarifa de Ganancia Ocasional para personas naturales es del 15% sobre la utilidad fiscal depurada. El Artículo 311-1 del Estatuto Tributario otorga la exención de las primeras 5.000 UVT en la venta de la casa o apartamento de habitación del contribuyente, sujeta a la consignación en cuentas AFC o destino exclusivo a nueva vivienda. En notaría, opera la Retención en la Fuente del 1% por enajenación de activos fijos (Arts. 398 y 401 E.T., elevándose al 2.5% sobre excedentes de 20.000 UVT), y los Derechos Notariales se sufragan en proporción 50% vendedor y 50% comprador."
    );
  }

  if (HIGH_VALUE_PATTERNS.titles.test(clean)) {
    return (
      "🏛️ *Marco Normativo y Diagnóstico Inmobiliario:*\n" +
      "El estudio de títulos exige la auditoría de tradición registral ininterrumpida de al menos 20 años en el folio de matrícula inmobiliaria (ORIP/SNR). El Artículo 1521 del Código Civil sanciona con objeto ilícito la enajenación de bienes embargados o sujetos a medidas cautelares sin autorización judicial. Adicionalmente, gravámenes como la Afectación a Vivienda Familiar (Ley 258 de 1996) demandan comparecencia de ambos cónyuges, y el Patrimonio de Familia Inembargable (Ley 70 de 1931) con menores impone pronunciamiento vinculante del Defensor de Familia del ICBF."
    );
  }

  return (
    "🏛️ *Marco Normativo y Diagnóstico Jurídico:*\n" +
    "El ordenamiento civil y comercial colombiano exige rigurosa solemnidad en la estructuración de actos inmobiliarios y cumplimiento de directrices notariales y tributarias vigentes."
  );
}

/**
 * Inyecta la Estructura Persuasiva Obligatoria en 3 Pasos en la respuesta si la consulta es de Alto Valor:
 * 1° Solvencia y Diagnóstico Normativo (asegura cita de ley/código).
 * 2° Alerta de Riesgo Patrimonial (advierte contra formatos genéricos de internet).
 * 3° Llamado a la Acción y Cierre Comercial (+57 316 656 9719 / Eduardo y Jani).
 */
export function enhanceResponseWithCommercialFunnel(
  responseText: string,
  userQuery: string
): string {
  if (!responseText || typeof responseText !== "string") {
    return responseText;
  }

  const isHighValue = isHighValueLegalOrTaxInquiry(userQuery) || isHighValueLegalOrTaxInquiry(responseText);
  if (!isHighValue) {
    return responseText;
  }

  let enriched = responseText.trim();

  // 1° Verificar si contiene marco normativo / leyes citadas; si es muy escueto, enriquecerlo
  const hasLawCitation =
    /(?:art[ií]culos?|ley\s*\d+|c[oó]digo\s*(?:civil|de\s*comercio)|estatuto\s*tributario|uvt|decreto)/i.test(enriched);
  if (!hasLawCitation) {
    const diagnosis = getNormativeFrameworkDiagnosis(userQuery || responseText);
    enriched = `${diagnosis}\n\n${enriched}`;
  }

  // 2° Verificar Alerta de Riesgo Patrimonial
  const hasRiskAlert =
    /(?:alerta\s*de\s*riesgo|riesgo\s*patrimonial|formatos?\s*gen[eé]ricos?|glosas?\s*de\s*la\s*dian|litigios?\s*costosos?)/i.test(enriched);
  if (!hasRiskAlert) {
    enriched += `\n\n${PATRIMONIAL_RISK_ALERT}`;
  }

  // 3° Verificar Llamado a la Acción y Cierre Comercial con la línea +57 316 656 9719
  const hasClosingCTA =
    /(?:316\s*656\s*9719|wa\.me\/573166569719)/.test(enriched) &&
    /(?:Eduardo\s*A\.?\s*Rivera|Jani\s*Alves|Direcci[oó]n\s*de\s*Operaciones|br[oó]ker)/i.test(enriched);

  if (!hasClosingCTA) {
    // Si ya tiene alguna referencia parcial al teléfono, limpiar antes de adjuntar la firma oficial completa
    enriched += `\n\n${COMMERCIAL_CLOSING_CTA}`;
  }

  return enriched;
}
