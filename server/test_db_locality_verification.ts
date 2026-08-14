import 'dotenv/config';
import postgres from 'postgres';
import { LOCALIDADES_OFICIALES_BOGOTA } from './scripts/seed_barrios_geojson';

async function verifyDatabaseLocalities() {
  console.log("==========================================================================");
  console.log("VERIFICACIÓN DE SANIDAD OFICIAL DE LOCALIDADES EN SUPABASE (10 BARRIOS)");
  console.log("==========================================================================\n");

  const sql = postgres(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || '', { prepare: false });

  const referenceBarrios10 = [
    { query: "CEDRITOS", esperadaLoc: "Usaquén", esperadoCod: "01" },
    { query: "CHICO NORTE II SECTOR", esperadaLoc: "Chapinero", esperadoCod: "02" },
    { query: "CIUDAD KENNEDY CENTRAL", esperadaLoc: "Kennedy", esperadoCod: "08" },
    { query: "LA CANDELARIA", esperadaLoc: "La Candelaria", esperadoCod: "17" },
    { query: "RESTREPO OCCIDENTAL", esperadaLoc: "Antonio Nariño", esperadoCod: "15" },
    { query: "NIZA SUBA", esperadaLoc: "Suba", esperadoCod: "11" },
    { query: "LOS ROSALES", esperadaLoc: "Chapinero", esperadoCod: "02" },
    { query: "NORMANDIA OCCIDENTAL", esperadaLoc: "Engativá", esperadoCod: "10" },
    { query: "BOSQUE DE MODELIA", esperadaLoc: "Fontibón", esperadoCod: "09" },
    { query: "TEUSAQUILLO", esperadaLoc: "Teusaquillo", esperadoCod: "13" }
  ];

  let successCount = 0;

  for (const ref of referenceBarrios10) {
    const res = await sql`
      SELECT scanombre, cod_loc
      FROM barrios_bogota_geojson
      WHERE LOWER(scanombre) = LOWER(${ref.query})
      LIMIT 1;
    `;

    if (res.length > 0) {
      const row = res[0];
      const codLoc = row.cod_loc;
      const locInfo = LOCALIDADES_OFICIALES_BOGOTA[codLoc] || { name: "DESCONOCIDA", code: codLoc };
      const esCorrecto = codLoc === ref.esperadoCod;

      if (esCorrecto) successCount++;

      console.log(`📍 Barrio: "${row.scanombre}"`);
      console.log(`   - Código en BD (cod_loc): "${codLoc}"`);
      console.log(`   - Localidad Resuelta:   "${locInfo.name} (${locInfo.code})"` );
      console.log(`   - Esperada:             "${ref.esperadaLoc} (${ref.esperadoCod})"`);
      console.log(`   - Diagnóstico:          ${esCorrecto ? "✅ 100% CORRECTO" : "❌ INCORRECTO"}\n`);
    } else {
      console.log(`⚠️ Barrio "${ref.query}" no encontrado directamente en barrios_bogota_geojson.\n`);
    }
  }

  console.log(`==========================================================================`);
  console.log(`📊 RESULTADO DE SANIDAD: ${successCount}/${referenceBarrios10.length} BARRIOS VERIFICADOS CON ÉXITO.`);
  console.log(`==========================================================================\n`);

  await sql.end();
  process.exit(0);
}

verifyDatabaseLocalities().catch(err => {
  console.error("❌ Error en verificación BD:", err);
  process.exit(1);
});
