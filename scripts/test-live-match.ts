import { processWhatsAppMessage } from "../server/_core/janIA";

async function testMatchFlow() {
  console.log("🧪 Simulando publicación de inmueble para activar MATCH con María García Inmo...");
  
  // Texto que encaja con el requerimiento de María (Apto, Arriendo, Zona Norte)
  const propertyText = `VENDO / ARRIENDO: Apartamento moderno
📍 Zona: Calle 100 con 15 (Cerca a la 127)
💰 Precio: 3.800.000
📐 Área: 65 m2 | 🛏️ Hab: 1 | 🛁 Baños: 1
📝 Descripción: Espectacular vista, acabados de lujo.
Contacto: Pedro Agente 3201234567`;

  try {
    const result = await processWhatsAppMessage(
      propertyText, 
      "pedro_agente_id", 
      "Pedro Agente"
    );

    console.log("\n--- RESPUESTA DE JANIA (CORREGIDA) ---");
    console.log(result.response);
    
    console.log("\n--- MENCIONES (NOTIFICACIONES) ---");
    if (result.mentions && result.mentions.length > 0) {
      console.log("JanIA está notificando a:", result.mentions);
    } else {
      console.log("No se generaron menciones.");
    }

  } catch (error) {
    console.error("❌ Error en la prueba:", error);
  } finally {
    process.exit(0);
  }
}

testMatchFlow();
