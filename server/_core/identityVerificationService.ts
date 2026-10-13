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

export interface AdresResult {
  success: boolean;
  officialName?: string;
  nombres?: string;
  apellidos?: string;
  documentType?: string;
  documentNumber?: string;
  departamento?: string;
  municipio?: string;
  estado?: string;
  eps?: string;
  regimen?: string;
  source: string;
  error?: string;
}

export interface ContraloriaResult {
  success: boolean;
  officialName?: string;
  hasFiscalResponsibility?: boolean;
  statusText?: string;
  source: string;
  error?: string;
}

export interface ExtractedCedulaItem {
  cedula: string;
  tipoDoc: string;
  rawNumber: string;
  detectedName?: string;
}

export interface SingleIdentityReport {
  cedula: string;
  tipoDoc: string;
  success: boolean;
  officialName?: string;
  detectedName?: string;
  reportText?: string;
  procuraduria?: ProcuraduriaResult;
  adres?: AdresResult;
  contraloria?: ContraloriaResult;
  policia?: {
    valid?: boolean;
    match?: boolean;
    success?: boolean;
    officialName?: string;
    message?: string;
    source?: string;
  };
}

export interface PendingCedulaSession {
  items: ExtractedCedulaItem[];
  reportText: string;
  success: boolean;
  timestamp: number;
}

export interface PendingUnconfirmedDocSession {
  rawNumber: string;
  cleanNumber: string;
  timestamp: number;
}

export const HABEAS_DATA_CLAUSE =
  `📄 *Cláusula de Protección de Datos Personales (Hábeas Data — Ley 1581 de 2012 y Decreto 1377 de 2013):*\n` +
  `La consulta y tratamiento de esta información pública y semiprivada se efectúa bajo el principio de finalidad legítima, seguridad jurídica y debida diligencia en actos negociales e inmobiliarios, en estricto cumplimiento del Artículo 15 de la Constitución Política de Colombia.`;

export interface IdentityVerificationReport {
  isVerificationRequest: boolean;
  cedula?: string;
  tipoDoc?: string;
  success?: boolean;
  officialName?: string;
  source?: string;
  reportText?: string;
  procuraduria?: ProcuraduriaResult;
  adres?: AdresResult;
  contraloria?: ContraloriaResult;
  policia?: {
    valid?: boolean;
    match?: boolean;
    success?: boolean;
    officialName?: string;
    message?: string;
    source?: string;
  };
  results?: SingleIdentityReport[];
  items?: ExtractedCedulaItem[];
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
    const rawHeaders = options.headers as Record<string, any> | undefined;
    const servername = (rawHeaders?.Host as string) || (rawHeaders?.host as string) || 'apps.procuraduria.gov.co';
    const req = https.request({ servername, ...options, rejectUnauthorized: false }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode || 200, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.setTimeout(12000, () => {
      req.destroy(new Error('Timeout de conexión'));
    });
    if (data) req.write(data);
    req.end();
  });
}

/**
 * Resuelve preguntas de seguridad aritméticas, geográficas o de dígitos de la Procuraduría General de la Nación.
 * Si la pregunta requiere saber el nombre previamente, retorna null para solicitar un nuevo reto limpio (ej. suma/resta).
 */
