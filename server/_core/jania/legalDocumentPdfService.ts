import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from "pdf-lib";
import QRCode from "qrcode";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { CtlTitleStudyReport } from "../ctlTitleStudyService";
import type { PotUrbanNormReport } from "../potUrbanNormService";
import type { FinancialAndTaxReport } from "../financialAndTaxRealEstateService";
import type { PropiedadHorizontalReport } from "../propiedadHorizontalService";

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
  | "otrosi_modificatorio"
  | "acta_entrega_inmueble"
  | "auditoria_riesgos_contractuales"
  | "estudio_titulos_snr"
  | "concepto_norma_urbana_pot"
  | "ficha_financiera_tributaria"
  | "concepto_propiedad_horizontal"
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
  matriculaInmobiliaria?: string;
  chipCatastral?: string;
  plazoMeses?: number;
  fechaEntrega?: string;
  fechaEscritura?: string;
  notaria?: string;
  formaPagoDetalle?: string;
  tipoArras?: "confirmatorias" | "retractatorias" | "penal";
  valorArrasOPenalidad?: string;
  canonAdministracion?: string;
  porcentajeComision?: string;
  tipoOtrosi?: string;
  conCondicionEstudioTitulos?: boolean;
  esPropietarioDirecto?: boolean;
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

export function getLegalDocumentMetadata(
  tipo: LegalDocumentType,
  options?: { esPropietarioDirecto?: boolean }
): {
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
        title: "CONTRATO DE CORRETAJE Y GESTION COMERCIAL INMOBILIARIA VECY",
        normativeFramework: options?.esPropietarioDirecto
          ? "Articulos 1340 a 1346 del Codigo de Comercio, Politica VECY Propietario Directo (3% Venta / 1 Canon Arriendo / Publicacion $0 COP) y Ley 527 de 1999"
          : "Articulos 1340 a 1346 del Codigo de Comercio, Doctrina VECY 40/20/40 (3% Venta / 1 Canon Arriendo / Publicacion $0 COP) y Ley 527 de 1999",
        defaultFileNamePrefix: "Contrato_Corretaje_Inmobiliario_VECY"
      };
    case "otrosi_modificatorio":
      return {
        title: "OTROSI MODIFICATORIO / ACUERDO DE CESION O ENTREGA ANTICIPADA",
        normativeFramework: "Codigo Civil (Arts. 1602, 1625), Codigo de Comercio (Art. 887 - Cesion), Ley 820 de 2003 y Ley 527 de 1999",
        defaultFileNamePrefix: "Otrosi_Modificatorio_VECY"
      };
    case "acta_entrega_inmueble":
      return {
        title: "ACTA DE ENTREGA ANTICIPADA, RESTITUCION E INVENTARIO DE INMUEBLE",
        normativeFramework: "Ley 820 de 2003, Articulo 2005 del Codigo Civil y Codigo General del Proceso",
        defaultFileNamePrefix: "Acta_Entrega_Inmueble_VECY"
      };
    case "auditoria_riesgos_contractuales":
      return {
        title: "AUDITORIA JURIDICA DE CLAUSULAS Y RIESGOS CONTRACTUALES",
        normativeFramework: "Ley 820 de 2003, Codigo de Comercio (Arts. 518-524 y 1340-1346), Codigo Civil (Arts. 1592, 1611, 1859-1861) y C.G.P.",
        defaultFileNamePrefix: "Auditoria_Riesgos_Contractuales_VECY"
      };
    case "estudio_titulos_snr":
      return {
        title: "CONCEPTO JURIDICO DE ESTUDIO DE TITULOS SNR",
        normativeFramework: "Estatuto de Registro de Instrumentos Publicos (Ley 1579 de 2012), Codigo Civil y Ley 1561 de 2012",
        defaultFileNamePrefix: "Concepto_Estudio_Titulos_VECY"
      };
    case "concepto_norma_urbana_pot":
      return {
        title: "CONCEPTO PRELIMINAR DE NORMA URBANA Y PREFACTIBILIDAD POT",
        normativeFramework: "POT Bogota (Decreto 555 de 2021), Ley 388 de 1997, SINUPOT SDP e IDECA Catastro",
        defaultFileNamePrefix: "Concepto_Norma_Urbana_POT_VECY"
      };
    case "ficha_financiera_tributaria":
      return {
        title: "FICHA FINANCIERA, RENTABILIDAD Y TRIBUTACION INMOBILIARIA PRELIMINAR",
        normativeFramework: "Ley 546 de 1999, Decreto 2555 de 2010 (Leasing), Estatuto Tributario (Arts. 311-1, 314, 398 y 519)",
        defaultFileNamePrefix: "Ficha_Financiera_Tributaria_VECY"
      };
    case "concepto_propiedad_horizontal":
      return {
        title: "CONCEPTO TECNICO-JURIDICO DE PROPIEDAD HORIZONTAL (LEY 675 DE 2001)",
        normativeFramework: "Ley 675 de 2001, Decreto 1074 de 2015 / Ley 2068 de 2020 (RNT) y Decreto 1077 de 2015",
        defaultFileNamePrefix: "Concepto_Propiedad_Horizontal_VECY"
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
  const matricula = params.matriculaInmobiliaria || "[NUMERO DE MATRICULA SNR]";
  const chip = params.chipCatastral || "[CHIP / CEDULA CATASTRAL]";
  const plazoMeses = params.plazoMeses && params.plazoMeses > 0 ? params.plazoMeses : 12;
  const fechaEntrega = params.fechaEntrega || "[FECHA PACTADA DE ENTREGA]";
  const fechaEscritura = params.fechaEscritura || "[FECHA Y HORA DE ESCRITURACION]";
  const notaria = params.notaria || "[NOTARIA Y CIUDAD PACTADA]";
  const formaPago = params.formaPagoDetalle
    ? params.formaPagoDetalle
    : "Desembolso segun cronograma pactado (recursos propios, credito hipotecario, FNA o leasing habitacional segun aplique)";
  const valorArras = params.valorArrasOPenalidad || "10% del valor total del negocio";
  const adminCanon = params.canonAdministracion || "Segun reglamento de Propiedad Horizontal (segun lo acordado por las partes)";
  const comisionPct = params.porcentajeComision || "3% en venta / 1 canon mensual en arriendo";
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

    case "promesa_compraventa": {
      const arrasLabel =
        params.tipoArras === "retractatorias"
          ? "ARRAS RETRACTATORIAS / PENITENCIALES (ART. 1859 C.C.): Cualquiera de las partes podra retractarse de la promesa antes de la escritura publica; quien las dio las perdera y quien las recibio las restituira dobladas."
          : params.tipoArras === "penal"
          ? "CLAUSULA PENAL PECUNIARIA DIRECTA (ART. 1592 C.C. Y ART. 867 C.CO.): En caso de incumplimiento culpable, la parte incumplida pagara a la parte cumplida sin retracto libre la suma pactada, conservando el derecho de exigir ejecutivamente el cumplimiento o la resolucion del contrato."
          : "ARRAS CONFIRMATORIAS DE EJECUCION (ART. 1861 C.C.) Y CLAUSULA PENAL (ART. 1592 C.C.): La suma entregada constituye parte del precio y senal confirmatoria de la promesa; en caso de incumplimiento injustificado se hara exigible ejecutivamente la clausula penal pactada sin derecho a retracto unilateral.";
      const estudioTitulosClause =
        params.conCondicionEstudioTitulos === false
          ? "Las partes declaran haber revisado previamente la tradicion del inmueble segun Certificado de Tradicion y Libertad aportado."
          : "CONDICION SUSPENSIVA DE ESTUDIO DE TITULOS FAVORABLE (10 Y 20 ANOS): La eficacia definitiva de esta promesa y los desembolsos posteriores quedan supeditados a que el estudio juridico del Certificado de Tradicion y Libertad (SNR) acredite tradicion continua de dominio pleno sin falsa tradicion, embargos vigentes ni limitaciones no subsanables antes de la escrituracion. De encontrarse vicio no saneado en el plazo acordado, el promitente comprador podra resolver sin penalidad obteniendo restitucion total de lo pagado.";
      return [
        `LUGAR Y FECHA DE SUSCRIPCION: ${ciudad}, ${new Date().toLocaleDateString("es-CO")}`,
        `PROMITENTE VENDEDOR (PARTE A): ${remitente} — Identificacion: ${docRem}`,
        `PROMITENTE COMPRADOR (PARTE B): ${destinatario} — Identificacion: ${docDest}`,
        `INMUEBLE(S) OBJETO DEL ACTO: ${direccion} (${ciudad}) | Matricula SNR: ${matricula} | CHIP/Catastro: ${chip}`,
        `CUANTIA / PRECIO TOTAL CONVENIDO: ${valor}`,
        "",
        "CLAUSULADO CONTRACTUAL DE PROMESA DE COMPRAVENTA (ART. 1611 C.C. Y ART. 89 LEY 153 DE 1887):",
        "",
        "CLAUSULA PRIMERA - OBJETO DEL CONTRATO: El PROMITENTE VENDEDOR promete transferir a titulo de compraventa real y efectiva a favor del PROMITENTE COMPRADOR, y este promete adquirir al mismo titulo, el derecho de dominio y la posesion material plena sobre el(los) bien(es) inmueble(s) debidamente individualizado(s) en la clausula segunda de este contrato.",
        "",
        `CLAUSULA SEGUNDA - IDENTIFICACION, INDIVIDUALIZACION Y LINDEROS: El inmueble principal objeto de esta promesa se encuentra ubicado en la direccion: ${direccion}, en la ciudad de ${ciudad}. Folio de Matricula Inmobiliaria SNR No. ${matricula}, Cedula Catastral / CHIP No. ${chip}. LINDEROS TECNICOS Y ESPECIFICACIONES: Los linderos generales y especiales, cabida, medidas y demas especificaciones tecnicas constan en la Escritura Publica antecedente y se incorporan integramente a este instrumento. ${params.clausulasEspeciales && /permuta|daci[oó]n/i.test(params.clausulasEspeciales) ? "(En caso de dacion o permuta parcial, los datos registrales y linderos del inmueble entregado en parte de pago se transcriben en las Disposiciones Especiales adjuntas)." : ""}`,
        "",
        "CLAUSULA TERCERA - TRADICION, ESTUDIO DE TITULOS Y SANEAMIENTO: El PROMITENTE VENDEDOR garantiza que adquirio el dominio mediante Escritura Publica registrada con tradicion ininterrumpida y sana (10 anos prescripcion ordinaria Ley 791/2002 y 20 anos Art. 2532 C.C.). " + estudioTitulosClause,
        "",
        `CLAUSULA CUARTA - PRECIO, FORMA DE PAGO Y DESEMBOLSOS (CREDITO / FNA / LEASING): El precio de la venta prometida se fija en la suma de ${valor} moneda legal colombiana, el cual sera pagado asi: ${formaPago}. En caso de financiacion mediante credito hipotecario, Fondo Nacional del Ahorro (FNA) o leasing habitacional, el desembolso final operara contra carta de aprobacion vigente, avaluo y registro de la escritura publica o giro directo bancario.`,
        "",
        "CLAUSULA QUINTA - SITUACION JURIDICA, GRAVAMENES Y VICIOS REDHIBITORIOS: El PROMITENTE VENDEDOR declara que el bien se entregara libre de embargos, demandas, condiciones resolutorias, pleitos pendientes o limitaciones al dominio (o mediante cancelacion simultanea de hipoteca con cargo al saldo del precio) y responde por saneamiento por eviccion y vicios redhibitorios (Arts. 1880 y 1893 C.C.).",
        "",
        "CLAUSULA SEXTA - REGIMEN DE FAMILIA Y AFECTACIONES PATRIMONIALES: Las partes declaran su estado civil y manifiestan que, de existir Afectacion a Vivienda Familiar (Ley 258 de 1996 / Ley 854 de 2003) o Patrimonio de Familia Inembargable (Ley 70 de 1931), se levantaran previamente o en la misma escritura con comparecencia del conyuge o companero(a) permanente.",
        "",
        `CLAUSULA SEPTIMA - OTORGAMIENTO DE LA ESCRITURA PUBLICA DEFINITIVA: La Escritura Publica de Compraventa se suscribira el dia ${fechaEscritura} en la ${notaria}, acto para el cual las partes compareceran personalmente o mediante apoderado con poder especial amplio y suficiente.`,
        "",
        `CLAUSULA OCTAVA - ENTREGA MATERIAL, INVENTARIO Y POSESION: La entrega real y material del inmueble se realizara el dia ${fechaEntrega}, totalmente desocupado y con paz y salvo de Impuesto Predial, valorizacion IDU, cuotas de administracion y servicios publicos domiciliarios hasta esa fecha, levantando Acta de Entrega e Inventario Fisico.`,
        "",
        `CLAUSULA NOVENA - ARRAS Y CLAUSULA PENAL PECUNIARIA (${valorArras}): ${arrasLabel} Cuantia pactada de arras/penalidad: ${valorArras}. Exigible ejecutivamente (Art. 422 C.G.P.) sin necesidad de requerimiento previo para constituir en mora.`,
        "",
        "CLAUSULA DECIMA - GASTOS NOTARIALES, RETENCION EN LA FUENTE Y REGISTRO: Salvo pacto distinto en Disposiciones Especiales: (a) Derechos Notariales en un 50% por cada parte; (b) Retencion en la Fuente (1% Art. 398 E.T. segun UVT vigentes) 100% a cargo del PROMITENTE VENDEDOR; (c) Impuesto de Beneficencia/Registro y derechos de registro ORIP 100% a cargo del PROMITENTE COMPRADOR; cancelacion de hipoteca previa 100% a cargo del vendedor.",
        "",
        "CLAUSULA DECIMAPRIMERA - MERITO EJECUTIVO Y FIRMA ELECTRONICA: El presente instrumento presta merito ejecutivo pleno conforme al Codigo General del Proceso y goza de plena validez probatoria bajo la Ley 527 de 1999 y Decreto 2364 de 2012.",
        extras,
        "",
        "ADVERTENCIA DE VALIDEZ Y REVISION NOTARIAL VECY BIENES RAICES:",
        "Minuta estructural personalizada emitida por JanIA (VECY BIENES RAICES). Antes de suscribir definitivamente, complete cualquier dato entre corchetes segun la escritura antecedente y CTL vigente. Para validacion juridica presencial y acompanamiento notarial personalizado: Eduardo A. Rivera & Jani Alves | Broker Oficial: +57 316 656 9719 | https://wa.me/573166569719 | https://vecy-bienes-raices.vercel.app/."
      ].filter(Boolean).join("\n");
    }

    case "contrato_arrendamiento_vivienda":
      return [
        `LUGAR Y FECHA DE SUSCRIPCION: ${ciudad}, ${new Date().toLocaleDateString("es-CO")}`,
        `ARRENDADOR(A): ${remitente} — Identificacion: ${docRem}`,
        `ARRENDATARIO(A): ${destinatario} — Identificacion: ${docDest}`,
        `INMUEBLE OBJETO DEL ARRENDAMIENTO: ${direccion} (${ciudad}) | Matricula SNR: ${matricula} | CHIP: ${chip}`,
        `CANON MENSUAL DE ARRENDAMIENTO: ${valor} | PLAZO INICIAL: ${plazoMeses} meses`,
        "",
        "CLAUSULADO DE CONTRATO DE ARRENDAMIENTO DE VIVIENDA URBANA (LEY 820 DE 2003):",
        "",
        "CLAUSULA PRIMERA - OBJETO Y DESTINO EXCLUSIVO: El ARRENDADOR concede el goce del inmueble individualizado y el ARRENDATARIO lo recibe destinandolo de manera exclusiva para vivienda familiar urbana (Art. 2 Ley 820 de 2003), prohibiendose destinarlo a actividades comerciales, industriales o contrarias a la ley.",
        "",
        `CLAUSULA SEGUNDA - CANON, TOPE LEGAL Y FORMA DE PAGO: El ARRENDATARIO pagara mensualmente la suma de ${valor} dentro de los primeros cinco (5) dias calendario de cada periodo mensual. De conformidad con el Articulo 18 de la Ley 820 de 2003, el canon mensual no excede del uno por ciento (1%) del valor comercial del inmueble (o su parte arrendada).`,
        "",
        "CLAUSULA TERCERA - PROHIBICION DE DEPOSITOS EN EFECTIVO (ART. 16 LEY 820 DE 2003): En estricto acatamiento del Articulo 16 de la Ley 820 de 2003, en este contrato de vivienda urbana NO se exigen ni reciben depositos en dinero efectivo ni cauciones reales prohibidas; las garantias se instrumentan exclusivamente mediante codeudor solidario y/o poliza de seguro de arrendamiento o fianza colectiva.",
        "",
        "CLAUSULA CUARTA - INCREMENTO ANUAL DEL CANON (ART. 20 LEY 820 DE 2003): Vencidos cada doce (12) meses de ejecucion, el canon podra reajustarse hasta en un porcentaje igual al cien por ciento (100%) del IPC certificado por el DANE para el ano calendario inmediatamente anterior, previa comunicacion escrita al arrendatario.",
        "",
        `CLAUSULA QUINTA - TERMINO DE DURACION, PRORROGAS Y PREAVISO (ARTS. 5, 6, 22 Y 24 LEY 820): El termino inicial sera de ${plazoMeses} meses contados desde el ${fechaEntrega}. Se prorrogara automaticamente salvo preaviso escrito enviado con antelacion no menor a tres (3) meses al vencimiento del plazo inicial o de su prorroga, cumpliendo las causales y preavisos de los Articulos 22 a 25 de la Ley 820 de 2003.`,
        "",
        `CLAUSULA SEXTA - SERVICIOS PUBLICOS Y ADMINISTRACION: Los servicios publicos domiciliarios (acueducto, energia, gas, telecomunicaciones) son a cargo exclusivo del ARRENDATARIO. Cuota de administracion PH: ${adminCanon}.`,
        "",
        "CLAUSULA SEPTIMA - PROHIBICION DE CESION Y SUBARRIENDO (ART. 17 LEY 820 DE 2003): El ARRENDATARIO no podra ceder el contrato ni subarrendar total o parcialmente sin autorizacion previa y escrita del ARRENDADOR.",
        "",
        "CLAUSULA OCTAVA - REPARACIONES LOCATIVAS, CLAUSULA PENAL Y RESTITUCION: Las reparaciones locativas corresponden al ARRENDATARIO (Arts. 1985 y 1993 C.C.). En caso de incumplimiento se causara clausula penal pecuniaria maxima equivalente a tres (3) canones vigentes (Art. 22/23 Ley 820). Al finalizar el contrato se suscribira Acta de Entrega e Inventario Fisico.",
        "",
        "CLAUSULA NOVENA - MERITO EJECUTIVO Y FIRMA ELECTRONICA: Este contrato presta merito ejecutivo (Art. 14 Ley 820/2003 y Art. 422 C.G.P.) y tiene plena validez por firma electronica bajo Ley 527 de 1999.",
        extras,
        "",
        "VALIDACION JURIDICA Y POLIZA DE ARRENDAMIENTO VECY BIENES RAICES:",
        "Minuta personalizada emitida por JanIA. Para expedicion de polizas colectivas de arrendamiento, verificacion de codeudores y asesoria juridica presencial: +57 316 656 9719 | https://wa.me/573166569719 | https://vecy-bienes-raices.vercel.app/."
      ].filter(Boolean).join("\n");

    case "contrato_arrendamiento_comercial":
      return [
        `LUGAR Y FECHA DE SUSCRIPCION: ${ciudad}, ${new Date().toLocaleDateString("es-CO")}`,
        `ARRENDADOR(A): ${remitente} — Identificacion: ${docRem}`,
        `ARRENDATARIO(A): ${destinatario} — Identificacion: ${docDest}`,
        `INMUEBLE / LOCAL COMERCIAL: ${direccion} (${ciudad}) | Matricula SNR: ${matricula} | CHIP: ${chip}`,
        `CANON MENSUAL DE ARRENDAMIENTO: ${valor} | PLAZO INICIAL: ${plazoMeses} meses`,
        "",
        "CLAUSULADO DE CONTRATO DE ARRENDAMIENTO DE LOCAL COMERCIAL (ARTS. 518 A 524 CODIGO DE COMERCIO):",
        "",
        "CLAUSULA PRIMERA - OBJETO, DESTINACION Y USO DE SUELO (POT): El ARRENDADOR entrega en arrendamiento el local comercial individualizado y el ARRENDATARIO lo destina exclusivamente para la explotacion de su establecimiento de comercio autorizado, asumiendo la verificacion previa de compatibilidad de uso de suelo POT y licencias sanitarias/SAYCO-ACINPRO.",
        "",
        `CLAUSULA SEGUNDA - CANON, IVA, ADMINISTRACION Y REAJUSTES: El canon mensual pactado es de ${valor} (mas IVA a la tarifa vigente del Estatuto Tributario, cuando el arrendador o el inmueble pertenezca al regimen responsable). Cuota de administracion: ${adminCanon}. Al vencimiento de cada anualidad contractual, el canon se incrementara conforme al IPC mas los puntos porcentuales libremente convenidos por las partes.`,
        "",
        "CLAUSULA TERCERA - DERECHO A LA RENOVACION Y DESAHUCIO MINIMO DE 6 MESES (ARTS. 518 A 520 Y 524 C.CO.): Conforme a las normas imperativas del Articulo 524 del Codigo de Comercio, el ARRENDATARIO que ocupe el inmueble a titulo de arrendamiento por no menos de dos (2) anos consecutivos con un mismo establecimiento de comercio tendra derecho a la renovacion del contrato al vencimiento, salvo las excepciones taxativas del Articulo 518 C.Co., caso en el cual el ARRENDADOR debera dar desahucio con una anticipacion NO menor a seis (6) meses a la fecha de terminacion (Art. 520 C.Co.).",
        "",
        "CLAUSULA CUARTA - PRIMA COMERCIAL, ADECUACIONES Y REPARACIONES: Salvo estipulacion expresa escrita en las Disposiciones Especiales, no se pacta prima comercial de ingreso; las mejoras o adecuaciones locativas requeriran autorizacion previa del ARRENDADOR y deberan respetar la estructura del edificio.",
        "",
        "CLAUSULA QUINTA - SUBARRIENDO Y CESION DE ESTABLECIMIENTO DE COMERCIO (ART. 523 C.CO.): El ARRENDATARIO no podra subarrendar totalmente los locales ni darles destinacion distinta sin autorizacion escrita del ARRENDADOR, aunque podra subarrendar hasta la mitad del inmueble sin lesionar derechos del arrendador o ceder el contrato cuando sea consecuencia de la enajenacion del respectivo establecimiento de comercio en los terminos del Articulo 523 del Codigo de Comercio.",
        "",
        `CLAUSULA SEXTA - CLAUSULA PENAL (${valorArras}), MERITO EJECUTIVO Y RESTITUCION: El incumplimiento facultara el cobro ejecutivo de la clausula penal pactada (${valorArras}) y la restitucion del inmueble conforme al Articulo 384 del C.G.P.`,
        extras,
        "",
        "VALIDACION JURIDICA COMERCIAL Y NORMA URBANA VECY BIENES RAICES:",
        "Minuta comercial emitida por JanIA. Para validacion de uso de suelo POT, revision notarial y estructuracion comercial personalizada: +57 316 656 9719 | https://wa.me/573166569719 | https://vecy-bienes-raices.vercel.app/."
      ].filter(Boolean).join("\n");

    case "contrato_corretaje":
      return [
        `LUGAR Y FECHA: ${ciudad}, ${new Date().toLocaleDateString("es-CO")}`,
        `EL COMITENTE (PROPIETARIO / CLIENTE): ${remitente} — Identificacion: ${docRem}`,
        `EL CORREDOR INMOBILIARIO (VECY BIENES RAICES / NETWORK): ${destinatario} — Identificacion: ${docDest}`,
        `INMUEBLE CONSIGNADO: ${direccion} (${ciudad}) | Matricula SNR: ${matricula} | CHIP: ${chip} | VALOR COMERCIAL: ${valor}`,
        "",
        "CLAUSULADO DE CONTRATO DE CORRETAJE Y CONSIGNACION VECY (ARTS. 1340 A 1346 C.CO.):",
        "",
        "CLAUSULA PRIMERA - ENCARGO DE MEDIACION Y PROMOCION COMERCIAL: EL COMITENTE confiere encargo mercantil de corretaje no exclusivo (salvo pacto expreso de exclusividad por termino determinado) a EL CORREDOR para promocionar, exhibir, perfilar interesados y mediar en la compraventa o arrendamiento del inmueble consignado.",
        "",
        `CLAUSULA SEGUNDA - HONORARIOS PROFESIONALES (${comisionPct}): Al perfeccionarse la compraventa (firma de promesa con desembolso o escritura publica) o suscribirse el contrato de arrendamiento con cliente presentado por EL CORREDOR o la red VECY, EL COMITENTE pagara honorarios del tres por ciento (3%) sobre el precio final de venta en inmuebles urbanos (5% rural/campestre) o el equivalente a un (1) canon mensual de arrendamiento (mas IVA si aplica), conforme al porcentaje pactado (${comisionPct}).`,
        "",
        "CLAUSULA TERCERA - POLITICA CERO COBROS POR PUBLICACION: En cumplimiento estricto de la Doctrina VECY BIENES RAICES, EL CORREDOR NO cobra suma alguna por publicacion, inventario fotografico, difusion en portales o gestion comercial anticipada; los honorarios se causan exclusivamente a exito al cerrarse la negociacion.",
        "",
        params.esPropietarioDirecto
          ? "CLAUSULA CUARTA - PROMOCION MULTICANAL Y UNICO INTERLOCUTOR VECY: EL COMITENTE autoriza a VECY BIENES RAICES la difusion comercial del inmueble en portales inmobiliarios y canales aliados especializados, garantizando siempre a EL COMITENTE un unico interlocutor responsable (Broker Oficial +57 316 656 9719), perfilamiento previo de interesados y cero costos por publicacion."
          : "CLAUSULA CUARTA - DOCTRINA COLABORATIVA VECY 40/20/40 Y 80/20: EL COMITENTE autoriza la difusion colaborativa del inmueble a traves de la red de corredores aliados VECY Network bajo esquemas transparentes de reparto de puntas (40% punta captadora / 20% mesa central / 40% punta colocadora, u 80/20 directo), garantizando unico interlocutor comercial responsable.",
        "",
        "CLAUSULA QUINTA - RESERVA DE PUNTA COMERCIAL Y CLIENTES PRESENTADOS (12 MESES): Toda negociacion que EL COMITENTE celebre directa o indirectamente con personas presentadas o registradas por EL CORREDOR dentro de los doce (12) meses siguientes a la visita o terminacion del encargo causara el pago integro de la comision.",
        extras,
        "",
        "MESA CENTRAL VECY BIENES RAICES: Broker Oficial +57 316 656 9719 | https://wa.me/573166569719 | https://vecy-bienes-raices.vercel.app/"
      ].filter(Boolean).join("\n");

    case "otrosi_modificatorio":
      return [
        `LUGAR Y FECHA DE SUSCRIPCION: ${ciudad}, ${new Date().toLocaleDateString("es-CO")}`,
        `PARTE A (ARRENDADOR / PROMITENTE VENDEDOR / CEDENTE): ${remitente} — Identificacion: ${docRem}`,
        `PARTE B (ARRENDATARIO / PROMITENTE COMPRADOR / CESIONARIO): ${destinatario} — Identificacion: ${docDest}`,
        `CONTRATO PRINCIPAL E INMUEBLE: ${direccion} (${ciudad}) | Matricula SNR: ${matricula} | CHIP: ${chip}`,
        `VALOR / CANON ACTUALIZADO O OBJETO DEL ACUERDO: ${valor}`,
        "",
        `CLAUSULADO DE ${params.tipoOtrosi ? params.tipoOtrosi.toUpperCase() : "OTROSI MODIFICATORIO / CESION / ENTREGA ANTICIPADA"}:`,
        "",
        "PRIMERA - ANTECEDENTE Y VINCULACION: Las partes suscribieron previamente un contrato principal vigente sobre el inmueble individualizado, y de comun acuerdo (Art. 1602 Codigo Civil) deciden modificar, adicionar o regular sus estipulaciones mediante el presente Otrosi.",
        "",
        `SEGUNDA - OBJETO DE LA MODIFICACION / CESION / ENTREGA ANTICIPADA: Se acuerda expresamente la siguiente estipulacion vinculante: ${params.formaPagoDetalle || `Actualizacion de condiciones sobre el inmueble en ${direccion}, plazo de ${plazoMeses} meses, fecha efectiva ${fechaEntrega} y valor/canon de referencia ${valor}.`} En caso de cesion contractual (Art. 887 C.Co.), el cesionario asume integramente los derechos y obligaciones desde la fecha de entrega y aprobacion escrita del contratante cedido.`,
        "",
        "TERCERA - TERMINACION ANTICIPADA / INVENTARIO Y PAZ Y SALVO (SI APLICA): De convenirse entrega anticipada del inmueble, las partes suscribiran Acta de Entrega con verificacion fisica, lectura final de contadores, acreditacion de paz y salvo de servicios publicos y administracion, y declaracion expresa sobre condonacion o pago acordado de clausula penal.",
        "",
        "CUARTA - VIGENCIA DEL CLAUSULADO NO MODIFICADO Y MERITO EJECUTIVO: Las demas clausulas del contrato principal no modificadas expresamente permanecen vigentes e inalteradas. Este otrosi forma parte integral del titulo ejecutivo original (Ley 527/1999 y C.G.P.).",
        extras,
        "",
        "ACOMPANAMIENTO JURIDICO Y NOTARIAL VECY BIENES RAICES: +57 316 656 9719 | https://wa.me/573166569719 | https://vecy-bienes-raices.vercel.app/"
      ].filter(Boolean).join("\n");

    case "acta_entrega_inmueble":
      return [
        `LUGAR Y FECHA DEL ACTA: ${ciudad}, ${fechaEntrega !== "[FECHA PACTADA DE ENTREGA]" ? fechaEntrega : new Date().toLocaleDateString("es-CO")}`,
        `QUIEN ENTREGA: ${remitente} — Identificacion: ${docRem}`,
        `QUIEN RECIBE: ${destinatario} — Identificacion: ${docDest}`,
        `INMUEBLE OBJETO DE ENTREGA: ${direccion} (${ciudad}) | Matricula SNR: ${matricula} | CHIP: ${chip}`,
        `REFERENCIA CONTRACTUAL / VALOR: ${valor}`,
        "",
        "ACTA FORMAL DE ENTREGA MATERIAL, RESTITUCION E INVENTARIO FISICO:",
        "",
        "PRIMERA - ENTREGA MATERIAL DE LLAVES Y POSESION/TENENCIA: En la fecha se hace entrega real y material del inmueble totalmente desocupado, incluyendo juegos de llaves, controles vehiculares/peatonales, garajes y depositos anexos.",
        "",
        "SEGUNDA - ESTADO DE CONSERVACION E INVENTARIO: Las partes verifican conjuntamente el estado de pisos, pintura, carpinteria, banos, cocina, vidrios, griferia e instalaciones electricas/hidraulicas, dejando constancia de observaciones especificas en las Disposiciones Especiales.",
        "",
        "TERCERA - LECTURA DE MEDIDORES Y PAZ Y SALVO DE SERVICIOS Y ADMINISTRACION: Se dejan registrados los consumos acumulados de acueducto, energia electrica y gas natural hasta el corte de entrega, asi como el paz y salvo de cuotas de administracion de propiedad horizontal y acuerdos sobre saldo final o terminacion anticipada sin reclamaciones adicionales si asi se pacta.",
        "",
        "CUARTA - CONSTANCIA PROBATORIA Y FIRMA ELECTRONICA: Suscrita en dos ejemplares o mediante firma electronica certificada (Ley 527 de 1999).",
        extras,
        "",
        "SOPORTE JURIDICO E INVENTARIOS VECY BIENES RAICES: +57 316 656 9719 | https://wa.me/573166569719 | https://vecy-bienes-raices.vercel.app/"
      ].filter(Boolean).join("\n");

    default:
      return [
        `LUGAR Y FECHA DE SUSCRIPCION: ${ciudad}, ${new Date().toLocaleDateString("es-CO")}`,
        `PARTE A (PROMITENTE / ARRENDADOR / COMITENTE): ${remitente} — Documento: ${docRem}`,
        `PARTE B (CONTRAPARTE / ARRENDATARIO / CORREDOR): ${destinatario} — Documento: ${docDest}`,
        `INMUEBLE OBJETO DEL ACTO JURIDICO: ${direccion} (${ciudad})`,
        `CUANTIA / VALOR DE LA OPERACION: ${valor}`,
        "",
        "CLAUSULADO GENERAL OBLIGACIONAL:",
        "",
        "PRIMERA - OBJETO Y VINCULACION JURIDICA: Las partes suscriben de buena fe exenta de culpa el presente instrumento juridico inmobiliario conforme a la legislacion civil y mercantil colombiana.",
        "",
        "SEGUNDA - SANEAMIENTO Y DEBIDA DILIGENCIA: El inmueble objeto del negocio se declara libre de embargos, pleitos pendientes, condiciones resolutorias o limitaciones no declaradas expresamente en el Certificado de Tradicion y Libertad.",
        "",
        "TERCERA - OBLIGACION DE ESCRITURACION Y CUMPLIMIENTO NOTARIAL: Las partes se obligan a concurrir en la fecha y notaria pactada para el perfeccionamiento de la respectiva escritura publica.",
        "",
        "CUARTA - CLAUSULA PENAL Y CUMPLIMIENTO: El incumplimiento grave de cualquiera de las obligaciones aqui pactadas dara lugar al cobro ejecutivo de las arras o clausula penal conforme al Articulo 1592 del Codigo Civil y Articulo 867 del Codigo de Comercio.",
        "",
        "QUINTA - MERITO EJECUTIVO: Las obligaciones dinerarias y de hacer contenidas en este contrato prestan merito ejecutivo pleno de conformidad con el Codigo General del Proceso.",
        "",
        "SEXTA - FIRMA ELECTRONICA Y PLENA VALIDEZ PROBATORIA: De conformidad con la Ley 527 de 1999 y el Decreto 2364 de 2012, este documento puede ser suscrito mediante firma electronica certificada con plena eficacia juridica." + extras,
        "",
        "ADVERTENCIA DE ASESORIA LEGAL VECY:",
        "Minuta base estructural. Para elevarla a contrato definitivo con todas las de la ley y coordinar la notaria, contacte a Eduardo Rivera y Jani Alves en VECY BIENES RAICES (+57 316 656 9719 / +57 319 291 9978)."
      ].filter(Boolean).join("\n");
  }
}

