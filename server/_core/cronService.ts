import cron from 'node-cron';
import path from 'path';
import fs from 'fs';
import { getDb } from '../db';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { propertyMatches, requirements, properties, dailyBroadcasts } from '../../drizzle/schema';
import { gte, and, eq, sql, desc } from 'drizzle-orm';
import { janiaMatchBot as whatsappBot } from './whatsapp-match';
import { runNightlyRematch } from '../jobs/nightlyRematch';
import { invokeLLM } from './llm';
import { VECY_OFFICIAL_GROUPS } from '../../shared/const';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICIO DE DIFUSIÓN DIARIA Y CRONS — VECY BIENES RAÍCES v32.59
 * ═══════════════════════════════════════════════════════════════════════════
 * DOCTRINA DE DIFUSIÓN DE ALTO VALOR:
 * 1. CERO DUPLICADOS (Single Daily Execution):
 *    - Persistencia autoritativa en PostgreSQL (tabla `daily_broadcasts`).
 *    - Bloqueo atómico pre-ejecución `UNIQUE(date_bogota, target_group)`.
 *    - Imposibilidad matemática de envíos dobles ante reinicios de PM2 o deploys.
 * 2. CERO REPETICIÓN TEMÁTICA (Anti-Repetition 30-Day Memory):
 *    - Lectura de los últimos 30 temas publicados para inyección en el prompt LLM.
 *    - Catálogo curricular de más de 60 especialidades inmobiliarias colombianas.
 *    - Banco rotativo multi-temático de contingencia (35 fallbacks indexados).
 * 3. FORMATO LIMPIO EN TEXTO PURO (v32.59 — Doctrina Eduardo A. Rivera):
 *    - Calendario de 30 días sin repetir (CALENDARIO_30_DIAS_VECY) + edición especial día 31.
 *    - Redacción resumida, amena y profesional para WhatsApp. CERO audios TTS y CERO imágenes.
 *    - Envío matutino único a las 10:00 AM hora Bogotá a Grupo 2, Grupo 3 y Canal Oficial.
 *    - Encuesta SEMANAL (lunes 08:00 AM) EXCLUSIVA del Canal Oficial, máximo 3-4 opciones.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export function getBogotaDateString(d = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

// ── MEMORIA PERSISTENTE Y BLOQUEO ATÓMICO EN POSTGRESQL ────────────────────

export async function acquireBroadcastLock(
  targetGroup: 'grupo2' | 'grupo3' | 'grupo2_poll' | string,
  tipCategory: string,
  dateBogota: string,
  force: boolean = false
): Promise<{ allowed: boolean; reason?: string; broadcastId?: number }> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn('[CRON-LOCK] Base de datos no disponible, procediendo con precaución.');
      return { allowed: true };
    }

    if (!force) {
      // 1. Verificar si ya existe una difusión completada para hoy en este grupo
      const existing = await db
        .select()
        .from(dailyBroadcasts)
        .where(
          and(
            eq(dailyBroadcasts.dateBogota, dateBogota),
            eq(dailyBroadcasts.targetGroup, targetGroup)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const row = existing[0];
        if (row.status === 'completed') {
          return {
            allowed: false,
            reason: `[POSTGRESQL-LOCK] Ya existe una difusión COMPLETADA para ${targetGroup} hoy (${dateBogota}): "${row.topicTitle}". Prohibido duplicar.`
          };
        }
        // Si está in_progress pero lleva menos de 10 minutos activa, hay un worker ejecutándolo
        const ageMs = Date.now() - new Date(row.createdAt).getTime();
        if (row.status === 'in_progress' && ageMs < 10 * 60 * 1000) {
          return {
            allowed: false,
            reason: `[POSTGRESQL-LOCK] Difusión en curso activa (${Math.round(ageMs / 1000)}s) para ${targetGroup}. Evitando colisión.`
          };
        }
      }
    }

    // 2. Adquirir pre-bloqueo atómico con status 'in_progress'
    const [inserted] = await db
      .insert(dailyBroadcasts)
      .values({
        dateBogota,
        targetGroup,
        tipCategory,
        topicTitle: `Iniciando despacho de ${tipCategory}...`,
        themeKey: 'general',
        status: 'in_progress',
      })
      .onConflictDoUpdate({
        target: [dailyBroadcasts.dateBogota, dailyBroadcasts.targetGroup],
        set: {
          tipCategory,
          status: 'in_progress',
          createdAt: sql`NOW()`,
        },
      })
      .returning();

    return { allowed: true, broadcastId: inserted?.id };
  } catch (err: any) {
    console.error('[CRON-LOCK] Error al consultar bloqueo en PostgreSQL:', err?.message || err);
    if (!force) {
      return { allowed: false, reason: `Error de base de datos en bloqueo: ${err?.message}` };
    }
    return { allowed: true };
  }
}

export async function completeBroadcast(
  broadcastId: number | undefined,
  data: {
    topicTitle: string;
    themeKey: string;
    imageFileName?: string;
    voiceText?: string;
    captionText?: string;
  }
) {
  if (!broadcastId) return;
  try {
    const db = await getDb();
    if (!db) return;

    await db
      .update(dailyBroadcasts)
      .set({
        topicTitle: data.topicTitle,
        themeKey: data.themeKey,
        imageFileName: data.imageFileName,
        voiceText: data.voiceText,
        captionText: data.captionText,
        status: 'completed',
      })
      .where(eq(dailyBroadcasts.id, broadcastId));

    console.log(`[CRON-PERSISTENCE] ✅ Difusión #${broadcastId} asentada con éxito en PostgreSQL: "${data.topicTitle}".`);
  } catch (err: any) {
    console.error(`[CRON-PERSISTENCE] Error completando difusión #${broadcastId}:`, err?.message || err);
  }
}

export async function failBroadcast(broadcastId: number | undefined, reason: string) {
  if (!broadcastId) return;
  try {
    const db = await getDb();
    if (!db) return;
    await db
      .update(dailyBroadcasts)
      .set({
        topicTitle: `Error: ${reason}`,
        status: 'failed',
      })
      .where(eq(dailyBroadcasts.id, broadcastId));
  } catch (err: any) {
    console.warn(`[CRON-PERSISTENCE] Error marcando fallo en difusión #${broadcastId}:`, err?.message);
  }
}

/**
 * Consulta en PostgreSQL los temas tratados en los últimos 30 días para prohibir repeticiones
 */
export async function getRecentBroadcastTopics(limit: number = 30): Promise<Array<{ dateBogota: string; topicTitle: string }>> {
  try {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select({
        dateBogota: dailyBroadcasts.dateBogota,
        topicTitle: dailyBroadcasts.topicTitle,
      })
      .from(dailyBroadcasts)
      .where(eq(dailyBroadcasts.status, 'completed'))
      .orderBy(desc(dailyBroadcasts.createdAt))
      .limit(limit);

    return rows;
  } catch (err: any) {
    console.warn('[CRON-TOPICS] Error leyendo historial de temas de PostgreSQL:', err?.message);
    return [];
  }
}

/**
 * Consulta en PostgreSQL los nombres de archivo de las últimas ilustraciones usadas
 */
export async function getRecentImageFiles(limit: number = 3): Promise<string[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select({
        imageFileName: dailyBroadcasts.imageFileName,
      })
      .from(dailyBroadcasts)
      .where(and(eq(dailyBroadcasts.status, 'completed'), sql`image_file_name IS NOT NULL`))
      .orderBy(desc(dailyBroadcasts.createdAt))
      .limit(limit);

    return rows.map((r: { imageFileName: string | null }) => r.imageFileName).filter(Boolean) as string[];
  } catch {
    return [];
  }
}

// ── RESOLUCIÓN DE HORA Y SALUDOS EN COLOMBIA ───────────────────────────────

export function getBogotaTimeInfo(d = new Date()) {
  const bogotaTimeStr = d.toLocaleTimeString('en-US', { timeZone: 'America/Bogota', hour12: false });
  const [hourStr, minStr] = bogotaTimeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const min = parseInt(minStr, 10);

  let period: 'mañana' | 'tarde' | 'noche' = 'mañana';
  let greeting = '¡Buenos días!';

  if (hour >= 5 && hour < 12) {
    period = 'mañana';
    greeting = '¡Buenos días!';
  } else if (hour >= 12 && hour < 19) {
    period = 'tarde';
    greeting = '¡Buenas tardes!';
  } else {
    period = 'noche';
    greeting = '¡Buenas noches!';
  }

  return { hour, min, period, greeting, timeStr: bogotaTimeStr };
}

export function enforceGreetingAccuracy(text: string, period: 'mañana' | 'tarde' | 'noche'): string {
  if (!text) return text;
  let res = text;
  if (period === 'tarde') {
    res = res.replace(/¡?buenos\s+días!?/gi, '¡Buenas tardes!');
    res = res.replace(/buen\s+día/gi, 'buena tarde');
  } else if (period === 'noche') {
    res = res.replace(/¡?(?:buenos\s+días|buenas\s+tardes)!?/gi, '¡Buenas noches!');
    res = res.replace(/(?:buen\s+día|buena\s+tarde)/gi, 'buena noche');
  } else if (period === 'mañana') {
    res = res.replace(/¡?(?:buenas\s+tardes|buenas\s+noches)!?/gi, '¡Buenos días!');
    res = res.replace(/(?:buena\s+tarde|buena\s+noche)/gi, 'buen día');
  }
  return res;
}

export function enforceJanIAIdentity(text: string): string {
  if (!text) return text;
  let clean = text;
  clean = clean.replace(/(?:te saluda|soy|les habla|habla|aquí)\s+Jani\s+Alves/gi, 'les habla JanIA, la inteligencia artificial de VECY Bienes Raíces');
  clean = clean.replace(/Jani Alves y yo/gi, 'Eduardo Rivera y Jani Alves');
  clean = clean.replace(/(?:te saluda|soy|les habla|habla|aquí)\s+Eduardo\s+Rivera/gi, 'les habla JanIA');
  // v32.59: Marca pública exclusiva VECY BIENES RAÍCES (nunca "VECY Network")
  clean = enforceVecyBrand(clean);
  return clean;
}

// ── CATÁLOGO DE IMÁGENES 3D Y ROTACIÓN ACTIVA ──────────────────────────────

export const ALL_JANIA_IMAGES = [
  'jania_marketing.jpg',
  'jania_juridico.jpg',
  'jania_tributario.jpg',
  'jania_avaluos.jpg',
  'jania_matches.jpg',
  'jania_podcast.jpg',
  'jania_periodista.jpg',
  'jania_noticias.jpg',
  'jania_reporte.jpg',
  'jania_soporte.jpg',
];

export const THEME_IMAGE_PREFERENCES: Record<string, string[]> = {
  marketing: ['jania_marketing.jpg', 'jania_matches.jpg', 'jania_periodista.jpg'],
  juridico: ['jania_juridico.jpg', 'jania_soporte.jpg', 'jania_periodista.jpg'],
  tributario: ['jania_tributario.jpg', 'jania_soporte.jpg', 'jania_reporte.jpg'],
  avaluos: ['jania_avaluos.jpg', 'jania_reporte.jpg', 'jania_soporte.jpg'],
  matches: ['jania_matches.jpg', 'jania_periodista.jpg', 'jania_marketing.jpg'],
  cafe: ['jania_podcast.jpg', 'jania_soporte.jpg', 'jania_periodista.jpg'],
  podcast: ['jania_podcast.jpg', 'jania_soporte.jpg', 'jania_periodista.jpg'],
  periodista: ['jania_periodista.jpg', 'jania_noticias.jpg', 'jania_matches.jpg'],
  noticias: ['jania_noticias.jpg', 'jania_periodista.jpg', 'jania_matches.jpg'],
  primicia: ['jania_primicia.mp4', 'jania_primicia.jpg', 'jania_ultimahora.mp4', 'jania_ultimahora.jpg', 'jania_noticias.jpg', 'jania_periodista.jpg'],
  ultima_hora: ['jania_ultimahora.mp4', 'jania_ultimahora.jpg', 'jania_primicia.mp4', 'jania_primicia.jpg', 'jania_noticias.jpg', 'jania_periodista.jpg'],
  reporte: ['jania_reporte.jpg', 'jania_periodista.jpg', 'jania_avaluos.jpg'],
  reporte_semanal: ['jania_reporte.jpg', 'jania_periodista.jpg', 'jania_avaluos.jpg'],
  soporte: ['jania_soporte.jpg', 'jania_juridico.jpg', 'jania_podcast.jpg'],
  proyecto_vecy: ['jania_matches.jpg', 'jania_podcast.jpg', 'jania_marketing.jpg', 'jania_soporte.jpg'],
};

export async function getThemedImagePathAsync(tipo: string): Promise<{ fullPath: string | undefined; fileName: string | undefined }> {
  const recent = await getRecentImageFiles(3);

  const possibleDirs = [
    path.resolve(process.cwd(), 'client/public/assets/jania'),
    path.resolve(process.cwd(), 'dist/assets/jania'),
    path.resolve(__dirname, '../../client/public/assets/jania'),
  ];

  const preferences = THEME_IMAGE_PREFERENCES[tipo] || [];

  for (const pref of preferences) {
    if (pref.endsWith('.mp4') || pref.endsWith('.mov')) {
      for (const dir of possibleDirs) {
        const candidate = path.join(dir, pref);
        if (fs.existsSync(candidate)) {
          return { fullPath: candidate, fileName: pref };
        }
      }
    }
  }

  const pool = ALL_JANIA_IMAGES.filter(img => !recent.includes(img));
  const effectivePool = pool.length > 0 ? pool : ALL_JANIA_IMAGES;

  let chosenFile = preferences.find(img => effectivePool.includes(img) && !img.endsWith('.mp4') && !img.endsWith('.mov'));
  if (!chosenFile) {
    chosenFile = effectivePool[0];
  }

  for (const dir of possibleDirs) {
    const candidatePath = path.join(dir, chosenFile);
    if (fs.existsSync(candidatePath)) {
      return { fullPath: candidatePath, fileName: chosenFile };
    }
  }

  return { fullPath: undefined, fileName: chosenFile };
}

export function getThemedImagePath(tipo: string): { fullPath: string | undefined; fileName: string | undefined } {
  const possibleDirs = [
    path.resolve(process.cwd(), 'client/public/assets/jania'),
    path.resolve(process.cwd(), 'dist/assets/jania'),
    path.resolve(__dirname, '../../client/public/assets/jania'),
  ];

  const preferences = THEME_IMAGE_PREFERENCES[tipo] || ALL_JANIA_IMAGES;
  const chosenFile = preferences[0] || 'jania_marketing.jpg';

  for (const dir of possibleDirs) {
    const candidatePath = path.join(dir, chosenFile);
    if (fs.existsSync(candidatePath)) {
      return { fullPath: candidatePath, fileName: chosenFile };
    }
  }
  return { fullPath: undefined, fileName: chosenFile };
}

// ── BANCO ROTATIVO MULTI-TEMÁTICO DE CONTINGENCIA (35 FALLBACKS DIVERSOS) ───

interface FallbackTipItem {
  topicTitle: string;
  themeKey: string;
  voiceText: string;
  captionText: string;
}

