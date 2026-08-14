import 'dotenv/config';
import postgres from 'postgres';

async function fixProperty660AndPriceRules() {
  console.log("==========================================================================");
  console.log("CORRECCIÓN EXACTA: INMUEBLE ROSALES #660 + REQUERIMIENTO #153 + PURGA DE PRECIOS EXCEDIDOS");
  console.log("==========================================================================\n");

  const sql = postgres(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || '', { prepare: false });

  // 1. Corregir Inmueble de Rosales ($5.300.000.000 COP, 348 m2, Rosales, Chapinero)
  const propRosales = await sql`
    SELECT id, name, price, "areaTotal", address_neighborhood, address_locality
    FROM properties
    WHERE LOWER(name) LIKE '%rosales%' OR LOWER("rawText") LIKE '%rosales%'
    ORDER BY id DESC LIMIT 5;
  `;

  console.log("📌 Inmuebles Rosales inspeccionados:");
  for (const p of propRosales) {
    console.log(`   - Inmueble #${p.id}: "${p.name}" | Precio actual DB: ${p.price} | Área: ${p.areaTotal}`);
    
    // Corregir precio exacto a 5300000000 (5.300 Millones COP), área 348 m2, barrio Rosales, localidad Chapinero
    if (p.name.includes("Rosales Bajo") || p.name.includes("348")) {
      await sql`
        UPDATE properties
        SET 
          price = '5300000000',
          "areaTotal" = '348',
          address_neighborhood = 'Rosales',
          address_locality = 'Chapinero',
          zone = 'Rosales',
          "updatedAt" = NOW()
        WHERE id = ${p.id};
      `;
      console.log(`✅ Inmueble #${p.id} actualizado: Price='5300000000' ($5.300M COP), Area='348', Barrio='Rosales', Localidad='Chapinero'`);
    }
  }

  // 2. Corregir Requerimiento #153 ($3.500.000.000 COP, Rosales, Chapinero)
  const reqRosales = await sql`
    SELECT id, name, "presupuestoMax", address_neighborhood, address_locality
    FROM requirements
    WHERE LOWER(name) LIKE '%rosales%' OR LOWER("zonaDeseada") LIKE '%rosales%' OR LOWER("rawText") LIKE '%rosales%'
    ORDER BY id DESC LIMIT 5;
  `;

  console.log("\n📌 Requerimientos Rosales inspeccionados:");
  for (const r of reqRosales) {
    console.log(`   - Requerimiento #${r.id}: "${r.name}" | Presupuesto DB: ${r.presupuestoMax}`);

    if (r.name.includes("Cabrera, Virrey") || r.name.includes("Rosales")) {
      await sql`
        UPDATE requirements
        SET 
          "presupuestoMax" = '3500000000',
          address_neighborhood = 'Rosales',
          address_locality = 'Chapinero',
          "zonaDeseada" = 'Rosales',
          "updatedAt" = NOW()
        WHERE id = ${r.id};
      `;
      console.log(`✅ Requerimiento #${r.id} actualizado: PresupuestoMax='3500000000' ($3.500M COP), Barrio='Rosales', Localidad='Chapinero'`);
    }
  }

  // 3. ENFORCE REGLA DE PRECIO DOCTRINAL EN DB:
  // Si el precio de venta/arriendo del inmueble SUPERA el presupuesto máximo del requerimiento -> ELIMINAR EL MATCH
  console.log("\n🧹 Purgando matches donde el precio del inmueble SUPERA el presupuesto del requerimiento...");

  const invalidPriceMatches = await sql`
    SELECT m.id, m."propertyId", m."requirementId", p.price as prop_price, p.rent_price as prop_rent, r."presupuestoMax" as req_budget, r."tipoNegocioDeseado"
    FROM "propertyMatches" m
    JOIN properties p ON m."propertyId" = p.id
    JOIN requirements r ON m."requirementId" = r.id;
  `;

  const matchIdsToDelete: number[] = [];

  invalidPriceMatches.forEach(m => {
    const reqMax = parseFloat(m.req_budget || '0');
    const pSale = parseFloat(m.prop_price || '0');
    const pRent = parseFloat(m.prop_rent || '0');
    const isRent = (m.tipoNegocioDeseado || '').toLowerCase().includes('arriendo');

    if (reqMax > 0) {
      if (!isRent && pSale > 0 && pSale > reqMax) {
        console.log(`❌ Match #${m.id} INCOMPATIBLE EN PRECIO: Inmueble $${pSale.toLocaleString()} > Requerimiento Max $${reqMax.toLocaleString()}`);
        matchIdsToDelete.push(m.id);
      } else if (isRent && pRent > 0 && pRent > reqMax) {
        console.log(`❌ Match #${m.id} INCOMPATIBLE EN CANON: Inmueble Canon $${pRent.toLocaleString()} > Requerimiento Canon Max $${reqMax.toLocaleString()}`);
        matchIdsToDelete.push(m.id);
      }
    }
  });

  if (matchIdsToDelete.length > 0) {
    await sql`DELETE FROM "notificationLogs" WHERE "matchId" = ANY(${matchIdsToDelete});`;
    await sql`DELETE FROM "propertyMatches" WHERE id = ANY(${matchIdsToDelete});`;
    console.log(`✅ Eliminados ${matchIdsToDelete.length} matches incompatibles en precio de Supabase.`);
  } else {
    console.log("✅ No se encontraron matches con precio excedido.");
  }

  // 4. Estadísticas finales
  const finalMatches = await sql`SELECT count(*) as total FROM "propertyMatches";`;
  console.log(`\n==========================================================================`);
  console.log(`🎯 Matches Verificados Restantes en DB: ${finalMatches[0].total}`);
  console.log(`==========================================================================\n`);

  await sql.end();
  process.exit(0);
}

fixProperty660AndPriceRules().catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});
