import './setup-stealth'; // Configurar Stealth Puppeteer antes de importar whatsapp-web.js
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import type { Client as ClientType, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db';
import { conversations, messages as dbMessages, users } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { textToSpeechMedia, detectaVoz, sendAdminNotification, sendUserDM, setBotPendingData, setMatchBotInstance } from './whatsapp';
import { 
  processWhatsAppMessage, 
  processConsultingMessage, 
  processCirculoMessage 
} from './janIA';
import { esDominioPermitido, scrapePropertyLink } from './scraper';

// Tiempo de arranque para omitir mensajes históricos
const SERVER_BOOT_TIME = Math.floor(Date.now() / 1000);
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Cola de despacho secuencial para evitar bloqueos
let outgoingQueue: Promise<any> = Promise.resolve();

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

export class JaniaMatchBot {
  private client!: ClientType;
  public isReady: boolean = false;
  
  // Grupos autorizados y configuraciones
  private authorizedGroups: string[] = [];
  private messageBuffers: Map<string, MessageBuffer> = new Map();
  private redirectCooldowns: Map<string, number> = new Map();
  private processingLocks: Map<string, Promise<void>> = new Map();
  private watchdogInterval: NodeJS.Timeout | null = null;
  private watchdogFailures: number = 0;

  private targetGroupId: string = '120363260108880069@g.us';
  private cooldownMap: Map<string, any> = new Map();
  private cooldownFile: string = path.join(process.cwd(), '.cooldown_map.json');

  constructor() {
    setMatchBotInstance(this);
    console.log('[JANIA-MATCH] Inicializando JanIA Match Bot (Ojos y Oídos)...');
    
    // Cargar grupos desde la configuración o usar defaults
    const groupsEnv = process.env.JANIA_MATCH_GROUPS;
    if (groupsEnv) {
      this.authorizedGroups = groupsEnv.split(',').map(g => g.trim());
    } else {
      // Valores predeterminados si no se configuran
      this.authorizedGroups = [
        '120363260108880069@g.us', // VECY INMUEBLES NETWORK
        '120363417740040773@g.us', // VECY: SOPORTE LEGAL, CONTRATOS Y AVALÚOS
        '120363403507276533@g.us'  // CÍRCULO CERO 👌
      ];
    }

    this.loadCooldowns();
    this.createClientInstance();
    this.setupGracefulShutdown();
  }

  private createClientInstance() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: process.env.JANIA_MATCH_CLIENT_ID || "session-jania-match",
        dataPath: './.wwebjs_auth'
      }),
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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
          // Optimizaciones de memoria
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

  private setupEventListeners() {
    // Generar código QR para vinculación
    this.client.on('qr', (qr: string) => {
      console.log('\n[JANIA-MATCH] 🔌 ESCANEA ESTE CÓDIGO QR PARA INICIAR JANIA MATCH:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      console.log('\n🚀 JANIA MATCH🔌💘 — BOT DE ESCUCHA Y MATCHES ACTIVADO CORRECTAMENTE');
      this.isReady = true;
      this.startWatchdog();

      // Optimización de Puppeteer: bloquear fuentes y CSS para ahorrar consumo en VPS
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
            console.log('[JANIA-MATCH] Optimización activa: Recursos visuales bloqueados.');
          }
        } catch (e: any) {
          console.warn('[JANIA-MATCH] Error configurando interceptor de Puppeteer:', e.message);
        }
      })();
    });

    this.client.on('disconnected', async (reason) => {
      console.warn('[JANIA-MATCH] ⚠️ Cliente desconectado:', reason, '— reconectando en 10s...');
      this.isReady = false;
      await new Promise(resolve => setTimeout(resolve, 10000));
      this.reconnectClient();
    });

    this.client.on('message_create', async (msg: Message) => {
      // 1. Filtrar mensajes de status broadcast
      if ((msg.from && msg.from.includes('status@broadcast')) || (msg.author && msg.author.includes('status@broadcast'))) {
        return;
      }

      // 2. Omitir mensajes previos a la inicialización
      if (msg.timestamp < SERVER_BOOT_TIME) {
        return;
      }

      // Resoluciones LID a JID
      if (msg.author && msg.author.endsWith('@lid')) {
        try {
          const contact = await this.client.getContactById(msg.author);
          if (contact?.id?._serialized?.endsWith('@c.us')) {
            msg.author = contact.id._serialized;
          }
        } catch (e) {}
      }
      if (msg.from && msg.from.endsWith('@lid')) {
        try {
          const contact = await this.client.getContactById(msg.from);
          if (contact?.id?._serialized?.endsWith('@c.us')) {
            msg.from = contact.id._serialized;
          }
        } catch (e) {}
      }

      const senderId = msg.author || msg.from;
      const botJid = this.client.info?.wid?._serialized;

      // Omitir si proviene de nosotros mismos
      if (msg.fromMe || (botJid && (senderId === botJid || msg.from === botJid || msg.author === botJid))) {
        return;
      }

      try {
        const chat = await msg.getChat();
        const chatId = chat.id._serialized;
        const isGroup = chat.isGroup;

        // --- FLUJO 1: MENSAJES DE GRUPO ---
        if (isGroup) {
          // Omitir si no es un grupo autorizado
          if (!this.authorizedGroups.includes(chatId)) {
            return;
          }

          // Ignorar stickers en los grupos
          if (msg.type === 'sticker') {
            return;
          }

          const textLower = (msg.body || "").toLowerCase();
          const hasDirectMention = textLower.includes("jania");

          // B. Si es una publicación comercial, procesar con el buffer extractor (Modo Silencioso)
          const isPossibleListing = 
            (msg.body || "").length > 120 || 
            (msg.body || "").split('\n').length > 2 || 
            msg.hasMedia ||
            textLower.includes("http") ||
            textLower.includes("www") ||
            textLower.includes("ofrezco") ||
            textLower.includes("busco") ||
            textLower.includes("vendo") ||
            textLower.includes("arriendo") ||
            textLower.includes("compro") ||
            textLower.includes("necesito");

          // Detectar consultas comunes sobre cómo publicar, cómo funciona el bot/grupo, ayuda, etc.
          const isHelpOrSystemQuery = 
            !isPossibleListing && (
              textLower.includes("cómo subo") || textLower.includes("como subo") ||
              textLower.includes("cómo publico") || textLower.includes("como publico") ||
              textLower.includes("cómo se publica") || textLower.includes("como se publica") ||
              textLower.includes("cómo registrar") || textLower.includes("como registrar") ||
              textLower.includes("cómo funciona") || textLower.includes("como funciona") ||
              textLower.includes("de qué consiste") || textLower.includes("de que consiste") ||
              textLower.includes("en qué consiste") || textLower.includes("en que consiste") ||
              textLower.includes("cómo hago para") || textLower.includes("como hago para") ||
              textLower.includes("cómo buscar") || textLower.includes("como buscar") ||
              textLower.includes("cómo encontrar") || textLower.includes("como encontrar") ||
              (textLower.includes("ayuda") && textLower.includes("inmueble")) ||
              (textLower.includes("explicar") && textLower.includes("grupo")) ||
              (textLower.includes("cómo") && textLower.includes("grupo"))
            );

          // A. Si se le pregunta directamente al bot en el grupo, o si es una consulta de ayuda/sistema
          if (hasDirectMention || isHelpOrSystemQuery) {
            console.log(`[JANIA-MATCH] Pregunta directa/ayuda de ${senderId} en grupo ${chatId}: "${msg.body}"`);
            await this.handleDirectGroupQuestion(msg, chatId, senderId);
            return;
          }

          if (isPossibleListing) {
            await this.handleIncomingGroupMessage(msg, chatId);
          }
          return;
        }

        // --- FLUJO 2: CHATS PRIVADOS (DMs) ---
        if (!isGroup) {
          console.log(`[JANIA-MATCH] DM entrante de ${senderId}. Aplicando redirección a JanIA principal.`);
          await this.handlePrivateDmRedirect(chatId, senderId);
          return;
        }

      } catch (err) {
        console.error('[JANIA-MATCH] Error en procesador de eventos de mensaje:', err);
      }
    });
  }

  // --- REDIRECCIÓN DE CHATS PRIVADOS ---
  private async handlePrivateDmRedirect(chatId: string, senderId: string) {
    const now = Date.now();
    const lastRedirect = this.redirectCooldowns.get(senderId) || 0;
    const ONCE_A_DAY = 24 * 60 * 60 * 1000;

    if (now - lastRedirect > ONCE_A_DAY) {
      this.redirectCooldowns.set(senderId, now);
      const redirectLink = "https://wa.me/573185462265";
      const redirectText = `¡Hola! 🤖 Soy *JanIA Match* 🔌💘.\n\nEste número está destinado *únicamente a trabajar, escuchar y gestionar los grupos de la red*.\n\nPara hablar en privado, buscar propiedades, hacer consultas o recibir soporte y atención, por favor escribe directamente a mi versión principal, *JanIA v3.5*:\n\n👉 ${redirectLink}`;
      
      this.queuedSend(chatId, redirectText);
    }
  }

  // --- RESPUESTA DIRECTA A PREGUNTAS EN GRUPOS ---
  private async handleDirectGroupQuestion(msg: Message, chatId: string, senderId: string) {
    try {
      const contact = await msg.getContact();
      const realName = contact?.pushname || contact?.name || `Asesor +${senderId.split('@')[0]}`;
      const textLower = msg.body.toLowerCase();

      // Indicar que se está respondiendo
      const chat = await msg.getChat();
      const wantsVoice = msg.type === 'audio' || msg.type === 'ptt' || detectaVoz(textLower);
      if (wantsVoice) {
        await chat.sendStateRecording();
      } else {
        await chat.sendStateTyping();
      }

      await delay(2000);

      let result;
      if (chatId === '120363417740040773@g.us') { // Buzón Consultoría
        result = await processConsultingMessage(msg.body, senderId, realName);
      } else if (chatId === '120363403507276533@g.us') { // Círculo Cero
        result = await processCirculoMessage(msg.body, senderId, realName);
      } else {
        // Grupo principal u otros
        result = await processWhatsAppMessage(msg.body, senderId, realName, false, [], undefined, undefined, true, undefined, undefined, chatId);
      }

      if (result && result.response && result.response.trim() !== '') {
        const textToDeliver = result.response;
        const voiceToDeliver = result.voiceResponse || "";

        if (wantsVoice && voiceToDeliver.trim() !== "") {
          const media = await textToSpeechMedia(voiceToDeliver);
          if (media) {
            await this.queuedSend(chatId, media, { sendAudioAsVoice: true });
          } else {
            await this.queuedSend(chatId, textToDeliver, {
              mentions: [senderId],
              quotedMessageId: msg.id._serialized
            });
          }
        } else {
          await this.queuedSend(chatId, textToDeliver, {
            mentions: [senderId],
            quotedMessageId: msg.id._serialized
          });
        }
      }

      await chat.clearState();
    } catch (err) {
      console.error('[JANIA-MATCH] Error al responder pregunta directa en grupo:', err);
    }
  }

  // --- LOGÍSTICA DE BUFFER GRUPAL ---
  private async handleIncomingGroupMessage(msg: Message, chatId: string) {
    const senderId = msg.author || msg.from;
    const lockKey = `${chatId}_${senderId}`;

    const previousLock = this.processingLocks.get(lockKey) || Promise.resolve();
    let resolveLock!: () => void;
    const currentLock = new Promise<void>(resolve => { resolveLock = resolve; });
    const chainedLock = previousLock.then(() => currentLock);
    this.processingLocks.set(lockKey, chainedLock);

    try {
      await previousLock;
      const contact = await msg.getContact();
      const realName = contact?.pushname || contact?.name || `Asesor +${senderId.split('@')[0]}`;
      const bufferKey = `${chatId}_${senderId}`;

      const isMainGroup = chatId === this.targetGroupId;
      const textLower = (msg.body || "").toLowerCase();
      const isPossibleListing = 
        (msg.body || "").length > 120 || 
        (msg.body || "").split('\n').length > 2 || 
        msg.hasMedia ||
        textLower.includes("http") ||
        textLower.includes("www") ||
        textLower.includes("ofrezco") ||
        textLower.includes("busco") ||
        textLower.includes("vendo") ||
        textLower.includes("arriendo") ||
        textLower.includes("compro") ||
        textLower.includes("necesito");

      const now = Date.now();
      const COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutos

      // 1. CONTROL DE COOLDOWN (SOLO EN GRUPO PRINCIPAL Y PARA POSIBLES LISTINGS)
      if (isMainGroup && isPossibleListing) {
        this.loadCooldowns();
        const cooldownKey = `${chatId}_${senderId}`;
        const cooldown = this.cooldownMap.get(cooldownKey);
        
        if (cooldown && (now - cooldown.lastBlockProcessedAt < COOLDOWN_PERIOD)) {
          try {
            await msg.react('⚠️');
          } catch (e) {}

          if (!cooldown.warningSent) {
            cooldown.warningSent = true;
            this.cooldownMap.set(cooldownKey, cooldown);
            this.saveCooldowns();

            const rawPhone = senderId.split("@")[0];
            const useVoice = Math.random() < 0.5;

            if (useVoice) {
              const voiceText = `Hola, acabo de procesar tus primeras propiedades. Para no saturar el grupo y cuidar la visibilidad de tus activos, por favor colaborame esperando cinco minutos antes de enviar tu siguiente bloque de propiedades. ¡Muchas gracias!`;
              const media = await textToSpeechMedia(voiceText);
              if (media) {
                await this.queuedSend(chatId, media, { sendAudioAsVoice: true });
              } else {
                const warningText = 
                  `⚠️ *COOLDOWN ACTIVO (5 MINUTOS)* ⚠️\n\n` +
                  `Hola @${rawPhone}, acabo de procesar con éxito tus primeras propiedades. ` +
                  `Para cuidar la visibilidad de tus activos y no saturar la red de los aliados, te pido que por favor me colabores esperando los *5 minutos* de intervalo antes de enviar tu siguiente bloque (máximo 3 publicaciones).\n\n` +
                  `¡Mis motores necesitan este breve descanso para mantener tus fichas técnicas al 100% de calidad! JanIA sigue atenta. 🏆🎯`;
                await this.queuedSend(chatId, warningText, {
                  mentions: [senderId],
                  quotedMessageId: msg.id._serialized
                });
              }
            } else {
              const warningText = 
                `⚠️ *COOLDOWN ACTIVO (5 MINUTOS)* ⚠️\n\n` +
                `Hola @${rawPhone}, acabo de procesar con éxito tus primeras propiedades. ` +
                `Para cuidar la visibilidad de tus activos y no saturar la red de los aliados, te pido que por favor me colabores esperando los *5 minutos* de intervalo antes de enviar tu siguiente bloque (máximo 3 publicaciones).\n\n` +
                `¡Mis motores necesitan este breve descanso para mantener tus fichas técnicas al 100% de calidad! JanIA sigue atenta. 🏆🎯`;
              await this.queuedSend(chatId, warningText, {
                mentions: [senderId],
                quotedMessageId: msg.id._serialized
              });
            }
          }
          return;
        }
      }

      let buffer = this.messageBuffers.get(bufferKey);
      const bufferTimeout = 12000; // 12 Segundos
      const MAX_BLOCK_SIZE = 3;

      if (buffer) {
        // 2. CONTROL DE LÍMITE DE BUFFER (SOLO EN GRUPO PRINCIPAL Y PARA POSIBLES LISTINGS)
        
        const hasExistingListing = buffer.messages.some(m => {
          const bodyLower = (m.body || "").toLowerCase();
          return (m.body || "").length > 120 || 
                 (m.body || "").split('\n').length > 2 || 
                 m.hasMedia ||
                 bodyLower.includes("http") ||
                 bodyLower.includes("www") ||
                 bodyLower.includes("ofrezco") ||
                 bodyLower.includes("busco") ||
                 bodyLower.includes("vendo") ||
                 bodyLower.includes("arriendo") ||
                 bodyLower.includes("compro") ||
                 bodyLower.includes("necesito");
        });

        if (isMainGroup && isPossibleListing && hasExistingListing) {
          console.log(`[BUFFER] Intento de múltiple propiedad detectado para ${senderId}. Mensaje descartado.`);
          try {
            await msg.react('⚠️');
          } catch (e) {}

          if (!buffer.warningSent) {
            buffer.warningSent = true;
            const rawPhone = senderId.split("@")[0];
            const useVoice = Math.random() < 0.5;

            if (useVoice) {
              const voiceText = `Hola, detecté que estás enviando varias propiedades al mismo tiempo. Mi sistema está diseñado para procesar un solo inmueble por bloque. Por favor, envía cada propiedad en un mensaje separado y espera cinco minutos entre cada una para poder registrarla correctamente. ¡Muchas gracias!`;
              const media = await textToSpeechMedia(voiceText);
              if (media) {
                await this.queuedSend(chatId, media, { sendAudioAsVoice: true });
              } else {
                const warningText = 
                  `⚠️ *UN INMUEBLE A LA VEZ* ⚠️\n\n` +
                  `Hola @${rawPhone}, detecté que estás enviando varias propiedades en el mismo bloque.\n\n` +
                  `Mi sistema está diseñado para procesar únicamente *un (1) solo inmueble* por mensaje. Si envías varios al mismo tiempo, quedarán sin registrar en la base de datos y no podré buscarte coincidencias (matches) automáticas.\n\n` +
                  `Por favor, envía cada propiedad por separado y espera los *5 minutos* de cooldown reglamentarios entre cada una. ¡Tus primeras publicaciones ya están siendo procesadas! 🚀🎯`;
                await this.queuedSend(chatId, warningText, {
                  mentions: [senderId],
                  quotedMessageId: msg.id._serialized
                });
              }
            } else {
              const warningText = 
                `⚠️ *UN INMUEBLE A LA VEZ* ⚠️\n\n` +
                `Hola @${rawPhone}, detecté que estás enviando varias propiedades en el mismo bloque.\n\n` +
                `Mi sistema está diseñado para procesar únicamente *un (1) solo inmueble* por mensaje. Si envías varios al mismo tiempo, quedarán sin registrar en la base de datos y no podré buscarte coincidencias (matches) automáticas.\n\n` +
                `Por favor, envía cada propiedad por separado y espera los *5 minutos* de cooldown reglamentarios entre cada una. ¡Tus primeras publicaciones ya están siendo procesadas! 🚀🎯`;
              await this.queuedSend(chatId, warningText, {
                mentions: [senderId],
                quotedMessageId: msg.id._serialized
              });
            }
          }
          return;
        }

        // B. Límite físico de mensajes en el buffer (inundación / flood)
        const limit = isMainGroup ? MAX_BLOCK_SIZE : 10;
        if (buffer.messages.length >= limit) {
          console.log(`[BUFFER] Límite de mensajes del bloque (${limit}) alcanzado para ${senderId}. Mensaje #${buffer.messages.length + 1} descartado.`);
          try {
            await msg.react('⚠️');
          } catch (e) {}

          if (isMainGroup && !buffer.warningSent) {
            buffer.warningSent = true;
            const rawPhone = senderId.split("@")[0];
            const useVoice = Math.random() < 0.5;

            if (useVoice) {
              const voiceText = `Hola, veo que estás enviando muchas publicaciones seguidas. Para cuidar la visibilidad y no saturar el chat de los aliados, por favor colaborame esperando cinco minutos antes de enviar más de tres publicaciones. ¡Muchas gracias!`;
              const media = await textToSpeechMedia(voiceText);
              if (media) {
                await this.queuedSend(chatId, media, { sendAudioAsVoice: true });
              } else {
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
            } else {
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
          originalMsg: msg
        });
        buffer.timer = setTimeout(() => this.processGroupBuffer(bufferKey), bufferTimeout);
      } else {
        this.messageBuffers.set(bufferKey, {
          messages: [{
            body: msg.body,
            hasMedia: msg.hasMedia,
            originalMsg: msg
          }],
          userName: realName,
          chatId,
          timer: setTimeout(() => this.processGroupBuffer(bufferKey), bufferTimeout)
        });
      }
    } finally {
      resolveLock();
      if (this.processingLocks.get(lockKey) === chainedLock) {
        this.processingLocks.delete(lockKey);
      }
    }
  }

  private getReactionEmoji(result: any): string | null {
    const completeEmojis = ['👍', '👌', '✅', '✔️', '☑️'];
    const incompleteEmojis = ['❓', '⁉️', '❔', '🤔', '😐', '🫪'];
    const violationEmojis = ['😡', '😤', '😠', '😖', '☹️', '❌', '🚫', '☢️'];

    if (result.classification === 'VIOLACION_DE_NORMAS') {
      return violationEmojis[Math.floor(Math.random() * violationEmojis.length)];
    }
    
    if (
      result.classification === 'DATOS_INCOMPLETOS' || 
      (result.missingFields && result.missingFields.length > 0)
    ) {
      return incompleteEmojis[Math.floor(Math.random() * incompleteEmojis.length)];
    }

    if (result.classification === 'INMUEBLE' || result.classification === 'REQUERIMIENTO') {
      return completeEmojis[Math.floor(Math.random() * completeEmojis.length)];
    }

    return result.reactionEmoji || null;
  }

  private async processGroupBuffer(bufferKey: string) {
    const buffer = this.messageBuffers.get(bufferKey);
    if (!buffer) return;

    this.messageBuffers.delete(bufferKey);
    const senderId = bufferKey.split('_')[1];
    const chatId = buffer.chatId;
    const userName = buffer.userName;

    console.log(`[JANIA-MATCH] Procesando buffer de ${buffer.messages.length} mensajes para ${senderId} (Silencioso)...`);

    // Descarga de imágenes o documentos adjuntos
    for (const bufferedMsg of buffer.messages) {
      if (bufferedMsg.hasMedia && bufferedMsg.originalMsg.type === 'image') {
        try {
          const media = await bufferedMsg.originalMsg.downloadMedia();
          if (media && media.mimetype.startsWith('image/')) {
            bufferedMsg.imageBuffer = media.data;
          }
        } catch (e) {}
      }
      if (bufferedMsg.hasMedia && bufferedMsg.originalMsg.type === 'document') {
        try {
          const media = await bufferedMsg.originalMsg.downloadMedia();
          if (media && media.mimetype === 'application/pdf') {
            bufferedMsg.pdfBuffer = media.data;
            bufferedMsg.pdfMimeType = media.mimetype;
          }
        } catch (e) {}
      }
    }

    try {
      const fullText = buffer.messages.map(m => m.body).join('\n\n');
      const hasMedia = buffer.messages.some(m => m.hasMedia);
      const imageMsg = buffer.messages.find(m => m.imageBuffer);
      const pdfMsg = buffer.messages.find(m => m.pdfBuffer);

      // 1. Scraping de enlaces si existen
      const urlMatch = fullText.match(/https?:\/\/[^\s]+/g);
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

      // 2. Guardar logs en BD
      await this.logToDb(senderId, 'user', fullText);

      // 3. Procesar mediante JanIA (guardará en DB de forma automática)
      let result;
      if (chatId === '120363417740040773@g.us') {
        result = await processConsultingMessage(
          fullText,
          senderId,
          userName,
          imageMsg?.imageBuffer,
          pdfMsg?.pdfBuffer,
          pdfMsg?.pdfMimeType
        );
      } else if (chatId === '120363403507276533@g.us') {
        result = await processCirculoMessage(
          fullText,
          senderId,
          userName
        );
      } else {
        result = await processWhatsAppMessage(
          fullText,
          senderId,
          userName,
          hasMedia,
          scrapedResults,
          undefined,
          imageMsg?.imageBuffer,
          true,
          pdfMsg?.pdfBuffer,
          pdfMsg?.pdfMimeType,
          chatId
        );
      }

      // --- REACCIONAR A LA PUBLICACIÓN ---
      if (result) {
        const emoji = this.getReactionEmoji(result);
        if (emoji) {
          try {
            const lastMsg = buffer.messages[buffer.messages.length - 1].originalMsg;
            console.log(`[JANIA-MATCH] Reaccionando con ${emoji} al mensaje de ${senderId}`);
            await lastMsg.react(emoji);
          } catch (reactErr: any) {
            console.error('[JANIA-MATCH] Error al reaccionar al mensaje:', reactErr.message);
          }
        }
      }

      // 4. MODO STEALTH: Redirección al bot principal u oportuna advertencia grupal
      if (result) {
        const isWarning = result.classification === "DATOS_INCOMPLETOS" || result.classification === "VIOLACION_DE_NORMAS";

        if (isWarning) {
          const warningText = result.dmResponse || result.response || "";
          if (warningText.trim() !== "") {
            let cleanDmResponse = warningText;
            // Limpieza robusta de saludos
            cleanDmResponse = cleanDmResponse.replace(/¡Hola,\s+\*[^*]+\*!\s+😊\s*/i, "");
            cleanDmResponse = cleanDmResponse.replace(/¡Hola!\s+😊\s*/i, "");

            let hasInteracted = false;
            try {
              const db = await getDb();
              if (db) {
                const checkInteracted = await db
                  .select({ id: dbMessages.id })
                  .from(dbMessages)
                  .innerJoin(conversations, eq(dbMessages.conversationId, conversations.id))
                  .where(
                    and(
                      eq(conversations.sessionId, senderId),
                      eq(dbMessages.role, 'janIA')
                    )
                  )
                  .limit(1);
                hasInteracted = checkInteracted.length > 0;
              }
            } catch (err) {
              console.error('[JANIA-MATCH] Error checking user interaction history:', err);
            }

            // Regla Híbrida: si es una infracción de normas o si es datos incompletos de un usuario nuevo (sin interacción previa) -> PUBLICAR en el grupo.
            // Si es datos incompletos de un usuario conocido -> enviar DM privado directamente.
            const shouldSendPublic = result.classification === "VIOLACION_DE_NORMAS" || !hasInteracted;

            if (shouldSendPublic) {
              let publicWarning = "";
              if (result.classification === "VIOLACION_DE_NORMAS") {
                publicWarning = `🚨 *LLAMADO DE ATENCIÓN* 🚨\n\nHola @${senderId.split('@')[0]},\n\nHe detectado que tu publicación infringe las normas de nuestro canal.\n\n*Detalle de la infracción:*\n${cleanDmResponse}\n\n*Nota:* Como casi nadie se toma la molestia de leer las normas en la descripción del grupo, te aclaro que estas reglas existen para mantener la comunidad ordenada y efectiva para todos.\n\nSi tienes dudas, por favor contacta a mi otro yo *JanIA v3.5* (atención y soporte al usuario) al +573185462265 o escribiéndole directamente aquí:\n👉 https://wa.me/573185462265`;
              } else {
                // DATOS_INCOMPLETOS público
                publicWarning = `⚠️ *INFORMACIÓN PENDIENTE* ⚠️\n\nHola @${senderId.split('@')[0]},\n\n${cleanDmResponse}\n\n*Nota:* Hacemos énfasis en esto porque casi nadie se toma la molestia de leer las normas de publicación en la descripción del grupo, pero estos datos son 100% obligatorios para que pueda procesar tu propiedad y buscarte un MATCH comercial.\n\nSi deseas completar tus datos o tienes dudas, por favor contacta directamente a mi versión principal de soporte, *JanIA v3.5*, escribiéndole al enlace:\n👉 https://wa.me/573185462265`;
              }

              console.log(`[JANIA-MATCH] [Public-Moderation] Enviando advertencia grupal a ${senderId} en ${chatId}`);
              await this.queuedSend(chatId, publicWarning, { mentions: [senderId] });

              // Registrar en BD para auditoría grupal
              await this.logToDb(senderId, 'janIA', `[PUBLIC-WARNING] ${publicWarning}`);
            } else {
              // DATOS_INCOMPLETOS en privado (usuario conocido con historial de confianza)
              console.log(`[JANIA-MATCH] [Stealth] Enviando advertencia privada de datos incompletos a ${senderId} (Usuario conocido).`);
              await sendUserDM(senderId, result.dmResponse || "");
              await this.logToDb(senderId, 'janIA', `[DM-Stealth] ${result.dmResponse || ""}`);
            }

            if (result.classification === "DATOS_INCOMPLETOS") {
              setBotPendingData(
                senderId,
                fullText,
                result.extractedData || {},
                result.classification,
                result.missingFields || []
              );
            }
          }
        } else {
          // Publicaciones exitosas o consultas generales: derivar confirmaciones privadas normales
          const isConsultation = result.classification === "CONSULTA_GENERAL" || result.classification === "RESPUESTA_A_PREGUNTA_IA" || result.classification === "ANALISIS_DE_MERCADO";
          
          if (isConsultation && result.response && result.response.trim() !== "") {
            console.log(`[JANIA-MATCH] Enviando respuesta a consulta general en el grupo para ${senderId}`);
            await this.queuedSend(chatId, result.response, {
              mentions: [senderId],
              quotedMessageId: buffer.messages[buffer.messages.length - 1].originalMsg.id._serialized
            });
            await this.logToDb(senderId, 'janIA', `[GROUP-REPLY] ${result.response}`);
          } else {
            // Si hay un MATCH (coincidencia de negocio) detectado, lo publicamos en el grupo etiquetando a los involucrados
            if (result.response && result.response.trim() !== "") {
              console.log(`[JANIA-MATCH] Enviando notificación de Match en el grupo para ${senderId}`);
              await this.queuedSend(chatId, result.response, {
                mentions: result.mentions || [senderId],
                quotedMessageId: buffer.messages[buffer.messages.length - 1].originalMsg.id._serialized
              });
              await this.logToDb(senderId, 'janIA', `[GROUP-MATCH] ${result.response}`);
            }

            // También enviamos la confirmación privada de registro al usuario (Stealth)
            if (result.shouldSendDM && result.dmResponse && result.dmResponse.trim() !== "") {
              console.log(`[JANIA-MATCH] [Stealth] Derivando confirmación DM de ${senderId} al bot principal.`);
              await sendUserDM(senderId, result.dmResponse);
              await this.logToDb(senderId, 'janIA', `[DM-Stealth] ${result.dmResponse}`);
            }
          }
        }

        // B. Confirmaciones de Match a los involucrados y administrador
        if (result.extraDMs && result.extraDMs.length > 0) {
          for (const dm of result.extraDMs) {
            if (!dm.jid || !dm.jid.includes('@') || dm.jid.split('@')[0].length < 5) continue;
            console.log(`[JANIA-MATCH] [Stealth] Derivando notificación de Match para ${dm.jid} al bot principal.`);
            if (dm.viaMainBot) {
              // Admin: enviar por whatsapp-web.js (sin restricción de ventana de 24h)
              await sendAdminNotification(dm.message);
            } else {
              // Demás involucrados: enviar por whatsapp-web.js (sendUserDM) para evitar restricciones de 24h de Cloud API
              await sendUserDM(dm.jid, dm.message);
            }
          }
        }
      }

      // 5. ACTIVAR COOLDOWN DE 5 MINUTOS (Tras procesar con éxito - solo en grupo principal)
      const isMainGroup = chatId === this.targetGroupId;
      if (isMainGroup) {
        const cooldownKeyFinal = `${chatId}_${senderId}`;
        this.loadCooldowns();
        this.cooldownMap.set(cooldownKeyFinal, {
          lastBlockProcessedAt: Date.now(),
          warningSent: false
        });
        this.saveCooldowns();
      }

    } catch (err) {
      console.error('[JANIA-MATCH] Error procesando buffer de grupo silencioso:', err);
    }
  }

  // --- LOGÍSTICA DE BD ---
  private async logToDb(senderId: string, role: 'user' | 'janIA', content: string) {
    try {
      const db = await getDb();
      if (!db) return;

      let conv = await db.select().from(conversations).where(eq(conversations.sessionId, senderId)).limit(1);
      let conversationId: number;

      if (conv.length === 0) {
        const [newConv] = await db.insert(conversations).values({
          sessionId: senderId,
          status: "active",
          lastMessage: content.slice(0, 150)
        }).returning();
        conversationId = newConv.id;
      } else {
        conversationId = conv[0].id;
        await db.update(conversations).set({
          lastMessage: content.slice(0, 150),
          updatedAt: new Date()
        }).where(eq(conversations.id, conversationId));
      }

      await db.insert(dbMessages).values({
        conversationId,
        role,
        content,
        messageType: "text"
      });
    } catch (e) {
      console.error("[JANIA-MATCH] Error al registrar logs en BD:", e);
    }
  }

  // --- ENVÍO LOCAL (Solo para respuestas directas permitidas) ---
  public async queuedSend(chatId: string, content: any, options: any = {}) {
    outgoingQueue = outgoingQueue.then(async () => {
      try {
        await this.client.sendMessage(chatId, content, options);
        await delay(1000);
      } catch (err: any) {
        console.error('[JANIA-MATCH] Error en despacho de mensaje local:', err.message);
      }
    });
    return outgoingQueue;
  }

  // --- WATCHDOG ---
  private startWatchdog() {
    if (this.watchdogInterval) clearInterval(this.watchdogInterval);
    
    this.watchdogFailures = 0;
    this.watchdogInterval = setInterval(async () => {
      if (!this.isReady) return;
      try {
        const statePromise = this.client.getState();
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error("Timeout al obtener estado de WhatsApp")), 15000)
        );

        const state = await Promise.race([statePromise, timeoutPromise]);
        console.log(`[JANIA-MATCH] [Watchdog] Estado actual de conexión: ${state}`);
        
        if (state === 'CONNECTED') {
          this.watchdogFailures = 0; // Reset counter on success
        } else {
          this.watchdogFailures++;
          console.warn(`[JANIA-MATCH] [Watchdog] Estado anormal detectado: ${state} (Fallo consecutivo #${this.watchdogFailures}/3).`);
          if (this.watchdogFailures >= 3) {
            console.error('[JANIA-MATCH] [Watchdog] Demasiados fallos consecutivos. Reiniciando cliente...');
            this.watchdogFailures = 0;
            this.reconnectClient();
          }
        }
      } catch (err: any) {
        this.watchdogFailures++;
        console.error(`[JANIA-MATCH] [Watchdog] Falla o bloqueo detectado: ${err.message || err} (Fallo consecutivo #${this.watchdogFailures}/3).`);
        if (this.watchdogFailures >= 3) {
          console.error('[JANIA-MATCH] [Watchdog] Demasiados fallos consecutivos. Reiniciando cliente...');
          this.watchdogFailures = 0;
          this.reconnectClient();
        }
      }
    }, 5 * 60 * 1000);
  }

  private async reconnectClient() {
    this.isReady = false;
    try {
      this.client.removeAllListeners();
      await this.client.destroy();
    } catch (e) {}

    try {
      this.createClientInstance();
      await this.client.initialize();
      console.log('[JANIA-MATCH] Reconexión exitosa.');
    } catch (e) {
      console.error('[JANIA-MATCH] Falló reconexión:', e);
    }
  }

  public initialize() {
    this.client.initialize().catch(err => {
      console.error('[JANIA-MATCH] Error crítico al inicializar el cliente:', err);
    });
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

  private setupGracefulShutdown() {
    const shutdown = async () => {
      console.log('\n🛑 Cerrando JanIA Match Bot...');
      try { await this.client.destroy(); } catch (e) {}
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}

export const janiaMatchBot = new JaniaMatchBot();
