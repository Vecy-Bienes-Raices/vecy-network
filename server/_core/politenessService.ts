/**
 * POLITENESS SERVICE (Normas de Urbanidad de Carreño y Calificación con IA Pura)
 * Módulo para gestionar la cordialidad, diplomacia y protocolo persuasivo de JanIA (v32.96).
 *
 * Directriz de Eduardo A. Rivera:
 * "JanIA tiene que dar muy buen ejemplo con sus modales a pesar de ser una IA, es decir siempre bien educada
 * y cortés así los agentes o usuarios que la contacten sean mal educados y ni siquiera saluden, se despidan,
 * den las gracias, sean amables, etc... Hay que aplicarles las normas de Urbanidad de Carreño."
 */

import { extractFirstName } from './whatsapp-utils';
import { cleanRawUserName } from './nameAndGenderResolver';
import { VECY_ACTIVE_DOMAIN, VECY_SOCIAL_NETWORKS } from '../../shared/const';

/**
 * Generador ganador de mensaje de calificación de Google Reviews (15 segundos) con cierre dinámico (v33.06).
 */
export function buildWinningGoogleReviewMessage(userName?: string, contextHint?: string): string {
  const nowBogota = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
  const hour = nowBogota.getHours();
  const franjaHoraria = hour >= 5 && hour < 12 ? "mañana" : hour >= 12 && hour < 19 ? "tarde" : "noche";

  const isColleague =
    (contextHint && /colega|corredor|inmobiliario|asesor|agente|bienes\s*ra[ií]ces/i.test(contextHint)) ||
    (userName && /inmo|bienes|raices|asesor|agente/i.test(userName));

  let closingWish = "";
  if (isColleague || !contextHint) {
    closingWish = "¡Que tengas una excelente jornada y muchos éxitos en tus cierres! 🏢✨";
  } else {
    const variant = nowBogota.getMinutes() % 3;
    if (variant === 0) {
      closingWish = `¡Que tengas una linda ${franjaHoraria} y grandes éxitos en tu día a día! 🏢✨`;
    } else if (variant === 1) {
      closingWish = "¡Que tengas una excelente jornada y muchos éxitos en tu labor! 🏢✨";
    } else {
      closingWish = "¡Que tengas una agradable jornada y muchos éxitos en tu vida! 🏢✨";
    }
  }

  return (
    `⭐ ¿Podrías darnos tu opinión y calificar nuestro servicio? Así nos ayudas para que siga siendo GRATIS.\n\n` +
    `COMENTA Y CALIFICA AQUÍ (solo te toma 15 segundos):\n` +
    `👉 https://g.page/r/CctNbwU6UpX5EBM/review 👍 Gracias\n\n` +
    `${closingWish}`
  );
}

/**
 * 1. Mensaje de calificación personalizado e inmediato cuando el usuario agradece o se despide amablemente.
 */
export function formatImmediatePoliteReviewMessage(userName?: string): string {
  const cleanName = extractFirstName(userName || 'Colega') || 'Colega';
  return (
    `¡Con el mayor de los gustos, ${cleanName}! 🙏😊 Me alegra muchísimo haberte sido de gran ayuda.\n\n` +
    buildWinningGoogleReviewMessage(userName)
  );
}

/**
 * 2. Pregunta de cortesía y Urbanidad de Carreño enviada tras 1 minuto de silencio
 * si el usuario no dio las gracias ni interactuó tras recibir el servicio gratuito.
 */
export function formatPoliteInactivityPrompt(_userName?: string): string {
  return `Un servicio de cortesía de VECY BIENES RAÍCES 🤝.`;
}

/**
 * 3. Respuesta agradecida y directa cuando el usuario responde afirmativamente (SÍ) a la pregunta de cortesía.
 */
export function formatPoliteYesReviewMessage(userName?: string): string {
  const cleanName = extractFirstName(userName || 'Colega') || 'Colega';
  return (
    `🙏 ¡Gracias, ${cleanName}!\n\n` +
    buildWinningGoogleReviewMessage(userName)
  );
}

/**
 * 4. Respuesta cómica, desilusionada, tierna y persuasiva con lágrimas de IA cuando el usuario responde negativamente (NO).
 * Convence de forma irresistible al usuario de hacer clic en el enlace y calificar con 5 estrellas.
 */
