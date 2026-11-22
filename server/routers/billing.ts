import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  agencies,
  agencyMembers,
  paymentTransactions,
  properties,
  userSubscriptions,
  users,
} from "../../drizzle/schema";
import {
  getUserEffectiveEntitlements,
  listSubscriptionPlans,
  type PlanCode,
} from "../_core/planEntitlements";
import { createWompiCheckoutSession } from "../_core/wompiBillingService";

function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const RESERVED_SLUGS = new Set([
  "www",
  "api",
  "admin",
  "app",
  "mail",
  "smtp",
  "ns1",
  "ns2",
  "cdn",
  "static",
  "assets",
  "jania",
  "vecy",
  "planes",
  "billing",
  "login",
]);

export const billingRouter = router({
  listPlans: publicProcedure.query(async () => {
    return await listSubscriptionPlans();
  }),

  mySubscription: protectedProcedure.query(async ({ ctx }) => {
    const entitlements = await getUserEffectiveEntitlements(ctx.user.id, ctx.user.role);
    const db = await getDb();
    if (!db) {
      return {
        entitlements,
        subscription: null,
        agency: null,
        recentTransactions: [],
      };
    }

    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, ctx.user.id))
      .orderBy(desc(userSubscriptions.id))
      .limit(1);

    const [agency] = await db
      .select()
      .from(agencies)
      .where(eq(agencies.ownerUserId, ctx.user.id))
      .limit(1);

    const recentTransactions = await db
      .select({
        id: paymentTransactions.id,
        planCode: paymentTransactions.planCode,
        reference: paymentTransactions.reference,
        amountInCents: paymentTransactions.amountInCents,
        currency: paymentTransactions.currency,
        status: paymentTransactions.status,
        paymentMethodType: paymentTransactions.paymentMethodType,
        paidAt: paymentTransactions.paidAt,
        createdAt: paymentTransactions.createdAt,
      })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.userId, ctx.user.id))
      .orderBy(desc(paymentTransactions.id))
      .limit(10);

    return {
      entitlements,
      subscription: subscription ?? null,
      agency: agency ?? null,
      recentTransactions,
    };
  }),

  startCheckout: protectedProcedure
    .input(
      z.object({
        planCode: z.enum(["free", "agente_pro", "inmobiliaria_growth", "elite_ia"]),
        billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
        redirectPath: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await createWompiCheckoutSession({
        userId: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        planCode: input.planCode as PlanCode,
        billingCycle: input.billingCycle,
        redirectPath: input.redirectPath,
      });
    }),

  myTransactions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return await db
      .select({
        id: paymentTransactions.id,
        planCode: paymentTransactions.planCode,
        reference: paymentTransactions.reference,
        providerTransactionId: paymentTransactions.providerTransactionId,
        amountInCents: paymentTransactions.amountInCents,
        currency: paymentTransactions.currency,
        status: paymentTransactions.status,
        paymentMethodType: paymentTransactions.paymentMethodType,
        paidAt: paymentTransactions.paidAt,
        createdAt: paymentTransactions.createdAt,
      })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.userId, ctx.user.id))
      .orderBy(desc(paymentTransactions.id))
      .limit(25);
  }),

  upsertMyAgency: protectedProcedure
    .input(
      z.object({
        slug: z.string().min(3).max(80),
        brandName: z.string().min(2).max(180),
        tagline: z.string().max(300).optional().nullable(),
        logoUrl: z.string().max(1000).optional().nullable(),
        primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#D4AF37"),
        secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#0A0A0A"),
        customDomain: z.string().max(200).optional().nullable(),
        whatsappBusinessPhone: z.string().max(30).optional().nullable(),
        contactEmail: z.string().email().optional().nullable(),
        city: z.string().max(100).optional().nullable(),
        republishByDefault: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      }

      const entitlements = await getUserEffectiveEntitlements(ctx.user.id, ctx.user.role);
      if (input.customDomain && !entitlements.isAdmin && !entitlements.plan.customDomainEnabled) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Tu plan ${entitlements.plan.name} no incluye dominio personalizado ni portal marca blanca. Actualiza en /planes.`,
        });
      }

      const cleanSlug = normalizeSlug(input.slug);
      if (cleanSlug.length < 3 || RESERVED_SLUGS.has(cleanSlug)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El subdominio elegido es inválido o está reservado por la plataforma.",
        });
      }

      const [existingSlug] = await db
        .select({ id: agencies.id, ownerUserId: agencies.ownerUserId })
        .from(agencies)
        .where(eq(agencies.slug, cleanSlug))
        .limit(1);

      if (existingSlug && existingSlug.ownerUserId !== ctx.user.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `El subdominio ${cleanSlug}.vecygroup.com ya pertenece a otra inmobiliaria o agente.`,
        });
      }

      const [myAgency] = await db
        .select()
        .from(agencies)
        .where(eq(agencies.ownerUserId, ctx.user.id))
        .limit(1);

      const now = new Date();
      let savedAgencyId: number;

      if (myAgency) {
        await db
          .update(agencies)
          .set({
            slug: cleanSlug,
            brandName: input.brandName.trim(),
            tagline: input.tagline ?? null,
            logoUrl: input.logoUrl ?? null,
            primaryColor: input.primaryColor,
            secondaryColor: input.secondaryColor,
            customDomain: input.customDomain ? input.customDomain.trim().toLowerCase() : null,
            whatsappBusinessPhone: input.whatsappBusinessPhone ?? null,
            contactEmail: input.contactEmail ?? null,
            city: input.city || "Bogotá, D.C.",
            planCode: entitlements.plan.code,
            republishByDefault: input.republishByDefault,
            updatedAt: now,
          })
          .where(eq(agencies.id, myAgency.id));
        savedAgencyId = myAgency.id;
      } else {
        const [inserted] = await db
          .insert(agencies)
          .values({
            ownerUserId: ctx.user.id,
            slug: cleanSlug,
            brandName: input.brandName.trim(),
            tagline: input.tagline ?? null,
            logoUrl: input.logoUrl ?? null,
            primaryColor: input.primaryColor,
            secondaryColor: input.secondaryColor,
            customDomain: input.customDomain ? input.customDomain.trim().toLowerCase() : null,
            whatsappBusinessPhone: input.whatsappBusinessPhone ?? null,
            contactEmail: input.contactEmail ?? null,
            city: input.city || "Bogotá, D.C.",
            planCode: entitlements.plan.code,
            republishByDefault: input.republishByDefault,
          })
          .returning({ id: agencies.id });
        savedAgencyId = inserted.id;

        await db
          .insert(agencyMembers)
          .values({
            agencyId: savedAgencyId,
            userId: ctx.user.id,
            memberRole: "owner",
            isActive: true,
            joinedAt: now,
          })
          .onConflictDoNothing();
      }

      await db
        .update(users)
        .set({
          defaultAgencyId: savedAgencyId,
          subdomain: cleanSlug,
          customLogoUrl: input.logoUrl ?? undefined,
          updatedAt: now,
        })
        .where(eq(users.id, ctx.user.id));

      const [updated] = await db
        .select()
        .from(agencies)
        .where(eq(agencies.id, savedAgencyId))
        .limit(1);

      return updated;
    }),

  publicGetAgencyBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(2).max(100) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const cleanSlug = normalizeSlug(input.slug);
      const [agency] = await db
        .select({
          id: agencies.id,
          slug: agencies.slug,
          brandName: agencies.brandName,
          tagline: agencies.tagline,
          logoUrl: agencies.logoUrl,
          primaryColor: agencies.primaryColor,
          secondaryColor: agencies.secondaryColor,
          whatsappBusinessPhone: agencies.whatsappBusinessPhone,
          contactEmail: agencies.contactEmail,
          city: agencies.city,
          ownerUserId: agencies.ownerUserId,
        })
        .from(agencies)
        .where(and(eq(agencies.slug, cleanSlug), eq(agencies.isActive, true)))
        .limit(1);

      if (!agency) return null;

      const listings = await db
        .select({
          id: properties.id,
          name: properties.name,
          propertyType: properties.propertyType,
          transactionType: properties.transactionType,
          price: properties.price,
          rentPrice: properties.rentPrice,
          city: properties.city,
          zone: properties.zone,
          areaTotal: properties.areaTotal,
          bedrooms: properties.bedrooms,
          bathrooms: properties.bathrooms,
          garages: properties.garages,
          images: properties.images,
          createdAt: properties.createdAt,
        })
        .from(properties)
        .where(and(eq(properties.agentId, agency.ownerUserId), eq(properties.available, true)))
        .orderBy(desc(properties.id))
        .limit(60);

      return { agency, listings };
    }),
});
