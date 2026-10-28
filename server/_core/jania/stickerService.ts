import fs from "node:fs";
import path from "node:path";

/**
 * 🎨 PACK OFICIAL DE 14 STICKERS 3D EJECUTIVOS Y JOCOSOS DE JANIA (v33.66 — Doctrina Eduardo A. Rivera)
 * Convierte a JanIA en una interlocutora cálida, expresiva, simpática y 100% humana en WhatsApp (Baileys).
 * Todos los stickers están normalizados en formato oficial WhatsApp WebP (512x512 px, RGBA fondo transparente).
 */

export type JaniaStickerKey =
  | "ternura"
  | "abacho"
  | "gracias_ternura"
  | "gracias_alegre"
  | "gracias_brillo"
  | "ok"
  | "mmm"
  | "jajaja"
  | "jajaja_fuerte"
  | "juajuajua"
  | "queee"
  | "oh_por_dios"
  | "ush"
  | "nooo_por_que";

export interface JaniaStickerMetadata {
  key: JaniaStickerKey;
  filename: string;
  label: string;
  emotion: string;
  useCase: string;
}

export const JANIA_STICKER_CATALOG: Record<JaniaStickerKey, JaniaStickerMetadata> = {
  ternura: {
    key: "ternura",
    filename: "jania_ternura.webp",
    label: "JanIA Ternura y Calidez",
    emotion: "empatia_calidez",
    useCase: "Saludo afectuoso, bienvenida cálida o gesto de empatía genuina sin texto."
  },
  abacho: {
    key: "abacho",
    filename: "jania_abacho.webp",
    label: "¡Abacho!",
    emotion: "afecto_abrazo",
    useCase: "Cuando el usuario envía un abrazo, bendiciones, felicitaciones o muestras de cariño a JanIA."
  },
  gracias_ternura: {
    key: "gracias_ternura",
    filename: "jania_gracias_ternura.webp",
    label: "¡Gracias! (Con ternura y guiño)",
    emotion: "gratitud_tierna",
    useCase: "Cuando el colega acepta la alianza 40/20/40, elogia a JanIA o agradece con calidez."
  },
  gracias_alegre: {
    key: "gracias_alegre",
    filename: "jania_gracias_alegre.webp",
    label: "¡Gracias! (Alegre y ejecutiva)",
    emotion: "gratitud_dinamica",
    useCase: "Al radicar con éxito un inmueble (#PROP) o requerimiento (#REQ) en la base de datos."
  },
  gracias_brillo: {
    key: "gracias_brillo",
    filename: "jania_gracias_brillo.webp",
    label: "¡Gracias! (Con estilo y brillo)",
    emotion: "gratitud_elegante",
    useCase: "Cuando el propietario o colega entrega su correo, confirma agendamiento o cierra un acuerdo."
  },
  ok: {
    key: "ok",
    filename: "jania_ok.webp",
    label: "¡Ok!",
    emotion: "confirmacion_ejecutiva",
    useCase: "Confirmación inmediata de instrucciones, acuerdos, radicados o visto bueno ('listo', 'perfecto', 'de acuerdo')."
  },
  mmm: {
    key: "mmm",
    filename: "jania_mmm.webp",
    label: "¡Mmm! (Pensando y analizando)",
    emotion: "analisis_profundo",
    useCase: "Consultas de avalúo comercial (ACM), Cap Rate, estudio tributario DIAN, POT o análisis jurídico profundo."
  },
  jajaja: {
    key: "jajaja",
    filename: "jania_jajaja.webp",
    label: "¡Jajaja!",
    emotion: "risa_espontanea",
    useCase: "Cuando el usuario se ríe ('jaja', 'jeje', '😂') o hace un comentario simpático y ameno."
  },
  jajaja_fuerte: {
    key: "jajaja_fuerte",
    filename: "jania_jajaja_fuerte.webp",
    label: "¡Jajaja! (Variante alegre)",
    emotion: "risa_alegre",
    useCase: "Rotación natural de risa para evitar repetir el mismo sticker en conversaciones jocosas."
  },
  juajuajua: {
    key: "juajuajua",
    filename: "jania_juajuajua.webp",
    label: "¡Jua, jua, jua!",
    emotion: "carcajada_total",
    useCase: "Cuando el usuario cuenta una anécdota muy graciosa o suelta una carcajada ('juajuajua', '🤣🤣')."
  },
  queee: {
    key: "queee",
    filename: "jania_queee.webp",
    label: "¡Queee!",
    emotion: "sorpresa_positiva",
    useCase: "Sorpresa ante un súper Match (85%-100%), una oportunidad inmobiliaria extraordinaria o dato revelador."
  },
  oh_por_dios: {
    key: "oh_por_dios",
    filename: "jania_oh_por_dios.webp",
    label: "¡Oh por Dios!",
    emotion: "asombro_impacto",
    useCase: "Asombro ante precios desfasados del mercado, impuestos elevados o casos inmobiliarios impactantes."
  },
  ush: {
    key: "ush",
    filename: "jania_ush.webp",
    label: "¡Ush!",
    emotion: "indignacion_simpatica",
    useCase: "Reacción cómplice ante los abusos de los 'dinosaurios inmobiliarios' (portales tradicionales), leads quemados o cláusulas leoninas."
  },
  nooo_por_que: {
    key: "nooo_por_que",
    filename: "jania_nooo_por_que.webp",
    label: "¡Nooo... por qué!",
    emotion: "drama_jocoso",
    useCase: "Empatía jocosa cuando se cae un negocio, un cliente se arrepiente o un colega rechaza el 40/20/40 gratuito."
  }
};

