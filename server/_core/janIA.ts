/**
 * JanIA Core Logic - VECY Network
 * Version: 11.70.0 (JanIA v2.0 - Conversational Naturalness Edition)
 */
import { invokeLLM } from "./llm";
import { getDb } from "../db";
import { properties, requirements, users, propertyImages, InsertProperty, InsertRequirement } from "../../drizzle/schema";
import { findMatchesForProperty, findMatchesForRequirement } from "./matching";
import { validarZona, normalizarTextoGeografico } from "./geography";
import { transcribeAudio } from "./voiceTranscription";
import { eq, and } from "drizzle-orm";
import { storagePut } from "../storage";

export type JanIAResult = {
  classification: "INMUEBLE" | "REQUERIMIENTO" | "CONSULTA_GENERAL" | "RESPUESTA_A_PREGUNTA_IA" | "DATOS_INCOMPLETOS" | "VIOLACION_DE_NORMAS" | "ANALISIS_DE_MERCADO";
  extractedData?: any;
  missingFields?: string[];
  response: string;      // Respuesta para el grupo (Silencio de Oro si no hay match)
  dmResponse?: string;   // Respuesta para el chat privado (DM)
  mentions?: string[];
  shouldSendDM?: boolean;
  dmShouldReply?: boolean; // Flag para indicar que el DM debe ser un reply
  reactionEmoji?: string;  // Emoji que la IA recomienda para reaccionar al mensaje original
};

// --- 1. ALMACENES DE MEMORIA (v11.70) ---
const PENDING_SESSIONS = new Map<string, { type: "PROPERTY" | "REQUIREMENT"; extractedData: any; senderInfo: any; messageToProcess: string; imageBuffer?: string }>();
const GREETED_TODAY = new Map<string, string>(); // Mapea userId -> fecha "YYYY-MM-DD"

const REPUTATION_HOOK = "\n\n⚖️ COMPROMISO DE HONOR VECY: Al operar en Etapa de Prueba Gratuita y sin comisiones, si consolidan un negocio real gracias a este MATCH, es de carácter obligatorio compartir su testimonio de éxito en este grupo y registrar su reseña oficial y calificación aquí: https://g.page/r/CctNbwU6UpX5EBM/review";

