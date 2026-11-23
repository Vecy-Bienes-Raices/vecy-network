import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { and, desc, eq, inArray, lte, or } from "drizzle-orm";
import { getDb } from "../db";
import {
  agencies,
  crmActivities,
  emailAccounts,
  emailMessages,
  emailSequenceEnrollments,
  emailSequences,
  emailTemplates,
  emailTrackedLinks,
  leads,
  properties,
  propertyMatches,
  requirements,
  users,
  type EmailAccount,
  type EmailMessage,
  type EmailSequence,
  type EmailSequenceEnrollment,
  type Lead,
  type Property,
} from "../../drizzle/schema";
import type { CertifiedEmailEvidencePayload } from "./emailContractService";
import { ENV } from "./env";
import { invokeLLM } from "./llm";
import { formatShortGreetingName } from "./nameAndGenderResolver";
import { getGreetingByTime } from "./jania/parsers";
import { isPrivateOrReservedIp } from "./urlImportService";
import {
  assertCanSendEmail,
  checkEmailQuotaLimit,
  getUserEffectiveEntitlements,
  incrementUsageQuota,
} from "./planEntitlements";
import {
  type EmailSequenceStep,
  type EmailSequenceTrigger,
  type CrmPipelineStage,
} from "../../shared/crm";

const ALLOWED_SMTP_PORTS = new Set([25, 465, 587, 2525]);

export const CERTIFIED_SENDER_DEFAULT =
  process.env.SMTP_CERTIFIED_FROM_EMAIL || "notificaciones@vecygroup.com";

export const TRANSPARENT_1X1_PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

export interface EmailAttachmentDigest {
  filename: string;
  contentType?: string;
  sizeBytes?: number;
  sha256?: string;
}

export interface EmailTrackingEvent {
  type: "open" | "click";
  occurredAtIso: string;
  occurredAtBogota: string;
  ip?: string | null;
  userAgent?: string | null;
  targetUrl?: string | null;
}

export function formatBogotaTimestamp(date?: Date | string | null): string {
  if (!date) return "N/D";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "N/D";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")} COT (America/Bogota)`;
}

function formatBogotaCompactDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  return `${get("year")}${get("month")}${get("day")}`;
}

export function generateTrackingToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function generateEmailCertificateCode(contentSha256: string, sentAt: Date): string {
  const safeDate = Number.isNaN(sentAt.getTime()) ? new Date() : sentAt;
  const datePart = formatBogotaCompactDate(safeDate);
  const hashPart = String(contentSha256 || "").slice(0, 8).toUpperCase().padEnd(8, "0");
  return `VECY-MAIL-${datePart}-${hashPart}`;
}

export function computeCertifiedEmailHash(input: {
  fromEmail: string;
  toEmail: string;
  replyToEmail?: string | null;
  subject: string;
  bodyHtml: string;
  bodyText?: string | null;
  attachments?: EmailAttachmentDigest[];
  sentAt: Date | string;
}): string {
  const sentDate = input.sentAt instanceof Date ? input.sentAt : new Date(input.sentAt);
  const safeSentDate = Number.isNaN(sentDate.getTime()) ? new Date(0) : sentDate;
  const normalizedAttachments = [...(input.attachments || [])]
    .map((a) => ({
      filename: String(a.filename || "").trim(),
      contentType: String(a.contentType || "application/octet-stream").trim().toLowerCase(),
      sizeBytes: Number(a.sizeBytes || 0),
      sha256: String(a.sha256 || "").trim().toLowerCase(),
    }))
    .sort((a, b) => a.filename.localeCompare(b.filename));

  const canonicalPayload = JSON.stringify({
    standard: "LEY-527-1999-COLOMBIA",
    fromEmail: String(input.fromEmail || "").trim().toLowerCase(),
    toEmail: String(input.toEmail || "").trim().toLowerCase(),
    replyToEmail: String(input.replyToEmail || "").trim().toLowerCase(),
    subject: String(input.subject || ""),
    bodyHtml: String(input.bodyHtml || ""),
    bodyText: String(input.bodyText || ""),
    attachments: normalizedAttachments,
    sentAtIso: safeSentDate.toISOString(),
    sentAtBogota: formatBogotaTimestamp(safeSentDate),
  });

  return crypto.createHash("sha256").update(canonicalPayload, "utf8").digest("hex");
}

export function computeEvidenceChainHash(input: {
  contentSha256: string;
  certificateCode: string;
  providerMessageId?: string | null;
  sentAtIso: string;
  firstOpenedAtIso?: string | null;
  lastOpenedAtIso?: string | null;
  openCount: number;
  firstClickedAtIso?: string | null;
  lastClickedAtIso?: string | null;
  clickCount: number;
  eventsCount: number;
}): string {
  const canonicalEvidence = JSON.stringify({
    standard: "LEY-527-1999-CADENA-PROBATORIA",
    contentSha256: String(input.contentSha256 || ""),
    certificateCode: String(input.certificateCode || ""),
    providerMessageId: String(input.providerMessageId || ""),
    sentAtIso: String(input.sentAtIso || ""),
    firstOpenedAtIso: input.firstOpenedAtIso || null,
    lastOpenedAtIso: input.lastOpenedAtIso || null,
    openCount: Number(input.openCount || 0),
    firstClickedAtIso: input.firstClickedAtIso || null,
    lastClickedAtIso: input.lastClickedAtIso || null,
    clickCount: Number(input.clickCount || 0),
    eventsCount: Number(input.eventsCount || 0),
  });
  return crypto.createHash("sha256").update(canonicalEvidence, "utf8").digest("hex");
}

