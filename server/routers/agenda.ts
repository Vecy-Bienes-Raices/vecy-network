import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { desc, ilike, or, sql, eq } from "drizzle-orm";
import { getDb } from "../db";
import { solicitudes } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { Solver } from "@2captcha/captcha-solver";
import https from "https";

const httpsAgentInsecure = new https.Agent({ rejectUnauthorized: false });

// Caché en memoria para validaciones oficiales (24h)
const identityCache = new Map<string, { fullName: string; timestamp: number }>();
const IDENTITY_CACHE_TTL = 24 * 60 * 60 * 1000;

interface IdentityJob {
  id: string;
  status: 'processing' | 'completed' | 'error';
  tipoDocumento: string;
  numeroDocumento: string;
  nombreIngresado?: string;
  result?: {
    valid: boolean;
    match: boolean;
    officialName?: string;
    message?: string;
    error?: string;
  };
  createdAt: number;
}

const identityJobs = new Map<string, IdentityJob>();

// Limpieza de jobs mayores a 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of identityJobs.entries()) {
    if (now - job.createdAt > 10 * 60 * 1000) {
      identityJobs.delete(id);
    }
  }
}, 60000);


class CookieJar {
  cookies: Map<string, string> = new Map();
  addFromHeaders(headers: Headers) {
    // @ts-ignore
    const raw = headers.getSetCookie ? headers.getSetCookie() : [headers.get('set-cookie')].filter(Boolean);
    for (const item of raw) {
      if (!item) continue;
      const parts = item.split(';');
      const [k, v] = parts[0].split('=');
      if (k && v) this.cookies.set(k.trim(), v.trim());
    }
  }
  addFromRawHeaders(headers: any) {
    const raw = headers['set-cookie'] || [];
    const list = Array.isArray(raw) ? raw : [raw];
    for (const item of list) {
      if (!item) continue;
      const parts = item.split(';');
      const [k, v] = parts[0].split('=');
      if (k && v) this.cookies.set(k.trim(), v.trim());
    }
  }
  getCookieString(): string {
    return Array.from(this.cookies.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

async function requestHttps(urlStr: string, options: any = {}, jar?: CookieJar): Promise<{ status: number; headers: any; body: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const headers = options.headers || {};
    if (jar) {
      const cookieStr = jar.getCookieString();
      if (cookieStr) headers['Cookie'] = cookieStr;
    }
    const req = https.request({
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers,
      agent: httpsAgentInsecure,
    }, (res) => {
      if (jar) jar.addFromRawHeaders(res.headers);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode || 200, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (options.timeout) {
      req.setTimeout(options.timeout, () => {
        req.destroy(new Error('HTTPS request timeout'));
      });
    }
    if (options.body) req.write(options.body);
    req.end();
  });
}

/**
 * Consulta oficial de antecedentes penales e identidad en la Policía Nacional de Colombia
 * Resuelve reCAPTCHA v2 de Google vía 2Captcha y extrae los nombres y apellidos reales del ciudadano.
 */
async function queryPoliciaNacional(tipoDocInput: string, cleanDoc: string): Promise<{ success: boolean; officialName?: string; source?: string }> {
  let tipoDoc = 'cc';
  const t = (tipoDocInput || '').toLowerCase();
  if (t.includes('extranjer') || t === 'ce' || t === 'cx') tipoDoc = 'cx';
  else if (t.includes('pasaporte') || t === 'pa') tipoDoc = 'pa';
  else if (t.includes('nit') || t.includes('rut')) return { success: false };

  const cacheKey = `POLICIA:${tipoDoc}:${cleanDoc}`;
  const cached = identityCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < IDENTITY_CACHE_TTL)) {
    return { success: true, officialName: cached.fullName, source: 'Policía Nacional de Colombia (Caché)' };
  }

  const apiKey = process.env.TWOCAPTCHA_API_KEY || '673ddb810e9f700065ccbe6034f26629';
  if (!apiKey) return { success: false };

  try {
    const solver = new Solver(apiKey);
    const jar = new CookieJar();
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36' };

    // 1. GET index.xhtml para inicializar sesión y cookies
    const res1 = await requestHttps('https://antecedentes.policia.gov.co:7005/WebJudicial/index.xhtml', { headers, timeout: 8000 }, jar);
    const vs1Match = res1.body.match(/name="javax\.faces\.ViewState"\s+id="[^"]*"\s+value="([^"]+)"/) || res1.body.match(/id="j_id1:javax\.faces\.ViewState:0"\s+value="([^"]+)"/);
    const vs1 = vs1Match ? vs1Match[1] : null;
    if (!vs1) return { success: false };

    // 2. Aceptar términos AJAX en PrimeFaces
    const postTerms = new URLSearchParams({
      'javax.faces.partial.ajax': 'true',
      'javax.faces.source': 'continuarBtn',
      'javax.faces.partial.execute': '@all',
      'javax.faces.partial.render': 'form',
      'continuarBtn': 'continuarBtn',
      'form': 'form',
      'aceptaOption': 'true',
      'javax.faces.ViewState': vs1,
    }).toString();

    await requestHttps('https://antecedentes.policia.gov.co:7005/WebJudicial/index.xhtml', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Faces-Request': 'partial/ajax',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://antecedentes.policia.gov.co:7005/WebJudicial/index.xhtml',
      },
      body: postTerms,
      timeout: 8000,
    }, jar);

