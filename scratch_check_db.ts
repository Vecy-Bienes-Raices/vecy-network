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
    const propertiesCols = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'properties'
    `);
    console.log("properties columns:", propertiesCols);

    const requirementsCols = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'requirements'
    `);
    console.log("requirements columns:", requirementsCols);

  } catch (error) {
    console.error("Error checking columns:", error);
  }
  process.exit(0);
}

main();
