import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db";
import {
  agencies,
  agencyMembers,
  crmActivities,
  leads,
  properties,
  requirements,
  users,
  type Lead,
} from "../../drizzle/schema";
import {
  type CrmActivityType,
  type CrmLeadTemperature,
  type CrmPipelineStage,
  isValidPipelineStage,
  mapLeadStatusToPipelineStage,
  mapPipelineStageToLeadStatus,
} from "../../shared/crm";

export interface TenantAccessScope {
  userId: number;
  isAdmin: boolean;
  agencyIdsAsManager: number[];
  agencyIdsAsMember: number[];
  defaultAgencyId: number | null;
}

export async function resolveUserTenantScope(
  userId: number,
  role?: string,
): Promise<TenantAccessScope> {
  const isAdmin = role === "admin";
  const db = await getDb();
  if (!db) {
    return {
      userId,
      isAdmin,
      agencyIdsAsManager: [],
      agencyIdsAsMember: [],
      defaultAgencyId: null,
    };
  }

  const [userRow] = await db
    .select({
      role: users.role,
      defaultAgencyId: users.defaultAgencyId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const effectiveAdmin = isAdmin || userRow?.role === "admin";

  const ownedAgencies = await db
    .select({ id: agencies.id })
    .from(agencies)
    .where(and(eq(agencies.ownerUserId, userId), eq(agencies.isActive, true)));

  const memberships = await db
    .select({
      agencyId: agencyMembers.agencyId,
      memberRole: agencyMembers.memberRole,
    })
    .from(agencyMembers)
    .where(and(eq(agencyMembers.userId, userId), eq(agencyMembers.isActive, true)));

  const managerSet = new Set<number>(ownedAgencies.map((a) => a.id));
  const memberSet = new Set<number>(ownedAgencies.map((a) => a.id));

  for (const m of memberships) {
    memberSet.add(m.agencyId);
    const normalizedRole = (m.memberRole || "").toLowerCase();
    if (normalizedRole === "owner" || normalizedRole === "admin" || normalizedRole === "manager") {
      managerSet.add(m.agencyId);
    }
  }

  const defaultAgencyId =
    userRow?.defaultAgencyId ?? ownedAgencies[0]?.id ?? memberships[0]?.agencyId ?? null;

  return {
    userId,
    isAdmin: effectiveAdmin,
    agencyIdsAsManager: Array.from(managerSet),
    agencyIdsAsMember: Array.from(memberSet),
    defaultAgencyId,
  };
}

export function canAccessLead(
  scope: TenantAccessScope,
  lead: {
    agentId?: number | null;
    assignedAgentId?: number | null;
    agencyId?: number | null;
  },
): boolean {
  if (scope.isAdmin) return true;
  if (lead.agentId === scope.userId || lead.assignedAgentId === scope.userId) {
    return true;
  }
  if (
    lead.agencyId !== null &&
    lead.agencyId !== undefined &&
    scope.agencyIdsAsManager.includes(lead.agencyId)
  ) {
    return true;
  }
  return false;
}

export function canAccessTenantOwnedRecord(
  scope: TenantAccessScope,
  record: {
    userId?: number | null;
    agentId?: number | null;
    agencyId?: number | null;
  },
): boolean {
  if (scope.isAdmin) return true;
  if (record.userId === scope.userId || record.agentId === scope.userId) {
    return true;
  }
  if (
    record.agencyId !== null &&
    record.agencyId !== undefined &&
    scope.agencyIdsAsManager.includes(record.agencyId)
  ) {
    return true;
  }
  return false;
}

export function buildLeadAccessCondition(
  scope: TenantAccessScope,
  includeAgencyWide: boolean = true,
): SQL {
  if (scope.isAdmin && includeAgencyWide) {
    return sql`1 = 1`;
  }
  const conditions: SQL[] = [
    eq(leads.agentId, scope.userId),
    eq(leads.assignedAgentId, scope.userId),
  ];
  if (includeAgencyWide && scope.agencyIdsAsManager.length > 0) {
    conditions.push(inArray(leads.agencyId, scope.agencyIdsAsManager));
  }
  return or(...conditions)!;
}

export async function assertLeadAccess(
  scope: TenantAccessScope,
  leadId: number,
): Promise<Lead> {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
  }
  const [lead] = await db
    .select()
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);

  if (!lead) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Prospecto no encontrado en el CRM." });
  }

  if (!canAccessLead(scope, lead)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No tienes permisos para acceder a este prospecto de otro agente o agencia.",
    });
  }

  return lead;
}

