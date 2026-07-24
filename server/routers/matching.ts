import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { properties, requirements, propertyMatches } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { evaluarMatch, calcularScoreMatch } from "../_core/matching";

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

      // Buscar requerimientos activos que coincidan estrictamente
      const activeReqs = await db.select().from(requirements).where(eq(requirements.status, 'active'));

      const matches = activeReqs
        .map(r => ({
          requirementId: r.id,
          score: calcularScoreMatch(r, p)
        }))
        .filter(m => m.score >= 70);

      return matches.slice(0, 10);
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
      tipoNegocioDeseado: z.enum([
        "venta", "arriendo", "venta_o_arriendo", "arriendo_temporal",
        "arriendo_con_opcion_de_compra", "permuta", "venta_permuta", "aporte"
      ]),
      ciudadDeseada: z.string().default("Bogotá"),
      zonaDeseada: z.string().optional(),
      presupuestoMax: z.string(),
      habitacionesMin: z.number().optional(),
      banosMin: z.number().optional(),
      garajes: z.number().optional(),
      interiorExterior: z.enum(["interior", "exterior"]).optional(),
      pisoDeseado: z.number().optional(),
      idUsuarioWhatsapp: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const newReq = await db.insert(requirements).values({
        tipoInmuebleDeseado: input.tipoInmuebleDeseado,
        tipoNegocioDeseado: input.tipoNegocioDeseado,
        ciudadDeseada: input.ciudadDeseada,
        zonaDeseada: input.zonaDeseada,
        presupuestoMax: input.presupuestoMax,
        presupuestoMin: "0",
        habitacionesMin: input.habitacionesMin || null,
        banosMin: input.banosMin || null,
        parqueaderosMin: input.garajes || null,
        status: "active",
        idUsuarioWhatsapp: input.idUsuarioWhatsapp || null,
        caracteristicasDeseadas: {
          ...(input.interiorExterior ? { interiorExterior: input.interiorExterior } : {}),
          ...(input.pisoDeseado !== undefined ? { pisoDeseado: input.pisoDeseado } : {})
        }
      }).returning();

      const reqId = newReq[0].id;
      const req = newReq[0];

      // Buscar todos los inmuebles disponibles
      const activeProps = await db.select().from(properties).where(eq(properties.available, true));

      // Filtrar usando el motor de decisión estricto
      const matches = activeProps
        .map(p => ({
          propertyId: p.id,
          score: calcularScoreMatch(req, p)
        }))
        .filter(m => m.score >= 70);

      // Guardar matches encontrados
      for (const m of matches) {
        await db.insert(propertyMatches).values({
          requirementId: reqId,
          propertyId: m.propertyId,
          matchScore: m.score.toFixed(2),
          status: 'suggested'
        }).onConflictDoNothing();
      }

      return { requirementId: reqId, matchesFound: matches.length };
    }),
});
