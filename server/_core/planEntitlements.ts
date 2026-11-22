import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  agencies,
  properties,
  requirements,
  subscriptionPlans,
  usageQuotas,
  userSubscriptions,
  users,
} from "../../drizzle/schema";

export const MAX_MONTHLY_PLAN_PRICE_COP = 200_000;

export type PlanCode = "free" | "agente_pro" | "inmobiliaria_growth" | "elite_ia";
export type LegalToolType = "ctl_study" | "identity_check" | "valuation";

export interface SubscriptionPlanDefinition {
  code: PlanCode;
  name: string;
  description: string;
  monthlyPriceCop: number;
  annualPriceCop: number;
  maxActiveProperties: number;
  maxActiveRequirements: number;
  maxUrlImportsPerMonth: number;
  maxTeamSeats: number;
  customDomainEnabled: boolean;
  privateJaniaEnabled: boolean;
  emailCampaignsMonthlyQuota: number;
  maxEmailsPerMonth: number;
  maxAiMessagesMonth: number;
  whatsappCloudByoEnabled: boolean;
  maxCtlStudiesMonth: number;
  maxIdentityChecksMonth: number;
  maxValuationsMonth: number;
  autoRepublishStore: boolean;
  features: string[];
  sortOrder: number;
  isActive: boolean;
}

