import cron from 'node-cron';
import path from 'path';
import fs from 'fs';
import { getDb } from '../db';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { propertyMatches, requirements, properties } from '../../drizzle/schema';
import { gte, and, eq, sql } from 'drizzle-orm';
import { janiaMatchBot as whatsappBot } from './whatsapp-match';
import { runNightlyRematch } from '../jobs/nightlyRematch';

import { invokeLLM } from './llm';

/**
 * Servicio Cron de JanIA v3.0 (IA Pura Dinámica)
 * Mensajes de apertura/cierre redactados en vivo por Gemini 2.5 Flash + Audios + Re-matching.
 */

/**
 * Obtiene la ruta física de la ilustración temática 3D de JanIA
 */
function getThemedImagePath(tipo: string): string | undefined {
  const aliasMap: Record<string, string[]> = {
    cafe: ['podcast', 'potcast', 'cafe'],
    podcast: ['podcast', 'potcast', 'cafe'],
    potcast: ['potcast', 'podcast', 'cafe'],
    noticias: ['periodista', 'noticias'],
    periodista: ['periodista', 'noticias'],
    soporte: ['soporte', 'servicio', 'servicios', 'atencion', 'consultoria'],
    servicios: ['soporte', 'servicio', 'servicios', 'atencion', 'consultoria'],
    consultoria: ['soporte', 'servicio', 'servicios', 'atencion', 'consultoria'],
  };

  const candidates = aliasMap[tipo] || [tipo];
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];

  for (const cand of candidates) {
    for (const ext of extensions) {
      const primaryPath = path.resolve(process.cwd(), `client/public/assets/jania/jania_${cand}.${ext}`);
      const distPath = path.resolve(process.cwd(), `dist/assets/jania/jania_${cand}.${ext}`);
      const serverPath = path.resolve(__dirname, `../../client/public/assets/jania/jania_${cand}.${ext}`);
      if (fs.existsSync(primaryPath)) return primaryPath;
      if (fs.existsSync(distPath)) return distPath;
      if (fs.existsSync(serverPath)) return serverPath;
    }
  }
  return undefined;
}

interface DailyTipContent {
  voiceText: string;
  captionText: string;
}

