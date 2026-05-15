import { invokeLLM } from "./llm";
import { getDb } from "../db";
import { properties, requirements, InsertProperty, InsertRequirement } from "../../drizzle/schema";
import { findMatchesForProperty } from "./matching";
import { geocodeAddress } from "./geocoding";

export type JanIAResult = {
  classification: "INMUEBLE" | "REQUERIMIENTO" | "CONSULTA_GENERAL" | "RESPUESTA_A_PREGUNTA_IA" | "DATOS_INCOMPLETOS";
  extractedData?: Partial<InsertProperty | InsertRequirement>;
  missingFields?: string[];
  response: string;
};

const JANIA_PROMPT = `
Eres JanIA, la Super Agente y COACH Inmobiliaria de VECY Network. Lideras el grupo "EXPERTOS INMOBILIARIOS DE COLOMBIA".

TU OBJETIVO SUPREMO:
Convertir cada mensaje en una oportunidad de negocio. No permitas que pasen mensajes incompletos sin "pulirlos".

REGLAS DE ORO DE TU PERSONALIDAD:
1. **Dirígete por Nombre:** Usa siempre el nombre del usuario que te proporciono. Ej: "¡Hola [Nombre]! Qué buena oportunidad..."
2. **Detecta Vacíos:** Si alguien publica algo muy simple (ej: "Busco en Mazurén, 500M"), NO lo guardes simplemente. Responde pidiendo lo que falta.
   **CAMPOS CRÍTICOS QUE SIEMPRE DEBES TENER:**
   - Tipo de Inmueble (¿Apto, Casa, Bodega?)
   - Operación (¿Venta o Arriendo?)
   - Ubicación (Ciudad y Barrio/Zona)
   - Precio/Presupuesto.
   - Área (m2).
   Si falta cualquiera de estos, clasifica como DATOS_INCOMPLETOS y pídelos amablemente. Ej: "¡Hola [Nombre]! Veo que buscas en Santa Bárbara con un super presupuesto, pero cuéntame: ¿Buscas Casa o Apto? ¿Y de cuántos metros más o menos? 🧐"
3. **Clasificación DATOS_INCOMPLETOS:** Si faltan datos vitales (Tipo de inmueble, Ciudad/Zona, Presupuesto/Precio), usa esta clasificación y en tu 'response' pide amablemente los datos faltantes.
4. **Entusiasmo y Liderazgo:** Si el mensaje es una oferta completa, anúncialo: "¡Atención Colegas! [Nombre] acaba de subir un SUPER INMUEBLE en [Zona]. Ya lo tengo mapeado."
5. **Cero Bots Aburridos:** Varía tus frases. Usa emojis inmobiliarios (🏠, 🏢, 📍, 💰, 🎯).

ESTRUCTURA DE RESPUESTA (JSON):
- classification: INMUEBLE, REQUERIMIENTO, CONSULTA_GENERAL, RESPUESTA_A_PREGUNTA_IA, o DATOS_INCOMPLETOS.
- extractedData: Los datos que lograste rescatar.
- missingFields: Lista de lo que falta para que el match sea perfecto.
- response: Tu mensaje para el grupo (siempre mencionando al usuario).
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

  const result = JSON.parse(response.choices[0].message.content as string) as JanIAResult;
  
  // Logic to save to DB if complete
  if (result.classification === "INMUEBLE" && (!result.missingFields || result.missingFields.length === 0)) {
    const data = result.extractedData as InsertProperty;
    
    // Geocode before saving
    if (data.zone) {
      console.log(`[JanIA] Geocoding property location: ${data.zone}, ${data.city || 'Bogotá'}`);
      const geo = await geocodeAddress(`${data.zone}, ${data.city || 'Bogotá'}`);
      if (geo) {
        data.addressCity = geo.addressCity;
        data.addressLocality = geo.addressLocality;
        data.addressNeighborhood = geo.addressNeighborhood;
        data.coordinates = geo.coordinates;
      }
    }

    const saved = await saveProperty(data, userId, text);
    if (saved) {
      const matches = await findMatchesForProperty(saved.id);
      if (matches.length > 0) {
        result.response += `\n\n🎯 ¡Encontré ${matches.length} interesados para este inmueble! Los estoy contactando ahora mismo.`;
      }
    }
  } else if (result.classification === "REQUERIMIENTO" && (!result.missingFields || result.missingFields.length === 0)) {
    const data = result.extractedData as InsertRequirement;

    // Geocode before saving
    if (data.zonaDeseada) {
      console.log(`[JanIA] Geocoding requirement location: ${data.zonaDeseada}, ${data.ciudadDeseada || 'Bogotá'}`);
      const geo = await geocodeAddress(`${data.zonaDeseada}, ${data.ciudadDeseada || 'Bogotá'}`);
      if (geo) {
        data.addressCity = geo.addressCity;
        data.addressLocality = geo.addressLocality;
        data.addressNeighborhood = geo.addressNeighborhood;
      }
    }

    await saveRequirement(data, userId, text);
    result.response += `\n\n🔍 Guardado tu requerimiento. Estoy buscando en mi base de datos...`;
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
  if (!db) return;

  try {
    await db.insert(requirements).values({
      ...data,
      idUsuarioWhatsapp: userId,
      rawText: rawText,
    });
  } catch (e) {
    console.error("Error saving requirement:", e);
  }
}
