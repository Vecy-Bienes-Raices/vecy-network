/**
 * Motor Maestro de Resolución de Nombres Compuestos, Detección de Género y Cortesía
 * VECY Network — v26.0
 */

// 1. Diccionario Maestro de Nombres Compuestos en Colombia
const COMPOSITE_PATTERNS: Array<{ pattern: RegExp; canonical: string }> = [
  // Femeninos
  { pattern: /^ana\s+mar[ií]a\b/i, canonical: "Ana María" },
  { pattern: /^ana\s+sof[ií]a\b/i, canonical: "Ana Sofía" },
  { pattern: /^ana\s+luc[ií]a\b/i, canonical: "Ana Lucía" },
  { pattern: /^ana\s+isabel\b/i, canonical: "Ana Isabel" },
  { pattern: /^ana\s+milena\b/i, canonical: "Ana Milena" },
  { pattern: /^ana\s+patricia\b/i, canonical: "Ana Patricia" },
  { pattern: /^ana\s+carolina\b/i, canonical: "Ana Carolina" },
  { pattern: /^ana\s+victoria\b/i, canonical: "Ana Victoria" },
  { pattern: /^mar[ií]a\s+paula\b/i, canonical: "María Paula" },
  { pattern: /^mar[ií]a\s+cristina\b/i, canonical: "María Cristina" },
  { pattern: /^mar[ií]a\s+fernanda\b/i, canonical: "María Fernanda" },
  { pattern: /^mar[ií]a\s+jos[eé]\b/i, canonical: "María José" },
  { pattern: /^mar[ií]a\s+alejandra\b/i, canonical: "María Alejandra" },
  { pattern: /^mar[ií]a\s+camila\b/i, canonical: "María Camila" },
  { pattern: /^mar[ií]a\s+isabel\b/i, canonical: "María Isabel" },
  { pattern: /^mar[ií]a\s+teresa\b/i, canonical: "María Teresa" },
  { pattern: /^mar[ií]a\s+victoria\b/i, canonical: "María Victoria" },
  { pattern: /^mar[ií]a\s+del\s+carmen\b/i, canonical: "María del Carmen" },
  { pattern: /^mar[ií]a\s+del\s+pilar\b/i, canonical: "María del Pilar" },
  { pattern: /^mar[ií]a\s+elena\b/i, canonical: "María Elena" },
  { pattern: /^mar[ií]a\s+eugenia\b/i, canonical: "María Eugenia" },
  { pattern: /^mar[ií]a\s+in[eé]s\b/i, canonical: "María Inés" },
  { pattern: /^mar[ií]a\s+luc[ií]a\b/i, canonical: "María Lucía" },
  { pattern: /^mar[ií]a\s+mercedes\b/i, canonical: "María Mercedes" },
  { pattern: /^luz\s+marina\b/i, canonical: "Luz Marina" },
  { pattern: /^luz\s+mery\b/i, canonical: "Luz Mery" },
  { pattern: /^luz\s+dary\b/i, canonical: "Luz Dary" },
  { pattern: /^luz\s+stella\b/i, canonical: "Luz Stella" },
  { pattern: /^luz\s+helena\b/i, canonical: "Luz Helena" },
  { pattern: /^luz\s+adriana\b/i, canonical: "Luz Adriana" },
  { pattern: /^luz\s+amparo\b/i, canonical: "Luz Amparo" },
  { pattern: /^luz\s+[aá]ngela\b/i, canonical: "Luz Ángela" },
  { pattern: /^luz\s+myriam\b/i, canonical: "Luz Myriam" },
  { pattern: /^sandra\s+milena\b/i, canonical: "Sandra Milena" },
  { pattern: /^sandra\s+patricia\b/i, canonical: "Sandra Patricia" },
  { pattern: /^sandra\s+marcela\b/i, canonical: "Sandra Marcela" },
  { pattern: /^diana\s+marcela\b/i, canonical: "Diana Marcela" },
  { pattern: /^diana\s+patricia\b/i, canonical: "Diana Patricia" },
  { pattern: /^diana\s+carolina\b/i, canonical: "Diana Carolina" },
  { pattern: /^diana\s+cristina\b/i, canonical: "Diana Cristina" },
  { pattern: /^claudia\s+patricia\b/i, canonical: "Claudia Patricia" },
  { pattern: /^claudia\s+marcela\b/i, canonical: "Claudia Marcela" },
  { pattern: /^claudia\s+elena\b/i, canonical: "Claudia Elena" },
  { pattern: /^gloria\s+in[eé]s\b/i, canonical: "Gloria Inés" },
  { pattern: /^gloria\s+patricia\b/i, canonical: "Gloria Patricia" },
  { pattern: /^gloria\s+stella\b/i, canonical: "Gloria Stella" },
  { pattern: /^martha\s+cecilia\b/i, canonical: "Martha Cecilia" },
  { pattern: /^martha\s+luc[ií]a\b/i, canonical: "Martha Lucía" },
  { pattern: /^martha\s+patricia\b/i, canonical: "Martha Patricia" },
  { pattern: /^martha\s+isabel\b/i, canonical: "Martha Isabel" },
  { pattern: /^olga\s+luc[ií]a\b/i, canonical: "Olga Lucía" },
  { pattern: /^olga\s+patricia\b/i, canonical: "Olga Patricia" },
  { pattern: /^laura\s+camila\b/i, canonical: "Laura Camila" },
  { pattern: /^laura\s+sof[ií]a\b/i, canonical: "Laura Sofía" },
  { pattern: /^paola\s+andrea\b/i, canonical: "Paola Andrea" },
  { pattern: /^adriana\s+luc[ií]a\b/i, canonical: "Adriana Lucía" },

  // Masculinos
  { pattern: /^juan\s+pablo\b/i, canonical: "Juan Pablo" },
  { pattern: /^juan\s+david\b/i, canonical: "Juan David" },
  { pattern: /^juan\s+carlos\b/i, canonical: "Juan Carlos" },
  { pattern: /^juan\s+manuel\b/i, canonical: "Juan Manuel" },
  { pattern: /^juan\s+camilo\b/i, canonical: "Juan Camilo" },
  { pattern: /^juan\s+jos[eé]\b/i, canonical: "Juan José" },
  { pattern: /^juan\s+diego\b/i, canonical: "Juan Diego" },
  { pattern: /^juan\s+esteban\b/i, canonical: "Juan Esteban" },
  { pattern: /^juan\s+felipe\b/i, canonical: "Juan Felipe" },
  { pattern: /^juan\s+sebasti[aá]n\b/i, canonical: "Juan Sebastián" },
  { pattern: /^juan\s+fernando\b/i, canonical: "Juan Fernando" },
  { pattern: /^juan\s+andr[eé]s\b/i, canonical: "Juan Andrés" },
  { pattern: /^juan\s+antonio\b/i, canonical: "Juan Antonio" },
  { pattern: /^juan\s+ignacio\b/i, canonical: "Juan Ignacio" },
  { pattern: /^juan\s+guillermo\b/i, canonical: "Juan Guillermo" },
  { pattern: /^pedro\s+pablo\b/i, canonical: "Pedro Pablo" },
  { pattern: /^pedro\s+antonio\b/i, canonical: "Pedro Antonio" },
  { pattern: /^pedro\s+luis\b/i, canonical: "Pedro Luis" },
  { pattern: /^carlos\s+alberto\b/i, canonical: "Carlos Alberto" },
  { pattern: /^carlos\s+andr[eé]s\b/i, canonical: "Carlos Andrés" },
  { pattern: /^carlos\s+eduardo\b/i, canonical: "Carlos Eduardo" },
  { pattern: /^carlos\s+mario\b/i, canonical: "Carlos Mario" },
  { pattern: /^carlos\s+arturo\b/i, canonical: "Carlos Arturo" },
  { pattern: /^carlos\s+julio\b/i, canonical: "Carlos Julio" },
  { pattern: /^luis\s+carlos\b/i, canonical: "Luis Carlos" },
  { pattern: /^luis\s+fernando\b/i, canonical: "Luis Fernando" },
  { pattern: /^luis\s+eduardo\b/i, canonical: "Luis Eduardo" },
  { pattern: /^luis\s+alberto\b/i, canonical: "Luis Alberto" },
  { pattern: /^luis\s+miguel\b/i, canonical: "Luis Miguel" },
  { pattern: /^luis\s+felipe\b/i, canonical: "Luis Felipe" },
  { pattern: /^luis\s+gabriel\b/i, canonical: "Luis Gabriel" },
  { pattern: /^luis\s+guillermo\b/i, canonical: "Luis Guillermo" },
  { pattern: /^luis\s+alfonso\b/i, canonical: "Luis Alfonso" },
  { pattern: /^jos[eé]\s+luis\b/i, canonical: "José Luis" },
  { pattern: /^jos[eé]\s+antonio\b/i, canonical: "José Antonio" },
  { pattern: /^jos[eé]\s+manuel\b/i, canonical: "José Manuel" },
  { pattern: /^jos[eé]\s+gregorio\b/i, canonical: "José Gregorio" },
  { pattern: /^jos[eé]\s+ignacio\b/i, canonical: "José Ignacio" },
  { pattern: /^jos[eé]\s+vicente\b/i, canonical: "José Vicente" }
];

