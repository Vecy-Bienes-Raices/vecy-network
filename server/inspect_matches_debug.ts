import { getDb } from "./db";
import { propertyMatches, properties, requirements } from "../drizzle/schema";
import { explicarMatch } from "./_core/matching";
import { eq, desc } from "drizzle-orm";

async function inspectMatches() {
  const db = await getDb();
  if (!db) {
    console.error("DB not available");
    process.exit(1);
  }

  const matchesInDb = await db.select().from(propertyMatches);
  console.log(`📊 Matches totales guardados en tabla propertyMatches: ${matchesInDb.length}`);

  const props = await db.select().from(properties);
  console.log(`🏠 Propiedades totales en DB: ${props.length}`);

  const reqs = await db.select().from(requirements);
  console.log(`📝 Requerimientos totales en DB: ${reqs.length}`);

  let validCount = 0;
  let blockedCount = 0;

  for (const prop of props) {
    for (const req of reqs) {
      const evaluation = explicarMatch(req, prop);
      if (evaluation.score >= 80) {
        if (evaluation.blockers.length > 0) {
          blockedCount++;
          console.log(`❌ Bloqueado [Score ${evaluation.score}%] Prop #${prop.id} (${prop.transactionType}/${prop.city}/${prop.price}) ↔ Req #${req.id} (${req.tipoNegocioDeseado}/${req.ciudadDeseada}/${req.presupuestoMax}): Blockers:`, evaluation.blockers);
        } else {
          validCount++;
          console.log(`✅ VÁLIDO [Score ${evaluation.score}%] Prop #${prop.id} (${prop.transactionType}/${prop.price}) ↔ Req #${req.id} (${req.tipoNegocioDeseado}/${req.presupuestoMax})`);
        }
      }
    }
  }

  console.log(`\n📈 Resumen: ${validCount} matches válidos (Score >= 80%), ${blockedCount} bloqueados por filtros duros.`);
  process.exit(0);
}

inspectMatches();
