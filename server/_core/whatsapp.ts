import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import type { Client as ClientType, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { scrapePropertyLink, esDominioPermitido } from './scraper';
import { 
  processWhatsAppMessage, 
  generateWelcomeMessage,
  MSG_PRESENTACION_INSTITUCIONAL,
  MSG_PAUTAS_FORMATOS,
  MSG_EMBUDO_REPUTACION
} from './janIA';
import { publishToFacebookGroup } from "./facebookService";
import fs from 'fs';
import path from 'path';
import { getDb } from '../db';
import { conversations, messages as dbMessages } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

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
  
  // Estructuras de control dinámicas
  private messageBuffers: Map<string, MessageBuffer> = new Map();
  private cooldownMap: Map<string, AntiSpamState> = new Map();
  private pendingData: Map<string, PendingEntry> = new Map();
  
  private startTime: number = Date.now();
  private pendingWelcomeCount: number = 0;
  private counterFile: string = path.join(process.cwd(), '.pending_welcome_count');

  constructor() {
    console.log('[WHATSAPP-BOT] Inicializando JanIA v2.0 (CORE v10.5 - Multimodal & Anti-Spam)...');
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

  // --- PERSISTENCIA Y CIERRE ---
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

  // --- LOGÍSTICA DE BROADCASTS ---
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

  // --- MANEJO DE EVENTOS ---
  private setupEventListeners() {
    this.client.on('qr', (qr: string) => {
      console.log('[WHATSAPP-BOT] Escanea el QR para JanIA:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      console.log('\n🚀 JANIA v2.0 CORE v10.5 — SISTEMA NACIONAL ELÁSTICO ACTIVADO');
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

        // Comandos de administración (JanIA v2.0)
        const text = msg.body.toLowerCase();
        if (isTargetGroup && text.includes('jania')) {
          if (text.includes('normas') || text.includes('preséntate') || text.includes('anuncia') || text.includes('dipava')) {
            await this.handleAdminCommand(msg);
            return;
          }
        }

        // Orquestación principal (Reglas de Buffer y Geografía)
        if (isTargetGroup || !isGroup) {
          await this.handleIncomingMessage(msg, chatId);
        }
      } catch (e) {
        console.error('[WHATSAPP-BOT] Error en receptor:', e);
      }
    });
  }

  // --- 1. LOGÍSTICA DEL BUFFER DINÁMICO Y ANTI-SPAM (CORE v10.5) ---
  private async handleIncomingMessage(msg: Message, chatId: string) {
    const senderId = (msg as any).author || msg.from;
    const now = Date.now();
    const COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 Minutos de espera entre bloques
    const MAX_BLOCK_SIZE = 3;             // Máximo 3 mensajes por bloque

    let cooldown = this.cooldownMap.get(senderId);

    // Verificación de Cooldown (Anti-Spam)
    if (cooldown && (now - cooldown.lastBlockProcessedAt < COOLDOWN_PERIOD)) {
      if (!cooldown.warningSent) {
        const contact = await msg.getContact();
        const userName = contact.pushname || contact.name || "colega";
        const warningText = 
          `Estimado/a ${userName}, procesé con éxito tus primeras propiedades. ` +
          `Para cuidar la visibilidad de tus activos y no saturar la red de los aliados, ` +
          `por favor espera 5 minutos antes de enviar tu siguiente bloque. ¡JanIA sigue atenta para ayudarte a cerrar! 🏆`;
        
        await this.client.sendMessage(senderId, warningText);
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
    const userName = contact.pushname || contact.name || contact.number || "Colega";
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
        userName,
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

      // --- JanIA-Sync: Sincronización con Facebook Groups (v11.0) ---
      if (result && (result.classification === "INMUEBLE" || result.classification === "REQUERIMIENTO")) {
        console.log("[JanIA-Sync] Sincronizando con Facebook Groups...");
        publishToFacebookGroup(fullText, imageBuffer)
          .then(success => {
            if (success) console.log("✅ [Facebook-Sync] Publicación clonada en VECY Network CO.");
          })
          .catch(err => console.error("❌ [Facebook-Sync-Error]:", err.message));
      }

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

    // Notificación en el grupo (Solo Matches o Consultas)
    if ((!isGroup || isMatch || isConsultation) && result.response && result.response.trim() !== "") {
      const mentions = Array.from(new Set([...(result.mentions || []), senderId]));
      await this.client.sendMessage(chatId, result.response, { 
        mentions: isGroup ? mentions : [] 
      });
      await this.logToDb(senderId, 'janIA', result.response);
    }

    // Flujos Privados (DMs) para Éxito o Datos Incompletos
    if (result.shouldSendDM) {
      const dmMsg = result.dmResponse || result.response;
      if (dmMsg && dmMsg.trim() !== "") {
        const options: any = {};
        if (result.dmShouldReply && originalMsg) {
          options.quotedMessageId = originalMsg.id._serialized;
        }
        await this.client.sendMessage(senderId, dmMsg, options);
        await this.logToDb(senderId, 'janIA', `[DM] ${dmMsg}`);
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
  }

  // --- MÉTODOS DE BROADCAST ---
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
    await this.client.sendMessage(this.targetGroupId, MSG_PRESENTACION_INSTITUCIONAL);
  }

  public async sendNormas() {
    await this.client.sendMessage(this.targetGroupId, MSG_PAUTAS_FORMATOS);
  }

  public async sendRecordatorio() {
    await this.client.sendMessage(this.targetGroupId, MSG_EMBUDO_REPUTACION);
  }

  public async sendAnuncioComision() {
    const msg = `📢 *ANUNCIO:* Seguimos en etapa de prueba gratuita. VECY no cobra comisiones por los matches generados en este grupo. ¡A cerrar negocios! 🎯🏆`;
    await this.client.sendMessage(this.targetGroupId, msg);
  }

  public async sendApologyDeLaPava() {
    const deLaPavaId = '105188731928753@lid';
    await this.client.sendMessage(this.targetGroupId, `🙏 Ajuste de sistema realizado. Cobertura nacional elástica activada para todos los aliados.`);
    await this.client.sendMessage(deLaPavaId, `Su requerimiento nacional ha sido indexado con éxito. ¡JanIA sigue atenta!`);
  }

  public async sendToGroup(text: string) {
    try {
      await this.client.sendMessage(this.targetGroupId, text);
    } catch (e) {
      console.error('[WHATSAPP-BOT] Error enviando mensaje al grupo:', e);
    }
  }

  public initialize() {
    this.client.initialize();
  }
}

export const whatsappBot = new WhatsAppBot();
