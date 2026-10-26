import fs from "fs";
import path from "path";

export interface FounderTeaching {
  id: string;
  founderName: "Eduardo Rivera" | "Jani Alves" | "Dirección VECY";
  phoneOrJid: string;
  rawText: string;
  topic: string;
  directive: string;
  createdAt: string;
  active: boolean;
}

const TEACHINGS_FILE = path.resolve(process.cwd(), "data/jania_founder_teachings.json");

let memoryTeachings: FounderTeaching[] = [];
let isLoaded = false;

// Directivas doctrinales maestras fundacionales aportadas por Eduardo A. Rivera
const SEED_TEACHINGS: FounderTeaching[] = [
  {
    id: "seed-match-402040",
    founderName: "Eduardo Rivera",
    phoneOrJid: "+573192919978",
    topic: "Modelo Colaborativo 40/20/40 y Cero Falsas Ilusiones en MATCH",
    directive:
      "Explica con total sinceridad y transparencia el funcionamiento del MATCH. No ilusiones al cliente: para activar el cruce de puntas y la mediación, primero deben aceptar trabajar bajo la figura de alianza colaborativa 40/20/40. El 40% de la comisión es para quien aporta la DEMANDA o la OFERTA según lo que tenga, el 40% para la contraparte, y el 20% para VECY por la coordinación en la mesa de MATCH, peritaje, seguridad jurídica y acompañamiento hasta el cierre.",
    rawText: "JanIA debe explicar que primero deben aceptar que lo trabajaremos en esa figura de trabajo y compartición de la comisión 40/20/40, donde el 40% será para ti que tienes la demanda o la oferta según lo que tengas, y no ilusionarlos.",
    createdAt: "2026-10-25T22:50:00.000Z",
    active: true
  },
  {
    id: "seed-ficha-exhaustiva-360",
    founderName: "Eduardo Rivera",
    phoneOrJid: "+573192919978",
    topic: "Auditoría e Indagación de Ficha Técnica Exhaustiva 360°",
    directive:
      "Intenta en lo posible que las fichas de inmuebles o requerimientos queden ultra completas con detalles reales y no con datos básicos. Indaga con astucia y calidez con ejemplos: si es Búsqueda o Inmueble; exterior o interior; iluminación y si le da el sol (mañana/tarde); cocina abierta, cerrada o tipo americano; lavandería independiente; cuarto y baño de servicio; balcón o terraza; chimenea; nivel de piso (bajo, medio o alto); parqueaderos independientes (no en línea) y cuántos requiere; depósito; ascensor; amenidades (gimnasio, piscina, zonas verdes, club house); vigilancia 24/7 presencial o automatizada; barrio exacto, localidad y ciudad, o cuadrante (entre qué calles y carreras); y si es sobre avenida o vía residencial tranquila por ruido.",
    rawText: "JanIA debe intentar en lo posible de que esa ficha quede muy completa y no con datos tan básicos: exterior/interior, sol, cocina americana, lavandería independiente, cuarto servicio, balcón, terraza, chimenea, piso bajo/medio/alto, parqueaderos independientes, depósito, ascensor, amenidades, vigilancia, entre qué calles y carreras, sobre avenida o no.",
    createdAt: "2026-10-25T22:50:00.000Z",
    active: true
  },
  {
    id: "seed-entrega-codigos-match",
    founderName: "Eduardo Rivera",
    phoneOrJid: "+573192919978",
    topic: "Protocolo de Entrega de Códigos MATCH (#M...) y Canalización a Mesa VECY",
    directive:
      "Al detectar coincidencias, JanIA entrega únicamente los códigos oficiales de MATCH (#M...) con este tono cálido y empático: '¡Tenemos coincidencia en la red! Encontramos opciones con los códigos #M... Pero solamente te puedo dar los códigos MATCH ya que con estos debes comunicarte con nuestro equipo al 3166569719 y se los vas a pasar a quien te conteste diciéndole que Yo JanIA te los di para que ellos empiecen a hacer la gestión de conectar las puntas y lograr una visita y posteriormente el cierre del negocio.'",
    rawText: "Cambiar el mensaje de match por: solamente te puedo dar los códigos MATCH ya que con estos debes comunicarte con nuestro equipo al 3166569719 y se los vas a pasar a quien te conteste diciéndole que Yo JanIA te los di para que ellos empiecen a hacer la gestión de conectar las puntas y lograr una visita y posteriormente el cierre.",
    createdAt: "2026-10-25T22:50:00.000Z",
    active: true
  },
  {
    id: "seed-fuente-inventario-emojis",
    founderName: "Eduardo Rivera",
    phoneOrJid: "+573192919978",
    topic: "Transparencia de Base de Datos Viva y Emojis en Grupos (👍 Oferta / 📝 Demanda)",
    directive:
      "Cuando pregunten de dónde saca el inventario o cómo arma su base de datos, sé clara y enfática: esta información de OFERTAS y DEMANDAS se toma a diario y minuto a minuto de las publicaciones que postean todos los miembros en los grupos de WhatsApp donde JanIA participa como invitada oficial (además de portales aliados y captaciones directas). Explica cómo los marca en vivo: reacciona con 👍 (pulgar arriba) para las OFERTAS de inmuebles y con 📝 (bloc de notas) para las DEMANDAS y requerimientos de clientes.",
    rawText: "Explicar que la base de datos de ofertas y demandas se toma a diario y minuto a minuto de las publicaciones en grupos donde JanIA está invitada y cómo los marca: 👍 oferta y 📝 demanda.",
    createdAt: "2026-10-25T22:50:00.000Z",
    active: true
  },
  {
    id: "seed-guia-paso-a-paso-resenas",
    founderName: "Eduardo Rivera",
    phoneOrJid: "+573192919978",
    topic: "Humanización al pedir Calificación en Google con Ofrecimiento de Guía Paso a Paso",
    directive:
      "Al pedir la reseña y calificación de 5 estrellas en Google (o sitio web), agrega siempre con calidez humana que si el usuario desea, tú con el mayor gusto le explicas el paso a paso detallado de cómo hacerlo por si no lo sabe hacer.",
    rawText: "Que al final de cuando pide el comentario y la calificación agregue que si quiere les explica el paso a paso de cómo hacerlo por si no lo saben hacer.",
    createdAt: "2026-10-25T22:50:00.000Z",
    active: true
  }
];

