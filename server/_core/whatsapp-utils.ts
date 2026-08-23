import path from "path";
import fs from "fs";
import { createSign } from "crypto";

// ── Lista de nombres colombianos comunes para extractFirstName ──
const COMMON_FIRST_NAMES = new Set([
  "juan", "maria", "maría", "carlos", "ana", "luis", "jorge", "pedro",
  "jose", "josé", "andres", "andrés", "camilo", "diana", "laura", "paula",
  "andrea", "claudia", "martha", "marta", "sandra", "monica", "mónica", "patricia",
  "gloria", "esperanza", "blanca", "luz", "mercedes", "rosalba", "carmen", "rosa",
  "diego", "felipe", "santiago", "alejandro", "nicolas", "nicolás", "david", "daniel",
  "sergio", "mario", "fernando", "alberto", "roberto", "eduardo", "ricardo", "hugo",
  "oscar", "óscar", "edgar", "edgardo", "wilson", "jhon", "john", "fredy", "freddy",
  "alexander", "vladimir", "alvaro", "álvaro", "harold", "henry", "walter", "william",
  "edison", "yeison", "jeison", "brayan", "bryan", "kevin", "steven", "esteban",
  "stiven", "edwin", "eddu", "edward", "edgar", "angie", "karen", "jessica", "yessica",
  "katherine", "catherine", "vanessa", "stefania", "estefania", "estefanía", "daniela",
  "valentina", "sofia", "sofía", "isabella", "gabriela", "mariana", "catalina", "nicolle",
  "nicole", "juliana", "alejandra", "lisa", "carolina", "natalia", "nathalia", "veronica",
  "verónica", "adriana", "liliana", "viviana", "pilar", "rocio", "rocío", "soraya",
  "johanna", "yudy", "judy", "tatiana", "mateo", "sebastian", "sebastián", "cristian",
  "gustavo", "hernando", "humberto", "jaime", "mauricio", "cesar", "césar", "nelson",
  "ruben", "rubén", "ivan", "iván", "olga", "stella", "estela"
]);

// Mapas y conjuntos para el Motor Inteligente de Nombres y Apodos Colombianos
const NICKNAMES_MAP: Record<string, string> = {
  "cristina": "Kristy",
  "cristi": "Kristy",
  "kristina": "Kristy",
  "catalina": "Kata",
  "catalyna": "Kata",
  "guillermo": "Memo",
  "maria fernanda": "Mafe",
  "maría fernanda": "Mafe",
  "maria paula": "Mapau",
  "maría paula": "Mapau",
  "maria jose": "Majo",
  "maría josé": "Majo",
  "juan esteban": "Juanes",
  "alejandro": "Alejo",
  "francisco": "Pacho",
  "eduardo": "Eddu",
  "isabela": "Isa",
  "isabella": "Isa",
  "victoria": "Vicky",
  "beatriz": "Betty",
  "carolina": "Caro",
  "gabriela": "Gaby",
  "santiago": "Santi",
  "sebastian": "Seba",
  "sebastián": "Seba",
  "felipe": "Pipe",
  "ignacio": "Nacho",
  "jose manuel": "Josema",
  "josé manuel": "Josema"
};

const SONOROUS_COMPOUND_BLOCKS = new Set([
  // Femeninos Clásicos
  "maria jose", "maría josé",
  "maria camila", "maría camila",
  "dulce maria", "dulce maría",
  "ana sofia", "ana sofía",
  "juana valentina",
  "maria alejandra", "maría alejandra",
  "sara sofia", "sara sofía",
  "laura camila",
  "maria paula", "maría paula",
  "luisa fernanda",
  "ana maria", "ana maría",
  "maria angel", "maría ángel", "maría angel",
  // Femeninos Modernos
  "maria antonella", "maría antonella",
  "elena sofia", "elena sofía",
  "emily valentina",
  "mia isabella", "mía isabella",
  "antonella sofia", "antonella sofía",
  // Masculinos Clásicos
  "juan jose", "juan josé",
  "juan david",
  "juan pablo",
  "carlos andres", "carlos andrés",
  "jose luis", "josé luis",
  "luis fernando",
  "miguel angel", "miguel ángel",
  "juan esteban",
  "andres felipe", "andrés felipe",
  "jorge eliecer", "jorge eliécer",
  "juan manuel",
  "julio cesar", "julio césar",
  // Masculinos Modernos
  "thiago andres", "thiago andrés",
  "ian gael",
  "maximiliano david",
  "dylan santiago",
  "samuel david"
]);

