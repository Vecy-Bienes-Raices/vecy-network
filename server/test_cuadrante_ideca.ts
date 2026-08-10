import "dotenv/config";
import postgres from "postgres";

export function calleToLat(calle: number): number {
  return 4.597 + (calle * 0.00094);
}

export function carreraToLon(carrera: number): number {
  return -74.045 - (carrera * 0.00095);
}

export async function resolverCuadranteVialEspacial(texto: string): Promise<{ resuelto: boolean; barrios: string[]; descripcion: string; confianza: string }> {
  const norm = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // 1. Extraer Calles (minStreet y maxStreet)
  const calleMatch = norm.match(/(?:calle|cll|cl|c|entre\s+la)\s*(\d+)\s*(?:y|a|-|hasta|\s+y\s+la)\s*(\d+)/i) 
    || norm.match(/entre\s+(?:la\s*)?(\d+)\s+y\s+(?:la\s*)?(\d+)/i);

  if (!calleMatch) {
    return { resuelto: false, barrios: [], descripcion: "No es un cuadrante vial resoluble por rango de calles", confianza: "ninguna" };
  }

  const minSt = Math.min(parseInt(calleMatch[1]), parseInt(calleMatch[2]));
  const maxSt = Math.max(parseInt(calleMatch[1]), parseInt(calleMatch[2]));

  // 2. Extraer Carreras si están presentes
  const craMatch = norm.match(/(?:carrera|cra|cr|kr|cpr|entre\s+la\s+carrera)\s*(\d+)\s*(?:y|a|-|hasta|\s+y\s+la)\s*(\d+)/i);
  let minCra: number | undefined;
  let maxCra: number | undefined;
  if (craMatch) {
    minCra = Math.min(parseInt(craMatch[1]), parseInt(craMatch[2]));
    maxCra = Math.max(parseInt(craMatch[1]), parseInt(craMatch[2]));
  } else if (norm.includes("autopista") || norm.includes("auto")) {
    minCra = 15;
    maxCra = 45;
  } else if (norm.includes("7") || norm.includes("septima") || norm.includes("séptima")) {
    minCra = 1;
    maxCra = 15;
  }

  // 3. Consulta de Intersección Geométrica Espacial PostGIS sobre barrios_bogota_geojson
  try {
    const sql = postgres(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "", { prepare: false });
    const minLat = calleToLat(minSt);
    const maxLat = calleToLat(maxSt);
    const minLon = maxCra ? carreraToLon(maxCra) : -74.080;
    const maxLon = minCra ? carreraToLon(minCra) : -74.025;

    const rows = await sql`
      SELECT DISTINCT scanombre
      FROM barrios_bogota_geojson
      WHERE ST_Intersects(
        geometry,
        ST_MakeEnvelope(${minLon}, ${minLat}, ${maxLon}, ${maxLat}, 4326)
      )
      ORDER BY scanombre;
    `;

    await sql.end();

    if (rows.length > 0) {
      const barrios = rows.map(r => r.scanombre.trim());
      return {
        resuelto: true,
        barrios,
        descripcion: `Intersección espacial IDECA (${barrios.length} sectores catastrales)`,
        confianza: "alta_geometria_ideca"
      };
    }
  } catch (err) {
    console.error("[Geocoding-Cuadrante-Spatial] Error consultando barrios_bogota_geojson:", err);
  }

  // 4. Fallback de respaldo con tabla fija
  let fallbackBarrios: string[] = [];
  if (minSt >= 106 && maxSt <= 127) {
    fallbackBarrios = ["Santa Bárbara Occidental", "Santa Bárbara Central", "Santa Bárbara Oriental", "La Calleja", "Unicentro", "San Patricio", "El Country"];
  } else if (minSt >= 127 && maxSt <= 153) {
    fallbackBarrios = ["Cedritos", "Contador", "Belmira", "Lisboa", "Nueva Autopista"];
  } else {
    fallbackBarrios = ["Cedritos", "Santa Bárbara", "Chicó"];
  }

  return {
    resuelto: true,
    barrios: fallbackBarrios,
    descripcion: "Tabla fija de cuadrantes (fallback de respaldo)",
    confianza: "aproximada"
  };
}

async function run() {
  const res1 = await resolverCuadranteVialEspacial("entre la calle 106 y la 127 arriba de la autopista");
  console.log("\nREQUERIMIENTO ID 353 (Calle 106 a 127):", res1);

  const res2 = await resolverCuadranteVialEspacial("entre la calle 140 y la 152, entre la autopista y la carrera 15");
  console.log("\nDESAFÍO PROMPT (Calle 140 a 152, Cra 15 a Auto):", res2);
}

run();
