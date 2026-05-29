import "dotenv/config";
import { getDb } from "../server/db";

async function main() {
  console.log("🛠️ Conectando a la base de datos para habilitar RLS en 'pendingSessions'...");
  const db = await getDb();
  if (!db) {
    console.error("❌ No se pudo conectar a la base de datos.");
    process.exit(1);
  }

  try {
    console.log("➡️ Habilitando Row Level Security (RLS) en la tabla 'pendingSessions'...");
    await db.execute(`ALTER TABLE public."pendingSessions" ENABLE ROW LEVEL SECURITY`);
    console.log("✅ RLS habilitado.");

    console.log("➡️ Limpiando políticas antiguas si existen...");
    await db.execute(`DROP POLICY IF EXISTS "pendingSessions_service_access" ON public."pendingSessions"`);
    await db.execute(`DROP POLICY IF EXISTS "pendingSessions_public_deny" ON public."pendingSessions"`);

    console.log("➡️ Creando políticas de seguridad para 'pendingSessions'...");
    // Permitir acceso completo a service_role (usado por el backend)
    await db.execute(`
      CREATE POLICY "pendingSessions_service_access" ON public."pendingSessions" 
      FOR ALL TO service_role USING (true) WITH CHECK (true)
    `);
    // Denegar acceso completo a anon y authenticated (API REST pública de Supabase)
    await db.execute(`
      CREATE POLICY "pendingSessions_public_deny" ON public."pendingSessions" 
      FOR ALL TO anon, authenticated USING (false)
    `);
    console.log("✅ Políticas de seguridad creadas exitosamente.");
    console.log("🎉 ¡Tabla 'pendingSessions' blindada correctamente!");

  } catch (error) {
    console.error("❌ Error aplicando seguridad RLS:", error);
  } finally {
    process.exit(0);
  }
}

main();
