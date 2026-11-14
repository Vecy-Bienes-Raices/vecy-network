/**
 * JanIA Session Manager - VECY BIENES RAÍCES
 * Gestión de sesiones temporales, control de mutes, historial conversacional (DMs y Consultoría),
 * métricas en vivo y análisis morfológico de saludos.
 */
import fs from 'fs';
import path from 'path';
import { getDb, getRawSql } from "../../db";
import {
  pendingSessions,
  users,
  conversations as dbConversations,
  messages as dbMessages,
  properties,
  requirements
} from "../../../drizzle/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { ConsultingTurn, DmTurn } from "./types";
import {
  extractIntroducedName,
  isGenericOrNumericName,
  resolveNameAndGender,
} from "../nameAndGenderResolver";

export function cleanSessionJid(jid: string): string {
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

export async function getPendingSession(userId: string): Promise<{ type: "PROPERTY" | "REQUIREMENT"; extractedData: any; senderInfo: any; messageToProcess: string; imageBuffer?: string; isMuted?: boolean } | null> {
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

export async function setPendingSession(userId: string, data: any): Promise<void> {
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

export async function deletePendingSession(userId: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const cleanJid = cleanSessionJid(userId);
    await db.delete(pendingSessions).where(eq(pendingSessions.jid, cleanJid));
  } catch (err) {
    console.error("[Database] Error deleting pending session:", err);
  }
}

export async function resolveRealName(userId: string, userName?: string): Promise<string> {
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

// ─── Control Diario de Saludos (Singleton) ──────────────────────────────────
export const GREETED_TODAY = new Map<string, string>(); // Mapea userId -> fecha "YYYY-MM-DD"

export async function hasGreetedUserToday(userId: string): Promise<boolean> {
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

export async function checkAlreadyGreeted(userId: string): Promise<boolean> {
  const todayStr = new Date().toISOString().split("T")[0];
  const cleanJid = cleanSessionJid(userId);
  if (GREETED_TODAY.get(userId) === todayStr || (cleanJid && GREETED_TODAY.get(cleanJid) === todayStr)) {
    return true;
  }
  const dbGreeted = await hasGreetedUserToday(userId);
  if (dbGreeted) {
    GREETED_TODAY.set(userId, todayStr);
    if (cleanJid) GREETED_TODAY.set(cleanJid, todayStr);
    return true;
  }
  return false;
}

export function markUserGreetedToday(userId: string): void {
  const todayStr = new Date().toISOString().split("T")[0];
  const cleanJid = cleanSessionJid(userId);
  GREETED_TODAY.set(userId, todayStr);
  if (cleanJid) GREETED_TODAY.set(cleanJid, todayStr);
}

export async function getRecentChatHistory(userId: string, limit = 20): Promise<{ role: "user" | "assistant", content: string }[]> {
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

// ─── Estadísticas en tiempo real (Singleton con caché de 5 min) ─────────────
let cachedLiveStatsText = "";
let cachedLiveStatsTime = 0;
let isFetchingLiveStats = false;

export async function getLiveStats(): Promise<string> {
  const nowMs = Date.now();
  // 1. Si está en caché fresca (menos de 5 min), retornar de inmediato
  if (cachedLiveStatsText && nowMs - cachedLiveStatsTime < 300000) {
    return cachedLiveStatsText;
  }

  // 2. Si ya hay una consulta en vuelo, retornar la caché previa para evitar saturar el pool de conexiones
  if (isFetchingLiveStats) {
    return cachedLiveStatsText || "";
  }

  isFetchingLiveStats = true;
  try {
    const rawSql = getRawSql();
    let stats: any = {};
    if (rawSql) {
      const res = await rawSql`
        SELECT 
          (SELECT count(*)::int FROM properties) as prop_count,
          (SELECT count(*)::int FROM requirements) as req_count,
          (SELECT count(*)::int FROM "propertyMatches") as match_count,
          (SELECT count(*)::int FROM properties WHERE "createdAt" >= CURRENT_DATE) as prop_today,
          (SELECT count(*)::int FROM requirements WHERE "createdAt" >= CURRENT_DATE) as req_today,
          (SELECT count(*)::int FROM "propertyMatches" WHERE "createdAt" >= CURRENT_DATE) as match_today
      `;
      stats = res[0] || {};
    } else {
      const db = await getDb();
      if (!db) return cachedLiveStatsText || "";
      const [propCount] = await db.select({ total: sql<number>`count(*)::int` }).from(properties);
      const [reqCount] = await db.select({ total: sql<number>`count(*)::int` }).from(requirements);
      stats = { prop_count: propCount?.total ?? 0, req_count: reqCount?.total ?? 0, match_count: 0, prop_today: 0, req_today: 0, match_today: 0 };
    }

    const now = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' });
    cachedLiveStatsText = `
## 📊 ESTADÍSTICAS EN TIEMPO REAL DE VECY BIENES RAÍCES (Actualizado: ${now} hora Colombia)
Esta información es EXACTA y proviene directamente de la base de datos en este preciso instante. Úsala cuando alguien pregunte cuántos inmuebles, requerimientos o coincidencias tenemos:

| Categoría | Total Histórico | Nuevos Hoy |
|-----------|----------------|------------|
| 🏢 Inmuebles publicados | **${stats.prop_count ?? 0}** | ${stats.prop_today ?? 0} |
| 📋 Requerimientos de búsqueda | **${stats.req_count ?? 0}** | ${stats.req_today ?? 0} |
| 🎯 Coincidencias (Matches) detectadas | **${stats.match_count ?? 0}** | ${stats.match_today ?? 0} |

Si alguien te pregunta por estos números, responde CON PRECISIÓN usando exactamente los datos de esta tabla. No inventes, no estimes. Estos son los datos reales del sistema VECY en este momento.`;
    cachedLiveStatsTime = Date.now();
    return cachedLiveStatsText;
  } catch (err) {
    console.warn("[JanIA-LiveStats] No se pudo obtener estadísticas en tiempo real:", err);
    return cachedLiveStatsText || "";
  } finally {
    isFetchingLiveStats = false;
  }
}

// ─── Analizador Morfológico de Género y Cortesía (v11.70) ────────────────────
export function analyzeSender(name: string, userId: string, alreadyGreeted: boolean): { greeting: string; adj: string; courtesy: string } {
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

// ─── Memoria Conversacional Grupo 2: Consultoría Legal/Avalúos (Singleton) ───
export const consultingConversationHistory = new Map<string, ConsultingTurn[]>();

export function getConsultingHistory(userId: string): ConsultingTurn[] {
  const history = consultingConversationHistory.get(userId) || [];
  const now = Date.now();
  // Conservar mensajes de las últimas 12 horas
  return history.filter(h => now - h.ts < 12 * 3600 * 1000);
}

export function appendConsultingHistory(userId: string, role: "user" | "assistant", content: string) {
  const history = getConsultingHistory(userId);
  history.push({ role, content, ts: Date.now() });
  if (history.length > 20) history.shift();
  consultingConversationHistory.set(userId, history);
}

// ─── Memoria Conversacional DMs Privados (Singleton) ─────────────────────────
export const dmConversationHistory = new Map<string, DmTurn[]>();

export function getStartOfTodayBogota(): number {
  const now = new Date();
  const bogotaFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const parts = bogotaFormatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '2026', 10);
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10) - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);

  // 00:00:00 hora Bogotá (UTC-5) = 05:00:00 UTC
  return Date.UTC(year, month, day, 5, 0, 0);
}

export function getDmHistory(userId: string): DmTurn[] {
  const history = dmConversationHistory.get(userId) || [];
  // Memoria Permanente Inteligente (v33.17): Conservar siempre los últimos 20 turnos sin caducidad temporal
  return history.slice(-20);
}

export async function getOrLoadDmHistory(userId: string): Promise<DmTurn[]> {
  const inMemory = getDmHistory(userId);
  if (inMemory.length > 0) {
    return inMemory;
  }

  // Si la memoria RAM está vacía tras reinicio del proceso, recuperar los últimos 20 mensajes de BD sin corte de fecha
  try {
    const db = await getDb();
    if (db) {
      const conv = await db.select().from(dbConversations).where(eq(dbConversations.sessionId, userId)).limit(1);
      if (conv.length > 0) {
        const recentMsgs = await db
          .select()
          .from(dbMessages)
          .where(eq(dbMessages.conversationId, conv[0].id))
          .orderBy(desc(dbMessages.createdAt))
          .limit(20);

        if (recentMsgs.length > 0) {
          recentMsgs.reverse();
          const restored: DmTurn[] = recentMsgs.map(m => {
            const dateStr = new Date(m.createdAt).toISOString().replace("T", " ").substring(0, 16);
            const isAssistant = m.role === 'janIA';
            const cleanMsg = m.content.replace(/^\[(?:Nota de Voz PTT|SILENT-MATCH)\]:\s*/, '').replace(/^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\]\s*/, '').trim();
            return {
              role: isAssistant ? 'assistant' : 'user',
              content: isAssistant ? cleanMsg : `[${dateStr}] ${cleanMsg}`,
              ts: new Date(m.createdAt).getTime()
            };
          });
          dmConversationHistory.set(userId, restored);
          return restored;
        }
      }
    }
  } catch (err: any) {
    console.warn("[getOrLoadDmHistory] Error consultando historial permanente en BD:", err?.message);
  }

  return [];
}

export function appendDmHistory(userId: string, role: "user" | "assistant", content: string) {
  const history = getDmHistory(userId);
  const now = new Date();
  const dateStr = now.toISOString().replace("T", " ").substring(0, 16);
  const cleanContent = content.replace(/^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\]\s*/, '').trim();
  // Solo etiquetar con timestamp las intervenciones del usuario para contexto temporal;
  // las intervenciones del asistente se almacenan limpias para evitar que el LLM imite el prefijo.
  const taggedContent = role === "user" ? `[${dateStr}] ${cleanContent}` : cleanContent;
  history.push({ role, content: taggedContent, ts: now.getTime() });
  // Conservar siempre los últimos 20 turnos
  while (history.length > 20) history.shift();
  dmConversationHistory.set(userId, history);
}

/**
 * Consulta la Ficha Histórica Permanente del Contacto en PostgreSQL
 * obteniendo sus propiedades y requerimientos registrados.
 */
export async function getContactPermanentDossier(userId: string): Promise<string> {
  const cleanPhone = cleanSessionJid(userId);
  if (!cleanPhone || cleanPhone.length < 7) return "";

  try {
    const db = await getDb();
    if (!db) return "";

    const userProps = await db
      .select({
        id: properties.id,
        name: properties.name,
        propertyType: properties.propertyType,
        transactionType: properties.transactionType,
        zone: properties.zone,
        price: properties.price,
        available: properties.available
      })
      .from(properties)
      .where(sql`${properties.idUsuarioWhatsapp} ILIKE ${'%' + cleanPhone + '%'}`)
      .limit(5);

    const userReqs = await db
      .select({
        id: requirements.id,
        tipoInmuebleDeseado: requirements.tipoInmuebleDeseado,
        tipoNegocioDeseado: requirements.tipoNegocioDeseado,
        zonaDeseada: requirements.zonaDeseada,
        presupuestoMax: requirements.presupuestoMax,
        status: requirements.status
      })
      .from(requirements)
      .where(sql`${requirements.idUsuarioWhatsapp} ILIKE ${'%' + cleanPhone + '%'}`)
      .limit(5);

    if (userProps.length === 0 && userReqs.length === 0) {
      return `\n[FICHA HISTÓRICA PERMANENTE DEL CONTACTO (+${cleanPhone})]: Sin ofertas ni demandas previas registradas en base de datos.`;
    }

    let dossier = `\n[FICHA HISTÓRICA PERMANENTE DEL CONTACTO (+${cleanPhone})]:`;
    if (userProps.length > 0) {
      dossier += `\n• Inmuebles ofertados: ${userProps.map(p => `#P${p.id} ${p.propertyType || "Inmueble"} en ${p.zone || "Bogotá"} (${p.transactionType || "Venta"})`).join("; ")}`;
    }
    if (userReqs.length > 0) {
      dossier += `\n• Requerimientos activos: ${userReqs.map(r => `#R${r.id} Busca ${r.tipoInmuebleDeseado || "Inmueble"} en ${r.zonaDeseada || "Bogotá"} (${r.tipoNegocioDeseado || "Venta"})`).join("; ")}`;
    }

    return dossier;
  } catch (err: any) {
    console.warn("[getContactPermanentDossier] Error consultando ficha histórica:", err?.message);
    return "";
  }
}

// ─── Memoria Conversacional Grupo Proyecto VECY / Círculo (Singleton v33.4.1) ─
export const circuloConversationHistory = new Map<string, ConsultingTurn[]>();

export function getCirculoHistory(userId: string): ConsultingTurn[] {
  const history = circuloConversationHistory.get(userId) || [];
  const now = Date.now();
  // Conservar mensajes de las últimas 12 horas
  return history.filter(h => now - h.ts < 12 * 3600 * 1000);
}

export function appendCirculoHistory(userId: string, role: "user" | "assistant", content: string) {
  const history = getCirculoHistory(userId);
  history.push({ role, content, ts: Date.now() });
  if (history.length > 20) history.shift();
  circuloConversationHistory.set(userId, history);
}

// ─── Memoria y Persistencia de Sesión Empresarial RUES (v33.29) ───────────────
export interface CompanySessionData {
  nit: string;
  dv?: string;
  razonSocial: string;
  camaraComercio?: string;
  matricula?: string;
  estado?: string;
  representantePrincipal?: {
    nombre: string;
    numeroIdentificacion: string;
    numeroFormateado?: string;
    tipoDocumento: string;
    cargo?: string;
    esPrincipal?: boolean;
  };
  representantes?: Array<{
    nombre: string;
    numeroIdentificacion: string;
    numeroFormateado?: string;
    tipoDocumento: string;
    cargo?: string;
    esPrincipal?: boolean;
  }>;
  timestamp: number;
}

export const companySessionMap = new Map<string, CompanySessionData>();

export async function setCompanySession(userId: string, data: Omit<CompanySessionData, "timestamp">): Promise<void> {
  if (!userId) return;
  const cleanJid = cleanSessionJid(userId);
  const sessionEntry: CompanySessionData = {
    ...data,
    timestamp: Date.now()
  };
  companySessionMap.set(cleanJid, sessionEntry);

  try {
    const db = await getDb();
    if (db) {
      const dbKey = `company:${cleanJid}`;
      await db.insert(pendingSessions).values({
        jid: dbKey,
        sessionData: sessionEntry,
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: pendingSessions.jid,
        set: {
          sessionData: sessionEntry,
          updatedAt: new Date()
        }
      });
    }
  } catch (err: any) {
    console.warn("[setCompanySession] Error persistiendo sesión empresarial en BD:", err?.message);
  }
}

export async function getCompanySession(userId: string): Promise<CompanySessionData | null> {
  if (!userId) return null;
  const cleanJid = cleanSessionJid(userId);

  // 1. Memoria rápida en RAM (TTL 24 horas)
  const inMemory = companySessionMap.get(cleanJid);
  if (inMemory && Date.now() - inMemory.timestamp < 24 * 60 * 60 * 1000) {
    return inMemory;
  }

  // 2. Restauración desde base de datos PostgreSQL si el proceso fue reiniciado
  try {
    const db = await getDb();
    if (db) {
      const dbKey = `company:${cleanJid}`;
      const [existing] = await db.select().from(pendingSessions).where(eq(pendingSessions.jid, dbKey)).limit(1);
      if (existing && existing.sessionData) {
        const data = existing.sessionData as any;
        if (data && typeof data === "object") {
          companySessionMap.set(cleanJid, data);
          return data;
        }
      }
    }
  } catch (err: any) {
    console.warn("[getCompanySession] Error recuperando sesión empresarial en BD:", err?.message);
  }

  return null;
}

export async function clearCompanySession(userId: string): Promise<void> {
  if (!userId) return;
  const cleanJid = cleanSessionJid(userId);
  companySessionMap.delete(cleanJid);
  try {
    const db = await getDb();
    if (db) {
      await db.delete(pendingSessions).where(eq(pendingSessions.jid, `company:${cleanJid}`));
    }
  } catch (_) { }
}

// ─── Expediente Perpetuo y Memoria Persistente de Usuario (Nivel ARGON — v33.30) ───
export interface UserPerpetualSession {
  userId: string;
  phone: string;
  name?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  messageCount: number;
  freeServicesUsedCount: number;
  hasVerifiedGoogleReview: boolean;
  reviewVerifiedAt?: string;
  reviewClaimedAt?: string;
  reviewScreenshotReceived?: boolean;
  notes?: string[];
  keyFacts?: Record<string, any>;
  analyzedDocs?: Array<{ type: string; identifier: string; timestamp: number }>;
}

const PERSISTENT_SESSIONS_FILE = path.resolve(process.cwd(), "data/jania_persistent_sessions.json");
const userPerpetualSessionMap = new Map<string, UserPerpetualSession>();
let persistentSessionsLoaded = false;

export function isEduardoOrJani(phoneOrJid: string): boolean {
  if (!phoneOrJid) return false;
  const clean = phoneOrJid.replace(/\D/g, "");
  const vipList = [
    "3192919978", "573192919978", "225954035179724", "3118536968", "573118536968", "3166569719", "573166569719",
    "3188096811", "573188096811", "167108705018103", "182781141344345", "218820279050385"
  ];
  return vipList.some(v => clean.includes(v) || v.includes(clean));
}

function ensureLoadedFromDisk(): void {
  if (persistentSessionsLoaded) return;
  persistentSessionsLoaded = true;
  if (process.env.NODE_ENV === "test") return;
  try {
    if (fs.existsSync(PERSISTENT_SESSIONS_FILE)) {
      const raw = fs.readFileSync(PERSISTENT_SESSIONS_FILE, "utf-8");
      const list: UserPerpetualSession[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item?.userId) {
            userPerpetualSessionMap.set(item.userId, item);
          }
        }
      }
    }
  } catch (err: any) {
    console.warn("[sessionManager] Error loading persistent sessions from disk:", err?.message);
  }
}

