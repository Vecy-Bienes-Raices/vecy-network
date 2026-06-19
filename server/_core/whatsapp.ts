import './setup-stealth'; // Configurar Stealth Puppeteer antes de importar whatsapp-web.js
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import type { Client as ClientType, Message, MessageMedia as MessageMediaType } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { scrapePropertyLink, esDominioPermitido } from './scraper';
import { transcribeAudioBuffer } from './voiceTranscription';
import { 
  processWhatsAppMessage, 
  processConsultingMessage,
  processCirculoMessage,
  generateWelcomeMessage,
  MSG_PRESENTACION_INSTITUCIONAL,
  MSG_PAUTAS_FORMATOS,
  MSG_PROMO_INMUEBLES,
  MSG_PROMO_CONSULTAS,
  MSG_PROMO_CIRCULO,
  MSG_COMUNICADO_MATCH_NETWORK,
  MSG_COMUNICADO_MATCH_CIRCULO,
  REPUTATION_HOOK,
  translatePropertyType
} from './janIA';
import { publishToFacebookGroup } from "./facebookService";
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { getDb } from '../db';
import { conversations, messages as dbMessages, propertyMatches, properties, requirements, users } from '../../drizzle/schema';
import { eq, and, or, like, sql } from 'drizzle-orm';
import { storagePut } from "../storage";
import { ENV } from "./env";
import { invokeLLM } from "./llm";
import * as jose from 'jose';

// --- JanIA v2.0 Global Time Constraints (v11.97) ---
const SERVER_BOOT_TIME = Math.floor(Date.now() / 1000);

// --- JanIA v2.0 Human Simulation Helpers (v11.99) ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let outgoingQueue: Promise<any> = Promise.resolve();

/** Transcodifica un buffer de audio (MP3, WAV, etc) a OGG/OPUS usando ffmpeg */
async function transcodeToOggOpus(inputBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i", "pipe:0",           // Leer de stdin
      "-c:a", "libopus",        // Usar codec Opus
      "-ac", "1",               // Canal mono
      "-ar", "16000",           // Frecuencia 16kHz
      "-b:a", "16k",            // Bitrate de audio 16kbps (óptimo para voz)
      "-f", "ogg",              // Contenedor Ogg
      "pipe:1"                  // Escribir a stdout
    ]);

    const chunks: Buffer[] = [];
    ffmpeg.stdout.on("data", (chunk) => chunks.push(chunk));
    
    // Capturar errores en stderr para diagnóstico
    let stderrData = "";
    ffmpeg.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`ffmpeg falló con código ${code}. Stderr: ${stderrData}`));
      }
    });

    ffmpeg.on("error", (err) => {
      reject(err);
    });

    ffmpeg.stdin.write(inputBuffer);
    ffmpeg.stdin.end();
  });
}

/** Obtiene un access token de OAuth2 para Google Cloud usando el archivo de Service Account */
async function getGoogleAccessToken(): Promise<string | null> {
  try {
    const keyPath = path.resolve("./scratch/google-service-account.json");
    if (!fs.existsSync(keyPath)) {
      console.warn("[TTS-Google] Archivo google-service-account.json no encontrado en scratch.");
      return null;
    }

    const serviceAccountJson = JSON.parse(fs.readFileSync(keyPath, "utf8"));
    const privateKey = await jose.importPKCS8(serviceAccountJson.private_key, "RS256");
    const jwt = await new jose.SignJWT({
      scope: "https://www.googleapis.com/auth/cloud-platform"
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(serviceAccountJson.client_email)
      .setAudience("https://oauth2.googleapis.com/token")
      .setExpirationTime("1h")
      .setIssuedAt()
      .sign(privateKey);

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt
      })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[TTS-Google] Error obteniendo OAuth2 token: ${res.status} - ${errText}`);
      return null;
    }

    const data = await res.json() as { access_token: string };
    return data.access_token;
  } catch (err) {
    console.error("[TTS-Google] Error en getGoogleAccessToken:", err);
    return null;
  }
}

/** Prepara el texto para TTS: pronunciación natural en español */
function prepareTtsText(rawText: string): string {
  return rawText
    .replace(/vecy\s+network|veci\s+network/gi, "besi network")   // "VECY/VECI Network" → "besi network" (sin tildes en inglés para evitar que el TTS diga "con acento agudo")
    .replace(/vecy|veci/gi, "besi")                                // "VECY/VECI" solo → "besi"
    .replace(/jania/gi, "yánia")                                  // "JanIA" → "yánia" (pronunciación con 'y' y acento en la 'á', tal como prefiere el usuario)
    .replace(/\bRLS\b/gi, "ere ele ese")
    .replace(/\bSQL\b/gi, "ese cu ele")
    .replace(/\bDM\b/gi, "di em")
    .replace(/\bID\b/gi, "ai di")
    .trim();
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export async function textToSpeechMedia(text: string): Promise<any> {
  // Limpiar markdown y emojis
  const cleanText = text
    .replace(/[*#_`~\[\]]/g, "")
    .replace(new RegExp("[\\u{1F300}-\\u{1FAD6}]", "gu"), "")
    .trim();

  if (!cleanText) return null;

  const ttsText = prepareTtsText(cleanText);
  const escapedText = escapeXml(ttsText);
  // SSML con pausas de respiración naturales en puntos suspensivos (500ms) y comas (200ms)
  const ssmlText = `<speak>${escapedText.replace(/\.\.\./g, '<break time="500ms"/>').replace(/,/g, ',<break time="200ms"/>')}</speak>`;

  // ═══════════════════════════════════════════════════════════════════
  // OPCIÓN ÚNICA PRINCIPAL: Google Cloud TTS (Voces de Alta Definición es-CO)
  // ═══════════════════════════════════════════════════════════════════
  // Priorizar claves que comienzan con "AIzaSy" ya que son válidas para Google Cloud API (como TTS)
  const googleApiKey = [process.env.GEMINI_API_KEY, process.env.GOOGLE_API_KEY, ENV.forgeApiKey].find(k => k && k.startsWith("AIzaSy")) || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || ENV.forgeApiKey;
  if (googleApiKey) {
    const voiceCandidates: Array<{ 
      endpoint: string; 
      name: string; 
      lang: string; 
      gender?: string; 
      usePitch: boolean;
      modelName?: string;
      prompt?: string;
    }> = [
      { 
        endpoint: "v1beta1", 
        name: "Achernar", 
        lang: "es-us", 
        usePitch: false, 
        modelName: "gemini-3.1-flash-tts-preview", 
        prompt: "Leer en voz alta con un tono cálido y acogedor." 
      },
      { endpoint: "v1", name: "es-US-Journey-F",  lang: "es-US", gender: "FEMALE", usePitch: false },
      { endpoint: "v1", name: "es-419-Neural2-C", lang: "es-419", gender: "FEMALE", usePitch: false },
      { endpoint: "v1", name: "es-CO-Neural2-A", lang: "es-CO", gender: "FEMALE", usePitch: false },
      { endpoint: "v1", name: "es-CO-Wavenet-A", lang: "es-CO", gender: "FEMALE", usePitch: false },
    ];

    let cachedAccessToken: string | null = null;

    for (const candidate of voiceCandidates) {
      const { endpoint, name, lang, gender, usePitch, modelName, prompt } = candidate;
      try {
        
        let ttsUrl = `https://texttospeech.googleapis.com/${endpoint}/text:synthesize?key=${googleApiKey}`;
        const headers: Record<string, string> = { "Content-Type": "application/json" };

        if (modelName) {
          if (!cachedAccessToken) {
            cachedAccessToken = await getGoogleAccessToken();
          }
          if (cachedAccessToken) {
            ttsUrl = `https://texttospeech.googleapis.com/${endpoint}/text:synthesize`;
            headers["Authorization"] = `Bearer ${cachedAccessToken}`;
          } else {
            console.warn(`[TTS-Google] Omitiendo candidato "${name}" porque requiere OAuth2 y no se generó el token.`);
            continue;
          }
        }
        
        // Construir cuerpo de petición dinámicamente para soportar Gemini TTS (preview) o Standard
        const requestBody = {
          audioConfig: modelName
            ? {
                audioEncoding: "OGG_OPUS",
                pitch: 0,
                speakingRate: 1.1
              }
            : {
                audioEncoding: "OGG_OPUS",
                speakingRate: 1.0,
                ...(usePitch ? { pitch: 0.0 } : {})
              },
          input: modelName 
            ? { text: ttsText, prompt: prompt }  // Gemini Flash TTS Preview usa text + prompt de estilo
            : { ssml: ssmlText },                // Modelos estándar usan SSML
          voice: modelName
            ? { languageCode: lang, modelName, name }
            : { languageCode: lang, name, ssmlGender: gender }
        };

        const response = await fetch(ttsUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          const data = await response.json() as { audioContent: string };
          if (data.audioContent) {
            console.log(`[TTS-Google] ✓ Voz "${name}" OGG_OPUS generada (${ttsText.length} chars).`);
            // audio/ogg; codecs=opus → WhatsApp lo reproduce sin necesitar ffmpeg
            return new MessageMedia('audio/ogg; codecs=opus', data.audioContent, 'voice-note.ogg');
          }
        } else {
          const errBody = await response.text().catch(() => "");
          console.warn(`[TTS-Google] "${name}" → ${response.status}: ${errBody.substring(0, 120)}`);
        }
      } catch (err) {
        console.error(`[TTS-Google] Error con "${name}":`, err);
      }
    }
  }

  // --- OPCIÓN 2: Forge API TTS (OpenAI "nova") ---
  try {
    if (ENV.forgeApiUrl && ENV.forgeApiKey) {
      const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
      const ttsUrl = new URL("v1/audio/speech", baseUrl).toString();
      const response = await fetch(ttsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ENV.forgeApiKey}`
        },
        body: JSON.stringify({
          model: "tts-1",
          input: cleanText,
          voice: "nova"
        })
      });
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        try {
          const oggBuffer = await transcodeToOggOpus(Buffer.from(buffer));
          const base64Ogg = oggBuffer.toString('base64');
          console.log(`[TTS-Forge] Voz nova transcodificada a OGG_OPUS (${oggBuffer.byteLength} bytes).`);
          return new MessageMedia('audio/ogg; codecs=opus', base64Ogg, 'voice-note.ogg');
        } catch (transcodeErr) {
          console.error(`[TTS-Forge] Falló transcodificación a Ogg, enviando MP3 de respaldo:`, transcodeErr);
          const base64Data = Buffer.from(buffer).toString('base64');
          return new MessageMedia('audio/mpeg', base64Data, 'voice-note.mp3');
        }
      }
    }
  } catch (err) {
    console.error("[TTS-Forge] Error:", err);
  }

  // --- OPCIÓN 3: Google Translate TTS (Fallback gratuito, calidad básica) ---
  try {
    const maxLen = 190;
    const words = cleanText.split(/\s+/);
    const chunks: string[] = [];
    let currentChunk = "";
    for (const word of words) {
      if ((currentChunk + " " + word).trim().length > maxLen) {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = word;
      } else {
        currentChunk += (currentChunk ? " " : "") + word;
      }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());

    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=es&client=tw-ob`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      if (response.ok) {
        buffers.push(Buffer.from(await response.arrayBuffer()));
      }
      await delay(250);
    }

    if (buffers.length > 0) {
      const combined = Buffer.concat(buffers);
      console.log(`[TTS-Translate] Voz Google Translate generada (fallback).`);
      try {
        const oggBuffer = await transcodeToOggOpus(combined);
        const base64Ogg = oggBuffer.toString('base64');
        console.log(`[TTS-Translate] Voz Google Translate transcodificada a OGG_OPUS (${oggBuffer.byteLength} bytes).`);
        return new MessageMedia('audio/ogg; codecs=opus', base64Ogg, 'voice-note.ogg');
      } catch (transcodeErr) {
        console.error(`[TTS-Translate] Falló transcodificación a Ogg, enviando MP3 de respaldo:`, transcodeErr);
        return new MessageMedia('audio/mpeg', combined.toString('base64'), 'voice-note.mp3');
      }
    }
  } catch (err) {
    console.error("[TTS-Translate] Fallback TTS failed:", err);
  }

  return null;
}

function getAudioExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/ogg': 'ogg',
    'audio/m4a': 'm4a',
    'audio/mp4': 'm4a',
  };
  return mimeToExt[mimeType] || 'ogg';
}

// --- JanIA v2.0 Anti-Spam & Multi-Modal Types (v10.5) ---
interface AntiSpamState {
  lastBlockProcessedAt: number; // Timestamp de la última vez que se procesó un bloque completo
  warningSent: boolean;         // Para evitar spam de advertencias durante el mismo cooldown
}

interface BufferedMessage {
  body: string;
  hasMedia: boolean;
  imageBuffer?: string;
  audioUrl?: string;
  pdfBuffer?: string;
  pdfMimeType?: string;
  originalMsg: Message;
}

interface MessageBuffer {
  timer: NodeJS.Timeout;
  messages: BufferedMessage[];
  userName: string;
  chatId: string;
  warningSent?: boolean;
}

interface PendingEntry {
  originalText: string;
  extractedData: any;
  classification: string;
  missingFields: string[];
  expiresAt: number;
}

interface RecentGroupMessage {
  senderId: string;
  timestamp: number;
  body: string;
}

export function detectaVoz(text: string): boolean {
  const t = text.toLowerCase();
  const keywords = [
    "audio",
    "adio",
    "nota de voz",
    "notas de voz",
    "nota de vos",
    "notas de vos",
    "mandame un audio",
    "mandame audio",
    "mándame un audio",
    "mándame audio",
    "enviame un audio",
    "enviame audio",
    "envíame un audio",
    "envíame audio",
    "dime en voz",
    "cuéntame",
    "cuéntame por audio",
    "leeme esto",
    "léeme esto",
    "hablame",
    "háblame",
    "voy conduciendo",
    "estoy conduciendo",
    "voy manejando",
    "estoy manejando",
    "sin manos",
    "manos libres",
    "no puedo leer",
    "no puedo escribir",
    "dímelo en audio",
    "dimelo en audio",
    "dímelo por audio",
    "dimelo por audio",
    "grábame un audio",
    "grabame un audio",
    "grábame audio",
    "grabame audio",
    "mándame nota de voz",
    "mandame nota de voz",
    "envíame nota de voz",
    "enviame nota de voz",
    "mándame nota de vos",
    "mandame nota de vos",
    "envíame nota de vos",
    "enviame nota de vos"
  ];
  return keywords.some(kw => t.includes(kw));
}