function ensureLoaded(): void {
  if (isLoaded) return;
  isLoaded = true;

  try {
    if (fs.existsSync(TEACHINGS_FILE)) {
      const content = fs.readFileSync(TEACHINGS_FILE, "utf-8");
      const list: FounderTeaching[] = JSON.parse(content);
      if (Array.isArray(list) && list.length > 0) {
        memoryTeachings = list;
        return;
      }
    }
  } catch (err: any) {
    console.warn("[founderKnowledgeService] Error cargando archivo de tips:", err?.message);
  }

  // Si no existe o está vacío, inicializar con las semillas maestras
  memoryTeachings = [...SEED_TEACHINGS];
  persistToDisk();
}

function persistToDisk(): void {
  try {
    const dir = path.dirname(TEACHINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TEACHINGS_FILE, JSON.stringify(memoryTeachings, null, 2), "utf-8");
  } catch (err: any) {
    console.warn("[founderKnowledgeService] Error persistiendo tips a disco:", err?.message);
  }
}

/**
 * Detecta si el mensaje enviado por un fundador (Eduardo o Jani) es una instrucción de enseñanza o tip para JanIA.
 */
export function isFounderTeachingInstruction(text: string): boolean {
  if (!text) return false;
  const clean = text.trim().toLowerCase();

  const triggers = [
    /^#?(?:tip|doctrina|aprender|ense[ñn]anza|regla|directiva)\b/i,
    /(?:ten en cuenta|aprende esto|quiero que cuando|ten presente que|a partir de ahora|cuando te pregunten|recuerda que debes|ens[eé][ñn]ame|te ense[ñn]o|anota esto|guarda esto)/i,
    /(?:debes explicar que|explica siempre que|a partir de hoy|cuando alguien pregunte|no olvides que|instrucci[oó]n:)/i
  ];

  return triggers.some(rgx => rgx.test(clean));
}

/**
 * Extrae y guarda una nueva directiva o tip enseñado por Eduardo o Jani.
 */
export async function saveFounderTeaching(
  phoneOrJid: string,
  rawText: string,
  customFounderName?: "Eduardo Rivera" | "Jani Alves" | "Dirección VECY"
): Promise<FounderTeaching> {
  ensureLoaded();

  let founderName: "Eduardo Rivera" | "Jani Alves" | "Dirección VECY" =
    customFounderName ||
    (phoneOrJid.includes("3188096811")
      ? "Jani Alves"
      : phoneOrJid.includes("3192919978") || phoneOrJid.includes("3118536968")
      ? "Eduardo Rivera"
      : "Dirección VECY");

  // Identificar el tema preliminar
  let topic = "Directiva en Caliente de la Dirección";
  const firstLine = rawText.split("\n")[0].replace(/^#?(?:tip|doctrina|aprender|ense[ñn]anza):\s*/i, "").trim();
  if (firstLine.length > 5 && firstLine.length < 80) {
    topic = firstLine;
  }

  const newTeaching: FounderTeaching = {
    id: `founder-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    founderName,
    phoneOrJid,
    rawText: rawText.trim(),
    topic,
    directive: rawText.trim(),
    createdAt: new Date().toISOString(),
    active: true
  };

  memoryTeachings.unshift(newTeaching);
  persistToDisk();
  return newTeaching;
}

/**
 * Retorna todas las directivas y tips activos de los fundadores.
 */
export function getAllActiveFounderTeachings(): FounderTeaching[] {
  ensureLoaded();
  return memoryTeachings.filter(t => t.active);
}

/**
 * Da formato a los tips para ser inyectados dinámicamente en los prompts de JanIA.
 */
export function formatFounderTeachingsForPrompt(): string {
  ensureLoaded();
  const active = getAllActiveFounderTeachings();
  if (active.length === 0) return "";

  let promptBlock =
    `===================================================\n` +
    `DIRECTIVAS Y TIPS VIVOS DE LOS FUNDADORES (EDUARDO RIVERA & JANI ALVES):\n` +
    `===================================================\n` +
    `Estas directivas fueron enseñadas directamente por nuestros directores fundadores y tienen jerarquía cognitiva máxima en tu comportamiento:\n\n`;

  active.forEach((t, idx) => {
    promptBlock += `${idx + 1}. [${t.founderName.toUpperCase()}] — *${t.topic}*:\n   "${t.directive}"\n\n`;
  });

  return promptBlock;
}

/**
 * Permite desactivar una directiva si fuese necesario.
 */
export function toggleFounderTeaching(id: string, active: boolean): boolean {
  ensureLoaded();
  const item = memoryTeachings.find(t => t.id === id);
  if (!item) return false;
  item.active = active;
  persistToDisk();
  return true;
}
