import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ESTUDIO CREATIVO IA & MOTOR DE PORTADAS EDITORIALES 1:1 — JANIA v33.67
 * Doctrina Fundacional de Eduardo A. Rivera — VECY BIENES RAÍCES
 * ═══════════════════════════════════════════════════════════════════════════
 * 1. CANON SAGRADO INMUTABLE DE JANIA (Fisonomía Oficial):
 *    - Render 3D estilizado de ultra-alta definición (estilo Pixar/Disney).
 *    - Cabello SIEMPRE negro azabache profundo brillante (deep glossy jet-black bob haircut, CERO cabello castaño).
 *    - Corte bob voluminoso con raya lateral, gafas translúcidas color lila/lavanda suave,
 *      ojos expresivos color miel/avellana oscuro, aretes de diamantes brillantes, sonrisa cálida y ejecutiva.
 *    - Broche circular dorado oficial de "Vecy" (con techo de casa y sonrisa curva dorada) en el pecho.
 *    - Variación libre y dinámica de poses, vestuario de Alta Costura (Oro Líquido, Púrpura Imperial,
 *      Traje Sastre Blanco Marfil Cuello Mao con Oro, Magma Volcánico, Esmeralda Seda, Blazer Ejecutivo Negro/Oro)
 *      y escenarios según la historia o publicación.
 *
 * 2. COLORES Y ARQUITECTURA DE LA OFICINA INSTITUCIONAL VECY BIENES RAÍCES:
 *    - Negro carbón mate (#0A0A0A / #111111) + Oro Imperial / Champán (#D4AF37 / #BF953F).
 *    - Escritorio ejecutivo de mármol negro con vetas doradas y perfil en oro cepillado.
 *    - Biblioteca retroiluminada con maquetas arquitectónicas doradas y emblema circular luminoso "Vecy".
 *    - Ventanal panorámico piso a techo con skyline urbano al atardecer dorado.
 *
 * 3. DOS MOTORES DE CREACIÓN VISUAL:
 *    - Motor A (`generateDailyChannelEditorialImage`): Crea cada día una portada editorial e infográfica 1:1
 *      (1080x1080) 100% única para el Canal Oficial de WhatsApp, estampando fecha, categoría, titular exacto
 *      del día y píldoras clave sobre el arte del Canon Sagrado de JanIA y la Oficina Institucional VECY.
 *    - Motor B (`generateCustomUserCreativeImage`): Permite a cualquier usuario por WhatsApp pedirle a JanIA
 *      con su propio prompt la creación de flyers para inmuebles, banners, posts o infografías.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const JANIA_SACRED_VISUAL_CANON = {
  hair: "Cabello SIEMPRE negro azabache profundo brillante (deep glossy jet-black bob haircut, CERO cabello castaño ni tonos claros)",
  faceAndStyle:
    "3D Pixar/Disney executive Colombian woman, expressive warm hazel-brown eyes, translucent lilac/lavender glasses, diamond stud earrings, warm confident smile",
  brooch: "official circular gold Vecy brooch with house roof and smile emblem on chest",
  wardrobeCollection: [
    "jania_anfitriona_cafe_1x1.jpg",
    "jania_couture_oro_liquido_1x1.png",
    "jania_legal_due_diligence_1x1.jpg",
    "jania_couture_esmeralda_seda_1x1.jpg",
    "jania_marketing_colaborativo_1x1.jpg",
    "jania_couture_purpura_imperial_1x1.jpg",
    "jania_avaluos_pot_1x1.jpg",
    "jania_couture_blanco_mao_oro_1x1.jpg",
    "jania_seguridad_notarial_1x1.jpg",
    "jania_couture_magma_volcanico_1x1.jpg",
    "vecy_oficina_institucional.jpg"
  ]
} as const;

export const VECY_INSTITUTIONAL_OFFICE_CANON = {
  primaryDarkHex: "#0A0A0A",
  secondaryCarbonHex: "#141414",
  primaryGoldHex: "#D4AF37",
  metallicGoldHex: "#BF953F",
  lightGoldHex: "#FCF6BA",
  pureWhiteHex: "#FFFFFF",
  mutedSilverHex: "#D4D4D8",
  primaryColors: {
    matteCarbonBlack: "#0A0A0A",
    imperialGold: "#D4AF37",
    metallicGold: "#BF953F"
  },
  architectureDescription:
    "Oficina ejecutiva de lujo VECY BIENES RAÍCES en negro carbón (#0A0A0A) y oro imperial (#D4AF37), escritorio de mármol negro con vetas doradas, biblioteca iluminada con maquetas de edificios dorados, logo circular luminoso Vecy en el muro y ventanal panorámico hacia la ciudad al atardecer."
} as const;

export type CreativeAssetType =
  | "flyer_inmueble"
  | "banner_comercial"
  | "banner_promocional"
  | "post_redes"
  | "infografia"
  | "infografia_inmobiliaria"
  | "arte_libre";

export interface UserCreativeImageInput {
  assetType?: CreativeAssetType;
  tipoPieza?: CreativeAssetType | string;
  userPrompt?: string;
  headline?: string;
  title?: string;
  subheadline?: string;
  subtitle?: string;
  priceOrHighlight?: string;
  priceOrValue?: string;
  price?: string;
  ubicacion?: string;
  locationOrZone?: string;
  bulletPoints?: string[];
  specs?: string[];
  puntosClave?: string[];
  contactInfo?: string;
  contactPhone?: string;
  userName?: string;
  includeJaniaAvatar?: boolean;
}

export interface GeneratedCreativeImageResult {
  buffer: Buffer;
  imageBuffer: Buffer;
  filePath: string;
  fileName: string;
  caption: string;
  assetType: CreativeAssetType;
}

// Cola en memoria por teléfono para despacho de imágenes creativas en WhatsApp DM / Grupos
const pendingCreativeImagesByPhone = new Map<string, GeneratedCreativeImageResult>();

export function queueCreativeImageForDm(phone: string, img: GeneratedCreativeImageResult): void {
  const clean = (phone || "").replace(/\D/g, "") || phone;
  if (!clean) return;
  pendingCreativeImagesByPhone.set(clean, img);
}

export function popLatestDmCreativeImage(phone: string): GeneratedCreativeImageResult | undefined {
  const clean = (phone || "").replace(/\D/g, "") || phone;
  if (!clean) return undefined;
  const found = pendingCreativeImagesByPhone.get(clean);
  if (found) {
    pendingCreativeImagesByPhone.delete(clean);
    return found;
  }
  const last10 = clean.slice(-10);
  if (last10.length >= 7) {
    for (const [k, v] of pendingCreativeImagesByPhone.entries()) {
      if (k.slice(-10) === last10) {
        pendingCreativeImagesByPhone.delete(k);
        return v;
      }
    }
  }
  return undefined;
}

function stripEmojisAndMarkdown(str: string): string {
  return (str || "")
    .replace(/[*_~`#]/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const clean = stripEmojisAndMarkdown(text);
  if (!clean) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) {
        break;
      }
    }
  }
  const consumedWords = lines.join(" ").split(" ").filter(Boolean).length;
  const remaining = words.slice(consumedWords).join(" ");
  if (remaining && lines.length < maxLines) {
    if (remaining.length > maxCharsPerLine) {
      lines.push(remaining.slice(0, maxCharsPerLine - 1).trim() + "…");
    } else {
      lines.push(remaining);
    }
  } else if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines.slice(0, maxLines);
}

/**
 * Extrae automáticamente hasta 3 píldoras o puntos clave de un texto de difusión diaria
 */
export function extractKeyBulletsFromCaption(captionText: string): string[] {
  if (!captionText) return [];
  const rawLines = captionText
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const bulletCandidates = rawLines.filter(
    l =>
      /^[•▪▸✅🔹1-4]\s*/.test(l) &&
      !l.includes("http") &&
      !l.includes("wa.me") &&
      !l.includes("La evolución inevitable")
  );

  const cleaned = bulletCandidates
    .map(l => stripEmojisAndMarkdown(l.replace(/^[•▪▸✅🔹1-4.)]+\s*/, "")))
    .filter(l => l.length >= 12)
    .slice(0, 3)
    .map(l => (l.length > 72 ? l.slice(0, 69).trim() + "…" : l));

  if (cleaned.length >= 2) return cleaned;

  const paragraphs = rawLines
    .filter(
      l =>
        l.length > 30 &&
        !l.toLowerCase().includes("buenos días") &&
        !l.toLowerCase().includes("buenas tardes") &&
        !l.includes("http") &&
        !l.includes("VECY")
    )
    .map(l => stripEmojisAndMarkdown(l))
    .slice(0, 3)
    .map(l => (l.length > 72 ? l.slice(0, 69).trim() + "…" : l));

  return paragraphs.length > 0
    ? paragraphs
    : [
        "Blindaje jurídico, técnico y tributario en cada operación inmobiliaria.",
        "Algoritmo de Matching IA (85%-100%) y Bolsa Colaborativa 40/20/40.",
        "Consultoría 24/7 con JanIA en WhatsApp (+57 319 291 9978) y Web."
      ];
}

/**
 * Resuelve la imagen base 1:1 del Canon Sagrado (cabello negro azabache o la oficina institucional VECY)
 */
export function resolveSacredCanonBaseImagePath(themeKey: string, dayOfMonth?: number): string {
  const normalized = (themeKey || "").toLowerCase();
  const dir1x1 = path.resolve(process.cwd(), "client/public/assets/channel_1x1");
  const janiaDir = path.resolve(process.cwd(), "client/public/assets/jania");

  const sacredRotation = [
    "jania_anfitriona_cafe_1x1.jpg",
    "jania_couture_oro_liquido_1x1.png",
    "jania_legal_due_diligence_1x1.jpg",
    "jania_couture_esmeralda_seda_1x1.jpg",
    "jania_marketing_colaborativo_1x1.jpg",
    "jania_couture_purpura_imperial_1x1.jpg",
    "jania_avaluos_pot_1x1.jpg",
    "jania_couture_blanco_mao_oro_1x1.jpg",
    "jania_seguridad_notarial_1x1.jpg",
    "jania_couture_magma_volcanico_1x1.jpg"
  ];

  let chosen = "jania_legal_due_diligence_1x1.jpg";
  if (typeof dayOfMonth === "number" && dayOfMonth > 0) {
    chosen = sacredRotation[(dayOfMonth - 1) % sacredRotation.length];
  } else if (normalized.includes("oficina") || normalized.includes("institucional")) {
    chosen = "vecy_oficina_institucional.jpg";
  } else if (
    normalized.includes("tribut") ||
    normalized.includes("dian") ||
    normalized.includes("notari") ||
    normalized.includes("segurid") ||
    normalized.includes("verific")
  ) {
    chosen = "jania_seguridad_notarial_1x1.jpg";
  } else if (
    normalized.includes("avaluo") ||
    normalized.includes("pot") ||
    normalized.includes("suelo") ||
    normalized.includes("ecolog")
  ) {
    chosen = "jania_avaluos_pot_1x1.jpg";
  } else if (
    normalized.includes("market") ||
    normalized.includes("40") ||
    normalized.includes("match") ||
    normalized.includes("bolsa") ||
    normalized.includes("colabora")
  ) {
    chosen = "jania_marketing_colaborativo_1x1.jpg";
  } else if (
    normalized.includes("cafe") ||
    normalized.includes("comunidad") ||
    normalized.includes("balance")
  ) {
    chosen = "jania_anfitriona_cafe_1x1.jpg";
  } else if (
    normalized.includes("noticia") ||
    normalized.includes("primicia") ||
    normalized.includes("ia")
  ) {
    chosen = "jania_couture_magma_volcanico_1x1.jpg";
  }

  for (const dir of [dir1x1, janiaDir]) {
    const candidate = path.join(dir, chosen);
    if (fs.existsSync(candidate)) return candidate;
  }

  return path.join(dir1x1, "jania_legal_due_diligence_1x1.jpg");
}

function resolveThemeBadgeLabel(themeKey: string): string {
  const n = (themeKey || "").toLowerCase();
  if (n.includes("tribut") || n.includes("ganancia") || n.includes("dian") || n.includes("exencion")) {
    return "INTELIGENCIA TRIBUTARIA DIAN";
  }
  if (
    n.includes("jurid") ||
    n.includes("notari") ||
    n.includes("arras") ||
    n.includes("sucesion") ||
    n.includes("arrendamiento")
  ) {
    return "BLINDAJE JURÍDICO & NOTARIAL";
  }
  if (n.includes("avaluo") || n.includes("sinupot") || n.includes("urbanis") || n.includes("patologia")) {
    return "AVALÚOS COMERCIALES & POT";
  }
  if (
    n.includes("colabora") ||
    n.includes("portal") ||
    n.includes("40") ||
    n.includes("demanda") ||
    n.includes("publicacion")
  ) {
    return "MODELO COLABORATIVO 40/20/40";
  }
  if (n.includes("segurid") || n.includes("identidad") || n.includes("verific")) {
    return "SEGURIDAD SARLAFT & VERIFICACIÓN";
  }
  if (n.includes("market") || n.includes("fotografia") || n.includes("ia") || n.includes("negociacion")) {
    return "MARKETING PRO & ESTRATEGIA IA";
  }
  return "CÁTEDRA INMOBILIARIA VECY";
}

/**
 * Renderiza mediante Python Pillow una composición editorial 1080x1080 en Negro Carbón (#0A0A0A) y Oro Imperial (#D4AF37)
 */
function renderEditorialImageWithPillow(params: {
  inputImagePath: string;
  outputImagePath: string;
  topSubheader: string;
  badgeLabel: string;
  headlineLines: string[];
  bullets: string[];
  priceHighlight?: string;
  footerLeft: string;
  footerSub: string;
  footerPill: string;
}): boolean {
  const pyScript = `
import sys, json
from PIL import Image, ImageDraw, ImageFont

data = json.loads(sys.argv[1])
base = Image.open(data["inputImagePath"]).convert("RGBA")

# Resize/crop to 1080x1080
w, h = base.size
target = 1080
scale = max(target / float(w), target / float(h))
nw, nh = int(w * scale), int(h * scale)
base = base.resize((nw, nh), Image.Resampling.LANCZOS)
left = (nw - target) // 2
top = 0
base = base.crop((left, top, left + target, top + target))

overlay = Image.new("RGBA", (1080, 1080), (0, 0, 0, 0))
draw = ImageDraw.Draw(overlay)

def load_font(size, bold=False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for p in candidates:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()

f_brand = load_font(20, True)
f_sub = load_font(14, True)
f_badge = load_font(15, True)
f_title = load_font(31, True)
f_bullet = load_font(20, False)
f_price = load_font(22, True)
f_footer = load_font(16, True)
f_footer_sub = load_font(14, False)

# Top bar (#0A0A0A + #D4AF37 border)
draw.rounded_rectangle([38, 28, 1042, 96], radius=16, fill=(10, 10, 10, 228), outline=(212, 175, 55, 255), width=2)
draw.ellipse([56, 44, 92, 80], fill=(212, 175, 55, 255))
draw.text((67, 50), "V", font=f_brand, fill=(10, 10, 10, 255))
draw.text((106, 40), "VECY BIENES RAÍCES", font=f_brand, fill=(255, 255, 255, 255))
draw.text((106, 66), data["topSubheader"][:58], font=f_sub, fill=(212, 175, 55, 255))

# Top-right category badge
draw.rounded_rectangle([620, 41, 1026, 83], radius=20, fill=(212, 175, 55, 45), outline=(212, 175, 55, 235), width=2)
draw.text((640, 52), data["badgeLabel"][:34], font=f_badge, fill=(252, 246, 186, 255))

# Bottom gradient shade
for y in range(560, 1080):
    alpha = int(min(248, ((y - 560) / 520.0) * 255))
    draw.line([(0, y), (1080, y)], fill=(8, 8, 8, alpha))

# Main bottom editorial card (#0A0A0A + Gold #D4AF37)
draw.rounded_rectangle([38, 648, 1042, 1042], radius=24, fill=(10, 10, 10, 236), outline=(212, 175, 55, 255), width=3)
draw.line([(64, 678), (380, 678)], fill=(212, 175, 55, 255), width=4)

if data.get("priceHighlight"):
    draw.rounded_rectangle([640, 622, 1024, 676], radius=16, fill=(212, 175, 55, 255))
    draw.text((662, 636), data["priceHighlight"][:26].upper(), font=f_price, fill=(10, 10, 10, 255))

ty = 696
for line in data["headlineLines"][:2]:
    draw.text((64, ty), line.upper()[:42], font=f_title, fill=(255, 255, 255, 255))
    ty += 40

by = max(ty + 14, 784)
for b in data["bullets"][:3]:
    draw.ellipse([66, by + 6, 78, by + 18], fill=(212, 175, 55, 255))
    draw.text((90, by), b[:70], font=f_bullet, fill=(232, 232, 236, 255))
    by += 36

draw.line([(64, 962), (1016, 962)], fill=(212, 175, 55, 110), width=1)
draw.text((64, 976), data["footerLeft"][:60], font=f_footer, fill=(252, 246, 186, 255))
draw.text((64, 1002), data["footerSub"][:76], font=f_footer_sub, fill=(180, 180, 190, 255))
draw.rounded_rectangle([760, 976, 1020, 1022], radius=20, fill=(212, 175, 55, 255))
draw.text((778, 990), data["footerPill"][:24], font=f_badge, fill=(10, 10, 10, 255))

final_img = Image.alpha_composite(base, overlay).convert("RGB")
final_img.save(data["outputImagePath"], "JPEG", quality=92)
`;

  try {
    execFileSync("python3", ["-c", pyScript, JSON.stringify(params)], {
      stdio: "ignore",
      timeout: 8000
    });
    return fs.existsSync(params.outputImagePath);
  } catch (err: any) {
    console.warn("[CREATIVE-STUDIO] Pillow composition warning:", err?.message);
    return false;
  }
}

/**
 * 🎨 MOTOR A: Genera una Portada Editorial e Infográfica 1:1 (1080x1080) ÚNICA para cada publicación diaria del Canal.
 * Combina el Canon Sagrado de JanIA (cabello negro azabache) con la paleta institucional (#0A0A0A y #D4AF37),
 * el titular exacto del día, la fecha de edición y los puntos clave del tema.
 */
export async function generateDailyChannelEditorialImage(options: {
  dayOfMonth: number;
  dateBogota: string;
  topicTitle: string;
  themeKey: string;
  captionText: string;
}): Promise<string> {
  const { dayOfMonth, dateBogota, topicTitle, themeKey, captionText } = options;
  const baseImagePath = resolveSacredCanonBaseImagePath(themeKey, dayOfMonth);

  const badgeLabel = resolveThemeBadgeLabel(themeKey);
  const titleLines = wrapLines(topicTitle || "Estrategia Inmobiliaria de Alto Valor", 34, 2);
  const bullets = extractKeyBulletsFromCaption(captionText);

  try {
    const outDir = path.resolve(process.cwd(), "client/public/assets/broadcast");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const safeTheme = (themeKey || "general").replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
    const outFile = path.join(outDir, `editorial_canal_${dateBogota}_dia_${dayOfMonth}_${safeTheme}.jpg`);

    const ok = renderEditorialImageWithPillow({
      inputImagePath: baseImagePath,
      outputImagePath: outFile,
      topSubheader: `CANAL OFICIAL • EDICIÓN DÍA ${dayOfMonth} (${dateBogota})`,
      badgeLabel,
      headlineLines: titleLines,
      bullets,
      footerLeft: "JANIA — BRÓKER INTELIGENTE IA (+57 319 291 9978)",
      footerSub: "Avalúos ACM • Estudio de Títulos • Minutas PDF • Flyers IA • Matching 40/20/40",
      footerPill: "BRÓKER +57 316 656 9719"
    });

    if (ok && fs.existsSync(outFile)) {
      return outFile;
    }
    fs.copyFileSync(baseImagePath, outFile);
    return outFile;
  } catch (err: any) {
    console.warn("[CREATIVE-STUDIO] Error generando portada editorial dinámica, usando canon base:", err?.message);
    return baseImagePath;
  }
}

/**
 * 🎨 MOTOR B: Crea Imágenes Personalizadas por Prompt para Usuarios en WhatsApp
 * (Flyers de Inmuebles, Banners, Posts para Redes, Infografías o Arte Inmobiliario).
 */
export async function generateCustomUserCreativeImage(
  input: UserCreativeImageInput
): Promise<GeneratedCreativeImageResult> {
  const rawPrompt =
    input.userPrompt ||
    input.title ||
    input.headline ||
    "Inmueble de lujo y alta valorización en Colombia";
  const requestedType = (input.assetType || input.tipoPieza || "") as CreativeAssetType;
  const assetType: CreativeAssetType = requestedType || detectCreativeAssetType(rawPrompt);
  const cleanPrompt = stripEmojisAndMarkdown(rawPrompt);

  const officePath = path.resolve(
    process.cwd(),
    "client/public/assets/channel_1x1/vecy_oficina_institucional.jpg"
  );
  const wantsJania =
    Boolean(input.includeJaniaAvatar) || /\b(jania|avatar|asesora|ejecutiva)\b/i.test(cleanPrompt);
  const basePath = wantsJania
    ? resolveSacredCanonBaseImagePath(cleanPrompt)
    : fs.existsSync(officePath)
      ? officePath
      : resolveSacredCanonBaseImagePath(cleanPrompt);

  const badgeMap: Record<CreativeAssetType, string> = {
    flyer_inmueble: "FLYER INMOBILIARIO DE ÉLITE",
    banner_comercial: "BANNER COMERCIAL INMOBILIARIO",
    banner_promocional: "BANNER COMERCIAL INMOBILIARIO",
    post_redes: "POST OFICIAL PARA REDES SOCIALES",
    infografia: "INFOGRAFÍA INMOBILIARIA EJECUTIVA",
    infografia_inmobiliaria: "INFOGRAFÍA INMOBILIARIA EJECUTIVA",
    arte_libre: "DISEÑO EXCLUSIVO • ESTUDIO CREATIVO JANIA"
  };

  const badgeText = badgeMap[assetType] || "ESTUDIO CREATIVO IA • VECY BIENES RAÍCES";
  const headlineText =
    input.headline?.trim() ||
    input.title?.trim() ||
    extractHeadlineFromUserPrompt(cleanPrompt, assetType);
  const subheadlineText =
    input.subheadline?.trim() ||
    input.subtitle?.trim() ||
    input.ubicacion?.trim() ||
    input.locationOrZone?.trim() ||
    "Diseño profesional generado por JanIA — VECY BIENES RAÍCES";
  const priceHighlight =
    input.priceOrHighlight?.trim() ||
    input.priceOrValue?.trim() ||
    input.price?.trim() ||
    extractPriceOrAreaHighlight(cleanPrompt);

  const customBullets = input.bulletPoints || input.specs || input.puntosClave;
  const bullets =
    customBullets && customBullets.length > 0
      ? customBullets.slice(0, 4)
      : extractBulletsFromUserPrompt(cleanPrompt);

  const contactFooter =
    input.contactInfo?.trim() ||
    input.contactPhone?.trim() ||
    "Informes y Citas • VECY BIENES RAÍCES • +57 316 656 9719";

  const headlineLines = wrapLines(headlineText, 30, 2);

  const outDir = path.resolve(process.cwd(), "client/public/assets/broadcast");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const fileName = `jania_creativo_${assetType}_${Date.now()}.jpg`;
  const filePath = path.join(outDir, fileName);

  const ok = renderEditorialImageWithPillow({
    inputImagePath: basePath,
    outputImagePath: filePath,
    topSubheader: subheadlineText.toUpperCase(),
    badgeLabel: badgeText,
    headlineLines,
    bullets: bullets.map(b => stripEmojisAndMarkdown(b)),
    priceHighlight,
    footerLeft: stripEmojisAndMarkdown(contactFooter),
    footerSub: "ESTUDIO CREATIVO IA DE JANIA • VECY BIENES RAÍCES",
    footerPill: "WA +57 319 291 9978"
  });

  if (!ok || !fs.existsSync(filePath)) {
    fs.copyFileSync(basePath, filePath);
  }

  const finalBuffer = fs.readFileSync(filePath);

  const caption =
    `🎨 *ESTUDIO CREATIVO IA DE JANIA — PIEZA LISTA*\n\n` +
    `📌 *Formato:* ${badgeText}\n` +
    `✨ *Titular:* ${headlineText}\n` +
    (priceHighlight ? `💎 *Destacado:* ${priceHighlight}\n` : "") +
    `\nAquí tienes tu diseño en alta definición (1080x1080 px) con acabados ejecutivos listo para publicar o compartir con tus clientes. Si deseas ajustar algún texto, precio o teléfono de contacto, dímelo y lo actualizo al instante. 👩🏻‍💼✨`;

  return {
    buffer: finalBuffer,
    imageBuffer: finalBuffer,
    filePath,
    fileName,
    caption,
    assetType
  };
}

export function detectCreativeAssetType(text: string): CreativeAssetType {
  const lower = (text || "").toLowerCase();
  if (/\b(infograf[ií]a|pasos|comparativa|resumen\s+visual|gu[ií]a\s+visual)\b/.test(lower)) {
    return "infografia";
  }
  if (/\b(banner|portada|encabezado|header)\b/.test(lower)) {
    return "banner_comercial";
  }
  if (/\b(post|instagram|redes|carrusel|publicaci[oó]n)\b/.test(lower)) {
    return "post_redes";
  }
  if (
    /\b(flyer|flayer|volante|afiche|ficha\s+visual|vendo|arriendo|apartamento|casa|lote|local|bodega|oficina|inmueble)\b/.test(
      lower
    )
  ) {
    return "flyer_inmueble";
  }
  return "arte_libre";
}

export function isExplicitCreativeImageRequest(text: string): boolean {
  const lower = (text || "").toLowerCase();
  const hasActionVerb =
    /\b(crea|cr[eé]ame|dise[ñn]a|dis[eé][ñn]ame|genera|gen[eé]rame|hazme|hacer|elabora|elab[oó]rame|arma|ármame)\b/.test(
      lower
    );
  const hasVisualNoun =
    /\b(imagen|flyer|flayer|banner|post|infograf[ií]a|afiche|pieza\s+gr[aá]fica|arte\s+publicitario)\b/.test(
      lower
    );
  return hasActionVerb && hasVisualNoun;
}

function extractHeadlineFromUserPrompt(prompt: string, assetType: CreativeAssetType): string {
  const cleaned = prompt
    .replace(
      /^.*?\b(?:crea|créame|diseña|diséñame|genera|genérame|hazme|elabora|elabórame)\s+(?:una?\s+)?(?:imagen|flyer|flayer|banner|post|infograf[ií]a|afiche)\s*(?:para|sobre|de|con)?\s*/i,
      ""
    )
    .trim();

  if (!cleaned) {
    return assetType === "infografia" || assetType === "infografia_inmobiliaria"
      ? "Claves Estratégicas de Inversión Inmobiliaria"
      : "Propiedad Destacada de Alta Valorización";
  }

  const firstClause = cleaned.split(/[.;|\n]/)[0].trim();
  return firstClause.length > 58 ? firstClause.slice(0, 55).trim() + "…" : firstClause;
}

function extractPriceOrAreaHighlight(prompt: string): string {
  const priceMatch = prompt.match(/\$\s?\d[\d.,]*\s*(?:millones|mm|m|mil\s+millones|cop)?/i);
  const areaMatch = prompt.match(/\b\d{2,5}\s*(?:m2|m²|metros|mts)\b/i);
  if (priceMatch && areaMatch) {
    return `${priceMatch[0].trim()} • ${areaMatch[0].trim()}`;
  }
  if (priceMatch) return priceMatch[0].trim();
  if (areaMatch) return areaMatch[0].trim();
  return "";
}

function extractBulletsFromUserPrompt(prompt: string): string[] {
  const parts = prompt
    .split(/[,;\n•]+/)
    .map(p => p.trim())
    .filter(p => p.length >= 6);

  if (parts.length >= 2) {
    return parts.slice(0, 3);
  }
  return [
    "Ubicación estratégica y excelente distribución arquitectónica",
    "Documentación verificada y acompañamiento integral de cierre",
    "Agenda tu visita privada con respaldo profesional"
  ];
}
