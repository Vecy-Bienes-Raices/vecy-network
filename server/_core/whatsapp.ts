import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import type { Client as ClientType, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { scrapePropertyLink } from './scraper';
import { processWhatsAppMessage } from './janIA';

export class WhatsAppBot {
  private client: ClientType;
  private targetGroupId: string = '120363260108880069@g.us'; // VECY INMUEBLES NETWORK
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
  this.botId = this.client.info.wid._serialized;
  console.log('\n🚀 JANIA OPERATIVA - INTELIGENCIA MULTI-GRUPO ACTIVADA');
  const chats = await this.client.getChats();

  // Filtro de grupos mejorado
  const keywords = ['VECY', 'Expertos Inmobiliarios', 'Andrés Nieto', 'Brokers Bogotá', 'REQUE', 'Red Inmobiliaria', 'PERMUTA'];
  const blacklist = ['SOLICITUDES VECY AGENDA'];

  const importantChats = chats.filter(c => 
    keywords.some(key => c.name.includes(key)) && 
    !blacklist.some(b => c.name.includes(b))
  );

  console.log('\n--- GRUPOS EN VIGILANCIA ---');
  importantChats.forEach(c => console.log(`👀 Vigilando: ${c.name} (${c.id._serialized})`));
});

this.client.on('message_create', async (msg: Message) => {
  try {
    const chat = await msg.getChat();
    const isTargetGroup = chat.id._serialized === this.targetGroupId;

    const blacklist = ['SOLICITUDES VECY AGENDA'];
    const isImportantGroup = 
        (chat.name.includes('Andrés Nieto') || 
        chat.name.includes('Brokers Bogotá') || 
        chat.name.includes('REQUE') || 
        chat.name.includes('Red Inmobiliaria') || 
        chat.name.includes('PERMUTA') ||
        chat.name.includes('VECY') ||
        chat.name.includes('Expertos Inmobiliarios')) &&
        !blacklist.some(b => chat.name.includes(b));


        // Solo procesamos si es el grupo principal o uno de los grupos de captura de datos
        if (isTargetGroup || isImportantGroup) {
            // Log de actividad para Eduardo
            console.log(`[VECY INTEL] Mensaje en "${chat.name}" | De: ${msg.fromMe ? 'YO' : msg.from} | Texto: ${msg.body.substring(0, 30)}...`);
            
            // Si es un grupo importante pero NO es el principal, procesamos SILENCIOSAMENTE (solo guardar en Supabase)
            const silent = !isTargetGroup;
            await this.handleMessage(msg, silent);
        }
      } catch (e) {
        console.error('Error en receptor multi-grupo:', e);
      }
    });
  }

  private async handleMessage(msg: Message, silent: boolean = false) {
    if (msg.fromMe && msg.body.includes('Soy *JanIA*')) return;
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

      // COMANDOS DE CONTROL (Solo en grupo principal y no silencioso)
      if (!silent) {
          if (text.includes('jania preséntate') || text.includes('jania anuncia') || text.includes('confirma que estás lista')) {
            const intro = `¡Hola @todos! 🌟 Soy *JanIA*, su Coach Inmobiliaria de VECY. 🎯\n\nEstoy activa, vigilando múltiples grupos y lista para encontrar MATCHES. ¡Publiquen sus inmuebles y yo me encargo del resto! 🏠🚀`;
            await this.client.sendMessage(this.targetGroupId, intro);
            return;
          }

          if (text.includes('jania dime las reglas')) {
            const chat = await this.client.getChatById(this.targetGroupId) as any;
            msg.reply(`📝 *REGLAS DEL GRUPO:* \n\n${chat.description || 'No hay descripción'}`);
            return;
          }
      }

      // NO analizar mensajes propios de Eduardo para ahorrar tokens (a menos que sean comandos)
      if (msg.fromMe && !silent) return;

      // EXTRACCIÓN DE LINKS (Scraping) - Guardar en Supabase
      const urlMatch = msg.body.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        if (!silent) msg.reply(`🧐 Analizando este link para la red VECY...`);
        try {
            const data = await scrapePropertyLink(urlMatch[0]);
            // El guardado en Supabase sucede dentro de scrapePropertyLink/JanIA
            if (!silent) msg.reply(`✅ Inmueble registrado: ${data.name}. ¡Buscando matches!`);
        } catch (e) {
            console.error('Error scraping link:', e);
        }
        return;
      }

      // PROCESAR CON IA (Clasificar y Guardar en Supabase)
      // Si silent = true, JanIA guarda los datos pero no responde al chat (Ideal para grupos de terceros)
      const result = await processWhatsAppMessage(msg.body, msg.from, userName);
      
      if (result && result.response && !silent) {
        await this.client.sendMessage(msg.to, result.response, { mentions: [msg.from] });
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
