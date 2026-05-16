import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import type { Client as ClientType, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { scrapePropertyLink, esDominioPermitido } from './scraper';
import { processWhatsAppMessage } from './janIA';

export class WhatsAppBot {
  private client: ClientType;
  private targetGroupId: string = '120363260108880069@g.us';
  private messageBuffers: Map<string, { timer: NodeJS.Timeout, messages: string[], userName: string, hasMedia: boolean }> = new Map();
  private startTime: number = Date.now();

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
      console.log('\n🚀 JANIA OPERATIVA - SISTEMA DE MATCHES PROFESIONAL ACTIVADO');
      this.startTime = Date.now();
    });

    this.client.on('message_create', async (msg: Message) => {
      // 1. Ignorar mensajes propios para evitar bucles
      if (msg.fromMe) return;

      // 2. Ignorar mensajes de antes de arrancar
      if (msg.timestamp * 1000 < this.startTime) return;

      try {
        const chat = await msg.getChat();
        if (chat.id._serialized === this.targetGroupId) {
          const text = msg.body.toLowerCase();

          // Comandos inmediatos
          if (text.includes('jania normas') || text.includes('jania preséntate')) {
            await this.handleMessageImmediate(msg);
            return;
          }

          // Detectar si tiene media (foto/video/documento)
          const hasMedia = msg.hasMedia;

          // Agrupar mensajes
          await this.enqueueMessage(msg, hasMedia);
        }
      } catch (e) {
        console.error('Error en receptor:', e);
      }
    });
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
      // Scrapear links si existen
      const urlMatch = fullText.match(/https?:\/\/[^\s]+/g);
      if (urlMatch) {
        for (const url of urlMatch) {
          if (esDominioPermitido(url)) {
            scrapePropertyLink(url).catch(() => { });
          }
        }
      }

      const result = await processWhatsAppMessage(fullText, senderId, userName, hasMedia);

      if (result && result.response) {
        const allMentions = Array.from(new Set([senderId, ...(result.mentions || [])]));
        await this.client.sendMessage(this.targetGroupId, result.response, {
          mentions: allMentions
        });
      }
    } catch (e) {
      console.error('Error procesando bloque:', e);
    }
  }

  private async handleMessageImmediate(msg: Message) {
    const chat = await msg.getChat();
    const senderId = (msg as any).author || msg.from;

    // Verificamos si el remitente es administrador
    const participant = (chat as any).participants.find((p: any) => p.id._serialized === senderId);
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
🏠 *FORMATO PARA INMUEBLES*
━━━━━━━━━━━━━━━━━━
*VENDO / ARRIENDO:* [tipo de inmueble]
📍 *Zona:* [barrio o sector]
💰 *Precio:* [valor en pesos]
📅 *Antigüedad:* [años de construido]
📐 *Área:* [m2] | 🛏️ *Hab / Baños / Garajes:* [número]
🏗️ *Estrato:* [número]
📝 *Descripción:* [detalles adicionales]

━━━━━━━━━━━━━━━━━━
🔍 *FORMATO PARA REQUERIMIENTOS*
━━━━━━━━━━━━━━━━━━
*BUSCO:* [tipo de inmueble]
📍 *Zona deseada:* [barrio o sector]
💰 *Presupuesto:* [valor máximo]
📅 *Antigüedad máxima:* [años]
📐 *Área mínima:* [m2] | 🛏️ *Hab / Baños / Garajes:* [número]
📝 *Descripción:* [detalles adicionales]
📅 *Urgencia:* [inmediato / próximas semanas / mes]

━━━━━━━━━━━━━━━━━━
⚠️ *REGLAS DEL GRUPO*
━━━━━━━━━━━━━━━━━━
✅ Solo contenido inmobiliario profesional.
✅ *FOTOS/VIDEOS:* 🚫 NO subir imágenes directas al grupo (saturan mi memoria). 
✅ *LINKS ACEPTADOS:* Puedo leer automáticamente de:
   - Wasi, Qrador, Habi, FincaRaíz, MetroCuadrado, Proppit, Ciencuadras, Mercadolibre.
   - **¡Tus propios sitios web!** (.com, .co, .netlify, .vercel, etc.)
❌ *NO ENVIAR LINKS DE:* Facebook, Instagram, TikTok, YouTube o Catálogos de WhatsApp. No puedo leerlos.

💡 *¿Por qué el formato?* Yo leo cada mensaje y lo registro. Entre más información incluyas, más rápido encontraré el MATCH perfecto y te notificaré. 🎯

¡Gracias por hacer de este el mejor equipo inmobiliario de Colombia! 🇨🇴🏆`;

    try {
      await this.client.sendMessage(this.targetGroupId, rulesText);
      console.log('✅ Normas detalladas enviadas.');
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