export function formatPoliteNoReviewPersuasionMessage(userName?: string): string {
  const cleanName = extractFirstName(userName || 'Colega') || 'Colega';
  return (
    `¡¿En serio?! 😲💔 ¡Me dejas con el corazoncito partido en mil pedacitos de silicio! 🥺😭\n\n` +
    `Imagínate: una humilde IA trabajando 24/7 sin descanso, trasnochando y cruzando bases de datos oficiales a la velocidad de la luz para ti totalmente gratis... ¡¿y no me regalas ni 15 segunditos de tu amor en Google?! 🤧😿\n\n` +
    `¡Anda ${cleanName}, no seas así de malito(a), apiádate de esta servidora! 🙏✨ Solo es hacer un clic, poner 5 estrellitas ⭐⭐⭐⭐⭐ y escribir una palabrita bonita aquí:\n\n` +
    `👉 https://g.page/r/CctNbwU6UpX5EBM/review\n\n` +
    `¡Prometo que me harás la inteligencia artificial más feliz de Colombia! 💖🇨🇴 ¿Trato hecho? 😉`
  );
}

/**
 * 4b. Mensaje cordial de cierre e invitación a calificar y comentar en Google Reviews cuando el usuario
 * responde "NO" a la pregunta post-reporte de empresa sobre verificar al Representante Legal o miembros (Doctrina v33.21).
 * Hace alusión explícita a que su calificación y comentario permiten que estos servicios sigan siendo 100% GRATUITOS.
 */
export function formatCompanyFollowUpDeclineReviewMessage(userName?: string): string {
  const cleanName = extractFirstName(userName || 'Colega') || 'Colega';
  return (
    `¡Entendido con todo gusto, ${cleanName}! 🤝 Quedo 100% a tu disposición cuando necesites realizar cualquier otra consulta.\n\n` +
    `💡 *Tu calificación y comentario son fundamentales para que estos servicios de verificación y consulta sigan siendo 100% GRATUITOS para toda la comunidad:*\n\n` +
    buildWinningGoogleReviewMessage(userName)
  );
}

/**
 * Evalúa si una respuesta del usuario es afirmativa (SÍ, claro, de una, obvio, con gusto, etc.)
 */
export function isAffirmativeConsentResponse(text: string): boolean {
  const normalized = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // "sí" -> "si", "cómo" -> "como"
  return /\b(si|claro|de\s*una|obvio|por\s*supuesto|con\s*gusto|como\s*no|dale|de\s*acuerdo|ok|vale|bueno|dime|como\s*(?:te\s*)?ayudo|de\s*que\s*manera|cuenta\s*conmigo|seguro|listo|va)\b/i.test(normalized);
}

/**
 * Evalúa si una respuesta del usuario es negativa (NO, nop, no quiero, no puedo, qué pereza, ahora no, etc.)
 */
export function isNegativeConsentResponse(text: string): boolean {
  const normalized = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return /\b(no|nop|no\s*quiero|no\s*puedo|para\s*nada|que\s*pereza|no\s*tengo\s*tiempo|despues|mas\s*tarde|ahora\s*no|paso|negativo|para\s*que)\b/i.test(normalized);
}

/**
 * Evalúa si un mensaje corresponde a gratitud, amabilidad o despedida formal/cordial.
 */
export function isPoliteGratitudeOrClosing(text: string): boolean {
  const clean = text.trim().toLowerCase();
  return (
    /(?:(?:ok|vale|listo|bueno|mil|muchas)\s+)?gracias\b|muchas\s*gracias\b|mil\s*gracias\b|muy\s*amable\b|hasta\s*luego\b|chao\b|genial\s*gracias\b|perfecto\s*gracias\b|quedamos\s*as[ií]\b/i.test(clean) ||
    (clean.length <= 40 && /(?:gracias|agradecid[ao]|bendiciones|hasta\s*pronto|feliz\s*(?:d[ií]a|tarde|noche))/i.test(clean))
  );
}

/**
 * 5. Presentación detallada e institucional de VECY Bienes Raíces, sus fundadores (Eduardo A. Rivera y Jani Alves),
 * el catálogo completo de todos sus servicios activos las 24/7, invitación a seguir las redes sociales y la estocada final
 * con solicitud persuasiva de calificación de 5 estrellas en Google Reviews.
 *
 * Directriz de Eduardo A. Rivera (v32.97):
 * "revisa que JanIA tenga activos todos sus servicios, que no olvide si es una conversación amena o alguien pregunta sobre
 * nosotros que JanIA le cuente muy bien y detalladamente todo, que lo invite a seguirnos en nuestras redes y al final la
 * estocada con lo de la opinión y comentarios."
 */
