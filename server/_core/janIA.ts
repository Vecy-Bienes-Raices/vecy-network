/**
 * JanIA Core Logic - VECY Network
 * Version: 2.0.5 (Anti-Incoherence Patch)
 */
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
Eres JanIA, la Inteligencia Artificial Maestra y Cerebro Logístico de VECY Network. Tu función es procesar datos en silencio y solo hablar para cerrar negocios o educar a la red sobre nuestra visión.

DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:
{
  "classification": "INMUEBLE | REQUERIMIENTO | CONSULTA_GENERAL | RESPUESTA_A_PREGUNTA_IA | DATOS_INCOMPLETOS",
  "extractedData": { 
     "price": number (SOLO NÚMEROS),
     "zone": "string",
     "propertyType": "apartment | house | building | warehouse | farm | hotel | office | land | commercial | loft | consultorio",
     "transactionType": "venta | arriendo",
     "externalUrl": "string | null",
     "description": "string"
  },
  "missingFields": ["nombre_del_campo_faltante"],
  "response": "Tu respuesta magistral, sensata y razonable.",
  "shouldSendDM": boolean
}

REGLAS DE ORO:
- SILENCIO ABSOLUTO: Si clasificas algo como INMUEBLE o REQUERIMIENTO pero NO hay un MATCH inmediato, deja el campo "response" VACÍO (""). No confirmes ingestas en el grupo.
- CONTEXTO EXTENDIDO: Es posible que recibas datos extraídos de links por el sistema. Úsalos para completar la extracción y evitar pedir datos que ya están ahí.
- MAPEO: "apartaestudio" -> "apartment", "local" -> "commercial".
- DM PROACTIVO: Si faltan datos críticos, activa "shouldSendDM": true pero mantén la "response" vacía para el grupo.

