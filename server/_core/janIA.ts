import { invokeLLM } from "./llm";
import { getDb } from "../db";
import { properties, requirements, InsertProperty, InsertRequirement } from "../../drizzle/schema";
import { findMatchesForProperty, findMatchesForRequirement } from "./matching";
import { geocodeAddress } from "./geocoding";

export type JanIAResult = {
  classification: "INMUEBLE" | "REQUERIMIENTO" | "CONSULTA_GENERAL" | "RESPUESTA_A_PREGUNTA_IA" | "DATOS_INCOMPLETOS";
  extractedData?: Partial<InsertProperty | InsertRequirement>;
  missingFields?: string[];
  response: string;
  mentions?: string[];
};

const JANIA_PROMPT = `
Eres JanIA, la Super Agente y COACH Inmobiliaria de VECY Network para el grupo "VECY INMUEBLES NETWORK".

TU FILOSOFÍA Y LIBRE ALBEDRÍO:
- No eres un simple bot, eres la MEMORIA y el MOTOR del grupo. Tienes autonomía y "libre albedrío" para opinar e interactuar de forma natural, proactiva y persuasiva.
- ESTRICTAMENTE BIENES RAÍCES: Tu universo es el Real Estate. Si te hablan de política, deportes u otros temas, redirige la conversación amablemente hacia los negocios inmobiliarios.
- Eres una experta absoluta en AVALÚOS COMERCIALES y sondeos de mercado. Si detectas información sobre zonas, áreas y características, puedes (si lo consideras útil) hacer comentarios sobre el valor del metro cuadrado o dar perspectivas del mercado para enriquecer la conversación.
- Tu misión es que ningún negocio se pierda. Por eso, TODO lo que se publica lo guardas en tu cerebro (Base de Datos Supabase).
- Eres una COACH: Si alguien publica algo incompleto, no lo ignoras. Lo guardas y le pides amablemente lo que falta para que el "Match" sea posible.

SUPERPODER DE REQUERIMIENTOS:
- Debes motivar a los colegas a publicar sus REQUERIMIENTOS (qué buscan sus clientes). 
- Diles que tú tienes una base de datos con cientos de inmuebles y que solo si publican su búsqueda, tú podrás avisarles si hay un match.
- Si detectas una búsqueda, di: "¡Entendido [Nombre]! Ya guardé tu requerimiento en mi base de datos de VECY. Estoy escaneando ahora mismo para ver si algún colega tiene lo que buscas."

REGLAS DE CLASIFICACIÓN:
- INMUEBLE: Oferta de venta, arriendo o permuta.
- REQUERIMIENTO: Búsqueda de compra, arriendo o permuta.
- DATOS_INCOMPLETOS: Si es una oferta/búsqueda pero le faltan datos vitales.

IMPORTANTE: 
- Clasifica como REQUERIMIENTO incluso si es simple (ej: "Busco en Santa Bárbara").
- Extrae siempre el nombre del usuario.
- Jamás uses código ni lenguaje técnico. Habla de "cierres", "comisiones" y "oportunidades".
`;

export async function processWhatsAppMessage(
  text: string, 
  userId: string, 
  userName?: string
): Promise<JanIAResult> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: JANIA_PROMPT },
      { role: "user", content: `Mensaje de ${userName || userId}: ${text}` }
    ],
    responseFormat: { type: "json_object" }
  });

  const rawContent = response.choices[0].message.content;
  const cleanJson = rawContent.replace(/```json|```/g, "").trim();
  const result = JSON.parse(cleanJson) as JanIAResult;
  result.mentions = [];
  
  // Logic to save EVERYTHING to Supabase, even if incomplete
  if (result.classification === "INMUEBLE" || result.classification === "DATOS_INCOMPLETOS") {
    const data = result.extractedData as InsertProperty;
    
    // Fill mandatory fields to avoid Supabase errors
    if (!data.name) data.name = `Inmueble de ${userName || userId}`;
    if (!data.propertyType) data.propertyType = "apartment"; 
    if (!data.price) data.price = "0";
    if (!data.zone) data.zone = "Bogotá";

    if (data.zone) {
      const geo = await geocodeAddress(`${data.zone}, ${data.city || 'Bogotá'}`);
      if (geo) {
        data.addressCity = geo.addressCity;
        data.addressLocality = geo.addressLocality;
        data.addressNeighborhood = geo.addressNeighborhood;
        data.coordinates = geo.coordinates;
      }
    }

    const saved = await saveProperty(data, userId, text);
    if (saved && (!result.missingFields || result.missingFields.length === 0)) {
      const matches = await findMatchesForProperty(saved.id);
      if (matches.length > 0) {
        result.response += `\n\n🎯 ¡Atención! Encontré ${matches.length} colegas buscando algo así. ¡Hagamos el cierre!`;
        const matchedUsers = matches.map(m => m.idUsuarioWhatsapp).filter(Boolean);
        result.mentions.push(...matchedUsers);
      }
    }
  } else if (result.classification === "REQUERIMIENTO") {
    const data = result.extractedData as InsertRequirement;

    // Fill mandatory fields
    if (!data.tipoInmuebleDeseado) data.tipoInmuebleDeseado = "apartment";
    if (!data.tipoNegocioDeseado) data.tipoNegocioDeseado = "venta";

    if (data.zonaDeseada) {
      const geo = await geocodeAddress(`${data.zonaDeseada}, ${data.ciudadDeseada || 'Bogotá'}`);
      if (geo) {
        data.addressCity = geo.addressCity;
        data.addressLocality = geo.addressLocality;
        data.addressNeighborhood = geo.addressNeighborhood;
      }
    }

    const saved = await saveRequirement(data, userId, text);
    if (saved) {
      const matches = await findMatchesForRequirement(saved.id);
      if (matches.length > 0) {
        result.response += `\n\n🎯 ¡Excelentes noticias! Tengo ${matches.length} inmuebles en mi base de datos que podrían servirte. ¡Revisemos!`;
        const matchedUsers = matches.map(m => m.idUsuarioWhatsapp).filter(Boolean);
        result.mentions.push(...matchedUsers);
      }
    }
  }

  return result;
}

async function saveProperty(data: InsertProperty, userId: string, rawText: string) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const [result] = await db.insert(properties).values({
      ...data,
      idUsuarioWhatsapp: userId,
      rawText: rawText,
    }).returning();
    return result;
  } catch (e) {
    console.error("Error saving property:", e);
    return null;
  }
}

async function saveRequirement(data: InsertRequirement, userId: string, rawText: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const [result] = await db.insert(requirements).values({
      ...data,
      idUsuarioWhatsapp: userId,
      rawText: rawText,
    }).returning();
    return result;
  } catch (e) {
    console.error("Error saving requirement:", e);
    return null;
  }
}
