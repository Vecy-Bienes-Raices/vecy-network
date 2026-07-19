import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("DB connection failed");
    return;
  }
  
  console.log("Applying Sprint 3 Ingestion & Desduplicacion migration changes to Supabase...");
  
  try {
    await db.execute(sql`
      ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "portal" varchar(50);
      ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "external_listing_id" varchar(100);
      ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "canonical_external_id" varchar(150) UNIQUE;
      ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "fecha_primera_publicacion" timestamp DEFAULT now();
      ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "fecha_ultima_publicacion" timestamp DEFAULT now();
      ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "republicaciones_count" integer DEFAULT 0 NOT NULL;
      ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "estado_comercial" varchar(50) DEFAULT 'ACTIVO' NOT NULL;
      ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "ultima_actividad" varchar(50) DEFAULT 'PUBLICACIÓN' NOT NULL;
      ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "vigencia_ia" varchar(50) DEFAULT 'VIGENTE' NOT NULL;
    `);
    console.log("Altered properties table successfully.");
  } catch (e: any) {
    console.error("Failed to alter properties table:", e.message);
  }

  try {
    await db.execute(sql`
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
      );
    `);
    console.log("Created property_publication_history table successfully.");
  } catch (e: any) {
    console.error("Failed to create history table:", e.message);
  }
  
  process.exit(0);
}

main().catch(console.error);
