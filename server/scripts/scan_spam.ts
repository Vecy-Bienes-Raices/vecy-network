import dotenv from "dotenv";
dotenv.config();
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function deepScanSpamAndAdvertising() {
  const db = await getDb();
  if (!db) return;

  console.log("🔍 Escaneando propaganda, capacitaciones, charlas, zoom, empleo y comentarios en Supabase...");

  // 1. En Properties
  const propSpam = await db.execute(sql`
    SELECT id, name, "propertyType", "transactionType", price, rent_price, "areaTotal", "idUsuarioWhatsapp", "rawText"
    FROM properties
    WHERE "rawText" ILIKE '%zoom%'
       OR "rawText" ILIKE '%meet%'
       OR "rawText" ILIKE '%webinar%'
       OR "rawText" ILIKE '%seminario%'
       OR "rawText" ILIKE '%diplomado%'
       OR "rawText" ILIKE '%capacitacion%'
       OR "rawText" ILIKE '%capacitación%'
       OR "rawText" ILIKE '%taller%'
       OR "rawText" ILIKE '%conferencia%'
       OR "rawText" ILIKE '%curso%'
       OR "rawText" ILIKE '%certificacion%'
       OR "rawText" ILIKE '%certificación%'
       OR "rawText" ILIKE '%charla%'
       OR "rawText" ILIKE '%empleo%'
       OR "rawText" ILIKE '%vacante%'
       OR "rawText" ILIKE '%hoja de vida%'
       OR "rawText" ILIKE '%trabaja con nosotros%'
       OR "rawText" ILIKE '%buscamos asesor%'
       OR "rawText" ILIKE '%buscamos comercial%'
       OR "rawText" ILIKE '%unete al grupo%'
       OR "rawText" ILIKE '%únete al grupo%'
       OR "rawText" ILIKE '%chat.whatsapp.com%'
       OR "rawText" ILIKE '%bajo de precio%'
       OR "rawText" ILIKE '%bajó de precio%'
       OR "rawText" ILIKE '%ya se vendio%'
       OR "rawText" ILIKE '%ya se vendió%'
       OR "rawText" ILIKE '%noticia%'
       OR "rawText" ILIKE '%presidente%'
       OR "rawText" ILIKE '%undefined%'
       OR (LENGTH(COALESCE("rawText", '')) < 25 AND (price IS NULL OR price = 0) AND (rent_price IS NULL OR rent_price = 0))
    ORDER BY id DESC;
  `);

  console.log(`\n=== PROPIEDADES SOSPECHOSAS / PROPAGANDA ENCONTRADAS: ${propSpam.length} ===`);
  propSpam.forEach((p: any) => {
    console.log(`[PROP #${p.id}] "${p.name}" | Precio: ${p.price} | Canon: ${p.rent_price} | Texto: "${(p.rawText || '').replace(/\n/g, ' ')}"`);
  });

  // 2. En Requirements
  const reqSpam = await db.execute(sql`
    SELECT id, name, "tipoInmuebleDeseado", "tipoNegocioDeseado", "presupuestoMax", "areaMin", "idUsuarioWhatsapp", "rawText"
    FROM requirements
    WHERE "rawText" ILIKE '%zoom%'
       OR "rawText" ILIKE '%meet%'
       OR "rawText" ILIKE '%webinar%'
       OR "rawText" ILIKE '%seminario%'
       OR "rawText" ILIKE '%diplomado%'
       OR "rawText" ILIKE '%capacitacion%'
       OR "rawText" ILIKE '%capacitación%'
       OR "rawText" ILIKE '%taller%'
       OR "rawText" ILIKE '%conferencia%'
       OR "rawText" ILIKE '%curso%'
       OR "rawText" ILIKE '%certificacion%'
       OR "rawText" ILIKE '%certificación%'
       OR "rawText" ILIKE '%charla%'
       OR "rawText" ILIKE '%empleo%'
       OR "rawText" ILIKE '%vacante%'
       OR "rawText" ILIKE '%hoja de vida%'
       OR "rawText" ILIKE '%trabaja con nosotros%'
       OR "rawText" ILIKE '%buscamos asesor%'
       OR "rawText" ILIKE '%buscamos comercial%'
       OR "rawText" ILIKE '%unete al grupo%'
       OR "rawText" ILIKE '%únete al grupo%'
       OR "rawText" ILIKE '%chat.whatsapp.com%'
       OR "rawText" ILIKE '%bajo de precio%'
       OR "rawText" ILIKE '%bajó de precio%'
       OR "rawText" ILIKE '%ya se vendio%'
       OR "rawText" ILIKE '%ya se vendió%'
       OR "rawText" ILIKE '%noticia%'
       OR "rawText" ILIKE '%presidente%'
       OR "rawText" ILIKE '%undefined%'
       OR (LENGTH(COALESCE("rawText", '')) < 25 AND ("presupuestoMax" IS NULL OR "presupuestoMax" = 0))
    ORDER BY id DESC;
  `);

  console.log(`\n=== REQUERIMIENTOS SOSPECHOSOS / PROPAGANDA ENCONTRADOS: ${reqSpam.length} ===`);
  reqSpam.forEach((r: any) => {
    console.log(`[REQ #${r.id}] "${r.name}" | Presupuesto: ${r.presupuestoMax} | Texto: "${(r.rawText || '').replace(/\n/g, ' ')}"`);
  });
}

deepScanSpamAndAdvertising();
