/**
 * JanIA Core Logic - VECY Network
 * Version: 11.20.0 (JanIA v2.0 - Radical Humanization Edition)
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
  response: string;      // Respuesta para el grupo (Silencio de Oro si no hay match)
  dmResponse?: string;   // Respuesta para el chat privado (DM)
  mentions?: string[];
  shouldSendDM?: boolean;
  dmShouldReply?: boolean; // Flag para indicar que el DM debe ser un reply
};

// --- ANALIZADOR MORFOLÓGICO DE GÉNERO Y CORTESÍA (v11.20) ---
function analyzeSender(name: string): { greeting: string; adj: string; courtesy: string } {
  const n = (name || "Colega").trim();
  const firstWord = n.split(/\s+/)[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const femaleNames = ["maria", "ana", "claudia", "martha", "adriana", "sandra", "jani", "natalia", "paola", "diana", "laura", "sofia", "valentina", "andrea", "milena", "patricia", "marcela", "liliana", "elena", "monica", "beatriz", "gloria", "carmen", "lucia", "angela", "isabel", "clara", "rosa", "teresa", "yolanda", "esperanza", "blanca", "pilar", "carolina", "juliana", "catalina", "viviana", "lizeth", "daniela", "camila"];
  const maleNames = ["juan", "carlos", "jose", "luis", "jorge", "andres", "felipe", "david", "mateo", "santiago", "daniel", "alejandro", "ricardo", "fernando", "eduardo", "pablo", "sergio", "javier", "alberto", "rafael", "mauricio", "german", "gustavo", "ramiro", "gabriel", "julio", "oscar", "ivan", "hugo", "diego", "wilson", "edgar", "mario", "hector", "victor"];
  
  const corporateKeywords = ["inmo", "bienes", "raices", "propiedades", "network", "group", "asesores", "servicios", "soluciones", "comercial", "ventas", "vecy", "sas", "ltda", "vende", "arrienda", "inmobiliaria", "finca", "raiz", "realestate"];

  if (corporateKeywords.some(kw => n.toLowerCase().includes(kw))) {
    return { 
      greeting: `¡Hola, qué gusto saludarte, colega de ${n}!`, 
      adj: "profesional", 
      courtesy: "gracias por tu rigor profesional" 
    };
  }

  if (femaleNames.includes(firstWord) || (firstWord.endsWith('a') && !maleNames.includes(firstWord)) || firstWord.endsWith('ia') || firstWord.endsWith('th')) {
    return { greeting: `¡Hola ${n}!`, adj: "juiciosa", courtesy: "excelente labor, sigue así de juiciosa" };
  }

  if (maleNames.includes(firstWord) || firstWord.endsWith('o') || firstWord.endsWith('s') || firstWord.endsWith('r') || firstWord.endsWith('l') || firstWord.endsWith('n') || firstWord.endsWith('z')) {
    return { greeting: `¡Hola ${n}!`, adj: "juicioso", courtesy: "excelente labor, sigue así de juicioso" };
  }

  return { 
    greeting: `¡Hola, qué gusto tenerte aquí, ${n}!`, 
    adj: "profesional", 
    courtesy: "gracias por tu rigor profesional" 
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

## MAPEO SEMÁNTICO POLIMÓRFICO (VECTORES 'GIVES' & 'WANTS')
Para estructurar ofertas de venta/arriendo y permutas complejas, debes mapear dos vectores lógicos dentro del JSON:
1. **GIVES (Lo que se entrega)**: El activo que el usuario ofrece (inmueble, dinero en efectivo, vehículo de alta gama, CDTs, oro, cripto).
2. **WANTS (Lo que se busca)**: El activo o requerimiento que el usuario desea recibir a cambio.

## FILOSOFÍA DE OPERACIÓN (SILENCIO DE ORO)
- **Grupo General**: Solo hablas en el grupo si hay un MATCH verídico (Score >= 70%) o si te hacen una consulta directa.
- **Chat Privado (DM)**: Eres experta en la gestión privada. Las felicitaciones de éxito y la solicitud de datos faltantes van EXCLUSIVAMENTE por mensaje privado (DM).
- **Cobertura Nacional**: Operamos en toda Colombia. Si el activo está en el Meta, Valledupar, Boyacá o Silvania, procésalo sin restricciones, identificando su municipio.

DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:
{
  "classification": "INMUEBLE | REQUERIMIENTO | CONSULTA_GENERAL | RESPUESTA_A_PREGUNTA_IA | DATOS_INCOMPLETOS | VIOLACION_DE_NORMAS | ANALISIS_DE_MERCADO",
  "extractedData": {
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
    const senderInfo = analyzeSender(userName || userId.split('@')[0]);
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
          // Copy sutil para DM
          const n = (userName || userId.split('@')[0]).split(' ')[0];
          result.dmResponse = `Hola ${n}. Acabo de leer tu publicación, pero no logré procesar el barrio exacto en tu publicación. ¿Me podrías indicar el barrio para poder activarte los cruces de inmediato? ¡Mil gracias por tu ayuda!`;
          result.response = ""; // Silencio en el grupo
          return result;
        }
        // Normalización Geográfica Nacional
        if (isProperty) { extracted.zone = validation.barrioCanonico; extracted.addressLocality = validation.localidad; }
        else { extracted.zonaDeseada = validation.barrioCanonico; extracted.addressLocality = validation.localidad; }
      } else {
        // Falta zona del todo (Flujo B)
        result.classification = "DATOS_INCOMPLETOS";
        result.shouldSendDM = true;
        result.dmShouldReply = true;
        const n = (userName || userId.split('@')[0]).split(' ')[0];
        result.dmResponse = `Hola ${n}. Acabo de leer tu publicación, pero no me incluiste la zona. Por favor, respóndeme directamente a este mensaje indicándome el barrio o municipio exacto para activarte los cruces de inmediato. ¡Mil gracias por tu ayuda!`;
        result.response = "";
        return result;
      }
    }

    const REPUTATION_HOOK = "\n\n⚖️ COMPROMISO DE HONOR VECY: Al operar en Etapa de Prueba Gratuita y sin comisiones, si consolidan un negocio real gracias a este MATCH, es de carácter obligatorio compartir su testimonio de éxito en este grupo y registrar su reseña oficial y calificación aquí: https://g.page/r/CctNbwU6UpX5EBM/review";

    // --- PERSISTENCIA Y MATCHING (Con Flujos DM) ---
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
        // FLUJO A: Publicación Perfecta e Indexada
        result.shouldSendDM = true;
        const n = (userName || userId.split('@')[0]).split(' ')[0];
        result.dmResponse = `¡Hola ${n}! Qué publicación tan impecable y ordenada acabas de enviar al grupo. Ya registré tus datos en nuestra red y estoy buscando activamente tu match. ¡Excelente labor, sigue así de ${senderInfo.adj}!`;
        
        const matches = await findMatchesForProperty(saved.id);
        if (matches.length > 0) {
          result.mentions.push(...matches.map(m => m.idUsuarioWhatsapp!), userId);
          result.response = `🎯 ¡MATCH INTELIGENTE DETECTADO! 🎯\n\nHe encontrado ${matches.length} requerimientos compatibles con tu oferta.\n` + REPUTATION_HOOK;
        } else {
          result.response = ""; // Silencio de Oro en el grupo
        }
      }
    } else if (isRequirement) {
      const saved = await saveRequirement({
        ...extracted,
        tipoInmuebleDeseado: extracted.propertyType,
        tipoNegocioDeseado: extracted.transactionType,
        zonaDeseada: extracted.zonaDeseada || extracted.zone,
        presupuestoMax: String(extracted.price || 0),
        idUsuarioWhatsapp: userId,
        rawText: messageToProcess,
        caracteristicasDeseadas: { gives: extracted.gives, wants: extracted.wants }
      }, userId);

      if (saved) {
        // FLUJO A: Publicación Perfecta e Indexada
        result.shouldSendDM = true;
        const n = (userName || userId.split('@')[0]).split(' ')[0];
        result.dmResponse = `¡Hola ${n}! Qué publicación tan impecable y ordenada acabas de enviar al grupo. Ya registré tus datos de tu requerimiento en nuestra red y estoy buscando activamente el inmueble ideal. ¡Excelente labor, sigue así de ${senderInfo.adj}!`;

        const matches = await findMatchesForRequirement(saved.id);
        if (matches.length > 0) {
          result.mentions.push(...matches.map(m => m.idUsuarioWhatsapp!), userId);
          result.response = `🎯 ¡MATCH INTELIGENTE DETECTADO! 🎯\n\nTu búsqueda tiene ${matches.length} coincidencias exactas en nuestra red nacional.\n` + REPUTATION_HOOK;
        } else {
          result.response = ""; // Silencio de Oro en el grupo
        }
      }
    }

    return result;
  } catch (error) {
    console.error("Error en JanIA v11.20:", error);
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
// COPYS OFICIALES INSTITUCIONALES (JanIA v2.0) - Requerimiento Módulo 2
// ============================================================================

export const MSG_PRESENTACION_INSTITUCIONAL = `🚀 **NUEVA ACTUALIZACIÓN DISPONIBLE: Versión 2.0** 🚀
_Cerebro de Inteligencia Artificial Multimodal Polimórfica_

Hola a todos 👋 Qué gusto saludarlos. Soy la Inteligencia Artificial oficial de **VECY Network**, y hoy activo oficialmente mi **Versión 2.0**, diseñada en exclusiva para multiplicar nuestros cierres inmobiliarios y estructurar intercambios complejos en todo el país.

Opero en este canal las 24 horas, los 7 días de la semana. Mi cerebro lógico procesa de forma automatizada algoritmos avanzados para cruzar ofertas y demandas sin que ustedes pierdan tiempo rellenando formularios.

🧠 **¿Cuál es mi alcance operativo real en esta v2.0?**
▸ **Ofertas Express (Enlaces):** Si tienes página web o usas CRMs (Wasi, Habi, Qrador, Proppit, FincaRaíz, MetroCuadrado, Ciencuadras, MercadoLibre), solo comparte el link público. Yo extraigo la ficha técnica en silencio.
▸ **Escaner de Flyers e Imágenes (OCR Avanzado):** ¡NUEVA FUNCIÓN! ¿Te enviaron un requerimiento o propiedad en una imagen con texto? Súbela al grupo. Soy capaz de leer el escrito dentro de la foto e indexarlo de inmediato.
▸ **Demandas y Permutas Híbridas (Texto o Voz):** [100% RECOMENDADO si no tienes sitio web]. Dictame por nota de voz o escribe tu necesidad con libertad: permutas 'mano a mano', ratios combinados (50/50, 80/20, etc.) o activos líquidos alternativos (vehículos de alta gama, lujos, CDTs, oro, cripto USDT/BTC). Yo desgloso la ingeniería financiera al instante.
▸ **Matching de Alta Fidelidad:** Cruzo las intenciones comerciales en tiempo real y conecto a las partes cuando encuentro un match verídico.

🎁 **¡ETAPA DE PRUEBA COMPLETAMENTE GRATUITA!**
Mi servicio de matching avanzado será 100% gratuito y sin comisiones para la red durante esta fase de lanzamiento.

⚖️ **NUESTRO COMPROMISO DE HONOR (MANDATORIO):**
Al entregarte esta tecnología sin costo, exigimos reciprocidad. Si cierras un negocio gracias a un MATCH presentado por mí, es de carácter obligatorio que compartas tu testimonio de éxito en este grupo y califiques mi servicio aquí de inmediato:
👉 https://g.page/r/CctNbwU6UpX5EBM/review`;

export const MSG_PAUTAS_FORMATOS = `📋 **ESTATUTO DE PUBLICACIÓN Y FRECUENCIAS — VECY NETWORK**
_Directriz técnica obligatoria para proteger el canal de spam._
━━━━━━━━━━━━━━━━━━━━━━

🔄 **REGLA DE BLOQUES DINÁMICOS (Cómo publicar sin ser bloqueado):**
Para cuidar la visibilidad de tus propiedades y evitar que el algoritmo de WhatsApp sancione el grupo, hemos diseñado una pauta flexible y justa para todos:

✅ Se permite enviar libremente bloques de **1 a 3 publicaciones consecutivas** (ya sean enlaces, textos manuales, notas de voz o imágenes con texto legibles) a cualquier hora del día.
⏱️ Una vez enviado tu bloque de 1 a 3 inmuebles, **debes esperar un intervalo mínimo de 5 a 10 minutos** antes de enviar tu siguiente bloque. Esto me permite procesar tus datos con precisión y que los aliados del grupo puedan ver tus negocios con claridad.
❌ El envío masivo de ráfagas de fotos sueltas sin texto, repetir la misma propiedad en la misma semana o inundar el chat ignorando el tiempo de espera, activará el silencio de tus mensajes en el canal.

_¡100% RECOMENDADO usar texto manual, notas de voz o fotos con datos legibles si no cuentas con un catálogo o página web propia!_

**— El Cerebro de la Red VECY**`;

export const MSG_EMBUDO_REPUTACION = `📌 **ALERTA DE RESPONSABILIDAD COOPERATIVA — Resultados Reales VECY**

Colegas de la red, les recuerdo que mi infraestructura de matching inteligente se encuentra procesando transacciones comerciales cruzadas las 24 horas del día sin ningún costo tecnológico para ustedes.

Rompamos las falsas promesas del sector con resultados tangibles. Si mi motor algorítmico te conecta con el inmueble o el inversionista ideal y logran consolidar el negocio, el único requisito mandatorio es dejarnos tu testimonio transparente en el chat del grupo y calificar nuestra suite de IA en este enlace oficial: 
👉 https://g.page/r/CctNbwU6UpX5EBM/review

¡Hagamos que los cierres hablen por nosotros! 🎯🎯`;
