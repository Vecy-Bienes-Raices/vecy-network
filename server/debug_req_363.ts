import "dotenv/config";
import postgres from "postgres";
import { getDb } from "./db";
import { requirements, properties } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { explicarMatch } from "./_core/matching";

async function run() {
  const db = await getDb();
  if (!db) return;

  const [req] = await db.select().from(requirements).where(eq(requirements.id, 363));
  console.log("REQUERIMIENTO 363:", req);

  const [prop485] = await db.select().from(properties).where(eq(properties.id, 485));
  console.log("\nPROPIEDAD 485:", prop485);

  if (req && prop485) {
    const exp = explicarMatch(req, prop485);
    console.log("\nEXPLICACIÓN MATCH 363 ↔ 485:", exp);
  }
}

run();
