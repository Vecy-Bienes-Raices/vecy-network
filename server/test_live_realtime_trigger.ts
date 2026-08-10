import "dotenv/config";
import { processWhatsAppMessage } from "./_core/janIA";
import postgres from "postgres";

async function run() {
  const sql = postgres(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "");

  console.log("⚡ Ejecutando prueba de Disparador en Tiempo Real (Event Trigger Test)...");

  // Requerimiento de prueba con teléfono único y presupuesto de 900 millones ($900.000.000)
  const testMessage = "🔎 BUSCO PARA COMPRA INMEDIATA APARTAMENTO EN CEDRITOS O NUEVA AUTOPISTA. Mínimo 100 m2, 3 habitaciones, 2 baños, 2 parqueaderos. Presupuesto máximo $900.000.000.";
  const testPhone = "573009990099";
  const testName = "Prueba Auditoría Realtime VECY 100%";

  const startTime = Date.now();
  console.log(`\n1. Enviando mensaje de prueba a janIA a las ${new Date(startTime).toISOString()}...`);

  const result = await processWhatsAppMessage(
    testMessage,
    testPhone,
    testName,
    false,
    [],
    undefined,
    undefined,
    true,
    undefined,
    undefined,
    "120363260108880069@g.us",
    "Grupo Prueba Realtime"
  );

  const endTime = Date.now();
  console.log(`\n2. Procesamiento completado en ${endTime - startTime} ms.`);

  // Consultar el requerimiento creado
  const reqRows = await sql`
    SELECT id, "zonaDeseada", "ciudadDeseada", "createdAt", "presupuestoMax"
    FROM requirements 
    WHERE "idUsuarioWhatsapp" = ${testPhone} 
    ORDER BY id DESC LIMIT 1
  `;

  if (reqRows.length === 0) {
    console.error("❌ No se encontró el requerimiento en BD.");
    await sql.end();
    return;
  }

  const req = reqRows[0];
  console.log(`\n✅ REQUERIMIENTO CREADO EN BD: ID #${req.id} | PresupuestoMax: $${req.presupuestoMax} | Timestamp: ${req.createdAt.toISOString()}`);

  // Consultar el match generado por el disparador en tiempo real
  const matchRows = await sql`
    SELECT id, "propertyId", "requirementId", "matchScore", "createdAt" 
    FROM "propertyMatches" 
    WHERE "requirementId" = ${req.id} 
    ORDER BY id DESC LIMIT 1
  `;

  if (matchRows.length === 0) {
    console.log("ℹ️ No se generó match >= 80% para este requerimiento.");
  } else {
    const match = matchRows[0];
    const diffMs = new Date(match.createdAt).getTime() - new Date(req.createdAt).getTime();
    console.log(`\n🎯 MATCH GENERADO Y DISPARADO EN TIEMPO REAL:`);
    console.log(`- Match ID:                #${match.id}`);
    console.log(`- Property ID:             #${match.propertyId}`);
    console.log(`- Requirement ID:          #${match.requirementId}`);
    console.log(`- Score:                   ${match.matchScore}%`);
    console.log(`- Requerimiento CreatedAt: ${req.createdAt.toISOString()}`);
    console.log(`- Match CreatedAt:         ${match.createdAt.toISOString()}`);
    console.log(`- Diferencia de tiempo:    ${diffMs} ms (${(diffMs / 1000).toFixed(3)} segundos) ⚡`);
  }

  await sql.end();
}

run();
