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
    const today = new Date();
    today.setHours(0,0,0,0);

    const msgs = await db.execute(sql`
      SELECT id, role, LEFT(content, 100) as content_preview, "createdAt"
      FROM messages 
      WHERE "createdAt" >= ${today.toISOString()}
      ORDER BY "createdAt" DESC
      LIMIT 100
    `);
    console.log("=== DB MESSAGES LOGGED TODAY ===");
    console.log(JSON.stringify(msgs, null, 2));

  } catch (error) {
    console.error("Error checking db:", error);
  }
  process.exit(0);
}

main();
