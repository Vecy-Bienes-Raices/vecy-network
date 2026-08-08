import "dotenv/config";
import postgres from "postgres";

async function runMigration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL no configurada");
    process.exit(1);
  }

  console.log("⚡ Ejecutando migración DDL en Supabase...");
  const sql = postgres(dbUrl, { prepare: false });

  try {
    await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS nombre_usuario_whatsapp VARCHAR(255);`;
    console.log("✅ Columna nombre_usuario_whatsapp agregada a tabla properties.");

    await sql`ALTER TABLE requirements ADD COLUMN IF NOT EXISTS nombre_usuario_whatsapp VARCHAR(255);`;
    console.log("✅ Columna nombre_usuario_whatsapp agregada a tabla requirements.");

    console.log("🎉 Migración DDL completada exitosamente.");
  } catch (error) {
    console.error("❌ Error ejecutando migración:", error);
  } finally {
    await sql.end();
  }
}

runMigration();