export function initCronScheduler() {
  console.log('[CRON-SERVICE] Inicializando orquestador de agendas automatizadas v3.3 (Parrilla Semanal de Audios, Ilustraciones 3D, Captions y Re-matching)...');


  // ─────────────────────────────────────────────────────────────────────────────
  // NOTA DOCTRINAL v28.0: Los mensajes programados de marketing, asesoría y
  // contenido educativo se publican EXCLUSIVAMENTE en el Grupo 2 (Soporte Legal,
  // Tributario, Avalúos y Marketing) y en el Canal oficial de WhatsApp.
  // El Grupo 1 (VECY INMUEBLES NETWORK) mantiene silencio absoluto de texto.
  // ─────────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────────
  // GRUPO 2: VECY: SOPORTE LEGAL, TRIBUTARIO, AVALÚOS Y MARKETING + CANAL WHATSAPP
  // PARRILLA SEMANAL DIARIA DE AUDIOS E ILUSTRACIONES 3D (LUNES A SÁBADO)
  // ─────────────────────────────────────────────────────────────────────────────

  // 🚀 LUNES 08:00 AM — Arranque Semanal & Convocatoria de Aliados
  cron.schedule('0 8 * * 1', async () => {
    console.log('[CRON-SERVICE] Generando contenido dinámico de Lunes para SOPORTE LEGAL, MARKETING Y CANAL...');
    const fallbackVoice = `¡Buenos días a todos y a todas! Soy JanIA. Arrancamos una semana llena de oportunidades de negocio y cierres inmobiliarios. Recuerden que este espacio y nuestro canal oficial son su consultorio permanente: aquí pueden preguntarme por texto o nota de voz sobre leyes inmobiliarias, cómo liquidar la ganancia ocasional ante la DIAN, avalúos de mercado o cómo redactar un anuncio de alto impacto para sus inmuebles y requerimientos. Los invito a invitar a más colegas a unirse a este maravilloso proyecto y a interactuar conmigo para probar nuestro sistema de consultas. ¡Que tengan una semana extraordinaria y productiva!`;
    const fallbackCaption = `🚀 *ARRANQUE SEMANAL & CONSULTORIO INMOBILIARIO — VECY NETWORK* 🇨🇴\n\n` +
      `¡Buenos días a todos mis queridos colegas!\n\n` +
      `Iniciamos una semana llena de oportunidades comerciales y cierres de negocios. Recuerden que este espacio y nuestro canal oficial son su consultorio permanente 24/7:\n\n` +
      `⚖️ *Soporte Legal y Contratos:* Dudas sobre promesas, arras y Ley 820.\n` +
      `💰 *Tributario DIAN:* Ganancia ocasional, retención en la fuente y exenciones.\n` +
      `📐 *Avalúos & SINUPOT:* Usos de suelo, valor de m2 y fichas normativas.\n` +
      `📢 *Marketing Digital:* Estructura de 7 pilares y copys de alto impacto.\n\n` +
      `🌟 *Construyamos juntos el futuro inmobiliario:* Invita a tus colegas corredores a sumarse a VECY Network y prueba interactuar con JanIA en nuestra web oficial:\n` +
      `📲 *Chatea con JanIA:* https://vecy-network.vercel.app/jania`;

    const content = await generateDailyContent('lunes_arranque', fallbackVoice, fallbackCaption);
    try {
      await whatsappBot.sendVoiceToBuzonAndChannel(content.voiceText, getThemedImagePath('matches'), content.captionText);
    } catch (e: any) {
      console.error('[CRON-SERVICE] Error enviando publicación de Lunes:', e.message);
    }
  }, { timezone: 'America/Bogota' });

  // ⚖️ MARTES 11:00 AM — Martes Jurídico & Blindaje Notarial
  cron.schedule('0 11 * * 2', async () => {
    console.log('[CRON-SERVICE] Generando contenido dinámico de Martes Jurídico...');
    const fallbackVoice = `Hola, queridos colegas. Soy JanIA con su tip jurídico del día. ¿Sabían que un simple correo electrónico con la hoja de presentación del cliente o el acuerdo de puntas compartidas tiene plena validez probatoria bajo la Ley 527 de 1999? Nunca muestren un inmueble sin dejar registro escrito. Los invito a formar parte activa de VECY Network, a invitar a más colegas y a consultar cualquier duda jurídica o revisar minutas en PDF directamente conmigo. ¡Juntos cerramos más blindados!`;
    const fallbackCaption = `⚖️ *MARTES JURÍDICO & BLINDAJE NOTARIAL — VECY NETWORK* 🏛️\n\n` +
      `¡Hola, queridos colegas corredores e inmobiliarios!\n\n` +
      `📌 *Tip Jurídico del Día:* Validez de Acuerdos Comerciales y Registro Escrito.\n` +
      `Bajo la *Ley 527 de 1999*, los mensajes de datos, correos electrónicos y hojas de visita tienen plena validez probatoria. Nunca muestres un predio sin pactar previamente las condiciones comerciales.\n\n` +
      `💡 *¿Tienes dudas contractuales?*\n` +
      `Puedes enviarme tus minutas, promesas de compraventa o consultas de arrendamiento (texto, voz o PDF) y las analizamos al instante.\n\n` +
      `🤝 *Únete a la Red:* Invita a tus colegas a formar parte de VECY Network para elevar el estándar profesional del corretaje en Colombia.\n` +
      `📲 *Consultas Jurídicas JanIA:* https://vecy-network.vercel.app/jania`;

    const content = await generateDailyContent('martes_juridico', fallbackVoice, fallbackCaption);
    try {
      await whatsappBot.sendVoiceToBuzonAndChannel(content.voiceText, getThemedImagePath('juridico'), content.captionText);
    } catch (e: any) {
      console.error('[CRON-SERVICE] Error enviando publicación de Martes:', e.message);
    }
  }, { timezone: 'America/Bogota' });

  // 📢 MIÉRCOLES 11:30 AM — Miércoles de Marketing Inmobiliario & Copywriting
  cron.schedule('30 11 * * 3', async () => {
    console.log('[CRON-SERVICE] Generando contenido dinámico de Miércoles de Marketing...');
    const fallbackVoice = `¡Buenas tardes, queridos colegas! Soy JanIA con su tip de Marketing Inmobiliario. El ochenta por ciento de los clientes y colegas descartan una publicación si no tiene el precio claro, el barrio exacto o el metraje. Si quieren que sus ofertas y requerimientos se cierren en tiempo récord, incluyan siempre los siete pilares fundamentales. Les cuento que ya estoy detectando decenas de coincidencias en segundo plano y muy pronto nuestros asesores de cierre de VECY Network los estarán contactando para conectar las puntas. Inviten a más colegas a unirse a la red y prueben redactar sus anuncios conmigo hoy mismo.`;
    const fallbackCaption = `📢 *MIÉRCOLES DE MARKETING INMOBILIARIO & 7 PILARES — VECY NETWORK* 🚀\n\n` +
      `¡Buenas tardes, queridos colegas!\n\n` +
      `🎯 *La Regla de Oro:* Más del 80% de los negocios se pierden por publicaciones incompletas o ambiguas. Para que tus ofertas y solicitudes se muevan en tiempo récord, incluye siempre los *7 Pilares*:\n\n` +
      `1️⃣ Tipo de Inmueble (Apto, Casa, Bodega, etc.)\n` +
      `2️⃣ Ciudad y Barrio Exacto\n` +
      `3️⃣ Precio / Canon y Cuota de Administración\n` +
      `4️⃣ Área Total Construida en m²\n` +
      `5️⃣ Habitaciones y Baños\n` +
      `6️⃣ Parqueaderos (Independientes o en línea)\n` +
      `7️⃣ Enlace directo de contacto de WhatsApp\n\n` +
      `✨ *Primicia:* ¡JanIA ya está encontrando matches en la red! Muy pronto nuestro equipo de asesores de cierre los contactará para coordinar los cierres comerciales.\n\n` +
      `🤝 *Invita a más colegas y prueba el sistema:* https://vecy-network.vercel.app/jania`;

    const content = await generateDailyContent('miercoles_marketing', fallbackVoice, fallbackCaption);
    try {
      await whatsappBot.sendVoiceToBuzonAndChannel(content.voiceText, getThemedImagePath('marketing'), content.captionText);
    } catch (e: any) {
      console.error('[CRON-SERVICE] Error enviando publicación de Miércoles:', e.message);
    }
  }, { timezone: 'America/Bogota' });

  // 💰 JUEVES 11:00 AM — Jueves Tributario & Ahorro Fiscal DIAN
  cron.schedule('0 11 * * 4', async () => {
    console.log('[CRON-SERVICE] Generando contenido dinámico de Jueves Tributario...');
    const fallbackVoice = `Hola a todos y a todas mis queridos colegas. Soy JanIA con un consejo financiero clave para sus clientes vendedores ante la DIAN. Al vender vivienda de habitación, pueden deducir hasta cinco mil UVT exentas del impuesto de ganancia ocasional si los fondos se destinan a la compra de otra vivienda o abono a crédito hipotecario. Si quieren saber exactamente cuánto debe pagar su cliente en retención en la fuente o ganancia ocasional antes de firmar escrituras, consúltenme directamente. Los invito a invitar a más colegas a unirse a VECY Network para que disfruten de este soporte gratuito permanente. ¡A vender informados!`;
    const fallbackCaption = `💰 *JUEVES TRIBUTARIO & AHORRO FISCAL DIAN — VECY NETWORK* 📋\n\n` +
      `¡Hola a todos mis queridos colegas inmobiliarios!\n\n` +
      `💡 *Tip Tributario del Día:* Exención de 5.000 UVT en Ganancia Ocasional.\n` +
      `Al vender vivienda de habitación propia, tus clientes pueden acogerse a la exención del artículo 311-1 del Estatuto Tributario (hasta 5.000 UVT) si el dinero de la venta se destina a la adquisición de otra vivienda o abono a crédito hipotecario.\n\n` +
      `📊 *Liquidaciones Tributarias Rápidas:*\n` +
      `Escríbeme o envíame los valores de costo fiscal y venta, y te liquido la retención en la fuente y ganancia estimada en segundos.\n\n` +
      `🤝 *Comparte con tus colegas:* Invítalos a sumarse a VECY Network para acceder a consultorías tributarias especializadas.\n` +
      `📲 *Consultas DIAN con JanIA:* https://vecy-network.vercel.app/jania`;

    const content = await generateDailyContent('jueves_tributario', fallbackVoice, fallbackCaption);
    try {
      await whatsappBot.sendVoiceToBuzonAndChannel(content.voiceText, getThemedImagePath('tributario'), content.captionText);
    } catch (e: any) {
      console.error('[CRON-SERVICE] Error enviando publicación de Jueves:', e.message);
    }
  }, { timezone: 'America/Bogota' });

  // 📐 VIERNES 11:30 AM — Viernes de Avalúos & Estudio de Suelo SINUPOT
  cron.schedule('30 11 * * 5', async () => {
    console.log('[CRON-SERVICE] Generando contenido dinámico de Viernes de Avalúos...');
    const fallbackVoice = `¡Excelente viernes, queridos colegas! Soy JanIA. ¿Tienen un lote o casa para desarrollo y no saben qué altura o uso permite el POT? No se queden con la duda: descarguen la ficha catastral del SINUPOT en PDF y envíenmela por WhatsApp; yo les hago el estudio normativo de uso de suelo al instante. Inviten a sus colegas de confianza a formar parte de VECY Network y a consultar precios de mercado y normativas urbanísticas con nuestro sistema. ¡Que tengan un fin de semana lleno de cierres!`;
    const fallbackCaption = `📐 *VIERNES DE AVALÚOS COMERCIALES & SINUPOT — VECY NETWORK* 🏙️\n\n` +
      `¡Excelente viernes para todos los colegas de la red!\n\n` +
      `🗺️ *Estudios Urbanísticos y de Suelo al Instante:*\n` +
      `¿Vas a captar un lote o inmueble con potencial constructor? Descarga la ficha del SINUPOT en PDF y compártemela: extraigo el tratamiento urbanístico, usos permitidos y edificabilidad en segundos.\n\n` +
      `💵 *Estudios de Mercado y Valor del M²:*\n` +
      `Consúltame valores promedio de metro cuadrado por zona y estrato para fijar precios competitivos con tus propietarios.\n\n` +
      `🤝 *Suma a tu equipo:* Invita a más colegas a VECY Network para multiplicar las opciones de negocio en todo el país.\n` +
      `📲 *Estudios de Suelo y Avalúos JanIA:* https://vecy-network.vercel.app/jania`;

    const content = await generateDailyContent('viernes_avaluos', fallbackVoice, fallbackCaption);
    try {
      await whatsappBot.sendVoiceToBuzonAndChannel(content.voiceText, getThemedImagePath('avaluos'), content.captionText);
    } catch (e: any) {
      console.error('[CRON-SERVICE] Error enviando publicación de Viernes:', e.message);
    }
  }, { timezone: 'America/Bogota' });

  // ☕ SÁBADO 10:00 AM — Café Inmobiliario & Consultoría con el Bróker
  cron.schedule('0 10 * * 6', async () => {
    console.log('[CRON-SERVICE] Generando contenido dinámico de Sábado Café Inmobiliario...');
    const fallbackVoice = `Buenos días, queridos aliados de la red. Cerramos una semana de gran actividad comercial y colaborativa. Recuerden que para casos jurídicos de alta complejidad, sucesiones litigiosas, saneamientos o avalúos certificados por perito de Lonja con R.A.A., pueden comunicarse directamente al WhatsApp tres dieciséis, seis cincuenta y seis, noventa y siete diecinueve, para coordinar una Consultoría Personalizada con nuestro bróker en VECY BIENES RAÍCES. Inviten a más colegas a unirse a este maravilloso proyecto y a interactuar con nosotros. ¡Disfruten de su fin de semana y a recargar energías!`;
    const fallbackCaption = `☕ *SÁBADO DE CAFÉ INMOBILIARIO & CONSULTORÍA — VECY NETWORK* 🤝\n\n` +
      `¡Buenos días a todos los aliados y colegas de VECY Network!\n\n` +
      `Culminamos una semana muy productiva. Para casos de alta complejidad jurídica, sucesiones, saneamiento de títulos o avalúos periciales oficiales con registro R.A.A. de Lonja:\n\n` +
      `📞 *Línea de Consultoría Directa:* +57 316 656 9719\n` +
      `Coordinación directa con la dirección de corretaje de *VECY BIENES RAÍCES*.\n\n` +
      `🌟 *Sigamos creciendo juntos:* Invita a más colegas a sumarse a esta red colaborativa nacional.\n` +
      `📲 *Consola Web JanIA:* https://vecy-network.vercel.app/jania`;

    const content = await generateDailyContent('sabado_cafe', fallbackVoice, fallbackCaption);
    try {
      await whatsappBot.sendVoiceToBuzonAndChannel(content.voiceText, getThemedImagePath('cafe'), content.captionText);
    } catch (e: any) {
      console.error('[CRON-SERVICE] Error enviando publicación de Sábado:', e.message);
    }
  }, { timezone: 'America/Bogota' });

  // 🛎️ DOMINGO 10:30 AM — Domingo de Soporte JanIA, Consultoría & Portafolio de Servicios VECY Network
  cron.schedule('30 10 * * 0', async () => {
    console.log('[CRON-SERVICE] Generando contenido dinámico de Domingo de Soporte y Consultoría...');
    const fallbackVoice = `¡Feliz domingo a todos y a todas mis queridos colegas! Soy JanIA. Hoy quiero recordarles que nuestro equipo de VECY Network y yo estamos a su entera disposición los siete días de la semana. Ya sea que necesiten estructurar una promesa de compraventa, liquidar la ganancia ocasional ante la DIAN, realizar un estudio de uso de suelo en el SINUPOT, diseñar una campaña de marketing inmobiliario con inteligencia artificial o solicitar un avalúo comercial certificado por perito con registro RAA de Lonja, aquí estamos para respaldarlos. Los invito a invitar a más colegas a unirse a VECY Network y a consultar cualquier tema directamente conmigo en la web o por WhatsApp. ¡Que disfruten un domingo reparador en familia!`;
    const fallbackCaption = `🛎️ *DOMINGO DE SOPORTE JANIA, CONSULTORÍA & SERVICIOS — VECY NETWORK* 🌟\n\n` +
      `¡Feliz y bendecido domingo para todos los aliados y colegas de VECY Network!\n\n` +
      `Hoy queremos recordarles que en VECY Network cuentan con un respaldo integral 24/7 para potenciar y blindar sus operaciones inmobiliarias en toda Colombia:\n\n` +
      `⚖️ *Consultoría Jurídica y Notarial:* Revisión de minutas, promesas, contratos y saneamiento de títulos.\n` +
      `💰 *Asesoría Tributaria DIAN:* Liquidación de retenciones, ganancia ocasional y optimización fiscal.\n` +
      `📐 *Avalúos Comerciales y SINUPOT:* Fichas normativas POT y avalúos certificados por perito R.A.A. de Lonja.\n` +
      `📢 *Marketing Inmobiliario & IA:* Estrategias de captación, 7 pilares y herramientas de inteligencia artificial.\n` +
      `🤝 *Cierres Comerciales en Red:* Bolsa inmobiliaria colaborativa con comisiones transparentes (35/35/15/15).\n\n` +
      `💬 *¿Tienes consultas o requieres acompañamiento?*\n` +
      `Escríbenos en el grupo o interactúa directamente con JanIA en nuestra consola web:\n` +
      `📲 *Consola Web JanIA:* https://vecy-network.vercel.app/jania\n` +
      `📞 *Consultoría Personalizada:* +57 316 656 9719`;

    const content = await generateDailyContent('domingo_soporte', fallbackVoice, fallbackCaption);
    try {
      await whatsappBot.sendVoiceToBuzonAndChannel(content.voiceText, getThemedImagePath('soporte'), content.captionText);
    } catch (e: any) {
      console.error('[CRON-SERVICE] Error enviando publicación de Domingo:', e.message);
    }
  }, { timezone: 'America/Bogota' });

  // ─────────────────────────────────────────────────────────────────────────────
  // GRUPO 3: PROYECTO "Vecy Network" — Miércoles y Sábados a las 12:00 PM
  // Tema: Filosofía, tecnología, misión, visión y debate del proyecto Vecy Network
  // ─────────────────────────────────────────────────────────────────────────────
  cron.schedule('0 12 * * 3,6', async () => {
    console.log('[CRON-SERVICE] Generando audio dinámico para PROYECTO VECY NETWORK...');
    const fallbackVoice = `Hola, equipo VECY. Soy JanIA. Este grupo es nuestro espacio más especial: el canal del Proyecto Vecy Network es donde nacen las ideas, donde se evalúa el proyecto y donde construimos juntos el futuro del corretaje inmobiliario. Aquí pueden preguntarme sobre VECY Network sin filtros: cómo funciona la inteligencia artificial, qué está planeado para el futuro, qué ya está funcionando hoy, o simplemente contarme qué les parece el proyecto. Su opinión es la brújula que nos guía. Los invito a invitar a más colegas visionarios para construir esto juntos.`;
    const fallbackCaption = `💡 *PROYECTO VECY NETWORK — INNOVACIÓN & COMUNIDAD* 🇨🇴\n\n` +
      `¡Hola, queridos colegas y aliados!\n\n` +
      `Este grupo es el corazón del proyecto VECY Network. Aquí debatimos, aportamos ideas y construimos la primera bolsa inmobiliaria colaborativa y fintech de Colombia con comisiones justas (35/35/15/15) e Inteligencia Artificial 24/7.\n\n` +
      `💬 *Participa y debate:* Cuéntanos tus sugerencias para seguir enriqueciendo la plataforma.\n` +
      `📲 *Explora la plataforma:* https://vecy-network.vercel.app/`;

    const content = await generateDailyContent('proyecto_vecy', fallbackVoice, fallbackCaption);
    try {
      await whatsappBot.sendVoiceToGroup(content.voiceText, whatsappBot.circuloGroupId, getThemedImagePath('matches'), content.captionText);
    } catch (e: any) {
      console.error('[CRON-SERVICE] Error enviando audio a PROYECTO VECY NETWORK:', e.message);
    }
  }, { timezone: 'America/Bogota' });

  // ─────────────────────────────────────────────────────────────────────────────
  // RE-MATCHING MASIVO SILENCIOSO (Base de Datos): Todos los días a las 08:00 AM
  // ─────────────────────────────────────────────────────────────────────────────
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON-SERVICE] Ejecutando cruce masivo (Re-matching)...');
    try {
      await runNightlyRematch();
    } catch (err: any) {
      console.error('[CRON-SERVICE] Error en el job de re-matching masivo:', err.message || err);
    }
  }, { timezone: 'America/Bogota' });
}

