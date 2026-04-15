import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { eq, desc, ilike, or, isNull, and } from "drizzle-orm";
import { getDb } from "../db";
import { properties, propertyImages } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

const propertyInputSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.string().min(1),
  location: z.string().min(2),
  zone: z.string().min(2),
  propertyType: z.enum(["apartment", "house", "building", "warehouse", "farm", "hotel", "office", "land", "commercial", "loft"]),
  bedrooms: z.number().optional().nullable(),
  bathrooms: z.number().optional().nullable(),
  garages: z.number().optional().nullable(),
  stratum: z.number().optional().nullable(),
  floor: z.number().optional().nullable(),
  areaSquareMeters: z.string().optional().nullable(),
  areaPrivateSquareMeters: z.string().optional().nullable(),
  yearBuilt: z.number().optional().nullable(),
  adminFee: z.string().optional().nullable(),
  commissionPercent: z.string().optional().nullable(),
  matriculaInmobiliaria: z.string().optional().nullable(),
  wildcardFeature: z.string().optional().nullable(),
  featured: z.boolean().optional().default(false),
  available: z.boolean().optional().default(true),
});

export const propertiesRouter = router({
  // --- PUBLIC ---
  list: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      zone: z.string().optional(),
      type: z.string().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      let query = db.select().from(properties).where(eq(properties.available, true));
      return await db.select().from(properties)
        .where(eq(properties.available, true))
        .orderBy(desc(properties.featured), desc(properties.createdAt))
        .limit(input?.limit ?? 20)
        .offset(input?.offset ?? 0);
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const result = await db.select().from(properties).where(eq(properties.id, input.id)).limit(1);
      if (result.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Propiedad no encontrada" });
      return result[0];
    }),

  // --- PROTECTED (Admin / Agent) ---
  create: protectedProcedure
    .input(propertyInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const newProperty = await db.insert(properties).values({
        name: input.name,
        description: input.description,
        price: input.price,
        location: input.location,
        zone: input.zone,
        propertyType: input.propertyType,
        agentId: ctx.user.id,
        bedrooms: input.bedrooms ?? null,
        bathrooms: input.bathrooms ?? null,
        garages: input.garages ?? null,
        stratum: input.stratum ?? null,
        floor: input.floor ?? null,
        areaSquareMeters: input.areaSquareMeters ?? null,
        areaPrivateSquareMeters: input.areaPrivateSquareMeters ?? null,
        yearBuilt: input.yearBuilt ?? null,
        adminFee: input.adminFee ?? null,
        commissionPercent: input.commissionPercent ?? null,
        matriculaInmobiliaria: input.matriculaInmobiliaria ?? null,
        wildcardFeature: input.wildcardFeature ?? null,
        featured: input.featured ?? false,
        available: input.available ?? true,
      }).returning();

      return newProperty[0];
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: propertyInputSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const existing = await db.select().from(properties).where(eq(properties.id, input.id)).limit(1);
      if (existing.length === 0) throw new TRPCError({ code: "NOT_FOUND" });

      // Only agent who owns it or admin can edit
      const isOwner = existing[0].agentId === ctx.user.id;
      const isAdmin = (ctx.user.role as string) === "admin";
      if (!isOwner && !isAdmin) throw new TRPCError({ code: "FORBIDDEN" });

      const updated = await db.update(properties)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(properties.id, input.id))
        .returning();

      return updated[0];
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const existing = await db.select().from(properties).where(eq(properties.id, input.id)).limit(1);
      if (existing.length === 0) throw new TRPCError({ code: "NOT_FOUND" });

      const isOwner = existing[0].agentId === ctx.user.id;
      const isAdmin = (ctx.user.role as string) === "admin";
      if (!isOwner && !isAdmin) throw new TRPCError({ code: "FORBIDDEN" });

      await db.delete(properties).where(eq(properties.id, input.id));
      return { success: true };
    }),

  // List my own properties (agent view)
  myList: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const isAdmin = (ctx.user.role as string) === "admin";
    if (isAdmin) {
      return await db.select().from(properties).orderBy(desc(properties.createdAt));
    }
    return await db.select().from(properties)
      .where(eq(properties.agentId, ctx.user.id))
      .orderBy(desc(properties.createdAt));
  }),
});
