import "dotenv/config";
import postgres from "postgres";

export function calleToLat(calle: number): number {
  // Calle 1 ≈ 4.597, Calle 200 ≈ 4.785
  return 4.597 + (calle * 0.00094);
}

export function carreraToLon(carrera: number): number {
  // Carrera 1 (Cerros) ≈ -74.045, Carrera 100 (Occidente) ≈ -74.140
  return -74.045 - (carrera * 0.00095);
}

async function testSpatialIntersect(minSt: number, maxSt: number, minCra?: number, maxCra?: number) {
  const sql = postgres(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "", { prepare: false });

  const minLat = calleToLat(minSt);
  const maxLat = calleToLat(maxSt);

  // Si no hay carreras especificadas, usar el corredor oriental/norte por defecto (-74.075 a -74.020)
  const minLon = maxCra ? carreraToLon(maxCra) : -74.080;
  const maxLon = minCra ? carreraToLon(minCra) : -74.025;

  console.log(`\n🔍 Bounding Box BBOX para Calles ${minSt}-${maxSt} ${minCra ? `y Carreras ${minCra}-${maxCra}` : ''}:`);
  console.log(`- SW: (${minLon.toFixed(4)}, ${minLat.toFixed(4)}) | NE: (${maxLon.toFixed(4)}, ${maxLat.toFixed(4)})`);

  const rows = await sql`
    SELECT DISTINCT scanombre, cod_loc
    FROM barrios_bogota_geojson
    WHERE ST_Intersects(
      geometry,
      ST_MakeEnvelope(${minLon}, ${minLat}, ${maxLon}, ${maxLat}, 4326)
    )
    ORDER BY scanombre;
  `;

  console.log(`✅ ${rows.length} barrios encontrados por intersección espacial IDECA:`);
  console.log(rows.map(r => r.scanombre));

  await sql.end();
}

async function run() {
  // Caso 1: Rango 75-100
  await testSpatialIntersect(75, 100);

  // Caso 2: Rango 140-152 entre Cra 15 y Autopista (Cra 45)
  await testSpatialIntersect(140, 152, 15, 45);
}

run();