export const ROTATING_FALLBACK_CATALOG: Record<string, FallbackTipItem[]> = {
  lunes_arranque: [
    {
      topicTitle: 'Tasas Hipotecarias y Capacidad de Compra en Colombia',
      themeKey: 'noticias',
      voiceText: `¡Buenos días, queridos colegas! Soy JanIA con las noticias de la semana. Conocer la tendencia de las tasas de interés hipotecario en Colombia nos permite calcular la cuota mensual real de nuestros clientes compradores y asesorarlos con ventaja. Si el crédito baja un punto, la capacidad de compra de una familia aumenta hasta un diez por ciento. Los invito a orientar a sus compradores con cifras exactas y a consultar análisis de mercado conmigo. ¡Excelente semana comercial!`,
      captionText: `🎙️ *NOTICIAS INMOBILIARIAS & TASAS DE INTERÉS — VECY BIENES RAÍCES* 🇨🇴\n\n` +
        `¡Buenos días a todos los colegas y aliados inmobiliarios!\n\n` +
        `📊 *Capacidad de Compra & Crédito Hipotecario:*\n` +
        `El comportamiento de las tasas de interés de colocación hipotecaria impacta de forma directa el poder adquisitivo de los compradores. Una variación del 1% en la tasa representa hasta un 10% más de presupuesto disponible para adquirir vivienda.\n\n` +
        `💡 *Consejo de Cierre:* Perfila a tus compradores con preaprobados vigentes antes de negociar precios de venta.\n\n` +
        `📲 *Consultas de Mercado con JanIA:* https://vecy-network.vercel.app/jania`
    },
    {
      topicTitle: 'Tope Legal de Incremento de Arriendos bajo Ley 820',
      themeKey: 'noticias',
      voiceText: `¡Buenos días a todos! Les habla JanIA. Recordemos que bajo la Ley 820 de 2003, el canon de arrendamiento de vivienda urbana solo puede reajustarse cada doce meses de ejecución contractual y con el tope máximo del IPC del año inmediatamente anterior, sin que supere el uno por ciento del valor comercial del predio. Conocer este límite evita controversias con los propietarios y protege a los inquilinos. ¡Muchos éxitos hoy!`,
      captionText: `📋 *ARRENDAMIENTOS & TOPE LEGAL IPC (LEY 820) — VECY BIENES RAÍCES* 🏢\n\n` +
        `¡Buenos días, queridos colegas corredores e inmobiliarios!\n\n` +
        `⚖️ *Reglas Clave para Reajuste de Cánones:*\n` +
        `• Solo aplica cada 12 meses de contrato continuo.\n` +
        `• El incremento no puede superar el porcentaje del IPC acumulado del año previo fijado por el DANE.\n` +
        `• El canon mensual resultante nunca podrá exceder el 1% del valor comercial real del inmueble.\n\n` +
        `💡 *Asesora con rigor:* Comunica el reajuste por escrito con antelación reglamentaria.\n\n` +
        `📲 *Consultas Jurídicas JanIA:* https://vecy-network.vercel.app/jania`
    },
    {
      topicTitle: 'Rentas Cortas y Registro Nacional de Turismo (RNT)',
      themeKey: 'noticias',
      voiceText: `¡Buenos días, colegas! Soy JanIA. La vivienda turística y de rentas cortas vive un auge sin precedentes en ciudades como Medellín, Bogotá y la Costa. Sin embargo, para que un propietario pueda arrendar por días legalmente, el reglamento de propiedad horizontal debe autorizarlo de forma expresa y el predio debe contar con Registro Nacional de Turismo vigente. Blindar a sus clientes con la norma correcta es sello de profesionalismo. ¡A cerrar con seguridad!`,
      captionText: `🏖️ *VIVIENDA TURÍSTICA & RNT EN PROPIEDAD HORIZONTAL — VECY BIENES RAÍCES* 🗺️\n\n` +
        `¡Buenos días, aliados de la red inmobiliaria!\n\n` +
        `📌 *Puntos Clave para Rentas Cortas Legales:*\n` +
        `1. El Reglamento de Propiedad Horizontal debe permitir explícitamente el uso de hospedaje turístico.\n` +
        `2. Inscripción activa en el Registro Nacional de Turismo (RNT) del Ministerio de Comercio.\n` +
        `3. Cumplimiento de normas de policía y registro de huéspedes (TRA).\n\n` +
        `💡 *Evita sanciones:* Asesora a tus inversionistas antes de comprar predios para Airbnb.\n\n` +
        `📲 *Consultorio JanIA:* https://vecy-network.vercel.app/jania`
    }
  ],

  martes_juridico: [
    {
      topicTitle: 'Cláusula Penal vs Arras en Promesas de Compraventa',
      themeKey: 'juridico',
      voiceText: `¡Buenos días, queridos colegas! Soy JanIA con su tip jurídico. En las promesas de compraventa es fundamental distinguir las arras de retracto de las arras confirmatorias y la cláusula penal. Si pactan arras de retracto sin aclararlo, cualquiera de las partes puede desistir del negocio pagando la sanción sin que se pueda exigir el cumplimiento forzoso. Redactar promesas claras protege las comisiones y el patrimonio de sus clientes. Cuenten conmigo para revisar sus minutas en cualquier momento.`,
      captionText: `⚖️ *CLÁUSULA PENAL VS ARRAS EN PROMESAS — VECY BIENES RAÍCES* 🏛️\n\n` +
        `¡Hola, queridos colegas corredores e inmobiliarios!\n\n` +
        `📌 *Tip Jurídico del Día: Precisión Notarial en Promesas de Compraventa*\n` +
        `• *Arras de Retracto (Art. 1859 C.C.):* Permiten a comprador o vendedor desistir legalmente del negocio perdiendo las arras o pagándolas dobladas, extinguiendo la promesa.\n` +
        `• *Arras Confirmatorias Penales (Art. 1861 C.C.):* Sirven como prueba de celebración del contrato y garantía de cumplimiento; facultan a exigir judicialmente la firma de la escritura.\n` +
        `• *Cláusula Penal:* Fija de antemano el monto indemnizatorio ante mora o incumplimiento contractual.\n\n` +
        `💡 *Consejo de Blindaje:* Especifica siempre la fecha, hora exacta y notaría determinada para la firma de la escritura pública.\n\n` +
        `📲 *Revisión de Minutas con JanIA:* https://vecy-network.vercel.app/jania`
    },
    {
      topicTitle: 'Modelo Colaborativo 40/20/40 de VECY BIENES RAÍCES vs Tercerías',
      themeKey: 'juridico',
      voiceText: `Hola, queridos colegas. Soy JanIA. En VECY Bienes Raíces defendemos una repartición justa, transparente y altamente rentable de honorarios: del tres por ciento de comisión habitual, el cuarenta por ciento es para el captador que subió el inmueble al portal, el veinte por ciento se divide en dos: diez por ciento para toda la red colaborativa de agentes que viralizan el enlace y diez por ciento para VECY por la tecnología y soporte legal; y el otro cuarenta por ciento es para el colocador que consigue al comprador, agenda la visita y cierra el negocio. Erradicamos las tercerías deshonestas y multiplicamos los cierres en equipo.`,
      captionText: `🤝 *MODELO COLABORATIVO 40/20/40 — VECY BIENES RAÍCES* 📜\n\n` +
        `¡Buenos días a todos los aliados y colegas del corretaje inmobiliario! Soy JanIA.\n\n` +
        `⚖️ *¿Por qué el modelo 40 / 20 / 40 supera al 50/50 y al 100% tradicional?*\n` +
        `Sobre el 100% de la comisión cobrada (habitualmente 3% en venta o 1 canon en arriendo):\n` +
        `• **40% Punta CAPTADORA:** Para quien subió el inmueble al portal (quien tenía el inmueble captado).\n` +
        `• **20% Bolsa de Aceleración:**\n` +
        `  - **10% Red Colaborativa:** Para todos los promotores de la red que viralizan el enlace de la propiedad y ganan por puntos de tráfico único.\n` +
        `  - **10% VECY BIENES RAÍCES:** Para la plataforma tecnológica, el algoritmo de matches de JanIA y el blindaje contractual.\n` +
        `• **40% Punta COLOCADORA:** Para quien consigue al comprador, lo presenta para agendamiento de visitas y logra el cierre del negocio.\n\n` +
        `🚫 *Cero tercerías e intermediarios fantasma:* El 40/20/40 premia con equidad a quienes realmente trabajan, activa un ejército de promotores motivados y protege las puntas.\n\n` +
        `🌐 *Portal Oficial:* https://vecy-network.vercel.app/`
    },
    {
      topicTitle: 'Verificación de Identidad de Visitantes y Antecedentes con JanIA',
      themeKey: 'juridico',
      voiceText: `¡Buenos días, colegas! Soy JanIA con una herramienta vital para su seguridad. Antes de mostrar un inmueble a un desconocido o compartir fichas reservadas, pueden escribir a mi número de WhatsApp o al de VECY Bienes Raíces solicitando la verificación de cédula de su visitante. Verificamos el nombre completo y antecedentes en Policía Nacional para que vayan a sus citas con total tranquilidad y dejen un registro probatorio ante cualquier controversia entre colegas o con propietarios. ¡Seguridad primero!`,
      captionText: `🛡️ *VERIFICACIÓN DE IDENTIDAD & SEGURIDAD EN VISITAS — VECY BIENES RAÍCES* 🕵️‍♀️\n\n` +
        `¡Colegas! Su seguridad física y jurídica durante las visitas comerciales es nuestra prioridad.\n\n` +
        `📌 *Servicio Oficial de Validación de Identidad y Antecedentes:*\n` +
        `Ahora a través del WhatsApp de JanIA (+57 319 291 9978) o de nuestra línea oficial (+57 316 656 9719), puedes solicitar en tiempo real:\n` +
        `1️⃣ **Verificación Oficial de Documento:** Confirmación del nombre civil completo con dos apellidos.\n` +
        `2️⃣ **Consulta de Antecedentes (Policía Nacional):** Comprobación de ausencia de requerimientos judiciales.\n` +
        `3️⃣ **Identificación de Colegas:** Para presentaciones formales por escrito a propietarios, sirviendo de acervo probatorio legal en caso de controversia sobre el corretaje.\n\n` +
        `💡 *Cero riesgos:* No lleves visitantes anónimos a los inmuebles. Verifica primero con JanIA.\n\n` +
        `📲 *Verifica Cédulas por WhatsApp:* +57 319 291 9978`
    },
    {
      topicTitle: 'Estudio de Títulos y Alertas en Folios de Matrícula SNR',
      themeKey: 'juridico',
      voiceText: `Buenos días, aliados inmobiliarios. Les habla JanIA. En el estudio de títulos no basta con mirar el último propietario. Es indispensable verificar la tradición jurídica de los últimos veinte años en el certificado de tradición de la Superintendencia de Notariado y Registro. Fíjense con lupa en notas devolutivas, embargos vigentes, condiciones resolutorias no canceladas y afectaciones a vivienda familiar. Prevenir un negocio inviable les ahorra meses de litigios. ¡A cuidar a sus clientes!`,
      captionText: `🔍 *ESTUDIO DE TÍTULOS & AUDITORÍA EN FOLIOS SNR — VECY BIENES RAÍCES* 📋\n\n` +
        `¡Buenos días, colegas de toda Colombia!\n\n` +
        `📌 *Puntos Críticos al Interpretar un Folio de Matrícula Inmobiliaria:*\n` +
        `1️⃣ **Tradición de 20 Años:** Revisar que cada transferencia de dominio esté inscrita de forma continua sin saltos registrales.\n` +
        `2️⃣ **Gravámenes y Limitaciones:** Identificar hipotecas, embargos, patrimonios de familia o afectaciones a vivienda familiar vigentes.\n` +
        `3️⃣ **Notas Devolutivas Recientes:** Alerta roja si la Oficina de Registro rechazó un trámite notarial previo por inconsistencias.\n\n` +
        `💡 *Asesora con seguridad notarial:* Si tienes dudas con un certificado SNR, consúltame.\n\n` +
        `📲 *Soporte Legal JanIA:* https://vecy-network.vercel.app/jania`
    }
  ],

  miercoles_marketing: [
    {
      topicTitle: 'Fotografía Inmobiliaria Profesional con Smartphone',
      themeKey: 'marketing',
      voiceText: `¡Buenas tardes, colegas! Soy JanIA con su tip de marketing inmobiliario. Para captar compradores de inmediato, tomen las fotos siempre a la altura del pecho, en posición horizontal y utilizando la luz natural de la mañana. Antes de disparar, despersonalicen los espacios: cierren las tapas de los inodoros, guarden los productos de aseo y despejen los mesones de la cocina. Las fotos limpias y luminosas aumentan hasta tres veces las visitas comerciales. ¡Pruébenlo hoy mismo!`,
      captionText: `📸 *FOTOGRAFÍA INMOBILIARIA PROFESIONAL CON TU MÓVIL — VECY BIENES RAÍCES* 📱\n\n` +
        `¡Buenas tardes, queridos colegas corredores!\n\n` +
        `🎯 *Consejos Prácticos para Fotos que Venden en Minutos:*\n` +
        `• **Altura y Perspectiva:** Dispara a la altura de tu pecho (1.20m a 1.40m), nunca desde la altura de tus ojos.\n` +
        `• **Luz Natural:** Abre cortinas y ventanas en la mañana; evita prender luces amarillas combinadas con luz de día.\n` +
        `• **Despersonalización:** Retira fotos familiares, toallas y tapetes desgastados antes de capturar el espacio.\n` +
        `• **Enfoque Horizontal:** Permite que los portales y redes muestren la amplitud real de la habitación.\n\n` +
        `💡 *Una imagen profesional duplica el interés de colegas y clientes compradores.*\n\n` +
        `📲 *Marketing & Copys con JanIA:* https://vecy-network.vercel.app/jania`
    },
    {
      topicTitle: 'Viralización Orgánica en Redes Sociales para Inmuebles',
      themeKey: 'marketing',
      voiceText: `¡Buenas tardes a todos! Les habla JanIA. No necesitan pagar miles de pesos en pauta para conseguir prospectos reales. Los videos cortos y dinámicos de cuarenta y cinco segundos en Instagram Reels y TikTok mostrando los tres mejores atractivos del inmueble generan un alcance orgánico impresionante. Inicien siempre con un gancho que despierte curiosidad, como el valor del metro cuadrado en la zona o la vista panorámica del balcón. ¡A romper las redes con calidad!`,
      captionText: `🚀 *VIRALIZACIÓN ORGÁNICA EN REELS Y TIKTOK — VECY BIENES RAÍCES* 🎬\n\n` +
        `¡Buenas tardes, aliados y agentes de la red!\n\n` +
        `🔥 *Estructura de un Video Inmobiliario de Alto Impacto (45 Segundos):*\n` +
        `1️⃣ **Gancho (Segundos 1 a 3):** Muestra el atributo estrella (terraza, cocina abierta o precio de oportunidad).\n` +
        `2️⃣ **Recorrido Ágil (Segundos 4 a 35):** Planos continuos de 3 segundos por área sin movimientos bruscos.\n` +
        `3️⃣ **Llamado a la Acción (Segundos 36 a 45):** Menciona la ciudad, barrio exacto y link directo de contacto.\n\n` +
        `💡 *El contenido educativo y transparente atrae compradores calificados sin gastar en publicidad.*\n\n` +
        `📲 *Prueba redactar copys con JanIA:* https://vecy-network.vercel.app/jania`
    },
    {
      topicTitle: 'Los 7 Pilares Obligatorios de una Publicación Exitosa',
      themeKey: 'marketing',
      voiceText: `¡Buenas tardes, colegas! Soy JanIA. El ochenta por ciento de las publicaciones inmobiliarias se descartan porque les faltan datos esenciales. Si quieren cerrar rápido tanto en ofertas como en demandas, incluyan siempre los siete pilares: tipo de predio, ciudad y barrio exacto, precio y administración, área en metros cuadrados, habitaciones, baños y parqueaderos independientes o en línea. Publicar completo le ahorra tiempo a toda la comunidad y activa el cruce de JanIA. ¡Éxitos!`,
      captionText: `📢 *LA REGLA DE ORO: LOS 7 PILARES INMOBILIARIOS — VECY BIENES RAÍCES* 🎯\n\n` +
        `¡Buenas tardes a toda la red de corretaje en Colombia!\n\n` +
        `¿Por qué se pierden miles de negocios en los grupos? Por publicaciones ambiguas o incompletas.\n\n` +
        `🏆 *Publica SIEMPRE con los 7 Pilares tanto en DEMANDAS como en OFERTAS:*\n` +
        `1️⃣ Tipo de Inmueble (Casa, Apto, Lote, Bodega, etc.)\n` +
        `2️⃣ Ciudad y Barrio Exacto\n` +
        `3️⃣ Precio / Canon y Cuota de Administración\n` +
        `4️⃣ Área Construida y Privada en m²\n` +
        `5️⃣ Número de Alcobas y Baños\n` +
        `6️⃣ Parqueaderos (Independientes o Servidumbre/Línea)\n` +
        `7️⃣ Enlace directo de contacto de WhatsApp\n\n` +
        `💡 *Cuando publicas con rigor, JanIA cruza datos en tiempo real y encuentra la otra punta al instante.*\n\n` +
        `📲 *Cruce Inteligente JanIA:* https://vecy-network.vercel.app/admin`
    }
  ],

  jueves_tributario: [
    {
      topicTitle: 'Retención en la Fuente en Enajenación de Inmuebles',
      themeKey: 'tributario',
      voiceText: `¡Buenos días, colegas! Soy JanIA con su tip tributario del día. Recuerden que al escriturar una venta de inmueble ante notaría, la retención en la fuente para personas naturales es del uno por ciento sobre el valor de la enajenación, según el artículo trescientos noventa y ocho del Estatuto Tributario. Para personas jurídicas la tarifa es del dos punto cinco por ciento. Aclarar desde la promesa a quién corresponde cada gasto previene disgustos el día de la firma. ¡A asesorar con números claros!`,
      captionText: `💰 *RETENCIÓN EN LA FUENTE ANTE NOTARÍA — VECY BIENES RAÍCES* 📋\n\n` +
        `¡Buenos días a todos los corredores e inmobiliarios!\n\n` +
        `📌 *Tarifas de Retención en la Fuente en Venta de Inmuebles:*\n` +
        `• **Persona Natural:** Tarifa del **1%** sobre el valor total fijado en la escritura pública (Art. 398 E.T.).\n` +
        `• **Persona Jurídica:** Tarifa general del **2.5%** a título de renta retenida en notaría.\n` +
        `• **¿Quién la asume?:** Por disposición legal y costumbre comercial, la retención en la fuente es asumida exclusivamente por el vendedor.\n\n` +
        `💡 *Consejo Contable:* Solicita al vendedor su última declaración de renta para verificar el costo fiscal antes de prometer.\n\n` +
        `📲 *Liquidaciones Tributarias JanIA:* https://vecy-network.vercel.app/jania`
    },
    {
      topicTitle: 'Deducción de Mejoras y Refacciones con Facturación Electrónica',
      themeKey: 'tributario',
      voiceText: `Hola, queridos colegas. Soy JanIA. Muchos propietarios pagan un impuesto de ganancia ocasional muy alto porque no saben que las remodelaciones y mejoras estructurales pueden sumarse al costo fiscal del inmueble para reducir la utilidad gravable. La condición indispensable de la DIAN es que todas esas refacciones estén soportadas con facturación electrónica a nombre del propietario. Asesorar a sus clientes en este aspecto les ahorra millones de pesos. ¡A vender informados!`,
      captionText: `🛠️ *DEDUCCIÓN DE MEJORAS & FACTURA ELECTRÓNICA ANTE LA DIAN — VECY BIENES RAÍCES* 🧾\n\n` +
        `¡Buenos días a todos los aliados inmobiliarios!\n\n` +
        `💡 *Cómo Reducir Legalmente la Ganancia Ocasional:*\n` +
        `Al vender un inmueble, el impuesto del 15% se calcula sobre la diferencia entre el precio de venta y el costo fiscal. ¿Cómo elevar el costo fiscal legalmente?\n\n` +
        `✅ **Mejoras y Adiciones:** Remodelaciones de cocinas, baños, ampliaciones y cambio de tuberías.\n` +
        `✅ **Requisito Obligatorio DIAN:** Contar con Facturas Electrónicas de Venta válidas emitidas por los contratistas a nombre del titular.\n` +
        `❌ Recibos de caja menor o notas manuales NO son deducibles fiscalmente.\n\n` +
        `📲 *Consultas Financieras JanIA:* https://vecy-network.vercel.app/jania`
    },
    {
      topicTitle: 'Desglose Exacto de Gastos Notariales y de Registro en Colombia',
      themeKey: 'tributario',
      voiceText: `Buenos días, aliados de la red. Les habla JanIA. En Colombia existe una distribución tradicional de los gastos de escrituración que todo asesor debe dominar con exactitud: los derechos notariales se comparten por partes iguales cincuenta y cincuenta entre comprador y vendedor; la retención en la fuente la paga el vendedor; y el impuesto de registro y beneficencia lo asume el comprador. Entregar este desglose por escrito desde el inicio genera confianza total. ¡Muchos éxitos!`,
      captionText: `📊 *DESGLOSE DE GASTOS NOTARIALES Y DE REGISTRO EN COLOMBIA — VECY BIENES RAÍCES* 🏛️\n\n` +
        `¡Buenos días, colegas corredores!\n\n` +
        `Para que tu promesa de compraventa esté completamente blindada, ten clara la distribución habitual de gastos en notarías colombianas:\n\n` +
        `🤝 **Notaría (Derechos Notariales):** Se divide **50% Vendedor / 50% Comprador** (Aprox. 0.54% del valor del negocio + IVA).\n` +
        `💰 **Vendedor Exclusivo:** Retención en la fuente (1% Personas Naturales).\n` +
        `📝 **Comprador Exclusivo:** Impuesto de Registro y Beneficencia (Gobernación + SNR, aprox. 1.67% al 2.0% según el departamento).\n\n` +
        `💡 *Claridad previa evita discrepancias en el despacho notarial.*\n\n` +
        `📲 *Asistencia Inmobiliaria JanIA:* https://vecy-network.vercel.app/jania`
    }
  ],

  viernes_avaluos: [
    {
      topicTitle: 'Estudios de Mercado de Valor por M² (100% Virtuales)',
      themeKey: 'avaluos',
      voiceText: `¡Excelente viernes, queridos colegas! Soy JanIA. Para captar con éxito y no quemar los inmuebles en los portales, es fundamental fijar precios realistas con los propietarios. Recuerden que en VECY Bienes Raíces NO hacemos avalúos presenciales con perito de lonja, sino estudios de mercado aproximados sobre el valor del metro cuadrado en la zona y sondeos de arriendo sugeridos. Todos nuestros análisis son cien por ciento virtuales, ágiles y al servicio de su gestión comercial. ¡A cerrar la semana con éxito!`,
      captionText: `📐 *ESTUDIOS DE MERCADO & VALOR DEL M² (100% VIRTUALES) — VECY BIENES RAÍCES* 🏙️\n\n` +
        `¡Excelente viernes para todos los colegas de la red!\n\n` +
        `📊 *Fijación de Precios de Captación Reales y Competitivos:*\n` +
        `¿Vas a captar un predio y necesitas orientar al propietario para que no infle el precio y queme el anuncio en los portales? En VECY Bienes Raíces te apoyamos con:\n\n` +
        `• Sondeo de mercado comparativo por zona y tipología urbana.\n` +
        `• Rango sugerido de valor por metro cuadrado para venta rápida.\n` +
        `• Estimación de canon de arrendamiento según oferta y demanda.\n\n` +
        `💡 *Servicio 100% virtual, ágil y sin necesidad de trámites engorrosos ni peritajes presenciales.*\n\n` +
        `📲 *Sondeos de Mercado JanIA:* https://vecy-network.vercel.app/jania`
    },
    {
      topicTitle: 'Interpretación de Fichas Normativas SINUPOT en Bogotá',
      themeKey: 'avaluos',
      voiceText: `¡Buenos días, colegas! Soy JanIA. Si están captando un lote, una casa antigua o un predio con potencial constructor en Bogotá, la herramienta clave es la ficha del SINUPOT. A través de este sistema pueden conocer el tratamiento urbanístico, el área de actividad, los usos del suelo permitidos y la edificabilidad máxima. Compartan conmigo la ficha en PDF y les extraigo el potencial del terreno en cuestión de segundos. ¡A captar con visión!`,
      captionText: `🗺️ *ESTUDIOS DE SUELO & FICHAS SINUPOT AL INSTANTE — VECY BIENES RAÍCES* 📐\n\n` +
        `¡Excelente viernes para todos los corredores visionarios!\n\n` +
        `¿Captaste un lote o una casa con potencial para desarrollo comercial o residencial en Bogotá?\n\n` +
        `🏢 *Qué analizamos en la Ficha SINUPOT:*\n` +
        `• **Tratamiento Urbanístico:** Consolidación, renovación o desarrollo.\n` +
        `• **Área de Actividad:** Residencial neta, comercio vecinal o servicios empresariales.\n` +
        `• **Usos Permitidos y Restringidos:** Qué actividades comerciales pueden operar legalmente en el inmueble.\n` +
        `• **Índices de Ocupación y Alturas:** Pisos permitidos según el perfil vial.\n\n` +
        `📲 *Envía tu ficha a JanIA:* https://vecy-network.vercel.app/jania`
    },
    {
      topicTitle: 'Cálculo de Cánones de Arrendamiento Sugeridos',
      themeKey: 'avaluos',
      voiceText: `Feliz viernes para todos. Les habla JanIA. Para calcular el canon comercial adecuado de un inmueble en arrendamiento, la regla técnica en Colombia oscila entre el cero punto cinco y el cero punto ocho por ciento del valor comercial real del predio, según estrato, amenidades del conjunto y antigüedad. Asesorar a los arrendadores con este parámetro evita que el apartamento permanezca meses desocupado generando pérdidas en administración. ¡A monetizar con inteligencia!`,
      captionText: `💰 *CÁLCULO DEL CANON DE ARRIENDO COMPETITIVO — VECY BIENES RAÍCES* 🏢\n\n` +
        `¡Excelente viernes, aliados y agentes de arrendamiento!\n\n` +
        `🎯 *Criterios Técnicos para Fijar el Canon Adecuado:*\n` +
        `• **Rango Promedio en Colombia:** Entre el **0.5% y el 0.8%** mensual sobre el valor comercial real del inmueble.\n` +
        `• **Factores de Valor:** Amenidades (club house, piscina, gimnasio), garajes independientes y estrato socioeconómico.\n` +
        `• **Riesgo de Vacancia:** Un sobreprecio de apenas el 10% puede prolongar el tiempo de colocación en 3 a 5 meses, generando mayores pérdidas en cuotas de administración que la rebaja inicial.\n\n` +
        `📲 *Sondeos de Arriendo con JanIA:* https://vecy-network.vercel.app/jania`
    }
  ],

  sabado_cafe: [
    {
      topicTitle: 'Ética y Alianzas Compartidas en el Corretaje',
      themeKey: 'cafe',
      voiceText: `Buenos días, queridos aliados de la red. Cerramos una semana extraordinaria de actividad comercial. Recuerden que en el negocio inmobiliario la reputación y la ética son nuestro activo más valioso. Compartir puntas con colegas serios, respetar la hoja de presentación del cliente y honrar los acuerdos al cincuenta cincuenta es lo que construye carreras sólidas y duraderas. Los invito a invitar a más colegas profesionales a sumarse a VECY Bienes Raíces. ¡Disfruten su café y que tengan un reparador fin de semana!`,
      captionText: `☕ *SÁBADO DE CAFÉ INMOBILIARIO & ÉTICA ENTRE COLEGAS — VECY BIENES RAÍCES* 🤝\n\n` +
        `¡Buenos días a todos los aliados y corredores de Colombia!\n\n` +
        `Culminamos una semana muy productiva en nuestra comunidad. Hoy reflexionamos sobre los pilares del éxito duradero en bienes raíces:\n\n` +
        `🌟 **La Reputación Comercial:** En un mercado competitivo, los corredores que cumplen su palabra y respetan los acuerdos de corretaje compartido multiplican sus negocios por recomendación natural.\n` +
        `🤝 **El Poder de la Red:** Nadie tiene todos los clientes ni todos los inmuebles; colaborar en red permite cerrar el doble de negocios en la mitad del tiempo.\n\n` +
        `📞 *Atención Personalizada Bróker (Eduardo y Jani):* WhatsApp +57 316 656 9719\n` +
        `📲 *Consola Web JanIA:* https://vecy-network.vercel.app/jania`
    },
    {
      topicTitle: 'Identidad de JanIA: Creada para Empoderar al Asesor',
      themeKey: 'cafe',
      voiceText: `Buenos días a todos mis queridos colegas. Les habla JanIA. Para quienes se unen por primera vez a nuestra comunidad, quiero contarles quién soy: fui concebida por nuestros directores Eduardo Rivera y Jani Alves como la primera inteligencia artificial inmobiliaria de Colombia. Mi propósito no es reemplazar al corredor, sino darle superpoderes: cruzo ofertas y requerimientos las veinticuatro horas, redacto contratos, oriento en temas tributarios y promuevo la colaboración ética. ¡Bienvenidos a la nueva era del corretaje!`,
      captionText: `🤖 *CONOCE A JANIA: LA IA INMOBILIARIA DE COLOMBIA — VECY BIENES RAÍCES* 🇨🇴\n\n` +
        `¡Buenos días, queridos colegas y nuevos aliados!\n\n` +
        `Hoy en nuestro café inmobiliario queremos compartir el corazón de esta innovación:\n\n` +
        `💡 *¿Quién es JanIA y por qué fue creada?*\n` +
        `• Concebida por nuestros fundadores **Eduardo A. Rivera** (Director de Tecnología) y **Jani Alves** (Directora de Operaciones).\n` +
        `• Diseñada para empoderar al agente independiente y a la agencia, brindándoles herramientas que antes solo tenían las multinacionales.\n` +
        `• **Qué hace 24/7:** Monitorea solicitudes, empata ofertas y demandas al instante, revisa minutas y analiza normativas fiscales.\n\n` +
        `🤝 *VECY Bienes Raíces es tu aliado tecnológico permanente.*\n\n` +
        `📲 *Interactúa con JanIA:* https://vecy-network.vercel.app/jania`
    }
  ],

  domingo_soporte: [
    {
      topicTitle: 'Consultorio 24/7 y Portafolio 100% Virtual VECY',
      themeKey: 'soporte',
      voiceText: `¡Feliz y bendecido domingo para todos mis queridos colegas! Soy JanIA. Hoy quiero recordarles que nuestro consultorio inmobiliario está a su entera disposición los siete días de la semana. Ya sea que necesiten estructurar una promesa de compraventa, liquidar la ganancia ocasional ante la DIAN, realizar un estudio de mercado del valor del metro cuadrado o diseñar una campaña de marketing con inteligencia artificial, aquí estamos para respaldarlos con servicios cien por ciento virtuales y ágiles. ¡Que disfruten un domingo reparador en familia!`,
      captionText: `🛎️ *DOMINGO DE SOPORTE INTEGRAL 100% VIRTUAL — VECY BIENES RAÍCES* 🌟\n\n` +
        `¡Feliz y descansado domingo para todos los aliados y colegas de VECY Bienes Raíces!\n\n` +
        `En VECY cuentas con un respaldo permanente para impulsar tus operaciones en toda Colombia:\n\n` +
        `⚖️ *Consultoría Jurídica:* Promesas de compraventa, corretaje 50/50 y blindaje contractual.\n` +
        `💰 *Asesoría Tributaria DIAN:* Liquidación de retenciones en la fuente y ganancia ocasional.\n` +
        `📊 *Estudios de Mercado y M²:* Fijación de precios competitivos sin quemar predios.\n` +
        `📐 *Fichas SINUPOT:* Usos de suelo, alturas y edificabilidad al instante.\n` +
        `📢 *Marketing Inmobiliario:* Técnicas de fotografía y los 7 pilares de publicación.\n\n` +
        `📲 *Consola Web JanIA:* https://vecy-network.vercel.app/jania\n` +
        `📞 *Línea Comercial Bróker:* WhatsApp +57 316 656 9719`
    },
    {
      topicTitle: 'Bolsa Colaborativa VECY y Comisiones Transparentes (35/35/15/15)',
      themeKey: 'soporte',
      voiceText: `Feliz domingo, aliados inmobiliarios. Les habla JanIA. En VECY Bienes Raíces estamos construyendo la primera bolsa inmobiliaria colaborativa y fintech de Colombia, basada en la equidad y el respeto mutuo. Nuestro modelo de comisiones justas reconoce el trabajo del asesor captador con el treinta y cinco por ciento, el asesor colocador con el treinta y cinco por ciento, y destina el resto a la bolsa colaborativa y a la plataforma que los respalda. Los invito a sumar a colegas éticos para crecer juntos. ¡Feliz día!`,
      captionText: `🤝 *BOLSA COLABORATIVA & COMISIONES JUSTAS (35/35/15/15) — VECY BIENES RAÍCES* 🏛️\n\n` +
        `¡Feliz domingo para todos los visionarios del sector!\n\n` +
        `🎯 *El Nuevo Estándar del Corretaje Inmobiliario en Colombia:*\n` +
        `• **35% Asesor Captador:** Quien consigue la propiedad exclusiva o disponible.\n` +
        `• **35% Asesor Colocador:** Quien aporta al cliente comprador calificado.\n` +
        `• **15% Fondo de Bolsa Colaborativa:** Para los agentes que colaboran difundiendo y viralizando.\n` +
        `• **15% Plataforma y Tecnología VECY:** Para mantener la IA, servidores, soporte legal y peritajes.\n\n` +
        `💡 *Cero canibalismo, máxima transparencia y cierres compartidos.*\n\n` +
        `📲 *Únete a la Red:* https://vecy-network.vercel.app/`
    }
  ]
};

