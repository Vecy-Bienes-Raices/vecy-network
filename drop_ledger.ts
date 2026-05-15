import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function main() {
  console.log("Dropping clientLedger...");
  const sql = postgres(connectionString as string);
  const db = drizzle(sql);
  
  await sql`DROP TABLE IF EXISTS "clientLedger" CASCADE`;
  
  console.log("Done");
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
