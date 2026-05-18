import { getDb } from "../server/db";

async function cleanup() {
  const db = await getDb();
  if (!db) return;
  try {
    console.log("🧹 Eliminando datos de simulación...");
    // Borramos primero los matches para evitar errores de integridad
    await db.execute(`DELETE FROM public."propertyMatches" WHERE "propertyId" = 48`);
    // Borramos la propiedad de prueba
    await db.execute(`DELETE FROM public.properties WHERE id = 48`);
    console.log("✅ Base de datos limpia de pruebas.");
  } catch (e) {
    console.error("Error limpiando:", e);
  } finally {
    process.exit(0);
  }
}

cleanup();