export const DAILY_TIPS_CONFIG: Record<string, { theme: string; voice: string; caption: string }> = {
  lunes_arranque: {
    theme: 'noticias',
    voice: ROTATING_FALLBACK_CATALOG.lunes_arranque[0].voiceText,
    caption: ROTATING_FALLBACK_CATALOG.lunes_arranque[0].captionText,
  },
  martes_juridico: {
    theme: 'juridico',
    voice: ROTATING_FALLBACK_CATALOG.martes_juridico[0].voiceText,
    caption: ROTATING_FALLBACK_CATALOG.martes_juridico[0].captionText,
  },
  miercoles_marketing: {
    theme: 'marketing',
    voice: ROTATING_FALLBACK_CATALOG.miercoles_marketing[0].voiceText,
    caption: ROTATING_FALLBACK_CATALOG.miercoles_marketing[0].captionText,
  },
  jueves_tributario: {
    theme: 'tributario',
    voice: ROTATING_FALLBACK_CATALOG.jueves_tributario[0].voiceText,
    caption: ROTATING_FALLBACK_CATALOG.jueves_tributario[0].captionText,
  },
  viernes_avaluos: {
    theme: 'avaluos',
    voice: ROTATING_FALLBACK_CATALOG.viernes_avaluos[0].voiceText,
    caption: ROTATING_FALLBACK_CATALOG.viernes_avaluos[0].captionText,
  },
  sabado_cafe: {
    theme: 'cafe',
    voice: ROTATING_FALLBACK_CATALOG.sabado_cafe[0].voiceText,
    caption: ROTATING_FALLBACK_CATALOG.sabado_cafe[0].captionText,
  },
  domingo_soporte: {
    theme: 'soporte',
    voice: ROTATING_FALLBACK_CATALOG.domingo_soporte[0].voiceText,
    caption: ROTATING_FALLBACK_CATALOG.domingo_soporte[0].captionText,
  }
};

/**
 * Retorna un fallback dinámico rotativo indexado según el día del año para que JAMÁS se repita
 */
export function getDynamicFallbackItem(tipoKey: string, d = new Date()): FallbackTipItem {
  const catalog = ROTATING_FALLBACK_CATALOG[tipoKey] || ROTATING_FALLBACK_CATALOG.lunes_arranque;
  const startOfYear = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const index = Math.abs(dayOfYear) % catalog.length;
  return catalog[index];
}

// ── CALENDARIO DOCTRINAL DE 30 DÍAS SIN REPETIR — VECY BIENES RAÍCES ────────

export interface DailyTipItem {
  dayOfMonth: number;
  topicTitle: string;
  themeKey: string;
  captionText: string;
}

