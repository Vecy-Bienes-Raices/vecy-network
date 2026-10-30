import { JanIAResult } from "../types";
import { resolveRealName, checkAlreadyGreeted, getCirculoHistory, appendCirculoHistory, markUserGreetedToday } from "../sessionManager";
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
import { stripLeadingGreetingsAndCourtesies } from "./dmHandler";



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
    const firstName = extractFirstName(realName);
    const cleanFirstName = firstName && !["hola", "buenas", "buenos", "asesor"].includes(firstName.toLowerCase()) ? firstName : "";
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

    // Detección magistral de nombre de pila y género (sin apellidos)
    const nameInfo = resolveNameAndGender(realName || cleanFirstName || "colega", timeGreeting);
    const targetName = nameInfo.displayName && !["hola", "buenas", "buenos", "asesor", "colega"].includes(nameInfo.displayName.toLowerCase()) ? nameInfo.displayName : "";
    const isFemale = nameInfo.isFemale;
    const genderTerm = targetName ? (isFemale ? `estimada ${targetName}` : `estimado ${targetName}`) : "colega";

    const circuloHistory = getCirculoHistory(userId);
    const isOngoingChat = alreadyGreeted || circuloHistory.length > 0;

    const greetingInstruction = `\n\n[SISTEMA - INTELIGENCIA PURA, CORTESÍA NATURAL Y CONTINUIDAD DE DEBATE]:
- Hora actual en Bogotá: ${hour}:00 (${timeGreeting}).
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
  * Si es un debate o pregunta de competidores (ej. Ubicapp / Cristian Samboni), debate con elegancia, altura ejecutiva y argumentos técnicos superiores sin agresividad.`;

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

    const llmRes = await invokeLLM({
      messages,
      responseFormat: { type: "json_object" },
      imageBuffer,
      pdfBuffer,
      pdfMimeType,
      enableSearch: false
    });

    try {
      const parsed = parseSafeJSON(llmRes.choices[0].message.content);
      let cleanResponse = sanitizeResponseMarkdown(parsed.response || "");
      if (isOngoingChat && cleanResponse) {
        cleanResponse = stripLeadingGreetingsAndCourtesies(cleanResponse);
      }
      appendCirculoHistory(userId, "user", text);
      appendCirculoHistory(userId, "assistant", cleanResponse);
      markUserGreetedToday(userId);
      return {
        classification: parsed.classification || "CONSULTA_GENERAL",
        response: cleanResponse,
        reactionEmoji: parsed.reactionEmoji || (parsed.classification === "VIOLACION_DE_NORMAS" ? "❌" : "💡")
      };
    } catch (e) {
      const replyContent = llmRes.choices[0].message.content || "Lo siento, en este momento no puedo responder tu consulta.";
      let cleanResponse = sanitizeResponseMarkdown(replyContent);
      if (isOngoingChat && cleanResponse) {
        cleanResponse = stripLeadingGreetingsAndCourtesies(cleanResponse);
      }
      appendCirculoHistory(userId, "user", text);
      appendCirculoHistory(userId, "assistant", cleanResponse);
      markUserGreetedToday(userId);
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
    const cleanFirstName = firstName && !["hola", "buenas", "buenos", "asesor"].includes(firstName.toLowerCase()) ? firstName : "";
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
