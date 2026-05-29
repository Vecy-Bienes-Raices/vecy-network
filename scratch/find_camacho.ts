import 'dotenv/config';
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    return;
  }
  try {
    const msgs = await db.execute(sql`
      SELECT id, role, content, "createdAt"
      FROM messages
      WHERE content ILIKE '%Camacho%'
      ORDER BY "createdAt" DESC
    `);
    console.log("=== MESSAGES CONTAINING CAMACHO ===");
    console.log(msgs);

    const props = await db.execute(sql`
      SELECT id, name, "idUsuarioWhatsapp", "createdAt"
      FROM properties
      WHERE name ILIKE '%Camacho%' OR "rawText" ILIKE '%Camacho%'
      ORDER BY "createdAt" DESC
    `);
    console.log("=== PROPERTIES CONTAINING CAMACHO ===");
    console.log(props);

  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

main();
