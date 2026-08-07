import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

import _baileys, { 
  useMultiFileAuthState, 
  DisconnectReason, 
  delay,
  downloadMediaMessage,
  proto,
  fetchLatestWaWebVersion,
  fetchLatestBaileysVersion,
  Browsers
} from '@whiskeysockets/baileys';

function getWASocket(): any {
  if (typeof _baileys === 'function') return _baileys;
  if ((_baileys as any)?.default && typeof (_baileys as any).default === 'function') return (_baileys as any).default;
  if ((_baileys as any)?.makeWASocket && typeof (_baileys as any).makeWASocket === 'function') return (_baileys as any).makeWASocket;
  return _baileys;
}
import { Boom } from '@hapi/boom';
import qrcodeTerminal from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db';
import { conversations, messages as dbMessages, users, propertyMatches, properties, requirements, pendingSessions } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { esDominioPermitido, scrapePropertyLink } from './scraper';
import QRCode from 'qrcode';
import { extractFirstName, getGreetingByTime } from './whatsapp-utils';
import { transcribeAudioBuffer } from './voiceTranscription';


// Tiempo de arranque para omitir mensajes históricos (con 2 min de margen por desfase de reloj)
const SERVER_BOOT_TIME = Math.floor(Date.now() / 1000) - 120;

// Helper para limpiar JID removiendo sufijos de dispositivo (:42, :1, etc.)
const cleanJid = (jid: string) => {
  if (!jid) return "";
  if (jid.includes('@')) {
    const [userPart, domain] = jid.split('@');
    const cleanUser = userPart.split(':')[0];
    return `${cleanUser}@${domain}`;
  }
  return jid.split(':')[0];
};

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

export interface JaniaBotOptions {
  sessionFolderName?: string;
  qrFileName?: string;
  botName?: string;
  isWorkerOnly?: boolean;
}

export class JaniaMatchBot {
  public sock: any = null;
  public isReady: boolean = false;
  public sessionFolderName: string = '.baileys_auth';
  public qrFileName: string = 'qr-match.png';
  public botName: string = 'JANIA-MATCH';
  public isWorkerOnly: boolean = false;
  
  // Grupos autorizados y configuraciones
  private authorizedGroups: string[] = [];
  private messageBuffers: Map<string, MessageBuffer> = new Map();
  private redirectCooldowns: Map<string, number> = new Map();
  private processingLocks: Map<string, Promise<void>> = new Map();
  private lastGroupMessageTime: Map<string, number> = new Map();
  private botSentMessageIds: Set<string> = new Set();
  private lastHumanIntervention: Map<string, number> = new Map();
  private dmMessageBuffers: Map<string, { messages: any[]; timer: NodeJS.Timeout | null }> = new Map();
  private groupMetadataCache: Map<string, { data: any; time: number }> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  private async getCachedGroupMetadata(chatId: string) {
    const cached = this.groupMetadataCache.get(chatId);
    if (cached && Date.now() - cached.time < 10 * 60 * 1000) {
      return cached.data;
    }
    try {
      const data = await this.sock?.groupMetadata(chatId);
      if (data) {
        this.groupMetadataCache.set(chatId, { data, time: Date.now() });
      }
      return data;
    } catch (_) {
      return cached?.data || null;
    }
  }

  public targetGroupId: string = '120363260108880069@g.us';
  public buzonGroupId: string = '120363417740040773@g.us';
  public circuloGroupId: string = '120363403507276533@g.us';
  private cooldownMap: Map<string, any> = new Map();
  private cooldownFile: string = path.join(process.cwd(), '.cooldown_map.json');

  constructor(options?: JaniaBotOptions) {
    if (options) {
      if (options.sessionFolderName) this.sessionFolderName = options.sessionFolderName;
      if (options.qrFileName) this.qrFileName = options.qrFileName;
      if (options.botName) this.botName = options.botName;
      if (options.isWorkerOnly !== undefined) this.isWorkerOnly = options.isWorkerOnly;
    }

    if (!this.isWorkerOnly) {
      (global as any).janiaMatchBotInstance = this;
    }
    console.log(`[${this.botName}] Inicializando JanIA Bot con Baileys (Carpeta: ${this.sessionFolderName})...`);
    
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
    this.startDbHeartbeat();
  }

  private startDbHeartbeat() {
    // Initial status update
    this.updateStatusInDb().catch(err => console.error(`[${this.botName}-DB] Error in initial status update:`, err));

    // Send heartbeat every 30 seconds
    setInterval(() => {
      this.updateStatusInDb().catch(err => console.error(`[${this.botName}-DB] Error in heartbeat status update:`, err));
    }, 30000);
  }

  public async updateStatusInDb() {
    try {
      const db = await getDb();
      if (!db) return;

      const rawPhone = this.sock?.user?.id ? this.sock.user.id.split('@')[0].split(':')[0] : null;
      const phone = rawPhone || "573192919978";
      const jid = this.isWorkerOnly ? "system:bot_status_worker2" : "system:bot_status";

      await db
        .insert(pendingSessions)
        .values({
          jid,
          sessionData: { isReady: true, phone, botName: this.botName, updatedAt: new Date().toISOString() },
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: pendingSessions.jid,
          set: {
            sessionData: { isReady: true, phone, botName: this.botName, updatedAt: new Date().toISOString() },
          },
        });
      
      console.log(`[${this.botName}-DB] Bot status heartbeat updated: isReady=${this.isReady}, phone=${phone}`);
    } catch (err: any) {
      console.error(`[${this.botName}-DB] Failed to update bot status in DB:`, err.message);
    }
  }

  public async initialize() {
    try {
      const sessionDir = path.join(process.cwd(), this.sessionFolderName);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      
      // Guardar las credenciales iniciales de inmediato en disco para evitar que se pierdan
      if (!fs.existsSync(path.join(sessionDir, 'creds.json'))) {
        await saveCreds();
        console.log(`[${this.botName}] 💾 Guardadas credenciales iniciales de Baileys en ${this.sessionFolderName}.`);
      }
      
      let version: any = [2, 3000, 1043857760];
      try {
        const fetched = await fetchLatestBaileysVersion();
        if (fetched && fetched.version) {
          version = fetched.version;
        }
      } catch (e) {}

      console.log(`[${this.botName}] Estableciendo conexión por WebSocket...`);
      const silentLogger: any = {
        level: 'silent',
        log: () => {},
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {},
        child: () => silentLogger
      };

      const makeWASocket = getWASocket();
      this.sock = makeWASocket({
        auth: state,
        version,
        logger: silentLogger as any,
        printQRInTerminal: false, // Lo manejamos nosotros de forma personalizada
        browser: Browsers.ubuntu('Chrome'),
        syncFullHistory: false,
        markOnlineOnConnect: false,
        connectTimeoutMs: 90000, // Aumentado a 90s para conexiones lentas
        defaultQueryTimeoutMs: 90000,
        keepAliveIntervalMs: 20000, // Ping Keep-Alive de WebSocket cada 20 segundos
        emitOwnEvents: true,
      });

      this.setupEventListeners(saveCreds);
    } catch (err: any) {
      console.error(`[${this.botName}] Error crítico al inicializar el cliente Baileys:`, err);
    }
  }

  private setupEventListeners(saveCreds: () => Promise<void>) {
    this.sock.ev.on('creds.update', async () => {
      try {
        await saveCreds();
      } catch (err: any) {
        console.error(`[${this.botName}] ❌ Error al guardar credenciales:`, err.message || err);
      }
    });

    this.sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(`\n[${this.botName}] 🔌 ESCANEA ESTE CÓDIGO QR PARA VINCULAR ${this.botName} (+573192919978):`);
        qrcodeTerminal.generate(qr, { small: true });

        (global as any).janiaBotQr = qr;

        // Guardar el QR como imagen PNG accesible desde el navegador
        try {
          const qrPath = path.join(process.cwd(), this.qrFileName);
          const publicQrDir = path.join(process.cwd(), "client", "public");
          if (!fs.existsSync(publicQrDir)) {
            fs.mkdirSync(publicQrDir, { recursive: true });
          }
          const publicQrPath = path.join(publicQrDir, "qr-match.png");
          await QRCode.toFile(qrPath, qr, { width: 400, margin: 2 });
          await QRCode.toFile(publicQrPath, qr, { width: 400, margin: 2 });
          console.log(`[${this.botName}] 📸 QR guardado exitosamente en ${qrPath} y ${publicQrPath}`);
        } catch (e: any) {
          console.warn(`[${this.botName}] Error guardando QR PNG:`, e.message);
        }
      }