export function normalizeInquiryType(
  raw?: string | null,
): "buy" | "sell" | "rent" | "invest" | "general" {
  const val = (raw || "").toLowerCase().trim();
  if (val === "buy" || val.includes("compr") || val.includes("venta")) return "buy";
  if (val === "rent" || val.includes("arriend") || val.includes("alquil")) return "rent";
  if (val === "sell" || val.includes("vend") || val.includes("consign")) return "sell";
  if (val === "invest" || val.includes("invers")) return "invest";
  return "general";
}

export function normalizeLeadEmailForStorage(email?: string | null, phone?: string | null): string {
  const trimmed = (email || "").trim().toLowerCase();
  if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return trimmed;
  }
  const digits = (phone || "").replace(/\D/g, "") || String(Date.now());
  return `sin-correo-${digits}@vecy.local`;
}

export function normalizeLeadStage(stage?: string | null, legacyStatus?: string | null): CrmPipelineStage {
  if (stage && isValidPipelineStage(stage)) {
    return stage;
  }
  return mapLeadStatusToPipelineStage(legacyStatus);
}

export interface CaptureLeadInput {
  agentId: number;
  agencyId?: number | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  documentNumber?: string | null;
  inquiryType?: string | null;
  message?: string | null;
  source: "microsite" | "stealth_link" | "tracking_link" | "agenda" | "manual" | "janIA" | "website";
  propertyId?: number | null;
  requirementId?: number | null;
  pipelineStage?: CrmPipelineStage;
  temperature?: CrmLeadTemperature;
  estimatedBudget?: number | string | null;
  preferredCity?: string | null;
  preferredZone?: string | null;
  tags?: string[];
  notes?: string | null;
  referralToken?: string | null;
  solicitudId?: number | null;
  activityTitle?: string;
  activityBody?: string;
  activityType?: CrmActivityType;
  triggerEmailSequence?: boolean;
}

