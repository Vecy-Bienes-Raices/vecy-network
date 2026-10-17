/**
 * JanIA Session Manager - VECY BIENES RAÍCES
 * Gestión de sesiones temporales, control de mutes, historial conversacional (DMs y Consultoría),
 * métricas en vivo y análisis morfológico de saludos.
 */
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