export function instrumentEmailHtmlForTracking(params: {
  html: string;
  openTrackingToken: string;
  baseUrl?: string;
  createLinkToken?: (targetUrl: string) => string;
}): { html: string; trackedLinks: Array<{ token: string; targetUrl: string }> } {
  const cleanBase = (
    params.baseUrl ||
    ENV.publicBaseUrl ||
    ENV.appUrl ||
    "https://vecygroup.com"
  )
    .trim()
    .replace(/\/+$/, "");

  const tokenByUrl = new Map<string, string>();
  const trackedLinks: Array<{ token: string; targetUrl: string }> = [];

  const rewrittenHtml = String(params.html || "").replace(
    /<a\b([^>]*?)\bhref=(["'])(https?:\/\/[^"']+)\2([^>]*)>/gi,
    (fullMatch, beforeAttr: string, quote: string, rawUrl: string, afterAttr: string) => {
      if (rawUrl.includes("/api/email/track/")) {
        return fullMatch;
      }
      const cleanUrl = rawUrl.replace(/&amp;/g, "&").trim();
      let token = tokenByUrl.get(cleanUrl);
      if (!token) {
        token = params.createLinkToken
          ? params.createLinkToken(cleanUrl)
          : generateTrackingToken();
        tokenByUrl.set(cleanUrl, token);
        trackedLinks.push({ token, targetUrl: cleanUrl });
      }
      const trackedUrl = `${cleanBase}/api/email/track/click/${encodeURIComponent(token)}`;
      return `<a${beforeAttr} href=${quote}${trackedUrl}${quote}${afterAttr}>`;
    },
  );

  const pixelUrl = `${cleanBase}/api/email/track/open/${encodeURIComponent(params.openTrackingToken)}.png`;
  const pixelImg = `<img src="${pixelUrl}" alt="" width="1" height="1" style="display:block;width:1px;height:1px;opacity:0;border:0;overflow:hidden;" />`;

  const finalHtml = /<\/body>/i.test(rewrittenHtml)
    ? rewrittenHtml.replace(/<\/body>/i, `${pixelImg}\n</body>`)
    : `${rewrittenHtml}\n${pixelImg}`;

  return {
    html: finalHtml,
    trackedLinks,
  };
}

export function extractClientIpFromHeaders(
  headers: Record<string, string | string[] | undefined>,
  fallbackIp?: string | null,
): string | null {
  const cfIp = headers["cf-connecting-ip"];
  const xff = headers["x-forwarded-for"];
  const xri = headers["x-real-ip"];
  const pickFirst = (val?: string | string[]) => {
    if (!val) return "";
    const str = Array.isArray(val) ? val[0] : val;
    return String(str || "").split(",")[0].trim();
  };
  const resolved = pickFirst(cfIp) || pickFirst(xff) || pickFirst(xri) || String(fallbackIp || "").trim();
  return resolved ? resolved.slice(0, 64) : null;
}

function deriveAes256Key(masterSecret?: string): Buffer {
  const seed =
    masterSecret ||
    process.env.SMTP_ENCRYPTION_KEY ||
    ENV.cookieSecret ||
    process.env.JWT_SECRET ||
    "vecy-network-smtp-fallback-key-2026";
  return crypto.createHash("sha256").update(seed).digest();
}

/**
 * Cifrado autenticado AES-256-GCM para credenciales SMTP por agente/agencia.
 */
export function encryptSmtpSecret(plaintext: string, masterSecret?: string): string {
  if (!plaintext) {
    throw new Error("La contraseña SMTP no puede estar vacía.");
  }
  const key = deriveAes256Key(masterSecret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSmtpSecret(payload: string, masterSecret?: string): string {
  const parts = String(payload || "").split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Formato de credencial SMTP cifrada inválido.");
  }
  const iv = Buffer.from(parts[1], "base64");
  const authTag = Buffer.from(parts[2], "base64");
  const encrypted = Buffer.from(parts[3], "base64");
  if (iv.length !== 12 || authTag.length !== 16) {
    throw new Error("Metadatos criptográficos SMTP inválidos.");
  }
  const key = deriveAes256Key(masterSecret);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export function validateSmtpHostSafety(
  hostRaw: string,
  port: number,
): { valid: boolean; reason?: string } {
  const host = (hostRaw || "").trim().toLowerCase();
  if (!host || host.length > 255 || /\s/.test(host)) {
    return { valid: false, reason: "Host SMTP inválido." };
  }
  if (!ALLOWED_SMTP_PORTS.has(Number(port))) {
    return {
      valid: false,
      reason: `Puerto SMTP ${port} no permitido. Usa 465, 587, 25 o 2525.`,
    };
  }
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "metadata.google.internal" ||
    host === "169.254.169.254"
  ) {
    return { valid: false, reason: "Host SMTP bloqueado por política anti-SSRF." };
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) {
    if (isPrivateOrReservedIp(host)) {
      return { valid: false, reason: "Dirección IP privada o reservada bloqueada para SMTP." };
    }
  }
  if (!host.includes(".")) {
    return { valid: false, reason: "El host SMTP debe ser un dominio público FQDN válido." };
  }
  return { valid: true };
}

export function isDeliverableEmail(email?: string | null): boolean {
  const clean = (email || "").trim().toLowerCase();
  if (!clean) return false;
  if (clean.endsWith("@vecy.local")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
}

export function escapeHtml(input: string): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderEmailTemplate(
  template: string,
  variables: Record<string, string | number | null | undefined>,
  options?: { escapeForHtml?: boolean },
): string {
  const shouldEscape = options?.escapeForHtml ?? true;
  return String(template || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const raw = variables[key];
    if (raw === null || raw === undefined || raw === "") {
      return "";
    }
    const strVal = String(raw);
    return shouldEscape ? escapeHtml(strVal) : strVal;
  });
}

export function htmlToPlainText(html: string): string {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function wrapInBrandedEmailShell(params: {
  bodyHtml: string;
  brandName: string;
  primaryColor?: string | null;
  signatureHtml?: string | null;
  footerNote?: string | null;
}): string {
  const safeBrand = escapeHtml(params.brandName || "Vecy Bienes Raíces");
  const color = /^#[0-9A-Fa-f]{6}$/.test(params.primaryColor || "")
    ? params.primaryColor!
    : "#bf953f";
  const signatureBlock = params.signatureHtml
    ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#374151;">${params.signatureHtml}</div>`
    : "";
  const footerText = escapeHtml(
    params.footerNote || `Enviado desde ${params.brandName || "VECY Network"} • CRM Inmobiliario`,
  );

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <div style="max-width:620px;margin:24px auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e4e4e7;box-shadow:0 8px 24px rgba(0,0,0,0.06);">
    <div style="background:#09090b;padding:20px 28px;border-bottom:3px solid ${color};">
      <div style="font-size:18px;font-weight:800;letter-spacing:0.6px;color:${color};text-transform:uppercase;">${safeBrand}</div>
    </div>
    <div style="padding:28px;font-size:15px;line-height:1.65;color:#1f2937;">
      ${params.bodyHtml}
      ${signatureBlock}
    </div>
    <div style="background:#fafafa;padding:14px 28px;border-top:1px solid #e4e4e7;font-size:11px;color:#71717a;text-align:center;">
      ${footerText}
    </div>
  </div>
</body>
</html>`;
}

export const DEFAULT_LEAD_SEQUENCE_STEPS: EmailSequenceStep[] = [
  {
    stepOrder: 0,
    delayHours: 0,
    subjectTemplate: "Hola {{lead_first_name}}, recibimos tu consulta en {{agency_name}}",
    bodyHtmlTemplate:
      "<p>Hola <strong>{{lead_first_name}}</strong>,</p><p>Soy <strong>{{agent_name}}</strong> de <strong>{{agency_name}}</strong>. Recibimos tu solicitud sobre <strong>{{property_name}}</strong> en <strong>{{lead_zone}}</strong>.</p><p>Estoy atento para enviarte información completa, resolver dudas financieras o agendar una visita personalizada. Puedes responder directamente a este correo o escribirme al {{agent_phone}}.</p>",
    useAiPersonalization: true,
    aiGoal: "welcome",
  },
  {
    stepOrder: 1,
    delayHours: 24,
    subjectTemplate: "{{lead_first_name}}, ¿te comparto opciones verificadas en {{lead_zone}}?",
    bodyHtmlTemplate:
      "<p>Hola <strong>{{lead_first_name}}</strong>,</p><p>Quería confirmar si pudiste revisar la información enviada ayer. Si buscas ajustar metraje, presupuesto ({{lead_budget}}) o comparar inmuebles similares en <strong>{{lead_zone}}</strong>, con gusto te preparo una selección curada hoy mismo.</p>",
    useAiPersonalization: true,
    aiGoal: "followup_24h",
  },
  {
    stepOrder: 2,
    delayHours: 72,
    subjectTemplate: "Disponibilidad de agenda esta semana — {{agency_name}}",
    bodyHtmlTemplate:
      "<p>Hola <strong>{{lead_first_name}}</strong>,</p><p>Esta semana contamos con espacios disponibles para visitas presenciales o recorridos virtuales y revisión de condiciones de negociación.</p><p>Respóndeme con el horario que mejor se adapte a tu agenda para reservar tu espacio.</p>",
    useAiPersonalization: true,
    aiGoal: "followup_72h",
  },
];

export const DEFAULT_MATCH_SEQUENCE_STEPS: EmailSequenceStep[] = [
  {
    stepOrder: 0,
    delayHours: 0,
    subjectTemplate: "🎯 Coincidencia {{match_score}}% encontrada: {{property_name}}",
    bodyHtmlTemplate:
      "<p>Hola <strong>{{lead_first_name}}</strong>,</p><p>Nuestro motor inteligente identificó un inmueble con <strong>{{match_score}}% de compatibilidad</strong> para tu búsqueda: <strong>{{property_name}}</strong> en <strong>{{property_zone}}, {{property_city}}</strong> ({{property_price}}).</p><p>Por su alta afinidad te recomiendo agendar una revisión prioritaria antes de que se reserve. Respóndeme para enviarte la ficha y coordinar visita.</p>",
    useAiPersonalization: true,
    aiGoal: "match_alert",
  },
];

export function computeNextStepRunAt(baseDate: Date, delayDeltaHours: number): Date {
  const safeHours = Math.max(0, Number(delayDeltaHours) || 0);
  return new Date(baseDate.getTime() + safeHours * 60 * 60 * 1000);
}

export function evaluateSequenceEnrollmentStep(params: {
  enrollmentStatus: string;
  currentStepIndex: number;
  steps: EmailSequenceStep[];
  leadStage: string;
  stopOnStageChange: boolean;
  stopStages: string[];
  nextRunAt?: Date | null;
  now?: Date;
}): {
  action: "send_step" | "stop_stage" | "complete" | "wait";
  step?: EmailSequenceStep;
  nextStepDelayDeltaHours?: number;
} {
  if (params.enrollmentStatus !== "active") {
    return { action: "wait" };
  }
  const orderedSteps = [...(params.steps || [])].sort(
    (a, b) => Number(a.stepOrder ?? 0) - Number(b.stepOrder ?? 0),
  );
  if (params.currentStepIndex >= orderedSteps.length) {
    return { action: "complete" };
  }
  const normalizedStage = (params.leadStage || "").toLowerCase();
  const normalizedStopStages = (params.stopStages || []).map((s) => s.toLowerCase());
  if (normalizedStopStages.includes(normalizedStage)) {
    return { action: "stop_stage" };
  }
  if (params.stopOnStageChange && normalizedStage !== "nuevo") {
    return { action: "stop_stage" };
  }

  const nowMs = (params.now ?? new Date()).getTime();
  if (params.nextRunAt && params.nextRunAt.getTime() > nowMs) {
    return { action: "wait" };
  }

  const step = orderedSteps[params.currentStepIndex];
  const nextStep = orderedSteps[params.currentStepIndex + 1];
  const nextStepDelayDeltaHours = nextStep
    ? Math.max(1, Number(nextStep.delayHours ?? 24) - Number(step.delayHours ?? 0))
    : undefined;

  return {
    action: "send_step",
    step,
    nextStepDelayDeltaHours,
  };
}

export interface GenerateAiDraftInput {
  lead: Partial<Lead> & { name: string; email?: string | null };
  property?: Partial<Property> | null;
  matchScore?: number | null;
  agentName?: string | null;
  agencyName?: string | null;
  agentPhone?: string | null;
  intent: "welcome" | "followup_24h" | "followup_72h" | "match_alert" | "visit_confirmation" | "reply";
  tone?: "profesional" | "cercano" | "ejecutivo" | "persuasivo";
  customInstructions?: string | null;
  incomingMessage?: string | null;
  referenceDate?: Date;
  llmFn?: (messages: Array<{ role: "system" | "user"; content: string }>) => Promise<string>;
}

export interface GeneratedEmailDraft {
  subject: string;
  bodyHtml: string;
  bodyText: string;
  aiGenerated: boolean;
  usedFallback: boolean;
}

function formatCopCurrency(val?: string | number | null): string {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return "Por definir";
  return `$${Math.round(num).toLocaleString("es-CO")} COP`;
}

function buildFallbackEmailDraft(input: GenerateAiDraftInput): GeneratedEmailDraft {
  const shortLeadName = formatShortGreetingName(input.lead.name, "Hola");
  const greetingTime = getGreetingByTime(input.referenceDate);
  const saludo =
    shortLeadName && shortLeadName !== "Hola"
      ? `${greetingTime}, ${shortLeadName}`
      : `${greetingTime}`;
  const agency = input.agencyName || "Vecy Bienes Raíces";
  const agent = input.agentName || "Tu asesor inmobiliario";
  const phoneText = input.agentPhone ? ` o al WhatsApp ${input.agentPhone}` : "";

  const propName = input.property?.name || "nuestra selección inmobiliaria";
  const propZone =
    input.property?.addressNeighborhood ||
    input.property?.zone ||
    input.lead.preferredZone ||
    "tu sector de interés";
  const propCity =
    input.property?.addressCity ||
    input.property?.city ||
    input.lead.preferredCity ||
    "Colombia";
  const propPrice = input.property?.price ? formatCopCurrency(input.property.price) : "";
  const propSpecs = [
    input.property?.areaTotal ? `${input.property.areaTotal} m²` : null,
    input.property?.bedrooms ? `${input.property.bedrooms} habitaciones` : null,
    input.property?.bathrooms ? `${input.property.bathrooms} baños` : null,
    input.property?.garages ? `${input.property.garages} garajes` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  let subject = `Seguimiento inmobiliario — ${agency}`;
  const paragraphs: string[] = [`${saludo},`];

  if (input.intent === "match_alert") {
    const scoreLabel = input.matchScore ? `${Math.round(input.matchScore)}%` : "alta compatibilidad";
    subject = `🎯 Match ${scoreLabel}: ${propName} en ${propZone}`;
    paragraphs.push(
      `Nuestro sistema inteligente de ${agency} encontró una coincidencia del ${scoreLabel} con tu búsqueda: ${propName} en ${propZone}, ${propCity}${propPrice ? ` (${propPrice})` : ""}.`,
    );
    if (propSpecs) {
      paragraphs.push(`Características destacadas: ${propSpecs}.`);
    }
    paragraphs.push(
      `¿Te gustaría recibir la ficha técnica completa o coordinar una visita esta semana? Responde este correo${phoneText}.`,
    );
  } else if (input.intent === "followup_24h") {
    subject = `${shortLeadName}, opciones verificadas en ${propZone}`;
    paragraphs.push(
      `Soy ${agent} de ${agency}. Quería confirmar si pudiste revisar la información sobre ${propName} en ${propZone}.`,
    );
    if (input.lead.estimatedBudget) {
      paragraphs.push(
        `Tengo presentes tus parámetros de búsqueda (presupuesto estimado ${formatCopCurrency(input.lead.estimatedBudget)}) para enviarte hasta 3 alternativas comparables si lo deseas.`,
      );
    }
    paragraphs.push(`Quedo atento por este medio${phoneText}.`);
  } else if (input.intent === "followup_72h") {
    subject = `Disponibilidad de visita esta semana: ${propName}`;
    paragraphs.push(
      `Soy ${agent} de ${agency}. Esta semana contamos con agenda abierta para visitar ${propName} en ${propZone} y revisar condiciones comerciales y documentales con total transparencia.`,
    );
    paragraphs.push(`Indícame qué día y franja horaria te funciona mejor para reservarte el espacio${phoneText}.`);
  } else if (input.intent === "visit_confirmation") {
    subject = `Confirmación de acompañamiento y visita — ${propName}`;
    paragraphs.push(
      `Gracias por agendar con ${agency}. Estaré acompañando personalmente tu recorrido por ${propName} en ${propZone}, ${propCity}.`,
    );
    paragraphs.push(`Si necesitas ajustar la hora o resolver dudas previas, respóndeme por aquí${phoneText}.`);
  } else if (input.intent === "reply") {
    subject = `Re: Tu consulta sobre ${propName} — ${agency}`;
    paragraphs.push(
      `Gracias por escribirnos a ${agency}. Sobre tu mensaje${input.incomingMessage ? ` ("${input.incomingMessage.slice(0, 120)}")` : ""}, con gusto te confirmo que ${propName} en ${propZone}${propPrice ? ` (${propPrice})` : ""} sigue en portafolio.`,
    );
    if (propSpecs) {
      paragraphs.push(`Ficha resumida: ${propSpecs}.`);
    }
    paragraphs.push(`¿Coordinamos una llamada breve o visita presencial? Respóndeme por aquí${phoneText}.`);
  } else {
    subject = `Hola ${shortLeadName}, recibimos tu interés en ${propName}`;
    paragraphs.push(
      `Soy ${agent} de ${agency}. Gracias por contactarnos${input.property ? ` por ${propName} en ${propZone}, ${propCity}` : ""}.`,
    );
    if (propSpecs || propPrice) {
      paragraphs.push(
        `Resumen rápido: ${[propPrice, propSpecs].filter(Boolean).join(" • ")}.`,
      );
    }
    paragraphs.push(
      `Cuéntame en qué horario prefieres conversar para enviarte la ficha y coordinar una visita${phoneText}.`,
    );
  }

  if (input.customInstructions && input.customInstructions.trim()) {
    paragraphs.push(input.customInstructions.trim());
  }

  const bodyText = paragraphs.join("\n\n");
  const bodyHtml = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n");

  return {
    subject: subject.slice(0, 280),
    bodyHtml,
    bodyText,
    aiGenerated: true,
    usedFallback: true,
  };
}

export async function generateAiEmailDraft(
  input: GenerateAiDraftInput,
): Promise<GeneratedEmailDraft> {
  const shortLeadName = formatShortGreetingName(input.lead.name, "Cliente");
  const greetingTime = getGreetingByTime(input.referenceDate);
  const tone = input.tone || "profesional";

  const contextLines = [
    `Prospecto: ${input.lead.name} (saludo corto obligatorio: "${greetingTime}, ${shortLeadName}")`,
    `Tipo de interés: ${input.lead.inquiryType || "general"}`,
    input.lead.preferredZone || input.lead.preferredCity
      ? `Zona/Ciudad buscada: ${[input.lead.preferredZone, input.lead.preferredCity].filter(Boolean).join(", ")}`
      : null,
    input.lead.estimatedBudget ? `Presupuesto estimado: ${formatCopCurrency(input.lead.estimatedBudget)}` : null,
    input.lead.notes ? `Notas del asesor: ${input.lead.notes}` : null,
    input.property
      ? `Inmueble real: ${input.property.name} | Tipo: ${input.property.propertyType} | Negocio: ${input.property.transactionType} | Precio: ${formatCopCurrency(input.property.price)} | Ubicación: ${input.property.addressNeighborhood || input.property.zone}, ${input.property.addressCity || input.property.city || "Colombia"} | Área: ${input.property.areaTotal || "N/D"} m² | Alcobas: ${input.property.bedrooms ?? "N/D"} | Baños: ${input.property.bathrooms ?? "N/D"} | Garajes: ${input.property.garages ?? "N/D"}`
      : null,
    input.matchScore ? `Score de Match: ${Math.round(input.matchScore)}%` : null,
    input.incomingMessage ? `Mensaje recibido del prospecto: "${input.incomingMessage}"` : null,
    input.customInstructions ? `Instrucción adicional del asesor: ${input.customInstructions}` : null,
    `Asesor: ${input.agentName || "Asesor Inmobiliario"} | Agencia: ${input.agencyName || "Vecy Bienes Raíces"} | Tel: ${input.agentPhone || "N/D"}`,
  ].filter(Boolean);

  if (process.env.NODE_ENV === "test" && !input.llmFn) {
    return buildFallbackEmailDraft(input);
  }

  const systemPrompt = `Eres un asistente comercial inmobiliario colombiano experto de alto nivel.
Redacta UN correo electrónico en español colombiano natural, tono ${tone}, usando EXCLUSIVAMENTE los datos reales proporcionados (no inventes precios, direcciones ni metros).
Usa el saludo horario colombiano exacto indicado.
Devuelve SOLO un JSON válido con las claves exactas: {"subject": string, "paragraphs": string[]}.
Máximo 4 párrafos concisos, claros y orientados a conversión (respuesta o cita).`;

  const userPrompt = `Objetivo del correo: ${input.intent}\n\nDATOS REALES:\n${contextLines.join("\n")}`;

  try {
    let rawContent = "";
    if (input.llmFn) {
      rawContent = await input.llmFn([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);
    } else {
      const llmRes = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        responseFormat: { type: "json_object" },
        highReasoning: false,
        allowPaidFailover: false,
      });
      rawContent =
        typeof llmRes?.choices?.[0]?.message?.content === "string"
          ? llmRes.choices[0].message.content
          : "";
    }

    const cleanedJson = rawContent
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(cleanedJson);
    const subject = typeof parsed?.subject === "string" ? parsed.subject.trim() : "";
    const paragraphs: string[] = Array.isArray(parsed?.paragraphs)
      ? parsed.paragraphs.map((p: unknown) => String(p || "").trim()).filter(Boolean)
      : [];

    if (!subject || paragraphs.length === 0) {
      return buildFallbackEmailDraft(input);
    }

    return {
      subject: subject.slice(0, 280),
      bodyHtml: paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n"),
      bodyText: paragraphs.join("\n\n"),
      aiGenerated: true,
      usedFallback: false,
    };
  } catch {
    return buildFallbackEmailDraft(input);
  }
}

export interface TransportSendPayload {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}

export type TransportSenderFn = (
  payload: TransportSendPayload,
  account: ResolvedSendingIdentity,
) => Promise<{ messageId: string }>;

export interface ResolvedSendingIdentity {
  accountId: number | null;
  mode: "vecy_relay" | "custom_smtp";
  displayName: string;
  fromEmail: string;
  certifiedFromEmail: string;
  replyToEmail: string;
  signatureHtml: string | null;
  agencyName: string;
  primaryColor: string;
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
}

export async function resolveSendingIdentityForUser(
  userId: number,
): Promise<ResolvedSendingIdentity> {
  const db = await getDb();
  const defaultRelayUser = process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER || "vecybienesraices@gmail.com";
  const certifiedRelayEmail =
    process.env.SMTP_CERTIFIED_FROM_EMAIL ||
    (process.env.SMTP_FROM_EMAIL?.toLowerCase().includes("@vecygroup.com")
      ? process.env.SMTP_FROM_EMAIL
      : CERTIFIED_SENDER_DEFAULT);

  if (!db) {
    return {
      accountId: null,
      mode: "vecy_relay",
      displayName: "Vecy Bienes Raíces",
      fromEmail: defaultRelayUser,
      certifiedFromEmail: certifiedRelayEmail,
      replyToEmail: defaultRelayUser,
      signatureHtml: null,
      agencyName: "Vecy Bienes Raíces",
      primaryColor: "#bf953f",
    };
  }

  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const [accountRow] = await db
    .select()
    .from(emailAccounts)
    .where(eq(emailAccounts.userId, userId))
    .limit(1);

  let agencyRow: { brandName?: string; primaryColor?: string; contactEmail?: string | null } | undefined;
  if (userRow?.defaultAgencyId) {
    const [ag] = await db
      .select({
        brandName: agencies.brandName,
        primaryColor: agencies.primaryColor,
        contactEmail: agencies.contactEmail,
      })
      .from(agencies)
      .where(eq(agencies.id, userRow.defaultAgencyId))
      .limit(1);
    agencyRow = ag;
  }

  const theme = (userRow?.themeConfig as any) || {};
  const agencyName = agencyRow?.brandName || theme.agencyName || userRow?.name || "Vecy Bienes Raíces";
  const primaryColor = agencyRow?.primaryColor || theme.primaryColor || "#bf953f";
  const fallbackReplyTo =
    accountRow?.replyToEmail ||
    agencyRow?.contactEmail ||
    theme.contactEmail ||
    userRow?.email ||
    defaultRelayUser;

  if (accountRow && accountRow.mode === "custom_smtp" && accountRow.smtpHost && accountRow.smtpUser && accountRow.smtpPasswordEncrypted) {
    const decryptedPass = decryptSmtpSecret(accountRow.smtpPasswordEncrypted);
    const safety = validateSmtpHostSafety(accountRow.smtpHost, accountRow.smtpPort);
    if (!safety.valid) {
      throw new Error(safety.reason || "Configuración SMTP propia bloqueada por seguridad.");
    }
    const customFrom = accountRow.fromEmail || accountRow.smtpUser;
    return {
      accountId: accountRow.id,
      mode: "custom_smtp",
      displayName: accountRow.displayName || agencyName,
      fromEmail: customFrom,
      certifiedFromEmail: customFrom,
      replyToEmail: fallbackReplyTo,
      signatureHtml: accountRow.signatureHtml ?? null,
      agencyName,
      primaryColor,
      smtpConfig: {
        host: accountRow.smtpHost,
        port: accountRow.smtpPort,
        secure: accountRow.smtpSecure,
        user: accountRow.smtpUser,
        pass: decryptedPass,
      },
    };
  }

  return {
    accountId: accountRow?.id ?? null,
    mode: "vecy_relay",
    displayName: accountRow?.displayName || userRow?.name || agencyName,
    fromEmail: defaultRelayUser,
    certifiedFromEmail: certifiedRelayEmail,
    replyToEmail: fallbackReplyTo,
    signatureHtml: accountRow?.signatureHtml ?? null,
    agencyName,
    primaryColor,
  };
}

async function defaultNodemailerSend(
  payload: TransportSendPayload,
  identity: ResolvedSendingIdentity,
): Promise<{ messageId: string }> {
  if (process.env.NODE_ENV === "test") {
    return { messageId: `mock-vecy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  }

  if (identity.mode === "custom_smtp" && identity.smtpConfig) {
    const transporter = nodemailer.createTransport({
      host: identity.smtpConfig.host,
      port: identity.smtpConfig.port,
      secure: identity.smtpConfig.secure,
      auth: {
        user: identity.smtpConfig.user,
        pass: identity.smtpConfig.pass,
      },
    });
    const info = await transporter.sendMail({
      from: `"${identity.displayName.replace(/"/g, "")}" <${identity.fromEmail}>`,
      to: payload.to,
      replyTo: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    return { messageId: info.messageId || `smtp-${Date.now()}` };
  }

  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const smtpUser = process.env.GMAIL_USER || "vecybienesraices@gmail.com";
  const smtpPass = process.env.GMAIL_APP_PASSWORD || "dwjnngwfmsmjxvgi";

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const info = await transporter.sendMail({
    from: `"${identity.displayName.replace(/"/g, "")} (${identity.agencyName.replace(/"/g, "")})" <${smtpUser}>`,
    to: payload.to,
    replyTo: payload.replyTo,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
  return { messageId: info.messageId || `relay-${Date.now()}` };
}

export async function verifySmtpConnection(params: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}): Promise<{ ok: boolean; error?: string }> {
  const safety = validateSmtpHostSafety(params.host, params.port);
  if (!safety.valid) {
    return { ok: false, error: safety.reason };
  }
  if (process.env.NODE_ENV === "test") {
    return { ok: true };
  }
  try {
    const transporter = nodemailer.createTransport({
      host: params.host,
      port: params.port,
      secure: params.secure,
      auth: { user: params.user, pass: params.pass },
      connectionTimeout: 8000,
    });
    await transporter.verify();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "No se pudo autenticar con el servidor SMTP." };
  }
}

export interface SendCrmEmailInput {
  userId: number;
  userRole?: string;
  agencyId?: number | null;
  leadId?: number | null;
  sequenceId?: number | null;
  enrollmentId?: number | null;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  scheduledFor?: Date | null;
  aiGenerated?: boolean;
  notifyOnOpen?: boolean;
  attachments?: EmailAttachmentDigest[];
  baseUrl?: string;
  metadata?: Record<string, unknown>;
  skipThrowOnQuota?: boolean;
  transportSender?: TransportSenderFn;
}

export async function sendOrQueueCrmEmail(input: SendCrmEmailInput) {
  const db = await getDb();
  if (!db) {
    throw new Error("Base de datos no disponible");
  }

  if (!isDeliverableEmail(input.toEmail)) {
    throw new Error("El destinatario no tiene un correo electrónico válido y entregable.");
  }

  const identity = await resolveSendingIdentityForUser(input.userId);
  const now = new Date();
  const isFutureSchedule = Boolean(
    input.scheduledFor && input.scheduledFor.getTime() > now.getTime() + 30_000,
  );

  // Verificar cuota del plan antes de encolar o enviar
  const ent = await getUserEffectiveEntitlements(input.userId, input.userRole);
  const quotaCheck = checkEmailQuotaLimit({
    isAdmin: ent.isAdmin,
    maxEmailsPerMonth: ent.plan.maxEmailsPerMonth ?? ent.plan.emailCampaignsMonthlyQuota,
    used: ent.usage.emailCampaignsUsed,
    requestedCount: 1,
  });

  if (!quotaCheck.allowed) {
    if (!input.skipThrowOnQuota) {
      await assertCanSendEmail(input.userId, input.userRole, 1);
    }
    const [blockedMsg] = await db
      .insert(emailMessages)
      .values({
        userId: input.userId,
        agencyId: input.agencyId ?? ent.defaultAgencyId ?? null,
        leadId: input.leadId ?? null,
        accountId: identity.accountId,
        sequenceId: input.sequenceId ?? null,
        enrollmentId: input.enrollmentId ?? null,
        direction: "outbound",
        toEmail: input.toEmail.trim().toLowerCase(),
        fromEmail: identity.certifiedFromEmail,
        replyToEmail: identity.replyToEmail,
        subject: input.subject.slice(0, 300),
        bodyHtml: input.bodyHtml,
        bodyText: input.bodyText ?? htmlToPlainText(input.bodyHtml),
        status: "quota_blocked",
        errorMessage: quotaCheck.reason || "Cuota mensual de correos agotada.",
        scheduledFor: input.scheduledFor ?? null,
        aiGenerated: Boolean(input.aiGenerated),
        notifyOnOpen: Boolean(input.notifyOnOpen),
        attachmentsJson: input.attachments ?? [],
        metadata: input.metadata ?? null,
      })
      .returning();

    return {
      message: blockedMsg,
      status: "quota_blocked" as const,
      error: quotaCheck.reason,
    };
  }

  const wrappedHtml = wrapInBrandedEmailShell({
    bodyHtml: input.bodyHtml,
    brandName: identity.agencyName,
    primaryColor: identity.primaryColor,
    signatureHtml: identity.signatureHtml,
  });
  const plainText = input.bodyText?.trim() || htmlToPlainText(input.bodyHtml);

  if (isFutureSchedule) {
    const trackingToken = generateTrackingToken();
    const contentSha256 = computeCertifiedEmailHash({
      fromEmail: identity.certifiedFromEmail,
      toEmail: input.toEmail.trim().toLowerCase(),
      replyToEmail: identity.replyToEmail,
      subject: input.subject.slice(0, 300),
      bodyHtml: wrappedHtml,
      bodyText: plainText,
      attachments: input.attachments ?? [],
      sentAt: input.scheduledFor!,
    });
    const certificateCode = generateEmailCertificateCode(contentSha256, input.scheduledFor!);
    const evidenceSha256 = computeEvidenceChainHash({
      contentSha256,
      certificateCode,
      sentAtIso: input.scheduledFor!.toISOString(),
      openCount: 0,
      clickCount: 0,
      eventsCount: 0,
    });
    const [queuedMsg] = await db
      .insert(emailMessages)
      .values({
        userId: input.userId,
        agencyId: input.agencyId ?? ent.defaultAgencyId ?? null,
        leadId: input.leadId ?? null,
        accountId: identity.accountId,
        sequenceId: input.sequenceId ?? null,
        enrollmentId: input.enrollmentId ?? null,
        direction: "outbound",
        toEmail: input.toEmail.trim().toLowerCase(),
        fromEmail: identity.certifiedFromEmail,
        replyToEmail: identity.replyToEmail,
        subject: input.subject.slice(0, 300),
        bodyHtml: wrappedHtml,
        bodyText: plainText,
        status: "queued",
        scheduledFor: input.scheduledFor!,
        aiGenerated: Boolean(input.aiGenerated),
        notifyOnOpen: Boolean(input.notifyOnOpen),
        attachmentsJson: input.attachments ?? [],
        trackingToken,
        certificateCode,
        contentSha256,
        evidenceSha256,
        metadata: input.metadata ?? null,
      })
      .returning();

    return {
      message: queuedMsg,
      status: "queued" as const,
    };
  }

  return await dispatchPreparedEmailMessage({
    userId: input.userId,
    agencyId: input.agencyId ?? ent.defaultAgencyId ?? null,
    leadId: input.leadId ?? null,
    identity,
    sequenceId: input.sequenceId ?? null,
    enrollmentId: input.enrollmentId ?? null,
    toEmail: input.toEmail.trim().toLowerCase(),
    subject: input.subject.slice(0, 300),
    wrappedHtml,
    plainText,
    aiGenerated: Boolean(input.aiGenerated),
    notifyOnOpen: Boolean(input.notifyOnOpen),
    attachments: input.attachments ?? [],
    baseUrl: input.baseUrl,
    metadata: input.metadata ?? null,
    transportSender: input.transportSender,
  });
}

async function dispatchPreparedEmailMessage(params: {
  existingMessageId?: number;
  userId: number;
  agencyId: number | null;
  leadId: number | null;
  identity: ResolvedSendingIdentity;
  sequenceId: number | null;
  enrollmentId: number | null;
  toEmail: string;
  subject: string;
  wrappedHtml: string;
  plainText: string;
  aiGenerated: boolean;
  notifyOnOpen?: boolean;
  attachments?: EmailAttachmentDigest[];
  baseUrl?: string;
  metadata: Record<string, unknown> | null;
  transportSender?: TransportSenderFn;
}) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");

  const sender = params.transportSender || defaultNodemailerSend;
  const now = new Date();
  const trackingToken = generateTrackingToken();
  const cleanTo = params.toEmail.trim().toLowerCase();
  const attachments = params.attachments ?? [];

  const contentSha256 = computeCertifiedEmailHash({
    fromEmail: params.identity.certifiedFromEmail,
    toEmail: cleanTo,
    replyToEmail: params.identity.replyToEmail,
    subject: params.subject,
    bodyHtml: params.wrappedHtml,
    bodyText: params.plainText,
    attachments,
    sentAt: now,
  });
  const certificateCode = generateEmailCertificateCode(contentSha256, now);
  const instrumented = instrumentEmailHtmlForTracking({
    html: params.wrappedHtml,
    openTrackingToken: trackingToken,
    baseUrl: params.baseUrl,
  });

  try {
    const sendResult = await sender(
      {
        from: params.identity.fromEmail,
        to: cleanTo,
        replyTo: params.identity.replyToEmail,
        subject: params.subject,
        html: instrumented.html,
        text: params.plainText,
      },
      params.identity,
    );

    const evidenceSha256 = computeEvidenceChainHash({
      contentSha256,
      certificateCode,
      providerMessageId: sendResult.messageId,
      sentAtIso: now.toISOString(),
      openCount: 0,
      clickCount: 0,
      eventsCount: 0,
    });

    let savedMsg;
    if (params.existingMessageId) {
      const [updated] = await db
        .update(emailMessages)
        .set({
          fromEmail: params.identity.certifiedFromEmail,
          status: "sent",
          providerMessageId: sendResult.messageId,
          sentAt: now,
          errorMessage: null,
          trackingToken,
          certificateCode,
          contentSha256,
          evidenceSha256,
          attachmentsJson: attachments,
          updatedAt: now,
        })
        .where(eq(emailMessages.id, params.existingMessageId))
        .returning();
      savedMsg = updated;
    } else {
      const [inserted] = await db
        .insert(emailMessages)
        .values({
          userId: params.userId,
          agencyId: params.agencyId,
          leadId: params.leadId,
          accountId: params.identity.accountId,
          sequenceId: params.sequenceId,
          enrollmentId: params.enrollmentId,
          direction: "outbound",
          toEmail: cleanTo,
          fromEmail: params.identity.certifiedFromEmail,
          replyToEmail: params.identity.replyToEmail,
          subject: params.subject,
          bodyHtml: params.wrappedHtml,
          bodyText: params.plainText,
          status: "sent",
          providerMessageId: sendResult.messageId,
          sentAt: now,
          aiGenerated: params.aiGenerated,
          notifyOnOpen: Boolean(params.notifyOnOpen),
          attachmentsJson: attachments,
          trackingToken,
          certificateCode,
          contentSha256,
          evidenceSha256,
          metadata: params.metadata,
        })
        .returning();
      savedMsg = inserted;
    }

    if (savedMsg?.id && instrumented.trackedLinks.length > 0) {
      await db.insert(emailTrackedLinks).values(
        instrumented.trackedLinks.map((lnk) => ({
          emailMessageId: savedMsg.id,
          token: lnk.token,
          targetUrl: lnk.targetUrl,
          clickCount: 0,
        })),
      );
    }

    await incrementUsageQuota(params.userId, "emailCampaignsUsed", 1);

    if (params.leadId) {
      await db
        .update(leads)
        .set({
          lastContactedAt: now,
          updatedAt: now,
        })
        .where(eq(leads.id, params.leadId));

      await db.insert(crmActivities).values({
        leadId: params.leadId,
        agentId: params.userId,
        agencyId: params.agencyId,
        activityType: "email",
        title: `Correo certificado enviado: ${params.subject}`.slice(0, 250),
        body: params.plainText.slice(0, 1200),
        metadata: {
          emailMessageId: savedMsg?.id ?? null,
          certificateCode,
          contentSha256,
          toEmail: cleanTo,
          aiGenerated: params.aiGenerated,
          sequenceId: params.sequenceId,
        },
      });
    }

    return {
      message: savedMsg,
      status: "sent" as const,
    };
  } catch (err: any) {
    const errText = err?.message || "Error al despachar correo por SMTP.";
    let failedMsg;
    if (params.existingMessageId) {
      const [updated] = await db
        .update(emailMessages)
        .set({
          status: "failed",
          errorMessage: errText,
          updatedAt: now,
        })
        .where(eq(emailMessages.id, params.existingMessageId))
        .returning();
      failedMsg = updated;
    } else {
      const [inserted] = await db
        .insert(emailMessages)
        .values({
          userId: params.userId,
          agencyId: params.agencyId,
          leadId: params.leadId,
          accountId: params.identity.accountId,
          sequenceId: params.sequenceId,
          enrollmentId: params.enrollmentId,
          direction: "outbound",
          toEmail: cleanTo,
          fromEmail: params.identity.certifiedFromEmail,
          replyToEmail: params.identity.replyToEmail,
          subject: params.subject,
          bodyHtml: params.wrappedHtml,
          bodyText: params.plainText,
          status: "failed",
          errorMessage: errText,
          aiGenerated: params.aiGenerated,
          notifyOnOpen: Boolean(params.notifyOnOpen),
          attachmentsJson: attachments,
          metadata: params.metadata,
        })
        .returning();
      failedMsg = inserted;
    }

    return {
      message: failedMsg,
      status: "failed" as const,
      error: errText,
    };
  }
}

export async function ensureDefaultEmailSequencesForUser(
  userId: number,
  agencyId?: number | null,
): Promise<EmailSequence[]> {
  const db = await getDb();
  if (!db) return [];

  const existing = await db
    .select()
    .from(emailSequences)
    .where(eq(emailSequences.userId, userId));

  const created: EmailSequence[] = [];
  const hasLeadSeq = existing.some((s) => s.triggerType === "lead_created");
  const hasMatchSeq = existing.some((s) => s.triggerType === "match_85_plus");

  if (!hasLeadSeq) {
    const [seq1] = await db
      .insert(emailSequences)
      .values({
        userId,
        agencyId: agencyId ?? null,
        name: "Bienvenida + Seguimiento 24h y 72h (IA)",
        description:
          "Secuencia automática de 3 pasos: bienvenida inmediata (0h), seguimiento consultivo (24h) y propuesta de visita (72h).",
        triggerType: "lead_created",
        stepsJson: DEFAULT_LEAD_SEQUENCE_STEPS,
        isActive: true,
        stopOnStageChange: false,
        stopStagesJson: ["cerrado_ganado", "perdido"],
      })
      .returning();
    if (seq1) created.push(seq1);
  }

  if (!hasMatchSeq) {
    const [seq2] = await db
      .insert(emailSequences)
      .values({
        userId,
        agencyId: agencyId ?? null,
        name: "Alerta Automática Match >= 85%",
        description:
          "Notifica al prospecto cuando el motor VECY detecta un inmueble compatible con score >= 85%.",
        triggerType: "match_85_plus",
        stepsJson: DEFAULT_MATCH_SEQUENCE_STEPS,
        isActive: true,
        stopOnStageChange: false,
        stopStagesJson: ["cerrado_ganado", "perdido"],
      })
      .returning();
    if (seq2) created.push(seq2);
  }

  return [...existing, ...created];
}

export async function enrollLeadInSequence(params: {
  sequenceId: number;
  leadId: number;
  userId: number;
  agencyId?: number | null;
  startDelayHours?: number;
  contextJson?: Record<string, unknown>;
}): Promise<EmailSequenceEnrollment | null> {
  const db = await getDb();
  if (!db) return null;

  const existingActive = await db
    .select()
    .from(emailSequenceEnrollments)
    .where(
      and(
        eq(emailSequenceEnrollments.sequenceId, params.sequenceId),
        eq(emailSequenceEnrollments.leadId, params.leadId),
        eq(emailSequenceEnrollments.status, "active"),
      ),
    )
    .limit(1);

  if (existingActive.length > 0 && !params.contextJson?.matchId) {
    return existingActive[0];
  }

  const [seq] = await db
    .select()
    .from(emailSequences)
    .where(eq(emailSequences.id, params.sequenceId))
    .limit(1);

  if (!seq || !seq.isActive) return null;

  const steps = Array.isArray(seq.stepsJson) ? (seq.stepsJson as EmailSequenceStep[]) : [];
  if (steps.length === 0) return null;
  const ordered = [...steps].sort((a, b) => Number(a.stepOrder ?? 0) - Number(b.stepOrder ?? 0));
  const initialDelayHours =
    params.startDelayHours !== undefined
      ? params.startDelayHours
      : Number(ordered[0]?.delayHours ?? 0);

  const nextRunAt = computeNextStepRunAt(new Date(), initialDelayHours);

  const [inserted] = await db
    .insert(emailSequenceEnrollments)
    .values({
      sequenceId: params.sequenceId,
      leadId: params.leadId,
      userId: params.userId,
      agencyId: params.agencyId ?? seq.agencyId ?? null,
      currentStepIndex: 0,
      status: "active",
      nextRunAt,
      contextJson: params.contextJson ?? null,
    })
    .returning();

  return inserted ?? null;
}

export async function enrollLeadInTriggerSequences(
  leadId: number,
  userId: number,
  triggerType: EmailSequenceTrigger,
  contextJson?: Record<string, unknown>,
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const [lead] = await db
    .select()
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);
  if (!lead || !isDeliverableEmail(lead.email)) return 0;

  let sequences = await db
    .select()
    .from(emailSequences)
    .where(
      and(
        eq(emailSequences.userId, userId),
        eq(emailSequences.triggerType, triggerType),
        eq(emailSequences.isActive, true),
      ),
    );

  if (sequences.length === 0 && (triggerType === "lead_created" || triggerType === "match_85_plus")) {
    const bootstrapped = await ensureDefaultEmailSequencesForUser(userId, lead.agencyId);
    sequences = bootstrapped.filter(
      (s) => s.triggerType === triggerType && s.isActive,
    );
  }

  let enrolledCount = 0;
  for (const seq of sequences) {
    const row = await enrollLeadInSequence({
      sequenceId: seq.id,
      leadId,
      userId,
      agencyId: lead.agencyId,
      contextJson,
    });
    if (row) enrolledCount++;
  }

  return enrolledCount;
}

async function buildTemplateVariablesForLead(params: {
  lead: Lead;
  userId: number;
  propertyId?: number | null;
  matchScore?: number | null;
}) {
  const db = await getDb();
  let property: Property | null = null;
  let agentName = "Tu asesor inmobiliario";
  let agencyName = "Vecy Bienes Raíces";
  let agentPhone = "+57 316 6569719";
  let agentEmail = "";

  if (db) {
    const targetPropId = params.propertyId ?? params.lead.propertyId;
    if (targetPropId) {
      const [p] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, targetPropId))
        .limit(1);
      property = p ?? null;
    }

    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.id, params.userId))
      .limit(1);
    if (u) {
      const theme = (u.themeConfig as any) || {};
      agentName = u.name || theme.agencyName || agentName;
      agencyName = theme.agencyName || u.name || agencyName;
      agentPhone = theme.contactPhone || u.phone || agentPhone;
      agentEmail = theme.contactEmail || u.email || "";
      if (u.defaultAgencyId) {
        const [ag] = await db
          .select({ brandName: agencies.brandName, whatsappBusinessPhone: agencies.whatsappBusinessPhone, contactEmail: agencies.contactEmail })
          .from(agencies)
          .where(eq(agencies.id, u.defaultAgencyId))
          .limit(1);
        if (ag) {
          agencyName = ag.brandName || agencyName;
          agentPhone = ag.whatsappBusinessPhone || agentPhone;
          agentEmail = ag.contactEmail || agentEmail;
        }
      }
    }
  }

  const variables: Record<string, string | number | null | undefined> = {
    lead_first_name: formatShortGreetingName(params.lead.name, "Hola"),
    lead_name: params.lead.name,
    lead_email: params.lead.email,
    lead_phone: params.lead.phone || "",
    lead_city: params.lead.preferredCity || property?.addressCity || property?.city || "Colombia",
    lead_zone: params.lead.preferredZone || property?.addressNeighborhood || property?.zone || "tu zona de interés",
    lead_budget: params.lead.estimatedBudget ? formatCopCurrency(params.lead.estimatedBudget) : "A definir",
    property_name: property?.name || "portafolio inmobiliario",
    property_price: property?.price ? formatCopCurrency(property.price) : "Consultar valor",
    property_zone: property?.addressNeighborhood || property?.zone || params.lead.preferredZone || "zona seleccionada",
    property_city: property?.addressCity || property?.city || params.lead.preferredCity || "Colombia",
    match_score: params.matchScore ? Math.round(params.matchScore) : 85,
    agent_name: agentName,
    agency_name: agencyName,
    agent_phone: agentPhone,
    agent_email: agentEmail,
  };

  return { property, agentName, agencyName, agentPhone, agentEmail, variables };
}

