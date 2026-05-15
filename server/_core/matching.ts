import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { propertyMatches } from "../../drizzle/schema";

export async function findMatchesForProperty(propertyId: number) {
  const db = await getDb();
  if (!db) return [];

  const results = await db.execute(sql`
    SELECT * FROM buscar_matches_para_inmueble(${propertyId})
  `);

  // Save matches to DB
  for (const match of results as any) {
    if (match.score > 15) { // Threshold for a good match
      await db.insert(propertyMatches).values({
        propertyId: propertyId,
        requirementId: match.requirement_id,
        matchScore: match.score.toString(),
        status: "suggested",
      }).onConflictDoNothing();
    }
  }

  return results;
}

export async function findMatchesForRequirement(requirementId: number) {
  const db = await getDb();
  if (!db) return [];

  const results = await db.execute(sql`
    SELECT * FROM buscar_matches_para_requerimiento(${requirementId})
  `);

  // Save matches to DB
  for (const match of results as any) {
    if (match.score > 15) {
      await db.insert(propertyMatches).values({
        propertyId: match.property_id,
        requirementId: requirementId,
        matchScore: match.score.toString(),
        status: "suggested",
      }).onConflictDoNothing();
    }
  }

  return results;
}