export const DEFAULT_PLAN_CATALOG: SubscriptionPlanDefinition[] = [
  {
    code: "free",
    name: "Vecy Semilla (Gratis)",
    description:
      "Publica ofertas y requerimientos sin costo en VECY TIENDA y conecta con colegas en la red colaborativa 50/50.",
    monthlyPriceCop: 0,
    annualPriceCop: 0,
    maxActiveProperties: 5,
    maxActiveRequirements: 10,
    maxUrlImportsPerMonth: 3,
    maxTeamSeats: 1,
    customDomainEnabled: false,
    privateJaniaEnabled: false,
    emailCampaignsMonthlyQuota: 0,
    maxEmailsPerMonth: 0,
    maxAiMessagesMonth: 0,
    whatsappCloudByoEnabled: false,
    maxCtlStudiesMonth: 0,
    maxIdentityChecksMonth: 3,
    maxValuationsMonth: 5,
    autoRepublishStore: true,
    features: [
      "Hasta 5 inmuebles activos",
      "Hasta 10 requerimientos en Tienda de Demandas",
      "3 importaciones inteligentes por URL/mes",
      "Republicación automática en VECY TIENDA",
      "Matches automáticos >= 85%",
    ],
    sortOrder: 1,
    isActive: true,
  },
  {
    code: "agente_pro",
    name: "Vecy Agente Pro",
    description:
      "Vitrina marca blanca en <tu-marca>.vecygroup.com, CRM inmobiliario e importador inteligente ampliado.",
    monthlyPriceCop: 69900,
    annualPriceCop: 699000,
    maxActiveProperties: 40,
    maxActiveRequirements: 50,
    maxUrlImportsPerMonth: 30,
    maxTeamSeats: 1,
    customDomainEnabled: true,
    privateJaniaEnabled: false,
    emailCampaignsMonthlyQuota: 100,
    maxEmailsPerMonth: 100,
    maxAiMessagesMonth: 0,
    whatsappCloudByoEnabled: false,
    maxCtlStudiesMonth: 5,
    maxIdentityChecksMonth: 25,
    maxValuationsMonth: 30,
    autoRepublishStore: true,
    features: [
      "Hasta 40 inmuebles activos y 50 requerimientos",
      "Portal web marca blanca en <slug>.vecygroup.com",
      "30 importaciones por URL/mes (Wasi, Habi, Fincaraíz, Metrocuadrado, Ciencuadras)",
      "Republicación automática bidireccional en VECY TIENDA",
      "Hasta 100 correos CRM/mes con seguimiento de leads",
      "5 Estudios de Títulos SNR/CTL + 25 verificaciones de identidad/mes",
    ],
    sortOrder: 2,
    isActive: true,
  },
  {
    code: "inmobiliaria_growth",
    name: "Vecy Inmobiliaria Growth",
    description:
      "Inventario ilimitado para tu equipo, dominio personalizado, CRM avanzado y Agente JanIA privado.",
    monthlyPriceCop: 129900,
    annualPriceCop: 1299000,
    maxActiveProperties: -1,
    maxActiveRequirements: -1,
    maxUrlImportsPerMonth: 150,
    maxTeamSeats: 5,
    customDomainEnabled: true,
    privateJaniaEnabled: true,
    emailCampaignsMonthlyQuota: 500,
    maxEmailsPerMonth: 500,
    maxAiMessagesMonth: 1000,
    whatsappCloudByoEnabled: false,
    maxCtlStudiesMonth: 25,
    maxIdentityChecksMonth: 100,
    maxValuationsMonth: 120,
    autoRepublishStore: true,
    features: [
      "Inmuebles y requerimientos ilimitados",
      "Subdominio vecygroup.com o dominio propio",
      "Hasta 5 asesores con RBAC multi-tenant",
      "150 importaciones por URL/mes",
      "Agente JanIA privado RAG en tu portal (1.000 mensajes IA/mes)",
      "Hasta 500 correos CRM/mes + 25 Estudios CTL SNR/mes",
    ],
    sortOrder: 3,
    isActive: true,
  },
  {
    code: "elite_ia",
    name: "Vecy Élite IA",
    description:
      "Máxima escala con importación por URL ilimitada, 15 asesores, JanIA privada 24/7 y campañas masivas IA.",
    monthlyPriceCop: 189900,
    annualPriceCop: 1899000,
    maxActiveProperties: -1,
    maxActiveRequirements: -1,
    maxUrlImportsPerMonth: -1,
    maxTeamSeats: 15,
    customDomainEnabled: true,
    privateJaniaEnabled: true,
    emailCampaignsMonthlyQuota: 1500,
    maxEmailsPerMonth: 1500,
    maxAiMessagesMonth: 5000,
    whatsappCloudByoEnabled: true,
    maxCtlStudiesMonth: 100,
    maxIdentityChecksMonth: 300,
    maxValuationsMonth: 500,
    autoRepublishStore: true,
    features: [
      "Todo ilimitado: inmuebles, requerimientos e importaciones por URL",
      "Hasta 15 asientos de equipo con roles owner/admin/agent",
      "Agente JanIA privada RAG (5.000 mensajes/mes) + WhatsApp Cloud API propio (BYO-Number)",
      "Hasta 1.500 correos CRM automatizados con IA al mes",
      "100 Estudios CTL SNR + 300 verificaciones identidad + 500 avalúos ACM/mes",
    ],
    sortOrder: 4,
    isActive: true,
  },
];

export function getPeriodKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? String(date.getUTCFullYear());
  const month = parts.find((p) => p.type === "month")?.value ?? String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function normalizeFeaturesJson(raw: unknown, fallback: string[]): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item));
  }
  return fallback;
}

