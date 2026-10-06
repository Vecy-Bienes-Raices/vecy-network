/**
 * SERVICIO OFICIAL DE CONSULTA Y ASISTENCIA DE PREDIAL BOGOTÁ — VECY NETWORK
 * Integración con la Secretaría Distrital de Hacienda (SDH) e IDECA / Catastro Distrital.
 * Permite a los asesores y clientes consultar el CHIP, liquidar el impuesto predial y obtener
 * las instrucciones de descarga oficial de la factura predial.
 *
 * REGLA DOCTRINAL v32.14:
 * - JanIA JAMÁS inventa datos catastrales (dirección, matrícula, avalúo, links de factura).
 * - Si no puede consultar o resolver un dato, lo dice honestamente y guía al usuario.
 * - Los links de descarga SIEMPRE apuntan al portal oficial real de la SDH.
 */

export const VIRAL_LOOP_MESSAGE = 
  `😃 ¿Qué tanto nos recomendarías?\n👎 | 👍 | ❤️`;

export const GOOGLE_REVIEW_MESSAGE = 
  `⭐ ¿Podrías darnos "Tu Opinión" y "Calificar" nuestro servicio? Es muy importante para nosotros.\n*COMENTA Y CALIFICA AQUÍ:*\n👉 https://g.page/r/CctNbwU6UpX5EBM/review 👍 Gracias\n\n¡Que tengas una excelente jornada y muchos éxitos en tus cierres! 🏢✨`;

export function getChannelInviteGoodbyeMessage(displayName?: string): string {
  const namePart = displayName ? `, ${displayName}` : "";
  return `Con todo el gusto${namePart}. Para nosotros en VECY es un verdadero placer apoyarte en tus proyectos y gestiones inmobiliarias. Antes de que te vayas, te invito a unirte a nuestro Canal Oficial de WhatsApp (https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b), donde compartimos cosas que te pueden interesar.`;
}

export interface PredialDetectionResult {
  found: boolean;
  chip?: string;
  cedula?: string;
  nit?: string;
  tipoDoc?: 'CC' | 'NIT' | 'CE';
  matricula?: string;
  direccion?: string;
  avaluoCatastral?: number;
  estrato?: number;
  isCertificadoPago?: boolean;
}

export interface PredialReportResult {
  isPredialRequest: boolean;
  chip?: string;
  cedula?: string;
  reportText?: string;
  pdfBuffer?: Buffer;
  pdfFileName?: string;
  pdfUrl?: string;
  nombreContribuyente?: string;
  numBP?: string;
  isCertificado?: boolean;
}

export interface DownloadPredialPdfResult {
  success: boolean;
  pdfBuffer?: Buffer;
  pdfFileName?: string;
  pdfUrl?: string;
  nombreContribuyente?: string;
  numBP?: string;
  isCertificado?: boolean;
  errorMessage?: string;
}

/**
 * Decodifica de forma segura los mensajes de error/estado devueltos por la Secretaría de Hacienda.
 * Soporta tanto cadenas en base64 nativo de la SDH como texto plano normal sin corromper el contenido.
 */
export function decodeSdhMessage(raw: any): string {
  if (!raw) return '';
  let str = typeof raw === 'string' ? raw.trim() : String(raw).trim();

  // Caso A: Array serializado de números ASCII devuelto por SAP Hybris (ej: "[83, 72, 86, 105, ...]")
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const parsedArr = JSON.parse(str);
      if (Array.isArray(parsedArr) && parsedArr.every(n => typeof n === 'number')) {
        str = Buffer.from(parsedArr).toString('utf8');
      }
    } catch (_) {}
  }

  // Caso B: Base64 estándar (con o sin padding)
  const isBase64Pattern = /^[A-Za-z0-9+/]+={0,2}$/.test(str) && !str.includes(' ') && str.length % 4 === 0 && str.length >= 4;
  if (isBase64Pattern) {
    try {
      const dec = Buffer.from(str, 'base64').toString('utf8');
      const unescaped = dec
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#([0-9]+);/g, (_, decCode) => String.fromCharCode(parseInt(decCode, 10)))
        .replace(/&lt;[^&]*&gt;?/gi, '')
        .replace(/<[^>]*>?/gm, '')
        .replace(/&[a-z]+;/gi, ' ');
      if (/^[\x20-\x7E\xA0-\xFF\s\wáéíóúÁÉÍÓÚñÑ.,;:!¡?¿()\-–—]+$/.test(unescaped) && unescaped.trim().length > 0) {
        return unescaped.trim();
      }
    } catch (_) {}
  }

  // Caso C: Texto plano o con entidades HTML
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, decCode) => String.fromCharCode(parseInt(decCode, 10)))
    .replace(/&lt;[^&]*&gt;?/gi, '')
    .replace(/<[^>]*>?/gm, '')
    .replace(/&[a-z]+;/gi, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// SANITIZACIÓN DE DOCUMENTOS — REGLA DOCTRINAL v32.14
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Limpia un número de documento (CC, NIT, CE) eliminando puntos, comas, espacios y guiones.
 * Para NITs: elimina el dígito de verificación (el dígito tras el guión final).
 * Ejemplos:
 *   "19.386.159"      → "19386159"
 *   "8600030201-2"    → "8600030201"
 *   "860.003.020-1"   → "860003020"  (NIT sin DV)
 *   "8.600.030.201"   → "8600030201"
 */
export function sanitizeDocumentNumber(raw: string, isNit = false): string {
  if (!raw) return '';
  // Primero eliminar todo excepto dígitos y guión (para detectar DV al final)
  let cleaned = raw.replace(/[\s.,]/g, ''); // quitar puntos, comas, espacios
  // Si es NIT o tiene guión + 1 dígito al final → eliminar dígito verificador
  // Patrón: dígitos-dígito (guión seguido de 1 dígito al final)
  const dvMatch = cleaned.match(/^(\d+)-(\d)$/);
  if (dvMatch) {
    // Tiene dígito verificador explícito con guión → quitar el dígito verificador
    cleaned = dvMatch[1];
  } else if (isNit) {
    // REGLA DOCTRINAL v32.32 (Eduardo Rivera):
    // En Colombia, los NITs ante la Secretaría Distrital de Hacienda son siempre de 9 dígitos sin DV.
    // Si el usuario entrega 10 dígitos (porque incluyó el dígito de verificación),
    // JanIA es inteligente y le quita automáticamente el último dígito, procesando con los 9 dígitos exactos.
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length === 10) {
      cleaned = digitsOnly.slice(0, 9);
    } else if (digitsOnly.length > 10) {
      cleaned = digitsOnly.slice(0, 9);
    } else {
      cleaned = digitsOnly;
    }
  } else {
    cleaned = cleaned.replace(/\D/g, '');
  }
  return cleaned.replace(/\D/g, '');
}

