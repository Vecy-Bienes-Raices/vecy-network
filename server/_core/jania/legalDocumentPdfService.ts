import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from "pdf-lib";
import QRCode from "qrcode";
import crypto from "node:crypto";

/**
 * 📑 GENERADOR INSTANTÁNEO DE CARTAS, CONTRATOS Y MINUTAS INMOBILIARIAS EN PDF MEMBRETADO (v33.66 — Doctrina Eduardo A. Rivera)
 * Permite que JanIA no solo redacte documentos legales inmobiliarios en el chat de WhatsApp, sino que entregue
 * al instante el archivo PDF corporativo listo para diligenciar y firmar electrónicamente (Ley 527 de 1999 / AND).
 */

export type LegalDocumentType =
  | "carta_terminacion_arriendo"
  | "carta_restitucion_inmueble"
  | "carta_presentacion_cliente"
  | "contrato_arrendamiento_vivienda"
  | "contrato_arrendamiento_comercial"
  | "promesa_compraventa"
  | "cesion_leasing"
  | "pacto_retroventa"
  | "contrato_corretaje"
  | "minuta_general";

export interface LegalDocumentPdfParams {
  tipoDocumento: LegalDocumentType;
  tituloPersonalizado?: string;
  nombreRemitente?: string;
  documentoRemitente?: string;
  nombreDestinatario?: string;
  documentoDestinatario?: string;
  direccionInmueble?: string;
  ciudad?: string;
  valorNegocioOCanon?: string;
  cuerpoDocumento?: string;
  clausulasEspeciales?: string;
}

export interface GeneratedLegalPdfResult {
  pdfBuffer: Buffer;
  fileName: string;
  verificationCode: string;
  title: string;
  normativeFramework: string;
}

/**
 * Limpia caracteres fuera de WinAnsi (emojis o símbolos matemáticos especiales) preservando tildes y eñes del español.
 */
