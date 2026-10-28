import {
  generateLegalDocumentPdf,
  type LegalDocumentPdfParams,
  type LegalDocumentType,
  type GeneratedLegalPdfResult
} from "../legalDocumentPdfService";
import {
  extractStickerTagFromReply,
  selectContextualStickerForDm,
  setLatestDmSticker,
  type LoadedJaniaSticker
} from "../stickerService";
import {
  generateCustomUserCreativeImage,
  detectCreativeAssetType,
  isExplicitCreativeImageRequest,
  queueCreativeImageForDm,
  popLatestDmCreativeImage,
  type UserCreativeImageInput,
  type GeneratedCreativeImageResult
} from "../creativeStudioImageService";
import { getUser402040Agreement, getUserOwnerCorretaje } from "../sessionManager";

export {
  generateCustomUserCreativeImage,
  detectCreativeAssetType,
  isExplicitCreativeImageRequest,
  queueCreativeImageForDm,
  popLatestDmCreativeImage,
  type UserCreativeImageInput,
  type GeneratedCreativeImageResult
};

export interface QueuedLocationPin {
  latitude: number;
  longitude: number;
  name: string;
  address: string;
}

export interface QueuedInteractivePoll {
  question: string;
  options: string[];
  selectableCount?: number;
  isQuiz?: boolean;
  correctAnswerIndex?: number;
}

const pendingVCardByPhone = new Map<string, "broker" | "jania">();
const pendingLocationByPhone = new Map<string, QueuedLocationPin>();
const pendingPollByPhone = new Map<string, QueuedInteractivePoll>();

