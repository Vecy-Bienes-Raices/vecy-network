import 'dotenv/config';
import { getDb } from '../server/db';
import { properties, requirements, propertyMatches, notificationLogs } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { explicarMatch, calcularIPC } from '../server/_core/matching';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('❌ Base de datos no disponible');
    process.exit(1);
  }

  console.log('=== PURGA Y DEPURACIÓN TOTAL DE MATCHES VECY v17.2 ===\n');

  // 0. Desvincular notificationLogs
  console.log('0. Desvinculando logs de notificaciones antiguos...');
  await db.update(notificationLogs).set({ matchId: null });

  // 1. ELIMINAR TODOS LOS MATCHES EXISTENTES PARA RE-EVALUAR DESDE CERO
  console.log('1. Limpiando tabla de matches por completo...');
  const deleted = await db.delete(propertyMatches).returning();
  console.log(`✅ Eliminados ${deleted.length} matches anteriores de la base de datos.`);

  // 2. Cargar propiedades y requerimientos activos
  const allProps = await db.select().from(properties);
  const allReqs = await db.select().from(requirements).where(eq(requirements.status, "active"));

  console.log(`\n2. Evaluando ${allProps.length} inmuebles contra ${allReqs.length} requerimientos activos con reglas estrictas v17.2...`);

  let createdCount = 0;

  for (const prop of allProps) {
    for (const req of allReqs) {
      const explanation = explicarMatch(req, prop);
      const score = explanation.score;

      if (score >= 85) {
        const ipcObj = calcularIPC(req, prop, score);
        explanation.ipc = ipcObj;

        await db.insert(propertyMatches).values({
          propertyId: prop.id,
          requirementId: req.id,
          matchScore: score.toFixed(2),
          matchReason: `VECY Engine v17.2: Match legítimo de afinidad ${score}%`,
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

  // 3. Conteo final
  const remainingMatches = await db.select().from(propertyMatches);
  console.log(`\n=== RESULTADOS FINALES DE REEVALUACIÓN ESTRICTA ===`);
  console.log(`- Nuevos matches legítimos generados (>= 85%): ${createdCount}`);
  console.log(`- Total matches vigentes en BD: ${remainingMatches.length}`);

  for (const m of remainingMatches) {
    const [p] = await db.select().from(properties).where(eq(properties.id, m.propertyId));
    const [r] = await db.select().from(requirements).where(eq(requirements.id, m.requirementId));
    console.log(`\n  📍 Match #M${m.id} | Score: ${m.matchScore}%`);
    console.log(`     🏢 Inmueble #${p?.id}: ${p?.name || p?.propertyType} en ${p?.zone || p?.city} ($${parseFloat(String(p?.price || 0)).toLocaleString()})`);
    console.log(`     🔍 Requerimiento #${r?.id}: ${r?.name || r?.tipoInmuebleDeseado} en ${r?.zonaDeseada || r?.ciudadDeseada} (Max $${parseFloat(String(r?.presupuestoMax || 0)).toLocaleString()})`);
    console.log(`     💬 Razón: ${m.matchReason}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Error en purga de matches:', err);
  process.exit(1);
});
