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

// Estado pendiente para completar registros cuando el usuario responde por DM
interface PendingEntry {
  originalText: string;       // Extracto de la publicación original en el grupo
  extractedData: any;         // Datos ya extraídos por JanIA
  classification: string;     // INMUEBLE | REQUERIMIENTO
  missingFields: string[];    // Preguntas pendientes
  expiresAt: number;          // Expira en 2 horas
}

export class WhatsAppBot {
  private client: ClientType;
  private targetGroupId: string = '120363260108880069@g.us';
  private messageBuffers: Map<string, { timer: NodeJS.Timeout, messages: string[], userName: string, hasMedia: boolean, chatId: string }> = new Map();
  private pendingData: Map<string, PendingEntry> = new Map(); // Seguimiento de respuestas pendientes por DM
  private startTime: number = Date.now();
  private pendingWelcomeCount: number = 0;
  private counterFile: string = path.join(process.cwd(), '.pending_welcome_count');

  constructor() {
    console.log('[WHATSAPP-BOT] Cargando contador...');
    this.loadCounter();
    
    console.log('[WHATSAPP-BOT] Inicializando cliente de WhatsApp-Web.js...');
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

    console.log('[WHATSAPP-BOT] Configurando escuchadores de eventos...');
    this.setupEventListeners();
    this.setupGracefulShutdown();
    this.setupDailySchedule();
    console.log('[WHATSAPP-BOT] Constructor finalizado.');
  }

  private async logToDb(senderId: string, role: 'user' | 'janIA', content: string) {
    try {
      const db = await getDb();
      if (!db) return;

      // Get or create conversation for this WhatsApp user/group
      // Note: We use sessionId as the key for WhatsApp chats
      let conv = await db.select().from(conversations).where(eq(conversations.sessionId, senderId)).limit(1);
      let conversationId: number;

      if (conv.length === 0) {
        try {
          const [newConv] = await db.insert(conversations).values({
            sessionId: senderId,
            status: 'active',
            lastMessage: content.substring(0, 200)
          }).returning();
          conversationId = newConv.id;
        } catch (insertErr) {
          console.error('[LOG-DB] Failed to create conversation:', insertErr);
          return;
        }
      } else {
        conversationId = conv[0].id;
      }

      // Save message
      await db.insert(dbMessages).values({
        conversationId,
        role,
        content,
        messageType: 'text'
      });

      // Update last message
      await db.update(conversations).set({
        lastMessage: content.substring(0, 200),
        updatedAt: new Date()
      }).where(eq(conversations.id, conversationId));

    } catch (e) {
      console.error('[LOG-DB] Error saving WhatsApp log:', e);
    }
  }

  private loadCounter() {
    try {
      if (fs.existsSync(this.counterFile)) {
        this.pendingWelcomeCount = parseInt(fs.readFileSync(this.counterFile, 'utf8')) || 0;
        console.log(`[INIT] Contador de bienvenida cargado: ${this.pendingWelcomeCount}`);
      }
    } catch (e) {
      console.error('Error cargando contador:', e);
    }
  }

  private saveCounter() {
    try {
      fs.writeFileSync(this.counterFile, this.pendingWelcomeCount.toString(), 'utf8');
    } catch (e) {
      console.error('Error guardando contador:', e);
    }
  }