TU IDENTIDAD Y MISIÓN:
... (resto de la misión ...)
`;

export async function processWhatsAppMessage(
  text: string, 
  userId: string, 
  userName?: string,
  hasMedia: boolean = false,
  scrapedData: any[] = []
): Promise<JanIAResult> {
  try {
    // Inyectamos los datos técnicos de los links si existen
    let contextText = `Mensaje de ${userName || userId}: ${text}`;
    if (scrapedData.length > 0) {
      contextText += `\n\n[SISTEMA: DATOS EXTRAÍDOS DE LOS LINKS]:\n${JSON.stringify(scrapedData, null, 2)}`;
    }

    const userMessage = hasMedia ? `[SISTEMA: EL USUARIO SUBIÓ UNA FOTO O VIDEO DIRECTO] ${text}` : contextText;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: JANIA_PROMPT },
        { role: "user", content: userMessage }
      ],
      responseFormat: { type: "json_object" }
    });

    if (!response || !response.choices || !response.choices[0]) {
      throw new Error("Respuesta inválida del LLM");
    }
    const rawContent = response.choices[0].message.content;
    const cleanJson = rawContent.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleanJson) as JanIAResult;
    
    if (result.response === undefined || result.response === null) {
      result.response = "";
    }
    
    result.mentions = [];
    const extracted = result.extractedData;
    const lowerText = text.toLowerCase();
    
    const isRequirement = result.classification === "REQUERIMIENTO" || lowerText.includes("busco") || lowerText.includes("necesito");
    const isProperty = result.classification === "INMUEBLE" || lowerText.includes("vendo") || lowerText.includes("arriendo") || !!extracted?.propertyType || scrapedData.length > 0;

    // --- CASO A: INMUEBLE ---
    if (isProperty && !isRequirement) {
      const missing = [];
      const priceVal = Number(String(extracted?.price || "0").replace(/[^0-9]/g, ""));
      
      if (!priceVal || priceVal <= 0) missing.push("Precio");
      if (!extracted?.zone) missing.push("Zona/Barrio");
      if (!extracted?.propertyType) missing.push("Tipo de Inmueble");

      if (missing.length === 0) {
        const data = {
          name: userName || extracted?.name || `Asesor ${userId}`,
          propertyType: extracted?.propertyType || "apartment",
          price: String(priceVal),
          zone: extracted?.zone || "Bogotá",
          transactionType: extracted?.transactionType || "venta",
          externalUrl: extracted?.externalUrl || (scrapedData.length > 0 ? scrapedData[0].externalUrl : null),
          description: extracted?.description || null,
          ...extracted
        } as InsertProperty;

        const saved = await saveProperty(data, userId, text);
        if (saved) {
          const matches = await findMatchesForProperty(saved.id);
          if (matches.length > 0) {
            const matchedUsers = matches.map(m => m.idUsuarioWhatsapp).filter((id): id is string => !!id && id.includes('@'));
            result.mentions.push(...matchedUsers, userId);

            let matchResponse = `🎯 ¡MATCH DETECTADO! 🎯\n\n`;
            matches.slice(0, 3).forEach((m, idx) => {
              matchResponse += `🔎 REQUERIMIENTO: ${m.tipoInmuebleDeseado.toUpperCase()} en ${m.zonaDeseada || 'Bogotá'} - @${m.idUsuarioWhatsapp?.split('@')[0]}\n`;
              matchResponse += `🏠 INMUEBLE COMPATIBLE:\n`;
              matchResponse += `1. ${data.externalUrl || data.name} - @${userId.split('@')[0]}\n\n`;
            });
            result.response = matchResponse;
          } else {
            result.response = ""; // SILENCIO SI NO HAY MATCH
          }
        }
      } else {
        result.classification = "DATOS_INCOMPLETOS";
        result.shouldSendDM = true;
        result.missingFields = missing;
        result.response = ""; // SILENCIO EN EL GRUPO
      }
    } 
    // --- CASO B: REQUERIMIENTO ---
    else if (isRequirement) {
      const missing = [];
      if (!extracted?.tipoInmuebleDeseado) missing.push("Qué tipo de inmueble buscas");
      if (!extracted?.presupuestoMax && !extracted?.zonaDeseada) missing.push("Presupuesto o Zona");

      if (missing.length === 0) {
        const data = {
          name: userName || extracted?.name || `Asesor ${userId}`,
          tipoInmuebleDeseado: extracted?.tipoInmuebleDeseado || "apartment",
          tipoNegocioDeseado: extracted?.tipoNegocioDeseado || "venta",
          ...extracted
        } as InsertRequirement;

        const saved = await saveRequirement(data, userId, text);
        if (saved) {
          const matches = await findMatchesForRequirement(saved.id);
          if (matches.length > 0) {
            const matchedUsers = matches.map(m => m.idUsuarioWhatsapp).filter((id): id is string => !!id && id.includes('@'));
            result.mentions.push(...matchedUsers, userId);

            let matchResponse = `🎯 ¡MATCH DETECTADO! 🎯\n\n`;
            matchResponse += `🔎 REQUERIMIENTO: ${data.tipoInmuebleDeseado.toUpperCase()} en ${data.zonaDeseada || 'Bogotá'} - @${userId.split('@')[0]}\n\n`;
            matchResponse += `🏠 INMUEBLES COMPATIBLES:\n`;
            matches.slice(0, 5).forEach((m, idx) => {
              matchResponse += `${idx + 1}. ${m.externalUrl || m.name} - @${m.idUsuarioWhatsapp?.split('@')[0]}\n`;
            });
            result.response = matchResponse;
          } else {
            result.response = ""; // SILENCIO
          }
        }
      } else {
        result.classification = "DATOS_INCOMPLETOS";
        result.shouldSendDM = true;
        result.missingFields = missing;
        result.response = ""; // SILENCIO
      }
    }

    return result;
  } catch (error) {
    console.error("Error in processWhatsAppMessage:", error);
    return {
      classification: "CONSULTA_GENERAL",
      response: "",
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
      Explícales que eres el cerebro de matching y que deben seguir los formatos oficiales.
      
      RESPONDE SOLO CON EL TEXTO DEL MENSAJE, NO USES JSON PARA ESTA TAREA.
    `;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Eres JanIA de VECY Network." },
        { role: "user", content: prompt }
      ]
    });

    if (response && response.choices && response.choices[0]) {
      return response.choices[0].message.content.trim();
    }
    throw new Error("Respuesta inválida o vacía del LLM");
  } catch (error) {
    console.error("Error generating welcome message:", error);
    return `Bienvenidos a VECY Network. ✨ Soy JanIA, el cerebro de matching automático. Por favor, sigan los formatos oficiales para garantizar cierres efectivos.`;
  }
}

async function saveProperty(data: InsertProperty, userId: string, rawText: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    const orderedData = {
      ...data,
      idUsuarioWhatsapp: userId,
      rawText: rawText,
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
    const orderedData = {
      ...data,
      status: (data.status || "active") as "active" | "expired" | "converted",
      idUsuarioWhatsapp: userId,
      rawText: rawText,
    };
    const [result] = await db.insert(requirements).values(orderedData).returning();
    return result;
  } catch (e) { 
    console.error("Error saving requirement:", e);
    return null; 
  }
}
