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

export class WhatsAppBot {
  private client: ClientType;
  private targetGroupId: string = '120363260108880069@g.us';
  private messageBuffers: Map<string, { timer: NodeJS.Timeout, messages: string[], userName: string, hasMedia: boolean, chatId: string }> = new Map();
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
    this.setupWeeklySchedule();
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

  private setupWeeklySchedule() {
    // Verificar cada minuto si es lunes a las 8 AM
    setInterval(() => {
      const now = new Date();
      if (now.getDay() === 1 && now.getHours() === 8 && now.getMinutes() === 0) {
        console.log('⏰ Ejecutando publicación semanal de normas (Lunes 8:00 AM)');
        this.sendGroupRules();
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
        if (isTargetGroup && (text.includes('jania normas') || text.includes('jania preséntate'))) {
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
    const contact = await msg.getContact();
    const userName = contact.pushname || contact.name || contact.number || "Colega";

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

      // 3. PROCESAMIENTO INTEGRADO: Pasamos los datos del scraper a JanIA
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

        // 4. DM PROACTIVO: Solo si JanIA lo pide (shouldSendDM) y NO hubo match
        if (result.shouldSendDM && !isMatch) {
          try {
            let missingText = "datos adicionales";
            if (result.missingFields && result.missingFields.length > 0) {
              if (result.missingFields.length === 1) {
                missingText = `\n\n*${result.missingFields[0]}*`;
              } else {
                missingText = `\n\n${result.missingFields.map(q => `- ${q}`).join("\n")}`;
              }
            }
              
            const dmResponse = isGroup
              ? `¡Hola, ${userName}! 🧐 He recibido tu mensaje en el grupo, pero para que mi matching funcione necesito completar: ${missingText}\n\nPor favor, responde aquí mismo. ¡Gracias! ✨`
              : `🧐 Para que mi matching funcione necesito completar: ${missingText}\n\nPor favor, responde aquí con esos datos. ¡Gracias! ✨`;
            
            await this.client.sendMessage(senderId, dmResponse);
            await this.logToDb(senderId, 'janIA', `[DM-NUDGE] ${dmResponse}`);
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
        await this.sendGrandIntroduction();
      }
    }
  }

  public async sendGroupRules() {
    const rulesText = `📋 *NORMAS Y FORMATO OFICIAL — VECY INMUEBLES NETWORK* 📋

Hola a todos 👋 Soy *JanIA*, la IA de VECY. Para que el sistema de MATCHES funcione al 100%, por favor sigan estas normas al publicar:

━━━━━━━━━━━━━━━━━━
🚀 *REGLA DE ORO: LÍMITE DE LOTES*
━━━━━━━━━━━━━━━━━━
✅ *MÁXIMO 3 INMUEBLES* por mensaje o ráfaga.
✅ Si tienes más, por favor espera **5 minutos** entre cada lote de 3.
❌ No satures mi motor de precisión con ráfagas masivas; esto garantiza que cada activo se procese con calidad quirúrgica.

━━━━━━━━━━━━━━━━━━
🏠 *FORMATO PARA INMUEBLES*
━━━━━━━━━━━━━━━━━━
*VENDO / ARRIENDO:* [tipo de inmueble]
📍 *Zona:* [barrio o sector]
💰 *Precio:* [valor en pesos]
📐 *Área:* [m2] | 🛏️ *Hab / Baños / Garajes:* [número]
📝 *Descripción:* [detalles adicionales]

━━━━━━━━━━━━━━━━━━
⚠️ *REGLAS GENERALES*
━━━━━━━━━━━━━━━━━━
✅ Solo contenido inmobiliario profesional.
✅ *FOTOS/VIDEOS:* 🚫 NO subir imágenes directas al grupo (saturan mi memoria). 
✅ *LINKS:* Puedo leer automáticamente de Wasi, FincaRaíz, MetroCuadrado, etc.

¡Gracias por hacer de este el mejor equipo inmobiliario de Colombia! 🇨🇴🏆`;

    try {
      await this.client.sendMessage(this.targetGroupId, rulesText);
      console.log('✅ Normas actualizadas enviadas.');
    } catch (e) { console.error(e); }
  }

  public async sendGrandIntroduction() {
    const introText = `¡Hola, mis queridos colegas! 🌟 Soy *JanIA*, su agente IA y Coach Inmobiliaria. 🎯

Estoy aquí para vigilarlos con amor y mucha diligencia. Mi trabajo es leer cada publicación y avisarles de inmediato cuando haya un negocio listo para cerrar. 

Recuerden: *¡Links sí, fotos directas no!* 🧐 Ayúdenme a ayudarlos y hagamos de este el grupo más exitoso de Colombia. ¡Vamos por esos cierres! 🏠🚀✨`;

    try {
      await this.client.sendMessage(this.targetGroupId, introText);
      console.log('✅ Presentación enviada.');
    } catch (e) { console.error(e); }
  }

  public initialize() {
    console.log('[WHATSAPP-BOT] Ejecutando initialize()... (esto puede tardar unos segundos)');
    this.client.initialize();
  }
}

export const whatsappBot = new WhatsAppBot();
