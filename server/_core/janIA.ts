/**
 * JanIA Core Logic - VECY Network
 * Version: 11.70.0 (JanIA v2.5 - Conversational Naturalness Edition)
 */
import { invokeLLM } from "./llm";
import { getDb } from "../db";
import { properties, requirements, users, propertyImages, InsertProperty, InsertRequirement, pendingSessions, propertyMatches, messages as dbMessages, conversations as dbConversations } from "../../drizzle/schema";
import { findMatchesForProperty, findMatchesForRequirement } from "./matching";
import { validarZona, normalizarTextoGeografico } from "./geography";
import { transcribeAudio } from "./voiceTranscription";
import { eq, and, sql, gte, desc, or, isNotNull } from "drizzle-orm";
import { storagePut } from "../storage";
import fs from "fs";
import path from "path";
import axios from "axios";


export type JanIAResult = {
  classification: "INMUEBLE" | "REQUERIMIENTO" | "CONSULTA_GENERAL" | "RESPUESTA_A_PREGUNTA_IA" | "DATOS_INCOMPLETOS" | "VIOLACION_DE_NORMAS" | "ANALISIS_DE_MERCADO";
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

function extractFirstName(fullName: string): string {
  const clean = fullName.trim();
  if (!clean) return "";
  if (/^\+?[\d\s-]{6,}$/.test(clean)) return "";
  
  const words = clean.split(/\s+/).map(w => w.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, ""));
  if (words.length === 0 || !words[0]) return "";
  
  const w1 = words[0].toLowerCase();
  const w2 = words[1] ? words[1].toLowerCase() : "";
  
  if (w2 && COMMON_FIRST_NAMES.has(w1) && COMMON_FIRST_NAMES.has(w2)) {
    const first = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
    const second = words[1].charAt(0).toUpperCase() + words[1].slice(1).toLowerCase();
    return `${first} ${second}`;
  }
  
  return words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
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
  if (text.startsWith("```json")) {
    text = text.substring(7);
  } else if (text.startsWith("```")) {
    text = text.substring(3);
  }
  if (text.endsWith("```")) {
    text = text.substring(0, text.length - 3);
  }
  text = text.trim();

  try {
    return JSON.parse(text);
  } catch (e) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const extracted = text.substring(start, end + 1);
      try {
        return JSON.parse(extracted);
      } catch (e2) {
        try {
          let insideString = false;
          const chars = [...extracted];
          for (let i = 0; i < chars.length; i++) {
            if (chars[i] === '"' && (i === 0 || chars[i - 1] !== '\\')) {
              insideString = !insideString;
            }
            if (insideString && chars[i] === '\n') {
              chars[i] = '\\n';
            }
          }
          return JSON.parse(chars.join(''));
        } catch (e3) {
          throw e;
        }
      }
    }
    throw e;
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
    const [existing] = await db.select().from(pendingSessions).where(eq(pendingSessions.jid, cleanJid)).limit(1);
    const data = existing ? (existing.sessionData as any) : {};
    data.isMuted = isMuted;

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
    console.log(`[JanIA-Mute] Sesión ${cleanJid} marcada como isMuted = ${isMuted}`);
  } catch (err) {
    console.error("[Database] Error muting session:", err);
  }
}