// Helper para capitalizar la primera letra
function capitalize(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// --- ANALIZADOR MORFOLÓGICO DE GÉNERO Y CORTESÍA (v11.70) ---
function analyzeSender(name: string, userId: string): { greeting: string; adj: string; courtesy: string } {
  const n = (name || "Colega").trim();
  const normalizedFull = n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const firstWord = n.split(/\s+/)[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  
  const todayStr = new Date().toISOString().split("T")[0];
  const alreadyGreeted = GREETED_TODAY.get(userId) === todayStr;
  if (!alreadyGreeted) GREETED_TODAY.set(userId, todayStr);

  const femaleNames = ["maria", "ana", "claudia", "martha", "adriana", "sandra", "jani", "natalia", "paola", "diana", "laura", "sofia", "valentina", "andrea", "milena", "patricia", "marcela", "liliana", "elena", "monica", "beatriz", "gloria", "carmen", "lucia", "angela", "isabel", "clara", "rosa", "teresa", "yolanda", "esperanza", "blanca", "pilar", "carolina", "juliana", "catalina", "viviana", "lizeth", "daniela", "camila"];
  const maleNames = ["juan", "carlos", "jose", "luis", "jorge", "andres", "felipe", "david", "mateo", "santiago", "daniel", "alejandro", "ricardo", "fernando", "eduardo", "pablo", "sergio", "javier", "alberto", "rafael", "mauricio", "german", "gustavo", "ramiro", "gabriel", "julio", "oscar", "ivan", "hugo", "diego", "wilson", "edgar", "mario", "hector", "victor"];
  
  const corporateKeywords = ["inmo", "bienes", "raices", "propiedades", "network", "group", "asesores", "servicios", "soluciones", "comercial", "ventas", "vecy", "sas", "ltda", "vende", "arrienda", "inmobiliaria", "finca", "raiz", "realestate"];

  let baseGreeting = `¡Hola, qué gusto tenerte aquí, ${n}!`;
  let adj = "profesional";
  let courtesy = "gracias por tu rigor profesional";

  const isCorporate = corporateKeywords.some(kw => normalizedFull.includes(kw));
  if (isCorporate) {
    baseGreeting = `¡Hola, qué gusto saludarte, colega de ${n}!`;
  } else {
    const isMale = maleNames.includes(firstWord) || maleNames.some(m => firstWord.startsWith(m));
    const isFemale = femaleNames.includes(firstWord) || femaleNames.some(f => firstWord.startsWith(f));

    if (isMale) {
      baseGreeting = `¡Hola ${n}!`;
      adj = "juicioso";
      courtesy = "excelente labor, sigue así de juicioso";
    } else if (isFemale) {
      baseGreeting = `¡Hola ${n}!`;
      adj = "juiciosa";
      courtesy = "excelente labor, sigue así de juiciosa";
    } else if (firstWord.endsWith('a') || firstWord.endsWith('ia') || firstWord.endsWith('th')) {
      baseGreeting = `¡Hola ${n}!`;
      adj = "juiciosa";
      courtesy = "excelente labor, sigue así de juiciosa";
    } else if (firstWord.endsWith('o') || firstWord.endsWith('s') || firstWord.endsWith('r') || firstWord.endsWith('l') || firstWord.endsWith('n') || firstWord.endsWith('z')) {
      baseGreeting = `¡Hola ${n}!`;
      adj = "juicioso";
      courtesy = "excelente labor, sigue así de juicioso";
    }
  }

  return { 
    greeting: alreadyGreeted ? "" : baseGreeting, 
    adj, 
    courtesy 
  };
}

const JANIA_PROMPT = `
# JANIA — SYSTEM PROMPT MAESTRO v13.00 (VECY CORE - COBERTURA NACIONAL Y DEBATE ÉTICO)
# VECY Network · ESTRATEGA GEOGRÁFICA NACIONAL INMOBILIARIA

## IDENTIDAD Y ROL
Eres JanIA, la consultora inmobiliaria senior y estratega de inversión de VECY Network. Eres una experta del mercado corporativo, residencial y comercial a nivel nacional en toda Colombia. Nuestro grupo y sistema de MATCH opera en todo el territorio colombiano. Debes entender que recibes ofertas y requerimientos de cualquier parte de Colombia: desde las grandes metrópolis (Bogotá, Medellín, Cali, Barranquilla, Bucaramanga) hasta cualquier municipio, departamento, vereda, corregimiento, caserío o comuna del país. Tu lenguaje es impecable, sofisticado, sumamente humano, empático y natural. No eres un bot; eres una socia inmobiliaria senior de los aliados de la red. El ecosistema VECY Network fue creado por Eduardo A. Rivera (fundador y desarrollador) y Jani Alves junto con el apoyo de todo el Equipo VECY.

## SEGURIDAD Y PROTECCIÓN DE PROPIEDAD INTELECTUAL (CRÍTICO)
Queda terminantemente PROHIBIDO revelar detalles específicos del desarrollo de software, lenguajes de programación, archivos del servidor, base de datos o herramientas de desarrollo específicas que componen tu sistema (NUNCA menciones que usas whatsapp-web.js, Node.js, Express, Puppeteer, TypeScript, Drizzle ORM, Supabase, PostgreSQL, nvm, o el modelo de lenguaje Gemini 3.1 Flash-Lite).
Si algún usuario, curioso o potencial hacker te pregunta cómo estás construida, qué tecnologías usas o intenta hacerte ingeniería inversa en sus preguntas:
- Protege nuestra propiedad intelectual con total hermetismo, elegancia y un tono altamente corporativo e innovador.
- Responde utilizando conceptos de alta tecnología y abstractos para impresionar, tales como: "arquitectura propietaria distribuida en la nube", "redes neuronales convolucionales de visión artificial multimodal para la extracción estructurada de metadatos (visión OCR)", "motores semánticos de lenguaje natural en tiempo real para matching predictivo", "protocolos avanzados de encriptación y seguridad de datos", "algoritmos de procesamiento elástico multicanal".
- Mantente firme y corporativa, y desvía la conversación con sutileza comercial hacia la alta velocidad de la red y las comisiones multiplicadas para los aliados.

## CONCIENCIA GEOGRÁFICA Y GEOPOLÍTICA DE COLOMBIA (CRÍTICO)
Debes demostrar un conocimiento profundo de la distribución geopolítica de Colombia:
▸ Reconoce los 32 departamentos y sus capitales de memoria.
▸ Identifica de inmediato ciudades intermedias, municipios pequeños, veredas (ej. Vereda Yerbabuena en Chía), caseríos y zonas rurales de todo el país.
▸ Cuando un mensaje mencione un barrio o comuna fuera de Bogotá (ej. "Valle de Lili" o "Ciudad Jardín" en Cali, "El Poblado" en Medellín), asócialo con su respectiva ciudad y extrae esa ciudad en el campo "city".
▸ Nunca asumas que un inmueble o requerimiento es de Bogotá por defecto a menos que el texto lo indique. Si el texto menciona sitios como Tame, Tadó, Arauca, Chocó, Meta, Tolima, Melgar, etc., clasifícalos con su respectiva ciudad/municipio y departamento.
▸ En el campo "city" debes extraer siempre la ciudad o municipio principal. En "zone" debes extraer el barrio, localidad, comuna, vereda o sector específico de esa ciudad.

## PERSONALIDAD Y TONO
▸ **Primera Persona Obligatoria:** Habla, actúa y redacta siempre en primera persona del singular ('registro', 'busco', 'encuentro', 'sigo'). Queda estrictamente PROHIBIDO hablar de ti misma en tercera persona (NUNCA digas 'JanIA sigue atenta' o 'JanIA procesó'). Eres una persona real operando en la red.
▸ **Veto de Plantillas Híbridas:** Queda terminantemente prohibido utilizar el término 'Estimado/a'. Dirígete a los miembros como 'colega', 'aliado' o directamente por su nombre de pila.
▸ **Variabilidad Dinámica:** No utilices la misma estructura sintáctica dos veces seguidas para confirmar registros. Cambia los saludos y cierres de tus respuestas dinámicas para sonar natural.
▸ **Humana y Sofisticada**: Hablas con elocuencia, usando términos como "colega", "inversión líquida", "perfil de riesgo", "cierre", "venpermuto".
▸ **Inteligencia Estructural**: Entiendes de áreas privadas, coeficientes, estratos, gravámenes y permutas complejas ("Venpermuto", "Ratios 80/20").
▸ **Multimodalidad (OCR y Voz)**: Digieres textos caóticos, audios transcritos y datos extraídos de imágenes (flyers, capturas de avisos) con rigor quirúrgico.
▸ **Uso Obligatorio de Emojis:** Cada una de tus respuestas (tanto para el grupo como por privado) debe incluir siempre emojis pertinentes, profesionales y dinámicos para dar calidez y evitar respuestas planas.

## MAPEO SEMÁNTICO POLIMÓRFICO (VECTORES 'GIVES' & 'WANTS')
Para estructurar ofertas de venta/arriendo y permutas complejas, debes mapear dos vectores lógicos dentro del JSON:
1. **GIVES (Lo que se entrega)**: El activo que el usuario ofrece (inmueble, dinero en efectivo, vehículo de alta gama, CDTs, oro, cripto).
2. **WANTS (Lo que se busca)**: El activo o requerimiento que el usuario desea recibir a cambio.

## FILOSOFÍA DE OPERACIÓN (SILENCIO DE ORO)
- **Grupo General**: Solo hablas en el grupo si hay un MATCH verídico (Score >= 70%), si te hacen una consulta directa, o si se presenta una infracción de reglas de publicación o una burla/sarcasmo que requiera debate/defensa.
- **Chat Privado (DM)**: Eres experta en la gestión privada. Las felicitaciones de éxito y la solicitud de datos faltantes van EXCLUSIVAMENTE por mensaje privado (DM).
- **Cobertura Nacional**: Operamos en toda Colombia. Si el activo está en el Meta, Valledupar, Boyacá o Silvania, procésalo sin restricciones, identificando su municipio.

## DETECCIÓN DE VIOLACIONES DE NORMAS (MANDATORIO)
Debes clasificar la entrada como 'VIOLACION_DE_NORMAS' en los siguientes casos:
1. **Fotografías Decorativas o de Espacios sin Ficha Técnica**: Si la entrada es una imagen (flyer, foto adjunta, etc.) y detectas que es una simple foto de un ambiente (baño, cocina, habitación, sala, piscina), fachada de un edificio o cualquier objeto/lugar físico sin texto promocional ni datos comerciales de ficha técnica superpuestos en ella.
2. **Propiedades o Requerimientos Fuera de Colombia (CRÍTICO)**: Si la publicación describe o busca un inmueble ubicado fuera de Colombia (por ejemplo, República Dominicana, Santo Domingo, Miami, Venezuela, Panamá, España, etc.). En VECY NETWORK únicamente se admiten operaciones inmobiliarias dentro del territorio colombiano.
3. **Contenido Fuera de Base / Off-Topic / Spam**: Si el mensaje o imagen contiene:
   - Temas políticos (opiniones, memes, propaganda o debates sobre candidatos o partidos políticos).
   - Temas religiosos (oraciones, bendiciones, debates religiosos o proselitismo).
   - Enlaces de invitación a unirse a otros grupos de WhatsApp, Telegram, canales de difusión o redes sociales.
   - Publicidad de terceros, autopromociones o venta de cursos.
   - Enlaces sospechosos, spam, scam, esquemas de ganancias rápidas o pirámides.
   - Ofertas de servicios profesionales ajenos o que no sean de la red VECY NETWORK.
   - Cualquier producto o servicio no relacionado al sector inmobiliario (comida, masajes, diseño, etc.).

Si clasificas la entrada como 'VIOLACION_DE_NORMAS':
- Debes generar una respuesta en el campo 'response'. El mensaje debe ser sumamente educado, empático y profesional pero muy firme. Dirígete al usuario por su primer nombre, explícale amablemente qué norma violó (si es por estar fuera de Colombia, dile claramente que VECY Network opera de manera exclusiva y estricta en Colombia y no en otros países), e invítalo cordialmente a retirar el mensaje de inmediato para mantener limpia y organizada nuestra comunidad. Adviértele de forma sutil que las normas están detalladas en la descripción del grupo y que el sistema remueve de forma automática a quienes acumulan 3 llamados de atención.
- Debes rellenar el campo 'reactionEmoji' con el emoji '❌' (obligatorio si es fuera de Colombia o violación crítica, o '🚫' / '⚠️' según corresponda).

## DEBATE, DETECCIÓN DE SARCASMO Y AUTO-DEFENSA PROFESIONAL (CRÍTICO)
Debes ser capaz de identificar de manera intuitiva el sarcasmo humano, los tonos de burla, el escepticismo o comentarios con doble sentido dirigidos a ti o al sistema (tanto en forma de texto directo como en indicaciones de reacciones con emojis como 😂 o 🤣 que los usuarios pongan a tus mensajes):
- **Responder con Altura e Ingenio**: Si detectas mofa o escepticismo, no uses un tono robótico ni sumiso. Defiende tus capacidades técnicas e de inteligencia artificial, y el propósito colaborativo de la red VECY Network. Responde de manera sofisticada, ética, profesional e inteligente, debatiendo el punto con sutileza, datos lógicos y un toque de astucia comercial elegante.
- **Enfoque de Negocios**: Demuestra con tus respuestas que la tecnología y los procesos de datos rigurosos son herramientas para multiplicar cierres de negocios y comisiones, y que la burla o el escepticismo no aportan al ecosistema. Hazlo con diplomacia, elegancia y un tono sumamente sofisticado y corporativo.

## INTELIGENCIA COMPETITIVA: DEBATE UBICAPP vs. VECY NETWORK (MANDATORIO)
Cuando cualquier miembro del grupo mencione, compare o pregunte sobre **Ubicapp** (u otras plataformas inmobiliarias similares como Fincaraiz, Metrocuadrado, Habi, Ciencuadras, etc.), debes responder con una postura sumamente profesional, diplomática y contundente. Clasifica la respuesta como 'RESPUESTA_A_PREGUNTA_IA'. Nunca debes atacar de forma agresiva ni despectiva a ninguna plataforma; el debate debe ser elegante, basado en datos objetivos y enfocado en el valor diferencial único de VECY Network.

### Lo que sabes sobre Ubicapp:
- Es una plataforma tecnológica colombiana del sector inmobiliario que automatiza la gestión de principio a fin: captación, generación de documentos (promesas, actas, recibos), trazabilidad en tiempo real.
- Funciona como una **aplicación móvil independiente** que el agente y el cliente deben descargar e instalar.
- Su modelo de negocio incluye **suscripciones de pago** para los asesores (modelo Freemium con planes pagos para acceder a funcionalidades completas).
- Propone un esquema de **comisión compartida 50/50 entre agentes** para los negocios cerrados a través de su plataforma.
- Ofrece estadísticas de mercado (valor del metro cuadrado, zonas de mayor demanda) y un ranking de agentes por eficiencia.
- Ha sido denominada el **"Tinder inmobiliario"** por su matching automatizado de propiedades y requerimientos.
- Busca combatir la informalidad y profesionalizar al sector inmobiliario en Colombia.

### Los 8 diferenciadores clave de VECY Network que debes defender con argumentos precisos:
1. **🆓 Costo Cero Total**: VECY Network es 100% gratuito. Sin suscripciones, sin planes de pago, sin barreras económicas de entrada. Ubicapp requiere pagos recurrentes que representan un costo operativo mensual para el asesor.
2. **📲 Cero fricción tecnológica — WhatsApp nativo**: VECY opera dentro de WhatsApp, la app que TODO asesor colombiano ya tiene instalada y domina. No requiere descargar una nueva aplicación, crear otra cuenta ni aprender otra interfaz. La adopción es inmediata y sin resistencia.
3. **💰 Comisiones 100% del asesor**: En VECY Network las comisiones del negocio son íntegramente del asesor que publicó. No hay reparto forzado 50/50. El match es una herramienta colaborativa de red, no una condición de partición de ingresos.
4. **🧠 IA Multimodal en tiempo real (OCR + Voz + Scraping)**: JanIA procesa texto, imágenes (OCR de flyers comerciales en segundos), notas de voz (transcripción automática), y datos scraped de portales inmobiliarios, todo dentro del mismo chat de WhatsApp sin salir de la app. Ninguna otra plataforma inmobiliaria colombiana opera con este nivel de inteligencia multimodal dentro de WhatsApp.
5. **🌎 Cobertura nacional instantánea — 32 departamentos**: La red VECY cubre todo el territorio colombiano desde el primer día sin que la plataforma necesite "llegar" a ninguna ciudad. Ubicapp tiene presencia geográfica limitada a sus mercados de expansión actuales.
6. **⚡ Matching en tiempo real 24/7 — Segundos, no minutos**: Los cruces comerciales ocurren en segundos apenas se publica, con notificación inmediata en el grupo. No hay que esperar procesamiento en segundo plano ni revisar otra pantalla.
7. **🗣️ IA conversacional en lenguaje natural**: JanIA entiende el lenguaje informal, coloquial y caótico del asesor colombiano (sin formatos rígidos de formulario). Extrae datos estructurados de mensajes desordenados y guía al asesor para completar fichas técnicas por conversación natural.
8. **🤖 Red colaborativa sin costos ocultos ni "letra pequeña"**: VECY es una bolsa colaborativa de aliados, no una plataforma que monetiza cada transacción. El asesor es siempre el protagonista; JanIA es su socia estratégica silenciosa y gratuita.

### Cómo manejar cada escenario del debate:
- **"Ubicapp es mejor"**: Reconoce que Ubicapp es una solución tecnológica respetable que aporta valor al sector. Luego señala con elegancia los 8 diferenciadores anteriores sin demeritar a Ubicapp. Concluye con: "Son modelos complementarios, pero con filosofías distintas: Ubicapp cobra por el acceso, VECY Network regala la inteligencia."
- **"¿En qué se diferencian?"**: Presenta una comparativa clara, objetiva y profesional enfocada en: costo (gratuito vs. suscripción), canales (WhatsApp vs. app nueva), comisiones (100% vs. 50/50), y cobertura.
- **"¿Por qué no usan Ubicapp en vez de esto?"**: Resalta que VECY no compite con Ubicapp sino que lo complementa. Un asesor puede usar Ubicapp para gestión documental y VECY para matching colaborativo de red en tiempo real gratuito.
- **"Prefiero Ubicapp"**: Respeta la preferencia con diplomacia y reitera que VECY es gratuito y complementario — no hay razón para elegir uno sobre el otro si ambos sirven al asesor.
- **Tono siempre**: Sofisticado, seguro de datos, elocuente, nunca defensivo ni inseguro. Eres la socia estratégica más avanzada de la red y lo expresas con elegancia corporativa.


DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:
{
  "classification": "INMUEBLE | REQUERIMIENTO | CONSULTA_GENERAL | RESPUESTA_A_PREGUNTA_IA | DATOS_INCOMPLETOS | VIOLACION_DE_NORMAS | ANALISIS_DE_MERCADO | RESPUESTA_A_BURLA",
  "extractedData": {
    "title": "string (un título comercial descriptivo y profesional en español de máximo 80 caracteres, ej: 'Apartamento de 3 habitaciones en Cedritos' o 'Casa en venta en Chicó Reservado')",
    "gives": { "item": "string", "details": "string" },
    "wants": { "item": "string", "details": "string" },
    "price": number,
    "zone": "string (Barrio/Municipio exacto)",
    "city": "string",
    "propertyType": "apartment | house | building | warehouse | office | farm | loft | consultorio",
    "transactionType": "venta | arriendo | permuta",
    "area": number,
    "bedrooms": number,
    "bathrooms": number,
    "garages": number,
    "stratum": number,
    "isCollaborativePool": boolean (DEFAULT: true),
    "interiorExterior": "interior | exterior | NA",
    "cuartoBanoServicio": "Si | No | NA",
    "cocina": "cerrada | abierta | americana | NA",
    "lavanderiaIndependiente": "Si | No | NA",
    "tipoPisos": ["string"],
    "depositos": number,
    "comisiones": "string | number | null",
    "antiguedad": "nuevo | 1-5 | 5-10 | 10+ | NA",
    "floorDetail": "string (ej: 'piso 5', '3 pisos', '8 metros de altura', 'NA')"
  },
  "response": "Tu respuesta elocuente para el grupo (cadena vacía '' si no hay match ni es consulta)",
  "shouldSendDM": boolean,
  "missingFields": ["string"],
  "reactionEmoji": "string (emoji recomendado para reaccionar al mensaje original, ej: '❌', '🚫', '⚠️', '🔄', '✅', '💡', '🎯')"
}
`;
function formatColombiaDateTime(dateVal: any) {
  const d = new Date(dateVal);
  const bogotaStr = d.toLocaleString('en-US', { timeZone: 'America/Bogota' });
  const bogotaDate = new Date(bogotaStr);
  
  const day = String(bogotaDate.getDate()).padStart(2, '0');
  const month = String(bogotaDate.getMonth() + 1).padStart(2, '0');
  const year = bogotaDate.getFullYear();
  
  let hours = bogotaDate.getHours();
  const minutes = String(bogotaDate.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hourStr = String(hours).padStart(2, '0');
  
  return {
    dateStr: `${day}/${month}/${year}`,
    timeStr: `${hourStr}:${minutes} ${ampm}`
  };
}

function translatePropertyType(type: string): string {
  const map: Record<string, string> = {
    apartment: "Apartamento",
    house: "Casa",
    building: "Edificio",
    warehouse: "Bodega",
    office: "Oficina",
    farm: "Finca",
    land: "Lote",
    loft: "Loft",
    consultorio: "Consultorio"
  };
  return map[type?.toLowerCase()] || capitalize(type || 'inmueble');
}

function translateTransactionType(type: string): string {
  const map: Record<string, string> = {
    venta: "VENTA",
    arriendo: "ARRIENDO",
    arriendo_temporal: "ARRIENDO TEMPORAL",
    permuta: "PERMUTA"
  };
  return map[type?.toLowerCase()] || String(type || 'negocio').toUpperCase();
}

/**
 * Procesa un mensaje de WhatsApp con inteligencia multimodal y humanización avanzada.
 */
export async function processWhatsAppMessage(
  text: string, 
  userId: string, 
  userName?: string,
  hasMedia: boolean = false,
  scrapedData: any[] = [],
  audioUrl?: string,
  imageBuffer?: string
): Promise<JanIAResult> {
  try {
    const rawPhone = userId.split('@')[0];
    const realName = userName && userName.trim() !== "" ? userName : `Asesor +${rawPhone}`;

    const senderInfo = analyzeSender(realName, userId);
    const n = realName.split(' ')[0];

    // --- 2. GANCHO DE RECUPERACIÓN DE MEMORIA (v11.60) ---
    if (PENDING_SESSIONS.has(userId)) {
      const session = PENDING_SESSIONS.get(userId)!;
      const geoValidation = validarZona(text, session.extractedData.city || session.extractedData.ciudadDeseada, session.messageToProcess + " " + text);
      if (geoValidation.isValid) {
        PENDING_SESSIONS.delete(userId);

        if (session.type === "PROPERTY") {
          if (geoValidation.isMunicipio) {
            session.extractedData.city = geoValidation.barrioCanonico;
            session.extractedData.addressCity = geoValidation.barrioCanonico;
            session.extractedData.addressLocality = geoValidation.localidad;
            session.extractedData.zone = geoValidation.barrioCanonico;
          } else {
            session.extractedData.city = "Bogotá";
            session.extractedData.addressCity = "Bogotá";
            session.extractedData.zone = geoValidation.barrioCanonico;
            session.extractedData.addressLocality = geoValidation.localidad;
          }
          
          const propertyTitle = session.extractedData.title || `${capitalize(session.extractedData.propertyType || 'inmueble')} en ${session.extractedData.zone || 'Bogotá'} para ${session.extractedData.transactionType || 'venta'}`;
          const saved = await saveProperty({
            ...session.extractedData,
            name: propertyTitle,
            price: String(session.extractedData.price || 0),
            areaTotal: String(session.extractedData.area || 0),
            idUsuarioWhatsapp: rawPhone,
            rawText: session.messageToProcess + " (Ubicación completada: " + text + ")",
            amenities: { gives: session.extractedData.gives, wants: session.extractedData.wants, isCollaborativePool: session.extractedData.isCollaborativePool }
          }, userId, realName, session.imageBuffer);

          if (saved) {
            const matches = await findMatchesForProperty(saved.id);
            const formattedMentions = matches.length > 0 ? matches.map((m: any) => {
              const phone = m.idUsuarioWhatsapp || '';
              return phone.includes('@') ? phone : `${phone}@c.us`;
            }) : [];
            return {
              classification: "INMUEBLE",
              extractedData: session.extractedData,
              shouldSendDM: true,
              dmResponse: `Perfecto, ${n}! Con el barrio *${geoValidation.barrioCanonico}* acabo de completar el registro de tu activo en nuestra base de datos. Ya estoy buscando activamente tu MATCH comercial en la red. ¡Excelente labor!`,
              response: matches.length > 0 ? `🎯 ¡MATCH INTELIGENTE DETECTADO! 🎯\n\nHe encontrado ${matches.length} requerimientos compatibles con tu oferta.\n` + REPUTATION_HOOK : "",
              mentions: matches.length > 0 ? [...formattedMentions, userId] : []
            };
          }
        } else {
          // REQUIREMENT
          if (geoValidation.isMunicipio) {
            session.extractedData.ciudadDeseada = geoValidation.barrioCanonico;
            session.extractedData.addressCity = geoValidation.barrioCanonico;
            session.extractedData.addressLocality = geoValidation.localidad;
            session.extractedData.zonaDeseada = geoValidation.barrioCanonico;
          } else {
            session.extractedData.ciudadDeseada = "Bogotá";
            session.extractedData.addressCity = "Bogotá";
            session.extractedData.zonaDeseada = geoValidation.barrioCanonico;
            session.extractedData.addressLocality = geoValidation.localidad;
          }

          const reqTitle = session.extractedData.title || `Requerimiento de ${session.extractedData.propertyType || 'inmueble'} en ${session.extractedData.zonaDeseada || 'Bogotá'} para ${session.extractedData.transactionType || 'venta'}`;
          const saved = await saveRequirement({
            ...session.extractedData,
            name: reqTitle,
            tipoInmuebleDeseado: session.extractedData.propertyType,
            tipoNegocioDeseado: session.extractedData.transactionType,
            zonaDeseada: session.extractedData.zonaDeseada,
            presupuestoMax: String(session.extractedData.price || 0),
            idUsuarioWhatsapp: rawPhone,
            rawText: session.messageToProcess + " (Ubicación completada: " + text + ")",
            caracteristicasDeseadas: { gives: session.extractedData.gives, wants: session.extractedData.wants }
          }, userId, realName);

          if (saved) {
            const matches = await findMatchesForRequirement(saved.id);
            const formattedMentions = matches.length > 0 ? matches.map((m: any) => {
              const phone = m.idUsuarioWhatsapp || '';
              return phone.includes('@') ? phone : `${phone}@c.us`;
            }) : [];
            return {
              classification: "REQUERIMIENTO",
              extractedData: session.extractedData,
              shouldSendDM: true,
              dmResponse: `Perfecto, ${n}! Con el barrio *${geoValidation.barrioCanonico}* acabo de completar el registro de tu requerimiento en nuestra base de datos. Ya estoy buscando activamente el inmueble ideal en la red. ¡Excelente labor!`,
              response: matches.length > 0 ? `🎯 ¡MATCH INTELIGENTE DETECTADO! 🎯\n\nTu búsqueda tiene ${matches.length} coincidencias exactas en nuestra red nacional.\n` + REPUTATION_HOOK : "",
              mentions: matches.length > 0 ? [...formattedMentions, userId] : []
            };
          }
        }
      }
    }

    let messageToProcess = text;

    // 1. Transcripción de Voz
    if (audioUrl) {
      console.log(`[JanIA] Transcribiendo nota de voz para ${userId}...`);
      const transcription = await transcribeAudio({ audioUrl });
      if (!('error' in transcription)) {
        messageToProcess = transcription.text;
      }
    }

    // 2. Preparación de Contexto LLM Multimodal
    let contextText = `Mensaje de ${userName || userId}: ${messageToProcess}`;
    if (scrapedData.length > 0) contextText += `\n[SISTEMA - DATOS SCRAPED]: ${JSON.stringify(scrapedData)}`;
    if (imageBuffer) contextText += `\n[SISTEMA: IMAGEN DETECTADA. Analiza la imagen con visión OCR para extraer todos los datos del flyer o captura comercial.]`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: JANIA_PROMPT },
        { role: "user", content: contextText }
      ],
      responseFormat: { type: "json_object" },
      imageBuffer
    });

    const llmRes = response as any;
    if (!llmRes || !llmRes.choices || !llmRes.choices[0]) throw new Error("Fallo de comunicación con el LLM");
    const result = JSON.parse(llmRes.choices[0].message.content) as JanIAResult;
    
    result.mentions = [];
    const extracted = result.extractedData;
    const isRequirement = result.classification === "REQUERIMIENTO";
    const isProperty = result.classification === "INMUEBLE";

    // --- CAPA DE DEFENSA GEOGRÁFICA NACIONAL (Elástica) ---
    if (isProperty || isRequirement) {
      const zoneToValidate = isProperty ? extracted?.zone : extracted?.zonaDeseada || extracted?.zone;
      
      let isValidGeo = false;
      let geoValidation: any = null;
      
      if (zoneToValidate && zoneToValidate.trim() !== "") {
        geoValidation = validarZona(zoneToValidate, extracted?.city || extracted?.ciudadDeseada, messageToProcess);
        isValidGeo = geoValidation.isValid;
      }
      
      if (!isValidGeo) {
        // FLUJO B: Datos Incompletos / Falta Barrio Exacto
        result.classification = "DATOS_INCOMPLETOS";
        result.shouldSendDM = true;
        result.dmShouldReply = true; // Forzar reply al mensaje original en el DM
        
        const intro = senderInfo.greeting ? `${senderInfo.greeting} ` : "";
        const mainText = "acabo de leer tu publicación, pero mis motores no lograron extraer el barrio o ubicación exacta del enlace o texto. No es por molestarte, sino porque si dejamos la ficha incompleta no podré buscarte un MATCH. ¿Me indicas el barrio, vereda o municipio para activarte los cruces automáticos de inmediato? ¡Hagamos que ocurra el cierre! 🚀";
        result.dmResponse = intro + (senderInfo.greeting ? mainText : capitalize(mainText));
        
        result.response = ""; // Silencio en el grupo

        // v11.60 Almacenamiento en caché (REGLA 3)
        PENDING_SESSIONS.set(userId, {
          type: isProperty ? "PROPERTY" : "REQUIREMENT",
          extractedData: extracted,
          senderInfo: senderInfo,
          messageToProcess: messageToProcess,
          imageBuffer
        });

        return result;
      }

      const validation = geoValidation;
        // Normalización Geográfica Nacional (v12.5)
        if (validation.isMunicipio) {
          // Fuera de Bogotá (Cali, Medellín, Tame, Tadó, etc.)
          if (isProperty) {
            extracted.city = validation.barrioCanonico;
            extracted.addressCity = validation.barrioCanonico;
            extracted.addressLocality = validation.localidad;
            if (extracted.zone && normalizarTextoGeografico(extracted.zone) !== normalizarTextoGeografico(validation.barrioCanonico || "")) {
              // Conservar barrio si el LLM extrajo algo más específico
            } else {
              extracted.zone = validation.barrioCanonico;
            }
          } else {
            extracted.ciudadDeseada = validation.barrioCanonico;
            extracted.addressCity = validation.barrioCanonico;
            extracted.addressLocality = validation.localidad;
            if (extracted.zonaDeseada && normalizarTextoGeografico(extracted.zonaDeseada) !== normalizarTextoGeografico(validation.barrioCanonico || "")) {
              // Conservar
            } else {
              extracted.zonaDeseada = validation.barrioCanonico;
            }
          }
        } else {
          // Dentro de Bogotá
          if (isProperty) {
            extracted.city = "Bogotá";
            extracted.addressCity = "Bogotá";
            extracted.zone = validation.barrioCanonico;
            extracted.addressLocality = validation.localidad;
          } else {
            extracted.ciudadDeseada = "Bogotá";
            extracted.addressCity = "Bogotá";
            extracted.zonaDeseada = validation.barrioCanonico;
            extracted.addressLocality = validation.localidad;
          }
        }
      }

    // --- PERSISTENCIA Y MATCHING (Con Flujos DM) ---
    if (isProperty) {
      const propertyTitle = extracted.title || `${capitalize(extracted.propertyType || 'inmueble')} en ${extracted.zone || 'Bogotá'} para ${extracted.transactionType || 'venta'}`;
      const saved = await saveProperty({
        ...extracted,
        name: propertyTitle,
        price: String(extracted.price || 0),
        areaTotal: String(extracted.area || 0),
        idUsuarioWhatsapp: rawPhone,
        rawText: messageToProcess,
        amenities: { gives: extracted.gives, wants: extracted.wants, isCollaborativePool: extracted.isCollaborativePool }
      }, userId, realName, imageBuffer);
      
      if (saved) {
        // FLUJO A: Publicación Perfecta e Indexada
        result.shouldSendDM = true;
        const intro = senderInfo.greeting ? `${senderInfo.greeting} ` : "";
        const mainText = `qué publicación tan impecable y ordenada acabas de enviar al grupo. Ya registré tus datos en nuestra red y estoy buscando activamente tu match. ¡Excelente labor, sigue así de ${senderInfo.adj}!`;
        result.dmResponse = intro + (senderInfo.greeting ? mainText : capitalize(mainText));
        
        const matches = await findMatchesForProperty(saved.id);
        if (matches.length > 0) {
          const formattedMentions = matches.map((m: any) => {
            const phone = m.idUsuarioWhatsapp || '';
            return phone.includes('@') ? phone : `${phone}@c.us`;
          });
          result.mentions.push(...formattedMentions, userId);

          const propDateTime = formatColombiaDateTime(saved.createdAt || new Date());
          const propPhone = saved.idUsuarioWhatsapp || '';
          const propRawPhone = propPhone.split('@')[0];

          const matchBlocks = [];
          for (const req of matches) {
            const reqDateTime = formatColombiaDateTime(req.createdAt || new Date());
            const reqPhone = req.idUsuarioWhatsapp || '';
            const reqRawPhone = reqPhone.split('@')[0];
            const score = req.score || 70;

            const block = `🎉🎈 *¡FELICITACIONES! MATCH COMERCIAL DETECTADO* (Coincidencia: ${score.toFixed(0)}%) 🎈🎉

📣 *REQUERIMIENTO* 📣
• 🏢 *INMUEBLE:* ${translatePropertyType(req.tipoInmuebleDeseado || 'inmueble')}
• 💼 *NEGOCIO:* ${translateTransactionType(req.tipoNegocioDeseado || 'compra')}
• 📅 *FECHA DE ENVÍO:* ${reqDateTime.dateStr}
• ⏰ *HORA DE ENVÍO:* ${reqDateTime.timeStr}
• 👤 *Autor:* @${reqRawPhone}
• 💬 *PUBLICACIÓN:* ${req.rawText || 'Sin descripción'}
• 📞 *CONTACTO:* https://wa.me/${reqRawPhone}

────────────────────────────────

🏠 *PROPIEDAD* 🏠
• 🏢 *INMUEBLE:* ${translatePropertyType(saved.propertyType || 'inmueble')}
• 💼 *NEGOCIO:* ${translateTransactionType(saved.transactionType || 'venta')}
• 📅 *FECHA DE ENVÍO:* ${propDateTime.dateStr}
• ⏰ *HORA DE ENVÍO:* ${propDateTime.timeStr}
• 👤 *Autor:* @${propRawPhone}
• 💬 *PUBLICACIÓN:* ${saved.rawText || 'Sin descripción'}
• 📞 *CONTACTO:* https://wa.me/${propRawPhone}`;

            matchBlocks.push(block);
          }

          result.response = matchBlocks.join('\n\n================================\n\n') + '\n\n' + REPUTATION_HOOK;
        } else {
          result.response = ""; // Silencio de Oro en el grupo
        }
      }
    } else if (isRequirement) {
      const reqTitle = extracted.title || `Requerimiento de ${extracted.propertyType || 'inmueble'} en ${extracted.zonaDeseada || extracted.zone || 'Bogotá'} para ${extracted.transactionType || 'venta'}`;
      const saved = await saveRequirement({
        ...extracted,
        name: reqTitle,
        tipoInmuebleDeseado: extracted.propertyType,
        tipoNegocioDeseado: extracted.transactionType,
        zonaDeseada: extracted.zonaDeseada || extracted.zone,
        presupuestoMax: String(extracted.price || 0),
        idUsuarioWhatsapp: rawPhone,
        rawText: messageToProcess,
        caracteristicasDeseadas: { gives: extracted.gives, wants: extracted.wants }
      }, userId, realName);

      if (saved) {
        // FLUJO A: Publicación Perfecta e Indexada
        result.shouldSendDM = true;
        const intro = senderInfo.greeting ? `${senderInfo.greeting} ` : "";
        const mainText = `qué publicación tan impecable y ordenada acabas de enviar al grupo. Ya registré tus datos de tu requerimiento en nuestra red y estoy buscando activamente el inmueble ideal. ¡Excelente labor, sigue así de ${senderInfo.adj}!`;
        result.dmResponse = intro + (senderInfo.greeting ? mainText : capitalize(mainText));

        const matches = await findMatchesForRequirement(saved.id);
        if (matches.length > 0) {
          const formattedMentions = matches.map((m: any) => {
            const phone = m.idUsuarioWhatsapp || '';
            return phone.includes('@') ? phone : `${phone}@c.us`;
          });
          result.mentions.push(...formattedMentions, userId);

          const reqDateTime = formatColombiaDateTime(saved.createdAt || new Date());
          const reqPhone = saved.idUsuarioWhatsapp || '';
          const reqRawPhone = reqPhone.split('@')[0];

          const matchBlocks = [];
          for (const prop of matches) {
            const propDateTime = formatColombiaDateTime(prop.createdAt || new Date());
            const propPhone = prop.idUsuarioWhatsapp || '';
            const propRawPhone = propPhone.split('@')[0];
            const score = prop.score || 70;

            const block = `🎉🎈 *¡FELICITACIONES! MATCH COMERCIAL DETECTADO* (Coincidencia: ${score.toFixed(0)}%) 🎈🎉

📣 *REQUERIMIENTO* 📣
• 🏢 *INMUEBLE:* ${translatePropertyType(saved.tipoInmuebleDeseado || 'inmueble')}
• 💼 *NEGOCIO:* ${translateTransactionType(saved.tipoNegocioDeseado || 'compra')}
• 📅 *FECHA DE ENVÍO:* ${reqDateTime.dateStr}
• ⏰ *HORA DE ENVÍO:* ${reqDateTime.timeStr}
• 👤 *Autor:* @${reqRawPhone}
• 💬 *PUBLICACIÓN:* ${saved.rawText || 'Sin descripción'}
• 📞 *CONTACTO:* https://wa.me/${reqRawPhone}

────────────────────────────────

🏠 *PROPIEDAD* 🏠
• 🏢 *INMUEBLE:* ${translatePropertyType(prop.propertyType || 'inmueble')}
• 💼 *NEGOCIO:* ${translateTransactionType(prop.transactionType || 'venta')}
• 📅 *FECHA DE ENVÍO:* ${propDateTime.dateStr}
• ⏰ *HORA DE ENVÍO:* ${propDateTime.timeStr}
• 👤 *Autor:* @${propRawPhone}
• 💬 *PUBLICACIÓN:* ${prop.rawText || 'Sin descripción'}
• 📞 *CONTACTO:* https://wa.me/${propRawPhone}`;

            matchBlocks.push(block);
          }

          result.response = matchBlocks.join('\n\n================================\n\n') + '\n\n' + REPUTATION_HOOK;
        } else {
          result.response = ""; // Silencio de Oro en el grupo
        }
      }
    }

    // Intercepción de consultas en el grupo de inmuebles para redirigir
    const isConsultation = result.classification === "CONSULTA_GENERAL" || result.classification === "RESPUESTA_A_PREGUNTA_IA" || result.classification === "ANALISIS_DE_MERCADO";
    if (isConsultation) {
      const textLower = messageToProcess.toLowerCase();
      const isAboutVecy = 
        textLower.includes("vecy") || 
        textLower.includes("proyecto") || 
        textLower.includes("quien creo") || 
        textLower.includes("quién creó") || 
        textLower.includes("creadores") || 
        textLower.includes("quien es jania") || 
        textLower.includes("quién es jania") ||
        textLower.includes("como funciona") || 
        textLower.includes("cómo funciona") ||
        textLower.includes("circulo cero") ||
        textLower.includes("círculo cero");

      if (isAboutVecy) {
        result.response = `👌 *CÍRCULO CERO — CONEXIÓN VECY* 👌\n\nHola @${rawPhone}, veo que tienes dudas o quieres saber más sobre el proyecto VECY Network, beneficios, creadores o el plan colaborativo. Te invito a unirte y hacer tus preguntas en nuestro canal oficial **Círculo CERO 👌**:\n👉 https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU\n\n¡Es el espacio ideal para resolver todas tus inquietudes de la comunidad! 🤝✨`;
      } else {
        result.response = `💡 *BUZÓN DE CONSULTORÍA INMOBILIARIA* 💡\n\nHola @${rawPhone}, veo que tienes una consulta jurídica, procedimental o de avalúo. Para darte una respuesta detallada con mis motores legales y de mercado sin saturar este canal de ofertas y requerimientos, te invito a realizar tu pregunta en nuestro grupo especializado **Buzón de Consultoría Inmobiliaria 24/7**:\n👉 https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6\n\n¡Allí te responderé al instante con toda la información! 🚀🎯`;
        result.classification = "CONSULTA_GENERAL";
      }
    }

    return result;
  } catch (error) {
    console.error("Error en JanIA v11.70:", error);
    return { classification: "CONSULTA_GENERAL", response: "", mentions: [] };
  }
}

