import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { agentJaniaChannels } from "../../drizzle/schema";
import { getUserEffectiveEntitlements } from "./planEntitlements";
import {
  decryptChannelSecret,
  executePrivateJaniaTurn,
  hashVerifyToken,
  type PrivateJaniaTurnResult,
} from "./privateJaniaService";

export interface ParsedCloudInboundMessage {
  wabaId?: string;
  phoneNumberId: string;
  displayPhoneNumber?: string;
  from: string;
  contactName?: string;
  messageId: string;
  timestamp?: string;
  text: string;
}

export interface TenantCloudChannelConfig {
  id: number;
  userId: number;
  agencyId: number | null;
  phoneNumberId: string;
  isActive: boolean;
  accessTokenEncrypted?: string | null;
  appSecretEncrypted?: string | null;
  accessTokenPlain?: string | null;
  appSecretPlain?: string | null;
}

const MAX_PROCESSED_CLOUD_IDS = 5000;
const processedCloudMessageIds = new Set<string>();

export function clearProcessedCloudMessageIdsForTest(): void {
  processedCloudMessageIds.clear();
}

function markAndCheckDuplicateMessageId(messageId: string): boolean {
  if (!messageId) return false;
  if (processedCloudMessageIds.has(messageId)) {
    return true;
  }
  if (processedCloudMessageIds.size >= MAX_PROCESSED_CLOUD_IDS) {
    const oldest = processedCloudMessageIds.values().next().value;
    if (oldest) processedCloudMessageIds.delete(oldest);
  }
  processedCloudMessageIds.add(messageId);
  return false;
}

export function verifyMetaWebhookSignature(
  rawBody: Buffer | string | undefined,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!rawBody || !signatureHeader || !appSecret) return false;
  const expectedPrefix = "sha256=";
  if (!signatureHeader.startsWith(expectedPrefix)) return false;
  const providedHex = signatureHeader.slice(expectedPrefix.length).trim();
  const bodyBuf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");
  const expectedHex = crypto.createHmac("sha256", appSecret).update(bodyBuf).digest("hex");

  const providedBuf = Buffer.from(providedHex, "hex");
  const expectedBuf = Buffer.from(expectedHex, "hex");
  if (providedBuf.length === 0 || providedBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export function parseWhatsAppCloudWebhookPayload(payload: unknown): ParsedCloudInboundMessage[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, any>;
  if (root.object && root.object !== "whatsapp_business_account") {
    return [];
  }

  const entries = Array.isArray(root.entry) ? root.entry : [];
  const messagesOut: ParsedCloudInboundMessage[] = [];

  for (const entry of entries) {
    const wabaId = typeof entry?.id === "string" ? entry.id : undefined;
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value;
      if (!value || typeof value !== "object") continue;
      if (Array.isArray(value.statuses) && (!Array.isArray(value.messages) || value.messages.length === 0)) {
        continue;
      }
      const metadata = value.metadata || {};
      const phoneNumberId = typeof metadata.phone_number_id === "string" ? metadata.phone_number_id.trim() : "";
      if (!phoneNumberId) continue;
      const displayPhoneNumber =
        typeof metadata.display_phone_number === "string" ? metadata.display_phone_number : undefined;

      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      const contactByWaId = new Map<string, string>();
      for (const c of contacts) {
        if (c?.wa_id && c?.profile?.name) {
          contactByWaId.set(String(c.wa_id), String(c.profile.name));
        }
      }

      const msgs = Array.isArray(value.messages) ? value.messages : [];
      for (const m of msgs) {
        const from = typeof m?.from === "string" ? m.from.trim() : "";
        const messageId = typeof m?.id === "string" ? m.id.trim() : "";
        if (!from || !messageId) continue;

        let text = "";
        if (typeof m?.text?.body === "string") {
          text = m.text.body;
        } else if (typeof m?.interactive?.button_reply?.title === "string") {
          text = m.interactive.button_reply.title;
        } else if (typeof m?.interactive?.list_reply?.title === "string") {
          text = m.interactive.list_reply.title;
        } else if (typeof m?.button?.text === "string") {
          text = m.button.text;
        }

        const cleanText = text.trim();
        if (!cleanText) continue;

        messagesOut.push({
          wabaId,
          phoneNumberId,
          displayPhoneNumber,
          from,
          contactName: contactByWaId.get(from),
          messageId,
          timestamp: typeof m?.timestamp === "string" ? m.timestamp : undefined,
          text: cleanText,
        });
      }
    }
  }

  return messagesOut;
}

