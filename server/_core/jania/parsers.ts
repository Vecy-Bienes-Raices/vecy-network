/**
 * JanIA Parsers & Extractors - VECY BIENES RAÍCES
 * Funciones de extracción de datos, parsers de moneda/precios colombianos, metrajes,
 * cuotas de administración, teléfonos, nombres y sanitizadores de texto.
 */
import crypto from "crypto";
import { getDb } from "../../db";
import { inmobiliarioLexicon, users } from "../../../drizzle/schema";
import { sql, eq } from "drizzle-orm";
import { parseColombianListing, parseOutdoorAreas, isOutdoorAreaPreceding } from "../../../shared/colombianRealEstateParser";
import { parseStreetCarreraBoundaries } from "../matching";
import { lookupBarriosByPerimeter } from "../geo-lookup";
import {
  brokerDirectoryCache,
  isGenericName,
  extractColombianPhoneFromText,
  normalizeAdvisorPhone,
  isLidIdentifier,
  lookupAdvisorSync,
  saveOrUpdateAdvisor
} from "../advisors";
import { CanonicalBarrioItem } from "./types";
import { COMMON_COLOMBIAN_SURNAMES } from "../nameAndGenderResolver";

export function generarHashMensaje(rawText: string, remitente: string): string {
  const normalizado = (rawText || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
  return crypto.createHash("sha256").update(`${remitente}:${normalizado}`).digest("hex");
}

export function isPhoneNumberNotPrice(val: number | string | null | undefined, rawText?: string): boolean {
  if (val === undefined || val === null || val === "" || val === 0 || val === "0") return false;
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^\d.]/g, ""));
  if (isNaN(num) || num <= 0) return false;

  // Si es un número terminado en miles/millones (múltiplo de 10.000 o 100.000 o termina en 4+ ceros), es un PRECIO o CANON, NUNCA un teléfono
  if (num >= 50_000_000 && num % 100_000 === 0) return false;
  if (num >= 300_000 && num <= 50_000_000 && num % 50_000 === 0) return false;

  const numStr = String(Math.round(num));
  if (numStr.length === 10 && /^3(0[0-5]|1[0-9]|2[0-4]|5[0-1])/.test(numStr) && num % 1_000_000 !== 0) {
    if (rawText && /(?:\$|precio|valor|ppto|presupuesto|canon|hasta|venta)\s*:?\s*\$?\s*3\d{9}/i.test(rawText)) return false;
    return true;
  }
  if (numStr.length === 12 && numStr.startsWith("573") && num % 1_000_000 !== 0) {
    if (rawText && /(?:\$|precio|valor|ppto|presupuesto|canon|hasta|venta)\s*:?\s*\$?\s*573\d{9}/i.test(rawText)) return false;
    return true;
  }
  return false;
}

export const COMMON_FIRST_NAMES = new Set([
  "juan", "ana", "maria", "maría", "jose", "josé", "luis", "carlos", "jorge",
  "victor", "víctor", "sandra", "diana", "laura", "gloria", "eduardo", "flor",
  "esteban", "pedro", "julio", "oscar", "óscar", "angela", "ángela", "pablo",
  "arturo", "alba", "fernanda", "alberto", "david", "manuel", "fernando",
  "alejandro", "andres", "andrés", "felipe", "milena", "patricia", "cristina",
  "beatriz", "isabel", "helena", "elena", "sofia", "sofía", "lucia", "lucía",
  "carolina", "claudia", "marta", "martha", "adriana", "diego", "javier",
  "camilo", "santiago", "alejandra", "paola", "liliana", "elizabeth", "esperanza",
  "yolanda", "blanca", "rosa", "carmen", "teresa", "cecilia", "ines", "inés", "amparo",
  "pilar", "rocio", "rocío", "soraya", "johanna", "yudy", "judy", "tatiana",
  "mateo", "sebastian", "sebastián", "nicolas", "nicolás", "daniel", "cristian",
  "jhon", "john", "alexander", "gustavo", "hernando", "alvaro", "álvaro", "humberto",
  "jaime", "ricardo", "mauricio", "cesar", "césar", "nelson", "ruben", "rubén",
  "ivan", "iván", "wilson", "olga", "luz", "stella", "estela",
  // Nombres compuestos tradicionales colombianos
  "orlando", "guillermo", "enrique", "antonio", "ignacio", "ramiro", "gonzalo",
  "rodrigo", "armando", "alfredo", "eugenio", "gabriel", "dario", "darío",
  "vicente", "francisco", "gerardo", "leonardo", "raul", "raúl", "rafael",
  "alonso", "alfonso", "mercedes", "eugenia", "victoria", "andrea", "daniela",
  "camila", "valentina", "gabriela", "catalina", "juliana", "luciana", "mariana",
  "natalia", "vanessa", "lorena", "viviana", "ximena", "jimena",
  // Nombres adicionales colombianos (femeninos y compuestos)
  "consuelo", "marina", "mery", "dary", "myriam", "miriam", "marcela", "sonia",
  "astrid", "gladys", "nohora", "raquel", "karen", "mabel", "belen", "belén",
  "rosario", "socorro", "fabiola", "dora", "lucero", "yamile", "leidy", "leidys",
  "yeimy", "ingrid", "katherine", "catherine", "stefany", "stephanie", "jeannette",
  "jeanette", "janeth", "janet", "jenny", "jennifer",
  "rosmery", "rosemary", "rosmary", "rosmeri", "rosita", "marleny", "marly", "maryuri", "yurani"
]);

export function extractFirstName(fullName: string): string {
  if (!fullName) return "";
  let clean = fullName.trim();
  if (!clean) return "";

  // WhatsApp format: si contiene tilde (~), extraer lo que está después del tilde:
  // Ej: "@arq.adrypynto ~Arq Adriana Pinto" -> "Arq Adriana Pinto"
  const tildeMatch = clean.match(/~\s*([^~]+)$/);
  if (tildeMatch && tildeMatch[1].trim().length >= 2) {
    clean = tildeMatch[1].trim();
  }

  // Limpiar handles que empiezan con @ seguidos de espacio (ej: "@arq.adrypynto Adriana Pinto")
  clean = clean.replace(/^@[\w\.-]+\s+/i, "");

  // Limpiar sufijos gremiales y comerciales (inmo, realtor, broker, asesor, correo, etc.)
  clean = clean.replace(/\b(inmo|inmobiliaria|inmobiliario|inmobiliarias|realtor|broker|asesor|asesora|asesores|agente|agentes|bienes\s+ra[ií]ces|finca\s+ra[ií]z|consultor|consultora|propiedades|ventas|arriendos|alquileres|independiente|correo|contact|contacto|abogado|abogada|arquitecto|arquitecta|constructora|seguros|lotes)\b.*$/i, "").trim();

  // Si es un número telefónico o contiene indicativos de número, retornar vacío
  if (/^\+?[\d\s-]{6,}$/.test(clean)) return "";

  // Evasión y limpieza de emails
  if (clean.includes("@")) {
    clean = clean.split("@")[0];
  }

  // Quitar números
  clean = clean.replace(/[0-9]/g, "");
  if (!clean.trim()) return "";

  let wordsList = clean.split(/\s+/).map(w => w.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, "")).filter(w => w.length > 0);
  if (wordsList.length === 0 || !wordsList[0]) return "";

  const INVALID_FIRST_NAMES = new Set([
    "hola", "buenas", "buenos", "asesor", "asesora", "agente", "inmobiliaria", "inmobiliario",
    "contacto", "usuario", "desconocido", "admin", "administrador", "broker", "vecy",
    "propiedades", "finca", "raices", "bienes", "consultor", "consultora", "independiente",
    "arq", "arqa", "arquitecto", "arquitecta", "ing", "inga", "ingeniero", "ingeniera",
    "dr", "dra", "doctor", "doctora", "abg", "abga", "abog", "aboga", "abogado", "abogada",
    "lic", "lica", "licenciado", "licenciada", "econ", "cont", "cp", "prof"
  ]);

  // Si la primera palabra es un título o saludo (ej: "Agente Karina", "Asesor Carlos", "Arq Adriana", "Hola"):
  while (wordsList.length > 1 && INVALID_FIRST_NAMES.has(wordsList[0].toLowerCase())) {
    wordsList = wordsList.slice(1);
  }

  const filteredWords = wordsList;
  if (filteredWords.length === 0 || !filteredWords[0]) return "";

  const w1 = filteredWords[0].toLowerCase();
  const w2 = filteredWords[1] ? filteredWords[1].toLowerCase() : "";

  // Si hay al menos dos palabras y ambas están en la lista de nombres comunes, es un nombre compuesto
  if (w2 && COMMON_FIRST_NAMES.has(w1) && COMMON_FIRST_NAMES.has(w2) && !INVALID_FIRST_NAMES.has(w2)) {
    const first = filteredWords[0].charAt(0).toUpperCase() + filteredWords[0].slice(1).toLowerCase();
    const second = filteredWords[1].charAt(0).toUpperCase() + filteredWords[1].slice(1).toLowerCase();
    return `${first} ${second}`;
  }

  // Caso Apellido + Nombre invertido (ej. "Luna Rosmery", "Pérez Carlos", "Gómez Diana")
  if (w2 && COMMON_COLOMBIAN_SURNAMES.has(w1) && !COMMON_COLOMBIAN_SURNAMES.has(w2) && !INVALID_FIRST_NAMES.has(w2)) {
    return filteredWords[1].charAt(0).toUpperCase() + filteredWords[1].slice(1).toLowerCase();
  }

  // Si el primer nombre es largo/compuesto por concatenación de email (ej: "dianapaolap"),
  // ver si empieza con un nombre común de al menos 4 letras
  const firstWordLower = w1;
  for (const commonName of COMMON_FIRST_NAMES) {
    if (commonName.length >= 4 && firstWordLower.startsWith(commonName)) {
      return commonName.charAt(0).toUpperCase() + commonName.slice(1).toLowerCase();
    }
  }

  const candidate = filteredWords[0].charAt(0).toUpperCase() + filteredWords[0].slice(1).toLowerCase();

  // Si el candidato resultante es un saludo o genérico inválido, retornar vacío
  if (INVALID_FIRST_NAMES.has(candidate.toLowerCase())) {
    return "";
  }

  // Si el candidato único es un apellido (ej. "Luna", "Pérez", "Gómez"), no usarlo como vocativo a secas
  if (filteredWords.length === 1 && COMMON_COLOMBIAN_SURNAMES.has(candidate.toLowerCase())) {
    return "";
  }

  // Filtro anti-iniciales en nombres (Regla Doctrinal v33.4.1):
  // Si el nombre extraído tiene <= 3 caracteres y NO está en COMMON_FIRST_NAMES
  // o carece de vocales normales (ej. "Atb", "Jmr", "Xyz"), retorna "" para vocativo neutro.
  if (candidate.length <= 3) {
    const candLower = candidate.toLowerCase();
    const isCommon = COMMON_FIRST_NAMES.has(candLower);
    const hasVowels = /[aeiouáéíóú]/i.test(candidate);
    if (!isCommon || !hasVowels) {
      return "";
    }
  }

  return candidate;
}

export function getColombiaHour(): number {
  const utc = Date.now() + (new Date().getTimezoneOffset() * 60000);
  const colTime = new Date(utc + (3600000 * -5));
  return colTime.getHours();
}

export function getGreetingByTime(): string {
  const hour = getColombiaHour();
  if (hour >= 6 && hour < 12) {
    return "Buenos días";
  } else if (hour >= 12 && hour < 18) {
    return "Buenas tardes";
  } else {
    return "Buenas noches";
  }
}

/**
 * Repara comillas dobles no escapadas dentro de strings JSON generados por LLMs (ej: La mención de "Honorarios 50/50" indica...)
 */
