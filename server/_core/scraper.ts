import axios from 'axios';
import * as cheerio from 'cheerio';
import { invokeLLM } from './llm';

// Portales inmobiliarios colombianos, CRMs y sitios web independientes autorizados para Scraping
const DOMINIOS_PERMITIDOS = [
  'wasi.co',
  'qrador.com',
  'habi.co',
  'metrocuadrado.com',
  'fincaraiz.com.co',
  'ciencuadras.com',
  'proppit.com',          // El nuevo Properati
  'mercadolibre.com.co',   // MercadoLibre Colombia
  'mitula.com.co',
  'lamudi.com.co',
  'nuroa.com.co',
  'vivareal.co',
  'casacol.co',
  'lambienesraices.com',  // Inmobiliarias independientes
  'drive.google.com',     // Google Drive (fichas compartidas)
  'netlify.app',          // Sitios web inmobiliarios en Netlify
  'vecy.co',              // Portales VECY Network
  'github.io'            // Páginas web estáticas
];

// Lista Negra: Redes sociales, plataformas de video y catálogos directos de WhatsApp (Ignorados)
const DOMINIOS_BLOQUEADOS = [
  'facebook.com', 'fb.com', 'fb.watch',
  'instagram.com',
  'youtube.com', 'youtu.be',
  'tiktok.com',
  'twitter.com', 'x.com',
  'wa.me', 'whatsapp.com/catalog', 'whatsapp.com',
  'linkedin.com',
];

export function esDominioPermitido(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace('www.', '').toLowerCase();
    if (DOMINIOS_BLOQUEADOS.some(d => hostname.includes(d))) return false;
    if (DOMINIOS_PERMITIDOS.some(d => hostname.includes(d))) return true;
    return true; // Permitir sitios web independientes de inmobiliarias no listados en la lista negra
  } catch {
    return false;
  }
}

export async function scrapePropertyLink(url: string) {
  try {
    // 1. Descargar el HTML de la página
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);

    // 2. Limpieza Quirúrgica (Preservamos lo que importa)
    const title = $('title').text() || $('h1').first().text();
    
    // Capturamos el precio explícitamente si existe en clases comunes de Wasi/Portales
    const priceText = $('.price, .property-price, .item-price, .valor, [itemprop="price"]').text().trim();
    
    // Removemos basura
    $('script, style, nav, footer, iframe, header, .related-properties, .comments').remove();
    
    // Capturamos el texto del cuerpo pero priorizamos contenedores de detalles
    const detailsText = $('.details, .features, .description, .caracteristicas, .ficha-tecnica').text().trim();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    
    const combinedContent = `
      TITULO: ${title}
      PRECIO DETECTADO: ${priceText}
      DETALLES ESPECIFICOS: ${detailsText}
      CONTENIDO GENERAL: ${bodyText}
    `.slice(0, 12000);

    // 3. Extraer Imágenes con Calidad (DESHABILITADO para VRIF Core v1.0)
    const images: string[] = [];

    // 4. Invocación Magistral a JanIA para Estructuración
    const systemPrompt = `
      Eres el motor de extracción de datos de JanIA (VECY Bienes Raíces). Tu misión es convertir texto sucio de portales inmobiliarios (como Wasi, FincaRaíz, etc.) en datos perfectos.
      
      REGLAS DE ORO:
      - PRICE: Busca el valor numérico más alto que parezca el precio (ej: 550000000). Ignora la administración. Devuelve SOLO el número.
      - NAME: Genera un nombre profesional (ej: "Apartamento en Venta San José de Bavaria").
      - PROPERTY TYPE: apartment, house, building, warehouse, farm, hotel, office, land, commercial, loft, consultorio.
      
      RESPONDE ÚNICAMENTE CON ESTE JSON:
      {
        "name": "string",
        "description": "string",
        "propertyType": "string",
        "transactionType": "venta | arriendo",
        "price": number,
        "currency": "COP | USD",
        "city": "string",
        "zone": "string",
        "bedrooms": number | null,
        "bathrooms": number | null,
        "garages": number | null,
        "stratum": number | null,
        "areaTotal": number | null,
        "areaPrivate": number | null,
        "isAmoblado": boolean,
        "floorDetail": "string (ej: 'piso 5', '3 pisos', '8 metros', 'NA')",
        "interiorExterior": "interior | exterior | NA",
        "cuartoBanoServicio": "Si | No | NA",
        "cocina": "cerrada | abierta | americana | NA",
        "lavanderiaIndependiente": "Si | No | NA",
        "tipoPisos": ["string"],
        "depositos": number | null,
        "comisiones": "string | number | null",
        "antiguedad": "nuevo | 1-5 | 5-10 | 10+ | NA",
        "amenities": { "balcon": boolean, "piscina": boolean, "gimnasio": boolean, "vigilancia": boolean, "ascensor": boolean, "terraza": boolean, "deposito": boolean }
      }
    `;

    const userPrompt = `
      URL: ${url}
      CONTENIDO EXTRAIDO:
      ${combinedContent}
      
      Extrae los datos en JSON.
    `;

    const aiResponse = await invokeLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      responseFormat: { type: 'json_object' }
    });

    const content = aiResponse.choices[0]?.message?.content;
    if (!content) throw new Error("JanIA no pudo estructurar la información");

    const jsonStr = content.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error('Error in property scraper:', error);
    throw new Error(`Fallo en la extracción de datos: ${error}`);
  }
}

