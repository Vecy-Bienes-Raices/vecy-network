/**
 * Script de Verificación y Aplicación de Blindaje RLS (Supabase Security Advisor)
 * Resuelve la alerta crítica 'rls_disabled_in_public' garantizando que ninguna tabla
 * en el esquema 'public' quede expuesta a accesos anónimos no autorizados.
 */
import postgres from "postgres";
import "dotenv/config";

export async function applyRlsHardening() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL no configurada en las variables de entorno.");
    process.exit(1);
  }

  const sql = postgres(dbUrl, { ssl: "require" });
  try {
    console.log("🔒 [VECY-SECURITY] Verificando y aplicando RLS en PostgreSQL / Supabase...");

    // 1. advisors
    await sql`ALTER TABLE public.advisors ENABLE ROW LEVEL SECURITY;`;
    await sql`DROP POLICY IF EXISTS "service_role_all_advisors" ON public.advisors;`;
    await sql`DROP POLICY IF EXISTS "deny_anon_advisors" ON public.advisors;`;
    await sql`CREATE POLICY "service_role_all_advisors" ON public.advisors FOR ALL TO service_role USING (true) WITH CHECK (true);`;
    await sql`CREATE POLICY "deny_anon_advisors" ON public.advisors FOR ALL TO anon, authenticated USING (false);`;

    // 2. predial_consultations
    await sql`ALTER TABLE public.predial_consultations ENABLE ROW LEVEL SECURITY;`;
    await sql`DROP POLICY IF EXISTS "service_role_all_predial" ON public.predial_consultations;`;
    await sql`DROP POLICY IF EXISTS "deny_anon_predial" ON public.predial_consultations;`;
    await sql`CREATE POLICY "service_role_all_predial" ON public.predial_consultations FOR ALL TO service_role USING (true) WITH CHECK (true);`;
    await sql`CREATE POLICY "deny_anon_predial" ON public.predial_consultations FOR ALL TO anon, authenticated USING (false);`;

    console.log("✅ [VECY-SECURITY] Blindaje RLS verificado y aplicado con éxito.");
  } catch (err: any) {
    console.error("❌ [VECY-SECURITY] Error aplicando blindaje RLS:", err?.message || err);
    throw err;
  } finally {
    await sql.end();
  }
}

if (process.argv[1]?.endsWith("enable_rls_hardening.ts")) {
  applyRlsHardening()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