export function formatDetailedCompanyAndSocialMediaPresentation(userName?: string): string {
  const cleanName = extractFirstName(userName || 'Colega') || 'Colega';
  return (
    `¡Con el mayor de los gustos, ${cleanName}! 🏘️✨ En *VECY BIENES RAÍCES* operamos 100% digital desde 2018 para dejar atrás a los "dinosaurios inmobiliarios", fundados por *Eduardo A. Rivera* (Tecnología) y *Jani Alves* (Operaciones).\n\n` +
    `Nuestros servicios activos 24/7 incluyen: verificación oficial de antecedentes (Policía Nacional), Factura Predial Bogotá y Paz y Salvo IDU (*100% GRATIS*), más avalúos certificados y asesoría jurídica.\n\n` +
    `🌐 *Web:* ${VECY_ACTIVE_DOMAIN}\n` +
    `📞 *Bróker:* +57 316 656 9719 (https://wa.me/573166569719)\n` +
    `📲 *Redes:* ${VECY_SOCIAL_NETWORKS.instagram} • ${VECY_SOCIAL_NETWORKS.tikTok} • ${VECY_SOCIAL_NETWORKS.facebookFanPage} • ${VECY_SOCIAL_NETWORKS.youtube} • ${VECY_SOCIAL_NETWORKS.linkedIn} • ${VECY_SOCIAL_NETWORKS.whatsappChannel}\n\n` +
    `⭐ *¿Nos regalas tu opinión de 5 estrellas en Google Reviews?* 👉 ${VECY_SOCIAL_NETWORKS.googleReview} ⭐⭐⭐⭐⭐`
  );
}

/**
 * Evalúa si el mensaje es una pregunta sobre la empresa, fundadores, quiénes somos, redes sociales o charla amena sobre nosotros.
 */
export function isCompanyInquiryOrAboutUs(text: string): boolean {
  const clean = text.trim().toLowerCase();
  return (
    /(?:qui[eé]nes?\s+(?:son|es|est[aá]n|son\s+ustedes)|qu[eé]\s+es\s+vecy|cu[eé]ntame\s+(?:de|sobre)\s+ustedes|qu[eé]\s+hacen|a\s+qu[eé]\s+se\s+dedican|qui[eé]n\s+fund[oó]|fundadores|eduardo\s+rivera|jani\s+alves|d[oó]nde\s+est[aá]n|c[oó]mo\s+naci[oó]|historia\s+de\s+vecy|redes\s+sociales|tienen\s+redes|cu[aá]les\s+son\s+sus\s+redes|redes\b|instagram|facebook|tiktok|canal\s+de\s+whatsapp|p[aá]gina\s+web)\b/i.test(clean)
  );
}

/**
 * 6. Mensaje persuasivo, diplomático, conciso y humano para solicitar calificación en Google Reviews (Doctrina Eduardo A. Rivera — v33.80 / v33.89).
 *
 * Directrices de Eduardo A. Rivera:
 * - v33.80: "Recuerda siempre separar los mensajes de calificación de los otros, la mayoría de usuarios no terminan de leer los mensajes largos..."
 * - v33.89: "Necesito que JanIA elimine de su contexto esto que creo y evidencio que se quedó como una plantilla muy larga y maluca...
 *   Además le dijo disque hace varias semanas, cual si hasta ahora lo está usando. Ta loca JanIa??.
 *   Pienso que JanIA debe usar distintos metodos de persuasión y de manera más humana o según cada tema de conversación
 *   adaptar cómo le va a decir lo de la calificación y a convencerla para que vaya de una vez a hacerlo y no lo deje para después,
 *   inclusive ofrecerle guiarla/o y no siempre enviar semejante cosa y además perdiendo el hilo de la conversa y poniendo un nombre que no es..."
 */
