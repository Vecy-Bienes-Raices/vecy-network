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
    // 1. Check if pendingSessions table exists
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'pendingSessions'
    `);
    console.log("pendingSessions table check:", tables);

    if (tables.length === 0) {
      console.log("Creating pendingSessions table...");
      await db.execute(sql`
        CREATE TABLE "pendingSessions" (
          "jid" varchar(255) PRIMARY KEY NOT NULL,
          "sessionData" jsonb NOT NULL,
          "createdAt" timestamp DEFAULT now() NOT NULL,
          "updatedAt" timestamp DEFAULT now() NOT NULL
        )
      `);
      console.log("pendingSessions table created!");
    } else {
      console.log("pendingSessions table already exists.");
    }

    // 2. Check if ownerConfirmed exists in propertyMatches
    const columns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'propertyMatches' AND column_name IN ('ownerConfirmed', 'seekerConfirmed')
    `);
    console.log("propertyMatches columns check:", columns);

    const hasOwnerConfirmed = columns.some((c: any) => c.column_name === 'ownerConfirmed');
    const hasSeekerConfirmed = columns.some((c: any) => c.column_name === 'seekerConfirmed');

    if (!hasOwnerConfirmed) {
      console.log("Adding ownerConfirmed column to propertyMatches...");
      await db.execute(sql`
        ALTER TABLE "propertyMatches" ADD COLUMN "ownerConfirmed" boolean DEFAULT false NOT NULL
      `);
      console.log("ownerConfirmed column added!");
    }
    if (!hasSeekerConfirmed) {
      console.log("Adding seekerConfirmed column to propertyMatches...");
      await db.execute(sql`
        ALTER TABLE "propertyMatches" ADD COLUMN "seekerConfirmed" boolean DEFAULT false NOT NULL
      `);
      console.log("seekerConfirmed column added!");
    }

    console.log("Schema update checking complete!");
  } catch (error) {
    console.error("Error updating database schema:", error);
  }
  process.exit(0);
}

main();