    // 3. GET antecedentes.xhtml
    const res3 = await requestHttps('https://antecedentes.policia.gov.co:7005/WebJudicial/antecedentes.xhtml', {
      headers: {
        ...headers,
        'Referer': 'https://antecedentes.policia.gov.co:7005/WebJudicial/index.xhtml',
      },
      timeout: 8000,
    }, jar);

    const vs3Match = res3.body.match(/name="javax\.faces\.ViewState"\s+id="[^"]*"\s+value="([^"]+)"/) || res3.body.match(/id="j_id1:javax\.faces\.ViewState:0"\s+value="([^"]+)"/);
    const vs3 = vs3Match ? vs3Match[1] : null;
    if (!vs3) return { success: false };

    // 4. Resolver reCAPTCHA v2 de Policía Nacional con 2Captcha
    const captcha = await solver.recaptcha({
      googlekey: '6LcsIwQaAAAAAFCsaI-dkR6hgKsZwwJRsmE0tIJH',
      pageurl: 'https://antecedentes.policia.gov.co:7005/WebJudicial/antecedentes.xhtml',
    });

    if (!captcha || !captcha.data) return { success: false };

    // 5. POST consulta antecedentes con token de captcha y cédula
    const postQuery = new URLSearchParams({
      'formAntecedentes': 'formAntecedentes',
      'cedulaTipo': tipoDoc,
      'cedulaInput': cleanDoc,
      'g-recaptcha-response': captcha.data,
      'j_idt17': 'Consultar',
      'javax.faces.ViewState': vs3,
    }).toString();

    const resFinal = await requestHttps('https://antecedentes.policia.gov.co:7005/WebJudicial/antecedentes.xhtml', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://antecedentes.policia.gov.co:7005/WebJudicial/antecedentes.xhtml',
      },
      body: postQuery,
      timeout: 10000,
    }, jar);

    let finalHtml = resFinal.body;
    if (resFinal.status === 302 || resFinal.headers.location) {
      const nextUrl = resFinal.headers.location || 'https://antecedentes.policia.gov.co:7005/WebJudicial/formAntecedentes.xhtml';
      const resRedirect = await requestHttps(nextUrl, {
        headers: {
          ...headers,
          'Referer': 'https://antecedentes.policia.gov.co:7005/WebJudicial/antecedentes.xhtml',
        },
        timeout: 10000,
      }, jar);
      finalHtml = resRedirect.body;
    }

    const text = finalHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const matchNombres = finalHtml.match(/Apellidos\s+y\s+Nombres:\s*<span[^>]*>([^<]+)<\/span>/i) ||
                         text.match(/Apellidos\s+y\s+Nombres:\s*([A-ZÁÉÍÓÚÑ\s]+?)\s+(NO TIENE|TIENE|ASUNTOS)/i);

    if (matchNombres && matchNombres[1]) {
      const rawFullName = matchNombres[1].trim();
      const formatTitleCase = (s: string) => s.toLowerCase().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const officialName = formatTitleCase(rawFullName);
      identityCache.set(cacheKey, { fullName: officialName, timestamp: Date.now() });
      return { success: true, officialName, source: 'Policía Nacional de Colombia' };
    }

    return { success: false };
  } catch (err: any) {
    console.warn('[queryPoliciaNacional Error]', err?.message);
    return { success: false };
  }
}

