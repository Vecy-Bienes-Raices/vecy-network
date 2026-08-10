import "dotenv/config";
import { getDb } from "./db";
import { requirements, properties } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { explicarMatch } from "./_core/matching";

async function run() {
  const db = await getDb();
  if (!db) return;

  const [req] = await db.select().from(requirements).where(eq(requirements.id, 370));
  const [prop485] = await db.select().from(properties).where(eq(properties.id, 485));

  if (req && prop485) {
    const exp = explicarMatch(req, prop485);
    console.log("EXPLICACIÓN MATCH 370 ↔ 485:", JSON.stringify(exp, null, 2));
  }
}

run();
