import "dotenv/config";
import postgres from "postgres";

async function run() {
  const sql = postgres(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "");

  try {
    console.log("Habilitando extensión PostGIS...");
    await sql`CREATE EXTENSION IF NOT EXISTS postgis;`;
    console.log("✅ PostGIS habilitado en Supabase.");

    console.log("Creando tabla barrios_bogota_geojson...");
    await sql`
      CREATE TABLE IF NOT EXISTS barrios_bogota_geojson (
        id SERIAL PRIMARY KEY,
        scacodigo TEXT,
        scanombre TEXT NOT NULL,
        cod_loc TEXT,
        geometry geometry(Geometry, 4326),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    console.log("✅ Tabla barrios_bogota_geojson creada.");

    await sql`CREATE INDEX IF NOT EXISTS idx_barrios_bogota_geom ON barrios_bogota_geojson USING GIST (geometry);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_barrios_bogota_scanombre ON barrios_bogota_geojson (LOWER(scanombre));`;
    console.log("✅ Índices de PostGIS e índices por SCANOMBRE creados exitosamente.");
  } catch (err) {
    console.error("❌ Error en PostGIS / DDL:", err);
  } finally {
    await sql.end();
  }
}

run();
