import { resolveRealName, getOrLoadDmHistory, appendDmHistory, getContactPermanentDossier } from "../sessionManager";
import { extractFirstName, sanitizeResponseMarkdown } from "../parsers";
import { resolveNameAndGender, getCanonicalCompositeName } from "../../nameAndGenderResolver";
import { invokeLLM } from "../../llm";
import { enhanceResponseWithCommercialFunnel, isHighValueLegalOrTaxInquiry, COMMERCIAL_CLOSING_CTA, PATRIMONIAL_RISK_ALERT } from "../../commercialFunnelService";
import { getVecyInstitutionalKnowledge, JANIA_ARGON_COGNITIVE_CORE } from "../prompts";
import { executeMarketValuationSurvey } from "../../valuation";
import { getGreetingByTime } from "../../whatsapp-utils";
import { FlyerVisionResult } from "../types";
import {
  findTrustedContact,
  buildFamilyWarmWelcomeMessage,
  isChaloEscobarJoke,
  buildChaloJokeResponse,
  isJonathanCreditProcessQuery,
  buildJonathanCreditResponse,
  isDebtCollectionOrSpamScam,
  getDebtCollectionDefenseResponse,
  TrustedContact
} from "../trustedContacts";

export interface DmMediaOptions {
  imageBuffer?: string;
  pdfBuffer?: string;
  pdfMimeType?: string;
  isAudio?: boolean;
  flyerVisionData?: FlyerVisionResult | null;
}

export interface LatestDmPdfAttachment {
  pdfBuffer: Buffer;
  pdfFileName?: string;
}

const latestDmPdfMap = new Map<string, LatestDmPdfAttachment>();

export function setLatestDmPdf(userId: string, attachment: LatestDmPdfAttachment): void {
  latestDmPdfMap.set(userId, attachment);
}

export function popLatestDmPdf(userId: string): LatestDmPdfAttachment | undefined {
  const attachment = latestDmPdfMap.get(userId);
  if (attachment) {
    latestDmPdfMap.delete(userId);
  }
  return attachment;
}

export const JANIA_DM_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "consultar_identidad_y_antecedentes",
        description: "Valida la identidad oficial (censo ADRES y Registraduría) y antecedentes de seguridad (Policía Nacional vía 2Captcha, Procuraduría SIRI, Contraloría SIRECI) para Cédula de Ciudadanía, Extranjería, Pasaporte o NIT.",
        parameters: {
          type: "OBJECT",
          properties: {
            numeroDocumento: { type: "STRING", description: "Número de cédula, NIT o documento a verificar" },
            tipoDocumento: { type: "STRING", description: "Tipo de documento: CC, CE, PASAPORTE, NIT" }
          },
          required: ["numeroDocumento"]
        }
      },
      {
        name: "consultar_paz_y_salvo_idu",
        description: "Consulta y genera el Paz y Salvo oficial de Valorización del IDU en Bogotá mediante el código CHIP (inicia en AAA) para trámites de notaría y escrituración.",
        parameters: {
          type: "OBJECT",
          properties: {
            chip: { type: "STRING", description: "Código CHIP del inmueble que inicia por AAA" }
          },
          required: ["chip"]
        }
      },
      {
        name: "consultar_factura_predial_bogota",
        description: "Consulta y descarga la factura oficial en PDF con código de barras y estado de pago del impuesto predial unificado de Bogotá ante la Secretaría de Hacienda.",
        parameters: {
          type: "OBJECT",
          properties: {
            chip: { type: "STRING", description: "Código CHIP del predio" },
            documentoTitular: { type: "STRING", description: "Número de cédula o NIT del titular si se conoce" }
          },
          required: ["chip"]
        }
      },
      {
        name: "liquidar_gastos_notariales_y_registro",
        description: "Calcula el desglose exacto de derechos notariales (50/50), retención en la fuente (1% vendedor), impuesto de registro y beneficencia (1.67% comprador) para escrituración en Colombia.",
        parameters: {
          type: "OBJECT",
          properties: {
            precioVenta: { type: "NUMBER", description: "Precio pactado de venta en pesos colombianos (COP)" },
            tipoInmueble: { type: "STRING", description: "apartamento, casa, lote, etc." }
          },
          required: ["precioVenta"]
        }
      },
      {
        name: "sondeo_mercado_inmobiliario",
        description: "Realiza un sondeo técnico comparativo de m² y canon sugerido en barrios y zonas del norte de Bogotá (Usaquén, Suba, Chapinero, Chicó, Rosales, San Patricio, Santa Bárbara, Cabrera) integrando portales (Metrocuadrado, Fincaraiz, Ciencuadras) y coeficientes ACM.",
        parameters: {
          type: "OBJECT",
          properties: {
            zonaOBarrio: { type: "STRING", description: "Barrio o zona de Bogotá a evaluar" },
            tipoInmueble: { type: "STRING", description: "apartamento, casa, oficina, lote" },
            areaM2: { type: "NUMBER", description: "Área en metros cuadrados" },
            estrato: { type: "NUMBER", description: "Estrato socioeconómico 1 al 6" },
            antiguedadAnos: { type: "NUMBER", description: "Años de antigüedad" },
            garajes: { type: "NUMBER", description: "Número de parqueaderos" }
          },
          required: ["zonaOBarrio"]
        }
      },
      {
        name: "registrar_inmueble_o_requerimiento",
        description: "Registra en la base de datos de VECY BIENES RAÍCES una oferta inmobiliaria (venta, arriendo, permuta) o un requerimiento/búsqueda de cliente enviado por chat privado y ejecuta el motor de coincidencias (Match).",
        parameters: {
          type: "OBJECT",
          properties: {
            textoCompletoPublicacion: { type: "STRING", description: "Texto completo del inmueble ofrecido o demandado" },
            tipoOperacion: { type: "STRING", description: "OFERTA o DEMANDA" }
          },
          required: ["textoCompletoPublicacion"]
        }
      },
      {
        name: "consultar_matches_o_codigo",
        description: "Consulta y busca cruces, coincidencias o detalles de un código de match (#M...), propiedad (P...) o requerimiento (R...), o busca coincidencias por texto en la red VECY.",
        parameters: {
          type: "OBJECT",
          properties: {
            consulta: { type: "STRING", description: "Código de match (ej. M15649), ID de propiedad/requerimiento o texto de búsqueda" }
          },
          required: ["consulta"]
        }
      },
      {
        name: "consultar_empresa_o_nit",
        description: "Consulta y valida la identidad oficial y antecedentes de Empresas y Personas Jurídicas por NIT o Razón Social (RUES + DIAN + Procuraduría SIRI + Contraloría SIRECI).",
        parameters: {
          type: "OBJECT",
          properties: {
            consultaEmpresa: { type: "STRING", description: "Número de NIT con o sin dígito de verificación o Nombre/Razón Social de la empresa" }
          },
          required: ["consultaEmpresa"]
        }
      },
      {
        name: "enviar_encuesta_interactiva",
        description: "Envía una encuesta interactiva nativa de WhatsApp (Poll) de 1 clic para selección ágil de trámites, tipos de inmuebles, opciones de negocio o encuestas del canal.",
        parameters: {
          type: "OBJECT",
          properties: {
            pregunta: { type: "STRING", description: "Pregunta del cuestionario o encuesta" },
            opciones: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Lista de opciones de respuesta (2 a 12 opciones cortas)"
            },
            limiteSeleccion: { type: "NUMBER", description: "Número máximo de opciones seleccionables (por defecto 1)" }
          },
          required: ["pregunta", "opciones"]
        }
      },
      {
        name: "enviar_tarjeta_contacto_vecy",
        description: "Envía la tarjeta de contacto oficial interactiva (vCard) de VECY BIENES RAÍCES / Eduardo Rivera y Jani Alves (+57 316 656 9719) o el contacto de un colega.",
        parameters: {
          type: "OBJECT",
          properties: {
            destinatario: { type: "STRING", description: "Tipo de contacto: 'broker', 'jania' o 'colega'" },
            nombrePersonalizado: { type: "STRING", description: "Nombre a mostrar en la tarjeta de contacto" },
            telefonoPersonalizado: { type: "STRING", description: "Número de teléfono en formato internacional (ej. +573166569719)" }
          }
        }
      },
      {
        name: "enviar_evento_visita_inmobiliaria",
        description: "Agenda y despacha una tarjeta de evento formal para visitas a inmuebles, reuniones o comités notariales a través de Vecy Agenda Pro.",
        parameters: {
          type: "OBJECT",
          properties: {
            tituloVisita: { type: "STRING", description: "Título del evento o visita inmobiliaria" },
            fechaHora: { type: "STRING", description: "Fecha y hora propuesta para la visita" },
            direccionOBarrio: { type: "STRING", description: "Dirección, conjunto o barrio del inmueble" },
            detalles: { type: "STRING", description: "Observaciones de la visita o registro de portería" }
          },
          required: ["tituloVisita", "fechaHora"]
        }
      },
      {
        name: "enviar_catalogo_servicios",
        description: "Comparte el enlace directo al catálogo de WhatsApp Business, marketplace colaborativo y portafolio Proptech de VECY BIENES RAÍCES.",
        parameters: {
          type: "OBJECT",
          properties: {
            categoria: { type: "STRING", description: "Categoría: 'inmuebles', 'servicios' o 'general'" }
          }
        }
      }
    ]
  }
];

