import { getDb } from "./db";
import { properties, requirements } from "../drizzle/schema";
import { explicarMatch } from "./_core/matching";

async function testMatchingPairs() {
  const db = await getDb();
  if (!db) process.exit(1);

  const allReqs = await db.select().from(requirements);
  const allProps = await db.select().from(properties);

  const blockerCounts: Record<string, number> = {};
  let totalPairs = 0;
  let matchesFound = 0;

  for (const r of allReqs) {
    for (const p of allProps) {
      totalPairs++;
      const exp = explicarMatch(r, p);
      if (exp.score >= 80 && exp.blockers.length === 0) {
        matchesFound++;
      } else {
        exp.blockers.forEach(b => {
          const key = b.split(":")[0];
          blockerCounts[key] = (blockerCounts[key] || 0) + 1;
        });
      }
    }
  }

  console.log(`📊 EVALUADAS ${totalPairs} PAREJAS:`);
  console.log(`✅ MATCHES LLEGÍTIMOS ENCONTRADOS: ${matchesFound}`);
  console.log("\n--- CONTEO DE BLOQUEOS POR MOTIVO ---");
  Object.entries(blockerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([reason, count]) => {
      console.log(`  - [${count} veces] ${reason}`);
    });

  process.exit(0);
}

testMatchingPairs().catch(console.error);
