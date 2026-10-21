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
  { pattern: /^lina\s+mar[ií]a\b/i, canonical: "Lina María" },
  { pattern: /^lina\s+marcela\b/i, canonical: "Lina Marcela" },
  { pattern: /^jenny\s+paola\b/i, canonical: "Jenny Paola" },
  { pattern: /^yenny\s+paola\b/i, canonical: "Yenny Paola" },
  { pattern: /^mar[ií]a\s+clara\b/i, canonical: "María Clara" },
  { pattern: /^mar[ií]a\s+cecilia\b/i, canonical: "María Cecilia" },
  { pattern: /^mar[ií]a\s+adelaida\b/i, canonical: "María Adelaida" },
  { pattern: /^andrea\s+del\s+pilar\b/i, canonical: "Andrea del Pilar" },
  { pattern: /^carmen\s+rosa\b/i, canonical: "Carmen Rosa" },
  { pattern: /^rosa\s+elena\b/i, canonical: "Rosa Elena" },
  { pattern: /^diana\s+paola\b/i, canonical: "Diana Paola" },
  { pattern: /^sandra\s+paola\b/i, canonical: "Sandra Paola" },
  { pattern: /^claudia\s+viviana\b/i, canonical: "Claudia Viviana" },
  { pattern: /^gloria\s+amparo\b/i, canonical: "Gloria Amparo" },
  { pattern: /^martha\s+elena\b/i, canonical: "Martha Elena" },

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
  { pattern: /^jos[eé]\s+vicente\b/i, canonical: "José Vicente" },
  { pattern: /^diego\s+fernando\b/i, canonical: "Diego Fernando" },
  { pattern: /^andr[eé]s\s+felipe\b/i, canonical: "Andrés Felipe" },
  { pattern: /^v[ií]ctor\s+manuel\b/i, canonical: "Víctor Manuel" },
  { pattern: /^v[ií]ctor\s+hugo\b/i, canonical: "Víctor Hugo" },
  { pattern: /^jorge\s+enrique\b/i, canonical: "Jorge Enrique" },
  { pattern: /^jorge\s+iv[aá]n\b/i, canonical: "Jorge Iván" },
  { pattern: /^jorge\s+eli[eé]cer\b/i, canonical: "Jorge Eliécer" },
  { pattern: /^nelson\s+enrique\b/i, canonical: "Nelson Enrique" },
  { pattern: /^gustavo\s+adolfo\b/i, canonical: "Gustavo Adolfo" },
  { pattern: /^h[eé]ctor\s+fabio\b/i, canonical: "Héctor Fabio" },
  { pattern: /^fabio\s+nelson\b/i, canonical: "Fabio Nelson" },
  { pattern: /^javier\s+orlando\b/i, canonical: "Javier Orlando" },
  { pattern: /^c[eé]sar\s+augusto\b/i, canonical: "César Augusto" },
  { pattern: /^julio\s+c[eé]sar\b/i, canonical: "Julio César" },
  { pattern: /^mario\s+fernando\b/i, canonical: "Mario Fernando" },
  { pattern: /^edgar\s+eduardo\b/i, canonical: "Edgar Eduardo" },
  { pattern: /^camilo\s+andr[eé]s\b/i, canonical: "Camilo Andrés" },
  { pattern: /^felipe\s+andr[eé]s\b/i, canonical: "Felipe Andrés" },
  { pattern: /^santiago\s+andr[eé]s\b/i, canonical: "Santiago Andrés" },
  { pattern: /^daniel\s+felipe\b/i, canonical: "Daniel Felipe" }
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
 * Detecta si el nombre contiene un nombre compuesto canónico colombiano (ej: "Ana María", "Juan José", "María Fernanda", "José Manuel", "Olga Lucía")
 */
export function getCanonicalCompositeName(rawName: string): string | null {
  const cleaned = cleanRawUserName(rawName);
  const unaccented = cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const comp of COMPOSITE_PATTERNS) {
    if (comp.pattern.test(cleaned) || comp.pattern.test(unaccented)) {
      return comp.canonical;
    }
  }
  return null;
}

/**
 * Extrae un nombre propio presentado orgánicamente por el usuario en el mensaje de chat
 * (ej: "Hola, soy María Cristina", "me llamo Juan Carlos", "mi nombre es Ana Sofía", "hablas con Nelson Enrique")
 */