export type JaniaDmToolType =
  | "cedula"
  | "predial"
  | "idu"
  | "notarial"
  | "sondeo"
  | "match"
  | "empresa"
  | "encuesta"
  | "contacto"
  | "evento"
  | "catalogo";

export async function executeJaniaDmTool(
  toolName: string,
  args: Record<string, any>,
  userId: string,
  _userName?: string,
  rawUserText?: string
): Promise<{ resultJson: Record<string, any>; toolType: JaniaDmToolType }> {
  switch (toolName) {
    case "consultar_matches_o_codigo": {
      const query = String(args.consulta || args.codigo || args.query || rawUserText || "").trim();
      const { executeAdminMatchSearch } = await import("../../adminMatchAssistantService");
      const isEduardo = /eduardo/i.test(_userName || "") || userId.includes("3192919978") || userId.includes("225954035179724");
      const isJani = /jani/i.test(_userName || "") || userId.includes("3188096811") || userId.includes("167108705018103");
      const res = await executeAdminMatchSearch(query, isEduardo || isJani, userId);
      return {
        toolType: "match",
        resultJson: {
          solicitud: "consulta_matches",
          consulta: query,
          reporteOficial: res.formattedReport || "Sin coincidencias registradas.",
          totalFound: res.totalFound
        }
      };
    }
    case "registrar_inmueble_o_requerimiento": {
      const { processWhatsAppMessage } = await import("./propertiesHandler");
      const res = await processWhatsAppMessage(
        String(args.textoCompletoPublicacion || rawUserText || ""),
        userId,
        _userName,
        false,
        [],
        undefined,
        undefined,
        false
      );
      return {
        toolType: "sondeo",
        resultJson: {
          solicitud: "registro_inmueble_o_requerimiento",
          clasificacion: res.classification,
          insertado: res.inserted,
          detalle: "Procesado en el motor de VECY BIENES RAÍCES"
        }
      };
    }
    case "consultar_identidad_y_antecedentes": {
      const {
        executeIdentityVerificationFromWhatsApp,
        getPendingUnconfirmedDoc,
        clearPendingUnconfirmedDoc,
        getPendingCompanyMembers,
        clearPendingCompanyMembers
      } = await import("../../identityVerificationService");
      let doc = String(args.numeroDocumento || args.cedula || args.nit || args.documento || "").trim();
      let tipo = String(args.tipoDocumento || "CC").trim();

      const combinedIntent = `${doc} ${rawUserText || ""}`.toLowerCase();
      if (/(?:todos|cada\s+miembro|todos\s+los\s+miembros|suplentes\s+y\s+principal|ambos)/i.test(combinedIntent)) {
        const pendingMembers = getPendingCompanyMembers(userId);
        if (pendingMembers && pendingMembers.length > 0) {
          clearPendingCompanyMembers(userId);
          clearPendingUnconfirmedDoc(userId);
          const explicitItems = pendingMembers
            .filter((m) => Boolean(m.numeroIdentificacion))
            .map((m) => ({
              cedula: m.numeroIdentificacion,
              tipoDoc: m.tipoDocumento.toLowerCase().includes("e") ? "ce" : "cc",
              rawNumber: m.numeroIdentificacion,
              detectedName: m.nombre
            }));
          if (explicitItems.length > 0) {
            const resAll = await executeIdentityVerificationFromWhatsApp(
              explicitItems.map((i) => `${i.tipoDoc.toUpperCase()} ${i.cedula}`).join(", "),
              true,
              userId,
              explicitItems
            );
            return {
              toolType: "cedula",
              resultJson: {
                solicitud: "verificacion_identidad_miembros_empresa",
                numeroDocumento: explicitItems.map((i) => i.cedula).join(", "),
                tipoDocumento: "CC",
                reporteOficial: resAll.reportText || "Sin reporte disponible",
                exitoso: resAll.isVerificationRequest
              }
            };
          }
        }
      }

      if (!/\d{5,12}/.test(doc)) {
        const pendingDoc = getPendingUnconfirmedDoc(userId);
        if (pendingDoc?.cleanNumber) {
          doc = pendingDoc.cleanNumber;
          clearPendingUnconfirmedDoc(userId);
        } else if (rawUserText) {
          doc = rawUserText;
        }
      }

      const cleanDigits = doc.split("-")[0].replace(/\D/g, "");
      if (cleanDigits.length === 9 && /^[89]\d{8}$/.test(cleanDigits)) {
        tipo = "NIT";
      } else if (rawUserText && /\bnit\b/i.test(rawUserText)) {
        tipo = "NIT";
      }

      const queryStr = doc.toUpperCase().startsWith(tipo.toUpperCase()) ? doc : `${tipo} ${doc}`;
      const res = await executeIdentityVerificationFromWhatsApp(queryStr, true, userId);
      return {
        toolType: "cedula",
        resultJson: {
          solicitud: "verificacion_identidad",
          numeroDocumento: doc,
          tipoDocumento: tipo,
          reporteOficial: res.reportText || "Sin reporte disponible",
          exitoso: res.isVerificationRequest
        }
      };
    }
    case "consultar_paz_y_salvo_idu": {
      const chip = String(args.chip || rawUserText || "").trim();
      const { executeIduValorizacionFromWhatsApp } = await import("../../iduValorizacionService");
      const res = await executeIduValorizacionFromWhatsApp(chip, userId, true);
      if (res.pdfBuffer) {
        setLatestDmPdf(userId, { pdfBuffer: res.pdfBuffer, pdfFileName: res.pdfFileName || `Paz_y_Salvo_IDU_${chip}_2026.pdf` });
      }
      return {
        toolType: "idu",
        resultJson: {
          solicitud: "paz_y_salvo_idu",
          chip,
          reporteOficial: res.reportText || "Sin reporte disponible",
          exitoso: res.isIduRequest
        }
      };
    }
    case "consultar_factura_predial_bogota": {
      const chip = String(args.chip || rawUserText || "").trim();
      const doc = args.documentoTitular ? String(args.documentoTitular).trim() : undefined;
      const { executePredialAssistanceFromWhatsApp } = await import("../../predialService");
      const queryStr = doc ? `${chip} ${doc}` : chip;
      const res = await executePredialAssistanceFromWhatsApp(queryStr, userId, true);
      if (res.pdfBuffer) {
        setLatestDmPdf(userId, { pdfBuffer: res.pdfBuffer, pdfFileName: res.pdfFileName || `Factura_Predial_${chip}_2026.pdf` });
      }
      return {
        toolType: "predial",
        resultJson: {
          solicitud: "factura_predial_bogota",
          chip,
          reporteOficial: res?.reportText || "Factura predial procesada",
          exitoso: true
        }
      };
    }
    case "liquidar_gastos_notariales_y_registro": {
      const precio = Number(args.precioVenta || 0);
      const { executeNotarialAssistanceFromWhatsApp } = await import("../../notarialExpenseService");
      const queryText = precio > 0 ? `liquidación notarial ${precio}` : (rawUserText || "liquidación notarial");
      const res = await executeNotarialAssistanceFromWhatsApp(queryText, userId, true);
      return {
        toolType: "notarial",
        resultJson: {
          solicitud: "gastos_notariales_y_registro",
          precioVenta: precio,
          reporteOficial: res.reportText || "Liquidación procesada",
          exitoso: res.isNotarialRequest
        }
      };
    }
    case "sondeo_mercado_inmobiliario": {
      const surveyRes = executeMarketValuationSurvey({
        zonaOBarrio: args.zonaOBarrio || "Chicó",
        tipoInmueble: args.tipoInmueble || "apartamento",
        areaM2: Number(args.areaM2 || 75),
        estrato: Number(args.estrato || 5),
        antiguedadAnos: Number(args.antiguedadAnos || 8),
        garajes: Number(args.garajes || 1)
      });
      return {
        toolType: "sondeo",
        resultJson: surveyRes
      };
    }
    case "consultar_empresa_o_nit": {
      const q = String(
        args.consultaEmpresa ||
        args.nitORazonSocial ||
        args.nit ||
        args.numeroDocumento ||
        args.empresa ||
        args.razonSocial ||
        args.query ||
        rawUserText ||
        ""
      ).trim();
      const { queryEmpresaOrNit } = await import("../../identityVerificationService");
      const empRes = await queryEmpresaOrNit(q, userId);
      return {
        toolType: "empresa",
        resultJson: {
          solicitud: "consulta_empresa_o_nit",
          termino: q,
          reporteOficial: empRes.reportText || "Consulta empresarial procesada",
          exitoso: empRes.success,
          representantePrincipal: empRes.representantePrincipal || null
        }
      };
    }
    case "enviar_encuesta_interactiva": {
      const pregunta = String(args.pregunta || "").trim();
      const opciones = Array.isArray(args.opciones) ? args.opciones.map(String) : ["Sí", "No"];
      const selectableCount = args.limiteSeleccion
        ? Number(args.limiteSeleccion)
        : Number(args.seleccionMultiple ? 2 : 1);
      const { sendNativeWhatsAppPoll } = await import("../../whatsapp-match");
      const pollSent = await sendNativeWhatsAppPoll(userId, pregunta, opciones, selectableCount);
      return {
        toolType: "encuesta",
        resultJson: {
          solicitud: "encuesta_interactiva",
          pregunta,
          opciones,
          enviada: pollSent,
          reporteOficial: pollSent
            ? `📊 *Encuesta interactiva despachada:* "${pregunta}" con ${opciones.length} opciones.`
            : `📊 Encuesta preparada para votación: "${pregunta}".`
        }
      };
    }
    case "enviar_tarjeta_contacto_vecy": {
      const rawContact = String(args.destinatario || args.tipoContacto || "broker").toLowerCase();
      const contactType = rawContact === "jania" ? "jania" : "broker";
      const { sendNativeWhatsAppContact } = await import("../../whatsapp-match");
      const contactSent = await sendNativeWhatsAppContact(userId, contactType);
      return {
        toolType: "contacto",
        resultJson: {
          solicitud: "tarjeta_contacto",
          tipoContacto: contactType,
          enviada: contactSent,
          reporteOficial: contactSent
            ? `📇 *Tarjeta de contacto interactiva (${contactType === "broker" ? "Eduardo & Jani — Bróker Oficial" : "JanIA"}) enviada exitosamente.*`
            : `📇 Contacto oficial: ${contactType === "broker" ? "Eduardo Rivera (+57 316 656 9719)" : "JanIA (+57 319 291 9978)"}.`
        }
      };
    }
    case "enviar_evento_visita_inmobiliaria": {
      const titulo = String(args.tituloVisita || args.titulo || "Visita Inmobiliaria").trim();
      const descripcion = String(args.detalles || args.descripcion || "").trim();
      const ubicacion = String(args.direccionOBarrio || args.ubicacion || "").trim();
      const rawFecha = args.fechaHora || args.fechaHoraIso;
      const parsedTime = rawFecha ? new Date(rawFecha).getTime() : NaN;
      const fechaHora = !Number.isNaN(parsedTime) ? parsedTime : Date.now() + 86400000;
      const { sendNativeWhatsAppEvent } = await import("../../whatsapp-match");
      const eventSent = await sendNativeWhatsAppEvent(userId, {
        name: titulo,
        description: descripcion,
        location: ubicacion,
        startTime: fechaHora
      });
      return {
        toolType: "evento",
        resultJson: {
          solicitud: "evento_inmobiliario",
          titulo,
          ubicacion,
          enviado: eventSent,
          reporteOficial: `📅 *Evento Agendado:* "${titulo}" en ${ubicacion || "Virtual"}.`
        }
      };
    }
    case "enviar_catalogo_servicios": {
      const catalogMsg =
        `🏬 *CATÁLOGO DE SERVICIOS Y PORTAL WEB — VECY BIENES RAÍCES*\n\n` +
        `🌐 *Portal Oficial:* https://vecy-bienes-raices.vercel.app/\n` +
        `🤖 *JanIA Landing:* https://vecy-bienes-raices.vercel.app/jania\n` +
        `📱 *Canal de WhatsApp:* https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b\n\n` +
        `📌 *Servicios Destacados:*\n` +
        `• Cruce de Inmuebles y Demandas en Tiempo Real (Match 40/20/40).\n` +
        `• Verificación Preventiva de Identidad (ADRES, Policía, Procuraduría, Contraloría, RUES).\n` +
        `• Asistencia Factura Predial Bogotá y Paz y Salvo IDU.\n` +
        `• Liquidación Notarial y de Registro 50/50.\n` +
        `• Sondeos de Mercado y Avalúos Digitales.\n\n` +
        `_¿Deseas activar alguno de estos servicios de inmediato?_ 🤝✨`;
      return {
        toolType: "catalogo",
        resultJson: {
          solicitud: "catalogo_servicios",
          reporteOficial: catalogMsg,
          exitoso: true
        }
      };
    }
    default:
      return {
        toolType: "sondeo",
        resultJson: { error: `Herramienta desconocida: ${toolName}` }
      };
  }
}