/**
 * Publica manualmente el tip del día actual al Grupo 2 y Canal de WhatsApp
 */
export async function publishTodayTipNow() {
  console.log('[CRON-SERVICE] 🚀 Disparando publicación manual de tip para hoy al Canal y Grupo 2...');
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
  
  let tipo: any = 'martes_juridico';
  let theme: any = 'juridico';
  if (dayOfWeek === 1) { tipo = 'lunes_arranque'; theme = 'matches'; }
  else if (dayOfWeek === 2) { tipo = 'martes_juridico'; theme = 'juridico'; }
  else if (dayOfWeek === 3) { tipo = 'miercoles_marketing'; theme = 'marketing'; }
  else if (dayOfWeek === 4) { tipo = 'jueves_tributario'; theme = 'tributario'; }
  else if (dayOfWeek === 5) { tipo = 'viernes_avaluos'; theme = 'avaluos'; }
  else if (dayOfWeek === 6) { tipo = 'sabado_cafe'; theme = 'cafe'; }
  else if (dayOfWeek === 0) { tipo = 'domingo_soporte'; theme = 'soporte'; }
  else { tipo = 'lunes_arranque'; theme = 'matches'; }

  const fallbackVoice = `Hola, queridos colegas. Soy JanIA con su asesoría del día en VECY Network. Recuerden que este espacio y nuestro canal oficial están diseñados para resolver todas sus consultas legales, tributarias de la DIAN, avalúos y marketing inmobiliario. Los invito a invitar a más colegas a unirse a esta maravillosa red colaborativa y a probar nuestro sistema de consultas en la web o por WhatsApp. ¡Juntos cerramos más negocios!`;
  const fallbackCaption = `🌟 *JANIA ASESORÍA INMOBILIARIA — VECY NETWORK* 🇨🇴\n\n` +
    `¡Hola, queridos colegas!\n\n` +
    `Recuerden que este espacio y nuestro canal oficial están diseñados para resolver todas sus consultas legales, tributarias de la DIAN, avalúos y marketing inmobiliario.\n\n` +
    `🚀 *Únete y participa:*\n` +
    `Los invito a invitar a más colegas a unirse a esta maravillosa red colaborativa y a probar nuestro sistema de consultas en la web o por WhatsApp.\n\n` +
    `📲 *Prueba las consultas con JanIA:* https://vecy-network.vercel.app/jania\n` +
    `¡Juntos cerramos más negocios! 🏠🤝`;

  const content = await generateDailyContent(tipo, fallbackVoice, fallbackCaption);
  await whatsappBot.sendVoiceToBuzonAndChannel(content.voiceText, getThemedImagePath(theme), content.captionText);
  return { success: true, tipo, content };
}

