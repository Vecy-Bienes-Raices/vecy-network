import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("DB connection failed");
    return;
  }
  
  console.log("Renaming column floor to floor_detail and changing type to text...");
  try {
    await db.execute(sql`
      ALTER TABLE "properties" RENAME COLUMN "floor" TO "floor_detail";
    `);
    console.log("Renamed floor to floor_detail");
  } catch (e: any) {
    console.log("Rename failed (maybe already renamed?):", e.message);
  }

  try {
    await db.execute(sql`
      ALTER TABLE "properties" ALTER COLUMN "floor_detail" TYPE text;
    `);
    console.log("Changed floor_detail type to text");
  } catch (e: any) {
    console.log("Type change failed:", e.message);
  }
  
  process.exit(0);
}

main().catch(console.error);
