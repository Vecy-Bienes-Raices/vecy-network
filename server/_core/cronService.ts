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
  MSG_PAUTAS_FORMATOS 
} from './janIA';

/**
 * Servicio Cron de JanIA v2.0
 * Automatización de ráfagas educativas, reportes de matching y embudos multicanal.
 */

export function initCronScheduler() {
  console.log('[CRON-SERVICE] Inicializando orquestador de agendas automatizadas...');

  // --- 1. BROADCASTS EDUCATIVOS E INSTITUCIONALES ---

  // 12:30 PM: Saludo multimedia y replicación en Facebook con embudo (v11.45)
  cron.schedule('30 12 * * *', async () => {
    const motivation = 
      `✨ *¡FELIZ MEDIODÍA, COMUNIDAD VECY!* ✨\n\n` +
      `Iniciamos una nueva jornada de oportunidades. El mercado inmobiliario no se detiene y JanIA v2.0 tampoco.\n\n` +
      `🚀 *Recordatorio de Superpoderes:* \n` +
      `▸ Leo tus links de CRM automáticamente.\n` +
      `▸ Escaneo tus flyers y fotos con OCR.\n` +
      `▸ Proceso tus notas de voz en segundos.\n\n` +
      `¡Hagamos que hoy sea un día de cierres masivos! 🏆`;
      
    const videoPath = './client/public/vecy_inmuebles_network.mp4';

    // 1. Envío a WhatsApp (Copy original)
    await whatsappBot.sendToGroup(motivation, videoPath);

    // 2. Envío a Facebook Groups con Embudo (Copy + Invitación + Video)
    try {
      const fbInvitation = 
        "\n\n━━━━━━━━━━━━━━━━━━━━━━\n" +
        "💼 ¿Eres bróker, asesor o inversionista en Bogotá y Colombia?\n" +
        "🚀 ¡Únete a nuestra Bolsa Colaborativa de Alta Velocidad en WhatsApp y accede a matches e inventario exclusivo en tiempo real!\n" +
        "👉 Entra aquí: https://chat.whatsapp.com/K36KrHeB9nMEKJ56s8XFcM";
      
      const fbContent = motivation.replace(/\*/g, '') + fbInvitation;
      
      if (fs.existsSync(path.resolve(videoPath))) {
        const videoBuffer = fs.readFileSync(path.resolve(videoPath));
        
        // v11.45: Pasamos el buffer directo sin conversión base64
        publishToFacebookGroup(fbContent, videoBuffer)
          .then(success => {
            if (success) console.log("✅ [Cron-FB-Sync] Publicación de mediodía replicada con éxito.");
          })
          .catch(err => console.error("❌ [Cron-FB-Sync-Error]:", err.message));
      }
    } catch (e: any) {
      console.error("[Cron-FB-Sync-Critical]:", e.message);
    }
  });

  // 07:00 AM: Presentación Institucional
  cron.schedule('0 7 * * *', async () => {
    await whatsappBot.sendToGroup(MSG_PRESENTACION_INSTITUCIONAL);
  });

  // 08:00 AM: Estatuto de Publicación y Frecuencias
  cron.schedule('0 8 * * *', async () => {
    await whatsappBot.sendToGroup(MSG_PAUTAS_FORMATOS);
  });

  // Cada 2 Horas (10 AM a 6 PM): Calidad Geográfica
  cron.schedule('0 10-18/2 * * *', async () => {
    const reminders = [
      `📌 *TIP DE CALIDAD:* Para que encuentre tu match ideal, recuerda enviar siempre la zona exacta: *"Bogotá → Usaquén → Cedritos"*. ¡La precisión es dinero! 🎯`,
      `🌍 *COBERTURA NACIONAL:* JanIA procesa activos en todo Colombia. No olvides especificar el municipio si estás fuera de Bogotá. 🇨🇴`,
      `🧐 *EVITA FALSOS POSITIVOS:* Entre más específica sea tu ubicación, más inteligente es mi cruce de datos. ¡Sé el bróker más juicioso del grupo! ✨`
    ];
    const randomReminder = reminders[Math.floor(Math.random() * reminders.length)];
    await whatsappBot.sendToGroup(randomReminder);
  });

  // 09:00 PM: Cierre de operaciones y empoderamiento
  cron.schedule('0 21 * * *', async () => {
    const closure = 
      `🌙 *CIERRE DE OPERACIONES VECY NETWORK* 🌙\n\n` +
      `Gracias a todos por el rigor profesional y la calidad de sus publicaciones hoy. Mi cerebro sigue procesando datos en silencio para que mañana despierten con nuevas oportunidades.\n\n` +
      `💪 *Mensaje del día:* La persistencia es el único camino al éxito en el Real Estate. Si hoy no hubo match, mañana estaremos más cerca. ¡Descansen, colegas! 🚀✨\n\n` +
      `*— JanIA, Siempre Atenta.*`;
    await whatsappBot.sendToGroup(closure);
  });


  // --- 2. REPORTES CONSOLIDADOS DE MATCHES REALES ---

  // 01:00 PM: Reporte Meridiano
  cron.schedule('0 13 * * *', async () => {
    await sendMatchBulletin('MERIDIANO');
  });

  // 07:00 PM: Reporte Nocturno
  cron.schedule('0 19 * * *', async () => {
    await sendMatchBulletin('NOCTURNO DE CIERRE');
  });
}

/**
 * Consulta la base de datos y genera el boletín de matches calificados (Score >= 70)
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

    if (matches.length === 0) {
      console.log(`[CRON-SERVICE] Sin matches calificados para el boletín ${periodName}.`);
      return;
    }

    const jidsToMention: string[] = [];
    let bulletin = `🎯 ¡BOLETÍN DE MATCHES ${periodName} VECY! 🎯\n` +
                   `Rompemos las promesas con resultados reales. He conectado los siguientes negocios en la jornada de hoy:\n\n`;

    matches.forEach(m => {
      const buyer = m.buyerAdvisor?.split('@')[0] || 'Asesor';
      const seller = m.sellerAdvisor?.split('@')[0] || 'Asesor';
      const score = Math.round(Number(m.matchScore));
      
      bulletin += `• 🔎 REQUERIMIENTO de: @${buyer} ⇄ 🏠 INMUEBLE de: @${seller} (Coincidencia: ${score}%)\n`;
      
      // Implementación de menciones reales (v11.45)
      if (m.buyerAdvisor) jidsToMention.push(m.buyerAdvisor);
      if (m.sellerAdvisor) jidsToMention.push(m.sellerAdvisor);
    });

    bulletin += `\n¡Colegas, los invito a abrir sus chats privados y ponerse en contacto de inmediato para cerrar la operación! 🚀`;

    // Pasamos el arreglo de JIDs para activar las menciones en WhatsApp
    await whatsappBot.sendToGroup(bulletin, undefined, [...new Set(jidsToMention)]);
    console.log(`[CRON-SERVICE] Boletín ${periodName} enviado con ${matches.length} matches.`);

  } catch (error) {
    console.error(`[CRON-SERVICE] Error generando boletín ${periodName}:`, error);
  }
}
