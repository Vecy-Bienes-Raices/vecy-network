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
import {
  getUser402040Agreement,
  getUserOwnerCorretaje,
  getUserBusinessRole,
  type UserBusinessRole
} from "../sessionManager";

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

  if (/\b(?:carta|notificaci[oó]n|preaviso|comunicado)\b[\s\S]{0,55}\b(?:terminaci[oó]n|no\s+pr[oó]rroga|no\s+renovaci[oó]n|no\s+renuevo|finalizar\s+arriendo|desahucio)\b/i.test(lower)) {
    return "carta_terminacion_arriendo";
  }
  if (/\b(?:carta|solicitud|acta|comunicado)\b[\s\S]{0,55}\b(?:restituci[oó]n|entrega\s+de\s+inmueble|entregar\s+el\s+inmueble|devoluci[oó]n\s+del?\s+inmueble|desocupaci[oó]n)\b/i.test(lower)) {
    return "carta_restitucion_inmueble";
  }
  if (/\b(?:carta|formato|documento|comunicado)\b[\s\S]{0,55}\b(?:presentaci[oó]n\s+de\s+cliente|presentar\s+(?:a\s+)?un?\s+cliente|registro\s+de\s+punta|protecci[oó]n\s+de\s+cliente)\b/i.test(lower)) {
    return "carta_presentacion_cliente";
  }
  if (/\b(?:otros[ií]|modificaci[oó]n\s+(?:de\s+)?(?:canon|plazo)|pr[oó]rroga\s+contractual|cesi[oó]n\s+de\s+(?:contrato|posici[oó]n))\b/i.test(lower)) {
    return "otrosi_modificatorio";
  }
  if (/\b(?:acta\s+de\s+(?:entrega|restituci[oó]n)|entrega\s+anticipada\s+e?\s*inventario)\b/i.test(lower)) {
    return "acta_entrega_inmueble";
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

/**
 * Detecta si el usuario está consultando o pidiendo redactar una carta o documento legal (Doctrina Eduardo A. Rivera v33.89).
 */
export function isLetterOrLegalDocumentDraftInquiry(text: string): boolean {
  const lower = (text || "").toLowerCase();
  return (
    /(?:c[oó]mo\s+(?:hago|redacto|hacer|elaboro)|ay[uú]da(?:me)?\s+con\s+(?:una|la)|necesito\s+(?:hacer|redactar|elaborar|una|un)|hacer\s+una|redactar\s+una|elaborar\s+una|plantilla\s+de|formato\s+de|minuta\s+de)\s+(?:carta|notificaci[oó]n|minuta|comunicaci[oó]n|preaviso|documento|contrato)/i.test(lower) ||
    /(?:carta|notificaci[oó]n|preaviso)\s+(?:para|de)\s+(?:terminar|entregar|desocupar|restituir|no\s+prorrogar|no\s+renovar|presentar)/i.test(lower)
  );
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
 * Construye las directivas de contexto de Onboarding (Rol Universal, 40/20/40 vs. Plan de Pago y Propietario Directo)
 * para inyectar en el prompt conversacional de JanIA.
 */
export async function buildSessionOnboardingDirectives(userId: string): Promise<{
  context402040Directive: string;
  contextOwnerDirective: string;
  contextRoleDirective: string;
  identifiedRole?: UserBusinessRole;
}> {
  const alliedStatus = await getUser402040Agreement(userId);
  const ownerStatus = await getUserOwnerCorretaje(userId);
  const identifiedRole = await getUserBusinessRole(userId);

  const context402040Directive =
    alliedStatus === true
      ? `\n🤝 ESTADO DE ALIANZA 40/20/40 CONFIRMADO EN SESIÓN: Este colega YA ACEPTÓ nuestra alianza colaborativa 40/20/40. Reconócelo como Aliado Prioritario con acceso 100% gratuito a cruces (MATCHES) y NO le vuelvas a preguntar si acepta el 40/20/40.`
      : alliedStatus === false
        ? `\n💼 ESTADO DE COMISIÓN EN SESIÓN (RECHAZA 40/20/40 -> PLAN DE PAGO MENSUAL O ANUAL): Este agente indicó que NO comparte comisión bajo el modelo 40/20/40. SÍ regístralo en la base de datos de VECY con su código oficial, pero adviértele con cortesía que la gratuidad de MATCHES aplica únicamente bajo el esquema 40/20/40 y que será contactado por la dirección comercial (+57 316 656 9719) para adquirir un plan de suscripción de pago mensual o anual.`
        : "";

  const contextOwnerDirective = ownerStatus?.isOwner
    ? `\n🏠 ESTADO DE PROPIETARIO DIRECTO EN SESIÓN (CORRETAJE VIRTUAL VECY): Este usuario es Propietario Directo (NO es colega inmobiliario; JAMÁS le ofrezcas comisión colaborativa 40/20/40 ni 50/50). Estado actual: T&C Corretaje Virtual=${ownerStatus.acceptsTerms ? "ACEPTADOS" : "PENDIENTE DE ACEPTACIÓN"}, Correo=${ownerStatus.email || "PENDIENTE DE SOLICITAR"}. Exige la aceptación de Términos y Condiciones de corretaje virtual, pide su correo para el envío formal del contrato y recuérdale comunicarse al 3166569719 (+57 316 656 9719) con Jani Alves o Eduardo Rivera para concretar el contrato y acordar la comisión previa a la publicación en https://vecy-bienes-raices.vercel.app/.`
    : "";

  let contextRoleDirective = "";
  if (identifiedRole === "agente_inmobiliario") {
    contextRoleDirective = `\n👤 ROL PERSISTIDO EN SESIÓN: AGENTE / INMOBILIARIA / CORREDOR. Adapta tu lenguaje al de alianza inmobiliaria colaborativa (40/20/40, cruces, captaciones, estudio de títulos y avalúos). PROHIBIDO volver a preguntarle su rol ni a qué se dedica.`;
  } else if (identifiedRole === "propietario_directo") {
    contextRoleDirective = `\n👤 ROL PERSISTIDO EN SESIÓN: PROPIETARIO DIRECTO. Acompáñalo bajo corretaje virtual VECY ($0 publicación/costos anticipados; 3% de ley en venta o 1 canon neto de arriendo sin incluir administración al cierre; línea directa +57 316 656 9719). Si el arriendo incluye administración sin decir cuánto vale, pregúntale su valor mensual para descontarlo. PROHIBIDO ofrecerle 40/20/40 o llamarlo "colega". PROHIBIDO volver a preguntarle su rol.`;
  } else if (identifiedRole === "comprador_inversionista") {
    contextRoleDirective = `\n👤 ROL PERSISTIDO EN SESIÓN: COMPRADOR DIRECTO / INVERSIONISTA. Acompáñalo con búsqueda de opciones, ROI/Cap Rate, Estudio de Títulos CTL, Norma POT y simulador financiero a través de VECY (+57 316 656 9719). JAMÁS le ofrezcas esquema de comisión 40/20/40 ni le prometas contacto directo de propietarios o terceros agentes (toda gestión se canaliza por VECY). PROHIBIDO volver a preguntarle su rol.`;
  } else if (identifiedRole === "arrendatario") {
    contextRoleDirective = `\n👤 ROL PERSISTIDO EN SESIÓN: ARRENDATARIO DIRECTO. Acompáñalo en búsqueda de arriendo, revisión Ley 820/2003 y gestión directa con VECY (+57 316 656 9719). JAMÁS le ofrezcas esquema 40/20/40 ni contacto directo con propietarios externos. PROHIBIDO volver a preguntarle su rol.`;
  } else {
    contextRoleDirective = `\n🧭 PERFILAMIENTO UNIVERSAL DE ROL EN PRIMER CONTACTO (ROL AÚN NO CONFIRMADO): NO des por sentado que este usuario es agente inmobiliario ("colega"). Todos los servicios gratuitos de JanIA están abiertos para TODO el público. Salúdalo con calidez, atiende cualquier duda o solicitud que ya haya expresado, y pregúntale de forma breve y natural en calidad de qué nos escribe o cuál es su rol: (1) Agente / Inmobiliaria / Corredor, (2) Propietario directo que desea vender/permutar/arrendar, o (3) Comprador directo / Inversionista / Arrendatario.`;
  }

  return { context402040Directive, contextOwnerDirective, contextRoleDirective, identifiedRole };
}

export interface OwnerRentalCommissionAnalysis {
  hasAdminFeeContext: boolean;
  includesAdminInTotal: boolean;
  needsAdminAmount: boolean;
  totalWithAdminCop?: number;
  adminFeeCop?: number;
  netCanonCop?: number;
  whatsappReply?: string;
}

function formatCopNumber(value: number): string {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

/**
 * Convierte expresiones monetarias colombianas ("$3.800.000", "3,8 millones", "800 mil") a pesos enteros COP.
 */
export function parseColombianCopAmount(snippet: string): number | undefined {
  const clean = (snippet || "").trim();
  if (!clean) return undefined;

  const millonesMatch = clean.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:millones?|mill[oó]n|\bMM?\b)/i);
  if (millonesMatch) {
    const val = Number(millonesMatch[1].replace(",", "."));
    if (Number.isFinite(val) && val > 0) return Math.round(val * 1_000_000);
  }

  const milMatch = clean.match(/(\d+(?:[.,]\d{1,2})?)\s*mil(?:\s+pesos)?\b/i);
  if (milMatch) {
    const val = Number(milMatch[1].replace(",", "."));
    if (Number.isFinite(val) && val > 0) return Math.round(val * 1_000);
  }

  const groupedCopMatch = clean.match(/\$?\s*(\d{1,3}(?:[.,]\d{3}){1,3})\b/);
  if (groupedCopMatch) {
    const digits = Number(groupedCopMatch[1].replace(/[.,]/g, ""));
    if (Number.isFinite(digits) && digits >= 50_000) return digits;
  }

  const plainDigitsMatch = clean.match(/\$?\s*(\d{5,11})\b/);
  if (plainDigitsMatch) {
    const digits = Number(plainDigitsMatch[1]);
    if (Number.isFinite(digits) && digits >= 50_000) return digits;
  }

  return undefined;
}

/**
 * Calcula y explica la comisión de corretaje para propietarios directos en arriendo:
 * 1 canon mensual NETO sin administración (descontando la administración si el total la incluye,
 * o preguntando su valor mensual si aún no se especificó).
 */
export function analyzeOwnerRentalCommissionFromText(
  text: string,
  options?: {
    pendingTotalWithAdminCop?: number;
    greetingPrefix?: string;
  }
): OwnerRentalCommissionAnalysis {
  const raw = String(text || "").trim();
  const greetingPrefix = options?.greetingPrefix || "";
  const pendingTotal =
    typeof options?.pendingTotalWithAdminCop === "number" && options.pendingTotalWithAdminCop > 0
      ? options.pendingTotalWithAdminCop
      : undefined;

  const adminFeeMatch = raw.match(
    /(?:valor(?:\s+mensual)?\s+(?:de\s+(?:la\s+)?)?|cuota\s+(?:de\s+)?)?(?:administraci[oó]n|admon)(?:\s+(?:mensual|del?\s+(?:conjunto|edificio)))?(?:\s+(?:es\s+de|son|vale|cuesta|ser[ií]a\s+de|de|por|:|=))?\s*(\$?\s*\d{1,3}(?:[.,]\d{3}){1,3}|\$?\s*\d+(?:[.,]\d{1,2})?\s*(?:millones?|mill[oó]n|mil|\bMM?\b)|\$?\s*\d{5,11})/i
  );
  let adminFeeCop = adminFeeMatch ? parseColombianCopAmount(adminFeeMatch[1]) : undefined;

  const includesAdminInTotal =
    /(?:inclu[iy](?:e|endo)\s+(?:la\s+)?(?:administraci[oó]n|admon)|inclu[ií]d[oa]\s+(?:(?:el\s+valor\s+de\s+)?(?:la\s+)?)?(?:administraci[oó]n|admon)|con\s+(?:la\s+)?(?:administraci[oó]n|admon)(?:\s+incluida)?|(?:administraci[oó]n|admon)\s+incluida)/i.test(
      raw
    );
  const explicitExcludedAdmin =
    /\bsin\s+(?:la\s+)?(?:administraci[oó]n|admon)\b|\bm[aá]s\s+(?:\$?\s*[\d.,]+(?:\s*(?:mil|millones?))?\s*(?:de\s+)?)?(?:administraci[oó]n|admon)\b/i.test(
      raw
    );

  // Si venimos de una pregunta previa del valor de administración y el propietario responde solo la cifra
  if (!adminFeeCop && pendingTotal) {
    const standalone = parseColombianCopAmount(raw);
    if (standalone && standalone < pendingTotal) {
      adminFeeCop = standalone;
    }
  }

  // Extraer valor total/canon del arriendo (evitando confundirlo con el fragmento de administración)
  const textWithoutAdminClause = adminFeeMatch
    ? `${raw.slice(0, adminFeeMatch.index)} ${raw.slice((adminFeeMatch.index || 0) + adminFeeMatch[0].length)}`
    : raw;

  const rentAnchorMatch = textWithoutAdminClause.match(
    /(?:canon(?:\s+total)?|arriendo|arrendamiento|arrendar|alquiler|renta|valor\s+total)(?:\s+(?:mensual|total|es\s+de|vale|cuesta|por|de|en|:|=)){0,3}\s*(\$?\s*\d{1,3}(?:[.,]\d{3}){1,3}|\$?\s*\d+(?:[.,]\d{1,2})?\s*(?:millones?|mill[oó]n|mil|\bMM?\b)|\$?\s*\d{5,11})/i
  );
  const parsedRent =
    (rentAnchorMatch ? parseColombianCopAmount(rentAnchorMatch[1]) : undefined) ||
    parseColombianCopAmount(textWithoutAdminClause);

  // Caso 1: Seguimiento en segundo turno tras preguntar por la administración
  if (pendingTotal && adminFeeCop && pendingTotal > adminFeeCop) {
    const netCanonCop = pendingTotal - adminFeeCop;
    return {
      hasAdminFeeContext: true,
      includesAdminInTotal: true,
      needsAdminAmount: false,
      totalWithAdminCop: pendingTotal,
      adminFeeCop,
      netCanonCop,
      whatsappReply:
        `${greetingPrefix}¡Perfecto! Hacemos la cuenta al centavo y con total claridad: 🧮✨\n\n` +
        `• 💰 *Valor total informado (con administración incluida):* ${formatCopNumber(pendingTotal)} COP/mes\n` +
        `• 🏢 *Menos cuota mensual de administración:* -${formatCopNumber(adminFeeCop)} COP\n` +
        `• ✅ *Canon neto de arrendamiento (base real de comisión):* **${formatCopNumber(netCanonCop)} COP**\n\n` +
        `Por pura lógica y transparencia en **VECY BIENES RAÍCES**, la publicación y pauta es **100% GRATUITA ($0 COP anticipados)** y en **ARRIENDO** nuestra comisión por éxito es únicamente de **un (1) canon neto sin administración**, es decir **${formatCopNumber(netCanonCop)} COP** pagaderos al cerrarse efectivamente el contrato de arrendamiento.\n\n` +
        `¿Quieres que registremos de una vez tu inmueble con este canon para buscar al inquilino ideal y enviarte el contrato de corretaje? 🤝🏡`
    };
  }

  // Caso 2: Mismo turno — canon total con administración incluida + valor de administración explícito
  if (includesAdminInTotal && !explicitExcludedAdmin && parsedRent && adminFeeCop && parsedRent > adminFeeCop) {
    const netCanonCop = parsedRent - adminFeeCop;
    return {
      hasAdminFeeContext: true,
      includesAdminInTotal: true,
      needsAdminAmount: false,
      totalWithAdminCop: parsedRent,
      adminFeeCop,
      netCanonCop,
      whatsappReply:
        `${greetingPrefix}En **VECY BIENES RAÍCES** la publicación y pauta de tu inmueble es **100% GRATUITA ($0 COP anticipados)** y únicamente cobramos comisión por éxito al cerrar el negocio:\n\n` +
        `• 🏷️ **Si fuera VENTA:** El **3%** de ley sobre el valor final de venta pactado.\n` +
        `• 🔑 **En ARRIENDO (tu caso):** Se cobra el **primer canon de arrendamiento (1 mes de canon neto, lógicamente sin incluir administración)**:\n` +
        `  - Valor total con administración incluida: ${formatCopNumber(parsedRent)} COP\n` +
        `  - Menos administración mensual: -${formatCopNumber(adminFeeCop)} COP\n` +
        `  - ✅ *Comisión exacta por éxito (canon neto):* **${formatCopNumber(netCanonCop)} COP**\n\n` +
        `¿Deseas que radicemos tu inmueble de una vez y te envíe tu contrato de corretaje virtual? 🤝✨`
    };
  }

  // Caso 3: Mismo turno — dice "administración incluida" pero NO dijo cuánto vale la administración
  if (includesAdminInTotal && !explicitExcludedAdmin && parsedRent && !adminFeeCop) {
    return {
      hasAdminFeeContext: true,
      includesAdminInTotal: true,
      needsAdminAmount: true,
      totalWithAdminCop: parsedRent,
      whatsappReply:
        `${greetingPrefix}En **VECY BIENES RAÍCES** la publicación y pauta es **100% GRATUITA ($0 COP anticipados)** y únicamente cobramos comisión por éxito al cerrar el negocio: **3% en venta** o el **primer canon de arrendamiento (1 mes de canon neto, sin incluir administración)**.\n\n` +
        `Como me indicas que los **${formatCopNumber(parsedRent)} COP** ya incluyen la cuota de administración, **por pura lógica la administración no hace parte de nuestra comisión**: la descontamos para liquidar únicamente sobre el canon puro de arriendo.\n\n` +
        `👉 Cuéntame, por favor: **¿de cuánto es el valor mensual de la administración?** Así te calculo de inmediato el canon neto y el valor exacto de la comisión. 🤝🏢`
    };
  }

  // Caso 4: Especificó canon neto aparte + administración aparte ("sin administración" / "más $800.000 de admon")
  if (explicitExcludedAdmin && parsedRent) {
    return {
      hasAdminFeeContext: Boolean(adminFeeCop),
      includesAdminInTotal: false,
      needsAdminAmount: false,
      adminFeeCop,
      netCanonCop: parsedRent,
      whatsappReply:
        `${greetingPrefix}En **VECY BIENES RAÍCES** la publicación y pauta es **100% GRATUITA ($0 COP anticipados)** y en **ARRIENDO** nuestra comisión por éxito es de **un (1) canon neto mensual sin incluir administración**: **${formatCopNumber(parsedRent)} COP**${adminFeeCop ? ` (la administración de ${formatCopNumber(adminFeeCop)} COP no entra en la comisión)` : ""}.\n\n` +
        `¿Quieres que registremos tu inmueble de una vez? 🤝✨`
    };
  }

  return {
    hasAdminFeeContext: Boolean(adminFeeCop || includesAdminInTotal),
    includesAdminInTotal,
    needsAdminAmount: false
  };
}
