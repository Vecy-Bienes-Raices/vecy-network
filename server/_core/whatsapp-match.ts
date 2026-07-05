import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason, 
  delay,
  downloadMediaMessage,
  proto
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcodeTerminal from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db';
import { conversations, messages as dbMessages, users } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { textToSpeechMedia, detectaVoz, sendAdminNotification, sendUserDM, setBotPendingData } from './whatsapp';
import { 
  processWhatsAppMessage, 
  processConsultingMessage, 
  processCirculoMessage 
} from './janIA';
import { esDominioPermitido, scrapePropertyLink } from './scraper';
import QRCode from 'qrcode';

// Tiempo de arranque para omitir mensajes históricos
const SERVER_BOOT_TIME = Math.floor(Date.now() / 1000);

// Cola de despacho secuencial para evitar bloqueos
let outgoingQueue: Promise<any> = Promise.resolve();

interface BufferedMessage {
  body: string;
  hasMedia: boolean;
  imageBuffer?: string;
  audioUrl?: string;
  pdfBuffer?: string;
  pdfMimeType?: string;
  originalMsg: proto.IWebMessageInfo;
}

interface MessageBuffer {
  timer: NodeJS.Timeout;
  messages: BufferedMessage[];
  userName: string;
  chatId: string;
  warningSent?: boolean;
}

export class JaniaMatchBot {
  public sock: any = null;
  public isReady: boolean = false;
  
  // Grupos autorizados y configuraciones
  private authorizedGroups: string[] = [];
  private messageBuffers: Map<string, MessageBuffer> = new Map();
  private redirectCooldowns: Map<string, number> = new Map();
  private processingLocks: Map<string, Promise<void>> = new Map();

  private targetGroupId: string = '120363260108880069@g.us';
  private cooldownMap: Map<string, any> = new Map();
  private cooldownFile: string = path.join(process.cwd(), '.cooldown_map.json');

  constructor() {
    (global as any).janiaMatchBotInstance = this;
    console.log('[JANIA-MATCH] Inicializando JanIA Match Bot (Ojos y Oídos) con Baileys...');
    
    // Cargar grupos desde la configuración o usar defaults
    const groupsEnv = process.env.JANIA_MATCH_GROUPS;
    if (groupsEnv) {
      this.authorizedGroups = groupsEnv.split(',').map(g => g.trim());
    } else {
      this.authorizedGroups = [
        '120363260108880069@g.us', // VECY INMUEBLES NETWORK
        '120363417740040773@g.us', // VECY: SOPORTE LEGAL, CONTRATOS Y AVALÚOS
        '120363403507276533@g.us'  // CÍRCULO CERO 👌
      ];
    }

    this.loadCooldowns();
    this.setupGracefulShutdown();
  }

  public async initialize() {
    try {
      const sessionDir = path.join(process.cwd(), '.baileys_auth');
      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      
      console.log('[JANIA-MATCH] Estableciendo conexión por WebSocket...');
      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Lo manejamos nosotros de forma personalizada
        browser: ["Vecy Network", "Chrome", "1.0.0"],
      });

