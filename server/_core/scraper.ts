import axios from 'axios';
import * as cheerio from 'cheerio';
import { invokeLLM } from './llm';

// Portales inmobiliarios colombianos con HTML público que podemos leer
const DOMINIOS_PERMITIDOS = [
  'wasi.co',
  'fincaraiz.com.co',
  'metrocuadrado.com',
  'ciencuadras.com',
  'properati.com.co',
  'olx.com.co',
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
    // 1. Si es una red social bloqueada, nunca entramos
    if (DOMINIOS_BLOQUEADOS.some(d => hostname.includes(d))) return false;
    
    // 2. Si está en la lista de confianza, entramos de una
    if (DOMINIOS_PERMITIDOS.some(d => hostname.includes(d))) return true;

    // 3. Si es cualquier otro sitio, ¡dejamos que JanIA intente explorarlo!
    // Solo bloqueamos lo que sabemos que NO es útil.
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // 2. Limpiar el HTML para que Gemini no se pierda entre scripts y estilos
    $('script, style, nav, footer, iframe, header').remove();
    const cleanText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 10000); // Tomamos los primeros 10k caracteres

    // 3. Extraer todas las imágenes (muy importante para las fotos del inmueble)
    const images: string[] = [];
    $('img').each((_, el) => {
      const src = $(el).attr('src');
      if (src && (src.startsWith('http') || src.startsWith('https'))) {
        images.push(src);
      }
    });

    // 4. Usar JanIA para extraer la información estructurada
    const extractionPrompt = `
      Eres un extractor de datos inmobiliarios experto. He extraído el siguiente texto de una página web de un inmueble:
      
      URL: ${url}
      TEXTO: ${cleanText}
      IMAGENES ENCONTRADAS: ${images.slice(0, 20).join(', ')}
      
      Tu tarea es devolver un objeto JSON estrictamente formateado con los siguientes campos basándote SOLO en la información del texto:
      - name: Un título atractivo para el inmueble.
      - description: Una descripción detallada.
      - propertyType: Uno de estos: "apartment", "house", "building", "warehouse", "farm", "hotel", "office", "land", "commercial", "loft", "consultorio".
      - transactionType: "venta" o "arriendo".
      - price: Solo el número (ej: 450000000).
      - currency: "COP" o "USD".
      - city: Nombre de la ciudad.
      - zone: Barrio o sector.
      - bedrooms: Número (si existe).
      - bathrooms: Número (si existe).
      - garages: Número (si existe).
      - stratum: Número 1-6.
      - areaTotal: Número en m2.
      - areaPrivate: Número en m2.
      - isAmoblado: boolean.
      - amenities: Un objeto con booleanos (balcon, piscina, gimnasio, vigilancia, ascensor, terraza, deposito).
      - images: Un array con las 10 mejores URLs de imágenes que parezcan del inmueble.
      
      Responde SOLO el JSON. Si no encuentras un dato, pon null.
    `;

    const aiResponse = await invokeLLM({
      messages: [{ role: 'system', content: extractionPrompt }]
    });

    const content = aiResponse.choices[0]?.message?.content;
    if (!content) throw new Error("No se pudo extraer información del inmueble");

    // Limpiar posibles bloques de código markdown
    const jsonStr = content.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error('Error in property scraper:', error);
    throw new Error(`Error al extraer datos del link: ${error}`);
  }
}