export function sanitizePdfWinAnsiText(input: string): string {
  if (!input) return "";
  return input
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/[•▪▸►]/g, "-")
    .replace(/[—–]/g, "-")
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/m²/g, "m2")
    .replace(/[^\x20-\x7E\xA1-\xFF\n\r\t]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function getLegalDocumentMetadata(tipo: LegalDocumentType): {
  title: string;
  normativeFramework: string;
  defaultFileNamePrefix: string;
} {
  switch (tipo) {
    case "carta_terminacion_arriendo":
      return {
        title: "CARTA FORMAL DE TERMINACION Y NO PRORROGA DE CONTRATO DE ARRENDAMIENTO",
        normativeFramework: "Ley 820 de 2003 (Arts. 22 a 25 - Vivienda Urbana) y Codigo de Comercio (Art. 520 - Local Comercial)",
        defaultFileNamePrefix: "Carta_Terminacion_Arriendo_VECY"
      };
    case "carta_restitucion_inmueble":
      return {
        title: "SOLICITUD FORMAL DE ENTREGA Y RESTITUCION DE INMUEBLE ARRENDADO",
        normativeFramework: "Ley 820 de 2003, Articulo 2005 del Codigo Civil y Articulo 384 del Codigo General del Proceso",
        defaultFileNamePrefix: "Acta_Solicitud_Restitucion_Inmueble_VECY"
      };
    case "carta_presentacion_cliente":
      return {
        title: "CARTA DE PRESENTACION FORMAL Y REGISTRO DE PUNTA COMERCIAL INMOBILIARIA",
        normativeFramework: "Articulos 1340 a 1346 del Codigo de Comercio Colombiano y Doctrina Colaborativa VECY 40/20/40",
        defaultFileNamePrefix: "Carta_Presentacion_Cliente_VECY"
      };
    case "contrato_arrendamiento_vivienda":
      return {
        title: "MINUTA DE CONTRATO DE ARRENDAMIENTO DE VIVIENDA URBANA",
        normativeFramework: "Regimen de Vivienda Urbana - Ley 820 de 2003 y Codigo Civil Colombiano",
        defaultFileNamePrefix: "Contrato_Arrendamiento_Vivienda_VECY"
      };
    case "contrato_arrendamiento_comercial":
      return {
        title: "MINUTA DE CONTRATO DE ARRENDAMIENTO DE LOCAL COMERCIAL",
        normativeFramework: "Articulos 518 a 524 del Codigo de Comercio Colombiano (Derecho a Renovacion y Desahucio)",
        defaultFileNamePrefix: "Contrato_Arrendamiento_Comercial_VECY"
      };
    case "promesa_compraventa":
      return {
        title: "MINUTA DE PROMESA DE COMPRAVENTA DE BIEN INMUEBLE",
        normativeFramework: "Articulo 1611 del Codigo Civil Colombiano, Ley 153 de 1887 (Art. 89) y Estatuto de Notariado",
        defaultFileNamePrefix: "Promesa_Compraventa_Inmueble_VECY"
      };
    case "cesion_leasing":
      return {
        title: "MINUTA DE PROMESA DE CESION DE CONTRATO DE LEASING HABITACIONAL / COMERCIAL",
        normativeFramework: "Decreto 2555 de 2010, Estatuto Organico del Sistema Financiero y Articulo 887 del Codigo de Comercio",
        defaultFileNamePrefix: "Minuta_Cesion_Leasing_VECY"
      };
    case "pacto_retroventa":
      return {
        title: "MINUTA DE COMPRAVENTA CON PACTO DE RETROVENTA",
        normativeFramework: "Articulos 1939 a 1943 del Codigo Civil Colombiano (Plazo Maximo Legal de 4 Anos)",
        defaultFileNamePrefix: "Minuta_Pacto_Retroventa_VECY"
      };
    case "contrato_corretaje":
      return {
        title: "CONTRATO DE CORRETAJE Y GESTION COMERCIAL INMOBILIARIA",
        normativeFramework: "Articulos 1340 a 1346 del Codigo de Comercio y Ley 527 de 1999 (Validez de Firma Electronica)",
        defaultFileNamePrefix: "Contrato_Corretaje_Inmobiliario_VECY"
      };
    default:
      return {
        title: "MINUTA Y DOCUMENTO JURIDICO INMOBILIARIO OFICIAL",
        normativeFramework: "Legislacion Civil, Comercial y Urbana de la Republica de Colombia",
        defaultFileNamePrefix: "Minuta_Legal_Inmobiliaria_VECY"
      };
  }
}

export function buildDefaultLegalBody(params: LegalDocumentPdfParams): string {
  const ciudad = params.ciudad || "Bogota, D.C.";
  const remitente = params.nombreRemitente || "[NOMBRE DEL REMITENTE / ARRENDADOR / PROMITENTE]";
  const docRem = params.documentoRemitente || "[CC / NIT]";
  const destinatario = params.nombreDestinatario || "[NOMBRE DEL DESTINATARIO / ARRENDATARIO / COMPRADOR]";
  const docDest = params.documentoDestinatario || "[CC / NIT]";
  const direccion = params.direccionInmueble || "[DIRECCION E IDENTIFICACION DEL INMUEBLE]";
  const valor = params.valorNegocioOCanon || "[VALOR PACTADO EN PESOS COLOMBIANOS COP]";
  const extras = params.clausulasEspeciales ? `\n\nDISPOSICIONES Y CLAUSULAS ESPECIALES:\n${params.clausulasEspeciales}` : "";

  switch (params.tipoDocumento) {
    case "carta_terminacion_arriendo":
      return [
        `Ciudad y Fecha: ${ciudad}, ${new Date().toLocaleDateString("es-CO")}`,
        `Senor(a): ${destinatario} (Identificacion: ${docDest})`,
        `Referencia: Notificacion formal de preaviso y terminacion del Contrato de Arrendamiento sobre el inmueble ubicado en ${direccion}.`,
        "",
        "Respetado(a) senor(a):",
        "",
        `Por medio de la presente comunicacion, actuando en calidad de parte contratante (${remitente}, identificado(a) con ${docRem}), y en estricto cumplimiento de los terminos legales previstos en la Ley 820 de 2003 (preaviso minimo de tres [3] meses calendario con antelacion al vencimiento del periodo inicial o de cualquiera de sus prorrogas), le notifico de manera formal e irrevocable la decision de NO PRORROGAR y dar por terminado el contrato de arrendamiento suscrito sobre el inmueble ubicado en ${direccion}.`,
        "",
        "1. PLAZO Y FECHA DE ENTREGA: El inmueble debera ser restituido totalmente desocupado, a paz y salvo por concepto de canones de arrendamiento, cuotas de administracion y servicios publicos domiciliarios al vencimiento del periodo en curso.",
        "2. ACTA DE INVENTARIO Y RECIBO: Se coordinara visita de inspeccion fisica para verificar el buen estado de conservacion de los acabados, instalaciones y llaves del predio conforme al inventario inicial.",
        "3. NOTIFICACION FEHACIENTE: El presente preaviso se remite a traves de correo certificado y/o mensaje de datos con validez probatoria conforme a la Ley 527 de 1999." + extras
      ].join("\n");

    case "carta_restitucion_inmueble":
      return [
        `Ciudad y Fecha: ${ciudad}, ${new Date().toLocaleDateString("es-CO")}`,
        `Destinatario: ${destinatario} (Identificacion: ${docDest})`,
        `Asunto: Solicitud formal de restitucion y entrega material del inmueble ubicado en ${direccion}.`,
        "",
        `En mi condicion de titular / representante (${remitente} - ${docRem}), solicito formalmente programar y ejecutar la restitucion material y entrega de llaves del bien inmueble ubicado en ${direccion}, en los terminos de la Ley 820 de 2003 y el Articulo 2005 del Codigo Civil.`,
        "",
        "REQUISITOS PARA LA SUSCRIPCION DEL ACTA DE ENTREGA:",
        "- Presentacion de los ultimos tres (3) recibos de servicios publicos domiciliarios (energia, acueducto, gas) debidamente cancelados.",
        "- Paz y salvo expedido por la Administracion de Propiedad Horizontal (si aplica).",
        "- Revision conjunta del inventario fisico del inmueble sin deterioros distintos al uso natural y legitimo del bien." + extras
      ].join("\n");

    case "carta_presentacion_cliente":
      return [
        `Ciudad y Fecha: ${ciudad}, ${new Date().toLocaleDateString("es-CO")}`,
        `Dirigido a: ${destinatario} (${docDest})`,
        `Presentado por: ${remitente} (${docRem}) — Red Colaborativa VECY BIENES RAICES`,
        `Inmueble Objeto de Negociacion: ${direccion} | Valor Referencial: ${valor}`,
        "",
        "CERTIFICACION DE PRESENTACION Y REGISTRO DE PUNTA COMERCIAL:",
        `Por medio del presente documento oficial se deja constancia mercantil (Arts. 1340 a 1346 del Codigo de Comercio) de la presentacion formal del cliente interesado para la operacion inmobiliaria sobre el predio ubicado en ${direccion}.`,
        "",
        "1. PROTECCION DE PUNTA Y NO DESINTERMEDIACION: Las partes reconocen la gestion de intermediacion y se obligan a respetar la reserva de punta comercial y la distribucion de comision acordada a traves de la mesa central de VECY BIENES RAICES (+57 316 656 9719).",
        "2. VIGENCIA DEL REGISTRO: El presente registro ampara toda negociacion directa o indirecta que se perfeccione con el cliente presentado o su grupo familiar/societario dentro de los doce (12) meses siguientes a la visita." + extras
      ].join("\n");

    case "pacto_retroventa":
      return [
        `ENTRE LOS SUSCRITOS: De una parte ${remitente} (${docRem}), quien obra como EL VENDEDOR CON FACULTAD DE RECOBRO, y de otra parte ${destinatario} (${docDest}), quien obra como EL COMPRADOR, se celebra el presente negocio juridico regido por los Articulos 1939 a 1943 del Codigo Civil Colombiano:`,
        "",
        `CLAUSULA PRIMERA - OBJETO: EL VENDEDOR transfiere a titulo de compraventa con pacto de retroventa a favor de EL COMPRADOR el derecho de dominio y posesion sobre el inmueble ubicado en ${direccion}, en la ciudad de ${ciudad}.`,
        `CLAUSULA SEGUNDA - PRECIO Y SUMA DE REEMBOLSO: El precio de la presente operacion se pacta en la suma de ${valor}.`,
        "CLAUSULA TERCERA - PACTO DE RETROVENTA (ART. 1939 C.C.): EL VENDEDOR se reserva expresamente la facultad legal de recobrar la propiedad del inmueble vendido, reembolsando a EL COMPRADOR la cantidad determinada en este contrato dentro del plazo estipulado, el cual en ningun caso podra exceder de cuatro (4) anos contados desde la fecha de la escritura publica (Art. 1943 C.C.)." + extras
      ].join("\n");

    case "cesion_leasing":
      return [
        `PARTES INTERVINIENTES: ${remitente} (${docRem}) en calidad de PROMITENTE CEDENTE (Locatario Actual), y ${destinatario} (${docDest}) en calidad de PROMITENTE CESIONARIO, respecto del inmueble ubicado en ${direccion} (${ciudad}).`,
        "",
        `CLAUSULA PRIMERA - OBJETO DE LA CESION: El PROMITENTE CEDENTE se obliga a ceder a favor del PROMITENTE CESIONARIO su posicion contractual como locatario dentro del Contrato de Leasing Habitacional / Inmobiliario vigente ante la entidad financiera titular del dominio.`,
        `CLAUSULA SEGUNDA - VALOR DE LA CESION Y SALDO FINANCIERO: El valor total del negocio se establece en ${valor}, discriminado entre los derechos de cesion pagaderos al locatario cedente y el saldo de capital con opcion de adquisicion ante la entidad bancaria.`,
        "CLAUSULA TERCERA - CONDICION SUSPENSIVA DE APROBACION BANCARIA: El perfeccionamiento de la cesion queda sujeto al estudio de credito y aprobacion formal del cesionario por parte de la entidad financiera leasing." + extras
      ].join("\n");

    default:
      return [
        `LUGAR Y FECHA DE SUSCRIPCION: ${ciudad}, ${new Date().toLocaleDateString("es-CO")}`,
        `PARTE A (PROMITENTE / ARRENDADOR / COMITENTE): ${remitente} — Documento: ${docRem}`,
        `PARTE B (CONTRAPARTE / ARRENDATARIO / CORREDOR): ${destinatario} — Documento: ${docDest}`,
        `INMUEBLE OBJETO DEL ACTO JURIDICO: ${direccion} (${ciudad})`,
        `CUANTIA / VALOR DE LA OPERACION: ${valor}`,
        "",
        "CLAUSULADO GENERAL OBLIGACIONAL:",
        "PRIMERA - OBJETO Y VINCULACION JURIDICA: Las partes suscriben de buena fe exenta de culpa el presente instrumento juridico inmobiliario conforme a la legislacion civil y mercantil colombiana.",
        "SEGUNDA - SANEAMIENTO Y DEBIDA DILIGENCIA: El inmueble objeto del negocio se declara libre de embargos, pleitos pendientes, condiciones resolutorias o limitaciones no declaradas expresamente en el Certificado de Tradicion y Libertad.",
        "TERCERA - CLAUSULA PENAL Y CUMPLIMIENTO: El incumplimiento grave de cualquiera de las obligaciones aqui pactadas dara lugar al cobro ejecutivo de las arras o clausula penal conforme al Articulo 1592 del Codigo Civil y Articulo 867 del Codigo de Comercio.",
        "CUARTA - FIRMA ELECTRONICA Y PLENA VALIDEZ PROBATORIA: De conformidad con la Ley 527 de 1999 y el Decreto 2364 de 2012, este documento puede ser suscrito mediante firma electronica certificada con plena eficacia juridica." + extras
      ].join("\n");
  }
}

function wrapTextToLines(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const cleanPara = sanitizePdfWinAnsiText(para);
    if (!cleanPara) {
      lines.push("");
      continue;
    }
    const words = cleanPara.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }
  return lines;
}

