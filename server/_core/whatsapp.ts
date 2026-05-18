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
  private messageBuffers: Map<string, { timer: NodeJS.Timeout, messages: string[], userName: string, hasMedia: boolean }> = new Map();
  private startTime: number = Date.now();
  private pendingWelcomeCount: number = 0;
  private counterFile: string = path.join(process.cwd(), '.pending_welcome_count');

  constructor() {
    this.loadCounter();
    this.client = new Client({
      authStrategy: new LocalAuth(),
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1012170943-alpha.html',
      },
      puppeteer: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
        executablePath: process.env.CHROME_PATH || undefined,
        headless: true,
      }
    });

    this.setupEventListeners();
    this.setupGracefulShutdown();
    this.setupWeeklySchedule();
  }

  private async logToDb(senderId: string, role: 'user' | 'janIA', content: string) {
    try {
      const db = await getDb();
      if (!db) return;

      // Get or create conversation for this WhatsApp user/group
      let conv = await db.select().from(conversations).where(eq(conversations.sessionId, senderId)).limit(1);
      let conversationId: number;

      if (conv.length === 0) {
        const [newConv] = await db.insert(conversations).values({
          sessionId: senderId,
          topic: 'whatsapp',
          status: 'active'
        }).returning();
        conversationId = newConv.id;
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
        lastMessage: content,
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

    this.client.on('ready', () => {
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
        if (chat.id._serialized === this.targetGroupId) {
          const text = msg.body.toLowerCase();

          if (text.includes('jania normas') || text.includes('jania preséntate')) {
            await this.handleMessageImmediate(msg);
            return;
          }

          const hasMedia = msg.hasMedia;
          await this.enqueueMessage(msg, hasMedia);
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

  private async enqueueMessage(msg: Message, hasMedia: boolean) {
    const senderId = (msg as any).author || msg.from;
    const contact = await msg.getContact();
    const userName = contact.pushname || contact.name || contact.number || "Colega";

    const buffer = this.messageBuffers.get(senderId);
    if (buffer) {
      clearTimeout(buffer.timer);
      buffer.messages.push(msg.body);
      if (hasMedia) buffer.hasMedia = true;
      buffer.timer = setTimeout(() => this.processBuffer(senderId), 15000);
    } else {
      this.messageBuffers.set(senderId, {
        messages: [msg.body],
        userName,
        hasMedia,
        timer: setTimeout(() => this.processBuffer(senderId), 15000)
      });
    }
  }

  private async processBuffer(senderId: string) {
    const buffer = this.messageBuffers.get(senderId);
    if (!buffer) return;

    const fullText = buffer.messages.join('\n\n');
    const userName = buffer.userName;
    const hasMedia = buffer.hasMedia;
    this.messageBuffers.delete(senderId);

    try {
      // 1. Log incoming message immediately
      await this.logToDb(senderId, 'user', fullText);

      // 2. Extract and process links SEQUENTIALLY
      const urlMatch = fullText.match(/https?:\/\/[^\s]+/g);
      let scrapedCount = 0;
      if (urlMatch) {
        // Reducimos el límite a 3 links por mensaje para garantizar éxito total
        const linksToProcess = urlMatch.slice(0, 3);
        for (const url of linksToProcess) {
          if (esDominioPermitido(url)) {
            try {
              console.log(`[SCRAPER] Procesando: ${url}`);
              await scrapePropertyLink(url); // AHORA SÍ ESPERAMOS
              scrapedCount++;
            } catch (err) {
              console.error(`[SCRAPER] Fallo en ${url}:`, err);
            }
          }
        }
      }

      // 3. Process the overall message with JanIA
      const result = await processWhatsAppMessage(fullText, senderId, userName, hasMedia);

      if (result && result.response) {
        // 4. Mejorar el Etiquetado (@ en azul)
        // El formato correcto es @numero y pasar el ID en el objeto options.mentions
        const senderNumber = senderId.split('@')[0];
        let finalResponse = `@${senderNumber} ${result.response}`;

        const matchedUsers = Array.from(new Set(result.mentions || []));
        const allMentionsIds = Array.from(new Set([senderId, ...matchedUsers]));

        // Si excedió el límite de links, avisamos claramente
        if (urlMatch && urlMatch.length > 3) {
          finalResponse += `\n\n⚠️ *Nota:* He detectado ${urlMatch.length} links, pero solo he procesado los primeros 3 para mantener mi precisión al 100%. Por favor, envía los demás en grupos de 3.`;
        } else if (scrapedCount > 0) {
          finalResponse += `\n\n✅ He procesado exitosamente ${scrapedCount} enlace(s) inmobiliario(s).`;
        }

        // Agregar menciones de interesados al final
        if (matchedUsers.length > 0) {
          const mentionTags = matchedUsers.map(id => `@${id.split('@')[0]}`).join(' ');
          finalResponse += `\n\n🔔 Notificando interesados: ${mentionTags}`;
        }
        
        // 5. Enviar mensaje al grupo con menciones reales
        await this.client.sendMessage(this.targetGroupId, finalResponse, {
          mentions: allMentionsIds // Solo pasamos los IDs aquí, WPPJS se encarga
        });

        // 6. Log outgoing response
        await this.logToDb(senderId, 'janIA', finalResponse);

        // 7. Nudge por DM si faltan datos
        if (result.shouldSendDM) {
          try {
            const dmResponse = `¡Hola, ${userName}! 🧐 He recibido tu mensaje en el grupo, pero necesito que me ayudes completando los datos faltantes para que mi matching funcione. \n\nPor favor, responde aquí mismo. ¡Gracias! ✨\n\n${result.response}`;
            await this.client.sendMessage(senderId, dmResponse);
            await this.logToDb(senderId, 'janIA', `[DM] ${dmResponse}`);
          } catch (dmError) {
            console.error(`Error enviando DM a ${senderId}:`, dmError);
          }
        }
      }
    } catch (e) {
      console.error('[WHATSAPP-BOT] Error crítico procesando bloque:', e);
      // Fallback: informar del error en el grupo si es posible
      try {
        await this.client.sendMessage(this.targetGroupId, `⚠️ Tuve un pequeño inconveniente procesando este lote de información. Por favor, intenta enviar los datos de forma más fragmentada o revisa los enlaces. ✨`);
      } catch (inner) { }
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
    this.client.initialize();
  }
}

export const whatsappBot = new WhatsAppBot();