/**
 * Detecta si un texto contiene una solicitud de predial,
 * extrayendo CHIP, cédula/NIT (con sanitización), matrícula, dirección, estrato y avalúo si los hay.
 */
export function extractChipAndCedulaForPredial(text: string): PredialDetectionResult {
  if (!text || typeof text !== 'string') return { found: false };

  const clean = text.trim();
  const lower = clean.toLowerCase();

  // 1. Buscar código CHIP de Bogotá: "AAA" + 4 dígitos + 4 caracteres alfanuméricos
  const chipMatch = clean.match(/\b(AAA[0-9]{4}[A-Z0-9]{4})\b/i);

  // 2. Detectar tipo de documento y extraer el número (con puntos, comas, dígito verificador)
  let cedula: string | undefined;
  let nit: string | undefined;
  let tipoDoc: 'CC' | 'NIT' | 'CE' = 'CC';

  // Buscar NIT primero (incluyendo con puntos, guiones y DV)
  const nitMatch = clean.match(/(?:nit|n\.i\.t\.?)\s*[:#]?\s*([\d.,\s\-]{7,20})/i);
  if (nitMatch && nitMatch[1]) {
    const rawNit = nitMatch[1].trim();
    nit = sanitizeDocumentNumber(rawNit, true);
    tipoDoc = 'NIT';
  }

  // Buscar cédula de extranjería
  const ceMatch = clean.match(/(?:c\.?e\.?|c[ée]dula\s+de\s+extranjer[ií]a)\s*[:#]?\s*([\d.,\s\-]{6,15})/i);
  if (!nit && ceMatch && ceMatch[1]) {
    cedula = sanitizeDocumentNumber(ceMatch[1].trim());
    tipoDoc = 'CE';
  }

  // Buscar CC o cédula genérica
  if (!nit && !cedula) {
    const ccMatch = clean.match(/(?:c[ée]dula(?:\s+de\s+ciudadan[ií]a)?|cc|documento)\s*[:#]?\s*([\d.,\s\-]{6,15})/i);
    if (ccMatch && ccMatch[1]) {
      cedula = sanitizeDocumentNumber(ccMatch[1].trim());
      tipoDoc = 'CC';
    }
  }

  // Fallback: cualquier número de 6-12 dígitos que no sea el CHIP
  if (!nit && !cedula) {
    // Buscar número con posibles puntos/comas que no sea el CHIP
    const numWithPuncMatch = clean.match(/\b([\d]{1,3}(?:[.,][\d]{3})+(?:-\d)?)\b/);
    if (numWithPuncMatch && numWithPuncMatch[1]) {
      const raw = numWithPuncMatch[1];
      const hasNitKeyword = lower.includes('nit');
      const cleaned = sanitizeDocumentNumber(raw, hasNitKeyword);
      if (cleaned.length >= 6 && cleaned.length <= 12) {
        if (hasNitKeyword) {
          nit = cleaned;
          tipoDoc = 'NIT';
        } else {
          cedula = cleaned;
        }
      }
    } else {
      const anyNumberMatch = clean.match(/\b([0-9]{6,12})\b/);
      if (anyNumberMatch && anyNumberMatch[1] && (!chipMatch || !chipMatch[0].includes(anyNumberMatch[1]))) {
        const candidate = anyNumberMatch[1];
        const hasNitKeyword = lower.includes('nit');
        if (hasNitKeyword) {
          nit = sanitizeDocumentNumber(candidate, true);
          tipoDoc = 'NIT';
        } else {
          cedula = candidate;
        }
      }
    }
  }

  // 3. Buscar Matrícula Inmobiliaria
  let matricula: string | undefined;
  const matMatch1 = clean.match(/\b(50[CNS]-[0-9]{5,10})\b/i);
  const matMatch2 = clean.match(/(?:matr[íi]cula(?:\s+inmobiliaria)?|folio|fmi)\s*[:#]?\s*([0-9A-Za-z\-]+)/i);
  if (matMatch1 && matMatch1[1]) {
    matricula = matMatch1[1].toUpperCase();
  } else if (matMatch2 && matMatch2[1]) {
    matricula = matMatch2[1].toUpperCase();
  }

  // 4. Buscar Dirección del predio
  let direccion: string | undefined;
  const dirMatch1 = clean.match(/(?:direcci[oó]n(?:\s+del\s+predio)?|ubicaci[oó]n)\s*[:#]?\s*([A-Za-z0-9#\s\-\.,]+?)(?=(?:matr[íi]cula|aval[uú]o|chip|c[ée]dula|estrato|valor|$))/i);
  const dirMatch2 = clean.match(/\b((?:cll?e?|cra?|carrera|diagonal|diag|transversal|transv?|av(?:enida)?|calle)\s+[0-9]+[A-Za-z]?\s*#?\s*[0-9]+[A-Za-z]?\s*[-–]\s*[0-9]+)\b/i);
  if (dirMatch1 && dirMatch1[1] && dirMatch1[1].trim().length >= 5) {
    direccion = dirMatch1[1].trim();
  } else if (dirMatch2 && dirMatch2[1]) {
    direccion = dirMatch2[1].trim();
  }

  // 5. Buscar Estrato (1 a 6)
  let estrato: number | undefined;
  const estratoMatch = clean.match(/\bestrato\s*([1-6])\b/i);
  if (estratoMatch && estratoMatch[1]) {
    estrato = parseInt(estratoMatch[1], 10);
  }

  // 6. Buscar Avalúo Catastral
  let avaluoCatastral: number | undefined;
  const avaluoMatch = clean.match(/(?:aval[uú]o(?:\s+catastral)?|valor\s+catastral)\s*[:#]?\s*\$?\s*([0-9.,]+(?:\s*(?:millones|m))?)/i);
  if (avaluoMatch && avaluoMatch[1]) {
    const rawVal = avaluoMatch[1].toLowerCase();
    if (rawVal.includes('millon') || rawVal.includes('m')) {
      const numOnly = parseFloat(rawVal.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isNaN(numOnly)) avaluoCatastral = Math.round(numOnly * 1_000_000);
    } else {
      const numOnly = parseInt(rawVal.replace(/\D/g, ''), 10);
      if (!isNaN(numOnly) && numOnly > 0) avaluoCatastral = numOnly;
    }
  }

  // Palabras clave de intención de certificado de pago o paz y salvo
  const certKeywords = [
    'certificado de pago', 'certificado de impuesto', 'certificacion de pago',
    'paz y salvo', 'recibo pagado', 'comprobante de pago', 'pago de impuesto'
  ];
  const isCertificadoPago = certKeywords.some(kw => lower.includes(kw));

  // Palabras clave de intención de predial
  const keywords = ['predial', 'impuesto predial', 'factura predial', 'chip', 'paz y salvo predial', 'liquidar predial', ...certKeywords];
  const hasKeyword = keywords.some(kw => lower.includes(kw));

  if (chipMatch && chipMatch[1]) {
    return {
      found: true,
      chip: chipMatch[1].toUpperCase(),
      cedula,
      nit,
      tipoDoc,
      matricula,
      direccion,
      estrato,
      avaluoCatastral,
      isCertificadoPago
    };
  }

  if (hasKeyword && (cedula || nit || matricula || direccion)) {
    return {
      found: true,
      cedula,
      nit,
      tipoDoc,
      matricula,
      direccion,
      estrato,
      avaluoCatastral,
      isCertificadoPago
    };
  }

  return { found: false };
}

/**
 * Calcula la liquidación estimada del Impuesto Predial Unificado de Bogotá
 * según el Estatuto Tributario Distrital (Acuerdos 648 de 2016 y 780 de 2020).
 * ⚠️ Solo se usa cuando el usuario proporciona el avalúo catastral directamente.
 */
export function liquidarPredialEstimadoBogota(avaluoCatastral: number, estrato: number = 4, esResidencial: boolean = true) {
  const avaluo = Math.max(0, avaluoCatastral);

  // Tabla progresiva de tarifas por milaje (Bogotá SDH)
  let tarifaPorMil = 6.5;
  if (!esResidencial) {
    tarifaPorMil = 10.5; // Comercial, oficinas, bodegas
  } else {
    switch (estrato) {
      case 1:
      case 2:
        tarifaPorMil = 2.5;
        break;
      case 3:
        tarifaPorMil = 4.5;
        break;
      case 4:
        tarifaPorMil = 6.5;
        break;
      case 5:
        tarifaPorMil = 8.5;
        break;
      case 6:
      default:
        tarifaPorMil = 11.0;
        break;
    }
  }

  const impuestoPleno = Math.round((avaluo * tarifaPorMil) / 1000);
  const descuentoProntoPago = Math.round(impuestoPleno * 0.10);
  const impuestoConDescuento = impuestoPleno - descuentoProntoPago;
  const aporteVoluntario = Math.round(impuestoPleno * 0.10);

  return {
    avaluoCatastral: avaluo,
    estrato,
    tarifaPorMil,
    impuestoPleno,
    descuentoProntoPago,
    impuestoConDescuento,
    aporteVoluntario
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GESTIÓN DE SESIONES PENDIENTES DE CONSULTA PREDIAL
// ─────────────────────────────────────────────────────────────────────────────
interface PendingPredialSession {
  chip: string;
  matricula?: string;
  direccion?: string;
  estrato?: number;
  avaluoCatastral?: number;
  timestamp: number;
}

const pendingPredialSessions = new Map<string, PendingPredialSession>();

export function setPendingPredialSession(senderId: string, session: { chip: string; matricula?: string; direccion?: string; estrato?: number; avaluoCatastral?: number }) {
  if (!senderId) return;
  pendingPredialSessions.set(senderId, {
    ...session,
    timestamp: Date.now()
  });
}

export function hasPendingPredialSession(senderId: string): boolean {
  if (!senderId) return false;
  const session = pendingPredialSessions.get(senderId);
  if (!session) return false;
  if (Date.now() - session.timestamp > 15 * 60 * 1000) {
    pendingPredialSessions.delete(senderId);
    return false;
  }
  return true;
}

export function getPendingPredialSession(senderId: string): PendingPredialSession | undefined {
  if (!senderId) return undefined;
  const session = pendingPredialSessions.get(senderId);
  if (!session) return undefined;
  if (Date.now() - session.timestamp > 15 * 60 * 1000) {
    pendingPredialSessions.delete(senderId);
    return undefined;
  }
  return session;
}

export function clearPendingPredialSession(senderId: string) {
  if (!senderId) return;
  pendingPredialSessions.delete(senderId);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXTO DE GUÍA — Para usuarios que preguntan cómo usar el servicio
// ─────────────────────────────────────────────────────────────────────────────
export const PREDIAL_HELP_TEXT =
  `🏛️ *¿Cómo solicitar tu Predial a JanIA?* Es muy sencillo:\n\n` +
  `1️⃣ *Envíame en privado* el CHIP del inmueble y el NIT o CC del propietario en un solo mensaje:\n\n` +
  `📝 *Ejemplo:*\n` +
  `_JanIA, predial: CHIP AAA0205AYFZ y NIT 8600030201_\n\n` +
  `ℹ️ *¿Dónde encuentro el CHIP?* En cualquier factura de predial anterior o en el recibo del impuesto.\n\n` +
  `✅ *JanIA acepta:*\n` +
  `• CC con o sin puntos (ej: 19.386.159 o 19386159)\n` +
  `• NIT con o sin dígito de verificación (ej: 860.030.201-2 o 8600030201)\n` +
  `• Cédula de Extranjería (CE)\n\n` +
  `📲 *Chat directo con JanIA:* https://vecy-network.vercel.app/jania\n\n` +
  `📢 *Síguenos para más herramientas gratuitas:*\n` +
  `👉 https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b`;

export const CEDULA_HELP_TEXT =
  `🪪 *¿Cómo verificar un documento de identidad con JanIA?* Facilísimo:\n\n` +
  `1️⃣ *Envíame en privado* el tipo y número de documento en un solo mensaje:\n\n` +
  `📝 *Ejemplos:*\n` +
  `• _JanIA, verificar cédula: 19.386.159_ ✅\n` +
  `• _JanIA, verificar cédula: 1018456789_ ✅\n` +
  `• _JanIA, verificar CE: 654321_ ✅ (Cédula de Extranjería)\n` +
  `• _JanIA, verificar pasaporte: AB123456_ ✅\n\n` +
  `📌 *Nota:* Puedes escribir el número con o sin puntos o guiones — JanIA lo procesa automáticamente.\n\n` +
  `🔍 *¿Qué información recibirás?*\n` +
  `Nombre completo oficial de la persona registrada en la Policía Nacional de Colombia.\n\n` +
  `🛡️ *Este servicio es 100% gratuito* y consulta directamente la base oficial de la Policía Nacional.\n\n` +
  `📲 *Chat directo con JanIA:* https://vecy-network.vercel.app/jania\n\n` +
  `📢 *Síguenos para más herramientas gratuitas:*\n` +
  `👉 https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b`;

// ─────────────────────────────────────────────────────────────────────────────
// DESCARGA AUTOMATIZADA OFICIAL DE FACTURA PREDIAL — REGLA DOCTRINAL v32.19
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Descarga automatizada oficial de la Factura Predial Bogotá desde el portal oficial de la SDH.
 * Resuelve el reCAPTCHA v2 con 2Captcha, interactúa con el formulario oficial sin inventar datos,
 * y descarga el archivo PDF oficial con código de barras listo para pagar.
 */
export async function downloadPredialInvoicePdf(
  tipoDocInput: string,
  numDoc: string,
  chip: string,
  options?: { isCertificadoPago?: boolean }
): Promise<DownloadPredialPdfResult> {
  const apiKey = process.env.TWOCAPTCHA_API_KEY || '673ddb810e9f700065ccbe6034f26629';
  if (!apiKey) {
    return {
      success: false,
      errorMessage: 'Servicio de resolución de CAPTCHA no configurado.'
    };
  }

  // Normalizar tipo de documento para el select del portal SDH (Doctrina v32.34: Soporte exhaustivo para las 10 opciones de la SDH):
  let tipoDoc = tipoDocInput.toUpperCase().trim();
  if (tipoDoc.includes('NIT') && (tipoDoc.includes('EXTRANJ') || tipoDoc.includes('NITE'))) {
    tipoDoc = 'NITE';
  } else if (tipoDoc.includes('NIT')) {
    tipoDoc = 'NIT';
  } else if (tipoDoc.includes('EXTRANJER') || tipoDoc === 'CE') {
    tipoDoc = 'CE';
  } else if (tipoDoc.includes('PASAPORTE') || tipoDoc === 'PA' || tipoDoc === 'PAS') {
    tipoDoc = 'PA';
  } else if (tipoDoc.includes('TARJETA') && (tipoDoc.includes('EXTRANJ') || tipoDoc === 'TIE')) {
    tipoDoc = 'TIE';
  } else if (tipoDoc.includes('TARJETA') || tipoDoc === 'TI') {
    tipoDoc = 'TI';
  } else if (tipoDoc.includes('NUIP')) {
    tipoDoc = 'NUIP';
  } else if (tipoDoc.includes('DIPLOMAT') || tipoDoc === 'CD') {
    tipoDoc = 'CD';
  } else if (tipoDoc.includes('PPT') || tipoDoc.includes('PROTECCION') || tipoDoc.includes('PROTECCIÓN')) {
    tipoDoc = 'PPT';
  } else {
    tipoDoc = 'CC';
  }

  const cleanNumDoc = sanitizeDocumentNumber(numDoc, tipoDoc === 'NIT');
  const cleanChip = chip.toUpperCase().trim();

  let browser: any = null;
  try {
    const { Solver } = await import('@2captcha/captcha-solver');
    const solver = new Solver(apiKey);

    const puppeteer = (await import('puppeteer')).default;
    const fs = await import('fs');

    const executablePath = fs.existsSync('/usr/bin/google-chrome')
      ? '/usr/bin/google-chrome'
      : undefined;

    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(60000);

    // Blindaje contra helper __name inyectado por transpiladores (esbuild/tsx) en funciones de evaluate
    await page.evaluateOnNewDocument(() => {
      (window as any).__name = (target: any) => target;
    });

    let buscarInfoData: any = null;
    page.on('response', async (res: any) => {
      const url = res.url();
      if (url.includes('buscarInfo')) {
        try {
          buscarInfoData = await res.json();
        } catch (_) {}
      }
    });

    // 1. Navegar al portal oficial de descarga directa sin registro previo
    try {
      await page.goto('https://nuevaoficinavirtual.shd.gov.co/bogota/es/descargaFacturaVA', {
        waitUntil: 'networkidle2',
        timeout: 45000
      });
    } catch (gotoErr: any) {
      if (gotoErr?.message?.includes('detached') || gotoErr?.message?.includes('timeout') || gotoErr?.message?.includes('LifecycleWatcher')) {
        console.warn('[PREDIAL-DOWNLOAD] Reintentando page.goto con domcontentloaded...');
        await page.goto('https://nuevaoficinavirtual.shd.gov.co/bogota/es/descargaFacturaVA', {
          waitUntil: 'domcontentloaded',
          timeout: 45000
        });
      } else {
        throw gotoErr;
      }
    }

    // 2. Seleccionar tipo de impuesto: Predial (0001)
    await page.select('#claveImpuesto', '0001');
    await page.evaluate(() => {
      if ((window as any).ACC && (window as any).ACC.descargaFacturaVA) {
        (window as any).ACC.descargaFacturaVA.showTag(document.getElementById('claveImpuesto'), '');
      }
    });
    await new Promise(r => setTimeout(r, 600));

    // 3. Completar formulario con datos del predio y propietario
    await page.select('#tipoDoc', tipoDoc);
    await page.type('#numDoc', cleanNumDoc);
    await page.type('#claveObjeto', cleanChip);

    // 4. Aceptar tratamiento de datos
    await page.evaluate(() => {
      const chk = document.getElementById('chkTratamientoDatos') as HTMLInputElement | null;
      if (chk) {
        chk.checked = true;
        if ((window as any).ACC && (window as any).ACC.descargaFacturaVA) {
          (window as any).ACC.descargaFacturaVA.tratamientoDatos(chk);
        }
      }
    });

    // 5. Resolver reCAPTCHA v2 oficial de la SDH
    console.log(`[PREDIAL-DOWNLOAD] Resolviendo reCAPTCHA para CHIP ${cleanChip} y ${tipoDoc} ${cleanNumDoc}...`);
    const captcha = await solver.recaptcha({
      googlekey: '6LfZ2bUsAAAAAD7QUEXWj2JY1JJcphwSHfUJYatO',
      pageurl: 'https://nuevaoficinavirtual.shd.gov.co/bogota/es/descargaFacturaVA'
    });

    // 6. Inyectar token y disparar búsqueda oficial
    await page.evaluate((token: string) => {
      const el = document.getElementById('g-recaptcha-response') as HTMLInputElement | null;
      if (el) el.value = token;
      (window as any).recaptchaResponse = token;
      const btn = document.getElementById('facBuscar') as HTMLButtonElement | null;
      if (btn) btn.disabled = false;
      if ((window as any).ACC && (window as any).ACC.descargaFacturaVA) {
        (window as any).ACC.descargaFacturaVA.showDownload();
      }
    }, captcha.data);

    // 7. Esperar URL de descarga o mensaje de error del portal
    let relativePdfUrl = '';
    let errorMessage = '';
    const startTime = Date.now();

    while (Date.now() - startTime < 25000) {
      const state = await page.evaluate(() => {
        const dh = document.getElementById('downloadHelper') as HTMLAnchorElement | null;
        const href = dh ? dh.getAttribute('href') || dh.href : '';
        const errModal = document.getElementById('dialogMensajesContent');
        const swal = document.querySelector('.swal2-html-container');
        const validaciones = document.getElementById('mensajesValidaciones');
        return {
          href,
          errText: (errModal && errModal.innerText) || (swal && (swal as HTMLElement).innerText) || (validaciones && validaciones.innerText) || ''
        };
      });

      if (state.href && (state.href.includes('/bogota/medias/') || state.href.includes('.pdf'))) {
        relativePdfUrl = state.href;
        break;
      }
      if (state.errText && state.errText.trim().length > 3) {
        errorMessage = state.errText.trim();
        break;
      }
      if (buscarInfoData && buscarInfoData.dataForm?.urlDownload) {
        relativePdfUrl = buscarInfoData.dataForm.urlDownload;
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    // Detección de pago realizado, solicitud explícita de Certificado de Pago o error oficial de Hacienda
    let isAlreadyPaid = false;
    let sdhInfoErrorMessage = '';
    if (buscarInfoData?.dataForm?.errores && Array.isArray(buscarInfoData.dataForm.errores)) {
      for (const err of buscarInfoData.dataForm.errores) {
        const rawMsg = err?.txt_msj || err?.txtmsj;
        if (rawMsg) {
          const decoded = decodeSdhMessage(rawMsg);
          const lowerDec = decoded.toLowerCase();
          if (lowerDec.includes('pagada') || lowerDec.includes('pago') || lowerDec.includes('cancelad')) {
            isAlreadyPaid = true;
          } else if (decoded.trim().length > 3) {
            sdhInfoErrorMessage = decoded.trim();
          }
        }
      }
    }

    const wantCertificado = options?.isCertificadoPago || isAlreadyPaid;

    if (wantCertificado) {
      console.log(`[PREDIAL-DOWNLOAD] Solicitud de Certificado de Pago detectada para CHIP ${cleanChip} (explícito: ${!!options?.isCertificadoPago}, pagada: ${isAlreadyPaid}). Resolviendo reCAPTCHA v2 para certificado...`);
      try {
        const captchaCert = await solver.recaptcha({
          googlekey: '6LfZ2bUsAAAAAD7QUEXWj2JY1JJcphwSHfUJYatO',
          pageurl: 'https://nuevaoficinavirtual.shd.gov.co/bogota/es/descargaFacturaVA'
        });

        const tokenCert = captchaCert.data;
        const bpParam = buscarInfoData?.numBP || buscarInfoData?.dataForm?.numBP || '';

        const certAjaxResp: any = await page.evaluate(`
          new Promise((resolve) => {
            try {
              const numBP = ${JSON.stringify(bpParam)} || (document.getElementById('numBP') && document.getElementById('numBP').value) || (window.buscarInfoData && window.buscarInfoData.numBP) || '1005119715';
              const numObjeto = (document.getElementById('claveObjeto') && document.getElementById('claveObjeto').value ? document.getElementById('claveObjeto').value.toUpperCase() : '');
              const year = (new Date()).getFullYear().toString();
              const certUrl = (window.ACC && window.ACC.descargaFacturaVADescargarCertificadoPagoURL) || '/bogota/es/descargaFacturaVA/descargarCertificadoPago';
              const token = ${JSON.stringify(tokenCert)};

              if (window.$ && window.$.ajax) {
                window.$.ajax({
                  url: certUrl,
                  data: {
                    numBP: numBP,
                    numObjeto: numObjeto,
                    tipoOperacion: '0001',
                    anoGravable: year,
                    recaptchaResponse: token
                  },
                  type: 'POST',
                  success: function(resp) {
                    resolve({ success: true, resp: resp });
                  },
                  error: function(xhr, status, err) {
                    resolve({ success: false, status: status, err: err ? err.toString() : '', text: xhr ? xhr.responseText : '' });
                  }
                });
              } else {
                resolve({ success: false, err: 'jQuery not found' });
              }
            } catch (e) {
              resolve({ success: false, err: e.message });
            }
          })
        `);

        if (certAjaxResp?.success && certAjaxResp?.resp?.urlDownload) {
          const relCertUrl = certAjaxResp.resp.urlDownload;
          const fullCertUrl = relCertUrl.startsWith('http')
            ? relCertUrl
            : new URL(relCertUrl, 'https://nuevaoficinavirtual.shd.gov.co').href;

          console.log(`[PREDIAL-DOWNLOAD] Descargando Certificado de Pago oficial desde: ${fullCertUrl}`);
          const certFetch = await fetch(fullCertUrl);
          if (certFetch.ok) {
            const certBuf = Buffer.from(await certFetch.arrayBuffer());
            if (certBuf.slice(0, 5).toString() === '%PDF-') {
              return {
                success: true,
                pdfBuffer: certBuf,
                pdfFileName: `Certificado_Pago_${cleanChip}_2026.pdf`,
                pdfUrl: fullCertUrl,
                nombreContribuyente: buscarInfoData?.nombreContribuyente ? buscarInfoData.nombreContribuyente.trim() : undefined,
                numBP: buscarInfoData?.numBP || certAjaxResp.resp.numBP,
                isCertificado: true
              };
            }
          }
        }

        // Si la SDH devolvió un error específico decodificarlo
        let sdhErrorMessage = '';
        if (certAjaxResp?.resp?.errores && Array.isArray(certAjaxResp.resp.errores)) {
          for (const err of certAjaxResp.resp.errores) {
            const rawMsg = err?.txt_msj || err?.txtmsj;
            if (rawMsg) {
              const dec = decodeSdhMessage(rawMsg);
              if (dec && dec.trim()) {
                sdhErrorMessage = dec.trim();
              }
            }
          }
        }

        if (options?.isCertificadoPago) {
          return {
            success: false,
            errorMessage: sdhErrorMessage || 'No se pudo generar el Certificado de Pago en este momento. Es posible que el pago aún no esté asentado en la Secretaría de Hacienda o los datos no coincidan.'
          };
        }
      } catch (certErr: any) {
        console.warn('[PREDIAL-DOWNLOAD] Error intentando descargar certificado de pago:', certErr?.message);
        if (options?.isCertificadoPago) {
          return {
            success: false,
            errorMessage: 'No se pudo generar el Certificado de Pago en este momento. Es posible que el pago aún no esté asentado en la Secretaría de Hacienda o los datos no coincidan.'
          };
        }
      }
    }

    if (!relativePdfUrl) {
      return {
        success: false,
        errorMessage: sdhInfoErrorMessage || errorMessage || 'No se encontró factura predial disponible en la Secretaría de Hacienda para estos datos. Verifica que el documento corresponda al propietario a 1 de enero de 2026.',
        nombreContribuyente: buscarInfoData?.nombreContribuyente ? buscarInfoData.nombreContribuyente.trim() : undefined,
        numBP: buscarInfoData?.numBP || buscarInfoData?.dataForm?.numBP
      };
    }

    // 8. Construir URL absoluta y descargar el buffer binario del PDF
    const fullPdfUrl = relativePdfUrl.startsWith('http')
      ? relativePdfUrl
      : new URL(relativePdfUrl, 'https://nuevaoficinavirtual.shd.gov.co').href;

    console.log(`[PREDIAL-DOWNLOAD] Descargando PDF oficial desde: ${fullPdfUrl}`);
    const pdfResponse = await fetch(fullPdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Error HTTP al descargar PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
    }

    const arrayBuffer = await pdfResponse.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Validar cabecera PDF
    const isPdfHeader = pdfBuffer.slice(0, 5).toString() === '%PDF-';
    if (!isPdfHeader) {
      console.warn(`[PREDIAL-DOWNLOAD] La respuesta descargada no tiene cabecera PDF. Tamaño: ${pdfBuffer.length}`);
      return {
        success: false,
        errorMessage: 'El portal de Hacienda no devolvió un documento PDF válido.'
      };
    }

    const nombreContribuyente = buscarInfoData?.nombreContribuyente ? buscarInfoData.nombreContribuyente.trim() : undefined;

    return {
      success: true,
      pdfBuffer,
      pdfFileName: `Factura_Predial_${cleanChip}_2026.pdf`,
      pdfUrl: fullPdfUrl,
      nombreContribuyente,
      numBP: buscarInfoData?.numBP,
      isCertificado: false
    };
  } catch (err: any) {
    console.error('[PREDIAL-DOWNLOAD] Error descargando factura predial:', err);
    return {
      success: false,
      errorMessage: err?.message || 'Error de conexión con la Secretaría Distrital de Hacienda.'
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL — Genera el informe y guía oficial de Predial
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genera el informe institucional de consulta y asistencia del Impuesto Predial de Bogotá.
 *
 * REGLA DOCTRINAL v32.14 / v32.19 — HONESTIDAD ABSOLUTA Y ASISTENCIA ACTIVA:
 * - NUNCA se inventan datos (dirección, matrícula, avalúo, links de factura).
 * - Si solo se tiene el CHIP, se pide la cédula/NIT.
 * - Si se tienen CHIP + doc del propietario → se descarga automáticamente el PDF oficial
 *   con código de barras desde el portal de la SDH y se entrega como archivo adjunto.
 * - Si la descarga automática no es posible → se explica honestamente el motivo y se entregan
 *   las instrucciones oficiales con el link oficial real.
 * - Si el usuario proveyó el avalúo catastral directamente → se hace la estimación y se da el link oficial.
 */
export async function executePredialAssistanceFromWhatsApp(
  text: string,
  senderId?: string,
  isPrivateDm?: boolean,
  options?: { skipDownload?: boolean }
): Promise<PredialReportResult> {
  let detection = extractChipAndCedulaForPredial(text);

  // Si no se encontró CHIP en el texto actual, pero el usuario tiene una sesión pendiente de CHIP
  if (!detection.chip && senderId && hasPendingPredialSession(senderId)) {
    const pending = getPendingPredialSession(senderId);
    if (pending) {
      // Buscar si el texto actual contiene una cédula, NIT o número
      // Incluir sanitización de números con puntos/comas
      const rawNumMatch = text.match(/([\d]{1,3}(?:[.,][\d]{3})+(?:-\d)?|\b\d{6,12}\b)/);
      if (rawNumMatch && rawNumMatch[1]) {
        const lower = text.toLowerCase();
        const isNitContext = lower.includes('nit') || lower.includes('n.i.t');
        const cleanedNum = sanitizeDocumentNumber(rawNumMatch[1], isNitContext);
        if (cleanedNum.length >= 6) {
          detection = {
            found: true,
            chip: pending.chip,
            cedula: isNitContext ? undefined : cleanedNum,
            nit: isNitContext ? cleanedNum : undefined,
            tipoDoc: isNitContext ? 'NIT' : 'CC',
            matricula: pending.matricula,
            direccion: pending.direccion,
            estrato: pending.estrato,
            avaluoCatastral: pending.avaluoCatastral
          };
          clearPendingPredialSession(senderId);
        }
      }
    }
  }

  if (!detection.found) {
    return { isPredialRequest: false };
  }

  const chip = detection.chip;
  const docNumber = detection.nit || detection.cedula;
  const docLabel = detection.tipoDoc === 'NIT' ? 'NIT' : (detection.tipoDoc === 'CE' ? 'Cédula de Extranjería' : 'Cédula');

  // ────────────────────────────────────────────────────────────────────────
  // CASO 1: Solo CHIP, sin documento del propietario
  // → Pedir cédula o NIT del propietario
  if (chip && !docNumber) {
    if (senderId) {
      setPendingPredialSession(senderId, { chip });
    }

    const reportText =
      `🛡️ *LIQUIDACIÓN PREDIAL — VECY BIENES RAÍCES - BOGOTÁ* 🇨🇴\n\n` +
      `🏠 *Predio CHIP detectado:* ${chip}\n\n` +
      `Para acceder al portal oficial de la Secretaría de Hacienda y entregarte el enlace de descarga de tu factura predial en PDF, necesito un dato más:\n\n` +
      `👉 *¿Cuál es la Cédula o NIT del propietario del predio?*\n\n` +
      `_(Puedes escribirlo con o sin puntos, comas o guiones — yo lo proceso automáticamente)_ ✅`;

    return {
      isPredialRequest: true,
      chip,
      reportText
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // CASO 2: CHIP + Documento del propietario
  // → Descarga automatizada oficial del PDF con 2Captcha + SDH
  // ────────────────────────────────────────────────────────────────────────
  if (chip && docNumber) {
    let downloadResult: DownloadPredialPdfResult | null = null;
    const shouldAttemptDownload = process.env.NODE_ENV !== 'test' && !options?.skipDownload;

    if (shouldAttemptDownload) {
      downloadResult = await downloadPredialInvoicePdf(
        detection.tipoDoc || 'CC',
        docNumber,
        chip,
        { isCertificadoPago: detection.isCertificadoPago }
      );
    }

    // Si la descarga del PDF fue exitosa, entregar reporte con archivo adjunto
    if (downloadResult && downloadResult.success && downloadResult.pdfBuffer) {
      const contribuyenteLabel = downloadResult.isCertificado ? '👤 *Contribuyente / Titular:*' : '👤 *Contribuyente / Propietario:*';
      const contribuyenteText = downloadResult.nombreContribuyente
        ? `${contribuyenteLabel} ${downloadResult.nombreContribuyente}\n`
        : '';

      const reportText = downloadResult.isCertificado
        ? (
            `🛡️ *CERTIFICADO DE PAGO PREDIAL BOGOTÁ — VECY BIENES RAÍCES* 🇨🇴\n\n` +
            `🏠 *CHIP del predio:* ${chip}\n` +
            contribuyenteText +
            `🪪 *${docLabel}:* ${docNumber}\n\n` +
            `✅ *Adjunto encuentras tu Certificado Oficial de Pago de Impuesto Predial expedido por la Secretaría de Hacienda de Bogotá.* Este documento certifica con plena validez legal que el inmueble se encuentra al día y a paz y salvo en su impuesto predial para la vigencia 2026.`
          )
        : (
            `🛡️ *FACTURA PREDIAL BOGOTÁ 2026 — VECY BIENES RAÍCES* 🇨🇴\n\n` +
            `🏠 *CHIP del predio:* ${chip}\n` +
            contribuyenteText +
            `🪪 *${docLabel}:* ${docNumber}\n\n` +
            `✅ *Adjunto encuentras tu factura oficial en PDF emitida por la Secretaría de Hacienda.* Incluye los códigos de barras oficiales para pago en bancos autorizados (Bancolombia, Davivienda, Bogotá, etc.) o corresponsales (Éxito, Efecty).`
          );

      // Big Data: Registro persistente en base de datos para avalúos futuros e inteligencia inmobiliaria
      try {
        const { getDb } = await import('../db');
        const { predialConsultations } = await import('../../drizzle/schema');
        const db = await getDb();
        if (db) {
          await db.insert(predialConsultations).values({
            chip: chip.toUpperCase(),
            documentType: detection.tipoDoc || 'CC',
            documentNumber: docNumber,
            nombreContribuyente: downloadResult.nombreContribuyente || null,
            numBp: downloadResult.numBP || null,
            anoGravable: '2026',
            queryType: downloadResult.isCertificado ? 'certificado_pago' : 'factura',
            downloadUrl: downloadResult.pdfUrl || null,
            requesterPhone: senderId ? senderId.replace(/@.*$/, '') : null,
            source: isPrivateDm ? 'whatsapp_dm' : 'whatsapp_group',
            status: 'completed',
            metadata: {
              pdfFileName: downloadResult.pdfFileName,
              date: new Date().toISOString()
            }
          });
        }
      } catch (dbErr: any) {
        console.warn('[PREDIAL-DB] No se pudo guardar la consulta en predialConsultations:', dbErr?.message);
      }

      return {
        isPredialRequest: true,
        chip,
        cedula: docNumber,
        reportText,
        pdfBuffer: downloadResult.pdfBuffer,
        pdfFileName: downloadResult.pdfFileName || (downloadResult.isCertificado ? `Certificado_Pago_${chip}_2026.pdf` : `Factura_Predial_${chip}_2026.pdf`),
        pdfUrl: downloadResult.pdfUrl,
        nombreContribuyente: downloadResult.nombreContribuyente,
        isCertificado: downloadResult.isCertificado
      };
    }

    // Fallback: URL OFICIAL REAL de la SDH Bogotá — portal de descarga de factura predial:
    // Este es el único portal que permite descargar el PDF con código de barras sin registro previo.
    const urlOficialSdh = `https://nuevaoficinavirtual.shd.gov.co/bogota/es/descargaFacturaVA`;

    // Determinar el tipo de documento para las instrucciones del formulario
    const tipoDocFormulario = detection.tipoDoc === 'NIT' ? 'NIT (sin dígito de verificación)' : (detection.tipoDoc === 'CE' ? 'Cédula de Extranjería' : 'Cédula de Ciudadanía');

    // Advertencia especial si el documento es NIT (puede tener 9 o 10 dígitos después de limpiar)
    const nitWarning = detection.tipoDoc === 'NIT'
      ? `\n⚠️ *Nota sobre el NIT:* El portal de hacienda pide el NIT *sin el dígito de verificación*. Por ejemplo, si tu NIT es *${docNumber}-X*, debes ingresar solo *${docNumber}*. Si el resultado dice que no encuentra el predio, verifica que el NIT corresponda al propietario registrado a *1 de enero de 2026*.\n`
      : '';

    const contribuyenteInfo = downloadResult?.nombreContribuyente
      ? `🏛️ *Titular registrado en Catastro/Hacienda:* ${downloadResult.nombreContribuyente}\n` +
        `💡 _Si el predio está en leasing habitacional o fiducia mercantil, se debe ingresar el NIT de la entidad bancaria o la cédula del locatario registrado._\n\n`
      : '';

    const errorPrefix = downloadResult?.errorMessage
      ? `⚠️ *Respuesta oficial de la Secretaría de Hacienda:* ${downloadResult.errorMessage}\n\n`
      : '';

    const reportText =
      `🛡️ *CONSULTA PREDIAL BOGOTÁ — VECY BIENES RAÍCES* 🇨🇴\n\n` +
      `🏠 *CHIP del predio:* ${chip}\n` +
      `🪪 *${docLabel}:* ${docNumber}\n` +
      nitWarning + `\n` +
      contribuyenteInfo +
      errorPrefix +
      `🤝 *Para entregarte tu PDF directamente aquí en el chat:*\n` +
      `Por favor facilítame el documento del titular catastral o el NIT de la entidad financiera (si es leasing o fiducia). Con ese dato yo misma gestiono de inmediato el trámite con 2Captcha y la Secretaría de Hacienda para entregarte el archivo PDF aquí mismo. 📲✨`;

    return {
      isPredialRequest: true,
      chip,
      cedula: docNumber,
      reportText
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // CASO 3: El usuario proporcionó avalúo catastral directamente (sin CHIP)
  // → Estimación local + guía para descargar factura oficial
  // ────────────────────────────────────────────────────────────────────────
  if (!chip && detection.avaluoCatastral && detection.avaluoCatastral > 0) {
    const estrato = detection.estrato || 4;
    const liquidacion = liquidarPredialEstimadoBogota(detection.avaluoCatastral, estrato, true);
    const avaluoFormatted = detection.avaluoCatastral.toLocaleString('es-CO');
    const valorPleno = liquidacion.impuestoPleno.toLocaleString('es-CO');
    const valorDescuento = liquidacion.impuestoConDescuento.toLocaleString('es-CO');

    const reportText =
      `🛡️ *ESTIMACIÓN PREDIAL — VECY BIENES RAÍCES - BOGOTÁ* 🇨🇴\n\n` +
      `⚠️ *Este es un cálculo ESTIMADO* basado en los datos que me proporcionaste. El valor oficial puede variar.\n\n` +
      `🏛️ *Avalúo Catastral informado:* $${avaluoFormatted} COP\n` +
      `🏢 *Estrato aplicado:* ${estrato}\n` +
      `📊 *Tarifa por mil:* ${liquidacion.tarifaPorMil}‰\n\n` +
      `💰 *Impuesto Predial estimado:* $${valorPleno} COP\n` +
      `✅ *Con 10% descuento pronto pago:* $${valorDescuento} COP\n\n` +
      `📄 *Para obtener tu factura oficial con código de barras real, ingresa al portal oficial:*\n` +
      `🔗 https://nuevaoficinavirtual.shd.gov.co/bogota/cf/predial/liquidar\n\n` +
      `_(Necesitarás el código CHIP de tu inmueble — lo encuentras en facturas anteriores)_`;

    return {
      isPredialRequest: true,
      reportText
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // CASO 4: Solicitud general de predial sin CHIP ni datos suficientes
  // → Guía completa de cómo solicitar el servicio
  // ────────────────────────────────────────────────────────────────────────
  const reportText =
    `🛡️ *IMPUESTO PREDIAL BOGOTÁ — VECY BIENES RAÍCES* 🇨🇴\n\n` +
    `Para entregarte el enlace oficial de tu factura predial, necesito el *código CHIP* del inmueble:\n\n` +
    `📝 *Envíame en privado:*\n` +
    `_JanIA, predial: CHIP AAA0123ABCD y NIT 8600030201_\n\n` +
    `🏠 *¿Dónde encuentro el CHIP?* En cualquier factura de predial anterior o en el recibo del impuesto.\n\n` +
    `✅ *También puedes enviar:*\n` +
    `• CC con puntos ✔ (ej: 19.386.159)\n` +
    `• NIT con dígito verificador ✔ (ej: 860.030.201-2)\n` +
    `• Cédula de Extranjería ✔\n\n` +
    `¡Te guío al instante! 🤝`;

  return {
    isPredialRequest: true,
    reportText
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECCIÓN DE PREGUNTAS DE AYUDA SOBRE EL SERVICIO PREDIAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detecta si un mensaje es una pregunta de ayuda/orientación sobre cómo usar
 * el servicio de predial o verificación de documentos.
 * Usado para responder a usuarios en grupos 2/3 que preguntan "¿cómo hago?"
 * sin que JanIA se descontrole o active alertas de WhatsApp.
 */
export function isServiceHelpRequest(text: string): 'predial' | 'cedula' | null {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase().trim();

  // Palabras clave de solicitud de ayuda
  const helpWords = [
    'cómo', 'como', 'qué debo', 'que debo', 'cómo hago', 'como hago',
    'qué datos', 'que datos', 'qué necesito', 'que necesito',
    'cómo pido', 'como pido', 'no sé', 'no se', 'ayuda',
    'instrucciones', 'tutorial', 'qué envío', 'que envio',
    'cómo solicito', 'como solicito', 'cómo se pide', 'como se pide',
    'no entendí', 'no entendi', 'no entiendo', 'explícame', 'explicame'
  ];

  const predialWords = ['predial', 'impuesto predial', 'factura predial', 'chip', 'liquidar'];
  const cedulaWords = ['cédula', 'cedula', 'verificar cédula', 'verificar cedula', 'verificación', 'verificacion', 'identidad', 'documento'];

  const hasHelp = helpWords.some(w => lower.includes(w));
  const hasPredial = predialWords.some(w => lower.includes(w));
  const hasCedula = cedulaWords.some(w => lower.includes(w));

  if (hasHelp && hasPredial) return 'predial';
  if (hasHelp && hasCedula) return 'cedula';

  // Preguntas cortas que solo mencionen el servicio con interrogación
  if ((lower.includes('?') || lower.startsWith('y') || lower.startsWith('¿')) && hasPredial) return 'predial';
  if ((lower.includes('?') || lower.startsWith('y') || lower.startsWith('¿')) && hasCedula) return 'cedula';

  return null;
}
