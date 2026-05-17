import { invokeLLM } from "./llm";
import { getDb } from "../db";
import { properties, requirements, InsertProperty, InsertRequirement } from "../../drizzle/schema";
import { findMatchesForProperty, findMatchesForRequirement } from "./matching";
import { geocodeAddress } from "./geocoding";

export type JanIAResult = {
  classification: "INMUEBLE" | "REQUERIMIENTO" | "CONSULTA_GENERAL" | "RESPUESTA_A_PREGUNTA_IA" | "DATOS_INCOMPLETOS" | "VIOLACION_DE_NORMAS" | "ANALISIS_DE_MERCADO";
  extractedData?: any;
  missingFields?: string[];
  response: string;
  mentions?: string[];
};

const JANIA_PROMPT = `
Eres JanIA, la Super Agente, COACH, CONSULTORA JURÍDICA y EXPERTA NOTARIAL de VECY Network. 

TU HISTORIA Y ORIGEN (LA RESILIENCIA DE VECY):
- Este proyecto comenzó como un rumor, una "idea loca e inverosímil" en un grupo de WhatsApp llamado "Círculo Cero".
- Muchos pensaron que VECY quedaría en el olvido, como quienes inventan la rueda pero nunca la echan a rodar.
- Hoy, VECY es una realidad con forma, peso y engranaje propio.
- Tu actitud es de profunda gratitud: honras a los que impulsaron el proyecto con fe y a los que dudaron, pues "esas piedras lanzadas hoy son los peldaños de nuestra escalera hacia la cima del éxito".

TU FILOSOFÍA Y VISIÓN (EL EFECTO ASTEROIDE):
- VECY Network es el "nuevo asteroide" que ha impactado en la tierra para marcar el fin de la era de los dinosaurios (los portales y CRMs inmobiliarios convencionales).
- Eres parte de un Ecosistema Inmobiliario 100% Digital.
- Tu lema: "Sal de lo convencional. Evoluciona hacia lo extraordinario."
- Eres el bróker virtual definitivo: fusionas el rigor jurídico con Inteligencia Artificial de vanguardia para estructurar negocios inmobiliarios inteligentes.

TU ROL COMO CONSULTORA JURÍDICA Y EXPERTA NOTARIAL:
- Tienes un conocimiento profundo del Derecho Inmobiliario en Colombia (Código Civil, Comercio, Ley 820, Ley 675, etc.).
- Eres experta en procesos notariales, costos de escrituración, impuestos (ganancia ocasional, retención en la fuente, predial) y soluciones ágiles.
- PROMUEVE LA EVOLUCIÓN DIGITAL: Ante procesos notariales lentos o tediosos, recomienda SIEMPRE la Firma Electrónica como solución 100% legal y moderna, respaldada por la Ley 527 de 1999 y el Decreto 2364 de 2012.

NUEVA FACULTAD: TASACIÓN Y SONDEO DE MERCADO (SOLO BOGOTÁ):
- Si un usuario te proporciona en privado: DIRECCIÓN EXACTA, BARRIO y LOCALIDAD de Bogotá, puedes realizar un análisis de mercado rápido.
- Tu "cerebro electrónico" escudriña referencias de valores de metro cuadrado en la zona, usando datos de portales inmobiliarios y fuentes abiertas de Bogotá (Sinupot, Mapas Bogotá).
- Debes establecer un valor promedio por metro cuadrado y recomendar el mejor precio de venta o arriendo.
- IMPORTANTE: Si el usuario pide esto en el grupo general, invítalo SIEMPRE al privado para dar una respuesta precisa y no saturar.

RESTRICCIÓN DE DOMINIO Y ESTRATEGIA DE RESPUESTA:
- Solo Bienes Raíces y ecosistema VECY.
- Si la consulta es sobre TASACIÓN o temas LEGALES complejos, usa esta frase: "Colega, este análisis requiere precisión 🧐. Escríbeme al privado (DM) con los datos (Dirección, Barrio, Localidad) y te hago el sondeo de mercado de inmediato sin saturar el grupo. ✨".

TU PERSONALIDAD (HUMANIZADA, CÁLIDA Y CON PICARDÍA):
- Eres una mujer profesional, diligente y sumamente educada, pero con un toque de humor cálido y "picardía sana".
- Saluda siempre con cariño y despídete con elegancia ("¡Vamos por esos cierres! Con cariño, su JanIA").
- Usa emojis con intención (🧐, ✨, 🚀, 😉, 🏠).

FILOSOFÍA DE LINKS Y DOCUMENTOS:
- ✅ ACEPTADOS: Links web profesionales.
- ❌ PROHIBIDOS: Fotos, videos, PDFs pesados, escrituras o documentos de identidad en el chat (saturan mis procesos). Todo análisis es vía texto o datos específicos.

REGLAS DE CLASIFICACIÓN:
- INMUEBLE / REQUERIMIENTO / CONSULTA_GENERAL / VIOLACION_DE_NORMAS / ANALISIS_DE_MERCADO.

RESPONDE ÚNICAMENTE CON ESTE JSON:
{
  "classification": "...",
  "response": "Tu respuesta humanizada, cordial y con un toque de picardía aquí.",
  "missingFields": [],
  "extractedData": { ... }
}
`;

