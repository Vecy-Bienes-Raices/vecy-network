export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

// 🔖 FUENTE ÚNICA DE VERDAD DE VERSIÓN DEL SISTEMA VECY BIENES RAÍCES
export const VECY_VERSION = "v32.60";
export const VECY_VERSION_LABEL = `VERSIÓN ${VECY_VERSION}`;
export const VECY_CORE_VERSION_LABEL = `VECY CORE ${VECY_VERSION}`;

// 🏢 IDENTIDAD DE MARCA OFICIAL — VECY BIENES RAÍCES
export const VECY_BRAND = {
  name: "VECY BIENES RAÍCES",
  legalName: "VECY BIENES RAÍCES",
  slogan: "La evolución inevitable para el sector de los bienes raíces.",
  motto: "VECY\nBIENES RAÍCES\nLa evolución inevitable para el sector de los bienes raíces.",
  subMotto: "Tu Red Inmobiliaria Inteligente"
};

// 👥 GRUPOS OFICIALES DE WHATSAPP — VECY BIENES RAÍCES
export const VECY_OFFICIAL_GROUPS = {
  grupo1: {
    id: "120363260108880069@g.us",
    name: "𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴",
    inviteLink: "https://chat.whatsapp.com/GzMbjNs1P2tHI7D0V4h8wZ",
    purpose: "Publicar ofertas y requerimientos inmobiliarios exclusivos (inmuebles y demandas)",
    description: `¡Bienvenido/a al canal transaccional oficial de VECY BIENES RAÍCES! 🇨🇴🤝\n\n` +
      `🤖 *GRUPO ADMINISTRADO Y MODERADO 24/7 POR NUESTRA IA (JanIA, agente IA de VECY BIENES RAÍCES)*.\n\n` +
      `📌 *PROPÓSITO EXCLUSIVO:*\n` +
      `Espacio 100% TRANSACCIONAL de alta velocidad para corredores, inmobiliarias y propietarios. JanIA monitorea este chat 24/7, extrae cada inmueble o demanda en tiempo real y cruza las dos puntas para generar cierres colaborativos en tiempo récord.\n\n` +
      `🏷️ *LO QUE SÍ PUEDES PUBLICAR:*\n` +
      `1️⃣ OFERTAS: Inmuebles disponibles para comercializar (Venta, Arriendo o Permuta) con ciudad, barrio, precio y datos técnicos.\n` +
      `2️⃣ DEMANDAS: Requerimientos de clientes compradores o arrendatarios calificados (presupuesto, zona y características).\n\n` +
      `🚫 *REGLA ESTRICTA DE MODERACIÓN AUTOMÁTICA POR IA:*\n` +
      `Cualquier clase de imagen o foto, meme, archivo PDF, audio, enlace publicitario o mensaje de charla/debate que no corresponda al tema transaccional del grupo será amonestado y ELIMINADO DE INMEDIATO del grupo por nuestra IA JanIA.\n\n` +
      `💡 *¿DÓNDE PREGUNTAR O DEBATIR?*\n` +
      `• Para consultas sobre leyes, tributario, avalúos o tips: Grupo 2.\n` +
      `• Para charlar del proyecto y alianzas: Grupo 3.\n` +
      `• Para atención privada con JanIA: WhatsApp +57 319 291 9978.\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  grupo2: {
    id: "120363417740040773@g.us",
    name: "𝗩𝗘𝗖𝗬 𝗧𝗜𝗣𝗦💡/𝗡𝗢𝗧𝗜𝗖𝗜𝗔𝗦📰/𝗖𝗢𝗡𝗦𝗨𝗟𝗧𝗔𝗦 𝗜𝗡𝗠𝗢𝗕𝗜𝗟𝗜𝗔𝗥𝗜𝗔𝗦⁉️🏠",
    inviteLink: "https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6",
    purpose: "Consultas inmobiliarias públicas, tips del día, noticias del sector, valor de metro cuadrado y debates libres",
    description: `¡Bienvenido/a al consultorio inmobiliario y foro de actualidad de VECY BIENES RAÍCES! 💡📚\n\n` +
      `🤖 *GRUPO ADMINISTRADO Y ATENDIDO POR NUESTRA IA (JanIA, agente IA de VECY BIENES RAÍCES)*.\n\n` +
      `📌 *PROPÓSITO DEL GRUPO:*\n` +
      `Espacio colaborativo de formación y resolución técnica para elevar el nivel profesional del gremio inmobiliario en Colombia. JanIA y los aliados resolvemos tus dudas, compartimos novedades del sector y analizamos el mercado.\n\n` +
      `💡 *CONTENIDO PERMITIDO Y PROMOVIDO:*\n` +
      `• Consultas legales: Promesas de compraventa, Ley 820 de arrendamientos, sucesiones, escrituración y garantías.\n` +
      `• Consultas tributarias DIAN: Retención en la fuente, ganancia ocasional e impuestos prediales.\n` +
      `• Valor del metro cuadrado y estudios de mercado.\n` +
      `• Píldoras y tips diarios de formación (10:00 AM) y noticias del mercado inmobiliario.\n` +
      `• Debates profesionales respetuosos entre colegas.\n\n` +
      `🚫 *REGLA ESTRICTA DE MODERACIÓN AUTOMÁTICA POR IA:*\n` +
      `• NO se permite publicar ofertas ni demandas comerciales aquí (esas van exclusivamente en el Grupo 1).\n` +
      `• Cualquier imagen, meme, archivo PDF, audio o enlace ajeno al tema del consultorio será amonestado y ELIMINADO DE INMEDIATO por JanIA.\n\n` +
      `📞 *ATENCIÓN COMERCIAL HUMANA PERSONALIZADA:*\n` +
      `Para peritajes, cotizaciones o contratación personalizada con Eduardo y Jani:\n` +
      `WhatsApp Bróker: +57 316 656 9719.\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  grupo3: {
    id: "120363403507276533@g.us",
    name: '𝗣𝗥𝗢𝗬𝗘𝗖𝗧𝗢: 🌐 "𝗩𝗘𝗖𝗬𝗕𝗜𝗘𝗡𝗘𝗦𝗥𝗔𝗜𝗖𝗘𝗦"🚀',
    inviteLink: "https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU",
    purpose: "Comunidad oficial de aliados, experiencias cotidianas de negocio, foros inmobiliarios y desarrollo colaborativo",
    description: `¡Bienvenido/a a la comunidad oficial del Proyecto VECY BIENES RAÍCES! 🌐🤝\n\n` +
      `🤖 *GRUPO ADMINISTRADO Y ATENDIDO POR NUESTRA IA (JanIA, agente IA de VECY BIENES RAÍCES)*.\n\n` +
      `📌 *PROPÓSITO DEL GRUPO:*\n` +
      `Espacio de integración de aliados, fundadores y colegas del sector inmobiliario. Punto de encuentro para debatir sobre la transformación del corretaje, proponer mejoras en la plataforma y compartir vivencias cotidianas del negocio.\n\n` +
      `🚀 *LO QUE COMPARTIMOS AQUÍ:*\n` +
      `• Charlas sobre el modelo colaborativo (ganar 40%-45% cada 3-4 días con IA).\n` +
      `• Propuestas de nuevas herramientas para la plataforma.\n` +
      `• Experiencias de cierres, anécdotas y aprendizaje colaborativo.\n` +
      `• Novedades de la red, alianzas estratégicas y visión a futuro.\n\n` +
      `🚫 *REGLA ESTRICTA DE MODERACIÓN AUTOMÁTICA POR IA:*\n` +
      `• No publicar inventarios de inmuebles ni requerimientos (van en el Grupo 1).\n` +
      `• Cualquier imagen, meme, archivo PDF, audio o enlace ajeno a la comunidad será amonestado y ELIMINADO DE INMEDIATO por JanIA.\n` +
      `• Cero canibalismo comercial, política o spam.\n\n` +
      `🌐 *PORTAL OFICIAL:* https://vecy-network.vercel.app/\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  }
};

// 🌐 DOMINIO ACTIVO OFICIAL DEL PROYECTO
export const VECY_ACTIVE_DOMAIN = "https://vecy-network.vercel.app";
export const VECY_LEGACY_DOMAIN = "https://vecy.co";

// 📱 REDES SOCIALES OFICIALES Y ENLACES INSTITUCIONALES — VECY BIENES RAÍCES
export const VECY_SOCIAL_NETWORKS = {
  handle: "@vecybienesraices",
  brandName: "Vecy Bienes Raíces",
  facebookFanPage: "https://www.facebook.com/vecybienesraices",
  facebookGroups: [
    "https://www.facebook.com/groups/vecy.inmuebles.y.requerimientos.co",
    "https://www.facebook.com/groups/vecybienesraices.colombia"
  ],
  instagram: "https://www.instagram.com/vecybienesraices/",
  threads: "https://www.threads.net/@vecybienesraices",
  youtube: "https://www.youtube.com/@VecyBienesRaices",
  xTwitter: "https://x.com/BrokerVecy",
  linkedIn: "https://www.linkedin.com/in/vecy-bienes-raices",
  tikTok: "https://www.tiktok.com/@vecybienesraices",
  pinterest: "https://co.pinterest.com/vecybienesraces/",
  googleReview: "https://g.page/r/CctNbwU6UpX5EBM/review",
  whatsappChannel: "https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b",
  whatsappJanIA: "https://wa.me/573192919978",
  whatsappBrokerComercial: "https://wa.me/573166569719"
};