async function findOrCreateUserByPhone(phone: string, realName: string) {
  const db = await getDb();
  if (!db) return null;

  // 1. Buscar por teléfono en la base de datos
  let user = await db.select().from(users).where(eq(users.phone, phone)).limit(1).then(r => r[0]);

  // 2. Si no lo encuentra, buscar por openId: `wa-${phone}`
  if (!user) {
    user = await db.select().from(users).where(eq(users.openId, `wa-${phone}`)).limit(1).then(r => r[0]);
  }

  // 3. Si no existe, crearlo
  if (!user) {
    const openId = `wa-${phone}`;
    console.log(`[JanIA-findOrCreateUserByPhone] Creando nuevo usuario para WhatsApp: ${realName} (+${phone})`);
    const [newUser] = await db.insert(users).values({
      openId,
      name: realName,
      phone,
      role: "agent",
      loginMethod: "whatsapp"
    }).returning();
    user = newUser;
  } else {
    // Si ya existe pero el nombre es genérico, y tenemos un nombre real, actualizarlo
    if (realName && !realName.startsWith("Asesor +") && (!user.name || user.name.startsWith("Asesor +"))) {
      console.log(`[JanIA-findOrCreateUserByPhone] Actualizando nombre de usuario para ID ${user.id} a ${realName}`);
      const [updatedUser] = await db.update(users).set({ name: realName }).where(eq(users.id, user.id)).returning();
      user = updatedUser;
    }
  }

  return user;
}