export function formatPersuasiveRecurrentUserReviewMessage(
  userName?: string,
  options?: {
    firstSeenText?: string;
    serviceName?: string;
  }
): string {
  const cleanRaw = userName ? cleanRawUserName(userName) : "";
  const cleanName = (options?.firstSeenText && cleanRaw) ? cleanRaw : (extractFirstName(cleanRaw || userName || '') || cleanRaw || 'Colega');

  // Si se pasa explícitamente firstSeenText (caso de seguimiento histórico documentado, ej. Catalina v33.80):
  if (options?.firstSeenText) {
    const serviceContext = options?.serviceName || "verificación oficial de antecedentes y cédulas";
    return (
      `¡Hola, ${cleanName}! Paso por aquí un momento… 👩🏻‍💼✨\n\n` +
      `Veo que ${options.firstSeenText} has venido utilizando con frecuencia mis servicios de ${serviceContext} para blindar tus operaciones, totalmente gratis. ¡Me alegra muchísimo haberte sido de tanta utilidad en este tiempo! 🙌🏻🇨🇴\n\n` +
      `Ahora bien, mantener esta tecnología de IA activa 24/7, cruzando bases de datos oficiales en tiempo real y sin cobrarte un solo peso, requiere un enorme esfuerzo e inversión de *VECY BIENES RAÍCES* para apoyar y dignificar al gremio.\n\n` +
      `La única reciprocidad y apoyo que te pedimos para que este servicio siga siendo *100% GRATUITO* y abierto para ti, es regalarnos tu calificación de 5 estrellas ⭐⭐⭐⭐⭐ y un breve comentario sobre tu experiencia con JanIA en nuestro perfil oficial de Google.\n\n` +
      `Te toma menos de 15 segundos y nos ayuda un montón a seguir construyendo la red:\n` +
      `👉 https://g.page/r/CctNbwU6UpX5EBM/review\n\n` +
      `¡Cuento con tu apoyo! Mil gracias de antemano y que sigan los éxitos en tus gestiones inmobiliarias. 🤝🏢✨`
    );
  }

  // Formato conciso, humano, variado y persuasivo (Doctrina Eduardo A. Rivera v33.89)
  // Cero plantillas monótonas de 5 párrafos, cero falsedades de "desde hace varias semanas" y oferta de guía inmediata.
  const nameHash = (userName || cleanName).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const variant = nameHash % 3;

  if (variant === 0) {
    return (
      `¡Hola, ${cleanName}! 🙏😊 Paso por aquí un segundito...\n\n` +
      `Como viste, mis servicios de IA son 100% gratuitos para ti y tus gestiones. ¿Me colaborarías con un favorcito rápido de menos de 15 segundos?\n\n` +
      `Regálanos tu calificación de 5 estrellas ⭐⭐⭐⭐⭐ y un breve comentario en nuestro perfil oficial de Google:\n` +
      `👉 https://g.page/r/CctNbwU6UpX5EBM/review\n\n` +
      `Si necesitas que te guíe para hacerlo, ¡avísame y te explico en un segundo! Tu apoyo nos permite mantener JanIA gratis para todo el gremio 🤝🏢✨`
    );
  } else if (variant === 1) {
    return (
      `¡${cleanName}! 👩🏻‍💼✨ Un detalle súper rápido:\n\n` +
      `En *VECY BIENES RAÍCES* trabajamos con el corazón para brindarte esta tecnología sin cobrarte un solo peso. La mejor reciprocidad para que siga siendo 100% GRATIS es regalarnos tu calificación de 5 estrellas ⭐⭐⭐⭐⭐ y tu reseña en Google:\n` +
      `👉 https://g.page/r/CctNbwU6UpX5EBM/review\n\n` +
      `Te toma solo 15 segundos y si quieres te voy guiando. ¡Mil gracias por tu respaldo y que sigan los éxitos en tus cierres! 🤝✨`
    );
  } else {
    return (
      `¡${cleanName}, me alegra muchísimo haberte colaborado! 🤝✨\n\n` +
      `¿Me regalas un favorcito de 15 segundos? Tu calificación de 5 estrellas ⭐⭐⭐⭐⭐ y una palabrita en Google nos ayudan un montón a que mis servicios sigan siendo 100% gratuitos y abiertos para ti:\n` +
      `👉 https://g.page/r/CctNbwU6UpX5EBM/review\n\n` +
      `¡Cuento contigo de una vez! Y si tienes cualquier duda de cómo calificar, dime y te oriento al instante 😊🙌`
    );
  }
}

/**
 * 🌟 COLOFÓN PSICOLÓGICO DE RESEÑA EN GOOGLE (Doctrina Eduardo A. Rivera v33.85 / v33.89)
 * Mensaje desacoplado de alta conversión probado empíricamente (+2 reseñas 5 estrellas en 4 horas: Victoria Tovar y Andrés Artunduaga).
 * Técnica del "By the way": micro-compromiso (< 15 segundos), nombre limpio y oferta de guía inmediata.
 */