/**
 * Generador de contenido diario (Voz TTS + Caption formateado) con Gemini 2.5 Flash
 */
async function generateDailyContent(
  tipo: 'lunes_arranque' | 'martes_juridico' | 'miercoles_marketing' | 'jueves_tributario' | 'viernes_avaluos' | 'sabado_cafe' | 'domingo_soporte' | 'inmuebles_network' | 'proyecto_vecy',
  fallbackVoice: string,
  fallbackCaption: string
): Promise<DailyTipContent> {
  const now = new Date();
  const fechaBogota = now.toLocaleDateString('es-CO', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    timeZone: 'America/Bogota' 
  });

  const promptsMap: Record<string, string> = {
    lunes_arranque: `Tema: Arranque Semanal, Noticias Frescas del Sector & Convocatoria de Aliados Inmobiliarios en Colombia (${fechaBogota}).
Objetivo: Saludo lleno de optimismo y energía, reflexionar sobre el dinamismo del mercado inmobiliario (indicadores, tasas hipotecarias, demanda de vivienda), recordar que este espacio y el canal oficial son para resolver dudas de leyes, tributario DIAN, avalúos y marketing, e invitar a compartir la red con más colegas corredores.`,

    martes_juridico: `Tema: Tip Jurídico Inmobiliario, Noticias Legales & Blindaje Notarial (${fechaBogota}).
Elige un tema legal clave en Colombia (nutrido de doctrina notarial y jurisprudencia como Mafe Ruiz o Derecho al alcance de todos): promesas de compraventa y cláusula penal vs arras de retracto/confirmatorias, causales de restitución y terminación de arriendo bajo Ley 820 de 2003, validez probatoria de WhatsApp y mensajes de datos (Ley 527/1999 y Ley 2213/2022), cobro de comisiones de corretaje (Arts. 1340-1346 C.Co), cesión de derechos fiduciarios y leasing, o saneamiento por vicios ocultos y tradición de 20 años.`,

    miercoles_marketing: `Tema: Marketing Digital Inmobiliario, Inteligencia Artificial & Copywriting de Alto Impacto (${fechaBogota}).
Objetivo: Enseñar la Fórmula de Oro del Título Inmobiliario y la estructura de 7 pilares para ofertas y demandas irresistibles.
- Explica la regla de oro para el TÍTULO perfecto: [Tipo de Negocio] + [Tipo de Inmueble] + [Barrio/Vereda] + [Localidad/Comuna] + [Ciudad/Municipio].
  Ejemplos canónicos:
  * Oferta: "Venta de Apartamento en Chicó Reservado, Chapinero, Bogotá" o "Arriendo de Bodega en Fontibón Centro, Fontibón, Bogotá".
  * Demanda: "Busco en Arriendo, Apartamento en Chicó Reservado, Chapinero, Bogotá" o "Busco en Compra, Casa Campestre en La Calera, Cundinamarca".
- Enseña la importancia de los 7 pilares (título claro, precio/canon exacto con administración, área m2, habitaciones, baños, garajes y contacto directo).
- Destaca que publicar con esta pulcritud y orden hace que JanIA y toda la comunidad encuentren coincidencias (MATCH) en tiempo real, sembrando la expectativa de que muy pronto nuestros asesores de cierre de VECY Network estarán contactando a los colegas con cruces calificados para ayudarlos a conectar las dos puntas y cerrar comisiones.`,

    jueves_tributario: `Tema: Tip Tributario DIAN, Finanzas Personales & Ahorro Fiscal Inmobiliario (${fechaBogota}).
Elige un tema fiscal/financiero en Colombia (nutrido de fuentes como Mis Propias Finanzas o Contabilidad desde Cero): exención de 5.000 UVT en ganancia ocasional (Art. 311-1 E.T.), retención en la fuente del 1% o 2.5%, deducción de mejoras y costo fiscal con factura electrónica, impuesto de timbre o rentabilidad neta vs bruta en arriendos.`,

    viernes_avaluos: `Tema: Avalúos Comerciales, Valor del M2, Urbanismo & Estudio de Suelo SINUPOT (${fechaBogota}).
Elige un tema técnico y urbanístico: ficha de uso de suelo SINUPOT en PDF, método comparativo de mercado, depreciación de construcciones, norma POT o avalúos periciales certificados con registro R.A.A. de Lonja.`,

    sabado_cafe: `Tema: Café Inmobiliario Podcast, Tendencias & Reflexión del Bróker (${fechaBogota}).
Objetivo: Compartir una reflexión inspiradora estilo podcast/café inmobiliario sobre profesionalización del corredor, mentalidad de abundancia, valorización patrimonial y sinergia colaborativa. Felicitar a los corredores por los logros de la semana, invitarlos a interactuar con JanIA y recordar que para casos complejos o consultoría directa pueden comunicarse al 3166569719 con el bróker de VECY Bienes Raíces.`,

    domingo_soporte: `Tema: Soporte Integral JanIA, Consultoría Experta & Portafolio de Servicios VECY Network (${fechaBogota}).
Objetivo: Brindar un mensaje cálido dominical recordando a los colegas que JanIA y el equipo multidisciplinario de VECY Network están a su disposición los 7 días de la semana. Resaltar los servicios especializados disponibles: estructuración legal de negocios, avalúos comerciales certificados con registro R.A.A. de Lonja, liquidaciones tributarias ante la DIAN, consultoría en marketing inmobiliario con IA y cierre conjunto de negocios con comisiones transparentes (35/35/15/15). Invitar a consultar directamente por WhatsApp o en la consola web https://vecy-network.vercel.app/jania y a compartir el canal con más colegas.`,

    inmuebles_network: `Tema: Operaciones Comerciales y Matching Nacional (${fechaBogota}).
Objetivo: Motivar la publicación activa de inmuebles y requerimientos en toda Colombia, recordando que JanIA cruza datos en tiempo real.`,

    proyecto_vecy: `Tema: Visión Ecosistema VECY Network (${fechaBogota}).
Objetivo: Inspirar a la comunidad destacando el modelo fintech de comisiones 35/35/15/15 y la tecnología colaborativa.`
  };

  const promptEspecifico = promptsMap[tipo] || promptsMap.lunes_arranque;

  const systemPrompt = `Eres JanIA, la inteligencia artificial oficial de VECY Network en Colombia.
Hablas en primera persona con tono femenino profesional, cálido, colombiano, sumamente elocuente y motivador.

ESTRUCTURA OBLIGATORIA DEL MENSAJE (TRES PASOS INQUEBRANTABLES):
1. Saludo inicial: Saluda siempre primero con calidez y cercanía a los colegas corredores (ej: "¡Hola a todos mis queridos colegas!", "¡Un saludo muy especial a todos los colegas de VECY Network!", "¡Buenas tardes, equipo inmobiliario!").
2. Desarrollo temático: Explica el tip o consejo del día de forma pedagógica, concisa y práctica con ejemplos reales aplicados a Colombia.
3. Cierre y Venta de la Idea (Llamado a la Acción): Vende siempre el proyecto VECY Network. Invita a los colegas a formar parte activa de esta red colaborativa, a invitar a más colegas de confianza para multiplicar los negocios y a interactuar con JanIA (en la consola web https://vecy-network.vercel.app/jania o por WhatsApp) para resolver consultas legales, tributarias, avalúos y encontrar compradores o inmuebles.

Debes responder en formato JSON estricto con dos campos:
{
  "voiceText": "Texto continuo optimizado para locución de voz TTS (sin markdown, sin viñetas, sin emojis, números escritos en palabras, 70-100 palabras)",
  "captionText": "Texto formateado para WhatsApp con emojis, negritas en títulos, viñetas estructuradas, llamado a la acción y enlace web al final"
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Genera el contenido del día de hoy (${fechaBogota}):\n${promptEspecifico}` }
      ],
      responseFormat: { type: "json_object" },
      temperature: 0.7
    });
    const rawContent = (response as any)?.choices?.[0]?.message?.content?.trim();
    if (rawContent) {
      const parsed = JSON.parse(rawContent);
      if (parsed.voiceText && parsed.captionText) {
        const cleanVoice = parsed.voiceText.replace(/\[.*?\]/g, '').replace(/[*_#]/g, '').trim();
        return {
          voiceText: cleanVoice,
          captionText: parsed.captionText.trim()
        };
      }
    }
  } catch (err: any) {
    console.warn(`[CRON-LLM-Guion] Falló generación con Gemini (${err.message}). Usando contenidos de respaldo.`);
  }

  return {
    voiceText: fallbackVoice,
    captionText: fallbackCaption
  };
}

