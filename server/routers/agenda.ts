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

  verifyIdentity: publicProcedure
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
          valid: false,
          match: false,
          error: 'El número de documento debe tener al menos 5 caracteres.',
        };
      }

      // Detección de secuencias o dígitos repetitivos ficticios
      const DUMMY_SEQUENCES = [
        '12345', '123456', '1234567', '12345678', '123456789', '1234567890',
        '0123456789', '987654321', '9876543210', '54321', '654321'
      ];
      if (DUMMY_SEQUENCES.includes(cleanDoc) || /^(\d){4,}$/.test(cleanDoc)) {
        return {
          valid: false,
          match: false,
          error: '⚠️ Número de documento sospechoso o de prueba no permitido. Debe ingresar su documento real.',
        };
      }

      // Detección de nombres ficticios o incompletos
      if (nombreIngresado && nombreIngresado.trim().length > 0) {
        const trimmedName = nombreIngresado.trim();
        const tokens = trimmedName.split(/\s+/);
        if (/^(test|prueba|demo|asdf|cliente|nadie|usuario|ninguno|qwerty|xxx)$/i.test(trimmedName)) {
          return {
            valid: false,
            match: false,
            error: '⚠️ Ingrese nombres y apellidos reales válidos.',
          };
        }
        if (!tipoDocumento.includes('NIT') && !tipoDocumento.includes('RUT') && tokens.length < 2) {
          return {
            valid: false,
            match: false,
            error: '⚠️ Debe ingresar nombres y apellidos completos (al menos dos palabras).',
          };
        }
      }

      // 1. Reglas antifraude para Cédula Colombiana (C.C.)
      if (tipoDocumento.includes('ciudadanía') || tipoDocumento === 'CC') {
        if (cleanDoc.length === 9) {
          return {
            valid: false,
            match: false,
            error: '⚠️ Número de cédula inválido. En Colombia no existen cédulas de 9 dígitos.',
          };
        }
        if (cleanDoc.length === 10) {
          const num = parseInt(cleanDoc, 10);
          if (num > 1250000000 || !cleanDoc.startsWith('1')) {
            return {
              valid: false,
              match: false,
              error: '⚠️ Cédula fuera del rango legal expedido por la Registraduría Nacional (máximo 1.250 millones).',
            };
          }
        }
      }

      // 2. Reglas antifraude para Cédula de Extranjería (C.E.)
      if (tipoDocumento.includes('extranjería') || tipoDocumento === 'CE') {
        if (cleanDoc.length < 5 || cleanDoc.length > 7) {
          return {
            valid: false,
            match: false,
            error: '⚠️ La Cédula de Extranjería en Colombia contiene entre 5 y 7 dígitos numéricos.',
          };
        }
      }

      // 3. Reglas para NIT con Módulo 11 oficial de la DIAN
      if (tipoDocumento.includes('NIT') || tipoDocumento.includes('RUT')) {
        const parts = numeroDocumento.trim().split('-');
        if (parts.length === 2) {
          const nitBody = parts[0].replace(/\D/g, '');
          const providedDV = parts[1].trim();
          const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
          let sum = 0;
          for (let i = 0; i < nitBody.length; i++) {
            sum += parseInt(nitBody[nitBody.length - 1 - i], 10) * weights[i];
          }
          const mod = sum % 11;
          const calculatedDV = mod > 1 ? (11 - mod).toString() : mod.toString();
          if (providedDV !== calculatedDV) {
            return {
              valid: false,
              match: false,
              error: `⚠️ El Dígito de Verificación del NIT no es correcto (según la DIAN debe ser ${calculatedDV}).`,
            };
          }
        }
      }

      // Función auxiliar para formatear nombres en mayúscula inicial
      const formatTitleCase = (str: string) => {
        return str
          .toLowerCase()
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      };

      // 4. CONSULTA OFICIAL PRINCIPAL ANTE LA POLICÍA NACIONAL DE COLOMBIA VÍA 2CAPTCHA
      // Fuente autoritativa de antecedentes penales e identidad de los ciudadanos colombianos
      const policiaOfficial = await queryPoliciaNacional(tipoDocumento, cleanDoc);
      if (policiaOfficial && policiaOfficial.success && policiaOfficial.officialName) {
        const officialFormatted = policiaOfficial.officialName;

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
              error: `⚠️ Inconsistencia de identidad: La cédula ${cleanDoc} pertenece oficialmente ante la Policía Nacional a "${officialFormatted}" y no a "${nombreIngresado}". Por motivos de seguridad y prevención de fraude, la solicitud queda bloqueada.`,
            };
          }

          return {
            valid: true,
            match: true,
            officialName: officialFormatted,
            message: `✓ Identidad confirmada ante la Policía Nacional de Colombia: ${officialFormatted}`,
          };
        }

        // Si el usuario aún no había escrito su nombre completo, autocompletarlo de inmediato
        return {
          valid: true,
          match: true,
          officialName: officialFormatted,
          message: `✓ Identidad confirmada ante la Policía Nacional de Colombia: ${officialFormatted}`,
        };
      }

      // 4. Consulta a API externa vía 2Captcha + ADRES BDUA
      const adresOfficial = await queryOfficialAdres(tipoDocumento, cleanDoc);
      if (adresOfficial && adresOfficial.success && adresOfficial.officialName) {
        const officialFormatted = adresOfficial.officialName;
        if (nombreIngresado && nombreIngresado.trim().length >= 3) {
          const normEntered = nombreIngresado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(Boolean);
          const normOfficial = officialFormatted.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(Boolean);

          const matches = normEntered.filter((token: string) => normOfficial.some((off: string) => off === token || off.startsWith(token) || token.startsWith(off)));
          const isMatch = matches.length >= Math.min(2, normEntered.length);

          if (!isMatch) {
            return {
              valid: true,
              match: false,
              error: '⚠️ El número de documento no corresponde a los nombres y apellidos indicados. Por motivos de seguridad y veracidad legal, solo se permiten datos reales verificados.',
            };
          }

          return {
            valid: true,
            match: true,
            officialName: officialFormatted,
            message: `✓ Identidad confirmada ante Registraduría / ADRES: ${officialFormatted}`,
          };
        }

        return {
          valid: true,
          match: true,
          officialName: officialFormatted,
          message: `✓ Identidad confirmada ante Registraduría / ADRES: ${officialFormatted}`,
        };
      }

      // 4.1 Consulta de respaldo TusDatos si estuviera configurada
      const tusdatosApiKey = process.env.TUSDATOS_API_KEY;

      if (tusdatosApiKey) {
        try {
          const res = await fetch('https://api.tusdatos.co/api/launch/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': tusdatosApiKey.startsWith('Token ') || tusdatosApiKey.startsWith('Bearer ') 
                ? tusdatosApiKey 
                : `Token ${tusdatosApiKey}`,
            },
            body: JSON.stringify({
              doc: cleanDoc,
              typedoc: tipoDocumento.includes('NIT') ? 'NIT' : (tipoDocumento.includes('extranjería') ? 'CE' : 'CC'),
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const rawOfficial = (data.nombre || data.full_name || data.datos?.nombre || '').trim();

            if (rawOfficial && nombreIngresado) {
              const officialFormatted = formatTitleCase(rawOfficial);
              const normEntered = nombreIngresado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(Boolean);
              const normOfficial = rawOfficial.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(Boolean);

              const matches = normEntered.filter((token: string) => normOfficial.some((off: string) => off === token || off.startsWith(token) || token.startsWith(off)));
              const isMatch = matches.length >= Math.min(2, normEntered.length);

              if (!isMatch) {
                return {
                  valid: true,
                  match: false,
                  error: '⚠️ El número de documento no corresponde a los nombres y apellidos indicados. Por motivos de seguridad y veracidad legal, solo se permiten datos reales verificados.',
                };
              }

              return {
                valid: true,
                match: true,
                officialName: officialFormatted,
                message: `✓ Identidad confirmada ante Registraduría / DIAN: ${officialFormatted}`,
              };
            }
          }
        } catch (err: any) {
          console.error('[VerifyIdentity API Error]', err?.message);
        }
      }

      // Regla Doctrinal de Seguridad Antifraude: Para Cédula de Ciudadanía colombiana (CC),
      // NUNCA validar un nombre ficticio a ciegas si no fue confirmado ante la Policía Nacional o Registraduría.
      if (tipoDocumento.includes('ciudadanía') || tipoDocumento === 'CC' || tipoDocumento === 'cc') {
        return {
          valid: false,
          match: false,
          error: `⚠️ No fue posible corroborar la identidad de la cédula ${cleanDoc} en las bases oficiales de la Policía Nacional. Verifique el número ingresado e intente nuevamente.`,
        };
      }

      // Para otros documentos (NIT / RUT / Pasaporte internacional validado estructuralmente)
      if (nombreIngresado && nombreIngresado.trim().length >= 3) {
        const formatted = formatTitleCase(nombreIngresado.trim());
        return {
          valid: true,
          match: true,
          officialName: formatted,
          message: '✓ Estructura de identidad y documento verificados conforme a DIAN / Estándares Internacionales',
        };
      }

      return {
        valid: true,
        match: true,
        officialName: nombreIngresado || '',
        message: '✓ Documento validado',
      };
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

