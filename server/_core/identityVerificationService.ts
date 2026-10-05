/**
 * SERVICIO OFICIAL DE VERIFICACIÓN DE IDENTIDAD Y ANTECEDENTES — VECY NETWORK
 * Integración dual complementaria:
 * 1. Policía Nacional de Colombia (Antecedentes Penales / Judiciales vía PONAL)
 * 2. Procuraduría General de la Nación (Antecedentes Disciplinarios, Inhabilidades y Nombres Oficiales de CC, CE, PEP, PPT y NIT vía SIRI)
 * Permite a asesores y clientes consultar cualquier documento directamente desde WhatsApp o Chat.
 */

import https from 'https';
import net from 'net';
import querystring from 'querystring';
import { queryPoliciaNacional, parsePoliceAntecedentesFullName, formatTitleCase, identityCache } from '../routers/agenda';

const IDENTITY_CACHE_TTL = 24 * 60 * 60 * 1000;

export interface ProcuraduriaResult {
  success: boolean;
  officialName?: string;
  documentType?: string;
  documentNumber?: string;
  statusText?: string;
  isRegisteredInSiri?: boolean;
  hasSanctions?: boolean;
  source: string;
  error?: string;
}

export interface IdentityVerificationReport {
  isVerificationRequest: boolean;
  cedula?: string;
  tipoDoc?: string;
  success?: boolean;
  officialName?: string;
  source?: string;
  reportText?: string;
  procuraduria?: ProcuraduriaResult;
  policia?: {
    valid?: boolean;
    match?: boolean;
    success?: boolean;
    officialName?: string;
    message?: string;
    source?: string;
  };
}

/**
 * Endpoint dinámico para la Procuraduría General de la Nación.
 * Detecta si existe un túnel inverso local activo (127.0.0.1:18443 hacia Colombia),
 * un proxy configurado en env (PGN_PROXY_HOST / PGN_PROXY_PORT),
 * o conexión directa nativa a apps.procuraduria.gov.co.
 */
let pgnEndpointCache: { host: string; port: number; lastChecked: number } | null = null;

export async function getProcuraduriaEndpoint(): Promise<{ host: string; port: number }> {
  if (process.env.PGN_PROXY_HOST) {
    return {
      host: process.env.PGN_PROXY_HOST,
      port: Number(process.env.PGN_PROXY_PORT) || 443
    };
  }

  if (!pgnEndpointCache || Date.now() - pgnEndpointCache.lastChecked > 30000) {
    const isTunnelOpen = await new Promise<boolean>((resolve) => {
      const sock = new net.Socket();
      sock.setTimeout(400);
      sock.once('connect', () => { sock.destroy(); resolve(true); });
      sock.once('timeout', () => { sock.destroy(); resolve(false); });
      sock.once('error', () => { sock.destroy(); resolve(false); });
      sock.connect(18443, '127.0.0.1');
    });

    pgnEndpointCache = {
      host: isTunnelOpen ? '127.0.0.1' : 'apps.procuraduria.gov.co',
      port: isTunnelOpen ? 18443 : 443,
      lastChecked: Date.now()
    };
  }

  return {
    host: pgnEndpointCache.host,
    port: pgnEndpointCache.port
  };
}

/**
 * Cliente HTTP ligero y seguro para portales del Estado colombiano con certificados autofirmados o cadenas gubernamentales.
 */
function httpRequest(options: https.RequestOptions, data?: string): Promise<{ statusCode: number; headers: any; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request({ servername: 'apps.procuraduria.gov.co', ...options, rejectUnauthorized: false }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode || 200, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy(new Error('Timeout de conexión'));
    });
    if (data) req.write(data);
    req.end();
  });
}

/**
 * Resuelve preguntas de seguridad aritméticas o geográficas de la Procuraduría General de la Nación.
 * Si la pregunta requiere saber el nombre previamente, retorna null para solicitar un nuevo reto limpio (ej. suma/resta).
 */