export async function processDueEmailAutomations(options?: {
  userId?: number;
  now?: Date;
  limit?: number;
  transportSender?: TransportSenderFn;
  llmFn?: GenerateAiDraftInput["llmFn"];
}): Promise<{
  processedQueued: number;
  processedEnrollments: number;
  sentCount: number;
  quotaBlockedCount: number;
  failedCount: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      processedQueued: 0,
      processedEnrollments: 0,
      sentCount: 0,
      quotaBlockedCount: 0,
      failedCount: 0,
    };
  }

  const now = options?.now ?? new Date();
  const limit = Math.max(1, Math.min(100, options?.limit ?? 25));

  let processedQueued = 0;
  let processedEnrollments = 0;
  let sentCount = 0;
  let quotaBlockedCount = 0;
  let failedCount = 0;

  // 1. Procesar correos individuales programados con status='queued' y scheduled_for <= now
  const queuedFilters = [
    eq(emailMessages.status, "queued"),
    lte(emailMessages.scheduledFor, now),
  ];
  if (options?.userId) {
    queuedFilters.push(eq(emailMessages.userId, options.userId));
  }

  const dueQueued = await db
    .select()
    .from(emailMessages)
    .where(and(...queuedFilters))
    .orderBy(emailMessages.scheduledFor)
    .limit(limit);

  for (const msg of dueQueued) {
    processedQueued++;
    const ent = await getUserEffectiveEntitlements(msg.userId);
    const quota = checkEmailQuotaLimit({
      isAdmin: ent.isAdmin,
      maxEmailsPerMonth: ent.plan.maxEmailsPerMonth ?? ent.plan.emailCampaignsMonthlyQuota,
      used: ent.usage.emailCampaignsUsed,
      requestedCount: 1,
    });
    if (!quota.allowed) {
      await db
        .update(emailMessages)
        .set({
          status: "quota_blocked",
          errorMessage: quota.reason || "Cuota mensual agotada.",
          updatedAt: now,
        })
        .where(eq(emailMessages.id, msg.id));
      quotaBlockedCount++;
      continue;
    }

    const identity = await resolveSendingIdentityForUser(msg.userId);
    const res = await dispatchPreparedEmailMessage({
      existingMessageId: msg.id,
      userId: msg.userId,
      agencyId: msg.agencyId,
      leadId: msg.leadId,
      identity,
      sequenceId: msg.sequenceId,
      enrollmentId: msg.enrollmentId,
      toEmail: msg.toEmail,
      subject: msg.subject,
      wrappedHtml: msg.bodyHtml,
      plainText: msg.bodyText || htmlToPlainText(msg.bodyHtml),
      aiGenerated: msg.aiGenerated,
      notifyOnOpen: Boolean(msg.notifyOnOpen),
      attachments: Array.isArray(msg.attachmentsJson)
        ? (msg.attachmentsJson as EmailAttachmentDigest[])
        : [],
      metadata: (msg.metadata as Record<string, unknown>) || null,
      transportSender: options?.transportSender,
    });
    if (res.status === "sent") sentCount++;
    else failedCount++;
  }

  // 2. Procesar inscripciones vencidas en secuencias automáticas
  const enrollFilters = [
    eq(emailSequenceEnrollments.status, "active"),
    lte(emailSequenceEnrollments.nextRunAt, now),
  ];
  if (options?.userId) {
    enrollFilters.push(eq(emailSequenceEnrollments.userId, options.userId));
  }

  const dueEnrollments = await db
    .select()
    .from(emailSequenceEnrollments)
    .where(and(...enrollFilters))
    .orderBy(emailSequenceEnrollments.nextRunAt)
    .limit(limit);

  for (const enrollment of dueEnrollments) {
    processedEnrollments++;
    const [seq] = await db
      .select()
      .from(emailSequences)
      .where(eq(emailSequences.id, enrollment.sequenceId))
      .limit(1);

    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, enrollment.leadId))
      .limit(1);

    if (!seq || !seq.isActive || !lead || !isDeliverableEmail(lead.email)) {
      await db
        .update(emailSequenceEnrollments)
        .set({
          status: "cancelled",
          lastError: !lead
            ? "Lead eliminado"
            : !isDeliverableEmail(lead.email)
              ? "Lead sin correo electrónico entregable"
              : "Secuencia inactiva",
          updatedAt: now,
        })
        .where(eq(emailSequenceEnrollments.id, enrollment.id));
      continue;
    }

    const steps = Array.isArray(seq.stepsJson) ? (seq.stepsJson as EmailSequenceStep[]) : [];
    const stopStages = Array.isArray(seq.stopStagesJson)
      ? (seq.stopStagesJson as string[])
      : ["cerrado_ganado", "perdido"];

    const evalRes = evaluateSequenceEnrollmentStep({
      enrollmentStatus: enrollment.status,
      currentStepIndex: enrollment.currentStepIndex,
      steps,
      leadStage: lead.pipelineStage,
      stopOnStageChange: seq.stopOnStageChange,
      stopStages,
      nextRunAt: enrollment.nextRunAt,
      now,
    });

    if (evalRes.action === "complete") {
      await db
        .update(emailSequenceEnrollments)
        .set({ status: "completed", updatedAt: now })
        .where(eq(emailSequenceEnrollments.id, enrollment.id));
      continue;
    }
    if (evalRes.action === "stop_stage") {
      await db
        .update(emailSequenceEnrollments)
        .set({
          status: "cancelled",
          lastError: `Detenida automáticamente por etapa '${lead.pipelineStage}'`,
          updatedAt: now,
        })
        .where(eq(emailSequenceEnrollments.id, enrollment.id));
      continue;
    }
    if (evalRes.action === "wait" || !evalRes.step) {
      continue;
    }

    const ctxJson = (enrollment.contextJson as any) || {};
    const ctxPropertyId = ctxJson.propertyId ? Number(ctxJson.propertyId) : lead.propertyId;
    const ctxMatchScore = ctxJson.matchScore ? Number(ctxJson.matchScore) : null;

    const { property, agentName, agencyName, agentPhone, variables } =
      await buildTemplateVariablesForLead({
        lead,
        userId: enrollment.userId,
        propertyId: ctxPropertyId,
        matchScore: ctxMatchScore,
      });

    let subject = renderEmailTemplate(evalRes.step.subjectTemplate, variables, {
      escapeForHtml: false,
    });
    let bodyHtml = renderEmailTemplate(evalRes.step.bodyHtmlTemplate, variables, {
      escapeForHtml: true,
    });
    let bodyText = evalRes.step.bodyTextTemplate
      ? renderEmailTemplate(evalRes.step.bodyTextTemplate, variables, { escapeForHtml: false })
      : htmlToPlainText(bodyHtml);
    let aiGenerated = false;

    if (evalRes.step.useAiPersonalization) {
      const intentMap: Record<string, GenerateAiDraftInput["intent"]> = {
        welcome: "welcome",
        followup_24h: "followup_24h",
        followup_72h: "followup_72h",
        match_alert: "match_alert",
      };
      const aiDraft = await generateAiEmailDraft({
        lead,
        property,
        matchScore: ctxMatchScore,
        agentName,
        agencyName,
        agentPhone,
        intent: intentMap[evalRes.step.aiGoal || ""] || "welcome",
        referenceDate: now,
        llmFn: options?.llmFn,
      });
      if (aiDraft.subject && aiDraft.bodyHtml) {
        subject = aiDraft.subject;
        bodyHtml = aiDraft.bodyHtml;
        bodyText = aiDraft.bodyText;
        aiGenerated = true;
      }
    }

    const sendRes = await sendOrQueueCrmEmail({
      userId: enrollment.userId,
      agencyId: enrollment.agencyId ?? lead.agencyId,
      leadId: lead.id,
      sequenceId: seq.id,
      enrollmentId: enrollment.id,
      toEmail: lead.email,
      subject,
      bodyHtml,
      bodyText,
      aiGenerated,
      skipThrowOnQuota: true,
      transportSender: options?.transportSender,
      metadata: {
        stepIndex: enrollment.currentStepIndex,
        triggerType: seq.triggerType,
        matchId: ctxJson.matchId ?? null,
      },
    });

    if (sendRes.status === "quota_blocked") {
      quotaBlockedCount++;
      await db
        .update(emailSequenceEnrollments)
        .set({
          status: "paused",
          lastError: sendRes.error || "Cuota mensual de correos agotada.",
          updatedAt: now,
        })
        .where(eq(emailSequenceEnrollments.id, enrollment.id));
      continue;
    }

    if (sendRes.status === "failed") {
      failedCount++;
      await db
        .update(emailSequenceEnrollments)
        .set({
          lastError: sendRes.error || "Error SMTP al enviar paso.",
          nextRunAt: computeNextStepRunAt(now, 2), // Reintento suave en 2 horas
          updatedAt: now,
        })
        .where(eq(emailSequenceEnrollments.id, enrollment.id));
      continue;
    }

    sentCount++;
    const nextIdx = enrollment.currentStepIndex + 1;
    const orderedSteps = [...steps].sort((a, b) => Number(a.stepOrder ?? 0) - Number(b.stepOrder ?? 0));
    const hasMoreSteps = nextIdx < orderedSteps.length;
    await db
      .update(emailSequenceEnrollments)
      .set({
        currentStepIndex: nextIdx,
        status: hasMoreSteps ? "active" : "completed",
        lastSentAt: now,
        nextRunAt:
          hasMoreSteps && evalRes.nextStepDelayDeltaHours !== undefined
            ? computeNextStepRunAt(now, evalRes.nextStepDelayDeltaHours)
            : null,
        lastError: null,
        updatedAt: now,
      })
      .where(eq(emailSequenceEnrollments.id, enrollment.id));
  }

  return {
    processedQueued,
    processedEnrollments,
    sentCount,
    quotaBlockedCount,
    failedCount,
  };
}

