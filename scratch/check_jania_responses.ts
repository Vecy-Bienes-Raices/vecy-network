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
      SELECT id, role, content, "createdAt"
      FROM messages 
      WHERE "createdAt" >= ${today.toISOString()} AND role = 'janIA'
      ORDER BY "createdAt" DESC
    `);
    console.log("=== JANIA RESPONSES TODAY ===");
    console.log(JSON.stringify(msgs, null, 2));

  } catch (error) {
    console.error("Error checking db:", error);
  }
  process.exit(0);
}

main();