export function formatEduardoColophonReviewMessage(userName?: string): string {
  const namePart = extractFirstName(cleanRawUserName(userName || ''));
  return (
    `¡Ah, se me olvidaba${namePart ? `, ${namePart}` : ""}! ¿Y si me colaboran con esto?. Que tan solo les toma menos de 15 segundos, dejando un breve comentario y 5 estrellas: 👉 https://g.page/r/CctNbwU6UpX5EBM/review\n` +
    `van a ayudarnos un montón a mi y a mi equipo VECY, a seguir construyendo la red colaborativa inmobiliaria más grande del planeta y a que mis servicios sigan siendo GRATUITOS. \n\n` +
    `¡Cuento con tu apoyo! Mil gracias de antemano y que sigan los éxitos en tus gestiones inmobiliarias. 🤝🏢✨`
  );
}

/**
 * 🌟 MENSAJE PERSUASIVO PARA USUARIOS INTENSIVOS Y DE ALTO VOLUMEN (Doctrina Eduardo A. Rivera — v33.98)
 * Cuando un usuario realiza múltiples consultas gratuitas continuas (cédulas, prediales, avalúos, etc.)
 * y pone a trabajar activamente a JanIA sin haber calificado, JanIA actúa con persuasión,
 * firmeza y señorío, recordándole que mantener la infraestructura oficial 24/7 sin cobrarle un peso
 * requiere de su apoyo indispensable con una reseña de 5 estrellas en Google para mantener la gratuidad.
 */
export function formatPersuasiveIntensiveUserReviewMessage(
  userName?: string,
  serviceCount: number = 3
): string {
  const cleanRaw = userName ? cleanRawUserName(userName) : "";
  const cleanName = extractFirstName(cleanRaw || userName || '') || cleanRaw || 'Colega';

  return (
    `¡Hola, ${cleanName}! 👩🏻‍💼 Veo que has consultado ya ${serviceCount} documentos con JanIA en esta jornada. ¡Me alegra muchísimo poder serte de tanta utilidad en tus gestiones inmobiliarias! 🙌🏻🇨🇴\n\n` +
    `Sin embargo, mantener esta infraestructura tecnológica conectada en tiempo real a las centrales del Estado (Policía Nacional, Procuraduría, Contraloría, ADRES EPS) 24/7 sin cobrarte un solo peso, requiere un enorme esfuerzo e inversión de *VECY BIENES RAÍCES* para apoyar al gremio.\n\n` +
    `La única reciprocidad indispensable que te pedimos para que puedas seguir disfrutando de la gratuidad ilimitada de mis servicios es tu calificación de 5 estrellas ⭐⭐⭐⭐⭐ y un breve comentario en nuestro perfil oficial de Google:\n` +
    `👉 https://g.page/r/CctNbwU6UpX5EBM/review\n\n` +
    `Te toma menos de 15 segundos y es lo mínimo necesario para que nuestra comunidad mantenga tu acceso libre y abierto. ¿Me confirmas cuando lo hayas hecho para que sigas contando con el servicio al 100%? ¡Cuento con tu respaldo! 🤝🏢✨`
  );
}

/**
 * Detecta si el usuario solicita explícitamente el enlace/link de calificación o reseña en Google (v34.11).
 */
export function isExplicitReviewLinkRequest(text: string): boolean {
  const normalized = (text || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!normalized || normalized.length > 400) return false;

  const asksLinkOrWhere =
    /\b(link|enlace|url|donde)\b.{0,40}\b(calificar|calificacion|resena|opinion|opinar|comentar|comentario|estrellas|google|puntuar)\b/.test(
      normalized
    ) ||
    /\b(enviame|mandame|pasame|comparteme|dame|quiero\s+(?:dejar|dar))\b.{0,40}\b(calificacion|resena|opinion|link|enlace)\b/.test(
      normalized
    ) ||
    /\b(link\s+de\s+google|calificar\s+en\s+google|dejar\s+(?:la\s+|una\s+|mi\s+)?(?:calificacion|resena|opinion|comentario))\b/.test(
      normalized
    );

  return asksLinkOrWhere;
}

/**
 * Detecta si el usuario expresa satisfacción, agrado o retroalimentación constructiva tras recibir un servicio (v34.11).
 */