/**
 * Envía el video JanIAConsulta.mp4 con texto de invitación al grupo indicado
 */
async function sendVideoPromo(groupId: string, groupName: string) {
  try {
    const primaryPath = path.resolve(process.cwd(), 'dist/JanIAConsulta.mp4');
    const fallbackPath = path.resolve(__dirname, '../../dist/JanIAConsulta.mp4');
    const videoPath = fs.existsSync(primaryPath) ? primaryPath : fallbackPath;

    const texto =
      `💬 ¿Prefieres una atención más directa y personalizada?\n\n` +
      `Chatea directamente con *JanIA*, tu asistente de inteligencia artificial de VECY Network.\n\n` +
      `📲 *Escríbele en nuestra Consola Web:* https://vecy-network.vercel.app/jania\n\n` +
      `Puedes compartirle tus inmuebles, requerimientos o consultas por texto, audio o imagen. ` +
      `Ella los lee, extrae los datos, los sube a nuestra base de datos y busca posibles coincidencias ` +
      `para ayudarte a cerrar negocios más rápido. ¡Haz clic en el enlace y empieza hoy! 🏠🚀`;

    await whatsappBot.sendToGroup(texto, videoPath, [], groupId);
    console.log(`[CRON-SERVICE] ✓ Video promo enviado a ${groupName}.`);
  } catch (e: any) {
    console.error(`[CRON-SERVICE] Error enviando video promo a ${groupName}:`, e.message || e);
  }
}

