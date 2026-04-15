import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { eq, and, desc, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { properties, referralLinks, users } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

export const agentRouter = router({
  getMyProperties: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    return await db.select()
      .from(properties)
      .where(eq(properties.agentId, ctx.user.id))
      .orderBy(desc(properties.createdAt));
  }),

  // For testing: Allows an agent to claim a property that has no agent assigned
  claimProperty: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const property = await db.select().from(properties).where(eq(properties.id, input.propertyId)).limit(1);
      if (property.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
      if (property[0].agentId) throw new TRPCError({ code: "FORBIDDEN", message: "Property already has an agent" });

      await db.update(properties)
        .set({ agentId: ctx.user.id })
        .where(eq(properties.id, input.propertyId));
        
      return { success: true };
    }),

  getAvailablePropertiesToClaim: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // En un escenario real, sólo admin podría asignar. Aquí para pruebas dejamos claim general
    return await db.select()
      .from(properties)
      .where(isNull(properties.agentId))
      .orderBy(desc(properties.createdAt));
  }),

  generateStealthLink: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verificamos que sea el "Captador Oficial"
      const property = await db.select().from(properties).where(eq(properties.id, input.propertyId)).limit(1);
      if (property.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
      if (property[0].agentId !== ctx.user.id && (ctx.user.role as string) !== 'admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't own this property" });
      }

      // Check if link already exists
      const existingLink = await db.select()
        .from(referralLinks)
        .where(
          and(
            eq(referralLinks.propertyId, input.propertyId),
            eq(referralLinks.agentId, ctx.user.id)
          )
        ).limit(1);

      if (existingLink.length > 0) {
        return existingLink[0];
      }

      // Generate a unique token
      const token = `vcy_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;

      const newLinks = await db.insert(referralLinks).values({
        propertyId: input.propertyId,
        agentId: ctx.user.id,
        token,
      }).returning();

      return newLinks[0];
    }),

  getStealthLinks: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // For now we do 2 separate queries or a join. Let's do a join!
    return await db.select({
      link: referralLinks,
      property: {
        id: properties.id,
        name: properties.name,
        matriculaInmobiliaria: properties.matriculaInmobiliaria,
      }
    })
    .from(referralLinks)
    .innerJoin(properties, eq(referralLinks.propertyId, properties.id))
    .where(eq(referralLinks.agentId, ctx.user.id))
    .orderBy(desc(referralLinks.createdAt));
  }),
});