export async function verifyWhatsAppCloudWebhookGet(query: {
  mode?: string;
  token?: string;
  challenge?: string;
}): Promise<{ verified: boolean; challenge?: string; matchedTenantUserId?: number }> {
  if (query.mode !== "subscribe" || !query.token) {
    return { verified: false };
  }

  if (process.env.WEBHOOK_VERIFY_TOKEN && query.token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return { verified: true, challenge: query.challenge || "" };
  }

  const db = await getDb();
  if (!db) return { verified: false };

  const tokenHash = hashVerifyToken(query.token);
  const [channel] = await db
    .select({
      id: agentJaniaChannels.id,
      userId: agentJaniaChannels.userId,
    })
    .from(agentJaniaChannels)
    .where(
      and(
        eq(agentJaniaChannels.channelType, "whatsapp_cloud_api"),
        eq(agentJaniaChannels.webhookVerifyTokenHash, tokenHash),
      ),
    )
    .limit(1);

  if (!channel) {
    return { verified: false };
  }

  await db
    .update(agentJaniaChannels)
    .set({ lastVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(agentJaniaChannels.id, channel.id));

  return {
    verified: true,
    challenge: query.challenge || "",
    matchedTenantUserId: channel.userId,
  };
}

export async function sendWhatsAppCloudTextMessage(params: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  text: string;
}): Promise<{ ok: boolean; status: number; messageId?: string; error?: string }> {
  if (process.env.NODE_ENV === "test") {
    return { ok: true, status: 200, messageId: "test-mocked-outbound" };
  }
  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(params.phoneNumberId)}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: params.to,
      type: "text",
      text: {
        preview_url: false,
        body: params.text.slice(0, 4000),
      },
    }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: errBody || `HTTP ${res.status}` };
  }

  const data = (await res.json().catch(() => ({}))) as any;
  return {
    ok: true,
    status: res.status,
    messageId: data?.messages?.[0]?.id,
  };
}

async function resolveChannelByPhoneNumberId(
  phoneNumberId: string,
): Promise<TenantCloudChannelConfig | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(agentJaniaChannels)
    .where(
      and(
        eq(agentJaniaChannels.channelType, "whatsapp_cloud_api"),
        eq(agentJaniaChannels.phoneNumberId, phoneNumberId),
        eq(agentJaniaChannels.isActive, true),
      ),
    )
    .limit(1);

  if (!row || !row.phoneNumberId) return null;
  return {
    id: row.id,
    userId: row.userId,
    agencyId: row.agencyId ?? null,
    phoneNumberId: row.phoneNumberId,
    isActive: row.isActive,
    accessTokenEncrypted: row.accessTokenEncrypted,
    appSecretEncrypted: row.appSecretEncrypted,
  };
}

