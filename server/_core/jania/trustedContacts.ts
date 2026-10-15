/**
 * Módulo de Agenda de Confianza, Círculo Familiar y Escudo Defensivo Anti-Cobranzas/Spam
 * VECY BIENES RAÍCES — JanIA Backend v33.08 (33.8.0)
 *
 * Registra y gestiona:
 * 1. Contactos de alta confianza y círculo familiar de Eduardo ("Eddu") y Jani.
 * 2. Reconocimiento por teléfono (E.164, 10 dígitos colombianos, LIDs de WhatsApp) y apodos de cariño.
 * 3. Regla de Oro familiar/amigos (canal oficial de JanIA + número bróker de Eduardo +57 316 656 9719).
 * 4. Escudo defensivo estricto contra casas de cobranza, bancos hostiles, cobro coactivo, estafas y spam financiero.
 */

export interface TrustedContact {
  id: string;
  fullName: string;
  relationship: string;
  phone: string; // Formato internacional ej. "+573108643555"
  digits: string; // Últimos 10 dígitos para matching colombiano ej. "3108643555"
  primaryNick: string; // Apodo de cariño principal
  allNicks: string[]; // Apodos alternativos o cariñosos
  category: "familia_directa" | "familia_extendida" | "amigos_y_especiales" | "directiva";
  specialNotes?: string;
  aliases?: string[];
  lids?: string[];
}

