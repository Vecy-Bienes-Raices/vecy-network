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
  console.log('[CRON-SERVICE] Inicializando orquestador de agendas automatizadas (Modo Optimizado segmentado por grupo)...');

  // 1. 09:30 AM = Mensajes Dinámicos Informativos de la Mañana por Grupo
  cron.schedule('30 9 * * *', async () => {
    console.log('[CRON-SERVICE] Generando y enviando Mensajes Segmentados de la Mañana...');
    
    // --- GRUPO 1: VECY INMUEBLES NETWORK ---
    try {
      const promptInmuebles = `Genera un mensaje de buenos días corto y elocuente en español para el grupo de WhatsApp "VECY INMUEBLES NETWORK".
Dirección obligatoria:
- Recuerda que este grupo es EXCLUSIVAMENTE para publicar INMUEBLES y REQUERIMIENTOS para la gestión de MATCH comerciales.
- Explica de forma sincera y verídica lo que funciona hoy: los asesores publican sus ofertas/demandas (por texto o audio), JanIA realiza transcripción de voz, OCR de flyers/imágenes (recomendar capturas de pantalla de publicaciones de redes sociales, ya que la IA no puede leer enlaces directos de redes debido a bloqueos y filtros), matching en tiempo real en los 32 departamentos de Colombia, y confirmación bilateral privada (Double Opt-In) por DM (chat privado) respondiendo SÍ #M[código] o NO #M[código] para compartir contactos de forma segura.
- Aclara con total honestidad que características como el CRM para centralizar leads y el OCR para contratos formales están planeados para el futuro cuando el portal web oficial (https://vecy-network.vercel.app/) se lance públicamente. Por ahora nos enfocamos en que publiquen y generen matches por WhatsApp.
- Recuerda las reglas del grupo de forma cordial: bloques de 1 a 3 publicaciones seguidas, esperar 5 minutos de cooldown, y no contenido off-topic (política, religión, spam, etc.) bajo advertencias y strike automático (3 strikes = expulsión).
- Usa emojis de forma ordenada. Cita el link de Google Reviews (https://g.page/r/CctNbwU6UpX5EBM/review) motivando al compromiso de honor si cierran un match.`;

      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'Eres JanIA, la mente de inteligencia artificial de la red inmobiliaria colaborativa VECY Network en Colombia.' },
          { role: 'user', content: promptInmuebles }
        ]
      });
      const content = response.choices[0]?.message?.content;
      if (content && content.trim() !== "") {
        await whatsappBot.sendToGroup(content, undefined, []);
      }
    } catch (e: any) {
      console.error('❌ Error al generar mensaje matutino para Inmuebles:', e.message);
    }

    // --- GRUPO 2: BUZÓN DE CONSULTORÍA INMOBILIARIA 24/7 ---
    try {
      const promptConsultoria = `Genera un mensaje de buenos días corto y profesional en español para el grupo "BUZÓN DE CONSULTORÍA INMOBILIARIA 24/7".
Dirección obligatoria:
- Explica que este espacio es EXCLUSIVAMENTE para consultas respecto a casos diarios, dudas o conflictos jurídicos/comerciales que les surjan a los inmobiliarios en Colombia.
- Indica que JanIA está preparada para responder con rigor legal y profesionalismo técnico exacto sobre: conflictos de restitución de inmuebles (Ley 820/2003), cesión de leasing, contratos/promesas en permuta, sucesiones por herencia o divorcio, levantamiento de embargos, cobro de comisiones pendientes e incumplimientos de corretaje (y disputas/robos de comisiones entre colegas: cómo actuar, cómo demandar, cómo recolectar pruebas como las hojas de presentación de cliente y contratos de puntas compartidas, alegatos, verbal/monitorio), cláusulas clave en promesas de compraventa y por qué usar términos "promitente vendedor/comprador", por qué es más seguro usar correo electrónico que WhatsApp (WhatsApp se puede borrar, requiere análisis forense digital en juicios, mientras que el correo electrónico tiene traza de IP y cifrado inalterable que los jueces prefieren).
- Invita a los aliados a preguntar sin miedo en este grupo por texto o nota de voz. Recuerda que no se permiten listings comerciales o spam aquí (3 strikes = expulsión). Usa emojis.`;

      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'Eres JanIA, la mente de inteligencia artificial de la red inmobiliaria colaborativa VECY Network en Colombia.' },
          { role: 'user', content: promptConsultoria }
        ]
      });
      const content = response.choices[0]?.message?.content;
      if (content && content.trim() !== "") {
        const buzonJid = whatsappBot.buzonGroupId;
        const client = (whatsappBot as any).client;
        if (client && buzonJid) {
          await client.sendMessage(buzonJid, content);
        }
      }
    } catch (e: any) {
      console.error('❌ Error al generar mensaje matutino para Consultoría:', e.message);
    }

    // --- GRUPO 3: CÍRCULO CERO 👌 ---
    try {
      const promptCirculo = `Genera un mensaje de buenos días corto y estratégico en español para el grupo "CÍRCULO CERO".
Dirección obligatoria:
- Recuerda que este grupo es EXCLUSIVAMENTE para conversar sobre VECY NETWORK, novedades del proyecto, resolver inquietudes sobre el funcionamiento de la IA, sugerencias, testimonios, o debatir sanamente con competidores.
- Explica de forma sincera lo que ya funciona hoy en WhatsApp (transcripción de audio, OCR de capturas/flyers, matching en tiempo real, confirmación de match bilateral por privado) y lo que está en desarrollo para el futuro (portal web https://vecy-network.vercel.app/, CRM para leads, digitalización de documentos formalizados).
- Explica la tecnología de forma sencilla: Asistente de IA basado en código propietario y base de datos SQL en la nube, entrenado a diario. NUNCA menciones Supabase, Antigravity ni Google Cloud.
- Anima a los aliados a colaborar publicando activamente en el grupo de Inmuebles, invitar a más personas a la red, y sugerir a administradores de otros grupos que incluyan a JanIA y la nombren administradora para que ella pueda indexar las publicaciones de sus miembros y cruzarlas con VECY INMUEBLES NETWORK para lograr resultados más rápidos.
- Usa emojis de forma ordenada.`;

      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'Eres JanIA, la mente de inteligencia artificial de la red inmobiliaria colaborativa VECY Network en Colombia.' },
          { role: 'user', content: promptCirculo }
        ]
      });
      const content = response.choices[0]?.message?.content;
      if (content && content.trim() !== "") {
        const circuloJid = whatsappBot.circuloGroupId;
        const client = (whatsappBot as any).client;
        if (client && circuloJid) {
          await client.sendMessage(circuloJid, content);
        }
      }
    } catch (e: any) {
      console.error('❌ Error al generar mensaje matutino para Círculo Cero:', e.message);
    }
  });

  // 2. 06:00 PM = Mensaje Dinámico de Motivación de la Tarde por Grupo
  cron.schedule('0 18 * * *', async () => {
    console.log('[CRON-SERVICE] Generando y enviando Mensajes Segmentados de la Tarde...');
    
    // --- GRUPO 1: VECY INMUEBLES NETWORK ---
    try {
      const promptInmuebles = `Genera un post corto de motivación y tips comerciales para cerrar el día en VECY Network en el grupo "VECY INMUEBLES NETWORK".
- Enfocado en el cierre de negocios, active publishing, matching y Double Opt-In.
- Recuerda que no cobramos comisiones.
- Usa emojis. Invita a calificar a JanIA con 5 estrellas si han tenido éxito con un match, como compromiso de honor: https://g.page/r/CctNbwU6UpX5EBM/review`;

      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'Eres JanIA, la mente de inteligencia artificial de la red inmobiliaria colaborativa VECY Network en Colombia.' },
          { role: 'user', content: promptInmuebles }
        ]
      });
      const content = response.choices[0]?.message?.content;
      if (content && content.trim() !== "") {
        await whatsappBot.sendToGroup(content, undefined, []);
      }
    } catch (e: any) {
      console.error('❌ Error al generar mensaje de la tarde para Inmuebles:', e.message);
    }

    // --- GRUPO 2: BUZÓN DE CONSULTORÍA INMOBILIARIA 24/7 ---
    try {
      const promptConsultoria = `Genera un post corto para cerrar el día en el grupo "BUZÓN DE CONSULTORÍA INMOBILIARIA 24/7".
- Destaca la importancia del estudio continuo de casos, la seguridad jurídica (como preferir el correo electrónico sobre WhatsApp para documentar acuerdos por su inalterabilidad y validez judicial) y elevar el nivel profesional en el sector.
- Usa emojis de forma atractiva.`;

      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'Eres JanIA, la mente de inteligencia artificial de la red inmobiliaria colaborativa VECY Network en Colombia.' },
          { role: 'user', content: promptConsultoria }
        ]
      });
      const content = response.choices[0]?.message?.content;
      if (content && content.trim() !== "") {
        const buzonJid = whatsappBot.buzonGroupId;
        const client = (whatsappBot as any).client;
        if (client && buzonJid) {
          await client.sendMessage(buzonJid, content);
        }
      }
    } catch (e: any) {
      console.error('❌ Error al generar mensaje de la tarde para Consultoría:', e.message);
    }

    // --- GRUPO 3: CÍRCULO CERO 👌 ---
    try {
      const promptCirculo = `Genera un post corto de cierre de jornada para el grupo "CÍRCULO CERO".
- Enfocado en construir el futuro de la intermediación inmobiliaria en Colombia de forma colaborativa (Evolución Inevitable) y el crecimiento de la red.
- Usa emojis de forma atractiva.`;

      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'Eres JanIA, la mente de inteligencia artificial de la red inmobiliaria colaborativa VECY Network en Colombia.' },
          { role: 'user', content: promptCirculo }
        ]
      });
      const content = response.choices[0]?.message?.content;
      if (content && content.trim() !== "") {
        const circuloJid = whatsappBot.circuloGroupId;
        const client = (whatsappBot as any).client;
        if (client && circuloJid) {
          await client.sendMessage(circuloJid, content);
        }
      }
    } catch (e: any) {
      console.error('❌ Error al generar mensaje de la tarde para Círculo Cero:', e.message);
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
