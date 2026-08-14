import 'dotenv/config';
import postgres from 'postgres';

async function purgeIncompleteRecords() {
  console.log("==========================================================================");
  console.log("DEPURACIÓN DE REGISTROS INCOMPLETOS EN SUPABASE (ADDENDUM v8)");
  console.log("==========================================================================\n");

  const sql = postgres(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || '', { prepare: false });

  // 1. Identificar inmuebles incompletos (sin barrio resuelto o genérico "Bogotá")
  const incompleteProps = await sql`
    SELECT id FROM properties
    WHERE address_neighborhood IS NULL 
       OR TRIM(address_neighborhood) = '' 
       OR address_neighborhood = 'N/E'
       OR LOWER(address_neighborhood) IN ('bogota', 'bogotá', 'bogota, d.c.', 'bogota d.c.', 'medellin', 'cali');
  `;
  const propIdsToDelete = incompleteProps.map(p => p.id);

  // 2. Identificar requerimientos incompletos (sin barrio resuelto o genérico "Bogotá")
  const incompleteReqs = await sql`
    SELECT id FROM requirements
    WHERE address_neighborhood IS NULL 
       OR TRIM(address_neighborhood) = '' 
       OR address_neighborhood = 'N/E'
       OR LOWER(address_neighborhood) IN ('bogota', 'bogotá', 'bogota, d.c.', 'bogota d.c.', 'medellin', 'cali');
  `;
  const reqIdsToDelete = incompleteReqs.map(r => r.id);

  console.log(`📊 Inmuebles Incompletos a Eliminar:     ${propIdsToDelete.length}`);
  console.log(`📊 Requerimientos Incompletos a Eliminar: ${reqIdsToDelete.length}\n`);

  // 3. Eliminar coincidencia asociadas en propertyMatches y notificationLogs
  if (propIdsToDelete.length > 0 || reqIdsToDelete.length > 0) {
    const propIdList = propIdsToDelete.length > 0 ? propIdsToDelete : [-1];
    const reqIdList = reqIdsToDelete.length > 0 ? reqIdsToDelete : [-1];

    // a. Obtener IDs de propertyMatches a eliminar
    const matchesToDelete = await sql`
      SELECT id FROM "propertyMatches"
      WHERE "propertyId" = ANY(${propIdList}) OR "requirementId" = ANY(${reqIdList});
    `;
    const matchIds = matchesToDelete.map(m => m.id);

    if (matchIds.length > 0) {
      await sql`DELETE FROM "notificationLogs" WHERE "matchId" = ANY(${matchIds});`;
      await sql`DELETE FROM "propertyMatches" WHERE id = ANY(${matchIds});`;
      console.log(`🧹 Purgadas ${matchIds.length} coincidencias dependientes de los registros incompletos.`);
    }

    // b. Eliminar inmuebles incompletos
    if (propIdsToDelete.length > 0) {
      await sql`DELETE FROM "propertyImages" WHERE "propertyId" = ANY(${propIdList});`;
      await sql`DELETE FROM "property_publication_history" WHERE "propertyId" = ANY(${propIdList});`;
      await sql`DELETE FROM properties WHERE id = ANY(${propIdList});`;
      console.log(`✅ Eliminados ${propIdsToDelete.length} inmuebles incompletos de Supabase.`);
    }

    // c. Eliminar requerimientos incompletos
    if (reqIdsToDelete.length > 0) {
      await sql`DELETE FROM requirements WHERE id = ANY(${reqIdList});`;
      console.log(`✅ Eliminados ${reqIdsToDelete.length} requerimientos incompletos de Supabase.`);
    }
  }

  // 4. Verificar conteos finales
  const finalProps = await sql`SELECT count(*) as total FROM properties;`;
  const finalReqs = await sql`SELECT count(*) as total FROM requirements;`;
  const finalMatches = await sql`SELECT count(*) as total FROM "propertyMatches";`;

  console.log(`\n==========================================================================`);
  console.log(`🎉 ¡PURGA COMPLETADA CON ÉXITO!`);
  console.log(`   🏢 Inmuebles Robustos Conservados:      ${finalProps[0].total}`);
  console.log(`   📋 Requerimientos Robustos Conservados: ${finalReqs[0].total}`);
  console.log(`   🎯 Coincidencias Verificadas Restantes: ${finalMatches[0].total}`);
  console.log(`==========================================================================\n`);

  await sql.end();
  process.exit(0);
}

purgeIncompleteRecords().catch(err => {
  console.error("❌ Error en purga:", err);
  process.exit(1);
});
