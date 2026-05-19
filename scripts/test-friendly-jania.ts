import { processWhatsAppMessage } from "../server/_core/janIA";

async function testFriendlyMatch() {
  console.log("🧪 Simulando requerimiento para ver el nuevo tono de TUTEO y reporte de MATCHES...");
  
  // Texto de búsqueda que sabemos tiene matches en la base de datos (Cedritos)
  const searchPost = `Hola JanIA, busco para un cliente muy especial:
Apartamento en Cedritos o Mazurén
Presupuesto: 500 Millones
3 habitaciones, 2 baños.
Que tenga buena luz. Gracias!`;

  try {
    const result = await processWhatsAppMessage(
      searchPost, 
      "usuario_prueba_id", 
      "Eduardo"
    );

    console.log("\n--- RESPUESTA DE JANIA (NUEVO TONO Y DETALLES) ---");
    console.log(result.response);
    
    console.log("\n--- NOTIFICACIÓN TÉCNICA ---");
    if (result.mentions && result.mentions.length > 0) {
      console.log("JanIA está notificando a los captadores:", result.mentions);
    }

  } catch (error) {
    console.error("❌ Error en la prueba:", error);
  } finally {
    process.exit(0);
  }
}

testFriendlyMatch();
