import crypto from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { ENV } from "./env";
import { getDb } from "../db";
import {
  agencies,
  paymentTransactions,
  userSubscriptions,
  users,
} from "../../drizzle/schema";
import {
  getPlanByCode,
  MAX_MONTHLY_PLAN_PRICE_COP,
  type PlanCode,
  type SubscriptionPlanDefinition,
} from "./planEntitlements";

export interface WompiIntegrityInput {
  reference: string;
  amountInCents: number;
  currency?: string;
  expirationTime?: string;
  integritySecret: string;
}

export function generatePaymentReference(
  userId: number,
  planCode: string,
  billingCycle: "monthly" | "annual" = "monthly",
): string {
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `VECY-${userId}-${planCode.toUpperCase()}-${billingCycle === "annual" ? "A" : "M"}-${Date.now()}-${rand}`;
}

export function computeWompiIntegritySignature(input: WompiIntegrityInput): string {
  const currency = input.currency || "COP";
  const exp = input.expirationTime || "";
  const raw = `${input.reference}${input.amountInCents}${currency}${exp}${input.integritySecret}`;
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

function getNestedValue(obj: unknown, dottedPath: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const parts = dottedPath.split(".");
  let current: any = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[part];
  }
  return current;
}

export function computeWompiWebhookChecksum(
  payload: Record<string, any>,
  eventsSecret: string,
): string | null {
  const sig = payload?.signature;
  const properties: unknown = sig?.properties;
  const timestamp = payload?.timestamp;
  if (!Array.isArray(properties) || properties.length === 0 || timestamp == null) {
    return null;
  }

  let concatenated = "";
  for (const prop of properties) {
    if (typeof prop !== "string") return null;
    const val = getNestedValue(payload.data, prop);
    if (val === undefined || val === null) {
      return null;
    }
    concatenated += String(val);
  }
  concatenated += String(timestamp);
  concatenated += eventsSecret;
  return crypto.createHash("sha256").update(concatenated, "utf8").digest("hex");
}

export function verifyWompiWebhookSignature(params: {
  payload: Record<string, any>;
  headerChecksum?: string;
  eventsSecret?: string;
}): { valid: boolean; reason?: string } {
  const secret = (params.eventsSecret ?? ENV.wompiEventsSecret ?? "").trim();
  if (!secret) {
    return { valid: false, reason: "WOMPI_EVENTS_SECRET no configurado" };
  }

  const providedChecksum = String(
    params.headerChecksum || params.payload?.signature?.checksum || "",
  )
    .trim()
    .toLowerCase();

  if (!providedChecksum) {
    return { valid: false, reason: "Checksum de evento Wompi ausente" };
  }

  const expectedChecksum = computeWompiWebhookChecksum(params.payload, secret);
  if (!expectedChecksum) {
    return { valid: false, reason: "Payload sin propiedades/timestamp de firma Wompi" };
  }

  const expectedBuf = Buffer.from(expectedChecksum, "utf8");
  const providedBuf = Buffer.from(providedChecksum, "utf8");
  if (expectedBuf.length !== providedBuf.length) {
    return { valid: false, reason: "Longitud de checksum inválida" };
  }

  const match = crypto.timingSafeEqual(expectedBuf, providedBuf);
  return match ? { valid: true } : { valid: false, reason: "Firma criptográfica Wompi inválida" };
}

export interface CheckoutSessionResult {
  activatedImmediately: boolean;
  isSandbox: boolean;
  wompiConfigured: boolean;
  provider: "wompi";
  plan: SubscriptionPlanDefinition;
  billingCycle: "monthly" | "annual";
  reference: string;
  amountCop: number;
  amountInCents: number;
  currency: "COP";
  checkoutUrl: string | null;
  widgetParams: {
    publicKey: string;
    currency: "COP";
    amountInCents: number;
    reference: string;
    signatureIntegrity: string;
    redirectUrl: string;
    customerEmail?: string;
    customerFullName?: string;
  } | null;
}

