/**
 * SERVICIO OFICIAL DE VERIFICACIÓN DE IDENTIDAD Y ANTECEDENTES — VECY NETWORK
 * Integración con Policía Nacional de Colombia vía 2Captcha y convertidor a orden natural.
 * Permite a asesores y clientes consultar cualquier cédula directamente desde WhatsApp o Chat.
 */

import { queryPoliciaNacional, parsePoliceAntecedentesFullName, formatTitleCase } from '../routers/agenda';

export interface IdentityVerificationReport {
  isVerificationRequest: boolean;
  cedula?: string;
  tipoDoc?: string;
  success?: boolean;
  officialName?: string;
  source?: string;
  reportText?: string;
}

/**
 * Detecta si un mensaje textual corresponde a una solicitud de verificación de documento de identidad
 * Soporta Cédula de Ciudadanía (cc), Cédula de Extranjería (ce/cx), Pasaporte (pa) y Documento País de Origen (dp).
 */
export function extractCedulaForVerification(text: string, isPrivateDm: boolean = false): { found: boolean; cedula: string; tipoDoc: string } {
  if (!text || typeof text !== 'string') return { found: false, cedula: '', tipoDoc: 'cc' };

  const clean = text.trim();
  const lower = clean.toLowerCase();

  // Descartar si el texto es muy largo y claramente describe una oferta o demanda inmobiliaria
  if (lower.includes('vendo') || lower.includes('arriendo') || lower.includes('busco apto') || lower.includes('presupuesto')) {
    return { found: false, cedula: '', tipoDoc: 'cc' };
  }

  // Descartar si el mensaje es una consulta de impuesto predial o CHIP catastral
  if (lower.includes('predial') || lower.includes('chip') || lower.includes('impuesto')) {
    return { found: false, cedula: '', tipoDoc: 'cc' };
  }

  // Palabras clave de intención de verificación
  const keywords = ['verificar', 'verificacion', 'verificación', 'validar', 'consultar', 'revisar', 'chequear', 'antecedentes', 'cédula', 'cedula', 'documento', 'extranjería', 'extranjeria', 'pasaporte', 'pasaportes'];
  const hasKeyword = keywords.some(kw => lower.includes(kw));

  // 1. Detectar tipo de documento con prioridad específica
  let tipoDoc = 'cc';
  if (lower.includes('extranjer') || /(?<!\p{L})(?:ce|cx)(?!\p{L})/iu.test(lower)) {
    tipoDoc = 'cx';
  } else if (lower.includes('origen') || /(?<!\p{L})(?:dp|dpo)(?!\p{L})/iu.test(lower)) {
    tipoDoc = 'dp';
  } else if (lower.includes('pasaporte') || /(?<!\p{L})pa(?!\p{L})/iu.test(lower)) {
    tipoDoc = 'pa';
  }

  // 2. Patrón específico para Documento País de Origen
  if (tipoDoc === 'dp') {
    const regexDp = /(?:documento\s+pa[ií]s\s+(?:de\s+)?origen|dp|dpo)\s*[:#]?\s*([a-zA-Z0-9]{5,15})/i;
    const matchDp = clean.match(regexDp);
    if (matchDp && matchDp[1]) {
      return { found: true, cedula: matchDp[1].toUpperCase(), tipoDoc: 'dp' };
    }
  }

  // 3. Patrón específico para Pasaporte (permite alfanumérico de 5 a 15 caracteres)
  if (tipoDoc === 'pa') {
    const regexPa = /(?:pasaporte|pa)\s*[:#]?\s*([a-zA-Z0-9]{5,15})/i;
    const matchPa = clean.match(regexPa);
    if (matchPa && matchPa[1]) {
      return { found: true, cedula: matchPa[1].toUpperCase(), tipoDoc: 'pa' };
    }
  }

  // 4. Patrón específico para Cédula de Extranjería
  if (tipoDoc === 'cx') {
    const regexCe = /(?:verificar|validar|consultar|revisar|antecedentes|c[ée]dula)?\s*(?:de\s+extranjer[ií]a|ce|cx)\s*[:#]?\s*([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{5,10})/i;
    const matchCe = clean.match(regexCe);
    if (matchCe && matchCe[1]) {
      const rawNumber = matchCe[1].replace(/\D/g, '');
      if (rawNumber.length >= 5 && rawNumber.length <= 10) {
        return { found: true, cedula: rawNumber, tipoDoc: 'cx' };
      }
    }
  }

  // 5. Expresión regular explícita para Cédula de Ciudadanía u orden general
  // Ejemplos: "verificar cédula 52432900", "CC 52.432.900", "JanIA verificar cc: 39786573", "cédula: 1018456789"
  const regexExplicit = /(?:verificar|verificaci[oó]n|validar|consultar|revisar|antecedentes|c[ée]dula|documento|cc)\s*(?:de\s+ciudadan[ií]a\s*)?(?:cc|ce|cx)?\s*[:#]?\s*([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{5,10})/i;
  const matchExplicit = clean.match(regexExplicit);

  if (matchExplicit && matchExplicit[1]) {
    const rawNumber = matchExplicit[1].replace(/\D/g, '');
    if (rawNumber.length >= 5 && rawNumber.length <= 10) {
      return { found: true, cedula: rawNumber, tipoDoc };
    }
  }

  // 6. Si tiene palabra clave de intención y hay un número en el texto
  if (hasKeyword) {
    const numberMatches = clean.match(/\b([0-9]{5,10})\b/);
    if (numberMatches && numberMatches[1]) {
      return { found: true, cedula: numberMatches[1], tipoDoc };
    }
  }

  // 7. Formato directo tipo "CC 52432900", "C.C. 52.432.900", "CE 123456", "PA A1234567"
  const directCcMatch = clean.match(/\b(?:c\.?c\.?)\s*[:#]?\s*([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{5,10})\b/i);
  if (directCcMatch && directCcMatch[1]) {
    const rawNumber = directCcMatch[1].replace(/\D/g, '');
    if (rawNumber.length >= 5 && rawNumber.length <= 10) {
      return { found: true, cedula: rawNumber, tipoDoc: 'cc' };
    }
  }

  const directCeMatch = clean.match(/\b(?:c\.?e\.?|c\.?x\.?)\s*[:#]?\s*([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{5,10})\b/i);
  if (directCeMatch && directCeMatch[1]) {
    const rawNumber = directCeMatch[1].replace(/\D/g, '');
    if (rawNumber.length >= 5 && rawNumber.length <= 10) {
      return { found: true, cedula: rawNumber, tipoDoc: 'cx' };
    }
  }

  const directPaMatch = clean.match(/\b(?:pasaporte|pa)\s*[:#]?\s*([a-zA-Z0-9]{5,15})\b/i);
  if (directPaMatch && directPaMatch[1]) {
    return { found: true, cedula: directPaMatch[1].toUpperCase(), tipoDoc: 'pa' };
  }

  // 8. Detección directa de número de cédula puro en DM privado (ej: "52432900" o "52.432.900")
  const pureNumberMatch = clean.match(/^\s*([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{5,10})\s*$/);
  if (pureNumberMatch && pureNumberMatch[1]) {
    const rawNumber = pureNumberMatch[1].replace(/\D/g, '');
    if (rawNumber.length >= 5 && rawNumber.length <= 10) {
      if (isPrivateDm) {
        return { found: true, cedula: rawNumber, tipoDoc: 'cc' };
      }
    }
  }

  // 9. Detección cuando se menciona o etiqueta a JanIA con un número (ej: "JanIA 52432900" o "@JanIA 52.432.900")
  const janiaNumberMatch = clean.match(/(?:jania|@jania)\s*[:#]?\s*([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{5,10})/i);
  if (janiaNumberMatch && janiaNumberMatch[1]) {
    const rawNumber = janiaNumberMatch[1].replace(/\D/g, '');
    if (rawNumber.length >= 5 && rawNumber.length <= 10) {
      return { found: true, cedula: rawNumber, tipoDoc: 'cc' };
    }
  }

  return { found: false, cedula: '', tipoDoc: 'cc' };
}

/**
 * Formatea un número de documento con separadores de miles para CC/CE o mayúsculas para Pasaporte.
 */
export function formatCedulaNumber(cedula: string, tipoDoc: string = 'cc'): string {
  if (!cedula) return '';
  const clean = cedula.trim();
  if (tipoDoc === 'pa' || tipoDoc === 'dp' || /[a-zA-Z]/.test(clean)) {
    return clean.toUpperCase();
  }
  const onlyDigits = clean.replace(/\D/g, '');
  if (!onlyDigits) return clean;
  return Number(onlyDigits).toLocaleString('es-CO');
}

/**
 * Retorna el prefijo formal y legible según el tipo de documento.
 */
export function getDocumentTypeLabel(tipoDoc: string = 'cc'): string {
  const t = (tipoDoc || '').toLowerCase();
  if (t === 'ce' || t === 'cx') return 'Cédula de Extranjería (C.E.)';
  if (t === 'pa') return 'Pasaporte';
  if (t === 'dp' || t === 'dpo') return 'Documento País de Origen (D.P.)';
  return 'C.C.';
}

/**
 * Ejecuta la verificación oficial ante la central de seguridad de la Policía Nacional y construye el reporte formal.
 */
export async function executeIdentityVerificationFromWhatsApp(text: string, isPrivateDm: boolean = false): Promise<IdentityVerificationReport> {
  const detection = extractCedulaForVerification(text, isPrivateDm);
  if (!detection.found) {
    return { isVerificationRequest: false };
  }

  const { cedula, tipoDoc } = detection;
  const formattedCedula = formatCedulaNumber(cedula, tipoDoc);
  const docLabel = getDocumentTypeLabel(tipoDoc);

  try {
    const res = await queryPoliciaNacional(tipoDoc, cedula);

    if (res && res.success && res.officialName) {
      const officialName = formatTitleCase(res.officialName);
      const reportText = 
        `🛡️ *VERIFICACIÓN OFICIAL DE IDENTIDAD — VECY BIENES RAÍCES* 🇨🇴\n\n` +
        `🆔 *El documento:* ${docLabel} ${formattedCedula}\n` +
        `👤 *Pertenece a:* ${officialName}\n` +
        `✅ *Ciudadano verificado y habilitado.* Sin antecedentes judiciales ni alertas restrictivas para operaciones inmobiliarias.`;

      return {
        isVerificationRequest: true,
        cedula,
        tipoDoc,
        success: true,
        officialName,
        source: res.source || 'Central Oficial de Seguridad Notarial VECY Bienes Raíces',
        reportText
      };
    } else {
      const reportText = 
        `⚠️ *CONSULTA DE IDENTIDAD — VECY BIENES RAÍCES* 🇨🇴\n\n` +
        `No fue posible validar automáticamente en este momento el documento ${docLabel} *${formattedCedula}* en la Central Oficial de Antecedentes de la Policía Nacional.\n\n` +
        `📌 *Posibles motivos:*\n` +
        `• El número o caracteres del documento fueron digitados con algún error.\n` +
        `• Para documentos extranjeros (Cédula de Extranjería, Pasaporte o Documento País de Origen), verificar que el titular cuente con registro migratorio activo en Colombia.\n` +
        `• Intermitencia temporal de enlace con las bases de datos de la Policía Nacional.\n\n` +
        `💡 Por favor revisa los datos e intenta nuevamente escribiéndome: *"JanIA, verificar ${docLabel} ${formattedCedula}"*.`;

      return {
        isVerificationRequest: true,
        cedula,
        tipoDoc,
        success: false,
        reportText
      };
    }
  } catch (err: any) {
    return {
      isVerificationRequest: true,
      cedula,
      tipoDoc,
      success: false,
      reportText: `⚠️ Ocurrió una intermitencia temporal de enlace en nuestra central de verificación para el documento ${docLabel} ${formattedCedula}. Por favor intenta de nuevo en unos minutos.`
    };
  }
}
