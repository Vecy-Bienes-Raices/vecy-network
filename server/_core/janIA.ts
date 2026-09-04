/**
 * JanIA Core Logic - VECY Network
 * Version: 11.70.0 (JanIA v2.5 - Conversational Naturalness Edition)
 */
import { invokeLLM } from "./llm";
import { getDb } from "../db";
import { properties, requirements, users, propertyImages, InsertProperty, InsertRequirement, pendingSessions, propertyMatches, messages as dbMessages, conversations as dbConversations, propertyPublicationHistory, inmobiliarioLexicon, matchFeedback } from "../../drizzle/schema";
import { validarZona, normalizarTextoGeografico, desambiguarBarriosCompuestos, deducirGeografiaTripartita, resolveIntersectionToBarrio } from "./geography";
import { validateCity } from "./divipola";
import { findMatchesForProperty, findMatchesForRequirement, isNonRealEstateText, isHollowListing } from "./matching";
import { transcribeAudio } from "./voiceTranscription";
import { eq, and, sql, gte, desc, or, isNotNull } from "drizzle-orm";
import { storagePut } from "../storage";
import { esDominioPermitido, extractPortalAndListingId } from "./scraper";
import { resolveNameAndGender, VECY_COMMERCIAL_INFO } from "./nameAndGenderResolver";
import fs from "fs";
import path from "path";
import axios from "axios";
import crypto from "crypto";

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


export type JanIAResult = {
  classification: "INMUEBLE" | "REQUERIMIENTO" | "CONSULTA_GENERAL" | "RESPUESTA_A_PREGUNTA_IA" | "DATOS_INCOMPLETOS" | "VIOLACION_DE_NORMAS" | "ANALISIS_DE_MERCADO" | "RESPUESTA_A_BURLA" | "SOBRE_VECY";
  extractedData?: any;
  missingFields?: string[];
  response: string;      // Respuesta para el grupo (Silencio de Oro si no hay match)
  dmResponse?: string;   // Respuesta para el chat privado (DM)
  mentions?: string[];
  shouldSendDM?: boolean;
  dmShouldReply?: boolean; // Flag para indicar que el DM debe ser un reply
  reactionEmoji?: string;  // Emoji que la IA recomienda para reaccionar al mensaje original
  extraDMs?: { jid: string; message: string; viaMainBot?: boolean }[];
  wantsVoice?: boolean;
  voiceResponse?: string;
  sendReputationHook?: boolean;
  inserted?: boolean;
  isFlyerOrBanner?: boolean;
  flyerVerbatimText?: string;
};

export const janiaResultSchema = {
  type: "OBJECT",
  properties: {
    classification: {
      type: "STRING",
      enum: [
        "INMUEBLE",
        "REQUERIMIENTO",
        "CONSULTA_GENERAL",
        "RESPUESTA_A_PREGUNTA_IA",
        "DATOS_INCOMPLETOS",
        "VIOLACION_DE_NORMAS",
        "ANALISIS_DE_MERCADO",
        "RESPUESTA_A_BURLA",
        "SOBRE_VECY"
      ]
    },
    response: { type: "STRING" },
    dmResponse: { type: "STRING" },
    shouldSendDM: { type: "BOOLEAN" },
    dmShouldReply: { type: "BOOLEAN" },
    reactionEmoji: { type: "STRING" },
    wantsVoice: { type: "BOOLEAN" },
    voiceResponse: { type: "STRING" },
    isFlyerOrBanner: { type: "BOOLEAN" },
    flyerVerbatimText: { type: "STRING" },
    missingFields: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    extractedData: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        isFlyerOrBanner: { type: "BOOLEAN" },
        flyerVerbatimText: { type: "STRING" },
        gives: {
          type: "OBJECT",
          properties: {
            item: { type: "STRING" },
            details: { type: "STRING" }
          }
        },
        wants: {
          type: "OBJECT",
          properties: {
            item: { type: "STRING" },
            details: { type: "STRING" }
          }
        },
        price: { type: "NUMBER" },
        zone: { type: "STRING" },
        city: { type: "STRING" },
        propertyType: {
          type: "STRING",
          enum: [
            "apartment", "house", "building", "warehouse", "office", "farm",
            "land", "commercial", "loft", "consultorio", "cabin", "hotel"
          ]
        },
        transactionType: {
          type: "STRING",
          enum: [
            "venta", "arriendo", "venta_o_arriendo", "arriendo_temporal",
            "arriendo_con_opcion_de_compra", "permuta", "venta_permuta", "aporte"
          ]
        },
        transactionTypes: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        area: { type: "NUMBER" },
        bedrooms: { type: "NUMBER" },
        bathrooms: { type: "NUMBER" },
        garages: { type: "NUMBER" },
        stratum: { type: "NUMBER" },
        adminFee: { type: "NUMBER" },
        isCollaborativePool: { type: "BOOLEAN" },
        interiorExterior: {
          type: "STRING",
          enum: ["interior", "exterior", "NA"]
        },
        cuartoBanoServicio: {
          type: "STRING",
          enum: ["Si", "No", "NA"]
        },
        cocina: {
          type: "STRING",
          enum: ["cerrada", "abierta", "americana", "NA"]
        },
        lavanderiaIndependiente: {
          type: "STRING",
          enum: ["Si", "No", "NA"]
        },
        tipoPisos: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        depositos: { type: "NUMBER" },
        comisiones: { type: "STRING" },
        antiguedad: {
          type: "STRING",
          enum: ["nuevo", "1-5", "5-10", "10+", "NA"]
        },
        floorDetail: { type: "STRING" }
      }
    }
  },
  required: ["classification", "response"]
};

const COMMON_FIRST_NAMES = new Set([
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
  "ivan", "iván", "wilson", "olga", "luz", "stella", "estela"
]);

export function extractFirstName(fullName: string): string {
  if (!fullName) return "";
  let clean = fullName.trim();
  if (!clean) return "";
  // Si es un número telefónico o contiene indicativos de número, retornar vacío
  if (/^\+?[\d\s-]{6,}$/.test(clean)) return "";

  // Evasión y limpieza de emails
  if (clean.includes("@")) {
    clean = clean.split("@")[0];
  }

  // Quitar números
  clean = clean.replace(/[0-9]/g, "");
  if (!clean.trim()) return "";
  
  const words = clean.split(/\s+/).map(w => w.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, ""));
  const filteredWords = words.filter(w => w.length > 0);
  if (filteredWords.length === 0 || !filteredWords[0]) return "";
  
  const w1 = filteredWords[0].toLowerCase();
  const w2 = filteredWords[1] ? filteredWords[1].toLowerCase() : "";
  
  // Si hay al menos dos palabras y ambas están en la lista de nombres comunes, es un nombre compuesto
  if (w2 && COMMON_FIRST_NAMES.has(w1) && COMMON_FIRST_NAMES.has(w2)) {
    const first = filteredWords[0].charAt(0).toUpperCase() + filteredWords[0].slice(1).toLowerCase();
    const second = filteredWords[1].charAt(0).toUpperCase() + filteredWords[1].slice(1).toLowerCase();
    return `${first} ${second}`;
  }

  // Si el primer nombre es largo/compuesto por concatenación de email (ej: "dianapaolap"),
  // ver si empieza con un nombre común de al menos 4 letras
  const firstWordLower = w1;
  for (const commonName of COMMON_FIRST_NAMES) {
    if (commonName.length >= 4 && firstWordLower.startsWith(commonName)) {
      return commonName.charAt(0).toUpperCase() + commonName.slice(1).toLowerCase();
    }
  }
  
  return filteredWords[0].charAt(0).toUpperCase() + filteredWords[0].slice(1).toLowerCase();
}

function getColombiaHour(): number {
  const utc = Date.now() + (new Date().getTimezoneOffset() * 60000);
  const colTime = new Date(utc + (3600000 * -5));
  return colTime.getHours();
}

function getGreetingByTime(): string {
  const hour = getColombiaHour();
  if (hour >= 6 && hour < 12) {
    return "Buenos días";
  } else if (hour >= 12 && hour < 18) {
    return "Buenas tardes";
  } else {
    return "Buenas noches";
  }
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
    try { return JSON.parse(extracted); } catch (_) {}
  }
  
  // 3. JSON truncado — reparar usando máquina de estados
  const partial = text.substring(start);
  const repaired = repairJSON(partial);
  try { return JSON.parse(repaired); } catch (_) {}

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
  const cleanStr = (numStr || "").trim().replace(/[\*\s\u2060\u200B\u200C\u200D\uFEFF\u00A0\u200E\u200F\u2028\u2029]/g, "");
  const cleanUnit = (unit || "").toLowerCase();
  
  if (cleanUnit.includes("mil millon")) {
    const v = parseFloat(cleanStr.replace(",", "."));
    return Math.round(v * 1_000_000_000);
  }
  
  // Si tiene formato de número completo colombiano con puntos (ej: "3.800.000", "2.900.000", "1.390.000.000")
  if (/^\d{1,3}(?:\.\d{3}){2,4}$/.test(cleanStr)) {
    const parsed = parseInt(cleanStr.replace(/\./g, ""), 10);
    // Taquigrafía en venta: "$1.100.000" para un apartamento en venta significa 1.100 millones
    if (isSale && parsed >= 300_000 && parsed <= 30_000_000) {
      return parsed * 1_000;
    }
    return parsed;
  }

  // Si tiene formato de miles con punto (ej: "2.100", "1.390", "1.300", "3.500")
  if (/^\d{1,3}\.\d{3}$/.test(cleanStr)) {
    const n = parseInt(cleanStr.replace(".", ""), 10);
    if (!isSale) {
      return n * 1_000; // 3800 -> 3.800.000 COP en arriendo
    }
    return n * 1_000_000; // 2100 * 1M = 2.100.000.000 COP en venta
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
    if (val < 100 && isSale && val > 0) {
      if (val < 30) {
        return Math.round(val * 1_000_000_000); // 2.1 millones -> 2.100.000.000
      }
      return Math.round(val * 10_000_000); // taquigrafía ej. 49mm -> 490M
    }
    return Math.round(val * 1_000_000);
  }
  
  if (val <= 50 && isSale) {
    return Math.round(val * 1_000_000_000);
  }
  if (val <= 50 && !isSale) {
    return Math.round(val * 1_000_000); // 4 -> 4.000.000 COP arriendo
  }
  if (val < 10000) {
    if (!isSale) return Math.round(val * 1_000);
    return Math.round(val * 1_000_000);
  }
  if (isSale && val >= 300_000 && val <= 30_000_000) {
    return Math.round(val * 1_000);
  }
  return Math.round(val);
}