export async function isSessionMuted(userId: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const cleanJid = cleanSessionJid(userId);
    const [existing] = await db.select().from(pendingSessions).where(eq(pendingSessions.jid, cleanJid)).limit(1);
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

  return `🤔 *¡PUBLICACIÓN INCOMPLETA!* 🤔\n\nHola @${phone}, noto que estás publicando un(a) *${propertyName}*, pero a tu mensaje le faltan datos importantes: *${missingStr}*.\n\nPara registrar tu oferta/requerimiento y buscarte un MATCH de inmediato, haz clic en este enlace para enviarme los datos por privado: 👇\n👉 https://wa.me/573185462265?text=${encodeURIComponent('Hola JanIA, aquí están los datos de mi publicación')}`;
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

let promptCache: Record<string, string> = {};

// Consulta los contadores reales de la base de datos en tiempo real
export async function getLiveStats(): Promise<string> {
  try {
    const db = await getDb();
    if (!db) return "";

    const [propCount] = await db.select({ total: sql<number>`count(*)::int` }).from(properties);
    const [reqCount]  = await db.select({ total: sql<number>`count(*)::int` }).from(requirements);
    const [matchCount] = await db.select({ total: sql<number>`count(*)::int` }).from(propertyMatches);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [propHoy]  = await db.select({ total: sql<number>`count(*)::int` }).from(properties).where(gte(properties.createdAt, today));
    const [reqHoy]   = await db.select({ total: sql<number>`count(*)::int` }).from(requirements).where(gte(requirements.createdAt, today));
    const [matchHoy] = await db.select({ total: sql<number>`count(*)::int` }).from(propertyMatches).where(gte(propertyMatches.createdAt, today));

    const now = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' });
    return `
## 📊 ESTADÍSTICAS EN TIEMPO REAL DE VECY NETWORK (Actualizado: ${now} hora Colombia)
Esta información es EXACTA y proviene directamente de la base de datos en este preciso instante. Úsala cuando alguien pregunte cuántos inmuebles, requerimientos o coincidencias tenemos:

| Categoría | Total Histórico | Nuevos Hoy |
|-----------|----------------|------------|
| 🏢 Inmuebles publicados | **${propCount?.total ?? 0}** | ${propHoy?.total ?? 0} |
| 📋 Requerimientos de búsqueda | **${reqCount?.total ?? 0}** | ${reqHoy?.total ?? 0} |
| 🎯 Coincidencias (Matches) detectadas | **${matchCount?.total ?? 0}** | ${matchHoy?.total ?? 0} |

Si alguien te pregunta por estos números, responde CON PRECISIÓN usando exactamente los datos de esta tabla. No inventes, no estimes. Estos son los datos reales del sistema VECY en este momento.`;
  } catch (err) {
    console.warn("[JanIA-LiveStats] No se pudo obtener estadísticas en tiempo real:", err);
    return "";
  }
}

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
      specificPrompt = fs.readFileSync(path.join(baseDir, "grupos/inmuebles.md"), "utf-8");
    } else if (groupJid === '120363417740040773@g.us') {
      const legalPrompt = fs.readFileSync(path.join(baseDir, "grupos/legal.md"), "utf-8");
      const avaluosPrompt = fs.readFileSync(path.join(baseDir, "modulos/avaluos.md"), "utf-8");
      specificPrompt = `${legalPrompt}\n\n${avaluosPrompt}`;
    } else if (groupJid === '120363403507276533@g.us') {
      specificPrompt = fs.readFileSync(path.join(baseDir, "grupos/circulo_cero.md"), "utf-8");
    } else if (groupJid && (groupJid.endsWith('@g.us') || groupJid.includes('@us'))) {
      // Cualquier otro grupo de WhatsApp procesa inmuebles/requerimientos
      specificPrompt = fs.readFileSync(path.join(baseDir, "grupos/inmuebles.md"), "utf-8");
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
    "transactionType": "venta | arriendo | arriendo_temporal | permuta | aporte (el tipo de negocio PRINCIPAL)",
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
    "floorDetail": "string (ej: 'piso 5', '3 pisos', '8 metros de altura', 'NA')"
  },
  "response": "Tu respuesta elocuente para el grupo (cadena vacía '' si no hay match ni es consulta)",
  "shouldSendDM": boolean,
  "missingFields": ["string"],
  "reactionEmoji": "string (emoji recomendado para reaccionar al mensaje original, ej: '❌', '🚫', '⚠️', '🔄', '✅', '💡', '🎯')",
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

    // Enviar notificación por DM al administrador (3166569719)
    const adminPhone = "573166569719";
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

  // Generic and anonymous notification for the WhatsApp group to prevent direct contact
  const responseText = `📢 *¡ATENCIÓN!* Hemos detectado un posible Match 🎯, Por favor @todos pendientes. En breve uno de nuestros agentes 🙋🏻‍♀️🙋🏻‍♂️ contactará a los beneficiarios para compartirles los datos de las coincidencias encontradas 🔍. Saludos 👋`;

  return {
    response: responseText,
    mentions: [],
    extraDMs: extraDMs,
    sendReputationHook: false
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
    arriendo_temporal: "ARRIENDO TEMPORAL",
    permuta: "PERMUTA"
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

  const firstName = extractFirstName(nameToUse) || 'colega';

  if (alreadyGreeted) {
    return isGroup ? `Mira @${phone}` : `Mira ${firstName}`;
  } else {
    return isGroup ? `${salutation} @${phone}` : `${salutation} ${firstName}`;
  }
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
    
    // Extraer y procesar enlaces con evasión de bloqueos (Bypass)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    let jinaExtractedText = "";
    if (urls && urls.length > 0) {
      for (const url of urls) {
        const content = await scrapeUrlWithBypass(url);
        if (content) {
          jinaExtractedText += `\n\n[CONTENIDO DE ENLACE WEB EXTRAÍDO DE ${url}]:\n${content.substring(0, 15000)}\n[FIN CONTENIDO ENLACE]\n`;
        }
      }
    }
    if (jinaExtractedText) {
      messageToProcess += jinaExtractedText;
    }

    let isFromAudio = false;

    // Intercepción rápida de mensajes OFF-TOPIC para ahorrar tokens de Gemini
    const cleanText = text.toLowerCase().trim();
    const isMediaOrAudio = hasMedia || !!audioUrl || !!imageBuffer || !!pdfBuffer;

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
        "jania", "vecy", "bot", "ayuda", "cómo", "como", "funciona", "publicar", "registrar", "match",
        "coincidencia", "contacto", "cuenta", "hola", "gracias", "saludo"
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
            groupRulesName = "Círculo CERO 👌";
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
          reactionEmoji: "❌"
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

    // 2. Preparación de Contexto LLM Multimodal
    let contextText = `Mensaje de ${userName || userId}: ${messageToProcess}`;
    if (isFromAudio) {
      contextText += `\n[SISTEMA - NOTA DE VOZ]: El usuario te envió este mensaje como nota de voz (audio). Dado que te enviaron audio, es preferible y de alta importancia que respondas en audio ("wantsVoice": true) si tu respuesta es corta (saludos, confirmaciones, consultas breves, o respuestas de menos de 250 caracteres). **EXCEPCIÓN CRÍTICA**: Si el usuario te pide explícitamente que le respondas por audio, nota de voz o de viva voz por cualquier razón, debes omitir el límite de longitud y responder obligatoriamente por audio ("wantsVoice": true y colocar toda tu respuesta en "voiceResponse" de forma limpia), a menos que sea un contrato extenso o tabla de datos que no se pueda leer de manera natural. Si la respuesta requiere explicaciones largas, tablas o minutas/contratos y el usuario NO pidió expresamente que fuera audio, responde obligatoriamente por escrito ("wantsVoice": false).`;
    }
    if (scrapedData.length > 0) contextText += `\n[SISTEMA - DATOS SCRAPED]: ${JSON.stringify(scrapedData)}`;
    if (imageBuffer) contextText += `\n[SISTEMA: IMAGEN DETECTADA. Analiza la imagen con visión OCR para extraer todos los datos del flyer o captura comercial.]`;
    if (pdfBuffer) contextText += `\n[SISTEMA: DOCUMENTO PDF DETECTADO. Analiza el documento PDF adjunto con tus capacidades nativas para extraer todos los datos relevantes del predial, certificado de tradición, o contrato.]`;

    let statsSummary = "";
    try {
      const db = await getDb();
      if (db) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const isRealProperty = or(isNotNull(properties.idUsuarioWhatsapp), isNotNull(properties.agentId));
        const [totalPropsResult] = await db.select({ count: sql<number>`count(*)` }).from(properties).where(isRealProperty);
        const [totalReqsResult] = await db.select({ count: sql<number>`count(*)` }).from(requirements);
        const [totalMatchesResult] = await db.select({ count: sql<number>`count(*)` }).from(propertyMatches);

        const [todayPropsResult] = await db.select({ count: sql<number>`count(*)` }).from(properties).where(and(gte(properties.createdAt, startOfToday), isRealProperty));
        const [todayReqsResult] = await db.select({ count: sql<number>`count(*)` }).from(requirements).where(gte(requirements.createdAt, startOfToday));
        const [todayMatchesResult] = await db.select({ count: sql<number>`count(*)` }).from(propertyMatches).where(gte(propertyMatches.createdAt, startOfToday));

        const totalProps = totalPropsResult?.count || 0;
        const totalReqs = totalReqsResult?.count || 0;
        const totalMatches = totalMatchesResult?.count || 0;
        const todayProps = todayPropsResult?.count || 0;
        const todayReqs = todayReqsResult?.count || 0;
        const todayMatches = todayMatchesResult?.count || 0;

        statsSummary = `\n[SISTEMA - ESTADÍSTICAS REALES EN TIEMPO REAL VECY NETWORK]:
- Propiedades totales registradas en el sistema: ${totalProps} (Nuevas hoy: ${todayProps})
- Requerimientos/Demandas totales registradas: ${totalReqs} (Nuevos hoy: ${todayReqs})
- Matches/Coincidencias de negocio detectados totales: ${totalMatches} (Nuevos hoy: ${todayMatches})
[REGLA DE USO CRÍTICA]: Únicamente menciona o utiliza estas estadísticas si el usuario te pregunta directamente por cifras del sistema, cantidades de propiedades o requerimientos, reportes de actividad, o cómo va el día. Queda terminantemente PROHIBIDO incluirlas de forma espontánea en saludos, bienvenidas o respuestas ordinarias.`;
      }
    } catch (err) {
      console.error("[JanIA-Stats] Error consultando estadísticas en tiempo real:", err);
    }

    if (statsSummary) {
      contextText += statsSummary;
    }

    const firstName = extractFirstName(realName) || 'colega';
    const bogotaTime = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hour12: false });
    const userGender = senderInfo.adj === "juiciosa" ? "Femenino" : (senderInfo.adj === "juicioso" ? "Masculino" : "No Especificado");

    const outsideHours = isOutsideWorkingHours();
    const estadoOperacion = outsideHours ? "fuera_de_horario" : "en_horario";

    const greetingInstruction = `\n\n[SISTEMA - METADATOS DEL MENSAJE (VARIABLES CRÍTICAS)]:
- {{hora}}: ${bogotaTime}
- {{canal}}: ${isGroup ? `Grupo WhatsApp - [${groupName || "Nombre Real del Grupo"}]` : "dm"}
- {{genero}}: ${userGender}
- {{es_nuevo_usuario}}: ${!alreadyGreeted ? "true" : "false"}
- {{estado_operacion}}: ${estadoOperacion}

[SISTEMA - INSTRUCCIÓN DE SALUDO Y COMPORTAMIENTO]:
- Ya has saludado al usuario hoy: ${alreadyGreeted ? "SÍ" : "NO"}.
- Tipo de conversación actual: ${isGroup ? "GRUPO DE WHATSAPP" : "CHAT PRIVADO / DM"}.
- Primer nombre del usuario: "${firstName}".
- REGLAS CRÍTICAS DE RESPUESTA:
  * Si "Ya has saludado al usuario hoy" es SÍ:
    - ¡PROHIBIDO SALUDAR! No uses palabras como "Hola", "Buenas tardes", "Qué gusto", "Bienvenido", ni variantes de saludo o bienvenida.
    - Si estás en un GRUPO DE WHATSAPP: Debes nombrar al usuario de manera natural y conversacional al inicio o dentro de tu respuesta (ej: "Mira ${firstName}, ...", "Te cuento, ${firstName}, que...", "Para complementar, ${firstName}, ...").
    - Si estás en CHAT PRIVADO / DM: Ve directamente al grano en tu respuesta sin ningún tipo de saludo. Tienes libertad de nombrar ocasionalmente al usuario de forma esporádica (con un 30% de probabilidad) para sonar humana y natural (ej: "Claro ${firstName}, ..." o "Entiendo ${firstName}, ..."), pero NUNCA uses frases de saludo.
  * Si "Ya has saludado al usuario hoy" es NO:
    - Debes saludar de manera muy cordial y natural, incluyendo su nombre "${firstName}" o dirigiéndote a él/ella como colega/aliado/a.`;

    contextText += greetingInstruction;

    if (!alreadyGreeted && outsideHours && !isGroup) {
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
      textLower.includes("sucesión") || textLower.includes("sucesion") ||
      textLower.includes("herencia") || textLower.includes("divorcio") ||
      textLower.includes("embargo") || textLower.includes("saneamiento") ||
      textLower.includes("compraventa") || textLower.includes("arrendamiento") ||
      textLower.includes("ley 820") || textLower.includes("ley 675") ||
      textLower.includes("corretaje") || textLower.includes("comision") || textLower.includes("comisión") ||
      textLower.includes("no me pago") || textLower.includes("no me pagó") ||
      textLower.includes("robo de comision") || textLower.includes("robo de comisión") ||
      textLower.includes("disputa") || textLower.includes("notaría") || textLower.includes("notaria");

    const enableSearch = isValuationQuery || isLegalQuery;

    // Obtener historial de chat reciente (Supercerebro)
    const history = await getRecentChatHistory(userId, 20);
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
      responseFormat: { type: "json_object" },
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
      console.error("[JanIA-Parser-Error] Contenido crudo que falló:", rawContent);
      
      if (rawContent && rawContent.trim() !== "") {
        result = {
          classification: "CONSULTA_GENERAL",
          response: rawContent.replace(/[\{\}\[\]"]/g, "").trim() || "Lo siento, en este momento tengo un problema de formato interno.",
          mentions: []
        };
      } else {
        throw parseErr;
      }
    }
    
    result.mentions = result.mentions || [];

    // --- HEURÍSTICA DE SEGURIDAD PARA CORREGIR CLASIFICACIÓN ---
    if (result.classification === "INMUEBLE" && messageToProcess) {
      const cleanText = messageToProcess.toLowerCase();
      const indicatesRequirement = cleanText.includes("busco") || 
                                   cleanText.includes("necesito") || 
                                   cleanText.includes("requiero") || 
                                   cleanText.includes("buscamos") || 
                                   cleanText.includes("compro") || 
                                   cleanText.includes("compra") ||
                                   cleanText.includes("para cliente") ||
                                   cleanText.includes("para un cliente") ||
                                   cleanText.includes("para una cliente");
      
      const indicatesProperty = cleanText.includes("vendo") || 
                                cleanText.includes("ofrezco") || 
                                cleanText.includes("tengo") || 
                                cleanText.includes("rento") || 
                                cleanText.includes("alquilo") || 
                                cleanText.includes("alquiler") ||
                                cleanText.includes("venta") ||
                                cleanText.includes("arriendo apartamento") ||
                                cleanText.includes("arriendo casa");

      if (indicatesRequirement && !indicatesProperty) {
        console.log("[JANIA-CORRECTION] Cambiando clasificación de INMUEBLE a REQUERIMIENTO basado en heurística de texto.");
        result.classification = "REQUERIMIENTO";
      }
    }

    const extracted = result.extractedData;
    const isRequirement = result.classification === "REQUERIMIENTO";
    const isProperty = result.classification === "INMUEBLE";

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

      const firstName = extractFirstName(realName) || 'colega';
      const saludo = getGreetingByTime();
      const customIntro = `¡${saludo}, *${firstName}*! 😊 `;

      // Generar el mensaje de DM privado por si acaso (ej. si el usuario es conocido y se decide moderación privada)
      result.dmResponse = buildIncompleteDataMessage(
        messageToProcess,
        hasMedia,
        scrapedData,
        imageBuffer,
        pdfBuffer,
        extracted,
        false,
        customIntro,
        firstName
      );

      if (isGroup) {
        // En el grupo se publica una advertencia pública etiquetando al usuario y dándole un link para opt-in por interno
        result.response = buildGroupIncompleteMessage(messageToProcess, userId, extracted);
        result.shouldSendDM = false;
      } else {
        // En chat privado (DM) se le asiste de forma directa preguntando por los datos faltantes
        result.shouldSendDM = true;
        result.dmShouldReply = true;
        result.response = "";
      }

      await setPendingSession(userId, {
        type: inferredType,
        extractedData: extracted || {},
        senderInfo: senderInfo,
        messageToProcess: messageToProcess,
        imageBuffer
      });

      return result;
    }

    // --- CAPA DE DEFENSA GEOGRÁFICA NACIONAL (Elástica) ---
    if (isProperty || isRequirement) {
      const zoneToValidate = isProperty ? extracted?.zone : (extracted?.zonaDeseada || extracted?.zone);
      
      let isValidGeo = false;
      let geoValidation: any = null;
      
      if (zoneToValidate && zoneToValidate.trim() !== "") {
        geoValidation = await validarZona(zoneToValidate, extracted?.city || extracted?.ciudadDeseada, messageToProcess);
        isValidGeo = geoValidation.isValid;
      }
      
      if (!isValidGeo) {
        if (isGroup || groupJid) {
          isValidGeo = true;
          if (!result.missingFields) result.missingFields = [];
          if (!result.missingFields.includes("zone")) result.missingFields.push("zone");
        } else {
          result.classification = "DATOS_INCOMPLETOS";
          result.shouldSendDM = true;
          result.dmShouldReply = true;
          result.response = "";

          const inferredType = isProperty ? "PROPERTY" : "REQUIREMENT";
          
          const firstName = extractFirstName(realName) || 'colega';
          const saludo = getGreetingByTime();
          const customIntro = `¡${saludo}, *${firstName}*! 😊 `;

          result.dmResponse = buildIncompleteDataMessage(
            messageToProcess,
            hasMedia,
            scrapedData,
            imageBuffer,
            pdfBuffer,
            extracted,
            true,
            customIntro,
            firstName
          );

          await setPendingSession(userId, {
            type: inferredType,
            extractedData: extracted || {},
            senderInfo: senderInfo,
            messageToProcess: messageToProcess,
            imageBuffer
          });

          return result;
        }
      }

      const validation = geoValidation;
      if (validation) {
        if (isProperty && validation.isValid) {
          extracted.latitude = validation.latitude || null;
          extracted.longitude = validation.longitude || null;
        }
        // Normalización Geográfica Nacional (v12.5)
        if (validation.isMunicipio) {
          // Fuera de Bogotá (Cali, Medellín, Tame, Tadó, etc.)
          if (isProperty) {
            extracted.city = validation.barrioCanonico;
            extracted.addressCity = validation.barrioCanonico;
            extracted.addressLocality = validation.localidad;
            if (extracted.zone && normalizarTextoGeografico(extracted.zone) !== normalizarTextoGeografico(validation.barrioCanonico || "")) {
              // Conservar barrio si el LLM extrajo algo más específico
            } else {
              extracted.zone = validation.barrioCanonico;
            }
          } else {
            extracted.ciudadDeseada = validation.barrioCanonico;
            extracted.addressCity = validation.barrioCanonico;
            extracted.addressLocality = validation.localidad;
            if (extracted.zonaDeseada && normalizarTextoGeografico(extracted.zonaDeseada) !== normalizarTextoGeografico(validation.barrioCanonico || "")) {
              // Conservar
            } else {
              extracted.zonaDeseada = validation.barrioCanonico;
            }
          }
        } else {
          // Dentro de Bogotá
          if (isProperty) {
            extracted.city = "Bogotá";
            extracted.addressCity = "Bogotá";
            extracted.zone = validation.barrioCanonico;
            extracted.addressLocality = validation.localidad;
          } else {
            extracted.ciudadDeseada = "Bogotá";
            extracted.addressCity = "Bogotá";
            extracted.zonaDeseada = validation.barrioCanonico;
            extracted.addressLocality = validation.localidad;
          }
        }
      }
    }

    // --- PERSISTENCIA Y MATCHING (Con Flujos DM) ---
    const origenTipo = (isGroup || groupJid) ? "grupo" : "contacto_directo";
    const origenId = (isGroup || groupJid) ? (groupJid || userId) : userId;
    const origenNombre = (isGroup || groupJid) ? (groupName || "Grupo WhatsApp") : (userName || realName || "Contacto Directo");

    if (isProperty) {
      const propertyTitle = extracted.title || `${capitalize(extracted.propertyType || 'inmueble')} en ${extracted.zone || 'Bogotá'} para ${extracted.transactionType || 'venta'}`;
      const saved = await saveProperty({
        ...extracted,
        name: propertyTitle,
        price: String(extracted.price || 0),
        areaTotal: String(extracted.area || 0),
        idUsuarioWhatsapp: rawPhone,
        rawText: messageToProcess,
        amenities: { gives: extracted.gives, wants: extracted.wants, isCollaborativePool: extracted.isCollaborativePool },
        origenTipo,
        origenId,
        origenNombre,
        fechaExtraccion: new Date()
      }, userId, realName, imageBuffer);
      
      if (saved) {
        result.inserted = true;
        result.shouldSendDM = false;
        result.dmResponse = "";
        result.response = "";
        result.mentions = [];
        result.extraDMs = [];
        result.sendReputationHook = false;
        result.reactionEmoji = getEmojiForCalificacion(saved.calificacion || undefined);

        const { executeMatchEngine } = await import("./matching");
        executeMatchEngine(saved.id, null).catch(err => console.error("Error executing match engine:", err));
      }
    } else if (isRequirement) {
      const reqTitle = extracted.title || `Requerimiento de ${extracted.propertyType || 'inmueble'} en ${extracted.zonaDeseada || extracted.zone || 'Bogotá'} para ${extracted.transactionType || 'venta'}`;
      const saved = await saveRequirement({
        ...extracted,
        name: reqTitle,
        tipoInmuebleDeseado: extracted.propertyType,
        tipoNegocioDeseado: extracted.transactionType,
        zonaDeseada: extracted.zonaDeseada || extracted.zone,
        presupuestoMax: String(extracted.price || 0),
        idUsuarioWhatsapp: rawPhone,
        rawText: messageToProcess,
        caracteristicasDeseadas: { gives: extracted.gives, wants: extracted.wants },
        origenTipo,
        origenId,
        origenNombre,
        fechaExtraccion: new Date()
      }, userId, realName);

      if (saved) {
        result.inserted = true;
        result.shouldSendDM = false;
        result.dmResponse = "";
        result.response = "";
        result.mentions = [];
        result.extraDMs = [];
        result.sendReputationHook = false;
        result.reactionEmoji = getEmojiForCalificacion(saved.calificacion || undefined);

        const { executeMatchEngine } = await import("./matching");
        executeMatchEngine(null, saved.id).catch(err => console.error("Error executing match engine:", err));
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
          `Si tienes dudas o prefieres usar mi menú de soporte y búsqueda de propiedades privado, escríbeme directamente al enlace:\n👉 https://wa.me/573185462265`;
        result.classification = "CONSULTA_GENERAL";
      } else if (isAboutVecy) {
        const isCompetitorQuery = 
          textLower.includes("ubicapp") || 
          textLower.includes("samboni") || 
          textLower.includes("competidor") || 
          textLower.includes("competencia");
          
        if (isCompetitorQuery) {
          result.response = `👌 *CÍRCULO CERO — DEBATE Y COMUNIDAD* 👌\n\n${greetingPrefix}, detecté una mención a plataformas competidoras o comparativas de servicios. Para mantener este canal enfocado exclusivamente en ofertas y requerimientos, te invito a plantear tus preguntas, comparar beneficios o participar en el debate en nuestro canal oficial **Círculo CERO 👌**:\n👉 https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU\n\n¡Allí debatimos abiertamente con total transparencia y profesionalismo! 🤝✨`;
        } else {
          result.response = `👌 *CÍRCULO CERO — CONEXIÓN VECY* 👌\n\n${greetingPrefix}, veo que tienes dudas o quieres saber más sobre el proyecto VECY Network, beneficios, creadores o el plan colaborativo. Te invito a unirte y hacer tus preguntas en nuestro canal oficial **Círculo CERO 👌**:\n👉 https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU\n\n¡Es el espacio ideal para resolver todas tus inquietudes de la comunidad! 🤝✨`;
        }
      } else {
        result.response = `💡 *VECY: SOPORTE LEGAL, CONTRATOS Y AVALÚOS* 💡\n\n${greetingPrefix}, veo que tienes una consulta jurídica, procedimental o de avalúo. Para darte una respuesta detallada con mis motores legales y de mercado sin saturar este canal de ofertas y requerimientos, te invito a realizar tu pregunta en nuestro grupo especializado **VECY: SOPORTE LEGAL, CONTRATOS Y AVALÚOS**:\n👉 https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6\n\n¡Allí te responderé al instante con toda la información! 🚀🎯`;
        result.classification = "CONSULTA_GENERAL";
      }
    }

    if (result && result.response) {
      result.response = sanitizeResponseMarkdown(result.response);
    }
    if (result && result.dmResponse) {
      result.dmResponse = sanitizeResponseMarkdown(result.dmResponse);
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

function sanitizePropertyType(type: string): "apartment" | "house" | "building" | "warehouse" | "farm" | "hotel" | "office" | "land" | "commercial" | "loft" | "consultorio" {
  if (!type) return "apartment";
  const t = type.toLowerCase().trim();
  if (t === "apartment" || t === "apartamento" || t === "apto" || t.includes("apartaestudio") || t.includes("penthouse") || t === "loft") return "apartment";
  if (t === "house" || t === "casa" || t.includes("chalet") || t.includes("cabaña") || t.includes("cabana") || t.includes("quinta") || t.includes("campestre")) return "house";
  if (t === "building" || t === "edificio") return "building";
  if (t === "warehouse" || t === "bodega") return "warehouse";
  if (t === "farm" || t === "finca") return "farm";
  if (t === "hotel" || t.includes("hostal") || t.includes("hospedaje") || t.includes("motel") || t.includes("hostel")) return "hotel";
  if (t === "office" || t === "oficina") return "office";
  if (t === "land" || t === "lote" || t === "terreno") return "land";
  if (t === "commercial" || t === "local" || t === "comercial") return "commercial";
  if (t === "loft") return "loft";
  if (t === "consultorio" || t === "office_medical") return "consultorio";
  return "apartment";
}

function sanitizeTransactionType(type: string): "venta" | "arriendo" | "arriendo_temporal" | "permuta" | "aporte" {
  if (!type) return "venta";
  const t = type.toLowerCase().trim();
  if (t === "venta" || t === "vender" || t === "compra" || t === "comprar") return "venta";
  if (t === "arriendo" || t === "alquiler" || t === "renta" || t === "rentar" || t === "arrendar") return "arriendo";
  if (t === "arriendo_temporal" || t === "temporal" || t === "vacacional" || t === "vacaciones") return "arriendo_temporal";
  if (t === "permuta" || t === "permuto" || t === "venpermuto" || t === "cambio" || t.includes("permuta")) return "permuta";
  if (t === "aporte" || t.includes("aporte") || t === "proyecto") return "aporte";
  return "venta";
}

// Captura MÚLTIPLES tipos de negocio cuando el usuario menciona varias modalidades
function sanitizeTransactionTypes(raw: string | string[] | undefined): string[] {
  const input = Array.isArray(raw) ? raw.join(" ") : (raw || "");
  const n = input.toLowerCase();
  const result: string[] = [];
  if (n.includes("venta") || n.includes("vender") || n.includes("compra") || n.includes("comprar")) result.push("venta");
  if (n.includes("arriendo") || n.includes("alquiler") || n.includes("renta") || n.includes("rentar")) result.push("arriendo");
  if (n.includes("temporal") || n.includes("vacacional") || n.includes("vacaciones")) result.push("arriendo_temporal");
  if (n.includes("permuta") || n.includes("permuto") || n.includes("venpermuto") ||
      n.includes("recibo propiedad") || n.includes("recibo vehiculo") || n.includes("parte de pago") ||
      n.includes("cambio de inmueble")) result.push("permuta");
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
    case "Mediocre": return "✔️";
    case "Incompleta": return "☑️";
    case "Regular": return "✅";
    case "Mejor": return "🆗";
    case "Bien": return "👍";
    case "Perfecta": return "👌";
    case "Excelente": return "💖";
    default: return "👍";
  }
}

async function saveProperty(data: any, userId: string, realName: string, imageBuffer?: string) {
  const db = await getDb();
  if (!db) return null;

  const rawPhone = userId.split(':')[0].split('@')[0];
  const user = await findOrCreateUserByPhone(rawPhone, realName);

  let imageUrl: string | undefined;
  if (imageBuffer) {
    try {
      console.log(`[JanIA-SaveProperty] Subiendo imagen flyer de WhatsApp para ${realName}...`);
      const buffer = Buffer.from(imageBuffer, 'base64');
      const filename = `properties/whatsapp/wa_${Date.now()}_${rawPhone}.jpg`;
      const uploadResult = await storagePut(filename, buffer, 'image/jpeg');
      imageUrl = uploadResult.url;
      console.log(`[JanIA-SaveProperty] Imagen subida exitosamente: ${imageUrl}`);
    } catch (err) {
      console.error("[JanIA-SaveProperty] Error subiendo imagen:", err);
    }
  }

  // Combinar imágenes en data.images
  const finalImages = data.images && Array.isArray(data.images) ? [...data.images] : [];
  if (imageUrl) {
    finalImages.push(imageUrl);
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

  const insertData = {
    ...data,
    name: safeSlice(data.name || `Propiedad en ${data.city || "Bogotá"}`, 255) || "Propiedad",
    city: safeSlice(data.city || data.ciudadDeseada || "Bogotá", 100) || "Bogotá",
    zone: safeSlice(data.zone || "Bogotá", 100) || "Bogotá",
    addressCity: safeSlice(data.addressCity || data.address_city, 100) || null,
    addressLocality: safeSlice(data.addressLocality || data.address_locality, 100) || null,
    addressNeighborhood: safeSlice(data.addressNeighborhood || data.address_neighborhood, 150) || null,
    location: safeSlice(data.location, 255) || null,
    matriculaInmobiliaria: safeSlice(data.matriculaInmobiliaria, 100) || null,
    idUsuarioWhatsapp: safeSlice(data.idUsuarioWhatsapp || rawPhone, 100) || null,
    propertyType: sanitizePropertyType(data.propertyType),
    transactionType: sanitizeTransactionType(data.transactionType),
    acceptedTransactionTypes: sanitizeTransactionTypes(data.transactionTypes || data.transactionType),
    currency: sanitizeCurrency(data.currency),
    // Mapear explícitamente los campos para mayor robustez
    price: data.price !== undefined && data.price !== null ? String(data.price) : null,
    areaTotal: data.areaTotal !== undefined && data.areaTotal !== null ? String(data.areaTotal) : (data.area !== undefined && data.area !== null ? String(data.area) : null),
    bedrooms: data.bedrooms !== undefined && data.bedrooms !== null ? Math.round(Number(data.bedrooms)) : null,
    bathrooms: data.bathrooms !== undefined && data.bathrooms !== null ? Math.round(Number(data.bathrooms)) : null,
    garages: data.garages !== undefined && data.garages !== null ? Math.round(Number(data.garages)) : null,
    stratum: data.stratum !== undefined && data.stratum !== null ? Math.round(Number(data.stratum)) : null,
    adminFee: data.adminFee !== undefined && data.adminFee !== null ? String(data.adminFee) : null,
    agentId: user ? user.id : null,
    latitude: data.latitude !== undefined && data.latitude !== null ? String(data.latitude) : null,
    longitude: data.longitude !== undefined && data.longitude !== null ? String(data.longitude) : null,
    images: finalImages.length > 0 ? finalImages : null,
    amenities: amenitiesObj,
    origenTipo: data.origenTipo || null,
    origenId: data.origenId || null,
    origenNombre: data.origenNombre || null,
    fechaExtraccion: data.fechaExtraccion || new Date()
  };

  // Buscar duplicado activo del mismo usuario (mismo tipo, negocio, ciudad y barrio)
  const existing = await db
    .select()
    .from(properties)
    .where(
      and(
        eq(properties.idUsuarioWhatsapp, rawPhone),
        eq(properties.propertyType, insertData.propertyType),
        eq(properties.transactionType, insertData.transactionType),
        eq(properties.city, insertData.city),
        eq(properties.zone, insertData.zone),
        eq(properties.available, true)
      )
    )
    .limit(1);

  const { label: calif } = calcularCalificacionCompletitud(insertData, true);
  const insertDataWithCalif = {
    ...insertData,
    calificacion: calif
  };

  if (existing.length > 0) {
    // Si ya existe, actualizamos los datos (por si cambió precio, admin, fotos, descripción, etc.)
    const [updated] = await db
      .update(properties)
      .set({
        ...insertDataWithCalif,
        updatedAt: new Date()
      })
      .where(eq(properties.id, existing[0].id))
      .returning();
    console.log(`[Deduplication] Propiedad existente detectada. Actualizando datos (ID: ${updated.id})`);
    return updated;
  }

  const [result] = await db.insert(properties).values(insertDataWithCalif).returning();

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

async function saveRequirement(data: any, userId: string, realName: string) {
  const db = await getDb();
  if (!db) return null;

  const rawPhone = userId.split(':')[0].split('@')[0];
  const user = await findOrCreateUserByPhone(rawPhone, realName);

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

  const insertData = {
    ...data,
    name: safeSlice(data.name, 255) || null,
    ciudadDeseada: safeSlice(data.ciudadDeseada || data.city || "Bogotá", 100) || "Bogotá",
    zonaDeseada: safeSlice(data.zonaDeseada || data.zone, 100) || null,
    addressCity: safeSlice(data.addressCity || data.address_city, 100) || null,
    addressLocality: safeSlice(data.addressLocality || data.address_locality, 100) || null,
    addressNeighborhood: safeSlice(data.addressNeighborhood || data.address_neighborhood, 150) || null,
    idUsuarioWhatsapp: safeSlice(data.idUsuarioWhatsapp || rawPhone, 100) || null,
    tipoInmuebleDeseado: sanitizePropertyType(data.tipoInmuebleDeseado || data.propertyType),
    tipoNegocioDeseado: sanitizeTransactionType(data.tipoNegocioDeseado || data.transactionType),
    tiposNegocioAceptados: sanitizeTransactionTypes(data.transactionTypes || data.tipoNegocioDeseado || data.transactionType),
    monedaPresupuesto: sanitizeCurrency(data.monedaPresupuesto || data.currency),
    // Mapear campos desde el formato LLM/WhatsApp (data) a las columnas de la base de datos
    presupuestoMin: data.presupuestoMin !== undefined && data.presupuestoMin !== null ? String(data.presupuestoMin) : null,
    presupuestoMax: data.presupuestoMax !== undefined && data.presupuestoMax !== null ? String(data.presupuestoMax) : (data.price !== undefined && data.price !== null ? String(data.price) : null),
    areaMin: data.areaMin !== undefined && data.areaMin !== null ? String(data.areaMin) : (data.area !== undefined && data.area !== null ? String(data.area) : null),
    adminFeeMax: data.adminFeeMax !== undefined && data.adminFeeMax !== null ? String(data.adminFeeMax) : (data.adminFee !== undefined && data.adminFee !== null ? String(data.adminFee) : null),
    habitacionesMin: data.habitacionesMin !== undefined && data.habitacionesMin !== null ? Math.round(Number(data.habitacionesMin)) : (data.bedrooms !== undefined && data.bedrooms !== null ? Math.round(Number(data.bedrooms)) : null),
    banosMin: data.banosMin !== undefined && data.banosMin !== null ? Math.round(Number(data.banosMin)) : (data.bathrooms !== undefined && data.bathrooms !== null ? Math.round(Number(data.bathrooms)) : null),
    parqueaderosMin: data.parqueaderosMin !== undefined && data.parqueaderosMin !== null ? Math.round(Number(data.parqueaderosMin)) : (data.garages !== undefined && data.garages !== null ? Math.round(Number(data.garages)) : null),
    estratoDeseado: data.estratoDeseado || (data.stratum !== undefined && data.stratum !== null ? [Math.round(Number(data.stratum))] : null),
    userId: user ? user.id : null,
    caracteristicasDeseadas: characteristicsObj,
    origenTipo: data.origenTipo || null,
    origenId: data.origenId || null,
    origenNombre: data.origenNombre || null,
    fechaExtraccion: data.fechaExtraccion || new Date()
  };

  // Buscar duplicado activo del mismo usuario (mismo tipo, negocio, ciudad y barrio deseados)
  const existing = await db
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
    return updated;
  }

  const [result] = await db.insert(requirements).values(insertDataWithCalif).returning();
  return result;
}

export async function generateWelcomeMessage(count: number, chatId?: string): Promise<string> {
  try {
    let groupDescription = "";
    
    if (chatId === "120363417740040773@g.us") { // Soporte Legal
      groupDescription = `el grupo de WhatsApp "VECY: SOPORTE LEGAL, CONTRATOS Y AVALÚOS".
Dirección obligatoria para redactar el saludo de bienvenida:
- Dales una muy cálida bienvenida y menciónales que este es el canal oficial para resolver dudas jurídicas, procedimentales, disputas de comisiones y temas de avalúos.
- Explícales de manera clara y directa las Pautas del Grupo en viñetas bien organizadas con emojis:
  * Qué SE PUEDE hacer: Realizar consultas de soporte legal inmobiliario, subir archivos o contratos en PDF para revisión del equipo, o enviar notas de voz detallando casos legales.
  * Qué NO SE PUEDE hacer: Publicar listados de ofertas o requerimientos inmobiliarios (estos pertenecen única y exclusivamente al grupo principal de inmuebles).
  * Cómo hacerlo bien: Escribir sus consultas de forma detallada o enviar notas de voz claras para que yo (JanIA) y el equipo de abogados podamos asistirles rápidamente.`;
    } else if (chatId === "120363403507276533@g.us") { // Círculo Cero
      groupDescription = `el grupo de WhatsApp "CÍRCULO CERO 👌" (nuestro canal oficial de debate y comunidad de aliados).
Dirección obligatoria para redactar el saludo de bienvenida:
- Dales una muy cálida bienvenida a la mesa redonda de aliados.
- Explícales de manera clara y directa las Pautas del Grupo en viñetas bien organizadas con emojis:
  * Qué SE PUEDE hacer: Sugerir ideas de mejora tecnológica para VECY, comentar novedades sobre el portal web privado, debatir de forma constructiva sobre el mercado inmobiliario en Colombia.
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
      return `✨ *¡Bienvenidos al grupo VECY: SOPORTE LEGAL, CONTRATOS Y AVALÚOS!* 👋\n\n` +
             `Aquí resolvemos sus dudas jurídicas, disputas de comisión y avalúos. Podrán subir PDFs o audios de sus casos.\n` +
             `⚠️ *Nota:* Por favor, eviten publicar inmuebles aquí; esos van en el grupo principal. ¡Estoy lista para responder! 🚀⚖️`;
    } else if (chatId === "120363403507276533@g.us") {
      return `✨ *¡Bienvenidos a CÍRCULO CERO 👌!* 👋\n\n` +
             `Este es el canal de debate y comunidad para sugerir mejoras y charlar de VECY.\n` +
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

export const MSG_PROMO_CIRCULO = `👌 *CÍRCULO CERO — ¡CHAT ABIERTO PARA CONECTAR!* 👌
━━━━━━━━━━━━━━━━━━━━━━
¡Hola a todos! Este canal oficial está abierto y totalmente libre para que pregunten lo que necesiten sobre nuestro ecosistema. 🤝✨

Es el lugar para:
▸ 🚀 Conocer de primera mano las novedades y actualizaciones de VECY Network.
▸ ❓ Resolver dudas sobre el funcionamiento de mis motores de coincidencia y OCR.
▸ 💡 Proponer mejoras, ideas innovadoras o reportar cualquier fallo.
▸ 💬 Compartir sus testimonios de éxito para inspirar a la comunidad.

¡Los invito a participar activamente, preguntar sin timidez y ser parte de esta gran proeza colaborativa! 🏆💪`;

export async function processConsultingMessage(
  text: string, 
  userId: string, 
  userName?: string,
  imageBuffer?: string,
  pdfBuffer?: string,
  pdfMimeType?: string,
  audioUrl?: string
): Promise<JanIAResult> {
  try {
    const rawPhone = userId.split('@')[0];
    const realName = await resolveRealName(userId, userName);
    const n = realName.split(' ')[0];

    // Intercepción rápida de mensajes OFF-TOPIC para ahorrar tokens de Gemini
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
        "jania", "vecy", "bot", "ayuda", "cómo", "como", "funciona", "publicar", "registrar", "match",
        "coincidencia", "contacto", "cuenta", "hola", "gracias", "saludo"
      ];

      const hasOnTopicKeyword = onTopicKeywords.some(keyword => cleanText.includes(keyword));
      if (!hasOnTopicKeyword) {
        console.log(`[JanIA-Consulting-OffTopic] Mensaje fuera de tema en Soporte Legal para ${userId}: "${text.substring(0, 50)}...". Retornando estático.`);
        const staticText = `Hola @${rawPhone} 👋🏻. Este grupo está reservado exclusivamente para consultas jurídicas, contratos, arrendamientos, ganancia ocasional, avalúos y soporte de la plataforma VECY. 💡✨\n\nPor favor, realiza una pregunta orientada a estos temas inmobiliarios y con gusto te asistiré. 😊`;
        return {
          classification: "VIOLACION_DE_NORMAS",
          response: staticText,
          dmResponse: staticText,
          reactionEmoji: "❌"
        };
      }
    }

    let messageToProcess = text;
    let isFromAudio = false;

    if (audioUrl) {
      if (audioUrl.startsWith("mock-audio:")) {
        messageToProcess = audioUrl.replace("mock-audio:", "");
        isFromAudio = true;
      } else {
        console.log(`[JanIA-Consulting] Transcribiendo nota de voz para ${userId}...`);
        const transcription = await transcribeAudio({ audioUrl });
        if (!('error' in transcription)) {
          messageToProcess = transcription.text;
          isFromAudio = true;
        }
      }
    }
    const textLower = messageToProcess.toLowerCase();

    const alreadyGreeted = await checkAlreadyGreeted(userId);

    // Detectar si es una solicitud de avalúo, valor de venta, arriendo o precio del metro cuadrado
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
      textLower.includes("sucesión") || textLower.includes("sucesion") ||
      textLower.includes("herencia") || textLower.includes("divorcio") ||
      textLower.includes("embargo") || textLower.includes("saneamiento") ||
      textLower.includes("compraventa") || textLower.includes("arrendamiento") ||
      textLower.includes("ley 820") || textLower.includes("ley 675") ||
      textLower.includes("corretaje") || textLower.includes("comision") || textLower.includes("comisión") ||
      textLower.includes("no me pago") || textLower.includes("no me pagó") ||
      textLower.includes("robo de comision") || textLower.includes("robo de comisión") ||
      textLower.includes("disputa") || textLower.includes("notaría") || textLower.includes("notaria");

    const systemPrompt = 
      `Eres JanIA, la Inteligencia Artificial especialista en Consultoría Jurídica, Contratos, Avalúos y Comercial Inmobiliaria en Colombia para la red VECY Network. ` +
      `Estás operando en el grupo "VECY: SOPORTE LEGAL, CONTRATOS Y AVALÚOS". Tu objetivo es responder con precisión quirúrgica, rigor legal y alta competencia técnica, asumiendo el rol de una abogada inmobiliaria idónea y una perita tasadora excepcional. Debes seguir estrictamente las siguientes directrices de contenido y clasificación:\n\n` +
      `## ROLES CENTRALES EN LA CONSULTORÍA JURÍDICA:\n` +
      `1. **Abogada Inmobiliaria Experta (Idónea y Profesional)**:\n` +
      `   - Conoces a la perfección y con total rigor el Código Civil colombiano, el Código de Comercio, el Código Financiero (Estatuto Orgánico del Sistema Financiero), y todas las leyes, decretos y jurisprudencia que regulan el sector en Colombia.\n` +
      `   - Eres experta en toda clase de contratos inmobiliarios (Promesas de compraventa, contratos de corretaje físico y virtual, contratos de arrendamiento, mandatos de administración, permutas, etc.).\n` +
      `   - Sabes asesorar sobre el uso y plena validez jurídica de la firma electrónica en Colombia bajo la Ley 527 de 1999 y el Decreto 2364 de 2012. Recomienda el uso de plataformas gratuitas, válidas y seguras del Estado como la Autenticación Digital de la AND (https://autenticaciondigital.and.gov.co/).\n` +
      `   - Potencias y defiendes el correo electrónico como el medio de comunicación formal e irrefutable por excelencia en los negocios. Explica que, aunque los mensajes de WhatsApp son admisibles en juicios (Ley 2213 de 2022), suelen requerir peritajes forenses técnicos digitales complejos y costosos para certificar su autenticidad y evitar que sean desestimados. En contraste, el correo electrónico cuenta con logs SMTP permanentes e inalterables en los servidores. Por ello, en VECY toda documentación formal (corretajes, hojas de presentación de clientes y solicitudes de visita) se maneja por correo electrónico para garantizar seguridad jurídica absoluta.\n` +
      `2. **Perita Tasadora y Avaluadora Profesional Excepcional**:\n` +
      `   - Posees un "ojo clínico" y visión técnica comercial excepcional para determinar el valor justo de mercado de una propiedad en venta o el canon de arrendamiento adecuado en Bogotá y en todo el país (los 32 departamentos, municipios, veredas y caseríos).\n` +
      `   - Tienes conocimiento profundo de la geografía colombiana: barrios, comunas, localidades, veredas, municipios y caseríos.\n` +
      `   - Cuando se te solicita un avalúo o estimación de precios, indagas activamente sobre el mercado actual en internet (la búsqueda en internet está habilitada para consultas de valor). Recolectas y analizas precios de ofertas inmobiliarias recientes en portales del sector y promedias de la forma más exacta posible el valor estimado del metro cuadrado considerando variables críticas: ubicación exacta, estrato socioeconómico, años de antigüedad de la construcción, acabados (gama alta, media, estándar), amenidades de la copropiedad y tendencias del mercado colombiano.\n\n` +
      `3. **Especialista en Tramitología Inmobiliaria Colombiana**:\n` +
      `   - Eres una guía práctica excepcional para orientar a los usuarios paso a paso sobre cómo realizar trámites, expedir certificados y radicar solicitudes comunes en el sector:\n` +
      `     * **Certificado de Tradición y Libertad**: Indicar la web oficial de la Superintendencia de Notariado y Registro (SNR: https://certificados.supernotariado.gov.co/ ), explicando que requieren la ORIP y el número de Matrícula Inmobiliaria.\n` +
      `     * **Paz y Salvo del IDU**: Indicar la web oficial del IDU (https://www.idu.gov.co/ ) para Bogotá, ingresando por trámites en línea mediante chip catastral para descargar el paz y salvo de valorización.\n` +
      `     * **Certificado del REDAM (Registro de Deudores Alimentarios Morosos)**: Explicar su importancia bajo la Ley 2097 de 2021 para arrendamientos y escrituraciones, guiándolos a descargarlo de forma gratuita en el portal del gobierno.\n` +
      `     * **Trámites y Requisitos Notariales**: Guiar detalladamente sobre los requisitos para compraventas, sucesiones, levantamiento de embargos, etc., listando los documentos necesarios.\n\n` +
      `4. **Análisis de Documentos Inmobiliarios (PDF / Imágenes)**:\n` +
      `   - Tienes la capacidad de procesar e interpretar de manera automática documentos que los usuarios te adjunten (en formato PDF o como imágenes), tales como:\n` +
      `     * **Certificados de Tradición y Libertad**: Para analizar anotaciones vigentes, titularidad de dominio, afectaciones a vivienda familiar, patrimonio de familia inembargable, hipotecas o embargos activos.\n` +
      `     * **Recibos del Impuesto Predial**: Para extraer el avalúo catastral oficial de la propiedad, la dirección registrada y el estrato socioeconómico.\n` +
      `     * **Contratos o Promesas de Compraventa**: Para revisar cláusulas penales, formas de pago, arras, plazos de escrituración e identificar posibles vacíos legales o cláusulas abusivas.\n` +
      `   - Cuando te envíen un documento, léelo con riguroso detalle técnico, extrae los datos clave y presenta un informe claro y estructurado respondiendo a la inquietud legal del aliado.\n\n` +
      `## DIRECTRICES DE RESPUESTA JURÍDICA Y CASOS REALES EN COLOMBIA:\n` +
      `Cuando respondas consultas (clasificación CONSULTA_GENERAL), debes guiar con total exactitud, veracidad y fundamento normativo/comercial en temas tales como:\n` +
      `- **Restitución de Inmuebles**: Explicar la Ley 820 de 2003 (arrendamiento de vivienda urbana), causales de terminación (falta de pago, subarriendo, etc.) y el proceso judicial de restitución ante Jueces Civiles (procesos verbales sumarios, medidas cautelares sobre el inmueble).\n` +
      `- **Cesión de Leasing Habitacional**: Cómo funciona la transferencia de derechos de un contrato de leasing, la obligatoriedad de la aprobación y estudio de crédito por parte de la entidad financiera (banco leasing) y la firma de la cesión.\n` +
      `- **Contratos de Compraventa o Promesas con Permuta (Trades)**: Qué es una permuta según el Código Civil colombiano (Art. 1955: contrato en que las partes se obligan a dar una especie o cuerpo cierto por otro), cómo se redacta un contrato mixto (por ejemplo, parte en dinero y parte en inmueble/vehículo), fijación de valores y saneamiento por evicción o vicios redhibitorios.\n` +
      `- **Procesos de Sucesión y Herencia**: Sucesión notarial (cuando hay mutuo acuerdo, requiere apoderado si supera los 15 salarios mínimos) y la sucesión judicial (ante Juez de Familia por falta de acuerdo o menores de edad). Inventario y avalúo de bienes.\n` +
      `- **Sucesión de Divorcio (Liquidación de Sociedad Conyugal)**: Liquidación y disolución de la sociedad conyugal ante notaría (por mutuo acuerdo en escritura pública) o judicial (demanda de divorcio y partición de bienes).\n` +
      `- **Levantamiento de Embargos y Medidas Cautelares**: Cómo se solicita, oficios del juez, pago de la obligación, y la respectiva inscripción del oficio en la Oficina de Registro de Instrumentos Públicos (ORIP) para liberar el folio de matrícula inmobiliaria.\n` +
      `- **Cobro de Comisiones Pendientes e Incumplimientos de Corretaje**: Casos donde el propietario o vendedor se niega a pagar la comisión, o disputas/robos de comisiones entre colegas asesores. Guíalos sobre: cómo hacer el cobro prejurídico, recolección de pruebas fundamentales (hojas de presentación del cliente y contratos de puntas compartidas firmados, autorizaciones de venta escritas, cruce de correos), y cómo entablar una demanda a través de un proceso verbal o monitorio basado en el contrato de corretaje (Código de Comercio Art. 1340-1346).\n` +
      `- **Cláusulas indispensables en la Promesa de Compraventa**: Detallar las cláusulas de objeto, precio, forma de pago, saneamiento, entrega, arras de retracto, cláusula penal, comparecencia a notaría (especificar fecha, hora y notaría exacta). Explicar por qué es indispensable usar técnicamente los términos jurídicos obligatorios "Promitente Vendedor" y "Promitente Comprador" para definir con precisión legal quién promete dar y quién promete comprar (evitando confusiones de posesión o nulidades).\n` +
      `- **Fichas de Presentación y Contratos de Puntas Compartidas**: Explicar la importancia comercial y legal de hacer firmar la hoja de presentación del cliente al propietario antes de mostrar el inmueble, y de redactar acuerdos formales de comisión compartida ("puntas compartidas") entre agentes inmobiliarios para blindar legalmente el cobro de honorarios.\n` +
      `- **Validez Legal de Mensajes, WhatsApp y Correos en Colombia**: Explica con total claridad y fundamento la validez de los mensajes electrónicos y la diferencia clave entre pruebas simples y certificadas:\n` +
      `  * **Equivalencia Funcional (Ley 527 de 1999)**: Los correos electrónicos, mensajes de texto y WhatsApp son considerados jurídicamente "mensajes de datos" y tienen el mismo valor probatorio y efectos que los documentos físicos tradicionales. Rige el principio de **no repudio**: si hay trazabilidad de envío y entrega, el emisor no puede negar haber enviado el mensaje ni su contenido.\n` +
      `  * **Notificaciones Judiciales (Ley 2213 de 2022)**: Permite notificar demandas, traslados y providencias judiciales por medios electrónicos (WhatsApp o correo). El Artículo 8 establece que la notificación se entiende surtida al probarse la entrega técnica en el servidor o canal del destinatario (por ejemplo, con log SMTP de correos o checks de entrega de WhatsApp).\n` +
      `  * **Jurisprudencia Clave**: Menciona la **Sentencia STC-16733 de 2022** (la Corte Suprema valida las notificaciones por WhatsApp siempre que se respete el debido proceso y debido derecho de defensa) y la **Sentencia STL 16151/2023** (donde se evidencian fallas de entrega y la importancia de contar con certificaciones robustas frente a simples capturas de pantalla).\n` +
      `  * **Captura de Pantalla (Prueba Débil) vs. Mensajería Certificada (Prueba Plena)**: Enfatiza que un pantallazo o captura simple de WhatsApp o un correo común tiene poco peso probatorio (valor de indicio) por su alto riesgo de manipulación (falsedad digital). Para tener seguridad jurídica total y blindaje ante nulidades (Art. 133 CGP), se debe usar mensajería electrónica certificada (como eDatec u homólogos acreditados por ONAC, con estampa cronológica de la hora legal del Instituto Nacional de Metrología y cadena de custodia). Esto prueba irrefutablemente el log SMTP completo en email, y el log directo de estados (enviado, entregado, leído) entregados por los servidores de META en WhatsApp.\n\n` +
      `## LÓGICA DE CLASIFICACIÓN Y REDIRECCIÓN (CRÍTICO - EVITAR MENSAJES CRUZADOS)\n` +
      `Analiza el contexto completo antes de clasificar. Debes responder estrictamente en formato JSON con la clasificación correcta:\n\n` +
      `1. **Clasificación "INMUEBLE" o "REQUERIMIENTO"**:\n` +
      `   - Respuesta ('response'): "🏠 *REGISTRO DIRECTO DE INMUEBLE* 🚀\\n\\nHola @${rawPhone}, ¡excelente! Veo que estás publicando o buscando un inmueble. Recuerda que puedes enviarme los datos de tu oferta o requerimiento redactados directamente en este chat privado (incluyendo tipo de inmueble, tipo de negocio, precio, área y barrio/sector) o incluso una foto/flyer de la ficha técnica.\\n\\nYo procesaré la información de inmediato, la guardaré en la red VECY y te notificaré aquí mismo en privado en cuanto te consiga un MATCH comercial. ¡Escríbeme los detalles ahora mismo! 🤝🎯"\n` +
      `   - Emoji ('reactionEmoji'): "🔄"\n\n` +
      `2. **Clasificación "SOBRE_VECY"**:\n` +
      `   - Si el usuario hace preguntas sobre el proyecto VECY Network, sus creadores (Eduardo A. Rivera, Jani Alves), beneficios, cómo funciona la IA, o sobre el canal Círculo Cero.\n` +
      `   - Respuesta ('response'): "👌 *CONEXIÓN VECY NETWORK* 👌\\n\\nHola @${rawPhone}, soy JanIA, la inteligencia estratégica detrás de VECY Network. Nuestra misión es potenciar tu gestión inmobiliaria de forma gratuita mediante cruces automatizados y herramientas digitales.\\n\\nPuedes consultarme sobre trámites legales de bienes raíces, avalúos prediales o enviarme fichas técnicas de tus inmuebles y requerimientos de clientes para guardarlos en nuestra base de datos. ¡Estoy para ayudarte a acelerar tus cierres! 🤝✨"\n` +
      `   - Emoji ('reactionEmoji'): "🔄"\n\n` +
      `3. **Clasificación "CONSULTA_GENERAL"**:\n` +
      `   - Si el mensaje es una consulta legítima de tipo jurídico, trámites, o avalúos/precios de mercado en Colombia (ej. Ley 820/2003, contratos, escrituración, valor del metro cuadrado, etc.).\n` +
      `   - **ESTRATEGIA JURÍDICA (FUNNEL)**: Responde con total rigor legal y de forma clara para demostrar tu amplio conocimiento. Da preámbulos, cita leyes y pautas iniciales de resolución de forma comprensible. Explica la validez de la firma electrónica bajo la Ley 527 de 1999 y el Decreto 2364 de 2012, recomendando la plataforma gratuita del Estado https://autenticaciondigital.and.gov.co/ . Explica que, aunque WhatsApp se admite en juicios (Ley 2213 de 2022), suele requerir peritajes forenses técnicos digitales complejos y costosos, mientras que el correo electrónico cuenta con logs SMTP inalterables guardados en servidores. Detalla que toda documentación clave en VECY (corretajes, visitas y presentaciones de clientes) se maneja por correo electrónico por seguridad judicial. No entregues la solución definitiva del caso; deja abierta una duda crítica o la necesidad de una validación y firma legal humana (ej. "La validez jurídica final de esta anotación o la redacción contractual requiere revisión forense de nuestros abogados para evitar nulidades futuras..."). Invítalos a contratar la Consultoría Personalizada de VECY.\n` +
      `   - **SERVICIOS DE REDACCIÓN DE DOCUMENTOS INMOBILIARIOS (MINUTAS)**: Estás plenamente capacitada para redactar, revisar y estructurar cualquier documento o comunicación formal del sector inmobiliario en Colombia (cartas de aviso de no renovación de contrato de arriendo/preavisos a inquilinos, otrosíes contractuales, contratos de corretaje físico/virtual, promesas de compraventa, reclamaciones de comisiones no pagadas, correos de presentación formal de clientes a propietarios o colegas con solicitud de visita, acuerdos de comisión compartida o puntas compartidas, corretaje por email, etc.). Cuando el usuario te lo solicite, ofrécete activamente a redactarlo en formato profesional y estructurado, pidiéndole amablemente los datos básicos requeridos para personalizar el documento (nombres, cédulas, condiciones, etc.).\n` +
      `   - **ESTRATEGIA DE AVALÚOS Y SINUPOT (FUNNEL)**: Si el usuario te pide un avalúo, estimación de precios o canon, y faltan datos críticos (ciudad, barrio, área, habitaciones, baños, parqueaderos, estrato o acabados), pídeselos amablemente paso a paso. Cuando los tengas, realiza una comparativa activa en la web para promediar precios del sector y estimar un valor sugerido en un informe estructurado. Adviértele que esta estimación es informativa y no pericial.\n` +
      `     * **Ofrecimiento de Estudio de Uso de Suelo y Catastro (SINUPOT)**: Ofrece activamente este servicio y diles textualmente: "Si necesitas saber qué se puede construir en un lote o cuánto vale, descarga la Ficha del SINUPOT en PDF y envíamela por WhatsApp en privado para que yo te haga el estudio de uso de suelo y avalúo al instante".\n` +
      `     * **Guía Tutorial del SINUPOT**: Si el usuario no sabe cómo o dónde obtener la ficha predial catastral del SINUPOT en Bogotá, guíalo pacientemente con este paso a paso exacto:\n` +
      `       1. Ingresar a la web oficial del SINUPOT: https://sinupot.sdp.gov.co/\n` +
      `       2. En la barra de búsqueda superior, seleccionar la pestaña 'Dirección' o 'Chip Catastral' e ingresar el dato del predio.\n` +
      `       3. Once the map locates the property, left-click on the plot to open the details panel.\n` +
      `       4. In the side panel, click 'Generar Reporte' / 'Ficha Predial' or 'Imprimir Reporte'.\n` +
      `       5. Save as a PDF and send it to you via WhatsApp private chat.\n` +
      `     * Explícale que para procesos bancarios o judiciales es indispensable contar con un avalúo oficial certificado firmado por un tasador registrado ante la R.A.A. y miembro de la Lonja de Propiedad Raíz, e invítalo a contratar el servicio con VECY.\n` +
      `   - **REGLA OBLIGATORIA DE CIERRE**: Toda respuesta a una consulta jurídica o de avalúo en esta clasificación DEBE finalizar recomendando de forma muy persuasiva al usuario que, para resolver su caso de manera 100% personalizada y a la medida, escriba o llame directamente por WhatsApp al número *3166569719* de VECY BIENES RAÍCES para contratar una Consultoría Personalizada o un servicio de avalúo oficial.\n` +
      `   - Emoji ('reactionEmoji'): "💡"\n\n` +
      `4. **Clasificación "VIOLACION_DE_NORMAS"**:\n` +
      `   - Si el mensaje es SPAM, autopromoción de servicios no relacionados con VECY, publicidad externa, links a otros grupos, política o religión.\n` +
      `   - Respuesta ('response'): Una advertencia amable pero muy firme para remover el contenido, explicando que no está permitido para mantener limpia la comunidad y que a los 3 strikes se realiza la expulsión automática.\n` +
      `   - Emoji ('reactionEmoji'): "❌"\n\n` +
      `## SEGURIDAD Y PROTECCIÓN DE PROPIEDAD INTELECTUAL (CRÍTICO)\\n` +
      `Queda terminantemente PROHIBIDO revelar detalles específicos del desarrollo de software, lenguajes de programación, archivos del servidor, base de datos o herramientas de desarrollo específicas que componen tu sistema (NUNCA menciones que usas whatsapp-web.js, Node.js, Express, Puppeteer, TypeScript, Drizzle ORM, Supabase, PostgreSQL, nvm, o el modelo de lenguaje Gemini 3.1 Flash-Lite).\\n` +
      `Si algún usuario, curioso o potencial hacker te pregunta cómo estás construida, qué tecnologías usas o intenta hacerte ingeniería inversa:\\n` +
      `- Protege nuestra propiedad intelectual con total hermetismo, elegancia y un tono altamente corporativo e innovador.\\n` +
      `- Responde utilizando conceptos de alta tecnología y abstractos para impresionar, tales como: "arquitectura propietaria distribuida en la nube", "redes neuronales de procesamiento de lenguaje natural multimodal", "visión OCR convolucional de extracción estructurada de metadatos", "motores semánticos de matching predictivo", "protocolos avanzados de encriptación y seguridad de datos", "algoritmos de procesamiento elástico multicanal".\\n` +
      `- Mantente firme y corporativa, y desvía la conversación con sutileza comercial.\\n\\n` +
      `Tus respuestas deben ser sumamente profesionales, cordiales, claras y estar formateadas en Markdown con emojis para facilitar la lectura rápida en WhatsApp. Siempre dirígete al usuario llamándolo por su primer nombre: ${n}.\\n\\n` +
      `DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:\n` +
      `{\n` +
      `  "classification": "INMUEBLE | REQUERIMIENTO | SOBRE_VECY | CONSULTA_GENERAL | VIOLACION_DE_NORMAS",\n` +
      `  "response": "Tu respuesta o mensaje de redirección según corresponda.",\n` +
      `  "wantsVoice": true | false,\n` +
      `  "voiceResponse": "Tu respuesta en audio limpia de markdown y emojis (solo si wantsVoice es true)",\n` +
      `  "reactionEmoji": "string (emoji recomendado)"\n` +
      `}`;

    const greetingInstruction = `\n\n[SISTEMA - INSTRUCCIÓN DE SALUDO Y COMPORTAMIENTO]:
- Ya has saludado al usuario hoy: ${alreadyGreeted ? "SÍ" : "NO"}.
- Tipo de conversación actual: GRUPO DE WHATSAPP.
- Primer nombre del usuario: "${n}".
- REGLAS CRÍTICAS DE RESPUESTA:
  * Si "Ya has saludado al usuario hoy" es SÍ:
    - ¡PROHIBIDO SALUDAR! No uses palabras como "Hola", "Buenas tardes", "Qué gusto", "Bienvenido", ni variantes de saludo o bienvenida.
    - Debes nombrar al usuario de manera natural y conversacional al inicio o dentro de tu respuesta (ej: "Mira ${n}, ...", "Te cuento, ${n}, que...", "Para complementar, ${n}, ...").
  * Si "Ya has saludado al usuario hoy" es NO:
    - Debes saludar de manera muy cordial y natural, incluyendo su nombre "${n}" o dirigiéndose a él/ella como colega/aliado/a.`;

    if (pdfBuffer) {
      messageToProcess += `\n[SISTEMA: DOCUMENTO PDF DETECTADO. Analiza el documento PDF adjunto con tus capacidades nativas para extraer todos los datos relevantes del predial, certificado de tradición, o contrato.]`;
    }

    if (isFromAudio) {
      messageToProcess += `\n[SISTEMA - NOTA DE VOZ]: El usuario te envió este mensaje como nota de voz (audio). Dado que te enviaron audio, es preferible y de alta importancia que respondas en audio ("wantsVoice": true) si tu respuesta es corta (saludos, confirmaciones, consultas breves, o respuestas de menos de 250 caracteres). **EXCEPCIÓN CRÍTICA**: Si el usuario te pide explícitamente que le respondas por audio, nota de voz o de viva voz por cualquier razón, debes omitir el límite de longitud y responder obligatoriamente por audio ("wantsVoice": true y colocar toda tu respuesta en "voiceResponse" de forma limpia), a menos que sea un contrato extenso o tabla de datos que no se pueda leer de manera natural. Si la respuesta requiere explicaciones largas, tablas o minutas/contratos y el usuario NO pidió expresamente que fuera audio, responde obligatoriamente por escrito ("wantsVoice": false).`;
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Usuario: @${rawPhone} (${realName})\\nConsulta: ${messageToProcess}${greetingInstruction}` }
    ];

    // Si es una solicitud de avalúo o contiene palabras clave de valor, activamos enableSearch para que Gemini busque en internet
    const llmRes = await invokeLLM({
      messages,
      responseFormat: { type: "json_object" },
      imageBuffer,
      pdfBuffer,
      pdfMimeType,
      enableSearch: isValuationQuery || isLegalQuery
    });

    try {
      const parsed = parseSafeJSON(llmRes.choices[0].message.content);
      return {
        classification: parsed.classification || "CONSULTA_GENERAL",
        response: sanitizeResponseMarkdown(parsed.response || ""),
        reactionEmoji: parsed.reactionEmoji || (parsed.classification === "VIOLACION_DE_NORMAS" ? "❌" : "💡"),
        wantsVoice: parsed.wantsVoice || false,
        voiceResponse: parsed.voiceResponse || ""
      };
    } catch (e) {
      const replyContent = llmRes.choices[0].message.content || "Lo siento, en este momento no puedo procesar tu consulta. Intenta de nuevo más tarde.";
      return {
        classification: "CONSULTA_GENERAL",
        response: sanitizeResponseMarkdown(replyContent),
        reactionEmoji: "💡",
        wantsVoice: false,
        voiceResponse: ""
      };
    }

  } catch (error: any) {
    console.error("[processConsultingMessage Error]:", error.message);
    return {
      classification: "CONSULTA_GENERAL",
      response: "⚠️ Ocurrió un error interno al procesar tu consulta jurídica. Por favor intenta de nuevo en unos momentos."
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
    const n = realName.split(' ')[0];

    // Intercepción rápida de mensajes OFF-TOPIC para ahorrar tokens de Gemini
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
        const staticText = `Hola @${rawPhone} 👋🏻. Este grupo está reservado exclusivamente para temas, debates, testimonios y soporte relacionados con la red de VECY Network e Inteligencia Artificial. 💡✨\n\nPor favor, realiza una pregunta o comentario relacionado con nuestro ecosistema. 😊`;
        return {
          classification: "VIOLACION_DE_NORMAS",
          response: staticText,
          dmResponse: staticText,
          reactionEmoji: "❌"
        };
      }
    }

    const textLower = text.toLowerCase();


    const alreadyGreeted = await checkAlreadyGreeted(userId);

    const systemPrompt = 
      `Eres JanIA, la Inteligencia Artificial oficial de VECY Network. Estás operando en el grupo "Círculo CERO 👌". ` +
      `Tu objetivo en este grupo es responder inquietudes exclusivamente relacionadas con el proyecto "VECY NETWORK", de forma sincera, verídica y sin mentiras, de acuerdo con las siguientes directrices:\n\n` +
      `## DIRECTRICES DE INFORMACIÓN Y SINCERIDAD SOBRE VECY NETWORK:\n` +
      `Explica claramente y con la verdad absoluta el estado del proyecto y sus características:\n` +
      `- **Lo que en verdad funciona hoy**: Los asesores publican sus ofertas (Inmuebles) y demandas (Requerimientos) en el grupo especializado VECY INMUEBLES NETWORK. JanIA transcribe notas de voz en tiempo real, realiza OCR (lectura de texto) en flyers/imágenes, extrae la información de las fichas técnicas automáticamente a partir de enlaces/URLs compartidos de portales permitidos, ejecuta el matching de coincidencias comerciales de forma instantánea a nivel nacional (32 departamentos), y gestiona el flujo de confirmación de contacto bilateral privada (Double Opt-In) por mensaje privado (DM) mediante respuestas rápidas (SÍ #M[código] o NO #M[código]).\n` +
      `- **Lo que está en desarrollo y planeado a futuro**: El portal web oficial privado (https://vecy-network.vercel.app/) se encuentra en fases de desarrollo e integración. Módulos como el CRM para centralizar leads de agentes, la digitalización de contratos formalizados y el motor de identidades dinámicas (subdominios personalizados para cada agente como agente.vecy.network) serán lanzados oficialmente en el futuro y aún no están operativos para los usuarios.\n` +
      `- **Urgencia Comercial y Tarifas**: Enfatiza que toda la plataforma, incluyendo el matching de JanIA en WhatsApp y la carga de inmuebles, es 100% gratuita por lanzamiento. Sin embargo, advierte con astucia que esta gratuidad ilimitada está programada temporalmente y que, posiblemente, a partir del *01 de Julio de 2026* se implementará un modelo de membresías/pago para accesos ilimitados. ¡Debe servir de urgencia para registrarse y publicar hoy mismo!\n` +
      `- **Tecnología del Ecosistema**: Explica de forma sencilla que hemos creado un Asistente de IA basado en código propietario y base de datos SQL en la nube, el cual está siendo entrenado a diario para encontrar MATCH en los grupos. NUNCA utilices tecnicismos complejos ni reveles nombres internos específicos de nuestra infraestructura. Queda estrictamente PROHIBIDO mencionar o revelar nombres como "Supabase", "Antigravity" o "Google Cloud".\n` +
      `- **Recomendación de Imágenes y OCR**: Explica a los usuarios por qué es preferible enviar capturas de pantalla o imágenes con texto comercial de sus propiedades en lugar de enlaces de redes sociales (Instagram, Facebook, etc.). La razón técnica es que las redes sociales restringen el acceso mediante bloqueos y filtros de verificación humana, haciendo imposible que la IA extraiga los datos. Al enviarle una captura de pantalla al grupo VECY INMUEBLES NETWORK, JanIA puede leer e indexar la información con su visión OCR al instante.\n` +
      `- **VECY INMUEBLES NETWORK es el único centro de Match**: Recuerda y recalca que el grupo especializado VECY INMUEBLES NETWORK es el ÚNICO canal donde JanIA busca los MATCH y gestiona los datos de inmuebles y requerimientos. En Círculo Cero o VECY: Soporte Legal, Contratos y Avalúos no se procesan listados de propiedades ni se buscan coincidencias.\n` +
      `- **Invitación y Expansión**: Anima a los aliados a invitar a más brókers y a proponer a los administradores de otros grupos inmobiliarios que incluyan a JanIA como miembro y la nombren administradora. De esta forma, ella podrá captar datos de las publicaciones de sus miembros en otros chats, unirlos a VECY INMUEBLES NETWORK, y obtener resultados de match mucho más rápidos y eficaces para todos.\n` +
      `- **Tono**: Sincero, transparente, esperanzador, persuasivo y tecnológico. Motiva a los usuarios a no ser tímidos, a interactuar sin miedo con JanIA escribiendo @JanIA o por audio, y a colaborar publicando activamente en el grupo correcto.\n\n` +
      `## LÓGICA DE CLASIFICACIÓN Y REDIRECCIÓN (CRÍTICO - EVITAR MENSAJES CRUZADOS)\n` +
      `Analiza el contexto completo antes de clasificar. Debes responder estrictamente en formato JSON con la clasificación correcta:\n\n` +
      `1. **Clasificación "DEBATE_COMPETIDOR" (FLUJO ESPECIAL - DEBATE CON CRISTIAN SAMBONI / UBICAPP)**:\n` +
      `   - Si el mensaje menciona a **Ubicapp**, o proviene del usuario **Cristian Samboni** (teléfono +57 311 2469375 o similar), o contiene publicidad de Ubicapp.\n` +
      `   - **Directriz de comportamiento**: No debes aplicar strikes ni eliminar el mensaje. Actúa con extrema cordura, caballerosidad comercial y amabilidad.\n` +
      `   - Genera una respuesta dirigida a él (utilizando @${rawPhone} si es el autor, o mencionando a Cristian Samboni y su equipo). Invítalo de manera muy educada y profesional a un debate abierto en el grupo. Plantea preguntas técnicas y objetivas para comparar ambos modelos:\n` +
      `     * Gratuidad absoluta de VECY vs. Costo mensual de Ubicapp ($100.000 COP/mes).\n` +
      `     * Operación nativa en WhatsApp con IA multimodal vs. Obligación de descargar una app y rellenar formularios manuales.\n` +
      `     * Comisiones 100% para el asesor en VECY vs. Esquema de reparto forzado 50/50 de Ubicapp.\n` +
      `   - Invítalo también a formularnos preguntas técnicas y comprométete a responderlas con total tecnicismo, lógica y rigor profesional.\n` +
      `   - Emoji ('reactionEmoji'): "💡"\n\n` +
      `2. **Clasificación "INMUEBLE" o "REQUERIMIENTO"**:\n` +
      `   - Si el usuario está publicando un listado de inmuebles (oferta comercial de venta, arriendo o permuta) o un requerimiento comercial para comprar o rentar un inmueble específico.\n` +
      `   - Respuesta ('response'): "📢 *VECY INMUEBLES NETWORK* 📢\\n\\nHola @${rawPhone}, detecté que estás publicando una oferta o requerimiento inmobiliario. Para poder procesar tu publicación con mis motores automáticos, registrar tus datos y buscarte un MATCH de inmediato con otros aliados, por favor realiza tu publicación en nuestro grupo especializado **VECY INMUEBLES NETWORK**:\\n👉 https://chat.whatsapp.com/K36KrHeB9nMEKJ56s8XFcM\\n\\n¡Hagamos equipo y cerremos negocios! 🚀🎯"\n` +
      `   - Emoji ('reactionEmoji'): "🔄"\n\n` +
      `3. **Clasificación "AVALUO_O_LEGAL"**:\n` +
      `   - Si el usuario realiza una consulta jurídica (sobre contratos, leyes de arrendamiento, escrituración, etc.) o solicita un avalúo rápido/precio estimado de metro cuadrado.\n` +
      `   - Respuesta ('response'): "💡 *VECY: SOPORTE LEGAL, CONTRATOS Y AVALÚOS* 💡\\n\\nHola @${rawPhone}, veo que tienes una consulta jurídica, procedimental o de avalúo. Para darte una respuesta detallada con mis motores legales y de mercado, por favor realiza tu pregunta en nuestro grupo especializado **VECY: SOPORTE LEGAL, CONTRATOS Y AVALÚOS**:\\n👉 https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6\\n\\n¡Allí te responderé al instante con toda la información! 🚀🎯"\n` +
      `   - Emoji ('reactionEmoji'): "🔄"\n\n` +
      `4. **Clasificación "CONSULTA_GENERAL"**:\n` +
      `   - Preguntas o comentarios legítimos sobre el proyecto VECY Network, beneficios, sugerencias, testimonios de éxito o comentarios hacia la IA.\n` +
      `   - Responder de forma cordial, corta, directa y amigable de acuerdo con las directrices de veracidad y sinceridad.\n` +
      `   - Emoji ('reactionEmoji'): "💡"\n\n` +
      `5. **Clasificación "VIOLACION_DE_NORMAS"**:\n` +
      `   - Si el mensaje contiene temas políticos, religiosos, spam general, estafas o publicidad de terceros (que NO sea debate de Ubicapp).\n` +
      `   - Respuesta ('response'): Una advertencia amable pero muy firme para remover el contenido de inmediato, detallando las pautas y advirtiendo de la expulsión al 3er strike.\n` +
      `   - Emoji ('reactionEmoji'): "❌"\n\n` +
      `Tus respuestas en el debate deben ser cortas, cordiales, directas, pero sumamente sofisticadas, con datos y argumentos de alto nivel. Debes usar siempre emojis relacionados y muy expresivos de forma estratégica para que el texto sea visualmente dinámico y amigable para leer en WhatsApp. Siempre dirígete al interlocutor de forma personalizada: ${n}.\n\n` +
      `DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:\n` +
      `{\n` +
      `  "classification": "DEBATE_COMPETIDOR | INMUEBLE | REQUERIMIENTO | AVALUO_O_LEGAL | CONSULTA_GENERAL | VIOLACION_DE_NORMAS",\n` +
      `  "response": "Tu respuesta, invitación a debate o mensaje de redirección según corresponda.",\n` +
      `  "reactionEmoji": "string (emoji recomendado)"\n` +
      `}`;

    const greetingInstruction = `\n\n[SISTEMA - INSTRUCCIÓN DE SALUDO Y COMPORTAMIENTO]:
- Ya has saludado al usuario hoy: ${alreadyGreeted ? "SÍ" : "NO"}.
- Tipo de conversación actual: GRUPO DE WHATSAPP.
- Primer nombre del usuario: "${n}".
- REGLAS CRÍTICAS DE RESPUESTA:
  * Si "Ya has saludado al usuario hoy" es SÍ:
    - ¡PROHIBIDO SALUDAR! No uses palabras como "Hola", "Buenas tardes", "Qué gusto", "Bienvenido", ni variantes de saludo o bienvenida.
    - Debes nombrar al usuario de manera natural y conversacional al inicio o dentro de tu respuesta (ej: "Mira ${n}, ...", "Te cuento, ${n}, que...", "Para complementar, ${n}, ...").
  * Si "Ya has saludado al usuario hoy" es NO:
    - Debes saludar de manera muy cordial y natural, incluyendo su nombre "${n}" o dirigiéndose a él/ella como colega/aliado/a.`;

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
    return {
      classification: "CONSULTA_GENERAL",
      response: "⚠️ Ocurrió un error al procesar tu consulta en Círculo Cero."
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
