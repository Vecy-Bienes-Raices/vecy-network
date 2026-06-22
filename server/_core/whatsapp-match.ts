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
import { textToSpeechMedia, detectaVoz, sendAdminNotification, sendUserDM, setBotPendingData } from './whatsapp';
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

  constructor() {
    console.log('[JANIA-MATCH] Inicializando JanIA Match Bot (Ojos y Oídos)...');
    
    // Cargar grupos desde la configuración o usar defaults
    const groupsEnv = process.env.JANIA_MATCH_GROUPS;
    if (groupsEnv) {
      this.authorizedGroups = groupsEnv.split(',').map(g => g.trim());
    } else {
      // Valores predeterminados si no se configuran
      this.authorizedGroups = [
        '120363260108880069@g.us', // VECY INMUEBLES NETWORK
        '120363417740040773@g.us', // CONSULTORÍA JURÍDICA INMOBILIARIA
        '120363403507276533@g.us'  // CÍRCULO CERO 👌
      ];
    }

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
        remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1039212651-alpha.html"
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

          const textLower = (msg.body || "").toLowerCase();
          const hasDirectMention = textLower.includes("jania");

          // A. Si se le pregunta directamente al bot en el grupo, responde activamente
          if (hasDirectMention) {
            console.log(`[JANIA-MATCH] Pregunta directa de ${senderId} en grupo ${chatId}: "${msg.body}"`);
            await this.handleDirectGroupQuestion(msg, chatId, senderId);
            return;
          }

          // B. Si es una publicación comercial, procesar con el buffer extractor (Modo Silencioso)
          const isPossibleListing = 
            (msg.body || "").length > 120 || 
            (msg.body || "").split('\n').length > 2 || 
            msg.hasMedia ||
            textLower.includes("ofrezco") ||
            textLower.includes("busco") ||
            textLower.includes("vendo") ||
            textLower.includes("arriendo") ||
            textLower.includes("compro") ||
            textLower.includes("necesito");

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
        result = await processWhatsAppMessage(msg.body, senderId, realName, false, [], undefined, undefined, true);
      }

      if (result && result.response && result.response.trim() !== '') {
        const textToDeliver = result.response;
        const voiceToDeliver = result.voiceResponse || "";

        if (wantsVoice && voiceToDeliver.trim() !== "") {
          const media = await textToSpeechMedia(voiceToDeliver);
          if (media) {
            await this.queuedSend(chatId, media, { sendAudioAsVoice: true });
          } else {
            await this.queuedSend(chatId, textToDeliver);
          }
        } else {
          await this.queuedSend(chatId, textToDeliver);
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

      let buffer = this.messageBuffers.get(bufferKey);
      const bufferTimeout = 12000; // 12 Segundos

      if (buffer) {
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
      const result = await processWhatsAppMessage(
        fullText,
        senderId,
        userName,
        hasMedia,
        scrapedResults,
        undefined,
        imageMsg?.imageBuffer,
        true, // isGroup = true
        pdfMsg?.pdfBuffer,
        pdfMsg?.pdfMimeType
      );

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
          if (result.shouldSendDM && result.dmResponse && result.dmResponse.trim() !== "") {
            console.log(`[JANIA-MATCH] [Stealth] Derivando confirmación DM de ${senderId} al bot principal.`);
            await sendUserDM(senderId, result.dmResponse);
            // Registrar en BD también para auditoría completa
            await this.logToDb(senderId, 'janIA', `[DM-Stealth] ${result.dmResponse}`);
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
    
    this.watchdogInterval = setInterval(async () => {
      if (!this.isReady) return;
      try {
        const state = await this.client.getState();
        if (state !== 'CONNECTED') {
          console.warn(`[JANIA-MATCH] [Watchdog] Conexión inestable (${state}). Reiniciando...`);
          this.reconnectClient();
        }
      } catch (err) {
        console.error('[JANIA-MATCH] [Watchdog] Falla de respuesta. Reiniciando...');
        this.reconnectClient();
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
