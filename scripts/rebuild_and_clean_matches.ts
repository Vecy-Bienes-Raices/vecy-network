import 'dotenv/config';
import { getDb } from '../server/db';
import { properties, requirements, propertyMatches } from '../drizzle/schema';
import { eq, lt, sql } from 'drizzle-orm';
import { explicarMatch, calcularIPC } from '../server/_core/matching';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('❌ Base de datos no disponible');
    process.exit(1);
  }

  console.log('=== REESTRUCTURACIÓN Y RECALCULO DE MATCHES VECY v17.2 ===\n');

  // 1. Eliminar matches existentes por debajo del 85%
  console.log('1. Eliminando matches con score menor a 85% de la base de datos...');
  const deleted = await db.delete(propertyMatches)
    .where(lt(sql<number>`(${propertyMatches.matchScore})::numeric`, 85))
    .returning();
  console.log(`✅ Eliminados ${deleted.length} matches obsoletos (<85%).`);

  // 2. Cargar todas las propiedades y requerimientos
  const allProps = await db.select().from(properties);
  const allReqs = await db.select().from(requirements);

  console.log(`\n2. Evaluando ${allProps.length} inmuebles contra ${allReqs.length} requerimientos históricos...`);

  let createdCount = 0;
  let updatedCount = 0;

  for (const prop of allProps) {
    for (const req of allReqs) {
      const explanation = explicarMatch(req, prop);
      const score = explanation.score;

      if (score >= 85) {
        const existing = await db.select().from(propertyMatches).where(
          sql`${propertyMatches.propertyId} = ${prop.id} AND ${propertyMatches.requirementId} = ${req.id}`
        ).limit(1);

        const ipcObj = calcularIPC(req, prop, score);
        explanation.ipc = ipcObj;

        if (existing.length > 0) {
          await db.update(propertyMatches).set({
            matchScore: score.toFixed(2),
            matchExplanation: explanation,
            ipc: ipcObj,
            matchReason: `VECY Engine v17.2: Match de afinidad ${score}%`,
            createdAt: new Date()
          }).where(eq(propertyMatches.id, existing[0].id));
          updatedCount++;
        } else {
          await db.insert(propertyMatches).values({
            propertyId: prop.id,
            requirementId: req.id,
            matchScore: score.toFixed(2),
            matchReason: `VECY Engine v17.2: Match de afinidad ${score}%`,
            matchExplanation: explanation,
            ipc: ipcObj,
            status: "suggested",
            ownerConfirmed: false,
            seekerConfirmed: false,
          });
          createdCount++;
        }
      }
    }
  }

  // 3. Conteo final
  const remainingMatches = await db.select().from(propertyMatches);
  console.log(`\n=== RESULTADOS FINALES DE RECALCULO ===`);
  console.log(`- Matches actualizados (>= 85%): ${updatedCount}`);
  console.log(`- Nuevos matches creados (>= 85%): ${createdCount}`);
  console.log(`- Total matches vigentes en BD: ${remainingMatches.length}`);

  for (const m of remainingMatches) {
    console.log(`  📍 Match #M${m.id} | Score: ${m.matchScore}% | Propiedad #${m.propertyId} ↔ Requerimiento #${m.requirementId}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Error en reestructuración:', err);
  process.exit(1);
});
