import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import type { Client as ClientType, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { scrapePropertyLink, esDominioPermitido } from './scraper';
import { processWhatsAppMessage, generateWelcomeMessage } from './janIA';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db';
import { conversations, messages as dbMessages } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

// --- JanIA v2.0 Anti-Spam & Multi-Modal Types ---
interface AntiSpamState {
  lastBurstStartTime: number;
  messageCount: number;
  warningSent: boolean;
}

interface MessageBuffer {
  timer: NodeJS.Timeout;
  messages: string[];
  userName: string;
  hasMedia: boolean;
  imageBuffer?: string;
  chatId: string;
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
  
  // Buffers y estados de control
  private messageBuffers: Map<string, MessageBuffer> = new Map();
  private antiSpam: Map<string, AntiSpamState> = new Map();
  private pendingData: Map<string, PendingEntry> = new Map();
  
  private startTime: number = Date.now();
  private pendingWelcomeCount: number = 0;
  private counterFile: string = path.join(process.cwd(), '.pending_welcome_count');

  constructor() {
    console.log('[WHATSAPP-BOT] Inicializando JanIA v2.0 (Multimodal & Anti-Spam)...');
    this.loadCounter();
    
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'jania-main',
        dataPath: './.wwebjs_auth'
      }),
      puppeteer: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
        executablePath: process.env.CHROME_PATH || undefined,
        headless: true,
        protocolTimeout: 300000,
      }
    });

    this.setupEventListeners();
    this.setupGracefulShutdown();
    this.setupDailySchedule();
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

    } catch (e) {
      console.error('[LOG-DB] Error saving WhatsApp log:', e);
    }
  }

  // --- PERSISTENCIA DE CONTADORES ---
  private loadCounter() {
    try {
      if (fs.existsSync(this.counterFile)) {
        this.pendingWelcomeCount = parseInt(fs.readFileSync(this.counterFile, 'utf8')) || 0;
      }
    } catch (e) {}
  }

  private saveCounter() {
    try {
      fs.writeFileSync(this.counterFile, this.pendingWelcomeCount.toString(), 'utf8');
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

  // --- BROADCASTS Y HORARIOS ---
  private setupDailySchedule() {
    setInterval(() => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();

      if ((h === 6 || h === 18) && m === 0) {
        this.sendPresentacion().then(() => {
          setTimeout(() => this.sendNormas(), 4000);
        });
      }

      if (h >= 6 && h <= 20 && h % 2 === 0 && m === 30) {
        this.sendRecordatorio();
      }
    }, 60000);
  }

  // --- ESCUCHADORES DE EVENTOS ---
  private setupEventListeners() {
    this.client.on('qr', (qr: string) => {
      console.log('[WHATSAPP-BOT] Escanea el QR para JanIA:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      console.log('\n🚀 JANIA v2.0 OPERATIVA - MULTIMODAL & ANTI-SPAM ACTIVADOS');
      this.startTime = Date.now();
    });

    this.client.on('group_join', async (notification: any) => {
      if (notification.chatId !== this.targetGroupId) return;
      const joinedCount = notification.recipientIds?.length || 1;
      this.pendingWelcomeCount += joinedCount;
      this.saveCounter();
      if (this.pendingWelcomeCount >= 10) await this.sendBatchWelcome();
    });

    this.client.on('message_create', async (msg: Message) => {
      if (msg.fromMe) return;
      if (msg.timestamp * 1000 < this.startTime) return;

      try {
        const chat = await msg.getChat();
        const chatId = chat.id._serialized;
        const isTargetGroup = chatId === this.targetGroupId;
        const isGroup = chat.isGroup;

        // Comandos de administración
        const text = msg.body.toLowerCase();
        if (isTargetGroup && text.includes('jania')) {
          if (text.includes('normas') || text.includes('preséntate') || text.includes('anuncia') || text.includes('dipava')) {
            await this.handleAdminCommand(msg);
            return;
          }
        }

        // Orquestación principal (Grupo VECY o DM)
        if (isTargetGroup || !isGroup) {
          await this.handleIncomingMessage(msg, chatId);
        }
      } catch (e) {
        console.error('[WHATSAPP-BOT] Error en receptor:', e);
      }
    });
  }

  // --- LOGÍSTICA DE BUFFER Y ANTI-SPAM (REGLA 1 & 2) ---
  private async handleIncomingMessage(msg: Message, chatId: string) {
    const senderId = (msg as any).author || msg.from;
    const now = Date.now();
    const COOLDOWN_MS = 5 * 60 * 1000; // 5 Minutos
    const MAX_MESSAGES = 3;

    let state = this.antiSpam.get(senderId);

    // Si no existe o pasaron más de 5 minutos, reseteamos el bloque
    if (!state || (now - state.lastBurstStartTime > COOLDOWN_MS)) {
      state = {
        lastBurstStartTime: now,
        messageCount: 0,
        warningSent: false
      };
      this.antiSpam.set(senderId, state);
    }

    // Si ya envió 3 mensajes en este bloque de 5 minutos, bloqueamos
    if (state.messageCount >= MAX_MESSAGES) {
      if (!state.warningSent) {
        const contact = await msg.getContact();
        const userName = contact.pushname || contact.name || "colega";
        const warning = 
          `Estimado/a ${userName}, procesé con éxito tus primeras propiedades. ` +
          `Para cuidar la visibilidad de tus activos y no saturar la red, por favor espera 5 minutos ` +
          `antes de enviar tu siguiente bloque. ¡JanIA sigue atenta! 🏆`;
        
        await this.client.sendMessage(senderId, warning);
        state.warningSent = true;
      }
      return; // Omitir procesamiento (Anti-Spam)
    }

    state.messageCount++;

    // CAPA DE VISIÓN ARTIFICIAL (OCR - REGLA 2)
    let imageBuffer: string | undefined;
    if (msg.hasMedia && (msg.type === 'image')) {
      try {
        console.log(`[VISION] Descargando media multimodal para ${senderId}...`);
        const media = await msg.downloadMedia();
        if (media && media.mimetype.startsWith('image/')) {
          imageBuffer = media.data; // Base64
        }
      } catch (err) {
        console.error('[VISION] Fallo descarga de imagen:', err);
      }
    }

    const contact = await msg.getContact();
    const userName = contact.pushname || contact.name || contact.number || "Colega";

    const bufferKey = `${chatId}_${senderId}`;
    const buffer = this.messageBuffers.get(bufferKey);
    
    if (buffer) {
      clearTimeout(buffer.timer);
      buffer.messages.push(msg.body);
      buffer.hasMedia = buffer.hasMedia || msg.hasMedia;
      if (imageBuffer) buffer.imageBuffer = imageBuffer;
      buffer.timer = setTimeout(() => this.processBuffer(bufferKey), 15000);
    } else {
      this.messageBuffers.set(bufferKey, {
        messages: [msg.body],
        userName,
        hasMedia: msg.hasMedia,
        imageBuffer,
        chatId,
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
    const senderId = bufferKey.split('_')[1];
    
    this.messageBuffers.delete(bufferKey);

    try {
      await this.logToDb(senderId, 'user', fullText);

      // Scraping de links
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

      // Verificación de DM pendiente
      const isDM = !chatId.includes('@g.us');
      const pending = isDM ? this.pendingData.get(senderId) : null;

      if (pending && Date.now() < pending.expiresAt) {
        const combinedText = `[CONTEXTO]: "${pending.originalText}"\n[RESPUESTA]: "${fullText}"`;
        this.pendingData.delete(senderId);
        const result = await processWhatsAppMessage(combinedText, senderId, userName, false, [], undefined, imageBuffer);
        await this.handleJanIAResponse(result, senderId, chatId, userName, fullText, true);
        return;
      }

      // Procesamiento JanIA Multimodal
      const result = await processWhatsAppMessage(fullText, senderId, userName, hasMedia, scrapedResults, undefined, imageBuffer);
      await this.handleJanIAResponse(result, senderId, chatId, userName, fullText, false);

    } catch (e) {
      console.error('[WHATSAPP-BOT] Error procesando buffer:', e);
    }
  }

  private async handleJanIAResponse(result: any, senderId: string, chatId: string, userName: string, fullText: string, isFollowUp: boolean) {
    if (!result) return;

    const isGroup = chatId.includes('@g.us');
    const isMatch = result.response.includes("MATCH DETECTADO");
    const isConsultation = result.classification === "CONSULTA_GENERAL" || result.classification === "RESPUESTA_A_PREGUNTA_IA";

    if ((!isGroup || isMatch || isConsultation) && result.response.trim() !== "") {
      const mentions = Array.from(new Set([...(result.mentions || []), senderId]));
      await this.client.sendMessage(chatId, result.response, { 
        mentions: isGroup ? mentions : [] 
      });
      await this.logToDb(senderId, 'janIA', result.response);
    } else if (result.classification === "INMUEBLE" || result.classification === "REQUERIMIENTO") {
      // Confirmación privada si no hubo match
      const type = result.classification === "INMUEBLE" ? "tu inmueble" : "tu búsqueda";
      const msg = `¡Hola, ${userName}! 🧐 He registrado exitosamente ${type} en mi cerebro logístico. Seguiré monitoreando 24/7 y te avisaré en cuanto haya negocio. 🚀`;
      await this.client.sendMessage(senderId, msg);
    }

    // Nudge para datos incompletos
    if (result.shouldSendDM && !isMatch) {
      const missingList = (result.missingFields || []).map((q, i) => `${i + 1}. ${q}`).join('\n');
      const dmMsg = `🧠 *Hola, ${userName}!* Me faltan datos para completar el registro:\n\n${missingList}\n\nResponde aquí mismo. 🙏`;
      await this.client.sendMessage(senderId, dmMsg);
      
      if (isGroup) {
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

  // --- MÉTODOS DE APOYO Y COMANDOS ---
  private async handleAdminCommand(msg: Message) {
    const chat = await msg.getChat();
    const senderId = (msg as any).author || msg.from;
    const participant = (chat as any).participants?.find((p: any) => p.id._serialized === senderId);
    const isAdmin = participant?.isAdmin || participant?.isSuperAdmin || msg.fromMe;
    const text = msg.body.toLowerCase();

    if (!isAdmin) return;

    if (text.includes('normas')) await this.sendNormas();
    else if (text.includes('preséntate')) {
      await this.sendPresentacion();
      setTimeout(() => this.sendNormas(), 4000);
    }
    else if (text.includes('anuncia')) await this.sendAnuncioComision();
    else if (text.includes('dipava')) await this.sendApologyDeLaPava();
  }

  public async sendBatchWelcome() {
    const count = this.pendingWelcomeCount;
    this.pendingWelcomeCount = 0;
    this.saveCounter();
    try {
      const welcome = await generateWelcomeMessage(count);
      await this.client.sendMessage(this.targetGroupId, welcome);
      setTimeout(() => this.sendNormas(), 4000);
    } catch (e) {}
  }

  public async sendPresentacion() {
    const msg = `✨ *¡Bienvenidos a VECY Inmuebles Network!* 👋 Soy *JanIA*, la IA oficial del sector inmobiliario. Trabajo 24/7 leyendo y procesando cada mensaje en este grupo para encontrar matches perfectos. Cero esfuerzo para ustedes. Máximos resultados. 🏆`;
    await this.client.sendMessage(this.targetGroupId, msg);
  }

  public async sendNormas() {
    const msg = `📋 *NORMAS VECY v10.1*\n\n1. Publica con link o texto claro.\n2. Máximo 3 propiedades por bloque de 5 min.\n3. Indica zona EXACTA (Barrio).\n\nJanIA ahora procesa imágenes y flyers automáticamente. 📸✨`;
    await this.client.sendMessage(this.targetGroupId, msg);
  }

  public async sendRecordatorio() {
    const msg = `📌 *RECORDATORIO:* JanIA prefiere barrios exactos para matches precisos. ¡Gana tiempo siendo específico! 🎯`;
    await this.client.sendMessage(this.targetGroupId, msg);
  }

  public async sendAnuncioComision() {
    const msg = `📢 *ANUNCIO:* VECY no cobra comisiones durante esta etapa de prueba. ¡Aprovechen para cerrar negocios sin costo! 🎯🏆`;
    await this.client.sendMessage(this.targetGroupId, msg);
  }

  public async sendApologyDeLaPava() {
    const deLaPavaId = '105188731928753@lid';
    await this.client.sendMessage(this.targetGroupId, `🙏 Disculpas al grupo por el formato anterior. Ya estamos al día con De La Pava Group.`);
    await this.client.sendMessage(deLaPavaId, `Ya registré su requerimiento correctamente. ¡Gracias por su paciencia!`);
  }

  public initialize() {
    this.client.initialize();
  }
}

export const whatsappBot = new WhatsAppBot();
