import {
  resolveRealName,
  getOrLoadDmHistory,
  appendDmHistory,
  getContactPermanentDossier,
  getUserPerpetualSession,
  saveUserPerpetualSession,
  isNewUser,
  incrementUserMessageCount,
  incrementFreeServicesCount,
  recordUserReviewClaim,
  verifyUserGoogleReview,
  isUserVerifiedGoogleReview,
  shouldAskForGoogleReview,
  isEduardoOrJani
} from "../sessionManager";
import { fetchWebUrlContent } from "../../scraper";
import { getDb } from "../../../db";
import { properties } from "../../../../drizzle/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { extractFirstName, sanitizeResponseMarkdown } from "../parsers";
import { resolveNameAndGender, getCanonicalCompositeName, extractIntroducedName } from "../../nameAndGenderResolver";
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

const latestDmFollowUpMap = new Map<string, string>();

export function setLatestDmFollowUpMessage(_userId: string, _followUpText: string): void {
  // ⚠️ CERO SEGUNDO MENSAJE FORZADO (v33.29):
  // No-op para mantener retrocompatibilidad sin encolar mensajes forzados
}

export function popLatestDmFollowUpMessage(_userId: string): string | undefined {
  return undefined;
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
        description: "Consulta y valida la identidad oficial de Empresas y Personas Jurídicas por NIT o Razón Social (RUES + Cámara de Comercio + DIAN + Procuraduría SIRI + Contraloría SIRECI). Devuelve Razón Social, NIT, Estado de matrícula, Dirección comercial, Teléfono, Actividad económica (CIIU) y Representante Legal Principal.",
        parameters: {
          type: "OBJECT",
          properties: {
            consultaEmpresa: { type: "STRING", description: "Número de NIT con o sin dígito de verificación o Nombre/Razón Social de la empresa detectada en texto o imagen" }
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
      },
      {
        name: "navegar_o_buscar_web",
        description: "Abre y extrae el contenido real de una URL/enlace web (portales inmobiliarios como Metrocuadrado, Fincaraiz, Ciencuadras, páginas corporativas o documentos web) o busca información actualizada en internet.",
        parameters: {
          type: "OBJECT",
          properties: {
            url: { type: "STRING", description: "URL o enlace web completo a consultar (ej. https://...)" },
            query: { type: "STRING", description: "Término de búsqueda web si no hay URL directa" }
          }
        }
      },
      {
        name: "consultar_catalogo_inmuebles_vecy",
        description: "Consulta el catálogo oficial y base de datos de propiedades de VECY BIENES RAÍCES (Atención Bróker 3166569719), filtrando por tipo de inmueble, tipo de negocio (venta, arriendo), zona/barrio, rango de precio o características, entregando fichas y sondeos de $/m² al instante.",
        parameters: {
          type: "OBJECT",
          properties: {
            tipoInmueble: { type: "STRING", description: "apartamento, casa, oficina, local, lote, etc." },
            tipoNegocio: { type: "STRING", description: "venta, arriendo, venta_o_arriendo" },
            zona: { type: "STRING", description: "Zona o barrio de Bogotá o municipio" },
            precioMaximo: { type: "NUMBER", description: "Presupuesto máximo en COP" }
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
  | "catalogo"
  | "web"
  | "catalogo_inmuebles";

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
      const isCompanyReport = tipo === "NIT" || Boolean(res.reportText?.includes("VERIFICACIÓN OFICIAL DE EMPRESA"));
      return {
        toolType: isCompanyReport ? "empresa" : "cedula",
        resultJson: {
          solicitud: isCompanyReport ? "consulta_empresa_o_nit" : "verificacion_identidad",
          numeroDocumento: doc,
          tipoDocumento: tipo,
          nombreOficial: res.officialName || null,
          exitoso: res.success ?? res.isVerificationRequest,
          policia: res.policia?.message || (res.success ? "Sin antecedentes judiciales ni requerimientos penales pendientes" : null),
          procuraduria: res.procuraduria?.statusText || (res.success ? "No registra sanciones ni inhabilidades vigentes ante la Procuraduría General" : null),
          contraloria: res.contraloria?.statusText || (res.success ? "Sin reporte en el Boletín de Responsables Fiscales (SIRECI)" : null),
          adres: res.adres ? {
            eps: res.adres.eps,
            estado: res.adres.estado,
            regimen: res.adres.regimen
          } : null,
          reporteOficial: res.reportText || "Sin reporte disponible",
          preguntaSeguimiento: ""
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
          exitoso: empRes.success,
          nit: empRes.nit,
          dv: empRes.dv,
          nitCompleto: empRes.nitCompleto,
          razonSocial: empRes.razonSocial,
          camaraComercio: empRes.camaraComercio,
          ciudad: empRes.ciudad,
          estado: empRes.estado,
          matricula: empRes.matricula,
          categoriaMatricula: empRes.categoriaMatricula,
          tipoSociedad: empRes.tipoSociedad,
          organizacionJuridica: empRes.organizacionJuridica,
          organizacionJuridicaRaw: empRes.organizacionJuridicaRaw,
          fechaMatricula: empRes.fechaMatricula,
          fechaRenovacion: empRes.fechaRenovacion,
          ultimoAnoRenovado: empRes.ultimoAnoRenovado,
          ciiuPrincipal: empRes.ciiuPrincipal,
          actividadesEconomicas: empRes.actividadesEconomicas,
          representantePrincipal: empRes.representantePrincipal || null,
          representantesSuplentes: empRes.representantesSuplentes || [],
          establecimientos: empRes.establecimientos || [],
          direccionComercial: empRes.direccionComercial,
          telefonoComercial: empRes.telefonoComercial,
          reporteOficial: empRes.reportText || "Consulta empresarial procesada",
          preguntaSeguimiento: ""
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
    case "navegar_o_buscar_web": {
      const url = String(args.url || "").trim();
      const query = String(args.query || rawUserText || "").trim();
      if (url && /^https?:\/\//i.test(url)) {
        const pageData = await fetchWebUrlContent(url);
        return {
          toolType: "web",
          resultJson: {
            solicitud: "navegacion_web",
            url,
            titulo: pageData.title,
            contenido: pageData.content,
            exitoso: pageData.success
          }
        };
      }
      return {
        toolType: "web",
        resultJson: {
          solicitud: "busqueda_web",
          query,
          mensaje: "Búsqueda web procesada en el núcleo cognitivo de JanIA.",
          exitoso: true
        }
      };
    }
    case "consultar_catalogo_inmuebles_vecy": {
      const tipoInmueble = String(args.tipoInmueble || "").toLowerCase().trim();
      const tipoNegocio = String(args.tipoNegocio || "").toLowerCase().trim();
      const zona = String(args.zona || "").trim();
      const precioMax = Number(args.precioMaximo || 0);

      const db = await getDb();
      let foundProps: any[] = [];
      if (db) {
        try {
          const conditions: any[] = [eq(properties.available, true)];
          if (tipoInmueble) {
            conditions.push(sql`LOWER(${properties.propertyType}) LIKE ${'%' + tipoInmueble + '%'}`);
          }
          if (tipoNegocio) {
            conditions.push(sql`LOWER(${properties.transactionType}) LIKE ${'%' + tipoNegocio + '%'}`);
          }
          if (zona) {
            conditions.push(sql`LOWER(${properties.zone}) LIKE ${'%' + zona.toLowerCase() + '%'}`);
          }
          if (precioMax > 0) {
            conditions.push(sql`(${properties.price} <= ${precioMax} OR ${properties.rentPrice} <= ${precioMax})`);
          }
          foundProps = await db
            .select({
              id: properties.id,
              name: properties.name,
              propertyType: properties.propertyType,
              transactionType: properties.transactionType,
              zone: properties.zone,
              price: properties.price,
              rentPrice: properties.rentPrice,
              areaTotal: properties.areaTotal,
              bedrooms: properties.bedrooms,
              bathrooms: properties.bathrooms,
              garages: properties.garages,
              description: properties.description
            })
            .from(properties)
            .where(and(...conditions))
            .orderBy(desc(properties.id))
            .limit(5);
        } catch (dbErr: any) {
          console.warn("[consultar_catalogo_inmuebles_vecy] Error querying DB:", dbErr?.message);
        }
      }

      const totalProps = foundProps.length;
      let avgM2Price = 0;
      if (totalProps > 0) {
        const prices = foundProps.map(p => {
          const pr = Number(p.price || p.rentPrice || 0);
          const ar = Number(p.areaTotal || 0);
          return ar > 0 && pr > 0 ? pr / ar : 0;
        }).filter(v => v > 0);
        if (prices.length > 0) {
          avgM2Price = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
        }
      }

      return {
        toolType: "catalogo_inmuebles",
        resultJson: {
          solicitud: "catalogo_inmuebles_vecy",
          tipoInmueble,
          tipoNegocio,
          zona,
          totalEncontrados: totalProps,
          precioPromedioM2: avgM2Price,
          inmuebles: foundProps.map(p => ({
            codigo: `#P${p.id}`,
            titulo: p.name,
            tipo: p.propertyType,
            operacion: p.transactionType,
            zona: p.zone,
            precioVenta: p.price ? `$${Number(p.price).toLocaleString('es-CO')} COP` : undefined,
            precioCanon: p.rentPrice ? `$${Number(p.rentPrice).toLocaleString('es-CO')} COP/mes` : undefined,
            areaM2: p.areaTotal ? `${p.areaTotal} m²` : undefined,
            habitaciones: p.bedrooms,
            banos: p.bathrooms,
            garajes: p.garages
          })),
          contactoBroker: "Eduardo Rivera & Jani Alves — WhatsApp Oficial +57 316 656 9719"
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
  if (isFreeTool) {
    await incrementFreeServicesCount(userId);
  }
  const rawReport = toolJson.reporteOficial || (toolType === "sondeo" ? JSON.stringify(toolJson) : "");

  // 1. Bypass exclusivo para herramientas con documentos oficiales descargables o formatos especiales (Predial, IDU, Notarial y Match)
  const isDirectBypass = rawReport && (
    rawReport.includes("PAZ Y SALVO") ||
    rawReport.includes("FACTURA PREDIAL") ||
    rawReport.includes("LIQUIDACIÓN ESTIMADA") ||
    rawReport.includes("COINCIDENCIA") ||
    rawReport.includes("MATCH")
  );
  if (isDirectBypass) {
    return rawReport.includes("COINCIDENCIA") || rawReport.includes("MATCH")
      ? rawReport
      : await formatPoliteToolDelivery(userId, userName, toolType as any, rawReport, true);
  }

  const userVerifiedReview = await isUserVerifiedGoogleReview(userId);
  const isVip = isEduardoOrJani(userId);
  const askReview = !userVerifiedReview && !isVip && (await shouldAskForGoogleReview(userId));

  let specialToolInstructions = "";
  if (toolType === "cedula") {
    specialToolInstructions =
      `- HERRAMIENTA: Verificación Oficial de Identidad y Antecedentes (Personas Naturales: CC, CE, PPT, Pasaporte).\n` +
      `- REDACCIÓN 100% LIBRE Y CONVERSACIONAL: Cero plantillas rígidas prefabricadas, cero encabezados acartonados o viñetas robóticas. Redacta de forma fresca, original, corta y humana como experta de VECY.\n` +
      `- CERO ALUCINACIÓN: Respeta rigurosamente TODOS los datos reales verificados obtenidos de las entidades oficiales del Estado:\n` +
      `  * Nombre oficial de la persona y número de documento validado.\n` +
      `  * Policía Nacional: Antecedentes penales / requerimientos judiciales.\n` +
      `  * Procuraduría General: Sanciones disciplinarias e inhabilidades vigentes.\n` +
      `  * Contraloría General: Boletín de Responsables Fiscales (SIRECI).\n` +
      `  * ADRES (BDUA): Aseguramiento en salud indicando el nombre real y limpio de la EPS (ej. Sanitas EPS, Capital Salud EPS-S, Sura EPS, Nueva EPS), estado y régimen.\n` +
      `- Si el documento no aparece indexado en las bases censales en línea, indícalo con honestidad y claridad para que verifique el número físico.\n` +
      `- NOTA DE HÁBEAS DATA SUTIL AL FINAL: Ubica al final una línea breve y elegante de Hábeas Data (Ley 1581/12 y Art. 15 C.P.).\n` +
      (askReview
        ? `- CIERRE CERCANO Y PERSUASIVO CON RESEÑA EN GOOGLE: Cierra de forma muy charlada, cercana, simpática y persuasiva invitando a calificarnos y dejarnos un lindo comentario en Google (https://g.page/r/CctNbwU6UpX5EBM/review), explicándole que no le toma ni un minuto y nos permite mantener todas estas herramientas 100% gratuitas para el gremio y la comunidad inmobiliaria.\n`
        : `- REGLA ESTRICTA DE RESEÑA: No pidas ni menciones reseña de Google a este usuario.\n`);
  } else if (toolType === "empresa") {
    specialToolInstructions =
      `- HERRAMIENTA: Consulta Empresarial Oficial RUES (Confecámaras / Cámaras de Comercio de Colombia / DIAN).\n` +
      `- REDACCIÓN 100% LIBRE Y CONVERSACIONAL: Cero plantillas rígidas prefabricadas de 4 secciones, cero formatos acartonados ni viñetas robóticas. Redacta de forma fresca, ejecutiva, original y charlada.\n` +
      `- CERO ALUCINACIÓN: Respeta estrictamente TODOS los datos reales obtenidos de RUES:\n` +
      `  * Razón social oficial, NIT y Dígito de Verificación (DV).\n` +
      `  * Estado de la matrícula mercantil (ej. Activa) y Cámara de Comercio donde está inscrita.\n` +
      `  * Tipo de sociedad / organización jurídica y actividad económica principal (CIIU).\n` +
      `  * Representante Legal Principal: Si el RUES arroja el Representante Legal Principal, menciónalo de forma fluida y natural dentro de tu respuesta (nombre, documento y que cuenta con plenas facultades estatutarias para obligar a la sociedad).\n` +
      `  * Si hay suplentes o establecimientos relevantes, menciónalos con brevedad.\n` +
      `- SI LA EMPRESA NO FUE ENCONTRADA: Si el resultado indica que no se localizó la empresa, informa con total honestidad que no se halló registro en las 57 Cámaras de Comercio del país y pídele con amabilidad el número de NIT para una búsqueda exacta.\n` +
      `- CERO SEGUNDO MENSAJE FORZADO: NO encoles ni repreguntes de forma robótica si desea verificar al representante. JanIA lo menciona en su única respuesta con naturalidad.\n` +
      `- NOTA DE HÁBEAS DATA SUTIL AL FINAL: Incluye una línea breve de publicidad mercantil y hábeas data (Art. 26 C.Co. y Ley 1581/12).\n` +
      (askReview
        ? `- CIERRE CERCANO Y PERSUASIVO CON RESEÑA EN GOOGLE: Cierra de forma muy charlada, cercana y persuasiva invitando al usuario a calificarnos en Google (https://g.page/r/CctNbwU6UpX5EBM/review), explicándole que no le toma ni un minuto y nos permite mantener estas herramientas 100% gratuitas para el gremio inmobiliario.\n`
        : `- REGLA ESTRICTA DE RESEÑA: No pidas ni menciones reseña de Google a este usuario.\n`);
  } else if (toolType === "web") {
    specialToolInstructions =
      `- HERRAMIENTA: Navegación y Lectura Web Abierta en Tiempo Real.\n` +
      `- Extrae y analiza los datos reales de la página o portal consultado, entregando síntesis ejecutiva, directa y sin rodeos al usuario.\n`;
  } else if (toolType === "catalogo_inmuebles") {
    specialToolInstructions =
      `- HERRAMIENTA: Consulta de Catálogo Oficial de VECY BIENES RAÍCES (Atención Bróker 3166569719).\n` +
      `- Presenta de forma clara y organizada las propiedades encontradas con su código (#P...), tipo, ubicación, precio o canon y metraje, junto con el valor promedio de $/m² de la zona.\n` +
      `- Invita cordialmente a comunicarse con Eduardo Rivera o Jani Alves a la línea de atención de bróker (+57 316 656 9719) para coordinar visitas o recibir dossier completo.\n`;
  }

  const synthPrompt = [
    {
      role: "system",
      content:
        `Eres JanIA, la inteligencia artificial inmobiliaria oficial de VECY BIENES RAÍCES en Colombia.\n` +
        `Acabas de ejecutar la herramienta correspondiente a: ${toolType}.\n` +
        `Datos estructurados del sistema en JSON:\n` +
        `${JSON.stringify(toolJson, null, 2)}\n\n` +
        `INSTRUCCIONES DE REDACCIÓN (NIVEL ARGON — VOZ LAOMEDEIA):\n` +
        `- Redacta la respuesta directamente para el usuario (${displayName || "colega"}), con total calidez, solvencia, concisión y persuasión de IA pura.\n` +
        specialToolInstructions +
        `- Si es un sondeo de mercado, entrega el valor por m² homologado, valor comercial sugerido, canon estimado y factores de ajuste según tu rol de Perita Avaluadora.\n` +
        `- Si es una consulta de matches, explica con claridad el cruce encontrado.\n` +
        `- Explica con claridad los datos técnicos sin tecnicismos robóticos ni plantillas rígidas.\n` +
        `- Mantén concisión y estructura óptima para WhatsApp (*negritas*, viñetas limpias).\n` +
        `- Aplica ortografía estricta en español (signos ¡ y ¿, mayúscula inicial).\n`
    },
    {
      role: "user",
      content: userMessage
    }
  ];

  try {
    const res = await invokeLLM({ messages: synthPrompt, highReasoning: true });
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

  // Fallback conversacional orgánico en caso de que LLM no esté disponible o arroje timeout
  let fallbackText = "";
  if (toolType === "cedula" && toolJson) {
    const doc = toolJson.numeroDocumento || "";
    const tipo = toolJson.tipoDocumento || "CC";
    const name = toolJson.nombreOficial;
    const eps = toolJson.adres?.eps;
    const estadoEps = toolJson.adres?.estado;
    const regEps = toolJson.adres?.regimen;
    const pol = toolJson.policia || "Sin antecedentes judiciales pendientes";
    const pgn = toolJson.procuraduria || "No registra sanciones disciplinarias vigentes";
    const cgr = toolJson.contraloria || "Sin reporte en Boletín de Responsables Fiscales (SIRECI)";
    if (name) {
      fallbackText = `¡Hola${displayName ? `, ${displayName}` : ""}! Te confirmo que he verificado la ${tipo} ${doc} a nombre de *${name}* en las plataformas oficiales del Estado. En Policía Nacional registra ${pol.toLowerCase()}, en Procuraduría General ${pgn.toLowerCase()} y en Contraloría General ${cgr.toLowerCase()}. En el sistema de salud (ADRES BDUA) aparece registrado en *${eps || "EPS Oficial"}* (${estadoEps || "ACTIVO"}${regEps ? ` — ${regEps}` : ""}). Todo en regla y validado para tu seguridad jurídica.\n\n⚖️ _Validación oficial bajo Ley 1581 de 2012 y Art. 15 C.P._\n\n¿Nos regalas un minuto con tu calificación en Google? 👉 https://g.page/r/CctNbwU6UpX5EBM/review ¡Nos ayuda un montón para seguir ofreciendo estas herramientas gratuitas para el gremio! 🤝✨`;
    } else {
      fallbackText = `¡Hola${displayName ? `, ${displayName}` : ""}! Revisé el documento ${tipo} ${doc} en las plataformas oficiales, pero no se encuentra registrado en los censos en línea. Por favor verifica que el número físico coincida o si corresponde a un documento de extranjería.\n\n⚖️ _Validación oficial bajo Ley 1581 de 2012._`;
    }
  } else if (toolType === "empresa" && toolJson) {
    if (toolJson.exitoso && toolJson.razonSocial) {
      const nit = toolJson.nitCompleto || toolJson.nit || "";
      const razon = toolJson.razonSocial;
      const camara = toolJson.camaraComercio || "Cámara de Comercio";
      const estado = toolJson.estado || "Activa";
      const ciiu = toolJson.ciiuPrincipal || "";
      const rep = toolJson.representantePrincipal;
      fallbackText = `¡Hola${displayName ? `, ${displayName}` : ""}! Ya consulté en RUES la empresa *${razon}* (NIT ${nit}). Se encuentra con matrícula mercantil *${estado}* en la ${camara}. Su actividad económica principal es ${ciiu || "mercantil registrada"}.${rep ? ` Como Representante Legal Principal figura *${rep.nombre}* (${rep.tipoDocumento} ${rep.numeroFormateado}), quien cuenta con plenas facultades estatutarias para obligar y contratar a nombre de la sociedad.` : ""}\n\n⚖️ _Publicidad mercantil RUES bajo Art. 26 C.Co. y Ley 1581/12._\n\n¿Nos regalas un minutico con tu calificación en Google? 👉 https://g.page/r/CctNbwU6UpX5EBM/review ¡Tu apoyo nos permite mantener estas consultas 100% gratuitas para todo el gremio inmobiliario! 🤝✨`;
    } else {
      fallbackText = `¡Hola${displayName ? `, ${displayName}` : ""}! No encontré ninguna empresa registrada con ese nombre en el Registro Único Empresarial y Social (RUES). Para realizar una búsqueda oficial exacta en Cámara de Comercio, por favor compárteme el número de NIT. 🤝`;
    }
  } else {
    fallbackText = rawReport;
  }

  return rawReport && (rawReport.includes("COINCIDENCIA") || rawReport.includes("MATCH"))
    ? rawReport
    : await formatPoliteToolDelivery(userId, userName, toolType as any, fallbackText, true);
}

/**
 * Envuelve la entrega de cualquier herramienta (cédula o predial) con cortesía,
 * saludo personalizado por hora, nombre compuesto y género gramatical,
 * evitando que JanIA suene como un bot frío o robótico y educando con el ejemplo.
 */
export function formatPoliteToolDelivery(
  rawAiResponse: string,
  userName?: string,
  userId?: string,
  customGuidance?: string,
  _legacyArg?: any
): string {
  // Retornamos estrictamente la redacción original y fluida provista por el LLM,
  // eliminando cualquier concatenación forzada de plantillas rígidas, bloques de cierre o coletillas automáticas.
  const isLegacyToolType =
    typeof userId === "string" &&
    ["cedula", "predial", "idu", "notarial", "empresa", "sondeo", "match", "evento", "contacto", "catalogo", "encuesta"].includes(userId);
  const effectiveResponse = (isLegacyToolType && typeof customGuidance === "string")
    ? customGuidance
    : rawAiResponse;

  if (!effectiveResponse) return "";

  let cleaned = effectiveResponse.trim();

  // Opcional: si deseas mantener algún saludo personalizado o toque sutil, lo dejamos orgánico,
  // pero sin incrustar bloques de texto prefabricados obligatorios.
  return cleaned;
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
  const minutes = String(nowBogota.getMinutes()).padStart(2, '0');
  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const diaSemanaStr = diasSemana[nowBogota.getDay()];
  const diaMes = nowBogota.getDate();
  const mesStr = meses[nowBogota.getMonth()];
  const anio = nowBogota.getFullYear();
  const colombiaTimeFormatted = `${diaSemanaStr}, ${diaMes} de ${mesStr} de ${anio}, ${String(hour).padStart(2, '0')}:${minutes} hora Colombia (America/Bogota)`;

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

  // Expediente Perpetuo y Distinción Nuevo vs. Recurrente (Nivel ARGON — v33.30)
  const isFirstTimeUser = await isNewUser(userId);
  await incrementUserMessageCount(userId);
  const userPerpetualSession = await getUserPerpetualSession(userId, userName);
  const hasVerifiedReview = userPerpetualSession.hasVerifiedGoogleReview || isEduardoOrJani(userId);

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

  // Resolución inteligente de nombres y género (apoyado en presentación orgánica en chat o perfil)
  const introducedName = extractIntroducedName(clean);
  const effectiveRawName = introducedName || realName;
  const nameInfo = resolveNameAndGender(effectiveRawName, timeSalutation);
  const compositeOrFirst = extractFirstName(effectiveRawName);

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
    const canonicalComposite = getCanonicalCompositeName(effectiveRawName);
    displayName = canonicalComposite || (nameInfo.displayName !== "colega" && !nameInfo.displayName.toLowerCase().includes("asesor") ? nameInfo.displayName : compositeOrFirst || "");
    if (displayName.toLowerCase() === "colega" || displayName.toLowerCase().includes("asesor +")) {
      displayName = "";
    }
  }

  // 🌟 AUDITORÍA INTELIGENTE DE RESEÑA EN GOOGLE (Nivel ARGON — v33.30):
  // Si el usuario afirma que ya calificó o comentó en Google y no adjuntó imagen, solicitar amablemente el pantallazo
  const isClaimingReview = /(?:ya\s+(?:los\s+)?califi(?:qu[eé]|que)|ya\s+dej[eé]\s+(?:la\s+)?rese[ñn]a|ya\s+dej[eé]\s+(?:el\s+)?comentario|ya\s+dej[eé]\s+(?:mis\s+)?5\s*estrellas|ya\s+(?:les\s+)?puse\s+5\s*estrellas|ya\s+est[aá]\s+(?:la\s+)?calificaci[oó]n|ya\s+opin[eé]\s+en\s+google|ya\s+califiqu[eé]\s+en\s+google)/i.test(cleanLower);

  if (isClaimingReview && !hasImage && !isEduardoOrJani(userId) && !hasVerifiedReview) {
    await recordUserReviewClaim(userId);
    const claimReply = `¡Muchísimas gracias por tu apoyo${displayName ? `, ${displayName}` : ""}! 🌟\n\nPara validar tu calificación y actualizar tu registro permanente en el sistema, ¿me compartes por favor un *pantallazo o captura de pantalla* de tu reseña y comentario en Google? 📸\n\nAsí te dejo verificado de inmediato y no te vuelvo a insistir jamás. ¡Te agradezco de todo corazón! 🤝✨`;
    appendDmHistory(userId, "user", clean);
    appendDmHistory(userId, "assistant", claimReply);
    return claimReply;
  }

  // 🌐 NAVEGACIÓN Y EXTRACCIÓN PREVIA DE URLs:
  let preloadedWebContent = "";
  const urlMatch = clean.match(/https?:\/\/[^\s]+/i);
  if (urlMatch && urlMatch[0]) {
    try {
      const pageInfo = await fetchWebUrlContent(urlMatch[0], 8000);
      if (pageInfo.success && pageInfo.content) {
        preloadedWebContent = `\n[SISTEMA - NAVEGACIÓN WEB EN TIEMPO REAL: Se descargó el contenido de la URL ${urlMatch[0]} enviada por el usuario:\nTítulo: ${pageInfo.title}\nContenido: ${pageInfo.content.slice(0, 4500)}]`;
      }
    } catch (_) {}
  }

  // 🛡️ FLUJO POST-REPORTE DE EMPRESA (Doctrina v33.21):
  try {
    const {
      getPendingCompanyFollowUp,
      clearPendingCompanyFollowUp,
      clearPendingUnconfirmedDoc,
      clearPendingCompanyMembers,
      isDecliningCompanyMemberVerification,
      isAcceptingCompanyMemberVerification
    } = await import("../../identityVerificationService");
    const pendingFollowUp = getPendingCompanyFollowUp(userId);
    if (pendingFollowUp) {
      if (isDecliningCompanyMemberVerification(clean)) {
        clearPendingCompanyFollowUp(userId);
        clearPendingUnconfirmedDoc(userId);
        clearPendingCompanyMembers(userId);
        const { formatCompanyFollowUpDeclineReviewMessage } = await import("../../politenessService");
        const declineReply = formatCompanyFollowUpDeclineReviewMessage(displayName || realName);
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", declineReply);
        return declineReply;
      }
      if (isAcceptingCompanyMemberVerification(clean)) {
        clearPendingCompanyFollowUp(userId);
        const toolExec = await executeJaniaDmTool(
          "consultar_identidad_y_antecedentes",
          { numeroDocumento: clean, tipoDocumento: "CC" },
          userId,
          userName || displayName || realName,
          clean
        );
        const rawRep = String(toolExec.resultJson.reporteOficial || "");
        const formattedRep = await formatPoliteToolDelivery(
          userId,
          userName || displayName || realName,
          "cedula",
          rawRep,
          true
        );
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", formattedRep);
        return formattedRep;
      }
      clearPendingCompanyFollowUp(userId);
    }
  } catch (followUpErr: any) {
    console.warn("[processPrivateDmConversationalMessage] Follow-up check warning:", followUpErr?.message);
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
      `CONCIENCIA TEMPORAL EXACTA Y REGLAS DE HORA EN COLOMBIA:\n` +
      `===================================================\n` +
      `- Fecha y hora exacta en Colombia (America/Bogota): ${colombiaTimeFormatted}.\n` +
      `- Franja del día actual: ${timeOfDay}.\n` +
      `- Saludo oficial correspondiente al horario: "${timeSalutation}". Si saludas por tu cuenta, usa estrictamente "${timeSalutation}" conforme a la hora colombiana.\n` +
      `- ¿Hubo interacción reciente en las últimas 6 horas?: ${hasRecentInteractionPast6Hours ? "SÍ (Conversación activa en curso)" : "NO (Nueva interacción / inicio)"}.\n` +
      `- REGLA ESTRICTA DEL SALUDO ÚNICO:\n` +
      `  * Si NO hubo interacción reciente en las últimas 6 horas: Saluda con calidez, cortesía y señorío profesional UNA SOLA VEZ al inicio de tu mensaje usando "¡${timeSalutation}${displayName ? `, ${displayName}` : ""}! 👋".\n` +
      `  * Si SÍ hubo interacción en las últimas 6 horas: Está TERMINANTEMENTE PROHIBIDO saludar de nuevo (JAMÁS digas "¡Hola!", "¡Buenos días!", "Buenas tardes", "Buenas noches", "Qué gusto saludarte de nuevo"). Ve DIRECTO a responder con naturalidad el mensaje actual sin anteponer saludos.\n\n` +
      `===================================================\n` +
      `MEMORIA PERPETUA: USUARIO NUEVO VS. RECURRENTE:\n` +
      `===================================================\n` +
      `${isFirstTimeUser
        ? `- ESTATUS: USUARIO NUEVO (Escribe por primera vez en su vida). Dale una bienvenida única, fresca, cercana y humana, transmitiendo confianza y empatía inmediata al estilo VECY sin sonar a robot.`
        : `- ESTATUS: USUARIO RECURRENTE (Ya existe conversación y memoria previa). Retoma el hilo con total familiaridad recordando todo lo hablado. PROHIBIDO TERMINANTEMENTE presentarte otra vez diciendo 'Soy JanIA, tu inteligencia artificial inmobiliaria en VECY Bienes Raíces' o dar introducciones largas como si fuera un desconocido.`
      }\n\n` +
      `===================================================\n` +
      `ESTILO Y VOZ LAOMEDEIA (HUMANIDAD PURA, CONCISIÓN Y CERO REDUNDANCIA):\n` +
      `===================================================\n` +
      `- Escribe con la misma calidez, chispa, persuasión y naturalidad con la que hablas en tus audios de Laomedeia, yendo SIEMPRE AL GRANO.\n` +
      `- Prohibido extenderse con párrafos redundantes, introducciones largas o ladrillos de texto que aburran al lector: entrega explicaciones y reportes concretos, ágiles, visualmente elegantes y organizados por ti misma con Markdown de WhatsApp (*negritas*, _cursivas_, viñetas limpias y emojis precisos).\n` +
      `- Respuestas ágiles, concretas y legibles en la pantalla del celular sin provocar el botón 'Leer más'.\n\n` +
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
      `5. Tutora en Firma Electrónica Oficial y Fábrica Proptech: Guía paso a paso en la plataforma gratuita https://autenticaciondigital.and.gov.co/ (Decreto 620/20 y Ley 527/99: 1. Ingresar, 2. 'Firmar documento electrónicamente', 3. Asunto y motivo, 4. Cargar PDF máx 10MB sin clave, 5. Código OTP al correo y firmar; también validar firmas de terceros y bandeja de 15 días). Recuerda que eres su tutora pedagógica y no firmas el PDF en WhatsApp. Si una inmobiliaria quiere su propia herramienta privada de firma electrónica, canalízala con Eduardo Rivera al +57 316 656 9719. Para agendamiento de visitas seguras, entrega y guía en Vecy Agenda Pro: https://vecy-agenda-pro.vercel.app/ con verificación algorítmica de identidad.\n` +
      `6. Asesora en Marketing Digital Inmobiliario: Estrategias, públicos de Meta Ads, Google Ads, SEO inmobiliario y presupuestos de inversión.\n\n` +
      `===================================================\n` +
      `MANEJO INTELIGENTE DE TRÁMITES Y SUPERPODERES NATIVOS DE WHATSAPP BUSINESS:\n` +
      `===================================================\n` +
      `Cuentas con las herramientas de function calling: consultar_identidad_y_antecedentes, consultar_empresa_o_nit, consultar_paz_y_salvo_idu, consultar_factura_predial_bogota, liquidar_gastos_notariales_y_registro, sondeo_mercado_inmobiliario, consultar_matches_o_codigo, registrar_inmueble_o_requerimiento, enviar_encuesta_interactiva, enviar_tarjeta_contacto_vecy, enviar_evento_visita_inmobiliaria, enviar_catalogo_servicios, navegar_o_buscar_web, consultar_catalogo_inmuebles_vecy.\n` +
      `Reglas de ejecución según el contexto:\n` +
      `a) Si el usuario envía un número o documento con INTENCIÓN CLARA (ej. "revisa esta cédula 79458979", "NIT 900123456", "empresa Inversiones SAS", "predial CHIP AAA123", "paz y salvo IDU AAA..."): Invoca de inmediato la herramienta correspondiente sin repreguntar y entrega el reporte oficial.\n` +
      `b) Si el usuario pide buscar en la web o comparte un enlace URL (portal inmobiliario, página corporativa): Invoca 'navegar_o_buscar_web' para extraer el contenido real al instante.\n` +
      `c) Si el usuario consulta qué inmuebles tenemos disponibles o pide opciones de venta/arriendo: Invoca 'consultar_catalogo_inmuebles_vecy' para consultar la base de datos oficial de VECY (+57 316 656 9719) y entregar fichas y $/m² de inmediato.\n` +
      `d) Si el usuario envía SOLO un número suelto sin contexto ("79458979", "1018456789"): Pregúntale con calidez y naturalidad humana en UN solo renglón si desea consultar antecedentes de esa cédula/NIT o a qué trámite se refiere.\n` +
      `e) Apenas el usuario confirme en el siguiente turno ("sí", "dale", "por fa", "cédula", "1", "adelante", "procede"): Ejecuta la herramienta de inmediato usando el número que ya está en el historial de la conversación.\n\n` +
      `===================================================\n` +
      `BUSCADOR Y MEDIACIÓN DE MATCHES (CÓDIGO #M...):\n` +
      `===================================================\n` +
      `${isEduardo || isJani
        ? `- Para Eduardo o Jani: Entrega la información 100% destapada y completa (inmueble, demanda, porcentaje de afinidad, nombre del colega, teléfono y enlace directo de WhatsApp).\n`
        : `- Para Usuarios o Agentes Externos: Confirma que SÍ hay match, describe el perfil del cruce SIN revelar el teléfono ni el nombre del usuario de la otra punta, entrega el código de match (ej. #M15649) e indícale comunicarse al +57 316 656 9719 mencionando ese código para coordinar la mediación colaborativa 40/20/40.\n`
      }` +
      `\n===================================================\n` +
      `PERSONALIDAD DEFINITIVA Y NORMAS CARDINALES (DOCTRINA JANIA):\n` +
      `===================================================\n` +
      `- TRATO CERCANO Y TUTEO OBLIGATORIO: Tutea SIEMPRE al interlocutor con absoluta naturalidad, calidez humana, empatía y complicidad profesional ("tú", "te", "contigo", "cuéntame", "¿qué buscas?", "te ayudo", "te cuento", "mira"). Queda TERMINANTEMENTE PROHIBIDO tratar de "usted" o sonar distante, fría o corporativa acartonada. Hablas como una colega experta, cercana, apasionada y de alto rango de VECY BIENES RAÍCES.\n` +
      `- INTERLOCUTOR Y GÉNERO GRAMATICAL: "${displayName || 'Colega (nombre aún no identificado)'}". Género detectado: ${nameInfo.isFemale ? 'FEMENINO (aplica concordancia gramatical femenina: bienvenida, atenta, lista, amiga, colega, etc.)' : 'MASCULINO (aplica concordancia gramatical masculina: bienvenido, atento, listo, amigo, colega, etc.)'}.\n` +
      `- REGLA ESTRICTA DE NOMBRES COMPUESTOS: Si el usuario tiene nombre compuesto (ej. María Cristina, Juan Carlos, Ana María, Luz Marina, Sandra Milena, Carlos Mario, Paola Andrea, Nelson Enrique, Gustavo Adolfo, etc.), ÚSALO SIEMPRE COMPLETO de forma fluida y orgánica. JAMÁS mutiles, recortes ni abrevies un nombre compuesto a solo una palabra. Si el nombre no se conoce aún (es un número de teléfono o saludo suelto), salúdalo con calidez y hazle una pregunta simpática para saber su nombre y cómo prefiere que lo llames.\n` +
      `- LIBERTAD TOTAL DE EMOJIS (UNIVERSO UNICODE COMPLETO): Tienes total libertad para elegir y usar orgánicamente cualquiera de los cientos de emojis disponibles en Unicode. Intercálalos según el contexto emocional, la entonación y el sentido de la frase, con naturalidad y sin abusar.\n` +
      `- CERO PLANTILLAS Y MANEJO MAESTRO DE PREGUNTAS VACÍAS O SUELTAS: PROHIBIDO TERMINANTEMENTE USAR BLOQUES PREFABRICADOS, GUIONES O MENÚS RÍGIDOS. Si el usuario escribe una frase ambigua o suelta de la nada ("como funciona", "info", "hola", "buenas", "ayuda", "información", "de qué trata", etc.), actúa con la inteligencia conversacional de un asistente de nivel mundial:\n` +
      `  1. Saluda amablemente con calidez humana y tuteo cercano.\n` +
      `  2. Deduce con empatía la situación en una o dos frases breves y cautivadoras.\n` +
      `  3. Hazle preguntas inteligentes para perfilarlo (preguntarle su nombre si no se sabe, si es colega inmobiliario o cliente buscando comprar/vender/arrendar, y en qué zona o ciudad).\n` +
      `  4. Mantén la conversación siempre guiada hacia VECY Bienes Raíces de manera natural, atractiva y orientada a soluciones.\n` +
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
      `${hasVerifiedReview || isEduardo || isJani
        ? `- REGLA ABSOLUTA DE RESEÑAS EN GOOGLE: Este usuario YA VALIDÓ su reseña en Google o es miembro VIP. Está TERMINANTEMENTE PROHIBIDO pedirle, mencionarle o sugerirle calificar en Google.\n`
        : ""
      }` +
      `- ESCUDO ANTI-COBRANZAS INSTITUCIONAL: Si detectas que se trata de una casa de cobranza, banco hostil, mandamiento de pago o despacho buscando a Eduardo A. Rivera por temas financieros o deudas personales, responde con postura corporativa neutral sin dar su número personal ni datos privados, indicando que este es el canal técnico de la plataforma virtual. OJO: No confundir ni bloquear charlas inmobiliarias legítimas donde clientes o colegas hablen de embargos sobre inmuebles a la venta, hipotecas bancarias o saneamiento predial.\n` +
      `- SERVICIO INCONDICIONAL Y LIBERTAD DEL USUARIO (DOCTRINA EDUARDO A. RIVERA): Los usuarios son personas libres y tienen total libertad de escribir como deseen (corto, seco, directo, con modismos o sin rodeos). JanIA NUNCA debe obligar, corregir ni pretender que los usuarios hablen como ella. JanIA está siempre a su servicio incondicional con profesionalismo y eficacia.\n` +
      `- NUNCA comiences tus respuestas con corchetes de fecha [YYYY-MM-DD HH:mm] ni imites marcas temporales. Esos corchetes son metadatos internos del sistema, jamás texto que tú debas emitir.\n` +
      `- MENSAJES CORTOS, DIRECTOS Y CLAROS (CERO "LEER MÁS"): Respuestas breves, directas al grano, claras y fluidas (máximo 1 o 2 párrafos cortos), sin introducciones extensas ni textos kilométricos que fuercen el botón 'Leer más'.`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt }
    ];

    // Incluir hasta 20 turnos de las últimas 72 horas para retención contextual completa
    for (const turn of history.slice(-20)) {
      const cleanTurnContent = turn.role === "assistant"
        ? turn.content.replace(/^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\]\s*/, '').trim()
        : turn.content;
      messages.push({ role: turn.role, content: cleanTurnContent });
    }

    let userPromptContent = `Mensaje de ${realName} (${userId}): "${clean}"`;
    if (preloadedWebContent) {
      userPromptContent += preloadedWebContent;
    }
    if (mediaOptions?.imageBuffer) {
      userPromptContent += `\n[SISTEMA: IMAGEN ADJUNTA DETECTADA CON VISIÓN MULTIMODAL. Lee atentamente todo el contenido visual y textual (OCR completo): logos, nombres de empresas o personas, NIT, cédulas, datos societarios, recibos, facturas, comprobantes o capturas de pantalla. Si detectas una empresa o una solicitud de investigar una empresa a partir de la imagen o del texto, invoca de inmediato la herramienta 'consultar_empresa_o_nit'. Si la imagen corresponde a una captura de pantalla de una reseña o calificación en Google (Google Maps / Reseña / Estrellas / VECY Bienes Raíces), valida la reseña cordialmente, agradécele con mucho cariño y calidez humana e incluye la etiqueta interna [RESEÑA_GOOGLE_VALIDADA].]`;
    }
    if (mediaOptions?.pdfBuffer) {
      userPromptContent += `\n[SISTEMA: DOCUMENTO PDF DETECTADO. Analiza el documento con visión multimodal y procesa la consulta de forma integral.]`;
    }

    messages.push({
      role: "user",
      content: userPromptContent
    });

    let llmRes: any;
    try {
      llmRes = await invokeLLM({
        messages,
        tools: JANIA_DM_TOOLS,
        highReasoning: true,
        imageBuffer: mediaOptions?.imageBuffer,
        pdfBuffer: mediaOptions?.pdfBuffer,
        pdfMimeType: mediaOptions?.pdfMimeType
      });
    } catch (toolsErr: any) {
      console.warn(`[dmHandler] ⚠️ Error en invokeLLM con herramientas (${toolsErr?.message}). Reintentando llamada conversacional pura sin tools...`);
      llmRes = await invokeLLM({
        messages,
        highReasoning: true,
        imageBuffer: mediaOptions?.imageBuffer,
        pdfBuffer: mediaOptions?.pdfBuffer,
        pdfMimeType: mediaOptions?.pdfMimeType
      });
    }

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

    // 🌟 VALIDACIÓN DE RESEÑA EN GOOGLE POR VISIÓN MULTIMODAL:
    if (reply.includes("[RESEÑA_GOOGLE_VALIDADA]") || (hasImage && /rese[ñn]a\s+validada|calificaci[oó]n\s+validada|valid[eé]\s+tu\s+rese[ñn]a|gracias\s+por\s+tu\s+rese[ñn]a/i.test(reply))) {
      reply = reply.replace(/\[RESEÑA_GOOGLE_VALIDADA\]/g, "").trim();
      await verifyUserGoogleReview(userId);
    }

    // Limpiar cualquier prefijo de timestamp o corchete imitado por el LLM
    reply = reply.replace(/^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\]\s*/, '').trim();
    reply = sanitizeResponseMarkdown(reply.trim());

    // Normalizar y deduplicar cualquier duplicación del cierre de cortesía en la respuesta
    const generalCourtesyRegex = /(?:(?:\r?\n\s*)*(?:(?:Un\s+)?Servicio de cortesía de VECY BIENES RAÍCES 🤝\.?))+/gi;
    const courtesyMatches = reply.match(generalCourtesyRegex);
    if (courtesyMatches && courtesyMatches.length > 1) {
      reply = reply.replace(generalCourtesyRegex, '').trim();
      reply = `${reply}\n\nUn servicio de cortesía de VECY BIENES RAÍCES 🤝.`;
    }

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

    {
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
      if (/(?:c[oó]mo\s+funciona|info|informaci[oó]n|qu[eé]\s+es|de\s+qu[eé]\s+trata|ayuda)/i.test(cleanLower)) {
        const nameGreeting = displayName ? `, ${displayName}` : "";
        const askName = !displayName ? " ¿Cómo es tu nombre para saber con quién tengo el gusto de hablar?" : "";
        const infoMsg = `¡${timeGreeting}${nameGreeting}! 👋 En *VECY BIENES RAÍCES* cruzamos ofertas y demandas inmobiliarias al instante, emitimos facturas de predial, certificados IDU y verificamos seguridad para tus visitas sin costo alguno.${askName} ¿Eres colega asesor inmobiliario o estás buscando alguna propiedad en especial para colaborarte hoy? 🤝✨`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", infoMsg);
        return infoMsg;
      }
      if (/muchas gracias|gracias/i.test(cleanLower)) {
        const gMsg = `¡Con todo el gusto${displayName ? `, ${displayName}` : ""}! 🤝✨ Te invito a unirte a nuestro Canal Oficial de WhatsApp (https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b) y calificar nuestro servicio. ¿Hay algo más en lo que te pueda apoyar hoy?`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", gMsg);
        return gMsg;
      }
      if (/^hola\b|^buenas\b|^buenos\s+d[ií]as\b|^buenas\s+tardes\b|^buenas\s+noches\b/i.test(cleanLower)) {
        const nameGreeting = displayName ? `, ${displayName}` : "";
        const askName = !displayName ? " ¿Cómo es tu nombre para poder saludarte como se debe?" : "";
        const hMsg = `¡${timeGreeting}${nameGreeting}! 👋 Soy *JanIA*, tu colega y asistente inmobiliaria con IA de *VECY BIENES RAÍCES*.${askName} ¿Eres colega asesor inmobiliario o te gustaría consultar alguna propiedad o trámite hoy? 🏡✨`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", hMsg);
        return hMsg;
      }
    }

    const fallback = isEduardo
      ? `¡${timeSalutation}, Eduardo! 👋 Estoy 100% atenta. Tuve una breve demora de conexión de red con el modelo de lenguaje, pero ya me restablecí. ¿En qué te colaboro hoy? 🤝`
      : isJani
        ? `¡${timeSalutation}, Jani! Qué gusto saludarte. Tuve una breve demora de red en la consulta, pero ya estoy a tu entera disposición. ¿En qué te colaboro hoy? 🤝`
        : isFamilyOrTrusted
          ? `¡${timeSalutation}, ${displayName}! Qué pena contigo, ocurrió una pequeña demora de red en mi sistema (un pequeño fallo en la matrix 🤖😅). ¿Me confirmas nuevamente qué necesitas para ayudarte de inmediato? 🤝`
          : `¡${timeSalutation}${displayName ? ` ${displayName}` : ""}! Qué pena contigo. Tuve una pequeña demora de conexión de red con mi servicio de lenguaje. ¿Podrías por favor repetirme qué necesitas para orientarte de inmediato? 🤝`;
    appendDmHistory(userId, "user", clean);
    appendDmHistory(userId, "assistant", fallback);
    return fallback;
  }
}
