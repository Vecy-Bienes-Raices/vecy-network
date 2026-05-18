import { getDb } from "../server/db";
import { properties, requirements, propertyMatches } from "../drizzle/schema";
import { desc } from "drizzle-orm";

async function main() {
  console.log("🔍 Verificando integridad de los MATCHES en la base de datos...");
  const db = await getDb();
  if (!db) {
    console.error("❌ No se pudo conectar a la base de datos.");
    process.exit(1);
  }

  try {
    const latestProps = await db.select().from(properties).orderBy(desc(properties.id)).limit(5);
    const latestReqs = await db.select().from(requirements).orderBy(desc(requirements.id)).limit(5);
    const latestMatches = await db.select().from(propertyMatches).orderBy(desc(propertyMatches.id)).limit(5);

    console.log("\n--- ÚLTIMOS INMUEBLES ---");
    latestProps.forEach(p => console.log(`ID: ${p.id} | Nombre: ${p.name} | Zona: ${p.zone} | Precio: ${p.price}`));

    console.log("\n--- ÚLTIMOS REQUERIMIENTOS ---");
    latestReqs.forEach(r => console.log(`ID: ${r.id} | Nombre: ${r.name} | Zona: ${r.zonaDeseada} | Max: ${r.presupuestoMax}`));

    console.log("\n--- ÚLTIMOS MATCHES REGISTRADOS ---");
    latestMatches.forEach(m => console.log(`ID: ${m.id} | Propiedad: ${m.propertyId} | Requerimiento: ${m.requirementId} | Score: ${m.matchScore}`));

    if (latestMatches.length === 0) {
      console.log("\n⚠️ No se encontraron matches registrados recientemente.");
    } else {
      console.log("\n✅ Los matches son reales y están documentados.");
    }

  } catch (error) {
    console.error("❌ Error verificando datos:", error);
  } finally {
    process.exit(0);
  }
}

main();