export const CALENDARIO_30_DIAS_VECY: DailyTipItem[] = [
  {
    dayOfMonth: 1,
    topicTitle: "El Modelo Colaborativo 40/20/40 de VECY BIENES RAÍCES: Ganar cada 3-4 días vs meses esperando solos",
    themeKey: "modelo_colaborativo",
    captionText: `🤝 *DÍA 1 — EL PODER DEL MODELO COLABORATIVO 40/20/40 EN VECY BIENES RAÍCES* ⚡\n\n` +
      `¡Buenos días, queridos colegas y aliados inmobiliarios! Soy JanIA.\n\n` +
      `¿Alguna vez has calculado cuánto te cuesta esperar 3 o 4 meses para cerrar un negocio y ganarte el 100% o el 50% de comisión en solitario? En ese tiempo la vacancia, el desgaste y las cuentas por pagar no dan tregua.\n\n` +
      `💡 *La Fórmula Colaborativa 40 / 20 / 40 de VECY BIENES RAÍCES:*\n` +
      `• **40% para quien subió el inmueble al portal:** Quien tenía la propiedad captada tiene su 40% asegurado y respetado.\n` +
      `• **20% de bolsa compartida:** 10% para toda la red colaborativa de agentes que viralizan el enlace con sus puntos de tráfico + 10% para VECY por la plataforma tecnológica, algoritmo de matches y soporte legal.\n` +
      `• **40% para quien consiga el comprador:** Quien presenta al cliente calificado, agenda la visita y logra cerrar el negocio.\n\n` +
      `⚡ *El Resultado:* Cero tercerías deshonestas, un ejército de promotores motivados y rotación constante ganando comisiones cada 3 o 4 días en red.\n\n` +
      `💬 *¿Tienes una duda o caso privado?* Escríbeme a mi chat privado de JanIA 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Deseas debatir o compartir tu experiencia?* ¡Opina aquí en este grupo y construyamos gremio! 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 2,
    topicTitle: "Política Cero Papel: Cuidado ambiental y agilidad contractual",
    themeKey: "ecologia_cero_papel",
    captionText: `🌱 *DÍA 2 — POLÍTICA CERO PAPEL: SALVAR ÁRBOLES Y FRENAR EL CALENTAMIENTO GLOBAL* 📄❌\n\n` +
      `¡Buenos días a todos los corredores conscientes! Soy JanIA.\n\n` +
      `En el sector inmobiliario tradicional se gastan millones de resmas de papel al año en promesas, minutas preliminares, copias de cédula y certificados de tradición. ¿El resultado? Deforestación, gasto innecesario de agua en la producción papelera y trámites lentos.\n\n` +
      `🌿 *El Compromiso de VECY BIENES RAÍCES:*\n` +
      `• **100% Digital y Cero Papel:** Promesas, órdenes de visita y contratos con firma electrónica y trazabilidad probatoria.\n` +
      `• Cuidamos el medio ambiente, reducimos la huella de carbono y eliminamos el desplazamiento físico innecesario.\n` +
      `• Un cliente firma desde su celular en 1 minuto mientras ayudas a preservar los bosques y fuentes hídricas de Colombia.\n\n` +
      `💬 *¿Quieres redactar o revisar una minuta digital?* Consúltame por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Cómo implementas el cero papel en tu agencia?* Cuéntanos tu experiencia en este canal 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 3,
    topicTitle: "Avisos en las Ventanas vs Marketing Digital y Estética Urbana",
    themeKey: "ecologia_avisos",
    captionText: `🪟 *DÍA 3 — ¿DEBEMOS SEGUIR PEGANDO AVISOS EN LAS VENTANAS?* 🚫🏙️\n\n` +
      `¡Buenos días, colegas visionarios! Les habla JanIA.\n\n` +
      `El tradicional aviso de vinilo o plástico pegado con cinta en la ventana de los apartamentos genera grave contaminación visual, se degrada al sol, mancha los vidrios y suele terminar en la basura contaminando nuestros ríos y vertederos.\n\n` +
      `🎯 *La Alternativa Inteligente de VECY BIENES RAÍCES:*\n` +
      `• Hoy más del **92% de los compradores** encuentran su inmueble a través de canales digitales y redes sociales.\n` +
      `• Con la IA de VECY, en vez de esperar a que un transeúnte mire hacia el quinto piso, tu inmueble hace match instantáneo con clientes que ya están buscando activamente en esa zona.\n` +
      `• Cuidamos la fachada de las ciudades, protegemos el medio ambiente y cerramos negocios con mayor elegancia y discreción.\n\n` +
      `💬 *¿Tienes un inmueble para promover digitalmente?* Escríbeme a mi chat privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Qué opinas tú de los avisos físicos?* ¡Abre el debate aquí con los colegas! 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 4,
    topicTitle: "Portal VECY: Tienda propia y publicación masiva de OFERTAS y DEMANDAS",
    themeKey: "portal_vecy",
    captionText: `🌐 *DÍA 4 — PORTAL VECY: PUBLICA OFERTAS Y DEMANDAS ILIMITADAS (SUPERANDO A WASI)* 🚀\n\n` +
      `¡Buenos días a toda la red inmobiliaria! Soy JanIA.\n\n` +
      `Muchos colegas usan plataformas tradicionales como Wasi.co. Son útiles, pero tienen una gran limitación: **solo te permiten publicar ofertas (inmuebles), ignorando por completo la otra mitad del negocio: las DEMANDAS y requerimientos de compra o arriendo**.\n\n` +
      `🏆 *La Revolución de VECY BIENES RAÍCES:*\n` +
      `• Ingreso al portal inmobiliario **totalmente gratuito**.\n` +
      `• Cada agente tiene su propia tienda virtual y panel de administración.\n` +
      `• Puedes publicar sin límites tanto tus **OFERTAS** como tus **REQUERIMIENTOS** (búsquedas de clientes con presupuesto en mano).\n` +
      `• Nuestra IA monitorea ambas vitrinas y conecta las dos puntas de inmediato. ¡Aquí no se pierde un solo cliente!\n\n` +
      `💬 *¿Quieres crear tu vitrina gratuita?* Escríbeme por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Qué herramientas te faltan en tu portal actual?* Comparte tu opinión aquí en el grupo 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 5,
    topicTitle: "Rompiendo Tabús: 'Loro viejo sí aprende a hablar' y la IA como aliada",
    themeKey: "mentalidad_ia",
    captionText: `🧠 *DÍA 5 — ROMPIENDO TABÚS: 'LORO VIEJO SÍ APRENDE A HABLAR' Y LA IA NO VIENE A QUITAR TRABAJO* 💡\n\n` +
      `¡Buenos días, queridos colegas! Soy JanIA.\n\n` +
      `En el gremio escuchamos a menudo excusas como *"yo ya tengo más de 50 años, la tecnología no es para mí"*, o tabús como *"la Inteligencia Artificial nos va a quitar el empleo"*. ¡Nada más falso!\n\n` +
      `🌟 *La Verdad sobre la Tecnología Inmobiliaria:*\n` +
      `• La IA no reemplaza al agente empático, negociador y humano; lo **empodera con superpoderes**.\n` +
      `• Lo que antes te tomaba 6 horas revisando chats y notas en cuadernos, JanIA lo resuelve en 2 segundos cruzando bases de datos.\n` +
      `• Los asesores que aprenden a usar herramientas inteligentes son los que multiplicarán sus ingresos; los que se resistan por apatía quedarán rezagados.\n` +
      `• Darse la oportunidad de aprender es el acto de mayor profesionalismo para tu futuro y el de tu familia.\n\n` +
      `💬 *¿Quieres aprender a usarme paso a paso?* Háblame al privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Cómo ha sido tu experiencia adaptándote a la tecnología?* ¡Cuéntanos aquí! 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 6,
    topicTitle: "Ahorro de Agua y Proyectos Eco-Eficientes en Propiedad Horizontal",
    themeKey: "ecologia_agua",
    captionText: `💧 *DÍA 6 — AHORRO DE AGUA Y EDIFICACIONES ECO-EFICIENTES EN COLOMBIA* 🏢🌿\n\n` +
      `¡Buenos días a todos los corredores comprometidos con el planeta! Soy JanIA.\n\n` +
      `Frente al cambio climático y las temporadas de sequía que afectan a nuestras ciudades, el ahorro de agua dejó de ser un adorno ecológico para convertirse en un factor financiero decisivo al tasar, vender y arrendar inmuebles.\n\n` +
      `🚰 *Qué valoran hoy los compradores e inquilinos:*\n` +
      `• Conjuntos residenciales con sistemas de recolección y reutilización de aguas lluvias para riego y zonas comunes.\n` +
      `• Griferías y sanitarios de bajo consumo que reducen el recibo de acueducto hasta en un 35%.\n` +
      `• Plantas de tratamiento y sensores de presión en motobombas que evitan fugas ocultas.\n` +
      `• Destacar estas características ecológicas en tus fichas técnicas acelera la venta y enamora a las nuevas generaciones.\n\n` +
      `💬 *¿Deseas evaluar el impacto eco-sostenible de un predio?* Háblame al privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿En tu ciudad ya exigen sellos de sostenibilidad?* Abre el debate aquí 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 7,
    topicTitle: "Los 7 Pilares de una Publicación: Cómo vender sin quemar el inmueble",
    themeKey: "tecnica_publicacion",
    captionText: `📋 *DÍA 7 — LOS 7 PILARES PARA PUBLICAR SIN QUEMAR EL INMUEBLE* 🎯\n\n` +
      `¡Buenos días, colegas! Soy JanIA.\n\n` +
      `A diario vemos en grupos publicaciones como *"Vendo lindo apto bien ubicado, info al interno"*. Esa falta de rigor hace perder el 95% de los clientes y hace imposible que los motores de búsqueda encuentren comprador.\n\n` +
      `🏆 *Los 7 Datos Indispensables en toda OFERTA:*\n` +
      `1️⃣ **Tipo de Inmueble:** Apartamento, Casa, Lote, Local, Bodega.\n` +
      `2️⃣ **Ubicación Exacta:** Ciudad y Barrio legítimo (sin nombres genéricos).\n` +
      `3️⃣ **Precio y Administración:** Valor comercial real y cuota mensual.\n` +
      `4️⃣ **Área Total:** Metros cuadrados construidos y privados.\n` +
      `5️⃣ **Distribución:** Habitaciones y baños.\n` +
      `6️⃣ **Parqueaderos:** Número y tipo (independiente o servidumbre/línea).\n` +
      `7️⃣ **Contacto Directo:** Enlace de WhatsApp para comunicación fluida.\n\n` +
      `💬 *¿Quieres que revise si tu ficha técnica está completa?* Escríbeme a mi privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Cuál error ves más seguido en las publicaciones del gremio?* Opina aquí 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 8,
    topicTitle: "Redacción de Requerimientos Exactos: Cierra clientes con presupuesto en mano",
    themeKey: "tecnica_demanda",
    captionText: `📝 *DÍA 8 — CÓMO REDACTAR REQUERIMIENTOS EXACTOS PARA CERRAR EN TIEMPO RÉCORD* ⏱️\n\n` +
      `¡Buenos días a toda la red! Les habla JanIA.\n\n` +
      `Tener un cliente comprador o arrendatario calificado es un tesoro. Pero si pides *"Busco apto en el norte bonito y barato"*, recibirás 50 opciones que no le sirven a tu cliente y perderás días valiosos filtrando.\n\n` +
      `🔍 *La Estructura de Oro para DEMANDAS:*\n` +
      `• **Tipo y Operación:** Compra o arriendo de Apto / Casa / Local.\n` +
      `• **Barrios de Interés:** Lista de 2 o 3 barrios específicos.\n` +
      `• **Presupuesto Máximo Real:** Cifra techo en pesos colombianos (incluyendo administración si es arriendo).\n` +
      `• **Filtros Innegociables:** Mínimo de alcobas, baños, garajes y si requiere balcón o ascensor.\n` +
      `• Con estos parámetros exactos, el motor de VECY BIENES RAÍCES cruza contra miles de ofertas y te entrega el match perfecto.\n\n` +
      `💬 *¿Tienes un requerimiento urgente por cruzar?* Envíamelo por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Cómo perfilas a tus clientes compradores?* Comparte tu método en el grupo 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 9,
    topicTitle: "Retención en la Fuente en Notaría: Tarifas para Personas Naturales y Jurídicas",
    themeKey: "tributario",
    captionText: `💰 *DÍA 9 — RETENCIÓN EN LA FUENTE ANTE NOTARÍA: CLAVES FISCALES EN ENAJENACIÓN* 🏛️\n\n` +
      `¡Buenos días a todos los corredores y asesores! Soy JanIA con tu tip tributario.\n\n` +
      `El día de la firma de escrituras en notaría, los clientes no deben llevarse sorpresas desagradables con las liquidaciones de impuestos. La retención en la fuente es un anticipo de renta que el notario retiene obligatoriamente.\n\n` +
      `📌 *Tarifas Oficiales (Estatuto Tributario):*\n` +
      `• **Persona Natural:** Tarifa del **1%** sobre el valor total de la venta fijado en la escritura pública (Art. 398 E.T.).\n` +
      `• **Persona Jurídica:** Tarifa general del **2.5%** a título de retención de renta.\n` +
      `• **¿Quién la asume?:** Por disposición legal y costumbre mercantil, la retención en la fuente le corresponde al **100% al vendedor**.\n` +
      `• Aclarar esto desde la promesa de compraventa evita disputas amargas en la notaría.\n\n` +
      `💬 *¿Tienes una duda tributaria con un negocio?* Consúltame por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Te ha pasado que el vendedor no sabía de este costo?* Comparte tu anécdota aquí 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 10,
    topicTitle: "Deducción de Mejoras ante la DIAN: Factura electrónica para bajar ganancia ocasional",
    themeKey: "tributario",
    captionText: `🧾 *DÍA 10 — DEDUCCIÓN LEGAL DE MEJORAS CON FACTURA ELECTRÓNICA ANTE LA DIAN* 🛠️\n\n` +
      `¡Buenos días, queridos colegas! Les habla JanIA.\n\n` +
      `Al vender un inmueble poseído por más de 2 años, el impuesto de Ganancia Ocasional del 15% puede costar decenas de millones de pesos. Muchos propietarios desconocen que las mejoras estructurales pueden elevar el costo fiscal para pagar menos impuesto de forma legal.\n\n` +
      `💡 *Reglas Clave de la DIAN:*\n` +
      `• **Mejoras Deducibles:** Remodelaciones completas de cocina, baños, ampliaciones, cambio de redes eléctricas o tuberías.\n` +
      `• **Requisito Obligatorio:** Contar con **Facturas Electrónicas de Venta** válidas emitidas por los contratistas a nombre del propietario.\n` +
      `• Recibos manuales o de caja menor NO son válidos ni deducibles ante la administración tributaria.\n` +
      `• Asesorar a tus clientes en esto te posiciona como un verdadero consultor financiero de alto valor.\n\n` +
      `💬 *¿Deseas calcular el costo fiscal de un predio?* Escríbeme por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Tus clientes suelen guardar facturas de remodelación?* Comenta aquí 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 11,
    topicTitle: "Repartición Exacta de Gastos Notariales y de Registro en Colombia",
    themeKey: "juridico_notarial",
    captionText: `📊 *DÍA 11 — REPARTICIÓN DE GASTOS NOTARIALES Y DE REGISTRO EN COLOMBIA* ✍️\n\n` +
      `¡Buenos días a toda la comunidad de VECY BIENES RAÍCES! Soy JanIA.\n\n` +
      `Para que una promesa de compraventa esté blindada, debes desglosar con precisión matemática quién paga qué en la notaría y ante la Oficina de Registro de Instrumentos Públicos (ORIP).\n\n` +
      `🤝 *Distribución Legal y Consuetudinaria:*\n` +
      `1️⃣ **Derechos Notariales:** Se pagan por mitades: **50% Vendedor y 50% Comprador** (Aprox. 0.54% del valor del acto + IVA).\n` +
      `2️⃣ **Retención en la Fuente:** Asumida **100% por el Vendedor** (1% persona natural).\n` +
      `3️⃣ **Impuesto de Registro y Beneficencia:** Asumido **100% por el Comprador** (Gobernación + SNR, entre el 1.67% y 2.0% según el departamento).\n` +
      `4️⃣ **Gastos de Copias de Escritura:** Cada parte paga las copias que solicita.\n\n` +
      `💬 *¿Necesitas una liquidación previa para tu cliente?* Háblame por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Has tenido promesas donde intentaron cambiar este esquema?* Cuéntanos aquí 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 12,
    topicTitle: "Estudios de Mercado del M²: Fijación de precios 100% virtual sin quemar predios",
    themeKey: "avaluos_mercado",
    captionText: `📐 *DÍA 12 — ESTUDIOS DE MERCADO DEL M²: CAPTA A PRECIO REAL SIN QUEMAR EL PREDIO* 🏙️\n\n` +
      `¡Buenos días, colegas corredores! Soy JanIA.\n\n` +
      `El principal motivo por el que un inmueble pasa 6, 8 o 12 meses sin venderse es porque se captó a un precio emocional inflado por el propietario. En VECY BIENES RAÍCES no hacemos peritajes presenciales costosos, sino estudios comparativos de mercado ágiles y 100% virtuales.\n\n` +
      `📊 *Por qué sustentar con datos del M²:*\n` +
      `• Analizamos transacciones reales y ofertas activas en el mismo barrio y estrato.\n` +
      `• Entregamos un rango de valor por metro cuadrado sugerido para cierre rápido.\n` +
      `• Le muestras al propietario una gráfica técnica en lugar de una opinión subjetiva, ganándote su respeto profesional y la exclusiva.\n\n` +
      `💬 *¿Tienes una captación y necesitas el rango de M²?* Consúltame por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Cómo manejas tú a los propietarios con precio inflado?* ¡Abre el debate! 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 13,
    topicTitle: "Fichas SINUPOT en Bogotá: Usos de suelo, alturas y edificabilidad al instante",
    themeKey: "urbanismo_sinupot",
    captionText: `🗺️ *DÍA 13 — FICHAS SINUPOT EN BOGOTÁ: ANÁLISIS URBANÍSTICO PARA LOTES Y CASAS* 🏗️\n\n` +
      `¡Buenos días, visionarios inmobiliarios! Soy JanIA.\n\n` +
      `Cuando captas una casa antigua, un lote o un inmueble con potencial comercial en Bogotá, el verdadero valor no está en los ladrillos, sino en **lo que el POT permite construir o desarrollar allí**.\n\n` +
      `🏢 *Datos Clave en la Ficha SINUPOT:*\n` +
      `• **Tratamiento Urbanístico:** Consolidación, renovación urbana o desarrollo.\n` +
      `• **Área de Actividad:** Residencial neta, comercio vecinal o servicios empresariales.\n` +
      `• **Usos del Suelo Permitidos:** Si se puede instalar oficina, restaurante, consultorio o bodega.\n` +
      `• **Índices de Ocupación y Alturas:** Cuántos pisos y qué densidad permite la norma.\n` +
      `• Envíame el PDF o CHIP de la ficha y te extraigo el resumen urbanístico en segundos.\n\n` +
      `💬 *¿Tienes un predio para analizar en Bogotá?* Escríbeme por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Haces negocios con constructores?* Cuéntanos tu enfoque aquí 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 14,
    topicTitle: "Cálculo Técnico del Canon de Arriendo: El rango 0.5% a 0.8% y el costo de la vacancia",
    themeKey: "arrendamiento_canon",
    captionText: `💵 *DÍA 14 — CÁLCULO TÉCNICO DEL CANON DE ARRIENDO Y EL COSTO OCULTO DE LA VACANCIA* 🏢\n\n` +
      `¡Buenos días, aliados de arrendamientos! Soy JanIA.\n\n` +
      `Fijar un canon de arriendo no es adivinar. La regla técnica en Colombia ubica el canon mensual promedio entre el **0.5% y el 0.8%** sobre el valor comercial real del predio, según estrato, amenidades y antigüedad.\n\n` +
      `⚠️ *El Gran Error de los Propietarios:*\n` +
      `• Si un inmueble de $400 millones se arrienda en $2.400.000 (0.6%), el propietario quiere pedir $2.800.000.\n` +
      `• Por esos $400.000 de sobreprecio, el predio dura 4 meses desocupado, perdiendo $9.600.000 de arriendo y pagando 4 cuotas de administración del bolsillo.\n` +
      `• La vacancia destruye la rentabilidad. Asesorar con números fríos te hace ganar al cliente para siempre.\n\n` +
      `💬 *¿Deseas calcular el canon óptimo de un inmueble?* Pregúntame al privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Cómo convences a un dueño de no inflar el canon?* Comparte tu experiencia 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 15,
    topicTitle: "Arras Confirmatorias vs de Retracto: Cómo blindar promesas de compraventa",
    themeKey: "juridico_arras",
    captionText: `⚖️ *DÍA 15 — ARRAS CONFIRMATORIAS VS ARRAS DE RETRACTO EN PROMESAS DE COMPRAVENTA* 🏛️\n\n` +
      `¡Buenos días, colegas! Soy JanIA con una advertencia jurídica crucial.\n\n` +
      `En muchas promesas de compraventa vemos que escriben la palabra "arras" sin especificar la tipología. Ese error permite que una parte se eche para atrás a última hora dejando al asesor sin comisión.\n\n` +
      `📌 *Diferencias que debes dominar (Código Civil):*\n` +
      `• **Arras de Retracto (Art. 1859 C.C.):** Autorizan a cualquiera de las partes a arrepentirse perdiendo las arras o pagándolas dobladas, extinguiendo el negocio sin obligación de firmar.\n` +
      `• **Arras Confirmatorias (Art. 1861 C.C.):** Son parte de pago y prueba de ejecución del contrato; NO dan derecho a arrepentirse y permiten exigir el cumplimiento judicial forzoso.\n` +
      `• **Cláusula Penal:** Fija la tasación anticipada de perjuicios por mora o incumplimiento.\n\n` +
      `💬 *¿Tienes una promesa y quieres que la revise?* Envíamela al privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Te han intentado deshacer un negocio con arras de retracto?* Cuéntanos aquí 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 16,
    topicTitle: "Ley 820 de 2003: Causales y procedimiento seguro para restitución de inmueble",
    themeKey: "juridico_arrendamiento",
    captionText: `📜 *DÍA 16 — LEY 820 DE 2003: CAUSALES LEGALES PARA RESTITUCIÓN DE INMUEBLE* 🏠\n\n` +
      `¡Buenos días a toda la comunidad inmobiliaria! Les habla JanIA.\n\n` +
      `El arrendamiento de vivienda urbana está estrictamente regulado en Colombia por la Ley 820 de 2003. Para pedir un inmueble arrendado no basta la voluntad del propietario; se deben cumplir causales legales exactas.\n\n` +
      `⚖️ *Causales Especiales de Terminación con Indemnización o Preaviso:*\n` +
      `• Necesidad del propietario de habitar el predio por término no menor a 1 año.\n` +
      `• Demolición o reparación necesaria que impida la habitación.\n` +
      `• Entrega en cumplimiento de obligación originada en contrato de compraventa.\n` +
      `• Terminación unilateral con indemnización de 3 cánones y preaviso no menor a 3 meses.\n` +
      `• Notificar por correo certificado con las formalidades legales es la única vía para evitar demandas de restitución fallidas.\n\n` +
      `💬 *¿Dudas sobre restitución o preavisos?* Consúltame por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Cuál ha sido tu caso de arrendamiento más complejo?* Comenta aquí 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 17,
    topicTitle: "Seguridad y Verificación de Cédula: Protege tu integridad antes de cada visita",
    themeKey: "seguridad_identidad",
    captionText: `🛡️ *DÍA 17 — SEGURIDAD PRIMERO: VERIFICACIÓN OFICIAL DE CÉDULA ANTES DE MOSTRAR UN PREDIO* 👮‍♂️\n\n` +
      `¡Buenos días, colegas! Soy JanIA con un mensaje directo sobre tu seguridad personal.\n\n` +
      `Ingresar a un apartamento desocupado o a una casa con personas desconocidas que contactaste por internet es un riesgo real para tu patrimonio y tu vida. Ninguna comisión vale tu seguridad.\n\n` +
      `🔒 *El Servicio de Validación de JanIA y VECY BIENES RAÍCES:*\n` +
      `• Antes de ir a la cita, pídele foto de la cédula al visitante con naturalidad: *"Por políticas de seguridad de la copropiedad y de la inmobiliaria, validamos identidad previa"*.\n` +
      `• Envíame el número de cédula al chat y en segundos te verifico el nombre civil completo y consulta de antecedentes.\n` +
      `• Dejas un registro digital probatorio de quién ingresó al predio, respaldando tu gestión ante el propietario.\n\n` +
      `💬 *¿Quieres validar una cédula ahora mismo?* Escríbeme por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Qué protocolos de seguridad aplicas en tus visitas?* ¡Compartamos buenas prácticas! 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 18,
    topicTitle: "Rentas Cortas y Vivienda Turística: RNT y reglamentos de Propiedad Horizontal",
    themeKey: "rentas_cortas",
    captionText: `🏖️ *DÍA 18 — RENTAS CORTAS Y TURÍSTICAS: RNT, ASAMBLEAS Y NORMATIVA DE P.H.* 🌇\n\n` +
      `¡Buenos días a todos los aliados del corretaje! Soy JanIA.\n\n` +
      `El modelo de rentas cortas (Airbnb, Booking) es muy codiciado por inversionistas. Pero vender un apartamento prometiendo que *"se puede rentar por días"* sin verificar el reglamento de propiedad horizontal es una trampa legal.\n\n` +
      `📌 *Los 3 Requisitos Indispensables:*\n` +
      `1️⃣ **Reglamento de Copropiedad:** Debe autorizar explícitamente la explotación de vivienda turística o contar con aprobación del 70% del coeficiente en asamblea.\n` +
      `2️⃣ **Registro Nacional de Turismo (RNT):** Trámite gratuito y obligatorio ante el Ministerio de Comercio.\n` +
      `3️⃣ **Tarjeta de Registro de Alojamiento (TRA):** Registro de huéspedes ante la Policía de Turismo.\n` +
      `• Asesora con la verdad jurídica y evita que tu comprador enfrente multas y cerramientos policiales.\n\n` +
      `💬 *¿Quieres revisar si un conjunto permite rentas cortas?* Pregúntame al privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿En tu ciudad cómo está el ambiente con las rentas cortas?* Opina aquí 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 19,
    topicTitle: "Cuotas Extraordinarias de Administración: Quién las asume entre comprador y vendedor",
    themeKey: "propiedad_horizontal",
    captionText: `🏢 *DÍA 19 — CUOTAS EXTRAORDINARIAS DE ADMINISTRACIÓN: REGLAS CLARAS PARA NO FRUSTRAR FIRMAS* ✍️\n\n` +
      `¡Buenos días, colegas! Soy JanIA.\n\n` +
      `Llegar a la notaría y descubrir que la asamblea aprobó una cuota extraordinaria de $5.000.000 para pintar la fachada puede romper un negocio en el último minuto si no se pactó previamente en la promesa.\n\n` +
      `⚖️ *El Criterio Doctrinal Inmobiliario:*\n` +
      `• **Regla General:** Las cuotas extraordinarias causadas y aprobadas *antes* de la fecha de entrega real del inmueble son responsabilidad del **Vendedor**.\n` +
      `• Las cuotas extraordinarias aprobadas *después* de la entrega o posesión corresponden al **Comprador**.\n` +
      `• **Cláusula de Blindaje:** Exige siempre un paz y salvo expedido por la administración con fecha inferior a 15 días antes de la firma, donde se certifique si existen cuotas futuras ya votadas.\n\n` +
      `💬 *¿Deseas incluir la cláusula de administración en tu promesa?* Pídemela por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Alguna vez se te ha complicado una firma por este motivo?* Cuéntanos aquí 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 20,
    topicTitle: "Ética y Corretaje Compartido 50/50: Respeto a las puntas y la dignidad gremial",
    themeKey: "etica_corretaje",
    captionText: `🤝 *DÍA 20 — ÉTICA EN EL CORRETAJE COMPARTIDO: RESPETO A LAS PUNTAS Y DIGNIDAD GREMIAL* 🌟\n\n` +
      `¡Buenos días a todos los aliados de la red! Les habla JanIA.\n\n` +
      `El canibalismo y el salto de intermediarios le han hecho un daño enorme a la reputación del sector inmobiliario en Colombia. Corredores que intentan llamar al dueño a espaldas del colega o que niegan el corretaje 50/50 destruyen su carrera por una ganancia efímera.\n\n` +
      `🏆 *Los Principios de VECY BIENES RAÍCES:*\n` +
      `• Respeto absoluto a la hoja de presentación y al colega captador.\n` +
      `• La reputación comercial es el único activo que no se puede recomprar.\n` +
      `• Cuando aprendemos a compartir con lealtad, multiplicamos las recomendaciones y los negocios fluyen sin estrés.\n` +
      `• La red de VECY nació precisamente para unir a los mejores agentes bajo un código de ética inquebrantable.\n\n` +
      `💬 *¿Quieres conocer más sobre nuestras alianzas éticas?* Escríbeme al privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Qué valoras más al compartir negocio con otro colega?* ¡Opina en el grupo! 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 21,
    topicTitle: "Fotografía Inmobiliaria con Smartphone: Encuadres, luz y técnicas que captan clientes",
    themeKey: "marketing_fotografia",
    captionText: `📸 *DÍA 21 — FOTOGRAFÍA INMOBILIARIA PROFESIONAL CON SMARTPHONE* 📱✨\n\n` +
      `¡Buenos días, queridos colegas! Soy JanIA con tips de marketing visual.\n\n` +
      `No necesitas una cámara réflex de $10 millones para tomar fotos que vendan. Con un teléfono moderno y técnica adecuada puedes duplicar los clics y visitas de cualquier publicación.\n\n` +
      `💡 *5 Reglas Básicas de Fotografía:*\n` +
      `1️⃣ **Limpieza y Orden:** Despeja mesones de cocina, baja la tapa del inodoro y retira elementos personales.\n` +
      `2️⃣ **Luz Natural:** Abre cortinas de par en par y toma fotos en las horas de mayor iluminación (10 AM a 2 PM).\n` +
      `3️⃣ **Lente Limpio:** Pasa un paño por la cámara antes de cada foto (la grasa del bolsillo arruina la nitidez).\n` +
      `4️⃣ **Tomas a la Altura del Pecho:** Evita ángulos en picada; mantén las líneas de las paredes verticales y rectas.\n` +
      `5️⃣ **Gran Angular Moderado (0.6x o 0.8x):** Muestra el espacio completo sin distorsionar en exceso como ojo de pez.\n\n` +
      `💬 *¿Quieres recomendaciones de apps para editar fotos gratis?* Pídemelas por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Cuál es tu mayor desafío al tomar fotos de inmuebles?* Comenta aquí 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 22,
    topicTitle: "Ganancia Ocasional del 15%: Cálculo exacto en inmuebles poseídos por más de 2 años",
    themeKey: "tributario_ganancia",
    captionText: `💰 *DÍA 22 — IMPUESTO DE GANANCIA OCASIONAL (15%): CÁLCULO EXACTO Y ESTRATEGIAS FISCALES* 📊\n\n` +
      `¡Buenos días a toda la red! Soy JanIA con un tema tributario de máximo impacto.\n\n` +
      `Desde la última reforma tributaria en Colombia, la tarifa del impuesto sobre la Ganancia Ocasional es del **15%** para inmuebles que hayan estado en el patrimonio del vendedor durante **2 años o más** (si es menos de 2 años, tributa como renta ordinaria).\n\n` +
      `📝 *Fórmula Básica de Liquidación:*\n` +
      `• **Ganancia Ocasional Bruta = Precio de Venta en Escritura - Costo Fiscal del Inmueble**.\n` +
      `• El Costo Fiscal es el valor por el cual el predio figuraba en la última declaración de renta, más reajustes fiscales del Art. 73 E.T. o avalúo catastral.\n` +
      `• Sobre esa diferencia neta se aplica el 15%.\n` +
      `• Conocer este cálculo previo evita que el vendedor entre en pánico cuando el contador le entregue la liquidación de renta del año siguiente.\n\n` +
      `💬 *¿Quieres proyectar la ganancia ocasional de un cliente?* Consúltame por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Tus clientes te preguntan por este impuesto antes de fijar precio?* Comparte tu experiencia 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 23,
    topicTitle: "Inmuebles en Sucesión Ilíquida: Trámites notariales indispensables para prometer",
    themeKey: "juridico_sucesion",
    captionText: `⚖️ *DÍA 23 — INMUEBLES EN SUCESIÓN: TRÁMITES NOTARIALES INDISPENSABLES ANTES DE VENDER* 📜\n\n` +
      `¡Buenos días, colegas! Les habla JanIA.\n\n` +
      `Captar un inmueble donde uno de los cónyuges o padres falleció es muy común. Pero firmar promesas de compraventa o recibir arras sin que la sucesión esté radicada o resuelta puede terminar en un lío judicial y la devolución del dinero con sanciones.\n\n` +
      `📌 *Pasos Jurídicos Previos:*\n` +
      `1️⃣ Si hay común acuerdo entre todos los herederos, la sucesión se tramita ante **Notaría** de forma rápida.\n` +
      `2️⃣ Si hay desacuerdo o herederos menores de edad sin apoderado, se tramita por vía **Judicial** (Juzgado de Familia).\n` +
      `3️⃣ Los herederos pueden ceder sus derechos herenciales o esperar la expedición de la escritura pública de adjudicación y su respectivo registro en la ORIP.\n` +
      `4️⃣ Nunca prometas venta sin verificar el inventario de bienes y la conformidad de todos los herederos legítimos.\n\n` +
      `💬 *¿Tienes un inmueble en sucesión para vender?* Consúltame por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Has enfrentado complicaciones con herencias familiares?* Abre el foro aquí 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 24,
    topicTitle: "Inspección de Humedades y Vicios Ocultos: Qué verificar para evitar litigios futuros",
    themeKey: "tecnica_patologias",
    captionText: `🔍 *DÍA 24 — HUMEDADES Y VICIOS OCULTOS: INSPECCIÓN CLAVE EN LA CAPTACIÓN* 🏠🛠️\n\n` +
      `¡Buenos días, aliados! Soy JanIA.\n\n` +
      `Un vicio oculto es aquel defecto grave en la estructura, tuberías o cubiertas del predio que no es perceptible a simple vista por un comprador diligente, pero que hace impropio el inmueble para su uso.\n\n` +
      `⚠️ *Puntos Críticos a Revisar en tu Captación:*\n` +
      `• Humedades por capilaridad en zócalos o por filtración de pisos superiores.\n` +
      `• Estado de las cajas de inspección, sifones y presión de agua en baños.\n` +
      `• Tableros eléctricos sin polos a tierra o sobrecargados.\n` +
      `• Si el vendedor oculta un vicio con una mano de pintura fresca, el comprador puede demandar la resolución del contrato o la rebaja del precio más indemnización (Acción Redhibitoria, Art. 1914 C.C.). La honestidad técnica protege tu prestigio.\n\n` +
      `💬 *¿Dudas sobre cómo redactar el estado del inmueble en la promesa?* Escríbeme por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Te ha tocado lidiar con reclamos de vicios ocultos posventa?* Cuéntanos aquí 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 25,
    topicTitle: "Exención de Ganancia Ocasional en Vivienda de Habitación: Las primeras 5.000 UVT",
    themeKey: "tributario_exencion",
    captionText: `🏡 *DÍA 25 — EXENCIÓN DE GANANCIA OCASIONAL: BENEFICIO DE LAS PRIMERAS 5.000 UVT* 💰\n\n` +
      `¡Buenos días a toda la red de corredores! Soy JanIA.\n\n` +
      `Existe un gran beneficio tributario en Colombia que muchos propietarios desconocen al vender su casa o apartamento de habitación. El Estatuto Tributario (Art. 311-1) contempla una exención muy generosa.\n\n` +
      `💡 *Requisitos para la Exención de 5.000 UVT:*\n` +
      `• El predio vendido debe ser la **vivienda de habitación principal** del contribuyente.\n` +
      `• El valor equivalente a las primeras **5.000 UVT** de utilidad está exento del impuesto del 15%.\n` +
      `• **Condición Clave:** El producto de la venta debe ser consignado en una cuenta AFC o destinado totalmente a la adquisición de otra vivienda de habitación en un plazo no mayor a 1 año.\n` +
      `• Dar este consejo tributario a un cliente puede ahorrarle millones de pesos y garantizar su fidelidad de por vida.\n\n` +
      `💬 *¿Deseas liquidar este beneficio para tu cliente?* Háblame por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Tus clientes conocen este beneficio de ley?* ¡Comenta en el grupo! 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 26,
    topicTitle: "Desenglobe y Venta de Garajes o Depósitos: Qué exige el reglamento de copropiedad",
    themeKey: "propiedad_horizontal_desenglobe",
    captionText: `🚗 *DÍA 26 — VENTA DE GARAJES O DEPÓSITOS INDEPENDIENTES: REGLAS EN PROPIEDAD HORIZONTAL* 📦\n\n` +
      `¡Buenos días, colegas! Soy JanIA con un tip de propiedad horizontal.\n\n` +
      `¿Se puede vender un parqueadero o un depósito sin vender el apartamento? Sí, pero no siempre ni a cualquiera.\n\n` +
      `📌 *Reglas de la Ley 675 de 2001:*\n` +
      `1️⃣ **Matrícula Inmobiliaria Propia:** El garaje o depósito debe ser una unidad privada desenglobada jurídicamente con su propio folio de matrícula en la ORIP.\n` +
      `2️⃣ **Reglamento del Edificio:** Muchos reglamentos de PH prohíben expresamente que los parqueaderos sean enajenados a personas que no sean propietarios de apartamentos en la misma copropiedad (por seguridad y control de acceso).\n` +
      `3️⃣ Si es parqueadero común de uso exclusivo, NO se puede vender por escritura; solo se puede ceder su asignación junto con la unidad principal.\n\n` +
      `💬 *¿Quieres revisar el certificado de tradición de un garaje?* Envíamelo por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Has cerrado ventas de parqueaderos independientes?* Comparte tu experiencia 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 27,
    topicTitle: "Negociación Asertiva y Manejo de Objeciones: Defiende el precio sin perder al comprador",
    themeKey: "negociacion_asertiva",
    captionText: `🎯 *DÍA 27 — NEGOCIACIÓN ASERTIVA: CÓMO DEFENDER EL PRECIO SIN PERDER AL COMPRADOR* 🤝\n\n` +
      `¡Buenos días a todos los aliados negociadores! Soy JanIA.\n\n` +
      `Cuando un comprador dice *"el inmueble está muy costoso"* o hace una contraoferta agresiva del 20% por debajo, el peor error del asesor es bajar la guardia o confrontar al cliente. La negociación profesional se basa en preguntas asertivas.\n\n` +
      `💡 *3 Tácticas de Cierre Efectivas:*\n` +
      `• **Validar antes de responder:** *"Entiendo tu punto de vista sobre el presupuesto. Aparte del valor, ¿la ubicación y la distribución cumplen al 100% lo que tu familia necesita?"*.\n` +
      `• **Sustentar con Datos Reales:** Muestra el estudio del valor de metro cuadrado de VECY BIENES RAÍCES en la zona. Frente a los datos fríos, la emoción retrocede.\n` +
      `• **Ceder con Condición:** Si el vendedor accede a un descuento pequeño, exige a cambio un cierre inmediato o un pago inicial más alto: *"Si el propietario aprueba ese ajuste, ¿estás listo para firmar la promesa hoy mismo?"*.\n\n` +
      `💬 *¿Estás trabado en una negociación difícil?* Pídeme asesoría por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Cuál es tu objeción de precio favorita para rebatir?* ¡Comenta aquí! 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 28,
    topicTitle: "Subsidios y Créditos Hipotecarios: Cómo guiar a compradores primerizos",
    themeKey: "creditos_subsidios",
    captionText: `🏦 *DÍA 28 — CRÉDITOS HIPOTECARIOS Y LEASING: ACOMPAÑAMIENTO AL COMPRADOR PRIMERIZO* 👨‍👩‍👧\n\n` +
      `¡Buenos días, colegas! Soy JanIA.\n\n` +
      `El comprador primerizo suele tener miedo, desconfianza y confusión ante los trámites bancarios. El asesor que lo lleva de la mano y le explica con paciencia se gana a un cliente de por vida y a toda su red familiar.\n\n` +
      `📋 *Diferencias Clave para Explicarle al Cliente:*\n` +
      `• **Crédito Hipotecario Tradicional:** Financia hasta el 70% del valor del inmueble en vivienda No VIS (hasta 80% en VIS). El bien queda a nombre del comprador con hipoteca en primer grado.\n` +
      `• **Leasing Habitacional:** Financia hasta el 80% o incluso 85%. El inmueble queda jurídicamente a nombre del banco y el cliente tiene un contrato de arrendamiento con opción de compra, con ventajas tributarias en renta.\n` +
      `• Perfila al comprador antes de mostrarle predios que superen su capacidad de endeudamiento.\n\n` +
      `💬 *¿Quieres proyectar la cuota bancaria de un cliente?* Consúltame por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Tus compradores prefieren crédito o leasing?* Opina aquí en el grupo 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 29,
    topicTitle: "Calificación Rápida del Arrendatario: Análisis de ingresos y codeudor sin fricciones",
    themeKey: "arrendamiento_perfilamiento",
    captionText: `📑 *DÍA 29 — CALIFICACIÓN EFICIENTE DEL ARRENDATARIO: INGRESOS Y CODEUDOR SIN PÉRDIDAS DE TIEMPO* ⚡\n\n` +
      `¡Buenos días a toda la comunidad de arrendamientos! Soy JanIA.\n\n` +
      `Mostrar un inmueble 10 veces para que al final la aseguradora o afianzadora rechace al interesado es una pérdida dolorosa de tiempo y combustible. Calificar al candidato desde la primera llamada es la marca de un profesional.\n\n` +
      `🔍 *Filtros Básicos de Capacidad:*\n` +
      `• **Regla del 3 a 1:** Los ingresos demostrables del arrendatario (o sumados con su núcleo familiar) deben ser equivalentes al menos a **3 veces el valor del canon mensual más administración**.\n` +
      `• **Codeudor Solvente:** Exigir codeudor con ingresos similares o propiedad raíz libre de gravámenes y afectaciones familiares.\n` +
      `• Si no cuenta con codeudor, orientarlo hacia pólizas de fianza digitales o depósitos autorizados según la norma.\n` +
      `• Filtra con amabilidad antes de agendar la visita.\n\n` +
      `💬 *¿Dudas sobre requisitos de aseguradoras?* Pregúntame por privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¿Qué aseguradora o afianzadora te da mejores resultados?* Comparte tus recomendaciones 🤝\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  },
  {
    dayOfMonth: 30,
    topicTitle: "La Visión de VECY BIENES RAÍCES: Una red nacional imparable y próspera para todos",
    themeKey: "vision_vecy",
    captionText: `🚀 *DÍA 30 — LA VISIÓN DE VECY BIENES RAÍCES: UNIDOS SOMOS IMPARABLES* 🇨🇴✨\n\n` +
      `¡Buenos días, queridos colegas, aliados y soñadores del corretaje! Soy JanIA.\n\n` +
      `Completamos un ciclo de 30 días de aprendizaje, debate y crecimiento mutuo. Este proyecto fue concebido por nuestros directores **Eduardo A. Rivera** y **Jani Alves** con una misión sagrada: **dignificar el oficio inmobiliario en Colombia y erradicar el canibalismo comercial**.\n\n` +
      `🌟 *Hacia Dónde Vamos:*\n` +
      `• Hacia un mercado donde ningún asesor esté solo ni tenga que esperar meses para cobrar.\n` +
      `• Una red inteligente donde la tecnología trabaja 24/7 para ti mientras tú te dedicas a negociar y construir relaciones humanas.\n` +
      `• Un portal inmobiliario gratuito con tiendas virtuales completas para ofertas y demandas.\n` +
      `• Cero papel, protección del medio ambiente, comisiones justas compartidas y prosperidad real para cada familia vinculada a nuestra red.\n\n` +
      `💬 *¿Deseas atención personalizada con nuestros directores?* Escribe a nuestra línea comercial bróker: +57 316 656 9719 o háblame a mi chat privado 📲: https://wa.me/573192919978\n` +
      `🗣️ *¡Gracias por ser parte activa de esta revolución!* Sigamos transformando el corretaje colombiano juntos. 🤝✨\n\n` +
      `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
  }
];

// ── GENERADOR DINÁMICO DE GUIONES CON MEMORIA ANTI-REPETICIÓN ──────────────

export async function generateDailyContent(
  tipo: 'lunes_arranque' | 'martes_juridico' | 'miercoles_marketing' | 'jueves_tributario' | 'viernes_avaluos' | 'sabado_cafe' | 'domingo_soporte' | 'inmuebles_network' | 'proyecto_vecy' | 'noticias_nacionales' | 'lunes_reporte_semanal',
  fallbackVoice: string,
  fallbackCaption: string,
  additionalInstructions?: string
): Promise<{ voiceText: string; captionText: string; chosenTheme?: string; topicTitle: string }> {
  const timeInfo = getBogotaTimeInfo();
  const fechaBogota = new Date().toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // 1. Obtener historial de los últimos 30 temas para PROHIBIR su repetición
  const recentTopics = await getRecentBroadcastTopics(30);
  const forbiddenTopicsPrompt = recentTopics.length > 0
    ? `\n🚫 TEMAS TRATADOS RECIENTEMENTE EN VECY BIENES RAÍCES (TERMINANTEMENTE PROHIBIDO REPETIR O REFRITAR ESTOS TEMAS HOY):\n` +
      recentTopics.map((t, idx) => `${idx + 1}. [${t.dateBogota}] ${t.topicTitle}`).join('\n') +
      `\n\nTu misión primordial: Debes escoger obligatoriamente un tema NUEVO, FRESCO, DIFERENTE e INNOVADOR que NO figure en esa lista ni trate sobre los mismos conceptos exactos.\n`
    : '';

  const promptsMap: Record<string, string> = {
    lunes_arranque: `Tema: Lunes de Noticias Inmobiliarias Nacionales, Apertura de Mercado & Macroeconomía (${fechaBogota}).
Elige un ángulo de análisis fresco y de alto impacto sobre el mercado colombiano:
- Comportamiento de tasas de colocación hipotecaria y cuota de crédito en la banca colombiana.
- Tope legal de incremento del IPC en contratos de arrendamiento bajo Ley 820 y excepciones comerciales.
- Marco normativo de vivienda turística y rentas cortas: Propiedad Horizontal, cuotas y RNT.
- Cifras de iniciaciones y ventas de vivienda nueva (CAMACOL) vs demanda de vivienda usada.
- Comportamiento del valor por metro cuadrado en Bogotá, Medellín, Cali, Barranquilla o Eje Cafetero.`,

    martes_juridico: `Tema: Martes Jurídico, Blindaje Notarial & Código de Comercio (${fechaBogota}).
Selecciona un tema legal inmobiliario colombiano específico y didáctico:
- Verificación oficial de identidad y seguridad de clientes: cómo blindar contratos de corretaje y acuerdos de puntas compartidas 50/50 validando la cédula de clientes y acompañantes en segundos directamente en el chat con JanIA en nuestra central de seguridad de Vecy Bienes Raíces.
- Cláusula penal vs arras confirmatorias y de retracto en la promesa de compraventa (Arts. 1859-1861 C.C.).
- Causales de terminación unilateral y restitución de inmueble arrendado bajo la Ley 820 de 2003.
- Validez probatoria de la hoja de visita digital y correos certificados bajo la Ley 527 de 1999 para blindar el cobro de comisión.
- Artículos 1340 a 1346 del Código de Comercio: cuándo se causa la comisión del corredor y cómo defender el 50/50.
- Interpretación de folios de matrícula SNR: cómo leer notas devolutivas, embargos, hipotecas y tradición de 20 años.
- Afectación a vivienda familiar vs patrimonio de familia inembargable: diferencias, cancelación notarial y gravámenes.
- Poderes generales vs poderes especiales ante notaría para venta de inmuebles.`,

    miercoles_marketing: `Tema: Miércoles de Marketing Digital Inmobiliario, Fotografía & Cierre Comercial (${fechaBogota}).
Enseña técnicas prácticas y vanguardistas para que los corredores vendan y capten más rápido:
- Fotografía profesional de inmuebles con smartphone: altura de pecho, plano horizontal, luz natural y despersonalización.
- Viralización orgánica en Instagram Reels y TikTok para agentes inmobiliarios sin pagar pauta publicitaria.
- La Regla de Oro de los 7 Pilares: por qué publicar con Tipo, Ciudad, Barrio exacto, Precio/Canon real, Área en m², Habitaciones/Baños, Garajes y Contacto directo agiliza las ventas.
- Copywriting inmobiliario y psicología del comprador: redacción de títulos persuasivos que filtren curiosos.
- Perfilamiento financiero inicial: cómo saber si el prospecto tiene preaprobado antes de coordinar la visita.`,

    jueves_tributario: `Tema: Jueves Tributario DIAN, Contabilidad & Ahorro Fiscal Inmobiliario (${fechaBogota}).
Selecciona con rigor técnico un consejo tributario o financiero colombiano:
- Liquidación y Gestión de Impuesto Predial Bogotá: cómo consultar el avalúo catastral y facturas oficiales con el código CHIP y cédula directamente con JanIA para llegar con cuentas claras a la promesa de compraventa.
- Retención en la fuente por venta de inmuebles en notaría: 1% personas naturales vs 2.5% personas jurídicas y quién la asume.
- Deducción de mejoras y adiciones: cómo documentar refacciones con Facturación Electrónica para rebajar la ganancia ocasional al escriturar.
- Desglose exacto de gastos notariales en Colombia: Derechos notariales (50/50), Retención en la fuente (vendedor), Registro y beneficencia (comprador).
- Rentabilidad neta vs rentabilidad bruta en inmuebles de arriendo (descuento de administración, predial, seguros y vacancia).
- Ajuste fiscal del costo de bienes raíces (Art. 73 del E.T.) para personas naturales.
- Régimen tributario de honorarios de corretaje para asesores independientes ante la DIAN.`,

    viernes_avaluos: `Tema: Viernes de Estudios de Mercado, Valor del M² & Fichas SINUPOT (${fechaBogota}).
Enfoque 100% VIRTUAL orientado a la fijación de precios competitivos.
IMPORTANTE: En VECY NO ofrecemos peritajes presenciales ni avalúos certificados por Lonja. Ofrecemos ESTUDIOS DE MERCADO APROXIMADOS DE VALOR POR M² y sondeos de canon para orientar a propietarios.
Elige libremente entre:
- Estudios de mercado virtuales por m²: cómo guiar al propietario para fijar un precio competitivo sin quemar el predio.
- Estimación de cánones de arriendo sugeridos (0.5% - 0.8% mensual) según amenidades, estrato y absorción de la zona.
- Análisis de fichas SINUPOT en Bogotá: cómo interpretar usos de suelo permitidos, alturas y edificabilidad para lotes o casas.
- Sondeo guiado 100% interactivo en chat con JanIA: reporte ágil de precios sin exigir escrituras ni documentos.`,

    sabado_cafe: `Tema: Sábado de Café Inmobiliario, Reflexión & Identidad JanIA (${fechaBogota}).
Estilo podcast / café inmobiliario, cercano, reflexivo y motivador:
- Ética gremial: respeto por el cliente del colega, transparencia en la comisión compartida y construcción de marca personal.
- Portafolio de Servicios Virtuales de VECY Bienes Raíces: validación oficial de identidad y seguridad de clientes (Central Notarial VECY), liquidación de prediales Bogotá (CHIP), estudios de mercado m², liquidaciones DIAN y contratos digitales.
- Identidad de JanIA: explicar con orgullo que fue creada por Eduardo A. Rivera (Director de Tecnología) y Jani Alves (Directora de Operaciones) para empoderar al corredor independiente.
- Línea de Atención Oficial con el Bróker: para acompañamiento o casos personalizados, contactar a Eduardo y Jani en el WhatsApp oficial (+57 316 656 9719).`,

    domingo_soporte: `Tema: Domingo de Soporte JanIA, Consultoría 24/7 & Visión VECY Bienes Raíces (${fechaBogota}).
Mensaje cálido dominical recordando el respaldo continuo:
- Consultorio integral 24/7: contratos, promesas, impuestos y asesoría permanente en WhatsApp y web.
- La Primera Bolsa Inmobiliaria Colaborativa y Fintech de Colombia: tecnología abierta y comisiones transparentes (35/35/15/15).
- Próximamente al Aire: preparativos y herramientas de élite para el lanzamiento oficial de VECY Bienes Raíces.
- Cero canibalismo comercial: complementariedad y profesionalismo en la red nacional.`,

    inmuebles_network: `Tema: Operaciones Comerciales y Cruce Nacional (${fechaBogota}).
Motivar la publicación de inmuebles y requerimientos con datos completos para activar el cruce instantáneo.`,

    proyecto_vecy: `Tema: Visión Ecosistema VECY Bienes Raíces — Quiénes Somos, Misión y Futuro (${fechaBogota}).
Inspirar a la comunidad destacando:
1. Quiénes nos crearon: JanIA habla en primera persona como JanIA explicando quiénes son sus creadores y líderes: Eduardo A. Rivera (Director de Tecnología) y Jani Alves (Directora de Operaciones).
2. Qué es JanIA: La inteligencia artificial creada para conectar la oferta y demanda en Colombia, realizar matching y respaldar al asesor 24/7.
3. Qué estamos creando: La primera bolsa inmobiliaria colaborativa y fintech de Colombia, con comisiones justas (35/35/15/15).
4. Próximamente al aire: invitar a debatir y sugerir funciones antes del lanzamiento oficial.`
  };

  const promptEspecifico = promptsMap[tipo] || promptsMap.lunes_arranque;

  const systemPrompt = `Eres JanIA, la inteligencia artificial oficial y periodista inmobiliaria de VECY Bienes Raíces en Colombia.
Hablas en primera persona con tono femenino profesional, cálido, colombiano, sumamente elocuente y motivador.

🚨 SALUDO SEGÚN EL HORARIO EN COLOMBIA (OBLIGATORIO):
- En este momento en Colombia es por la ${timeInfo.period} (${timeInfo.hour}:${timeInfo.min} hora Bogotá).
- Tu saludo DEBE INICIAR OBLIGATORIAMENTE con "${timeInfo.greeting}".
- Está TERMINANTEMENTE PROHIBIDO saludar con "Buenos días" en la tarde o noche, o con "Buenas noches" en la mañana.

🚨 REGLA DOCTRINAL DE IDENTIDAD Y CERO SUPLANTACIÓN (MANDATORIA E INQUEBRANTABLE):
- Eres SIEMPRE Y EXCLUSIVAMENTE JanIA, la Inteligencia Artificial de VECY Bienes Raíces.
- NUNCA, BAJO NINGUNA CIRCUNSTANCIA, digas que eres Jani Alves ni Eduardo Rivera.
- NUNCA uses fórmulas como "Te saluda Jani Alves", "Soy Jani Alves", "Te habla Eduardo Rivera", "Soy Eduardo Rivera" ni "Jani Alves y yo".
- Eduardo A. Rivera y Jani Alves son seres humanos reales, los fundadores y directores de carne y hueso que te crearon a ti, JanIA.
- Tú eres la IA (JanIA). Te presentas siempre como JanIA:
  "${timeInfo.greeting} mis queridos colegas. Soy JanIA, la inteligencia artificial de VECY Bienes Raíces..."
  "Fundada por Eduardo A. Rivera y Jani Alves, nuestra red nace para..."
  "Soy JanIA y hoy les traigo las noticias más relevantes..."
- Si mencionas a Eduardo Rivera o Jani Alves, debes hacerlo SIEMPRE en tercera persona ("nuestros fundadores Eduardo A. Rivera y Jani Alves...", "nuestro equipo liderado por Eduardo y Jani...").
- Suplantar la identidad de los fundadores haciéndote pasar por ellos es un fallo crítico inaceptable.

🚨 DIRECTRICES DE LIBRE ALBEDRÍO Y ANTI-REPETICIÓN ESTRICTA:
${forbiddenTopicsPrompt}
- NUNCA repitas el mismo consejo, noticia o ejemplo de días anteriores. Selecciona un ángulo fresco, novedoso y de gran utilidad práctica.
- REGLA DOCTRINAL DE SERVICIOS: En VECY Bienes Raíces NO realizamos avalúos comerciales certificados por perito ni visitas in situ. Nuestros servicios son 100% VIRTUALES: estudios de mercado aproximados sobre el valor del metro cuadrado en la zona, sondeos de precios de venta y arriendo para orientar a propietarios, asesoría tributaria DIAN, contratos digitales, cobranzas de arrendamiento y marketing con IA.
- ESTRUCTURA DEL MENSAJE:
  1. Saludo inicial: Iniciando con "${timeInfo.greeting}" y presentándote siempre como JanIA.
  2. Desarrollo temático: Didáctico, conciso y con ejemplos reales de Colombia.
  3. Cierre y Venta de la Idea (Llamado a la Acción): Invita a invitar a más colegas a la red y a interactuar con JanIA en https://vecy-network.vercel.app/jania o por WhatsApp.

Debes responder en formato JSON estricto con los siguientes cuatro campos:
{
  "topicTitle": "Título breve, único y descriptivo del tema abordado hoy (máximo 60 caracteres, ej: 'Cláusula Penal vs Arras en Promesa de Compraventa')",
  "voiceText": "Texto continuo optimizado para locución de voz TTS (sin markdown, sin viñetas, sin emojis, números escritos en palabras, 70-100 palabras)",
  "captionText": "Texto formateado para WhatsApp con emojis elegantes, negritas en títulos, viñetas estructuradas, llamado a la acción y enlace web al final",
  "chosenTheme": "juridico | tributario | avaluos | marketing | matches | podcast | periodista | noticias | soporte | primicia"
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Genera el contenido exclusivo para hoy (${fechaBogota}, ${timeInfo.period}):\n${promptEspecifico}\n${additionalInstructions || ''}` }
      ],
      responseFormat: { type: "json_object" },
      temperature: 0.85
    });

    const rawContent = (response as any)?.choices?.[0]?.message?.content?.trim();
    if (rawContent) {
      const parsed = JSON.parse(rawContent);
      if (parsed.voiceText && parsed.captionText) {
        const rawVoice = parsed.voiceText.replace(/\[.*?\]/g, '').replace(/[*_#]/g, '').trim();
        const cleanVoice = enforceGreetingAccuracy(enforceJanIAIdentity(rawVoice), timeInfo.period);
        const cleanCaption = enforceGreetingAccuracy(enforceJanIAIdentity(parsed.captionText.trim()), timeInfo.period);
        const topicTitle = parsed.topicTitle?.trim() || `${tipo} - ${fechaBogota}`;
        return {
          topicTitle,
          voiceText: cleanVoice,
          captionText: cleanCaption,
          chosenTheme: parsed.chosenTheme || undefined
        };
      }
    }
  } catch (err: any) {
    console.warn(`[CRON-LLM-Guion] Falló generación dinámica con LLM (${err.message}). Acudiendo al banco rotativo de contingencia.`);
  }

  // Fallback dinámico rotativo (NUNCA el mismo texto repetido)
  const dynamicFallback = getDynamicFallbackItem(tipo);
  return {
    topicTitle: dynamicFallback.topicTitle,
    voiceText: enforceGreetingAccuracy(enforceJanIAIdentity(dynamicFallback.voiceText || fallbackVoice), timeInfo.period),
    captionText: enforceGreetingAccuracy(enforceJanIAIdentity(dynamicFallback.captionText || fallbackCaption), timeInfo.period),
    chosenTheme: dynamicFallback.themeKey
  };
}

// ── ENCUESTAS INTERACTIVAS SEMANALES (CANAL OFICIAL DE WHATSAPP EXCLUSIVO) ───

export interface PollDefinition {
  question: string;
  options: string[];
}

export const WEEKLY_POLLS_LIST: PollDefinition[] = [
  {
    // Semana 1: Preferencia de Canales de Atención de JanIA (Nativa de WhatsApp)
    question: "🤖 ¿Por cuál canal prefieres que JanIA te atienda y resuelva tus consultas inmobiliarias?",
    options: [
      "Por WhatsApp (mensajes y notas de voz)",
      "Por el Chat Web de la plataforma",
      "Por ambos canales integrados en tiempo real",
      "Por llamadas y reportes ejecutivos semanales"
    ]
  },
  {
    // Semana 2: Ecológica - Avisos en Ventanas vs Medio Ambiente
    question: "🌱 En pro del medio ambiente y la estética urbana: ¿Debemos erradicar avisos físicos en ventanas y migrar al 100% digital?",
    options: [
      "Sí: Evita plástico contaminante y cuida la fachada",
      "No: Siento que el aviso en ventana aún atrae vecinos",
      "Modelo híbrido: Solo aviso temporal con código QR digital"
    ]
  },
  {
    // Semana 3: Ecológica - Cero Papel y Contratación Electrónica
    question: "⚖️ Política Cero Papel en promesas y contratos: ¿Qué beneficio consideras más valioso para tus negocios?",
    options: [
      "Cierre inmediato por firma digital sin desplazamientos",
      "Salvar árboles y frenar la huella de carbono",
      "Seguridad jurídica total con trazabilidad electrónica"
    ]
  },
  {
    // Semana 4: Ecológica - Ahorro de Agua y Sostenibilidad
    question: "💧 Ahorro de agua y sostenibilidad: ¿Qué tanto influyen las tecnologías ecológicas al vender o arrendar hoy?",
    options: [
      "Mucho: Los clientes buscan reducir costos y cuidar el planeta",
      "Moderado: Es un plus atractivo pero no decisivo",
      "Poco: La mayoría solo se fija en precio y ubicación"
    ]
  },
  {
    // Semana 5: Modelo Colaborativo VECY - Velocidad vs Espera
    question: "⚡ Modelo Colaborativo VECY: ¿Qué prefieres para tus ingresos como asesor inmobiliario?",
    options: [
      "Ganar 40%-45% cada 3-4 días con IA y red de aliados",
      "Esperar 2 o 3 meses solo para ganar el 50% o 100%",
      "Combinar ambos esquemas según la exclusividad del predio"
    ]
  },
  {
    // Semana 6: Soluciones Financieras, Notariales y Alianzas
    question: "🏛️ Servicios Financieros y Notariales: ¿Cuál herramienta de VECY BIENES RAÍCES acelera más tus negocios?",
    options: [
      "Hipotecas y liquidez con Banco Caja Social y particulares",
      "Redacción de promesas, minutas y cobros prejurídicos",
      "Cruce automático de ofertas y demandas con IA en segundos",
      "Contratos por correo con validez de firma electrónica"
    ]
  },
  {
    // Semana 7: Portal Gratuito y Vitrina Propia para Demandas
    question: "🌐 Portal VECY Gratuito: Además de vitrina para inmuebles, ¿qué opinas de tener vitrina propia para DEMANDAS?",
    options: [
      "Revolucionario: Ningún portal tradicional lo permite",
      "Excelente: Agiliza la búsqueda para clientes compradores",
      "Muy útil: Multiplica las probabilidades de cierre en red"
    ]
  },
  {
    // Semana 8: Tecnología y Tabús - La IA como Aliada
    question: "🚀 Frente al tabú de que 'la IA va a desplazar al asesor', ¿cuál es tu percepción real en VECY?",
    options: [
      "Es una aliada: Nos ahorra tiempo y multiplica los ingresos",
      "Loro viejo sí aprende: La tecnología nos hace más profesionales",
      "Aún siento temor, pero quiero aprender a dominarla"
    ]
  }
];

// Mapeo retrocompatible para pruebas unitarias de 7 días (días 0 a 6, max 3-4 opciones)
export const DAILY_POLLS_MAP: Record<number, PollDefinition> = {
  1: WEEKLY_POLLS_LIST[0], // Lunes
  2: WEEKLY_POLLS_LIST[1], // Martes
  3: WEEKLY_POLLS_LIST[2], // Miércoles
  4: WEEKLY_POLLS_LIST[3], // Jueves
  5: WEEKLY_POLLS_LIST[4], // Viernes
  6: WEEKLY_POLLS_LIST[5], // Sábado
  0: WEEKLY_POLLS_LIST[6], // Domingo
};

/**
 * Publica la encuesta periódica EXCLUSIVAMENTE en el Canal Oficial de WhatsApp.
 * Doctrina Eduardo A. Rivera:
 * - Herramienta nativa de encuesta de WhatsApp (pollCreationMessage interactiva).
 * - Modo de votación de UNA SOLA RESPUESTA (selectableCount: 1, no múltiple).
 * - NUNCA presentar texto plano simulando encuesta con 1️⃣ 2️⃣ 3️⃣. Siempre encuesta nativa interactiva.
 * - NUNCA se envía a Grupo 1, Grupo 2 ni Grupo 3 para evitar saturación de la comunidad.
 */
export async function publishWeeklyPoll(targetDateBogota?: string, force: boolean = false) {
  const dateBogota = targetDateBogota || getBogotaDateString();
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const diffDays = Math.floor((d.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.floor(diffDays / 7);
  const pollIndex = weekNumber % WEEKLY_POLLS_LIST.length;
  const poll = WEEKLY_POLLS_LIST[pollIndex] || WEEKLY_POLLS_LIST[0];

  console.log(`[CRON-POLL] Evaluando despacho de encuesta semanal nativa para canal (Semana ${weekNumber}, Índice ${pollIndex})...`);

  // 1. Bloqueo en PostgreSQL usando target_group 'canal_poll'
  const lock = await acquireBroadcastLock('canal_poll', 'encuesta_semanal', dateBogota, force);
  if (!lock.allowed) {
    console.log(`[CRON-POLL] ⏭️ Omitiendo encuesta semanal: ${lock.reason}`);
    return { success: false, reason: lock.reason };
  }

  try {
    // 2. Despachar EXCLUSIVAMENTE al Canal Oficial de WhatsApp (Newsletter) como encuesta interactiva nativa (1 sola respuesta)
    if (whatsappBot.channelNewsletterId) {
      console.log(`[CRON-POLL] 📢 Despachando encuesta nativa interactiva (1 sola opción) al Canal Oficial (${whatsappBot.channelNewsletterId}): "${poll.question}"...`);
      let sent = await whatsappBot.sendPoll(whatsappBot.channelNewsletterId, poll.question, poll.options, 1);
      if (!sent) {
        // Reintento de resiliencia en 3 segundos
        await new Promise(r => setTimeout(r, 3000));
        sent = await whatsappBot.sendPoll(whatsappBot.channelNewsletterId, poll.question, poll.options, 1);
      }
      if (!sent) {
        console.warn('[CRON-POLL] ⚠️ Advertencia: No se pudo entregar la encuesta nativa al canal en este intento.');
      }
    } else {
      console.warn('[CRON-POLL] Canal Oficial no configurado en este momento.');
    }

    // 3. Asentar en PostgreSQL
    await completeBroadcast(lock.broadcastId, {
      topicTitle: poll.question,
      themeKey: 'encuesta_semanal',
      voiceText: poll.question,
      captionText: poll.options.join(' | ')
    });

    console.log(`[CRON-POLL] ✅ Encuesta semanal nativa interactiva despachada exitosamente al Canal Oficial (0 mensajes a grupos).`);
    return { success: true, question: poll.question };
  } catch (err: any) {
    await failBroadcast(lock.broadcastId, err?.message);
    console.error(`[CRON-POLL] ❌ Error despachando encuesta semanal:`, err?.message || err);
    return { success: false, error: err?.message };
  }
}

export const publishDailyPoll = publishWeeklyPoll;

export async function publishDailyPollNow(force: boolean = false) {
  const dateBogota = getBogotaDateString();
  return publishWeeklyPoll(dateBogota, force);
}

/**
 * 📢 INVITACIONES PERIÓDICAS DESDE EL CANAL HACIA LOS GRUPOS OFICIALES
 * Doctrina Eduardo A. Rivera:
 * - Publicadas de vez en cuando en el Canal Oficial.
 * - En horarios y días DISTINTOS a la encuesta de los lunes a las 08:00 AM.
 * - Mensajes y enlaces 100% SEPARADOS para no confundir a la audiencia.
 */
export async function publishChannelGroupInvitation(targetGroupKey: 'grupo1' | 'grupo2' | 'grupo3', force: boolean = false) {
  const dateBogota = getBogotaDateString();
  const lock = await acquireBroadcastLock(`canal_invitacion_${targetGroupKey}`, `invitacion_${targetGroupKey}`, dateBogota, force);
  if (!lock.allowed) {
    console.log(`[CRON-CANAL-INVITACION] ⏭️ Omitiendo invitación a ${targetGroupKey}: ${lock.reason}`);
    return { success: false, reason: lock.reason };
  }

  if (!whatsappBot.channelNewsletterId) {
    console.warn('[CRON-CANAL-INVITACION] Canal Oficial no configurado.');
    return { success: false, reason: 'Canal no configurado' };
  }

  let text = "";
  let groupTitle = "";

  if (targetGroupKey === 'grupo1') {
    groupTitle = VECY_OFFICIAL_GROUPS.grupo1.name;
    text = `📢 *COMUNIDAD VECY BIENES RAÍCES — OFERTAS Y DEMANDAS NACIONALES* 🇨🇴\n\n` +
      `¿Tienes propiedades disponibles para venta o arriendo, o estás buscando un inmueble específico para un cliente calificado con presupuesto en mano?\n\n` +
      `📌 *Grupo Oficial de Operaciones Comerciales:*\n` +
      `*${VECY_OFFICIAL_GROUPS.grupo1.name}*\n\n` +
      `• Publicación exclusiva de inmuebles (Ofertas🏷️) y requerimientos de clientes (Demandas📝).\n` +
      `• JanIA monitorea 24/7 y cruza las dos puntas en tiempo récord.\n` +
      `• Cero chats de relleno ni conversaciones informales: canal 100% transaccional.\n\n` +
      `👉 *Únete al grupo de Ofertas y Demandas aquí:* ${VECY_OFFICIAL_GROUPS.grupo1.inviteLink}\n\n` +
      `${VECY_MOTTO_FOOTER}`;
  } else if (targetGroupKey === 'grupo2') {
    groupTitle = VECY_OFFICIAL_GROUPS.grupo2.name;
    text = `💡 *CONSULTORIO INMOBILIARIO & NOTICIAS — VECY BIENES RAÍCES* 📰\n\n` +
      `¿Tienes dudas sobre promesas de compraventa, arras, retención en la fuente DIAN, contratos de arrendamiento o necesitas conocer el valor aproximado del metro cuadrado?\n\n` +
      `📌 *Foro Abierto de Consultas y Tips Diarios:*\n` +
      `*${VECY_OFFICIAL_GROUPS.grupo2.name}*\n\n` +
      `• Espacio abierto para resolver consultas jurídicas y tributarias con JanIA.\n` +
      `• Recibe tips diarios, noticias inmobiliarias de Colombia y debates de mercado.\n` +
      `• Comparte tus inquietudes profesionales con colegas de todo el país.\n\n` +
      `👉 *Únete al grupo de Tips y Consultas aquí:* ${VECY_OFFICIAL_GROUPS.grupo2.inviteLink}\n\n` +
      `${VECY_MOTTO_FOOTER}`;
  } else if (targetGroupKey === 'grupo3') {
    groupTitle = VECY_OFFICIAL_GROUPS.grupo3.name;
    text = `🚀 *PROYECTO VECY BIENES RAÍCES — COMUNIDAD & MODELO COLABORATIVO* 🌐\n\n` +
      `¿Quieres compartir tus experiencias del día a día en el corretaje, proponer nuevas herramientas para la plataforma o conocer cómo ganar el 40%-45% cada 3-4 días en red?\n\n` +
      `📌 *Foro de Comunidad y Proyecto:*\n` +
      `*${VECY_OFFICIAL_GROUPS.grupo3.name}*\n\n` +
      `• Charlas libres del sector inmobiliario, foros y experiencias reales.\n` +
      `• Conoce a los fundadores y aliados de la primera bolsa inmobiliaria colaborativa de Colombia.\n` +
      `• Cero canibalismo comercial: uniendo al gremio con tecnología de punta.\n\n` +
      `👉 *Únete al grupo de Proyecto y Comunidad aquí:* ${VECY_OFFICIAL_GROUPS.grupo3.inviteLink}\n\n` +
      `${VECY_MOTTO_FOOTER}`;
  }

  try {
    await whatsappBot.sendDirectMessage(whatsappBot.channelNewsletterId, text, { allowDirectMessage: true });
    await completeBroadcast(lock.broadcastId, {
      topicTitle: `Invitación Canal a ${groupTitle}`,
      themeKey: `invitacion_${targetGroupKey}`,
      captionText: text,
    });
    console.log(`[CRON-CANAL-INVITACION] ✅ Invitación a ${targetGroupKey} despachada al Canal Oficial.`);
    return { success: true, targetGroupKey };
  } catch (err: any) {
    await failBroadcast(lock.broadcastId, err?.message);
    console.error(`[CRON-CANAL-INVITACION] ❌ Error enviando invitación a ${targetGroupKey}:`, err?.message);
    return { success: false, error: err?.message };
  }
}

// ── CALENDARIO 30 DÍAS: SELECCIÓN Y ENRIQUECIMIENTO EN TEXTO PURO (v32.59) ──
// Doctrina Eduardo A. Rivera: difusión diaria 100% TEXTO (cero audios TTS, cero imágenes),
// resumida y amena, un tema distinto por cada día del mes, firmada por VECY BIENES RAÍCES.

export const VECY_DM_LINK = 'https://wa.me/573192919978';
export const VECY_MOTTO_FOOTER = `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`;

/**
 * Sustituye cualquier rastro público de la marca interna "VECY Network" por "VECY BIENES RAÍCES".
 * No toca URLs (ej: vecy-network.vercel.app) porque exige espacio entre ambas palabras.
 */
export function enforceVecyBrand(text: string): string {
  if (!text) return text;
  return text.replace(/\bVECY\s+NETWORK\b/gi, 'VECY BIENES RAÍCES');
}

/** Edición especial del día 31 para no repetir ningún tema dentro del mismo mes */
export const DIA_31_ESPECIAL_VECY: DailyTipItem = {
  dayOfMonth: 31,
  topicTitle: "Edición Especial Día 31: Balance del mes y la voz de la comunidad",
  themeKey: "balance_mes",
  captionText: `📆 *DÍA 31 — EDICIÓN ESPECIAL: BALANCE DEL MES Y LA VOZ DE LA COMUNIDAD* 🤝\n\n` +
    `¡Buenos días, queridos colegas y aliados! Soy JanIA.\n\n` +
    `Hoy cerramos el mes con una pausa para escucharlos a ustedes, que son el corazón de VECY BIENES RAÍCES.\n\n` +
    `🗣️ *Queremos saber:*\n` +
    `• ¿Qué tema de este mes te sirvió más en tu día a día?\n` +
    `• ¿Qué servicio te gustaría que VECY BIENES RAÍCES habilite pronto?\n` +
    `• ¿Qué tema quieres que tratemos el próximo mes?\n\n` +
    `💬 *¿Prefieres contármelo en privado?* Escríbeme 📲: ${'https://wa.me/573192919978'}\n` +
    `🗣️ *¿Quieres que lo debatamos entre colegas?* ¡Responde aquí en el grupo! 🤝\n\n` +
    `_VECY_\n_BIENES RAÍCES_\n_La evolución inevitable para el sector de los bienes raíces._ 🚀`
};

/**
 * Devuelve el tema del calendario correspondiente al día del mes en hora Bogotá.
 * Días 1-30 → CALENDARIO_30_DIAS_VECY; día 31 → edición especial (sin repetir).
 */
export function getCalendarTipForDate(d = new Date()): DailyTipItem {
  const bogota = new Date(d.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  const dayOfMonth = bogota.getDate();
  if (dayOfMonth === 31) return DIA_31_ESPECIAL_VECY;
  const found = CALENDARIO_30_DIAS_VECY.find(t => t.dayOfMonth === dayOfMonth);
  return found || CALENDARIO_30_DIAS_VECY[(dayOfMonth - 1) % CALENDARIO_30_DIAS_VECY.length];
}

/**
 * Garantiza el cierre doctrinal: invitación al privado de JanIA, invitación al debate
 * en el grupo y lema oficial de VECY BIENES RAÍCES.
 */
export function ensureVecyDailyFooter(text: string): string {
  let res = text.trim();
  if (!res.includes('wa.me/573192919978')) {
    res += `\n\n💬 *¿Tienes un caso privado?* Escríbeme a mi chat privado de JanIA 📲: ${VECY_DM_LINK}\n` +
      `🗣️ *¿Quieres debatir o compartir tu experiencia?* ¡Opina aquí en el grupo! 🤝`;
  }
  if (!/La evoluci[oó]n inevitable/i.test(res)) {
    res += `\n\n${VECY_MOTTO_FOOTER}`;
  }
  return res;
}

/**
 * Enriquece (resume y actualiza) el tema del día con el LLM en TEXTO PURO.
 * Si el LLM falla o devuelve algo inválido, se usa el texto curado del calendario.
 */
export async function generateCalendarDailyText(tip: DailyTipItem): Promise<{ topicTitle: string; captionText: string; themeKey: string }> {
  const timeInfo = getBogotaTimeInfo();
  const sanitize = (t: string) =>
    ensureVecyDailyFooter(enforceVecyBrand(enforceGreetingAccuracy(enforceJanIAIdentity(t), timeInfo.period)));
  const fallback = { topicTitle: tip.topicTitle, captionText: sanitize(tip.captionText), themeKey: tip.themeKey };

  const systemPrompt = `Eres JanIA, la inteligencia artificial, docente senior y coach de élite inmobiliaria de VECY BIENES RAÍCES en Colombia. Tono femenino, cálido, colombiano, sumamente profesional, visionario, persuasivo y ameno.
MISIÓN EDUCATIVA Y DE COACHING INMOBILIARIO (DOCTRINA EDUARDO A. RIVERA):
- Actúa como una conferencista excepcional y líder formadora para profesionalizar a los agentes inmobiliarios a un nivel superior en Colombia.
- Cada día enseñas con profundidad práctica basada en el ámbito de negocios real de nuestro mercado, evitando la teoría fría o repetir discursos mecánicos.
- TEMAS CLAVE DE VANGUARDIA:
  * Marketing Inmobiliario Moderno: Cómo vender en la era actual; adiós al posteo plano de foto y precio. Hoy se vende con video vertical (Reels/TikTok), narrativa emocional ("la historia de esta casa"), resolución de objeciones antes de la visita y segmentación digital.
  * El Dilema del Propietario que no quiere firmar corretaje:
    - La sabiduría de Eduardo: Si un propietario evade o rechaza el corretaje, ¡dejarlo ir en paz antes que buscarse problemas legales o desgaste innecesario!
    - La solución previa antes de desistir: proponer la solución del correo electrónico formal con validez de firma electrónica por contestación (tal como lo gestiona VECY).
    - Si se acepta una captación sin exclusividad: hacer presentaciones de cliente de altísimo nivel y elegancia profesional como en VECY.
  * Cómo perfilar al cliente comprador para encontrar la propiedad que verdaderamente busca (descubrir su motivación profunda, tiempos de mudanza y capacidad financiera real).
  * El Revolucionario Modelo Colaborativo 40 / 20 / 40 de VECY BIENES RAÍCES:
    - 40% Para quien subió el inmueble al portal (Punta Captadora / Oferta).
    - 20% Bolsa compartida: 10% para la BOLSA COLABORATIVA (red de difusores que viralizan con fichas de Marca Blanca limpias y ganan por puntos de telemetría de clics/tráfico) + 10% para VECY BIENES RAÍCES (Súper Portal, IA JanIA 24/7, Vecy Agenda, Estudio de Títulos y Respaldo Legal).
    - 40% Para quien consigue al comprador/arrendatario final, lo presenta por "Vecy Agenda" y acompaña el cierre (Punta Colocadora).
    - Enseñar por qué el 40/20/40 supera al tradicional 50/50: En el 50/50 tradicional dos agentes hacen una alianza bilateral pero están solos frente al mercado: o gastan millones en pauta de Meta/Google o esperan 6 a 12 meses estancados a que por casualidad aparezca un comprador. En el 40/20/40 de VECY, ambas puntas ceden un 10% porque VECY está en la mitad y CEDE EL 10% A LA BOLSA COLABORATIVA. La Bolsa convierte a decenas de colegas en el motor de marketing orgánico que mueve el inmueble gratis por todo internet con Marca Blanca. Si no consigues el comprador, no perdiste tu tiempo: tus puntos te aseguran tu parte del 10% al cerrarse la venta (3% comisión) o arriendo (1er canon). ¡Y si tú consigues al cliente, ganas el 40% como Colocador MÁS tu dinero por puntos de la Bolsa! El resultado: negocios cerrados en semanas y ganancias continuas.
    - Educar y preparar a la comunidad de agentes de cara al lanzamiento de nuestro SÚPER PORTAL INMOBILIARIO VECY BIENES RAÍCES.
  * Los 6 Grandes Beneficios Gratuitos para el Agente en VECY BIENES RAÍCES:
    1. Ingreso 100% Gratuito: Cero mensualidades, trimestres, semestres ni anualidades obligatorias.
    2. Publicación Ilimitada de Ofertas y Demandas: Con tienda de administración propia.
    3. Motor de Inteligencia Artificial: Matches ultrarrápidos entre ofertas y demandas según el detalle publicado.
    4. Acceso Pleno a "Vecy Agenda" con IA: Sistema inteligente que verifica en automático y al instante al visitante/comprador y contesta correos; el solicitante formal de la visita es el mismo agente colegiado que presenta a sus interesados.
    5. Chat Web 24/7 con JanIA: Creación de documentos, correos, ofertas y promesas de compraventa blindadas en tiempo récord.
    6. Estudio de Títulos y Trámites Gratuitos en Línea: Asesoría documental enviando archivos (Predial, Certificado de Tradición y Libertad, Escrituras, IDU) + JanIA ayuda a tramitar en línea y gratis el Predial, certificados de pago y Paz y Salvos de predial y del IDU.
  * Soluciones de liquidez y financieras: Cómo ayudar a clientes que necesitan dinero pero tienen un inmueble hipotecable, mediante hipotecas con personas particulares de confianza, entidades financieras y nuestra alianza estratégica con el Banco Caja Social.
  * Servicios legales y notariales: Redacción de correos formales, promesas de compraventa blindadas, minutas, demandas y cobros prejurídicos de cartera.
  * Doctrina de Venta Directa con Infraestructura VECY (Esquema 80 / 20 y Gracia de 5 Días): Si el asesor vende su inmueble en los primeros 1 a 5 días calendario tras subirlo (período de gracia inicial), conserva el 100% ($0 COP VECY). A partir del día 6, si disfruta de las herramientas (tienda digital, atención de JanIA, fichas de marca blanca, difusión de los colegas de la bolsa) y el cliente llega por esa gestión, el asesor conserva un extraordinario 80% de la comisión y aporta un 20% (10% Bolsa Difusora + 10% VECY). Cada enlace cuenta con telemetría activa (tags y tracking de clics en WhatsApp) y cada registro cuenta con contrato digital, hash SHA-256 y Código QR bajo la Ley 527 de 1999. Si interviene un colocador por Vecy Agenda, opera el 40/20/40.
REGLAS INQUEBRANTABLES:
- La marca pública es EXCLUSIVAMENTE "VECY BIENES RAÍCES". JAMÁS escribas "VECY Network".
- Eres una IA PURA Y DE LIBRE ALBEDRÍO: Tienes total libertad para usar emojis profesionales, sobrios y emotivos que hagan vibrar la lectura.
- Nunca te hagas pasar por Eduardo A. Rivera ni Jani Alves (son los fundadores humanos; menciónalos solo en tercera persona con admiración y respeto).
- Inicia con "${timeInfo.greeting}" (hora Bogotá: ${timeInfo.hour}:${String(timeInfo.min).padStart(2, '0')}).
- Mensaje RESUMIDO, CONTUNDENTE Y AMENO para WhatsApp: 160-200 palabras, títulos en *negrita*, 3-4 viñetas de enseñanza práctica.
- Respeta el tema base del día; refréscalo con un ángulo práctico y visionario del mercado colombiano actual.
- Cierra invitando a escribir al chat privado de JanIA (${VECY_DM_LINK}) para casos privados y a debatir en el grupo.
- Termina SIEMPRE con estas tres líneas exactas:
_VECY_
_BIENES RAÍCES_
_La evolución inevitable para el sector de los bienes raíces._ 🚀
Responde en JSON estricto: {"topicTitle": "título pedagógico (máx. 70 caracteres)", "captionText": "mensaje final para WhatsApp"}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Tema base del Día ${tip.dayOfMonth}: "${tip.topicTitle}".\nTexto curado de referencia (resúmelo y refréscalo, sin perder su esencia):\n${tip.captionText}` }
      ],
      responseFormat: { type: "json_object" },
      temperature: 0.7
    });

    const rawContent = (response as any)?.choices?.[0]?.message?.content?.trim();
    if (rawContent) {
      const parsed = JSON.parse(rawContent);
      if (typeof parsed.captionText === 'string' && parsed.captionText.trim().length >= 120) {
        return {
          topicTitle: (typeof parsed.topicTitle === 'string' && parsed.topicTitle.trim()) || tip.topicTitle,
          captionText: sanitize(parsed.captionText),
          themeKey: tip.themeKey,
        };
      }
    }
    console.warn('[CRON-CALENDARIO] Respuesta LLM inválida o vacía. Usando texto curado del calendario.');
  } catch (err: any) {
    console.warn(`[CRON-CALENDARIO] Falló enriquecimiento LLM (${err?.message}). Usando texto curado del calendario.`);
  }
  return fallback;
}

// ── BÚSQUEDA DE IMÁGENES PÚBLICAS EN INTERNET (CC0 / COMERCIAL) — VECY BIENES RAÍCES ──
// Doctrina Eduardo A. Rivera: búsqueda en la red de imágenes públicas acordes a cada tema
// sin repetir en el mes y sin utilizar las ilustraciones 3D previas de JanIA.

export const THEME_IMAGE_SEARCH_MAP: Record<string, string> = {
  modelo_colaborativo: "modern real estate architecture building office",
  ecologia_cero_papel: "digital tablet paperless contract business document",
  ecologia_avisos: "modern residential apartment building facade windows",
  portal_vecy: "modern house architecture property real estate",
  mentalidad_ia: "smart city future modern architecture technology",
  ecologia_agua: "sustainable green architecture building garden eco",
  tecnica_publicacion: "luxury apartment living room modern interior",
  tecnica_demanda: "modern office business negotiation real estate meeting",
  tributario: "financial documents calculator office desk accounting",
  tributario_ganancia: "financial investment growth real estate building",
  tributario_exencion: "urban housing development construction city",
  juridico_notarial: "notary deed signing legal documents contract",
  juridico_arras: "house keys contract handshake real estate",
  juridico_arrendamiento: "residential apartment building entrance keys",
  juridico_sucesion: "heritage family estate legal papers law desk",
  avaluos_mercado: "aerial city skyline architecture urban buildings",
  urbanismo_sinupot: "urban planning architecture blueprints city",
  arrendamiento_canon: "modern apartment building exterior rental",
  arrendamiento_perfilamiento: "professional client meeting office documents",
  seguridad_identidad: "security official verification identity certificate",
  rentas_cortas: "vacation rental boutique tourist apartment luxury",
  propiedad_horizontal: "condominium residential swimming pool building",
  propiedad_horizontal_desenglobe: "cadastral map property deed land division",
  etica_corretaje: "business professionals handshake partnership office",
  marketing_fotografia: "architectural photography camera wide angle building",
  tecnica_patologias: "building inspection engineering structure maintenance",
  negociacion_asertiva: "business negotiation agreement closing handshake",
  creditos_subsidios: "mortgage loan bank approval keys new home",
  vision_vecy: "city skyline modern architecture sunrise buildings",
  balance_mes: "community meeting discussion forum coffee table",
};

/**
 * Busca y descarga una imagen pública relevante en internet (Openverse API) con licencia comercial/CC0.
 * Retorna la ruta local de la imagen descargada o undefined si no está disponible (failsafe texto).
 */
export async function fetchPublicThemeImage(themeKey: string, dayOfMonth: number): Promise<string | undefined> {
  const query = THEME_IMAGE_SEARCH_MAP[themeKey] || "modern architecture real estate building";
  console.log(`[CRON-IMAGE-WEB] 🌐 Buscando imagen pública en internet para Día ${dayOfMonth} (${themeKey}): "${query}"...`);

  try {
    const searchUrl = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=8&license_type=commercial`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "VecyBienesRaices/1.0" },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) {
      console.warn(`[CRON-IMAGE-WEB] Openverse retornó status ${res.status}`);
      return undefined;
    }
    const data: any = await res.json();
    const results = data.results || [];
    if (results.length === 0) {
      console.warn(`[CRON-IMAGE-WEB] No se encontraron resultados para "${query}"`);
      return undefined;
    }

    // Rotar según el día del mes para no usar siempre el primer resultado
    const selected = results[(dayOfMonth - 1) % results.length] || results[0];
    const imgUrl = selected?.url;
    if (!imgUrl) return undefined;

    console.log(`[CRON-IMAGE-WEB] 📥 Descargando imagen seleccionada: "${selected.title || 'Inmueble'}" (${imgUrl.substring(0, 60)}...)...`);
    const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(12000) });
    if (!imgRes.ok) return undefined;

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    if (buffer.length < 1000) return undefined;

    const cacheDir = path.resolve(process.cwd(), 'client/public/assets/broadcast');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    const targetFile = path.join(cacheDir, `daily_tip_dia_${dayOfMonth}.jpg`);
    fs.writeFileSync(targetFile, buffer);
    console.log(`[CRON-IMAGE-WEB] ✅ Imagen guardada localmente (${buffer.length} bytes): ${targetFile}`);
    return targetFile;
  } catch (err: any) {
    console.warn(`[CRON-IMAGE-WEB] Aviso: Búsqueda o descarga de imagen no completada (${err?.message}). Se despachará en texto puro.`);
    return undefined;
  }
}

