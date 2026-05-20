import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("DB connection failed");
    return;
  }
  
  const result = await db.execute(sql`
    SELECT prosrc 
    FROM pg_proc 
    WHERE proname = 'buscar_matches_para_inmueble';
  `);
  
  if (result.length > 0) {
    console.log("Function Definition:\n", result[0].prosrc);
  } else {
    console.log("Function not found.");
  }
  process.exit(0);
}

main().catch(console.error);
