import "dotenv/config";
import { getDb } from "../db";
import { properties, requirements, propertyMatches } from "../../drizzle/schema";
import { explicarMatch } from "../_core/matching";
import { eq, isNull } from "drizzle-orm";

export async function populateMissingExplanations(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return;
  }

  const missing = await db
    .select({
      id: propertyMatches.id,
      propertyId: propertyMatches.propertyId,
      requirementId: propertyMatches.requirementId,
      matchScore: propertyMatches.matchScore,
    })
    .from(propertyMatches)
    .where(isNull(propertyMatches.matchExplanation));

  console.log(`[PopulateExplanations] Se encontraron ${missing.length} matches con matchExplanation nulo.`);
  let count = 0;
  for (const m of missing) {
    count++;
    const [prop] = await db.select().from(properties).where(eq(properties.id, m.propertyId)).limit(1);
    const [req] = await db.select().from(requirements).where(eq(requirements.id, m.requirementId)).limit(1);

    if (!prop || !req) continue;

    const exp = explicarMatch(req, prop);
    await db
      .update(propertyMatches)
      .set({ matchExplanation: exp })
      .where(eq(propertyMatches.id, m.id));

    if (count % 10 === 0) {
      console.log(`[PopulateExplanations] Procesados ${count}/${missing.length}...`);
      await new Promise(r => setTimeout(r, 20));
    }
  }

  console.log(`[PopulateExplanations] ✅ Completado exitosamente. ${count} matches actualizados.`);
}

if (process.argv[1]?.endsWith("populate_missing_explanations.ts")) {
  populateMissingExplanations().then(() => process.exit(0));
}