      if (connection === 'close') {
        const error = lastDisconnect?.error as Boom;
        const statusCode = error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        this.isReady = false;
        this.updateStatusInDb().catch(err => console.error(`[${this.botName}-DB] Error updating status on close:`, err));

        this.reconnectAttempts++;
        if (this.reconnectAttempts > 5) {
          console.warn(`[${this.botName}] 🛡️ [ESCUDO ANTI-BAN] Máximos reintentos inmediatos alcanzados. Programando reconexión diferida en 2 minutos...`);
          setTimeout(() => {
            this.reconnectAttempts = 0;
            this.initialize();
          }, 120000);
          return;
        }

        const isRestart = statusCode === DisconnectReason.restartRequired;
        const isConnectionLost = statusCode === DisconnectReason.connectionLost;
        const isConflict = statusCode === 440;
        const isConnectionFailure = statusCode === 405 || statusCode === 401;
        const jitter = Math.floor(Math.random() * 4000);
        const delayMs = (isRestart || isConnectionLost) ? (2000 + jitter) : (isConflict ? 120000 : (10000 + jitter));
        
        console.warn(`[${this.botName}] ⚠️ Conexión Baileys cerrada (código: ${statusCode}) [Intento ${this.reconnectAttempts}/3]. Reconectando en ${delayMs}ms...`);

        if (isConnectionFailure || statusCode === DisconnectReason.loggedOut) {
          console.error(`[${this.botName}] Sesión inválida o cerrada (error ${statusCode}). Deteniendo bot por seguridad.`);
        } else if (shouldReconnect) {
          setTimeout(() => this.initialize(), delayMs);
        }
      } else if (connection === 'open') {
        console.log(`\n🚀 ${this.botName} 🔌💘 — BOT ACTIVADO CORRECTAMENTE CON BAILEYS`);
        this.isReady = true;
        this.reconnectAttempts = 0; // Resetear intentos al conectar exitosamente
        this.updateStatusInDb().catch(err => console.error(`[${this.botName}-DB] Error updating status on open:`, err));
      }
    });

    this.sock.ev.on('messages.upsert', async (m: { messages: proto.IWebMessageInfo[], type: string }) => {
      if (m.type !== 'notify') return;

      for (const msg of m.messages) {
        if (!msg.key || !msg.message) continue;

        const fromMe = msg.key.fromMe;
        const rawChatId = msg.key.remoteJid;
        if (!rawChatId) continue;

        const chatId = cleanJid(rawChatId);
        const isGroup = chatId.endsWith('@g.us');

        const rawSenderId = isGroup ? (msg.key.participant || msg.participant || (this.sock?.user?.id ? cleanJid(this.sock.user.id) : '')) : rawChatId;
        if (!rawSenderId || (isGroup && rawSenderId.endsWith('@g.us'))) continue;
        const senderId = cleanJid(rawSenderId);


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
            // Escuchamos de forma global todos los grupos en los que participamos.
            // authorizedGroups se usará abajo únicamente para reaccionar con emojis.

            // Ignorar stickers
            if (msg.message.stickerMessage) {
              continue;
            }

            let body = '';
            let isAudioPTT = false;
            if (msg.message.conversation) body = msg.message.conversation;
            else if (msg.message.extendedTextMessage) {
              // Mensajes normales Y mensajes reenviados (contextInfo.isForwarded)
              body = msg.message.extendedTextMessage.text || '';
            }
            else if (msg.message.imageMessage) body = msg.message.imageMessage.caption || '';
            else if (msg.message.documentMessage) body = msg.message.documentMessage.caption || '';
            else if (msg.message.videoMessage) body = msg.message.videoMessage.caption || '';
            else if (msg.message.audioMessage) {
              isAudioPTT = true;
              // Transcribir el audio real usando Gemini vía Baileys downloadMediaMessage
              try {
                console.log(`[JANIA-MATCH] Transcribiendo audio PTT de ${senderId} en grupo ${chatId}...`);
                const audioBuffer = await downloadMediaMessage(msg as any, 'buffer', {}) as Buffer;
                if (audioBuffer && audioBuffer.length > 0) {
                  const mimeType = msg.message.audioMessage.mimetype || 'audio/ogg; codecs=opus';
                  const transcription = await transcribeAudioBuffer(audioBuffer, mimeType);
                  if (transcription && transcription.trim() !== '') {
                    body = transcription.trim();
                    console.log(`[JANIA-MATCH] Transcripción exitosa: "${body.substring(0, 80)}..."`);
                  } else {
                    body = '[audio-vacío]';
                  }
                } else {
                  body = '[audio-sin-buffer]';
                }
              } catch (audioErr: any) {
                console.error('[JANIA-MATCH] Error al transcribir audio PTT:', audioErr.message || audioErr);
                body = '[audio-error]';
              }
            }
            // Tipos especiales: links preview, botones, catálogo, productos de WhatsApp
            else if ((msg.message as any).templateMessage) {
              const tmpl = (msg.message as any).templateMessage;
              body = tmpl.hydratedTemplate?.hydratedContentText || tmpl.hydratedFourRowTemplate?.hydratedContentText || '';
            }
            else if ((msg.message as any).buttonsMessage) {
              body = (msg.message as any).buttonsMessage.contentText || '';
            }
            else if ((msg.message as any).listMessage) {
              body = (msg.message as any).listMessage.description || (msg.message as any).listMessage.title || '';
            }
            else if ((msg.message as any).productMessage) {
              const prod = (msg.message as any).productMessage?.product;
              body = [prod?.title, prod?.description, prod?.priceAmount1000 ? `$${Math.round(prod.priceAmount1000/1000).toLocaleString('es-CO')}` : ''].filter(Boolean).join(' - ');
            }
            // Detectar si el mensaje cita una nota de voz previa (contextInfo.quotedMessage.audioMessage)
            const quotedAudioMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage;
            if (quotedAudioMsg) {
              isAudioPTT = true;
              try {
                const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
                const quotedParticipant = contextInfo?.participant || chatId;
                const quotedPhone = quotedParticipant.split('@')[0];
                console.log(`[JANIA-MATCH] Transcribiendo audio CITADO de +${quotedPhone} en grupo ${chatId}...`);
                const fakeMsg: proto.IWebMessageInfo = {
                  key: {
                    remoteJid: chatId,
                    id: contextInfo?.stanzaId || 'quoted-audio',
                    fromMe: false,
                    participant: quotedParticipant
                  },
                  message: {
                    audioMessage: quotedAudioMsg
                  }
                };
                const audioBuffer = await downloadMediaMessage(fakeMsg as any, 'buffer', {}) as Buffer;
                if (audioBuffer && audioBuffer.length > 0) {
                  const mimeType = quotedAudioMsg.mimetype || 'audio/ogg; codecs=opus';
                  const transcription = await transcribeAudioBuffer(audioBuffer, mimeType);
                  if (transcription && transcription.trim() !== '') {
                    console.log(`[JANIA-MATCH] Transcripción de audio citado exitosa: "${transcription.substring(0, 80)}..."`);
                    const quotedNote = `[Consulta en audio citada de +${quotedPhone}]: "${transcription.trim()}"`;
                    body = body ? `${body}\n\n${quotedNote}` : quotedNote;
                  }
                }
              } catch (quotedAudioErr: any) {
                console.error('[JANIA-MATCH] Error al transcribir audio citado:', quotedAudioErr?.message || quotedAudioErr);
              }
            } else if (!body && msg.message.extendedTextMessage?.contextInfo?.quotedMessage) {
              const qm = msg.message.extendedTextMessage.contextInfo.quotedMessage;
              body = qm.conversation || qm.extendedTextMessage?.text || qm.imageMessage?.caption || '';
            }

            const textLower = body.toLowerCase();
            const botJid = this.sock?.user?.id ? cleanJid(this.sock.user.id) : '';
            const botPhone = botJid ? botJid.split('@')[0] : '';
            const mentionsBot = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.some((jid: string) => cleanJid(jid) === botJid);
            const hasDirectMention = textLower.includes("jania") || 
                                     (botPhone && textLower.includes(botPhone)) || 
                                     textLower.includes("573192919978") ||
                                     !!mentionsBot;

            // --- IDENTIFICACIÓN DE GRUPOS OFICIALES VECY ---
            const isMainGroup = chatId === this.targetGroupId;     // VECY INMUEBLES NETWORK
            const isBuzonGroup = chatId === this.buzonGroupId;     // SOPORTE LEGAL, TRIBUTARIO Y AVALÚOS
            const isCirculoGroup = chatId === this.circuloGroupId; // Círculo CERO 👌
            const isOfficialGroup = isMainGroup || isBuzonGroup || isCirculoGroup;

            // --- OBTENCIÓN DEL NOMBRE DEL GRUPO Y BLACKLIST ---
            let groupName = "Nombre Real del Grupo";
            try {
              const metadata = await this.getCachedGroupMetadata(chatId);
              if (metadata && metadata.subject) {
                groupName = metadata.subject;
              }
            } catch (e) {}

            const NEGOTIATION_GROUPS_BLACKLIST = [
              "Venta Alameda", 
              "Negociación ARRECIFES"
            ];
            if (NEGOTIATION_GROUPS_BLACKLIST.some(name => groupName.includes(name))) {
              console.log(`[JANIA-MATCH] Mensaje omitido: el grupo "${groupName}" está en la blacklist de negociación.`);
              return;
            }

            // Grupos externos: JanIA capta todo sin discriminar por longitud.
            // La calificación de completitud (✔️ a 💖) refleja la calidad del dato.


            // Si es una publicación comercial, procesar con el buffer extractor (Modo Silencioso)
            const isPossibleListing = 
              body.length > 70 || 
              body.split('\n').length >= 2 || 
              !!msg.message.imageMessage ||
              !!msg.message.documentMessage ||
              textLower.includes("http") ||
              textLower.includes("www") ||
              textLower.includes("ofrezco") ||
              textLower.includes("busco") ||
              textLower.includes("vendo") ||
              textLower.includes("venta") ||
              textLower.includes("arriendo") ||
              textLower.includes("ariendo") ||
              textLower.includes("compro") ||
              textLower.includes("necesito") ||
              textLower.includes("renta") ||
              textLower.includes("alquilo") ||
              textLower.includes("permuto") ||
              textLower.includes("permuta") ||
              textLower.includes("requiero") ||
              textLower.includes("requerimiento") ||
              textLower.includes("casa") ||
              textLower.includes("apto") ||
              textLower.includes("apartamento") ||
              textLower.includes("bodega") ||
              textLower.includes("oficina") ||
              textLower.includes("edificio") ||
              textLower.includes("lote") ||
              textLower.includes("local") ||
              textLower.includes("finca") ||
              textLower.includes("terreno") ||
              textLower.includes("predio") ||
              textLower.includes("campestre") ||
              textLower.includes("fanegada") ||
              textLower.includes("fanegadas") ||
              textLower.includes("hectarea") ||
              textLower.includes("hectárea") ||
              textLower.includes("hect") ||
              textLower.includes("parque") ||
              textLower.includes("inversion") ||
              textLower.includes("inversión") ||
              textLower.includes("penthouse") ||
              textLower.includes("apartaestudio") ||
              textLower.includes("duplex") ||
              textLower.includes("dúplex") ||
              textLower.includes("parqueadero") ||
              textLower.includes("alcoba") ||
              textLower.includes("habitacion") ||
              textLower.includes("habitación") ||
              textLower.includes("metro") ||
              textLower.includes("mts") ||
              textLower.includes("mts2") ||
              textLower.includes("m2") ||
              textLower.includes("precio") ||
              textLower.includes("presupuesto") ||
              textLower.includes("millones") ||
              textLower.includes("millon") ||
              textLower.includes("canon") ||
              textLower.includes("comisión") ||
              textLower.includes("comision") ||
              textLower.includes("valor");


            // Detectar consultas comunes sobre cómo publicar, cómo funciona el bot/grupo, guardado, mecánica, datos faltantes, etc.
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
                textLower.includes("mecánica del grupo") || textLower.includes("mecanica del grupo") ||
                textLower.includes("quedó guardado") || textLower.includes("quedo guardado") ||
                textLower.includes("se guardó") || textLower.includes("se guardo") ||
                textLower.includes("fue guardado") ||
                textLower.includes("faltó algún dato") || textLower.includes("falto algun dato") ||
                textLower.includes("faltó un dato") || textLower.includes("falto un dato") ||
                textLower.includes("datos faltantes") ||
                textLower.includes("subió correctamente") || textLower.includes("subio correctamente") ||
                textLower.includes("fue subido") ||
                textLower.includes("mejor forma de publicar") ||
                textLower.includes("cómo es mejor") || textLower.includes("como es mejor") ||
                textLower.includes("para obtener resultados") ||
                (textLower.includes("ayuda") && textLower.includes("inmueble")) ||
                (textLower.includes("explicar") && textLower.includes("grupo")) ||
                (textLower.includes("cómo") && textLower.includes("grupo"))
              );

            // En Soporte Legal y Círculo Cero: responder a cualquier texto que no sea cortesía muy corta
            // Los audios PTT nunca se consideran cortesía corta (aunque fallen la transcripción)
            const textClean = body.toLowerCase().trim();
            const isAudioFailed = body === '[audio-vacío]' || body === '[audio-sin-buffer]' || body === '[audio-error]';
            const isShortCourtesy = 
              !isAudioPTT && (
                textClean.length < 6 ||
                ["ok", "listo", "vale", "claro", "gracias", "hola", "hola!", "jaja", "jajaja", "👍", "✅", "👏", "😊", "🙏"].includes(textClean)
              );

            // En Soporte Legal (Buzón) y Círculo Cero, los mensajes son consultas e interacciones vivas, NO publicaciones estáticas.
            // En grupos externos no oficiales, CAPTURAMOS EL 100% DE LOS MENSAJES (salvo monosílabos o stickers).
            const isListingGroup = isMainGroup || (!isBuzonGroup && !isCirculoGroup);
            const isListing = isListingGroup && (isPossibleListing || !isOfficialGroup);

            // Ignorar únicamente monosílabos o caracteres sueltos inapropiados (< 3 caracteres sin significado)
            const isSingleCharacter = textClean.length < 3 && !["ok", "si", "sí"].includes(textClean);

            const shouldRespond = (isBuzonGroup || isCirculoGroup) ? !isSingleCharacter : (isOfficialGroup && hasDirectMention);

            if (isListing) {
              await this.handleIncomingGroupMessage(msg, chatId, body);
              continue;
            }

            if (isOfficialGroup && isShortCourtesy) {
              const courtesyEmoji = textClean.includes("gracias") ? "🤝" : "👍";
              try {
                await this.sock.sendMessage(chatId, {
                  react: { text: courtesyEmoji, key: msg.key }
                });
              } catch (e) {}
            }

            if (shouldRespond) {
              await this.handleDirectGroupQuestion(msg, chatId, senderId, body);
            }
            continue;
          }

          // --- FLUJO 2: CHATS PRIVADOS (DMs) ---
          if (!isGroup) {
            const rawPhone = senderId.split('@')[0];
            const ADMIN_PHONE = process.env.ADMIN_PHONE || "573192919978";
            const isAdmin = rawPhone.includes(ADMIN_PHONE) || rawPhone === ADMIN_PHONE || rawPhone === "573192919978";
            const userName = msg.pushName || `Asesor +${rawPhone}`;

            let body = '';
            if (msg.message?.conversation) body = msg.message.conversation;
            else if (msg.message?.extendedTextMessage) body = msg.message.extendedTextMessage.text || '';
            else if (msg.message?.imageMessage) body = msg.message.imageMessage.caption || '';
            else if (msg.message?.documentMessage) body = msg.message.documentMessage.caption || '';
            else if (msg.message?.videoMessage) body = msg.message.videoMessage.caption || '';

            // 1. Detectar si el mensaje es del bot o de un humano (fromMe)
            if (msg.key.fromMe) {
              const msgId = msg.key.id || "";
              // CRÍTICO: Solo considerar intervención humana si el mensaje es RECIENTE (<2 min)
              // Los mensajes fromMe históricos (al reconectar) NO son intervenciones humanas.
              // botSentMessageIds es un Set en memoria que se resetea al reconectar, por lo que
              // sin esta salvaguarda se dispararía un loop de mute para todos los mensajes previos.
              const msgTimestampMs = Number(msg.messageTimestamp || 0) * 1000;
              const isRecentMessage = (Date.now() - msgTimestampMs) < 2 * 60 * 1000; // 2 minutos
              if (!this.botSentMessageIds.has(msgId) && isRecentMessage) {
                // Intervención humana detectada (mensaje reciente no enviado por el bot)
                console.log(`[JANIA-MATCH] Intervención humana detectada en DM ${senderId}. Silenciando bot.`);
                this.lastHumanIntervention.set(senderId, Date.now());
                const { muteSession } = await import('./janIA');
                await muteSession(senderId, true).catch(err => console.error("Error muting session in database:", err));
              }
              return;
            }

            // 2. Verificar reactivación ("Agente JanIA")
            const cleanStart = body.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
            
            const { isSessionMuted, muteSession } = await import('./janIA');
            let isMuted = await isSessionMuted(senderId);

            if (isMuted) {
              if (cleanStart.startsWith("agente jania")) {
                await muteSession(senderId, false).catch(err => console.error("Error unmuting session:", err));
                isMuted = false;
                console.log(`[JANIA-MATCH] Sesión reactivada mediante comando de cliente para ${senderId}`);
              }
            }

            // 3. Verificar si hay una intervención humana activa (últimos 24 horas)
            const lastIntervention = this.lastHumanIntervention.get(senderId) || 0;
            const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 horas
            if (isMuted || (Date.now() - lastIntervention < cooldownPeriod)) {
              // Módulo 7: chateo interactivo bloqueado. Si es posible listing se procesará silenciosamente más abajo.
            }

            // 3. Buffer de mensajes de DM privado
            let buffer = this.dmMessageBuffers.get(senderId);
            if (!buffer) {
              buffer = { messages: [], timer: null };
              this.dmMessageBuffers.set(senderId, buffer);
            }

            buffer.messages.push(msg);

            if (buffer.timer) {
              clearTimeout(buffer.timer);
            }

            buffer.timer = setTimeout(async () => {
              this.dmMessageBuffers.delete(senderId);
              try {
                await this.processBufferedDmMessages(senderId, userName, rawPhone, buffer.messages, isAdmin);
              } catch (err) {
                console.error("[JANIA-MATCH] Error al procesar mensajes de DM acumulados:", err);
              }
            }, 2500); // Esperar 2.5 segundos para agrupar mensajes continuos
            return;
          }

        } catch (err) {
          console.error('[JANIA-MATCH] Error en procesador de eventos de mensaje:', err);
        }
      }
    });
  }

  private async processBufferedDmMessages(
    senderId: string,
    userName: string,
    rawPhone: string,
    messages: any[],
    isAdmin: boolean
  ) {
    // 1. Combinar cuerpos de texto y buscar imágenes o documentos
    let combinedBody = "";
    let mainMsg = messages[messages.length - 1]; // Usar el último mensaje como referencia para respuestas/reacciones
    let imageBuffer: string | undefined;
    let pdfBuffer: string | undefined;
    let pdfMimeType: string | undefined;

    for (const msg of messages) {
      let body = '';
      if (msg.message?.conversation) body = msg.message.conversation;
      else if (msg.message?.extendedTextMessage) body = msg.message.extendedTextMessage.text || '';
      else if (msg.message?.imageMessage) body = msg.message.imageMessage.caption || '';
      else if (msg.message?.documentMessage) body = msg.message.documentMessage.caption || '';
      else if (msg.message?.videoMessage) body = msg.message.videoMessage.caption || '';

      if (body.trim()) {
        combinedBody += (combinedBody ? "\n" : "") + body.trim();
      }

      if (msg.message?.imageMessage && !imageBuffer) {
        try {
          const media = await downloadMediaMessage(msg, 'buffer', {});
          imageBuffer = media.toString('base64');
          mainMsg = msg; // El mensaje con la imagen se vuelve el mensaje de referencia
        } catch (e) {}
      }
      if (msg.message?.documentMessage && !pdfBuffer) {
        try {
          const media = await downloadMediaMessage(msg, 'buffer', {});
          pdfBuffer = media.toString('base64');
          pdfMimeType = msg.message.documentMessage.mimetype || 'application/pdf';
          mainMsg = msg; // El mensaje con el pdf se vuelve el mensaje de referencia
        } catch (e) {}
      }
    }

    if (!combinedBody.trim() && !imageBuffer && !pdfBuffer) {
      return;
    }

    const chatId = senderId;
    const body = combinedBody;

    // Interceptar confirmaciones de Match (SÍ #M123 o NO #M123) para cualquier usuario (Double Opt-In)
    const matchConfirmationRegex = /^\s*(sí|si|no)\s+#m(\d+)\s*$/i;
    const matchConfirm = body.match(matchConfirmationRegex);
    if (matchConfirm) {
      const decision = matchConfirm[1].toLowerCase();
      const matchId = parseInt(matchConfirm[2], 10);
      await this.processMatchConfirmation(senderId, userName, matchId, decision);
      return;
    }

    if (!isAdmin) {
      // DMs privados de contactos personales o terceros no se procesan para captación ni se reacciona con emojis
      return;
    }

    // --- FLUJO ADMINISTRADOR O BYPASS DE TEST ---
    console.log(`[JANIA-MATCH] [Admin/Test] Atendiendo mensaje de admin/test ${senderId}...`);

    // Por defecto chatea libremente con administrador o cuenta de test
    await this.logToDb(senderId, 'user', body);
    await this.handlePrivateDmConversation(mainMsg, senderId, rawPhone, body);
  }

  // --- REDIRECCIÓN DE CHATS PRIVADOS ---
  private async handlePrivateDmRedirect(chatId: string, senderId: string, userName: string) {
    // CAPA DE SEGURIDAD MUTE / INTERVENCIÓN HUMANA
    const { isSessionMuted } = await import('./janIA');
    const isMuted = await isSessionMuted(senderId);
    const lastIntervention = this.lastHumanIntervention.get(senderId) || 0;
    const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 horas
    if (isMuted || (Date.now() - lastIntervention < cooldownPeriod)) {
      console.log(`[JANIA-MATCH] Silencio total en DM ${senderId} por intervención humana o silencio activo. Omitiendo redirección.`);
      return;
    }

    const now = Date.now();
    const lastRedirect = this.redirectCooldowns.get(senderId) || 0;
    const ONCE_A_DAY = 24 * 60 * 60 * 1000;

    if (now - lastRedirect > ONCE_A_DAY) {
      this.redirectCooldowns.set(senderId, now);
      const redirectLink = "https://wa.me/573192919978";
      
      const realName = userName || "Asesor";
      const cleanName = extractFirstName(realName) || "colega";
      const redirectText = `Hola ${cleanName} 👋😊. Si tienes dudas, inquietudes o quieres consultarme algo (sea por escrito o por notas de voz), te invito a escribir directamente al canal oficial privado de soporte de JanIA de Meta haciendo clic aquí: ${redirectLink} para realizar tus consultas correspondientes o si estás en los grupos correspondientes según tu consulta puedes hacerlas allí de la siguiente manera:\n\n` +
        `Mis grupos:\n\n` +
        `Para publicar tus INMUEBLES y REQUERIMIENTOS tenemos el grupo de *𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗨𝗘𝗕𝗟𝗘𝗦 𝗡𝗘𝗧𝗪𝗢𝗥𝗞* : Si aún no eres miembro, puedes unirte desde este enlace: https://chat.whatsapp.com/K36KrHeB9nMEKJ56s8XFcM\n` +
        `Para hacer tus consultas de casos inmobiliarios en temas jurídicos, tributarios, avalúos, ayuda en guía de procesos y redacción de contratos, tenemos el grupo de *𝗩𝗘𝗖𝗬: 𝗦𝗢𝗣𝗢𝗥𝗧𝗘 𝗟𝗘𝗚𝗔𝗟, 𝗧𝗥𝗜𝗕𝗨𝗧𝗔𝗥𝗜𝗢 𝗬 𝗔𝗩𝗔𝗟Ú𝗢𝗦* : Si aún no eres miembro, puedes unirte desde este enlace: https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6\n` +
        `Para preguntar acerca de nuestro proyecto *VECY Network* y debatir acerca de nuestras funciones beneficios y competencias, tenemos el grupo de *𝗣𝗥𝗢𝗬𝗘𝗖𝗧𝗢 "𝗩𝗲𝗰𝘆 𝗡𝗲𝘁𝘄𝗼𝗿𝗸"* : Si aún no eres miembro puedes unirte desde este enlace: https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU\n\n` +
        `Te espero. ¡Allí te atenderé con gusto! 🚀`;
      
      this.queuedSend(chatId, redirectText);
    }
  }

  // --- RESPUESTA DIRECTA A PREGUNTAS EN GRUPOS ---
  private async handleDirectGroupQuestion(msg: proto.IWebMessageInfo, chatId: string, senderId: string, bodyText: string) {
    try {
      let resolvedSenderId = senderId;
      if (senderId.endsWith('@lid') && this.sock?.signalRepository?.lidMapping?.getPNForLID) {
        try {
          const mappedPn = await this.sock.signalRepository.lidMapping.getPNForLID(senderId);
          if (mappedPn) {
            const cleanUser = mappedPn.split(':')[0].split('@')[0];
            resolvedSenderId = `${cleanUser}@s.whatsapp.net`;
            console.log(`[JANIA-MATCH] [DirectGroupQuestion] Resolviendo LID ${senderId} to PN ${resolvedSenderId}`);
          }
        } catch (err) {}
      }

      const realName = msg.pushName || `Asesor +${resolvedSenderId.split('@')[0]}`;
      const textLower = bodyText.toLowerCase();

      const { detectaVoz, textToSpeechMedia } = await import('./whatsapp-utils');
      const { processWhatsAppMessage, processConsultingMessage, processCirculoMessage } = await import('./janIA');

      const isAudioPTT = !!msg.message?.audioMessage;
      const wantsVoice = isAudioPTT || detectaVoz(textLower);
      if (wantsVoice) {
        await this.sock.sendPresenceUpdate('recording', chatId);
      } else {
        await this.sock.sendPresenceUpdate('composing', chatId);
      }

      // Si la transcripción del audio falló, respondemos con un mensaje específico
      const isAudioFailed = bodyText === '[audio-vacío]' || bodyText === '[audio-sin-buffer]' || bodyText === '[audio-error]';
      if (isAudioFailed) {
        const failMsg = `Hola ${realName} 👋🏻, escuché que enviaste una nota de voz. Lamentablemente tuve un inconveniente técnico al procesarla en este momento. 🙏\n\nTe pido que:\n✏️ Escribas tu consulta por texto aquí en el grupo, o\n📲 Me la envíes directamente en mi chat privado: https://wa.me/573192919978\n\n¡En el chat privado puedo escuchar y procesar tus audios sin problemas! 😊`;
        await this.queuedSend(chatId, failMsg, { mentions: [senderId], quoted: msg });
        await this.sock.sendPresenceUpdate('paused', chatId);
        return;
      }

      // Detectar si el mensaje en VECY INMUEBLES NETWORK es off-topic (legal, tributario, círculo)
      const isMainGroupChat = chatId === this.targetGroupId;
      if (isMainGroupChat) {
        const textLower = bodyText.toLowerCase();
        const isOffTopicLegal =
          textLower.includes('contrato') || textLower.includes('arrendamiento') ||
          textLower.includes('promesa') || textLower.includes('sucesión') ||
          textLower.includes('sucesion') || textLower.includes('herencia') ||
          textLower.includes('embargo') || textLower.includes('comisión') ||
          textLower.includes('comision') || textLower.includes('tributar') ||
          textLower.includes('impuesto') || textLower.includes('retención') ||
          textLower.includes('retencion') || textLower.includes('ganancia ocasional') ||
          textLower.includes('avalúo') || textLower.includes('avaluo') ||
          textLower.includes('escritura') || textLower.includes('notaría') ||
          textLower.includes('juridic') || textLower.includes('demandar') ||
          textLower.includes('demanda') || textLower.includes('ley ') ||
          textLower.includes('juzgado') || textLower.includes('abogado');

        const isOffTopicCirculo =
          textLower.includes('vecy network') || textLower.includes('proyecto') ||
          textLower.includes('sugerencia') || textLower.includes('portal web') ||
          textLower.includes('jania funciona') || textLower.includes('inteligencia artificial') ||
          textLower.includes('cómo funciona la ia') || textLower.includes('como funciona la ia') ||
          textLower.includes('competencia') || textLower.includes('testimonio') ||
          textLower.includes('fundador') || textLower.includes('jani alves') ||
          textLower.includes('eduardo');

        if (isOffTopicLegal || isOffTopicCirculo) {
          const groupName = isOffTopicLegal ? 'VECY: SOPORTE LEGAL, TRIBUTARIO Y AVALÚOS' : (process.env.GROUP_ZERO_NAME || 'PROYECTO "Vecy Network"');
          const redirectMsg =
            `Hola ${realName} 👋🏻, veo que tu consulta es sobre ${isOffTopicLegal ? 'temas jurídicos, tributarios o de avalúos' : 'el funcionamiento de VECY Network y JanIA'}. ¡Perfecto! 🎯\n\n` +
            `Ese tipo de preguntas las atiendo con más profundidad en el grupo *${groupName}* de nuestra comunidad de WhatsApp. 🏠\n\n` +
            `También puedes consultarme directamente en mi chat privado con mi otra yo *JanIA v3.5* 📲: https://wa.me/573192919978\n\n` +
            `¡Allí te atiendo con todo el detalle que mereces! 😊`;
          await this.queuedSend(chatId, redirectMsg, { mentions: [senderId], quoted: msg });
          await this.sock.sendPresenceUpdate('paused', chatId);
          return;
        }
      }

      let result;
      if (chatId === this.buzonGroupId) { // Soporte Legal, Tributario y Avalúos
        result = await processConsultingMessage(
          bodyText,
          resolvedSenderId,
          realName,
          undefined,
          undefined,
          undefined,
          isAudioPTT ? ('mock-audio:' + bodyText) : undefined
        );
      } else if (chatId === this.circuloGroupId) { // Círculo Cero
        result = await processCirculoMessage(bodyText, resolvedSenderId, realName);
      } else if (isMainGroupChat) { // VECY INMUEBLES NETWORK — preguntas sobre el grupo/sistema
        let groupName = "VECY INMUEBLES NETWORK";
        try {
          const metadata = await this.sock.groupMetadata(chatId);
          if (metadata && metadata.subject) {
            groupName = metadata.subject;
          }
        } catch (e) {}
        result = await processWhatsAppMessage(
          bodyText,
          resolvedSenderId,
          realName,
          false,
          [],
          undefined,
          undefined,
          true,
          undefined,
          undefined,
          chatId,
          groupName
        );

      } else {
        await this.handlePrivateDmRedirect(chatId, resolvedSenderId, realName);
        await this.sock.sendPresenceUpdate('paused', chatId);
        return;
      }

      if (result && result.response && result.response.trim() !== '') {
        const textToDeliver = result.response;
        const voiceToDeliver = (result.voiceResponse && result.voiceResponse.trim() !== "")
          ? result.voiceResponse
          : textToDeliver;

        if (wantsVoice || isAudioPTT) {
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

        // Registrar la respuesta enviada por JanIA en la BD de mensajes para mantener el hilo de la conversación
        await this.logToDb(chatId, 'janIA', textToDeliver);
      }

      await this.sock.sendPresenceUpdate('paused', chatId);
    } catch (err) {
      console.error('[JANIA-MATCH] Error al responder pregunta directa en grupo:', err);
    }
  }

  private isPromotionalAd(bodyText: string, senderId: string): boolean {
    const cleanLower = (bodyText || '').toLowerCase();
    const rawPhone = (senderId || '').split('@')[0].replace(/[^0-9]/g, '');

    // Contacto específico de publicidad / cursos: Carolina Rodríguez (+573212857044)
    const isCarolina = rawPhone.includes("573212857044") || rawPhone.includes("3212857044");

    // Frases y patrones de publicidad de capacitaciones, cursos, libros, entrenamientos o servicios no inmobiliarios
    const promoPhrases = [
      "captar no es improvisar",
      "especialización dentro de la labor inmobiliaria",
      "adquiere tu entrenamiento",
      "espiral del éxito",
      "conocimiento llena tus bolsillos",
      "adquiérelo precio",
      "precio de oferta",
      "no más captaciones mediocres",
      "no más procesos informales",
      "no más inmuebles sin legalizar",
      "no más trabajar sin asegurar el pago de tu comisión",
      "proteger tus honorarios",
      "método probado para captar",
      "curso inmobiliario",
      "taller inmobiliario",
      "seminario inmobiliario",
      "capacitación inmobiliaria",
      "masterclass inmobiliaria",
      "webinar inmobiliario",
      "coaching inmobiliario",
      "mentoría inmobiliaria",
      "invierte en tu negocio",
      "invierte en conocimiento"
    ];

    const hasPromoKeywords = promoPhrases.some(phrase => cleanLower.includes(phrase));
    if (hasPromoKeywords) return true;

    // Si es un mensaje de Carolina ofreciendo entrenamientos o capacitaciones que no sean ofertas/demandas directas de inmuebles
    if (isCarolina) {
      const isRealEstateListing = (cleanLower.includes("vendo") || cleanLower.includes("arriendo") || cleanLower.includes("busco") || cleanLower.includes("necesito")) && (cleanLower.includes("apto") || cleanLower.includes("apartamento") || cleanLower.includes("casa") || cleanLower.includes("bodega") || cleanLower.includes("lote") || cleanLower.includes("finca"));
      if (!isRealEstateListing) {
        return true;
      }
    }

    return false;
  }

  // --- LOGÍSTICA DE BUFFER GRUPAL Y REACCIÓN INSTANTÁNEA ---
  private async handleIncomingGroupMessage(msg: proto.IWebMessageInfo, chatId: string, bodyText: string) {
    if (!msg.key || !msg.message) return;

    const rawSender = msg.key.participant || msg.participant || '';
    if (!rawSender || rawSender.endsWith('@g.us')) {
      console.warn(`[JANIA-MATCH] Omitiendo mensaje de grupo: sender individual inválido (${rawSender})`);
      return;
    }
    const senderId = rawSender.includes('@') ? `${rawSender.split('@')[0].split(':')[0]}@${rawSender.split('@')[1]}` : rawSender.split(':')[0];

    const isOfficialGroup = chatId === this.targetGroupId || chatId === this.buzonGroupId || chatId === this.circuloGroupId;

    // --- PROTECCIÓN Y FILTRADO DE PUBLICIDAD NO INMOBILIARIA (CURSOS, ENTRENAMIENTOS, CAROLINA RODRÍGUEZ, ETC.) ---
    if (this.isPromotionalAd(bodyText, senderId)) {
      if (!msg.key.fromMe) {
        if (isOfficialGroup) {
          // 🚫 EN GRUPOS OFICIALES VECY: Reaccionar con 🚫 y enviar advertencia formal de sanción
          console.log(`[JANIA-PROMO-RULE] 🚫 Publicidad no autorizada detectada en grupo oficial de +${senderId.split('@')[0]}. Reaccionando con 🚫 y advirtiendo...`);
          
          this.sock.sendMessage(chatId, { react: { text: '🚫', key: msg.key } }).catch(() => {});

          const rawPhone = senderId.split('@')[0];
          const mentionJid = `${rawPhone}@s.whatsapp.net`;
          const warningText = `🚫 @${rawPhone}: Esta clase de publicaciones (publicidad de cursos, entrenamientos, capacitaciones o servicios ajenos a la oferta y demanda directa de inmuebles) VIOLAN las normas de nuestros grupos oficiales VECY Network.\n\nPor favor elimina esta publicación. Te advertimos que la reincidencia dará lugar a la expulsión inmediata del grupo.`;

          this.queuedSend(chatId, warningText, { mentions: [mentionJid], quoted: msg }).catch(() => {});
        } else {
          // 🛡️ EN GRUPOS EXTERNOS: CERO REACCIONES, CERO INGESTA, CERO SUPABASE / BD (IGNORAR 100% SILENCIOSO)
          console.log(`[JANIA-PROMO-SHIELD] 🛡️ Publicidad no inmobiliaria ignorada en grupo externo de +${senderId.split('@')[0]} (Cero reacción, cero ingesta, cero Supabase).`);
        }
      }
      return; // Salir inmediatamente sin capturar, ni extraer datos, ni subir a Supabase
    }

    // --- REACCIÓN INSTANTÁNEA (< 200ms) CON CONFIRMACIÓN VISUAL EN CELULAR ---
    if (!msg.key.fromMe) {
      const cleanLower = (bodyText || '').toLowerCase();
      const hasMediaOrUrl = !!msg.message.imageMessage || !!msg.message.documentMessage || cleanLower.includes('http://') || cleanLower.includes('https://') || cleanLower.includes('www.') || cleanLower.includes('.co') || cleanLower.includes('.com');

      const isSearch = cleanLower.includes('busco') || cleanLower.includes('necesito') || cleanLower.includes('requiero') || cleanLower.includes('requerimiento') || cleanLower.includes('se busca');
      const isOffer = cleanLower.includes('vendo') || cleanLower.includes('arriendo') || cleanLower.includes('en venta') || cleanLower.includes('en arriendo') || cleanLower.includes('apto') || cleanLower.includes('apartamento') || cleanLower.includes('casa') || cleanLower.includes('bodega') || cleanLower.includes('oficina') || cleanLower.includes('lote') || cleanLower.includes('finca') || cleanLower.includes('precio') || cleanLower.includes('$') || cleanLower.includes('m2') || cleanLower.includes('mts') || hasMediaOrUrl;

      // 1. Presupuesto / Precio explícito
      const hasBudget = cleanLower.includes('$') || cleanLower.includes('millon') || cleanLower.includes('millón') || cleanLower.includes('ppto') || cleanLower.includes('presupuesto') || cleanLower.includes('valor') || cleanLower.includes('canon') || cleanLower.includes('precio') || /\d+\s*(m|mm|k)/i.test(cleanLower);

      // 2. Datos prediales específicos (Habitaciones, Baños, Parqueaderos, Metraje y Sector)
      const hasZone = cleanLower.includes('barrio') || cleanLower.includes('sector') || cleanLower.includes('calle') || cleanLower.includes('cra') || cleanLower.includes('carrera') || cleanLower.includes('zona') || cleanLower.includes('chico') || cleanLower.includes('chicó') || cleanLower.includes('rosales') || cleanLower.includes('cedritos') || cleanLower.includes('colina') || cleanLower.includes('santa') || cleanLower.includes('calleja') || cleanLower.includes('nogal') || cleanLower.includes('cabrera') || cleanLower.includes('virrey') || cleanLower.includes('pasadena') || cleanLower.includes('teusaquillo') || cleanLower.includes('chia') || cleanLower.includes('chía') || cleanLower.includes('cajica') || cleanLower.includes('cajicá');
      const hasBeds = cleanLower.includes('hab') || cleanLower.includes('alcoba') || cleanLower.includes('dormitorio');
      const hasBaths = cleanLower.includes('baño') || cleanLower.includes('wc') || cleanLower.includes('bñ');
      const hasGarages = cleanLower.includes('parq') || cleanLower.includes('garaje') || cleanLower.includes('ptero');
      const hasType = cleanLower.includes('apto') || cleanLower.includes('apartamento') || cleanLower.includes('casa') || cleanLower.includes('bodega') || cleanLower.includes('oficina') || cleanLower.includes('lote') || cleanLower.includes('finca') || cleanLower.includes('local');
      const hasBiz = cleanLower.includes('vendo') || cleanLower.includes('arriendo') || cleanLower.includes('venta') || cleanLower.includes('compro') || cleanLower.includes('busco') || cleanLower.includes('necesito') || cleanLower.includes('requiero');

      // Requerimiento completo: Tiene enlace/media O especifica negocio, tipo, barrio, presupuesto, habitaciones, baños y parqueaderos
      const isCompleteRequirement = hasMediaOrUrl || (hasBiz && hasType && hasZone && hasBudget && hasBeds && (hasBaths || hasGarages || cleanLower.length > 150));
      const isCompleteOffer = hasMediaOrUrl || (hasBudget && (hasZone || cleanLower.length > 150));
      
      const isOfficialGroup = chatId === this.targetGroupId || chatId === this.buzonGroupId || chatId === this.circuloGroupId;

      // REGLA DOCTRINAL DE EDUARDO:
      // 1. 👍 -> Oferta COMPLETA (o con enlace URL/imagen/PDF).
      // 2. 📝 -> Requerimiento COMPLETO (o con enlace URL/imagen/PDF con todas las especificaciones).
      // 3. ❓ -> Requerimiento o texto plano INCOMPLETO que carece de características clave (presupuesto, barrio, hab, baños, garajes).
      // 4. 🚫 -> Violación de normas / Spam -> EXCLUSIVO EN GRUPOS OFICIALES VECY.
      let fastEmoji: string | null = null;

      if (isSearch) {
        if (isCompleteRequirement) {
          fastEmoji = '📝'; // Requerimiento Completo
        } else {
          fastEmoji = '❓'; // Requerimiento Incompleto o Corto -> Reaccionar con ❓
        }
      } else if (isOffer) {
        if (isCompleteOffer) {
          fastEmoji = '👍'; // Oferta Completa
        } else {
          fastEmoji = '❓'; // Oferta Incompleta
        }
      } else if (isOfficialGroup) {
        fastEmoji = '❓';
      }

      if (fastEmoji && chatId !== this.buzonGroupId) {
        try {
          console.log(`[JANIA-FAST-REACT] 🎯 Enviando reacción instantánea ${fastEmoji} a ${chatId} (Msg ID: ${msg.key.id})`);
          this.sock.sendMessage(chatId, { react: { text: fastEmoji, key: msg.key } }).then(() => {
            console.log(`[JANIA-FAST-REACT] ✅ Reacción ${fastEmoji} ENTREGADA NATIVAMENTE en WhatsApp`);
          }).catch((err: any) => {
            // Silenciosamente capturar cualquier error de mapeo LID/reacción
          });
        } catch (err: any) {}
      }
    }
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

      let isBotAdmin = false;
      try {
        const metadata = await this.getCachedGroupMetadata(chatId);
        const me = this.sock.user?.id ? this.sock.user.id.split(':')[0] : '';
        const myParticipant = metadata?.participants?.find((p: any) => p.id.split('@')[0] === me);
        isBotAdmin = !!myParticipant && (myParticipant.admin === 'admin' || myParticipant.admin === 'superadmin');
      } catch (_) {}

      // Modo Fantasma: sin amonestaciones por doble posteo.
      // Se registra el timestamp para uso interno pero sin bloquear el flujo.
      if (isBotAdmin) {
        this.lastGroupMessageTime.set(`${chatId}_${senderId}`, now);
      }

      let buffer = this.messageBuffers.get(bufferKey);
      const bufferTimeout = 3000; // 3 Segundos (Reacción rápida)

      if (buffer) {
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

  private getReactionEmoji(result: any, isOfficialGroup: boolean = false): string | null {
    if (!result) return isOfficialGroup ? '❓' : null;

    if (result.reactionEmoji && (isOfficialGroup || result.reactionEmoji === '👍' || result.reactionEmoji === '📝' || result.reactionEmoji === '❓')) {
      return result.reactionEmoji;
    }

    const classification = (result.classification || '').toUpperCase();
    const rawText = (result.rawText || result.response || result.extractedData?.rawText || '').toLowerCase();

    // 1. Infracciones / Violaciones de Norma -> 🚫 EXCLUSIVAMENTE EN GRUPOS OFICIALES VECY
    if (isOfficialGroup && (classification === 'VIOLACION_DE_NORMAS' || classification.includes('SPAM') || classification.includes('INFRACCION'))) {
      return '🚫';
    }

    // 2. Publicaciones Incompletas / Mediocres sin datos prediales suficientes -> ❓ PERMITIDO EN TODOS LOS GRUPOS
    if (
      classification === 'DATOS_INCOMPLETOS' || 
      classification.includes('INCOMPLETO') || 
      classification.includes('PARCIAL') ||
      classification === 'CONSULTA_GENERAL' ||
      (rawText.length < 130 && !rawText.includes("hab") && !rawText.includes("alcoba") && !rawText.includes("baño") && !rawText.includes("m2"))
    ) {
      return '❓';
    }

    // 3. Requerimientos (Demandas de búsqueda con datos técnicos) -> 📝
    if (
      classification === 'REQUERIMIENTO' || 
      classification.includes('REQUERIMIENTO') || 
      classification.includes('DEMANDA') || 
      classification.includes('BUSQUEDA') ||
      rawText.includes("requiero") ||
      rawText.includes("busco") ||
      rawText.includes("necesito")
    ) {
      return '📝';
    }

    // 4. Inmuebles / Ofertas comerciales con datos técnicos -> 👍
    if (
      classification === 'INMUEBLE' || 
      classification.includes('INMUEBLE') || 
      classification.includes('OFERTA') ||
      result.inmuebleId || 
      result.propertyId ||
      result.inserted === true
    ) {
      return '👍';
    }

    return isOfficialGroup ? '❓' : null;
  }


  private async processGroupBuffer(bufferKey: string) {
    const buffer = this.messageBuffers.get(bufferKey);
    if (!buffer) return;

    this.messageBuffers.delete(bufferKey);
    const senderId = bufferKey.split('_')[1];
    const chatId = buffer.chatId;
    const userName = buffer.userName;

    let resolvedSenderId = senderId;
    if (senderId.endsWith('@lid') && this.sock?.signalRepository?.lidMapping?.getPNForLID) {
      try {
        const mappedPn = await this.sock.signalRepository.lidMapping.getPNForLID(senderId);
        if (mappedPn) {
          const cleanUser = mappedPn.split(':')[0].split('@')[0];
          resolvedSenderId = `${cleanUser}@s.whatsapp.net`;
          console.log(`[JANIA-MATCH] Resolviendo LID ${senderId} a PN ${resolvedSenderId}`);
        }
      } catch (err) {
        console.warn(`[JANIA-MATCH] No se pudo resolver PN para LID ${senderId}:`, err);
      }
    }

    console.log(`[JANIA-MATCH] Procesando buffer de ${buffer.messages.length} mensajes para ${resolvedSenderId} (Silencioso)...`);

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
      const distinctListings = buffer.messages.filter(m => {
        if (!m.body) return false;
        const clean = m.body.toLowerCase();
        const hasType = clean.includes("apto") || clean.includes("apartamento") || clean.includes("casa") || clean.includes("bodega") || clean.includes("oficina") || clean.includes("lote") || clean.includes("finca") || clean.includes("inmueble") || clean.includes("propiedad");
        const hasDetails = clean.includes("venta") || clean.includes("arriendo") || clean.includes("precio") || clean.includes("presupuesto") || clean.includes("millones") || clean.includes("$") || clean.includes("busco") || clean.includes("requerimiento") || clean.includes("área") || clean.includes("area") || clean.includes("m2") || clean.includes("mts");
        return hasType && hasDetails;
      });

      const { processWhatsAppMessage, processConsultingMessage, processCirculoMessage } = await import('./janIA');

      if (distinctListings.length > 1 && chatId !== '120363417740040773@g.us' && chatId !== '120363403507276533@g.us') {
        console.log(`[JANIA-MATCH] Detectadas ${distinctListings.length} publicaciones independientes en el mismo minuto para ${resolvedSenderId}. Procesando cada una por separado...`);
        let groupName = "Nombre Real del Grupo";
        try {
          const metadata = await this.getCachedGroupMetadata(chatId);
          if (metadata && metadata.subject) {
            groupName = metadata.subject;
          }
        } catch (e) {}

        for (const bufferedMsg of buffer.messages) {
          if (!bufferedMsg.body || bufferedMsg.body.trim() === '') continue;

          const urlMatch = bufferedMsg.body.match(/https?:\/\/[^\s]+/g);
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

          await this.logToDb(resolvedSenderId, 'user', bufferedMsg.body);

          const result = await processWhatsAppMessage(
            bufferedMsg.body,
            resolvedSenderId,
            userName,
            bufferedMsg.hasMedia,
            scrapedResults,
            undefined,
            bufferedMsg.imageBuffer,
            true,
            bufferedMsg.pdfBuffer,
            bufferedMsg.pdfMimeType,
            chatId,
            groupName
          );

          const isOfficialGroupSingle = chatId === this.targetGroupId || chatId === this.buzonGroupId || chatId === this.circuloGroupId;
          if (result) {
            const emoji = this.getReactionEmoji(result, isOfficialGroupSingle);
            if (emoji && bufferedMsg.originalMsg?.key && bufferedMsg.originalMsg.key.id && !bufferedMsg.originalMsg.key.fromMe) {
              const reactionKey = {
                remoteJid: bufferedMsg.originalMsg.key.remoteJid || chatId,
                fromMe: false,
                id: bufferedMsg.originalMsg.key.id,
                participant: bufferedMsg.originalMsg.key.participant
              };
              this.sock.sendMessage(chatId, { react: { text: emoji, key: reactionKey } }).catch(() => {});
            }
          }
        }
        return;
      }

      const fullText = buffer.messages.map(m => m.body).join('\n\n');
      const hasMedia = buffer.messages.some(m => m.hasMedia);
      const imageMsg = buffer.messages.find(m => m.imageBuffer);
      const pdfMsg = buffer.messages.find(m => m.pdfBuffer);
      const isAudioPTT = buffer.messages.some(m => !!m.originalMsg?.message?.audioMessage);

      // Scraping de enlaces si existen
      const urlMatch = fullText.match(/https?:\/\/[^\s]+/g);
      const scrapedResults: any[] = [];
      if (urlMatch) {
        for (const url of urlMatch.slice(0, 3)) {
          if (esDominioPermitido(url)) {
            try {
              const data = await scrapePropertyLink(url);
              if (data) scrapedResults.push(data);
            } catch (err: any) {
              console.error(`[SCRAPING-BUFFER] Error al raspar URL ${url}:`, err?.message || err);
            }
          }
        }
      }

      // Guardar logs en BD
      await this.logToDb(resolvedSenderId, 'user', fullText);

      const { sendAdminNotification } = await import('./whatsapp-utils');

      // Procesar mediante JanIA (guardará en DB de forma automática)
      let result;
      if (chatId === '120363417740040773@g.us') {
        result = await processConsultingMessage(
          fullText,
          resolvedSenderId,
          userName,
          imageMsg?.imageBuffer,
          pdfMsg?.pdfBuffer,
          pdfMsg?.pdfMimeType,
          isAudioPTT ? ('mock-audio:' + fullText) : undefined
        );
      } else if (chatId === '120363403507276533@g.us') {
        result = await processCirculoMessage(
          fullText,
          resolvedSenderId,
          userName
        );
      } else {
        let groupName = "Nombre Real del Grupo";
        try {
          const metadata = await this.getCachedGroupMetadata(chatId);
          if (metadata && metadata.subject) {
            groupName = metadata.subject;
          }
        } catch (e) {}
        result = await processWhatsAppMessage(
          fullText,
          resolvedSenderId,
          userName,
          hasMedia,
          scrapedResults,
          undefined,
          imageMsg?.imageBuffer,
          true,
          pdfMsg?.pdfBuffer,
          pdfMsg?.pdfMimeType,
          chatId,
          groupName
        );
      }

      // --- REACCIONAR A LA PUBLICACIÓN EN GRUPOS (ASÍNCRONO Y SEGURO) ---
      const isOfficialGroup = chatId === this.targetGroupId || chatId === this.buzonGroupId || chatId === this.circuloGroupId;
      if (result) {
        const emoji = this.getReactionEmoji(result, isOfficialGroup);
        if (emoji) {
          const lastMsg = buffer.messages[buffer.messages.length - 1]?.originalMsg;
          if (lastMsg && lastMsg.key && lastMsg.key.id && !lastMsg.key.fromMe) {
            const reactionKey = {
              remoteJid: lastMsg.key.remoteJid || chatId,
              fromMe: false,
              id: lastMsg.key.id,
              participant: lastMsg.key.participant
            };
            this.sock.sendMessage(chatId, { react: { text: emoji, key: reactionKey } }).catch((reactErr: any) => {
              // Silencioso: no interrumpe la ingesta ni desestabiliza Baileys
            });
          }
        }
      }

      // --- MODO SILENCIOSO TOTAL GRUPAL BAILEYS ---
      // No se envían respuestas textuales ni advertencias en grupos a menos que seamos ADMINISTRADOR y sea una INFRACCIÓN.
      if (result) {
        const isWarning = result.classification === "DATOS_INCOMPLETOS" || result.classification === "VIOLACION_DE_NORMAS";
        
        let isBotAdmin = false;
        try {
          const metadata = await this.getCachedGroupMetadata(chatId);
          const me = this.sock.user?.id ? this.sock.user.id.split(':')[0] : '';
          const myParticipant = metadata?.participants?.find((p: any) => p.id.split('@')[0] === me);
          isBotAdmin = !!myParticipant && (myParticipant.admin === 'admin' || myParticipant.admin === 'superadmin');
        } catch (_) {}

        if (!isWarning) {
          const isConsultation = result.classification === "CONSULTA_GENERAL" || result.classification === "RESPUESTA_A_PREGUNTA_IA" || result.classification === "ANALISIS_DE_MERCADO";
          
          if (isConsultation) {
            console.log(`[JANIA-MATCH] Consulta general de ${senderId} en ${chatId} procesada en silencio.`);
          } else {
            // Inmueble o Requerimiento exitoso -> reportar match si existe
            if (result.response && result.response.trim() !== "") {
              console.log(`[JANIA-MATCH] Match detectado silenciosamente. Alertas enviadas al administrador.`);
              await sendAdminNotification(`🎯 *[MATCH DETECTADO]*\n\n${result.response}`);
              await this.logToDb(senderId, 'janIA', `[SILENT-MATCH] ${result.response}`);
            }
          }
        } else {
          console.log(`[JANIA-MATCH] Publicación con advertencia/incompleta de ${senderId} en ${chatId} procesada.`);
          const isOfficial = chatId === this.targetGroupId || chatId === this.buzonGroupId || chatId === this.circuloGroupId;
          // Si el bot es administrador y el usuario cometió una infracción de normas (publicación no permitida) en un grupo oficial
          if (result.classification === "VIOLACION_DE_NORMAS" && isOfficial && isBotAdmin && result.response && result.response.trim() !== "") {
            const textToDeliver = result.response;
            const { textToSpeechMedia } = await import('./whatsapp-utils');
            const voiceToDeliver = result.voiceResponse || textToDeliver;

            // 1. Enviar el audio de amonestación si es viable
            let audioSent = false;
            try {
              const media = await textToSpeechMedia(voiceToDeliver);
              if (media) {
                const lastMsg = buffer.messages[buffer.messages.length - 1].originalMsg;
                await this.queuedSend(chatId, media, { sendAudioAsVoice: true, quoted: lastMsg });
                audioSent = true;
              }
            } catch (audioErr) {
              console.error('[JANIA-MATCH] Error al enviar audio de amonestación:', audioErr);
            }

            // 2. Enviar texto a la comunidad amonestando al usuario solo si falló el audio
            if (!audioSent) {
              const lastMsg = buffer.messages[buffer.messages.length - 1].originalMsg;
              await this.queuedSend(chatId, textToDeliver, { quoted: lastMsg });
            }
            await this.logToDb(chatId, 'janIA', `[GROUP-WARNING] ${textToDeliver}`);
          }
        }

        // Alertas de matches adicionales (derivadas a administración en vez de DMs de usuario)
        if (result.extraDMs && result.extraDMs.length > 0) {
          for (const dm of result.extraDMs) {
            if (!dm.jid || !dm.jid.includes('@') || dm.jid.split('@')[0].length < 5) continue;
            console.log(`[JANIA-MATCH] [Stealth] Derivando notificación de Match adicional para ${dm.jid} a alertas de administrador.`);
            await sendAdminNotification(dm.message);
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

  private async parseAndSaveSilently(msg: proto.IWebMessageInfo, senderId: string, rawPhone: string, bodyText: string) {
    try {
      let imageBuffer: string | undefined;
      let pdfBuffer: string | undefined;
      let pdfMimeType: string | undefined;

      if (msg.message?.imageMessage) {
        try {
          const mediaBuffer = await downloadMediaMessage(msg as any, 'buffer', {});
          imageBuffer = mediaBuffer.toString('base64');
        } catch (e) {
          console.error('[JanIA-DM-Vision-Silent] Error descargando imagen:', e);
        }
      } else if (msg.message?.documentMessage) {
        try {
          const mediaBuffer = await downloadMediaMessage(msg as any, 'buffer', {});
          pdfBuffer = mediaBuffer.toString('base64');
          pdfMimeType = msg.message.documentMessage.mimetype || 'application/pdf';
        } catch (e) {
          console.error('[JanIA-DM-Document-Silent] Error descargando documento:', e);
        }
      }

      const realName = msg.pushName || `Asesor +${rawPhone}`;
      const { processWhatsAppMessage } = await import('./janIA');

      const result = await processWhatsAppMessage(
        bodyText,
        senderId,
        realName,
        !!imageBuffer || !!pdfBuffer,
        [],
        undefined,
        imageBuffer,
        true, // isGroup = true (forces parsing)
        pdfBuffer,
        pdfMimeType,
        senderId
      );

      if (result) {
        let reaction = "";
        if (result.classification === "INMUEBLE") {
          reaction = '👍';
        } else if (result.classification === "REQUERIMIENTO") {
          reaction = '📝';
        } else if (result.classification === "VIOLACION_DE_NORMAS") {
          reaction = '🚫';
        } else if (bodyText.includes("http://") || bodyText.includes("https://")) {
          reaction = '👌';
        }

        if (reaction) {
          const sendReaction = async () => {
            try {
              await this.sock.sendMessage(senderId, { react: { text: reaction, key: msg.key } });
            } catch (_) {}
          };

          if (result.inserted && (reaction === '👍' || reaction === '📝')) {
            const delayMs = Math.floor(Math.random() * (12000 - 4000 + 1)) + 4000;
            console.log(`[JANIA-MATCH] Inserción confirmada en parseAndSaveSilently. Retrasando reacción ${reaction} por ${delayMs}ms (Protocolo Anti-Ban)...`);
            setTimeout(sendReaction, delayMs);
          } else {
            await sendReaction();
          }
        }

        if (result.response && result.response.trim() !== "" && result.classification !== "DATOS_INCOMPLETOS" && result.classification !== "VIOLACION_DE_NORMAS") {
          const isMatch = result.response.includes("MATCH COMERCIAL DETECTADO") ||
                          result.response.includes("MATCH DETECTADO") ||
                          result.response.includes("MATCH INTELIGENTE DETECTADO") ||
                          result.response.includes("COINCIDENCIA DE NEGOCIO DETECTADA");
          if (isMatch) {
            const { sendAdminNotification } = await import('./whatsapp-utils');
            await sendAdminNotification(`🎯 *[MATCH DETECTADO POR DM]*\n\n${result.response}`);
          }
        }
      }
    } catch (err) {
      console.error("[JANIA-MATCH] Fallo en parseAndSaveSilently:", err);
    }
  }

  private async handlePrivateDmConversation(msg: proto.IWebMessageInfo, senderId: string, rawPhone: string, bodyText: string) {
    try {
      const realName = msg.pushName || `Asesor +${rawPhone}`;
      await this.sock.sendPresenceUpdate('recording', senderId);

      const saludo = getGreetingByTime();
      const firstName = extractFirstName(realName);
      const greetingName = firstName ? ` ${firstName}` : '';

      const outOfOfficeText = `¡${saludo}${greetingName}! 🙋🏻‍♀️ Qué bueno saludarte de nuevo. En este momento nuestros agentes humanos se encuentran descansando 🌙✨. Si gustas, puedes dejar tu mensaje aquí para que te respondamos mañana a primera hora, o si prefieres, puedes continuar la conversación conmigo y contarme en qué puedo ayudarte hoy. ¡Siempre es un gusto atenderte! 🤝🚀`;

      // Intentar generar y enviar el audio mediante TTS
      const { textToSpeechMedia } = await import('./whatsapp-utils');
      let media = null;
      try {
        media = await textToSpeechMedia(outOfOfficeText);
      } catch (ttsErr: any) {
        console.warn("[JANIA-MATCH] Error al generar TTS para fuera de horario:", ttsErr.message || ttsErr);
      }

      if (media) {
        await this.queuedSend(senderId, media, { sendAudioAsVoice: true, quoted: msg });
      } else {
        await this.queuedSend(senderId, outOfOfficeText, { quoted: msg });
      }

      await this.logToDb(senderId, 'janIA', outOfOfficeText);
      await this.sock.sendPresenceUpdate('paused', senderId);
    } catch (err) {
      console.error('[JANIA-MATCH] Error en handlePrivateDmConversation:', err);
    }
  }

  private async handleRedirectText(msg: proto.IWebMessageInfo, senderId: string, rawPhone: string) {
    try {
      const realName = msg.pushName || `Asesor +${rawPhone}`;
      const firstName = extractFirstName(realName);
      await this.sock.sendPresenceUpdate('composing', senderId);
      await delay(2000);

      const redirectMsg = 
        `Hola ${firstName} 👋😊. Si tienes dudas, inquietudes o quieres consultarme algo (sea por escrito o por notas de voz), te invito a escribir directamente al canal oficial privado de soporte de JanIA de la Web haciendo clic aquí: https://vecy-network.vercel.app/jania para realizar tus consultas correspondientes o si estás en los grupos correspondientes según tu consulta puedes hacerlas allí de la siguiente manera:\n\n` +
        `Mis grupos:\n\n` +
        `Para publicar tus INMUEBLES y REQUERIMIENTOS tenemos el grupo de 𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗨𝗘𝗕𝗟𝗘𝗦 𝗡𝗘𝗧𝗪𝗢𝗥𝗞 : Si aún no eres miembro, puedes unirte desde este enlace: https://chat.whatsapp.com/K36KrHeB9nMEKJ56s8XFcM\n` +
        `Para hacer tus consultas de casos inmobiliarios en temas jurídicos, tributarios, avalúos, ayuda en guía de procesos y redacción de contratos, tenemos el grupo de 𝗩𝗘𝗖𝗬: 𝗦𝗢𝗣𝗢𝗥𝗧𝗘 𝗟𝗘𝗚𝗔𝗟, 𝗧𝗥𝗜𝗕𝗨𝗧𝗔𝗥𝗜𝗢 𝗬 𝗔𝗩𝗔𝗟Ú𝗢𝗦 : Si aún no eres miembro, puedes unirte desde este enlace: https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6\n` +
        `Para preguntar acerca de nuestro proyecto VECY Network y debatir acerca de nuestras funciones beneficios y competencias, tenemos el grupo de 𝗣𝗥𝗢𝗬𝗘𝗖𝗧𝗢 "𝗩𝗲𝗰𝘆 𝗡𝗲𝘁𝘄𝗼𝗿𝗸" : Si aún no eres miembro puedes unirte desde este enlace: https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU\n\n` +
        `Te espero. ¡Allí te atenderé con gusto! 🚀`;

      await this.queuedSend(senderId, redirectMsg, { quoted: msg });
      await this.logToDb(senderId, 'janIA', redirectMsg);
      await this.sock.sendPresenceUpdate('paused', senderId);
    } catch (err) {
      console.error('[JANIA-MATCH] Error al enviar mensaje de redirección de DM privado:', err);
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
        const otherJid = isOwner ? (seekerPhone.includes('@') ? seekerPhone : `${seekerPhone}@s.whatsapp.net`) : (ownerPhone.includes('@') ? ownerPhone : `${ownerPhone}@s.whatsapp.net`);
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
        } catch { }

        try {
          const [seekerUser] = await db.select().from(users).where(eq(users.phone, seekerPhone)).limit(1);
          if (seekerUser && seekerUser.name) seekerName = seekerUser.name;
        } catch { }

        const ownerJid = ownerPhone.includes('@') ? ownerPhone : `${ownerPhone}@s.whatsapp.net`;
        const seekerJid = seekerPhone.includes('@') ? seekerPhone : `${seekerPhone}@s.whatsapp.net`;

        const matchScoreFormatted = Number(updatedMatch.matchScore || 0).toFixed(0);

        const msgToOwner = `🎉🎈 *¡CONEXIÓN DE NEGOCIO EXITOSA!* 🎈🎉
Felicidades, ambas partes han confirmado interés en la coincidencia *#M${matchId}* (Coincidencia: ${matchScoreFormatted}%).

Aquí tienes el contacto directo del aliado interesado en tu propiedad:
👤 *Nombre:* ${seekerName}
📞 *WhatsApp:* https://wa.me/${seekerPhone.split('@')[0]}
💬 *Su requerimiento:* ${req.rawText || 'Sin descripción'}

¡Les deseamos mucho éxito en el cierre comercial! 🤝🚀`;

        const msgToSeeker = `🎉🎈 *¡CONEXIÓN DE NEGOCIO EXITOSA!* 🎈🎉
Felicidades, ambas partes han confirmado interés en la coincidencia *#M${matchId}* (Coincidencia: ${matchScoreFormatted}%).

Aquí tienes el contacto directo del aliado que ofrece la propiedad:
👤 *Nombre:* ${ownerName}
📞 *WhatsApp:* https://wa.me/${ownerPhone.split('@')[0]}
💬 *Su oferta:* ${prop.rawText || 'Sin descripción'}

¡Les deseamos mucho éxito en el cierre comercial! 🤝🚀`;

        // No enviar notificaciones de match en WhatsApp a ningún humano (se gestiona 100% en la plataforma web)
        await this.logToDb(ownerJid, 'janIA', `[Match-Connected] Match #M${matchId} connected in DB. Seeker is ${seekerPhone}`);
        await this.logToDb(seekerJid, 'janIA', `[Match-Connected] Match #M${matchId} connected in DB. Owner is ${ownerPhone}`);
      } else {
        // Solo esta parte ha confirmado
        await this.queuedSend(senderId, `¡Gracias! He registrado tu confirmación de interés para la coincidencia *#M${matchId}*.\n\nEn cuanto la otra parte también confirme, les compartiré mutuamente sus datos de contacto para que puedan cerrar el negocio. 🚀`);
        await this.logToDb(senderId, 'janIA', `[Match-Confirmed-Waiting] User confirmed match #M${matchId}, waiting for peer.`);
      }
    } catch (err: any) {
      console.error(`[JANIA-MATCH] Error procesando confirmación para coincidencia #${matchId}:`, err);
      await this.queuedSend(senderId, "⚠️ Ocurrió un error interno al procesar tu confirmación.");
    }
  }

  public async queuedSend(chatId: string, content: any, options: any = {}) {
    outgoingQueue = outgoingQueue.then(async () => {
      try {
        if (!this.sock) {
          throw new Error("Cliente Baileys no inicializado");
        }

        let targetJid = chatId;
        if (targetJid.endsWith('@c.us')) {
          targetJid = targetJid.replace('@c.us', '@s.whatsapp.net');
        }

        if (targetJid.endsWith('@g.us')) {
          const isAuthorized = targetJid === this.targetGroupId || 
                               targetJid === this.buzonGroupId || 
                               targetJid === this.circuloGroupId;
          if (!isAuthorized) {
            console.log(`[JANIA-MATCH-SHIELD] Bloqueado envío de mensaje a grupo no autorizado (Modo Ingesta Fantasma): ${targetJid}`);
            return;
          }
        }

        // Failsafe de DM: Impedir el envío de cualquier mensaje directo a usuarios que no sean administradores
        if (targetJid.endsWith('@s.whatsapp.net')) {
          const rawPhone = targetJid.split('@')[0];
          const ADMIN_PHONE = process.env.ADMIN_PHONE || "573192919978";
          const isAdmin = rawPhone === "573192919978" || 
                          rawPhone.includes(ADMIN_PHONE);
          if (!isAdmin) {
            console.log(`[JANIA-ANTI-BAN-SHIELD] 🛡️ Bloqueado envío de mensaje directo (DM) a usuario no administrador (${targetJid}). Prohibición absoluta de DMs a terceros.`);
            return;
          }
        }

        let messagePayload: any = {};

        // Si es un string
        if (typeof content === 'string') {
          messagePayload = { text: content };
          if (options.mentions) {
            messagePayload.mentions = options.mentions;
          }
        } 
        // Si ya es un payload directo de Baileys
        else if (content && (content.text || content.audio || content.image || content.video || content.document)) {
          messagePayload = content;
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

        // ── ESCUDO DE SIMULACIÓN HUMANA (Human-Like Delay & Presence Updates) ──
        if (messagePayload.text && typeof messagePayload.text === 'string') {
          try {
            await this.sock.sendPresenceUpdate('composing', targetJid);
            const typingDelay = Math.min(5000, Math.max(2000, messagePayload.text.length * 40));
            await delay(typingDelay);
          } catch (_) {}
        } else if (messagePayload.audio) {
          try {
            await this.sock.sendPresenceUpdate('recording', targetJid);
            const recordingDelay = Math.min(1500, Math.max(300, (options.voiceLength || 2) * 200));
            await delay(recordingDelay);
          } catch (_) {}
        }

        const sent = await this.sock.sendMessage(targetJid, messagePayload, sendOptions);
        if (sent && sent.key && sent.key.id) {
          this.botSentMessageIds.add(sent.key.id);
        }
        await delay(1000);
      } catch (err: any) {
        console.error('[JANIA-MATCH] Error en despacho de mensaje Baileys:', err.message || err);
      }
    });
    return outgoingQueue;
  }

  public async sendToGroup(text: string, mediaPath?: string, mentions?: string[], groupId?: string) {
    try {
      const target = groupId || this.targetGroupId;
      let targetJid = target;
      if (targetJid.endsWith('@c.us')) {
        targetJid = targetJid.replace('@c.us', '@s.whatsapp.net');
      }

      let messagePayload: any = {};
      if (mediaPath) {
        const fs = await import('fs');
        const buffer = fs.readFileSync(mediaPath);
        const path = await import('path');
        const ext = path.extname(mediaPath).toLowerCase();
        
        if (ext === '.mp4') {
          messagePayload = {
            video: buffer,
            caption: text,
            mimetype: 'video/mp4'
          };
        } else if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
          messagePayload = {
            image: buffer,
            caption: text,
            mimetype: ext === '.png' ? 'image/png' : 'image/jpeg'
          };
        } else {
          messagePayload = {
            document: buffer,
            caption: text,
            mimetype: 'application/octet-stream',
            fileName: path.basename(mediaPath)
          };
        }
      } else {
        messagePayload = { text };
      }

      if (mentions && mentions.length > 0) {
        messagePayload.mentions = mentions.map(m => m.endsWith('@s.whatsapp.net') ? m : m.replace('@c.us', '@s.whatsapp.net'));
      }

      await this.queuedSend(targetJid, messagePayload);
      console.log(`[JANIA-MATCH] ✓ Mensaje enviado al grupo ${targetJid}.`);
    } catch (e: any) {
      console.error(`[JANIA-MATCH] Error enviando mensaje al grupo ${groupId || this.targetGroupId}:`, e.message || e);
    }
  }

  public async sendVoiceToGroup(text: string, groupId?: string) {
    try {
      const target = groupId || this.targetGroupId;
      let targetJid = target;
      if (targetJid.endsWith('@c.us')) {
        targetJid = targetJid.replace('@c.us', '@s.whatsapp.net');
      }

      const { cleanVoiceText } = await import('./whatsapp-utils');
      const cleaned = cleanVoiceText(text);
      console.log(`[JANIA-MATCH] Generando nota de voz para enviar al grupo ${targetJid}...`);
      
      const { textToSpeechMedia } = await import('./whatsapp-utils');
      const voiceMedia = await textToSpeechMedia(cleaned);

      if (voiceMedia && voiceMedia.data) {
        const buffer = Buffer.from(voiceMedia.data, 'base64');
        await this.queuedSend(targetJid, {
          audio: buffer,
          mimetype: voiceMedia.mimetype || 'audio/ogg; codecs=opus',
          ptt: true
        });
        console.log(`[JANIA-MATCH] ✓ Nota de voz enviada al grupo ${targetJid}.`);
      } else {
        console.warn(`[JANIA-MATCH] TTS falló para el grupo ${targetJid}, enviando texto.`);
        await this.queuedSend(targetJid, cleaned);
      }
    } catch (e: any) {
      console.error('[JANIA-MATCH] Error enviando nota de voz al grupo:', e.message || e);
    }
  }

  public async getGroupParticipants(groupId: string): Promise<string[]> {
    try {
      if (!this.sock) return [];
      const metadata = await this.getCachedGroupMetadata(groupId);
      return metadata?.participants ? metadata.participants.map((p: any) => p.id) : [];
    } catch (err) {
      console.warn(`[JANIA-MATCH] Error al obtener participantes del grupo ${groupId}:`, err);
      return [];
    }
  }

  public async sendManualCierreAudios() {
    console.log("[JANIA-MATCH] Generando y enviando audios de cierre manuales (Solo por hoy)...");
    const grupos = [
      {
        nombre: "VECY INMUEBLES NETWORK",
        id: this.targetGroupId,
        promptCierre: "Genera una nota de voz corta en español de despedida y cierre de jornada para el grupo de WhatsApp VECY INMUEBLES NETWORK. Agradece la actividad de hoy y despídete con calidez. Recuerda que no cobramos comisiones y que las ofertas y demandas cruzadas son el motor de la red."
      },
      {
        nombre: "Buzón de Consultoría",
        id: this.buzonGroupId,
        promptCierre: "Genera una nota de voz corta en español de despedida y cierre de jornada para el grupo de WhatsApp Buzón de Consultoría. Agradece la atención a los casos jurídicos y de comisiones compartidas resueltos hoy, deseando un feliz descanso."
      },
      {
        nombre: "Círculo Cero",
        id: this.circuloGroupId,
        promptCierre: "Genera una nota de voz corta en español de despedida y cierre de jornada para el grupo de WhatsApp Círculo Cero. Agradece el debate y las sugerencias de hoy sobre el futuro del sector."
      }
    ];

    const { invokeLLM } = await import('./llm');

    for (const grupo of grupos) {
      try {
        if (!grupo.id) continue;
        console.log(`[JANIA-MATCH] Generando audio de cierre para el grupo ${grupo.nombre}...`);
        
        const response1 = await invokeLLM({
          messages: [
            { role: 'system', content: 'Eres JanIA, la asistente de voz e inteligencia artificial de la red colaborativa VECY Network. Te expresas de manera natural, humana, cálida y profesional.' },
            { role: 'user', content: `${grupo.promptCierre}\n- IMPORTANTE: Debe sonar como un mensaje de voz natural de WhatsApp grabado de forma espontánea por una colega real. Empieza con naturalidad como: "Hola colegas", "Buenas tardes", etc. sin formalismos robóticos.\n- Máximo 350 caracteres.\n- CRÍTICO: Responde ÚNICAMENTE con las palabras habladas de la nota de voz. NO agregues preámbulos, comentarios ni envuelvas el texto en comillas, llaves o corchetes.` }
          ]
        });

        const content1 = response1.choices[0]?.message?.content;
        if (content1 && content1.trim() !== "") {
          await this.sendVoiceToGroup(content1, grupo.id);
        }
      } catch (err: any) {
        console.error(`❌ Error en sendManualCierreAudios para el grupo ${grupo.nombre}:`, err.message || err);
      }
    }
  }

  public pendingWelcomeJids: string[] = [];

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
      `  * 🏢 *Proyectos de construcción* o aportes de lote.\n` +
      `▸ *Matching Inteligente:* Cruzo ofertas y demandas en tiempo real y les aviso en el acto cuando hay negocio viable.`;

    const groups = [this.targetGroupId, this.buzonGroupId, this.circuloGroupId];
    const imgPath = path.resolve('./client/public/jania_perfil.png');

    for (const group of groups) {
      try {
        await this.sendToGroup(baseMsg, imgPath, [], group);
      } catch (e: any) {
        console.error(`Error enviando anuncio de retorno al grupo ${group}:`, e.message);
      }
    }
  }

  public async sendComunicadoMatch() {
    try {
      console.log(`[JANIA-MATCH] Enviando comunicado de notificaciones de match...`);
      const { MSG_COMUNICADO_MATCH_NETWORK, MSG_COMUNICADO_MATCH_CIRCULO } = await import('./janIA');
      await this.queuedSend(this.targetGroupId, MSG_COMUNICADO_MATCH_NETWORK);
      await delay(3000);
      await this.queuedSend(this.circuloGroupId, MSG_COMUNICADO_MATCH_CIRCULO);
      console.log("[JANIA-MATCH] Comunicado de match enviado con éxito.");
    } catch (err: any) {
      console.error("[JANIA-MATCH] Error al enviar el comunicado de match:", err.message || err);
    }
  }

  public async getPairingCode(phone: string): Promise<string> {
    const cleanPhone = phone.replace(/\D/g, "");
    console.log(`[JANIA-MATCH] Solicitando código de vinculación por número para: ${cleanPhone}`);
    
    // Forzar limpieza y reinicio para asegurar un estado limpio al solicitar un nuevo código de emparejamiento
    console.log("[JANIA-MATCH] Limpiando sesión previa para solicitar nuevo código...");
    try {
      if (this.sock) {
        this.sock.end(undefined);
      }
    } catch(e) {}
    
    const sessionDir = path.join(process.cwd(), '.baileys_auth');
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } catch (err: any) {
        console.warn("[JANIA-MATCH] No se pudo borrar .baileys_auth:", err.message);
      }
    }
    
    this.sock = null;
    await this.initialize();
    await delay(3000);
    
    try {
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

export const janiaMatchBot = new JaniaMatchBot({
  sessionFolderName: '.baileys_auth',
  qrFileName: 'qr-match.png',
  botName: 'JANIA-MATCH-OFICIAL'
});
export const janiaCaptadorBot = janiaMatchBot;