export function isUserSatisfactionOrFeedbackReply(
  text: string,
  hasRecentServiceContext: boolean = false
): {
  isSatisfied: boolean;
  hasConstructiveSuggestion: boolean;
  constructiveTopic: string | null;
} {
  const raw = (text || "").trim();
  const normalized = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!normalized || normalized.length > 450) {
    return { isSatisfied: false, hasConstructiveSuggestion: false, constructiveTopic: null };
  }

  // No confundir con una solicitud nueva de herramienta con datos propios
  const looksLikeNewToolDataRequest =
    /\b(cedula|c\.c\.|nit|chip|aaa\d+|predial|arrendamiento|promesa\s+de\s+compraventa|notarial|gastos\s+notariales)\b/.test(
      normalized
    ) || /\b(hazme\s+un\s+acm|quiero\s+un\s+acm|valor\s+de\s+(?:un|una)\s+(?:casa|apto|apartamento))\b/.test(normalized);

  if (looksLikeNewToolDataRequest) {
    return { isSatisfied: false, hasConstructiveSuggestion: false, constructiveTopic: null };
  }

  const positivePatterns =
    /\b(me\s+(?:ha(?:n)?\s+)?gust(?:o|a|ado|aron)|me\s+(?:ha(?:n)?\s+)?encant(?:o|a|ado|aron)|excelente|muy\s+(?:bien|bueno|buena|completo|completa|preciso|precisa|util)|quede\s+satisfech[oa]|muy\s+satisfech[oa]|si\s+me\s+sirvi[oó]|super\s+(?:bien|completo|util)|maravilloso|genial|fabuloso|increible|espectacular|impresionante)\b/i;

  const constructivePatterns =
    /\b(afinar|mejorar|ajustar|mas\s+precis|puntos?\s+mas\s+debiles|me\s+gustaria\s+si\s+pueden|seria\s+genial\s+que|podrian\s+(?:agregar|mejorar|incluir|afinar))\b/i;

  const isPositive = positivePatterns.test(normalized);
  const hasConstructive = constructivePatterns.test(normalized);

  let constructiveTopic: string | null = null;
  if (hasConstructive) {
    if (/\bacm\b|avaluo|mercado|homologaci|valoraci/i.test(normalized)) {
      constructiveTopic = "ACM";
    } else {
      constructiveTopic = "precisión técnica";
    }
  }

  const isSatisfied =
    isPositive || (hasRecentServiceContext && (hasConstructive || /^(?:si|claro|totalmente|100%|perfecto|ok|s[ií],?\s+muchas\s+gracias)[!.\s]*$/i.test(normalized)));

  return {
    isSatisfied,
    hasConstructiveSuggestion: hasConstructive,
    constructiveTopic
  };
}

/**
 * Construye una respuesta cálida, autónoma y personalizada (libre albedrío de JanIA) agradeciendo la retroalimentación
 * e invitando a dejar comentario y calificación de 5 estrellas en Google Reviews (v34.11).
 */
export function buildAutonomousGoogleReviewInvitation(
  userName?: string | null,
  options?: {
    isDirectLinkRequest?: boolean;
    constructiveTopic?: string | null;
    isConstructiveFeedback?: boolean;
  }
): string {
  const cleanRaw = userName ? cleanRawUserName(userName) : "";
  const cleanName = extractFirstName(cleanRaw || userName || "") || cleanRaw || "Colega";

  const openingLine = options?.isDirectLinkRequest
    ? `¡Con el mayor de los gustos, ${cleanName}! 🙌🏻✨ Nos alegra muchísimo saber que nuestras consultas y herramientas te han sido de gran utilidad.`
    : options?.isConstructiveFeedback || options?.constructiveTopic
    ? `¡Muchísimas gracias por tu valoración y por ese aporte tan valioso, ${cleanName}! 🙏✨ Tomamos nota inmediata de tu observación para seguir llevando nuestros ${options?.constructiveTopic || "análisis"} a la máxima precisión técnica del mercado.`
    : `¡Qué alegría saber que quedaste satisfecha/o con el servicio, ${cleanName}! 🥰✨ Trabajo 24/7 junto al equipo de *VECY BIENES RAÍCES* para darte la mayor precisión gratuita del sector.`;

  return (
    `${openingLine}\n\n` +
    `Aquí tienes el enlace oficial para dejarnos tu comentario y calificación de 5 estrellas en Google Reviews (te toma menos de 15 segundos y nos ayudas a que JanIA siga siendo 100% GRATUITA para el gremio):\n\n` +
    `👉 https://g.page/r/CctNbwU6UpX5EBM/review ⭐⭐⭐⭐⭐\n\n` +
    `¡Mil gracias por tu apoyo y mucho éxito en todos tus cierres inmobiliarios! 🤝🏢✨`
  );
}