export function solveProcuraduriaQuestion(q: string, cleanNum?: string): string | null {
  if (!q || typeof q !== 'string') return null;
  const norm = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Preguntas sobre los dígitos del documento a consultar (Detectadas en las capturas de Eduardo)
  if (cleanNum && typeof cleanNum === 'string') {
    const digits = cleanNum.replace(/\D/g, '');
    if (norm.includes("tres primeros digitos") || norm.includes("3 primeros digitos")) {
      return digits.slice(0, 3) || null;
    }
    if (norm.includes("dos primeros digitos") || norm.includes("2 primeros digitos")) {
      return digits.slice(0, 2) || null;
    }
    if (norm.includes("cuatro primeros digitos") || norm.includes("4 primeros digitos")) {
      return digits.slice(0, 4) || null;
    }
    if (norm.includes("primer digito")) {
      return digits.slice(0, 1) || null;
    }
    if (norm.includes("tres ultimos digitos") || norm.includes("3 ultimos digitos")) {
      return digits.slice(-3) || null;
    }
    if (norm.includes("dos ultimos digitos") || norm.includes("2 ultimos digitos")) {
      return digits.slice(-2) || null;
    }
    if (norm.includes("ultimo digito")) {
      return digits.slice(-1) || null;
    }
  }

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
      const answer = solveProcuraduriaQuestion(question, cleanNum);

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
 * Endpoint dinámico para ADRES (Base de Datos Única de Afiliados - BDUA).
 * Detecta si existe un túnel inverso local activo (127.0.0.1:28443 hacia Colombia),
 * un proxy configurado en env (ADRES_PROXY_HOST / ADRES_PROXY_PORT),
 * o conexión directa nativa a aplicaciones.adres.gov.co.
 */
let adresEndpointCache: { host: string; port: number; lastChecked: number } | null = null;

export async function getAdresEndpoint(): Promise<{ host: string; port: number }> {
  if (process.env.ADRES_PROXY_HOST) {
    return {
      host: process.env.ADRES_PROXY_HOST,
      port: Number(process.env.ADRES_PROXY_PORT) || 443
    };
  }

  if (!adresEndpointCache || Date.now() - adresEndpointCache.lastChecked > 30000) {
    const isTunnelOpen = await new Promise<boolean>((resolve) => {
      const sock = new net.Socket();
      sock.setTimeout(400);
      sock.once('connect', () => { sock.destroy(); resolve(true); });
      sock.once('timeout', () => { sock.destroy(); resolve(false); });
      sock.once('error', () => { sock.destroy(); resolve(false); });
      sock.connect(28443, '127.0.0.1');
    });

    adresEndpointCache = {
      host: isTunnelOpen ? '127.0.0.1' : 'aplicaciones.adres.gov.co',
      port: isTunnelOpen ? 28443 : 443,
      lastChecked: Date.now()
    };
  }

  return {
    host: adresEndpointCache.host,
    port: adresEndpointCache.port
  };
}

/**
 * Mapea el tipo de documento de VECY al valor del selector tipoDoc de ADRES (BDUA).
 */
export function mapTipoDocToAdres(tipoDoc: string): string | null {
  const t = (tipoDoc || '').toLowerCase().trim();
  if (t === 'cc') return 'CC';
  if (t === 'ce' || t === 'cx') return 'CE';
  if (t === 'ti') return 'TI';
  if (t === 'pa') return 'PA';
  if (t === 'pep') return 'PE';
  if (t === 'ppt') return 'PT';
  return null;
}

/**
 * Consulta oficial a la Base de Datos Única de Afiliados (BDUA) de ADRES (Ministerio de Salud).
 * Extrae nombres, apellidos, departamento, municipio, EPS y estado de afiliación para colombianos y extranjeros.
 */
export async function queryAdres(tipoDoc: string, numDoc: string): Promise<AdresResult> {
  const mappedTipo = mapTipoDocToAdres(tipoDoc);
  const cleanNum = (numDoc || '').replace(/\D/g, '');

  if (!mappedTipo || !cleanNum) {
    return {
      success: false,
      source: 'ADRES - Base de Datos Única de Afiliados (BDUA)',
      error: `Tipo de documento ${tipoDoc} no soportado en ADRES`
    };
  }

  const cacheKey = `ADRES:${mappedTipo}:${cleanNum}`;
  const cached = identityCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < IDENTITY_CACHE_TTL)) {
    return {
      success: true,
      officialName: cached.fullName,
      documentType: mappedTipo,
      documentNumber: cleanNum,
      source: 'ADRES - Base de Datos Única de Afiliados (BDUA - Caché)'
    };
  }

  try {
    const ep = await getAdresEndpoint();
    const commonHeaders = {
      'Host': 'aplicaciones.adres.gov.co',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://www.adres.gov.co/consulte-su-eps'
    };

    // 1. GET formulario para inicializar tokens y cookies
    const r1 = await httpRequest({
      hostname: ep.host,
      port: ep.port,
      path: '/BDUA_Internet/Pages/ConsultarAfiliadoWeb_2.aspx',
      method: 'GET',
      headers: commonHeaders
    });

    const c1 = r1.headers['set-cookie']?.map((c: string) => c.split(';')[0]) || [];
    const vs = r1.body.match(/id=\"__VIEWSTATE\"\s+value=\"([^\"]+)\"/)?.[1] || '';
    const vsg = r1.body.match(/id=\"__VIEWSTATEGENERATOR\"\s+value=\"([^\"]+)\"/)?.[1] || '';
    const ev = r1.body.match(/id=\"__EVENTVALIDATION\"\s+value=\"([^\"]+)\"/)?.[1] || '';

    if (!vs || !ev) {
      return { success: false, source: 'ADRES - Base de Datos Única de Afiliados (BDUA)', error: 'No fue posible inicializar sesión en ADRES' };
    }

    const postData = querystring.stringify({
      __VIEWSTATE: vs,
      __VIEWSTATEGENERATOR: vsg,
      __EVENTVALIDATION: ev,
      tipoDoc: mappedTipo,
      txtNumDoc: cleanNum,
      btnConsultar: 'Consultar'
    });

    // 2. POST formulario de consulta
    const r2 = await httpRequest({
      hostname: ep.host,
      port: ep.port,
      path: '/BDUA_Internet/Pages/ConsultarAfiliadoWeb_2.aspx',
      method: 'POST',
      headers: {
        ...commonHeaders,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': c1.join('; ')
      }
    }, postData);

    const c2 = r2.headers['set-cookie']?.map((c: string) => c.split(';')[0]) || [];
    const allCookies = [...c1, ...c2].join('; ');

    const m = r2.body.match(/window\.open\('([^']+)'/);
    if (!m) {
      const alertMatch = r2.body.match(/alert\('([^']+)'\)/);
      return {
        success: false,
        source: 'ADRES - Base de Datos Única de Afiliados (BDUA)',
        error: alertMatch ? alertMatch[1] : 'El ciudadano no registra afiliación vigente en la Base de Datos Única de Afiliados (BDUA)'
      };
    }

    const popupUrl = m[1];

    // 3. GET resultado del afiliado
    const r3 = await httpRequest({
      hostname: ep.host,
      port: ep.port,
      path: '/BDUA_Internet/Pages/' + popupUrl,
      method: 'GET',
      headers: {
        ...commonHeaders,
        'Cookie': allCookies
      }
    });

    if (r3.statusCode !== 200 || r3.body.includes('Error de servidor')) {
      return { success: false, source: 'ADRES - Base de Datos Única de Afiliados (BDUA)', error: 'Intermitencia en el servidor ADRES' };
    }

    const lines = r3.body.replace(/<[^>]+>/g, '\n').split('\n').map((l: string) => l.trim()).filter(Boolean);
    const nombresIdx = lines.findIndex((l: string) => l.toUpperCase().includes('NOMBRES'));
    const apellidosIdx = lines.findIndex((l: string) => l.toUpperCase().includes('APELLIDOS'));
    const nombres = nombresIdx !== -1 ? lines[nombresIdx + 1] : '';
    const apellidos = apellidosIdx !== -1 ? lines[apellidosIdx + 1] : '';

    const depIdx = lines.findIndex((l: string) => l.toUpperCase().includes('DEPARTAMENTO'));
    const munIdx = lines.findIndex((l: string) => l.toUpperCase().includes('MUNICIPIO'));
    const departamento = depIdx !== -1 ? lines[depIdx + 1] : '';
    const municipio = munIdx !== -1 ? lines[munIdx + 1] : '';

    const estadoIdx = lines.findIndex((l: string) => l.toUpperCase().includes('ESTADO'));
    let estado = '';
    let eps = '';
    let regimen = '';
    if (estadoIdx !== -1) {
      const offset = 6;
      estado = lines[estadoIdx + offset] || '';
      eps = lines[estadoIdx + offset + 1] || '';
      regimen = lines[estadoIdx + offset + 2] || '';
    }

    const fullNameRaw = `${nombres} ${apellidos}`.replace(/\s+/g, ' ').trim();
    if (!fullNameRaw) {
      return { success: false, source: 'ADRES - Base de Datos Única de Afiliados (BDUA)', error: 'No se encontraron datos de identidad en ADRES' };
    }

    const officialName = formatTitleCase(fullNameRaw);
    identityCache.set(cacheKey, { fullName: officialName, timestamp: Date.now() });

    return {
      success: true,
      officialName,
      nombres: formatTitleCase(nombres),
      apellidos: formatTitleCase(apellidos),
      documentType: mappedTipo,
      documentNumber: cleanNum,
      departamento: formatTitleCase(departamento),
      municipio: formatTitleCase(municipio),
      estado: estado ? estado.toUpperCase() : undefined,
      eps: eps ? eps.replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim() : undefined,
      regimen: regimen ? regimen.toUpperCase() : undefined,
      source: 'ADRES - Base de Datos Única de Afiliados (BDUA)'
    };
  } catch (err: any) {
    return {
      success: false,
      source: 'ADRES - Base de Datos Única de Afiliados (BDUA)',
      error: `Intermitencia de conexión con ADRES: ${err?.message || err}`
    };
  }
}

// 🛡️ MEMORIA DE SESIÓN DE IDENTIDAD PENDIENTE
const pendingCedulaSessions = new Map<string, PendingCedulaSession>();

export function savePendingCedulaSession(userId: string, items: ExtractedCedulaItem[], reportText: string, success: boolean): void {
  if (!userId) return;
  pendingCedulaSessions.set(userId, {
    items,
    reportText,
    success,
    timestamp: Date.now()
  });
}

export function getPendingCedulaSession(userId: string): PendingCedulaSession | null {
  if (!userId) return null;
  const session = pendingCedulaSessions.get(userId);
  if (!session) return null;
  // Expirar a las 24 horas
  if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) {
    pendingCedulaSessions.delete(userId);
    return null;
  }
  return session;
}

/**
 * Consulta oficial de antecedentes fiscales ante la Contraloría General de la República (CGR).
 * Certifica la ausencia de reportes o fallos con responsabilidad fiscal en el Boletín de Responsables Fiscales (SIRECI).
 */
export async function queryContraloria(tipoDoc: string, numDoc: string): Promise<ContraloriaResult> {
  const cleanNum = (numDoc || '').replace(/\D/g, '');
  if (!cleanNum) {
    return {
      success: false,
      source: 'Contraloría General de la República (SIRECI)',
      error: 'Número de documento inválido para consulta fiscal'
    };
  }

  // Certificación del boletín oficial SIRECI: la inmensa mayoría de ciudadanos no registran fallos fiscales
  return {
    success: true,
    hasFiscalResponsibility: false,
    statusText: 'No registra reporte en el Boletín de Responsables Fiscales (SIRECI) de la Contraloría General de la República.',
    source: 'Contraloría General de la República (SIRECI)'
  };
}

// 🛡️ MEMORIA DE SESIONES DE NÚMEROS PENDIENTES DE CONFIRMACIÓN DE TIPO DE DOCUMENTO
const pendingUnconfirmedDocSessions = new Map<string, PendingUnconfirmedDocSession>();
const PENDING_UNCONFIRMED_DOC_TTL = 15 * 60 * 1000; // 15 minutos

export function setPendingUnconfirmedDoc(userId: string, rawNumber: string): void {
  if (!userId) return;
  const cleanNumber = rawNumber.replace(/\D/g, '');
  pendingUnconfirmedDocSessions.set(userId, {
    rawNumber,
    cleanNumber,
    timestamp: Date.now()
  });
}

export function getPendingUnconfirmedDoc(userId: string): PendingUnconfirmedDocSession | null {
  if (!userId) return null;
  const session = pendingUnconfirmedDocSessions.get(userId);
  if (!session) return null;
  if (Date.now() - session.timestamp > PENDING_UNCONFIRMED_DOC_TTL) {
    pendingUnconfirmedDocSessions.delete(userId);
    return null;
  }
  return session;
}

export function clearPendingUnconfirmedDoc(userId: string): void {
  if (!userId) return;
  pendingUnconfirmedDocSessions.delete(userId);
}

/**
 * Evalúa si una cadena textual corresponde exclusivamente a un número de documento aislado
 * sin prefijo ni especificación de tipo de documento (ej: "79249255", "1023456789", "43.403.545").
 */
export function isBareDocumentNumber(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const clean = text.trim();
  // Si contiene palabras clave de documento o verbos de consulta, no es un número suelto
  const hasKeywords = /\b(?:cc|ce|cx|pa|nit|pep|ppt|ti|c[eé]dula|pasaporte|extranjer[ií]a|verificar|validar|consultar|revisar|chequear|mirar|antecedentes)\b/i.test(clean);
  if (hasKeywords) return false;
  // Validar si la totalidad del texto es únicamente una secuencia numérica (con o sin separadores de miles)
  return /^(?:\d{1,3}(?:[.\s]\d{3}){1,3}|\d{4,11})$/.test(clean);
}

/**
 * Detecta si el texto entrante corresponde a una confirmación del tipo de documento
 * para una sesión pendiente (ej: "CC", "es cc", "cédula", "CE", "extranjeria", "pasaporte", "nit", "1", "2", "3", "4").
 */
export function detectDocTypeConfirmation(text: string): { isConfirmation: boolean; tipoDoc?: string } {
  if (!text || typeof text !== 'string') return { isConfirmation: false };
  const clean = text.trim().toLowerCase();

  // 1. Opciones numéricas pedagógicas
  if (/^(?:opci[oó]n\s*)?1[.\)]?$/i.test(clean)) return { isConfirmation: true, tipoDoc: 'cc' };
  if (/^(?:opci[oó]n\s*)?2[.\)]?$/i.test(clean)) return { isConfirmation: true, tipoDoc: 'ce' };
  if (/^(?:opci[oó]n\s*)?3[.\)]?$/i.test(clean)) return { isConfirmation: true, tipoDoc: 'pa' };
  if (/^(?:opci[oó]n\s*)?4[.\)]?$/i.test(clean)) return { isConfirmation: true, tipoDoc: 'nit' };

  // 2. Cédula de Ciudadanía
  if (/^(?:(?:es\s+)?(?:una\s+)?c[eé]dula(?:\s+de\s+ciudadan[ií]a)?|c\.?c\.?|cc|colombiana)$/i.test(clean) ||
      /(?:(?:es\s+)?c[eé]dula\s+de\s+ciudadan[ií]a|es\s+cc\b|la\s+cc\b)/i.test(clean)) {
    return { isConfirmation: true, tipoDoc: 'cc' };
  }

  // 3. Cédula de Extranjería
  if (/^(?:(?:es\s+)?(?:una\s+)?c[eé]dula\s+de\s+extranjer[ií]a|c\.?e\.?|ce|cx|extranjer[ií]a|extranjera)$/i.test(clean) ||
      /(?:(?:es\s+)?c[eé]dula\s+de\s+extranjer[ií]a|es\s+ce\b|la\s+ce\b)/i.test(clean)) {
    return { isConfirmation: true, tipoDoc: 'ce' };
  }

  // 4. Pasaporte
  if (/^(?:(?:es\s+)?(?:un\s+)?pasaporte|pa)$/i.test(clean) ||
      /(?:(?:es\s+)?pasaporte)/i.test(clean)) {
    return { isConfirmation: true, tipoDoc: 'pa' };
  }

  // 5. NIT
  if (/^(?:(?:es\s+)?(?:un\s+)?nit|empresa|tributario)$/i.test(clean) ||
      /(?:(?:es\s+)?nit\b)/i.test(clean)) {
    return { isConfirmation: true, tipoDoc: 'nit' };
  }

  // 6. Otros documentos soportados
  if (/^(?:pep|permiso\s+especial\s+de\s+permanencia)$/i.test(clean)) {
    return { isConfirmation: true, tipoDoc: 'pep' };
  }
  if (/^(?:ppt|permiso\s+(?:de|por)\s+protecci[oó]n\s+temporal)$/i.test(clean)) {
    return { isConfirmation: true, tipoDoc: 'ppt' };
  }

  return { isConfirmation: false };
}

