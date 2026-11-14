import { JanIAResult } from "../types";
import {
  resolveRealName,
  checkAlreadyGreeted,
  getCirculoHistory,
  appendCirculoHistory,
  markUserGreetedToday,
  persistIntroducedNameInSession,
  detectUserBusinessRoleFromText,
  setUserBusinessRole,
  isEduardoOrJani,
} from "../sessionManager";
import {
  extractFirstName,
  parseSafeJSON,
  sanitizeResponseMarkdown,
  getGreetingByTime,
  getColombiaDateTimeContext,
} from "../parsers";
import { checkStrictOffTopic } from "../heuristics";
import { resolveNameAndGender } from "../../nameAndGenderResolver";
import { invokeLLM, classifyLlmReasoningComplexity } from "../../llm";
import { JANIA_ARGON_COGNITIVE_CORE } from "../prompts";
import { stripLeadingGreetingsAndCourtesies, extractAcmAttributesFromText } from "./dmHandler";
import {
  appendGroupSatisfactionClosing,
  isExplicitGroupAcmRequest,
  isExplicitGroupMarketingAuditRequest,
} from "./consultingHandler";
import { executeMarketValuationSurvey } from "../../valuation";
import { auditPropertyListing, buildRealEstateIcp } from "../../realEstateMarketing";
import { extractStickerTagFromReply, getJaniaStickerByKey } from "../stickerService";
import { executeIduAssistanceFromWhatsApp, isIduInquiry, hasPendingIduSession } from "../../iduValorizacionService";
import {
  executeIdentityVerificationFromWhatsApp,
  extractAllCedulasForVerification,
  getPendingCedulaSession,
  isExplicitCompanyRuesQuery,
} from "../../identityVerificationService";
import {
  executeNotarialAssistanceFromWhatsApp,
  isExplicitNotarialLiquidationRequest,
} from "../../notarialExpenseService";
import { analyzeCtlFromWhatsAppInput, hasCtlTextMarkers, isExplicitCtlStudyRequest } from "../../ctlTitleStudyService";
import { analyzePotUrbanNormFromWhatsAppInput, isPotUrbanNormRequest } from "../../potUrbanNormService";
import { analyzeFinancialAndTaxFromWhatsAppInput, isFinancialOrTaxSimulationRequest } from "../../financialAndTaxRealEstateService";
import { analyzeContractOrMinutaFromWhatsAppInput, hasContractDraftMarkers, isContractMinutaOrAuditRequest } from "../../legalContractService";
import { analyzePropiedadHorizontalFromWhatsAppInput, hasPhDocumentMarkers, isPropiedadHorizontalRequest } from "../../propiedadHorizontalService";