export async function routeWhatsAppCloudWebhookPost(params: {
  payload: unknown;
  rawBody?: Buffer | string;
  signatureHeader?: string;
  channelResolver?: (phoneNumberId: string) => Promise<TenantCloudChannelConfig | null>;
  entitlementChecker?: (userId: number) => Promise<boolean>;
  turnExecutor?: (turnInput: {
    agentUserId: number;
    channelType: "whatsapp_cloud_api";
    message: string;
    visitorName?: string;
    visitorPhone?: string;
  }) => Promise<PrivateJaniaTurnResult>;
  sendReplyFn?: (sendInput: {
    phoneNumberId: string;
    accessToken: string;
    to: string;
    text: string;
  }) => Promise<{ ok: boolean; status: number; messageId?: string; error?: string }>;
}): Promise<{
  processed: number;
  skipped: number;
  errors: string[];
  routes: Array<{ phoneNumberId: string; tenantUserId: number; from: string; messageId: string }>;
}> {
  const inboundMessages = parseWhatsAppCloudWebhookPayload(params.payload);
  let processed = 0;
  let skipped = 0;
  const errors: string[] = [];
  const routes: Array<{ phoneNumberId: string; tenantUserId: number; from: string; messageId: string }> = [];

  const resolver = params.channelResolver || resolveChannelByPhoneNumberId;
  const executor =
    params.turnExecutor ||
    ((turnInput) => executePrivateJaniaTurn(turnInput));
  const sender = params.sendReplyFn || sendWhatsAppCloudTextMessage;

  for (const msg of inboundMessages) {
    if (markAndCheckDuplicateMessageId(msg.messageId)) {
      skipped++;
      continue;
    }

    const channel = await resolver(msg.phoneNumberId);
    if (!channel || !channel.isActive) {
      skipped++;
      errors.push(`Canal WhatsApp Cloud no activo o no encontrado para phone_number_id=${msg.phoneNumberId}`);
      continue;
    }

    const appSecret =
      channel.appSecretPlain ||
      (channel.appSecretEncrypted ? decryptChannelSecret(channel.appSecretEncrypted) : "");
    if (appSecret) {
      const validSig = verifyMetaWebhookSignature(
        params.rawBody ?? JSON.stringify(params.payload),
        params.signatureHeader,
        appSecret,
      );
      if (!validSig) {
        skipped++;
        errors.push(`Firma X-Hub-Signature-256 inválida para tenant=${channel.userId}`);
        continue;
      }
    }

    const byoAllowed = params.entitlementChecker
      ? await params.entitlementChecker(channel.userId)
      : await getUserEffectiveEntitlements(channel.userId).then(
          (ent) => ent.isAdmin || ent.plan.whatsappCloudByoEnabled,
        );

    if (!byoAllowed) {
      skipped++;
      errors.push(`El tenant=${channel.userId} no tiene habilitado WhatsApp Cloud BYO-Number en su plan`);
      continue;
    }

    const accessToken =
      channel.accessTokenPlain ||
      (channel.accessTokenEncrypted ? decryptChannelSecret(channel.accessTokenEncrypted) : "");
    if (!accessToken) {
      skipped++;
      errors.push(`Canal sin Access Token configurado para tenant=${channel.userId}`);
      continue;
    }

    const turnResult = await executor({
      agentUserId: channel.userId,
      channelType: "whatsapp_cloud_api",
      message: msg.text,
      visitorName: msg.contactName,
      visitorPhone: msg.from,
    });

    const delivery = await sender({
      phoneNumberId: channel.phoneNumberId,
      accessToken,
      to: msg.from,
      text: turnResult.reply,
    });

    if (!params.channelResolver) {
      try {
        const db = await getDb();
        if (db) {
          await db
            .update(agentJaniaChannels)
            .set({
              lastInboundAt: new Date(),
              lastError: delivery.ok ? null : delivery.error || `HTTP ${delivery.status}`,
              updatedAt: new Date(),
            })
            .where(eq(agentJaniaChannels.id, channel.id));
        }
      } catch (_) {}
    }

    if (delivery.ok) {
      processed++;
      routes.push({
        phoneNumberId: channel.phoneNumberId,
        tenantUserId: channel.userId,
        from: msg.from,
        messageId: msg.messageId,
      });
    } else {
      errors.push(delivery.error || `Error enviando respuesta Cloud API (${delivery.status})`);
    }
  }

  return { processed, skipped, errors, routes };
}
