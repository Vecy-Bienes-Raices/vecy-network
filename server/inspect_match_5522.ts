import "dotenv/config";
import postgres from "postgres";

async function inspectMatch5522() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL no encontrada.");
    process.exit(1);
  }

  const sql = postgres(dbUrl, { prepare: false });

  try {
    console.log("🔍 Inspeccionando los registros de Supabase para Match #5522...");
    const cols = await sql`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'properties'
    `;
    console.log("Columnas reales de properties en Supabase:", cols.map(c => c.column_name));

    const prop = await sql`SELECT id, name, "idUsuarioWhatsapp", nombre_usuario_whatsapp, origen_nombre, "rawText" FROM properties WHERE id = 785`;
    const req = await sql`SELECT id, name, "idUsuarioWhatsapp", nombre_usuario_whatsapp, origen_nombre, "rawText" FROM requirements WHERE id = 218`;

    console.log("PROPIEDAD 785:", prop);
    console.log("REQUERIMIENTO 218:", req);

    console.log("Resultados encontrados:", JSON.stringify(matches, null, 2));
  } catch (err) {
    console.error("Error inspecting database:", err);
  } finally {
    await sql.end();
  }
}

inspectMatch5522();
