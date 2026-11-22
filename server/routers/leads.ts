import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { properties, referralLinks, clientLedger } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { captureLeadIntoCrm, resolveAgentAndAgencyForProperty } from "../_core/crmService";

export const leadsRouter = router({
  resolveStealthLink: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database err" });

      // Find the link
      const linkRecord = await db.select()
        .from(referralLinks)
        .where(eq(referralLinks.token, input.token))
        .limit(1);

      if (linkRecord.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Stealth Link invalido o expirado." });
      }
      const link = linkRecord[0];

      // Increment clicks (Atomic)
      await db.update(referralLinks)
        .set({ clicks: sql`${referralLinks.clicks} + 1` })
        .where(eq(referralLinks.id, link.id));

      // Get safe property data (Blind data)
      const prop = await db.select({
        id: properties.id,
        name: properties.name,
        price: properties.price,
        bedrooms: properties.bedrooms,
        bathrooms: properties.bathrooms,
        areaSquareMeters: properties.areaTotal,
        zone: properties.zone,
        // specifically NOT returning full location/latitude/longitude/matricula
        images: properties.images
      }).from(properties)
        .where(eq(properties.id, link.propertyId))
        .limit(1);

      if (prop.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Inmueble no disponible." });
      }

      return {
        property: prop[0]
      };
    }),

  submitStealthLead: publicProcedure
    .input(z.object({
      token: z.string(),
      name: z.string().min(2),
      documentNumber: z.string().min(5),
      email: z.string().email(),
      phone: z.string().min(7),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database err" });

      // Validate token
      const linkRecord = await db.select()
        .from(referralLinks)
        .where(eq(referralLinks.token, input.token))
        .limit(1);

      if (linkRecord.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Token invalido." });
      }
      
      const link = linkRecord[0];
      const propInfo = await resolveAgentAndAgencyForProperty({
        explicitAgentId: link.agentId,
        propertyId: link.propertyId,
      });

      const captured = await captureLeadIntoCrm({
        agentId: link.agentId,
        agencyId: propInfo.agencyId,
        name: input.name,
        documentNumber: input.documentNumber,
        email: input.email,
        phone: input.phone,
        inquiryType: "general",
        propertyId: link.propertyId,
        source: "stealth_link",
        pipelineStage: "nuevo",
        temperature: "hot",
        referralToken: link.token,
        tags: ["stealth_link"],
        activityTitle: "Lead capturado desde Enlace Blindado",
        activityBody: `El prospecto ${input.name} desbloqueó la ficha confidencial del inmueble #${link.propertyId} (ref: ${link.token}).`,
      });

      if (captured.lead) {
        await db.insert(clientLedger).values({
          leadId: captured.lead.id,
          agentId: link.agentId,
          propertyId: link.propertyId,
          referralToken: link.token,
        });
      }

      return { success: true, leadId: captured.lead?.id ?? null };
    }),

  submitTrackingLead: publicProcedure
    .input(z.object({
      propertyId: z.number().int().positive(),
      refToken: z.string().optional(),
      agentId: z.number().int().positive().optional(),
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().min(7).optional(),
      inquiryType: z.enum(["buy", "sell", "rent", "invest", "general"]).default("buy"),
      message: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database err" });

      let resolvedAgentId = input.agentId ?? null;
      if (input.refToken && !resolvedAgentId) {
        const [refRow] = await db
          .select({ agentId: referralLinks.agentId })
          .from(referralLinks)
          .where(eq(referralLinks.token, input.refToken))
          .limit(1);
        resolvedAgentId = refRow?.agentId ?? null;
      }

      const resolved = await resolveAgentAndAgencyForProperty({
        explicitAgentId: resolvedAgentId,
        propertyId: input.propertyId,
      });

      if (!resolved.agentId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No se pudo identificar al asesor responsable del inmueble.",
        });
      }

      const captured = await captureLeadIntoCrm({
        agentId: resolved.agentId,
        agencyId: resolved.agencyId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        inquiryType: input.inquiryType,
        message: input.message,
        propertyId: input.propertyId,
        source: input.refToken ? "tracking_link" : "website",
        pipelineStage: "nuevo",
        temperature: "hot",
        referralToken: input.refToken ?? null,
        tags: input.refToken ? ["tracking_link"] : ["portal_web"],
        activityTitle: input.refToken
          ? "Lead capturado desde Enlace Sensor"
          : "Lead capturado desde Ficha Web",
        activityBody:
          input.message ||
          `Prospecto ${input.name} solicitó información sobre el inmueble #${input.propertyId}.`,
      });

      if (captured.lead && input.refToken) {
        await db.insert(clientLedger).values({
          leadId: captured.lead.id,
          agentId: resolved.agentId,
          propertyId: input.propertyId,
          referralToken: input.refToken,
        });
      }

      return { success: true, leadId: captured.lead?.id ?? null };
    }),
});