// 2. Diccionario de Nombres Femeninos Explícitos (incluyendo terminaciones no 'a' y anglo/franceses)
const FEMALE_EXPLICIT_NAMES = new Set([
  "jeannette", "jeanette", "janeth", "janet", "janette", "jeanine", "jenny", "jennifer", "jenn",
  "astrid", "elizabeth", "elisabet", "elisabeth", "pilar", "carmen", "mercedes", "luz", "beatriz",
  "ines", "inés", "consuelo", "rocio", "rocío", "nohora", "isabel", "raquel", "miriam", "myriam",
  "karen", "evelyn", "evelin", "gladys", "marlene", "marlen", "ivonne", "nicole", "michelle",
  "denisse", "denise", "angie", "kelly", "kelli", "shirley", "wendy", "carol", "caroline",
  "sharon", "dayana", "daiana", "vivian", "mabel", "mavy", "mary", "marie", "marion", "marian",
  "belen", "belén", "rosario", "amparo", "socorro", "concepcion", "concepción", "dolores",
  "mar", "montserrat", "guadalupe", "abigail", "esther", "ester", "ruth", "rut", "judith",
  "judit", "edith", "edit", "lilian", "karin", "alison", "allison", "mafe", "andrea", "tatiana",
  "daniela", "valentina", "sofia", "sofía", "camila", "mariana", "valeria", "gabriela", "natalia",
  "lucia", "lucía", "isabella", "ximena", "jimena", "catalina", "juliana", "laura", "paola",
  "diana", "claudia", "monica", "mónica", "sandra", "patricia", "gloria", "martha", "marta",
  "olga", "sonia", "adriana", "marcela", "carolina", "elena", "victoria", "teresa", "mercedes",
  "fabiola", "blanca", "esperanza", "dora", "yolanda", "lucero", "yamile", "leidys", "leidy",
  "yeimy", "yuliana", "yuri", "ingrid", "katherin", "katherine", "katherine", "stefany", "stephanie"
]);

