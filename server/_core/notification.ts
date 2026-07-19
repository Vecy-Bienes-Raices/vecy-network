import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const buildEndpointUrl = (baseUrl: string): string => {
  const normalizedBase = baseUrl.endsWith("/")
    ? baseUrl
    : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }

  return { title, content };
};

/**
 * Dispatches a project-owner notification through the Manus Notification Service.
 * Returns `true` if the request was accepted, `false` when the upstream service
 * cannot be reached (callers can fall back to email/slack). Validation errors
 * bubble up as TRPC errors so callers can fix the payload.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured.",
    });
  }

  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured.",
    });
  }

  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1",
      },
      body: JSON.stringify({ title, content }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${
          detail ? `: ${detail}` : ""
        }`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

import { vrifEvents } from "./events";
import { getDb } from "../db";
import { propertyMatches, properties, requirements, users, notificationLogs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Suscribirse al evento match:created
vrifEvents.on("match:created", async (matchId: number) => {
  console.log(`[NotificationService] Procesando evento match:created para Match #${matchId}...`);
  try {
    await queueMatchNotifications(matchId);
  } catch (err) {
    console.error(`[NotificationService] Error al procesar notificaciones del Match #${matchId}:`, err);
  }
});

export async function queueMatchNotifications(matchId: number, triggerSource: string = "match_created"): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[NotificationService] Base de datos no disponible.");
    return;
  }

  // 1. Obtener la información del match, del inmueble y del requerimiento
  const [match] = await db.select().from(propertyMatches).where(eq(propertyMatches.id, matchId)).limit(1);
  if (!match) {
    console.error(`[NotificationService] No se encontró el Match #${matchId}`);
    return;
  }

  const [property] = await db.select().from(properties).where(eq(properties.id, match.propertyId)).limit(1);
  const [requirement] = await db.select().from(requirements).where(eq(requirements.id, match.requirementId)).limit(1);

  if (!property || !requirement) {
    console.error(`[NotificationService] Propiedad o Requerimiento no encontrados para el Match #${matchId}`);
    return;
  }

  // 2. Identificar a los brókers (teléfonos y IDs)
  // Bróker del Inmueble (Owner)
  const propBrokerPhone = property.idUsuarioWhatsapp || "";
  let propBrokerId: number | null = null;
  if (property.agentId) {
    propBrokerId = property.agentId;
  } else if (propBrokerPhone) {
    const [u] = await db.select().from(users).where(eq(users.phone, propBrokerPhone.split("@")[0])).limit(1);
    if (u) propBrokerId = u.id;
  }

  // Bróker del Requerimiento (Seeker)
  const reqBrokerPhone = requirement.idUsuarioWhatsapp || "";
  let reqBrokerId: number | null = null;
  if (requirement.userId) {
    reqBrokerId = requirement.userId;
  } else if (reqBrokerPhone) {
    const [u] = await db.select().from(users).where(eq(users.phone, reqBrokerPhone.split("@")[0])).limit(1);
    if (u) reqBrokerId = u.id;
  }

  // 3. Crear registros de auditoría en notificationLogs en estado "pending"
  if (propBrokerPhone) {
    await db.insert(notificationLogs).values({
      matchId: match.id,
      brokerId: propBrokerId,
      brokerPhone: propBrokerPhone,
      channel: "whatsapp",
      status: "pending",
      triggerSource: triggerSource,
    });
  }

  if (reqBrokerPhone) {
    await db.insert(notificationLogs).values({
      matchId: match.id,
      brokerId: reqBrokerId,
      brokerPhone: reqBrokerPhone,
      channel: "whatsapp",
      status: "pending",
      triggerSource: triggerSource,
    });
  }

  console.log(`[NotificationService] Logs de notificaciones creados en estado 'pending' con triggerSource '${triggerSource}' para Match #${matchId}`);

  // 4. Modo de notificación granular
  const mode = process.env.MATCH_NOTIFICATION_MODE || "manual"; // manual | automatic | hybrid
  const score = parseFloat(match.matchScore?.toString() || "0");

  let shouldDispatch = false;
  if (mode === "automatic") {
    shouldDispatch = true;
  } else if (mode === "hybrid") {
    if (score >= 97) {
      shouldDispatch = true;
      console.log(`[NotificationService] Modo Híbrido: Match #${matchId} tiene score alto (${score}%) >= 97%. Enviar automáticamente.`);
    } else if (score >= 90) {
      shouldDispatch = false;
      console.log(`[NotificationService] Modo Híbrido: Match #${matchId} tiene score medio (${score}%). Esperar aprobación manual.`);
    } else {
      shouldDispatch = false;
      console.log(`[NotificationService] Modo Híbrido: Match #${matchId} tiene score bajo (${score}%). Solo visible en dashboard.`);
    }
  }

  if (shouldDispatch) {
    console.log(`[NotificationService] Despachando notificaciones automáticas para Match #${matchId}...`);
    await dispatchNotificationsForMatch(matchId);
  }
}

export async function dispatchNotificationsForMatch(matchId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const logs = await db.select().from(notificationLogs).where(eq(notificationLogs.matchId, matchId));
  const [match] = await db.select().from(propertyMatches).where(eq(propertyMatches.id, matchId)).limit(1);
  const [property] = await db.select().from(properties).where(eq(properties.id, match.propertyId)).limit(1);
  const [requirement] = await db.select().from(requirements).where(eq(requirements.id, match.requirementId)).limit(1);

  if (!match || !property || !requirement) return;

  const matchExplanation: any = match.matchExplanation;
  const score = Math.round(Number(match.matchScore || 0));

  for (const log of logs) {
    if (log.status !== "pending") continue;

    try {
      const isOwner = log.brokerPhone === property.idUsuarioWhatsapp;
      const otherPhone = isOwner ? requirement.idUsuarioWhatsapp : property.idUsuarioWhatsapp;
      const cleanOtherPhone = otherPhone ? otherPhone.split("@")[0] : "";

      // Generar mensaje elocuente
      const greeting = `🎯 *¡COINCIDENCIA INMOBILIARIA DETECTADA! (Coincidencia: ${score}%)* 🎯\n\n`;
      const justification = 
        `Hola colega, hemos encontrado una coincidencia muy alta para tu publicación.\n\n` +
        `*Puntos compatibles:*\n` +
        (matchExplanation?.positives?.map((p: string) => `• ${p}`).join("\n") || "• Compatibilidad general") + "\n\n" +
        (matchExplanation?.negatives?.length > 0 
          ? `*Advertencias menores:*\n` + matchExplanation.negatives.map((n: string) => `• ${n}`).join("\n") + "\n\n" 
          : "") +
        `¿Te interesa ponerte en contacto con el colega bróker (+${cleanOtherPhone}) para coordinar la negociación?\n\n` +
        `Responde a este mensaje privado con:\n` +
        `👉 *SÍ #M${matchId}* - Para autorizar compartir tus datos de contacto.\n` +
        `👉 *NO #M${matchId}* - Para rechazar la propuesta.`;

      const fullMessage = greeting + justification;

      // Enviar por WhatsApp
      const matchBot = (global as any).janiaMatchBotInstance;
      const jid = log.brokerPhone.includes("@") ? log.brokerPhone : `${log.brokerPhone}@s.whatsapp.net`;
      
      if (matchBot && matchBot.isReady) {
        await matchBot.sock.sendMessage(jid, { text: fullMessage });
        await db.update(notificationLogs).set({
          status: "sent",
          sentAt: new Date(),
        }).where(eq(notificationLogs.id, log.id));
        console.log(`[NotificationService] Mensaje enviado a +${log.brokerPhone} para Match #${matchId}`);
      } else {
        throw new Error("Cliente de WhatsApp (janiaMatchBotInstance) no inicializado en global");
      }
    } catch (e: any) {
      console.error(`[NotificationService] Error enviando a +${log.brokerPhone}:`, e.message);
      await db.update(notificationLogs).set({
        status: "failed",
        error: e.message || String(e),
      }).where(eq(notificationLogs.id, log.id));
    }
  }
}
