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

