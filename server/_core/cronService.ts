import cron from 'node-cron';
import path from 'path';
import { getDb } from '../db';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { propertyMatches, requirements, properties } from '../../drizzle/schema';
import { gte, and, eq, sql } from 'drizzle-orm';
import { janiaMatchBot as whatsappBot } from './whatsapp-match';
import { runNightlyRematch } from '../jobs/nightlyRematch';

/**
 * Servicio Cron de JanIA v3.0
 * Mensajes de audio personalizados por grupo + video promo diario + informe semanal + re-matching.
 */

export function initCronScheduler() {
  console.log('[CRON-SERVICE] Inicializando orquestador de agendas automatizadas v3.0...');

  // ─────────────────────────────────────────────────────────────────────────────
  // AUDIO 1: VECY INMUEBLES NETWORK — Lunes y Jueves a las 11:00 AM
  // ─────────────────────────────────────────────────────────────────────────────
  cron.schedule('0 11 * * 1,4', async () => {
    console.log('[CRON-SERVICE] Enviando audio semanal a VECY INMUEBLES NETWORK...');
    const guion = `Buenos días a todos y a todas. Soy JanIA, la inteligencia artificial de VECY Network. Hoy quiero recordarles que este grupo es nuestro centro de operaciones comerciales. Aquí publican sus inmuebles en venta o arriendo, sus requerimientos de compra o renta, y yo me encargo de cruzar toda esa información en tiempo real en los 32 departamentos de Colombia para detectar MATCHES y hacer posibles cierres de negocios. ¿Ya publicaste hoy? Cada inmueble que compartes aquí es una oportunidad de negocio que no puedes dejar pasar. Puedes enviar texto, nota de voz, imagen o flyer y yo lo proceso automáticamente. Sigan publicando sus inmuebles, colegas, e inviten a más colegas a unirse a esta red. Entre más seamos, más matches encontramos. ¡Hoy puede ser el día de tu próximo cierre!`;
    try {
      await whatsappBot.sendVoiceToGroup(guion, whatsappBot.targetGroupId);
    } catch (e: any) {
      console.error('[CRON-SERVICE] Error enviando audio a VECY INMUEBLES NETWORK:', e.message);
    }
  }, { timezone: 'America/Bogota' });

  // ─────────────────────────────────────────────────────────────────────────────
  // AUDIO 2: VECY: SOPORTE LEGAL, TRIBUTARIO Y AVALÚOS — Martes y Viernes a las 11:30 AM
  // ─────────────────────────────────────────────────────────────────────────────
  cron.schedule('30 11 * * 2,5', async () => {
    console.log('[CRON-SERVICE] Enviando audio semanal a VECY: SOPORTE LEGAL...');
    const guion = `Hola a todos por aquí. Soy JanIA, y este espacio es nuestro rincón de consultoría jurídica y técnica de VECY Network. Aquí no hay preguntas tontas: si tienes dudas sobre un contrato de arrendamiento, una promesa de compraventa, una sucesión, el cálculo de ganancia ocasional, cómo cobrar una comisión que te deben, o simplemente quieres estimar el valor por metro cuadrado de un inmueble, este es tu lugar. El conocimiento jurídico es poder en los negocios. No dejes que la duda te frene. Escríbeme aquí o envíame una nota de voz y te respondo con criterio legal, rigor técnico y total honestidad. Sigan haciendo sus consultas, colegas. Y si conocen a alguien del sector que necesita este apoyo, invítenlos al grupo. Juntos elevamos el nivel profesional del gremio.`;
    try {
      await whatsappBot.sendVoiceToGroup(guion, whatsappBot.buzonGroupId);
    } catch (e: any) {
      console.error('[CRON-SERVICE] Error enviando audio a SOPORTE LEGAL:', e.message);
    }
  }, { timezone: 'America/Bogota' });

  // ─────────────────────────────────────────────────────────────────────────────
  // AUDIO 3: CÍRCULO CERO 👌 — Miércoles y Sábados a las 12:00 PM
  // ─────────────────────────────────────────────────────────────────────────────
  cron.schedule('0 12 * * 3,6', async () => {
    console.log('[CRON-SERVICE] Enviando audio semanal a CÍRCULO CERO...');
    const guion = `Hola, equipo VECY. Soy JanIA. Este grupo es nuestro espacio más especial: el Círculo Cero es donde nacen las ideas, donde se evalúa el proyecto, donde los fundadores escuchan directamente a quienes hacen posible esta red. Aquí pueden preguntarme sobre VECY Network sin filtros: cómo funciona la inteligencia artificial, qué está planeado para el futuro, qué ya está funcionando hoy, o simplemente contarme qué les parece el proyecto. También es el único lugar donde debatimos con la competencia de frente y con argumentos. Su opinión es la brújula que nos guía. Sigan preguntando acerca de VECY Network. Cada idea que aportan aquí nos hace más fuertes. E inviten a más colegas visionarios. Queremos construir esto juntos.`;
    try {
      await whatsappBot.sendVoiceToGroup(guion, whatsappBot.circuloGroupId);
    } catch (e: any) {
      console.error('[CRON-SERVICE] Error enviando audio a CÍRCULO CERO:', e.message);
    }
  }, { timezone: 'America/Bogota' });

  // ─────────────────────────────────────────────────────────────────────────────
  // VIDEO + TEXTO CON @TODOS: VECY INMUEBLES NETWORK — Lunes, Jueves y Sábados a las 6:00 PM
  // ─────────────────────────────────────────────────────────────────────────────
  cron.schedule('0 18 * * 1,4,6', async () => {
    console.log('[CRON-SERVICE] Enviando video JanIAConsulta a VECY INMUEBLES NETWORK...');
    await sendVideoPromo(whatsappBot.targetGroupId, 'VECY INMUEBLES NETWORK');
  }, { timezone: 'America/Bogota' });

  // ─────────────────────────────────────────────────────────────────────────────
  // VIDEO + TEXTO CON @TODOS: SOPORTE LEGAL — Martes, Viernes y Domingos a las 6:30 PM
  // ─────────────────────────────────────────────────────────────────────────────
  cron.schedule('30 18 * * 2,5,0', async () => {
    console.log('[CRON-SERVICE] Enviando video JanIAConsulta a SOPORTE LEGAL...');
    await sendVideoPromo(whatsappBot.buzonGroupId, 'VECY: SOPORTE LEGAL, TRIBUTARIO Y AVALÚOS');
  }, { timezone: 'America/Bogota' });

  // ─────────────────────────────────────────────────────────────────────────────
  // VIDEO + TEXTO CON @TODOS: CÍRCULO CERO — Lunes, Miércoles, Viernes y Domingos a las 7:00 PM
  // ─────────────────────────────────────────────────────────────────────────────
  cron.schedule('0 19 * * 1,3,5,0', async () => {
    console.log('[CRON-SERVICE] Enviando video JanIAConsulta a CÍRCULO CERO...');
    await sendVideoPromo(whatsappBot.circuloGroupId, process.env.GROUP_ZERO_NAME || 'PROYECTO "Vecy Network"');
  }, { timezone: 'America/Bogota' });

  // ─────────────────────────────────────────────────────────────────────────────
  // INFORME SEMANAL: Viernes 07:00 PM — con datos 100% reales de BD
  // ─────────────────────────────────────────────────────────────────────────────
  cron.schedule('0 19 * * 5', async () => {
    console.log('[CRON-SERVICE] Generando y enviando Informe Semanal de Actividad...');
    await sendWeeklyReport();
  }, { timezone: 'America/Bogota' });

  // ─────────────────────────────────────────────────────────────────────────────
  // RE-MATCHING MASIVO: Todos los días a las 08:00 AM
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
 * Envía el video JanIAConsulta.mp4 con texto de invitación al grupo indicado
 */
async function sendVideoPromo(groupId: string, groupName: string) {
  try {
    if (!groupId) return;
    const videoPath = path.resolve(__dirname, '../../dist/JanIAConsulta.mp4');

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

/**
 * Consulta la base de datos y genera el boletín de matches calificados (Score >= 85)
 * Incluye acumulados históricos si el periodo es NOCTURNO.
 */
async function sendMatchBulletin(periodName: string) {
  try {
    const db = await getDb();
    if (!db) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // v11.45: Filtro con casteo numérico explícito para evitar fallos lexicográficos
    const matches = await db.select({
      matchScore: propertyMatches.matchScore,
      buyerAdvisor: requirements.idUsuarioWhatsapp,
      sellerAdvisor: properties.idUsuarioWhatsapp,
    })
    .from(propertyMatches)
    .innerJoin(requirements, eq(propertyMatches.requirementId, requirements.id))
    .innerJoin(properties, eq(propertyMatches.propertyId, properties.id))
    .where(and(
      gte(sql<number>`(${propertyMatches.matchScore})::numeric`, 85),
      gte(propertyMatches.createdAt, todayStart)
    ))
    .execute();

    // Si no hay matches hoy y no es reporte nocturno, podemos omitir
    if (matches.length === 0 && !periodName.includes('NOCTURNO')) {
      console.log(`[CRON-SERVICE] Sin matches calificados para el boletín ${periodName}.`);
      return;
    }

    const jidsToMention: string[] = [];
    let bulletin = `🎯 ¡BOLETÍN DE MATCHES ${periodName} VECY! 🎯\n` +
                   `He conectado las siguientes intenciones comerciales en la red en las últimas horas:\n\n`;

    if (matches.length > 0) {
      matches.forEach(m => {
        const buyer = m.buyerAdvisor?.split('@')[0] || 'Asesor';
        const seller = m.sellerAdvisor?.split('@')[0] || 'Asesor';
        const score = Math.round(Number(m.matchScore));
        
        bulletin += `• 🔎 REQUERIMIENTO de: @${buyer} ⇄ 🏠 INMUEBLE de: @${seller} (Coincidencia: ${score}%)\n`;
        
        if (m.buyerAdvisor) jidsToMention.push(m.buyerAdvisor);
        if (m.sellerAdvisor) jidsToMention.push(m.sellerAdvisor);
      });
      bulletin += `\n¡Colegas, los invito a abrir sus chats privados y ponerse en contacto para cerrar la operación! 🚀`;
    } else {
      bulletin += `• No se registraron coincidencias directas en la jornada de hoy. ¡Sigamos publicando activamente para generar nuevos cruces! 💪`;
    }

    // Boletín nocturno agrega estadísticas de la semana (7 días) y del mes (30 días)
    if (periodName.includes('NOCTURNO')) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      
      const monthStart = new Date();
      monthStart.setDate(monthStart.getDate() - 30);

      const weekMatches = await db
        .select({ count: sql<number>`count(*)` })
        .from(propertyMatches)
        .where(gte(propertyMatches.createdAt, weekStart))
        .execute();

      const monthMatches = await db
        .select({ count: sql<number>`count(*)` })
        .from(propertyMatches)
        .where(gte(propertyMatches.createdAt, monthStart))
        .execute();

      const countSemana = weekMatches[0]?.count || 0;
      const countMes = monthMatches[0]?.count || 0;

      bulletin += `\n\n📊 *RECUENTO DE COINCIDENCIAS VECY:*` +
                  `\n▸ Cruces en los últimos 7 días: *${countSemana}*` +
                  `\n▸ Cruces en los últimos 30 días: *${countMes}*\n`;
    }

    console.log('[CRON-SERVICE] Enviando boletín de matches a VECY INMUEBLES NETWORK...');
    await whatsappBot.sendToGroup(bulletin, undefined, Array.from(new Set(jidsToMention)));
    console.log(`[CRON-SERVICE] Boletín ${periodName} enviado con éxito.`);

  } catch (error) {
    console.error(`[CRON-SERVICE] Error generando boletín ${periodName}:`, error);
  }
}

/**
 * Genera y envía el informe semanal de actividad comercial con datos reales de la BD
 */
async function sendWeeklyReport() {
  try {
    const db = await getDb();
    if (!db) return;

    // 1. Contar totales reales en la base de datos
    const propertiesCountRes = await db.select({ count: sql<number>`count(*)` }).from(properties).execute();
    const requirementsCountRes = await db.select({ count: sql<number>`count(*)` }).from(requirements).execute();
    
    // Contamos matches con score >= 85
    const matchesCountRes = await db.select({ count: sql<number>`count(*)` })
      .from(propertyMatches)
      .where(gte(sql<number>`(${propertyMatches.matchScore})::numeric`, 85))
      .execute();

    const totalProperties = propertiesCountRes[0]?.count || 0;
    const totalRequirements = requirementsCountRes[0]?.count || 0;
    const totalMatches = matchesCountRes[0]?.count || 0;

    // 2. Obtener matches reales de los últimos 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const matchesThisWeek = await db.select({
      matchScore: propertyMatches.matchScore,
      buyerAdvisor: requirements.idUsuarioWhatsapp,
      sellerAdvisor: properties.idUsuarioWhatsapp,
    })
    .from(propertyMatches)
    .innerJoin(requirements, eq(propertyMatches.requirementId, requirements.id))
    .innerJoin(properties, eq(propertyMatches.propertyId, properties.id))
    .where(and(
      gte(sql<number>`(${propertyMatches.matchScore})::numeric`, 85),
      gte(propertyMatches.createdAt, sevenDaysAgo)
    ))
    .execute();

    // 3. Construir el reporte con datos 100% verdaderos
    let report = `📊 *INFORME SEMANAL DE ACTIVIDAD - VECY NETWORK* 📊\n\n` +
                 `Estimados aliados de la red, les comparto el balance oficial del estado de nuestra base de datos al día de hoy. ¡Cifras 100% reales y verificadas!:\n\n` +
                 `🏠 *Total Ofertas Inmobiliarias Activas*: *${totalProperties}*\n` +
                 `🔎 *Total Requerimientos de Compra/Renta*: *${totalRequirements}*\n` +
                 `🎯 *Coincidencias (Matches) de Negocio Históricas*: *${totalMatches}*\n\n` +
                 `📈 *COINCIDENCIAS REGISTRADAS ESTA SEMANA:* (${matchesThisWeek.length} detectadas)\n`;

    const jidsToMention: string[] = [];

    if (matchesThisWeek.length > 0) {
      matchesThisWeek.forEach(m => {
        const buyer = m.buyerAdvisor?.split('@')[0] || 'Asesor';
        const seller = m.sellerAdvisor?.split('@')[0] || 'Asesor';
        const score = Math.round(Number(m.matchScore));
        
        report += `▸ @${buyer} (Comprador) ⇄ @${seller} (Vendedor) — Coincidencia del *${score}%* 🎯\n`;
        
        if (m.buyerAdvisor) jidsToMention.push(m.buyerAdvisor);
        if (m.sellerAdvisor) jidsToMention.push(m.sellerAdvisor);
      });
      report += `\n¡Felicidades a los colegas involucrados! Si ves tu número arriba, por favor revisa tu chat privado de WhatsApp donde JanIA te envió los detalles de contacto bilateral (Double Opt-In) para coordinar la cita de negocios. 🤝🚀`;
    } else {
      report += `▸ No se detectaron cruces automáticos en los últimos 7 días. ¡Los invito a seguir publicando activamente sus inmuebles y requerimientos para que el sistema pueda unirlos! 💪`;
    }

    report += `\n\n⚠️ *COMPROMISO DE HONOR:* Recuerden que nuestra plataforma es *100% gratuita y libre de comisiones*. Si logran cerrar un negocio real gracias a la conexión privada de JanIA, es un compromiso de honor compartir su testimonio en este grupo y dejar su reseña oficial aquí: https://g.page/r/CctNbwU6UpX5EBM/review`;

    // 4. Enviar reporte al grupo principal VECY INMUEBLES NETWORK
    console.log('[CRON-SERVICE] Enviando reporte semanal de actividad...');
    await whatsappBot.sendToGroup(report, undefined, Array.from(new Set(jidsToMention)));

  } catch (error) {
    console.error('[CRON-SERVICE] Error al generar el informe semanal:', error);
  }
}
