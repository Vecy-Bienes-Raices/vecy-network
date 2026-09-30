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
}

export interface PredialReportResult {
  isPredialRequest: boolean;
  chip?: string;
  cedula?: string;
  reportText?: string;
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
    // NIT sin guión explícito: si tiene 11 dígitos, el último puede ser el DV
    // NITs colombianos tienen 9-10 dígitos sin DV (con DV serían 10-11)
    // Estrategia: si tiene >10 dígitos, descartar el último como posible DV
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length > 10) {
      cleaned = digitsOnly.slice(0, -1);
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

  // Palabras clave de intención de predial
  const keywords = ['predial', 'impuesto predial', 'factura predial', 'chip', 'paz y salvo predial', 'liquidar predial'];
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
      avaluoCatastral
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
      avaluoCatastral
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
// FUNCIÓN PRINCIPAL — Genera el informe y guía oficial de Predial
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genera el informe institucional de consulta y asistencia del Impuesto Predial de Bogotá.
 *
 * REGLA DOCTRINAL v32.14 — HONESTIDAD ABSOLUTA:
 * - NUNCA se inventan datos (dirección, matrícula, avalúo, links de factura).
 * - Si solo se tiene el CHIP, se pide la cédula/NIT.
 * - Si se tienen CHIP + doc del propietario → se indica el link oficial REAL de la SDH para que el usuario descargue.
 * - Si el usuario proveyó el avalúo catastral directamente → se hace la estimación y se da el link oficial.
 * - Si hay datos insuficientes o erróneos → se dice honestamente con guía para corregir.
 */
export async function executePredialAssistanceFromWhatsApp(
  text: string,
  senderId?: string,
  isPrivateDm?: boolean
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
  // ────────────────────────────────────────────────────────────────────────
  if (chip && !docNumber && !detection.estrato && !detection.avaluoCatastral) {
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
  // → Dar el link OFICIAL REAL de la SDH. Sin inventar datos catastrales.
  // ────────────────────────────────────────────────────────────────────────
  if (chip && docNumber) {
    // URL OFICIAL REAL de la SDH Bogotá — portal de descarga de factura predial:
    // Este es el único portal que permite descargar el PDF con código de barras sin registro previo.
    const urlOficialSdh = `https://nuevaoficinavirtual.shd.gov.co/bogota/es/descargaFacturaVA`;

    // Determinar el tipo de documento para las instrucciones del formulario
    const tipoDocFormulario = detection.tipoDoc === 'NIT' ? 'NIT (sin dígito de verificación)' : (detection.tipoDoc === 'CE' ? 'Cédula de Extranjería' : 'Cédula de Ciudadanía');

    // Advertencia especial si el documento es NIT (puede tener 9 o 10 dígitos después de limpiar)
    const nitWarning = detection.tipoDoc === 'NIT'
      ? `\n⚠️ *Nota sobre el NIT:* El portal de hacienda pide el NIT *sin el dígito de verificación*. Por ejemplo, si tu NIT es *${docNumber}-X*, debes ingresar solo *${docNumber}*. Si el resultado dice que no encuentra el predio, verifica que el NIT corresponda al propietario registrado a *1 de enero de 2026*.\n`
      : '';

    const reportText =
      `🛡️ *PREDIAL BOGOTÁ — VECY BIENES RAÍCES* 🇨🇴\n\n` +
      `🏠 *CHIP del predio:* ${chip}\n` +
      `🪪 *${docLabel} registrado:* ${docNumber}\n` +
      nitWarning + `\n` +
      `🔗 *Portal oficial Secretaría de Hacienda — Descarga tu factura predial aquí:*\n` +
      `${urlOficialSdh}\n\n` +
      `📋 *Instrucciones para descargar tu PDF:*\n` +
      `1️⃣ Abre el enlace de arriba\n` +
      `2️⃣ En *"Tipo de impuesto"* selecciona: *PREDIAL*\n` +
      `3️⃣ En *"Tipo de documento"* selecciona: *${tipoDocFormulario}*\n` +
      `4️⃣ En *"Número de documento"* ingresa: *${docNumber}*\n` +
      `5️⃣ En *"CHIP"* ingresa: *${chip}*\n` +
      `6️⃣ Marca la casilla *"No soy un robot"* (CAPTCHA)\n` +
      `7️⃣ Haz clic en *BUSCAR* → aparecerá el botón *"DESCARGA TU FACTURA"* ✅\n\n` +
      `📄 Descarga el PDF, tiene el código de barras para pago en bancos y Efecty.\n\n` +
      `¿Necesitas que te ayude con otro trámite? Estoy a tu disposición 🤝`;

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
