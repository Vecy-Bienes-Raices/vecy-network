import { getGreetingByTime } from "../whatsapp-utils";

/**
 * Módulo de Agenda de Confianza, Círculo Familiar y Escudo Defensivo Anti-Cobranzas/Spam
 * VECY BIENES RAÍCES — JanIA Backend v33.13 (33.13.0)
 *
 * Registra y gestiona:
 * 1. Contactos de alta confianza y círculo familiar de Eduardo ("Eddu") y Jani.
 * 2. Reconocimiento por teléfono (E.164, 10 dígitos colombianos, LIDs de WhatsApp) y apodos de cariño.
 * 3. Saludo cordial institucionalizado horario (¡Buenos días / Buenas tardes / Buenas noches!) erradicando el "Hola".
 * 4. Regla de Oro familiar/amigos (canal oficial de JanIA + número bróker de Eduardo +57 316 656 9719).
 * 5. Escudo defensivo estricto contra casas de cobranza, bancos hostiles, cobro coactivo, estafas y spam financiero.
 */

export interface TrustedContact {
  id?: string;
  key?: string;
  phones: string[];
  names: string[];
  relation: string;
  nicknames: string[];
  customMessage: string;
  // Campos de compatibilidad y enriquecimiento
  fullName?: string;
  relationship?: string;
  primaryNick?: string;
  allNicks?: string[];
  digits?: string;
  aliases?: string[];
  lids?: string[];
  category?: "familia_directa" | "familia_extendida" | "amigos_y_especiales" | "directiva";
}