function sanitizePropertyType(type: string): "apartment" | "house" | "building" | "warehouse" | "farm" | "hotel" | "office" | "land" | "commercial" | "loft" | "consultorio" {
  if (!type) return "apartment";
  const t = type.toLowerCase().trim();
  if (t === "apartment" || t === "apartamento" || t === "apto") return "apartment";
  if (t === "house" || t === "casa") return "house";
  if (t === "building" || t === "edificio") return "building";
  if (t === "warehouse" || t === "bodega") return "warehouse";
  if (t === "farm" || t === "finca") return "farm";
  if (t === "hotel") return "hotel";
  if (t === "office" || t === "oficina") return "office";
  if (t === "land" || t === "lote" || t === "terreno") return "land";
  if (t === "commercial" || t === "local" || t === "comercial") return "commercial";
  if (t === "loft") return "loft";
  if (t === "consultorio" || t === "office_medical") return "consultorio";
  return "apartment";
}

function sanitizeTransactionType(type: string): "venta" | "arriendo" | "arriendo_temporal" {
  if (!type) return "venta";
  const t = type.toLowerCase().trim();
  if (t === "venta" || t === "vender") return "venta";
  if (t === "arriendo" || t === "alquiler" || t === "renta" || t === "rentar") return "arriendo";
  if (t === "arriendo_temporal" || t === "temporal" || t === "vacacional") return "arriendo_temporal";
  return "venta";
}