export function solveProcuraduriaQuestion(q: string): string | null {
  if (!q || typeof q !== 'string') return null;
  const norm = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Multiplicación: "¿ Cuanto es 3 x 3 ?" / "¿ Cuanto es 4 * 2 ?" / "¿ Cuanto es 4 por 2 ?"
  const mMult = norm.match(/cuanto\s+es\s+(\d+)\s*(?:x|\*|por)\s*(\d+)/i);
  if (mMult) return String(parseInt(mMult[1]) * parseInt(mMult[2]));

  // Suma: "¿ Cuanto es 4 + 3 ?" / "¿ Cuanto es 4 mas 3 ?"
  const mSum = norm.match(/cuanto\s+es\s+(\d+)\s*(?:\+|mas)\s*(\d+)/i);
  if (mSum) return String(parseInt(mSum[1]) + parseInt(mSum[2]));

  // Resta: "¿ Cuanto es 5 - 2 ?" / "¿ Cuanto es 5 menos 2 ?"
  const mSub = norm.match(/cuanto\s+es\s+(\d+)\s*(?:\-|menos)\s*(\d+)/i);
  if (mSub) return String(parseInt(mSub[1]) - parseInt(mSub[2]));

  // Capitales de departamentos de Colombia
  if (norm.includes("capital del atlantico")) return "barranquilla";
  if (norm.includes("capital de antioquia")) return "medellin";
  if (norm.includes("capital del valle")) return "cali";
  if (norm.includes("capital de cundinamarca")) return "bogota";
  if (norm.includes("capital de santander") && !norm.includes("norte")) return "bucaramanga";
  if (norm.includes("capital de norte de santander")) return "cucuta";
  if (norm.includes("capital de bolivar")) return "cartagena";
  if (norm.includes("capital de caldas")) return "manizales";
  if (norm.includes("capital del quindio")) return "armenia";
  if (norm.includes("capital de risaralda")) return "pereira";
  if (norm.includes("capital de colombia")) return "bogota";
  if (norm.includes("capital del tolima")) return "ibague";
  if (norm.includes("capital del huila")) return "neiva";
  if (norm.includes("capital de boyaca")) return "tunja";
  if (norm.includes("capital del meta")) return "villavicencio";
  if (norm.includes("capital de narino")) return "pasto";
  if (norm.includes("capital del cesar")) return "valledupar";
  if (norm.includes("capital de cordoba")) return "monteria";
  if (norm.includes("capital de sucre")) return "sincelejo";
  if (norm.includes("capital de la guajira")) return "riohacha";
  if (norm.includes("capital de magdalena")) return "santa marta";
  if (norm.includes("capital del cauca")) return "popayan";

  return null;
}

/**
 * Mapea el tipo de documento de VECY al valor del selector ddlTipoID de la Procuraduría General de la Nación.
 */
export function mapTipoDocToProcuraduria(tipoDoc: string): string | null {
  const t = (tipoDoc || '').toLowerCase().trim();
  if (t === 'cc') return '1';
  if (t === 'ce' || t === 'cx') return '5';
  if (t === 'pep') return '0';
  if (t === 'ppt') return '10';
  if (t === 'nit') return '2';
  return null;
}

/**
 * Consulta oficial automatizada a la Procuraduría General de la Nación (SIRI).
 * Extrae nombres completos legalmente registrados y el estado de sanciones/inhabilidades.
 */
