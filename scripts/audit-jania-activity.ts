import { getDb } from "../server/db";
import { properties, requirements } from "../drizzle/schema";
import { desc, gte } from "drizzle-orm";

async function checkActivity() {
  console.log("🔍 Auditando actividad de JanIA del día de hoy (17 de Mayo 2026)...");
  const db = await getDb();
  if (!db) return;

  try {
    const today = new Date("2026-05-17T00:00:00Z");
    
    const todaysProps = await db.select().from(properties).where(gte(properties.createdAt, today)).orderBy(desc(properties.id));
    const todaysReqs = await db.select().from(requirements).where(gte(requirements.createdAt, today)).orderBy(desc(requirements.id));

    console.log(`\n📊 Resumen de hoy:`);
    console.log(`- Inmuebles guardados: ${todaysProps.length}`);
    console.log(`- Requerimientos guardados: ${todaysReqs.length}`);

    console.log("\n--- DETALLE DE INMUEBLES (HOY) ---");
    todaysProps.forEach(p => console.log(`[${p.createdAt.toISOString()}] ID: ${p.id} | Autor: ${p.name} | Zona: ${p.zone}`));

    console.log("\n--- DETALLE DE REQUERIMIENTOS (HOY) ---");
    todaysReqs.forEach(r => console.log(`[${r.createdAt.toISOString()}] ID: ${r.id} | Autor: ${r.name} | Zona: ${r.zonaDeseada}`));

    if (todaysProps.length === 0 && todaysReqs.length === 0) {
      console.log("\n⚠️ ALERTA: No hay registros guardados hoy. JanIA podría estar desconectada o fallando en la extracción.");
    }

  } catch (e) {
    console.error("❌ Error auditando actividad:", e);
  } finally {
    process.exit(0);
  }
}

checkActivity();