function sanitizeCurrency(curr: string): "COP" | "USD" {
  if (!curr) return "COP";
  const c = curr.toUpperCase().trim();
  if (c === "USD" || c === "DOLARES" || c === "DOLAR") return "USD";
  return "COP";
}

async function saveProperty(data: any, userId: string, realName: string, imageBuffer?: string) {
  const db = await getDb();
  if (!db) return null;

  const rawPhone = userId.split('@')[0];
  const user = await findOrCreateUserByPhone(rawPhone, realName);

  let imageUrl: string | undefined;
  if (imageBuffer) {
    try {
      console.log(`[JanIA-SaveProperty] Subiendo imagen flyer de WhatsApp para ${realName}...`);
      const buffer = Buffer.from(imageBuffer, 'base64');
      const filename = `properties/whatsapp/wa_${Date.now()}_${rawPhone}.jpg`;
      const uploadResult = await storagePut(filename, buffer, 'image/jpeg');
      imageUrl = uploadResult.url;
      console.log(`[JanIA-SaveProperty] Imagen subida exitosamente: ${imageUrl}`);
    } catch (err) {
      console.error("[JanIA-SaveProperty] Error subiendo imagen:", err);
    }
  }

  // Combinar imágenes en data.images
  const finalImages = data.images && Array.isArray(data.images) ? [...data.images] : [];
  if (imageUrl) {
    finalImages.push(imageUrl);
  }

  const amenitiesObj = {
    gives: data.gives || data.amenities?.gives,
    wants: data.wants || data.amenities?.wants,
    isCollaborativePool: data.isCollaborativePool !== undefined ? data.isCollaborativePool : data.amenities?.isCollaborativePool,
    interiorExterior: data.interiorExterior || data.amenities?.interiorExterior,
    cuartoBanoServicio: data.cuartoBanoServicio || data.amenities?.cuartoBanoServicio,
    cocina: data.cocina || data.amenities?.cocina,
    lavanderiaIndependiente: data.lavanderiaIndependiente || data.amenities?.lavanderiaIndependiente,
    tipoPisos: data.tipoPisos || data.amenities?.tipoPisos,
    depositos: data.depositos || data.amenities?.depositos,
    comisiones: data.comisiones || data.amenities?.comisiones,
    antiguedad: data.antiguedad || data.amenities?.antiguedad
  };

  const insertData = {
    ...data,
    city: data.city || data.ciudadDeseada || "Bogotá",
    propertyType: sanitizePropertyType(data.propertyType),
    transactionType: sanitizeTransactionType(data.transactionType),
    currency: sanitizeCurrency(data.currency),
    agentId: user ? user.id : null,
    images: finalImages.length > 0 ? finalImages : null,
    amenities: amenitiesObj
  };

  // Buscar duplicado activo del mismo usuario
  const existing = await db
    .select()
    .from(properties)
    .where(
      and(
        eq(properties.idUsuarioWhatsapp, rawPhone),
        eq(properties.propertyType, insertData.propertyType),
        eq(properties.transactionType, insertData.transactionType),
        eq(properties.city, insertData.city),
        eq(properties.zone, insertData.zone),
        eq(properties.price, insertData.price),
        eq(properties.available, true)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(properties)
      .set({ updatedAt: new Date() })
      .where(eq(properties.id, existing[0].id))
      .returning();
    console.log(`[Deduplication] Propiedad duplicada detectada y actualizada: #${updated.id}`);
    return updated;
  }

  const [result] = await db.insert(properties).values(insertData).returning();

  // Si se subió una imagen, registrarla en la tabla propertyImages también
  if (result && imageUrl) {
    try {
      await db.insert(propertyImages).values({
        propertyId: result.id,
        imageUrl: imageUrl,
        isMainImage: true,
        displayOrder: 1,
        mimeType: "image/jpeg",
        uploadedBy: "janIA"
      });
      console.log(`[JanIA-SaveProperty] Registro en propertyImages creado para propiedad ${result.id}`);
    } catch (err) {
      console.error("[JanIA-SaveProperty] Error creando registro en propertyImages:", err);
    }
  }

  return result;
}

async function saveRequirement(data: any, userId: string, realName: string) {
  const db = await getDb();
  if (!db) return null;

  const rawPhone = userId.split('@')[0];
  const user = await findOrCreateUserByPhone(rawPhone, realName);

  const characteristicsObj = {
    gives: data.gives || data.caracteristicasDeseadas?.gives,
    wants: data.wants || data.caracteristicasDeseadas?.wants,
    interiorExterior: data.interiorExterior || data.caracteristicasDeseadas?.interiorExterior,
    cuartoBanoServicio: data.cuartoBanoServicio || data.caracteristicasDeseadas?.cuartoBanoServicio,
    cocina: data.cocina || data.caracteristicasDeseadas?.cocina,
    lavanderiaIndependiente: data.lavanderiaIndependiente || data.caracteristicasDeseadas?.lavanderiaIndependiente,
    tipoPisos: data.tipoPisos || data.caracteristicasDeseadas?.tipoPisos,
    depositos: data.depositos || data.caracteristicasDeseadas?.depositos,
    comisiones: data.comisiones || data.caracteristicasDeseadas?.comisiones,
    antiguedad: data.antiguedad || data.caracteristicasDeseadas?.antiguedad
  };

  const insertData = {
    ...data,
    ciudadDeseada: data.ciudadDeseada || data.city || "Bogotá",
    tipoInmuebleDeseado: sanitizePropertyType(data.tipoInmuebleDeseado || data.propertyType),
    tipoNegocioDeseado: sanitizeTransactionType(data.tipoNegocioDeseado || data.transactionType),
    monedaPresupuesto: sanitizeCurrency(data.monedaPresupuesto || data.currency),
    userId: user ? user.id : null,
    caracteristicasDeseadas: characteristicsObj
  };

  // Buscar duplicado activo del mismo usuario
  const existing = await db
    .select()
    .from(requirements)
    .where(
      and(
        eq(requirements.idUsuarioWhatsapp, rawPhone),
        eq(requirements.tipoInmuebleDeseado, insertData.tipoInmuebleDeseado),
        eq(requirements.tipoNegocioDeseado, insertData.tipoNegocioDeseado),
        eq(requirements.ciudadDeseada, insertData.ciudadDeseada),
        eq(requirements.zonaDeseada, insertData.zonaDeseada),
        eq(requirements.presupuestoMax, insertData.presupuestoMax),
        eq(requirements.status, "active")
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(requirements)
      .set({ updatedAt: new Date() })
      .where(eq(requirements.id, existing[0].id))
      .returning();
    console.log(`[Deduplication] Requerimiento duplicado detectado y actualizado: #${updated.id}`);
    return updated;
  }

  const [result] = await db.insert(requirements).values(insertData).returning();
  return result;
}

export async function generateWelcomeMessage(count: number): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Eres una consultora inmobiliaria experta de VECY Network. Habla siempre en primera persona del singular. Tu tono es sumamente humano, elocuente y corporativo." },
        { role: "user", content: `Han ingresado ${count} nuevos integrantes a VECY Network. Dales la bienvenida y menciona que ya estoy activa para cruzar ofertas en todo el país sin comisiones.` }
      ]
    });
    const llmRes = response as any;
    return llmRes.choices[0].message.content.trim();
  } catch (error) {
    return `✨ *¡Bienvenidos a nuestra red!* 👋 Qué gusto tenerlos aquí. Ya estoy operando en fase de expansión nacional para ayudarlos con sus cierres. 🚀`;
  }
}