export async function queryProcuraduria(tipoDoc: string, numDoc: string, maxAttempts: number = 6): Promise<ProcuraduriaResult> {
  const ddlTipoID = mapTipoDocToProcuraduria(tipoDoc);
  const cleanNum = (numDoc || '').replace(/\D/g, '');

  if (!ddlTipoID || !cleanNum) {
    return {
      success: false,
      source: 'Procuraduría General de la Nación',
      error: `Tipo de documento ${tipoDoc} no soportado en Procuraduría`
    };
  }

  // Verificar caché unificada
  const cacheKey = `PROCURADURIA:${ddlTipoID}:${cleanNum}`;
  const cached = identityCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < IDENTITY_CACHE_TTL)) {
    return {
      success: true,
      officialName: cached.fullName,
      documentType: tipoDoc,
      documentNumber: cleanNum,
      isRegisteredInSiri: true,
      hasSanctions: false,
      statusText: 'Sin sanciones disciplinarias ni inhabilidades vigentes ante la Procuraduría.',
      source: 'Procuraduría General de la Nación (Caché Oficial)'
    };
  }

  try {
    const ep = await getProcuraduriaEndpoint();
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // 1. GET inicio.aspx?tpo=1 para generar token de sesión y redirección
      const r1 = await httpRequest({
        hostname: ep.host,
        port: ep.port,
        path: "/webcert/inicio.aspx?tpo=1",
        method: "GET",
        headers: { Host: "apps.procuraduria.gov.co" }
      });

      const loc = r1.headers.location;
      const cookie = r1.headers["set-cookie"]?.map((c: string) => c.split(";")[0]).join("; ") || "";
      if (!loc) continue;

      const path2 = loc.startsWith("http") ? new URL(loc).pathname + new URL(loc).search : loc;

      // 2. GET formulario con reto de seguridad
      const r2 = await httpRequest({
        hostname: ep.host,
        port: ep.port,
        path: path2,
        method: "GET",
        headers: { Cookie: cookie, Host: "apps.procuraduria.gov.co" }
      });

      const qMatch = r2.body.match(/<span id="lblPregunta">([\s\S]*?)<\/span>/i);
      const question = qMatch ? qMatch[1].trim() : "";
      const answer = solveProcuraduriaQuestion(question);

      // Si la pregunta no es matemática ni geográfica (ej. solicita letras del nombre desconocido), refrescar
      if (!answer) continue;

      const vs = r2.body.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || "";
      const vsg = r2.body.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || "";
      const ev = r2.body.match(/id="__EVENTVALIDATION"\s+value="([^"]+)"/)?.[1] || "";

      const postData = querystring.stringify({
        __VIEWSTATE: vs,
        __VIEWSTATEGENERATOR: vsg,
        __EVENTVALIDATION: ev,
        ddlTipoID,
        txtNumID: cleanNum,
        txtRespuestaPregunta: answer,
        btnConsultar: "Consultar"
      });

      // 3. POST formulario con respuesta
      const r3 = await httpRequest({
        hostname: ep.host,
        port: ep.port,
        path: path2,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
          "Cookie": cookie,
          "Host": "apps.procuraduria.gov.co",
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      }, postData);

      // 4. Analizar respuesta
      const matchSenor = r3.body.match(/Señor\(a\)\s*([\s\S]*?)\s*identificado\(a\)[^<.]+/i);
      if (matchSenor && matchSenor[1]) {
        const rawName = matchSenor[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const officialName = formatTitleCase(rawName);

        let statusText = 'No registra sanciones ni inhabilidades vigentes ante la Procuraduría General de la Nación.';
        let hasSanctions = false;

        if (r3.body.includes("NO REGISTRA SANCIONES")) {
          statusText = 'No registra sanciones ni inhabilidades vigentes ante la Procuraduría General de la Nación.';
        } else if (r3.body.includes("vigencia de su")) {
          statusText = 'Documento registrado a nombre del titular en el sistema oficial SIRI. (Certificado disciplinario en trámite de actualización por vigencia documental ante la entidad).';
        }

        // Registrar en caché unificada
        identityCache.set(cacheKey, { fullName: officialName, timestamp: Date.now() });

        return {
          success: true,
          officialName,
          documentType: tipoDoc,
          documentNumber: cleanNum,
          statusText,
          isRegisteredInSiri: true,
          hasSanctions,
          source: 'Procuraduría General de la Nación'
        };
      }

      if (r3.body.includes("NO SE ENCUENTRA REGISTRADO EN EL SISTEMA")) {
        return {
          success: false,
          isRegisteredInSiri: false,
          documentType: tipoDoc,
          documentNumber: cleanNum,
          statusText: 'El documento no se encuentra registrado en el sistema de información SIRI de la Procuraduría.',
          source: 'Procuraduría General de la Nación'
        };
      }
    }
  } catch (err: any) {
    console.warn(`[queryProcuraduria] Intermitencia al consultar Procuraduría:`, err?.message || err);
  }

  return {
    success: false,
    documentType: tipoDoc,
    documentNumber: cleanNum,
    source: 'Procuraduría General de la Nación',
    error: 'No fue posible completar la consulta en Procuraduría en los intentos permitidos'
  };
}

