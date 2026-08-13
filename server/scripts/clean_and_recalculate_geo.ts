import "dotenv/config";
import { getDb } from "../db";
import { propertyMatches, properties, requirements, notificationLogs } from "../../drizzle/schema";
import { explicarMatch } from "../_core/matching";
import { eq } from "drizzle-orm";

async function runPurge() {
  console.log("🧹 Iniciando purga profunda de coincidencias obsoletas/inválidas en Supabase...");
  const db = await getDb();
  if (!db) {
    console.error("❌ No se pudo conectar a la base de datos Supabase.");
    process.exit(1);
  }

  const allMatches = await db.select().from(propertyMatches);
  console.log(`📦 Encontradas ${allMatches.length} coincidencias históricas en BD.`);

  let purgedCount = 0;
  let validCount = 0;

  for (const m of allMatches) {
    const propRows = await db.select().from(properties).where(eq(properties.id, m.propertyId));
    const reqRows = await db.select().from(requirements).where(eq(requirements.id, m.requirementId));

    if (!propRows[0] || !reqRows[0]) {
      console.log(`🗑️ Eliminando Match #${m.id}: Inmueble o Requerimiento eliminado.`);
      await db.delete(notificationLogs).where(eq(notificationLogs.matchId, m.id));
      await db.delete(propertyMatches).where(eq(propertyMatches.id, m.id));
      purgedCount++;
      continue;
    }

    const prop = propRows[0];
    const req = reqRows[0];

    const result = explicarMatch(req as any, prop as any);

    if (result.score < 85) {
      console.log(`🚫 Purgando Match #${m.id} (${prop.zone || prop.addressNeighborhood || "Sin Zona"} ↔ ${req.zonaDeseada || "Sin Zona"}): Score recalculado ${result.score}% < 85% Mínimo Doctrinal VECY.`);
      await db.delete(notificationLogs).where(eq(notificationLogs.matchId, m.id));
      await db.delete(propertyMatches).where(eq(propertyMatches.id, m.id));
      purgedCount++;
    } else {
      validCount++;
    }
  }

  console.log(`\n✅ PROCESO DE PURGA DE SUPABASE FINALIZADO EXITOSAMENTE.`);
  console.log(`   - Coincidencias Validadas (>= 85%): ${validCount}`);
  console.log(`   - Coincidencias Obsoletas Eliminadas: ${purgedCount}`);
  process.exit(0);
}

runPurge().catch((err) => {
  console.error("❌ Error durante la purga:", err);
  process.exit(1);
});
