import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import { scrapePropertyLink } from './scraper';
import { processWhatsAppMessage } from './janIA';

export class WhatsAppBot {
  private client: Client;
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
    this.client.on('qr', (qr) => {
      console.log('\n--- NUEVO CÓDIGO QR DETECTADO ---');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('authenticated', () => {
      console.log('✅ Sesión de WhatsApp Autenticada!');
    });

    this.client.on('ready', async () => {
      this.botId = this.client.info.wid._serialized;
      console.log('\n✅ ¡VECY NETWORK WHATSAPP BOT ESTÁ LISTO!');
      console.log(`Bot ID: ${this.botId}`);
      console.log(`Fijado al grupo: ${this.targetGroupId}\n`);

      // ENVIAR PRESENTACIÓN AUTOMÁTICA AL INICIAR (PARA PRUEBA)
      console.log('Intentando enviar presentación automática...');
      await this.sendPresentation();
    });

    // Escuchar TODOS los mensajes para depuración
    this.client.on('message_create', async (msg) => {
      const chatId = msg.to === this.targetGroupId || msg.from === this.targetGroupId ? this.targetGroupId : (msg.fromMe ? msg.to : msg.from);
      
      // LOG VERBOSO PARA DEPURACIÓN
      if (chatId === this.targetGroupId) {
        console.log(`[WhatsApp DEBUG] Mensaje en grupo objetivo | De: ${msg.fromMe ? 'YO' : msg.from} | Texto: ${msg.body.substring(0, 30)}`);
        await this.handleMessage(msg);
      }
    });
  }

  public async sendPresentation() {
    const introMessage = `¡Hola a todos! 🌟 Soy *JanIA*, la Super Agente de VECY Network. He sido creada para ayudarlos a cerrar negocios en tiempo récord mediante el análisis de *MATCHES* inteligentes.

¿Cómo les ayudo? Escaneo sus mensajes las 24/7 y, cuando alguien publica lo que otro busca (Venta, Arriendo o Permuta), los conecto de inmediato. 🎯

*Los invito a probar este sistema gratuito.* Para que mis matches sean 100% exactos, les sugiero incluir estos datos en sus publicaciones:

🏠 *FORMATO PARA OFRECER:*
- *Tipo:* (Apto, Casa, Bodega, etc.)
- *Barrio:*
- *Precio:* + *Admón:*
- *Área:*
- *Hab/Baños/Garajes:*
- *Piso:* (o total niveles)
- *Año:* (Construcción)
- *Detalles:* (Vista, Cocina, Zona Lavandería, Seguridad, Depósito, CBS)

🔍 *FORMATO PARA REQUERIMIENTOS:*
Díganme qué buscan y la zona (ej: "Entre la Calle 100 y 127 con Séptima"), y yo me encargaré de encontrarlo.

¡Un gusto trabajar para ustedes, colegas! 🏠✨`;

    try {
      await this.client.sendMessage(this.targetGroupId, introMessage);
      console.log('✅ ¡PRESENTACIÓN ENVIADA AL GRUPO CORRECTAMENTE!');
    } catch (e) {
      console.error('❌ Error enviando presentación:', e);
    }
  }

  private async handleMessage(msg: any) {
    // 1. Evitar bucle con su propia presentación
    if (msg.fromMe && msg.body.includes('Soy *JanIA*, la Super Agente')) return;

    // 2. Evitar procesar el mismo mensaje repetido
    if (this.lastMessageProcessed === msg.body && msg.body.length > 0) return;
    this.lastMessageProcessed = msg.body;

    try {
      const userId = msg.from;

      // Comando manual
      if (msg.body.toLowerCase().includes('jania, preséntate') || msg.body.toLowerCase().includes('jania preséntate')) {
        await this.sendPresentation();
        return;
      }

      // Procesar link
      if (msg.body.includes('http') && !msg.fromMe) {
        const urlMatch = msg.body.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
          msg.reply('¡Hola! JanIA detectó un link. Analizando detalles...');
          const data = await scrapePropertyLink(urlMatch[0]);
          msg.reply(`✅ Inmueble detectado: ${data.name}\n📍 Zona: ${data.zone}\n💰 Precio: ${data.price}\n\n¿Buscan un match?`);
          return;
        }
      }

      // Solo analizar con IA si NO es de Eduardo (para no gastar tokens en sus propios comandos)
      if (!msg.fromMe) {
        const result = await processWhatsAppMessage(msg.body, userId);
        if (result && result.response) {
          await msg.reply(result.response);
        }
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
