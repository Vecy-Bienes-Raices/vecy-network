import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import type { Client as ClientType, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { scrapePropertyLink } from './scraper';
import { processWhatsAppMessage } from './janIA';

export class WhatsAppBot {
  private client: ClientType;
  private targetGroupId: string = '120363260108880069@g.us';
  private lastMessageProcessed: string = '';

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
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
  }

  private setupEventListeners() {
    this.client.on('qr', (qr: string) => {
      console.log('\n--- NUEVO CÓDIGO QR ---');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('authenticated', () => {
      console.log('✅ WhatsApp Autenticado');
    });

    this.client.on('ready', async () => {
      console.log('\n🚀 JANIA OPERATIVA - SISTEMA DE MATCHES 1000% EFECTIVOS ACTIVADO');
      try {
        const chats = await this.client.getChats();
        const targetChat = chats.find(c => c.name.includes('VECY') || c.name.includes('Expertos Inmobiliarios')) as any;
        if (targetChat) {
            this.targetGroupId = targetChat.id._serialized;
            console.log(`🎯 Grupo Objetivo Confirmado: ${targetChat.name}`);
        }
      } catch (err) {
        console.warn('⚠️ Error al confirmar grupo.');
      }
    });

    this.client.on('message_create', async (msg: Message) => {
      try {
        const chat = await msg.getChat();
        if (chat.id._serialized === this.targetGroupId) {
            await this.handleMessage(msg);
        }
      } catch (e) {
        console.error('Error en receptor:', e);
      }
    });
  }

  /**
   * Envía el mensaje de presentación con menciones reales a todos los miembros
   */
  public async sendGrandIntroduction() {
    const introText = `¡Hola @todos! 🌟 Soy *JanIA*, su agente IA Inmobiliaria de *VECY BIENES RAÍCES*. 🎯\n\nEstoy activa, y he sido entrenada para vigilar múltiples grupos y encontrar MATCHES que les notificaré directamente con el nombre de cada agente y públicamente en el grupo. ¡Publiquen sus inmuebles y requerimientos que yo me encargo del resto! 🏠🚀`;

    try {
      const chat = await this.client.getChatById(this.targetGroupId) as any;
      const participants = chat.participants.map((p: any) => p.id._serialized);
      
      // WhatsApp interpretará @todos si enviamos las menciones técnicas de los participantes
      await this.client.sendMessage(this.targetGroupId, introText, { 
        mentions: participants 
      });
      console.log('✅ Presentación personalizada enviada con éxito.');
    } catch (e) {
      console.error('Error enviando presentación:', e);
    }
  }

  private async handleMessage(msg: Message, silent: boolean = false) {
    if (msg.fromMe && (msg.body.includes('Soy *JanIA*') || msg.body.includes('Soy JanIA'))) return;
    if (this.lastMessageProcessed === msg.body && msg.body.length > 0) return;
    if (!silent) this.lastMessageProcessed = msg.body;

    try {
      let userName = "Colega";
      if (!msg.fromMe) {
          const contact = await msg.getContact();
          userName = contact.pushname || contact.name || contact.number || "Colega";
      } else {
          userName = "Eduardo";
      }

      const text = msg.body.toLowerCase();

      // COMANDO DE PRESENTACIÓN SOLICITADO POR EDUARDO
      if (text.includes('jania preséntate') || text.includes('jania anuncia') || text.includes('confirma que estás lista')) {
        await this.sendGrandIntroduction();
        return;
      }

      if (msg.fromMe) return;

      // 1. Scraping de Links
      const urlMatch = msg.body.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        msg.reply(`🧐 Analizando este link para buscar un MATCH proactivo, ${userName}...`);
        try {
            const data = await scrapePropertyLink(urlMatch[0]);
            // El matching bidireccional ocurre dentro de processWhatsAppMessage
        } catch (e) {
            console.error('Error scraping:', e);
        }
        return;
      }

      // 2. Inteligencia de Match 1000% Efectivo
      const result = await processWhatsAppMessage(msg.body, msg.from, userName);
      
      if (result && result.response && !silent) {
        // Combinar el autor original y los agentes de los matches, sin duplicados
        const allMentions = Array.from(new Set([msg.from, ...(result.mentions || [])]));
        
        await this.client.sendMessage(this.targetGroupId, result.response, { 
          mentions: allMentions 
        });
      }

    } catch (e) {
      console.error('Error en JanIA:', e);
    }
  }

  public initialize() {
    this.client.initialize();
  }
}

export const whatsappBot = new WhatsAppBot();
