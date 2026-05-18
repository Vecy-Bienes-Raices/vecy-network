import { getDb } from "../server/db";
import { requirements } from "../drizzle/schema";

async function main() {
  console.log("🛠️ Recuperando requerimiento de Luvin Acosta manualmente...");
  const db = await getDb();
  if (!db) {
    console.error("❌ No se pudo conectar a la base de datos.");
    process.exit(1);
  }

  try {
    const rawText = `Busco para cliente
Apartamento
Cedritos 134 a 153 entre 15 y autopista
Presupuesto $500 Millones
20 años
Área 70 m2
2 habitaciones
2 baños
Garaje
Luvin Acosta
3008257834`;

    const [result] = await db.insert(requirements).values({
      name: "Luvin Acosta",
      idUsuarioWhatsapp: "573008257834@c.us", // Formateado según el número dado
      tipoInmuebleDeseado: "apartment",
      tipoNegocioDeseado: "venta", // Se asume venta por el presupuesto de 500M
      presupuestoMax: "500000000",
      zonaDeseada: "Cedritos 134 a 153 entre 15 y autopista",
      habitacionesMin: 2,
      banosMin: 2,
      areaMin: "70",
      rawText: rawText,
      status: "active"
    }).returning();

    console.log("✅ Requerimiento de Luvin Acosta guardado exitosamente con ID:", result.id);
  } catch (error) {
    console.error("❌ Error insertando el requerimiento:", error);
  } finally {
    process.exit(0);
  }
}

main();
