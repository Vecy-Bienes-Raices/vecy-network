import "dotenv/config";
import postgres from "postgres";

async function run() {
  const sql = postgres(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "");

  console.log("🔍 Verificando estado exacto de \"propertyMatches\" en Supabase...");

  const total = await sql`SELECT COUNT(*) FROM "propertyMatches"`;
  const recent = await sql`SELECT id, "propertyId", "requirementId", "matchScore", "createdAt" FROM "propertyMatches" ORDER BY "createdAt" DESC LIMIT 10`;

  const countsByDate = await sql`
    SELECT DATE("createdAt") as date, COUNT(*) as count 
    FROM "propertyMatches" 
    GROUP BY DATE("createdAt") 
    ORDER BY date DESC
  `;

  console.log("\nTOTAL MATCHES EN BD:", total[0].count);
  console.log("\nDISTRIBUCIÓN DE MATCHES POR FECHA:");
  console.table(countsByDate);

  console.log("\nÚLTIMOS 10 MATCHES REGISTRADOS:");
  console.table(recent);

  await sql.end();
}

run();