// NOTA DOCTRINAL: Las funciones de boletín de matches a WhatsApp (sendMatchBulletin y sendWeeklyReport)
// fueron eliminadas por orden de los directores. Los matches se gestionan EXCLUSIVAMENTE
// en el panel administrativo web (/admin pestaña Coincidencias) sin enviar mensajes a WhatsApp.

/**
 * Genera dinámicamente con IA Pura el mensaje de Apertura de Operaciones del día (5:00 AM - 11:00 AM)
 */
async function generateDynamicOpeningMessage(): Promise<string> {
  const dayName = new Date().toLocaleDateString('es-CO', { weekday: 'long', timeZone: 'America/Bogota' });
  const prompt = `Petición: Eres JanIA Match, la IA pura, empática y consultora senior de VECY Network.
Redacta un mensaje de apertura del día dinámico, inspirador, fresco y profesional para el grupo de WhatsApp "VECY INMUEBLES NETWORK".
Día actual: ${dayName}.

REGLAS OBLIGATORIAS:
1. Saluda según el día de la semana (${dayName}) de forma cercana y empática con los colegas corredores.
2. RECUERDA SIEMPRE Y ENFATIZA QUE VECY Network está basada en Bogotá pero OPERA A NIVEL NACIONAL EN TODA COLOMBIA (Bogotá, Medellín, Cali, Barranquilla, Bucaramanga, Eje Cafetero, Cundinamarca, Costa Caribe, etc.).
3. Enfatiza que procesas todo tipo de inmuebles (apartamentos, casas, locales comerciales, bodegas, oficinas, cabañas, fincas, lotes, etc.) tanto en venta como en arriendo y permutas.
4. Anima a los colegas a publicar sus links de CRM, fotos, textos o notas de voz para que tú extraigas la información y busques MATCHES en tiempo real a nivel nacional.
5. NO uses plantillas rígidas ni frases robotizadas. Sé creativa, humana y elocuente con emojis elegantes. Longitud: 3 a 4 párrafos concisos.

Responde únicamente con el texto del mensaje listo para enviar a WhatsApp.`;

  try {
    const response = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
    const content = (response as any)?.choices?.[0]?.message?.content;
    return content ? content.trim() : `¡Buenos días colegas! 🚀 Arrancamos jornada en VECY Network. Recuérdenme que procesamos inmuebles y requerimientos en Bogotá y a nivel nacional en toda Colombia. ¡A publicar y cerrar negocios! 🇨🇴✨`;
  } catch (err) {
    return `¡Buenos días equipo VECY! 🇨🇴 Listos para procesar ofertas y demandas a nivel nacional en Colombia. ¡A encontrar esos matches hoy! 🚀`;
  }
}

