import "dotenv/config";

async function listGeminiModels() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("❌ No se encontró GEMINI_API_KEY en las variables de entorno.");
    return;
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    console.log("=== MODELOS DISPONIBLES EN TU CUENTA DE GOOGLE GEMINI API ===");
    if (data.models) {
      for (const m of data.models) {
        console.log(`• ${m.name.replace('models/', '')} | Soporta: ${m.supportedGenerationMethods?.join(', ')}`);
      }
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err: any) {
    console.error("Error al listar modelos:", err.message);
  }
}

listGeminiModels();