function normalizePhoneKey(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

export function queueDmVCard(phone: string, contactType: "broker" | "jania" = "broker"): void {
  const clean = normalizePhoneKey(phone);
  if (clean) pendingVCardByPhone.set(clean, contactType);
}

export function popLatestDmVCard(phone: string): "broker" | "jania" | undefined {
  const clean = normalizePhoneKey(phone);
  if (!clean) return undefined;
  const exact = pendingVCardByPhone.get(clean);
  if (exact) {
    pendingVCardByPhone.delete(clean);
    return exact;
  }
  const last10 = clean.slice(-10);
  for (const [k, v] of pendingVCardByPhone.entries()) {
    if (k.slice(-10) === last10) {
      pendingVCardByPhone.delete(k);
      return v;
    }
  }
  return undefined;
}

export function queueDmLocationPin(phone: string, pin: QueuedLocationPin): void {
  const clean = normalizePhoneKey(phone);
  if (clean) pendingLocationByPhone.set(clean, pin);
}

export function popLatestDmLocationPin(phone: string): QueuedLocationPin | undefined {
  const clean = normalizePhoneKey(phone);
  if (!clean) return undefined;
  const exact = pendingLocationByPhone.get(clean);
  if (exact) {
    pendingLocationByPhone.delete(clean);
    return exact;
  }
  const last10 = clean.slice(-10);
  for (const [k, v] of pendingLocationByPhone.entries()) {
    if (k.slice(-10) === last10) {
      pendingLocationByPhone.delete(k);
      return v;
    }
  }
  return undefined;
}

export function queueDmInteractivePoll(phone: string, poll: QueuedInteractivePoll): void {
  const clean = normalizePhoneKey(phone);
  if (clean) pendingPollByPhone.set(clean, poll);
}

export function popLatestDmInteractivePoll(phone: string): QueuedInteractivePoll | undefined {
  const clean = normalizePhoneKey(phone);
  if (!clean) return undefined;
  const exact = pendingPollByPhone.get(clean);
  if (exact) {
    pendingPollByPhone.delete(clean);
    return exact;
  }
  const last10 = clean.slice(-10);
  for (const [k, v] of pendingPollByPhone.entries()) {
    if (k.slice(-10) === last10) {
      pendingPollByPhone.delete(k);
      return v;
    }
  }
  return undefined;
}

/**
 * 🧩 SUBMÓDULO ESPECIALIZADO DE DM HANDLER (v33.66 — Doctrina Eduardo A. Rivera)
 * Modulariza:
 * 1. Detección y generación de Cartas, Contratos y Minutas Inmobiliarias en PDF Membretado.
 * 2. Orquestación contextual del Pack Oficial de 14 Stickers 3D de JanIA en WhatsApp.
 * 3. Directivas modulares de Onboarding (Colegas 40/20/40 vs. Plan de Pago y Propietarios Directos).
 */

export function detectLegalDocumentTypeFromText(text: string): LegalDocumentType | null {
  const lower = (text || "").toLowerCase();
  if (!lower) return null;

  if (/\b(?:carta|notificaci[oó]n|preaviso)\b[\s\S]{0,45}\b(?:terminaci[oó]n|no\s+pr[oó]rroga|desahucio|finalizar\s+arriendo)\b/i.test(lower)) {
    return "carta_terminacion_arriendo";
  }
  if (/\b(?:carta|solicitud|acta)\b[\s\S]{0,45}\b(?:restituci[oó]n|entrega\s+de\s+inmueble|devoluci[oó]n\s+del?\s+inmueble)\b/i.test(lower)) {
    return "carta_restitucion_inmueble";
  }
  if (/\b(?:carta|formato|documento)\b[\s\S]{0,45}\b(?:presentaci[oó]n\s+de\s+cliente|registro\s+de\s+punta|protecci[oó]n\s+de\s+cliente)\b/i.test(lower)) {
    return "carta_presentacion_cliente";
  }
  if (/\b(?:pacto\s+de\s+retroventa|retroventa|art(?:[ií]culo|\.?)\s*1939)\b/i.test(lower)) {
    return "pacto_retroventa";
  }
  if (/\b(?:cesi[oó]n\s+de\s+leasing|leasing\s+habitacional|leasing\s+comercial)\b/i.test(lower)) {
    return "cesion_leasing";
  }
  if (/\b(?:contrato\s+de\s+corretaje|corretaje\s+inmobiliario|mandato\s+de\s+comisi[oó]n)\b/i.test(lower)) {
    return "contrato_corretaje";
  }
  if (/\b(?:contrato\s+de\s+arrendamiento|contrato\s+de\s+arriendo)\b[\s\S]{0,40}\b(?:local|comercial|bodega|oficina)\b/i.test(lower)) {
    return "contrato_arrendamiento_comercial";
  }
  if (/\b(?:contrato\s+de\s+arrendamiento|contrato\s+de\s+arriendo|minuta\s+de\s+arriendo)\b/i.test(lower)) {
    return "contrato_arrendamiento_vivienda";
  }
  if (/\b(?:promesa\s+de\s+compraventa|minuta\s+de\s+compraventa|contrato\s+de\s+compraventa)\b/i.test(lower)) {
    return "promesa_compraventa";
  }
  if (/\b(?:minuta|borrador\s+de\s+contrato)\b/i.test(lower)) {
    return "minuta_general";
  }
  return null;
}

export function isExplicitLegalPdfRequest(text: string): boolean {
  const lower = (text || "").toLowerCase();
  const wantsPdfOrFile =
    /\b(?:en\s+pdf|archivo\s+pdf|documento\s+pdf|descargar\s+pdf|env[ií]a(?:me)?\s+el\s+pdf|genera(?:me|r)?\s+(?:el\s+|un\s+)?pdf|m[aá]nda(?:me)?\s+el\s+pdf)\b/i.test(
      lower
    );
  const docType = detectLegalDocumentTypeFromText(lower);
  return Boolean(wantsPdfOrFile && docType);
}

export async function generateLegalPdfForDmRequest(
  userText: string,
  overrideParams?: Partial<LegalDocumentPdfParams>
): Promise<GeneratedLegalPdfResult> {
  const detectedType = overrideParams?.tipoDocumento || detectLegalDocumentTypeFromText(userText) || "minuta_general";
  return await generateLegalDocumentPdf({
    tipoDocumento: detectedType,
    ...overrideParams
  });
}

export async function maybeGenerateLegalDocPdfForDm(
  _userId: string,
  userText: string,
  _assistantReply?: string,
  userName?: string
): Promise<GeneratedLegalPdfResult | null> {
  if (!isExplicitLegalPdfRequest(userText)) return null;
  return await generateLegalPdfForDmRequest(userText, {
    nombreRemitente: userName || undefined
  });
}

/**
 * Limpia cualquier etiqueta `[STICKER:...]` de la respuesta de JanIA y encola el sticker `.webp` correspondiente
 * si aplica según el contexto emocional/ejecutivo de la conversación.
 */
export function processAndQueueDmSticker(
  userId: string,
  userMessage: string,
  rawAssistantReply: string,
  options?: { bypassCooldown?: boolean }
): { cleanReply: string; queuedSticker: LoadedJaniaSticker | null } {
  const { cleanText, stickerKey } = extractStickerTagFromReply(rawAssistantReply);

  if (stickerKey) {
    const explicitSticker = setLatestDmSticker(userId, stickerKey);
    return { cleanReply: cleanText, queuedSticker: explicitSticker };
  }

  const contextualSticker = selectContextualStickerForDm(userMessage, cleanText, userId, options);
  if (contextualSticker) {
    setLatestDmSticker(userId, contextualSticker.key);
  }
  return { cleanReply: cleanText, queuedSticker: contextualSticker };
}

/**
 * Construye las directivas de contexto de Onboarding (40/20/40 vs. Plan de Pago y Propietario Directo)
 * para inyectar en el prompt conversacional de JanIA.
 */
export async function buildSessionOnboardingDirectives(userId: string): Promise<{
  context402040Directive: string;
  contextOwnerDirective: string;
}> {
  const alliedStatus = await getUser402040Agreement(userId);
  const ownerStatus = await getUserOwnerCorretaje(userId);

  const context402040Directive =
    alliedStatus === true
      ? `\n🤝 ESTADO DE ALIANZA 40/20/40 CONFIRMADO EN SESIÓN: Este colega YA ACEPTÓ nuestra alianza colaborativa 40/20/40. Reconócelo como Aliado Prioritario con acceso 100% gratuito a cruces (MATCHES) y NO le vuelvas a preguntar si acepta el 40/20/40.`
      : alliedStatus === false
        ? `\n💼 ESTADO DE COMISIÓN EN SESIÓN (RECHAZA 40/20/40 -> PLAN DE PAGO MENSUAL O ANUAL): Este agente indicó que NO comparte comisión bajo el modelo 40/20/40. SÍ regístralo en la base de datos de VECY con su código oficial, pero adviértele con cortesía que la gratuidad de MATCHES aplica únicamente bajo el esquema 40/20/40 y que será contactado por la dirección comercial (+57 316 656 9719) para adquirir un plan de suscripción de pago mensual o anual.`
        : "";

  const contextOwnerDirective = ownerStatus?.isOwner
    ? `\n🏠 ESTADO DE PROPIETARIO DIRECTO EN SESIÓN (CORRETAJE VIRTUAL VECY): Este usuario es Propietario Directo (NO es colega inmobiliario; JAMÁS le ofrezcas comisión colaborativa 40/20/40 ni 50/50). Estado actual: T&C Corretaje Virtual=${ownerStatus.acceptsTerms ? "ACEPTADOS" : "PENDIENTE DE ACEPTACIÓN"}, Correo=${ownerStatus.email || "PENDIENTE DE SOLICITAR"}. Exige la aceptación de Términos y Condiciones de corretaje virtual, pide su correo para el envío formal del contrato y recuérdale comunicarse al 3166569719 (+57 316 656 9719) con Jani Alves o Eduardo Rivera para concretar el contrato y acordar la comisión previa a la publicación en https://vecy-bienes-raices.vercel.app/.`
    : "";

  return { context402040Directive, contextOwnerDirective };
}