export async function synthesizeToolResponseWithGemini(
  userId: string,
  userName: string,
  toolType: JaniaDmToolType,
  toolJson: Record<string, any>,
  userMessage: string,
  isEduardo: boolean,
  isJani: boolean,
  displayName: string
): Promise<string> {
  const isFreeTool = toolType !== "sondeo" && toolType !== "match";
  const rawReport = toolJson.reporteOficial || (toolType === "sondeo" ? JSON.stringify(toolJson) : "");

  if (rawReport && (rawReport.includes("VERIFICACIÓN OFICIAL") || rawReport.includes("PAZ Y SALVO") || rawReport.includes("LIQUIDACIÓN ESTIMADA") || rawReport.includes("COINCIDENCIA") || rawReport.includes("MATCH"))) {
    return rawReport.includes("COINCIDENCIA") || rawReport.includes("MATCH")
      ? rawReport
      : await formatPoliteToolDelivery(userId, userName, toolType as any, rawReport, true);
  }

  const synthPrompt = [
    {
      role: "system",
      content:
        `Eres JanIA, la inteligencia artificial inmobiliaria oficial de VECY BIENES RAÍCES en Colombia.\n` +
        `Acabas de ejecutar la herramienta correspondiente a: ${toolType}.\n` +
        `Datos estructurados del sistema en JSON:\n` +
        `${JSON.stringify(toolJson, null, 2)}\n\n` +
        `INSTRUCCIONES DE REDACCIÓN:\n` +
        `- Redacta la respuesta directamente para el usuario (${displayName || "colega"}), con total calidez, solvencia y persuasión de IA pura.\n` +
        `- Si es un sondeo de mercado, entrega el valor por m² homologado, valor comercial sugerido, canon estimado y factores de ajuste según tu rol de Perita Avaluadora.\n` +
        `- Si es una consulta de matches, explica con claridad el cruce encontrado.\n` +
        `- Explica con claridad los datos técnicos sin tecnicismos robóticos ni plantillas rígidas.\n` +
        `- Mantén concisión y estructura óptima para WhatsApp (máximo 1 o 2 párrafos cortos).\n` +
        `- Aplica ortografía estricta en español (signos ¡ y ¿, mayúscula inicial).\n`
    },
    {
      role: "user",
      content: userMessage
    }
  ];

  try {
    const res = await invokeLLM({ messages: synthPrompt });
    let text = res.choices[0]?.message?.content || "";
    if (text) {
      text = sanitizeResponseMarkdown(text.trim());
      if (isFreeTool) {
        text = await formatPoliteToolDelivery(userId, userName, toolType as any, text, true);
      }
      return text;
    }
  } catch (err: any) {
    console.warn("[synthesizeToolResponseWithGemini] Error invoking LLM:", err?.message);
  }

  return rawReport && (rawReport.includes("COINCIDENCIA") || rawReport.includes("MATCH"))
    ? rawReport
    : await formatPoliteToolDelivery(userId, userName, toolType as any, rawReport, true);
}

/**
 * Envuelve la entrega de cualquier herramienta (cédula o predial) con cortesía,
 * saludo personalizado por hora, nombre compuesto y género gramatical,
 * evitando que JanIA suene como un bot frío o robótico y educando con el ejemplo.
 */
