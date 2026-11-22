import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  crmActivities,
  emailMessages,
  emailSequenceEnrollments,
  emailSequences,
  leads,
  properties,
  propertyMatches,
  requirements,
} from "../../drizzle/schema";
import {
  assertLeadAccess,
  buildLeadAccessCondition,
  captureLeadIntoCrm,
  normalizeLeadStage,
  recordCrmActivity,
  resolveUserTenantScope,
} from "../_core/crmService";
import {
  CRM_PIPELINE_STAGES,
  CRM_STAGE_LABELS,
  type CrmPipelineStage,
  mapPipelineStageToLeadStatus,
  validatePipelineTransition,
} from "../../shared/crm";
import { invokeLLM } from "../_core/llm";
import { getEmailQuotaSummary } from "../_core/planEntitlements";

const stageEnumSchema = z.enum([
  "nuevo",
  "contactado",
  "calificado",
  "visita_agendada",
  "negociacion",
  "cerrado_ganado",
  "perdido",
]);

const temperatureEnumSchema = z.enum(["cold", "warm", "hot"]);

const activityTypeSchema = z.enum([
  "note",
  "call",
  "whatsapp",
  "email",
  "visit",
  "stage_change",
  "ai_summary",
  "task",
  "match_alert",
  "lead_captured",
]);

