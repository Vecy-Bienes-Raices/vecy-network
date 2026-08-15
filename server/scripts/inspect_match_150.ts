import 'dotenv/config';
import postgres from 'postgres';

async function inspectMatch150() {
  const sql = postgres(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || '', { prepare: false });

  const props = await sql`SELECT * FROM properties WHERE id = 150`;
  console.log("=== PROPIEDAD #150 ===");
  console.log({
    id: props[0].id,
    name: props[0].name,
    zone: props[0].zone,
    address_neighborhood: props[0].address_neighborhood,
    rawText: props[0].rawText
  });

  const reqs = await sql`SELECT * FROM requirements WHERE name ILIKE '%Rosales/Cabrera%' OR "rawText" ILIKE '%Rosales%'`;
  console.log("\n=== REQUERIMIENTO ROSALES/CABRERA ===");
  for (const r of reqs) {
    console.log({
      id: r.id,
      name: r.name,
      zone: r.zone,
      address_neighborhood: r.address_neighborhood,
      rawText: r.rawText
    });
  }

  // Intersect with propertyMatches table
  const matches = await sql`SELECT * FROM "propertyMatches" WHERE "propertyId" = 150`;
  console.log("\n=== MATCHES ACTUALES EN DB PARA PROPIEDAD #150 ===");
  for (const m of matches) {
    console.log(`Match ID #${m.id} -> Requirement #${m.requirementId} | Score: ${m.matchScore}% | Reason: ${m.matchReason}`);
  }

  await sql.end();
  process.exit(0);
}

inspectMatch150().catch(console.error);
