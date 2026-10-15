/**
 * JanIA Heuristics - VECY BIENES RAÍCES
 * Detección multi-item, discriminación de spam, filtros anti-ruido, control de horarios y scraping bypass.
 */
import axios from "axios";

export function isOutsideWorkingHours(): boolean {
  // Obtener fecha y hora en la zona horaria de Bogotá, Colombia
  const dateStr = new Date().toLocaleString("en-US", { timeZone: "America/Bogota" });
  const bogotaDate = new Date(dateStr);
  const weekday = bogotaDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const hour = bogotaDate.getHours();  // 0-23

  // Horario Laboral:
  // Lunes a Viernes: 8:00 AM a 8:00 PM (20:00)
  // Sábado: 8:00 AM a 6:00 PM (18:00)
  // Domingo: Cerrado (siempre fuera de horario)
  if (weekday === 0) { // Domingo
    return true;
  }
  if (weekday === 6) { // Sábado
    return hour < 8 || hour >= 18;
  }
  // Lunes a Viernes (1-5)
  return hour < 8 || hour >= 20;
}

export function esMensajeSpamOBasura(text: string): { isSpam: boolean; reason: string } {
  if (!text || text.trim() === "") return { isSpam: false, reason: "" };
  const n = text.toLowerCase();

  // 1. Enlaces / Invitaciones a Zoom, Google Meet, Teams, Webinars, Masterclasses, Cursos
  if (
    n.includes("zoom.us") ||
    n.includes("meet.google.com") ||
    n.includes("teams.microsoft.com") ||
    n.includes("webinar") ||
    n.includes("masterclass") ||
    n.includes("capacitacion") ||
    n.includes("capacitación") ||
    n.includes("seminario") ||
    n.includes("taller de ventas") ||
    n.includes("curso de") ||
    n.includes("congreso de") ||
    n.includes("evento inmobiliario") ||
    n.includes("inmoverso")
  ) {
    return { isSpam: true, reason: "Invitación a evento, Zoom, Meet, webinar o masterclass externa." };
  }

  // 2. Publicidad de Terceros / Marketing No Predial / Pauta en Meta / Software / Cursos / Coaching
  const marketingPatterns = [
    "campaña en meta",
    "campana en meta",
    "campañas en meta",
    "campanas en meta",
    "yo implemento tus campañas",
    "yo implemento tus campanas",
    "implemento tus campañas",
    "implemento tus campanas",
    "implementamos tus campañas",
    "implementamos tus campanas",
    "anuncio en facebook",
    "anuncios en facebook",
    "anuncio en instagram",
    "anuncios en instagram",
    "anuncios en meta",
    "pauta en facebook",
    "pauta en instagram",
    "pauta en redes",
    "pauta en meta",
    "pauta digital",
    "agencia de marketing",
    "agencia digital",
    "agencia de publicidad",
    "marketing inmobiliario",
    "marketing digital",
    "servicio de marketing",
    "servicios de marketing",
    "estrategias de marketing",
    "estrategia digital",
    "generar leads",
    "generación de leads",
    "generacion de leads",
    "prospectos calificados",
    "clientes potenciales para tus inmuebles",
    "trafficker",
    "media buyer",
    "funnel de ventas",
    "embudo de ventas",
    "embudos de ventas",
    "software inmobiliario",
    "software crm",
    "crm inmobiliario",
    "venta de software",
    "coaching",
    "red de mercadeo",
    "multinivel",
    "gana dinero desde casa",
    "te regalo una guia",
    "te regalo una guía",
    "te regalo un ebook",
    "te enseño a vender",
    "aprende a vender con pauta",
    "aprende a pautar",
    "curso de pauta"
  ];

  if (marketingPatterns.some(pat => n.includes(pat))) {
    return { isSpam: true, reason: "Publicidad de marketing, pauta en redes, venta de software o coaching no inmobiliario." };
  }

  // 3. Política, Religión o Spam Ideológico
  if (
    n.includes("vota por") ||
    n.includes("partido politico") ||
    n.includes("partido político") ||
    n.includes("candidato") ||
    n.includes("elecciones") ||
    n.includes("cadena de oracion") ||
    n.includes("cadena de oración") ||
    n.includes("comparte esta cadena")
  ) {
    return { isSpam: true, reason: "Contenido político, ideológico o cadenas de spam." };
  }

  return { isSpam: false, reason: "" };
}

