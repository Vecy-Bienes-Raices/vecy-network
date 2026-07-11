import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason, 
  delay,
  downloadMediaMessage,
  proto,
  fetchLatestBaileysVersion,
  Browsers
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcodeTerminal from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db';
import { conversations, messages as dbMessages, users, propertyMatches, properties, requirements } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { esDominioPermitido, scrapePropertyLink } from './scraper';
import QRCode from 'qrcode';
import { extractFirstName, getGreetingByTime } from './whatsapp';
import { transcribeAudioBuffer } from './voiceTranscription';


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
  private lastGroupMessageTime: Map<string, number> = new Map();
  private botSentMessageIds: Set<string> = new Set();
  private lastHumanIntervention: Map<string, number> = new Map();
  private dmMessageBuffers: Map<string, { messages: any[]; timer: NodeJS.Timeout | null }> = new Map();

  private targetGroupId: string = '120363260108880069@g.us';
  private buzonGroupId: string = '120363417740040773@g.us';
  private circuloGroupId: string = '120363403507276533@g.us';
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
      
      // Guardar las credenciales iniciales de inmediato en disco para evitar que se pierdan
      if (!fs.existsSync(path.join(sessionDir, 'creds.json'))) {
        await saveCreds();
        console.log('[JANIA-MATCH] 💾 Guardadas credenciales iniciales de Baileys en el disco.');
      }
      
      // Obtener la versión de WhatsApp Web más reciente para evitar el error de stream 515
      let version: any = [2, 3000, 1017531287];
      try {
        const { version: latestVersion } = await fetchLatestBaileysVersion();
        version = latestVersion;
        console.log(`[JANIA-MATCH] Usando versión de WhatsApp Web: ${version.join('.')}`);
      } catch (e: any) {
        console.warn('[JANIA-MATCH] No se pudo obtener la versión dinámica de WhatsApp Web, usando fallback:', e.message);
      }

      console.log('[JANIA-MATCH] Estableciendo conexión por WebSocket...');
      this.sock = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false, // Lo manejamos nosotros de forma personalizada
        browser: Browsers.macOS('Desktop'),
        syncFullHistory: false,
        markOnlineOnConnect: false,
        connectTimeoutMs: 90000, // Aumentado a 90s para conexiones lentas
        defaultQueryTimeoutMs: 90000,
        keepAliveIntervalMs: 20000, // Ping Keep-Alive de WebSocket cada 20 segundos
        emitOwnEvents: true,
      });

      this.setupEventListeners(saveCreds);
    } catch (err: any) {
      console.error('[JANIA-MATCH] Error crítico al inicializar el cliente Baileys:', err);
    }
  }

  private setupEventListeners(saveCreds: () => Promise<void>) {
    this.sock.ev.on('creds.update', async () => {
      console.log('[JANIA-MATCH] 💾 Evento creds.update disparado.');
      try {
        await saveCreds();
        console.log('[JANIA-MATCH] 💾 saveCreds() ejecutado con éxito.');
        const sessionDir = path.join(process.cwd(), '.baileys_auth');
        if (fs.existsSync(sessionDir)) {
          const files = fs.readdirSync(sessionDir);
          console.log('[JANIA-MATCH] 💾 Archivos en .baileys_auth:', files);
        }
      } catch (err: any) {
        console.error('[JANIA-MATCH] ❌ Error al guardar credenciales:', err.message || err);
      }
    });

    this.sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('\n[JANIA-MATCH] 🔌 ESCANEA ESTE CÓDIGO QR PARA INICIAR JANIA MATCH:');
        qrcodeTerminal.generate(qr, { small: true });

        // Guardar el QR como imagen PNG accesible desde el navegador
        try {
          const qrPath = path.join(process.cwd(), 'qr-match.png');
          QRCode.toFile(qrPath, qr, { width: 400, margin: 2 }, (err: any) => {
            if (err) console.error('[JANIA-MATCH] Error guardando QR PNG:', err.message);
            else console.log(`[JANIA-MATCH] 📸 QR guardado como imagen en la raíz del proyecto.`);
          });
        } catch (e: any) {
          console.warn('[JANIA-MATCH] qrcode no disponible para PNG.', e.message);
        }
      }

      if (connection === 'close') {
        const error = lastDisconnect?.error as Boom;
        const statusCode = error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        const isRestart = statusCode === DisconnectReason.restartRequired;
        const isConnectionLost = statusCode === DisconnectReason.connectionLost;
        const delayMs = (isRestart || isConnectionLost) ? 1000 : 5000;
        
        console.warn(`[JANIA-MATCH] ⚠️ Conexión Baileys cerrada (código: ${statusCode}): ${error?.message || error}. Reconectando en ${delayMs}ms: ${shouldReconnect}`);
        this.isReady = false;

        if (shouldReconnect) {
          setTimeout(() => this.initialize(), delayMs);
        } else {
          console.error('[JANIA-MATCH] Sesión de WhatsApp cerrada (Logged Out). Limpiando credenciales...');
          try {
            fs.rmSync(path.join(process.cwd(), '.baileys_auth'), { recursive: true, force: true });
          } catch (e: any) {}
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

        const fromMe = msg.key.fromMe;
        const rawChatId = msg.key.remoteJid;
        if (!rawChatId) continue;

        const cleanJid = (jid: string) => {
          if (!jid) return "";
          if (jid.includes('@')) {
            const [userPart, domain] = jid.split('@');
            const cleanUser = userPart.split(':')[0];
            return `${cleanUser}@${domain}`;
          }
          return jid.split(':')[0];
        };

        const chatId = cleanJid(rawChatId);
        const isGroup = chatId.endsWith('@g.us');

        // Para DMs privados, permitimos pasar los mensajes propios (fromMe) para poder detectar la intervención humana
        if (fromMe && isGroup) continue;

        const rawSenderId = isGroup ? (msg.key.participant || msg.participant) : rawChatId;
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
              return;
            }

            let body = '';
            let isAudioPTT = false;
            if (msg.message.conversation) body = msg.message.conversation;
            else if (msg.message.extendedTextMessage) body = msg.message.extendedTextMessage.text || '';
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

            // --- IDENTIFICACIÓN DE GRUPOS OFICIALES VECY ---
            const isMainGroup = chatId === this.targetGroupId;     // VECY INMUEBLES NETWORK
            const isBuzonGroup = chatId === this.buzonGroupId;     // SOPORTE LEGAL, TRIBUTARIO Y AVALÚOS
            const isCirculoGroup = chatId === this.circuloGroupId; // Círculo CERO 👌
            const isOfficialGroup = isMainGroup || isBuzonGroup || isCirculoGroup;


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

            // Los audios fallidos tienen su propio manejo en handleDirectGroupQuestion
            const isInteractiveGroupQuery = !isPossibleListing && (
              isAudioPTT ||
              ((isBuzonGroup || isCirculoGroup || isMainGroup) && !isShortCourtesy)
            );

            const shouldRespond = hasDirectMention || isHelpOrSystemQuery || isInteractiveGroupQuery;

            if (shouldRespond) {
              let isBotAdmin = false;
              try {
                const metadata = await this.sock.groupMetadata(chatId);
                const me = this.sock.user?.id ? this.sock.user.id.split(':')[0] : '';
                const myParticipant = metadata.participants.find((p: any) => p.id.split('@')[0] === me);
                isBotAdmin = !!myParticipant && (myParticipant.admin === 'admin' || myParticipant.admin === 'superadmin');
              } catch (err) {
                isBotAdmin = false;
              }

              // Los 3 grupos oficiales responden 24/7; grupos externos solo fuera de horario
              const { isOutsideWorkingHours } = await import('./janIA');
              const isOffHours = isOutsideWorkingHours();
              const canRespond = isBotAdmin && (isOfficialGroup || isOffHours);

              if (canRespond) {
                console.log(`[JANIA-MATCH] Respondiendo en grupo ${chatId} (Oficial=${isOfficialGroup}, OffHours=${isOffHours}).`);
                await this.handleDirectGroupQuestion(msg, chatId, senderId, body);
              } else {
                console.log(`[JANIA-MATCH] Ignorado en ${chatId} (BotAdmin=${isBotAdmin}, Oficial=${isOfficialGroup}, OffHours=${isOffHours}).`);
              }
              return;
            }

            if (isPossibleListing) {
              await this.handleIncomingGroupMessage(msg, chatId, body);
            }
            return;
          }

          // --- FLUJO 2: CHATS PRIVADOS (DMs) ---
          if (!isGroup) {
            const rawPhone = senderId.split('@')[0];
            const ADMIN_PHONE = process.env.ADMIN_PHONE || "573166569719";
            const isAdmin = rawPhone.includes(ADMIN_PHONE) || rawPhone === ADMIN_PHONE || rawPhone === "573166569719" || rawPhone.includes("573185462265");
            const userName = msg.pushName || `Asesor +${rawPhone}`;

            // 1. Detectar si el mensaje es del bot o de un humano (fromMe)
            if (msg.key.fromMe) {
              const msgId = msg.key.id || "";
              if (!this.botSentMessageIds.has(msgId)) {
                // Intervención humana detectada
                console.log(`[JANIA-MATCH] Intervención humana detectada en DM ${senderId}. Silenciando bot.`);
                this.lastHumanIntervention.set(senderId, Date.now());
              }
              return;
            }

            // 2. Verificar si hay una intervención humana activa (últimos 30 minutos)
            const lastIntervention = this.lastHumanIntervention.get(senderId) || 0;
            const cooldownPeriod = 30 * 60 * 1000; // 30 minutos
            if (Date.now() - lastIntervention < cooldownPeriod) {
              console.log(`[JANIA-MATCH] Bot silenciado en DM ${senderId} debido a intervención humana reciente (${Math.round((Date.now() - lastIntervention) / 1000)}s).`);
              return;
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

    if (!isAdmin) {
      const textLower = body.toLowerCase();
      const isPossibleListing = 
        body.length > 120 || 
        body.split('\n').length > 2 || 
        !!imageBuffer ||
        !!pdfBuffer ||
        textLower.includes("http") ||
        textLower.includes("www") ||
        textLower.includes("ofrezco") ||
        textLower.includes("busco") ||
        textLower.includes("vendo") ||
        textLower.includes("arriendo") ||
        textLower.includes("compro") ||
        textLower.includes("necesito");

      if (isPossibleListing) {
        console.log(`[JANIA-MATCH] Detectada publicación comercial agrupada en DM privado de ${senderId}. Procesando...`);
        
        await this.logToDb(senderId, 'user', body);

        const { processWhatsAppMessage } = await import('./janIA');
        const result = await processWhatsAppMessage(
          body,
          senderId,
          userName,
          !!imageBuffer || !!pdfBuffer,
          [],
          undefined,
          imageBuffer,
          false, // isGroup = false
          pdfBuffer,
          pdfMimeType
        );

        if (result) {
          const emoji = this.getReactionEmoji(result);
          if (emoji) {
            try {
              await this.sock.sendMessage(chatId, { react: { text: emoji, key: mainMsg.key } });
            } catch (e) {}
          }

          const { isOutsideWorkingHours } = await import('./janIA');
          const isOffHours = isOutsideWorkingHours();
          if (isOffHours && result.shouldSendDM && result.dmResponse && result.dmResponse.trim() !== "") {
            await this.queuedSend(senderId, result.dmResponse);
          }
        }
        return;
      }

      // Verificar si estamos fuera de horario laboral (Colombia)
      const { isOutsideWorkingHours } = await import('./janIA');
      const isOffHours = isOutsideWorkingHours();

      if (isOffHours) {
        console.log(`[JANIA-MATCH] Conversación DM fuera de horario con ${senderId}.`);
        await this.logToDb(senderId, 'user', body);
        await this.handlePrivateDmConversation(mainMsg, senderId, rawPhone, body);
        return;
      } else {
        // Dentro de horario laboral: el bot de DMs no interfiere. Silencio absoluto
        console.log(`[JANIA-MATCH] DM de ${rawPhone} recibido en horario laboral. Silenciado.`);
        await this.logToDb(senderId, 'user', body);
        return;
      }
    }

    // --- FLUJO ADMINISTRADOR O BYPASS DE TEST ---
    console.log(`[JANIA-MATCH] [Admin/Test] Atendiendo mensaje de admin/test ${senderId}...`);
    // Interceptar confirmaciones de Match (SÍ #M123 o NO #M123)
    const matchConfirmationRegex = /^\s*(sí|si|no)\s+#m(\d+)\s*$/i;
    const matchConfirm = body.match(matchConfirmationRegex);
    if (matchConfirm) {
      const decision = matchConfirm[1].toLowerCase();
      const matchId = parseInt(matchConfirm[2], 10);
      await this.processMatchConfirmation(senderId, userName, matchId, decision);
      return;
    }

    // Por defecto chatea libremente con administrador o cuenta de test
    await this.logToDb(senderId, 'user', body);
    await this.handlePrivateDmConversation(mainMsg, senderId, rawPhone, body);
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

      const { detectaVoz, textToSpeechMedia } = await import('./whatsapp');
      const { processWhatsAppMessage, processConsultingMessage, processCirculoMessage } = await import('./janIA');

      const wantsVoice = msg.message?.audioMessage || detectaVoz(textLower);
      if (wantsVoice) {
        await this.sock.sendPresenceUpdate('recording', chatId);
      } else {
        await this.sock.sendPresenceUpdate('composing', chatId);
      }

      await delay(2000);

      // Si la transcripción del audio falló, respondemos con un mensaje específico
      const isAudioFailed = bodyText === '[audio-vacío]' || bodyText === '[audio-sin-buffer]' || bodyText === '[audio-error]';
      if (isAudioFailed) {
        const failMsg = `Hola ${realName} 👋🏻, escuché que enviaste una nota de voz. Lamentablemente tuve un inconveniente técnico al procesarla en este momento. 🙏\n\nTe pido que:\n✏️ Escribas tu consulta por texto aquí en el grupo, o\n📲 Me la envíes directamente en mi chat privado: https://wa.me/573166569719\n\n¡En el chat privado puedo escuchar y procesar tus audios sin problemas! 😊`;
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
          const groupName = isOffTopicLegal ? 'VECY: SOPORTE LEGAL, TRIBUTARIO Y AVALÚOS' : 'Círculo CERO 👌';
          const redirectMsg =
            `Hola ${realName} 👋🏻, veo que tu consulta es sobre ${isOffTopicLegal ? 'temas jurídicos, tributarios o de avalúos' : 'el funcionamiento de VECY Network y JanIA'}. ¡Perfecto! 🎯\n\n` +
            `Ese tipo de preguntas las atiendo con más profundidad en el grupo *${groupName}* de nuestra comunidad de WhatsApp. 🏠\n\n` +
            `También puedes consultarme directamente en mi chat privado con mi otra yo *JanIA v3.5* 📲: https://wa.me/573166569719\n\n` +
            `¡Allí te atiendo con todo el detalle que mereces! 😊`;
          await this.queuedSend(chatId, redirectMsg, { mentions: [senderId], quoted: msg });
          await this.sock.sendPresenceUpdate('paused', chatId);
          return;
        }
      }

      let result;
      if (chatId === this.buzonGroupId) { // Soporte Legal, Tributario y Avalúos
        result = await processConsultingMessage(bodyText, senderId, realName);
      } else if (chatId === this.circuloGroupId) { // Círculo Cero
        result = await processCirculoMessage(bodyText, senderId, realName);
      } else if (isMainGroupChat) { // VECY INMUEBLES NETWORK — preguntas sobre el grupo/sistema
        result = await processWhatsAppMessage(bodyText, senderId, realName);

      } else {
        const redirectMsg = `¡Hola! 😊 Para resolver tus inquietudes inmobiliarias, dudas de corretaje, soporte técnico o de cuenta, te invito a consultarme en privado a mi otro yo: **JanIA de Soporte y Atención** 📲 en el número +57 3185462265 o haciendo clic aquí: https://wa.me/573185462265. ¡Allí con gusto te responderé a profundidad! 🚀`;
        await this.queuedSend(chatId, redirectMsg, {
          mentions: [senderId],
          quoted: msg
        });
        await this.sock.sendPresenceUpdate('paused', chatId);
        return;
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

        // Registrar la respuesta enviada por JanIA en la BD de mensajes para mantener el hilo de la conversación
        await this.logToDb(chatId, 'janIA', textToDeliver);
      }

      await this.sock.sendPresenceUpdate('paused', chatId);
    } catch (err) {
      console.error('[JANIA-MATCH] Error al responder pregunta directa en grupo:', err);
    }
  }

  // --- LOGÍSTICA DE BUFFER GRUPAL ---
  private async handleIncomingGroupMessage(msg: proto.IWebMessageInfo, chatId: string, bodyText: string) {
    if (!msg.key || !msg.message) return;
    const rawSender = msg.key.participant || msg.participant || '';
    if (!rawSender || rawSender.endsWith('@g.us')) {
      console.warn(`[JANIA-MATCH] Omitiendo mensaje de grupo: sender individual inválido (${rawSender})`);
      return;
    }
    const senderId = rawSender.includes('@') ? `${rawSender.split('@')[0].split(':')[0]}@${rawSender.split('@')[1]}` : rawSender.split(':')[0];
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
        const metadata = await this.sock.groupMetadata(chatId);
        const me = this.sock.user?.id ? this.sock.user.id.split(':')[0] : '';
        const myParticipant = metadata.participants.find((p: any) => p.id.split('@')[0] === me);
        isBotAdmin = !!myParticipant && (myParticipant.admin === 'admin' || myParticipant.admin === 'superadmin');
      } catch (_) {}

      if (isBotAdmin) {
        const lastMsgTime = this.lastGroupMessageTime.get(`${chatId}_${senderId}`) || 0;
        const ONE_MINUTE = 60 * 1000;
        if (now - lastMsgTime < ONE_MINUTE) {
          console.log(`[JANIA-MATCH] Doble posteo detectado para ${senderId} en ${chatId} (Mismo minuto).`);
          try {
            await this.sock.sendMessage(chatId, { react: { text: '🚨', key: msg.key } });
            const warningText = `¡Hola! ⚠️ He detectado que estás enviando múltiples publicaciones consecutivas en menos de un minuto. Debes publicar cada una pero con un intervalo de tiempo justificable de por lo menos UN MINUTO o DOS de diferencia entre cada publicación para poder hacer el proceso perfectamente y poderlo subir a nuestra base de datos de manera correcta, ya que NO puedo revisar tantos inmuebles de un solo tajo ni incluirlos en la base de datos de inmediato. Esto es con el fin de mantener el buen funcionamiento del sistema y ver si le encontramos una coincidencia o MATCH a tus publicaciones. ¡Gracias por tu amable comprensión! 🤝🚀`;
            await this.queuedSend(chatId, warningText, { quoted: msg, mentions: [senderId] });
          } catch (e) {}
          return;
        }
        this.lastGroupMessageTime.set(`${chatId}_${senderId}`, now);
      }

      // 1. CONTROL DE COOLDOWN (SOLO EN GRUPO PRINCIPAL Y PARA POSIBLES LISTINGS)
      if (isMainGroup) {
        this.loadCooldowns();
        const cooldownKey = `${chatId}_${senderId}`;
        const cooldown = this.cooldownMap.get(cooldownKey);
        
        if (cooldown && (now - cooldown.lastBlockProcessedAt < COOLDOWN_PERIOD)) {
          if (this.authorizedGroups.includes(chatId)) {
            try {
              await this.sock.sendMessage(chatId, { react: { text: '⚠️', key: msg.key } });
            } catch (e) {}
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
          if (this.authorizedGroups.includes(chatId)) {
            try {
              await this.sock.sendMessage(chatId, { react: { text: '⚠️', key: msg.key } });
            } catch (e) {}
          }
          return;
        }

        // Límite físico de mensajes en el buffer
        const limit = isMainGroup ? MAX_BLOCK_SIZE : 10;
        if (buffer.messages.length >= limit) {
          console.log(`[BUFFER] Límite de mensajes del bloque (${limit}) alcanzado para ${senderId}. Mensaje descartado.`);
          if (this.authorizedGroups.includes(chatId)) {
            try {
              await this.sock.sendMessage(chatId, { react: { text: '⚠️', key: msg.key } });
            } catch (e) {}
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
    const completeEmojis = ['👍', '👌', '🤝', '✅', '🆗', '✔️', '☑️'];
    const incompleteEmojis = ['😳', '🧐', '🫪', '😲', '😮', '🤔', '🤷🏻‍♀️', '❓'];
    const violationEmojis = ['🚫', '🙈', '🙅‍♂️', '🚨', '😒', '❌', '🆘', '❎', '👎', '🙀', '🙄'];

    if (result.reactionEmoji && typeof result.reactionEmoji === 'string') {
      const trimmed = result.reactionEmoji.trim();
      if (trimmed) return trimmed;
    }

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

    return null;
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

      const { processWhatsAppMessage, processConsultingMessage, processCirculoMessage } = await import('./janIA');
      const { sendAdminNotification } = await import('./whatsapp');

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

      // --- MODO SILENCIOSO TOTAL GRUPAL BAILEYS ---
      // No se envían respuestas textuales ni advertencias en grupos a menos que seamos ADMINISTRADOR y sea una INFRACCIÓN.
      if (result) {
        const isWarning = result.classification === "DATOS_INCOMPLETOS" || result.classification === "VIOLACION_DE_NORMAS";
        
        let isBotAdmin = false;
        try {
          const metadata = await this.sock.groupMetadata(chatId);
          const me = this.sock.user?.id ? this.sock.user.id.split(':')[0] : '';
          const myParticipant = metadata.participants.find((p: any) => p.id.split('@')[0] === me);
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
          // Si el bot es administrador y el usuario cometió una infracción de normas (publicación no permitida)
          if (result.classification === "VIOLACION_DE_NORMAS" && isBotAdmin && result.response && result.response.trim() !== "") {
            const textToDeliver = result.response;
            const { textToSpeechMedia } = await import('./whatsapp');
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
        if (result.classification === "INMUEBLE" || result.classification === "REQUERIMIENTO") {
          reaction = '✅';
        } else if (result.classification === "DATOS_INCOMPLETOS" || (result.missingFields && result.missingFields.length > 0)) {
          reaction = '🤔';
        }
        if (reaction) {
          try {
            await this.sock.sendMessage(senderId, { react: { text: reaction, key: msg.key } });
          } catch (_) {}
        }

        if (result.response && result.response.trim() !== "" && result.classification !== "DATOS_INCOMPLETOS" && result.classification !== "VIOLACION_DE_NORMAS") {
          const isMatch = result.response.includes("MATCH COMERCIAL DETECTADO") ||
                          result.response.includes("MATCH DETECTADO") ||
                          result.response.includes("MATCH INTELIGENTE DETECTADO") ||
                          result.response.includes("COINCIDENCIA DE NEGOCIO DETECTADA");
          if (isMatch) {
            const { sendAdminNotification } = await import('./whatsapp');
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
      await this.sock.sendPresenceUpdate('composing', senderId);
      await delay(2000);

      const redirectMsg = 
        `Hola ${realName} 👋🏻. Si deseas que JanIA Match te responda de inmediato, por favor postea tu pregunta directamente en el chat del grupo oficial de VECY. 🏠\n\n` +
        `Si deseas chatear en privado de forma interactiva, por favor escribe a mi otra yo, **JanIA v3.5** 📲, a su número oficial directo: +57 3185462265 o haz clic aquí: https://wa.me/573185462265.\n\n` +
        `⚠️ **Nota importante**: Recuerda que somos inteligencias netamente conversacionales. Sí podemos resolver tus inquietudes, redactar descripciones comerciales, hacer análisis y estructurar textos directamente aquí en el chat. Sin embargo, **no tenemos la habilidad de crear imágenes, videos, informes con gráficas, ni de elaborar o enviar archivos PDF a través del chat**.\n\n` +
        `Si requieres un análisis de mercado formal con gráficas y PDF detallado, o piezas visuales/videos profesionales, este servicio lo realiza nuestro personal humano experto. Comunícate llamando al **+57 3166569719** para solicitar la cotización e informe de nuestro equipo. 📈💼`;


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

export const janiaMatchBot = new JaniaMatchBot();