export class WhatsAppBot {
  private client!: ClientType;
  public targetGroupId: string = '120363260108880069@g.us';
  public buzonGroupId: string = '120363417740040773@g.us';
  public circuloGroupId: string = '120363403507276533@g.us';
  public isReady: boolean = false;
  
  // Estructuras de control dinámicas
  private messageBuffers: Map<string, MessageBuffer> = new Map();
  private cooldownMap: Map<string, AntiSpamState> = new Map();
  private pendingData: Map<string, PendingEntry> = new Map();
  private recentGroupMessages: Map<string, RecentGroupMessage[]> = new Map();
  private lastConversationWarningTime: Map<string, number> = new Map();
  // Mutex ligero por senderId para serializar mensajes concurrentes del mismo usuario (Fix: condición de carrera en álbumes)
  private processingLocks: Map<string, Promise<void>> = new Map();
  
  private pendingWelcomeCount: number = 0;
  private counterFile: string = path.join(process.cwd(), '.pending_welcome_count');
  public pendingWelcomeJids: string[] = [];
  private jidsFile: string = path.join(process.cwd(), '.pending_welcome_jids');
  private cooldownFile: string = path.join(process.cwd(), '.cooldown_map.json');
  private pendingDataFile: string = path.join(process.cwd(), '.pending_data.json');

  // Control de límites y anti-flood (v12.0)
  private dailyMessageLimit: number = 250;
  private messagesSentToday: number = 0;
  private lastResetDate: string = new Date().toDateString();
  private chatMessageTimes: Map<string, number[]> = new Map();
  private blockedChats: Map<string, number> = new Map();
  private redirectCooldowns: Map<string, number> = new Map();
  private blacklistedBots: string[] = process.env.BLACKLISTED_BOTS ? process.env.BLACKLISTED_BOTS.split(',') : [];
  private watchdogInterval: NodeJS.Timeout | null = null;

