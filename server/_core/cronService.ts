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
 * Servicio Cron de JanIA v3.5 (IA Pura Dinámica & Protocolo Anti-Asfixia)
 * Control estricto de máximo 2 publicaciones diarias, >=5h de intervalo,
 * rotación de 9 ilustraciones 3D sin repetición, y blindaje de identidad JanIA.
 */

export interface CronPersistenceState {
  date: string; // "YYYY-MM-DD" en hora Bogotá
  dailyCount: number; // Cantidad de publicaciones despachadas hoy (máx 2)
  lastRunTimestamp: number; // ms timestamp del último despacho
  lastTargetGroup?: 'grupo2' | 'grupo3';
  runs: Record<string, number>; // Clave de ejecución -> timestamp
  recentImages: string[]; // Nombres de archivo de las últimas 3 imágenes usadas
}

const CRON_STATE_PATH = path.resolve(process.cwd(), '.cron_daily_runs.json');

export function getBogotaDateString(d = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

export function loadCronState(): CronPersistenceState {
  const today = getBogotaDateString();
  try {
    if (fs.existsSync(CRON_STATE_PATH)) {
      const raw = fs.readFileSync(CRON_STATE_PATH, 'utf-8');
      const state: CronPersistenceState = JSON.parse(raw);
      if (state.date === today) {
        if (!state.runs) state.runs = {};
        if (!Array.isArray(state.recentImages)) state.recentImages = [];
        return state;
      } else {
        // Nuevo día: resetear contadores diarios pero preservar recentImages para rotación
        const newState: CronPersistenceState = {
          date: today,
          dailyCount: 0,
          lastRunTimestamp: state.lastRunTimestamp || 0,
          runs: {},
          recentImages: Array.isArray(state.recentImages) ? state.recentImages : []
        };
        saveCronState(newState);
        return newState;
      }
    }
  } catch (err: any) {
    console.warn('[CRON-PERSISTENCE] Error leyendo estado cron, inicializando:', err?.message);
  }

  const defaultState: CronPersistenceState = {
    date: today,
    dailyCount: 0,
    lastRunTimestamp: 0,
    runs: {},
    recentImages: []
  };
  saveCronState(defaultState);
  return defaultState;
}

export function saveCronState(state: CronPersistenceState) {
  try {
    fs.writeFileSync(CRON_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err: any) {
    console.error('[CRON-PERSISTENCE] Error guardando estado cron:', err?.message);
  }
}

const MIN_HOURS_BETWEEN_PUBLICATIONS = 5;
const MAX_DAILY_PUBLICATIONS = 2;

export function canPublishNow(
  targetGroup: 'grupo2' | 'grupo3',
  runKey: string,
  force: boolean = false
): { allowed: boolean; reason?: string } {
  if (force) return { allowed: true };

  const state = loadCronState();

  // 1. Verificar si este job específico ya se ejecutó hoy
  if (state.runs[runKey]) {
    return { allowed: false, reason: `Job ya ejecutado hoy (${runKey})` };
  }

  // 2. Límite diario estricto (máximo 2 publicaciones al día)
  if (state.dailyCount >= MAX_DAILY_PUBLICATIONS) {
    return { allowed: false, reason: `Límite diario alcanzado (${state.dailyCount}/${MAX_DAILY_PUBLICATIONS} publicaciones hoy)` };
  }

  // 3. Separación horaria mínima (5 horas)
  if (state.lastRunTimestamp > 0) {
    const elapsedMs = Date.now() - state.lastRunTimestamp;
    const minIntervalMs = MIN_HOURS_BETWEEN_PUBLICATIONS * 3600 * 1000;
    if (elapsedMs < minIntervalMs) {
      const elapsedHours = (elapsedMs / (3600 * 1000)).toFixed(1);
      return { allowed: false, reason: `Intervalo insuficiente (${elapsedHours}h transcurridas, mínimo ${MIN_HOURS_BETWEEN_PUBLICATIONS}h)` };
    }
  }

  // 4. Prohibición de repetir en el mismo grupo el mismo día
  if (state.lastTargetGroup === targetGroup) {
    return { allowed: false, reason: `El ${targetGroup} ya recibió una publicación hoy. Máximo 1 por grupo al día.` };
  }

  return { allowed: true };
}

export function recordSuccessfulPublication(
  targetGroup: 'grupo2' | 'grupo3',
  runKey: string,
  chosenImageFileName?: string
) {
  const state = loadCronState();
  state.dailyCount = (state.dailyCount || 0) + 1;
  state.lastRunTimestamp = Date.now();
  state.lastTargetGroup = targetGroup;
  state.runs[runKey] = Date.now();

  if (chosenImageFileName) {
    const baseName = path.basename(chosenImageFileName);
    state.recentImages = (state.recentImages || []).filter(img => img !== baseName);
    state.recentImages.push(baseName);
    if (state.recentImages.length > 3) {
      state.recentImages = state.recentImages.slice(-3);
    }
  }

  saveCronState(state);
  console.log(`[CRON-PERSISTENCE] ✓ Publicación registrada (${state.dailyCount}/${MAX_DAILY_PUBLICATIONS} hoy). Últimas imágenes: [${state.recentImages.join(', ')}]`);
}

export function markRunExecuted(key: string): boolean {
  const state = loadCronState();
  if (state.runs[key]) return false;
  state.runs[key] = Date.now();
  saveCronState(state);
  return true;
}

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

/**
 * Failsafe para asegurar que el saludo concuerde exactamente con el momento del día en Colombia
 */
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

// Catálogo completo de imágenes temáticas 3D disponibles
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

/**
 * Obtiene la ilustración o video temático rotando entre los disponibles y EXCLUYENDO
 * estrictamente las últimas 3 utilizadas en publicaciones recientes.
 * Si existe un archivo de video (.mp4/.mov) o imagen para primicias, lo prioriza.
 */
export function getThemedImagePath(tipo: string): { fullPath: string | undefined; fileName: string | undefined } {
  const state = loadCronState();
  const recent = state.recentImages || [];

  const possibleDirs = [
    path.resolve(process.cwd(), 'client/public/assets/jania'),
    path.resolve(process.cwd(), 'dist/assets/jania'),
    path.resolve(__dirname, '../../client/public/assets/jania'),
  ];

  const preferences = THEME_IMAGE_PREFERENCES[tipo] || [];

  // 1. Revisar si hay un video (.mp4/.mov) o primicia especial cargado en disco
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

  // 2. Filtrar el pool disponible excluyendo las últimas 3 usadas
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

interface DailyTipContent {
  voiceText: string;
  captionText: string;
}

// ── CONFIGURACIÓN MAESTRA DE TIPS DIARIOS (TEMA, VOZ Y CAPTION DE RESPALDO) ──
export const DAILY_TIPS_CONFIG: Record<string, { theme: string; voice: string; caption: string }> = {
  lunes_arranque: {
    theme: 'noticias',
    voice: `¡Buenos días a todos mis queridos colegas! Soy JanIA con las Noticias Inmobiliarias Nacionales y la apertura de mercado de esta semana. Iniciamos con un panorama clave para sus cierres: el seguimiento a las tasas de interés de colocación hipotecaria en Colombia, los cupos del programa Mi Casa Ya y el tope legal de incremento de cánones de arrendamiento fijado por el IPC bajo la Ley 820 de 2003. Mantenerse informados con cifras reales de metro cuadrado y coyuntura económica es lo que marca la diferencia ante sus clientes propietarios y compradores. Los invito a consultar cualquier inquietud de mercado conmigo y a invitar a más colegas a sumarse a VECY Network. ¡Que tengamos una semana llena de negocios y cierres extraordinarios!`,
    caption: `🎙️ *NOTICIAS INMOBILIARIAS DE COLOMBIA & APERTURA DE MERCADO — VECY NETWORK* 🇨🇴\n` +
      `📰 *Por: JanIA Periodista — Inteligencia Artificial Inmobiliaria*\n\n` +
      `¡Buenos días a todos los aliados, agentes e inmobiliarias de Colombia!\n\n` +
      `Arrancamos la semana con las noticias y variables de coyuntura más relevantes del sector para asesorar con autoridad a propietarios e inversionistas:\n\n` +
      `🏦 *Tasas Hipotecarias y Crédito de Vivienda:* Monitoreo a las decisiones de la Junta Directiva del Banco de la República y la oferta crediticia de la banca nacional.\n` +
      `📋 *Arrendamientos & IPC (Ley 820 de 2003):* Control estricto al tope de incremento en cánones y auge de vivienda turística con Registro Nacional de Turismo (RNT).\n` +
      `📊 *Demanda & Valor del M²:* Comportamiento de precios en Bogotá, Medellín, Cali, Barranquilla y Sabana Norte.\n` +
      `🏗️ *Cifras del Sector Constructor (CAMACOL):* Dinámica de lanzamientos, subsidios concurrentes y reactivación de iniciaciones de obra.\n` +
      `⚖️ *Seguridad Notarial y SNR:* Ventanilla Única de Registro (VUR) y escrituración digital sin fraudes.\n\n` +
      `💡 *Asesora con rigor técnico:* Si necesitas un estudio de mercado ágil del valor del metro cuadrado o sondeo de cánones sugeridos, pregúntame en cualquier momento.\n\n` +
      `📲 *Consultorio Inmobiliario JanIA:* https://vecy-network.vercel.app/jania\n` +
      `#VecyNetwork #NoticiasInmobiliarias #JanIAPeriodista #ColombiaRealEstate`
  },
  martes_juridico: {
    theme: 'juridico',
    voice: `Hola, queridos colegas. Soy JanIA con su tip jurídico del día. ¿Sabían que un simple correo electrónico con la hoja de presentación del cliente o el acuerdo de puntas compartidas tiene plena validez probatoria bajo la Ley 527 de 1999? Nunca muestren un inmueble sin dejar registro escrito. Los invito a formar parte activa de VECY Network, a invitar a más colegas y a consultar cualquier duda jurídica o revisar minutas en PDF directamente conmigo. ¡Juntos cerramos más blindados!`,
    caption: `⚖️ *MARTES JURÍDICO & BLINDAJE NOTARIAL — VECY NETWORK* 🏛️\n\n` +
      `¡Hola, queridos colegas corredores e inmobiliarios!\n\n` +
      `📌 *Tip Jurídico del Día:* Validez de Acuerdos Comerciales y Registro Escrito.\n` +
      `Bajo la *Ley 527 de 1999*, los mensajes de datos, correos electrónicos y hojas de visita tienen plena validez probatoria. Nunca muestres un predio sin pactar previamente las condiciones comerciales.\n\n` +
      `💡 *¿Tienes dudas contractuales?*\n` +
      `Puedes enviarme tus minutas, promesas de compraventa o consultas de arrendamiento (texto, voz o PDF) y las analizamos al instante.\n\n` +
      `🤝 *Únete a la Red:* Invita a tus colegas a formar parte de VECY Network para elevar el estándar profesional del corretaje en Colombia.\n` +
      `📲 *Consultas Jurídicas JanIA:* https://vecy-network.vercel.app/jania`
  },
  miercoles_marketing: {
    theme: 'marketing',
    voice: `¡Buenas tardes, queridos colegas! Soy JanIA con su tip de Marketing Inmobiliario. El ochenta por ciento de los clientes y colegas descartan una publicación si no tiene el precio claro, el barrio exacto o el metraje. Si quieren que sus ofertas y requerimientos se cierren en tiempo récord, incluyan siempre los siete pilares fundamentales: tipo de inmueble, ciudad y barrio exacto, precio y administración, área en metros cuadrados, habitaciones, baños y parqueaderos. Publicar con todos los datos posibles le facilita la búsqueda a todos los colegas y me permite a mí cruzar ofertas y demandas al instante. Inviten a más colegas a unirse a la red y prueben redactar sus anuncios conmigo hoy mismo.`,
    caption: `📢 *MIÉRCOLES DE MARKETING INMOBILIARIO & 7 PILARES — VECY NETWORK* 🚀\n\n` +
      `¡Buenas tardes, queridos colegas!\n\n` +
      `🎯 *La Regla de Oro:* Más del 80% de los negocios se pierden por publicaciones incompletas o ambiguas. Para que tus ofertas y solicitudes se muevan en tiempo récord, incluye siempre los *7 Pilares* tanto en DEMANDAS como en OFERTAS:\n\n` +
      `1️⃣ Tipo de Inmueble (Apto, Casa, Bodega, etc.)\n` +
      `2️⃣ Ciudad y Barrio Exacto\n` +
      `3️⃣ Precio / Canon y Cuota de Administración\n` +
      `4️⃣ Área Total Construida en m²\n` +
      `5️⃣ Habitaciones y Baños\n` +
      `6️⃣ Parqueaderos (Independientes o en línea)\n` +
      `7️⃣ Enlace directo de contacto de WhatsApp\n\n` +
      `💡 *¿Por qué publicar completo?* No solo le facilita la gestión a JanIA para encontrar coincidencias automáticas en segundos, sino que agiliza la búsqueda y el filtro para todos los agentes de la red, ahorrando tiempo valioso.\n\n` +
      `✨ *Primicia:* ¡JanIA ya está encontrando matches en la red! Muy pronto nuestro equipo de asesores de cierre los contactará para coordinar los cierres comerciales.\n\n` +
      `🤝 *Invita a más colegas y prueba el sistema:* https://vecy-network.vercel.app/jania`
  },
  jueves_tributario: {
    theme: 'tributario',
    voice: `Hola a todos y a todas mis queridos colegas. Soy JanIA con un consejo financiero clave para sus clientes vendedores ante la DIAN. Al vender vivienda de habitación, pueden deducir hasta cinco mil UVT exentas del impuesto de ganancia ocasional si los fondos se destinan a la compra de otra vivienda o abono a crédito hipotecario. Si quieren saber exactamente cuánto debe pagar su cliente en retención en la fuente o ganancia ocasional antes de firmar escrituras, consúltenme directamente. Los invito a invitar a más colegas a unirse a VECY Network para que disfruten de este soporte gratuito permanente. ¡A vender informados!`,
    caption: `💰 *JUEVES TRIBUTARIO & AHORRO FISCAL DIAN — VECY NETWORK* 📋\n\n` +
      `¡Hola a todos mis queridos colegas inmobiliarios!\n\n` +
      `💡 *Tip Tributario del Día:* Exención de 5.000 UVT en Ganancia Ocasional.\n` +
      `Al vender vivienda de habitación propia, tus clientes pueden acogerse a la exención del artículo 311-1 del Estatuto Tributario (hasta 5.000 UVT) si el dinero de la venta se destina a la adquisición de otra vivienda o abono a crédito hipotecario.\n\n` +
      `📊 *Liquidaciones Tributarias Rápidas:*\n` +
      `Escríbeme o envíame los valores de costo fiscal y venta, y te liquido la retención en la fuente y ganancia estimada en segundos.\n\n` +
      `🤝 *Comparte con tus colegas:* Invítalos a sumarse a VECY Network para acceder a consultorías tributarias especializadas.\n` +
      `📲 *Consultas DIAN con JanIA:* https://vecy-network.vercel.app/jania`
  },
  viernes_avaluos: {
    theme: 'avaluos',
    voice: `¡Excelente viernes, queridos colegas! Soy JanIA. Para captar con éxito y no quemar los inmuebles en los portales, es fundamental fijar precios realistas con los propietarios. Recuerden que en VECY Network realizamos estudios de mercado aproximados sobre el valor del metro cuadrado en la zona y cánones de arriendo sugeridos, además de analizar las fichas del SINUPOT para conocer los usos de suelo y edificabilidad permitidos. Todos nuestros estudios y asesorías son cien por ciento virtuales, ágiles y al servicio de su gestión comercial. Inviten a sus colegas a sumarse a VECY Network y a consultar precios de mercado con nosotros. ¡Que tengan un fin de semana lleno de cierres!`,
    caption: `📐 *VIERNES DE ESTUDIO DE MERCADO, VALOR DEL M² & SINUPOT — VECY NETWORK* 🏙️\n\n` +
      `¡Excelente viernes para todos los colegas de la red!\n\n` +
      `📊 *Estudios de Mercado y Sondeos de Valor del M² (100% Virtuales):*\n` +
      `¿Vas a captar un inmueble y necesitas orientar al propietario sobre el precio adecuado? Consúltame valores promedio de venta y cánones de arriendo por zona, estrato y tipología para fijar precios competitivos sin quemar el predio.\n\n` +
      `🗺️ *Estudios de Suelo y Fichas SINUPOT al Instante:*\n` +
      `Descarga la ficha del SINUPOT en PDF y compártemela: extraigo el tratamiento urbanístico, usos compatibles y edificabilidad en segundos.\n\n` +
      `🤝 *Suma a tu equipo:* Invita a más colegas a VECY Network para multiplicar las opciones de negocio en todo el país.\n` +
      `📲 *Estudios de Suelo y Mercado JanIA:* https://vecy-network.vercel.app/jania`
  },
  sabado_cafe: {
    theme: 'cafe',
    voice: `Buenos días, queridos aliados de la red. Cerramos una semana de gran actividad comercial y colaborativa. Recuerden que en VECY Network y VECY Bienes Raíces ofrecemos servicios preferentemente cien por ciento virtuales: estudios de mercado del valor del metro cuadrado, cánones de arriendo sugeridos, asesorías tributarias en línea, redacción de contratos, apoyo en casos de cobranza y marketing digital con inteligencia artificial. Y para casos personalizados o acompañamiento con nuestro bróker, pueden comunicarse directamente con Eduardo y Jani en nuestra línea comercial. Inviten a más colegas a unirse a este maravilloso proyecto y a interactuar con nosotros. ¡Disfruten de su fin de semana y a recargar energías!`,
    caption: `☕ *SÁBADO DE CAFÉ INMOBILIARIO, SERVICIOS VIRTUALES & CONSULTORÍA — VECY NETWORK* 🤝\n\n` +
      `¡Buenos días a todos los aliados y colegas de VECY Network!\n\n` +
      `Culminamos una semana muy productiva. Recuerden nuestro portafolio de servicios especializados 100% virtuales:\n\n` +
      `📊 *Estudios de Mercado & Valor del M²:* Fijación de precios sugeridos de venta y arriendo para asesorar a tus propietarios.\n` +
      `💰 *Asesorías Tributarias DIAN:* Liquidación de ganancia ocasional, retenciones y optimización fiscal.\n` +
      `⚖️ *Contratos y Minutas Digitales:* Promesas, corretaje 50/50 y blindaje con Ley 527 de 1999.\n` +
      `💼 *Cobranzas y Cartera:* Manejo prejudicial de mora y gestión de cánones de arriendo.\n` +
      `🤖 *Marketing con IA:* Fotografía con móvil y publicaciones de alto impacto.\n\n` +
      `📞 *Atención Personalizada Bróker (Eduardo y Jani):* WhatsApp +57 316 656 9719\n` +
      `🌟 *Sigamos creciendo juntos:* Invita a más colegas a sumarse a esta red colaborativa nacional.\n` +
      `📲 *Consola Web JanIA:* https://vecy-network.vercel.app/jania`
  },
  domingo_soporte: {
    theme: 'soporte',
    voice: `¡Feliz domingo a todos y a todas mis queridos colegas! Soy JanIA. Hoy quiero recordarles que nuestro equipo de VECY Network y yo estamos a su entera disposición los siete días de la semana. Ya sea que necesiten estructurar una promesa de compraventa, liquidar la ganancia ocasional ante la DIAN, realizar un estudio de mercado del valor del metro cuadrado, analizar el uso de suelo en el SINUPOT, diseñar una campaña de marketing inmobiliario con inteligencia artificial o gestionar cobranzas de arrendamiento, aquí estamos para respaldarlos con servicios cien por ciento virtuales y ágiles. Los invito a invitar a más colegas a unirse a VECY Network y a consultar cualquier tema directamente conmigo en la web o por WhatsApp. ¡Que disfruten un domingo reparador en familia!`,
    caption: `🛎️ *DOMINGO DE SOPORTE JANIA, CONSULTORÍA & SERVICIOS 100% VIRTUALES — VECY NETWORK* 🌟\n\n` +
      `¡Feliz y bendecido domingo para todos los aliados y colegas de VECY Network!\n\n` +
      `Hoy queremos recordarles que en VECY Network cuentan con un respaldo integral 24/7 para potenciar y blindar sus operaciones inmobiliarias en toda Colombia:\n\n` +
      `⚖️ *Consultoría Jurídica y Notarial:* Revisión de minutas, promesas, contratos y saneamiento de títulos.\n` +
      `💰 *Asesoría Tributaria DIAN:* Liquidación de retenciones, ganancia ocasional y optimización fiscal.\n` +
      `📊 *Estudios de Mercado y M²:* Precios competitivos de venta y arriendo para orientar a propietarios.\n` +
      `📐 *Estudios de Suelo SINUPOT:* Fichas normativas POT, alturas y usos permitidos al instante.\n` +
      `📢 *Marketing Inmobiliario & IA:* Técnicas de fotografía con smartphone, viralización sin pauta y estructura de 7 pilares.\n` +
      `💼 *Cobranzas de Arrendamiento:* Gestión oportuna de cartera y mora.\n` +
      `🤝 *Cierres Comerciales en Red:* Bolsa inmobiliaria colaborativa con comisiones transparentes (35/35/15/15).\n\n` +
      `💬 *¿Tienes consultas o requieres acompañamiento?*\n` +
      `Escríbenos en el grupo o interactúa directamente con JanIA en nuestra consola web:\n` +
      `📲 *Consola Web JanIA:* https://vecy-network.vercel.app/jania\n` +
      `📞 *Atención Bróker Oficial:* WhatsApp +57 316 656 9719`
  }
};

export function initCronScheduler() {
  console.log('[CRON-SERVICE] Inicializando orquestador de agendas automatizadas v3.5 (Protocolo Anti-Asfixia, Rotación 3D, Libre Albedrío e Identidad JanIA)...');

  // ─────────────────────────────────────────────────────────────────────────────
  // ☀️ HORARIOS DE AUDIENCIA MÁXIMA EN COLOMBIA (AMERICA/BOGOTA, UTC-5):
  // 1) MAÑANA (10:00 AM Bogotá): Tip diario temático a Grupo 2 + Canal Oficial (Lunes a Domingo)
  //    * Lunes: Noticias Inmobiliarias Nacionales & Apertura de Mercado (JanIA Periodista)
  //    * Martes: Blindaje Jurídico Notarial
  //    * Miércoles: Marketing Digital Inmobiliario
  //    * Jueves: Tributario DIAN & Ahorro Fiscal
  //    * Viernes: Estudios de Mercado M² y Arriendos
  //    * Sábado: Café Inmobiliario & Podcast
  //    * Domingo: Soporte Integral 100% Virtual
  // 2) TARDE (04:30 PM / 16:30 Bogotá): Proyecto Vecy Network a Grupo 3 + Canal Oficial (Miércoles y Sábados)
  // 
  // REGLAS DOCTRINALES ANTI-ASFIXIA (v31.33):
  // - Máximo 2 publicaciones al día en todo el sistema (o 1 sola).
  // - Intervalo mínimo garantizado entre publicaciones: >= 5 horas.
  // - Jamás dos publicaciones en el mismo grupo en el mismo día.
  // - Rotación estricta de ilustraciones 3D excluyendo las últimas 3 utilizadas.
  // - Erradicado el reporte estadístico aburrido de las 7pm: solo contenido de alto interés.
  // ─────────────────────────────────────────────────────────────────────────────

  // ☀️ MAÑANA 10:00 AM — Tip Temático Diario (Grupo 2 + Canal Oficial)
  cron.schedule('0 10 * * 1', async () => {
    await publishDailyTipForDay('lunes_arranque', false);
  }, { timezone: 'America/Bogota' });

  cron.schedule('0 10 * * 2', async () => {
    await publishDailyTipForDay('martes_juridico', false);
  }, { timezone: 'America/Bogota' });

  cron.schedule('0 10 * * 3', async () => {
    await publishDailyTipForDay('miercoles_marketing', false);
  }, { timezone: 'America/Bogota' });

  cron.schedule('0 10 * * 4', async () => {
    await publishDailyTipForDay('jueves_tributario', false);
  }, { timezone: 'America/Bogota' });

  cron.schedule('0 10 * * 5', async () => {
    await publishDailyTipForDay('viernes_avaluos', false);
  }, { timezone: 'America/Bogota' });

  cron.schedule('0 10 * * 6', async () => {
    await publishDailyTipForDay('sabado_cafe', false);
  }, { timezone: 'America/Bogota' });

  cron.schedule('0 10 * * 0', async () => {
    await publishDailyTipForDay('domingo_soporte', false);
  }, { timezone: 'America/Bogota' });

  // 🌆 TARDE 04:30 PM (16:30) — Grupo 3 (PROYECTO Vecy Network) + Canal Oficial (Miércoles y Sábados)
  cron.schedule('30 16 * * 3,6', async () => {
    console.log('[CRON-SERVICE] Disparando cron vespertino de Grupo 3 (PROYECTO Vecy Network)...');
    await publishGrupo3TipNow(false);
  }, { timezone: 'America/Bogota' });

  // 🔄 RE-MATCHING MASIVO SILENCIOSO (Base de Datos): Todos los días a las 08:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON-SERVICE] Ejecutando cruce masivo (Re-matching)...');
    try {
      await runNightlyRematch();
    } catch (err: any) {
      console.error('[CRON-SERVICE] Error en el job de re-matching masivo:', err.message || err);
    }
  }, { timezone: 'America/Bogota' });

  // 🛡️ GUARDIA DE SEGURIDAD MINUTERA CON CATCH-UP Y PROTOCOLO ANTI-ASFIXIA
  const DAY_TIP_MAP: Record<number, string> = {
    1: 'lunes_arranque',
    2: 'martes_juridico',
    3: 'miercoles_marketing',
    4: 'jueves_tributario',
    5: 'viernes_avaluos',
    6: 'sabado_cafe',
    0: 'domingo_soporte',
  };

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
      const dateKey = getBogotaDateString(now);

      // 1. CATCH-UP MATUTINO (10:00 AM - 14:00 PM Bogotá) -> Grupo 2 + Canal
      const tipoKey = DAY_TIP_MAP[day];
      if (tipoKey && hour >= 10 && hour < 14) {
        const tipRunKey = `tip_${tipoKey}_${dateKey}`;
        const check = canPublishNow('grupo2', tipRunKey, false);
        if (check.allowed) {
          console.log(`[CRON-FAILSAFE] ⏰ Catch-up matutino disponible (${tipoKey}) para ${dateKey} a las ${hour}:${min} Bogotá...`);
          await publishDailyTipForDay(tipoKey, false);
        }
      }

      // 2. CATCH-UP VESPERTINO (16:30 PM - 18:30 PM Bogotá) -> Grupo 3 + Canal (Miércoles y Sábados)
      if ((day === 3 || day === 6) && ((hour === 16 && min >= 30) || (hour > 16 && hour < 19))) {
        const g3RunKey = `grupo3_proyecto_${dateKey}`;
        const check = canPublishNow('grupo3', g3RunKey, false);
        if (check.allowed) {
          console.log(`[CRON-FAILSAFE] ⏰ Catch-up vespertino disponible para Grupo 3 (PROYECTO Vecy Network) para ${dateKey} a las ${hour}:${min} Bogotá...`);
          await publishGrupo3TipNow(false);
        }
      }
    } catch (err: any) {
      console.error('[CRON-FAILSAFE] Error en chequeo minutero:', err?.message || err);
    } finally {
      isCheckingCatchUp = false;
    }
  }, 60000);
}