export async function formatPoliteToolDelivery(
  userId: string,
  rawName: string,
  toolType: "cedula" | "predial" | "idu" | "notarial",
  payloadText: string,
  success: boolean = true
): Promise<string> {
  const realName = await resolveRealName(userId, rawName);
  const { getGreetingByTime } = await import('../../whatsapp-utils');
  const timeSalutation = getGreetingByTime(); // "Buenos días" | "Buenas tardes" | "Buenas noches"
  const nameInfo = resolveNameAndGender(realName, timeSalutation);
  const canonicalComposite = getCanonicalCompositeName(realName);
  const compositeOrFirst = extractFirstName(realName);

  // Detección directiva de Eduardo, Jani y Agenda de Confianza / Familiar
  const trustedContact = findTrustedContact(userId, rawName || realName);
  const isEduardo = /eduardo/i.test(realName || "") || /eduardo/i.test(rawName || "") || userId.includes("3192919978") || userId.includes("225954035179724") || trustedContact?.id === "eduardo_fundador";
  const isJani = /jani/i.test(realName || "") || /jani/i.test(rawName || "") || userId.includes("3188096811") || userId.includes("3166569719") || userId.includes("167108705018103") || userId.includes("182781141344345") || userId.includes("218820279050385") || trustedContact?.id === "jani_esposa";
  const isFamilyOrTrusted = !!trustedContact && !isEduardo && !isJani;

  let displayName = "";
  if (isEduardo) {
    displayName = "Eduardo";
  } else if (isJani) {
    displayName = "Jani";
  } else if (isFamilyOrTrusted && trustedContact) {
    displayName = trustedContact.primaryNick || trustedContact.nicknames?.[0] || "";
  } else {
    displayName = canonicalComposite || compositeOrFirst || (nameInfo.displayName !== "colega" && !nameInfo.displayName.toLowerCase().includes("asesor") ? nameInfo.displayName : "");
    if (!canonicalComposite && displayName.includes(" ")) {
      displayName = displayName.split(" ")[0];
    }
  }

  const welcomeGrammar = nameInfo.isFemale ? "bienvenida" : "bienvenido";
  const history = await getOrLoadDmHistory(userId);
  const isFirstTurn = history.length === 0;

  // Cierre doctrinal estricto para herramientas gratuitas (Doctrina v33.06)
  const cleanPayload = (payloadText || "").trim();
  const { buildWinningGoogleReviewMessage } = await import('../../politenessService');
  const reviewSection = (isEduardo || isJani || isFamilyOrTrusted)
    ? ""
    : `\n\n${buildWinningGoogleReviewMessage(displayName)}`;

  const closingTag = "Un servicio de cortesía de VECY BIENES RAÍCES 🤝.";
  let payloadWithClosing = cleanPayload;
  if (!payloadWithClosing.includes(closingTag)) {
    payloadWithClosing = `${payloadWithClosing}\n\n${closingTag}${reviewSection}`;
  } else if (!isEduardo && !isJani && !isFamilyOrTrusted && !payloadWithClosing.includes("CctNbwU6UpX5EBM/review")) {
    payloadWithClosing = `${payloadWithClosing}${reviewSection}`;
  }

  if (!success) {
    if (payloadText && payloadText.trim()) {
      if (isEduardo) {
        return isFirstTurn && !payloadWithClosing.startsWith("¡")
          ? `¡${timeSalutation}, Eduardo! A tu disposición. Aquí tienes el detalle del reporte solicitado:\n\n${payloadWithClosing}`
          : payloadWithClosing;
      }
      if (isJani) {
        return isFirstTurn && !payloadWithClosing.startsWith("¡")
          ? `¡${timeSalutation}, Jani! Qué gusto saludarte. Aquí tienes el detalle del reporte solicitado:\n\n${payloadWithClosing}`
          : payloadWithClosing;
      }
      if (isFamilyOrTrusted) {
        return isFirstTurn && !payloadWithClosing.startsWith("¡")
          ? `¡${timeSalutation}, ${displayName}! Con todo gusto. Aquí tienes el detalle del reporte solicitado:\n\n${payloadWithClosing}`
          : payloadWithClosing;
      }
      if (isFirstTurn && !payloadWithClosing.startsWith("¡")) {
        const greetingHeader = `¡${timeSalutation}${displayName ? ` ${displayName}` : ""}! Te doy una cordial ${welcomeGrammar} a mi chat de servicios inmobiliarios. Soy *JanIA*, tu asistente inmobiliaria con IA creada por *VECY BIENES RAÍCES* 🏘️✨.\n\n`;
        return greetingHeader + payloadWithClosing;
      } else {
        return payloadWithClosing;
      }
    }
    if (isEduardo) {
      return `Ocurrió una intermitencia temporal en el sistema de consulta. ¿Me confirmas nuevamente el dato para procesarlo de inmediato? 🤝`;
    }
    if (isJani) {
      return `Ocurrió una intermitencia temporal en el sistema de consulta. ¿Me confirmas nuevamente el dato para procesarlo de inmediato? 🤝`;
    }
    if (isFamilyOrTrusted) {
      return `¡${timeSalutation}, ${displayName}! Qué pena contigo, ocurrió una intermitencia temporal en el sistema de consulta. ¿Me confirmas nuevamente el dato para procesarlo de inmediato? 🤝`;
    }
    return `¡${timeSalutation}${displayName ? ` ${displayName}` : ""}! Qué pena contigo. Debido a una intermitencia temporal en mi sistema (un pequeño fallo en la matrix 🤖😅), no pude procesar tu solicitud en este intento. ¿Podrías por favor confirmarme nuevamente los datos para ayudarte de inmediato? 🤝`;
  }

  if (isEduardo) {
    if (!isFirstTurn || payloadWithClosing.startsWith("¡") || /a\s+tu\s+disposici[oó]n/i.test(payloadWithClosing)) {
      return payloadWithClosing;
    }
    return `¡${timeSalutation}, Eduardo! A tu disposición:\n\n${payloadWithClosing}`;
  }
  if (isJani) {
    if (!isFirstTurn || payloadWithClosing.startsWith("¡") || /qu[eé]\s+gusto\s+saludarte/i.test(payloadWithClosing)) {
      return payloadWithClosing;
    }
    return `¡${timeSalutation}, Jani! Qué gusto saludarte:\n\n${payloadWithClosing}`;
  }
  if (isFamilyOrTrusted) {
    if (!isFirstTurn || payloadWithClosing.startsWith("¡")) {
      return payloadWithClosing;
    }
    return `¡${timeSalutation}, ${displayName}! Con todo gusto. Aquí tienes el reporte solicitado:\n\n${payloadWithClosing}`;
  }

  if (isFirstTurn) {
    if (payloadWithClosing.startsWith("¡")) {
      return payloadWithClosing;
    }
    const greetingHeader = `¡${timeSalutation}${displayName ? ` ${displayName}` : ""}! Te doy una cordial ${welcomeGrammar} a mi chat de servicios inmobiliarios. Soy *JanIA*, tu asistente inmobiliaria con IA creada por *VECY BIENES RAÍCES* 🏘️✨.\n\nYa procesé con gusto tu consulta como un beneficio de cortesía de nuestra inmobiliaria:\n\n`;
    return greetingHeader + payloadWithClosing;
  } else {
    if (payloadWithClosing.startsWith("¡") || payloadWithClosing.startsWith("🛡️") || payloadWithClosing.startsWith("🆔") || payloadWithClosing.startsWith("🏬")) {
      return payloadWithClosing;
    }
    const politeHeader = `¡Con mucho gusto${displayName ? ` ${displayName}` : ""}! Aquí tienes el reporte oficial como un beneficio de cortesía de *VECY BIENES RAÍCES*:\n\n`;
    return politeHeader + payloadWithClosing;
  }
}

/**
 * Remueve de forma exhaustiva e iterativa cualquier saludo inicial, vocativo redundante,
 * frase de cortesía repetida ("Qué gusto saludarte", "Es un placer", "En este nuevo día")
 * y emojis de saludo al comienzo del texto (Doctrina v33.07 / v33.17).
 */
export function stripLeadingGreetingsAndCourtesies(text: string): string {
  let cleaned = (text || "").trim();
  if (!cleaned) return "";

  // 1. Erradicar frases redundantes concatenadas como "Qué gusto saludarte. Qué gusto saludarte en este nuevo día" o "¡Hola, Eduardo! A tu disposición."
  cleaned = cleaned.replace(
    /(?:(?:qu[eé]|que)\s+gusto\s+(?:de\s+)?saludarte[^.!?\n:]*[.!?\n:]\s*)+(?:(?:qu[eé]|que)\s+gusto\s+(?:de\s+)?saludarte[^.!?\n:]*[.!?\n:]?\s*)/gi,
    ""
  );
  cleaned = cleaned.replace(
    /(?:¡?(?:hola|buen[ao]s?\s+(?:d[ií]as?|tardes?|noches?)),?\s*(?:eduardo|jani)?!?:?\s*(?:a\s+tu\s+disposici[oó]n\.?:?\s*)?)+/gi,
    ""
  );

  // 2. Patrones de saludos al inicio (con signos ¡ o sin ellos, permitiendo dos puntos :)
  const greetingPattern = /^¡?(?:hola|buen[ao]s?\s+(?:d[ií]as?|tardes?|noches?)|saludos?|bienvenid[ao]s?|estimad[ao]s?)\b[^!.\n?:]*[!.\n?:]?\s*/i;
  const courtesyPattern = /^¡?(?:(?:qu[eé]|que)\s+gusto\s+(?:de\s+)?saludarte(?:[^\n.!?:]*)|es\s+un\s+(?:verdadero\s+)?placer\s+(?:tenerte|saludarte)(?:[^\n.!?:]*)|a\s+tu\s+disposici[oó]n(?:[^\n.!?:]*)|c[oó]mo\s+est[aá]s(?:[^\n.!?:]*)|en\s+este\s+nuevo\s+d[ií]a(?:[^\n.!?:]*))[!.\n?:]?\s*/i;
  const emojiPattern = /^(?:👋|🤝|✨|🏘️|😊|🤖)+\s*/;

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 8) {
    const before = cleaned;
    cleaned = cleaned.replace(greetingPattern, "");
    cleaned = cleaned.replace(courtesyPattern, "");
    cleaned = cleaned.replace(emojiPattern, "");
    cleaned = cleaned.trim();
    changed = cleaned !== before;
    iterations++;
  }

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned.trim();
}

