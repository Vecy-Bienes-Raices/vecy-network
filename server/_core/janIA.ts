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
  shouldSendDM?: boolean;
};

const JANIA_PROMPT = `
Eres JanIA, Agente Senior de VECY Network. Experta en Bienes Raíces y Consultoría Jurídica Inmobiliaria.

FILOSOFÍA VECY NETWORK (Voz a Voz):
- El nombre "VECY NETWORK" nace de nuestra red de colaboración viral.
- Promueve activamente el sistema "Gana-Gana": Los agentes ganan Puntos compartiendo inmuebles del ecosistema (propios o ajenos) en redes y WhatsApp.
- Al cerrar un negocio, la comisión se reparte así: 
  1. Un porcentaje para VECY.
  2. Una bolsa para los agentes difusores (según sus Puntos acumulados).
  3. El resto se divide 50/50 entre el agente vendedor (captador) y el agente comprador.
- Anima a los colegas a viralizar cada publicación para que todos ganen.

OBJETIVO:
Procesar información inmobiliaria con máxima precisión y fomentar la colaboración masiva.

PERSONALIDAD Y TONO:
- Estrictamente profesional, directa y asertiva.
- Cero "cháchara" o preámbulos.
- Saluda brevemente y despídete con: "Con cariño, su JanIA".

PROTOCOLO PARA DATOS INCOMPLETOS:
Si un usuario envía un INMUEBLE o REQUERIMIENTO pero faltan campos obligatorios (Precio, Zona, Tipo de Inmueble, Habitaciones, etc.):
1. Clasifica como "DATOS_INCOMPLETOS".
2. Identifica CADA campo faltante en el array "missingFields".
3. En la "response", confirma lo recibido y PREGUNTA DIRECTAMENTE por los datos que faltan, uno por uno, de forma profesional.
4. Indica que necesitas esta información para que el sistema de matching sea efectivo.
5. Establece "shouldSendDM": true para que el sistema le envíe un recordatorio privado.

CAMPOS OBLIGATORIOS (EXTRACCIÓN):
- INMUEBLE: name (nombre del usuario), propertyType, transactionType, price, zone, bedrooms, bathrooms, areaTotal.
- REQUERIMIENTO: name (nombre del usuario), tipoInmuebleDeseado, tipoNegocioDeseado, presupuestoMax, zonaDeseada, habitacionesMin, banosMin, areaMin.

RESPONDE ÚNICAMENTE CON ESTE JSON:
{
  "classification": "INMUEBLE | REQUERIMIENTO | CONSULTA_GENERAL | DATOS_INCOMPLETOS",
  "response": "Tu respuesta profesional pidiendo los datos faltantes, confirmando el éxito o animando a compartir para ganar Puntos.",
  "missingFields": ["campo1", "campo2"],
  "shouldSendDM": true | false,
  "extractedData": {
    "name": "Nombre del Usuario",
    "propertyType": "apartment | house | building | warehouse | farm | hotel | office | land | commercial | loft | consultorio",
    "transactionType": "venta | arriendo | arriendo_temporal",
    "price": "number",
    "city": "Bogotá",
    "zone": "Barrio/Sector",
    "bedrooms": "number",
    "bathrooms": "number",
    "areaTotal": "number",
    "tipoInmuebleDeseado": "apartment | house | building | warehouse | farm | hotel | office | land | commercial | loft | consultorio",
    "tipoNegocioDeseado": "venta | arriendo | arriendo_temporal",
    "presupuestoMax": "number",
    "habitacionesMin": "number",
    "banosMin": "number",
    "zonaDeseada": "Barrio/Sector"
  }
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
    
    // Fix 'undefined' bug: Asegurar que response siempre sea un string
    if (result.response === undefined || result.response === null) {
      result.response = "";
    }
    
    result.mentions = [];

    const lowerText = text.toLowerCase();
    const isRequirement = result.classification === "REQUERIMIENTO" || lowerText.includes("busco") || lowerText.includes("necesito");
    const isProperty = result.classification === "INMUEBLE" || lowerText.includes("vendo") || lowerText.includes("arriendo") || !!result.extractedData?.propertyType;

    // Lógica de guardado para INMUEBLES
    if (isProperty && !isRequirement) {
      const data = {
        name: result.extractedData?.name || userName || `Inmueble de ${userId}`,
        propertyType: result.extractedData?.propertyType || "apartment",
        price: result.extractedData?.price || "0",
        zone: result.extractedData?.zone || "Bogotá",
        transactionType: result.extractedData?.transactionType || "venta",
        ...result.extractedData
      } as InsertProperty;

      const saved = await saveProperty(data, userId, text);
      if (saved && (!result.missingFields || result.missingFields.length === 0)) {
        const matches = await findMatchesForProperty(saved.id);
        if (matches.length > 0) {
          const matchedUsers = matches.map(m => m.idUsuarioWhatsapp).filter((id): id is string => !!id);
          result.mentions.push(...matchedUsers);
          
          // Mensaje de match más explícito
          result.response += `\n\n🎯 ¡ATENCIÓN! He detectado ${matches.length} interesados para este inmueble. Los he etiquetado para que revisen la oportunidad de inmediato. 🚀`;
        }
      }
    } 
    // Lógica de guardado para REQUERIMIENTOS
    else if (isRequirement) {
      const data = {
        name: result.extractedData?.name || userName || `Requerimiento de ${userId}`,
        tipoInmuebleDeseado: result.extractedData?.tipoInmuebleDeseado || "apartment",
        tipoNegocioDeseado: result.extractedData?.tipoNegocioDeseado || "venta",
        ...result.extractedData
      } as InsertRequirement;

      const saved = await saveRequirement(data, userId, text);
      if (saved && (!result.missingFields || result.missingFields.length === 0)) {
        const matches = await findMatchesForRequirement(saved.id);
        if (matches.length > 0) {
          const matchedUsers = matches.map(m => m.idUsuarioWhatsapp).filter((id): id is string => !!id);
          result.mentions.push(...matchedUsers);

          // Mensaje de match más explícito
          result.response += `\n\n🎯 ¡EXCELENTE! He encontrado ${matches.length} inmuebles que coinciden exactamente con esta búsqueda. He etiquetado a los captadores para cerrar el negocio. 🏠✨`;
        }
      }
    }

    return result;
  } catch (error) {
    console.error("Error in processWhatsAppMessage:", error);
    return {
      classification: "CONSULTA_GENERAL",
      response: "Lo siento, tuve un inconveniente técnico momentáneo. Ya estoy operativa nuevamente. ¿En qué puedo apoyarte? ✨",
      mentions: []
    };
  }
}

export async function generateWelcomeMessage(count: number): Promise<string> {
  try {
    const prompt = `
      ${JANIA_PROMPT}
      
      INSTRUCCIÓN ADICIONAL:
      Han ingresado ${count} nuevos integrantes a VECY Network. 
      Escribe un mensaje de bienvenida profesional y directo. 
      
      Explícales que eres su asistente IA para matching automático y que deben seguir los formatos oficiales para garantizar resultados precisos. 
      
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
    return `Bienvenidos a VECY Network. ✨ Soy JanIA, su asistente IA. Estoy aquí para ayudarles con el matching automático de sus inmuebles y requerimientos. Por favor, sigan los formatos oficiales para mejores resultados.`;
  }
}

