import { getDb } from "../db";
import { and, eq, sql, desc, gte } from "drizzle-orm";
import { propertyMatches, properties, requirements } from "../../drizzle/schema";
import { normalizarTextoGeografico } from "./geography";

/**
 * Motor de Matching VECY CORE v7.5
 * Calcula el matchScore directamente en SQL para máxima eficiencia y precisión.
 */

function buildScoreSql() {
  // Ponderaciones (v7.5)
  // Geografía (35): Exact Barrio = 35, Locality = 15
  // Financiero (25): <= budget = 25, <= +10% = 15, <= +20% = 5
  // Estructural (20): Hab = 8, Bath = 6, Garage = 6
  // Flexibles JSONB (20): Area ±15% = 8, Estrato exact = 6 (±1 = 3), Int/Ext = 6

  const geoScore = sql`
    CASE 
      WHEN LOWER(NULLIF(${properties.addressNeighborhood}, '')) = LOWER(NULLIF(${requirements.addressNeighborhood}, '')) THEN 35
      WHEN LOWER(NULLIF(${properties.addressLocality}, '')) = LOWER(NULLIF(${requirements.addressLocality}, '')) THEN 15
      ELSE 0
    END
  `;

  const financialScore = sql`
    CASE 
      WHEN ${properties.price} <= ${requirements.presupuestoMax} THEN 25
      WHEN ${properties.price} <= ${requirements.presupuestoMax} * 1.10 THEN 15
      WHEN ${properties.price} <= ${requirements.presupuestoMax} * 1.20 THEN 5
      ELSE 0
    END
  `;

  const structuralScore = sql`
    (CASE WHEN ${properties.bedrooms} >= ${requirements.habitacionesMin} THEN 8 ELSE 0 END) +
    (CASE WHEN ${properties.bathrooms} >= ${requirements.banosMin} THEN 6 ELSE 0 END) +
    (CASE WHEN ${properties.garages} >= ${requirements.parqueaderosMin} THEN 6 ELSE 0 END)
  `;

  const flexibleScore = sql`
    (CASE 
      WHEN ${properties.areaTotal} BETWEEN (${requirements.areaMin} * 0.85) AND (${requirements.areaMin} * 1.15) THEN 8 
      ELSE 0 
    END) +
    (CASE 
      WHEN (${properties.stratum}::text) = ANY(SELECT jsonb_array_elements_text(${requirements.estratoDeseado})) THEN 6
      WHEN EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${requirements.estratoDeseado}) as e 
        WHERE ABS(e::int - ${properties.stratum}) <= 1
      ) THEN 3
      ELSE 0 
    END) +
    (CASE 
      WHEN (${properties.amenities}->>'interiorExterior') = (${requirements.caracteristicasDeseadas}->>'interiorExterior') THEN 6 
      ELSE 0 
    END)
  `;

  return sql`(${geoScore} + ${financialScore} + ${structuralScore} + ${flexibleScore})`;
}

/**
 * Busca requerimientos que hagan match con un inmueble recién publicado.
 */
export async function findMatchesForProperty(propertyId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const [property] = await db.select().from(properties).where(eq(properties.id, propertyId));
    if (!property) return [];

    const scoreCalc = buildScoreSql();
    
    const matches = await db
      .select({
        requirement: requirements,
        matchScore: scoreCalc
      })
      .from(requirements)
      .where(
        and(
          eq(requirements.status, "active"),
          eq(requirements.tipoInmuebleDeseado, property.propertyType),
          eq(requirements.tipoNegocioDeseado, property.transactionType)
        )
      )
      .orderBy(desc(scoreCalc));

    const validMatches = [];

    for (const m of matches) {
      const score = parseFloat(m.matchScore as string);
      if (score >= 70) {
        await db.insert(propertyMatches).values({
          propertyId: propertyId,
          requirementId: m.requirement.id,
          matchScore: score.toFixed(2),
          matchReason: `VECY CORE v7.5 Scoring: ${score.toFixed(2)}/100`,
          status: "suggested",
        }).onConflictDoNothing();

        validMatches.push({
          ...m.requirement,
          score: score,
          idUsuarioWhatsapp: m.requirement.idUsuarioWhatsapp,
        });
      }
    }

    console.log(`[Matching] Inmueble #${propertyId}: ${validMatches.length} matches detectados.`);
    return validMatches;
  } catch (e: any) {
    console.error("[Matching] Error en findMatchesForProperty:", e.message);
    return [];
  }
}

/**
 * Busca inmuebles que hagan match con un requerimiento recién publicado.
 */
export async function findMatchesForRequirement(requirementId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const [req] = await db.select().from(requirements).where(eq(requirements.id, requirementId));
    if (!req) return [];

    const scoreCalc = buildScoreSql();

    const matches = await db
      .select({
        property: properties,
        matchScore: scoreCalc
      })
      .from(properties)
      .where(
        and(
          eq(properties.available, true),
          eq(properties.propertyType, req.tipoInmuebleDeseado),
          eq(properties.transactionType, req.tipoNegocioDeseado)
        )
      )
      .orderBy(desc(scoreCalc));

    const validMatches = [];

    for (const m of matches) {
      const score = parseFloat(m.matchScore as string);
      if (score >= 70) {
        await db.insert(propertyMatches).values({
          propertyId: m.property.id,
          requirementId: requirementId,
          matchScore: score.toFixed(2),
          matchReason: `VECY CORE v7.5 Scoring: ${score.toFixed(2)}/100`,
          status: "suggested",
        }).onConflictDoNothing();

        validMatches.push({
          ...m.property,
          score: score,
          idUsuarioWhatsapp: m.property.idUsuarioWhatsapp,
        });
      }
    }

    console.log(`[Matching] Requerimiento #${requirementId}: ${validMatches.length} matches detectados.`);
    return validMatches;
  } catch (e: any) {
    console.error("[Matching] Error en findMatchesForRequirement:", e.message);
    return [];
  }
}