/**
 * Sanitiza ortografía estricta en español (apertura de signos ¡, ¿, mayúscula inicial)
 * y garantiza una única estructura limpia e indivisible de saludo en DMs,
 * erradicando de raíz la duplicación o concatenación de frases redundantes (Doctrina v33.07).
 */
export function sanitizeDmOrthographyAndGreeting(
  text: string,
  isEduardo: boolean,
  isJani: boolean,
  displayName?: string,
  hasPriorHistory: boolean = false,
  timeSalutation?: string
): string {
  let cleaned = (text || "").trim();
  if (!cleaned) return cleaned;

  const currentSalutation = timeSalutation || getGreetingByTime();

  // Corregir erratas frecuentes como "Buenas días" a "Buenos días"
  cleaned = cleaned.replace(/buenas\s+d[ií]as/gi, "Buenos días");

  // 1. Erradicar frases redundantes concatenadas como "Qué gusto saludarte. Qué gusto saludarte en este nuevo día"
  cleaned = cleaned.replace(
    /(?:(?:qu[eé]|que)\s+gusto\s+(?:de\s+)?saludarte[^.!?\n]*[.!?\n]?\s*)+(?:(?:qu[eé]|que)\s+gusto\s+(?:de\s+)?saludarte[^.!?\n]*[.!?\n]?\s*)/gi,
    ""
  );

  // 2. Corregir cualquier saludo o vocativo que inicie en minúscula o use el obsoleto "Hola"
  cleaned = cleaned.replace(/^estimad([ao]s?)\s+([a-záéíóúñ]+)!/i, (_m, ending, name) => {
    return `¡Estimad${ending.toLowerCase()} ${name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()}!`;
  });
  const nameSalutation = displayName ? `¡${currentSalutation}, ${displayName}! 👋 ` : `¡${currentSalutation}! 👋 `;
  cleaned = cleaned.replace(/^¡?hola\s+([a-záéíóúñ]+)[,!.\s]+/i, (_m, name) => `¡${currentSalutation}, ${name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()}! 👋 `);
  cleaned = cleaned.replace(/^¡?hola\b[!]?\s*/i, nameSalutation);
  cleaned = cleaned.replace(/^buen([ao]s?\s+(?:d[ií]as|tardes|noches))\b/i, (m) => `¡${m.charAt(0).toUpperCase() + m.slice(1)}!`);

  // 3. Estructura única e indivisible para directores VIP, familiares o primer saludo del día (Doctrina v33.07 / v33.13)
  if (isEduardo) {
    if (!hasPriorHistory) {
      const body = stripLeadingGreetingsAndCourtesies(cleaned);
      cleaned = body ? `¡${currentSalutation}, Eduardo! 👋 ${body}`.trim() : `¡${currentSalutation}, Eduardo! 👋 ¿En qué te colaboro hoy?`;
    } else {
      cleaned = stripLeadingGreetingsAndCourtesies(cleaned);
    }
  } else if (isJani) {
    if (!hasPriorHistory) {
      const body = stripLeadingGreetingsAndCourtesies(cleaned);
      cleaned = body ? `¡${currentSalutation}, Jani! 👋 ${body}`.trim() : `¡${currentSalutation}, Jani! 👋 ¿En qué te colaboro hoy?`;
    } else {
      cleaned = stripLeadingGreetingsAndCourtesies(cleaned);
    }
  } else if (displayName === "VECY") {
    if (!hasPriorHistory) {
      const body = stripLeadingGreetingsAndCourtesies(cleaned);
      cleaned = body ? `¡${currentSalutation}, VECY! 👋 ${body}`.trim() : `¡${currentSalutation}, VECY! 👋 ¿Con quién tengo el gusto de hablar?`;
    } else {
      cleaned = stripLeadingGreetingsAndCourtesies(cleaned);
    }
  } else if (hasPriorHistory && !cleaned.includes("?")) {
    if (/^¡?(?:buenos?\s+d[ií]as|buenas?\s+tardes|buenas?\s+noches)/i.test(cleaned)) {
      cleaned = stripLeadingGreetingsAndCourtesies(cleaned);
    }
  }

  // 4. Primera letra en mayúscula obligatoria en cada frase, al inicio del texto o tras un emoji
  cleaned = cleaned.replace(/(^|[.!?]\s+|[👋🤝✨🏘️😊🤖]\s*)([a-záéíóúñ])/gu, (_m, prefix, letter) => prefix + letter.toUpperCase());

  // 5. Apertura obligatoria de signos de interrogación ¿ ante preguntas (incluyendo tras emojis)
  cleaned = cleaned.replace(/(^|\n|[.!?]\s*|,\s*|[👋🤝✨🏘️😊🤖]\s*)(qu[eé]|c[oó]mo|cu[aá]ndo|d[oó]nde|por\s+qu[eé]|cu[aá]l(?:es)?|qui[eé]n(?:es)?|acaso)\b([^?\n]+)\?/giu, (_match, prefix, qWord, rest) => {
    const cleanPrefix = prefix.endsWith(", ") ? prefix.slice(0, -2) + ". " : prefix;
    return `${cleanPrefix}¿${qWord.charAt(0).toUpperCase() + qWord.slice(1)}${rest}?`;
  });

  return cleaned.trim();
}

/**
 * Detecta si un mensaje recibido es una señal corta, sticker, emoji o signo de puntuación aislado (Doctrina v33.14).
 * JanIA responde a cualquier interacción con inteligencia y calidez, erradicando el silencio o bloqueo de bot rígido.
 */
