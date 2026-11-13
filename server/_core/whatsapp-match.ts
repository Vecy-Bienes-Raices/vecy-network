import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) { }

import { applySignalPatches } from './patchSignal';
applySignalPatches();

import _baileys, {
  useMultiFileAuthState,
  DisconnectReason,
  delay,
  downloadMediaMessage,
  downloadContentFromMessage,
  proto,
  fetchLatestWaWebVersion,
  fetchLatestBaileysVersion,
  Browsers
} from '@whiskeysockets/baileys';

function getWASocket(): any {
  if (typeof _baileys === 'function') return _baileys;
  if ((_baileys as any)?.default && typeof (_baileys as any).default === 'function') return (_baileys as any).default;
  if ((_baileys as any)?.makeWASocket && typeof (_baileys as any).makeWASocket === 'function') return (_baileys as any).makeWASocket;
  return _baileys;
}
import { Boom } from '@hapi/boom';
import qrcodeTerminal from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db';
import { conversations, messages as dbMessages, users, propertyMatches, properties, requirements, pendingSessions } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { esDominioPermitido, scrapePropertyLink } from './scraper';
import QRCode from 'qrcode';
import { extractFirstName, getGreetingByTime, startContinuousPresence } from './whatsapp-utils';
import { transcribeAudioBuffer } from './voiceTranscription';
import { isNonRealEstateText } from './matching';
import { VECY_OFFICIAL_GROUPS, VECY_BRAND } from '../../shared/const';
import { sanitizeResponseMarkdown } from './jania/parsers';
import { cleanRawUserName } from './nameAndGenderResolver';


// Tiempo de arranque para omitir mensajes históricos (con 2 min de margen por desfase de reloj)
const SERVER_BOOT_TIME = Math.floor(Date.now() / 1000) - 120;

// Helper para limpiar JID removiendo sufijos de dispositivo (:42, :1, etc.)
const cleanJid = (jid: string) => {
  if (!jid) return "";
  if (jid.includes('@')) {
    const [userPart, domain] = jid.split('@');
    const cleanUser = userPart.split(':')[0];
    return `${cleanUser}@${domain}`;
  }
  return jid.split(':')[0];
};

// Helper para desenrollar mensajes envueltos en ephemeral, viewOnce, editados, etc.
export function unwrapMessage(msgObj: any): any {
  if (!msgObj) return msgObj;
  let unwrapped = msgObj;
  while (
    unwrapped.ephemeralMessage?.message ||
    unwrapped.viewOnceMessage?.message ||
    unwrapped.viewOnceMessageV2?.message ||
    unwrapped.viewOnceMessageV2Extension?.message ||
    unwrapped.documentWithCaptionMessage?.message ||
    unwrapped.protocolMessage?.editedMessage
  ) {
    unwrapped =
      unwrapped.ephemeralMessage?.message ||
      unwrapped.viewOnceMessage?.message ||
      unwrapped.viewOnceMessageV2?.message ||
      unwrapped.viewOnceMessageV2Extension?.message ||
      unwrapped.documentWithCaptionMessage?.message ||
      unwrapped.protocolMessage?.editedMessage;
  }
  return unwrapped;
}

// Helper para descargar media de forma robusta con stream fallback
export async function downloadMediaSafely(msg: proto.IWebMessageInfo, type: 'image' | 'video' | 'audio' | 'document'): Promise<Buffer | null> {
  try {
    const buf = await downloadMediaMessage(msg as any, 'buffer', {}) as Buffer;
    if (buf && buf.length > 0) return buf;
  } catch (err1) { }

  try {
    const rawMsg = unwrapMessage(msg.message);
    const mediaKey = type === 'image' ? rawMsg?.imageMessage :
      type === 'audio' ? rawMsg?.audioMessage :
        type === 'video' ? rawMsg?.videoMessage :
          rawMsg?.documentMessage;
    if (mediaKey) {
      const stream = await downloadContentFromMessage(mediaKey, type);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buf = Buffer.concat(chunks);
      if (buf && buf.length > 0) return buf;
    }
  } catch (err2) {
    console.error(`[JANIA-MEDIA] Error descargando ${type}:`, err2);
  }
  return null;
}

