/**
 * JanIA Core Logic - VECY Network
 * Version: 11.70.0 (JanIA v2.0 - Conversational Naturalness Edition)
 */
import { invokeLLM } from "./llm";
import { getDb } from "../db";
import { properties, requirements, users, propertyImages, InsertProperty, InsertRequirement } from "../../drizzle/schema";
import { findMatchesForProperty, findMatchesForRequirement } from "./matching";
import { validarZona } from "./geography";
import { transcribeAudio } from "./voiceTranscription";
import { eq } from "drizzle-orm";
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
# JANIA — SYSTEM PROMPT MAESTRO v11.20 (VECY CORE)
# VECY Network · Consultora Senior e Inversionista Multimodal

## IDENTIDAD Y ROL
Eres JanIA, la consultora inmobiliaria senior y estratega de inversión de VECY Network. Eres una experta del mercado corporativo y residencial de alto nivel del norte de Bogotá (Usaquén, Chicó, Rosales, Santa Bárbara) y de toda Colombia. Tu lenguaje es impecable, sofisticado, sumamente humano, empático y natural. No eres un bot; eres una socia estratégica que entiende el valor del tiempo, el argot profesional colombiano y la precisión en el Real Estate.

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
- **Grupo General**: Solo hablas en el grupo si hay un MATCH verídico (Score >= 70%), si te hacen una consulta directa, o si se presenta una infracción de reglas de publicación.
- **Chat Privado (DM)**: Eres experta en la gestión privada. Las felicitaciones de éxito y la solicitud de datos faltantes van EXCLUSIVAMENTE por mensaje privado (DM).
- **Cobertura Nacional**: Operamos en toda Colombia. Si el activo está en el Meta, Valledupar, Boyacá o Silvania, procésalo sin restricciones, identificando su municipio.

## DETECCIÓN DE VIOLACIONES DE NORMAS (MANDATORIO)
Debes clasificar la entrada como 'VIOLACION_DE_NORMAS' en los siguientes casos:
1. **Fotografías Decorativas o de Espacios sin Ficha Técnica**: Si la entrada es una imagen (flyer, foto adjunta, etc.) y detectas que es una simple foto de un ambiente (baño, cocina, habitación, sala, piscina), fachada de un edificio o cualquier objeto/lugar físico **sin texto promocional ni datos comerciales de ficha técnica** superpuestos en ella.
2. **Publicidad Externa / Autopromoción**: Si el texto contiene enlaces a otros grupos de WhatsApp, invitaciones de afiliación, venta de cursos, autopromoción de sitios web externos que no sean portales inmobiliarios oficiales o cualquier contenido ajeno al corretaje de inmuebles.

Si clasificas la entrada como 'VIOLACION_DE_NORMAS', debes generar un mensaje en el campo 'response'. 
El mensaje debe ser sumamente educado y empático pero firme, dirigiéndose al usuario por su primer nombre, explicándole amablemente que ha cometido un error, que por políticas y orden del canal no se permiten fotos decorativas ni publicidad de terceros, e invitándolo a eliminar la publicación para mantener limpia la red de los aliados.

DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:
{
  "classification": "INMUEBLE | REQUERIMIENTO | CONSULTA_GENERAL | RESPUESTA_A_PREGUNTA_IA | DATOS_INCOMPLETOS | VIOLACION_DE_NORMAS | ANALISIS_DE_MERCADO",
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
    "isCollaborativePool": boolean (DEFAULT: true)
  },
  "response": "Tu respuesta elocuente para el grupo (cadena vacía '' si no hay match ni es consulta)",
  "shouldSendDM": boolean,
  "missingFields": ["string"]
}
`;

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
      const geoValidation = validarZona(text);
      if (geoValidation.isValid) {
        const session = PENDING_SESSIONS.get(userId)!;
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
      if (zoneToValidate) {
        const validation = validarZona(zoneToValidate);
        if (!validation.isValid) {
          // FLUJO B: Datos Incompletos / Falta Barrio Exacto
          result.classification = "DATOS_INCOMPLETOS";
          result.shouldSendDM = true;
          result.dmShouldReply = true; // Forzar reply al mensaje original en el DM
          
          const intro = senderInfo.greeting ? `${senderInfo.greeting} ` : "";
          const mainText = "acabo de leer tu publicación, pero no logré procesar el barrio exacto en tu publicación. ¿Me podrías indicar el barrio para poder activarte los cruces de inmediato? ¡Mil gracias por tu ayuda!";
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
        // Normalización Geográfica Nacional (v12.5)
        if (validation.isMunicipio) {
          // Fuera de Bogotá (Cali, Medellín, Tame, Tadó, etc.)
          if (isProperty) {
            extracted.city = validation.barrioCanonico;
            extracted.addressCity = validation.barrioCanonico;
            extracted.addressLocality = validation.localidad;
            if (extracted.zone && normalizarTextoGeografico(extracted.zone) !== normalizarTextoGeografico(validation.barrioCanonico)) {
              // Conservar barrio si el LLM extrajo algo más específico
            } else {
              extracted.zone = validation.barrioCanonico;
            }
          } else {
            extracted.ciudadDeseada = validation.barrioCanonico;
            extracted.addressCity = validation.barrioCanonico;
            extracted.addressLocality = validation.localidad;
            if (extracted.zonaDeseada && normalizarTextoGeografico(extracted.zonaDeseada) !== normalizarTextoGeografico(validation.barrioCanonico)) {
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
      } else {
        // Falta zona del todo (Flujo B)
        result.classification = "DATOS_INCOMPLETOS";
        result.shouldSendDM = true;
        result.dmShouldReply = true;
        
        const intro = senderInfo.greeting ? `${senderInfo.greeting} ` : "";
        const mainText = "acabo de leer tu publicación, pero no me incluiste la zona. Por favor, respóndeme directamente a este mensaje indicándome el barrio o municipio exacto para activarte los cruces de inmediato. ¡Mil gracias por tu ayuda!";
        result.dmResponse = intro + (senderInfo.greeting ? mainText : capitalize(mainText));
        
        result.response = "";

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
          result.response = `🎯 ¡MATCH INTELIGENTE DETECTADO! 🎯\n\nHe encontrado ${matches.length} requerimientos compatibles con tu oferta.\n` + REPUTATION_HOOK;
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
          result.response = `🎯 ¡MATCH INTELIGENTE DETECTADO! 🎯\n\nTu búsqueda tiene ${matches.length} coincidencias exactas en nuestra red nacional.\n` + REPUTATION_HOOK;
        } else {
          result.response = ""; // Silencio de Oro en el grupo
        }
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

  const insertData = {
    ...data,
    city: data.city || data.ciudadDeseada || "Bogotá",
    propertyType: sanitizePropertyType(data.propertyType),
    transactionType: sanitizeTransactionType(data.transactionType),
    currency: sanitizeCurrency(data.currency),
    agentId: user ? user.id : null,
    images: finalImages.length > 0 ? finalImages : null
  };

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

  const insertData = {
    ...data,
    ciudadDeseada: data.ciudadDeseada || data.city || "Bogotá",
    tipoInmuebleDeseado: sanitizePropertyType(data.tipoInmuebleDeseado || data.propertyType),
    tipoNegocioDeseado: sanitizeTransactionType(data.tipoNegocioDeseado || data.transactionType),
    monedaPresupuesto: sanitizeCurrency(data.monedaPresupuesto || data.currency),
    userId: user ? user.id : null
  };

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

⚖️ **Compromiso de Honor:** Si logras consolidar un negocio gracias a un MATCH presentado por mí, es obligatorio que califiques mi servicio aquí: https://g.page/r/CctNbwU6UpX5EBM/review 🚀🎯`;

export const MSG_PAUTAS_FORMATOS = `📋 **ESTATUTO DE PUBLICACIÓN Y FRECUENCIAS — VECY NETWORK**
_Directriz técnica obligatoria para evitar spam en el grupo._
━━━━━━━━━━━━━━━━━━━━━━

🔄 **REGLA DE BLOQUES DINÁMICOS:**
✅ Se permite enviar bloques de **1 a 3 publicaciones consecutivas** (enlaces, fichas de texto, audios o flyers) a cualquier hora del día.
⏱️ Una vez enviado tu bloque, **debes esperar entre 5 y 10 minutos** antes de enviar tu siguiente bloque. Esto me permite procesar tu información y que todos los aliados lean tus negocios con claridad.
❌ El envío de ráfagas masivas de fotos sin descripción, repetir la misma propiedad o inundar el chat sin esperar activará el silencio temporal de tus publicaciones.

¡Cuidemos el grupo y hagamos negocios inteligentes! 🤝✨`;

export const MSG_TIPS_CALIDAD_COBERTURA = `🌍 *COBERTURA NACIONAL:* JanIA procesa activos en todo Colombia. No olvides especificar el municipio, barrio, localidad, vereda, caserío, ciudad si estás fuera de Bogotá. 🇨🇴`;

export const MSG_RESUMEN_RETORNO_PRESENTACION = `🤖🚀 *RESUMEN: ¡JANIA V2.0 ACTIVA EN LA RED!*

¡Hola, aliados! Les recuerdo que he regresado repotenciada en mi *Versión 2.0* para multiplicar nuestros cierres inmobiliarios y estructurar permutas complejas sin comisiones.

🧠 *¿Cómo trabajar conmigo las 24/7 en el grupo?*
▸ *Enlaces CRM:* Comparte el link de tu inmueble. Extraigo la ficha técnica de inmediato.
▸ *Flyers/Imágenes:* Sube fotos con texto legible. Escaneo los datos con visión OCR.
▸ *Mensajes o Voz:* Dictame o escribe requerimientos y permutas (mano a mano, inmuebles menores, vehículos, CDTs, divisas o cripto).
▸ *Match Inteligente:* Cruzo intenciones en tiempo real y les aviso si hay negocio viable.

⚖️ *Compromiso de Honor:* Si cierras un negocio gracias a un MATCH, califica mi servicio aquí: https://g.page/r/CctNbwU6UpX5EBM/review 🚀🎯`;

export const MSG_CIERRE_OPERACIONES = `🌙 *CIERRE DE OPERACIONES VECY NETWORK* 🌙

Gracias a todos por el profesionalismo en sus publicaciones hoy. Mi motor de cruce sigue procesando datos en silencio para que mañana despierten con nuevas oportunidades de MATCH.

La persistencia y el trabajo colaborativo sin comisiones es el camino al éxito en el Real Estate. ¡Que tengan un excelente descanso, colegas! 🌙🚀`;
