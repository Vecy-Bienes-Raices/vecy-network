import fs from "node:fs";
import path from "node:path";
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
import {
  analyzeCtlFromWhatsAppInput,
  hasCtlTextMarkers,
  isExplicitCtlStudyRequest,
} from "../../ctlTitleStudyService";
import {
  analyzePotUrbanNormFromWhatsAppInput,
  isPotUrbanNormRequest,
} from "../../potUrbanNormService";
import {
  analyzeFinancialAndTaxFromWhatsAppInput,
  isFinancialOrTaxSimulationRequest,
} from "../../financialAndTaxRealEstateService";
import {
  analyzeContractOrMinutaFromWhatsAppInput,
  hasContractDraftMarkers,
  isContractMinutaOrAuditRequest,
} from "../../legalContractService";
import {
  analyzePropiedadHorizontalFromWhatsAppInput,
  hasPhDocumentMarkers,
  isPropiedadHorizontalRequest,
} from "../../propiedadHorizontalService";
import { executeMarketValuationSurvey } from "../../valuation";
import { auditPropertyListing, buildRealEstateIcp } from "../../realEstateMarketing";
import {
  isExplicitReviewLinkRequest,
  isUserSatisfactionOrFeedbackReply,
  buildAutonomousGoogleReviewInvitation,
} from "../../politenessService";
import { isServiceHelpRequest, PREDIAL_HELP_TEXT, CEDULA_HELP_TEXT, executePredialAssistanceFromWhatsApp } from "../../predialService";
import { extractAcmAttributesFromText } from "./dmHandler";
import {
  appendGroupSatisfactionClosing,
  isExplicitGroupAcmRequest,
  isExplicitGroupMarketingAuditRequest,
} from "./consultingHandler";
import { buildSessionOnboardingDirectives } from "./dmOnboardingAndDocsHelper";
import {
  detectUserBusinessRoleFromText,
  setUserBusinessRole,
  persistIntroducedNameInSession,
} from "../sessionManager";
import { resolveNameAndGender } from "../../nameAndGenderResolver";
import { getGreetingByTime, getColombiaDateTimeContext } from "../parsers";
import { extractStickerTagFromReply, getJaniaStickerByKey, selectContextualStickerForDm } from "../stickerService";

export interface WebSkillEvaluationResult {
  handled: boolean;
  replyText?: string;
  pdfBuffer?: Buffer;
  pdfFileName?: string;
  pdfUrl?: string;
  stickerKey?: string;
  stickerUrl?: string;
  wantsVoice?: boolean;
}

/**
 * Persiste en disco (public/uploads/jania-docs) cualquier PDF generado en la consulta web
 * para entregar un enlace de descarga directo en el navegador del usuario (omitido en NODE_ENV=test).
 */