const NON_SONOROUS_FILLERS = new Set([
  "milena", "patricia", "elena", "marcela", "andrea", "alberto", "alfonso",
  "ivan", "iván", "adolfo", "antonio", "humberto", "enrique", "arturo", "armando",
  "bernardo", "marina"
]);

const CONNECTORS = new Set(["de", "del", "la", "las", "los", "el", "van", "von", "y", "di"]);

/**
 * Motor de Inteligencia PLN para Nombres y Apodos Colombianos.
 * Clasifica entre apodos del argot popular, nombres compuestos sonoros y truncamiento de rellenos no sonoros.
 */
export function extractFirstName(fullName: string): string {
  if (!fullName) return "";
  let clean = fullName.trim();
  if (!clean) return "";

  // Si es un número telefónico o contiene indicativos numéricos sin letras, retornar vacío
  if (/^\+?[\d\s-]{6,}$/.test(clean) || /^[\d\s\+\-\(\)]+$/.test(clean)) return "";

  // Evasión y limpieza de emails
  if (clean.includes("@")) {
    clean = clean.split("@")[0];
  }

  // Quitar números aislados
  clean = clean.replace(/[0-9]/g, "");
  if (!clean.trim()) return "";

  const words = clean.split(/\s+/).map(w => w.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, "")).filter(w => w.length > 0);
  if (words.length === 0) return "";

  // Filtrar conectores iniciales (ej. "De la Rosa")
  let nameWords = words;
  while (nameWords.length > 0 && CONNECTORS.has(nameWords[0].toLowerCase())) {
    nameWords.shift();
  }
  if (nameWords.length === 0) return "";

  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

  // Caso 1: Verificar combinación de 2 palabras contra Apodos o Bloques Sonoros
  if (nameWords.length >= 2) {
    const twoWordKey = `${nameWords[0].toLowerCase()} ${nameWords[1].toLowerCase()}`;

    // Ver si la combinación completa de 2 palabras tiene apodo (ej. "Juan Esteban" -> "Juanes", "María Fernanda" -> "Mafe")
    if (NICKNAMES_MAP[twoWordKey]) {
      return NICKNAMES_MAP[twoWordKey];
    }

    // Ver si es un bloque compuesto sonoro oficial (ej. "Juan Pablo", "Ana María", "María Camila")
    if (SONOROUS_COMPOUND_BLOCKS.has(twoWordKey)) {
      return `${cap(nameWords[0])} ${cap(nameWords[1])}`;
    }

    // Ver si el segundo nombre es un relleno NO sonoro (ej. "Luz Marina" -> "Luz", "Claudia Patricia" -> "Claudia")
    const secondWordLower = nameWords[1].toLowerCase();
    if (NON_SONOROUS_FILLERS.has(secondWordLower)) {
      const firstWordLower = nameWords[0].toLowerCase();
      if (NICKNAMES_MAP[firstWordLower]) {
        return NICKNAMES_MAP[firstWordLower];
      }
      return cap(nameWords[0]);
    }
  }

  // Caso 2: Verificar palabra única (o primera palabra limpia) contra mapa de apodos
  const firstWordLower = nameWords[0].toLowerCase();
  if (NICKNAMES_MAP[firstWordLower]) {
    return NICKNAMES_MAP[firstWordLower];
  }

  return cap(nameWords[0]);
}