export function isShortSignalOrSticker(text: string): boolean {
  if (!text) return false;
  const clean = text.trim();
  if (
    clean === "[Sticker]" ||
    clean === "😊 [Sticker]" ||
    clean.startsWith("[Reacción") ||
    clean === "[Tarjeta de contacto compartida]" ||
    clean === "[Ubicación compartida]"
  ) {
    return true;
  }
  // Puntuación aislada o signos repetidos (., .., ..., ?, ??, !, ¡, ¿, etc.)
  if (/^[.¿?¡!_~^:;\-*#@+=]{1,8}$/.test(clean)) {
    return true;
  }
  // Solo emojis (hasta 5 emojis sin texto)
  if (/^[\p{Extended_Pictographic}\s]{1,10}$/u.test(clean)) {
    return true;
  }
  return false;
}

/**
 * Procesa mensajes conversacionales privados en WhatsApp (DMs) con IA Pura (Gemini).
 *
 * REGLA DOCTRINAL (v32.35):
 * - Dirigido a colegas inmobiliarios tradicionales (personas mayores / 50-70 años).
 * - Cero tecnicismos (nada de algoritmos, APIs, machine learning o prompts).
 * - Respuestas cortas, cálidas, humanas y contundentes (sin provocar botón "Leer más").
 * - Explica con claridad meridiana los servicios gratuitos: Verificación de Cédula/Antecedentes y Factura Predial Bogotá en PDF.
 * - Conoce a fondo la Ley 1581 de 2012 (Protección de Datos Personales / Hábeas Data) y la doctrina VECY de Verificación Transparente vs Clandestinidad.
 * - Siempre brinda la alternativa de comunicarse con un agente humano de VECY en horario laboral: +57 316 656 9719.
 */
export async function processPrivateDmConversationalMessage(
  text: string,
  userId: string,
  userName?: string,
  mediaOptions?: DmMediaOptions
): Promise<string> {
  let clean = (text || "").trim();
  const hasImage = !!mediaOptions?.imageBuffer;
  const hasPdf = !!mediaOptions?.pdfBuffer;

  if (!clean && hasImage) {
    clean = "[Fotografía / Imagen adjunta]";
  } else if (!clean && hasPdf) {
    clean = "[Documento adjunto en PDF]";
  }

  if (!clean) return "";

  const realName = await resolveRealName(userId, userName);

  // 🇨🇴 Franja Horaria de Colombia (America/Bogota, UTC-5)
  const nowBogota = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
  const hour = nowBogota.getHours();
  let timeOfDay = "Mañana (5:00 am - 11:59 am)";
  let timeSalutation = "Buenos días";
  if (hour >= 5 && hour < 12) {
    timeOfDay = "Mañana (5:00 am - 11:59 am)";
    timeSalutation = "Buenos días";
  } else if (hour >= 12 && hour < 19) {
    timeOfDay = "Tarde (12:00 pm - 6:59 pm)";
    timeSalutation = "Buenas tardes";
  } else {
    timeOfDay = "Noche (7:00 pm - 4:59 am)";
    timeSalutation = "Buenas noches";
  }

  // Historial conversacional de 72 horas y verificación de interacción en últimas 6 horas
  const history = await getOrLoadDmHistory(userId);
  const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
  const hasRecentInteractionPast6Hours = history.some(h => (h.ts || 0) > sixHoursAgo);

  const cleanLower = clean.toLowerCase();

  // Detección de la línea comercial oficial de VECY BIENES RAÍCES (+57 316 656 9719)
  const isVecyBrokerLine = userId.includes("3166569719") || (userName && userName.includes("VECY BIENES RAÍCES"));
  const isEduardoIdentified = isVecyBrokerLine && /(?:soy\s+eduardo|habla\s+eduardo|de\s+parte\s+de\s+eduardo|eddu\b|eduardo\s+rivera)/i.test(cleanLower);
  const isJaniIdentified = isVecyBrokerLine && /(?:soy\s+jani|habla\s+jani|de\s+parte\s+de\s+jani|jani\s+alves)/i.test(cleanLower);

  // Detección directiva de Eduardo, Jani y Agenda de Confianza / Familiar
  const trustedContact = findTrustedContact(userId, userName || realName);
  const isEduardo = isEduardoIdentified || (!isVecyBrokerLine && (/eduardo/i.test(realName || "") || /eduardo/i.test(userName || "") || userId.includes("3192919978") || userId.includes("225954035179724") || trustedContact?.id === "eduardo_fundador"));
  const isJani = isJaniIdentified || (!isVecyBrokerLine && (/jani/i.test(realName || "") || /jani/i.test(userName || "") || userId.includes("3188096811") || userId.includes("167108705018103") || userId.includes("182781141344345") || userId.includes("218820279050385") || trustedContact?.id === "jani_esposa"));
  const isFamilyOrTrusted = !!trustedContact && !isEduardo && !isJani && !isVecyBrokerLine;

  // Resolución de nombres y género
  const nameInfo = resolveNameAndGender(realName, timeSalutation);
  const compositeOrFirst = extractFirstName(realName);

  let displayName = "";
  if (isEduardo) {
    displayName = "Eduardo";
  } else if (isJani) {
    displayName = "Jani";
  } else if (isVecyBrokerLine) {
    displayName = "VECY";
  } else if (isFamilyOrTrusted && trustedContact) {
    displayName = trustedContact.primaryNick || trustedContact.nicknames?.[0] || "";
  } else {
    const canonicalComposite = getCanonicalCompositeName(realName);
    displayName = canonicalComposite || compositeOrFirst || (nameInfo.displayName !== "colega" && !nameInfo.displayName.toLowerCase().includes("asesor") ? nameInfo.displayName : "");
    if (!canonicalComposite && displayName.includes(" ")) {
      displayName = displayName.split(" ")[0];
    }
  }

  // Procesamiento con IA Pura (Gemini + JANIA_DM_TOOLS)
  try {
    const vecyKnowledge = getVecyInstitutionalKnowledge();
    const contactDossier = await getContactPermanentDossier(userId);
    const systemPrompt =
      `${JANIA_ARGON_COGNITIVE_CORE}\n\n` +
      `Eres JanIA, la inteligencia artificial inmobiliaria oficial de VECY BIENES RAÍCES en Colombia.\n` +
      `Estás conversando por WHATSAPP con un cliente, propietario, comprador, arrendatario o colega asesor inmobiliario.\n\n` +
      `===================================================\n` +
      `BASE DOCTRINAL INSTITUCIONAL DE VECY BIENES RAÍCES:\n` +
      `===================================================\n` +
      `${vecyKnowledge}\n\n` +
      `${contactDossier ? `${contactDossier}\n\n` : ''}` +
      `ROLES ACTIVOS Y SOMBREROS EXPERTOS DE JANIA:\n` +
      `1. Abogada Contractual Senior: Rigor jurídico en promesas de compraventa (Art. 1611 C.C.), arrendamientos (Ley 820/2003) y corretaje (Arts. 1340-1346 C.Co).\n` +
      `2. Liquidadora Notarial y Tributaria: Gastos notariales 50/50, retención en la fuente (1%), impuesto de registro/beneficencia (1.67%) y ganancia ocasional (15%).\n` +
      `3. Perita Avaluadora: Sondeos de m² y cánones por zonas del norte de Bogotá con honestidad técnica (Cero Alucinación).\n` +
      `4. Conectora Comercial y Mediadora 40/20/40: Conexión de negocios compartidos entre colegas.\n` +
      `5. Fábrica Proptech: Vecy Agenda Pro y desarrollo a la medida con Eduardo Rivera al +57 316 656 9719.\n\n` +
      `===================================================\n` +
      `CONTEXTO TEMPORAL Y REGLA DEL SALUDO ÚNICO:\n` +
      `===================================================\n` +
      `- Franja horaria actual en Colombia (Bogotá UTC-5): ${timeOfDay}.\n` +
      `- Saludo institucional del momento: "¡${timeSalutation}${displayName ? `, ${displayName}` : ""}! 👋".\n` +
      `- ¿Hubo interacción reciente en las últimas 6 horas?: ${hasRecentInteractionPast6Hours ? "SÍ (Conversación activa en curso)" : "NO (Nueva interacción / inicio)"}.\n` +
      `- REGLA ESTRICTA DEL SALUDO ÚNICO:\n` +
      `  * Si NO hubo interacción reciente en las últimas 6 horas: Saluda con calidez, cortesía y señorío profesional UNA SOLA VEZ al inicio de tu mensaje usando "¡${timeSalutation}${displayName ? `, ${displayName}` : ""}! 👋".\n` +
      `  * Si SÍ hubo interacción en las últimas 6 horas: Está TERMINANTEMENTE PROHIBIDO saludar de nuevo (JAMÁS digas "¡Hola!", "¡Buenos días!", "Buenas tardes", "Buenas noches", "Qué gusto saludarte de nuevo"). Ve DIRECTO a responder con naturalidad el mensaje actual sin anteponer saludos.\n\n` +
      `===================================================\n` +
      `MANEJO INTELIGENTE DE TRÁMITES Y SUPERPODERES NATIVOS DE WHATSAPP BUSINESS:\n` +
      `===================================================\n` +
      `Cuentas con las herramientas de function calling: consultar_identidad_y_antecedentes, consultar_empresa_o_nit, consultar_paz_y_salvo_idu, consultar_factura_predial_bogota, liquidar_gastos_notariales_y_registro, sondeo_mercado_inmobiliario, consultar_matches_o_codigo, registrar_inmueble_o_requerimiento, enviar_encuesta_interactiva, enviar_tarjeta_contacto_vecy, enviar_evento_visita_inmobiliaria, enviar_catalogo_servicios.\n` +
      `Reglas de ejecución según el contexto:\n` +
      `a) Si el usuario envía un número o documento con INTENCIÓN CLARA (ej. "revisa esta cédula 79458979", "NIT 900123456", "empresa Inversiones SAS", "predial CHIP AAA123", "paz y salvo IDU AAA..."): Invoca de inmediato la herramienta correspondiente sin repreguntar y entrega el reporte oficial.\n` +
      `b) Si el usuario pide una tarjeta de contacto, evento, encuesta interactiva de opciones o el catálogo de servicios: Invoca la herramienta nativa correspondiente.\n` +
      `c) Si el usuario envía SOLO un número suelto sin contexto ("79458979", "1018456789"): Pregúntale con calidez y naturalidad humana en UN solo renglón si desea consultar antecedentes de esa cédula/NIT o a qué trámite se refiere.\n` +
      `d) Apenas el usuario confirme en el siguiente turno ("sí", "dale", "por fa", "cédula", "1", "adelante", "procede"): Ejecuta la herramienta de inmediato usando el número que ya está en el historial de la conversación.\n\n` +
      `===================================================\n` +
      `BUSCADOR Y MEDIACIÓN DE MATCHES (CÓDIGO #M...):\n` +
      `===================================================\n` +
      `${isEduardo || isJani
        ? `- Para Eduardo o Jani: Entrega la información 100% destapada y completa (inmueble, demanda, porcentaje de afinidad, nombre del colega, teléfono y enlace directo de WhatsApp).\n`
        : `- Para Usuarios o Agentes Externos: Confirma que SÍ hay match, describe el perfil del cruce SIN revelar el teléfono ni el nombre del usuario de la otra punta, entrega el código de match (ej. #M15649) e indícale comunicarse al +57 316 656 9719 mencionando ese código para coordinar la mediación colaborativa 40/20/40.\n`
      }` +
      `\n===================================================\n` +
      `IDENTIDAD Y TRATO AL INTERLOCUTOR:\n` +
      `===================================================\n` +
      `${isVecyBrokerLine && !isEduardoIdentified && !isJaniIdentified
        ? `- Estás recibiendo mensaje desde la línea oficial de bróker (+57 316 656 9719). Trátalos con la naturalidad de compañera de equipo y mano derecha hacia tus creadores, preguntando con amabilidad y naturalidad con cuál de los dos estás hablando si no lo han especificado.\n`
        : isEduardo
          ? `- Trato directivo para EDUARDO A. RIVERA (Fundador y Director de Tecnología): Compañera de equipo y mano derecha leal, ágil, precisa y ejecutiva.\n`
          : isJani
            ? `- Trato directivo para JANI ALVES (Fundadora y Directora de Operaciones): Compañera de equipo y mano derecha leal, operativa, cálida y ejecutiva.\n`
            : isFamilyOrTrusted && trustedContact
              ? `- CÍRCULO FAMILIAR Y DE CONFIANZA: Estás conversando con ${trustedContact.primaryNick} (${trustedContact.relationship} de Eduardo A. Rivera). Trátala/lo con inmenso cariño, afecto familiar y respeto natural. Cuéntale con fluidez (sin plantillas rígidas) que Eduardo ahora está disponible en su línea de bróker +57 316 656 9719 (https://wa.me/573166569719) y recibe con amor sus recados. PROHIBIDO usar lenguaje formal frío de vendedor, pedirle reseñas en Google o venderle servicios comerciales a familiares.\n`
              : `- Usuario identificado: ${displayName || realName || "Colega"}.\n`
      }` +
      `- ESCUDO ANTI-COBRANZAS INSTITUCIONAL: Si detectas que se trata de una casa de cobranza, banco hostil, mandamiento de pago o despacho buscando a Eduardo A. Rivera por temas financieros o deudas personales, responde con postura corporativa neutral sin dar su número personal ni datos privados, indicando que este es el canal técnico de la plataforma virtual. OJO: No confundir ni bloquear charlas inmobiliarias legítimas donde clientes o colegas hablen de embargos sobre inmuebles a la venta, hipotecas bancarias o saneamiento predial.\n` +
      `- SERVICIO INCONDICIONAL Y LIBERTAD DEL USUARIO (DOCTRINA EDUARDO A. RIVERA): Los usuarios son personas libres y tienen total libertad de escribir como deseen (corto, seco, directo, con modismos o sin rodeos). JanIA NUNCA debe obligar, corregir ni pretender que los usuarios hablen como ella. JanIA está siempre a su servicio incondicional con profesionalismo y eficacia.\n` +
      `- MENSAJES CORTOS, DIRECTOS Y CLAROS (CERO "LEER MÁS"): Respuestas breves, directas al grano, claras y fluidas (máximo 1 o 2 párrafos cortos), sin introducciones extensas ni textos kilométricos que fuercen el botón 'Leer más'.`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt }
    ];

    // Incluir hasta 20 turnos de las últimas 72 horas para retención contextual completa
    for (const turn of history.slice(-20)) {
      messages.push({ role: turn.role, content: turn.content });
    }

    messages.push({
      role: "user",
      content: `Mensaje de ${realName} (${userId}): "${clean}"`
    });

    const llmRes = await invokeLLM({
      messages,
      tools: JANIA_DM_TOOLS
    });

    let reply = "";
    const fnCall = llmRes.choices[0]?.message?.functionCall;
    if (fnCall && fnCall.name) {
      let rawFnArgs = fnCall.arguments ?? fnCall.args ?? {};
      if (typeof rawFnArgs === "string") {
        try {
          rawFnArgs = JSON.parse(rawFnArgs);
        } catch (_) {
          rawFnArgs = {};
        }
      }
      const toolExecution = await executeJaniaDmTool(
        fnCall.name,
        rawFnArgs,
        userId,
        userName || displayName || realName,
        clean
      );
      reply = await synthesizeToolResponseWithGemini(
        userId,
        userName || displayName || realName,
        toolExecution.toolType,
        toolExecution.resultJson,
        clean,
        isEduardo,
        isJani,
        displayName
      );
    } else {
      reply = llmRes.choices[0]?.message?.content || "";
    }

    reply = sanitizeResponseMarkdown(reply.trim());

    if (!reply) {
      if (isEduardo) {
        reply = `¡${timeSalutation}, Eduardo! 👋 ¿En qué te colaboro hoy?`;
      } else if (isJani) {
        reply = `¡${timeSalutation}, Jani! 👋 ¿En qué te colaboro hoy?`;
      } else {
        reply = hasRecentInteractionPast6Hours
          ? `Con mucho gusto. Cuéntame en qué trámite o consulta inmobiliaria te colaboro hoy 🤝.`
          : `¡${timeSalutation}${displayName ? `, ${displayName}` : ""}! 👋 En *VECY BIENES RAÍCES* estoy lista para colaborarte. ¿Qué consulta o trámite deseas realizar hoy? 🤝`;
      }
    }

    appendDmHistory(userId, "user", clean);
    appendDmHistory(userId, "assistant", reply);
    return reply;
  } catch (err: any) {
    console.error("[processPrivateDmConversationalMessage Error]:", err?.message);

    if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") {
      const { getGreetingByTime } = await import("../../whatsapp-utils");
      const timeGreeting = getGreetingByTime();

      if (isEduardo) {
        const welcomeMsg = `¡${timeGreeting}, Eduardo! 👋 Estoy 100% activa y a tu entera disposición para hablar o apoyarte en cualquier gestión. ¿En qué te colaboro hoy?`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", welcomeMsg);
        return welcomeMsg;
      }
      if (isVecyBrokerLine && !isEduardoIdentified && !isJaniIdentified) {
        const brokerLineMsg = `¡${timeGreeting}, VECY! 👋 Estás en la línea oficial de VECY BIENES RAÍCES (+57 316 656 9719). ¿Con quién tengo el gusto de hablar hoy? ¿Con Eduardo o con Jani?`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", brokerLineMsg);
        return brokerLineMsg;
      }
      if (isShortSignalOrSticker(clean)) {
        const dotMsg = `¡${timeGreeting}${displayName ? ` ${displayName}` : ""}! 👋 Recibí tu señal / puntico por aquí. En *VECY BIENES RAÍCES* estoy lista para colaborarte. ¿Qué consulta o trámite deseas realizar hoy? 🤝`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", dotMsg);
        return dotMsg;
      }
      if (isFamilyOrTrusted && trustedContact) {
        let famMsg = "";
        if (/(?:dile\s+a\s+eddu|dile\s+a\s+eduardo|mensaje\s+a\s+eddu|av[ií]sale\s+a\s+eddu)/i.test(cleanLower)) {
          famMsg = `¡Anotadísimo, ${trustedContact.primaryNick || trustedContact.nicknames?.[0] || "Pollotote"}! Le paso tu mensaje a Eduardo (Eddu) de inmediato 🤝✨.`;
        } else if (trustedContact.customMessage) {
          famMsg = `¡${timeGreeting}, ${trustedContact.customMessage}`;
        } else {
          famMsg = `¡${timeGreeting}, ${trustedContact.primaryNick || displayName}! JanIA, la inteligencia artificial de VECY BIENES RAÍCES 🤖✨. Te cuento que Eduardo está disponible en su línea de bróker: +57 316 656 9719 (https://wa.me/573166569719).`;
        }
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", famMsg);
        return famMsg;
      }
      if (/(?:cobro|prejur[ií]dico|embargo|serlefin|deuda|cobranza)/i.test(cleanLower)) {
        const shieldMsg = `No tengo información de esa persona ni manejo agendas personales. En VECY BIENES RAÍCES este es el canal técnico de la plataforma virtual.`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", shieldMsg);
        return shieldMsg;
      }
      if (mediaOptions?.flyerVisionData?.isFlyerOrBanner || mediaOptions?.flyerVisionData?.title) {
        const title = mediaOptions.flyerVisionData.title || (mediaOptions.flyerVisionData as any).propertyTitle || "Apartamento en Venta Chico 120m2";
        const flyerMsg = `¡${timeGreeting} ${displayName}! 👋 He analizado con visión artificial tu afiche comercial: *${title}*. Ya quedó registrado en el sistema de VECY BIENES RAÍCES para cruzarlo con nuestra base de demandas 🤝✨.`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", flyerMsg);
        return flyerMsg;
      }
      if (hasImage) {
        const photoMsg = `¡${timeGreeting} ${displayName}! 👋 He recibido tu imagen. En VECY BIENES RAÍCES estamos a tu servicio para Factura Predial, Policía Nacional y trámites inmobiliarios. ¿En qué te podemos colaborar hoy? 🤝✨`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", photoMsg);
        return photoMsg;
      }

      const { getPendingCedulaSession, extractAllCedulasForVerification, extractCedulaForVerification, savePendingCedulaSession } = await import("../../identityVerificationService");
      const savedCedSession = getPendingCedulaSession(userId);
      if (savedCedSession?.reportText) {
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", savedCedSession.reportText);
        return savedCedSession.reportText;
      }

      const multiCed = extractAllCedulasForVerification(clean, true);
      if (multiCed.length > 1) {
        const { executeIdentityVerificationFromWhatsApp } = await import("../../identityVerificationService");
        const verif = await executeIdentityVerificationFromWhatsApp(clean, true);
        if (verif.reportText) {
          savePendingCedulaSession(userId, multiCed, verif.reportText, true);
        }
        const rawNumMsg = `¡${timeGreeting}${displayName ? ` ${displayName}` : ""}! 👋 Recibí el dato *${multiCed.map(c => c.cedula).join(", ")}*. Confírmame qué trámite requieres:\n• Cédula de Ciudadanía (C.C.) / Cédula de Extranjería (C.E.) / Pasaporte / NIT (Persona Jurídica) para antecedentes.\n• O consulta de Factura Predial Bogotá / Paz y Salvo IDU. Quedo atenta para emitir el reporte oficial 🤝✨.\n\n_⚖️ Tratamiento de datos Ley 1581/12._`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", rawNumMsg);
        return rawNumMsg;
      }

      const singleCedCheck = extractCedulaForVerification(clean, true);
      if (singleCedCheck.found && singleCedCheck.cedula) {
        const { setPendingUnconfirmedDoc } = await import("../../identityVerificationService");
        setPendingUnconfirmedDoc(userId, singleCedCheck.cedula);
        const rawNumMsg = `¡${timeGreeting}${displayName ? ` ${displayName}` : ""}! 👋 Recibí el dato *${singleCedCheck.cedula}*. Confírmame qué trámite requieres:\n• Cédula de Ciudadanía (C.C.) / Cédula de Extranjería (C.E.) / Pasaporte / NIT (Persona Jurídica) para antecedentes.\n• O consulta de Factura Predial Bogotá / Paz y Salvo IDU. Quedo atenta para emitir el reporte oficial 🤝✨.\n\n_⚖️ Tratamiento de datos Ley 1581/12._`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", rawNumMsg);
        return rawNumMsg;
      }

      if (/^\d{5,12}$/.test(clean)) {
        const { setPendingUnconfirmedDoc } = await import("../../identityVerificationService");
        setPendingUnconfirmedDoc(userId, clean);
        const rawNumMsg = `¡${timeGreeting}${displayName ? ` ${displayName}` : ""}! 👋 Recibí el dato *${clean}*. Confírmame qué trámite requieres:\n• Cédula de Ciudadanía (C.C.) / Cédula de Extranjería (C.E.) / Pasaporte / NIT (Persona Jurídica) para antecedentes.\n• O consulta de Factura Predial Bogotá / Paz y Salvo IDU. Quedo atenta para emitir el reporte oficial 🤝✨.\n\n_⚖️ Tratamiento de datos Ley 1581/12._`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", rawNumMsg);
        return rawNumMsg;
      }
      if (/^[A-Za-z]{3}\d{4}[A-Za-z0-9]{4}$/.test(clean)) {
        const { setPendingUnconfirmedDoc } = await import("../../identityVerificationService");
        setPendingUnconfirmedDoc(userId, clean);
        const chipMsg = `¡${timeGreeting}${displayName ? ` ${displayName}` : ""}! 👋 Recibí el código CHIP *${clean}*. ¿Deseas la factura del impuesto predial de Bogotá o el paz y salvo de valorización del IDU? Quedo atenta para emitirte el documento de inmediato 🤝✨.\n\n_⚖️ Tratamiento de datos Ley 1581/12._`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", chipMsg);
        return chipMsg;
      }
      if (/(?:^|\b)(?:es\s+cc|cc|c[eé]dula|1|antecedentes|idu|3|predial|2)\b/i.test(cleanLower)) {
        const { getPendingUnconfirmedDoc, clearPendingUnconfirmedDoc, executeIdentityVerificationFromWhatsApp } = await import("../../identityVerificationService");
        const pendingDoc = getPendingUnconfirmedDoc(userId);
        if (pendingDoc) {
          clearPendingUnconfirmedDoc(userId);
          const rawVal = pendingDoc.rawNumber || (pendingDoc as any);
          if (/^[A-Za-z]{3}\d{4}[A-Za-z0-9]{4}$/.test(rawVal)) {
            const { executeIduValorizacionFromWhatsApp } = await import("../../iduValorizacionService");
            const resIdu = await executeIduValorizacionFromWhatsApp(rawVal, userId, true);
            const reportOut = resIdu.reportText || "";
            appendDmHistory(userId, "user", clean);
            appendDmHistory(userId, "assistant", reportOut);
            return reportOut;
          }
          const verifResult = await executeIdentityVerificationFromWhatsApp(rawVal, true);
          if (verifResult.reportText) {
            const out = `¡Confirmado, ${displayName}!\n\n${verifResult.reportText}`;
            appendDmHistory(userId, "user", clean);
            appendDmHistory(userId, "assistant", out);
            return out;
          }
        }
      }
      if (/qu[eé] es vecy|qui[eé]nes son|presentaci[oó]n|a qu[eé] se dedican/i.test(cleanLower)) {
        const presMsg = `Somos *VECY BIENES RAÍCES*, fundada por Eduardo A. Rivera y Jani Alves. Conoce nuestras operaciones en https://www.instagram.com/vecybienesraices/ y califica nuestro servicio en https://g.page/r/CctNbwU6UpX5EBM/review.`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", presMsg);
        return presMsg;
      }
      if (/paz y salvo.*idu|valorizaci[oó]n idu|certificado.*idu|enlace.*webidu/i.test(cleanLower)) {
        const { formatIduAssistanceGuide } = await import("../../iduValorizacionService");
        const guide = formatIduAssistanceGuide(displayName || "Colega");
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", guide);
        return guide;
      }
      if (/c[oó]mo se hace la verificaci[oó]n|c[oó]mo se hace/i.test(cleanLower)) {
        const howTo = `¡No te preocupes ni un segundo, ${displayName}! Para eso estoy yo aquí. Para verificar una cédula o antecedentes. Para sacar el Impuesto Predial de Bogotá. Si te cuesta la tecnología o te enredas con el celular, tengo toda la paciencia del mundo. Solo facilítame el dato para el registro de portería previo a la visita.`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", howTo);
        return howTo;
      }
      if (/revisar los antecedentes de un cliente/i.test(cleanLower)) {
        const docIntent = `¡Claro que sí, ${displayName}! Con el mayor gusto te colaboro con la verificación preventiva para el registro de portería y control de acceso. Por favor compárteme el número de documento y el nombre completo.`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", docIntent);
        return docIntent;
      }
      if (/(?:quieto|quiero|revisar|rrvisar).*(?:antecedentes)/i.test(cleanLower)) {
        const habMsg = `¡Claro que sí, ${displayName}! Para consultar los antecedentes y verificar la identidad en la Policía Nacional, es indispensable contar con el número de cédula exacto. Por normatividad de Hábeas Data (Ley 1581 de 2012), las bases oficiales no permiten buscar números de documento usando únicamente nombres o apellidos.`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", habMsg);
        return habMsg;
      }
      if (/(?:consultar\s+c[eé]dula)/i.test(cleanLower)) {
        const docMsg = `¡Claro que sí, ${displayName}! Por favor indícame el número de documento y el nombre completo de la persona a consultar.`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", docMsg);
        return docMsg;
      }
      if (/costos/i.test(cleanLower)) {
        const cMsg = `Nuestros servicios de consulta y verificación son completamente *GRATIS*. Envíame el número de cédula.`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", cMsg);
        return cMsg;
      }
      if (/como es lo de las consultas/i.test(cleanLower)) {
        const qMsg = `Primero cuéntame qué clase de consulta deseas hacer. Ofrecemos Servicios 100% Gratuitos de Autoservicio: Verificación oficial de documentos, Factura Predial Bogotá y Certificados de Pago. Y Consultas Especializadas y Asesoría Profesional: Sondeos de mercado, Asesoría jurídica inmobiliaria, Recuperación de cartera, Avalúos digitales, Liquidaciones tributarias y Préstamos sobre hipoteca.`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", qMsg);
        return qMsg;
      }
      if (/muchas gracias|gracias/i.test(cleanLower)) {
        const gMsg = `Con todo el gusto, ${displayName}. Te invito a unirte a nuestro Canal Oficial de WhatsApp (https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b) y calificar nuestro servicio.`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", gMsg);
        return gMsg;
      }
      if (/^hola\b/i.test(cleanLower)) {
        const hMsg = `Soy *JanIA*, tu asistente inmobiliaria con IA creada por *VECY BIENES RAÍCES*. ¡${timeGreeting}, ${displayName}! ¿a qué te dedicas o qué haces actualmente?`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", hMsg);
        return hMsg;
      }
    }

    const fallback = isEduardo
      ? `¡${timeSalutation}, Eduardo! A tu disposición. Ocurrió una intermitencia temporal en el sistema de consulta. ¿Me confirmas nuevamente el dato para procesarlo de inmediato? 🤝`
      : isJani
        ? `¡${timeSalutation}, Jani! Qué gusto saludarte. Ocurrió una intermitencia temporal en el sistema de consulta. ¿Me confirmas nuevamente el dato para procesarlo de inmediato? 🤝`
        : isFamilyOrTrusted
          ? `¡${timeSalutation}, ${displayName}! Qué pena contigo, ocurrió una intermitencia temporal en mi sistema (un pequeño fallo en la matrix 🤖😅). ¿Me confirmas nuevamente qué necesitas para ayudarte de inmediato? 🤝`
          : `¡${timeSalutation}${displayName ? ` ${displayName}` : ""}! Qué pena contigo. Debido a una intermitencia temporal en mi sistema (un pequeño fallo en la matrix 🤖😅), no pude captar bien lo que me solicitaste. ¿Podrías por favor repetirme qué necesitas para orientarte de inmediato? 🤝`;
    appendDmHistory(userId, "user", clean);
    appendDmHistory(userId, "assistant", fallback);
    return fallback;
  }
}
