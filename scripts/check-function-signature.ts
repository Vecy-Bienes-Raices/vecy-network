import { getDb } from "../server/db";

async function checkFunction() {
  const db = await getDb();
  if (!db) return;
  try {
    console.log("🔍 Investigando firma de la función en la base de datos...");
    const res = await db.execute(`
      SELECT 
        p.proname as function_name, 
        pg_get_function_arguments(p.oid) as arguments
      FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' 
      AND p.proname = 'buscar_matches_para_inmueble';
    `);
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

checkFunction();
