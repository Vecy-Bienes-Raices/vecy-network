import 'dotenv/config';
import { processWhatsAppMessage } from "../server/_core/janIA";

async function testStatsFlow() {
  console.log("🚀 Iniciando prueba del flujo de estadísticas e inyección de datos en DMs...");
  
  const userId = '573118588254@c.us'; // Un número de prueba
  const userName = 'Eduardo Rivera';
  const textQuery = 'Hola JanIA, cuéntame cómo te fue en el día de hoy y cuántos MATCH lograste detectar o sacar en la red.';

  try {
    // 1. Probamos con isGroup = false (un chat privado / DM)
    console.log(`\n--- 1. Probando en DM (isGroup = false) ---`);
    const resultDM = await processWhatsAppMessage(
      textQuery,
      userId,
      userName,
      false, // hasMedia
      [],    // scrapedData
      undefined, // audioUrl
      undefined, // imageBuffer
      false  // isGroup = false (DM)
    );

    console.log("Classification:", resultDM.classification);
    console.log("Should Send DM:", resultDM.shouldSendDM);
    console.log("DM Response:");
    console.log("-----------------------------------------");
    console.log(resultDM.dmResponse || resultDM.response);
    console.log("-----------------------------------------");

    // 2. Probamos con isGroup = true (en el grupo principal, para verificar que la redirección SIGUE funcionando en grupos)
    console.log(`\n--- 2. Probando en Grupo (isGroup = true) ---`);
    const resultGroup = await processWhatsAppMessage(
      textQuery,
      userId,
      userName,
      false, // hasMedia
      [],    // scrapedData
      undefined, // audioUrl
      undefined, // imageBuffer
      true   // isGroup = true (Grupo)
    );

    console.log("Classification:", resultGroup.classification);
    console.log("Group Response (Debe ser la plantilla de redirección al Buzón):");
    console.log("-----------------------------------------");
    console.log(resultGroup.response);
    console.log("-----------------------------------------");

  } catch (err: any) {
    console.error("❌ Falló el test de estadísticas/DM:", err.message || err);
  } finally {
    process.exit(0);
  }
}

testStatsFlow();