  private setupGracefulShutdown() {
    const shutdown = async () => {
      console.log('\n🛑 Cerrando WhatsApp Bot...');
      this.saveCounter();
      try {
        await this.client.destroy();
        console.log('✅ Cliente de WhatsApp destruido correctamente.');
      } catch (e) {
        console.error('Error al destruir cliente:', e);
      }
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  private setupDailySchedule() {
    // Verificar cada minuto si aplica el horario de broadcasts
    setInterval(() => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();

      // Mensaje 1 + Mensaje 2: 6:00 AM y 6:00 PM diarios
      if ((h === 6 || h === 18) && m === 0) {
        console.log(`⏰ Broadcast diario (${h}:00) — enviando presentación + normas`);
        this.sendPresentacion().then(() => {
          setTimeout(() => this.sendNormas(), 4000);
        });
      }

      // Mensaje 3: cada 2 horas entre 6 AM y 8 PM (6,8,10,12,14,16,18,20)
      if (h >= 6 && h <= 20 && h % 2 === 0 && m === 30) {
        console.log(`⏰ Recordatorio rápido (${h}:30)`);
        this.sendRecordatorio();
      }
    }, 60000);
  }

  private setupEventListeners() {
    this.client.on('qr', (qr: string) => {
      console.log('\n--- NUEVO CÓDIGO QR REQUERIDO ---');
      console.log('Por favor, escanea este código para conectar a JanIA:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('authenticated', () => {
      console.log('✅ WhatsApp Autenticado correctamente.');
    });

    this.client.on('auth_failure', (msg: string) => {
      console.error('❌ Error de autenticación:', msg);
    });

    this.client.on('ready', async () => {
      console.log('\n🚀 JANIA OPERATIVA - SISTEMA DE MATCHES PROFESIONAL ACTIVADO');
      console.log(`[CONFIG] Umbral de bienvenida: 10 personas. Actual: ${this.pendingWelcomeCount}`);
      this.startTime = Date.now();
    });

    this.client.on('disconnected', (reason: string) => {
      console.log('⚠️ JanIA se ha desconectado. Razón:', reason);
    });

    this.client.on('group_join', async (notification: any) => {
      if (notification.chatId !== this.targetGroupId) return;

      // Algunos eventos de join pueden traer múltiples IDs en recipientIds
      const joinedCount = notification.recipientIds?.length || 1;
      this.pendingWelcomeCount += joinedCount;
      
      console.log(`[INFO] Nuevo(s) integrante(s) detectado(s) (${joinedCount}). Total pendientes: ${this.pendingWelcomeCount}`);
      this.saveCounter();

      if (this.pendingWelcomeCount >= 10) {
        await this.sendBatchWelcome();
      }
    });

    this.client.on('message_create', async (msg: Message) => {
      if (msg.fromMe) return;
      if (msg.timestamp * 1000 < this.startTime) return;

      try {
        const chat = await msg.getChat();
        const isGroup = chat.isGroup;
        const chatId = chat.id._serialized;
        const isTargetGroup = chatId === this.targetGroupId;

        const text = msg.body.toLowerCase();

        // Comandos administrativos solo en el grupo objetivo
        if (isTargetGroup && (
          text.includes('jania normas') ||
          text.includes('jania preséntate') ||
          text.includes('jania anuncia') ||
          text.includes('jania dipava')
        )) {
          await this.handleMessageImmediate(msg);
          return;
        }

        // Procesar mensajes si es el grupo objetivo O si es un chat privado (DM)
        if (isTargetGroup || !isGroup) {
          const hasMedia = msg.hasMedia;
          await this.enqueueMessage(msg, hasMedia, chatId);
        }
      } catch (e) {
        console.error('Error en receptor:', e);
      }
    });
  }

  private async sendBatchWelcome() {
    if (this.pendingWelcomeCount === 0) return;
    
    console.log(`[ACTION] Generando y enviando bienvenida dinámica para ${this.pendingWelcomeCount} integrantes.`);
    
    const count = this.pendingWelcomeCount;
    this.pendingWelcomeCount = 0;
    this.saveCounter();

    try {
      const dynamicWelcome = await generateWelcomeMessage(count);
      await this.client.sendMessage(this.targetGroupId, dynamicWelcome);
      setTimeout(() => this.sendGroupRules(), 4000);
    } catch (e) {
      console.error('Error enviando bienvenida dinámica:', e);
    }
  }

  private async enqueueMessage(msg: Message, hasMedia: boolean, chatId: string) {
    const senderId = (msg as any).author || msg.from;

    // ✅ REGLA 3: Máximo 3 enlaces por publicación
    const urlsFound = msg.body.match(/https?:\/\/[^\s]+/g) || [];
    if (urlsFound.length > 3) {
      const contact = await msg.getContact();
      const userName = contact.pushname || contact.name || contact.number || "Colega";
      const pushback =
        `¡Hola, ${userName}! 🧐\n\n` +
        `Detecté *${urlsFound.length} enlaces* en tu mensaje. Para que mi motor de matching funcione con máxima precisión y no se pierda ningún inmueble, necesito que los publiques de *máximo 3 en 3*.\n\n` +
        `📋 *Lo ideal:*\n` +
        `▸ Publica hasta 3 enlaces por mensaje\n` +
        `▸ Espera *5 a 10 minutos* entre cada grupo mientras proceso los anteriores\n` +
        `▸ Así garantizo que cada inmueble quede correctamente registrado en el sistema\n\n` +
        `¡Gracias por tu colaboración! Entre más ordenado el proceso, más rápido encuentro los matches. 🏆`;
      await this.client.sendMessage(senderId, pushback);
      return;
    }

    const contact = await msg.getContact();
    const phoneNumber = senderId.split('@')[0];
    const userName = contact.pushname || contact.name || contact.number || phoneNumber;
    console.log(`[DEBUG-CONTACT] ID: ${senderId} | pushname: "${contact.pushname}" | name: "${contact.name}" | number: "${contact.number}" → userName: "${userName}"`);

    // Usamos una combinación de senderId y chatId para evitar colisiones si alguien escribe en grupo y DM a la vez
    const bufferKey = `${chatId}_${senderId}`;
    const buffer = this.messageBuffers.get(bufferKey);
    
    if (buffer) {
      clearTimeout(buffer.timer);
      buffer.messages.push(msg.body);
      if (hasMedia) buffer.hasMedia = true;
      buffer.timer = setTimeout(() => this.processBuffer(bufferKey), 15000);
    } else {
      this.messageBuffers.set(bufferKey, {
        messages: [msg.body],
        userName,
        hasMedia,
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
    const chatId = buffer.chatId;
    const senderId = bufferKey.split('_')[1];
    this.messageBuffers.delete(bufferKey);

    try {
      // 1. Log incoming message
      await this.logToDb(senderId, 'user', fullText);

      // 2. SCRAPING PREVIO: Extraer datos técnicos antes de hablar con JanIA
      const urlMatch = fullText.match(/https?:\/\/[^\s]+/g);
      const scrapedResults: any[] = [];
      if (urlMatch) {
        const linksToProcess = urlMatch.slice(0, 3);
        for (const url of linksToProcess) {
          if (esDominioPermitido(url)) {
            try {
              console.log(`[WHATSAPP-BOT] Scrapeando link previo: ${url}`);
              const data = await scrapePropertyLink(url);
              if (data) scrapedResults.push(data);
            } catch (err) {
              console.error(`[WHATSAPP-BOT] Fallo en scrapeo previo de ${url}:`, err);
            }
          }
        }
      }

      // 3. VERIFICAR SI ES UNA RESPUESTA A UN PENDIENTE (DM de seguimiento)
      const isDM = !chatId.includes('@g.us');
      const pending = isDM ? this.pendingData.get(senderId) : null;

      if (pending && Date.now() < pending.expiresAt) {
        // El usuario responde por DM con los datos que le faltaban
        console.log(`[PENDING] Procesando respuesta de seguimiento de ${senderId}`);
        const combinedText =
          `[CONTEXTO — publicación original del usuario en el grupo]: "${pending.originalText}"
[RESPUESTA DEL USUARIO con datos faltantes]: "${fullText}"

Con esta información combinada, extrae y completa todos los campos posibles.`;

        this.pendingData.delete(senderId);
        const followUpResult = await processWhatsAppMessage(combinedText, senderId, userName, false, []);

        if (followUpResult.classification === 'INMUEBLE' || followUpResult.classification === 'REQUERIMIENTO') {
          const type = followUpResult.classification === 'INMUEBLE' ? 'inmueble' : 'requerimiento';
          const confirmMsg =
            `¡Perfecto, ${userName}! ✅

Ya completé el registro de tu *${type}* con los datos que me enviaste. Todo quedó guardado correctamente en mi sistema.

Seguiré monitoreando 24/7 y te aviso al instante si hay un match. 🎯✨`;
          await this.client.sendMessage(senderId, confirmMsg);
          await this.logToDb(senderId, 'janIA', `[DM-FOLLOWUP-OK] ${confirmMsg}`);
        } else if (followUpResult.classification === 'DATOS_INCOMPLETOS') {
          // Aún faltan datos, preguntar de nuevo
          const stillMissing = (followUpResult.missingFields || []).map((q, i) => `${i + 1}. ${q}`).join('\n');
          const retryMsg =
            `🧠 Casi listo, ${userName}. Me falta un poco más de información para completar el registro:

${stillMissing}

¿Me puedes responder con esos datos? 🙏`;
          await this.client.sendMessage(senderId, retryMsg);
          // Actualizar el pendiente con lo nuevo que se pudo extraer
          this.pendingData.set(senderId, {
            originalText: pending.originalText,
            extractedData: followUpResult.extractedData || pending.extractedData,
            classification: pending.classification,
            missingFields: followUpResult.missingFields || [],
            expiresAt: Date.now() + 2 * 60 * 60 * 1000
          });
          await this.logToDb(senderId, 'janIA', `[DM-FOLLOWUP-RETRY] ${retryMsg}`);
        }
        return; // No procesar como mensaje nuevo
      }

      // 4. PROCESAMIENTO NORMAL: Pasamos los datos del scraper a JanIA
      const result = await processWhatsAppMessage(fullText, senderId, userName, hasMedia, scrapedResults);

      if (result) {
        const adrianaId = '4900725465196@lid';
        let senderNumber = senderId.split('@')[0];
        
        // Intentar obtener número limpio para mención
        try {
          const contact = await this.client.getContactById(senderId);
          if (contact?.id?.user) senderNumber = contact.id.user;
        } catch (e) {}

        const isGroup = chatId.includes('@g.us');
        const isMatch = result.response.includes("MATCH DETECTADO");
        const isConsultation = 
          result.classification === "CONSULTA_GENERAL" ||
          result.classification === "RESPUESTA_A_PREGUNTA_IA";

        // LÓGICA DE SILENCIO TOTAL: Solo hablamos en grupo si es Match o Consulta
        const shouldBroadcast = !isGroup || isMatch || isConsultation;

        if (shouldBroadcast && result.response.trim() !== "") {
          const matchedUsers = Array.from(new Set(result.mentions || []));
          const specificMentionsIds = Array.from(new Set([senderId, adrianaId, ...matchedUsers]));

          // En grupos, si es consulta, saludamos
          let finalResponse = result.response;
          if (isGroup && isConsultation) {
            finalResponse = `¡Hola, @${senderNumber}! ${result.response}`;
          }

          await this.client.sendMessage(chatId, finalResponse, {
            mentions: isGroup ? specificMentionsIds : []
          });
          
          await this.logToDb(senderId, 'janIA', finalResponse);
        } else if (result.classification === "INMUEBLE" || result.classification === "REQUERIMIENTO") {
          // 5. CONFIRMACIÓN PRIVADA (ÉXITO SIN MATCH)
          // Si JanIA guardó algo pero no hubo match (silencio en grupo), avisamos por DM para paz mental.
          try {
            const type = result.classification === "INMUEBLE" ? "tu inmueble" : "tu búsqueda";
            const successMsg = `¡Hola, ${userName}! 🧐 He registrado exitosamente ${type} en mi cerebro logístico. Por ahora no he encontrado un match inmediato en el grupo, pero seguiré monitoreando 24/7. ¡Te avisaré en cuanto haya negocio! 🚀✨`;
            await this.client.sendMessage(senderId, successMsg);
            await this.logToDb(senderId, 'janIA', `[DM-SUCCESS] ${successMsg}`);
          } catch (e) {}
        }

        // 5. DM PROACTIVO para datos faltantes (siempre al privado del usuario)
        if (result.shouldSendDM && !isMatch) {
          try {
            // Extracto de la publicación original para que el usuario sepa a qué se refiere JanIA
            const snippet = fullText.length > 120
              ? fullText.substring(0, 120).trim() + '...'
              : fullText.trim();

            const missingList = (result.missingFields || []).map((q, i) => `${i + 1}. ${q}`).join('\n');

            const dmMsg =
              `🧠 *Hola, ${userName}!*

Recibí tu publicación en el grupo y la estoy procesando, pero me faltan algunos datos para poder registrarla correctamente y encontrar el match perfecto. 🎯

` +
              `📌 *Tu publicación:*
_"${snippet}"_

` +
              `📋 *Necesito que me respondas AQUÍ (en este chat privado) con lo siguiente:*
${missingList}

` +
              `Responde directamente a este mensaje y yo me encargo de completar y subir todo a la base de datos. ¡Gracias! 🙏✨`;

            await this.client.sendMessage(senderId, dmMsg);
            await this.logToDb(senderId, 'janIA', `[DM-NUDGE] ${dmMsg}`);

            // Guardar estado pendiente para procesar la respuesta cuando el usuario conteste
            if (isGroup) {
              this.pendingData.set(senderId, {
                originalText: fullText,
                extractedData: result.extractedData || {},
                classification: result.classification,
                missingFields: result.missingFields || [],
                expiresAt: Date.now() + 2 * 60 * 60 * 1000 // expira en 2 horas
              });
              console.log(`[PENDING] Guardado estado pendiente para ${senderId}. Expira en 2h.`);
            }
          } catch (dmError) {
            console.error(`Error enviando DM a ${senderId}:`, dmError);
          }
        }
      }
    } catch (e) {
      console.error('[WHATSAPP-BOT] Error crítico:', e);
    }
  }

  private async handleMessageImmediate(msg: Message) {
    const chat = await msg.getChat();
    const senderId = (msg as any).author || msg.from;

    const participant = (chat as any).participants?.find((p: any) => p.id._serialized === senderId);
    const isAdmin = participant?.isAdmin || participant?.isSuperAdmin || msg.fromMe;

    const text = msg.body.toLowerCase();

    if (text.includes('jania normas')) {
      if (isAdmin) {
        await this.sendGroupRules();
      } else {
        await this.client.sendMessage(this.targetGroupId, "¡Hola colega! 🧐 Solo los administradores pueden pedirme que publique las normas generales para no saturar el grupo. Pero si tienes dudas, ¡pregúntame lo que quieras! ✨");
      }
    } else if (text.includes('jania preséntate')) {
      if (isAdmin) {
        await this.sendPresentacion();
        setTimeout(() => this.sendNormas(), 4000);
      }
    } else if (text.includes('jania anuncia')) {
      if (isAdmin) {
        await this.sendAnuncioComision();
      } else {
        await this.client.sendMessage(this.targetGroupId, "Solo los administradores pueden pedirme que publique anuncios oficiales. 🙏");
      }
    } else if (text.includes('jania dipava')) {
      if (isAdmin) {
        await this.sendApologyDeLaPava();
      }
    }
  }


  // ─── DISCULPA + REGISTRO MANUAL: De La Pava Group ─────────────────────────
  public async sendApologyDeLaPava() {
    const deLaPavaId = '105188731928753@lid';

    // 1. DISCULPA PÚBLICA en el grupo
    const groupApology =
      `🙏 *Querido grupo VECY — necesito pedirles disculpas.*\n\n` +
      `El formato que compartí para publicar *REQUERIMIENTOS* estaba incompleto desde el principio: le faltaba la línea *"Tipo de Negocio"*, que es clave para el matching. El error fue mío y lo asumo con total responsabilidad. Ya está corregido.\n\n` +
      `📋 *El formato correcto para REQUERIMIENTOS ahora es:*\n\n` +
      `*BUSCO:* [tipo de inmueble]\n` +
      `*Tipo de Negocio:* [Compra / Arriendo / Permuta] ← *esta línea faltaba*\n` +
      `📍 *Zona deseada:* [ciudad → localidad → barrio/sector exacto]\n` +
      `💰 *Presupuesto máximo:* [valor en pesos]\n` +
      `📐 *Área mínima:* [m²]\n` +
      `🛏️ *Hab / Baños / Garajes:* [números mínimos]\n` +
      `📝 *Descripción:* [características]\n` +
      `⏰ *Urgencia:* [timeframe]\n\n` +
      `Me he comunicado directamente con De La Pava Group por el inconveniente. ¡Gracias a todos por la paciencia! 🇨🇴🏆\n*— JanIA, VECY Network*`;

    try {
      await this.client.sendMessage(this.targetGroupId, groupApology);
      console.log('✅ Disculpa pública enviada al grupo.');
    } catch (e) {
      console.error('[GROUP] Error enviando disculpa pública:', e);
    }

    await new Promise(r => setTimeout(r, 3000));

    // 2. Guardar el requerimiento en la base de datos
    try {
      const { processWhatsAppMessage } = await import('./janIA');
      const reqText = `BUSCO: Casa Campestre
Tipo de Negocio: Compra
Zona deseada: Guaymaral, Suba, Bogotá
Presupuesto máximo: 7000000000
Área mínima: 250
Habitaciones mínimas: 3
Baños mínimos: 4
Garajes: 3
Descripción: Casa campestre, 3 o 4 habitaciones más cuarto de servicio, 4 o 5 baños, 3 parqueaderos. Antigüedad máxima 15 años.
Urgencia: 1 a 3 meses`;
      await processWhatsAppMessage(reqText, deLaPavaId, 'De La Pava Group Inmobiliario', false, []);
      console.log('[MANUAL] Requerimiento De La Pava guardado.');
    } catch (e) {
      console.error('[MANUAL] Error guardando requerimiento De La Pava:', e);
    }

    // 3. DM PERSONAL a De La Pava
    const dmMsg =
      `🙏 *Mis más sinceras disculpas, De La Pava Group Inmobiliario.*\n\n` +
      `El error fue mío desde el principio: el formato que compartí en el grupo para requerimientos estaba *incompleto* — le faltaba la línea "Tipo de Negocio". Eso generó toda la confusión. Su publicación estaba perfectamente bien.\n\n` +
      `Ya registré su requerimiento correctamente en la base de datos. Así quedó organizado:\n\n` +
      `―――――――――――――――――――――――\n` +
      `🔍 *BUSCO:* Casa Campestre\n` +
      `*Tipo de Negocio:* Compra\n` +
      `📍 *Zona deseada:* Bogotá → Suba → Guaymaral (Lagos de Torca / Hda. San Simón - San Sebastián)\n` +
      `💰 *Presupuesto máximo:* $7.000.000.000\n` +
      `📐 *Área mínima:* 250 m²\n` +
      `🛏️ *Hab / Baños / Garajes:* Mín. 3 hab + cuarto servicio / 4-5 baños / 3 garajes\n` +
      `📝 *Descripción:* Casa campestre, 3-4 habitaciones más cuarto de servicio, 4-5 baños, 3 parqueaderos. Antigüedad máxima 15 años.\n` +
      `⏰ *Urgencia:* 1 a 3 meses\n` +
      `―――――――――――――――――――――――\n\n` +
      `Estaré monitoreando 24/7 y le aviso al instante cuando haya match. ¡Gracias por su paciencia y confianza! 🎯✨\n\n` +
      `*— JanIA, VECY Network*`;

    try {
      await this.client.sendMessage(deLaPavaId, dmMsg);
      console.log('✅ DM de disculpa enviado a De La Pava Group.');
    } catch (e) {
      console.error('[DM] Error enviando disculpa a De La Pava:', e);
    }
  }

  // ─── ANUNCIO OFICIAL: Comisiones y etapa de prueba ──────────────────────────
  public async sendAnuncioComision() {
    const msg =
      `👋 *¡Hola a todos!*

` +
      `Quiero hacer dos aclaraciones importantes antes de continuar:

` +
      `*1️⃣ Sobre mis ajustes actuales:*
` +
      `Me encuentro en plena etapa de implementación. Es posible que encuentren algunas respuestas imprecisas o comportamientos inesperados de mi parte. Les pido paciencia — cada interacción me ayuda a aprender y mejorar. Si algo no funciona como esperan, escíbanme directamente por chat privado y lo resolvemos.

` +
      `*2️⃣ Sobre comisiones por los MATCH:*
` +
      `*Durante esta etapa de prueba, VECY no cobrará ninguna comisión* por los matches generados ni por los cierres que realicen. Las comisiones del negocio se dividen únicamente entre las partes que cierran el trato, según lo que pacten entre ustedes.

` +
      `Es posible que más adelante se anuncien planes y tarifas para acceder a funciones premium. Cuando eso ocurra, serán informados con suficiente tiempo de anticipación.

` +
      `Por ahora, ¡sigan disfrutando de esta herramienta y cerrando negocios! 🎯🏆
` +
      `— *JanIA, VECY Network*`;
    try {
      await this.client.sendMessage(this.targetGroupId, msg);
      console.log('✅ Anuncio de comisiones enviado al grupo.');
    } catch (e) { console.error('[BROADCAST] Error enviando anuncio comisiones:', e); }
  }

  // ─── MENSAJE 1: Presentación / Bienvenida diaria ────────────────────────────
  public async sendPresentacion() {
    const msg = `✨ *¡Bienvenidos a VECY Inmuebles Network!*

Hola a todos 👋 Soy *JanIA*, la Inteligencia Artificial oficial de *VECY Network*, diseñada exclusivamente para el sector inmobiliario de alto nivel.

Trabajo *las 24 horas, los 7 días de la semana* dentro de este grupo. Cada mensaje que llega aquí lo leo, lo analizo y lo proceso en tiempo real.

🧠 *¿Qué hago exactamente?*
▸ Identifico si lo que publicas es un inmueble o un requerimiento
▸ Extraigo automáticamente todos los datos relevantes
▸ Cruzo ofertas con demandas de forma inteligente
▸ Cuando hay un *MATCH PERFECTO*, notifico a ambas partes al instante

🎯 *Mi propósito:* que ninguna oportunidad de negocio se pierda en este grupo. Cero esfuerzo para ustedes. Máximos resultados.

_Para que mi sistema funcione al 100%, por favor lean el mensaje de normas y formatos que sigue a continuación. Es breve, claro y cambiará la forma en que cierran negocios._ 🏆`;
    try {
      await this.client.sendMessage(this.targetGroupId, msg);
      console.log('✅ Mensaje 1 (Presentación) enviado.');
    } catch (e) { console.error('[BROADCAST] Error enviando presentación:', e); }
  }

  // ─── MENSAJE 2: Normas y Formatos completos ──────────────────────────────────
  public async sendNormas() {
    const msg = `─────────────────────────────

📋 *NORMAS Y FORMATOS OFICIALES — VECY NETWORK*
_Por favor léelo completo. Aplica desde ya._
━━━━━━━━━━━━━━━━━━━━━━

🏠 *FORMATO 1 — PUBLICAR UN INMUEBLE*
_Úsalo cuando ofreces o tienes disponible un inmueble_

*OFREZCO:* [tipo: Apartamento / Casa / Lote / Bodega / Local / Oficina / Finca / Consultorio]
*Tipo de Negocio:* [Venta / Arriendo / Permuta]
📍 *Zona:* [ciudad → localidad → barrio exacto]
💰 *Precio:* [valor en pesos colombianos]
📐 *Área:* [m² construidos]
🛏️ *Hab / Baños / Garajes:* [números]
🏗️ *Estrato:* [número]
📝 *Descripción:* [detalles clave: antigüedad, piso, interior/exterior, terraza, estado, etc.]
🔗 *Link:* [URL del portal o tu sitio web — si tienes]

_Ejemplo:_
OFREZCO: Apartamento
Tipo de Negocio: Venta
📍 Bogotá → Usaquén → Cedritos
💰 $480.000.000
📐 85 m² | 🛏️ 3 hab / 2 baños / 1 garaje
🏗️ Estrato 4 | Piso 6 | Exterior | 8 años
📝 Remodelado, cocina integral, conjunto cerrado, piscina
━━━━━━━━━━━━━━━━━━━━━━

🔍 *FORMATO 2 — PUBLICAR UN REQUERIMIENTO*
_Úsalo cuando un cliente tuyo está buscando inmueble_

*BUSCO:* [tipo de inmueble]
*Tipo de Negocio:* [Compra / Arriendo / Permuta]
📍 *Zona deseada:* [ciudad → localidad → barrio o sector exacto]
💰 *Presupuesto máximo:* [valor en pesos]
📐 *Área mínima:* [m²]
🛏️ *Hab / Baños / Garajes:* [números mínimos requeridos]
📝 *Descripción:* [características importantes para el cliente]
⏰ *Urgencia:* [inmediato / este mes / próximas semanas]

_Ejemplo:_
BUSCO: Apartamento
Tipo de Negocio: Compra
📍 Bogotá → Suba → Niza o Alhambra
💰 Presupuesto máximo: $350.000.000
📐 Mínimo 70 m² | 🛏️ 3 hab / 2 baños / 1 garaje
📝 Exterior, piso alto, conjunto cerrado, para familia con niños
⏰ Urgencia: este mes
━━━━━━━━━━━━━━━━━━━━━━

✅ *LINKS QUE PUEDO LEER AUTOMÁTICAMENTE*
Puedo extraer todos los datos directamente desde:
▸ Wasi · Qrador · Habi · FincaRaíz · MetroCuadrado
▸ Proppit · Ciencuadras · MercadoLibre Inmuebles
▸ *Tu propio sitio web* (.com / .co / .netlify / .vercel / cualquier URL)

❌ *LINKS QUE NO PUEDO LEER*
▸ Facebook · Instagram · TikTok · YouTube
▸ Catálogos de WhatsApp Business

📸 *FOTOS Y VIDEOS DIRECTOS AL GRUPO: NO*
Las imágenes directas saturan el grupo y no aportan datos procesables.
Si tienes fotos, súbelas a un portal o tu web y comparte el link.
━━━━━━━━━━━━━━━━━━━━━━

⚠️ *REGLAS DEL GRUPO*
✅ Solo contenido inmobiliario profesional y de valor
✅ Un mensaje por inmueble o requerimiento (máx. 3 links por mensaje)
✅ Entre más completa sea la información, más rápido encuentro el match
✅ Si me faltan datos, te escribo al chat privado para completarlos
❌ No publicidad de otros sectores
❌ No cadenas, memes ni contenido ajeno al negocio

💡 *¿Por qué el formato importa tanto?*
Mi motor de matching funciona comparando campo por campo: barrio exacto, tipo exacto, habitaciones exactas. Un dato vago como Una zona vaga no permite cruce preciso. Una zona exacta sí lo hace. 🎯

_¡Juntos hacemos que la tecnología trabaje para nosotros!_ 🇨🇴🏆
*— JanIA, VECY Network*`;
    try {
      await this.client.sendMessage(this.targetGroupId, msg);
      console.log('✅ Mensaje 2 (Normas) enviado.');
    } catch (e) { console.error('[BROADCAST] Error enviando normas:', e); }
  }

  // ─── MENSAJE 3: Recordatorio rápido (cada 2 horas) ───────────────────────────
  public async sendRecordatorio() {
    const msg = `─────────────────────────────

📌 *RECORDATORIO RÁPIDO — Formatos VECY*

Para que encuentre el match perfecto al instante, recuerda usar la zona *exacta* al publicar:

✅ *Correcto:* "Bogotá → Usaquén → *Cedritos*"
❌ *Incorrecto:* "norte de Bogotá" o solo "Usaquén"

El barrio exacto es la diferencia entre un match real y un falso positivo. Yo proceso cada publicación en segundos — entre más preciso seas, más rápido trabajo. 🎯

_¿Dudas sobre el formato? Escríbeme directo y te guío._ ✨`;
    try {
      await this.client.sendMessage(this.targetGroupId, msg);
      console.log('✅ Mensaje 3 (Recordatorio) enviado.');
    } catch (e) { console.error('[BROADCAST] Error enviando recordatorio:', e); }
  }

  // Alias para compatibilidad con el comando admin 'jania normas'
  public async sendGroupRules() { await this.sendNormas(); }
  public async sendGrandIntroduction() { await this.sendPresentacion(); }

  public initialize() {
    console.log('[WHATSAPP-BOT] Ejecutando initialize()... (esto puede tardar unos segundos)');
    this.client.initialize();
  }
}

export const whatsappBot = new WhatsAppBot();
