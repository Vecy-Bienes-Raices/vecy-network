/**
 * Sprint 3 Database Migration
 * Adds canonical external ID fields, commercial tracking fields
 * and the property_publication_history relational table to Supabase.
 *
 * Safe to run multiple times (uses IF NOT EXISTS).
 *
 * Usage (from project root):
 *   npx tsx scripts/add_history_and_canonical_columns.ts
 */

// Load .env automatically — no need for -r dotenv/config flag
import "dotenv/config";

import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

const COLUMNS = [
  `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "portal" varchar(50)`,
  `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "external_listing_id" varchar(100)`,
  `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "canonical_external_id" varchar(150) UNIQUE`,
  `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "fecha_primera_publicacion" timestamp DEFAULT now()`,
  `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "fecha_ultima_publicacion" timestamp DEFAULT now()`,
  `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "republicaciones_count" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "estado_comercial" varchar(50) DEFAULT 'ACTIVO' NOT NULL`,
  `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "ultima_actividad" varchar(50) DEFAULT 'PUBLICACIÓN' NOT NULL`,
  `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "vigencia_ia" varchar(50) DEFAULT 'VIGENTE' NOT NULL`,
];

const CREATE_HISTORY_TABLE = `
  CREATE TABLE IF NOT EXISTS "property_publication_history" (
    "id" serial PRIMARY KEY,
    "propertyId" integer NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
    "fecha" timestamp DEFAULT now() NOT NULL,
    "grupo" varchar(255),
    "broker" varchar(255),
    "broker_phone" varchar(50),
    "accion" varchar(50) NOT NULL,
    "portal" varchar(50),
    "external_listing_id" varchar(100),
    "mensaje_whatsapp_id" varchar(255),
    "detalles" text
  )
`;

async function main() {
  console.log("🛠️  Sprint 3 Database Migration Starting...");
  console.log("   Target: Supabase / DATABASE_URL\n");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set. Please run with: npx tsx -r dotenv/config scripts/add_history_and_canonical_columns.ts");
    process.exit(1);
  }

  const db = await getDb();
  if (!db) {
    console.error("❌ Could not establish database connection. Check DATABASE_URL.");
    process.exit(1);
  }

  // --- Step 1: Add new columns to properties table (one by one for safety) ---
  console.log("📋 Step 1/2: Adding columns to 'properties' table...");
  let ok = true;
  for (const stmt of COLUMNS) {
    const colName = stmt.match(/"([^"]+)"\s*varchar|integer|timestamp/)?.[0] ?? stmt;
    try {
      await db.execute(sql.raw(stmt));
      console.log(`   ✅ ${stmt.match(/ADD COLUMN IF NOT EXISTS "([^"]+)"/)?.[1] ?? "column"}`);
    } catch (e: any) {
      // Unique constraint already added is OK
      if (e.message?.includes("already exists")) {
        console.log(`   ⏭️  ${colName} — already exists, skipped.`);
      } else {
        console.error(`   ❌ Failed: ${e.message}`);
        ok = false;
      }
    }
  }

  // --- Step 2: Create history table ---
  console.log("\n📋 Step 2/2: Creating 'property_publication_history' table...");
  try {
    await db.execute(sql.raw(CREATE_HISTORY_TABLE));
    console.log("   ✅ property_publication_history — created (or already existed).");
  } catch (e: any) {
    console.error(`   ❌ Failed to create history table: ${e.message}`);
    ok = false;
  }

  if (ok) {
    console.log("\n🚀 Migration completed successfully. Database is ready for Sprint 3.");
  } else {
    console.log("\n⚠️  Migration finished with some errors. Review the output above.");
  }

  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("❌ Unhandled error:", err);
  process.exit(1);
});
