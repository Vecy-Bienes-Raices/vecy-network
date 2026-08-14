import "dotenv/config";
import fs from "fs";
import path from "path";
import postgres from "postgres";

// Tabla Oficial de las 20 Localidades de Bogotá (DANE / IDECA / Alcaldía Mayor)
export const LOCALIDADES_OFICIALES_BOGOTA: Record<string, { code: string; name: string }> = {
  "01": { code: "01", name: "Usaquén" },
  "02": { code: "02", name: "Chapinero" },
  "03": { code: "03", name: "Santa Fe" },
  "04": { code: "04", name: "San Cristóbal" },
  "05": { code: "05", name: "Usme" },
  "06": { code: "06", name: "Tunjuelito" },
  "07": { code: "07", name: "Bosa" },
  "08": { code: "08", name: "Kennedy" },
  "09": { code: "09", name: "Fontibón" },
  "10": { code: "10", name: "Engativá" },
  "11": { code: "11", name: "Suba" },
  "12": { code: "12", name: "Barrios Unidos" },
  "13": { code: "13", name: "Teusaquillo" },
  "14": { code: "14", name: "Los Mártires" },
  "15": { code: "15", name: "Antonio Nariño" },
  "16": { code: "16", name: "Puente Aranda" },
  "17": { code: "17", name: "La Candelaria" },
  "18": { code: "18", name: "Rafael Uribe Uribe" },
  "19": { code: "19", name: "Ciudad Bolívar" },
  "20": { code: "20", name: "Sumapaz" }
};

export function resolverLocalidadOficial(scanombre: string): { code: string; name: string } | null {
  const norm = (scanombre || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Reglas Directas por Barrio / Sector Reconocido
  if (norm.includes("chico") || norm.includes("rosales") || norm.includes("cabrera") || norm.includes("virrey") || norm.includes("nogal") || norm.includes("quinta camacho") || norm.includes("retiro") || norm.includes("lago gaitan")) {
    return LOCALIDADES_OFICIALES_BOGOTA["02"]; // Chapinero
  }
  if (norm.includes("cedritos") || norm.includes("santa barbara") || norm.includes("santa ana") || norm.includes("santa paula") || norm.includes("san patricio") || norm.includes("toberin") || norm.includes("verbenal") || norm.includes("usaquen") || norm.includes("calleja") || norm.includes("bella suiza") || norm.includes("carolina")) {
    return LOCALIDADES_OFICIALES_BOGOTA["01"]; // Usaquén
  }
  if (norm.includes("kennedy") || norm.includes("castilla") || norm.includes("patio bonito") || norm.includes("bavaria") || norm.includes("mandalay") || norm.includes("marsella")) {
    return LOCALIDADES_OFICIALES_BOGOTA["08"]; // Kennedy
  }
  if (norm.includes("candelaria")) {
    return LOCALIDADES_OFICIALES_BOGOTA["17"]; // La Candelaria
  }
  if (norm.includes("restrepo") || norm.includes("ciudad berna") || norm.includes("sevilla")) {
    return LOCALIDADES_OFICIALES_BOGOTA["15"]; // Antonio Nariño
  }
  if (norm.includes("niza") || norm.includes("suba") || norm.includes("alhambra") || norm.includes("prado veraniego") || norm.includes("gratamira") || norm.includes("colina campestre") || norm.includes("pasadena")) {
    return LOCALIDADES_OFICIALES_BOGOTA["11"]; // Suba
  }
  if (norm.includes("normandia") || norm.includes("ferias") || norm.includes("alamos") || norm.includes("engativa") || norm.includes("quirigua")) {
    return LOCALIDADES_OFICIALES_BOGOTA["10"]; // Engativá
  }
  if (norm.includes("modelia") || norm.includes("fontibon") || norm.includes("hayuelos") || norm.includes("capellania")) {
    return LOCALIDADES_OFICIALES_BOGOTA["09"]; // Fontibón
  }
  if (norm.includes("polo") || norm.includes("barrios unidos") || norm.includes("doce de octubre") || norm.includes("alcazares") || norm.includes("san felipe")) {
    return LOCALIDADES_OFICIALES_BOGOTA["12"]; // Barrios Unidos
  }
  if (norm.includes("federmann") || norm.includes("teusaquillo") || norm.includes("quinta paredes") || norm.includes("palermo") || norm.includes("soledad")) {
    return LOCALIDADES_OFICIALES_BOGOTA["13"]; // Teusaquillo
  }

  return null;
}

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

      const valueClauses = batch.map((feature: any) => {
        const props = feature.properties || {};
        const scacodigo = props.SCACODIGO ? `'${props.SCACODIGO.replace(/'/g, "''")}'` : 'NULL';
        const scanombre = props.SCANOMBRE ? `'${props.SCANOMBRE.replace(/'/g, "''")}'` : "'SIN NOMBRE'";
        
        // Asignación de código oficial de localidad de 2 dígitos (01 a 20)
        const locRes = resolverLocalidadOficial(props.SCANOMBRE || "");
        const codLocStr = locRes ? `'${locRes.code}'` : 'NULL';
        const geomJson = `'${JSON.stringify(feature.geometry).replace(/'/g, "''")}'`;

        return `(${scacodigo}, ${scanombre}, ${codLocStr}, ST_Multi(ST_GeomFromGeoJSON(${geomJson})))`;
      }).join(",\n");

      const query = `
        INSERT INTO barrios_bogota_geojson (scacodigo, scanombre, cod_loc, geometry)
        VALUES ${valueClauses};
      `;

      await sql.unsafe(query);
      inserted += batch.length;
      console.log(`⏳ Insertados ${inserted}/${features.length} sectores de Bogotá con localidad oficial...`);
    }

    console.log(`\n🎉 ¡ÉXITO! Se insertaron ${inserted} sectores/barrios oficiales de IDECA con localidad oficial en Supabase.`);

    // Verificar el conteo total en BD
    const countRes = await sql`SELECT COUNT(*) as total FROM barrios_bogota_geojson;`;
    console.log(`📊 Total en la tabla barrios_bogota_geojson: ${countRes[0].total} registros.`);

  } catch (err) {
    console.error("❌ Error insertando datos GeoJSON:", err);
  } finally {
    await sql.end();
  }
}

if (process.argv[1] && process.argv[1].includes("seed_barrios_geojson")) {
  seed();
}