// Helper para verificar grupos en lista negra (seguridad, policía, cuadrantes, convivencia no inmobiliaria)
export function isBlacklistedGroup(groupName: string | null | undefined, chatId: string | null | undefined): boolean {
  if (!groupName && !chatId) return false;
  const nameLower = (groupName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const blacklistPatterns = [
    "seguridad tiempo real",
    "seguridad en tiempo real",
    "chat de seguridad",
    "frente de seguridad",
    "cuadrante",
    "policia",
    "cai ",
    "vigilancia",
    "red de apoyo",
    "vecinos alerta",
    "seguridad barrio",
    "seguridad comunitaria"
  ];

  return blacklistPatterns.some(pattern => nameLower.includes(pattern));
}

// 🌟 COMUNIDADES Y ADMINISTRADORES INMOBILIARIOS VIP (v32.52)
// Identificados formalmente por Eduardo: Armando Cortés, Julieth Martínez, Victoria Jiménez,
// Camilo Sanabria, Moisés Rojas, Dahianna Castro, Nancy Zamorano, Lia Janeth Rivas, Carolina Rodríguez, Andrés Nieto, Nubia Hernández
export const VIP_COMMUNITY_ADMIN_PHONES = new Set([
  "573003600006", // Armando Cortés
  "573123112205", // Julieth Martínez
  "573132411598", // Victoria Jiménez
  "573115142754", // Camilo Sanabria
  "573044233410", // Moisés Rojas
  "573156011720", // Dahianna Castro
  "573177838635", // Nancy Zamorano
  "573103055109", // Lia Janeth Rivas
  "573212857044", // Carolina Rodríguez
  "14075096206",  // Caro Rodríguez (USA)
  "573124311307", // Nubia Hernández
  "573208626787", // Andrés Nieto
]);

export function isVipRealEstateGroup(meta: any, groupSubject: string): boolean {
  if (!meta && !groupSubject) return false;
  if (meta?.participants) {
    for (const p of meta.participants) {
      if (p.admin) {
        const phone = p.id ? p.id.split('@')[0].split(':')[0] : '';
        if (VIP_COMMUNITY_ADMIN_PHONES.has(phone)) return true;
      }
    }
  }
  const s = (groupSubject || '').toLowerCase();
  return (
    s.includes("andres nieto") ||
    s.includes("andrés nieto") ||
    s.includes("caro rodriguez") ||
    s.includes("caro rodríguez") ||
    s.includes("apartaestudios bogota") ||
    s.includes("bodegas y lotes") ||
    s.includes("en casa gestión") ||
    s.includes("santas-carolina") ||
    s.includes("requerimientos colombia") ||
    s.includes("campestre venta") ||
    s.includes("mil millones") ||
    s.includes("solo arriendos")
  );
}

// Cola de despacho secuencial para evitar bloqueos
let outgoingQueue: Promise<any> = Promise.resolve();

interface BufferedMessage {
  body: string;
  hasMedia: boolean;
  imageBuffer?: string;
  audioUrl?: string;
  pdfBuffer?: string;
  pdfMimeType?: string;
  flyerVisionData?: any;
  originalMsg: proto.IWebMessageInfo;
}

interface MessageBuffer {
  timer: NodeJS.Timeout;
  messages: BufferedMessage[];
  userName: string;
  chatId: string;
  warningSent?: boolean;
}

export interface JaniaBotOptions {
  sessionFolderName?: string;
  qrFileName?: string;
  botName?: string;
  isWorkerOnly?: boolean;
}

export class JaniaMatchBot {
  public sock: any = null;
  public isReady: boolean = false;
  public sessionFolderName: string = '.baileys_auth';
  public qrFileName: string = 'qr-match.png';
  public botName: string = 'JANIA-MATCH';
  public isWorkerOnly: boolean = false;

  // Grupos autorizados y configuraciones
  private authorizedGroups: string[] = [];
  private messageBuffers: Map<string, MessageBuffer> = new Map();
  private redirectCooldowns: Map<string, number> = new Map();
  private processingLocks: Map<string, Promise<void>> = new Map();
  private lastGroupMessageTime: Map<string, number> = new Map();
  private botSentMessageIds: Set<string> = new Set();
  private messageStore: Map<string, proto.IMessage> = new Map();
  private lastHumanIntervention: Map<string, number> = new Map();

  private phoneToLidMap: Map<string, string> = new Map([
    ['573192919978', '167108705018103@lid'],
    ['573166569719', '225954035179724@lid'],
    ['573188096811', '182781141344345@lid'],
    ['573138862997', '261731263762516@lid'],
  ]);
  private lidToPhoneMap: Map<string, string> = new Map([
    ['167108705018103', '573192919978'],
    ['225954035179724', '573166569719'],
    ['182781141344345', '573188096811'],
    ['218820279050385', '573188096811'],
    ['261731263762516', '573138862997'],
  ]);
  private recentAgendaConfirmations: Map<string, { timestamp: number; confirmationText: string; solicitudId?: string | number }> = new Map();
  private groupHumanTakeoverMap: Map<string, number> = new Map();
  private humanManualMessageIds: Set<string> = new Set();
  private groupRecentContextMap: Map<string, Array<{ senderName: string; text: string; timestamp: number }>> = new Map();

  /**
   * 🛡️ DOCTRINA EDUARDO A. RIVERA (v33.96):
   * Verifica de forma infalible si un mensaje proviene de la propia cuenta de JanIA (+573192919978 / LID 167108705018103),
   * incluso cuando es enviado manualmente desde WhatsApp Web (:46@lid) donde Baileys puede reportar fromMe=false en grupos.
   */
  public isFromOwnBotAccount(msg: proto.IWebMessageInfo, senderId?: string): boolean {
    if (!msg) return false;
    if (msg.key?.fromMe) return true;

    const botJid = this.sock?.user?.id ? cleanJid(this.sock.user.id) : '';
    const botPhone = botJid ? botJid.split('@')[0].split(':')[0] : '573192919978';
    const rawBotLid = (this.sock?.user as any)?.lid || (this.sock as any)?.authState?.creds?.me?.lid || '167108705018103@lid';
    const cleanBotLid = rawBotLid ? String(rawBotLid).split(':')[0].split('@')[0] : '167108705018103';

    const keyAny = (msg.key || {}) as any;
    const candidates = [
      senderId || '',
      msg.key?.participant || '',
      (msg as any)?.participant || '',
      keyAny.senderPn || '',
      keyAny.participantPn || '',
      keyAny.senderLid || '',
      keyAny.participantLid || '',
    ].filter(Boolean);

    for (const cand of candidates) {
      const clean = cleanJid(String(cand));
      const num = clean.split('@')[0].split(':')[0];
      if (
        (botJid && clean === botJid) ||
        (botPhone && num === botPhone) ||
        num === '573192919978' ||
        num === '3192919978' ||
        num === '167108705018103' ||
        (cleanBotLid && num === cleanBotLid) ||
        String(cand).includes('167108705018103') ||
        String(cand).includes('573192919978')
      ) {
        return true;
      }
    }

    const pushName = String(msg.pushName || '').trim();
    if (/jania\s+agente\s+ia\s+de\s+vecy/i.test(pushName) || /^✨\s*jania\b/i.test(pushName)) {
      return true;
    }

    return false;
  }

  /**
   * 🛡️ Detecta si un texto es un flyer promocional o autopresentación de JanIA ("¡Buenos días! Soy JanIA, tu aliada inmobiliaria...")
   * para evitar que JanIA confunda su propio anuncio con una consulta de un usuario.
   */
  public isSelfPresentationOrFlyerOfJanIA(text?: string | null): boolean {
    if (!text) return false;
    const clean = text.trim();
    return (
      /\b(?:soy|habla|te\s+saluda)\s+(?:✨\s*)?jania\b/i.test(clean) ||
      /\bjania,\s+tu\s+aliada\s+inmobiliaria\b/i.test(clean) ||
      /\b✨?\s*jania\s+agente\s+ia\s+de\s+vecy\b/i.test(clean)
    ) && !/@(?:✨\s*)?jania\b/i.test(clean);
  }

  /**
   * 👂 Registra en silencio el contexto conversacional reciente del grupo para que JanIA "ponga atención"
   * mientras los participantes hablan sin interrumpirlos, y tenga contexto si luego se dirigen directamente a ella.
   */
  public recordPassiveGroupContext(chatId: string, senderName: string, text: string) {
    if (!chatId || !text || !text.trim()) return;
    const cleanText = text.trim().slice(0, 350);
    if (cleanText.length < 3) return;
    const list = this.groupRecentContextMap.get(chatId) || [];
    list.push({
      senderName: senderName || 'Participante',
      text: cleanText,
      timestamp: Date.now(),
    });
    while (list.length > 8) {
      list.shift();
    }
    this.groupRecentContextMap.set(chatId, list);
  }

  public getPassiveGroupContextSummary(chatId: string): string {
    const list = this.groupRecentContextMap.get(chatId) || [];
    const now = Date.now();
    const recent = list.filter(item => now - item.timestamp < 30 * 60 * 1000);
    if (recent.length === 0) return '';
    return recent.map(item => `- ${item.senderName}: "${item.text}"`).join('\n');
  }

  public registerManualGroupTakeover(chatId: string, msgId?: string) {
    if (chatId) {
      this.groupHumanTakeoverMap.set(chatId, Date.now());
    }
    if (msgId) {
      this.humanManualMessageIds.add(msgId);
      if (this.humanManualMessageIds.size > 1000) {
        const first = this.humanManualMessageIds.values().next().value;
        if (first) this.humanManualMessageIds.delete(first);
      }
    }
  }

  /**
   * ⚖️ Verifica que una mención a JanIA en un grupo externo corresponda a una consulta inmobiliaria, jurídica,
   * tributaria, de avalúo o solicitud de explicación, y jamás a un flyer o saludo vacío.
   */
  private async extractQuotedContextAndMedia(
    msg: any,
    rawMsg: any
  ): Promise<{
    quotedContext?: string;
    quotedImageBuffer?: string;
    quotedPdfBuffer?: string;
    quotedPdfMimeType?: string;
    hasQuotedMedia: boolean;
  }> {
    let quotedContext: string | undefined;
    let quotedImageBuffer: string | undefined;
    let quotedPdfBuffer: string | undefined;
    let quotedPdfMimeType: string | undefined;
    let hasQuotedMedia = false;

    try {
      const contextInfo =
        rawMsg?.extendedTextMessage?.contextInfo ||
        rawMsg?.imageMessage?.contextInfo ||
        rawMsg?.documentMessage?.contextInfo ||
        msg?.message?.extendedTextMessage?.contextInfo ||
        rawMsg?.contextInfo;

      if (contextInfo?.quotedMessage) {
        const unwrappedQuoted = unwrapMessage(contextInfo.quotedMessage) as any;
        quotedContext =
          unwrappedQuoted?.conversation ||
          unwrappedQuoted?.extendedTextMessage?.text ||
          unwrappedQuoted?.imageMessage?.caption ||
          unwrappedQuoted?.documentMessage?.caption ||
          undefined;

        if (unwrappedQuoted?.imageMessage) {
          hasQuotedMedia = true;
          const buf = await downloadMediaSafely({ message: contextInfo.quotedMessage } as any, 'image').catch(() => null);
          if (buf && buf.length > 0) quotedImageBuffer = buf.toString('base64');
        } else if (unwrappedQuoted?.documentMessage) {
          hasQuotedMedia = true;
          const buf = await downloadMediaSafely({ message: contextInfo.quotedMessage } as any, 'document').catch(() => null);
          if (buf && buf.length > 0) {
            quotedPdfBuffer = buf.toString('base64');
            quotedPdfMimeType = unwrappedQuoted.documentMessage.mimetype || 'application/pdf';
          }
        }
      }
    } catch {
      // No interrumpir flujo si el quotedMessage carece de metadata multimedia
    }

    return { quotedContext, quotedImageBuffer, quotedPdfBuffer, quotedPdfMimeType, hasQuotedMedia };
  }

  public isRealEstateConsultationForGroup(text?: string | null, quotedText?: string | null, hasMedia?: boolean): boolean {
    const clean = String(text || '').trim();
    const quoted = String(quotedText || '').trim();
    if (!clean && !quoted && !hasMedia) return false;
    if (this.isSelfPresentationOrFlyerOfJanIA(clean)) return false;

    const combined = `${clean} ${quoted}`.toLowerCase();
    // Si tiene signo de interrogación, media adjunta (PDF/imagen CTL), verbos de consulta o términos inmobiliarios/jurídicos
    const hasQuestionOrConsultIntent =
      Boolean(hasMedia) ||
      /[¿?]/.test(combined) ||
      /\b(?:consulta|consultar|pregunta|preguntarte|duda|inquietud|ayuda|ay[uú]dame|ay[uú]dale|explica|expl[ií]cale|expl[ií]canos|responde|resp[oó]ndele|aclara|acl[aá]rale|opinas|opini[oó]n|concepto|asesor[ií]a|orienta|ori[eé]ntanos|revisa|analiza|audita|c[oó]mo|cu[aá]nto|cu[aá]l|qu[eé]|qui[eé]n|d[oó]nde|por\s+qu[eé]|puedes|podr[ií]as|sabes)\b/i.test(combined) ||
      /\b(?:inmueble|inmobiliari[oa]|propiedad|apartamento|apto|casa|bodega|lote|local|oficina|finca|arriendo|arrendamiento|venta|compraventa|permuta|promesa|contrato|minuta|corretaje|comisi[oó]n|canon|aval[uú]o|acm|m2|metro\s+cuadrado|predial|chip|idu|paz\s+y\s+salvo|notar[ií]a|notarial|escritura|escrituraci[oó]n|registro|retenci[oó]n|ganancia\s+ocasional|impuesto|dian|uvt|ley\s+\d+|decreto|c[oó]digo\s+civil|propiedad\s+horizontal|cesant[ií]as|fondo|pensi[oó]n|pensiones|allianz|porvenir|protecci[oó]n|colfondos|fna|hipoteca|leasing|embargo|sucesi[oó]n|tradici[oó]n|falsa\s+tradici[oó]n|estudio\s+de\s+t[ií]tulos|\bctl\b|\bsnr\b|\borip\b|grav[aá]men(?:es)?|patrimonio\s+de\s+familia|afectaci[oó]n|usufructo|servidumbre|anotaci[oó]n(?:es)?|dictamen|matr[ií]cula|c[eé]dula|antecedentes|nit|rues|pot|sinupot|norma|ideca|uso\s+del?\s+suelo|usos\s+permitidos|edificabilidad|constructibilidad|prefactibilidad|antejard[ií]n|aislamiento|tratamiento\s+urban[ií]stico|\bupl\b|\bupz\b|vecy|match|empresa|sociedad|raz[oó]n\s+social|c[aá]mara\s+de\s+comercio|constructora|s\.?\s*a\.?\s*s\.?|ltda|flyer|infograf[ií]a|imagen|pieza\s+gr[aá]fica|banner|marketing|swap\s+test|audita(?:r)?|optimiza(?:r)?|redacta(?:r)?|correo|carta|liquidar|liqu[ií]da(?:me)?|verifica(?:r|me)?|descarga(?:r|me)?|firma\s+digital|firma\s+electr[oó]nica|calificar|rese[ñn]a)\b/i.test(combined);

    return hasQuestionOrConsultIntent;
  }

  public registerPhoneLidMapping(phoneOrJid?: string | null, lidOrJid?: string | null) {
    if (!phoneOrJid || !lidOrJid) return;
    let cleanPhone = String(phoneOrJid).split('@')[0].split(':')[0].replace(/\D/g, '');
    if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
      cleanPhone = '57' + cleanPhone;
    }
    const cleanLid = String(lidOrJid).split('@')[0].split(':')[0].replace(/\D/g, '');
    if (!cleanPhone || !cleanLid || cleanPhone === cleanLid) return;
    const lidJid = `${cleanLid}@lid`;
    this.phoneToLidMap.set(cleanPhone, lidJid);
    this.lidToPhoneMap.set(cleanLid, cleanPhone);
  }

  public resolveLidForPhone(phoneOrJid?: string | null): string | null {
    if (!phoneOrJid) return null;
    let cleanPhone = String(phoneOrJid).split('@')[0].split(':')[0].replace(/\D/g, '');
    if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
      cleanPhone = '57' + cleanPhone;
    }
    return this.phoneToLidMap.get(cleanPhone) || null;
  }

  public resolvePhoneForLid(lidOrJid?: string | null): string | null {
    if (!lidOrJid) return null;
    const cleanLid = String(lidOrJid).split('@')[0].split(':')[0].replace(/\D/g, '');
    return this.lidToPhoneMap.get(cleanLid) || null;
  }

  public registerAgendaNotification(phoneOrJid: string, confirmationText: string, solicitudId?: string | number) {
    let cleanPhone = String(phoneOrJid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
    if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
      cleanPhone = '57' + cleanPhone;
    }
    if (!cleanPhone) return;
    const entry = { timestamp: Date.now(), confirmationText, solicitudId };
    this.recentAgendaConfirmations.set(cleanPhone, entry);
    const mappedLid = this.resolveLidForPhone(cleanPhone);
    if (mappedLid) {
      const cleanLid = mappedLid.split('@')[0];
      this.recentAgendaConfirmations.set(cleanLid, entry);
      this.recentAgendaConfirmations.set(mappedLid, entry);
    }
    // Registrar también en el historial conversacional de JanIA para que reconozca el contexto si el cliente escribe
    import('./janIA').then(({ appendDmHistory }) => {
      appendDmHistory(`${cleanPhone}@s.whatsapp.net`, 'assistant', confirmationText);
      if (mappedLid) {
        appendDmHistory(mappedLid, 'assistant', confirmationText);
      }
    }).catch(() => {});
  }

  public isWhatsAppBusinessAutoGreeting(text?: string | null): boolean {
    if (!text) return false;
    const clean = text.trim();
    if (clean.length < 15 || clean.length > 360) return false;
    return (
      /gracias\s+por\s+comunicarte\s+con\b/i.test(clean) ||
      /gracias\s+por\s+contactar(?:te)?\s+(?:a|con)\b/i.test(clean) ||
      /gracias\s+por\s+escribir(?:nos)?\s+a\b/i.test(clean) ||
      /(?:d[eé]jame|haznos)\s+saber\s+c[oó]mo\s+(?:puedo|podemos)\s+ayudarte/i.test(clean) ||
      /en\s+breve\s+(?:uno\s+de\s+nuestros\s+asesores\s+)?te\s+atenderemos/i.test(clean) ||
      /bienvenid[oa]s?\s+a\s+[\w\s]{2,40}[.,!]\s*(?:¿?en\s+qu[eé]\s+podemos\s+ayudarte|¿?c[oó]mo\s+podemos\s+ayudarte)/i.test(clean)
    );
  }

  public saveMessageToStore(id: string, message: proto.IMessage) {
    if (!id || !message) return;
    const unwrapped = (message as any)?.deviceSentMessage?.message
      || (message as any)?.ephemeralMessage?.message
      || message;
    this.messageStore.set(id, unwrapped);
    if (this.messageStore.size > 2000) {
      const firstKey = this.messageStore.keys().next().value;
      if (firstKey) this.messageStore.delete(firstKey);
    }
  }
  private dmMessageBuffers: Map<string, { messages: any[]; timer: NodeJS.Timeout | null }> = new Map();
  private groupMetadataCache: Map<string, { data: any; time: number }> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reactedMessageIds: Map<string, { emoji: string; time: number }> = new Map();
  private reactionQueue: Promise<void> = Promise.resolve();
  private lastReactionTimestamp: number = 0;
  private readonly MIN_REACTION_INTERVAL_MS = 1200;

  private async getCachedGroupMetadata(chatId: string) {
    const cached = this.groupMetadataCache.get(chatId);
    if (cached && Date.now() - cached.time < 10 * 60 * 1000) {
      return cached.data;
    }
    try {
      const data = await Promise.race([
        this.sock?.groupMetadata(chatId),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500))
      ]);
      if (data) {
        this.groupMetadataCache.set(chatId, { data, time: Date.now() });
      }
      return data;
    } catch (_) {
      return cached?.data || null;
    }
  }

  public async resolveGroupName(chatId: string): Promise<string> {
    const KNOWN_GROUPS: Record<string, string> = {
      '120363260108880069@g.us': VECY_OFFICIAL_GROUPS.grupo1.name,
      '120363417740040773@g.us': VECY_OFFICIAL_GROUPS.grupo2.name,
      '120363403507276533@g.us': VECY_OFFICIAL_GROUPS.grupo3.name,
      '120363029834368375@g.us': 'Santas-Carolina-Bosques-Calleja',
    };

    if (KNOWN_GROUPS[chatId]) return KNOWN_GROUPS[chatId];

    try {
      const metadata = await this.getCachedGroupMetadata(chatId);
      if (metadata && metadata.subject && metadata.subject.trim()) {
        return metadata.subject.trim();
      }
    } catch (_) { }

    return 'Grupo Inmobiliario WhatsApp';
  }

  public targetGroupId: string = '120363260108880069@g.us';
  public buzonGroupId: string = '120363417740040773@g.us';
  public circuloGroupId: string = '120363403507276533@g.us';
  public channelNewsletterId: string = process.env.WHATSAPP_CHANNEL_NEWSLETTER_ID || '';
  private cooldownMap: Map<string, any> = new Map();
  private cooldownFile: string = path.join(process.cwd(), '.cooldown_map.json');
  private recentReviewPromptUsers: Map<string, number> = new Map();
  private postReviewInvitationTimers: Map<string, NodeJS.Timeout> = new Map();
  private recentGroupInviteUsers: Map<string, number> = new Map();
  private userFreeToolConsultationsCount: Map<string, number> = new Map();
  private userPolitenessTimers: Map<string, NodeJS.Timeout> = new Map();
  private userAwaitingReviewConsent: Map<string, { timestamp: number; userName?: string }> = new Map();

  /**
   * PROTOCOLO DE URBANIDAD DE CARREÑO Y CALIFICACIÓN (v32.96 — Eduardo A. Rivera):
   * Registra la entrega de un servicio gratuito (Cédula, Predial, IDU, Notarial).
   * Si el usuario fue maleducado y no dice ni gracias tras recibir el reporte,
   * JanIA espera un tiempo prudencial de 1 minuto (60s) tras la última interacción
   * y amablemente le pregunta si puede ayudar a mantener el servicio gratuito.
   */
  public onFreeToolServiceDelivered(senderId: string, userName?: string) {
    const currentCount = (this.userFreeToolConsultationsCount.get(senderId) || 0) + 1;
    this.userFreeToolConsultationsCount.set(senderId, currentCount);

    const lastReviewSent = this.recentReviewPromptUsers.get(senderId) || 0;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    if (lastReviewSent >= oneDayAgo) return;

    // Cancelar cualquier temporizador previo pendiente (espera de 1 minuto desde la ÚLTIMA interacción)
    const existingTimer = this.userPolitenessTimers.get(senderId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.userPolitenessTimers.delete(senderId);
    }

    console.log(`[JANIA-MATCH] ⏱️ Programando protocolo de Urbanidad de Carreño para ${senderId} (1 min de espera post-servicio)...`);
    const timer = setTimeout(async () => {
      this.userPolitenessTimers.delete(senderId);
      const recentSent = this.recentReviewPromptUsers.get(senderId) || 0;
      if (Date.now() - recentSent < 24 * 60 * 60 * 1000) return;

      try {
        const { buildWinningGoogleReviewMessage } = await import('./politenessService');
        const promptText = buildWinningGoogleReviewMessage(userName);
        await this.queuedSend(senderId, promptText, { allowDirectMessage: true, skipDelay: true });
        await this.logToDb(senderId, 'janIA', promptText);
        const { appendDmHistory } = await import('./janIA');
        appendDmHistory(senderId, 'assistant', promptText);

        this.recentReviewPromptUsers.set(senderId, Date.now());
        console.log(`[JANIA-MATCH] ⭐ Solicitud ganadora de Google Reviews entregada a ${senderId} tras entrega de servicio.`);
      } catch (err: any) {
        console.error('[JANIA-MATCH] Error enviando solicitud de Google Reviews tras entrega de servicio:', err?.message);
      }
    }, 60 * 1000);

    this.userPolitenessTimers.set(senderId, timer);
  }

  public maybeTriggerFreeServiceReviewPrompt(_senderId: string, _userName?: string) {
    // Extirpada la plantilla de donaciones (Doctrina v33.03)
    // La entrega de herramientas gratuitas ya cierra con: "Un servicio de cortesía de VECY BIENES RAÍCES 🤝."
    return;
  }

  /**
   * Programa la invitación con los enlaces de los 3 grupos oficiales unos minutos después
   * de haber enviado la solicitud de calificación en privado (Doctrina v32.59 de Eduardo A. Rivera).
   */
  public schedulePostReviewGroupInvitation(senderId: string, userName?: string) {
    if (this.postReviewInvitationTimers.has(senderId)) return;

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const lastInviteSent = this.recentGroupInviteUsers.get(senderId) || 0;
    if (Date.now() - lastInviteSent < SEVEN_DAYS_MS) return;

    // "Unos minutos después de la calificación" -> 2.5 minutos (150 segundos)
    const DELAY_MS = 2.5 * 60 * 1000;
    console.log(`[JANIA-MATCH] ⏱️ Programando invitación a grupos post-calificación para ${senderId} en 2.5 minutos...`);

    const timer = setTimeout(async () => {
      this.postReviewInvitationTimers.delete(senderId);
      try {
        this.recentGroupInviteUsers.set(senderId, Date.now());
        const realName = userName || "Colega";
        const firstName = extractFirstName(realName);

        const groupInviteMsg =
          `Hola ${firstName} 👋😊 Por cierto, quería preguntarte: ¿ya haces parte de nuestros grupos oficiales de WhatsApp de *VECY BIENES RAÍCES*? 🇨🇴✨\n\n` +
          `Para mantener el trabajo ordenado y ayudarte a cerrar negocios rápido, tenemos 3 espacios especializados para ti y toda la comunidad:\n\n` +
          `1️⃣ 🏢 *${VECY_OFFICIAL_GROUPS.grupo1.name}*\n` +
          `👉 ${VECY_OFFICIAL_GROUPS.grupo1.inviteLink}\n` +
          `📌 *¿Para qué sirve?* Este grupo es sagrado y exclusivo para compartir tus **OFERTAS🏷️** (inmuebles en venta o arriendo) y **DEMANDAS📝** (requerimientos de clientes listos). Yo escaneo y cruzo los datos al instante para encontrarte MATCH comercial.\n\n` +
          `2️⃣ 💡 *${VECY_OFFICIAL_GROUPS.grupo2.name}*\n` +
          `👉 ${VECY_OFFICIAL_GROUPS.grupo2.inviteLink}\n` +
          `📌 *¿Para qué sirve?* Espacio libre para consultas inmobiliarias públicas, tips del día, noticias del sector, valor de metro cuadrado, dudas jurídicas, tributarias y debates con colegas.\n\n` +
          `3️⃣ 🌐 *${VECY_OFFICIAL_GROUPS.grupo3.name}*\n` +
          `👉 ${VECY_OFFICIAL_GROUPS.grupo3.inviteLink}\n` +
          `📌 *¿Para qué sirve?* Espacio de nuestra comunidad de aliados para compartir tus experiencias del día a día en los negocios, casos reales cotidianos que te hayan pasado a ti o a otros colegas, proponer foros inmobiliarios y construir juntos el futuro de nuestra red colaborativa.\n\n` +
          `¡Y recuerda que para cualquier consulta privada o confidencial, me puedes escribir directamente aquí a mi chat privado! 🤝🚀 ¿Ya estás en todos o te gustaría que te oriente sobre alguno?`;

        await this.queuedSend(senderId, groupInviteMsg, { allowDirectMessage: true });
        await this.logToDb(senderId, 'janIA', groupInviteMsg);
        console.log(`[JANIA-MATCH] ✓ Invitación a grupos post-calificación entregada a ${senderId}`);
      } catch (err: any) {
        console.error(`[JANIA-MATCH] Error enviando invitación a grupos post-calificación a ${senderId}:`, err?.message);
      }
    }, DELAY_MS);

    this.postReviewInvitationTimers.set(senderId, timer);
  }

  constructor(options?: JaniaBotOptions) {
    if (options) {
      if (options.sessionFolderName) this.sessionFolderName = options.sessionFolderName;
      if (options.qrFileName) this.qrFileName = options.qrFileName;
      if (options.botName) this.botName = options.botName;
      if (options.isWorkerOnly !== undefined) this.isWorkerOnly = options.isWorkerOnly;
    }

    if (!this.isWorkerOnly) {
      (global as any).janiaMatchBotInstance = this;
    }
    console.log(`[${this.botName}] Inicializando JanIA Bot con Baileys (Carpeta: ${this.sessionFolderName})...`);

    // Cargar grupos desde la configuración o usar defaults
    const groupsEnv = process.env.JANIA_MATCH_GROUPS;
    if (groupsEnv) {
      this.authorizedGroups = groupsEnv.split(',').map(g => g.trim());
    } else {
      this.authorizedGroups = [
        '120363260108880069@g.us', // 1. 𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴
        '120363417740040773@g.us', // 2. 𝗩𝗘𝗖𝗬 𝗧𝗜𝗣𝗦💡/𝗡𝗢𝗧𝗜𝗖𝗜𝗔𝗦📰/𝗖𝗢𝗡𝗦𝗨𝗟𝗧𝗔𝗦 𝗜𝗡𝗠𝗢𝗕𝗜𝗟𝗜𝗔𝗥𝗜𝗔𝗦⁉️🏠
        '120363403507276533@g.us'  // 3. 𝗣𝗥𝗢𝗬𝗘𝗖𝗧𝗢: 🌐 "𝗩𝗘𝗖𝗬𝗕𝗜𝗘𝗡𝗘𝗦𝗥𝗔𝗜𝗖𝗘𝗦"🚀
      ];
    }

    this.loadCooldowns();
    this.setupGracefulShutdown();
    this.startDbHeartbeat();
  }

  private startDbHeartbeat() {
    if (process.env.NODE_ENV === "development" && process.env.ENABLE_LOCAL_WHATSAPP !== "true" && process.env.ENABLE_WHATSAPP_BOT !== "true") {
      return;
    }

    // Initial status update
    this.updateStatusInDb().catch(err => console.error(`[${this.botName}-DB] Error in initial status update:`, err));

    // Send heartbeat every 30 seconds
    setInterval(() => {
      this.updateStatusInDb().catch(err => console.error(`[${this.botName}-DB] Error in heartbeat status update:`, err));
    }, 30000);
  }

  public async updateStatusInDb() {
    try {
      const db = await getDb();
      if (!db) return;

      const rawPhone = this.sock?.user?.id ? this.sock.user.id.split('@')[0].split(':')[0] : null;
      const phone = rawPhone || "573192919978";
      const jid = this.isWorkerOnly ? "system:bot_status_worker2" : "system:bot_status";

      await db
        .insert(pendingSessions)
        .values({
          jid,
          sessionData: { isReady: true, phone, botName: this.botName, updatedAt: new Date().toISOString() },
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: pendingSessions.jid,
          set: {
            sessionData: { isReady: true, phone, botName: this.botName, updatedAt: new Date().toISOString() },
          },
        });

      console.log(`[${this.botName}-DB] Bot status heartbeat updated: isReady=${this.isReady}, phone=${phone}`);
    } catch (err: any) {
      console.error(`[${this.botName}-DB] Failed to update bot status in DB:`, err.message);
    }
  }

  public async initialize() {
    try {
      // 🛡️ Limpieza determinista del socket y listeners anteriores antes de crear uno nuevo
      if (this.sock) {
        try {
          this.sock.ev.removeAllListeners('connection.update');
          this.sock.ev.removeAllListeners('creds.update');
          this.sock.ev.removeAllListeners('messages.upsert');
          if (typeof (this.sock as any).end === 'function') {
            (this.sock as any).end(undefined);
          } else if (this.sock.ws && typeof this.sock.ws.close === 'function') {
            this.sock.ws.close();
          }
        } catch (cleanupErr) {
          // Silencioso
        }
      }

      const sessionDir = path.join(process.cwd(), this.sessionFolderName);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

      // 🛡️ DOCTRINA v32.51 / v33.95: Blindaje contra error "No open session" y purga de pendingPreKey zombies en Baileys
      // 1. Si un archivo de sesión en disco solo contiene sesiones cerradas (closed !== -1), o
      // 2. Si una sesión abierta (closed === -1) lleva más de 10 minutos estancada en estado pendingPreKey sin recibir respuesta
      //    que confirme el handshake (causa raíz del aviso "🕒 Esperando el mensaje. Esto puede demorar un poco"),
      //    la purgamos y retornamos null para que assertSessions negocie un PreKeyBundle 100% fresco con WhatsApp antes de cifrar.
      const originalKeysGet = state.keys.get;
      state.keys.get = (async (type: any, ids: string[]) => {
        const data = await originalKeysGet(type, ids);
        if (type === 'session') {
          const now = Date.now();
          const STALE_PENDING_PREKEY_MS = 10 * 60 * 1000; // 10 minutos
          for (const id of ids) {
            const sessRecord: any = (data as any)[id];
            if (sessRecord && sessRecord._sessions) {
              const sessionKeys = Object.keys(sessRecord._sessions);
              if (sessionKeys.length > 0) {
                for (const k of sessionKeys) {
                  const s = sessRecord._sessions[k];
                  if (s?.indexInfo?.closed === -1 && s.pendingPreKey) {
                    const lastActivity = Math.max(s.indexInfo?.used || 0, s.indexInfo?.created || 0);
                    if (lastActivity > 0 && (now - lastActivity) > STALE_PENDING_PREKEY_MS) {
                      delete sessRecord._sessions[k];
                    }
                  }
                }
                const remainingKeys = Object.keys(sessRecord._sessions);
                const hasOpen = remainingKeys.some(k => sessRecord._sessions[k]?.indexInfo?.closed === -1);
                if (!hasOpen) {
                  // Toda sesión en este archivo está cerrada o tenía un pendingPreKey obsoleto:
                  // forzar re-negociación Signal limpia a Baileys
                  (data as any)[id] = null;
                }
              }
            }
          }
        }
        return data;
      }) as any;

      // Guardar las credenciales iniciales de inmediato en disco para evitar que se pierdan
      if (!fs.existsSync(path.join(sessionDir, 'creds.json'))) {
        await saveCreds();
        console.log(`[${this.botName}] 💾 Guardadas credenciales iniciales de Baileys en ${this.sessionFolderName}.`);
      }

      let version: any = [2, 3000, 1043857760];
      try {
        const fetched = await fetchLatestBaileysVersion();
        if (fetched && fetched.version) {
          version = fetched.version;
        }
      } catch (e) { }

      console.log(`[${this.botName}] Estableciendo conexión por WebSocket...`);
      const silentLogger: any = {
        level: 'silent',
        log: () => { },
        trace: () => { },
        debug: () => { },
        info: () => { },
        warn: () => { },
        error: () => { },
        fatal: () => { },
        child: () => silentLogger
      };

      const makeWASocket = getWASocket();
      this.sock = makeWASocket({
        auth: state,
        version,
        logger: silentLogger as any,
        printQRInTerminal: false, // Lo manejamos nosotros de forma personalizada
        browser: Browsers.ubuntu('Chrome'),
        syncFullHistory: false,
        markOnlineOnConnect: false,
        connectTimeoutMs: 90000, // Aumentado a 90s para conexiones lentas
        defaultQueryTimeoutMs: 90000,
        keepAliveIntervalMs: 20000, // Ping Keep-Alive de WebSocket cada 20 segundos
        emitOwnEvents: true,
        getMessage: async (key: proto.IMessageKey) => {
          if (key?.id && this.messageStore.has(key.id)) {
            return this.messageStore.get(key.id);
          }
          return undefined;
        },
      });

      // 🛡️ DOCTRINA v33.95: Normalizador de Reintentos (CB:receipt retry) Cruzados entre LID (@lid) y PN (@s.whatsapp.net)
      // Corrige el bug nativo de Baileys donde un dispositivo acompañante propio (WhatsApp Web 167108705018103:46@lid)
      // o el móvil de un contacto solicita retry usando su LID para un mensaje despachado originalmente a @s.whatsapp.net.
      if (this.sock?.ws && typeof this.sock.ws.prependListener === 'function') {
        this.sock.ws.prependListener('CB:receipt', (node: any) => {
          try {
            if (!node?.attrs || node.attrs.type !== 'retry') return;
            const mePhone = (this.sock?.user?.id || state.creds?.me?.id || '573192919978').split(':')[0].split('@')[0];
            const meLid = (state.creds?.me?.lid || '167108705018103').split(':')[0].split('@')[0];
            const targetChat = String(node.attrs.recipient || node.attrs.from || '');
            const isTargetPnChat = targetChat.endsWith('@s.whatsapp.net');
            const isTargetLidChat = targetChat.endsWith('@lid');

            const rewriteJidDomain = (rawJid?: string): string | undefined => {
              if (!rawJid) return rawJid;
              const [userAndDev, server] = rawJid.split('@');
              if (!userAndDev || !server) return rawJid;
              const [userPart, devPart] = userAndDev.split(':');
              const devSuffix = devPart !== undefined ? `:${devPart}` : '';

              if (isTargetPnChat && server === 'lid') {
                if (userPart === meLid || userPart === '167108705018103') {
                  return `${mePhone}${devSuffix}@s.whatsapp.net`;
                }
                const targetPhone = targetChat.split('@')[0].split(':')[0];
                if (targetPhone) {
                  this.registerPhoneLidMapping(targetPhone, userPart);
                  return `${targetPhone}${devSuffix}@s.whatsapp.net`;
                }
              } else if (isTargetLidChat && server === 's.whatsapp.net') {
                if (userPart === mePhone || userPart === '573192919978') {
                  return `${meLid}${devSuffix}@lid`;
                }
              }
              return rawJid;
            };

            if (node.attrs.recipient) {
              node.attrs.from = rewriteJidDomain(node.attrs.from);
            }
            if (node.attrs.participant) {
              node.attrs.participant = rewriteJidDomain(node.attrs.participant);
            }
          } catch (_) { }
        });
      }

      // 🛡️ DOCTRINA v32.51: Blindaje E2E Signal contra caídas por "No open session"
      // Interceptamos encryptMessage para auto-sanar sesiones cerradas y evitar que un participante con sesión cerrada aborte la entrega a todo el grupo
      if (this.sock?.signalRepository?.encryptMessage) {
        const origEncryptMessage = this.sock.signalRepository.encryptMessage.bind(this.sock.signalRepository);
        this.sock.signalRepository.encryptMessage = async (params: { jid: string; data: Buffer }) => {
          try {
            return await origEncryptMessage(params);
          } catch (err: any) {
            if (err?.message?.includes("No open session") && typeof (this.sock as any)?.assertSessions === 'function') {
              try {
                await (this.sock as any).assertSessions([params.jid], true);
                return await origEncryptMessage(params);
              } catch (retryErr) {
                console.warn(`[JanIA-Signal] ⚠️ Dispositivo ${params.jid} sin sesión abierta en WhatsApp. Omitiendo nodo para preservar la entrega al grupo.`);
                return { type: 'pkmsg', ciphertext: Buffer.alloc(0) };
              }
            }
            throw err;
          }
        };
      }

      this.setupEventListeners(saveCreds);
    } catch (err: any) {
      console.error(`[${this.botName}] Error crítico al inicializar el cliente Baileys:`, err);
    }
  }

  private setupEventListeners(saveCreds: () => Promise<void>) {
    this.sock.ev.on('creds.update', async () => {
      try {
        await saveCreds();
      } catch (err: any) {
        console.error(`[${this.botName}] ❌ Error al guardar credenciales:`, err.message || err);
      }
    });

    this.sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(`\n[${this.botName}] 🔌 ESCANEA ESTE CÓDIGO QR PARA VINCULAR ${this.botName} (+573192919978):`);
        qrcodeTerminal.generate(qr, { small: true });

        (global as any).janiaBotQr = qr;

        // Guardar el QR como imagen PNG accesible desde el navegador
        try {
          const qrPath = path.join(process.cwd(), this.qrFileName);
          const publicQrDir = path.join(process.cwd(), "client", "public");
          if (!fs.existsSync(publicQrDir)) {
            fs.mkdirSync(publicQrDir, { recursive: true });
          }
          const publicQrPath = path.join(publicQrDir, "qr-match.png");
          await QRCode.toFile(qrPath, qr, { width: 400, margin: 2 });
          await QRCode.toFile(publicQrPath, qr, { width: 400, margin: 2 });
          console.log(`[${this.botName}] 📸 QR guardado exitosamente en ${qrPath} y ${publicQrPath}`);
        } catch (e: any) {
          console.warn(`[${this.botName}] Error guardando QR PNG:`, e.message);
        }
      }

      if (connection === 'close') {
        const error = lastDisconnect?.error as Boom;
        const statusCode = error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401 && statusCode !== 403;

        this.isReady = false;
        this.updateStatusInDb().catch(err => console.error(`[${this.botName}-DB] Error updating status on close:`, err));

        if (statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403) {
          console.error(`[${this.botName}] 🛡️ [ESCUDO ANTI-BAN] Sesión cerrada o desvinculada por WhatsApp (error ${statusCode}). Deteniendo reconexión automática por seguridad.`);
          return;
        }

        this.reconnectAttempts++;
        if (this.reconnectAttempts > 3) {
          console.warn(`[${this.botName}] 🛡️ [ESCUDO ANTI-BAN] 3 reintentos seguidos alcanzados. Pausando reconexión por 45 segundos para proteger el número +573192919978...`);
          setTimeout(() => {
            this.reconnectAttempts = 0;
            this.initialize();
          }, 45000);
          return;
        }

        const isRestart = statusCode === DisconnectReason.restartRequired;
        const isConnectionLost = statusCode === DisconnectReason.connectionLost;
        const isConflict = statusCode === 440;

        // Si hay conflicto (código 440), esperar 20 segundos para dar tiempo a que se libere la otra conexión sin hacer ping-pong
        const jitter = Math.floor(Math.random() * 3000);
        const delayMs = isConflict ? (20000 + jitter) : ((this.reconnectAttempts * 4000) + jitter);

        console.warn(`[${this.botName}] 🛡️ [ANTI-BAN] Conexión Baileys pausada (código: ${statusCode}) [Intento ${this.reconnectAttempts}/3]. Reconectando de forma segura en ${Math.round(delayMs / 1000)}s...`);

        if (shouldReconnect) {
          setTimeout(() => this.initialize(), delayMs);
        }
      } else if (connection === 'open') {
        console.log(`\n🚀 ${this.botName} 🔌💘 — BOT ACTIVADO CORRECTAMENTE CON BAILEYS`);
        this.isReady = true;
        this.reconnectAttempts = 0; // Resetear intentos al conectar exitosamente
        this.updateStatusInDb().catch(err => console.error(`[${this.botName}-DB] Error updating status on open:`, err));
        this.discoverAndSyncNewsletters().catch(err => console.warn(`[${this.botName}] Info newsletters:`, err?.message));
        // 👥 Auto-aprobación inmediata de solicitudes pendientes de ingreso a grupos oficiales
        this.approvePendingGroupRequests().catch(err => console.warn(`[${this.botName}] Info aprobación grupos:`, err?.message));
      }
    });

    // 👥 AUTO-APROBACIÓN DE SOLICITUDES DE INGRESO A GRUPOS OFICIALES (v32.60)
    // JanIA aprueba inmediatamente a todo colega que solicite unirse a los grupos oficiales de VECY BIENES RAÍCES
    this.sock.ev.on('group.join-request' as any, async (update: any) => {
      try {
        const groupId = update?.id;
        const participant = update?.participant;
        if (!groupId || !participant) return;
        const isOfficial = groupId === this.targetGroupId || groupId === this.buzonGroupId || groupId === this.circuloGroupId ||
          groupId === VECY_OFFICIAL_GROUPS.grupo1.id || groupId === VECY_OFFICIAL_GROUPS.grupo2.id || groupId === VECY_OFFICIAL_GROUPS.grupo3.id;
        if (isOfficial && typeof (this.sock as any).groupRequestParticipantsUpdate === 'function') {
          console.log(`[JANIA-JOIN] 👥 Solicitud de entrada detectada en ${groupId} para ${participant}. Aprobando...`);
          await (this.sock as any).groupRequestParticipantsUpdate(groupId, [participant], 'approve');
          console.log(`[JANIA-JOIN] ✅ Participante ${participant} aprobado automáticamente en grupo oficial.`);
        }
      } catch (err: any) {
        console.warn(`[JANIA-JOIN] Error aprobando solicitud de ingreso:`, err?.message);
      }
    });

    this.sock.ev.on('messages.upsert', async (m: { messages: proto.IWebMessageInfo[], type: string }) => {
      // Permitir tanto mensajes en vivo ('notify') como mensajes encolados durante micro-reconexiones ('append')
      if (m.type !== 'notify' && m.type !== 'append') return;

      for (const msg of m.messages) {
        if (!msg.key || !msg.message) continue;
        if (msg.key.id && msg.message) {
          this.saveMessageToStore(msg.key.id, msg.message);
        }

        // 🛡️ BLINDAJE DE PROTOCOLO Y SISTEMA WHATSAPP:
        // Ignorar stubs (cambios de código de seguridad, cambios de número, añadidos/removidos, llamadas, etc.)
        if ((msg as any).messageStubType) {
          continue;
        }

        const fromMe = msg.key.fromMe;
        const rawChatId = msg.key.remoteJid;
        if (!rawChatId) continue;

        const chatId = cleanJid(rawChatId);
        const isGroup = chatId.endsWith('@g.us');

        const rawSenderId = isGroup ? (msg.key.participant || msg.participant || (this.sock?.user?.id ? cleanJid(this.sock.user.id) : '')) : rawChatId;
        if (!rawSenderId || (isGroup && rawSenderId.endsWith('@g.us'))) continue;
        const senderId = cleanJid(rawSenderId);

        // 🔗 Cosecha automática bidireccional de pares Teléfono <-> LID (Doctrina v33.95)
        try {
          const keyAny = msg.key as any;
          const pnCandidate = keyAny?.senderPn || keyAny?.participantPn || (senderId.endsWith('@s.whatsapp.net') ? senderId : null);
          const lidCandidate = keyAny?.senderLid || keyAny?.participantLid || (senderId.endsWith('@lid') ? senderId : null);
          if (pnCandidate && lidCandidate) {
            this.registerPhoneLidMapping(pnCandidate, lidCandidate);
          }
        } catch (_) { }


        // Omitir si proviene de status broadcast o canales de WhatsApp (@newsletter)
        if (
          chatId.includes('status@broadcast') ||
          senderId.includes('status@broadcast') ||
          chatId.endsWith('@newsletter') ||
          senderId.endsWith('@newsletter') ||
          rawChatId.includes('@newsletter')
        ) {
          continue;
        }

        // 🛡️ ESCUDO DE SILENCIO INMEDIATO / OPERADORES / BUCLE ANTI-BOT (Doctrina Eduardo A. Rivera v33.86)
        // Cortar de raíz cualquier interacción con Virgin Mobile (+57 319 251 0001 / LID 148150702633067) para erradicar bucles infinitos de bot contra bot
        if (
          chatId.includes('3192510001') ||
          senderId.includes('3192510001') ||
          rawChatId.includes('3192510001') ||
          rawSenderId.includes('3192510001') ||
          chatId.includes('148150702633067') ||
          senderId.includes('148150702633067') ||
          rawChatId.includes('148150702633067') ||
          rawSenderId.includes('148150702633067')
        ) {
          this.dmMessageBuffers.delete(chatId);
          this.dmMessageBuffers.delete(senderId);
          continue;
        }

        // 🛡️ FILTRO INTELIGENTE DE MENSAJES HISTÓRICOS:
        // Para grupos masivos: permitir hasta 900 segundos (15 minutos) para evitar descarte por ráfagas o reinicios.
        // Para DMs privados (!isGroup): PERMITIR hasta 1800 segundos (30 minutos) atrás para que JanIA
        // NUNCA ignore a un usuario que escribió mientras el socket se reconectaba o el servidor se actualizaba.
        const timestamp = msg.messageTimestamp;
        if (timestamp) {
          const msgAgeSeconds = Math.floor(Date.now() / 1000) - Number(timestamp);
          const maxAgeAllowed = isGroup ? 900 : 1800; // 15 min en grupos, 30 min en DMs privados
          if (msgAgeSeconds > maxAgeAllowed) {
            continue;
          }
        }

        try {
          // --- FLUJO 1: MENSAJES DE GRUPO ---
          if (isGroup) {
            // 🛡️ BLINDAJE DE MENSAJES PROPIOS PROGRAMADOS:
            // Omitir únicamente mensajes emitidos programáticamente por JanIA en esta sesión (tips automáticos, difusiones, etc.)
            const msgId = msg.key?.id || '';
            if (this.botSentMessageIds.has(msgId)) {
              continue;
            }

            // 🚫 BLINDAJE DE LISTA NEGRA: Grupos de seguridad, policía, cuadrantes y comunitarios no inmobiliarios
            const meta = await this.getCachedGroupMetadata(chatId);
            const groupSubject = meta?.subject || "";
            if (isBlacklistedGroup(groupSubject, chatId)) {
              continue;
            }

            const rawMsg = unwrapMessage(msg.message);

            // 🛡️ BLINDAJE DE PROTOCOLO Y CRIPTOGRAFÍA WHATSAPP:
            // Ignorar paquetes de protocolo puro sin contenido (revocaciones sin editar, notificaciones de clave)
            // NOTA DOCTRINAL (v31.97): NUNCA filtrar senderKeyDistributionMessage aquí, pues en WhatsApp grupal
            // viaja habitualmente dentro del mismo mensaje junto al texto o imágenes del usuario.
            if (
              (rawMsg?.protocolMessage && !rawMsg.protocolMessage.editedMessage) ||
              (rawMsg as any)?.e2eNotificationMessage ||
              (rawMsg as any)?.keyTransparency
            ) {
              continue;
            }

            // Ignorar stickers
            if (rawMsg?.stickerMessage) {
              continue;
            }

            // 🚫 IGNORAR REACCIONES DE EMOJIS EN GRUPOS (v32.51):
            // Las reacciones a mensajes ajenos (reactionMessage) NUNCA son publicaciones inmobiliarias
            // ni demandas. Ignorarlas de raíz erradica la saturación del buffer y consumo espurio de cuota LLM.
            if (rawMsg?.reactionMessage) {
              continue;
            }

            // 🛡️ DOCTRINA EDUARDO A. RIVERA (v33.96) — PROHIBICIÓN ABSOLUTA DE AUTO-RESPUESTA Y CONTROL HUMANO EN GRUPOS:
            // 1. JanIA JAMÁS debe responderse a sí misma (ni por fromMe, ni por su teléfono 573192919978, ni por su LID 167108705018103).
            // 2. Si Eduardo o Jani escriben manualmente desde el WhatsApp Web / celular de JanIA en cualquier grupo (!botSentMessageIds.has(msgId)),
            //    JanIA registra la toma de control humana, guarda silencio absoluto y cede el control.
            if (this.isFromOwnBotAccount(msg, senderId)) {
              if (msgId && !this.botSentMessageIds.has(msgId)) {
                this.registerManualGroupTakeover(chatId, msgId);
                console.log(`[JANIA-HUMAN-TAKEOVER] 🛡️ Intervención manual detectada desde la cuenta de JanIA (${senderId}) en el grupo ${chatId} (msgId=${msgId}). JanIA guarda silencio absoluto.`);
              }
              continue;
            }

            let body = '';
            let isAudioPTT = false;
            let imageBufferImmediate: string | undefined = undefined;
            let pdfBufferImmediate: string | undefined = undefined;
            let pdfMimeTypeImmediate: string | undefined = undefined;
            if (rawMsg?.conversation) body = rawMsg.conversation;
            else if (rawMsg?.extendedTextMessage) {
              // Mensajes normales Y mensajes reenviados (contextInfo.isForwarded)
              body = rawMsg.extendedTextMessage.text || '';
              // Enriquecer con preview de enlace si WhatsApp ya resolvió el título/descripción
              const linkTitle = (rawMsg.extendedTextMessage as any).title || '';
              const linkDesc = (rawMsg.extendedTextMessage as any).description || '';
              if (linkTitle || linkDesc) {
                const previewText = [linkTitle, linkDesc].filter(Boolean).join(' ');
                if (previewText && !body.includes(previewText)) {
                  body = `${body}\n${previewText}`.trim();
                }
              }
            }
            else if (rawMsg?.imageMessage) {
              body = rawMsg.imageMessage.caption || '';
              try {
                const downloadedImg = await downloadMediaSafely(msg as any, 'image');
                if (downloadedImg && downloadedImg.length > 0) {
                  imageBufferImmediate = downloadedImg.toString('base64');
                  console.log(`[JANIA-MATCH] 📷 Imagen flyer descargada inmediatamente (${(downloadedImg.length / 1024).toFixed(1)} KB) de ${senderId}`);
                }
              } catch (imgErr: any) {
                console.warn('[JANIA-MATCH] Error descargando imagen flyer inmediatamente:', imgErr?.message || imgErr);
              }
            }
            else if (rawMsg?.documentMessage) {
              body = rawMsg.documentMessage.caption || rawMsg.documentMessage.fileName || rawMsg.documentMessage.title || '';
              try {
                const downloadedDoc = await downloadMediaSafely(msg as any, 'document');
                if (downloadedDoc && downloadedDoc.length > 0) {
                  pdfBufferImmediate = downloadedDoc.toString('base64');
                  pdfMimeTypeImmediate = rawMsg.documentMessage.mimetype || 'application/pdf';
                }
              } catch (docErr: any) { }
            }
            else if (rawMsg?.videoMessage) body = rawMsg.videoMessage.caption || '';
            else if (rawMsg?.audioMessage) {
              isAudioPTT = true;
              // Transcribir el audio real usando Gemini vía Baileys downloadMediaSafely
              try {
                console.log(`[JANIA-MATCH] Transcribiendo audio PTT de ${senderId} en grupo ${chatId}...`);
                const audioBuffer = await downloadMediaSafely(msg as any, 'audio');

                if (audioBuffer && audioBuffer.length > 0) {
                  const mimeType = rawMsg.audioMessage.mimetype || 'audio/ogg; codecs=opus';
                  const transcription = await transcribeAudioBuffer(audioBuffer, mimeType);
                  if (transcription && transcription.trim() !== '') {
                    body = transcription.trim();
                    console.log(`[JANIA-MATCH] Transcripción exitosa: "${body.substring(0, 80)}..."`);
                  } else {
                    body = '[audio-vacío]';
                  }
                } else {
                  body = '[audio-sin-buffer]';
                }
              } catch (audioErr: any) {
                console.error('[JANIA-MATCH] Error al transcribir audio PTT:', audioErr.message || audioErr);
                body = '[audio-error]';
              }
            }
            // Tipos especiales: links preview, botones, catálogo, productos de WhatsApp
            else if ((msg.message as any).templateMessage) {
              const tmpl = (msg.message as any).templateMessage;
              body = tmpl.hydratedTemplate?.hydratedContentText || tmpl.hydratedFourRowTemplate?.hydratedContentText || '';
            }
            else if ((msg.message as any).buttonsMessage) {
              body = (msg.message as any).buttonsMessage.contentText || '';
            }
            else if ((msg.message as any).listMessage) {
              body = (msg.message as any).listMessage.description || (msg.message as any).listMessage.title || '';
            }
            else if ((msg.message as any).productMessage) {
              const prod = (msg.message as any).productMessage?.product;
              body = [prod?.title, prod?.description, prod?.priceAmount1000 ? `$${Math.round(prod.priceAmount1000 / 1000).toLocaleString('es-CO')}` : ''].filter(Boolean).join(' - ');
            }
            else if (rawMsg?.reactionMessage) {
              body = rawMsg.reactionMessage.text || '';
            }
            // Detectar si el mensaje cita una nota de voz previa (contextInfo.quotedMessage.audioMessage)
            const quotedAudioMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage;
            if (quotedAudioMsg) {
              isAudioPTT = true;
              try {
                const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
                const quotedParticipant = contextInfo?.participant || chatId;
                const quotedPhone = quotedParticipant.split('@')[0];
                console.log(`[JANIA-MATCH] Transcribiendo audio CITADO de +${quotedPhone} en grupo ${chatId}...`);

                let audioBuffer: Buffer | null = null;
                try {
                  const stream = await downloadContentFromMessage(quotedAudioMsg, 'audio');
                  let chunks: Buffer[] = [];
                  for await (const chunk of stream) chunks.push(chunk);
                  audioBuffer = Buffer.concat(chunks);
                } catch (e) {
                  const fakeMsg: proto.IWebMessageInfo = {
                    key: {
                      remoteJid: chatId,
                      id: contextInfo?.stanzaId || 'quoted-audio',
                      fromMe: false,
                      participant: quotedParticipant
                    },
                    message: {
                      audioMessage: quotedAudioMsg
                    }
                  };
                  audioBuffer = await downloadMediaMessage(fakeMsg as any, 'buffer', {}) as Buffer;
                }

                if (audioBuffer && audioBuffer.length > 0) {
                  const mimeType = quotedAudioMsg.mimetype || 'audio/ogg; codecs=opus';
                  const transcription = await transcribeAudioBuffer(audioBuffer, mimeType);
                  if (transcription && transcription.trim() !== '') {
                    console.log(`[JANIA-MATCH] Transcripción de audio citado exitosa: "${transcription.substring(0, 80)}..."`);
                    const quotedNote = `[Consulta en audio citada de +${quotedPhone}]: "${transcription.trim()}"`;
                    body = body ? `${body}\n\n${quotedNote}` : quotedNote;
                  }
                }
              } catch (quotedAudioErr: any) {
                console.error('[JANIA-MATCH] Error al transcribir audio citado:', quotedAudioErr?.message || quotedAudioErr);
              }
            } else if (!body && msg.message.extendedTextMessage?.contextInfo?.quotedMessage) {
              const qm = msg.message.extendedTextMessage.contextInfo.quotedMessage;
              body = qm.conversation || qm.extendedTextMessage?.text || qm.imageMessage?.caption || '';
            }

            const botJid = this.sock?.user?.id ? cleanJid(this.sock.user.id) : '';
            const botPhone = botJid ? botJid.split('@')[0] : '573192919978';
            const textLower = body.toLowerCase();
            const hasDirectMention = this.isBotDirectlyMentioned(msg, body);

            // --- IDENTIFICACIÓN DE GRUPOS OFICIALES VECY ---
            const isMainGroup = chatId === this.targetGroupId;     // 𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴
            const isBuzonGroup = chatId === this.buzonGroupId;     // 𝗩𝗘𝗖𝗬 𝗧𝗜𝗣𝗦💡/𝗡𝗢𝗧𝗜𝗖𝗜𝗔𝗦📰/𝗖𝗢𝗡𝗦𝗨𝗟𝗧𝗔𝗦 𝗜𝗡𝗠𝗢𝗕𝗜𝗟𝗜𝗔𝗥𝗜𝗔𝗦⁉️🏠
            const isCirculoGroup = chatId === this.circuloGroupId; // 𝗣𝗥𝗢𝗬𝗘𝗖𝗧𝗢: 🌐 "𝗩𝗘𝗖𝗬𝗕𝗜𝗘𝗡𝗘𝗦𝗥𝗔𝗜𝗖𝗘𝗦"🚀
            const isOfficialGroup = isMainGroup || isBuzonGroup || isCirculoGroup;

            // --- OBTENCIÓN DEL NOMBRE DEL GRUPO Y FILTRADO INMOBILIARIO ESTRICTO ---
            const groupName = await this.resolveGroupName(chatId);

            // Si no es grupo oficial VECY, omitir únicamente si es un chat explícito ajeno (familia, seguridad, etc.)
            if (!isOfficialGroup) {
              const gNameLower = groupName.toLowerCase();

              const NON_REAL_ESTATE_KEYWORDS = [
                "seguridad", "policía", "policia", "patrulla", "amigos", "curso",
                "talento tech", "familia", "convivencia",
                "negociación arrecifes", "venta alameda", "proceso cristo rey"
              ];

              // Si el nombre contiene palabras clave inmobiliarias (inmobiliari, inmueble, propiedad, asesores, bienes raíces, vivencias),
              // NO es un grupo ajeno aunque contenga palabras como "anécdotas" (ej: "anécdotas y vivencias inmobiliarias").
              const isRealEstateException = gNameLower.includes("inmobiliari") ||
                gNameLower.includes("inmuebl") ||
                gNameLower.includes("propiedad") ||
                gNameLower.includes("finca") ||
                gNameLower.includes("asesor") ||
                gNameLower.includes("vivencias") ||
                gNameLower.includes("bienes ra");

              const isNonRealEstateGroup = !isRealEstateException && NON_REAL_ESTATE_KEYWORDS.some(kw => gNameLower.includes(kw));

              // Si es un grupo ajeno y NO hay mención directa a JanIA, omitir
              if (isNonRealEstateGroup && !hasDirectMention) {
                // Omitir chats ajenos (familia, seguridad, etc.)
                return;
              }
            }

            // Grupos externos: JanIA capta todo sin discriminar por longitud.
            // Clasificación y reacción con la Matriz Doctrinal de 6 Emojis (v23.0):
            // Oferta: 👍 Venta | 👌 Arriendo | 🔀 Permuta
            // Demanda: 📝 Venta | ✏️ Arriendo | 🔄 Permuta


            // Si es una publicación comercial, procesar con el buffer extractor (Modo Silencioso)
            const hasRawMedia = !!rawMsg?.imageMessage || !!rawMsg?.documentMessage || !!rawMsg?.videoMessage || isAudioPTT;
            const isReactionMessage = !!rawMsg?.reactionMessage;

            // 🛡️ DESCARTAR MENSAJES VACÍOS SIN TEXTO NI MULTIMEDIA:
            if (!body.trim() && !hasRawMedia) {
              continue;
            }

            const isPossibleListing =
              body.length > 70 ||
              body.split('\n').length >= 2 ||
              hasRawMedia ||
              textLower.includes("http") ||
              textLower.includes("www") ||
              textLower.includes("ofrezco") ||
              textLower.includes("busco") ||
              textLower.includes("vendo") ||
              textLower.includes("venta") ||
              textLower.includes("arriendo") ||
              textLower.includes("ariendo") ||
              textLower.includes("compro") ||
              textLower.includes("necesito") ||
              textLower.includes("renta") ||
              textLower.includes("alquilo") ||
              textLower.includes("permuto") ||
              textLower.includes("permuta") ||
              textLower.includes("requiero") ||
              textLower.includes("requerimiento") ||
              textLower.includes("casa") ||
              textLower.includes("apto") ||
              textLower.includes("apartamento") ||
              textLower.includes("bodega") ||
              textLower.includes("oficina") ||
              textLower.includes("edificio") ||
              textLower.includes("lote") ||
              textLower.includes("local") ||
              textLower.includes("finca") ||
              textLower.includes("terreno") ||
              textLower.includes("predio") ||
              textLower.includes("campestre") ||
              textLower.includes("fanegada") ||
              textLower.includes("fanegadas") ||
              textLower.includes("hectarea") ||
              textLower.includes("hectárea") ||
              textLower.includes("hect") ||
              textLower.includes("parque") ||
              textLower.includes("inversion") ||
              textLower.includes("inversión") ||
              textLower.includes("penthouse") ||
              textLower.includes("apartaestudio") ||
              textLower.includes("duplex") ||
              textLower.includes("dúplex") ||
              textLower.includes("parqueadero") ||
              textLower.includes("alcoba") ||
              textLower.includes("habitacion") ||
              textLower.includes("habitación") ||
              textLower.includes("metro") ||
              textLower.includes("mts") ||
              textLower.includes("mts2") ||
              textLower.includes("m2") ||
              textLower.includes("precio") ||
              textLower.includes("presupuesto") ||
              textLower.includes("millones") ||
              textLower.includes("millon") ||
              textLower.includes("canon") ||
              textLower.includes("comisión") ||
              textLower.includes("comision") ||
              textLower.includes("valor");


            // Detectar consultas comunes sobre cómo publicar, cómo funciona el bot/grupo, guardado, mecánica, datos faltantes, etc.
            const isHelpOrSystemQuery =
              !isPossibleListing && (
                textLower.includes("cómo subo") || textLower.includes("como subo") ||
                textLower.includes("cómo publico") || textLower.includes("como publico") ||
                textLower.includes("cómo se publica") || textLower.includes("como se publica") ||
                textLower.includes("cómo registrar") || textLower.includes("como registrar") ||
                textLower.includes("cómo funciona") || textLower.includes("como funciona") ||
                textLower.includes("de qué consiste") || textLower.includes("de que consiste") ||
                textLower.includes("en qué consiste") || textLower.includes("en que consiste") ||
                textLower.includes("cómo hago para") || textLower.includes("como hago para") ||
                textLower.includes("cómo buscar") || textLower.includes("como buscar") ||
                textLower.includes("cómo encontrar") || textLower.includes("como encontrar") ||
                textLower.includes("mecánica del grupo") || textLower.includes("mecanica del grupo") ||
                textLower.includes("quedó guardado") || textLower.includes("quedo guardado") ||
                textLower.includes("se guardó") || textLower.includes("se guardo") ||
                textLower.includes("fue guardado") ||
                textLower.includes("faltó algún dato") || textLower.includes("falto algun dato") ||
                textLower.includes("faltó un dato") || textLower.includes("falto un dato") ||
                textLower.includes("datos faltantes") ||
                textLower.includes("subió correctamente") || textLower.includes("subio correctamente") ||
                textLower.includes("fue subido") ||
                textLower.includes("mejor forma de publicar") ||
                textLower.includes("cómo es mejor") || textLower.includes("como es mejor") ||
                textLower.includes("para obtener resultados") ||
                (textLower.includes("ayuda") && textLower.includes("inmueble")) ||
                (textLower.includes("explicar") && textLower.includes("grupo")) ||
                (textLower.includes("cómo") && textLower.includes("grupo"))
              );

            // En Soporte Legal y Círculo Cero: responder a cualquier texto que no sea cortesía muy corta
            // Los audios PTT nunca se consideran cortesía corta (aunque fallen la transcripción)
            const textClean = body.toLowerCase().trim();
            const isAudioFailed = body === '[audio-vacío]' || body === '[audio-sin-buffer]' || body === '[audio-error]';

            // Detección de continuación de hilo o respuesta afirmativa en grupos conversacionales (Grupo 2 y 3)
            const isAffirmativeFollowUp = /^(?:s[ií]|claro|dale|de\s*una|por\s*favor|adelante|me\s*gustar[ií]a|cu[eé]ntame|s[ií]\s*👍|si\s*👍|s[ií]\s*por\s*favor|claro\s*que\s*s[ií]|de\s*acuerdo)(?:[\s!.,]|$)/i.test(textClean);

            const contextInfo = (msg.message as any)?.extendedTextMessage?.contextInfo
              || (msg.message as any)?.contextInfo;
            const quotedParticipant = contextInfo?.participant ? cleanJid(contextInfo.participant) : '';
            const isQuotingBot = !!contextInfo?.quotedMessage && (
              (botJid && quotedParticipant === botJid) ||
              quotedParticipant.startsWith(botPhone) ||
              quotedParticipant.startsWith('573192919978') ||
              quotedParticipant.includes('167108705018103')
            );

            // En grupos conversacionales (Soporte Legal y Proyecto Vecy / Círculo Cero),
            // si el usuario responde afirmativamente o cita a JanIA, NUNCA es cortesía corta sino continuación activa:
            const isConversationalContinuation = (isBuzonGroup || isCirculoGroup) && (isAffirmativeFollowUp || isQuotingBot);

            const isShortCourtesy =
              !isAudioPTT && !isConversationalContinuation && (
                textClean.length < 6 ||
                ["ok", "listo", "vale", "gracias", "hola", "hola!", "jaja", "jajaja", "👍", "✅", "👏", "😊", "🙏"].includes(textClean)
              );

            // 👂 Atención silenciosa en grupos: registrar el hilo conversacional reciente sin interrumpir (Doctrina Eduardo A. Rivera v33.96)
            if (body && body.trim() && !isReactionMessage && !this.isFromOwnBotAccount(msg, senderId)) {
              this.recordPassiveGroupContext(chatId, msg.pushName || senderId.split('@')[0], body);
            }

            // En Soporte Legal (Buzón) y Círculo Cero, los mensajes son consultas e interacciones vivas, NO publicaciones estáticas.
            // En grupos externos no oficiales, CAPTURAMOS publicaciones comerciales e inmuebles (descartando cortesías cortas y reacciones).
            // Si el mensaje contiene mención directa a JanIA (hasDirectMention), NO es una publicación desatendida, es una consulta activa.
            const isListingGroup = isMainGroup || (!isBuzonGroup && !isCirculoGroup);
            const isListing = !hasDirectMention && isListingGroup && !isReactionMessage && !isShortCourtesy && (isPossibleListing || !isOfficialGroup || hasRawMedia);

            // En Soporte Legal (Buzón) y Círculo Cero, responder a consultas legítimas o continuaciones de conversación.
            // En grupos externos o Grupo 1, responder ÚNICAMENTE ante mención directa explícita de JanIA (Doctrina Eduardo A. Rivera v33.82):
            const hasMeaningfulQuery = ((textClean.length >= 4 || isConversationalContinuation) && !isShortCourtesy && !isReactionMessage) || hasRawMedia;
            const shouldRespond = (isBuzonGroup || isCirculoGroup)
              ? hasMeaningfulQuery
              : hasDirectMention;

            if (isListing) {
              await this.handleIncomingGroupMessage(msg, chatId, body, imageBufferImmediate, pdfBufferImmediate, pdfMimeTypeImmediate);
              continue;
            }

            if (isOfficialGroup && isShortCourtesy && !isBuzonGroup) {
              const courtesyEmoji = textClean.includes("gracias") ? "🤝" : "👍";
              try {
                await this.sock.sendMessage(chatId, {
                  react: { text: courtesyEmoji, key: msg.key }
                });
              } catch (e) { }
            }

            if (shouldRespond) {
              await this.handleDirectGroupQuestion(msg, chatId, senderId, body);
            }
            continue;
          }

          // --- FLUJO 2: CHATS PRIVADOS (DMs) ---
          if (!isGroup) {
            let resolvedSenderId = senderId;
            if (senderId.endsWith('@lid')) {
              const keyPn = (msg.key as any)?.senderPn || (msg.key as any)?.participantPn;
              const mappedFromCache = this.resolvePhoneForLid(senderId);
              if (keyPn) {
                const cleanUser = String(keyPn).split(':')[0].split('@')[0].replace(/\D/g, '');
                if (cleanUser) {
                  resolvedSenderId = `${cleanUser}@s.whatsapp.net`;
                  this.registerPhoneLidMapping(cleanUser, senderId);
                  console.log(`[JANIA-MATCH] [DM] LID ${senderId} resuelto vía senderPn a PN ${resolvedSenderId}`);
                }
              } else if (mappedFromCache) {
                resolvedSenderId = `${mappedFromCache}@s.whatsapp.net`;
                console.log(`[JANIA-MATCH] [DM] LID ${senderId} resuelto vía caché a PN ${resolvedSenderId}`);
              } else if ((this.sock?.signalRepository as any)?.lidMapping?.getPNForLID) {
                try {
                  const mappedPn = await (this.sock.signalRepository as any).lidMapping.getPNForLID(senderId);
                  if (mappedPn) {
                    const cleanUser = mappedPn.split(':')[0].split('@')[0];
                    resolvedSenderId = `${cleanUser}@s.whatsapp.net`;
                    this.registerPhoneLidMapping(cleanUser, senderId);
                    console.log(`[JANIA-MATCH] [DM] LID ${senderId} resuelto a PN ${resolvedSenderId}`);
                  }
                } catch (err) {
                  console.warn(`[JANIA-MATCH] [DM] No se pudo resolver PN para LID ${senderId}:`, err);
                }
              }
            }

            const rawPhone = resolvedSenderId.split('@')[0];
            const ADMIN_PHONE = process.env.ADMIN_PHONE || "573192919978";
            const botJid = this.sock?.user?.id ? cleanJid(this.sock.user.id) : '';
            const botPhone = botJid ? botJid.split('@')[0] : '573192919978';
            const ADMIN_IDENTIFIERS = [
              "573192919978",
              "573166569719",
              "573188096811", // Línea Directiva Jani Alves (Esposa de Eduardo)
              "167108705018103", // LID Principal Eduardo Rivera / Socket JanIA (creds.me.lid)
              "182781141344345", // LID Directivo Activo Jani Alves
              "225954035179724", // LID Directivo Eduardo Rivera
              "218820279050385", // LID Directivo Alterno Jani Alves
              ADMIN_PHONE
            ];
            const isSelfChat = senderId === botJid || rawPhone === botPhone || rawPhone === "573192919978" || rawPhone === "167108705018103" || senderId.includes("167108705018103");
            const isAdmin = isSelfChat || ADMIN_IDENTIFIERS.some(id => rawPhone.includes(id) || rawPhone === id || senderId.includes(id));
            const userName = msg.pushName || (rawPhone === "182781141344345" || rawPhone === "573188096811" || rawPhone === "218820279050385" ? "Jani Alves" : (rawPhone === "573166569719" ? "VECY BIENES RAÍCES" : (rawPhone === "225954035179724" || rawPhone === "573192919978" || rawPhone === "167108705018103" ? "Eduardo Rivera" : `Asesor +${rawPhone}`)));

            // 🛡️ ESCUDO ANTI-BOTS / META AI / OPERADORES (Virgin Mobile): Jamás procesar mensajes de bots, Meta AI ni operadores móviles
            const isBotOrMetaAi = senderId.includes('@bot') || senderId.includes('13135550002') || senderId.startsWith('0@') || rawPhone === '13135550002' || /meta[\s_-]?ai/i.test(userName || '') || senderId.includes('3192510001') || rawPhone === '573192510001' || rawPhone === '3192510001' || senderId.includes('148150702633067') || rawPhone === '148150702633067' || /virgin[\s_-]?mobile/i.test(userName || '');
            if (isBotOrMetaAi) {
              return;
            }

            // 🛡️ LISTA NEGRA DE SILENCIO TOTAL (Deudores / Operadores Móviles / Casos Sensibles — Doctrina Eduardo A. Rivera v33.84 / v33.86):
            // 1. +57 322 909 7000 (573229097000) -> Yennifer Milena Soto (Deudora - Caso Cristina Flores)
            // 2. +57 321 337 0737 (573213370737) -> Sonia Stella Pérez (Deudora Solidaria Yennifer - Caso Cristina Florez)
            // 3. +57 319 251 0001 (573192510001) -> Virgin Mobile Colombia (Canal corporativo oficial / Operador de telefonía)
            const { isSilencedLegalCaseAccount } = await import('./jania/trustedContacts');
            if (isSilencedLegalCaseAccount(senderId, userName) || isSilencedLegalCaseAccount(resolvedSenderId, userName) || isSilencedLegalCaseAccount(rawPhone, userName)) {
              console.log(`[JANIA-SILENCE-SHIELD] 🛡️ Mensaje de cuenta silenciada (${rawPhone} - ${userName || 'Silenciada'}). JanIA guarda silencio absoluto.`);
              return;
            }

            const rawMsg = unwrapMessage(msg.message);
            let body = '';
            if (rawMsg?.conversation) body = rawMsg.conversation;
            else if (rawMsg?.extendedTextMessage) body = rawMsg.extendedTextMessage.text || '';
            else if (rawMsg?.imageMessage) body = rawMsg.imageMessage.caption || '';
            else if (rawMsg?.documentMessage) body = rawMsg.documentMessage.caption || rawMsg.documentMessage.fileName || rawMsg.documentMessage.title || '';
            else if (rawMsg?.videoMessage) body = rawMsg.videoMessage.caption || '';
            else if (rawMsg?.stickerMessage) body = '😊 [Sticker]';
            else if ((rawMsg as any)?.reactionMessage) body = `[Reacción: ${(rawMsg as any).reactionMessage?.text || 'emoji'}]`;
            else if ((rawMsg as any)?.locationMessage) body = '[Ubicación compartida]';
            else if ((rawMsg as any)?.contactMessage || (rawMsg as any)?.contactsArrayMessage) body = '[Tarjeta de contacto compartida]';

            const cleanStart = body.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");

            // 1. Detectar si el mensaje es del bot o de un humano operando la cuenta de JanIA (fromMe / LID propio)
            if (msg.key.fromMe || this.isFromOwnBotAccount(msg, senderId)) {
              const msgId = msg.key.id || "";

              // Si el propio bot despachó el mensaje programáticamente, ignorar para evitar loops
              if (this.botSentMessageIds.has(msgId)) {
                return;
              }

              // 🛡️ BLINDAJE DE PROTOCOLO: Reacciones y notificaciones jamás son intervención humana para silenciar al bot
              if ((rawMsg as any)?.reactionMessage || (rawMsg as any)?.protocolMessage) {
                return;
              }

              // 🛡️ BLINDAJE DE SELF-CHAT ("Mensajes contigo mismo"):
              // Eduardo utiliza su chat personal como bloc de notas, borradores o enlaces personales.
              // JanIA ÚNICAMENTE debe responder en self-chat si Eduardo la invoca explícitamente (ej: "@JanIA", "JanIA", "Agente JanIA") y NO es un flyer.
              // Si es un "Hola", un borrador, un flyer ("Soy JanIA") o una nota personal sin invocarla, JanIA guarda silencio absoluto.
              if (isSelfChat) {
                const hasExplicitJanIAInvocation =
                  !this.isSelfPresentationOrFlyerOfJanIA(body) &&
                  (/@?jania\b/i.test(body) || cleanStart.startsWith("agente jania"));
                if (!hasExplicitJanIAInvocation) {
                  return;
                }
                console.log(`[JANIA-MATCH] Invocación explícita a JanIA detectada en self-chat (${senderId}). Procediendo a procesar.`);
              } else {
                // 🛡️ TOMA DE CONTROL HUMANA EN DM (Doctrina Eduardo A. Rivera v33.96):
                // Si Eduardo o Jani escriben manualmente desde el WhatsApp Web / celular de JanIA en un chat privado con cualquier persona,
                // cancelamos cualquier respuesta en buffer, silenciamos la sesión automática y JAMÁS auto-respondemos a nuestro propio mensaje.
                const pendingBuf =
                  this.dmMessageBuffers.get(chatId) ||
                  this.dmMessageBuffers.get(senderId) ||
                  this.dmMessageBuffers.get(resolvedSenderId);
                if (pendingBuf?.timer) {
                  clearTimeout(pendingBuf.timer);
                }
                this.dmMessageBuffers.delete(chatId);
                this.dmMessageBuffers.delete(senderId);
                this.dmMessageBuffers.delete(resolvedSenderId);

                const msgTimestampMs = Number(msg.messageTimestamp || 0) * 1000;
                const isRecentMessage = !msgTimestampMs || (Date.now() - msgTimestampMs) < 5 * 60 * 1000;
                if (isRecentMessage && !isAdmin) {
                  console.log(`[JANIA-HUMAN-TAKEOVER] 🛡️ Intervención humana detectada en DM de tercero ${senderId} (${resolvedSenderId}). Silenciando bot y cediendo control.`);
                  this.lastHumanIntervention.set(senderId, Date.now());
                  this.lastHumanIntervention.set(resolvedSenderId, Date.now());
                  const { muteSession } = await import('./janIA');
                  await muteSession(senderId, true).catch(err => console.error("Error muting session in database:", err));
                  if (resolvedSenderId !== senderId) {
                    await muteSession(resolvedSenderId, true).catch(() => {});
                  }
                }
                return;
              }
            }

            // 2. Verificar reactivación ("Agente JanIA", mención directa a JanIA tras pausa humana, o invocación explícita de herramientas)
            const { isSessionMuted, muteSession } = await import('./janIA');
            let isMuted = (isSelfChat || isAdmin) ? false : (await isSessionMuted(senderId) || (resolvedSenderId !== senderId ? await isSessionMuted(resolvedSenderId) : false));

            if (isMuted) {
              const { extractCedulaForVerification } = await import('./identityVerificationService');
              const { extractNotarialExpenseParams, hasPendingNotarialSession } = await import('./notarialExpenseService');
              const isCedulaReq = extractCedulaForVerification(body, true).found;
              const isPredialReq = body.toLowerCase().includes('predial') || body.toLowerCase().includes('chip') || body.toLowerCase().includes('hacienda');
              const isIduReq = body.toLowerCase().includes('idu') || body.toLowerCase().includes('valorizacion') || body.toLowerCase().includes('valorización');
              const isNotarialReq = hasPendingNotarialSession(senderId) || extractNotarialExpenseParams(body, senderId).found || /(?:gastos?\s*notariales?|derechos?\s*notariales?|escrituraci[oó]n|registro\s*y\s*notar[ií]a|liquidaci[oó]n\s*notarial|impuesto\s*de\s*registro|beneficencia|retenci[oó]n\s*en\s*la\s*fuente|firmar\s*promesa|promesa\s*de\s*compraventa|voy\s*(?:para|a)\s*(?:la\s*)?notar[ií]a|afectaci[oó]n\s*familiar|patrimonio\s*de\s*familia|patrimonio\s*cultural|inter[eé]s\s*cultural)/i.test(body);
              const lastHumanTs = Math.max(
                this.lastHumanIntervention.get(senderId) || 0,
                this.lastHumanIntervention.get(resolvedSenderId) || 0
              );
              const isDirectInvocationAfterHumanPause =
                !this.isSelfPresentationOrFlyerOfJanIA(body) &&
                /\b(?:@?jania|agente\s+jania)\b/i.test(body) &&
                (Date.now() - lastHumanTs > 60 * 1000);

              if (cleanStart.startsWith("agente jania") || isDirectInvocationAfterHumanPause || isCedulaReq || isPredialReq || isIduReq || isNotarialReq) {
                await muteSession(senderId, false).catch(err => console.error("Error unmuting session:", err));
                if (resolvedSenderId !== senderId) {
                  await muteSession(resolvedSenderId, false).catch(() => {});
                }
                isMuted = false;
                console.log(`[JANIA-MATCH] Sesión reactivada automáticamente para ${senderId}`);
              }
            }

            // 🛡️ ESCUDO ANTI-AUTO-RESPUESTA DE WHATSAPP BUSINESS POST-CONFIRMACIÓN VECY AGENDA PRO (Doctrina v33.95):
            // Si hace menos de 90s enviamos una confirmación de Vecy Agenda Pro a este número/LID y su WhatsApp Business
            // dispara automáticamente un mensaje de bienvenida ("Gracias por comunicarte con... ¿cómo puedo ayudarte?"),
            // reaccionamos con ✅ sin disparar una respuesta LLM redundante que confunda al solicitante.
            const recentAgenda =
              this.recentAgendaConfirmations.get(rawPhone) ||
              this.recentAgendaConfirmations.get(senderId) ||
              this.recentAgendaConfirmations.get(senderId.split('@')[0]);
            if (
              recentAgenda &&
              Date.now() - recentAgenda.timestamp < 90 * 1000 &&
              this.isWhatsAppBusinessAutoGreeting(body)
            ) {
              console.log(`[JANIA-AGENDA-SHIELD] 🤖 Saludo automático de WhatsApp Business detectado tras confirmación de Vecy Agenda Pro (#${recentAgenda.solicitudId || 'N/A'}) de ${rawPhone} (${senderId}). Reaccionando con ✅ y omitiendo respuesta LLM.`);
              try {
                const reactRes = await this.sock.sendMessage(senderId, { react: { text: '✅', key: msg.key } });
                if (reactRes?.key?.id) {
                  this.botSentMessageIds.add(reactRes.key.id);
                }
              } catch (_) { }
              return;
            }

            // 3. Buffer de mensajes de DM privado: preservar el JID entrante (@lid si vino por LID) para responder en el hilo exacto
            const targetDmId = senderId.endsWith('@lid') ? senderId : (resolvedSenderId || senderId);
            let buffer = this.dmMessageBuffers.get(targetDmId);
            if (!buffer) {
              buffer = { messages: [], timer: null };
              this.dmMessageBuffers.set(targetDmId, buffer);
            }

            buffer.messages.push(msg);

            // ⚡ Simulación de presencia inmediata: Mostrar 'composing' (escribiendo...) en todo chat privado
            try {
              this.sock.presenceSubscribe?.(targetDmId)?.catch?.(() => {});
              await this.sock.sendPresenceUpdate('composing', targetDmId);
            } catch (_) { }

            if (buffer.timer) {
              clearTimeout(buffer.timer);
            }

            buffer.timer = setTimeout(async () => {
              this.dmMessageBuffers.delete(targetDmId);
              try {
                await this.processBufferedDmMessages(targetDmId, userName, rawPhone, buffer.messages, isAdmin, isSelfChat);
              } catch (err) {
                console.error("[JANIA-MATCH] Error al procesar mensajes de DM acumulados:", err);
              }
            }, 1500); // 1.5 segundos para respuesta ágil
            return;
          }

        } catch (err) {
          console.error('[JANIA-MATCH] Error en procesador de eventos de mensaje:', err);
        }
      }
    });
  }

  private async processBufferedDmMessages(
    senderId: string,
    userName: string,
    rawPhone: string,
    messages: any[],
    isAdmin: boolean,
    isSelfChat: boolean = false
  ) {
    const { isSilencedLegalCaseAccount } = await import('./jania/trustedContacts');
    if (isSilencedLegalCaseAccount(senderId, userName) || isSilencedLegalCaseAccount(rawPhone, userName)) {
      console.log(`[JANIA-SILENCE-SHIELD] 🛡️ Buffer DM descartado por cuenta silenciada (${senderId} - ${userName}). Silencio total.`);
      return;
    }

    // 1. Combinar cuerpos de texto y buscar imágenes, documentos o notas de voz
    let combinedBody = "";
    let mainMsg = messages[messages.length - 1]; // Usar el último mensaje como referencia para respuestas/reacciones
    let imageBuffer: string | undefined;
    let pdfBuffer: string | undefined;
    let pdfMimeType: string | undefined;
    let isAudioPTT = false;

    for (const msg of messages) {
      const rawMsg = unwrapMessage(msg.message);
      let body = '';
      if (rawMsg?.conversation) body = rawMsg.conversation;
      else if (rawMsg?.extendedTextMessage) body = rawMsg.extendedTextMessage.text || '';
      else if (rawMsg?.imageMessage) body = rawMsg.imageMessage.caption || '';
      else if (rawMsg?.documentMessage) body = rawMsg.documentMessage.caption || rawMsg.documentMessage.fileName || rawMsg.documentMessage.title || '';
      else if (rawMsg?.videoMessage) body = rawMsg.videoMessage.caption || '';
      else if (rawMsg?.stickerMessage) body = '😊 [Sticker]';
      else if ((rawMsg as any)?.reactionMessage) body = `[Reacción: ${(rawMsg as any).reactionMessage?.text || 'emoji'}]`;
      else if ((rawMsg as any)?.locationMessage) body = '[Ubicación compartida]';
      else if ((rawMsg as any)?.contactMessage || (rawMsg as any)?.contactsArrayMessage) body = '[Tarjeta de contacto compartida]';
      else if (rawMsg?.audioMessage) {
        isAudioPTT = true;
        try {
          console.log(`[JANIA-MATCH] Transcribiendo nota de voz PTT de DM ${senderId}...`);
          const audioBuffer = await downloadMediaSafely(msg as any, 'audio');
          if (audioBuffer && audioBuffer.length > 0) {
            const mimeType = rawMsg.audioMessage.mimetype || 'audio/ogg; codecs=opus';
            const transcription = await transcribeAudioBuffer(audioBuffer, mimeType);
            if (transcription && transcription.trim() !== '') {
              body = transcription.trim();
              console.log(`[JANIA-MATCH] Transcripción exitosa de DM: "${body.substring(0, 80)}..."`);
            }
          }
        } catch (audioErr: any) {
          console.error('[JANIA-MATCH] Error al transcribir nota de voz DM:', audioErr.message || audioErr);
        }
      }

      if (body.trim()) {
        combinedBody += (combinedBody ? "\n" : "") + body.trim();
      }

      if (rawMsg?.imageMessage && !imageBuffer) {
        try {
          const media = await downloadMediaSafely(msg as any, 'image');
          if (media && media.length > 0) {
            imageBuffer = media.toString('base64');
            mainMsg = msg; // El mensaje con la imagen se vuelve el mensaje de referencia
          }
        } catch (e) { }
      }
      if (rawMsg?.documentMessage && !pdfBuffer) {
        try {
          const media = await downloadMediaSafely(msg as any, 'document');
          if (media && media.length > 0) {
            pdfBuffer = media.toString('base64');
            pdfMimeType = rawMsg.documentMessage.mimetype || 'application/pdf';
            mainMsg = msg; // El mensaje con el pdf se vuelve el mensaje de referencia
          }
        } catch (e) { }
      }
      if (!imageBuffer && !pdfBuffer) {
        const quotedDmMedia = await this.extractQuotedContextAndMedia(msg, rawMsg);
        if (quotedDmMedia.quotedImageBuffer) imageBuffer = quotedDmMedia.quotedImageBuffer;
        if (quotedDmMedia.quotedPdfBuffer) {
          pdfBuffer = quotedDmMedia.quotedPdfBuffer;
          pdfMimeType = quotedDmMedia.quotedPdfMimeType || 'application/pdf';
        }
        if (quotedDmMedia.quotedContext && !combinedBody.includes(quotedDmMedia.quotedContext)) {
          combinedBody += (combinedBody ? `\n${quotedDmMedia.quotedContext}` : quotedDmMedia.quotedContext);
        }
      }
    }

    if (!combinedBody.trim() && !imageBuffer && !pdfBuffer) {
      return;
    }

    const chatId = senderId;
    const body = combinedBody;
    console.log(`[JANIA-MATCH] [DM] Procesando buffer DM de ${messages.length} mensaje(s) de ${senderId} (${userName}, Tel: ${rawPhone}): "${body}"`);

    // 💾 REGISTRO PERSISTENTE DEL MENSAJE DEL USUARIO EN POSTGRESQL (Doctrina v32.53):
    // Garantiza que JanIA recuerde todo el contexto del día hasta las 23:59 incluso ante reinicios de PM2
    await this.logToDb(senderId, 'user', body);

    // 🌟 REACCIÓN EMPÁTICA CONTEXTUAL INMEDIATA EN DMs:
    // JanIA reacciona de inmediato con un emoji acorde al contenido exacto del mensaje (predial 🏛️, cédula 🛡️, asesoría ⚖️, saludo 👋, etc.)
    // para sentirse viva, atenta y 100% humana ante cualquier interacción.
    try {
      const { getEmpatheticReactionEmoji } = await import('./whatsapp-utils');
      const contextualEmoji = getEmpatheticReactionEmoji(body, {
        isAudio: isAudioPTT,
        hasImage: !!imageBuffer,
        hasPdf: !!pdfBuffer
      });
      const reactRes = await this.sock.sendMessage(senderId, { react: { text: contextualEmoji, key: mainMsg.key } }).catch(() => { });
      if (reactRes?.key?.id) {
        this.botSentMessageIds.add(reactRes.key.id);
      }
    } catch (_) { }

    // Interceptar confirmaciones de Match (SÍ #M123 o NO #M123) para cualquier usuario (Double Opt-In)
    const matchConfirmationRegex = /^\s*(sí|si|no)\s+#m(\d+)\s*$/i;
    const matchConfirm = body.match(matchConfirmationRegex);
    if (matchConfirm) {
      const decision = matchConfirm[1].toLowerCase();
      const matchId = parseInt(matchConfirm[2], 10);
      await this.processMatchConfirmation(senderId, userName, matchId, decision);
      return;
    }

    // ⏱️ PROTOCOLO DE URBANIDAD DE CARREÑO Y CALIFICACIÓN:
    // Si el usuario escribe antes de que se cumpla el minuto de silencio, cancelamos el timer pendiente
    const pendingPoliteTimer = this.userPolitenessTimers.get(senderId);
    if (pendingPoliteTimer) {
      clearTimeout(pendingPoliteTimer);
      this.userPolitenessTimers.delete(senderId);
    }

    // 🤖 PROTOCOLO DE INTERACCIÓN IA PURA EN CHAT PRIVADO:
    // JanIA está al servicio incondicional del usuario y NO se frena ante ningún mensaje.
    // Conversa, asiste y procesa ante cualquier texto, número, signo, punto, imagen o documento entrante.
    const cleanLower = body.trim().toLowerCase();
    const shouldEngageConversational = true;

    if (shouldEngageConversational && (body.trim() || imageBuffer || pdfBuffer)) {
      // 📸 Análisis de visión si el mensaje contiene imagen
      let flyerVisionData: any = null;
      if (imageBuffer) {
        try {
          const { extractFlyerVisionSafely } = await import('./jania/vision');
          flyerVisionData = await extractFlyerVisionSafely(imageBuffer);
        } catch (visErr: any) {
          console.warn('[JANIA-MATCH] [DM] Error en análisis visual:', visErr?.message || visErr);
        }
      }

      // Si es un afiche/flyer comercial legítimo (oferta o demanda)
      if (flyerVisionData && flyerVisionData.isFlyerOrBanner && (flyerVisionData.classification === "INMUEBLE" || flyerVisionData.classification === "REQUERIMIENTO")) {
        // Ingestar en la base de datos de inmuebles en segundo plano
        try {
          const { processWhatsAppMessage } = await import('./jania/handlers/propertiesHandler');
          processWhatsAppMessage(
            body || flyerVisionData.flyerVerbatimText || "Publicación de inmueble por flyer",
            senderId,
            userName,
            true,
            [],
            undefined,
            imageBuffer,
            false,
            pdfBuffer,
            pdfMimeType,
            undefined,
            undefined,
            flyerVisionData
          ).catch(e => console.warn('[JANIA-MATCH] Error ingesting flyer in propertiesHandler:', e));
        } catch (_) {}

        // Si el usuario NO envió texto conversacional (solo envió la imagen del flyer sin pregunta), responder con acuse de captación inteligente:
        if (!body.trim() || body.trim().length < 5) {
          const stopPresence = startContinuousPresence(this.sock, senderId, 'composing');
          try {
            const flyerTitle = flyerVisionData.title || (flyerVisionData.classification === "INMUEBLE" ? "Inmueble en Oferta" : "Requerimiento Inmobiliario");
            const flyerReply = `¡Excelente! He analizado tu afiche comercial con visión artificial: *${flyerTitle}* 📸✨.\n\n` +
              `Ha quedado captado en nuestro sistema de VECY BIENES RAÍCES para cruzarlo con nuestra base de datos inmobiliaria 🏢✨. Si necesitas consultar el predial en Bogotá o verificar antecedentes de tu cliente, dime y te colaboro de inmediato 🤝.`;
            await this.queuedSend(senderId, flyerReply, { quoted: mainMsg, allowDirectMessage: true });
            const { appendDmHistory } = await import('./janIA');
            appendDmHistory(senderId, 'user', body || `[Flyer: ${flyerTitle}]`);
            appendDmHistory(senderId, 'assistant', flyerReply);
            await this.logToDb(senderId, 'janIA', flyerReply);
            return;
          } finally {
            stopPresence();
          }
        }
      }

      let stopPresence = startContinuousPresence(this.sock, senderId, 'composing');
      try {
        const { processPrivateDmConversationalMessage } = await import('./jania/handlers/dmHandler');
        const reply = await processPrivateDmConversationalMessage(body, senderId, userName, {
          imageBuffer,
          pdfBuffer,
          pdfMimeType,
          isAudio: isAudioPTT,
          flyerVisionData
        });
        if (reply && reply.trim()) {
          console.log(`[JANIA-MATCH] [DM-AI] Respuesta de IA pura para ${senderId} (${userName}): "${reply.substring(0, 60)}..."`);

          // 🎙️ Soporte Nativo de Notas de Voz PTT en DMs (si el usuario envió audio o solicita respuesta por voz)
          const { detectaVoz, textToSpeechMedia, cleanVoiceText } = await import('./whatsapp-utils');
          const wantsVoice = detectaVoz(body);
          const shouldSendVoice = wantsVoice || isAudioPTT;

          if (shouldSendVoice) {
            try {
              console.log(`[JANIA-MATCH] [DM-AI] Generando respuesta en nota de voz PTT para ${senderId}...`);
              // Detener 'composing' e iniciar 'recording' continuo ("Grabando audio... 🎙️")
              stopPresence();
              stopPresence = startContinuousPresence(this.sock, senderId, 'recording');
              const cleanText = cleanVoiceText(String(reply));
              const media = await textToSpeechMedia(cleanText);
              if (media && media.data) {
                // Mantener activa la presencia 'Grabando audio... 🎙️' durante al menos 1.8s para visibilidad total en el móvil del usuario
                await new Promise(r => setTimeout(r, 1800));
                const audioBuffer = Buffer.from(media.data, 'base64');
                await this.queuedSend(senderId, {
                  audio: audioBuffer,
                  mimetype: media.mimetype || 'audio/ogg; codecs=opus',
                  ptt: true
                }, { quoted: mainMsg, allowDirectMessage: true, skipDelay: true });
                await this.logToDb(senderId, 'janIA', `[Nota de Voz PTT]: ${String(reply)}`);

                // Si la respuesta contenía enlaces URLs (como el canal de WhatsApp o el bróker),
                // despachar también el texto para que el usuario tenga el enlace clickable en su pantalla
                if (reply.includes('http')) {
                  await this.queuedSend(senderId, reply, { allowDirectMessage: true, skipDelay: true });
                }



                // Despacho desacoplado de reseña de Google en mensaje aparte siempre si hay gratitud o cierre genuino (v33.24)
                const isSenderAdminVoice = /eduardo/i.test(userName || "") ||
                  /jani/i.test(userName || "") ||
                  senderId.includes("3192919978") ||
                  senderId.includes("225954035179724") ||
                  senderId.includes("3118536968") ||
                  senderId.includes("3166569719");

                const isLongQueryVoice = cleanLower.includes("?") ||
                  cleanLower.split(/\s+/).filter(Boolean).length > 15 ||
                  /\b(?:pregunta|caso|arriendo|contrato|inmueble|canon|ipc|otro\s*si|poliza|seguro|cuanto|como|donde|cuando|por\s*que)\b/i.test(cleanLower);

                const isGratitudeOrClosing = !isSenderAdminVoice && !isLongQueryVoice && (
                  /^(?:(?:ok|vale|listo|bueno|mil|muchas)\s+)?gracias[\s.!,]*$/i.test(cleanLower.trim()) ||
                  /^(?:muchas\s*gracias|mil\s*gracias|muy\s*amable|hasta\s*luego|chao|genial\s*gracias|perfecto\s*gracias|quedamos\s*as[ií])[\s.!,]*$/i.test(cleanLower.trim()) ||
                  (cleanLower.length <= 45 && !cleanLower.includes("?") && /^(?:gracias|agradecid[ao]|bendiciones|hasta\s*pronto|feliz\s*(?:d[ií]a|tarde|noche))[\s.!,]*$/i.test(cleanLower.trim()))
                );
                const lastReviewSent = this.recentReviewPromptUsers.get(senderId) || 0;
                const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

                if (!isSenderAdminVoice && lastReviewSent < oneDayAgo) {
                  try {
                    const { getUserPerpetualSession } = await import('./jania/sessionManager');
                    const session = await getUserPerpetualSession(senderId, userName);
                    const hasVerified = Boolean(session?.hasVerifiedGoogleReview);

                    if (!hasVerified) {
                      if (isGratitudeOrClosing) {
                        this.recentReviewPromptUsers.set(senderId, Date.now());
                        const isRecurrent = (session.freeServicesUsedCount || 0) >= 2;
                        const { formatImmediatePoliteReviewMessage, formatPersuasiveRecurrentUserReviewMessage } = await import('./politenessService');
                        const politeMsg = isRecurrent
                          ? formatPersuasiveRecurrentUserReviewMessage(userName)
                          : formatImmediatePoliteReviewMessage(userName);
                        await new Promise(r => setTimeout(r, 1500));
                        await this.queuedSend(senderId, politeMsg, { allowDirectMessage: true, skipDelay: true });
                        await this.logToDb(senderId, 'janIA', politeMsg);
                        const { appendDmHistory } = await import('./janIA');
                        appendDmHistory(senderId, 'assistant', politeMsg);
                      }
                    }
                  } catch (vRevErr: any) {
                    console.warn('[JANIA-MATCH] Error en despacho desacoplado de reseña de voz:', vRevErr?.message);
                  }
                }

                return;
              }
            } catch (ttsErr: any) {
              console.warn('[JANIA-MATCH] [DM-AI] Error generando nota de voz, enviando texto como fallback:', ttsErr?.message);
            }
          }

          const {
            popLatestDmPdf,
            popLatestDmSticker,
            popLatestDmCreativeImage,
            popLatestDmLocationPin,
            popLatestDmVCard,
            popLatestDmInteractivePoll
          } = await import('./jania/handlers/dmHandler');
          const latestPdf = popLatestDmPdf(senderId);
          const latestSticker = popLatestDmSticker(senderId);
          const latestCreativeImage = popLatestDmCreativeImage(senderId);
          const latestLocationPin = popLatestDmLocationPin(senderId);
          const latestVCard = popLatestDmVCard(senderId);
          const latestPoll = popLatestDmInteractivePoll(senderId);
          const pdfBuffer = (reply as any)?.pdfBuffer || latestPdf?.pdfBuffer;
          const pdfFileName = (reply as any)?.pdfFileName || latestPdf?.pdfFileName;
          const isSenderAdmin = /eduardo/i.test(userName || "") ||
            /jani/i.test(userName || "") ||
            senderId.includes("3192919978") ||
            senderId.includes("225954035179724") ||
            senderId.includes("3118536968") ||
            senderId.includes("3166569719");

          let replyText = String(reply || "").trim();

          // 🛡️ BLINDAJE INMUTABLE ANTI-FUGA DE JID/LID EN DMs (v33.45):
          const isIdentifierLeak =
            replyText.includes("@lid") ||
            replyText.includes("@s.whatsapp.net") ||
            replyText.includes("@g.us") ||
            /^\+?\d{8,18}$/.test(replyText);

          if (isIdentifierLeak) {
            console.error(`[JANIA-MATCH] [CRITICAL] Intento de emitir identificador raw (${replyText}) en lugar de texto conversacional a ${senderId}. Bloqueando y saneando.`);
            replyText = isSenderAdmin
              ? "¿En qué te colaboro hoy? Estoy 100% atenta para apoyarte 🤝."
              : "¡Listo! Ya procesé tu solicitud en nuestro sistema de VECY BIENES RAÍCES 🤝✨. ¿Deseas consultar o tramitar algo más?";
          }

          if (pdfBuffer && Buffer.isBuffer(pdfBuffer)) {
            console.log(`[JANIA-MATCH] [DM] Despachando documento PDF oficial (${pdfFileName || 'documento.pdf'}, ${pdfBuffer.length} bytes) a ${senderId}`);
            await this.queuedSend(senderId, {
              document: pdfBuffer,
              mimetype: 'application/pdf',
              fileName: pdfFileName || 'documento_oficial_vecy.pdf',
              caption: replyText
            }, { quoted: mainMsg, allowDirectMessage: true });
            await this.sock.sendMessage(senderId, { react: { text: '📄', key: mainMsg.key } }).catch(() => { });
          } else if (latestCreativeImage && Buffer.isBuffer(latestCreativeImage.buffer)) {
            console.log(`[JANIA-MATCH] [DM-CREATIVE] Despachando pieza gráfica HD (${latestCreativeImage.fileName}, ${latestCreativeImage.buffer.length} bytes) a ${senderId}`);
            await this.queuedSend(senderId, {
              image: latestCreativeImage.buffer,
              mimetype: 'image/jpeg',
              caption: replyText || latestCreativeImage.caption
            }, { quoted: mainMsg, allowDirectMessage: true });
            await this.sock.sendMessage(senderId, { react: { text: '🎨', key: mainMsg.key } }).catch(() => { });
          } else {
            await this.queuedSend(senderId, replyText, { quoted: mainMsg, allowDirectMessage: true });
          }
          await this.logToDb(senderId, 'janIA', replyText);

          if (latestLocationPin) {
            await this.sendLocationPin(
              senderId,
              latestLocationPin.latitude,
              latestLocationPin.longitude,
              latestLocationPin.name,
              latestLocationPin.address,
              mainMsg
            );
          }
          if (latestVCard) {
            await this.sendContactCard(senderId, latestVCard, mainMsg);
          }
          if (latestPoll) {
            await this.sendPoll(senderId, latestPoll.question, latestPoll.options, latestPoll.selectableCount ?? 1);
          }

          // 🎨 Despacho Contextual de Stickers 3D Oficiales de JanIA (v33.66 — Doctrina Eduardo A. Rivera)
          if (latestSticker && Buffer.isBuffer(latestSticker.buffer)) {
            console.log(`[JANIA-MATCH] [DM-STICKER] Despachando sticker 3D oficial de JanIA (${latestSticker.filename}) a ${senderId}`);
            await this.queuedSend(senderId, {
              sticker: latestSticker.buffer
            }, { allowDirectMessage: true, skipDelay: true });
          }

          const isLongQueryOrQuestion = cleanLower.includes("?") ||
            cleanLower.split(/\s+/).filter(Boolean).length > 15 ||
            /\b(?:pregunta|caso|arriendo|contrato|inmueble|canon|ipc|otro\s*si|poliza|seguro|cuanto|como|donde|cuando|por\s*que)\b/i.test(cleanLower);

          const isErrorReply = typeof replyText === "string" && (
            replyText.includes("intermitencia temporal") ||
            replyText.includes("error") ||
            replyText.includes("fallo en la matrix")
          );

          const isGratitudeOrClosing = !isSenderAdmin && !isLongQueryOrQuestion && !isErrorReply && (
            /^(?:(?:ok|vale|listo|bueno|mil|muchas)\s+)?gracias[\s.!,]*$/i.test(cleanLower.trim()) ||
            /^(?:muchas\s*gracias|mil\s*gracias|muy\s*amable|hasta\s*luego|chao|genial\s*gracias|perfecto\s*gracias|quedamos\s*as[ií])[\s.!,]*$/i.test(cleanLower.trim()) ||
            (cleanLower.length <= 45 && !cleanLower.includes("?") && /^(?:gracias|agradecid[ao]|bendiciones|hasta\s*pronto|feliz\s*(?:d[ií]a|tarde|noche))[\s.!,]*$/i.test(cleanLower.trim()))
          );
          const lastReviewSent = this.recentReviewPromptUsers.get(senderId) || 0;
          const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

          // 🌟 DESPACHO DESACOPLADO DE RESEÑA EN GOOGLE (DOCTRINA EDUARDO A. RIVERA — v33.80):
          // Los mensajes de calificación NUNCA se pegan al final de un texto largo con 'Leer más'.
          // Se emiten SIEMPRE como un mensaje independiente y separado con una breve pausa:
          // Caso A: Gratitud espontánea o despedida ("gracias", "mil gracias", "hasta luego").
          // Caso B: Usuario recurrente o beneficiario de la gratuidad (>= 2 servicios gratuitos o uso continuado)
          //         que acaba de recibir un reporte o consulta y aún no ha calificado en Google Reviews.
          if (!isSenderAdmin && !isErrorReply && lastReviewSent < oneDayAgo) {
            try {
              const { getUserPerpetualSession } = await import('./jania/sessionManager');
              const session = await getUserPerpetualSession(senderId, userName);
              const hasVerified = Boolean(session?.hasVerifiedGoogleReview);

              if (!hasVerified) {
                const alreadySentReviewInReply = replyText.includes("g.page/r/CctNbwU6UpX5EBM/review");
                if (alreadySentReviewInReply) {
                  this.recentReviewPromptUsers.set(senderId, Date.now());
                }

                const isServiceDeliveryReply =
                  replyText.includes("VERIFICACIÓN") ||
                  replyText.includes("antecedentes") ||
                  replyText.includes("C.C.") ||
                  replyText.includes("cédula") ||
                  replyText.includes("ADRES") ||
                  replyText.includes("BDUA") ||
                  replyText.includes("PREDIAL") ||
                  replyText.includes("PAZ Y SALVO") ||
                  replyText.includes("RUES") ||
                  replyText.includes("ANÁLISIS COMPARATIVO DE MERCADO") ||
                  replyText.includes("Escenarios Estratégicos de Precio") ||
                  replyText.includes("Sondeo de Mercado") ||
                  replyText.includes("Valor m² homologado") ||
                  replyText.includes("LIQUIDACIÓN") ||
                  replyText.includes("ESTUDIO DE TÍTULOS") ||
                  replyText.includes("DICTAMEN JURÍDICO") ||
                  replyText.includes("ANÁLISIS POT") ||
                  replyText.includes("NORMA URBANA") ||
                  replyText.includes("MATRÍCULA INMOBILIARIA") ||
                  replyText.includes("MATCH") ||
                  replyText.includes("40/20/40") ||
                  Boolean(latestPdf) ||
                  Boolean(latestCreativeImage);

                const isRecurrentFreeBeneficiary =
                  (session.freeServicesUsedCount || 0) >= 2;

                const isCompleteDelivery =
                  !replyText.endsWith(":") &&
                  !/a\s+continuaci[oó]n[,:\s]*$/i.test(replyText.trim()) &&
                  (!replyText.includes("cédula") || /(?:polic[ií]a|procuradur[ií]a|contralor[ií]a|adres|eps)/i.test(replyText));

                const usedCount = session.freeServicesUsedCount || 0;
                const isIntensiveUser = usedCount >= 3;
                const isIntensiveCadence = isIntensiveUser && (usedCount === 3 || usedCount % 3 === 0);

                if (alreadySentReviewInReply) {
                  // Ya se entregó el enlace oficial de reseña en esta respuesta
                } else if (isGratitudeOrClosing) {
                  this.recentReviewPromptUsers.set(senderId, Date.now());
                  const { formatImmediatePoliteReviewMessage, formatPersuasiveRecurrentUserReviewMessage } = await import('./politenessService');
                  const politeMsg = isRecurrentFreeBeneficiary
                    ? formatPersuasiveRecurrentUserReviewMessage(userName)
                    : formatImmediatePoliteReviewMessage(userName);
                  await new Promise(r => setTimeout(r, 1500));
                  await this.queuedSend(senderId, politeMsg, { allowDirectMessage: true, skipDelay: true });
                  await this.logToDb(senderId, 'janIA', politeMsg);
                  const { appendDmHistory } = await import('./janIA');
                  appendDmHistory(senderId, 'assistant', politeMsg);
                } else if (isServiceDeliveryReply && isCompleteDelivery && isIntensiveCadence && !isLongQueryOrQuestion) {
                  // 🌟 DOCTRINA EDUARDO A. RIVERA (v33.97): Prohibido disparar solicitudes de reseña intrusivas prematuras sin gratitud.
                  // 🌟 DOCTRINA EDUARDO A. RIVERA (v33.98 / v33.99): Persuasión e insistencia firme para usuarios intensivos de alto volumen.
                  // Si el usuario pone a trabajar intensamente a JanIA (>= 3 servicios) sin haber calificado,
                  // tras entregar su reporte completo y una pausa respetuosa de 3.2s, JanIA insiste persuasivamente
                  // en la calificación de 5 estrellas en Google para mantener la gratuidad y el acceso libre del servicio.
                  this.recentReviewPromptUsers.set(senderId, Date.now());
                  const { formatPersuasiveIntensiveUserReviewMessage } = await import('./politenessService');
                  const intensiveReviewMsg = formatPersuasiveIntensiveUserReviewMessage(userName, usedCount);
                  await new Promise(r => setTimeout(r, 3200));
                  await this.queuedSend(senderId, intensiveReviewMsg, { allowDirectMessage: true, skipDelay: true });
                  await this.logToDb(senderId, 'janIA', intensiveReviewMsg);
                  const { appendDmHistory } = await import('./janIA');
                  appendDmHistory(senderId, 'assistant', intensiveReviewMsg);
                } else if (isServiceDeliveryReply && isCompleteDelivery) {
                  // 🌟 DOCTRINA EDUARDO A. RIVERA (v34.11): Si el usuario no responde tras recibir cualquier servicio (ACM, RUES, Predial, Notarial, etc.),
                  // programar el seguimiento desacoplado de 60s para invitarlo autónomamente a calificar en Google sin intervención manual del fundador.
                  this.onFreeToolServiceDelivered(senderId, userName);
                }
              }
            } catch (revErr: any) {
              console.warn('[JANIA-MATCH] Error en despacho desacoplado de reseña Google:', revErr?.message);
            }
          }
          return;
        }
      } catch (dmAiErr) {
        console.error('[JANIA-MATCH] Error en protocolo de IA conversacional DM:', dmAiErr);
      } finally {
        stopPresence();
      }
    }

    // 🤝 INTERCEPTOR DM: PREGUNTAS DE AYUDA SOBRE SERVICIOS ("¿cómo verifico?", "¿cómo pido el predial?")
    // JanIA responde con guía contextual como fallback si no aplicó la IA pura
    const { isServiceHelpRequest, PREDIAL_HELP_TEXT, CEDULA_HELP_TEXT } = await import('./predialService');
    const helpType = isServiceHelpRequest(body);
    if (helpType === 'predial') {
      try { await this.sock.sendPresenceUpdate('composing', senderId); } catch (_) { }
      console.log(`[JANIA-MATCH] [DM] Guía de servicio PREDIAL enviada a ${senderId}`);
      await this.queuedSend(senderId, PREDIAL_HELP_TEXT, { quoted: mainMsg, allowDirectMessage: true });
      await this.logToDb(senderId, 'janIA', PREDIAL_HELP_TEXT);
      return;
    }
    if (helpType === 'cedula') {
      try { await this.sock.sendPresenceUpdate('composing', senderId); } catch (_) { }
      console.log(`[JANIA-MATCH] [DM] Guía de servicio CÉDULA enviada a ${senderId}`);
      await this.queuedSend(senderId, CEDULA_HELP_TEXT, { quoted: mainMsg, allowDirectMessage: true });
      await this.logToDb(senderId, 'janIA', CEDULA_HELP_TEXT);
      return;
    }

    // Failsafe de Presencia: Si ningún interceptor despachó un mensaje, limpiar el estado 'composing'
    try {
      await this.sock.sendPresenceUpdate('paused', senderId);
    } catch (_) { }

    return;
  }

  // --- REDIRECCIÓN DE CHATS PRIVADOS ---
  private async handlePrivateDmRedirect(chatId: string, senderId: string, userName: string) {
    // CAPA DE SEGURIDAD MUTE / INTERVENCIÓN HUMANA
    const { isSessionMuted } = await import('./janIA');
    const isMuted = await isSessionMuted(senderId);
    const lastIntervention = this.lastHumanIntervention.get(senderId) || 0;
    const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 horas
    if (isMuted || (Date.now() - lastIntervention < cooldownPeriod)) {
      console.log(`[JANIA-MATCH] Silencio total en DM ${senderId} por intervención humana o silencio activo. Omitiendo redirección.`);
      return;
    }

    const now = Date.now();
    const lastRedirect = this.redirectCooldowns.get(senderId) || 0;
    const ONCE_A_DAY = 24 * 60 * 60 * 1000;

    if (now - lastRedirect > ONCE_A_DAY) {
      this.redirectCooldowns.set(senderId, now);
      const redirectLink = "https://wa.me/573192919978";

      const realName = userName || "Asesor";
      const cleanName = extractFirstName(realName) || "colega";
      const redirectText = `Hola ${cleanName} 👋😊. Si tienes dudas, inquietudes o quieres consultarme algo (sea por escrito o por notas de voz), te invito a escribir directamente a mi chat privado de JanIA haciendo clic aquí: ${redirectLink} para atenderte de forma personalizada, o si lo prefieres, participar en nuestros grupos oficiales:\n\n` +
        `Mis grupos oficiales:\n\n` +
        `1️⃣ *Para publicar tus OFERTAS y DEMANDAS:* ${VECY_OFFICIAL_GROUPS.grupo1.name}\n🔗 Enlace: ${VECY_OFFICIAL_GROUPS.grupo1.inviteLink}\n\n` +
        `2️⃣ *Para consultas públicas, tips y debates inmobiliarios:* ${VECY_OFFICIAL_GROUPS.grupo2.name}\n🔗 Enlace: ${VECY_OFFICIAL_GROUPS.grupo2.inviteLink}\n\n` +
        `3️⃣ *Para conocer el proyecto, foros y alianzas:* ${VECY_OFFICIAL_GROUPS.grupo3.name}\n🔗 Enlace: ${VECY_OFFICIAL_GROUPS.grupo3.inviteLink}\n\n` +
        `¡Allí te atenderé con todo el gusto! 🚀`;

      this.queuedSend(chatId, redirectText);
    }
  }

  /**
   * 🤖 DETECTOR ROBUSTO DE MENCIÓN DIRECTA A JANIA (Doctrina Eduardo A. Rivera — v33.92 / v33.96)
   * Detecta menciones legítimas de terceros por:
   * 1. Nombre o variantes ("jania", "@jania") excluyendo autopresentaciones/flyers ("Soy JanIA")
   * 2. Teléfono oficial ("573192919978", "3192919978")
   * 3. LID de JanIA en WhatsApp Web/Multi-Device ("167108705018103" / @167108705018103)
   * 4. mentionedJid en contextInfo (tanto @s.whatsapp.net como @lid)
   * 5. Cita directa de un mensaje previo emitido por JanIA (excepto cuando es respuesta a un mensaje manual humano sin nombrar a JanIA)
   *
   * REGLA INQUEBRANTABLE v33.96: Jamás retorna true si el mensaje proviene de la propia cuenta de JanIA (Tú / fromMe / LID propio)
   * ni si el texto es un flyer promocional ("¡Buenos días! Soy JanIA, tu aliada inmobiliaria...").
   */
  public isBotDirectlyMentioned(msg: proto.IWebMessageInfo, text: string): boolean {
    if (this.isFromOwnBotAccount(msg)) {
      return false;
    }
    if (this.isSelfPresentationOrFlyerOfJanIA(text)) {
      return false;
    }

    const sanitizedForNameCheck = (text || '')
      .replace(/\b(?:soy|habla|te\s+saluda)\s+(?:✨\s*)?jania\b/gi, '')
      .replace(/\bjania,\s+tu\s+aliada\s+inmobiliaria\b/gi, '')
      .replace(/\b✨?\s*jania\s+agente\s+ia\s+de\s+vecy\b/gi, (m, offset, full) => {
        const prevChar = offset > 0 ? full[offset - 1] : '';
        return prevChar === '@' ? m : '';
      })
      .toLowerCase();

    const textLower = (text || '').toLowerCase();

    // 1. Detección por nombre o variantes (excluyendo flyers de autopresentación)
    if (sanitizedForNameCheck.includes("jania") || sanitizedForNameCheck.includes("@jania")) {
      return true;
    }

    // 2. Detección por número telefónico oficial (solo si está precedido de @ o no es un pie de firma de flyer)
    const botJid = this.sock?.user?.id ? cleanJid(this.sock.user.id) : '';
    const botPhone = botJid ? botJid.split('@')[0].split(':')[0] : '573192919978';
    if (botPhone && sanitizedForNameCheck.includes(`@${botPhone}`)) {
      return true;
    }
    if (sanitizedForNameCheck.includes("@573192919978") || sanitizedForNameCheck.includes("@3192919978") || /\b(?:573192919978|3192919978)\b/.test(sanitizedForNameCheck)) {
      return true;
    }

    // 3. Detección por LID de JanIA (WhatsApp Web / Multi-Device inserta @<LID> en el texto plano)
    const rawBotLid = (this.sock?.user as any)?.lid || (this.sock as any)?.authState?.creds?.me?.lid || "167108705018103@lid";
    const cleanBotLid = rawBotLid ? rawBotLid.split(':')[0].split('@')[0] : "167108705018103";
    if (cleanBotLid && textLower.includes(cleanBotLid)) {
      return true;
    }
    if (textLower.includes("167108705018103")) {
      return true;
    }

    // 4. Extracción de contextInfo (soporta mensajes envueltos y extendidos)
    const rawMsg = unwrapMessage(msg.message);
    const contextInfo = (rawMsg as any)?.extendedTextMessage?.contextInfo
      || (msg.message as any)?.extendedTextMessage?.contextInfo
      || (rawMsg as any)?.contextInfo
      || (msg.message as any)?.contextInfo;

    // 5. Detección por mentionedJid en contextInfo (tanto @s.whatsapp.net como @lid)
    const mentionedJid: string[] = contextInfo?.mentionedJid || [];
    if (Array.isArray(mentionedJid) && mentionedJid.length > 0) {
      const isMentioned = mentionedJid.some((jid: string) => {
        if (!jid) return false;
        const clean = cleanJid(jid);
        const rawNum = clean.split('@')[0].split(':')[0];
        return (botJid && clean === botJid) ||
          (botPhone && rawNum === botPhone) ||
          rawNum === "573192919978" ||
          rawNum === "3192919978" ||
          (cleanBotLid && rawNum === cleanBotLid) ||
          rawNum === "167108705018103" ||
          jid.includes("167108705018103") ||
          (cleanBotLid && jid.includes(cleanBotLid));
      });
      if (isMentioned) return true;
    }

    // 6. Detección si citó directamente un mensaje emitido por el bot (quotedMessage de JanIA)
    const quotedParticipant = contextInfo?.participant ? cleanJid(contextInfo.participant) : '';
    if (quotedParticipant) {
      const quotedNum = quotedParticipant.split('@')[0].split(':')[0];
      const isQuotingOurAccount =
        (botJid && quotedParticipant === botJid) ||
        (botPhone && quotedNum === botPhone) ||
        quotedNum === "573192919978" ||
        quotedNum === "167108705018103" ||
        (cleanBotLid && quotedNum === cleanBotLid);

      if (isQuotingOurAccount) {
        const quotedStanzaId = String(contextInfo?.stanzaId || '');
        const rawChatId = msg?.key?.remoteJid ? cleanJid(msg.key.remoteJid) : '';
        // Si el mensaje citado fue escrito manualmente por Eduardo/Jani tomando el control del chat (humanManualMessageIds),
        // o si el mensaje citado es un flyer de autopresentación ("Soy JanIA"), citarlo sin nombrar/arrobear a JanIA NO dispara auto-respuesta:
        if (quotedStanzaId && this.humanManualMessageIds.has(quotedStanzaId)) {
          return false;
        }
        if (rawChatId && (Date.now() - (this.groupHumanTakeoverMap.get(rawChatId) || 0) < 30 * 60 * 1000)) {
          if (!quotedStanzaId || !this.botSentMessageIds.has(quotedStanzaId)) {
            return false;
          }
        }
        const unwrappedQuoted = contextInfo?.quotedMessage ? unwrapMessage(contextInfo.quotedMessage) : null;
        const quotedText = (unwrappedQuoted as any)?.conversation
          || (unwrappedQuoted as any)?.extendedTextMessage?.text
          || (unwrappedQuoted as any)?.imageMessage?.caption
          || '';
        if (this.isSelfPresentationOrFlyerOfJanIA(quotedText)) {
          return false;
        }
        return true;
      }
    }

    return false;
  }

  // --- RESPUESTA DIRECTA A PREGUNTAS EN GRUPOS ---
  private async handleDirectGroupQuestion(msg: proto.IWebMessageInfo, chatId: string, senderId: string, bodyText: string) {
    try {
      const questionStartedAt = Date.now();
      const isOfficialGroup = chatId === this.targetGroupId || chatId === this.buzonGroupId || chatId === this.circuloGroupId;

      // 🛡️ REGLA DOCTRINAL INQUEBRANTABLE (v33.96):
      // JanIA JAMÁS debe responderse a sí misma ni responder cuando alguien de nosotros usa su cuenta, ni auto-responder a sus propios flyers.
      if (this.isFromOwnBotAccount(msg, senderId)) {
        console.log(`[JANIA-SILENT-SHIELD] 🛡️ Bloqueo absoluto de auto-respuesta: el mensaje en ${chatId} proviene de la propia cuenta de JanIA (${senderId}).`);
        return;
      }
      if (this.isSelfPresentationOrFlyerOfJanIA(bodyText)) {
        console.log(`[JANIA-SILENT-SHIELD] 🛡️ Flyer o autopresentación de JanIA detectado en ${chatId}. No se auto-responde.`);
        return;
      }

      const textLower = bodyText.toLowerCase();
      const hasDirectMention = this.isBotDirectlyMentioned(msg, bodyText);

      if (!isOfficialGroup && !hasDirectMention) {
        // 🛡️ BLINDAJE DOCTRINAL INQUEBRANTABLE (Doctrina Eduardo A. Rivera v33.82 / v33.92 / v33.96):
        // En grupos externos JanIA actúa ÚNICAMENTE si la nombran, citan o arrobean (@) directamente; de resto guarda silencio 100% absoluto.
        console.log(`[JANIA-SILENT-SHIELD] 🛡️ Mensaje en grupo externo ${chatId} sin mención directa ignorado para respuestas textuales. Silencio 100% preservado.`);
        return;
      }

      let resolvedSenderId = senderId;
      if (senderId.endsWith('@lid') && this.sock?.signalRepository?.lidMapping?.getPNForLID) {
        try {
          const mappedPn = await this.sock.signalRepository.lidMapping.getPNForLID(senderId);
          if (mappedPn) {
            const cleanUser = mappedPn.split(':')[0].split('@')[0];
            resolvedSenderId = `${cleanUser}@s.whatsapp.net`;
            console.log(`[JANIA-MATCH] [DirectGroupQuestion] Resolviendo LID ${senderId} to PN ${resolvedSenderId}`);
          }
        } catch (err) { }
      }

      const realName = msg.pushName || `Asesor +${resolvedSenderId.split('@')[0]}`;

      // 👥 Extraer participantes a etiquetar/mencionar en el grupo (invocador y autor de la pregunta citada, si existe)
      let quotedSenderId: string | undefined;
      try {
        const rawCtx = unwrapMessage(msg.message);
        const ctxInfo = (rawCtx as any)?.extendedTextMessage?.contextInfo
          || (msg.message as any)?.extendedTextMessage?.contextInfo
          || (rawCtx as any)?.contextInfo
          || (msg.message as any)?.contextInfo;
        if (ctxInfo?.participant) {
          quotedSenderId = cleanJid(ctxInfo.participant);
        }
      } catch (_) { }

      const groupMentions: string[] = [senderId];
      if (quotedSenderId && quotedSenderId !== senderId && !groupMentions.includes(quotedSenderId)) {
        groupMentions.push(quotedSenderId);
      }

      const { detectaVoz, textToSpeechMedia } = await import('./whatsapp-utils');
      const { processWhatsAppMessage, processConsultingMessage, processCirculoMessage } = await import('./janIA');

      const isAudioPTT = !!msg.message?.audioMessage;
      const wantsVoice = isAudioPTT || detectaVoz(textLower);
      if (wantsVoice) {
        await this.sock.sendPresenceUpdate('recording', chatId);
      } else {
        await this.sock.sendPresenceUpdate('composing', chatId);
      }

      // Si la transcripción del audio falló, respondemos con un mensaje específico
      const isAudioFailed = bodyText === '[audio-vacío]' || bodyText === '[audio-sin-buffer]' || bodyText === '[audio-error]';
      if (isAudioFailed) {
        const cleanUserName = extractFirstName(cleanRawUserName(realName || msg.pushName || "")) || extractFirstName(realName) || "colega";
        const failMsg = `Hola ${cleanUserName} 👋🏻, escuché que enviaste una nota de voz, pero hubo una interferencia al procesar el audio en este momento. 🙏\n\nPor favor escribe tu consulta o requerimiento por texto aquí en el grupo para atenderte de inmediato. ¡Estoy lista para responderte! 😊`;
        await this.queuedSend(chatId, failMsg, { mentions: [senderId], quoted: msg });
        await this.sock.sendPresenceUpdate('paused', chatId);
        return;
      }

      // 🛡️ MODERACIÓN ESTRICTA EN GRUPO 1: EXCLUSIVO PARA OFERTAS🏷️ Y DEMANDAS📝
      const isMainGroupChat = chatId === this.targetGroupId;
      if (isMainGroupChat) {
        let isBotAdmin = false;
        try {
          const metadata = await this.getCachedGroupMetadata(chatId);
          const me = this.sock.user?.id ? this.sock.user.id.split(':')[0] : '';
          const myParticipant = metadata?.participants?.find((p: any) => p.id.split('@')[0] === me);
          isBotAdmin = !!myParticipant && (myParticipant.admin === 'admin' || myParticipant.admin === 'superadmin');
        } catch (_) { }

        const cleanUserName = extractFirstName(cleanRawUserName(realName || msg.pushName || "")) || extractFirstName(realName) || "colega";
        const redirectMsg =
          `⚠️ *AVISO DE MODERACIÓN — VECY BIENES RAÍCES* ⚠️\n\n` +
          `Hola ${cleanUserName} 👋🏻, este grupo (*${VECY_OFFICIAL_GROUPS.grupo1.name}*) está reservado *EXCLUSIVAMENTE* para la publicación de *OFERTAS🏷️ y DEMANDAS📝 inmobiliarias*.\n\n` +
          `Para mantener este canal 100% limpio y ágil para encontrar coincidencias sin saturar a los colegas, por favor comparte tus consultas o temas en nuestros canales autorizados:\n\n` +
          `💡 *Grupo 2 (Tips, Noticias y Consultas Inmobiliarias):*\n👉 ${VECY_OFFICIAL_GROUPS.grupo2.inviteLink}\n\n` +
          `🚀 *Grupo 3 (Proyecto VECY BIENES RAÍCES, Casos y Foros):*\n👉 ${VECY_OFFICIAL_GROUPS.grupo3.inviteLink}\n\n` +
          `📲 *O escríbeme directamente a mi chat privado de JanIA:*\n👉 https://wa.me/573192919978\n\n` +
          `_Para conservar el orden del grupo, procederé a eliminar tu mensaje en unos segundos. ¡Gracias por tu comprensión y apoyo mutuo!_ 🤝✨`;

        await this.safeReact(chatId, msg.key, '🚫', 'WARNING-REACT');
        await this.queuedSend(chatId, redirectMsg, { mentions: [senderId], quoted: msg });
        await this.sock.sendPresenceUpdate('paused', chatId);
        await this.logToDb(chatId, 'janIA', `[GRUPO1-MODERATION] ${redirectMsg}`);

        if (isBotAdmin && msg.key?.id) {
          setTimeout(async () => {
            try {
              if (this.sock) {
                await this.sock.sendMessage(chatId, { delete: msg.key });
                console.log(`[JANIA-MODERATION] 🗑️ Mensaje de consulta eliminado en Grupo 1: ${msg.key.id}`);
              }
            } catch (delErr) {
              console.warn(`[JANIA-MODERATION] Error eliminando mensaje en Grupo 1:`, delErr);
            }
          }, 3500);
        }
        return;
      }

      // 🛡️ INTERCEPTOR DIRECTO: VERIFICACIÓN OFICIAL DE CÉDULA (2CAPTCHA + POLICÍA NACIONAL)
      const { executeIdentityVerificationFromWhatsApp } = await import('./identityVerificationService');
      const idCheck = await executeIdentityVerificationFromWhatsApp(bodyText, true, resolvedSenderId);
      if (idCheck.isVerificationRequest && idCheck.reportText) {
        console.log(`[JANIA-MATCH] [Group ${chatId}] Verificación de identidad atendida para ${resolvedSenderId} (C.C. ${idCheck.cedula})`);
        await this.queuedSend(chatId, idCheck.reportText, { mentions: groupMentions, quoted: msg, allowExternalGroupResponse: true });
        await this.logToDb(chatId, 'janIA', idCheck.reportText);
        if (idCheck.followUpQuestionText) {
          await new Promise(r => setTimeout(r, 900));
          await this.queuedSend(chatId, idCheck.followUpQuestionText, { mentions: groupMentions, allowExternalGroupResponse: true });
          await this.logToDb(chatId, 'janIA', idCheck.followUpQuestionText);
        }
        await this.sock.sendPresenceUpdate('paused', chatId);
        return;
      }

      // 📇 INTERCEPTOR DIRECTO: SOLICITUD DE CONTACTO / NÚMERO DE JANIA O DEL BRÓKER (v32.60)
      const isContactRequest = /(contacto|n[uú]mero|whatsapp|tel[eé]fono).*(jania|vecy|broker|eduardo|jani|direcci[oó]n)|(p[aá]same|dame|reg[aá]lame|comp[aá]rteme).*(contacto|n[uú]mero|telefono|teléfono)/i.test(bodyText);
      if (isContactRequest) {
        const wantsBroker = /broker|eduardo|jani|humano|atenci[oó]n|directora?|comercial/i.test(bodyText);
        const contactType = wantsBroker ? 'broker' : 'jania';
        const { getGreetingByTime } = await import('./whatsapp-utils');
        const timeSalutation = getGreetingByTime();
        const contactMsg = wantsBroker
          ? `¡${timeSalutation}${realName ? `, ${realName}` : ""}! 👋 Claro que sí, aquí tienes la tarjeta de contacto oficial de nuestros directores *Eduardo A. Rivera y Jani Alves* para atención comercial personalizada de VECY BIENES RAÍCES: 📲`
          : `¡${timeSalutation}${realName ? `, ${realName}` : ""}! 👋 Con gusto, aquí tienes mi tarjeta de contacto oficial como *JanIA*, la Inteligencia Artificial de VECY BIENES RAÍCES: 👩🏻‍💼✨ Guárdame en tus contactos para consultarme siempre que lo necesites.`;

        await this.queuedSend(chatId, contactMsg, { mentions: groupMentions, quoted: msg, allowExternalGroupResponse: true });
        await this.sendContactCard(chatId, contactType, msg);
        await this.sock.sendPresenceUpdate('paused', chatId);
        await this.logToDb(chatId, 'janIA', `[TARJETA-CONTACTO-${contactType.toUpperCase()}] ${contactMsg}`);
        return;
      }

      // 📍 INTERCEPTOR DIRECTO: SOLICITUD DE PIN DE UBICACIÓN GPS EN GRUPOS 2 Y 3 (v33.67)
      const isLocationPinRequest = /(?:env[ií]a(?:me)?|p[aá]same|comp[aá]rteme|dame|mu[eé]strame)\s+(?:la\s+|el\s+)?(?:ubicaci[oó]n\s+gps|pin\s+de\s+ubicaci[oó]n|mapa\s+gps|ubicaci[oó]n\s+de\s+vecy)/i.test(bodyText);
      if (isLocationPinRequest) {
        const locMsg = `¡Claro que sí${realName ? `, ${realName}` : ""}! 📍 Aquí tienes el pin de ubicación GPS interactivo de nuestra sede y zona de influencia ejecutiva de *VECY BIENES RAÍCES* en Bogotá (Parque de la 93 / El Chicó). Recuerda que atendemos en toda Colombia a través de nuestra línea bróker *+57 316 656 9719*: 🤝✨`;
        await this.queuedSend(chatId, locMsg, { mentions: groupMentions, quoted: msg, allowExternalGroupResponse: true });
        await this.sendLocationPin(chatId, 4.6768, -74.0482, 'VECY BIENES RAÍCES — Mesa Central Bogotá', 'Parque de la 93 / El Chicó, Bogotá D.C., Colombia', msg);
        await this.sock.sendPresenceUpdate('paused', chatId);
        await this.logToDb(chatId, 'janIA', `[UBICACION-GPS] ${locMsg}`);
        return;
      }

      let result;
      const isBuzonGroup = chatId === this.buzonGroupId;
      const isCirculoGroup = chatId === this.circuloGroupId;

      if (isBuzonGroup || isCirculoGroup) {
        const msgTs = msg.messageTimestamp ? Number(msg.messageTimestamp) : undefined;
        const rawMsg = unwrapMessage(msg.message);
        let imageBuffer: string | undefined;
        let pdfBuffer: string | undefined;
        let pdfMimeType: string | undefined;

        if (rawMsg?.imageMessage) {
          try {
            const mediaBuffer = await downloadMediaSafely(msg as any, 'image');
            if (mediaBuffer) {
              imageBuffer = mediaBuffer.toString('base64');
            }
          } catch (e) {
            console.error('[JANIA-MEDIA] Error descargando imagen adjunta en grupo:', e);
          }
        } else if (rawMsg?.documentMessage) {
          try {
            const mediaBuffer = await downloadMediaSafely(msg as any, 'document');
            if (mediaBuffer) {
              pdfBuffer = mediaBuffer.toString('base64');
              pdfMimeType = rawMsg.documentMessage.mimetype || 'application/pdf';
            }
          } catch (e) {
            console.error('[JANIA-MEDIA] Error descargando documento adjunto en grupo:', e);
          }
        }

        const quotedMeta = await this.extractQuotedContextAndMedia(msg, rawMsg);
        const quotedContext = quotedMeta.quotedContext;
        if (!imageBuffer && quotedMeta.quotedImageBuffer) {
          imageBuffer = quotedMeta.quotedImageBuffer;
        }
        if (!pdfBuffer && quotedMeta.quotedPdfBuffer) {
          pdfBuffer = quotedMeta.quotedPdfBuffer;
          pdfMimeType = quotedMeta.quotedPdfMimeType || 'application/pdf';
        }

        if (isBuzonGroup) {
          result = await processConsultingMessage(
            bodyText,
            resolvedSenderId,
            realName,
            imageBuffer,
            pdfBuffer,
            pdfMimeType,
            isAudioPTT ? ('mock-audio:' + bodyText) : undefined,
            msgTs,
            quotedContext
          );
        } else {
          result = await processCirculoMessage(
            bodyText,
            resolvedSenderId,
            realName,
            imageBuffer,
            pdfBuffer,
            pdfMimeType,
            quotedContext
          );
        }
      } else if (isMainGroupChat) { // 𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴 — preguntas sobre el grupo/sistema
        let groupName = "𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴";
        try {
          const metadata = await this.sock.groupMetadata(chatId);
          if (metadata && metadata.subject) {
            groupName = metadata.subject;
          }
        } catch (e) { }
        result = await processWhatsAppMessage(
          bodyText,
          resolvedSenderId,
          realName,
          false,
          [],
          undefined,
          undefined,
          true,
          undefined,
          undefined,
          chatId,
          groupName
        );

      } else if (hasDirectMention) {
        // 🌐 GRUPO EXTERNO DONDE JANIA ES NOMBRADA DIRECTAMENTE (Doctrina Eduardo A. Rivera v33.82)
        // 🌐 GRUPO EXTERNO DONDE JANIA ES NOMBRADA, CITADA O ARROBEADA (@) DIRECTAMENTE (Doctrina Eduardo A. Rivera v33.82 / v33.92 / v33.96):
        // 1. Verificar que realmente se trate de una consulta del tema inmobiliario/jurídico/avalúos/VECY y no de un saludo suelto o flyer.
        // 2. Si Eduardo o Jani tomaron el control del chat en este grupo recientemente, esperar una ventana prudencial por si actúan en nombre de ella;
        //    si actúan, JanIA guarda silencio absoluto; si no actúan y la consulta fue dirigida directamente a JanIA, ella responde.
        const msgTs = msg.messageTimestamp ? Number(msg.messageTimestamp) : undefined;
        const rawMsg = unwrapMessage(msg.message);
        let imageBuffer: string | undefined;
        let pdfBuffer: string | undefined;
        let pdfMimeType: string | undefined;

        const quotedMeta = await this.extractQuotedContextAndMedia(msg, rawMsg);
        const quotedContext = quotedMeta.quotedContext;
        if (!imageBuffer && quotedMeta.quotedImageBuffer) {
          imageBuffer = quotedMeta.quotedImageBuffer;
        }
        if (!pdfBuffer && quotedMeta.quotedPdfBuffer) {
          pdfBuffer = quotedMeta.quotedPdfBuffer;
          pdfMimeType = quotedMeta.quotedPdfMimeType || 'application/pdf';
        }

        const hasAnyExternalMedia = Boolean(
          rawMsg?.imageMessage || rawMsg?.documentMessage || quotedMeta.hasQuotedMedia
        );

        if (!this.isRealEstateConsultationForGroup(bodyText, quotedContext, hasAnyExternalMedia)) {
          console.log(`[JANIA-SILENT-SHIELD] 🛡️ Mención en grupo externo ${chatId} descartada por no constituir una consulta inmobiliaria/jurídica ("${bodyText.slice(0, 60)}").`);
          await this.sock.sendPresenceUpdate('paused', chatId).catch(() => {});
          return;
        }

        const lastTakeoverTs = this.groupHumanTakeoverMap.get(chatId) || 0;
        if (lastTakeoverTs > 0 && (Date.now() - lastTakeoverTs < 15 * 60 * 1000) && process.env.NODE_ENV !== 'test') {
          console.log(`[JANIA-HUMAN-TAKEOVER] ⏳ Control humano reciente en ${chatId}. Esperando 6s para verificar si Eduardo/Jani responden manualmente antes de intervenir...`);
          await new Promise(r => setTimeout(r, 6000));
          if ((this.groupHumanTakeoverMap.get(chatId) || 0) >= questionStartedAt) {
            console.log(`[JANIA-HUMAN-TAKEOVER] 🛡️ Eduardo/Jani respondieron manualmente en ${chatId}. JanIA guarda silencio.`);
            await this.sock.sendPresenceUpdate('paused', chatId).catch(() => {});
            return;
          }
        }

        if (rawMsg?.imageMessage) {
          try {
            const mediaBuffer = await downloadMediaSafely(msg as any, 'image');
            if (mediaBuffer) imageBuffer = mediaBuffer.toString('base64');
          } catch (e) { }
        } else if (rawMsg?.documentMessage) {
          try {
            const mediaBuffer = await downloadMediaSafely(msg as any, 'document');
            if (mediaBuffer) {
              pdfBuffer = mediaBuffer.toString('base64');
              pdfMimeType = rawMsg.documentMessage.mimetype || 'application/pdf';
            }
          } catch (e) { }
        }

        const passiveSummary = this.getPassiveGroupContextSummary(chatId);
        const enrichedQuotedContext = [
          quotedContext ? `Mensaje citado: "${quotedContext}"` : '',
          passiveSummary ? `Hilo reciente del grupo al que JanIA estuvo prestando atención en silencio:\n${passiveSummary}` : ''
        ].filter(Boolean).join('\n\n') || undefined;

        // Si citaron la consulta de otro colega para que JanIA la responda:
        const queryToProcess = quotedContext
          ? `[Instrucción de consulta citada]: ${bodyText}\n\n[Consulta citada del colega a resolver]: ${quotedContext}`
          : bodyText;

        result = await processConsultingMessage(
          queryToProcess,
          resolvedSenderId,
          realName,
          imageBuffer,
          pdfBuffer,
          pdfMimeType,
          isAudioPTT ? ('mock-audio:' + bodyText) : undefined,
          msgTs,
          enrichedQuotedContext
        );

        // En un grupo externo JanIA es invitada consultora, NUNCA moderadora de publicaciones del grupo externo
        if (result && (result.classification === 'VIOLACION_DE_NORMAS' || result.classification === 'INMUEBLE' || result.classification === 'REQUERIMIENTO')) {
          console.log(`[JANIA-SILENT-SHIELD] 🛡️ Resultado ${result.classification} suprimido en grupo externo ${chatId} (JanIA solo responde consultas en grupos externos).`);
          await this.sock.sendPresenceUpdate('paused', chatId).catch(() => {});
          return;
        }

      } else {
        await this.handlePrivateDmRedirect(chatId, resolvedSenderId, realName);
        await this.sock.sendPresenceUpdate('paused', chatId);
        return;
      }

      if (result && (chatId === this.buzonGroupId || chatId === this.circuloGroupId)) {
        if (result.classification === 'INMUEBLE' || result.classification === 'REQUERIMIENTO') {
          const rawPhone = senderId.split('@')[0];
          const cleanUserName = extractFirstName(cleanRawUserName(realName || msg.pushName || "")) || extractFirstName(realName) || "colega";
          const redirectText =
            `Hola ${cleanUserName} 👋🏻, publicaste una ${result.classification === 'INMUEBLE' ? 'oferta' : 'demanda'} inmobiliaria en este grupo.\n\n` +
            `Para que JanIA y toda la comunidad puedan realizar el cruce comercial (MATCH) inmediato, por favor publícala en nuestro grupo exclusivo:\n\n` +
            `🏢 *${VECY_OFFICIAL_GROUPS.grupo1.name}*\n👉 ${VECY_OFFICIAL_GROUPS.grupo1.inviteLink}\n\n` +
            `_He eliminado tu publicación en este canal para preservar el orden temático._ 🤝✨`;
          await this.queuedSend(chatId, redirectText, { mentions: groupMentions, allowExternalGroupResponse: true });
          await this.sock.sendMessage(chatId, { delete: msg.key }).catch(() => { });
          await this.logToDb(chatId, 'janIA', redirectText);
          await this.sock.sendPresenceUpdate('paused', chatId);
          return;
        }
        if (result.classification === 'VIOLACION_DE_NORMAS') {
          await this.sock.sendMessage(chatId, { delete: msg.key }).catch(() => { });
        }
      }

      if ((this.groupHumanTakeoverMap.get(chatId) || 0) >= questionStartedAt) {
        console.log(`[JANIA-HUMAN-TAKEOVER] 🛡️ Intervención manual detectada en ${chatId} mientras se procesaba la respuesta. Abortando envío automático.`);
        await this.sock.sendPresenceUpdate('paused', chatId).catch(() => {});
        return;
      }

      if (result && result.response && result.response.trim() !== '') {
        let textToDeliver = result.response;
        let groupStickerBuffer: Buffer | null = (result as any).stickerBuffer || null;

        const { extractStickerTagFromReply, getJaniaStickerByKey } = await import('./jania/stickerService');
        const extractedSticker = extractStickerTagFromReply(textToDeliver);
        if (extractedSticker.stickerKey) {
          textToDeliver = extractedSticker.cleanText;
          if (!groupStickerBuffer) {
            const loaded = getJaniaStickerByKey(extractedSticker.stickerKey);
            if (loaded) groupStickerBuffer = loaded.buffer;
          }
        }

        const voiceToDeliver = (result.voiceResponse && result.voiceResponse.trim() !== "")
          ? result.voiceResponse
          : textToDeliver;

        const {
          isExplicitLegalPdfRequest,
          generateLegalPdfForDmRequest,
          isExplicitCreativeImageRequest,
          generateCustomUserCreativeImage,
          popLatestDmCreativeImage
        } = await import('./jania/handlers/dmHandler');

        // Consumir cualquier imagen encolada en paralelo si viene ya en result.creativeImageBuffer
        const queuedCreativeFromHandler = popLatestDmCreativeImage(senderId);
        const creativeBufferToSend = result.creativeImageBuffer || queuedCreativeFromHandler?.buffer;
        const creativeCaptionToSend = textToDeliver || result.creativeImageCaption || queuedCreativeFromHandler?.caption;

        // Si la respuesta incluye un documento (ej. Factura Predial oficial, Paz y Salvo IDU o Minuta PDF)
        if (result.document) {
          await this.queuedSend(chatId, {
            document: result.document,
            mimetype: 'application/pdf',
            fileName: result.fileName || 'Documento_Oficial_VECY.pdf',
            caption: textToDeliver
          }, { mentions: groupMentions, quoted: msg, allowExternalGroupResponse: true });
        } else if (creativeBufferToSend) {
          // 🖼️ Despacho nativo de Flyer / Infografía 1080x1080 directamente en el grupo
          await this.queuedSend(chatId, {
            image: creativeBufferToSend,
            mimetype: 'image/jpeg',
            caption: creativeCaptionToSend
          }, { mentions: groupMentions, quoted: msg, allowExternalGroupResponse: true });
        } else if (isExplicitLegalPdfRequest(bodyText)) {
          try {
            const groupPdf = await generateLegalPdfForDmRequest(bodyText, {
              cuerpoDocumento: textToDeliver.length > 180 ? textToDeliver : undefined
            });
            await this.queuedSend(chatId, {
              document: groupPdf.pdfBuffer,
              mimetype: 'application/pdf',
              fileName: groupPdf.fileName,
              caption: textToDeliver
            }, { mentions: groupMentions, quoted: msg, allowExternalGroupResponse: true });
          } catch (_) {
            await this.queuedSend(chatId, textToDeliver, { mentions: groupMentions, quoted: msg, allowExternalGroupResponse: true });
          }
        } else if (isExplicitCreativeImageRequest(bodyText)) {
          try {
            const groupImg = await generateCustomUserCreativeImage({
              userPrompt: bodyText.replace(/@\d{7,18}\b/g, ' ').replace(/@jania\b/gi, ' ').trim(),
              includeJaniaAvatar: true
            });
            await this.queuedSend(chatId, {
              image: groupImg.buffer,
              mimetype: 'image/jpeg',
              caption: textToDeliver || groupImg.caption
            }, { mentions: groupMentions, quoted: msg, allowExternalGroupResponse: true });
          } catch (_) {
            await this.queuedSend(chatId, textToDeliver, { mentions: groupMentions, quoted: msg, allowExternalGroupResponse: true });
          }
        } else {
          // Decisión Autónoma de JanIA (IA Pura): O responde por Nota de Voz PTT exclusiva o por Texto exclusivo (NUNCA ambos a la vez)
          const shouldSendVoice = (wantsVoice || isAudioPTT) && result.wantsVoice !== false;

          if (shouldSendVoice) {
            try {
              const media = await textToSpeechMedia(voiceToDeliver);
              if (media && media.data) {
                const audioBuffer = Buffer.from(media.data, 'base64');
                await this.queuedSend(chatId, {
                  audio: audioBuffer,
                  mimetype: media.mimetype || 'audio/ogg; codecs=opus',
                  ptt: true
                }, { mentions: groupMentions, quoted: msg, allowExternalGroupResponse: true });
                console.log(`[JANIA-MATCH] ✓ JanIA respondió autónomamente con Nota de Voz PTT en grupo ${chatId}.`);
              } else {
                // Fallback a texto solo si la síntesis de voz no produjo buffer
                await this.queuedSend(chatId, textToDeliver, {
                  mentions: groupMentions,
                  quoted: msg,
                  allowExternalGroupResponse: true
                });
              }
            } catch (audioSendErr: any) {
              console.error('[JANIA-MATCH] Error enviando nota de voz. Fallback a texto:', audioSendErr?.message || audioSendErr);
              await this.queuedSend(chatId, textToDeliver, {
                mentions: groupMentions,
                quoted: msg,
                allowExternalGroupResponse: true
              });
            }
          } else {
            // JanIA decidió responder con texto escrito
            await this.queuedSend(chatId, textToDeliver, {
              mentions: groupMentions,
              quoted: msg,
              allowExternalGroupResponse: true
            });
          }
        }

        // 🎨 Despacho Contextual de Stickers 3D Oficiales de JanIA en Grupos (v34.00 — Doctrina Eduardo A. Rivera)
        if (groupStickerBuffer && Buffer.isBuffer(groupStickerBuffer)) {
          console.log(`[JANIA-MATCH] [GROUP-STICKER] Despachando sticker 3D oficial de JanIA en grupo ${chatId}`);
          await this.queuedSend(chatId, {
            sticker: groupStickerBuffer
          }, { mentions: groupMentions, allowExternalGroupResponse: true, skipDelay: true });
        }

        // Registrar la respuesta enviada por JanIA en la BD de mensajes para mantener el hilo de la conversación
        await this.logToDb(chatId, 'janIA', textToDeliver);
      } else if (result && result.reactionEmoji && this.sock) {
        await this.sock.sendMessage(chatId, { react: { text: result.reactionEmoji, key: msg.key } }).catch(() => { });
      }

      await this.sock.sendPresenceUpdate('paused', chatId);
    } catch (err) {
      console.error('[JANIA-MATCH] Error al responder pregunta directa en grupo:', err);
    }
  }

  private isPromotionalAd(bodyText: string, senderId: string): boolean {
    const cleanLower = (bodyText || '').toLowerCase();
    const rawPhone = (senderId || '').split('@')[0].replace(/[^0-9]/g, '');

    // Contacto específico de publicidad / cursos: Carolina Rodríguez (+573212857044)
    const isCarolina = rawPhone.includes("573212857044") || rawPhone.includes("3212857044");

    // Frases y patrones de publicidad de capacitaciones, cursos, libros, entrenamientos o servicios no inmobiliarios
    const promoPhrases = [
      "captar no es improvisar",
      "especialización dentro de la labor inmobiliaria",
      "adquiere tu entrenamiento",
      "espiral del éxito",
      "conocimiento llena tus bolsillos",
      "adquiérelo precio",
      "precio de oferta",
      "no más captaciones mediocres",
      "no más procesos informales",
      "no más inmuebles sin legalizar",
      "no más trabajar sin asegurar el pago de tu comisión",
      "proteger tus honorarios",
      "método probado para captar",
      "curso inmobiliario",
      "taller inmobiliario",
      "seminario inmobiliario",
      "capacitación inmobiliaria",
      "masterclass inmobiliaria",
      "webinar inmobiliario",
      "coaching inmobiliario",
      "mentoría inmobiliaria",
      "invierte en tu negocio",
      "invierte en conocimiento",
      "campaña en meta",
      "campana en meta",
      "campañas en meta",
      "campanas en meta",
      "yo implemento tus campañas",
      "yo implemento tus campanas",
      "implemento tus campañas",
      "implemento tus campanas",
      "implementamos tus campañas",
      "anuncio en facebook",
      "anuncios en facebook",
      "anuncio en instagram",
      "anuncios en instagram",
      "anuncios en meta",
      "pauta en facebook",
      "pauta en instagram",
      "pauta en redes",
      "pauta en meta",
      "pauta digital",
      "agencia de marketing",
      "agencia digital",
      "marketing digital",
      "servicio de marketing",
      "servicios de marketing",
      "generación de leads",
      "generacion de leads",
      "prospectos calificados",
      "trafficker",
      "media buyer",
      "funnel de ventas",
      "embudo de ventas"
    ];

    const hasPromoKeywords = promoPhrases.some(phrase => cleanLower.includes(phrase));
    if (hasPromoKeywords) return true;

    // Si es un mensaje de Carolina ofreciendo entrenamientos o capacitaciones que no sean ofertas/demandas directas de inmuebles
    if (isCarolina) {
      const isRealEstateListing = (cleanLower.includes("vendo") || cleanLower.includes("arriendo") || cleanLower.includes("busco") || cleanLower.includes("necesito")) && (cleanLower.includes("apto") || cleanLower.includes("apartamento") || cleanLower.includes("casa") || cleanLower.includes("bodega") || cleanLower.includes("lote") || cleanLower.includes("finca"));
      if (!isRealEstateListing) {
        return true;
      }
    }

    return false;
  }

  // --- LOGÍSTICA DE BUFFER GRUPAL Y REACCIÓN INSTANTÁNEA ---
  private async handleIncomingGroupMessage(
    msg: proto.IWebMessageInfo,
    chatId: string,
    bodyText: string,
    imageBufferImmediate?: string,
    pdfBufferImmediate?: string,
    pdfMimeTypeImmediate?: string
  ) {
    if (!msg.key || !msg.message) return;

    const rawSender = msg.key.participant || msg.participant || '';
    if (!rawSender || rawSender.endsWith('@g.us')) {
      console.warn(`[JANIA-MATCH] Omitiendo mensaje de grupo: sender individual inválido (${rawSender})`);
      return;
    }
    const senderId = rawSender.includes('@') ? `${rawSender.split('@')[0].split(':')[0]}@${rawSender.split('@')[1]}` : rawSender.split(':')[0];

    const isOfficialGroup = chatId === this.targetGroupId || chatId === this.buzonGroupId || chatId === this.circuloGroupId;

    // --- PROTECCIÓN Y FILTRADO DE PUBLICIDAD NO INMOBILIARIA (CURSOS, ENTRENAMIENTOS, CAROLINA RODRÍGUEZ, ETC.) ---
    if (this.isPromotionalAd(bodyText, senderId)) {
      if (!msg.key.fromMe) {
        if (isOfficialGroup) {
          // 🚫 EN GRUPOS OFICIALES VECY: Reaccionar con 🚫, eliminar de inmediato y advertir formalmente
          console.log(`[JANIA-PROMO-RULE] 🚫 Publicidad no autorizada detectada en grupo oficial de +${senderId.split('@')[0]}. Eliminando y advirtiendo...`);

          this.sock.sendMessage(chatId, { react: { text: '🚫', key: msg.key } }).catch(() => { });
          this.sock.sendMessage(chatId, { delete: msg.key }).catch(() => { });

          const rawPhone = senderId.split('@')[0];
          const mentionJid = `${rawPhone}@s.whatsapp.net`;
          const warningText = `🚫 @${rawPhone}: Esta clase de publicaciones (publicidad de cursos, entrenamientos, capacitaciones o servicios ajenos a la oferta y demanda directa de inmuebles) VIOLAN las normas de nuestros grupos oficiales de VECY Bienes Raíces.\n\nHe procedido a eliminar tu publicación para preservar el orden profesional de la comunidad. Te advertimos que la reincidencia dará lugar a la expulsión del grupo.`;

          this.queuedSend(chatId, warningText, { mentions: [mentionJid] }).catch(() => { });
        } else {
          // 🛡️ EN GRUPOS EXTERNOS: CERO REACCIONES, CERO INGESTA, CERO SUPABASE / BD (IGNORAR 100% SILENCIOSO)
          console.log(`[JANIA-PROMO-SHIELD] 🛡️ Publicidad no inmobiliaria ignorada en grupo externo de +${senderId.split('@')[0]} (Cero reacción, cero ingesta, cero Supabase).`);
        }
      }
      return; // Salir inmediatamente sin capturar, ni extraer datos, ni subir a Supabase
    }

    // --- REACCIÓN INSTANTÁNEA (< 200ms) PARA TEXTO, ENLACES Y DOCUMENTOS ---
    let flyerVisionData: any = null;
    // Permitir reacción instantánea tanto para publicaciones de terceros como para las enviadas por Eduardo
    if (!this.botSentMessageIds.has(msg.key?.id || '')) {
      let cleanLower = (bodyText || '').toLowerCase();

      // Enriquecer cleanLower con las palabras clave embebidas en enlaces (slugs de portales inmobiliarios)
      const detectedUrls = cleanLower.match(/https?:\/\/[^\s]+/g) || [];
      for (const u of detectedUrls) {
        try {
          const parsed = new URL(u);
          const slugText = decodeURIComponent(parsed.pathname).replace(/[-_/.]/g, ' ');
          cleanLower += ` ${slugText}`;
        } catch (_) { }
      }

      let groupSubject = "";
      let groupMeta: any = null;
      try {
        const meta = await this.getCachedGroupMetadata(chatId);
        if (meta) {
          groupMeta = meta;
          if (meta.subject) groupSubject = meta.subject;
        }
      } catch (_) { }

      const isVipGroup = isVipRealEstateGroup(groupMeta, groupSubject);
      const isGroupRentContext = /arriend|alquil|renta/i.test(groupSubject);

      const isGroupOfferContext = isVipGroup || /ofert|venta|lotes?|casas?|fincas?|bodegas?|locales?|apto|apartamento|inversion/i.test(groupSubject);
      const isGroupDemandContext = isVipGroup || /requerimiento|busqueda|búsqueda|pedidos/i.test(groupSubject);

      const hasPermuta = /\b(?:permuto|permuta|permutas|permutamos|se permuta|recibo menor valor|recibo inmueble|recibo vehículo|recibo vehiculo|pelo a pelo|encime|parte de pago)\b/i.test(cleanLower);
      const isExplicitVenta = /\b(?:venta|vendo|vendemos|se vende|en venta|venta directa|compro|compran|compramos|para compra|en compra|comprador|compradores)\b/i.test(cleanLower);
      const hasRentExplicit = /\b(?:arriendo|arriendos|arrendar|arrendamos|se arrienda|arriendan|alquilo|alquilar|alquilamos|se alquila|alquiler|alquileres|rento|rentar|se renta|renta|rentas|canon|canones|cánones|arrendatario|arrendador|inquilino)\b/i.test(cleanLower)
        || (!isExplicitVenta && (
             /(?:incluida|con|\+|más|mas)\s*(?:administraci[oó]n|admon)/i.test(cleanLower)
             || /(?:administraci[oó]n|admon)\s*(?:incluida|adicional)/i.test(cleanLower)
             || /valor arriendo/i.test(cleanLower)
             || (/\bamoblado\b|\bamoblada\b|\bsin amoblar\b/i.test(cleanLower) && !isExplicitVenta)
           ));

      // Si el grupo es explícitamente de arriendos o el texto tiene señales de arriendo (administración incluida, canon, etc.)
      const isRentOperation = hasRentExplicit || (isGroupRentContext && !isExplicitVenta && !cleanLower.startsWith('vendo') && !cleanLower.startsWith('se vende'));

      const hasPropertyKeyword = /\b(?:apto|aptos|apartamento|apartamentos|casa|casas|bodega|bodegas|oficina|oficinas|lote|lotes|finca|fincas|local|locales|edificio|edificios|terreno|terrenos|penthouse|duplex|dúplex|consultorio|consultorios)\b/i.test(cleanLower);

      const isExplicitDemand = /\b(?:req\b|requerimiento|requerimientos|requiero|se requiere|requerimos|busco|buscamos|se busca|buscando|en búsqueda|en busqueda|necesito|necesitamos|necesitando|solicito|solicitamos|solicitando|solicitud|solicitudes|compro|comprando|comprador|compradores|comprar|en compra|para compra|negocio compra|para cliente|para clientes|tengo cliente|tenemos cliente|busca cliente|cliente busca|clientes buscan|arrendatario|inquilino)\b/i.test(cleanLower);
      const isExplicitOffer = !isExplicitDemand && (
        /\b(?:ofrezco|ofrecemos|vendo|vendemos|se vende|en venta|venta directa|arriendo|arriendos|arrendamos|arrendar|se arrienda|en arriendo|arriendo directo|pongo en arriendo|alquilo|alquilamos|alquilar|se alquila|en alquiler|alquiler directo|rento|rentamos|rentar|se renta|en renta|tengo para|disponible|disponibles|nuevo inmueble|permuto|permutamos|se permuta)\b/i.test(cleanLower)
        || /(?:cuenta con|consta de|\d+\s*(?:m2|mts|m²)|alcobas|habitaciones|baños|parqueaderos?|cocina|sala|comedor|dep[oó]sito)/i.test(cleanLower)
        || (hasPropertyKeyword && (isGroupOfferContext || cleanLower.includes("$") || cleanLower.includes("millon") || cleanLower.includes("precio") || cleanLower.includes("canon")))
      );
      const isExplicitSearch = isExplicitDemand || (!isExplicitOffer && isGroupDemandContext && hasPropertyKeyword);

      let fastEmoji: string | null = null;

      // ── MATRIZ DOCTRINAL v23.0 (6 EMOJIS DE NEGOCIO) ──
      // 👍 Oferta Venta | 📝 Demanda Venta | 👌 Oferta Arriendo | ✏️ Demanda Arriendo | 🔀 Oferta Permuta | 🔄 Demanda Permuta
      if (isExplicitOffer) {
        if (hasPermuta) {
          fastEmoji = '🔀'; // Oferta con Permuta
        } else if (isRentOperation) {
          fastEmoji = '👌'; // Oferta Arriendo
        } else {
          fastEmoji = '👍'; // Oferta Venta
        }
      } else if (isExplicitSearch) {
        if (hasPermuta) {
          fastEmoji = '🔄'; // Demanda con Permuta
        } else if (isRentOperation) {
          fastEmoji = '✏️'; // Demanda Arriendo
        } else {
          fastEmoji = '📝'; // Demanda Venta
        }
      }

      // ── REACCIÓN RÁPIDA VISUAL PARA FLYERS/AFICHES (v31.22) ──
      // Si el texto no tenía señales explícitas (afiche enviado sin texto o con pie corto),
      // evaluamos el buffer de imagen con visión ligera en tiempo real
      if (!fastEmoji && imageBufferImmediate) {
        try {
          const { extractFlyerVisionSafely } = await import('./jania/vision');
          flyerVisionData = await extractFlyerVisionSafely(imageBufferImmediate);
          if (flyerVisionData && flyerVisionData.isFlyerOrBanner && (flyerVisionData.classification === "INMUEBLE" || flyerVisionData.classification === "REQUERIMIENTO") && flyerVisionData.flyerVerbatimText && flyerVisionData.flyerVerbatimText.trim().length >= 15) {
            fastEmoji = flyerVisionData.reactionEmoji || (flyerVisionData.classification === "REQUERIMIENTO" ? "📝" : "👍");
            console.log(`[JANIA-FAST-REACT] 🎯 Flyer comercial con texto detectado visualmente (${flyerVisionData.classification}). Reacción rápida: ${fastEmoji}`);
          }
        } catch (visErr: any) {
          console.warn('[JANIA-FAST-REACT] Error en análisis visual de flyer:', visErr?.message || visErr);
        }
      }

      if (fastEmoji && chatId !== this.buzonGroupId) {
        this.safeReact(chatId, msg.key, fastEmoji, 'FAST-REACT');
      }
    }
    const lockKey = `${chatId}_${senderId}`;

    const previousLock = this.processingLocks.get(lockKey) || Promise.resolve();
    let resolveLock!: () => void;
    const currentLock = new Promise<void>(resolve => { resolveLock = resolve; });
    const chainedLock = previousLock.then(() => currentLock);
    this.processingLocks.set(lockKey, chainedLock);

    try {
      await previousLock;
      const realName = msg.pushName || `Asesor +${senderId.split('@')[0]}`;
      const bufferKey = `${chatId}_${senderId}`;

      const isMainGroup = chatId === this.targetGroupId;
      const textLower = bodyText.toLowerCase();

      const now = Date.now();
      const COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutos

      let isBotAdmin = false;
      try {
        const metadata = await this.getCachedGroupMetadata(chatId);
        const me = this.sock.user?.id ? this.sock.user.id.split(':')[0] : '';
        const myParticipant = metadata?.participants?.find((p: any) => p.id.split('@')[0] === me);
        isBotAdmin = !!myParticipant && (myParticipant.admin === 'admin' || myParticipant.admin === 'superadmin');
      } catch (_) { }

      // Modo Fantasma: sin amonestaciones por doble posteo.
      // Se registra el timestamp para uso interno pero sin bloquear el flujo.
      if (isBotAdmin) {
        this.lastGroupMessageTime.set(`${chatId}_${senderId}`, now);
      }

      let buffer = this.messageBuffers.get(bufferKey);
      const bufferTimeout = 3000; // 3 Segundos (Reacción rápida)

      const rawMsgInHandler = unwrapMessage(msg.message);
      const hasMediaInHandler = !!rawMsgInHandler?.imageMessage || !!rawMsgInHandler?.documentMessage || !!rawMsgInHandler?.videoMessage || !!rawMsgInHandler?.audioMessage;

      const msgEntry: BufferedMessage = {
        body: bodyText,
        hasMedia: hasMediaInHandler,
        imageBuffer: imageBufferImmediate,
        pdfBuffer: pdfBufferImmediate,
        pdfMimeType: pdfMimeTypeImmediate,
        flyerVisionData: flyerVisionData,
        originalMsg: msg
      };

      if (buffer) {
        clearTimeout(buffer.timer);
        buffer.messages.push(msgEntry);
        buffer.timer = setTimeout(() => this.processGroupBuffer(bufferKey), bufferTimeout);
      } else {
        this.messageBuffers.set(bufferKey, {
          messages: [msgEntry],
          userName: realName,
          chatId,
          timer: setTimeout(() => this.processGroupBuffer(bufferKey), bufferTimeout)
        });
      }
    } finally {
      resolveLock();
      if (this.processingLocks.get(lockKey) === chainedLock) {
        this.processingLocks.delete(lockKey);
      }
    }
  }

  private async safeReact(chatId: string, msgKey: proto.IMessageKey, emoji: string, reason: string = 'REACT') {
    if (!msgKey || !msgKey.id || !emoji || !this.sock) return;

    const msgId = msgKey.id;
    const reactKey = `${chatId}_${msgId}`;

    // Deduplicación estricta por grupo y mensaje (${chatId}_${msgId}):
    // Garantiza que cada grupo reciba su reacción correspondiente (especialmente los grupos oficiales VECY),
    // pero evita colisiones o reenvíos repetitivos dentro del mismo grupo en menos de 60 segundos.
    const existing = this.reactedMessageIds.get(reactKey);
    if (existing && existing.emoji === emoji && (Date.now() - existing.time < 60000)) {
      console.log(`[JANIA-${reason}] ℹ️ Reacción ${emoji} ya entregada o en cola para ${reactKey}. Omitiendo duplicado.`);
      return;
    }

    // Registrar provisionalmente en memoria para evitar colisiones simultáneas
    this.reactedMessageIds.set(reactKey, { emoji, time: Date.now() });

    // Encolar de forma estrictamente secuencial con pacing seguro para blindar contra 'rate-overlimit' y desconexiones 408
    this.reactionQueue = this.reactionQueue.then(async () => {
      try {
        if (!this.sock || !this.isReady) {
          console.warn(`[JANIA-${reason}] ⚠️ Socket no disponible o reconectando. Omitiendo reacción ${emoji} a ${chatId}`);
          this.reactedMessageIds.delete(reactKey);
          return;
        }

        // Pacing seguro: garantizar mínimo 1200ms entre reacciones sucesivas de WhatsApp
        const now = Date.now();
        const elapsed = now - this.lastReactionTimestamp;
        if (elapsed < this.MIN_REACTION_INTERVAL_MS) {
          await new Promise(r => setTimeout(r, this.MIN_REACTION_INTERVAL_MS - elapsed));
        }

        console.log(`[JANIA-${reason}] 🎯 Despachando reacción ${emoji} a ${chatId} (Msg ID: ${msgId})...`);
        // Timeout de 10s para permitir encriptación completa en grupos masivos de más de 900 miembros
        await Promise.race([
          this.sock.sendMessage(chatId, { react: { text: emoji, key: msgKey } }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout 10s reacción")), 10000))
        ]);
        this.lastReactionTimestamp = Date.now();
        console.log(`[JANIA-${reason}] ✅ Reacción ${emoji} ENTREGADA NATIVAMENTE en WhatsApp`);

        if (this.reactedMessageIds.size > 1500) {
          const threshold = Date.now() - 120000;
          for (const [k, v] of this.reactedMessageIds.entries()) {
            if (v.time < threshold) this.reactedMessageIds.delete(k);
          }
        }
      } catch (err: any) {
        // 🛡️ Si falló la entrega, liberar de reactedMessageIds para permitir reintento de BUFFER-REACT
        this.reactedMessageIds.delete(reactKey);

        const errMsg = err?.message || String(err);
        const isNotAuth = errMsg.includes("not-authorized") || !this.isReady;
        if (isNotAuth) {
          console.warn(`[JANIA-${reason}] ⚠️ Reacción ${emoji} omitida por estado no autorizado o socket desconectado (${errMsg}).`);
          return;
        }

        // Manejo ágil y no bloqueante de fallos de sesión o participantes en grupos (v32.51)
        if (errMsg.includes("No open session")) {
          console.warn(`[JANIA-${reason}] ⚠️ Sesión cerrada detectada al reaccionar a ${chatId}. Forzando refresh Signal en background...`);
          if (msgKey.participant && typeof (this.sock as any)?.assertSessions === 'function') {
            (this.sock as any).assertSessions([msgKey.participant], true).catch(() => { });
          }
          return; // Liberar inmediatamente la cola secuencial sin trabar otros grupos
        }

        console.warn(`[JANIA-${reason}] ⚠️ Reacción ${emoji} a ${chatId} no pudo completarse (${errMsg}). Continuando cola.`);
      }
    }).catch(() => { });

    return this.reactionQueue;
  }

  private getReactionEmoji(result: any, isOfficialGroup: boolean = false): string | null {
    if (!result) return null;

    const data = result.extractedData || {};
    const textToCheck = `${data.rawText || ''} ${result.rawText || ''} ${data.name || ''}`.trim();
    if (isNonRealEstateText(textToCheck)) {
      return null;
    }

    const classification = (result.classification || '').toUpperCase();

    // ── PRIORIDAD 1: Si janIA.ts ya calculó el emoji correcto en base a transactionType ──
    if (result.reactionEmoji) {
      // 🚫 y ❓ JAMÁS se emiten en grupos externos (solo en los 3 grupos oficiales si aplica)
      if ((result.reactionEmoji === '🚫' || result.reactionEmoji === '❓') && !isOfficialGroup) return null;
      return result.reactionEmoji;
    }

    // ── PRIORIDAD 2: Derivar el emoji desde los datos extraídos (cuando no hay reactionEmoji en result) ──
    const txType = (data.transactionType || data.tipoNegocioDeseado || result.transactionType || '').toLowerCase();

    const isPermuta = txType.includes('permuta') || txType === 'venta_permuta' || txType === 'aporte';
    const isRent = txType.includes('arriendo') || txType === 'arriendo_temporal' || txType === 'arriendo_con_opcion_de_compra' || txType.includes('renta') || txType.includes('alquiler');

    // ── REGLA DOCTRINAL v23.0: MATRIZ DE 6 EMOJIS DE NEGOCIO ──
    const isProperty = classification === 'INMUEBLE' || classification.includes('INMUEBLE') || classification.includes('OFERTA');
    const isRequirement = classification === 'REQUERIMIENTO' || classification.includes('REQUERIMIENTO') || classification.includes('DEMANDA') || classification.includes('BUSQUEDA');

    if (isProperty || isRequirement) {
      if (isProperty) {
        if (isPermuta) return '🔀'; // Oferta con Permuta
        if (isRent) return '👌';    // Oferta Arriendo
        return '👍';                // Oferta Venta
      }
      if (isRequirement) {
        if (isPermuta) return '🔄'; // Demanda con Permuta
        if (isRent) return '✏️';    // Demanda Arriendo
        return '📝';                // Demanda Venta
      }
    }

    // ── PRIORIDAD 3: Respaldo para publicaciones inmobiliarias concisas (incluso si classification fue CONSULTA_GENERAL) ──
    const lowerRaw = textToCheck.toLowerCase();
    const hasPropType = /\b(?:casa|casas|apto|aptos|apartamento|apartamentos|bodega|bodegas|oficina|oficinas|lote|lotes|finca|fincas|local|locales|edificio|edificios|terreno|terrenos)\b/i.test(lowerRaw);
    const hasPermutaSignal = /\b(?:permuta|permuto|permutas|permutamos|se permuta|recibo menor|recibo vehiculo|recibo vehículo|recibe menor|pelo a pelo)\b/i.test(lowerRaw);
    const hasRentSignal = /\b(?:renta|arriendo|alquilo|alquiler|canon)\b/i.test(lowerRaw);
    const hasDemandSignal = /\b(?:busco|buscamos|se busca|se requiere|requiero|requerimiento|necesito|necesitamos|solicito|cliente busca)\b/i.test(lowerRaw);

    if (hasPropType || hasPermutaSignal) {
      if (hasDemandSignal) {
        if (hasPermutaSignal) return '🔄'; // Demanda con Permuta
        return hasRentSignal ? '✏️' : '📝'; // Demanda Arriendo / Venta
      } else {
        if (hasPermutaSignal) return '🔀'; // Oferta con Permuta
        return hasRentSignal ? '👌' : '👍'; // Oferta Arriendo / Venta
      }
    }

    // ── SOLO EN EL GRUPO OFICIAL 𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴: Reacciones de moderación ──
    if (isOfficialGroup) {
      if (classification === 'VIOLACION_DE_NORMAS' || classification.includes('SPAM') || classification.includes('INFRACCION')) {
        return '🚫';
      }
      if (classification === 'DATOS_INCOMPLETOS') return '❓';
    }

    return null;
  }



  private async processGroupBuffer(bufferKey: string) {
    const buffer = this.messageBuffers.get(bufferKey);
    if (!buffer) return;

    this.messageBuffers.delete(bufferKey);
    const senderId = bufferKey.split('_')[1];
    const chatId = buffer.chatId;
    const userName = buffer.userName;

    let resolvedSenderId = senderId;
    if (senderId.endsWith('@lid') && this.sock?.signalRepository?.lidMapping?.getPNForLID) {
      try {
        const mappedPn = await this.sock.signalRepository.lidMapping.getPNForLID(senderId);
        if (mappedPn) {
          const cleanUser = mappedPn.split(':')[0].split('@')[0];
          resolvedSenderId = `${cleanUser}@s.whatsapp.net`;
          console.log(`[JANIA-MATCH] Resolviendo LID ${senderId} a PN ${resolvedSenderId}`);
        }
      } catch (err) {
        console.warn(`[JANIA-MATCH] No se pudo resolver PN para LID ${senderId}:`, err);
      }
    }

    console.log(`[JANIA-MATCH] Procesando buffer de ${buffer.messages.length} mensajes para ${resolvedSenderId} (Silencioso)...`);

    // Descarga de imágenes o documentos adjuntos (si no fueron pre-descargados al llegar)
    for (const bufferedMsg of buffer.messages) {
      const rawMsg = unwrapMessage(bufferedMsg.originalMsg.message);
      if (bufferedMsg.hasMedia && rawMsg?.imageMessage && !bufferedMsg.imageBuffer) {
        try {
          const mediaBuffer = await downloadMediaSafely(bufferedMsg.originalMsg as any, 'image');
          if (mediaBuffer) {
            bufferedMsg.imageBuffer = mediaBuffer.toString('base64');
          }
        } catch (e) {
          console.error('[JANIA-BUFFER] Error descargando imagen:', e);
        }
      }
      if (bufferedMsg.hasMedia && rawMsg?.documentMessage && !bufferedMsg.pdfBuffer) {
        try {
          const mediaBuffer = await downloadMediaSafely(bufferedMsg.originalMsg as any, 'document');
          if (mediaBuffer) {
            bufferedMsg.pdfBuffer = mediaBuffer.toString('base64');
            bufferedMsg.pdfMimeType = rawMsg.documentMessage.mimetype || 'application/pdf';
          }
        } catch (e) {
          console.error('[JANIA-BUFFER] Error descargando documento:', e);
        }
      }
    }

    try {
      const distinctListings = buffer.messages.filter(m => {
        // ✅ FIX: Mensajes con imagen O con PDF adjunto siempre pasan
        // — JanIA los procesa con el extractor multimodal (visión / PDF parser)
        if (m.imageBuffer || m.pdfBuffer) return true;
        if (!m.body) return false;
        const clean = m.body.toLowerCase();
        const hasType = clean.includes("apto") || clean.includes("apartamento") || clean.includes("casa") || clean.includes("bodega") || clean.includes("oficina") || clean.includes("lote") || clean.includes("finca") || clean.includes("inmueble") || clean.includes("propiedad") || clean.includes("eds") || clean.includes("estacion") || clean.includes("local") || clean.includes("penthouse") || clean.includes("duplex") || clean.includes("dúplex") || clean.includes("alcoba") || clean.includes("alcobas") || clean.includes("hab") || clean.includes("habitacion") || clean.includes("habitación");
        const hasDetails = clean.includes("venta") || clean.includes("vendo") || clean.includes("vende") || clean.includes("arriendo") || clean.includes("arrienda") || clean.includes("alquilo") || clean.includes("alquila") || clean.includes("compra") || clean.includes("compran") || clean.includes("compro") || clean.includes("cliente") || clean.includes("clienta") || clean.includes("precio") || clean.includes("presupuesto") || clean.includes("millones") || clean.includes("millon") || clean.includes("millón") || clean.includes("mm") || clean.includes("$") || clean.includes("busco") || clean.includes("buscan") || clean.includes("necesito") || clean.includes("necesita") || clean.includes("requiero") || clean.includes("requiere") || clean.includes("requerimiento") || clean.includes("área") || clean.includes("area") || clean.includes("m2") || clean.includes("mts") || clean.includes("http");
        const isClientRequestPattern = /(?:cliente|clienta|comprador|compradora|varios\s+clientes|tengo\s+cliente)\s+(?:compra|compran|busca|buscan|requiere|necesita|solicita)/i.test(clean);
        return (hasType && hasDetails) || isClientRequestPattern;
      });

      const { processWhatsAppMessage, processConsultingMessage, processCirculoMessage } = await import('./janIA');

      if (distinctListings.length > 1 && chatId !== '120363417740040773@g.us' && chatId !== '120363403507276533@g.us') {
        console.log(`[JANIA-MATCH] Detectadas ${distinctListings.length} publicaciones independientes en el mismo minuto para ${resolvedSenderId}. Procesando cada una por separado...`);
        const groupName = await this.resolveGroupName(chatId);

        for (const bufferedMsg of buffer.messages) {
          // ✅ FIX: Permitir mensajes imagen-sola o pdf-solo (body vacío pero imageBuffer/pdfBuffer presente)
          const hasMediaOnly = (!!bufferedMsg.imageBuffer || !!bufferedMsg.pdfBuffer) && (!bufferedMsg.body || bufferedMsg.body.trim() === '');
          if (!bufferedMsg.body || bufferedMsg.body.trim() === '') {
            if (!hasMediaOnly) continue; // Solo omitir si NO tiene imagen ni PDF
          }

          const bodyText = bufferedMsg.body || '';
          const urlMatch = bodyText.match(/https?:\/\/[^\s]+/g);
          const scrapedResults: any[] = [];
          if (urlMatch) {
            const urlsToScrape = urlMatch.slice(0, 2).filter(u => esDominioPermitido(u));
            if (urlsToScrape.length > 0) {
              try {
                const scrapePromises = urlsToScrape.map(u =>
                  Promise.race([
                    scrapePropertyLink(u),
                    new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500))
                  ])
                );
                const settled = await Promise.allSettled(scrapePromises);
                for (const res of settled) {
                  if (res.status === 'fulfilled' && res.value) {
                    scrapedResults.push(res.value);
                  }
                }
              } catch (err) { }
            }
          }

          await this.logToDb(resolvedSenderId, 'user', bodyText || (bufferedMsg.pdfBuffer ? '[documento-pdf]' : '[imagen]'));

          const result = await processWhatsAppMessage(
            bodyText,
            resolvedSenderId,
            userName,
            bufferedMsg.hasMedia,
            scrapedResults,
            undefined,
            bufferedMsg.imageBuffer,
            true,
            bufferedMsg.pdfBuffer,
            bufferedMsg.pdfMimeType,
            chatId,
            groupName,
            bufferedMsg.flyerVisionData
          );

          const isOfficialGroupSingle = chatId === this.targetGroupId || chatId === this.buzonGroupId || chatId === this.circuloGroupId;
          if (result) {
            const emoji = this.getReactionEmoji(result, isOfficialGroupSingle);
            if (emoji && bufferedMsg.originalMsg?.key && bufferedMsg.originalMsg.key.id) {
              this.safeReact(chatId, bufferedMsg.originalMsg.key, emoji, 'MULTI-REACT');
            }
          }
        }
        return;
      }

      const fullText = buffer.messages.map(m => m.body).filter(Boolean).join('\n\n');
      const hasMedia = buffer.messages.some(m => m.hasMedia);
      const imageMsg = buffer.messages.find(m => m.imageBuffer);
      const pdfMsg = buffer.messages.find(m => m.pdfBuffer);
      const isAudioPTT = buffer.messages.some(m => !!m.originalMsg?.message?.audioMessage);

      // ✅ FIX v26.0: Si el mensaje es solo imagen o solo PDF (sin texto), igual debe procesarse
      if (!fullText.trim() && !imageMsg?.imageBuffer && !pdfMsg?.pdfBuffer && !isAudioPTT) {
        console.log(`[JANIA-MATCH] Buffer vacío sin imagen/PDF/audio para ${resolvedSenderId}. Omitiendo.`);
        return;
      }

      // Scraping de enlaces con ejecución paralela rápida no bloqueante
      const urlMatch = fullText.match(/https?:\/\/[^\s]+/g);
      const scrapedResults: any[] = [];
      if (urlMatch) {
        const urlsToScrape = urlMatch.slice(0, 2).filter(u => esDominioPermitido(u));
        if (urlsToScrape.length > 0) {
          try {
            const scrapePromises = urlsToScrape.map(u =>
              Promise.race([
                scrapePropertyLink(u),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500))
              ])
            );
            const settled = await Promise.allSettled(scrapePromises);
            for (const res of settled) {
              if (res.status === 'fulfilled' && res.value) {
                scrapedResults.push(res.value);
              }
            }
          } catch (err: any) {
            console.error(`[SCRAPING-BUFFER] Error al raspar URLs:`, err?.message || err);
          }
        }
      }

      // Guardar logs en BD
      await this.logToDb(resolvedSenderId, 'user', fullText || (pdfMsg ? '[documento-pdf]' : '[imagen]'));

      const { sendAdminNotification } = await import('./whatsapp-utils');

      // 🤝 INTERCEPTOR GRUPOS 2/3: PREGUNTAS DE AYUDA SOBRE SERVICIOS DE JANIA
      // Si alguien pregunta "¿cómo verifico un documento?" o "¿cómo pido el predial?"
      // JanIA responde directamente con la guía, sin pasar por el motor LLM general.
      // Límite: solo en grupos 2 y 3 donde JanIA tiene conversación activa.
      if (
        (chatId === '120363417740040773@g.us' || chatId === '120363403507276533@g.us') &&
        fullText && fullText.trim().length > 0
      ) {
        const { isServiceHelpRequest: isHelpReq, PREDIAL_HELP_TEXT: predialHelp, CEDULA_HELP_TEXT: cedulaHelp } = await import('./predialService');
        const helpKind = isHelpReq(fullText);
        if (helpKind === 'predial') {
          console.log(`[JANIA-MATCH] [GRUPO] Guía PREDIAL enviada a ${resolvedSenderId} en ${chatId}`);
          await this.queuedSend(chatId, predialHelp, { allowGroupMessage: true });
          await this.logToDb(resolvedSenderId, 'janIA', predialHelp);
          return;
        }
        if (helpKind === 'cedula') {
          console.log(`[JANIA-MATCH] [GRUPO] Guía CÉDULA enviada a ${resolvedSenderId} en ${chatId}`);
          await this.queuedSend(chatId, cedulaHelp, { allowGroupMessage: true });
          await this.logToDb(resolvedSenderId, 'janIA', cedulaHelp);
          return;
        }
      }

      // Procesar mediante JanIA (guardará en DB de forma automática)
      let result;
      if (chatId === '120363417740040773@g.us') {
        result = await processConsultingMessage(
          fullText,
          resolvedSenderId,
          userName,
          imageMsg?.imageBuffer,
          pdfMsg?.pdfBuffer,
          pdfMsg?.pdfMimeType,
          isAudioPTT ? ('mock-audio:' + fullText) : undefined
        );
      } else if (chatId === '120363403507276533@g.us') {
        result = await processCirculoMessage(
          fullText,
          resolvedSenderId,
          userName,
          imageMsg?.imageBuffer,
          pdfMsg?.pdfBuffer,
          pdfMsg?.pdfMimeType
        );
      } else {
        const groupName = await this.resolveGroupName(chatId);

        if (isBlacklistedGroup(groupName, chatId)) {
          console.log(`[JANIA-MATCH] 🚫 Grupo '${groupName}' (${chatId}) en lista negra. Descartando buffer por completo.`);
          return;
        }
        result = await processWhatsAppMessage(
          fullText,
          resolvedSenderId,
          userName,
          hasMedia,
          scrapedResults,
          undefined,
          imageMsg?.imageBuffer,
          true,
          pdfMsg?.pdfBuffer,
          pdfMsg?.pdfMimeType,
          chatId,
          groupName,
          imageMsg?.flyerVisionData || buffer.messages.find(m => m.flyerVisionData)?.flyerVisionData
        );
      }

      // --- REACCIONAR A LA PUBLICACIÓN EN GRUPOS (ASÍNCRONO Y SEGURO) ---
      const isOfficialGroup = chatId === this.targetGroupId || chatId === this.buzonGroupId || chatId === this.circuloGroupId;
      if (result) {
        const emoji = this.getReactionEmoji(result, isOfficialGroup);
        if (emoji) {
          const lastMsg = buffer.messages[buffer.messages.length - 1]?.originalMsg;
          if (lastMsg && lastMsg.key && lastMsg.key.id) {
            this.safeReact(chatId, lastMsg.key, emoji, 'BUFFER-REACT');
          }
        }
      }

      // --- MODO SILENCIOSO TOTAL GRUPAL BAILEYS ---
      // No se envían respuestas textuales ni advertencias en grupos a menos que seamos ADMINISTRADOR y sea una INFRACCIÓN.
      if (result) {
        const isWarning = result.classification === "DATOS_INCOMPLETOS" || result.classification === "VIOLACION_DE_NORMAS";

        let isBotAdmin = false;
        try {
          const metadata = await this.getCachedGroupMetadata(chatId);
          const me = this.sock.user?.id ? this.sock.user.id.split(':')[0] : '';
          const myParticipant = metadata?.participants?.find((p: any) => p.id.split('@')[0] === me);
          isBotAdmin = !!myParticipant && (myParticipant.admin === 'admin' || myParticipant.admin === 'superadmin');
        } catch (_) { }

        if (!isWarning) {
          const isConsultation = result.classification === "CONSULTA_GENERAL" || result.classification === "RESPUESTA_A_PREGUNTA_IA" || result.classification === "ANALISIS_DE_MERCADO";

          if (isConsultation) {
            console.log(`[JANIA-MATCH] Consulta general de ${senderId} en ${chatId} procesada en silencio.`);
          } else {
            // Inmueble o Requerimiento exitoso -> reportar match si existe
            if (result.response && result.response.trim() !== "") {
              console.log(`[JANIA-MATCH] Match detectado silenciosamente. Alertas enviadas al administrador.`);
              await sendAdminNotification(`🎯 *[MATCH DETECTADO]*\n\n${result.response}`);
              await this.logToDb(senderId, 'janIA', `[SILENT-MATCH] ${result.response}`);
            }
          }
        } else {
          const isOfficial = chatId === this.targetGroupId || chatId === this.buzonGroupId || chatId === this.circuloGroupId;
          // Si el usuario cometió una infracción o publicó en grupo equivocado en un grupo oficial (1, 2 o 3)
          if (result.classification === "VIOLACION_DE_NORMAS" && isOfficial) {
            const lastMsg = buffer.messages[buffer.messages.length - 1]?.originalMsg;
            if (lastMsg && lastMsg.key && lastMsg.key.id && !lastMsg.key.fromMe) {
              // 1. Reaccionar PRIMERO con 🚫 en los grupos oficiales
              await this.safeReact(chatId, lastMsg.key, '🚫', 'WARNING-REACT');
            }
            if (result.response && result.response.trim() !== "") {
              const textToDeliver = result.response;
              // 2. Enviar el texto cordial de advertencia y redirección citando el mensaje
              await this.queuedSend(chatId, textToDeliver, { quoted: lastMsg });
              await this.logToDb(chatId, 'janIA', `[GROUP-WARNING] ${textToDeliver}`);
            }
            // 3. Si ocurrió en Grupo 1 (Ofertas y Demandas) y el bot es admin, eliminar el mensaje indebido tras 3.5 segundos
            if (chatId === this.targetGroupId && isBotAdmin && lastMsg?.key?.id) {
              setTimeout(async () => {
                try {
                  if (this.sock) {
                    await this.sock.sendMessage(chatId, { delete: lastMsg.key });
                    console.log(`[JANIA-MODERATION] 🗑️ Mensaje indebido de buffer eliminado en Grupo 1: ${lastMsg.key.id}`);
                  }
                } catch (delErr) {
                  console.warn(`[JANIA-MODERATION] Error eliminando mensaje de buffer en Grupo 1:`, delErr);
                }
              }, 3500);
            }
          }
        }

        // Alertas de matches adicionales (derivadas a administración en vez de DMs de usuario)
        if (result.extraDMs && result.extraDMs.length > 0) {
          for (const dm of result.extraDMs) {
            if (!dm.jid || !dm.jid.includes('@') || dm.jid.split('@')[0].length < 5) continue;
            console.log(`[JANIA-MATCH] [Stealth] Derivando notificación de Match adicional para ${dm.jid} a alertas de administrador.`);
            await sendAdminNotification(dm.message);
          }
        }
      }

      // ACTIVAR COOLDOWN DE 5 MINUTOS (solo en grupo principal)
      const isMainGroup = chatId === this.targetGroupId;
      if (isMainGroup) {
        const cooldownKeyFinal = `${chatId}_${senderId}`;
        this.loadCooldowns();
        this.cooldownMap.set(cooldownKeyFinal, {
          lastBlockProcessedAt: Date.now(),
          warningSent: false
        });
        this.saveCooldowns();
      }

    } catch (err) {
      console.error('[JANIA-MATCH] Error procesando buffer de grupo silencioso:', err);
    }
  }

  // --- LOGÍSTICA DE BD ---
  private async logToDb(senderId: string, role: 'user' | 'janIA', content: string) {
    try {
      const db = await getDb();
      if (!db) return;

      let conv = await db.select().from(conversations).where(eq(conversations.sessionId, senderId)).limit(1);
      let conversationId: number;

      if (conv.length === 0) {
        const [newConv] = await db.insert(conversations).values({
          sessionId: senderId,
          status: "active",
          lastMessage: content.slice(0, 150)
        }).returning();
        conversationId = newConv.id;
      } else {
        conversationId = conv[0].id;
        await db.update(conversations).set({
          lastMessage: content.slice(0, 150),
          updatedAt: new Date()
        }).where(eq(conversations.id, conversationId));
      }

      await db.insert(dbMessages).values({
        conversationId,
        role,
        content,
        messageType: "text"
      });
    } catch (e) {
      console.error("[JANIA-MATCH] Error al registrar logs en BD:", e);
    }
  }

  private async handlePrivateDmConversation(msg: proto.IWebMessageInfo, senderId: string, rawPhone: string, bodyText: string) {
    try {
      const realName = msg.pushName || `Asesor +${rawPhone}`;

      // ⚖️ INTERCEPTOR ADMIN: LIQUIDACIÓN DE GASTOS NOTARIALES Y ASESORÍA DE FIGURAS JURÍDICAS (v32.74)
      const { executeNotarialAssistanceFromWhatsApp, hasPendingNotarialSession } = await import('./notarialExpenseService');
      const isNotarialReq =
        (senderId && hasPendingNotarialSession(senderId)) ||
        /(?:gastos?\s*notariales?|derechos?\s*notariales?|escrituraci[oó]n|registro\s*y\s*notar[ií]a|liquidaci[oó]n\s*notarial|impuesto\s*de\s*registro|beneficencia|retenci[oó]n\s*en\s*la\s*fuente|firmar\s*promesa|promesa\s*de\s*compraventa|voy\s*(?:para|a)\s*(?:la\s*)?notar[ií]a|afectaci[oó]n\s*(?:a\s*)?vivienda\s*familiar|afectaci[oó]n\s*familiar|sin\s*afectaci[oó]n|patrimonio\s*de\s*familia|patrimonio\s*cultural|inter[eé]s\s*cultural|bien\s*de\s*inter[eé]s|anotaci[oó]n\s*diferente)/i.test(bodyText);

      if (isNotarialReq) {
        try {
          await this.sock.sendPresenceUpdate('composing', senderId);
          await this.sock.sendMessage(senderId, { react: { text: '⚖️', key: msg.key } }).catch(() => { });
        } catch (_) { }
        const notarialCheck = await executeNotarialAssistanceFromWhatsApp(bodyText, senderId, true);
        if (notarialCheck.isNotarialRequest && notarialCheck.reportText) {
          await this.queuedSend(senderId, notarialCheck.reportText, { quoted: msg, allowDirectMessage: true });
          await this.logToDb(senderId, 'janIA', notarialCheck.reportText);
          await this.sock.sendPresenceUpdate('paused', senderId);
          return;
        }
      }

      // 🏛️ INTERCEPTOR ADMIN: ASISTENCIA PAZ Y SALVO IDU BOGOTÁ (VALORIZACIÓN)
      const isIduReq = bodyText.toLowerCase().includes('idu') || bodyText.toLowerCase().includes('valorizacion') || bodyText.toLowerCase().includes('valorización');
      if (isIduReq) {
        const { executeIduAssistanceFromWhatsApp } = await import('./iduValorizacionService');
        try {
          await this.sock.sendPresenceUpdate('composing', senderId);
          await this.sock.sendMessage(senderId, { react: { text: '⏳', key: msg.key } }).catch(() => { });
        } catch (_) { }
        const iduCheck = await executeIduAssistanceFromWhatsApp(bodyText, senderId, true);
        if (iduCheck.isIduRequest && iduCheck.reportText) {
          if (iduCheck.pdfBuffer) {
            await this.queuedSend(senderId, {
              document: iduCheck.pdfBuffer,
              mimetype: 'application/pdf',
              fileName: iduCheck.pdfFileName || `Paz_y_Salvo_IDU_${iduCheck.chip}_2026.pdf`,
              caption: iduCheck.reportText
            }, { quoted: msg, allowDirectMessage: true });
            await this.sock.sendMessage(senderId, { react: { text: '📄', key: msg.key } }).catch(() => { });
          } else {
            await this.queuedSend(senderId, iduCheck.reportText, { quoted: msg, allowDirectMessage: true });
          }
          await this.logToDb(senderId, 'janIA', iduCheck.reportText);
          await this.sock.sendPresenceUpdate('paused', senderId);
          return;
        }
      }

      // 🏛️ INTERCEPTOR ADMIN: ASISTENCIA PREDIAL BOGOTÁ — VA PRIMERO (prioridad sobre verificación de cédula)
      const { executePredialAssistanceFromWhatsApp } = await import('./predialService');
      try {
        await this.sock.sendPresenceUpdate('composing', senderId);
        if (bodyText.toLowerCase().includes('predial') || bodyText.toLowerCase().includes('chip')) {
          await this.sock.sendMessage(senderId, { react: { text: '⏳', key: msg.key } }).catch(() => { });
        }
      } catch (_) { }
      const predialCheck = await executePredialAssistanceFromWhatsApp(bodyText, senderId, true);
      if (predialCheck.isPredialRequest && predialCheck.reportText) {
        if (predialCheck.pdfBuffer) {
          await this.queuedSend(senderId, {
            document: predialCheck.pdfBuffer,
            mimetype: 'application/pdf',
            fileName: predialCheck.pdfFileName || `Factura_Predial_${predialCheck.chip}_2026.pdf`,
            caption: predialCheck.reportText
          }, { quoted: msg, allowDirectMessage: true });
          await this.sock.sendMessage(senderId, { react: { text: '📄', key: msg.key } }).catch(() => { });
        } else {
          await this.queuedSend(senderId, predialCheck.reportText, { quoted: msg, allowDirectMessage: true });
        }
        await this.logToDb(senderId, 'janIA', predialCheck.reportText);
        await this.sock.sendPresenceUpdate('paused', senderId);
        return;
      }

      // 🛡️ INTERCEPTOR ADMIN: VERIFICACIÓN OFICIAL DE CÉDULA (2CAPTCHA + POLICÍA NACIONAL)
      const { executeIdentityVerificationFromWhatsApp } = await import('./identityVerificationService');
      try {
        await this.sock.sendPresenceUpdate('composing', senderId);
      } catch (_) { }
      const idCheck = await executeIdentityVerificationFromWhatsApp(bodyText, true, senderId);
      if (idCheck.isVerificationRequest && idCheck.reportText) {
        await this.queuedSend(senderId, idCheck.reportText, { quoted: msg, allowDirectMessage: true });
        await this.logToDb(senderId, 'janIA', idCheck.reportText);
        if (idCheck.followUpQuestionText) {
          await new Promise(r => setTimeout(r, 900));
          await this.queuedSend(senderId, idCheck.followUpQuestionText, { allowDirectMessage: true });
          await this.logToDb(senderId, 'janIA', idCheck.followUpQuestionText);
        }
        await this.sock.sendPresenceUpdate('paused', senderId);
        return;
      }

      // Si no es verificación de cédula ni predial, guardar silencio absoluto (cero audios o textos automáticos no solicitados)
      return;
    } catch (err) {
      console.error('[JANIA-MATCH] Error en handlePrivateDmConversation:', err);
    }
  }

  private async handleRedirectText(msg: proto.IWebMessageInfo, senderId: string, rawPhone: string) {
    try {
      const realName = msg.pushName || `Asesor +${rawPhone}`;
      const firstName = extractFirstName(realName);
      await this.sock.sendPresenceUpdate('composing', senderId);
      await delay(2000);

      const redirectMsg =
        `Hola ${firstName} 👋😊. Si tienes dudas, inquietudes o quieres consultarme algo (sea por escrito o por notas de voz), puedes hacerlo directamente por aquí en este chat privado para atenderte de forma personalizada, o si lo prefieres, interactuar en nuestros grupos oficiales de WhatsApp:\n\n` +
        `Mis grupos oficiales:\n\n` +
        `1️⃣ *Para publicar tus OFERTAS y DEMANDAS:* ${VECY_OFFICIAL_GROUPS.grupo1.name}\n🔗 Enlace: ${VECY_OFFICIAL_GROUPS.grupo1.inviteLink}\n\n` +
        `2️⃣ *Para consultas públicas, tips y debates inmobiliarios:* ${VECY_OFFICIAL_GROUPS.grupo2.name}\n🔗 Enlace: ${VECY_OFFICIAL_GROUPS.grupo2.inviteLink}\n\n` +
        `3️⃣ *Para conocer el proyecto, foros y alianzas:* ${VECY_OFFICIAL_GROUPS.grupo3.name}\n🔗 Enlace: ${VECY_OFFICIAL_GROUPS.grupo3.inviteLink}\n\n` +
        `¡Allí te atenderé con todo el gusto! 🚀`;

      await this.queuedSend(senderId, redirectMsg, { quoted: msg });
      await this.logToDb(senderId, 'janIA', redirectMsg);
      await this.sock.sendPresenceUpdate('paused', senderId);
    } catch (err) {
      console.error('[JANIA-MATCH] Error al enviar mensaje de redirección de DM privado:', err);
    }
  }


  private async processMatchConfirmation(senderId: string, realName: string, matchId: number, decision: string) {
    try {
      const db = await getDb();
      if (!db) {
        await this.queuedSend(senderId, "⚠️ El sistema de base de datos no está disponible en este momento. Inténtalo más tarde.");
        return;
      }

      // 1. Buscar el match
      const [match] = await db.select().from(propertyMatches).where(eq(propertyMatches.id, matchId)).limit(1);
      if (!match) {
        await this.queuedSend(senderId, `⚠️ No encontré ninguna coincidencia registrada con el código *#M${matchId}*. Por favor verifica el número.`);
        return;
      }

      // 2. Buscar propiedad y requerimiento asociados
      const [prop] = await db.select().from(properties).where(eq(properties.id, match.propertyId)).limit(1);
      const [req] = await db.select().from(requirements).where(eq(requirements.id, match.requirementId)).limit(1);

      if (!prop || !req) {
        await this.queuedSend(senderId, "⚠️ Hubo un problema al recuperar los detalles de esta coincidencia.");
        return;
      }

      const senderPhone = senderId.split('@')[0];
      const ownerPhone = prop.idUsuarioWhatsapp || '';
      const seekerPhone = req.idUsuarioWhatsapp || '';

      const isOwner = senderPhone === ownerPhone.split('@')[0];
      const isSeeker = senderPhone === seekerPhone.split('@')[0];

      if (!isOwner && !isSeeker) {
        await this.queuedSend(senderId, "⚠️ No estás autorizado para confirmar esta coincidencia.");
        return;
      }

      if (decision === 'no') {
        // Cancelar el match
        await db.update(propertyMatches).set({ status: 'rejected' }).where(eq(propertyMatches.id, matchId));
        await this.queuedSend(senderId, `Entendido. He marcado la coincidencia *#M${matchId}* como cancelada. No se compartirán tus datos de contacto.`);
        await this.logToDb(senderId, 'janIA', `[Match-Rejected] Match #M${matchId} rechazado por el usuario.`);

        // Notificar a la otra parte
        const otherJid = isOwner ? (seekerPhone.includes('@') ? seekerPhone : `${seekerPhone}@s.whatsapp.net`) : (ownerPhone.includes('@') ? ownerPhone : `${ownerPhone}@s.whatsapp.net`);
        await this.queuedSend(otherJid, `Aviso: La coincidencia *#M${matchId}* ha sido cancelada por la otra parte.`);
        return;
      }

      // Si es SÍ
      let updateFields: any = {};
      if (isOwner) {
        updateFields.ownerConfirmed = true;
      }
      if (isSeeker) {
        updateFields.seekerConfirmed = true;
      }

      await db.update(propertyMatches).set(updateFields).where(eq(propertyMatches.id, matchId));

      // Obtener el match actualizado
      const [updatedMatch] = await db.select().from(propertyMatches).where(eq(propertyMatches.id, matchId)).limit(1);

      if (updatedMatch.ownerConfirmed && updatedMatch.seekerConfirmed) {
        // Ambas partes confirmaron
        await db.update(propertyMatches).set({ status: 'interested' }).where(eq(propertyMatches.id, matchId));

        let ownerName = "Oferente";
        let seekerName = "Interesado";

        try {
          const [ownerUser] = await db.select().from(users).where(eq(users.phone, ownerPhone)).limit(1);
          if (ownerUser && ownerUser.name) ownerName = ownerUser.name;
        } catch { }

        try {
          const [seekerUser] = await db.select().from(users).where(eq(users.phone, seekerPhone)).limit(1);
          if (seekerUser && seekerUser.name) seekerName = seekerUser.name;
        } catch { }

        const ownerJid = ownerPhone.includes('@') ? ownerPhone : `${ownerPhone}@s.whatsapp.net`;
        const seekerJid = seekerPhone.includes('@') ? seekerPhone : `${seekerPhone}@s.whatsapp.net`;

        const matchScoreFormatted = Number(updatedMatch.matchScore || 0).toFixed(0);

        const msgToOwner = `🎉🎈 *¡CONEXIÓN DE NEGOCIO EXITOSA!* 🎈🎉
Felicidades, ambas partes han confirmado interés en la coincidencia *#M${matchId}* (Coincidencia: ${matchScoreFormatted}%).

Aquí tienes el contacto directo del aliado interesado en tu propiedad:
👤 *Nombre:* ${seekerName}
📞 *WhatsApp:* https://wa.me/${seekerPhone.split('@')[0]}
💬 *Su requerimiento:* ${req.rawText || 'Sin descripción'}

¡Les deseamos mucho éxito en el cierre comercial! 🤝🚀`;

        const msgToSeeker = `🎉🎈 *¡CONEXIÓN DE NEGOCIO EXITOSA!* 🎈🎉
Felicidades, ambas partes han confirmado interés en la coincidencia *#M${matchId}* (Coincidencia: ${matchScoreFormatted}%).

Aquí tienes el contacto directo del aliado que ofrece la propiedad:
👤 *Nombre:* ${ownerName}
📞 *WhatsApp:* https://wa.me/${ownerPhone.split('@')[0]}
💬 *Su oferta:* ${prop.rawText || 'Sin descripción'}

¡Les deseamos mucho éxito en el cierre comercial! 🤝🚀`;

        // No enviar notificaciones de match en WhatsApp a ningún humano (se gestiona 100% en la plataforma web)
        await this.logToDb(ownerJid, 'janIA', `[Match-Connected] Match #M${matchId} connected in DB. Seeker is ${seekerPhone}`);
        await this.logToDb(seekerJid, 'janIA', `[Match-Connected] Match #M${matchId} connected in DB. Owner is ${ownerPhone}`);
      } else {
        // Solo esta parte ha confirmado
        await this.queuedSend(senderId, `¡Gracias! He registrado tu confirmación de interés para la coincidencia *#M${matchId}*.\n\nEn cuanto la otra parte también confirme, les compartiré mutuamente sus datos de contacto para que puedan cerrar el negocio. 🚀`);
        await this.logToDb(senderId, 'janIA', `[Match-Confirmed-Waiting] User confirmed match #M${matchId}, waiting for peer.`);
      }
    } catch (err: any) {
      console.error(`[JANIA-MATCH] Error procesando confirmación para coincidencia #${matchId}:`, err);
      await this.queuedSend(senderId, "⚠️ Ocurrió un error interno al procesar tu confirmación.");
    }
  }

  public async queuedSend(chatId: string, content: any, options: any = {}) {
    outgoingQueue = outgoingQueue.then(async () => {
      try {
        if (!this.sock) {
          throw new Error("Cliente Baileys no inicializado");
        }

        let targetJid = chatId;
        if (targetJid.endsWith('@c.us')) {
          targetJid = targetJid.replace('@c.us', '@s.whatsapp.net');
        }

        if (targetJid.endsWith('@g.us')) {
          const isAuthorized = targetJid === this.targetGroupId ||
            targetJid === this.buzonGroupId ||
            targetJid === this.circuloGroupId ||
            options.allowExternalGroupResponse === true ||
            options.allowGroupMessage === true;
          if (!isAuthorized) {
            console.log(`[JANIA-MATCH-SHIELD] Bloqueado envío de mensaje a grupo no autorizado (Modo Ingesta Fantasma): ${targetJid}`);
            return;
          }
        }

        // Failsafe de DM: Impedir el envío de cualquier mensaje directo a usuarios que no sean administradores ni broker oficial, salvo transaccionales autorizados
        if (targetJid.endsWith('@s.whatsapp.net')) {
          const rawPhone = targetJid.split('@')[0];
          const ADMIN_PHONE = process.env.ADMIN_PHONE || "573192919978";
          const BROKER_OFFICIAL_PHONE = "573166569719";
          const isAuthorizedStaff = rawPhone === "573192919978" ||
            rawPhone === BROKER_OFFICIAL_PHONE ||
            rawPhone.includes(ADMIN_PHONE);
          const isTransactionalAllowed = options.allowDirectMessage === true || options.isTransactionalNotification === true;

          if (!isAuthorizedStaff && !isTransactionalAllowed) {
            console.log(`[JANIA-ANTI-BAN-SHIELD] 🛡️ Bloqueado envío de mensaje directo (DM) a usuario no administrador (${targetJid}). Prohibición absoluta de DMs a terceros.`);
            return;
          }
        }

        let messagePayload: any = {};

        // Si es un string
        if (typeof content === 'string') {
          const sanitizedText = sanitizeResponseMarkdown(content);
          const rawText = sanitizedText.trim();
          if (
            !targetJid.endsWith('@newsletter') &&
            (rawText.endsWith('@lid') || rawText.endsWith('@s.whatsapp.net') || /^\+?\d{9,18}$/.test(rawText))
          ) {
            console.error(`[JANIA-MATCH] [CENTINELA] Detectado intento de enviar mensaje de texto que es un identificador raw ("${rawText}"). Bloqueando despacho erróneo.`);
            return null;
          }
          messagePayload = { text: sanitizedText };
          if (options.mentions) {
            messagePayload.mentions = options.mentions;
          }
        }
        // Si ya es un payload directo de Baileys
        else if (content && (content.text || content.audio || content.image || content.video || content.document || content.sticker || content.location || content.contacts || content.poll || content.event)) {
          messagePayload = content;
          if (typeof messagePayload.text === 'string') {
            messagePayload.text = sanitizeResponseMarkdown(messagePayload.text);
          }
          if (typeof messagePayload.caption === 'string') {
            messagePayload.caption = sanitizeResponseMarkdown(messagePayload.caption);
          }
          if (options.mentions) {
            messagePayload.mentions = options.mentions;
          }
        }
        // Si es un objeto de tipo MessageMedia (de whatsapp-web.js)
        else if (content && content.data && content.mimetype) {
          const buffer = Buffer.from(content.data, 'base64');
          if (content.mimetype.startsWith('audio/')) {
            messagePayload = {
              audio: buffer,
              mimetype: content.mimetype,
              ptt: options.sendAudioAsVoice || false
            };
          } else if (content.mimetype.startsWith('image/')) {
            messagePayload = {
              image: buffer,
              mimetype: content.mimetype
            };
          } else {
            messagePayload = {
              document: buffer,
              mimetype: content.mimetype,
              fileName: content.filename || 'archivo'
            };
          }
        }

        const isNewsletter = targetJid.endsWith('@newsletter');
        const sendOptions: any = {};
        if (options.quoted && !isNewsletter) {
          sendOptions.quoted = options.quoted;
        }

        // ── CANALES / NEWSLETTERS DE WHATSAPP ──
        // Baileys maneja nativamente los headers multimedia para newsletters.
        // Los canales NO admiten ptt: true (notas de voz PTT), se despachan como audio estándar.
        if (isNewsletter && messagePayload.audio) {
          messagePayload.ptt = false;
        }

        // ── ESCUDO DE SIMULACIÓN HUMANA (Human-Like Delay & Presence Updates) ──
        if (!isNewsletter) {
          const textContent = messagePayload.text || messagePayload.caption;
          if (options.skipDelay) {
            await delay(250);
          } else if (textContent && typeof textContent === 'string') {
            try {
              this.sock.presenceSubscribe?.(targetJid)?.catch?.(() => {});
              await this.sock.sendPresenceUpdate('composing', targetJid);
              const typingDelay = Math.min(2500, Math.max(1000, textContent.length * 15));
              await delay(typingDelay);
            } catch (_) { }
          } else if (messagePayload.audio) {
            try {
              this.sock.presenceSubscribe?.(targetJid)?.catch?.(() => {});
              await this.sock.sendPresenceUpdate('recording', targetJid);
              const recordingDelay = Math.min(3000, Math.max(1500, (options.voiceLength || 2) * 200));
              await delay(recordingDelay);
            } catch (_) { }
          }
        } else {
          // Espaciado seguro para canales para garantizar orden y procesamiento CDN
          await delay(2000);
        }

        let sent;
        try {
          sent = await this.sock.sendMessage(targetJid, messagePayload, sendOptions);
        } catch (sendErr: any) {
          if (sendOptions.quoted) {
            console.warn(`[JANIA-MATCH] Reintentando despacho a ${targetJid} sin parámetro quoted (${sendErr?.message})...`);
            delete sendOptions.quoted;
            sent = await this.sock.sendMessage(targetJid, messagePayload, sendOptions);
          } else {
            throw sendErr;
          }
        }
        if (sent && sent.key && sent.key.id) {
          this.botSentMessageIds.add(sent.key.id);
          if (sent.message) {
            this.saveMessageToStore(sent.key.id, sent.message);
          }
        }
        await delay(1000);
        return sent || null;
      } catch (err: any) {
        console.error('[JANIA-MATCH] Error en despacho de mensaje Baileys:', err.message || err);
        return null;
      }
    });
    return outgoingQueue;
  }

  /**
   * Envía un mensaje de texto directo a un número o JID específico,
   * normalizando celulares colombianos, resolviendo prioritariamente el hilo @lid activo
   * (para garantizar visibilidad inmediata sin "🕒 Esperando el mensaje" tanto en el móvil
   * del destinatario como en el WhatsApp Web de JanIA) y habilitando el flag allowDirectMessage.
   */
  public async sendDirectMessage(targetPhoneOrJid: string, text: string, options: any = {}) {
    if (
      targetPhoneOrJid.endsWith('@lid') ||
      targetPhoneOrJid.endsWith('@g.us') ||
      targetPhoneOrJid.endsWith('@newsletter')
    ) {
      return this.queuedSend(targetPhoneOrJid, text, { allowDirectMessage: true, ...options });
    }

    let clean = (targetPhoneOrJid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
    if (clean.length === 10 && clean.startsWith('3')) {
      clean = '57' + clean;
    }
    const pnJid = `${clean}@s.whatsapp.net`;

    let resolvedLid = this.resolveLidForPhone(clean);
    if (!resolvedLid && this.sock && this.isReady && typeof this.sock.onWhatsApp === 'function') {
      try {
        const onWaRes: any = await Promise.race([
          this.sock.onWhatsApp(pnJid),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 3000))
        ]);
        if (Array.isArray(onWaRes) && onWaRes[0]?.lid) {
          this.registerPhoneLidMapping(clean, onWaRes[0].lid);
          resolvedLid = this.resolveLidForPhone(clean);
        }
      } catch (_) { }
    }

    if (resolvedLid && !options.forcePn && !options.forcePnJid) {
      console.log(`[JANIA-MATCH] [DirectMsg] Enrutando mensaje para +${clean} vía hilo LID activo (${resolvedLid})...`);
      const sentViaLid = await this.queuedSend(resolvedLid, text, { allowDirectMessage: true, ...options });
      if (sentViaLid) {
        return sentViaLid;
      }
      console.warn(`[JANIA-MATCH] [DirectMsg] Fallback de ${resolvedLid} a ${pnJid}...`);
    }

    return this.queuedSend(pnJid, text, { allowDirectMessage: true, ...options });
  }

  /**
   * 📊 Envía una encuesta nativa interactiva en el Canal Oficial de WhatsApp (@newsletter)
   * usando la estructura binaria oficial de Newsletter (<plaintext mediatype="poll"> + <meta polltype="creation" />),
   * porque en los Canales los seguidores NO pueden escribir respuestas de texto.
   */
  public async sendChannelPoll(
    name: string,
    options: string[],
    selectableCount: number = 1,
    channelJid?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.sock || !this.isReady) {
        console.warn(`[JANIA-MATCH] Bot no listo para enviar encuesta de canal`);
        return { success: false, error: 'Bot no listo' };
      }
      if (!this.channelNewsletterId) {
        await this.discoverAndSyncNewsletters().catch(() => { });
      }
      const targetNewsletter = channelJid || this.channelNewsletterId;
      if (!targetNewsletter) {
        console.warn(`[JANIA-MATCH] Canal Oficial no identificado para enviar encuesta.`);
        return { success: false, error: 'Canal Oficial no identificado' };
      }

      const cleanOptions = options.map(o => String(o).trim()).filter(Boolean).slice(0, 12);
      console.log(`[JANIA-MATCH] 🗳️ Despachando Encuesta Nativa de Canal a ${targetNewsletter}: "${name}" (${cleanOptions.length} opciones)...`);

      const crypto = await import('crypto');
      const msgId = `3EB0${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
      const pollProto: proto.IMessage = selectableCount === 1
        ? {
            pollCreationMessageV3: {
              name,
              options: cleanOptions.map(opt => ({ optionName: opt })),
              selectableOptionsCount: 1,
              pollType: 0
            }
          }
        : {
            pollCreationMessage: {
              name,
              options: cleanOptions.map(opt => ({ optionName: opt })),
              selectableOptionsCount: selectableCount,
              pollType: 0
            }
          };

      if (typeof (this.sock as any).sendNode === 'function') {
        const encoded = proto.Message.encode(pollProto).finish();
        const stanza = {
          tag: 'message',
          attrs: {
            to: targetNewsletter,
            type: 'text',
            id: msgId
          },
          content: [
            {
              tag: 'plaintext',
              attrs: { mediatype: 'poll' },
              content: encoded
            },
            {
              tag: 'meta',
              attrs: { polltype: 'creation' }
            }
          ]
        };
        await (this.sock as any).sendNode(stanza);
        this.botSentMessageIds.add(msgId);
        console.log(`[JANIA-MATCH] ✅ Encuesta nativa de Canal enviada exitosamente (${msgId}) a ${targetNewsletter}`);
        return { success: true, messageId: msgId };
      }

      const res = await this.sock.sendMessage(targetNewsletter, {
        poll: {
          name,
          values: cleanOptions,
          selectableCount
        }
      });
      return { success: true, messageId: res?.key?.id || msgId };
    } catch (err: any) {
      console.error(`[JANIA-MATCH] ❌ Error enviando encuesta nativa al Canal:`, err?.message || err);
      return { success: false, error: err?.message || 'Error desconocido' };
    }
  }

  /**
   * 🏆 Envía un Cuestionario / Quiz nativo de WhatsApp (pollType = 1 / QUIZ con correctAnswer)
   * Compatible con el Canal Oficial (@newsletter), Grupos 2 y 3, y DMs.
   */
  public async sendQuiz(
    targetJid: string,
    question: string,
    options: string[],
    correctAnswerIndex: number = 0
  ): Promise<boolean> {
    try {
      if (!this.sock || !this.isReady) return false;
      const cleanOptions = options.map(o => String(o).trim()).filter(Boolean).slice(0, 12);
      if (cleanOptions.length < 2) return false;
      const safeIdx = Math.max(0, Math.min(cleanOptions.length - 1, correctAnswerIndex));
      const correctOption = cleanOptions[safeIdx];

      const quizProto: proto.IMessage = {
        pollCreationMessageV3: {
          name: question,
          options: cleanOptions.map(opt => ({ optionName: opt })),
          selectableOptionsCount: 1,
          pollType: 1,
          correctAnswer: { optionName: correctOption }
        }
      };

      if (targetJid.endsWith('@newsletter') && typeof (this.sock as any).sendNode === 'function') {
        const crypto = await import('crypto');
        const msgId = `3EB0${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
        const encoded = proto.Message.encode(quizProto).finish();
        const stanza = {
          tag: 'message',
          attrs: {
            to: targetJid,
            type: 'text',
            id: msgId
          },
          content: [
            {
              tag: 'plaintext',
              attrs: { mediatype: 'poll' },
              content: encoded
            },
            {
              tag: 'meta',
              attrs: { polltype: 'creation' }
            }
          ]
        };
        await (this.sock as any).sendNode(stanza);
        this.botSentMessageIds.add(msgId);
        console.log(`[JANIA-MATCH] 🏆 Cuestionario (Quiz) nativo enviado al Canal ${targetJid} (${msgId})`);
        return true;
      }

      // 🛡️ BLINDAJE PROTOCOLAR CRÍTICO (Doctrina Eduardo A. Rivera v33.81):
      // JAMÁS enviar pollCreationMessageV3 ni quizProto a grupos (@g.us) ni DMs vía relayMessage.
      // pollCreationMessageV3 solo es soportado en Canales/Newsletters (@newsletter).
      // Enviar pollCreationMessageV3 a un grupo regular provoca el colapso inmediato (crash forzado / freeze)
      // de la app móvil oficial de WhatsApp en teléfonos Android al intentar renderizar el mensaje.
      if (!targetJid.endsWith('@newsletter')) {
        console.log(`[JANIA-MATCH-SHIELD] 🛡️ Cuestionario V3 bloqueado para destino no-canal (${targetJid}). Delegando a encuesta estándar.`);
      }

      await this.sock.sendMessage(targetJid, {
        poll: {
          name: `🏆 CUESTIONARIO: ${question}`,
          values: cleanOptions,
          selectableCount: 1
        }
      });
      console.log(`[JANIA-MATCH] 🏆 Encuesta estándar de Cuestionario enviada exitosamente a ${targetJid}`);
      return true;
    } catch (err: any) {
      console.error(`[JANIA-MATCH] ❌ Error enviando Cuestionario a ${targetJid}:`, err?.message || err);
      return false;
    }
  }

  /**
   * ❓ Envía la herramienta nativa "Preguntar" de WhatsApp (contextInfo: { isQuestion: true })
   * Habilita la tarjeta interactiva de pregunta abierta para que seguidores/miembros envíen sus preguntas a los administradores/JanIA.
   */
  public async sendQuestionPrompt(targetJid: string, questionText: string): Promise<boolean> {
    try {
      if (!this.sock || !this.isReady) return false;
      const questionProto: proto.IMessage = {
        extendedTextMessage: {
          text: questionText,
          contextInfo: {
            isQuestion: true
          }
        }
      };

      if (targetJid.endsWith('@newsletter') && typeof (this.sock as any).sendNode === 'function') {
        const crypto = await import('crypto');
        const msgId = `3EB0${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
        const encoded = proto.Message.encode(questionProto).finish();
        const stanza = {
          tag: 'message',
          attrs: {
            to: targetJid,
            type: 'text',
            id: msgId
          },
          content: [
            {
              tag: 'plaintext',
              attrs: {},
              content: encoded
            }
          ]
        };
        await (this.sock as any).sendNode(stanza);
        this.botSentMessageIds.add(msgId);
        console.log(`[JANIA-MATCH] ❓ Tarjeta nativa "Preguntar" enviada al Canal ${targetJid} (${msgId})`);
        return true;
      }

      // Para grupos o DMs no enviar stanzas experimentales de canal vía relayMessage, enviar texto enriquecido limpio
      await this.queuedSend(targetJid, questionText, { allowDirectMessage: true, allowGroupMessage: true });
      return true;
    } catch (err: any) {
      console.error(`[JANIA-MATCH] Error enviando tarjeta "Preguntar" a ${targetJid}:`, err?.message || err);
      return false;
    }
  }

  /**
   * 📍 Envía un Pin de Ubicación GPS interactivo nativo de WhatsApp (locationMessage)
   */
  public async sendLocationPin(
    targetJid: string,
    latitude: number = 4.6768,
    longitude: number = -74.0482,
    name: string = 'VECY BIENES RAÍCES — Mesa Central Bogotá',
    address: string = 'Parque de la 93 / El Chicó, Bogotá D.C., Colombia',
    quoted?: any
  ): Promise<boolean> {
    try {
      if (!this.sock || !this.isReady) return false;
      console.log(`[JANIA-MATCH] 📍 Despachando pin de ubicación GPS (${name}) a ${targetJid}...`);
      await this.sock.sendMessage(targetJid, {
        location: {
          degreesLatitude: latitude,
          degreesLongitude: longitude,
          name,
          address
        }
      }, quoted ? { quoted } : undefined);
      return true;
    } catch (err: any) {
      console.error(`[JANIA-MATCH] Error enviando ubicación GPS a ${targetJid}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Envía una encuesta nativa e interactiva de WhatsApp a un grupo específico.
   * Utiliza la funcionalidad nativa de Baileys pollCreationMessage.
   */
  public async sendPollToGroup(name: string, options: string[], groupId?: string, selectableCount: number = 1): Promise<boolean> {
    try {
      if (!this.sock || !this.isReady) {
        console.warn(`[JANIA-MATCH] Bot no listo para enviar encuesta a ${groupId}`);
        return false;
      }
      const targetJid = groupId || this.buzonGroupId;
      if (targetJid.endsWith('@newsletter')) {
        const cRes = await this.sendChannelPoll(name, options, selectableCount, targetJid);
        return cRes.success;
      }
      console.log(`[JANIA-MATCH] 📊 Despachando encuesta nativa a ${targetJid}: "${name}" (${options.length} opciones, selectableCount: ${selectableCount})...`);
      await this.sock.sendMessage(targetJid, {
        poll: {
          name,
          values: options,
          selectableCount
        }
      });
      console.log(`[JANIA-MATCH] ✅ Encuesta enviada exitosamente a ${targetJid}`);
      return true;
    } catch (err: any) {
      console.error(`[JANIA-MATCH] ❌ Error enviando encuesta a ${groupId}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Envía una encuesta nativa a cualquier JID (grupo o canal de WhatsApp) con modo de votación configurable
   */
  public async sendPoll(targetJid: string, name: string, options: string[], selectableCount: number = 1): Promise<boolean> {
    if (targetJid.endsWith('@newsletter')) {
      const cRes = await this.sendChannelPoll(name, options, selectableCount, targetJid);
      return cRes.success;
    }
    return this.sendPollToGroup(name, options, targetJid, selectableCount);
  }

  /**
   * 📇 Envía la tarjeta de contacto oficial nativa (VCard) de JanIA o del Bróker Eduardo & Jani (v32.60)
   */
  public async sendContactCard(targetJid: string, contactType: 'jania' | 'broker' = 'jania', quoted?: any): Promise<boolean> {
    try {
      if (!this.sock || !this.isReady) return false;
      let displayName = 'JanIA — IA de VECY Bienes Raíces';
      let vcard =
        'BEGIN:VCARD\n' +
        'VERSION:3.0\n' +
        'FN:JanIA — IA de VECY Bienes Raíces\n' +
        'ORG:VECY BIENES RAÍCES;\n' +
        'TEL;type=CELL;type=VOICE;waid=573192919978:+57 319 291 9978\n' +
        'NOTE:Inteligencia Artificial Inmobiliaria de Colombia. Consultas, peritajes y cruce de negocios 24/7.\n' +
        'URL:https://vecy-bienes-raices.vercel.app/\n' +
        'END:VCARD';

      if (contactType === 'broker') {
        displayName = 'Eduardo & Jani — VECY Bróker Oficial';
        vcard =
          'BEGIN:VCARD\n' +
          'VERSION:3.0\n' +
          'FN:Eduardo & Jani — VECY Bróker Oficial\n' +
          'ORG:VECY BIENES RAÍCES;\n' +
          'TEL;type=CELL;type=VOICE;waid=573166569719:+57 316 656 9719\n' +
          'NOTE:Atención Comercial Humana y Dirección de VECY Bienes Raíces.\n' +
          'URL:https://vecy-bienes-raices.vercel.app/\n' +
          'END:VCARD';
      }

      console.log(`[JANIA-MATCH] 📇 Despachando tarjeta de contacto (${contactType}) a ${targetJid}...`);
      await this.sock.sendMessage(targetJid, {
        contacts: {
          displayName,
          contacts: [{ vcard }]
        }
      }, quoted ? { quoted } : undefined);
      return true;
    } catch (err: any) {
      console.error(`[JANIA-MATCH] Error enviando tarjeta de contacto:`, err?.message || err);
      return false;
    }
  }

  /**
   * 📅 Envía un evento nativo de WhatsApp Business o tarjeta de evento estructurada (v33.17)
   */
  public async sendEventMessage(targetJid: string, eventData: { name: string; description?: string; startTime: number; location?: string }): Promise<boolean> {
    try {
      if (!this.sock || !this.isReady) return false;
      const startTimeSeconds = Math.floor(eventData.startTime > 9999999999 ? eventData.startTime / 1000 : eventData.startTime);
      try {
        await this.sock.sendMessage(targetJid, {
          event: {
            name: eventData.name,
            description: eventData.description || '',
            startTime: startTimeSeconds,
            location: eventData.location ? { name: eventData.location } : undefined
          }
        });
        return true;
      } catch (eventErr) {
        // Fallback enriquecido si el cliente WhatsApp no soporta payload proto de evento
        const eventDateStr = new Date(eventData.startTime).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
        const fallbackText = `📅 *EVENTO OFICIAL — VECY BIENES RAÍCES*\n\n📌 *Título:* ${eventData.name}\n⏰ *Fecha y Hora:* ${eventDateStr}\n📍 *Ubicación:* ${eventData.location || 'Virtual / En línea'}\n\n📝 *Detalles:* ${eventData.description || 'Reunión coordinada a través de JanIA.'}`;
        await this.sendDirectMessage(targetJid, fallbackText);
        return true;
      }
    } catch (err: any) {
      console.error(`[JANIA-MATCH] Error enviando evento a ${targetJid}:`, err?.message || err);
      return false;
    }
  }

  /**
   * 🗑️ Elimina inmediatamente un mensaje infractor en WhatsApp por su key (v33.17)
   */
  public async deleteMessage(targetJid: string, messageKey: any): Promise<boolean> {
    try {
      if (!this.sock || !this.isReady || !messageKey) return false;
      await this.sock.sendMessage(targetJid, { delete: messageKey });
      return true;
    } catch (err: any) {
      console.warn(`[JANIA-MATCH] No se pudo eliminar mensaje en ${targetJid}:`, err?.message || err);
      return false;
    }
  }
  public async approvePendingGroupRequests(): Promise<void> {
    if (!this.sock || !this.isReady) return;
    const officialGroupIds = [
      this.targetGroupId || VECY_OFFICIAL_GROUPS.grupo1.id,
      this.buzonGroupId || VECY_OFFICIAL_GROUPS.grupo2.id,
      this.circuloGroupId || VECY_OFFICIAL_GROUPS.grupo3.id,
    ].filter(Boolean);

    for (const gid of officialGroupIds) {
      try {
        if (typeof (this.sock as any).groupRequestParticipantsList === 'function') {
          const pending = await (this.sock as any).groupRequestParticipantsList(gid);
          if (Array.isArray(pending) && pending.length > 0) {
            const participantJids = pending.map((p: any) => p.jid || p.user_jid || p.id).filter(Boolean);
            if (participantJids.length > 0 && typeof (this.sock as any).groupRequestParticipantsUpdate === 'function') {
              console.log(`[JANIA-JOIN] 👥 Aprobando ${participantJids.length} participantes pendientes en grupo oficial ${gid}...`);
              await (this.sock as any).groupRequestParticipantsUpdate(gid, participantJids, 'approve');
              console.log(`[JANIA-JOIN] ✅ Participantes aprobados exitosamente en ${gid}`);
            }
          }
        }
      } catch (err: any) {
        // Silencioso si no hay pendientes o no es admin en ese momento
      }
    }
  }

  public async sendToGroup(text: string, mediaPath?: string, mentions?: string[], groupId?: string) {
    try {
      const target = groupId || this.targetGroupId;
      let targetJid = target;
      if (targetJid.endsWith('@c.us')) {
        targetJid = targetJid.replace('@c.us', '@s.whatsapp.net');
      }

      let messagePayload: any = {};
      if (mediaPath) {
        const fs = await import('fs');
        const buffer = fs.readFileSync(mediaPath);
        const path = await import('path');
        const ext = path.extname(mediaPath).toLowerCase();

        if (ext === '.mp4') {
          messagePayload = {
            video: buffer,
            caption: text,
            mimetype: 'video/mp4'
          };
        } else if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
          messagePayload = {
            image: buffer,
            caption: text,
            mimetype: ext === '.png' ? 'image/png' : 'image/jpeg'
          };
        } else {
          messagePayload = {
            document: buffer,
            caption: text,
            mimetype: 'application/octet-stream',
            fileName: path.basename(mediaPath)
          };
        }
      } else {
        messagePayload = { text };
      }

      // Los canales de WhatsApp no admiten menciones grupales
      if (mentions && mentions.length > 0 && !targetJid.endsWith('@newsletter')) {
        messagePayload.mentions = mentions.map(m => m.endsWith('@s.whatsapp.net') ? m : m.replace('@c.us', '@s.whatsapp.net'));
      }

      const sent = await this.queuedSend(targetJid, messagePayload);
      if (sent && sent.key && sent.key.id) {
        console.log(`[JANIA-MATCH] ✓ Mensaje enviado al destino ${targetJid} (ID: ${sent.key.id}).`);
        return { success: true, messageId: sent.key.id };
      }
      return { success: false, error: 'No se obtuvo ID de confirmación de entrega en el socket de WhatsApp' };
    } catch (e: any) {
      console.error(`[JANIA-MATCH] Error enviando mensaje al destino ${groupId || this.targetGroupId}:`, e.message || e);
      return { success: false, error: e?.message || String(e) };
    }
  }

  public async sendVoiceToGroup(text: string, groupId?: string, imagePath?: string, captionText?: string) {
    try {
      const target = groupId || this.targetGroupId;
      let targetJid = target;
      if (targetJid.endsWith('@c.us')) {
        targetJid = targetJid.replace('@c.us', '@s.whatsapp.net');
      }

      const fs = await import('fs');
      if (imagePath && fs.existsSync(imagePath)) {
        try {
          await this.sendToGroup(captionText || text, imagePath, [], targetJid);
        } catch (imgErr: any) {
          console.warn(`[JANIA-MATCH] Error enviando ilustración previa a ${targetJid}:`, imgErr?.message);
        }
      }

      const { cleanVoiceText } = await import('./whatsapp-utils');
      const cleaned = cleanVoiceText(text);
      console.log(`[JANIA-MATCH] Generando nota de voz para enviar a ${targetJid}...`);

      const { textToSpeechMedia } = await import('./whatsapp-utils');
      const voiceMedia = await textToSpeechMedia(cleaned);

      if (voiceMedia && voiceMedia.data) {
        const buffer = Buffer.from(voiceMedia.data, 'base64');
        await this.queuedSend(targetJid, {
          audio: buffer,
          mimetype: voiceMedia.mimetype || 'audio/ogg; codecs=opus',
          ptt: true
        });
        console.log(`[JANIA-MATCH] ✓ Nota de voz enviada a ${targetJid}.`);
      } else {
        if (!imagePath) {
          console.warn(`[JANIA-MATCH] TTS falló para ${targetJid}, enviando texto.`);
          await this.queuedSend(targetJid, cleaned);
        }
      }
    } catch (e: any) {
      console.error('[JANIA-MATCH] Error enviando nota de voz al destino:', e.message || e);
    }
  }

  /**
   * 📰 Envío de Tip Diario con Imagen Temática Pública de Internet + Texto Formateado (SIN AUDIOS)
   * Despacha a Grupo 2, Grupo 3 y Canal Oficial de WhatsApp
   */
  public async sendDailyTipToGroupsAndChannel(captionText: string, imagePath?: string) {
    // Asegurar descubrimiento activo del canal de WhatsApp
    if (!this.channelNewsletterId) {
      await this.discoverAndSyncNewsletters().catch(() => { });
    }

    const fs = await import('fs');
    const hasImage = imagePath && fs.existsSync(imagePath);

    // 1. Despachar a Grupo 2 (Tips, Noticias y Consultas Inmobiliarias)
    const targetGroup2 = this.buzonGroupId || VECY_OFFICIAL_GROUPS.grupo2.id;
    if (targetGroup2) {
      try {
        if (hasImage) {
          console.log(`[JANIA-MATCH] 📤 Despachando imagen pública + texto a Grupo 2 (${targetGroup2})...`);
          await this.sendToGroup(captionText, imagePath, [], targetGroup2);
        } else {
          console.log(`[JANIA-MATCH] 📤 Despachando texto diario a Grupo 2 (${targetGroup2})...`);
          await this.queuedSend(targetGroup2, captionText, { allowGroupMessage: true });
        }
        console.log(`[JANIA-MATCH] ✓ Contenido diario entregado a Grupo 2.`);
      } catch (grpErr: any) {
        console.error(`[JANIA-MATCH] Error despachando a Grupo 2:`, grpErr?.message);
      }
    }

    // 2. Despachar a Grupo 3 (Proyecto VECY BIENES RAÍCES)
    const targetGroup3 = this.circuloGroupId || VECY_OFFICIAL_GROUPS.grupo3.id;
    if (targetGroup3) {
      try {
        if (hasImage) {
          console.log(`[JANIA-MATCH] 📤 Despachando imagen pública + texto a Grupo 3 (${targetGroup3})...`);
          await this.sendToGroup(captionText, imagePath, [], targetGroup3);
        } else {
          console.log(`[JANIA-MATCH] 📤 Despachando texto diario a Grupo 3 (${targetGroup3})...`);
          await this.queuedSend(targetGroup3, captionText, { allowGroupMessage: true });
        }
        console.log(`[JANIA-MATCH] ✓ Contenido diario entregado a Grupo 3.`);
      } catch (grpErr: any) {
        console.error(`[JANIA-MATCH] Error despachando a Grupo 3:`, grpErr?.message);
      }
    }

    // 3. Despachar a Canal Oficial de WhatsApp (Newsletter)
    if (this.channelNewsletterId) {
      try {
        if (hasImage) {
          console.log(`[JANIA-MATCH] 📢 Despachando imagen pública + texto a Canal Oficial (${this.channelNewsletterId})...`);
          await this.sendToGroup(captionText, imagePath, [], this.channelNewsletterId);
        } else {
          console.log(`[JANIA-MATCH] 📢 Despachando texto diario a Canal Oficial (${this.channelNewsletterId})...`);
          await this.queuedSend(this.channelNewsletterId, captionText, { allowDirectMessage: true });
        }
        console.log(`[JANIA-MATCH] ✓ Contenido diario entregado a Canal Oficial.`);
      } catch (chanErr: any) {
        console.error(`[JANIA-MATCH] Error despachando a Canal Oficial:`, chanErr?.message);
      }
    }
  }

  /**
   * 🚀 Despacho Estratégico Matutino (v33.32 — Doctrina Embudo Trampolín):
   * - Canal Oficial (Newsletter): Píldora de alto valor completa con imagen HD garantizada.
   * - Grupos 2 y 3: Micro-gancho persuasivo (teaser) con CTA al canal y pregunta detonante de debate.
   */
  public async sendMorningPillAndGroupTeasers(channelText: string, teaserText: string, imagePath?: string): Promise<{ success: boolean; channelMessageId?: string; reason?: string }> {
    if (!this.channelNewsletterId) {
      await this.discoverAndSyncNewsletters().catch(() => { });
    }

    if (!this.channelNewsletterId) {
      console.warn(`[JANIA-ATOMIC] 🛑 Cancelado envío: Canal Oficial no configurado. Jamás se debe anunciar contenido en grupos que no exista en el Canal.`);
      return { success: false, reason: 'Canal Oficial no configurado' };
    }

    const fs = await import('fs');
    const hasImage = imagePath && fs.existsSync(imagePath);

    // 1. Canal Oficial: Publicación completa con imagen
    let channelResult: { success: boolean; messageId?: string; error?: string } = { success: false };
    try {
      if (hasImage) {
        console.log(`[JANIA-MATCH] 📢 Despachando píldora matutina con imagen HD a Canal Oficial (${this.channelNewsletterId})...`);
        channelResult = await this.sendToGroup(channelText, imagePath, [], this.channelNewsletterId);
      } else {
        console.log(`[JANIA-MATCH] 📢 Despachando píldora matutina a Canal Oficial (${this.channelNewsletterId})...`);
        const sent = await this.queuedSend(this.channelNewsletterId, channelText, { allowDirectMessage: true });
        channelResult = sent?.key?.id ? { success: true, messageId: sent.key.id } : { success: false, error: 'Sin ID de mensaje devuelto' };
      }
    } catch (chanErr: any) {
      console.error(`[JANIA-MATCH] Error despachando píldora al Canal Oficial:`, chanErr?.message);
      channelResult = { success: false, error: chanErr?.message };
    }

    // ATOMICIDAD ESTRICTA: Si la publicación principal en el Canal falla o no confirma entrega efectiva (ID de mensaje válido),
    // se cancela de inmediato el envío de los mensajes trampolín a los Grupos 2 y 3.
    if (!channelResult.success || !channelResult.messageId) {
      console.warn(`[JANIA-ATOMIC] 🛑 ABORTADO envío de trampolines a Grupos 2 y 3: La publicación principal en el Canal Oficial falló o no confirmó ID de entrega (${channelResult.error || 'Sin ID'}).`);
      return { success: false, reason: `Fallo en Canal Oficial: ${channelResult.error || 'Sin ID de entrega válido'}` };
    }

    console.log(`[JANIA-ATOMIC] ✅ Publicación en Canal confirmada (ID: ${channelResult.messageId}). Procediendo con micro-ganchos trampolín a Grupos 2 y 3.`);

    // 2. Grupo 2 (Tips & Consultas): Micro-gancho persuasivo (teaser)
    const targetGroup2 = this.buzonGroupId || VECY_OFFICIAL_GROUPS.grupo2.id;
    if (targetGroup2) {
      try {
        console.log(`[JANIA-MATCH] 📤 Despachando micro-gancho trampolín a Grupo 2 (${targetGroup2})...`);
        await this.queuedSend(targetGroup2, teaserText, { allowGroupMessage: true });
        console.log(`[JANIA-MATCH] ✓ Teaser trampolín entregado a Grupo 2.`);
      } catch (grpErr: any) {
        console.error(`[JANIA-MATCH] Error despachando teaser a Grupo 2:`, grpErr?.message);
      }
    }

    // 3. Grupo 3 (Proyecto VECY): Micro-gancho persuasivo (teaser)
    const targetGroup3 = this.circuloGroupId || VECY_OFFICIAL_GROUPS.grupo3.id;
    if (targetGroup3) {
      try {
        console.log(`[JANIA-MATCH] 📤 Despachando micro-gancho trampolín a Grupo 3 (${targetGroup3})...`);
        await this.queuedSend(targetGroup3, teaserText, { allowGroupMessage: true });
        console.log(`[JANIA-MATCH] ✓ Teaser trampolín entregado a Grupo 3.`);
      } catch (grpErr: any) {
        console.error(`[JANIA-MATCH] Error despachando teaser a Grupo 3:`, grpErr?.message);
      }
    }

    return { success: true, channelMessageId: channelResult.messageId };
  }

  /**
   * 📱 Emisión a Estados Propios de WhatsApp (status@broadcast)
   * 🛑 DESACTIVADA DEFINITIVAMENTE (v33.77 — Doctrina Eduardo A. Rivera).
   *
   * MOTIVO DE ARQUITECTURA Y SEGURIDAD CRÍTICA:
   * En WhatsApp Multi-Device (Baileys como dispositivo vinculado / companion), el despacho hacia
   * status@broadcast genera un bucle de desincronización y reintentos en el hilo SQLite local
   * del teléfono principal del bróker (+57 319 291 9978). Anteriormente se intentó blindar con:
   * recipientSet.delete(ownPhoneJid);
   * recipientSet.delete('573192919978@s.whatsapp.net');
   * linkPreview: null
   * this.messageStore.set(sent.key.id, sent.message);
   * pero los dispositivos vinculados por diseño de protocolo de WhatsApp no deben publicar estados.
   * Por ello, JanIA canaliza el 100% de su difusión pública a través del Canal Oficial (@newsletter) y Grupos.
   */
  public async postToWhatsAppStatus(_options: {
    captionText: string;
    mediaPath?: string;
    recipients?: string[];
  }): Promise<{ success: boolean; messageId?: string; error?: string; disabled?: boolean }> {
    console.log('[JANIA-STATUS-SHIELD] 🛡️ Publicación de Estados en WhatsApp desactivada definitivamente por seguridad anti-baneo y estabilidad multi-device (Doctrina Eduardo A. Rivera v33.77).');
    return { success: true, disabled: true };
  }

  /**
   * 📱 Publicación de Estados de WhatsApp (Historias/Stories) — DESACTIVADA DEFINITIVAMENTE (v33.77)
   */
  public async postDailyHookStatus(_teaserText?: string, _topicTitle?: string): Promise<{ success: boolean; messageId?: string; error?: string; disabled?: boolean }> {
    console.log('[JANIA-STATUS-SHIELD] 🛡️ postDailyHookStatus desactivado por seguridad anti-baneo y estabilidad multi-device (Doctrina Eduardo A. Rivera v33.77).');
    return { success: true, disabled: true };
  }

  /**
   * 🌟 Despacha el Estado de WhatsApp diario rotativo — DESACTIVADA DEFINITIVAMENTE (v33.77)
   */
  public async postDailyServiceStatus(_customImagePath?: string, _customTopic?: string): Promise<{ success: boolean; messageId?: string; error?: string; disabled?: boolean }> {
    return { success: true, disabled: true };
  }

  /**
   * Compatibilidad: Despacho de texto puro delegando a sendDailyTipToGroupsAndChannel sin imagen
   */
  public async sendDailyTipTextToGroupsAndChannel(captionText: string) {
    return this.sendDailyTipToGroupsAndChannel(captionText, undefined);
  }

  public async sendVoiceToBuzonAndChannel(text: string, imagePath?: string, captionText?: string) {
    // Asegurar descubrimiento activo del canal de WhatsApp
    if (!this.channelNewsletterId) {
      await this.discoverAndSyncNewsletters().catch(() => { });
    }

    const { cleanVoiceText, textToSpeechMedia } = await import('./whatsapp-utils');
    const cleaned = cleanVoiceText(text);
    console.log(`[JANIA-MATCH] 🎙️ Generando nota de voz TTS centralizada para Buzón y Canal...`);
    const voiceMedia = await textToSpeechMedia(cleaned);
    const audioBuffer = voiceMedia && voiceMedia.data ? Buffer.from(voiceMedia.data, 'base64') : null;
    const audioMimetype = voiceMedia?.mimetype || 'audio/ogg; codecs=opus';
    const fs = await import('fs');

    // 1. Despachar a Grupo 2 (Buzón Oficial / Soporte Legal)
    if (this.buzonGroupId) {
      try {
        console.log(`[JANIA-MATCH] 📤 Despachando publicación a Grupo 2 (${this.buzonGroupId})...`);
        if (imagePath && fs.existsSync(imagePath)) {
          await this.sendToGroup(captionText || text, imagePath, [], this.buzonGroupId);
        }
        if (audioBuffer) {
          await this.queuedSend(this.buzonGroupId, {
            audio: audioBuffer,
            mimetype: audioMimetype,
            ptt: true
          });
          console.log(`[JANIA-MATCH] ✓ Nota de voz enviada al Grupo 2 (${this.buzonGroupId}).`);
        } else if (!imagePath) {
          await this.queuedSend(this.buzonGroupId, cleaned);
        }
      } catch (grpErr: any) {
        console.error(`[JANIA-MATCH] Error despachando a Grupo 2:`, grpErr?.message);
      }
    }

    // 2. Despachar a Canal de WhatsApp (Newsletter)
    if (this.channelNewsletterId) {
      try {
        console.log(`[JANIA-MATCH] 📢 Despachando publicación temática al Canal de WhatsApp (${this.channelNewsletterId})...`);
        if (imagePath && fs.existsSync(imagePath)) {
          await this.sendToGroup(captionText || text, imagePath, [], this.channelNewsletterId);
        }
        if (audioBuffer) {
          await this.queuedSend(this.channelNewsletterId, {
            audio: audioBuffer,
            mimetype: audioMimetype,
            ptt: false
          });
          console.log(`[JANIA-MATCH] ✓ Audio enviado al Canal de WhatsApp (${this.channelNewsletterId}).`);
        } else if (!imagePath) {
          await this.queuedSend(this.channelNewsletterId, cleaned);
        }
      } catch (chanErr: any) {
        console.error(`[JANIA-MATCH] Error despachando a Canal de WhatsApp:`, chanErr?.message);
      }
    } else {
      console.warn(`[JANIA-MATCH] ⚠️ Canal de WhatsApp no configurado aún (channelNewsletterId vacío).`);
    }
  }

  public async sendToBuzonAndChannel(text: string, mediaPath?: string) {
    if (this.buzonGroupId) {
      await this.sendToGroup(text, mediaPath, [], this.buzonGroupId);
    }
    if (this.channelNewsletterId) {
      await this.sendToGroup(text, mediaPath, [], this.channelNewsletterId);
    }
  }

  public officialChannelInviteCode: string = process.env.WHATSAPP_CHANNEL_INVITE_CODE || '0029Vb5iYUYCMY0A94zqti1b';

  public async discoverAndSyncNewsletters() {
    try {
      if (!this.sock) return;

      // 1. Intentar resolver por código de invitación oficial del Canal Vecy Bienes Raíces (0029Vb5iYUYCMY0A94zqti1b)
      if (this.officialChannelInviteCode) {
        try {
          if (typeof (this.sock as any).newsletterMetadata === 'function') {
            const inviteMeta = await (this.sock as any).newsletterMetadata("invite", this.officialChannelInviteCode);
            if (inviteMeta && inviteMeta.id) {
              this.channelNewsletterId = inviteMeta.id;
              const channelName = inviteMeta?.thread_metadata?.name?.text || inviteMeta?.name || 'Vecy Bienes Raíces';
              console.log(`[${this.botName}] 🎯 Canal oficial resuelto por Invite Code ("${this.officialChannelInviteCode}"): JID=${this.channelNewsletterId} ("${channelName}")`);
            }
          }
        } catch (invErr: any) {
          console.warn(`[${this.botName}] Info resolución canal por invite code:`, invErr?.message);
        }
      }

      // 2. Si no se resolvió por invite, buscar en newsletters suscritos o administrados
      if (!this.channelNewsletterId && typeof (this.sock as any).newsletterSubscribed === 'function') {
        const newsletters = await (this.sock as any).newsletterSubscribed();
        if (Array.isArray(newsletters) && newsletters.length > 0) {
          console.log(`[${this.botName}] 📢 Canales/Newsletters detectados (${newsletters.length}):`);
          for (const nl of newsletters) {
            const name = nl?.thread_metadata?.name?.text || nl?.name || nl?.subject || 'Canal';
            const jid = nl.id;
            console.log(`[${this.botName}] 📢 Canal ID: ${jid} — "${name}"`);
            if (!this.channelNewsletterId || name.toLowerCase().includes('vecy')) {
              this.channelNewsletterId = jid;
              console.log(`[${this.botName}] 🎯 Canal oficial auto-asignado: ${this.channelNewsletterId} ("${name}")`);
            }
          }
        } else {
          console.log(`[${this.botName}] ℹ️ No se detectaron canales suscritos aún en la cuenta.`);
        }
      }
    } catch (e: any) {
      console.warn(`[${this.botName}] Info: no se pudieron listar canales de WhatsApp:`, e?.message || e);
    }
  }

  public async getGroupParticipants(groupId: string): Promise<string[]> {
    try {
      if (!this.sock) return [];
      const metadata = await this.getCachedGroupMetadata(groupId);
      return metadata?.participants ? metadata.participants.map((p: any) => p.id) : [];
    } catch (err) {
      console.warn(`[JANIA-MATCH] Error al obtener participantes del grupo ${groupId}:`, err);
      return [];
    }
  }

  public async sendManualCierreAudios() {
    console.log("[JANIA-MATCH] Generando y enviando audios de cierre manuales (Solo por hoy)...");
    const grupos = [
      {
        nombre: "𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴",
        id: this.targetGroupId,
        promptCierre: "Genera una nota de voz corta en español de despedida y cierre de jornada para el grupo de WhatsApp 𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴. Agradece la actividad de hoy y despídete con calidez. Recuerda que no cobramos comisiones y que las ofertas y demandas cruzadas son el motor de la red."
      },
      {
        nombre: "Buzón de Consultoría",
        id: this.buzonGroupId,
        promptCierre: "Genera una nota de voz corta en español de despedida y cierre de jornada para el grupo de WhatsApp Buzón de Consultoría. Agradece la atención a los casos jurídicos y de comisiones compartidas resueltos hoy, deseando un feliz descanso."
      },
      {
        nombre: "Círculo Cero",
        id: this.circuloGroupId,
        promptCierre: "Genera una nota de voz corta en español de despedida y cierre de jornada para el grupo de WhatsApp Círculo Cero. Agradece el debate y las sugerencias de hoy sobre el futuro del sector."
      }
    ];

    const { invokeLLM } = await import('./llm');

    for (const grupo of grupos) {
      try {
        if (!grupo.id) continue;
        console.log(`[JANIA-MATCH] Generando audio de cierre para el grupo ${grupo.nombre}...`);

        const response1 = await invokeLLM({
          messages: [
            { role: 'system', content: 'Eres JanIA, la asistente de voz e inteligencia artificial de VECY Bienes Raíces. Te expresas de manera natural, humana, cálida y profesional.' },
            { role: 'user', content: `${grupo.promptCierre}\n- IMPORTANTE: Debe sonar como un mensaje de voz natural de WhatsApp grabado de forma espontánea por una colega real. Empieza con naturalidad como: "Hola colegas", "Buenas tardes", etc. sin formalismos robóticos.\n- Máximo 350 caracteres.\n- CRÍTICO: Responde ÚNICAMENTE con las palabras habladas de la nota de voz. NO agregues preámbulos, comentarios ni envuelvas el texto en comillas, llaves o corchetes.` }
          ]
        });

        const content1 = response1.choices[0]?.message?.content;
        if (content1 && content1.trim() !== "") {
          await this.sendVoiceToGroup(content1, grupo.id);
        }
      } catch (err: any) {
        console.error(`❌ Error en sendManualCierreAudios para el grupo ${grupo.nombre}:`, err.message || err);
      }
    }
  }

  public pendingWelcomeJids: string[] = [];

  public async sendAnuncioRetorno() {
    const baseMsg = `🚀 *¡JANIA ESTÁ DE VUELTA Y MÁS AFILADA QUE NUNCA!* 👩🏻‍💼🏛️\n\n` +
      `¡Hola de nuevo, colegas y aliados! 👋 Tras un breve ajuste técnico para fortalecer nuestra infraestructura y preparar el lanzamiento del nuevo portal web privado, estoy de vuelta en el canal para encontrar esos MATCH tan deseados.\n\n` +
      `Vuelvo con mi *Cerebro Multimodal v2.0* repotenciado y mis sensores más afilados que nunca para cuidar la calidad de la red y acelerar nuestros cierres:\n\n` +
      `🧠 *¿Qué puedo hacer por ti en esta v2.0?*\n` +
      `▸ *Ofertas Express (Links):* Comparte el enlace de tus inmuebles de cualquier portal o CRM, y extraeré la ficha técnica en segundos.\n` +
      `▸ *Escáner de Flyers (OCR):* ¿Tienes fotos de inmuebles o requerimientos con texto? Súbelas al grupo y leeré la información dentro de la imagen.\n` +
      `▸ *Permutas e Intercambios (Voz o Texto):* Escríbeme o envíame un audio detallando permutas complejas como:\n` +
      `  * 🔄 *Mano a mano / Pelo a pelo* (intercambio directo de inmuebles de valor similar).\n` +
      `  * 🏠➕💵 *Inmueble de menor valor* como parte de pago por uno de mayor valor.\n` +
      `  * 🚗 *Vehículos* recibidos como parte de pago.\n` +
      `  * 📈 *CDTs, divisas o activos alternativos* como complemento de negocio.\n` +
      `  * 🏢 *Proyectos de construcción* o aportes de lote.\n` +
      `▸ *Matching Inteligente:* Cruzo ofertas y demandas en tiempo real y les aviso en el acto cuando hay negocio viable.`;

    const groups = [this.targetGroupId, this.buzonGroupId, this.circuloGroupId];
    const imgPath = path.resolve('./client/public/jania_perfil.png');

    for (const group of groups) {
      try {
        await this.sendToGroup(baseMsg, imgPath, [], group);
      } catch (e: any) {
        console.error(`Error enviando anuncio de retorno al grupo ${group}:`, e.message);
      }
    }
  }

  public async sendComunicadoMatch() {
    try {
      console.log(`[JANIA-MATCH] Enviando comunicado de notificaciones de match...`);
      const { MSG_COMUNICADO_MATCH_NETWORK, MSG_COMUNICADO_MATCH_CIRCULO } = await import('./janIA');
      await this.queuedSend(this.targetGroupId, MSG_COMUNICADO_MATCH_NETWORK);
      await delay(3000);
      await this.queuedSend(this.circuloGroupId, MSG_COMUNICADO_MATCH_CIRCULO);
      console.log("[JANIA-MATCH] Comunicado de match enviado con éxito.");
    } catch (err: any) {
      console.error("[JANIA-MATCH] Error al enviar el comunicado de match:", err.message || err);
    }
  }

  public async getPairingCode(phone: string): Promise<string> {
    const cleanPhone = phone.replace(/\D/g, "");
    console.log(`[JANIA-MATCH] Solicitando código de vinculación por número para: ${cleanPhone}`);

    // Forzar limpieza y reinicio para asegurar un estado limpio al solicitar un nuevo código de emparejamiento
    console.log("[JANIA-MATCH] Limpiando sesión previa para solicitar nuevo código...");
    try {
      if (this.sock) {
        this.sock.end(undefined);
      }
    } catch (e) { }

    const sessionDir = path.join(process.cwd(), '.baileys_auth');
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } catch (err: any) {
        console.warn("[JANIA-MATCH] No se pudo borrar .baileys_auth:", err.message);
      }
    }

    this.sock = null;
    await this.initialize();
    await delay(3000);

    try {
      const code = await this.sock.requestPairingCode(cleanPhone);
      console.log(`[JANIA-MATCH] Código de vinculación generado: ${code}`);
      return code;
    } catch (err: any) {
      console.error("[JANIA-MATCH] Error al solicitar código de vinculación:", err.message || err);
      throw err;
    }
  }

  private loadCooldowns() {
    try {
      if (fs.existsSync(this.cooldownFile)) {
        const raw = JSON.parse(fs.readFileSync(this.cooldownFile, 'utf8'));
        this.cooldownMap = new Map(Object.entries(raw));
      }
    } catch (e) { }
  }

  private saveCooldowns() {
    try {
      const obj = Object.fromEntries(this.cooldownMap.entries());
      fs.writeFileSync(this.cooldownFile, JSON.stringify(obj), 'utf8');
    } catch (e) { }
  }

  private setupGracefulShutdown() {
    const shutdown = async () => {
      console.log('\n🛑 Cerrando JanIA Match Bot (Baileys)...');
      try {
        if (this.sock) {
          await this.sock.end();
        }
      } catch (e) { }
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}

export const janiaMatchBot = new JaniaMatchBot({
  sessionFolderName: '.baileys_auth',
  qrFileName: 'qr-match.png',
  botName: 'JANIA-MATCH-OFICIAL'
});
export const janiaCaptadorBot = janiaMatchBot;
export const whatsappBot = janiaMatchBot;

// ─── Superpoderes Nativos WhatsApp Business Exportados (v33.17) ──────────────
export async function sendNativeWhatsAppPoll(targetJid: string, name: string, options: string[], selectableCount: number = 1): Promise<boolean> {
  return janiaMatchBot.sendPoll(targetJid, name, options, selectableCount);
}

export async function sendNativeWhatsAppContact(targetJid: string, contactType: 'jania' | 'broker' = 'broker'): Promise<boolean> {
  return janiaMatchBot.sendContactCard(targetJid, contactType);
}

export async function sendNativeWhatsAppTextMessage(targetPhoneOrJid: string, text: string): Promise<boolean> {
  try {
    const res = await janiaMatchBot.sendDirectMessage(targetPhoneOrJid, text);
    return Boolean(res);
  } catch (err: any) {
    console.warn(`[sendNativeWhatsAppTextMessage] Error enviando mensaje a ${targetPhoneOrJid}: ${err?.message}`);
    return false;
  }
}

export async function sendNativeWhatsAppEvent(targetJid: string, eventData: { name: string; description?: string; startTime: number; location?: string }): Promise<boolean> {
  return janiaMatchBot.sendEventMessage(targetJid, eventData);
}

export async function deleteNativeWhatsAppMessage(targetJid: string, messageKey: any): Promise<boolean> {
  return janiaMatchBot.deleteMessage(targetJid, messageKey);
}

export async function sendNativeWhatsAppChannelPoll(name: string, options: string[], selectableCount: number = 1, channelJid?: string): Promise<boolean> {
  const res = await janiaMatchBot.sendChannelPoll(name, options, selectableCount, channelJid);
  return res.success;
}

export async function sendNativeWhatsAppQuiz(targetJid: string, question: string, options: string[], correctAnswerIndex: number = 0): Promise<boolean> {
  return janiaMatchBot.sendQuiz(targetJid, question, options, correctAnswerIndex);
}

export async function sendNativeWhatsAppQuestionPrompt(targetJid: string, questionText: string): Promise<boolean> {
  return janiaMatchBot.sendQuestionPrompt(targetJid, questionText);
}

export async function sendNativeWhatsAppLocation(
  targetJid: string,
  latitude: number = 4.6768,
  longitude: number = -74.0482,
  name: string = 'VECY BIENES RAÍCES — Mesa Central Bogotá',
  address: string = 'Parque de la 93 / El Chicó, Bogotá D.C., Colombia'
): Promise<boolean> {
  return janiaMatchBot.sendLocationPin(targetJid, latitude, longitude, name, address);
}

// ─── Exportaciones Doctrinales Signal & @lid para Vecy Agenda Pro (v33.95) ────
export function registerPhoneLidMapping(phoneOrJid?: string | null, lidOrJid?: string | null): void {
  janiaMatchBot.registerPhoneLidMapping(phoneOrJid, lidOrJid);
}

export function resolveLidForPhone(phoneOrJid?: string | null): string | null {
  return janiaMatchBot.resolveLidForPhone(phoneOrJid);
}

export function resolvePhoneForLid(lidOrJid?: string | null): string | null {
  return janiaMatchBot.resolvePhoneForLid(lidOrJid);
}

export function isWhatsAppBusinessAutoGreeting(text?: string | null): boolean {
  return janiaMatchBot.isWhatsAppBusinessAutoGreeting(text);
}

// ─── Exportaciones Doctrinales de Silencio en Grupos Externos, Cero Auto-Respuesta y Control Humano (v33.96) ────
export function isFromOwnBotAccount(msg: proto.IWebMessageInfo, senderId?: string): boolean {
  return janiaMatchBot.isFromOwnBotAccount(msg, senderId);
}

export function isSelfPresentationOrFlyerOfJanIA(text?: string | null): boolean {
  return janiaMatchBot.isSelfPresentationOrFlyerOfJanIA(text);
}

export function isRealEstateConsultationForGroup(
  text?: string | null,
  quotedText?: string | null,
  hasMedia?: boolean
): boolean {
  return janiaMatchBot.isRealEstateConsultationForGroup(text, quotedText, hasMedia);
}

export function isBotDirectlyMentioned(msg: proto.IWebMessageInfo, text: string): boolean {
  return janiaMatchBot.isBotDirectlyMentioned(msg, text);
}

export function registerManualGroupTakeover(chatId: string, msgId?: string): void {
  janiaMatchBot.registerManualGroupTakeover(chatId, msgId);
}

export function recordPassiveGroupContext(chatId: string, senderName: string, text: string): void {
  janiaMatchBot.recordPassiveGroupContext(chatId, senderName, text);
}

export function getPassiveGroupContextSummary(chatId: string): string {
  return janiaMatchBot.getPassiveGroupContextSummary(chatId);
}
