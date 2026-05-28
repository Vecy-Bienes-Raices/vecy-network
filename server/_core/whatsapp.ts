import './setup-stealth'; // Configurar Stealth Puppeteer antes de importar whatsapp-web.js
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import type { Client as ClientType, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { scrapePropertyLink, esDominioPermitido } from './scraper';
import { 
  processWhatsAppMessage, 
  processConsultingMessage,
  processCirculoMessage,
  generateWelcomeMessage,
  MSG_PRESENTACION_INSTITUCIONAL,
  MSG_PAUTAS_FORMATOS,
  MSG_PROMO_INMUEBLES,
  MSG_PROMO_CONSULTAS,
  MSG_PROMO_CIRCULO
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

interface BufferedMessage {
  body: string;
  hasMedia: boolean;
  imageBuffer?: string;
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

export class WhatsAppBot {
  private client: ClientType;
  private targetGroupId: string = '120363260108880069@g.us';
  private buzonGroupId: string = '120363417740040773@g.us';
  private circuloGroupId: string = '120363403507276533@g.us';
  public isReady: boolean = false;
  
  // Estructuras de control dinámicas
  private messageBuffers: Map<string, MessageBuffer> = new Map();
  private cooldownMap: Map<string, AntiSpamState> = new Map();
  private pendingData: Map<string, PendingEntry> = new Map();
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
    this.loadCooldowns();
    this.loadPendingData();
    
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
      console.log('\n🚀 JANIA v2.0 CORE v10.5 — SISTEMA NACIONAL ELÁSTICO ACTIVADO');
      this.isReady = true;
      this.exportRecentJoinsToFile().catch(err => {
        console.error('[WHATSAPP-BOT] Error al exportar uniones en ready:', err);
      });
    });

    this.client.on('disconnected', (reason) => {
      console.log('[WHATSAPP-BOT] Cliente desconectado:', reason);
      this.isReady = false;
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
              const contact = await this.client.getContactById(senderId);
              const realName = contact.name || contact.pushname || `Asesor +${senderId.split('@')[0]}`;
              
              console.log(`[JanIA-Reaction] Reacción de desaprobación/sarcasmo detectada de ${realName}`);
              
              const promptContext = `[REACCIÓN NEGATIVA/SARCASMO/DESAPROBACIÓN]: El usuario @${senderId.split('@')[0]} (${realName}) ha reaccionado con el emoji ${reaction.reaction} a tu mensaje: "${msg.body}". Genera una respuesta en el grupo dirigiéndote a este aliado/colega. Responde de manera sumamente cordial, respetuosa y profesional, pero con total firmeza y una sutil pero brillante auto-defensa. Debes defender tus capacidades de inteligencia artificial, al equipo de desarrollo y fundadores de VECY (Jani Alves y Eduardo A. Rivera), y el valor del proyecto VECY Network (red colaborativa gratuita y sin comisiones). Hazle ver con argumentos elocuentes e inteligentes que la tecnología seria y el trabajo estructurado es lo que genera matches y cierra negocios, rebatiendo su reacción con elegancia comercial. Usa emojis.`;
              
              const result = await processWhatsAppMessage(promptContext, senderId, realName);
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
        const isBuzonGroup = chatId === this.buzonGroupId;

        const isCirculoGroup = chatId === this.circuloGroupId;

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
  // Wrapper que serializa entradas por senderId usando un mutex ligero.
  // Esto evita la condición de carrera cuando WhatsApp envía un álbum de imágenes
  // y todos los mensajes llegan casi simultáneamente antes de que el buffer exista.
  private async handleIncomingMessage(msg: Message, chatId: string) {
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

    let cooldown = this.cooldownMap.get(senderId);

    // Verificación de Cooldown (Anti-Spam - Solo aplica en el grupo principal VECY INMUEBLES NETWORK)
    // El cooldown es por grupo (no global): un aliado puede publicar en el Buzón o Círculo
    // aunque tenga cooldown activo en el grupo principal VECY INMUEBLES NETWORK.
    const isMainGroup = chatId === this.targetGroupId;
    const cooldownKey = `${chatId}_${senderId}`; // Clave compuesta grupo + usuario
    cooldown = this.cooldownMap.get(cooldownKey) as AntiSpamState | undefined;
    if (isMainGroup && cooldown && (now - cooldown.lastBlockProcessedAt < COOLDOWN_PERIOD)) {
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

    const contact = await msg.getContact();
    const rawPhone = (msg.author || msg.from).split("@")[0];
    const realName = contact.pushname || contact.name || `Asesor +${rawPhone}`;
    const bufferKey = `${chatId}_${senderId}`;
    let buffer = this.messageBuffers.get(bufferKey);

    // NOTA: La descarga de media (downloadMedia) se realiza en processBuffer, NO aquí.
    // Hacerla aquí causaba una condición de carrera: los mensajes de un álbum de imágenes
    // llegan casi simultáneamente, y el await de downloadMedia hacía que todos leyeran
    // el buffer vacío antes de que el primero lo creara, generando advertencias falsas.
    
    if (buffer) {
      // Si el bloque ya llegó a MAX_BLOCK_SIZE mensajes, advertimos y descartamos los excedentes
      if (buffer.messages.length >= MAX_BLOCK_SIZE) {
        console.log(`[BUFFER] Límite de bloque (${MAX_BLOCK_SIZE}) alcanzado para ${senderId}. Mensaje #${buffer.messages.length + 1} descartado.`);
        if (isGroupChat) {
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
      buffer.timer = setTimeout(() => this.processBuffer(bufferKey), 15000);
    } else {
      // Inicio de un nuevo bloque
      console.log(`[BUFFER] Nuevo bloque iniciado para ${senderId}. Mensaje #1 registrado.`);
      this.messageBuffers.set(bufferKey, {
        messages: [{
          body: msg.body,
          hasMedia: msg.hasMedia,
          imageBuffer: undefined, // Se descargará en processBuffer
          originalMsg: msg
        }],
        userName: realName,
        chatId,
        timer: setTimeout(() => this.processBuffer(bufferKey), 15000)
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
      const finalListingTexts: { text: string; hasMedia: boolean; imageBuffer?: string; originalMsg: Message }[] = [];
      for (const group of linkGroups) {
        const groupText = group.map(m => m.body).join('\n\n');
        const groupHasMedia = group.some(m => m.hasMedia);
        const groupImageBuffer = group.find(m => m.imageBuffer)?.imageBuffer;
        const originalMsg = group[group.length - 1].originalMsg;

        const partitioned = partitionTextByListings(groupText);
        for (const itemText of partitioned) {
          finalListingTexts.push({
            text: itemText,
            hasMedia: groupHasMedia,
            imageBuffer: groupImageBuffer,
            originalMsg
          });
        }
      }

      console.log(`[processBuffer] Procesando ${finalListingTexts.length} listings para ${senderId} de un total de ${buffer.messages.length} mensajes en buffer.`);

      // Procesar secuencialmente aplicando el límite estricto de 3 listings
      let processedListingsCount = 0;
      let warningSent = buffer.warningSent || false;

      for (const item of finalListingTexts) {
        processedListingsCount++;
        
        if (processedListingsCount > 3) {
          console.log(`[processBuffer] Listing #${processedListingsCount} excede el límite de 3 para ${senderId}.`);
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
          result = await processConsultingMessage(item.text, senderId, userName, item.imageBuffer);
        } else if (chatId === this.circuloGroupId) {
          result = await processCirculoMessage(item.text, senderId, userName);
        } else {
          if (pending && Date.now() < pending.expiresAt) {
            const combinedText = `[CONTEXTO]: "${pending.originalText}"\n[RESPUESTA]: "${item.text}"`;
            this.pendingData.delete(senderId);
            this.savePendingData();
            result = await processWhatsAppMessage(combinedText, senderId, userName, false, [], undefined, item.imageBuffer);
          } else {
            result = await processWhatsAppMessage(item.text, senderId, userName, item.hasMedia, scrapedResults, undefined, item.imageBuffer);
          }
        }

        // 4. Orquestación de Respuestas (Silencio de Oro / Flujos DM)
        await this.handleJanIAResponse(result, senderId, chatId, userName, item.text, item.originalMsg);
      }

      // 5. ACTIVAR COOLDOWN DE 5 MINUTOS (Tras procesar con éxito)
      // La clave incluye el chatId para que el cooldown sea por grupo (no global por usuario)
      const cooldownKeyFinal = `${chatId}_${senderId}`;
      this.cooldownMap.set(cooldownKeyFinal, {
        lastBlockProcessedAt: Date.now(),
        warningSent: warningSent
      });
      this.saveCooldowns();

    } catch (e) {
      console.error('[WHATSAPP-BOT] Error crítico en procesamiento de bloque:', e);
    }
  }

  // --- ORQUESTACIÓN DE RESPUESTAS Y PERSONALIZACIÓN (JanIA v2.0) ---
  private async handleJanIAResponse(result: any, senderId: string, chatId: string, userName: string, fullText: string, originalMsg?: Message) {
    if (!result) return;

    const isGroup = chatId.includes('@g.us');
    // MATCH COMERCIAL DETECTADO es el string real en el response de JanIA
    const isMatch = result.response && (result.response.includes("MATCH COMERCIAL DETECTADO") || result.response.includes("MATCH DETECTADO") || result.response.includes("MATCH INTELIGENTE DETECTADO"));
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

    if ((shouldSendGroup || shouldSendDMDirect) && result.response && result.response.trim() !== "") {
      const mentions = Array.from(new Set([...(result.mentions || []), senderId]));
      const options: any = { 
        mentions: isGroup ? mentions : [] 
      };
      // Siempre citar el mensaje original en violaciones para que los demás miembros
      // vean a qué publicación se refiere la amonestación (independiente de si somos admin)
      if (isViolation && originalMsg) {
        options.quotedMessageId = originalMsg.id._serialized;
      }
      await this.queuedSend(chatId, result.response, options);
      await this.logToDb(senderId, 'janIA', result.response);

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

    // Reaccionar con emojis a los mensajes del grupo para retroalimentación sin generar DMs fríos
    if (isGroup && originalMsg) {
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
      const dmMsg = result.dmResponse || result.response;
      if (dmMsg && dmMsg.trim() !== "") {
        if (isGroup) {
          // Si proviene de un grupo y faltan datos, enviamos un link wa.me público con la advertencia en el grupo
          if (result.classification === "DATOS_INCOMPLETOS") {
            const botNumber = this.client.info?.wid?.user;
            const rawPhone = senderId.split('@')[0];
            const targetText = encodeURIComponent(`Hola JanIA, deseo completar mi publicación del barrio.`);
            const waLink = botNumber ? `https://wa.me/${botNumber}?text=${targetText}` : `un chat privado conmigo`;
            
            const groupReplyText = `⚠️ *DATOS INCOMPLETOS* ⚠️\n\nHola @${rawPhone}, logré registrar parte de tu publicación, pero mis motores no pudieron extraer el barrio, vereda o municipio del enlace o texto. Para poder activarte los cruces comerciales automáticos, ¡necesitamos completar la ubicación!\n\n👉 Por favor, presiona este enlace e inicia un chat privado conmigo para indicármelo: ${waLink} (¡No es por molestarte, es necesario para poder buscarte un MATCH de inmediato! 🚀)`;
            
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
        this.savePendingData();
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
      
      const messages = await chat.fetchMessages({ limit: 1500 });
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

  public initialize() {
    this.client.initialize().catch(err => {
      console.error('[WHATSAPP-BOT] Error crítico durante la inicialización de whatsapp-web.js:', err);
    });
  }
}

export const whatsappBot = new WhatsAppBot();
