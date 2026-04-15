import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { properties, referralLinks, leads, clientLedger } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

export const leadsRouter = router({
  resolveStealthLink: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
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
        areaSquareMeters: properties.areaSquareMeters,
        zone: properties.zone,
        // specifically NOT returning full location/latitude/longitude/matricula
        wildcardFeature: properties.wildcardFeature,
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

      // Insert Lead
      const newLead = await db.insert(leads).values({
        name: input.name,
        documentNumber: input.documentNumber,
        email: input.email,
        phone: input.phone,
        inquiryType: "general", // Can be refined later
        propertyId: link.propertyId,
        source: "stealth_link"
      }).returning();

      // Register Immutably in Ledger tying the Lead directly to the Agent!
      await db.insert(clientLedger).values({
        leadId: newLead[0].id,
        agentId: link.agentId,
        propertyId: link.propertyId,
        token: link.token
      });

      return { success: true };
    })
});
