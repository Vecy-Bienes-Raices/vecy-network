import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  agencies,
  emailAccounts,
  emailMessages,
  emailSequenceEnrollments,
  emailSequences,
  emailTemplates,
  leads,
  properties,
  type EmailAccount,
} from "../../drizzle/schema";
import {
  assertLeadAccess,
  canAccessTenantOwnedRecord,
  resolveUserTenantScope,
} from "../_core/crmService";
import {
  encryptSmtpSecret,
  enrollLeadInSequence,
  ensureDefaultEmailSequencesForUser,
  generateAiEmailDraft,
  processDueEmailAutomations,
  sendOrQueueCrmEmail,
  validateSmtpHostSafety,
  verifySmtpConnection,
} from "../_core/emailAutomationEngine";
import { getEmailQuotaSummary } from "../_core/planEntitlements";
import { type EmailSequenceStep } from "../../shared/crm";

function sanitizeEmailAccount(account: EmailAccount | null) {
  if (!account) return null;
  const { smtpPasswordEncrypted, ...rest } = account;
  return {
    ...rest,
    hasSmtpPassword: Boolean(smtpPasswordEncrypted),
  };
}

const sequenceStepSchema = z.object({
  stepOrder: z.number().int().min(0).max(20),
  delayHours: z.number().min(0).max(720),
  subjectTemplate: z.string().min(2).max(280),
  bodyHtmlTemplate: z.string().min(5).max(15000),
  bodyTextTemplate: z.string().max(15000).optional(),
  useAiPersonalization: z.boolean().default(true),
  aiGoal: z.string().max(60).optional(),
});

