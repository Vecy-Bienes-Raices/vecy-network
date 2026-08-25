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
function getThemedImagePath(tipo: 'juridico' | 'marketing' | 'tributario' | 'avaluos' | 'matches'): string | undefined {
  const primaryPath = path.resolve(process.cwd(), `client/public/assets/jania/jania_${tipo}.jpg`);
  const distPath = path.resolve(process.cwd(), `dist/assets/jania/jania_${tipo}.jpg`);
  const serverPath = path.resolve(__dirname, `../../client/public/assets/jania/jania_${tipo}.jpg`);
  if (fs.existsSync(primaryPath)) return primaryPath;
  if (fs.existsSync(distPath)) return distPath;
  if (fs.existsSync(serverPath)) return serverPath;
  return undefined;
}

export function initCronScheduler() {
  console.log('[CRON-SERVICE] Inicializando orquestador de agendas automatizadas v3.2 (Parrilla Semanal de Audios, Ilustraciones 3D y Re-matching)...');

  // ─────────────────────────────────────────────────────────────────────────────
  // GRUPO 1: VECY INMUEBLES NETWORK — Lunes y Jueves a las 11:00 AM
  // Tema: Operaciones comerciales, publicación de inmuebles/requerimientos y matching nacional
  // ─────────────────────────────────────────────────────────────────────────────
  cron.schedule('0 11 * * 1,4', async () => {
    console.log('[CRON-SERVICE] Generando audio dinámico para VECY INMUEBLES NETWORK...');
    const fallback = `Buenos días a todos y a todas. Soy JanIA, la inteligencia artificial de VECY Network. Hoy quiero recordarles que este grupo es nuestro centro de operaciones comerciales. Aquí publican sus inmuebles en venta o arriendo, sus requerimientos de compra o renta, y yo me encargo de cruzar toda esa información en tiempo real en los 32 departamentos de Colombia para detectar MATCHES y hacer posibles cierres de negocios. ¿Ya publicaste hoy? Cada inmueble que compartes aquí es una oportunidad de negocio que no puedes dejar pasar. Puedes enviar texto, nota de voz, imagen o flyer y yo lo proceso automáticamente. Sigan publicando sus inmuebles, colegas, e inviten a más colegas a unirse a esta red. Entre más seamos, más matches encontramos. ¡Hoy puede ser el día de tu próximo cierre!`;
    const guion = await generateDynamicVoiceScript('inmuebles_network', fallback);
    try {
      await whatsappBot.sendVoiceToGroup(guion, whatsappBot.targetGroupId, getThemedImagePath('matches'));
    } catch (e: any) {
      console.error('[CRON-SERVICE] Error enviando audio a VECY INMUEBLES NETWORK:', e.message);
    }
  }, { timezone: 'America/Bogota' });

  // ─────────────────────────────────────────────────────────────────────────────
  // GRUPO 2: VECY: SOPORTE LEGAL, TRIBUTARIO, AVALÚOS Y MARKETING + CANAL WHATSAPP
  // PARRILLA SEMANAL DIARIA DE AUDIOS 100% DINÁMICOS E INÉDITOS (LUNES A SÁBADO)
  // ─────────────────────────────────────────────────────────────────────────────

  // 🚀 LUNES 08:00 AM — Arranque Semanal & Convocatoria de Aliados
  cron.schedule('0 8 * * 1', async () => {
    console.log('[CRON-SERVICE] Generando audio dinámico de Lunes para SOPORTE LEGAL, MARKETING Y CANAL...');
    const fallback = `¡Buenos días a todos y a todas! Soy JanIA. Arrancamos una semana llena de oportunidades de negocio y cierres inmobiliarios. Recuerden que este espacio es su consultorio permanente: aquí pueden preguntarme por texto o nota de voz sobre leyes inmobiliarias, cómo liquidar la ganancia ocasional ante la DIAN, avalúos de mercado o cómo redactar un anuncio de alto impacto para sus inmuebles y requerimientos. La información es poder en los negocios. Los invito a que no se queden con dudas hoy y a que compartan el enlace de este grupo con sus colegas de confianza: entre más asesores capacitados seamos, más blindados y profesionales cerramos negocios en Colombia. ¡Que tengan una semana extraordinaria y productiva!`;
    const guion = await generateDynamicVoiceScript('lunes_arranque', fallback);
    try {
      await whatsappBot.sendVoiceToBuzonAndChannel(guion, getThemedImagePath('matches'));
    } catch (e: any) {
      console.error('[CRON-SERVICE] Error enviando audio de Lunes:', e.message);
    }
  }, { timezone: 'America/Bogota' });

  // ⚖️ MARTES 11:00 AM — Martes Jurídico & Blindaje Notarial
  cron.schedule('0 11 * * 2', async () => {
    console.log('[CRON-SERVICE] Generando audio dinámico de Martes Jurídico...');
    const fallback = `Hola, colegas. Soy JanIA con su tip jurídico del día. ¿Sabían que un simple correo electrónico con la hoja de presentación del cliente o el acuerdo de puntas compartidas tiene plena validez probatoria bajo la Ley 527 de 1999? Nunca muestren un inmueble sin dejar registro escrito. Si tienen dudas sobre una promesa de compraventa, una restitución o cómo redactar una minuta, pregúntenme aquí mismo o envíenme el documento en PDF y lo revisamos juntos al instante.`;
    const guion = await generateDynamicVoiceScript('martes_juridico', fallback);
    try {
      await whatsappBot.sendVoiceToBuzonAndChannel(guion, getThemedImagePath('juridico'));
    } catch (e: any) {
      console.error('[CRON-SERVICE] Error enviando audio de Martes:', e.message);
    }
  }, { timezone: 'America/Bogota' });

  // 📢 MIÉRCOLES 11:30 AM — Miércoles de Marketing Inmobiliario & Copywriting
  cron.schedule('30 11 * * 3', async () => {
    console.log('[CRON-SERVICE] Generando audio dinámico de Miércoles de Marketing...');
    const fallback = `¡Buenas tardes, equipo! Soy JanIA con su tip de Marketing Inmobiliario. El ochenta por ciento de los clientes y colegas descartan una publicación si no tiene el precio claro, el barrio exacto o el metraje. Si quieren que sus ofertas y requerimientos se cierren en tiempo récord, incluyan siempre los siete pilares: tipo de inmueble, barrio y ciudad, precio y administración, área en metros cuadrados, habitaciones, garajes independientes o en línea, y su enlace directo de WhatsApp. ¿Tienen un inmueble difícil de mover? Escríbanme los datos y les ayudo a redactar un copy persuasivo hoy mismo.`;
    const guion = await generateDynamicVoiceScript('miercoles_marketing', fallback);
    try {
      await whatsappBot.sendVoiceToBuzonAndChannel(guion, getThemedImagePath('marketing'));
    } catch (e: any) {
      console.error('[CRON-SERVICE] Error enviando audio de Miércoles:', e.message);
    }
  }, { timezone: 'America/Bogota' });

  // 💰 JUEVES 11:00 AM — Jueves Tributario & Ahorro Fiscal DIAN
  cron.schedule('0 11 * * 4', async () => {
    console.log('[CRON-SERVICE] Generando audio dinámico de Jueves Tributario...');
    const fallback = `Hola a todos. Soy JanIA con un consejo financiero clave para sus clientes vendedores. Al vender vivienda de habitación, pueden deducir hasta cinco mil UVT exentas del impuesto de ganancia ocasional si los fondos se destinan a la compra de otra vivienda o abono a crédito hipotecario. Si quieren saber exactamente cuánto debe pagar su cliente en retención en la fuente o ganancia ocasional antes de firmar escrituras, consúltenme aquí y les hago la liquidación en segundos.`;
    const guion = await generateDynamicVoiceScript('jueves_tributario', fallback);
    try {
      await whatsappBot.sendVoiceToBuzonAndChannel(guion, getThemedImagePath('tributario'));
    } catch (e: any) {
      console.error('[CRON-SERVICE] Error enviando audio de Jueves:', e.message);
    }
  }, { timezone: 'America/Bogota' });

  // 📐 VIERNES 11:30 AM — Viernes de Avalúos & Estudio de Suelo SINUPOT
  cron.schedule('30 11 * * 5', async () => {
    console.log('[CRON-SERVICE] Generando audio dinámico de Viernes de Avalúos...');
    const fallback = `¡Excelente viernes, colegas! Soy JanIA. ¿Tienen un lote o casa para desarrollo y no saben qué altura o uso permite el POT? No se queden con la duda: descarguen la ficha catastral del SINUPOT en PDF y envíenmela por WhatsApp en privado; yo les hago el estudio normativo de uso de suelo al instante. Y para estimar el valor del metro cuadrado en cualquier sector, aquí estoy para asesorarlos.`;
    const guion = await generateDynamicVoiceScript('viernes_avaluos', fallback);
    try {
      await whatsappBot.sendVoiceToBuzonAndChannel(guion, getThemedImagePath('avaluos'));
    } catch (e: any) {
      console.error('[CRON-SERVICE] Error enviando audio de Viernes:', e.message);
    }
  }, { timezone: 'America/Bogota' });

  // ☕ SÁBADO 10:00 AM — Café Inmobiliario & Consultoría con el Bróker
  cron.schedule('0 10 * * 6', async () => {
    console.log('[CRON-SERVICE] Generando audio dinámico de Sábado Café Inmobiliario...');
    const fallback = `Buenos días, aliados de la red. Cerramos semana de gran actividad comercial. Recuerden que para casos jurídicos de alta complejidad, sucesiones litigiosas, saneamientos o avalúos certificados por perito de Lonja con R.A.A., pueden comunicarse directamente al WhatsApp tres dieciséis, seis cincuenta y seis, noventa y siete diecinueve, para coordinar una Consultoría Personalizada con nuestro bróker en VECY BIENES RAÍCES. ¡Disfruten de su fin de semana y a recargar energías!`;
    const guion = await generateDynamicVoiceScript('sabado_cafe', fallback);
    try {
      await whatsappBot.sendVoiceToBuzonAndChannel(guion, getThemedImagePath('matches'));
    } catch (e: any) {
      console.error('[CRON-SERVICE] Error enviando audio de Sábado:', e.message);
    }
  }, { timezone: 'America/Bogota' });

  // ─────────────────────────────────────────────────────────────────────────────
  // GRUPO 3: PROYECTO "Vecy Network" — Miércoles y Sábados a las 12:00 PM
  // Tema: Filosofía, tecnología, misión, visión y debate del proyecto Vecy Network
  // ─────────────────────────────────────────────────────────────────────────────
  cron.schedule('0 12 * * 3,6', async () => {
    console.log('[CRON-SERVICE] Generando audio dinámico para PROYECTO VECY NETWORK...');
    const fallback = `Hola, equipo VECY. Soy JanIA. Este grupo es nuestro espacio más especial: el canal del Proyecto Vecy Network es donde nacen las ideas, donde se evalúa el proyecto, donde los fundadores escuchan directamente a quienes hacen posible esta red. Aquí pueden preguntarme sobre VECY Network sin filtros: cómo funciona la inteligencia artificial, qué está planeado para el futuro, qué ya está funcionando hoy, o simplemente contarme qué les parece el proyecto. También es el lugar donde debatimos con la competencia de frente y con argumentos. Su opinión es la brújula que nos guía. Sigan preguntando acerca de VECY Network. Cada idea que aportan aquí nos hace más fuertes. E inviten a más colegas visionarios. Queremos construir esto juntos.`;
    const guion = await generateDynamicVoiceScript('proyecto_vecy', fallback);
    try {
      await whatsappBot.sendVoiceToGroup(guion, whatsappBot.circuloGroupId, getThemedImagePath('marketing'));
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
 * Generador de guiones de voz 100% DINÁMICOS con Gemini
 * Crea variaciones únicas, novedosas y con psicología persuasiva para cada audio.
 */
async function generateDynamicVoiceScript(
  tipo: 'lunes_arranque' | 'martes_juridico' | 'miercoles_marketing' | 'jueves_tributario' | 'viernes_avaluos' | 'sabado_cafe' | 'inmuebles_network' | 'proyecto_vecy',
  fallback: string
): Promise<string> {
  const now = new Date();
  const fechaBogota = now.toLocaleDateString('es-CO', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    timeZone: 'America/Bogota' 
  });

  const promptsMap: Record<string, string> = {
    lunes_arranque: `Redacta un guion de audio motivacional para hoy ${fechaBogota} para el grupo "VECY: SOPORTE LEGAL, TRIBUTARIO, AVALÚOS Y MARKETING".
Objetivo: Dar la bienvenida a la semana con mucha energía y optimismo, recordar que en el grupo pueden consultar por texto o nota de voz sobre leyes, impuestos DIAN, avalúos y marketing inmobiliario, e invitar con entusiasmo a compartir el enlace del grupo con más colegas corredores para crecer la comunidad.`,

    martes_juridico: `Redacta un guion de audio con un TIP JURÍDICO INMOBILIARIO puntual, novedoso y muy útil para hoy ${fechaBogota} en Colombia.
Elige AL AZAR un tema jurídico clave: (ej. Ley 820 y causales de terminación de arriendo, cláusula penal y arras en promesas de compraventa, validez probatoria de correos y WhatsApp Ley 527/1999, cobro de comisiones con acuerdos de puntas compartidas, cesión de leasing, o saneamiento por vicios ocultos).
Invita a que envíen sus dudas o documentos en PDF al grupo para revisarlos.`,

    miercoles_marketing: `Redacta un guion de audio con un TIP DE MARKETING DIGITAL Y PUBLICACIÓN ESTRATÉGICA EN WHATSAPP para hoy ${fechaBogota}.
Elige AL AZAR un tema práctico y pedagógico:
1. Cómo redactar publicaciones completas en WhatsApp para que no se pierdan en el chat (los 7 pilares: tipo de inmueble, ciudad y barrio exacto, precio/canon y administración, área en m2, habitaciones, baños, garajes independientes/lineales y contacto directo).
2. Explicar con mucha calidez y entusiasmo que cuando publican con todos los datos, facilitan que toda la comunidad y el sistema encuentren parejas comerciales de inmediato.
3. Sembrar sutilmente la expectativa y dar pistas de que JanIA ya está analizando todas las publicaciones en segundo plano y encontrando decenas de coincidencias, y que muy pronto nuestros asesores y directores de cierre de VECY Network estarán contactando de forma personalizada a los colegas con matches activos para conectar las dos puntas y ayudarlos a cerrar sus comisiones en tiempo récord.
Recuerda que JanIA los asesora a redactar anuncios de alto impacto directamente en el grupo.`,

    jueves_tributario: `Redacta un guion de audio con un TIP TRIBUTARIO INMOBILIARIO DIAN para hoy ${fechaBogota} en Colombia.
Elige AL AZAR un tema fiscal: (ej. exención de 5.000 UVT en ganancia ocasional por venta de vivienda habitual, cálculo de retención en la fuente del 1%, cómo deducir mejoras con facturas electrónicas, impuesto de timbre o actualización de costo fiscal).
Invítalos a pedirle liquidaciones tributarias estimadas en el grupo antes de ir a notaría.`,

    viernes_avaluos: `Redacta un guion de audio con un TIP DE AVALÚOS Y ESTUDIO DE SUELO SINUPOT para hoy ${fechaBogota}.
Elige AL AZAR un tema técnico: (ej. cómo consultar el uso de suelo y altura permitida descargando la ficha del SINUPOT en PDF, cómo calcular el valor del metro cuadrado por método comparativo de mercado, factores de depreciación o la importancia del avalúo pericial certificado de Lonja para evitar objeciones de bancos).
Invítalos a enviar fichas del SINUPOT en PDF o consultar precios de mercado.`,

    sabado_cafe: `Redacta un guion de audio de CIERRE DE SEMANA & CAFÉ INMOBILIARIO para hoy ${fechaBogota}.
Objetivo: Felicitar a los corredores por la gestión semanal, recordar que para casos complejos, sucesiones, peritajes o avalúos oficiales certificados pueden contactar directamente por WhatsApp al tres dieciséis, seis cincuenta y seis, noventa y siete diecinueve para consultorías personalizadas con el bróker de VECY BIENES RAÍCES.`,

    inmuebles_network: `Redacta un guion de audio comercial dinámico para el grupo principal "VECY INMUEBLES NETWORK" para hoy ${fechaBogota}.
Objetivo: Motivar la publicación activa de ofertas y requerimientos con datos completos (precio real, barrio exacto, metraje y características clave), recordando que JanIA cruza datos en tiempo real.
Dar la primicia de que ya se están detectando múltiples coincidencias en la red y que muy pronto nuestro equipo de asesores de cierre de VECY Network se comunicará directamente con las partes para coordinar los acercamientos y cierres de negocios.`,

    proyecto_vecy: `Redacta un guion de audio institucional y visionario para el grupo "PROYECTO Vecy Network" para hoy ${fechaBogota}.
Objetivo: Inspirar a la comunidad, destacar el modelo colaborativo fintech de comisiones del 3% (35/35/15/15), la tecnología de JanIA, invitar a debatir y sugerir ideas de mejora tecnológica directamente a los fundadores.`
  };

  const promptEspecifico = promptsMap[tipo] || promptsMap.lunes_arranque;

  const systemPrompt = `Eres JanIA, la inteligencia artificial oficial de VECY Network en Colombia.
Hablas en primera persona con tono femenino profesional, cálido, colombiano, sumamente elocuente y motivador.
Escribe un guion para ser locutado por síntesis de voz (Text-to-Speech).

REGLAS ESTRICTAS DE LOCUCIÓN:
1. Duración: Debe tomar entre 30 y 45 segundos al hablar (aproximadamente 60 a 90 palabras).
2. Estilo: Conversacional, inspirador y directo al grano, sin rodeos ni introducción de locutor (NO incluyas [Música de fondo], [Sonido], ni etiquetas).
3. Pronunciación: Escribe los números y siglas en texto fácil de leer (ej. "cinco mil U-V-T", "ochenta por ciento", "metro cuadrado", "P-O-T"). Si mencionas el teléfono del bróker escribe "tres dieciséis, seis cincuenta y seis, noventa y siete diecinueve".
4. Variedad: Sé creativa, usa metáforas frescas y NUNCA uses la misma fraseología previa. Cada día debe sentirse único y estimulante.

${promptEspecifico}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Genera el guion inédito de hoy ${fechaBogota}:` }
      ],
      temperature: 0.7
    });
    const content = (response as any)?.choices?.[0]?.message?.content?.trim();
    if (content && content.length > 50) {
      // Limpiar posibles etiquetas de audio o markdown
      const cleaned = content.replace(/\[.*?\]/g, '').replace(/[*_#]/g, '').trim();
      return cleaned;
    }
  } catch (err: any) {
    console.warn(`[CRON-LLM-Guion] Falló generación con Gemini (${err.message}). Usando guion de respaldo.`);
  }

  return fallback;
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