  // --- ANTI-BURST & ANTI-FLOOD QUEUED DISPATCH (v12.0) ---
  private async queuedSend(chatId: string, content: any, options: any = {}) {
    if (typeof content === 'string') {
      content = content.replace(/\*\*/g, '*');
    }
    // 1. Control de reseteo diario del Kill-Switch
    const today = new Date().toDateString();
    if (this.lastResetDate !== today) {
      this.messagesSentToday = 0;
      this.lastResetDate = today;
    }

    // 2. Control del Kill-Switch (Límite diario)
    if (this.messagesSentToday >= this.dailyMessageLimit) {
      console.warn(`[Kill-Switch] Límite diario de mensajes alcanzado (${this.dailyMessageLimit}). Cancelando envío a ${chatId}.`);
      return;
    }

    // 3. Control de Anti-Flood por Chat
    const now = Date.now();
    const unblockTime = this.blockedChats.get(chatId);
    if (unblockTime && now < unblockTime) {
      console.warn(`[Anti-Flood] Ignorando mensaje a ${chatId} (bloqueado temporalmente por flood).`);
      return;
    }

    // Registrar mensaje para la frecuencia del anti-flood
    let timestamps = this.chatMessageTimes.get(chatId) || [];
    timestamps = timestamps.filter(t => now - t < 60000); // Filtrar marcas más viejas de 1 minuto
    timestamps.push(now);
    this.chatMessageTimes.set(chatId, timestamps);

    if (timestamps.length > 5) {
      console.warn(`[Anti-Flood] ¡Alerta de Flood en ${chatId}! Bloqueando respuestas por 15 minutos.`);
      this.blockedChats.set(chatId, now + 15 * 60 * 1000);
      return;
    }

    outgoingQueue = outgoingQueue.then(async () => {
      try {
        if (this.messagesSentToday >= this.dailyMessageLimit) return;

        // Indicador de estado y retardo realista: 🎙️ grabando si es audio, ✍️ escribiendo si es texto
        const isGroup = chatId.includes('@g.us');
        const shouldUseCloud = process.env.USE_WHATSAPP_CLOUD_API === 'true' && (!isGroup || process.env.ENABLE_PUPPETEER_FOR_GROUPS !== 'true');

        let typingDelay = 200;
        if (shouldUseCloud) {
          const isAudio = (content && content.mimetype && content.mimetype.startsWith('audio')) ||
                          (options && options.sendAudioAsVoice);
          if (isAudio) {
            typingDelay = isGroup ? (Math.floor(Math.random() * 2000) + 3000) : 300;
          } else {
            if (typeof content === 'string') {
              typingDelay = isGroup ? Math.min(content.length * 15, 4000) : Math.min(content.length * 3, 400);
              typingDelay = Math.max(typingDelay, 200);
            } else {
              typingDelay = isGroup ? 1500 : 200;
            }
          }
        } else {
          try {
            const chat = await this.client.getChatById(chatId);
            const isAudio = content instanceof MessageMedia ||
                            (typeof content === 'object' && content?.mimetype?.startsWith('audio')) ||
                            (options && options.sendAudioAsVoice);
            if (isAudio) {
              await chat.sendStateRecording();  // 🎙️ Micrófono
              typingDelay = isGroup ? (Math.floor(Math.random() * 2000) + 3000) : 300;
            } else {
              await chat.sendStateTyping();     // ✍️ Tres puntitos
              if (typeof content === 'string') {
                typingDelay = isGroup ? Math.min(content.length * 15, 4000) : Math.min(content.length * 3, 400);
                typingDelay = Math.max(typingDelay, 200);
              } else {
                typingDelay = isGroup ? 2000 : 200;
              }
            }
          } catch (_) { /* ignorar si el chat no acepta el estado */ }
        }

        // Esperar el retardo de presencia humana antes del envío real
        await delay(typingDelay);

        // Promesa de envío con timeout de 15 segundos para evitar bloqueos por chats inaccesibles o páginas caídas
        let sendPromise;
        if (shouldUseCloud) {
          const { sendCloudMessage } = await import("./whatsapp-cloud");
          sendPromise = sendCloudMessage(chatId, content, options);
        } else {
          sendPromise = this.client.sendMessage(chatId, content, options);
        }
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout al enviar mensaje de WhatsApp a ${chatId}`)), 15000)
        );

        await Promise.race([sendPromise, timeoutPromise]);

        // Limpiar el estado de presencia
        if (!shouldUseCloud) {
          try {
            const chat = await this.client.getChatById(chatId);
            await chat.clearState();
          } catch (_) { /* ignorar */ }
        }

        this.messagesSentToday++;
        console.log(`[WhatsApp-Bot] Mensaje enviado a ${chatId}. Total hoy: ${this.messagesSentToday}/${this.dailyMessageLimit}`);
        // Intervalo de enfriamiento seguro: 2s a 3.5s para grupos, 200ms para DMs privados
        const cooldownDelay = isGroup ? (Math.floor(Math.random() * 1500) + 2000) : 200;
        await delay(cooldownDelay);
      } catch (err: any) {
        console.error('[Anti-Burst-Queue] Fallo en despacho secuencial:', err.message || err);
      }
    });
    return outgoingQueue;
  }

  constructor() {
    console.log('[WHATSAPP-BOT] Inicializando JanIA v2.5 (CORE v10.5 - Multimodal & Anti-Spam)...');
    this.loadCounter();
    this.loadCooldowns();
    this.loadPendingData();
    
    this.createClientInstance();

    this.setupGracefulShutdown();
    // Daily scheduled publications are now handled by server/_core/cronService.ts
    // this.setupDailySchedule();
  }

  // --- PERSISTENCIA Y CIERRE ---
  private loadCounter() {
    try {
      if (fs.existsSync(this.counterFile)) {
        this.pendingWelcomeCount = parseInt(fs.readFileSync(this.counterFile, 'utf8')) || 0;
      }
      if (fs.existsSync(this.jidsFile)) {
        this.pendingWelcomeJids = JSON.parse(fs.readFileSync(this.jidsFile, 'utf8')) || [];
      }
    } catch (e) {}
  }

  private saveCounter() {
    try {
      fs.writeFileSync(this.counterFile, this.pendingWelcomeCount.toString(), 'utf8');
      fs.writeFileSync(this.jidsFile, JSON.stringify(this.pendingWelcomeJids), 'utf8');
    } catch (e) {}
  }

  private loadCooldowns() {
    try {
      if (fs.existsSync(this.cooldownFile)) {
        const raw = JSON.parse(fs.readFileSync(this.cooldownFile, 'utf8'));
        this.cooldownMap = new Map(Object.entries(raw));
      }
    } catch (e) {}
  }

  private saveCooldowns() {
    try {
      const obj = Object.fromEntries(this.cooldownMap.entries());
      fs.writeFileSync(this.cooldownFile, JSON.stringify(obj), 'utf8');
    } catch (e) {}
  }

  private loadPendingData() {
    try {
      if (fs.existsSync(this.pendingDataFile)) {
        const raw = JSON.parse(fs.readFileSync(this.pendingDataFile, 'utf8'));
        this.pendingData = new Map(Object.entries(raw));
      }
    } catch (e) {}
  }

  private savePendingData() {
    try {
      const obj = Object.fromEntries(this.pendingData.entries());
      fs.writeFileSync(this.pendingDataFile, JSON.stringify(obj), 'utf8');
    } catch (e) {}
  }

  private setupGracefulShutdown() {
    const shutdown = async () => {
      console.log('\n🛑 Cerrando WhatsApp Bot...');
      this.saveCounter();
      try { await this.client.destroy(); } catch (e) {}
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  private getInfractionsPath(): string {
    return path.join(process.cwd(), '.infractions.json');
  }

  private loadInfractions(): Record<string, Record<string, number>> {
    const filePath = this.getInfractionsPath();
    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        console.error('[WHATSAPP-BOT] Error al leer .infractions.json:', e);
      }
    }
    return {};
  }

  private saveInfractions(infractions: Record<string, Record<string, number>>) {
    const filePath = this.getInfractionsPath();
    try {
      fs.writeFileSync(filePath, JSON.stringify(infractions, null, 2), 'utf8');
    } catch (e) {
      console.error('[WHATSAPP-BOT] Error al escribir .infractions.json:', e);
    }
  }

  private incrementStrike(groupId: string, userId: string): number {
    const infractions = this.loadInfractions();
    if (!infractions[groupId]) {
      infractions[groupId] = {};
    }
    const current = infractions[groupId][userId] || 0;
    const next = current + 1;
    infractions[groupId][userId] = next;
    this.saveInfractions(infractions);
    return next;
  }

  private resetStrikes(groupId: string, userId: string) {
    const infractions = this.loadInfractions();
    if (infractions[groupId] && infractions[groupId][userId]) {
      delete infractions[groupId][userId];
      if (Object.keys(infractions[groupId]).length === 0) {
        delete infractions[groupId];
      }
      this.saveInfractions(infractions);
    }
  }

  // --- MANEJO DE EVENTOS ---
  private setupEventListeners() {
    this.client.on('qr', (qr: string) => {
      console.log('[WHATSAPP-BOT] Escanea el QR para JanIA:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      console.log('\n🚀 JANIA v2.5 CORE v10.5 — SISTEMA NACIONAL ELÁSTICO ACTIVADO');
      this.isReady = true;
      this.startWatchdog();
      this.exportRecentJoinsToFile().catch(err => {
        console.error('[WHATSAPP-BOT] Error al exportar uniones en ready:', err);
      });

      // Optimización de rendimiento: bloquear hojas de estilo y fuentes en el navegador headless
      (async () => {
        try {
          const page = this.client.pupPage;
          if (page) {
            await page.setRequestInterception(true);
            page.on('request', (req) => {
              const type = req.resourceType();
              if (type === 'stylesheet' || type === 'font') {
                req.abort().catch(() => {});
              } else {
                req.continue().catch(() => {});
              }
            });
            console.log('[WHATSAPP-BOT] Optimización activa: Hojas de estilo y fuentes bloqueadas en el navegador invisible.');
          }
        } catch (e: any) {
          console.warn('[WHATSAPP-BOT] No se pudo configurar la interceptación de solicitudes:', e.message || e);
        }
      })();
    });

    this.client.on('disconnected', async (reason) => {
      console.warn('[WHATSAPP-BOT] ⚠️ Cliente desconectado:', reason, '— iniciando reconexión automática en 10s...');
      this.isReady = false;
      // Esperamos 10 segundos antes de reconectar para que WhatsApp libere sus recursos
      await new Promise(resolve => setTimeout(resolve, 10000));
      await this.reconnectClient();
    });

    this.client.on('group_membership_request', async (notification: any) => {
      try {
        console.log(`[WHATSAPP-BOT] Recibida solicitud de unión de ${notification.author} en el grupo ${notification.chatId}`);
        
        let requesterId = notification.author;
        let resolvedId: string | null = null;
        
        if (requesterId && requesterId.endsWith('@lid')) {
          try {
            const contact = await this.client.getContactById(requesterId);
            if (contact && contact.id && contact.id._serialized && contact.id._serialized.endsWith('@c.us')) {
              resolvedId = contact.id._serialized;
              console.log(`[WHATSAPP-BOT] Resolviendo requester ID de LID ${requesterId} a ${resolvedId}`);
            }
          } catch (e: any) {
            console.error('[WHATSAPP-BOT] Error resolviendo requester ID de LID:', e.message || e);
          }
        }

        const idsToApprove = [requesterId];
        if (resolvedId) {
          idsToApprove.push(resolvedId);
        }

        for (const jid of idsToApprove) {
          try {
            console.log(`[WHATSAPP-BOT] Intentando aprobar solicitud de unión para JID: ${jid}`);
            await this.client.approveGroupMembershipRequests(notification.chatId, {
              requesterIds: [jid],
              sleep: null
            });
            console.log(`[WHATSAPP-BOT] Solicitud de unión de ${jid} aprobada con éxito.`);
          } catch (err: any) {
            console.warn(`[WHATSAPP-BOT] Falló aprobación directa para ${jid}: ${err.message || err}`);
          }
        }
      } catch (err: any) {
        console.error('[WHATSAPP-BOT] Error general al aprobar solicitud de unión:', err.message || err);
      }
    });

    this.client.on('group_join', async (notification: any) => {
      if (notification.chatId !== this.targetGroupId) return;
      const joinedIds = notification.recipientIds || [];
      const resolvedIds = [];
      for (const id of joinedIds) {
        if (id && id.endsWith('@lid')) {
          try {
            const contact = await this.client.getContactById(id);
            if (contact && contact.id && contact.id._serialized && contact.id._serialized.endsWith('@c.us')) {
              resolvedIds.push(contact.id._serialized);
              continue;
            }
          } catch (e) {}
        }
        resolvedIds.push(id);
      }
      this.pendingWelcomeJids.push(...resolvedIds);
      this.pendingWelcomeCount = this.pendingWelcomeJids.length;
      this.saveCounter();
      if (this.pendingWelcomeCount >= 10) await this.sendBatchWelcome();
    });

    this.client.on('message_reaction', async (reaction: any) => {
      try {
        const negativeReactions = ['😂', '🤣', '😡', '😠', '😤', '😭', '❌', '❓', '❗'];
        if (negativeReactions.includes(reaction.reaction)) {
          const targetGroupId = this.targetGroupId;
          
          if (reaction.msgId.remote === targetGroupId && reaction.msgId.fromMe === true) {
            const msg = await this.client.getMessageById(reaction.msgId._serialized);
            if (msg) {
              let senderId = reaction.senderId;
              if (senderId && senderId.endsWith('@lid')) {
                try {
                  const contact = await this.client.getContactById(senderId);
                  if (contact && contact.id && contact.id._serialized && contact.id._serialized.endsWith('@c.us')) {
                    senderId = contact.id._serialized;
                  }
                } catch (e) {}
              }
              let realName = `Asesor +${senderId.split('@')[0]}`;
              try {
                const contact = await this.client.getContactById(senderId);
                if (contact) {
                  realName = contact.name || contact.pushname || realName;
                }
              } catch (e: any) {
                console.warn(`[WHATSAPP-BOT] Falló getContactById para reacción del remitente ${senderId}:`, e.message || e);
              }
              
              console.log(`[JanIA-Reaction] Reacción de desaprobación/sarcasmo detectada de ${realName}`);
              
              const promptContext = `[REACCIÓN NEGATIVA/SARCASMO/DESAPROBACIÓN]: El usuario @${senderId.split('@')[0]} (${realName}) ha reaccionado con el emoji ${reaction.reaction} a tu mensaje: "${msg.body}". Genera una respuesta en el grupo dirigiéndote a este aliado/colega. Responde de manera sumamente cordial, respetuosa y profesional, pero con total firmeza y una sutil pero brillante auto-defensa. Debes defender tus capacidades de inteligencia artificial, al equipo de desarrollo y fundadores de VECY (Jani Alves y Eduardo A. Rivera), y el valor del proyecto VECY Network (red colaborativa gratuita y sin comisiones). Hazle ver con argumentos elocuentes e inteligentes que la tecnología seria y el trabajo estructurado es lo que genera matches y cierra negocios, rebatiendo su reacción con elegancia comercial. Usa emojis.`;
              
              const result = await processWhatsAppMessage(promptContext, senderId, realName, false, [], undefined, undefined, true);
              if (result && result.response && result.response.trim() !== '') {
                await this.queuedSend(targetGroupId, result.response, {
                  mentions: [senderId],
                  quotedMessageId: reaction.msgId._serialized
                });
              }
            }
          }
        }
      } catch (err: any) {
        console.error('[WHATSAPP-BOT] Error procesando reacción:', err.message || err);
      }
    });

    this.client.on('message_create', async (msg: Message) => {
      // CENTRALIZED LID TO REAL JID RESOLUTION
      if (msg.author && msg.author.endsWith('@lid')) {
        try {
          const contact = await this.client.getContactById(msg.author);
          if (contact && contact.id && contact.id._serialized && contact.id._serialized.endsWith('@c.us')) {
            msg.author = contact.id._serialized;
          }
        } catch (e) {
          console.error('[WHATSAPP-BOT] Error resolving msg.author LID:', e);
        }
      }
      if (msg.from && msg.from.endsWith('@lid')) {
        try {
          const contact = await this.client.getContactById(msg.from);
          if (contact && contact.id && contact.id._serialized && contact.id._serialized.endsWith('@c.us')) {
            msg.from = contact.id._serialized;
          }
        } catch (e) {
          console.error('[WHATSAPP-BOT] Error resolving msg.from LID:', e);
        }
      }

      // 1. FILTRO TEMPRANO DE SEGURIDAD (ANTI-SPAM BROADCAST)
      if ((msg.from && msg.from.includes('status@broadcast')) || (msg.author && msg.author.includes('status@broadcast'))) {
        return;
      }

      // 2. FILTRO DE MENSAJES HISTÓRICOS (v11.97)
      if (msg.timestamp < SERVER_BOOT_TIME) {
        return;
      }

      const senderId = (msg as any).author || msg.from;
      const botJid = this.client.info?.wid?._serialized;
      if (msg.fromMe || (botJid && (senderId === botJid || msg.from === botJid || msg.author === botJid)) || this.blacklistedBots.includes(senderId)) {
        return;
      }

      // --- CAPA DE LECTURA HUMANA (v11.99) ---
      // Simula tiempo de lectura entre 2 y 4 segundos
      await delay(Math.floor(Math.random() * 2000) + 2000);

      try {
        const chat = await msg.getChat();
        
        // Activar estado "Grabando audio..." (Recording) o "Escribiendo..." (Typing)
        const msgText = (msg.body || "").toLowerCase();
        const wantsVoice = msg.type === 'audio' || msg.type === 'ptt' || detectaVoz(msgText);
        if (wantsVoice) {
          await chat.sendStateRecording();
        } else {
          await chat.sendStateTyping();
        }

        const chatId = chat.id._serialized;
        const isGroup = chat.isGroup;
        const isTargetGroup = chatId === this.targetGroupId;
        const isBuzonGroup = chatId === this.buzonGroupId;

        const isCirculoGroup = chatId === this.circuloGroupId;

        // 1. RAMA DE GRUPO (VECY INMUEBLES NETWORK)
        if (isTargetGroup) {
          const text = msg.body.toLowerCase();
          // Comandos de administración
          if (text.includes('jania')) {
            if (text.includes('normas') || text.includes('preséntate') || text.includes('anuncia') || text.includes('dipava') || text.includes('retorno') || text.includes('sincroniza') || text.includes('catchup') || text.includes('cierre') || text.includes('audios')) {
              await this.handleAdminCommand(msg);
              return;
            }
          }
          // Orquestación con Buffer y Cooldown (Lógica v10.5 intacta)
          await this.handleIncomingMessage(msg, chatId);
          return;
        }

        // NUEVO: RAMA DE GRUPO (BUZÓN DE CONSULTORÍA 24/7)
        if (isBuzonGroup) {
          await this.handleIncomingMessage(msg, chatId);
          return;
        }

        // NUEVO: RAMA DE GRUPO (CÍRCULO CERO 👌)
        if (isCirculoGroup) {
          await this.handleIncomingMessage(msg, chatId);
          return;
        }

        // 2. RAMA Conversacional PRIVADA (DM Branch - v11.15 - Con Buffer anti-duplicados)
        if (!isGroup) {
          if (process.env.USE_WHATSAPP_CLOUD_API === 'true' && process.env.ENABLE_PUPPETEER_FOR_GROUPS === 'true') {
            const now = Date.now();
            const lastRedirect = this.redirectCooldowns.get(senderId) || 0;
            const TWELVE_HOURS = 12 * 60 * 60 * 1000;
            if (now - lastRedirect > TWELVE_HOURS) {
              this.redirectCooldowns.set(senderId, now);
              const redirectLink = process.env.WHATSAPP_OFFICIAL_DM_LINK || 'https://wa.me/REEMPLAZAR_CON_NUMERO_DE_META_OFICIAL';
              const welcomeText = `¡Hola! 🤖 Soy JanIA, la asistente de la Red VECY.\n\nEste número lo utilizo *únicamente para interactuar en los grupos inmobiliarios*.\n\nPara chatear conmigo en privado, buscar inmuebles, transcribir audios y usar todas mis herramientas, por favor escríbeme a mi chat oficial directo:\n\n👉 ${redirectLink}`;
              await this.queuedSend(chatId, welcomeText);
            }
            return;
          }
          await this.handleIncomingMessage(msg, chatId);
          return;
        }

      } catch (e) {
        console.error('[WHATSAPP-BOT] Error crítico en receptor principal:', e);
      }
    });
  }

  // --- 2. RAMA Conversacional PRIVADA (DM INBOUND LOOP) ---
  private async handlePrivateMessage(msg: Message) {
    try {
      const senderId = msg.from;
      const rawPhone = (msg.author || msg.from).split("@")[0];
      let realName = `Asesor +${rawPhone}`;
      try {
        const contact = await msg.getContact();
        if (contact) {
          realName = contact.pushname || contact.name || realName;
        }
      } catch (e: any) {
        console.warn(`[WHATSAPP-BOT] Falló msg.getContact() en handlePrivateMessage para ${senderId}:`, e.message || e);
      }
      try {
        const db = await getDb();
        if (db) {
          const [u] = await db.select().from(users).where(eq(users.phone, rawPhone)).limit(1);
          if (u && u.name && u.name.trim() !== "") {
            realName = u.name;
          }
        }
      } catch (dbErr) {
        console.warn(`[WHATSAPP-BOT] Error al buscar nombre en BD para ${rawPhone}:`, dbErr);
      }

      console.log(`[JanIA-DM] Atendiendo mensaje interno de ${realName} (${senderId})...`);

      // Interceptar confirmaciones de Match (SÍ #M123 o NO #M123)
      const matchConfirmationRegex = /^\s*(sí|si|no)\s+#m(\d+)\s*$/i;
      const matchConf = msg.body.match(matchConfirmationRegex);
      if (matchConf) {
        const decision = matchConf[1].toLowerCase();
        const matchId = parseInt(matchConf[2], 10);
        await this.processMatchConfirmation(senderId, realName, matchId, decision);
        return; // Detener flujo general de Gemini
      }

      // Si dice algo como "si", "sí", "no", "acepto", "no acepto" pero sin código, intentamos ver si tiene coincidencia sugerida pendiente
      const plainDecisionRegex = /^\s*(sí|si|no|acepto|no\s+acepto|aceptar|rechazar)\s*$/i;
      const plainDecisionMatch = msg.body.match(plainDecisionRegex);
      if (plainDecisionMatch) {
        let decision = plainDecisionMatch[1].toLowerCase();
        if (decision === 'si' || decision === 'sí' || decision === 'acepto' || decision === 'aceptar') {
          decision = 'si';
        } else {
          decision = 'no';
        }

        const db = await getDb();
        if (db) {
          const senderPhone = senderId.split('@')[0];

          // Buscar matches donde es el dueño y no ha confirmado
          const ownerPending = await db
            .select({
              id: propertyMatches.id,
              propertyType: properties.propertyType,
              transactionType: properties.transactionType,
              city: properties.city,
              zone: properties.zone,
              reqType: requirements.tipoInmuebleDeseado,
              reqTx: requirements.tipoNegocioDeseado,
              reqCity: requirements.ciudadDeseada,
              reqZone: requirements.zonaDeseada,
              score: propertyMatches.matchScore
            })
            .from(propertyMatches)
            .innerJoin(properties, eq(propertyMatches.propertyId, properties.id))
            .innerJoin(requirements, eq(propertyMatches.requirementId, requirements.id))
            .where(
              and(
                eq(propertyMatches.status, "suggested"),
                eq(propertyMatches.ownerConfirmed, false),
                or(
                  eq(properties.idUsuarioWhatsapp, senderId),
                  like(properties.idUsuarioWhatsapp, senderPhone + '%')
                )
              )
            );

          // Buscar matches donde es el buscador y no ha confirmado
          const seekerPending = await db
            .select({
              id: propertyMatches.id,
              propertyType: properties.propertyType,
              transactionType: properties.transactionType,
              city: properties.city,
              zone: properties.zone,
              reqType: requirements.tipoInmuebleDeseado,
              reqTx: requirements.tipoNegocioDeseado,
              reqCity: requirements.ciudadDeseada,
              reqZone: requirements.zonaDeseada,
              score: propertyMatches.matchScore
            })
            .from(propertyMatches)
            .innerJoin(properties, eq(propertyMatches.propertyId, properties.id))
            .innerJoin(requirements, eq(propertyMatches.requirementId, requirements.id))
            .where(
              and(
                eq(propertyMatches.status, "suggested"),
                eq(propertyMatches.seekerConfirmed, false),
                or(
                  eq(requirements.idUsuarioWhatsapp, senderId),
                  like(requirements.idUsuarioWhatsapp, senderPhone + '%')
                )
              )
            );

          const allPending = [...ownerPending, ...seekerPending];
          const uniquePending = allPending.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

          if (uniquePending.length === 1) {
            const matchId = uniquePending[0].id;
            console.log(`[JanIA-DM] Auto-asociando decisión '${decision}' con la única coincidencia pendiente #${matchId} para ${senderId}`);
            await this.processMatchConfirmation(senderId, realName, matchId, decision);
            return;
          } else if (uniquePending.length > 1) {
            let listMsg = `Hola ${realName.split(' ')[0]}, veo que respondiste *${plainDecisionMatch[1].toUpperCase()}*, pero actualmente tienes *${uniquePending.length} coincidencias* sugeridas de negocio pendientes de confirmar.\n\nPara poder saber cuál de ellas deseas confirmar o rechazar, por favor responde utilizando el código de coincidencia de esta manera:\n`;
            for (const item of uniquePending) {
              const isOwnerForThis = ownerPending.some(o => o.id === item.id);
              const scorePercent = Number(item.score || 0).toFixed(0);
              if (isOwnerForThis) {
                listMsg += `\n👉 *SÍ #M${item.id}* o *NO #M${item.id}* para tu propiedad (coincidencia del ${scorePercent}% con requerimiento de ${translatePropertyType(item.reqType)} en ${item.reqCity || 'Bogotá'}-${item.reqZone || ''})`;
              } else {
                listMsg += `\n👉 *SÍ #M${item.id}* o *NO #M${item.id}* para tu requerimiento (coincidencia del ${scorePercent}% con propiedad de ${translatePropertyType(item.propertyType)} en ${item.city || 'Bogotá'}-${item.zone || ''})`;
              }
            }
            listMsg += `\n\n*(Nota: Tus números se compartirán solo si ambos confirman con SÍ)*`;
            await this.queuedSend(senderId, listMsg);
            await this.logToDb(senderId, 'janIA', `[DM-Response-Ambiguous] Solicitado código de coincidencia para decisión ambigua.`);
            return;
          }
        }
      }

      // Capa Multimodal OCR/PDF para DMs (Visión/Documentos)
      let imageBuffer: string | undefined;
      let pdfBuffer: string | undefined;
      let pdfMimeType: string | undefined;
      if (msg.hasMedia) {
        if (msg.type === 'image') {
          try {
            const media = await msg.downloadMedia();
            if (media && media.mimetype.startsWith('image/')) {
              imageBuffer = media.data;
            }
          } catch (e) {
            console.error('[JanIA-DM-Vision] Error descargando imagen:', e);
          }
        } else if (msg.type === 'document') {
          try {
            const media = await msg.downloadMedia();
            if (media && media.mimetype === 'application/pdf') {
              pdfBuffer = media.data;
              pdfMimeType = media.mimetype;
            }
          } catch (e) {
            console.error('[JanIA-DM-Document] Error descargando documento:', e);
          }
        }
      }

      const result = await processWhatsAppMessage(
        msg.body, 
        senderId, 
        realName, 
        msg.hasMedia, 
        [], // Sin scraping para DMs simples
        undefined, 
        imageBuffer,
        false, // isGroup = false
        pdfBuffer,
        pdfMimeType
      );

      // Despacho de respuesta inmediata (Secuencial v11.99)
      if (result) {
        const responseText = result.dmResponse || result.response;
        if (responseText && responseText.trim() !== "") {
          await this.queuedSend(senderId, responseText);
          await this.logToDb(senderId, 'janIA', `[DM-Response] ${responseText}`);
        }
      }

    } catch (error) {
      console.error(`[JanIA-DM-Error] Fallo en atención privada para ${msg.from}:`, error);
    }
  }

  private async processMatchConfirmation(senderId: string, realName: string, matchId: number, decision: string) {
    try {
      const db = await getDb();
      if (!db) {
        await this.queuedSend(senderId, "⚠️ El sistema de base de datos no está disponible en este momento. Inténtalo más tarde.");
        return;
      }

      // 1. Buscar el match
      const [match] = await db.select().from(propertyMatches).where(eq(propertyMatches.id, matchId)).limit(1);
      if (!match) {
        await this.queuedSend(senderId, `⚠️ No encontré ninguna coincidencia registrada con el código *#M${matchId}*. Por favor verifica el número.`);
        return;
      }

      // 2. Buscar propiedad y requerimiento asociados
      const [prop] = await db.select().from(properties).where(eq(properties.id, match.propertyId)).limit(1);
      const [req] = await db.select().from(requirements).where(eq(requirements.id, match.requirementId)).limit(1);

      if (!prop || !req) {
        await this.queuedSend(senderId, "⚠️ Hubo un problema al recuperar los detalles de esta coincidencia.");
        return;
      }

      const senderPhone = senderId.split('@')[0];
      const ownerPhone = prop.idUsuarioWhatsapp || '';
      const seekerPhone = req.idUsuarioWhatsapp || '';

      const isOwner = senderPhone === ownerPhone.split('@')[0];
      const isSeeker = senderPhone === seekerPhone.split('@')[0];

      if (!isOwner && !isSeeker) {
        await this.queuedSend(senderId, "⚠️ No estás autorizado para confirmar esta coincidencia.");
        return;
      }

      if (decision === 'no') {
        // Cancelar el match
        await db.update(propertyMatches).set({ status: 'rejected' }).where(eq(propertyMatches.id, matchId));
        await this.queuedSend(senderId, `Entendido. He marcado la coincidencia *#M${matchId}* como cancelada. No se compartirán tus datos de contacto.`);
        await this.logToDb(senderId, 'janIA', `[Match-Rejected] Match #M${matchId} rechazado por el usuario.`);
        
        // Notificar a la otra parte
        const otherJid = isOwner ? (seekerPhone.includes('@') ? seekerPhone : `${seekerPhone}@c.us`) : (ownerPhone.includes('@') ? ownerPhone : `${ownerPhone}@c.us`);
        await this.queuedSend(otherJid, `Aviso: La coincidencia *#M${matchId}* ha sido cancelada por la otra parte.`);
        return;
      }

      // Si es SÍ
      let updateFields: any = {};
      if (isOwner) {
        updateFields.ownerConfirmed = true;
      }
      if (isSeeker) {
        updateFields.seekerConfirmed = true;
      }

      await db.update(propertyMatches).set(updateFields).where(eq(propertyMatches.id, matchId));

      // Obtener el match actualizado
      const [updatedMatch] = await db.select().from(propertyMatches).where(eq(propertyMatches.id, matchId)).limit(1);

      if (updatedMatch.ownerConfirmed && updatedMatch.seekerConfirmed) {
        // Ambas partes confirmaron
        await db.update(propertyMatches).set({ status: 'interested' }).where(eq(propertyMatches.id, matchId));

        let ownerName = "Oferente";
        let seekerName = "Interesado";

        try {
          const [ownerUser] = await db.select().from(users).where(eq(users.phone, ownerPhone)).limit(1);
          if (ownerUser && ownerUser.name) ownerName = ownerUser.name;
        } catch {}

        try {
          const [seekerUser] = await db.select().from(users).where(eq(users.phone, seekerPhone)).limit(1);
          if (seekerUser && seekerUser.name) seekerName = seekerUser.name;
        } catch {}

        const ownerJid = ownerPhone.includes('@') ? ownerPhone : `${ownerPhone}@c.us`;
        const seekerJid = seekerPhone.includes('@') ? seekerPhone : `${seekerPhone}@c.us`;

        const matchScoreFormatted = Number(updatedMatch.matchScore || 0).toFixed(0);

        const msgToOwner = `🎉🎈 *¡CONEXIÓN DE NEGOCIO EXITOSA!* 🎈🎉
Felicidades, ambas partes han confirmado interés en la coincidencia *#M${matchId}* (Coincidencia: ${matchScoreFormatted}%).

Aquí tienes el contacto directo del aliado interesado en tu propiedad:
👤 *Nombre:* ${seekerName}
📞 *WhatsApp:* https://wa.me/${seekerPhone}
💬 *Su requerimiento:* ${req.rawText || 'Sin descripción'}

¡Les deseamos mucho éxito en el cierre comercial! 🤝🚀`;

        const msgToSeeker = `🎉🎈 *¡CONEXIÓN DE NEGOCIO EXITOSA!* 🎈🎉
Felicidades, ambas partes han confirmado interés en la coincidencia *#M${matchId}* (Coincidencia: ${matchScoreFormatted}%).

Aquí tienes el contacto directo del aliado que ofrece la propiedad:
👤 *Nombre:* ${ownerName}
📞 *WhatsApp:* https://wa.me/${ownerPhone}
💬 *Su oferta:* ${prop.rawText || 'Sin descripción'}

¡Les deseamos mucho éxito en el cierre comercial! 🤝🚀`;

        await this.queuedSend(ownerJid, msgToOwner);
        await this.queuedSend(seekerJid, msgToSeeker);

        await this.logToDb(ownerJid, 'janIA', `[Match-Connected] Contact shared: Seeker is ${seekerPhone}`);
        await this.logToDb(seekerJid, 'janIA', `[Match-Connected] Contact shared: Owner is ${ownerPhone}`);
      } else {
        // Solo esta parte ha confirmado
        await this.queuedSend(senderId, `¡Gracias! He registrado tu confirmación de interés para la coincidencia *#M${matchId}*.\n\nEn cuanto la otra parte también confirme, les compartiré mutuamente sus datos de contacto para que puedan cerrar el negocio. 🚀`);
        await this.logToDb(senderId, 'janIA', `[Match-Confirmed-Waiting] User confirmed match #M${matchId}, waiting for peer.`);
      }
    } catch (err: any) {
      console.error(`[processMatchConfirmation-Error] Error procesando confirmación para coincidencia #${matchId}:`, err);
      await this.queuedSend(senderId, "⚠️ Ocurrió un error interno al procesar tu confirmación.");
    }
  }

  // --- 1. LOGÍSTICA DEL BUFFER DINÁMICO Y ANTI-SPAM (CORE v10.5) ---
  // Wrapper que serializa entradas por senderId usando un mutex ligero.
  // Esto evita la condición de carrera cuando WhatsApp envía un álbum de imágenes
  // y todos los mensajes llegan casi simultáneamente antes de que el buffer exista.
  public async handleIncomingMessage(msg: Message, chatId: string) {
    const senderId = (msg as any).author || msg.from;
    const lockKey = `${chatId}_${senderId}`;

    // Encadenar la ejecución real detrás de la promesa anterior del mismo usuario
    const previousLock = this.processingLocks.get(lockKey) || Promise.resolve();
    let resolveLock!: () => void;
    const currentLock = new Promise<void>(resolve => { resolveLock = resolve; });
    const chainedLock = previousLock.then(() => currentLock);
    this.processingLocks.set(lockKey, chainedLock);

    try {
      await previousLock; // Esperar a que termine el mensaje anterior del mismo usuario
      await this._processIncomingMessage(msg, chatId, senderId);
    } finally {
      resolveLock();
      // Limpiar la entrada del lock si nadie más está esperando (somos los últimos en la cadena)
      if (this.processingLocks.get(lockKey) === chainedLock) {
        this.processingLocks.delete(lockKey);
      }
    }
  }

  private async _processIncomingMessage(msg: Message, chatId: string, senderId: string) {
    const now = Date.now();
    const COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 Minutos de espera entre bloques
    const MAX_BLOCK_SIZE = 3;             // Máximo 3 mensajes por bloque
    const isGroupChat = chatId.includes('@g.us');

    if (isGroupChat) {
      // Ejecutar detección de conversación activa entre dos miembros (en background)
      this.detectGroupConversation(chatId, senderId, msg).catch(err => {
        console.error("[CONVERSATION-DETECTOR] Error:", err);
      });
    }

    const isMainGroup = chatId === this.targetGroupId;
    const textLower = (msg.body || "").toLowerCase();
    
    // Heurística para identificar posibles listados de propiedad/requerimiento
    const isPossibleListing = 
      (msg.body || "").length > 150 || 
      (msg.body || "").split('\n').length > 2 || 
      msg.hasMedia ||
      textLower.includes("ofrezco") ||
      textLower.includes("busco") ||
      textLower.includes("vendo") ||
      textLower.includes("arriendo") ||
      textLower.includes("compro") ||
      textLower.includes("necesito") ||
      textLower.includes("renta") ||
      textLower.includes("alquilo") ||
      textLower.includes("permuto") ||
      textLower.includes("casa") ||
      textLower.includes("apto") ||
      textLower.includes("apartamento") ||
      textLower.includes("bodega") ||
      textLower.includes("oficina") ||
      textLower.includes("lote") ||
      textLower.includes("local");

    let cooldown = this.cooldownMap.get(senderId);

    // Verificación de Cooldown (Anti-Spam - Solo aplica en el grupo principal VECY INMUEBLES NETWORK y para posibles listings)
    // El cooldown es por grupo (no global): un aliado puede publicar en el Buzón o Círculo
    // aunque tenga cooldown activo en el grupo principal VECY INMUEBLES NETWORK.
    const cooldownKey = `${chatId}_${senderId}`; // Clave compuesta grupo + usuario
    cooldown = this.cooldownMap.get(cooldownKey) as AntiSpamState | undefined;
    if (isMainGroup && isPossibleListing && cooldown && (now - cooldown.lastBlockProcessedAt < COOLDOWN_PERIOD)) {
      if (isGroupChat) {
        try {
          await msg.react('⚠️');
        } catch (e) {}
        if (!cooldown.warningSent) {
          cooldown.warningSent = true;
          this.saveCooldowns();
          const rawPhone = (msg.author || msg.from).split("@")[0];
          const warningText = 
            `⚠️ *COOLDOWN ACTIVO (5 MINUTOS)* ⚠️\n\n` +
            `Hola @${rawPhone}, acabo de procesar con éxito tus primeras propiedades. ` +
            `Para cuidar la visibilidad de tus activos y no saturar la red de los aliados, te pido que por favor me colabores esperando los *5 minutos* de intervalo antes de enviar tu siguiente bloque (máximo 3 publicaciones).\n\n` +
            `¡Mis motores necesitan este breve descanso para mantener tus fichas técnicas al 100% de calidad! JanIA sigue atenta. 🏆🎯`;
          
          await this.queuedSend(chatId, warningText, {
            mentions: [senderId],
            quotedMessageId: msg.id._serialized
          });
          this.cooldownMap.set(cooldownKey, cooldown);
          this.saveCooldowns();
        }
      }
      return; // Detener procesamiento del mensaje excedente
    }

    const rawPhone = (msg.author || msg.from).split("@")[0];
    let realName = `Asesor +${rawPhone}`;
    try {
      const contact = await msg.getContact();
      if (contact) {
        realName = contact.pushname || contact.name || realName;
      }
    } catch (e: any) {
      console.warn(`[WHATSAPP-BOT] Falló msg.getContact() en _processIncomingMessage para ${senderId}:`, e.message || e);
    }
    try {
      const db = await getDb();
      if (db) {
        const [u] = await db.select().from(users).where(eq(users.phone, rawPhone)).limit(1);
        if (u && u.name && u.name.trim() !== "") {
          realName = u.name;
        }
      }
    } catch (dbErr) {
      console.warn(`[WHATSAPP-BOT] Error al buscar nombre en BD para ${rawPhone}:`, dbErr);
    }
    const bufferKey = `${chatId}_${senderId}`;
    let buffer = this.messageBuffers.get(bufferKey);

    // NOTA: La descarga de media (downloadMedia) se realiza en processBuffer, NO aquí.
    // Hacerla aquí causaba una condición de carrera: los mensajes de un álbum de imágenes
    // llegan casi simultáneamente, y el await de downloadMedia hacía que todos leyeran
    // el buffer vacío antes de que el primero lo creara, generando advertencias falsas.
    
    if (buffer) {
      // Si el bloque ya llegó al límite de mensajes, advertimos (solo en grupo principal y para listings) y descartamos los excedentes
      const limit = isMainGroup ? MAX_BLOCK_SIZE : 10;
      if (isPossibleListing && buffer.messages.length >= limit) {
        console.log(`[BUFFER] Límite de bloque (${limit}) alcanzado para ${senderId}. Mensaje #${buffer.messages.length + 1} descartado.`);
        if (isGroupChat && isMainGroup) {
          try {
            await msg.react('⚠️');
          } catch (e) {}
          if (!buffer.warningSent) {
            buffer.warningSent = true;
            const warningText = 
              `⚠️ *LÍMITE DE PUBLICACIÓN* ⚠️\n\n` +
              `Hola @${rawPhone}, detecté que estás enviando muchas publicaciones seguidas. ` +
              `Para cuidar la visibilidad de tus activos y no saturar el chat de los aliados, te pido que por favor me colabores con esta norma, ya que mis motores de extracción de datos solo pueden procesar un máximo de *3 publicaciones* por bloque a la vez.\n\n` +
              `¡Espera unos *5 minutos* y luego envía el siguiente grupo! Tus primeras 3 publicaciones ya están siendo procesadas y registradas. 🚀🎯`;
            
            await this.queuedSend(chatId, warningText, {
              mentions: [senderId],
              quotedMessageId: msg.id._serialized
            });
          }
        }
        return;
      }

      clearTimeout(buffer.timer);
      buffer.messages.push({
        body: msg.body,
        hasMedia: msg.hasMedia,
        imageBuffer: undefined, // Se descargará en processBuffer
        originalMsg: msg
      });
      console.log(`[BUFFER] Mensaje #${buffer.messages.length} agregado al buffer de ${senderId}.`);
      const bufferTimeout = isGroupChat ? 12000 : 800;
      buffer.timer = setTimeout(() => this.processBuffer(bufferKey), bufferTimeout);
    } else {
      // Inicio de un nuevo bloque
      console.log(`[BUFFER] Nuevo bloque iniciado para ${senderId}. Mensaje #1 registrado.`);
      const bufferTimeout = isGroupChat ? 12000 : 800;
      this.messageBuffers.set(bufferKey, {
        messages: [{
          body: msg.body,
          hasMedia: msg.hasMedia,
          imageBuffer: undefined, // Se descargará en processBuffer
          originalMsg: msg
        }],
        userName: realName,
        chatId,
        timer: setTimeout(() => this.processBuffer(bufferKey), bufferTimeout)
      });
    }
  }

  private async processBuffer(bufferKey: string) {
    const buffer = this.messageBuffers.get(bufferKey);
    if (!buffer) return;

    const userName = buffer.userName;
    const chatId = buffer.chatId;
    const senderId = bufferKey.split('_')[1];
    
    this.messageBuffers.delete(bufferKey);
    console.log(`[processBuffer] Iniciando procesamiento de ${buffer.messages.length} mensajes en buffer de ${senderId}.`);

    // DESCARGA DE MEDIA DIFERIDA: Se realiza aquí de forma secuencial, evitando la
    // condición de carrera que existía cuando se descargaba en handleIncomingMessage.
    for (const bufferedMsg of buffer.messages) {
      if (bufferedMsg.hasMedia && bufferedMsg.originalMsg.type === 'image' && !bufferedMsg.imageBuffer) {
        try {
          console.log(`[VISION] Descargando imagen para ${senderId}...`);
          const media = await bufferedMsg.originalMsg.downloadMedia();
          if (media && media.mimetype.startsWith('image/')) {
            bufferedMsg.imageBuffer = media.data;
          }
        } catch (err) {
          console.error('[VISION] Error descargando media diferida:', err);
        }
      }
      if (bufferedMsg.hasMedia && bufferedMsg.originalMsg.type === 'document' && !bufferedMsg.pdfBuffer) {
        try {
          console.log(`[DOCUMENT] Descargando PDF para ${senderId}...`);
          const media = await bufferedMsg.originalMsg.downloadMedia();
          if (media && media.mimetype === 'application/pdf') {
            bufferedMsg.pdfBuffer = media.data;
            bufferedMsg.pdfMimeType = media.mimetype;
          }
        } catch (err) {
          console.error('[DOCUMENT] Error descargando documento diferido:', err);
        }
      }
      if (bufferedMsg.hasMedia && (bufferedMsg.originalMsg.type === 'ptt' || bufferedMsg.originalMsg.type === 'audio') && !bufferedMsg.audioUrl) {
        try {
          console.log(`[AUDIO] Descargando audio/ptt para ${senderId}...`);
          const media = await bufferedMsg.originalMsg.downloadMedia();
          if (media && media.data) {
            const cleanMime = media.mimetype.split(';')[0].trim();
            const bufferData = Buffer.from(media.data, 'base64');

            // Transcribir directamente a partir del buffer (evitamos fallos críticos si storage no está configurado)
            console.log(`[AUDIO] Transcribiendo audio directamente desde el buffer de memoria para ${senderId}...`);
            try {
              const text = await transcribeAudioBuffer(bufferData, cleanMime);
              bufferedMsg.body = text;
              console.log(`[AUDIO] Transcripción directa exitosa para ${senderId}: "${text}"`);
            } catch (transcribeErr: any) {
              console.error('[AUDIO] Error al transcribir el buffer de audio:', transcribeErr.message || transcribeErr);
              bufferedMsg.body = "";
            }

            // Opcionalmente subir a storage para obtener URL pública de Whisper/historial
            try {
              const fileKey = `voice-notes/${senderId}-${Date.now()}.${getAudioExtension(cleanMime)}`;
              const uploadResult = await storagePut(fileKey, bufferData, cleanMime);
              bufferedMsg.audioUrl = uploadResult.url;
              console.log(`[AUDIO] Audio subido exitosamente a storage para ${senderId}. URL: ${bufferedMsg.audioUrl}`);
            } catch (storageErr: any) {
              console.warn('[AUDIO] Advertencia: No se pudo subir el audio a storage (puede deberse a falta de credenciales de Forge localmente):', storageErr.message || storageErr);
            }
          }
        } catch (err) {
          console.error('[AUDIO] Error procesando audio diferido:', err);
        }
      }
    }

    try {
      // 1. Identificar si hay múltiples publicaciones independientes en el buffer.
      // Un mensaje con un enlace permitido se considera una publicación independiente (standalone).
      const hasPermittedLink = (text: string) => {
        const urlMatch = text.match(/https?:\/\/[^\s]+/g);
        if (!urlMatch) return false;
        return urlMatch.some(url => esDominioPermitido(url));
      };

      // Helper para partir un mensaje largo en múltiples listings si viene numerado
      const partitionTextByListings = (text: string): string[] => {
        const lines = text.split('\n');
        const listings: string[] = [];
        let currentListing: string[] = [];
        let header = "";

        const itemRegex = /^\s*(\d+)\s*[-.)]\s*(?:ofrezco|busco|vendo|arriendo|apto|casa|bodega|oficina|lote|requerimiento|compro|necesito|local)/i;

        for (const line of lines) {
          const match = line.match(itemRegex);
          if (match) {
            if (currentListing.length > 0) {
              listings.push(currentListing.join('\n'));
              currentListing = [];
            }
            currentListing.push(line);
          } else {
            if (listings.length === 0 && currentListing.length === 0) {
              header += line + '\n';
            } else {
              currentListing.push(line);
            }
          }
        }
        if (currentListing.length > 0) {
          listings.push(currentListing.join('\n'));
        }

        if (listings.length > 1) {
          return listings.map(l => (header.trim() ? header + '\n' + l : l));
        }

        return [text];
      };

      // Agrupar mensajes en sub-bloques independientes por links
      const linkGroups: BufferedMessage[][] = [];
      let currentLinkGroup: BufferedMessage[] = [];

      for (const m of buffer.messages) {
        currentLinkGroup.push(m);
        if (hasPermittedLink(m.body)) {
          linkGroups.push(currentLinkGroup);
          currentLinkGroup = [];
        }
      }
      if (currentLinkGroup.length > 0) {
        linkGroups.push(currentLinkGroup);
      }

      // Desglosar cada grupo de links por si contiene listings numerados (ej: Diego Gómez)
      const finalListingTexts: { text: string; hasMedia: boolean; hasAudio: boolean; imageBuffer?: string; audioUrl?: string; pdfBuffer?: string; pdfMimeType?: string; originalMsg: Message }[] = [];
      for (const group of linkGroups) {
        const groupText = group.map(m => m.body).join('\n\n');
        const groupHasMedia = group.some(m => m.hasMedia);
        const groupHasAudio = group.some(m => m.originalMsg.type === 'ptt' || m.originalMsg.type === 'audio');
        const groupImageBuffer = group.find(m => m.imageBuffer)?.imageBuffer;
        const groupAudioUrl = group.find(m => m.audioUrl)?.audioUrl;
        const groupPdfBuffer = group.find(m => m.pdfBuffer)?.pdfBuffer;
        const groupPdfMimeType = group.find(m => m.pdfMimeType)?.pdfMimeType;
        const originalMsg = group[group.length - 1].originalMsg;

        const partitioned = partitionTextByListings(groupText);
        for (const itemText of partitioned) {
          finalListingTexts.push({
            text: itemText,
            hasMedia: groupHasMedia,
            hasAudio: groupHasAudio,
            imageBuffer: groupImageBuffer,
            audioUrl: groupAudioUrl,
            pdfBuffer: groupPdfBuffer,
            pdfMimeType: groupPdfMimeType,
            originalMsg
          });
        }
      }

      console.log(`[processBuffer] Procesando ${finalListingTexts.length} listings para ${senderId} de un total de ${buffer.messages.length} mensajes en buffer.`);

      // Procesar secuencialmente aplicando el límite estricto de 3 listings (solo en grupo principal)
      let processedListingsCount = 0;
      let warningSent = buffer.warningSent || false;
      const isMainGroup = chatId === this.targetGroupId;
      const limit = isMainGroup ? 3 : 10;

      for (const item of finalListingTexts) {
        const isImageMessage = item.hasMedia && item.originalMsg.type === 'image';
        if (!item.text.trim() && !isImageMessage) {
          console.log(`[processBuffer] Saltando mensaje vacío (sin texto ni imagen) para ${senderId}`);
          continue;
        }

        processedListingsCount++;
        
        if (processedListingsCount > limit) {
          console.log(`[processBuffer] Listing #${processedListingsCount} excede el límite de ${limit} para ${senderId}.`);
          if (isMainGroup) {
            try {
              await item.originalMsg.react('⚠️');
            } catch (e) {}

            if (!warningSent && chatId.includes('@g.us')) {
              warningSent = true;
              const rawPhone = senderId.split("@")[0];
              const warningText = 
                `⚠️ *LÍMITE DE PUBLICACIÓN* ⚠️\n\n` +
                `Hola @${rawPhone}, detecté que estás enviando muchas publicaciones seguidas en tu mensaje/bloque. ` +
                `Para cuidar la visibilidad de tus activos y no saturar el chat de los aliados, te pido que por favor me colabores con esta norma, ya que mis motores de extracción de datos solo pueden procesar un máximo de *3 publicaciones* por bloque a la vez.\n\n` +
                `¡Tus primeras 3 publicaciones ya están en proceso! Por favor espera unos *5 minutos* antes de enviar las siguientes. 🚀🎯`;
              
              await this.queuedSend(chatId, warningText, {
                mentions: [senderId],
                quotedMessageId: item.originalMsg.id._serialized
              });
            }
          }
          continue;
        }

        // 1. Log en DB
        await this.logToDb(senderId, 'user', item.text);

        // 2. Scraping
        const urlMatch = item.text.match(/https?:\/\/[^\s]+/g);
        const scrapedResults: any[] = [];
        if (urlMatch) {
          for (const url of urlMatch.slice(0, 3)) {
            if (esDominioPermitido(url)) {
              try {
                const data = await scrapePropertyLink(url);
                if (data) scrapedResults.push(data);
              } catch (err) {}
            }
          }
        }

        // 3. Procesamiento JanIA
        const isDM = !chatId.includes('@g.us');
        const pending = isDM ? this.pendingData.get(senderId) : null;

        let result;
        if (chatId === this.buzonGroupId) {
          result = await processConsultingMessage(item.text, senderId, userName, item.imageBuffer, item.pdfBuffer, item.pdfMimeType);
        } else if (chatId === this.circuloGroupId) {
          result = await processCirculoMessage(item.text, senderId, userName);
        } else {
          if (pending && Date.now() < pending.expiresAt) {
            const combinedText = `[CONTEXTO]: "${pending.originalText}"\n[RESPUESTA]: "${item.text}"`;
            this.pendingData.delete(senderId);
            this.savePendingData();
            result = await processWhatsAppMessage(combinedText, senderId, userName, false, [], undefined, item.imageBuffer, !isDM, item.pdfBuffer, item.pdfMimeType);
          } else {
            result = await processWhatsAppMessage(item.text, senderId, userName, item.hasMedia, scrapedResults, item.audioUrl, item.imageBuffer, !isDM, item.pdfBuffer, item.pdfMimeType);
          }
        }

        // 4. Orquestación de Respuestas (Silencio de Oro / Flujos DM)
        const textLower = item.text.toLowerCase();
        const wantsVoice = item.hasAudio || !!item.audioUrl || detectaVoz(textLower);
        await this.handleJanIAResponse(result, senderId, chatId, userName, item.text, item.originalMsg, wantsVoice);
      }

      // 5. ACTIVAR COOLDOWN DE 5 MINUTOS (Tras procesar con éxito - solo en grupo principal)
      // La clave incluye el chatId para que el cooldown sea por grupo (no global por usuario)
      if (isMainGroup) {
        const cooldownKeyFinal = `${chatId}_${senderId}`;
        this.cooldownMap.set(cooldownKeyFinal, {
          lastBlockProcessedAt: Date.now(),
          warningSent: warningSent
        });
        this.saveCooldowns();
      }

    } catch (e) {
      console.error('[WHATSAPP-BOT] Error crítico en procesamiento de bloque:', e);
    }
  }

  // --- DETECTOR DE CONVERSACIÓN ACTIVA ENTRE MIEMBROS ---
  private async detectGroupConversation(chatId: string, senderId: string, msg: Message) {
    return; // Desactivado para evitar el envío de audios/textos intrusivos no solicitados a miembros del grupo (anti-ban)
    const isModeratedGroup = chatId === this.targetGroupId || chatId === this.buzonGroupId || chatId === this.circuloGroupId;
    if (!isModeratedGroup) return;

    // Ignorar si el mensaje es del propio bot o fromMe
    const botJid = this.client.info?.wid?._serialized;
    if (senderId === botJid || msg.fromMe) return;

    // Ignorar si parece un listado de propiedad, requerimiento o contenido multimedia (excepto notas de voz)
    const isPossibleListingMsg = 
      (msg.body || "").length > 250 || 
      (msg.body || "").split('\n').length > 3 ||
      (msg.hasMedia && msg.type !== 'ptt' && msg.type !== 'audio');
    if (isPossibleListingMsg) return;

    const now = Date.now();
    let recent = this.recentGroupMessages.get(chatId) || [];

    // Filtrar mensajes de los últimos 3 minutos
    recent = recent.filter(m => now - m.timestamp < 3 * 60 * 1000);

    // Agregar el nuevo mensaje
    recent.push({
      senderId,
      timestamp: now,
      body: msg.body || ""
    });
    this.recentGroupMessages.set(chatId, recent);

    // Agrupar mensajes consecutivos del mismo remitente
    const grouped: { senderId: string; count: number }[] = [];
    for (const m of recent) {
      if (grouped.length === 0 || grouped[grouped.length - 1].senderId !== m.senderId) {
        grouped.push({ senderId: m.senderId, count: 1 });
      } else {
        grouped[grouped.length - 1].count++;
      }
    }

    // Si tenemos al menos 4 alternancias (A -> B -> A -> B)
    const len = grouped.length;
    if (len >= 4) {
      const s1 = grouped[len - 4].senderId;
      const s2 = grouped[len - 3].senderId;
      const s3 = grouped[len - 2].senderId;
      const s4 = grouped[len - 1].senderId; // Actual

      // Verificar patrón alternante estricto entre exactamente 2 remitentes
      if (s1 === s3 && s2 === s4 && s1 !== s2) {
        // Cooldown de advertencia de conversación: 15 minutos por grupo
        const lastWarning = this.lastConversationWarningTime.get(chatId) || 0;
        if (now - lastWarning < 15 * 60 * 1000) {
          return;
        }

        this.lastConversationWarningTime.set(chatId, now);
        console.log(`[CONVERSATION-DETECTOR] Conversación activa detectada en ${chatId} entre ${s3} y ${s4}.`);

        // Enviar indicador "Grabando audio..."
        try {
          const chat = await msg.getChat();
          await chat.sendStateRecording();
        } catch (_) {}

        const voiceText = "Hola colegas... detecté que están conversando activamente en el grupo... Para cuidar el espacio de todos los aliados y no saturar el canal, les sugiero amablemente que continúen su charla por mensaje privado... ¡Muchas gracias, hagamos equipo y cerremos negocios!";
        
        console.log(`[CONVERSATION-DETECTOR] Generando audio de advertencia...`);
        const voiceMedia = await textToSpeechMedia(voiceText);
        if (voiceMedia) {
          // Enviar nota de voz
          await this.queuedSend(chatId, voiceMedia, { sendAudioAsVoice: true });
          
          // Enviar mensaje de texto con menciones justo después
          const rawPhoneA = s3.split("@")[0];
          const rawPhoneB = s4.split("@")[0];
          const tagText = `👉 @${rawPhoneA} @${rawPhoneB}, por favor continúen por mensaje privado (DM) para no saturar el grupo. ¡Gracias! 🤝`;
          
          await this.queuedSend(chatId, tagText, {
            mentions: [s3, s4],
            quotedMessageId: msg.id._serialized
          });
          
          console.log(`[CONVERSATION-DETECTOR] Advertencia enviada con éxito a ${chatId}.`);
        }
      }
    }
  }

  // --- ORQUESTACIÓN DE RESPUESTAS Y PERSONALIZACIÓN (JanIA v2.0) ---
  private async handleJanIAResponse(result: any, senderId: string, chatId: string, userName: string, fullText: string, originalMsg?: Message, wantsVoice: boolean = false) {
    if (!result) return;

    // Control de antigüedad: Omitir envíos de WhatsApp para mensajes procesados con más de 2 horas de retraso (evita responder audios/textos de ayer)
    const isOldMessage = originalMsg && (Math.floor(Date.now() / 1000) - originalMsg.timestamp > 2 * 60 * 60);
    if (isOldMessage) {
      console.log(`[WHATSAPP-BOT] Mensaje de ${senderId} en ${chatId} tiene más de 2 horas de antigüedad (${Math.round((Date.now() / 1000 - originalMsg.timestamp) / 60)} min). Registrado en DB, omitiendo respuesta en WhatsApp.`);
      return;
    }

    const isGroup = chatId.includes('@g.us');
    // MATCH COMERCIAL DETECTADO es el string real en el response de JanIA
    const isMatch = result.response && (
      result.response.includes("MATCH COMERCIAL DETECTADO") || 
      result.response.includes("MATCH DETECTADO") || 
      result.response.includes("MATCH INTELIGENTE DETECTADO") ||
      result.response.includes("COINCIDENCIA DE NEGOCIO DETECTADA")
    );
    const isConsultation = 
      result.classification === "CONSULTA_GENERAL" || 
      result.classification === "RESPUESTA_A_PREGUNTA_IA" || 
      result.classification === "INMUEBLE" || 
      result.classification === "REQUERIMIENTO" || 
      result.classification === "AVALUO_O_LEGAL" || 
      result.classification === "DEBATE_COMPETIDOR" ||
      result.classification === "SOBRE_VECY";
    const isViolation = result.classification === "VIOLACION_DE_NORMAS";

    // 1. Manejo de Infracciones y Permisos Admin (si es un grupo)
    let isBotAdmin = false;
    let chat: any = null;
    let strike = 0;

    if (isGroup && originalMsg) {
      try {
        chat = await originalMsg.getChat();
        const botId = this.client.info?.wid?._serialized;
        if (botId && chat.participants) {
          const botParticipant = chat.participants.find((p: any) => p.id._serialized === botId);
          isBotAdmin = botParticipant?.isAdmin || botParticipant?.isSuperAdmin || false;
        }
      } catch (err) {
        console.error('[WHATSAPP-BOT] Error al verificar permisos de administrador del bot:', err);
      }
    }

    if (isViolation && isGroup) {
      // Registrar e incrementar strike
      strike = this.incrementStrike(chatId, senderId);
      const phone = senderId.split('@')[0];

      // Borrar mensaje infractor si es admin
      if (isBotAdmin && originalMsg) {
        try {
          console.log(`[WHATSAPP-BOT] Borrando mensaje infractor de ${senderId} en el grupo ${chatId}`);
          await originalMsg.delete(true);
        } catch (delErr: any) {
          console.error('[WHATSAPP-BOT] Error al borrar mensaje infractor:', delErr.message || delErr);
        }
      }

      // Estructurar el encabezado de strike
      let strikeHeader = '';
      if (strike === 1) {
        strikeHeader = `⚠️ *LLAMADO DE ATENCIÓN [1/3]* ⚠️\n\n`;
      } else if (strike === 2) {
        strikeHeader = `⚠️ *SEGUNDO LLAMADO DE ATENCIÓN [2/3]* ⚠️\n\n`;
      } else {
        strikeHeader = `🚨 *EXPULSIÓN AUTOMÁTICA [3/3]* 🚨\n\n`;
      }

      if (strike >= 3) {
        result.response = `${strikeHeader}Colega @${phone}, has acumulado 3 llamados de atención por publicar contenido no permitido en el grupo.\n\nProcediendo a la expulsión automática del canal para cuidar el orden de la comunidad de aliados...`;
      } else {
        result.response = `${strikeHeader}${result.response}`;
      }

      if (!isBotAdmin) {
        result.response += `\n\n_(Nota: Por favor nombra a JanIA Administradora del grupo para que pueda borrar los posts prohibidos e implementar la expulsión automática de infractores)._`;
      }
    }

    // Notificación en el grupo o DM (evitando duplicar si se procesará abajo en shouldSendDM)
    const shouldSendGroup = isGroup && (isMatch || isConsultation || isViolation);
    const shouldSendDMDirect = !isGroup && !result.shouldSendDM;

    const textToDeliver = result.response || "";
    const voiceToDeliver = result.voiceResponse || "";
    const hasAnyContent = textToDeliver.trim() !== "" || voiceToDeliver.trim() !== "";

    if ((shouldSendGroup || shouldSendDMDirect) && hasAnyContent) {
      const mentions = Array.from(new Set([...(result.mentions || []), senderId]));
      const options: any = { 
        mentions: isGroup ? mentions : [] 
      };
      if (isViolation && originalMsg) {
        options.quotedMessageId = originalMsg.id._serialized;
      }

      // Decidir si enviar audio: solo si el mensaje original fue un audio o el usuario lo solicitó explícitamente
      const finalWantsVoice = wantsVoice || result.wantsVoice;

      if (finalWantsVoice) {
        // Mostrar "Grabando audio..." inmediatamente durante la síntesis y transcodificación
        try {
          const chatInstance = chat || await this.client.getChatById(chatId);
          await chatInstance.sendStateRecording();
        } catch (_) {}

        // Solo audio — sin texto. Si falla, cae al texto como respaldo.
        console.log(`[TTS] Generando voz para ${chatId}...`);
        const voiceText = voiceToDeliver || textToDeliver;
        const voiceMedia = await textToSpeechMedia(voiceText);
        if (voiceMedia) {
          await this.queuedSend(chatId, voiceMedia, { sendAudioAsVoice: true });
          console.log(`[TTS] ✓ Solo audio enviado a ${chatId}.`);
        } else {
          // Fallback: audio falló → enviar texto
          console.warn(`[TTS] Audio falló, enviando texto como respaldo a ${chatId}.`);
          const fallbackText = textToDeliver || voiceToDeliver;
          if (fallbackText.trim() !== "") {
            await this.queuedSend(chatId, fallbackText, options);
          }
        }
      } else {
        // Sin voz → texto normal
        if (textToDeliver.trim() !== "") {
          await this.queuedSend(chatId, textToDeliver, options);
        }
      }
      await this.logToDb(senderId, 'janIA', textToDeliver || voiceToDeliver);

      // Enviar REPUTATION_HOOK como mensaje separado para que resalte
      if (isGroup && result.sendReputationHook) {
        console.log(`[WhatsApp-Bot] Enviando REPUTATION_HOOK como mensaje separado a ${chatId}...`);
        await this.queuedSend(chatId, REPUTATION_HOOK);
      }

      // Si es el 3er strike y somos admin, procedemos a retirar al usuario
      if (isGroup && strike >= 3 && isBotAdmin && chat) {
        try {
          console.log(`[WHATSAPP-BOT] Retirando infractor ${senderId} del grupo ${chatId}`);
          await chat.removeParticipants([senderId]);
          this.resetStrikes(chatId, senderId);
        } catch (kickErr: any) {
          console.error('[WHATSAPP-BOT] Error al expulsar infractor:', kickErr.message || kickErr);
        }
      }
    }

    // Reaccionar con emojis a los mensajes para retroalimentación visual
    if (originalMsg) {
      try {
        let reaction = result.reactionEmoji;
        
        const isBuzonOrCirculo = chatId === this.buzonGroupId || chatId === this.circuloGroupId;
        if ((result.classification === "INMUEBLE" || result.classification === "REQUERIMIENTO" || result.classification === "DATOS_INCOMPLETOS") && !isBuzonOrCirculo) {
          reaction = '✅';
        } else if ((result.classification === "INMUEBLE" || result.classification === "REQUERIMIENTO" || result.classification === "AVALUO_O_LEGAL" || result.classification === "SOBRE_VECY") && isBuzonOrCirculo) {
          reaction = '🔄';
        } else if (result.classification === "VIOLACION_DE_NORMAS") {
          reaction = '❌';
        } else if (!reaction) {
          if (result.classification === "CONSULTA_GENERAL" || result.classification === "SOBRE_VECY" || result.classification === "AVALUO_O_LEGAL" || result.classification === "DEBATE_COMPETIDOR" || result.classification === "RESPUESTA_A_PREGUNTA_IA") {
            if (result.response && result.response.includes("chat.whatsapp.com")) {
              reaction = '🔄';
            } else {
              reaction = '💡';
            }
          }
        }
        if (reaction) {
          await originalMsg.react(reaction);
        }
      } catch (e) {
        console.error('[React-Error] Fallo al reaccionar al mensaje original:', e);
      }
    }

    // Flujos Privados (DMs) o Invitación a Opt-in
    if (result.shouldSendDM) {
      const dmMsg = result.dmResponse || result.response || "";
      const voiceMsg = result.voiceResponse || "";
      const hasDMContent = dmMsg.trim() !== "" || voiceMsg.trim() !== "";
      if (hasDMContent) {
        if (isGroup) {
          // Desactivado para evitar reportes de spam / bloqueos de WhatsApp al enviar DMs automáticos no solicitados a miembros de grupos.
          console.log(`[WHATSAPP-BOT] Omitiendo DM automático para ${senderId} por DATOS_INCOMPLETOS desde grupo para prevenir reportes de spam.`);
        } else {
          // Chat privado (DM)
          const options: any = {};
          if (result.dmShouldReply && originalMsg) {
            options.quotedMessageId = originalMsg.id._serialized;
          }

          const finalWantsVoice = wantsVoice || result.wantsVoice;
          if (finalWantsVoice) {
            // Mostrar "Grabando audio..." inmediatamente durante la síntesis y transcodificación en el DM
            try {
              const dmChat = await this.client.getChatById(senderId);
              await dmChat.sendStateRecording();
            } catch (_) {}

            // Solo audio
            console.log(`[TTS] Generando voz para ${senderId}...`);
            const voiceText = voiceMsg || dmMsg;
            const media = await textToSpeechMedia(voiceText);
            if (media) {
              await this.queuedSend(senderId, media, { sendAudioAsVoice: true });
              console.log(`[TTS] ✓ Solo audio enviado a ${senderId}.`);
            } else {
              // Fallback: audio falló → texto
              console.warn(`[TTS] Audio falló, enviando texto a ${senderId}.`);
              const fallbackText = dmMsg || voiceMsg;
              if (fallbackText.trim() !== "") {
                await this.queuedSend(senderId, fallbackText, options);
              }
            }
          } else {
            if (dmMsg.trim() !== "") {
              await this.queuedSend(senderId, dmMsg, options);
            }
          }
          await this.logToDb(senderId, 'janIA', `[DM] ${dmMsg || voiceMsg}`);
        }
      }

      // Guardar pendiente si faltan datos
      if (isGroup && result.classification === "DATOS_INCOMPLETOS") {
        this.pendingData.set(senderId, {
          originalText: fullText,
          extractedData: result.extractedData || {},
          classification: result.classification,
          missingFields: result.missingFields || [],
          expiresAt: Date.now() + 2 * 60 * 60 * 1000
        });
        this.savePendingData();
      }
    }
    // Enviar DMs extra de confirmación
    if (result.extraDMs && result.extraDMs.length > 0) {
      for (const dm of result.extraDMs) {
        try {
          if (!dm.jid || !dm.jid.includes('@') || dm.jid.split('@')[0].length < 5) {
            console.warn(`[JanIA-MatchDM] Omitiendo JID inválido para confirmación de match: ${dm.jid}`);
            continue;
          }
          console.log(`[JanIA-MatchDM] Enviando confirmación de match a ${dm.jid}...`);
          await this.queuedSend(dm.jid, dm.message);
          await this.logToDb(dm.jid, 'janIA', `[Match-DM-Request] ${dm.message}`);
        } catch (err: any) {
          console.error(`[JanIA-MatchDM-Error] Fallo al enviar DM a ${dm.jid}:`, err.message || err);
        }
      }
    }
  }

  // --- LOGÍSTICA DE BASE DE DATOS ---
  private async logToDb(senderId: string, role: 'user' | 'janIA', content: string) {
    try {
      const db = await getDb();
      if (!db) return;

      let conv = await db.select().from(conversations).where(eq(conversations.sessionId, senderId)).limit(1);
      let conversationId: number;

      if (conv.length === 0) {
        const [newConv] = await db.insert(conversations).values({
          sessionId: senderId,
          status: 'active',
          lastMessage: content.substring(0, 200)
        }).returning();
        conversationId = newConv.id;
      } else {
        conversationId = conv[0].id;
      }

      await db.insert(dbMessages).values({
        conversationId,
        role,
        content,
        messageType: 'text'
      });

      await db.update(conversations).set({
        lastMessage: content.substring(0, 200),
        updatedAt: new Date()
      }).where(eq(conversations.id, conversationId));

    } catch (e) {}
  }

  // --- COMANDOS ADMINISTRATIVOS ---
  private async handleAdminCommand(msg: Message) {
    const chat = await msg.getChat();
    const senderId = (msg as any).author || msg.from;
    const participant = (chat as any).participants?.find((p: any) => p.id._serialized === senderId);
    const isAdmin = participant?.isAdmin || participant?.isSuperAdmin || msg.fromMe;

    if (!isAdmin) return;

    const text = msg.body.toLowerCase();
    if (text.includes('normas')) await this.sendNormas();
    else if (text.includes('preséntate')) {
      await this.sendPresentacion();
      setTimeout(() => this.sendNormas(), 4000);
    }
    else if (text.includes('anuncia match') || text.includes('comunica match')) await this.sendComunicadoMatch();
    else if (text.includes('anuncia')) await this.sendAnuncioComision();
    else if (text.includes('dipava')) await this.sendApologyDeLaPava();
    else if (text.includes('retorno')) await this.sendAnuncioRetorno();
    else if (text.includes('sincroniza') || text.includes('catchup')) await this.catchUpMissedMessages();
    else if (text.includes('cierre') || text.includes('audios')) await this.sendManualCierreAudios();
  }

  // --- MÉTODOS DE BROADCAST ---
  public async sendBatchWelcome() {
    const count = this.pendingWelcomeCount;
    this.pendingWelcomeCount = 0;
    this.pendingWelcomeJids = [];
    this.saveCounter();

    try {
      const welcome = await generateWelcomeMessage(count);
      await this.queuedSend(this.targetGroupId, welcome);
    } catch (e: any) {
      console.error("[Whatsapp-Bot] Error in sendBatchWelcome:", e.message);
    }
  }

  public async sendPresentacion() {
    await this.queuedSend(this.targetGroupId, MSG_PRESENTACION_INSTITUCIONAL);
  }

  public async sendNormas() {
    await this.queuedSend(this.targetGroupId, MSG_PAUTAS_FORMATOS);
  }


  public async sendAnuncioComision() {
    const msg = `📢 *ANUNCIO:* Seguimos en etapa de prueba gratuita. VECY no cobra comisiones por los matches generados en este grupo. ¡A cerrar negocios! 🎯🏆`;
    await this.queuedSend(this.targetGroupId, msg);
  }

  public async sendApologyDeLaPava() {
    const deLaPavaId = '105188731928753@lid';
    await this.queuedSend(this.targetGroupId, `🙏 Ajuste de sistema realizado. Cobertura nacional elástica activada para todos los aliados.`);
    await this.queuedSend(deLaPavaId, `Su requerimiento nacional ha sido indexado con éxito. ¡JanIA sigue atenta!`);
  }

  public async sendAnuncioRetorno() {
    const baseMsg = `🚀 *¡JANIA ESTÁ DE VUELTA Y MÁS AFILADA QUE NUNCA!* 🤖🏛️\n\n` +
      `¡Hola de nuevo, colegas y aliados! 👋 Tras un breve ajuste técnico para fortalecer nuestra infraestructura y preparar el lanzamiento del nuevo portal web privado, estoy de vuelta en el canal para encontrar esos MATCH tan deseados.\n\n` +
      `Vuelvo con mi *Cerebro Multimodal v2.0* repotenciado y mis sensores más afilados que nunca para cuidar la calidad de la red y acelerar nuestros cierres:\n\n` +
      `🧠 *¿Qué puedo hacer por ti en esta v2.0?*\n` +
      `▸ *Ofertas Express (Links):* Comparte el enlace de tus inmuebles de cualquier portal o CRM, y extraeré la ficha técnica en segundos.\n` +
      `▸ *Escáner de Flyers (OCR):* ¿Tienes fotos de inmuebles o requerimientos con texto? Súbelas al grupo y leeré la información dentro de la imagen.\n` +
      `▸ *Permutas e Intercambios (Voz o Texto):* Escríbeme o envíame un audio detallando permutas complejas como:\n` +
      `  * 🔄 *Mano a mano / Pelo a pelo* (intercambio directo de inmuebles de valor similar).\n` +
      `  * 🏠➕💵 *Inmueble de menor valor* como parte de pago por uno de mayor valor.\n` +
      `  * 🚗 *Vehículos* recibidos como parte de pago.\n` +
      `  * 📈 *CDTs, divisas o activos alternativos* como complemento de negocio.\n` +
      `▸ *Matching Inteligente:* Cruzo ofertas y demandas en tiempo real y les aviso en el acto cuando hay negocio viable.`;

    const jidsToMention: string[] = [];
    let welcomePart = '';
    if (this.pendingWelcomeJids && this.pendingWelcomeJids.length > 0) {
      welcomePart += `\n\n━━━━━━━━━━━━━━━━━━━━━━\n` +
             `✨ *¡BIENVENIDOS A LA RED VECY NETWORK!* ✨\n` +
             `Damos una calurosa bienvenida a los nuevos aliados que se han unido a nuestro ecosistema colaborativo:\n`;
      
      this.pendingWelcomeJids.forEach((jid) => {
        const phone = jid.split('@')[0];
        welcomePart += `▸ @${phone}\n`;
        jidsToMention.push(jid);
      });
      
      welcomePart += `\nYa estoy 100% activa para escanear sus publicaciones y buscarles cierres sin cobro de comisiones. ¡Muchos éxitos en sus negocios! 🚀🎯`;
    }

    const groups = [this.targetGroupId, this.buzonGroupId, this.circuloGroupId];
    const imgPath = path.resolve('./client/public/jania_perfil.png');

    for (const group of groups) {
      try {
        const isMain = group === this.targetGroupId;
        const msgToSend = isMain ? (baseMsg + welcomePart) : baseMsg;
        const mentions = isMain ? jidsToMention : [];

        if (fs.existsSync(imgPath)) {
          const media = MessageMedia.fromFilePath(imgPath);
          await this.queuedSend(group, media, { caption: msgToSend, mentions });
        } else {
          await this.queuedSend(group, msgToSend, { mentions });
        }
      } catch (e: any) {
        console.error(`Error enviando anuncio de retorno al grupo ${group}:`, e.message);
      }
    }

    if (this.pendingWelcomeJids && this.pendingWelcomeJids.length > 0) {
      this.pendingWelcomeJids = [];
      this.pendingWelcomeCount = 0;
      this.saveCounter();
    }
  }

  public async sendComunicadoMatch() {
    try {
      console.log(`[WHATSAPP-BOT] Enviando comunicado de notificaciones de match...`);
      await this.queuedSend(this.targetGroupId, MSG_COMUNICADO_MATCH_NETWORK);
      await delay(3000);
      await this.queuedSend(this.circuloGroupId, MSG_COMUNICADO_MATCH_CIRCULO);
      console.log("[WHATSAPP-BOT] Comunicado de match enviado con éxito.");
    } catch (err: any) {
      console.error("[WHATSAPP-BOT] Error al enviar el comunicado de match:", err.message || err);
    }
  }

  public async sendToGroup(text: string, mediaPath?: string, mentions?: string[], groupId?: string) {
    try {
      const options: any = { mentions: mentions || [] };
      const target = groupId || this.targetGroupId;

      if (mediaPath) {
        const media = MessageMedia.fromFilePath(path.resolve(mediaPath));
        await this.queuedSend(target, media, { ...options, caption: text });
      } else {
        await this.queuedSend(target, text, options);
      }
    } catch (e) {
      console.error(`[WHATSAPP-BOT] Error enviando mensaje al grupo ${groupId || this.targetGroupId}:`, e);
    }
  }

  public async sendVoiceToGroup(text: string, groupId?: string) {
    try {
      const target = groupId || this.targetGroupId;
      console.log(`[WHATSAPP-BOT] Generando nota de voz para enviar al grupo ${target}...`);
      const voiceMedia = await textToSpeechMedia(text);
      if (voiceMedia) {
        try {
          const chatInstance = await this.client.getChatById(target);
          await chatInstance.sendStateRecording();
        } catch (_) {}
        
        await this.queuedSend(target, voiceMedia, { sendAudioAsVoice: true });
        console.log(`[WHATSAPP-BOT] ✓ Nota de voz enviada al grupo ${target}.`);
      } else {
        console.warn(`[WHATSAPP-BOT] TTS falló para el grupo ${target}, enviando texto.`);
        await this.queuedSend(target, text);
      }
    } catch (e) {
      console.error('[WHATSAPP-BOT] Error enviando nota de voz al grupo:', e);
    }
  }

  public async broadcastToAllGroups(text: string, mediaPath?: string, mentions?: string[]) {
    const groups = [this.targetGroupId, this.buzonGroupId, this.circuloGroupId];
    for (const group of groups) {
      try {
        const options: any = { mentions: mentions || [] };
        if (mediaPath) {
          const media = MessageMedia.fromFilePath(path.resolve(mediaPath));
          await this.queuedSend(group, media, { ...options, caption: text });
        } else {
          await this.queuedSend(group, text, options);
        }
      } catch (err: any) {
        console.error(`[WHATSAPP-BOT] Error al transmitir al grupo ${group}:`, err.message || err);
      }
    }
  }

  public async broadcastGroupPromos(mediaPath?: string) {
    const promos = [
      { id: this.targetGroupId, msg: MSG_PROMO_INMUEBLES },
      { id: this.buzonGroupId, msg: MSG_PROMO_CONSULTAS },
      { id: this.circuloGroupId, msg: MSG_PROMO_CIRCULO }
    ];

    for (const promo of promos) {
      try {
        if (mediaPath && fs.existsSync(path.resolve(mediaPath))) {
          const media = MessageMedia.fromFilePath(path.resolve(mediaPath));
          await this.queuedSend(promo.id, media, { caption: promo.msg });
        } else {
          await this.queuedSend(promo.id, promo.msg);
        }
      } catch (err: any) {
        console.error(`[WHATSAPP-BOT] Error al transmitir promo al grupo ${promo.id}:`, err.message || err);
      }
    }
  }

  public async sendOtherPromosNow(mediaPath?: string) {
    const promos = [
      { id: this.buzonGroupId, msg: MSG_PROMO_CONSULTAS },
      { id: this.circuloGroupId, msg: MSG_PROMO_CIRCULO }
    ];

    for (const promo of promos) {
      try {
        if (mediaPath && fs.existsSync(path.resolve(mediaPath))) {
          const media = MessageMedia.fromFilePath(path.resolve(mediaPath));
          await this.queuedSend(promo.id, media, { caption: promo.msg });
        } else {
          await this.queuedSend(promo.id, promo.msg);
        }
      } catch (err: any) {
        console.error(`[WHATSAPP-BOT] Error al transmitir promo al grupo ${promo.id}:`, err.message || err);
      }
    }
  }


  public async exportRecentJoinsToFile() {
    try {
      console.log('[WHATSAPP-BOT] Exportando lista de recientes uniones al grupo...');
      const chat = await this.client.getChatById(this.targetGroupId);
      if (!chat) {
        console.error('[WHATSAPP-BOT] No se pudo obtener el chat del grupo.');
        return;
      }
      
      const messages = await chat.fetchMessages({ limit: 50 });
      console.log(`[WHATSAPP-BOT] Analizando ${messages.length} mensajes en búsqueda de uniones...`);
      
      const joinList: any[] = [];
      
      for (const msg of messages) {
        const isSystemJoin = msg.type === 'gp2' || msg.type === 'notification' || 
                             (msg.body && (
                               msg.body.toLowerCase().includes('unió') || 
                               msg.body.toLowerCase().includes('unio') || 
                               msg.body.toLowerCase().includes('joined') || 
                               msg.body.toLowerCase().includes('añadió') || 
                               msg.body.toLowerCase().includes('añadio') || 
                               msg.body.toLowerCase().includes('added')
                             ));
                             
        if (isSystemJoin) {
          const timestamp = msg.timestamp * 1000;
          const date = new Date(timestamp).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
          
          const author = msg.author || msg.from;
          const phone = author ? author.split('@')[0] : 'Desconocido';
          
          let contactName = 'Desconocido';
          if (author) {
            try {
              // Retardo de 500ms para evitar spam a la API de WhatsApp
              await new Promise(resolve => setTimeout(resolve, 500));
              const contact = await this.client.getContactById(author);
              contactName = contact.name || contact.pushname || '';
            } catch (e) {}
          }
          
          joinList.push({
            fecha: date,
            timestamp: timestamp,
            telefono: phone,
            nombre: contactName,
            mensaje: msg.body || `Mensaje de sistema de tipo ${msg.type}`
          });
        }
      }
      
      joinList.sort((a, b) => b.timestamp - a.timestamp);
      
      let fileContent = `=== LISTADO DE UNIONES RECIENTES EN EL GRUPO ===\nGenerado el: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}\n\n`;
      for (const entry of joinList) {
        fileContent += `📅 Fecha: ${entry.fecha}\n📞 Teléfono: +${entry.telefono}\n👤 Nombre: ${entry.nombre}\n💬 Evento: ${entry.mensaje}\n-------------------------------------------\n`;
      }
      
      const outputPath = path.join(process.cwd(), 'recent_joins.txt');
      fs.writeFileSync(outputPath, fileContent, 'utf8');
      console.log(`[WHATSAPP-BOT] ¡Listado exportado con éxito a ${outputPath}!`);
    } catch (err: any) {
      console.error('[WHATSAPP-BOT] Error exportando uniones:', err.message || err);
    }
  }

  private createClientInstance() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: "session-jania-main",
        dataPath: './.wwebjs_auth'
      }),
      webVersionCache: {
        type: "remote",
        remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1017.558-beta.html"
      },
      puppeteer: {
        headless: true,
        executablePath: process.env.CHROME_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-software-rasterizer',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials',
          '--no-zygote',
          '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          // Optimizaciones de Rendimiento
          '--disable-canvas-path-rendering',
          '--disable-accelerated-2d-canvas',
          '--disable-gl-drawing-for-tests',
          '--mute-audio',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--js-flags=--max-old-space-size=512'
        ],
        protocolTimeout: 300000,
      }
    });

    this.setupEventListeners();
  }

  private startWatchdog() {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
    }

    console.log('[WHATSAPP-BOT] Iniciando Watchdog de Keep-Alive (5 min)...');
    this.watchdogInterval = setInterval(async () => {
      if (!this.isReady) return;

      try {
        const statePromise = this.client.getState();
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error("Timeout al obtener estado de WhatsApp")), 15000)
        );

        const state = await Promise.race([statePromise, timeoutPromise]);
        console.log(`[WHATSAPP-BOT] [Watchdog] Estado actual de conexión: ${state}`);
        if (state !== 'CONNECTED') {
          console.warn(`[WHATSAPP-BOT] [Watchdog] Estado anormal detectado: ${state}. Iniciando reconexión...`);
          await this.reconnectClient();
        }
      } catch (err: any) {
        console.error(`[WHATSAPP-BOT] [Watchdog] Falla o bloqueo detectado: ${err.message || err}. Iniciando reconexión...`);
        await this.reconnectClient();
      }
    }, 5 * 60 * 1000);
  }

  private async reconnectClient() {
    this.isReady = false;
    try {
      console.log('[WHATSAPP-BOT] Destruyendo cliente de WhatsApp actual...');
      this.client.removeAllListeners();
      await this.client.destroy();
    } catch (destroyErr: any) {
      console.error('[WHATSAPP-BOT] Error al destruir el cliente:', destroyErr.message || destroyErr);
    }

    console.log('[WHATSAPP-BOT] Re-inicializando cliente de WhatsApp...');
    try {
      this.createClientInstance();
      await this.client.initialize();
      console.log('[WHATSAPP-BOT] Cliente de WhatsApp re-inicializado exitosamente.');
    } catch (initErr: any) {
      console.error('[WHATSAPP-BOT] Error al re-inicializar el cliente:', initErr.message || initErr);
    }
  }

  public async catchUpMissedMessages() {
    try {
      console.log('[WHATSAPP-BOT] [Catch-Up] Iniciando escaneo de mensajes perdidos en el grupo principal...');
      const chat = await this.client.getChatById(this.targetGroupId);
      const messages = await chat.fetchMessages({ limit: 50 });
      
      const db = await getDb();
      if (!db) {
        console.error('[WHATSAPP-BOT] [Catch-Up] Base de datos no disponible.');
        return;
      }

      await this.queuedSend(this.targetGroupId, `🔄 *Iniciando sincronización:* Analizando las últimas 50 publicaciones para detectar registros perdidos...`);

      let count = 0;
      for (const msg of messages) {
        // Ignorar mensajes enviados por el bot mismo o notificaciones de sistema sin cuerpo
        if (msg.fromMe || !msg.body || msg.body.trim() === "") continue;

        const senderId = msg.author || msg.from;
        const botJid = this.client.info?.wid?._serialized;
        if (senderId === botJid || this.blacklistedBots.includes(senderId)) continue;

        // Comprobar si el mensaje ya está registrado en dbMessages
        let conv = await db.select().from(conversations).where(eq(conversations.sessionId, senderId)).limit(1);
        if (conv.length > 0) {
          const existing = await db.select()
            .from(dbMessages)
            .where(
              and(
                eq(dbMessages.conversationId, conv[0].id),
                eq(dbMessages.content, msg.body)
              )
            )
            .limit(1);
          
          if (existing.length > 0) {
            // Ya procesado en el pasado
            continue;
          }
        }

        // Si no existe, lo inyectamos al procesador principal
        console.log(`[WHATSAPP-BOT] [Catch-Up] Detectado mensaje perdido de ${senderId}: "${msg.body.substring(0, 50)}..."`);
        
        // Simular recepción del mensaje
        await this.handleIncomingMessage(msg, this.targetGroupId);
        count++;
        // Esperar un cooldown corto entre inyecciones para no saturar
        await delay(5000);
      }

      console.log(`[WHATSAPP-BOT] [Catch-Up] Escaneo finalizado. Inyectados ${count} mensajes perdidos.`);
      await this.queuedSend(this.targetGroupId, `🔄 *Sincronización finalizada:* Se detectaron y procesaron exitosamente *${count}* publicaciones pendientes.`);
    } catch (err: any) {
      console.error('[WHATSAPP-BOT] [Catch-Up] Error durante el escaneo de mensajes:', err.message || err);
    }
  }

  public async sendManualCierreAudios() {
    console.log("[WHATSAPP-BOT] Generando y enviando audios de cierre manuales (Solo por hoy)...");

    const grupos = [
      { 
        id: this.targetGroupId, 
        nombre: "VECY INMUEBLES NETWORK", 
        promptCierre: "Genera una nota de voz corta en español de despedida y cierre de jornada para el grupo de WhatsApp VECY INMUEBLES NETWORK. Agradece la actividad de hoy y despídete con calidez. Recuerda que no cobramos comisiones y que las ofertas y demandas cruzadas son el motor de la red." 
      },
      { 
        id: this.buzonGroupId, 
        nombre: "BUZÓN DE CONSULTORÍA INMOBILIARIA 24/7", 
        promptCierre: "Genera una nota de voz corta en español de despedida y cierre de jornada para el grupo de WhatsApp Buzón de Consultoría. Agradece la atención a los casos jurídicos y de comisiones compartidas resueltos hoy, deseando un feliz descanso." 
      },
      { 
        id: this.circuloGroupId, 
        nombre: "CÍRCULO CERO", 
        promptCierre: "Genera una nota de voz corta en español de despedida y cierre de jornada para el grupo de WhatsApp Círculo Cero. Agradece el debate y las sugerencias de hoy sobre el futuro del sector." 
      }
    ];

    for (const grupo of grupos) {
      if (!grupo.id) continue;

      try {
        // --- AUDIO 1: Cierre del día ---
        const response1 = await invokeLLM({
          messages: [
            { role: 'system', content: 'Eres JanIA, la asistente de voz e inteligencia artificial de la red inmobiliaria colaborativa VECY Network. Te expresas de manera natural, humana, cálida y profesional.' },
            { role: 'user', content: `${grupo.promptCierre}\n- IMPORTANTE: Debe sonar como un mensaje de voz natural de WhatsApp grabado de forma espontánea por una colega real. Empieza con naturalidad como: "Hola colegas", "Buenas tardes", etc. sin formalismos robóticos.\n- Máximo 350 caracteres.` }
          ]
        });
        const content1 = response1.choices[0]?.message?.content;
        if (content1 && content1.trim() !== "") {
          await this.sendVoiceToGroup(content1, grupo.id);
        }

        await delay(6000);

        // --- AUDIO 2: Motivación para mañana ---
        const promptMotivacion = `Genera un segundo mensaje de voz corto y motivador en español para el grupo "${grupo.nombre}".
Dirección obligatoria:
- El objetivo es motivar a los miembros para que en la jornada de mañana comiencen a confiar más en JanIA y a probar el sistema sin miedo (ya sea escribiendo o enviando notas de voz sobre sus inmuebles o dudas).
- Explícales que no deben tener miedo de interactuar con la IA y que estamos en fase de pruebas gratuitas listos para ayudarlos a conectar negocios.
- Debe sonar sumamente cercano, entusiasta and amigable, como una colega entusiasmada por los éxitos del día siguiente.
- Máximo 350 caracteres.`;

        const response2 = await invokeLLM({
          messages: [
            { role: 'system', content: 'Eres JanIA, la asistente de voz e inteligencia artificial de la red inmobiliaria colaborativa VECY Network. Te expresas de manera natural, humana, cálida y profesional.' },
            { role: 'user', content: promptMotivacion }
          ]
        });
        const content2 = response2.choices[0]?.message?.content;
        if (content2 && content2.trim() !== "") {
          await this.sendVoiceToGroup(content2, grupo.id);
        }

        await delay(8000);

      } catch (err: any) {
        console.error(`❌ Error en sendManualCierreAudios para el grupo ${grupo.nombre}:`, err.message || err);
      }
    }
  }

  public initialize() {
    const useCloud = process.env.USE_WHATSAPP_CLOUD_API === 'true';
    const enablePupForGroups = process.env.ENABLE_PUPPETEER_FOR_GROUPS === 'true';

    if (useCloud && !enablePupForGroups) {
      console.log('[WHATSAPP-BOT] Inicializando en modo WhatsApp Cloud API (Meta) puro - Puppeteer desactivado.');
      this.isReady = true;
      return;
    }

    if (useCloud && enablePupForGroups) {
      console.log('[WHATSAPP-BOT] Inicializando en MODO HÍBRIDO: DMs por Cloud API (Meta) + Grupos por Puppeteer (inicializando cliente...).');
    } else {
      console.log('[WHATSAPP-BOT] Inicializando en modo Puppeteer puro (inicializando cliente...).');
    }

    this.client.initialize().catch(err => {
      console.error('[WHATSAPP-BOT] Error crítico durante la inicialización de whatsapp-web.js:', err);
    });
  }
}

export const whatsappBot = new WhatsAppBot();

/**
 * Envía una notificación al administrador a través del bot principal (whatsapp-web.js),
 * que tiene conversación establecida con el admin sin restricción de ventana de 24h.
 */
export async function sendAdminNotification(text: string): Promise<void> {
  const ADMIN_PHONE = process.env.ADMIN_PHONE || "573166569719";
  const adminJid = `${ADMIN_PHONE}@c.us`;
  await (whatsappBot as any).queuedSend(adminJid, text);
}

/**
 * Envía un mensaje directo a un usuario a través del bot principal (whatsapp-web.js),
 * evitando las restricciones de la API de Cloud (Meta) cuando no hay ventana de 24h activa.
 */
export async function sendUserDM(jid: string, text: string): Promise<void> {
  const formattedJid = jid.includes('@') ? jid : `${jid}@c.us`;
  await (whatsappBot as any).queuedSend(formattedJid, text);
}