/**
 * Conecta matches >= 85% con el CRM y la automatización de correos (sin enviar WhatsApp).
 */
export async function handleHighMatchEmailAlert(matchId: number): Promise<{
  enrolledLeads: number;
  skippedReason?: string;
}> {
  const db = await getDb();
  if (!db) return { enrolledLeads: 0, skippedReason: "db_unavailable" };

  const [match] = await db
    .select()
    .from(propertyMatches)
    .where(eq(propertyMatches.id, matchId))
    .limit(1);

  if (!match) return { enrolledLeads: 0, skippedReason: "match_not_found" };
  const score = Number(match.matchScore ?? 0);
  if (!Number.isFinite(score) || score < 85) {
    return { enrolledLeads: 0, skippedReason: "below_85_threshold" };
  }

  const [prop] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, match.propertyId))
    .limit(1);
  const [req] = await db
    .select()
    .from(requirements)
    .where(eq(requirements.id, match.requirementId))
    .limit(1);

  if (!prop || !req) {
    return { enrolledLeads: 0, skippedReason: "missing_property_or_requirement" };
  }

  const candidateLeads = await db
    .select()
    .from(leads)
    .where(
      or(
        eq(leads.requirementId, req.id),
        eq(leads.propertyId, prop.id),
      ),
    )
    .orderBy(desc(leads.id))
    .limit(25);

  let enrolledLeads = 0;

  for (const lead of candidateLeads) {
    const ownerAgentId = lead.agentId ?? lead.assignedAgentId ?? prop.agentId ?? req.userId;
    if (!ownerAgentId || !isDeliverableEmail(lead.email)) continue;

    // Evitar duplicar alertas para el mismo (leadId, matchId)
    const existingEnrollments = await db
      .select({
        id: emailSequenceEnrollments.id,
        contextJson: emailSequenceEnrollments.contextJson,
      })
      .from(emailSequenceEnrollments)
      .where(eq(emailSequenceEnrollments.leadId, lead.id));

    const alreadyEnrolledForMatch = existingEnrollments.some(
      (e) => Number((e.contextJson as any)?.matchId) === matchId,
    );
    if (alreadyEnrolledForMatch) continue;

    await db.insert(crmActivities).values({
      leadId: lead.id,
      agentId: ownerAgentId,
      agencyId: lead.agencyId ?? prop.agencyId ?? null,
      activityType: "match_alert",
      title: `Match ${Math.round(score)}% detectado: ${prop.name}`.slice(0, 250),
      body: `El motor inteligente VECY encontró una compatibilidad del ${Math.round(score)}% entre el inmueble #${prop.id} (${prop.name}) y el requerimiento #${req.id}.`,
      metadata: {
        matchId,
        propertyId: prop.id,
        requirementId: req.id,
        matchScore: score,
      },
    });

    const count = await enrollLeadInTriggerSequences(lead.id, ownerAgentId, "match_85_plus", {
      matchId,
      propertyId: prop.id,
      requirementId: req.id,
      matchScore: score,
    });
    if (count > 0) enrolledLeads++;
  }

  return { enrolledLeads };
}