export async function activateUserSubscriptionPlan(params: {
  userId: number;
  planCode: PlanCode;
  billingCycle: "monthly" | "annual";
  priceCop: number;
  provider?: string;
  providerSubscriptionId?: string | null;
}): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const durationDays = params.billingCycle === "annual" ? 365 : 30;
  const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Cerrar suscripciones activas previas de forma aditiva manteniendo histórico
  await db
    .update(userSubscriptions)
    .set({ status: "expired", updatedAt: now })
    .where(and(eq(userSubscriptions.userId, params.userId), eq(userSubscriptions.status, "active")));

  const [ownedAgency] = await db
    .select({ id: agencies.id })
    .from(agencies)
    .where(eq(agencies.ownerUserId, params.userId))
    .limit(1);

  const [insertedSub] = await db
    .insert(userSubscriptions)
    .values({
      userId: params.userId,
      agencyId: ownedAgency?.id ?? null,
      planCode: params.planCode,
      status: "active",
      billingCycle: params.billingCycle,
      priceCop: params.priceCop,
      provider: params.provider || "wompi",
      providerSubscriptionId: params.providerSubscriptionId ?? null,
      currentPeriodStart: now,
      currentPeriodEnd: params.planCode === "free" ? null : periodEnd,
      cancelAtPeriodEnd: false,
    })
    .returning({ id: userSubscriptions.id });

  await db
    .update(users)
    .set({
      planCode: params.planCode,
      subscriptionStatus: "active",
      defaultAgencyId: ownedAgency?.id ?? undefined,
      updatedAt: now,
    })
    .where(eq(users.id, params.userId));

  if (ownedAgency?.id) {
    await db
      .update(agencies)
      .set({ planCode: params.planCode, updatedAt: now })
      .where(eq(agencies.id, ownedAgency.id));
  }

  return insertedSub?.id ?? null;
}

export async function createWompiCheckoutSession(params: {
  userId: number;
  email?: string | null;
  name?: string | null;
  planCode: PlanCode;
  billingCycle: "monthly" | "annual";
  redirectPath?: string;
}): Promise<CheckoutSessionResult> {
  const plan = await getPlanByCode(params.planCode);
  if (plan.monthlyPriceCop > MAX_MONTHLY_PLAN_PRICE_COP) {
    throw new Error(`Plan ${plan.code} excede el tope máximo de $200.000 COP/mes`);
  }

  const amountCop =
    params.billingCycle === "annual" ? plan.annualPriceCop : plan.monthlyPriceCop;
  const amountInCents = Math.round(amountCop * 100);
  const reference = generatePaymentReference(params.userId, plan.code, params.billingCycle);

  if (plan.code === "free" || amountInCents <= 0) {
    await activateUserSubscriptionPlan({
      userId: params.userId,
      planCode: "free",
      billingCycle: params.billingCycle,
      priceCop: 0,
      provider: "vecy_free",
    });
    return {
      activatedImmediately: true,
      isSandbox: ENV.wompiSandbox,
      wompiConfigured: Boolean(ENV.wompiPublicKey && ENV.wompiIntegritySecret),
      provider: "wompi",
      plan,
      billingCycle: params.billingCycle,
      reference,
      amountCop: 0,
      amountInCents: 0,
      currency: "COP",
      checkoutUrl: null,
      widgetParams: null,
    };
  }

  const publicKey = ENV.wompiPublicKey.trim();
  const integritySecret = ENV.wompiIntegritySecret.trim();
  const wompiConfigured = Boolean(publicKey && integritySecret);
  const signatureIntegrity = integritySecret
    ? computeWompiIntegritySignature({
        reference,
        amountInCents,
        currency: "COP",
        integritySecret,
      })
    : "";

  const baseUrl = ENV.publicBaseUrl.replace(/\/$/, "");
  const cleanRedirectPath = params.redirectPath?.startsWith("/") ? params.redirectPath : "/planes";
  const redirectUrl = `${baseUrl}${cleanRedirectPath}?payment_ref=${encodeURIComponent(reference)}`;

  const db = await getDb();
  if (db) {
    await db.insert(paymentTransactions).values({
      userId: params.userId,
      planCode: plan.code,
      provider: "wompi",
      reference,
      amountInCents,
      currency: "COP",
      status: "PENDING",
      integritySignature: signatureIntegrity || null,
    });
  }

  let checkoutUrl: string | null = null;
  if (wompiConfigured) {
    const query = new URLSearchParams({
      "public-key": publicKey,
      currency: "COP",
      "amount-in-cents": String(amountInCents),
      reference,
      "signature:integrity": signatureIntegrity,
      "redirect-url": redirectUrl,
    });
    if (params.email) {
      query.set("customer-data:email", params.email);
    }
    if (params.name) {
      query.set("customer-data:full-name", params.name);
    }
    checkoutUrl = `https://checkout.wompi.co/p/?${query.toString()}`;
  }

  return {
    activatedImmediately: false,
    isSandbox: ENV.wompiSandbox,
    wompiConfigured,
    provider: "wompi",
    plan,
    billingCycle: params.billingCycle,
    reference,
    amountCop,
    amountInCents,
    currency: "COP",
    checkoutUrl,
    widgetParams: wompiConfigured
      ? {
          publicKey,
          currency: "COP",
          amountInCents,
          reference,
          signatureIntegrity,
          redirectUrl,
          customerEmail: params.email || undefined,
          customerFullName: params.name || undefined,
        }
      : null,
  };
}