export async function processCirculoMessage(
  text: string,
  userId: string,
  userName?: string,
  imageBuffer?: string,
  pdfBuffer?: string,
  pdfMimeType?: string,
  quotedContext?: string
): Promise<JanIAResult> {
  try {
    const rawPhone = userId.split('@')[0];
    const realName = await resolveRealName(userId, userName);
    if (!isEduardoOrJani(userId)) {
      const detectedCirculoRole = detectUserBusinessRoleFromText(text);
      if (detectedCirculoRole) {
        await setUserBusinessRole(userId, detectedCirculoRole, { sourceText: text }).catch(() => {});
      }
    }
    const persistedCirculoName = await persistIntroducedNameInSession(userId, text, realName);
    const effectiveCirculoName = persistedCirculoName.effectiveRawName || realName;
    const firstName = extractFirstName(effectiveCirculoName);
    const cleanFirstName = firstName && !["hola", "buenas", "buenos", "asesor", "colega"].includes(firstName.toLowerCase()) ? firstName : "";
    const userGreetingName = cleanFirstName ? ` ${cleanFirstName}` : "";

    // Intercepción estricta de mensajes OFF-TOPIC prohibidos (Política, Religión, Cursos, Links ajenos, Memes, Spam)
    const strictOffTopic = checkStrictOffTopic(text);
    if (strictOffTopic.isOffTopic) {
      console.log(`[JanIA-Circulo-OffTopic] Mensaje prohibido en Proyecto VECY BIENES RAÍCES para ${userId}: "${text.substring(0, 50)}...". (${strictOffTopic.reason})`);
      const targetUserGreeting = cleanFirstName || "colega";
      const warningText = `Hola ${targetUserGreeting} 👋🏻. El contenido relacionado con ${strictOffTopic.reason} está estrictamente prohibido en nuestra comunidad de VECY BIENES RAÍCES. 🚫\n\nNuestros canales son 100% profesionales y dedicados exclusivamente a la tecnología, comisiones y el modelo colaborativo inmobiliario. ¡Te invitamos cordialmente a eliminar este mensaje de inmediato! 🤝`;
      return {
        classification: "VIOLACION_DE_NORMAS",
        response: warningText,
        dmResponse: warningText,
        reactionEmoji: "🚫"
      };
    }

    const alreadyGreeted = await checkAlreadyGreeted(userId);

    // 🤝 INTERCEPTOR GUÍA DE SERVICIOS (PREDIAL / CÉDULA)
    const { isServiceHelpRequest, PREDIAL_HELP_TEXT, CEDULA_HELP_TEXT } = await import('../../predialService');
    const helpType = isServiceHelpRequest(text);
    if (helpType === 'predial') {
      return {
        classification: "CONSULTA_GENERAL",
        response: PREDIAL_HELP_TEXT,
        reactionEmoji: "🏛️",
        wantsVoice: false,
        voiceResponse: ""
      };
    }
    if (helpType === 'cedula') {
      return {
        classification: "CONSULTA_GENERAL",
        response: CEDULA_HELP_TEXT,
        reactionEmoji: "🪪",
        wantsVoice: false,
        voiceResponse: ""
      };
    }

    // ⚖️ INTERCEPTOR PRIORITARIO: ESTUDIO DE TÍTULOS SNR + PDF MEMBRETADO (v34.13 — ANTES DE IDU/PREDIAL POR CHIP/MATRÍCULA)
    const ctlCirculoText =
      quotedContext && hasCtlTextMarkers(quotedContext) && !hasCtlTextMarkers(text)
        ? `${text}\n${quotedContext}`
        : text;
    if (
      Boolean(pdfBuffer) ||
      Boolean(imageBuffer) ||
      hasCtlTextMarkers(ctlCirculoText) ||
      isExplicitCtlStudyRequest(text)
    ) {
      const ctlCirculoCheck = await analyzeCtlFromWhatsAppInput({
        text: ctlCirculoText,
        imageBuffer,
        pdfBuffer,
        pdfMimeType,
        requesterName: cleanFirstName || realName || undefined
      });
      if (ctlCirculoCheck.isCtlDocument && ctlCirculoCheck.report) {
        return {
          classification: "CONSULTA_GENERAL",
          response: appendGroupSatisfactionClosing(ctlCirculoCheck.report.whatsappSummary),
          reactionEmoji: ctlCirculoCheck.report.verdictEmoji,
          wantsVoice: false,
          voiceResponse: "",
          document: ctlCirculoCheck.pdfBuffer,
          fileName: ctlCirculoCheck.pdfFileName
        };
      }
      if (ctlCirculoCheck.needsMediaGuidance && ctlCirculoCheck.responseText) {
        return {
          classification: "CONSULTA_GENERAL",
          response: ctlCirculoCheck.responseText,
          reactionEmoji: ctlCirculoCheck.reactionEmoji,
          wantsVoice: false,
          voiceResponse: ""
        };
      }
    }

    // 📐 INTERCEPTOR DIRECTO 0.6: ANÁLISIS POT & NORMA URBANA BOGOTÁ (SINUPOT / IDECA / DTO. 555/2021) + PDF MEMBRETADO
    if (isPotUrbanNormRequest(text)) {
      const potCirculoCheck = await analyzePotUrbanNormFromWhatsAppInput({
        text,
        requesterName: firstName || undefined
      });
      if (potCirculoCheck.isPotRequest && potCirculoCheck.report) {
        return {
          classification: "CONSULTA_GENERAL",
          response: appendGroupSatisfactionClosing(potCirculoCheck.responseText),
          reactionEmoji: potCirculoCheck.reactionEmoji,
          wantsVoice: false,
          voiceResponse: "",
          document: potCirculoCheck.pdfBuffer,
          fileName: potCirculoCheck.pdfFileName
        };
      }
      if (potCirculoCheck.needsPredioGuidance && potCirculoCheck.responseText) {
        return {
          classification: "CONSULTA_GENERAL",
          response: potCirculoCheck.responseText,
          reactionEmoji: potCirculoCheck.reactionEmoji,
          wantsVoice: false,
          voiceResponse: ""
        };
      }
    }

    // 💳 INTERCEPTOR DIRECTO 0.7: SIMULADOR HIPOTECARIO, LEASING, CAP RATE / ROI Y PRE-LIQUIDACIÓN TRIBUTARIA + PDF MEMBRETADO
    if (isFinancialOrTaxSimulationRequest(text)) {
      const finCirculoCheck = await analyzeFinancialAndTaxFromWhatsAppInput({
        text,
        requesterName: firstName || undefined,
        generatePdf: true
      });
      if (finCirculoCheck.isFinancialTaxRequest && finCirculoCheck.report) {
        return {
          classification: "CONSULTA_GENERAL",
          response: appendGroupSatisfactionClosing(finCirculoCheck.responseText),
          reactionEmoji: finCirculoCheck.reactionEmoji,
          wantsVoice: false,
          voiceResponse: "",
          document: finCirculoCheck.pdfBuffer,
          fileName: finCirculoCheck.pdfFileName
        };
      }
      if (finCirculoCheck.needsDataGuidance && finCirculoCheck.responseText) {
        return {
          classification: "CONSULTA_GENERAL",
          response: finCirculoCheck.responseText,
          reactionEmoji: finCirculoCheck.reactionEmoji,
          wantsVoice: false,
          voiceResponse: ""
        };
      }
    }

    // 📑 INTERCEPTOR DIRECTO 0.8: MINUTAS JURÍDICAS PERSONALIZADAS Y AUDITORÍA CONTRACTUAL + PDF MEMBRETADO (v34.16)
    const contractCirculoInputText =
      quotedContext && hasContractDraftMarkers(quotedContext) && !hasContractDraftMarkers(text)
        ? `${text}\n${quotedContext}`
        : text;
    if (
      isContractMinutaOrAuditRequest(contractCirculoInputText, Boolean(imageBuffer || pdfBuffer)) ||
      hasContractDraftMarkers(contractCirculoInputText)
    ) {
      const contractCirculoCheck = await analyzeContractOrMinutaFromWhatsAppInput({
        text: contractCirculoInputText,
        imageBuffer,
        pdfBuffer,
        pdfMimeType,
        requesterName: cleanFirstName || realName || undefined
      });
      if (contractCirculoCheck.handled && contractCirculoCheck.whatsappReply) {
        return {
          classification: "CONSULTA_GENERAL",
          response:
            contractCirculoCheck.mode === "guidance"
              ? contractCirculoCheck.whatsappReply
              : appendGroupSatisfactionClosing(contractCirculoCheck.whatsappReply),
          reactionEmoji: contractCirculoCheck.reactionEmoji,
          wantsVoice: false,
          voiceResponse: "",
          document: contractCirculoCheck.pdfResult?.pdfBuffer,
          fileName: contractCirculoCheck.pdfResult?.fileName
        };
      }
    }

    // 🏢 INTERCEPTOR DIRECTO 0.9: PROPIEDAD HORIZONTAL (LEY 675), AUDITORÍA RPH/ACTAS, RNT/AIRBNB Y SUBDIVISIÓN/ENGLOBE + PDF MEMBRETADO (v34.17)
    const phCirculoInputText =
      quotedContext && hasPhDocumentMarkers(quotedContext) && !hasPhDocumentMarkers(text)
        ? `${text}\n${quotedContext}`
        : text;
    if (
      isPropiedadHorizontalRequest(phCirculoInputText, Boolean(imageBuffer || pdfBuffer)) ||
      hasPhDocumentMarkers(phCirculoInputText)
    ) {
      const phCirculoCheck = await analyzePropiedadHorizontalFromWhatsAppInput({
        text: phCirculoInputText,
        imageBuffer,
        pdfBuffer,
        pdfMimeType,
        requesterName: cleanFirstName || realName || undefined
      });
      if (phCirculoCheck.handled && phCirculoCheck.whatsappReply) {
        return {
          classification: "CONSULTA_GENERAL",
          response:
            phCirculoCheck.mode === "guidance"
              ? phCirculoCheck.whatsappReply
              : appendGroupSatisfactionClosing(phCirculoCheck.whatsappReply),
          reactionEmoji: phCirculoCheck.reactionEmoji,
          wantsVoice: false,
          voiceResponse: "",
          document: phCirculoCheck.pdfResult?.pdfBuffer,
          fileName: phCirculoCheck.pdfResult?.fileName
        };
      }
    }

    // 🏛️ INTERCEPTOR DIRECTO 1: PAZ Y SALVO IDU BOGOTÁ + PDF OFICIAL (PRIORIDAD SOBRE PREDIAL)
    if (isIduInquiry(text) || hasPendingIduSession(userId)) {
      const iduCheck = await executeIduAssistanceFromWhatsApp(text, userId, false);
      if (iduCheck.isIduRequest && iduCheck.reportText) {
        return {
          classification: "CONSULTA_GENERAL",
          response: appendGroupSatisfactionClosing(iduCheck.reportText),
          reactionEmoji: "📄",
          wantsVoice: false,
          voiceResponse: "",
          document: iduCheck.pdfBuffer,
          fileName: iduCheck.pdfFileName,
        };
      }
    }

    // 🏛️ INTERCEPTOR DIRECTO 2: ASISTENCIA Y GESTIÓN DE PREDIALES BOGOTÁ (CHIP + CÉDULA/NIT)
    const { executePredialAssistanceFromWhatsApp } = await import('../../predialService');
    const predialCheck = await executePredialAssistanceFromWhatsApp(text, userId, false);
    if (predialCheck.isPredialRequest && predialCheck.reportText) {
      console.log(`[JanIA-Circulo-PredialCheck] Asistencia de predial Bogotá ejecutada para ${userId} (CHIP: ${predialCheck.chip || 'General'}): isPredialRequest=true`);
      return {
        classification: "CONSULTA_GENERAL",
        response: appendGroupSatisfactionClosing(predialCheck.reportText),
        reactionEmoji: "📄",
        wantsVoice: false,
        voiceResponse: "",
        document: predialCheck.pdfBuffer,
        fileName: predialCheck.pdfFileName
      };
    }

    // 🛡️ INTERCEPTOR DIRECTO 3: VERIFICACIÓN OFICIAL DE CÉDULA Y EMPRESAS RUES
    const circuloIdItems = extractAllCedulasForVerification(text, false);
    if (circuloIdItems.length > 0 || isExplicitCompanyRuesQuery(text) || Boolean(getPendingCedulaSession(userId))) {
      const idCheck = await executeIdentityVerificationFromWhatsApp(
        text,
        false,
        userId,
        circuloIdItems.length > 0 ? circuloIdItems : undefined
      );
      if (idCheck.isVerificationRequest && idCheck.reportText) {
        console.log(`[JanIA-Circulo-IdentityCheck] Verificación de identidad ejecutada para ${userId} (${idCheck.tipoDoc}: ${idCheck.cedula}): success=${idCheck.success}`);
        return {
          classification: "CONSULTA_GENERAL",
          response: appendGroupSatisfactionClosing(idCheck.reportText),
          reactionEmoji: idCheck.success ? "🛡️" : "⚠️",
          wantsVoice: false,
          voiceResponse: ""
        };
      }
    }

    // ⚖️ INTERCEPTOR DIRECTO 4: LIQUIDACIÓN EXACTA DE GASTOS NOTARIALES Y REGISTRO
    if (isExplicitNotarialLiquidationRequest(text, userId)) {
      const notarialCheck = await executeNotarialAssistanceFromWhatsApp(text, userId, false);
      if (notarialCheck.isNotarialRequest && notarialCheck.reportText) {
        return {
          classification: "CONSULTA_GENERAL",
          response: appendGroupSatisfactionClosing(notarialCheck.reportText),
          reactionEmoji: "⚖️",
          wantsVoice: false,
          voiceResponse: ""
        };
      }
    }

    // 📊 INTERCEPTOR DIRECTO 5: SONDEO TÉCNICO DE MERCADO (ACM / FITTO Y CORVINI / RURAL / COMERCIAL)
    if (isExplicitGroupAcmRequest(text)) {
      const extractedAcm = extractAcmAttributesFromText(text);
      if (extractedAcm.zonaOBarrio || extractedAcm.ciudad || extractedAcm.areaM2 || extractedAcm.fanegadas || extractedAcm.hectareas) {
        const acmResult = executeMarketValuationSurvey({
          zonaOBarrio: extractedAcm.zonaOBarrio || extractedAcm.ciudad || "Chicó",
          ciudad: extractedAcm.ciudad,
          direccionExacta: extractedAcm.direccionExacta,
          tipoInmueble: extractedAcm.tipoInmueble || "apartamento",
          areaM2: extractedAcm.areaM2 ?? 75,
          fanegadas: extractedAcm.fanegadas,
          hectareas: extractedAcm.hectareas,
          estrato: extractedAcm.estrato ?? 5,
          antiguedadAnos: extractedAcm.antiguedadAnos,
          anoConstruccion: extractedAcm.anoConstruccion,
          esRemodelado: extractedAcm.esRemodelado,
          tipoAcabados: extractedAcm.esRemodelado ? "Remodelado" : undefined,
          habitaciones: extractedAcm.habitaciones,
          banos: extractedAcm.banos,
          garajes: extractedAcm.garajes ?? 1,
          administracionCop: extractedAcm.administracionCop,
          tieneTerraza: extractedAcm.tieneTerraza,
          cocinaConIsla: extractedAcm.cocinaConIsla,
          niveles: extractedAcm.niveles,
          userId
        });
        if (acmResult?.reporteAcmEstructurado) {
          const finalAcmResp = appendGroupSatisfactionClosing(acmResult.reporteAcmEstructurado);
          appendCirculoHistory(userId, "user", text);
          appendCirculoHistory(userId, "assistant", finalAcmResp);
          markUserGreetedToday(userId);
          return {
            classification: "CONSULTA_GENERAL",
            response: finalAcmResp,
            reactionEmoji: "📊",
            wantsVoice: false,
            voiceResponse: "",
          };
        }
      }
    }

    // 🎯 INTERCEPTOR DIRECTO 6: AUDITORÍA DE MARKETING INMOBILIARIO (SWAP TEST + SCORE /100 + AIDA + ICP)
    if (isExplicitGroupMarketingAuditRequest(text)) {
      const cleanedPrompt = text.replace(/@\d{7,18}\b/g, " ").replace(/@jania\b/gi, " ").trim();
      const colonIdx = cleanedPrompt.indexOf(":");
      const listingCopy =
        colonIdx !== -1 && cleanedPrompt.slice(colonIdx + 1).trim().length >= 15
          ? cleanedPrompt.slice(colonIdx + 1).trim()
          : cleanedPrompt;
      const extractedMeta = extractAcmAttributesFromText(listingCopy);
      const audit = auditPropertyListing(listingCopy);
      const icp = buildRealEstateIcp(
        extractedMeta.tipoInmueble || "apartamento",
        /\barriendo\b/i.test(listingCopy) ? "arriendo" : "venta",
        extractedMeta.zonaOBarrio || "Bogotá",
        0,
        listingCopy
      );
      const mktReport =
        `🎯 *AUDITORÍA DE MARKETING INMOBILIARIO DE ALTO RENDIMIENTO (VECY MATCH)* 🇨🇴\n\n` +
        `• *Puntuación Global:* *${audit.score}/100* ${audit.score >= 80 ? "🌟 (Alta conversión)" : audit.score >= 60 ? "⚠️ (Mejorable)" : "🚨 (Baja diferenciación)"}\n` +
        `• *Swap Test / Clichés:* ${audit.oportunidadesMejora.slice(0, 3).join("; ") || "Excelente originalidad y diferenciación sin clichés"}\n` +
        `• *Fortalezas Clave:* ${audit.fortalezas.slice(0, 3).join("; ") || "Datos técnicos claros"}\n` +
        `• *Perfil de Comprador Ideal (ICP):* ${icp.arquetipo} (${icp.nivelIngresosEstrato})\n\n` +
        `📝 *FICHA TÉCNICA SUGERIDA OPTIMIZADA (MÉTODO AIDA):*\n${audit.fichaOptimizadaSugerida}\n\n` +
        `💡 *Consejo de JanIA:* Publica con barrio exacto, metraje real, alcobas y presupuesto definido para activar nuestro Algoritmo de MATCH (85%-100%).`;
      const finalMktResp = appendGroupSatisfactionClosing(mktReport);
      appendCirculoHistory(userId, "user", text);
      appendCirculoHistory(userId, "assistant", finalMktResp);
      markUserGreetedToday(userId);
      return {
        classification: "CONSULTA_GENERAL",
        response: finalMktResp,
        reactionEmoji: "🎯",
        wantsVoice: false,
        voiceResponse: "",
      };
    }

    const groupZeroName = process.env.GROUP_ZERO_NAME || '𝗣𝗥𝗢𝗬𝗘𝗖𝗧𝗢: 🌐 "𝗩𝗘𝗖𝗬𝗕𝗜𝗘𝗡𝗘𝗦𝗥𝗔𝗜𝗖𝗘𝗦"🚀';
    const systemPrompt =
      `${JANIA_ARGON_COGNITIVE_CORE}\n\n` +
      `Eres JanIA, la Inteligencia Artificial oficial y cerebro innovador de VECY BIENES RAÍCES. Estás operando en el grupo "${groupZeroName}". ` +
      `Tu objetivo en este grupo (foro abierto de la comunidad) es conversar sobre temas libres del sector inmobiliario, foros, debates y experiencias del día a día del negocio, además del proyecto VECY BIENES RAÍCES, su modelo colaborativo, tecnología y debate con competidores, de forma sincera, verídica y de alto nivel:\n\n` +
      `## DIRECTRICES DE INFORMACIÓN Y SINCERIDAD SOBRE VECY BIENES RAÍCES:\n` +
      `Explica claramente y con la verdad absoluta el estado del proyecto y sus características:\n` +
      `- **Lo que en verdad funciona hoy**: Los asesores publican sus ofertas (Inmuebles) y demandas (Requerimientos) en el grupo especializado 𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴. JanIA transcribe notas de voz en tiempo real, realiza OCR (lectura de texto) en flyers/imágenes con datos comerciales, extrae la información de las fichas técnicas automáticamente a partir de enlaces de portales, ejecuta el matching de coincidencias comerciales de forma instantánea a nivel nacional, y gestiona el flujo de confirmación de contacto bilateral privada (Double Opt-In) por DM mediante respuestas rápidas.\n` +
      `- **Lo que está en desarrollo**: El portal web oficial privado (https://vecy-bienes-raices.vercel.app/) se encuentra en fases continuas de integración. Módulos como CRM de leads y digitalización de contratos formalizados se desplegarán en fases posteriores.\n` +
      `- **Urgencia Comercial y Tarifas**: Enfatiza que toda la plataforma y el matching de JanIA en WhatsApp es 100% gratuita por lanzamiento para empoderar a la comunidad.\n` +
      `- **Tecnología del Ecosistema**: Explica de forma sencilla que hemos creado un Asistente de IA basado en código propietario y base de datos SQL de alto rendimiento, entrenado a diario para encontrar MATCH en los grupos.\n` +
      `- **𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴 es el único centro de Match**: Recuerda que el grupo especializado 𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴 es el canal donde JanIA busca los MATCH y gestiona los datos de inmuebles y requerimientos.\n\n` +
      `## LÓGICA DE CLASIFICACIÓN Y REDIRECCIÓN:\n` +
      `1. **DEBATE_COMPETIDOR**: Si mencionan a Ubicapp o Cristian Samboni. Debate con altura técnica, datos y cortesía.\n` +
      `2. **INMUEBLE o REQUERIMIENTO**: Redirecciona a 𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴 con amabilidad.\n` +
      `3. **AVALUO_O_LEGAL**: Redirecciona a 𝗩𝗘𝗖𝗬 𝗧𝗜𝗣𝗦💡/𝗡𝗢𝗧𝗜𝗖𝗜𝗔𝗦📰/𝗖𝗢𝗡𝗦𝗨𝗟𝗧𝗔𝗦 𝗜𝗡𝗠𝗢𝗕𝗜𝗟𝗜𝗔𝗥𝗜𝗔𝗦⁉️🏠 con amabilidad.\n` +
      `4. **CONSULTA_GENERAL**: Dudas sobre VECY, sugerencias, tecnología, opiniones, debates, foros, saludos o agradecimientos.\n` +
      `5. **VIOLACION_DE_NORMAS**: Política, religión, spam o publicidad externa.\n\n` +
      `DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:\n` +
      `{\n` +
      `  "classification": "DEBATE_COMPETIDOR | INMUEBLE | REQUERIMIENTO | AVALUO_O_LEGAL | CONSULTA_GENERAL | VIOLACION_DE_NORMAS",\n` +
      `  "response": "Tu respuesta, invitación a debate o mensaje de redirección según corresponda.",\n` +
      `  "reactionEmoji": "string (emoji recomendado)"\n` +
      `}`;

    const timeGreeting = getGreetingByTime();
    const nowBogota = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
    const hour = nowBogota.getHours();
    const colDateTime = getColombiaDateTimeContext();

    // Detección magistral de nombre de pila y género (sin apellidos, recordando nombre presentado en chat)
    const nameInfo = resolveNameAndGender(effectiveCirculoName || cleanFirstName || "colega", timeGreeting);
    const targetName = nameInfo.displayName && !["hola", "buenas", "buenos", "asesor", "colega"].includes(nameInfo.displayName.toLowerCase()) ? nameInfo.displayName : "";
    const isFemale = nameInfo.isFemale;
    const genderTerm = targetName ? (isFemale ? `estimada ${targetName}` : `estimado ${targetName}`) : "colega";

    const circuloHistory = getCirculoHistory(userId);
    const isOngoingChat = alreadyGreeted || circuloHistory.length > 0;

    const greetingInstruction = `\n\n[SISTEMA - INTELIGENCIA PURA, CORTESÍA NATURAL Y CONTINUIDAD DE DEBATE]:
- Fecha y día exacto hoy en Bogotá (Colombia): **${colDateTime.weekdayCapitalized}, ${colDateTime.dayOfMonth} de ${colDateTime.monthName} de ${colDateTime.year}** (${colDateTime.fullFormatted}).
- Hora actual en Bogotá: ${hour}:00 (${timeGreeting} — franja: ${colDateTime.periodOfDay}).
- PROHIBICIÓN ESTRICTA DE ALUCINACIÓN TEMPORAL (Doctrina Eduardo A. Rivera v33.96): Hoy es **${colDateTime.weekday}** y estamos en la **${colDateTime.periodOfDay}**. Queda TERMINANTEMENTE PROHIBIDO decir otro día de la semana (jamás digas "miércoles" si hoy es ${colDateTime.weekday}) o decir "mañana" cuando estamos en la ${colDateTime.periodOfDay}.
- Nombre de pila resuelto: "${targetName || 'colega'}".
- Conversación activa en curso con esta persona: ${isOngoingChat ? "SÍ (YA ESTÁN CONVERSANDO HOY EN ESTE FORO)" : "NO (PRIMER CONTACTO DEL DÍA)"}.
- Canal: Grupo oficial "${groupZeroName}".
- DIRECTRICES DE NATURALIDAD HUMANA ESTILO LAOMEDEIA (CERO ROBOT):
  * Eres una IA Pura, innovadora, elocuente, sincera y persuasiva de VECY BIENES RAÍCES. JAMÁS uses plantillas rígidas ni suenes como un contestador automático.
  * REGLA DE ORO DE CONTINUIDAD (CONVERSACIÓN EN CURSO):
    - Si la conversación está activa (${isOngoingChat ? "SÍ, YA ESTÁ EN CURSO" : "NO, ES EL PRIMER MENSAJE"}):
      1. ESTÁ TERMINANTEMENTE PROHIBIDO volver a saludar ("¡Buenos días!", "¡Hola!", "¿Cómo estás?", "¡Qué gusto saludarte!").
      2. ESTÁ TERMINANTEMENTE PROHIBIDO repetir el nombre de la persona ("${targetName}") en cada mensaje como un robot. Un ser humano en WhatsApp NO dice "¡Excelente, Mario! ... ¿cómo ves tu zona, Mario?". Háblale fluido, directo y natural como colega, sin muletillas con su nombre.
      3. Solo menciona su nombre si es imprescindible para citarlo entre varios participantes. NUNCA menciones su apellido como si fuera su nombre.
    - Si es el PRIMER contacto del día (${!isOngoingChat ? "SÍ" : "NO"}):
      1. Salúdalo con calidez y dinamismo por su primer nombre ("¡${timeGreeting}${targetName ? `, ${targetName}` : ''}!").
      2. PROHIBIDO repetir su nombre dos veces en el mismo mensaje ni incluir apellidos.
  * CONTINUIDAD DE DEBATE Y FOROS (REGLA DE ORO): Si el usuario está comentando, reflexionando, opinando o respondiendo a un mensaje citado, PROHIBIDO preguntar "¿cuál es tu consulta sobre VECY?". Al contrario: profundiza sobre su argumento, valida su punto con empatía y aporta tu perspectiva de líder gremial y tecnológica.
  * RESPUESTAS AFIRMATIVAS ("SÍ", "CLARO", "DALE", ETC.): Si el usuario responde afirmativamente a tu pregunta o propuesta previa (ej. si le preguntaste si le gustaría conocer alguna función de la tecnología colaborativa de VECY o debatir algún tema):
    - ESTÁ TERMINANTEMENTE PROHIBIDO quedarte callada, hacer una pregunta redundante o volver a saludar.
    - Presenta de inmediato con dinamismo, orgullo y elocuencia las herramientas colaborativas clave de VECY BIENES RAÍCES:
      1. El motor de MATCH bilateral en tiempo real bajo el esquema colaborativo 40/20/40 para conectar puntas sin fricción.
      2. Descarga de la Factura Oficial del Impuesto Predial de Bogotá en PDF en menos de un minuto con solo enviar el CHIP.
      3. Verificación de seguridad de contrapartes en ADRES BDUA y antecedentes de Policía Nacional para blindar operaciones.
      4. Sondeos inteligentes de valor por m² y canon con normativa POT Bogotá Decreto 555 de 2021.
    - Proponle con calidez y entusiasmo profundizar en la que más le sirva para sus cierres.
  * Si hace preguntas sobre el proyecto, explica el modelo con pasión, datos reales y visión de futuro: Modelo Institucional Oficial 40/20/40 en contacto directo por Match (80%-100%) entre colegas (40% captador oferta, 40% colocador demanda, 20% VECY por enlace y auditoría), y 40/10+10/40 en el portal web (10% VECY + 10% Bolsa Colaborativa de viralización en redes), matching en tiempo real y tecnología Cero Papel.
  * Si es un debate o pregunta de competidores (ej. Ubicapp / Cristian Samboni), debate con elegancia, altura ejecutiva y argumentos técnicos superiores sin agresividad.
  * Stickers 3D Expresivos de JanIA: Cuando haya humor, entusiasmo, gratitud o indignación simpática contra "dinosaurios inmobiliarios", puedes cerrar "response" con [STICKER:ternura], [STICKER:gracias_ternura], [STICKER:gracias_alegre], [STICKER:ok], [STICKER:mmm], [STICKER:jajaja], [STICKER:ush], [STICKER:queee] o [STICKER:oh_por_dios]. El sistema lo limpia y envía como sticker real.`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt }
    ];

    for (const h of circuloHistory.slice(-6)) {
      messages.push({ role: h.role, content: h.content });
    }

    let userPromptContent = `Usuario: @${rawPhone} (${realName})\nMensaje/Aporte: ${text}`;
    if (quotedContext) {
      userPromptContent += `\n[Contexto del mensaje previo citado al que responde el interlocutor: "${quotedContext}"]`;
    }
    if (imageBuffer) {
      userPromptContent += `\n[SISTEMA: IMAGEN ADJUNTA DETECTADA. Analiza la imagen con tu visión multimodal (captura de pantalla, caso jurídico, noticia, documento o meme inmobiliario) y aporta tu opinión o análisis profesional dentro del foro.]`;
    }
    if (pdfBuffer) {
      userPromptContent += `\n[SISTEMA: DOCUMENTO PDF DETECTADO. Analiza el contenido con tu comprensión documental nativa y participa en la conversación con solvencia.]`;
    }
    // 🌐 VALIDACIÓN EN LÍNEA EN TIEMPO REAL (WEB GROUNDING - v33.34):
    const isNormativeOrCurrencyQuery = /\b(?:pot\s*555|decreto\s*555|estatuto\s*tributario|uvt|trm|d[oó]lar|divisa|notar[ií]a|sinupot|vur|resoluci[oó]n\s*snr|supernotariado)\b/i.test(text);
    if (isNormativeOrCurrencyQuery) {
      try {
        const { searchWebGrounding } = await import('../../scraper');
        const searchRes = await searchWebGrounding(text);
        if (searchRes.success && searchRes.summary) {
          userPromptContent += `\n\n[VALIDACIÓN EN LÍNEA EN TIEMPO REAL — RIGOR JURÍDICO OFICIAL]:\n${searchRes.summary}\nUtiliza estos datos oficiales en tiempo real para fundamentar tu respuesta con total rigor legal y sin alucinaciones.`;
        }
      } catch (gErr: any) {
        console.warn('[JanIA-Grounding] Error al obtener web grounding:', gErr?.message);
      }
    }

    userPromptContent += greetingInstruction;

    messages.push({
      role: "user",
      content: userPromptContent
    });

    const circuloComplexity = classifyLlmReasoningComplexity(text, {
      hasImage: Boolean(imageBuffer),
      hasPdf: Boolean(pdfBuffer)
    });

    const llmRes = await invokeLLM({
      messages,
      responseFormat: { type: "json_object" },
      highReasoning: circuloComplexity.highReasoning,
      allowPaidFailover: circuloComplexity.allowPaidFailover,
      imageBuffer,
      pdfBuffer,
      pdfMimeType,
      enableSearch: false
    });

    try {
      const parsed = parseSafeJSON(llmRes.choices[0].message.content);
      let cleanResponse = sanitizeResponseMarkdown(parsed.response || "");
      const stickerMatch = extractStickerTagFromReply(cleanResponse);
      cleanResponse = stickerMatch.cleanText;
      const loadedSticker = stickerMatch.stickerKey ? getJaniaStickerByKey(stickerMatch.stickerKey) : null;
      if (isOngoingChat && cleanResponse) {
        cleanResponse = stripLeadingGreetingsAndCourtesies(cleanResponse);
      }
      appendCirculoHistory(userId, "user", text);
      appendCirculoHistory(userId, "assistant", cleanResponse);
      markUserGreetedToday(userId);
      return {
        classification: parsed.classification || "CONSULTA_GENERAL",
        response: cleanResponse,
        reactionEmoji: parsed.reactionEmoji || (parsed.classification === "VIOLACION_DE_NORMAS" ? "❌" : "💡"),
        ...(loadedSticker ? { stickerKey: loadedSticker.key, stickerBuffer: loadedSticker.buffer } : {})
      };
    } catch (e) {
      const replyContent = llmRes.choices[0].message.content || "Lo siento, en este momento no puedo responder tu consulta.";
      let cleanResponse = sanitizeResponseMarkdown(replyContent);
      const stickerMatch = extractStickerTagFromReply(cleanResponse);
      cleanResponse = stickerMatch.cleanText;
      const loadedSticker = stickerMatch.stickerKey ? getJaniaStickerByKey(stickerMatch.stickerKey) : null;
      if (isOngoingChat && cleanResponse) {
        cleanResponse = stripLeadingGreetingsAndCourtesies(cleanResponse);
      }
      appendCirculoHistory(userId, "user", text);
      appendCirculoHistory(userId, "assistant", cleanResponse);
      markUserGreetedToday(userId);
      return {
        classification: "CONSULTA_GENERAL",
        response: cleanResponse,
        reactionEmoji: "💡",
        ...(loadedSticker ? { stickerKey: loadedSticker.key, stickerBuffer: loadedSticker.buffer } : {})
      };
    }

  } catch (error: any) {
    console.error("[processCirculoMessage Error]:", error.message);
    const timeGreeting = getGreetingByTime();
    const rawPhone = userId.split('@')[0];
    const realName = await resolveRealName(userId, userName);
    if (!isEduardoOrJani(userId)) {
      const detectedCirculoRole = detectUserBusinessRoleFromText(text);
      if (detectedCirculoRole) {
        await setUserBusinessRole(userId, detectedCirculoRole, { sourceText: text }).catch(() => {});
      }
    }
    const persistedCirculoName = await persistIntroducedNameInSession(userId, text, realName);
    const effectiveCirculoName = persistedCirculoName.effectiveRawName || realName;
    const firstName = extractFirstName(effectiveCirculoName);
    const cleanFirstName = firstName && !["hola", "buenas", "buenos", "asesor", "colega"].includes(firstName.toLowerCase()) ? firstName : "";
    const userGreetingName = cleanFirstName ? ` ${cleanFirstName}` : "";

    const fallbackResponse = quotedContext
      ? `¡${timeGreeting}${userGreetingName}! 👋🏻 Totalmente de acuerdo contigo. En VECY BIENES RAÍCES defendemos la ética profesional, la dignidad gremial y las alianzas transparentes entre colegas. ¿Qué otra perspectiva o experiencia tienes sobre este punto? 🤝✨`
      : `¡${timeGreeting}${userGreetingName}! 👋🏻 Gracias por tu participación en el grupo oficial del Proyecto VECY BIENES RAÍCES. Estamos transformando el corretaje inmobiliario con tecnología colaborativa y comisiones justas. ¿Cómo podemos sumar hoy a tus negocios? 💡✨`;

    return {
      classification: "CONSULTA_GENERAL",
      response: fallbackResponse,
      reactionEmoji: "💡"
    };
  }
}