export const crmRouter = router({
  getBoard: protectedProcedure
    .input(
      z
        .object({
          scopeMode: z.enum(["mine", "agency"]).default("agency"),
          search: z.string().max(150).optional(),
          temperature: z.enum(["all", "cold", "warm", "hot"]).default("all"),
          source: z.string().max(80).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }

      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
      const includeAgency = (input?.scopeMode ?? "agency") !== "mine";
      const accessWhere = buildLeadAccessCondition(scope, includeAgency);

      const rows = await db
        .select()
        .from(leads)
        .where(accessWhere)
        .orderBy(desc(leads.updatedAt), desc(leads.id))
        .limit(400);

      const searchQ = (input?.search || "").trim().toLowerCase();
      const tempFilter = input?.temperature ?? "all";
      const sourceFilter = (input?.source || "").trim().toLowerCase();

      const filtered = rows.filter((lead) => {
        if (tempFilter !== "all" && (lead.temperature || "warm") !== tempFilter) {
          return false;
        }
        if (sourceFilter && sourceFilter !== "all" && (lead.source || "").toLowerCase() !== sourceFilter) {
          return false;
        }
        if (searchQ) {
          const haystack = [
            lead.name,
            lead.email,
            lead.phone,
            lead.preferredZone,
            lead.preferredCity,
            lead.notes,
            lead.message,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(searchQ)) return false;
        }
        return true;
      });

      const propIds = Array.from(
        new Set(filtered.map((l) => l.propertyId).filter((id): id is number => Boolean(id))),
      );
      const reqIds = Array.from(
        new Set(filtered.map((l) => l.requirementId).filter((id): id is number => Boolean(id))),
      );

      const propMap = new Map<number, { id: number; name: string; price: string; city: string | null; zone: string; propertyType: string; transactionType: string }>();
      if (propIds.length > 0) {
        const propRows = await db
          .select({
            id: properties.id,
            name: properties.name,
            price: properties.price,
            city: properties.city,
            zone: properties.zone,
            propertyType: properties.propertyType,
            transactionType: properties.transactionType,
          })
          .from(properties)
          .where(inArray(properties.id, propIds));
        for (const p of propRows) propMap.set(p.id, p);
      }

      const reqMap = new Map<number, { id: number; name: string | null; ciudadDeseada: string; zonaDeseada: string | null; presupuestoMax: string | null }>();
      if (reqIds.length > 0) {
        const reqRows = await db
          .select({
            id: requirements.id,
            name: requirements.name,
            ciudadDeseada: requirements.ciudadDeseada,
            zonaDeseada: requirements.zonaDeseada,
            presupuestoMax: requirements.presupuestoMax,
          })
          .from(requirements)
          .where(inArray(requirements.id, reqIds));
        for (const r of reqRows) reqMap.set(r.id, r);
      }

      const nowMs = Date.now();
      const columns: Record<CrmPipelineStage, any[]> = {
        nuevo: [],
        contactado: [],
        calificado: [],
        visita_agendada: [],
        negociacion: [],
        cerrado_ganado: [],
        perdido: [],
      };

      let hotLeads = 0;
      let overdueFollowUps = 0;
      let visitsScheduled = 0;
      let wonLeads = 0;
      let pipelineBudgetCop = 0;

      const enrichedLeads = filtered.map((lead) => {
        const stage = normalizeLeadStage(lead.pipelineStage, lead.status);
        const isOverdue = Boolean(
          lead.nextFollowUpAt &&
            new Date(lead.nextFollowUpAt).getTime() < nowMs &&
            stage !== "cerrado_ganado" &&
            stage !== "perdido",
        );
        if (lead.temperature === "hot") hotLeads++;
        if (isOverdue) overdueFollowUps++;
        if (stage === "visita_agendada") visitsScheduled++;
        if (stage === "cerrado_ganado") wonLeads++;
        if (stage !== "perdido") {
          const budgetNum = Number(lead.estimatedBudget ?? 0);
          if (Number.isFinite(budgetNum) && budgetNum > 0) {
            pipelineBudgetCop += budgetNum;
          }
        }

        const item = {
          ...lead,
          pipelineStage: stage,
          isOverdueFollowUp: isOverdue,
          property: lead.propertyId ? propMap.get(lead.propertyId) ?? null : null,
          requirement: lead.requirementId ? reqMap.get(lead.requirementId) ?? null : null,
        };
        columns[stage].push(item);
        return item;
      });

      const emailQuota = await getEmailQuotaSummary(ctx.user.id, ctx.user.role);

      return {
        stages: CRM_PIPELINE_STAGES,
        columns,
        leads: enrichedLeads,
        canViewAgencyScope: scope.isAdmin || scope.agencyIdsAsManager.length > 0,
        emailQuota,
        kpis: {
          totalLeads: enrichedLeads.length,
          hotLeads,
          overdueFollowUps,
          visitsScheduled,
          wonLeads,
          pipelineBudgetCop,
        },
      };
    }),

  listLeads: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(200).default(100),
          stage: stageEnumSchema.optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
      const accessWhere = buildLeadAccessCondition(scope, true);
      const whereClause = input?.stage
        ? and(accessWhere, eq(leads.pipelineStage, input.stage))
        : accessWhere;

      return await db
        .select()
        .from(leads)
        .where(whereClause)
        .orderBy(desc(leads.updatedAt), desc(leads.id))
        .limit(input?.limit ?? 100);
    }),

  getLeadDetail: protectedProcedure
    .input(z.object({ leadId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
      const lead = await assertLeadAccess(scope, input.leadId);

      const property = lead.propertyId
        ? (
            await db
              .select()
              .from(properties)
              .where(eq(properties.id, lead.propertyId))
              .limit(1)
          )[0] ?? null
        : null;

      const requirement = lead.requirementId
        ? (
            await db
              .select()
              .from(requirements)
              .where(eq(requirements.id, lead.requirementId))
              .limit(1)
          )[0] ?? null
        : null;

      const activities = await db
        .select()
        .from(crmActivities)
        .where(eq(crmActivities.leadId, lead.id))
        .orderBy(desc(crmActivities.createdAt), desc(crmActivities.id))
        .limit(100);

      const emails = await db
        .select()
        .from(emailMessages)
        .where(eq(emailMessages.leadId, lead.id))
        .orderBy(desc(emailMessages.createdAt), desc(emailMessages.id))
        .limit(50);

      const enrollments = await db
        .select({
          enrollment: emailSequenceEnrollments,
          sequenceName: emailSequences.name,
          triggerType: emailSequences.triggerType,
        })
        .from(emailSequenceEnrollments)
        .innerJoin(emailSequences, eq(emailSequenceEnrollments.sequenceId, emailSequences.id))
        .where(eq(emailSequenceEnrollments.leadId, lead.id))
        .orderBy(desc(emailSequenceEnrollments.createdAt));

      let matches: any[] = [];
      if (lead.requirementId || lead.propertyId) {
        const matchConditions = [];
        if (lead.requirementId) matchConditions.push(eq(propertyMatches.requirementId, lead.requirementId));
        if (lead.propertyId) matchConditions.push(eq(propertyMatches.propertyId, lead.propertyId));
        const rawMatches = await db
          .select({
            id: propertyMatches.id,
            matchScore: propertyMatches.matchScore,
            matchReason: propertyMatches.matchReason,
            status: propertyMatches.status,
            propertyId: propertyMatches.propertyId,
            requirementId: propertyMatches.requirementId,
            propertyName: properties.name,
            propertyPrice: properties.price,
            propertyCity: properties.city,
            propertyZone: properties.zone,
            createdAt: propertyMatches.createdAt,
          })
          .from(propertyMatches)
          .innerJoin(properties, eq(propertyMatches.propertyId, properties.id))
          .where(or(...matchConditions))
          .orderBy(desc(propertyMatches.matchScore))
          .limit(15);

        matches = rawMatches.filter((m) => Number(m.matchScore ?? 0) >= 85);
      }

      return {
        lead: {
          ...lead,
          pipelineStage: normalizeLeadStage(lead.pipelineStage, lead.status),
        },
        property,
        requirement,
        activities,
        emails,
        enrollments,
        matches,
      };
    }),

  createLead: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(200),
        email: z.string().email().optional().nullable(),
        phone: z.string().max(30).optional().nullable(),
        documentNumber: z.string().max(60).optional().nullable(),
        inquiryType: z.enum(["buy", "sell", "rent", "invest", "general"]).default("buy"),
        pipelineStage: stageEnumSchema.default("nuevo"),
        temperature: temperatureEnumSchema.default("warm"),
        estimatedBudget: z.union([z.number(), z.string()]).optional().nullable(),
        preferredCity: z.string().max(100).optional().nullable(),
        preferredZone: z.string().max(150).optional().nullable(),
        propertyId: z.number().int().positive().optional().nullable(),
        requirementId: z.number().int().positive().optional().nullable(),
        nextFollowUpAt: z.string().optional().nullable(),
        notes: z.string().max(4000).optional().nullable(),
        message: z.string().max(4000).optional().nullable(),
        tags: z.array(z.string().max(40)).max(15).optional(),
        enrollWelcomeSequence: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);

      const res = await captureLeadIntoCrm({
        agentId: ctx.user.id,
        agencyId: scope.defaultAgencyId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        documentNumber: input.documentNumber,
        inquiryType: input.inquiryType,
        pipelineStage: input.pipelineStage,
        temperature: input.temperature,
        estimatedBudget: input.estimatedBudget,
        preferredCity: input.preferredCity,
        preferredZone: input.preferredZone,
        propertyId: input.propertyId,
        requirementId: input.requirementId,
        notes: input.notes,
        message: input.message,
        tags: input.tags,
        source: "manual",
        triggerEmailSequence: input.enrollWelcomeSequence,
      });

      if (res.lead && input.nextFollowUpAt) {
        const parsedDate = new Date(input.nextFollowUpAt);
        if (!Number.isNaN(parsedDate.getTime())) {
          await db
            .update(leads)
            .set({ nextFollowUpAt: parsedDate, updatedAt: new Date() })
            .where(eq(leads.id, res.lead.id));
          res.lead.nextFollowUpAt = parsedDate;
        }
      }

      return res;
    }),

  updateLead: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        name: z.string().min(2).max(200).optional(),
        email: z.string().email().optional(),
        phone: z.string().max(30).optional().nullable(),
        documentNumber: z.string().max(60).optional().nullable(),
        inquiryType: z.enum(["buy", "sell", "rent", "invest", "general"]).optional(),
        pipelineStage: stageEnumSchema.optional(),
        temperature: temperatureEnumSchema.optional(),
        estimatedBudget: z.union([z.number(), z.string()]).optional().nullable(),
        preferredCity: z.string().max(100).optional().nullable(),
        preferredZone: z.string().max(150).optional().nullable(),
        propertyId: z.number().int().positive().optional().nullable(),
        requirementId: z.number().int().positive().optional().nullable(),
        nextFollowUpAt: z.string().optional().nullable(),
        notes: z.string().max(4000).optional().nullable(),
        message: z.string().max(4000).optional().nullable(),
        tags: z.array(z.string().max(40)).max(15).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
      const existing = await assertLeadAccess(scope, input.leadId);

      const currentStage = normalizeLeadStage(existing.pipelineStage, existing.status);
      const nextStage = input.pipelineStage ?? currentStage;
      const transition = validatePipelineTransition(currentStage, nextStage);
      if (!transition.valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: transition.reason });
      }

      const nextFollowUpDate =
        input.nextFollowUpAt === null
          ? null
          : input.nextFollowUpAt
            ? new Date(input.nextFollowUpAt)
            : existing.nextFollowUpAt;

      const budgetVal =
        input.estimatedBudget === null
          ? null
          : input.estimatedBudget !== undefined && String(input.estimatedBudget).trim() !== ""
            ? String(Number(String(input.estimatedBudget).replace(/[^\d.]/g, "")) || 0)
            : existing.estimatedBudget;

      const [updated] = await db
        .update(leads)
        .set({
          name: input.name?.trim() ?? existing.name,
          email: input.email ? input.email.trim().toLowerCase() : existing.email,
          phone: input.phone !== undefined ? input.phone : existing.phone,
          documentNumber:
            input.documentNumber !== undefined ? input.documentNumber : existing.documentNumber,
          inquiryType: input.inquiryType ?? existing.inquiryType,
          pipelineStage: nextStage,
          status: mapPipelineStageToLeadStatus(nextStage),
          temperature: input.temperature ?? existing.temperature,
          estimatedBudget: budgetVal,
          preferredCity:
            input.preferredCity !== undefined ? input.preferredCity : existing.preferredCity,
          preferredZone:
            input.preferredZone !== undefined ? input.preferredZone : existing.preferredZone,
          propertyId: input.propertyId !== undefined ? input.propertyId : existing.propertyId,
          requirementId:
            input.requirementId !== undefined ? input.requirementId : existing.requirementId,
          nextFollowUpAt:
            nextFollowUpDate && !Number.isNaN(new Date(nextFollowUpDate).getTime())
              ? nextFollowUpDate
              : null,
          notes: input.notes !== undefined ? input.notes : existing.notes,
          message: input.message !== undefined ? input.message : existing.message,
          tags: input.tags !== undefined ? input.tags : existing.tags,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, existing.id))
        .returning();

      if (transition.isStageChange) {
        await recordCrmActivity({
          leadId: existing.id,
          agentId: ctx.user.id,
          agencyId: existing.agencyId ?? scope.defaultAgencyId,
          activityType: "stage_change",
          title: `Etapa actualizada: ${CRM_STAGE_LABELS[currentStage]} → ${CRM_STAGE_LABELS[nextStage]}`,
          body: `El prospecto pasó de ${CRM_STAGE_LABELS[currentStage]} a ${CRM_STAGE_LABELS[nextStage]}.`,
          fromStage: currentStage,
          toStage: nextStage,
        });
      }

      return updated;
    }),

  updateStage: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        toStage: stageEnumSchema,
        note: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
      const existing = await assertLeadAccess(scope, input.leadId);

      const fromStage = normalizeLeadStage(existing.pipelineStage, existing.status);
      const transition = validatePipelineTransition(fromStage, input.toStage);
      if (!transition.valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: transition.reason });
      }

      const [updated] = await db
        .update(leads)
        .set({
          pipelineStage: input.toStage,
          status: mapPipelineStageToLeadStatus(input.toStage),
          updatedAt: new Date(),
        })
        .where(eq(leads.id, existing.id))
        .returning();

      if (transition.isStageChange || input.note) {
        await recordCrmActivity({
          leadId: existing.id,
          agentId: ctx.user.id,
          agencyId: existing.agencyId ?? scope.defaultAgencyId,
          activityType: "stage_change",
          title: `Movido a ${CRM_STAGE_LABELS[input.toStage]}`,
          body:
            input.note?.trim() ||
            `Transición en Kanban: ${CRM_STAGE_LABELS[fromStage]} → ${CRM_STAGE_LABELS[input.toStage]}.`,
          fromStage,
          toStage: input.toStage,
        });
      }

      return updated;
    }),

  addActivity: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        activityType: activityTypeSchema.default("note"),
        title: z.string().max(240).optional(),
        body: z.string().min(1).max(4000),
        dueAt: z.string().optional().nullable(),
        setAsNextFollowUp: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
      const lead = await assertLeadAccess(scope, input.leadId);

      const dueDate = input.dueAt ? new Date(input.dueAt) : null;
      const validDue = dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null;

      const activity = await recordCrmActivity({
        leadId: lead.id,
        agentId: ctx.user.id,
        agencyId: lead.agencyId ?? scope.defaultAgencyId,
        activityType: input.activityType,
        title: input.title?.trim() || null,
        body: input.body.trim(),
        dueAt: validDue,
      });

      const leadPatch: Record<string, unknown> = { updatedAt: new Date() };
      if (input.setAsNextFollowUp && validDue) {
        leadPatch.nextFollowUpAt = validDue;
      }
      if (["call", "whatsapp", "email", "visit"].includes(input.activityType)) {
        leadPatch.lastContactedAt = new Date();
      }
      await db.update(leads).set(leadPatch).where(eq(leads.id, lead.id));

      return activity;
    }),

  completeTask: protectedProcedure
    .input(
      z.object({
        activityId: z.number().int().positive(),
        completed: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);

      const [act] = await db
        .select()
        .from(crmActivities)
        .where(eq(crmActivities.id, input.activityId))
        .limit(1);

      if (!act) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Actividad no encontrada." });
      }

      await assertLeadAccess(scope, act.leadId);

      const [updated] = await db
        .update(crmActivities)
        .set({
          completedAt: input.completed ? new Date() : null,
        })
        .where(eq(crmActivities.id, act.id))
        .returning();

      return updated;
    }),

  generateAiLeadSummary: protectedProcedure
    .input(z.object({ leadId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
      const lead = await assertLeadAccess(scope, input.leadId);

      const recentActivities = await db
        .select()
        .from(crmActivities)
        .where(eq(crmActivities.leadId, lead.id))
        .orderBy(desc(crmActivities.createdAt))
        .limit(10);

      const stage = normalizeLeadStage(lead.pipelineStage, lead.status);
      const fallbackSummary = [
        `Perfil: ${lead.name} (${CRM_STAGE_LABELS[stage]}, temperatura ${lead.temperature}).`,
        lead.estimatedBudget
          ? `Presupuesto estimado: $${Number(lead.estimatedBudget).toLocaleString("es-CO")} COP.`
          : "Presupuesto pendiente por confirmar.",
        lead.preferredZone || lead.preferredCity
          ? `Interés geográfico: ${[lead.preferredZone, lead.preferredCity].filter(Boolean).join(", ")}.`
          : null,
        `Actividad reciente: ${recentActivities.length} registros. Siguiente paso recomendado: confirmar disponibilidad de visita y validación financiera.`,
      ]
        .filter(Boolean)
        .join(" ");

      let summaryText = fallbackSummary;
      if (process.env.NODE_ENV !== "test") {
        try {
          const llmRes = await invokeLLM({
            messages: [
              {
                role: "system",
                content:
                  "Eres JanIA CRM Coach. Genera un resumen ejecutivo de 3 líneas en español colombiano con estado actual del prospecto y próxima acción recomendada. Usa SOLO los datos reales entregados.",
              },
              {
                role: "user",
                content: JSON.stringify({
                  name: lead.name,
                  stage,
                  temperature: lead.temperature,
                  inquiryType: lead.inquiryType,
                  estimatedBudget: lead.estimatedBudget,
                  preferredZone: lead.preferredZone,
                  preferredCity: lead.preferredCity,
                  notes: lead.notes,
                  recentActivities: recentActivities.map((a) => ({
                    type: a.activityType,
                    title: a.title,
                    body: a.body,
                  })),
                }),
              },
            ],
            highReasoning: false,
            allowPaidFailover: false,
          });
          const aiText = llmRes?.choices?.[0]?.message?.content;
          if (typeof aiText === "string" && aiText.trim().length > 20) {
            summaryText = aiText.trim();
          }
        } catch {
          summaryText = fallbackSummary;
        }
      }

      const savedActivity = await recordCrmActivity({
        leadId: lead.id,
        agentId: ctx.user.id,
        agencyId: lead.agencyId ?? scope.defaultAgencyId,
        activityType: "ai_summary",
        title: "Resumen Ejecutivo IA",
        body: summaryText,
      });

      return { summary: summaryText, activity: savedActivity };
    }),

  deleteLead: protectedProcedure
    .input(z.object({ leadId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
      const lead = await assertLeadAccess(scope, input.leadId);

      await db.delete(leads).where(eq(leads.id, lead.id));
      return { success: true, deletedId: lead.id };
    }),
});
