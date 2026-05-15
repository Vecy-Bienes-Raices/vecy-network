import "dotenv/config";
import { processWhatsAppMessage } from "../server/_core/janIA";
import { whatsappBot } from "../server/_core/whatsapp";

async function forceMariaResponse() {
  const mariaText = `BUSCO APARTAMENTO ARRIENDO
2 cuartos y un estudio (cerrado) 
o 3 cuartos 
La zona donde estamos buscando es Santa Bibiana , Santa Paula, San Patricio , Chico Navarra 
presupuesto es de 5 millones`;

  console.log("🤖 JanIA analizando el requerimiento de María García Inmo...");
  
  const result = await processWhatsAppMessage(mariaText, "maria_garcia_inmo", "María García Inmo");
  
  console.log("\n--- RESPUESTA GENERADA ---");
  console.log(result.response);
  console.log("\n--------------------------");
  
  // Como no podemos acceder al proceso del bot en ejecución fácilmente para enviarlo, 
  // le pedimos a Eduardo que escriba "JanIA busca matches" ya que ahora el cerebro está reparado.
}

forceMariaResponse().catch(console.error);
