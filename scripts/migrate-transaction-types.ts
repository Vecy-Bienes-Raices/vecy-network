import { sql } from "drizzle-orm";
import { getDb } from "../server/db";

async function runMigration() {
  console.log("🔧 Ejecutando migración: Nuevos tipos de transacción...");
  const db = await getDb();
  if (!db) { console.error("❌ No DB"); process.exit(1); }

  try {
    await db.execute(sql`ALTER TYPE "transactionType" ADD VALUE IF NOT EXISTS 'venta_o_arriendo'`);
    console.log("✅ 'venta_o_arriendo' agregado");
    await db.execute(sql`ALTER TYPE "transactionType" ADD VALUE IF NOT EXISTS 'arriendo_con_opcion_de_compra'`);
    console.log("✅ 'arriendo_con_opcion_de_compra' agregado");
    await db.execute(sql`ALTER TYPE "transactionType" ADD VALUE IF NOT EXISTS 'venta_permuta'`);
    console.log("✅ 'venta_permuta' agregado");
    await db.execute(sql`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "rent_price" NUMERIC(15,2)`);
    console.log("✅ Columna 'rent_price' verificada en properties");

    const result = await db.execute(sql`SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transactionType') ORDER BY enumsortorder`);
    console.log("\n📋 Enum final:");
    (result.rows as any[]).forEach((r: any) => console.log(`  - ${r.enumlabel}`));
    console.log("\n🎉 Migración completada!");
  } catch (e: any) {
    console.error("❌ Error:", e.message);
  } finally {
    process.exit(0);
  }
}
runMigration();
