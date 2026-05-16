import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import type { Client as ClientType, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { scrapePropertyLink, esDominioPermitido } from './scraper';
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
              // Pausa de 4s entre mensajes (llave de pago permite ~15 RPM)
              await new Promise(resolve => setTimeout(resolve, 4000));
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
   * Publica las normas y formato oficial del grupo
   */
  public async sendGroupRules() {
    const rulesText = `📋 *NORMAS Y FORMATO OFICIAL — VECY INMUEBLES NETWORK* 📋

Hola a todos 👋 Soy *JanIA*, la IA de VECY. Para que el sistema de MATCHES funcione al 100%, por favor sigan estas normas al publicar:

━━━━━━━━━━━━━━━━━━
🏠 *FORMATO PARA INMUEBLES*
━━━━━━━━━━━━━━━━━━
*VENDO / ARRIENDO:* [tipo de inmueble]
📍 *Zona:* [barrio o sector]
💰 *Precio:* [valor en pesos]
📐 *Área:* [m2]
🛏 *Hab / Baños:* [número]
🏗 *Estrato:* [número]
📝 *Descripción:* [detalles adicionales]

━━━━━━━━━━━━━━━━━━
🔍 *FORMATO PARA REQUERIMIENTOS*
━━━━━━━━━━━━━━━━━━
*BUSCO:* [tipo de inmueble]
📍 *Zona deseada:* [barrio o sector]
💰 *Presupuesto:* [valor máximo]
📐 *Área mínima:* [m2]
🛏 *Hab mínimas:* [número]
📅 *Urgencia:* [inmediato / próximas semanas / mes]

━━━━━━━━━━━━━━━━━━
⚠️ *REGLAS DEL GRUPO*
━━━━━━━━━━━━━━━━━━
✅ Solo contenido inmobiliario profesional
✅ Un mensaje por inmueble o requerimiento
✅ Respeta a todos los colegas
❌ No spam, no cadenas, no temas ajenos
❌ No publicar el mismo inmueble más de 1 vez por semana
❌ No insultos ni lenguaje inapropiado

💡 *¿Por qué el formato?* Yo, JanIA, leo cada publicación y la registro en nuestra base de datos. Entre más información incluyas, mayor es la probabilidad de que encuentre el MATCH perfecto y te notifique directamente. 🎯

🔗 *LINKS ACEPTADOS POR JanIA*
Puedo extraer datos automáticamente de:
✅ wasi.co | fincaraiz.com.co | metrocuadrado.com | properati.com.co | ciencuadras.com | olx.com.co

❌ NO enviar links de: Instagram, Facebook, YouTube, TikTok o Catálogos de WhatsApp. No puedo acceder a esos. En su lugar, escribe los datos directamente en el chat usando el formato de arriba.

¡Gracias por hacer de este grupo el mejor equipo inmobiliario de Colombia! 🇨🇴🏆`;

    try {
      const chat = await this.client.getChatById(this.targetGroupId) as any;
      const participants = chat.participants.map((p: any) => p.id._serialized);
      await this.client.sendMessage(this.targetGroupId, rulesText, { mentions: participants });
      console.log('✅ Normas del grupo publicadas.');
    } catch (e) {
      console.error('Error publicando normas:', e);
    }
  }


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

      // COMANDO DE PRESENTACIÓN
      if (text.includes('jania preséntate') || text.includes('jania anuncia') || text.includes('confirma que estás lista')) {
        await this.sendGrandIntroduction();
        return;
      }

      // COMANDO DE NORMAS DEL GRUPO
      if (text.includes('jania normas') || text.includes('jania publica normas') || text.includes('jania reglas')) {
        await this.sendGroupRules();
        return;
      }

      // Permitir que Eduardo pruebe desde su propio número solo si invoca a JanIA por su nombre
      // de lo contrario, se ignoran sus mensajes para no generar un bucle infinito.
      if (msg.fromMe && !text.includes('jania')) return;

      // 1. Si hay link de un portal inmobiliario conocido, intentar scrapear en paralelo
      const urlMatch = msg.body.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        if (esDominioPermitido(urlMatch[0])) {
          // Portal inmobiliario conocido → scrapear sin bloquear el flujo
          scrapePropertyLink(urlMatch[0]).catch(e => {
            console.log(`[Scraper] Fallo en ${urlMatch[0]}: ${e.message}`);
          });
        } else {
          // Red social o sitio no compatible → ignorar silenciosamente
          console.log(`[Scraper] Dominio ignorado (no es portal inmobiliario): ${urlMatch[0].substring(0, 50)}`);
        }
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