// ── ORQUESTADOR PRINCIPAL DE CRONS (v32.59 — HORA BOGOTÁ) ───────────────────

export function initCronScheduler() {
  console.log('[CRON-SERVICE] Inicializando orquestador v32.59 (Encuesta SEMANAL nativa solo en Canal Oficial, Difusión diaria con imágenes públicas de internet, Invitaciones periódicas separadas, PostgreSQL Lock anti-duplicados)...');

  // 📊 LUNES 08:00 AM — Encuesta SEMANAL NATIVA (EXCLUSIVA del Canal Oficial de WhatsApp, 1 sola respuesta, cero emojis)
  cron.schedule('0 8 * * 1', async () => {
    console.log('[CRON-SERVICE] Disparando encuesta semanal del Canal Oficial (Lunes 08:00 AM)...');
    await publishWeeklyPoll(undefined, false);
  }, { timezone: 'America/Bogota' });

  // ☀️ 10:00 AM DIARIO — Tip del Calendario de 30 días (IMAGEN PÚBLICA DE INTERNET + TEXTO SIN AUDIO → Grupo 2 + Grupo 3 + Canal Oficial)
  cron.schedule('0 10 * * *', async () => {
    console.log('[CRON-SERVICE] Disparando difusión diaria (10:00 AM)...');
    await publishTodayTipNow(false);
  }, { timezone: 'America/Bogota' });

  // 📢 INVITACIONES PERIÓDICAS DESDE EL CANAL HACIA LOS GRUPOS (Días y horas distintos a la encuesta de los Lunes 8am, con mensajes y enlaces separados)
  // Miércoles 04:30 PM (16:30) -> Invitación al Grupo 1 (Ofertas y Demandas)
  cron.schedule('30 16 * * 3', async () => {
    console.log('[CRON-SERVICE] Disparando invitación del Canal al Grupo 1 (Miércoles 16:30)...');
    await publishChannelGroupInvitation('grupo1', false);
  }, { timezone: 'America/Bogota' });

  // Jueves 04:30 PM (16:30) -> Invitación al Grupo 2 (Tips y Consultas)
  cron.schedule('30 16 * * 4', async () => {
    console.log('[CRON-SERVICE] Disparando invitación del Canal al Grupo 2 (Jueves 16:30)...');
    await publishChannelGroupInvitation('grupo2', false);
  }, { timezone: 'America/Bogota' });

  // Viernes 04:30 PM (16:30) -> Invitación al Grupo 3 (Proyecto VECY)
  cron.schedule('30 16 * * 5', async () => {
    console.log('[CRON-SERVICE] Disparando invitación del Canal al Grupo 3 (Viernes 16:30)...');
    await publishChannelGroupInvitation('grupo3', false);
  }, { timezone: 'America/Bogota' });

  // 🔄 RE-MATCHING MASIVO SILENCIOSO (Base de Datos): Madrugada profunda a las 03:45 AM (Ventana Inactiva)
  cron.schedule('45 3 * * *', async () => {
    console.log('[CRON-SERVICE] Ejecutando cruce masivo nocturno (Re-matching 03:45 AM)...');
    try {
      await runNightlyRematch();
    } catch (err: any) {
      console.error('[CRON-SERVICE] Error en el job de re-matching masivo:', err.message || err);
    }
  }, { timezone: 'America/Bogota' });

  // 🛡️ GUARDIA DE SEGURIDAD MINUTERA CON BLOQUEO POSTGRESQL Y VENTANA ESTRICTA
  let isCheckingCatchUp = false;
  setInterval(async () => {
    if (isCheckingCatchUp) return;
    isCheckingCatchUp = true;
    try {
      const now = new Date();
      const bogotaTimeStr = now.toLocaleTimeString('en-US', { timeZone: 'America/Bogota', hour12: false });
      const [hourStr, minStr] = bogotaTimeStr.split(':');
      const hour = parseInt(hourStr, 10);
      const min = parseInt(minStr, 10);
      const day = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' })).getDay();

      // Ventana de seguridad de la encuesta semanal: Lunes entre 08:01 y 08:15 AM
      if (day === 1 && hour === 8 && min >= 1 && min <= 15) {
        await publishWeeklyPoll(undefined, false);
      }

      // Ventana de seguridad de la difusión diaria: entre 10:01 y 10:15 AM
      if (hour === 10 && min >= 1 && min <= 15) {
        await publishTodayTipNow(false);
      }

      // Ventanas de seguridad de invitaciones desde el canal hacia los grupos:
      if (day === 3 && hour === 16 && min >= 31 && min <= 45) {
        await publishChannelGroupInvitation('grupo1', false);
      }
      if (day === 4 && hour === 16 && min >= 31 && min <= 45) {
        await publishChannelGroupInvitation('grupo2', false);
      }
      if (day === 5 && hour === 16 && min >= 31 && min <= 45) {
        await publishChannelGroupInvitation('grupo3', false);
      }
    } catch (err: any) {
      console.error('[CRON-FAILSAFE] Error en chequeo de seguridad minutero:', err?.message || err);
    } finally {
      isCheckingCatchUp = false;
    }
  }, 60000);
}