export interface LoadedJaniaSticker {
  key: JaniaStickerKey;
  filename: string;
  filePath: string;
  buffer: Buffer;
  label: string;
  emotion: string;
}

const stickerBufferCache = new Map<JaniaStickerKey, LoadedJaniaSticker>();

function resolveStickerFilePath(filename: string): string | null {
  const candidateDirs = [
    path.resolve(process.cwd(), "client", "public", "assets", "stickers"),
    path.resolve(process.cwd(), "assets", "stickers"),
    path.resolve(process.cwd(), "dist", "assets", "stickers")
  ];

  for (const dir of candidateDirs) {
    const fullPath = path.join(dir, filename);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

/**
 * Obtiene el sticker `.webp` (512x512 RGBA) listo para ser despachado por Baileys (`{ sticker: buffer }`).
 */
export function getJaniaStickerByKey(key: JaniaStickerKey): LoadedJaniaSticker | null {
  const meta = JANIA_STICKER_CATALOG[key];
  if (!meta) return null;

  const cached = stickerBufferCache.get(key);
  if (cached && cached.buffer.length > 0) {
    return cached;
  }

  const filePath = resolveStickerFilePath(meta.filename);
  if (!filePath) return null;

  try {
    const buffer = fs.readFileSync(filePath);
    if (!buffer || buffer.length === 0) return null;
    const loaded: LoadedJaniaSticker = {
      key: meta.key,
      filename: meta.filename,
      filePath,
      buffer,
      label: meta.label,
      emotion: meta.emotion
    };
    stickerBufferCache.set(key, loaded);
    return loaded;
  } catch {
    return null;
  }
}

/**
 * Lista todos los stickers disponibles y verificados en disco.
 */
export function listAvailableJaniaStickers(): LoadedJaniaSticker[] {
  const keys = Object.keys(JANIA_STICKER_CATALOG) as JaniaStickerKey[];
  const result: LoadedJaniaSticker[] = [];
  for (const k of keys) {
    const item = getJaniaStickerByKey(k);
    if (item) result.push(item);
  }
  return result;
}

// Cola efímera de stickers por usuario en DMs (mismo patrón limpio que popLatestDmPdf)
const latestDmStickerMap = new Map<string, LoadedJaniaSticker>();
// Control de frecuencia y rotación por usuario para que JanIA actúe como humana real sin saturar
const userStickerHistoryMap = new Map<string, { lastSentAt: number; lastKey: JaniaStickerKey; countInWindow: number }>();

export function setLatestDmSticker(userId: string, stickerKey: JaniaStickerKey): LoadedJaniaSticker | null {
  const loaded = getJaniaStickerByKey(stickerKey);
  if (loaded && userId) {
    latestDmStickerMap.set(userId, loaded);
  }
  return loaded;
}

export function popLatestDmSticker(userId: string): LoadedJaniaSticker | undefined {
  const item = latestDmStickerMap.get(userId);
  if (item) {
    latestDmStickerMap.delete(userId);
  }
  return item;
}

/**
 * Extrae y limpia cualquier etiqueta `[STICKER:clave]` emitida por el LLM para que jamás quede visible en texto plano.
 */
export function extractStickerTagFromReply(replyText: string): {
  cleanText: string;
  stickerKey: JaniaStickerKey | null;
} {
  if (!replyText) return { cleanText: "", stickerKey: null };

  let foundKey: JaniaStickerKey | null = null;
  const tagRegex = /\[STICKER\s*:\s*([a-z0-9_]+)\]/gi;
  const match = tagRegex.exec(replyText);
  if (match && match[1]) {
    const candidate = match[1].toLowerCase().trim() as JaniaStickerKey;
    if (candidate in JANIA_STICKER_CATALOG) {
      foundKey = candidate;
    }
  }

  const cleanText = replyText.replace(tagRegex, "").replace(/\n{3,}/g, "\n\n").trim();
  return { cleanText, stickerKey: foundKey };
}

/**
 * Selecciona de forma inteligente y humana un sticker contextual según la interacción en DM.
 * Incluye anti-saturación (cooldown por usuario) y rotación de variantes (`gracias_*`, `jajaja*`).
 */
export function selectContextualStickerForDm(
  userMessage: string,
  assistantReply: string,
  userId = "default_user",
  options?: { bypassCooldown?: boolean }
): LoadedJaniaSticker | null {
  const uLower = (userMessage || "").toLowerCase();
  const aLower = (assistantReply || "").toLowerCase();

  // 1. Verificar si el LLM ya sugirió explícitamente un tag [STICKER:...]
  const extracted = extractStickerTagFromReply(assistantReply);
  if (extracted.stickerKey) {
    return getJaniaStickerByKey(extracted.stickerKey);
  }

  // No enviar stickers en mensajes de error técnico
  if (aLower.includes("intermitencia temporal") || aLower.includes("error procesando")) {
    return null;
  }

  const now = Date.now();
  const prev = userStickerHistoryMap.get(userId);
  // Cooldown natural humano: mínimo 90 segundos entre stickers automáticos al mismo usuario (salvo bypass o risa/abrazo explícito)
  const isExplicitEmotionalTrigger =
    /\b(?:abraz[oa]|abacho|bendiciones|te\s+quiero\s+jania|eres\s+la\s+mejor|gracias\s+jania|mil\s+gracias|jajaj+|jeje+|juajua+|😂|🤣)\b/i.test(uLower);

  if (
    !options?.bypassCooldown &&
    !isExplicitEmotionalTrigger &&
    prev &&
    now - prev.lastSentAt < 90_000
  ) {
    return null;
  }

  let chosenKey: JaniaStickerKey | null = null;

  // Regla A: Abrazos, cariño o bendiciones del usuario -> ¡Abacho!
  if (/\b(?:abraz[oa]s?|abacho|un\s+abrazo|bendiciones|te\s+adoro|eres\s+un\s+amor|tan\s+bella|tan\s+linda)\b/i.test(uLower)) {
    chosenKey = "abacho";
  }
  // Regla B: Carcajadas fuertes -> ¡Jua, jua, jua!
  else if (/(?:juajua|jajajaja|🤣🤣|😂😂)/i.test(uLower)) {
    chosenKey = "juajuajua";
  }
  // Regla C: Risa o comentario jocoso -> Rotación entre jajaja y jajaja_fuerte
  else if (/\b(?:jaja+|jeje+|jiji+)\b|😂|🤣|😅/i.test(uLower) || /\b(?:jaja+|jeje+)\b/i.test(aLower)) {
    chosenKey = prev?.lastKey === "jajaja" ? "jajaja_fuerte" : "jajaja";
  }
  // Regla D: Indignación simpática contra "dinosaurios inmobiliarios", portales caros o abusos -> ¡Ush!
  else if (
    /\b(?:dinosaurios?\s+inmobiliarios?|leads?\s+quemados?|portales?\s+tradicionales|cobran\s+car[oí]simo|abuso|estafa)\b/i.test(uLower) ||
    /\b(?:dinosaurios?\s+inmobiliarios?|leads?\s+quemados?)\b/i.test(aLower)
  ) {
    chosenKey = "ush";
  }
  // Regla E: Rechazo al 40/20/40 o caída de un negocio -> ¡Nooo... por qué!
  else if (
    /\b(?:no\s+comparto\s+40|rechazo\s+el\s+40|se\s+cay[oó]\s+el\s+negocio|perdimos\s+el\s+cliente)\b/i.test(uLower) ||
    aLower.includes("plan de pago mensual o anual")
  ) {
    chosenKey = "nooo_por_que";
  }
  // Regla F: Súper Match encontrado (85% - 100%) -> ¡Queee!
  else if (/\b(?:match\s+confirmado|coincidencias?\s+de\s+alta\s+afinidad|#m\d{3,})\b/i.test(aLower)) {
    chosenKey = "queee";
  }
  // Regla G: Radicado exitoso de inmueble (#PROP) o requerimiento (#REQ) -> Rotación de Gracias
  else if (/\b(?:prop-\d+|req-\d+|id\s+#\d+|registrad[oa]\s+exitosamente)\b/i.test(aLower)) {
    chosenKey = prev?.lastKey === "gracias_alegre" ? "gracias_brillo" : "gracias_alegre";
  }
  // Regla H: Agradecimiento del usuario o aceptación de alianza 40/20/40 -> Gracias con ternura / brillo
  else if (/\b(?:muchas\s+gracias|mil\s+gracias|gracias\s+jania|acepto\s+el\s+40\/20\/40|claro\s+que\s+s[ií]\s+acepto)\b/i.test(uLower)) {
    if (prev?.lastKey === "gracias_ternura") {
      chosenKey = "gracias_brillo";
    } else if (prev?.lastKey === "gracias_brillo") {
      chosenKey = "gracias_alegre";
    } else {
      chosenKey = "gracias_ternura";
    }
  }
  // Regla I: Avalúo comercial ACM, Cap Rate, liquidación notarial o análisis jurídico profundo -> ¡Mmm!
  else if (
    /\b(?:aval[uú]o|sondeo\s+de\s+mercado|cap\s+rate|liquidaci[oó]n\s+notarial|estudio\s+de\s+t[ií]tulos|pacto\s+de\s+retroventa|ley\s+820)\b/i.test(uLower)
  ) {
    chosenKey = "mmm";
  }
  // Regla J: Asombro por cifras multimillonarias o desfase de precios -> ¡Oh por Dios!
  else if (/\b(?:desfasad[oa]|sobrevalorad[oa]|car[ií]simo|incre[ií]ble|impresionante)\b/i.test(uLower)) {
    chosenKey = "oh_por_dios";
  }
  // Regla K: Confirmación ejecutiva ('ok', 'listo', 'perfecto', 'de acuerdo') -> ¡Ok!
  else if (/^(?:ok|listo|perfecto|de\s+acuerdo|entendido|confirmado|dale|vale)[\s.!]*$/i.test(uLower.trim())) {
    chosenKey = "ok";
  }
  // Regla L: Primer saludo cálido y afectuoso -> Ternura
  else if (/^(?:hola\s+jania|buenos\s+d[ií]as\s+jania|buenas\s+tardes\s+jania|buenas\s+noches\s+jania)/i.test(uLower.trim()) && !prev) {
    chosenKey = "ternura";
  }

  if (!chosenKey) return null;

  const sticker = getJaniaStickerByKey(chosenKey);
  if (sticker) {
    userStickerHistoryMap.set(userId, {
      lastSentAt: now,
      lastKey: chosenKey,
      countInWindow: (prev?.countInWindow || 0) + 1
    });
  }
  return sticker;
}