export async function listSubscriptionPlans(): Promise<SubscriptionPlanDefinition[]> {
  try {
    const db = await getDb();
    if (!db) return DEFAULT_PLAN_CATALOG;
    const rows = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.sortOrder);

    if (!rows || rows.length === 0) {
      return DEFAULT_PLAN_CATALOG;
    }

    return rows.map((row) => {
      const code = (row.code as PlanCode) || "free";
      const fallback = DEFAULT_PLAN_CATALOG.find((p) => p.code === code) ?? DEFAULT_PLAN_CATALOG[0];
      return {
        code,
        name: row.name,
        description: row.description ?? fallback.description,
        monthlyPriceCop: Math.min(row.monthlyPriceCop, MAX_MONTHLY_PLAN_PRICE_COP),
        annualPriceCop: row.annualPriceCop,
        maxActiveProperties: row.maxActiveProperties,
        maxActiveRequirements: row.maxActiveRequirements,
        maxUrlImportsPerMonth: row.maxUrlImportsPerMonth,
        maxTeamSeats: row.maxTeamSeats,
        customDomainEnabled: row.customDomainEnabled,
        privateJaniaEnabled: row.privateJaniaEnabled,
        emailCampaignsMonthlyQuota: row.emailCampaignsMonthlyQuota,
        maxEmailsPerMonth: row.emailCampaignsMonthlyQuota,
        maxAiMessagesMonth:
          typeof (row as any).maxAiMessagesMonth === "number"
            ? (row as any).maxAiMessagesMonth
            : fallback.maxAiMessagesMonth,
        whatsappCloudByoEnabled:
          typeof (row as any).whatsappCloudByoEnabled === "boolean"
            ? (row as any).whatsappCloudByoEnabled
            : fallback.whatsappCloudByoEnabled,
        maxCtlStudiesMonth:
          typeof (row as any).maxCtlStudiesMonth === "number"
            ? (row as any).maxCtlStudiesMonth
            : fallback.maxCtlStudiesMonth,
        maxIdentityChecksMonth:
          typeof (row as any).maxIdentityChecksMonth === "number"
            ? (row as any).maxIdentityChecksMonth
            : fallback.maxIdentityChecksMonth,
        maxValuationsMonth:
          typeof (row as any).maxValuationsMonth === "number"
            ? (row as any).maxValuationsMonth
            : fallback.maxValuationsMonth,
        autoRepublishStore: row.autoRepublishStore,
        features: normalizeFeaturesJson(row.featuresJson, fallback.features),
        sortOrder: row.sortOrder,
        isActive: row.isActive,
      };
    });
  } catch {
    return DEFAULT_PLAN_CATALOG;
  }
}

export async function getPlanByCode(code: string): Promise<SubscriptionPlanDefinition> {
  const catalog = await listSubscriptionPlans();
  return catalog.find((p) => p.code === code) ?? catalog[0] ?? DEFAULT_PLAN_CATALOG[0];
}

export interface UserEntitlementsSnapshot {
  userId: number;
  isAdmin: boolean;
  plan: SubscriptionPlanDefinition;
  subscriptionStatus: string;
  periodKey: string;
  usage: {
    activeProperties: number;
    activeRequirements: number;
    urlImportsUsed: number;
    emailCampaignsUsed: number;
    privateJaniaMessagesUsed: number;
    aiMessagesUsed: number;
    ctlStudiesUsed: number;
    identityChecksUsed: number;
    valuationsUsed: number;
  };
  defaultAgencyId: number | null;
}

