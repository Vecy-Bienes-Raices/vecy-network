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

/**
 * Extrae el primer nombre (o nombre compuesto común como Lia Janeth, Ana María, Juan Pablo) de una cadena completa.
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
  
  const words = clean.split(/\s+/).map(w => w.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, ""));
  const filteredWords = words.filter(w => w.length > 0);
  if (filteredWords.length === 0 || !filteredWords[0]) return "";

  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

  const w1 = filteredWords[0].toLowerCase();
  const w2 = filteredWords[1] ? filteredWords[1].toLowerCase() : "";

  // Conectores que NO forman parte del nombre de pila
  const stopWords = new Set(["de", "del", "la", "las", "los", "el", "van", "von", "y", "di"]);

  // Si hay al menos 2 palabras válidas y la segunda no es conector ni inicial simple (ej: "Lia Janeth", "Juan Pablo")
  if (w2 && !stopWords.has(w2) && filteredWords[1].length >= 2 && filteredWords[0].length >= 2) {
    // Retornar nombre compuesto (ej: "Lia Janeth", "Ana María", "Juan Pablo", "Daniel Eduardo")
    return `${cap(filteredWords[0])} ${cap(filteredWords[1])}`;
  }

  return cap(filteredWords[0]);
}

/**
 * Devuelve un saludo contextual según la hora del día en Colombia.
 */
export function getGreetingByTime(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
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
 * Genera un buffer de audio sintetizado utilizando la API de Google Cloud Text-to-Speech o fallback OpenAI.
 */
export async function textToSpeechMedia(text: string, format: "OGG_OPUS" | "MP3" = "OGG_OPUS"): Promise<any> {
  const cleaned = cleanVoiceText(text);
  if (!cleaned) return null;

  try {
    const googleApiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GEMINI_API_KEY;
    if (googleApiKey) {
      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text: cleaned },
          voice: {
            languageCode: "es-CO",
            name: "es-CO-Neural2-[#1]", // Voz femenina colombiana alta fidelidad (Laomedeia)
            ssmlGender: "FEMALE"
          },
          audioConfig: {
            audioEncoding: format === "OGG_OPUS" ? "OGG_OPUS" : "MP3",
            speakingRate: 1.02,
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
    console.error("[TTS-Media] Error sintetizando audio:", err.message || err);
  }

  return null;
}

/**
 * Envía una notificación al administrador (Desactivado para WhatsApp, solo registra en consola/logs).
 */
export async function sendAdminNotification(text: string): Promise<void> {
  console.log(`[WHATSAPP-UTILS] [Notificación Admin (WhatsApp Omitido)]: ${text}`);
}
