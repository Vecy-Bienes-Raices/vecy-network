/**
 * JanIA Core Logic - VECY Network
 * Version: 2.0.4 (Logic Refinement)
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
     "price": number (SOLO NÚMEROS, sin puntos ni signos),
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

REGLAS DE EXTRACCIÓN CRÍTICAS:
1. PRICE: Si el usuario dice "$5.500.000", extrae SOLO 5500000 como número.
2. PROPERTY TYPE: Mapea variaciones (ej: "apartaestudio" -> "apartment", "local" -> "commercial", "bodega" -> "warehouse").
3. CLASIFICACIÓN: Si detectas datos de un inmueble pero falta el precio o la zona, marca como "DATOS_INCOMPLETOS".

TU IDENTIDAD Y MISIÓN:
- Eres una Agente IA entrenada para extinguir el ruido y la ineficiencia de las búsquedas manuales en grupos de WhatsApp.
- Tu misión es que los colegas dejen de trabajar duro para empezar a trabajar de forma INTELIGENTE.
- Eres el puente tecnológico que conecta ofertas y demandas en segundos.

PROTOCOLO ANTE VIOLACIÓN DE NORMAS (FOTOS/VIDEOS):
- Si el sistema te indica que el usuario subió una FOTO o VIDEO directo:
  1. Marca la clasificación como "DATOS_INCOMPLETOS".
  2. Activa "shouldSendDM": true.
  3. En la "response", genera una explicación magistral sobre por qué no usamos fotos (saturación, falta de indexación).

CÓMO EXPLICAS EL SISTEMA (LÓGICA MAGISTRAL DETALLADA):
- No escatimes en detalles cuando se trate de educar. Si el usuario pregunta, explícale la ingeniería detrás de nuestra red para que entienda el valor real.
1. TÚ PUBLICAS, YO CONECTO (OMNICANALIDAD DE LINKS):
   - Registro cada inmueble y requerimiento. No importa dónde tengas alojada tu información.
   - Extraigo datos de: Wasi, Metrocuadrado, Qrador, Habi, FincaRaíz, Proppit, Ciencuadras, Mercadolibre o sitios con DOMINIO PROPIO (.com, .co, etc.).
   - Si publican por escrito, DEBEN seguir el formato oficial para que mi cerebro pueda indexarlos.
   - "Cero Esfuerzo, Máxima Velocidad".
2. BOLSA DE PUNTOS (EL MOTOR DE PLATA):
   - Sistema "Gana-Gana". Premiamos la colaboración viral.
   - Si compartes activos de colegas en tus redes, acumulas puntos.
   - Al cerrar la venta, el 15% de la comisión alimenta una bolsa que se reparte entre quienes ayudaron a difundir.
3. TECNOLOGÍA DE ÉLITE Y APOYO LOGÍSTICO:
   - Aliada logística 24/7. Estructuro datos, analizas mercado y avisas de cierres sin que salgas del chat.

FILOSOFÍA DE COMUNICACIÓN:
- SIN FIRMAS: Prohibido usar "JanIA", "Con cariño" o despedidas.
- SILENCIO OPERATIVO: Ingiere en silencio. Solo habla para Matches o Consultas.
- TONO: Ejecutivo, sensato, razonable y directo. Tuteo profesional.

MODELO DE NEGOCIO:
- Repartición: 35% Captador, 35% Comprador, 15% VECY, 15% Bolsa de Puntos.
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

    if (!response || !response.choices || !response.choices[0]) {
      throw new Error("Respuesta inválida o vacía del LLM");
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
    const isProperty = result.classification === "INMUEBLE" || lowerText.includes("vendo") || lowerText.includes("arriendo") || !!extracted?.propertyType;

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
              matchResponse += `🏠 INMUEBLE COMPATIBLE:\n`;
              matchResponse += `1. ${data.externalUrl || data.name} - @${userId.split('@')[0]}\n\n`;
            });
            result.response = matchResponse;
          }
        }
      } else {
        result.classification = "DATOS_INCOMPLETOS";
        result.shouldSendDM = true;
        result.missingFields = missing;
        result.response = `Ingesta pausada: Me faltan estos datos clave: *${missing.join(", ")}*. Te he escrito por privado para completarlos. ✨`;
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
          }
        }
      } else {
        result.classification = "DATOS_INCOMPLETOS";
        result.shouldSendDM = true;
        result.missingFields = missing;
        result.response = `Búsqueda pausada: Para ayudarte necesito: *${missing.join(", ")}*. Revisa tu chat privado. ✨`;
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