function wrapTextToLines(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const cleanPara = sanitizePdfWinAnsiText(text);
  if (!cleanPara) return [];
  const words = cleanPara.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
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
  return lines;
}

function drawJustifiedLine(
  page: PDFPage,
  line: string,
  font: PDFFont,
  fontSize: number,
  startX: number,
  y: number,
  maxWidth: number,
  isJustified = true,
  textColor = rgb(0.12, 0.13, 0.16)
) {
  const words = line.split(/\s+/).filter(Boolean);
  const normalSpaceWidth = font.widthOfTextAtSize(" ", fontSize);

  if (words.length <= 1 || !isJustified) {
    page.drawText(line, {
      x: startX,
      y,
      size: fontSize,
      font,
      color: textColor
    });
    return;
  }

  let totalWordsWidth = 0;
  for (const w of words) {
    totalWordsWidth += font.widthOfTextAtSize(w, fontSize);
  }
  const numGaps = words.length - 1;
  const extraSpace = maxWidth - totalWordsWidth;
  const calculatedSpace = extraSpace / numGaps;

  // Si el cálculo de espacio se desborda o se comprime de forma antinatural, dibujar a la izquierda
  if (calculatedSpace > normalSpaceWidth * 2.6 || calculatedSpace < normalSpaceWidth * 0.7) {
    page.drawText(line, {
      x: startX,
      y,
      size: fontSize,
      font,
      color: textColor
    });
    return;
  }

  let curX = startX;
  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    const w = words[wIdx];
    page.drawText(w, {
      x: curX,
      y,
      size: fontSize,
      font,
      color: textColor
    });
    curX += font.widthOfTextAtSize(w, fontSize) + calculatedSpace;
  }
}

