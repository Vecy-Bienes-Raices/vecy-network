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
      SELECT id, name, "propertyType", zone, price, "createdAt" 
      FROM "properties" 
      WHERE DATE("createdAt") = '2026-07-10'
      ORDER BY "createdAt" DESC
    `);
    console.log("LOGGED MESSAGES:", JSON.stringify(res, null, 2));
  } catch (error) {
    console.error("Error querying messages:", error);
  }
  process.exit(0);
}

main();
