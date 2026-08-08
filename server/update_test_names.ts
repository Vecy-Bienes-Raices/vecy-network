import "dotenv/config";
import postgres from "postgres";

async function run() {
  const sql = postgres(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "");

  console.log("📝 Actualizando nombres de usuario de prueba para Nancy y Marcela Forero en Supabase...");

  // Requerimiento 351 (Cedritos-Colina-Salitre-Alrededores) -> Nancy
  await sql`UPDATE requirements SET nombre_usuario_whatsapp = 'Nancy' WHERE id = 351`;
  // Requerimiento 133 (Agentes) -> Marcela Forero
  await sql`UPDATE requirements SET nombre_usuario_whatsapp = 'Marcela Forero' WHERE id = 133`;

  console.log("✅ Nombres actualizados correctamente.");
  await sql.end();
}

run();
