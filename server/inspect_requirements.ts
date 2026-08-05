import { getDb } from "./db";
import { properties, requirements } from "../drizzle/schema";

async function inspectRequirements() {
  const db = await getDb();
  if (!db) {
    console.error("❌ No DB connection");
    process.exit(1);
  }

  const allReqs = await db.select().from(requirements);
  const allProps = await db.select().from(properties);

  console.log(`📊 TOTAL REQUERIMIENTOS EN BASE DE DATOS: ${allReqs.length}`);
  console.log(`📊 TOTAL INMUEBLES EN BASE DE DATOS: ${allProps.length}`);
  console.log("\n--- INSPECCIÓN DE LOS PRIMEROS 20 REQUERIMIENTOS ---");

  allReqs.slice(0, 20).forEach((r, idx) => {
    console.log(`\nRequerimiento #${r.id} (${r.name}):`);
    console.log(`  - PresupuestoMax: $${r.presupuestoMax} | PresupuestoMin: $${r.presupuestoMin}`);
    console.log(`  - Zona/Barrio: "${r.zonaDeseada}" | Ciudad: "${r.ciudadDeseada}"`);
    console.log(`  - Habitaciones: ${r.habitacionesMin} | Baños: ${r.banosMin} | Garajes: ${r.parqueaderosMin}`);
    console.log(`  - Tipo Negocio: "${r.tipoNegocioDeseado}" | Tipo Inmueble: "${r.tipoInmuebleDeseado}"`);
    console.log(`  - RawText (${(r.rawText || "").length} chars): "${(r.rawText || "").replace(/\n/g, " ").slice(0, 120)}..."`);
  });

  process.exit(0);
}

inspectRequirements().catch(console.error);