/**
 * Genera el archivo PDF oficial membretado de VECY BIENES RAÍCES listo para enviar por WhatsApp Baileys.
 */
interface VecyPdfScaffold {
  pdfDoc: PDFDocument;
  fontRegular: PDFFont;
  fontBold: PDFFont;
  pageWidth: number;
  pageHeight: number;
  marginX: number;
  maxWidth: number;
  drawHeader: (page: PDFPage, isFirstPage: boolean) => number;
}

async function initVecyPdfScaffold(options: {
  verificationCode: string;
  title: string;
  normativeFramework: string;
  headerSubtitle?: string;
}): Promise<VecyPdfScaffold> {
  const { verificationCode, title, normativeFramework, headerSubtitle } = options;
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612; // Letter width
  const pageHeight = 792; // Letter height
  const marginX = 52;
  const maxWidth = pageWidth - marginX * 2;

  // Cargar logotipo oficial VECY para el encabezado (versión optimizada en disco)
  let logoImage: any = null;
  const logoCandidates = [
    path.resolve(process.cwd(), "client/public/assets/logo_vecy_header.png"),
    path.resolve(process.cwd(), "assets/logo_vecy_header.png"),
    path.resolve(process.cwd(), "client/public/logo-vecy.png")
  ];
  for (const lp of logoCandidates) {
    if (fs.existsSync(lp)) {
      try {
        const logoBuf = fs.readFileSync(lp);
        logoImage = await pdfDoc.embedPng(logoBuf);
        break;
      } catch {
        // Intenta el siguiente candidato
      }
    }
  }

  const drawHeader = (page: PDFPage, isFirstPage: boolean) => {
    // Franja superior en NEGRO PROFUNDO (#0A0A0A)
    page.drawRectangle({
      x: 0,
      y: pageHeight - 74,
      width: pageWidth,
      height: 74,
      color: rgb(0.04, 0.04, 0.05)
    });
    // Línea dorada imperial (#D4AF37)
    page.drawRectangle({
      x: 0,
      y: pageHeight - 77,
      width: pageWidth,
      height: 3,
      color: rgb(0.83, 0.68, 0.21)
    });

    let textStartX = marginX;
    if (logoImage) {
      page.drawImage(logoImage, {
        x: marginX,
        y: pageHeight - 68,
        width: 44,
        height: 44
      });
      textStartX = marginX + 54;
    }

    page.drawText("VECY BIENES RAICES - CONSULTORIA LEGAL E IA INMOBILIARIA", {
      x: textStartX,
      y: pageHeight - 31,
      size: 11.2,
      font: fontBold,
      color: rgb(0.92, 0.78, 0.32)
    });
    page.drawText("Eduardo A. Rivera & Jani Alves | Broker Oficial: +57 316 656 9719 | https://vecy-bienes-raices.vercel.app/", {
      x: textStartX,
      y: pageHeight - 46,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.88, 0.9, 0.94)
    });
    page.drawText(
      sanitizePdfWinAnsiText(
        headerSubtitle || `Radicado Documental: ${verificationCode} | Validez Notarial y Registral`
      ),
      {
        x: textStartX,
        y: pageHeight - 59,
        size: 7.8,
        font: fontRegular,
        color: rgb(0.72, 0.74, 0.78)
      }
    );

    if (isFirstPage) {
      const titleLines = wrapTextToLines(title, fontBold, 12.8, maxWidth);
      let ty = pageHeight - 104;
      for (const tLine of titleLines) {
        page.drawText(tLine, {
          x: marginX,
          y: ty,
          size: 12.8,
          font: fontBold,
          color: rgb(0.08, 0.09, 0.12)
        });
        ty -= 16;
      }
      page.drawText(`Marco Normativo: ${sanitizePdfWinAnsiText(normativeFramework)}`, {
        x: marginX,
        y: ty - 2,
        size: 8.8,
        font: fontRegular,
        color: rgb(0.35, 0.38, 0.44)
      });
      page.drawLine({
        start: { x: marginX, y: ty - 10 },
        end: { x: pageWidth - marginX, y: ty - 10 },
        thickness: 0.9,
        color: rgb(0.83, 0.68, 0.21)
      });
      return ty - 26;
    }
    return pageHeight - 96;
  };

  return { pdfDoc, fontRegular, fontBold, pageWidth, pageHeight, marginX, maxWidth, drawHeader };
}

