import dotenv from "dotenv";
dotenv.config();
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { findMatchesForRequirement } from "../_core/matching";

async function runGlobalMatching() {
  const db = await getDb();
  if (!db) {
    console.error("❌ No hay conexión a Supabase");
    return;
  }

  console.log("⚡ INICIANDO MOTOR GLOBAL DE MATCHING V22.6 SOBRE BASE DE DATOS LIMPIA...");

  const allReqs = await db.execute(sql`
    SELECT id, name, "ciudadDeseada", "zonaDeseada", "tipoInmuebleDeseado", "tipoNegocioDeseado"
    FROM requirements
    ORDER BY id DESC;
  `);

  console.log(`📊 Procesando ${allReqs.length} requerimientos activos contra todas las propiedades...`);

  let totalMatchesFound = 0;
  for (let i = 0; i < allReqs.length; i++) {
    const req = allReqs[i] as any;
    try {
      const matches = await findMatchesForRequirement(Number(req.id));
      if (matches && matches.length > 0) {
        totalMatchesFound += matches.length;
        console.log(`   [REQ #${req.id}] "${req.name || req.zonaDeseada}" ➔ ✅ ${matches.length} matches encontrados (Scores: ${matches.map((m: any) => `${m.score}%`).join(', ')})`);
      }
    } catch (err: any) {
      console.error(`   [REQ #${req.id}] Error en matching:`, err.message);
    }
  }

  const [matchesCount] = await db.execute(sql`SELECT COUNT(*) as count FROM "propertyMatches"`);
  console.log("\n============================================================");
  console.log(`🎉 RECALCULO DE MATCHING GLOBAL COMPLETADO`);
  console.log(`⚡ Total Matches en Supabase: ${matchesCount.count}`);
  console.log("============================================================");
}

runGlobalMatching();