export function extractIntroducedName(text: string): string | null {
  if (!text) return null;
  const match = text.match(
    /(?:^|[.!?¡¿\n,]\s*)(?:¡?hola!?,?\s*)?(?:soy|me\s+llamo|mi\s+nombre\s+es|hablas?\s+con|por\s+ac[aá]\s+te\s+habla|aqu[ií]\s+habla)\s+([A-Za-záéíóúÁÉÍÓÚñÑ]+(?:\s+[A-Za-záéíóúÁÉÍÓÚñÑ]+){0,2})/i
  );
  if (match && match[1]) {
    const rawCandidate = match[1].trim();
    const candidateParts = rawCandidate.split(/\s+/).filter(Boolean);
    const INVALID = new Set([
      "un", "una", "el", "la", "asesor", "asesora", "agente", "cliente", "inmobiliaria", "broker",
      "propietario", "propietaria", "comprador", "compradora", "arrendatario", "arrendataria",
      "abogado", "abogada", "perito", "desconocido", "alguien"
    ]);
    if (candidateParts.length > 0 && !INVALID.has(candidateParts[0].toLowerCase())) {
      const canonicalComp = getCanonicalCompositeName(rawCandidate);
      if (canonicalComp) return canonicalComp;
      if (candidateParts.length >= 2) {
        return `${candidateParts[0].charAt(0).toUpperCase() + candidateParts[0].slice(1).toLowerCase()} ${candidateParts[1].charAt(0).toUpperCase() + candidateParts[1].slice(1).toLowerCase()}`;
      }
      return candidateParts[0].charAt(0).toUpperCase() + candidateParts[0].slice(1).toLowerCase();
    }
  }
  return null;
}

/**
 * Resuelve el nombre canónico y género exacto con alta inteligencia y empatía humana
 */
export function resolveNameAndGender(rawName: string, timeGreeting?: string): NameAndGenderResult {
  const cleaned = cleanRawUserName(rawName);
  const normalizedLower = cleaned.toLowerCase();

  // 1. Detectar si coincide con un nombre compuesto conocido
  let resolvedDisplayName = getCanonicalCompositeName(cleaned) || "";

  // Si no es compuesto clásico de la lista estática, analizar si son dos nombres propios
  if (!resolvedDisplayName) {
    let parts = cleaned.split(/\s+/).filter(Boolean);
    const genericPrefixes = ["inmobiliaria", "inmobiliario", "bienes", "raices", "raíces", "asesor", "asesora", "grupo", "propiedades", "finca", "ventas", "arriendos", "construcciones", "constructora", "consultores"];
    const professionalTitles = new Set([
      "agente", "asesor", "asesora", "broker", "inmobiliaria", "inmobiliario", "independiente",
      "consultor", "consultora", "abogado", "abogada", "arquitecto", "arquitecta", "director",
      "directora", "gerente", "perito", "valuador", "tasador", "colombia", "bogota", "bogotá",
      "medellin", "medellín", "cali", "ventas", "arriendos", "finca", "propiedades", "red", "vecy"
    ]);

    // Si empieza con título profesional o saludo (ej: "Agente Karina", "Asesor Carlos", "Hola"):
    if (parts.length > 1 && (professionalTitles.has(parts[0].toLowerCase()) || ["hola", "buenas", "buenos"].includes(parts[0].toLowerCase()))) {
      parts = parts.slice(1);
    }

    const isGenericBusiness = parts.length > 0 && genericPrefixes.includes(parts[0].toLowerCase()) && parts.length === 1;

    if (isGenericBusiness) {
      resolvedDisplayName = cleaned;
    } else if (parts.length >= 2 && (parts[0].length <= 5 || ["de", "del", "la", "san", "santa"].includes(parts[0].toLowerCase())) && !professionalTitles.has(parts[1].toLowerCase())) {
      // Casos como "Maria Claudia", "Ana Maria", "Luz Dary", "Juan Diego", "Luis Fer"
      resolvedDisplayName = `${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)} ${parts[1].charAt(0).toUpperCase() + parts[1].slice(1)}`;
    } else if (parts.length >= 2 && parts[0].length >= 3 && parts[1].length >= 3 && !parts[1].toLowerCase().includes("inmob") && !parts[1].toLowerCase().includes("prop") && !professionalTitles.has(parts[1].toLowerCase())) {
      // Si tiene dos nombres personales claros (ej. Nelson Enrique, Gustavo Adolfo)
      resolvedDisplayName = `${parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase()} ${parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase()}`;
    } else if (parts.length > 0 && !["hola", "buenas", "buenos", "asesor", "asesora", "agente", "desconocido"].includes(parts[0].toLowerCase())) {
      resolvedDisplayName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    } else {
      resolvedDisplayName = "colega";
    }
  }

  // 2. Extraer primer token real para análisis de género
  const nameTokens = resolvedDisplayName.split(/\s+/).filter(Boolean);
  const firstWordClean = (nameTokens[0] || "").toLowerCase().replace(/[^a-záéíóúüñ]/g, "");

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
 * Horario Comercial Oficial de Vecy Bienes Raíces (Atención Bróker)
 */
export const VECY_COMMERCIAL_INFO = {
  name: "Vecy Bienes Raíces",
  type: "Bróker inmobiliario 100% digital 🌍✨",
  services: "Estudios de mercado m² y canon sugerido ⚡ | Consultoría jurídica y tributaria ⚖️ | Manejo de cobranzas 💼 | Marketing con IA y fotografía 🤖📸 | Contratos digitales 📄",
  phone: "3166569719",
  schedule: {
    weekdays: "Lunes a Viernes de 8:00 AM a 10:00 PM (08:00 - 22:00)",
    saturday: "Sábados de 8:00 AM a 8:00 PM (08:00 - 20:00)",
    sunday: "Domingos de 10:00 AM a 4:00 PM (10:00 - 16:00)"
  }
};
