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
      console.log('\n🚀 JANIA OPERATIVA - SISTEMA DE MATCHES ACTIVADO');
      
      try {
        const chats = await this.client.getChats();
        // Intentar encontrar el grupo por nombre para asegurar el ID
        const targetChat = chats.find(c => c.name.includes('VECY') || c.name.includes('Expertos Inmobiliarios')) as any;
        if (targetChat) {
            this.targetGroupId = targetChat.id._serialized;
            console.log(`🎯 Grupo Objetivo Confirmado: ${targetChat.name} (${this.targetGroupId})`);
        }
      } catch (err) {
        console.warn('⚠️ Error al confirmar grupo objetivo.');
      }
    });

    this.client.on('message_create', async (msg: Message) => {
      try {
        const chat = await msg.getChat();
        
        // Solo procesar si el mensaje es en el grupo objetivo
        if (chat.id._serialized === this.targetGroupId) {
            console.log(`[VECY] Mensaje detectado: "${msg.body.substring(0, 30)}..."`);
            await this.handleMessage(msg);
        }
      } catch (e) {
        console.error('Error en receptor de mensajes:', e);
      }
    });
  }

  private async handleMessage(msg: Message, silent: boolean = false) {
    // Evitar que el bot se procese a sí mismo
    if (msg.fromMe && msg.body.includes('Soy JanIA')) return;
    
    // Evitar duplicados rápidos
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

      // --- COMANDOS ESPECIALES DE EDUARDO ---
      
      // COMANDO: PRESENTACIÓN PERSONALIZADA
      if (text.includes('jania preséntate') || text.includes('jania anuncia') || text.includes('confirma que estás lista')) {
        console.log('🎯 Ejecutando Gran Presentación...');
        const intro = `¡Hola @todos! 🌟 Soy *JanIA*, su Coach Inmobiliaria de VECY. 🎯\n\nEstoy activa, vigilando múltiples grupos y lista para encontrar MATCHES. ¡Publiquen sus inmuebles y requerimientos que yo me encargo del resto! 🏠🚀`;
        
        const chat = await msg.getChat() as any;
        const participants = chat.participants.map((p: any) => p.id._serialized);
        
        await this.client.sendMessage(this.targetGroupId, intro, { mentions: participants });
        return;
      }

      // NO analizar con IA los mensajes que el propio Eduardo envía (ahorro de tokens)
      if (msg.fromMe) return;

      // --- PROCESAMIENTO AUTOMÁTICO DE OPORTUNIDADES ---

      // 1. Detección de Links
      const urlMatch = msg.body.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        if (!silent) msg.reply(`📍 ${userName}, JanIA está procesando este link para la red VECY...`);
        try {
            await scrapePropertyLink(urlMatch[0]);
            if (!silent) msg.reply(`✅ Inmueble registrado. ¡Buscando interesados!`);
        } catch (e) {
            console.error('Error scraping:', e);
        }
        return;
      }

      // 2. Inteligencia Coach (Análisis de texto y Matches)
      const result = await processWhatsAppMessage(msg.body, msg.from, userName);
      if (result && result.response && !silent) {
        await this.client.sendMessage(this.targetGroupId, result.response, { mentions: [msg.from] });
      }

    } catch (e) {
      console.error('Error en la lógica de JanIA:', e);
    }
  }

  public initialize() {
    this.client.initialize();
  }
}

export const whatsappBot = new WhatsAppBot();