export async function getUserEffectiveEntitlements(
  userId: number,
  role?: string,
): Promise<UserEntitlementsSnapshot> {
  const periodKey = getPeriodKey();
  const isAdmin = role === "admin";
  const db = await getDb();

  if (!db) {
    const fallbackPlan = await getPlanByCode(isAdmin ? "elite_ia" : "free");
    return {
      userId,
      isAdmin,
      plan: fallbackPlan,
      subscriptionStatus: "active",
      periodKey,
      usage: {
        activeProperties: 0,
        activeRequirements: 0,
        urlImportsUsed: 0,
        emailCampaignsUsed: 0,
        privateJaniaMessagesUsed: 0,
        aiMessagesUsed: 0,
        ctlStudiesUsed: 0,
        identityChecksUsed: 0,
        valuationsUsed: 0,
      },
      defaultAgencyId: null,
    };
  }

  const [userRow] = await db
    .select({
      id: users.id,
      role: users.role,
      planCode: users.planCode,
      subscriptionStatus: users.subscriptionStatus,
      defaultAgencyId: users.defaultAgencyId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const effectiveIsAdmin = isAdmin || userRow?.role === "admin";

  const [activeSub] = await db
    .select()
    .from(userSubscriptions)
    .where(and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.status, "active")))
    .orderBy(desc(userSubscriptions.id))
    .limit(1);

  const now = new Date();
  const subIsValid =
    activeSub &&
    (!activeSub.currentPeriodEnd || new Date(activeSub.currentPeriodEnd).getTime() >= now.getTime());

  const resolvedPlanCode = effectiveIsAdmin
    ? "elite_ia"
    : subIsValid
      ? activeSub.planCode
      : userRow?.planCode || "free";

  const plan = await getPlanByCode(resolvedPlanCode);

  const [propCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(properties)
    .where(and(eq(properties.agentId, userId), eq(properties.available, true)));

  const [reqCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(requirements)
    .where(and(eq(requirements.userId, userId), eq(requirements.status, "active")));

  const [quotaRow] = await db
    .select()
    .from(usageQuotas)
    .where(and(eq(usageQuotas.userId, userId), eq(usageQuotas.periodKey, periodKey)))
    .limit(1);

  let defaultAgencyId = userRow?.defaultAgencyId ?? null;
  if (!defaultAgencyId) {
    const [ownedAgency] = await db
      .select({ id: agencies.id })
      .from(agencies)
      .where(eq(agencies.ownerUserId, userId))
      .limit(1);
    defaultAgencyId = ownedAgency?.id ?? null;
  }

  return {
    userId,
    isAdmin: effectiveIsAdmin,
    plan,
    subscriptionStatus: effectiveIsAdmin ? "active" : userRow?.subscriptionStatus || "active",
    periodKey,
    usage: {
      activeProperties: propCountRow?.count ?? 0,
      activeRequirements: reqCountRow?.count ?? 0,
      urlImportsUsed: quotaRow?.urlImportsUsed ?? 0,
      emailCampaignsUsed: quotaRow?.emailCampaignsUsed ?? 0,
      privateJaniaMessagesUsed: quotaRow?.privateJaniaMessagesUsed ?? 0,
      aiMessagesUsed: Math.max(
        quotaRow?.aiMessagesUsed ?? 0,
        quotaRow?.privateJaniaMessagesUsed ?? 0,
      ),
      ctlStudiesUsed: quotaRow?.ctlStudiesUsed ?? 0,
      identityChecksUsed: quotaRow?.identityChecksUsed ?? 0,
      valuationsUsed: quotaRow?.valuationsUsed ?? 0,
    },
    defaultAgencyId,
  };
}

export async function assertCanCreateProperty(userId: number, role?: string): Promise<UserEntitlementsSnapshot> {
  const ent = await getUserEffectiveEntitlements(userId, role);
  if (ent.isAdmin || ent.plan.maxActiveProperties < 0) {
    return ent;
  }
  if (ent.usage.activeProperties >= ent.plan.maxActiveProperties) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Alcanzaste el límite de ${ent.plan.maxActiveProperties} inmuebles activos de tu plan ${ent.plan.name}. Mejora tu plan en /planes para publicar sin límites.`,
    });
  }
  return ent;
}

export async function assertCanCreateRequirement(userId: number, role?: string): Promise<UserEntitlementsSnapshot> {
  const ent = await getUserEffectiveEntitlements(userId, role);
  if (ent.isAdmin || ent.plan.maxActiveRequirements < 0) {
    return ent;
  }
  if (ent.usage.activeRequirements >= ent.plan.maxActiveRequirements) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Alcanzaste el límite de ${ent.plan.maxActiveRequirements} requerimientos activos de tu plan ${ent.plan.name}. Mejora tu plan en /planes para continuar.`,
    });
  }
  return ent;
}