async function dispatchOpenNotificationAlert(params: {
  msg: EmailMessage;
  eventType: "open" | "click";
  occurredAt: Date;
  ip?: string | null;
  targetUrl?: string | null;
  alertSender?: TransportSenderFn;
}) {
  try {
    if (process.env.NODE_ENV === "test" && !params.alertSender) {
      return;
    }
    const db = await getDb();
    let targetEmail = params.msg.replyToEmail || "";
    if (!targetEmail && db) {
      const [u] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, params.msg.userId))
        .limit(1);
      targetEmail = u?.email || "";
    }
    if (!isDeliverableEmail(targetEmail)) return;

    const identity = await resolveSendingIdentityForUser(params.msg.userId);
    const bogotaStr = formatBogotaTimestamp(params.occurredAt);
    const actionLabel =
      params.eventType === "click"
        ? `hizo clic en un enlace (${params.targetUrl || "enlace"})`
        : "abrió tu correo certificado";

    const alertHtml = wrapInBrandedEmailShell({
      bodyHtml: `<p>Hola,</p><p><strong>${escapeHtml(params.msg.toEmail)}</strong> ${escapeHtml(actionLabel)}.</p><p><strong>Asunto:</strong> ${escapeHtml(params.msg.subject)}<br/><strong>Fecha y hora:</strong> ${escapeHtml(bogotaStr)}<br/><strong>IP registrada:</strong> ${escapeHtml(params.ip || "N/D")}<br/><strong>CUV Ley 527:</strong> ${escapeHtml(params.msg.certificateCode || "N/D")}</p>`,
      brandName: identity.agencyName,
      primaryColor: identity.primaryColor,
    });
    const sender = params.alertSender || defaultNodemailerSend;
    await sender(
      {
        from: identity.fromEmail,
        to: targetEmail,
        replyTo: identity.replyToEmail,
        subject: `👁️ Aviso de lectura: ${params.msg.toEmail} — ${params.msg.subject}`.slice(0, 280),
        html: alertHtml,
        text: `${params.msg.toEmail} ${actionLabel} (${bogotaStr}). Asunto: ${params.msg.subject}`,
      },
      identity,
    );
  } catch (err) {
    console.warn("[EMAIL-TRACKING] Error enviando alerta de apertura:", err);
  }
}

