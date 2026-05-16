import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { propertyMatches, properties, requirements } from "../../drizzle/schema";

export async function findMatchesForProperty(propertyId: number) {
  const db = await getDb();
  if (!db) return [];

  const results = await db.execute(sql`
    SELECT * FROM buscar_matches_para_inmueble(${propertyId})
  `);

  const validMatches = [];
  // Save matches to DB
  for (const match of results as any) {
    if (match.score > 15) { // Threshold for a good match
      await db.insert(propertyMatches).values({
        propertyId: propertyId,
        requirementId: match.requirement_id,
        matchScore: match.score.toString(),
        status: "suggested",
      }).onConflictDoNothing();
      
      const reqs = await db.select({ idUsuarioWhatsapp: requirements.idUsuarioWhatsapp }).from(requirements).where(sql`${requirements.id} = ${match.requirement_id}`);
      if (reqs.length > 0) match.idUsuarioWhatsapp = reqs[0].idUsuarioWhatsapp;
      validMatches.push(match);
    }
  }

  return validMatches;
}

export async function findMatchesForRequirement(requirementId: number) {
  const db = await getDb();
  if (!db) return [];

  const results = await db.execute(sql`
    SELECT * FROM buscar_matches_para_requerimiento(${requirementId})
  `);

  const validMatches = [];
  // Save matches to DB
  for (const match of results as any) {
    if (match.score > 15) {
      await db.insert(propertyMatches).values({
        propertyId: match.property_id,
        requirementId: requirementId,
        matchScore: match.score.toString(),
        status: "suggested",
      }).onConflictDoNothing();
      
      const props = await db.select({ idUsuarioWhatsapp: properties.idUsuarioWhatsapp }).from(properties).where(sql`${properties.id} = ${match.property_id}`);
      if (props.length > 0) match.idUsuarioWhatsapp = props[0].idUsuarioWhatsapp;
      validMatches.push(match);
    }
  }

  return validMatches;
}
