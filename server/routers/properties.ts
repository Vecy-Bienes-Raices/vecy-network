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
  transactionType: z.enum([
    "venta", "arriendo", "venta_o_arriendo", "arriendo_temporal", 
    "arriendo_con_opcion_de_compra", "permuta", "venta_permuta", "aporte"
  ]).default("venta"),
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

  // --- MANAGEMENT (Admin / Agent) ---
  create: publicProcedure
    .input(propertyInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const newProperty = await db.insert(properties).values({
        ...input,
        agentId: ctx?.user?.id ?? 1,
      }).returning();

      return newProperty[0];
    }),

  parseText: publicProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const { invokeLLM } = await import("../_core/llm");
        const prompt = `Analiza este texto de inmueble y extrae los datos clave en formato JSON con los siguientes campos obligatorios: name (título breve descriptivo), propertyType (apartment, house, building, warehouse, farm, hotel, office, land, commercial, loft, consultorio), transactionType (venta, arriendo, venta_o_arriendo), price (valor numérico en COP), location (dirección o zona aproximada), zone (barrio o localidad), bedrooms (número entero o null), bathrooms (número entero o null), stratum (estrato 1-6 o null), garages (número entero o null), areaTotal (metros cuadrados en número string o null), adminFee (cuota administración COP o null), description (resumen claro de los aspectos más importantes). Devuelve ÚNICAMENTE el objeto JSON sin bloques de código ni explicaciones.\n\nTexto: ${input.text}`;
        const response = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
        const text = response.choices?.[0]?.message?.content;
        const cleaned = typeof text === 'string' ? text.replace(/```json\n?|\n?```/g, '').trim() : "{}";
        return JSON.parse(cleaned);
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al interpretar el texto con IA: " + err.message });
      }
    }),

  update: publicProcedure
    .input(z.object({
      id: z.number(),
      data: propertyInputSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const existing = await db.select().from(properties).where(eq(properties.id, input.id)).limit(1);
      if (existing.length === 0) throw new TRPCError({ code: "NOT_FOUND" });

      // Si hay usuario y no es admin ni dueño, bloquear
      if (ctx?.user && ctx.user.role !== "admin" && existing[0].agentId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const updated = await db.update(properties)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(properties.id, input.id))
        .returning();

      return updated[0];
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const existing = await db.select().from(properties).where(eq(properties.id, input.id)).limit(1);
      if (existing.length === 0) throw new TRPCError({ code: "NOT_FOUND" });

      // Si hay usuario y no es admin ni dueño, bloquear
      if (ctx?.user && ctx.user.role !== "admin" && existing[0].agentId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db.delete(properties).where(eq(properties.id, input.id));
      return { success: true };
    }),

  // List my own properties (agent view) or all properties (admin view)
  myList: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const propertyFields = {
      id: properties.id,
      name: properties.name,
      price: properties.price,
      rentPrice: properties.rentPrice,
      location: properties.location,
      zone: properties.zone,
      addressNeighborhood: properties.addressNeighborhood,
      propertyType: properties.propertyType,
      transactionType: properties.transactionType,
      description: properties.description,
      bedrooms: properties.bedrooms,
      bathrooms: properties.bathrooms,
      garages: properties.garages,
      stratum: properties.stratum,
      floorDetail: properties.floorDetail,
      areaTotal: properties.areaTotal,
      yearBuilt: properties.yearBuilt,
      adminFee: properties.adminFee,
      matriculaInmobiliaria: properties.matriculaInmobiliaria,
      featured: properties.featured,
      available: properties.available,
      images: properties.images,
      createdAt: properties.createdAt,
    };

    const user = ctx?.user;
    if (!user || (user.role as string) === "admin") {
      return await db.select(propertyFields).from(properties).orderBy(desc(properties.id));
    }
    return await db.select(propertyFields).from(properties)
      .where(eq(properties.agentId, user.id))
      .orderBy(desc(properties.id));
  }),
});