export function extractPortalAndListingId(urlStr: string): { portal: string | null; listingId: string | null } {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase();
    let portal: string | null = null;
    let listingId: string | null = null;

    if (host.includes("wasi.co")) portal = "Wasi";
    else if (host.includes("fincaraiz")) portal = "FincaRaíz";
    else if (host.includes("metrocuadrado")) portal = "Metrocuadrado";
    else if (host.includes("ciencuadras")) portal = "Ciencuadras";
    else if (host.includes("habi.co")) portal = "Habi";
    else if (host.includes("mercadolibre")) portal = "MercadoLibre";
    else if (host.includes("properati") || host.includes("proppit")) portal = "Properati";
    else {
      const parts = host.replace("www.", "").split(".");
      portal = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : "Externo";
    }

    const pathSegments = url.pathname.split("/").filter(Boolean);
    for (const segment of pathSegments) {
      if (/^\d{5,12}$/.test(segment)) {
        listingId = segment;
        break;
      }
      if (/^[a-zA-Z0-9]+-\w+$/.test(segment)) {
        listingId = segment;
        break;
      }
    }

    if (!listingId) {
      const match = url.pathname.match(/\/(\d{5,12})(?:\/|\?|$|\.|#)/);
      if (match) {
        listingId = match[1];
      }
    }

    return { portal, listingId };
  } catch {
    return { portal: null, listingId: null };
  }
}

/**
 * Descarga y extrae el contenido de cualquier URL web (portales inmobiliarios, páginas corporativas o documentos)
 * para análisis conversacional inmediato en JanIA (Nivel ARGON — v33.30)
 */
export async function fetchWebUrlContent(
  urlStr: string,
  timeoutMs: number = 10000
): Promise<{ title: string; content: string; url: string; success: boolean }> {
  try {
    const response = await axios.get(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (VECY-Browser/33.30)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8'
      },
      timeout: timeoutMs
    });

    const $ = cheerio.load(response.data);
    const title = $('title').text() || $('h1').first().text() || "Página web";
    $('script, style, nav, footer, iframe, header, noscript, svg, .ad, .advertisement').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    return {
      title: title.trim(),
      content: text.slice(0, 8000),
      url: urlStr,
      success: true
    };
  } catch (err: any) {
    return {
      title: "Error al acceder a la URL",
      content: `No se pudo descargar el contenido de ${urlStr}: ${err?.message}`,
      url: urlStr,
      success: false
    };
  }
}