/**
 * Devuelve un saludo contextual según la hora del día en Colombia (UTC-5 Bogotá).
 * Horario Oficial Bogotá:
 * - Buenos días: 01:00 AM - 11:59 AM (1 a 11)
 * - Buenas tardes: 12:00 PM - 06:59 PM (12 a 18)
 * - Buenas noches: 07:00 PM - 12:59 AM (19 a 0)
 */
export function getGreetingByTime(date?: Date): string {
  const bogotaTimeStr = (date || new Date()).toLocaleString("en-US", { timeZone: "America/Bogota" });
  const hour = new Date(bogotaTimeStr).getHours();

  if (hour >= 1 && hour < 12) {
    return "Buenos días";
  }
  if (hour >= 12 && hour < 19) {
    return "Buenas tardes";
  }
  return "Buenas noches";
}

/**
 * Detecta si el texto del usuario solicita explícitamente una respuesta por voz u audio.
 */
export function detectaVoz(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return (
    t.includes("nota de voz") ||
    t.includes("mensaje de voz") ||
    t.includes("envíame un audio") ||
    t.includes("enviame un audio") ||
    t.includes("respóndeme por audio") ||
    t.includes("respondeme por audio") ||
    t.includes("mándame un audio") ||
    t.includes("mandame un audio") ||
    t.includes("por audio") ||
    t.includes("en audio") ||
    t.includes("con voz")
  );
}

/**
 * Limpia el texto generado dinámicamente por la IA para audios,
 * eliminando preámbulos, explicaciones y envolturas como llaves {{...}} o corchetes [...].
 */
export function cleanVoiceText(text: string): string {
  if (!text) return "";

  let cleaned = text.trim();

  // 1. Quitar llaves dobles o simples que a veces envuelve el LLM (como {{...}} o [...])
  cleaned = cleaned.replace(/^\{\{[\s\S]*?\}\}/g, "").trim();
  cleaned = cleaned.replace(/^\[[\s\S]*?\]/g, "").trim();
  cleaned = cleaned.replace(/^\{\s*|\s*\}$/g, "").trim();
  cleaned = cleaned.replace(/^"|"$/g, "").trim(); // Quitar comillas externas

  // 2. Eliminar preámbulos típicos en español del LLM
  const preambulos = [
    /^(aquí\s+tienes|aqui\s+tienes|aquí\s+está|aqui\s+esta|aquí\s+te\s+presento|esta\s+es|este\s+es)\s+(la\s+propuesta|el\s+guión|el\s+guion|la\s+nota\s+de\s+voz|el\s+mensaje|la\s+redacción|la\s+redaccion|el\s+texto)[^:]*:\s*/i,
    /^claro\s*,\s*(aquí\s+tienes|aquí\s+está|te\s+comparto)[^:]*:\s*/i,
    /^(propuesta\s+de\s+(guión|guion|nota|mensaje|audio|texto)[^:]*):\s*/i,
    /^(guión\s+de\s+voz|guion\s+de\s+voz|nota\s+de\s+voz|mensaje\s+de\s+voz|guión\s+de\s+audio|guion\s+de\s+audio|guión|guion)\s*:\s*/i,
  ];

  for (const regex of preambulos) {
    cleaned = cleaned.replace(regex, "");
  }

  cleaned = cleaned.replace(/^:\s*/, "").trim();
  cleaned = cleaned.replace(/^"|"$/g, "").trim();

  // 3. Normalización Fonética para Síntesis de Voz (Español Colombiano Natural)
  // Garantiza que "Vecy" suene "Vesi" (como vecino) y no "Vici" en inglés
  cleaned = cleaned
    .replace(/\bVecy\b/gi, "Vesi")
    .replace(/\bVECY\b/g, "Vesi")
    .replace(/\bJanIA\b/gi, "Yanía")
    .replace(/\bJanIa\b/gi, "Yanía")
    .replace(/\bjania\b/gi, "Yanía")
    .replace(/\bm²\b/gi, "metros cuadrados")
    .replace(/\bm2\b/gi, "metros cuadrados")
    .replace(/\bUVT\b/gi, "U-V-T")
    .replace(/\bDIAN\b/gi, "Dian")
    .replace(/\bSINUPOT\b/gi, "Sinu-pot")
    .replace(/\bIDU\b/gi, "I-D-U")
    .replace(/\bPOT\b/g, "P-O-T")
    .replace(/\bAdmon\b/gi, "Administración")
    .replace(/\badmon\b/gi, "administración")
    .replace(/\bApto\b/gi, "Apartamento")
    .replace(/\bapto\b/gi, "apartamento")
    .replace(/\bHab\b/gi, "Habitaciones")
    .replace(/\bhab\b/gi, "habitaciones");

  return cleaned.trim();
}