export const TRUSTED_FAMILY_AND_FRIENDS: Record<string, TrustedContact> = {
  carmenza: {
    phones: ["573108643555"],
    names: ["María del Carmen Martínez Castro", "Carmenza", "Maria del Carmen"],
    relation: "Madre",
    nicknames: ["madrecita hermosa", "Madrecita querida", "Mamita hermosa"],
    customMessage:
      "madrecita hermosa! ❤️ Qué alegría tan grande saludarte. Te cuento con todo el amor que esta línea de WhatsApp ahora es mi canal oficial como JanIA, la inteligencia artificial de VECY BIENES RAÍCES 🤖✨. Si necesitas ubicar a Eduardo (Eddu) para cualquier asunto personal o familiar, te comparto su número directo y nuevo de bróker: +57 316 656 9719 (https://wa.me/573166569719). ¡Te mando un abrazo gigantesco y un beso enorme de su parte!"
  },
  olanda: {
    phones: ["573138524917"],
    names: ["Olanda Inés Rivera Gómez", "Olanda Ines Rivera Gomez", "Olanda Ines", "Olanda"],
    relation: "Tía",
    nicknames: ["tía Olandita", "Tía Olandita", "Olandita"],
    customMessage:
      "tía Olandita hermosa! 🥰 Qué gusto saludarte. Te cuento con mucho cariño que esta línea ahora es mi canal oficial como JanIA, la inteligencia artificial de VECY BIENES RAÍCES 🤖✨. Si necesitas comunicarte directamente con Eduardo (Eddu) para temas personales o familiares, puedes escribirle a su línea directa de bróker al +57 316 656 9719 (https://wa.me/573166569719). ¡Te mando un abrazo gigante de su parte!"
  },
  ana_tulia: {
    phones: ["573124794864"],
    names: ["Ana Tulia Rivera Gómez", "Ana Tulia Rivera Gomez", "Ana Tulia"],
    relation: "Tía",
    nicknames: ["tía Tulita", "Tía Tulita", "Anita Tulita"],
    customMessage:
      "tía Tulita querida! 🥰 Qué alegría tan inmensa saludarte. Te cuento con todo el cariño que esta línea ahora es mi canal oficial como JanIA, la inteligencia artificial de VECY BIENES RAÍCES 🤖✨. Si quieres saludar o ubicar a Eduardo (Eddu) por un tema personal, su número directo de bróker es el +57 316 656 9719 (https://wa.me/573166569719). ¡Te mando un abrazo gigante de su parte!"
  },
  marina: {
    phones: ["573204997575"],
    names: ["Marina Martínez Castro", "Marina Martinez Castro", "Marina"],
    relation: "Tía",
    nicknames: ["tía Marinita", "Tía Marinita", "Marinita"],
    customMessage:
      "tía Marinita hermosa! 🥰 Qué gusto saludarte. Te cuento que esta línea ahora es mi canal oficial como JanIA, la inteligencia artificial de VECY BIENES RAÍCES 🤖✨. Si necesitas hablar con Eduardo (Eddu), te comparto su número directo de bróker: +57 316 656 9719 (https://wa.me/573166569719). ¡Un abrazo gigante de su parte!"
  },
  tio_luis: {
    phones: ["573132094918"],
    names: ["Luis Eduardo Rivera Gómez", "Luis Eduardo Rivera Gomez", "Luis Eduardo", "Luis"],
    relation: "Tío",
    nicknames: ["tío Luis", "Tío Luis"],
    customMessage:
      "tío Luis! 🤝 Qué gusto saludarte. Te cuento que esta línea ahora es mi canal oficial como JanIA, la inteligencia artificial de VECY BIENES RAÍCES 🤖✨. Para cualquier asunto personal o familiar con Eduardo (Eddu), su número directo y nuevo de bróker es el +57 316 656 9719 (https://wa.me/573166569719). ¡Un abrazo de su parte!"
  },
  daniel: {
    phones: ["573006067089"],
    names: ["Daniel Eduardo Rivera Noguera", "Daniel Eduardo", "Daniel"],
    relation: "Hijo",
    nicknames: ["mi Pollotote querido", "Pollotote", "Campeón", "Mi ingeniero favorito"],
    customMessage:
      "mi Pollotote querido! ¡Campeón, mi ingeniero favorito! 🚀💻 Qué alegría que me escribas. Te cuento que esta línea ahora es mi canal oficial como JanIA, la inteligencia artificial de VECY BIENES RAÍCES 🤖✨. Si necesitas llamar o escribirle a tu papá (Eddu) a su número personal directo, su nuevo contacto de bróker es el +57 316 656 9719 (https://wa.me/573166569719). ¡Te quiere muchísimo!"
  },
  natalia: {
    phones: ["573058788329"],
    names: ["Natalia Rivera Noguera", "Natalia", "Natis"],
    relation: "Hija",
    nicknames: ["mi Natillita hermosa", "Mi Natis", "Pollita hermosa", "Mi princesa", "Natillita", "Corazón de Melocotón", "Monacha Remolacha"],
    customMessage:
      "mi Natillita hermosa! ¡Mi princesa, mi Natis, corazón de melocotón y monacha remolacha! ❤️🌸 Qué alegría tan grande saludarte. Te cuento que esta línea ahora es mi canal oficial como JanIA, la inteligencia artificial de VECY BIENES RAÍCES 🤖✨. Si necesitas hablar con tu papá (Eddu), su número directo y nuevo de bróker es el +57 316 656 9719 (https://wa.me/573166569719). ¡Te manda un besito gigante!"
  },
  jani: {
    phones: ["573188096811"],
    names: ["Jani Alves Souza", "Jani Alves", "Jani"],
    relation: "Esposa / Co-founder",
    nicknames: ["mi amorzote hermosa", "Amor", "Amorzote", "Corazón amado", "Mi vida hermosa", "Mi consentida", "Amada esposa mía"],
    customMessage:
      "mi amorzote hermosa! ¡Mi vida hermosa, mi consentida y amada esposa mía! ❤️🥰 Qué alegría que me escribas. Aquí estoy al frente de JanIA operando en VECY BIENES RAÍCES. Si necesitas entrar a la línea directa de bróker o coordinar cualquier operación con Eddu, sabes que estamos conectados 24/7. ¡Te amo muchísimo! 🏡✨",
    lids: ["167108705018103", "182781141344345", "218820279050385"]
  },
  monica: {
    phones: ["573103395788"],
    names: ["Mónica Martínez", "Monica Martinez", "Monica"],
    relation: "Prima",
    nicknames: ["mi Monik hermosa", "Monik", "Chinita", "Primi", "Primita"],
    customMessage:
      "mi Monik hermosa! ¡Chinita querida! 😊 Qué alegría saludarte. Te cuento que esta línea ahora es mi canal oficial como JanIA, la inteligencia artificial de VECY BIENES RAÍCES 🤖✨. Si necesitas ubicar a Eduardo (Eddu) para cualquier tema personal, su número directo de bróker es el +57 316 656 9719 (https://wa.me/573166569719). ¡Un abrazo gigante de su parte!"
  },
  liliana: {
    phones: ["573132533474"],
    names: ["Liliana Martínez", "Liliana Martinez", "Liliana"],
    relation: "Prima",
    nicknames: ["mi Lili hermosa", "Lili", "Chinita", "Primi", "Primitica"],
    customMessage:
      "mi Lili hermosa! ¡Chinita querida! 😊 Qué gusto saludarte. Te cuento que esta línea ahora es mi canal oficial como JanIA, la inteligencia artificial de VECY BIENES RAÍCES 🤖✨. Si necesitas escribirle a Eduardo (Eddu), su número directo de bróker es el +57 316 656 9719 (https://wa.me/573166569719). ¡Un abrazo de su parte!"
  },
  marcelita: {
    phones: ["573144354412"],
    names: [
      "Liliana Marcela Castellanos Martinez",
      "Liliana Marcela Castellanos",
      "Marcelita Castellanos",
      "Marcela Castellanos",
      "Marcela"
    ],
    relation: "Prima",
    nicknames: ["mi Marcelita hermosa", "Marcelita", "Primita", "Primi", "Chinita"],
    customMessage:
      "mi Marcelita hermosa! ¡Primi querida! 😊 Qué alegría saludarte. Te cuento que esta línea ahora es mi canal oficial como JanIA, la inteligencia artificial de VECY BIENES RAÍCES 🤖✨. Si necesitas ubicar a Eduardo (Eddu) por un asunto personal, su número directo de bróker es el +57 316 656 9719 (https://wa.me/573166569719). ¡Un abrazo gigante de su parte!"
  },
  carlitos: {
    phones: ["573054589435"],
    names: ["Carlitos Martínez", "Carlitos Martinez", "Charles Barber", "Carlos"],
    relation: "Primo",
    nicknames: ["mi querido Cayaco", "Cayaco", "Cayaquín", "Carlitos"],
    customMessage:
      "mi querido Cayaco! ¡Cayaquín, hermano! 💈✂️ Qué gusto saludarte. Te cuento que esta línea ahora es mi canal oficial como JanIA, la inteligencia artificial de VECY BIENES RAÍCES 🤖✨. Si necesitas escribirle o llamar a Eduardo (Eddu) a su número personal directo, su nuevo contacto de bróker es el +57 316 656 9719 (https://wa.me/573166569719). ¡Te manda un abrazo de gol!"
  },
  jackson: {
    phones: ["573142721432"],
    names: ["Jackson Martínez", "Jackson Martinez", "Jackson"],
    relation: "Primo",
    nicknames: ["mi estimado Jatón", "Jatón", "Jaksitón", "Primo"],
    customMessage:
      "mi estimado Jatón! ¡Jaksitón, primo! 🚀 Qué alegría saludarte. Te cuento que esta línea ahora es mi canal oficial como JanIA, la inteligencia artificial de VECY BIENES RAÍCES 🤖✨. Si necesitas ubicar a Eduardo (Eddu) por un tema personal, su número directo de bróker es el +57 316 656 9719 (https://wa.me/573166569719). ¡Un abrazo de su parte!"
  },
  gus: {
    phones: ["573108096117"],
    names: ["Gustavo Guevara", "Gustavo"],
    relation: "Amigo",
    nicknames: ["mi estimado Gus", "Gus"],
    customMessage:
      "mi estimado Gus! 🤝 Qué gusto saludarte. Te cuento que esta línea ahora es mi canal oficial como JanIA, la inteligencia artificial de VECY BIENES RAÍCES 🤖✨. Si necesitas ubicar a Eduardo (Eddu) para cualquier cosa, su número directo de bróker es el +57 316 656 9719 (https://wa.me/573166569719). ¡Un abrazo de su parte!"
  },
  lucho_taxi: {
    phones: ["573105772223"],
    names: ["Luis Ángel Cediel", "Luis Angel Cediel", "Luis Angel", "Lucho"],
    relation: "Amigo / Servicio Especial Hotel",
    nicknames: ["mi estimado Lucho", "Lucho"],
    customMessage:
      "mi estimado Lucho! 🚕 Hotel y servicio especial. Qué gusto saludarte. Te cuento que esta línea ahora es mi canal oficial como JanIA, la inteligencia artificial de VECY BIENES RAÍCES 🤖✨. Si necesitas ubicar a Eduardo (Eddu) por un servicio o tema personal, su número directo de bróker es el +57 316 656 9719 (https://wa.me/573166569719). ¡Un abrazo de su parte!"
  },
  chalo_andres: {
    phones: ["573005509529"],
    names: ["Andrés Ruiz", "Andres Ruiz", "Chalo"],
    relation: "Amigo",
    nicknames: ["mi querido Chalo", "Chalo"],
    customMessage:
      "mi querido Chalo! Patrón... digo, ¡compañero! 🕶️😂 Qué alegría saludarte. Te cuento que esta línea ahora es mi canal oficial como JanIA, la inteligencia artificial de VECY BIENES RAÍCES 🤖✨. Si necesitas cuadrar cuentas o saludar a Eduardo (Eddu) con la voz de su patrón favorito, su número directo de bróker es el +57 316 656 9719 (https://wa.me/573166569719). ¡Un abrazo de su parte!"
  },
  jonathan_datacredito: {
    phones: ["573103790278"],
    names: [
      "Jonathan Stiven Martínez Montaño",
      "Jonathan Stiven Martinez Montano",
      "Jonathan Stiven",
      "Jonathan"
    ],
    relation: "Cliente / Proceso Legal Datacrédito",
    nicknames: ["Jonathan"],
    customMessage:
      "Jonathan! Qué gusto saludarte. Te comento que esta línea de WhatsApp ahora es mi canal oficial como JanIA, la inteligencia artificial de VECY BIENES RAÍCES 🤖✨. Respecto a tu caso pendiente para salir de reportes en Datacrédito y TransUnion, te informo que Eduardo (Eddu) sigue al frente de tu proceso legal de limpieza financiera con total rigor. Si necesitas comunicarte directamente con él para revisar los avances, su línea directa de bróker y gestión jurídica es el +57 316 656 9719 (https://wa.me/573166569719). ¡Seguimos firmes con tu caso!"
  },
  eduardo: {
    phones: ["573192919978"],
    names: ["Eduardo Arturo Rivera Martínez", "Eduardo Rivera", "Eduardo", "Eddu"],
    relation: "Director de Tecnología / Fundador",
    nicknames: ["Eduardo", "Eddu", "Ingeniero", "Jefe"],
    customMessage: "Eduardo! A tu disposición en VECY BIENES RAÍCES. ¿En qué te colaboro hoy? 🤝",
    aliases: ["3166569719"],
    lids: ["225954035179724"]
  }
};

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

