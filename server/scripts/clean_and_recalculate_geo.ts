import "dotenv/config";
import { getDb } from "../db";
import { propertyMatches, properties, requirements, notificationLogs } from "../../drizzle/schema";
import { explicarMatch } from "../_core/matching";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No se pudo conectar a Supabase");
    process.exit(1);
  }

  console.log("🧹 Iniciando depuración y recalculación masiva de matches en Supabase...");

  const allMatches = await db.select().from(propertyMatches);
  console.log(`Total de coincidencia(s) en BD a evaluar: ${allMatches.length}`);

  let deletedCount = 0;
  let updatedCount = 0;
  let keptCount = 0;

  for (const m of allMatches) {
    const [prop] = await db.select().from(properties).where(eq(properties.id, m.propertyId)).limit(1);
    const [req] = await db.select().from(requirements).where(eq(requirements.id, m.requirementId)).limit(1);

    if (!prop || !req) {
      console.log(`❌ Inmueble o Requerimiento huérfano detectado (Match ID #${m.id}). Eliminando...`);
      await db.delete(notificationLogs).where(eq(notificationLogs.matchId, m.id));
      await db.delete(propertyMatches).where(eq(propertyMatches.id, m.id));
      deletedCount++;
      continue;
    }

    const exp = explicarMatch(req, prop);

    // Si la afinidad dio 0% o el score total es menor a 85%, ELIMINAR el match de la BD
    if (exp.score < 85 || exp.score === 0) {
      console.log(`🗑️ ELIMINANDO MATCH INVÁLIDO #${m.id} (Score: ${exp.score}% | Oferta: ${prop.zone || prop.addressNeighborhood} ↔ Demanda: ${req.zonaDeseada || req.addressNeighborhood})`);
      await db.delete(notificationLogs).where(eq(notificationLogs.matchId, m.id));
      await db.delete(propertyMatches).where(eq(propertyMatches.id, m.id));
      deletedCount++;
    } else {
      const newScoreStr = exp.score.toFixed(2);
      if (m.matchScore !== newScoreStr) {
        await db
          .update(propertyMatches)
          .set({ matchScore: newScoreStr })
          .where(eq(propertyMatches.id, m.id));
        updatedCount++;
      }
      keptCount++;
    }
  }

  console.log(`\n✅ DEPURACIÓN COMPLETADA EN SUPABASE:`);
  console.log(`   - Coincidencias eliminadas (inválidas / score < 85%): ${deletedCount}`);
  console.log(`   - Coincidencias actualizadas: ${updatedCount}`);
  console.log(`   - Coincidencias vigentes de alta afinidad (≥ 85%): ${keptCount}`);

  process.exit(0);
}

main().catch(err => {
  console.error("Error ejecutando la depuración:", err);
  process.exit(1);
});
