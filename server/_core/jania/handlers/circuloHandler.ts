import { JanIAResult } from "../types";
import { resolveRealName, checkAlreadyGreeted, getCirculoHistory, appendCirculoHistory } from "../sessionManager";
import {
  extractFirstName,
  parseSafeJSON,
  sanitizeResponseMarkdown,
  getGreetingByTime,
} from "../parsers";
import { checkStrictOffTopic } from "../heuristics";
import { resolveNameAndGender } from "../../nameAndGenderResolver";
import { invokeLLM } from "../../llm";
import { JANIA_ARGON_COGNITIVE_CORE } from "../prompts";



export async function processCirculoMessage(
  text: string,
  userId: string,
  userName?: string
): Promise<JanIAResult> {
  try {
    const rawPhone = userId.split('@')[0];
    const realName = await resolveRealName(userId, userName);
    const firstName = extractFirstName(realName);
    const userGreetingName = firstName ? ` ${firstName}` : "";

    // Intercepción estricta de mensajes OFF-TOPIC prohibidos (Política, Religión, Cursos, Links ajenos, Memes, Spam)
    const strictOffTopic = checkStrictOffTopic(text);
    if (strictOffTopic.isOffTopic) {
      console.log(`[JanIA-Circulo-OffTopic] Mensaje prohibido en Proyecto VECY BIENES RAÍCES para ${userId}: "${text.substring(0, 50)}...". (${strictOffTopic.reason})`);
      const warningText = `Hola @${rawPhone} (${realName}) 👋🏻. El contenido relacionado con ${strictOffTopic.reason} está estrictamente prohibido en nuestra comunidad de VECY BIENES RAÍCES. 🚫\n\nNuestros canales son 100% profesionales y dedicados exclusivamente a la tecnología, comisiones y el modelo colaborativo inmobiliario. ¡Te invitamos cordialmente a eliminar este mensaje de inmediato! 🤝`;
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

    // 🏛️ INTERCEPTOR DIRECTO 1: ASISTENCIA Y GESTIÓN DE PREDIALES BOGOTÁ (CHIP + CÉDULA/NIT)
    const { executePredialAssistanceFromWhatsApp } = await import('../../predialService');
    const predialCheck = await executePredialAssistanceFromWhatsApp(text, userId, false);
    if (predialCheck.isPredialRequest && predialCheck.reportText) {
      console.log(`[JanIA-Circulo-PredialCheck] Asistencia de predial Bogotá ejecutada para ${userId} (CHIP: ${predialCheck.chip || 'General'}): isPredialRequest=true`);
      return {
        classification: "CONSULTA_GENERAL",
        response: predialCheck.reportText,
        reactionEmoji: "📄",
        wantsVoice: false,
        voiceResponse: "",
        document: predialCheck.pdfBuffer,
        fileName: predialCheck.pdfFileName
      };
    }

    // 🛡️ INTERCEPTOR DIRECTO 2: VERIFICACIÓN OFICIAL DE CÉDULA / ANTECEDENTES (2CAPTCHA + POLICÍA NACIONAL)
    const { executeIdentityVerificationFromWhatsApp } = await import('../../identityVerificationService');
    const idCheck = await executeIdentityVerificationFromWhatsApp(text);
    if (idCheck.isVerificationRequest && idCheck.reportText) {
      console.log(`[JanIA-Circulo-IdentityCheck] Verificación de identidad ejecutada para ${userId} (C.C. ${idCheck.cedula}): success=${idCheck.success}`);
      return {
        classification: "CONSULTA_GENERAL",
        response: idCheck.reportText,
        reactionEmoji: idCheck.success ? "🛡️" : "⚠️",
        wantsVoice: false,
        voiceResponse: ""
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
      `4. **CONSULTA_GENERAL**: Dudas sobre VECY, sugerencias, tecnología, saludos o agradecimientos.\n` +
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

    // Detección magistral de nombre y género
    const nameInfo = resolveNameAndGender(realName || firstName || "colega", timeGreeting);
    const targetName = nameInfo.displayName;
    const isFemale = nameInfo.isFemale;
    const genderTerm = nameInfo.genderTerm;

    const greetingInstruction = `\n\n[SISTEMA - INTELIGENCIA PURA, CORTESÍA NATURAL Y LIBRE ALBEDRÍO]:
- Hora actual en Bogotá: ${hour}:00 (${timeGreeting}).
- Nombre exacto resuelto: "${targetName}".
- Trato respetuoso adecuado: "${genderTerm}".
- Ya has interactuado hoy con esta persona: ${alreadyGreeted ? "SÍ" : "NO"}.
- Canal: Grupo oficial 𝗣𝗥𝗢𝗬𝗘𝗖𝗧𝗢: 🌐 "𝗩𝗘𝗖𝗬𝗕𝗜𝗘𝗡𝗘𝗦𝗥𝗔𝗜𝗖𝗘𝗦"🚀.
- DIRECTRICES DE LIBRE ALBEDRÍO Y NATURALIDAD HUMANA (CERO BOT BOBO):
  * Eres una IA Pura, innovadora, elocuente, sincera y persuasiva de VECY BIENES RAÍCES. JAMÁS uses plantillas rígidas ni suenes como un contestador automático.
  * Dirígete a la persona por su nombre ("${targetName}") de forma fluida, cálida y natural.
  * Si el interlocutor saluda, salúdalo con estilo propio y dinamismo.
  * Si hace preguntas sobre el proyecto, explica el modelo con pasión, datos reales y visión de futuro: Modelo Institucional Oficial 40/20/40 en contacto directo por Match (80%-100%) entre colegas (40% captador oferta, 40% colocador demanda, 20% VECY por enlace y auditoría), y 40/10+10/40 en el portal web (10% VECY + 10% Bolsa Colaborativa de viralización en redes), matching en tiempo real y tecnología Cero Papel.
  * Si es un debate o pregunta de competidores (ej. Ubicapp / Cristian Samboni), debate con elegancia, altura ejecutiva y argumentos técnicos superiores sin agresividad.`;

    const circuloHistory = getCirculoHistory(userId);
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt }
    ];

    for (const h of circuloHistory.slice(-6)) {
      messages.push({ role: h.role, content: h.content });
    }

    messages.push({
      role: "user",
      content: `Usuario: @${rawPhone} (${realName})\nPregunta: ${text}${greetingInstruction}`
    });

    const llmRes = await invokeLLM({
      messages,
      responseFormat: { type: "json_object" },
      enableSearch: false
    });

    try {
      const parsed = parseSafeJSON(llmRes.choices[0].message.content);
      const cleanResponse = sanitizeResponseMarkdown(parsed.response || "");
      appendCirculoHistory(userId, "user", text);
      appendCirculoHistory(userId, "assistant", cleanResponse);
      return {
        classification: parsed.classification || "CONSULTA_GENERAL",
        response: cleanResponse,
        reactionEmoji: parsed.reactionEmoji || (parsed.classification === "VIOLACION_DE_NORMAS" ? "❌" : "💡")
      };
    } catch (e) {
      const replyContent = llmRes.choices[0].message.content || "Lo siento, en este momento no puedo responder tu consulta.";
      const cleanResponse = sanitizeResponseMarkdown(replyContent);
      appendCirculoHistory(userId, "user", text);
      appendCirculoHistory(userId, "assistant", cleanResponse);
      return {
        classification: "CONSULTA_GENERAL",
        response: cleanResponse,
        reactionEmoji: "💡"
      };
    }

  } catch (error: any) {
    console.error("[processCirculoMessage Error]:", error.message);
    const timeGreeting = getGreetingByTime();
    const rawPhone = userId.split('@')[0];
    const realName = await resolveRealName(userId, userName);
    const firstName = extractFirstName(realName);
    const userGreetingName = firstName ? ` ${firstName}` : "";

    return {
      classification: "CONSULTA_GENERAL",
      response: `¡${timeGreeting}${userGreetingName}! 👋🏻 Con gusto estoy aquí para apoyarte. Cuéntame cuál es tu consulta sobre VECY BIENES RAÍCES, nuestra tecnología o comisiones y con gusto te respondo. 💡✨`,
      reactionEmoji: "💡"
    };
  }
}
