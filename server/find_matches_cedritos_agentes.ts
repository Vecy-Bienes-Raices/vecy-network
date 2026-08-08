import "dotenv/config";
import postgres from "postgres";

async function run() {
  const sql = postgres(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "");

  const matches = await sql`
    SELECT pm.id, pm."matchScore",
           p.id as prop_id, p.name as prop_name, p."idUsuarioWhatsapp" as prop_phone, p.nombre_usuario_whatsapp as prop_user, p.origen_nombre as prop_origin,
           r.id as req_id, r.name as req_name, r."idUsuarioWhatsapp" as req_phone, r.nombre_usuario_whatsapp as req_user, r.origen_nombre as req_origin
    FROM "propertyMatches" pm
    JOIN properties p ON pm."propertyId" = p.id
    JOIN requirements r ON pm."requirementId" = r.id
    WHERE r.origen_nombre ILIKE '%Cedritos%' OR p.origen_nombre ILIKE '%Cedritos%'
       OR r.origen_nombre ILIKE '%Agentes%' OR p.origen_nombre ILIKE '%Agentes%'
    LIMIT 10
  `;

  const prop = await sql`SELECT id, name, "idUsuarioWhatsapp", nombre_usuario_whatsapp, origen_nombre, "rawText" FROM properties WHERE id = 461`;
  const req = await sql`SELECT id, name, "idUsuarioWhatsapp", nombre_usuario_whatsapp, origen_nombre, "rawText" FROM requirements WHERE id = 351`;

  console.log("PROPIEDAD 461:", prop);
  console.log("REQUERIMIENTO 351 (Cedritos-Colina-Salitre-Alrededores):", req);
}

run();