async function stampVecyPageNumbersAndSave(params: {
  pdfDoc: PDFDocument;
  fontRegular: PDFFont;
  pageWidth: number;
  marginX: number;
  verificationCode: string;
  footerLabel: string;
}): Promise<Buffer> {
  const { pdfDoc, fontRegular, pageWidth, marginX, verificationCode, footerLabel } = params;
  const allPages = pdfDoc.getPages();
  const totalPages = allPages.length;
  allPages.forEach((p, idx) => {
    p.drawLine({
      start: { x: marginX, y: 28 },
      end: { x: pageWidth - marginX, y: 28 },
      thickness: 0.5,
      color: rgb(0.82, 0.84, 0.88)
    });
    p.drawText(
      sanitizePdfWinAnsiText(`Pagina ${idx + 1} de ${totalPages} - ${footerLabel} - Radicado: ${verificationCode}`),
      {
        x: marginX,
        y: 16,
        size: 7.4,
        font: fontRegular,
        color: rgb(0.45, 0.47, 0.52)
      }
    );
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Genera el archivo PDF membretado de VECY BIENES RAICES en Buffer listo para enviar como adjunto por WhatsApp.
 */
export async function generateLegalDocumentPdf(
  params: LegalDocumentPdfParams
): Promise<GeneratedLegalPdfResult> {
  const meta = getLegalDocumentMetadata(params.tipoDocumento, {
    esPropietarioDirecto: params.esPropietarioDirecto
  });
  const title = sanitizePdfWinAnsiText(params.tituloPersonalizado || meta.title).toUpperCase();
  const bodyContent = sanitizePdfWinAnsiText(params.cuerpoDocumento || buildDefaultLegalBody(params));
  const verificationCode = `DOC-VECY-${crypto.randomBytes(3).toString("hex").toUpperCase()}-2026`;

  const {
    pdfDoc,
    fontRegular,
    fontBold,
    pageWidth,
    pageHeight,
    marginX,
    maxWidth,
    drawHeader
  } = await initVecyPdfScaffold({
    verificationCode,
    title,
    normativeFramework: meta.normativeFramework
  });

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let cursorY = drawHeader(currentPage, true);

  const rawParagraphs = bodyContent.split(/\r?\n/);

  for (let pIdx = 0; pIdx < rawParagraphs.length; pIdx++) {
    const rawP = rawParagraphs[pIdx].trim();
    if (!rawP) {
      cursorY -= 8;
      continue;
    }

    // A) Detectar encabezados principales de sección
    const isSectionHeader = /^(?:CLAUSULADO|DISPOSICIONES|ADVERTENCIA|REQUISITOS|CERTIFICACION)/i.test(rawP);
    if (isSectionHeader) {
      if (cursorY < 140) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        cursorY = drawHeader(currentPage, false);
      }
      cursorY -= 8;
      currentPage.drawText(rawP, {
        x: marginX,
        y: cursorY,
        size: 11,
        font: fontBold,
        color: rgb(0.06, 0.07, 0.1)
      });
      cursorY -= 16;
      continue;
    }

    // B) Detectar cláusulas con título integrado (ej: "CLAUSULA PRIMERA - OBJETO: Cuerpo...")
    const clauseInlineMatch = rawP.match(/^(CLAUSULA\s+[A-ZÁÉÍÓÚ]+(?:\s*-\s*[^:]+)?:)\s*(.*)$/i);
    if (clauseInlineMatch) {
      const headingPart = clauseInlineMatch[1].trim();
      const bodyPart = clauseInlineMatch[2].trim();

      if (cursorY < 140) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        cursorY = drawHeader(currentPage, false);
      }
      cursorY -= 8;
      currentPage.drawText(headingPart, {
        x: marginX,
        y: cursorY,
        size: 10.5,
        font: fontBold,
        color: rgb(0.06, 0.07, 0.1)
      });
      cursorY -= 15;

      if (bodyPart) {
        const pLines = wrapTextToLines(bodyPart, fontRegular, 10.2, maxWidth);
        for (let lIdx = 0; lIdx < pLines.length; lIdx++) {
          if (cursorY < 130) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            cursorY = drawHeader(currentPage, false);
          }
          const isLastLine = lIdx === pLines.length - 1;
          drawJustifiedLine(currentPage, pLines[lIdx], fontRegular, 10.2, marginX, cursorY, maxWidth, !isLastLine);
          cursorY -= 15.2;
        }
      }
      continue;
    }

    // C) Detectar líneas de metadata (ej: "LUGAR Y FECHA DE SUSCRIPCION: Bogotá...")
    const metaMatch = rawP.match(/^([A-ZÁÉÍÓÚ\s/()—-]+:)\s*(.*)$/);
    if (metaMatch && metaMatch[1].length < 50 && !rawP.startsWith("- ")) {
      if (cursorY < 130) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        cursorY = drawHeader(currentPage, false);
      }
      const label = metaMatch[1];
      const val = metaMatch[2];
      const labelWidth = fontBold.widthOfTextAtSize(label, 10);

      currentPage.drawText(label, {
        x: marginX,
        y: cursorY,
        size: 10,
        font: fontBold,
        color: rgb(0.12, 0.14, 0.18)
      });

      if (val) {
        const valStartX = marginX + labelWidth + 4;
        const availableWidth = maxWidth - labelWidth - 4;
        const valLines = wrapTextToLines(val, fontRegular, 10, availableWidth);
        for (let vIdx = 0; vIdx < valLines.length; vIdx++) {
          if (vIdx > 0) {
            cursorY -= 14.5;
            if (cursorY < 130) {
              currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
              cursorY = drawHeader(currentPage, false);
            }
          }
          currentPage.drawText(valLines[vIdx], {
            x: vIdx === 0 ? valStartX : marginX + 16,
            y: cursorY,
            size: 10,
            font: fontRegular,
            color: rgb(0.15, 0.16, 0.2)
          });
        }
      }
      cursorY -= 15;
      continue;
    }

    // D) Párrafos de texto regular (justificados) o ítems de lista
    const isListItem = /^[-•*]\s+|\d+\.\s+/.test(rawP);
    const pLines = wrapTextToLines(rawP, fontRegular, 10.2, maxWidth);
    for (let lIdx = 0; lIdx < pLines.length; lIdx++) {
      if (cursorY < 130) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        cursorY = drawHeader(currentPage, false);
      }
      const isLastLine = lIdx === pLines.length - 1;
      const shouldJustify = !isListItem && !isLastLine;
      drawJustifiedLine(
        currentPage,
        pLines[lIdx],
        fontRegular,
        10.2,
        isListItem ? marginX + 8 : marginX,
        cursorY,
        isListItem ? maxWidth - 8 : maxWidth,
        shouldJustify
      );
      cursorY -= 15.2;
    }
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

  const pdfBuffer = await stampVecyPageNumbersAndSave({
    pdfDoc,
    fontRegular,
    pageWidth,
    marginX,
    verificationCode,
    footerLabel: "Minuta Legal Inmobiliaria VECY BIENES RAICES"
  });
  const fileName = `${meta.defaultFileNamePrefix}_${verificationCode}.pdf`;

  return {
    pdfBuffer,
    fileName,
    verificationCode,
    title,
    normativeFramework: meta.normativeFramework
  };
}

/**
 * Genera el Concepto Jurídico de Estudio de Títulos SNR en PDF Membretado de VECY BIENES RAÍCES
 * con Semáforo visual (Verde / Amarillo / Rojo), auditoría anotación por anotación,
 * cruce de gravámenes vs cancelaciones y alerta comercial patrimonial.
 */
