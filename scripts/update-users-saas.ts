import { getDb } from "../server/db";

async function main() {
  console.log("🛠️ Preparando tabla 'users' para el Motor de Identidad Dinámica...");
  const db = await getDb();
  if (!db) {
    console.error("❌ No se pudo conectar a la base de datos.");
    process.exit(1);
  }

  try {
    console.log("➡️ Añadiendo columnas SaaS Generativo...");
    
    // Añadir columnas una por una
    await db.execute(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "subdomain" character varying(100) UNIQUE`);
    await db.execute(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "themeConfig" jsonb`);
    await db.execute(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "customLogoUrl" text`);
    await db.execute(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "activeTools" jsonb`);
    
    console.log("✅ Tabla 'users' actualizada exitosamente.");

  } catch (error) {
    console.error("❌ Error actualizando la tabla:", error);
  } finally {
    process.exit(0);
  }
}

main();
