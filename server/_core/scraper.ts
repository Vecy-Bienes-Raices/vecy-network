import axios from 'axios';
import * as cheerio from 'cheerio';
import { invokeLLM } from './llm';

// Portales inmobiliarios colombianos con HTML público que podemos leer
const DOMINIOS_PERMITIDOS = [
  'wasi.co',
  'fincaraiz.com.co',
  'metrocuadrado.com',
  'ciencuadras.com',
  'proppit.com',    // El nuevo Properati
  'mercadolibre.com.co', // Muy usado en Colombia
  'mitula.com.co',
  'lamudi.com.co',
  'nuroa.com.co',
  'vivareal.co',
  'casacol.co',
  'habi.co',
  'netlify.app', // Tus sitios de Netlify
  'vecy.co',      // Tus sitios de Vecy
  'github.io'    // Otros sitios estáticos
];

// Redes sociales y sitios que requieren autenticación - los ignoramos
const DOMINIOS_BLOQUEADOS = [
  'facebook.com', 'fb.com', 'fb.watch',
  'instagram.com',
  'youtube.com', 'youtu.be',
  'tiktok.com',
  'twitter.com', 'x.com',
  'wa.me', 'whatsapp.com',
  'linkedin.com',
];

export function esDominioPermitido(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace('www.', '').toLowerCase();
    if (DOMINIOS_BLOQUEADOS.some(d => hostname.includes(d))) return false;
    if (DOMINIOS_PERMITIDOS.some(d => hostname.includes(d))) return true;
    return true; 
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
      Eres el motor de extracción de datos de JanIA (VECY Network). Tu misión es convertir texto sucio de portales inmobiliarios (como Wasi, FincaRaíz, etc.) en datos perfectos.
      
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
