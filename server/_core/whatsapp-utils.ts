import path from "path";
import fs from "fs";

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
 * Genera un buffer de audio sintetizado utilizando la API de Google Cloud Text-to-Speech con fallback a Google Translate TTS.
 */
export async function textToSpeechMedia(text: string, format: "OGG_OPUS" | "MP3" = "OGG_OPUS"): Promise<any> {
  const cleaned = cleanVoiceText(text);
  if (!cleaned) return null;

  // 1. Intentar con Google Cloud Text-to-Speech si la API key es válida
  try {
    const googleApiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GEMINI_API_KEY;
    if (googleApiKey) {
      const response = await fetch(`https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${googleApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { 
            prompt: "Read aloud in a warm, welcoming tone.",
            text: cleaned 
          },
          voice: {
            languageCode: "es-419",
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
          const buffer = Buffer.from(data.audioContent, "base64");
          return {
            mimetype: format === "OGG_OPUS" ? "audio/ogg; codecs=opus" : "audio/mp3",
            data: buffer.toString("base64"),
            buffer
          };
        }
      }
    }
  } catch (err: any) {
    console.warn("[TTS-Media] Google Cloud TTS no disponible, usando fallback GTTS:", err.message || err);
  }

  // 2. Fallback garantizado: Google Translate TTS libre
  console.log("[TTS-Media] Sintetizando audio usando fallback Google Translate TTS (es-CO)...");
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
