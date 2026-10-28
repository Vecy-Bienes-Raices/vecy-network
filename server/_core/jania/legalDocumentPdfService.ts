import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from "pdf-lib";
import QRCode from "qrcode";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

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

    case "promesa_compraventa":
      return [
        `LUGAR Y FECHA DE SUSCRIPCION: ${ciudad}, ${new Date().toLocaleDateString("es-CO")}`,
        `PROMITENTE VENDEDOR (PARTE A): ${remitente} — Identificacion: ${docRem}`,
        `PROMITENTE COMPRADOR (PARTE B): ${destinatario} — Identificacion: ${docDest}`,
        `INMUEBLE(S) OBJETO DEL ACTO: ${direccion} (${ciudad})`,
        `CUANTIA / PRECIO TOTAL CONVENIDO: ${valor}`,
        "",
        "CLAUSULADO CONTRACTUAL DE PROMESA DE COMPRAVENTA:",
        "",
        "CLAUSULA PRIMERA - OBJETO DEL CONTRATO: El PROMITENTE VENDEDOR promete transferir a titulo de compraventa real y efectiva a favor del PROMITENTE COMPRADOR, y este promete adquirir al mismo titulo, el derecho de dominio y la posesion material plena sobre el(los) bien(es) inmueble(s) debidamente individualizado(s) en la clausula segunda de este contrato.",
        "",
        `CLAUSULA SEGUNDA - IDENTIFICACION, INDIVIDUALIZACION Y LINDEROS: El inmueble principal objeto de esta promesa se encuentra ubicado en la direccion: ${direccion}, en la ciudad de ${ciudad}. Folio de Matricula Inmobiliaria SNR No. [NUMERO DE MATRICULA], Cedula Catastral / CHIP No. [CHIP / CEDULA CATASTRAL]. LINDEROS TECNICOS Y ESPECIFICACIONES: Los linderos generales y especiales, cabida, medidas y demas especificaciones tecnicas se encuentran contenidos en la Escritura Publica antecedente No. [NUMERO ESCRITURA] otorgada en la Notaria [NOTARIA Y CIUDAD], documento que se entiende incorporado integramente a este instrumento. ${params.clausulasEspeciales && /permuta|daci[oó]n/i.test(params.clausulasEspeciales) ? "(En caso de dacion o permuta parcial, los datos registrales y linderos del inmueble entregado en parte de pago se transcriben en las Disposiciones Especiales adjuntas)." : ""}`,
        "",
        "CLAUSULA TERCERA - TRADICION Y TITULO DE ADQUISICION: El PROMITENTE VENDEDOR garantiza que adquirio el dominio y posesion material del inmueble objeto de la venta mediante Escritura Publica debidamente registrada, acreditando una tradicion ininterrumpida, pacifica y publica por mas de veinte (20) anos exenta de pleitos pendientes, gravamenes o litigios.",
        "",
        `CLAUSULA CUARTA - PRECIO, FORMA DE PAGO Y DESEMBOLSOS: El precio de la venta prometida se fija en la suma de ${valor} moneda legal colombiana, la cual sera cancelada de la siguiente manera:`,
        "1. Saldo inicial a la firma del presente contrato mediante cheque de gerencia o transferencia bancaria verificada.",
        "2. Saldo en dinero efectivo o mediante desembolso de credito hipotecario / leasing habitacional / recursos propios a la fecha de la firma de la Escritura Publica.",
        "3. Cruce en especie o dacion en pago segun lo pactado expresamente en las Disposiciones Especiales de este contrato.",
        "",
        "CLAUSULA QUINTA - SITUACION JURIDICA, SANEAMIENTO Y VICIOS REDHIBITORIOS: El PROMITENTE VENDEDOR declara que el bien objeto de enajenacion se encuentra libre de todo gravamen, embargo, hipoteca, condiciones resolutorias, pleito pendiente, censo, anticresis, contrato de arrendamiento por escritura publica o privada no informado, servidumbres pasivas no declaradas y libre de cualquier afectacion o limitacion al dominio. No obstante, se obliga al saneamiento por eviccion y vicios redhibitorios de conformidad con los Articulos 1880 y 1893 del Codigo Civil Colombiano.",
        "",
        "CLAUSULA SEXTA - REGIMEN DE FAMILIA Y AFECTACIONES PATRIMONIALES: Las partes declaran bajo juramento su estado civil actual y manifiestan que sobre el inmueble no pesa Afectacion a Vivienda Familiar (Ley 258 de 1996 modificada por Ley 854 de 2003) ni Patrimonio de Familia Inembargable (Ley 70 de 1931). En caso de existir, el PROMITENTE VENDEDOR se obliga a su cancelacion previa o concurrente en la misma Escritura de compraventa con la comparecencia de su conyuge o companero(a) permanente.",
        "",
        "CLAUSULA SEPTIMA - OTORGAMIENTO DE LA ESCRITURA PUBLICA DEFINITIVA: La Escritura Publica de Compraventa que perfeccionara la transferencia del dominio sera suscrita por las partes en la fecha, hora y Notaria estipulada expresamente [FECHA, HORA Y NOTARIA PACTADA], acto para el cual las partes compareceran personalmente o mediante apoderado debidamente facultado con poder especial notarial amplio y suficiente.",
        "",
        "CLAUSULA OCTAVA - ENTREGA MATERIAL, INVENTARIO Y POSESION: La entrega real y material del inmueble se realizara el dia [FECHA PACTADA DE ENTREGA], fecha en la cual el PROMITENTE VENDEDOR hara entrega de las llaves del inmueble, sus anexos, garajes y depositos, totalmente desocupado y en el estado de conservacion acordado, levantando el Acta de Entrega e Inventario Fisico debidamente firmada por las partes.",
        "",
        "CLAUSULA NOVENA - IMPUESTOS, TASAS, CONTRIBUCIONES Y SERVICIOS PUBLICOS: El PROMITENTE VENDEDOR se obliga a entregar el inmueble a paz y salvo por concepto de Impuesto Predial Unificado, contribucion de valorizacion (IDU), cuotas ordinarias y extraordinarias de administracion de propiedad horizontal y facturacion al dia de servicios publicos domiciliarios (acueducto, energia, gas, telefono) hasta la fecha de la entrega material.",
        "",
        "CLAUSULA DECIMA - ARRAS Y CLAUSULA PENAL PECUNIARIA: En caso de incumplimiento total o parcial o retardo culpable en el otorgamiento de la Escritura Publica o en la entrega del bien, la parte incumplida pagara a la parte cumplida, a titulo de clausula penal pecuniaria (Art. 1592 C.C. y Art. 867 C.Co.), una suma equivalente al porcentaje pactado del valor total de la venta, la cual sera exigible ejecutivamente sin necesidad de requerimiento judicial ni privado ni constitucion previa en mora, a la cual las partes renuncian expresamente.",
        "",
        "CLAUSULA DECIMAPRIMERA - GASTOS NOTARIALES, RETENCION EN LA FUENTE Y REGISTRO: Los gastos derivados de la presente negociacion se distribuiran conforme a la ley y las costumbres notariales colombianas: (a) Derechos Notariales en un 50% a cargo de cada parte; (b) Retencion en la Fuente por enajenacion en un 100% a cargo del PROMITENTE VENDEDOR; (c) Impuesto de Registro y Beneficencia en un 100% a cargo del PROMITENTE COMPRADOR.",
        "",
        "CLAUSULA DECIMASEGUNDA - MERITO EJECUTIVO Y ACUERDO COMPLETO: Las partes reconocen expresamente que el presente contrato presta merito ejecutivo pleno para exigir judicialmente el cumplimiento de las obligaciones de dar, hacer y dinerarias aqui contenidas conforme al Codigo General del Proceso.",
        "",
        "CLAUSULA DECIMATERCERA - FIRMA ELECTRONICA Y VALIDEZ PROBATORIA: De conformidad con la Ley 527 de 1999 y el Decreto 2364 de 2012, este documento goza de plena validez, autenticidad y eficacia probatoria cuando sea suscrito mediante mecanismos de firma electronica certificada con estampado cronologico y trazabilidad digital.",
        extras,
        "",
        "ADVERTENCIA DE VALIDEZ Y MINUTA ESTRUCTURAL (VECY BIENES RAICES):",
        "El presente instrumento constituye una Minuta Estructural Preliminar y base documental emitida por la plataforma JanIA de VECY BIENES RAICES. Para elevar este instrumento a contrato definitivo blindado con todas las de la ley, las partes deben completar: (i) transcripcion literal exacta de linderos tecnicos segun escrituras antecedentes y folios SNR; (ii) identificacion plena y regimen patrimonial/afectacion de conyuges; (iii) fijacion precisa de fecha, hora y notaria especifica para la firma escritural; y (iv) realizacion del estudio de titulos de 20 anos. Para estructurar y coordinar el contrato definitivo con acompanamiento notarial y pericial personalizado, comuniquese con la Direccion Legal y Notarial de VECY BIENES RAICES (Eduardo A. Rivera & Jani Alves | Broker Oficial: +57 316 656 9719 / +57 319 291 9978 | https://vecy-bienes-raices.vercel.app/)."
      ].filter(Boolean).join("\n");

    case "contrato_arrendamiento_vivienda":
      return [
        `LUGAR Y FECHA DE SUSCRIPCION: ${ciudad}, ${new Date().toLocaleDateString("es-CO")}`,
        `ARRENDADOR(A): ${remitente} — Identificacion: ${docRem}`,
        `ARRENDATARIO(A): ${destinatario} — Identificacion: ${docDest}`,
        `INMUEBLE OBJETO DEL ARRENDAMIENTO: ${direccion} (${ciudad})`,
        `CANON MENSUAL DE ARRENDAMIENTO: ${valor}`,
        "",
        "CLAUSULADO DE CONTRATO DE ARRENDAMIENTO DE VIVIENDA URBANA (LEY 820 DE 2003):",
        "",
        "CLAUSULA PRIMERA - OBJETO Y DESTINO EXCLUSIVO: El ARRENDADOR entrega a titulo de arrendamiento el goce del bien inmueble debidamente individualizado, y el ARRENDATARIO lo recibe destinandolo de manera exclusiva para vivienda familiar, sin que pueda destinarlo a fines comerciales, industriales ni a actividades contrarias a la ley o a la moral.",
        "",
        `CLAUSULA SEGUNDA - CANON, FORMA DE PAGO Y LUGAR: El ARRENDATARIO pagara mensualmente por concepto de canon de arrendamiento la suma de ${valor}, dentro de los primeros cinco (5) dias calendario de cada periodo mensual, mediante consignacion o transferencia bancaria en la cuenta designada por el ARRENDADOR.`,
        "",
        "CLAUSULA TERCERA - INCREMENTO ANUAL DEL CANON (ART. 20 LEY 820 DE 2003): Vencido cada periodo de doce (12) meses de ejecucion contractual, el canon de arrendamiento se incrementara de pleno derecho en un porcentaje maximo equivalente a la variacion del Indice de Precios al Consumidor (IPC) certificado por el DANE para el ano inmediatamente anterior, previa notificacion al ARRENDATARIO.",
        "",
        "CLAUSULA CUARTA - TERMINO DE DURACION Y PRORROGAS: El termino inicial de duracion de este contrato sera de doce (12) meses contados a partir de la entrega del inmueble. Dicho termino se entendera prorrogado automaticamente por periodos iguales si ninguna de las partes notifica a la otra por escrito su intencion de no prorrogarlo con antelacion no menor a tres (3) meses (Art. 6 Ley 820/2003).",
        "",
        "CLAUSULA QUINTA - SERVICIOS PUBLICOS DOMICILIARIOS Y ADMINISTRACION: El pago oportuno de los servicios publicos de acueducto, energia, gas y telecomunicaciones sera a cargo exclusivo del ARRENDATARIO. Las cuotas ordinarias de administracion de propiedad horizontal seran a cargo del responsable pactado expresamente en las estipulaciones especiales.",
        "",
        "CLAUSULA SEXTA - PROHIBICION DE CESION Y SUBARRIENDO (ART. 17 LEY 820 DE 2003): El ARRENDATARIO no podra ceder total ni parcialmente el contrato de arrendamiento ni subarrendar el inmueble sin autorizacion previa, expresa y escrita del ARRENDADOR. La violacion de esta clausula facultara al ARRENDADOR para dar por terminado el contrato de manera inmediata.",
        "",
        "CLAUSULA SEPTIMA - REPARACIONES LOCATIVAS Y MEJORAS: Las reparaciones locativas que se deriven del uso legitimo y natural del bien seran asumidas por el ARRENDATARIO conforme a los Articulos 1985 y 1993 del Codigo Civil. No podra realizar reformas ni modificaciones arquitectonicas sin previa autorizacion escrita del ARRENDADOR.",
        "",
        "CLAUSULA OCTAVA - CLAUSULA PENAL PECUNIARIA: El incumplimiento de cualquiera de las obligaciones emanadas del presente contrato hara exigible a la parte incumplida el pago de una pena pecuniaria equivalente a tres (3) canones mensuales de arrendamiento vigentes, exigible ejecutivamente sin necesidad de requerimiento alguno.",
        "",
        "CLAUSULA NOVENA - RESTITUCION Y ENTREGA CON INVENTARIO: Al vencimiento del contrato o de sus prorrogas, el ARRENDATARIO restituira el inmueble en el mismo estado en que lo recibio, salvo el deterioro derivado del uso y goce legitimo, suscribiendo el Acta de Entrega e Inventario debidamente conciliada.",
        "",
        "CLAUSULA DECIMA - MERITO EJECUTIVO: El presente contrato presta merito ejecutivo para el cobro de canones, cuotas de administracion, servicios publicos insolutos y la clausula penal pecuniaria conforme al Codigo General del Proceso.",
        "",
        "CLAUSULA DECIMAPRIMERA - FIRMA ELECTRONICA Y VALIDEZ PROBATORIA: De conformidad con la Ley 527 de 1999 y el Decreto 2364 de 2012, este contrato puede ser suscrito mediante mecanismos de firma electronica certificada con plena validez juridica.",
        extras,
        "",
        "ADVERTENCIA DE MINUTA Y ASESORIA VECY:",
        "Este documento es un borrador estructural de contrato. Para la expedicion de polizas o fianzas colectivas de arrendamiento, analisis financiero de solvencia y blindaje contractual con todas las de la ley, contacte a VECY BIENES RAICES (Eduardo A. Rivera & Jani Alves | +57 316 656 9719 / +57 319 291 9978 | https://vecy-bienes-raices.vercel.app/)."
      ].filter(Boolean).join("\n");

    case "contrato_arrendamiento_comercial":
      return [
        `LUGAR Y FECHA DE SUSCRIPCION: ${ciudad}, ${new Date().toLocaleDateString("es-CO")}`,
        `ARRENDADOR(A): ${remitente} — Identificacion: ${docRem}`,
        `ARRENDATARIO(A): ${destinatario} — Identificacion: ${docDest}`,
        `INMUEBLE / LOCAL COMERCIAL: ${direccion} (${ciudad})`,
        `CANON MENSUAL DE ARRENDAMIENTO: ${valor}`,
        "",
        "CLAUSULADO DE CONTRATO DE ARRENDAMIENTO DE LOCAL COMERCIAL (CODIGO DE COMERCIO):",
        "",
        "CLAUSULA PRIMERA - OBJETO Y DESTINACION COMERCIAL: El ARRENDADOR entrega en arrendamiento el inmueble comercial, y el ARRENDATARIO lo destina exclusivamente para la explotacion de su actividad mercantil autorizada, cumpliendo todas las normas de uso de suelo, sanidad y policia.",
        "",
        `CLAUSULA SEGUNDA - CANON, IVA E INCREMENTOS: El canon mensual pactado es de ${valor} (mas IVA de conformidad con el Estatuto Tributario, si aplica). Las partes acuerdan un incremento anual pactado contractualmente al vencimiento de cada periodo de doce (12) meses.`,
        "",
        "CLAUSULA TERCERA - RENOVACION Y DESAHUCIO COMERCIAL (ARTS. 518 A 520 C.CO.): Cumplidos dos (2) anos consecutivos de ocupacion con el mismo establecimiento mercantil, el ARRENDATARIO tendra derecho a la renovacion del contrato salvo las causales taxativas de ley con desahucio previo no menor a seis (6) meses.",
        "",
        "CLAUSULA CUARTA - CESION Y SUBARRIENDO COMERCIAL (ART. 523 C.CO.): El ARRENDATARIO no podra subarrendar totalmente el local ni ceder el contrato sin autorizacion expresa del ARRENDADOR, salvo enajenacion del respectivo establecimiento de comercio en bloque.",
        "",
        "CLAUSULA QUINTA - CLAUSULA PENAL Y MERITO EJECUTIVO: El incumplimiento de las obligaciones contractuales facultara el cobro ejecutivo de la clausula penal pecuniaria pactada y la restitucion inmediata del inmueble.",
        extras,
        "",
        "ADVERTENCIA DE ASESORIA VECY:",
        "Minuta base comercial. Para asesoramiento de local, POT y estudio comercial, contacte a Eduardo Rivera y Jani Alves (+57 316 656 9719)."
      ].filter(Boolean).join("\n");

    case "contrato_corretaje":
      return [
        `LUGAR Y FECHA: ${ciudad}, ${new Date().toLocaleDateString("es-CO")}`,
        `EL COMITENTE (PROPIETARIO / CLIENTE): ${remitente} — Identificacion: ${docRem}`,
        `EL CORREDOR INMOBILIARIO (VECY NETWORK): ${destinatario} — Identificacion: ${docDest}`,
        `INMUEBLE CONSIGNADO: ${direccion} (${ciudad}) | VALOR COMERCIAL: ${valor}`,
        "",
        "CLAUSULADO DE CONTRATO DE CORRETAJE INMOBILIARIO (ARTS. 1340 A 1346 C.CO.):",
        "",
        "CLAUSULA PRIMERA - ENCARGO DE MEDIACION Y PROMOCION: EL COMITENTE confiere encargo mercantil al CORREDOR para la promocion, consecucion de interesados y mediacion en la venta o arrendamiento del bien inmueble consignado.",
        "",
        `CLAUSULA SEGUNDA - HONORARIOS Y COMISION PROFESIONAL: Al perfeccionarse la negociacion o suscribirse la promesa de compraventa / contrato de arrendamiento, EL COMITENTE cancelara a favor del CORREDOR los honorarios equivalentes al porcentaje comercial legal (3% urbano / 5% rural o campestre sobre el valor final de la transaccion).`,
        "",
        "CLAUSULA TERCERA - DOCTRINA COLABORATIVA VECY 40/20/40: Las partes reconocen la participacion de la red colaborativa VECY Network para la difusion del inmueble entre corredores certificados, garantizando transparencia y reparto ordenado de puntas.",
        "",
        "CLAUSULA CUARTA - RESERVA DE CLIENTES PRESENTADOS: Toda transaccion efectuada con clientes presentados por EL CORREDOR dentro de los doce (12) meses posteriores a la terminacion de este encargo causara el pago pleno de los honorarios pactados.",
        extras,
        "",
        "MESA CENTRAL VECY BIENES RAICES: +57 316 656 9719 | https://vecy-bienes-raices.vercel.app/"
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
    page.drawText(`Radicado Documental: ${verificationCode} | Validez Notarial y Registral`, {
      x: textStartX,
      y: pageHeight - 59,
      size: 7.8,
      font: fontRegular,
      color: rgb(0.72, 0.74, 0.78)
    });

    if (isFirstPage) {
      // Bloque de título del documento en tamaño 13pt bold con color distinguido
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
      page.drawText(`Marco Normativo: ${sanitizePdfWinAnsiText(meta.normativeFramework)}`, {
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

  // Foliado oficial en pie de página (Página X de Y) con línea sutil en TODAS las páginas
  const allPages = pdfDoc.getPages();
  const totalPages = allPages.length;
  allPages.forEach((p, idx) => {
    p.drawLine({
      start: { x: marginX, y: 28 },
      end: { x: pageWidth - marginX, y: 28 },
      thickness: 0.5,
      color: rgb(0.82, 0.84, 0.88)
    });
    p.drawText(`Pagina ${idx + 1} de ${totalPages} - Minuta Legal Inmobiliaria VECY BIENES RAICES - Radicado: ${verificationCode}`, {
      x: marginX,
      y: 16,
      size: 7.4,
      font: fontRegular,
      color: rgb(0.45, 0.47, 0.52)
    });
  });

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

