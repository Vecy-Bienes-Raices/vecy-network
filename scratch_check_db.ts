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
    const matchRes = await db.execute(sql`
      SELECT * FROM "propertyMatches" WHERE id = 498
    `);
    console.log("MATCH RECORD:", JSON.stringify(matchRes, null, 2));

    if (matchRes && matchRes.length > 0) {
      const match = matchRes[0] as any;
      
      const reqRes = await db.execute(sql`
        SELECT * FROM "requirements" WHERE id = ${match.requirementId}
      `);
      console.log("REQUIREMENT RECORD:", JSON.stringify(reqRes, null, 2));

      const propRes = await db.execute(sql`
        SELECT * FROM "properties" WHERE id = ${match.propertyId}
      `);
      console.log("PROPERTY RECORD:", JSON.stringify(propRes, null, 2));
    } else {
      console.log("Match 498 not found!");
    }
  } catch (error) {
    console.error("Error checking match 498:", error);
  }
  process.exit(0);
}

main();
