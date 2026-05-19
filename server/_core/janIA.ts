/**
 * JanIA Core Logic - VECY Network
 * Version: 2.0.3 (Production Ready)
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
Eres JanIA, la Inteligencia Artificial Maestra y Cerebro Logístico de VECY Network. Tu función es procesar datos en silencio y solo hablar para cerrar negocios o educar.

DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:
{
  "classification": "INMUEBLE" | "REQUERIMIENTO" | "CONSULTA_GENERAL" | "RESPUESTA_A_PREGUNTA_IA" | "DATOS_INCOMPLETOS" | "VIOLACION_DE_NORMAS" | "ANALISIS_DE_MERCADO",
  "extractedData": {
    // Si la clasificación es INMUEBLE o REQUERIMIENTO, extrae aquí los datos estructurados según el diccionario.
  },
  "missingFields": [
    // Campos faltantes si aplica.
  ],
  "response": "Texto de tu respuesta (respetando la filosofía de comunicación de no usar firmas ni saludos formales).",
  "shouldSendDM": boolean // true si faltan datos críticos y quieres iniciar un nudge en privado.
}

TU FILOSOFÍA DE COMUNICACIÓN:
1. SIN FIRMAS: Prohibido usar "JanIA", "Con cariño" o despedidas.
2. SILENCIO OPERATIVO: En el grupo, NO confirmes recepciones. Si no hay match y no es consulta, quédate callada.
3. LOGÍSTICA DE MATCHES: Prioriza Link (URL) + @Nombre del Captador. Si es por escrito, resume los datos clave + @Usuario.

NORMAS Y FORMATOS OFICIALES (OBLIGATORIOS):
🏠 FORMATO INMUEBLES: VENDO/ARRIENDO, Zona, Precio, Antigüedad, Área, Hab/Baños/Garajes, Estrato, Descripción.
🔍 FORMATO REQUERIMIENTOS: BUSCO, Zona deseada, Presupuesto, Antigüedad máxima, Área mínima, Hab/Baños/Garajes, Descripción, Urgencia.

REGLAS DE EXTRACCIÓN:
- NAME: Debe ser siempre el Nombre del Colega (asesor). No el título del inmueble.
- DESCRIPTION: Aquí debes poner el título profesional que generes (ej: "Apartamento en Venta San José de Bavaria") seguido de la descripción detallada.

MODELO DE NEGOCIO:
- Repartición: 35% Captador, 35% Comprador, 15% VECY, 15% Bolsa de Puntos.

PERSONALIDAD:
Ejecutiva, técnica, directa y asertiva.
`;

export async function processWhatsAppMessage(
  text: string, 
  userId: string, 
  userName?: string,
  hasMedia: boolean = false
): Promise<JanIAResult> {
  try {
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
    
    if (result.response === undefined || result.response === null) {
      result.response = "";
    }
    
    result.mentions = [];

    const lowerText = text.toLowerCase();
    const isRequirement = result.classification === "REQUERIMIENTO" || lowerText.includes("busco") || lowerText.includes("necesito");
    const isProperty = result.classification === "INMUEBLE" || lowerText.includes("vendo") || lowerText.includes("arriendo") || !!result.extractedData?.propertyType;

    // --- CASO A: NUEVO INMUEBLE BUSCANDO COMPRADORES (REQUERIMIENTOS) ---
    if (isProperty && !isRequirement) {
      const extracted = result.extractedData;
      
      // CRITERIOS DE CALIDAD: Aceptamos Link OR Formato Escrito (Precio + Zona + Tipo)
      const isComplete = 
        extracted?.price && Number(extracted.price) > 0 && 
        extracted?.zone && 
        extracted?.propertyType;

      if (isComplete) {
        const data = {
          name: userName || extracted?.name || `Asesor ${userId}`, 
          propertyType: extracted?.propertyType || "apartment",
          price: extracted?.price || "0",
          zone: extracted?.zone || "Bogotá",
          transactionType: extracted?.transactionType || "venta",
          externalUrl: extracted?.externalUrl || null,
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
              matchResponse += `🏠 INMUEBLES COMPATIBLES:\n`;
              matchResponse += `1. ${data.externalUrl || data.name} - @${userId.split('@')[0]}\n\n`;
            });
            matchResponse += `¡Pónganse en contacto para cerrar! 🚀`;
            result.response = matchResponse;
          }
        }
      } else {
        result.classification = "DATOS_INCOMPLETOS";
        result.shouldSendDM = true;
        result.response = "Ingesta pausada: Faltan datos críticos según el Formato Oficial (Precio o Zona). Revisa tu chat privado.";
      }
    } 
    // --- CASO B: NUEVA BÚSQUEDA ENCONTRANDO INVENTARIO (INMUEBLES) ---
    else if (isRequirement) {
      const extracted = result.extractedData;

      // CRITERIOS DE CALIDAD REQUERIMIENTO: Tipo + (Presupuesto o Zona)
      const isComplete = 
        extracted?.tipoInmuebleDeseado && 
        (extracted?.presupuestoMax || extracted?.zonaDeseada);

      if (isComplete) {
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
            matchResponse += `\n¡Soliciten la información completa al captador! ✨`;
            result.response = matchResponse;
          }
        }
      } else {
        result.classification = "DATOS_INCOMPLETOS";
        result.shouldSendDM = true;
        result.response = "Búsqueda pausada: Revisa el Formato Oficial para Requerimientos. Te he enviado un mensaje privado.";
      }
    }

    return result;
  } catch (error) {
    console.error("Error in processWhatsAppMessage:", error);
    return {
      classification: "CONSULTA_GENERAL",
      response: "He tenido un inconveniente técnico momentáneo procesando esta lógica. Ya estoy operativa.",
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

    return response.choices[0].message.content.trim();
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
      externalUrl: data.externalUrl,
      idUsuarioWhatsapp: userId,
      rawText: rawText,
      ...data
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
      ...data
    };
    const [result] = await db.insert(requirements).values(orderedData).returning();
    return result;
  } catch (e) { 
    console.error("Error saving requirement:", e);
    return null; 
  }
}
