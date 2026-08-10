import "dotenv/config";
import postgres from "postgres";

async function run() {
  const sql = postgres(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "");

  const reqRows = await sql`
    SELECT id, "zonaDeseada", "ciudadDeseada", "createdAt", "presupuestoMax"
    FROM requirements 
    WHERE "id" = 371
  `;

  if (reqRows.length > 0) {
    const req = reqRows[0];
    console.log(`REQUERIMIENTO #371: CreatedAt: ${req.createdAt.toISOString()}`);

    const matchRows = await sql`
      SELECT id, "propertyId", "requirementId", "matchScore", "createdAt" 
      FROM "propertyMatches" 
      WHERE "requirementId" = ${req.id} 
      ORDER BY id DESC LIMIT 1
    `;

    if (matchRows.length > 0) {
      const match = matchRows[0];
      const diffMs = new Date(match.createdAt).getTime() - new Date(req.createdAt).getTime();
      console.log(`MATCH # ${match.id} (Propiedad #${match.propertyId}): CreatedAt: ${match.createdAt.toISOString()} | Score: ${match.matchScore}%`);
      console.log(`Diferencia de tiempo (Event Trigger): ${diffMs} ms (${(diffMs / 1000).toFixed(3)} segundos) ⚡`);
    }
  }

  await sql.end();
}

run();