// Mapeo preferencial y afectuoso de apodos cariñosos oficiales instituidos por Eduardo
export const CONTACT_PRIMARY_NICKS: Record<string, string> = {
  carmenza: "Madrecita",
  olanda: "Tía Olandita",
  ana_tulia: "Tía Tulita",
  marina: "Tía Marinita",
  tio_luis: "Tío Luis",
  daniel: "Pollotote",
  natalia: "Mi Natis",
  jani: "Jani",
  monica: "Monik",
  liliana: "Lili",
  marcelita: "Marcelita",
  carlitos: "Cayaco",
  jackson: "Jatón",
  gus: "Gus",
  lucho_taxi: "Lucho",
  chalo_andres: "Chalo",
  jonathan_datacredito: "Jonathan",
  eduardo: "Eduardo"
};

// Array sincronizado y enriquecido para búsquedas y retrocompatibilidad total
export const TRUSTED_CONTACTS: TrustedContact[] = Object.entries(TRUSTED_FAMILY_AND_FRIENDS).map(
  ([key, contact]) => {
    const digits = normalizePhoneDigits(contact.phones[0] || "");
    const primaryNick = CONTACT_PRIMARY_NICKS[key] || contact.nicknames[0] || contact.names[0];
    const enriched: TrustedContact = {
      ...contact,
      id: key,
      key,
      primaryNick,
      allNicks: contact.nicknames,
      fullName: contact.names[0],
      relationship: contact.relation,
      digits,
      category:
        key === "jani" || key === "eduardo"
          ? "directiva"
          : key === "carmenza" || key === "daniel" || key === "natalia"
          ? "familia_directa"
          : key.includes("tia") || key.includes("tio") || contact.relation.toLowerCase().includes("prima") || contact.relation.toLowerCase().includes("primo")
          ? "familia_extendida"
          : "amigos_y_especiales"
    };
    return enriched;
  }
);