/**
 * Scrapea una URL utilizando APIs especializadas en evasión de bloqueos (Bypass) como ZenRows, ScrapingBee o Firecrawl.
 * Si no hay keys configuradas o fallan, hace fallback al pre-procesador de Jina Reader.
 */
export async function scrapeUrlWithBypass(url: string): Promise<string> {
  const cleanUrl = url.trim();

  // 1. ZENROWS (Bypass Premium)
  const zenrowsKey = process.env.ZENROWS_API_KEY;
  if (zenrowsKey) {
    try {
      console.log(`[Scraper-Bypass] Intentando extraer con ZenRows: ${cleanUrl}`);
      // Usamos js_render=true y premium_proxy=true para evadir Cloudflare/Captchas
      const response = await axios.get("https://api.zenrows.com/v1/", {
        params: {
          key: zenrowsKey,
          url: cleanUrl,
          js_render: "true",
          premium_proxy: "true",
          markdown: "true"
        },
        timeout: 20000
      });
      if (response.status === 200 && response.data) {
        return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      }
    } catch (err: any) {
      console.warn(`[Scraper-Bypass] Error en ZenRows para ${cleanUrl}:`, err.message);
    }
  }

  // 2. SCRAPINGBEE (Bypass Premium)
  const scrapingbeeKey = process.env.SCRAPINGBEE_API_KEY;
  if (scrapingbeeKey) {
    try {
      console.log(`[Scraper-Bypass] Intentando extraer con ScrapingBee: ${cleanUrl}`);
      const response = await axios.get("https://app.scrapingbee.com/api/v1/", {
        params: {
          api_key: scrapingbeeKey,
          url: cleanUrl,
          render_js: "true",
          premium_proxy: "true"
        },
        timeout: 20000
      });
      if (response.status === 200 && response.data) {
        return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      }
    } catch (err: any) {
      console.warn(`[Scraper-Bypass] Error en ScrapingBee para ${cleanUrl}:`, err.message);
    }
  }

  // 3. FIRECRAWL (Bypass Premium)
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (firecrawlKey) {
    try {
      console.log(`[Scraper-Bypass] Intentando extraer con Firecrawl: ${cleanUrl}`);
      const response = await axios.post("https://api.firecrawl.dev/v1/scrape", {
        url: cleanUrl,
        formats: ["markdown"]
      }, {
        headers: {
          "Authorization": `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json"
        },
        timeout: 20000
      });
      if (response.status === 200 && response.data && response.data.data && response.data.data.markdown) {
        return response.data.data.markdown;
      }
    } catch (err: any) {
      console.warn(`[Scraper-Bypass] Error en Firecrawl para ${cleanUrl}:`, err.message);
    }
  }

  // 4. FALLBACK: Jina Reader (r.jina.ai)
  try {
    console.log(`[Scraper-Bypass] Usando Jina Reader como fallback para: ${cleanUrl}`);
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(cleanUrl)}`;
    const response = await axios.get(jinaUrl, {
      timeout: 10000,
      headers: {
        "Accept": "text/plain",
        "X-Return-Format": "markdown"
      }
    });
    if (response.status === 200 && response.data) {
      return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    }
  } catch (error: any) {
    console.warn(`[Scraper-Bypass] Falló el fallback de Jina Reader para ${cleanUrl}:`, error.message);
  }

  return "";
}

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * JANIA — ADDENDUM v9: DETECTOR DE SEGMENTOS MULTI-PUBLICACIÓN DE 5 HEURÍSTICAS
 * ═════════════════════════════════════════════════════════════════════════════
 * Evalúa si un solo mensaje de WhatsApp contiene múltiples publicaciones de inmuebles
 * o múltiples requerimientos para dividirlos en N registros independientes en Supabase.
 */
export function evaluateMultiItemHeuristics(text: string): { isMultiItem: boolean; score: number; signals: string[] } {
  if (!text || text.length < 100) return { isMultiItem: false, score: 0, signals: [] };

  const signals: string[] = [];

  // H1: Encabezados repetidos de bloque (ej. "⬆️🏬ATL", "(🙏🏻)", "🚨VENTA", "🚨ARRIENDO", "🚨BUSCO")
  const h1HeaderMatches = text.match(/(?:[⬆️🏬🚨📌✨⭐👉1️⃣2️⃣3️⃣•]+|(?:\(🙏🏻\))|(?:ATL)|(?:\b(?:VENTA|ARRIENDO|BUSCO|SE VENDE|SE ARRIENDA|COMPRO)\b))/gi) || [];
  const h1RepeatedHeaders = h1HeaderMatches.length >= 3;
  if (h1RepeatedHeaders) signals.push("H1: Encabezados o emojis repetidos (3+)");

  // H2: Reinicio de numeración (ej. aparece "1." o "1️⃣" o "1)" después de un número mayor como 10., 15., 17.)
  let h2NumberReset = false;
  const numMatches = Array.from(text.matchAll(/(?:^|\n)\s*(\d{1,2})[\.\)\️⃣]/g));
  if (numMatches.length >= 2) {
    let maxSeen = 0;
    for (const m of numMatches) {
      const val = parseInt(m[1], 10);
      if (maxSeen >= 5 && val === 1) {
        h2NumberReset = true;
        break;
      }
      if (val > maxSeen) maxSeen = val;
    }
  }
  if (h2NumberReset) signals.push("H2: Reinicio de numeración (1. reaparece tras número > 5)");

  // H3: Múltiples enlaces públicos (2+ https://)
  const urlMatches = text.match(/https?:\/\/[^\s<"']+/gi) || [];
  if (urlMatches.length >= 2) signals.push(`H3: Múltiples URLs públicas (${urlMatches.length} enlaces)`);

  // H4: Repetición del patrón "VENTA/ARRIENDO/BUSCO [TIPO DE INMUEBLE]"
  const h4PatternMatches = text.match(/(?:\b(?:VENTA|SE VENDE|VENDO|ARRIENDO|SE ARRIENDA|BUSCO|COMPRO)\b\s+(?:APARTAMENTO|APTO|CASA|BODEGA|OFICINA|LOTE|PENTHOUSE|DÚPLEX|LOCAL))/gi) || [];
  if (h4PatternMatches.length >= 2) signals.push(`H4: Repetición de patrón de negocio+inmueble (${h4PatternMatches.length} veces)`);

  // H5: Separadores explícitos (---, ___, ===, ***) o reinicio de bloque en mayúsculas
  const h5Separators = /(?:\r?\n){1,}\s*(?:_{3,}|-{3,}|={3,}|\*{3,})\s*(?:\r?\n){1,}/.test(text);
  if (h5Separators) signals.push("H5: Separadores explícitos (---/___)");

  const score = signals.length;
  // Umbral Addendum v9: Se considera multi-item si al menos 2 heurísticas coinciden
  return {
    isMultiItem: score >= 2,
    score,
    signals
  };
}

function cleanAndMergeSubstantiveBlocks(rawList: string[]): string[] {
  const merged: string[] = [];
  for (const b of rawList) {
    const textNoUrls = b.replace(/https?:\/\/[^\s]+/gi, "").trim();
    // Si el bloque es residual (menos de 35 caracteres de texto real o solo contiene enlaces/intro de contacto), se fusiona con el anterior
    const isTrailer = textNoUrls.length < 35 || /^(?:contacto|info|galer[ií]a|fotos?|link|enlace|agendar|visitas?|escr[ií]beme|ll[aá]mame|whatsapp|asesor)\b/i.test(textNoUrls);
    if (isTrailer && merged.length > 0) {
      merged[merged.length - 1] += `\n\n${b}`;
    } else {
      merged.push(b);
    }
  }
  return merged.filter(b => b.trim().length >= 40);
}

export function splitMultiItemMessage(text: string): string[] {
  if (!text || text.length < 80) return [text];

  // 1. Delimitadores explícitos de corte (guiones largos, asteriscos repetidos, etc.)
  const delimiterSplit = text.split(/(?:\r?\n){1,}\s*(?:_{3,}|-{3,}|={3,}|\*{3,})\s*(?:\r?\n){1,}/);
  if (delimiterSplit.length >= 2) {
    const validBlocks = cleanAndMergeSubstantiveBlocks(delimiterSplit.map(b => b.trim()).filter(b => b.length >= 35));
    if (validBlocks.length >= 2) {
      return validBlocks;
    }
  }

  // 2. Encabezados formales repetidos (Requerimientos, Inmuebles, Clientes, Búsquedas, Ofertas)
  const headerSplitRegex = /(?=(?:^|\n)\s*(?:🚨\s*\*?(?:REQUERIMIENTO|INMUEBLE|OFERTA|DEMANDA)\*?\s*🚨|\*?(?:REQUERIMIENTO|INMUEBLE|OFERTA|DEMANDA)\*?\s*[:\n]|\*?Cliente\*?\s*:\s*[A-ZÁÉÍÓÚÑ]|\*?(?:Cliente|Clienta|Comprador|Compradora|Varios clientes|Tengo cliente)\s+(?:compra|compran|busca|buscan|requiere|necesita|solicita)\b|\b(?:VENDO|SE VENDE|ARRIENDO|SE ARRIENDA|BUSCO|SE BUSCA)\s+(?:APARTAMENTO|APTO|CASA|BODEGA|OFICINA|LOTE|LOCAL|PENTHOUSE|DÚPLEX)\b|(?:^|\n)\s*(?:[1-9][\.\)\️⃣]|\([1-9]\))\s*(?:APARTAMENTO|APTO|CASA|BODEGA|OFICINA|LOTE|LOCAL|VENTA|ARRIENDO|BUSCO|SE VENDE)))/gi;
  const rawBlocks = cleanAndMergeSubstantiveBlocks(text.split(headerSplitRegex).map(b => b.trim()).filter(b => b.length >= 35));
  if (rawBlocks.length >= 2) {
    return rawBlocks;
  }

  // 3. Fallback por párrafos cuando hay múltiples declaraciones independientes
  const paragraphs = text.split(/(?:\r?\n){2,}/);
  if (paragraphs.length >= 3) {
    const blocks: string[] = [];
    let currentBlock = "";
    for (const p of paragraphs) {
      const cleanP = p.trim();
      if (!cleanP) continue;

      // Sanitizar URLs antes de analizar si es un nuevo item independiente
      const textWithoutUrls = cleanP.replace(/https?:\/\/[^\s]+/gi, "").replace(/[\r\n\t]+/g, " ").trim();

      // Si el párrafo es predominantemente enlaces, contacto o texto corto de referencia, JAMÁS es un nuevo item
      const isContactOrLinkOnly = !textWithoutUrls || textWithoutUrls.length < 35 ||
        /^(?:contacto|info|galer[ií]a|fotos?|m[aá]s\s+info|link|enlace|agendar|visitas?|escr[ií]beme|ll[aá]mame|whatsapp|asesor)\b/i.test(textWithoutUrls);

      const isNewItem = !isContactOrLinkOnly &&
        /(?:SE VENDE|VENDO|SE ARRIENDA|ARRIENDO|APARTAMENTO|APTO|CASA|BUSCO|SOLICITO|ATL|REQUERIMIENTO|CLIENTE|CLIENTA|COMPRADOR|VARIOS CLIENTES)\b/i.test(textWithoutUrls) &&
        (/\$|\b\d{3,}\b|\bm2\b|\bhab\b|\bbaños\b|\balcobas\b|\bmm\b|\bmillon/i.test(textWithoutUrls));

      if (currentBlock && isNewItem) {
        blocks.push(currentBlock.trim());
        currentBlock = cleanP;
      } else {
        currentBlock = currentBlock ? `${currentBlock}\n\n${cleanP}` : cleanP;
      }
    }
    if (currentBlock) blocks.push(currentBlock.trim());
    const validParagraphBlocks = cleanAndMergeSubstantiveBlocks(blocks);
    if (validParagraphBlocks.length >= 2) {
      return validParagraphBlocks;
    }
  }

  // 4. Detección por saltos de línea simples cuando cada línea representa un requerimiento de cliente independiente
  const clientLines = text.split(/(?:\r?\n)+/).map(l => l.trim()).filter(Boolean);
  if (clientLines.length >= 2) {
    const multiClientItems = clientLines.filter(l =>
      /^(?:\*?(?:cliente|clienta|comprador|compradora|varios\s+clientes|tengo\s+cliente)\s+(?:compra|compran|busca|buscan|requiere|necesita|solicita)|(?:busco|buscan|se\s+busca)\s+(?:apto|apartamento|casa|oficina))\b/i.test(l) &&
      l.length >= 35
    );
    if (multiClientItems.length >= 2 && multiClientItems.length >= clientLines.length * 0.6) {
      return multiClientItems;
    }
  }

  return [text];
}

// Alias para retrocompatibilidad
export const splitMultiPropertyMessage = splitMultiItemMessage;

export function checkStrictOffTopic(text: string): { isOffTopic: boolean; reason?: string } {
  if (!text || text.trim() === '') return { isOffTopic: false };
  const clean = text.toLowerCase();

  // 1. Invitación a grupos ajenos de WhatsApp
  if (clean.includes('chat.whatsapp.com/')) {
    const isOfficialVecyLink =
      clean.includes('gzmbjns1p2thi7d0v4h8wz') ||
      clean.includes('j4u1h7nul1i1b1waiytun6') ||
      clean.includes('cszrkr6cr56haiehheauqyu') ||
      clean.includes('0029vb5iyuycmy0a94zqti1b');
    if (!isOfficialVecyLink) {
      return { isOffTopic: true, reason: 'enlaces de invitación a grupos externos' };
    }
  }

  // 2. Política partidista / Proselitismo
  const politicalKeywords = [
    'petro', 'uribe', 'duque', 'santos', 'rodolfo hernandez', 'fico gutiérrez', 'claudia lópez',
    'partido político', 'partido politico', 'campaña política', 'campaña politica', 'votaciones',
    'candidato a la alcaldía', 'candidato al concejo', 'senado', 'cámara de representantes',
    'consulta popular', 'plebiscito', 'izquierdista', 'derechista', 'uribista', 'petrista'
  ];
  if (politicalKeywords.some(kw => clean.includes(kw))) {
    return { isOffTopic: true, reason: 'temas políticos o proselitismo' };
  }

  // 3. Religión / Cadenas de oración
  const religiousKeywords = [
    'cadena de oración', 'cadena de oracion', 'reenvía este mensaje a 10', 'reenvia este mensaje a 10',
    'si amas a dios comparte', 'salmo del día', 'versículo del día', 'evangelio de hoy', 'culto de sanación'
  ];
  if (religiousKeywords.some(kw => clean.includes(kw))) {
    return { isOffTopic: true, reason: 'cadenas religiosas o cultos' };
  }

  // 4. Esquemas piramidales / Cursos de trading / Cripto spam / Memes ajenos
  const spamKeywords = [
    'gana dinero desde casa', 'trabaja 2 horas al día', 'trading automático', 'bot de trading',
    'inversión forex', 'libertad financiera con binance', 'curso de trading', 'ingresos pasivos en dólares',
    'esquema multinivel', 'red de mercadeo', 'inversión con rentabilidad del 20%', 'venta de cursos'
  ];
  if (spamKeywords.some(kw => clean.includes(kw))) {
    return { isOffTopic: true, reason: 'publicidad no autorizada, venta de cursos o spam' };
  }

  return { isOffTopic: false };
}
