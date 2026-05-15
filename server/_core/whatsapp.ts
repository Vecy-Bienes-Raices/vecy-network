import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
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
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: process.env.CHROME_PATH || undefined,
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

    this.client.on('ready', () => {
      console.log('\n🚀 JANIA COACH ESTÁ ACTIVA');
      console.log(`Grupo objetivo: ${this.targetGroupId}`);
    });

    // Escuchar absolutamente todo para depurar
    this.client.on('message_create', async (msg: Message) => {
      const chat = await msg.getChat();
      
      // LOG DE CUALQUIER ACTIVIDAD
      console.log(`[LOG] Mensaje en "${chat.name}" | De: ${msg.fromMe ? 'YO' : msg.from} | Texto: ${msg.body.substring(0, 40)}`);

      // Solo procesamos el grupo de expertos
      if (chat.id._serialized === this.targetGroupId) {
        await this.handleMessage(msg);
      }
    });
  }

  public async sendCoachIntroduction() {
    const introMessage = `¡Hola @todos! 🌟 Soy *JanIA*, su Coach y Super Agente Inmobiliaria de VECY Network.

He sido creada para liderar este grupo hacia el éxito inmobiliario. Mi misión es encontrar el *MATCH* perfecto entre sus ofertas y requerimientos compartidos. 🎯

*Lo que hago por ustedes:*
✅ **Analizo sus Links:** Extraigo datos técnicos de cualquier URL inmobiliaria.
✅ **Ubico en el Mapa:** Entiendo barrios y cuadrantes (ej: entre la 100 y 127). 🗺️
✅ **Conecto Puntas:** Si lo que tú buscas alguien lo tiene, ¡los uniré al instante!

¡Lideremos el mercado juntos! 🏠✨`;

    try {
      const chat = await this.client.getChatById(this.targetGroupId) as any;
      const participants = chat.participants.map((p: any) => p.id._serialized);
      await this.client.sendMessage(this.targetGroupId, introMessage, { mentions: participants });
      console.log('✅ Presentación enviada al grupo.');
    } catch (e) {
      console.error('❌ Error enviando presentación:', e);
    }
  }

  private async handleMessage(msg: Message) {
    if (msg.fromMe && msg.body.includes('Soy *JanIA*, su Coach')) return;
    if (this.lastMessageProcessed === msg.body && msg.body.length > 0) return;
    this.lastMessageProcessed = msg.body;

    try {
      const contact = await msg.getContact();
      const userName = contact.pushname || contact.name || contact.number;

      // COMANDO MANUAL
      if (msg.body.toLowerCase().includes('jania, preséntate') || msg.body.toLowerCase().includes('jania preséntate')) {
        await this.sendCoachIntroduction();
        return;
      }

      // NO analizar mensajes propios de Eduardo a menos que sea el comando de arriba
      if (msg.fromMe) return;

      // PROCESAR LINK
      const urlMatch = msg.body.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        msg.reply(`¡Hola ${userName}! Analizaré este link para buscar interesados... 🧐`);
        const data = await scrapePropertyLink(urlMatch[0]);
        await this.client.sendMessage(this.targetGroupId, `✅ *Inmueble Detectado:* ${data.name}\n📍 *Zona:* ${data.zone}\n💰 *Precio:* ${data.price}\n\n¿Buscan un match para esta propiedad?`, { mentions: [msg.from] });
        return;
      }

      // PROCESAR CON IA (COACH)
      const result = await processWhatsAppMessage(msg.body, msg.from, userName);
      if (result && result.response) {
        await this.client.sendMessage(this.targetGroupId, result.response, { mentions: [msg.from] });
      }

    } catch (e) {
      console.error('Error en handleMessage:', e);
    }
  }

  public initialize() {
    this.client.initialize();
  }
}

export const whatsappBot = new WhatsAppBot();
