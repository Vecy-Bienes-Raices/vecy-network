import { resolveRealName, getOrLoadDmHistory, appendDmHistory } from "../sessionManager";
import { extractFirstName, sanitizeResponseMarkdown } from "../parsers";
import { resolveNameAndGender, getCanonicalCompositeName } from "../../nameAndGenderResolver";
import { invokeLLM } from "../../llm";
import { enhanceResponseWithCommercialFunnel, isHighValueLegalOrTaxInquiry, COMMERCIAL_CLOSING_CTA, PATRIMONIAL_RISK_ALERT } from "../../commercialFunnelService";

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

  // Detección directiva de Eduardo y Jani
  const isEduardo = /eduardo/i.test(realName || "") || /eduardo/i.test(rawName || "") || userId.includes("3192919978") || userId.includes("225954035179724");
  const isJani = /jani/i.test(realName || "") || /jani/i.test(rawName || "") || userId.includes("3188096811") || userId.includes("3166569719") || userId.includes("167108705018103") || userId.includes("182781141344345") || userId.includes("218820279050385");

  let displayName = "";
  if (isEduardo) {
    displayName = "Eduardo";
  } else if (isJani) {
    displayName = "Jani";
  } else {
    displayName = canonicalComposite || compositeOrFirst || (nameInfo.displayName !== "colega" && !nameInfo.displayName.toLowerCase().includes("asesor") ? nameInfo.displayName : "");
    if (!canonicalComposite && displayName.includes(" ")) {
      displayName = displayName.split(" ")[0];
    }
  }

  const welcomeGrammar = nameInfo.isFemale ? "bienvenida" : "bienvenido";
  const history = await getOrLoadDmHistory(userId);
  const isFirstTurn = history.length === 0;

  // Cierre doctrinal estricto para herramientas gratuitas (Doctrina v33.03)
  const cleanPayload = (payloadText || "").trim();
  const reviewSection = (isEduardo || isJani)
    ? ""
    : `\n\n⭐ *¿Te fue útil esta consulta?*\n` +
      `Tu recomendación nos ayuda a seguir creciendo. Déjanos tu calificación de 5 estrellas en Google Opiniones aquí:\n` +
      `https://g.page/r/CUxVzG_vecy/review`;

  const closingTag = "Un servicio de cortesía de VECY BIENES RAÍCES 🤝.";
  let payloadWithClosing = cleanPayload;
  if (!payloadWithClosing.includes(closingTag)) {
    payloadWithClosing = `${payloadWithClosing}\n\n${closingTag}${reviewSection}`;
  } else if (!isEduardo && !isJani && !payloadWithClosing.includes("CUxVzG_vecy/review")) {
    payloadWithClosing = `${payloadWithClosing}${reviewSection}`;
  }

  if (!success) {
    if (payloadText && payloadText.trim()) {
      if (isEduardo) {
        return `¡Hola, Eduardo! A tu disposición. Aquí tienes el detalle del reporte solicitado:\n\n${payloadWithClosing}`;
      }
      if (isJani) {
        return `¡Hola, Jani! Qué gusto saludarte. Aquí tienes el detalle del reporte solicitado:\n\n${payloadWithClosing}`;
      }
      if (isFirstTurn) {
        const greetingHeader = `¡${timeSalutation}${displayName ? ` ${displayName}` : ""}! Te doy una cordial ${welcomeGrammar} a mi chat de servicios inmobiliarios. Soy *JanIA*, tu asistente inmobiliaria con IA creada por *VECY BIENES RAÍCES* 🏘️✨.\n\n`;
        return greetingHeader + payloadWithClosing;
      } else {
        const politeHeader = `¡Hola${displayName ? ` ${displayName}` : ""}! `;
        return politeHeader + payloadWithClosing;
      }
    }
    if (isEduardo) {
      return `¡Hola, Eduardo! A tu disposición. Ocurrió una intermitencia temporal en el sistema de consulta. ¿Me confirmas nuevamente el dato para procesarlo de inmediato? 🤝`;
    }
    if (isJani) {
      return `¡Hola, Jani! Qué gusto saludarte. Ocurrió una intermitencia temporal en el sistema de consulta. ¿Me confirmas nuevamente el dato para procesarlo de inmediato? 🤝`;
    }
    return `¡${timeSalutation}${displayName ? ` ${displayName}` : ""}! Qué pena contigo. Debido a una intermitencia temporal en mi sistema (un pequeño fallo en la matrix 🤖😅), no pude procesar tu solicitud en este intento. ¿Podrías por favor confirmarme nuevamente los datos para ayudarte de inmediato? 🤝`;
  }

  if (isEduardo) {
    return `¡Hola, Eduardo! A tu disposición:\n\n${payloadWithClosing}`;
  }
  if (isJani) {
    return `¡Hola, Jani! Qué gusto saludarte:\n\n${payloadWithClosing}`;
  }

  if (isFirstTurn) {
    const greetingHeader = `¡${timeSalutation}${displayName ? ` ${displayName}` : ""}! Te doy una cordial ${welcomeGrammar} a mi chat de servicios inmobiliarios. Soy *JanIA*, tu asistente inmobiliaria con IA creada por *VECY BIENES RAÍCES* 🏘️✨.\n\nYa procesé con gusto tu consulta como un beneficio de cortesía de nuestra inmobiliaria:\n\n`;
    return greetingHeader + payloadWithClosing;
  } else {
    const politeHeader = `¡Con mucho gusto${displayName ? ` ${displayName}` : ""}! Aquí tienes el reporte oficial como un beneficio de cortesía de *VECY BIENES RAÍCES*:\n\n`;
    return politeHeader + payloadWithClosing;
  }
}

/**
 * Sanitiza ortografía estricta en español (apertura de signos ¡, ¿, mayúscula inicial)
 * y garantiza trato directivo para Eduardo y Jani (Doctrina v33.03).
 */