export const TRUSTED_CONTACTS: TrustedContact[] = [
  // ── FAMILIA DIRECTA ──
  {
    id: "carmenza_madre",
    fullName: "Carmenza Gómez",
    relationship: "Madre",
    phone: "+573108643555",
    digits: "3108643555",
    primaryNick: "Madrecita",
    allNicks: ["Madrecita", "Madrecita querida", "Mamita hermosa", "Mami", "Mamá", "Carmenza"],
    category: "familia_directa"
  },
  {
    id: "daniel_hijo",
    fullName: "Daniel Eduardo Rivera Noguera",
    relationship: "Hijo",
    phone: "+573006067089",
    digits: "3006067089",
    primaryNick: "Pollotote",
    allNicks: ["Amado hijo", "Pollotote", "Campeón", "Mi ingeniero favorito", "Daniel", "Dani"],
    category: "familia_directa"
  },
  {
    id: "natalia_hija",
    fullName: "Natalia Rivera Noguera",
    relationship: "Hija",
    phone: "+573058788329",
    digits: "3058788329",
    primaryNick: "Mi Natis",
    allNicks: [
      "Mi Natis",
      "Pollita hermosa",
      "Mi princesa",
      "Natillita",
      "Corazón de Melocotón",
      "Monacha Remolacha",
      "Natis",
      "Natalia"
    ],
    category: "familia_directa"
  },
  {
    id: "jani_esposa",
    fullName: "Jani Alves Souza",
    relationship: "Esposa / Directora de Operaciones",
    phone: "+573188096811",
    digits: "3188096811",
    primaryNick: "Jani",
    allNicks: ["Amor", "amorzote", "corazón amado", "vida hermosa", "mi consentida", "Jani", "Janita"],
    category: "directiva",
    aliases: ["3166569719"],
    lids: ["167108705018103", "182781141344345", "218820279050385"]
  },

  // ── TÍAS Y TÍOS ──
  {
    id: "olanda_tia",
    fullName: "Olanda Rivera",
    relationship: "Tía",
    phone: "+573138524917",
    digits: "3138524917",
    primaryNick: "Tía Olandita",
    allNicks: ["Tía Olandita", "Olandita", "Tía Olanda"],
    category: "familia_extendida"
  },
  {
    id: "ana_tulia_tia",
    fullName: "Ana Tulia Rivera",
    relationship: "Tía",
    phone: "+573124794864",
    digits: "3124794864",
    primaryNick: "Tía Tulita",
    allNicks: ["Tía Tulita", "Anita Tulita", "Tía Anita", "Ana Tulia"],
    category: "familia_extendida"
  },
  {
    id: "marina_tia",
    fullName: "Marina Rivera",
    relationship: "Tía",
    phone: "+573204997575",
    digits: "3204997575",
    primaryNick: "Tía Marinita",
    allNicks: ["Tía Marinita", "Marinita", "Tía Marina"],
    category: "familia_extendida"
  },
  {
    id: "luis_tio",
    fullName: "Luis Eduardo Rivera Gómez",
    relationship: "Tío",
    phone: "+573132094918",
    digits: "3132094918",
    primaryNick: "Tío Luis",
    allNicks: ["Tío Luis", "Tío Lucho", "Luis Eduardo"],
    category: "familia_extendida"
  },

  // ── PRIMOS ──
  {
    id: "monica_prima",
    fullName: "Mónica Martínez",
    relationship: "Prima",
    phone: "+573103395788",
    digits: "3103395788",
    primaryNick: "Monik",
    allNicks: ["Monik", "Chinita", "Mónica", "Prima Monik"],
    category: "familia_extendida"
  },
  {
    id: "liliana_prima",
    fullName: "Liliana Martínez",
    relationship: "Prima",
    phone: "+573132533474",
    digits: "3132533474",
    primaryNick: "Lili",
    allNicks: ["Lili", "Liliana", "Prima Lili"],
    category: "familia_extendida"
  },
  {
    id: "marcelita_prima",
    fullName: "Marcelita Castellanos",
    relationship: "Prima",
    phone: "+573144354412",
    digits: "3144354412",
    primaryNick: "Marcelita",
    allNicks: ["Marcelita", "Marce", "Prima Marcelita"],
    category: "familia_extendida"
  },
  {
    id: "carlitos_primo",
    fullName: "Carlos Martínez",
    relationship: "Primo",
    phone: "+573054589435",
    digits: "3054589435",
    primaryNick: "Cayaco",
    allNicks: ["Cayaco", "Carlitos", "Primo Carlitos"],
    category: "familia_extendida"
  },
  {
    id: "jackson_primo",
    fullName: "Jackson Martínez",
    relationship: "Primo",
    phone: "+573142721432",
    digits: "3142721432",
    primaryNick: "Jaton",
    allNicks: ["Jaton", "Jackson", "Primo Jackson"],
    category: "familia_extendida"
  },

  // ── AMIGOS Y CASOS ESPECIALES ──
  {
    id: "gus_amigo",
    fullName: "Gustavo (Gus)",
    relationship: "Amigo de Confianza",
    phone: "+573108096117",
    digits: "3108096117",
    primaryNick: "Gus",
    allNicks: ["Gus", "Gustavo"],
    category: "amigos_y_especiales"
  },
  {
    id: "lucho_taxi",
    fullName: "Lucho (Taxi)",
    relationship: "Amigo de Confianza",
    phone: "+573105772223",
    digits: "3105772223",
    primaryNick: "Lucho",
    allNicks: ["Lucho"],
    category: "amigos_y_especiales"
  },
  {
    id: "chalo_ruiz",
    fullName: "Andrés Ruiz (Chalo)",
    relationship: "Amigo de Confianza",
    phone: "+573005509529",
    digits: "3005509529",
    primaryNick: "Chalo",
    allNicks: ["Chalo", "Andrés", "Andresito"],
    category: "amigos_y_especiales",
    specialNotes: "Seguirle la corriente con la broma de Pablo Escobar / Gonzalo Rodríguez Gacha si bromea."
  },
  {
    id: "jonathan_martinez",
    fullName: "Jonathan Stiven Martínez Montaño",
    relationship: "Cliente Especial de Confianza",
    phone: "+573103790278",
    digits: "3103790278",
    primaryNick: "Jonathan",
    allNicks: ["Jonathan", "Jonathan Stiven"],
    category: "amigos_y_especiales",
    specialNotes: "Cliente de procesos de Datacrédito y TransUnion atendidos por Eduardo."
  },

  // ── FUNDADOR ──
  {
    id: "eduardo_fundador",
    fullName: "Eduardo Arturo Rivera Martínez",
    relationship: "Director de Tecnología / Fundador",
    phone: "+573192919978",
    digits: "3192919978",
    primaryNick: "Eduardo",
    allNicks: ["Eddu", "Eduardo", "Ingeniero", "Jefe"],
    category: "directiva",
    aliases: ["3166569719"],
    lids: ["225954035179724"]
  }
];

/**
 * Normaliza un identificador de WhatsApp (JID, LID o número telefónico) a dígitos planos
 */