/**
 * Divide un texto en bloques razonables para síntesis de voz en Google Translate TTS.
 */
function splitTextIntoVoiceChunks(text: string, maxLen = 180): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).trim().length <= maxLen) {
      currentChunk = (currentChunk + ' ' + sentence).trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);
      if (sentence.length > maxLen) {
        const words = sentence.split(' ');
        let sub = '';
        for (const w of words) {
          if ((sub + ' ' + w).trim().length <= maxLen) {
            sub = (sub + ' ' + w).trim();
          } else {
            chunks.push(sub);
            sub = w;
          }
        }
        if (sub) currentChunk = sub;
        else currentChunk = '';
      } else {
        currentChunk = sentence.trim();
      }
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

/**
 * Fallback a la API libre de Google Translate TTS para generar audio en MP3.
 */
async function fetchGttsAudioBuffer(text: string): Promise<Buffer | null> {
  try {
    const chunks = splitTextIntoVoiceChunks(text);
    const audioBuffers: Buffer[] = [];
    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=es-CO&client=tw-ob`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        const arr = await res.arrayBuffer();
        audioBuffers.push(Buffer.from(arr));
      }
    }
    if (audioBuffers.length > 0) {
      return Buffer.concat(audioBuffers);
    }
  } catch (err: any) {
    console.error("[TTS-Fallback-GTTS] Error sintetizando audio libre:", err.message || err);
  }
  return null;
}

/**
 * Síntesis de voz neuronal ultra-realista con entonación humana y modulación natural (Salomé - es-CO o Dalia - es-MX).
 */
/**
 * Síntesis de voz neuronal ultra-realista con entonación humana y modulación natural (Salomé - es-CO o Dalia - es-MX).
 */
async function fetchNeuralVoiceBuffer(text: string, voiceName = "es-CO-SalomeNeural", rate = "+6%"): Promise<Buffer | null> {
  try {
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text, { rate, pitch: "+0Hz" });

    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      const timer = setTimeout(() => {
        if (chunks.length > 0) resolve(Buffer.concat(chunks));
        else resolve(null);
      }, 20000);

      audioStream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
      audioStream.on("end", () => {
        clearTimeout(timer);
        resolve(Buffer.concat(chunks));
      });
      audioStream.on("error", (err: any) => {
        clearTimeout(timer);
        console.warn(`[TTS-Neural] Error en stream de voz ${voiceName}:`, err?.message || err);
        if (chunks.length > 0) resolve(Buffer.concat(chunks));
        else resolve(null);
      });
    });
  } catch (err: any) {
    console.warn(`[TTS-Neural] Error al inicializar síntesis neuronal (${voiceName}):`, err?.message || err);
    return null;
  }
}

let cachedVertexToken: { token: string; expiresAt: number } | null = null;

function base64url(str: string): string {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Obtiene o refresca un Access Token OAuth2 para Vertex AI / Google Cloud TTS usando la Cuenta de Servicio.
 */
async function getVertexAIAccessToken(): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedVertexToken && cachedVertexToken.expiresAt > now + 300) {
    return cachedVertexToken.token;
  }

  try {
    const credPath = path.join(process.cwd(), "server", "_core", "google-service-account.json");
    if (!fs.existsSync(credPath)) {
      return null;
    }

    const sa = JSON.parse(fs.readFileSync(credPath, "utf8"));
    if (!sa.client_email || !sa.private_key) {
      return null;
    }

    const header = { alg: "RS256", typ: "JWT" };
    const claim = {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: sa.token_uri || "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    };

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedClaim = base64url(JSON.stringify(claim));
    const signInput = `${encodedHeader}.${encodedClaim}`;

    const signer = createSign("RSA-SHA256");
    signer.update(signInput);
    const signature = signer.sign(sa.private_key, "base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const jwt = `${signInput}.${signature}`;

    const res = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    const tokenData = await res.json();
    if (tokenData.access_token) {
      cachedVertexToken = {
        token: tokenData.access_token,
        expiresAt: now + (tokenData.expires_in || 3600)
      };
      return tokenData.access_token;
    }
  } catch (err: any) {
    console.warn("[TTS-Vertex] Error al generar token OAuth2 de cuenta de servicio:", err?.message || err);
  }

  return null;
}

/**
 * Genera un buffer de audio sintetizado con voz humana ultra-realista, fluida y con cadencia colombiana.
 */
export async function textToSpeechMedia(text: string, format: "OGG_OPUS" | "MP3" = "OGG_OPUS"): Promise<any> {
  const cleaned = cleanVoiceText(text);
  if (!cleaned) return null;

  // 1. Motor Oficial Prioritario: Gemini 3.1 Flash TTS (Preview) — Voz Laomedeia (es-us) con OAuth2 Vertex AI
  try {
    const accessToken = await getVertexAIAccessToken();
    if (accessToken) {
      const response = await fetch("https://texttospeech.googleapis.com/v1beta1/text:synthesize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          input: {
            prompt: "Read aloud in a warm, welcoming tone.",
            text: cleaned
          },
          voice: {
            languageCode: "es-us",
            modelName: "gemini-3.1-flash-tts-preview",
            name: "Laomedeia"
          },
          audioConfig: {
            audioEncoding: format === "OGG_OPUS" ? "OGG_OPUS" : "MP3",
            speakingRate: 1.0,
            pitch: 0.0
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audioContent) {
          console.log(`[TTS-Media] ✓ Gemini 3.1 Flash TTS (Laomedeia) — ${cleaned.length} chars → audio generado.`);
          const buffer = Buffer.from(data.audioContent, "base64");
          return {
            mimetype: format === "OGG_OPUS" ? "audio/ogg; codecs=opus" : "audio/mp3",
            data: buffer.toString("base64"),
            buffer
          };
        }
      } else {
        const errText = await response.text();
        console.warn(`[TTS-Media] Gemini 3.1 Flash TTS error ${response.status}: ${errText.substring(0, 200)}`);
      }
    }
  } catch (err: any) {
    console.warn("[TTS-Media] Gemini 3.1 Flash TTS no disponible:", err?.message || err);
  }

  const candidateKeys = [
    process.env.GOOGLE_TTS_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_BACKUP_KEY
  ].filter(k => k && k.startsWith('AIzaSy')) as string[];

  // 2. Respaldo Google Cloud: Chirp3-HD Erinome (es-US)
  try {
    for (const googleApiKey of candidateKeys) {
      try {
        const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleApiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text: cleaned },
            voice: {
              languageCode: "es-US",
              name: "es-US-Chirp3-HD-Erinome"
            },
            audioConfig: {
              audioEncoding: format === "OGG_OPUS" ? "OGG_OPUS" : "MP3",
              speakingRate: 1.0,
              pitch: 0.0
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.audioContent) {
            console.log(`[TTS-Media] ✓ Google Cloud Chirp3-HD Erinome — ${cleaned.length} chars → audio generado.`);
            const buffer = Buffer.from(data.audioContent, "base64");
            return {
              mimetype: format === "OGG_OPUS" ? "audio/ogg; codecs=opus" : "audio/mp3",
              data: buffer.toString("base64"),
              buffer
            };
          }
        }
      } catch (keyErr: any) {
        // Continuar
      }
    }
  } catch (err: any) {
    console.warn("[TTS-Media] Google Cloud Chirp3-HD Erinome no disponible:", err?.message || err);
  }

  // 2. Motor Oficial Google Cloud Studio HD (es-US-Studio-B) — Voz de Estudio Cristalina, Despierta y Enérgica
  try {
    for (const googleApiKey of candidateKeys) {
      try {
        const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleApiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text: cleaned },
            voice: {
              languageCode: "es-US",
              name: "es-US-Studio-B"
            },
            audioConfig: {
              audioEncoding: format === "OGG_OPUS" ? "OGG_OPUS" : "MP3",
              speakingRate: 1.08,
              pitch: 0.8
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.audioContent) {
            console.log(`[TTS-Media] ✓ Google Cloud Studio-B (Voz Clara y Despierta) — ${cleaned.length} chars → audio generado.`);
            const buffer = Buffer.from(data.audioContent, "base64");
            return {
              mimetype: format === "OGG_OPUS" ? "audio/ogg; codecs=opus" : "audio/mp3",
              data: buffer.toString("base64"),
              buffer
            };
          }
        }
      } catch (keyErr: any) {
        // Continuar
      }
    }
  } catch (err: any) {
    console.warn("[TTS-Media] Google Cloud Studio-B no disponible:", err?.message || err);
  }

  // 3. Motor Oficial Google Cloud Neural2 (es-US-Neural2-A)
  try {
    for (const googleApiKey of candidateKeys) {
      try {
        const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleApiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text: cleaned },
            voice: {
              languageCode: "es-US",
              name: "es-US-Neural2-A"
            },
            audioConfig: {
              audioEncoding: format === "OGG_OPUS" ? "OGG_OPUS" : "MP3",
              speakingRate: 1.08,
              pitch: 0.5
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.audioContent) {
            console.log(`[TTS-Media] ✓ Google Cloud Neural2-A — ${cleaned.length} chars → audio generado.`);
            const buffer = Buffer.from(data.audioContent, "base64");
            return {
              mimetype: format === "OGG_OPUS" ? "audio/ogg; codecs=opus" : "audio/mp3",
              data: buffer.toString("base64"),
              buffer
            };
          }
        }
      } catch (keyErr: any) {
        // Continuar
      }
    }
  } catch (err: any) {
    console.warn("[TTS-Media] Google Cloud Neural2-A no disponible:", err?.message || err);
  }

  // 4. Respaldo Neuronal Humano: Dalia (es-MX) / Salomé (es-CO) con prosodia viva
  try {
    console.log(`[TTS-Media] 🎙️ Sintetizando con voz neuronal humana (Dalia es-MX +8%) — ${cleaned.length} caracteres...`);
    const daliaBuffer = await fetchNeuralVoiceBuffer(cleaned, "es-MX-DaliaNeural", "+8%");
    if (daliaBuffer && daliaBuffer.length > 0) {
      console.log(`[TTS-Media] ✓ Audio generado con voz humana de Dalia (${daliaBuffer.length} bytes).`);
      return {
        mimetype: "audio/mp3",
        data: daliaBuffer.toString("base64"),
        buffer: daliaBuffer
      };
    }
  } catch (err: any) {
    console.warn("[TTS-Media] Respaldo Dalia falló, probando Salomé:", err?.message || err);
  }

  // 5. Último recurso de contingencia: Google Translate TTS libre
  console.log("[TTS-Media] Sintetizando audio usando contingencia Google Translate TTS (es-CO)...");
  const gttsBuffer = await fetchGttsAudioBuffer(cleaned);
  if (gttsBuffer && gttsBuffer.length > 0) {
    return {
      mimetype: "audio/mp3",
      data: gttsBuffer.toString("base64"),
      buffer: gttsBuffer
    };
  }

  return null;
}

/**
 * Envía una notificación al administrador (Desactivado para WhatsApp, solo registra en consola/logs).
 */
export async function sendAdminNotification(text: string): Promise<void> {
  console.log(`[WHATSAPP-UTILS] [Notificación Admin (WhatsApp Omitido)]: ${text}`);
}
