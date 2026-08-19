import dotenv from "dotenv";
dotenv.config();
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { explicarMatch, calcularIPC } from "../_core/matching";

async function runGlobalMatching() {
  const db = await getDb();
  if (!db) {
    console.error("❌ No hay conexión a Supabase");
    return;
  }

  console.log("⚡ INICIANDO MOTOR GLOBAL DE MATCHING V22.9 ULTRARRÁPIDO EN MEMORIA...");

  const allReqs = await db.execute(sql`
    SELECT * FROM requirements ORDER BY id DESC;
  `);

  const allProps = await db.execute(sql`
    SELECT * FROM properties WHERE available = true OR available IS NULL ORDER BY id DESC;
  `);

  console.log(`📊 Comparando ${allReqs.length} requerimientos contra ${allProps.length} propiedades en memoria...`);

  let newMatches = 0;
  let updatedMatches = 0;

  for (const req of allReqs) {
    for (const prop of allProps) {
      const explanation = explicarMatch(req as any, prop as any);
      const score = explanation.score;

      if (score >= 85) {
        const [existing] = await db.execute(sql`
          SELECT id FROM "propertyMatches"
          WHERE "requirementId" = ${(req as any).id} AND "propertyId" = ${(prop as any).id}
          LIMIT 1;
        `);

        const ipcObj = calcularIPC(req as any, prop as any, score);
        explanation.ipc = ipcObj;

        if (existing) {
          await db.execute(sql`
            UPDATE "propertyMatches"
            SET "matchScore" = ${score.toFixed(2)},
                "matchExplanation" = ${JSON.stringify(explanation)}::jsonb,
                ipc = ${JSON.stringify(ipcObj)}::jsonb,
                "createdAt" = NOW()
            WHERE id = ${existing.id};
          `);
          updatedMatches++;
          console.log(`   🔄 Actualizado Match #${existing.id} [REQ #${(req as any).id} ↔ PROP #${(prop as any).id}] -> ${score}%`);
        } else {
          const [inserted] = await db.execute(sql`
            INSERT INTO "propertyMatches" ("propertyId", "requirementId", "matchScore", "matchReason", "matchExplanation", ipc, status, "ownerConfirmed", "seekerConfirmed", "createdAt")
            VALUES (
              ${(prop as any).id},
              ${(req as any).id},
              ${score.toFixed(2)},
              ${'VECY CORE v22.9 In-Memory: ' + score.toFixed(2) + '/100'},
              ${JSON.stringify(explanation)}::jsonb,
              ${JSON.stringify(ipcObj)}::jsonb,
              'suggested',
              false,
              false,
              NOW()
            )
            RETURNING id;
          `);
          newMatches++;
          console.log(`   ✨ NUEVO Match #${inserted.id} [REQ #${(req as any).id} ↔ PROP #${(prop as any).id}] -> ${score}% (${(req as any).tipoInmuebleDeseado} en ${(req as any).zonaDeseada || (req as any).ciudadDeseada})`);
        }
      }
    }
  }

  const [matchesCount] = await db.execute(sql`SELECT COUNT(*) as count FROM "propertyMatches"`);
  console.log("\n============================================================");
  console.log(`🎉 RECALCULO DE MATCHING GLOBAL COMPLETADO`);
  console.log(`⚡ Nuevos matches: ${newMatches} | Actualizados: ${updatedMatches}`);
  console.log(`⚡ Total Matches en Supabase: ${matchesCount.count}`);
  console.log("============================================================");
  process.exit(0);
}

runGlobalMatching().catch(err => {
  console.error("❌ Error en matching global:", err);
  process.exit(1);
});