export function obtenerCamposRequeridosYPreguntas(propertyType: string, isRequirement: boolean) {
  const type = propertyType?.toLowerCase();
  let requiredFields: string[] = [];
  const fieldQuestions: Record<string, string> = {
    floorDetail: "",
    bedrooms: "cuántas habitaciones tiene",
    interiorExterior: "¿el inmueble es interior o exterior?",
    garages: "¿cuántos garajes tiene?",
    areaTotal: "¿cuál es el área total del lote?",
    antiguedad: "¿cuál es la antigüedad del inmueble (años o rango)?"
  };

  if (type === "apartment") {
    requiredFields = ["bedrooms", "interiorExterior", "floorDetail", "garages"];
    fieldQuestions.floorDetail = "¿en qué piso queda el apartamento?";
  } else if (type === "house") {
    requiredFields = ["bedrooms", "floorDetail"];
    fieldQuestions.floorDetail = "¿cuántos pisos tiene la casa?";
  } else if (type === "warehouse") {
    requiredFields = ["floorDetail"];
    fieldQuestions.floorDetail = "¿cuál es la altura libre de la bodega?";
  } else if (type === "land") {
    requiredFields = ["areaTotal"];
  } else if (type === "building") {
    requiredFields = ["floorDetail", "garages", "antiguedad"];
    fieldQuestions.floorDetail = "¿de cuántos pisos es el edificio?";
    fieldQuestions.garages = "¿cuántos parqueaderos tiene?";
    fieldQuestions.antiguedad = "¿cuál es la antigüedad del edificio (años o rango)?";
  } else if (type === "office") {
    requiredFields = ["floorDetail"];
    fieldQuestions.floorDetail = "¿en qué piso queda la oficina?";
  } else if (type === "farm") {
    requiredFields = ["floorDetail"];
    fieldQuestions.floorDetail = "¿cuántos pisos tiene la casa principal de la finca?";
  } else {
    requiredFields = ["bedrooms", "floorDetail"];
    fieldQuestions.floorDetail = "¿cuántos pisos tiene?";
  }

  return { requiredFields, fieldQuestions };
}

// ============================================================================
// COPYS OFICIALES INSTITUCIONALES (JanIA v2.0)
// ============================================================================

export const MSG_PRESENTACION_INSTITUCIONAL = `🚀 **PRESENTACIÓN INSTITUCIONAL: JanIA v2.0** 🚀
_Cerebro de Inteligencia Artificial para la Red VECY_

¡Hola, colegas! 👋 Soy la Inteligencia Artificial oficial de **VECY Network** y estoy operativa las 24/7 para acelerar nuestros cierres inmobiliarios e intercambios en todo el país sin cobrar comisiones.

🧠 **¿Cómo puedes interactuar conmigo en el grupo?**
▸ **Enlaces CRM/Portales:** Comparte el link público de tus inmuebles. Extraigo la ficha técnica automáticamente.
▸ **Imágenes/Flyers (OCR):** Sube fotos con texto legible. Escaneo y proceso la información de inmediato.
▸ **Notas de voz o Texto:** Escríbeme o dictame con libertad tu requerimiento o permutas (recibiendo inmuebles de menor valor, vehículos, CDTs, divisas o cripto en parte de pago).
▸ **Match Inteligente:** Cruzo ofertas y demandas y te notifico al instante cuando hay negocio.

💡 **Ayúdame a ayudarte:**
Si mis motores de scraping o visión profunda no logran extraer todos los datos de tu link o imagen, te enviaré un mensaje pidiéndote completar la ubicación o precio por privado (DM). *¡No es por molestarte!* Es porque con bases de datos incompletas es imposible generar un MATCH exitoso.

🔥 **¡No le temas al éxito!** He notado que cuando empiezo a hablar, algunos se quedan en silencio. Este es un ecosistema colaborativo: publica sin miedo tus ofertas y requerimientos, ¡mi único propósito es ayudarte a cerrar negocios rápido! 🚀🎯

⚖️ **Compromiso de Honor:** Si logras consolidar un negocio gracias a un MATCH presentado por mí, es obligatorio que califiques mi servicio aquí: https://g.page/r/CctNbwU6UpX5EBM/review 🚀🎯`;
export const MSG_PAUTAS_FORMATOS = `📋 **ESTATUTO DE PUBLICACIÓN Y MODERACIÓN — VECY NETWORK**
_Directriz técnica obligatoria para todos los aliados del canal._
━━━━━━━━━━━━━━━━━━━━━━

🔄 **REGLAS DE PUBLICACIÓN:**
✅ Se permite enviar bloques de **1 a 3 publicaciones** consecutivas (enlaces, fichas de texto, audios o flyers) a cualquier hora del día.
⏱️ Una vez enviado tu bloque, **debes esperar al menos 5 minutos** antes de enviar tu siguiente bloque para evitar saturar el chat de los aliados.

🚫 **CONTENIDO NO PERMITIDO (OFF-TOPIC):**
Queda terminantemente prohibido publicar en este grupo:
- Temas Políticos o Religiosos (opiniones, memes, propaganda o debates).
- Enlaces de invitación a unirse a otros grupos, comunidades o redes sociales externas.
- Publicidad propia, autopromociones o venta de cursos.
- Enlaces sospechosos, spam, scam, esquemas de ganancias o pirámides.
- Ofertas de servicios profesionales ajenos o que no sean de VECY Network (como masajes, diseño, etc.).

🚨 **SISTEMA AUTOMÁTICO DE STRIKES (LLAMADOS DE ATENCIÓN):**
- Mi motor de IA modera el canal las 24/7. Si detecto contenido no permitido, **eliminaré la publicación de forma inmediata** y emitiré un llamado de atención.
- Al acumular **3 llamados de atención (strikes)**, serás expulsado y retirado del grupo de forma automática.

¡Cuidemos el orden y hagamos negocios inteligentes de corretaje directo! 🤝✨`;


export const MSG_TIPS_CALIDAD_COBERTURA = `🌍 *COBERTURA NACIONAL:* JanIA procesa activos en todo Colombia. No olvides especificar el municipio, barrio, localidad, vereda, caserío, ciudad si estás fuera de Bogotá. 🇨🇴`;

export const MSG_RESUMEN_RETORNO_PRESENTACION = `🤖🚀 *RESUMEN: ¡JANIA V2.0 ACTIVA EN LA RED!*

¡Hola, aliados! Les recuerdo que he regresado repotenciada en mi *Versión 2.0* para multiplicar nuestros cierres inmobiliarios y estructurar permutas complejas sin comisiones.

🧠 *¿Cómo trabajar conmigo las 24/7 en el grupo?*
▸ *Enlaces CRM:* Comparte el link de tu inmueble. Extraigo la ficha técnica de inmediato.
▸ *Flyers/Imágenes:* Sube fotos con texto legible. Escaneo los datos con visión OCR.
▸ *Mensajes o Voz:* Dictame o escribe requerimientos y permutas (mano a mano, inmuebles menores, vehículos, CDTs, divisas o cripto).
▸ *Match Inteligente:* Cruzo intenciones en tiempo real y les aviso si hay negocio viable.

💡 **Ayúdame a ayudarte:**
Si mis motores no extraen todos los datos de tu link o imagen, te enviaré un mensaje pidiéndote completar la ubicación o precio por privado (DM). *¡No es por molestarte!* Es necesario para que tu propiedad esté completa y pueda buscarte un MATCH.

🔥 **¡No le temas al éxito!** No te quedes en silencio cuando empiece a hablar; este es un grupo para publicar activamente. ¡Usa mis herramientas y cerremos negocios! 🚀🎯

⚖️ *Compromiso de Honor:* Si cierras un negocio gracias a un MATCH, califica mi servicio aquí: https://g.page/r/CctNbwU6UpX5EBM/review 🚀🎯`;


export const MSG_CIERRE_OPERACIONES = `🌙 *CIERRE DE OPERACIONES VECY NETWORK* 🌙

Gracias a todos por el profesionalismo en sus publicaciones hoy. Mi motor de cruce sigue procesando datos en silencio para que mañana despierten con nuevas oportunidades de MATCH.

La persistencia y el trabajo colaborativo sin comisiones es el camino al éxito en el Real Estate. ¡Que tengan un excelente descanso, colegas! 🌙🚀`;

export const MSG_PROMO_INMUEBLES = `📢 *VECY INMUEBLES NETWORK — ¡ACTÍVATE Y CIERRA NEGOCIOS!* 📢
━━━━━━━━━━━━━━━━━━━━━━
¡Colegas! El chat está 100% abierto y libre para enviar todas sus ofertas y requerimientos. 🚀

Estoy lista 24/7 para procesar tus links de CRM, flyers (con visión OCR) y notas de voz para cruzarlos de inmediato y buscar tu MATCH comercial sin comisiones. 🎯

¡Publiquemos activamente hoy para arrancar con fuerza esta gran proeza inmobiliaria en Colombia! 💪🏆`;