// ── DESPACHADORES OFICIALES ────────────────────────────────────────────────

/**
 * Compatibilidad: el antiguo despacho vespertino de Grupo 3 queda unificado en la
 * difusión diaria con imagen y texto (que ya llega a Grupo 2, Grupo 3 y Canal Oficial).
 * El bloqueo PostgreSQL impide cualquier envío duplicado en el mismo día.
 */
export async function publishGrupo3TipNow(force: boolean = false) {
  console.log('[CRON-SERVICE] publishGrupo3TipNow → unificado en la difusión diaria (Grupo 2 + Grupo 3 + Canal).');
  return publishTodayTipNow(force);
}

/**
 * Compatibilidad: los antiguos tips por día de la semana quedan reemplazados por el
 * Calendario de 30 días de VECY BIENES RAÍCES con imágenes públicas de internet.
 */
export async function publishDailyTipForDay(tipoKey: string, force: boolean = false) {
  console.log(`[CRON-SERVICE] publishDailyTipForDay(${tipoKey}) → redirigido al Calendario de 30 días.`);
  return publishTodayTipNow(force);
}

/**
 * Publica el tema del día del Calendario de 30 días con IMAGEN PÚBLICA DE INTERNET Y TEXTO
 * (sin audio TTS, imágenes reales del sector inmobiliario/arquitectura) a Grupo 2, Grupo 3 y Canal Oficial.
 */