export interface WebGroundingResult {
  query: string;
  source: string;
  results: Array<{ title: string; snippet: string; url?: string }>;
  summary: string;
  success: boolean;
}

/**
 * Consulta la Tasa Representativa del Mercado (TRM) oficial de Colombia en tiempo real
 * desde la API oficial de Datos Abiertos del Gobierno Nacional (Superintendencia Financiera / BanRep).
 */
export async function fetchLiveTRM(): Promise<{ valor: number; fecha: string; success: boolean; fuente: string }> {
  try {
    const res = await axios.get('https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde%20DESC', {
      timeout: 6000
    });
    if (Array.isArray(res.data) && res.data[0] && res.data[0].valor) {
      return {
        valor: parseFloat(res.data[0].valor),
        fecha: res.data[0].vigenciadesde?.split('T')[0] || new Date().toISOString().split('T')[0],
        success: true,
        fuente: 'Datos Abiertos Colombia (Superintendencia Financiera)'
      };
    }
  } catch (err: any) {
    console.warn('[TRM] Error consultando TRM oficial en datos.gov.co:', err?.message);
  }
  return { valor: 0, fecha: '', success: false, fuente: 'Datos Abiertos Colombia' };
}

/**
 * Búsqueda y Validación en Línea en Tiempo Real (Web Grounding) para JanIA:
 * Consultas sobre normativa (POT 555, Estatuto Tributario, Notarías SNR, trámites en línea VUR/Sinupot)
 * y divisas (TRM), garantizando rigor jurídico sin alucinaciones.
 */
export async function searchWebGrounding(query: string, timeoutMs: number = 3500): Promise<WebGroundingResult> {
  const cleanQ = (query || '').trim();
  if (!cleanQ) {
    return { query: '', source: 'none', results: [], summary: '', success: false };
  }

  // 1. Si la consulta es sobre divisas / TRM / dólar
  const isCurrencyQuery = /\b(?:trm|d[oó]lar|divisa|tasa\s*de\s*cambio|dolares|usd|cop)\b/i.test(cleanQ);
  if (isCurrencyQuery) {
    const trm = await fetchLiveTRM();
    if (trm.success && trm.valor > 0) {
      const summary = `💵 *Tasa Representativa del Mercado (TRM Oficial de Colombia)*:\n` +
        `• Valor Oficial: $${trm.valor.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} COP\n` +
        `• Vigencia: ${trm.fecha}\n` +
        `• Fuente: Superintendencia Financiera de Colombia / Banco de la República (Datos Abiertos).`;
      return {
        query: cleanQ,
        source: 'Superintendencia Financiera / Datos Abiertos Colombia',
        results: [{ title: 'TRM Oficial Colombia', snippet: summary, url: 'https://www.datos.gov.co/resource/32sa-8pi3.json' }],
        summary,
        success: true
      };
    }
  }

  // 2. Búsqueda en la web mediante motor DuckDuckGo HTML sin dependencias de claves de pago
  try {
    const response = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQ)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8'
      },
      timeout: timeoutMs
    });

    const $ = cheerio.load(response.data);
    const results: Array<{ title: string; snippet: string; url?: string }> = [];

    $('.result__body').slice(0, 4).each((_i, el) => {
      const title = $(el).find('.result__title a').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      const url = $(el).find('.result__url').text().trim();
      if (title && snippet) {
        results.push({ title, snippet, url: url ? `https://${url}` : undefined });
      }
    });

    if (results.length > 0) {
      const summary = results.map((r, i) => `[${i + 1}] ${r.title}: ${r.snippet}`).join('\n\n');
      return {
        query: cleanQ,
        source: 'Web Grounding (Fuentes Oficiales y Web)',
        results,
        summary,
        success: true
      };
    }
  } catch (err: any) {
    console.warn(`[WEB-GROUNDING] Error en búsqueda web para "${cleanQ}":`, err?.message);
  }

  return {
    query: cleanQ,
    source: 'Núcleo Cognitivo JanIA',
    results: [],
    summary: '',
    success: false
  };
}