export async function recordEmailOpenEvent(params: {
  token: string;
  ip?: string | null;
  userAgent?: string | null;
  now?: Date;
  alertSender?: TransportSenderFn;
}): Promise<{ found: boolean; openCount: number; messageId?: number }> {
  const cleanToken = String(params.token || "").replace(/\.png$/i, "").trim();
  if (!cleanToken) return { found: false, openCount: 0 };

  const db = await getDb();
  if (!db) return { found: false, openCount: 0 };

  const [msg] = await db
    .select()
    .from(emailMessages)
    .where(eq(emailMessages.trackingToken, cleanToken))
    .limit(1);

  if (!msg) return { found: false, openCount: 0 };

  const now = params.now ?? new Date();
  const prevCount = Number(msg.openCount ?? 0);
  const nextCount = prevCount + 1;
  const firstOpenedAt = msg.firstOpenedAt ?? now;
  const sentAt = msg.sentAt ?? msg.createdAt ?? now;

  const existingEvents = Array.isArray(msg.trackingEventsJson)
    ? (msg.trackingEventsJson as EmailTrackingEvent[])
    : [];
  const nextEvents: EmailTrackingEvent[] = [
    ...existingEvents,
    {
      type: "open" as const,
      occurredAtIso: now.toISOString(),
      occurredAtBogota: formatBogotaTimestamp(now),
      ip: params.ip ? String(params.ip).slice(0, 64) : null,
      userAgent: params.userAgent ? String(params.userAgent).slice(0, 400) : null,
    },
  ].slice(-100);

  const contentSha256 =
    msg.contentSha256 ||
    computeCertifiedEmailHash({
      fromEmail: msg.fromEmail,
      toEmail: msg.toEmail,
      replyToEmail: msg.replyToEmail,
      subject: msg.subject,
      bodyHtml: msg.bodyHtml,
      bodyText: msg.bodyText,
      attachments: Array.isArray(msg.attachmentsJson)
        ? (msg.attachmentsJson as EmailAttachmentDigest[])
        : [],
      sentAt,
    });
  const certificateCode =
    msg.certificateCode || generateEmailCertificateCode(contentSha256, sentAt);
  const evidenceSha256 = computeEvidenceChainHash({
    contentSha256,
    certificateCode,
    providerMessageId: msg.providerMessageId,
    sentAtIso: sentAt.toISOString(),
    firstOpenedAtIso: firstOpenedAt.toISOString(),
    lastOpenedAtIso: now.toISOString(),
    openCount: nextCount,
    firstClickedAtIso: msg.firstClickedAt ? msg.firstClickedAt.toISOString() : null,
    lastClickedAtIso: msg.lastClickedAt ? msg.lastClickedAt.toISOString() : null,
    clickCount: Number(msg.clickCount ?? 0),
    eventsCount: nextEvents.length,
  });

  const shouldNotify = Boolean(msg.notifyOnOpen && !msg.openNotifiedAt);

  await db
    .update(emailMessages)
    .set({
      openCount: nextCount,
      firstOpenedAt,
      lastOpenedAt: now,
      lastOpenIp: params.ip ? String(params.ip).slice(0, 64) : msg.lastOpenIp,
      lastOpenUserAgent: params.userAgent
        ? String(params.userAgent).slice(0, 400)
        : msg.lastOpenUserAgent,
      contentSha256,
      certificateCode,
      evidenceSha256,
      trackingEventsJson: nextEvents,
      openNotifiedAt: shouldNotify ? now : msg.openNotifiedAt,
      updatedAt: now,
    })
    .where(eq(emailMessages.id, msg.id));

  if (prevCount === 0 && msg.leadId) {
    await db.insert(crmActivities).values({
      leadId: msg.leadId,
      agentId: msg.userId,
      agencyId: msg.agencyId,
      activityType: "email",
      title: `👁️ Correo abierto por destinatario: ${msg.subject}`.slice(0, 250),
      body: `Apertura certificada registrada el ${formatBogotaTimestamp(now)} desde IP ${params.ip || "N/D"}. CUV: ${certificateCode}.`,
      metadata: {
        emailMessageId: msg.id,
        eventType: "open",
        ip: params.ip ?? null,
        certificateCode,
      },
    });
  }

  if (shouldNotify) {
    await dispatchOpenNotificationAlert({
      msg: { ...msg, certificateCode },
      eventType: "open",
      occurredAt: now,
      ip: params.ip,
      alertSender: params.alertSender,
    });
  }

  return { found: true, openCount: nextCount, messageId: msg.id };
}

