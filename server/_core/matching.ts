import { getDb } from "../db";
import { and, eq, sql, desc, gte } from "drizzle-orm";
import { propertyMatches, properties, requirements } from "../../drizzle/schema";

/**
 * Motor de Matching VECY CORE v11.25
 * Calcula el matchScore directamente en SQL parametrizado para evitar errores de FROM-clause.
 */

function buildScoreSql(staticProperty?: any, staticRequirement?: any) {
  // Ponderaciones
  // Geografía (35): Exact Barrio = 35, Locality = 15
  // Financiero (25): <= budget = 25, <= +10% = 15, <= +20% = 5
  // Estructural (20): Hab = 8, Bath = 6, Garage = 6
  // Flexibles JSONB (20): Area ±15% = 8, Estrato exact = 6 (±1 = 3), Int/Ext = 6

  const propNeighborhood = staticProperty ? staticProperty.addressNeighborhood : properties.addressNeighborhood;
  const reqNeighborhood = staticRequirement ? staticRequirement.addressNeighborhood : requirements.addressNeighborhood;

  const propLocality = staticProperty ? staticProperty.addressLocality : properties.addressLocality;
  const reqLocality = staticRequirement ? staticRequirement.addressLocality : requirements.addressLocality;

  const propPrice = staticProperty ? staticProperty.price : properties.price;
  const reqBudget = staticRequirement ? staticRequirement.presupuestoMax : requirements.presupuestoMax;

  const propBedrooms = staticProperty ? staticProperty.bedrooms : properties.bedrooms;
  const reqBedrooms = staticRequirement ? staticRequirement.habitacionesMin : requirements.habitacionesMin;

  const propBathrooms = staticProperty ? staticProperty.bathrooms : properties.bathrooms;
  const reqBathrooms = staticRequirement ? staticRequirement.banosMin : requirements.banosMin;

  const propGarages = staticProperty ? staticProperty.garages : properties.garages;
  const reqGarages = staticRequirement ? staticRequirement.parqueaderosMin : requirements.parqueaderosMin;

  const propArea = staticProperty ? staticProperty.areaTotal : properties.areaTotal;
  const reqArea = staticRequirement ? staticRequirement.areaMin : requirements.areaMin;

  const propStratum = staticProperty ? staticProperty.stratum : properties.stratum;
  const reqStratum = staticRequirement ? staticRequirement.estratoDeseado : requirements.estratoDeseado;

  const propAmenities = staticProperty ? staticProperty.amenities : properties.amenities;
  const reqCharacteristics = staticRequirement ? staticRequirement.caracteristicasDeseadas : requirements.caracteristicasDeseadas;

  const geoScore = sql`
    CASE 
      WHEN LOWER(NULLIF(${propNeighborhood}, '')) = LOWER(NULLIF(${reqNeighborhood}, '')) THEN 35
      WHEN LOWER(NULLIF(${propLocality}, '')) = LOWER(NULLIF(${reqLocality}, '')) THEN 15
      ELSE 0
    END
  `;

  const financialScore = sql`
    CASE 
      WHEN ${propPrice} <= ${reqBudget} THEN 25
      WHEN ${propPrice} <= ${reqBudget} * 1.10 THEN 15
      WHEN ${propPrice} <= ${reqBudget} * 1.20 THEN 5
      ELSE 0
    END
  `;

  const structuralScore = sql`
    (CASE WHEN ${propBedrooms} >= ${reqBedrooms} THEN 8 ELSE 0 END) +
    (CASE WHEN ${propBathrooms} >= ${reqBathrooms} THEN 6 ELSE 0 END) +
    (CASE WHEN ${propGarages} >= ${reqGarages} THEN 6 ELSE 0 END)
  `;

  const flexibleScore = sql`
    (CASE 
      WHEN ${propArea} BETWEEN (${reqArea} * 0.85) AND (${reqArea} * 1.15) THEN 8 
      ELSE 0 
    END) +
    (CASE 
      WHEN (${propStratum}::text) = ANY(SELECT jsonb_array_elements_text(${reqStratum}::jsonb)) THEN 6
      WHEN EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${reqStratum}::jsonb) as e 
        WHERE ABS(e::int - ${propStratum}) <= 1
      ) THEN 3
      ELSE 0 
    END) +
    (CASE 
      WHEN (${propAmenities}::jsonb->>'interiorExterior') = (${reqCharacteristics}::jsonb->>'interiorExterior') THEN 6 
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

    const scoreCalc = buildScoreSql(property, undefined);
    
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
          matchReason: `VECY CORE v11.25 Scoring: ${score.toFixed(2)}/100`,
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

    const scoreCalc = buildScoreSql(undefined, req);

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
          matchReason: `VECY CORE v11.25 Scoring: ${score.toFixed(2)}/100`,
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
