import dotenv from "dotenv";
dotenv.config();
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { deducirGeografiaTripartita } from "../_core/geography";

async function resanitizeGeography() {
  const db = await getDb();
  if (!db) {
    console.error("❌ No hay conexión a Supabase");
    return;
  }

  console.log("⚡ INICIANDO SANEAMIENTO GEOGRÁFICO NACIONAL DE BASE DE DATOS...");

  const allProps = await db.execute(sql`
    SELECT id, name, city, zone, address_neighborhood, address_locality, address_city, "rawText"
    FROM properties
    ORDER BY id ASC;
  `);

  const allReqs = await db.execute(sql`
    SELECT id, "ciudadDeseada", "zonaDeseada", "address_neighborhood", "address_locality", "address_city", "rawText"
    FROM requirements
    ORDER BY id ASC;
  `);

  console.log(`📊 Procesando ${allProps.length} propiedades y ${allReqs.length} requerimientos...`);

  let updatedProps = 0;
  for (const prop of allProps) {
    const rawText = (prop as any).rawText || (prop as any).name || "";
    // Deducir exclusivamente desde el texto original del predio (NUNCA desde el nombre del grupo)
    const geo = deducirGeografiaTripartita(null, null, null, rawText);

    const oldCity = (prop as any).city;
    const oldZone = (prop as any).zone;
    const newCity = geo.city;
    const newZone = geo.neighborhood || oldZone;
    const newLocality = geo.locality;

    if (oldCity !== newCity || oldZone !== newZone) {
      await db.execute(sql`
        UPDATE properties
        SET city = ${newCity},
            zone = ${newZone},
            address_neighborhood = ${newZone},
            address_locality = ${newLocality},
            address_city = ${newCity}
        WHERE id = ${(prop as any).id};
      `);
      updatedProps++;
      if (updatedProps <= 25 || (prop as any).id === 850 || (prop as any).id === 525 || (prop as any).id === 405 || (prop as any).id === 219 || (prop as any).id === 66) {
        console.log(`   🏠 Propiedad #${(prop as any).id}: [${oldCity} / ${oldZone}] ➔ [${newCity} / ${newZone} (${newLocality || "N/A"})]`);
      }
    }
  }

  let updatedReqs = 0;
  for (const req of allReqs) {
    const rawText = (req as any).rawText || "";
    const geo = deducirGeografiaTripartita(null, null, null, rawText);

    const oldCity = (req as any).ciudadDeseada;
    const oldZone = (req as any).zonaDeseada;
    const newCity = geo.city;
    const newZone = geo.neighborhood || oldZone;
    const newLocality = geo.locality;

    if (oldCity !== newCity || oldZone !== newZone) {
      await db.execute(sql`
        UPDATE requirements
        SET "ciudadDeseada" = ${newCity},
            "zonaDeseada" = ${newZone},
            address_neighborhood = ${newZone},
            address_locality = ${newLocality},
            address_city = ${newCity}
        WHERE id = ${(req as any).id};
      `);
      updatedReqs++;
      if (updatedReqs <= 20) {
        console.log(`   📝 Requerimiento #${(req as any).id}: [${oldCity} / ${oldZone}] ➔ [${newCity} / ${newZone} (${newLocality || "N/A"})]`);
      }
    }
  }

  console.log("\n============================================================");
  console.log(`🎉 SANEAMIENTO GEOGRÁFICO COMPLETADO CON ÉXITO`);
  console.log(`⚡ Propiedades corregidas: ${updatedProps} de ${allProps.length}`);
  console.log(`⚡ Requerimientos corregidos: ${updatedReqs} de ${allReqs.length}`);
  console.log("============================================================");
  process.exit(0);
}

resanitizeGeography().catch(err => {
  console.error("❌ Error en saneamiento:", err);
  process.exit(1);
});
