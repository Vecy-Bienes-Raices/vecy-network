import "dotenv/config";
import fs from "fs";
import path from "path";
import postgres from "postgres";

async function seed() {
  const geojsonPath = path.join(process.cwd(), "SECTOR.geojson");
  if (!fs.existsSync(geojsonPath)) {
    console.error(`❌ No se encontró el archivo ${geojsonPath}`);
    return;
  }

  console.log("📂 Leyendo SECTOR.geojson...");
  const rawData = fs.readFileSync(geojsonPath, "utf-8");
  const geojson = JSON.parse(rawData);

  const features = geojson.features || [];
  console.log(`📊 Encontrados ${features.length} sectores en el dataset de IDECA.`);

  const sql = postgres(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "", {
    prepare: false,
    max: 5
  });

  try {
    console.log("🧹 Limpiando registros anteriores de barrios_bogota_geojson...");
    await sql`TRUNCATE TABLE barrios_bogota_geojson RESTART IDENTITY;`;

    let inserted = 0;
    const batchSize = 100;

    for (let i = 0; i < features.length; i += batchSize) {
      const batch = features.slice(i, i + batchSize);

      const valueClauses = batch.map(feature => {
        const props = feature.properties || {};
        const scacodigo = props.SCACODIGO ? `'${props.SCACODIGO.replace(/'/g, "''")}'` : 'NULL';
        const scanombre = props.SCANOMBRE ? `'${props.SCANOMBRE.replace(/'/g, "''")}'` : "'SIN NOMBRE'";
        
        let codLoc = props.COD_LOC || props.LOCCODIGO || null;
        if (!codLoc && props.SCACODIGO && props.SCACODIGO.length >= 3) {
          codLoc = props.SCACODIGO.substring(0, 3);
        }
        const codLocStr = codLoc ? `'${codLoc.replace(/'/g, "''")}'` : 'NULL';
        const geomJson = `'${JSON.stringify(feature.geometry).replace(/'/g, "''")}'`;

        return `(${scacodigo}, ${scanombre}, ${codLocStr}, ST_Multi(ST_GeomFromGeoJSON(${geomJson})))`;
      }).join(",\n");

      const query = `
        INSERT INTO barrios_bogota_geojson (scacodigo, scanombre, cod_loc, geometry)
        VALUES ${valueClauses};
      `;

      await sql.unsafe(query);
      inserted += batch.length;
      console.log(`⏳ Insertados ${inserted}/${features.length} sectores de Bogotá...`);
    }

    console.log(`\n🎉 ¡ÉXITO! Se insertaron ${inserted} sectores/barrios oficiales de IDECA en Supabase.`);

    // Verificar el conteo total en BD
    const countRes = await sql`SELECT COUNT(*) as total FROM barrios_bogota_geojson;`;
    console.log(`📊 Total en la tabla barrios_bogota_geojson: ${countRes[0].total} registros.`);

  } catch (err) {
    console.error("❌ Error insertando datos GeoJSON:", err);
  } finally {
    await sql.end();
  }
}

seed();
