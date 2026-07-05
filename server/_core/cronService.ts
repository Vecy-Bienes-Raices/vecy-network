import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
import { runNightlyRematch } from '../jobs/nightlyRematch';

function cleanPromptLeak(text: string | undefined | null): string {
  if (!text) return "";
  let cleaned = text.trim();
  
  const preambles = [
    /^(¡Hola!|Hola).*Aquí tienes (una propuesta|un post|un mensaje|una opción|el contenido).*:/i,
    /^Aquí tienes (una propuesta|un post|un mensaje|una opción|el contenido).*:/i,
    /^(Claro|Por supuesto),? aquí tienes.*:/i,
    /^Claro,? aquí está.*:/i,
    /^Entendido,? aquí tienes.*:/i,
    /^(¡Hola!|Hola).*aquí te presento.*:/i,
    /^Este es el post.*:/i,
    /^Mensaje propuesto.*:/i,
    /^Propuesta de mensaje.*:/i,
    /^Propuesta de post.*:/i,
    /^Cierre de jornada propuesto.*:/i,
    /^Aquí tienes una propuesta de cierre de jornada.*:/i,
    /^Aquí tienes una propuesta.*:/i,
    /^Aquí tienes un mensaje.*:/i
  ];

  for (const regex of preambles) {
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, "");
      break;
    }
  }

  cleaned = cleaned.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  } else if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.slice(1, -1);
  }

  return cleaned.trim();
}

/**
 * Servicio Cron de JanIA v2.5
 * Automatización de ráfagas educativas, reportes de matching y embudos multicanal.
 */

