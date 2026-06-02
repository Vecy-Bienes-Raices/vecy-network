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
- Explica de forma sincera y verídica lo que funciona hoy: los asesores publican sus ofertas/demandas (por texto o audio). Aclara explícitamente que JanIA SÍ puede leer y extraer datos de enlaces públicos de portales inmobiliarios (como Wasi, FincaRaíz, Metrocuadrado, Habi, etc. y de tus propias páginas web inmobiliarias con dominios propios), pero que NO puede leer enlaces directos de redes sociales (como Instagram o Facebook) debido a sus muros de seguridad y bloqueos de contraseña (para los cuales deben preferir enviar capturas de pantalla de la publicación o el flyer para que JanIA lo lea mediante OCR).
- Menciona también la transcripción de voz, el matching en tiempo real en los 32 departamentos de Colombia, y la confirmación bilateral privada (Double Opt-In) por DM (chat privado) respondiendo SÍ #M[código] o NO #M[código] para compartir contactos de forma segura.
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
        if (process.env.NODE_ENV === 'development') {
          console.log('[CRON-SERVICE] [DEV MODE] Omitiendo envío de mensaje de la mañana para Inmuebles. Contenido:\n', content);
        } else {
          await whatsappBot.sendToGroup(content, undefined, []);
        }
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
          if (process.env.NODE_ENV === 'development') {
            console.log('[CRON-SERVICE] [DEV MODE] Omitiendo envío de mensaje de la mañana para Consultoría. Contenido:\n', content);
          } else {
            await client.sendMessage(buzonJid, content);
          }
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
          if (process.env.NODE_ENV === 'development') {
            console.log('[CRON-SERVICE] [DEV MODE] Omitiendo envío de mensaje de la mañana para Círculo Cero. Contenido:\n', content);
          } else {
            await client.sendMessage(circuloJid, content);
          }
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
        if (process.env.NODE_ENV === 'development') {
          console.log('[CRON-SERVICE] [DEV MODE] Omitiendo envío de mensaje de la tarde para Inmuebles. Contenido:\n', content);
        } else {
          await whatsappBot.sendToGroup(content, undefined, []);
        }
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
          if (process.env.NODE_ENV === 'development') {
            console.log('[CRON-SERVICE] [DEV MODE] Omitiendo envío de mensaje de la tarde para Consultoría. Contenido:\n', content);
          } else {
            await client.sendMessage(buzonJid, content);
          }
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
          if (process.env.NODE_ENV === 'development') {
            console.log('[CRON-SERVICE] [DEV MODE] Omitiendo envío de mensaje de la tarde para Círculo Cero. Contenido:\n', content);
          } else {
            await client.sendMessage(circuloJid, content);
          }
        }
      }
    } catch (e: any) {
      console.error('❌ Error al generar mensaje de la tarde para Círculo Cero:', e.message);
    }
  });

  // 3. 04:30 PM = Audios Motivadores e Interactivos Dinámicos (Mensajes de Voz para incentivar participación)
  cron.schedule('30 16 * * *', async () => {
    console.log('[CRON-SERVICE] Iniciando envío de Audios Motivadores a los grupos...');
    
    // Lista de temáticas solicitadas por el usuario para alternar/incluir en los audios motivadores
    const tematicas = [
      "Incentivar a los asesores a interactuar con JanIA sin miedo, ya sea por texto o enviando notas de voz en el grupo, preguntándole sobre inmuebles, requerimientos, leyes o funcionamiento.",
      "Explicar de forma sencilla qué es VECY Network, el rol de JanIA como asistente de inteligencia artificial y cómo funciona el sistema de coincidencia (matching) en segundos.",
      "Compartir la historia de VECY Network, quiénes somos (Jani Alves y Eduardo A. Rivera) y por qué creamos esta red colaborativa nacional.",
      "Explicar los servicios que ofrecemos, cómo contactarnos y en qué redes sociales nos pueden encontrar.",
      "Recordar que actualmente todo el proyecto y las herramientas son 100% gratuitos por estar en fase de pruebas, y hablar con entusiasmo de las grandes cosas que están por venir.",
      "Preguntar a los colegas cómo ven el proyecto, qué les agrada más, qué les molesta, qué cambiarían o qué ideas/mejoras aportarían para que JanIA y el portal estén mejor a su servicio.",
      "Hablar sobre el lanzamiento al aire de la web oficial de VECY, aclarando honestamente que saldrá apenas veamos que la comunidad realmente necesita y valora la herramienta en su día a día."
    ];

    const grupos = [
      { id: whatsappBot.targetGroupId, nombre: "VECY INMUEBLES NETWORK", promptExtra: "Enfócate en la publicación activa de ofertas y demandas de inmuebles, el cruce comercial rápido, y la colaboración nacional sin pagar comisiones." },
      { id: whatsappBot.buzonGroupId, nombre: "BUZÓN DE CONSULTORÍA INMOBILIARIA 24/7", promptExtra: "Enfócate en invitar a que consulten sobre temas jurídicos, disputas de comisiones de puntas compartidas, contratos de corretaje o avalúos." },
      { id: whatsappBot.circuloGroupId, nombre: "CÍRCULO CERO", promptExtra: "Enfócate en la retroalimentación del sistema, sugerencias directas a los fundadores, ideas de mejora y el futuro del sector inmobiliario." }
    ];

    for (const grupo of grupos) {
      if (!grupo.id) continue;
      
      try {
        // Seleccionar una temática aleatoria para dar variedad diaria a cada grupo
        const tematicaSeleccionada = tematicas[Math.floor(Math.random() * tematicas.length)];
        
        const promptVoz = `Genera un mensaje corto, cercano y motivador en español para ser enviado como nota de voz al grupo de WhatsApp "${grupo.nombre}".
Dirección obligatoria:
- La temática del audio de hoy debe ser: "${tematicaSeleccionada}"
- ${grupo.promptExtra}
- IMPORTANTE: Debe sonar como un mensaje de voz natural de WhatsApp grabado de forma espontánea por una colega real. Evita introducciones corporativas como "Estimados miembros" o frases robóticas. Empieza de forma muy natural como: "Hola colegas, ¿cómo van?", "Buenas tardes a todos por aquí", "Hola a todos, paso por aquí un momento...".
- Mantén el texto relativamente corto y conciso (máximo 400 caracteres) para que la nota de voz generada dure aproximadamente de 30 a 40 segundos, lo cual es ideal para mantener la atención y optimizar recursos de voz. No uses viñetas ni formateo markdown complejo ya que se leerá como audio.`;

        const response = await invokeLLM({
          messages: [
            { role: 'system', content: 'Eres JanIA, la asistente de voz e inteligencia artificial de la red colaborativa VECY Network. Te expresas de manera natural, humana, cálida y profesional.' },
            { role: 'user', content: promptVoz }
          ]
        });

        const content = response.choices[0]?.message?.content;
        if (content && content.trim() !== "") {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[CRON-SERVICE] [DEV MODE] Omitiendo envío de audio motivador para ${grupo.nombre}. Transcripción:\n`, content);
          } else {
            await whatsappBot.sendVoiceToGroup(content, grupo.id);
          }
        }
        
        // Esperar un pequeño retraso entre grupos para no saturar la API de TTS ni enviar todo a la vez
        await new Promise(resolve => setTimeout(resolve, 8000));
        
      } catch (err: any) {
        console.error(`❌ Error al generar audio motivador para grupo ${grupo.nombre}:`, err.message || err);
      }
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

    if (process.env.NODE_ENV === 'development') {
      console.log('[CRON-SERVICE] [DEV MODE] Omitiendo envío de boletín de matches. Contenido:\n', bulletin);
    } else {
      await whatsappBot.sendToGroup(bulletin, undefined, Array.from(new Set(jidsToMention)));
    }
    console.log(`[CRON-SERVICE] Boletín ${periodName} enviado con éxito.`);

  } catch (error) {
    console.error(`[CRON-SERVICE] Error generando boletín ${periodName}:`, error);
  }
}