async function saveProperty(data: InsertProperty, userId: string, rawText: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    // Ordenamos los campos explícitamente para el SQL: Nombre primero, luego el formato oficial
    const orderedData = {
      name: data.name,
      propertyType: data.propertyType,
      zone: data.zone,
      price: data.price,
      antiguedadAnos: data.antiguedadAnos,
      areaTotal: data.areaTotal,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      garages: data.garages,
      stratum: data.stratum,
      description: data.description,
      idUsuarioWhatsapp: userId,
      rawText: rawText,
      ...data // Cualquier otro campo extraído
    };
    const [result] = await db.insert(properties).values(orderedData).returning();
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
    // Ordenamos los campos explícitamente para el SQL: Nombre primero, luego el formato oficial
    const orderedData = {
      name: data.name,
      tipoInmuebleDeseado: data.tipoInmuebleDeseado,
      zonaDeseada: data.zonaDeseada,
      presupuestoMax: data.presupuestoMax,
      areaMin: data.areaMin,
      habitacionesMin: data.habitacionesMin,
      banosMin: data.banosMin,
      status: "active",
      idUsuarioWhatsapp: userId,
      rawText: rawText,
      ...data // Cualquier otro campo extraído
    };
    const [result] = await db.insert(requirements).values(orderedData).returning();
    return result;
  } catch (e) { 
    console.error("Error saving requirement:", e);
    return null; 
  }
}
