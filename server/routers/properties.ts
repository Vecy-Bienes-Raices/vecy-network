import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { eq, desc, ilike, or, isNull, and, lte, sql } from "drizzle-orm";

import { getDb } from "../db";
import { properties, propertyImages } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

const propertyInputSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  propertyType: z.enum([
    "apartment", "house", "building", "warehouse", "farm", "hotel", 
    "office", "land", "commercial", "loft", "consultorio"
  ]),
  transactionType: z.enum(["venta", "arriendo", "arriendo_temporal"]).default("venta"),
  price: z.string().min(1),
  currency: z.enum(["COP", "USD"]).default("COP"),
  city: z.string().default("Bogotá"),
  location: z.string().optional(),
  zone: z.string().min(2),
  addressCity: z.string().optional().nullable(),
  addressLocality: z.string().optional().nullable(),
  addressNeighborhood: z.string().optional().nullable(),
  coordinates: z.any().optional().nullable(),
  bedrooms: z.number().optional().nullable(),
  bathrooms: z.number().optional().nullable(),
  garages: z.number().optional().nullable(),
  stratum: z.number().optional().nullable(),
  floorDetail: z.string().optional().nullable(),
  areaTotal: z.string().optional().nullable(),
  areaPrivate: z.string().optional().nullable(),
  yearBuilt: z.number().optional().nullable(),
  antiguedadAnos: z.number().optional().nullable(),
  isAmoblado: z.boolean().optional().default(false),
  adminFee: z.string().optional().nullable(),
  commissionPercent: z.string().optional().nullable(),
  matriculaInmobiliaria: z.string().optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  externalUrl: z.string().optional().nullable(),
  rawText: z.string().optional().nullable(),
  featured: z.boolean().optional().default(false),
  available: z.boolean().optional().default(true),
  idUsuarioWhatsapp: z.string().optional().nullable(),
  images: z.array(z.string()).optional().nullable(),
});

export const propertiesRouter = router({
  // --- PUBLIC ---
  list: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      zone: z.string().optional(),
      type: z.string().optional(),
      transactionType: z.string().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const filters = [eq(properties.available, true)];
      if (input?.transactionType) filters.push(eq(properties.transactionType, input.transactionType as any));
      if (input?.type) filters.push(eq(properties.propertyType, input.type as any));
      if (input?.zone) filters.push(ilike(properties.zone, `%${input.zone}%`));
      
      return await db.select().from(properties)
        .where(and(...filters))
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
      const property = result[0];

      return property;
    }),

  // --- PROTECTED (Admin / Agent) ---
  create: protectedProcedure
    .input(propertyInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const newProperty = await db.insert(properties).values({
        ...input,
        agentId: ctx.user.id,
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