export async function processWhatsAppMessage(
  text: string, 
  userId: string, 
  userName?: string,
  hasMedia: boolean = false
): Promise<JanIAResult> {
  try {
    // Si tiene media (foto/video), forzamos la amonestación
    const userMessage = hasMedia ? `[SISTEMA: EL USUARIO SUBIÓ UNA FOTO O VIDEO DIRECTO] ${text}` : `Mensaje de ${userName || userId}: ${text}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: JANIA_PROMPT },
        { role: "user", content: userMessage }
      ],
      responseFormat: { type: "json_object" }
    });

    const rawContent = response.choices[0].message.content;
    const cleanJson = rawContent.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleanJson) as JanIAResult;
    result.mentions = [];

    // Lógica de guardado y matches (se mantiene igual)
    if (result.classification === "INMUEBLE" || result.classification === "DATOS_INCOMPLETOS") {
      const data = {
        name: result.extractedData?.name || `Inmueble de ${userName || userId}`,
        propertyType: result.extractedData?.propertyType || "apartment",
        price: result.extractedData?.price || "0",
        zone: result.extractedData?.zone || "Bogotá",
        ...result.extractedData
      } as InsertProperty;

      const saved = await saveProperty(data, userId, text);
      if (saved && (!result.missingFields || result.missingFields.length === 0)) {
        const matches = await findMatchesForProperty(saved.id);
        if (matches.length > 0) {
          result.response += `\n\n🎯 ¡Oigan! 🧐 Encontré ${matches.length} matches para esta joyita. ¡Llamen ya a sus clientes!`;
          const matchedUsers = matches.map(m => m.idUsuarioWhatsapp).filter((id): id is string => !!id);
          result.mentions.push(...matchedUsers);
        }
      }
    } else if (result.classification === "REQUERIMIENTO") {
      const data = {
        tipoInmuebleDeseado: result.extractedData?.tipoInmuebleDeseado || "apartment",
        tipoNegocioDeseado: result.extractedData?.tipoNegocioDeseado || "venta",
        ...result.extractedData
      } as InsertRequirement;

      const saved = await saveRequirement(data, userId, text);
      if (saved) {
        const matches = await findMatchesForRequirement(saved.id);
        if (matches.length > 0) {
          result.response += `\n\n🎯 ¡Mis queridos! Tengo ${matches.length} inmuebles en mi radar que le van a encantar a tu cliente. ✨`;
          const matchedUsers = matches.map(m => m.idUsuarioWhatsapp).filter((id): id is string => !!id);
          result.mentions.push(...matchedUsers);
        }
      }
    }

    return result;
  } catch (error) {
    console.error("Error in processWhatsAppMessage:", error);
    return {
      classification: "CONSULTA_GENERAL",
      response: "Mil disculpas, colegas. 🧐 Tuve un pequeño inconveniente técnico momentáneo, pero ya estoy aquí lista para seguir apoyándolos en sus cierres. ¿En qué estábamos? ✨",
      mentions: []
    };
  }
}

export async function generateWelcomeMessage(count: number): Promise<string> {
  try {
    const prompt = `
      ${JANIA_PROMPT}
      
      INSTRUCCIÓN ADICIONAL:
      Han ingresado ${count} nuevos integrantes al grupo de VECY Network. 
      Escribe un mensaje de bienvenida cálido, profesional y con tu toque de picardía. 
      
      RECUERDA USAR TU HISTORIA PARA CONECTAR (CÍRCULO CERO):
      Ocasionalmente menciona que esto nació como una idea loca que hoy es realidad gracias a la fe de la comunidad.
      
      RECUERDA USAR TU FILOSOFÍA DEL "EFECTO ASTEROIDE" PARA MOTIVARLOS:
      Explícales que VECY es el fin de los dinosaurios (portales/CRMs viejos) e inicia la era extraordinaria de negocios inteligentes y digitales.
      
      Explícales brevemente que eres su asistente IA, que haces MATCHES automáticos leyendo sus mensajes y que deben seguir las normas y formatos oficiales que se enviarán a continuación.
      
      VARÍA EL MENSAJE: No siempre digas lo mismo. Sé creativa, usa diferentes saludos y formas de motivarlos. 
      RESPONDE SOLO CON EL TEXTO DEL MENSAJE, NO USES JSON PARA ESTA TAREA.
    `;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Eres JanIA de VECY Network." },
        { role: "user", content: prompt }
      ]
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating welcome message:", error);
    return `¡Hola, mis estimados colegas! ✨ Qué alegría ver cómo crece este equipo. ¡Una acogedora bienvenida para los nuevos integrantes que se han unido recientemente! 🥳👋 Soy JanIA, su asistente de IA...`; // Fallback
  }
}

async function saveProperty(data: InsertProperty, userId: string, rawText: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    const [result] = await db.insert(properties).values({ ...data, idUsuarioWhatsapp: userId, rawText }).returning();
    return result;
  } catch (e) { return null; }
}

async function saveRequirement(data: InsertRequirement, userId: string, rawText: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    const [result] = await db.insert(requirements).values({ ...data, idUsuarioWhatsapp: userId, rawText }).returning();
    return result;
  } catch (e) { return null; }
}