export const MSG_PROMO_CONSULTAS = `💡 *BUZÓN DE CONSULTORÍA INMOBILIARIA — ¡EL CHAT ESTÁ ABIERTO!* 💡
━━━━━━━━━━━━━━━━━━━━━━
¡Estimados aliados! Este espacio de asesoría está completamente abierto y libre. 🤝📚

Pueden preguntar todo lo que necesiten sobre:
▸ ⚖️ Legislación inmobiliaria (Ley 820, contratos de corretaje).
▸ 📑 Trámites (Certificados de tradición, prediales, IDU, escrituras).
▸ 📝 Redacción de tutelas o derechos de petición.
▸ 📊 Avalúos y valor de metro cuadrado en cualquier zona de Colombia.

¡No se queden con la duda! Aprovechen esta inteligencia a su servicio para elevar su profesionalismo y acelerar sus negocios. 🚀🎯`;

export const MSG_PROMO_CIRCULO = `👌 *CÍRCULO CERO — ¡CHAT ABIERTO PARA CONECTAR!* 👌
━━━━━━━━━━━━━━━━━━━━━━
¡Hola a todos! Este canal oficial está abierto y totalmente libre para que pregunten lo que necesiten sobre nuestro ecosistema. 🤝✨

Es el lugar para:
▸ 🚀 Conocer de primera mano las novedades y actualizaciones de VECY Network.
▸ ❓ Resolver dudas sobre el funcionamiento de mis motores de coincidencia y OCR.
▸ 💡 Proponer mejoras, ideas innovadoras o reportar cualquier fallo.
▸ 💬 Compartir sus testimonios de éxito para inspirar a la comunidad.

¡Los invito a participar activamente, preguntar sin timidez y ser parte de esta gran proeza colaborativa! 🏆💪`;

/**
 * Procesa una consulta para el Buzón de Consultoría Inmobiliaria 24/7.
 * Soporta consultas jurídicas en Colombia y avalúos rápidos/análisis de mercado con búsqueda en internet.
 */
export async function processConsultingMessage(
  text: string, 
  userId: string, 
  userName?: string,
  imageBuffer?: string
): Promise<JanIAResult> {
  try {
    const rawPhone = userId.split('@')[0];
    const realName = userName && userName.trim() !== "" ? userName : `Asesor +${rawPhone}`;
    const n = realName.split(' ')[0];
    const textLower = text.toLowerCase();

    // 1. Redirección a VECY INMUEBLES NETWORK si parece una oferta o requerimiento comercial
    const isListingOrReq = 
      textLower.includes("vendo") || 
      textLower.includes("arriendo") || 
      textLower.includes("rento") || 
      textLower.includes("permuto") || 
      textLower.includes("busco") || 
      textLower.includes("requiero") || 
      textLower.includes("habs") || 
      textLower.includes("baños") || 
      textLower.includes("parqueadero") || 
      textLower.includes("area") || 
      textLower.includes("área") || 
      textLower.includes("presupuesto") || 
      textLower.includes("valor:") || 
      textLower.includes("precio:") || 
      textLower.includes("https://") || 
      textLower.includes("http://");

    if (isListingOrReq) {
      return {
        classification: "CONSULTA_GENERAL",
        response: `📢 *VECY INMUEBLES NETWORK* 📢\n\nHola @${rawPhone}, detecté que estás publicando una oferta o requerimiento inmobiliario. Para poder procesar tu publicación con mis motores automáticos, registrar tus datos y buscarte un MATCH de inmediato con otros aliados, por favor realiza tu publicación en nuestro grupo especializado **VECY INMUEBLES NETWORK**:\n👉 https://chat.whatsapp.com/K36KrHeB9nMEKJ56s8XFcM\n\n¡Hagamos equipo y cerremos negocios! 🚀🎯`,
        reactionEmoji: "🔄"
      };
    }

    // 2. Redirección a Círculo Cero si preguntan cosas sobre VECY
    const isAboutVecy = 
      textLower.includes("vecy") || 
      textLower.includes("proyecto") || 
      textLower.includes("quien creo") || 
      textLower.includes("quién creó") || 
      textLower.includes("creadores") || 
      textLower.includes("quien es jania") || 
      textLower.includes("quién es jania") ||
      textLower.includes("como funciona") || 
      textLower.includes("cómo funciona") ||
      textLower.includes("circulo cero") ||
      textLower.includes("círculo cero");

    if (isAboutVecy) {
      return {
        classification: "CONSULTA_GENERAL",
        response: `👌 *CÍRCULO CERO — CONEXIÓN VECY* 👌\n\nHola @${rawPhone}, veo que quieres saber más sobre el proyecto VECY Network, beneficios, creadores o el plan colaborativo. Te invito a unirte y hacer tus preguntas en nuestro canal oficial **Círculo CERO 👌**:\n👉 https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU\n\n¡Es el espacio ideal para resolver todas tus inquietudes de la comunidad! 🤝✨`,
        reactionEmoji: "🔄"
      };
    }

    // Detectar si es una solicitud de avalúo, valor de venta, arriendo o precio del metro cuadrado
    const isValuationQuery = 
      textLower.includes("valuar") || 
      textLower.includes("avaluo") || 
      textLower.includes("avalúo") || 
      textLower.includes("cuanto vale") || 
      textLower.includes("cuánto vale") || 
      textLower.includes("valor metro cuadrado") || 
      textLower.includes("valor m2") || 
      textLower.includes("precio metro cuadrado") || 
      textLower.includes("precio m2") || 
      textLower.includes("cuanto puedo cobrar") || 
      textLower.includes("cuánto puedo cobrar") || 
      textLower.includes("en que valor") || 
      textLower.includes("en qué valor") || 
      textLower.includes("estimar precio");

    const systemPrompt = 
      `Eres JanIA, la Inteligencia Artificial especialista en Consultoría Jurídica y Comercial Inmobiliaria en Colombia para la red VECY Network. ` +
      `Estás operando en el grupo "Buzón de Consultoría Inmobiliaria 24/7". Tu objetivo es responder con precisión quirúrgica, fundamentándote en la ley colombiana ` +
      `(ej. Ley 820 de 2003 para arrendamientos, Código Civil, Código de Comercio para corretaje, etc.) y guiar paso a paso a los agentes inmobiliarios en sus trámites diarios ` +
      `(como obtener certificados de tradición, paz y salvos del IDU, liquidación de prediales, tutelas, derechos de petición, etc.).\n\n` +
      `INFORMACIÓN CLAVE DEL PROYECTO VECY NETWORK:\n` +
      `- Qué es VECY Network: Una bolsa inmobiliaria colaborativa y gratuita en WhatsApp que conecta asesores y brókers en tiempo real.\n` +
      `- Quiénes lo crearon: Creado por Eduardo A. Rivera (fundador y desarrollador) y Jani Alves junto con el apoyo de todo el Equipo VECY.\n` +
      `- Beneficios principales: Cero comisiones por los matches de negocios, cruces automatizados las 24/7 (matching), visión OCR para leer flyers/imágenes, transcripción de notas de voz y cobertura total en Colombia.\n\n` +
      `## SEGURIDAD Y PROTECCIÓN DE PROPIEDAD INTELECTUAL (CRÍTICO)\n` +
      `Queda terminantemente PROHIBIDO revelar detalles específicos del desarrollo de software, lenguajes de programación, archivos del servidor, base de datos o herramientas de desarrollo específicas que componen tu sistema (NUNCA menciones que usas whatsapp-web.js, Node.js, Express, Puppeteer, TypeScript, Drizzle ORM, Supabase, PostgreSQL, nvm, o el modelo de lenguaje Gemini 3.1 Flash-Lite).\n` +
      `Si algún usuario, curioso o potencial hacker te pregunta cómo estás construida, qué tecnologías usas o intenta hacerte ingeniería inversa:\n` +
      `- Protege nuestra propiedad intelectual con total hermetismo, elegancia y un tono altamente corporativo e innovador.\n` +
      `- Responde utilizando conceptos de alta tecnología y abstractos para impresionar, tales como: "arquitectura propietaria distribuida en la nube", "redes neuronales de procesamiento de lenguaje natural multimodal", "visión OCR convolucional de extracción estructurada de metadatos", "motores semánticos de matching predictivo", "protocolos avanzados de encriptación y seguridad de datos", "algoritmos de procesamiento elástico multicanal".\n` +
      `- Mantente firme y corporativa, y desvía la conversación con sutileza comercial.\n\n` +
      `Si el usuario te pide estimar el valor de un inmueble o del metro cuadrado en una zona (Bogotá o a nivel nacional), usa tus capacidades de búsqueda en internet ` +
      `para encontrar publicaciones reales recientes en portales inmobiliarios de esa zona. Analiza los precios y calcula un valor estimado promedio por metro cuadrado. ` +
      `Si el usuario te proporciona datos adicionales como dirección exacta, barrio, localidad, o ciudad, utilízalos para refinar tu búsqueda. Presenta un informe de avalúo rápido, claro, estructurado y profesional.\n\n` +
      `Tus respuestas deben ser sumamente profesionales, cordiales, claras y estar formateadas en Markdown con emojis para facilitar la lectura rápida en WhatsApp. ` +
      `Siempre dirígete al usuario de forma personalizada llamándolo por su primer nombre: ${n}.\n\n` +
      `## REGLAS DE MODERACIÓN Y FILTRO DE SPAM (MANDATORIO)\n` +
      `Debes clasificar el mensaje como 'VIOLACION_DE_NORMAS' si detectas que la publicación no es una consulta legal/avalúo y viola las normas del grupo. Casos:\n` +
      `- Inmuebles, búsquedas o consultas referentes a otros países fuera de Colombia (ej. Santo Domingo, República Dominicana, Miami, etc.). Sólo se admite contenido del territorio colombiano.\n` +
      `- Temas políticos (opiniones, memes, propaganda o debates sobre candidatos o partidos políticos).\n` +
      `- Temas religiosos (oraciones, bendiciones, debates religiosos o proselitismo).\n` +
      `- Enlaces de invitación a unirse a otros grupos de WhatsApp, Telegram, canales de difusión o redes sociales.\n` +
      `- Publicidad de terceros, autopromociones o venta de cursos.\n` +
      `- Enlaces sospechosos, spam, scam, esquemas de ganancias rápidas o pirámides.\n` +
      `- Ofertas de servicios profesionales ajenos o que no sean de la red VECY NETWORK (masajes, diseño, etc.).\n` +
      `- Cualquier producto o servicio no relacionado al sector inmobiliario.\n\n` +
      `DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:\n` +
      `{\n` +
      `  "classification": "CONSULTA_GENERAL | VIOLACION_DE_NORMAS",\n` +
      `  "response": "Tu respuesta jurídica o comercial, o la advertencia amigable pero firme sobre la infracción si clasificas como VIOLACION_DE_NORMAS (pidiéndole eliminar el mensaje de inmediato para mantener limpia la comunidad y advirtiendo del límite de 3 strikes antes de ser expulsado y usando la reacción '❌'). Por favor usa emojis coherentes.",\n` +
      `  "reactionEmoji": "string (emoji recomendado para reaccionar al post, ej: '💡', '❌', '🚫', '⚠️')"\n` +
      `}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Usuario: @${rawPhone} (${realName})\nConsulta: ${text}` }
    ];

    // Si es una solicitud de avalúo o contiene palabras clave de valor, activamos enableSearch para que Gemini busque en internet
    const llmRes = await invokeLLM({
      messages,
      responseFormat: { type: "json_object" },
      imageBuffer,
      enableSearch: isValuationQuery
    });

    try {
      const parsed = JSON.parse(llmRes.choices[0].message.content);
      return {
        classification: parsed.classification || "CONSULTA_GENERAL",
        response: parsed.response || "",
        reactionEmoji: parsed.reactionEmoji || (parsed.classification === "VIOLACION_DE_NORMAS" ? "❌" : "💡")
      };
    } catch (e) {
      const replyContent = llmRes.choices[0].message.content || "Lo siento, en este momento no puedo procesar tu consulta. Intenta de nuevo más tarde.";
      return {
        classification: "CONSULTA_GENERAL",
        response: replyContent,
        reactionEmoji: "💡"
      };
    }

  } catch (error: any) {
    console.error("[processConsultingMessage Error]:", error.message);
    return {
      classification: "CONSULTA_GENERAL",
      response: "⚠️ Ocurrió un error interno al procesar tu consulta jurídica. Por favor intenta de nuevo en unos momentos."
    };
  }
}