export async function generateCtlStudyPdf(
  report: CtlTitleStudyReport,
  options?: { requestedBy?: string }
): Promise<GeneratedLegalPdfResult> {
  const meta = getLegalDocumentMetadata("estudio_titulos_snr");
  const title = sanitizePdfWinAnsiText(
    `${meta.title} - MATRICULA ${report.metadata.matriculaInmobiliaria}`
  ).toUpperCase();
  const verificationCode = `CTL-VECY-${crypto.randomBytes(3).toString("hex").toUpperCase()}-2026`;

  const {
    pdfDoc,
    fontRegular,
    fontBold,
    pageWidth,
    pageHeight,
    marginX,
    maxWidth,
    drawHeader
  } = await initVecyPdfScaffold({
    verificationCode,
    title,
    normativeFramework: meta.normativeFramework,
    headerSubtitle: `Radicado SNR: ${verificationCode} | Estudio Juridico Preliminar (${report.sourceType})`
  });

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let cursorY = drawHeader(currentPage, true);

  const ensureSpace = (minY = 92) => {
    if (cursorY < minY) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      cursorY = drawHeader(currentPage, false);
    }
  };

  const drawWrapped = (
    text: string,
    opts?: {
      font?: PDFFont;
      size?: number;
      lineHeight?: number;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      minY?: number;
    }
  ) => {
    const f = opts?.font ?? fontRegular;
    const sz = opts?.size ?? 9.2;
    const lh = opts?.lineHeight ?? sz + 4;
    const col = opts?.color ?? rgb(0.14, 0.16, 0.2);
    const ind = opts?.indent ?? 0;
    const lines = wrapTextToLines(text, f, sz, maxWidth - ind);
    for (const ln of lines) {
      ensureSpace(opts?.minY ?? 70);
      currentPage.drawText(ln, { x: marginX + ind, y: cursorY, size: sz, font: f, color: col });
      cursorY -= lh;
    }
  };

  const drawSectionBanner = (sectionTitle: string) => {
    ensureSpace(110);
    cursorY -= 6;
    currentPage.drawRectangle({
      x: marginX,
      y: cursorY - 4,
      width: maxWidth,
      height: 18,
      color: rgb(0.95, 0.96, 0.98)
    });
    currentPage.drawRectangle({
      x: marginX,
      y: cursorY - 4,
      width: 3.5,
      height: 18,
      color: rgb(0.83, 0.68, 0.21)
    });
    currentPage.drawText(sanitizePdfWinAnsiText(sectionTitle), {
      x: marginX + 8,
      y: cursorY + 1,
      size: 9.6,
      font: fontBold,
      color: rgb(0.08, 0.1, 0.14)
    });
    cursorY -= 18;
  };

  // Semáforo Jurídico Destacado
  const verdictPalette =
    report.verdictCode === "VERDE"
      ? {
          bg: rgb(0.91, 0.98, 0.93),
          border: rgb(0.11, 0.55, 0.28),
          dot: rgb(0.11, 0.62, 0.31),
          tag: "VEREDICTO [VERDE]: VIABLE PARA COMPRAVENTA Y CREDITO"
        }
      : report.verdictCode === "AMARILLO"
      ? {
          bg: rgb(1.0, 0.97, 0.88),
          border: rgb(0.8, 0.55, 0.04),
          dot: rgb(0.86, 0.58, 0.05),
          tag: "VEREDICTO [AMARILLO]: VIABLE CON SANEAMIENTO PREVIO EN ESCRITURA"
        }
      : {
          bg: rgb(0.99, 0.92, 0.92),
          border: rgb(0.75, 0.14, 0.14),
          dot: rgb(0.82, 0.15, 0.15),
          tag: "VEREDICTO [ROJO]: RIESGO CRITICO / BLOQUEO DE NEGOCIO"
        };

  const headlineLines = wrapTextToLines(report.riskHeadline, fontRegular, 9, maxWidth - 34);
  const verdictBoxHeight = 32 + headlineLines.length * 13;
  ensureSpace(verdictBoxHeight + 60);
  const boxBottomY = cursorY - verdictBoxHeight + 10;

  currentPage.drawRectangle({
    x: marginX,
    y: boxBottomY,
    width: maxWidth,
    height: verdictBoxHeight,
    color: verdictPalette.bg,
    borderColor: verdictPalette.border,
    borderWidth: 1.2
  });
  currentPage.drawCircle({
    x: marginX + 14,
    y: cursorY - 5,
    size: 5.5,
    color: verdictPalette.dot
  });
  currentPage.drawText(sanitizePdfWinAnsiText(verdictPalette.tag), {
    x: marginX + 26,
    y: cursorY - 9,
    size: 10.2,
    font: fontBold,
    color: verdictPalette.border
  });
  let vy = cursorY - 24;
  for (const hLine of headlineLines) {
    currentPage.drawText(hLine, {
      x: marginX + 12,
      y: vy,
      size: 9,
      font: fontRegular,
      color: rgb(0.14, 0.16, 0.2)
    });
    vy -= 13;
  }
  cursorY = boxBottomY - 14;

  // 1. IDENTIFICACION DEL FOLIO DE MATRICULA (SNR)
  drawSectionBanner("1. IDENTIFICACION DEL FOLIO DE MATRICULA INMOBILIARIA (SNR)");
  const m = report.metadata;
  drawWrapped(`Matricula Inmobiliaria: ${m.matriculaInmobiliaria}   |   ORIP: ${m.orip}`, { font: fontBold });
  drawWrapped(`Estado del Folio: ${m.estadoFolio}   |   Fecha Impresion CTL: ${m.fechaImpresion}`);
  drawWrapped(`CHIP Catastral: ${m.chip}   |   Cedula Catastral: ${m.cedulaCatastral}`);
  drawWrapped(`Ubicacion / Direccion: ${m.direccion} (${m.departamentoMunicipio})`);
  if (options?.requestedBy) {
    drawWrapped(`Solicitado por: ${options.requestedBy}   |   Fecha Analisis: ${report.analyzedAtIso.slice(0, 10)}`);
  }
  if (m.complementacionResumen) {
    drawWrapped(`Complementacion / Antecedente: ${m.complementacionResumen}`, { size: 8.6, color: rgb(0.28, 0.3, 0.36) });
  }

  // 2. PROPIETARIOS ACTUALES Y PORCENTAJES DE DOMINIO
  drawSectionBanner("2. PROPIETARIOS ACTUALES Y DERECHOS DE DOMINIO");
  if (m.propietariosActuales.length > 0) {
    for (const owner of m.propietariosActuales) {
      drawWrapped(
        `- ${owner.nombre}${owner.identificacion ? ` (ID: ${owner.identificacion})` : ""}${owner.porcentaje ? ` - Participacion: ${owner.porcentaje}` : ""}${owner.tipoDerecho ? ` [${owner.tipoDerecho}]` : ""}`,
        { indent: 6 }
      );
    }
  } else {
    drawWrapped("- No se identificaron titulares actuales con marca (X) en las paginas legibles.", { indent: 6 });
  }

  // 3. AUDITORIA DE TRADICION (10 Y 20 ANOS) Y FALSA TRADICION (COD. 0600)
  drawSectionBanner("3. AUDITORIA DE TRADICION (10 Y 20 ANOS) Y CONTROL DE FALSA TRADICION");
  const tr = report.tradition;
  drawWrapped(
    `Tradicion 10 anos (Ley 791/2002): ${tr.tradicion10AnosContinua ? "CONTINUA Y ACREDITADA" : "INCOMPLETA / REQUIERE VALIDACION"}`,
    { font: fontBold, indent: 6 }
  );
  drawWrapped(
    `Tradicion 20 anos (Art. 2532 C.C.): ${tr.tradicion20AnosContinua ? "CONTINUA Y ACREDITADA" : "PARCIAL O FOLIO CON HISTORIAL < 20 ANOS"}`,
    { font: fontBold, indent: 6 }
  );
  drawWrapped(
    `Control Falsa Tradicion (Cod. 0600 / Derechos y Acciones): ${
      tr.tieneFalsaTradicion
        ? tr.falsaTradicionSaneada
          ? `DETECTADA HISTORICAMENTE EN ANOT. #${tr.anotacionesFalsaTradicion.join(", #")} (YA SANEADA)`
          : `ALERTA CRITICA VIGENTE EN ANOT. #${tr.anotacionesFalsaTradicion.join(", #")}`
        : "NO DETECTADA (DOMINIO PLENO)"
    }`,
    {
      font: fontBold,
      indent: 6,
      color: tr.tieneFalsaTradicion && !tr.falsaTradicionSaneada ? rgb(0.75, 0.14, 0.14) : rgb(0.14, 0.16, 0.2)
    }
  );
  drawWrapped(`Resumen de Cadena: ${tr.cadenaDominioResumen}`, { indent: 6 });
  for (const obs of tr.observacionesTradicion) {
    drawWrapped(`* ${obs}`, { indent: 10, size: 8.7 });
  }

  // 4. GRAVAMENES, LIMITACIONES VIGENTES Y CANCELACIONES CRUZADAS
  drawSectionBanner("4. GRAVAMENES VIGENTES, LIMITACIONES Y CRUCE DE CANCELACIONES");
  const allActive = [
    ...report.alertasCriticasVigentes,
    ...report.gravamenesVigentes,
    ...report.limitacionesVigentes
  ];
  if (allActive.length > 0) {
    for (const act of allActive) {
      const prefix = act.estado === "ALERTA_CRITICA" ? "[CRITICA]" : "[VIGENTE]";
      drawWrapped(
        `${prefix} Anot. #${act.numero} (${act.fecha}${act.codigoNaturaleza ? ` | Cod. ${act.codigoNaturaleza}` : ""}): ${act.especificacion}`,
        {
          font: fontBold,
          indent: 6,
          color: act.estado === "ALERTA_CRITICA" ? rgb(0.75, 0.14, 0.14) : rgb(0.65, 0.42, 0.04)
        }
      );
      drawWrapped(`Impacto: ${act.impactoJuridico}`, { indent: 14, size: 8.6 });
    }
  } else {
    drawWrapped("No existen hipotecas, embargos, demandas ni limitaciones vigentes al cierre de este analisis.", {
      indent: 6,
      color: rgb(0.11, 0.52, 0.26)
    });
  }

  if (report.gravamenesCancelados.length > 0) {
    cursorY -= 4;
    drawWrapped("Gravamenes/Limitaciones Historicas ya Canceladas Registralmente:", { font: fontBold, indent: 6 });
    for (const can of report.gravamenesCancelados) {
      drawWrapped(
        `- [CANCELADA] Anot. #${can.numero} (${can.especificacion}) -> Levantada en Anot. #${can.canceladaPorAnotacion ?? "posterior"}`,
        { indent: 12, size: 8.6, color: rgb(0.22, 0.35, 0.25) }
      );
    }
  }

  // 5. AUDITORIA DETALLADA ANOTACION POR ANOTACION
  drawSectionBanner(`5. AUDITORIA ANOTACION POR ANOTACION (${report.auditoriaAnotaciones.length} ANOTACIONES)`);
  if (report.auditoriaAnotaciones.length === 0) {
    drawWrapped("No se encontraron anotaciones individuales legibles en el documento aportado.", { indent: 6 });
  } else {
    for (const item of report.auditoriaAnotaciones) {
      const stTag =
        item.estado === "ALERTA_CRITICA"
          ? "[BLOQUEO/CRITICA]"
          : item.estado === "ACTIVA"
          ? "[VIGENTE]"
          : item.estado === "CANCELADA"
          ? "[CANCELADA]"
          : item.estado === "HISTORICA_TRADICION"
          ? "[TRADICION]"
          : "[INFO]";
      drawWrapped(
        `Anot. #${item.numero} | ${item.fecha} | Cod. ${item.codigoNaturaleza || "S/C"} | ${item.especificacion} -- ${stTag}`,
        { font: fontBold, size: 8.8, indent: 4 }
      );
      const partiesLine = [item.de ? `De: ${item.de}` : "", item.a ? `A: ${item.a}` : ""].filter(Boolean).join("  |  ");
      if (partiesLine) {
        drawWrapped(partiesLine, { size: 8.3, indent: 12, color: rgb(0.28, 0.3, 0.36) });
      }
      drawWrapped(`Criterio: ${item.impactoJuridico}`, { size: 8.4, indent: 12, color: rgb(0.2, 0.22, 0.27) });
      cursorY -= 3;
    }
  }

  // 6. RECOMENDACIONES NOTARIALES ACCIONABLES Y FALTANTES
  drawSectionBanner("6. RECOMENDACIONES NOTARIALES ACCIONABLES");
  report.recomendacionesNotariales.forEach((rec, idx) => {
    drawWrapped(`${idx + 1}. ${rec}`, { indent: 6, size: 8.9 });
  });
  if (report.documentosFaltantesOIncompletos.length > 0) {
    cursorY -= 4;
    drawWrapped("Validacion Documental Pendiente:", { font: fontBold, indent: 6, color: rgb(0.7, 0.35, 0.05) });
    for (const miss of report.documentosFaltantesOIncompletos) {
      drawWrapped(`- ${miss}`, { indent: 12, size: 8.6 });
    }
  }

  // 7. ALERTA DE RIESGO PATRIMONIAL Y ACOMPAÑAMIENTO COMERCIAL VECY (+ QR DE TRAZABILIDAD)
  ensureSpace(125);
  cursorY -= 10;
  const footerBoxY = Math.max(46, cursorY - 76);
  currentPage.drawRectangle({
    x: marginX,
    y: footerBoxY,
    width: maxWidth,
    height: 68,
    color: rgb(0.96, 0.96, 0.98),
    borderColor: rgb(0.83, 0.68, 0.21),
    borderWidth: 0.9
  });

  currentPage.drawText("ALERTA DE RIESGO PATRIMONIAL Y ASESORIA NOTARIAL VECY BIENES RAICES:", {
    x: marginX + 10,
    y: footerBoxY + 52,
    size: 8.2,
    font: fontBold,
    color: rgb(0.12, 0.14, 0.2)
  });
  currentPage.drawText(
    "1. Este concepto preliminar no reemplaza la revision fisica/notarial de escrituras y paz y salvos antes de firma.",
    {
      x: marginX + 10,
      y: footerBoxY + 39,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.25, 0.27, 0.32)
    }
  );
  currentPage.drawText(
    "2. Cierre blindado, saneamiento de falsa tradicion o levantamiento de gravamenes con Eduardo Rivera y Jani Alves.",
    {
      x: marginX + 10,
      y: footerBoxY + 27,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.25, 0.27, 0.32)
    }
  );
  currentPage.drawText(
    `3. Broker Oficial: +57 316 656 9719 | https://wa.me/573166569719 | Trazabilidad: ${verificationCode}`,
    {
      x: marginX + 10,
      y: footerBoxY + 14,
      size: 7.5,
      font: fontBold,
      color: rgb(0.2, 0.22, 0.28)
    }
  );

  try {
    const qrDataUrl = await QRCode.toDataURL(
      `https://vecy-bienes-raices.vercel.app/?ctl=${verificationCode}`,
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
    // Si falla el QR en entorno restringido, el PDF continúa limpio
  }

  const pdfBuffer = await stampVecyPageNumbersAndSave({
    pdfDoc,
    fontRegular,
    pageWidth,
    marginX,
    verificationCode,
    footerLabel: "Estudio de Titulos SNR VECY BIENES RAICES"
  });
  const safeMat = sanitizePdfWinAnsiText(report.metadata.matriculaInmobiliaria || "FOLIO")
    .replace(/[^A-Za-z0-9-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 28) || "FOLIO";
  const fileName = `${meta.defaultFileNamePrefix}_${safeMat}_${verificationCode}.pdf`;

  return {
    pdfBuffer,
    fileName,
    verificationCode,
    title,
    normativeFramework: meta.normativeFramework
  };
}

/**
 * Genera el Concepto Preliminar de Norma Urbana y Prefactibilidad POT Bogotá (Decreto 555 de 2021)
 * en PDF Membretado de VECY BIENES RAICES, con identificacion IDECA/SINUPOT, indices IO/IC, altura,
 * usos permitidos/restringidos, alertas urbanisticas, potencial volumetrico y QR de trazabilidad.
 */
export async function generatePotUrbanNormPdf(
  report: PotUrbanNormReport,
  options?: { requestedBy?: string }
): Promise<GeneratedLegalPdfResult> {
  const meta = getLegalDocumentMetadata("concepto_norma_urbana_pot");
  const identifierLabel =
    report.identificacion.chip && report.identificacion.chip !== "No suministrado"
      ? report.identificacion.chip
      : report.identificacion.direccion !== "No suministrada"
      ? report.identificacion.direccion
      : report.identificacion.upl;
  const title = sanitizePdfWinAnsiText(
    `${meta.title} - ${identifierLabel}`
  ).toUpperCase();
  const verificationCode = `POT-VECY-${crypto.randomBytes(3).toString("hex").toUpperCase()}-2026`;

  const {
    pdfDoc,
    fontRegular,
    fontBold,
    pageWidth,
    pageHeight,
    marginX,
    maxWidth,
    drawHeader
  } = await initVecyPdfScaffold({
    verificationCode,
    title,
    normativeFramework: meta.normativeFramework,
    headerSubtitle: `Radicado Urbanistico: ${verificationCode} | Fuente: ${report.liveGis.source}`
  });

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let cursorY = drawHeader(currentPage, true);

  const ensureSpace = (minY = 92) => {
    if (cursorY < minY) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      cursorY = drawHeader(currentPage, false);
    }
  };

  const drawWrapped = (
    text: string,
    opts?: {
      font?: PDFFont;
      size?: number;
      lineHeight?: number;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      minY?: number;
    }
  ) => {
    const f = opts?.font ?? fontRegular;
    const sz = opts?.size ?? 9.2;
    const lh = opts?.lineHeight ?? sz + 4;
    const col = opts?.color ?? rgb(0.14, 0.16, 0.2);
    const ind = opts?.indent ?? 0;
    const lines = wrapTextToLines(text, f, sz, maxWidth - ind);
    for (const ln of lines) {
      ensureSpace(opts?.minY ?? 70);
      currentPage.drawText(ln, { x: marginX + ind, y: cursorY, size: sz, font: f, color: col });
      cursorY -= lh;
    }
  };

  const drawSectionBanner = (sectionTitle: string) => {
    ensureSpace(110);
    cursorY -= 6;
    currentPage.drawRectangle({
      x: marginX,
      y: cursorY - 4,
      width: maxWidth,
      height: 18,
      color: rgb(0.95, 0.96, 0.98)
    });
    currentPage.drawRectangle({
      x: marginX,
      y: cursorY - 4,
      width: 3.5,
      height: 18,
      color: rgb(0.83, 0.68, 0.21)
    });
    currentPage.drawText(sanitizePdfWinAnsiText(sectionTitle), {
      x: marginX + 8,
      y: cursorY + 1,
      size: 9.6,
      font: fontBold,
      color: rgb(0.08, 0.1, 0.14)
    });
    cursorY -= 18;
  };

  // Caja resumen urbanístico destacado
  const n = report.normaPot555;
  const id = report.identificacion;
  const al = report.alertasYRestricciones;
  const hasHighAlert =
    al.reservaVial.nivel === "ALTA" ||
    al.rondaHidrica.nivel === "ALTA" ||
    al.riesgoRemocionMasa.nivel === "ALTA" ||
    al.bienInteresCultural.nivel === "ALTA";

  const summaryPalette = hasHighAlert
    ? {
        bg: rgb(1.0, 0.97, 0.88),
        border: rgb(0.8, 0.55, 0.04),
        tag: "PREFACTIBILIDAD CON CONDICIONANTES URBANISTICAS RELEVANTES (VERIFICAR CURADURIA)"
      }
    : {
        bg: rgb(0.91, 0.98, 0.93),
        border: rgb(0.11, 0.55, 0.28),
        tag: "PREFACTIBILIDAD NORMATIVA FAVORABLE BAJO MARCO POT DECRETO 555 DE 2021"
      };

  const headlineText = `${n.tratamientoNombre} | ${n.areaActividadNombre} | IO max ${n.indiceOcupacionMax} | IC base ${n.indiceConstruccionBase} (hasta ${n.indiceConstruccionMaxConIncentivos})`;
  const headlineLines = wrapTextToLines(headlineText, fontRegular, 9, maxWidth - 26);
  const summaryBoxHeight = 32 + headlineLines.length * 13;
  ensureSpace(summaryBoxHeight + 60);
  const boxBottomY = cursorY - summaryBoxHeight + 10;

  currentPage.drawRectangle({
    x: marginX,
    y: boxBottomY,
    width: maxWidth,
    height: summaryBoxHeight,
    color: summaryPalette.bg,
    borderColor: summaryPalette.border,
    borderWidth: 1.2
  });
  currentPage.drawText(sanitizePdfWinAnsiText(summaryPalette.tag), {
    x: marginX + 12,
    y: cursorY - 9,
    size: 9.8,
    font: fontBold,
    color: summaryPalette.border
  });
  let sy = cursorY - 24;
  for (const hLine of headlineLines) {
    currentPage.drawText(hLine, {
      x: marginX + 12,
      y: sy,
      size: 9,
      font: fontRegular,
      color: rgb(0.14, 0.16, 0.2)
    });
    sy -= 13;
  }
  cursorY = boxBottomY - 14;

  // 1. IDENTIFICACION CATASTRAL Y TERRITORIAL
  drawSectionBanner("1. IDENTIFICACION CATASTRAL Y TERRITORIAL DEL PREDIO");
  drawWrapped(`CHIP Catastral: ${id.chip}   |   Direccion: ${id.direccion}`, { font: fontBold });
  drawWrapped(`Barrio: ${id.barrio}   |   Localidad: ${id.localidad}   |   Estrato: ${id.estrato}`);
  drawWrapped(`UPL (Decreto 555/2021): ${id.upl}   |   UPZ Referencia: ${id.upz}`);
  drawWrapped(`Clasificacion del Suelo: ${id.clasificacionSuelo}`);
  drawWrapped(
    `Area Terreno: ${id.areaTerrenoM2 !== null ? `${id.areaTerrenoM2} m2` : "No reportada"}   |   Area Construida Actual: ${
      id.areaConstruidaActualM2 !== null ? `${id.areaConstruidaActualM2} m2` : "No reportada"
    }   |   Frente: ${id.frenteMetros !== null ? `${id.frenteMetros} m` : "Por verificar"}`
  );
  if (options?.requestedBy) {
    drawWrapped(`Solicitado por: ${options.requestedBy}   |   Fecha Analisis: ${report.analyzedAtIso.slice(0, 10)}`);
  }

  // 2. PARAMETROS NORMATIVOS POT (DECRETO 555 DE 2021)
  drawSectionBanner("2. PARAMETROS NORMATIVOS POT BOGOTA (DECRETO 555 DE 2021)");
  drawWrapped(`Tratamiento Urbanistico: ${n.tratamientoNombre}`, { font: fontBold, indent: 6 });
  drawWrapped(n.tratamientoDetalle, { indent: 12, size: 8.7 });
  drawWrapped(`Area de Actividad: ${n.areaActividadNombre}`, { font: fontBold, indent: 6 });
  drawWrapped(
    `Indice de Ocupacion Maximo (IO): ${n.indiceOcupacionMax}   |   Indice de Construccion Base (IC): ${n.indiceConstruccionBase}   |   IC con Incentivos / Obligaciones: ${n.indiceConstruccionMaxConIncentivos}`,
    { font: fontBold, indent: 6 }
  );
  drawWrapped(`Altura Maxima Estimada: ${n.alturaMaximaPisos}   |   Tipologia: ${n.tipologiaEdificatoria}`, { indent: 6 });
  drawWrapped(`Antejardin Minimo: ${n.antejardinMinimo}`, { indent: 6 });
  drawWrapped(`Aislamientos Posteriores y Laterales: ${n.aislamientos}`, { indent: 6 });

  // 3. USOS DEL SUELO PERMITIDOS Y CONDICIONADOS
  drawSectionBanner("3. USOS DEL SUELO PERMITIDOS Y CONDICIONADOS");
  drawWrapped("Usos Principales / Complementarios Viables:", { font: fontBold, indent: 6 });
  for (const uso of n.usosPermitidosPrincipales) {
    drawWrapped(`+ ${uso}`, { indent: 12, size: 8.7, color: rgb(0.1, 0.42, 0.22) });
  }
  drawWrapped("Usos Restringidos o Sujetos a Condicion Normativa / Mitigacion:", { font: fontBold, indent: 6 });
  for (const cond of n.usosRestringidosOCondicionados) {
    drawWrapped(`- ${cond}`, { indent: 12, size: 8.7, color: rgb(0.55, 0.35, 0.05) });
  }

  // 4. ALERTAS URBANISTICAS, AMBIENTALES Y PATRIMONIALES
  drawSectionBanner("4. ALERTAS URBANISTICAS, AMBIENTALES Y PATRIMONIALES");
  drawWrapped(`- Reserva Vial / Malla Arterial: [${al.reservaVial.nivel}] ${al.reservaVial.detalle}`, { indent: 6, size: 8.8 });
  drawWrapped(`- Ronda Hidrica / Estructura Ecologica (EEP): [${al.rondaHidrica.nivel}] ${al.rondaHidrica.detalle}`, { indent: 6, size: 8.8 });
  drawWrapped(`- Riesgo / Remocion en Masa o Inundacion (IDIGER): [${al.riesgoRemocionMasa.nivel}] ${al.riesgoRemocionMasa.detalle}`, { indent: 6, size: 8.8 });
  drawWrapped(`- Bien de Interes Cultural (BIC / PEMP): [${al.bienInteresCultural.nivel}] ${al.bienInteresCultural.detalle}`, { indent: 6, size: 8.8 });
  for (const obs of al.observaciones) {
    drawWrapped(`* ${obs}`, { indent: 10, size: 8.6, color: rgb(0.26, 0.28, 0.34) });
  }

  // 5. POTENCIAL CONSTRUCTIVO Y EVALUACION COMERCIAL
  drawSectionBanner("5. POTENCIAL CONSTRUCTIVO, VOLUMETRIA Y VIABILIDAD COMERCIAL");
  const pot = report.potencialConstructivoYComercial;
  if (pot.aplicaCalculoVolumetrico) {
    drawWrapped(
      `Area de Lote Evaluada: ${pot.areaLoteBaseM2} m2   |   Huella Ocupable Piso 1 (IO ${n.indiceOcupacionMax}): ${pot.areaMaximaOcupablePiso1M2} m2`,
      { font: fontBold, indent: 6 }
    );
    drawWrapped(
      `Area Maxima Construible Base (IC ${n.indiceConstruccionBase}): ${pot.areaMaximaConstruibleBaseM2} m2   |   Con Incentivos POT (IC ${n.indiceConstruccionMaxConIncentivos}): ${pot.areaMaximaConstruibleIncentivosM2} m2`,
      { font: fontBold, indent: 6, color: rgb(0.11, 0.45, 0.25) }
    );
    if (pot.unidadesEstimadasVivienda) {
      drawWrapped(`Capacidad Estimada de Unidades: ${pot.unidadesEstimadasVivienda}`, { indent: 6 });
    }
  }
  drawWrapped(`Evaluacion de Frente / Geometria: ${pot.evaluacionFrente}`, { indent: 6 });
  drawWrapped(`Veredicto Comercial: ${pot.veredictoComercial}`, { font: fontBold, indent: 6 });
  for (const rec of pot.recomendacionesTecnicas) {
    drawWrapped(`- ${rec}`, { indent: 12, size: 8.7 });
  }

  // Caja de Advertencia Tecnica + QR + CTA Comercial VECY
  ensureSpace(125);
  cursorY -= 8;
  const footerBoxY = Math.max(72, cursorY - 78);
  currentPage.drawRectangle({
    x: marginX,
    y: footerBoxY,
    width: maxWidth,
    height: 70,
    color: rgb(0.97, 0.97, 0.99),
    borderColor: rgb(0.83, 0.68, 0.21),
    borderWidth: 1
  });
  currentPage.drawText("ADVERTENCIA TECNICA Y CONSULTORIA URBANISTICA VECY BIENES RAICES:", {
    x: marginX + 10,
    y: footerBoxY + 52,
    size: 8.2,
    font: fontBold,
    color: rgb(0.12, 0.14, 0.2)
  });
  currentPage.drawText(
    "1. Este concepto preliminar no sustituye la consulta oficial de manzanas en SINUPOT ni concepto de Curaduria Urbana.",
    {
      x: marginX + 10,
      y: footerBoxY + 39,
      size: 7.4,
      font: fontRegular,
      color: rgb(0.25, 0.27, 0.32)
    }
  );
  currentPage.drawText(
    "2. Estudios de cabida arquitectonica, factibilidad y compra/venta de lotes con Eduardo Rivera y Jani Alves.",
    {
      x: marginX + 10,
      y: footerBoxY + 27,
      size: 7.4,
      font: fontRegular,
      color: rgb(0.25, 0.27, 0.32)
    }
  );
  currentPage.drawText(
    `3. Broker Oficial: +57 316 656 9719 | https://wa.me/573166569719 | Trazabilidad: ${verificationCode}`,
    {
      x: marginX + 10,
      y: footerBoxY + 14,
      size: 7.5,
      font: fontBold,
      color: rgb(0.2, 0.22, 0.28)
    }
  );

  try {
    const qrDataUrl = await QRCode.toDataURL(
      `https://vecy-bienes-raices.vercel.app/?pot=${verificationCode}`,
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
    // Si falla el QR en entorno restringido, el PDF continúa limpio
  }

  const pdfBuffer = await stampVecyPageNumbersAndSave({
    pdfDoc,
    fontRegular,
    pageWidth,
    marginX,
    verificationCode,
    footerLabel: "Analisis POT Bogota VECY BIENES RAICES"
  });
  const safeId = sanitizePdfWinAnsiText(identifierLabel)
    .replace(/[^A-Za-z0-9-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 28) || "PREDIO";
  const fileName = `${meta.defaultFileNamePrefix}_${safeId}_${verificationCode}.pdf`;

  return {
    pdfBuffer,
    fileName,
    verificationCode,
    title,
    normativeFramework: meta.normativeFramework
  };
}

/**
 * Genera la Ficha Financiera y Tributaria Preliminar en PDF Membretado de VECY BIENES RAICES
 * (Simulacion Hipotecaria vs Leasing/UVR, Cap Rate/Cash-on-Cash/Yield y Pre-liquidacion Tributaria DIAN).
 */
export async function generateFinancialAndTaxPdf(
  report: FinancialAndTaxReport,
  options?: { requestedBy?: string }
): Promise<GeneratedLegalPdfResult> {
  const meta = getLegalDocumentMetadata("ficha_financiera_tributaria");
  const copLabel = `$${Math.round(report.valorInmuebleCop).toLocaleString("es-CO")}`;
  const title = sanitizePdfWinAnsiText(
    `${meta.title} - ${report.propertyType.toUpperCase()} (${copLabel})`
  ).toUpperCase();
  const verificationCode = `FIN-VECY-${crypto.randomBytes(3).toString("hex").toUpperCase()}-2026`;

  const {
    pdfDoc,
    fontRegular,
    fontBold,
    pageWidth,
    pageHeight,
    marginX,
    maxWidth,
    drawHeader
  } = await initVecyPdfScaffold({
    verificationCode,
    title,
    normativeFramework: meta.normativeFramework,
    headerSubtitle: `Radicado Financiero/Tributario: ${verificationCode} | Calculo Deterministico Colombia 2026`
  });

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let cursorY = drawHeader(currentPage, true);

  const ensureSpace = (minY = 92) => {
    if (cursorY < minY) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      cursorY = drawHeader(currentPage, false);
    }
  };

  const drawWrapped = (
    text: string,
    opts?: {
      font?: PDFFont;
      size?: number;
      lineHeight?: number;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      minY?: number;
    }
  ) => {
    const f = opts?.font ?? fontRegular;
    const sz = opts?.size ?? 9.2;
    const lh = opts?.lineHeight ?? sz + 4;
    const col = opts?.color ?? rgb(0.14, 0.16, 0.2);
    const ind = opts?.indent ?? 0;
    const lines = wrapTextToLines(text, f, sz, maxWidth - ind);
    for (const ln of lines) {
      ensureSpace(opts?.minY ?? 70);
      currentPage.drawText(ln, { x: marginX + ind, y: cursorY, size: sz, font: f, color: col });
      cursorY -= lh;
    }
  };

  const drawSectionBanner = (sectionTitle: string) => {
    ensureSpace(110);
    cursorY -= 6;
    currentPage.drawRectangle({
      x: marginX,
      y: cursorY - 4,
      width: maxWidth,
      height: 18,
      color: rgb(0.95, 0.96, 0.98)
    });
    currentPage.drawRectangle({
      x: marginX,
      y: cursorY - 4,
      width: 3.5,
      height: 18,
      color: rgb(0.83, 0.68, 0.21)
    });
    currentPage.drawText(sanitizePdfWinAnsiText(sectionTitle), {
      x: marginX + 8,
      y: cursorY + 1,
      size: 9.6,
      font: fontBold,
      color: rgb(0.08, 0.1, 0.14)
    });
    cursorY -= 18;
  };

  const fmtCop = (n: number) => `$${Math.round(n || 0).toLocaleString("es-CO")}`;

  // Caja Resumen Ejecutiva
  const summaryLines = wrapTextToLines(
    `Alcance: ${report.querySummary} | Valor base inmueble: ${fmtCop(report.valorInmuebleCop)} COP | Fecha: ${report.analyzedAtIso.slice(0, 10)}${
      options?.requestedBy ? ` | Solicitado por: ${options.requestedBy}` : ""
    }`,
    fontRegular,
    8.9,
    maxWidth - 24
  );
  const boxH = 28 + summaryLines.length * 12;
  ensureSpace(boxH + 40);
  const boxBottomY = cursorY - boxH + 10;
  currentPage.drawRectangle({
    x: marginX,
    y: boxBottomY,
    width: maxWidth,
    height: boxH,
    color: rgb(0.93, 0.96, 0.99),
    borderColor: rgb(0.14, 0.35, 0.62),
    borderWidth: 1.1
  });
  currentPage.drawText("RESUMEN EJECUTIVO DE MODELACION FINANCIERA Y TRIBUTARIA", {
    x: marginX + 12,
    y: cursorY - 8,
    size: 9.8,
    font: fontBold,
    color: rgb(0.1, 0.28, 0.52)
  });
  let sy = cursorY - 22;
  for (const sLine of summaryLines) {
    currentPage.drawText(sLine, { x: marginX + 12, y: sy, size: 8.9, font: fontRegular, color: rgb(0.14, 0.16, 0.2) });
    sy -= 12;
  }
  cursorY = boxBottomY - 14;

  // 1. SIMULACION HIPOTECARIA VS LEASING HABITACIONAL
  if (report.mortgageVsLeasing) {
    const m = report.mortgageVsLeasing;
    const ch = m.creditoHipotecario;
    const lh80 = m.leasingHabitacional80;
    const lh85 = m.leasingHabitacional85;
    drawSectionBanner("1. SIMULACION CREDITO HIPOTECARIO VS. LEASING HABITACIONAL (LEY 546/1999)");
    drawWrapped(
      `Valor Inmueble: ${fmtCop(m.valorInmuebleCop)}   |   Segmento: ${m.esVis ? "VIS/VIP" : "No-VIS"}   |   Plazo: ${m.plazoAnos} anos (${ch.plazoMeses} meses)   |   Tasa Ref.: ${m.tasaEaUsadaPct}% E.A.`,
      { font: fontBold, indent: 6 }
    );
    drawWrapped(
      `- ${ch.modalidad}: LTV ${ch.ltvPct}% | Financiado ${fmtCop(ch.montoFinanciadoCop)} | Cuota Inicial ${fmtCop(ch.cuotaInicialCop)} | Cuota sin seguros ${fmtCop(ch.cuotaMensualSinSegurosCop)} | Con seguros ${fmtCop(ch.cuotaMensualConSegurosCop)}/mes | Ingreso Min. 30% Ley 546: ${fmtCop(ch.ingresoMinimo30PctLey546Cop)} (ref. 40%: ${fmtCop(ch.ingresoReferencial40PctCop)})`,
      { indent: 6, size: 8.8 }
    );
    drawWrapped(
      `- ${lh80.modalidad}: LTV ${lh80.ltvPct}% | Financiado ${fmtCop(lh80.montoFinanciadoCop)} | Inicial ${fmtCop(lh80.cuotaInicialCop)} | Opcion Compra ${lh80.opcionCompraPct}% (${fmtCop(lh80.opcionCompraCop)}) | Canon sin seguros ${fmtCop(lh80.cuotaMensualSinSegurosCop)} | Con seguros ${fmtCop(lh80.cuotaMensualConSegurosCop)}/mes | Ingreso Min. 30%: ${fmtCop(lh80.ingresoMinimo30PctLey546Cop)} (ref. 40%: ${fmtCop(lh80.ingresoReferencial40PctCop)})`,
      { indent: 6, size: 8.8 }
    );
    drawWrapped(
      `- ${lh85.modalidad}: LTV ${lh85.ltvPct}% | Financiado ${fmtCop(lh85.montoFinanciadoCop)} | Inicial ${fmtCop(lh85.cuotaInicialCop)} | Canon c/seguros ${fmtCop(lh85.cuotaMensualConSegurosCop)}/mes | Ingreso Min. 30%: ${fmtCop(lh85.ingresoMinimo30PctLey546Cop)}`,
      { indent: 6, size: 8.8 }
    );
    if (m.simulacionUvr) {
      const u = m.simulacionUvr;
      drawWrapped(
        `- Escenario UVR (UVR + ${u.tasaRealUvrEaPct}% E.A., UVR ref. ${fmtCop(u.uvrReferenciaCop)}): Cuota mes 1 = ${u.cuotaInicialMensualUvr} UVR (${fmtCop(u.cuotaMes1ConSegurosCop)} c/seguros) -> Anio 5 proyectado (IPC ${u.inflacionAnualReferenciaPct}%): ${fmtCop(u.cuotaProyectadaAnio5ConSegurosCop)}/mes.`,
        { indent: 6, size: 8.8, color: rgb(0.55, 0.35, 0.05) }
      );
    }
    if (m.capacidadIngresoUsuario) {
      const cap = m.capacidadIngresoUsuario;
      drawWrapped(
        `Evaluacion Ingreso Declarado (${fmtCop(cap.ingresoMensualCop)}/mes): Relacion Credito ${cap.relacionCuotaIngresoCreditoPct}% | Leasing ${cap.relacionCuotaIngresoLeasingPct}% -> ${cap.viabilidadLey546}`,
        { font: fontBold, indent: 6, size: 8.8 }
      );
    }
    for (const note of m.comparativoResumen) {
      drawWrapped(`* ${note}`, { indent: 10, size: 8.5, color: rgb(0.25, 0.28, 0.34) });
    }
  }

  // 2. EVALUACION DE INVERSION Y RENTABILIDAD (CAP RATE / CASH-ON-CASH / YIELD)
  if (report.investmentRoi) {
    const r = report.investmentRoi;
    drawSectionBanner("2. EVALUACION DE INVERSION Y RENTABILIDAD (CAP RATE / CASH-ON-CASH / YIELD)");
    drawWrapped(
      `Canon Bruto Mensual: ${fmtCop(r.canonMensualBrutoCop)}   |   Renta Bruta Anual: ${fmtCop(r.rentaBrutaAnualCop)}   |   Yield Mensual Bruto: ${r.yieldMensualBrutoPct.toFixed(2)}%`,
      { font: fontBold, indent: 6 }
    );
    drawWrapped(
      `Cap Rate Bruto: ${r.capRateBrutoPct.toFixed(2)}%   |   Cap Rate Neto (NOI): ${r.capRateNetoPct.toFixed(2)}%   |   Cash-on-Cash Return: ${r.cashOnCashPct.toFixed(2)}%`,
      { font: fontBold, indent: 6, color: rgb(0.11, 0.45, 0.25) }
    );
    drawWrapped(
      `Vacancia Modelada: ${r.vacanciaAplicadaPct}%   |   Ingreso Efectivo Anual: ${fmtCop(r.ingresoEfectivoAnualCop)}   |   NOI Anual: ${fmtCop(r.noiAnualCop)}`,
      { indent: 6, size: 8.8 }
    );
    drawWrapped(
      `OPEX Anual (${fmtCop(r.opexDesglose.totalOpexAnualCop)}): Admon ${fmtCop(r.opexDesglose.administracionAnualCop)} + Predial ${fmtCop(r.opexDesglose.predialAnualCop)} + Mant. ${fmtCop(r.opexDesglose.mantenimientoAnualCop)} + Gestion ${fmtCop(r.opexDesglose.gestionInmobiliariaAnualCop)}`,
      { indent: 6, size: 8.6 }
    );
    drawWrapped(
      `Punto de Equilibrio: Ocupacion minima ${r.puntoEquilibrio.ocupacionMinimaPct.toFixed(1)}% (${r.puntoEquilibrio.mesesMinimosAno} meses/ano) o canon minimo ${fmtCop(r.puntoEquilibrio.canonMensualEquilibrioCop)}/mes | Flujo Neto Mensual: ${fmtCop(r.flujoCajaMensualNetoCop)}`,
      { indent: 6, size: 8.8 }
    );
    if (r.comparativaRentaTradicionalVsCorta) {
      const c = r.comparativaRentaTradicionalVsCorta;
      drawWrapped(
        `Comparativa Tradicional (${c.rentaTradicional.ocupacionPct}% ocup., Cap Neto ${c.rentaTradicional.capRateNetoPct}%, NOI ${fmtCop(c.rentaTradicional.noiAnualCop)}) vs. Renta Corta (${c.rentaCorta.ocupacionPct}% ocup., Cap Neto ${c.rentaCorta.capRateNetoPct}%, NOI ${fmtCop(c.rentaCorta.noiAnualCop)})`,
        { font: fontBold, indent: 6, size: 8.7 }
      );
      drawWrapped(`* ${c.rentaCorta.notaRegulatoriaPhYRnt}`, { indent: 10, size: 8.4, color: rgb(0.55, 0.35, 0.05) });
    }
    for (const obs of r.observacionesInversion) {
      drawWrapped(`* ${obs}`, { indent: 10, size: 8.5, color: rgb(0.25, 0.28, 0.34) });
    }
  }

  // 3. PRE-LIQUIDACION TRIBUTARIA DE VENTA INMOBILIARIA
  if (report.taxPreliquidation) {
    const t = report.taxPreliquidation;
    drawSectionBanner("3. PRE-LIQUIDACION TRIBUTARIA DE VENTA INMOBILIARIA (ESTATUTO TRIBUTARIO 2026)");
    drawWrapped(
      `Valor Venta: ${fmtCop(t.valorVentaCop)}   |   Costo Fiscal${t.costoFiscalFueEstimado ? " (Est. 70%)" : ""}: ${fmtCop(t.costoFiscalUsadoCop)}   |   Utilidad Fiscal: ${fmtCop(t.taxEngineBase.utilidadCalculada)}   |   Posesion: ${t.anosPosesion} ano(s)`,
      { font: fontBold, indent: 6 }
    );
    drawWrapped(
      `- Retencion en la Fuente Notarial (Art. 398 E.T.): ${fmtCop(t.retencionFuenteNotarialCop)} (${t.tarifaRetencionPct}%)`,
      { indent: 6, size: 8.9 }
    );
    if (t.exencionVivienda5000UvtCop > 0) {
      drawWrapped(
        `- Exencion Vivienda de Habitacion (Art. 311-1 E.T., tope 5.000 UVT): -${fmtCop(t.exencionVivienda5000UvtCop)}`,
        { indent: 6, size: 8.9, color: rgb(0.1, 0.42, 0.22) }
      );
    }
    drawWrapped(
      t.esRentaOrdinariaMenor2Anos
        ? "- Regimen Aplicable (< 2 anos posesion): Renta Liquida Ordinaria (tarifa progresiva 0%-39% Art. 241 E.T.)."
        : `- Ganancia Ocasional Estimada (15% Art. 314 E.T.): ${fmtCop(t.gananciaOcasionalCop)} (sobre utilidad gravable ${fmtCop(t.taxEngineBase.utilidadGravableGananciaOcasional)})`,
      { font: fontBold, indent: 6, size: 8.9 }
    );
    drawWrapped(
      `- Impuesto de Timbre Referencial (> 20.000 UVT): ${fmtCop(t.impuestoTimbreEstimadoCop)} (${t.tarifaMarginalTimbreLabel})`,
      { indent: 6, size: 8.8 }
    );
    drawWrapped(
      `- Neto Estimado antes de Derechos Notariales (50/50) y Registro ORIP: ${fmtCop(t.netoEstimadoAntesNotarialesCop)}`,
      { font: fontBold, indent: 6, size: 9, color: rgb(0.11, 0.45, 0.25) }
    );
    for (const nt of t.notasNormativas) {
      drawWrapped(`* ${nt}`, { indent: 10, size: 8.4, color: rgb(0.25, 0.28, 0.34) });
    }
  }

  // Caja de Advertencia Financiera/Tributaria + QR + CTA Comercial VECY
  ensureSpace(125);
  cursorY -= 8;
  const footerBoxY = Math.max(72, cursorY - 78);
  currentPage.drawRectangle({
    x: marginX,
    y: footerBoxY,
    width: maxWidth,
    height: 70,
    color: rgb(0.97, 0.97, 0.99),
    borderColor: rgb(0.83, 0.68, 0.21),
    borderWidth: 1
  });
  currentPage.drawText("ADVERTENCIA TECNICA, CREDITO ALIADO Y PLANEACION TRIBUTARIA VECY:", {
    x: marginX + 10,
    y: footerBoxY + 52,
    size: 8.2,
    font: fontBold,
    color: rgb(0.12, 0.14, 0.2)
  });
  currentPage.drawText(
    "1. Simulacion financiera y tributaria orientativa; confirmar tasa bancaria aprobada, seguros y declaracion DIAN con contador.",
    {
      x: marginX + 10,
      y: footerBoxY + 39,
      size: 7.3,
      font: fontRegular,
      color: rgb(0.25, 0.27, 0.32)
    }
  );
  currentPage.drawText(
    "2. Gastos notariales (50/50), beneficencia y registro ORIP se liquidan por separado segun cuantia y actos de escritura.",
    {
      x: marginX + 10,
      y: footerBoxY + 27,
      size: 7.3,
      font: fontRegular,
      color: rgb(0.25, 0.27, 0.32)
    }
  );
  currentPage.drawText(
    `3. Credito Aliado y Broker Oficial: +57 316 656 9719 | https://wa.me/573166569719 | Trazabilidad: ${verificationCode}`,
    {
      x: marginX + 10,
      y: footerBoxY + 14,
      size: 7.4,
      font: fontBold,
      color: rgb(0.2, 0.22, 0.28)
    }
  );

  try {
    const qrDataUrl = await QRCode.toDataURL(
      `https://vecy-bienes-raices.vercel.app/?fin=${verificationCode}`,
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
    // Si falla el QR en entorno restringido, el PDF continúa limpio
  }

  const pdfBuffer = await stampVecyPageNumbersAndSave({
    pdfDoc,
    fontRegular,
    pageWidth,
    marginX,
    verificationCode,
    footerLabel: "Ficha Financiera y Tributaria VECY BIENES RAICES"
  });
  const safeType = sanitizePdfWinAnsiText(report.propertyType || "INMUEBLE")
    .replace(/[^A-Za-z0-9-]+/g, "_")
    .toUpperCase();
  const fileName = `${meta.defaultFileNamePrefix}_${safeType}_${verificationCode}.pdf`;

  return {
    pdfBuffer,
    fileName,
    verificationCode,
    title,
    normativeFramework: meta.normativeFramework
  };
}

export interface ContractRiskAuditFindingPdf {
  severidad: "ALTA" | "MEDIA" | "BAJA" | "OK";
  titulo: string;
  hallazgo: string;
  fundamentoLegal: string;
  redaccionSugerida: string;
}

export interface ContractRiskAuditPdfParams {
  contractLabel: string;
  normativeRegime: string;
  riskLevel: "VERDE" | "AMARILLO" | "ROJO";
  riskHeadline: string;
  summaryPoints: string[];
  findings: ContractRiskAuditFindingPdf[];
  missingClauses: string[];
  recommendedNextSteps: string[];
  requesterName?: string;
}

/**
 * Genera el PDF membretado de Auditoria de Riesgos Contractuales Inmobiliarios VECY.
 */
export async function generateContractRiskAuditPdf(
  report: ContractRiskAuditPdfParams
): Promise<GeneratedLegalPdfResult> {
  const meta = getLegalDocumentMetadata("auditoria_riesgos_contractuales");
  const verificationCode = `VECY-AUD-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const title = sanitizePdfWinAnsiText(
    `${meta.title} - ${report.contractLabel || "CONTRATO INMOBILIARIO"}`
  );

  const scaffold = await initVecyPdfScaffold({
    verificationCode,
    title,
    normativeFramework: report.normativeRegime || meta.normativeFramework,
    headerSubtitle: `Radicado Auditoria Contract.: ${verificationCode} | Validacion Notarial VECY: +57 316 656 9719`
  });

  const { pdfDoc, fontRegular, fontBold, pageWidth, marginX, maxWidth, drawHeader } = scaffold;
  let currentPage = pdfDoc.addPage([pageWidth, 792]);
  let cursorY = drawHeader(currentPage, true);

  const ensureSpace = (needed: number) => {
    if (cursorY - needed < 82) {
      currentPage = pdfDoc.addPage([pageWidth, 792]);
      cursorY = drawHeader(currentPage, false);
    }
  };

  // Banner semaforo de riesgo
  const bannerBg =
    report.riskLevel === "ROJO"
      ? rgb(0.98, 0.91, 0.91)
      : report.riskLevel === "AMARILLO"
      ? rgb(0.99, 0.96, 0.87)
      : rgb(0.9, 0.97, 0.92);
  const bannerBorder =
    report.riskLevel === "ROJO"
      ? rgb(0.75, 0.18, 0.18)
      : report.riskLevel === "AMARILLO"
      ? rgb(0.76, 0.52, 0.08)
      : rgb(0.14, 0.52, 0.25);
  const bannerText =
    report.riskLevel === "ROJO"
      ? "SEMAFORO ROJO - RIESGO CONTRACTUAL ALTO (NO FIRMAR SIN CORRECCIONES)"
      : report.riskLevel === "AMARILLO"
      ? "SEMAFORO AMARILLO - AJUSTES PREVENTIVOS RECOMENDADOS ANTES DE FIRMA"
      : "SEMAFORO VERDE - ESTRUCTURA EQUILIBRADA Y AJUSTADA A DERECHO";

  const headlineLines = wrapTextToLines(
    sanitizePdfWinAnsiText(`${bannerText} | ${report.riskHeadline}`),
    fontBold,
    9.2,
    maxWidth - 20
  );
  const bannerH = Math.max(34, headlineLines.length * 13 + 14);
  ensureSpace(bannerH + 12);
  currentPage.drawRectangle({
    x: marginX,
    y: cursorY - bannerH,
    width: maxWidth,
    height: bannerH,
    color: bannerBg,
    borderColor: bannerBorder,
    borderWidth: 1.2
  });
  let by = cursorY - 14;
  for (const line of headlineLines) {
    currentPage.drawText(line, {
      x: marginX + 10,
      y: by,
      size: 9.2,
      font: fontBold,
      color: bannerBorder
    });
    by -= 13;
  }
  cursorY -= bannerH + 12;

  const drawSectionHeading = (heading: string) => {
    ensureSpace(26);
    currentPage.drawRectangle({
      x: marginX,
      y: cursorY - 16,
      width: maxWidth,
      height: 18,
      color: rgb(0.94, 0.92, 0.86)
    });
    currentPage.drawText(sanitizePdfWinAnsiText(heading), {
      x: marginX + 8,
      y: cursorY - 11.5,
      size: 9.5,
      font: fontBold,
      color: rgb(0.12, 0.12, 0.14)
    });
    cursorY -= 25;
  };

  const drawBodyLines = (text: string, isBold = false, size = 9.0, color = rgb(0.15, 0.16, 0.2)) => {
    const lines = wrapTextToLines(sanitizePdfWinAnsiText(text), isBold ? fontBold : fontRegular, size, maxWidth - 8);
    for (const ln of lines) {
      ensureSpace(14);
      currentPage.drawText(ln, {
        x: marginX + 4,
        y: cursorY,
        size,
        font: isBold ? fontBold : fontRegular,
        color
      });
      cursorY -= 12.8;
    }
  };

  drawSectionHeading("1. RESUMEN EJECUTIVO Y MARCO NORMATIVO APLICABLE");
  if (report.requesterName) {
    drawBodyLines(`Solicitante / Usuario: ${report.requesterName}`, true);
  }
  drawBodyLines(`Regimen evaluado: ${report.normativeRegime}`);
  for (const pt of report.summaryPoints) {
    drawBodyLines(`- ${pt}`);
  }
  cursorY -= 6;

  drawSectionHeading("2. HALLAZGOS DETECTADOS, CLAUSULAS ABUSIVAS O VACIOS");
  for (let i = 0; i < report.findings.length; i++) {
    const f = report.findings[i];
    drawBodyLines(`${i + 1}. [${f.severidad}] ${f.titulo}`, true, 9.2, rgb(0.1, 0.1, 0.15));
    drawBodyLines(`   Hallazgo: ${f.hallazgo}`);
    drawBodyLines(`   Fundamento legal: ${f.fundamentoLegal}`);
    drawBodyLines(`   Redaccion recomendada: ${f.redaccionSugerida}`, false, 8.8, rgb(0.12, 0.35, 0.18));
    cursorY -= 4;
  }

  if (report.missingClauses.length > 0) {
    drawSectionHeading("3. CLAUSULAS ESENCIALES FALTANTES O POR BLINDAR");
    for (const m of report.missingClauses) {
      drawBodyLines(`- ${m}`);
    }
    cursorY -= 6;
  }

  drawSectionHeading("4. PLAN DE ACCION Y VALIDACION NOTARIAL VECY");
  for (const step of report.recommendedNextSteps) {
    drawBodyLines(`- ${step}`);
  }

  ensureSpace(84);
  const footerBoxY = Math.max(46, cursorY - 72);
  currentPage.drawRectangle({
    x: marginX,
    y: footerBoxY,
    width: maxWidth,
    height: 66,
    color: rgb(0.97, 0.96, 0.92),
    borderColor: rgb(0.83, 0.68, 0.21),
    borderWidth: 1
  });
  currentPage.drawText("VALIDACION JURIDICA PRESENCIAL Y FIRMA NOTARIAL VECY BIENES RAICES", {
    x: marginX + 10,
    y: footerBoxY + 51,
    size: 8.6,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.12)
  });
  currentPage.drawText(
    "1. Esta auditoria es preventiva y preliminar; no reemplaza la revision presencial sobre folios SNR originales.",
    {
      x: marginX + 10,
      y: footerBoxY + 38,
      size: 7.4,
      font: fontRegular,
      color: rgb(0.25, 0.27, 0.32)
    }
  );
  currentPage.drawText(
    "2. Blindaje de arras, clausula penal, polizas y notariado con Eduardo A. Rivera y Jani Alves.",
    {
      x: marginX + 10,
      y: footerBoxY + 26,
      size: 7.4,
      font: fontRegular,
      color: rgb(0.25, 0.27, 0.32)
    }
  );
  currentPage.drawText(
    `3. Broker Oficial: +57 316 656 9719 | https://wa.me/573166569719 | Radicado: ${verificationCode}`,
    {
      x: marginX + 10,
      y: footerBoxY + 13,
      size: 7.5,
      font: fontBold,
      color: rgb(0.2, 0.22, 0.28)
    }
  );

  try {
    const qrDataUrl = await QRCode.toDataURL(
      `https://vecy-bienes-raices.vercel.app/?aud=${verificationCode}`,
      { margin: 1, width: 120 }
    );
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
    const qrImage = await pdfDoc.embedPng(Buffer.from(qrBase64, "base64"));
    currentPage.drawImage(qrImage, {
      x: pageWidth - marginX - 62,
      y: footerBoxY + 5,
      width: 56,
      height: 56
    });
  } catch {
    // Continuar sin QR si el entorno restringe QRCode
  }

  const pdfBuffer = await stampVecyPageNumbersAndSave({
    pdfDoc,
    fontRegular,
    pageWidth,
    marginX,
    verificationCode,
    footerLabel: "Auditoria Contractual VECY BIENES RAICES"
  });
  const safeLabel = sanitizePdfWinAnsiText(report.contractLabel || "CONTRATO")
    .replace(/[^A-Za-z0-9-]+/g, "_")
    .toUpperCase();
  const fileName = `${meta.defaultFileNamePrefix}_${safeLabel}_${verificationCode}.pdf`;

  return {
    pdfBuffer,
    fileName,
    verificationCode,
    title,
    normativeFramework: meta.normativeFramework
  };
}

/**
 * Genera el Concepto Tecnico-Juridico de Propiedad Horizontal (Ley 675 de 2001),
 * Auditoria RPH / Actas / RNT / Airbnb y Prefactibilidad de Subdivision o Englobe en PDF Membretado VECY.
 */
export async function generatePropiedadHorizontalPdf(
  report: PropiedadHorizontalReport,
  options?: { requestedBy?: string }
): Promise<GeneratedLegalPdfResult> {
  const meta = getLegalDocumentMetadata("concepto_propiedad_horizontal");
  const verificationCode = `VECY-PH-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const title = sanitizePdfWinAnsiText(report.headline || meta.title);

  const scaffold = await initVecyPdfScaffold({
    verificationCode,
    title,
    normativeFramework: report.normativeFramework || meta.normativeFramework,
    headerSubtitle: `Radicado PH Ley 675: ${verificationCode} | Asesoria Notarial y PH VECY: +57 316 656 9719`
  });

  const { pdfDoc, fontRegular, fontBold, pageWidth, marginX, maxWidth, drawHeader } = scaffold;
  let currentPage = pdfDoc.addPage([pageWidth, 792]);
  let cursorY = drawHeader(currentPage, true);

  const ensureSpace = (needed: number) => {
    if (cursorY - needed < 82) {
      currentPage = pdfDoc.addPage([pageWidth, 792]);
      cursorY = drawHeader(currentPage, false);
    }
  };

  // Banner semaforo de riesgo PH
  const bannerBg =
    report.riskLevel === "ROJO"
      ? rgb(0.98, 0.91, 0.91)
      : report.riskLevel === "AMARILLO"
      ? rgb(0.99, 0.96, 0.87)
      : rgb(0.9, 0.97, 0.92);
  const bannerBorder =
    report.riskLevel === "ROJO"
      ? rgb(0.75, 0.18, 0.18)
      : report.riskLevel === "AMARILLO"
      ? rgb(0.76, 0.52, 0.08)
      : rgb(0.14, 0.52, 0.25);
  const bannerPrefix =
    report.riskLevel === "ROJO"
      ? "SEMAFORO ROJO - INVALIDEZ O RIESGO EN PROPIEDAD HORIZONTAL"
      : report.riskLevel === "AMARILLO"
      ? "SEMAFORO AMARILLO - VALIDACION TECNICA / REGISTRAL REQUERIDA"
      : "SEMAFORO VERDE - CONFORME AL REGIMEN DE PROPIEDAD HORIZONTAL";

  const headlineLines = wrapTextToLines(
    sanitizePdfWinAnsiText(`${bannerPrefix} | ${report.riskHeadline}`),
    fontBold,
    9.0,
    maxWidth - 20
  );
  const bannerH = Math.max(34, headlineLines.length * 13 + 14);
  ensureSpace(bannerH + 12);
  currentPage.drawRectangle({
    x: marginX,
    y: cursorY - bannerH,
    width: maxWidth,
    height: bannerH,
    color: bannerBg,
    borderColor: bannerBorder,
    borderWidth: 1.2
  });
  let by = cursorY - 14;
  for (const line of headlineLines) {
    currentPage.drawText(line, {
      x: marginX + 10,
      y: by,
      size: 9.0,
      font: fontBold,
      color: bannerBorder
    });
    by -= 13;
  }
  cursorY -= bannerH + 12;

  const drawSectionHeading = (heading: string) => {
    ensureSpace(26);
    currentPage.drawRectangle({
      x: marginX,
      y: cursorY - 16,
      width: maxWidth,
      height: 18,
      color: rgb(0.94, 0.92, 0.86)
    });
    currentPage.drawText(sanitizePdfWinAnsiText(heading), {
      x: marginX + 8,
      y: cursorY - 11.5,
      size: 9.5,
      font: fontBold,
      color: rgb(0.12, 0.12, 0.14)
    });
    cursorY -= 25;
  };

  const drawBodyLines = (text: string, isBold = false, size = 9.0, color = rgb(0.15, 0.16, 0.2)) => {
    const lines = wrapTextToLines(sanitizePdfWinAnsiText(text), isBold ? fontBold : fontRegular, size, maxWidth - 8);
    for (const ln of lines) {
      ensureSpace(14);
      currentPage.drawText(ln, {
        x: marginX + 4,
        y: cursorY,
        size,
        font: isBold ? fontBold : fontRegular,
        color
      });
      cursorY -= 12.8;
    }
  };

  drawSectionHeading("1. RESUMEN EJECUTIVO Y MARCO NORMATIVO APLICABLE");
  const reqName = options?.requestedBy || report.requesterName;
  if (reqName) {
    drawBodyLines(`Solicitante / Copropietario o Asesor: ${reqName}`, true);
  }
  drawBodyLines(`Regimen normativo: ${report.normativeFramework}`);
  for (const pt of report.summaryPoints) {
    drawBodyLines(`- ${pt}`);
  }
  cursorY -= 6;

  if (report.calculations) {
    const c = report.calculations;
    drawSectionHeading("2. PARAMETROS Y CALCULOS LEY 675 DE 2001");
    if (c.presupuestoTotalCop !== undefined) {
      drawBodyLines(`- Presupuesto / Cuota global base: $${Math.round(c.presupuestoTotalCop).toLocaleString("es-CO")} COP`);
    }
    if (c.coeficienteUnidadPct !== undefined) {
      drawBodyLines(`- Coeficiente de copropiedad de la unidad: ${c.coeficienteUnidadPct}%`);
    }
    if (c.expensaUnidadCop !== undefined) {
      drawBodyLines(`- Expensa comun calculada: $${Math.round(c.expensaUnidadCop).toLocaleString("es-CO")} COP / mes`, true);
    }
    if (c.sumaCoeficientesPct !== undefined) {
      drawBodyLines(`- Sumatoria de coeficientes validada: ${c.sumaCoeficientesPct}% (${c.sumaCoeficientesValida ? "Valida 100%" : "Descuadrada"})`);
    }
    if (c.interesMoraMaxLegalCop !== undefined) {
      drawBodyLines(
        `- Tope mora maximo legal (1.5x IBC ref. ${c.tasaMoraMaxLegalMensualPct}% M.V. / ${c.tasaMoraMaxLegalEaPct}% E.A.): $${Math.round(c.interesMoraMaxLegalCop).toLocaleString("es-CO")} COP`,
        true
      );
    } else {
      drawBodyLines(
        `- Tope mora maximo legal Art. 30 Ley 675: 1.5x IBC (Ref. ${c.tasaMoraMaxLegalEaPct}% E.A. / ~${c.tasaMoraMaxLegalMensualPct}% M.V. - verificar Superfinanciera).`
      );
    }
    drawBodyLines("- Mayoria calificada Art. 46: 70% del total de coeficientes para reformas RPH, cambio de destinacion y cuotas > 4x mensuales.");
    drawBodyLines(`- Caducidad impugnacion de actas (Art. 49 Ley 675): ${c.plazoImpugnacionMeses} meses desde comunicacion/publicacion.`);
    drawBodyLines(`- ${c.solidaridadCompraventaArt29}`);
    cursorY -= 6;
  }

  if (report.findings.length > 0) {
    drawSectionHeading("3. AUDITORIA DE CLAUSULAS, RNT / AIRBNB Y HALLAZGOS JURIDICOS");
    for (let i = 0; i < report.findings.length; i++) {
      const f = report.findings[i];
      drawBodyLines(`${i + 1}. [${f.severidad}] ${f.titulo}`, true, 9.1, rgb(0.1, 0.1, 0.15));
      drawBodyLines(`   Hallazgo: ${f.hallazgo}`);
      drawBodyLines(`   Fundamento legal: ${f.fundamentoLegal}`);
      drawBodyLines(`   Accion recomendada: ${f.recomendacion}`, false, 8.8, rgb(0.12, 0.35, 0.18));
      cursorY -= 4;
    }
  }

  if (report.prefeasibility) {
    drawSectionHeading(`4. CHECKLIST TECNICO-NOTARIAL: ${report.prefeasibility.operacionLabel}`);
    for (const item of report.prefeasibility.checklistTecnicoNotarial) {
      drawBodyLines(`- ${item}`);
    }
    cursorY -= 6;
  }

  drawSectionHeading("5. PLAN DE ACCION Y VALIDACION NOTARIAL VECY");
  for (const step of report.recommendedNextSteps) {
    drawBodyLines(`- ${step}`);
  }

  ensureSpace(84);
  const footerBoxY = Math.max(46, cursorY - 72);
  currentPage.drawRectangle({
    x: marginX,
    y: footerBoxY,
    width: maxWidth,
    height: 66,
    color: rgb(0.97, 0.96, 0.92),
    borderColor: rgb(0.83, 0.68, 0.21),
    borderWidth: 1
  });
  currentPage.drawText("ASESORIA ESPECIALIZADA EN PROPIEDAD HORIZONTAL Y NOTARIADO VECY BIENES RAICES", {
    x: marginX + 10,
    y: footerBoxY + 51,
    size: 8.4,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.12)
  });
  currentPage.drawText(
    "1. Concepto preliminar basado en Ley 675/2001; verificar escritura del RPH inscrita en ORIP y certificacion IBC vigente.",
    {
      x: marginX + 10,
      y: footerBoxY + 38,
      size: 7.3,
      font: fontRegular,
      color: rgb(0.25, 0.27, 0.32)
    }
  );
  currentPage.drawText(
    "2. Reformas a RPH, desenglobes, impugnaciones y validacion RNT con Eduardo A. Rivera y Jani Alves.",
    {
      x: marginX + 10,
      y: footerBoxY + 26,
      size: 7.3,
      font: fontRegular,
      color: rgb(0.25, 0.27, 0.32)
    }
  );
  currentPage.drawText(
    `3. Broker Oficial: +57 316 656 9719 | https://wa.me/573166569719 | Radicado: ${verificationCode}`,
    {
      x: marginX + 10,
      y: footerBoxY + 13,
      size: 7.5,
      font: fontBold,
      color: rgb(0.2, 0.22, 0.28)
    }
  );

  try {
    const qrDataUrl = await QRCode.toDataURL(
      `https://vecy-bienes-raices.vercel.app/?ph=${verificationCode}`,
      { margin: 1, width: 120 }
    );
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
    const qrImage = await pdfDoc.embedPng(Buffer.from(qrBase64, "base64"));
    currentPage.drawImage(qrImage, {
      x: pageWidth - marginX - 62,
      y: footerBoxY + 5,
      width: 56,
      height: 56
    });
  } catch {
    // Continuar sin QR si el entorno restringe QRCode
  }

  const pdfBuffer = await stampVecyPageNumbersAndSave({
    pdfDoc,
    fontRegular,
    pageWidth,
    marginX,
    verificationCode,
    footerLabel: "Propiedad Horizontal VECY BIENES RAICES"
  });
  const modeSlug = report.mode.toUpperCase();
  const fileName = `${meta.defaultFileNamePrefix}_${modeSlug}_${verificationCode}.pdf`;

  return {
    pdfBuffer,
    fileName,
    verificationCode,
    title,
    normativeFramework: meta.normativeFramework
  };
}