async function queryOfficialAdres(tipoDocInput: string, cleanDoc: string): Promise<{ success: boolean; officialName?: string }> {
  let tipoDoc = 'CC';
  const t = (tipoDocInput || '').toLowerCase();
  if (t.includes('extranjer') || t === 'ce') tipoDoc = 'CE';
  else if (t.includes('tarjeta') || t === 'ti') tipoDoc = 'TI';
  else if (t.includes('pasaporte') || t === 'pa') tipoDoc = 'PA';
  else if (t.includes('especial') || t === 'pep') tipoDoc = 'PE';
  else if (t.includes('protec') || t === 'ppt') tipoDoc = 'PT';
  else if (t.includes('nit') || t.includes('rut')) return { success: false };

  const cacheKey = `${tipoDoc}:${cleanDoc}`;
  const cached = identityCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < IDENTITY_CACHE_TTL)) {
    return { success: true, officialName: cached.fullName };
  }

  const apiKey = process.env.TWOCAPTCHA_API_KEY;
  if (!apiKey) return { success: false };

  try {
    const solver = new Solver(apiKey);
    const jar = new CookieJar();
    const baseUrl = 'https://aplicaciones.adres.gov.co/bdua_internet/Pages/ConsultarAfiliadoWeb.aspx';
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9',
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // Timeout estricto de 2.5s para evitar 504

    const res1 = await fetch(baseUrl, { headers, signal: controller.signal });
    jar.addFromHeaders(res1.headers);
    const html1 = await res1.text();

    const viewState = html1.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1];
    const viewStateGen = html1.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || '';
    const eventVal = html1.match(/id="__EVENTVALIDATION"\s+value="([^"]+)"/)?.[1];
    const captchaSrc = html1.match(/id="Capcha_CaptchaImageUP"[^>]*src="([^"]+)"/)?.[1];

    if (!viewState || !eventVal || !captchaSrc) {
      clearTimeout(timeoutId);
      return { success: false };
    }

    let imgUrl = captchaSrc.replace(/&amp;/g, '&');
    if (imgUrl.startsWith('..')) imgUrl = 'https://aplicaciones.adres.gov.co/bdua_internet' + imgUrl.substring(2);
    else if (!imgUrl.startsWith('http')) imgUrl = 'https://aplicaciones.adres.gov.co/bdua_internet/' + imgUrl;

    const imgRes = await fetch(imgUrl, {
      headers: { ...headers, 'Cookie': jar.getCookieString(), 'Referer': baseUrl },
      signal: controller.signal,
    });
    jar.addFromHeaders(imgRes.headers);

    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const base64Img = imgBuffer.toString('base64');

    const captcha = await solver.imageCaptcha({
      body: base64Img,
      numeric: 0,
      min_len: 5, max_len: 5,
    });

    if (!captcha || !captcha.data) {
      clearTimeout(timeoutId);
      return { success: false };
    }

    const body = new URLSearchParams();
    body.append('RadScriptManager1_TSM', '');
    body.append('__EVENTTARGET', '');
    body.append('__EVENTARGUMENT', '');
    body.append('__VIEWSTATE', viewState);
    body.append('__VIEWSTATEGENERATOR', viewStateGen);
    body.append('__EVENTVALIDATION', eventVal);
    body.append('tipoDoc', tipoDoc);
    body.append('txtNumDoc', cleanDoc);
    body.append('Capcha', captcha.data);
    body.append('btnConsultar', 'Consultar');

    const resPost = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': jar.getCookieString(),
        'Referer': baseUrl,
        'Origin': 'https://aplicaciones.adres.gov.co',
      },
      body: body.toString(),
      signal: controller.signal,
    });
    jar.addFromHeaders(resPost.headers);
    const postHtml = await resPost.text();

    const tokenMatch = postHtml.match(/RespuestaConsulta\.aspx\?tokenId=([^'"]+)/);
    if (!tokenMatch) {
      clearTimeout(timeoutId);
      return { success: false };
    }

    const tokenId = tokenMatch[1];
    const resultUrl = `https://aplicaciones.adres.gov.co/bdua_internet/Pages/RespuestaConsulta.aspx?tokenId=${tokenId}`;
    const resResult = await fetch(resultUrl, {
      headers: { ...headers, 'Cookie': jar.getCookieString(), 'Referer': baseUrl },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const resultHtml = await resResult.text();
    const cleanHtml = resultHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const matchNombres = cleanHtml.match(/NOMBRES\s+([A-ZÁÉÍÓÚÑ\s]+?)\s+APELLIDOS/i);
    const matchApellidos = cleanHtml.match(/APELLIDOS\s+([A-ZÁÉÍÓÚÑ\s]+?)\s+FECHA/i);

    if (matchNombres && matchApellidos) {
      const rawNombres = matchNombres[1].trim();
      const rawApellidos = matchApellidos[1].trim();
      const formatTitleCase = (s: string) => s.toLowerCase().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const fullName = formatTitleCase(`${rawNombres} ${rawApellidos}`);

      identityCache.set(cacheKey, { fullName, timestamp: Date.now() });
      return { success: true, officialName: fullName };
    }
    return { success: false };
  } catch (err: any) {
    console.warn('[queryOfficialAdres Error]', err?.message);
    return { success: false };
  }
}

function calcularDigitoVerificacionDIAN(nitStr: string): number {
  const vpri = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  const clean = nitStr.replace(/\D/g, '');
  let suma = 0;
  for (let i = 0; i < clean.length; i++) {
    const digit = parseInt(clean.charAt(clean.length - 1 - i), 10);
    suma += digit * vpri[i];
  }
  const residuo = suma % 11;
  return residuo > 1 ? 11 - residuo : residuo;
}

async function executeIdentityVerification(
  tipoDocumento: string,
  cleanDoc: string,
  nombreIngresado?: string
): Promise<{ valid: boolean; match: boolean; officialName?: string; message?: string; error?: string }> {
  const clean = cleanDoc.replace(/[^0-9a-zA-Z]/g, '');
  if (!clean || clean.length < 5) {
    return {
      valid: false,
      match: false,
      error: 'El número de documento debe tener al menos 5 dígitos.',
    };
  }

  // 1. Verificar si es NIT o RUT
  const tDocLower = (tipoDocumento || '').toLowerCase();
  const isNit = tDocLower.includes('nit') || tDocLower.includes('rut');
  if (isNit) {
    if (!/^\d{9,10}$/.test(clean)) {
      return {
        valid: false,
        match: false,
        error: 'El NIT debe contener 9 o 10 dígitos numéricos (incluyendo dígito de verificación).',
      };
    }
    const cleanNit = clean.slice(0, 9);
    const dvCalculado = calcularDigitoVerificacionDIAN(cleanNit);
    if (clean.length === 10) {
      const dvIngresado = parseInt(clean.slice(9), 10);
      if (dvIngresado !== dvCalculado) {
        return {
          valid: false,
          match: false,
          error: `Dígito de verificación DIAN incorrecto. Para el NIT ${cleanNit}, el dígito oficial es -${dvCalculado}.`,
        };
      }
    }
    const nombreEmpresa = (nombreIngresado || '').trim();
    return {
      valid: true,
      match: true,
      officialName: nombreEmpresa || clean,
      message: `✓ NIT/RUT validado conforme a estructura DIAN (Dígito de verificación: ${dvCalculado})`,
    };
  }

  // 2. Caché en memoria (0ms)
  const cacheKey = `POLICIA:cc:${clean}`;
  const cached = identityCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < IDENTITY_CACHE_TTL)) {
    const officialFormatted = cached.fullName;
    if (nombreIngresado && nombreIngresado.trim().length >= 3) {
      const stopwords = ['de', 'del', 'la', 'las', 'los', 'y', 'el'];
      const normEntered = nombreIngresado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(t => t && !stopwords.includes(t));
      const normOfficial = officialFormatted.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(t => t && !stopwords.includes(t));
      const matches = normEntered.filter((token: string) => normOfficial.some((off: string) => off === token || off.startsWith(token) || token.startsWith(off)));
      const isMatch = matches.length >= Math.min(2, normEntered.length);

      if (!isMatch) {
        return {
          valid: true,
          match: false,
          officialName: officialFormatted,
          error: `⚠️ Inconsistencia de identidad: La cédula ${clean} pertenece oficialmente ante la Policía Nacional a "${officialFormatted}" y no a "${nombreIngresado}". Por motivos de seguridad y prevención de fraude, la solicitud queda bloqueada.`,
        };
      }
    }
    return {
      valid: true,
      match: true,
      officialName: officialFormatted,
      message: `✓ Identidad confirmada ante la Policía Nacional de Colombia: ${officialFormatted}`,
    };
  }

  // 3. Consulta a base de datos interna de Vecy (0ms)
  try {
    const db = await getDb();
    if (db) {
      const solRows = await db
        .select({
          solicitanteNumeroDocumento: solicitudes.solicitanteNumeroDocumento,
          solicitanteNombre: solicitudes.solicitanteNombre,
          interesadoDocumento: solicitudes.interesadoDocumento,
          interesadoNombre: solicitudes.interesadoNombre,
        })
        .from(solicitudes)
        .where(
          or(
            eq(solicitudes.solicitanteNumeroDocumento, clean),
            eq(solicitudes.interesadoDocumento, clean)
          )
        )
        .limit(1);

      if (solRows.length > 0) {
        const row = solRows[0];
        const matchName = (row.solicitanteNumeroDocumento || '').replace(/\D/g, '') === clean
          ? row.solicitanteNombre
          : row.interesadoNombre;

        if (matchName && matchName.trim().length >= 4) {
          const formatTitleCase = (s: string) => s.toLowerCase().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          const officialFormatted = formatTitleCase(matchName.trim());

          if (nombreIngresado && nombreIngresado.trim().length >= 3) {
            const stopwords = ['de', 'del', 'la', 'las', 'los', 'y', 'el'];
            const normEntered = nombreIngresado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(t => t && !stopwords.includes(t));
            const normOfficial = officialFormatted.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(t => t && !stopwords.includes(t));
            const matches = normEntered.filter((token: string) => normOfficial.some((off: string) => off === token || off.startsWith(token) || token.startsWith(off)));
            const isMatch = matches.length >= Math.min(2, normEntered.length);

            if (!isMatch) {
              return {
                valid: true,
                match: false,
                officialName: officialFormatted,
                error: `⚠️ Inconsistencia de identidad: La cédula ${clean} está registrada en Vecy a nombre de "${officialFormatted}" y no de "${nombreIngresado}".`,
              };
            }
          }

          identityCache.set(cacheKey, { fullName: officialFormatted, timestamp: Date.now() });
          return {
            valid: true,
            match: true,
            officialName: officialFormatted,
            message: `✓ Identidad confirmada en base de datos interna de Vecy: ${officialFormatted}`,
          };
        }
      }
    }
  } catch (dbErr: any) {
    console.warn('[DB Check warning]', dbErr?.message);
  }

  // 4. Scraper autoritativo de Policía Nacional con 2Captcha reCAPTCHA v2
  const policiaResult = await queryPoliciaNacional(tipoDocumento, clean);
  if (policiaResult && policiaResult.success && policiaResult.officialName) {
    const officialFormatted = policiaResult.officialName;
    identityCache.set(cacheKey, { fullName: officialFormatted, timestamp: Date.now() });

    if (nombreIngresado && nombreIngresado.trim().length >= 3) {
      const stopwords = ['de', 'del', 'la', 'las', 'los', 'y', 'el'];
      const normEntered = nombreIngresado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(t => t && !stopwords.includes(t));
      const normOfficial = officialFormatted.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(t => t && !stopwords.includes(t));
      const matches = normEntered.filter((token: string) => normOfficial.some((off: string) => off === token || off.startsWith(token) || token.startsWith(off)));
      const isMatch = matches.length >= Math.min(2, normEntered.length);

      if (!isMatch) {
        return {
          valid: true,
          match: false,
          officialName: officialFormatted,
          error: `⚠️ Inconsistencia de identidad: La cédula ${clean} pertenece oficialmente ante la Policía Nacional a "${officialFormatted}" y no a "${nombreIngresado}". Por motivos de seguridad y prevención de fraude, la solicitud queda bloqueada.`,
        };
      }
    }

    return {
      valid: true,
      match: true,
      officialName: officialFormatted,
      message: `✓ Identidad confirmada ante la Policía Nacional de Colombia: ${officialFormatted}`,
    };
  }

  // 5. Para Cédula colombiana (CC): Si no se pudo obtener respuesta oficial de la Policía Nacional, NUNCA marcar match: true a ciegas
  const tLower = (tipoDocumento || '').toLowerCase();
  const isCC = tLower.includes('ciudadan') || tLower === 'cc';
  if (isCC) {
    return {
      valid: false,
      match: false,
      error: 'No fue posible verificar la cédula ante la Policía Nacional en este momento (tiempo de espera o servicio no disponible). Por favor reintente en unos segundos.',
    };
  }

  // Para otros documentos extranjeros o pasaportes:
  return {
    valid: true,
    match: true,
    officialName: nombreIngresado || clean,
    message: '✓ Documento procesado para trámite internacional',
  };
}

export const agendaRouter = router({
  getAll: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        perfil: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });

      const search = input?.search?.trim();
      const perfilFilter = input?.perfil?.trim();
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const whereConditions: any[] = [];

      if (search) {
        const searchPattern = `%${search}%`;
        const numSearch = Number(search);
        const searchConditions = [
          ilike(solicitudes.solicitanteNombre, searchPattern),
          ilike(solicitudes.solicitanteNumeroDocumento, searchPattern),
          ilike(solicitudes.solicitanteCelular, searchPattern),
          ilike(solicitudes.solicitanteEmail, searchPattern),
          ilike(solicitudes.nombreInmueble, searchPattern),
          ilike(solicitudes.codigoInmueble, searchPattern),
          ilike(solicitudes.interesadoNombre, searchPattern),
        ];
        if (!isNaN(numSearch)) {
          searchConditions.push(eq(solicitudes.solicitudId, numSearch));
        }
        whereConditions.push(or(...searchConditions));
      }

      if (perfilFilter && perfilFilter !== "all") {
        if (perfilFilter === "agente") {
          whereConditions.push(
            or(
              ilike(solicitudes.solicitantePerfil, "%agente%"),
              ilike(solicitudes.solicitantePerfil, "%inmobiliaria%"),
              ilike(solicitudes.solicitantePerfil, "%broker%"),
              ilike(solicitudes.solicitantePerfil, "%bróker%")
            )
          );
        } else if (perfilFilter === "directo") {
          whereConditions.push(
            or(
              ilike(solicitudes.solicitantePerfil, "%directo%"),
              ilike(solicitudes.solicitantePerfil, "%cliente%")
            )
          );
        }
      }

      const finalWhere = whereConditions.length > 0 ? sql.join(whereConditions, sql` AND `) : undefined;

      const items = await db
        .select()
        .from(solicitudes)
        .where(finalWhere)
        .orderBy(desc(solicitudes.solicitudId), desc(solicitudes.id))
        .limit(limit)
        .offset(offset);

      const totalRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(solicitudes)
        .where(finalWhere);

      return {
        items,
        total: Number(totalRes[0]?.count || 0),
      };
    }),

  getStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });

    const totalRes = await db.select({ count: sql<number>`count(*)` }).from(solicitudes);
    const total = Number(totalRes[0]?.count || 0);

    const agentesRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(solicitudes)
      .where(
        or(
          ilike(solicitudes.solicitantePerfil, "%agente%"),
          ilike(solicitudes.solicitantePerfil, "%inmobiliaria%"),
          ilike(solicitudes.solicitantePerfil, "%broker%"),
          ilike(solicitudes.solicitantePerfil, "%bróker%")
        )
      );
    const agentes = Number(agentesRes[0]?.count || 0);

    const conFirmaRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(solicitudes)
      .where(sql`${solicitudes.firmaVirtualBase64} IS NOT NULL AND ${solicitudes.firmaVirtualBase64} != ''`);
    const conFirma = Number(conFirmaRes[0]?.count || 0);

    const directos = Math.max(0, total - agentes);

    return {
      total,
      agentes,
      directos,
      conFirma,
    };
  }),

  startVerifyIdentity: publicProcedure
    .input(
      z.object({
        tipoDocumento: z.string(),
        numeroDocumento: z.string(),
        nombreIngresado: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { tipoDocumento, numeroDocumento, nombreIngresado } = input;
      const cleanDoc = numeroDocumento.replace(/[^0-9a-zA-Z]/g, '');

      if (!cleanDoc || cleanDoc.length < 5) {
        return {
          status: 'completed' as const,
          result: {
            valid: false,
            match: false,
            error: 'El número de documento debe tener al menos 5 caracteres.',
          },
        };
      }

      // Consulta instantánea si ya está en caché en memoria (0 ms)
      const cacheKey = `POLICIA:cc:${cleanDoc}`;
      const cached = identityCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < IDENTITY_CACHE_TTL)) {
        const officialFormatted = cached.fullName;
        if (nombreIngresado && nombreIngresado.trim().length >= 3) {
          const stopwords = ['de', 'del', 'la', 'las', 'los', 'y', 'el'];
          const normEntered = nombreIngresado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(t => t && !stopwords.includes(t));
          const normOfficial = officialFormatted.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(t => t && !stopwords.includes(t));
          const matches = normEntered.filter((token: string) => normOfficial.some((off: string) => off === token || off.startsWith(token) || token.startsWith(off)));
          const isMatch = matches.length >= Math.min(2, normEntered.length);

          if (!isMatch) {
            return {
              status: 'completed' as const,
              result: {
                valid: true,
                match: false,
                officialName: officialFormatted,
                error: `⚠️ Inconsistencia de identidad: La cédula ${cleanDoc} pertenece oficialmente ante la Policía Nacional a "${officialFormatted}" y no a "${nombreIngresado}". Por motivos de seguridad y prevención de fraude, la solicitud queda bloqueada.`,
              },
            };
          }
        }

        return {
          status: 'completed' as const,
          result: {
            valid: true,
            match: true,
            officialName: officialFormatted,
            message: `✓ Identidad confirmada ante la Policía Nacional de Colombia: ${officialFormatted}`,
          },
        };
      }

      // Crear Job asíncrono para evitar HTTP 504 en Vercel
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const job: IdentityJob = {
        id: jobId,
        status: 'processing',
        tipoDocumento,
        numeroDocumento: cleanDoc,
        nombreIngresado,
        createdAt: Date.now(),
      };
      identityJobs.set(jobId, job);

      // Disparar la verificación en background (sin await para responder en <100ms)
      executeIdentityVerification(tipoDocumento, cleanDoc, nombreIngresado)
        .then((result: any) => {
          const current = identityJobs.get(jobId);
          if (current) {
            current.status = 'completed';
            current.result = result;
          }
        })
        .catch((err: any) => {
          const current = identityJobs.get(jobId);
          if (current) {
            current.status = 'error';
            current.result = {
              valid: false,
              match: false,
              error: err?.message || 'Error durante la verificación de identidad',
            };
          }
        });

      return {
        status: 'processing' as const,
        jobId,
        message: 'Consulta enviada a la Policía Nacional. Resolviendo captcha oficial...',
      };
    }),

  checkVerifyIdentity: publicProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      const job = identityJobs.get(input.jobId);
      if (!job) {
        return {
          status: 'error' as const,
          error: 'Consulta de identidad no encontrada o expirada. Por favor intente nuevamente.',
        };
      }
      return {
        status: job.status,
        result: job.result,
      };
    }),

  verifyIdentity: publicProcedure
    .input(
      z.object({
        tipoDocumento: z.string(),
        numeroDocumento: z.string(),
        nombreIngresado: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await executeIdentityVerification(input.tipoDocumento, input.numeroDocumento, input.nombreIngresado);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        solicitanteNombre: z.string().optional(),
        solicitanteNumeroDocumento: z.string().optional(),
        solicitanteTipoPersona: z.string().optional(),
        solicitanteEmail: z.string().optional(),
        solicitanteCelular: z.string().optional(),
        solicitantePerfil: z.string().optional(),
        solicitanteTipoDocumento: z.string().optional(),
        solicitanteRepresentanteLegal: z.string().optional(),
        interesadoNombre: z.string().optional(),
        interesadoDocumento: z.string().optional(),
        interesadoTipoDocumento: z.string().optional(),
        acompanantes: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });

      const { id, ...dataToUpdate } = input;

      const updated = await db
        .update(solicitudes)
        .set(dataToUpdate)
        .where(eq(solicitudes.id, id))
        .returning();

      return {
        success: true,
        item: updated[0] || null,
      };
    }),

  create: publicProcedure
    .input(
      z.object({
        solicitante_nombre: z.string().min(1),
        solicitante_tipo_persona: z.string().optional(),
        solicitante_perfil: z.string().optional(),
        solicitante_email: z.string().optional(),
        solicitante_celular: z.string().optional(),
        solicitante_tipo_documento: z.string().optional(),
        solicitante_numero_documento: z.string().optional(),
        servicio_solicitado: z.string().optional(),
        nombre_inmueble: z.string().optional(),
        codigo_inmueble: z.string().optional(),
        opcion_negocio: z.string().optional(),
        fecha_cita_texto: z.string().nullable().optional(),
        hora_cita: z.string().nullable().optional(),
        cantidad_personas: z.number().nullable().optional(),
        interesado_nombre: z.string().optional(),
        interesado_tipo_documento: z.string().optional(),
        interesado_documento: z.string().optional(),
        tipo_cliente: z.string().optional(),
        acompanantes: z.any().optional(),
        firma_virtual_base64: z.string().nullable().optional(),
        firma_fechahora_audit: z.string().nullable().optional(),
        solicitante_representante_legal: z.string().optional(),
        autorizacion: z.boolean().optional(),
        agent_id: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });

      // BLINDAJE ANTIFRAUDE EN EL SERVIDOR (Tolerancia 0 a identidades suplantadas):
      const stopwords = ['de', 'del', 'la', 'las', 'los', 'y', 'el'];
      const checkMatch = (entered: string, official: string) => {
        const normEntered = entered.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(t => t && !stopwords.includes(t));
        const normOfficial = official.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(t => t && !stopwords.includes(t));
        const matches = normEntered.filter((token: string) => normOfficial.some((off: string) => off === token || off.startsWith(token) || token.startsWith(off)));
        return matches.length >= Math.min(2, normEntered.length);
      };

      // 1. Validar solicitante si es CC
      if (input.solicitante_numero_documento && (input.solicitante_tipo_documento?.includes('ciudadanía') || input.solicitante_tipo_documento === 'CC' || !input.solicitante_tipo_documento)) {
        const cleanDoc = input.solicitante_numero_documento.replace(/\D/g, '');
        if (cleanDoc.length >= 5) {
          const res = await queryPoliciaNacional('cc', cleanDoc);
          if (res.success && res.officialName && input.solicitante_nombre) {
            if (!checkMatch(input.solicitante_nombre, res.officialName)) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `⚠️ Inconsistencia de identidad: La cédula ${cleanDoc} del solicitante pertenece oficialmente ante la Policía Nacional a "${res.officialName}" y no a "${input.solicitante_nombre}". Por seguridad, la solicitud fue rechazada.`,
              });
            }
          }
        }
      }

      // 2. Validar cliente presentado si es CC
      if (input.interesado_documento && (input.interesado_tipo_documento?.includes('ciudadanía') || input.interesado_tipo_documento === 'CC' || !input.interesado_tipo_documento)) {
        const cleanDoc = input.interesado_documento.replace(/\D/g, '');
        if (cleanDoc.length >= 5) {
          const res = await queryPoliciaNacional('cc', cleanDoc);
          if (res.success && res.officialName && input.interesado_nombre) {
            if (!checkMatch(input.interesado_nombre, res.officialName)) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `⚠️ Inconsistencia de identidad: La cédula ${cleanDoc} del cliente presentado pertenece oficialmente ante la Policía Nacional a "${res.officialName}" y no a "${input.interesado_nombre}". Por seguridad, la solicitud fue rechazada.`,
              });
            }
          }
        }
      }

      // 3. Validar cada acompañante registrado
      if (input.acompanantes && Array.isArray(input.acompanantes)) {
        for (const acomp of input.acompanantes) {
          if (acomp && acomp.documento && acomp.nombre) {
            const cleanDoc = String(acomp.documento).replace(/\D/g, '');
            if (cleanDoc.length >= 5) {
              const res = await queryPoliciaNacional('cc', cleanDoc);
              if (res.success && res.officialName) {
                if (!checkMatch(String(acomp.nombre), res.officialName)) {
                  throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: `⚠️ Inconsistencia de identidad: La cédula ${cleanDoc} del acompañante "${acomp.nombre}" pertenece oficialmente ante la Policía Nacional a "${res.officialName}". Por seguridad, la solicitud fue rechazada.`,
                  });
                }
              }
            }
          }
        }
      }

      // Obtener el siguiente consecutivo oficial solicitud_id
      const maxRes = await db
        .select({ maxId: sql<number>`COALESCE(MAX(solicitud_id), 0)` })
        .from(solicitudes);
      const nextSolicitudId = Number(maxRes[0]?.maxId || 0) + 1;

      const inserted = await db
        .insert(solicitudes)
        .values({
          id: sql`nextval('solicitudes_id_seq')`,
          solicitudId: nextSolicitudId,
          solicitanteNombre: input.solicitante_nombre,
          solicitanteTipoPersona: input.solicitante_tipo_persona || 'Persona Natural',
          solicitantePerfil: input.solicitante_perfil || 'Cliente directo',
          solicitanteEmail: input.solicitante_email || null,
          solicitanteCelular: input.solicitante_celular || null,
          solicitanteTipoDocumento: input.solicitante_tipo_documento || 'Cédula de ciudadanía',
          solicitanteNumeroDocumento: input.solicitante_numero_documento || null,
          servicioSolicitado: input.servicio_solicitado || 'Visitar inmueble',
          nombreInmueble: input.nombre_inmueble || null,
          codigoInmueble: input.codigo_inmueble || null,
          opcionNegocio: input.opcion_negocio || null,
          fechaCitaTexto: input.fecha_cita_texto || null,
          horaCita: input.hora_cita || null,
          cantidadPersonas: input.cantidad_personas ?? null,
          interesadoNombre: input.interesado_nombre || null,
          interesadoTipoDocumento: input.interesado_tipo_documento || null,
          interesadoDocumento: input.interesado_documento || null,
          tipoCliente: input.tipo_cliente || null,
          acompanantes: input.acompanantes || null,
          firmaVirtualBase64: input.firma_virtual_base64 || null,
          firmaFechahoraAudit: input.firma_fechahora_audit ? new Date(input.firma_fechahora_audit) : new Date(),
          createdAt: new Date(),
          solicitanteRepresentanteLegal: input.solicitante_representante_legal || null,
          autorizacion: input.autorizacion ?? true,
          agentId: input.agent_id || null,
        })
        .returning();

      const newRow = inserted[0];

      return {
        success: true,
        id: newRow?.id,
        solicitudId: nextSolicitudId,
        data: newRow,
        message: `✓ Solicitud de agenda #${nextSolicitudId} registrada con éxito.`,
      };
    }),
});

