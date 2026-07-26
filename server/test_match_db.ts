import "dotenv/config";
import { getDb } from "./db";
import { propertyMatches } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if(!db) { console.log("NO DB"); return; }
  
  const m = await db.select().from(propertyMatches).where(eq(propertyMatches.id, 399));
  
  console.log("Match 399:", m[0]);
}

run().catch(console.error).finally(() => process.exit(0));
