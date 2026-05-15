import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { properties, requirements, propertyMatches } from "../../drizzle/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export const matchingRouter = router({
  /**
   * Buscar matches para un inmueble específico (Oferta -> Demanda)
   */
  findMatchesForProperty: publicProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const property = await db.select().from(properties).where(eq(properties.id, input.propertyId)).limit(1);
      if (property.length === 0) throw new Error("Propiedad no encontrada");

      const p = property[0];

      // Lógica de Matching Ponderada (Blueprint de Manus)
      // Buscamos requerimientos que coincidan en lo básico y calculamos score
      const matches = await db.select({
        requirementId: requirements.id,
        score: sql<number>`(
          CASE WHEN ${requirements.tipoInmuebleDeseado} = ${p.propertyType} THEN 30 ELSE 0 END +
          CASE WHEN ${requirements.tipoNegocioDeseado} = ${p.transactionType} THEN 30 ELSE 0 END +
          CASE WHEN ${requirements.ciudadDeseada} = ${p.city} THEN 15 ELSE 0 END +
          CASE WHEN ${p.price} BETWEEN ${requirements.presupuestoMin} AND ${requirements.presupuestoMax} THEN 15 ELSE 0 END +
          CASE WHEN ${p.bedrooms} >= ${requirements.habitacionesMin} THEN 5 ELSE 0 END +
          CASE WHEN ${p.bathrooms} >= ${requirements.banosMin} THEN 5 ELSE 0 END
        )`.as('score'),
      })
      .from(requirements)
      .where(and(
        eq(requirements.status, 'active'),
        eq(requirements.tipoInmuebleDeseado, p.propertyType),
        eq(requirements.tipoNegocioDeseado, p.transactionType)
      ))
      .orderBy(sql`score DESC`)
      .limit(10);

      return matches;
    }),

  /**
   * Registrar un requerimiento y buscar matches inmediatos
   */
  createRequirement: publicProcedure
    .input(z.object({
      tipoInmuebleDeseado: z.enum([
        "apartment", "house", "building", "warehouse", "farm", "hotel", 
        "office", "land", "commercial", "loft", "consultorio"
      ]),
      tipoNegocioDeseado: z.enum(["venta", "arriendo", "arriendo_temporal"]),
      ciudadDeseada: z.string().default("Bogotá"),
      zonaDeseada: z.string().optional(),
      presupuestoMax: z.string(),
      habitacionesMin: z.number().optional(),
      idUsuarioWhatsapp: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const newReq = await db.insert(requirements).values({
        ...input,
        presupuestoMin: "0",
        status: "active",
      }).returning();

      const reqId = newReq[0].id;

      // Buscar matches inmediatos con propiedades existentes
      const matches = await db.select({
        propertyId: properties.id,
        score: sql<number>`(
          CASE WHEN ${properties.propertyType} = ${input.tipoInmuebleDeseado} THEN 30 ELSE 0 END +
          CASE WHEN ${properties.transactionType} = ${input.tipoNegocioDeseado} THEN 30 ELSE 0 END +
          CASE WHEN ${properties.price} <= ${input.presupuestoMax} THEN 20 ELSE 0 END +
          CASE WHEN ${properties.city} = ${input.ciudadDeseada} THEN 20 ELSE 0 END
        )`.as('score')
      })
      .from(properties)
      .where(and(
        eq(properties.available, true),
        eq(properties.propertyType, input.tipoInmuebleDeseado),
        eq(properties.transactionType, input.tipoNegocioDeseado)
      ))
      .orderBy(sql`score DESC`)
      .limit(5);

      // Guardar matches encontrados
      for (const m of matches) {
        if (m.score > 50) { // Solo guardar si es un match relevante
          await db.insert(propertyMatches).values({
            requirementId: reqId,
            propertyId: m.propertyId,
            matchScore: m.score.toString(),
            status: 'suggested'
          });
        }
      }

      return { requirementId: reqId, matchesFound: matches.length };
    }),
});