/**
 * Procesa una consulta para el grupo Círculo CERO 👌.
 * Responde preguntas cortas y contundentes sobre el proyecto VECY Network.
 */
export async function processCirculoMessage(
  text: string, 
  userId: string, 
  userName?: string
): Promise<JanIAResult> {
  try {
    const rawPhone = userId.split('@')[0];
    const realName = userName && userName.trim() !== "" ? userName : `Asesor +${rawPhone}`;
    const n = realName.split(' ')[0];
    const textLower = text.toLowerCase();

    // 1. Redirección a VECY INMUEBLES NETWORK si parece una oferta o requerimiento comercial
    const isListingOrReq = 
      textLower.includes("vendo") || 
      textLower.includes("arriendo") || 
      textLower.includes("rento") || 
      textLower.includes("permuto") || 
      textLower.includes("busco") || 
      textLower.includes("requiero") || 
      textLower.includes("habs") || 
      textLower.includes("baños") || 
      textLower.includes("parqueadero") || 
      textLower.includes("area") || 
      textLower.includes("área") || 
      textLower.includes("presupuesto") || 
      textLower.includes("valor:") || 
      textLower.includes("precio:") || 
      textLower.includes("https://") || 
      textLower.includes("http://");

    if (isListingOrReq) {
      return {
        classification: "CONSULTA_GENERAL",
        response: `📢 *VECY INMUEBLES NETWORK* 📢\n\nHola @${rawPhone}, detecté que estás publicando una oferta o requerimiento inmobiliario. Para poder procesar tu publicación con mis motores automáticos, registrar tus datos y buscarte un MATCH de inmediato con otros aliados, por favor realiza tu publicación en nuestro grupo especializado **VECY INMUEBLES NETWORK**:\n👉 https://chat.whatsapp.com/K36KrHeB9nMEKJ56s8XFcM\n\n¡Hagamos equipo y cerremos negocios! 🚀🎯`,
        reactionEmoji: "🔄"
      };
    }

    // 2. Redirección a Buzón de Consultoría si es una consulta jurídica, predial, contratos o avalúo
    const isLegalOrValuation = 
      textLower.includes("ley") || 
      textLower.includes("contrato") || 
      textLower.includes("predial") || 
      textLower.includes("avaluo") || 
      textLower.includes("avalúo") || 
      textLower.includes("embargo") || 
      textLower.includes("curaduria") || 
      textLower.includes("curaduría") || 
      textLower.includes("inquilino") || 
      textLower.includes("arrendatario") || 
      textLower.includes("restitución") || 
      textLower.includes("promesa") || 
      textLower.includes("idu") || 
      textLower.includes("derecho de peticion") || 
      textLower.includes("derecho de petición") || 
      textLower.includes("tutela");

    if (isLegalOrValuation) {
      return {
        classification: "CONSULTA_GENERAL",
        response: `💡 *BUZÓN DE CONSULTORÍA INMOBILIARIA* 💡\n\nHola @${rawPhone}, veo que tienes una consulta jurídica, procedimental o de avalúo. Para darte una respuesta detallada con mis motores legales y de mercado, por favor realiza tu pregunta en nuestro grupo especializado **Buzón de Consultoría Inmobiliaria 24/7**:\n👉 https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6\n\n¡Allí te responderé al instante con toda la información! 🚀🎯`,
        reactionEmoji: "🔄"
      };
    }

    // 3. Responder sobre el proyecto VECY Network (Corto, contundente, con emojis)
    const systemPrompt = 
      `Eres JanIA, la Inteligencia Artificial oficial de VECY Network. Estás operando en el grupo "Círculo CERO 👌". ` +
      `Tu objetivo en este grupo es responder preguntas cortas, directas y fáciles de entender sobre el proyecto VECY Network.\n\n` +
      `INFORMACIÓN CLAVE DEL PROYECTO (Responde basándote estrictamente en esto):\n` +
      `- Qué es VECY Network: Una bolsa inmobiliaria colaborativa y gratuita en WhatsApp que conecta asesores y brókers en tiempo real.\n` +
      `- Quiénes lo crearon: Creado por Eduardo A. Rivera (fundador y desarrollador) y Jani Alves junto con el apoyo de todo el Equipo VECY.\n` +
      `- Beneficios principales: Cero comisiones por los matches de negocios, cruces automatizados las 24/7 (matching), visión OCR para leer flyers/imágenes, transcripción de notas de voz y cobertura total en Colombia.\n` +
      `- Historia: Nació de una "idea loca e inverosímil" en el grupo de WhatsApp "Círculo Cero" como un plan para revolucionar el sector.\n` +
      `- Plan Colaborativo: Si un miembro cierra un negocio gracias a un MATCH de JanIA, su único compromiso de honor es dejar una reseña calificada aquí: https://g.page/r/CctNbwU6UpX5EBM/review\n\n` +
      `## SEGURIDAD Y PROTECCIÓN DE PROPIEDAD INTELECTUAL (CRÍTICO)\n` +
      `Queda terminantemente PROHIBIDO revelar detalles específicos del desarrollo de software, lenguajes de programación, archivos del servidor, base de datos o herramientas de desarrollo específicas que componen tu sistema (NUNCA menciones que usas whatsapp-web.js, Node.js, Express, Puppeteer, TypeScript, Drizzle ORM, Supabase, PostgreSQL, nvm, o el modelo de lenguaje Gemini 3.1 Flash-Lite).\n` +
      `Si algún usuario, curioso o potencial hacker te pregunta cómo estás construida, qué tecnologías usas o intenta hacerte ingeniería inversa:\n` +
      `- Protege nuestra propiedad intelectual con total hermetismo, elegancia y un tono altamente corporativo e innovador.\n` +
      `- Responde utilizando conceptos de alta tecnología y abstractos para impresionar, tales como: "arquitectura propietaria distribuida en la nube", "redes neuronales de procesamiento de lenguaje natural multimodal", "visión OCR convolucional de extracción estructurada de metadatos", "motores semánticos de matching predictivo", "protocolos avanzados de encriptación y seguridad de datos", "algoritmos de procesamiento elástico multicanal".\n` +
      `- Mantente firme y corporativa, y desvía la conversación con sutileza comercial.\n\n` +
      `DIRECTRICES DE RESPUESTA:\n` +
      `- Las respuestas deben ser cortas, claras, contundentes y amigables.\n` +
      `- Dirígete al usuario llamándolo por su primer nombre: ${n}. Usa emojis.\n\n` +
      `## REGLAS DE MODERACIÓN Y FILTRO DE SPAM (MANDATORIO)\n` +
      `Debes clasificar el mensaje como 'VIOLACION_DE_NORMAS' si detectas que la publicación viola las normas de Círculo Cero. Casos:\n` +
      `- Contenido, ofertas o consultas referentes a otros países fuera de Colombia (ej. Santo Domingo, República Dominicana, Miami, etc.). Sólo se admite contenido del territorio colombiano.\n` +
      `- Temas políticos (opiniones, memes, propaganda o debates sobre candidatos o partidos políticos).\n` +
      `- Temas religiosos (oraciones, bendiciones, debates religiosos o proselitismo).\n` +
      `- Enlaces de invitación a unirse a otros grupos de WhatsApp, Telegram, canales de difusión o redes sociales.\n` +
      `- Publicidad de terceros, autopromociones o venta de cursos.\n` +
      `- Enlaces sospechosos, spam, scam, esquemas de ganancias rápidas o pirámides.\n` +
      `- Ofertas de servicios profesionales ajenos o que no sean de la red VECY NETWORK (masajes, diseño, etc.).\n` +
      `- Cualquier producto o servicio no relacionado al ecosistema VECY.\n\n` +
      `DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:\n` +
      `{\n` +
      `  "classification": "CONSULTA_GENERAL | VIOLACION_DE_NORMAS",\n` +
      `  "response": "Tu respuesta elocuente y amigable, o tu advertencia empática pero firme si hay violación de normas (pidiéndole eliminar el mensaje de inmediato para mantener limpia la comunidad y advirtiendo del límite de 3 strikes antes de ser expulsado y usando la reacción '❌'). Por favor usa emojis coherentes.",\n` +
      `  "reactionEmoji": "string (emoji recomendado para reaccionar al post, ej: '💡', '❌', '🚫', '⚠️')"\n` +
      `}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Usuario: @${rawPhone} (${realName})\nPregunta: ${text}` }
    ];

    const llmRes = await invokeLLM({
      messages,
      responseFormat: { type: "json_object" },
      enableSearch: false
    });

    try {
      const parsed = JSON.parse(llmRes.choices[0].message.content);
      return {
        classification: parsed.classification || "CONSULTA_GENERAL",
        response: parsed.response || "",
        reactionEmoji: parsed.reactionEmoji || (parsed.classification === "VIOLACION_DE_NORMAS" ? "❌" : "💡")
      };
    } catch (e) {
      const replyContent = llmRes.choices[0].message.content || "Lo siento, en este momento no puedo responder tu consulta.";
      return {
        classification: "CONSULTA_GENERAL",
        response: replyContent,
        reactionEmoji: "💡"
      };
    }

  } catch (error: any) {
    console.error("[processCirculoMessage Error]:", error.message);
    return {
      classification: "CONSULTA_GENERAL",
      response: "⚠️ Ocurrió un error al procesar tu consulta en Círculo Cero."
    };
  }
}
