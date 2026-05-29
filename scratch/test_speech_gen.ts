import "dotenv/config";
import { ENV } from "../server/_core/env";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function textToSpeechMediaTest(text: string): Promise<Buffer | null> {
  const cleanText = text.replace(/[*#_`~]/g, "");
  
  // Pruebas directas con Google TTS (200 caracteres de límite)
  try {
    const maxLen = 200;
    if (cleanText.length <= maxLen) {
      console.log("Segmento corto detectado, descargando de una vez...");
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=es&client=tw-ob`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      if (response.ok) {
        return Buffer.from(await response.arrayBuffer());
      }
    } else {
      console.log(`Mensaje largo (${cleanText.length} caracteres). Partiendo en bloques de 200 caracteres...`);
      const words = cleanText.split(/\s+/);
      const chunks: string[] = [];
      let currentChunk = "";
      for (const word of words) {
        if ((currentChunk + " " + word).length > maxLen) {
          if (currentChunk.trim()) chunks.push(currentChunk.trim());
          currentChunk = word;
        } else {
          currentChunk += (currentChunk ? " " : "") + word;
        }
      }
      if (currentChunk.trim()) chunks.push(currentChunk.trim());

      console.log(`Total de fragmentos a sintetizar: ${chunks.length}`);
      const buffers: Buffer[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`Sintetizando fragmento #${i + 1}: "${chunk.substring(0, 30)}..."`);
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=es&client=tw-ob`;
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
        if (response.ok) {
          buffers.push(Buffer.from(await response.arrayBuffer()));
        } else {
          console.error(`Fallo al descargar fragmento #${i + 1}`);
        }
        await delay(250);
      }
      if (buffers.length > 0) {
        return Buffer.concat(buffers);
      }
    }
  } catch (err: any) {
    console.error("Error en test de TTS:", err.message || err);
  }
  return null;
}

async function run() {
  const longText = "¡Hola, aliado! Hoy ha sido un excelente día. El ecosistema ha procesado un total de 120 propiedades en el transcurso de las últimas horas, con 30 nuevas captaciones activadas hoy, y hemos gestionado 40 requerimientos en todo Colombia. De igual manera, nuestro motor de matching inteligente ha detectado 8 coincidencias comerciales listas para ser conectadas. ¡Sigamos cerrando negocios!";
  
  const resultBuffer = await textToSpeechMediaTest(longText);
  if (resultBuffer) {
    console.log(`✅ ¡Éxito total! Se generó y concatenó el audio con éxito. Tamaño final: ${resultBuffer.length} bytes.`);
  } else {
    console.error("❌ Falló la generación de audio concatenado.");
  }
}

run();
