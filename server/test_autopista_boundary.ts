import "dotenv/config";
import postgres from "postgres";

async function run() {
  const sql = postgres(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "", { prepare: false });

  // Consultar centroides y limites de barrios entre calle 106 (lat 4.696) y calle 127 (lat 4.716)
  const rows = await sql`
    SELECT scanombre, 
           cod_loc,
           ST_X(ST_Centroid(geometry)) as centroid_lon,
           ST_Y(ST_Centroid(geometry)) as centroid_lat,
           ST_XMin(geometry) as xmin,
           ST_XMax(geometry) as xmax
    FROM barrios_bogota_geojson
    WHERE ST_Intersects(geometry, ST_MakeEnvelope(-74.090, 4.696, -74.010, 4.716, 4326))
    ORDER BY centroid_lon ASC;
  `;

  console.log("Barrios entre Calle 106 y 127 con sus Longitudes Centroides (X):");
  rows.forEach(r => {
    console.log(`${r.scanombre.padEnd(30)} | Loc: ${r.cod_loc} | Centroid Lon: ${r.centroid_lon.toFixed(5)} | XMin: ${r.xmin.toFixed(5)} | XMax: ${r.xmax.toFixed(5)}`);
  });

  await sql.end();
}

run();