// 3. Excepciones Masculinas que terminan en 'A'
const MALE_EXCEPTIONS_ENDING_IN_A = new Set([
  "luca", "borja", "joshua", "bautista", "sasha", "elias", "elías", "ezra", "tobias", "tobías",
  "matias", "matías", "jeremias", "jeremías", "isaias", "isaías", "jonas", "jonás", "nicolas",
  "nicolás", "tomas", "tomás", "lucas"
]);

export interface NameAndGenderResult {
  rawName: string;
  cleanName: string;
  displayName: string;
  firstName: string;
  isFemale: boolean;
  genderTerm: string;     // "estimada Jeannette" | "estimado Juan Pablo"
  courtesyWord: string;   // "estimada" | "estimado"
  greeting: string;       // "Buenas noches, estimada Jeannette 👋🏻"
}

/**
 * Limpia y normaliza el nombre de un usuario de WhatsApp
 */
export function cleanRawUserName(name: string): string {
  if (!name) return "";
  return name
    .replace(/^[~•\-\*\_\s]+/, "")
    .replace(/[~•\-\*\_\s]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resuelve el nombre canónico y género exacto con alta inteligencia y empatía humana
 */
export function resolveNameAndGender(rawName: string, timeGreeting?: string): NameAndGenderResult {
  const cleaned = cleanRawUserName(rawName);
  const normalizedLower = cleaned.toLowerCase();

  // 1. Detectar si coincide con un nombre compuesto conocido
  let resolvedDisplayName = "";
  for (const comp of COMPOSITE_PATTERNS) {
    if (comp.pattern.test(cleaned)) {
      resolvedDisplayName = comp.canonical;
      break;
    }
  }

  // Si no es compuesto clásico, tomar las primeras dos palabras si son cortas o la primera
  if (!resolvedDisplayName) {
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && (parts[0].length <= 4 || ["de", "del", "la", "san", "santa"].includes(parts[0].toLowerCase()))) {
      resolvedDisplayName = `${parts[0]} ${parts[1]}`;
    } else if (parts.length > 0) {
      resolvedDisplayName = parts[0];
    } else {
      resolvedDisplayName = "colega";
    }
  }

  // 2. Extraer primer token para análisis de género
  const firstWord = cleaned.split(/\s+/)[0]?.toLowerCase() || "";
  const firstWordClean = firstWord.replace(/[^a-záéíóúüñ]/g, "");

  // 3. Determinar género
  let isFemale = false;

  // A. Revisión en diccionario explícito femenino
  if (FEMALE_EXPLICIT_NAMES.has(firstWordClean) || FEMALE_EXPLICIT_NAMES.has(normalizedLower)) {
    isFemale = true;
  }
  // B. Regla morfológica: termina en 'a' y no es excepción masculina
  else if (firstWordClean.endsWith("a") && !MALE_EXCEPTIONS_ENDING_IN_A.has(firstWordClean)) {
    isFemale = true;
  }
  // C. Terminaciones femeninas anglo/francesas comunes (-ette, -eth, -bel, -riz, -fer, -lyn, -len, -nis)
  else if (
    firstWordClean.endsWith("ette") ||
    firstWordClean.endsWith("eth") ||
    firstWordClean.endsWith("bel") ||
    firstWordClean.endsWith("riz") ||
    firstWordClean.endsWith("lyn") ||
    firstWordClean.endsWith("len") ||
    firstWordClean.endsWith("ine") ||
    firstWordClean.endsWith("y") ||
    firstWordClean.endsWith("ie")
  ) {
    // Verificar si no es un nombre masculino obvio en -y (ej: Henry, Anthony, Freddy, Dany)
    const maleYExceptions = ["henry", "anthony", "freddy", "fredy", "dany", "danny", "geovanny", "giovanni", "johnny", "tony", "andy"];
    if (!maleYExceptions.includes(firstWordClean)) {
      isFemale = true;
    }
  }

  const courtesyWord = isFemale ? "estimada" : "estimado";
  const genderTerm = `${courtesyWord} ${resolvedDisplayName}`;
  const effectiveGreeting = timeGreeting || "Hola";
  const fullGreeting = `${effectiveGreeting}, ${genderTerm} 👋🏻`;

  return {
    rawName,
    cleanName: cleaned,
    displayName: resolvedDisplayName,
    firstName: firstWordClean,
    isFemale,
    genderTerm,
    courtesyWord,
    greeting: fullGreeting
  };
}

/**
 * Horario Comercial Oficial de Vecy Bienes Raíces
 */
export const VECY_COMMERCIAL_INFO = {
  name: "Vecy Bienes Raíces",
  type: "Bróker inmobiliario 100% digital 🌍✨",
  services: "Avalúos online ⚡ | Compra/venta 🏡 | Marketing con IA 🤖 | Contratos digitales 📄 | Préstamos hipotecarios",
  phone: "3166569719",
  schedule: {
    weekdays: "Lunes a Viernes de 8:00 AM a 10:00 PM (08:00 - 22:00)",
    saturday: "Sábados de 8:00 AM a 8:00 PM (08:00 - 20:00)",
    sunday: "Domingos de 10:00 AM a 4:00 PM (10:00 - 16:00)"
  }
};