/**
 * Genera el archivo PDF oficial membretado de VECY BIENES RAÍCES listo para enviar por WhatsApp Baileys.
 */
export async function generateLegalDocumentPdf(
  params: LegalDocumentPdfParams
): Promise<GeneratedLegalPdfResult> {
  const meta = getLegalDocumentMetadata(params.tipoDocumento);
  const title = sanitizePdfWinAnsiText(params.tituloPersonalizado || meta.title).toUpperCase();
  const bodyContent = sanitizePdfWinAnsiText(params.cuerpoDocumento || buildDefaultLegalBody(params));
  const verificationCode = `DOC-VECY-${crypto.randomBytes(3).toString("hex").toUpperCase()}-2026`;

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612; // Letter width
  const pageHeight = 792; // Letter height
  const marginX = 52;
  const maxWidth = pageWidth - marginX * 2;

  const drawHeader = (page: PDFPage, isFirstPage: boolean) => {
    // Franja superior oscura ejecutiva VECY
    page.drawRectangle({
      x: 0,
      y: pageHeight - 72,
      width: pageWidth,
      height: 72,
      color: rgb(0.08, 0.09, 0.12)
    });
    // Línea dorada institucional
    page.drawRectangle({
      x: 0,
      y: pageHeight - 75,
      width: pageWidth,
      height: 3,
      color: rgb(0.83, 0.68, 0.21)
    });

    page.drawText("VECY BIENES RAICES - CONSULTORIA LEGAL E IA INMOBILIARIA", {
      x: marginX,
      y: pageHeight - 32,
      size: 11,
      font: fontBold,
      color: rgb(0.92, 0.78, 0.32)
    });
    page.drawText("Eduardo A. Rivera & Jani Alves | Broker Oficial: +57 316 656 9719 | https://vecy-bienes-raices.vercel.app/", {
      x: marginX,
      y: pageHeight - 48,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.88, 0.88, 0.9)
    });
    page.drawText(`Radicado Documental: ${verificationCode}`, {
      x: marginX,
      y: pageHeight - 61,
      size: 8,
      font: fontRegular,
      color: rgb(0.7, 0.72, 0.76)
    });

    if (isFirstPage) {
      // Bloque de título del documento
      const titleLines = wrapTextToLines(title, fontBold, 11.5, maxWidth);
      let ty = pageHeight - 102;
      for (const tLine of titleLines) {
        page.drawText(tLine, {
          x: marginX,
          y: ty,
          size: 11.5,
          font: fontBold,
          color: rgb(0.1, 0.12, 0.18)
        });
        ty -= 15;
      }
      page.drawText(`Marco Normativo: ${sanitizePdfWinAnsiText(meta.normativeFramework)}`, {
        x: marginX,
        y: ty - 2,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.38, 0.4, 0.45)
      });
      page.drawLine({
        start: { x: marginX, y: ty - 10 },
        end: { x: pageWidth - marginX, y: ty - 10 },
        thickness: 0.8,
        color: rgb(0.8, 0.65, 0.2)
      });
      return ty - 28;
    }
    return pageHeight - 98;
  };

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let cursorY = drawHeader(currentPage, true);

  const bodyLines = wrapTextToLines(bodyContent, fontRegular, 10, maxWidth);
  for (const line of bodyLines) {
    if (cursorY < 130) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      cursorY = drawHeader(currentPage, false);
    }
    if (!line) {
      cursorY -= 8;
      continue;
    }
    const isHeading =
      /^(?:CLAUSULA|PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SEPTIMA|OCTAVA|REQUISITOS|CERTIFICACION|DISPOSICIONES|[1-9]\.)/i.test(
        line
      );
    currentPage.drawText(line, {
      x: marginX,
      y: cursorY,
      size: 9.8,
      font: isHeading ? fontBold : fontRegular,
      color: rgb(0.14, 0.15, 0.18)
    });
    cursorY -= 14;
  }

  // Espacio para firmas y guía de firma electrónica AND
  if (cursorY < 210) {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    cursorY = drawHeader(currentPage, false);
  }

  cursorY -= 26;
  // Líneas de firma
  currentPage.drawLine({
    start: { x: marginX, y: cursorY },
    end: { x: marginX + 210, y: cursorY },
    thickness: 0.9,
    color: rgb(0.2, 0.2, 0.25)
  });
  currentPage.drawLine({
    start: { x: pageWidth - marginX - 210, y: cursorY },
    end: { x: pageWidth - marginX, y: cursorY },
    thickness: 0.9,
    color: rgb(0.2, 0.2, 0.25)
  });

  const remLabel = sanitizePdfWinAnsiText(params.nombreRemitente || "FIRMA PARTE A / REMITENTE");
  const destLabel = sanitizePdfWinAnsiText(params.nombreDestinatario || "FIRMA PARTE B / DESTINATARIO");

  currentPage.drawText(remLabel.substring(0, 38), {
    x: marginX,
    y: cursorY - 13,
    size: 8.5,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.2)
  });
  currentPage.drawText("CC / NIT: ________________________", {
    x: marginX,
    y: cursorY - 25,
    size: 8,
    font: fontRegular,
    color: rgb(0.35, 0.35, 0.4)
  });

  currentPage.drawText(destLabel.substring(0, 38), {
    x: pageWidth - marginX - 210,
    y: cursorY - 13,
    size: 8.5,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.2)
  });
  currentPage.drawText("CC / NIT: ________________________", {
    x: pageWidth - marginX - 210,
    y: cursorY - 25,
    size: 8,
    font: fontRegular,
    color: rgb(0.35, 0.35, 0.4)
  });

  // Recuadro inferior de Firma Electrónica (Ley 527/1999 + AND) y Código QR
  const footerBoxY = 36;
  currentPage.drawRectangle({
    x: marginX,
    y: footerBoxY,
    width: maxWidth,
    height: 70,
    color: rgb(0.96, 0.96, 0.98),
    borderColor: rgb(0.83, 0.68, 0.21),
    borderWidth: 0.8
  });

  currentPage.drawText("GUIA RAPIDA DE FIRMA ELECTRONICA OFICIAL (LEY 527 DE 1999):", {
    x: marginX + 10,
    y: footerBoxY + 52,
    size: 8.2,
    font: fontBold,
    color: rgb(0.12, 0.14, 0.2)
  });
  currentPage.drawText(
    "1. Ingresa a https://autenticaciondigital.and.gov.co/ (Agencia Nacional Digital - Carpeta Ciudadana).",
    {
      x: marginX + 10,
      y: footerBoxY + 39,
      size: 7.6,
      font: fontRegular,
      color: rgb(0.25, 0.27, 0.32)
    }
  );
  currentPage.drawText(
    "2. Valida tu identidad o usa un firmador con estampado cronologico y OTP al celular/correo de las partes.",
    {
      x: marginX + 10,
      y: footerBoxY + 27,
      size: 7.6,
      font: fontRegular,
      color: rgb(0.25, 0.27, 0.32)
    }
  );
  currentPage.drawText(
    `3. Codigo de trazabilidad VECY: ${verificationCode} | Asesoria Jurídica e Inmobiliaria: +57 316 656 9719`,
    {
      x: marginX + 10,
      y: footerBoxY + 14,
      size: 7.6,
      font: fontBold,
      color: rgb(0.2, 0.22, 0.28)
    }
  );

  try {
    const qrDataUrl = await QRCode.toDataURL(
      `https://vecy-bienes-raices.vercel.app/?doc=${verificationCode}`,
      { margin: 1, width: 120 }
    );
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
    const qrImage = await pdfDoc.embedPng(Buffer.from(qrBase64, "base64"));
    currentPage.drawImage(qrImage, {
      x: pageWidth - marginX - 62,
      y: footerBoxY + 6,
      width: 56,
      height: 56
    });
  } catch {
    // Si falla el QR en un entorno restringido, el PDF continúa limpio
  }

  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);
  const fileName = `${meta.defaultFileNamePrefix}_${verificationCode}.pdf`;

  return {
    pdfBuffer,
    fileName,
    verificationCode,
    title,
    normativeFramework: meta.normativeFramework
  };
}