export async function recordEmailClickEvent(params: {
  token: string;
  ip?: string | null;
  userAgent?: string | null;
  now?: Date;
  alertSender?: TransportSenderFn;
}): Promise<{ found: boolean; targetUrl: string | null; clickCount?: number }> {
  const cleanToken = String(params.token || "").trim();
  if (!cleanToken) return { found: false, targetUrl: null };

  const db = await getDb();
  if (!db) return { found: false, targetUrl: null };

  const [link] = await db
    .select()
    .from(emailTrackedLinks)
    .where(eq(emailTrackedLinks.token, cleanToken))
    .limit(1);

  if (!link || !/^https?:\/\//i.test(link.targetUrl)) {
    return { found: false, targetUrl: null };
  }

  const now = params.now ?? new Date();
  const nextLinkCount = Number(link.clickCount ?? 0) + 1;

  await db
    .update(emailTrackedLinks)
    .set({
      clickCount: nextLinkCount,
      firstClickedAt: link.firstClickedAt ?? now,
      lastClickedAt: now,
      lastIp: params.ip ? String(params.ip).slice(0, 64) : link.lastIp,
      lastUserAgent: params.userAgent ? String(params.userAgent).slice(0, 400) : link.lastUserAgent,
    })
    .where(eq(emailTrackedLinks.id, link.id));

  const [msg] = await db
    .select()
    .from(emailMessages)
    .where(eq(emailMessages.id, link.emailMessageId))
    .limit(1);

  if (msg) {
    const prevMsgClicks = Number(msg.clickCount ?? 0);
    const nextMsgClicks = prevMsgClicks + 1;
    const firstClickedAt = msg.firstClickedAt ?? now;
    const sentAt = msg.sentAt ?? msg.createdAt ?? now;
    const existingEvents = Array.isArray(msg.trackingEventsJson)
      ? (msg.trackingEventsJson as EmailTrackingEvent[])
      : [];
    const nextEvents: EmailTrackingEvent[] = [
      ...existingEvents,
      {
        type: "click" as const,
        occurredAtIso: now.toISOString(),
        occurredAtBogota: formatBogotaTimestamp(now),
        ip: params.ip ? String(params.ip).slice(0, 64) : null,
        userAgent: params.userAgent ? String(params.userAgent).slice(0, 400) : null,
        targetUrl: link.targetUrl,
      },
    ].slice(-100);

    const contentSha256 =
      msg.contentSha256 ||
      computeCertifiedEmailHash({
        fromEmail: msg.fromEmail,
        toEmail: msg.toEmail,
        replyToEmail: msg.replyToEmail,
        subject: msg.subject,
        bodyHtml: msg.bodyHtml,
        bodyText: msg.bodyText,
        attachments: Array.isArray(msg.attachmentsJson)
          ? (msg.attachmentsJson as EmailAttachmentDigest[])
          : [],
        sentAt,
      });
    const certificateCode =
      msg.certificateCode || generateEmailCertificateCode(contentSha256, sentAt);
    const evidenceSha256 = computeEvidenceChainHash({
      contentSha256,
      certificateCode,
      providerMessageId: msg.providerMessageId,
      sentAtIso: sentAt.toISOString(),
      firstOpenedAtIso: msg.firstOpenedAt ? msg.firstOpenedAt.toISOString() : null,
      lastOpenedAtIso: msg.lastOpenedAt ? msg.lastOpenedAt.toISOString() : null,
      openCount: Number(msg.openCount ?? 0),
      firstClickedAtIso: firstClickedAt.toISOString(),
      lastClickedAtIso: now.toISOString(),
      clickCount: nextMsgClicks,
      eventsCount: nextEvents.length,
    });

    const shouldNotify = Boolean(msg.notifyOnOpen && !msg.openNotifiedAt);

    await db
      .update(emailMessages)
      .set({
        clickCount: nextMsgClicks,
        firstClickedAt,
        lastClickedAt: now,
        lastClickIp: params.ip ? String(params.ip).slice(0, 64) : msg.lastClickIp,
        lastClickUserAgent: params.userAgent
          ? String(params.userAgent).slice(0, 400)
          : msg.lastClickUserAgent,
        contentSha256,
        certificateCode,
        evidenceSha256,
        trackingEventsJson: nextEvents,
        openNotifiedAt: shouldNotify ? now : msg.openNotifiedAt,
        updatedAt: now,
      })
      .where(eq(emailMessages.id, msg.id));

    if (prevMsgClicks === 0 && msg.leadId) {
      await db.insert(crmActivities).values({
        leadId: msg.leadId,
        agentId: msg.userId,
        agencyId: msg.agencyId,
        activityType: "email",
        title: `🔗 Enlace abierto en correo: ${msg.subject}`.slice(0, 250),
        body: `Clic certificado sobre ${link.targetUrl} el ${formatBogotaTimestamp(now)} desde IP ${params.ip || "N/D"}. CUV: ${certificateCode}.`,
        metadata: {
          emailMessageId: msg.id,
          eventType: "click",
          targetUrl: link.targetUrl,
          ip: params.ip ?? null,
          certificateCode,
        },
      });
    }

    if (shouldNotify) {
      await dispatchOpenNotificationAlert({
        msg: { ...msg, certificateCode },
        eventType: "click",
        occurredAt: now,
        ip: params.ip,
        targetUrl: link.targetUrl,
        alertSender: params.alertSender,
      });
    }
  }

  return {
    found: true,
    targetUrl: link.targetUrl,
    clickCount: nextLinkCount,
  };
}

