import "dotenv/config";
import postgres from "postgres";

async function run() {
  const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/vecy";
  const sql = postgres(connectionString);

  console.log("🔍 Buscando registros de Nancy y Marcela Forero...");

  const props = await sql`
    SELECT id, name, "idUsuarioWhatsapp", nombre_usuario_whatsapp, origen_nombre, "rawText"
    FROM properties
    WHERE nombre_usuario_whatsapp ILIKE '%Nancy%' OR nombre_usuario_whatsapp ILIKE '%Marcela%'
       OR origen_nombre ILIKE '%Cedritos%' OR origen_nombre ILIKE '%Agentes%'
    LIMIT 10
  `;

  const reqs = await sql`
    SELECT id, name, "idUsuarioWhatsapp", nombre_usuario_whatsapp, origen_nombre, "rawText"
    FROM requirements
    WHERE nombre_usuario_whatsapp ILIKE '%Nancy%' OR nombre_usuario_whatsapp ILIKE '%Marcela%'
       OR origen_nombre ILIKE '%Cedritos%' OR origen_nombre ILIKE '%Agentes%'
    LIMIT 10
  `;

  console.log("PROPIEDADES ENCONTRADAS:", props);
  console.log("REQUERIMIENTOS ENCONTRADOS:", reqs);

  // Buscar coincidencia activa de alguna de estas propiedades o requerimientos
  const match = await sql`
    SELECT pm.id, pm."matchScore", p.name as prop_name, p.nombre_usuario_whatsapp as prop_user, p.origen_nombre as prop_origin,
           r.name as req_name, r.nombre_usuario_whatsapp as req_user, r.origen_nombre as req_origin
    FROM "propertyMatches" pm
    JOIN properties p ON pm."propertyId" = p.id
    JOIN requirements r ON pm."requirementId" = r.id
    WHERE p.nombre_usuario_whatsapp ILIKE '%Nancy%' OR p.nombre_usuario_whatsapp ILIKE '%Marcela%'
       OR r.nombre_usuario_whatsapp ILIKE '%Nancy%' OR r.nombre_usuario_whatsapp ILIKE '%Marcela%'
       OR p.origen_nombre ILIKE '%Cedritos%' OR r.origen_nombre ILIKE '%Cedritos%'
       OR p.origen_nombre ILIKE '%Agentes%' OR r.origen_nombre ILIKE '%Agentes%'
    LIMIT 5
  `;

  console.log("MATCHES RELACIONADOS:", match);
  await sql.end();
}

run();
