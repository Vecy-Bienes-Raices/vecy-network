import { getDb } from "../server/db";
import { requirements } from "../drizzle/schema";

async function main() {
  console.log("🚀 Recuperando requerimiento de María García Inmo...");
  const db = await getDb();
  if (!db) {
    console.error("❌ No se pudo conectar a la base de datos.");
    process.exit(1);
  }

  try {
    const rawText = `Busco apartamento ARRIENDO
1 alcoba
Moderno 
Presupuesto 4.000.000
Desde 72 a la 127 arriba de la autopista`;

    const [result] = await db.insert(requirements).values({
      name: "María García Inmo",
      idUsuarioWhatsapp: "maria_garcia_inmo", // ID interno de referencia
      tipoInmuebleDeseado: "apartment",
      tipoNegocioDeseado: "arriendo",
      presupuestoMax: "4000000",
      zonaDeseada: "Desde 72 a la 127 arriba de la autopista",
      habitacionesMin: 1,
      rawText: rawText,
      status: "active"
    }).returning();

    console.log("✅ Requerimiento guardado exitosamente con ID:", result.id);
  } catch (error) {
    console.error("❌ Error insertando el requerimiento:", error);
  } finally {
    process.exit(0);
  }
}

main();