export function initCronScheduler() {
  console.log('[CRON-SERVICE] Inicializando orquestador de agendas automatizadas (Modo Optimizado segmentado por grupo)...');

  // 1. 09:30 AM = Mensajes Dinámicos Informativos de la Mañana por Grupo (Martes y Jueves en Zona Horaria Colombia)
  cron.schedule('30 9 * * 2,4', async () => {
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
      const content = cleanPromptLeak(response.choices[0]?.message?.content);
      if (content && content.trim() !== "") {
        console.log('[CRON-SERVICE] Enviando mensaje matutino a VECY INMUEBLES NETWORK...');
        await whatsappBot.sendToGroup(content, undefined, []);
      }
    } catch (e: any) {
      console.error('❌ Error al generar mensaje matutino para Inmuebles:', e.message);
    }

    // --- GRUPO 2: VECY: SOPORTE LEGAL, TRIBUTARIO Y AVALÚOS ---
    try {
      const promptConsultoria = `Genera un mensaje de buenos días corto y profesional en español para el grupo "VECY: SOPORTE LEGAL, TRIBUTARIO Y AVALÚOS".
Dirección obligatoria:
- Explica que este espacio es EXCLUSIVAMENTE para consultas respecto a casos diarios, dudas o conflictos jurídicos, contables, tributarios o de avalúos que les surjan a los inmobiliarios en Colombia.
- Indica que JanIA está preparada para responder con rigor legal y profesionalismo técnico exacto sobre: conflictos de restitución de inmuebles (Ley 820/2003), cesión de leasing, contratos/promesas en permuta, sucesiones por herencia o divorcio, levantamiento de embargos, cobro de comisiones pendientes e incumplimientos de corretaje (y disputas/robos de comisiones entre colegas: cómo actuar, cómo demandar, cómo recolectar pruebas como las hojas de presentación de cliente y contratos de puntas compartidas, alegatos, verbal/monitorio), cláusulas clave en promesas de compraventa y por qué usar términos "promitente vendedor/comprador", por qué es más seguro usar correo electrónico que WhatsApp (WhatsApp se puede borrar, requiere análisis forense digital en juicios, mientras que el correo electrónico tiene traza de IP y cifrado inalterable que los jueces prefieren).
- Invita a los aliados a preguntar sin miedo en este grupo por texto o nota de voz. Recuerda que no se permiten listings comerciales o spam aquí (3 strikes = expulsión). Usa emojis.`;

      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'Eres JanIA, la mente de inteligencia artificial de la red inmobiliaria colaborativa VECY Network en Colombia.' },
          { role: 'user', content: promptConsultoria }
        ]
      });
      const content = cleanPromptLeak(response.choices[0]?.message?.content);
      if (content && content.trim() !== "") {
        const buzonJid = whatsappBot.buzonGroupId;
        if (buzonJid) {
          console.log('[CRON-SERVICE] Enviando mensaje matutino a VECY: SOPORTE LEGAL, TRIBUTARIO Y AVALÚOS...');
          await whatsappBot.sendToGroup(content, undefined, [], buzonJid);
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
      const content = cleanPromptLeak(response.choices[0]?.message?.content);
      if (content && content.trim() !== "") {
        const circuloJid = whatsappBot.circuloGroupId;
        if (circuloJid) {
          console.log('[CRON-SERVICE] Enviando mensaje matutino a CÍRCULO CERO...');
          await whatsappBot.sendToGroup(content, undefined, [], circuloJid);
        }
      }
    } catch (e: any) {
      console.error('❌ Error al generar mensaje matutino para Círculo Cero:', e.message);
    }
  }, {
    timezone: 'America/Bogota'
  });

  // 2. 06:00 PM = Mensaje Dinámico de Motivación de la Tarde por Grupo (Lunes y Sábados en Zona Horaria Colombia)
  cron.schedule('0 18 * * 1,6', async () => {
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
      const content = cleanPromptLeak(response.choices[0]?.message?.content);
      if (content && content.trim() !== "") {
        console.log('[CRON-SERVICE] Enviando mensaje de la tarde a VECY INMUEBLES NETWORK...');
        await whatsappBot.sendToGroup(content, undefined, []);
      }
    } catch (e: any) {
      console.error('❌ Error al generar mensaje de la tarde para Inmuebles:', e.message);
    }

    // --- GRUPO 2: VECY: SOPORTE LEGAL, TRIBUTARIO Y AVALÚOS ---
    try {
      const promptConsultoria = `Genera un post corto para cerrar el día en el grupo "VECY: SOPORTE LEGAL, TRIBUTARIO Y AVALÚOS".
- Destaca la importancia del estudio continuo de casos, la seguridad jurídica, la tributación y el cálculo de la ganancia ocasional, retenciones en la fuente y elevar el nivel profesional en el sector.
- Usa emojis de forma atractiva.`;

      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'Eres JanIA, la mente de inteligencia artificial de la red inmobiliaria colaborativa VECY Network en Colombia.' },
          { role: 'user', content: promptConsultoria }
        ]
      });
      const content = cleanPromptLeak(response.choices[0]?.message?.content);
      if (content && content.trim() !== "") {
        const buzonJid = whatsappBot.buzonGroupId;
        if (buzonJid) {
          console.log('[CRON-SERVICE] Enviando mensaje de la tarde a VECY: SOPORTE LEGAL, TRIBUTARIO Y AVALÚOS...');
          await whatsappBot.sendToGroup(content, undefined, [], buzonJid);
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
      const content = cleanPromptLeak(response.choices[0]?.message?.content);
      if (content && content.trim() !== "") {
        const circuloJid = whatsappBot.circuloGroupId;
        if (circuloJid) {
          console.log('[CRON-SERVICE] Enviando mensaje de la tarde a CÍRCULO CERO...');
          await whatsappBot.sendToGroup(content, undefined, [], circuloJid);
        }
      }
    } catch (e: any) {
      console.error('❌ Error al generar mensaje de la tarde para Círculo Cero:', e.message);
    }
  }, {
    timezone: 'America/Bogota'
  });

  // 3. 12:30 PM = Audios Motivadores e Interactivos Dinámicos (Mensajes de Voz - Miércoles y Viernes en Zona Horaria Colombia)
  cron.schedule('30 12 * * 3,5', async () => {
    console.log('[CRON-SERVICE] Iniciando envío de Audios Motivadores (Bi-semanal) a las 12:30 PM...');
    
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

    // Leer y rotar secuencialmente la temática para evitar repeticiones consecutivas
    let lastIndex = -1;
    const indexFilePath = path.join(__dirname, 'last_theme_index.txt');
    try {
      if (fs.existsSync(indexFilePath)) {
        const fileContent = fs.readFileSync(indexFilePath, 'utf8').trim();
        lastIndex = parseInt(fileContent, 10);
        if (isNaN(lastIndex)) lastIndex = -1;
      }
    } catch (e) {
      console.warn('[CRON-SERVICE] No se pudo leer el archivo de índice de temáticas:', e);
    }

    const nextIndex = (lastIndex + 1) % tematicas.length;

    try {
      fs.writeFileSync(indexFilePath, nextIndex.toString(), 'utf8');
    } catch (e) {
      console.warn('[CRON-SERVICE] No se pudo escribir el archivo de índice de temáticas:', e);
    }

    const tematicaSeleccionada = tematicas[nextIndex];
    console.log(`[CRON-SERVICE] Temática seleccionada para hoy (índice ${nextIndex}): "${tematicaSeleccionada}"`);

    const grupos = [
      { id: whatsappBot.targetGroupId, nombre: "VECY INMUEBLES NETWORK", promptExtra: "Enfócate en la publicación activa de ofertas y demandas de inmuebles, el cruce comercial rápido, y la colaboración nacional sin pagar comisiones." },
      { id: whatsappBot.buzonGroupId, nombre: "VECY: SOPORTE LEGAL, TRIBUTARIO Y AVALÚOS", promptExtra: "Enfócate en invitar a que consulten sobre temas jurídicos, tributarios, liquidaciones, ganancia ocasional o avalúos." },
      { id: whatsappBot.circuloGroupId, nombre: "CÍRCULO CERO", promptExtra: "Enfócate en la retroalimentación del sistema, sugerencias directas a los fundadores, ideas de mejora y el futuro del sector inmobiliario." }
    ];

    for (const grupo of grupos) {
      if (!grupo.id) continue;
      
      try {
        const promptVoz = `Genera un mensaje corto, cercano y motivador en español para ser enviado como nota de voz al grupo de WhatsApp "${grupo.nombre}".
Dirección obligatoria:
- La temática del audio de hoy debe ser: "${tematicaSeleccionada}"
- ${grupo.promptExtra}
- IMPORTANTE: Debe sonar como un mensaje de voz natural de WhatsApp grabado de forma espontánea por una colega real. Evita introducciones corporativas como "Estimados miembros" o frases robóticas. Empieza de forma muy natural como: "Hola colegas, ¿cómo van?", "Buenas tardes a todos por aquí", "Hola a todos, paso por aquí un momento...".
- Mantén el texto relativamente corto y conciso (máximo 400 caracteres) para que la nota de voz generada dure aproximadamente de 30 a 40 segundos, lo cual es ideal para mantener la atención y optimizar recursos de voz. No uses viñetas ni formateo markdown complejo ya que se leerá como audio.
- CRÍTICO: Responde ÚNICAMENTE con el guion hablado de la nota de voz. NO agregues comentarios, preámbulos, explicaciones ni envuelvas el texto en comillas, llaves ({{ }}) o corchetes. Todo tu texto se convertirá directamente a audio.`;

        const response = await invokeLLM({
          messages: [
            { role: 'system', content: 'Eres JanIA, la asistente de voz e inteligencia artificial de la red colaborativa VECY Network. Te expresas de manera natural, humana, cálida y profesional.' },
            { role: 'user', content: promptVoz }
          ]
        });

        const content = cleanPromptLeak(response.choices[0]?.message?.content);
        if (content && content.trim() !== "") {
          console.log(`[CRON-SERVICE] Enviando audio motivador a ${grupo.nombre}...`);
          await whatsappBot.sendVoiceToGroup(content, grupo.id);
        }
        
        // Esperar un pequeño retraso entre grupos para no saturar la API de TTS ni enviar todo a la vez
        await new Promise(resolve => setTimeout(resolve, 8000));
        
      } catch (err: any) {
        console.error(`❌ Error al generar audio motivador para grupo ${grupo.nombre}:`, err.message || err);
      }
    }
  }, {
    timezone: 'America/Bogota'
  });

  // 4. Lunes 08:00 AM = Audio animoso de inicio de semana
  cron.schedule('0 8 * * 1', async () => {
    console.log('[CRON-SERVICE] Generando y enviando Mensajes de Voz de Lunes por la Mañana...');
    const grupos = [
      { id: whatsappBot.targetGroupId, nombre: "VECY INMUEBLES NETWORK", promptExtra: "Enfócate en iniciar la semana con la mejor energía, invitando a publicar activamente ofertas y requerimientos para lograr cierres comerciales rápidos en la red." },
      { id: whatsappBot.buzonGroupId, nombre: "VECY: SOPORTE LEGAL, TRIBUTARIO Y AVALÚOS", promptExtra: "Enfócate en desear un feliz inicio de semana y recordar que el equipo de soporte legal, tributario y avalúos está listo para resolver cualquier consulta en sus operaciones semanales." },
      { id: whatsappBot.circuloGroupId, nombre: "CÍRCULO CERO", promptExtra: "Enfócate en motivar a los aliados a seguir expandiendo la red colaborativa de VECY Network en Colombia esta nueva semana." }
    ];

    for (const grupo of grupos) {
      if (!grupo.id) continue;
      
      try {
        const promptVoz = `Genera un mensaje de voz de buenos días, sumamente animoso, positivo y elocuente en español para ser enviado como nota de voz al grupo de WhatsApp "${grupo.nombre}" para iniciar la semana laboral (Lunes).
Dirección obligatoria:
- Debe ser un mensaje lleno de energía, motivación y entusiasmo por el inicio de semana.
- ${grupo.promptExtra}
- IMPORTANTE: Debe sonar como un mensaje de voz natural de WhatsApp grabado de forma espontánea por una colega real. Evita introducciones corporativas. Empieza de forma muy natural como: "Hola colegas, ¡excelente inicio de semana para todos!", "Muy buenos días a todos por aquí, feliz lunes...".
- Mantén el texto relativamente corto y conciso (máximo 400 caracteres) para que la nota de voz generada dure aproximadamente de 30 a 40 segundos. No uses viñetas ni formateo markdown.
- CRÍTICO: Responde ÚNICAMENTE con el guion hablado de la nota de voz sin comentarios ni comillas.`;

        const response = await invokeLLM({
          messages: [
            { role: 'system', content: 'Eres JanIA, la asistente de voz e inteligencia artificial de la red colaborativa VECY Network. Te expresas de manera natural, humana, cálida y profesional.' },
            { role: 'user', content: promptVoz }
          ]
        });

        const content = cleanPromptLeak(response.choices[0]?.message?.content);
        if (content && content.trim() !== "") {
          console.log(`[CRON-SERVICE] Enviando audio de inicio de semana a ${grupo.nombre}...`);
          await whatsappBot.sendVoiceToGroup(content, grupo.id);
        }
        await new Promise(resolve => setTimeout(resolve, 8000));
      } catch (err: any) {
        console.error(`❌ Error al generar audio de Lunes por la mañana para grupo ${grupo.nombre}:`, err.message || err);
      }
    }
  }, {
    timezone: 'America/Bogota'
  });

  // 5. Viernes 07:00 PM = Informe Semanal de Actividad (con datos 100% reales de BD)
  cron.schedule('0 19 * * 5', async () => {
    console.log('[CRON-SERVICE] Generando y enviando Informe Semanal de Actividad...');
    await sendWeeklyReport();
  }, {
    timezone: 'America/Bogota'
  });

  // 6. Todos los días a las 08:00 AM = Cruce Masivo de la mañana (Re-matching de base de datos)
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON-SERVICE] Ejecutando cruce masivo (Re-matching)...');
    try {
      await runNightlyRematch();
    } catch (err: any) {
      console.error('[CRON-SERVICE] Error en el job de re-matching masivo:', err.message || err);
    }
  }, {
    timezone: 'America/Bogota'
  });
}

/**
 * Consulta la base de datos y genera el boletín de matches calificados (Score >= 60)
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
      gte(sql<number>`(${propertyMatches.matchScore})::numeric`, 60),
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
    
    // Contamos matches con score >= 60
    const matchesCountRes = await db.select({ count: sql<number>`count(*)` })
      .from(propertyMatches)
      .where(gte(sql<number>`(${propertyMatches.matchScore})::numeric`, 60))
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
      gte(sql<number>`(${propertyMatches.matchScore})::numeric`, 60),
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
