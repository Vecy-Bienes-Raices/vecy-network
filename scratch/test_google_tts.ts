async function testGoogleTTS() {
  console.log("Testing Google Translate TTS...");
  const text = "Hola colega, soy JanIA de VECY Network. Esta es una prueba del sintetizador de voz de Google.";
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=es&client=tw-ob`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      console.log(`✅ Success! Google TTS returned ${buffer.byteLength} bytes.`);
      console.log(`Content-Type: ${response.headers.get("content-type")}`);
    } else {
      console.error(`❌ Google TTS failed: ${response.status} ${response.statusText}`);
    }
  } catch (err: any) {
    console.error("❌ Exception:", err.message || err);
  }
}

testGoogleTTS();