function saveSessionsToDisk(): void {
  if (process.env.NODE_ENV === "test") return;
  try {
    const dir = path.dirname(PERSISTENT_SESSIONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const all = Array.from(userPerpetualSessionMap.values());
    fs.writeFileSync(PERSISTENT_SESSIONS_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch (err: any) {
    console.warn("[sessionManager] Error saving persistent sessions to disk:", err?.message);
  }
}

export async function getUserPerpetualSession(userId: string, userName?: string): Promise<UserPerpetualSession> {
  ensureLoadedFromDisk();
  const cleanJid = cleanSessionJid(userId);

  // 1. Memoria RAM
  let session = userPerpetualSessionMap.get(cleanJid);
  if (session) {
    if (userName && !session.name) session.name = userName;
    return session;
  }

  // 2. Base de Datos PostgreSQL (omitir en NODE_ENV=test para evitar contaminación entre corridas)
  if (process.env.NODE_ENV !== "test") {
    try {
      const db = await getDb();
      if (db) {
        const dbKey = `user_memory:${cleanJid}`;
        const [existing] = await db.select().from(pendingSessions).where(eq(pendingSessions.jid, dbKey)).limit(1);
        if (existing && existing.sessionData && typeof existing.sessionData === "object") {
          session = existing.sessionData as UserPerpetualSession;
          userPerpetualSessionMap.set(cleanJid, session);
          saveSessionsToDisk();
          return session;
        }
      }
    } catch (err: any) {
      console.warn("[getUserPerpetualSession] Error recuperando de BD:", err?.message);
    }
  }

  // 3. Crear Nueva Sesión si no existía
  const isVip = isEduardoOrJani(cleanJid);
  const now = new Date().toISOString();
  session = {
    userId: cleanJid,
    phone: cleanJid,
    name: userName || undefined,
    firstSeenAt: now,
    lastSeenAt: now,
    messageCount: 0,
    freeServicesUsedCount: 0,
    hasVerifiedGoogleReview: isVip,
    notes: [],
    keyFacts: {}
  };
  userPerpetualSessionMap.set(cleanJid, session);
  saveSessionsToDisk();
  return session;
}

export async function saveUserPerpetualSession(session: UserPerpetualSession): Promise<void> {
  ensureLoadedFromDisk();
  userPerpetualSessionMap.set(session.userId, session);
  saveSessionsToDisk();

  if (process.env.NODE_ENV === "test") return;

  try {
    const db = await getDb();
    if (db) {
      const dbKey = `user_memory:${session.userId}`;
      await db.insert(pendingSessions).values({
        jid: dbKey,
        sessionData: session,
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: pendingSessions.jid,
        set: {
          sessionData: session,
          updatedAt: new Date()
        }
      });
    }
  } catch (err: any) {
    console.warn("[saveUserPerpetualSession] Error persistiendo en BD:", err?.message);
  }
}

export async function isNewUser(userId: string): Promise<boolean> {
  const session = await getUserPerpetualSession(userId);
  const history = getDmHistory(userId);
  return session.messageCount === 0 && history.length === 0;
}

export async function incrementUserMessageCount(userId: string): Promise<number> {
  const session = await getUserPerpetualSession(userId);
  session.messageCount = (session.messageCount || 0) + 1;
  session.lastSeenAt = new Date().toISOString();
  await saveUserPerpetualSession(session);
  return session.messageCount;
}

export async function incrementFreeServicesCount(userId: string): Promise<number> {
  const session = await getUserPerpetualSession(userId);
  session.freeServicesUsedCount = (session.freeServicesUsedCount || 0) + 1;
  session.lastSeenAt = new Date().toISOString();
  await saveUserPerpetualSession(session);
  return session.freeServicesUsedCount;
}

export async function recordUserReviewClaim(userId: string): Promise<void> {
  const session = await getUserPerpetualSession(userId);
  session.reviewClaimedAt = new Date().toISOString();
  session.lastSeenAt = new Date().toISOString();
  await saveUserPerpetualSession(session);
}

export async function verifyUserGoogleReview(userId: string): Promise<void> {
  const session = await getUserPerpetualSession(userId);
  session.hasVerifiedGoogleReview = true;
  session.reviewVerifiedAt = new Date().toISOString();
  session.reviewScreenshotReceived = true;
  session.lastSeenAt = new Date().toISOString();
  await saveUserPerpetualSession(session);
  console.log(`[GoogleReview] Usuario ${session.userId} marcado como hasVerifiedGoogleReview = true`);
}

export async function isUserVerifiedGoogleReview(userId: string): Promise<boolean> {
  if (isEduardoOrJani(userId)) return true;
  const session = await getUserPerpetualSession(userId);
  return !!session.hasVerifiedGoogleReview;
}

export async function shouldAskForGoogleReview(userId: string): Promise<boolean> {
  if (isEduardoOrJani(userId)) return false;
  const session = await getUserPerpetualSession(userId);
  if (session.hasVerifiedGoogleReview) return false;
  return session.freeServicesUsedCount >= 1;
}

/**
 * Registra y persiste la aceptación o rechazo del modelo colaborativo 40/20/40 en la memoria perpetua y BD (v33.33)
 */
export async function setUser402040Agreement(userId: string, accepts: boolean): Promise<UserPerpetualSession> {
  const session = await getUserPerpetualSession(userId);
  session.keyFacts = session.keyFacts || {};
  session.keyFacts.acepta_40_20_40 = accepts;
  session.keyFacts.rol_identificado = "agente_inmobiliario";
  session.keyFacts.categoriaContacto = accepts ? "aliada_prioritaria" : "plan_pago_requerido";
  if (!accepts) {
    session.keyFacts.rechaza_402040_requiere_plan_pago = true;
  }
  session.keyFacts.updatedAt_40_20_40 = new Date().toISOString();
  delete session.keyFacts.esperando_respuesta_40_20_40;
  session.lastSeenAt = new Date().toISOString();
  await saveUserPerpetualSession(session);

  try {
    const db = await getDb();
    if (db) {
      const cleanPhone = cleanSessionJid(userId).replace(/\D/g, "");
      const normPhone = cleanPhone.startsWith("57") ? cleanPhone : `57${cleanPhone}`;
      const noteTag = accepts ? "[ALIANZA 40/20/40 ACEPTADA - ALIADA PRIORITARIA]" : "[RECHAZA 40/20/40 - REQUIERE PLAN DE PAGO MENSUAL/ANUAL]";
      await db.execute(sql`
        UPDATE advisors 
        SET notes = COALESCE(notes, '') || ' ' || ${noteTag}, updated_at = NOW()
        WHERE normalized_phone = ${normPhone}
      `);
    }
  } catch (err: any) {
    console.warn("[setUser402040Agreement] Error actualizando en advisors:", err?.message);
  }
  return session;
}

export async function getUser402040Agreement(userId: string): Promise<boolean | undefined> {
  const session = await getUserPerpetualSession(userId);
  return session.keyFacts?.acepta_40_20_40;
}

export async function setUserOwnerCorretaje(
  userId: string,
  data: { acceptsTerms?: boolean; email?: string }
): Promise<UserPerpetualSession> {
  const session = await getUserPerpetualSession(userId);
  session.keyFacts = session.keyFacts || {};
  session.keyFacts.es_propietario_directo = true;
  session.keyFacts.rol_identificado = "propietario_directo";
  if (data.acceptsTerms !== undefined) {
    session.keyFacts.acepta_terminos_corretaje = data.acceptsTerms;
    if (data.acceptsTerms) session.keyFacts.esperando_terminos_corretaje = false;
  }
  if (data.email) {
    session.keyFacts.correo_propietario = data.email.toLowerCase();
    session.keyFacts.esperando_correo_propietario = false;
  }
  session.lastSeenAt = new Date().toISOString();
  await saveUserPerpetualSession(session);
  return session;
}

export async function getUserOwnerCorretaje(userId: string): Promise<{ isOwner?: boolean; acceptsTerms?: boolean; email?: string }> {
  const session = await getUserPerpetualSession(userId);
  return {
    isOwner: session.keyFacts?.es_propietario_directo,
    acceptsTerms: session.keyFacts?.acepta_terminos_corretaje,
    email: session.keyFacts?.correo_propietario
  };
}

export type UserBusinessRole =
  | "agente_inmobiliario"
  | "propietario_directo"
  | "comprador_inversionista"
  | "arrendatario";

export function detectUserBusinessRoleFromText(text: string): UserBusinessRole | undefined {
  const clean = String(text || "").trim();
  if (!clean) return undefined;

  // 1. Propietario directo explícito
  if (
    /\b(?:soy\s+(?:el\s+|la\s+)?(?:propietari[oa]|dueñ[oa])(?:\s+direct[oa])?|propietari[oa]\s+direct[oa]|mi\s+propio\s+inmueble|(?:vender|arrendar|alquilar|permutar)\s+mi\s+(?:apartamento|casa|lote|bodega|local|finca|oficina|predio|inmueble)|tengo\s+(?:un|una|mi)\s+(?:apartamento|casa|lote|bodega|local|finca)\s+propia?)\b/i.test(clean) &&
    !/\b(?:cliente|colega|agente|asesor[a]?|corredor[a]?|inmobiliari[oa])\b/i.test(clean)
  ) {
    return "propietario_directo";
  }

  // 2. Agente / Inmobiliaria / Corredor explícito
  if (
    /\b(?:soy\s+(?:un[a]?\s+)?(?:agente|asesor[a]?|corredor[a]?|broker|br[oó]ker|colega)(?:\s+inmobiliari[oa])?|como\s+(?:agente|asesor[a]?|corredor[a]?|colega)|trabajo\s+(?:en|con)\s+(?:una\s+)?inmobiliaria|tengo\s+(?:una\s+)?inmobiliaria|represento\s+a\s+(?:un|una|mi)\s+(?:cliente|comprador[a]?|propietari[oa])|tengo\s+(?:un|una)\s+cliente\s+que|es\s+para\s+(?:un|una)\s+cliente|40\s*\/\s*20\s*\/\s*40|punta\s+captadora|punta\s+vendedora)\b/i.test(clean) &&
    !/\bno\s+soy\s+(?:agente|asesor[a]?|corredor[a]?|colega|inmobiliari[oa])\b/i.test(clean)
  ) {
    return "agente_inmobiliario";
  }

  // 3. Arrendatario directo explícito
  if (
    /\b(?:soy\s+(?:un[a]?\s+)?arrendatari[oa](?:\s+direct[oa])?|quiero\s+tomar\s+en\s+arriendo|busco\s+(?:para\s+)?arrendar\s+para\s+(?:vivir|m[ií]|mi\s+familia|mi\s+empresa|mi\s+negocio)|para\s+(?:vivir\s+yo|habitarlo\s+yo))\b/i.test(clean) &&
    !/\b(?:cliente|colega|agente|asesor[a]?|corredor[a]?)\b/i.test(clean)
  ) {
    return "arrendatario";
  }

  // 4. Comprador directo o Inversionista explícito
  if (
    /\b(?:soy\s+(?:un[a]?\s+)?(?:comprador[a]?|inversionista)(?:\s+direct[oa])?|como\s+(?:comprador[a]?|inversionista)(?:\s+direct[oa])?|busco\s+(?:invertir|comprar)\s+(?:directamente|para\s+m[ií]|vivienda\s+propia|mi\s+patrimonio|como\s+inversi[oó]n)|quiero\s+(?:comprar|invertir)\s+(?:directamente|para\s+m[ií]|sin\s+intermediarios)|cliente\s+direct[oa]|particular\s+(?:que\s+)?busca|no\s+soy\s+(?:agente|asesor[a]?|corredor[a]?|colega|inmobiliari[oa]))\b/i.test(clean)
  ) {
    if (/\b(?:arrendar|alquilar|arriendo)\b/i.test(clean) && !/\bcomprar|invertir\b/i.test(clean)) {
      return "arrendatario";
    }
    return "comprador_inversionista";
  }

  return undefined;
}

export async function setUserBusinessRole(
  userId: string,
  role: UserBusinessRole,
  metadata?: { sourceText?: string }
): Promise<UserPerpetualSession> {
  const session = await getUserPerpetualSession(userId);
  session.keyFacts = session.keyFacts || {};
  session.keyFacts.rol_identificado = role;
  session.keyFacts.rol_confirmado_en = new Date().toISOString();
  session.keyFacts.es_propietario_directo = role === "propietario_directo";
  delete session.keyFacts.esperando_identificacion_rol;
  if (metadata?.sourceText) {
    session.keyFacts.rol_fuente_texto = metadata.sourceText.slice(0, 120);
  }
  session.lastSeenAt = new Date().toISOString();
  await saveUserPerpetualSession(session);
  return session;
}

export function resolveRoleFromPerpetualSession(session?: UserPerpetualSession | null): UserBusinessRole | undefined {
  if (!session) return undefined;
  const raw = session.keyFacts?.rol_identificado;
  if (raw === "colega_inmobiliario" || raw === "agente_inmobiliario") return "agente_inmobiliario";
  if (raw === "propietario_directo") return "propietario_directo";
  if (raw === "comprador_inversionista") return "comprador_inversionista";
  if (raw === "arrendatario") return "arrendatario";
  if (session.keyFacts?.es_propietario_directo === true) return "propietario_directo";
  if (session.keyFacts?.acepta_40_20_40 !== undefined) return "agente_inmobiliario";
  return undefined;
}

export async function getUserBusinessRole(userId: string): Promise<UserBusinessRole | undefined> {
  const session = await getUserPerpetualSession(userId);
  return resolveRoleFromPerpetualSession(session);
}

export interface RoleDistributionStats {
  totalSessions: number;
  confirmedRolesTotal: number;
  unassignedCount: number;
  counts: {
    agente_inmobiliario: number;
    propietario_directo: number;
    comprador_inversionista: number;
    arrendatario: number;
  };
  percentages: {
    agente_inmobiliario: number;
    propietario_directo: number;
    comprador_inversionista: number;
    arrendatario: number;
  };
  acceptance402040Count: number;
  rejection402040Count: number;
  ownerCorretajeCount: number;
}

function computeRoleDistributionFromSessions(sessions: Iterable<UserPerpetualSession>): RoleDistributionStats {
  const counts = {
    agente_inmobiliario: 0,
    propietario_directo: 0,
    comprador_inversionista: 0,
    arrendatario: 0,
  };
  let totalSessions = 0;
  let unassignedCount = 0;
  let acceptance402040Count = 0;
  let rejection402040Count = 0;
  let ownerCorretajeCount = 0;

  for (const session of sessions) {
    if (!session || isEduardoOrJani(session.userId)) continue;
    totalSessions += 1;
    const role = resolveRoleFromPerpetualSession(session);
    if (role) {
      counts[role] += 1;
    } else {
      unassignedCount += 1;
    }
    if (session.keyFacts?.acepta_40_20_40 === true) acceptance402040Count += 1;
    else if (session.keyFacts?.acepta_40_20_40 === false) rejection402040Count += 1;
    if (session.keyFacts?.es_propietario_directo === true) ownerCorretajeCount += 1;
  }

  const confirmedRolesTotal =
    counts.agente_inmobiliario +
    counts.propietario_directo +
    counts.comprador_inversionista +
    counts.arrendatario;

  const pct = (val: number) =>
    confirmedRolesTotal > 0 ? Math.round((val / confirmedRolesTotal) * 1000) / 10 : 0;

  return {
    totalSessions,
    confirmedRolesTotal,
    unassignedCount,
    counts,
    percentages: {
      agente_inmobiliario: pct(counts.agente_inmobiliario),
      propietario_directo: pct(counts.propietario_directo),
      comprador_inversionista: pct(counts.comprador_inversionista),
      arrendatario: pct(counts.arrendatario),
    },
    acceptance402040Count,
    rejection402040Count,
    ownerCorretajeCount,
  };
}

/**
 * Retorna la distribución en tiempo real de roles detectados en memoria de sesión (0ms).
 */
export function getUserRoleDistributionStatsSync(): RoleDistributionStats {
  ensureLoadedFromDisk();
  return computeRoleDistributionFromSessions(userPerpetualSessionMap.values());
}

/**
 * Retorna la distribución consolidada de roles (memoria + PostgreSQL en producción).
 */
export async function getUserRoleDistributionStats(): Promise<RoleDistributionStats> {
  ensureLoadedFromDisk();
  const merged = new Map<string, UserPerpetualSession>(userPerpetualSessionMap);

  if (process.env.NODE_ENV !== "test") {
    try {
      const db = await getDb();
      if (db) {
        const rows = await db
          .select({ jid: pendingSessions.jid, sessionData: pendingSessions.sessionData })
          .from(pendingSessions)
          .where(sql`${pendingSessions.jid} LIKE 'user_memory:%'`);
        for (const row of rows) {
          const data = row.sessionData as UserPerpetualSession | null;
          const uid = data?.userId || row.jid.replace(/^user_memory:/, "");
          if (uid && data && !merged.has(uid)) {
            merged.set(uid, data);
          }
        }
      }
    } catch (err: any) {
      console.warn("[sessionManager] Error agregando distribución de roles desde BD:", err?.message);
    }
  }

  return computeRoleDistributionFromSessions(merged.values());
}

export function resetUserPerpetualSessionsForTests(): void {
  if (process.env.NODE_ENV !== "test") return;
  userPerpetualSessionMap.clear();
}

/**
 * Persiste orgánicamente el nombre propio presentado por el usuario (simple o compuesto) y su género
 * en la memoria perpetua para que JanIA jamás pierda el hilo de cómo llamarlo entre turnos o canales.
 */
export async function persistIntroducedNameInSession(
  userId: string,
  rawMessageText: string,
  fallbackProfileName?: string
): Promise<{
  session: UserPerpetualSession;
  introducedNow: string | null;
  effectiveRawName: string;
}> {
  const session = await getUserPerpetualSession(userId, fallbackProfileName);
  const introducedNow = extractIntroducedName(rawMessageText || "");
  session.keyFacts = session.keyFacts || {};

  if (introducedNow && !isGenericOrNumericName(introducedNow)) {
    const resolved = resolveNameAndGender(introducedNow);
    const canonical = resolved.displayName && resolved.displayName !== "colega"
      ? resolved.displayName
      : introducedNow;
    session.keyFacts.introducedName = canonical;
    session.keyFacts.resolvedGender = resolved.isFemale ? "female" : "male";
    if (!session.name || isGenericOrNumericName(session.name)) {
      session.name = canonical;
    }
    session.lastSeenAt = new Date().toISOString();
    await saveUserPerpetualSession(session);
  }

  const persistedIntroduced =
    typeof session.keyFacts?.introducedName === "string" && !isGenericOrNumericName(session.keyFacts.introducedName)
      ? session.keyFacts.introducedName
      : "";
  const persistedName =
    session.name && !isGenericOrNumericName(session.name)
      ? session.name
      : "";
  const effectiveRawName =
    introducedNow ||
    persistedIntroduced ||
    fallbackProfileName ||
    persistedName ||
    "";

  return {
    session,
    introducedNow,
    effectiveRawName
  };
}


