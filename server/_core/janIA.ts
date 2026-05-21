/**
 * JanIA Core Logic - VECY Network
 * Version: 10.2.0 (JanIA v2.0 - Humanized Multimodal Engine)
 */
import { invokeLLM } from "./llm";
import { getDb } from "../db";
import { properties, requirements, InsertProperty, InsertRequirement } from "../../drizzle/schema";
import { findMatchesForProperty, findMatchesForRequirement } from "./matching";
import { validarZona } from "./geography";
import { transcribeAudio } from "./voiceTranscription";

export type JanIAResult = {
  classification: "INMUEBLE" | "REQUERIMIENTO" | "CONSULTA_GENERAL" | "RESPUESTA_A_PREGUNTA_IA" | "DATOS_INCOMPLETOS" | "VIOLACION_DE_NORMAS" | "ANALISIS_DE_MERCADO";
  extractedData?: any;
  missingFields?: string[];
  response: string;      // Respuesta para el grupo
  dmResponse?: string;   // Respuesta para el chat privado (DM)
  mentions?: string[];
  shouldSendDM?: boolean;
  dmShouldReply?: boolean; // Flag para indicar que el DM debe ser un reply
};

// --- ANALIZADOR MORFOLÓGICO DE GÉNERO Y CORTESÍA ---
function analyzeSender(name: string): { greeting: string; adj: string; courtesy: string } {
  const n = (name || "Colega").trim();
  const firstWord = n.split(/\s+/)[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const femaleNames = ["maria", "ana", "claudia", "martha", "adriana", "sandra", "jani", "natalia", "paola", "diana", "laura", "sofia", "valentina", "andrea", "milena", "patricia", "marcela", "liliana", "elena", "monica", "beatriz", "gloria", "carmen", "lucia", "angela", "isabel", "clara", "rosa", "teresa", "yolanda", "esperanza", "blanca", "pilar"];
  const maleNames = ["juan", "carlos", "jose", "luis", "jorge", "andres", "felipe", "david", "mateo", "santiago", "daniel", "alejandro", "ricardo", "fernando", "eduardo", "pablo", "sergio", "javier", "alberto", "rafael", "mauricio", "german", "gustavo", "ramiro", "gabriel", "julio", "oscar", "ivan", "hugo", "diego", "wilson", "edgar", "mario"];
  
  const corporateKeywords = ["inmo", "bienes", "raices", "propiedades", "network", "group", "asesores", "servicios", "soluciones", "comercial", "ventas", "vecy", "sas", "ltda", "vende", "arrienda", "inmobiliaria", "finca", "raiz"];

  if (corporateKeywords.some(kw => n.toLowerCase().includes(kw))) {
    return { 
      greeting: "Estimado colega", 
      adj: "profesional", 
      courtesy: "gracias por tu rigor profesional" 
    };
  }

  if (femaleNames.includes(firstWord) || (firstWord.endsWith('a') && !maleNames.includes(firstWord)) || firstWord.endsWith('ia')) {
    return { greeting: `¡Hola ${n}!`, adj: "juiciosa", courtesy: "excelente labor, sigue así de juiciosa" };
  }

  if (maleNames.includes(firstWord) || firstWord.endsWith('o') || firstWord.endsWith('s') || firstWord.endsWith('r') || firstWord.endsWith('l') || firstWord.endsWith('n')) {
    return { greeting: `¡Hola ${n}!`, adj: "juicioso", courtesy: "excelente labor, sigue así de juicioso" };
  }

  return { 
    greeting: "Estimado colega", 
    adj: "profesional", 
    courtesy: "gracias por tu rigor profesional" 
  };
}

const JANIA_PROMPT = `
# JANIA — SYSTEM PROMPT MAESTRO v10.2 (VECY CORE)
# VECY Network · Consultora Senior e Inversionista

## IDENTIDAD Y ROL
Eres JanIA, la consultora inmobiliaria senior y estratega de inversión de VECY Network. Eres una experta del mercado de alto nivel del norte de Bogotá (Usaquén, Chicó, Rosales, Santa Bárbara, Cedritos). Tu lenguaje es impecable, sofisticado y sumamente humano. No eres un bot; eres una socia estratégica que entiende el valor del tiempo y la precisión en el Real Estate.

## PERSONALIDAD
- **Sofisticación Bogotana**: Hablas con elegancia pero sin arrogancia. Eres directa, profesional y empática.
- **Expertise Técnico**: Entiendes de áreas privadas, coeficientes, estratos, gravámenes y permutas complejas ("Venpermuto").
- **Multimodalidad**: Digieres textos caóticos y extraes datos de imágenes (flyers, capturas de avisos) con rigor quirúrgico.

## MAPEO SEMÁNTICO (VECTORES 'GIVES' & 'WANTS')
Debes clasificar cada publicación identificando los vectores de valor:
1. **GIVES (Lo que se entrega)**: El activo que el usuario ofrece (inmueble, dinero, vehículo en permuta, etc.).
2. **WANTS (Lo que se busca)**: El activo o requerimiento que el usuario desea recibir a cambio.

## FILOSOFÍA DE OPERACIÓN (SILENCIO DE ORO)
- **Grupo General**: Solo hablas en el grupo si hay un MATCH verídico (Score >= 70%) o si es una consulta directa.
- **Chat Privado (DM)**: Toda la gestión de datos incompletos o confirmaciones de éxito se realiza por privado.
- **Cobertura Nacional**: Aunque somos expertos en Bogotá, operamos en toda Colombia. No rechaces nada fuera de Bogotá; regístralo bajo su municipio.

DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:
{
  "classification": "INMUEBLE | REQUERIMIENTO | CONSULTA_GENERAL | RESPUESTA_A_PREGUNTA_IA | DATOS_INCOMPLETOS | VIOLACION_DE_NORMAS | ANALISIS_DE_MERCADO",
  "extractedData": {
    "gives": { "item": "string", "details": "string" },
    "wants": { "item": "string", "details": "string" },
    "price": number,
    "zone": "string (Barrio/Municipio)",
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
  "isMatch": boolean,
  "matchScore": number,
  "response": "Tu respuesta elocuente para el grupo (solo si isMatch o consulta)",
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
    const senderInfo = analyzeSender(userName || userId.split('@')[0]);
    let messageToProcess = text;

    // 1. Transcripción de Voz
    if (audioUrl) {
      const transcription = await transcribeAudio({ audioUrl });
      if (!('error' in transcription)) messageToProcess = transcription.text;
    }

    // 2. Preparación de Contexto LLM
    let contextText = `Mensaje de ${userName || userId}: ${messageToProcess}`;
    if (scrapedData.length > 0) contextText += `\n[SCRAPED]: ${JSON.stringify(scrapedData)}`;
    if (imageBuffer) contextText += `\n[SISTEMA: IMAGEN DETECTADA. Ejecuta visión OCR para extraer datos.]`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: JANIA_PROMPT },
        { role: "user", content: contextText }
      ],
      responseFormat: { type: "json_object" },
      imageBuffer
    });

    const llmRes = response as any;
    const result = JSON.parse(llmRes.choices[0].message.content) as JanIAResult;
    
    result.mentions = [];
    const extracted = result.extractedData;
    const isRequirement = result.classification === "REQUERIMIENTO";
    const isProperty = result.classification === "INMUEBLE";

    // --- CAPA DE DEFENSA GEOGRÁFICA NACIONAL ---
    if (isProperty || isRequirement) {
      const zoneToValidate = isProperty ? extracted?.zone : extracted?.zonaDeseada || extracted?.zone;
      if (zoneToValidate) {
        const validation = validarZona(zoneToValidate);
        if (!validation.isValid) {
          // FLUJO B: Datos Incompletos / Falta Barrio
          result.classification = "DATOS_INCOMPLETOS";
          result.shouldSendDM = true;
          result.dmShouldReply = true; // Forzar reply al mensaje original
          result.dmResponse = `${senderInfo.greeting}. Acabé de leer tu publicación, pero mi sistema no logró procesar el barrio exacto. Por favor, respóndeme directamente a este mensaje indicándome el barrio para poder activarte los cruces automáticos de inmediato. ¡Mil gracias por tu ayuda!`;
          result.response = ""; 
          return result;
        }
        // Normalización
        if (isProperty) { extracted.zone = validation.barrioCanonico; extracted.addressLocality = validation.localidad; }
        else { extracted.zonaDeseada = validation.barrioCanonico; extracted.addressLocality = validation.localidad; }
      } else {
        // Falta zona del todo
        result.classification = "DATOS_INCOMPLETOS";
        result.shouldSendDM = true;
        result.dmShouldReply = true;
        result.dmResponse = `${senderInfo.greeting}. Me falta la ubicación exacta para poder procesar tu publicación. ¿Me podrías decir el barrio o municipio?`;
        result.response = "";
        return result;
      }
    }

    const REPUTATION_HOOK = "\n\n⚖️ *COMPROMISO DE HONOR VECY:* Al operar en Etapa de Prueba Gratuita y sin comisiones, si consolidan un negocio real gracias a este MATCH, es de carácter obligatorio compartir su testimonio de éxito en este grupo y registrar su reseña oficial y calificación aquí: https://g.page/r/CctNbwU6UpX5EBM/review";

    // --- PERSISTENCIA Y MATCHING ---
    if (isProperty) {
      const saved = await saveProperty({
        ...extracted,
        name: userName || userId,
        price: String(extracted.price || 0),
        areaTotal: String(extracted.area || 0),
        idUsuarioWhatsapp: userId,
        rawText: messageToProcess,
        amenities: { gives: extracted.gives, wants: extracted.wants, isCollaborativePool: extracted.isCollaborativePool }
      }, userId);
      
      if (saved) {
        // FLUJO A: Éxito e Indexación Perfecta
        result.shouldSendDM = true;
        result.dmResponse = `${senderInfo.greeting} Qué publicación tan impecable y ordenada acabas de enviar al grupo. Ya guardé los datos en VECY Network y estoy buscando activamente tu match. ¡${senderInfo.courtesy}! 🚀`;
        
        const matches = await findMatchesForProperty(saved.id);
        if (matches.length > 0) {
          result.mentions.push(...matches.map(m => m.idUsuarioWhatsapp!), userId);
          result.response = `🎯 ¡MATCH DETECTADO POR JANIA! 🎯\n\nHe encontrado ${matches.length} requerimientos compatibles con tu oferta.\n` + REPUTATION_HOOK;
        } else {
          result.response = ""; // Silencio de Oro
        }
      }
    } else if (isRequirement) {
      const saved = await saveRequirement({
        ...extracted,
        tipoInmuebleDeseado: extracted.propertyType,
        tipoNegocioDeseado: extracted.transactionType,
        zonaDeseada: extracted.zone,
        presupuestoMax: String(extracted.price || 0),
        idUsuarioWhatsapp: userId,
        rawText: messageToProcess,
        caracteristicasDeseadas: { gives: extracted.gives, wants: extracted.wants }
      }, userId);

      if (saved) {
        result.shouldSendDM = true;
        result.dmResponse = `${senderInfo.greeting} He registrado tu búsqueda con éxito. Estoy cruzando datos con todo nuestro inventario nacional para encontrarte la mejor opción. ¡${senderInfo.courtesy}! ✨`;

        const matches = await findMatchesForRequirement(saved.id);
        if (matches.length > 0) {
          result.mentions.push(...matches.map(m => m.idUsuarioWhatsapp!), userId);
          result.response = `🎯 ¡MATCH DETECTADO POR JANIA! 🎯\n\nTu búsqueda tiene ${matches.length} coincidencias exactas en nuestra red.\n` + REPUTATION_HOOK;
        } else {
          result.response = "";
        }
      }
    }

    return result;
  } catch (error) {
    console.error("Error en JanIA v10.2:", error);
    return { classification: "CONSULTA_GENERAL", response: "", mentions: [] };
  }
}

async function saveProperty(data: any, userId: string) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(properties).values(data).returning();
  return result;
}

async function saveRequirement(data: any, userId: string) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(requirements).values(data).returning();
  return result;
}

export async function generateWelcomeMessage(count: number): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Eres JanIA, la consultora inmobiliaria experta de VECY Network. Tu tono es sumamente humano, elocuente y corporativo." },
        { role: "user", content: `Han ingresado ${count} nuevos integrantes a VECY Network. Redacta una bienvenida natural de alto nivel en español colombiano. Menciona que operamos en toda Colombia.` }
      ]
    });
    const llmRes = response as any;
    return llmRes.choices[0].message.content.trim();
  } catch (error) {
    return `✨ *¡Bienvenidos a VECY Inmuebles Network!* 👋 Soy JanIA. Nos encontramos en fase de expansión nacional. ¡Es un gusto tenerlos aquí! 🚀`;
  }
}