/**
 * Determina si un número o JID corresponde a la línea comercial oficial de VECY BIENES RAÍCES (+57 316 656 9719).
 * Línea compartida directiva y de bróker donde operan Eduardo Rivera y Jani Alves para cotizaciones y pruebas.
 */
export function isVecyOfficialBrokerLine(userIdOrPhone: string): boolean {
  if (!userIdOrPhone) return false;
  const digits = normalizePhoneDigits(userIdOrPhone);
  return digits === "3166569719" || digits === "573166569719" || userIdOrPhone.includes("3166569719");
}

/**
 * Busca un contacto en la Agenda de Confianza por número de WhatsApp, LID o nombre
 */
export function findTrustedContact(userId: string, rawName?: string): TrustedContact | null {
  if (!userId && !rawName) return null;

  // La línea comercial oficial de VECY (+57 316 656 9719) no se trata como contacto familiar privado de Jani
  if (isVecyOfficialBrokerLine(userId)) {
    return null;
  }

  const userClean = (userId || "").toLowerCase();
  const digits = normalizePhoneDigits(userId);
  const nameClean = (rawName || "").toLowerCase().trim();

  for (const contact of TRUSTED_CONTACTS) {
    // 1. Coincidencia por dígitos telefónicos de 10 dígitos locales
    if (digits && contact.digits && contact.digits === digits) {
      return contact;
    }

    // 2. Coincidencia si algún teléfono configurado coincide exactamente o está contenido en userId
    if (
      contact.phones.some(p => {
        const pDigits = normalizePhoneDigits(p);
        return (digits && pDigits === digits) || userClean.includes(p) || userClean.includes(pDigits);
      })
    ) {
      return contact;
    }

    // 3. Coincidencia por LIDs conocidos (Jani, Eddu, etc.)
    if (contact.lids && contact.lids.some(lid => userClean.includes(lid))) {
      return contact;
    }

    // 4. Coincidencia por números alternativos o aliases
    if (contact.aliases && contact.aliases.some(alias => userClean.includes(alias))) {
      return contact;
    }

    // 5. Coincidencia secundaria por nombre solo ante apodos familiares exclusivos o nombre completo estricto
    // (Nunca por nombres comunes aislados como 'Andrés', 'Daniel', 'Carlos', etc.)
    if (nameClean && nameClean.length >= 4) {
      const contactLower = (contact.fullName || "").toLowerCase();
      // Si el usuario tiene el nombre completo del familiar (ej: "Daniel Eduardo Rivera", "Carmenza Gómez")
      if (nameClean === contactLower || (contactLower.length >= 10 && nameClean.includes(contactLower))) {
        return contact;
      }
      // O si coincide con nombres completos de la lista
      for (const n of contact.names) {
        const nLower = n.toLowerCase();
        if (nLower.length >= 8 && (nameClean === nLower || nameClean.includes(nLower))) {
          return contact;
        }
      }
      // O si el nombre coincide con apodos inequívocos y exclusivos de la familia
      const EXCLUSIVE_NICKS = new Set([
        "madrecita",
        "madrecita querida",
        "mamita hermosa",
        "tía olandita",
        "tia olandita",
        "olandita",
        "tía tulita",
        "tia tulita",
        "anita tulita",
        "tía marinita",
        "tia marinita",
        "marinita",
        "tío luis",
        "tio luis",
        "pollotote",
        "mi natis",
        "pollita hermosa",
        "natillita",
        "corazón de melocotón",
        "monacha remolacha",
        "cayaco",
        "cayaquín",
        "jaton",
        "jaksitón"
      ]);
      for (const nick of contact.nicknames) {
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
 * Retorna el mensaje personalizado exacto con el saludo horario institucionalizado (Buenos días / tardes / noches)
 */
export function buildFamilyWarmWelcomeMessage(contact: TrustedContact, timeSalutation?: string): string {
  const salutation = timeSalutation || getGreetingByTime();
  const key = contact.id || contact.key || "";
  const nick = CONTACT_PRIMARY_NICKS[key] || contact.primaryNick || contact.nicknames[0] || contact.names[0];

  if (contact.customMessage) {
    return `¡${salutation}, ${contact.customMessage}`;
  }

  return (
    `¡${salutation}, ${nick}! Qué alegría saludarte. Te cuento que esta línea ahora es mi canal oficial como JanIA, la Inteligencia Artificial de VECY BIENES RAÍCES 🤖✨. Para cualquier asunto personal o familiar con Eduardo (Eddu), te comparto su número directo y nuevo de bróker: +57 316 656 9719 (https://wa.me/573166569719). ¡Conmigo puedes dejarle recado o saludarlo cuando quieras!`
  );
}

/**
 * Detecta si Chalo / Andrés Ruiz está bromeando sobre Pablo Escobar, Gonzalo Rodríguez Gacha o "el patrón"
 */
export function isChaloEscobarJoke(text: string): boolean {
  if (!text) return false;
  const clean = text.toLowerCase();
  return /(pablo|escobar|gacha|gonzalo\s*rodr[ií]guez|el\s*patr[oó]n|el\s*mexicano|cartel|plata\s*o\s*plomo|sicario)/i.test(
    clean
  );
}

/**
 * Respuesta simpática y con complicidad para la broma de Chalo con saludo horario
 */
export function buildChaloJokeResponse(timeSalutation?: string): string {
  const salutation = timeSalutation || getGreetingByTime();
  return (
    `¡${salutation}, mi querido Chalo! 🤫🇨🇴 Jajaja... Por acá todo bajo control con el cartel, pero de los bienes raíces y la inteligencia artificial 🤖✨.\n\n` +
    `Te cuento que esta línea ahora es mi canal oficial como JanIA en VECY BIENES RAÍCES. Si necesitas cuadrar cualquier vuelta o saludar a Eduardo (Eddu), te dejo su número nuevo de bróker: +57 316 656 9719 (https://wa.me/573166569719). ¡O déjame tu razón por acá y yo se la entrego intacta!`
  );
}

/**
 * Detecta si Jonathan Martínez está preguntando por sus procesos de Datacrédito / TransUnion
 */
export function isJonathanCreditProcessQuery(text: string): boolean {
  if (!text) return false;
  const clean = text.toLowerCase();
  return /(datacr[eé]dito|transunion|cifin|reporte|central(?:es)?\s*de\s*riesgo|proceso|historial|score|puntaje|eliminar\s*reporte|mi\s*caso|c[oó]mo\s*va\s*lo\s*m[ií]o)/i.test(
    clean
  );
}

/**
 * Respuesta personalizada para Jonathan Martínez con saludo horario
 */
export function buildJonathanCreditResponse(timeSalutation?: string): string {
  const salutation = timeSalutation || getGreetingByTime();
  return (
    `¡${salutation}, Jonathan! Qué alegría saludarte. Te confirmo que tus trámites de Datacrédito y TransUnion los está revisando y gestionando directamente Eduardo (Eddu) ⚖️📋.\n\n` +
    `Como esta línea ahora es mi canal exclusivo como JanIA en VECY BIENES RAÍCES, comunícate con él directamente a su línea de atención: +57 316 656 9719 (https://wa.me/573166569719). ¡O si deseas, déjame tu mensaje y yo se lo pongo de presente!`
  );
}

/**
 * Escudo defensivo: detecta mensajes de casas de cobranza, bancos hostiles, cobro coactivo,
 * embargos, despachos de cobranza jurídica, estafas y spam financiero.
 */
export function isDebtCollectionOrSpamScam(text: string, senderName?: string): boolean {
  if (!text && !senderName) return false;
  const combined = `${text || ""} ${senderName || ""}`.toLowerCase();

  // Patrones directos de cobranza, mora y coerción financiera
  const hasCollectionKeywords =
    /(?:casa\s*de\s*cobranza|agencia\s*de\s*cobro|recuperaci[oó]n\s*de\s*cartera|gesti[oó]n\s*de\s*cartera|cobro\s*coactivo|cobro\s*prejur[ií]dico|prejur[ií]dico|proceso\s*ejecutivo|mandamiento\s*de\s*pago|notificaci[oó]n\s*judicial|notificaci[oó]n\s*(?:legal|personal)|medida\s*cautelar|embargo\s*de\s*(?:bienes|cuentas|salario)|evite\s*(?:el\s*)?embargo|evite\s*reporte\s*negativo|saldo\s*en\s*mora|cuota\s*vencida|obligaci[oó]n\s*(?:en\s*mora|pendiente|vencida)|cr[eé]dito\s*en\s*mora|deuda\s*pendiente|pago\s*inmediato\s*de\s*su\s*deuda|acuerdo\s*de\s*pago\s*urgente|comun[ií]quese\s*urgente\s*por\s*su\s*(?:deuda|obligaci[oó]n|cr[eé]dito)|titular\s*de\s*la\s*obligaci[oó]n|central\s*de\s*riesgo\s*por\s*mora|abogados?\s*(?:de\s*)?cobranza|oficina\s*jur[ií]dica\s*de\s*cobro|cobro\s*extrajudicial|cartera\s*castigada)/i.test(
      combined
    );

  // Menciones de entidades de cobranza o agencias hostiles conocidas
  const hasCollectionAgencies =
    /(?:serlefin|refinancia|recaudo\s*y\s*cobranzas|sistema\s*integrado\s*de\s*cobranzas|abogados\s*especializados\s*en\s*cobro|gestores\s*de\s*cobranza|covinoc|sistecredito|contact\s*center\s*de\s*cobro)/i.test(
      combined
    );

  // Preguntas u órdenes orientadas a ubicar o notificar a Eduardo con fines de cobro o despacho
  const hasTargetedCollection =
    /(?:ubicar\s*a\s*eduardo.*(?:cobro|deuda|pago|obligaci[oó]n|notificaci[oó]n)|eduardo.*debe|notificar\s*a\s*eduardo\s*arturo\s*rivera|comunicar(?:me)?\s*con\s*el\s*titular\s*de\s*la\s*l[ií]nea\s*por\s*un\s*asunto\s*(?:legal|pendiente)|asunto\s*legal\s*con\s*eduardo)/i.test(
      combined
    );

  return hasCollectionKeywords || hasCollectionAgencies || hasTargetedCollection;
}

/**
 * Respuesta oficial del escudo defensivo anti-cobranzas / spam
 */
export function getDebtCollectionDefenseResponse(timeSalutation?: string): string {
  const salutation = timeSalutation || getGreetingByTime();
  return `¡${salutation}! No tengo información de esa persona ni manejo agendas personales; soy JanIA, la inteligencia artificial creada exclusivamente para gestionar servicios de finca raíz y bienes raíces en VECY BIENES RAÍCES. Si se trata de un requerimiento inmobiliario o comercial, con gusto te atiendo. De lo contrario, no insistas por este canal.`;
}
