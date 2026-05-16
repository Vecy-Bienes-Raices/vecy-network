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

    this.client.on('ready', () => {
      console.log('\n🚀 JANIA OPERATIVA - SISTEMA DE MATCHES 1000% EFECTIVOS ACTIVADO');
      
      setTimeout(async () => {
        try {
          console.log(`🎯 Grupo Objetivo Confirmado por ID.`);

          // CAPTURA SILENCIOSA DEL HISTORIAL: 
          // Procesamos los últimos 200 mensajes sin responder en el grupo
          // Esto llena la base de datos con todos los inmuebles y requerimientos publicados
          console.log('📚 Iniciando captura silenciosa del historial del grupo...');
          const chatToRead = await this.client.getChatById(this.targetGroupId) as any;
          const historial = await chatToRead.fetchMessages({ limit: 200 });
          
          // Filtrar solo mensajes con texto real de inmuebles/requerimientos
          const mensajesRelevantes = historial.filter((m: any) => 
            !m.fromMe && m.body && m.body.length > 30
          );
          
          console.log(`📚 ${mensajesRelevantes.length} mensajes relevantes encontrados. Procesando en silencio...`);
          
          let guardados = 0;
          for (const m of mensajesRelevantes) {
            try {
              await this.handleMessage(m, true); // silencioso
              guardados++;
              // Pausa de 13 segundos entre mensajes para respetar límite gratuito (5/min)
              await new Promise(resolve => setTimeout(resolve, 13000));
            } catch(err) { /* ignorar errores individuales */ }
          }
          console.log(`📚 Captura completada: ${guardados}/${mensajesRelevantes.length} mensajes guardados en Supabase.`);

        } catch (err: any) {
          console.warn('⚠️ Error al cargar historial:', err.message);
        }
      }, 5000);
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
      // En grupos: msg.author = quien escribe, msg.from = el grupo
      // En privado: msg.from = quien escribe, msg.author = undefined
      const senderId: string = (msg as any).author || msg.from;

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

      // Permitir que Eduardo pruebe desde su propio número solo si invoca a JanIA por su nombre
      // de lo contrario, se ignoran sus mensajes para no generar un bucle infinito.
      if (msg.fromMe && !text.includes('jania')) return;

      // 1. Si hay link, intentar scrapear, pero SIEMPRE procesar el texto del mensaje también
      const urlMatch = msg.body.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        // Intentar scraping en paralelo pero no bloquear el flujo principal
        scrapePropertyLink(urlMatch[0]).catch(e => {
          console.log(`[Scraper] No se pudo extraer del link (procesando como texto): ${e.message}`);
        });
      }

      // 2. Inteligencia de Match 1000% Efectivo (SIEMPRE corre, con o sin link)
      console.log(`[JanIA] Procesando mensaje de ${userName} (${senderId}): "${msg.body.substring(0, 60)}..."`);
      const result = await processWhatsAppMessage(msg.body, senderId, userName);
      
      if (result && result.response && !silent) {
        // La mención debe ser al AUTOR del mensaje, no al grupo
        const allMentions = Array.from(new Set([senderId, ...(result.mentions || [])]));
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