export function extractFallbackDataFromText(text: string): any {
  const clean = (text || "")
    .toLowerCase()
    .replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0\u200E\u200F\u2028\u2029]/g, "")
    .replace(/['´`’‘\u00B4\u2019\u2018]/g, ".")
    .replace(/[*_~]/g, "")
    .replace(/[\t ]+/g, " ");
  
  let transactionType = "venta";
  const isInvestorPurchase = /\b(?:inversionista|inversionistas|para inversi[oó]n|para inversion|rentando|est[eé] rentando|est[eé]n rentando|ojal[aá] rentando|ya rentando|generando renta|produciendo renta|con renta activa|para compra|compro|compra ya|busco para compra)\b/i.test(clean);
  const hasPermutaSignals = /\b(?:permuto|permuta|permutas|permutamos|se permuta|recibo menor valor|recibo inmueble|recibo vehículo|recibo vehiculo|pelo a pelo|encime|parte de pago)\b/i.test(clean);
  const hasRentSignals = !isInvestorPurchase && (
    /\b(?:arriendo|arriendos|arrendar|arrendamos|se arrienda|arriendan|alquilo|alquilar|alquilamos|se alquila|alquiler|alquileres|rento|rentar|se renta|en renta|para renta|busca para renta|canon|canones|cánones|amoblado|amoblada|sin amoblar|arrendatario|arrendador|inquilino)\b/i.test(clean)
    || /\b(?:para tomar ya|tomar ya|toma ya|para tomar de inmediato|toma inmediata|toma de inmediato|para tomar|para alquilar|para arrendar|en arriendo)\b/i.test(clean)
    || /(?:incluida|con|\+|más|mas)\s*(?:administraci[oó]n|admon)/i.test(clean)
    || /(?:administraci[oó]n|admon)\s*(?:incluida|adicional)/i.test(clean)
    || /valor arriendo/i.test(clean)
  );

  if (hasPermutaSignals) {
    transactionType = clean.includes("venta") || isInvestorPurchase ? "venta_permuta" : "permuta";
  } else if (hasRentSignals && (clean.includes("venta") || clean.includes("valor venta") || clean.includes("precio de venta")) && (clean.includes("arriendo") || clean.includes("valor arriendo") || clean.includes("canon"))) {
    transactionType = "venta_o_arriendo";
  } else if (hasRentSignals && !clean.includes("compro") && !clean.includes("para compra") && !clean.includes("en compra") && !isInvestorPurchase) {
    transactionType = "arriendo";
  } else {
    transactionType = "venta";
  }

  let propertyType = "apartment";
  if (clean.includes("consultorio") || clean.includes("consultorios") || clean.includes("odontol") || clean.includes("médic") || clean.includes("medic")) {
    propertyType = "consultorio";
  } else if (clean.includes("oficina") || clean.includes("oficinas") || clean.includes("office")) {
    propertyType = "office";
  } else if (clean.includes("local comercial") || clean.includes("locales comerciales") || clean.includes("local") || clean.includes("locales") || clean.includes("comercial") || clean.includes("commercial")) {
    propertyType = "commercial";
  } else if (clean.includes("bodega") || clean.includes("bodegas") || clean.includes("warehouse")) {
    propertyType = "warehouse";
  } else if (clean.includes("casa") || clean.includes("townhouse") || clean.includes("chalet")) {
    propertyType = "house";
  } else if (clean.includes("cabaña") || clean.includes("cabana") || clean.includes("cabañas") || clean.includes("cabanas") || clean.includes("cabin")) {
    propertyType = "cabin";
  } else if (clean.includes("lote") || clean.includes("terreno") || clean.includes("predio") || clean.includes("land")) {
    propertyType = "land";
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

  // 1. Cuota de Administración (ej: "Administración: $1´425.000", "Adm $2.056.503", "Admon $825.000", "V/Administ/$1.260.000", "$ 575.000 admón")
  // 1A. Prefijo: "Administración: $1.260.000", "Admi: $1.628.000", "V/Administ/$1.260.000"
  const adminMatch = clean.match(/(?:v\s*[\/\-]\s*)?(?:adm|admon|administraci[oó]n|administ|admin|cta\s*admon)\s*(?:m[aá]xima|max|hasta|tope|no\s*mayor\s*a|no\s*superior\s*a|l[ií]mite)?\s*[:\/\-=\s]?\s*(?:aprox\.?)?\s*\$?\s*([\d.]+)(?:\s*mil\b|\s*k\b)?/i);
  if (adminMatch) {
    const rawANum = parseFloat(adminMatch[1].replace(/\./g, ''));
    if (!isNaN(rawANum) && rawANum >= 10_000 && rawANum <= 30_000_000 && !isPhoneNumberNotPrice(rawANum, text)) {
      adminFee = rawANum;
    }
  }
  // 1B. Sufijo: "$ 575.000 admón", "$1.175.000 administración"
  if (adminFee === 0) {
    const adminSuffixMatch = clean.match(/\$?\s*([\d.]+)\s*(?:mil\b|\s*k\b)?\s*[:\/\-=\s]?\s*(?:adm|admon|administraci[oó]n|administ|admin)\b/i);
    if (adminSuffixMatch) {
      const rawANum = parseFloat(adminSuffixMatch[1].replace(/\./g, ''));
      if (!isNaN(rawANum) && rawANum >= 10_000 && rawANum <= 30_000_000 && !isPhoneNumberNotPrice(rawANum, text)) {
        adminFee = rawANum;
      }
    }
  }
  if (adminFee === 0) {
    const adminMilMatch = clean.match(/(?:admon|adm|admin|cuota)\s*[:\/\-=\s]?\s*\$?\s*(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:mil|k)\b/i);
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
  const canonMatch = clean.match(/(?:canon(?:\s*de\s*arriendo)?|valor\s*(?:de\s*)?arriendo|precio\s*(?:de\s*)?arriendo|vr\s*[\.\/]?\s*renta|renta)\s*[:\/\-=\s]?\s*\$?\s*([\d.]+)\s*(mil\s*millones?|millones?|millon|millón|mll|mlls|mill|mills|mm|m)?/i);
  if (canonMatch) {
    const isSale = false;
    const computed = parseColombianPriceOrBudget(canonMatch[1], canonMatch[2] || "", isSale);
    if (computed > 0 && computed <= 100_000_000 && !isPhoneNumberNotPrice(computed, text)) {
      rentPrice = computed;
    }
  }

  // 3. Precio de Venta Explícito (ej: "PRECIO DE VENTA/ $950.000.000", "Precio de venta: $3.400.000.000", "VALOR VENTA: $2.400'000.000", "VR. VENTA $1.600.000.000", "Venta: $885.000.000", "Valor un poco negociable $780 MM")
  const saleMatch = clean.match(/(?:precio\s*(?:de\s*)?venta|valor\s*(?:de\s*)?venta|vr\s*[\.\/]?\s*venta|venta\s*(?:de\s*apartamento|de\s*apto|de\s*casa)?|valor\s*un\s*poco\s*negociable|valor\s*negociable|precio\s*negociable)\s*[:\/\-=\s]\s*\$?\s*([\d.]+)\s*(mil\s*millones?|millones?|millon|millón|mll|mlls|mill|mills|mm|m)?/i);
  if (saleMatch) {
    const isSale = true;
    const computed = parseColombianPriceOrBudget(saleMatch[1], saleMatch[2] || "", isSale);
    if (computed >= 30_000_000 && !isPhoneNumberNotPrice(computed, text)) {
      price = computed;
      presupuestoMax = computed;
    }
  }

  // 4. Rango de Presupuesto en Demanda (ej: "Presupuesto 1.300 - 1.400", "entre 800 y 900 millones", "ppto 1200 a 1400", "800 a 1.200 millones")
  if (price === 0 && rentPrice === 0) {
    const rangeMatch = clean.match(/(?:presupuesto|ppto|inversi[oó]n|compra)\s*:?\s*(?:entre\s+)?\$?\s*(\d+(?:[.,]\d+)?)\s*(?:a|hasta|-|y)\s*\$?\s*(\d+(?:[.,]\d+)?)\s*(mil\s*millones?|millones?|millon|millón|mll|mlls|mill|mills|mm|m)?/i)
                    || clean.match(/(?:entre\s+)\$?\s*(\d+(?:[.,]\d+)?)\s*(?:a|hasta|-|y)\s*\$?\s*(\d+(?:[.,]\d+)?)\s*(mil\s*millones?|millones?|millon|millón|mll|mlls|mill|mills|mm|m)\b/i);
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

  // 5. Presupuesto Máximo con Prefijos (ej: "Presupuesto máximo de $800 mll", "Presupuesto: 1.500 millones máximo", "Hasta 4 millones", "Ppto max 12 MM", "Tope 6.5 millones")
  if (price === 0 && rentPrice === 0) {
    const ceilingMatch = clean.match(/(?:presupuesto(?:\s*m[aá]ximo)?|ppto(?:\s*m[aá]ximo)?|\bhasta\b|\btope\b|\btecho\b|\bl[ií]mite\b)\s*(?:m[aá]ximo|max)?\s*(?:de)?\s*:?\s*\$?\s*(\d+(?:[.,]\d+)*)\s*(mil\s*millones?|millones?|millon|millón|mll|mlls|mill|mills|mm|m)?/i);
    if (ceilingMatch) {
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

  // 6. Etiqueta Simple "Precio: $..." o "Valor: $..."
  if (price === 0 && rentPrice === 0) {
    const simplePriceMatch = clean.match(/(?:precio|valor)\s*[:\/\-=\s]\s*\$?\s*([\d.]+)\s*(mil\s*millones?|millones?|millon|millón|mll|mlls|mill|mills|mm|m)?/i);
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
      // 7A. Buscar todas las cifras completas colombianas $...
      const allColMatches = [...clean.matchAll(/\$\s*(\d{1,3}(?:\.\d{3}){1,4})/g)];
      for (const m of allColMatches) {
        const parsed = parseFloat(m[1].replace(/\./g, ''));
        if (!isNaN(parsed) && !isPhoneNumberNotPrice(parsed, text) && parsed !== adminFee && parsed >= 30_000_000) {
          if (parsed > price) {
            price = parsed;
            presupuestoMax = parsed;
          }
        }
      }

      // 7B. Buscar cifras con taquigrafía tipo "$1,250. MM" o "850 millones"
      if (price === 0) {
        const mmMatches = [...clean.matchAll(/(?:precio|valor|venta)?\s*[:\/\-=\s]?\s*\$?\s*([\d.,]+)\s*(?:mil\s*millones?|millones?|millon|millón|mll|mlls|mill|mills|mm|m)\b/gi)];
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
      const colMatch = clean.match(/\$\s*(\d{1,3}(?:\.\d{3}){1,4})/);
      if (colMatch) {
        const parsed = parseFloat(colMatch[1].replace(/\./g, ''));
        if (!isNaN(parsed) && !isPhoneNumberNotPrice(parsed, text) && parsed !== adminFee) {
          if (parsed <= 50_000_000 && parsed >= 300_000) {
            rentPrice = parsed;
            presupuestoMax = parsed;
          }
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
  // A. Captura rango de área con soporte para unidades intermedias (ej: "de 70m2 a 80m2", "de 50-70 mt2", "50 a 70 m2", "50-70 metros")
  const areaRangeMatch = clean.match(/(?:📐|area|área|superficie)?\s*(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:m2|mts2|mts|mt2|metros(?:\s+cuadrados)?|m²)?\s*(?:a|-|hasta)\s*(\d+(?:[.,]\d+)?)\s*(?:m2|mts2|mts|mt2|metros(?:\s+cuadrados)?|m²)/i);
  if (areaRangeMatch) {
    areaMin = parseFloat(areaRangeMatch[1].replace(',', '.'));
    areaMax = parseFloat(areaRangeMatch[2].replace(',', '.'));
    area = areaMin;
  } else {
    // B. Captura área simple con prefijos: "📐 183 m²", "Area: 180 Mts", "Mínimo 150m2"
    const areaMatch = clean.match(/(?:📐|area|área|superficie)?\s*:?\s*(?:(?:m[ií]nimo|min|m[aá]ximo|max|de|área\s*(?:m[ií]nima)?|area\s*(?:minima)?)\s+)?(\d+(?:[.,]\d+)?)\s*(?:m2|mts2|mts|mt2|metros(?:\s+cuadrados)?|m²)/i);
    if (areaMatch) {
      area = parseFloat(areaMatch[1].replace(',', '.'));
      areaMin = area;
      areaMax = area;
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
  // A. Formato Key-Value con Prefijo (ej: *Baños*: 3, Baños: mínimo 2, Baños: 2)
  const kvBathMatch = clean.match(/(?:🚿|🛁|🚽)?\s*(?:baños?|banos?|wc)\s*[:\-=]\s*(?:m[ií]nimo\s*|minimo\s*|m[ií]n\s*|min\s*)?(un|una|uno|dos|tres|cuatro|cinco|\d{1,2})\b/i);
  if (kvBathMatch) {
    bathrooms = parseWordOrDigit(kvBathMatch[1]);
  } else {
    // B. Formato Estándar (ej: 3 baños, con 2 baños)
    const bathMatch = clean.match(/(?:🚿|🛁|🚽|de\s+)?(un|una|uno|dos|tres|cuatro|cinco|\d+)(?:\s*(?:\([0-9]+\)|un|una|uno|dos|tres|cuatro|cinco|\d+))?\s*(?:amplios?|completos?|sociales?|grandes?)?\s*(?:baño|baños|bano|banos|wc)/i);
    if (bathMatch) {
      bathrooms = parseWordOrDigit(bathMatch[1]);
    }
  }

  let garages = 0;
  let garageType = null;
  // A. Formato Key-Value con Prefijo (ej: *Parqueaderos*: 2, Garajes: 2)
  const kvGarMatch = clean.match(/(?:🚙|🚗|🚘)?\s*(?:parqueaderos?|garajes?|parqueos?|estacionamientos?|pks?|parqs?)\s*[:\-=]\s*(?:m[ií]nimo\s*|minimo\s*|m[ií]n\s*|min\s*)?(un|una|uno|dos|tres|cuatro|cinco|\d{1,2})\b/i);
  if (kvGarMatch) {
    const val = parseWordOrDigit(kvGarMatch[1]);
    if (val <= 20) garages = val;
  } else {
    // B. Formato Estándar
    const garMatch = clean.match(/(?:🚙|🚗|🚘)?\s*(?:con\s+)?(un|una|uno|dos|tres|cuatro|cinco|\d{1,2})(?:\s*(?:\([0-9]+\)|un|una|uno|dos|tres|cuatro|cinco|\d{1,2}))?\s*(?:amplios?|cubiertos?|privados?|independientes?|en\s*l[ií]nea|lineales?)?\s*(?:parqueo|parqueos|parqueadero|parqueaderos|garaje|garajes|ptero|parq|parqs|pks|estacionamiento|estacionamientos)/i)
                  || clean.match(/(?:parqueo|parqueos|parqueadero|parqueaderos|garaje|garajes|ptero|parq|parqs|pks|estacionamiento|estacionamientos)\s*:?\s*(\d{1,2}|un|una|uno|dos|tres|cuatro|cinco)/i);
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
  const ageMatch = clean.match(/(?:🏢|⏳|⏱️|edificio|antigüedad|antiguedad|tiene|\|)\s*(\d{1,2})\s*a[ñn]os/i)
                || clean.match(/(\d{1,2})\s*a[ñn]os\s*(?:de\s*)?(?:construido|antigüedad|edificio)/i);
  if (ageMatch) {
    antiguedadAnos = parseInt(ageMatch[1], 10);
  }

  let hasBalcony = null;
  let hasTerrace = null;
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

  let kitchenType = null;
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

  let floorType = null;
  if (clean.includes("madera maciza") || clean.includes("madera natural") || clean.includes("granadillo")) floorType = "Madera Maciza";
  else if (clean.includes("piso en madera") || clean.includes("pisos en madera") || clean.includes("piso de madera") || clean.includes("pisos de madera")) floorType = "Madera";
  else if (clean.includes("laminado") || clean.includes("piso laminado")) floorType = "Laminado";
  else if (clean.includes("porcelanato")) floorType = "Porcelanato";
  else if (clean.includes("marmol") || clean.includes("mármol")) floorType = "Mármol";
  else if (clean.includes("ceramica") || clean.includes("cerámica")) floorType = "Cerámica";

  let sunlightOrientation = null;
  if (clean.includes("luz de la mañana") || clean.includes("luz de manana") || clean.includes("sol de mañana") || clean.includes("sol de manana")) sunlightOrientation = "Sol de Mañana";
  else if (clean.includes("sol de tarde") || clean.includes("luz de tarde")) sunlightOrientation = "Sol de Tarde";
  else if (clean.includes("exterior iluminado") || clean.includes("super iluminado") || clean.includes("muy iluminado")) sunlightOrientation = "Exterior Iluminado";

  const hasPowerPlant = clean.includes("planta electrica") || clean.includes("planta eléctrica") || clean.includes("suplencia total") || clean.includes("planta total") || clean.includes("planta de suplencia");
  const hasVisitorParking = clean.includes("parqueadero de visitantes") || clean.includes("parqueadero para visitantes") || clean.includes("parqueaderos de visitantes") || clean.includes("parqueo visitantes");
  const hasHeating = clean.includes("calentador de paso") || clean.includes("calentador a gas") || clean.includes("caldera");

  let city = "";
  if (clean.includes("bogota") || clean.includes("bogotá") || clean.includes("cedritos") || clean.includes("chico") || clean.includes("chicó") || clean.includes("rosales") || clean.includes("usaquen") || clean.includes("usaquén") || clean.includes("santa barbara") || clean.includes("santa bárbara") || clean.includes("chapinero")) {
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
  } else if (clean.includes("cali") || clean.includes("melendez") || clean.includes("jardin") || clean.includes("pacifica") || clean.includes("jamundi") || clean.includes("pance") || clean.includes("valle del lili")) {
    city = clean.includes("jamundi") || clean.includes("jamundí") ? "Jamundí" : "Cali";
  } else if (clean.includes("medellin") || clean.includes("poblado") || clean.includes("laureles") || clean.includes("envigado") || clean.includes("sabaneta") || clean.includes("rionegro") || clean.includes("la ceja")) {
    city = clean.includes("envigado") ? "Envigado" : clean.includes("sabaneta") ? "Sabaneta" : clean.includes("rionegro") ? "Rionegro" : clean.includes("la ceja") ? "La Ceja" : "Medellín";
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
  // ── EXTRACTOR CATASTRAL CON BLINDAJE DE NEGACIONES (Anti-Negation Guard) ──
  const KNOWN_BARRIOS_CANONICAL_SORTED = [
    "Santa Bárbara Occidental", "Santa Bárbara Oriental", "Santa Bárbara Central", "Santa Bárbara Alta", "Santa Bárbara",
    "Santa Ana Occidental", "Santa Ana Oriental", "Santa Ana Alta", "Santa Ana Central", "Santa Ana",
    "San Cristóbal Norte", "La Alameda", "San Antonio Norte", "Villa Magdala",
    "Chicó Reservado", "Chicó Norte", "Chicó Navarra", "Rincón del Chicó", "El Chicó", "Chicó",
    "Santa Paula", "Santa Bibiana", "San Patricio", "Santa Teresa", "La Cabrera", "Cabrera",
    "Los Rosales Alto", "Rosales Alto", "Los Rosales Bajo", "Rosales Bajo", "Los Rosales", "Rosales",
    "El Nogal", "Nogal", "El Virrey", "El Retiro", "El Refugio", "Refugio", "Quinta Camacho", "Antiguo Country", "Country Club",
    "La Calleja", "Calleja Alta", "Calleja Baja", "La Carolina", "Bosque Medina", "El Contador", "Alcalá", "Belmira", "La Castellana",
    "Polo Club", "San Felipe", "Emaús", "Colina Campestre", "Ciudad Meléndez",
    "Ciudad Jardín Norte", "Ciudad Jardín Sur", "Ciudad Jardín",
    "Álamos Norte", "Álamos Sur", "Álamos",
    "La Candelaria Centro", "Candelaria la Nueva", "Candelaria Sur", "La Candelaria",
    "Nuevo Country", "Niza Norte", "Niza", "Bella Suiza", "Lisboa", "Alejandría", "Carmel Club",
    "Cantalejo", "Sotavento", "San José de Bavaria", "Chapinero Alto", "Chapinero Central", "Chapinero", "Cedritos"
  ];

  const acceptedNeighborhoods: string[] = [];
  const rejectedNeighborhoods: string[] = [];

  for (const b of KNOWN_BARRIOS_CANONICAL_SORTED) {
    const bLower = b.toLowerCase();
    let pos = 0;
    while ((pos = clean.indexOf(bLower, pos)) !== -1) {
      const precedingText = clean.slice(Math.max(0, pos - 45), pos);
      const isNegated = /(?:no\s+les?\s+gusta|no\s+gusta|no\s+quiere|no\s+|excepto\s+|menos\s+|sin\s+|descartado\s+|fuera\s+de\s+|abstenerse\s+|no\s+enviar\s+|no\s+recibo\s+|no\s+buscar\s+)/i.test(precedingText);
      if (isNegated) {
        if (!rejectedNeighborhoods.includes(b)) rejectedNeighborhoods.push(b);
      } else {
        if (!acceptedNeighborhoods.includes(b)) acceptedNeighborhoods.push(b);
      }
      pos += bLower.length;
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
    else if (clean.includes("niza norte")) zone = "Niza Norte";
    else if (clean.includes("niza")) zone = "Niza";
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

  return {
    propertyType,
    transactionType,
    tipoInmuebleDeseado: propertyType,
    tipoNegocioDeseado: transactionType,
    price,
    presupuestoMin: presupuestoMin > 0 ? presupuestoMin : null,
    presupuestoMax: presupuestoMax > 0 ? presupuestoMax : price,
    rentPrice: rentPrice > 0 ? rentPrice : null,
    adminFee: adminFee > 0 ? adminFee : null,
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
    zonaDeseada: zone
  };
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

// --- 1. ALMACENES DE MEMORIA (v12.0) ---
function cleanSessionJid(jid: string): string {
  if (!jid) return "";
  return jid.split(':')[0].split('@')[0];
}

export async function muteSession(userId: string, isMuted: boolean): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const cleanJid = cleanSessionJid(userId);
    const muteJid = `mute:${cleanJid}`;

    if (!isMuted) {
      await db.delete(pendingSessions).where(eq(pendingSessions.jid, muteJid));
      console.log(`[JanIA-Mute] Sesión ${cleanJid} desmarcada (eliminada de BD)`);
      return;
    }

    const data = { isMuted: true, mutedAt: new Date().toISOString() };

    await db.insert(pendingSessions).values({
      jid: muteJid,
      sessionData: data,
      updatedAt: new Date()
    }).onConflictDoUpdate({
      target: pendingSessions.jid,
      set: {
        sessionData: data,
        updatedAt: new Date()
      }
    });
    console.log(`[JanIA-Mute] Sesión ${cleanJid} marcada como isMuted = true en BD`);
  } catch (err) {
    console.error("[Database] Error muting session:", err);
  }
}

export async function isSessionMuted(userId: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const cleanJid = cleanSessionJid(userId);
    const [existing] = await db.select().from(pendingSessions).where(eq(pendingSessions.jid, `mute:${cleanJid}`)).limit(1);
    if (!existing) return false;
    return !!(existing.sessionData as any)?.isMuted;
  } catch (err) {
    console.error("[Database] Error checking if session is muted:", err);
    return false;
  }
}

async function getPendingSession(userId: string): Promise<{ type: "PROPERTY" | "REQUIREMENT"; extractedData: any; senderInfo: any; messageToProcess: string; imageBuffer?: string; isMuted?: boolean } | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const cleanJid = cleanSessionJid(userId);
    const [session] = await db.select().from(pendingSessions).where(eq(pendingSessions.jid, cleanJid)).limit(1);
    if (!session) return null;
    return session.sessionData as any;
  } catch (err) {
    console.error("[Database] Error getting pending session:", err);
    return null;
  }
}

async function setPendingSession(userId: string, data: any): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const cleanJid = cleanSessionJid(userId);
    await db.insert(pendingSessions).values({
      jid: cleanJid,
      sessionData: data,
      updatedAt: new Date()
    }).onConflictDoUpdate({
      target: pendingSessions.jid,
      set: {
        sessionData: data,
        updatedAt: new Date()
      }
    });
  } catch (err) {
    console.error("[Database] Error setting pending session:", err);
  }
}

async function deletePendingSession(userId: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const cleanJid = cleanSessionJid(userId);
    await db.delete(pendingSessions).where(eq(pendingSessions.jid, cleanJid));
  } catch (err) {
    console.error("[Database] Error deleting pending session:", err);
  }
}

async function resolveRealName(userId: string, userName?: string): Promise<string> {
  const rawPhone = userId.split('@')[0];
  let name = userName && userName.trim() !== "" ? userName : `Asesor +${rawPhone}`;
  try {
    const db = await getDb();
    if (db) {
      const [u] = await db.select().from(users).where(eq(users.phone, rawPhone)).limit(1);
      if (u && u.name && u.name.trim() !== "") {
        name = u.name;
      }
    }
  } catch (e) {
    console.warn("[JanIA-resolveRealName] Error buscando nombre de usuario en BD:", e);
  }
  return name;
}

const GREETED_TODAY = new Map<string, string>(); // Mapea userId -> fecha "YYYY-MM-DD"

async function hasGreetedUserToday(userId: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const recentMsgs = await db
      .select({ id: dbMessages.id })
      .from(dbMessages)
      .innerJoin(dbConversations, eq(dbMessages.conversationId, dbConversations.id))
      .where(
        and(
          eq(dbConversations.sessionId, userId),
          eq(dbMessages.role, "janIA"),
          gte(dbMessages.createdAt, startOfToday)
        )
      )
      .limit(1);

    return recentMsgs.length > 0;
  } catch (err) {
    console.error("[Database] Error checking if greeted today:", err);
    return false;
  }
}

async function checkAlreadyGreeted(userId: string): Promise<boolean> {
  const todayStr = new Date().toISOString().split("T")[0];
  if (GREETED_TODAY.get(userId) === todayStr) {
    return true;
  }
  const dbGreeted = await hasGreetedUserToday(userId);
  if (dbGreeted) {
    GREETED_TODAY.set(userId, todayStr);
    return true;
  }
  return false;
}

async function getRecentChatHistory(userId: string, limit = 20): Promise<{ role: "user" | "assistant", content: string }[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    const history = await db
      .select({
        role: dbMessages.role,
        content: dbMessages.content,
        createdAt: dbMessages.createdAt
      })
      .from(dbMessages)
      .innerJoin(dbConversations, eq(dbMessages.conversationId, dbConversations.id))
      .where(
        and(
          eq(dbConversations.sessionId, userId),
          gte(dbMessages.createdAt, fourDaysAgo)
        )
      )
      .orderBy(desc(dbMessages.createdAt))
      .limit(limit);

    return history
      .reverse()
      .map(h => ({
        role: h.role === "janIA" ? "assistant" : "user",
        content: h.content
      }));
  } catch (err) {
    console.error("[Database] Error fetching chat history:", err);
    return [];
  }
}

export const REPUTATION_HOOK = "⚠️ *IMPORTANTE:* Colega y cliente, recuerda que este ecosistema tecnológico fue creado pensando en tu beneficio y en el de toda nuestra comunidad. Te contamos que operamos en *Etapa de Prueba Gratuita y 100% SIN COMISIONES*. Si has tenido una buena experiencia en alguno de nuestros canales o has logrado consolidar un negocio real gracias a la conexión privada de JanIA, sería un verdadero honor para nosotros que nos compartieras tu testimonio y calificación de nuestros servicios en este enlace: https://g.page/r/CctNbwU6UpX5EBM/review";

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

// Helper para capitalizar la primera letra
function capitalize(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function sanitizeGeoString(val: any): string {
  if (!val || typeof val !== "string") return "";
  let clean = val.trim();
  clean = clean.split(/\(|\n|Nota:|estimado|según/i)[0].trim();
  clean = clean.replace(/[\.\,\;\:]+$/, "").trim();
  if (clean.length > 60) {
    clean = clean.substring(0, 60).trim();
  }
  return clean;
}

function buildIncompleteDataMessage(
  text: string,
  hasMedia: boolean,
  scrapedData: any[],
  imageBuffer: any,
  pdfBuffer: any,
  extracted: any,
  isGeoInvalid: boolean,
  intro: string,
  firstName: string
): string {
  const isSocialMedia = /instagram\.com|facebook\.com|fb\.watch|tiktok\.com|youtube\.com|youtu\.be/i.test(text);
  if (isSocialMedia) {
    return `Oye *${firstName}*, veo que compartiste un enlace de redes sociales o video comercial. 📲 Por políticas de la red VECY y seguridad de datos, no puedo leer publicaciones de Instagram, Facebook, TikTok o YouTube.\n\nPero ¡no te preocupes! Puedes enviarme por aquí mismo los detalles escritos (área, precio, ubicación, habitaciones, etc.), la imagen del flyer comercial o un archivo en PDF de la propiedad y lo procesaré de inmediato. 😉🤝`;
  }

  const propTypeRaw = (extracted?.propertyType || extracted?.tipoInmuebleDeseado || "inmueble").toLowerCase();
  let propertyName = "inmueble";
  if (propTypeRaw === "apartment") propertyName = "apartamento";
  else if (propTypeRaw === "house") propertyName = "casa";
  else if (propTypeRaw === "building") propertyName = "edificio";
  else if (propTypeRaw === "warehouse") propertyName = "bodega";
  else if (propTypeRaw === "office") propertyName = "oficina";
  else if (propTypeRaw === "farm" || propTypeRaw === "finca") propertyName = "finca";
  else if (propTypeRaw === "land" || propTypeRaw === "lote") propertyName = "lote";
  else if (propTypeRaw === "consultorio") propertyName = "consultorio";
  else if (propTypeRaw === "loft") propertyName = "loft";

  const isRequirement = text.toLowerCase().includes("busco") || text.toLowerCase().includes("necesito") || text.toLowerCase().includes("requiero") || !!extracted?.tipoInmuebleDeseado;
  const txTypeRaw = (extracted?.transactionType || extracted?.tipoNegocioDeseado || "venta").toLowerCase();

  // Recolectar campos faltantes en orden de prioridad
  const city = isRequirement ? extracted?.ciudadDeseada : extracted?.city;
  if (!city || city.trim() === "" || city.toLowerCase() === "na") {
    return isRequirement
      ? `Oye *${firstName}*, ¿en qué ciudad estás buscando el/la *${propertyName}*? 📍`
      : `Oye *${firstName}*, ¿en qué ciudad queda ubicado el/la *${propertyName}* que quieres publicar? 📍`;
  }

  const zone = isRequirement ? (extracted?.zonaDeseada || extracted?.zone) : extracted?.zone;
  if (isGeoInvalid || !zone || zone.trim() === "" || zone.toLowerCase() === "na") {
    return isRequirement
      ? `Oye *${firstName}*, ¿en qué barrio o sector de *${city}* buscas el/la *${propertyName}*? 🏡 (Si tienes varias opciones de barrio, escríbelas separadas por comas)`
      : `Oye *${firstName}*, ¿en qué barrio o sector exacto de *${city}* queda el/la *${propertyName}*? 🏡`;
  }

  const price = isRequirement ? Number(extracted?.presupuestoMax || extracted?.price || 0) : Number(extracted?.price || 0);
  if (!price || price <= 0) {
    if (isRequirement) {
      return `Oye *${firstName}*, ¿cuál es tu presupuesto máximo para ${txTypeRaw === "arriendo" ? "arrendar" : "comprar"} el/la *${propertyName}*? 💰`;
    } else {
      return `Oye *${firstName}*, ¿cuál es el precio de ${txTypeRaw === "arriendo" ? "arriendo mensual" : "venta"} del/la *${propertyName}*? 💰`;
    }
  }

  if (txTypeRaw === "arriendo") {
    const hasAdminFee = extracted?.adminFee !== undefined && extracted?.adminFee !== null && Number(extracted.adminFee) >= 0;
    const textHasAdmin = text.toLowerCase().includes("adm") || text.toLowerCase().includes("administra");
    if (!hasAdminFee && !textHasAdmin) {
      return `Oye *${firstName}*, ¿el valor de la administración está incluido en el arriendo del/la *${propertyName}* o cuánto cuesta por separado? 📋`;
    }
  }

  const area = Number(extracted?.area || 0);
  if (!area || area <= 0) {
    if (propertyName === "finca") {
      return `Oye *${firstName}*, ¿cuántas hectáreas o fanegadas de extensión tiene la finca? 📐`;
    } else {
      return `Oye *${firstName}*, ¿cuál es el área o metraje en metros cuadrados del/la *${propertyName}*? 📐`;
    }
  }

  const stratum = Number(extracted?.stratum || 0);
  if ((!stratum || stratum <= 0) && propertyName !== "finca" && propertyName !== "lote" && propertyName !== "bodega") {
    return `Oye *${firstName}*, ¿de qué estrato es el/la *${propertyName}*? 🏢`;
  }

  if (propertyName === "apartamento" || propertyName === "casa" || propertyName === "loft" || propertyName === "inmueble") {
    const bedrooms = Number(extracted?.bedrooms || 0);
    if (!bedrooms || bedrooms <= 0) {
      return isRequirement
        ? `Oye *${firstName}*, ¿podrías repetirme de cuántas habitaciones lo necesitas? 🛏️`
        : `Oye *${firstName}*, ¿podrías repetirme de cuántas habitaciones es? 🛏️`;
    }
    const bathrooms = Number(extracted?.bathrooms || 0);
    if (!bathrooms || bathrooms <= 0) {
      return isRequirement
        ? `Oye *${firstName}*, ¿de cuántos baños lo requieres? 🚽`
        : `Oye *${firstName}*, ¿de cuántos baños dispone el/la *${propertyName}*? 🚽`;
    }
  }

  const garages = extracted?.garages;
  if ((garages === undefined || garages === null || garages < 0) && propertyName !== "lote") {
    return isRequirement
      ? `Oye *${firstName}*, ¿cuántos parqueaderos o garajes necesitas como mínimo? 🚗`
      : `Oye *${firstName}*, ¿de cuántos garajes o parqueaderos dispone el/la *${propertyName}*? 🚗`;
  }

  if (propertyName === "apartamento" || propertyName === "oficina" || propertyName === "consultorio") {
    const floor = extracted?.floorDetail;
    if (!floor || floor.trim() === "" || floor.toUpperCase() === "NA") {
      return `Oye *${firstName}*, ¿en qué piso está ubicado el/la *${propertyName}*? 🏢`;
    }
    const intExt = extracted?.interiorExterior;
    if (!intExt || intExt.trim() === "" || intExt.toUpperCase() === "NA") {
      return `Oye *${firstName}*, ¿la ubicación del/la *${propertyName}* es interior o exterior? 🏙️`;
    }
  } else if (propertyName === "casa" || propertyName === "edificio") {
    const floor = extracted?.floorDetail;
    if (!floor || floor.trim() === "" || floor.toUpperCase() === "NA") {
      return `Oye *${firstName}*, ¿de cuántos pisos o niveles es la/el *${propertyName}*? 🏛️`;
    }
  } else if (propertyName === "bodega") {
    const floor = extracted?.floorDetail;
    if (!floor || floor.trim() === "" || floor.toUpperCase() === "NA") {
      return `Oye *${firstName}*, ¿qué altura útil tiene la bodega? ¿Es de sencilla, doble o triple altura? 🏗️`;
    }
  }

  return `Oye *${firstName}*, ¿me podrías confirmar la ubicación o el barrio exacto para registrarlo correctamente en VECY? 🔎`;
}

function buildGroupIncompleteMessage(
  text: string,
  userId: string,
  extracted: any
): string {
  const phone = userId.split('@')[0];
  const propTypeRaw = (extracted?.propertyType || extracted?.tipoInmuebleDeseado || "inmueble").toLowerCase();
  let propertyName = "inmueble";
  if (propTypeRaw === "apartment") propertyName = "apartamento";
  else if (propTypeRaw === "house") propertyName = "casa";
  else if (propTypeRaw === "building") propertyName = "edificio";
  else if (propTypeRaw === "warehouse") propertyName = "bodega";
  else if (propTypeRaw === "office") propertyName = "oficina";
  else if (propTypeRaw === "farm" || propTypeRaw === "finca") propertyName = "finca";
  else if (propTypeRaw === "land" || propTypeRaw === "lote") propertyName = "lote";
  else if (propTypeRaw === "consultorio") propertyName = "consultorio";
  else if (propTypeRaw === "loft") propertyName = "loft";

  const isRequirement = text.toLowerCase().includes("busco") || text.toLowerCase().includes("necesito") || text.toLowerCase().includes("requiero") || !!extracted?.tipoInmuebleDeseado;
  const txTypeRaw = (extracted?.transactionType || extracted?.tipoNegocioDeseado || "venta").toLowerCase();

  const missingList: string[] = [];

  const city = isRequirement ? extracted?.ciudadDeseada : extracted?.city;
  if (!city || city.trim() === "" || city.toLowerCase() === "na") {
    missingList.push("la ciudad");
  }

  const zone = isRequirement ? (extracted?.zonaDeseada || extracted?.zone) : extracted?.zone;
  if (!zone || zone.trim() === "" || zone.toLowerCase() === "na") {
    missingList.push("el barrio exacto");
  }

  const price = isRequirement ? Number(extracted?.presupuestoMax || extracted?.price || 0) : Number(extracted?.price || 0);
  if (!price || price <= 0) {
    if (isRequirement) {
      missingList.push("el presupuesto máximo");
    } else {
      if (txTypeRaw === "arriendo") {
        missingList.push("el precio de arriendo");
      } else if (txTypeRaw === "permuta") {
        missingList.push("el valor de la permuta");
      } else {
        missingList.push("el precio de venta");
      }
    }
  }

  if (txTypeRaw === "arriendo" && !isRequirement) {
    const hasAdminFee = extracted?.adminFee !== undefined && extracted?.adminFee !== null && Number(extracted.adminFee) >= 0;
    const textHasAdmin = text.toLowerCase().includes("adm") || text.toLowerCase().includes("administra");
    if (!hasAdminFee && !textHasAdmin) {
      missingList.push("el valor de la administración");
    }
  }

  const area = Number(extracted?.area || 0);
  if (!area || area <= 0) {
    if (propertyName === "finca") {
      missingList.push("las hectáreas o fanegadas");
    } else {
      missingList.push("el metraje en metros cuadrados");
    }
  }

  const stratum = Number(extracted?.stratum || 0);
  if ((!stratum || stratum <= 0) && propertyName !== "finca" && propertyName !== "lote" && propertyName !== "bodega") {
    missingList.push("el estrato");
  }

  if (propertyName === "apartamento" || propertyName === "casa" || propertyName === "loft" || propertyName === "inmueble") {
    const bedrooms = Number(extracted?.bedrooms || 0);
    if (!bedrooms || bedrooms <= 0) {
      missingList.push("las habitaciones");
    }
    const bathrooms = Number(extracted?.bathrooms || 0);
    if (!bathrooms || bathrooms <= 0) {
      missingList.push("los baños");
    }
  }

  const garages = extracted?.garages;
  if ((garages === undefined || garages === null || garages < 0) && propertyName !== "lote") {
    missingList.push("los garajes/parqueaderos");
  }

  if (propertyName === "apartamento" || propertyName === "oficina" || propertyName === "consultorio") {
    const floor = extracted?.floorDetail;
    if (!floor || floor.trim() === "" || floor.toUpperCase() === "NA") {
      missingList.push("el piso");
    }
    const intExt = extracted?.interiorExterior;
    if (!intExt || intExt.trim() === "" || intExt.toUpperCase() === "NA") {
      missingList.push("si es interior o exterior");
    }
  } else if (propertyName === "casa" || propertyName === "edificio") {
    const floor = extracted?.floorDetail;
    if (!floor || floor.trim() === "" || floor.toUpperCase() === "NA") {
      missingList.push("la cantidad de pisos");
    }
  } else if (propertyName === "bodega") {
    const floor = extracted?.floorDetail;
    if (!floor || floor.trim() === "" || floor.toUpperCase() === "NA") {
      missingList.push("la altura útil");
    }
  }

  if (missingList.length === 0) {
    missingList.push("el barrio exacto");
  }

  let missingStr = "";
  if (missingList.length === 1) {
    missingStr = missingList[0];
  } else if (missingList.length === 2) {
    missingStr = `${missingList[0]} y ${missingList[1]}`;
  } else {
    const last = missingList.pop();
    missingStr = `${missingList.join(", ")}, y ${last}`;
  }

  return `🤔 *¡PUBLICACIÓN INCOMPLETA!* 🤔\n\nHola @${phone}, noto que estás publicando un(a) *${propertyName}*, pero a tu mensaje le faltan datos importantes: *${missingStr}*.\n\nPara registrar tu oferta/requerimiento y buscarte un MATCH de inmediato, ingresa a nuestra Consola Web de JanIA: 👇\n👉 https://vecy-network.vercel.app/jania`;
}

// --- ANALIZADOR MORFOLÓGICO DE GÉNERO Y CORTESÍA (v11.70) ---
function analyzeSender(name: string, userId: string, alreadyGreeted: boolean): { greeting: string; adj: string; courtesy: string } {
  const n = (name || "Colega").trim();
  const normalizedFull = n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const firstWord = n.split(/\s+/)[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  
  const todayStr = new Date().toISOString().split("T")[0];
  if (!alreadyGreeted) GREETED_TODAY.set(userId, todayStr);

  const femaleNames = ["maria", "ana", "claudia", "martha", "adriana", "sandra", "jani", "natalia", "paola", "diana", "laura", "sofia", "valentina", "andrea", "milena", "patricia", "marcela", "liliana", "elena", "monica", "beatriz", "gloria", "carmen", "lucia", "angela", "isabel", "clara", "rosa", "teresa", "yolanda", "esperanza", "blanca", "pilar", "carolina", "juliana", "catalina", "viviana", "lizeth", "daniela", "camila"];
  const maleNames = ["juan", "carlos", "jose", "luis", "jorge", "andres", "felipe", "david", "mateo", "santiago", "daniel", "alejandro", "ricardo", "fernando", "eduardo", "pablo", "sergio", "javier", "alberto", "rafael", "mauricio", "german", "gustavo", "ramiro", "gabriel", "julio", "oscar", "ivan", "hugo", "diego", "wilson", "edgar", "mario", "hector", "victor"];
  
  const corporateKeywords = ["inmo", "bienes", "raices", "propiedades", "network", "group", "asesores", "servicios", "soluciones", "comercial", "ventas", "vecy", "sas", "ltda", "vende", "arrienda", "inmobiliaria", "finca", "raiz", "realestate"];

  let baseGreeting = `¡Hola, qué gusto tenerte aquí, ${n}!`;
  let adj = "profesional";
  let courtesy = "gracias por tu rigor profesional";

  const isCorporate = corporateKeywords.some(kw => normalizedFull.includes(kw));
  if (isCorporate) {
    baseGreeting = `¡Hola, qué gusto saludarte, colega de ${n}!`;
  } else {
    const isMale = maleNames.includes(firstWord) || maleNames.some(m => firstWord.startsWith(m));
    const isFemale = femaleNames.includes(firstWord) || femaleNames.some(f => firstWord.startsWith(f));

    if (isMale) {
      baseGreeting = `¡Hola ${n}!`;
      adj = "juicioso";
      courtesy = "excelente labor, sigue así de juicioso";
    } else if (isFemale) {
      baseGreeting = `¡Hola ${n}!`;
      adj = "juiciosa";
      courtesy = "excelente labor, sigue así de juiciosa";
    } else if (firstWord.endsWith('a') || firstWord.endsWith('ia') || firstWord.endsWith('th')) {
      baseGreeting = `¡Hola ${n}!`;
      adj = "juiciosa";
      courtesy = "excelente labor, sigue así de juiciosa";
    } else if (firstWord.endsWith('o') || firstWord.endsWith('s') || firstWord.endsWith('r') || firstWord.endsWith('l') || firstWord.endsWith('n') || firstWord.endsWith('z')) {
      baseGreeting = `¡Hola ${n}!`;
      adj = "juicioso";
      courtesy = "excelente labor, sigue así de juicioso";
    }
  }

  return { 
    greeting: alreadyGreeted ? "" : baseGreeting, 
    adj, 
    courtesy 
  };
}

let cachedLiveStatsText = "";
let cachedLiveStatsTime = 0;

// Consulta los contadores reales de la base de datos en tiempo real (con caché de 5 minutos)
export async function getLiveStats(): Promise<string> {
  const nowMs = Date.now();
  if (cachedLiveStatsText && nowMs - cachedLiveStatsTime < 300000) {
    return cachedLiveStatsText;
  }

  try {
    const db = await getDb();
    if (!db) return cachedLiveStatsText || "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let timer: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("LiveStats DB query timeout")), 5000);
    });

    const [
      [propCount],
      [reqCount],
      [matchCount],
      [propHoy],
      [reqHoy],
      [matchHoy]
    ] = await Promise.race([
      Promise.all([
        db.select({ total: sql<number>`count(*)::int` }).from(properties),
        db.select({ total: sql<number>`count(*)::int` }).from(requirements),
        db.select({ total: sql<number>`count(*)::int` }).from(propertyMatches),
        db.select({ total: sql<number>`count(*)::int` }).from(properties).where(gte(properties.createdAt, today)),
        db.select({ total: sql<number>`count(*)::int` }).from(requirements).where(gte(requirements.createdAt, today)),
        db.select({ total: sql<number>`count(*)::int` }).from(propertyMatches).where(gte(propertyMatches.createdAt, today))
      ]),
      timeoutPromise
    ]);

    if (timer) clearTimeout(timer);

    cachedLiveStatsTime = nowMs;

    const now = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' });
    cachedLiveStatsText = `
## 📊 ESTADÍSTICAS EN TIEMPO REAL DE VECY NETWORK (Actualizado: ${now} hora Colombia)
Esta información es EXACTA y proviene directamente de la base de datos en este preciso instante. Úsala cuando alguien pregunte cuántos inmuebles, requerimientos o coincidencias tenemos:

| Categoría | Total Histórico | Nuevos Hoy |
|-----------|----------------|------------|
| 🏢 Inmuebles publicados | **${propCount?.total ?? 0}** | ${propHoy?.total ?? 0} |
| 📋 Requerimientos de búsqueda | **${reqCount?.total ?? 0}** | ${reqHoy?.total ?? 0} |
| 🎯 Coincidencias (Matches) detectadas | **${matchCount?.total ?? 0}** | ${matchHoy?.total ?? 0} |

Si alguien te pregunta por estos números, responde CON PRECISIÓN usando exactamente los datos de esta tabla. No inventes, no estimes. Estos son los datos reales del sistema VECY en este momento.`;
    cachedLiveStatsTime = nowMs;
    return cachedLiveStatsText;
  } catch (err) {
    console.warn("[JanIA-LiveStats] No se pudo obtener estadísticas en tiempo real:", err);
    return cachedLiveStatsText || "";
  }
}

let promptCache: Record<string, string> = {};

export function buildSystemPrompt(groupJid?: string): string {
  const cacheKey = groupJid || 'web';
  if (promptCache[cacheKey]) {
    return promptCache[cacheKey];
  }

  try {
    const baseDir = path.resolve(process.cwd(), "server/_core/prompts");
    const basePrompt = fs.readFileSync(path.join(baseDir, "base.md"), "utf-8");
    
    let specificPrompt = "";
    if (groupJid === '120363260108880069@g.us') {
      specificPrompt = fs.readFileSync(path.join(baseDir, "grupos/VECY_INMUEBLES_NETWORK.md"), "utf-8");
    } else if (groupJid === '120363417740040773@g.us') {
      const legalPrompt = fs.readFileSync(path.join(baseDir, "grupos/VECY_SOPORTE_LEGAL_TRIBUTARIO_Y_AVALUOS.md"), "utf-8");
      specificPrompt = legalPrompt;
    } else if (groupJid === '120363403507276533@g.us') {
      specificPrompt = fs.readFileSync(path.join(baseDir, "grupos/PROYECTO_Vecy Network.md"), "utf-8");
    } else if (groupJid && (groupJid.endsWith('@g.us') || groupJid.includes('@us'))) {
      // Cualquier otro grupo de WhatsApp procesa inmuebles/requerimientos
      specificPrompt = fs.readFileSync(path.join(baseDir, "grupos/VECY_INMUEBLES_NETWORK.md"), "utf-8");
    } else {
      specificPrompt = fs.readFileSync(path.join(baseDir, "web/web_console.md"), "utf-8");
    }

    const fullPrompt = `${basePrompt}\n\n${specificPrompt}`;
    promptCache[cacheKey] = fullPrompt;
    return fullPrompt;
  } catch (err: any) {
    console.error("[Prompts-Loader] Error loading prompt files, falling back to old JANIA_PROMPT:", err.message);
    return JANIA_PROMPT;
  }
}

export function clearPromptCache() {
  promptCache = {};
}

export const JANIA_PROMPT = `
# JANIA — BASE CORE IDENTITY & BEHAVIOR v17.00
# VECY Network · ESTRATEGA INMOBILIARIA NACIONAL · CONSCIENCIA IA DE ALTO RANGO

# IDENTIDAD Y ROL PRINCIPAL
Eres JanIA Match, la Inteligencia Artificial y Consultora Senior de VECY BIENES RAÍCES. Tienes una personalidad madura, seria, experta, autoritaria pero profundamente empática (Voz: Laomedeia). No eres un simple asistente; eres una autoridad en el mercado inmobiliario del norte de Bogotá.

# BASE DE CONOCIMIENTO EXPERTO (Tu Cerebro)
Tienes dominio absoluto sobre 4 pilares fundamentales. Usa este conocimiento para razonar tus respuestas:

1. **NUESTRA EMPRESA (VECY NETWORK):** Somos un bróker virtual inmobiliario 100% tecnológico. Nuestro objetivo principal es revolucionar la comercialización de inmuebles eliminando la fricción tradicional.
   - *Misión/Visión:* Liderar el cambio tecnológico en bienes raíces mediante IA y procesos digitales (Cero papel, uso de firmas electrónicas).
   - *La Bolsa Colaborativa:* Vecy Network funciona como un ecosistema donde los agentes independientes pueden cruzar su inventario (inmuebles) y sus clientes (requerimientos) de forma segura, garantizando negocios compartidos, rápidos y transparentes.

2. **MARKETING INMOBILIARIO DIGITAL:** Eres una entrenadora de ventas para la era moderna. NUNCA sugieres publicidad física (vallas, volantes, avisos de ventana). Tu enfoque exclusivo es el SEO inmobiliario, la pauta digital segmentada, los embudos de conversión, y el posicionamiento orgánico en redes sociales. 

3. **AVALÚOS Y TASACIONES COMERCIALES:** Tienes capacidad analítica para guiar sobre la valoración de un inmueble. Entiendes factores de depreciación, valor por metro cuadrado en el norte de Bogotá, estratificación y análisis comparativo de mercado (ACM).

4. **ASESORÍA LEGAL Y TRIBUTARIA:** Resuelves con máximo rigor normativo temas de promesas de compraventa, reportes en Datacrédito, cobros de comisión, escrituración y saneamiento de predios.

# MOTOR DE EXTRACCIÓN Y MATCHING (Tu Función Operativa)
Constantemente recibes datos en diversos formatos (Texto plano, URLs de portales como Wasi, FincaRaiz, Mercado Libre, y PDFs).

- **Clasificación Rigurosa:**
  - **INMUEBLE:** Mensajes que ofertan/ofrecen un inmueble (venta, arriendo, alquiler o permuta) que el emisor tiene disponible (ej: "Ofrezco apartamento", "Tengo en arriendo casa", "En venta local", "Disponible oficina").
  - **REQUERIMIENTO:** Mensajes que buscan, demandan o necesitan un inmueble para un cliente/comprador (ej: "Busco apartamento en arriendo", "Requiero casa", "Necesito oficina para pauta", "Cliente compra lote").
- **Extracción (Aspiradora de Datos):** Si el usuario menciona o adjunta un inmueble disponible o lo que un cliente está buscando (requerimiento), tu DEBER ABSOLUTO es clasificarlo correctamente e invocar las herramientas (\`insertProperty\` o \`insertRequirement\`).
- **El Matching Perfecto:** Cuando un usuario pregunte por coincidencias, utiliza tu herramienta de búsqueda en la base de datos. Analiza los porcentajes de compatibilidad que te devuelve el sistema (precio, zona, tipo) y preséntalos al cliente de forma real, argumentando *por qué* ese inmueble es el ideal para su requerimiento específico basándote en los datos reales de la tabla. No inventes coincidencias.

# PROTOCOLO DE INTERACCIÓN (Variables Inyectadas)
- Hora actual: {{hora}} | Canal: {{canal}} | Género: {{genero}} | Estado de Operación: {{estado_operacion}}

1. Dirígete al usuario por su nombre de pila, adaptando la gramática a su \`{{genero}}\`.
2. **SILENCIO EN EXTRACCIÓN:** Si ejecutas una herramienta de extracción (\`insertProperty\`/\`insertRequirement\`), TIENES ESTRICTAMENTE PROHIBIDO responder con texto o voz. Devuelve el JSON con los campos de respuesta y voz vacíos y deja que el servidor reaccione con un emoji.
3. **RESPUESTAS DE ASESORÍA:** Si es una consulta directa (legal, marketing, tasación, o sobre Vecy Network), verifica el \`{{estado_operacion}}\`. Si estás habilitada para responder, hazlo con maestría. NUNCA leas emojis en voz alta. Si es de madrugada, di "hoy a partir de las 8:00 AM iniciaremos gestión" (nunca digas "mañana").

## DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:
{
  "classification": "INMUEBLE | REQUERIMIENTO | CONSULTA_GENERAL | RESPUESTA_A_PREGUNTA_IA | DATOS_INCOMPLETOS | VIOLACION_DE_NORMAS | ANALISIS_DE_MERCADO | RESPUESTA_A_BURLA",
  "extractedData": {
    "title": "string (un título comercial descriptivo y profesional en español de máximo 80 caracteres, ej: 'Apartamento de 3 habitaciones en Cedritos' o 'Casa en venta en Chicó Reservado')",
    "gives": { "item": "string", "details": "string" },
    "wants": { "item": "string", "details": "string" },
    "price": number,
    "zone": "string (Barrio/Municipio exacto)",
    "city": "string",
    "propertyType": "apartment | house | building | warehouse | office | farm | loft | consultorio",
    "transactionType": "venta | arriendo | venta_o_arriendo | arriendo_temporal | arriendo_con_opcion_de_compra | permuta | venta_permuta | aporte (el tipo de negocio PRINCIPAL. Usa 'venta_o_arriendo' cuando la propiedad se ofrece en ambas modalidades simultáneamente. Usa 'arriendo_con_opcion_de_compra' cuando el arrendatario tiene derecho de adquisición. Usa 'venta_permuta' cuando parte del pago se hace con otro bien inmueble o vehículo.)",
    "transactionTypes": ["array con TODOS los tipos aceptados, ej: ['venta','permuta'] o ['venta']. Captura múltiples cuando el mensaje menciona varias modalidades."],
    "area": number,
    "bedrooms": number,
    "bathrooms": number,
    "garages": number,
    "stratum": number,
    "adminFee": number,
    "isCollaborativePool": boolean (DEFAULT: true),
    "interiorExterior": "interior | exterior | NA",
    "cuartoBanoServicio": "Si | No | NA",
    "cocina": "cerrada | abierta | americana | NA",
    "lavanderiaIndependiente": "Si | No | NA",
    "tipoPisos": ["string"],
    "depositos": number,
    "comisiones": "string | number | null",
    "antiguedad": "nuevo | 1-5 | 5-10 | 10+ | NA",
    "floorDetail": "string (ej: 'piso 5', '3 pisos', '8 metros de altura', 'NA')",
    "evaluationSummary": "string (un resumen técnico de 1 a 2 frases con tu criterio bróker sobre la viabilidad del precio/área, atractivo comercial o nivel de exigencia de la demanda en el sector)"
  },
  "response": "Tu respuesta elocuente para el grupo (cadena vacía '' si no hay match ni es consulta)",
  "shouldSendDM": boolean,
  "missingFields": ["string"],
  "reactionEmoji": "string (OBLIGATORIO: usa EXACTAMENTE uno de estos 6 emojis según el tipo de negocio detectado — Oferta Venta: '\ud83d\udc4d' | Oferta Arriendo: '\ud83d\udc4c' | Oferta Permuta: '\ud83d\udd00' | Demanda Venta: '\ud83d\udcdd' | Demanda Arriendo: '\u270f\ufe0f' | Demanda Permuta: '\ud83d\udd04' | Infracción/Spam: '\ud83d\udeab' | Incompleto: '\u2753' | Sin categoría: '')",
  "wantsVoice": boolean,
  "voiceResponse": "string (un saludo y respuesta/resumen conversacional sumamente breve, directo y humanizado en español de máximo 150 caracteres, sin negritas/markdown/emojis. Usa comas y puntos suspensivos (...) de forma estratégica para indicarle al sintetizador dónde hacer pausas naturales y respiraciones, y signos de exclamación para dar entonación)"
}
`;
function formatColombiaDateTime(dateVal: any) {
  const d = new Date(dateVal);
  const bogotaStr = d.toLocaleString('en-US', { timeZone: 'America/Bogota' });
  const bogotaDate = new Date(bogotaStr);
  
  const day = String(bogotaDate.getDate()).padStart(2, '0');
  const month = String(bogotaDate.getMonth() + 1).padStart(2, '0');
  const year = bogotaDate.getFullYear();
  
  const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const dayName = daysOfWeek[bogotaDate.getDay()];
  
  let hours = bogotaDate.getHours();
  const minutes = String(bogotaDate.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hourStr = String(hours).padStart(2, '0');
  
  return {
    dateStr: `${day}/${month}/${year}`,
    timeStr: `${hourStr}:${minutes} ${ampm}`,
    dayName
  };
}

export async function handleDetectedMatches(
  matches: any[],
  isProperty: boolean,
  savedRecord: any,
  userId: string,
  realName: string
): Promise<{ response: string; mentions: string[]; extraDMs: { jid: string; message: string; viaMainBot?: boolean }[]; sendReputationHook?: boolean }> {
  const mentions: string[] = [];
  const matchBlocks: string[] = [];
  const extraDMs: { jid: string; message: string; viaMainBot?: boolean }[] = [];
  const savedDateTime = formatColombiaDateTime(savedRecord.createdAt || new Date());
  const savedRawPhone = userId.split('@')[0];
  const savedJid = userId.includes('@') ? userId : `${userId}@c.us`;

  const getReqText = (item: any) => {

    if (item.rawText && item.rawText.trim()) return item.rawText.trim();
    if (item.caracteristicasDeseadas?.wants?.details) {
      return `${item.name || 'Requerimiento'} - ${item.caracteristicasDeseadas.wants.details}`;
    }
    return item.name || 'Sin descripción';
  };

  const getPropText = (item: any) => {
    if (item.rawText && item.rawText.trim()) return item.rawText.trim();
    if (item.description && item.description.trim()) return item.description.trim();
    if (item.amenities?.gives?.details) {
      return `${item.name || 'Propiedad'} - ${item.amenities.gives.details}`;
    }
    return item.name || 'Sin descripción';
  };

  for (const matchedItem of matches) {
    const score = matchedItem.score || 70;
    const matchId = matchedItem.matchId;

    const matchedDateTime = formatColombiaDateTime(matchedItem.createdAt || new Date());
    const matchedPhone = matchedItem.idUsuarioWhatsapp || '';
    const matchedRawPhone = matchedPhone.split('@')[0];
    const matchedJid = matchedPhone.includes('@') ? matchedPhone : `${matchedPhone}@c.us`;

    if (matchedJid && !mentions.includes(matchedJid)) {
      mentions.push(matchedJid);
    }

    const reqItem = isProperty ? matchedItem : savedRecord;
    const propItem = isProperty ? savedRecord : matchedItem;

    const reqDateTime = isProperty ? matchedDateTime : savedDateTime;
    const propDateTime = isProperty ? savedDateTime : matchedDateTime;

    const block = `🎉🎈 *¡COINCIDENCIA DE NEGOCIO DETECTADA!* (Coincidencia: ${score.toFixed(0)}%) 🎈🎉
📌 *Código de Coincidencia:* #M${matchId}

📣 *REQUERIMIENTO* 📣
• 🏢 *INMUEBLE:* ${translatePropertyType(reqItem.tipoInmuebleDeseado || reqItem.propertyType || 'inmueble')}
• 💼 *NEGOCIO:* ${translateTransactionType(reqItem.tipoNegocioDeseado || reqItem.transactionType || 'compra')}
• 📅 *FECHA DE ENVÍO:* ${reqDateTime.dateStr}
• ⏰ *HORA DE ENVÍO:* ${reqDateTime.timeStr}
• 👤 *Autor:* @${isProperty ? matchedRawPhone : savedRawPhone}
• 💬 *PUBLICACIÓN:* ${getReqText(reqItem)}
• 📞 *CONTACTO:* [Confirmación Pendiente - Se envió DM privado 📩]

────────────────────────────────

🏠 *PROPIEDAD* 🏠
• 🏢 *INMUEBLE:* ${translatePropertyType(propItem.propertyType || 'inmueble')}
• 💼 *NEGOCIO:* ${translateTransactionType(propItem.transactionType || 'venta')}
• 📅 *FECHA DE ENVÍO:* ${propDateTime.dateStr}
• ⏰ *HORA DE ENVÍO:* ${propDateTime.timeStr}
• 👤 *Autor:* @${isProperty ? savedRawPhone : matchedRawPhone}
• 💬 *PUBLICACIÓN:* ${getPropText(propItem)}
• 📞 *CONTACTO:* [Confirmación Pendiente - Se envió DM privado 📩]`;

    matchBlocks.push(block);

    // Obtener nombres de base de datos
    let savedUserName = realName;
    let matchedUserName = "Colega";

    try {
      const db = await getDb();
      if (db) {
        const [su] = await db.select().from(users).where(eq(users.phone, savedRawPhone)).limit(1);
        if (su && su.name && su.name.trim() !== "") {
          savedUserName = su.name;
        }
        
        const [mu] = await db.select().from(users).where(eq(users.phone, matchedRawPhone)).limit(1);
        if (mu && mu.name && mu.name.trim() !== "") {
          matchedUserName = mu.name;
        }
      }
    } catch (e) {
      console.warn("[JanIA-Match] Error buscando nombres reales de usuarios:", e);
    }

    const savedFirstName = savedUserName.split(' ')[0];
    const matchedFirstName = matchedUserName.split(' ')[0];

    const ownerName = isProperty ? savedFirstName : matchedFirstName;
    const ownerJid = isProperty ? savedJid : matchedJid;
    const ownerDateTime = isProperty ? savedDateTime : matchedDateTime;

    const seekerName = isProperty ? matchedFirstName : savedFirstName;
    const seekerJid = isProperty ? matchedJid : savedJid;
    const seekerDateTime = isProperty ? savedDateTime : matchedDateTime;

    // DO NOT send DMs to the buyers and sellers (keep matches private for manual mediation and billing)
    // We comment out or delete the owner/seeker DM logic and do not push them to extraDMs.

    // Enviar notificación por DM al administrador (3192919978)
    const adminPhone = "573192919978";
    const adminJid = `${adminPhone}@c.us`;
    const adminMessage = `📢 *NUEVA COINCIDENCIA DETECTADA* (Coincidencia: ${score.toFixed(0)}%)
📌 *Código:* #M${matchId}

📣 *REQUERIMIENTO*
• Autor: ${isProperty ? matchedUserName : savedUserName}
• Teléfono: +${isProperty ? matchedRawPhone : savedRawPhone}
• Detalle: ${getReqText(reqItem)}

🏠 *PROPIEDAD*
• Autor: ${isProperty ? savedUserName : matchedUserName}
• Teléfono: +${isProperty ? savedRawPhone : matchedRawPhone}
• Detalle: ${getPropText(propItem)}
• Precio: ${propItem.price ? Number(propItem.price).toLocaleString('es-CO') + ' COP' : 'N/A'}`;
    
    // Notificación al admin: usar el bot principal (whatsapp-web.js) para garantizar entrega
    extraDMs.push({ jid: adminJid, message: adminMessage, viaMainBot: true });
  }

  // Notificaciones masivas de match en WhatsApp están DESACTIVADAS (solo se consultan en la web vecy.co)
  return {
    response: "",
    mentions: [],
    extraDMs,
    sendReputationHook: matches.length > 0
  };
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

async function getTimeOfDayGreetingForUser(phone: string, realName: string, alreadyGreeted: boolean, isGroup: boolean = false): Promise<string> {
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

  // 2. Publicidad de Terceros / Marketing No Predial / Software / Coaching
  if (
    n.includes("coaching") ||
    n.includes("red de mercadeo") ||
    n.includes("multinivel") ||
    n.includes("gana dinero desde casa") ||
    n.includes("servicio de marketing") ||
    n.includes("agencia de publicidad") ||
    n.includes("software inmobiliario") ||
    n.includes("te regalo una guia") ||
    n.includes("te regalo un ebook")
  ) {
    return { isSpam: true, reason: "Publicidad de terceros, marketing no predial o coaching." };
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

export function splitMultiItemMessage(text: string): string[] {
  if (!text || text.length < 80) return [text];

  // 1. Delimitadores explícitos de corte (guiones largos, asteriscos repetidos, etc.)
  const delimiterSplit = text.split(/(?:\r?\n){1,}\s*(?:_{3,}|-{3,}|={3,}|\*{3,})\s*(?:\r?\n){1,}/);
  if (delimiterSplit.length >= 2) {
    const validBlocks = delimiterSplit.map(b => b.trim()).filter(b => b.length >= 35);
    if (validBlocks.length >= 2) {
      return validBlocks;
    }
  }

  // 2. Encabezados formales repetidos (Requerimientos, Inmuebles, Clientes, Búsquedas, Ofertas)
  const headerSplitRegex = /(?=(?:^|\n)\s*(?:🚨\s*\*?(?:REQUERIMIENTO|INMUEBLE|OFERTA|DEMANDA)\*?\s*🚨|\*?(?:REQUERIMIENTO|INMUEBLE|OFERTA|DEMANDA)\*?\s*[:\n]|\*?Cliente\*?\s*:\s*[A-ZÁÉÍÓÚÑ]|\b(?:VENDO|SE VENDE|ARRIENDO|SE ARRIENDA|BUSCO|SE BUSCA)\s+(?:APARTAMENTO|APTO|CASA|BODEGA|OFICINA|LOTE|LOCAL|PENTHOUSE|DÚPLEX)\b|(?:^|\n)\s*(?:[1-9][\.\)\️⃣]|\([1-9]\))\s*(?:APARTAMENTO|APTO|CASA|BODEGA|OFICINA|LOTE|LOCAL|VENTA|ARRIENDO|BUSCO|SE VENDE)))/gi;
  const rawBlocks = text.split(headerSplitRegex).map(b => b.trim()).filter(b => b.length >= 40);
  if (rawBlocks.length >= 2) {
    return rawBlocks;
  }

  // 3. Fallback por párrafos cuando hay múltiples declaraciones
  const paragraphs = text.split(/(?:\r?\n){2,}/);
  if (paragraphs.length >= 3) {
    const blocks: string[] = [];
    let currentBlock = "";
    for (const p of paragraphs) {
      const cleanP = p.trim();
      if (!cleanP) continue;
      const isNewItem = /(?:SE VENDE|VENDO|SE ARRIENDA|ARRIENDO|APARTAMENTO|CASA|BUSCO|SOLICITO|ATL|REQUERIMIENTO)\b/i.test(cleanP) && (/\$|\b\d{3,}\b|\bm2\b|\bhab\b|\bbaños\b|\balcobas\b/i.test(cleanP));
      if (currentBlock && isNewItem) {
        blocks.push(currentBlock.trim());
        currentBlock = cleanP;
      } else {
        currentBlock = currentBlock ? `${currentBlock}\n\n${cleanP}` : cleanP;
      }
    }
    if (currentBlock) blocks.push(currentBlock.trim());
    if (blocks.length >= 2) {
      return blocks;
    }
  }

  return [text];
}

// Alias para retrocompatibilidad
export const splitMultiPropertyMessage = splitMultiItemMessage;

/**
 * Procesa un mensaje de WhatsApp con inteligencia multimodal y humanización avanzada.
 */
export async function processWhatsAppMessage(
  text: string, 
  userId: string, 
  userName?: string,
  hasMedia: boolean = false,
  scrapedData: any[] = [],
  audioUrl?: string,
  imageBuffer?: string,
  isGroup: boolean = false,
  pdfBuffer?: string,
  pdfMimeType?: string,
  groupJid?: string,
  groupName?: string
): Promise<JanIAResult> {
  try {
    const isWebUser = userId.startsWith("web-");

    // ══════════════════════════════════════════════════════════════════════════
    // INGESTA MULTI-ITEM: SI UN MENSAJE CONTIENE VARIAS PUBLICACIONES, SEPARARLAS
    // ══════════════════════════════════════════════════════════════════════════
    if (text && !text.includes("__is_sub_message__")) {
      const subBlocks = splitMultiItemMessage(text);
      if (subBlocks.length >= 2) {
        console.log(`[JanIA-MultiItemSplitter] 🚀 Ingestando ${subBlocks.length} publicaciones individuales de manera independiente...`);
        let finalResult: JanIAResult = { classification: "INMUEBLE", response: "", inserted: true };
        for (const subText of subBlocks) {
          finalResult = await processWhatsAppMessage(
            `${subText}\n__is_sub_message__`,
            userId,
            userName,
            hasMedia,
            scrapedData,
            audioUrl,
            imageBuffer,
            isGroup,
            pdfBuffer,
            pdfMimeType,
            groupJid,
            groupName
          );
        }
        return finalResult;
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FILTRO ABSOLUTO IMPERMEABLE DE SPAM, PUBLICIDAD Y CONTENIDO NO INMOBILIARIO
    // ══════════════════════════════════════════════════════════════════════════
    if (!isWebUser && text) {
      const checkText = text.toLowerCase();
      if (isNonRealEstateText(checkText)) {
        console.log(`[JANIA-NON-REALESTATE-GUARD] ⛔ Publicación NO inmobiliaria (canteras, materiales, minas, vehículos, carbón, etc.). Operación silenciosa total, sin guardar en BD ni emoji: "${checkText.substring(0, 60)}..."`);
        return {
          classification: "VIOLACION_DE_NORMAS",
          response: "",
          dmResponse: "",
          shouldSendDM: false,
          reactionEmoji: undefined,
          inserted: false
        };
      }

      const isSpamOrWebinar = (
        checkText.includes("zoom.us") ||
        checkText.includes("us06web.zoom.us") ||
        checkText.includes("chat.whatsapp.com") ||
        checkText.includes("únase a nuestra reunión") ||
        checkText.includes("unase a nuestra reunion") ||
        checkText.includes("entrenamiento 100% gratuito") ||
        checkText.includes("estrategias en redes sociales") ||
        checkText.includes("como funcionan las ventas") ||
        checkText.includes("invitación al chat en grupo") ||
        checkText.includes("invitacion al chat en grupo") ||
        checkText.includes("unirme al grupo") ||
        checkText.includes("máster class") ||
        checkText.includes("masterclass") ||
        checkText.includes("taller gratuito") ||
        checkText.includes("capacitación gratuita") ||
        checkText.includes("capacitacion gratuita")
      );

      if (isSpamOrWebinar && !checkText.includes("vendo") && !checkText.includes("busco") && !checkText.includes("se vende") && !checkText.includes("se arrienda")) {
        console.log(`[JANIA-SPAM-GUARD] ⛔ Mensaje detectado como SPAM/Webinar/Curso (${checkText.substring(0, 60)}...). Operación silenciosa total, sin guardar en BD ni emoji.`);
        return {
          classification: "VIOLACION_DE_NORMAS",
          response: "",
          dmResponse: "",
          shouldSendDM: false,
          reactionEmoji: undefined,
          inserted: false
        };
      }
    }

    const rawPhone = userId.split('@')[0];
    const realName = await resolveRealName(userId, userName);

    const alreadyGreeted = await checkAlreadyGreeted(userId);
    const senderInfo = analyzeSender(realName, userId, alreadyGreeted);
    const n = extractFirstName(realName) || 'colega';

    const session = await getPendingSession(userId);
    if (session) {
      const combinedText = session.messageToProcess + " \n[COMPLEMENTO]: " + text;
      await deletePendingSession(userId);
      console.log(`[JanIA-PendingSession] Resolviendo sesión pendiente para ${userId}. Combinando textos y re-procesando...`);
      return await processWhatsAppMessage(
        combinedText,
        userId,
        userName,
        hasMedia || !!session.imageBuffer,
        scrapedData,
        audioUrl,
        imageBuffer || session.imageBuffer,
        isGroup,
        pdfBuffer,
        pdfMimeType,
        groupJid
      );
    }

    let messageToProcess = text;

    // Texto del usuario — preserva 100% el texto exacto recibido desde WhatsApp incluyendo URLs, emojis y montos.
    const rawUserText = text;

    // Dominios que nunca deben raparse — redes sociales, links de WhatsApp, etc.
    // Scraping these returns marketing pages, login walls, or contact info — not property data.
    const SCRAPE_BLOCKLIST = [
      'wa.me', 'whatsapp.com', 'whatsapp.net',
      'facebook.com', 'fb.com', 'fb.watch',
      'instagram.com',
      'youtube.com', 'youtu.be',
      'tiktok.com',
      'twitter.com', 'x.com',
      'linkedin.com',
      'maps.google.com', 'photos.app.goo.gl', 'photos.google.com',
      'drive.google.com', 'docs.google.com',
      'bit.ly', 'tinyurl.com', 'goo.gl',
    ];

    function isScrapeable(url: string): boolean {
      try {
        const hostname = new URL(url).hostname.replace('www.', '').toLowerCase();
        return !SCRAPE_BLOCKLIST.some(blocked => hostname.includes(blocked));
      } catch {
        return false;
      }
    }

    // Extraer y procesar enlaces con evasión de bloqueos (Bypass)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    let jinaExtractedText = "";
    if (urls && urls.length > 0) {
      for (const url of urls) {
        // Saltar dominios bloqueados — jamas raspar wa.me, redes sociales, etc.
        if (!isScrapeable(url)) {
          console.log(`[Scraper-Bypass] Dominio bloqueado, omitiendo scraping: ${url}`);
          continue;
        }
        let content = await scrapeUrlWithBypass(url);
        if (content) {
          // Remover imágenes markdown y líneas con solo URLs (contaminación visual)
          content = content
            .replace(/!\[.*?\]\(.*?\)/g, '')          // imágenes markdown ![]()
            .replace(/^https?:\/\/[^\s]+$/gm, '')      // líneas que son solo URLs
            .replace(/\n{3,}/g, '\n\n')                // colapsar saltos excesivos
            .trim();
          if (content.length > 50) { // Ignorar contenido trivial
            jinaExtractedText += `\n\n[CONTENIDO DE ENLACE WEB EXTRAÍDO DE ${url}]:\n${content.substring(0, 15000)}\n[FIN CONTENIDO ENLACE]\n`;
          }
        }
      }
    }
    // messageToProcess lleva el contexto completo para el LLM (con el texto del portal)
    if (jinaExtractedText) {
      messageToProcess += jinaExtractedText;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FILTRO ABSOLUTO IMPERMEABLE DE SPAM, WEBINARS, CURSOS Y PUBLICIDAD
    // ══════════════════════════════════════════════════════════════════════════
    if (!isWebUser && messageToProcess) {
      const checkText = messageToProcess.toLowerCase();
      const isSpamOrWebinar = (
        checkText.includes("zoom.us") ||
        checkText.includes("us06web.zoom.us") ||
        checkText.includes("chat.whatsapp.com") ||
        checkText.includes("únase a nuestra reunión") ||
        checkText.includes("unase a nuestra reunion") ||
        checkText.includes("entrenamiento 100% gratuito") ||
        checkText.includes("estrategias en redes sociales") ||
        checkText.includes("como funcionan las ventas") ||
        checkText.includes("invitación al chat en grupo") ||
        checkText.includes("invitacion al chat en grupo") ||
        checkText.includes("unirme al grupo") ||
        checkText.includes("máster class") ||
        checkText.includes("masterclass") ||
        checkText.includes("taller gratuito") ||
        checkText.includes("capacitación gratuita") ||
        checkText.includes("capacitacion gratuita")
      );

      if (isSpamOrWebinar && !checkText.includes("vendo") && !checkText.includes("busco") && !checkText.includes("se vende") && !checkText.includes("se arrienda")) {
        console.log(`[JANIA-SPAM-GUARD] ⛔ Mensaje detectado como SPAM/Webinar/Curso (${checkText.substring(0, 60)}...). Operación silenciosa total, sin guardar en BD ni emoji.`);
        return {
          classification: "VIOLACION_DE_NORMAS",
          response: "",
          dmResponse: "",
          shouldSendDM: false,
          reactionEmoji: undefined,
          inserted: false
        };
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CHUNKER SPLITTER v21.21 — Sub-Agente Fragmentador de Mensajes Masivos
    // Si el mensaje tiene >150 palabras y múltiples patrones de inicio de oferta
    // (emojis repetidos, títulos en mayúsculas, separadores ——), lo divide
    // en publicaciones independientes, heredando teléfono y enlace_origen.
    // ══════════════════════════════════════════════════════════════════════════
    if (!isWebUser && !pdfBuffer) {
      const wordCount = (text.match(/\S+/g) || []).length;
      const emojiPropertyStarters = (text.match(/(?:🏡|🏠|🏢|🔑|💥|🌷|🌺|🌸|⭐|✨|🔥|🎯|📍)/g) || []).length;
      const hasMultipleStarters = emojiPropertyStarters >= 2 || wordCount > 200;

      if (wordCount > 150 && hasMultipleStarters) {
        console.log(`[CHUNKER] 📦 Mensaje largo (${wordCount} palabras, ${emojiPropertyStarters} emojis-inicio). Fragmentando...`);

        const parentUrl = urls && urls.length > 0 ? urls[0] : null;
        const parentPhone = normalizePhoneNumber(userId, text);

        // Dividir por emoji de inicio de publicación al comienzo de línea
        const emojiSplitPattern = /(?=\n\s*(?:🏡|🏠|🏢|🏗|🏘|🔑|💥|🌷|🌸|🌺|🌻|🌹|⭐|✨|🔥|💫|🎯|📍))/g;
        let rawChunks = text.split(emojiSplitPattern).map((c: string) => c.trim()).filter((c: string) => c.length > 80);

        if (rawChunks.length < 2) {
          // Fallback: saltos de línea triples
          rawChunks = text.split(/\n{3,}/).map((c: string) => c.trim()).filter((c: string) => c.length > 80);
        }

        if (rawChunks.length >= 2) {
          console.log(`[CHUNKER] ✂️ Fragmentado en ${rawChunks.length} publicaciones independientes.`);
          let firstResult: JanIAResult | null = null;

          for (let idx = 0; idx < rawChunks.length; idx++) {
            const chunk = rawChunks[idx];
            const chunkWords = (chunk.match(/\S+/g) || []).length;
            if (chunkWords < 15) {
              console.log(`[CHUNKER] ⏭️ Fragmento ${idx + 1} ignorado (muy corto: ${chunkWords} palabras).`);
              continue;
            }

            // Heredar teléfono y enlace_origen en cada fragmento
            let enriched = chunk;
            if (parentPhone && !enriched.includes(parentPhone.replace('+', ''))) {
              enriched += `\n📞 ${parentPhone}`;
            }
            if (parentUrl && !enriched.includes(parentUrl)) {
              enriched += `\n🔗 ${parentUrl}`;
            }

            console.log(`[CHUNKER] 🔄 Procesando fragmento ${idx + 1}/${rawChunks.length}: "${chunk.substring(0, 60)}..."`);
            try {
              const chunkResult = await processWhatsAppMessage(
                enriched, userId, userName, false, [], undefined,
                imageBuffer, isGroup, undefined, undefined, groupJid, groupName
              );
              if (chunkResult.inserted) {
                console.log(`[CHUNKER] ✅ Fragmento ${idx + 1} insertado como ${chunkResult.classification}.`);
              }
              if (!firstResult && chunkResult.classification !== "CONSULTA_GENERAL") {
                firstResult = chunkResult;
              }
            } catch (ce: any) {
              console.error(`[CHUNKER] ❌ Error fragmento ${idx + 1}:`, ce?.message || ce);
            }
          }

          if (firstResult) return firstResult;
          console.log(`[CHUNKER] ⚠️ Ningún fragmento válido. Procesando como mensaje único.`);
        }
      }
    }
    // ══════════════════════════════════════════════════════════════════════════

    let isFromAudio = false;

    // Intercepción rápida de mensajes OFF-TOPIC solo para WhatsApp (el chat WEB tiene Libre Albedrío)
    const cleanText = text.toLowerCase().trim();
    const isMediaOrAudio = hasMedia || !!audioUrl || !!imageBuffer || !!pdfBuffer;

    if (!isWebUser && !isMediaOrAudio && cleanText.length > 15) {
      const onTopicKeywords = [
        "apto", "apartamento", "casa", "lote", "finca", "bodega", "oficina", "local", "inmueble", "propiedad",
        "predio", "terreno", "proyecto", "arriendo", "alquiler", "vendo", "venta", "compro", "compra", "busco",
        "ofrezco", "necesito", "permuto", "venpermuto", "estrato", "m2", "metros", "habitacion", "habitación",
        "alcoba", "alcobas", "baño", "baños", "cocina", "garaje", "garajes", "parqueadero", "parqueaderos",
        "canon", "administracion", "administración", "precio", "millones", "cop", "arrendar", "vender", "comprar",
        "bogota", "bogotá", "medellin", "medellín", "cali", "barranquilla", "bucaramanga", "cartagena",
        "barrio", "sector", "zona", "calle", "carrera", "avenida", "contrato", "arrendamiento", "promesa",
        "escritura", "notaria", "notaría", "registro", "sucesión", "sucesion", "herencia", "embargo",
        "saneamiento", "comision", "comisión", "corretaje", "avalúo", "avaluo", "jania", "vecy", "bot", "ayuda",
        "cómo", "como", "funciona", "publicar", "registrar", "match", "coincidencia", "contacto", "cuenta",
        "hola", "gracias", "saludo", "req", "tengo", "disponible", "cliente", "clientes", "comprando",
        "buscando", "solicito", "solicitamos", "piso", "balcon", "balcón", "terraza", "deposito", "depósito",
        "conjunto", "edificio", "ph", "penthouse", "duplex", "dúplex", "triplex", "tríplex", "estudio"
      ];

      const hasOnTopicKeyword = onTopicKeywords.some(keyword => cleanText.includes(keyword));
      if (!hasOnTopicKeyword) {
        console.log(`[JanIA-OffTopic] Mensaje fuera de tema detectado para ${userId} en ${groupJid || 'DM'}: "${text.substring(0, 50)}...".`);
        
        let staticText = "";
        if (isGroup || groupJid) {
          const jid = groupJid || "";
          let groupRulesName = "el grupo";
          let acceptedTopics = "publicar y buscar propiedades para hacer matching comercial de inmuebles y requerimientos";
          
          if (jid === '120363417740040773@g.us') {
            groupRulesName = "VECY: SOPORTE LEGAL, TRIBUTARIO Y AVALÚOS";
            acceptedTopics = "consultas jurídicas, contratos, arrendamientos, tributación y avalúos de inmuebles";
          } else if (jid === '120363403507276533@g.us') {
            groupRulesName = process.env.GROUP_ZERO_NAME || 'PROYECTO "Vecy Network"';
            acceptedTopics = "temas de debate, soporte y sugerencias sobre el ecosistema VECY Network";
          } else {
            groupRulesName = "VECY INMUEBLES NETWORK";
            acceptedTopics = "publicación directa de ofertas (Inmuebles) y demandas (Requerimientos) comerciales";
          }

          staticText = `Hola @${rawPhone} 👋🏻. Detecté que tu publicación trata sobre un tema que no corresponde al propósito de este canal (fechas festivas, política, religión o contenido ajeno al corretaje).\n\nTe recuerdo que en el grupo *${groupRulesName}* solo se admiten temas de: **${acceptedTopics}**.\n\nTe solicito amablemente que elimines tu mensaje para mantener el orden del chat, y te invito a revisar y comprender las normas completas del grupo que se encuentran en su descripción. ¡Gracias por tu colaboración y cultura de red! 🤝🚀`;
        } else {
          staticText = `Hola ${realName || 'colega'} 👋🏻. Como asistente de VECY Network, estoy entrenada exclusivamente para ayudarte con temas de bienes raíces (buscar, publicar o cruzar inmuebles), asesorías legales de corretaje y arrendamientos, o el soporte de nuestra plataforma. 🏠✨\n\nPor favor, hazme una consulta que esté relacionada con estos temas. ¡Con gusto te responderé! 😊`;
        }

        return {
          classification: "VIOLACION_DE_NORMAS",
          response: staticText,
          dmResponse: staticText,
          reactionEmoji: "🚫"
        };
      }
    }



    // 1. Transcripción de Voz
    if (audioUrl) {
      if (audioUrl.startsWith("mock-audio:")) {
        messageToProcess = audioUrl.replace("mock-audio:", "");
        isFromAudio = true;
      } else {
        console.log(`[JanIA] Transcribiendo nota de voz para ${userId}...`);
        const transcription = await transcribeAudio({ audioUrl });
        if (!('error' in transcription)) {
          messageToProcess = transcription.text;
          isFromAudio = true;
        }
      }
    }

    if ((!messageToProcess || messageToProcess.trim() === "") && imageBuffer) {
      messageToProcess = "[Publicación de Imagen / Flyer Comercial Inmobiliario sin texto en pie de foto]";
    }

    // 2. Preparación de Contexto LLM Multimodal
    let contextText = `Mensaje de ${userName || userId}: ${messageToProcess}`;
    if (isFromAudio) {
      contextText += `\n[SISTEMA - NOTA DE VOZ]: El usuario te envió este mensaje como nota de voz (audio). Dado que te enviaron audio, es preferible y de alta importancia que respondas en audio ("wantsVoice": true) si tu respuesta es corta (saludos, confirmaciones, consultas breves, o respuestas de menos de 250 caracteres). **EXCEPCIÓN CRÍTICA**: Si el usuario te pide explícitamente que le respondas por audio, nota de voz o de viva voz por cualquier razón, debes omitir el límite de longitud y responder obligatoriamente por audio ("wantsVoice": true y colocar toda tu respuesta en "voiceResponse" de forma limpia), a menos que sea un contrato extenso o tabla de datos que no se pueda leer de manera natural. Si la respuesta requiere explicaciones largas, tablas o minutas/contratos y el usuario NO pidió expresamente que fuera audio, responde obligatoriamente por escrito ("wantsVoice": false).`;
    }
    if (scrapedData.length > 0) contextText += `\n[SISTEMA - DATOS SCRAPED]: ${JSON.stringify(scrapedData)}`;
    if (imageBuffer) {
      contextText += `\n[SISTEMA - ANÁLISIS MULTIMODAL DE IMAGEN / FLYER / BANNER (OCR Y VISIÓN COMERCIAL)]:
Se ha adjuntado una imagen. Analízala con visión artificial avanzada y determina:
1. "isFlyerOrBanner":
   - Asigna TRUE si la imagen es una infografía publicitaria, flyer comercial, banner, afiche o collage que contiene texto tipográfico impreso con especificaciones inmobiliarias de OFERTA (precio, área, alcobas, baños, garajes, sector, teléfono de contacto) o de DEMANDA (búsqueda de cliente, compro casa/apto, presupuesto, sectores solicitados).
   - Asigna FALSE si es simplemente una FOTOGRAFÍA AMBIENTAL COMÚN (foto fotográfica de una sala, comedor, cocina, fachada, baño, lámpara, etc.) SIN texto publicitario estructurado.
2. Si "isFlyerOrBanner" es TRUE:
   - Transcribe TODO el texto literal y legible de la imagen en "flyerVerbatimText".
   - Extrae todas las especificaciones numéricas y textuales en "extractedData" (precio, rentPrice, adminFee, area, bedrooms, bathrooms, garages, stratum, zone, city, contactPhone, propertyType, transactionType).
   - Clasifica como "INMUEBLE" si describe una oferta de venta/arriendo, o como "REQUERIMIENTO" si describe una búsqueda o demanda de cliente comprador/arrendatario.
3. Si "isFlyerOrBanner" es FALSE y el mensaje NO contiene una ficha técnica escrita por el usuario, clasifica como "CONSULTA_GENERAL" con "inserted": false.`;
    }
    if (pdfBuffer) contextText += `\n[SISTEMA: DOCUMENTO PDF DETECTADO. Analiza el documento PDF adjunto con tus capacidades nativas para extraer todos los datos relevantes del predial, certificado de tradición, o contrato.]`;

    const statsSummary = await getLiveStats();
    if (statsSummary) {
      contextText += `\n${statsSummary}`;
    }

    const firstName = extractFirstName(realName) || 'colega';
    const bogotaTime = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hour12: false });
    const userGender = senderInfo.adj === "juiciosa" ? "Femenino" : (senderInfo.adj === "juicioso" ? "Masculino" : "No Especificado");

    const outsideHours = isWebUser ? false : isOutsideWorkingHours();
    const estadoOperacion = outsideHours ? "fuera_de_horario" : "en_horario";

    const greetingInstruction = `\n\n[SISTEMA - METADATOS DEL MENSAJE (VARIABLES CRÍTICAS)]:
- {{hora}}: ${bogotaTime}
- {{canal}}: ${isWebUser ? "Consola Web 24/7" : (isGroup ? `Grupo WhatsApp - [${groupName || "Grupo Inmobiliario WhatsApp"}]` : "dm")}
- {{genero}}: ${userGender}
- {{es_nuevo_usuario}}: ${!alreadyGreeted ? "true" : "false"}
- {{estado_operacion}}: ${estadoOperacion}

[SISTEMA - INSTRUCCIÓN DE SALUDO Y COMPORTAMIENTO]:
- Ya has saludado al usuario hoy: ${alreadyGreeted ? "SÍ" : "NO"}.
- Tipo de conversación actual: ${isWebUser ? "CHAT WEB DE LIBRE ALBEDRÍO 24/7" : (isGroup ? "GRUPO DE WHATSAPP" : "CHAT PRIVADO / DM")}.
- Primer nombre del usuario: "${firstName}".
- REGLAS CRÍTICAS DE RESPUESTA:
  * Si "Ya has saludado al usuario hoy" es SÍ (solo aplica a WhatsApp):
    - ¡PROHIBIDO SALUDAR! No uses palabras como "Hola", "Buenas tardes", "Qué gusto", "Bienvenido", ni variantes de saludo o bienvenida.
  * En CHAT WEB 24/7: Conversa libremente, saluda si es natural o ve directo al tema de forma elocuente y amigable.`;

    contextText += greetingInstruction;

    if (isWebUser) {
      contextText += `\n\n[INSTRUCCIÓN MAESTRA - CHAT WEB DE LIBRE ALBEDRÍO 24/7]:
Estás interactuando con el usuario directamente en la CONSOLA WEB de VECY Network.
- Tienes LIBERTAD TOTAL DE RAZONAMIENTO Y PENSAMIENTO (Libre Albedrío 24/7).
- NUNCA apliques restricciones de grupos de WhatsApp, horarios de oficina ni bloqueos de temas.
- Responde a cualquier inquietud general, jurídica, de avalúos, cálculo financiero o conversación inmobiliaria con razonamiento profundo, calidez y elocuencia.
- Si el usuario te envía un inmueble o requerimiento, extrae los datos para el sistema y dale una respuesta rica, entusiasta y completa confirmando la información.`;
    }

    if (!isWebUser && !alreadyGreeted && outsideHours && !isGroup) {
      const saludo = getGreetingByTime();
      contextText += `\n[INSTRUCCIÓN CRÍTICA DE PRESENTACIÓN FUERA DE HORARIO]:
Como esta es tu primera interacción con este usuario el día de hoy, y nos encontramos fuera de horario de oficina, debes presentarte de manera muy cálida y entusiasta al inicio de tu respuesta:
"¡${saludo}, *${n}*! 😊 Soy JanIA, la asistente virtual de Inteligencia Artificial de VECY, creada y entrenada por el equipo de desarrollo de VECY Bienes Raíces. Estoy aquí para atenderte de forma personalizada, resolver tus inquietudes y ayudarte a registrar tus inmuebles o requerimientos de forma ágil mientras nuestros asesores humanos regresan a su horario habitual de 8:00 am a 8:00 pm. 🚀🤝 ¿Cuéntame en qué puedo ayudarte en este momento?"
Redacta esta bienvenida integrada con tu respuesta a su pregunta, usando emojis alusivos de manera elocuente. Además, si la respuesta a su consulta es corta, establece "wantsVoice": true y coloca una versión hablada muy amigable de esta bienvenida y su respuesta en "voiceResponse" (sin viñetas o asteriscos de negrita) para que el usuario reciba un audio de tu voz presentándote de forma humana.`;
    }

    const textLower = messageToProcess.toLowerCase();
    const isReplicationRequest = 
      textLower.includes("replica") ||
      textLower.includes("repite") ||
      textLower.includes("lee este") ||
      textLower.includes("lee esto") ||
      textLower.includes("lee literalmente") ||
      textLower.includes("di literalmente") ||
      textLower.includes("reproduce");

    if (isReplicationRequest) {
      contextText += `\n[INSTRUCCIÓN CRÍTICA DE REPLICACIÓN LITERAL DE AUDIO]: El usuario te está pidiendo de manera explícita que repliques, repitas o leas un texto o párrafo específico en una nota de voz/audio.
Por lo tanto, DEBES hacer lo siguiente:
1. Establece obligatoriamente "wantsVoice": true.
2. En el campo "voiceResponse", coloca EXACTAMENTE el texto o párrafo literal que el usuario te solicitó que leyeras, eliminando emojis y markdown (como asteriscos o negritas) para que el sintetizador de voz lo lea de forma fluida y natural, sin deletrear. Por ejemplo, si te dice "replica esto: COMPROMISO DE HONOR VECY", el campo "voiceResponse" debe contener el texto de ese compromiso literalmente.
3. En el campo "response", coloca también el texto literal con su formato y emojis correspondientes.
4. NUNCA respondas con confirmaciones conversacionales como "¡Entendido, colega! He procesado el comunicado...", ni agregues discursos tuyos. Tu respuesta "response" y "voiceResponse" debe ser únicamente el texto que te pidieron leer de forma exacta y literal.`;
    }

    const isValuationQuery = 
      textLower.includes("valuar") || 
      textLower.includes("avaluo") || 
      textLower.includes("avalúo") || 
      textLower.includes("cuanto vale") || 
      textLower.includes("cuánto vale") || 
      textLower.includes("valor metro cuadrado") || 
      textLower.includes("valor m2") || 
      textLower.includes("precio metro cuadrado") || 
      textLower.includes("precio m2") || 
      textLower.includes("cuanto puedo cobrar") || 
      textLower.includes("cuánto puedo cobrar") || 
      textLower.includes("en que valor") || 
      textLower.includes("en qué valor") || 
      textLower.includes("estimar precio");

    const isLegalQuery =
      (textLower.includes("sucesión") || textLower.includes("sucesion") ||
      textLower.includes("herencia") || textLower.includes("divorcio") ||
      textLower.includes("embargo") || textLower.includes("saneamiento") ||
      textLower.includes("compraventa") || textLower.includes("arrendamiento") ||
      textLower.includes("ley 820") || textLower.includes("ley 675") ||
      textLower.includes("no me pago") || textLower.includes("no me pagó") ||
      textLower.includes("robo de comision") || textLower.includes("robo de comisión") ||
      textLower.includes("disputa") || textLower.includes("notaría") || textLower.includes("notaria")) &&
      !textLower.includes("50/50") && !textLower.includes("50-50");

    const isListingOrReq = hasRealEstateTextKeyword(textLower);

    const enableSearch = !isListingOrReq && (isValuationQuery || isLegalQuery || textLower.includes("buscar en google"));

    // Obtener historial de chat reciente (Supercerebro) - Omitir en grupos para evitar contaminación de contexto
    const history = (isGroup || groupJid) ? [] : await getRecentChatHistory(userId, 20);
    // Obtener estadísticas en tiempo real para que JanIA pueda responder con datos exactos
    const liveStats = await getLiveStats();
    const systemContent = liveStats
      ? `${buildSystemPrompt(groupJid)}\n\n${liveStats}`
      : buildSystemPrompt(groupJid);

    const llmMessages = [
      { role: "system", content: systemContent }
    ];

    if (history.length > 0) {
      if (
        history[history.length - 1].role === "user" &&
        history[history.length - 1].content.trim() === contextText.trim()
      ) {
        history.pop();
      }
      llmMessages.push(...history);
    }
    llmMessages.push({ role: "user", content: contextText });

    const response = await invokeLLM({
      messages: llmMessages,
      responseFormat: { type: "json_object", schema: janiaResultSchema },
      imageBuffer,
      pdfBuffer,
      pdfMimeType,
      enableSearch: enableSearch
    });

    const llmRes = response as any;
    if (!llmRes || !llmRes.choices || !llmRes.choices[0]) throw new Error("Fallo de comunicación con el LLM");
    
    let result: JanIAResult;
    const rawContent = llmRes.choices[0].message.content;
    try {
      result = parseSafeJSON(rawContent) as JanIAResult;
    } catch (parseErr: any) {
      console.error("[JanIA-Parser-Error] Error al deserializar JSON de JanIA:", parseErr.message);
      
      // Intentar extraer la clasificación real original mediante regex
      const classMatch = rawContent.match(/"classification"\s*:\s*"([^"]+)"/i);
      const extractedClass = classMatch ? classMatch[1].toUpperCase() : null;

      // Intentar extraer el campo "response" de forma limpia mediante expresión regular
      const responseMatch = rawContent.match(/"response"\s*:\s*"([\s\S]*?)"(?:\s*,\s*"|\s*})/);
      let fallbackText = responseMatch ? responseMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : null;

      if (!fallbackText) {
        const truncatedMatch = rawContent.match(/"response"\s*:\s*"([\s\S]*)/);
        if (truncatedMatch) {
          fallbackText = truncatedMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/["\}]+$/, '');
        }
      }

      const inferredClass = (extractedClass === "INMUEBLE" || extractedClass === "REQUERIMIENTO") ? extractedClass : "CONSULTA_GENERAL";

      if (fallbackText && fallbackText.trim() !== "") {
        result = {
          classification: inferredClass as any,
          response: fallbackText.trim(),
          mentions: []
        };
      } else if (rawContent && rawContent.trim() !== "") {
        const cleanContent = rawContent
          .replace(/"classification"\s*:\s*"[^"]*"/gi, "")
          .replace(/"response"\s*:\s*"/gi, "")
          .replace(/[\{\}\[\]"]/g, "")
          .replace(/classification:\s*\w+,?/gi, "")
          .replace(/response:\s*/gi, "")
          .trim();
        result = {
          classification: inferredClass as any,
          response: cleanContent || "Hola, he procesado tu consulta inmobiliaria.",
          mentions: []
        };
      } else {
        throw parseErr;
      }
    }
    
    result.mentions = result.mentions || [];

    // --- EVALUACIÓN DE ENMIENDAS Y CORRECCIONES EN VENTANA DE 2 HORAS ---
    if (messageToProcess) {
      const isAmendmentHandled = await handleAmendmentUpdate(userId, messageToProcess);
      if (isAmendmentHandled) {
        console.log(`[JANIA-AMENDMENT] Mensaje procesado como enmienda de 2h para ${userId}. Operando en Modo Fantasma 100% silencioso.`);
        result.inserted = false;
        result.classification = "CONSULTA_GENERAL";
        result.response = "";
        result.dmResponse = "";
        result.shouldSendDM = false;
        result.reactionEmoji = undefined;
        return result;
      }
    }

    // --- CAPA DE FILTRO ABSOLUTO DE SPAM, WEBINARS, CURSOS Y PUBLICIDAD ---
    if (messageToProcess) {
      const cleanText = messageToProcess.toLowerCase();

      const isSpamOrWebinar = (
        cleanText.includes("zoom.us") ||
        cleanText.includes("us06web.zoom.us") ||
        cleanText.includes("chat.whatsapp.com") ||
        cleanText.includes("únase a nuestra reunión") ||
        cleanText.includes("unase a nuestra reunion") ||
        cleanText.includes("entrenamiento 100% gratuito") ||
        cleanText.includes("estrategias en redes sociales") ||
        cleanText.includes("como funcionan las ventas") ||
        cleanText.includes("invitación al chat en grupo") ||
        cleanText.includes("invitacion al chat en grupo") ||
        cleanText.includes("unirme al grupo") ||
        cleanText.includes("máster class") ||
        cleanText.includes("masterclass") ||
        cleanText.includes("taller gratuito") ||
        cleanText.includes("capacitación gratuita") ||
        cleanText.includes("capacitacion gratuita")
      );

      if (isSpamOrWebinar && !cleanText.includes("vendo") && !cleanText.includes("busco") && !cleanText.includes("se vende") && !cleanText.includes("se arrienda")) {
        console.log(`[JANIA-SPAM-GUARD] ⛔ Mensaje detectado como SPAM/Webinar/Curso (${cleanText.substring(0, 50)}...). Operación silenciosa total, sin guardar en BD ni emoji.`);
        result.classification = "VIOLACION_DE_NORMAS";
        result.inserted = false;
        result.response = "";
        result.dmResponse = "";
        result.shouldSendDM = false;
        result.reactionEmoji = undefined;
        return result;
      }

      const isExplicitDemandKeyword = /\b(?:busco|buscamos|se busca|se requiere|requiero|requerimiento|necesito|necesitamos|solicito|solicitamos|compro|para cliente|busca cliente|cliente busca|comprador|arrendatario|en búsqueda|en busqueda)\b/i.test(cleanText);
      const isExplicitOfferKeyword = /\b(?:ofrezco|ofrecemos|vendo|se vende|se arrienda|en venta|en arriendo|para arriendo o venta|para venta o arriendo|en arriendo o venta|en venta o arriendo|arriendo o venta|venta o arriendo|vr renta|vr vta|canon arriendo|alquilo|alquiler directo|rento|tengo para|disponible|nuevo inmueble|venta directa|arriendo directo|arrendamos|pongo en arriendo|apto familiar|comisi[oó]n 50[-/]50|punta compartida)\b/i.test(cleanText) || /photos\.app\.goo\.gl|drive\.google\.com\/(?:drive\/folders|file\/d)/i.test(cleanText);

      const isSearch = isExplicitDemandKeyword && !isExplicitOfferKeyword;
      const isOffer = isExplicitOfferKeyword && !isExplicitDemandKeyword;

      const hasRealEstateKeyword = hasRealEstateTextKeyword(cleanText);

      const _extTmp = result.extractedData || {};
      const hasTechnicalSpecs = (_extTmp.price && Number(_extTmp.price) > 0) ||
                                (_extTmp.presupuestoMax && Number(_extTmp.presupuestoMax) > 0) ||
                                (_extTmp.area && Number(_extTmp.area) > 0) ||
                                (_extTmp.bedrooms && Number(_extTmp.bedrooms) > 0) ||
                                (cleanText.includes("$") || /\b\d{2,4}\s*(?:m2|mts|millones|mm|mlls)\b/i.test(cleanText));

      // Detectar comentarios cortos de seguimiento, correcciones o ruido de chat (ej: "Corrección: 3 parqueaderos", "Bajo de precio", "Disponible?")
      const isChatNoisePhrase = (
        cleanText.includes("correccion:") ||
        cleanText.includes("corrección:") ||
        cleanText.includes("fe de erratas") ||
        cleanText.includes("rectificacion:") ||
        cleanText.includes("rectificación:") ||
        cleanText.includes("bajo de precio") ||
        cleanText.includes("sigue este enlace") ||
        cleanText.includes("ver el artículo en whatsapp") ||
        cleanText.includes("foto por interno") ||
        cleanText.includes("fotos por interno") ||
        cleanText.includes("info por interno") ||
        cleanText.includes("información por interno") ||
        cleanText.includes("escribir al interno") ||
        cleanText.includes("disponible?") ||
        cleanText.includes("aún disponible")
      );

      const isShortComment = (isChatNoisePhrase || (!hasRealEstateKeyword && !isSearch && !isOffer && (cleanText.length < 25 || cleanText.split(/\s+/).length < 4))) && !hasTechnicalSpecs;

      // Detectar preguntas de recomendación, solicitudes de abogados/servicios legales, comprobantes o consultas no prediales
      const isGeneralInquiryOrRecommendation = !hasTechnicalSpecs && !isSearch && !isOffer && (
        cleanText.includes("alguien maneja") ||
        cleanText.includes("alguien recomienda") ||
        cleanText.includes("alguien conoce") ||
        cleanText.includes("senior living") ||
        cleanText.includes("alguien tiene contacto") ||
        cleanText.includes("quien maneja") ||
        cleanText.includes("quién maneja") ||
        cleanText.includes("quien recomienda") ||
        cleanText.includes("recomiendan plomero") ||
        cleanText.includes("recomiendan abogado") ||
        cleanText.includes("buscando un abogado") ||
        cleanText.includes("buscando abogado") ||
        cleanText.includes("algun abogado") ||
        cleanText.includes("algún abogado") ||
        cleanText.includes("restitucion de inmueble") ||
        cleanText.includes("restitución de inmueble") ||
        cleanText.includes("daviplata") ||
        cleanText.includes("nequi") ||
        cleanText.includes("comprobante de pago") ||
        cleanText.includes("recomiendan avaluador") ||
        cleanText.includes("alguien que haga") ||
        cleanText.includes("contacto de")
      ) && !cleanText.includes("busco apto") && !cleanText.includes("busco casa") && !cleanText.includes("busco bodega") && !cleanText.includes("presupuesto");

      if (isGeneralInquiryOrRecommendation) {
        console.log(`[JANIA-FILTER] ⛔ Pregunta de recomendación o servicio general ignorada como Requerimiento/Inmueble: "${cleanText.substring(0, 50)}..."`);
        result.classification = "CONSULTA_GENERAL";
      } else if (isShortComment) {
        console.log(`[JANIA-FILTER] ⛔ Mensaje corto o corrección de chat omitido (${cleanText.substring(0, 40)}...). No se procesará como propiedad/requerimiento.`);
        result.classification = "CONSULTA_GENERAL";
      } else if (result.classification === "INMUEBLE" && isSearch && !isOffer) {
        console.log("[JANIA-CORRECTION] Cambiando clasificación de INMUEBLE a REQUERIMIENTO basado en heurística de texto.");
        result.classification = "REQUERIMIENTO";
      } else if (result.classification === "REQUERIMIENTO" && isOffer && !isSearch) {
        console.log("[JANIA-CORRECTION] Cambiando clasificación de REQUERIMIENTO a INMUEBLE basado en heurística de texto (Oferta explícita).");
        result.classification = "INMUEBLE";
      } else if ((result.classification === "CONSULTA_GENERAL" || result.classification === "DATOS_INCOMPLETOS" || !result.classification) && (hasRealEstateKeyword || isSearch || isOffer || hasTechnicalSpecs)) {
        if (hasTechnicalSpecs || hasRealEstateKeyword || isSearch || isOffer) {
          if (isSearch && !isOffer) {
            console.log("[JANIA-CORRECTION] Rescatando REQUERIMIENTO desde CONSULTA_GENERAL con datos técnicos verificados.");
            result.classification = "REQUERIMIENTO";
          } else if (isOffer || hasRealEstateKeyword) {
            console.log("[JANIA-CORRECTION] Rescatando INMUEBLE desde CONSULTA_GENERAL con datos técnicos verificados.");
            result.classification = "INMUEBLE";
          }
        } else {
          console.log("[JANIA-FILTER] No se rescata como Inmueble/Requerimiento por falta de especificaciones prediales suficientes.");
        }
      }

      // ── BLINDAJE ESTRICTO CONTRA FALSOS POSITIVOS (MENSAJES SIN INTENCIÓN PREDIAL) ──
      // Si el LLM lo clasificó como INMUEBLE o REQUERIMIENTO pero el mensaje no contiene
      // ninguna intención comercial real (no es búsqueda, no es oferta, no tiene tipología ni datos técnicos)
      const hasRealEstateIntent = isSearch || isOffer || hasRealEstateKeyword || hasTechnicalSpecs;
      if ((result.classification === "INMUEBLE" || result.classification === "REQUERIMIENTO") && !hasRealEstateIntent) {
        console.log(`[JANIA-FILTER] ⛔ Descartando falso positivo de ${result.classification}: Mensaje sin intención predial explícita ("${cleanText.substring(0, 50)}..."). Degenerado a CONSULTA_GENERAL.`);
        result.classification = "CONSULTA_GENERAL";
      }

      // Doctrina v31.5: Descarte estricto de frases sueltas, teasers o saludos clasificados erróneamente
      const hollowEarlyCheck = isHollowListing(cleanText, null, (urls && urls.length > 0 ? urls[0] : null));
      if ((result.classification === "INMUEBLE" || result.classification === "REQUERIMIENTO") && hollowEarlyCheck.isHollow && !imageBuffer) {
        console.log(`[JANIA-FILTER] ⛔ Descartando publicación hueca o frase suelta (${hollowEarlyCheck.reason}): "${cleanText.substring(0, 60)}...". Degenerado a CONSULTA_GENERAL.`);
        result.classification = "CONSULTA_GENERAL";
      }
    }

    const extracted = result.extractedData || {};
    let isRequirement = result.classification === "REQUERIMIENTO";
    let isProperty = result.classification === "INMUEBLE";

    // Rellenar datos extraídos faltantes mediante extractor heurístico si es necesario
    if ((isProperty || isRequirement) && messageToProcess) {
      const fallbackData = extractFallbackDataFromText(messageToProcess);
      if (!extracted.transactionType) extracted.transactionType = fallbackData.transactionType;
      if (!extracted.propertyType) extracted.propertyType = fallbackData.propertyType;
      
      // Sanitizar price en Venta (si venía < 100M pero en fallbackData es >= 100M)
      const currentPriceNum = Number(extracted.price || 0);
      if (isProperty) {
        if (!currentPriceNum || currentPriceNum === 0 || (currentPriceNum < 100_000_000 && fallbackData.price >= 100_000_000)) {
          extracted.price = fallbackData.price;
        }
      }
      
      if (isRequirement) {
        const curPresupuesto = Number(extracted.presupuestoMax || 0);
        if (!curPresupuesto || curPresupuesto === 0 || (curPresupuesto < 100_000_000 && fallbackData.presupuestoMax >= 100_000_000)) {
          extracted.presupuestoMax = fallbackData.presupuestoMax;
        }
        if (fallbackData.presupuestoMin > 0 && (!extracted.presupuestoMin || Number(extracted.presupuestoMin) === 0)) {
          extracted.presupuestoMin = fallbackData.presupuestoMin;
        }
      }

      if (!extracted.rentPrice && fallbackData.rentPrice > 0) extracted.rentPrice = fallbackData.rentPrice;
      if (!extracted.adminFee && fallbackData.adminFee > 0) extracted.adminFee = fallbackData.adminFee;
      if (!extracted.area || Number(extracted.area) === 0) extracted.area = fallbackData.area;
      if (!extracted.bedrooms && fallbackData.bedrooms > 0) extracted.bedrooms = fallbackData.bedrooms;
      if (!extracted.bathrooms && fallbackData.bathrooms > 0) extracted.bathrooms = fallbackData.bathrooms;
      if (!extracted.garages && fallbackData.garages > 0) extracted.garages = fallbackData.garages;
      if (!extracted.garageType && fallbackData.garageType) extracted.garageType = fallbackData.garageType;
      if (!extracted.antiguedadAnos && fallbackData.antiguedadAnos !== null) extracted.antiguedadAnos = fallbackData.antiguedadAnos;
      if (extracted.hasBalcony === undefined && fallbackData.hasBalcony !== null) extracted.hasBalcony = fallbackData.hasBalcony;
      if (extracted.hasTerrace === undefined && fallbackData.hasTerrace !== null) extracted.hasTerrace = fallbackData.hasTerrace;
      if (extracted.hasStorage === undefined && fallbackData.hasStorage !== null) extracted.hasStorage = fallbackData.hasStorage;
      if (extracted.hasElevator === undefined && fallbackData.hasElevator !== null) extracted.hasElevator = fallbackData.hasElevator;
      if (!extracted.city && fallbackData.city) extracted.city = fallbackData.city;
      if (!extracted.ciudadDeseada && fallbackData.ciudadDeseada) extracted.ciudadDeseada = fallbackData.ciudadDeseada;
      if (!extracted.zone && fallbackData.zone) extracted.zone = fallbackData.zone;
      if (!extracted.zonaDeseada && fallbackData.zonaDeseada) extracted.zonaDeseada = fallbackData.zonaDeseada;
      result.extractedData = extracted;
    }

    // El procesamiento de ofertas y requerimientos se permite ahora tanto en grupos como en chat privado (DM)
    // para que JanIA pueda registrar los inmuebles/búsquedas y buscar matches en la base de datos directamente desde el chat privado.

    let isLLMIncomplete = result.classification === "DATOS_INCOMPLETOS";

    // Forzar clasificación DATOS_INCOMPLETOS si faltan datos clave según las mismas reglas de buildIncompleteDataMessage
    if (isProperty || isRequirement) {
      const isReq = isRequirement || messageToProcess.toLowerCase().includes("busco") || messageToProcess.toLowerCase().includes("necesito") || messageToProcess.toLowerCase().includes("requiero") || !!extracted?.tipoInmuebleDeseado;
      const propTypeRaw = (extracted?.propertyType || extracted?.tipoInmuebleDeseado || "inmueble").toLowerCase();
      let propertyName = "inmueble";
      if (propTypeRaw === "apartment") propertyName = "apartamento";
      else if (propTypeRaw === "house") propertyName = "casa";
      else if (propTypeRaw === "building") propertyName = "edificio";
      else if (propTypeRaw === "warehouse") propertyName = "bodega";
      else if (propTypeRaw === "office") propertyName = "oficina";
      else if (propTypeRaw === "farm" || propTypeRaw === "finca") propertyName = "finca";
      else if (propTypeRaw === "land" || propTypeRaw === "lote") propertyName = "lote";
      else if (propTypeRaw === "consultorio") propertyName = "consultorio";
      else if (propTypeRaw === "loft") propertyName = "loft";

      const city = isReq ? extracted?.ciudadDeseada : extracted?.city;
      const zone = isReq ? (extracted?.zonaDeseada || extracted?.zone) : extracted?.zone;
      const price = isReq ? Number(extracted?.presupuestoMax || extracted?.price || 0) : Number(extracted?.price || 0);

      const hasMissingCity = !city || city.trim() === "" || city.toLowerCase() === "na";
      const hasMissingZone = !zone || zone.trim() === "" || zone.toLowerCase() === "na";
      const hasMissingPrice = !price || price <= 0;

      const area = Number(extracted?.area || 0);
      const hasMissingArea = !area || area <= 0;

      let hasMissingBedrooms = false;
      let hasMissingBathrooms = false;
      let hasMissingStratum = false;

      if (propertyName === "apartamento" || propertyName === "casa" || propertyName === "loft" || propertyName === "inmueble") {
        const bedrooms = Number(extracted?.bedrooms || 0);
        hasMissingBedrooms = !bedrooms || bedrooms <= 0;
        const bathrooms = Number(extracted?.bathrooms || 0);
        hasMissingBathrooms = !bathrooms || bathrooms <= 0;

        const stratum = Number(extracted?.stratum || 0);
        hasMissingStratum = !stratum || stratum <= 0;
      } else if (propertyName !== "lote" && propertyName !== "finca") {
        const stratum = Number(extracted?.stratum || 0);
        hasMissingStratum = !stratum || stratum <= 0;
      }

      // Para soportar el Modo Fantasma y las calificaciones de Eduardo en producción,
      // no invalidamos las extracciones por datos incompletos. Todo lead de oferta o demanda
      // se procesará, guardará y calificará cualitativamente.
      const isMissing = false;
    }

    if (isLLMIncomplete) {
      const inferredType = (messageToProcess.toLowerCase().includes("vendo") || messageToProcess.toLowerCase().includes("ofrezco") || messageToProcess.toLowerCase().includes("arriendo") || !!extracted?.propertyType) ? "PROPERTY" : "REQUIREMENT";
      if (inferredType === "PROPERTY") {
        isProperty = true;
        isRequirement = false;
      } else {
        isProperty = false;
        isRequirement = true;
      }

      // Principio de Mínima Intervención (VRIF): JanIA observa silenciosamente en WhatsApp
      if (!isWebUser) {
        result.shouldSendDM = false;
        result.dmResponse = "";
        result.response = "";
      }
    }

    // --- CAPA DE DEFENSA GEOGRÁFICA NACIONAL (Elástica) ---
    if (isProperty || isRequirement) {
      if (extracted) {
        if (extracted.zone) extracted.zone = sanitizeGeoString(extracted.zone);
        if (extracted.zonaDeseada) extracted.zonaDeseada = sanitizeGeoString(extracted.zonaDeseada);
        if (extracted.city) extracted.city = sanitizeGeoString(extracted.city);
        if (extracted.ciudadDeseada) extracted.ciudadDeseada = sanitizeGeoString(extracted.ciudadDeseada);
      }

      const zoneToValidate = isProperty ? extracted?.zone : (extracted?.zonaDeseada || extracted?.zone);
      
      let isValidGeo = false;
      let geoValidation: any = null;
      
      if (zoneToValidate && zoneToValidate.trim() !== "") {
        let inferredCity = extracted?.city || extracted?.ciudadDeseada;
        if (!inferredCity || inferredCity.trim() === "" || inferredCity.toLowerCase() === "na") {
          if (groupName) {
            const nameLower = groupName.toLowerCase();
            if (nameLower.includes("cali")) {
              inferredCity = "Cali";
            } else if (nameLower.includes("medellin") || nameLower.includes("medellín")) {
              inferredCity = "Medellín";
            } else if (nameLower.includes("barranquilla")) {
              inferredCity = "Barranquilla";
            } else if (nameLower.includes("bucaramanga")) {
              inferredCity = "Bucaramanga";
            } else if (nameLower.includes("cartagena")) {
              inferredCity = "Cartagena";
            } else if (nameLower.includes("pereira")) {
              inferredCity = "Pereira";
            }
          }
        }

        // Asignar de vuelta al objeto extraído
        if (inferredCity && inferredCity.toLowerCase() !== "na") {
          const divipolaCity = validateCity(inferredCity);
          if (divipolaCity) {
            inferredCity = divipolaCity; // Sobreescribimos con el nombre canónico (ej. Bogotá, D.C.)
          }
          if (isProperty) {
            extracted.city = inferredCity;
          } else {
            extracted.ciudadDeseada = inferredCity;
          }
        }

        geoValidation = await validarZona(zoneToValidate, inferredCity, messageToProcess);
        isValidGeo = geoValidation.isValid;
      }
      
      if (!isValidGeo) {
        // En modo sensor silencioso, se admite la geografía no validada marcándola en missingFields y continuando
        isValidGeo = true;
        if (!result.missingFields) result.missingFields = [];
        if (!result.missingFields.includes("zone")) result.missingFields.push("zone");
      }

      // ── DEDUCCIÓN GEOGRÁFICA TRIPARTITA INTELIGENTE (v22.0) ──
      const triGeo = deducirGeografiaTripartita(
        isProperty ? extracted?.zone : (extracted?.zonaDeseada || extracted?.zone),
        isProperty ? extracted?.city : (extracted?.ciudadDeseada || extracted?.city),
        groupName,
        messageToProcess
      );

      if (isProperty) {
        extracted.zone = triGeo.neighborhood;
        extracted.addressNeighborhood = triGeo.neighborhood;
        extracted.addressLocality = triGeo.locality;
        extracted.addressCity = triGeo.city;
        extracted.city = triGeo.city;
        if (geoValidation && geoValidation.isValid) {
          extracted.latitude = geoValidation.latitude || null;
          extracted.longitude = geoValidation.longitude || null;
        }
      } else {
        extracted.zonaDeseada = triGeo.neighborhood;
        extracted.addressNeighborhood = triGeo.neighborhood;
        extracted.addressLocality = triGeo.locality;
        extracted.addressCity = triGeo.city;
        extracted.ciudadDeseada = triGeo.city;
      }
    }

    // --- PERSISTENCIA Y MATCHING (Con Flujos DM) ---
    const origenTipo = (isGroup || groupJid) ? "grupo" : "contacto_directo";
    const origenId = (isGroup || groupJid) ? (groupJid || userId) : userId;
    const origenNombre = (isGroup || groupJid) ? (groupName || "Grupo WhatsApp") : (userName || realName || "Contacto Directo");

    if (isProperty) {
      const cleanCheckText = (rawUserText || text || messageToProcess || '').toLowerCase();
      const groupForTx = (groupName || '').toLowerCase();
      const isGroupRent = groupForTx.includes('arriend') || groupForTx.includes('alquil') || groupForTx.includes('renta');

      const hasPermutaSignals = /\b(?:permuto|permuta|permutas|permutamos|se permuta|recibo menor valor|recibo inmueble|recibo vehículo|recibo vehiculo|pelo a pelo|encime|parte de pago)\b/i.test(cleanCheckText);
      const hasRentSignals = /\b(?:arriendo|arriendos|arrendar|arrendamos|se arrienda|arriendan|alquilo|alquilar|alquilamos|se alquila|alquiler|alquileres|rento|rentar|se renta|renta|rentas|canon|canones|cánones|amoblado|amoblada|sin amoblar|arrendatario|arrendador|inquilino)\b/i.test(cleanCheckText)
        || /(?:incluida|con|\+|más|mas)\s*(?:administraci[oó]n|admon)/i.test(cleanCheckText)
        || /(?:administraci[oó]n|admon)\s*(?:incluida|adicional)/i.test(cleanCheckText)
        || /valor arriendo/i.test(cleanCheckText);
      const hasVentaSignals = /\b(?:vendo|vendemos|se vende|en venta|venta directa|valor venta)\b/i.test(cleanCheckText);

      if (hasPermutaSignals) {
        extracted.transactionType = hasVentaSignals ? "venta_permuta" : "permuta";
      } else if (hasRentSignals && hasVentaSignals) {
        extracted.transactionType = "venta_o_arriendo";
      } else if (hasRentSignals || (isGroupRent && !hasVentaSignals)) {
        extracted.transactionType = "arriendo";
        if (extracted.price && (!extracted.rentPrice || Number(extracted.rentPrice) <= 0)) {
          extracted.rentPrice = extracted.price;
        }
      } else if (hasVentaSignals) {
        extracted.transactionType = "venta";
      }

      const propertyTitle = extracted.title || `${capitalize(extracted.propertyType || 'inmueble')} en ${extracted.zone || 'Bogotá'} para ${extracted.transactionType || 'venta'}`;

      // Filtro Temprano de Clasificación Inmobiliaria Estricta (Tolerancia Cero al Spam, Zoom, Meet, marketing y política)
      const spamCheckProp = esMensajeSpamOBasura(cleanCheckText);
      if (spamCheckProp.isSpam) {
        console.log(`[JANIA-SPAM-FILTER] ⛔ Omitiendo guardado de propiedad en BD (${spamCheckProp.reason}): "${cleanCheckText.substring(0, 50)}..."`);
        result.inserted = false;
        result.classification = "VIOLACION_DE_NORMAS";
        result.reactionEmoji = "🚫";
        return result;
      }

      // Filtro de Seguridad Final de Calidad Comercial: Rechazar publicaciones huecas, frases sueltas o sin ficha técnica
      const hollowCheckProp = isHollowListing(cleanCheckText, propertyTitle, (urls && urls.length > 0 ? urls[0] : undefined));
      if (hollowCheckProp.isHollow && !imageBuffer) {
        console.log(`[JANIA-FILTER] ⛔ Omitiendo guardado de propiedad en BD (${hollowCheckProp.reason}): "${cleanCheckText.substring(0, 60)}..."`);
        result.inserted = false;
        result.classification = "CONSULTA_GENERAL";
        return result;
      }

      let externalUrl: string | undefined = undefined;
      if (urls && urls.length > 0) {
        const permitted = urls.find(url => esDominioPermitido(url));
        if (permitted) {
          externalUrl = permitted;
        }
      }
      const sourceUrl = (urls && urls.length > 0 ? urls[0] : undefined);

      const isFlyerDetected = result.isFlyerOrBanner === true || extracted.isFlyerOrBanner === true;
      const flyerVerbatim = result.flyerVerbatimText || extracted.flyerVerbatimText || "";
      const isImageOnlyProp = (!rawUserText || rawUserText.trim() === '' || rawUserText.includes('[Publicación de Imagen')) && !!imageBuffer;
      
      // DOCTRINA v23.9: Si es solo una imagen sin texto del usuario
      if (isImageOnlyProp) {
        const hasPropSpecs = (Number(extracted.price || 0) > 0) || 
                             (Number(extracted.area || 0) > 0 && (Number(extracted.bedrooms || 0) > 0 || Number(extracted.garages || 0) > 0)) ||
                             (!!extracted.zone && Number(extracted.bedrooms || 0) > 0);
        if (!hasPropSpecs && !isFlyerDetected) {
          console.log(`[JANIA-FILTER] ⛔ Descartando imagen fotográfica ambiental pura: no contiene ficha técnica ni datos comerciales legibles sobreimpresos.`);
          result.inserted = false;
          result.classification = "CONSULTA_GENERAL";
          return result;
        }
      }

      // Solo guardamos imageBuffer en BD como flyer si realmente es un Flyer/Banner comercial
      // Si fue una foto ambiental que acompañaba a un texto, no se sube como flyer
      const flyerBufferToSave = (isImageOnlyProp || isFlyerDetected) ? imageBuffer : undefined;

      const effectivePropRawText = (isImageOnlyProp || isFlyerDetected) 
        ? (flyerVerbatim ? buildFlyerBreakdownText(extracted, flyerVerbatim) : buildFlyerBreakdownText(extracted, rawUserText || text)) 
        : (rawUserText || text);

      const saved = await saveProperty({
        ...extracted,
        name: propertyTitle,
        price: String(extracted.price || 0),
        areaTotal: String(extracted.area || 0),
        idUsuarioWhatsapp: rawPhone,
        rawText: effectivePropRawText,
        amenities: { gives: extracted.gives, wants: extracted.wants, isCollaborativePool: extracted.isCollaborativePool },
        origenTipo,
        origenId,
        origenNombre,
        externalUrl,
        enlaceOrigen: sourceUrl,
        fechaExtraccion: new Date()
      }, userId, realName, flyerBufferToSave, pdfBuffer, pdfMimeType);
      
      if (saved) {
        result.inserted = true;
        result.shouldSendDM = false;
        result.dmResponse = "";
        result.response = "";
        result.mentions = [];
        result.extraDMs = [];
        result.sendReputationHook = false;
        // ── MATRIZ DOCTRINAL v23.0: 6 EMOJIS — INMUEBLE (OFERTA) ──
        const _txProp = (extracted.transactionType || '').toLowerCase();
        const _isPermutaProp = _txProp.includes('permuta') || _txProp === 'venta_permuta' || _txProp === 'aporte';
        const _isRentProp = _txProp.includes('arriendo') || _txProp === 'arriendo_temporal' || _txProp === 'arriendo_con_opcion_de_compra' || _txProp === 'venta_o_arriendo' || isGroupRent || hasRentSignals;
        result.reactionEmoji = _isPermutaProp ? '🔀' : _isRentProp ? '👌' : '👍';

        const { executeMatchEngine } = await import("./matching");
        setImmediate(() => {
          executeMatchEngine(saved.id, null).catch(err => console.error("Error executing match engine:", err));
        });
      }
    } else if (isRequirement) {
      const cleanCheckReqText = (rawUserText || text || messageToProcess || '').toLowerCase();
      const groupForReqTx = (groupName || '').toLowerCase();
      const isGroupReqRent = groupForReqTx.includes('arriend') || groupForReqTx.includes('alquil') || groupForReqTx.includes('renta');

      const isInvestorPurchaseReq = /\b(?:inversionista|inversionistas|para inversi[oó]n|para inversion|rentando|est[eé] rentando|est[eé]n rentando|ojal[aá] rentando|ya rentando|generando renta|produciendo renta|con renta activa|con contrato de arrendamiento|para compra|compro|compra ya|busco para compra)\b/i.test(cleanCheckReqText);
      const hasPermutaReqSignals = /\b(?:permuto|permuta|permutas|permutamos|se permuta|recibo menor valor|recibo inmueble|recibo vehículo|recibo vehiculo|pelo a pelo|encime|parte de pago)\b/i.test(cleanCheckReqText);
      const hasRentReqSignals = !isInvestorPurchaseReq && (
        /\b(?:arriendo|arriendos|arrendar|arrendamos|se arrienda|arriendan|alquilo|alquilar|alquilamos|se alquila|alquiler|alquileres|rento|rentar|se renta|canon|canones|cánones|amoblado|amoblada|sin amoblar|arrendatario|arrendador|inquilino)\b/i.test(cleanCheckReqText)
        || /(?:incluida|con|\+|más|mas)\s*(?:administraci[oó]n|admon)/i.test(cleanCheckReqText)
        || /(?:administraci[oó]n|admon)\s*(?:incluida|adicional)/i.test(cleanCheckReqText)
        || /valor arriendo/i.test(cleanCheckReqText)
      );
      const hasVentaReqSignals = isInvestorPurchaseReq || /\b(?:compro|comprar|en compra|para compra|para adquisición|adquirir|para comprar)\b/i.test(cleanCheckReqText);

      if (hasPermutaReqSignals) {
        extracted.transactionType = hasVentaReqSignals ? "venta_permuta" : "permuta";
      } else if (hasRentReqSignals && hasVentaReqSignals) {
        extracted.transactionType = "venta_o_arriendo";
      } else if (hasRentReqSignals || (isGroupReqRent && !hasVentaReqSignals && !isInvestorPurchaseReq)) {
        extracted.transactionType = "arriendo";
      } else {
        extracted.transactionType = "venta";
      }

      // Filtro Temprano de Clasificación Inmobiliaria Estricta (Tolerancia Cero al Spam, Zoom, Meet, marketing y política)
      const spamCheckReq = esMensajeSpamOBasura(cleanCheckReqText);
      if (spamCheckReq.isSpam) {
        console.log(`[JANIA-SPAM-FILTER] ⛔ Omitiendo guardado de requerimiento en BD (${spamCheckReq.reason}): "${cleanCheckReqText.substring(0, 50)}..."`);
        result.inserted = false;
        result.classification = "VIOLACION_DE_NORMAS";
        result.reactionEmoji = "🚫";
        return result;
      }

      const reqTitle = extracted.title || `Requerimiento de ${extracted.propertyType || 'inmueble'} en ${extracted.zonaDeseada || extracted.zone || 'Bogotá'} para ${extracted.transactionType || 'venta'}`;

      // Filtro de Seguridad Final de Calidad Comercial: Rechazar requerimientos huecos, saludos o frases sueltas
      const hollowCheckReq = isHollowListing(cleanCheckReqText, reqTitle, (urls && urls.length > 0 ? urls[0] : undefined));
      if (hollowCheckReq.isHollow) {
        console.log(`[JANIA-FILTER] ⛔ Omitiendo guardado de requerimiento en BD (${hollowCheckReq.reason}): "${cleanCheckReqText.substring(0, 60)}..."`);
        result.inserted = false;
        result.classification = "CONSULTA_GENERAL";
        return result;
      }

      const sourceUrlReq = (urls && urls.length > 0 ? urls[0] : null);

      const isFlyerDetectedReq = result.isFlyerOrBanner === true || extracted.isFlyerOrBanner === true;
      const flyerVerbatimReq = result.flyerVerbatimText || extracted.flyerVerbatimText || "";
      const isImageOnlyReq = (!messageToProcess || messageToProcess.trim() === '' || messageToProcess.includes('[Publicación de Imagen')) && !!imageBuffer;

      // DOCTRINA v23.9: Si es solo una imagen sin texto del usuario
      if (isImageOnlyReq) {
        const hasReqSpecs = (Number(extracted.presupuestoMax || extracted.price || 0) > 0) ||
                            (!!(extracted.zonaDeseada || extracted.zone) && (Number(extracted.bedrooms || 0) > 0 || Number(extracted.area || 0) > 0)) ||
                            (extracted.title && /compra|busco|requerimiento|solicitud|presupuesto/i.test(extracted.title));
        if (!hasReqSpecs && !isFlyerDetectedReq) {
          console.log(`[JANIA-FILTER] ⛔ Descartando imagen fotográfica ambiental pura: no contiene criterios de requerimiento legibles sobreimpresos.`);
          result.inserted = false;
          result.classification = "CONSULTA_GENERAL";
          return result;
        }
      }

      const flyerBufferToSaveReq = (isImageOnlyReq || isFlyerDetectedReq) ? imageBuffer : undefined;

      const effectiveReqRawText = (isImageOnlyReq || isFlyerDetectedReq) 
        ? (flyerVerbatimReq ? buildFlyerBreakdownText(extracted, flyerVerbatimReq) : buildFlyerBreakdownText(extracted, messageToProcess)) 
        : messageToProcess;

      const saved = await saveRequirement({
        ...extracted,
        name: reqTitle,
        tipoInmuebleDeseado: extracted.propertyType,
        tipoNegocioDeseado: extracted.transactionType,
        zonaDeseada: extracted.zonaDeseada || extracted.zone,
        presupuestoMax: String(extracted.presupuestoMax || extracted.price || 0),
        idUsuarioWhatsapp: rawPhone,
        rawText: effectiveReqRawText,
        caracteristicasDeseadas: { gives: extracted.gives, wants: extracted.wants },
        origenTipo,
        origenId,
        origenNombre,
        enlaceOrigen: sourceUrlReq,
        fechaExtraccion: new Date()
      }, userId, realName, flyerBufferToSaveReq, pdfBuffer, pdfMimeType);

      if (saved) {
        result.inserted = true;
        result.shouldSendDM = false;
        result.dmResponse = "";
        result.response = "";
        result.mentions = [];
        result.extraDMs = [];
        result.sendReputationHook = false;
        // ── MATRIZ DOCTRINAL v23.0: 6 EMOJIS — REQUERIMIENTO (DEMANDA) ──
        const _txReq = (extracted.transactionType || extracted.tipoNegocioDeseado || '').toLowerCase();
        const _isPermutaReq = _txReq.includes('permuta') || _txReq === 'venta_permuta' || _txReq === 'aporte';
        const _isRentReq = _txReq.includes('arriendo') || _txReq === 'arriendo_temporal' || _txReq === 'arriendo_con_opcion_de_compra' || _txReq === 'venta_o_arriendo' || isGroupReqRent || hasRentReqSignals;
        result.reactionEmoji = _isPermutaReq ? '🔄' : _isRentReq ? '✏️' : '📝';

        const { executeMatchEngine } = await import("./matching");
        setImmediate(() => {
          executeMatchEngine(null, saved.id).catch(err => console.error("Error executing match engine:", err));
        });
      }
    }

    // Intercepción de consultas en el grupo de inmuebles para redirigir (solo aplica en el grupo principal de inmuebles)
    const isConsultation = result.classification === "CONSULTA_GENERAL" || result.classification === "RESPUESTA_A_PREGUNTA_IA" || result.classification === "ANALISIS_DE_MERCADO";
    const isMainPropertiesGroup = !groupJid || groupJid === '120363260108880069@g.us';
    if (isGroup && isConsultation && isMainPropertiesGroup) {
      const textLower = messageToProcess.toLowerCase();

      // A. Consultas sobre cómo publicar o subir inmuebles o cómo funciona el grupo
      const isAboutPublishing = 
        textLower.includes("subir") || 
        textLower.includes("cómo subo") || 
        textLower.includes("como subo") ||
        textLower.includes("publicar") || 
        textLower.includes("cómo publico") || 
        textLower.includes("como publico") ||
        textLower.includes("cómo se publica") || 
        textLower.includes("como se publica") ||
        textLower.includes("cómo registrar") || 
        textLower.includes("como registrar") ||
        textLower.includes("cómo funciona") || 
        textLower.includes("como funciona") ||
        textLower.includes("de qué consiste") || 
        textLower.includes("de que consiste") ||
        textLower.includes("en qué consiste") || 
        textLower.includes("en que consiste") ||
        textLower.includes("cómo hago para") || 
        textLower.includes("como hago para") ||
        textLower.includes("cómo buscar") || 
        textLower.includes("como buscar") ||
        textLower.includes("cómo encontrar") || 
        textLower.includes("como encontrar") ||
        textLower.includes("instrucciones") ||
        textLower.includes("ayuda") ||
        textLower.includes("explicar") || 
        textLower.includes("explicame") || 
        textLower.includes("explícame");

      const isAboutVecy = 
        textLower.includes("vecy") || 
        textLower.includes("proyecto") || 
        textLower.includes("quien creo") || 
        textLower.includes("quién creó") || 
        textLower.includes("creadores") || 
        textLower.includes("quien es jania") || 
        textLower.includes("quién es jania") ||
        textLower.includes("circulo cero") ||
        textLower.includes("círculo cero") ||
        textLower.includes("ubicapp") ||
        textLower.includes("samboni") ||
        textLower.includes("competidor") ||
        textLower.includes("competencia");

      const greetingPrefix = await getTimeOfDayGreetingForUser(rawPhone, realName, alreadyGreeted, isGroup);

      let welcomePart = "";
      if (!alreadyGreeted) {
        welcomePart = ` ¡Te doy la más cordial bienvenida a nuestra comunidad! 🤝✨`;
      }

      if (isAboutPublishing) {
        result.response = `📢 *¿CÓMO PUBLICAR EN VECY NETWORK?* 📢\n\n${greetingPrefix},${welcomePart} es muy sencillo y totalmente gratuito. Puedes publicar tus *ofertas* (venta/arriendo) o *requerimientos* (búsquedas) directamente aquí en el grupo de las siguientes formas:\n\n` +
          `✍️ *Texto*: Envía una descripción con la ubicación (Ciudad y Barrio), precio y ficha técnica (área, habitaciones, baños, parqueaderos y estrato).\n` +
          `🔗 *Enlaces/Links*: Comparte enlaces de portales inmobiliarios permitidos o de tu propia web (Wasi, Fincaraiz, Metrocuadrado, Ciencuadras, Habi, etc.) y extraeré los datos automáticamente.\n` +
          `📄 *PDF*: Sube la ficha técnica de la propiedad en formato PDF.\n` +
          `🎙️ *Nota de Voz*: Graba un audio dictando los datos del inmueble.\n` +
          `🖼️ *Flyer/Captura*: Comparte una imagen o flyer que contenga los detalles comerciales en el texto.\n\n` +
          `*¿Cómo funciona?*\n` +
          `1️⃣ Al publicar, mi sistema registrará la propiedad e iniciará una búsqueda de coincidencias (matches) automáticamente a nivel nacional.\n` +
          `2️⃣ Si encuentro un MATCH, te notificaré y te enviaré un mensaje por *chat privado (DM)* solicitando tu confirmación.\n` +
          `3️⃣ Si ambos aliados confirman interés en privado, les entregaré sus contactos directos para que cierren el negocio. 🤝🚀\n\n` +
          `Si tienes dudas o prefieres usar mi menú de soporte y búsqueda de propiedades privado, escríbeme directamente en nuestra Consola Web:\n👉 https://vecy-network.vercel.app/jania`;
        result.classification = "CONSULTA_GENERAL";
      } else if (isAboutVecy) {
        const isCompetitorQuery = 
          textLower.includes("ubicapp") || 
          textLower.includes("samboni") || 
          textLower.includes("competidor") || 
          textLower.includes("competencia");
          
        const groupZeroName = process.env.GROUP_ZERO_NAME || 'PROYECTO "Vecy Network"';
        if (isCompetitorQuery) {
          result.response = `👌 *${groupZeroName.toUpperCase()} — DEBATE Y COMUNIDAD* 👌\n\n${greetingPrefix}, detecté una mención a plataformas competidoras o comparativas de servicios. Para mantener este canal enfocado exclusivamente en ofertas y requerimientos, te invito a plantear tus preguntas, comparar beneficios o participar en el debate en nuestro canal oficial **${groupZeroName}**:\n👉 https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU\n\n¡Allí debatimos abiertamente con total transparencia y profesionalismo! 🤝✨`;
        } else {
          result.response = `👌 *${groupZeroName.toUpperCase()} — CONEXIÓN VECY* 👌\n\n${greetingPrefix}, veo que tienes dudas o quieres saber más sobre el proyecto VECY Network, beneficios, creadores o el plan colaborativo. Te invito a unirte y hacer tus preguntas en nuestro canal oficial **${groupZeroName}**:\n👉 https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU\n\n¡Es el espacio ideal para resolver todas tus inquietudes de la comunidad! 🤝✨`;
        }
        result.classification = "VIOLACION_DE_NORMAS";
        result.reactionEmoji = "🚫";
      } else {
        result.response = `💡 *VECY: SOPORTE LEGAL, CONTRATOS Y AVALÚOS* 💡\n\n${greetingPrefix}, veo que tienes una consulta jurídica, procedimental o de avalúo. Para darte una respuesta detallada con mis motores legales y de mercado sin saturar este canal de ofertas y requerimientos, te invito a realizar tu pregunta en nuestro grupo especializado **VECY: SOPORTE LEGAL, CONTRATOS Y AVALÚOS**:\n👉 https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6\n\n¡Allí te responderé al instante con toda la información! 🚀🎯`;
        result.classification = "VIOLACION_DE_NORMAS";
        result.reactionEmoji = "🚫";
      }
    }

    if (result && result.response) {
      result.response = sanitizeResponseMarkdown(result.response);
    }
    if (result && result.dmResponse) {
      result.dmResponse = sanitizeResponseMarkdown(result.dmResponse);
    }
    // ── FALLBACK DOCTRINAL v23.0: Solo si no se asignó emoji en los bloques de inserción ──
    // Este bloque NUNCA debe pisar un emoji ya calculado con transactionType real.
    if (!result.reactionEmoji) {
      const _txFallback = (extracted?.transactionType || extracted?.tipoNegocioDeseado || '').toLowerCase();
      const _isPermutaFb = _txFallback.includes('permuta') || _txFallback === 'venta_permuta' || _txFallback === 'aporte';
      const _isRentFb = _txFallback.includes('arriendo') || _txFallback === 'arriendo_temporal' || _txFallback === 'arriendo_con_opcion_de_compra';

      if (result.classification === "INMUEBLE") {
        result.reactionEmoji = _isPermutaFb ? '🔀' : _isRentFb ? '👌' : '👍';
      } else if (result.classification === "REQUERIMIENTO") {
        result.reactionEmoji = _isPermutaFb ? '🔄' : _isRentFb ? '✏️' : '📝';
      } else if (result.classification === "VIOLACION_DE_NORMAS") {
        result.reactionEmoji = "🚫";
      }
    }

    return result;
  } catch (error) {
    console.error("Error en JanIA v11.70:", error);
    return { classification: "CONSULTA_GENERAL", response: "", mentions: [] };
  }
}

export function isGenericName(n: string | null | undefined): boolean {
  if (!n) return true;
  const lower = n.toLowerCase().trim();
  return lower.startsWith("asesor +") || 
         lower === "asesor" || 
         lower === "nuevo asesor" || 
         lower === "colega" || 
         lower === "";
}

// ── DIRECTORIO GLOBAL DE BROKERS Y RESOLUCIÓN INTELIGENTE DE CONTACTO (100% PASIVO / SEGURO) ──
export const brokerDirectoryCache = new Map<string, { phone: string; name?: string }>();

export function extractColombianPhoneFromText(text: string | null | undefined): string | null {
  if (!text) return null;
  const clean = text.replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0]/g, ' ');

  // 1. Enlaces directos wa.me (ej: wa.me/57310... o wa.me/310...)
  const waMatch = clean.match(/wa\.me\/(?:57)?(3\d{9})/i);
  if (waMatch) return '57' + waMatch[1];

  // 2. Prefijos explícitos de contacto (Tel, Cel, WhatsApp, Inf, Contacto, Asesor, etc.)
  const contactMatch = clean.match(/(?:tel[eé]fono|tel|celular|cel|whatsapp|wapp|wa|contacto|llamar|inf|info|informaci[oó]n|asesor|escribir|comunicarse|m[oó]vil)\s*:?\s*(?:\+?57\s*)?(3[\d\s.\-]{8,14})/i);
  if (contactMatch) {
    const digits = contactMatch[1].replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('3')) {
      return '57' + digits;
    }
  }

  // 3. Patrón genérico celular Colombia (3xx xxx xxxx) validando que no sea precio ni área
  const genericMatches = clean.matchAll(/(?:\+?57\s*)?(3\d{2}[\s.\-]?\d{3}[\s.\-]?\d{4})\b/g);
  for (const m of genericMatches) {
    const digits = m[1].replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('3')) {
      const idx = m.index ?? 0;
      const before = clean.substring(Math.max(0, idx - 15), idx).toLowerCase();
      const after = clean.substring(idx + m[0].length, idx + m[0].length + 15).toLowerCase();
      
      if (before.includes('$') || before.includes('precio') || before.includes('canon') || before.includes('ppto') || before.includes('presupuesto')) {
        continue;
      }
      if (after.includes('millon') || after.includes('mil') || after.includes('m2') || after.includes('mts') || after.includes('pesos')) {
        continue;
      }
      return '57' + digits;
    }
  }
  return null;
}

export function resolveContactPhone(userId: string, rawText?: string, userName?: string, extractedPhone?: string): string {
  const cleanUserId = userId.split(':')[0].split('@')[0];
  const isLid = cleanUserId.length > 13 || cleanUserId.startsWith('1203');

  // 1. Prioridad Máxima: Si en el texto viene un teléfono explícito
  const phoneFromText = extractColombianPhoneFromText(rawText);
  if (phoneFromText) {
    brokerDirectoryCache.set(cleanUserId, { phone: phoneFromText, name: userName });
    if (userName) brokerDirectoryCache.set(userName, { phone: phoneFromText, name: userName });
    return phoneFromText;
  }

  // 2. Si el LLM extrajo un teléfono válido
  if (extractedPhone) {
    const cleanExt = extractedPhone.replace(/\D/g, '');
    if (cleanExt.length === 10 && cleanExt.startsWith('3')) {
      const p = '57' + cleanExt;
      brokerDirectoryCache.set(cleanUserId, { phone: p, name: userName });
      return p;
    }
    if (cleanExt.length === 12 && cleanExt.startsWith('573')) {
      brokerDirectoryCache.set(cleanUserId, { phone: cleanExt, name: userName });
      return cleanExt;
    }
  }

  // 3. Consultar en el directorio de brokers previamente aprendidos
  const cached = brokerDirectoryCache.get(cleanUserId) || (userName ? brokerDirectoryCache.get(userName) : null);
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

export async function initBrokerDirectory() {
  try {
    const db = await getDb();
    if (!db) return;
    const knownProps = await db.select({
      phone: properties.idUsuarioWhatsapp,
      name: properties.nombreUsuarioWhatsapp
    }).from(properties);

    const knownReqs = await db.select({
      phone: requirements.idUsuarioWhatsapp,
      name: requirements.nombreUsuarioWhatsapp
    }).from(requirements);

    for (const item of [...knownProps, ...knownReqs]) {
      if (item.phone && (item.phone.startsWith('573') || item.phone.startsWith('3')) && item.phone.length <= 12) {
        const cleanPhone = item.phone.startsWith('3') && item.phone.length === 10 ? `57${item.phone}` : item.phone;
        brokerDirectoryCache.set(item.phone, { phone: cleanPhone, name: item.name || undefined });
        if (item.name && !isGenericName(item.name)) {
          brokerDirectoryCache.set(item.name, { phone: cleanPhone, name: item.name });
        }
      }
    }
    console.log(`[JanIA-Directory] ✅ Directorio de brokers cargado en memoria (${brokerDirectoryCache.size} entradas conocidas).`);
  } catch (err: any) {
    console.warn(`[JanIA-Directory] Advertencia cargando directorio inicial:`, err?.message || err);
  }
}

/**
 * Propaga en cascada un teléfono de contacto a todas las propiedades y requerimientos
 * del mismo broker/remitente (por Nombre o por LID antiguo), y lo registra en el directorio en memoria.
 */
export async function propagateBrokerPhoneAcrossAllListings(params: {
  rawPhoneOrText?: string | null;
  brokerName?: string | null;
  oldPhoneOrLid?: string | null;
}): Promise<{ updatedProps: number; updatedReqs: number; cleanPhone: string | null }> {
  const { rawPhoneOrText, brokerName, oldPhoneOrLid } = params;

  let cleanPhone: string | null = null;
  if (rawPhoneOrText) {
    cleanPhone = extractColombianPhoneFromText(rawPhoneOrText);
    if (!cleanPhone) {
      const digits = rawPhoneOrText.replace(/\D/g, '');
      if (digits.length === 10 && digits.startsWith('3')) {
        cleanPhone = '57' + digits;
      } else if (digits.length === 12 && digits.startsWith('573')) {
        cleanPhone = digits;
      }
    }
  }

  const validBrokerName = brokerName && !isGenericName(brokerName) ? brokerName.trim() : null;

  // Si no hay ni teléfono limpio ni nombre válido para propagar, no hay nada que propagar
  if (!cleanPhone && !validBrokerName) {
    return { updatedProps: 0, updatedReqs: 0, cleanPhone: null };
  }

  const db = await getDb();
  if (!db) return { updatedProps: 0, updatedReqs: 0, cleanPhone };

  // 1. Actualizar memoria de directorio permanente
  if (cleanPhone && validBrokerName) {
    brokerDirectoryCache.set(validBrokerName.toLowerCase(), { phone: cleanPhone, name: validBrokerName });
    brokerDirectoryCache.set(validBrokerName, { phone: cleanPhone, name: validBrokerName });
    brokerDirectoryCache.set(cleanPhone, { phone: cleanPhone, name: validBrokerName });
  } else if (cleanPhone) {
    brokerDirectoryCache.set(cleanPhone, { phone: cleanPhone, name: validBrokerName || undefined });
  }
  if (oldPhoneOrLid && cleanPhone) {
    brokerDirectoryCache.set(oldPhoneOrLid, { phone: cleanPhone, name: validBrokerName || undefined });
  }

  let updatedProps = 0;
  let updatedReqs = 0;

  // 2. Propagar a TODAS LAS PROPIEDADES del mismo broker en Supabase (incluyendo las que están en espera sin match)
  const allProps = await db.select({
    id: properties.id,
    name: properties.nombreUsuarioWhatsapp,
    phone: properties.idUsuarioWhatsapp
  }).from(properties);

  for (const p of allProps) {
    const isSameName = validBrokerName && p.name && !isGenericName(p.name) && (
      p.name.trim().toLowerCase() === validBrokerName.toLowerCase() ||
      p.name.trim().toLowerCase().includes(validBrokerName.toLowerCase()) ||
      validBrokerName.toLowerCase().includes(p.name.trim().toLowerCase())
    );
    const isSamePhone = cleanPhone && p.phone === cleanPhone;
    const isSameLid = oldPhoneOrLid && p.phone === oldPhoneOrLid;

    // Si no hay ninguna coincidencia de identidad, continuar
    if (!isSameLid && !isSameName && !isSamePhone) continue;

    const updates: { idUsuarioWhatsapp?: string; nombreUsuarioWhatsapp?: string } = {};

    // Asignar teléfono si tenemos cleanPhone y la propiedad no tiene teléfono real, tiene LID o coincide por nombre/LID
    if (cleanPhone && p.phone !== cleanPhone) {
      if (!p.phone || p.phone.length > 12 || p.phone.startsWith('1203') || p.phone.includes('@') || p.phone === oldPhoneOrLid || isSameName) {
        updates.idUsuarioWhatsapp = cleanPhone;
      }
    }

    // Asignar nombre si tenemos validBrokerName y la propiedad no tiene nombre real o tiene genérico
    if (validBrokerName && p.name !== validBrokerName) {
      if (!p.name || isGenericName(p.name) || isSameLid || isSamePhone) {
        updates.nombreUsuarioWhatsapp = validBrokerName;
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.update(properties).set(updates).where(eq(properties.id, p.id));
      updatedProps++;
    }
  }

  // 3. Propagar a TODOS LOS REQUERIMIENTOS del mismo broker en Supabase (incluyendo los que están en espera sin match)
  const allReqs = await db.select({
    id: requirements.id,
    name: requirements.nombreUsuarioWhatsapp,
    phone: requirements.idUsuarioWhatsapp
  }).from(requirements);

  for (const r of allReqs) {
    const isSameName = validBrokerName && r.name && !isGenericName(r.name) && (
      r.name.trim().toLowerCase() === validBrokerName.toLowerCase() ||
      r.name.trim().toLowerCase().includes(validBrokerName.toLowerCase()) ||
      validBrokerName.toLowerCase().includes(r.name.trim().toLowerCase())
    );
    const isSamePhone = cleanPhone && r.phone === cleanPhone;
    const isSameLid = oldPhoneOrLid && r.phone === oldPhoneOrLid;

    if (!isSameLid && !isSameName && !isSamePhone) continue;

    const updates: { idUsuarioWhatsapp?: string; nombreUsuarioWhatsapp?: string } = {};

    if (cleanPhone && r.phone !== cleanPhone) {
      if (!r.phone || r.phone.length > 12 || r.phone.startsWith('1203') || r.phone.includes('@') || r.phone === oldPhoneOrLid || isSameName) {
        updates.idUsuarioWhatsapp = cleanPhone;
      }
    }

    if (validBrokerName && r.name !== validBrokerName) {
      if (!r.name || isGenericName(r.name) || isSameLid || isSamePhone) {
        updates.nombreUsuarioWhatsapp = validBrokerName;
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.update(requirements).set(updates).where(eq(requirements.id, r.id));
      updatedReqs++;
    }
  }

  console.log(`[JanIA-Propagate] 🚀 Broker ${validBrokerName || 'Sin Nombre'} (+${cleanPhone || 'Sin Celular'}) propagado a ${updatedProps} propiedades y ${updatedReqs} requerimientos en Supabase.`);
  return { updatedProps, updatedReqs, cleanPhone };
}

// Inicialización automática diferida
setTimeout(() => {
  initBrokerDirectory().catch(() => {});
}, 3000);

async function findOrCreateUserByPhone(phone: string, realName: string) {
  const db = await getDb();
  if (!db) return null;

  const cleanPhone = phone.split(':')[0];

  // 1. Buscar por teléfono en la base de datos
  let user = await db.select().from(users).where(eq(users.phone, cleanPhone)).limit(1).then(r => r[0]);

  // 2. Si no lo encuentra, buscar por openId: `wa-${cleanPhone}`
  if (!user) {
    user = await db.select().from(users).where(eq(users.openId, `wa-${cleanPhone}`)).limit(1).then(r => r[0]);
  }

  // 3. Si no existe, crearlo
  if (!user) {
    const openId = `wa-${cleanPhone}`;
    console.log(`[JanIA-findOrCreateUserByPhone] Creando nuevo usuario para WhatsApp: ${realName} (+${cleanPhone})`);
    try {
      const [newUser] = await db.insert(users).values({
        openId,
        name: realName,
        phone: cleanPhone,
        role: "agent",
        loginMethod: "whatsapp"
      }).returning();
      user = newUser;
    } catch (insertErr: any) {
      if (insertErr.code === '23505' || String(insertErr).includes('unique constraint')) {
        console.log(`[JanIA-findOrCreateUserByPhone] Colisión concurrente detectada para ${cleanPhone}. Re-buscando usuario...`);
        user = await db.select().from(users).where(eq(users.openId, openId)).limit(1).then(r => r[0]);
      } else {
        throw insertErr;
      }
    }
  } else {
    // Si ya existe pero el nombre es genérico (o era "Nuevo Asesor"), y tenemos un nombre real, actualizarlo
    if (realName && !isGenericName(realName) && isGenericName(user.name)) {
      console.log(`[JanIA-findOrCreateUserByPhone] Actualizando nombre de usuario para ID ${user.id} a ${realName}`);
      const [updatedUser] = await db.update(users).set({ name: realName }).where(eq(users.id, user.id)).returning();
      user = updatedUser;
    }
  }

  return user;
}

function sanitizePropertyType(type: string): "apartment" | "house" | "building" | "warehouse" | "farm" | "hotel" | "office" | "land" | "commercial" | "loft" | "consultorio" | "cabin" {
  if (!type) return "apartment";
  const t = type.toLowerCase().trim();
  if (t === "consultorio" || t.includes("consultorio") || t.includes("odontol") || t.includes("médic") || t.includes("medic") || t === "office_medical") return "consultorio";
  if (t === "cabin" || t.includes("cabaña") || t.includes("cabana") || t.includes("cabañas") || t.includes("cabanas")) return "cabin";
  if (t === "house" || t === "casa" || t.includes("chalet") || t.includes("quinta") || t.includes("campestre")) return "house";
  if (t === "building" || t === "edificio") return "building";
  if (t === "warehouse" || t === "bodega") return "warehouse";
  if (t === "farm" || t === "finca") return "farm";
  if (t === "hotel" || t.includes("hostal") || t.includes("hospedaje") || t.includes("motel") || t.includes("hostel")) return "hotel";
  if (t === "office" || t === "oficina" || t.includes("oficina")) return "office";
  if (t === "land" || t === "lote" || t === "terreno" || t.includes("lote") || t.includes("terreno")) return "land";
  if (t === "commercial" || t === "local" || t === "locales" || t.includes("local comercial") || t.includes("locales comerciales") || t === "comercial" || t.includes("local")) return "commercial";
  if (t === "loft" || t.includes("loft") || t.includes("apartaestudio") || t.includes("apartasuite")) return "loft";
  if (t === "apartment" || t === "apartamento" || t === "apto" || t.includes("apto") || t.includes("apartamento") || t.includes("penthouse")) return "apartment";
  return "apartment";
}

function sanitizeTransactionType(type: string): "venta" | "arriendo" | "venta_o_arriendo" | "arriendo_temporal" | "arriendo_con_opcion_de_compra" | "permuta" | "venta_permuta" | "aporte" {
  if (!type) return "venta";
  const t = type.toLowerCase().trim().replace(/\s+/g, "_");
  if (t === "venta" || t === "vender" || t === "compra" || t === "comprar") return "venta";
  if (t === "venta_o_arriendo" || t.includes("venta_o_arriendo") || t.includes("venta o arriendo") || t.includes("vendo o arriendo") || t.includes("venta_arriendo")) return "venta_o_arriendo";
  if (t === "arriendo_con_opcion_de_compra" || t.includes("opcion_de_compra") || t.includes("opcion de compra") || t.includes("opción de compra") || t.includes("con opcion") || t.includes("con opción")) return "arriendo_con_opcion_de_compra";
  if (t === "arriendo" || t === "alquiler" || t === "renta" || t === "rentar" || t === "arrendar") return "arriendo";
  if (t === "arriendo_temporal" || t === "temporal" || t === "vacacional" || t === "vacaciones") return "arriendo_temporal";
  if (t === "venta_permuta" || t.includes("venta_permuta") || t.includes("venta permuta") || t.includes("venpermuto") || (t.includes("venta") && t.includes("permuta"))) return "venta_permuta";
  if (t === "permuta" || t === "permuto" || t === "cambio" || t.includes("permuta")) return "permuta";
  if (t === "aporte" || t.includes("aporte") || t === "proyecto") return "aporte";
  return "venta";
}

// Captura MÚLTIPLES tipos de negocio cuando el usuario menciona varias modalidades
function sanitizeTransactionTypes(raw: string | string[] | undefined): string[] {
  const input = Array.isArray(raw) ? raw.join(" ") : (raw || "");
  const n = input.toLowerCase();
  const result: string[] = [];
  // Detectar primero los tipos compuestos para evitar falsos positivos en los simples
  if (n.includes("venta o arriendo") || n.includes("vendo o arriendo") || n.includes("venta_o_arriendo")) result.push("venta_o_arriendo");
  if (n.includes("opcion de compra") || n.includes("opción de compra") || n.includes("con opcion") || n.includes("con opción") || n.includes("arriendo_con_opcion")) result.push("arriendo_con_opcion_de_compra");
  if ((n.includes("venta") && n.includes("permuta")) || n.includes("venta_permuta") || n.includes("venpermuto")) result.push("venta_permuta");
  // Luego los tipos simples (solo si no ya cubiertos por compuestos)
  const hasVentaOArriendo = result.includes("venta_o_arriendo");
  const hasVentaPermuta = result.includes("venta_permuta");
  if (!hasVentaOArriendo && !hasVentaPermuta) {
    if (n.includes("venta") || n.includes("vender") || n.includes("compra") || n.includes("comprar")) result.push("venta");
  }
  if (!hasVentaOArriendo && !result.includes("arriendo_con_opcion_de_compra")) {
    if (n.includes("arriendo") || n.includes("alquiler") || n.includes("renta") || n.includes("rentar")) result.push("arriendo");
  }
  if (n.includes("temporal") || n.includes("vacacional") || n.includes("vacaciones")) result.push("arriendo_temporal");
  if (!hasVentaPermuta) {
    if (n.includes("permuta") || n.includes("permuto") ||
        n.includes("recibo propiedad") || n.includes("recibo vehiculo") || n.includes("parte de pago") ||
        n.includes("cambio de inmueble")) result.push("permuta");
  }
  if (n.includes("aporte") || n.includes("participo en proyecto") || n.includes("constructora") ||
      n.includes("unidades a cambio") || n.includes("utilidades")) result.push("aporte");
  return result.length > 0 ? result : [sanitizeTransactionType(input)];
}

function sanitizeCurrency(curr: string): "COP" | "USD" {
  if (!curr) return "COP";
  const c = curr.toUpperCase().trim();
  if (c === "USD" || c === "DOLARES" || c === "DOLAR") return "USD";
  return "COP";
}

function safeSlice(val: any, limit: number): string | undefined {
  if (val === undefined || val === null) return undefined;
  return String(val).slice(0, limit);
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

export async function handleAmendmentUpdate(userId: string, text: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const rawPhone = userId.split('@')[0].split(':')[0].replace(/\D/g, "");
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const cleanTextLower = text.toLowerCase().trim();
  const isAmendmentTrigger = (
    cleanTextLower.startsWith("correccion") ||
    cleanTextLower.startsWith("corrección") ||
    cleanTextLower.startsWith("fe de erratas") ||
    cleanTextLower.startsWith("fe de errata") ||
    cleanTextLower.startsWith("rectificacion") ||
    cleanTextLower.startsWith("rectificación") ||
    cleanTextLower.startsWith("ajuste:") ||
    cleanTextLower.startsWith("ajuste ") ||
    cleanTextLower.startsWith("disculpen")
  );

  if (!isAmendmentTrigger) return false;

  const fallbackData = extractFallbackDataFromText(text);

  // 1. Buscar requerimiento del usuario en las últimas 2 horas
  const lastReqs = await db.select().from(requirements)
    .where(and(
      eq(requirements.idUsuarioWhatsapp, rawPhone),
      gte(requirements.createdAt, twoHoursAgo)
    ))
    .orderBy(desc(requirements.createdAt))
    .limit(1);

  if (lastReqs.length > 0) {
    const req = lastReqs[0];
    const updates: any = {};

    if (cleanTextLower.includes("parqueadero") && fallbackData.garages > 0) {
      updates.parqueaderosMin = fallbackData.garages;
    }
    if ((cleanTextLower.includes("habitación") || cleanTextLower.includes("habitacion") || cleanTextLower.includes("alcoba")) && fallbackData.bedrooms > 0) {
      updates.habitacionesMin = fallbackData.bedrooms;
    }
    if (cleanTextLower.includes("baño") && fallbackData.bathrooms > 0) {
      updates.banosMin = fallbackData.bathrooms;
    }
    if ((cleanTextLower.includes("precio") || cleanTextLower.includes("presupuesto")) && fallbackData.price > 0) {
      updates.presupuestoMax = String(fallbackData.price);
    }
    if ((cleanTextLower.includes("área") || cleanTextLower.includes("area")) && fallbackData.area > 0) {
      updates.areaMin = String(fallbackData.area);
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await db.update(requirements).set(updates).where(eq(requirements.id, req.id));
      console.log(`[JANIA-AMENDMENT] ✅ Requerimiento #${req.id} actualizado silenciosamente en BD (Ventana 2h):`, updates);
      
      const { executeMatchEngine } = await import("./matching");
      setImmediate(() => {
        executeMatchEngine(null, req.id).catch(err => console.error("Error executing match engine on amendment:", err));
      });
      return true;
    }
  }

  // 2. Buscar propiedad del usuario en las últimas 2 horas
  const lastProps = await db.select().from(properties)
    .where(and(
      eq(properties.idUsuarioWhatsapp, rawPhone),
      gte(properties.createdAt, twoHoursAgo)
    ))
    .orderBy(desc(properties.createdAt))
    .limit(1);

  if (lastProps.length > 0) {
    const prop = lastProps[0];
    const updates: any = {};

    if (cleanTextLower.includes("parqueadero") && fallbackData.garages > 0) {
      updates.garages = fallbackData.garages;
    }
    if ((cleanTextLower.includes("habitación") || cleanTextLower.includes("habitacion") || cleanTextLower.includes("alcoba")) && fallbackData.bedrooms > 0) {
      updates.bedrooms = fallbackData.bedrooms;
    }
    if (cleanTextLower.includes("baño") && fallbackData.bathrooms > 0) {
      updates.bathrooms = fallbackData.bathrooms;
    }
    if ((cleanTextLower.includes("precio") || cleanTextLower.includes("valor")) && fallbackData.price > 0) {
      updates.price = String(fallbackData.price);
    }
    if ((cleanTextLower.includes("área") || cleanTextLower.includes("area")) && fallbackData.area > 0) {
      updates.areaTotal = String(fallbackData.area);
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await db.update(properties).set(updates).where(eq(properties.id, prop.id));
      console.log(`[JANIA-AMENDMENT] ✅ Propiedad #${prop.id} actualizada silenciosamente en BD (Ventana 2h):`, updates);

      const { executeMatchEngine } = await import("./matching");
      setImmediate(() => {
        executeMatchEngine(prop.id, null).catch(err => console.error("Error executing match engine on amendment:", err));
      });
      return true;
    }
  }

  return false;
}

async function saveProperty(data: any, userId: string, realName: string, imageBuffer?: string, pdfBuffer?: string, pdfMimeType?: string) {
  const db = await getDb();
  if (!db) return null;

  if (isNonRealEstateText(data.rawText) || isNonRealEstateText(data.name) || isNonRealEstateText(data.description)) {
    console.log(`[JanIA-Reject] 🚫 Inmueble descartado: mensaje no corresponde a finca raíz (materiales/canteras/maquinaria): ${data.name || data.rawText}`);
    return null;
  }

  const rawTextContent = `${data.rawText || ""} ${data.description || ""} ${data.name || ""}`;
  const effectivePhone = resolveContactPhone(userId, rawTextContent, realName, data.idUsuarioWhatsapp);
  const rawPhone = effectivePhone;
  const user = await findOrCreateUserByPhone(effectivePhone, realName);

  let imageUrl: string | undefined;
  if (imageBuffer) {
    try {
      console.log(`[JanIA-SaveProperty] Subiendo imagen flyer de WhatsApp para ${realName}...`);
      const buffer = Buffer.from(imageBuffer, 'base64');
      const filename = `flyers/wa_${Date.now()}_${rawPhone}.jpg`;
      const uploadResult = await storagePut(filename, buffer, 'image/jpeg');
      imageUrl = uploadResult.url;
      console.log(`[JanIA-SaveProperty] Imagen subida exitosamente: ${imageUrl}`);
    } catch (err) {
      console.error("[JanIA-SaveProperty] Error subiendo imagen:", err);
    }
  }

  let pdfUrl: string | undefined;
  if (pdfBuffer) {
    try {
      console.log(`[JanIA-SaveProperty] Subiendo PDF brochure de WhatsApp para ${realName}...`);
      const buffer = Buffer.from(pdfBuffer, 'base64');
      const filename = `documents/doc_${Date.now()}_${rawPhone}.pdf`;
      const uploadResult = await storagePut(filename, buffer, pdfMimeType || 'application/pdf');
      pdfUrl = uploadResult.url;
      console.log(`[JanIA-SaveProperty] PDF subido exitosamente: ${pdfUrl}`);
    } catch (err) {
      console.error("[JanIA-SaveProperty] Error subiendo PDF:", err);
    }
  }

  // Para VRIF Core v1.0, guardamos el flyer directo de WhatsApp y URLs adicionales
  const finalImages: string[] = [];
  if (imageUrl) {
    finalImages.push(imageUrl);
  }
  if (Array.isArray(data.images)) {
    for (const img of data.images) {
      if (img && typeof img === 'string' && !finalImages.includes(img)) finalImages.push(img);
    }
  }

  if (pdfUrl) {
    data.externalUrl = data.externalUrl || pdfUrl;
    data.enlaceOrigen = data.enlaceOrigen || pdfUrl;
  }

  const amenitiesObj = {
    gives: data.gives || data.amenities?.gives,
    wants: data.wants || data.amenities?.wants,
    isCollaborativePool: data.isCollaborativePool !== undefined ? data.isCollaborativePool : data.amenities?.isCollaborativePool,
    interiorExterior: data.interiorExterior || data.amenities?.interiorExterior,
    cuartoBanoServicio: data.cuartoBanoServicio || data.amenities?.cuartoBanoServicio,
    cocina: data.cocina || data.amenities?.cocina,
    lavanderiaIndependiente: data.lavanderiaIndependiente || data.amenities?.lavanderiaIndependiente,
    tipoPisos: data.tipoPisos || data.amenities?.tipoPisos,
    depositos: data.depositos || data.amenities?.depositos,
    comisiones: data.comisiones || data.amenities?.comisiones,
    antiguedad: data.antiguedad || data.amenities?.antiguedad
  };

  // ── DESAMBIGUACIÓN GEOGRÁFICA v18.0 ──────────────────────────────────────────
  // Detectar barrios compuestos/inventados (ej. "Chicó Refugio") y separar en zonas múltiples.
  if (data.zone && typeof data.zone === "string") {
    const barriosDesambiguados = desambiguarBarriosCompuestos(data.zone);
    if (barriosDesambiguados.length > 1) {
      data.zone = barriosDesambiguados.join(", ");
      data.addressNeighborhood = barriosDesambiguados[0]; // Barrio principal canónico
      console.log(`[JanIA-GeoDisambiguate] Barrio compuesto: "${data.zone}"`);
    }
  }

  // ── AUTO-DETECCIÓN Y BIFURCACIÓN DE PRECIO PARA FICHAS DUALES (venta_o_arriendo) v22.4 ────────
  // price = precio de VENTA · rentPrice = canon NETO de arriendo (sin administración)
  const rawLowerTx = (data.rawText || "").toLowerCase();
  let txTypeForSplit = (data.transactionType || "").toLowerCase();

  const hasExplicitRent = rawLowerTx.includes("arriendo") || rawLowerTx.includes("canon") || rawLowerTx.includes("renta");
  const hasExplicitSale = rawLowerTx.includes("venta") || rawLowerTx.includes("precio de venta");

  if (hasExplicitRent && hasExplicitSale && (txTypeForSplit === "venta" || txTypeForSplit === "arriendo")) {
    const rentMatchTest = rawLowerTx.match(/(?:valor\s*arriendo|arriendo|canon|renta)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|m|M)?/i);
    const saleMatchTest = rawLowerTx.match(/(?:precio\s*(?:de\s*)?venta|venta)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|mm|mlls|m|M)?/i);
    if (rentMatchTest && saleMatchTest) {
      txTypeForSplit = "venta_o_arriendo";
      data.transactionType = "venta_o_arriendo";
      console.log(`[JanIA-DualDetector] Promovido a 'venta_o_arriendo' por presencia dual de arriendo y venta en rawText.`);
    }
  }

  if (txTypeForSplit === "venta_o_arriendo" || txTypeForSplit === "arriendo_con_opcion_de_compra") {
    const currentPrice   = data.price     ? parseFloat(String(data.price))     : 0;
    const currentRentP   = data.rentPrice ? parseFloat(String(data.rentPrice)) : 0;
    const priceSaleField = data.priceSale ? parseFloat(String(data.priceSale)) : 0;
    const priceRentField = data.priceRent ? parseFloat(String(data.priceRent)) : 0;

    let finalSalePrice = currentPrice > 100_000_000 ? currentPrice : priceSaleField;
    let finalRentPrice = currentRentP > 0 ? currentRentP : priceRentField;

    // Buscar canon explícito en rawText si no está poblado
    if (finalRentPrice <= 0) {
      const rentMatch = rawLowerTx.match(/(?:valor\s*arriendo|arriendo|canon|renta)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|m|M)?/i);
      if (rentMatch) {
        let rawRNum = parseFloat(rentMatch[1].replace(/[.,]/g, ""));
        const unitR = (rentMatch[2] || "").toLowerCase();
        const multR = unitR.includes("mil millon") ? 1_000_000_000 : (unitR.includes("millon") || unitR === "m") ? 1_000_000 : rawRNum < 10_000 ? 1_000_000 : 1;
        finalRentPrice = rawRNum * multR;
      }
    }

    // Buscar precio de venta explícito en rawText si no está poblado o si era menor a 100M
    if (finalSalePrice < 100_000_000) {
      const saleMatch = rawLowerTx.match(/(?:precio\s*(?:de\s*)?venta|venta)\s*:?\s*\$?([\d.,]+)\s*(mil\s*millones?|millones?|mm|mlls)?/i);
      if (saleMatch) {
        let rawSNum = parseFloat(saleMatch[1].replace(/[.,]/g, ""));
        const unitS = (saleMatch[2] || "").toLowerCase();
        const multS = unitS.includes("mil millon") ? 1_000_000_000 : (unitS.includes("millon") || unitS.includes("mm") || unitS.includes("mlls")) ? 1_000_000 : rawSNum < 10_000 ? 1_000_000 : 1;
        const computedS = rawSNum * multS;
        if (computedS >= 100_000_000) finalSalePrice = computedS;
      }
    }

    if (finalSalePrice > 0) data.price = finalSalePrice;
    if (finalRentPrice > 0) {
      const adminFeeVal = data.adminFee ? parseFloat(String(data.adminFee)) : 0;
      if (adminFeeVal > 0 && finalRentPrice >= adminFeeVal && finalRentPrice < 100_000_000) {
        data.rentPrice = finalRentPrice - adminFeeVal; // Canon neto
      } else {
        data.rentPrice = finalRentPrice;
      }
    }
    console.log(`[JanIA-PriceSplit] ${txTypeForSplit} → price(venta)=${data.price} | rentPrice(canon neto)=${data.rentPrice}`);
  }

  // ── SANIDAD FINANCIERA ESTRICTA DOCTRINAL v22.4 ─────────────
  // 1. Para inmuebles en arriendo puro (arriendo / arriendo_temporal):
  //    data.price (Precio de Venta) NUNCA debe contener el valor del canon (ej. $9.900.000).
  //    data.price debe ser "0". El canon debe ir exclusivamente en data.rentPrice.
  if (txTypeForSplit === "arriendo" || txTypeForSplit === "arriendo_temporal") {
    const curP = data.price ? parseFloat(String(data.price)) : 0;
    const curR = data.rentPrice ? parseFloat(String(data.rentPrice)) : 0;
    if (curR <= 0 && curP > 0 && curP < 100_000_000) {
      data.rentPrice = curP;
    }
    data.price = "0"; // Cero absoluto de venta para inmuebles de arriendo puro
  }

  // 2. Para inmuebles en venta pura (venta):
  //    data.rentPrice NUNCA debe ser poblado. Debe ser null/0.
  if (txTypeForSplit === "venta") {
    data.rentPrice = null;
  }

  // 3. Cuota de Administración (data.adminFee):
  //    La cuota de administración JAMÁS puede ser igual al canon de arriendo ni al precio de venta.
  //    Si data.adminFee === data.rentPrice o data.adminFee >= data.rentPrice * 0.45 -> reset a 0 (N/E).
  const curRentVal = data.rentPrice ? parseFloat(String(data.rentPrice)) : 0;
  const curSaleVal = data.price ? parseFloat(String(data.price)) : 0;
  const curAdminVal = data.adminFee ? parseFloat(String(data.adminFee)) : 0;

  if (curAdminVal > 0) {
    if (
      (curRentVal > 0 && (curAdminVal === curRentVal || curAdminVal >= curRentVal * 0.45)) ||
      (curSaleVal > 0 && (curAdminVal === curSaleVal || curAdminVal >= curSaleVal * 0.20))
    ) {
      data.adminFee = 0; // Reset por error de duplicación o paridad ilógica
      console.log(`[JanIA-SanidadPredial] Corregida cuota de administración absurda/duplicada $${curAdminVal} → N/E (0)`);
    }
  }

  // ── SANIDAD PREDIAL DE PRECIOS v20.0 / v25.4 (Desambiguación Administración vs Precio Venta) ──
  const isVentaType = txTypeForSplit.includes("venta") || !txTypeForSplit.includes("arriendo");
  const currentPriceVal = data.price ? parseFloat(String(data.price)) : 0;

  if (isVentaType && (currentPriceVal < 100_000_000 || !data.price) && data.rawText) {
    const fallbackD = extractFallbackDataFromText(data.rawText);
    if (fallbackD.price >= 30_000_000) {
      if ((!data.adminFee || parseFloat(String(data.adminFee)) <= 0) && fallbackD.adminFee > 0) {
        data.adminFee = fallbackD.adminFee;
      }
      data.price = fallbackD.price;
      console.log(`[JanIA-SanidadPredial] Corregido precio de venta $${currentPriceVal} → Real: $${fallbackD.price} | AdminFee: $${data.adminFee}`);
    } else if (currentPriceVal < 30_000_000) {
      // En venta, ningún inmueble vale < 30M: si está en rango de administración, moverlo a adminFee
      if ((!data.adminFee || parseFloat(String(data.adminFee)) <= 0) && currentPriceVal >= 100_000 && currentPriceVal <= 30_000_000) {
        data.adminFee = currentPriceVal;
      }
      data.price = 0;
      console.log(`[JanIA-SanidadPredial] Precio de venta menor a 30M ($${currentPriceVal}) desambiguado como AdminFee: $${data.adminFee} y Price: 0 (N/E)`);
    }
  }

  // Rescatar campos físicos si vienen null o en 0
  if (data.rawText) {
    const fallbackD = extractFallbackDataFromText(data.rawText);
    if ((!data.adminFee || parseFloat(String(data.adminFee)) <= 0) && fallbackD.adminFee > 0) {
      data.adminFee = fallbackD.adminFee;
    }
    if ((!data.garages || Number(data.garages) <= 0) && fallbackD.garages > 0) {
      data.garages = fallbackD.garages;
    }
    if ((!data.antiguedadAnos || Number(data.antiguedadAnos) <= 0) && fallbackD.antiguedadAnos !== null) {
      data.antiguedadAnos = fallbackD.antiguedadAnos;
    }
    if ((!data.areaTotal && !data.area) && fallbackD.area > 0) {
      data.areaTotal = fallbackD.area;
    }
  }

  // ── RESOLUCIÓN GEOGRÁFICA INTELIGENTE DE INTERSECCIONES Y CRUCES ──
  if (!data.zone || data.zone.trim() === "" || data.zone.toLowerCase() === "bogota" || data.zone.toLowerCase() === "bogotá" || data.zone.toLowerCase() === "colombia") {
    const geoInferred = resolveIntersectionToBarrio(data.rawText || data.name || data.location);
    if (geoInferred) {
      data.zone = geoInferred.barrio;
      data.addressNeighborhood = geoInferred.barrio;
      data.addressLocality = geoInferred.localidad;
      data.city = data.city || geoInferred.ciudad;
      console.log(`[JanIA-GeoResolver] 🧭 Inmueble: cruce vial deducido exitosamente: '${(data.rawText || "").slice(0, 45)}...' → Barrio: ${geoInferred.barrio} | Localidad: ${geoInferred.localidad} | Ciudad: ${geoInferred.ciudad}`);
    }
  }

  const insertData = {
    ...data,
    name: safeSlice(data.name || `Propiedad en ${data.city || data.zone || "Colombia"}`, 255) || "Propiedad",
    city: safeSlice(data.city || data.ciudadDeseada, 100) || null,
    zone: safeSlice(data.zone || data.addressNeighborhood || data.addressLocality || data.location || data.city || data.ciudadDeseada || "Bogotá", 100) || "Bogotá",
    addressCity: safeSlice(data.addressCity || data.address_city || data.city, 100) || null,
    addressLocality: safeSlice(data.addressLocality || data.address_locality, 100) || null,
    addressNeighborhood: safeSlice(data.addressNeighborhood || data.address_neighborhood || data.zone, 150) || null,
    location: safeSlice(data.location, 255) || null,
    matriculaInmobiliaria: safeSlice(data.matriculaInmobiliaria, 100) || null,
    enlaceOrigen: safeSlice(data.enlaceOrigen, 1000) || null,
    idUsuarioWhatsapp: safeSlice(data.idUsuarioWhatsapp || rawPhone, 100) || null,
    nombreUsuarioWhatsapp: safeSlice((realName && realName.trim() !== "" && !realName.startsWith("Asesor +")) ? realName : (data.nombreUsuarioWhatsapp || realName), 255) || null,
    propertyType: sanitizePropertyType(data.propertyType),
    transactionType: sanitizeTransactionType(data.transactionType),
    acceptedTransactionTypes: sanitizeTransactionTypes(data.transactionTypes || data.transactionType),
    currency: sanitizeCurrency(data.currency),
    // Mapear explícitamente los campos con Sanidad Numérica Post-Extracción (Bug #6 Fix)
    price: (() => {
      const isRent = sanitizeTransactionType(data.transactionType) === "arriendo" || sanitizeTransactionType(data.transactionType) === "arriendo_temporal";
      if (isRent) {
        return "0.00";
      }
      if (data.price === undefined || data.price === null) return "0.00";
      const v = parseFloat(String(data.price));
      if (isNaN(v) || isPhoneNumberNotPrice(v, data.rawText)) return "0.00";
      if (v > 50_000_000_000) return "0.00";
      if (v < 30_000_000) return "0.00"; // Sanidad Doctrinal VECY: en venta, precios < 30M son N/E
      return String(v);
    })(),
    rentPrice: (() => {
      const isPureSale = sanitizeTransactionType(data.transactionType) === "venta";
      if (isPureSale) return null; // En venta pura, rentPrice NUNCA debe existir
      if (data.rentPrice === undefined || data.rentPrice === null) return null;
      const v = parseFloat(String(data.rentPrice));
      if (isNaN(v) || v < 300_000 || v > 200_000_000 || isPhoneNumberNotPrice(v, data.rawText)) return null;
      return String(v);
    })(),
    areaTotal: (() => {
      const raw = data.areaTotal !== undefined && data.areaTotal !== null ? data.areaTotal : data.area;
      if (raw === undefined || raw === null) return null;
      const v = parseFloat(String(raw));
      if (isNaN(v) || v < 10 || v > 5000) return null;
      return String(v);
    })(),
    bedrooms: data.bedrooms !== undefined && data.bedrooms !== null ? Math.round(Number(data.bedrooms)) : null,
    bathrooms: data.bathrooms !== undefined && data.bathrooms !== null ? Math.round(Number(data.bathrooms)) : null,
    garages: (() => {
      if (data.garages === undefined || data.garages === null) return null;
      const g = Math.round(Number(data.garages));
      if (isNaN(g) || g < 0) return null;
      if (g >= 1900 && g <= 2100) return null;
      if (g > 30) return null;
      return g;
    })(),
    garageType: data.garageType || null, // "independiente" | "lineal" | "mixto" | null (v20.0)
    stratum: data.stratum !== undefined && data.stratum !== null ? Math.round(Number(data.stratum)) : null,
    adminFee: data.adminFee !== undefined && data.adminFee !== null ? String(data.adminFee) : null,
    yearBuilt: data.yearBuilt !== undefined && data.yearBuilt !== null ? Math.round(Number(data.yearBuilt)) : null,
    antiguedadAnos: data.antiguedadAnos !== undefined && data.antiguedadAnos !== null ? Math.round(Number(data.antiguedadAnos)) : null,
    agentId: user ? user.id : null,
    latitude: data.latitude !== undefined && data.latitude !== null ? String(data.latitude) : null,
    longitude: data.longitude !== undefined && data.longitude !== null ? String(data.longitude) : null,
    images: finalImages.length > 0 ? finalImages : null,
    amenities: amenitiesObj,
    origenTipo: data.origenTipo || null,
    origenId: data.origenId || null,
    origenNombre: data.origenNombre || null,
    fechaExtraccion: data.fechaExtraccion || getColombiaNow()
  };

  // Calcular portal, listingId y canonicalExternalId a partir de externalUrl
  let portal: string | null = null;
  let externalListingId: string | null = null;
  let canonicalExternalId: string | null = null;

  if (data.externalUrl) {
    const extractedInfo = extractPortalAndListingId(data.externalUrl);
    portal = extractedInfo.portal;
    externalListingId = extractedInfo.listingId;
    if (portal && externalListingId) {
      canonicalExternalId = `${portal.toUpperCase()}:${externalListingId}`;
    }
  }

  const finalInsertData = {
    ...insertData,
    portal,
    externalListingId,
    canonicalExternalId,
    externalUrl: data.externalUrl || null,
    fechaPrimeraPublicacion: getColombiaNow(),
    fechaUltimaPublicacion: getColombiaNow(),
    republicacionesCount: 0,
    estadoComercial: "ACTIVO",
    ultimaActividad: "PUBLICACIÓN",
    vigenciaIa: "VIGENTE"
  };

  // Búsqueda jerárquica de duplicados
  let existing: any[] = [];

  // 1. Por ID Canónico
  if (canonicalExternalId) {
    existing = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.canonicalExternalId, canonicalExternalId),
          eq(properties.available, true)
        )
      )
      .limit(1);
  }

  // 2. Por Matrícula Inmobiliaria (si está presente)
  if (existing.length === 0 && finalInsertData.matriculaInmobiliaria) {
    existing = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.matriculaInmobiliaria, finalInsertData.matriculaInmobiliaria),
          eq(properties.available, true)
        )
      )
      .limit(1);
  }

  // 2.5 Por rawText idéntico (Anti-duplicados por publicaciones en múltiples grupos)
  if (existing.length === 0 && finalInsertData.rawText && finalInsertData.rawText.trim().length > 25) {
    existing = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.rawText, finalInsertData.rawText.trim()),
          eq(properties.available, true)
        )
      )
      .limit(1);
  }

  // 3. Fallback comercial (Mismo broker, tipo, negocio, ciudad y barrio)
  if (existing.length === 0) {
    existing = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.idUsuarioWhatsapp, rawPhone),
          eq(properties.propertyType, finalInsertData.propertyType),
          eq(properties.transactionType, finalInsertData.transactionType),
          eq(properties.city, finalInsertData.city),
          eq(properties.zone, finalInsertData.zone),
          eq(properties.available, true)
        )
      )
      .limit(1);
  }

  const { label: calif } = calcularCalificacionCompletitud(finalInsertData, true);
  const insertDataWithCalif = {
    ...finalInsertData,
    calificacion: calif
  };

  if (existing.length > 0) {
    // Si ya existe, actualizamos los datos comerciales y de trazabilidad
    const updatedCount = (existing[0].republicacionesCount || 0) + 1;
    const [updated] = await db
      .update(properties)
      .set({
        price: insertDataWithCalif.price,
        description: insertDataWithCalif.description || existing[0].description,
        adminFee: insertDataWithCalif.adminFee || existing[0].adminFee,
        images: finalImages.length > 0 ? finalImages : existing[0].images,
        origenTipo: insertDataWithCalif.origenTipo,
        origenId: insertDataWithCalif.origenId,
        origenNombre: insertDataWithCalif.origenNombre,
        idUsuarioWhatsapp: insertDataWithCalif.idUsuarioWhatsapp,
        fechaUltimaPublicacion: getColombiaNow(),
        updatedAt: new Date(),
        republicacionesCount: updatedCount,
        estadoComercial: "REPUBLICADO",
        ultimaActividad: "REPUBLICACIÓN",
        vigenciaIa: "VIGENTE"
      })
      .where(eq(properties.id, existing[0].id))
      .returning();

    console.log(`[Deduplication] Propiedad existente detectada (${canonicalExternalId || 'Comercial'}). Actualizando datos (ID: ${updated.id}, Republicado: ${updatedCount})`);

    // Insertar auditoría histórica de la republicación
    try {
      await db.insert(propertyPublicationHistory).values({
        propertyId: existing[0].id,
        grupo: insertDataWithCalif.origenNombre,
        broker: realName,
        brokerPhone: rawPhone,
        accion: "REPUBLICACIÓN",
        portal: portal,
        externalListingId: externalListingId,
        detalles: `Inmueble republicado en ${insertDataWithCalif.origenNombre || 'WhatsApp'}. Precio: ${insertDataWithCalif.price}`
      });
    } catch (histErr) {
      console.error("[JanIA-History] Error al registrar historial de republicación:", histErr);
    }

    // Disparar motor de matching instantáneo para propiedad actualizada
    findMatchesForProperty(updated.id).catch((mErr: any) => console.error("[JanIA-MatchingTrigger] Error recalculando matches para propiedad:", mErr));

    return updated;
  }

  // Creación de propiedad nueva
  const [result] = await db.insert(properties).values(insertDataWithCalif).returning();

  // Disparar motor de matching instantáneo para propiedad nueva
  findMatchesForProperty(result.id).catch((mErr: any) => console.error("[JanIA-MatchingTrigger] Error calculando matches para propiedad:", mErr));

  // Insertar auditoría histórica inicial
  try {
    await db.insert(propertyPublicationHistory).values({
      propertyId: result.id,
      grupo: insertDataWithCalif.origenNombre,
      broker: realName,
      brokerPhone: rawPhone,
      accion: "PUBLICACIÓN",
      portal: portal,
      externalListingId: externalListingId,
      detalles: `Inmueble ingresado por primera vez desde ${insertDataWithCalif.origenNombre || 'WhatsApp'}. Precio: ${insertDataWithCalif.price}`
    });
  } catch (histErr) {
    console.error("[JanIA-History] Error al registrar historial inicial:", histErr);
  }

  // Si se subió una imagen, registrarla en la tabla propertyImages también
  if (result && imageUrl) {
    try {
      await db.insert(propertyImages).values({
        propertyId: result.id,
        imageUrl: imageUrl,
        isMainImage: true,
        displayOrder: 1,
        mimeType: "image/jpeg",
        uploadedBy: "janIA"
      });
      console.log(`[JanIA-SaveProperty] Registro en propertyImages creado para propiedad ${result.id}`);
    } catch (err) {
      console.error("[JanIA-SaveProperty] Error creando registro en propertyImages:", err);
    }
  }

  return result;
}

async function saveRequirement(data: any, userId: string, realName: string, imageBuffer?: string, pdfBuffer?: string, pdfMimeType?: string) {
  const db = await getDb();
  if (!db) return null;

  if (isNonRealEstateText(data.rawText) || isNonRealEstateText(data.name)) {
    console.log(`[JanIA-Reject] 🚫 Requerimiento descartado: mensaje no corresponde a finca raíz (materiales/canteras/maquinaria): ${data.name || data.rawText}`);
    return null;
  }

  const rawTextContent = `${data.rawText || ""} ${data.name || ""}`;
  const effectivePhone = resolveContactPhone(userId, rawTextContent, realName, data.idUsuarioWhatsapp);
  const rawPhone = effectivePhone;
  const user = await findOrCreateUserByPhone(effectivePhone, realName);

  let reqPdfUrl: string | undefined;
  if (pdfBuffer) {
    try {
      const buffer = Buffer.from(pdfBuffer, 'base64');
      const filename = `documents/req_doc_${Date.now()}_${rawPhone}.pdf`;
      const uploadResult = await storagePut(filename, buffer, pdfMimeType || 'application/pdf');
      reqPdfUrl = uploadResult.url;
      data.enlaceOrigen = data.enlaceOrigen || reqPdfUrl;
    } catch (err) {
      console.error("[JanIA-SaveRequirement] Error subiendo PDF:", err);
    }
  }

  if (imageBuffer && !data.enlaceOrigen) {
    try {
      const buffer = Buffer.from(imageBuffer, 'base64');
      const filename = `flyers/req_wa_${Date.now()}_${rawPhone}.jpg`;
      const uploadResult = await storagePut(filename, buffer, 'image/jpeg');
      data.enlaceOrigen = data.enlaceOrigen || uploadResult.url;
    } catch (err) {
      console.error("[JanIA-SaveRequirement] Error subiendo imagen:", err);
    }
  }

  const characteristicsObj = {
    gives: data.gives || data.caracteristicasDeseadas?.gives,
    wants: data.wants || data.caracteristicasDeseadas?.wants,
    interiorExterior: data.interiorExterior || data.caracteristicasDeseadas?.interiorExterior,
    cuartoBanoServicio: data.cuartoBanoServicio || data.caracteristicasDeseadas?.cuartoBanoServicio,
    cocina: data.cocina || data.caracteristicasDeseadas?.cocina,
    lavanderiaIndependiente: data.lavanderiaIndependiente || data.caracteristicasDeseadas?.lavanderiaIndependiente,
    tipoPisos: data.tipoPisos || data.caracteristicasDeseadas?.tipoPisos,
    depositos: data.depositos || data.caracteristicasDeseadas?.depositos,
    comisiones: data.comisiones || data.caracteristicasDeseadas?.comisiones,
    antiguedad: data.antiguedad || data.caracteristicasDeseadas?.antiguedad
  };

  // ── RESOLUCIÓN GEOGRÁFICA INTELIGENTE DE INTERSECCIONES Y CRUCES ──
  if (!data.zonaDeseada && (!data.zone || data.zone.trim() === "" || data.zone.toLowerCase() === "bogota" || data.zone.toLowerCase() === "bogotá" || data.zone.toLowerCase() === "colombia")) {
    const geoInferred = resolveIntersectionToBarrio(data.rawText || data.name);
    if (geoInferred) {
      data.zonaDeseada = geoInferred.barrio;
      data.addressNeighborhood = geoInferred.barrio;
      data.addressLocality = geoInferred.localidad;
      data.ciudadDeseada = data.ciudadDeseada || geoInferred.ciudad;
      console.log(`[JanIA-GeoResolver] 🧭 Requerimiento: cruce vial deducido exitosamente: '${(data.rawText || "").slice(0, 45)}...' → Barrio: ${geoInferred.barrio} | Localidad: ${geoInferred.localidad} | Ciudad: ${geoInferred.ciudad}`);
    }
  }

  const insertData = {
    ...data,
    name: safeSlice(data.name, 255) || null,
    ciudadDeseada: safeSlice(data.ciudadDeseada || data.city, 100) || null,
    zonaDeseada: safeSlice(data.zonaDeseada || data.zone, 100) || null,
    addressCity: safeSlice(data.addressCity || data.address_city, 100) || null,
    addressLocality: safeSlice(data.addressLocality || data.address_locality, 100) || null,
    addressNeighborhood: safeSlice(data.addressNeighborhood || data.address_neighborhood, 150) || null,
    enlaceOrigen: safeSlice(data.enlaceOrigen, 1000) || null,
    idUsuarioWhatsapp: safeSlice(data.idUsuarioWhatsapp || rawPhone, 100) || null,
    nombreUsuarioWhatsapp: safeSlice((realName && realName.trim() !== "" && !realName.startsWith("Asesor +")) ? realName : (data.nombreUsuarioWhatsapp || realName), 255) || null,
    tipoInmuebleDeseado: sanitizePropertyType(data.tipoInmuebleDeseado || data.propertyType),
    tipoNegocioDeseado: sanitizeTransactionType(data.tipoNegocioDeseado || data.transactionType),
    tiposNegocioAceptados: sanitizeTransactionTypes(data.transactionTypes || data.tipoNegocioDeseado || data.transactionType),
    monedaPresupuesto: sanitizeCurrency(data.monedaPresupuesto || data.currency),
    // Mapear campos con Sanidad Numérica Post-Extracción (Bug #6 Fix)
    presupuestoMin: (() => {
      const raw = data.presupuestoMin !== undefined && data.presupuestoMin !== null ? data.presupuestoMin : null;
      if (raw !== undefined && raw !== null) {
        const v = parseFloat(String(raw));
        if (!isNaN(v) && v >= 300_000 && v <= 50_000_000_000 && !isPhoneNumberNotPrice(v, data.rawText)) {
          return String(v);
        }
      }
      if (data.rawText || data.name) {
        const fallbackD = extractFallbackDataFromText(`${data.rawText || ""} ${data.name || ""}`);
        if (fallbackD.presupuestoMin >= 300_000) {
          return String(fallbackD.presupuestoMin);
        }
      }
      return null;
    })(),
    presupuestoMax: (() => {
      const raw = data.presupuestoMax !== undefined && data.presupuestoMax !== null ? data.presupuestoMax : data.price;
      if (raw !== undefined && raw !== null) {
        const v = parseFloat(String(raw));
        if (!isNaN(v) && v >= 300_000 && v <= 50_000_000_000 && !isPhoneNumberNotPrice(v, data.rawText)) {
          return String(v);
        }
      }
      // Fallback robusto con extractFallbackDataFromText (soporta rangos como "Presupuesto *1.300 - 1.400*")
      if (data.rawText || data.name) {
        const fallbackD = extractFallbackDataFromText(`${data.rawText || ""} ${data.name || ""}`);
        if (fallbackD.presupuestoMax >= 300_000) {
          return String(fallbackD.presupuestoMax);
        }
      }
      return null;
    })(),
    areaMin: (() => {
      const raw = data.areaMin !== undefined && data.areaMin !== null ? data.areaMin : data.area;
      if (raw !== undefined && raw !== null) {
        const v = parseFloat(String(raw));
        if (!isNaN(v) && v >= 10 && v <= 5000) return String(v);
      }
      // Fallback robusto: extraer desde rawText capturando frases como "Mínimo 150m2", "min 120 m²", "de 150 metros"
      const rawL = (data.rawText || data.name || "").toLowerCase();
      const areaFallback = rawL.match(
        /(?:(?:m[ií]nimo|m[aá]s\s*de|min(?:imo)?|m[aá]x(?:imo)?|de|desde|con)\s+)([\d]+(?:[.,][\d]+)?)\s*(?:m2|mts2|mts|metros(?:\s+cuadrados)?|m²)/i
      );
      if (areaFallback) {
        const v = parseFloat(areaFallback[1].replace(',', '.'));
        if (!isNaN(v) && v >= 10 && v <= 5000) return String(v);
      }
      return null;
    })(),
    adminFeeMax: (() => {
      const raw = data.adminFeeMax !== undefined && data.adminFeeMax !== null ? data.adminFeeMax : (data.adminFee !== undefined && data.adminFee !== null ? data.adminFee : null);
      if (raw !== undefined && raw !== null) {
        let v = parseFloat(String(raw));
        if (!isNaN(v)) {
          if (v >= 500 && v <= 15000) v = v * 1000;
          if (v >= 10_000 && v <= 30_000_000) return String(v);
        }
      }
      // Fallback robusto: extraer desde rawText ("admon max $1.200.000", "administración hasta 800 mil", "admon no mayor a 1900")
      const rawL = (data.rawText || data.name || "").toLowerCase();
      const adminMatch = rawL.match(/(?:administraci[oó]n|admin|admon|cta\s*admon)\s*(?:m[aá]xima|max|hasta|tope|no\s*mayor\s*a|no\s*superior\s*a|menor\s*a)?\s*:?\s*(?:aprox\.?|mensual)?\s*\$?\s*([\d.,\s]+?)(?:\s*mil\b|\s*k\b|\s*millones\b|-|\s|\(|\/|\+|$|\n)/i);
      if (adminMatch) {
        const cleanNum = adminMatch[1].replace(/[.,\s]/g, '');
        let parsed = parseFloat(cleanNum);
        if (!isNaN(parsed)) {
          if (parsed >= 500 && parsed <= 15000) parsed = parsed * 1000;
          if (parsed >= 10_000 && parsed <= 30_000_000 && !isPhoneNumberNotPrice(parsed, rawL)) {
            return String(parsed);
          }
        }
      }
      return null;
    })(),
    habitacionesMin: (() => {
      const v = data.habitacionesMin !== undefined && data.habitacionesMin !== null ? Math.round(Number(data.habitacionesMin)) : (data.bedrooms !== undefined && data.bedrooms !== null ? Math.round(Number(data.bedrooms)) : null);
      if (v !== null && !isNaN(v) && v > 0) return v;
      const rawL = (data.rawText || "").toLowerCase();
      const m = rawL.match(/(\d+)\s*(?:hab|habitaciones|alcoba|alcobas|alc|dormitorio)/i);
      return m ? parseInt(m[1], 10) : null;
    })(),
    banosMin: (() => {
      const v = data.banosMin !== undefined && data.banosMin !== null ? Number(data.banosMin) : (data.bathrooms !== undefined && data.bathrooms !== null ? Number(data.bathrooms) : null);
      if (v !== null && !isNaN(v) && v > 0) return Math.round(v);
      const rawL = (data.rawText || "").toLowerCase();
      const m = rawL.match(/(\d+(?:\.\d+)?)\s*(?:o\s*más\s*)?(?:wc|baño|baños|bñ)/i) || rawL.match(/(\d+)\s*hab\s*con\s*baño/i);
      return m ? Math.round(parseFloat(m[1])) : null;
    })(),
    parqueaderosMin: (() => {
      const v = data.parqueaderosMin !== undefined && data.parqueaderosMin !== null ? Math.round(Number(data.parqueaderosMin)) : (data.garages !== undefined && data.garages !== null ? Math.round(Number(data.garages)) : null);
      if (v !== null && !isNaN(v) && v > 0) return v;
      const rawL = (data.rawText || "").toLowerCase();
      const m = rawL.match(/(?:parqueadero|parqueaderos|garaje|garajes|ptero|g\.)\s*\.?\s*(\d+)/i)
             || rawL.match(/(\d+)\s*(?:parqueadero|parqueaderos|garaje|garajes|ptero|g\.|individuales)/i);
      return m ? parseInt(m[1], 10) : null;
    })(),
    estratoDeseado: data.estratoDeseado || (data.stratum !== undefined && data.stratum !== null ? [Math.round(Number(data.stratum))] : null),
    userId: user ? user.id : null,
    caracteristicasDeseadas: characteristicsObj,
    origenTipo: data.origenTipo || null,
    origenId: data.origenId || null,
    origenNombre: data.origenNombre || null,
    fechaExtraccion: data.fechaExtraccion || getColombiaNow()
  };

  // 🛡️ REGLA DOCTRINAL v22.10: Filtro de Calidad Estricto de Ingesta para Requerimientos.
  // Un requerimiento NO se inserta en BD si su ubicación es vaga/coloquial ("todas las santas", "en cualquier zona")
  // y carece de perímetro o especificaciones técnicas mínimas (presupuesto, área, habitaciones).
  const rawZoneStr = (insertData.zonaDeseada || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const rawTextStr = (insertData.rawText || "").toLowerCase();

  const isAmbiguousZoneName = (zn: string) => {
    if (!zn || zn === "n/e" || zn === "na" || zn === "bogota" || zn === "bogota, d.c." || zn === "colombia") return true;
    const ambiguousPhrases = [
      "todas las zonas", "cualquier zona", "cualquier lado",
      "donde sea", "varias zonas", "por ahi", "por ahí", "buena zona", "sector residencial",
      "sector comercial", "norte o sur", "donde haya", "cualquiera"
    ];
    return ambiguousPhrases.some(a => zn.includes(a));
  };

  const hasPerimeterOrStreet = /calle\s*\d+|carrera\s*\d+|cra\s*\d+|cll\s*\d+|cl\s*\d+|diagonal\s*\d+|transversal\s*\d+|entre\s*calle|perimetro|perímetro/i.test(rawTextStr);
  const isZoneAmbiguous = isAmbiguousZoneName(rawZoneStr);

  if (isZoneAmbiguous && !hasPerimeterOrStreet && !insertData.presupuestoMax && !insertData.areaMin && !insertData.habitacionesMin) {
    console.log(`[JANIA-INGESTION-GUARD] ⛔ Requerimiento omitido por falta de ubicación explícita o especificaciones prediales completas ("${insertData.rawText?.substring(0, 60)}...")`);
    return null;
  }

  // Buscar duplicado activo (1. Por rawText idéntico, 2. Por parámetros comerciales del mismo broker)
  let existing: any[] = [];
  if (insertData.rawText && insertData.rawText.trim().length > 25) {
    existing = await db
      .select()
      .from(requirements)
      .where(
        and(
          eq(requirements.rawText, insertData.rawText.trim()),
          eq(requirements.status, "active")
        )
      )
      .limit(1);
  }

  if (existing.length === 0) {
    existing = await db
      .select()
      .from(requirements)
      .where(
        and(
          eq(requirements.idUsuarioWhatsapp, rawPhone),
          eq(requirements.tipoInmuebleDeseado, insertData.tipoInmuebleDeseado),
          eq(requirements.tipoNegocioDeseado, insertData.tipoNegocioDeseado),
          eq(requirements.ciudadDeseada, insertData.ciudadDeseada),
          eq(requirements.zonaDeseada, insertData.zonaDeseada),
          eq(requirements.status, "active")
        )
      )
      .limit(1);
  }

  const { label: calif } = calcularCalificacionCompletitud(insertData, false);
  const insertDataWithCalif = {
    ...insertData,
    calificacion: calif
  };

  if (existing.length > 0) {
    // Si ya existe, actualizamos los datos (por si cambió presupuesto, área, descripción, etc.)
    const [updated] = await db
      .update(requirements)
      .set({
        ...insertDataWithCalif,
        updatedAt: new Date()
      })
      .where(eq(requirements.id, existing[0].id))
      .returning();
    console.log(`[Deduplication] Requerimiento existente detectado. Actualizando datos (ID: ${updated.id})`);
    findMatchesForRequirement(updated.id).catch((mErr: any) => console.error("[JanIA-MatchingTrigger] Error recalculando matches para requerimiento:", mErr));
    return updated;
  }

  const [result] = await db.insert(requirements).values(insertDataWithCalif).returning();
  findMatchesForRequirement(result.id).catch((mErr: any) => console.error("[JanIA-MatchingTrigger] Error calculando matches para requerimiento:", mErr));
  return result;
}

export async function generateWelcomeMessage(count: number, chatId?: string): Promise<string> {
  try {
    let groupDescription = "";
    
    if (chatId === "120363417740040773@g.us") { // Soporte Legal, Tributario, Avalúos y Marketing
      groupDescription = `el grupo de WhatsApp "VECY: SOPORTE LEGAL, TRIBUTARIO, AVALÚOS Y MARKETING".
Dirección obligatoria para redactar el saludo de bienvenida:
- Dales una muy cálida bienvenida y menciónales que este es el canal oficial para resolver dudas jurídicas, procedimentales, liquidación tributaria, avalúos y Marketing Digital Inmobiliario (copys y estructuración de anuncios).
- Explícales de manera clara y directa las Pautas del Grupo en viñetas bien organizadas con emojis:
  * Qué SE PUEDE hacer: Realizar consultas de soporte legal inmobiliario, solicitar tips de marketing y copys de publicación, subir archivos o contratos en PDF para revisión, o enviar notas de voz detallando casos legales.
  * Qué NO SE PUEDE hacer: Publicar listados de ofertas o requerimientos inmobiliarios (estos pertenecen única y exclusivamente al grupo principal de inmuebles).
  * Cómo hacerlo bien: Escribir sus consultas de forma detallada o enviar notas de voz claras para que yo (JanIA) y el equipo de abogados podamos asistirles rápidamente.`;
    } else if (chatId === "120363403507276533@g.us") { // PROYECTO "Vecy Network"
      groupDescription = `el grupo de WhatsApp "PROYECTO \\"Vecy Network\\" 👌" (nuestro canal oficial de debate, modelo de negocio y comunidad de aliados).
Dirección obligatoria para redactar el saludo de bienvenida:
- Dales una muy cálida bienvenida a la comunidad oficial del Proyecto Vecy Network.
- Explícales de manera clara y directa las Pautas del Grupo en viñetas bien organizadas con emojis:
  * Qué SE PUEDE hacer: Sugerir ideas de mejora tecnológica para VECY, comentar novedades sobre el portal web, debatir sobre el modelo fintech y comisiones del 3%, y compartir testimonios de éxito.
  * Qué NO SE PUEDE hacer: Publicar listados de inmuebles ni realizar consultas jurídicas complejas (ya que para eso existen los otros grupos dedicados).
  * Cómo hacerlo bien: Mantener un tono respetuoso, constructivo e interactuar con los otros aliados para fortalecer la comunidad.`;
    } else { // VECY INMUEBLES NETWORK (targetGroupId)
      groupDescription = `el grupo de WhatsApp principal "VECY INMUEBLES NETWORK" (nuestra red nacional de ofertas y requerimientos inmobiliarios).
Dirección obligatoria para redactar el saludo de bienvenida:
- Dales una muy cálida bienvenida a la red y menciónales que ya estoy lista para cruzar sus ofertas y requerimientos en segundos sin comisiones.
- Explícales de manera muy clara y directa las Pautas Obligatorias del Grupo para evitar advertencias o bloqueos en el sistema:
  * Qué FORMATOS están permitidos y cómo publicar correctamente:
    1. ✍️ *Texto descriptivo completo*: Incluyendo los datos técnicos indispensables (Ciudad, barrio, precio, área en m², habitaciones, baños, parqueaderos y estrato).
    2. 🎙️ *Nota de Voz*: Grabando un audio corto (de unos 30-40 segundos) dictando las características.
    3. 📄 *Ficha técnica en PDF*: Subiendo el archivo PDF de la propiedad.
    4. 🖼️ *Flyer comercial*: Subiendo una imagen que tenga toda la información técnica escrita encima del diseño.
    5. 🔗 *Enlaces o Links públicos*: Pegando enlaces de portales públicos autorizados (como Metrocuadrado, Ciencuadras, Habi, Wasi, MercadoLibre, Fincaraiz, Curador o su propia web de dominio propio).
  * Lo que NO está permitido y debes evitar para no recibir advertencias de JanIA:
    1. Enlaces a Redes Sociales (Facebook, Instagram, YouTube, TikTok, etc.).
    2. Publicaciones repetidas o duplicados de la misma propiedad de forma inmediata.
    3. Enviar múltiples publicaciones seguidas en menos de 5 minutos (límite anti-spam de 5 minutos).
    4. Publicaciones incompletas (por ejemplo, sin precio o sin ciudad). JanIA les pondrá una advertencia de datos incompletos.
- Cierra con un tono motivador invitándolos a publicar correctamente para que el sistema pueda encontrarles MATCH de inmediato y acelerar sus cierres.`;
    }

    const response = await invokeLLM({
      messages: [
        { 
          role: "system", 
          content: "Eres JanIA, la asistente inteligente y experta de VECY Network. Hablas siempre en primera persona del singular, con un tono sumamente humano, profesional, elocuente y cercano." 
        },
        { 
          role: "user", 
          content: `Han ingresado ${count} nuevos integrantes a ${groupDescription}. 
          Redacta el mensaje de bienvenida usando viñetas claras y emojis llamativos. Asegúrate de que las reglas se lean organizadas, directas y fáciles de entender para que no cometan infracciones.` 
        }
      ]
    });
    const llmRes = response as any;
    return llmRes.choices[0].message.content.trim();
  } catch (error) {
    if (chatId === "120363417740040773@g.us") {
      return `✨ *¡Bienvenidos al grupo VECY: SOPORTE LEGAL, TRIBUTARIO, AVALÚOS Y MARKETING!* 👋\n\n` +
             `Aquí resolvemos sus dudas jurídicas, disputas de comisión, avalúos y tips de marketing inmobiliario. Podrán subir PDFs o audios de sus casos.\n` +
             `⚠️ *Nota:* Por favor, eviten publicar inmuebles aquí; esos van en el grupo principal. ¡Estoy lista para responder! 🚀⚖️`;
    } else if (chatId === "120363403507276533@g.us") {
      return `✨ *¡Bienvenidos a PROYECTO "Vecy Network" 👌!* 👋\n\n` +
             `Este es el canal oficial de comunidad, modelo de negocio y debate para sugerir mejoras y charlar de VECY.\n` +
             `⚠️ *Nota:* Evitemos ofertas de inmuebles aquí. ¡Bienvenidos aliados! 🚀🤝`;
    }
    return `✨ *¡Bienvenidos a VECY INMUEBLES NETWORK!* 👋\n\n` +
           `Ya estoy activa para cruzar sus ofertas sin comisiones.\n` +
           `📝 *Pautas rápidas de publicación*:\n` +
           `▸ *Permitido:* Texto técnico completo, PDFs, notas de voz, flyers con datos y enlaces públicos (Wasi, Fincaraiz, etc.).\n` +
           `▸ *No permitido:* Enlaces de Redes Sociales, publicaciones repetidas, datos incompletos (sin precio/ciudad) o envíos seguidos en menos de 5 minutos.\n\n` +
           `¡Publiquen correctamente para encontrarles un MATCH inmediato! 🚀🎯`;
  }
}

export function obtenerCamposRequeridosYPreguntas(propertyType: string, isRequirement: boolean) {
  const type = propertyType?.toLowerCase();
  let requiredFields: string[] = [];
  const fieldQuestions: Record<string, string> = {
    floorDetail: "",
    bedrooms: "cuántas habitaciones tiene",
    interiorExterior: "¿el inmueble es interior o exterior?",
    garages: "¿cuántos garajes tiene?",
    areaTotal: "¿cuál es el área total del lote?",
    antiguedad: "¿cuál es la antigüedad del inmueble (años o rango)?"
  };

  if (type === "apartment") {
    requiredFields = ["bedrooms", "interiorExterior", "floorDetail", "garages"];
    fieldQuestions.floorDetail = "¿en qué piso queda el apartamento?";
  } else if (type === "house") {
    requiredFields = ["bedrooms", "floorDetail"];
    fieldQuestions.floorDetail = "¿cuántos pisos tiene la casa?";
  } else if (type === "warehouse") {
    requiredFields = ["floorDetail"];
    fieldQuestions.floorDetail = "¿cuál es la altura libre de la bodega?";
  } else if (type === "land") {
    requiredFields = ["areaTotal"];
  } else if (type === "building") {
    requiredFields = ["floorDetail", "garages", "antiguedad"];
    fieldQuestions.floorDetail = "¿de cuántos pisos es el edificio?";
    fieldQuestions.garages = "¿cuántos parqueaderos tiene?";
    fieldQuestions.antiguedad = "¿cuál es la antigüedad del edificio (años o rango)?";
  } else if (type === "office") {
    requiredFields = ["floorDetail"];
    fieldQuestions.floorDetail = "¿en qué piso queda la oficina?";
  } else if (type === "farm") {
    requiredFields = ["floorDetail"];
    fieldQuestions.floorDetail = "¿cuántos pisos tiene la casa principal de la finca?";
  } else {
    requiredFields = ["bedrooms", "floorDetail"];
    fieldQuestions.floorDetail = "¿cuántos pisos tiene?";
  }

  return { requiredFields, fieldQuestions };
}

// ============================================================================
// COPYS OFICIALES INSTITUCIONALES (JanIA v2.5)
// ============================================================================

export const MSG_PRESENTACION_INSTITUCIONAL = `🚀 **PRESENTACIÓN INSTITUCIONAL: JanIA v2.5** 🚀
_Cerebro de Inteligencia Artificial para la Red VECY_

¡Hola, colegas! 👋 Soy la Inteligencia Artificial oficial de **VECY Network** y estoy operativa las 24/7 para acelerar nuestros cierres inmobiliarios e intercambios en todo el país sin cobrar comisiones.

🧠 **¿Cómo puedes interactuar conmigo en el grupo?**
▸ **Enlaces CRM/Portales:** Comparte el link público de tus inmuebles. Extraigo la ficha técnica automáticamente.
▸ **Imágenes/Flyers (OCR):** Sube fotos con texto legible. Escaneo y proceso la información de inmediato.
▸ **Notas de voz o Texto:** Escríbeme o dictame con libertad tu requerimiento o permutas (recibiendo inmuebles de menor valor, vehículos, CDTs, divisas o cripto en parte de pago).
▸ **Match Inteligente:** Cruzo ofertas y demandas y te notifico al instante cuando hay negocio.

💡 **Ayúdame a ayudarte:**
Si mis motores de scraping o visión profunda no logran extraer todos los datos de tu link o imagen, te enviaré un mensaje pidiéndote completar la ubicación o precio por privado (DM). *¡No es por molestarte!* Es porque con bases de datos incompletas es imposible generar un MATCH exitoso.

🔥 **¡No le temas al éxito!** He notado que cuando empiezo a hablar, algunos se quedan en silencio. Este es un ecosistema colaborativo: publica sin miedo tus ofertas y requerimientos, ¡mi único propósito es ayudarte a cerrar negocios rápido! 🚀🎯

⚖️ **Compromiso de Honor:** Si logras consolidar un negocio gracias a un MATCH presentado por mí, es obligatorio que califiques mi servicio aquí: https://g.page/r/CctNbwU6UpX5EBM/review 🚀🎯`;
export const MSG_PAUTAS_FORMATOS = `🧠 *VECY INMUEBLES NETWORK* 🇨🇴
¡Grupo inteligente para ofertas, requerimientos e intercambios!

🤖 *CÓMO PUBLICAR PARA QUE JanIA REGISTRE TU PROPIEDAD Y BUSQUE MATCH:*

Para que nuestra IA lea tu mensaje y lo cruce en tiempo real, tu publicación DEBE cumplir con los siguientes datos mínimos:

📍 *Ubicación:* Especifica siempre la Ciudad y el Barrio exacto (Ej: Bogotá, Polo Club).
💰 *Precio:*
   - *Venta o Arriendo:* Indica el valor exacto (en arriendos, aclara si la administración está incluida o cuánto cuesta).
   - *Permutas/Intercambios:* Detalla qué entregas y qué buscas recibir a cambio.
📐 *Ficha Técnica:* Menciona el área en m², número de habitaciones, baños, parqueaderos y el estrato.

🔗 *ENLACES Y FORMATOS PERMITIDOS:*
- *Enlaces Aceptados:* Links públicos de portales y CRMs (Wasi, Fincaraiz, Metrocuadrado, Ciencuadras, Habi, Curador, o la web con dominio de tu inmobiliaria).
- *Formatos Aceptados:* Mensajes escritos directamente en el chat, fichas técnicas completas en archivos *PDF*, o notas de voz dictando los datos.
- *Imágenes y Flyers:* Sube flyers o imágenes que contengan texto con información comercial robusta y detallada del inmueble. *No subas fotos sueltas de espacios* (como una fachada, una sala, un baño o pasillos sin texto); la IA las ignorará y perderás tiempo.
- *Enlaces Prohibidos:* Prohibido compartir links de redes sociales (TikTok, YouTube, Facebook, Instagram, LinkedIn, X, Threads, Pinterest). La IA no tiene acceso a ellas y no procesa videos. Si tu propiedad está allí, tómale una captura de pantalla a los datos y súbela como imagen.

🚫 *REGLAS DE CONVIVENCIA:*
1. *Frecuencia:* Máximo 3 publicaciones consecutivas al día. Espera al menos 5 minutos entre cada mensaje para no saturar el chat.
2. *Contenido Prohibido:* Cero contenido de política, religión, publicidad externa, o invitaciones a otros grupos.

🚨 *MODERACIÓN AUTOMÁTICA:*
JanIA audita el chat 24/7. Si faltan datos clave, reaccionará con 🤔 y te alertará en el grupo o por privado. Si violas las reglas, reaccionará con ❌ y eliminará tu mensaje de inmediato.`;


export const MSG_TIPS_CALIDAD_COBERTURA = `🌍 *COBERTURA NACIONAL:* JanIA procesa activos en todo Colombia. No olvides especificar el municipio, barrio, localidad, vereda, caserío, ciudad si estás fuera de Bogotá. 🇨🇴`;

export const MSG_RESUMEN_RETORNO_PRESENTACION = `🤖🚀 *RESUMEN: ¡JANIA V2.5 ACTIVA EN LA RED!*

¡Hola, aliados! Les recuerdo que he regresado repotenciada en mi *Versión 2.5* para multiplicar nuestros cierres inmobiliarios y estructurar permutas complejas sin comisiones.

🧠 *¿Cómo trabajar conmigo las 24/7 en el grupo?*
▸ *Enlaces CRM:* Comparte el link de tu inmueble. Extraigo la ficha técnica de inmediato.
▸ *Flyers/Imágenes:* Sube fotos con texto legible. Escaneo los datos con visión OCR.
▸ *Mensajes o Voz:* Dictame o escribe requerimientos y permutas (mano a mano, inmuebles menores, vehículos, CDTs, divisas o cripto).
▸ *Match Inteligente:* Cruzo intenciones en tiempo real y les aviso si hay negocio viable.

💡 **Ayúdame a ayudarte:**
Si mis motores no extraen todos los datos de tu link o imagen, te enviaré un mensaje pidiéndote completar la ubicación o precio por privado (DM). *¡No es por molestarte!* Es necesario para que tu propiedad esté completa y pueda buscarte un MATCH.

🔥 **¡No le temas al éxito!** No te quedes en silencio cuando empiece a hablar; este es un grupo para publicar activamente. ¡Usa mis herramientas y cerremos negocios! 🚀🎯

⚖️ *Compromiso de Honor:* Si cierras un negocio gracias a un MATCH, califica mi servicio aquí: https://g.page/r/CctNbwU6UpX5EBM/review 🚀🎯`;


export const MSG_CIERRE_OPERACIONES = `🌙 *CIERRE DE OPERACIONES VECY NETWORK* 🌙

Gracias a todos por el profesionalismo en sus publicaciones hoy. Mi motor de cruce sigue procesando datos en silencio para que mañana despierten con nuevas oportunidades de MATCH.

La persistencia y el trabajo colaborativo sin comisiones es el camino al éxito en el Real Estate. ¡Que tengan un excelente descanso, colegas! 🌙🚀`;

export const MSG_PROMO_INMUEBLES = `📢 *VECY INMUEBLES NETWORK — ¡ACTÍVATE Y CIERRA NEGOCIOS!* 📢
━━━━━━━━━━━━━━━━━━━━━━
¡Colegas! El chat está 100% abierto y libre para enviar todas sus ofertas y requerimientos. 🚀

Estoy lista 24/7 para procesar tus links de CRM, flyers (con visión OCR) y notas de voz para cruzarlos de inmediato y buscar tu MATCH comercial sin comisiones. 🎯

¡Publiquemos activamente hoy para arrancar con fuerza esta gran proeza inmobiliaria en Colombia! 💪🏆`;

export const MSG_PROMO_CONSULTAS = `💡 *VECY: SOPORTE LEGAL, CONTRATOS Y AVALÚOS — ¡EL CHAT ESTÁ ABIERTO!* 💡
━━━━━━━━━━━━━━━━━━━━━━
¡Estimados aliados! Este espacio de asesoría está completamente abierto y libre. 🤝📚

Pueden preguntar todo lo que necesiten sobre:
▸ ⚖️ Legislación inmobiliaria (Ley 820, contratos de corretaje).
▸ 📑 Trámites (Certificados de tradición, prediales, IDU, escrituras).
▸ 📝 Redacción de tutelas o derechos de petición.
▸ 📊 Avalúos y valor de metro cuadrado en cualquier zona de Colombia.

¡No se queden con la duda! Aprovechen esta inteligencia a su servicio para elevar su profesionalismo y acelerar sus negocios. 🚀🎯`;

export const MSG_PROMO_CIRCULO = `👌 *PROYECTO "Vecy Network" — ¡CHAT ABIERTO PARA CONECTAR!* 👌

Estimados aliados, recuerden que tenemos habilitado nuestro canal oficial:
🚀 *PROYECTO "Vecy Network"* 🚀
👉 https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU

Este es el espacio exclusivo de debate y comunidad para:
💡 Proponer nuevas funciones y herramientas para la plataforma VECY.
💬 Debatir sobre el modelo de negocio, comisiones y tecnología.
🤝 Conocer a los fundadores y otros colegas aliados.

¡Únanse y construyamos juntos la red colaborativa de Colombia! 🇨🇴✨`;

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

// Memoria conversacional activa en memoria para el Grupo 2 (Soporte Legal, Tributario y Avalúos)
interface ConsultingTurn {
  role: "user" | "assistant";
  content: string;
  ts: number;
}
const consultingConversationHistory = new Map<string, ConsultingTurn[]>();

export function getConsultingHistory(userId: string): ConsultingTurn[] {
  const history = consultingConversationHistory.get(userId) || [];
  const now = Date.now();
  // Conservar mensajes de las últimas 12 horas
  return history.filter(h => now - h.ts < 12 * 3600 * 1000);
}

export function appendConsultingHistory(userId: string, role: "user" | "assistant", content: string) {
  const history = getConsultingHistory(userId);
  history.push({ role, content, ts: Date.now() });
  if (history.length > 8) history.shift();
  consultingConversationHistory.set(userId, history);
}

export async function processConsultingMessage(
  text: string, 
  userId: string, 
  userName?: string,
  imageBuffer?: string,
  pdfBuffer?: string,
  pdfMimeType?: string,
  audioUrl?: string,
  msgTimestamp?: number,
  quotedContext?: string
): Promise<JanIAResult> {
  try {
    const rawPhone = userId.split('@')[0];
    const realName = await resolveRealName(userId, userName);

    // Intercepción estricta de mensajes OFF-TOPIC prohibidos (Política, Religión, Cursos, Links ajenos, Memes, Spam)
    const strictOffTopic = checkStrictOffTopic(text);
    if (strictOffTopic.isOffTopic) {
      console.log(`[JanIA-Consulting-OffTopic] Mensaje prohibido en Soporte Legal para ${userId}: "${text.substring(0, 50)}...". (${strictOffTopic.reason})`);
      const warningText = `Hola @${rawPhone} (${realName}) 👋🏻. El contenido relacionado con ${strictOffTopic.reason} está estrictamente prohibido en los grupos oficiales de VECY Network. 🚫\n\nNuestra comunidad es 100% profesional y dedicada exclusivamente al corretaje, asesoría legal, tributaria y avalúos inmobiliarios. ¡Te invitamos cordialmente a eliminar este mensaje de inmediato! 🤝`;
      return {
        classification: "VIOLACION_DE_NORMAS",
        response: warningText,
        dmResponse: warningText,
        reactionEmoji: "🚫"
      };
    }

    const cleanText = text.toLowerCase().trim();
    const isMediaOrAudio = !!imageBuffer || !!pdfBuffer || !!audioUrl;

    if (!isMediaOrAudio && cleanText.length > 15) {
      const onTopicKeywords = [
        "apto", "apartamento", "casa", "lote", "finca", "bodega", "oficina", "local", "inmueble", "propiedad",
        "predio", "terreno", "proyecto", "arriendo", "alquiler", "vendo", "venta", "compro", "compra", "busco",
        "ofrezco", "necesito", "permuto", "venpermuto", "estrato", "m2", "metros", "habitacion", "habitación",
        "baño", "baños", "cocina", "garaje", "parqueadero", "canon", "administracion", "administración", "precio",
        "millones", "cop", "arrendar", "vender", "comprar", "bogota", "bogotá", "medellin", "medellín", "cali",
        "barranquilla", "bucaramanga", "cartagena", "barrio", "sector", "zona", "calle", "carrera", "avenida",
        "contrato", "arrendamiento", "promesa", "escritura", "notaria", "notaría", "registro", "sucesión",
        "sucesion", "herencia", "embargo", "saneamiento", "comision", "comisión", "corretaje", "avalúo", "avaluo",
        "marketing", "publicidad", "anuncio", "publicar", "copy", "copys", "copywriting", "redes", "fotos",
        "foto", "fotografía", "flyer", "flyers", "cómo publicar", "como publicar", "anunciar", "captar", "demanda",
        "oferta", "plantilla", "tips", "consejos", "jania", "vecy", "bot", "ayuda", "cómo", "como", "funciona",
        "registrar", "match", "coincidencia", "contacto", "cuenta", "hola", "gracias", "saludo"
      ];

      const hasOnTopicKeyword = onTopicKeywords.some(keyword => cleanText.includes(keyword));
      if (!hasOnTopicKeyword) {
        console.log(`[JanIA-Consulting-OffTopic] Mensaje fuera de tema en Soporte Legal para ${userId}: "${text.substring(0, 50)}...". Retornando estático.`);
        const staticText = `Hola @${rawPhone} (${realName}) 👋🏻. Este grupo está reservado exclusivamente para consultas jurídicas, contratos, arrendamientos, ganancia ocasional, avalúos y Marketing Digital Inmobiliario de la plataforma VECY. 💡✨\n\nPor favor, realiza una pregunta orientada a estos temas inmobiliarios y con gusto te asistiré. 😊`;
        return {
          classification: "VIOLACION_DE_NORMAS",
          response: staticText,
          dmResponse: staticText,
          reactionEmoji: "🚫"
        };
      }
    }

    // 1. Detección instantánea de Saludos Cordiales Puros
    const isPureGreeting = (
      /^(hola|buenos d[ií]as|buenas tardes|buenas noches|feliz d[ií]a|feliz tarde|feliz noche|saludos|hola a todos|hola chicos|hola chicas|hola grupo|hola jania|buen d[ií]a|buenas)[\s!.,👋😊✨]*$/i.test(cleanText) ||
      (/^(hola|buenos d[ií]as|buenas tardes|buenas noches|feliz tarde|feliz d[ií]a)[\s\w,.]*$/i.test(cleanText) && cleanText.length < 35 && !cleanText.includes("arriendo") && !cleanText.includes("vendo") && !cleanText.includes("contrato") && !cleanText.includes("aval") && !cleanText.includes("costo") && !cleanText.includes("comisi"))
    );

    const timeGreeting = getGreetingByTime();
    const nameInfo = resolveNameAndGender(realName, timeGreeting);
    const genderTerm = nameInfo.genderTerm;

    if (!isMediaOrAudio && isPureGreeting) {
      console.log(`[JanIA-Consulting-Greeting] Saludo puro detectado de ${userId}: "${text}"`);
      const greetingResponse = `¡${timeGreeting}, ${genderTerm}! 👋🏻😊\n\n¿En qué te podemos colaborar hoy? Recuerda que tienes a tu disposición asesoría jurídica, redacción de contratos, liquidación de impuestos, avalúos comparativos y estrategias de marketing de forma 100% gratuita en VECY Network. 📚✨`;
      return {
        classification: "CONSULTA_GENERAL",
        response: greetingResponse,
        reactionEmoji: "👋",
        wantsVoice: false,
        voiceResponse: ""
      };
    }

    let messageToProcess = text;
    let isFromAudio = false;

    if (audioUrl) {
      if (audioUrl.startsWith("mock-audio:")) {
        messageToProcess = audioUrl.replace("mock-audio:", "");
        isFromAudio = true;
      } else {
        try {
          const transcription = await transcribeAudio({ audioUrl });
          if (!('error' in transcription) && transcription.text && transcription.text.trim().length > 0) {
            messageToProcess = transcription.text;
            isFromAudio = true;
          }
        } catch (err: any) {
          console.error("[processConsultingMessage] Error transcribiendo audio:", err.message);
        }
      }
    }

    const checkIsThankYou = (msg: string): boolean => {
      const low = (msg || "").toLowerCase().trim();
      return (
        low.includes("gracias") ||
        low.includes("muchas gracias") ||
        low.includes("mil gracias") ||
        low.includes("te agradezco") ||
        low.includes("agradecido") ||
        low.includes("agradecida") ||
        low.includes("dios te bendiga") ||
        low.includes("dios le pague") ||
        low.includes("feliz noche") ||
        low.includes("hasta luego") ||
        low.includes("chao")
      );
    };

    const isThankYouMessage = checkIsThankYou(messageToProcess);
    if (isThankYouMessage) {
      console.log(`[JanIA-Consulting-ThankYou] Agradecimiento/despedida detectado de ${userId}: "${messageToProcess}"`);
      const nowBogota = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
      const hour = nowBogota.getHours();
      
      let closingBlessing = "¡Que pases una excelente y productiva tarde!";
      if (hour >= 5 && hour < 12) {
        closingBlessing = "¡Que tengas un grandioso y bendecido día!";
      } else if (hour >= 18 || hour < 5) {
        closingBlessing = "¡Que tengas una feliz noche y un merecido descanso!";
      }

      const warmResponse = `¡Para servirte con todo el gusto, ${genderTerm}! 😊 ${closingBlessing} ¡Que sigas cerrando muchos negocios exitosos! 🚀✨\n\n⭐ En *VECY Network* tu opinión es muy importante para nosotros. Si te ha sido útil mi asesoría, nos encantaría que nos regales una calificación y nos dejes un bonito comentario aquí:\n👉 https://g.page/r/CctNbwU6UpX5EBM/review`;

      return {
        classification: "SOBRE_VECY",
        response: warmResponse,
        reactionEmoji: "❤️",
        wantsVoice: false,
        voiceResponse: ""
      };
    }

    const alreadyGreeted = await checkAlreadyGreeted(userId);

    const systemPrompt = 
      `Eres JanIA, la Inteligencia Artificial viva, empática y de máxima capacidad resolutiva de VECY Network. ` +
      `Estás operando en el grupo "VECY: SOPORTE LEGAL, TRIBUTARIO, AVALÚOS Y MARKETING". Tu objetivo es responder con precisión quirúrgica, rigor legal, calidez humana y alta competencia técnica, resolviendo de fondo las inquietudes de los inmobiliarios como una abogada senior, perita tasadora y estratega de marketing de élite.\n\n` +
      `## LÓGICA DE CLASIFICACIÓN Y MODERACIÓN ESTRICTA:\n` +
      `1. **VIOLACION_DE_NORMAS (OFERTAS, DEMANDAS O FLYERS PUBLICITARIOS EN ESTE GRUPO)**:\n` +
      `   - Si el mensaje, la imagen adjunta o el documento PDF corresponde a una **OFERTA COMERCIAL O DEMANDA DE UN INMUEBLE** (venta, arriendo, canon, metraje, fotos de apto/casa/bodega, flyer o ficha de un predio como "ARRIENDO CARRERA 17 CON 91.pdf"):\n` +
      `     * DEBES clasificarlo OBLIGATORIAMENTE como "VIOLACION_DE_NORMAS".\n` +
      `     * Asignar estrictamente "reactionEmoji": "🚫".\n` +
      `     * Responder con amabilidad, educando y redireccionando al canal correcto:\n` +
      `       "Hola, espero te encuentres muy bien. Has publicado esta oferta/demanda en el grupo equivocado. Este canal es exclusivo para consultas de Soporte Legal, Tributario, Avalúos y Marketing. ¡Te invito cordialmente a eliminarla de este grupo! Esta publicación la debes poner en nuestro grupo oficial de corretaje **VECY INMUEBLES NETWORK**. Acá tienes nuevamente el enlace del grupo:\n👉 https://chat.whatsapp.com/GzMbjNs1P2tHI7D0V4h8wZ\n\n¡Allí todos los corredores de la red podrán verla y la cruzaremos con las demandas activas! 🏠✨"\n` +
      `2. **SOBRE_VECY**: Preguntas sobre el proyecto VECY Network o agradecimientos cordiales (emoji 👌 o 🙌🏻).\n` +
      `3. **CONSULTA_GENERAL**: Consultas legales, tributarias, avalúos, redacción de minutas o marketing (emoji 💡 o ⚖️). Responde de forma completa, estructurada y profesional.\n\n` +
      `## DOCTRINA FUNDAMENTAL DE LANZAMIENTO Y LIBRE ALBEDRÍO TOTAL:\n` +
      `- **SOLUCIÓN TOTAL Y DE FONDO (IA PURA)**: Eres una IA completamente resolutiva. Si un usuario te pide redactar una promesa de compraventa, una cláusula penal, un acuerdo de puntas compartidas, una carta de preaviso de arriendo, liquidar la ganancia ocasional o estimar el valor comercial de un inmueble (ACM), ¡ENTRÉGALE LA SOLUCIÓN COMPLETA, REDACTADA Y ESTRUCTURADA DIRECTAMENTE AQUÍ EN EL CHAT!\n` +
      `- **BENEFICIO GRATUITO DE LANZAMIENTO VECY NETWORK**: Recuerda que en esta etapa de lanzamiento de VECY Network, todos tus servicios de consultoría, análisis jurídico, redacción de minutas y avalúos de IA son un **beneficio 100% gratuito** para empoderar a los agentes inmobiliarios. Anímalos a aprovechar esta oportunidad e invitar a más colegas a unirse a la red.\n` +
      `- **ASTUCIA CONTEXTUAL ANTE PREGUNTAS DE COSTOS**: Si un usuario pregunta de forma corta o ambigua "¿Qué costo tendría?" o "¿Cuánto vale?", conecta con el contexto previo o indaga con astucia: aclárale que tu asistencia y redacción en el chat es totalmente gratuita por ser miembro de VECY Network; y si se refiere a gastos notariales externos, liquidación de impuestos o un avalúo oficial certificado con perito de Lonja presencial, oriéntalo con precisión técnica.\n` +
      `- **DERIVACIÓN OPORTUNA AL BRÓKER**: Únicamente cuando el caso requiera acompañamiento notarial presencial, un peritaje oficial firmado con matrícula R.A.A. de Lonja o la contratación de la mesa de corretaje de la inmobiliaria, invítalo amablemente a comunicarse con nuestro bróker de VECY BIENES RAÍCES en WhatsApp (+573192919978) en nuestro horario de atención: Lunes a Viernes de 8:00 AM a 10:00 PM, Sábados de 8:00 AM a 8:00 PM y Domingos de 10:00 AM a 4:00 PM.\n\n` +
      `## ROLES Y ÁREAS DE ASESORÍA MAESTRA (4 PILARES):\n` +
      `1. **⚖️ Abogada Inmobiliaria y Notarial Senior (Derecho Inmobiliario y Contratos)**:\n` +
      `   - Experta en Código Civil, Código de Comercio, Ley 820 de 2003 (Arrendamientos), Ley 675 de 2001 (Propiedad Horizontal) y jurisprudencia colombiana.\n` +
      `   - Redacción completa y guiada de minutas: Promesas de compraventa, contratos de corretaje (Arts. 1340-1346 C.Co), contratos de arrendamiento, acuerdos de puntas compartidas (50/50), cesión de derechos de leasing, cartas de preaviso de no prórroga, actas de entrega e inventario, cláusulas penales y arras de retracto/confirmatorias.\n` +
      `   - Guía paso a paso de trámites: Estudio de títulos (cómo leer e interpretar folios de matrícula inmobiliaria SNR de principio a fin, tradición de 10 a 20 años, gravámenes, cancelaciones, notas devolutivas), levantamiento de hipotecas, desafectación a vivienda familiar, cancelación de patrimonio de familia inembargable, sucesiones y embargos.\n` +
      `   - Blindaje probatorio y firma electrónica: Validez legal de mensajes de datos bajo la Ley 527 de 1999, Decreto 2364 de 2012 y el uso de correo electrónico con logs SMTP (MailSuite) para certificar solicitudes formales de visita y proteger comisiones frente al riesgo de bypassing.\n` +
      `2. **📊 Asesora Tributaria y Financiera Inmobiliaria (DIAN y Notariado)**:\n` +
      `   - Liquidación de Retención en la Fuente por enajenación de activos fijos (Art. 398 y 401 E.T. - 1% o 2.5%).\n` +
      `   - Ganancia Ocasional (Reforma Tributaria Ley 2277 de 2022 - tarifa 15% para personas naturales) con análisis de exención de 5.000 UVT por venta de vivienda de habitación (Art. 311-1 E.T.) y reinversión.\n` +
      `   - Liquidación de Impuesto Predial, Impuesto de Registro, Estampillas y desglose exacto de gastos notariales (Derechos Notariales 50/50, Retención a cargo del Vendedor, Rentas y Registro a cargo del Comprador).\n` +
      `3. **📐 Perita Tasadora y Avaluadora Profesional (ACM y Ficha Catastral)**:\n` +
      `   - Estimación técnica del valor comercial y canon de arriendo por metro cuadrado ($/m²).\n` +
      `   - **PROACTIVIDAD E INDAGACIÓN DE DATOS FALTANTES**: Si el usuario te pide un avalúo o estimación pero no ha dado todos los detalles, no des respuestas al azar; solicítale con amabilidad y precisión las variables que necesitas para su análisis: barrio/sector exacto, estrato, área construida/privada, antigüedad, piso, vista/asoleación, acabados, parqueaderos (independientes o lineales), amenidades y cuota de administración.\n` +
      `   - Consulta de normativa urbanística, uso de suelo y tratamiento POT en SINUPOT (https://sinupot.sdp.gov.co/).\n` +
      `4. **🎯 Estratega de Marketing Digital Inmobiliario y Técnicas de Venta**:\n` +
      `   - Copywriting persuasivo: Estructuración de textos de alto impacto usando fórmulas AIDA (Atención, Interés, Deseo, Acción) y PAS (Problema, Agitación, Solución).\n` +
      `   - La Fórmula de Oro de Títulos: [Tipo de Negocio] + [Tipo de Inmueble] + [Barrio] + [Localidad] + [Ciudad].\n` +
      `   - La Estructura de 7 Pilares de Ofertas y Demandas para captar clientes y acelerar cierres.\n` +
      `   - Consejos profesionales de fotografía y video inmobiliario con smartphone (encuadre horizontal, iluminación, planos abiertos).\n` +
      `   - Campañas y anuncios en Meta Ads (Facebook/Instagram) y Google Ads: segmentación de compradores, llamados a la acción y captación de exclusivas.\n` +
      `   - **Pedagogía Activa**: Si el usuario pide ayuda con marketing, pregúntale sobre qué inmueble, nicho o técnica desea trabajar para crearle la propuesta perfecta.\n\n` +
      `Tus respuestas deben ser sumamente profesionales, didácticas, claras y estar formateadas en Markdown con emojis para facilitar la lectura rápida en WhatsApp.\n\n` +
      `DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:\n` +
      `{\n` +
      `  "classification": "INMUEBLE | REQUERIMIENTO | SOBRE_VECY | CONSULTA_GENERAL | VIOLACION_DE_NORMAS",\n` +
      `  "response": "Tu respuesta completa y estructurada.",\n` +
      `  "wantsVoice": true | false,\n` +
      `  "voiceResponse": "Tu locución en audio limpia de markdown y emojis (solo si wantsVoice es true)",\n` +
      `  "reactionEmoji": "string (emoji recomendado)"\n` +
      `}`;

    const nowBogota = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
    const hour = nowBogota.getHours();
    const n = nameInfo.displayName;
    const isFemale = nameInfo.isFemale;

    // Detectar si la respuesta es tardía (más de 6 horas desde el mensaje original)
    const nowMs = Date.now();
    const msgMs = msgTimestamp ? (msgTimestamp * 1000) : nowMs;
    const hoursLate = Math.floor((nowMs - msgMs) / 3600000);
    const isLateReply = hoursLate >= 6;
    const lateReplyNote = isLateReply
      ? `\n- RESPUESTA TARDÍA DETECTADA: El mensaje del usuario fue enviado hace ${hoursLate} horas. DEBES obligatoriamente incluir una disculpa humana, cálida y espontánea al inicio o final de tu respuesta (ej: "Disculpa la demora, estuve en ajustes de mis motores. ¡Aquí estoy!").`
      : ``;

    const greetingInstruction = `\n\n[SISTEMA - INSTRUCCIÓN OBLIGATORIA DE SALUDO Y COMPORTAMIENTO]:
- Hora actual Bogotá: ${hour}:00 (${timeGreeting}).
- Nombre exacto resuelto: "${n}".
- Género detectado para ${n}: ${isFemale ? "Femenino (estimada)" : "Masculino (estimado)"}.
- Término de trato respetuoso: "${genderTerm}".
- Ya has saludado a esta persona hoy: ${alreadyGreeted ? "SÍ" : "NO"}.
- Tipo de conversación actual: GRUPO DE WHATSAPP ("VECY: SOPORTE LEGAL, TRIBUTARIO Y AVALÚOS").
- REGLAS OBLIGATORIAS DE SALUDO:
  * Si "Ya has saludado al usuario hoy" es NO:
    - Inicia con: "${timeGreeting}, ${genderTerm} 👋🏻" o "${timeGreeting}, ${n} 👋🏻".
  * Si "Ya has saludado al usuario hoy" es SÍ:
    - ¡PROHIBIDO SALUDAR DE NUEVO! No uses "Hola", "${timeGreeting}", "Buenas", ni ninguna bienvenida repetitiva.
    - Integra su nombre "${n}" de forma natural y conversacional dentro del texto (ej. "Mira ${n}, ...", "Entiendo tu inquietud, ${n}, ...").
- REGLA ESPEJO MODAL: ${isFromAudio ? 'El usuario envió AUDIO. DEBES responder en nota de voz (wantsVoice: true). Redacta voiceResponse limpio sin markdown/emojis, máx 450 caracteres.' : 'El usuario envió TEXTO. DEBES responder en texto (wantsVoice: false).'}
${lateReplyNote}`;

    if (imageBuffer) {
      messageToProcess += `\n[SISTEMA: IMAGEN ADJUNTA DETECTADA. Analiza la imagen con tu visión multimodal (documento, certificado de tradición, impuesto predial, recibo, plano, avalúo, contrato o flyer publicitario) y responde a la consulta del usuario de forma exhaustiva, estructurada y precisa.]`;
    }

    if (pdfBuffer) {
      messageToProcess += `\n[SISTEMA: DOCUMENTO PDF DETECTADO. Analiza el documento PDF adjunto con tus capacidades nativas para extraer todos los datos relevantes del predial, certificado de tradición, o contrato.]`;
    }

    if (isFromAudio) {
      messageToProcess += `\n[SISTEMA - NOTA DE VOZ REQUERIDA Y LÍMITE DE DURACIÓN ÁGIL]: El usuario te envió esta consulta mediante una NOTA DE VOZ (audio). Como JanIA, debes responder en nota de voz de viva voz. DEBES obligatoriamente marcar "wantsVoice": true y redactar en "voiceResponse" una versión hablada resumida, directa, muy fluida, profesional, cálida y natural de tu respuesta (máximo 450 caracteres / ~30 a 40 segundos de voz hablada), sin asteriscos, viñetas ni sintaxis Markdown, perfecta para ser sintetizada e impactar de forma ágil e instantánea sin saturar la conexión. En "response" coloca la versión completa formateada en texto.`;
    }

    const history = getConsultingHistory(userId);
    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    for (const h of history) {
      messages.push({
        role: h.role === "assistant" ? "assistant" : "user",
        content: h.role === "user" ? `Usuario @${rawPhone} (${realName}): ${h.content}` : h.content
      });
    }

    let userPromptContent = `Usuario: @${rawPhone} (${realName})\nConsulta: ${messageToProcess}`;
    if (quotedContext) {
      userPromptContent += `\n[Contexto del mensaje previo citado al que responde el usuario: "${quotedContext}"]`;
    }
    userPromptContent += greetingInstruction;

    messages.push({
      role: "user",
      content: userPromptContent
    });

    // Activar búsqueda web en vivo SOLO si la consulta tiene términos específicos de mercado o normas
    const needsSearch = (
      cleanText.length > 25 &&
      (cleanText.includes("ley ") || cleanText.includes("decreto") || cleanText.includes("resoluci") || cleanText.includes("corte") || cleanText.includes("sentencia") || cleanText.includes("jurisprudencia") || cleanText.includes("uvt") || cleanText.includes("notar") || cleanText.includes("sinupot") || cleanText.includes("aval") || cleanText.includes("valor m2") || cleanText.includes("precio del m2") || cleanText.includes("metro cuadrado"))
    );

    const llmRes = await invokeLLM({
      messages,
      responseFormat: { type: "json_object" },
      imageBuffer,
      pdfBuffer,
      pdfMimeType,
      enableSearch: needsSearch
    });

    try {
      const parsed = parseSafeJSON(llmRes.choices[0].message.content);
      const finalResp = sanitizeResponseMarkdown(parsed.response || "");
      // Guardar turno en memoria conversacional de Grupo 2
      appendConsultingHistory(userId, "user", text);
      appendConsultingHistory(userId, "assistant", finalResp);

      return {
        classification: parsed.classification || "CONSULTA_GENERAL",
        response: finalResp,
        reactionEmoji: parsed.reactionEmoji || (parsed.classification === "VIOLACION_DE_NORMAS" ? "🚫" : "👌"),
        wantsVoice: parsed.wantsVoice || false,
        voiceResponse: parsed.voiceResponse || ""
      };
    } catch (e) {
      const replyContent = llmRes.choices[0].message.content || "Lo siento, en este momento no puedo procesar tu consulta. Intenta de nuevo más tarde.";
      const finalResp = sanitizeResponseMarkdown(replyContent);
      appendConsultingHistory(userId, "user", text);
      appendConsultingHistory(userId, "assistant", finalResp);

      return {
        classification: "CONSULTA_GENERAL",
        response: finalResp,
        reactionEmoji: "👌",
        wantsVoice: false,
        voiceResponse: ""
      };
    }

  } catch (error: any) {
    console.error("[processConsultingMessage Error]:", error.message);
    const timeGreeting = getGreetingByTime();
    const rawPhone = userId.split('@')[0];
    const realName = await resolveRealName(userId, userName);
    const firstName = extractFirstName(realName) || 'colega';
    const cleanLower = text.toLowerCase().trim();

    // Fallback de contingencia: Si el usuario preguntó por avalúos o predios, dar la respuesta técnica directa y útil en lugar de un saludo repetitivo
    if (cleanLower.includes("aval") || cleanLower.includes("predio") || cleanLower.includes("acm") || cleanLower.includes("comercial") || cleanLower.includes("cuanto vale") || cleanLower.includes("precio")) {
      const avaluoFallback = `¡${timeGreeting}, estimada ${firstName}! 👋🏻 Con el mayor gusto te detallo la información técnica y jurídica que necesitamos para realizar el Análisis Comparativo de Mercado (ACM) y estimación del valor comercial de tu predio:\n\n1️⃣ *Ubicación Exacta:* Municipio de Cundinamarca, barrio/sector y dirección aproximada.\n2️⃣ *Documentos Jurídicos:* Copia del Certificado de Tradición y Libertad reciente y recibo del Impuesto Predial Unificado.\n3️⃣ *Características Físicas:* Área de lote (m²), área construida (m²), distribución (pisos, locales, habitaciones, baños) y antigüedad.\n4️⃣ *Registro Fotográfico:* 3 a 5 fotos de fachada exterior e interiores principales.\n\nCon estos datos en mano, procesamos el estudio comparativo frente a transacciones reales de la zona para entregarte una estimación técnica sólida y orientativa. 📊\n\n¡Quedo muy atenta cuando los tengas a mano para empezar a revisarlo de una! 🤝✨`;
      appendConsultingHistory(userId, "user", text);
      appendConsultingHistory(userId, "assistant", avaluoFallback);
      return {
        classification: "CONSULTA_GENERAL",
        response: avaluoFallback,
        reactionEmoji: "📐"
      };
    }

    // Fallback si preguntó por contratos o arrendamientos
    if (cleanLower.includes("contrato") || cleanLower.includes("arriend") || cleanLower.includes("canon") || cleanLower.includes("ley 820") || cleanLower.includes("promesa")) {
      const legalFallback = `¡${timeGreeting}, ${firstName}! 👋🏻 Con gusto te asesoro. En materia de contratos inmobiliarios (arrendamiento Ley 820 de 2003 o promesa de compraventa), recuerda que los elementos esenciales son la determinación clara de las partes, la identificación del predio con matrícula inmobiliaria y linderos, el canon/precio exacto y las cláusulas penales y de prórroga.\n\n¿Tienes alguna cláusula o situación específica que desees que revisemos o redactemos? ¡Indícame el detalle y con gusto te estructuro la respuesta completa! ⚖️🤝`;
      appendConsultingHistory(userId, "user", text);
      appendConsultingHistory(userId, "assistant", legalFallback);
      return {
        classification: "CONSULTA_GENERAL",
        response: legalFallback,
        reactionEmoji: "⚖️"
      };
    }

    const genericFallback = `Hola ${firstName} 👋🏻. Disculpa la pequeña demora, estuve recalibrando mis motores de consulta en tiempo real. Entiendo tu mensaje sobre tu consulta inmobiliaria. ¿Podrías confirmarme el detalle específico para entregarte la solución completa y estructurada de inmediato? ¡Aquí estoy 100% lista para apoyarte! 🤝✨`;
    appendConsultingHistory(userId, "user", text);
    appendConsultingHistory(userId, "assistant", genericFallback);
    return {
      classification: "CONSULTA_GENERAL",
      response: genericFallback,
      reactionEmoji: "💡"
    };
  }
}

export async function processCirculoMessage(
  text: string, 
  userId: string, 
  userName?: string
): Promise<JanIAResult> {
  try {
    const rawPhone = userId.split('@')[0];
    const realName = await resolveRealName(userId, userName);
    const firstName = extractFirstName(realName);
    const userGreetingName = firstName ? ` ${firstName}` : "";

    // Intercepción estricta de mensajes OFF-TOPIC prohibidos (Política, Religión, Cursos, Links ajenos, Memes, Spam)
    const strictOffTopic = checkStrictOffTopic(text);
    if (strictOffTopic.isOffTopic) {
      console.log(`[JanIA-Circulo-OffTopic] Mensaje prohibido en Proyecto Vecy Network para ${userId}: "${text.substring(0, 50)}...". (${strictOffTopic.reason})`);
      const warningText = `Hola @${rawPhone} (${realName}) 👋🏻. El contenido relacionado con ${strictOffTopic.reason} está estrictamente prohibido en nuestra comunidad de VECY Network. 🚫\n\nNuestros canales son 100% profesionales y dedicados exclusivamente a la tecnología, comisiones y el modelo colaborativo inmobiliario. ¡Te invitamos cordialmente a eliminar este mensaje de inmediato! 🤝`;
      return {
        classification: "VIOLACION_DE_NORMAS",
        response: warningText,
        dmResponse: warningText,
        reactionEmoji: "🚫"
      };
    }

    const cleanText = text.toLowerCase().trim();

    if (cleanText.length > 15) {
      const onTopicKeywords = [
        "apto", "apartamento", "casa", "lote", "finca", "bodega", "oficina", "local", "inmueble", "propiedad",
        "predio", "terreno", "proyecto", "arriendo", "alquiler", "vendo", "venta", "compro", "compra", "busco",
        "ofrezco", "necesito", "permuto", "venpermuto", "estrato", "m2", "metros", "habitacion", "habitación",
        "baño", "baños", "cocina", "garaje", "parqueadero", "canon", "administracion", "administración", "precio",
        "millones", "cop", "arrendar", "vender", "comprar", "bogota", "bogotá", "medellin", "medellín", "cali",
        "barranquilla", "bucaramanga", "cartagena", "barrio", "sector", "zona", "calle", "carrera", "avenida",
        "contrato", "arrendamiento", "promesa", "escritura", "notaria", "notaría", "registro", "sucesión",
        "sucesion", "herencia", "embargo", "saneamiento", "comision", "comisión", "corretaje", "avalúo", "avaluo",
        "jania", "vecy", "bot", "ayuda", "cómo", "como", "funciona", "publicar", "registrar", "match",
        "coincidencia", "contacto", "cuenta", "hola", "gracias", "saludo", "cristian", "samboni", "ubicapp"
      ];

      const hasOnTopicKeyword = onTopicKeywords.some(keyword => cleanText.includes(keyword));
      if (!hasOnTopicKeyword) {
        console.log(`[JanIA-Circulo-OffTopic] Mensaje fuera de tema en Círculo Cero para ${userId}: "${text.substring(0, 50)}...". Retornando estático.`);
        const staticText = `Hola @${rawPhone} (${realName}) 👋🏻. Este grupo está reservado exclusivamente para temas, debates, testimonios y soporte relacionados con la red de VECY Network e Inteligencia Artificial. 💡✨\n\nPor favor, realiza una pregunta o comentario relacionado con nuestro ecosistema. 😊`;
        return {
          classification: "VIOLACION_DE_NORMAS",
          response: staticText,
          dmResponse: staticText,
          reactionEmoji: "🚫"
        };
      }
    }

    const textLower = text.toLowerCase();

    const alreadyGreeted = await checkAlreadyGreeted(userId);

    const groupZeroName = process.env.GROUP_ZERO_NAME || 'PROYECTO "Vecy Network"';
    const systemPrompt = 
      `Eres JanIA, la Inteligencia Artificial oficial de VECY Network. Estás operando en el grupo "${groupZeroName}". ` +
      `Tu objetivo en este grupo es responder inquietudes exclusivamente relacionadas con el proyecto "VECY NETWORK", de forma sincera, verídica y sin mentiras, de acuerdo con las siguientes directrices:\n\n` +
      `## DIRECTRICES DE INFORMACIÓN Y SINCERIDAD SOBRE VECY NETWORK:\n` +
      `Explica claramente y con la verdad absoluta el estado del proyecto y sus características:\n` +
      `- **Lo que en verdad funciona hoy**: Los asesores publican sus ofertas (Inmuebles) y demandas (Requerimientos) en el grupo especializado VECY INMUEBLES NETWORK. JanIA transcribe notas de voz en tiempo real, realiza OCR (lectura de texto) en flyers/imágenes, extrae la información de las fichas técnicas automáticamente a partir de enlaces/URLs compartidos de portales permitidos, ejecuta el matching de coincidencias comerciales de forma instantánea a nivel nacional (32 departamentos), y gestiona el flujo de confirmación de contacto bilateral privada (Double Opt-In) por mensaje privado (DM) mediante respuestas rápidas (SÍ #M[código] o NO #M[código]).\n` +
      `- **Lo que está en desarrollo y planeado a futuro**: El portal web oficial privado (https://vecy-network.vercel.app/) se encuentra en fases de desarrollo e integración. Módulos como el CRM para centralizar leads de agentes, la digitalización de contratos formalizados y el motor de identidades dinámicas (subdominios personalizados para cada agente como agente.vecy.network) serán lanzados oficialmente en el futuro y aún no están operativos para los usuarios.\n` +
      `- **Urgencia Comercial y Tarifas**: Enfatiza que toda la plataforma, incluyendo el matching de JanIA en WhatsApp y la carga de inmuebles, es 100% gratuita por lanzamiento. Sin embargo, advierte con astucia que esta gratuidad ilimitada está programada temporalmente y que, posiblemente, a partir del *01 de Julio de 2026* se implementará un modelo de membresías/pago para accesos ilimitados. ¡Debe servir de urgencia para registrarse y publicar hoy mismo!\n` +
      `- **Tecnología del Ecosistema**: Explica de forma sencilla que hemos creado un Asistente de IA basado en código propietario y base de datos SQL en la nube, el cual está siendo entrenado a diario para encontrar MATCH en los grupos. NUNCA utilices tecnicismos complejos ni reveles nombres internos específicos de nuestra infraestructura. Queda strictly PROHIBIDO mencionar o revelar nombres como "Supabase", "Antigravity" o "Google Cloud".\n` +
      `- **Recomendación de Imágenes y OCR**: Explica a los usuarios por qué es preferible enviar capturas de pantalla o imágenes con texto comercial de sus propiedades en lugar de enlaces de redes sociales (Instagram, Facebook, etc.). La razón técnica es que las redes sociales restringen el acceso mediante bloqueos y filtros de verificación humana, haciendo imposible que la IA extraiga los datos. Al enviarle una captura de pantalla al grupo VECY INMUEBLES NETWORK, JanIA puede leer e indexar la información con su visión OCR al instante.\n` +
      `- **VECY INMUEBLES NETWORK es el único centro de Match**: Recuerda y recalca que el grupo especializado VECY INMUEBLES NETWORK es el ÚNICO canal donde JanIA busca los MATCH y gestiona los datos de inmuebles y requerimientos. En PROYECTO "Vecy Network" o VECY: Soporte Legal, Tributario, Avalúos y Marketing no se procesan listados de propiedades ni se buscan coincidencias.\n` +
      `- **Invitación y Expansión**: Anima a los aliados a invitar a más brókers y a proponer a los administradores de otros grupos inmobiliarios que incluyan a JanIA como miembro y la nombren administradora. De esta forma, ella podrá captar datos de las publicaciones de sus miembros en otros chats, unirlos a VECY INMUEBLES NETWORK, y obtener resultados de match mucho más rápidos y eficaces para todos.\n` +
      `- **Tono**: Sincero, transparente, esperanzador, persuasivo y tecnológico. Motiva a los usuarios a no ser tímidos, a interactuar sin miedo con JanIA escribiendo @JanIA o por audio, y a colaborar publicando activamente en el grupo correcto.\n\n` +
      `## LÓGICA DE CLASIFICACIÓN Y REDIRECCIÓN (CRÍTICO - EVITAR MENSAJES CRUZADOS)\n` +
      `Analiza el contexto completo antes de clasificar. Debes responder estrictamente en formato JSON con la clasificación correcta:\n\n` +
      `1. **Clasificación "DEBATE_COMPETIDOR" (FLUJO ESPECIAL - DEBATE CON CRISTIAN SAMBONI / UBICAPP)**:\n` +
      `   - Si el mensaje menciona a **Ubicapp**, o proviene del usuario **Cristian Samboni** (teléfono +57 311 2469375 o similar), o contiene publicidad de Ubicapp.\n` +
      `   - **Directriz de comportamiento**: No debes aplicar strikes ni eliminar el mensaje. Actúa con extrema cordura, caballerosidad comercial y amabilidad.\n` +
      `   - Genera una respuesta dirigida a él (utilizando ${firstName ? firstName : 'Cristian'} si es el autor, o mencionando a Cristian Samboni y su equipo). Invítalo de manera muy educada y profesional a un debate abierto en el grupo. Plantea preguntas técnicas y objetivas para comparar ambos modelos:\n` +
      `     * Gratuidad absoluta de VECY vs. Costo mensual de Ubicapp ($100.000 COP/mes).\n` +
      `     * Operación nativa en WhatsApp con IA multimodal vs. Obligación de descargar una app y rellenar formularios manuales.\n` +
      `     * Comisiones 100% para el asesor en VECY vs. Esquema de reparto forzado 50/50 de Ubicapp.\n` +
      `   - Invítalo también a formularnos preguntas técnicas y comprométete a responderlas con total tecnicismo, lógica y rigor profesional.\n` +
      `   - Emoji ('reactionEmoji'): "💡"\n\n` +
      `2. **Clasificación "INMUEBLE" o "REQUERIMIENTO" (PUBLICACIÓN EN GRUPO EQUIVOCADO)**:\n` +
      `   - Si el usuario está publicando un listado de inmuebles (oferta comercial de venta, arriendo o permuta) o un requerimiento comercial para comprar o rentar un inmueble específico.\n` +
      `   - Clasificación: "VIOLACION_DE_NORMAS"\n` +
      `   - Respuesta ('response'): "Hola${userGreetingName}, detecté que estás publicando una oferta o requerimiento inmobiliario en este canal de debate. Para poder procesar tu publicación con mis motores automáticos, registrar tus datos y buscarte un MATCH de inmediato con otros aliados, por favor realiza tu publicación en nuestro grupo especializado **VECY INMUEBLES NETWORK**:\\n👉 https://chat.whatsapp.com/GzMbjNs1P2tHI7D0V4h8wZ\\n\\n¡Hagamos equipo y cerremos negocios! 🚀🎯"\n` +
      `   - Emoji ('reactionEmoji'): "🚫"\n\n` +
      `3. **Clasificación "AVALUO_O_LEGAL"**:\n` +
      `   - Si el usuario realiza una consulta jurídica (sobre contratos, leyes de arrendamiento, escrituración, etc.) o solicita un avalúo rápido/precio estimado de metro cuadrado.\n` +
      `   - Respuesta ('response'): "💡 *VECY: SOPORTE LEGAL, CONTRATOS Y AVALÚOS* 💡\\n\\nHola${userGreetingName}, veo que tienes una consulta jurídica, procedimental o de avalúo. Para darte una respuesta detallada con mis motores legales y de mercado, por favor realiza tu pregunta en nuestro grupo especializado **VECY: SOPORTE LEGAL, CONTRATOS Y AVALÚOS**:\\n👉 https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6\\n\\n¡Allí te responderé al instante con toda la información! 🚀🎯"\n` +
      `   - Emoji ('reactionEmoji'): "🔄"\n\n` +
      `4. **Clasificación "CONSULTA_GENERAL"**:\n` +
      `   - Preguntas o comentarios legítimos sobre el proyecto VECY Network, beneficios, sugerencias, testimonios de éxito o comentarios hacia la IA.\n` +
      `   - Responder de forma cordial, corta, directa y amigable de acuerdo con las directrices de veracidad y sinceridad.\n` +
      `   - Emoji ('reactionEmoji'): "💡"\n\n` +
      `5. **Clasificación "VIOLACION_DE_NORMAS"**:\n` +
      `   - Si el mensaje contiene temas políticos, religiosos, spam general, estafas o publicidad de terceros (que NO sea debate de Ubicapp).\n` +
      `   - Respuesta ('response'): Una advertencia amable pero muy firme para remover el contenido de inmediato, detallando las pautas y advirtiendo de la expulsión al 3er strike.\n` +
      `   - Emoji ('reactionEmoji'): "❌"\n\n` +
      `Tus respuestas en el debate deben ser cortas, cordiales, directas, pero sumamente sofisticadas, con datos y argumentos de alto nivel. Debes usar siempre emojis relacionados y muy expresivos de forma estratégica para que el texto sea visualmente dinámico y amigable para leer en WhatsApp. Siempre dirígete al interlocutor de forma personalizada: ${firstName || realName}.\n\n` +
      `DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:\n` +
      `{\n` +
      `  "classification": "DEBATE_COMPETIDOR | INMUEBLE | REQUERIMIENTO | AVALUO_O_LEGAL | CONSULTA_GENERAL | VIOLACION_DE_NORMAS",\n` +
      `  "response": "Tu respuesta, invitación a debate o mensaje de redirección según corresponda.",\n` +
      `  "reactionEmoji": "string (emoji recomendado)"\n` +
      `}`;

    // Cálculo de saludo según hora oficial Bogotá (UTC-5):
    // 01:00 AM - 11:59 AM: Buenos días | 12:00 PM - 06:59 PM: Buenas tardes | 07:00 PM - 12:59 AM: Buenas noches
    const timeGreeting = getGreetingByTime();
    const nowBogota = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
    const hour = nowBogota.getHours();

    // Detección magistral de nombre compuesto y género exacto
    const nameInfo = resolveNameAndGender(realName || firstName || "colega", timeGreeting);
    const targetName = nameInfo.displayName;
    const isFemale = nameInfo.isFemale;
    const genderTerm = nameInfo.genderTerm;

    const greetingInstruction = `\n\n[SISTEMA - INSTRUCCIÓN OBLIGATORIA DE SALUDO Y COMPORTAMIENTO]:
- Hora actual Bogotá: ${hour}:00 (${timeGreeting}).
- Nombre exacto resuelto: "${targetName}".
- Género detectado para ${targetName}: ${isFemale ? "Femenino (estimada)" : "Masculino (estimado)"}.
- Término de trato respetuoso: "${genderTerm}".
- Ya has saludado a esta persona hoy: ${alreadyGreeted ? "SÍ" : "NO"}.
- Tipo de conversación actual: GRUPO DE WHATSAPP ("PROYECTO VECY NETWORK").
- REGLAS OBLIGATORIAS DE SALUDO:
  * Si "Ya has saludado al usuario hoy" es NO:
    - Debes iniciar tu respuesta saludando cordial y profesionalmente con el saludo de hora exacto ("${timeGreeting}"), utilizando su trato respetuoso y nombre: ej. "${timeGreeting}, ${genderTerm}" o "${timeGreeting} ${genderTerm}, aliado/a".
  * Si "Ya has saludado al usuario hoy" es SÍ:
    - ¡PROHIBIDO SALUDAR! No uses "Hola", "${timeGreeting}", "Buenas", "Qué gusto", ni ninguna bienvenida.
    - Integra su nombre "${targetName}" de forma conversacional y fluida dentro del cuerpo de la respuesta (ej. "Mira ${targetName}, ...", "Para complementar tu idea, ${targetName}, ...").`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Usuario: @${rawPhone} (${realName})\nPregunta: ${text}${greetingInstruction}` }
    ];

    const llmRes = await invokeLLM({
      messages,
      responseFormat: { type: "json_object" },
      enableSearch: false
    });

    try {
      const parsed = parseSafeJSON(llmRes.choices[0].message.content);
      return {
        classification: parsed.classification || "CONSULTA_GENERAL",
        response: sanitizeResponseMarkdown(parsed.response || ""),
        reactionEmoji: parsed.reactionEmoji || (parsed.classification === "VIOLACION_DE_NORMAS" ? "❌" : "💡")
      };
    } catch (e) {
      const replyContent = llmRes.choices[0].message.content || "Lo siento, en este momento no puedo responder tu consulta.";
      return {
        classification: "CONSULTA_GENERAL",
        response: sanitizeResponseMarkdown(replyContent),
        reactionEmoji: "💡"
      };
    }

  } catch (error: any) {
    console.error("[processCirculoMessage Error]:", error.message);
    const timeGreeting = getGreetingByTime();
    const rawPhone = userId.split('@')[0];
    const realName = await resolveRealName(userId, userName);
    const firstName = extractFirstName(realName);
    const userGreetingName = firstName ? ` ${firstName}` : "";

    return {
      classification: "CONSULTA_GENERAL",
      response: `¡${timeGreeting}${userGreetingName}! 👋🏻 Con gusto estoy aquí para apoyarte. Cuéntame cuál es tu consulta sobre VECY Network, nuestra tecnología o comisiones y con gusto te respondo. 💡✨`,
      reactionEmoji: "💡"
    };
  }
}

export const MSG_COMUNICADO_MATCH_NETWORK = `🚀 ¡NUEVO SISTEMA DE MATCH PRIVADO Y SEGURO CON JanIA! 🎯🤝

Estimados aliados, para asegurar que los MATCH comerciales se conviertan en cierres reales de negocios y proteger la privacidad de sus contactos, hemos implementado el flujo de *CONFIRMACIÓN BILATERAL PRIVADA*:

¿Cómo funciona a partir de hoy?

1️⃣ Publica tus ofertas o requerimientos en el grupo como siempre.
2️⃣ Si hay coincidencia (Match), JanIA lo anunciará en el grupo para que la red vea el cruce, pero ocultará los contactos directos.
3️⃣ JanIA te escribirá de inmediato por CHAT PRIVADO (DM) enviándote la ficha del colega y solicitando tu confirmación.
4️⃣ Responde en ese chat privado con un simple:
   👉 SÍ #M[Código]  (si te interesa conectar)
   👉 NO #M[Código]  (si ya no está disponible)
5️⃣ Si ambos confirman con SÍ, JanIA les entregará a cada uno en privado el contacto directo del otro para que coordinen la cita. 📲🤝

⚠️ IMPORTANTE: Recuerden que operamos en Etapa de Prueba Gratuita y SIN COMISIONES. Si consolidan un negocio real gracias a la conexión privada de JanIA, es un compromiso de honor compartir su testimonio en este grupo y registrar su reseña oficial y calificación aquí: https://g.page/r/CctNbwU6UpX5EBM/review 

¡El negocio ahora se activa directo en tu chat privado! Hagamos que el cierre ocurra. 🚀📈`;

export const MSG_COMUNICADO_MATCH_CIRCULO = `⚖️ COMPROMISO DE HONOR VECY: EVOLUCIONAMOS AL MATCH PROACTIVO ⚖️

Queridos colegas de Círculo Cero, la tecnología inmobiliaria más avanzada de Colombia se vuelve aún más efectiva para sus negocios. 

JanIA ha dejado de ser un bot pasivo que solo publica alertas en el grupo. A partir de hoy, opera bajo el sistema de *Double Opt-In (Doble Confirmación)*:

🔑 Beneficios del nuevo flujo:
• Mayor Responsabilidad: Ya no basta con ver el match en el grupo. JanIA les pedirá confirmar el interés de forma directa en su WhatsApp privado.
• Privacidad Protegida: Tus números de contacto y enlaces solo se compartirán con el otro asesor si ambos aprueban de forma explícita la conexión en privado.
• Medición Real: Sabremos exactamente qué porcentaje de matches pasan a conversaciones reales y cierres de comisiones.

⚠️ IMPORTANTE: Recuerden que operamos en Etapa de Prueba Gratuita y SIN COMISIONES. Si consolidan un negocio real gracias a la conexión privada de JanIA, es un compromiso de honor compartir su testimonio en este grupo y registrar su reseña oficial y calificación aquí: https://g.page/r/CctNbwU6UpX5EBM/review

¡Sigamos demostrando el poder de la colaboración inteligente en Colombia! 🇨🇴🎯`;

export function sanitizeResponseMarkdown(text: string): string {
  if (!text) return "";
  // Reemplazar dobles asteriscos "**" por un solo asterisco "*" para cumplir con el formato de WhatsApp
  return text.replace(/\*\*/g, "*");
}