export function cleanUnescapedQuotesInJSON(content: string): string {
  const lines = content.split("\n");
  const cleanedLines = lines.map(line => {
    // Coincidencia con clave-valor donde el valor es un string: "key": "valor con "comillas" internas",
    const kvMatch = line.match(/^(\s*"[^"]+"\s*:\s*)"([\s\S]*)"(\s*,?\s*)$/);
    if (kvMatch) {
      const prefix = kvMatch[1];
      const val = kvMatch[2];
      const suffix = kvMatch[3];
      const fixedVal = val.replace(/(^|[^\\])(")/g, '$1\\"');
      return `${prefix}"${fixedVal}"${suffix}`;
    }
    // Coincidencia con elemento de array string: "valor con "comillas"",
    const arrValMatch = line.match(/^(\s*)"([\s\S]*)"(\s*,?\s*)$/);
    if (arrValMatch && !line.includes(":")) {
      const prefix = arrValMatch[1];
      const val = arrValMatch[2];
      const suffix = arrValMatch[3];
      const fixedVal = val.replace(/(^|[^\\])(")/g, '$1\\"');
      return `${prefix}"${fixedVal}"${suffix}`;
    }
    return line;
  });
  return cleanedLines.join("\n");
}

export function parseSafeJSON(content: string): any {
  let text = content.trim();
  // Strip markdown code fences
  if (text.startsWith("```json")) text = text.substring(7);
  else if (text.startsWith("```")) text = text.substring(3);
  if (text.endsWith("```")) text = text.substring(0, text.length - 3);
  text = text.trim();

  // 1. Intentar parseo directo
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in content");

  const lastClose = text.lastIndexOf("}");

  // 2. Si hay llaves de cierre, intentar parseo normal
  if (lastClose > start) {
    const extracted = text.substring(start, lastClose + 1);
    try { return JSON.parse(extracted); } catch (_) { }

    // 2.5 Reparar comillas internas sin escapar en valores de texto generados por el LLM
    try {
      const cleaned = cleanUnescapedQuotesInJSON(extracted);
      return JSON.parse(cleaned);
    } catch (_) { }
  }

  // 3. JSON truncado — reparar usando máquina de estados
  const partial = text.substring(start);
  const repaired = repairJSON(partial);
  try { return JSON.parse(repaired); } catch (_) { }

  // 3.5 Intentar reparar con limpieza de comillas sobre el JSON reparado
  try {
    const cleanedRepaired = cleanUnescapedQuotesInJSON(repaired);
    return JSON.parse(cleanedRepaired);
  } catch (_) { }

  throw new Error("Could not parse or repair JSON from LLM output");
}

/**
 * Repara JSON truncado (típico cuando Gemini alcanza el límite de tokens).
 * Usa máquina de estados para rastrear strings, objetos y arrays abiertos.
 */
export function repairJSON(partial: string): string {
  let inString = false;
  let escape = false;
  const stack: string[] = [];
  let i = 0;
  let lastValidNonStringPos = 0; // Última posición fuera de un string

  for (; i < partial.length; i++) {
    const ch = partial[i];

    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }

    if (ch === '"') {
      inString = !inString;
      if (!inString) lastValidNonStringPos = i;
      continue;
    }

    if (inString) continue;

    lastValidNonStringPos = i;

    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') {
      if (stack.length > 0) stack.pop();
    }
  }

  // Si terminamos dentro de un string (truncado a mitad de valor), truncar el campo
  let result = partial;
  if (inString) {
    // Cortar desde el inicio del string truncado
    const lastQuote = partial.lastIndexOf('"', i - 1);
    // Buscar hacia atrás la clave (para eliminar el campo incompleto)
    let cutPoint = lastQuote;
    // Buscar la coma anterior para eliminar el campo completo si existe
    const prevComma = partial.lastIndexOf(',', lastQuote - 1);
    if (prevComma !== -1) {
      cutPoint = prevComma;
    }
    result = partial.substring(0, cutPoint);
  }

  // Eliminar trailing commas y espacios
  result = result.trimEnd().replace(/,\s*$/, '');

  // Cerrar stack pendiente (de adentro hacia afuera)
  for (let j = stack.length - 1; j >= 0; j--) {
    result += stack[j] === '{' ? '}' : ']';
  }

  return result;
}

export function getColombiaNow(): Date {
  const now = new Date();
  return new Date(now.getTime() - (5 * 60 * 60 * 1000));
}

export function hasRealEstateTextKeyword(cleanText: string): boolean {
  const text = cleanText.toLowerCase();
  return text.includes("apto") ||
    text.includes("apartamento") ||
    text.includes("casa") ||
    text.includes("bodega") ||
    text.includes("oficina") ||
    text.includes("local") ||
    text.includes("locales") ||
    text.includes("cabaña") ||
    text.includes("cabañas") ||
    text.includes("lote") ||
    text.includes("finca") ||
    text.includes("habs") ||
    text.includes("alcoba") ||
    text.includes("m2") ||
    text.includes("mts") ||
    text.includes("requerimiento");
}

export function buildFlyerBreakdownText(extracted: any, fallbackText?: string): string {
  if (!extracted) return fallbackText || "";
  const parts: string[] = [];

  // 1. Encabezado o texto transcrito del flyer
  if (fallbackText && fallbackText.trim() !== "" && !fallbackText.includes("[Publicación de Imagen")) {
    parts.push(fallbackText.trim());
  } else if (extracted.title) {
    parts.push(`📌 ${extracted.title}`);
  }

  if (extracted.description && extracted.description.trim() !== "" && !extracted.description.includes("[Publicación de Imagen") && (!fallbackText || !fallbackText.includes(extracted.description.trim()))) {
    parts.push(extracted.description.trim());
  }

  // 2. Ficha técnica estructurada
  const specs: string[] = [];
  const pVal = extracted.price || extracted.presupuestoMax;
  if (pVal && Number(pVal) > 0) {
    specs.push(`💰 Precio/Presupuesto: $${Number(pVal).toLocaleString('es-CO')}`);
  }
  if (extracted.rentPrice && Number(extracted.rentPrice) > 0) {
    specs.push(`💰 Canon Arriendo: $${Number(extracted.rentPrice).toLocaleString('es-CO')}`);
  }
  if (extracted.adminFee && Number(extracted.adminFee) > 0) {
    specs.push(`🏢 Administración: $${Number(extracted.adminFee).toLocaleString('es-CO')}`);
  }
  if (extracted.area && Number(extracted.area) > 0) {
    specs.push(`📐 Área: ${extracted.area} m²`);
  } else if (extracted.areaMin && Number(extracted.areaMin) > 0) {
    specs.push(`📐 Área Mínima: ${extracted.areaMin} m²`);
  }
  if (extracted.bedrooms || extracted.rooms || extracted.habitacionesMin) {
    specs.push(`🛏️ ${extracted.bedrooms || extracted.rooms || extracted.habitacionesMin} Habitaciones`);
  }
  if (extracted.bathrooms || extracted.baths || extracted.banosMin) {
    specs.push(`🚿 ${extracted.bathrooms || extracted.baths || extracted.banosMin} Baños`);
  }
  if (extracted.garages || extracted.parqueaderosMin) {
    specs.push(`🚗 ${extracted.garages || extracted.parqueaderosMin} Parqueaderos`);
  }
  const zone = extracted.zone || extracted.zonaDeseada || extracted.addressNeighborhood;
  if (zone) {
    specs.push(`📍 Sector: ${zone}`);
  }
  const city = extracted.city || extracted.ciudadDeseada || extracted.addressCity;
  if (city) {
    specs.push(`🏙️ Ciudad: ${city}`);
  }
  if (extracted.contactPhone || extracted.telefonoContacto) {
    specs.push(`📞 Contacto Broker: ${extracted.contactPhone || extracted.telefonoContacto}`);
  }

  if (specs.length > 0) {
    parts.push(`📋 Ficha Técnica Extraída de Flyer / Banner:\n• ` + specs.join('\n• '));
  }

  if (parts.length > 0) return parts.join('\n\n');
  return fallbackText || "[Publicación Comercial Inmobiliaria desde Imagen / Flyer]";
}

export function parseColombianPriceOrBudget(numStr: string, unit: string, isSale: boolean): number {
  if (!numStr) return 0;
  const cleanStr = (numStr || "").trim().replace(/[$COPcop'´`’‘\u00B4\u2019\u2018*\s\u2060\u200B\u200C\u200D\uFEFF\u00A0\u200E\u200F\u2028\u2029]/g, "");
  const cleanUnit = (unit || "").toLowerCase();

  if (cleanUnit.includes("mil millon")) {
    const v = parseFloat(cleanStr.replace(",", "."));
    return Math.round(v * 1_000_000_000);
  }

  // Si tiene formato de número completo colombiano con puntos (ej: "3.800.000", "2.900.000", "1.390.000.000", "1450.000.000")
  if (/^\d{1,4}(?:\.\d{3}){2,4}$/.test(cleanStr)) {
    const parsed = parseInt(cleanStr.replace(/\./g, ""), 10);
    return parsed;
  }

  // Si tiene formato de miles con punto o coma (ej: "2.100", "1.390", "1.300", "1,800", "3.500")
  if (/^\d{1,3}[.,]\d{3}$/.test(cleanStr)) {
    const n = parseInt(cleanStr.replace(/[.,]/g, ""), 10);
    if (!isSale) {
      return n * 1_000; // 3800 -> 3.800.000 COP en arriendo
    }
    return n * 1_000_000; // 1800 * 1M = 1.800.000.000 COP en venta
  }

  let val = parseFloat(cleanStr.replace(",", "."));
  if (isNaN(val)) return 0;

  if (cleanUnit.includes("millon") || cleanUnit.includes("millón") || cleanUnit.includes("mll") || cleanUnit.includes("mill") || cleanUnit.includes("mm") || cleanUnit === "m") {
    if (!isSale) {
      if (val <= 100 && val > 0) {
        return Math.round(val * 1_000_000); // 3.8 mm -> 3.800.000 COP arriendo
      }
      if (val > 100 && val < 100_000) {
        return Math.round(val * 1_000); // 3800 -> 3.800.000 COP
      }
      return Math.round(val);
    }
    // Venta: En Colombia si dicen "1450 millones", "540 millones" o "980 m", se multiplica por 1_000_000.
    // 🛡️ NUNCA multiplicar un entero < 30 por 1.000.000.000 (previene transformar 15 años o 15M en 15 mil millones)
    if (val < 10 && val > 0 && (cleanStr.includes(".") || cleanStr.includes(","))) {
      // Solo decimales tipo 1.5, 2.3 millones en venta equivalen a 1.500M / 2.300M
      return Math.round(val * 1_000_000_000);
    }
    if (val >= 10 && val < 100 && isSale) {
      // Taquigrafía tipo 49mm -> 490M
      return Math.round(val * 10_000_000);
    }
    return Math.round(val * 1_000_000);
  }

  if (val < 10000) {
    if (!isSale) return Math.round(val * 1_000);
    if (val >= 100) return Math.round(val * 1_000_000);
  }
  if (isSale && val >= 300_000 && val <= 30_000_000) {
    return Math.round(val * 1_000);
  }
  return Math.round(val);
}

// ─── Cache en memoria de extracción determinista (v31.77) ──────────────────
export const fallbackDataCache = new Map<string, any>();

export const KNOWN_BARRIOS_SORTED_ITEMS: CanonicalBarrioItem[] = [
  // ── BOGOTÁ D.C. ──
  { canonical: "Santa Bárbara Occidental", city: "Bogotá, D.C." },
  { canonical: "Santa Bárbara Oriental", city: "Bogotá, D.C." },
  { canonical: "Santa Bárbara Central", city: "Bogotá, D.C." },
  { canonical: "Santa Bárbara Alta", city: "Bogotá, D.C." },
  { canonical: "Santa Bárbara", city: "Bogotá, D.C." },
  { canonical: "Santa Ana Occidental", city: "Bogotá, D.C." },
  { canonical: "Santa Ana Oriental", city: "Bogotá, D.C." },
  { canonical: "Santa Ana Alta", city: "Bogotá, D.C." },
  { canonical: "Santa Ana Central", city: "Bogotá, D.C." },
  { canonical: "Santa Ana", city: "Bogotá, D.C." },
  { canonical: "San Cristóbal Norte", city: "Bogotá, D.C." },
  { canonical: "La Alameda", city: "Bogotá, D.C." },
  { canonical: "San Antonio Norte", city: "Bogotá, D.C." },
  { canonical: "Villa Magdala", city: "Bogotá, D.C." },
  { canonical: "Chicó Reservado", city: "Bogotá, D.C." },
  { canonical: "Chicó Norte", city: "Bogotá, D.C." },
  { canonical: "Chicó Navarra", city: "Bogotá, D.C." },
  { canonical: "Rincón del Chicó", city: "Bogotá, D.C." },
  { canonical: "El Chicó", city: "Bogotá, D.C." },
  { canonical: "Chicó", city: "Bogotá, D.C." },
  { canonical: "Santa Paula", city: "Bogotá, D.C." },
  { canonical: "Santa Bibiana", city: "Bogotá, D.C." },
  { canonical: "San Patricio", city: "Bogotá, D.C." },
  { canonical: "Santa Teresa", city: "Bogotá, D.C." },
  { canonical: "La Cabrera", city: "Bogotá, D.C." },
  { canonical: "Cabrera", city: "Bogotá, D.C." },
  { canonical: "Los Rosales Alto", city: "Bogotá, D.C." },
  { canonical: "Rosales Alto", city: "Bogotá, D.C." },
  { canonical: "Los Rosales Bajo", city: "Bogotá, D.C." },
  { canonical: "Rosales Bajo", city: "Bogotá, D.C." },
  { canonical: "Los Rosales", city: "Bogotá, D.C." },
  { canonical: "Rosales", city: "Bogotá, D.C." },
  { canonical: "El Nogal", city: "Bogotá, D.C." },
  { canonical: "Nogal", city: "Bogotá, D.C." },
  { canonical: "El Virrey", city: "Bogotá, D.C." },
  { canonical: "El Retiro", city: "Bogotá, D.C." },
  { canonical: "El Refugio", city: "Bogotá, D.C." },
  { canonical: "Refugio", city: "Bogotá, D.C." },
  { canonical: "Quinta Camacho", city: "Bogotá, D.C." },
  { canonical: "Antiguo Country", city: "Bogotá, D.C." },
  { canonical: "Country Club", city: "Bogotá, D.C." },
  { canonical: "La Calleja", city: "Bogotá, D.C." },
  { canonical: "Calleja Alta", city: "Bogotá, D.C." },
  { canonical: "Calleja Baja", city: "Bogotá, D.C." },
  { canonical: "La Carolina", city: "Bogotá, D.C." },
  { canonical: "Bosque Medina", city: "Bogotá, D.C." },
  { canonical: "El Contador", city: "Bogotá, D.C." },
  { canonical: "Alcalá", city: "Bogotá, D.C." },
  { canonical: "Belmira", city: "Bogotá, D.C." },
  { canonical: "La Castellana", city: "Bogotá, D.C." },
  { canonical: "Polo Club", city: "Bogotá, D.C." },
  { canonical: "San Felipe", city: "Bogotá, D.C." },
  { canonical: "Emaús", city: "Bogotá, D.C." },
  { canonical: "Colina Campestre", city: "Bogotá, D.C." },
  { canonical: "Ciudad Jardín Norte", city: "Bogotá, D.C." },
  { canonical: "Ciudad Jardín Sur", city: "Bogotá, D.C." },
  { canonical: "Álamos Norte", city: "Bogotá, D.C." },
  { canonical: "Álamos Sur", city: "Bogotá, D.C." },
  { canonical: "La Candelaria Centro", city: "Bogotá, D.C." },
  { canonical: "Candelaria la Nueva", city: "Bogotá, D.C." },
  { canonical: "Candelaria Sur", city: "Bogotá, D.C." },
  { canonical: "La Candelaria", city: "Bogotá, D.C." },
  { canonical: "Nuevo Country", city: "Bogotá, D.C." },
  { canonical: "Niza Norte", city: "Bogotá, D.C." },
  { canonical: "Niza Antigua", city: "Bogotá, D.C." },
  { canonical: "Niza", city: "Bogotá, D.C." },
  { canonical: "Sotileza", city: "Bogotá, D.C." },
  { canonical: "Bella Suiza", city: "Bogotá, D.C." },
  { canonical: "Lisboa", city: "Bogotá, D.C." },
  { canonical: "Alejandría", city: "Bogotá, D.C." },
  { canonical: "Carmel Club", city: "Bogotá, D.C." },
  { canonical: "Cantalejo", city: "Bogotá, D.C." },
  { canonical: "Sotavento", city: "Bogotá, D.C." },
  { canonical: "San José de Bavaria", city: "Bogotá, D.C." },
  { canonical: "Chapinero Alto", city: "Bogotá, D.C." },
  { canonical: "Chapinero Central", city: "Bogotá, D.C." },
  { canonical: "Chapinero", city: "Bogotá, D.C." },
  { canonical: "Cedritos", city: "Bogotá, D.C." },
  { canonical: "Los Cedros", city: "Bogotá, D.C." },
  { canonical: "Toberín", city: "Bogotá, D.C." },
  { canonical: "Mazurén", city: "Bogotá, D.C." },
  { canonical: "Mirandela", city: "Bogotá, D.C." },
  { canonical: "Portales del Norte", city: "Bogotá, D.C." },
  { canonical: "Victoria Norte", city: "Bogotá, D.C." },
  { canonical: "Prado Veraniego", city: "Bogotá, D.C." },
  { canonical: "La Floresta", city: "Bogotá, D.C." },
  { canonical: "Pontevedra", city: "Bogotá, D.C." },
  { canonical: "Morato", city: "Bogotá, D.C." },
  { canonical: "Alhambra", city: "Bogotá, D.C." },
  { canonical: "La Alhambra", city: "Bogotá, D.C." },
  { canonical: "Batán", city: "Bogotá, D.C." },
  { canonical: "Pasadena", city: "Bogotá, D.C." },
  { canonical: "Ciudad Salitre", city: "Bogotá, D.C." },
  { canonical: "Modelia", city: "Bogotá, D.C." },
  { canonical: "Hayuelos", city: "Bogotá, D.C." },
  { canonical: "Fontibón", city: "Bogotá, D.C." },
  { canonical: "Nicolás de Federmann", city: "Bogotá, D.C." },
  { canonical: "La Esmeralda", city: "Bogotá, D.C." },
  { canonical: "Quinta Paredes", city: "Bogotá, D.C." },
  { canonical: "Palermo", city: "Bogotá, D.C." },
  { canonical: "Teusaquillo", city: "Bogotá, D.C." },
  { canonical: "Usaquén", city: "Bogotá, D.C." },

  // ── MEDELLÍN Y ÁREA METROPOLITANA ──
  { canonical: "El Poblado", city: "Medellín" },
  { canonical: "Altos del Poblado", city: "Medellín" },
  { canonical: "Castropol", city: "Medellín" },
  { canonical: "Provenza", city: "Medellín" },
  { canonical: "Manila", city: "Medellín" },
  { canonical: "Patio Bonito", city: "Medellín" },
  { canonical: "San Lucas", city: "Medellín" },
  { canonical: "Los Balsos", city: "Medellín" },
  { canonical: "Los Naranjos", city: "Medellín" },
  { canonical: "El Tesoro", city: "Medellín" },
  { canonical: "Laureles", city: "Medellín" },
  { canonical: "Estadio", city: "Medellín" },
  { canonical: "Conquistadores", city: "Medellín" },
  { canonical: "Suramericana", city: "Medellín" },
  { canonical: "Carlos E. Restrepo", city: "Medellín" },
  { canonical: "San Javier", city: "Medellín" },
  { canonical: "Comuna 13", city: "Medellín" },
  { canonical: "Belén", city: "Medellín" },
  { canonical: "Belén Rincón", city: "Medellín" },
  { canonical: "Loma de Los Bernal", city: "Medellín" },
  { canonical: "La Mota", city: "Medellín" },
  { canonical: "La América", city: "Medellín" },
  { canonical: "Calasanz", city: "Medellín" },
  { canonical: "Robledo", city: "Medellín" },
  { canonical: "Pilarica", city: "Medellín" },
  { canonical: "Castilla", city: "Medellín" },
  { canonical: "Aranjuez", city: "Medellín" },
  { canonical: "Manrique", city: "Medellín" },
  { canonical: "Buenos Aires", city: "Medellín" },
  { canonical: "Guayabal", city: "Medellín" },
  { canonical: "Prado", city: "Medellín" },
  { canonical: "Envigado", city: "Envigado" },
  { canonical: "Sabaneta", city: "Sabaneta" },
  { canonical: "Itagüí", city: "Itagüí" },
  { canonical: "La Estrella", city: "La Estrella" },
  { canonical: "Bello", city: "Bello" },
  { canonical: "Rionegro", city: "Rionegro" },
  { canonical: "La Ceja", city: "La Ceja" },
  { canonical: "El Retiro", city: "El Retiro" },

  // ── CALI Y VALLE DEL CAUCA ──
  { canonical: "Ciudad Jardín", city: "Cali" },
  { canonical: "San Antonio", city: "Cali" },
  { canonical: "Granada", city: "Cali" },
  { canonical: "Pance", city: "Cali" },
  { canonical: "Valle del Lili", city: "Cali" },
  { canonical: "El Caney", city: "Cali" },
  { canonical: "Bochalema", city: "Cali" },
  { canonical: "Ciudad Meléndez", city: "Cali" },
  { canonical: "El Peñón", city: "Cali" },
  { canonical: "Juanambú", city: "Cali" },
  { canonical: "Santa Mónica", city: "Cali" },
  { canonical: "La Flora", city: "Cali" },
  { canonical: "Chipichape", city: "Cali" },
  { canonical: "Menga", city: "Cali" },
  { canonical: "San Fernando", city: "Cali" },
  { canonical: "Tequendama", city: "Cali" },
  { canonical: "Imbanaco", city: "Cali" },
  { canonical: "Versalles", city: "Cali" },
  { canonical: "San Cayetano", city: "Cali" },
  { canonical: "Centenario", city: "Cali" },
  { canonical: "Miraflores", city: "Cali" },
  { canonical: "Santa Teresita", city: "Cali" },
  { canonical: "Cristales", city: "Cali" },
  { canonical: "Bellavista", city: "Cali" },
  { canonical: "Limonar", city: "Cali" },
  { canonical: "El Limonar", city: "Cali" },
  { canonical: "Ciudad Capri", city: "Cali" },
  { canonical: "Ingenio", city: "Cali" },
  { canonical: "Santa Anita", city: "Cali" },
  { canonical: "Meléndez", city: "Cali" },
  { canonical: "Juanchito", city: "Cali" },
  { canonical: "Jamundí", city: "Jamundí" },
  { canonical: "Yumbo", city: "Yumbo" },
  { canonical: "Palmira", city: "Palmira" },

  // ── BARRANQUILLA Y ATLÁNTICO ──
  { canonical: "Altos de Riomar", city: "Barranquilla" },
  { canonical: "Barrio Abajo", city: "Barranquilla" },
  { canonical: "Alto Prado", city: "Barranquilla" },
  { canonical: "El Prado", city: "Barranquilla" },
  { canonical: "Villa Santos", city: "Barranquilla" },
  { canonical: "Buenavista", city: "Barranquilla" },
  { canonical: "Riomar", city: "Barranquilla" },
  { canonical: "Villa Carolina", city: "Barranquilla" },
  { canonical: "Villa Campestre", city: "Puerto Colombia" },
  { canonical: "El Golf", city: "Barranquilla" },
  { canonical: "Villa Country", city: "Barranquilla" },
  { canonical: "El Limón", city: "Barranquilla" },
  { canonical: "Paraíso", city: "Barranquilla" },
  { canonical: "Bellavista", city: "Barranquilla" },
  { canonical: "Betania", city: "Barranquilla" },
  { canonical: "Delicias", city: "Barranquilla" },
  { canonical: "El Recreo", city: "Barranquilla" },
  { canonical: "Centro Histórico", city: "Barranquilla" },
  { canonical: "Miramar", city: "Barranquilla" },
  { canonical: "Simón Bolívar", city: "Barranquilla" },
  { canonical: "Las Nieves", city: "Barranquilla" },
  { canonical: "Rebolo", city: "Barranquilla" },
  { canonical: "Soledad", city: "Soledad" },
  { canonical: "Puerto Colombia", city: "Puerto Colombia" },

  // ── CARTAGENA ──
  { canonical: "Bocagrande", city: "Cartagena" },
  { canonical: "Castillogrande", city: "Cartagena" },
  { canonical: "El Laguito", city: "Cartagena" },
  { canonical: "Manga", city: "Cartagena" },
  { canonical: "Crespo", city: "Cartagena" },
  { canonical: "Marbella", city: "Cartagena" },
  { canonical: "Pie de la Popa", city: "Cartagena" },
  { canonical: "Getsemaní", city: "Cartagena" },
  { canonical: "Serena del Mar", city: "Cartagena" },
  { canonical: "Cielo Mar", city: "Cartagena" },
  { canonical: "Los Morros", city: "Cartagena" },

  // ── BUCARAMANGA Y METROPOLITANA ──
  { canonical: "Cabecera del Llano", city: "Bucaramanga" },
  { canonical: "Cabecera", city: "Bucaramanga" },
  { canonical: "Sotomayor", city: "Bucaramanga" },
  { canonical: "Cañaveral", city: "Floridablanca" },
  { canonical: "Ruitoque Condominio", city: "Floridablanca" },
  { canonical: "Ruitoque", city: "Floridablanca" },
  { canonical: "Real de Minas", city: "Bucaramanga" },
  { canonical: "Floridablanca", city: "Floridablanca" },
  { canonical: "Piedecuesta", city: "Piedecuesta" },
  { canonical: "Girón", city: "Girón" },

  // ── SANTA MARTA ──
  { canonical: "El Rodadero", city: "Santa Marta" },
  { canonical: "Pozos Colorados", city: "Santa Marta" },
  { canonical: "Bello Horizonte", city: "Santa Marta" },
  { canonical: "Playa Dormida", city: "Santa Marta" },
  { canonical: "Taganga", city: "Santa Marta" },

  // ── EJE CAFETERO ──
  { canonical: "Pinares", city: "Pereira" },
  { canonical: "Cerritos", city: "Pereira" },
  { canonical: "Circunvalar", city: "Pereira" },
  { canonical: "Dosquebradas", city: "Dosquebradas" },
  { canonical: "Palermo", city: "Manizales" },
  { canonical: "El Cable", city: "Manizales" }
].map(item => ({
  canonical: item.canonical,
  lower: item.canonical.toLowerCase(),
  city: item.city
})).sort((a, b) => b.lower.length - a.lower.length);

export function extractFallbackDataFromText(text: string): any {
  if (!text || typeof text !== "string") return {};
  const cacheKey = text.trim();
  if (cacheKey.length < 5000 && fallbackDataCache.has(cacheKey)) {
    return fallbackDataCache.get(cacheKey);
  }

  const clean = (text || "")
    .toLowerCase()
    .replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0\u200E\u200F\u2028\u2029]/g, "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/['´`’‘\u00B4\u2019\u2018]/g, ".")
    .replace(/[*_~]/g, "")
    .replace(/[\t ]+/g, " ");

  let transactionType = "venta";
  const isInvestorPurchase = /\b(?:inversionista|inversionistas|para inversi[oó]n|para inversion|rentando|est[eé] rentando|est[eé]n rentando|ojal[aá] rentando|ya rentando|generando renta|produciendo renta|con renta activa|para compra|compro|compra ya|busco para compra)\b/i.test(clean);
  const hasPermutaSignals = /\b(?:permuto|permuta|permutas|permutamos|se permuta|recibo menor valor|recibo inmueble|recibo vehículo|recibo vehiculo|pelo a pelo|encime|parte de pago)\b/i.test(clean);
  const hasRentSignals = !isInvestorPurchase && (
    /\b(?:arriendo|arriendos|arrendar|arrendamos|se arrienda|arriendan|alquilo|alquilar|alquilamos|se alquila|alquiler|alquileres|rento|rentar|se renta|en renta|para renta|busca para renta|canon|canones|cánones|amoblado|amoblada|sin amoblar|arrendatario|arrendador|inquilino)\b/i.test(clean)
    || /\b(?:para tomar ya|tomar ya|toma ya|para tomar de inmediato|toma inmediata|toma de inmediato|para tomar|para alquilar|para arrendar|en arriendo)\b/i.test(clean)
    || /\b(?:incluida|incluido|inc)\b/i.test(clean)
    || /(?:incluida|con|\+|más|mas)\s*(?:administraci[oó]n|admon)/i.test(clean)
    || /(?:administraci[oó]n|admon)\s*(?:incluida|adicional)/i.test(clean)
    || /valor arriendo/i.test(clean)
    // Cifra típica de canon mensual colombiano ($300k a $25M) sin palabras de compra o venta
    || (/\$\s*([1-9]\d{0,1}(?:[.\s']\d{3}){1,2})\b/.test(clean) && !/\b(?:compra|compro|comprador|compran|venta|vendo|vende|millones|millon|mm|mll)\b/i.test(clean))
  );

  if (hasPermutaSignals) {
    transactionType = clean.includes("venta") || isInvestorPurchase ? "venta_permuta" : "permuta";
  } else if (hasRentSignals && (clean.includes("venta") || clean.includes("valor venta") || clean.includes("precio de venta")) && (clean.includes("arriendo") || clean.includes("valor arriendo") || clean.includes("canon"))) {
    transactionType = "venta_o_arriendo";
  } else if (hasRentSignals && !clean.includes("compro") && !clean.includes("para compra") && !clean.includes("en compra") && !clean.includes("en venta") && !clean.includes("venta") && !isInvestorPurchase) {
    transactionType = "arriendo";
  } else {
    transactionType = "venta";
  }

  let propertyType = "apartment";
  if ((clean.includes("consultorio") || clean.includes("consultorios") || clean.includes("odontol") || clean.includes("médic") || clean.includes("medic")) && !clean.includes("apartamento") && !clean.includes("apto") && !clean.includes("casa")) {
    propertyType = "consultorio";
  } else if ((clean.includes("oficina") || clean.includes("oficinas") || clean.includes("office")) && !clean.includes("home office") && !clean.includes("apartamento") && !clean.includes("apto") && !clean.includes("casa")) {
    propertyType = "office";
  } else if ((clean.includes("local comercial") || clean.includes("locales comerciales") || clean.includes("local") || clean.includes("locales") || clean.includes("comercial") || clean.includes("commercial")) && !clean.includes("apartamento") && !clean.includes("apto") && !clean.includes("casa") && !clean.includes("centro comercial") && !clean.includes("centros comerciales")) {
    propertyType = "commercial";
  } else if (clean.includes("bodega") || clean.includes("bodegas") || clean.includes("warehouse")) {
    propertyType = "warehouse";
  } else if (clean.includes("casalote") || clean.includes("lote") || clean.includes("terreno") || clean.includes("predio") || clean.includes("land")) {
    propertyType = "land";
  } else if (clean.includes("casa") || clean.includes("townhouse") || clean.includes("chalet")) {
    propertyType = "house";
  } else if (clean.includes("cabaña") || clean.includes("cabana") || clean.includes("cabañas") || clean.includes("cabanas") || clean.includes("cabin")) {
    propertyType = "cabin";
  } else if (clean.includes("finca") || clean.includes("campestre") || clean.includes("farm")) {
    propertyType = "farm";
  } else if (clean.includes("edificio") || clean.includes("building")) {
    propertyType = "building";
  } else if (clean.includes("hotel") || clean.includes("hostal") || clean.includes("hostel")) {
    propertyType = "hotel";
  } else if (clean.includes("apartaestudio") || clean.includes("apartasuite") || clean.includes("loft")) {
    propertyType = "loft";
  } else {
    propertyType = "apartment";
  }

  let price = 0;
  let presupuestoMin = 0;
  let presupuestoMax = 0;
  let rentPrice = 0;
  let adminFee = 0;

  // 1. Cuota de Administración (ej: "-ADMÓN: $1.471.000", "Administración: $1´425.000", "Adm $2.056.503", "Admon $825.000")
  // 1A. Prefijo con soporte de viñetas y guiones (-admón:, -admon:, etc.)
  const adminMatch = clean.match(/(?:^|[-•*#\s])(?:v\s*[\/\-]\s*)?(?:adm[oó]n|admon|administraci[oó]n|administ|admin|cta\s*adm[oó]n|cuota\s*adm[oó]n)\s*(?:m[aá]xima|max|hasta|tope|no\s*mayor\s*a|no\s*superior\s*a|l[ií]mite)?\s*[:\/\-=\s]?\s*(?:aprox\.?)?\s*\$?\s*([\d.]+)(?:\s*mil\b|\s*k\b)?/i);
  if (adminMatch) {
    let rawANum = parseFloat(adminMatch[1].replace(/\./g, ''));
    if (rawANum >= 100 && rawANum < 10_000) {
      rawANum = rawANum * 1000;
    }
    if (!isNaN(rawANum) && rawANum >= 10_000 && rawANum <= 30_000_000 && !isPhoneNumberNotPrice(rawANum, text)) {
      adminFee = rawANum;
    }
  }
  // 1B. Sufijo: "$ 575.000 admón", "$1.175.000 administración"
  if (adminFee === 0) {
    const adminSuffixMatch = clean.match(/\$?\s*([\d.]+)\s*(?:mil\b|\s*k\b)?\s*[:\/\-=\s]?\s*(?:adm|admon|admón|administraci[oó]n|administ|admin)\b/i);
    if (adminSuffixMatch) {
      const rawANum = parseFloat(adminSuffixMatch[1].replace(/\./g, ''));
      if (!isNaN(rawANum) && rawANum >= 10_000 && rawANum <= 30_000_000 && !isPhoneNumberNotPrice(rawANum, text)) {
        adminFee = rawANum;
      }
    }
  }
  if (adminFee === 0) {
    const adminMilMatch = clean.match(/(?:^|[-•*#\s])(?:admon|adm[oó]n|adm|admin|cuota)\s*[:\/\-=\s]?\s*\$?\s*(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:mil|k)\b/i);
    if (adminMilMatch) {
      const numParsed = parseFloat(adminMilMatch[1].replace(',', '.'));
      if (!isNaN(numParsed) && numParsed >= 20 && numParsed <= 15000) {
        const calculatedFee = Math.round(numParsed * 1000);
        if (calculatedFee >= 50_000 && calculatedFee <= 15_000_000) {
          adminFee = calculatedFee;
        }
      }
    }
  }

  // 2. Canon de Arriendo Explícito (ej: "CANON $11'500.000", "CANON DE ARRIENDO: $4.500.000", "Canon: $6.200.000", "Arriendo $3.800.000", "VR RENTA $5.300.000")
  const canonMatch = clean.match(/(?:canon(?:\s*de\s*arriendo)?|valor\s*(?:de\s*)?arriendo|precio\s*(?:de\s*)?arriendo|vr\s*[\.\/]?\s*renta|renta)\s*[:\/\-=\s]?\s*\$?\s*([\d][\d.,\s']*)(?:\s*(mil\s*millones?|millones?|millon|millón|mll|mlls|mill|mills|mm|m))?/i);
  if (canonMatch) {
    const isSale = false;
    const computed = parseColombianPriceOrBudget(canonMatch[1], canonMatch[2] || "", isSale);
    if (computed > 0 && computed <= 100_000_000 && !isPhoneNumberNotPrice(computed, text)) {
      rentPrice = computed;
    }
  }

  // 3. Precio de Venta Explícito (ej: "PRECIO DE VENTA/ $950.000.000", "Precio de venta: $3.400.000.000", "VALOR VENTA: $2.400'000.000", "VR. VENTA $1.600.000.000", "Venta: $885.000.000", "Valor un poco negociable $780 MM", "$1 450 Millones")
  const saleMatch = clean.match(/(?:precio\s*(?:de\s*)?venta|valor\s*(?:de\s*)?venta|vr\s*[\.\/]?\s*venta|venta\s*(?:de\s*apartamento|de\s*apto|de\s*casa)?|valor\s*un\s*poco\s*negociable|valor\s*negociable|precio\s*negociable)\s*[:\/\-=\s]?\s*\$?\s*([\d][\d.,\s']*)(?:\s*(mil\s*millones?|millones?|millon|millón|mll|mlls|mill|mills|mm|m))?/i);
  if (saleMatch) {
    const isSale = true;
    const computed = parseColombianPriceOrBudget(saleMatch[1], saleMatch[2] || "", isSale);
    if (computed >= 30_000_000 && !isPhoneNumberNotPrice(computed, text)) {
      price = computed;
      presupuestoMax = computed;
    }
  }

  // 4. Rango de Presupuesto en Demanda (ej: "Presupuesto 1.300 - 1.400", "de 14 o 15 millones", "entre 800 y 900 millones", "ppto 1200 a 1400", "800 a 1.200 millones")
  if (price === 0 && rentPrice === 0) {
    const rangeMatch = clean.match(/(?:presupuesto|prespuesto|ppto|inversi[oó]n|compra)\s*:?\s*(?:entre\s+)?\$?\s*([\d][\d.,\s']*)\s*(?:a|hasta|-|y|o|u)\s*\$?\s*([\d][\d.,\s']*)\s*(mil\s*millones?|millones?|millon|millón|mll|mlls|mill|mills|mm|m)?/i)
      || clean.match(/(?:entre|de)\s+\$?\s*([\d][\d.,\s']*)\s*(?:a|hasta|-|y|o|u)\s*\$?\s*([\d][\d.,\s']*)\s*(mil\s*millones?|millones?|millon|millón|mll|mlls|mill|mills|mm|m)\b/i);
    if (rangeMatch) {
      const isSale = transactionType !== "arriendo";
      presupuestoMin = parseColombianPriceOrBudget(rangeMatch[1], rangeMatch[3] || "", isSale);
      presupuestoMax = parseColombianPriceOrBudget(rangeMatch[2], rangeMatch[3] || "", isSale);
      price = presupuestoMax;
      if (transactionType === "arriendo") {
        rentPrice = presupuestoMax;
      }
    }
  }

  // 5. Presupuesto Máximo con Prefijos (ej: "Prespuesto Máximo $ 540 millones", "Presupuesto máximo de $800 mll", "Presupuesto: 1.500 millones máximo", "Presupuesto: 1,800 MILLONES CONTADO", "Hasta 4 millones", "Ppto max 12 MM")
  if (price === 0 && rentPrice === 0) {
    const ceilingMatch = clean.match(/(?:presupuesto(?:\s*m[aá]ximo)?|prespuesto(?:\s*m[aá]ximo)?|ppto(?:\s*m[aá]ximo)?|\btope\b|\btecho\b|\bl[ií]mite\b)\s*(?:m[aá]ximo|max)?\s*(?:de)?\s*:?\s*\$?\s*([\d][\d.,\s']*)(?:\s*(mil\s*millones?|millones?|millon|millón|mll|mlls|mill|mills|mm|m))?/i);
    if (ceilingMatch) {
      const afterText = clean.slice(clean.indexOf(ceilingMatch[0]) + ceilingMatch[0].length, clean.indexOf(ceilingMatch[0]) + ceilingMatch[0].length + 15);
      if (!/años|anos|edad|antig/i.test(afterText)) {
        const isSale = transactionType !== "arriendo";
        const computed = parseColombianPriceOrBudget(ceilingMatch[1], ceilingMatch[2] || "", isSale);
        if (computed > 0 && !isPhoneNumberNotPrice(computed, text)) {
          if (transactionType === "arriendo" || computed <= 50_000_000) {
            rentPrice = computed;
          } else {
            price = computed;
          }
          presupuestoMax = computed;
        }
      }
    }
  }

  // 6. Etiqueta Simple "Precio: $..." o "Valor: $..."
  if (price === 0 && rentPrice === 0) {
    const simplePriceMatch = clean.match(/(?:precio|valor)\s*[:\/\-=\s]?\s*\$?\s*([\d][\d.,\s']*)(?:\s*(mil\s*millones?|millones?|millon|millón|mll|mlls|mill|mills|mm|m))?/i);
    if (simplePriceMatch) {
      const isSale = transactionType !== "arriendo";
      const computed = parseColombianPriceOrBudget(simplePriceMatch[1], simplePriceMatch[2] || "", isSale);
      if (computed > 0 && !isPhoneNumberNotPrice(computed, text) && computed !== adminFee) {
        if (transactionType === "arriendo" || computed <= 50_000_000) {
          rentPrice = computed;
        } else {
          price = computed;
        }
        presupuestoMax = computed;
      }
    }
  }

  // 7. Rescate Robusto Global de Cifras Inmobiliarias (Venta vs Arriendo)
  if (price === 0 && rentPrice === 0) {
    // Si la publicación es de venta o contiene pistas claras de venta
    const isSaleContext = transactionType !== "arriendo" || clean.includes("venta") || clean.includes("vendo");
    if (isSaleContext) {
      // 7A. Buscar todas las cifras completas colombianas (con $ o como cifra numérica de millones con puntos/apóstrofes ej: 850.000.000)
      const allColMatches = [...clean.matchAll(/(?:\$\s*|(?<=\s|^))(\d{1,4}(?:[.\s']\d{3}){1,4})(?=\s|$|[.,;:!])/g)];
      for (const m of allColMatches) {
        const parsed = parseColombianPriceOrBudget(m[1], "", true);
        if (!isNaN(parsed) && !isPhoneNumberNotPrice(parsed, text) && parsed !== adminFee && parsed >= 30_000_000) {
          if (parsed > price) {
            price = parsed;
            presupuestoMax = parsed;
          }
        }
      }

      // 7B. Buscar cifras con taquigrafía tipo "$1,250. MM" o "850 millones" o "$1 450 Millones"
      if (price === 0) {
        const mmMatches = [...clean.matchAll(/(?:precio|valor|venta)?\s*[:\/\-=\s]?\s*\$?\s*([\d][\d.,\s']*)\s*(?:mil\s*millones?|millones?|millon|millón|mll|mlls|mill|mills|mm|m)\b/gi)];
        for (const m of mmMatches) {
          const computed = parseColombianPriceOrBudget(m[1], "millones", true);
          if (computed >= 30_000_000 && computed !== adminFee && !isPhoneNumberNotPrice(computed, text)) {
            if (computed > price) {
              price = computed;
              presupuestoMax = computed;
            }
          }
        }
      }
    } else {
      // Para arriendo: buscar cifras < 100M
      const colMatch = clean.match(/(?:\$\s*|(?<=\s|^))(\d{1,4}(?:[.\s']\d{3}){1,4})(?=\s|$|[.,;:!])/);
      if (colMatch) {
        const parsed = parseColombianPriceOrBudget(colMatch[1], "", false);
        if (!isNaN(parsed) && !isPhoneNumberNotPrice(parsed, text) && parsed !== adminFee && parsed <= 100_000_000) {
          rentPrice = parsed;
          presupuestoMax = parsed;
        }
      }
    }
  }

  if (transactionType === "arriendo" && rentPrice > 0 && price === 0) {
    price = rentPrice;
  }

  let area = 0;
  let areaMin = 0;
  let areaMax = 0;

  // 0. Captura dimensiones multiplicadas (ej: "8*25 MTS2", "8x25 m2", "10*30 mts")
  const dimMultMatch = (text || "").match(/(\d+(?:[.,]\d+)?)\s*[*xX]\s*(\d+(?:[.,]\d+)?)\s*(?:m2|mts2|mts|mt2|metros(?:\s+cuadrados)?|m²)?/i);
  if (dimMultMatch) {
    const d1 = parseFloat(dimMultMatch[1].replace(',', '.'));
    const d2 = parseFloat(dimMultMatch[2].replace(',', '.'));
    if (!isNaN(d1) && !isNaN(d2) && d1 > 0 && d2 > 0 && d1 <= 500 && d2 <= 500) {
      area = Math.round(d1 * d2 * 100) / 100;
      areaMin = area;
      areaMax = area;
    }
  }

  if (area === 0) {
    // A. Captura rango de área con soporte para unidades intermedias o prefijo m2: (ej: "M2: 180 – 200", "de 70m2 a 80m2", "de 50-70 mt2", "50 a 70 m2", "50-70 metros")
    const areaRangeMatch = clean.match(/(?:📐|area|área|superficie|m2|mts2|mts|mt2|metros(?:\s+cuadrados)?|m²)?\s*:?\s*(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:m2|mts2|mts|mt2|metros(?:\s+cuadrados)?|m²)?\s*(?:a|-|hasta)\s*(\d+(?:[.,]\d+)?)\s*(?:m2|mts2|mts|mt2|metros(?:\s+cuadrados)?|m²)?/i);
    if (areaRangeMatch && (areaRangeMatch[1] || areaRangeMatch[2])) {
      const rIdx = areaRangeMatch.index ?? 0;
      const rPreceding = clean.slice(Math.max(0, rIdx - 45), rIdx);
      if (!isOutdoorAreaPreceding(rPreceding)) {
        const hasAreaCtx = /(?:📐|area|área|superficie|m2|mts2|mts|mt2|metros|m²)/i.test(areaRangeMatch[0]);
        const n1 = parseFloat(areaRangeMatch[1].replace(',', '.'));
        const n2 = parseFloat(areaRangeMatch[2].replace(',', '.'));
        if (hasAreaCtx && !isNaN(n1) && !isNaN(n2) && n1 >= 15 && n1 <= 15000 && n2 >= 15 && n2 <= 15000) {
          areaMin = Math.min(n1, n2);
          areaMax = Math.max(n1, n2);
          area = areaMin;
        }
      }
    }

    // B. Captura área simple con prefijos: "📐 183 m²", "M2: 180", "Area: 180 Mts", "Mínimo 150m2", "Mínimo 160m"
    const outdoor = parseOutdoorAreas(clean);
    const areaMatches = Array.from(clean.matchAll(/(?:(?:📐|area|área|superficie)\s*:?\s*(?:(?:m[ií]nimo|min|m[aá]ximo|max|de|área\s*(?:m[ií]nima)?|area\s*(?:minima)?)\s+)?(\d+(?:[.,]\d+)?)\s*(?:m2|mts2|mts|mt2|metros(?:\s+cuadrados)?|m²|m\b)?)|(?:(?:(?:m[ií]nimo|min|m[aá]ximo|max|de)\s+)?(\d+(?:[.,]\d+)?)\s*(?:m2|mts2|mts|mt2|metros(?:\s+cuadrados)?|m²)\b)/gi));

    for (const m of areaMatches) {
      const valStr = m[1] || m[2];
      if (!valStr) continue;
      const val = parseFloat(valStr.replace(',', '.'));
      if (outdoor.terraceArea && val === outdoor.terraceArea) continue;
      if (outdoor.balconyArea && val === outdoor.balconyArea) continue;
      if (outdoor.patioArea && val === outdoor.patioArea) continue;

      const mIdx = m.index ?? 0;
      const preceding = clean.slice(Math.max(0, mIdx - 45), mIdx);
      if (isOutdoorAreaPreceding(preceding)) continue;

      if (!isNaN(val) && val >= 15 && val <= 15000) {
        area = val;
        areaMin = area;
        areaMax = area;
        break;
      }
    }
  }

  // C. Rescate con el parser de jerga colombiana si aún no se detectó área
  if (area === 0) {
    const pl = parseColombianListing(text);
    if (pl.areaM2 && pl.areaM2 > 0) {
      area = pl.areaM2;
      areaMin = pl.areaM2;
      areaMax = pl.areaM2;
    }
  }

  let bedrooms = 0;
  let bedroomsMin = 0;
  let bedroomsMax = 0;
  const SPANISH_NUMBERS_MAP: Record<string, number> = {
    "un": 1, "uno": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10
  };
  function parseWordOrDigit(str?: string): number {
    if (!str) return 0;
    const s = str.trim().toLowerCase();
    if (SPANISH_NUMBERS_MAP[s]) return SPANISH_NUMBERS_MAP[s];
    const n = parseInt(s, 10);
    return isNaN(n) ? 0 : n;
  }

  // A. Formato Rango con Prefijo (ej: *Alcobas*: 2 a 3 o Alcobas: 2 - 3)
  const rangePrefixMatch = clean.match(/(?:🛏️|🛌)?\s*(?:alcobas?|hab(?:s|itaciones|itaci[oó]n)?|dormitorios?|cuartos?)\s*[:\-=]\s*(?:de\s+)?(un|una|uno|dos|tres|cuatro|cinco|\d{1,2})\s*(?:a|-|o|hasta)\s*(un|una|uno|dos|tres|cuatro|cinco|\d{1,2})/i);
  if (rangePrefixMatch) {
    bedroomsMin = parseWordOrDigit(rangePrefixMatch[1]);
    bedroomsMax = parseWordOrDigit(rangePrefixMatch[2]);
    bedrooms = bedroomsMin;
  } else {
    // B. Formato Key-Value con Prefijo (ej: *Alcobas*: 3, Alcobas: mínimo 2, Habitaciones: 4)
    const kvPrefixMatch = clean.match(/(?:🛏️|🛌)?\s*(?:alcobas?|hab(?:s|itaciones|itaci[oó]n)?|dormitorios?|cuartos?)\s*[:\-=]\s*(?:m[ií]nimo\s*|minimo\s*|m[ií]n\s*|min\s*)?(un|una|uno|dos|tres|cuatro|cinco|\d{1,2})\b/i);
    if (kvPrefixMatch) {
      bedrooms = parseWordOrDigit(kvPrefixMatch[1]);
      bedroomsMin = bedrooms;
      bedroomsMax = bedrooms;
    } else {
      // C. Formato Rango Estándar (ej: 2 a 3 alcobas)
      const bedRangeMatch = clean.match(/(?:🛏️\s*)?(?:de\s+)?(un|una|uno|dos|tres|cuatro|cinco|\d{1,2})\s*(?:a|-|o|hasta)\s*(un|una|uno|dos|tres|cuatro|cinco|\d{1,2})\s*(?:amplias?|grandes?|c[oó]modas?|hermosas?|iluminadas?|confortables?|lindas?|buenas?|espaciosas?|principales?)?\s*(?:alcobas?|hab(?:s|itaciones|itacion)?|dormitorios?|cuartos?)\b/i);
      if (bedRangeMatch) {
        bedroomsMin = parseWordOrDigit(bedRangeMatch[1]);
        bedroomsMax = parseWordOrDigit(bedRangeMatch[2]);
        bedrooms = bedroomsMin;
      } else {
        // D. Formato Estándar (ej: 3 alcobas, tiene 2 habitaciones)
        const bedWordMatch = clean.match(/(?:🛏️\s*)?(?:(?:tiene|con|de)\s+)?(un|una|uno|dos|tres|cuatro|cinco|\d{1,2})\s*(?:amplias?|grandes?|c[oó]modas?|hermosas?|iluminadas?|confortables?|lindas?|buenas?|espaciosas?|principales?)?\s*(?:alcobas?|hab(?:s|itaciones|itacion)?|dormitorios?|cuartos?)\b/i);
        if (bedWordMatch) {
          bedroomsMin = parseWordOrDigit(bedWordMatch[1]);
          bedroomsMax = bedroomsMin;
          bedrooms = bedroomsMin;
        }
      }
    }
  }

  let bathrooms = 0;
  // 🛡️ REGLA DOCTRINAL v31.104: Detección prioritaria de adición explícita de baño social (ej: 2 baños + baño social = 3 baños)
  const socialAddMatch = clean.match(/(un|una|uno|dos|tres|cuatro|cinco|\d+)\s*(?:baño|baños|bñ)\s*(?:\+|\+|y|m[aá]s|con)\s*(?:el\s*|un\s*)?baño\s*social/i);
  if (socialAddMatch) {
    const baseVal = parseWordOrDigit(socialAddMatch[1]) || 2;
    bathrooms = baseVal + 1; // 2 baños privados + 1 social = 3 baños
  } else {
    // Detección de baños con medio baño (ej: 2.5 baños = 2 completos + 1 social = 3 baños físicos)
    const halfBathMatch = clean.match(/(un|una|uno|dos|tres|cuatro|cinco|\d+)[\.,]5\s*(?:baños?|banos?|bñ|wc)/i)
      || clean.match(/(un|una|uno|dos|tres|cuatro|cinco|\d+)\s*(?:baños?|banos?|bñ)\s*(?:y\s*medio|y\s*medio\s*baño)/i);
    if (halfBathMatch) {
      const baseVal = parseWordOrDigit(halfBathMatch[1]) || 2;
      bathrooms = baseVal + 1; // 2.5 baños -> 2 completos + 1 social = 3 baños
    } else {
      // A. Formato Key-Value con Prefijo (ej: *Baños*: 3, Baños: mínimo 2, Baños: 2)
      const kvBathMatch = clean.match(/(?:🚿|🛁|🚽)?\s*(?:baños?|banos?|wc)\s*[:\-=]\s*(?:m[ií]nimo\s*|minimo\s*|m[ií]n\s*|min\s*)?(un|una|uno|dos|tres|cuatro|cinco|\d{1,2}(?:[\.,]\d+)?)\b/i);
      if (kvBathMatch) {
        const bw = kvBathMatch[1].replace(',', '.');
        const parsed = parseFloat(bw);
        bathrooms = !isNaN(parsed) && parsed % 1 !== 0 ? Math.ceil(parsed) : parseWordOrDigit(kvBathMatch[1]);
      } else {
        // B. Formato Estándar (ej: 3 baños, con 2 baños)
        const bathMatch = clean.match(/(?:🚿|🛁|🚽|de\s+)?(un|una|uno|dos|tres|cuatro|cinco|\d{1,2}(?:[\.,]\d+)?)(?:\s*(?:\([0-9]+\)|un|una|uno|dos|tres|cuatro|cinco|\d+))?\s*(?:amplios?|completos?|sociales?|grandes?)?\s*(?:baño|baños|bano|banos|wc)/i);
        if (bathMatch) {
          const bw = bathMatch[1].replace(',', '.');
          const parsed = parseFloat(bw);
          bathrooms = !isNaN(parsed) && parsed % 1 !== 0 ? Math.ceil(parsed) : parseWordOrDigit(bathMatch[1]);
        }
      }
    }
  }
  if (bathrooms === 0) {
    let countBaths = 0;
    if (/\bbaño\s*(?:social|de\s*visitas)\b/i.test(clean)) countBaths++;
    if (/\bbaño\s*de\s*servicio\b/i.test(clean)) countBaths++;
    if (/\b(?:baño\s*(?:privado|principal)|principal[^\n]*baño|con\s*baño)\b/i.test(clean)) countBaths++;
    if (countBaths > 0) bathrooms = countBaths;
  }

  let garages = 0;
  let garageType: string | null = null;
  // A. Formato Key-Value con Prefijo (ej: *Parqueaderos*: 2, Garajes: 2)
  const kvGarMatch = clean.match(/(?:🚙|🚗|🚘)?\s*(?:parqueaderos?|garajes?|parqueos?|estacionamientos?|pks?|parqs?)\s*[:\-=]\s*(?:m[ií]nimo\s*|minimo\s*|m[ií]n\s*|min\s*)?(un|una|uno|dos|tres|cuatro|cinco|\d{1,2})\b/i);
  if (kvGarMatch) {
    const val = parseWordOrDigit(kvGarMatch[1]);
    if (val <= 20) garages = val;
  } else {
    // B. Formato Estándar
    const garMatch = clean.match(/(?:🚙|🚗|🚘)?[^\S\r\n]*(?:con\s+)?(?<!24[\/\-])(un|una|uno|dos|tres|cuatro|cinco|\d{1,2})(?:[^\S\r\n]*(?:\([0-9]+\)|[a-záéíóúñ]+))?[^\S\r\n]*(?:amplios?|cubiertos?|privados?|independientes?|en\s*l[ií]nea|lineales?)?[^\S\r\n]*(?:parqueo|parqueos|parqueadero|parqueaderos|garaje|garajes|ptero|parq|parqs|pks|estacionamiento|estacionamientos)/i)
      || clean.match(/(?:parqueo|parqueos|parqueadero|parqueaderos|garaje|garajes|ptero|parq|parqs|pks|estacionamiento|estacionamientos)[^\S\r\n]*:?[^\S\r\n]*(\d{1,2}|un|una|uno|dos|tres|cuatro|cinco)/i);
    if (garMatch) {
      const val = parseWordOrDigit(garMatch[1]);
      if (val >= 1900 && val <= 2100) {
        garages = 0;
      } else if (val > 20) {
        garages = 0;
      } else {
        garages = val;
      }
    } else if (/\b(?:parqueaderos|garajes|estacionamientos|parqs|pks)\b/i.test(clean)) {
      garages = 2; // Plural explícito "garajes", "parqueaderos" -> mínimo 2
    } else if (/con\s+(?:un\s+)?(?:parqueadero|garaje)|parqueadero|garaje/i.test(clean)) {
      garages = 1;
    }
  }
  if (clean.includes("en linea") || clean.includes("en línea") || clean.includes("lineal")) {
    garageType = "lineal";
  } else if (clean.includes("independiente") || clean.includes("independientes")) {
    garageType = "independiente";
  }

  let antiguedadAnos: number | null = null;
  const ageMatch = clean.match(/(?:🏢|⏳|⏱️|edificio|antigüedad|antiguedad|tiene|\||,|\.)\s*(\d{1,3})\s*a[ñn]os\b/i)
    || clean.match(/(\d{1,3})\s*a[ñn]os\s*(?:de\s*)?(?:construido|antigüedad|edificio)?\b/i);
  if (ageMatch) {
    antiguedadAnos = parseInt(ageMatch[1], 10);
  }

  let hasBalcony: boolean | null = null;
  let hasTerrace: boolean | null = null;
  if (clean.includes("no tiene balcón") || clean.includes("no tiene balcon") || clean.includes("sin balcón") || clean.includes("sin balcon")) {
    hasBalcony = false;
  } else if (clean.includes("balcón") || clean.includes("balcon")) {
    hasBalcony = true;
  }

  if (clean.includes("no tiene terraza") || clean.includes("sin terraza")) {
    hasTerrace = false;
  } else if (clean.includes("terraza") || clean.includes("terrazas")) {
    hasTerrace = true;
  }

  const hasStorage = clean.includes("depósito") || clean.includes("deposito") || clean.includes("cuarto util") || clean.includes("bodega");
  const hasElevator = clean.includes("ascensor");

  let kitchenType: string | null = null;
  if (clean.includes("cocina cerrada")) kitchenType = "Cerrada";
  else if (clean.includes("cocina abierta")) kitchenType = "Abierta";
  else if (clean.includes("cocina tipo isla") || clean.includes("isla")) kitchenType = "Abierta tipo Isla";

  const hasServiceRoom = clean.includes("cbs") ||
    clean.includes("cuarto de servicio") ||
    clean.includes("alcoba de servicio") ||
    clean.includes("cuarto y baño de servicio") ||
    clean.includes("cuarto y bano de servicio") ||
    clean.includes("cuarto de empleada") ||
    clean.includes("alcoba para el servicio");

  let floorType: string | null = null;
  if (clean.includes("madera maciza") || clean.includes("madera natural") || clean.includes("granadillo")) floorType = "Madera Maciza";
  else if (clean.includes("piso en madera") || clean.includes("pisos en madera") || clean.includes("piso de madera") || clean.includes("pisos de madera")) floorType = "Madera";
  else if (clean.includes("laminado") || clean.includes("piso laminado")) floorType = "Laminado";
  else if (clean.includes("porcelanato")) floorType = "Porcelanato";
  else if (clean.includes("marmol") || clean.includes("mármol")) floorType = "Mármol";
  else if (clean.includes("ceramica") || clean.includes("cerámica")) floorType = "Cerámica";

  let sunlightOrientation: string | null = null;
  if (clean.includes("luz de la mañana") || clean.includes("luz de manana") || clean.includes("sol de mañana") || clean.includes("sol de manana")) sunlightOrientation = "Sol de Mañana";
  else if (clean.includes("sol de tarde") || clean.includes("luz de tarde")) sunlightOrientation = "Sol de Tarde";
  else if (clean.includes("exterior iluminado") || clean.includes("super iluminado") || clean.includes("muy iluminado")) sunlightOrientation = "Exterior Iluminado";

  const hasPowerPlant = clean.includes("planta electrica") || clean.includes("planta eléctrica") || clean.includes("suplencia total") || clean.includes("planta total") || clean.includes("planta de suplencia");
  const hasVisitorParking = clean.includes("parqueadero de visitantes") || clean.includes("parqueadero para visitantes") || clean.includes("parqueaderos de visitantes") || clean.includes("parqueo visitantes");
  const hasHeating = clean.includes("calentador de paso") || clean.includes("calentador a gas") || clean.includes("caldera");

  let city = "";
  const isBogotaContext = clean.includes("bogota") || clean.includes("bogotá") || clean.includes("cedritos") || clean.includes("chico") || clean.includes("chicó") || clean.includes("rosales") || clean.includes("usaquen") || clean.includes("usaquén") || clean.includes("santa barbara") || clean.includes("santa bárbara") || clean.includes("chapinero") || clean.includes("suba") || clean.includes("engativa") || clean.includes("engativá") || clean.includes("tabora") || clean.includes("floresta") || clean.includes("santa maria del lago") || clean.includes("santa maría del lago") || clean.includes("fontibon") || clean.includes("fontibón") || clean.includes("kennedy") || clean.includes("teusaquillo") || clean.includes("salitre") || clean.includes("barrios unidos");

  if (isBogotaContext) {
    city = "Bogotá, D.C.";
  } else if (clean.includes("valledupar") || clean.includes("cesar")) {
    city = "Valledupar";
  } else if (clean.includes("bucaramanga") || clean.includes("floridablanca") || clean.includes("piedecuesta") || clean.includes("giron") || clean.includes("girón") || clean.includes("santander") || clean.includes("ruitoque")) {
    city = clean.includes("floridablanca") ? "Floridablanca" : clean.includes("piedecuesta") ? "Piedecuesta" : clean.includes("giron") || clean.includes("girón") ? "Girón" : "Bucaramanga";
  } else if (clean.includes("cartagena") || clean.includes("bocagrande") || clean.includes("castillogrande") || clean.includes("manga") || clean.includes("crespo") || clean.includes("laguito")) {
    city = "Cartagena";
  } else if (clean.includes("santa marta") || clean.includes("rodadero") || clean.includes("bello horizonte") || clean.includes("pozos colorados")) {
    city = "Santa Marta";
  } else if (clean.includes("pereira") || clean.includes("dosquebradas") || clean.includes("cerritos") || clean.includes("pinares")) {
    city = clean.includes("dosquebradas") ? "Dosquebradas" : "Pereira";
  } else if (clean.includes("manizales") || clean.includes("villamaria")) {
    city = clean.includes("villamaria") ? "Villamaría" : "Manizales";
  } else if (clean.includes("armenia") || clean.includes("calarca") || clean.includes("quimbaya")) {
    city = clean.includes("calarca") ? "Calarcá" : clean.includes("quimbaya") ? "Quimbaya" : "Armenia";
  } else if (clean.includes("ibague") || clean.includes("ibagué") || clean.includes("melgar") || clean.includes("carmen de apicala")) {
    city = clean.includes("melgar") ? "Melgar" : clean.includes("carmen de apicala") ? "Carmen de Apicalá" : "Ibagué";
  } else if (clean.includes("villavicencio") || clean.includes("acacias")) {
    city = clean.includes("acacias") ? "Acacías" : "Villavicencio";
  } else if (clean.includes("cali") || clean.includes("valle del lili") || clean.includes("pance") || clean.includes("bochalema") || clean.includes("el caney") || clean.includes("chipichape") || clean.includes("melendez") || clean.includes("jamundi") || clean.includes("juanchito") || (clean.includes("san antonio") && !clean.includes("san antonio norte") && !clean.includes("san antonio noroccidental")) || (clean.includes("ciudad jardin") && !clean.includes("ciudad jardin norte") && !clean.includes("ciudad jardin sur"))) {
    city = clean.includes("jamundi") || clean.includes("jamundí") ? "Jamundí" : "Cali";
  } else if (clean.includes("medellin") || clean.includes("medellín") || clean.includes("poblado") || clean.includes("laureles") || clean.includes("san javier") || clean.includes("comuna 13") || clean.includes("belen") || clean.includes("belén") || clean.includes("conquistadores") || clean.includes("envigado") || clean.includes("sabaneta") || clean.includes("itagui") || clean.includes("itagüí") || (clean.includes("rionegro") && !clean.includes("suba") && !clean.includes("bogota")) || clean.includes("la ceja") || clean.includes("el retiro")) {
    city = clean.includes("envigado") ? "Envigado" : clean.includes("sabaneta") ? "Sabaneta" : (clean.includes("itagui") || clean.includes("itagüí")) ? "Itagüí" : clean.includes("rionegro") ? "Rionegro" : clean.includes("la ceja") ? "La Ceja" : clean.includes("el retiro") ? "El Retiro" : "Medellín";
  } else if (clean.includes("barranquilla") || clean.includes("altos de riomar") || clean.includes("barrio abajo") || clean.includes("alto prado") || clean.includes("villa santos") || clean.includes("villa campestre") || clean.includes("soledad") || clean.includes("puerto colombia")) {
    city = clean.includes("soledad") ? "Soledad" : (clean.includes("puerto colombia") || clean.includes("villa campestre")) ? "Puerto Colombia" : "Barranquilla";
  } else if (clean.includes("chia") || clean.includes("chía")) {
    city = "Chía";
  } else if (clean.includes("cajica") || clean.includes("cajicá")) {
    city = "Cajicá";
  } else if (clean.includes("cota")) {
    city = "Cota";
  } else if (clean.includes("sopo") || clean.includes("sopó")) {
    city = "Sopó";
  } else if (clean.includes("la calera")) {
    city = "La Calera";
  } else if (clean.includes("zipaquira") || clean.includes("zipaquirá")) {
    city = "Zipaquirá";
  } else if (clean.includes("funza")) {
    city = "Funza";
  } else if (clean.includes("mosquera")) {
    city = "Mosquera";
  } else if (clean.includes("madrid")) {
    city = "Madrid";
  } else if (clean.includes("fusagasuga") || clean.includes("fusagasugá")) {
    city = "Fusagasugá";
  } else if (clean.includes("girardot")) {
    city = "Girardot";
  }

  let zone = "";
  const acceptedNeighborhoods: string[] = [];
  const rejectedNeighborhoods: string[] = [];

  for (const item of KNOWN_BARRIOS_SORTED_ITEMS) {
    let pos = 0;
    while ((pos = clean.indexOf(item.lower, pos)) !== -1) {
      const precedingText = clean.slice(Math.max(0, pos - 45), pos);
      const isNegated = /(?:no\s+les?\s+gusta|no\s+gusta|no\s+quiere|no\s+|excepto\s+|menos\s+|sin\s+|descartado\s+|fuera\s+de\s+|abstenerse\s+|no\s+enviar\s+|no\s+recibo\s+|no\s+buscar\s+)/i.test(precedingText);
      if (isNegated) {
        if (!rejectedNeighborhoods.includes(item.canonical)) rejectedNeighborhoods.push(item.canonical);
      } else {
        if (!acceptedNeighborhoods.includes(item.canonical)) acceptedNeighborhoods.push(item.canonical);
      }
      pos += item.lower.length;
    }
  }

  const validNeighborhoods = acceptedNeighborhoods.filter(b => !rejectedNeighborhoods.includes(b));
  if (validNeighborhoods.length > 0) {
    zone = validNeighborhoods[0];
  }

  if (!zone) {
    if (clean.includes("north point") || clean.includes("north point lift") || clean.includes("san cristobal norte") || clean.includes("san cristóbal norte")) zone = "San Cristóbal Norte";
    else if (clean.includes("alameda 170") || clean.includes("alameda norte") || clean.includes("la alameda") || clean.includes("barrio alameda") || clean.includes("alameda")) zone = "La Alameda";
    else if (clean.includes("san antonio noroccidental") || clean.includes("san antonio norte")) zone = "San Antonio Norte";
    else if (clean.includes("villa magdala")) zone = "Villa Magdala";
    else if (clean.includes("chico reservado")) zone = "Chicó Reservado";
    else if (clean.includes("chico norte")) zone = "Chicó Norte";
    else if (clean.includes("chico navarra")) zone = "Chicó Navarra";
    else if (clean.includes("rincon del chico") || clean.includes("rincón del chicó")) zone = "Rincón del Chicó";
    else if (clean.includes("el chico") || clean.includes("chico") || clean.includes("chicó")) zone = "Chicó";
    else if (clean.includes("santa barbara central") || clean.includes("santa bárbara central") || clean.includes("santa barbara (central)")) zone = "Santa Bárbara Central";
    else if (clean.includes("santa barbara occidental") || clean.includes("santa bárbara occidental")) zone = "Santa Bárbara Occidental";
    else if (clean.includes("santa barbara oriental") || clean.includes("santa bárbara oriental")) zone = "Santa Bárbara Oriental";
    else if (clean.includes("santa barbara alta") || clean.includes("santa bárbara alta")) zone = "Santa Bárbara Alta";
    else if (clean.includes("santa barbara") || clean.includes("santa bárbara")) zone = "Santa Bárbara";
    else if (clean.includes("santa paula")) zone = "Santa Paula";
    else if (clean.includes("santa bibiana")) zone = "Santa Bibiana";
    else if (clean.includes("san patricio")) zone = "San Patricio";
    else if (clean.includes("santa teresa")) zone = "Santa Teresa";
    else if (clean.includes("santa ana oriental") || clean.includes("santa ana alta")) zone = "Santa Ana Oriental";
    else if (clean.includes("santa ana occidental")) zone = "Santa Ana Occidental";
    else if (clean.includes("santa ana")) zone = "Santa Ana";
    else if (clean.includes("la cabrera") || clean.includes("cabrera")) zone = "La Cabrera";
    else if (clean.includes("rosales alto") || clean.includes("los rosales alto") || clean.includes("rosales parte alta") || clean.includes("rosales arriba")) zone = "Rosales Alto";
    else if (clean.includes("rosales bajo") || clean.includes("los rosales bajo") || clean.includes("rosales parte baja") || clean.includes("rosales abajo") || clean.includes("rosales plano")) zone = "Rosales Bajo";
    else if (clean.includes("rosales") || clean.includes("los rosales")) zone = "Rosales";
    else if (clean.includes("el nogal") || clean.includes("nogal")) zone = "El Nogal";
    else if (clean.includes("el virrey") || clean.includes("virrey")) zone = "El Virrey";
    else if (clean.includes("el retiro")) zone = "El Retiro";
    else if (clean.includes("el refugio")) zone = "El Refugio";
    else if (clean.includes("quinta camacho")) zone = "Quinta Camacho";
    else if (clean.includes("antiguo country")) zone = "Antiguo Country";
    else if (clean.includes("country club") || clean.includes("el country")) zone = "Country Club";
    else if (clean.includes("calleja alta") || clean.includes("la calleja alta")) zone = "Calleja Alta";
    else if (clean.includes("calleja baja") || clean.includes("la calleja baja")) zone = "Calleja Baja";
    else if (clean.includes("la calleja") || clean.includes("calleja")) zone = "La Calleja";
    else if (clean.includes("la carolina") || clean.includes("carolina")) zone = "La Carolina";
    else if (clean.includes("bosque medina")) zone = "Bosque Medina";
    else if (clean.includes("el contador") || clean.includes("contador")) zone = "El Contador";
    else if (clean.includes("alcala") || clean.includes("alcalá")) zone = "Alcalá";
    else if (clean.includes("belmira")) zone = "Belmira";
    else if (clean.includes("la castellana") || clean.includes("castellana")) zone = "La Castellana";
    else if (clean.includes("polo club") || clean.includes("polo")) zone = "Polo Club";
    else if (clean.includes("san felipe")) zone = "San Felipe";
    else if (clean.includes("emaus") || clean.includes("emaús")) zone = "Emaús";
    else if (clean.includes("colina campestre") || clean.includes("colina")) zone = "Colina Campestre";
    else if (clean.includes("ciudad melendez") || clean.includes("ciudad meléndez")) zone = "Ciudad Meléndez";
    else if (clean.includes("ciudad jardin norte") || clean.includes("ciudad jardín norte")) zone = "Ciudad Jardín Norte";
    else if (clean.includes("ciudad jardin sur") || clean.includes("ciudad jardín sur")) zone = "Ciudad Jardín Sur";
    else if (clean.includes("ciudad jardin") || clean.includes("ciudad jardín")) zone = "Ciudad Jardín";
    else if (clean.includes("alamos norte") || clean.includes("álamos norte")) zone = "Álamos Norte";
    else if (clean.includes("alamos sur") || clean.includes("álamos sur")) zone = "Álamos Sur";
    else if (clean.includes("alamos") || clean.includes("álamos")) zone = "Álamos";
    else if (clean.includes("candelaria centro") || clean.includes("la candelaria centro")) zone = "La Candelaria Centro";
    else if (clean.includes("candelaria la nueva") || clean.includes("candelaria sur")) zone = "Candelaria la Nueva";
    else if (clean.includes("la candelaria") || clean.includes("candelaria")) zone = "La Candelaria";
    else if (clean.includes("nuevo country")) zone = "Nuevo Country";
    else if (clean.includes("niza antigua")) zone = "Niza Antigua";
    else if (clean.includes("niza norte")) zone = "Niza Norte";
    else if (clean.includes("niza")) zone = "Niza";
    else if (clean.includes("sotileza")) zone = "Sotileza";
    else if (clean.includes("bella suiza")) zone = "Bella Suiza";
    else if (clean.includes("lisboa")) zone = "Lisboa";
    else if (clean.includes("alejandria") || clean.includes("alejandría")) zone = "Alejandría";
    else if (clean.includes("carmel club") || clean.includes("carmel")) zone = "Carmel Club";
    else if (clean.includes("cantalejo")) zone = "Cantalejo";
    else if (clean.includes("sotavento")) zone = "Sotavento";
    else if (clean.includes("san jose de bavaria") || clean.includes("san josé de bavaria")) zone = "San José de Bavaria";
  }
  else if (clean.includes("cedritos") || clean.includes("los cedros")) zone = "Cedritos";
  else if (clean.includes("toberin") || clean.includes("toberín")) zone = "Toberín";
  else if (clean.includes("mazuren") || clean.includes("mazurén")) zone = "Mazurén";
  else if (clean.includes("mirandela")) zone = "Mirandela";
  else if (clean.includes("portales del norte")) zone = "Portales del Norte";
  else if (clean.includes("victoria norte")) zone = "Victoria Norte";
  else if (clean.includes("prado veraniego")) zone = "Prado Veraniego";
  else if (clean.includes("la floresta") || clean.includes("floresta")) zone = "La Floresta";
  else if (clean.includes("pontevedra")) zone = "Pontevedra";
  else if (clean.includes("morato")) zone = "Morato";
  else if (clean.includes("alhambra") || clean.includes("la alhambra")) zone = "Alhambra";
  else if (clean.includes("batan") || clean.includes("batán") || clean.includes("el batan")) zone = "Batán";
  else if (clean.includes("pasadena")) zone = "Pasadena";
  else if (clean.includes("ciudad salitre") || clean.includes("salitre")) zone = "Ciudad Salitre";
  else if (clean.includes("modelia")) zone = "Modelia";
  else if (clean.includes("hayuelos")) zone = "Hayuelos";
  else if (clean.includes("fontibon") || clean.includes("fontibón")) zone = "Fontibón";
  else if (clean.includes("nicolas de federmann") || clean.includes("federmann")) zone = "Nicolás de Federmann";
  else if (clean.includes("la esmeralda")) zone = "La Esmeralda";
  else if (clean.includes("quinta paredes")) zone = "Quinta Paredes";
  else if (clean.includes("palermo")) zone = "Palermo";
  else if (clean.includes("teusaquillo")) zone = "Teusaquillo";
  else if (clean.includes("chapinero alto")) zone = "Chapinero Alto";
  else if (clean.includes("chapinero central")) zone = "Chapinero Central";
  else if (clean.includes("chapinero")) zone = "Chapinero";
  else if (clean.includes("usaquen") || clean.includes("usaquén")) zone = "Usaquén";

  if (!zone) {
    try {
      const bounds = parseStreetCarreraBoundaries(text);
      if (bounds.minStreet && bounds.maxStreet) {
        const defaultMaxCra = (bounds.maxStreet <= 100) ? 20 : 45;
        const idecaRes = lookupBarriosByPerimeter({
          calleNorte: bounds.maxStreet,
          calleSur: bounds.minStreet,
          craOriente: bounds.minCarrera || 1,
          craOccidente: bounds.maxCarrera || defaultMaxCra,
          ciudad: "bogota"
        });
        if (idecaRes.barrios && idecaRes.barrios.length > 0) {
          const preferred = idecaRes.barrios.find(b => b.toLowerCase().includes("chico") || b.toLowerCase().includes("cabrera")) || idecaRes.barrios[0];
          zone = preferred;
          if (!city) city = "Bogotá, D.C.";
        }
      }
    } catch (e) {
      // Ignorar error si no se puede resolver perímetro
    }
  }

  // Deducción automática de ciudad para barrios conocidos de Colombia
  if (!city && zone) {
    const matchedItem = KNOWN_BARRIOS_SORTED_ITEMS.find(i => i.canonical.toLowerCase() === zone.toLowerCase());
    if (matchedItem && matchedItem.city) {
      city = matchedItem.city;
    } else if (zone === "Ciudad Meléndez") {
      city = "Cali";
    } else {
      city = "Bogotá, D.C.";
    }
  }

  // ── DETECCIONES DOCTRINALES ESTRUCTURADAS (v31.72) ──
  const noTerceriaMatch = /\b(?:no\s*tercer[ií]a|no\s*tercerias|sin\s*tercer[ií]a|no\s*se\s*acepta\s*tercer[ií]a|comisi[oó]n\s*50[-/]50\s*no\s*tercer[ií]a|solo\s*50[-/]50|no\s*intermediarios|directo\s*con\s*captador)\b/i.test(clean);
  const aceptaTerceria = !noTerceriaMatch;
  const standByDirectoVecy = noTerceriaMatch;

  const requiresObligatoryStudy = /\b(?:con\s*estudio\s*obligatorio|estudio\s*obligatorio|exige\s*estudio|estudio\s*indispensable|estudio\s*(?:ojal[aá]\s*)?cerrado)\b/i.test(clean);
  const hasStudy = requiresObligatoryStudy || clean.includes("estudio") || clean.includes("star de tv") || clean.includes("estar de tv") || clean.includes("sala de tv") || clean.includes("home office");

  const pisoMinMatch = clean.match(/(?:unicamente\s*ven\s*opciones\s*del\s*piso|del\s*piso|piso|pisos)\s*(\d{1,2})\s*(?:hacia\s*arriba|en\s*adelante|o\s*superior|\+|\s*mas)\b/i);
  const pisoMinimo = pisoMinMatch ? parseInt(pisoMinMatch[1], 10) : null;

  const requiresExterior = /\b(?:muy\s*luminoso|vista\s*agradable|vista\s*exterior|exterior\s*muy\s*iluminado|vista\s*panor[aá]mica|exterior|sin\s*interior)\b/i.test(clean);
  const interiorExterior = requiresExterior ? "exterior" : (clean.includes("interior") && !clean.includes("exterior") ? "interior" : null);

  const adminFeeIncluded = /(?:admin(?:istraci[oó]n)?|admon)\s*(?:incluida|inc\b)|(?:con|\+|mas|más)\s*(?:admin(?:istraci[oó]n)?|admon)/i.test(clean);
  const isAmoblado = /\b(?:amoblado|amoblada|con\s*muebles|completamente\s*amoblado|dotado)\b/i.test(clean);

  const result = {
    propertyType,
    transactionType,
    tipoInmuebleDeseado: propertyType,
    tipoNegocioDeseado: transactionType,
    price,
    presupuestoMin: presupuestoMin > 0 ? presupuestoMin : null,
    presupuestoMax: presupuestoMax > 0 ? presupuestoMax : price,
    rentPrice: rentPrice > 0 ? rentPrice : null,
    adminFee: adminFee > 0 ? adminFee : null,
    adminFeeIncluded,
    area,
    areaMin: areaMin > 0 ? areaMin : (area > 0 ? area : null),
    areaMax: areaMax > 0 ? areaMax : (area > 0 ? area : null),
    bedrooms,
    bedroomsMin: bedroomsMin > 0 ? bedroomsMin : (bedrooms > 0 ? bedrooms : null),
    bedroomsMax: bedroomsMax > 0 ? bedroomsMax : (bedrooms > 0 ? bedrooms : null),
    bathrooms,
    garages,
    garageType,
    antiguedadAnos,
    hasBalcony,
    hasTerrace,
    hasStorage,
    hasElevator,
    kitchenType,
    hasServiceRoom,
    floorType,
    sunlightOrientation,
    hasPowerPlant,
    hasVisitorParking,
    hasHeating,
    city,
    ciudadDeseada: city,
    zone,
    zonaDeseada: zone,
    aceptaTerceria,
    standByDirectoVecy,
    requiresObligatoryStudy,
    hasStudy,
    pisoMinimo,
    interiorExterior,
    isAmoblado,
    caracteristicasDeseadas: {
      estudio: requiresObligatoryStudy ? "obligatorio" : (hasStudy ? "deseado" : null),
      pisoMinimo,
      interiorExterior,
      adminFeeIncluded,
      amoblado: isAmoblado ? true : null
    }
  };

  if (cacheKey.length < 5000) {
    if (fallbackDataCache.size > 3000) {
      fallbackDataCache.clear();
    }
    fallbackDataCache.set(cacheKey, result);
  }

  return result;
}

/**
 * Auto-Aprendizaje de Léxico Inmobiliario (Capa B - Glosario Vivo en Supabase)
 */
export async function enrichLexiconFromText(rawText: string): Promise<void> {
  if (!rawText || rawText.length < 15) return;
  const clean = rawText.toLowerCase();

  const patterns = [
    { match: /\b(cbs|cuarto\s+y\s+ba[ñn]o\s+de\s+servicio|alcoba\s+(?:para\s+el\s+)?servicio|cuarto\s+de\s+empleada)\b/i, cat: 'espacio', can: 'cuarto_bano_servicio' },
    { match: /\b(cocina\s+(?:cerrada|abierta|tipo\s+isla|americana))\b/i, cat: 'espacio', can: 'tipologia_cocina' },
    { match: /\b(pisos?\s*(?:en\s*)?(?:madera\s+maciza|madera|laminado|porcelanato|m[aá]rmol|cer[aá]mica))\b/i, cat: 'acabado', can: 'tipo_piso' },
    { match: /\b(luz\s+de\s+(?:la\s+)?ma[ñn]ana|sol\s+de\s+(?:la\s+)?tarde|exterior\s+iluminado)\b/i, cat: 'ambiente', can: 'orientacion_asoleacion' },
    { match: /\b(planta\s+el[eé]ctrica|suplencia\s+total|planta\s+total)\b/i, cat: 'infraestructura', can: 'planta_electrica' },
    { match: /\b(parqueadero\s*(?:para\s*)?visitantes?|parqueo\s+visitantes?)\b/i, cat: 'amenidad', can: 'parqueadero_visitantes' },
    { match: /\b(star\s+de\s+tv|hall\s+de\s+alcobas|estar\s+de\s+tv)\b/i, cat: 'espacio', can: 'estar_television' },
    { match: /\b(calentador\s+de\s+paso|caldera\s+central)\b/i, cat: 'equipamiento', can: 'calentador_agua' },
    { match: /\b(chimenea\s+(?:tradicional|a\s+gas|ecol[oó]gica))\b/i, cat: 'equipamiento', can: 'chimenea' }
  ];

  try {
    const db = await getDb();
    if (!db) return;

    for (const p of patterns) {
      const m = clean.match(p.match);
      if (m && m[1]) {
        const term = m[1].toLowerCase().trim();
        await db.insert(inmobiliarioLexicon).values({
          terminoColoquial: term,
          categoria: p.cat,
          conceptoCanonico: p.can,
          frecuenciaUso: 1,
          origen: 'ia_autodescubierto'
        }).onConflictDoUpdate({
          target: inmobiliarioLexicon.terminoColoquial,
          set: {
            frecuenciaUso: sql`${inmobiliarioLexicon.frecuenciaUso} + 1`,
            updatedAt: new Date()
          }
        });
      }
    }
  } catch (e) {
    // Non-blocking auto-learning
  }
}

export function translatePropertyType(type: string): string {
  const map: Record<string, string> = {
    apartment: "Apartamento",
    house: "Casa",
    building: "Edificio",
    warehouse: "Bodega",
    office: "Oficina",
    farm: "Finca",
    land: "Lote",
    loft: "Loft",
    consultorio: "Consultorio"
  };
  return map[type?.toLowerCase()] || capitalize(type || 'inmueble');
}

export function translateTransactionType(type: string): string {
  const map: Record<string, string> = {
    venta: "VENTA",
    arriendo: "ARRIENDO",
    venta_o_arriendo: "VENTA O ARRIENDO",
    arriendo_temporal: "ARRIENDO TEMPORAL",
    arriendo_con_opcion_de_compra: "ARRIENDO CON OPCIÓN DE COMPRA",
    permuta: "PERMUTA",
    venta_permuta: "VENTA / PERMUTA",
    aporte: "APORTE"
  };
  return map[type?.toLowerCase()] || String(type || 'negocio').toUpperCase();
}

export async function getTimeOfDayGreetingForUser(phone: string, realName: string, alreadyGreeted: boolean, isGroup: boolean = false): Promise<string> {
  const d = new Date();
  const bogotaStr = d.toLocaleString('en-US', { timeZone: 'America/Bogota' });
  const bogotaDate = new Date(bogotaStr);
  const hour = bogotaDate.getHours();

  let salutation = "";
  if (hour >= 5 && hour < 12) {
    salutation = "Buenos días";
  } else if (hour >= 12 && hour < 18) {
    salutation = "Buenas tardes";
  } else {
    salutation = "Buenas noches";
  }

  let nameToUse = realName;
  try {
    const db = await getDb();
    if (db) {
      const [u] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
      if (u && u.name && u.name.trim() !== "") {
        nameToUse = u.name;
      }
    }
  } catch (e) {
    console.warn("[JanIA-Greeting] Error buscando nombre de usuario para saludo:", e);
  }

  const firstName = extractFirstName(nameToUse);

  if (alreadyGreeted) {
    return firstName ? `Mira ${firstName}` : `Mira`;
  } else {
    return firstName ? `${salutation} ${firstName}` : `${salutation}`;
  }
}

export function resolveContactPhone(userId: string, rawText?: string, userName?: string, extractedPhone?: string): string {
  const cleanUserId = userId.split(':')[0].split('@')[0];
  const isLid = isLidIdentifier(cleanUserId) || userId.includes('@lid');

  // 1. Prioridad Máxima: Si en el texto viene un teléfono explícito
  const phoneFromText = extractColombianPhoneFromText(rawText);
  if (phoneFromText) {
    brokerDirectoryCache.set(cleanUserId, { phone: phoneFromText, name: userName });
    if (userName && !isGenericName(userName)) brokerDirectoryCache.set(userName, { phone: phoneFromText, name: userName });
    // Guardar para siempre en la base de datos PostgreSQL
    saveOrUpdateAdvisor({
      phone: phoneFromText,
      name: userName,
      oldPhoneOrLid: cleanUserId,
    }).catch(err => console.warn(`[AdvisorsCore] Auto-registro desde texto:`, err?.message));
    return phoneFromText;
  }

  // 2. Si el LLM extrajo un teléfono válido
  if (extractedPhone) {
    const cleanExt = normalizeAdvisorPhone(extractedPhone);
    if (cleanExt) {
      brokerDirectoryCache.set(cleanUserId, { phone: cleanExt, name: userName });
      saveOrUpdateAdvisor({
        phone: cleanExt,
        name: userName,
        oldPhoneOrLid: cleanUserId,
      }).catch(err => console.warn(`[AdvisorsCore] Auto-registro desde LLM:`, err?.message));
      return cleanExt;
    }
  }

  // 3. Consultar en el directorio permanente de asesores (memoria instantánea 0ms)
  const cached = lookupAdvisorSync(cleanUserId, userName);
  if (cached && cached.phone) {
    return cached.phone;
  }

  // 4. Si el remitente es un teléfono real directo (no LID)
  if (!isLid && (cleanUserId.startsWith('573') || cleanUserId.startsWith('3'))) {
    const p = cleanUserId.startsWith('3') && cleanUserId.length === 10 ? `57${cleanUserId}` : cleanUserId;
    brokerDirectoryCache.set(cleanUserId, { phone: p, name: userName });
    return p;
  }

  return cleanUserId;
}

export function calcularCalificacionCompletitud(extracted: any, isProperty: boolean): { score: number, label: string } {
  if (!extracted) return { score: 0, label: "Mediocre" };

  let fieldsCount = 7;
  let presentCount = 0;

  // 1. Precio (price o presupuestoMax / presupuestoMin)
  const priceVal = isProperty ? extracted.price : (extracted.presupuestoMax || extracted.presupuestoMin || extracted.price);
  if (priceVal !== undefined && priceVal !== null && String(priceVal).trim() !== "" && String(priceVal) !== "0") {
    presentCount++;
  }

  // 2. Área (areaTotal / area / areaMin)
  const areaVal = isProperty ? (extracted.areaTotal || extracted.area) : (extracted.areaMin || extracted.area);
  if (areaVal !== undefined && areaVal !== null && String(areaVal).trim() !== "" && String(areaVal) !== "0") {
    presentCount++;
  }

  // 3. Habitaciones (bedrooms / habitacionesMin)
  const bedroomsVal = isProperty ? extracted.bedrooms : (extracted.habitacionesMin || extracted.bedrooms);
  if (bedroomsVal !== undefined && bedroomsVal !== null && String(bedroomsVal).trim() !== "" && Number(bedroomsVal) > 0) {
    presentCount++;
  }

  // 4. Baños (bathrooms / banosMin)
  const bathroomsVal = isProperty ? extracted.bathrooms : (extracted.banosMin || extracted.bathrooms);
  if (bathroomsVal !== undefined && bathroomsVal !== null && String(bathroomsVal).trim() !== "" && Number(bathroomsVal) > 0) {
    presentCount++;
  }

  // 5. Parqueaderos (garages / parqueaderosMin)
  const garagesVal = isProperty ? extracted.garages : (extracted.parqueaderosMin || extracted.garages);
  if (garagesVal !== undefined && garagesVal !== null && String(garagesVal).trim() !== "" && Number(garagesVal) >= 0) {
    presentCount++;
  }

  // 6. Ubicación exacta (zone / zonaDeseada)
  const zoneVal = isProperty ? extracted.zone : (extracted.zonaDeseada || extracted.zone);
  if (zoneVal !== undefined && zoneVal !== null && String(zoneVal).trim() !== "" && String(zoneVal).toLowerCase() !== "bogotá" && String(zoneVal).toLowerCase() !== "bogota") {
    presentCount++;
  }

  // 7. Contacto (idUsuarioWhatsapp)
  const contactVal = extracted.idUsuarioWhatsapp;
  if (contactVal !== undefined && contactVal !== null && String(contactVal).trim() !== "") {
    presentCount++;
  }

  const score = (presentCount / fieldsCount) * 100;
  let label = "Mediocre";

  if (score < 30) {
    label = "Mediocre";
  } else if (score >= 30 && score < 45) {
    label = "Incompleta";
  } else if (score >= 45 && score < 60) {
    label = "Regular";
  } else if (score >= 60 && score < 70) {
    label = "Mejor";
  } else if (score >= 70 && score < 85) {
    label = "Bien";
  } else if (score >= 85 && score < 95) {
    label = "Perfecta";
  } else {
    label = "Excelente";
  }

  return { score, label };
}

export function getEmojiForCalificacion(calificacion?: string): string {
  switch (calificacion) {
    case "Mediocre":
    case "Incompleta":
    case "DATOS_INCOMPLETOS":
      return "🤔";
    case "Regular":
    case "Mejor":
    case "Bien":
    case "Perfecta":
    case "Excelente":
      return "🟢";
    case "INVALID_LEAD":
    case "VIOLACION_DE_NORMAS":
      return "❌";
    default:
      return "🟢";
  }
}

export function normalizePhoneNumber(rawUserJid: string, textContent?: string): string {
  if (textContent) {
    const match = textContent.match(/(?:\+?57\s*)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/);
    if (match) {
      const cleanDigits = match[0].replace(/\D/g, "");
      if (cleanDigits.length === 10 && cleanDigits.startsWith("3")) {
        return cleanDigits;
      }
      if (cleanDigits.length === 12 && cleanDigits.startsWith("573")) {
        return `+${cleanDigits}`;
      }
    }
  }

  if (rawUserJid) {
    const clean = String(rawUserJid).split('@')[0].split(':')[0].replace(/\D/g, "");
    if (!clean.startsWith("11") && !clean.startsWith("1203") && clean.length <= 13) {
      if (clean.length === 10 && clean.startsWith("3")) {
        return clean;
      }
      if (clean.length === 12 && clean.startsWith("573")) {
        return `+${clean}`;
      }
      if (clean.length >= 10 && clean.length <= 12) {
        return clean;
      }
    }
  }

  return "";
}

export function capitalize(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function sanitizeGeoString(val: any): string {
  if (!val || typeof val !== "string") return "";
  let clean = val.trim();
  clean = clean.split(/\(|\n|Nota:|estimado|según/i)[0].trim();
  clean = clean.replace(/[\.\,\;\:]+$/, "").trim();
  if (clean.length > 60) {
    clean = clean.substring(0, 60).trim();
  }
  return clean;
}

export function sanitizeResponseMarkdown(text: string): string {
  if (!text || typeof text !== "string") return "";

  let clean = text;

  // 1. Reemplazar dobles asteriscos "**" por un solo asterisco "*" para cumplir con el formato nativo de WhatsApp
  clean = clean.replace(/\*\*/g, "*");

  // 2. Erradicar coletillas de ejemplo pegadas a URLs o texto de enlaces (ej. "(ejemplo)", "(link de ejemplo)")
  clean = clean.replace(
    /\s*\((?:ejemplo|link\s+de\s+ejemplo|enlace\s+de\s+ejemplo|ejemplo\s+de\s+enlace)\)/gi,
    ""
  );

  // 3. Erradicar enlaces Markdown dobles donde tanto el texto como el destino son URLs:
  // Ej: [https://chat.whatsapp.com/xyz](https://chat.whatsapp.com/xyz) -> https://chat.whatsapp.com/xyz
  // O con espacios entre corchete y paréntesis: [https://... ] ( https://... )
  clean = clean.replace(
    /\[\s*(https?:\/\/[^\s\]]+)\s*\]\s*\(\s*(https?:\/\/[^\s\)]+)\s*\)/gi,
    (_match, url1, url2) => {
      return url2 || url1;
    }
  );

  // 4. Erradicar enlaces Markdown donde el anchor text es genérico o repetitivo:
  // Ej: [aquí](https://...), [únete aquí](https://...), [enlace](https://...), [link](https://...)
  clean = clean.replace(
    /\[\s*(?:aqu[ií]|link|enlace|haz\s+clic\s+aqu[ií]|click\s+aqu[ií]|clic\s+aqu[ií]|únete\s+aqu[ií]|unete\s+aqu[ií]|ver\s+aqu[ií]|visitar|ingresar|aquí\s+mismo|aqui\s+mismo)\s*\]\s*\(\s*(https?:\/\/[^\s\)]+)\s*\)/gi,
    "$1"
  );

  // 5. Normalizar enlaces Markdown con texto descriptivo:
  // Ej: [Canal Oficial de WhatsApp](https://whatsapp.com/...) -> Canal Oficial de WhatsApp: https://whatsapp.com/...
  clean = clean.replace(
    /\[\s*([^\]]+?)\s*\]\s*\(\s*(https?:\/\/[^\s\)]+)\s*\)/gi,
    (_match, anchorText, url) => {
      const trimmedAnchor = anchorText.trim();
      if (/^https?:\/\//i.test(trimmedAnchor) || trimmedAnchor === url) {
        return url;
      }
      return `${trimmedAnchor}: ${url}`;
    }
  );

  // 6. Erradicar duplicidades adyacentes de URLs (doble enlace idéntico consecutivo):
  // Ej: "https://chat.whatsapp.com/xyz (https://chat.whatsapp.com/xyz)"
  // Ej: "https://chat.whatsapp.com/xyz [https://chat.whatsapp.com/xyz]"
  // Ej: "https://chat.whatsapp.com/xyz https://chat.whatsapp.com/xyz"
  clean = clean.replace(
    /(https?:\/\/[^\s\)\]]+)(?:[\s,]*[\(\[]?\s*\1\s*[\)\]]?)+/gi,
    "$1"
  );

  // 7. Limpiar URLs envueltas innecesariamente en corchetes aislados:
  // Ej: "[https://chat.whatsapp.com/xyz]" -> "https://chat.whatsapp.com/xyz"
  clean = clean.replace(/\[\s*(https?:\/\/[^\s\]]+)\s*\]/gi, "$1");

  // 8. Limpiar paréntesis redundantes cuando una URL está precedida inmediatamente por ":" o un emoji:
  // Ej: "Únete aquí: (https://...)" -> "Únete aquí: https://..."
  // Ej: "👉 (https://...)" -> "👉 https://..."
  clean = clean.replace(/((?::|👉|🔗)\s*)\(\s*(https?:\/\/[^\s\)]+)\s*\)/gi, "$1$2");

  // 9. Corrección de enlaces de grupos de WhatsApp alucinados o ficticios:
  // Si JanIA generó un enlace como "https://chat.whatsapp.com/KxL8w3Z92m61v29Q4jKxL8" (código inexistente):
  // Detectar por contexto del párrafo y reemplazar por el enlace oficial de VECY correspondiente.
  const OFFICIAL_GROUP_CODES = new Set([
    "GzMbjNs1P2tHI7D0V4h8wZ", // Grupo 1
    "J4u1h7NUL1i1B1wAIyTUN6", // Grupo 2
    "CSzrKR6Cr56HAieEhAuqyU"  // Grupo 3
  ]);

  clean = clean.replace(
    /https:\/\/chat\.whatsapp\.com\/([a-zA-Z0-9_-]+)/gi,
    (fullMatch, code) => {
      if (OFFICIAL_GROUP_CODES.has(code)) {
        return fullMatch;
      }
      // Código de grupo no oficial / alucinado por el LLM:
      const cleanLower = clean.toLowerCase();
      if (
        cleanLower.includes("tip") ||
        cleanLower.includes("noticia") ||
        cleanLower.includes("consulta") ||
        cleanLower.includes("legal") ||
        cleanLower.includes("tributari") ||
        cleanLower.includes("leasing") ||
        cleanLower.includes("davivienda") ||
        cleanLower.includes("avaluo") ||
        cleanLower.includes("avalúo") ||
        cleanLower.includes("soporte") ||
        cleanLower.includes("vecy tips")
      ) {
        return "https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6"; // Grupo 2
      }
      if (
        cleanLower.includes("oferta") ||
        cleanLower.includes("demanda") ||
        cleanLower.includes("inmueble") ||
        cleanLower.includes("corretaje") ||
        cleanLower.includes("venta") ||
        cleanLower.includes("arriendo") ||
        cleanLower.includes("captad")
      ) {
        return "https://chat.whatsapp.com/GzMbjNs1P2tHI7D0V4h8wZ"; // Grupo 1
      }
      if (
        cleanLower.includes("proyecto") ||
        cleanLower.includes("comunidad") ||
        cleanLower.includes("debate") ||
        cleanLower.includes("red colaborativa") ||
        cleanLower.includes("40/20/40")
      ) {
        return "https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU"; // Grupo 3
      }
      return "https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6";
    }
  );

  // 10. Limpieza final de espacios antes de URLs precedidas por viñetas/emojis
  clean = clean.replace(/([:👉🔗])\s{2,}(https?:\/\/)/g, "$1 $2");

  // 11. Limpiar puntuación huérfana al inicio del texto (ej. ". Un gusto saludarte" -> "Un gusto saludarte")
  clean = clean.replace(/^[\s\.\,\;\:\-\_]+/, "");

  // 12. Erradicar asteriscos o viñetas huérfanas en renglones aislados (ej. "\n*\n")
  clean = clean.replace(/(?:^|\r?\n)\s*[*_~-]\s*(?=\r?\n|$)/g, "\n");
  clean = clean.replace(/\n{3,}/g, "\n\n");

  // 13. Sanitización léxica notarial y entidades colombianas (Cero alucinaciones tipo SUNT o cascunta)
  clean = clean.replace(/\bSistema\s+[UÚ]nico\s+Nacional\s+de\s+Tr[aá]nsito\b/gi, "Registro Único Nacional de Tránsito (RUNT)");
  clean = clean.replace(/\bSUNT\b/g, "RUNT");
  clean = clean.replace(/\bcascunta\b/gi, "cincuenta");

  return clean.trim();
}