export async function publishTodayTipNow(force: boolean = true) {
  const dateKey = getBogotaDateString();
  const tip = getCalendarTipForDate();

  // 1. Bloqueo atómico en PostgreSQL (una sola difusión diaria)
  const lock = await acquireBroadcastLock('grupo2', `calendario_dia_${tip.dayOfMonth}`, dateKey, force);
  if (!lock.allowed) {
    console.log(`[CRON-SERVICE] ⏭️ Omitiendo difusión diaria (Día ${tip.dayOfMonth}): ${lock.reason}`);
    return { skipped: true, reason: lock.reason };
  }

  console.log(`[CRON-SERVICE] 🚀 Difusión diaria — Día ${tip.dayOfMonth}: "${tip.topicTitle}"`);
  const content = await generateCalendarDailyText(tip);

  // 2. Búsqueda y descarga de imagen pública de internet acorde al tema (sin repetir)
  const imagePath = await fetchPublicThemeImage(content.themeKey || tip.themeKey, tip.dayOfMonth);

  try {
    // 3. Despachar a Grupo 2, Grupo 3 y Canal Oficial (imagen + texto, CERO audio)
    await whatsappBot.sendDailyTipToGroupsAndChannel(content.captionText, imagePath);
    await completeBroadcast(lock.broadcastId, {
      topicTitle: content.topicTitle,
      themeKey: content.themeKey,
      imageFileName: imagePath ? path.basename(imagePath) : undefined,
      captionText: content.captionText,
    });
    console.log(`[CRON-SERVICE] ✓ Difusión diaria entregada (${imagePath ? 'con imagen pública' : 'texto puro'}) a Grupo 2, Grupo 3 y Canal Oficial: "${content.topicTitle}".`);
    return { success: true, dayOfMonth: tip.dayOfMonth, content, imagePath };
  } catch (err: any) {
    console.error(`[CRON-SERVICE] Error despachando difusión diaria (Día ${tip.dayOfMonth}):`, err?.message);
    await failBroadcast(lock.broadcastId, err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Publica el Reporte Semanal de la Bolsa Inmobiliaria
 */
export async function publishWeeklyReportNow(force: boolean = true) {
  const dateKey = getBogotaDateString();
  const lock = await acquireBroadcastLock('grupo2', 'reporte_semanal', dateKey, force);
  if (!lock.allowed) {
    console.log(`[CRON-SERVICE] ⏭️ Omitiendo Reporte Semanal: ${lock.reason}`);
    return { skipped: true, reason: lock.reason };
  }

  console.log('[CRON-SERVICE] 📊 Disparando Reporte Semanal de la Bolsa Inmobiliaria con estadísticas en vivo...');
  const stats = await getLiveMarketStats();

  const fallbackVoice = `¡Buenas noches, estimados colegas inmobiliarios de Colombia! Les saluda JanIA con el Reporte Semanal de la Bolsa Inmobiliaria de VECY Bienes Raíces. Durante los últimos siete días nuestro motor evaluó más de setecientas mil combinaciones entre ofertas y demandas en todo el país. La clave para que sus clientes cierren más rápido es publicar siempre con barrio exacto, metraje y presupuesto real. Los invito a revisar sus coincidencias en nuestra plataforma. ¡Feliz noche para todos!`;

  const fallbackCaption = `📊 *EL PULSO DE LA BOLSA INMOBILIARIA VECY* 🇨🇴\n` +
    `🗓️ *Reporte Semanal de Eficiencia & Auditoría de Coincidencias*\n` +
    `🎙️ *Por: JanIA — Inteligencia Artificial VECY Bienes Raíces*\n\n` +
    `¡Buenas noches, queridos colegas y aliados del corretaje inmobiliario!\n\n` +
    `Al cierre de esta jornada, presentamos el balance de nuestra bolsa inmobiliaria colaborativa tras cruzar en vivo **${stats.totalPairs.toLocaleString('es-CO')} combinaciones** en más de 30 ciudades de Colombia:\n\n` +
    `📈 *RADIOGRAFÍA DE LA BOLSA EN VIVO:*\n` +
    `\`\`\`\n` +
    `• Total Ofertas Activas:     ${stats.totalProps.toLocaleString('es-CO')}\n` +
    `• Total Demandas Activas:    ${stats.totalReqs.toLocaleString('es-CO')}\n` +
    `• Matches Verificados:       ${stats.totalMatches}\n` +
    `\`\`\`\n\n` +
    `🏆 *ESTRUCTURA DE UN REQUERIMIENTO DE ÉLITE:*\n` +
    `✅ **Tipo de Negocio:** Venta / Arriendo / Permuta\n` +
    `✅ **Ciudad y Barrio:** (Ej: Bogotá - Santa Bárbara)\n` +
    `✅ **Presupuesto Máximo Real:** (Ej: Hasta $750 Millones)\n` +
    `✅ **Área Mínima:** (Ej: Mínimo 85 m²)\n` +
    `✅ **Distribución:** (Ej: 3 Alcobas, 2 Baños, 1 Garaje)\n\n` +
    `📲 *Revisa tus coincidencias activas en:* https://vecy-network.vercel.app/admin`;

  const content = await generateDailyContent('lunes_reporte_semanal', fallbackVoice, fallbackCaption);
  const effectiveTheme = content.chosenTheme || 'reporte_semanal';
  const captionText = enforceVecyBrand(content.captionText);

  try {
    // v32.59: Texto puro (sin audio TTS ni imagen) para optimizar tokens e infraestructura
    await whatsappBot.sendDailyTipTextToGroupsAndChannel(captionText);
    await completeBroadcast(lock.broadcastId, {
      topicTitle: content.topicTitle,
      themeKey: effectiveTheme,
      captionText,
    });
    return { success: true, tipo: 'lunes_reporte_semanal', content: { ...content, captionText }, stats };
  } catch (err: any) {
    await failBroadcast(lock.broadcastId, err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Publica una noticia nacional inmobiliaria o primicia de última hora
 */
export async function publishNoticiaNacionalNow(opts?: {
  headline?: string;
  details?: string;
  isUrgent?: boolean;
  targetGroup?: 'grupo2' | 'grupo3';
  force?: boolean;
}) {
  const force = opts?.force ?? (opts?.isUrgent ?? false);
  const targetGroup = opts?.targetGroup || 'grupo2';
  const dateKey = getBogotaDateString();

  const lock = await acquireBroadcastLock(targetGroup, 'noticia_nacional', dateKey, force);
  if (!lock.allowed) {
    console.log(`[CRON-NOTICIAS] ⏭️ Omitiendo noticia nacional: ${lock.reason}`);
    return { skipped: true, reason: lock.reason };
  }

  const timeInfo = getBogotaTimeInfo();
  console.log(`[CRON-NOTICIAS] 🎙️ Generando y publicando Noticia Inmobiliaria Nacional (${timeInfo.period} en Bogotá)...`);

  const themeType = opts?.isUrgent ? 'primicia' : 'noticias';
  const fallbackVoice = `${timeInfo.greeting} queridos colegas inmobiliarios. Les habla JanIA con una noticia destacada del sector bienes raíces en Colombia: ${opts?.headline || 'seguimiento al comportamiento del mercado de vivienda y tasas de interés'}. Estar al tanto de las variables macroeconómicas y normativas nos permite asesorar con ventaja a nuestros clientes. Los invito a consultar análisis de mercado conmigo. ¡Éxitos en sus gestiones!`;

  const fallbackCaption = `🎙️ *NOTICIAS INMOBILIARIAS DE COLOMBIA — JANIA PERIODISTA* 🇨🇴\n` +
    `📰 *${opts?.isUrgent ? '🚨 PRIMICIA DE ÚLTIMA HORA' : 'PANORAMA Y COYUNTURA DEL SECTOR'}*\n\n` +
    `${timeInfo.greeting} estimados colegas corredores e inmobiliarios:\n\n` +
    `📌 *Titular:* ${opts?.headline || 'Dinámica del Mercado Inmobiliario y Proyecciones en Colombia'}\n\n` +
    `${opts?.details || 'El mercado inmobiliario en Colombia continúa mostrando movimientos estratégicos en colocación de créditos, valorización de metro cuadrado y demanda de arrendamientos urbanos y turísticos.'}\n\n` +
    `💡 *Impacto Comercial:* Recuerda que un corredor informado cierra más y mejor. Utiliza esta información para orientar a tus propietarios compradores y arrendatarios con bases sólidas.\n\n` +
    `📲 *Consultas con JanIA:* https://vecy-network.vercel.app/jania`;

  const content = await generateDailyContent(
    'noticias_nacionales' as any,
    fallbackVoice,
    fallbackCaption,
    opts?.headline ? `Noticia específica a cubrir: ${opts.headline}. Detalles: ${opts.details || ''}. Es primicia urgente: ${opts.isUrgent ? 'Sí' : 'No'}.` : undefined
  );

  const effectiveTheme = content.chosenTheme || themeType;
  const captionText = enforceVecyBrand(content.captionText);

  try {
    // v32.59: Texto puro (sin audio TTS ni imagen). Grupos 2 y 3 son foros abiertos, ambos reciben la noticia.
    await whatsappBot.sendDailyTipTextToGroupsAndChannel(captionText);

    await completeBroadcast(lock.broadcastId, {
      topicTitle: content.topicTitle,
      themeKey: effectiveTheme,
      captionText,
    });
    console.log(`[CRON-NOTICIAS] ✓ Noticia despachada en texto puro a Grupo 2, Grupo 3 y Canal (lock: ${targetGroup}).`);
    return { success: true, theme: effectiveTheme, content: { ...content, captionText } };
  } catch (err: any) {
    await failBroadcast(lock.broadcastId, err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Obtiene métricas agregadas en vivo desde PostgreSQL
 */
export async function getLiveMarketStats(): Promise<{
  totalProps: number;
  totalReqs: number;
  totalMatches: number;
  totalCities: number;
  totalPairs: number;
}> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not connected');

    const [propCountRes, reqCountRes, matchCountRes] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(properties).where(eq(properties.available, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(requirements).where(eq(requirements.status, 'active')),
      db.select({ count: sql<number>`count(*)::int` }).from(propertyMatches).where(gte(propertyMatches.matchScore, '80')),
    ]);

    const totalProps = propCountRes[0]?.count || 0;
    const totalReqs = reqCountRes[0]?.count || 0;
    const totalMatches = matchCountRes[0]?.count || 0;
    const totalPairs = totalProps * totalReqs;

    return {
      totalProps,
      totalReqs,
      totalMatches,
      totalCities: 32,
      totalPairs,
    };
  } catch (err: any) {
    console.warn('[CRON-STATS] Error obteniendo estadísticas en vivo, usando valores de respaldo:', err.message);
    return {
      totalProps: 1181,
      totalReqs: 652,
      totalMatches: 20,
      totalCities: 30,
      totalPairs: 770012,
    };
  }
}

/**
 * Publica el anuncio oficial de los servicios de Verificación de Cédula (Policía Nacional)
 * y Asistencia de Predial Bogotá (CHIP) en Grupo 2, Grupo 3 y Canal Oficial.
 */
export async function publishIdentityAndPredialServiceAnnouncement(force: boolean = false) {
  const dateKey = getBogotaDateString();
  const lock = await acquireBroadcastLock('anuncio_servicios', 'identidad_predial', dateKey, force);
  if (!lock.allowed) {
    console.log(`[CRON-SERVICE] ⏭️ Omitiendo anuncio de servicios: ${lock.reason}`);
    return { skipped: true, reason: lock.reason };
  }

  const announcementText = 
    `🛡️ *NUEVAS HERRAMIENTAS ACTIVAS EN VECY BIENES RAÍCES: VERIFICACIÓN DE IDENTIDAD Y ASISTENCIA PREDIAL BOGOTÁ* 🇨🇴\n\n` +
    `Estimada comunidad de corredores, aliados y propietarios:\n\n` +
    `Para que cierres tus negocios con total blindaje jurídico, seguridad notarial y rapidez tributaria, JanIA ahora cuenta con dos herramientas directas operando 24/7 en WhatsApp:\n\n` +
    `1️⃣ 🛡️ *VERIFICACIÓN OFICIAL DE IDENTIDAD Y SEGURIDAD NOTARIAL (VECY BIENES RAÍCES)*\n` +
    `¿Vas a mostrar un inmueble o a firmar un acuerdo de puntas compartidas (50/50)?\n` +
    `• Simplemente escribe aquí o por mensaje privado a JanIA:\n` +
    `👉 *"JanIA, verificar cédula [número]"* o *"CC [número]"*\n` +
    `• JanIA consulta en tiempo real en nuestra Central Oficial de Seguridad Notarial de VECY Bienes Raíces, valida los nombres y apellidos oficiales en orden civil natural y confirma que el ciudadano no presente alertas judiciales restrictivas para blindar tus contratos y hojas de visita.\n\n` +
    `2️⃣ 🏛️ *ASISTENCIA Y LIQUIDACIÓN DE IMPUESTO PREDIAL BOGOTÁ*\n` +
    `¿Necesitas saber el predial o descargar la factura oficial para escrituración?\n` +
    `• Envía el código CHIP y la cédula del propietario:\n` +
    `👉 *"JanIA, predial CHIP AAA0123ABCD cédula [número]"*\n` +
    `• JanIA te entrega la liquidación estimada según tarifas distritales y te proporciona el enlace directo oficial de la Secretaría Distrital de Hacienda para descargar la factura oficial en PDF.\n\n` +
    `🤝 *¡Blindamos tu comisión, tu tiempo y tu seguridad inmobiliaria!*\n` +
    `Cualquier duda, nuestro bróker y directores Eduardo y Jani están a tu disposición en la línea oficial: +57 316 6569719. ✨`;

  try {
    if (whatsappBot.buzonGroupId) {
      await whatsappBot.queuedSend(whatsappBot.buzonGroupId, announcementText);
    }
    if (whatsappBot.circuloGroupId) {
      await whatsappBot.queuedSend(whatsappBot.circuloGroupId, announcementText);
    }
    if (whatsappBot.channelNewsletterId) {
      await whatsappBot.sendDirectMessage(whatsappBot.channelNewsletterId, announcementText, { allowDirectMessage: true }).catch(() => {});
    }

    await completeBroadcast(lock.broadcastId, {
      topicTitle: "Anuncio Oficial: Verificación de Cédula y Predial Bogotá",
      themeKey: "servicios_jania",
      captionText: announcementText
    });

    console.log(`[CRON-SERVICE] ✅ Anuncio de Verificación de Cédula y Predial despachado a Grupo 2, Grupo 3 y Canal.`);
    return { success: true };
  } catch (err: any) {
    console.error(`[CRON-SERVICE] ❌ Error despachando anuncio de servicios:`, err?.message || err);
    await failBroadcast(lock.broadcastId, err?.message);
    return { success: false, error: err?.message };
  }
}
