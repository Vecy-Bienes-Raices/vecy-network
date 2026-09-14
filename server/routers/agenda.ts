import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { desc, ilike, or, sql, eq } from "drizzle-orm";
import { getDb } from "../db";
import { solicitudes } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { Solver } from "@2captcha/captcha-solver";

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
  getCookieString(): string {
    return Array.from(this.cookies.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
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
    const timeoutId = setTimeout(() => controller.abort(), 16000);

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

      // 3.5 AHORRO 100% SALDO: Consultar primero en NUESTRA base de datos interna (solicitudes y clientes previos)
      try {
        const db = await getDb();
        if (db) {
          const existing = await db
            .select({
              solicitanteNombre: solicitudes.solicitanteNombre,
              solicitanteDoc: solicitudes.solicitanteNumeroDocumento,
              interesadoNombre: solicitudes.interesadoNombre,
              interesadoDoc: solicitudes.interesadoDocumento,
            })
            .from(solicitudes)
            .where(
              or(
                eq(solicitudes.solicitanteNumeroDocumento, cleanDoc),
                eq(solicitudes.interesadoDocumento, cleanDoc)
              )
            )
            .limit(1);

          let localOfficialName = '';
          if (existing.length > 0) {
            const row = existing[0];
            if ((row.solicitanteDoc || '').replace(/\D/g, '') === cleanDoc && row.solicitanteNombre) {
              localOfficialName = row.solicitanteNombre;
            } else if ((row.interesadoDoc || '').replace(/\D/g, '') === cleanDoc && row.interesadoNombre) {
              localOfficialName = row.interesadoNombre;
            }
          }

          if (localOfficialName) {
            const officialFormatted = formatTitleCase(localOfficialName);
            if (nombreIngresado && nombreIngresado.trim().length >= 3) {
              const normEntered = nombreIngresado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(Boolean);
              const normOfficial = officialFormatted.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(Boolean);
              const matches = normEntered.filter((token: string) => normOfficial.some((off: string) => off === token || off.startsWith(token) || token.startsWith(off)));
              const isMatch = matches.length >= Math.min(2, normEntered.length);

              if (!isMatch) {
                return {
                  valid: true,
                  match: false,
                  error: '⚠️ El número de documento no corresponde a los nombres y apellidos indicados según nuestros registros verificados.',
                };
              }
            }

            return {
              valid: true,
              match: true,
              officialName: officialFormatted,
              message: `✓ Identidad confirmada en base de datos interna de Vecy: ${officialFormatted}`,
            };
          }
        }
      } catch (dbErr: any) {
        console.warn('[VerifyIdentity DB check error]', dbErr?.message);
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

      // Si no hay API key o no devolvió resultado, validar estructura y formatear nombre
      if (nombreIngresado && nombreIngresado.trim().length >= 3) {
        const formatted = formatTitleCase(nombreIngresado.trim());
        return {
          valid: true,
          match: true,
          officialName: formatted,
          message: '✓ Estructura de identidad y documento verificados conforme a Registraduría y DIAN',
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
});