export async function recordCrmActivity(params: {
  leadId: number;
  agentId: number;
  agencyId?: number | null;
  activityType: CrmActivityType;
  title?: string | null;
  body: string;
  fromStage?: string | null;
  toStage?: string | null;
  dueAt?: Date | null;
  completedAt?: Date | null;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return null;

  const [created] = await db
    .insert(crmActivities)
    .values({
      leadId: params.leadId,
      agentId: params.agentId,
      agencyId: params.agencyId ?? null,
      activityType: params.activityType,
      title: params.title ?? null,
      body: params.body,
      fromStage: params.fromStage ?? null,
      toStage: params.toStage ?? null,
      dueAt: params.dueAt ?? null,
      completedAt: params.completedAt ?? null,
      metadata: params.metadata ?? null,
    })
    .returning();

  return created ?? null;
}

export async function resolveAgentAndAgencyForProperty(params: {
  explicitAgentId?: number | string | null;
  propertyId?: number | null;
  codigoInmueble?: string | null;
  nombreInmueble?: string | null;
}): Promise<{ agentId: number | null; agencyId: number | null; propertyId: number | null }> {
  const db = await getDb();
  if (!db) return { agentId: null, agencyId: null, propertyId: params.propertyId ?? null };

  let resolvedPropertyId = params.propertyId ?? null;
  let resolvedAgentId: number | null = null;
  let resolvedAgencyId: number | null = null;

  if (params.explicitAgentId && !Number.isNaN(Number(params.explicitAgentId))) {
    resolvedAgentId = Number(params.explicitAgentId);
  }

  if (resolvedPropertyId) {
    const [prop] = await db
      .select({ id: properties.id, agentId: properties.agentId, agencyId: properties.agencyId })
      .from(properties)
      .where(eq(properties.id, resolvedPropertyId))
      .limit(1);
    if (prop) {
      if (!resolvedAgentId && prop.agentId) resolvedAgentId = prop.agentId;
      if (prop.agencyId) resolvedAgencyId = prop.agencyId;
    }
  } else if (params.codigoInmueble || params.nombreInmueble) {
    const code = (params.codigoInmueble || "").trim();
    const numericIdMatch = code.match(/\b(\d+)\b/);
    if (numericIdMatch) {
      const candidateId = Number(numericIdMatch[1]);
      if (candidateId > 0) {
        const [prop] = await db
          .select({ id: properties.id, agentId: properties.agentId, agencyId: properties.agencyId })
          .from(properties)
          .where(eq(properties.id, candidateId))
          .limit(1);
        if (prop) {
          resolvedPropertyId = prop.id;
          if (!resolvedAgentId && prop.agentId) resolvedAgentId = prop.agentId;
          if (prop.agencyId) resolvedAgencyId = prop.agencyId;
        }
      }
    }
  }

  if (resolvedAgentId && !resolvedAgencyId) {
    const [u] = await db
      .select({ defaultAgencyId: users.defaultAgencyId })
      .from(users)
      .where(eq(users.id, resolvedAgentId))
      .limit(1);
    resolvedAgencyId = u?.defaultAgencyId ?? null;

    if (!resolvedAgencyId) {
      const [ag] = await db
        .select({ id: agencies.id })
        .from(agencies)
        .where(eq(agencies.ownerUserId, resolvedAgentId))
        .limit(1);
      resolvedAgencyId = ag?.id ?? null;
    }
  }

  return {
    agentId: resolvedAgentId,
    agencyId: resolvedAgencyId,
    propertyId: resolvedPropertyId,
  };
}

export async function captureLeadIntoCrm(input: CaptureLeadInput): Promise<{
  lead: Lead | null;
  created: boolean;
}> {
  const db = await getDb();
  if (!db) return { lead: null, created: false };

  const normalizedEmail = normalizeLeadEmailForStorage(input.email, input.phone);
  const stage: CrmPipelineStage = input.pipelineStage ?? (input.source === "agenda" ? "visita_agendada" : "nuevo");
  const status = mapPipelineStageToLeadStatus(stage);
  const temperature: CrmLeadTemperature = input.temperature ?? (input.source === "agenda" || input.source === "stealth_link" ? "hot" : "warm");
  const inquiryType = normalizeInquiryType(input.inquiryType);
  const tags = Array.from(new Set([...(input.tags ?? []), input.source].filter(Boolean)));

  let resolvedAgencyId = input.agencyId ?? null;
  if (!resolvedAgencyId) {
    const [u] = await db
      .select({ defaultAgencyId: users.defaultAgencyId })
      .from(users)
      .where(eq(users.id, input.agentId))
      .limit(1);
    resolvedAgencyId = u?.defaultAgencyId ?? null;
  }

  let existing: Lead | undefined;
  if (input.solicitudId) {
    const [bySol] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.agentId, input.agentId), eq(leads.solicitudId, input.solicitudId)))
      .limit(1);
    existing = bySol;
  }

  if (!existing && !normalizedEmail.endsWith("@vecy.local")) {
    const conditions = [eq(leads.agentId, input.agentId), eq(leads.email, normalizedEmail)];
    if (input.propertyId) {
      conditions.push(eq(leads.propertyId, input.propertyId));
    }
    const [byEmail] = await db
      .select()
      .from(leads)
      .where(and(...conditions))
      .orderBy(desc(leads.id))
      .limit(1);
    existing = byEmail;
  }

  const budgetDecimal =
    input.estimatedBudget !== null &&
    input.estimatedBudget !== undefined &&
    String(input.estimatedBudget).trim() !== ""
      ? String(Number(String(input.estimatedBudget).replace(/[^\d.]/g, "")) || 0)
      : undefined;

  if (existing) {
    const mergedTags = Array.from(
      new Set([...(Array.isArray(existing.tags) ? existing.tags : []), ...tags]),
    );
    const shouldAdvanceToVisit =
      input.source === "agenda" &&
      existing.pipelineStage !== "cerrado_ganado" &&
      existing.pipelineStage !== "perdido";
    const nextStage: CrmPipelineStage = shouldAdvanceToVisit
      ? "visita_agendada"
      : normalizeLeadStage(existing.pipelineStage, existing.status);

    const [updated] = await db
      .update(leads)
      .set({
        phone: input.phone || existing.phone,
        documentNumber: input.documentNumber || existing.documentNumber,
        propertyId: input.propertyId ?? existing.propertyId,
        requirementId: input.requirementId ?? existing.requirementId,
        agencyId: resolvedAgencyId ?? existing.agencyId,
        pipelineStage: nextStage,
        status: mapPipelineStageToLeadStatus(nextStage),
        temperature: input.temperature ?? existing.temperature,
        estimatedBudget: budgetDecimal ?? existing.estimatedBudget,
        preferredCity: input.preferredCity || existing.preferredCity,
        preferredZone: input.preferredZone || existing.preferredZone,
        referralToken: input.referralToken || existing.referralToken,
        solicitudId: input.solicitudId ?? existing.solicitudId,
        tags: mergedTags,
        message: input.message || existing.message,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, existing.id))
      .returning();

    await recordCrmActivity({
      leadId: existing.id,
      agentId: input.agentId,
      agencyId: resolvedAgencyId,
      activityType: input.activityType ?? (input.source === "agenda" ? "visit" : "lead_captured"),
      title: input.activityTitle || `Interacción actualizada (${input.source})`,
      body: input.activityBody || input.message || `Prospecto re-capturado desde ${input.source}.`,
      fromStage: existing.pipelineStage,
      toStage: nextStage,
      metadata: {
        source: input.source,
        propertyId: input.propertyId ?? null,
        solicitudId: input.solicitudId ?? null,
      },
    });

    if (input.triggerEmailSequence !== false && !normalizedEmail.endsWith("@vecy.local")) {
      try {
        const { enrollLeadInTriggerSequences } = await import("./emailAutomationEngine");
        await enrollLeadInTriggerSequences(
          existing.id,
          input.agentId,
          input.source === "agenda" ? "visit_scheduled" : "lead_created",
          {
            propertyId: input.propertyId ?? undefined,
            requirementId: input.requirementId ?? undefined,
          },
        );
      } catch (seqErr: any) {
        console.warn("[CRM-CAPTURE] Error no bloqueante activando secuencia:", seqErr?.message);
      }
    }

    return { lead: updated ?? existing, created: false };
  }

  const [created] = await db
    .insert(leads)
    .values({
      name: input.name.trim(),
      documentNumber: input.documentNumber ?? null,
      email: normalizedEmail,
      phone: input.phone ?? null,
      inquiryType,
      message: input.message ?? null,
      status,
      source: input.source,
      propertyId: input.propertyId ?? null,
      agentId: input.agentId,
      assignedAgentId: input.agentId,
      agencyId: resolvedAgencyId,
      requirementId: input.requirementId ?? null,
      pipelineStage: stage,
      temperature,
      estimatedBudget: budgetDecimal ?? null,
      preferredCity: input.preferredCity ?? null,
      preferredZone: input.preferredZone ?? null,
      referralToken: input.referralToken ?? null,
      solicitudId: input.solicitudId ?? null,
      tags,
      notes: input.notes ?? null,
    })
    .returning();

  if (created) {
    await recordCrmActivity({
      leadId: created.id,
      agentId: input.agentId,
      agencyId: resolvedAgencyId,
      activityType: input.activityType ?? (input.source === "agenda" ? "visit" : "lead_captured"),
      title: input.activityTitle || `Lead capturado desde ${input.source}`,
      body:
        input.activityBody ||
        input.message ||
        `Nuevo prospecto ${input.name} capturado automáticamente en etapa ${stage}.`,
      toStage: stage,
      metadata: {
        source: input.source,
        propertyId: input.propertyId ?? null,
        referralToken: input.referralToken ?? null,
        solicitudId: input.solicitudId ?? null,
      },
    });

    if (input.triggerEmailSequence !== false && !normalizedEmail.endsWith("@vecy.local")) {
      try {
        const { enrollLeadInTriggerSequences } = await import("./emailAutomationEngine");
        await enrollLeadInTriggerSequences(
          created.id,
          input.agentId,
          input.source === "agenda" ? "visit_scheduled" : "lead_created",
          {
            propertyId: input.propertyId ?? undefined,
            requirementId: input.requirementId ?? undefined,
          },
        );
      } catch (seqErr: any) {
        console.warn("[CRM-CAPTURE] Error no bloqueante activando secuencia:", seqErr?.message);
      }
    }
  }

  return { lead: created ?? null, created: true };
}