export function buildEmailEvidencePayloadFromRow(
  msg: EmailMessage,
  leadName?: string | null,
): CertifiedEmailEvidencePayload {
  const sentDate = msg.sentAt ?? msg.createdAt ?? new Date();
  const attachments = Array.isArray(msg.attachmentsJson)
    ? (msg.attachmentsJson as EmailAttachmentDigest[])
    : [];
  const events = Array.isArray(msg.trackingEventsJson)
    ? (msg.trackingEventsJson as EmailTrackingEvent[])
    : [];

  const contentSha256 =
    msg.contentSha256 ||
    computeCertifiedEmailHash({
      fromEmail: msg.fromEmail,
      toEmail: msg.toEmail,
      replyToEmail: msg.replyToEmail,
      subject: msg.subject,
      bodyHtml: msg.bodyHtml,
      bodyText: msg.bodyText,
      attachments,
      sentAt: sentDate,
    });
  const certificateCode =
    msg.certificateCode || generateEmailCertificateCode(contentSha256, sentDate);
  const evidenceSha256 =
    msg.evidenceSha256 ||
    computeEvidenceChainHash({
      contentSha256,
      certificateCode,
      providerMessageId: msg.providerMessageId,
      sentAtIso: sentDate.toISOString(),
      firstOpenedAtIso: msg.firstOpenedAt ? msg.firstOpenedAt.toISOString() : null,
      lastOpenedAtIso: msg.lastOpenedAt ? msg.lastOpenedAt.toISOString() : null,
      openCount: Number(msg.openCount ?? 0),
      firstClickedAtIso: msg.firstClickedAt ? msg.firstClickedAt.toISOString() : null,
      lastClickedAtIso: msg.lastClickedAt ? msg.lastClickedAt.toISOString() : null,
      clickCount: Number(msg.clickCount ?? 0),
      eventsCount: events.length,
    });

  return {
    messageId: msg.id,
    certificateCode,
    contentSha256,
    evidenceSha256,
    fromEmail: msg.fromEmail,
    replyToEmail: msg.replyToEmail ?? null,
    toEmail: msg.toEmail,
    leadName: leadName ?? null,
    subject: msg.subject,
    status: msg.status,
    providerMessageId: msg.providerMessageId ?? null,
    sentAtIso: sentDate.toISOString(),
    sentAtBogota: formatBogotaTimestamp(sentDate),
    openCount: Number(msg.openCount ?? 0),
    firstOpenedAtBogota: msg.firstOpenedAt ? formatBogotaTimestamp(msg.firstOpenedAt) : null,
    lastOpenedAtBogota: msg.lastOpenedAt ? formatBogotaTimestamp(msg.lastOpenedAt) : null,
    lastOpenIp: msg.lastOpenIp ?? null,
    lastOpenUserAgent: msg.lastOpenUserAgent ?? null,
    clickCount: Number(msg.clickCount ?? 0),
    firstClickedAtBogota: msg.firstClickedAt ? formatBogotaTimestamp(msg.firstClickedAt) : null,
    lastClickedAtBogota: msg.lastClickedAt ? formatBogotaTimestamp(msg.lastClickedAt) : null,
    lastClickIp: msg.lastClickIp ?? null,
    lastClickUserAgent: msg.lastClickUserAgent ?? null,
    attachments,
    bodyExcerpt: (msg.bodyText || htmlToPlainText(msg.bodyHtml)).slice(0, 600),
    events,
    generatedAtBogota: formatBogotaTimestamp(new Date()),
  };
}
