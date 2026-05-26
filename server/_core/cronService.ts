import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db';
import { propertyMatches, requirements, properties } from '../../drizzle/schema';
import { gte, and, eq, sql } from 'drizzle-orm';
import { whatsappBot } from './whatsapp';
import { publishToFacebookGroup } from './facebookService';
import { 
  MSG_PRESENTACION_INSTITUCIONAL, 
  MSG_PAUTAS_FORMATOS,
  MSG_TIPS_CALIDAD_COBERTURA,
  MSG_RESUMEN_RETORNO_PRESENTACION,
  MSG_CIERRE_OPERACIONES
} from './janIA';

/**
 * Servicio Cron de JanIA v2.0
 * Automatización de ráfagas educativas, reportes de matching y embudos multicanal.
 */

export function initCronScheduler() {
  console.log('[CRON-SERVICE] Inicializando orquestador de agendas automatizadas...');

  // 1. 08:00 AM = Presentación Institucional
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON-SERVICE] Enviando Presentación Institucional...');
    await whatsappBot.sendToGroup(MSG_PRESENTACION_INSTITUCIONAL);
  });

  // 2. 09:30 AM = Estatuto y Frecuencia
  cron.schedule('30 9 * * *', async () => {
    console.log('[CRON-SERVICE] Enviando Estatuto y Frecuencias...');
    await whatsappBot.sendToGroup(MSG_PAUTAS_FORMATOS);
  });

  // 3. 10:30 AM = Anuncio de Retorno (Y bienvenida a los nuevos)
  cron.schedule('30 10 * * *', async () => {
    console.log('[CRON-SERVICE] Enviando Anuncio de Retorno...');
    try {
      await whatsappBot.sendAnuncioRetorno();
    } catch (e: any) {
      console.error('❌ Error al enviar el anuncio de retorno:', e.message);
    }
  });

  // 4. 11:00 AM = Tips de Calidad (Nivel Nacional)
  cron.schedule('0 11 * * *', async () => {
    console.log('[CRON-SERVICE] Enviando Tips de Calidad Nacional...');
    await whatsappBot.sendToGroup(MSG_TIPS_CALIDAD_COBERTURA);
  });

  // 5. 12:30 PM = Saludo del Medio Día (Facebook replication commented out)
  cron.schedule('30 12 * * *', async () => {
    console.log('[CRON-SERVICE] Enviando Saludo del Medio Día...');
    const motivation = 
      `✨ *¡FELIZ MEDIODÍA, COMUNIDAD VECY!* ✨\n\n` +
      `Iniciamos una nueva jornada de oportunidades. El mercado inmobiliario no se detiene y JanIA v2.0 tampoco.\n\n` +
      `🚀 *Recordatorio de Superpoderes:* \n` +
      `▸ Leo tus links de CRM automáticamente.\n` +
      `▸ Escaneo tus flyers y fotos con OCR.\n` +
      `▸ Proceso tus notas de voz en segundos.\n\n` +
      `¡Hagamos que hoy sea un día de cierres masivos! 🏆`;
      
    const videoPath = './client/public/vecy_inmuebles_network.mp4';
    await whatsappBot.sendToGroup(motivation, videoPath);

    // DESACTIVADO POR AHORA: Replicación en Facebook Groups con Embudo
    // try {
    //   const fbInvitation = 
    //     "\n\n━━━━━━━━━━━━━━━━━━━━━━\n" +
    //     "💼 ¿Eres bróker, asesor o inversionista en Bogotá y Colombia?\n" +
    //     "🚀 ¡Únete a nuestra Bolsa Colaborativa de Alta Velocidad en WhatsApp y accede a matches e inventario exclusivo en tiempo real!\n" +
    //     "👉 Entra aquí: https://chat.whatsapp.com/K36KrHeB9nMEKJ56s8XFcM";
    //   
    //   const fbContent = motivation.replace(/\*/g, '') + fbInvitation;
    //   
    //   if (fs.existsSync(path.resolve(videoPath))) {
    //     const videoBuffer = fs.readFileSync(path.resolve(videoPath));
    //     publishToFacebookGroup(fbContent, videoBuffer)
    //       .then(success => {
    //         if (success) console.log("✅ [Cron-FB-Sync] Publicación de mediodía replicada con éxito.");
    //       })
    //       .catch(err => console.error("❌ [Cron-FB-Sync-Error]:", err.message));
    //   }
    // } catch (e: any) {
    //   console.error("[Cron-FB-Sync-Critical]:", e.message);
    // }
  });

  // 6. 02:00 PM = Boletín Meridiano
  cron.schedule('0 14 * * *', async () => {
    console.log('[CRON-SERVICE] Enviando Boletín de Matches Meridiano...');
    await sendMatchBulletin('MERIDIANO');
  });

  // 7. 03:30 PM = Anuncio de Retorno y Presentación Institucional (Resumen Unificado)
  cron.schedule('30 15 * * *', async () => {
    console.log('[CRON-SERVICE] Enviando Resumen Unificado de Retorno y Presentación...');
    await whatsappBot.sendToGroup(MSG_RESUMEN_RETORNO_PRESENTACION);
  });

  // 8. 05:00 PM = Estatuto y Frecuencia
  cron.schedule('0 17 * * *', async () => {
    console.log('[CRON-SERVICE] Enviando Estatuto y Frecuencias (Tarde)...');
    await whatsappBot.sendToGroup(MSG_PAUTAS_FORMATOS);
  });

  // 9. 06:30 PM = Tips de Calidad
  cron.schedule('30 18 * * *', async () => {
    console.log('[CRON-SERVICE] Enviando Tips de Calidad Nacional (Tarde)...');
    await whatsappBot.sendToGroup(MSG_TIPS_CALIDAD_COBERTURA);
  });

  // 10. 08:00 PM = Boletín Nocturno (Matches del día y recuento semanal/mensual)
  cron.schedule('0 20 * * *', async () => {
    console.log('[CRON-SERVICE] Enviando Boletín de Matches Nocturno y Estadísticas...');
    await sendMatchBulletin('NOCTURNO DE CIERRE');
  });

  // 11. 09:30 PM = Cierre del día
  cron.schedule('30 21 * * *', async () => {
    console.log('[CRON-SERVICE] Enviando Cierre de Operaciones...');
    await whatsappBot.sendToGroup(MSG_CIERRE_OPERACIONES);
  });
}

/**
 * Consulta la base de datos y genera el boletín de matches calificados (Score >= 70)
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
      gte(sql<number>`(${propertyMatches.matchScore})::numeric`, 70),
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

    await whatsappBot.sendToGroup(bulletin, undefined, Array.from(new Set(jidsToMention)));
    console.log(`[CRON-SERVICE] Boletín ${periodName} enviado con éxito.`);

  } catch (error) {
    console.error(`[CRON-SERVICE] Error generando boletín ${periodName}:`, error);
  }
}
