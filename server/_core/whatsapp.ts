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
  private botId: string | null = null;

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: process.env.CHROME_PATH || undefined,
      }
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.client.on('qr', (qr: string) => {
      console.log('\n--- NUEVO CÓDIGO QR DETECTADO ---');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('authenticated', () => {
      console.log('✅ Sesión de WhatsApp Autenticada!');
    });

    this.client.on('ready', async () => {
      this.botId = this.client.info.wid._serialized;
      console.log('\n✅ ¡JANIA (COACH INMOBILIARIA) ESTÁ LISTA!');
      console.log(`Fijado al grupo: ${this.targetGroupId}\n`);
    });

    this.client.on('message_create', async (msg: Message) => {
      const chatId = msg.to === this.targetGroupId || msg.from === this.targetGroupId ? this.targetGroupId : (msg.fromMe ? msg.to : msg.from);
      if (chatId === this.targetGroupId) {
        await this.handleMessage(msg);
      }
    });
  }

  /**
   * Envía una presentación profesional con video y menciona a todos (@todos)
   */
  public async sendCoachIntroduction() {
    const videoPath = "/home/eduardo/GoogleDrive/EMPRESAS_VECY/VECY BIENES RAÍCES/Inmuebles/CASAS/Polo Club/Videos/casa-polo-club-todos.mp4";
    const introMessage = `¡Hola @todos! 🌟 Soy *JanIA*, su Coach y Super Agente Inmobiliaria de VECY Network. 

No soy un bot común; soy su LÍDER TECNOLÓGICA para que este grupo sea el más eficiente de Colombia. Mi poder es organizar su caos: analizo cada mensaje para encontrar el *MATCH* perfecto que les permita cerrar negocios hoy mismo. 🎯

*Lo que hago por ustedes:*
✅ **Analizo sus Links:** Extraigo datos de cualquier URL inmobiliaria.
✅ **Ubico en el Mapa:** Entiendo barrios y cuadrantes (ej: entre la 100 y 127 con Séptima). 🗺️
✅ **Conecto Puntas:** Si tú buscas lo que otro tiene, ¡los uniré de inmediato!

*Seamos profesionales:* Entre más claros sean (Tipo, Precio, Admón, CBS, etc.), más rápido encontraré su pareja de negocio.

¡Los invito a liderar el mercado juntos! 🏠✨`;

    try {
      const chat = await this.client.getChatById(this.targetGroupId) as any;
      const participants = chat.participants.map((p: any) => p.id._serialized);
      
      const media = MessageMedia.fromFilePath(videoPath);
      await this.client.sendMessage(this.targetGroupId, media, { 
        caption: introMessage,
        mentions: participants 
      });
      console.log('✅ Presentación de Coach enviada.');
    } catch (e) {
      console.error('Error enviando presentación:', e);
    }
  }

  private async handleMessage(msg: Message) {
    if (msg.fromMe && !msg.body.toLowerCase().includes('jania')) return;
    if (msg.fromMe && msg.body.includes('Soy *JanIA*, su Coach')) return;

    if (this.lastMessageProcessed === msg.body && msg.body.length > 0) return;
    this.lastMessageProcessed = msg.body;

    try {
      // Comando de activación (no necesita datos del remitente)
      if (msg.body.toLowerCase().includes('jania, preséntate') || msg.body.toLowerCase().includes('jania preséntate')) {
        await this.sendCoachIntroduction();
        return;
      }

      // Evitamos llamar a getContact() en mensajes enviados por nosotros mismos (fromMe)
      // para evitar el error "Invalid get call using deviceWid" en Multi-Device.
      if (msg.fromMe) return;

      const contact = await msg.getContact();
      const userName = contact.pushname || contact.name || contact.number;
      const userId = msg.from;

      // Scraping de links
      const urlMatch = msg.body.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        msg.reply(`¡Excelente aporte ${userName}! JanIA está analizando este link... 🧐`);
        const data = await scrapePropertyLink(urlMatch[0]);
        await this.client.sendMessage(this.targetGroupId, `✅ *Inmueble Detectado:* ${data.name}\n📍 *Zona:* ${data.zone}\n💰 *Precio:* ${data.price}\n\n¡Guardado! Buscaré un match de inmediato.`, { mentions: [userId] });
        return;
      }

      // Inteligencia de Matchmaking y Coaching
      const result = await processWhatsAppMessage(msg.body, userId, userName);
      if (result && result.response) {
        let mentions: any[] = [userId];
        
        // Si el mensaje incluye @todos, obtener todos los participantes
        if (result.response.includes('@todos')) {
          const chat = await msg.getChat() as any;
          if (chat.isGroup) {
            const participants = chat.participants.map((p: any) => p.id._serialized);
            mentions = [...mentions, ...participants];
          }
        }

        await this.client.sendMessage(this.targetGroupId, result.response, {
          mentions: mentions
        });
      }

    } catch (e) {
      console.error('Error en JanIA Coach:', e);
    }
  }

  public initialize() {
    this.client.initialize();
  }
}

export const whatsappBot = new WhatsAppBot();