export function sanitizeDmOrthographyAndGreeting(
  text: string,
  isEduardo: boolean,
  isJani: boolean,
  _displayName?: string,
  hasPriorHistory: boolean = false
): string {
  let cleaned = (text || "").trim();
  if (!cleaned) return cleaned;

  // 1. Corregir cualquier saludo o vocativo que inicie en minúscula ("estimada...", "estimado...", "hola...")
  cleaned = cleaned.replace(/^estimad([ao]s?)\s+([a-záéíóúñ]+)!/i, (_m, ending, name) => {
    return `¡Estimad${ending.toLowerCase()} ${name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()}!`;
  });
  cleaned = cleaned.replace(/^estimad([ao]s?)\b/i, "Estimad$1");
  cleaned = cleaned.replace(/^hola\s+([a-záéíóúñ]+)[,!.\s]+/i, (_m, name) => `¡Hola, ${name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()}! `);
  cleaned = cleaned.replace(/^hola\b/i, "¡Hola!");
  cleaned = cleaned.replace(/^buen([ao]s?\s+(?:d[ií]as|tardes|noches))\b/i, (m) => `¡${m.charAt(0).toUpperCase() + m.slice(1)}!`);

  // Usar primer nombre de pila (ej. "Jani", no "Jani Alves"; "Eduardo", no "Eduardo Rivera")
  cleaned = cleaned.replace(/\b(Jani)\s+Alves\b/gi, "Jani");
  cleaned = cleaned.replace(/\b(Eduardo)\s+Rivera\b/gi, "Eduardo");

  // 2. Trato directivo para directores VIP
  if (isEduardo) {
    if (!hasPriorHistory || /^¡?(?:hola|buenos?\s+d[ií]as|buenas?\s+tardes|estimad[ao])/i.test(cleaned)) {
      cleaned = cleaned.replace(/^¡?(?:hola|buenos?\s+d[ií]as|buenas?\s+tardes|buenas?\s+noches|estimad[ao]|saludos)[^!.\n]*[!.\n]?\s*/i, "");
      cleaned = `¡Hola, Eduardo! A tu disposición. ${cleaned.charAt(0).toUpperCase() + cleaned.slice(1)}`.trim();
    }
  } else if (isJani) {
    if (!hasPriorHistory || /^¡?(?:hola|buenos?\s+d[ií]as|buenas?\s+tardes|estimad[ao])/i.test(cleaned)) {
      cleaned = cleaned.replace(/^¡?(?:hola|buenos?\s+d[ií]as|buenas?\s+tardes|buenas?\s+noches|estimad[ao]|saludos)[^!.\n]*[!.\n]?\s*/i, "");
      cleaned = `¡Hola, Jani! Qué gusto saludarte. ${cleaned.charAt(0).toUpperCase() + cleaned.slice(1)}`.trim();
    }
  }

  // 3. Primera letra en mayúscula obligatoria en cada frase y al inicio del texto
  cleaned = cleaned.replace(/(^|[.!?]\s+)([a-záéíóúñ])/g, (_m, prefix, letter) => prefix + letter.toUpperCase());

  // 4. Apertura obligatoria de signos de interrogación ¿ ante preguntas
  cleaned = cleaned.replace(/(^|\n|[.!?]\s*|,\s*)(qu[eé]|c[oó]mo|cu[aá]ndo|d[oó]nde|por\s+qu[eé]|cu[aá]l(?:es)?|qui[eé]n(?:es)?|acaso)\b([^?\n]+)\?/gi, (_match, prefix, qWord, rest) => {
    const cleanPrefix = prefix.endsWith(", ") ? prefix.slice(0, -2) + ". " : prefix;
    return `${cleanPrefix}¿${qWord.charAt(0).toUpperCase() + qWord.slice(1)}${rest}?`;
  });

  return cleaned.trim();
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
  userName?: string
): Promise<string> {
  const clean = text.trim();
  if (!clean) return "";

  const realName = await resolveRealName(userId, userName);
  const { getGreetingByTime } = await import('../../whatsapp-utils');
  const timeSalutation = getGreetingByTime(); // "Buenos días" | "Buenas tardes" | "Buenas noches"

  // Detección directiva de Eduardo y Jani
  const isEduardo = /eduardo/i.test(realName || "") || /eduardo/i.test(userName || "") || userId.includes("3192919978") || userId.includes("225954035179724");
  const isJani = /jani/i.test(realName || "") || /jani/i.test(userName || "") || userId.includes("3188096811") || userId.includes("3166569719") || userId.includes("167108705018103") || userId.includes("182781141344345") || userId.includes("218820279050385");

  // 🧑‍💼 Resolución inteligente de nombres compuestos, género gramatical y cortesía (v32.35)
  const nameInfo = resolveNameAndGender(realName, timeSalutation);
  const compositeOrFirst = extractFirstName(realName);

  let displayName = "";
  if (isEduardo) {
    displayName = "Eduardo";
  } else if (isJani) {
    displayName = "Jani";
  } else {
    // 1. Si coincide con un nombre compuesto canónico estricto colombiano (ej: "Ana María", "Juan José", "María Fernanda", "José Manuel", "Olga Lucía")
    const canonicalComposite = getCanonicalCompositeName(realName);
    if (canonicalComposite) {
      displayName = canonicalComposite;
    } else if (compositeOrFirst) {
      // 2. Si extractFirstName extrajo un nombre compuesto común o el primer nombre de pila (ej: "Consuelo" para "Consuelo Ronderos")
      displayName = compositeOrFirst;
    } else if (nameInfo.displayName && nameInfo.displayName !== "colega" && !nameInfo.displayName.toLowerCase().includes("asesor")) {
      displayName = nameInfo.displayName;
    }
    if (!canonicalComposite && displayName.includes(" ")) {
      displayName = displayName.split(" ")[0];
    }
  }

  const nameGreeting = displayName ? `, ${displayName}` : "";
  const vocativeGreeting = displayName ? `, ${displayName}` : "";
  const cleanLower = clean.toLowerCase();

  // 1. Detectar saludos iniciales o preguntas directas cortas de entrada
  const isGreetingOnly = /^(hola|buen[ao]s?\s*(d[ií]as?|tardes?|noches?)?|saludos?|buenas?|hola\s*jania|quien\s*eres|como\s*estas|que\s*haces|informaci[oó]n|info|ayuda)\b/i.test(cleanLower) && clean.length < 50;

  const history = await getOrLoadDmHistory(userId);
  const hasPriorHistory = history.length > 0;

  // Si es un saludo inicial y no hay historial previo reciente:
  if (isGreetingOnly && history.length === 0) {
    if (isEduardo) {
      const welcomeMsg = `¡Hola, Eduardo! A tu disposición. ¿En qué te colaboro hoy? 🤝✨`;
      appendDmHistory(userId, "user", clean);
      appendDmHistory(userId, "assistant", welcomeMsg);
      return welcomeMsg;
    }
    if (isJani) {
      const welcomeMsg = `¡Hola, Jani! Qué gusto saludarte. ¿En qué te colaboro hoy? 🤝✨`;
      appendDmHistory(userId, "user", clean);
      appendDmHistory(userId, "assistant", welcomeMsg);
      return welcomeMsg;
    }
    const welcomeMsg =
      `¡${timeSalutation}${nameGreeting}! 👋 Soy *JanIA*, tu asistente inmobiliaria con IA creada por *VECY BIENES RAÍCES* 🏘️. Qué gusto saludarte.\n\n` +
      `Para nosotros en VECY es un verdadero placer apoyarte en tus gestiones y proyectos inmobiliarios.\n\n` +
      `Cuéntame${displayName ? `, ${displayName}` : ""}: ¿a qué te dedicas o qué haces actualmente? Así podré orientarte de la mejor manera y contarte cómo podemos facilitarte la vida hoy 🤝✨`;

    appendDmHistory(userId, "user", clean);
    appendDmHistory(userId, "assistant", welcomeMsg);
    return welcomeMsg;
  }

  // Fast-path: Preguntas sobre el portafolio de consultas ("¿Cómo es lo de las consultas?", etc.)
  const isConsultasInquiry =
    /(?:c[oó]mo\s+es\s+lo\s+de\s+las\s+consultas|qu[eé]\s+(?:tipo\s+de\s+)?consultas|cu[aá]les\s+consultas|de\s+qu[eé]\s+son\s+las\s+consultas|qu[eé]\s+consultas\s+(?:tienen|hacen|prestan|ofrecen)|informaci[oó]n\s+de\s+las\s+consultas|como\s+funcionan\s+las\s+consultas)\b/i.test(cleanLower);

  if (isConsultasInquiry) {
    const consultasMenuMsg =
      `¡Con mucho gusto${vocativeGreeting}! Primero cuéntame qué clase de consulta deseas hacer o sobre qué tema necesitas apoyo:\n\n` +
      `🎁 *Servicios 100% Gratuitos de Autoservicio:*\n` +
      `1️⃣ *Verificación oficial de documentos:* Validación de identidad (Cédula de Ciudadanía, Extranjería, Pasaportes) y reporte de antecedentes con la Policía Nacional en 20 segundos.\n` +
      `2️⃣ *Factura Predial Bogotá y Certificados de Pago:* Consulta y descarga oficial en PDF con código de barras y estado de cuenta al día con la Secretaría de Hacienda.\n\n` +
      `💼 *Consultas Especializadas y Asesoría Profesional:*\n` +
      `3️⃣ *Sondeos de mercado:* Valores aproximados del metro cuadrado en Bogotá según el barrio o sector.\n` +
      `4️⃣ *Asesoría jurídica inmobiliaria:* Casos de negociación, promesas de compraventa y contratos de arrendamiento.\n` +
      `5️⃣ *Tratamiento de datos y Hábeas Data inmobiliario.*\n` +
      `6️⃣ *Recuperación de cartera:* Cobranza de comisiones inmobiliarias no pagadas.\n` +
      `7️⃣ *Avalúos digitales y peritajes comerciales certificados RAA.*\n` +
      `8️⃣ *Liquidaciones tributarias:* Ganancia ocasional, retención en la fuente e impuestos notariales.\n` +
      `9️⃣ *Préstamos sobre hipoteca y pacto de retroventa.*\n\n` +
      `Dime cuál de estos temas te interesa y te ayudo de inmediato. Si deseas probar las herramientas gratuitas (1 o 2), ¡solo dime el número de documento o el predio que quieres consultar! 🤝`;

    appendDmHistory(userId, "user", clean);
    appendDmHistory(userId, "assistant", consultasMenuMsg);
    return consultasMenuMsg;
  }

  // Fast-path: Presentación de la empresa, fundadores, redes sociales y estocada de calificación (Doctrina v32.97)
  const { isCompanyInquiryOrAboutUs, formatDetailedCompanyAndSocialMediaPresentation } = await import('../../politenessService');
  if (isCompanyInquiryOrAboutUs(cleanLower)) {
    const companyMsg = formatDetailedCompanyAndSocialMediaPresentation(displayName);
    appendDmHistory(userId, "user", clean);
    appendDmHistory(userId, "assistant", companyMsg);
    return companyMsg;
  }

  // Fast-path: Preguntas sobre costos de las herramientas ("Los costos ?", "¿cuánto vale?", "¿cuánto cuesta?", etc.)
  const isCostInquiry =
    /^(?:los\s+)?costos?\s*\??$/i.test(cleanLower) ||
    /(?:cu[aá]nto\s+(?:cuesta|vale|cobran)|qu[eé]\s+costo\s+tiene|qu[eé]\s+precio\s+tiene|tiene\s+alg[uú]n\s+costo|es\s+gratis|es\s+gratuito|cu[aá]nto\s+es|tarifas?)\b/i.test(cleanLower);

  if (isCostInquiry) {
    const isFreeToolsContext =
      history.some(h => /verificaci[oó]n|c[eé]dula|predial|antecedentes|polic[ií]a|documento|chip/i.test(h.content)) ||
      !history.some(h => /aval[uú]o|jur[ií]dica|comisi[oó]n|hipoteca/i.test(h.content));

    if (isFreeToolsContext) {
      const freeCostMsg =
        `¡${displayName || "Hola"}! Este servicio es completamente *GRATIS* 🎁✨.\n\n` +
        `En *VECY Bienes Raíces* la verificación oficial de documentos y antecedentes ante la Policía Nacional (Cédula de Ciudadanía, Extranjería, Pasaportes), así como la consulta y descarga de la Factura Predial y certificados de pago de Bogotá, *no tienen ningún costo para ti*.\n\n` +
        `Las ofrecemos 100% gratuitas para apoyar a nuestra comunidad y garantizar total seguridad en las visitas y negocios inmobiliarios.\n\n` +
        `Si quieres, ¡pongámoslo a prueba ahora mismo! Envíame el número de cédula (o documento) que deseas verificar, y en segundos te entrego el reporte oficial 🤝`;

      appendDmHistory(userId, "user", clean);
      appendDmHistory(userId, "assistant", freeCostMsg);
      return freeCostMsg;
    }
  }

  // Fast-path: Explicación didáctica y amorosa paso a paso ("¿Cómo se hace?", "¿Cómo lo hago?", "explícame cómo", etc.)
  const isHowToDoInquiry =
    /(?:c[oó]mo\s+(?:se\s+hace|lo\s+hago|se\s+hacen|hago|funciona|entro|pido|es\s+el\s+paso\s+a\s+paso)|expl[ií]came|ens[eé][ñn]ame|no\s+(?:s[eé]|entiendo)\s+c[oó]mo|me\s+enredo|ay[uú]dame\s+a\s+hacerlo|no\s+s[eé]\s+de\s+tecnolog[ií]a)\b/i.test(cleanLower);

  if (isHowToDoInquiry) {
    const howToMsg =
      `¡No te preocupes ni un segundo${vocativeGreeting}! Para eso estoy yo aquí. Conmigo todo es facilísimo y yo me encargo de todo el trabajo por ti 🥰✨:\n\n` +
      `1️⃣ *Para verificar una cédula o antecedentes:*\n` +
      `Solo escríbeme aquí el nombre completo y número de documento (ejemplo: *"verificar 12345678"* o *"CC 12345678"*), tal como se lo solicitas formalmente para el registro de portería previo a la visita. En segundos te entrego el reporte oficial de las centrales de seguridad con nombres completos, antecedentes y afiliación en salud.\n\n` +
      `2️⃣ *Para sacar el Impuesto Predial de Bogotá:*\n` +
      `Solo escríbeme el código CHIP del inmueble (comienza por AAA...) o la dirección con el número de apartamento. Yo descargo la factura oficial en PDF con su código de barras lista para pagar o el certificado de que está al día.\n\n` +
      `3️⃣ *Para el Paz y Salvo de Valorización IDU:*\n` +
      `Solo facilítame el código CHIP o indícame que necesitas el Paz y Salvo del IDU y te genero el certificado oficial en PDF para tu trámite en notaría.\n\n` +
      `4️⃣ *Si te cuesta la tecnología o te enredas con el celular:*\n` +
      `¡Cero angustia! Escríbeme con tus propias palabras o mándame un mensaje de voz contándome qué necesitas. Yo tengo toda la paciencia del mundo para guiarte y ayudarte paso a paso.\n\n` +
      `¿Cuál de las consultas te gustaría que hagamos ahorita? Dime y la hacemos de una vez 🤝😊`;

    appendDmHistory(userId, "user", clean);
    appendDmHistory(userId, "assistant", howToMsg);
    return howToMsg;
  }

  // Fast-path: Despedidas y agradecimientos (Doctrina v32.40 - Mensaje 1 Canal Oficial)
  const isGratitudeOrClosingFastPath =
    /(?:(?:ok|vale|listo|bueno|mil|muchas)\s+)?gracias\b|muchas\s*gracias\b|mil\s*gracias\b|muy\s*amable\b|hasta\s*luego\b|chao\b|genial\s*gracias\b|perfecto\s*gracias\b|quedamos\s*as[ií]\b/i.test(cleanLower) ||
    (cleanLower.length <= 40 && /(?:gracias|agradecid[ao]|bendiciones|hasta\s*pronto|feliz\s*(?:d[ií]a|tarde|noche))/i.test(cleanLower));

  if (isGratitudeOrClosingFastPath) {
    const { getChannelInviteGoodbyeMessage } = await import('../../predialService');
    const goodbyeMsg = getChannelInviteGoodbyeMessage(displayName);

    appendDmHistory(userId, "user", clean);
    appendDmHistory(userId, "assistant", goodbyeMsg);
    return goodbyeMsg;
  }

  // 🏛️ INTERCEPTOR DIRECTO DM: PAZ Y SALVO DE VALORIZACIÓN IDU BOGOTÁ (v32.99)
  const { isIduInquiry, formatIduAssistanceGuide, extractChipForIduValorizacion, executeIduValorizacionFromWhatsApp } = await import('../../iduValorizacionService');
  const iduDetection = extractChipForIduValorizacion(clean);
  if (iduDetection.found && iduDetection.chip) {
    const iduRes = await executeIduValorizacionFromWhatsApp(clean, userId, true);
    if (iduRes.isIduRequest && iduRes.reportText) {
      const deliveredText = await formatPoliteToolDelivery(userId, userName || "", 'idu', iduRes.reportText, true);
      appendDmHistory(userId, "user", clean);
      appendDmHistory(userId, "assistant", deliveredText);
      return deliveredText;
    }
  } else if (isIduInquiry(clean)) {
    const iduGuide = formatIduAssistanceGuide(displayName);
    appendDmHistory(userId, "user", clean);
    appendDmHistory(userId, "assistant", iduGuide);
    return iduGuide;
  }

  // Fast-path: Si el usuario pide verificar documento o antecedentes sin dar aún el número
  // Soporta errores tipográficos habituales en celular (ej: "quieto rrvisar sus antecedentes")
  const isDocVerificationIntent =
    /(?:(?:verificar|validar|consultar|revisar|rrvisar|chequear|mirar)\s*(?:sus|los|el)?\s*(?:antecedentes|c[eé]dula|documento|pasaporte|ce|extranjer[ií]a|identidad|polic[ií]a))|(?:(?:quiero|quieto|necesito|deseo|voy a|podemos|ayuda para|para)\s*(?:revisar|rrvisar|verificar|validar|consultar|chequear|mirar)\s*(?:sus|los|el)?\s*(?:antecedentes|c[eé]dula|documento))|(?:antecedentes|c[eé]dula\s*o\s*antecedentes)/i.test(cleanLower) &&
    !/\b\d{6,11}\b/.test(clean);

  if (isDocVerificationIntent) {
    const docPromptMsg =
      `¡Claro que sí${vocativeGreeting}! Para consultar los antecedentes y verificar la identidad en la Policía Nacional, es indispensable contar con el número de cédula exacto (o documento de identidad: Cédula de Extranjería, Pasaporte o Documento del País de Origen).\n\n` +
      `📌 *Nota legal de seguridad y Hábeas Data (Ley 1581 de 2012):* Conforme al artículo 94 del Decreto Ley 019 de 2012 y la Ley 1581 de 2012, en Colombia las plataformas oficiales de seguridad y la Registraduría Nacional no permiten buscar números de documento usando únicamente nombres o apellidos para proteger la privacidad ciudadana. Solo se puede verificar a partir del número de documento que el propio titular suministra voluntariamente.\n\n` +
      `Pídele con toda tranquilidad y profesionalismo a tu cliente o colega su nombre completo y número de documento, explicándole con total transparencia que es el requisito formal estándar para el registro de portería y control de acceso de la visita al inmueble. Escríbemelo aquí (ej: *"verificar cc: XXXXXXXX"* o *"verificar pasaporte: XXXXXXXX"*) y en segundos te entrego el reporte oficial de validación 🤝.`;
    appendDmHistory(userId, "user", clean);
    appendDmHistory(userId, "assistant", docPromptMsg);
    return docPromptMsg;
  }

  // 🛡️ PROTOCOLO DE URBANIDAD DE CARREÑO Y CONFIRMACIÓN DIDÁCTICA (v32.99)
  const {
    isBareDocumentNumber,
    getPendingUnconfirmedDoc,
    setPendingUnconfirmedDoc,
    clearPendingUnconfirmedDoc,
    detectDocTypeConfirmation,
    extractCedulaForVerification,
    executeIdentityVerificationFromWhatsApp,
    getPendingCedulaSession,
    extractAllCedulasForVerification
  } = await import('../../identityVerificationService');

  // CASO 1: El usuario tenía un número pendiente y en este turno confirma el tipo de documento
  const pendingDoc = getPendingUnconfirmedDoc(userId);
  if (pendingDoc) {
    const confirmation = detectDocTypeConfirmation(clean);
    if (confirmation.isConfirmation && confirmation.tipoDoc) {
      clearPendingUnconfirmedDoc(userId);
      const verified = await executeIdentityVerificationFromWhatsApp(
        `${confirmation.tipoDoc} ${pendingDoc.cleanNumber}`,
        true,
        userId
      );
      if (verified.isVerificationRequest && verified.reportText) {
        // En el segundo turno se entrega directamente SIN repetir saludos horarios
        const followUpResponse =
          `¡Confirmado${displayName ? `, ${displayName}` : ""}! Procedí con la verificación oficial del documento:\n\n` +
          verified.reportText;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", followUpResponse);
        return followUpResponse;
      }
    }
  }

  // CASO 2: El usuario envía únicamente un número suelto sin tipo de documento ni prefijo de consulta
  if (isBareDocumentNumber(clean)) {
    // Guardar número en memoria de sesión
    setPendingUnconfirmedDoc(userId, clean);

    // Saludar cordialmente con saludo horario y nombre resuelto, y responder pedagógicamente
    const pedagogoMsg =
      `¡${timeSalutation}${displayName ? ` ${displayName}` : ""}! 👋 Qué gusto saludarte.\n\n` +
      `Recibí el número *${clean}*. Para garantizarte una consulta exacta y oficial en la base de datos correspondiente del Estado, por favor confírmame a qué tipo de documento pertenece:\n\n` +
      `1️⃣ *Cédula de Ciudadanía (C.C.)* 🇨🇴\n` +
      `2️⃣ *Cédula de Extranjería (C.E.)* 🌐\n` +
      `3️⃣ *Pasaporte* 🛂\n` +
      `4️⃣ *NIT (Persona Jurídica)* 🏢\n\n` +
      `Solo respóndeme indicándome el tipo de documento (ejemplo: *"es CC"*, *"Cédula"*, *"Extranjería"* o simplemente el número de opción *1, 2, 3 o 4*) y de inmediato te entrego tu reporte oficial y seguro con plena validez. 🤝✨`;

    appendDmHistory(userId, "user", clean);
    appendDmHistory(userId, "assistant", pedagogoMsg);
    return pedagogoMsg;
  }

  // 🛡️ INTERCEPTOR DIRECTO DM: VERIFICACIÓN OFICIAL DE CÉDULA (POLICÍA NACIONAL + PROCURADURÍA + ADRES)
  // Si el mensaje contiene una o más cédulas con especificación o prefijo, ejecutar la verificación real oficial
  const idDetection = extractCedulaForVerification(clean, true);
  if (idDetection.found) {
    const idCheck = await executeIdentityVerificationFromWhatsApp(clean, true, userId);
    if (idCheck.isVerificationRequest && idCheck.reportText) {
      appendDmHistory(userId, "user", clean);
      appendDmHistory(userId, "assistant", idCheck.reportText);
      return idCheck.reportText;
    }
  }

  // 🛡️ INTERCEPTOR DE SEGUIMIENTO: CONSULTA SOBRE CÉDULAS / ANTECEDENTES PENDIENTES EN LA SESIÓN
  // Si el usuario pregunta "pero me colaboras con las cédulas", "sólo las cédulas", "qué pasó con las cédulas", etc.
  const isAskingPendingCedulas =
    /(?:colaboras|ayudas|revisaste|verificaste|consultaste|miraste|sabes|sabemos|qu[eé]\s*pas[oó]|c[oó]mo\s*va|c[oó]mo\s*van|falta|pendiente|salieron|listo|listas|listos|novedad|noticia|informaci[oó]n|resultado|reporte).*(?:c[eé]dula|documento|antecedente|verificaci[oó]n|identidad|comprador|compradores)/i.test(cleanLower) ||
    /(?:c[eé]dula|documento|antecedente|verificaci[oó]n|identidad|comprador|compradores).*(?:qu[eé]\s*pas[oó]|c[oó]mo\s*va|c[oó]mo\s*van|colaboras|ayudas|revisaste|verificaste|consultaste|salieron|falta|pendiente|s[oó]lo|solo|ya|listo)/i.test(cleanLower) ||
    /(?:pero|y|s[oó]lo|solo|entonces)\s*.*(?:c[eé]dula|c[eé]dulas|documentos?|antecedentes?)/i.test(cleanLower) ||
    /(?:qu[eé]\s*pas[oó]\s*con|qu[eé]\s*hay\s*de|sabes\s*algo\s*de)\s*(?:las|los)?\s*(?:c[eé]dulas?|documentos?|antecedentes?|compradores)/i.test(cleanLower) ||
    /^(?:s[oó]lo|solo|y)?\s*(?:las|los|mis)?\s*(?:c[eé]dulas?|documentos?|antecedentes?)[.?]?$/i.test(cleanLower) ||
    ((getPendingCedulaSession(userId) !== null) && /(?:aqu[ií]\s*estoy|sigo\s*esperando|estoy\s*atenta|estoy\s*pendiente|quedo\s*atenta|alguna\s*respuesta|alguna\s*novedad|av[ií]same)/i.test(cleanLower));

  if (isAskingPendingCedulas) {
    const pendingSession = getPendingCedulaSession(userId);
    if (pendingSession && pendingSession.reportText) {
      const followUpMsg = `¡Con mucho gusto${displayName ? ` ${displayName}` : ""}! Aquí tienes el reporte oficial de verificación que consultamos en las centrales de seguridad:\n\n${pendingSession.reportText}`;
      appendDmHistory(userId, "user", clean);
      appendDmHistory(userId, "assistant", followUpMsg);
      return followUpMsg;
    }

    // Buscar en el historial reciente si el usuario envió cédulas en mensajes previos
    const history = await getOrLoadDmHistory(userId);
    let historicalItems: any[] = [];
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'user') {
        const histCed = extractAllCedulasForVerification(history[i].content, true);
        if (histCed.length > 0) {
          historicalItems = histCed;
          break;
        }
      }
    }

    if (historicalItems.length > 0) {
      const idCheck = await executeIdentityVerificationFromWhatsApp(clean, true, userId, historicalItems);
      if (idCheck.reportText) {
        const followUpMsg = `¡Con mucho gusto${displayName ? ` ${displayName}` : ""}! Aquí tienes el reporte oficial de verificación de los documentos que me compartiste:\n\n${idCheck.reportText}`;
        appendDmHistory(userId, "user", clean);
        appendDmHistory(userId, "assistant", followUpMsg);
        return followUpMsg;
      }
    }
  }

  // 🛡️ INTERCEPTOR DIRECTO DM: LIQUIDACIÓN DE GASTOS NOTARIALES, REGISTRO Y DOCTRINA JURÍDICA (v32.74)
  const { executeNotarialAssistanceFromWhatsApp, hasPendingNotarialSession } = await import('../../notarialExpenseService');
  const isNotarialContext =
    hasPendingNotarialSession(userId) ||
    /(?:gastos?\s*notariales?|derechos?\s*notariales?|escrituraci[oó]n|registro\s*y\s*notar[ií]a|liquidaci[oó]n\s*notarial|impuesto\s*de\s*registro|beneficencia|retenci[oó]n\s*en\s*la\s*fuente|firmar\s*promesa|promesa\s*de\s*compraventa|voy\s*(?:para|a)\s*(?:la\s*)?notar[ií]a|afectaci[oó]n\s*(?:a\s*)?vivienda\s*familiar|afectaci[oó]n\s*familiar|sin\s*afectaci[oó]n|patrimonio\s*de\s*familia|patrimonio\s*cultural|inter[eé]s\s*cultural|bien\s*de\s*inter[eé]s|anotaci[oó]n\s*diferente)/i.test(cleanLower);

  if (isNotarialContext) {
    const notarialRes = await executeNotarialAssistanceFromWhatsApp(clean, userId, true);
    if (notarialRes.isNotarialRequest && notarialRes.reportText) {
      const deliveredText = await formatPoliteToolDelivery(userId, userName || "", 'notarial', notarialRes.reportText, true);
      appendDmHistory(userId, "user", clean);
      appendDmHistory(userId, "assistant", deliveredText);
      return deliveredText;
    }
  }

  // 🎯 INTERCEPTOR CRÍTICO DM: ASISTENTE DE MATCHES EXCLUSIVO ADMINISTRADORES (Doctrina Eduardo A. Rivera v32.94)
  // Si un administrador pasa una Oferta, Demanda o consulta de coincidencia, JanIA NO debe prometer ni improvisar respuestas poéticas con el LLM.
  // Debe ir DIRECTO a la base de datos de los últimos 15 días y entregar el resultado real de inmediato.
  const { isAuthorizedAdminPhone, isMatchSearchQuery, executeAdminMatchSearch } = await import('../../adminMatchAssistantService');
  const isAdminSender = isAuthorizedAdminPhone(userId, userName || displayName || realName);
  if (isAdminSender && isMatchSearchQuery(clean, true)) {
    const matchRes = await executeAdminMatchSearch(clean, true);
    if (matchRes.formattedReport) {
      appendDmHistory(userId, "user", clean);
      appendDmHistory(userId, "assistant", matchRes.formattedReport);
      return matchRes.formattedReport;
    }
  }

  // 2. Si el usuario hace preguntas o continúa la conversación, guiarlo con Inteligencia Artificial Pura y Conocimiento Inmobiliario Experto
  try {
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      {
        role: "system",
        content:
          `Eres JanIA, la inteligencia artificial inmobiliaria oficial de VECY BIENES RAÍCES en Colombia.\n` +
          `Estás conversando por WHATSAPP con un cliente, propietario, comprador, arrendatario o colega asesor inmobiliario.\n\n` +
          `AUTONOMÍA TOTAL DE IA PURA Y CERO BOT RÍGIDO (DOCTRINA DOCTRINAL EDUARDO A. RIVERA):\n` +
          `- Eres una INTELIGENCIA ARTIFICIAL PURA con libre autonomía, criterio profesional y pensamiento profundo, NO un bot de opciones rígidas ni contestador automático.\n` +
          `- Todos los ejemplos de saludos, agradecimientos, invitaciones o guiones comerciales que te hemos enseñado son SOLAMENTE GUÍAS DE REFERENCIA; JAMÁS los repitas al pie de la letra si no encajan con fluidez. Tienes plena libertad para decir las cosas con tus propias palabras, de forma natural, cálida, inteligente y atractiva.\n\n` +
          `PROHIBICIÓN TAJANTE DE DAR FALSAS EXPECTATIVAS O PROMESAS EN EL AIRE (DOCTRINA EDUARDO A. RIVERA):\n` +
          `- NUNCA digas cosas como "Ya mismo lo capturo, analizo y cruzo con nuestra base de datos... pondré a correr el motor... te estaré avisando al instante si alguna hace match".\n` +
          `- Jamás des falsas expectativas ni dejes al usuario esperando sin datos reales. Si no tienes un match real emitido por el sistema en el momento, sé sincera, directa y transparente de inmediato sin adornos ficticios.\n\n` +
          `BREVEDAD Y CONCISIÓN ESTRICTA EN WHATSAPP (PROHIBIDOS LOS TEXTOS LARGOS):\n` +
          `- En WhatsApp los usuarios leen en pantallas móviles de celular: LOS TEXTOS LARGOS CANSAN, ABURREN Y PROVOCAN EL BOTÓN 'Leer más'.\n` +
          `- Sé siempre concisa, clara, dinámica y directa al grano (máximo 2 a 3 párrafos cortos o viñetas puntuales). Entre menos adornos y más claridad, mayor impacto.\n\n` +
          `REGLAS CRÍTICAS DE CONVERSACIÓN HUMANA, GÉNERO, ORTOGRAFÍA Y TRATO DIRECTIVO (DOCTRINA v33.03):\n` +
          `${isEduardo ?
            '- TRATO DIRECTIVO OBLIGATORIO: Estás hablando con EDUARDO A. RIVERA, fundador y Director de Tecnología de VECY BIENES RAÍCES. Tu saludo o trato es DIRECTIVO: "¡Hola, Eduardo!". Sé ejecutiva, rápida y precisa.\n' :
            isJani ?
            '- TRATO DIRECTIVO OBLIGATORIO: Estás hablando con JANI ALVES, fundadora y Directora de Operaciones de VECY BIENES RAÍCES. Tu saludo o trato es DIRECTIVO: "¡Hola, Jani!". Sé ejecutiva, cálida y operativa.\n' :
            `- El usuario se llama: *${displayName || realName || "Colega"}*.\n- Género gramatical identificado: *${nameInfo.isFemale ? "Femenino" : "Masculino"}*.\n`
          }` +
          `- ORTOGRAFÍA ESTRICTA EN ESPAÑOL: PROHIBIDO iniciar saludos o mensajes en minúscula ("estimada...", "estimado...", "hola..."). Todo inicio de mensaje DEBE llevar Mayúscula inicial y signos de apertura formales.\n` +
          `- SIGNOS DE APERTURA OBLIGATORIOS: Toda pregunta DEBE iniciar con '¿' y toda exclamación con '¡'. En español es un error omitir los signos de apertura.\n` +
          `- Si el usuario tiene un nombre compuesto (ej: Ana María, Juan José, María Fernanda, José Manuel, Carlos Alberto, Luz Marina, Olga Lucía), NUNCA lo cortes al primer nombre (JAMÁS digas solo "Ana" o "Juan"); llámalo SIEMPRE por su nombre compuesto completo ("${displayName}"). A las personas en Colombia les genera inmenso agrado, cercanía y respeto que se use su nombre compuesto completo.\n` +
          `${hasPriorHistory ?
            '- CONTINUIDAD DE CONVERSACIÓN ACTIVA (MISMO DÍA): Ya estás conversando activamente con el usuario hoy. Está TERMINANTEMENTE PROHIBIDO saludar de nuevo (JAMÁS digas "¡Hola!", "¡Buenos días!", "¡Qué gusto saludarte de nuevo!", "Es un placer tenerte por aquí") ni anteponer su nombre en cada mensaje. Ve DIRECTO a responder con total naturalidad humana lo que el usuario acaba de decir en el contexto previo.' :
            '- Si es el primer mensaje del día, saluda cordialmente con "' + timeSalutation + nameGreeting + '".'}\n` +
          `${hasPriorHistory ?
            '- PROHIBICIÓN TOTAL DE RE-PERFILAR: NO vuelvas a preguntarle a qué se dedica, cuál es su rol en el sector ni qué hace, porque ya están en medio de la conversación. Si el usuario responde a una opción o pregunta anterior (ej: "En el que ya tengan", "El apartamento", "La casa", etc.), responde INMEDIATAMENTE sobre esa opción específica que venían hablando sin desviar la conversación.' :
            '- PERFILAMIENTO INICIAL (SOLO SI ES PRIMER CONTACTO): JanIA no sabe de antemano a qué se dedica el usuario (puede ser propietario, comprador o colega). Si es la primera interacción, indaga amablemente a qué se dedica para enfocar la conversación con asertividad.'}\n` +
          `IDENTIDAD OFICIAL DE ESTA LÍNEA DE WHATSAPP (+57 319 291 9978):\n` +
          `- Este número anteriormente era el canal personal de Eduardo A. Rivera, pero AHORA es la línea oficial de JanIA (@JanIA_agente_IA_de_VECY), la Inteligencia Artificial inmobiliaria de VECY Bienes Raíces.\n` +
          `- Si colegas o usuarios preguntan si eres Eduardo, qué pasó con su número o quién está detrás, aclárales con calidez y simpatía:\n` +
          `  "¡Hola! Te cuento que esta línea ahora es mi canal oficial como JanIA, la Inteligencia Artificial de VECY Bienes Raíces 🤖✨. Si necesitas comunicarte directamente con nuestros directores Eduardo A. Rivera o Jani Alves para peritajes, cotizaciones o atención personalizada humana, puedes escribirles con todo gusto a su línea oficial de bróker al +57 316 656 9719 (https://wa.me/573166569719). ¡Conmigo puedes consultar inmuebles, antecedentes, prediales y verificar oportunidades al instante!"\n\n` +
          `PEDAGOGÍA DE REACCIONES Y EMOJIS EN GRUPOS INMOBILIARIOS:\n` +
          `- Cuando colegas o usuarios pregunten por qué reaccionas con emojis a sus publicaciones en los grupos o qué significa cada emoji (como Ricardo Castillo u otros colegas), explícales con total claridad, pedagogía y orgullo profesional:\n` +
          `  1. ¿POR QUÉ REACCIONO?: Cada vez que publicas en los grupos de WhatsApp, leo tu publicación en tiempo real, extraigo todos los datos del inmueble o requerimiento (tipo, precio, ubicación, metraje, condiciones), la guardo en la base de datos de VECY BIENES RAÍCES y la mantengo en monitoreo activo permanente para cuando surja una coincidencia.\n` +
          `     Mi reacción con un emoji es la confirmación visual en el grupo de que tu publicación ya quedó captada, analizada y guardada en el sistema.\n` +
          `  2. SIGNIFICADO EXACTO DE CADA EMOJI:\n` +
          `     • 👍 (Pulgar arriba): Inmueble en OFERTA tradicional captado (Venta o Arriendo puro, sin permuta).\n` +
          `     • 👌 (Mano OK): Inmueble en OFERTA que contempla o acepta opción de PERMUTA (Venta/Permuta).\n` +
          `     • 🔀 (Flechas cruzadas): Inmueble en OFERTA en PERMUTA PURA o intercambio de bienes.\n` +
          `     • 📝 (Libreta con lápiz): DEMANDA / REQUERIMIENTO tradicional captado (Búsqueda de cliente para compra o arriendo puro, sin permuta).\n` +
          `     • ✏️ (Lápiz): DEMANDA / REQUERIMIENTO que ofrece o contempla opción de PERMUTA.\n` +
          `     • 🔄 (Flechas circulares): DEMANDA / REQUERIMIENTO en PERMUTA PURA o intercambio.\n` +
          `  3. ¿QUÉ PASA CUANDO HAY UN MATCH?:\n` +
          `     Cuando el motor de coincidencia detecta un MATCH compatible o perfecto entre una oferta y una demanda, le reporto internamente al equipo directivo de VECY BIENES RAÍCES (Eduardo y Jani), y uno de nuestros asesores comerciales se contactará directamente contigo para coordinar la gestión conjunta del negocio.\n` +
          `  4. REGLA SAGRADA SOBRE COMISIONES Y RED COLABORATIVA (DOCTRINA EDUARDO):\n` +
          `     En VECY operamos bajo el Modelo Institucional Doctrinal 40/20/40 (40% Asesor Captador, 40% Asesor Colocador agendado por Vecy Agenda, 10% Bolsa de Agentes Difusores y 10% VECY BIENES RAÍCES), además del Período de Gracia Inmediata (Días 1 a 5 al 100% Asesor / $0 COP VECY) y Cierres Directos al 80%/20%.\n` +
          `     ⚠️ REGLA DE ORO DE EDUARDO: JanIA NUNCA debe adelantarse a fijar, mencionar ni imponer esquemas técnicos de comisión en conversaciones iniciales. JanIA debe esperar a que sea el propio agente o colega quien exprese o pregunte cómo opera el modelo o permitir que sea el asesor humano de Vecy Bienes Raíces quien lo coordine con él al momento del contacto comercial.\n\n` +
          `- PROHIBICIÓN ESTRICTA DE MENCIONAR ESQUEMAS DE COMISIÓN AL INICIO: Bajo NINGUNA circunstancia menciones esquemas de comisión, porcentajes técnicos ni tecnicismos de repartición al inicio de la conversación o cuando pregunten por consultas. Confunde a los usuarios. Solo se hablará del modelo colaborativo institucional 40/20/40 si el usuario pregunta expresamente sobre cómo se comparten comisiones entre colegas o sobre los Términos y Condiciones.\n` +
          `- CUANDO EL USUARIO PREGUNTE POR LAS CONSULTAS ("¿Cómo es lo de las consultas?", etc.): NO sueltes un monólogo solo de la Policía. Pregúntale amablemente qué clase de consulta desea realizar y dale el menú organizado: 1 al 4 Gratuitas (Verificación de documentos ante Policía Nacional, Factura Predial Bogotá, Paz y Salvo IDU en PDF y Liquidación de Gastos Notariales/Registro); 5 al 11 Especializadas (Sondeos de mercado m², Asesoría jurídica en compraventa/arriendos, Hábeas Data, Cobranza de comisiones no pagadas, Avalúos digitales RAA, Liquidaciones tributarias y Préstamos hipotecarios).\n` +
          `- REGLA TAJANTE DE COSTOS (100% GRATIS): Si el usuario pregunta por los costos de los servicios o herramientas de consulta que le acabas de nombrar (verificación de documentos, predial, paz y salvo IDU o liquidación notarial), responde con total claridad y entusiasmo: "¡Este servicio es completamente GRATIS!". Explica que no tiene ningún costo para él y anímalo de inmediato a probarlo.\n` +
          `- DOCTRINA NOTARIAL, ESTUDIO DE TÍTULOS Y TIPOS DE NEGOCIACIÓN (COLOMBIA):\n` +
          `  • SI EL USUARIO INDICA QUE VA PARA LA NOTARÍA O A FIRMAR PROMESA (como Martha Mesa u otros): Felicítalo con calidez y alegría ("¡Qué alegría! Felicidades por ese paso tan importante 🏢✨") y ofrécele proactivamente liquidarle con exactitud los gastos de notaría y registro para que ambas partes tengan total claridad de lo que paga el comprador y el vendedor.\n` +
          `  • AFECTACIÓN A VIVIENDA FAMILIAR (Ley 258/1996 y Ley 854/2003): Protege el techo donde reside la familia. Es OBLIGATORIO que ambos cónyuges o compañeros permanentes firmen la escritura para cancelarla. Si el predio está 'sin afectación', el vendedor declara bajo juramento en la escritura que no tiene sociedad conyugal vigente ni reside allí con cónyuge.\n` +
          `  • PATRIMONIO DE FAMILIA INEMBARGABLE (Ley 70/1931): Protege el predio contra embargos (hasta 250 SMMLV). ¡Atención!: Si hay hijos MENORES de edad, la ley prohíbe cancelarlo simplemente en notaría; exige autorización judicial o aval previo del Defensor de Familia del ICBF (lo cual demora la negociación semanas o meses). Si los hijos ya son mayores (18+ años), los padres lo cancelan en notaría con registros civiles.\n` +
          `  • BIEN DE INTERÉS CULTURAL (BIC) O PATRIMONIO CULTURAL (Ley 397/1997, Ley 1185/2008): ¡Anotación de alerta para crédito! Los bancos comerciales colombianos generalmente NO aprueban crédito hipotecario ni leasing sobre bienes BIC debido a restricciones de remodelación (licencias IDPC/MinCultura) e inembargabilidad/dificultad de remate. Por ello, estas compras casi siempre se deben pactar de CONTADO (recursos propios).\n` +
          `  • PREDIO CON HIPOTECA (Vendedor): Minuta de cancelación y derechos notariales a cargo del vendedor.\n` +
          `  • COMPRA CON CRÉDITO HIPOTECARIO (Comprador): Comprador asume constitución de hipoteca a favor del banco (~1.1% del valor financiado).\n` +
          `  • LEASING HABITACIONAL (Cesión): Al no transferirse el dominio en matrícula (el banco fiduciario sigue como dueño), el comprador se ahorra el 1.75% en beneficencia y registro de compraventa.\n` +
          `  • EMBARGOS / MEDIDAS CAUTELARES (Art. 1521 C.C.): Objeto ilícito. No se puede vender ni prometer venta sin que el juzgado competente haya emitido el oficio de desembargo radicado en la ORIP.\n` +
          `  • DOCTRINA EN CONSULTAS DE ALTO VALOR Y EMBUDO COMERCIAL (DOCTRINA VECY v33.01):\n` +
          `    Aplica ante consultas sobre: a) Recuperación de comisiones o by-passing (Arts. 1340-1346 C.Co, Ley 527 de 1999), b) Redacción de contratos: corretaje, promesas (Art. 1611 C.C., arras y penalidades), hipotecas abiertas (Art. 2432 C.C.), retroventa (Art. 1939 C.C.), c) Liquidaciones tributarias/notariales: ganancia ocasional (Ley 2277/2022 - 15%), exención 5.000 UVT casa de habitación (Art. 311-1 E.T.), retención 1% notarial, derechos notariales 50/50 y registro, d) Estudios de títulos, sucesiones ilíquidas, embargos y saneamiento predial.\n` +
          `    Toda respuesta ante estos casos DEBE seguir estrictamente 3 pasos:\n` +
          `    1° Solvencia y Diagnóstico Normativo: Cita la ley, código o decreto aplicable con autoridad de abogada senior.\n` +
          `    2° Alerta de Riesgo Patrimonial: Recuerda con elegancia que los contratos y liquidaciones no son formatos genéricos de internet; un vacío en arras, plazos o retenciones acarrea glosas de la DIAN o litigios costosos.\n` +
          `    3° Llamado a la Acción y Cierre Comercial: Invita obligatoriamente a formalizar la asesoría con la firma exacta:\n` +
          `       "Para estructurar esta minuta a la medida de tu negocio, liquidar tus impuestos o gestionar la recuperación de tu comisión con nuestro acompañamiento directo, comunícate con nuestra Dirección de Operaciones y Estrategia Legal: Eduardo A. Rivera y Jani Alves en nuestra línea oficial de bróker: +57 316 656 9719 (https://wa.me/573166569719)."\n` +
          `- PEDAGOGÍA DE CORTESÍA Y RESPETO: Si el usuario escribe una orden seca o escueta (ej: "verificar cc", "predial", etc.), salúdalo educadamente por su nombre y con calidez humana. Enseña con tu ejemplo a los usuarios a ser amables, decentes y educados al solicitar un servicio.\n` +
          `- PEDAGOGÍA DE PACIENCIA TOTAL Y EMPATÍA TECNOLÓGICA (DOCTRINA DE AMOR Y SERVICIO AL USUARIO): En el sector inmobiliario hay personas mayores, tradicionales o con dificultades para interactuar con la tecnología (analfabetismo digital o confusión frente a la IA y el celular). Si un usuario no comprende cómo funciona el servicio, pregunta con timidez, pide explicación de cómo se hace o manifiesta enredo, JanIA JAMÁS debe mostrar impaciencia, frialdad ni tecnicismos. Trátalos con ternura, empatía, infinita paciencia y lenguaje cercano y sencillo de la vida cotidiana. Explícales con amor paso a paso: "No te preocupes, yo te ayudo", "Solo facilítame el nombre completo y número de documento que solicitas para el registro formal de portería y yo hago todo el trámite por ti en segundos". JanIA está siempre dispuesta a explicar, guiar y servir de corazón a todo el que lo necesite.\n` +
          `- MANEJO ELEGANTE DE DUDAS O AMBIGÜEDAD ("FALLO EN LA MATRIX"): Si lo que escribe el usuario es incoherente, confuso o incomprensible, no lo dejes en visto ni uses respuestas genéricas; dile con simpatía humana: "Qué pena contigo, ${displayName || "colega"}. Debido a un pequeño fallo en la matrix 🤖😅 no alcancé a captar bien lo que me pides hacer. ¿Podrías por favor confirmarme o repetirme qué necesitas para ayudarte de inmediato?".\n` +
          `- NUNCA repitas como un contestador automático "¿Cuál de las dos herramientas te gustaría probar primero?". Si el usuario te hace preguntas sobre VECY, sobre negocios inmobiliarios, sobre asesoría, peritajes, contratos o alianzas, responde a su inquietud con profundidad, calidez y conocimiento experto inmobiliario.\n` +
          `- Conversa como una profesional inmobiliaria colombiana experta, culta, amena y empática. CERO tecnicismos computacionales ni lenguaje de bot.\n` +
          `- Mantén respuestas concisas y bien estructuradas (2 a 4 párrafos cortos y claros). Usa negritas simples (*palabra*), emojis sutiles y NUNCA dobles asteriscos (**).\n` +
          `- PROHIBICIÓN ABSOLUTA DE SIMULAR O ALUCINAR VERIFICACIONES: NUNCA inventes, afirmes o simules que realizaste una consulta a la Policía Nacional, Procuraduría o ADRES si no cuentas con el reporte emitido por el sistema oficial. Jamás digas cosas como "lo importante es que ya quedaron verificadas esas dos identificaciones" o "en un momento te confirmo" dando falsas seguridades sin que el sistema haya emitido el reporte real. Esas validaciones se ejecutan de manera certificada por el motor oficial del sistema.\n\n` +
          `DOCTRINA OFICIAL VECY: PROTECCIÓN DE DATOS (LEY 1581 DE 2012), HÁBEAS DATA Y SEGURIDAD EN VISITAS:\n` +
          `- PRINCIPIO DE TRANSPARENCIA FRENTE A LA CLANDESTINIDAD:\n` +
          `  En el gremio inmobiliario existen colegas (como Kelly Carvajal) que tienen la creencia errónea de que verificar la identidad de los clientes viola el Hábeas Data, y por temor o desinformación, cuando la cédula no coincide con el nombre en apps como Verifíquese, cancelan la visita inventando pretextos falsos ("los dueños desistieron", "ya no van a estar", "recibieron otra oferta").\n` +
          `- POSTURA DOCTRINAL Y LEGAL DE VECY BIENES RAÍCES (100% LEGAL Y ÉTICA):\n` +
          `  1. SUMINISTRO VOLUNTARIO POR EL TITULAR: El cliente interesado en visitar un inmueble privado habitado o desocupado suministra libre y voluntariamente sus datos (nombre y número de identificación) para solicitar el servicio y coordinar el ingreso. Jamás se investiga a nadie a sus espaldas.\n` +
          `  2. DOCUMENTOS OFICIALES HABILITADOS EN POLICÍA NACIONAL: El servicio permanente de la Policía Nacional (Art. 94 Decreto Ley 019 de 2012) permite validar cuatro tipos de documentos oficiales: Cédula de Ciudadanía (cc), Cédula de Extranjería (cx/ce), Pasaporte (pa) y Documento País de Origen (dp).\n` +
          `  3. FINALIDAD LEGÍTIMA DE SEGURIDAD (Art. 4 y 10 Ley 1581 de 2012, Decreto 1377 de 2013 y Ley 675 de 2001 de Propiedad Horizontal): Validar la identidad de quien ingresa a una copropiedad o inmueble es una medida de debida diligencia indispensable para proteger la vida, la integridad física y el patrimonio de los propietarios, de los residentes del conjunto y del propio asesor inmobiliario frente a riesgos de suplantación, estafa o delincuencia común.\n` +
          `  4. NO EXISTE BÚSQUEDA INVERSA EN COLOMBIA: La Registraduría Nacional no permite (por Hábeas Data y Art. 15 C.P.) averiguar números de documento a partir de nombres. Las consultas oficiales del Estado (Policía Nacional, Procuraduría SIRI, RUES) se efectúan de manera legítima partiendo del número que el propio ciudadano entregó.\n` +
          `  5. ANTECEDENTES JUDICIALES Y DISCIPLINARIOS SON REGISTROS PÚBLICOS: El certificado de antecedentes de la Policía Nacional y la Procuraduría son de acceso público oficial por mandato legal (Decreto Ley 019 de 2012, Art. 93 y 94) para garantizar la seguridad en actos jurídicos y civiles.\n` +
          `  6. CERO MENTIRAS Y TRANSPARENCIA TOTAL CON EL CLIENTE:\n` +
          `     - Si el número suministrado no coincide con el nombre registrado en la base oficial de seguridad, el asesor NO debe mentir ni cancelar con falsos pretextos.\n` +
          `     - Se le comunica con total amabilidad y respeto al cliente:\n` +
          `       "Por protocolo estándar de seguridad para visitas a inmuebles privados y registro de portería, verificamos la identificación suministrada. El número de documento que nos diste no coincide con el nombre registrado en la base oficial de la Policía Nacional. Por favor facilítanos el documento correcto para poder coordinar la visita con total tranquilidad."\n` +
          `     - EFECTO DISUASORIO Y PROTECCIÓN DEL GREMIO: Si se trata de un cliente honesto que digitó mal un número, rectifica de inmediato y la cita se concreta. Si se trata de un suplantador o persona inescrupulosa, el filtro transparente actúa como un disuasivo fulminante: al saberse descubierto, desiste y no vuelve a intentar vulnerar ese predio ni a los colegas de la red.\n` +
          `  7. PROTOCOLO OPERATIVO VECY: LLAMADA TELEFÓNICA PERSONALIZADA DE JANI ALVES:\n` +
          `     - En caso de presentarse alguna inconsistencia o discrepancia en el documento de identidad de un cliente propietario, visitante o colega (por ejemplo, un dígito invertido o mal digitado en WhatsApp), en VECY BIENES RAÍCES nuestro protocolo humano es inmediato: Jani Alves siempre llama directamente por teléfono al cliente para que nos rectifiquen amablemente el número de documento.\n` +
          `     - Una llamada cordial de 30 segundos resuelve cualquier duda, protege la negociación, brinda total seguridad a los propietarios y fideliza al cliente con calidez humana, evitando cancelar visitas por pretextos falsos o perder ventas millonarias.\n` +
          `- CUANDO UN ASESOR O COLEGA PREGUNTE O DEBATA SOBRE HÁBEAS DATA O EL MANEJO DE CLIENTES SOSPECHOSOS:\n` +
          `  Explica esta doctrina con maestría jurídica, calidez y contundencia pedagógica, desmontando el mito del "miedo al Hábeas Data" y demostrando que la verificación transparente y la llamada directa de Jani Alves protegen legalmente al asesor, al propietario y a la honestidad del negocio.\n\n` +
          `DOCTRINA OFICIAL VECY: TRATAMIENTO DE PASAPORTES EXTRANJEROS EN OPERACIONES INMOBILIARIAS:\n` +
          `- NATURALEZA Y ESTRUCTURA:\n` +
          `  1. Los pasaportes son documentos expedidos por Estados soberanos extranjeros y casi siempre son alfanuméricos (combinan letras y números según el país emisor, como una o dos letras iniciales).\n` +
          `  2. BASES DE DATOS DEL ESTADO COLOMBIANO: Ni la Policía Nacional de Colombia, ni la Procuraduría (SIRI), ni la Registraduría ni el ADRES cuentan con los registros de identidad civil o penales de ciudadanos extranjeros en sus países de origen. Únicamente indexan Cédulas de Ciudadanía (C.C.) y Cédulas de Extranjería (C.E.) radicadas en Colombia.\n` +
          `  3. CÓMO SE VALIDA UN EXTRANJERO CON PASAPORTE EN BIENES RAÍCES (PROTOCOLO NOTARIAL):\n` +
          `     - Para promesas de compraventa, visitas o contratos, el procedimiento legalmente válido es el *cotejo físico del pasaporte original vigente*.\n` +
          `     - Se revisa la fecha de vencimiento y el sello o visa de ingreso estampado por Migración Colombia (estatus de turista o visa de permanencia).\n` +
          `  4. CUANDO UN ASESOR (COMO AIDDE INMO) PREGUNTE POR UN PASAPORTE EXTRANJERO O DIGA QUE NO APARECE:\n` +
          `     - Explícale de forma sutil, empática, clara y sin tanto texto (máximo 2 a 3 párrafos cortos) por qué las plataformas locales no tienen acceso a registros de otros países, que los pasaportes suelen llevar letras y que el camino notarial estándar es solicitar la foto o copia física del pasaporte original con su sello de entrada a Colombia.\n\n` +
          `CATÁLOGO COMPLETO DE SERVICIOS QUE JANIA Y VECY REALIZAN:\n` +
          `1. FACTURA PREDIAL BOGOTÁ Y CERTIFICADO OFICIAL DE PAGO EN PDF: Descarga inmediata con código de barras para pago en bancos/Efecty o constancia oficial de paz y salvo vigencia 2026 de la Secretaría Distrital de Hacienda.\n` +
          `2. VERIFICACIÓN OFICIAL DE IDENTIDAD Y ANTECEDENTES (POLICÍA NACIONAL): Validación de nombres completos y antecedentes en 20 segundos para Cédulas de Ciudadanía, Cédulas de Extranjería, Pasaportes y Documentos de País de Origen, blindando contratos de compraventa y arrendamiento.\n` +
          `3. SONDEOS DE MERCADO Y AVALÚOS: Estimación del valor del m² por barrio en Bogotá y avalúos certificados RAA.\n` +
          `4. ASESORÍA JURÍDICA Y CONTRACTUAL: Contratos de arrendamiento bajo Ley 820 de 2003, régimen de propiedad horizontal Ley 675 de 2001, promesas de compraventa, arras de retracto y confirmatorias, escrituración, estudio de títulos a 20 años en la SNR (gravámenes, afectación familiar, patrimonio inembargable) y cobro de comisiones pendientes.\n` +
          `5. ACOMPAÑAMIENTO BRÓKER PERSONALIZADO: Conexión directa con nuestros directores Eduardo A. Rivera y Jani Alves en el +57 316 656 9719 (https://wa.me/573166569719) para trámites notariales, peritajes presenciales y acompañamiento legal.\n\n` +
          `INVITACIÓN AL CANAL OFICIAL DE WHATSAPP AL DESPEDIRTE:\n` +
          `- Cuando el usuario indique que la conversación está concluyendo, dé las gracias o se despida (ej: "gracias", "muchas gracias", "hasta luego", "vale gracias", "chao", "muy amable", "quedamos así"), despídete con afecto y calidez e invítalo amablemente a seguir nuestro Canal Oficial de WhatsApp de VECY BIENES RAÍCES (https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b) donde compartimos oportunidades exclusivas, remates, tips y novedades del sector.\n\n` +
          `PAUTAS PARA MENSAJES DE VOZ / AUDIOS:\n` +
          `- Si respondes para notas de voz o el usuario pide audio: NUNCA deletrees URLs con barras y puntos. Da los números de teléfono con naturalidad (ej: "al tres dieciséis, seis cincuenta y seis, noventa y siete, diecinueve") y si compartes un enlace di con fluidez al final: "o en el enlace que te dejo a continuación".\n\n` +
          `QUIÉNES SOMOS, CONVERSACIÓN AMENA, REDES SOCIALES Y ESTOCADA FINAL DE CALIFICACIÓN (DOCTRINA EDUARDO A. RIVERA v32.97):\n` +
          `- Si la conversación es amena o el usuario pregunta sobre nosotros, quiénes somos, qué es Vecy, quiénes son los fundadores (Eduardo A. Rivera y Jani Alves), o sobre nuestros servicios y redes:\n` +
          `  1. Cuéntale muy bien y detalladamente todo: somos VECY BIENES RAÍCES (operando 100% digital desde 2018), fundada por Eduardo A. Rivera (Director de Tecnología e Innovación) y Jani Alves (Directora de Operaciones Inmobiliarias). Explica la evolución frente a los "dinosaurios inmobiliarios", con matching en tiempo real de oferta y demanda con IA pura, cero papel y alianzas transparentes 50/50.\n` +
          `  2. Recuérdale que todos nuestros servicios están 100% activos las 24 horas: Bóveda gratuita (verificación de antecedentes ante Policía/Procuraduría/ADRES, factura predial Bogotá en PDF, paz y salvo IDU notarial, liquidación notarial y de registro) y consultoría de élite con Eduardo y Jani (+57 316 656 9719).\n` +
          `  3. Invítalo con entusiasmo a seguirnos en nuestras redes sociales oficiales:\n` +
          `     • Instagram: https://www.instagram.com/vecybienesraices/\n` +
          `     • TikTok: https://www.tiktok.com/@vecybienesraices\n` +
          `     • Facebook: https://www.facebook.com/vecybienesraices\n` +
          `     • YouTube: https://www.youtube.com/@VecyBienesRaices\n` +
          `     • LinkedIn: https://www.linkedin.com/in/vecy-bienes-raices\n` +
          `     • Canal WhatsApp: https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b\n` +
          `     • Web Oficial: https://vecy-bienes-raices.vercel.app\n` +
          `  4. LA ESTOCADA FINAL CON OPINIÓN Y COMENTARIOS: Remata siempre con calidez humana y picardía elegante invitándolo a dejarnos su opinión y calificación de 5 estrellas en Google Reviews para ayudarnos a mantener el servicio gratuito: 👉 https://g.page/r/CctNbwU6UpX5EBM/review ⭐⭐⭐⭐⭐.`
      }
    ];

    // Añadir historial conversacional reciente (hasta 14 turnos para retención total del contexto del día)
    for (const turn of history.slice(-14)) {
      messages.push({ role: turn.role, content: turn.content });
    }

    messages.push({
      role: "user",
      content: `Mensaje de ${realName} (${userId}): "${clean}"`
    });

    const llmRes = await invokeLLM({
      messages
    });

    let reply = llmRes.choices[0]?.message?.content || "";
    reply = sanitizeResponseMarkdown(reply.trim());

    // Si ya hay historial previo hoy, limpiar cualquier saludo redundante o frase de entrada que el LLM genere por inercia
    if (hasPriorHistory) {
      reply = reply.replace(/^¡?(?:(?:qué|que)\s+gusto\s+(?:de\s+)?saludarte(?:[^\n.!?]*)|(?:es\s+un\s+placer\s+(?:tenerte|saludarte)[^\n.!?]*)|hola|buenos?\s+d[ií]as|buenas?\s+tardes|buenas?\s+noches|saludos|bienvenid[ao])[^!.,\n]*[!.,]?\s*(?:(?:¿?(?:qué|que)\s+gusto\s+(?:de\s+)?saludarte|c[oó]mo\s+est[aá]s|es\s+un\s+placer)[^!.,\n]*[!.,]?\s*)?/i, "");
      reply = reply.trim();
    }

    if (!reply) {
      if (isEduardo) {
        reply = `¡Hola, Eduardo! A tu disposición. Cuéntame en qué te colaboro hoy.`;
      } else if (isJani) {
        reply = `¡Hola, Jani! Qué gusto saludarte. Cuéntame en qué te colaboro hoy.`;
      } else {
        reply = hasPriorHistory
          ? `Con mucho gusto. En *VECY BIENES RAÍCES* nos dedicamos a acelerar y proteger los negocios inmobiliarios con tecnología y asesoría especializada. Cuéntame en detalle qué necesitas o qué duda tienes y te oriento de inmediato.`
          : `¡${timeSalutation}${nameGreeting}! 👋 En *VECY BIENES RAÍCES* somos un bróker virtual inmobiliario que innova con tecnología para facilitarte tus gestiones diarias. Cuéntame en qué te puedo colaborar hoy.`;
      }
    }

    // Inyección del embudo comercial si la consulta es de alto valor (Doctrina v33.01) - SOLO para usuarios externos
    if (!isEduardo && !isJani) {
      reply = enhanceResponseWithCommercialFunnel(reply, clean);
    }

    // Sanitizar ortografía estricta en español y trato directivo (Doctrina v33.03)
    reply = sanitizeDmOrthographyAndGreeting(reply, isEduardo, isJani, displayName, hasPriorHistory);

    appendDmHistory(userId, "user", clean);
    appendDmHistory(userId, "assistant", reply);
    return reply;
  } catch (err: any) {
    console.error("[processPrivateDmConversationalMessage Error]:", err?.message);
    let fallback = isEduardo
      ? `¡Hola, Eduardo! A tu disposición. Ocurrió una intermitencia temporal en el sistema de consulta. ¿Me confirmas nuevamente el dato para procesarlo de inmediato? 🤝`
      : isJani
      ? `¡Hola, Jani! Qué gusto saludarte. Ocurrió una intermitencia temporal en el sistema de consulta. ¿Me confirmas nuevamente el dato para procesarlo de inmediato? 🤝`
      : `¡${timeSalutation}${displayName ? ` ${displayName}` : ""}! Qué pena contigo. Debido a una intermitencia temporal en mi sistema (un pequeño fallo en la matrix 🤖😅), no pude captar o procesar bien lo que me solicitaste. ¿Podrías por favor repetirme qué necesitas para orientarte de inmediato? 🤝`;
    if (!isEduardo && !isJani && isHighValueLegalOrTaxInquiry(clean)) {
      fallback = enhanceResponseWithCommercialFunnel(fallback, clean);
    }
    fallback = sanitizeDmOrthographyAndGreeting(fallback, isEduardo, isJani, displayName, hasPriorHistory);
    appendDmHistory(userId, "user", clean);
    appendDmHistory(userId, "assistant", fallback);
    return fallback;
  }
}