export async function assertCanImportByUrl(userId: number, role?: string): Promise<UserEntitlementsSnapshot> {
  const ent = await getUserEffectiveEntitlements(userId, role);
  if (ent.isAdmin || ent.plan.maxUrlImportsPerMonth < 0) {
    return ent;
  }
  if (ent.usage.urlImportsUsed >= ent.plan.maxUrlImportsPerMonth) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Consumiste tus ${ent.plan.maxUrlImportsPerMonth} importaciones por URL de ${ent.periodKey} en el plan ${ent.plan.name}. Mejora tu plan en /planes para ampliar tu cuota.`,
    });
  }
  return ent;
}

export function checkEmailQuotaLimit(params: {
  isAdmin: boolean;
  maxEmailsPerMonth: number;
  used: number;
  requestedCount?: number;
}): { allowed: boolean; remaining: number; reason?: string } {
  const requested = Math.max(1, params.requestedCount ?? 1);
  if (params.isAdmin || params.maxEmailsPerMonth < 0) {
    return { allowed: true, remaining: Number.POSITIVE_INFINITY };
  }
  if (params.maxEmailsPerMonth === 0) {
    return {
      allowed: false,
      remaining: 0,
      reason: "Tu plan actual no incluye envíos de correo automatizado CRM. Mejora tu plan en /planes para activar correos IA.",
    };
  }
  const remaining = Math.max(0, params.maxEmailsPerMonth - Math.max(0, params.used));
  if (remaining < requested) {
    return {
      allowed: false,
      remaining,
      reason: `Alcanzaste tu cuota mensual de ${params.maxEmailsPerMonth} correos CRM (${params.used}/${params.maxEmailsPerMonth} usados). Mejora tu plan en /planes.`,
    };
  }
  return { allowed: true, remaining };
}

export async function assertCanSendEmail(
  userId: number,
  role?: string,
  requestedCount: number = 1,
): Promise<UserEntitlementsSnapshot> {
  const ent = await getUserEffectiveEntitlements(userId, role);
  const check = checkEmailQuotaLimit({
    isAdmin: ent.isAdmin,
    maxEmailsPerMonth: ent.plan.maxEmailsPerMonth ?? ent.plan.emailCampaignsMonthlyQuota,
    used: ent.usage.emailCampaignsUsed,
    requestedCount,
  });
  if (!check.allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: check.reason || "Cuota mensual de correos CRM agotada.",
    });
  }
  return ent;
}

export async function getEmailQuotaSummary(userId: number, role?: string) {
  const ent = await getUserEffectiveEntitlements(userId, role);
  const maxEmailsPerMonth = ent.isAdmin
    ? -1
    : (ent.plan.maxEmailsPerMonth ?? ent.plan.emailCampaignsMonthlyQuota);
  const used = ent.usage.emailCampaignsUsed;
  const remaining =
    maxEmailsPerMonth < 0 ? -1 : Math.max(0, maxEmailsPerMonth - used);
  return {
    planCode: ent.plan.code,
    planName: ent.plan.name,
    isAdmin: ent.isAdmin,
    periodKey: ent.periodKey,
    maxEmailsPerMonth,
    used,
    remaining,
    canSend: ent.isAdmin || maxEmailsPerMonth < 0 || remaining > 0,
  };
}

export function checkAiMessageQuotaLimit(params: {
  isAdmin: boolean;
  privateJaniaEnabled: boolean;
  maxAiMessagesMonth: number;
  used: number;
  requestedCount?: number;
}): { allowed: boolean; remaining: number; reason?: string } {
  const requested = Math.max(1, params.requestedCount ?? 1);
  if (params.isAdmin) {
    return { allowed: true, remaining: Number.POSITIVE_INFINITY };
  }
  if (!params.privateJaniaEnabled || params.maxAiMessagesMonth === 0) {
    return {
      allowed: false,
      remaining: 0,
      reason:
        "Tu plan actual no incluye Agente JanIA Privado. Actualiza a Vecy Inmobiliaria Growth o Élite IA en /planes.",
    };
  }
  if (params.maxAiMessagesMonth < 0) {
    return { allowed: true, remaining: Number.POSITIVE_INFINITY };
  }
  const remaining = Math.max(0, params.maxAiMessagesMonth - Math.max(0, params.used));
  if (remaining < requested) {
    return {
      allowed: false,
      remaining,
      reason: `Alcanzaste tu cuota mensual de ${params.maxAiMessagesMonth} mensajes IA (${params.used}/${params.maxAiMessagesMonth} usados). Mejora tu plan en /planes.`,
    };
  }
  return { allowed: true, remaining };
}

export async function assertCanUsePrivateJania(
  userId: number,
  role?: string,
  requestedCount: number = 1,
): Promise<UserEntitlementsSnapshot> {
  const ent = await getUserEffectiveEntitlements(userId, role);
  const check = checkAiMessageQuotaLimit({
    isAdmin: ent.isAdmin,
    privateJaniaEnabled: ent.plan.privateJaniaEnabled,
    maxAiMessagesMonth: ent.plan.maxAiMessagesMonth,
    used: ent.usage.aiMessagesUsed,
    requestedCount,
  });
  if (!check.allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: check.reason || "Cuota mensual de mensajes IA agotada.",
    });
  }
  return ent;
}

export async function assertCanConfigureWhatsAppCloudByo(
  userId: number,
  role?: string,
): Promise<UserEntitlementsSnapshot> {
  const ent = await getUserEffectiveEntitlements(userId, role);
  if (ent.isAdmin || ent.plan.whatsappCloudByoEnabled) {
    return ent;
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: `La conexión de WhatsApp Cloud API con número propio (BYO-Number) es exclusiva del plan Vecy Élite IA. Tu plan actual es ${ent.plan.name}.`,
  });
}

export function checkLegalToolQuotaLimit(params: {
  isAdmin: boolean;
  toolType: LegalToolType;
  maxAllowed: number;
  used: number;
  requestedCount?: number;
}): { allowed: boolean; remaining: number; reason?: string } {
  const requested = Math.max(1, params.requestedCount ?? 1);
  const labels: Record<LegalToolType, string> = {
    ctl_study: "Estudios de Títulos SNR/CTL",
    identity_check: "Verificaciones de Identidad y Antecedentes",
    valuation: "Avalúos Comerciales ACM",
  };
  if (params.isAdmin || params.maxAllowed < 0) {
    return { allowed: true, remaining: Number.POSITIVE_INFINITY };
  }
  if (params.maxAllowed === 0) {
    return {
      allowed: false,
      remaining: 0,
      reason: `Tu plan actual no incluye ${labels[params.toolType]} en la Suite Legal SaaS. Mejora tu plan en /planes.`,
    };
  }
  const remaining = Math.max(0, params.maxAllowed - Math.max(0, params.used));
  if (remaining < requested) {
    return {
      allowed: false,
      remaining,
      reason: `Alcanzaste tu cuota mensual de ${params.maxAllowed} ${labels[params.toolType]} (${params.used}/${params.maxAllowed} usados). Mejora tu plan en /planes.`,
    };
  }
  return { allowed: true, remaining };
}

export async function assertCanUseLegalTool(
  userId: number,
  toolType: LegalToolType,
  role?: string,
): Promise<UserEntitlementsSnapshot> {
  const ent = await getUserEffectiveEntitlements(userId, role);
  const maxAllowed =
    toolType === "ctl_study"
      ? ent.plan.maxCtlStudiesMonth
      : toolType === "identity_check"
        ? ent.plan.maxIdentityChecksMonth
        : ent.plan.maxValuationsMonth;
  const used =
    toolType === "ctl_study"
      ? ent.usage.ctlStudiesUsed
      : toolType === "identity_check"
        ? ent.usage.identityChecksUsed
        : ent.usage.valuationsUsed;

  const check = checkLegalToolQuotaLimit({
    isAdmin: ent.isAdmin,
    toolType,
    maxAllowed,
    used,
  });
  if (!check.allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: check.reason || "Cuota mensual de Suite Legal agotada.",
    });
  }
  return ent;
}

export async function getAiAndLegalQuotasSummary(userId: number, role?: string) {
  const ent = await getUserEffectiveEntitlements(userId, role);
  const aiLimit = ent.isAdmin ? -1 : ent.plan.privateJaniaEnabled ? ent.plan.maxAiMessagesMonth : 0;
  const ctlLimit = ent.isAdmin ? -1 : ent.plan.maxCtlStudiesMonth;
  const idLimit = ent.isAdmin ? -1 : ent.plan.maxIdentityChecksMonth;
  const valLimit = ent.isAdmin ? -1 : ent.plan.maxValuationsMonth;

  const computeRemaining = (limit: number, used: number) =>
    limit < 0 ? -1 : Math.max(0, limit - used);

  return {
    planCode: ent.plan.code,
    planName: ent.plan.name,
    isAdmin: ent.isAdmin,
    periodKey: ent.periodKey,
    privateJaniaEnabled: ent.isAdmin || ent.plan.privateJaniaEnabled,
    whatsappCloudByoEnabled: ent.isAdmin || ent.plan.whatsappCloudByoEnabled,
    aiMessages: {
      limit: aiLimit,
      used: ent.usage.aiMessagesUsed,
      remaining: computeRemaining(aiLimit, ent.usage.aiMessagesUsed),
    },
    ctlStudies: {
      limit: ctlLimit,
      used: ent.usage.ctlStudiesUsed,
      remaining: computeRemaining(ctlLimit, ent.usage.ctlStudiesUsed),
    },
    identityChecks: {
      limit: idLimit,
      used: ent.usage.identityChecksUsed,
      remaining: computeRemaining(idLimit, ent.usage.identityChecksUsed),
    },
    valuations: {
      limit: valLimit,
      used: ent.usage.valuationsUsed,
      remaining: computeRemaining(valLimit, ent.usage.valuationsUsed),
    },
  };
}

export async function incrementUsageQuota(
  userId: number,
  field:
    | "urlImportsUsed"
    | "emailCampaignsUsed"
    | "privateJaniaMessagesUsed"
    | "aiMessagesUsed"
    | "ctlStudiesUsed"
    | "identityChecksUsed"
    | "valuationsUsed",
  amount: number = 1,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const periodKey = getPeriodKey();
  const isAiField = field === "privateJaniaMessagesUsed" || field === "aiMessagesUsed";

  const existing = await db
    .select()
    .from(usageQuotas)
    .where(and(eq(usageQuotas.userId, userId), eq(usageQuotas.periodKey, periodKey)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(usageQuotas).values({
      userId,
      periodKey,
      urlImportsUsed: field === "urlImportsUsed" ? amount : 0,
      emailCampaignsUsed: field === "emailCampaignsUsed" ? amount : 0,
      privateJaniaMessagesUsed: isAiField ? amount : 0,
      aiMessagesUsed: isAiField ? amount : 0,
      ctlStudiesUsed: field === "ctlStudiesUsed" ? amount : 0,
      identityChecksUsed: field === "identityChecksUsed" ? amount : 0,
      valuationsUsed: field === "valuationsUsed" ? amount : 0,
    });
    return;
  }

  const current = existing[0];
  const nextAiCount = isAiField
    ? Math.max(current.aiMessagesUsed, current.privateJaniaMessagesUsed) + amount
    : current.aiMessagesUsed;
  const nextPrivateJaniaCount = isAiField
    ? Math.max(current.aiMessagesUsed, current.privateJaniaMessagesUsed) + amount
    : current.privateJaniaMessagesUsed;

  await db
    .update(usageQuotas)
    .set({
      urlImportsUsed:
        field === "urlImportsUsed" ? current.urlImportsUsed + amount : current.urlImportsUsed,
      emailCampaignsUsed:
        field === "emailCampaignsUsed" ? current.emailCampaignsUsed + amount : current.emailCampaignsUsed,
      privateJaniaMessagesUsed: nextPrivateJaniaCount,
      aiMessagesUsed: nextAiCount,
      ctlStudiesUsed:
        field === "ctlStudiesUsed" ? current.ctlStudiesUsed + amount : current.ctlStudiesUsed,
      identityChecksUsed:
        field === "identityChecksUsed" ? current.identityChecksUsed + amount : current.identityChecksUsed,
      valuationsUsed:
        field === "valuationsUsed" ? current.valuationsUsed + amount : current.valuationsUsed,
      updatedAt: new Date(),
    })
    .where(eq(usageQuotas.id, current.id));
}
