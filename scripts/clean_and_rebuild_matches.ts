import "dotenv/config";
import { getDb } from "../server/db";
import { properties, requirements, propertyMatches } from "../drizzle/schema";
import { isNull, and, eq } from "drizzle-orm";
import { findMatchesForRequirement } from "../server/_core/matching";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("No database connection");
    return;
  }

  console.log("=== INICIANDO PURGA DE SEMILLAS Y RESETEO DE MATCHES ===");

  // 1. Borrar todos los matches sugeridos / no confirmados
  console.log("Limpiando la tabla de coincidencia (propertyMatches)...");
  const deletedMatches = await db
    .delete(propertyMatches)
    .where(
      and(
        eq(propertyMatches.ownerConfirmed, false),
        eq(propertyMatches.seekerConfirmed, false)
      )
    )
    .returning();
  console.log(`✓ Se eliminaron ${deletedMatches.length} matches sugeridos antiguos.`);

  // 2. Borrar las 12 propiedades semilla (idUsuarioWhatsapp is null and agentId is null)
  console.log("Eliminando propiedades semilla de prueba...");
  const deletedProps = await db
    .delete(properties)
    .where(
      and(
        isNull(properties.idUsuarioWhatsapp),
        isNull(properties.agentId)
      )
    )
    .returning();
  console.log(`✓ Se eliminaron ${deletedProps.length} propiedades semilla de la base de datos.`);

  // 3. Cargar todos los requerimientos activos
  const activeReqs = await db
    .select()
    .from(requirements)
    .where(eq(requirements.status, "active"));
  console.log(`\n=== RECONSTRUYENDO MATCHES PARA ${activeReqs.length} REQUERIMIENTOS ACTIVOS ===`);

  let totalNewMatches = 0;
  for (const req of activeReqs) {
    console.log(`Procesando requerimiento #${req.id} (${req.tipoInmuebleDeseado} en ${req.ciudadDeseada})...`);
    const newMatches = await findMatchesForRequirement(req.id);
    console.log(`  -> Encontrados ${newMatches.length} matches válidos.`);
    totalNewMatches += newMatches.length;
  }

  console.log(`\n=== PROCESO COMPLETADO EXITOSAMENTE ===`);
  console.log(`Total de nuevos matches guardados en DB: ${totalNewMatches}`);
  process.exit(0);
}

run().catch((err) => {
  console.error("Error durante el proceso:", err);
  process.exit(1);
});
