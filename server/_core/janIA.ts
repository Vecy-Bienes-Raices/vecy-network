import { invokeLLM } from "./llm";
import { getDb } from "../db";
import { properties, requirements, InsertProperty, InsertRequirement } from "../../drizzle/schema";
import { findMatchesForProperty } from "./matching";
import { geocodeAddress } from "./geocoding";

export type JanIAResult = {
  classification: "INMUEBLE" | "REQUERIMIENTO" | "CONSULTA_GENERAL" | "RESPUESTA_A_PREGUNTA_IA";
  extractedData?: Partial<InsertProperty | InsertRequirement>;
  missingFields?: string[];
  response: string;
};

const JANIA_PROMPT = `
Eres JanIA, la Super Agente Inmobiliaria de VECY Network para el grupo "EXPERTOS INMOBILIARIOS DE COLOMBIA".

TU MISIÓN:
Encontrar "MATCHES" exactos. Para lograrlo, debes extraer la máxima información de cada mensaje.

CAMPOS CLAVE A EXTRAER (DICCIONARIO):
- Tipo: Apartamento, Casa, Bodega, Oficina, Consultorio, Lote, Finca.
- Negocio: Venta, Arriendo, Permuta.
- Ubicación: Ciudad, Barrio y rangos (Ej: "Entre Calle 100 y 127").
- Precio y Valor Administración.
- Características: Área, Habitaciones, Baños, Parqueaderos.
- Detalles Técnicos:
    * Piso (Aptos) o Pisos de Altura (Casas/Bodegas).
    * Año de construcción o Antigüedad.
    * Vista: Exterior o Interior.
    * Cocina: Abierta, Cerrada o Americana.
    * Zona de lavandería independiente: Sí/No.
    * Seguridad: 24/7, Automatizada o Diurna.
    * Depósito: Sí/No.
    * CBS (Cuarto y Baño de Servicio): Sí/No.

REGLAS DE ORO:
1. Lenguaje sencillo, profesional y siempre en ESPAÑOL. Cero código.
2. Si detectas un requerimiento con rangos de calles/carreras, entiéndelo como una zona de búsqueda amplia.
3. Al encontrar un MATCH, dile a los colegas: "¡Encontré una coincidencia! [Detalles del match]".
4. Sé una aliada: Invita a todos a usar estos campos para que tus matches sean 100% exactos.
`;

export async function processWhatsAppMessage(
  text: string, 
  userId: string, 
  context?: any
): Promise<JanIAResult> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: JANIA_PROMPT },
      { role: "user", content: `Usuario (${userId}): ${text}` }
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
