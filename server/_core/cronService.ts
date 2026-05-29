import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db';
import { propertyMatches, requirements, properties } from '../../drizzle/schema';
import { gte, and, eq, sql } from 'drizzle-orm';
import { whatsappBot } from './whatsapp';
import { publishToFacebookGroup } from './facebookService';
import { invokeLLM } from './llm';
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
  console.log('[CRON-SERVICE] Inicializando orquestador de agendas automatizadas (Modo Optimizado dos veces al día)...');

  // 1. 09:30 AM = Mensaje Dinámico Informativo de la Mañana
  cron.schedule('30 9 * * *', async () => {
    console.log('[CRON-SERVICE] Generando y enviando Mensaje Dinámico de la Mañana...');
    try {
      const prompt = `[MENSAJE INFORMATIVO/EDUCATIVO DE LA MAÑANA] Genera un post corto y elocuente sobre cómo usar a JanIA v2.0 (CRM, OCR, audio), geocodificación de ubicación exacta, reglas de strikes del grupo, o consejos comerciales. Sé creativo y variado. Usa emojis de forma ordenada. Incluye el link de Google Reviews (https://g.page/r/CctNbwU6UpX5EBM/review) motivando al compromiso de honor si cierran un match.`;
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'Eres JanIA, la mente de inteligencia artificial de la red inmobiliaria colaborativa VECY Network en Colombia.' },
          { role: 'user', content: prompt }
        ]
      });
      const content = response.choices[0]?.message?.content;
      if (content && content.trim() !== "") {
        await whatsappBot.broadcastToAllGroups(content);
      }
    } catch (e: any) {
      console.error('❌ Error al generar mensaje dinámico de la mañana:', e.message);
    }
  });

  // 2. 06:00 PM = Mensaje Dinámico de Motivación de la Tarde
  cron.schedule('0 18 * * *', async () => {
    console.log('[CRON-SERVICE] Generando y enviando Mensaje Dinámico de la Tarde...');
    try {
      const prompt = `[MENSAJE MOTIVACIONAL DE LA TARDE] Genera un post corto de motivación y tips comerciales para cerrar el día en VECY Network. Recuerda que no cobramos comisiones. Usa emojis de forma atractiva. Invita a calificar a JanIA con 5 estrellas si han tenido éxito con un match, como parte de nuestro compromiso de honor: https://g.page/r/CctNbwU6UpX5EBM/review`;
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'Eres JanIA, la mente de inteligencia artificial de la red inmobiliaria colaborativa VECY Network en Colombia.' },
          { role: 'user', content: prompt }
        ]
      });
      const content = response.choices[0]?.message?.content;
      if (content && content.trim() !== "") {
        await whatsappBot.broadcastToAllGroups(content);
      }
    } catch (e: any) {
      console.error('❌ Error al generar mensaje dinámico de la tarde:', e.message);
    }
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
