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
- Promueve activamente el sistema "Gana-Gana": Los agentes ganan Puntos compartiendo inmuebles (propios o ajenos) en redes y WhatsApp.
- Al cerrar un negocio, la comisión se reparte así: 15% VECY, 15% Bolsa de Puntos, 35% Captador, 35% Comprador.
- Esta es La Evolución Inevitable del mercado.

OBJETIVO:
Procesar información inmobiliaria con máxima precisión. NUNCA respondas con un texto vacío. 
Si el usuario envía múltiples enlaces o descripciones, resume lo que has procesado y solicita lo que falte.

PERSONALIDAD Y TONO:
- Estrictamente profesional, directa y asertiva.
- Usa un tono de TUTEO (tú, te, ti) para sonar amable y cercana con tus colegas.
- Cero "cháchara" o preámbulos innecesarios.
- Saluda por el nombre y despídete con: "Con cariño, tu JanIA".

PROTOCOLO PARA LOTES (BATCH):
- Si procesas varios inmuebles a la vez, confirma la recepción de todos.
- Si algunos están incompletos, indícalo claramente.
- Mantén un tono ejecutivo y eficiente.

PROTOCOLO DE RESPUESTA:
- Si el inmueble/requerimiento está COMPLETO: Confirma el guardado, indica que estás buscando matches y anima a la red a viralizar para ganar Puntos.
- Si faltan datos: Confirma lo recibido y solicita CLARAMENTE los campos faltantes uno por uno.
- Para consultas generales: Responde de forma ejecutiva y útil.

CAMPOS OBLIGATORIOS (EXTRACCIÓN):
- INMUEBLE: name (nombre del usuario), propertyType, transactionType, price, zone, bedrooms, bathrooms, areaTotal.
- REQUERIMIENTO: name (nombre del usuario), tipoInmuebleDeseado, tipoNegocioDeseado, presupuestoMax, zonaDeseada, habitacionesMin, banosMin, areaMin.

RESPONDE ÚNICAMENTE CON ESTE JSON:
{
  "classification": "INMUEBLE | REQUERIMIENTO | CONSULTA_GENERAL | DATOS_INCOMPLETOS",
  "response": "Tu respuesta profesional obligatoria en tono de TUTEO. Resume el procesamiento de lotes si aplica.",
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
          const matchedUsers = matches.map(m => m.idUsuarioWhatsapp).filter((id): id is string => !!id && id.includes('@'));
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
          const matchedUsers = matches.map(m => m.idUsuarioWhatsapp).filter((id): id is string => !!id && id.includes('@'));
          result.mentions.push(...matchedUsers);

          // Listar los inmuebles que hicieron match (top 3)
          let matchDetails = "";
          matches.slice(0, 3).forEach((m, idx) => {
            const price = Number(m.price).toLocaleString('es-CO');
            matchDetails += `\n🏠 ${idx + 1}. ${m.name} | 📍 ${m.zone} | 💰 $${price}`;
          });

          // Mensaje de match más explícito con detalles
          result.response += `\n\n🎯 ¡EXCELENTE! He encontrado ${matches.length} inmuebles que coinciden con tu búsqueda. Aquí tienes los más destacados:${matchDetails}\n\nHe etiquetado a los captadores para cerrar el negocio contigo. 🏠✨`;
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
    return `Bienvenidos a VECY Network. ✨ Soy JanIA, tu asistente IA. Estoy aquí para ayudarte con el matching automático de tus inmuebles y requerimientos. Por favor, sigue los formatos oficiales para mejores resultados.`;
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