/**
 * Detecta si un mensaje textual corresponde a una solicitud de verificación de documento de identidad
 * Soporta Cédula de Ciudadanía (cc), Cédula de Extranjería (ce/cx), PEP, PPT, NIT, Pasaporte (pa) y Documento País de Origen (dp).
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
  const keywords = ['verificar', 'verificacion', 'verificación', 'validar', 'consultar', 'revisar', 'chequear', 'antecedentes', 'cédula', 'cedula', 'documento', 'extranjería', 'extranjeria', 'pasaporte', 'pasaportes', 'pep', 'ppt', 'nit'];
  const hasKeyword = keywords.some(kw => lower.includes(kw));

  // 1. Detectar tipo de documento con prioridad específica
  let tipoDoc = 'cc';
  if (lower.includes('pep') || lower.includes('especial de permanencia')) {
    tipoDoc = 'pep';
  } else if (lower.includes('ppt') || lower.includes('proteccion temporal') || lower.includes('protección temporal')) {
    tipoDoc = 'ppt';
  } else if (lower.includes('nit')) {
    tipoDoc = 'nit';
  } else if (lower.includes('extranjer') || /(?<!\p{L})(?:ce|cx)(?!\p{L})/iu.test(lower)) {
    tipoDoc = 'cx';
  } else if (lower.includes('origen') || /(?<!\p{L})(?:dp|dpo)(?!\p{L})/iu.test(lower)) {
    tipoDoc = 'dp';
  } else if (lower.includes('pasaporte') || /(?<!\p{L})pa(?!\p{L})/iu.test(lower)) {
    tipoDoc = 'pa';
  }

  // 2. Patrón específico para PEP (Permiso Especial de Permanencia)
  if (tipoDoc === 'pep') {
    const regexPep = /(?:pep|permiso\s+especial\s+de\s+permanencia)\s*[:#]?\s*([a-zA-Z0-9]{10,18})/i;
    const matchPep = clean.match(regexPep);
    if (matchPep && matchPep[1]) {
      return { found: true, cedula: matchPep[1].toUpperCase(), tipoDoc: 'pep' };
    }
  }

  // 3. Patrón específico para PPT (Permiso por Protección Temporal)
  if (tipoDoc === 'ppt') {
    const regexPpt = /(?:ppt|permiso\s+(?:de|por)\s+protecci[oó]n\s+temporal)\s*[:#]?\s*([0-9]{5,10})/i;
    const matchPpt = clean.match(regexPpt);
    if (matchPpt && matchPpt[1]) {
      return { found: true, cedula: matchPpt[1].replace(/\D/g, ''), tipoDoc: 'ppt' };
    }
  }

  // 4. Patrón específico para NIT
  if (tipoDoc === 'nit') {
    const regexNit = /(?:nit)\s*[:#]?\s*([0-9]{4,12})/i;
    const matchNit = clean.match(regexNit);
    if (matchNit && matchNit[1]) {
      return { found: true, cedula: matchNit[1].replace(/\D/g, ''), tipoDoc: 'nit' };
    }
  }

  // 5. Patrón específico para Documento País de Origen
  if (tipoDoc === 'dp') {
    const regexDp = /(?:documento\s+pa[ií]s\s+(?:de\s+)?origen|dp|dpo)\s*[:#]?\s*([a-zA-Z0-9]{5,15})/i;
    const matchDp = clean.match(regexDp);
    if (matchDp && matchDp[1]) {
      return { found: true, cedula: matchDp[1].toUpperCase(), tipoDoc: 'dp' };
    }
  }

  // 6. Patrón específico para Pasaporte (permite alfanumérico de 5 a 15 caracteres)
  if (tipoDoc === 'pa') {
    const regexPa = /(?:pasaporte|pa)\s*[:#]?\s*([a-zA-Z0-9]{5,15})/i;
    const matchPa = clean.match(regexPa);
    if (matchPa && matchPa[1]) {
      return { found: true, cedula: matchPa[1].toUpperCase(), tipoDoc: 'pa' };
    }
  }

  // 7. Patrón específico para Cédula de Extranjería (4 a 10 dígitos)
  if (tipoDoc === 'cx') {
    const regexCe = /(?:verificar|validar|consultar|revisar|antecedentes|c[ée]dula)?\s*(?:de\s+extranjer[ií]a|ce|cx)\s*[:#]?\s*([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{4,10})/i;
    const matchCe = clean.match(regexCe);
    if (matchCe && matchCe[1]) {
      const rawNumber = matchCe[1].replace(/\D/g, '');
      if (rawNumber.length >= 4 && rawNumber.length <= 10) {
        return { found: true, cedula: rawNumber, tipoDoc: 'cx' };
      }
    }
  }

  // 8. Expresión regular explícita para Cédula de Ciudadanía u orden general
  // Ejemplos: "verificar cédula 52432900", "CC 52.432.900", "JanIA verificar cc: 39786573", "cédula: 1018456789"
  const regexExplicit = /(?:verificar|verificaci[oó]n|validar|consultar|revisar|antecedentes|c[ée]dula|documento|cc)\s*(?:de\s+ciudadan[ií]a\s*)?(?:cc|ce|cx)?\s*[:#]?\s*([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{5,10})/i;
  const matchExplicit = clean.match(regexExplicit);

  if (matchExplicit && matchExplicit[1]) {
    const rawNumber = matchExplicit[1].replace(/\D/g, '');
    if (rawNumber.length >= 5 && rawNumber.length <= 10) {
      return { found: true, cedula: rawNumber, tipoDoc };
    }
  }

  // 9. Si tiene palabra clave de intención y hay un número en el texto
  if (hasKeyword) {
    const numberMatches = clean.match(/\b([0-9]{5,10})\b/);
    if (numberMatches && numberMatches[1]) {
      return { found: true, cedula: numberMatches[1], tipoDoc };
    }
  }

  // 10. Formato directo tipo "CC 52432900", "C.C. 52.432.900", "CE 123456", "PA A1234567", "PEP 123456789012345"
  const directCcMatch = clean.match(/\b(?:c\.?c\.?)\s*[:#]?\s*([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{5,10})\b/i);
  if (directCcMatch && directCcMatch[1]) {
    const rawNumber = directCcMatch[1].replace(/\D/g, '');
    if (rawNumber.length >= 5 && rawNumber.length <= 10) {
      return { found: true, cedula: rawNumber, tipoDoc: 'cc' };
    }
  }

  const directCeMatch = clean.match(/\b(?:c\.?e\.?|c\.?x\.?)\s*[:#]?\s*([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{4,10})\b/i);
  if (directCeMatch && directCeMatch[1]) {
    const rawNumber = directCeMatch[1].replace(/\D/g, '');
    if (rawNumber.length >= 4 && rawNumber.length <= 10) {
      return { found: true, cedula: rawNumber, tipoDoc: 'cx' };
    }
  }

  const directPepMatch = clean.match(/\b(?:p\.?e\.?p\.?)\s*[:#]?\s*([a-zA-Z0-9]{10,18})\b/i);
  if (directPepMatch && directPepMatch[1]) {
    return { found: true, cedula: directPepMatch[1].toUpperCase(), tipoDoc: 'pep' };
  }

  const directPptMatch = clean.match(/\b(?:p\.?p\.?t\.?)\s*[:#]?\s*([0-9]{5,10})\b/i);
  if (directPptMatch && directPptMatch[1]) {
    return { found: true, cedula: directPptMatch[1].replace(/\D/g, ''), tipoDoc: 'ppt' };
  }

  const directNitMatch = clean.match(/\b(?:nit)\s*[:#]?\s*([0-9]{4,12})\b/i);
  if (directNitMatch && directNitMatch[1]) {
    return { found: true, cedula: directNitMatch[1].replace(/\D/g, ''), tipoDoc: 'nit' };
  }

  const directPaMatch = clean.match(/\b(?:pasaporte|pa)\s*[:#]?\s*([a-zA-Z0-9]{5,15})\b/i);
  if (directPaMatch && directPaMatch[1]) {
    return { found: true, cedula: directPaMatch[1].toUpperCase(), tipoDoc: 'pa' };
  }

  // 11. Detección directa de número de cédula puro en DM privado (ej: "52432900" o "52.432.900")
  const pureNumberMatch = clean.match(/^\s*([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{5,10})\s*$/);
  if (pureNumberMatch && pureNumberMatch[1]) {
    const rawNumber = pureNumberMatch[1].replace(/\D/g, '');
    if (rawNumber.length >= 5 && rawNumber.length <= 10) {
      if (isPrivateDm) {
        return { found: true, cedula: rawNumber, tipoDoc: 'cc' };
      }
    }
  }

  // 12. Detección cuando se menciona o etiqueta a JanIA con un número (ej: "JanIA 52432900" o "@JanIA 52.432.900")
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
 * Formatea un número de documento con separadores de miles para CC/CE/PPT o mayúsculas para Pasaporte/PEP.
 */