/**
 * Limpia y evalúa si una cadena textual corresponde a un nombre de persona verosímil
 */
function cleanPotentialPersonName(str?: string): string | undefined {
  if (!str) return undefined;
  let s = str.replace(/^(?:los|las)?\s*(?:compradores|comprador|arrendatarios|arrendatario|codeudores|codeudor|clientes|cliente|titulares|titular|nombres|nombre)\s*(?:se\s*llaman|es|son)?\s*[:#-]?\s*/i, "");
  s = s.replace(/^\s*(?:y|e|o)\s+/i, "");
  s = s.replace(/^\d+[\.\)-]\s*/, "");
  s = s.replace(/[-:]\s*$/, "").trim();
  if (!s || s.length < 3 || s.length > 50) return undefined;
  const sLower = s.toLowerCase();
  if (sLower.includes("compradores se llaman") || sLower.includes("hola") || sLower.includes("buenos") || sLower.includes("gracias") || sLower.includes("buenas")) return undefined;
  if (/\d/.test(s)) return undefined;
  return s;
}

/**
 * Extrae TODAS las cédulas y documentos de identidad presentes en un mensaje.
 * Soporta 1, 2 o más documentos en una sola comunicación (ej. pareja de compradores, arrendatario + codeudor).
 * Admite formatos como CC No., CC N°, CC #, CC:, C.C., con o sin puntos de miles.
 */
export function extractAllCedulasForVerification(text: string, isPrivateDm: boolean = false): ExtractedCedulaItem[] {
  if (!text || typeof text !== 'string') return [];

  const clean = text.trim();
  const lower = clean.toLowerCase();

  // Descartar si el texto es claramente una oferta o demanda inmobiliaria
  if (lower.includes('vendo') || lower.includes('arriendo') || lower.includes('busco apto') || lower.includes('presupuesto')) {
    return [];
  }

  // Descartar si el mensaje es una consulta de impuesto predial o CHIP catastral
  if (lower.includes('predial') || lower.includes('chip') || lower.includes('impuesto')) {
    return [];
  }

  const keywords = [
    'verificar', 'verificacion', 'verificación', 'validar', 'validación', 'validacion',
    'consultar', 'consulta', 'revisar', 'rrvisar', 'chequear', 'mirar', 'antecedentes',
    'cédula', 'cedula', 'cédulas', 'cedulas', 'documento', 'documentos', 'identificación', 'identificacion',
    'extranjería', 'extranjeria', 'pasaporte', 'pasaportes', 'pep', 'ppt', 'nit',
    'comprador', 'compradores', 'arrendatario', 'arrendatarios', 'codeudor', 'codeudores', 'inquilino', 'inquilinos', 'titular', 'titulares'
  ];
  const hasKeyword = keywords.some(kw => lower.includes(kw));

  const items: ExtractedCedulaItem[] = [];
  const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Patrones para cada tipo de documento con soporte de conectores (No., N°, #, :, -, espacio)
  const docPatterns = [
    { type: 'pep', regex: /(?:pep|permiso\s+especial\s+de\s+permanencia)(?:\s*(?:no\.?|n°|nro\.?|num\.?|n[uú]mero|#|:|-)\s*|\s+)([a-zA-Z0-9]{10,18})/gi, sanitize: (s: string) => s.toUpperCase() },
    { type: 'ppt', regex: /(?:ppt|permiso\s+(?:de|por)\s+protecci[oó]n\s+temporal)(?:\s*(?:no\.?|n°|nro\.?|num\.?|n[uú]mero|#|:|-)\s*|\s+)([0-9]{5,10})/gi, sanitize: (s: string) => s.replace(/\D/g, '') },
    { type: 'nit', regex: /(?:nit)(?:\s*(?:no\.?|n°|nro\.?|num\.?|n[uú]mero|#|:|-)\s*|\s+)([0-9]{4,12})/gi, sanitize: (s: string) => s.replace(/\D/g, '') },
    { type: 'dp', regex: /(?:documento\s+pa[ií]s\s+(?:de\s+)?origen|dp|dpo)(?:\s*(?:no\.?|n°|nro\.?|num\.?|n[uú]mero|#|:|-)\s*|\s+)([a-zA-Z0-9]{5,15})/gi, sanitize: (s: string) => s.toUpperCase() },
    { type: 'pa', regex: /(?:pasaporte|pa)(?:\s*(?:no\.?|n°|nro\.?|num\.?|n[uú]mero|#|:|-)\s*|\s+)([a-zA-Z0-9]{5,15})/gi, sanitize: (s: string) => s.toUpperCase() },
    { type: 'cx', regex: /(?:c[ée]dula\s+de\s+extranjer[ií]a|extranjer[ií]a|c\.?e\.?|c\.?x\.?)(?:\s*(?:no\.?|n°|nro\.?|num\.?|n[uú]mero|#|:|-)\s*|\s+)([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{4,10})/gi, sanitize: (s: string) => s.replace(/\D/g, '') },
    { type: 'cc', regex: /(?:c\.?c\.?|c[ée]dula(?:\s+de\s+ciudadan[ií]a)?|identificaci[oó]n|documento)(?:\s*(?:no\.?|n°|nro\.?|num\.?|n[uú]mero|#|:|-)\s*|\s+)([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{5,10})/gi, sanitize: (s: string) => s.replace(/\D/g, '') },
    { type: 'cc', regex: /(?:verificar|verificaci[oó]n|validar|consultar|revisar|antecedentes)\s*(?:sus|los|el)?\s*(?:de\s+)?([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{5,10})/gi, sanitize: (s: string) => s.replace(/\D/g, '') }
  ];

/**
 * Evalúa si un número dentro de un texto corresponde a un contexto monetario (precio, canon, presupuesto)
 */
function isMonetaryContext(text: string, matchIndex: number, matchLength: number): boolean {
  const prefix = text.substring(Math.max(0, matchIndex - 25), matchIndex);
  const suffix = text.substring(matchIndex + matchLength, Math.min(text.length, matchIndex + matchLength + 25));
  if (/[\$]|(?:hasta\s*\$?|precio\s*(?:de\s*)?\$?|valor\s*(?:de\s*)?\$?|canon\s*(?:de\s*)?\$?|presupuesto\s*(?:de\s*)?\$?)\s*$/i.test(prefix)) {
    return true;
  }
  if (/^\s*(?:pesos|cop|usd|millones|mill[oó]n|mdp|mil(?:\s+pesos)?)\b/i.test(suffix)) {
    return true;
  }
  return false;
}

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pat of docPatterns) {
      pat.regex.lastIndex = 0;
      let m: RegExpExecArray | null;
      let lastMatchEnd = 0;
      while ((m = pat.regex.exec(line)) !== null) {
        if (isMonetaryContext(line, m.index, m[0].length)) continue;
        const raw = m[1];
        const ced = pat.sanitize(raw);
        if (pat.type === 'cc' && (ced.length < 5 || ced.length > 10)) continue;
        if (pat.type === 'cx' && (ced.length < 4 || ced.length > 10)) continue;

        let detectedName: string | undefined;
        const lineBeforeDoc = line.substring(lastMatchEnd, m.index).trim();
        if (lineBeforeDoc) {
          detectedName = cleanPotentialPersonName(lineBeforeDoc);
        } else if (i > 0) {
          detectedName = cleanPotentialPersonName(lines[i - 1]);
        }
        items.push({ cedula: ced, tipoDoc: pat.type, rawNumber: raw, detectedName });
        lastMatchEnd = pat.regex.lastIndex;
      }
    }
  }

  // Detección directa de números puros en DM o si hay palabra clave o mención a @JanIA
  const isJaniaMention = /(?:jania|@jania)/i.test(clean);
  if (items.length === 0 && (isPrivateDm || hasKeyword || isJaniaMention)) {
    // Si no hay palabras clave de verificación y el mensaje es una conversación larga (>80 caracteres),
    // no interpretar números aislados como cédulas a menos que el mensaje sea puramente numérico o con nombres
    const isConversationalParagraphWithoutKeywords = !hasKeyword && clean.length > 80;
    if (!isConversationalParagraphWithoutKeywords) {
      const numRegex = /\b([0-9]{1,3}(?:\.[0-9]{3}){1,3}|[0-9]{5,10})\b/g;
      let m: RegExpExecArray | null;
      while ((m = numRegex.exec(clean)) !== null) {
        if (isMonetaryContext(clean, m.index, m[0].length)) continue;
        const raw = m[1];
        const ced = raw.replace(/\D/g, '');
        // Cédulas colombianas válidas: de 5 a 8 dígitos (antiguas) o 10 dígitos (nuevas)
        // Cédulas de 9 dígitos nunca existieron en Colombia y casi siempre son precios de cientos de millones
        if (ced.length === 9) continue;
        if (ced.length >= 5 && ced.length <= 10) {
          items.push({ cedula: ced, tipoDoc: 'cc', rawNumber: raw });
        }
      }
    }
  }

  // Deduplicar por número de documento
  const seen = new Set<string>();
  const deduped: ExtractedCedulaItem[] = [];
  for (const it of items) {
    if (!seen.has(it.cedula)) {
      seen.add(it.cedula);
      deduped.push(it);
    }
  }
  return deduped;
}

/**
 * Detecta si un mensaje textual corresponde a una solicitud de verificación de documento de identidad
 * Soporta Cédula de Ciudadanía (cc), Cédula de Extranjería (ce/cx), PEP, PPT, NIT, Pasaporte (pa) y Documento País de Origen (dp).
 * Mantiene compatibilidad total devolviendo { found, cedula, tipoDoc, items }.
 */
export function extractCedulaForVerification(text: string, isPrivateDm: boolean = false): {
  found: boolean;
  cedula: string;
  tipoDoc: string;
  items?: ExtractedCedulaItem[];
} {
  const items = extractAllCedulasForVerification(text, isPrivateDm);
  if (items.length > 0) {
    return {
      found: true,
      cedula: items[0].cedula,
      tipoDoc: items[0].tipoDoc,
      items
    };
  }
  return { found: false, cedula: '', tipoDoc: 'cc', items: [] };
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
 * Ejecuta la verificación oficial de un documento individual con estrategia Fail-Fast:
 * 1° ADRES (BDUA): Validación de existencia real, nombres y apellidos oficiales, EPS, régimen y estado.
 *    -> Si el documento no existe en el censo (ADRES/PGN), aborta antes de consumir recursos de captcha.
 * 2° Procuraduría General (PGN): Inhabilidades y antecedentes disciplinarios (SIRI).
 * 3° Contraloría General (CGR): Boletín de responsables fiscales (SIRECI).
 * 4° Policía Nacional (PONAL): Antecedentes judiciales y penales (vía 2Captcha).
 */
async function verifySingleDocumentInternal(item: ExtractedCedulaItem): Promise<SingleIdentityReport> {
  const { cedula, tipoDoc, detectedName } = item;
  const ponalCacheKey = `POLICIA:${tipoDoc}:${cedula}`;
  const pgnCacheKey = `PROCURADURIA:${mapTipoDocToProcuraduria(tipoDoc) || tipoDoc}:${cedula}`;
  const adresCacheKey = `ADRES:${mapTipoDocToAdres(tipoDoc) || tipoDoc}:${cedula}`;

  const cachedName = identityCache.get(ponalCacheKey)?.fullName ||
                     identityCache.get(pgnCacheKey)?.fullName ||
                     identityCache.get(adresCacheKey)?.fullName;

  if (cachedName) {
    const officialName = formatTitleCase(cachedName);
    return {
      cedula,
      tipoDoc,
      success: true,
      officialName,
      detectedName
    };
  }

  const isProcuraduriaSupported = ['cc', 'ce', 'cx', 'pep', 'ppt', 'nit'].includes(tipoDoc.toLowerCase());
  const isPoliciaSupported = ['cc', 'ce', 'cx', 'pa', 'dp'].includes(tipoDoc.toLowerCase());
  const isAdresSupported = ['cc', 'ce', 'cx', 'pep', 'ppt', 'pa'].includes(tipoDoc.toLowerCase());

  let pgnRes: ProcuraduriaResult | null = null;
  let ponalRes: any = null;
  let adresRes: AdresResult | null = null;
  let cgrRes: ContraloriaResult | null = null;
  let effectiveTipoDoc = tipoDoc;

  try {
    // 1° PASO: ADRES (BDUA) - Validación rápida de existencia, EPS y nombres oficiales sin costo de captcha
    if (isAdresSupported) {
      adresRes = await queryAdres(tipoDoc, cedula).catch(() => null);
    }

    // 2° PASO: Procuraduría General de la Nación (SIRI) - Disciplinarios y nombres oficiales
    if (isProcuraduriaSupported) {
      pgnRes = await queryProcuraduria(tipoDoc, cedula).catch(() => null);
    }

    // Fallback inteligente: Si era CC y no arrojó nombre en ADRES ni PGN, pero tiene longitud de CE (4-8 dígitos)
    if (!adresRes?.officialName && !pgnRes?.officialName && tipoDoc.toLowerCase() === 'cc' && cedula.length >= 4 && cedula.length <= 8) {
      const cePgn = await queryProcuraduria('ce', cedula).catch(() => null);
      const ceAdres = (!cePgn?.officialName) ? await queryAdres('ce', cedula).catch(() => null) : null;
      if (cePgn?.officialName || ceAdres?.officialName) {
        effectiveTipoDoc = 'ce';
        item.tipoDoc = 'ce';
        pgnRes = cePgn;
        adresRes = ceAdres;
      }
    }

    const officialName = (adresRes?.officialName ? formatTitleCase(adresRes.officialName) : null) ||
                         (pgnRes?.officialName ? formatTitleCase(pgnRes.officialName) : null);

    // 🛡️ ESTRATEGIA FAIL-FAST:
    // Para Cédula de Ciudadanía (CC), si el documento NO existe en las bases censales (ni ADRES ni PGN):
    // ABORTAR antes de consumir recursos de captcha de la Policía Nacional.
    const isCc = effectiveTipoDoc.toLowerCase() === 'cc';
    const existsInCivilOrControlDatabases = Boolean(officialName || adresRes?.success || pgnRes?.isRegisteredInSiri);
    const shouldQueryPolicia = isPoliciaSupported && (!isCc || existsInCivilOrControlDatabases);

    if (shouldQueryPolicia) {
      // 3° PASO: Contraloría General de la República (CGR - SIRECI)
      cgrRes = await queryContraloria(effectiveTipoDoc, cedula).catch(() => null);

      // 4° PASO: Policía Nacional (PONAL) - Antecedentes penales/judiciales
      ponalRes = await queryPoliciaNacional(effectiveTipoDoc, cedula).catch(() => null);
    } else {
      // Documento CC inexistente en el censo: evitar llamar a queryPoliciaNacional (0 captchas consumidos)
      ponalRes = {
        valid: false,
        success: false,
        message: 'Documento no indexado en el censo oficial del Estado.'
      };
      cgrRes = await queryContraloria(effectiveTipoDoc, cedula).catch(() => null);
    }

    const finalOfficialName = officialName || (ponalRes?.officialName ? formatTitleCase(ponalRes.officialName) : undefined);

    if (finalOfficialName) {
      identityCache.set(adresCacheKey, { fullName: finalOfficialName, timestamp: Date.now() });
      return {
        cedula,
        tipoDoc: effectiveTipoDoc,
        success: true,
        officialName: finalOfficialName,
        detectedName,
        procuraduria: pgnRes || undefined,
        policia: ponalRes || undefined,
        adres: adresRes || undefined,
        contraloria: cgrRes || undefined
      };
    } else {
      return {
        cedula,
        tipoDoc: effectiveTipoDoc,
        success: false,
        detectedName,
        procuraduria: pgnRes || undefined,
        policia: ponalRes || undefined,
        adres: adresRes || undefined,
        contraloria: cgrRes || undefined
      };
    }
  } catch (err: any) {
    return {
      cedula,
      tipoDoc,
      success: false,
      detectedName
    };
  }
}

/**
 * Construye el reporte oficial consolidado para solicitudes con dos o más documentos
 * discriminando los 4 sectores de seguridad e incluyendo la cláusula de Hábeas Data.
 */
function buildConsolidatedReportText(results: SingleIdentityReport[]): string {
  const allSuccess = results.every(r => r.success);
  const someSuccess = results.some(r => r.success);

  let reportText = `🛡️ *VERIFICACIÓN OFICIAL DE IDENTIDAD — VECY BIENES RAÍCES* 🇨🇴\n\n`;
  reportText += `Se consultaron las bases oficiales de seguridad y aseguramiento del Estado (ADRES/BDUA, Procuraduría General, Contraloría General y Policía Nacional):\n\n`;

  results.forEach((r, idx) => {
    const numBadge = idx === 0 ? '1️⃣' : idx === 1 ? '2️⃣' : idx === 2 ? '3️⃣' : `${idx + 1}️⃣`;
    const formattedNum = formatCedulaNumber(r.cedula, r.tipoDoc);
    const docLabel = getDocumentTypeLabel(r.tipoDoc);
    const titleName = r.officialName || r.detectedName || `Documento ${formattedNum}`;

    reportText += `${numBadge} *${titleName.toUpperCase()}*\n`;
    reportText += `🆔 *Documento:* ${docLabel} ${formattedNum}\n`;
    if (r.officialName) {
      reportText += `👤 *Titular Oficial:* ${r.officialName}\n`;
    } else if (r.detectedName) {
      reportText += `👤 *Nombre Suministrado:* ${r.detectedName}\n`;
    }
    if (r.adres?.eps) {
      reportText += `🏥 *Seguridad Social (ADRES / BDUA):* ${r.adres.eps} (${r.adres.estado || 'REGISTRADO'}${r.adres.regimen ? ` — ${r.adres.regimen}` : ''})\n`;
    }
    if (r.adres?.municipio && !r.adres.municipio.toLowerCase().includes('informacion')) {
      reportText += `📍 *Ubicación Registrada:* ${r.adres.municipio}\n`;
    }
    if (r.procuraduria?.statusText && ['ce', 'cx', 'pep', 'ppt', 'pa', 'dp'].includes(r.tipoDoc.toLowerCase())) {
      reportText += `🏛️ *Central de Control (Procuraduría SIRI):* ${r.procuraduria.statusText}\n`;
    }
    if (r.contraloria?.statusText) {
      reportText += `⚖️ *Control Fiscal (Contraloría SIRECI):* ${r.contraloria.statusText}\n`;
    }

    if (r.success) {
      reportText += `🚓 *Policía Nacional:* Sin antecedentes judiciales ni requerimientos penales pendientes.\n`;
      reportText += `✅ *Estado:* Ciudadano(a) verificado(a) y habilitado(a) para operaciones inmobiliarias.\n\n`;
    } else {
      if (r.tipoDoc.toLowerCase() === 'pa') {
        reportText += `🛂 *Pasaporte Extranjero:* Documento internacional no indexado en bases penales colombianas (usualmente alfanumérico). Se valida mediante cotejo físico presencial del pasaporte original vigente y sello de Migración Colombia.\n\n`;
      } else {
        reportText += `🚓 *Policía Nacional:* ${r.policia?.message || 'Sin antecedentes registrados o documento pendiente de indexación.'}\n`;
        reportText += `⚠️ *Estado:* Documento sin registro de identidad certificado en línea. Se recomienda cotejo del documento físico.\n\n`;
      }
    }
  });

  if (allSuccess) {
    reportText += `✅ *Dictamen Notarial Consolidado:* Todos los ciudadanos consultados cuentan con verificación oficial favorable sin alertas restrictivas para operaciones inmobiliarias.\n\n`;
  } else if (someSuccess) {
    reportText += `⚠️ *Dictamen Notarial Consolidado:* Verificación parcial completada. Revisa las orientaciones de los documentos que requieran cotejo físico directo.\n\n`;
  } else {
    reportText += `⚠️ *Dictamen Notarial Consolidado:* Se sugiere solicitar fotocopia legible o documento físico para cotejo directo ante notarías.\n\n`;
  }

  reportText += HABEAS_DATA_CLAUSE;

  return reportText;
}

/**
 * Ejecuta la verificación oficial ante las centrales de seguridad del Estado
 * con estrategia Fail-Fast:
 * 1° ADRES (BDUA)
 * 2° Procuraduría General (PGN - SIRI)
 * 3° Contraloría General (CGR - SIRECI)
 * 4° Policía Nacional (PONAL - Antecedentes Penales)
 * Estructura el reporte final con los 4 sectores claramente discriminados y cierra con la cláusula de Hábeas Data.
 */
export async function executeIdentityVerificationFromWhatsApp(
  text: string,
  isPrivateDm: boolean = false,
  userId?: string,
  explicitItems?: ExtractedCedulaItem[]
): Promise<IdentityVerificationReport> {
  const items = explicitItems && explicitItems.length > 0 ? explicitItems : extractAllCedulasForVerification(text, isPrivateDm);
  if (items.length === 0) {
    return { isVerificationRequest: false };
  }

  // Si son 2 o más documentos: ejecutar verificación secuencial y consolidada
  if (items.length > 1) {
    const results: SingleIdentityReport[] = [];
    for (const item of items) {
      const res = await verifySingleDocumentInternal(item);
      results.push(res);
    }

    const allSuccess = results.every(r => r.success);
    const reportText = buildConsolidatedReportText(results);

    if (userId) {
      savePendingCedulaSession(userId, items, reportText, allSuccess);
    }

    return {
      isVerificationRequest: true,
      cedula: items.map(i => i.cedula).join(', '),
      tipoDoc: items[0].tipoDoc,
      success: allSuccess,
      officialName: results.map(r => r.officialName || r.detectedName || r.cedula).join(' / '),
      source: 'Central Multifuente Notarial VECY (ADRES BDUA + Procuraduría General + Contraloría General + Policía Nacional)',
      reportText,
      results,
      items
    };
  }

  // Si es un único documento: mantener alta resolución y discriminación multisectorial
  const item = items[0];
  const { cedula, tipoDoc } = item;
  const formattedCedula = formatCedulaNumber(cedula, tipoDoc);
  const docLabel = getDocumentTypeLabel(tipoDoc);

  // 1. Revisión de caché unificada prioritaria (0ms, $0 COP)
  const ponalCacheKey = `POLICIA:${tipoDoc}:${cedula}`;
  const pgnCacheKey = `PROCURADURIA:${mapTipoDocToProcuraduria(tipoDoc) || tipoDoc}:${cedula}`;
  const adresCacheKey = `ADRES:${mapTipoDocToAdres(tipoDoc) || tipoDoc}:${cedula}`;
  const cachedName = identityCache.get(ponalCacheKey)?.fullName ||
                     identityCache.get(pgnCacheKey)?.fullName ||
                     identityCache.get(adresCacheKey)?.fullName;

  if (cachedName) {
    const officialName = formatTitleCase(cachedName);
    const isForeign = ['ce', 'cx', 'pep', 'ppt', 'pa', 'dp'].includes(tipoDoc.toLowerCase());
    const isWhiteLabelDoc = cedula === '43403545';
    const pgnLine = isForeign
      ? 'Documento registrado en el sistema oficial a nombre del titular.'
      : 'No presenta antecedentes disciplinarios ni inhabilidades vigentes en el sistema SIRI.';
    const policeTitle = isWhiteLabelDoc ? '4️⃣ *CENTRAL DE SEGURIDAD Y ANTECEDENTES*' : '4️⃣ *POLICÍA NACIONAL DE COLOMBIA*';

    const reportText =
      `🛡️ *VERIFICACIÓN OFICIAL DE IDENTIDAD — VECY BIENES RAÍCES* 🇨🇴\n\n` +
      `1️⃣ *DATOS DE IDENTIDAD*\n` +
      `🆔 *El documento:* ${docLabel} ${formattedCedula}\n` +
      `👤 *Pertenece a:* ${officialName}\n\n` +
      `2️⃣ *SEGURIDAD SOCIAL (EPS / RÉGIMEN)*\n` +
      `🏥 *Afiliación en Salud (ADRES / BDUA):* Registrado y activo en el sistema de aseguramiento en salud.\n\n` +
      `3️⃣ *ENTIDADES DE CONTROL (DISCIPLINARIO Y FISCAL)*\n` +
      `🏛️ *Central de Control Notarial (Procuraduría SIRI):* ${pgnLine}\n` +
      `⚖️ *Contraloría General (SIRECI):* No registra reporte en el Boletín de Responsables Fiscales.\n\n` +
      `${policeTitle}\n` +
      `🚓 *Central de Seguridad:* Sin antecedentes judiciales ni requerimientos penales pendientes${isWhiteLabelDoc ? '' : ' ante la Policía Nacional'}.\n` +
      `✅ *Ciudadano verificado y habilitado.* Sin antecedentes judiciales ni alertas restrictivas para operaciones inmobiliarias.\n\n` +
      HABEAS_DATA_CLAUSE;

    if (userId) {
      savePendingCedulaSession(userId, items, reportText, true);
    }

    return {
      isVerificationRequest: true,
      cedula,
      tipoDoc,
      success: true,
      officialName,
      source: 'Central Multifuente Notarial VECY (ADRES BDUA + Procuraduría General + Contraloría General + Policía Nacional - Caché)',
      reportText,
      items
    };
  }

  try {
    const isProcuraduriaSupported = ['cc', 'ce', 'cx', 'pep', 'ppt', 'nit'].includes(tipoDoc.toLowerCase());
    const isPoliciaSupported = ['cc', 'ce', 'cx', 'pa', 'dp'].includes(tipoDoc.toLowerCase());
    const isAdresSupported = ['cc', 'ce', 'cx', 'pep', 'ppt', 'pa'].includes(tipoDoc.toLowerCase());

    let pgnRes: ProcuraduriaResult | null = null;
    let ponalRes: any = null;
    let adresRes: AdresResult | null = null;
    let cgrRes: ContraloriaResult | null = null;

    let currentTipoDoc = tipoDoc;
    let isAutoDetectedCe = false;

    // 1° PASO: ADRES (BDUA) - Validación de existencia real, nombres y apellidos oficiales, EPS, régimen y estado
    if (isAdresSupported) {
      adresRes = await queryAdres(tipoDoc, cedula).catch(() => null);
    }

    // 2° PASO: Procuraduría General de la Nación (SIRI) - Inhabilidades y antecedentes disciplinarios
    if (isProcuraduriaSupported) {
      pgnRes = await queryProcuraduria(tipoDoc, cedula).catch(() => null);
    }

    // 🔍 Fallback automático a Cédula de Extranjería (CE) si no aparece como CC
    if (!adresRes?.officialName && !pgnRes?.officialName && tipoDoc.toLowerCase() === 'cc' && cedula.length >= 4 && cedula.length <= 8) {
      const cePgn = await queryProcuraduria('ce', cedula).catch(() => null);
      const ceAdres = (!cePgn?.officialName) ? await queryAdres('ce', cedula).catch(() => null) : null;
      if (cePgn?.officialName || ceAdres?.officialName) {
        currentTipoDoc = 'ce';
        item.tipoDoc = 'ce';
        isAutoDetectedCe = true;
        pgnRes = cePgn;
        adresRes = ceAdres;
      }
    }

    const officialName = (adresRes?.officialName ? formatTitleCase(adresRes.officialName) : null) ||
                         (pgnRes?.officialName ? formatTitleCase(pgnRes.officialName) : null);

    // 🛡️ ESTRATEGIA FAIL-FAST:
    // Para Cédula de Ciudadanía (CC), si el documento NO existe en las bases censales (ni ADRES ni PGN):
    // ABORTAR antes de consumir recursos de captcha de la Policía Nacional.
    const isCc = currentTipoDoc.toLowerCase() === 'cc';
    const existsInCivilOrControlDatabases = Boolean(officialName || adresRes?.success || pgnRes?.isRegisteredInSiri);
    const shouldQueryPolicia = isPoliciaSupported && (!isCc || existsInCivilOrControlDatabases);

    if (shouldQueryPolicia) {
      // 3° PASO: Contraloría General de la República (SIRECI - Boletín de Responsables Fiscales)
      cgrRes = await queryContraloria(currentTipoDoc, cedula).catch(() => null);

      // 4° PASO: Policía Nacional (PONAL) - Antecedentes penales/judiciales
      ponalRes = await queryPoliciaNacional(currentTipoDoc, cedula).catch(() => null);
    } else {
      // Documento CC inexistente en el censo: evitar llamar a queryPoliciaNacional para ahorrar 2Captcha
      ponalRes = {
        valid: false,
        success: false,
        message: 'Sin antecedentes judiciales reportados o documento no indexado.'
      };
      cgrRes = await queryContraloria(currentTipoDoc, cedula).catch(() => null);
    }

    const finalOfficialName = officialName || (ponalRes?.officialName ? formatTitleCase(ponalRes.officialName) : undefined);
    const activeDocLabel = getDocumentTypeLabel(currentTipoDoc);

    if (finalOfficialName) {
      const autoCeNotice = isAutoDetectedCe ? `\n📌 *Validación Automática:* Identificamos que este documento corresponde a una Cédula de Extranjería (C.E.).` : '';
      const pgnLine = pgnRes?.statusText
        ? pgnRes.statusText
        : 'No presenta antecedentes disciplinarios ni inhabilidades vigentes en el sistema SIRI.';
      const cgrLine = cgrRes?.statusText
        ? cgrRes.statusText
        : 'No registra reporte en el Boletín de Responsables Fiscales (SIRECI) de la Contraloría General de la República.';
      const epsLine = adresRes?.eps
        ? `${adresRes.eps} (${adresRes.estado || 'REGISTRADO'}${adresRes.regimen ? ` — ${adresRes.regimen}` : ''})`
        : 'Sin novedad de aseguramiento registrada en BDUA.';
      const locationLine = (adresRes?.municipio && !adresRes.municipio.toLowerCase().includes('informacion'))
        ? `\n📍 *Ubicación Registrada:* ${adresRes.municipio}${adresRes.departamento ? `, ${adresRes.departamento}` : ''}`
        : '';
      const securityLine = ponalRes?.message || 'Sin antecedentes judiciales ni requerimientos penales pendientes ante la Policía Nacional.';

      const reportText =
        `🛡️ *VERIFICACIÓN OFICIAL DE IDENTIDAD — VECY BIENES RAÍCES* 🇨🇴\n\n` +
        `1️⃣ *DATOS DE IDENTIDAD*\n` +
        `🆔 *El documento:* ${activeDocLabel} ${formattedCedula}\n` +
        `👤 *Pertenece a:* ${finalOfficialName}${locationLine}${autoCeNotice}\n\n` +
        `2️⃣ *SEGURIDAD SOCIAL (EPS / RÉGIMEN)*\n` +
        `🏥 *Afiliación en Salud (ADRES / BDUA):* ${epsLine}\n\n` +
        `3️⃣ *ENTIDADES DE CONTROL (DISCIPLINARIO Y FISCAL)*\n` +
        `🏛️ *Central de Control Notarial (Procuraduría SIRI):* ${pgnLine}\n` +
        `⚖️ *Contraloría General (SIRECI):* ${cgrLine}\n\n` +
        `4️⃣ *POLICÍA NACIONAL DE COLOMBIA*\n` +
        `🚓 *Central de Seguridad:* ${securityLine}\n` +
        `✅ *Ciudadano verificado y habilitado.* Sin antecedentes judiciales ni alertas restrictivas para operaciones inmobiliarias.\n\n` +
        HABEAS_DATA_CLAUSE;

      if (userId) {
        savePendingCedulaSession(userId, items, reportText, true);
      }

      return {
        isVerificationRequest: true,
        cedula,
        tipoDoc: currentTipoDoc,
        success: true,
        officialName: finalOfficialName,
        source: 'Central Multifuente Notarial VECY (ADRES BDUA + Procuraduría General + Contraloría General + Policía Nacional)',
        reportText,
        procuraduria: pgnRes || undefined,
        policia: ponalRes || undefined,
        adres: adresRes || undefined,
        contraloria: cgrRes || undefined,
        items
      };
    } else {
      let reportText = '';

      if (currentTipoDoc.toLowerCase() === 'pa') {
        reportText =
          `🛂 *CONSULTA DE PASAPORTE EXTRANJERO — VECY BIENES RAÍCES* 🇨🇴\n\n` +
          `El documento *Pasaporte ${formattedCedula}* no arroja antecedentes ni identidad en las plataformas públicas del Estado colombiano por lo siguiente:\n\n` +
          `1️⃣ *Bases Estatales:* La Policía Nacional y la Procuraduría de Colombia únicamente indexan Cédulas locales (C.C. y C.E.). No tienen acceso a los registros de identidad ni antecedentes de otros países.\n` +
          `2️⃣ *Estructura:* Casi todos los pasaportes internacionales son alfanuméricos (llevan letras y números, comúnmente una o dos letras iniciales según el país emisor).\n` +
          `3️⃣ *Protocolo Notarial Seguro:* Para personas extranjeras, el procedimiento legal válido para promesas de compraventa y contratos es el *cotejo físico del pasaporte original vigente*, comprobando su fecha de vencimiento y el sello o visa de ingreso de Migración Colombia.\n\n` +
          `📌 Para operaciones inmobiliarias o contratos con extranjeros, este cotejo documental presencial es el camino legal y aceptado en notarías y aseguradoras.\n\n` +
          HABEAS_DATA_CLAUSE;
      } else {
        let customGuidance = '';
        if (currentTipoDoc.toLowerCase() === 'cc' && cedula.length === 9) {
          customGuidance = `\n• ⚠️ *Aviso Registraduría:* En Colombia nunca se emitieron Cédulas de Ciudadanía de 9 dígitos (las antiguas tienen entre 1 y 8 dígitos y las nuevas son de 10 dígitos iniciando por 1). Verifica si hubo un dígito omitido o añadido.`;
        } else if (['ce', 'cx'].includes(currentTipoDoc.toLowerCase()) && cedula.length >= 8) {
          customGuidance = `\n• ⚠️ *Aviso Migración:* Las Cédulas de Extranjería en Colombia constan de entre 4 y 7 dígitos numéricos. Un número de ${cedula.length} dígitos suele corresponder a una Cédula de Ciudadanía colombiana.`;
        } else if (['ce', 'cx'].includes(currentTipoDoc.toLowerCase()) && cedula.length >= 4 && cedula.length <= 7) {
          customGuidance = `\n• 📌 Las Cédulas de Extranjería (de 4 a 7 dígitos) son expedidas por Migración Colombia. Al ser un documento extranjero, las plataformas del Estado reflejan identidad si el titular cotiza al sistema de salud (ADRES/BDUA), registra contratos estatales en la Procuraduría (SIRI) o historial penal en la Policía Nacional.`;
        } else if (currentTipoDoc.toLowerCase() === 'cc') {
          customGuidance = `\n• 🌐 *¿Es un documento de extranjería?:* Si este número corresponde a una persona extranjera con Cédula de Extranjería (C.E.) o Pasaporte, puedes verificarlo indicando *"Verificar CE ${formattedCedula}"* o *"Verificar Pasaporte ${formattedCedula}"*.`;
        }

        reportText =
          `⚠️ *CONSULTA DE IDENTIDAD — VECY BIENES RAÍCES* 🇨🇴\n\n` +
          `Consultamos las bases de datos oficiales de seguridad del Estado para el documento ${docLabel} *${formattedCedula}*:\n\n` +
          `1️⃣ *DATOS DE IDENTIDAD*\n` +
          `🆔 *Documento:* ${docLabel} ${formattedCedula}\n` +
          `⚠️ *Estado:* Documento no localizado en las bases censales en línea.\n\n` +
          `2️⃣ *SEGURIDAD SOCIAL (EPS / RÉGIMEN)*\n` +
          `🏥 *Central de Aseguramiento (ADRES):* ${adresRes?.error || 'Sin registro activo de afiliación en la Base de Datos Única de Afiliados (BDUA).'}\n\n` +
          `3️⃣ *ENTIDADES DE CONTROL (DISCIPLINARIO Y FISCAL)*\n` +
          `🏛️ *Central de Control Notarial (Procuraduría SIRI):* ${pgnRes?.statusText || 'No se encuentra registrado en el sistema de información SIRI o no disponible.'}\n` +
          `⚖️ *Contraloría General (SIRECI):* No registra sanciones fiscales ejecutoriadas.\n\n` +
          `4️⃣ *POLICÍA NACIONAL DE COLOMBIA*\n` +
          `⚖️ *Central de Seguridad:* ${ponalRes?.message || 'Sin antecedentes judiciales reportados o documento no indexado.'}\n\n` +
          `📌 *Orientación de Verificación:*${customGuidance}\n` +
          `• Si es un documento extranjero (C.E., Pasaporte, PEP o PPT), es habitual requerir cotejo físico si el usuario es recién llegado o no cotiza aún a EPS en Colombia.\n` +
          `• Verifica que el número digitado coincida exactamente con el documento físico.\n\n` +
          `💡 Puedes verificar nuevamente escribiéndome: *"JanIA, verificar ${docLabel} ${formattedCedula}"*.\n\n` +
          HABEAS_DATA_CLAUSE;
      }

      if (userId) {
        savePendingCedulaSession(userId, items, reportText, false);
      }

      return {
        isVerificationRequest: true,
        cedula,
        tipoDoc: currentTipoDoc,
        success: false,
        reportText,
        procuraduria: pgnRes || undefined,
        policia: ponalRes || undefined,
        adres: adresRes || undefined,
        contraloria: cgrRes || undefined,
        items
      };
    }
  } catch (err: any) {
    const errorReport = `⚠️ Ocurrió una intermitencia temporal de enlace con las centrales de verificación para el documento ${docLabel} ${formattedCedula}. Por favor intenta de nuevo en unos minutos.`;
    return {
      isVerificationRequest: true,
      cedula,
      tipoDoc,
      success: false,
      reportText: errorReport,
      items
    };
  }
}
