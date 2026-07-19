import "dotenv/config";
import { getDb } from "../server/db";
import { properties, requirements, propertyMatches } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { calcularScoreMatch } from "../server/_core/matching";

async function rebuild() {
  const db = await getDb();
  if (!db) {
    console.error("❌ No DB connection");
    process.exit(1);
  }

  console.log("🧹 Iniciando reconstrucción fresca de coincidencias (matches)...");

  // 1. Limpiar/Borrar todos los matches existentes para regenerarlos sin residuos
  console.log("🗑️ Borrando todos los matches de la base de datos...");
  await db.delete(propertyMatches);
  console.log("✅ Base de datos de matches vaciada con éxito.");

  // 2. Obtener inmuebles disponibles y requerimientos activos
  const props = await db.select().from(properties).where(eq(properties.available, true));
  const reqs = await db.select().from(requirements).where(eq(requirements.status, "active"));

  console.log(`📋 Encontrados ${props.length} inmuebles disponibles y ${reqs.length} requerimientos activos.`);
  console.log("⚙️ Calculando afinidades comerciales bajo las nuevas reglas estrictas...");

  let inserted = 0;

  for (const req of reqs) {
    for (const prop of props) {
      // Calcular score (usando el motor con bloqueador de auto-match y subtipos estrictos)
      const score = calcularScoreMatch(req, prop);
      
      // Guardar si el score es aceptable (mínimo 35% para que aparezca en el panel admin con filtros)
      if (score >= 35) {
        await db.insert(propertyMatches).values({
          propertyId: prop.id,
          requirementId: req.id,
          matchScore: score.toFixed(2),
          matchReason: `Regenerado automáticamente: score del ${score}% con coincidencia estricta.`,
          status: "suggested",
          ownerConfirmed: false,
          seekerConfirmed: false,
          createdAt: new Date(),
        });
        inserted++;
        console.log(`   ➕ Match generado: Inmueble #${prop.id} vs Requerimiento #${req.id} (Score: ${score}%)`);
      }
    }
  }

  console.log(`\n🚀 Reconstrucción completada. Se generaron ${inserted} matches válidos en total.`);
  process.exit(0);
}

rebuild().catch((err) => {
  console.error("❌ Error durante la reconstrucción:", err);
  process.exit(1);
});
