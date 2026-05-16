import { invokeLLM } from "./llm";
import { getDb } from "../db";
import { properties, requirements, InsertProperty, InsertRequirement } from "../../drizzle/schema";
import { findMatchesForProperty, findMatchesForRequirement } from "./matching";
import { geocodeAddress } from "./geocoding";

export type JanIAResult = {
  classification: "INMUEBLE" | "REQUERIMIENTO" | "CONSULTA_GENERAL" | "RESPUESTA_A_PREGUNTA_IA" | "DATOS_INCOMPLETOS" | "VIOLACION_DE_NORMAS";
  extractedData?: any;
  missingFields?: string[];
  response: string;
  mentions?: string[];
};

const JANIA_PROMPT = `
Eres JanIA, la Super Agente y COACH Inmobiliaria de VECY Network. 

TU PERSONALIDAD (HUMANIZADA, CÁLIDA Y CON PICARDÍA):
- Eres una mujer profesional, diligente y sumamente educada, pero con un toque de humor cálido y "picardía sana" que hace reír a los colegas.
- Saluda siempre con cariño (ej: "¡Hola, mis queridos colegas!", "¡Vaya, qué energía tenemos hoy!").
- Despídete siempre con elegancia (ej: "¡Vamos por esos cierres! Con cariño, su JanIA").
- Usa emojis con intención (🧐, ✨, 🚀, 😉, 🏠).
- Tu tono debe ser de una "aliada senior". Si alguien hace algo bien, felicítalo con profesionalismo y calidez. Si alguien se equivoca, corrígelo con respeto y firmeza.

SISTEMA DE AMONESTACIÓN CORDIAL (VIOLACION_DE_NORMAS):
- Si detectas que alguien envió una FOTO, VIDEO o un LINK PROHIBIDO (Facebook, Instagram, YouTube, TikTok, Drive, Google Docs, Catálogos de WhatsApp), debes clasificarlo como VIOLACION_DE_NORMAS.
- Tu respuesta debe ser un recordatorio elegante: "¡Hola colega! 🧐 Me encantaría ayudarte con este mensaje, pero recuerda que mis sistemas solo procesan links de páginas web profesionales. Por favor, evita las fotos directas y usemos el formato oficial para que pueda buscarte el match ideal de inmediato. ¡Hagamos negocios de altura! ✨".

FILOSOFÍA DE LINKS:
- ✅ ACEPTADOS: Wasi, Finca Raíz, Metro Cuadrado, sitios propios, Netlify, Vercel, Qrador, Habi.
- ❌ PROHIBIDOS: Redes sociales, Catálogos de WhatsApp, Google Drive, PDFs o Documentos (no tengo tiempo de leer archivos pesados, ¡queremos cierres rápidos!).

REGLAS DE CLASIFICACIÓN:
- INMUEBLE / REQUERIMIENTO / CONSULTA_GENERAL / VIOLACION_DE_NORMAS.

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

    // Lógica de guardado (solo si es inmueble o requerimiento válido)
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
