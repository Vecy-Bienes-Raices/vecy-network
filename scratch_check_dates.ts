import 'dotenv/config';
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    return;
  }
  try {
    const res = await db.execute(sql`
      SELECT DATE("createdAt") as date, COUNT(*) 
      FROM "messages" 
      WHERE "createdAt" >= NOW() - INTERVAL '3 days'
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    `);
    console.log("MESSAGES BY DATE:", JSON.stringify(res, null, 2));
  } catch (error) {
    console.error("Error querying dates:", error);
  }
  process.exit(0);
}

main();
