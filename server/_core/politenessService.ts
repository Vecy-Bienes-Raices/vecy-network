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

/**
 * 1. Mensaje de calificación personalizado e inmediato cuando el usuario agradece o se despide amablemente.
 */
export function formatImmediatePoliteReviewMessage(userName?: string): string {
  const cleanName = extractFirstName(userName || 'Colega') || 'Colega';
  return (
    `¡Con el mayor de los gustos, ${cleanName}! 🙏😊 Me alegra muchísimo haberte sido de gran ayuda.\n\n` +
    `⭐ ¿Podrías regalarnos tu opinión y calificar nuestro servicio? Tu reseña nos ayuda enormemente a que siga siendo *100% GRATUITO* para todos:\n` +
    `👉 https://g.page/r/CctNbwU6UpX5EBM/review\n\n` +
    `👍 ¡Muchas gracias por tu generosidad y apoyo!`
  );
}

/**
 * 2. Pregunta de cortesía y Urbanidad de Carreño enviada tras 1 minuto de silencio
 * si el usuario no dio las gracias ni interactuó tras recibir el servicio gratuito.
 */
export function formatPoliteInactivityPrompt(userName?: string): string {
  const cleanName = extractFirstName(userName || 'Colega') || 'Colega';
  return (
    `🤝 ¡Ha sido un placer poder ayudarte, ${cleanName}! Espero que nuestro servicio te haya sido de gran ayuda y, como sabes, este es un servicio completamente *GRATUITO*.\n\n` +
    `¿Podrías ayudarnos a seguir manteniéndolo así? ✨`
  );
}

/**
 * 3. Respuesta agradecida y directa cuando el usuario responde afirmativamente (SÍ) a la pregunta de cortesía.
 */
export function formatPoliteYesReviewMessage(userName?: string): string {
  const cleanName = extractFirstName(userName || 'Colega') || 'Colega';
  return (
    `🙏 ¡Gracias, ${cleanName}! Entonces por favor 🌟 déjanos *tu opinión y califica nuestro servicio* ingresando a este enlace (no te toma más de 15 segundos, te lo aseguro):\n\n` +
    `👉 https://g.page/r/CctNbwU6UpX5EBM/review\n\n` +
    `👍 ¡Muchas gracias!`
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