export const emailAutomationRouter = router({
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
    }
    const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
    const quota = await getEmailQuotaSummary(ctx.user.id, ctx.user.role);

    const [accountRow] = await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.userId, ctx.user.id))
      .limit(1);

    const sequences = await db
      .select()
      .from(emailSequences)
      .where(eq(emailSequences.userId, ctx.user.id));

    const enrollments = await db
      .select({ id: emailSequenceEnrollments.id, status: emailSequenceEnrollments.status })
      .from(emailSequenceEnrollments)
      .where(eq(emailSequenceEnrollments.userId, ctx.user.id));

    const messages = await db
      .select({ id: emailMessages.id, status: emailMessages.status })
      .from(emailMessages)
      .where(eq(emailMessages.userId, ctx.user.id));

    return {
      account: sanitizeEmailAccount(accountRow ?? null),
      defaultReplyTo: ctx.user.email || "",
      defaultDisplayName: ctx.user.name || "Asesor Inmobiliario VECY",
      quota,
      agencyId: scope.defaultAgencyId,
      stats: {
        sent: messages.filter((m) => m.status === "sent").length,
        queued: messages.filter((m) => m.status === "queued").length,
        failed: messages.filter((m) => m.status === "failed").length,
        quotaBlocked: messages.filter((m) => m.status === "quota_blocked").length,
        activeSequences: sequences.filter((s) => s.isActive).length,
        totalSequences: sequences.length,
        activeEnrollments: enrollments.filter((e) => e.status === "active").length,
      },
    };
  }),

  upsertAccount: protectedProcedure
    .input(
      z.object({
        mode: z.enum(["vecy_relay", "custom_smtp"]),
        displayName: z.string().min(2).max(180),
        fromEmail: z.string().email().optional().nullable(),
        replyToEmail: z.string().email(),
        signatureHtml: z.string().max(4000).optional().nullable(),
        smtpHost: z.string().max(255).optional().nullable(),
        smtpPort: z.number().int().min(1).max(65535).default(587),
        smtpSecure: z.boolean().default(false),
        smtpUser: z.string().max(320).optional().nullable(),
        smtpPassword: z.string().max(320).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);

      const [existing] = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, ctx.user.id))
        .limit(1);

      let encryptedPass = existing?.smtpPasswordEncrypted ?? null;

      if (input.mode === "custom_smtp") {
        if (!input.smtpHost || !input.smtpUser) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Para SMTP propio debes indicar el servidor (host) y usuario SMTP.",
          });
        }
        const safety = validateSmtpHostSafety(input.smtpHost, input.smtpPort);
        if (!safety.valid) {
          throw new TRPCError({ code: "BAD_REQUEST", message: safety.reason });
        }
        if (input.smtpPassword && input.smtpPassword.trim()) {
          encryptedPass = encryptSmtpSecret(input.smtpPassword.trim());
        } else if (!encryptedPass) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ingresa la contraseña o App Password SMTP para guardar tu cuenta.",
          });
        }
      }

      const now = new Date();
      if (existing) {
        const [updated] = await db
          .update(emailAccounts)
          .set({
            agencyId: scope.defaultAgencyId,
            mode: input.mode,
            displayName: input.displayName.trim(),
            fromEmail: input.fromEmail?.trim().toLowerCase() ?? (input.mode === "custom_smtp" ? input.smtpUser?.trim().toLowerCase() ?? null : null),
            replyToEmail: input.replyToEmail.trim().toLowerCase(),
            signatureHtml: input.signatureHtml ?? null,
            smtpHost: input.mode === "custom_smtp" ? input.smtpHost?.trim().toLowerCase() ?? null : null,
            smtpPort: input.smtpPort,
            smtpSecure: input.smtpSecure,
            smtpUser: input.mode === "custom_smtp" ? input.smtpUser?.trim() ?? null : null,
            smtpPasswordEncrypted: input.mode === "custom_smtp" ? encryptedPass : null,
            isVerified: input.mode === "vecy_relay" ? true : existing.isVerified,
            updatedAt: now,
          })
          .where(eq(emailAccounts.id, existing.id))
          .returning();
        return sanitizeEmailAccount(updated);
      }

      const [inserted] = await db
        .insert(emailAccounts)
        .values({
          userId: ctx.user.id,
          agencyId: scope.defaultAgencyId,
          mode: input.mode,
          displayName: input.displayName.trim(),
          fromEmail: input.fromEmail?.trim().toLowerCase() ?? (input.mode === "custom_smtp" ? input.smtpUser?.trim().toLowerCase() ?? null : null),
          replyToEmail: input.replyToEmail.trim().toLowerCase(),
          signatureHtml: input.signatureHtml ?? null,
          smtpHost: input.mode === "custom_smtp" ? input.smtpHost?.trim().toLowerCase() ?? null : null,
          smtpPort: input.smtpPort,
          smtpSecure: input.smtpSecure,
          smtpUser: input.mode === "custom_smtp" ? input.smtpUser?.trim() ?? null : null,
          smtpPasswordEncrypted: input.mode === "custom_smtp" ? encryptedPass : null,
          isVerified: input.mode === "vecy_relay",
        })
        .returning();

      return sanitizeEmailAccount(inserted);
    }),

  verifySmtpAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
    }
    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.userId, ctx.user.id))
      .limit(1);

    if (!account) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Primero guarda tu identidad de correo." });
    }

    if (account.mode === "vecy_relay") {
      const [updated] = await db
        .update(emailAccounts)
        .set({ isVerified: true, lastVerifiedAt: new Date(), lastError: null, updatedAt: new Date() })
        .where(eq(emailAccounts.id, account.id))
        .returning();
      return { ok: true, account: sanitizeEmailAccount(updated) };
    }

    if (!account.smtpHost || !account.smtpUser || !account.smtpPasswordEncrypted) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Faltan credenciales SMTP propias." });
    }

    const { decryptSmtpSecret } = await import("../_core/emailAutomationEngine");
    const pass = decryptSmtpSecret(account.smtpPasswordEncrypted);
    const verifyRes = await verifySmtpConnection({
      host: account.smtpHost,
      port: account.smtpPort,
      secure: account.smtpSecure,
      user: account.smtpUser,
      pass,
    });

    const [updated] = await db
      .update(emailAccounts)
      .set({
        isVerified: verifyRes.ok,
        lastVerifiedAt: verifyRes.ok ? new Date() : account.lastVerifiedAt,
        lastError: verifyRes.ok ? null : verifyRes.error || "Error SMTP",
        updatedAt: new Date(),
      })
      .where(eq(emailAccounts.id, account.id))
      .returning();

    return {
      ok: verifyRes.ok,
      error: verifyRes.error,
      account: sanitizeEmailAccount(updated),
    };
  }),

  listTemplates: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);

    const conditions = [eq(emailTemplates.isSystem, true), eq(emailTemplates.userId, ctx.user.id)];
    if (scope.agencyIdsAsManager.length > 0) {
      conditions.push(inArray(emailTemplates.agencyId, scope.agencyIdsAsManager));
    }

    return await db
      .select()
      .from(emailTemplates)
      .where(or(...conditions))
      .orderBy(desc(emailTemplates.isSystem), desc(emailTemplates.id));
  }),

  upsertTemplate: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        name: z.string().min(2).max(180),
        category: z.enum(["welcome", "follow_up", "match_alert", "visit", "custom"]).default("follow_up"),
        subjectTemplate: z.string().min(2).max(280),
        bodyHtmlTemplate: z.string().min(5).max(15000),
        bodyTextTemplate: z.string().max(15000).optional().nullable(),
        aiPromptHint: z.string().max(600).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);

      if (input.id) {
        const [existing] = await db
          .select()
          .from(emailTemplates)
          .where(eq(emailTemplates.id, input.id))
          .limit(1);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Plantilla no encontrada." });
        if (existing.isSystem && !scope.isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Las plantillas base del sistema son de solo lectura." });
        }
        if (!canAccessTenantOwnedRecord(scope, existing)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const [updated] = await db
          .update(emailTemplates)
          .set({
            name: input.name.trim(),
            category: input.category,
            subjectTemplate: input.subjectTemplate.trim(),
            bodyHtmlTemplate: input.bodyHtmlTemplate,
            bodyTextTemplate: input.bodyTextTemplate ?? null,
            aiPromptHint: input.aiPromptHint ?? null,
            updatedAt: new Date(),
          })
          .where(eq(emailTemplates.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await db
        .insert(emailTemplates)
        .values({
          userId: ctx.user.id,
          agencyId: scope.defaultAgencyId,
          name: input.name.trim(),
          category: input.category,
          subjectTemplate: input.subjectTemplate.trim(),
          bodyHtmlTemplate: input.bodyHtmlTemplate,
          bodyTextTemplate: input.bodyTextTemplate ?? null,
          aiPromptHint: input.aiPromptHint ?? null,
          isSystem: false,
          isActive: true,
        })
        .returning();
      return created;
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
      const [existing] = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, input.id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.isSystem) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No puedes eliminar plantillas base del sistema." });
      }
      if (!canAccessTenantOwnedRecord(scope, existing)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await db.delete(emailTemplates).where(eq(emailTemplates.id, existing.id));
      return { success: true };
    }),

  listSequences: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
    const whereClause =
      scope.isAdmin
        ? undefined
        : scope.agencyIdsAsManager.length > 0
          ? or(eq(emailSequences.userId, ctx.user.id), inArray(emailSequences.agencyId, scope.agencyIdsAsManager))
          : eq(emailSequences.userId, ctx.user.id);

    const seqs = whereClause
      ? await db.select().from(emailSequences).where(whereClause).orderBy(desc(emailSequences.id))
      : await db.select().from(emailSequences).orderBy(desc(emailSequences.id));

    return seqs;
  }),

  bootstrapDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
    return await ensureDefaultEmailSequencesForUser(ctx.user.id, scope.defaultAgencyId);
  }),

  upsertSequence: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        name: z.string().min(2).max(180),
        description: z.string().max(600).optional().nullable(),
        triggerType: z.enum(["lead_created", "match_85_plus", "visit_scheduled", "manual"]),
        steps: z.array(sequenceStepSchema).min(1).max(10),
        isActive: z.boolean().default(true),
        stopOnStageChange: z.boolean().default(false),
        stopStages: z.array(z.string()).default(["cerrado_ganado", "perdido"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);

      if (input.id) {
        const [existing] = await db
          .select()
          .from(emailSequences)
          .where(eq(emailSequences.id, input.id))
          .limit(1);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        if (!canAccessTenantOwnedRecord(scope, existing)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const [updated] = await db
          .update(emailSequences)
          .set({
            name: input.name.trim(),
            description: input.description ?? null,
            triggerType: input.triggerType,
            stepsJson: input.steps,
            isActive: input.isActive,
            stopOnStageChange: input.stopOnStageChange,
            stopStagesJson: input.stopStages,
            updatedAt: new Date(),
          })
          .where(eq(emailSequences.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await db
        .insert(emailSequences)
        .values({
          userId: ctx.user.id,
          agencyId: scope.defaultAgencyId,
          name: input.name.trim(),
          description: input.description ?? null,
          triggerType: input.triggerType,
          stepsJson: input.steps,
          isActive: input.isActive,
          stopOnStageChange: input.stopOnStageChange,
          stopStagesJson: input.stopStages,
        })
        .returning();
      return created;
    }),

  toggleSequence: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
      const [existing] = await db
        .select()
        .from(emailSequences)
        .where(eq(emailSequences.id, input.id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canAccessTenantOwnedRecord(scope, existing)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const [updated] = await db
        .update(emailSequences)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(eq(emailSequences.id, existing.id))
        .returning();
      return updated;
    }),

  enrollLead: protectedProcedure
    .input(
      z.object({
        sequenceId: z.number().int().positive(),
        leadId: z.number().int().positive(),
        startDelayHours: z.number().min(0).max(720).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
      const lead = await assertLeadAccess(scope, input.leadId);
      const [seq] = await db
        .select()
        .from(emailSequences)
        .where(eq(emailSequences.id, input.sequenceId))
        .limit(1);
      if (!seq) throw new TRPCError({ code: "NOT_FOUND", message: "Secuencia no encontrada." });
      if (!canAccessTenantOwnedRecord(scope, seq)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const enrollment = await enrollLeadInSequence({
        sequenceId: seq.id,
        leadId: lead.id,
        userId: ctx.user.id,
        agencyId: lead.agencyId ?? scope.defaultAgencyId,
        startDelayHours: input.startDelayHours,
      });

      return enrollment;
    }),

  updateEnrollmentStatus: protectedProcedure
    .input(
      z.object({
        enrollmentId: z.number().int().positive(),
        status: z.enum(["active", "paused", "cancelled"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
      const [existing] = await db
        .select()
        .from(emailSequenceEnrollments)
        .where(eq(emailSequenceEnrollments.id, input.enrollmentId))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canAccessTenantOwnedRecord(scope, existing)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const [updated] = await db
        .update(emailSequenceEnrollments)
        .set({
          status: input.status,
          nextRunAt: input.status === "active" ? new Date() : existing.nextRunAt,
          updatedAt: new Date(),
        })
        .where(eq(emailSequenceEnrollments.id, existing.id))
        .returning();
      return updated;
    }),

  listEnrollments: protectedProcedure
    .input(z.object({ leadId: z.number().int().positive().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);

      if (input?.leadId) {
        await assertLeadAccess(scope, input.leadId);
      }

      const ownerCond = scope.isAdmin
        ? undefined
        : scope.agencyIdsAsManager.length > 0
          ? or(
              eq(emailSequenceEnrollments.userId, ctx.user.id),
              inArray(emailSequenceEnrollments.agencyId, scope.agencyIdsAsManager),
            )
          : eq(emailSequenceEnrollments.userId, ctx.user.id);

      const finalWhere =
        input?.leadId && ownerCond
          ? and(ownerCond, eq(emailSequenceEnrollments.leadId, input.leadId))
          : input?.leadId
            ? eq(emailSequenceEnrollments.leadId, input.leadId)
            : ownerCond;

      const baseQuery = db
        .select({
          enrollment: emailSequenceEnrollments,
          sequenceName: emailSequences.name,
          triggerType: emailSequences.triggerType,
          leadName: leads.name,
          leadEmail: leads.email,
        })
        .from(emailSequenceEnrollments)
        .innerJoin(emailSequences, eq(emailSequenceEnrollments.sequenceId, emailSequences.id))
        .innerJoin(leads, eq(emailSequenceEnrollments.leadId, leads.id));

      return finalWhere
        ? await baseQuery.where(finalWhere).orderBy(desc(emailSequenceEnrollments.id)).limit(100)
        : await baseQuery.orderBy(desc(emailSequenceEnrollments.id)).limit(100);
    }),

  generateAiDraft: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        intent: z
          .enum(["welcome", "followup_24h", "followup_72h", "match_alert", "visit_confirmation", "reply"])
          .default("welcome"),
        tone: z.enum(["profesional", "cercano", "ejecutivo", "persuasivo"]).default("profesional"),
        customInstructions: z.string().max(800).optional().nullable(),
        incomingMessage: z.string().max(2000).optional().nullable(),
        propertyId: z.number().int().positive().optional().nullable(),
        matchScore: z.number().min(0).max(100).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible" });
      }
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
      const lead = await assertLeadAccess(scope, input.leadId);

      const propId = input.propertyId ?? lead.propertyId;
      const property = propId
        ? (await db.select().from(properties).where(eq(properties.id, propId)).limit(1))[0] ?? null
        : null;

      let agencyName: string | null = null;
      if (scope.defaultAgencyId) {
        const [ag] = await db
          .select({ brandName: agencies.brandName })
          .from(agencies)
          .where(eq(agencies.id, scope.defaultAgencyId))
          .limit(1);
        agencyName = ag?.brandName ?? null;
      }
      const userTheme = (ctx.user.themeConfig as any) || {};
      const resolvedAgencyName = agencyName || userTheme.agencyName || ctx.user.name || "Vecy Bienes Raíces";

      return await generateAiEmailDraft({
        lead,
        property,
        matchScore: input.matchScore ?? null,
        agentName: ctx.user.name || resolvedAgencyName,
        agencyName: resolvedAgencyName,
        agentPhone: userTheme.contactPhone || ctx.user.phone || "+57 316 6569719",
        intent: input.intent,
        tone: input.tone,
        customInstructions: input.customInstructions,
        incomingMessage: input.incomingMessage,
      });
    }),

  sendEmail: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        toEmail: z.string().email().optional(),
        subject: z.string().min(2).max(280),
        bodyHtml: z.string().min(2).max(30000),
        bodyText: z.string().max(30000).optional(),
        scheduledFor: z.string().optional().nullable(),
        aiGenerated: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);
      const lead = await assertLeadAccess(scope, input.leadId);
      const targetEmail = (input.toEmail || lead.email || "").trim();

      const parsedSchedule = input.scheduledFor ? new Date(input.scheduledFor) : null;
      const scheduledDate =
        parsedSchedule && !Number.isNaN(parsedSchedule.getTime()) ? parsedSchedule : null;

      return await sendOrQueueCrmEmail({
        userId: ctx.user.id,
        userRole: ctx.user.role,
        agencyId: lead.agencyId ?? scope.defaultAgencyId,
        leadId: lead.id,
        toEmail: targetEmail,
        subject: input.subject,
        bodyHtml: input.bodyHtml,
        bodyText: input.bodyText,
        scheduledFor: scheduledDate,
        aiGenerated: input.aiGenerated,
      });
    }),

  listMessages: protectedProcedure
    .input(
      z
        .object({
          leadId: z.number().int().positive().optional(),
          status: z.enum(["all", "draft", "queued", "sent", "failed", "quota_blocked", "cancelled"]).default("all"),
          limit: z.number().int().min(1).max(200).default(80),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const scope = await resolveUserTenantScope(ctx.user.id, ctx.user.role);

      if (input?.leadId) {
        await assertLeadAccess(scope, input.leadId);
      }

      const conditions = [];
      if (!scope.isAdmin) {
        if (scope.agencyIdsAsManager.length > 0) {
          conditions.push(
            or(
              eq(emailMessages.userId, ctx.user.id),
              inArray(emailMessages.agencyId, scope.agencyIdsAsManager),
            )!,
          );
        } else {
          conditions.push(eq(emailMessages.userId, ctx.user.id));
        }
      }
      if (input?.leadId) {
        conditions.push(eq(emailMessages.leadId, input.leadId));
      }
      if (input?.status && input.status !== "all") {
        conditions.push(eq(emailMessages.status, input.status));
      }

      const base = db
        .select({
          message: emailMessages,
          leadName: leads.name,
        })
        .from(emailMessages)
        .leftJoin(leads, eq(emailMessages.leadId, leads.id));

      return conditions.length > 0
        ? await base.where(and(...conditions)).orderBy(desc(emailMessages.id)).limit(input?.limit ?? 80)
        : await base.orderBy(desc(emailMessages.id)).limit(input?.limit ?? 80);
    }),

  runDueQueueNow: protectedProcedure.mutation(async ({ ctx }) => {
    return await processDueEmailAutomations({
      userId: ctx.user.id,
      limit: 25,
    });
  }),
});
