import "dotenv/config";
import postgres from "postgres";

export function calleToLat(calle: number): number {
  return 4.597 + (calle * 0.00094);
}

async function testCuadranteDirectional(texto: string) {
  const norm = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // 1. Extraer Calles
  const calleMatch = norm.match(/(?:calle|cll|cl|c|entre\s+la)\s*(\d+)\s*(?:y|a|-|hasta|\s+y\s+la)\s*(\d+)/i) 
    || norm.match(/entre\s+(?:la\s*)?(\d+)\s+y\s+(?:la\s*)?(\d+)/i);

  if (!calleMatch) return;

  const minSt = Math.min(parseInt(calleMatch[1]), parseInt(calleMatch[2]));
  const maxSt = Math.max(parseInt(calleMatch[1]), parseInt(calleMatch[2]));

  // 2. Detección direccional explicita:
  // "Arriba de la autopista" / "al oriente de la autopista" -> Localidad Usaquén / Chapinero (Oriente / Cerros, Lon >= -74.0535)
  // "Abajo de la autopista" / "al occidente de la autopista" -> Localidad Suba / Barrios Unidos (Occidente, Lon < -74.0535)
  const isArribaAuto = norm.includes("arriba de la autopista") || norm.includes("arriba de la auto") || norm.includes("oriente de la autopista") || norm.includes("este de la autopista");
  const isAbajoAuto = norm.includes("abajo de la autopista") || norm.includes("abajo de la auto") || norm.includes("occidente de la autopista") || norm.includes("oeste de la autopista");

  const minLat = calleToLat(minSt);
  const maxLat = calleToLat(maxSt);

  const LON_AUTOPISTA = -74.0535;
  const LON_CERROS_EAST = -74.015;
  const LON_SUBA_WEST = -74.095;

  let minLon = LON_SUBA_WEST;
  let maxLon = LON_CERROS_EAST;

  if (isArribaAuto) {
    minLon = LON_AUTOPISTA;
    maxLon = LON_CERROS_EAST;
  } else if (isAbajoAuto) {
    minLon = LON_SUBA_WEST;
    maxLon = LON_AUTOPISTA;
  }

  console.log(`\n🔍 Frase: "${texto}"`);
  console.log(`- Filtro Direccional: ${isArribaAuto ? 'ARRIBA DE LA AUTOPISTA (Oriente / Usaquén)' : isAbajoAuto ? 'ABAJO DE LA AUTOPISTA (Occidente / Suba)' : 'AMBOS COSTADOS'}`);
  console.log(`- BBOX Longitudes: [${minLon.toFixed(4)}, ${maxLon.toFixed(4)}] | Latitudes: [${minLat.toFixed(4)}, ${maxLat.toFixed(4)}]`);

  const sql = postgres(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "", { prepare: false });

  // Usar filtro por centroide de la geometría para evitar que polígonos que tocan la Autopista Norte por el occidente se cuelen al oriente
  let query;
  if (isArribaAuto) {
    query = sql`
      SELECT DISTINCT scanombre
      FROM barrios_bogota_geojson
      WHERE ST_Intersects(geometry, ST_MakeEnvelope(${minLon}, ${minLat}, ${maxLon}, ${maxLat}, 4326))
        AND ST_X(ST_Centroid(geometry)) >= ${LON_AUTOPISTA}
      ORDER BY scanombre;
    `;
  } else if (isAbajoAuto) {
    query = sql`
      SELECT DISTINCT scanombre
      FROM barrios_bogota_geojson
      WHERE ST_Intersects(geometry, ST_MakeEnvelope(${minLon}, ${minLat}, ${maxLon}, ${maxLat}, 4326))
        AND ST_X(ST_Centroid(geometry)) < ${LON_AUTOPISTA}
      ORDER BY scanombre;
    `;
  } else {
    query = sql`
      SELECT DISTINCT scanombre
      FROM barrios_bogota_geojson
      WHERE ST_Intersects(geometry, ST_MakeEnvelope(${minLon}, ${minLat}, ${maxLon}, ${maxLat}, 4326))
      ORDER BY scanombre;
    `;
  }

  const rows = await query;
  await sql.end();

  console.log(`✅ ${rows.length} barrios oficiales en el sector exacto:`);
  console.log(rows.map(r => r.scanombre));
}

async function run() {
  await testCuadranteDirectional("entre la calle 106 y la 127 arriba de la autopista");
}

run();