export async function processWompiWebhookEvent(params: {
  payload: Record<string, any>;
  headerChecksum?: string;
}): Promise<{ ok: boolean; statusCode: number; message: string; newStatus?: string }> {
  const sigCheck = verifyWompiWebhookSignature({
    payload: params.payload,
    headerChecksum: params.headerChecksum,
  });

  if (!sigCheck.valid) {
    return { ok: false, statusCode: 401, message: sigCheck.reason || "Firma inválida" };
  }

  const tx = params.payload?.data?.transaction;
  if (!tx || typeof tx !== "object") {
    return { ok: false, statusCode: 400, message: "Evento Wompi sin data.transaction" };
  }

  const reference = String(tx.reference || "").trim();
  const txStatus = String(tx.status || "").trim().toUpperCase();
  const providerTransactionId = tx.id ? String(tx.id) : null;
  const amountInCents = Number(tx.amount_in_cents || 0);
  const currency = String(tx.currency || "COP").toUpperCase();
  const paymentMethodType = tx.payment_method_type ? String(tx.payment_method_type) : null;

  if (!reference || !txStatus) {
    return { ok: false, statusCode: 400, message: "Referencia o estado de transacción faltante" };
  }

  const db = await getDb();
  if (!db) {
    return { ok: false, statusCode: 500, message: "Base de datos no disponible" };
  }

  const [existingTx] = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.reference, reference))
    .orderBy(desc(paymentTransactions.id))
    .limit(1);

  if (!existingTx) {
    return { ok: false, statusCode: 404, message: `Transacción no encontrada: ${reference}` };
  }

  if (currency !== "COP" || amountInCents < existingTx.amountInCents) {
    return {
      ok: false,
      statusCode: 400,
      message: "Monto o moneda inconsistente con el checkout registrado",
    };
  }

  const now = new Date();
  let subscriptionId = existingTx.subscriptionId;

  if (txStatus === "APPROVED" && existingTx.status !== "APPROVED") {
    const billingCycle: "monthly" | "annual" = reference.includes("-A-") ? "annual" : "monthly";
    subscriptionId = await activateUserSubscriptionPlan({
      userId: existingTx.userId,
      planCode: (existingTx.planCode as PlanCode) || "agente_pro",
      billingCycle,
      priceCop: Math.round(existingTx.amountInCents / 100),
      provider: "wompi",
      providerSubscriptionId: providerTransactionId,
    });
  }

  await db
    .update(paymentTransactions)
    .set({
      status: txStatus,
      providerTransactionId,
      paymentMethodType,
      subscriptionId,
      rawWebhookPayload: params.payload,
      paidAt: txStatus === "APPROVED" ? existingTx.paidAt || now : existingTx.paidAt,
      updatedAt: now,
    })
    .where(eq(paymentTransactions.id, existingTx.id));

  return {
    ok: true,
    statusCode: 200,
    message: `Transacción ${reference} actualizada a ${txStatus}`,
    newStatus: txStatus,
  };
}

