import "dotenv/config";
import { ENV } from "../server/_core/env";

async function testTTS() {
  console.log("Testing TTS endpoint via Forge API...");
  
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    console.error("Forge credentials missing.");
    process.exit(1);
  }

  const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
  const ttsUrl = new URL("v1/audio/speech", baseUrl).toString();

  console.log(`Endpoint: ${ttsUrl}`);

  try {
    const response = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ENV.forgeApiKey}`
      },
      body: JSON.stringify({
        model: "tts-1",
        input: "Hola colega, soy JanIA de VECY Network. Esto es una prueba de voz.",
        voice: "nova" // alloy, echo, fable, onyx, nova, shimmer
      })
    });

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      console.log(`✅ Success! Received audio buffer of size: ${buffer.byteLength} bytes.`);
      console.log(`Content-Type: ${response.headers.get("content-type")}`);
    } else {
      const errorText = await response.text();
      console.error(`❌ Request failed: ${response.status} ${response.statusText}`, errorText);
    }
  } catch (err: any) {
    console.error("❌ Exception during request:", err.message || err);
  }
}

testTTS();
