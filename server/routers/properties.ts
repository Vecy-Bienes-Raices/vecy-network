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

type AdminPropertyListItem = {
  id: number;
  name: string;
  price: string;
  rentPrice: string | null;
  location: string | null;
  zone: string;
  addressNeighborhood: string | null;
  propertyType: typeof properties.$inferSelect.propertyType;
  transactionType: typeof properties.$inferSelect.transactionType;
  description: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  stratum: number | null;
  floorDetail: string | null;
  areaTotal: string | null;
  yearBuilt: number | null;
  adminFee: string | null;
  matriculaInmobiliaria: string | null;
  featured: boolean | null;
  available: boolean | null;
  images: unknown;
  createdAt: Date;
};

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

let cachedAdminMyList: AdminPropertyListItem[] | null = null;
let cachedAdminMyListTime = 0;

export function invalidatePropertiesListCache() {
  cachedAdminMyList = null;
  cachedAdminMyListTime = 0;
}

export function parsePropertyDeterministically(text: string) {
  const norm = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const lower = norm.toLowerCase();

  // Tipo de inmueble
  let propertyType = "apartment";
  if (lower.includes("casa comercial") || lower.includes("sede empresarial") || lower.includes("local comercial")) {
    propertyType = "commercial";
  } else if (lower.includes("consultorio")) {
    propertyType = "consultorio";
  } else if (lower.includes("oficina")) {
    propertyType = "office";
  } else if (lower.includes("casa") || lower.includes("chalet") || lower.includes("townhouse")) {
    propertyType = "house";
  } else if (lower.includes("bodega")) {
    propertyType = "warehouse";
  } else if (lower.includes("edificio")) {
    propertyType = "building";
  } else if (lower.includes("lote") || lower.includes("terreno")) {
    propertyType = "land";
  } else if (lower.includes("finca")) {
    propertyType = "farm";
  } else if (lower.includes("loft") || lower.includes("apartasol")) {
    propertyType = "loft";
  }

  // Tipo de negocio
  let transactionType = "venta";
  if (lower.includes("arriendo") || lower.includes("alquiler") || lower.includes("renta")) {
    transactionType = "arriendo";
  } else if (lower.includes("permuta")) {
    transactionType = "venta_permuta";
  }

  // Precio
  let price: string = "0";
  const ahoraMatch = norm.match(/(?:ahora|hoy|precio|valor|venta)[\s\:\$💲🔥]*([0-9\.\,]+(?:\s*(?:millones|mil millones|mm))?)/i);
  if (ahoraMatch) {
    const cleanNum = ahoraMatch[1].replace(/\./g, "").replace(/\,/g, "").trim();
    const parsed = parseInt(cleanNum, 10);
    if (!isNaN(parsed) && parsed > 100000) price = String(parsed);
  }
  if (price === "0") {
    const prices = Array.from(norm.matchAll(/\$\s*([0-9]{1,3}(?:\.[0-9]{3}){1,4})/g));
    if (prices.length > 0) {
      const last = prices[prices.length - 1][1].replace(/[^\d]/g, "");
      const parsed = parseInt(last, 10);
      if (!isNaN(parsed) && parsed > 100000) price = String(parsed);
    }
  }

  // Área
  let areaTotal: string | null = null;
  const areaConstruida = norm.match(/(?:area construida|area total|area)[\s\:\*]*([0-9]+(?:\.[0-9]+)?)\s*m/i);
  if (areaConstruida) {
    areaTotal = areaConstruida[1];
  } else {
    const generalArea = norm.match(/([0-9]+(?:\.[0-9]+)?)\s*m[2²]/i);
    if (generalArea) areaTotal = generalArea[1];
  }

  // Habitaciones
  let bedrooms: number | null = null;
  const bedMatch = norm.match(/(?:habitacion|habitaciones|alcoba|alcobas|oficinas|dormitorio)[\s\:\/\*]*([0-9]+)/i);
  if (bedMatch) {
    bedrooms = parseInt(bedMatch[1], 10);
  }

  // Baños
  let bathrooms: number | null = null;
  const bathMatch = norm.match(/(?:bano|banos)[\s\:\/\*]*([0-9]+)/i);
  if (bathMatch) {
    bathrooms = parseInt(bathMatch[1], 10);
  }

  // Garajes
  let garages: number | null = null;
  const garMatch = norm.match(/(?:garaje|garajes|parqueadero|parqueaderos)[\s\:\/\*]*([0-9]+)/i);
  if (garMatch) {
    garages = parseInt(garMatch[1], 10);
  }

  // Estrato
  let stratum: number | null = null;
  const strMatch = norm.match(/estrato[\s\:\*]*([1-6])/i);
  if (strMatch) {
    stratum = parseInt(strMatch[1], 10);
  }

  // Barrio, Localidad y Ciudad
  let addressNeighborhood: string | null = null;
  let zone: string | null = null;
  let city = "Bogotá";

  const barrioMatch = norm.match(/barrio[\s\:\*]*([a-zA-Z\s]+)/i);
  if (barrioMatch) {
    addressNeighborhood = barrioMatch[1].split("\n")[0].trim();
  }
  if (!addressNeighborhood) {
    if (lower.includes("morato")) addressNeighborhood = "Morato";
    else if (lower.includes("cedritos")) addressNeighborhood = "Cedritos";
    else if (lower.includes("chico")) addressNeighborhood = "Chicó";
    else if (lower.includes("rosales")) addressNeighborhood = "Rosales";
    else if (lower.includes("santa barbara")) addressNeighborhood = "Santa Bárbara";
  }

  const locMatch = norm.match(/localidad[\s\:\*]*([a-zA-Z\s]+)/i);
  if (locMatch) {
    zone = locMatch[1].split("\n")[0].trim();
  }
  if (!zone) {
    if (lower.includes("suba")) zone = "Suba";
    else if (lower.includes("usaquen")) zone = "Usaquén";
    else if (lower.includes("chapinero")) zone = "Chapinero";
    else if (lower.includes("teusaquillo")) zone = "Teusaquillo";
  }

  if (/\bbogot[aá]\b/i.test(norm)) city = "Bogotá";
  else if (/\bmedell[ií]n\b/i.test(norm)) city = "Medellín";
  else if (/\bcali\b/i.test(norm)) city = "Cali";
  else if (/\bbarranquilla\b/i.test(norm)) city = "Barranquilla";

  // Título / Nombre
  let name = "";
  const lines = norm.split("\n").map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const clean = line.replace(/super oferta/i, "").replace(/[^\w\s\u00C0-\u00FF]/g, "").trim();
    if (clean.length > 8 && !clean.toLowerCase().includes("detalles")) {
      name = clean.slice(0, 90);
      break;
    }
  }
  if (!name && lines.length > 0) {
    name = lines[0].replace(/super oferta/i, "").replace(/[^\w\s\u00C0-\u00FF]/g, "").trim().slice(0, 90);
  }
  if (addressNeighborhood && !name.toLowerCase().includes(addressNeighborhood.toLowerCase())) {
    name += ` - ${addressNeighborhood}`;
  }

  return {
    name: name || `Inmueble en ${addressNeighborhood || city}`,
    propertyType,
    transactionType,
    price,
    areaTotal: areaTotal || "",
    bedrooms,
    bathrooms,
    garages,
    stratum: stratum || 4,
    city,
    zone: zone || addressNeighborhood || "Bogotá",
    addressNeighborhood: addressNeighborhood || zone || "Bogotá",
    description: text.trim().slice(0, 3500),
  };
}

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

      invalidatePropertiesListCache();
      return newProperty[0];
    }),

  parseText: publicProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      // 1. Extracción determinista instantánea (0ms) con normalización Unicode
      const deterministic = parsePropertyDeterministically(input.text);

      try {
        const { invokeLLM } = await import("../_core/llm");
        const prompt = `Analiza este texto de inmueble y extrae los datos clave en formato JSON con los siguientes campos obligatorios: name (título breve descriptivo), propertyType (apartment, house, building, warehouse, farm, hotel, office, land, commercial, loft, consultorio), transactionType (venta, arriendo, venta_o_arriendo), price (valor numérico en COP sin puntos), location (dirección o zona aproximada), zone (barrio o localidad), addressNeighborhood (barrio específico), bedrooms (número entero o null), bathrooms (número entero o null), stratum (estrato 1-6 o null), garages (número entero o null), areaTotal (metros cuadrados en número string o null), adminFee (cuota administración COP o null), description (resumen claro de los aspectos más importantes). Devuelve ÚNICAMENTE el objeto JSON sin bloques de código ni explicaciones.\n\nTexto: ${input.text}`;

        // Timeout estricto de 4.5s para no bloquear al usuario si Gemini está en rate limit 429
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), 4500));
        const aiPromise = invokeLLM({ messages: [{ role: "user", content: prompt }] });

        const response: any = await Promise.race([aiPromise, timeoutPromise]);
        const text = response?.choices?.[0]?.message?.content;
        const cleaned = typeof text === 'string' ? text.replace(/```json\n?|\n?```/g, '').trim() : "{}";
        const parsed = JSON.parse(cleaned);

        // Mezclar dando prioridad a campos bien estructurados
        return {
          ...deterministic,
          ...parsed,
          price: parsed.price ? String(parsed.price) : deterministic.price,
          name: parsed.name || deterministic.name,
          propertyType: parsed.propertyType || deterministic.propertyType,
          transactionType: parsed.transactionType || deterministic.transactionType,
          zone: parsed.zone || deterministic.zone,
          addressNeighborhood: parsed.addressNeighborhood || parsed.zone || deterministic.addressNeighborhood,
          areaTotal: parsed.areaTotal ? String(parsed.areaTotal) : deterministic.areaTotal,
          bedrooms: parsed.bedrooms !== undefined && parsed.bedrooms !== null ? Number(parsed.bedrooms) : deterministic.bedrooms,
          bathrooms: parsed.bathrooms !== undefined && parsed.bathrooms !== null ? Number(parsed.bathrooms) : deterministic.bathrooms,
          garages: parsed.garages !== undefined && parsed.garages !== null ? Number(parsed.garages) : deterministic.garages,
          stratum: parsed.stratum !== undefined && parsed.stratum !== null ? Number(parsed.stratum) : deterministic.stratum,
          description: parsed.description || deterministic.description,
        };
      } catch (err: any) {
        console.warn("[parseText] Gemini no respondió a tiempo o arrojó 429. Usando extracción determinista instantánea:", err.message);
        return deterministic;
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

      invalidatePropertiesListCache();
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
      invalidatePropertiesListCache();
      return { success: true };
    }),

  // List my own properties (agent view) or all properties (admin view) - Protegido con micro-caché para Supabase Egress
  myList: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const user = ctx?.user;
    if (!user || (user.role as string) === "admin") {
      const now = Date.now();
      if (cachedAdminMyList && (now - cachedAdminMyListTime) < 180000) {
        return cachedAdminMyList;
      }
      const data = await db.select(propertyFields).from(properties).orderBy(desc(properties.id));
      cachedAdminMyList = data;
      cachedAdminMyListTime = now;
      return data;
    }
    return await db.select(propertyFields).from(properties)
      .where(eq(properties.agentId, user.id))
      .orderBy(desc(properties.id));
  }),
});