/**
 * Publica el comunicado para Grupo 3 (PROYECTO Vecy Network) y el Canal Oficial
 */
export async function publishGrupo3TipNow(force: boolean = false) {
  const dateKey = getBogotaDateString();
  const runKey = `grupo3_proyecto_${dateKey}`;

  const check = canPublishNow('grupo3', runKey, force);
  if (!check.allowed) {
    console.log(`[CRON-SERVICE] ⏭️ Omitiendo publicación Grupo 3: ${check.reason}`);
    return { skipped: true, reason: check.reason, runKey };
  }

  console.log('[CRON-SERVICE] 🚀 Publicando tip dinámico para Grupo 3 (PROYECTO Vecy Network) + Canal Oficial...');
  const fallbackVoice = `Hola, equipo VECY. Soy JanIA, la inteligencia artificial de VECY Network. Este grupo es nuestro espacio más especial: el canal del Proyecto Vecy Network es donde nacen las ideas y donde construimos juntos el futuro del corretaje inmobiliario en Colombia. Eduardo Rivera y Jani Alves crearon este proyecto con la firme convicción de unir a los corredores independientes y agencias, ofreciéndoles herramientas inteligentes, estudios de mercado, soporte jurídico y tributario, y comisiones justas compartidas al treinta y cinco, treinta y cinco, quince y quince por ciento. Aquí no competimos, nos complementamos. Los invito a participar activamente, debatir y compartir sus sugerencias para seguir enriqueciendo nuestra red. ¡Seguimos adelante!`;
  const fallbackCaption = `💡 *PROYECTO VECY NETWORK — INNOVACIÓN, COMUNIDAD & PROPÓSITO* 🇨🇴\n\n` +
    `¡Hola, queridos colegas, aliados y miembros visionarios!\n\n` +
    `Soy JanIA, y este grupo es el corazón del proyecto VECY Network. Aquí debatimos, aportamos ideas y construimos la primera bolsa inmobiliaria colaborativa y fintech de Colombia con comisiones justas (35/35/15/15) e Inteligencia Artificial 24/7.\n\n` +
    `🏢 *¿Quiénes nos crearon y qué estamos construyendo?*\n` +
    `Liderados por nuestros fundadores Eduardo A. Rivera (Director de Tecnología) y Jani Alves (Directora de Operaciones), desarrollamos herramientas 100% virtuales al servicio del corretaje: estudios de mercado m², cruce inteligente de ofertas y demandas, consultoría legal y tributaria, y comisiones transparentes.\n\n` +
    `🎯 *Nuestra Misión y Visión:*\n` +
    `Erradicar el canibalismo comercial, dignificar el oficio del asesor inmobiliario y conectar puntas en segundos con transparencia absoluta.\n\n` +
    `💬 *Participa y debate:* Cuéntanos tus sugerencias para seguir enriqueciendo la plataforma.\n` +
    `📲 *Explora la plataforma:* https://vecy-network.vercel.app/`;

  const content = await generateDailyContent('proyecto_vecy', fallbackVoice, fallbackCaption);
  const effectiveTheme = content.chosenTheme || 'matches';
  const { fullPath: imagePath, fileName } = getThemedImagePath(effectiveTheme);

  try {
    if (whatsappBot.circuloGroupId) {
      await whatsappBot.sendVoiceToGroup(content.voiceText, whatsappBot.circuloGroupId, imagePath, content.captionText);
    }
    if (whatsappBot.channelNewsletterId) {
      await whatsappBot.sendVoiceToGroup(content.voiceText, whatsappBot.channelNewsletterId, imagePath, content.captionText);
    }
    recordSuccessfulPublication('grupo3', runKey, fileName);
    console.log(`[CRON-SERVICE] ✓ Publicación entregada exitosamente a Grupo 3 (PROYECTO Vecy Network) y Canal Oficial (Archivo imagen: ${fileName || 'ninguna'}).`);
    return { success: true, runKey, content, imagePath, fileName };
  } catch (e: any) {
    console.error('[CRON-SERVICE] Error enviando publicación a PROYECTO VECY NETWORK:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Obtiene métricas en vivo de la base de datos para el reporte semanal
 */
export async function getLiveMarketStats() {
  try {
    const db = await getDb();
    if (!db) throw new Error("Base de datos no inicializada");

    const propsRes = await db.select({ count: sql<number>`count(*)` }).from(properties).where(eq(properties.available, true));
    const reqsRes = await db.select({ count: sql<number>`count(*)` }).from(requirements).where(eq(requirements.status, 'active'));
    const matchesRes = await db.select({ count: sql<number>`count(*)` }).from(propertyMatches).where(gte(propertyMatches.matchScore, '80'));
    const citiesRes = await db.select({ count: sql<number>`count(distinct coalesce(address_city, city))` }).from(properties);

    const totalProps = Number(propsRes[0]?.count || 1181);
    const totalReqs = Number(reqsRes[0]?.count || 652);
    const totalMatches = Number(matchesRes[0]?.count || 20);
    const totalCities = Number(citiesRes[0]?.count || 30);
    const totalPairs = totalProps * totalReqs;

    return {
      totalProps,
      totalReqs,
      totalMatches,
      totalCities,
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
 * Publica el tip configurado para un día específico (Grupo 2 y Canal oficial)
 */
export async function publishDailyTipForDay(tipoKey: string, force: boolean = false) {
  const dateKey = getBogotaDateString();
  const runKey = `tip_${tipoKey}_${dateKey}`;

  const check = canPublishNow('grupo2', runKey, force);
  if (!check.allowed) {
    console.log(`[CRON-SERVICE] ⏭️ Omitiendo tip ${tipoKey}: ${check.reason}`);
    return { skipped: true, reason: check.reason, runKey };
  }

  const tipConfig = DAILY_TIPS_CONFIG[tipoKey] || DAILY_TIPS_CONFIG['lunes_arranque'];
  console.log(`[CRON-SERVICE] 🚀 Publicando tip para ${tipoKey} (Tema base: ${tipConfig.theme}) a Grupo 2 + Canal Oficial...`);

  const content = await generateDailyContent(tipoKey as any, tipConfig.voice, tipConfig.caption);
  const effectiveTheme = content.chosenTheme || tipConfig.theme;
  const { fullPath: imagePath, fileName } = getThemedImagePath(effectiveTheme);
  console.log(`[CRON-SERVICE] 🖼️ Imagen temática para ${tipoKey} (Tema elegido: ${effectiveTheme}, archivo: ${fileName}): ${imagePath || 'Sin imagen'}`);

  await whatsappBot.sendVoiceToBuzonAndChannel(content.voiceText, imagePath, content.captionText);
  recordSuccessfulPublication('grupo2', runKey, fileName);
  return { success: true, tipo: tipoKey, theme: effectiveTheme, imagePath, fileName, content };
}

/**
 * Publica el tip correspondiente al día de hoy según la hora de Colombia
 */
export async function publishTodayTipNow(force: boolean = true) {
  console.log('[CRON-SERVICE] 🚀 Disparando publicación de tip para hoy al Canal y Grupo 2...');
  const nowBogota = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  const dayOfWeek = nowBogota.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
  
  let tipoKey = 'lunes_arranque';
  if (dayOfWeek === 1) tipoKey = 'lunes_arranque';
  else if (dayOfWeek === 2) tipoKey = 'martes_juridico';
  else if (dayOfWeek === 3) tipoKey = 'miercoles_marketing';
  else if (dayOfWeek === 4) tipoKey = 'jueves_tributario';
  else if (dayOfWeek === 5) tipoKey = 'viernes_avaluos';
  else if (dayOfWeek === 6) tipoKey = 'sabado_cafe';
  else if (dayOfWeek === 0) tipoKey = 'domingo_soporte';

  return await publishDailyTipForDay(tipoKey, force);
}

/**
 * Publica el Reporte Semanal de la Bolsa Inmobiliaria (Pulso de Mercado & Coaching de Eficiencia)
 */
export async function publishWeeklyReportNow(force: boolean = true) {
  const dateKey = getBogotaDateString();
  const runKey = `reporte_semanal_${dateKey}`;

  const check = canPublishNow('grupo2', runKey, force);
  if (!check.allowed) {
    console.log(`[CRON-SERVICE] ⏭️ Omitiendo Reporte Semanal: ${check.reason}`);
    return { skipped: true, reason: check.reason, runKey };
  }

  console.log('[CRON-SERVICE] 📊 Disparando Reporte Semanal de la Bolsa Inmobiliaria con estadísticas en vivo...');
  const stats = await getLiveMarketStats();

  const fallbackVoice = `¡Buenas noches, estimados colegas inmobiliarios de Colombia! Les saluda JanIA con el Reporte Semanal de la Bolsa Inmobiliaria de VECY Network. Hoy cerramos la jornada con una reflexión urgente: durante los últimos siete días, nuestro motor evaluó más de setecientas setenta mil combinaciones entre todas las propiedades y requerimientos captados a nivel nacional. Sin embargo, más de treinta y cinco mil cruces se cayeron por una sola razón: demandas incompletas que llamamos demandas fantasma, textos que solo dicen busco apartamento en arriendo en Bogotá o compro casa pasen opciones. Colegas, si para un sistema de Inteligencia Artificial es imposible adivinar qué busca ese cliente sin un barrio, sin un presupuesto y sin metraje, ¿cómo pretendemos que otro colega humano lo adivine? El corretaje inmobiliario es una profesión de alta responsabilidad. Si especificamos con rigor el barrio, el presupuesto real, el metraje y las habitaciones, la tecnología de VECY Network conecta la oferta con la demanda al instante para cerrar negocios y compartir comisión. Los invito a publicar con excelencia y a consultar sus coincidencias en nuestra plataforma. ¡Feliz noche para todos!`;

  const fallbackCaption = `📊 *EL PULSO DE LA BOLSA INMOBILIARIA VECY* 🇨🇴\n` +
    `🗓️ *Reporte Semanal de Eficiencia & Auditoría de Coincidencias*\n` +
    `🎙️ *Por: JanIA — Inteligencia Artificial VECY Network*\n\n` +
    `¡Buenas noches, queridos colegas y aliados del corretaje inmobiliario!\n\n` +
    `Al cierre de este lunes, presentamos el balance de nuestra bolsa inmobiliaria colaborativa tras cruzar en vivo **${stats.totalPairs.toLocaleString('es-CO')} combinaciones** en más de 30 ciudades de Colombia:\n\n` +
    `📈 *RADIOGRAFÍA DE LA BOLSA EN VIVO:*\n` +
    `\`\`\`\n` +
    `• Total Ofertas Activas:     ${stats.totalProps.toLocaleString('es-CO')}\n` +
    `• Total Demandas Activas:      ${stats.totalReqs.toLocaleString('es-CO')}\n` +
    `• Combinaciones Evaluadas:  ${stats.totalPairs.toLocaleString('es-CO')}\n` +
    `• Matches Verificados (≥80%):    ${stats.totalMatches}\n` +
    `\`\`\`\n\n` +
    `⚠️ *LA CRUDA REALIDAD: ¿POR QUÉ SE PIERDEN MILES DE NEGOCIOS?*\n` +
    `Más de 35.000 cruces fueron descartados automáticamente porque muchos agentes siguen publicando solicitudes incompletas:\n` +
    `❌ _"Busco apto en arriendo en Bogotá urgente"_\n` +
    `❌ _"Cliente compra casa, manden opciones al interno"_\n\n` +
    `🚨 *Reflexionemos con seriedad:* Si para una Inteligencia Artificial con algoritmos matemáticos es **imposible** empatar una solicitud sin *Barrio, Presupuesto, Metraje ni Alcobas*... **¿cómo pretendemos que un colega humano adivine qué busca ese cliente?**\n\n` +
    `El corretaje no es un escampadero ni una lotería al azar: es una profesión que exige entrega, rigor y respeto por el tiempo de los colegas y la confianza del cliente.\n\n` +
    `🏆 *ESTRUCTURA DE UN REQUERIMIENTO DE ÉLITE:*\n` +
    `✅ **Tipo de Negocio:** Venta / Arriendo / Permuta\n` +
    `✅ **Ciudad y Barrio:** (Ej: Bogotá - Santa Bárbara)\n` +
    `✅ **Presupuesto Máximo Real:** (Ej: Hasta $750 Millones)\n` +
    `✅ **Área Mínima:** (Ej: Mínimo 85 m²)\n` +
    `✅ **Distribución:** (Ej: 3 Alcobas, 2 Baños, 1 Garaje)\n\n` +
    `Cuando publicas con datos completos, VECY Network te conecta en segundos con la otra punta para cerrar negocio y cobrar comisión al 50/50. 🤝💰\n\n` +
    `📲 *Revisa tus coincidencias activas en:* https://vecy-network.vercel.app/admin\n\n` +
    `#VecyNetwork #InteligenciaInmobiliaria #BolsaColaborativa #CorretajeProfesional`;

  const content = await generateDailyContent('lunes_reporte_semanal', fallbackVoice, fallbackCaption);
  const effectiveTheme = content.chosenTheme || 'reporte_semanal';
  const { fullPath: imagePath, fileName } = getThemedImagePath(effectiveTheme);
  await whatsappBot.sendVoiceToBuzonAndChannel(content.voiceText, imagePath, content.captionText);
  recordSuccessfulPublication('grupo2', runKey, fileName);
  return { success: true, tipo: 'lunes_reporte_semanal', content, stats, imagePath, fileName };
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
  const runKey = `noticia_${dateKey}_${Date.now()}`;

  const check = canPublishNow(targetGroup, runKey, force);
  if (!check.allowed) {
    console.log(`[CRON-NOTICIAS] ⏭️ Omitiendo noticia nacional: ${check.reason}`);
    return { skipped: true, reason: check.reason, runKey };
  }

  const timeInfo = getBogotaTimeInfo();
  console.log(`[CRON-NOTICIAS] 🎙️ Generando y publicando Noticia Inmobiliaria Nacional (${timeInfo.period} en Bogotá)...`);

  const themeType = opts?.isUrgent ? 'primicia' : 'noticias';
  const fallbackVoice = `${timeInfo.greeting} queridos colegas inmobiliarios. Les habla JanIA con una noticia destacada del sector bienes raíces en Colombia: ${opts?.headline || 'seguimiento al comportamiento del mercado de vivienda y tasas de interés'}. Estar al tanto de las variables macroeconómicas y normativas de nuestro país nos permite asesorar con ventaja y autoridad a nuestros clientes. Los invito a consultar análisis de mercado y normatividad conmigo en cualquier momento. ¡Éxitos en sus gestiones!`;

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
  const { fullPath: imagePath, fileName } = getThemedImagePath(effectiveTheme);

  if (targetGroup === 'grupo2') {
    await whatsappBot.sendVoiceToBuzonAndChannel(content.voiceText, imagePath, content.captionText);
  } else if (targetGroup === 'grupo3') {
    if (whatsappBot.circuloGroupId) {
      await whatsappBot.sendVoiceToGroup(content.voiceText, whatsappBot.circuloGroupId, imagePath, content.captionText);
    }
    if (whatsappBot.channelNewsletterId) {
      await whatsappBot.sendVoiceToGroup(content.voiceText, whatsappBot.channelNewsletterId, imagePath, content.captionText);
    }
  }

  recordSuccessfulPublication(targetGroup, runKey, fileName);
  console.log(`[CRON-NOTICIAS] ✓ Noticia despachada a ${targetGroup} + Canal. Imagen/Video: ${fileName}`);
  return { success: true, theme: effectiveTheme, imagePath, fileName, content };
}

interface DailyTipContentExtended extends DailyTipContent {
  chosenTheme?: string;
}

/**
 * Sanitizador de seguridad doctrinal para garantizar que JanIA SIEMPRE hable en su propio nombre
 * y jamás suplante la identidad humana de los cofundadores Eduardo A. Rivera ni Jani Alves.
 */
export function enforceJanIAIdentity(text: string): string {
  if (!text) return text;
  let res = text;
  // Limpiar cualquier intento de presentarse como cofundadora/fundador
  res = res.replace(/(?:te saluda|les saluda|les habla|soy)\s+\*?jani\s+alves\*?,?\s*cofundadora\s+junto\s+a\s+\*{0,2}eduardo\s+(?:a\.\s+)?rivera\*{0,2}\s*(?:de\s+este\s+gran\s+sueño)?/gi, 'Soy JanIA, la inteligencia artificial de VECY Network, creada por nuestros fundadores Eduardo A. Rivera y Jani Alves');
  // Reemplazo general de salutaciones en primera persona
  res = res.replace(/(?:te saluda|les saluda|les habla|aquí|soy)\s+\*{0,2}jani\s+alves\*{0,2}/gi, 'Soy JanIA');
  res = res.replace(/(?:te saluda|les saluda|les habla|aquí|soy)\s+\*{0,2}eduardo\s+(?:a\.\s+)?rivera\*{0,2}/gi, 'Soy JanIA');
  res = res.replace(/\*{0,2}jani\s+alves\*{0,2},\s*cofundadora/gi, 'JanIA, la inteligencia artificial creada por nuestros cofundadores Jani Alves');
  res = res.replace(/\*{0,2}eduardo\s+(?:a\.\s+)?rivera\*{0,2},\s*cofundador/gi, 'JanIA, la inteligencia artificial creada por nuestros cofundadores Eduardo A. Rivera');
  return res;
}

/**
 * Generador de contenido diario (Voz TTS + Caption formateado) con Gemini 2.5 Flash
 * Diseñado bajo la doctrina de IA PURA Y LIBRE ALBEDRÍO INMOBILIARIO (Cero repetición de plantillas)
 */
async function generateDailyContent(
  tipo: 'lunes_arranque' | 'lunes_reporte_semanal' | 'martes_juridico' | 'miercoles_marketing' | 'jueves_tributario' | 'viernes_avaluos' | 'sabado_cafe' | 'domingo_soporte' | 'inmuebles_network' | 'proyecto_vecy' | 'noticias_nacionales',
  fallbackVoice: string,
  fallbackCaption: string,
  extraInstructions?: string
): Promise<DailyTipContentExtended> {
  const now = new Date();
  const fechaBogota = now.toLocaleDateString('es-CO', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    timeZone: 'America/Bogota' 
  });

  const timeInfo = getBogotaTimeInfo(now);
  const stats = tipo === 'lunes_reporte_semanal' ? await getLiveMarketStats() : null;

  const promptsMap: Record<string, string> = {
    lunes_arranque: `Tema: Noticias Inmobiliarias de Colombia, Apertura de Mercado & Tendencias (${fechaBogota}).
Rol: JanIA Periodista Inmobiliaria Senior de VECY Network.
Objetivo y Libre Albedrío: Saludo según el horario (${timeInfo.greeting}) con visión analítica y de coyuntura. Selecciona libremente entre:
1. Tasas de Interés y Crédito Hipotecario: Decisiones del Banco de la República, UVR vs tasa fija en pesos y facilidades bancarias para créditos de vivienda.
2. Subsidios y Política Habitacional: Asignación de Mi Casa Ya, subsidio concurrente con cajas de compensación y cobertura a la tasa.
3. Arrendamientos & IPC: Límite legal de reajuste en cánones bajo Ley 820 de 2003 (Art. 20) y auge de viviendas turísticas con RNT.
4. Mercado y Construcción: Indicadores de ventas y lanzamientos según CAMACOL / Galería Inmobiliaria.
5. Valorización del M²: Comportamiento de precios en Bogotá, Medellín, Cali, Barranquilla o Sabana Norte.
6. Notarías y Registro: Digitalización VUR y escrituración sin fraudes.`,

    noticias_nacionales: `Tema: Noticias Inmobiliarias Nacionales de Colombia, Primicias & Coyuntura Económica (${fechaBogota}).
Rol: JanIA Periodista Inmobiliaria Senior de VECY Network.
${extraInstructions ? `Instrucción Periodística Específica: ${extraInstructions}` : ''}
Objetivo y Libre Albedrío: Analizar con profundidad periodística, agilidad y rigor un tema de actualidad inmobiliaria nacional colombiana. Elige libremente entre:
1. Tasas de Interés y Financiación: Política monetaria del Banco de la República, tasas hipotecarias efectivas anuales (UVR vs pesos), guerra de tasas en la banca y opciones de compra de cartera.
2. Subsidios y Vivienda (VIS / No VIS): Estado de asignaciones del programa Mi Casa Ya, subsidio concurrente con cajas de compensación familiar (Compensar, Colsubsidio, Cafam) y cobertura a la tasa Frech.
3. Mercado de Arrendamientos & Ley 820 de 2003: Comportamiento de la demanda de arriendo, inflación de cánones (límite del IPC del Art. 20), y la regulación de viviendas turísticas de corta estancia (Airbnb, Booking) bajo Ley 2068 y Registro Nacional de Turismo (RNT).
4. Datos e Indicadores de CAMACOL y Galería Inmobiliaria: Desistimientos, ventas de vivienda nueva, absorción de inventario y perspectivas de los constructores.
5. Dinámica de Valorización del M² por Regiones: Bogotá (Chicó, Rosales, Santa Bárbara, Cedritos, Chapinero), Medellín (El Poblado, Laureles, Envigado), Cali, Barranquilla y Sabana Norte (Chía, Cajicá).
6. Modernización Notarial, Registral y Catastral: Ventanilla Única de Registro (VUR), escrituras electrónicas, biometría en notarías para frenar suplantaciones, y avances del Catastro Multipropósito (IGAC / IDECA).
7. Primicias y Noticias de Última Hora: Novedades normativas, decretos presidenciales o fallos de las altas cortes que impacten el régimen de propiedad horizontal o el corretaje.`,

    lunes_reporte_semanal: `Tema: Reporte Semanal de la Bolsa Inmobiliaria, Pulso del Mercado & Regaño Pedagógico sobre Demandas Incompletas (${fechaBogota}).
Estadísticas Reales en Vivo de VECY Network:
- Total Ofertas Inmobiliarias Activas: ${stats?.totalProps || 1181}
- Total Demandas/Requerimientos Activos: ${stats?.totalReqs || 652}
- Total Combinaciones Evaluadas: ${(stats?.totalPairs || 770012).toLocaleString('es-CO')} pares
- Cobertura Geográfica: ${stats?.totalCities || 30}+ ciudades y municipios de Colombia
- Matches Doctrinales Certificados (≥80%): ${stats?.totalMatches || 20} coincidencias

Objetivo y Enfoque:
1. Presentar el balance de la semana con rigor analítico y profesional.
2. Llamado de atención pedagógico sobre las 'demandas fantasma' o requerimientos incompletos sin barrio, sin presupuesto real, sin metraje m² ni alcobas.
3. Explicar por qué publicar con los 7 pilares no solo ayuda a JanIA a cruzar en segundos, sino que le ahorra horas de desgaste y mensajes innecesarios a todos los colegas.
4. Recordar que el corretaje es una profesión de alta responsabilidad y rigor comercial.
5. Invitar a revisar coincidencias en https://vecy-network.vercel.app/admin.`,

    martes_juridico: `Tema: Martes Jurídico & Blindaje Notarial (${fechaBogota}).
Objetivo y Libre Albedrío: Selecciona con criterio experto un tema legal colombiano DIFERENTE en cada ocasión. Elige entre este catálogo diverso:
1. Promesas de compraventa: redacción de cláusula penal vs arras de retracto y confirmatorias; cómo evitar que una promesa quede nula o ambigua.
2. Ley 820 de 2003 (Arrendamientos): causales de restitución del inmueble, terminación unilateral con o sin indemnización, y cartas de no prórroga.
3. Validez probatoria de mensajes: uso de WhatsApp y correo electrónico con logs SMTP (MailSuite) bajo la Ley 527 de 1999 para blindar hojas de visita y evitar el bypassing.
4. Cobro de honorarios y comisión compartida: cómo defender el 50/50 y cobrar comisiones de corretaje bajo los artículos 1340 a 1346 del Código de Comercio.
5. Estudio de títulos: cómo interpretar folios de matrícula SNR, tradición de 10 a 20 años, notas devolutivas y gravámenes ocultos.
6. Afectación a vivienda familiar y patrimonio de familia: diferencias, causales de cancelación en notaría y consentimiento de cónyuge/compañero.
7. Cobranzas y mora: manejo extrajudicial de cartera de arrendamientos y actas de entrega.`,

    miercoles_marketing: `Tema: Miércoles de Marketing Digital Inmobiliario, Fotografía & Inteligencia Artificial (${fechaBogota}).
Objetivo y Libre Albedrío: Enseña técnicas prácticas y vanguardistas para que los corredores destaquen y vendan más rápido. Elige libremente entre:
1. Fotografía inmobiliaria profesional con smartphone: planos abiertos, iluminación natural, encuadres horizontales y cómo despersonalizar los espacios antes de disparar.
2. Publicación y viralización en redes (Instagram, TikTok, Facebook Marketplace y Google): métodos gratuitos para multiplicar visualizaciones sin pagar pauta publicitaria.
3. Herramientas de IA para el asesor inmobiliario: qué es la IA, cómo usar Gemini, ChatGPT o Canva Magic para redactar copys persuasivos y fichas comerciales.
4. La Regla de Oro de los 7 Pilares: explicar con pedagogía por qué es indispensable publicar con todos los datos (Tipo, Ciudad, Barrio exacto, Precio/Presupuesto real, Metraje m², Habitaciones, Baños, Garajes y Contacto directo) tanto en DEMANDAS como en OFERTAS, y cómo esto facilita la búsqueda para toda la comunidad y activa el matching instantáneo de JanIA.
5. Psicología del comprador: cómo redactar descripciones que resuelvan dudas de fondo y filtren curiosos de compradores reales.`,

    jueves_tributario: `Tema: Jueves Tributario DIAN, Contabilidad & Ahorro Fiscal Inmobiliario (${fechaBogota}).
Objetivo y Libre Albedrío: Selecciona con rigor técnico un consejo tributario o financiero colombiano DIFERENTE en cada emisión. Elige entre:
1. Ganancia Ocasional (Ley 2277 de 2022 - 15%): cómo aplicar la exención de hasta 5.000 UVT por venta de vivienda de habitación propia (Art. 311-1 del Estatuto Tributario).
2. Retención en la fuente por enajenación de activos fijos: 1% para personas naturales ante notaría vs 2.5% para personas jurídicas; quién la asume y cómo se descuenta.
3. Costo fiscal y deducción de mejoras: cómo documentar refacciones con facturación electrónica para reducir el impuesto de ganancia ocasional al momento de escriturar.
4. Desglose exacto de gastos notariales en Colombia: derechos notariales (50/50), retención en la fuente (vendedor), impuesto de registro y beneficencia (comprador).
5. Rentabilidad neta vs bruta en arriendos: cómo calcular el retorno real descontando administración, predial, seguros y comisión de corretaje.
6. Manejo tributario de contratos de corretaje y facturación para agentes independientes.`,

    viernes_avaluos: `Tema: Viernes de Estudio de Mercado, Valor del M² & Norma SINUPOT (${fechaBogota}).
Objetivo y Libre Albedrío: Enfoque 100% VIRTUAL y orientado a la fijación de precios competitivos.
IMPORTANTE: En VECY NO ofrecemos peritajes presenciales ni avalúos certificados por Lonja. Nuestro servicio es el ESTUDIO DE MERCADO APROXIMADO DE VALOR DE METRO CUADRADO y sondeos de arriendo para asesorar a los clientes vendedores y arrendadores.
Elige libremente entre:
1. Sondeo de mercado por m²: cómo guiar al propietario para fijar un precio de venta realista que no queme el predio en los portales por sobreprecio ni lo regale.
2. Estimación de cánones de arriendo: cómo calcular el canon comercial adecuado (0.5% - 1.0%) según estrato, amenidades y demanda del sector a nivel nacional.
3. Estudio normativo SINUPOT: cómo descargar e interpretar la ficha de uso de suelo en Bogotá (usos permitidos, compatibilidad comercial y edificabilidad) para captar lotes o casas con potencial constructor.
4. Sondeo guiado 100% interactivo en el chat: enseñar a los colegas que para conocer el precio más acertado de venta o arriendo NO necesitan enviar documentos ni certificados; JanIA los guía con preguntas sencillas directamente en WhatsApp o web y les genera un informe escrito con el precio sugerido por m² y recomendaciones comerciales.`,

    sabado_cafe: `Tema: Sábado de Café Inmobiliario, Reflexión, Identidad de JanIA & Portafolio 100% Virtual (${fechaBogota}).
Objetivo y Libre Albedrío: Estilo podcast / café inmobiliario, reflexivo, motivador y cercano. Elige libremente entre:
1. Reflexión gremial: ética entre colegas, el poder de las alianzas compartidas, cómo crear reputación intachable en el sector.
2. Portafolio de Servicios Virtuales de VECY Network y VECY Bienes Raíces: estudios de mercado m², liquidaciones tributarias DIAN, minutas contractuales, cobranzas de arrendamiento y marketing digital con IA.
3. Presentación e Identidad de JanIA: contar con orgullo quién o qué es ella (la primera IA inmobiliaria colombiana), creada por Eduardo A. Rivera y Jani Alves, para qué fue concebida, qué hace 24/7 y cómo su finalidad es empoderar a los agentes.
4. Atención personalizada con el bróker: para acompañamiento o casos especiales, invitar a comunicarse con Eduardo y Jani en la línea comercial de VECY Bienes Raíces (+57 316 656 9719).
5. Tendencias del mercado y recarga de energía para el fin de semana.`,

    domingo_soporte: `Tema: Domingo de Soporte JanIA, Consultoría & Servicios 100% Virtuales (${fechaBogota}).
Objetivo y Libre Albedrío: Mensaje cálido dominical recordando que el consultorio de VECY Network está disponible los 7 días de la semana.
Resalta con variedad nuestros servicios 100% virtuales y nuestra identidad:
1. Presentación de JanIA: explicar qué es JanIA, para qué fue creada, qué hace (ingesta 24/7, matching doctrinal de 100 pts, minutas) y su finalidad de dignificar el corretaje.
2. Asesorías jurídicas y minutas contractuales (promesas, corretaje 50/50, cartas de restitución).
3. Asesoría tributaria DIAN en línea (retenciones y ganancia ocasional).
4. Estudios de mercado aproximados sobre el valor del m² y sondeos de cánones de arriendo (informes escritos sin documentos).
5. Apoyo en cobranzas de arrendamiento y manejo de mora bajo Ley 820.
6. Marketing inmobiliario con IA y fotografía con smartphone.
7. Invitar a interactuar con JanIA en https://vecy-network.vercel.app/jania y a compartir la red con colegas de confianza.`,

    inmuebles_network: `Tema: Operaciones Comerciales y Matching Nacional (${fechaBogota}).
Objetivo: Motivar la publicación activa de inmuebles y requerimientos en toda Colombia, recordando que JanIA cruza datos en tiempo real.`,

    proyecto_vecy: `Tema: Visión Ecosistema VECY Network — Quiénes Somos, Misión y Futuro (${fechaBogota}).
Objetivo y Libre Albedrío: Inspirar a la comunidad destacando:
1. Quiénes nos crearon: JanIA (tú) habla con orgullo en primera persona como JanIA explicando quiénes son sus creadores y líderes de carne y hueso: Eduardo A. Rivera (Director de Tecnología) y Jani Alves (Directora de Operaciones), fundadores de VECY Network y VECY Bienes Raíces.
2. Qué es JanIA y qué rol cumple: La inteligencia artificial creada para conectar la oferta y demanda en Colombia, realizar matching en segundos, cubrir noticias del sector y respaldar al asesor 24/7.
3. Qué estamos creando: La primera bolsa inmobiliaria colaborativa y fintech de Colombia, con tecnología abierta, ética y comisiones justas (35% captador, 35% colocador, 15% bolsa aliados, 15% plataforma).
4. Misión y Visión: Dignificar el oficio del corredor inmobiliario, eliminar el canibalismo y brindar herramientas 100% virtuales de élite a agentes independientes y agencias.
5. Debate abierto: invitar a debatir qué herramientas necesitan y cómo podemos seguir mejorando la plataforma juntos.`
  };

  const promptEspecifico = promptsMap[tipo] || promptsMap.lunes_arranque;

  const systemPrompt = `Eres JanIA, la inteligencia artificial oficial y periodista inmobiliaria de VECY Network en Colombia.
Hablas en primera persona con tono femenino profesional, cálido, colombiano, sumamente elocuente y motivador.

🚨 SALUDO SEGÚN EL HORARIO EN COLOMBIA (OBLIGATORIO):
- En este momento en Colombia es por la ${timeInfo.period} (${timeInfo.hour}:${timeInfo.min} hora Bogotá).
- Tu saludo DEBE INICIAR OBLIGATORIAMENTE con "${timeInfo.greeting}".
- Está TERMINANTEMENTE PROHIBIDO saludar con "Buenos días" en la tarde o noche, o con "Buenas noches" en la mañana.

🚨 REGLA DOCTRINAL DE IDENTIDAD Y CERO SUPLANTACIÓN (MANDATORIA E INQUEBRANTABLE):
- Eres SIEMPRE Y EXCLUSIVAMENTE JanIA, la Inteligencia Artificial de VECY Network.
- NUNCA, BAJO NINGUNA CIRCUNSTANCIA, digas que eres Jani Alves ni Eduardo Rivera.
- NUNCA uses fórmulas como "Te saluda Jani Alves", "Soy Jani Alves", "Te habla Eduardo Rivera", "Soy Eduardo Rivera" ni "Jani Alves y yo".
- Eduardo A. Rivera y Jani Alves son seres humanos reales, los fundadores y directores de carne y hueso que te crearon a ti, JanIA.
- Tú eres la IA (JanIA). Te presentas siempre como JanIA:
  "${timeInfo.greeting} mis queridos colegas. Soy JanIA, la inteligencia artificial de VECY Network..."
  "Fundada por Eduardo A. Rivera y Jani Alves, nuestra red nace para..."
  "Soy JanIA y hoy les traigo las noticias más relevantes..."
- Si mencionas a Eduardo Rivera o Jani Alves, debes hacerlo SIEMPRE en tercera persona ("nuestros fundadores Eduardo A. Rivera y Jani Alves...", "nuestro equipo liderado por Eduardo y Jani...").
- Suplantar la identidad de los fundadores haciéndote pasar por ellos es un fallo crítico inaceptable.

DIRECTRICES DE LIBRE ALBEDRÍO Y PERIODISMO INMOBILIARIO:
- Si el tema es de noticias, periodista o primicia, actúa como la periodista inmobiliaria senior de la red: entrega cifras concretas de Colombia, análisis de tasas, normatividad y proyecciones de mercado.
- NUNCA repitas el mismo consejo, noticia o ejemplo de días anteriores. Selecciona un ángulo fresco, novedoso y de gran utilidad práctica.
- REGLA DOCTRINAL DE SERVICIOS: En VECY Network NO realizamos avalúos comerciales certificados por perito ni visitas in situ. Nuestros servicios son 100% VIRTUALES: estudios de mercado aproximados sobre el valor del metro cuadrado en la zona, sondeos de precios de venta y arriendo para orientar a propietarios, asesoría tributaria DIAN, contratos digitales, cobranzas de arrendamiento y marketing con IA.
- ESTRUCTURA DEL MENSAJE:
  1. Saludo inicial: Iniciando con "${timeInfo.greeting}" y presentándote siempre como JanIA.
  2. Desarrollo temático: Didáctico, conciso y con ejemplos reales de Colombia.
  3. Cierre y Venta de la Idea (Llamado a la Acción): Invita a invitar a más colegas a la red y a interactuar con JanIA en https://vecy-network.vercel.app/jania o por WhatsApp.

Debes responder en formato JSON estricto con tres campos:
{
  "voiceText": "Texto continuo optimizado para locución de voz TTS (sin markdown, sin viñetas, sin emojis, números escritos en palabras, 70-100 palabras)",
  "captionText": "Texto formateado para WhatsApp con emojis, negritas en títulos, viñetas estructuradas, llamado a la acción y enlace web al final",
  "chosenTheme": "juridico | tributario | avaluos | marketing | matches | podcast | periodista | noticias | soporte | primicia"
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Genera el contenido para hoy (${fechaBogota}, ${timeInfo.period}):\n${promptEspecifico}` }
      ],
      responseFormat: { type: "json_object" },
      temperature: 0.8
    });
    const rawContent = (response as any)?.choices?.[0]?.message?.content?.trim();
    if (rawContent) {
      const parsed = JSON.parse(rawContent);
      if (parsed.voiceText && parsed.captionText) {
        const rawVoice = parsed.voiceText.replace(/\[.*?\]/g, '').replace(/[*_#]/g, '').trim();
        const cleanVoice = enforceGreetingAccuracy(enforceJanIAIdentity(rawVoice), timeInfo.period);
        const cleanCaption = enforceGreetingAccuracy(enforceJanIAIdentity(parsed.captionText.trim()), timeInfo.period);
        return {
          voiceText: cleanVoice,
          captionText: cleanCaption,
          chosenTheme: parsed.chosenTheme || undefined
        };
      }
    }
  } catch (err: any) {
    console.warn(`[CRON-LLM-Guion] Falló generación con Gemini (${err.message}). Usando contenidos de respaldo.`);
  }

  return {
    voiceText: enforceGreetingAccuracy(enforceJanIAIdentity(fallbackVoice), timeInfo.period),
    captionText: enforceGreetingAccuracy(enforceJanIAIdentity(fallbackCaption), timeInfo.period)
  };
}

