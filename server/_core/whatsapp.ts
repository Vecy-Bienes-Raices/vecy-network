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
          '--disable-dev-shm-usage', // Ayuda con la lentitud/memoria en Linux
          '--disable-gpu',           // Menos consumo de recursos
        ],
        executablePath: process.env.CHROME_PATH || undefined,
        headless: true, // Forzamos modo sin cabeza para que no consuma recursos de pantalla
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
      console.log('\n🚀 JANIA OPERATIVA - SERVIDOR OPTIMIZADO');
      
      try {
        const chat = await this.client.getChatById(this.targetGroupId) as any;
        console.log(`Fijada en: ${chat.name}`);
        if (chat.name !== 'VECY INMUEBLES NETWORK') {
           await chat.setSubject('VECY INMUEBLES NETWORK');
           console.log('✅ Nombre del grupo corregido.');
        }
      } catch (err) {
        console.warn('⚠️ No se pudo verificar/cambiar el nombre del grupo.');
      }
    });

    this.client.on('message_create', async (msg: Message) => {
      try {
        const chat = await msg.getChat();
        
        // Log para ver actividad (Solo grupo objetivo para no saturar terminal)
        if (chat.id._serialized === this.targetGroupId) {
            console.log(`\n[VECY NETWORK] De: ${msg.fromMe ? 'YO' : msg.from} | Texto: ${msg.body.substring(0, 50)}`);
            await this.handleMessage(msg);
        }
      } catch (e) {
        console.error('Error en receptor:', e);
      }
    });
  }

  private async handleMessage(msg: Message, silent: boolean = false) {
    if (msg.fromMe && msg.body.includes('Soy *JanIA*')) return;
    if (this.lastMessageProcessed === msg.body && msg.body.length > 0) return;
    if (!silent) this.lastMessageProcessed = msg.body;

    try {
      let userName = "Colega";
      
      // FIX CRÍTICO: No llamar a getContact() si el mensaje es nuestro (fromMe)
      // porque WhatsApp Web Multi-Device lanza un error fatal.
      if (!msg.fromMe) {
          const contact = await msg.getContact();
          userName = contact.pushname || contact.name || contact.number || "Colega";
      } else {
          userName = "Eduardo";
      }

      // COMANDO PRESÉNTATE
      if (msg.body.toLowerCase().includes('jania preséntate') || msg.body.toLowerCase().includes('jania anuncia') || msg.body.toLowerCase().includes('confirma que estás lista')) {
        if (!silent) {
            const intro = `¡Hola @todos! 🌟 Soy *JanIA*, su Coach Inmobiliaria de VECY. 🎯\n\nConfirmado: ¡Estoy despierta, alerta y lista para trabajar! 🚀\n\nHe analizado el grupo y estoy lista para encontrar MATCHES entre sus ofertas y requerimientos. ¡Empecemos a cerrar negocios! 🏠💼`;
            const chat = await msg.getChat();
            await chat.sendMessage(intro);
        }
        return;
      }

      // SOLO PROCESAR IA PARA MENSAJES DE OTROS (Ahorro de tokens)
      if (!msg.fromMe) {
        const result = await processWhatsAppMessage(msg.body, msg.from, userName);
        if (result && result.response && !silent) {
          await msg.reply(result.response);
        }
      }

    } catch (e) {
      console.error('Error en JanIA Logic:', e);
    }
  }

  public initialize() {
    this.client.initialize();
  }
}

export const whatsappBot = new WhatsAppBot();