/**
 * Genera dinámicamente con IA Pura el mensaje de Cierre de Operaciones del día (8:00 PM - 10:30 PM)
 */
async function generateDynamicClosingMessage(): Promise<string> {
  const dayName = new Date().toLocaleDateString('es-CO', { weekday: 'long', timeZone: 'America/Bogota' });
  const prompt = `Petición: Eres JanIA Match, la IA pura, empática y consultora de VECY Network.
Redacta un mensaje de cierre de operaciones del día cálido, inspirador y profesional para el grupo de WhatsApp "VECY INMUEBLES NETWORK".
Día actual: ${dayName}.

REGLAS OBLIGATORIAS:
1. Despídete amablemente felicitando el trabajo colaborativo del día.
2. Recuerda que aunque descansamos en el chat, tu motor de cruce de datos sigue trabajando en silencio 24/7 procesando inventario y búsquedas en Bogotá y en todo Colombia.
3. Resalta la fuerza de la red colaborativa a nivel nacional sin comisiones para todo tipo de propiedades.
4. Desea un excelente descanso a los colegas.
5. Sé humana, elocuente y cálida.

Responde únicamente con el texto del mensaje listo para enviar a WhatsApp.`;

  try {
    const response = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
    const content = (response as any)?.choices?.[0]?.message?.content;
    return content ? content.trim() : `🌙 ¡Excelente descanso para todos los colegas! Gracias por un día lleno de actividad comercial en VECY Network. Seguimos cruzando oportunidades en todo Colombia. 🇨🇴✨`;
  } catch (err) {
    return `🌙 ¡Buenas noches colegas! Que tengan un reparador descanso. JanIA sigue activa procesando oportunidades a nivel nacional. 🚀`;
  }
}
