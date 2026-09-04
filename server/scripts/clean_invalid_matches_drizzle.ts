import "dotenv/config";
import { getDb } from "../db";
import { properties, requirements, propertyMatches } from "../../drizzle/schema";
import { explicarMatch } from "../_core/matching";
import { eq, sql } from "drizzle-orm";

export async function auditAndCleanMatches(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return;
  }

  const allMatches = await db.select().from(propertyMatches);
  let purged = 0;
  for (const m of allMatches) {
    const [prop] = await db.select().from(properties).where(eq(properties.id, m.propertyId)).limit(1);
    const [req] = await db.select().from(requirements).where(eq(requirements.id, m.requirementId)).limit(1);

    if (!prop || !req) {
      await db.execute(sql`DELETE FROM "notificationLogs" WHERE "matchId" = ${m.id};`);
      await db.execute(sql`DELETE FROM "match_feedback" WHERE "match_id" = ${m.id};`);
      await db.delete(propertyMatches).where(eq(propertyMatches.id, m.id));
      purged++;
      continue;
    }

    const exp = explicarMatch(req as any, prop as any);
    if (exp.score < 80 || exp.blockers.length > 0) {
      await db.execute(sql`DELETE FROM "notificationLogs" WHERE "matchId" = ${m.id};`);
      await db.execute(sql`DELETE FROM "match_feedback" WHERE "match_id" = ${m.id};`);
      await db.delete(propertyMatches).where(eq(propertyMatches.id, m.id));
      purged++;
    }
  }

  console.log(`✅ Limpieza concluida: ${purged} matches eliminados.`);
}
