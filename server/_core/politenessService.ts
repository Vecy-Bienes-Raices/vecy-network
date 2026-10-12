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
    `¡Con el mayor de los gustos, ${cleanName}! 🏘️✨ Te cuento detalladamente sobre nosotros:\n\n` +
    `🏢 *¿Quiénes somos?*\n` +
    `Somos *VECY BIENES RAÍCES*, el primer bróker virtual inmobiliario y red colaborativa para Colombia, operando 100% digital desde 2018. Nacimos con el propósito de transformar de raíz el sector y dejar atrás la lentitud de los "dinosaurios inmobiliarios".\n\n` +
    `👥 *Nuestros Fundadores:*\n` +
    `• *Eduardo A. Rivera:* Director de Tecnología e Innovación.\n` +
    `• *Jani Alves:* Directora de Operaciones Inmobiliarias.\n\n` +
    `⚡ *Todos nuestros servicios están 100% activos las 24 horas:*\n` +
    `1️⃣ *Verificación Oficial de Documentos y Antecedentes:* Consulta en tiempo real ante Policía Nacional, Procuraduría y ADRES para blindar visitas y contratos (*100% GRATIS*).\n` +
    `2️⃣ *Factura Predial Bogotá y Certificados de Pago:* Descarga en PDF oficial con código de barras y constancia de estar al día (*100% GRATIS*).\n` +
    `3️⃣ *Paz y Salvo IDU Notarial:* En PDF oficial obligatorio para escrituración en Bogotá (*$0 COP*).\n` +
    `4️⃣ *Liquidación Notarial y de Registro:* Desglose exacto de derechos notariales, beneficencia y retención en la fuente.\n` +
    `5️⃣ *Cruce Inteligente Oferta ↔ Demanda (JanIA Match):* Algoritmo con IA pura que conecta compradores y vendedores en segundos.\n` +
    `6️⃣ *Red Colaborativa de Corretaje:* Alianzas 50/50 transparentes entre colegas sin intermediarios fantasmas ni avisos invasivos.\n` +
    `7️⃣ *Consultoría Especializada y Avalúos RAA:* Acompañamiento legal, peritajes comerciales certificados y préstamos hipotecarios con nuestros directores.\n\n` +
    `🌐 *Portal Web Oficial:* ${VECY_ACTIVE_DOMAIN}\n` +
    `📞 *Atención Bróker (Eduardo y Jani):* +57 316 656 9719 (https://wa.me/573166569719)\n\n` +
    `📲 *¡Te invito con alegría a seguirnos en nuestras redes oficiales para estar al día con tips, remates y novedades!*:\n` +
    `• 📸 *Instagram:* ${VECY_SOCIAL_NETWORKS.instagram}\n` +
    `• 🎵 *TikTok:* ${VECY_SOCIAL_NETWORKS.tikTok}\n` +
    `• 📘 *Facebook:* ${VECY_SOCIAL_NETWORKS.facebookFanPage}\n` +
    `• ▶️ *YouTube:* ${VECY_SOCIAL_NETWORKS.youtube}\n` +
    `• 💼 *LinkedIn:* ${VECY_SOCIAL_NETWORKS.linkedIn}\n` +
    `• 📢 *Canal Oficial de WhatsApp:* ${VECY_SOCIAL_NETWORKS.whatsappChannel}\n\n` +
    `⭐ *Y como broche de oro 😉:* Como sabes que trabajamos con el corazón para apoyar a nuestra comunidad y mantener estas herramientas 100% gratuitas para todos, ¿nos regalarías tu opinión y calificación con 5 estrellas en Google? Nos ayudas un mundo para seguir creciendo juntos:\n` +
    `👉 ${VECY_SOCIAL_NETWORKS.googleReview} ⭐⭐⭐⭐⭐\n\n` +
    `¡Muchísimas gracias por acompañarnos en la evolución de los bienes raíces! 🚀🤝`
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