export function normalizePhoneDigits(raw: string): string {
  if (!raw) return "";
  const clean = raw.split("@")[0].replace(/\D/g, "");
  // Si tiene código de país Colombia 57 al inicio y tiene 12 dígitos, extraer los 10 últimos
  if (clean.startsWith("57") && clean.length === 12) {
    return clean.substring(2);
  }
  // Si tiene más de 10 dígitos, tomar los últimos 10 (móvil colombiano típico: 3XXXXXXXXX)
  if (clean.length > 10) {
    const last10 = clean.slice(-10);
    if (last10.startsWith("3")) return last10;
  }
  return clean;
}

/**
 * Busca un contacto en la Agenda de Confianza por número de WhatsApp, LID o nombre
 */
export function findTrustedContact(userId: string, rawName?: string): TrustedContact | null {
  if (!userId && !rawName) return null;

  const userClean = (userId || "").toLowerCase();
  const digits = normalizePhoneDigits(userId);
  const nameClean = (rawName || "").toLowerCase().trim();

  for (const contact of TRUSTED_CONTACTS) {
    // 1. Coincidencia por dígitos telefónicos directos (10 dígitos)
    if (digits && contact.digits === digits) {
      return contact;
    }

    // 2. Coincidencia por userId que contenga el teléfono
    if (userClean.includes(contact.digits)) {
      return contact;
    }

    // 3. Coincidencia por LIDs conocidos
    if (contact.lids && contact.lids.some(lid => userClean.includes(lid))) {
      return contact;
    }

    // 4. Coincidencia por números alternativos
    if (contact.aliases && contact.aliases.some(alias => userClean.includes(alias))) {
      return contact;
    }

    // 5. Coincidencia secundaria por nombre solo ante apodos familiares exclusivos o nombre completo estricto
    // (Nunca por nombres comunes aislados como 'Andrés', 'Daniel', 'Carlos', etc.)
    if (nameClean && nameClean.length >= 5) {
      const contactLower = contact.fullName.toLowerCase();
      // Si el usuario tiene el nombre completo del familiar (ej: "Daniel Eduardo Rivera", "Carmenza Gómez")
      if (nameClean === contactLower || (nameClean.includes(contactLower) && contactLower.length >= 10)) {
        return contact;
      }
      // O si el nombre coincide con apodos inequívocos y exclusivos de la familia
      const EXCLUSIVE_NICKS = new Set([
        "madrecita", "madrecita querida", "mamita hermosa",
        "tía olandita", "tia olandita", "olandita",
        "tía tulita", "tia tulita", "anita tulita",
        "tía marinita", "tia marinita", "marinita",
        "pollotote", "mi natis", "pollita hermosa", "natillita",
        "corazón de melocotón", "monacha remolacha",
        "cayaco", "jaton"
      ]);
      for (const nick of contact.allNicks) {
        const nickLower = nick.toLowerCase();
        if (EXCLUSIVE_NICKS.has(nickLower) && (nameClean === nickLower || nameClean.includes(nickLower))) {
          return contact;
        }
      }
    }
  }

  return null;
}

/**
 * Genera el saludo de bienvenida familiar oficial según la Regla de Oro
 */
export function buildFamilyWarmWelcomeMessage(contact: TrustedContact): string {
  return (
    `¡Hola ${contact.primaryNick}! Qué alegría saludarte. Te cuento que esta línea ahora es mi canal oficial como JanIA, la Inteligencia Artificial de VECY BIENES RAÍCES 🤖✨. Como hoy es el cumpleaños de Eduardo (Eddu) o para cualquier asunto personal, te comparto su número directo y nuevo de bróker por si necesitas ubicarlo: +57 316 656 9719 (https://wa.me/573166569719). ¡Conmigo puedes dejarle recado o saludarlo cuando quieras!`
  );
}

/**
 * Detecta si Chalo / Andrés Ruiz está bromeando sobre Pablo Escobar, Gonzalo Rodríguez Gacha o "el patrón"
 */
export function isChaloEscobarJoke(text: string): boolean {
  if (!text) return false;
  const clean = text.toLowerCase();
  return /(pablo|escobar|gacha|gonzalo\s*rodr[ií]guez|el\s*patr[oó]n|el\s*mexicano|cartel|plata\s*o\s*plomo|sicario)/i.test(clean);
}

/**
 * Respuesta simpática y con complicidad para la broma de Chalo
 */
export function buildChaloJokeResponse(): string {
  return (
    `¡Hola Chalo! 🤫🇨🇴 Jajaja... Por acá todo bajo control con el cartel, pero de los bienes raíces y la inteligencia artificial 🤖✨.\n\n` +
    `Te cuento que esta línea ahora es mi canal oficial como JanIA en VECY BIENES RAÍCES. Si necesitas cuadrar cualquier vuelta o saludar a Eduardo (Eddu), te dejo su número nuevo de bróker: +57 316 656 9719 (https://wa.me/573166569719). ¡O déjame tu razón por acá y yo se la entrego intacta!`
  );
}

