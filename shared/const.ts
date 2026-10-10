export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

// 🔖 FUENTE ÚNICA DE VERDAD DE VERSIÓN DEL SISTEMA VECY BIENES RAÍCES
export const VECY_VERSION = "v32.78";
export const VECY_VERSION_LABEL = `VERSIÓN ${VECY_VERSION}`;
export const VECY_CORE_VERSION_LABEL = `VECY CORE ${VECY_VERSION}`;

// 💰 MODELO COLABORATIVO OFICIAL DE COMISIONES — VECY BIENES RAÍCES (40 / 20 / 40 Y ESQUEMA 80 / 20)
export const VECY_COMMISSION_MODEL = {
  captadorPct: 40,        // 40% Para quien subió el inmueble al portal (Punta Captadora / Oferta en operación colaborativa)
  redColaborativaPct: 10, // 10% Para la Bolsa Colaborativa (Agentes difusores que viralizan enlaces de Marca Blanca y ganan por puntos de telemetría)
  vecyPlatformPct: 10,    // 10% Para VECY BIENES RAÍCES (Súper Portal, Algoritmo JanIA 24/7, Vecy Agenda, Estudio de Títulos y Respaldo Legal)
  bolsaIntermediaPct: 20, // 20% Participación intermedia de VECY: VECY toma su 20%, pero cede el 10% a la Bolsa Colaborativa y conserva el 10%
  colocadorPct: 40,       // 40% Para la Punta Colocadora (Demanda: quien aporta al comprador/arrendatario final vía Vecy Agenda y acompaña el cierre)
  directSaleWithVecyTechPct: 80, // 80% Para el Agente que capta y cierra directamente con un cliente apoyándose en la infraestructura tecnológica de VECY tras los 5 días de gracia
  gracePeriodDays: 5,     // 5 Días calendario de gracia inicial tras subir el inmueble: 100% comisión para el agente ($0 COP VECY) si ya traía el cliente previo
  colocadorDescription: "Lo obtiene el colega o asesor cuando aporta al comprador/arrendatario final, lo presenta a través de nuestro sistema de reserva 'Vecy Agenda' y acompaña el cierre.",
  totalPct: 100,
  slogan: "40% Captador + 20% Intermedio (10% Bolsa Colaborativa + 10% VECY) + 40% Colocador (vía Vecy Agenda) | Venta Directa con Infraestructura VECY: 80% Asesor / 20% Soporte y Red",
  doctrine: "En el 50/50 tradicional, dos agentes hacen una alianza bilateral pero dependen de su propio esfuerzo y de gastar en publicidad paga, tardando meses en cerrar. En el modelo 40/20/40 de VECY, ambas puntas ceden un 10% porque VECY está en la mitad no solo aportando un Súper Portal con IA y respaldo legal, sino porque VECY cede la mitad (el 10%) a la BOLSA COLABORATIVA. La Bolsa convierte a toda la comunidad de colegas en el motor de marketing orgánico de tus inmuebles mediante fichas de Marca Blanca (sin logos de VECY). Aunque no consigas el cliente final, tus puntos por clics e interacciones te garantizan tu parte del 10% al cerrarse el negocio. Y si tú consigues el comprador/arrendatario, ¡ganas el 40% como Colocador MÁS tu parte de los puntos de la Bolsa!",
  directSaleDoctrine: {
    title: "Venta Directa: Modelo 80 / 20 con Infraestructura VECY, Gracia de 5 Días ($0 COP) y Blindaje Antielusión",
    summary: "Si un asesor aprovecha la tienda digital, fichas de marca blanca, atención de JanIA y difusión de la red para vender directamente a su cliente después del día 5, conserva un extraordinario 80% de la comisión y aporta un 20% (10% Bolsa Difusora + 10% VECY). En los primeros 5 días calendario de gracia inicial, conserva el 100% ($0 COP VECY). En negocios colaborativos con colocador, opera el 40/20/40.",
    gracePeriodExplanation: "Si acabas de subir el inmueble hace 1 a 5 días y lo vendes de inmediato (porque ya traías la negociación o el cliente en trámite), VECY te reconoce el 100% de la comisión ($0 COP para la plataforma). Pero si el inmueble permanece activo en el portal disfrutando de la vitrina, el tráfico, la atención de JanIA y la difusión de los colegas de la bolsa, y el cliente llega por esa gestión, el asesor se queda con el 80% y aporta el 20% de aceleración y soporte.",
    qaList: [
      {
        q: "¿Cuánto gana el asesor si vende directamente con la infraestructura de VECY?",
        a: "¡El 80% neto de toda la comisión! Mientras las franquicias tradicionales (Century 21, Remax, agencias tradicionales) te quitan el 40% o el 50% por prestarte una marca, en VECY BIENES RAÍCES conservas el 80% de tus honorarios cuando tú mismo captas y cierras la operación usando nuestras herramientas. Solo aportas el 20% (10% para la red de colegas que viralizó tu inmueble en la bolsa y 10% para VECY)."
      },
      {
        q: "¿En qué caso el asesor no paga absolutamente nada ($0 COP) y conserva el 100%?",
        a: "En el Período de Gracia Inmediata de los primeros cinco (5) días calendario tras la publicación. Si subiste el inmueble y lo cerraste casi de inmediato sin valerte del ciclo prolongado de difusión de la red, el 100% es tuyo y VECY no te cobra ni un solo peso."
      },
      {
        q: "¿Cómo detecta VECY si el cliente fue contactado a través de las herramientas y enlaces provistos?",
        a: "Cada ficha, tienda web y enlace de marca blanca cuenta con telemetría activa (tags, mini-bots y tokens de seguimiento). Cuando un cliente hace clic en 'Contactar por WhatsApp', 'Llamar' o 'Agendar Visita', el sistema registra la traza digital inmutable (fecha, hora, referencia del inmueble e IP) e inyecta la referencia formal en el mensaje de inicio. Ese log probatorio demuestra el nexo causal de la gestión conforme a los Artículos 1340 y 1341 del Código de Comercio de Colombia."
      },
      {
        q: "¿Qué respaldo contractual formal existe al registrar una propiedad o agendar?",
        a: "Todo registro de inmueble y agendamiento en Vecy Agenda genera un Contrato Digital con plena validez jurídica bajo la Ley 527 de 1999 y Decreto 2364 de 2012, respaldado con Código Único de Verificación (CUV), estampado cronológico, huella criptográfica SHA-256 y Código QR dinámico de validación pública en línea."
      }
    ]
  },
  antiBypassTelemetry: {
    title: "Blindaje Tecnológico y Jurídico contra la Elusión ('Bypass')",
    mechanisms: [
      "Smart Link & Button Tracking: Registro forense de clics en WhatsApp, llamadas y visitas con token de referencia.",
      "Registro Legal en Vecy Agenda: Hoja de visita digital y contrato con valor probatorio mercantil (Cód. Comercio Art. 1340-1341).",
      "Sello Criptográfico Digital: Contratos PDF con Hash SHA-256, CUV y Código QR escaneable de validación pública.",
      "Monetización Inevitable: Alianzas bancarias de crédito hipotecario y aseguradoras de arrendamiento que comisionan directo a VECY.",
      "Auditoría Periódica de Matrículas: Cruce con registro inmobiliario de la SNR ante retiros sospechosos de inmuebles con visitas registradas."
    ]
  },
  bolsaColaborativa: {
    name: "Bolsa Inmobiliaria Colaborativa VECY",
    mechanics: "Cualquier agente registrado, incluso con pocos inmuebles propios, puede ingresar a la Bolsa y tomar las Ofertas o Demandas publicadas para viralizarlas en sus redes y grupos mediante enlaces de Marca Blanca limpios (sin logos ni números de VECY). Mini-bots y tags de telemetría registran el tráfico y asignan puntos. Al cerrarse la venta (3% de comisión) o arriendo (1er canon), el 10% de la Bolsa se reparte entre todos los difusores de mayor a menor y se consigna a su cuenta bancaria o billetera inscrita.",
    doubleReward: "Si el agente que viralizó en la Bolsa es quien además consigue el cliente final comprador o arrendatario, gana el 40% íntegro de la Punta Colocadora MÁS su liquidación en dinero por los puntos acumulados en la Bolsa Colaborativa."
  }
};