export function persistWebGeneratedPdf(pdfBuffer?: Buffer | null, pdfFileName?: string): string | undefined {
  if (!pdfBuffer || pdfBuffer.length === 0) return undefined;
  if (process.env.NODE_ENV === "test") {
    const safeName = (pdfFileName || "Documento_VECY.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
    return `/uploads/jania-docs/${safeName}`;
  }
  try {
    const docsDir = path.resolve(process.cwd(), "public/uploads/jania-docs");
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    const safeBase = (pdfFileName || "Documento_VECY.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
    const finalName = `${Date.now()}_${safeBase}`;
    fs.writeFileSync(path.join(docsDir, finalName), pdfBuffer);
    return `/uploads/jania-docs/${finalName}`;
  } catch (err: any) {
    console.warn("[WebChatService] No se pudo guardar PDF generado en disco:", err?.message);
    return undefined;
  }
}

/**
 * Extrae y limpia cualquier tag [STICKER:clave] para la consola web, devolviendo la ruta pública .webp.
 */
export function resolveWebStickerFromReply(
  userMessage: string,
  assistantReply: string,
  userId: string
): { cleanText: string; stickerKey?: string; stickerUrl?: string } {
  const extracted = extractStickerTagFromReply(assistantReply || "");
  if (extracted.stickerKey) {
    const loaded = getJaniaStickerByKey(extracted.stickerKey);
    if (loaded) {
      return {
        cleanText: extracted.cleanText,
        stickerKey: loaded.key,
        stickerUrl: `/assets/stickers/${loaded.filename}`,
      };
    }
  }
  const contextual = selectContextualStickerForDm(userMessage, extracted.cleanText, userId);
  if (contextual) {
    return {
      cleanText: extracted.cleanText,
      stickerKey: contextual.key,
      stickerUrl: `/assets/stickers/${contextual.filename}`,
    };
  }
  return { cleanText: extracted.cleanText };
}

/**
 * Detecta con rigor si el mensaje web es realmente una ficha cruda de publicación comercial
 * (evitando secuestrar consultas legales, financieras, de valoración, de marketing o preguntas sobre cómo publicar/hacer match).
 */
export function detectRawWebListingPost(message: string): { isRawListing: boolean; isRequirement: boolean } {
  const raw = (message || "").trim();
  if (!raw) return { isRawListing: false, isRequirement: false };
  const lower = raw.toLowerCase();

  // Nunca interceptar preguntas, consultas técnicas o explicaciones de VECY/MATCH
  const hasConsultationIntent =
    /[?¿]/.test(raw) ||
    /\b(?:c[oó]mo|cu[aá]nto|cu[aá]l|qu[eé]\s+(?:es|son|vale|cuesta|riesgos?|pros|contras|norma)|expl[ií]ca(?:me)?|ens[eé][nñ]a(?:me)?|cu[eé]nta(?:me)?|redacta|hazme|calcula|simula|liquida|audita|revisa|analiza|sondeo|aval[uú]o|acm|minuta|contrato|retroventa|leasing|hipoteca|cap\s*rate|roi|reglamento|propiedad\s+horizontal|chip|predial|idu|rues|pot|sinupot|noticias?|copy|marketing|dinosaurios|40\/20\/40|80\/20|registr(?:ar|o)|publicar|funciona\s+el\s+match)\b/i.test(
      raw
    );
  if (hasConsultationIntent) {
    return { isRawListing: false, isRequirement: false };
  }

  const hasTradeVerb = /\b(?:vendo|se\s+vende|arriendo|se\s+arrienda|alquilo|busco|necesito|ofrezco|requiero|permuto)\b/i.test(lower);
  const hasPropertyType = /\b(?:apto|apartamento|casa|lote|local|bodega|oficina|finca|penthouse|apartaestudio)\b/i.test(lower);
  const hasCommercialDetails =
    /(?:\$|millones|canon|m2|m²|metros|alcobas|habitaciones|ba[nñ]os|parqueaderos?|garajes?|estrato)/i.test(lower);

  const isRequirement = /\b(?:busco|necesito|requiero)\b/i.test(lower);
  return {
    isRawListing: hasTradeVerb && hasPropertyType && hasCommercialDetails,
    isRequirement,
  };
}

/**
 * Ejecuta en paridad 100% con WhatsApp todos los Skills determinísticos de JanIA ($0 COP) para el canal Web.
 */
export async function evaluateWebDeterministicSkills(params: {
  message: string;
  userId: string;
  userName?: string;
  hasActiveHistory: boolean;
  formatRawListingGuide?: (args: { userName?: string; isRequirement: boolean }) => string;
}): Promise<WebSkillEvaluationResult> {
  const { message, userId, userName, hasActiveHistory, formatRawListingGuide } = params;
  const clean = (message || "").trim();
  if (!clean) return { handled: false };

  // 1. Guías rápidas Predial / Cédula
  const helpType = isServiceHelpRequest(clean);
  if (helpType === "predial") {
    return { handled: true, replyText: PREDIAL_HELP_TEXT, stickerKey: "ok", stickerUrl: "/assets/stickers/jania_ok.webp" };
  }
  if (helpType === "cedula") {
    return { handled: true, replyText: CEDULA_HELP_TEXT, stickerKey: "ok", stickerUrl: "/assets/stickers/jania_ok.webp" };
  }

  // 2. Satisfacción / Reseña Google
  const isReviewReq = isExplicitReviewLinkRequest(clean);
  const isOtherToolRequest =
    isIduInquiry(clean) ||
    hasPendingIduSession(userId) ||
    isExplicitCompanyRuesQuery(clean) ||
    isExplicitNotarialLiquidationRequest(clean, userId) ||
    isExplicitGroupAcmRequest(clean) ||
    isExplicitGroupMarketingAuditRequest(clean) ||
    isExplicitCtlStudyRequest(clean) ||
    hasCtlTextMarkers(clean) ||
    isPotUrbanNormRequest(clean) ||
    isFinancialOrTaxSimulationRequest(clean) ||
    isContractMinutaOrAuditRequest(clean, false) ||
    hasContractDraftMarkers(clean) ||
    isPropiedadHorizontalRequest(clean, false) ||
    hasPhDocumentMarkers(clean) ||
    extractAllCedulasForVerification(clean, false).length > 0;

  const satFeedback = isUserSatisfactionOrFeedbackReply(clean, hasActiveHistory);
  if (
    isReviewReq ||
    (!isOtherToolRequest &&
      satFeedback.isSatisfied &&
      (hasActiveHistory ||
        /\b(?:me\s+(?:ha(?:n)?\s+)?gust|me\s+(?:ha(?:n)?\s+)?encant|qued[eé]\s+(?:muy\s+)?satisfech|s[uú]per\s+(?:bien|completo|[uú]til))\b/i.test(clean)))
  ) {
    const invite = buildAutonomousGoogleReviewInvitation(userName, {
      isDirectLinkRequest: isReviewReq,
      constructiveTopic: satFeedback.constructiveTopic,
      isConstructiveFeedback: satFeedback.hasConstructiveSuggestion,
    });
    return {
      handled: true,
      replyText: invite,
      stickerKey: "gracias_ternura",
      stickerUrl: "/assets/stickers/jania_gracias_ternura.webp",
    };
  }

  // 3. Skill 2: Estudio de Títulos SNR (CTL)
  if (hasCtlTextMarkers(clean) || isExplicitCtlStudyRequest(clean)) {
    const ctlCheck = await analyzeCtlFromWhatsAppInput({
      text: clean,
      requesterName: userName,
    });
    if (ctlCheck.isCtlDocument && ctlCheck.report) {
      const pdfUrl = persistWebGeneratedPdf(ctlCheck.pdfBuffer, ctlCheck.pdfFileName);
      const reply = appendGroupSatisfactionClosing(ctlCheck.report.whatsappSummary) +
        (pdfUrl ? `\n\n📥 *Descargar Estudio de Títulos PDF:* ${pdfUrl}` : "");
      return {
        handled: true,
        replyText: reply,
        pdfBuffer: ctlCheck.pdfBuffer,
        pdfFileName: ctlCheck.pdfFileName,
        pdfUrl,
        stickerKey: "mmm",
        stickerUrl: "/assets/stickers/jania_mmm.webp",
      };
    }
    if (ctlCheck.needsMediaGuidance && ctlCheck.responseText) {
      return { handled: true, replyText: ctlCheck.responseText, stickerKey: "ok", stickerUrl: "/assets/stickers/jania_ok.webp" };
    }
  }

  // 4. Skill 3: POT & Norma Urbana Bogotá (SINUPOT / IDECA)
  if (isPotUrbanNormRequest(clean)) {
    const potCheck = await analyzePotUrbanNormFromWhatsAppInput({
      text: clean,
      requesterName: userName,
    });
    if (potCheck.isPotRequest && potCheck.report) {
      const pdfUrl = persistWebGeneratedPdf(potCheck.pdfBuffer, potCheck.pdfFileName);
      const reply = appendGroupSatisfactionClosing(potCheck.responseText) +
        (pdfUrl ? `\n\n📥 *Descargar Concepto POT PDF:* ${pdfUrl}` : "");
      return {
        handled: true,
        replyText: reply,
        pdfBuffer: potCheck.pdfBuffer,
        pdfFileName: potCheck.pdfFileName,
        pdfUrl,
        stickerKey: "mmm",
        stickerUrl: "/assets/stickers/jania_mmm.webp",
      };
    }
    if (potCheck.needsPredioGuidance && potCheck.responseText) {
      return { handled: true, replyText: potCheck.responseText, stickerKey: "ok", stickerUrl: "/assets/stickers/jania_ok.webp" };
    }
  }

  // 5. Skill 4: Simulador Financiero, Hipotecario vs Leasing, Cap Rate / ROI y Tributación
  if (isFinancialOrTaxSimulationRequest(clean)) {
    const finCheck = await analyzeFinancialAndTaxFromWhatsAppInput({
      text: clean,
      requesterName: userName,
      generatePdf: true,
    });
    if (finCheck.isFinancialTaxRequest && finCheck.report) {
      const pdfUrl = persistWebGeneratedPdf(finCheck.pdfBuffer, finCheck.pdfFileName);
      const reply = appendGroupSatisfactionClosing(finCheck.responseText) +
        (pdfUrl ? `\n\n📥 *Descargar Ficha Financiera / Tributaria PDF:* ${pdfUrl}` : "");
      return {
        handled: true,
        replyText: reply,
        pdfBuffer: finCheck.pdfBuffer,
        pdfFileName: finCheck.pdfFileName,
        pdfUrl,
        stickerKey: "mmm",
        stickerUrl: "/assets/stickers/jania_mmm.webp",
      };
    }
    if (finCheck.needsDataGuidance && finCheck.responseText) {
      return { handled: true, replyText: finCheck.responseText, stickerKey: "ok", stickerUrl: "/assets/stickers/jania_ok.webp" };
    }
  }

  // 6. Skill 5: Minutas Jurídicas Personalizadas y Auditoría Contractual
  if (isContractMinutaOrAuditRequest(clean, false) || hasContractDraftMarkers(clean)) {
    const contractCheck = await analyzeContractOrMinutaFromWhatsAppInput({
      text: clean,
      requesterName: userName,
    });
    if (contractCheck.handled && contractCheck.whatsappReply) {
      const pdfBuffer = contractCheck.pdfResult?.pdfBuffer;
      const pdfFileName = contractCheck.pdfResult?.fileName;
      const pdfUrl = persistWebGeneratedPdf(pdfBuffer, pdfFileName);
      const baseText =
        contractCheck.mode === "guidance"
          ? contractCheck.whatsappReply
          : appendGroupSatisfactionClosing(contractCheck.whatsappReply);
      const reply = pdfUrl ? `${baseText}\n\n📥 *Descargar Minuta / Auditoría PDF:* ${pdfUrl}` : baseText;
      return {
        handled: true,
        replyText: reply,
        pdfBuffer,
        pdfFileName,
        pdfUrl,
        stickerKey: "ok",
        stickerUrl: "/assets/stickers/jania_ok.webp",
      };
    }
  }

  // 7. Skill 6: Propiedad Horizontal (Ley 675), RPH / Actas y RNT / Airbnb
  if (isPropiedadHorizontalRequest(clean, false) || hasPhDocumentMarkers(clean)) {
    const phCheck = await analyzePropiedadHorizontalFromWhatsAppInput({
      text: clean,
      requesterName: userName,
    });
    if (phCheck.handled && phCheck.whatsappReply) {
      const pdfBuffer = phCheck.pdfResult?.pdfBuffer;
      const pdfFileName = phCheck.pdfResult?.fileName;
      const pdfUrl = persistWebGeneratedPdf(pdfBuffer, pdfFileName);
      const baseText =
        phCheck.mode === "guidance"
          ? phCheck.whatsappReply
          : appendGroupSatisfactionClosing(phCheck.whatsappReply);
      const reply = pdfUrl ? `${baseText}\n\n📥 *Descargar Concepto PH PDF:* ${pdfUrl}` : baseText;
      return {
        handled: true,
        replyText: reply,
        pdfBuffer,
        pdfFileName,
        pdfUrl,
        stickerKey: "mmm",
        stickerUrl: "/assets/stickers/jania_mmm.webp",
      };
    }
  }

  // 8. IDU Paz y Salvo Valorización Bogotá
  if (isIduInquiry(clean) || hasPendingIduSession(userId)) {
    const iduCheck = await executeIduAssistanceFromWhatsApp(clean, userId, true);
    if (iduCheck.isIduRequest && iduCheck.reportText) {
      const pdfUrl = persistWebGeneratedPdf(iduCheck.pdfBuffer, iduCheck.pdfFileName);
      const reply = appendGroupSatisfactionClosing(iduCheck.reportText) +
        (pdfUrl ? `\n\n📥 *Descargar Certificado IDU PDF:* ${pdfUrl}` : "");
      return {
        handled: true,
        replyText: reply,
        pdfBuffer: iduCheck.pdfBuffer,
        pdfFileName: iduCheck.pdfFileName,
        pdfUrl,
        stickerKey: "ok",
        stickerUrl: "/assets/stickers/jania_ok.webp",
      };
    }
  }

  // 9. Predial Bogotá (CHIP + Cédula/NIT)
  const predialCheck = await executePredialAssistanceFromWhatsApp(clean, userId, true);
  if (predialCheck.isPredialRequest && predialCheck.reportText) {
    const pdfUrl = persistWebGeneratedPdf(predialCheck.pdfBuffer, predialCheck.pdfFileName);
    const reply = appendGroupSatisfactionClosing(predialCheck.reportText) +
      (pdfUrl ? `\n\n📥 *Descargar Factura Predial PDF:* ${pdfUrl}` : "");
    return {
      handled: true,
      replyText: reply,
      pdfBuffer: predialCheck.pdfBuffer,
      pdfFileName: predialCheck.pdfFileName,
      pdfUrl,
      stickerKey: "ok",
      stickerUrl: "/assets/stickers/jania_ok.webp",
    };
  }

  // 10. Verificación de Identidad (CC/CE) y RUES Empresas
  const idItems = extractAllCedulasForVerification(clean, false);
  if (idItems.length > 0 || isExplicitCompanyRuesQuery(clean) || Boolean(getPendingCedulaSession(userId))) {
    const idCheck = await executeIdentityVerificationFromWhatsApp(
      clean,
      true,
      userId,
      idItems.length > 0 ? idItems : undefined
    );
    if (idCheck.isVerificationRequest && idCheck.reportText) {
      return {
        handled: true,
        replyText: appendGroupSatisfactionClosing(idCheck.reportText),
        stickerKey: "ok",
        stickerUrl: "/assets/stickers/jania_ok.webp",
      };
    }
  }

  // 11. Liquidación Notarial y Registro
  if (isExplicitNotarialLiquidationRequest(clean, userId)) {
    const notarialCheck = await executeNotarialAssistanceFromWhatsApp(clean, userId, true);
    if (notarialCheck.isNotarialRequest && notarialCheck.reportText) {
      return {
        handled: true,
        replyText: appendGroupSatisfactionClosing(notarialCheck.reportText),
        stickerKey: "mmm",
        stickerUrl: "/assets/stickers/jania_mmm.webp",
      };
    }
  }

  // 12. Sondeo Técnico de Mercado / ACM (Urbano, Comercial y Rural Fanegadas/Hectáreas)
  if (isExplicitGroupAcmRequest(clean)) {
    const extracted = extractAcmAttributesFromText(clean);
    if (extracted.zonaOBarrio || extracted.ciudad || extracted.areaM2 || extracted.fanegadas || extracted.hectareas) {
      const acm = executeMarketValuationSurvey({
        zonaOBarrio: extracted.zonaOBarrio || extracted.ciudad || "Chicó",
        ciudad: extracted.ciudad,
        direccionExacta: extracted.direccionExacta,
        tipoInmueble: extracted.tipoInmueble || "apartamento",
        areaM2: extracted.areaM2 ?? 75,
        fanegadas: extracted.fanegadas,
        hectareas: extracted.hectareas,
        estrato: extracted.estrato ?? 5,
        antiguedadAnos: extracted.antiguedadAnos,
        anoConstruccion: extracted.anoConstruccion,
        esRemodelado: extracted.esRemodelado,
        tipoAcabados: extracted.esRemodelado ? "Remodelado" : undefined,
        habitaciones: extracted.habitaciones,
        banos: extracted.banos,
        garajes: extracted.garajes ?? 1,
        administracionCop: extracted.administracionCop,
        tieneTerraza: extracted.tieneTerraza,
        cocinaConIsla: extracted.cocinaConIsla,
        niveles: extracted.niveles,
        userId,
      });
      if (acm?.reporteAcmEstructurado) {
        return {
          handled: true,
          replyText: appendGroupSatisfactionClosing(acm.reporteAcmEstructurado),
          stickerKey: "mmm",
          stickerUrl: "/assets/stickers/jania_mmm.webp",
        };
      }
    }
  }

  // 13. Auditoría de Marketing Inmobiliario (Swap Test + Score /100 + AIDA + ICP)
  if (isExplicitGroupMarketingAuditRequest(clean)) {
    const colonIdx = clean.indexOf(":");
    const listingCopy = colonIdx !== -1 && clean.slice(colonIdx + 1).trim().length >= 15
      ? clean.slice(colonIdx + 1).trim()
      : clean;
    const extractedMeta = extractAcmAttributesFromText(listingCopy);
    const audit = auditPropertyListing(listingCopy);
    const icp = buildRealEstateIcp(
      extractedMeta.tipoInmueble || "apartamento",
      /\barriendo\b/i.test(listingCopy) ? "arriendo" : "venta",
      extractedMeta.zonaOBarrio || extractedMeta.ciudad || "Bogotá",
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
    return {
      handled: true,
      replyText: appendGroupSatisfactionClosing(mktReport),
      stickerKey: "gracias_brillo",
      stickerUrl: "/assets/stickers/jania_gracias_brillo.webp",
    };
  }

  // 14. Ficha cruda de publicación comercial en Web -> Orientación amable con plantilla completa para el Match
  const rawListingCheck = detectRawWebListingPost(clean);
  if (rawListingCheck.isRawListing) {
    const isReq = rawListingCheck.isRequirement;
    const guideReply = formatRawListingGuide
      ? formatRawListingGuide({ userName, isRequirement: isReq })
      : `¡Hola${userName ? `, ${userName}` : ""}! 🏡 Con gusto recibo tu ${isReq ? "requerimiento de búsqueda" : "inmueble en oferta"} y te guío para que nuestro motor de MATCH (85%–100%) lo cruce al instante.\n\n` +
        `Para que quede indexado automáticamente en tiempo real en toda la red VECY BIENES RAÍCES, puedes publicarlo directamente desde tu cuenta gratuita en nuestro portal (https://vecy-bienes-raices.vercel.app/) o enviarlo en nuestro:\n\n` +
        `👉 *Grupo 1 Oficial: 𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴*\n` +
        `🔗 https://chat.whatsapp.com/GzMbjNs1P2tHI7D0V4h8wZ\n\n` +
        `📌 *Usa esta plantilla estandarizada para que tu publicación sea captada al 100% por JanIA (1=1 en alcobas, área ≥ mínima, baños/garajes ≥):*\n` +
        (isReq
          ? `📝 *REQUERIMIENTO INMOBILIARIO VECY*\n• Negocio: [Compra o Arriendo]\n• Inmueble: [Apartamento / Casa / Local / Finca]\n• Ciudad y Barrio(s): [Ej. Bogotá: Cedritos, Colina]\n• Presupuesto Máximo: [En COP]\n• Área Mínima: [En m² o fanegadas/hectáreas]\n• Alcobas exactas, Baños y Parqueaderos mínimos: [Ej. 3 alcobas, 2 baños, 1 garaje independiente]\n• Detalles clave: [Balcón, ascensor, estrato, vista]\n• Contacto y Rol: [Nombre, teléfono y si aceptas 40/20/40 o eres cliente directo]`
          : `🏠 *OFERTA INMOBILIARIA VECY*\n• Negocio: [Venta, Arriendo o Permuta]\n• Inmueble: [Apartamento / Casa / Local / Finca]\n• Ciudad y Barrio exacto: [Ej. Bogotá: Santa Bárbara]\n• Precio Venta / Canon Arriendo + Valor Administración: [En COP]\n• Área Total y Privada: [En m², o fanegadas/hectáreas si es rural]\n• Alcobas, Baños, Parqueaderos (independiente/lineal) y Depósito:\n• Estrato, Antigüedad y Piso:\n• Contacto y Rol: [Nombre, teléfono y si eres agente 40/20/40 o propietario directo]`);
    return {
      handled: true,
      replyText: guideReply,
      stickerKey: "ok",
      stickerUrl: "/assets/stickers/jania_ok.webp",
    };
  }

  return { handled: false };
}

/**
 * Construye el contexto conversacional web unificado: memoria de nombre/género/rol persistente,
 * detección de noticias/actualidad para grounding web en vivo, e instrucciones de stickers y honestidad.
 */
export async function buildWebChatLlmContext(params: {
  message: string;
  userId: string;
  registeredName?: string | null;
  hasPreviousMessages: boolean;
}): Promise<{
  resolvedDisplayName: string;
  isFemale: boolean;
  userContextInstruction: string;
  onboardingDirectivesBlock: string;
  needsLiveSearch: boolean;
}> {
  const { message, userId, registeredName, hasPreviousMessages } = params;
  const detectedRole = detectUserBusinessRoleFromText(message);
  if (detectedRole) {
    await setUserBusinessRole(userId, detectedRole, { sourceText: message }).catch(() => {});
  }

  const persisted = await persistIntroducedNameInSession(
    userId,
    message,
    registeredName || undefined
  );

  const timeGreeting = getGreetingByTime();
  const colDateTime = getColombiaDateTimeContext();
  const rawCandidate = persisted.effectiveRawName || registeredName || "";
  const nameInfo = resolveNameAndGender(rawCandidate, timeGreeting);
  const resolvedDisplayName =
    nameInfo.displayName && nameInfo.displayName !== "colega" ? nameInfo.displayName : "";

  const isRegistered = Boolean(registeredName);
  const onboarding = await buildSessionOnboardingDirectives(userId);
  const onboardingDirectivesBlock = [
    onboarding.contextRoleDirective,
    onboarding.context402040Directive,
    onboarding.contextOwnerDirective,
  ]
    .filter(Boolean)
    .join("\n");

  const userContextInstruction = isRegistered
    ? `\n\n[INFORMACIÓN DEL USUARIO EN SESIÓN WEB]:\n- Estado: REGISTRADO EN VECY BIENES RAÍCES ✅\n- Nombre resuelto: "${resolvedDisplayName || registeredName}" (Género gramatical detectado: ${nameInfo.isFemale ? "Femenino" : "Masculino"})\n- Hoy en Bogotá: ${colDateTime.fullFormatted} (${timeGreeting})\n- Conversación en curso: ${hasPreviousMessages ? "SÍ (no repitas saludos iniciales ni el nombre en cada frase)" : "NO (primer turno: saluda con calidez por su nombre)"}\n`
    : `\n\n[INFORMACIÓN DEL VISITANTE WEB]:\n- Estado: ${resolvedDisplayName ? `IDENTIFICADO EN CHAT COMO "${resolvedDisplayName}" ✅` : "VISITANTE AÚN SIN NOMBRE EN EL CHAT"}\n- Género gramatical detectado: ${nameInfo.isFemale ? "Femenino" : "Masculino"}\n- Hoy en Bogotá: ${colDateTime.fullFormatted} (${timeGreeting})\n- Conversación en curso: ${hasPreviousMessages ? "SÍ (mantén la continuidad sin repetir saludos)" : "NO (primer mensaje)"}\n- INSTRUCCIÓN:\n  1. ${resolvedDisplayName ? `Ya sabes que se llama "${resolvedDisplayName}"; trátalo(a) de tú con ese nombre de forma orgánica sin volver a preguntarle cómo se llama.` : `Si aún no conoces su nombre, saluda con calidez ("${timeGreeting}") y pregunta brevemente con quién tienes el gusto de hablar para llamarlo(a) por su nombre y adaptar tu género gramatical.`}\n  2. Invítalo(a) con sutileza cuando aporte valor a registrarse gratis en https://vecy-bienes-raices.vercel.app/ (KYC Ultra-Light) para guardar historial y publicar ilimitadamente.\n`;

  const needsLiveSearch = /\b(?:noticias?|actualidad|hoy|2025|2026|tendencias?|tasas?\s+de\s+inter[eé]s|banrep|banco\s+de\s+la\s+rep[uú]blica|d[oó]lar|trm|uvt|salario\s+m[ií]nimo|dane|camacol|fedelonjas|inflaci[oó]n|ipc|mercado\s+mundial|global)\b/i.test(
    message
  );

  return {
    resolvedDisplayName,
    isFemale: nameInfo.isFemale,
    userContextInstruction,
    onboardingDirectivesBlock,
    needsLiveSearch,
  };
}
