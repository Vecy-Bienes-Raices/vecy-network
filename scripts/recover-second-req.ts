import { getDb } from "../server/db";
import { requirements } from "../drizzle/schema";

async function main() {
  console.log("🛠️ Subiendo segundo requerimiento (+57 320 8414610) a Supabase...");
  const db = await getDb();
  if (!db) return;

  try {
    const rawText = `Busco APTO EN ARRIENDO_ CEDRITOS o COLINA
1 o 2 habitaciones. 
Garaje
Presupuesto: $2,2 millones con admon incluida
Contacto: 3208414610`;

    const [result] = await db.insert(requirements).values({
      name: "Colega 3208414610",
      idUsuarioWhatsapp: "573208414610@c.us",
      tipoInmuebleDeseado: "apartment",
      tipoNegocioDeseado: "arriendo",
      presupuestoMax: "2200000",
      zonaDeseada: "Cedritos o Colina",
      habitacionesMin: 1,
      areaMin: null, // No especificado
      rawText: rawText,
      status: "active"
    }).returning();

    console.log("✅ Segundo requerimiento guardado con ID:", result.id);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

main();