// 🎁 LOS 6 GRANDES BENEFICIOS OFICIALES PARA EL AGENTE — VECY BIENES RAÍCES
export const VECY_AGENT_BENEFITS = [
  {
    num: 1,
    title: "Ingreso Gratuito y Cero Cuotas Obligatorias",
    description: "No tienen que pagar mensualidades, trimestres, semestres ni anualidades obligatorias. El ingreso a la red y al portal es 100% gratuito."
  },
  {
    num: 2,
    title: "Publicación Ilimitada de Ofertas y Demandas",
    description: "Espacio ilimitado para que subas todas tus publicaciones de inmuebles (Ofertas) y requerimientos de clientes compradores o arrendatarios (Demandas)."
  },
  {
    num: 3,
    title: "Motor con Inteligencia Artificial y Matches Ultrarrápidos",
    description: "Nuestro portal usa INTELIGENCIA ARTIFICIAL para encontrar coincidencias y matches en tiempo récord. El éxito depende de lo bien especificadas que publiques tus ofertas y demandas."
  },
  {
    num: 4,
    title: "Acceso Pleno a 'Vecy Agenda' con IA y Validación Instantánea",
    description: "Sistema inteligente de reserva y agendamiento de visitas que verifica en automático y al instante a cada visitante interesado o cliente comprador, contestando en automático a sus correos. El solicitante formal de la visita es el mismo agente colegiado que presenta a los interesados."
  },
  {
    num: 5,
    title: "Chat Web 24/7 con JanIA para Redacción y Documentos",
    description: "Consultas en tiempo real, ayuda y creación de documentos, correos, ofertas y promesas de compraventa con redacción profesional en tiempo récord a través del chat web con JanIA."
  },
  {
    num: 6,
    title: "Estudio de Títulos y Solicitud Gratuita de Documentos en Línea",
    description: "Consultas sobre negociación y análisis de documentos (Estudio de títulos) enviándole a JanIA por chat o WhatsApp los archivos (Predial, Certificado de Tradición y Libertad, Escrituras, IDU). Además, JanIA ayuda a tramitar en línea y gratis documentos como el Predial, certificados de pago y Paz y Salvos de predial y del IDU."
  }
];

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
    purpose: "Publicar ofertas, demandas y permutas inmobiliarias (fotos, flyers, banners, brochures PDF y enlaces)",
    description: `¡Bienvenido/a al canal transaccional de VECY BIENES RAÍCES! 🇨🇴🤝\n\n` +
      `🤖 *Grupo administrado y moderado 24/7 por nuestra IA (JanIA, agente IA de VECY BIENES RAÍCES).*\n\n` +
      `📌 *PROPÓSITO:*\n` +
      `Espacio 100% transaccional de alta velocidad. JanIA monitorea 24/7, extrae cada publicación y cruza oferta con demanda para cierres colaborativos en tiempo récord.\n\n` +
      `🏷️ *LO QUE SÍ ADMITIMOS (100% INMOBILIARIO):*\n` +
      `1️⃣ OFERTAS, DEMANDAS Y PERMUTAS: Inmuebles en venta, arriendo y permutas/venpermutas en Colombia con datos claros.\n` +
      `2️⃣ PUBLICIDAD VISUAL Y FLYERS: Se admiten imágenes publicitarias como; flyers, banners comerciales, pósters y fotos con información de la DEMANDA o la OFERTA.\n` +
      `3️⃣ BROCHURES Y DOSSIERS EN PDF: Fichas técnicas y catálogos en PDF.\n` +
      `4️⃣ ENLACES DE TODO TIPO: Enlaces web, tours virtuales 360°, videos de Youtube y Tiktok, carpetas en la nube y redes sociales que contengan publicidad de ofertas, demandas o permutas inmobiliarias. Siempre y cuando vengan acompañados esos enlaces de la información correspondiente.\n\n` +
      `🤖 *REACCIONES DE JANIA:*\n` +
      `• 👍 Venta | 👌 Arriendo | 🔀 Permuta\n` +
      `• 📝 Demanda Venta | ✏️ Demanda Arriendo | 🔄 Demanda Permuta\n\n` +
      `⛔ *MODERACIÓN ESTRICTA POR IA:*\n` +
      `Cualquier meme, cadena, política, religión o contenido ajeno al sector inmobiliario será amonestado y ELIMINADO DE INMEDIATO por JanIA.\n\n` +
      `💡 *¿DÓNDE DEBATIR O PREGUNTAR?*\n` +
      `• Leyes, tributario, avalúos o tips: Grupo 2.\n` +
      `• Comunidad y modelo 40/20/40: Grupo 3.\n` +
      `• Chat privado con JanIA: WhatsApp +57 319 291 9978.\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  grupo2: {
    id: "120363417740040773@g.us",
    name: "𝗩𝗘𝗖𝗬 𝗧𝗜𝗣𝗦💡/𝗡𝗢𝗧𝗜𝗖𝗜𝗔𝗦📰/𝗖𝗢𝗡𝗦𝗨𝗟𝗧𝗔𝗦 𝗜𝗡𝗠𝗢𝗕𝗜𝗟𝗜𝗔𝗥𝗜𝗔𝗦⁉️🏠",
    inviteLink: "https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6",
    purpose: "Consultas inmobiliarias públicas, tips del día, noticias del sector, valor de metro cuadrado y debates libres",
    description: `¡Bienvenido/a al consultorio inmobiliario de VECY BIENES RAÍCES! 💡📚\n\n` +
      `🤖 *Grupo administrado y atendido por nuestra IA (JanIA, agente IA de VECY BIENES RAÍCES).*\n\n` +
      `📌 *PROPÓSITO:*\n` +
      `Consultoría técnica, formación y actualidad para elevar el nivel profesional del sector inmobiliario. JanIA y los aliados resolvemos tus dudas y analizamos el mercado.\n\n` +
      `💡 *CONTENIDO PERMITIDO:*\n` +
      `• Consultas legales: Promesas, Ley 820 de arrendamientos, sucesiones y escrituración.\n` +
      `• Consultas tributarias DIAN: Retención en la fuente y ganancia ocasional.\n` +
      `• Estudios de mercado y valor del metro cuadrado ($/m²).\n` +
      `• Tips de formación diarios (10:00 AM) con JanIA Coach Inmobiliaria y noticias del sector.\n` +
      `• Debates profesionales respetuosos entre colegas.\n\n` +
      `⛔ *MODERACIÓN ESTRICTA POR IA:*\n` +
      `• NO se publican ofertas ni demandas aquí (van en el Grupo 1).\n` +
      `• Memes, cadenas o contenido fuera de tema serán amonestados y ELIMINADOS DE INMEDIATO por JanIA.\n\n` +
      `📞 *ATENCIÓN BRÓKER PERSONALIZADA:*\n` +
      `WhatsApp Bróker Oficial: +57 316 656 9719.\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  grupo3: {
    id: "120363403507276533@g.us",
    name: '𝗣𝗥𝗢𝗬𝗘𝗖𝗧𝗢: 🌐 "𝗩𝗘𝗖𝗬𝗕𝗜𝗘𝗡𝗘𝗦𝗥𝗔𝗜𝗖𝗘𝗦"🚀',
    inviteLink: "https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU",
    purpose: "Comunidad oficial de aliados, experiencias cotidianas de negocio, modelo colaborativo 40/20/40 y desarrollo del súper portal",
    description: `¡Bienvenido/a a la comunidad oficial del Proyecto VECY BIENES RAÍCES! 🌐🤝\n\n` +
      `🤖 *Grupo administrado y atendido por nuestra IA (JanIA, agente IA de VECY BIENES RAÍCES).*\n\n` +
      `📌 *PROPÓSITO:*\n` +
      `Integración de colegas, vivencias cotidianas del negocio, foros de debate y novedades del Súper Portal Inmobiliario.\n\n` +
      `🚀 *LO QUE COMPARTIMOS AQUÍ:*\n` +
      `• El revolucionario MODELO COLABORATIVO 40 / 20 / 40:\n` +
      `  - 40% Punta Captadora (quien aporta el inmueble al portal).\n` +
      `  - 20% Bolsa (10% Red Colaborativa de promotores + 10% Plataforma VECY y soporte legal).\n` +
      `  - 40% Punta Colocadora (quien aporta al cliente, lo agenda en Vecy Agenda y acompaña el cierre).\n` +
      `• Resultados rápidos y seguidos: Más negocios y cierres continuos en lugar de meses estancados.\n` +
      `• Foros, experiencias reales de negocios y propuestas para la plataforma.\n\n` +
      `⛔ *MODERACIÓN ESTRICTA POR IA:*\n` +
      `• NO publicar inmuebles ni requerimientos aquí (van en el Grupo 1).\n` +
      `• Spam, memes o mensajes ajenos serán amonestados y ELIMINADOS DE INMEDIATO por JanIA.\n\n` +
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

