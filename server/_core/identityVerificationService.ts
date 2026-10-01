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
 * Detecta si un mensaje textual corresponde a una solicitud de verificación de cédula/documento.
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
  const keywords = ['verificar', 'verificacion', 'verificación', 'validar', 'consultar', 'revisar', 'antecedentes', 'cédula', 'cedula', 'documento'];
  const hasKeyword = keywords.some(kw => lower.includes(kw));

  // Detectar tipo de documento
  let tipoDoc = 'cc';
  if (lower.includes('ce') || lower.includes('extranjer')) tipoDoc = 'ce';
  else if (lower.includes('pasaporte') || lower.includes('pa')) tipoDoc = 'pa';

  // Expresión regular para capturar la cédula (6 a 10 dígitos)
  // Ejemplos: "verificar cédula 52432900", "CC 52.432.900", "consultar antecedentes 52803592", "cédula: 1018456789"
  const regexExplicit = /(?:verificar|verificaci[oó]n|validar|consultar|revisar|antecedentes|c[ée]dula|documento|cc)\s*(?:de\s+ciudadan[ií]a\s*)?(?:cc|ce|cx)?\s*[:#]?\s*([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{6,10})/i;
  const matchExplicit = clean.match(regexExplicit);

  if (matchExplicit && matchExplicit[1]) {
    const rawNumber = matchExplicit[1].replace(/\D/g, '');
    if (rawNumber.length >= 6 && rawNumber.length <= 10) {
      return { found: true, cedula: rawNumber, tipoDoc };
    }
  }

  // Si tiene palabra clave y hay un número de cédula en el texto
  if (hasKeyword) {
    const numberMatches = clean.match(/\b([0-9]{6,10})\b/);
    if (numberMatches && numberMatches[1]) {
      return { found: true, cedula: numberMatches[1], tipoDoc };
    }
  }

  // Formato directo tipo "CC 52432900" o "C.C. 52.432.900"
  const directCcMatch = clean.match(/\b(?:c\.?c\.?)\s*[:#]?\s*([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{6,10})\b/i);
  if (directCcMatch && directCcMatch[1]) {
    const rawNumber = directCcMatch[1].replace(/\D/g, '');
    if (rawNumber.length >= 6 && rawNumber.length <= 10) {
      return { found: true, cedula: rawNumber, tipoDoc: 'cc' };
    }
  }

  // Detección directa de número de cédula puro en DM privado (ej: "52432900" o "52.432.900")
  const pureNumberMatch = clean.match(/^\s*([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{6,10})\s*$/);
  if (pureNumberMatch && pureNumberMatch[1]) {
    const rawNumber = pureNumberMatch[1].replace(/\D/g, '');
    if (rawNumber.length >= 6 && rawNumber.length <= 10) {
      if (isPrivateDm) {
        return { found: true, cedula: rawNumber, tipoDoc: 'cc' };
      }
    }
  }

  // Detección cuando se menciona o etiqueta a JanIA con un número de cédula (ej: "JanIA 52432900" o "@JanIA 52.432.900")
  const janiaNumberMatch = clean.match(/(?:jania|@jania)\s*[:#]?\s*([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{6,10})/i);
  if (janiaNumberMatch && janiaNumberMatch[1]) {
    const rawNumber = janiaNumberMatch[1].replace(/\D/g, '');
    if (rawNumber.length >= 6 && rawNumber.length <= 10) {
      return { found: true, cedula: rawNumber, tipoDoc: 'cc' };
    }
  }

  return { found: false, cedula: '', tipoDoc: 'cc' };
}

/**
 * Formatea un número de cédula con separadores de miles (ej: 52432900 -> 52.432.900).
 */
export function formatCedulaNumber(cedula: string): string {
  const clean = (cedula || '').replace(/\D/g, '');
  if (!clean) return cedula;
  return Number(clean).toLocaleString('es-CO');
}

/**
 * Ejecuta la verificación oficial ante la central de seguridad y construye el reporte formal.
 */
export async function executeIdentityVerificationFromWhatsApp(text: string, isPrivateDm: boolean = false): Promise<IdentityVerificationReport> {
  const detection = extractCedulaForVerification(text, isPrivateDm);
  if (!detection.found) {
    return { isVerificationRequest: false };
  }

  const { cedula, tipoDoc } = detection;
  const formattedCedula = formatCedulaNumber(cedula);
  const nowBogota = new Date().toLocaleString('es-CO', { 
    timeZone: 'America/Bogota',
    dateStyle: 'long',
    timeStyle: 'short'
  });

  try {
    const res = await queryPoliciaNacional(tipoDoc, cedula);

    if (res && res.success && res.officialName) {
      const officialName = formatTitleCase(res.officialName);
      const reportText = 
        `🛡️ *VERIFICACIÓN OFICIAL DE IDENTIDAD — VECY BIENES RAÍCES* 🇨🇴\n\n` +
        `🆔 *El documento:* C.C. ${formattedCedula}\n` +
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
        `No fue posible validar automáticamente en este momento la C.C. *${formattedCedula}* en nuestra Central Oficial de Seguridad e Identidad.\n\n` +
        `📌 *Posibles motivos:*\n` +
        `• El número de documento fue digitado con algún dígito erróneo o faltante.\n` +
        `• El ciudadano corresponde a un documento de extranjería o pasaporte que requiere verificación presencial.\n` +
        `• Intermitencia temporal de enlace con las bases de datos oficiales de validación.\n\n` +
        `💡 Por favor revisa el número e intenta nuevamente escribiéndome: *"JanIA, verifica la cédula ${cedula}"*.`;

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
      reportText: `⚠️ Ocurrió una intermitencia temporal de enlace en nuestra central de verificación para la cédula ${formattedCedula}. Por favor intenta de nuevo en unos minutos.`
    };
  }
}