      this.setupEventListeners(saveCreds);
    } catch (err: any) {
      console.error('[JANIA-MATCH] Error crítico al inicializar el cliente Baileys:', err);
    }
  }

  private setupEventListeners(saveCreds: () => Promise<void>) {
    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('\n[JANIA-MATCH] 🔌 ESCANEA ESTE CÓDIGO QR PARA INICIAR JANIA MATCH:');
        qrcodeTerminal.generate(qr, { small: true });

        // Guardar el QR como imagen PNG accesible desde el navegador
        try {
          const qrPath = path.join(process.cwd(), 'dist', 'qr-match.png');
          if (!fs.existsSync(path.join(process.cwd(), 'dist'))) {
            fs.mkdirSync(path.join(process.cwd(), 'dist'), { recursive: true });
          }
          QRCode.toFile(qrPath, qr, { width: 400, margin: 2 }, (err: any) => {
            if (err) console.error('[JANIA-MATCH] Error guardando QR PNG:', err.message);
            else console.log(`[JANIA-MATCH] 📸 QR guardado como imagen → https://vecy-network.vercel.app/qr-match.png`);
          });
        } catch (e: any) {
          console.warn('[JANIA-MATCH] qrcode no disponible para PNG.', e.message);
        }
      }

      if (connection === 'close') {
        const error = lastDisconnect?.error as Boom;
        const statusCode = error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        console.warn(`[JANIA-MATCH] ⚠️ Conexión Baileys cerrada: ${error?.message || error}. Reconectando en 60s: ${shouldReconnect}`);
        this.isReady = false;

        if (shouldReconnect) {
          setTimeout(() => this.initialize(), 60000); // 60s cooldown para evitar spam de login
        } else {
          console.error('[JANIA-MATCH] Sesión de WhatsApp cerrada (Logged Out). Limpiando credenciales...');
          fs.rmSync(path.join(process.cwd(), '.baileys_auth'), { recursive: true, force: true });
          setTimeout(() => this.initialize(), 5000);
        }
      } else if (connection === 'open') {
        console.log('\n🚀 JANIA MATCH🔌💘 — BOT DE ESCUCHA Y MATCHES ACTIVADO CORRECTAMENTE CON BAILEYS');
        this.isReady = true;
      }
    });

    this.sock.ev.on('messages.upsert', async (m: { messages: proto.IWebMessageInfo[], type: string }) => {
      if (m.type !== 'notify') return;

      for (const msg of m.messages) {
        if (!msg.key || !msg.message) continue;

        // Omitir si proviene de nosotros mismos
        const fromMe = msg.key.fromMe;
        if (fromMe) continue;

        const chatId = msg.key.remoteJid;
        if (!chatId) continue;
        const isGroup = chatId.endsWith('@g.us');

        const senderId = isGroup ? msg.key.participant : chatId;
        if (!senderId) continue;

        // Omitir si proviene de status broadcast
        if (chatId.includes('status@broadcast') || senderId.includes('status@broadcast')) {
          continue;
        }

        // Omitir mensajes previos a la inicialización del servidor
        const timestamp = msg.messageTimestamp;
        if (timestamp && Number(timestamp) < SERVER_BOOT_TIME) {
          continue;
        }

        try {
          // --- FLUJO 1: MENSAJES DE GRUPO ---
          if (isGroup) {
            if (!this.authorizedGroups.includes(chatId)) {
              return;
            }

            // Ignorar stickers
            if (msg.message.stickerMessage) {
              return;
            }

            let body = '';
            if (msg.message.conversation) body = msg.message.conversation;
            else if (msg.message.extendedTextMessage) body = msg.message.extendedTextMessage.text || '';
            else if (msg.message.imageMessage) body = msg.message.imageMessage.caption || '';
            else if (msg.message.documentMessage) body = msg.message.documentMessage.caption || '';
            else if (msg.message.videoMessage) body = msg.message.videoMessage.caption || '';

            const textLower = body.toLowerCase();
            const hasDirectMention = textLower.includes("jania");

            // Si es una publicación comercial, procesar con el buffer extractor (Modo Silencioso)
            const isPossibleListing = 
              body.length > 120 || 
              body.split('\n').length > 2 || 
              !!msg.message.imageMessage ||
              !!msg.message.documentMessage ||
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

            if (hasDirectMention || isHelpOrSystemQuery) {
              console.log(`[JANIA-MATCH] Pregunta directa/ayuda de ${senderId} en grupo ${chatId}: "${body}"`);
              await this.handleDirectGroupQuestion(msg, chatId, senderId, body);
              return;
            }

            if (isPossibleListing) {
              await this.handleIncomingGroupMessage(msg, chatId, body);
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
  private async handleDirectGroupQuestion(msg: proto.IWebMessageInfo, chatId: string, senderId: string, bodyText: string) {
    try {
      const realName = msg.pushName || `Asesor +${senderId.split('@')[0]}`;
      const textLower = bodyText.toLowerCase();

      const wantsVoice = msg.message?.audioMessage || detectaVoz(textLower);
      if (wantsVoice) {
        await this.sock.sendPresenceUpdate('recording', chatId);
      } else {
        await this.sock.sendPresenceUpdate('composing', chatId);
      }

      await delay(2000);

      let result;
      if (chatId === '120363417740040773@g.us') { // Buzón Consultoría
        result = await processConsultingMessage(bodyText, senderId, realName);
      } else if (chatId === '120363403507276533@g.us') { // Círculo Cero
        result = await processCirculoMessage(bodyText, senderId, realName);
      } else {
        result = await processWhatsAppMessage(bodyText, senderId, realName, false, [], undefined, undefined, true, undefined, undefined, chatId);
      }

      if (result && result.response && result.response.trim() !== '') {
        const textToDeliver = result.response;
        const voiceToDeliver = result.voiceResponse || "";

        if (wantsVoice && voiceToDeliver.trim() !== "") {
          const media = await textToSpeechMedia(voiceToDeliver);
          if (media) {
            await this.queuedSend(chatId, media, { sendAudioAsVoice: true, quoted: msg });
          } else {
            await this.queuedSend(chatId, textToDeliver, {
              mentions: [senderId],
              quoted: msg
            });
          }
        } else {
          await this.queuedSend(chatId, textToDeliver, {
            mentions: [senderId],
            quoted: msg
          });
        }
      }

      await this.sock.sendPresenceUpdate('paused', chatId);
    } catch (err) {
      console.error('[JANIA-MATCH] Error al responder pregunta directa en grupo:', err);
    }
  }

  // --- LOGÍSTICA DE BUFFER GRUPAL ---
  private async handleIncomingGroupMessage(msg: proto.IWebMessageInfo, chatId: string, bodyText: string) {
    if (!msg.key || !msg.message) return;
    const senderId = msg.key.participant || msg.key.remoteJid || '';
    const lockKey = `${chatId}_${senderId}`;

    const previousLock = this.processingLocks.get(lockKey) || Promise.resolve();
    let resolveLock!: () => void;
    const currentLock = new Promise<void>(resolve => { resolveLock = resolve; });
    const chainedLock = previousLock.then(() => currentLock);
    this.processingLocks.set(lockKey, chainedLock);

    try {
      await previousLock;
      const realName = msg.pushName || `Asesor +${senderId.split('@')[0]}`;
      const bufferKey = `${chatId}_${senderId}`;

      const isMainGroup = chatId === this.targetGroupId;
      const textLower = bodyText.toLowerCase();

      const now = Date.now();
      const COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutos

      // 1. CONTROL DE COOLDOWN (SOLO EN GRUPO PRINCIPAL Y PARA POSIBLES LISTINGS)
      if (isMainGroup) {
        this.loadCooldowns();
        const cooldownKey = `${chatId}_${senderId}`;
        const cooldown = this.cooldownMap.get(cooldownKey);
        
        if (cooldown && (now - cooldown.lastBlockProcessedAt < COOLDOWN_PERIOD)) {
          try {
            await this.sock.sendMessage(chatId, { react: { text: '⚠️', key: msg.key } });
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
                  quoted: msg
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
                quoted: msg
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
        // LÍMITE DE BUFFER (SOLO EN GRUPO PRINCIPAL Y PARA POSIBLES LISTINGS)
        const hasExistingListing = buffer.messages.some(m => {
          const bodyLower = m.body.toLowerCase();
          return m.body.length > 120 || 
                 m.body.split('\n').length > 2 || 
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

        if (isMainGroup && hasExistingListing) {
          console.log(`[BUFFER] Intento de múltiple propiedad detectado para ${senderId}. Mensaje descartado.`);
          try {
            await this.sock.sendMessage(chatId, { react: { text: '⚠️', key: msg.key } });
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
                  quoted: msg
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
                quoted: msg
              });
            }
          }
          return;
        }

        // Límite físico de mensajes en el buffer
        const limit = isMainGroup ? MAX_BLOCK_SIZE : 10;
        if (buffer.messages.length >= limit) {
          console.log(`[BUFFER] Límite de mensajes del bloque (${limit}) alcanzado para ${senderId}. Mensaje descartado.`);
          try {
            await this.sock.sendMessage(chatId, { react: { text: '⚠️', key: msg.key } });
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
                  quoted: msg
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
                quoted: msg
              });
            }
          }
          return;
        }

        clearTimeout(buffer.timer);
        buffer.messages.push({
          body: bodyText,
          hasMedia: !!msg.message.imageMessage || !!msg.message.documentMessage,
          originalMsg: msg
        });
        buffer.timer = setTimeout(() => this.processGroupBuffer(bufferKey), bufferTimeout);
      } else {
        this.messageBuffers.set(bufferKey, {
          messages: [{
            body: bodyText,
            hasMedia: !!msg.message.imageMessage || !!msg.message.documentMessage,
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
      if (bufferedMsg.hasMedia && bufferedMsg.originalMsg.message?.imageMessage) {
        try {
          const mediaBuffer = await downloadMediaMessage(bufferedMsg.originalMsg as any, 'buffer', {});
          bufferedMsg.imageBuffer = mediaBuffer.toString('base64');
        } catch (e) {}
      }
      if (bufferedMsg.hasMedia && bufferedMsg.originalMsg.message?.documentMessage) {
        try {
          const mediaBuffer = await downloadMediaMessage(bufferedMsg.originalMsg as any, 'buffer', {});
          bufferedMsg.pdfBuffer = mediaBuffer.toString('base64');
          bufferedMsg.pdfMimeType = bufferedMsg.originalMsg.message.documentMessage.mimetype || 'application/pdf';
        } catch (e) {}
      }
    }

    try {
      const fullText = buffer.messages.map(m => m.body).join('\n\n');
      const hasMedia = buffer.messages.some(m => m.hasMedia);
      const imageMsg = buffer.messages.find(m => m.imageBuffer);
      const pdfMsg = buffer.messages.find(m => m.pdfBuffer);

      // Scraping de enlaces si existen
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

      // Guardar logs en BD
      await this.logToDb(senderId, 'user', fullText);

      // Procesar mediante JanIA (guardará en DB de forma automática)
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
            await this.sock.sendMessage(chatId, { react: { text: emoji, key: lastMsg.key } });
          } catch (reactErr: any) {
            console.error('[JANIA-MATCH] Error al reaccionar al mensaje:', reactErr.message || reactErr);
          }
        }
      }

      // --- MODO STEALTH: Redirección al bot principal u oportuna advertencia grupal ---
      if (result) {
        const isWarning = result.classification === "DATOS_INCOMPLETOS" || result.classification === "VIOLACION_DE_NORMAS";

        if (isWarning) {
          const warningText = result.dmResponse || result.response || "";
          if (warningText.trim() !== "") {
            let cleanDmResponse = warningText;
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

            const shouldSendPublic = result.classification === "VIOLACION_DE_NORMAS" || !hasInteracted;

            if (shouldSendPublic) {
              let publicWarning = "";
              if (result.classification === "VIOLACION_DE_NORMAS") {
                publicWarning = `🚨 *LLAMADO DE ATENCIÓN* 🚨\n\nHola @${senderId.split('@')[0]},\n\nHe detectado que tu publicación infringe las normas de nuestro canal.\n\n*Detalle de la infracción:*\n${cleanDmResponse}\n\n*Nota:* Como casi nadie se toma la molestia de leer las normas en la descripción del grupo, te aclaro que estas reglas existen para mantener la comunidad ordenada y efectiva para todos.\n\nSi tienes dudas, por favor contacta a mi otro yo *JanIA v3.5* (atención y soporte al usuario) al +573185462265 o escribiéndole directamente aquí:\n👉 https://wa.me/573185462265`;
              } else {
                publicWarning = `⚠️ *INFORMACIÓN PENDIENTE* ⚠️\n\nHola @${senderId.split('@')[0]},\n\n${cleanDmResponse}\n\n*Nota:* Hacemos énfasis en esto porque casi nadie se toma la molestia de leer las normas de publicación en la descripción del grupo, pero estos datos son 100% obligatorios para que pueda procesar tu propiedad y buscarte un MATCH comercial.\n\nSi deseas completar tus datos o tienes dudas, por favor contacta directamente a mi versión principal de soporte, *JanIA v3.5*, escribiéndole al enlace:\n👉 https://wa.me/573185462265`;
              }

              console.log(`[JANIA-MATCH] [Public-Moderation] Enviando advertencia grupal a ${senderId} en ${chatId}`);
              await this.queuedSend(chatId, publicWarning, { mentions: [senderId] });
              await this.logToDb(senderId, 'janIA', `[PUBLIC-WARNING] ${publicWarning}`);
            } else {
              console.log(`[JANIA-MATCH] [Stealth] Derivando advertencia privada de datos incompletos a ${senderId} (Usuario conocido).`);
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
          const isConsultation = result.classification === "CONSULTA_GENERAL" || result.classification === "RESPUESTA_A_PREGUNTA_IA" || result.classification === "ANALISIS_DE_MERCADO";
          
          if (isConsultation && result.response && result.response.trim() !== "") {
            console.log(`[JANIA-MATCH] Enviando respuesta a consulta general en el grupo para ${senderId}`);
            await this.queuedSend(chatId, result.response, {
              mentions: [senderId],
              quoted: buffer.messages[buffer.messages.length - 1].originalMsg
            });
            await this.logToDb(senderId, 'janIA', `[GROUP-REPLY] ${result.response}`);
          } else {
            // SILENCIAR NOTIFICACIONES DE MATCH PÚBLICAS EN GRUPOS
            // En su lugar, se notifica únicamente al administrador de forma privada (seguro de baneo)
            if (result.response && result.response.trim() !== "") {
              console.log(`[JANIA-MATCH] Match detectado silenciosamente. Alertas enviadas al administrador.`);
              await sendAdminNotification(`🎯 *[MATCH DETECTADO]*\n\n${result.response}`);
              await this.logToDb(senderId, 'janIA', `[SILENT-MATCH] ${result.response}`);
            }

            // Confirmación privada de registro al usuario (Stealth)
            if (result.shouldSendDM && result.dmResponse && result.dmResponse.trim() !== "") {
              console.log(`[JANIA-MATCH] [Stealth] Derivando confirmación DM de ${senderId} al bot principal.`);
              await sendUserDM(senderId, result.dmResponse);
              await this.logToDb(senderId, 'janIA', `[DM-Stealth] ${result.dmResponse}`);
            }
          }
        }

        // Confirmaciones de Match adicionales
        if (result.extraDMs && result.extraDMs.length > 0) {
          for (const dm of result.extraDMs) {
            if (!dm.jid || !dm.jid.includes('@') || dm.jid.split('@')[0].length < 5) continue;
            console.log(`[JANIA-MATCH] [Stealth] Derivando notificación de Match para ${dm.jid} al bot principal.`);
            if (dm.viaMainBot) {
              await sendAdminNotification(dm.message);
            } else {
              await sendUserDM(dm.jid, dm.message);
            }
          }
        }
      }

      // ACTIVAR COOLDOWN DE 5 MINUTOS (solo en grupo principal)
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

  // --- ENVÍO LOCAL (Baileys) ---
  public async queuedSend(chatId: string, content: any, options: any = {}) {
    outgoingQueue = outgoingQueue.then(async () => {
      try {
        if (!this.sock) {
          throw new Error("Cliente Baileys no inicializado");
        }

        let messagePayload: any = {};

        // Si es un string
        if (typeof content === 'string') {
          messagePayload = { text: content };
          if (options.mentions) {
            messagePayload.mentions = options.mentions;
          }
        } 
        // Si es un objeto de tipo MessageMedia (de whatsapp-web.js)
        else if (content && content.data && content.mimetype) {
          const buffer = Buffer.from(content.data, 'base64');
          if (content.mimetype.startsWith('audio/')) {
            messagePayload = {
              audio: buffer,
              mimetype: content.mimetype,
              ptt: options.sendAudioAsVoice || false
            };
          } else if (content.mimetype.startsWith('image/')) {
            messagePayload = {
              image: buffer,
              mimetype: content.mimetype
            };
          } else {
            messagePayload = {
              document: buffer,
              mimetype: content.mimetype,
              fileName: content.filename || 'archivo'
            };
          }
        }

        const sendOptions: any = {};
        if (options.quoted) {
          sendOptions.quoted = options.quoted;
        }

        await this.sock.sendMessage(chatId, messagePayload, sendOptions);
        await delay(1000);
      } catch (err: any) {
        console.error('[JANIA-MATCH] Error en despacho de mensaje Baileys:', err.message || err);
      }
    });
    return outgoingQueue;
  }

  public async getPairingCode(phone: string): Promise<string> {
    const cleanPhone = phone.replace(/\D/g, "");
    console.log(`[JANIA-MATCH] Solicitando código de vinculación por número para: ${cleanPhone}`);
    if (!this.sock) {
      console.log("[JANIA-MATCH] Inicializando socket de Baileys bajo demanda para código de vinculación...");
      await this.initialize();
      await delay(3000);
    }
    try {
      if (this.sock.authState?.creds?.registered) {
        throw new Error("El bot de Match ya está registrado en este dispositivo.");
      }
      const code = await this.sock.requestPairingCode(cleanPhone);
      console.log(`[JANIA-MATCH] Código de vinculación generado: ${code}`);
      return code;
    } catch (err: any) {
      console.error("[JANIA-MATCH] Error al solicitar código de vinculación:", err.message || err);
      throw err;
    }
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
      console.log('\n🛑 Cerrando JanIA Match Bot (Baileys)...');
      try {
        if (this.sock) {
          await this.sock.end();
        }
      } catch (e) {}
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}

export const janiaMatchBot = new JaniaMatchBot();
