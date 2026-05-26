import './setup-stealth'; // Configurar Stealth Puppeteer antes de importar whatsapp-web.js
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import type { Client as ClientType, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { scrapePropertyLink, esDominioPermitido } from './scraper';
import { 
  processWhatsAppMessage, 
  generateWelcomeMessage,
  MSG_PRESENTACION_INSTITUCIONAL,
  MSG_PAUTAS_FORMATOS
} from './janIA';
import { publishToFacebookGroup } from "./facebookService";
import fs from 'fs';
import path from 'path';
import { getDb } from '../db';
import { conversations, messages as dbMessages } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

// --- JanIA v2.0 Global Time Constraints (v11.97) ---
const SERVER_BOOT_TIME = Math.floor(Date.now() / 1000);

// --- JanIA v2.0 Human Simulation Helpers (v11.99) ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let outgoingQueue: Promise<any> = Promise.resolve();

// --- JanIA v2.0 Anti-Spam & Multi-Modal Types (v10.5) ---
interface AntiSpamState {
  lastBlockProcessedAt: number; // Timestamp de la última vez que se procesó un bloque completo
  warningSent: boolean;         // Para evitar spam de advertencias durante el mismo cooldown
}

interface MessageBuffer {
  timer: NodeJS.Timeout;
  messages: string[];
  userName: string;
  hasMedia: boolean;
  imageBuffer?: string;
  chatId: string;
  originalMsg?: Message;
}

interface PendingEntry {
  originalText: string;
  extractedData: any;
  classification: string;
  missingFields: string[];
  expiresAt: number;
}

export class WhatsAppBot {
  private client: ClientType;
  private targetGroupId: string = '120363260108880069@g.us';
  public isReady: boolean = false;
  
  // Estructuras de control dinámicas
  private messageBuffers: Map<string, MessageBuffer> = new Map();
  private cooldownMap: Map<string, AntiSpamState> = new Map();
  private pendingData: Map<string, PendingEntry> = new Map();
  
  private pendingWelcomeCount: number = 0;
  private counterFile: string = path.join(process.cwd(), '.pending_welcome_count');
  public pendingWelcomeJids: string[] = [];
  private jidsFile: string = path.join(process.cwd(), '.pending_welcome_jids');

  // Control de límites y anti-flood (v12.0)
  private dailyMessageLimit: number = 250;
  private messagesSentToday: number = 0;
  private lastResetDate: string = new Date().toDateString();
  private chatMessageTimes: Map<string, number[]> = new Map();
  private blockedChats: Map<string, number> = new Map();
  private blacklistedBots: string[] = process.env.BLACKLISTED_BOTS ? process.env.BLACKLISTED_BOTS.split(',') : [];

  // --- ANTI-BURST & ANTI-FLOOD QUEUED DISPATCH (v12.0) ---
  private async queuedSend(chatId: string, content: any, options: any = {}) {
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

        // Promesa de envío con timeout de 15 segundos para evitar bloqueos por chats inaccesibles o páginas caídas
        const sendPromise = this.client.sendMessage(chatId, content, options);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout al enviar mensaje de WhatsApp a ${chatId}`)), 15000)
        );

        await Promise.race([sendPromise, timeoutPromise]);

        this.messagesSentToday++;
        console.log(`[WhatsApp-Bot] Mensaje enviado a ${chatId}. Total hoy: ${this.messagesSentToday}/${this.dailyMessageLimit}`);
        // Intervalo obligatorio de 10s a 15s
        await delay(Math.floor(Math.random() * 5000) + 10000);
      } catch (err: any) {
        console.error('[Anti-Burst-Queue] Fallo en despacho secuencial:', err.message || err);
      }
    });
    return outgoingQueue;
  }

  constructor() {
    console.log('[WHATSAPP-BOT] Inicializando JanIA v2.0 (CORE v10.5 - Multimodal & Anti-Spam)...');
    this.loadCounter();
    
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
          '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        ],
        protocolTimeout: 300000,
      }
    });

    this.setupEventListeners();
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



  // --- MANEJO DE EVENTOS ---
  private setupEventListeners() {
    this.client.on('qr', (qr: string) => {
      console.log('[WHATSAPP-BOT] Escanea el QR para JanIA:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      console.log('\n🚀 JANIA v2.0 CORE v10.5 — SISTEMA NACIONAL ELÁSTICO ACTIVADO');
      this.isReady = true;
    });

    this.client.on('disconnected', (reason) => {
      console.log('[WHATSAPP-BOT] Cliente desconectado:', reason);
      this.isReady = false;
    });

    this.client.on('group_join', async (notification: any) => {
      if (notification.chatId !== this.targetGroupId) return;
      const joinedIds = notification.recipientIds || [];
      this.pendingWelcomeJids.push(...joinedIds);
      this.pendingWelcomeCount = this.pendingWelcomeJids.length;
      this.saveCounter();
      if (this.pendingWelcomeCount >= 10) await this.sendBatchWelcome();
    });

    this.client.on('message_create', async (msg: Message) => {
      // 1. FILTRO TEMPRANO DE SEGURIDAD (ANTI-SPAM BROADCAST)
      if ((msg.from && msg.from.includes('status@broadcast')) || (msg.author && msg.author.includes('status@broadcast'))) {
        return;
      }

      // 2. FILTRO DE MENSAJES HISTÓRICOS (v11.97)
      if (msg.timestamp < SERVER_BOOT_TIME) {
        return;
      }

      const senderId = (msg as any).author || msg.from;
      if (msg.fromMe || this.blacklistedBots.includes(senderId)) {
        return;
      }

      // --- CAPA DE LECTURA HUMANA (v11.99) ---
      // Simula tiempo de lectura entre 2 y 4 segundos
      await delay(Math.floor(Math.random() * 2000) + 2000);

      try {
        const chat = await msg.getChat();
        
        // Activar estado "Escribiendo..." (Typing) para simular presencia humana
        await chat.sendStateTyping();

        const chatId = chat.id._serialized;
        const isGroup = chat.isGroup;
        const isTargetGroup = chatId === this.targetGroupId;

        // 1. RAMA DE GRUPO (VECY INMUEBLES NETWORK)
        if (isTargetGroup) {
          const text = msg.body.toLowerCase();
          // Comandos de administración
          if (text.includes('jania')) {
            if (text.includes('normas') || text.includes('preséntate') || text.includes('anuncia') || text.includes('dipava') || text.includes('retorno')) {
              await this.handleAdminCommand(msg);
              return;
            }
          }
          // Orquestación con Buffer y Cooldown (Lógica v10.5 intacta)
          await this.handleIncomingMessage(msg, chatId);
          return;
        }

        // 2. RAMA Conversacional PRIVADA (DM Branch - v11.15 - Con Buffer anti-duplicados)
        if (!isGroup) {
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
      const contact = await msg.getContact();
      const rawPhone = (msg.author || msg.from).split("@")[0];
      const realName = contact.pushname || contact.name || `Asesor +${rawPhone}`;

      console.log(`[JanIA-DM] Atendiendo mensaje interno de ${realName} (${senderId})...`);

      // Capa Multimodal OCR para DMs (Visión)
      let imageBuffer: string | undefined;
      if (msg.hasMedia && msg.type === 'image') {
        try {
          const media = await msg.downloadMedia();
          if (media && media.mimetype.startsWith('image/')) {
            imageBuffer = media.data;
          }
        } catch (e) {
          console.error('[JanIA-DM-Vision] Error descargando imagen:', e);
        }
      }

      const result = await processWhatsAppMessage(
        msg.body, 
        senderId, 
        realName, 
        msg.hasMedia, 
        [], // Sin scraping para DMs simples
        undefined, 
        imageBuffer
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

  // --- 1. LOGÍSTICA DEL BUFFER DINÁMICO Y ANTI-SPAM (CORE v10.5) ---
  private async handleIncomingMessage(msg: Message, chatId: string) {
    const senderId = (msg as any).author || msg.from;
    const now = Date.now();
    const COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 Minutos de espera entre bloques
    const MAX_BLOCK_SIZE = 3;             // Máximo 3 mensajes por bloque

    let cooldown = this.cooldownMap.get(senderId);
    const isGroupChat = chatId.includes('@g.us');

    // Verificación de Cooldown (Anti-Spam - Solo aplica en Grupos)
    if (isGroupChat && cooldown && (now - cooldown.lastBlockProcessedAt < COOLDOWN_PERIOD)) {
      if (!cooldown.warningSent) {
        const contact = await msg.getContact();
        const rawPhone = (msg.author || msg.from).split("@")[0];
        const realName = contact.pushname || contact.name || `Asesor +${rawPhone}`;
        const warningText = 
          `Estimado/a ${realName}, procesé con éxito tus primeras propiedades. ` +
          `Para cuidar la visibilidad de tus activos y no saturar la red de los aliados, ` +
          `por favor espera 5 minutes antes de enviar tu siguiente bloque. ¡JanIA sigue atenta para ayudarte a cerrar! 🏆`;
        
        await this.queuedSend(senderId, warningText);
        cooldown.warningSent = true;
      }
      return; // Detener procesamiento del mensaje excedente
    }

    // 2. CAPA DE VISIÓN ARTIFICIAL (OCR - REGLA 2)
    let imageBuffer: string | undefined;
    if (msg.hasMedia && msg.type === 'image') {
      try {
        console.log(`[VISION] Escaneando flyer/imagen de ${senderId}...`);
        const media = await msg.downloadMedia();
        if (media && media.mimetype.startsWith('image/')) {
          imageBuffer = media.data; // Base64 directo a JanIA
        }
      } catch (err) {
        console.error('[VISION] Error descargando media:', err);
      }
    }

    const contact = await msg.getContact();
    const rawPhone = (msg.author || msg.from).split("@")[0];
    const realName = contact.pushname || contact.name || `Asesor +${rawPhone}`;
    const bufferKey = `${chatId}_${senderId}`;
    let buffer = this.messageBuffers.get(bufferKey);
    
    if (buffer) {
      // Si el bloque ya llegó a 3 mensajes, ignoramos los siguientes dentro de la misma ráfaga
      if (buffer.messages.length >= MAX_BLOCK_SIZE) {
        console.log(`[BUFFER] Límite de bloque alcanzado para ${senderId}.`);
        return;
      }

      clearTimeout(buffer.timer);
      buffer.messages.push(msg.body);
      buffer.hasMedia = buffer.hasMedia || msg.hasMedia;
      if (imageBuffer) buffer.imageBuffer = imageBuffer;
      buffer.originalMsg = msg; // Referencia para replies
      buffer.timer = setTimeout(() => this.processBuffer(bufferKey), 15000);
    } else {
      // Inicio de un nuevo bloque
      this.messageBuffers.set(bufferKey, {
        messages: [msg.body],
        userName: realName,
        hasMedia: msg.hasMedia,
        imageBuffer,
        chatId,
        originalMsg: msg,
        timer: setTimeout(() => this.processBuffer(bufferKey), 15000)
      });
    }
  }

  private async processBuffer(bufferKey: string) {
    const buffer = this.messageBuffers.get(bufferKey);
    if (!buffer) return;

    const fullText = buffer.messages.join('\n\n');
    const userName = buffer.userName;
    const hasMedia = buffer.hasMedia;
    const imageBuffer = buffer.imageBuffer;
    const chatId = buffer.chatId;
    const originalMsg = buffer.originalMsg;
    const senderId = bufferKey.split('_')[1];
    
    this.messageBuffers.delete(bufferKey);

    try {
      // 1. Log en DB
      await this.logToDb(senderId, 'user', fullText);

      // 2. Scraping multicanal
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

      // 3. Procesamiento JanIA (v10.5 integra Visión y Geografía Nacional)
      const isDM = !chatId.includes('@g.us');
      const pending = isDM ? this.pendingData.get(senderId) : null;

      let result;
      if (pending && Date.now() < pending.expiresAt) {
        const combinedText = `[CONTEXTO]: "${pending.originalText}"\n[RESPUESTA]: "${fullText}"`;
        this.pendingData.delete(senderId);
        result = await processWhatsAppMessage(combinedText, senderId, userName, false, [], undefined, imageBuffer);
      } else {
        result = await processWhatsAppMessage(fullText, senderId, userName, hasMedia, scrapedResults, undefined, imageBuffer);
      }

      // 4. Orquestación de Respuestas (Silencio de Oro / Flujos DM)
      await this.handleJanIAResponse(result, senderId, chatId, userName, fullText, originalMsg);

      // --- JanIA-Sync: Sincronización con Facebook Groups (v11.0) - DESACTIVADO POR AHORA ---
      /*
      if (result && (result.classification === "INMUEBLE" || result.classification === "REQUERIMIENTO")) {
        console.log("[JanIA-Sync] Sincronizando con Facebook Groups...");
        publishToFacebookGroup(fullText, imageBuffer)
          .then(success => {
            if (success) console.log("✅ [Facebook-Sync] Publicación clonada en VECY Network CO.");
          })
          .catch(err => console.error("❌ [Facebook-Sync-Error]:", err.message));
      }
      */

      // 5. ACTIVAR COOLDOWN DE 5 MINUTOS (Tras procesar con éxito)
      this.cooldownMap.set(senderId, {
        lastBlockProcessedAt: Date.now(),
        warningSent: false
      });

    } catch (e) {
      console.error('[WHATSAPP-BOT] Error crítico en procesamiento de bloque:', e);
    }
  }

  // --- ORQUESTACIÓN DE RESPUESTAS Y PERSONALIZACIÓN (JanIA v2.0) ---
  private async handleJanIAResponse(result: any, senderId: string, chatId: string, userName: string, fullText: string, originalMsg?: Message) {
    if (!result) return;

    const isGroup = chatId.includes('@g.us');
    const isMatch = result.response && result.response.includes("MATCH DETECTADO");
    const isConsultation = result.classification === "CONSULTA_GENERAL" || result.classification === "RESPUESTA_A_PREGUNTA_IA";
    const isViolation = result.classification === "VIOLACION_DE_NORMAS";

    // Notificación en el grupo o DM (evitando duplicar si se procesará abajo en shouldSendDM)
    const shouldSendGroup = isGroup && (isMatch || isConsultation || isViolation);
    const shouldSendDMDirect = !isGroup && !result.shouldSendDM;

    if ((shouldSendGroup || shouldSendDMDirect) && result.response && result.response.trim() !== "") {
      const mentions = Array.from(new Set([...(result.mentions || []), senderId]));
      const options: any = { 
        mentions: isGroup ? mentions : [] 
      };
      if (isViolation && originalMsg) {
        options.quotedMessageId = originalMsg.id._serialized;
      }
      await this.queuedSend(chatId, result.response, options);
      await this.logToDb(senderId, 'janIA', result.response);
    }

    // Reaccionar con emojis a los mensajes del grupo para retroalimentación sin generar DMs fríos
    if (isGroup && originalMsg) {
      try {
        if (result.classification === "INMUEBLE" || result.classification === "REQUERIMIENTO") {
          await originalMsg.react('✅');
        } else if (result.classification === "DATOS_INCOMPLETOS") {
          await originalMsg.react('⚠️');
        } else if (result.classification === "VIOLACION_DE_NORMAS") {
          await originalMsg.react('❌');
        }
      } catch (e) {
        console.error('[React-Error] Fallo al reaccionar al mensaje original:', e);
      }
    }

    // Flujos Privados (DMs) o Invitación a Opt-in
    if (result.shouldSendDM) {
      const dmMsg = result.dmResponse || result.response;
      if (dmMsg && dmMsg.trim() !== "") {
        if (isGroup) {
          // Si proviene de un grupo y faltan datos, enviamos un link wa.me público con la advertencia en el grupo
          if (result.classification === "DATOS_INCOMPLETOS") {
            const botNumber = this.client.info?.wid?.user;
            const rawPhone = senderId.split('@')[0];
            const targetText = encodeURIComponent(`Hola JanIA, deseo completar mi publicación del barrio.`);
            const waLink = botNumber ? `https://wa.me/${botNumber}?text=${targetText}` : `un chat privado conmigo`;
            
            const groupReplyText = `⚠️ *DATOS INCOMPLETOS* ⚠️\n\nHola @${rawPhone}, registré parte de tu publicación, pero me hace falta la ubicación exacta (barrio o municipio) para activar los cruces automáticos.\n\n👉 Por favor, presiona este enlace e inicia un chat privado para completarla de forma segura: ${waLink}`;
            
            await this.queuedSend(chatId, groupReplyText, {
              mentions: [senderId],
              quotedMessageId: originalMsg?.id?._serialized
            });
            await this.logToDb(senderId, 'janIA', `[Group-OptIn-Notice] ${groupReplyText}`);
          }
          // Para publicaciones perfectas, omitimos el DM de confirmación para evitar sospechas de spam en Meta (ya se marcó con ✅)
        } else {
          // Si el chat ya se originó en privado (DM), respondemos normalmente en privado
          const options: any = {};
          if (result.dmShouldReply && originalMsg) {
            options.quotedMessageId = originalMsg.id._serialized;
          }
          await this.queuedSend(senderId, dmMsg, options);
          await this.logToDb(senderId, 'janIA', `[DM] ${dmMsg}`);
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
    else if (text.includes('anuncia')) await this.sendAnuncioComision();
    else if (text.includes('dipava')) await this.sendApologyDeLaPava();
    else if (text.includes('retorno')) await this.sendAnuncioRetorno();
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
    let msg = `🚀 *¡JANIA ESTÁ DE VUELTA Y MÁS AFILADA QUE NUNCA!* 🤖🏛️\n\n` +
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
    if (this.pendingWelcomeJids && this.pendingWelcomeJids.length > 0) {
      msg += `\n\n━━━━━━━━━━━━━━━━━━━━━━\n` +
             `✨ *¡BIENVENIDOS A LA RED VECY NETWORK!* ✨\n` +
             `Damos una calurosa bienvenida a los nuevos aliados que se han unido a nuestro ecosistema colaborativo:\n`;
      
      this.pendingWelcomeJids.forEach((jid) => {
        const phone = jid.split('@')[0];
        msg += `▸ @${phone}\n`;
        jidsToMention.push(jid);
      });
      
      msg += `\nYa estoy 100% activa para escanear sus publicaciones y buscarles cierres sin cobro de comisiones. ¡Muchos éxitos en sus negocios! 🚀🎯`;
      
      this.pendingWelcomeJids = [];
      this.pendingWelcomeCount = 0;
      this.saveCounter();
    }

    const imgPath = path.resolve('./client/public/jania_perfil.png');
    if (fs.existsSync(imgPath)) {
      const media = MessageMedia.fromFilePath(imgPath);
      await this.queuedSend(this.targetGroupId, media, { caption: msg, mentions: jidsToMention });
    } else {
      await this.queuedSend(this.targetGroupId, msg, { mentions: jidsToMention });
    }
  }

  public async sendToGroup(text: string, mediaPath?: string, mentions?: string[]) {
    try {
      const options: any = { mentions: mentions || [] };

      if (mediaPath) {
        const media = MessageMedia.fromFilePath(path.resolve(mediaPath));
        await this.queuedSend(this.targetGroupId, media, { ...options, caption: text });
      } else {
        await this.queuedSend(this.targetGroupId, text, options);
      }
    } catch (e) {
      console.error('[WHATSAPP-BOT] Error enviando mensaje al grupo:', e);
    }
  }

  public initialize() {
    this.client.initialize().catch(err => {
      console.error('[WHATSAPP-BOT] Error crítico durante la inicialización de whatsapp-web.js:', err);
    });
  }
}

export const whatsappBot = new WhatsAppBot();