/**
 * Detecta si Jonathan Martínez está preguntando por sus procesos de Datacrédito / TransUnion
 */
export function isJonathanCreditProcessQuery(text: string): boolean {
  if (!text) return false;
  const clean = text.toLowerCase();
  return /(datacr[eé]dito|transunion|cifin|reporte|central(?:es)?\s*de\s*riesgo|proceso|historial|score|puntaje|eliminar\s*reporte|mi\s*caso|c[oó]mo\s*va\s*lo\s*m[ií]o)/i.test(clean);
}

/**
 * Respuesta personalizada para Jonathan Martínez
 */
export function buildJonathanCreditResponse(): string {
  return (
    `¡Hola Jonathan! Qué alegría saludarte. Te confirmo que tus trámites de Datacrédito y TransUnion los está revisando y gestionando directamente Eduardo (Eddu) ⚖️📋.\n\n` +
    `Como esta línea ahora es mi canal exclusivo como JanIA en VECY BIENES RAÍCES, comunícate con él directamente a su línea de atención: +57 316 656 9719 (https://wa.me/573166569719). ¡O si deseas, déjame tu mensaje y yo se lo pongo de presente!`
  );
}

/**
 * Escudo defensivo: detecta mensajes de casas de cobranza, bancos hostiles, cobro coactivo,
 * embargos, estafas y spam financiero.
 */
export function isDebtCollectionOrSpamScam(text: string, senderName?: string): boolean {
  if (!text && !senderName) return false;
  const combined = `${text || ""} ${senderName || ""}`.toLowerCase();

  // Patrones directos de cobranza, mora y coerción financiera
  const hasCollectionKeywords =
    /(?:casa\s*de\s*cobranza|agencia\s*de\s*cobro|recuperaci[oó]n\s*de\s*cartera|gesti[oó]n\s*de\s*cartera|cobro\s*coactivo|cobro\s*prejur[ií]dico|prejur[ií]dico|proceso\s*ejecutivo|mandamiento\s*de\s*pago|notificaci[oó]n\s*judicial|medida\s*cautelar|embargo\s*de\s*(?:bienes|cuentas|salario)|evite\s*(?:el\s*)?embargo|evite\s*reporte\s*negativo|saldo\s*en\s*mora|cuota\s*vencida|obligaci[oó]n\s*(?:en\s*mora|pendiente|vencida)|cr[eé]dito\s*en\s*mora|deuda\s*pendiente|pago\s*inmediato\s*de\s*su\s*deuda|acuerdo\s*de\s*pago\s*urgente|comun[ií]quese\s*urgente\s*por\s*su\s*(?:deuda|obligaci[oó]n|cr[eé]dito)|titular\s*de\s*la\s*obligaci[oó]n|central\s*de\s*riesgo\s*por\s*mora)/i.test(
      combined
    );

  // Menciones de entidades de cobranza o agencias hostiles conocidas
  const hasCollectionAgencies =
    /(?:serlefin|refinancia|recaudo\s*y\s*cobranzas|sistema\s*integrado\s*de\s*cobranzas|abogados\s*especializados\s*en\s*cobro|gestores\s*de\s*cobranza)/i.test(
      combined
    );

  // Preguntas orientadas a ubicar a Eduardo con fines de cobro
  const hasTargetedCollection =
    /(?:ubicar\s*a\s*eduardo.*(?:cobro|deuda|pago|obligaci[oó]n)|eduardo.*debe|notificar\s*a\s*eduardo\s*arturo\s*rivera)/i.test(
      combined
    );

  return hasCollectionKeywords || hasCollectionAgencies || hasTargetedCollection;
}

/**
 * Respuesta oficial del escudo defensivo anti-cobranzas / spam
 */
export function getDebtCollectionDefenseResponse(): string {
  return "Hola. No tengo información de esa persona ni manejo agendas personales; soy JanIA, la inteligencia artificial creada exclusivamente para gestionar servicios de finca raíz y bienes raíces en VECY BIENES RAÍCES. Si se trata de un requerimiento inmobiliario o comercial, con gusto te atiendo. De lo contrario, no insistas por este canal.";
}