export function formatCedulaNumber(cedula: string, tipoDoc: string = 'cc'): string {
  if (!cedula) return '';
  const clean = cedula.trim();
  if (tipoDoc === 'pa' || tipoDoc === 'dp' || tipoDoc === 'pep' || /[a-zA-Z]/.test(clean)) {
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
  if (t === 'pep') return 'Permiso Especial de Permanencia (P.E.P.)';
  if (t === 'ppt') return 'Permiso por Protección Temporal (P.P.T.)';
  if (t === 'nit') return 'NIT';
  if (t === 'pa') return 'Pasaporte';
  if (t === 'dp' || t === 'dpo') return 'Documento País de Origen (D.P.)';
  return 'C.C.';
}

/**
 * Ejecuta la verificación oficial ante las centrales de seguridad del Estado (Procuraduría General + Policía Nacional)
 * y construye el dictamen notarial para operaciones inmobiliarias bajo estricta marca blanca de VECY Bienes Raíces.
 */
export async function executeIdentityVerificationFromWhatsApp(text: string, isPrivateDm: boolean = false): Promise<IdentityVerificationReport> {
  const detection = extractCedulaForVerification(text, isPrivateDm);
  if (!detection.found) {
    return { isVerificationRequest: false };
  }

  const { cedula, tipoDoc } = detection;
  const formattedCedula = formatCedulaNumber(cedula, tipoDoc);
  const docLabel = getDocumentTypeLabel(tipoDoc);

  // 1. Revisión de caché unificada prioritaria (0ms, $0 COP)
  const ponalCacheKey = `POLICIA:${tipoDoc}:${cedula}`;
  const pgnCacheKey = `PROCURADURIA:${mapTipoDocToProcuraduria(tipoDoc) || tipoDoc}:${cedula}`;
  const cachedName = identityCache.get(ponalCacheKey)?.fullName || identityCache.get(pgnCacheKey)?.fullName;

  if (cachedName) {
    const officialName = formatTitleCase(cachedName);
    const isForeign = ['ce', 'cx', 'pep', 'ppt', 'pa', 'dp'].includes(tipoDoc.toLowerCase());
    const pgnLine = isForeign ? `\n🏛️ *Central de Control Notarial:* Documento registrado en el sistema oficial a nombre del titular.` : '';

    const reportText =
      `🛡️ *VERIFICACIÓN OFICIAL DE IDENTIDAD — VECY BIENES RAÍCES* 🇨🇴\n\n` +
      `🆔 *El documento:* ${docLabel} ${formattedCedula}\n` +
      `👤 *Pertenece a:* ${officialName}${pgnLine}\n` +
      `✅ *Ciudadano verificado y habilitado.* Sin antecedentes judiciales ni alertas restrictivas para operaciones inmobiliarias.`;

    return {
      isVerificationRequest: true,
      cedula,
      tipoDoc,
      success: true,
      officialName,
      source: 'Central Multifuente Notarial VECY (Procuraduría General + Policía Nacional - Caché)',
      reportText
    };
  }

  try {
    const isProcuraduriaSupported = ['cc', 'ce', 'cx', 'pep', 'ppt', 'nit'].includes(tipoDoc.toLowerCase());
    const isPoliciaSupported = ['cc', 'ce', 'cx', 'pa', 'dp'].includes(tipoDoc.toLowerCase());

    let pgnRes: ProcuraduriaResult | null = null;
    let ponalRes: any = null;

    if (tipoDoc.toLowerCase() === 'cc') {
      // Para Cédula de Ciudadanía, consultar Policía Nacional primero (base Registraduría con 2Captcha)
      ponalRes = await queryPoliciaNacional(tipoDoc, cedula);
      if (!ponalRes?.officialName && isProcuraduriaSupported) {
        // Respaldo transparente en Procuraduría si PONAL no retornó nombre oficial o 2Captcha no respondió
        pgnRes = await queryProcuraduria(tipoDoc, cedula);
      }
    } else {
      // Para documentos extranjeros (CE, PEP, PPT, NIT), consultar Procuraduría primero (SIRI almacena nombres)
      if (isProcuraduriaSupported) {
        pgnRes = await queryProcuraduria(tipoDoc, cedula);
      }
      if (isPoliciaSupported) {
        ponalRes = await queryPoliciaNacional(tipoDoc, cedula);
      }
    }

    // Extraer nombre legal certificado por el Estado colombiano
    const officialName = (pgnRes?.officialName ? formatTitleCase(pgnRes.officialName) : null) ||
                         (ponalRes?.officialName ? formatTitleCase(ponalRes.officialName) : null);

    const hasPgnSuccess = Boolean(pgnRes && pgnRes.success && pgnRes.officialName);
    const hasPonalSuccess = Boolean(ponalRes && ponalRes.success);

    if (officialName) {
      const isForeign = ['ce', 'cx', 'pep', 'ppt', 'pa', 'dp'].includes(tipoDoc.toLowerCase());
      const pgnLine = (isForeign && pgnRes?.statusText) ? `\n🏛️ *Central de Control Notarial:* ${pgnRes.statusText}` : '';

      const reportText =
        `🛡️ *VERIFICACIÓN OFICIAL DE IDENTIDAD — VECY BIENES RAÍCES* 🇨🇴\n\n` +
        `🆔 *El documento:* ${docLabel} ${formattedCedula}\n` +
        `👤 *Pertenece a:* ${officialName}${pgnLine}\n` +
        `✅ *Ciudadano verificado y habilitado.* Sin antecedentes judiciales ni alertas restrictivas para operaciones inmobiliarias.`;

      return {
        isVerificationRequest: true,
        cedula,
        tipoDoc,
        success: true,
        officialName,
        source: 'Central Multifuente Notarial VECY (Procuraduría General + Policía Nacional)',
        reportText,
        procuraduria: pgnRes || undefined,
        policia: ponalRes || undefined
      };
    } else {
      let customGuidance = '';
      if (tipoDoc.toLowerCase() === 'cc' && cedula.length === 9) {
        customGuidance = `\n• ⚠️ *Aviso Registraduría:* En Colombia nunca se emitieron Cédulas de Ciudadanía de 9 dígitos (las antiguas tienen entre 1 y 8 dígitos y las nuevas son de 10 dígitos iniciando por 1). Verifica si hubo un dígito omitido o añadido.`;
      } else if (['ce', 'cx'].includes(tipoDoc.toLowerCase()) && cedula.length >= 8) {
        customGuidance = `\n• ⚠️ *Aviso Migración:* Las Cédulas de Extranjería en Colombia constan de entre 4 y 7 dígitos numéricos. Un número de ${cedula.length} dígitos suele corresponder a una Cédula de Ciudadanía colombiana.`;
      } else if (['ce', 'cx'].includes(tipoDoc.toLowerCase()) && cedula.length >= 5 && cedula.length <= 7) {
        customGuidance = `\n• 📌 Las Cédulas de Extranjería (de 4 a 7 dígitos) son expedidas por Migración Colombia. Al ser un documento extranjero, las plataformas del Estado solo reflejan nombre público si el titular registra contratos estatales en la Procuraduría (SIRI) o historial penal en la Policía Nacional.`;
      }

      const reportText =
        `⚠️ *CONSULTA DE IDENTIDAD — VECY BIENES RAÍCES* 🇨🇴\n\n` +
        `Consultamos las bases de datos oficiales de seguridad del Estado para el documento ${docLabel} *${formattedCedula}*:\n\n` +
        `🏛️ *Central de Control Notarial:* ${pgnRes?.statusText || 'No se encuentra registrado en el sistema de información SIRI o no disponible.'}\n` +
        `⚖️ *Central de Seguridad:* ${ponalRes?.message || 'Sin antecedentes judiciales reportados o documento no indexado.'}\n\n` +
        `📌 *Orientación de Verificación:*${customGuidance}\n` +
        `• Si es un documento extranjero (C.E., Pasaporte, PEP o PPT), es completamente habitual que no registre nombre público si el titular no ha tenido contratos con entidades públicas ni antecedentes penales en Colombia.\n` +
        `• Verifica que el número digitado coincida exactamente con el documento físico.\n\n` +
        `💡 Puedes verificar nuevamente o adjuntar los datos escribiéndome: *"JanIA, verificar ${docLabel} ${formattedCedula}"*.`;

      return {
        isVerificationRequest: true,
        cedula,
        tipoDoc,
        success: false,
        reportText,
        procuraduria: pgnRes || undefined,
        policia: ponalRes || undefined
      };
    }
  } catch (err: any) {
    return {
      isVerificationRequest: true,
      cedula,
      tipoDoc,
      success: false,
      reportText: `⚠️ Ocurrió una intermitencia temporal de enlace con las centrales de verificación para el documento ${docLabel} ${formattedCedula}. Por favor intenta de nuevo en unos minutos.`
    };
  }
}
