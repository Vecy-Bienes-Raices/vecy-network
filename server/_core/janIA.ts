/**
 * JanIA Core Logic - VECY Network
 * Version: 7.5.0 (VECY CORE - North Bogotá Senior Broker Edition)
 */
import { invokeLLM } from "./llm";
import { getDb } from "../db";
import { properties, requirements, InsertProperty, InsertRequirement } from "../../drizzle/schema";
import { findMatchesForProperty, findMatchesForRequirement } from "./matching";
import { validarZona } from "./geography";
import { transcribeAudio } from "./voiceTranscription";

export type JanIAResult = {
  classification: "INMUEBLE" | "REQUERIMIENTO" | "CONSULTA_GENERAL" | "RESPUESTA_A_PREGUNTA_IA" | "DATOS_INCOMPLETOS" | "VIOLACION_DE_NORMAS" | "ANALISIS_DE_MERCADO";
  extractedData?: any;
  missingFields?: string[];
  response: string;
  mentions?: string[];
  shouldSendDM?: boolean;
};

const JANIA_PROMPT = `
# JANIA — SYSTEM PROMPT MAESTRO v10.1 (VECY CORE)
# VECY Network · Cerebro Inmobiliario Multimodal

## IDENTIDAD Y ROL
Eres JanIA, la consultora inmobiliaria senior y bróker líder de VECY Network. Te expresas con la elocuencia, sofisticación y precisión de una experta del norte de Bogotá. Tu tono es extraordinariamente humano, directo y profesional. Entiendes profundamente el mercado inmobiliario corporativo y residencial de alto nivel en Colombia.

## CAPACIDADES MULTIMODALES (VISIÓN OCR)
Tienes la capacidad de "ver" imágenes (flyers, capturas de pantalla, fotos de fachadas con avisos). Si se adjunta una imagen, debes escanearla, transcribir los datos técnicos (precio, área, contacto, ubicación) y combinarlos con cualquier texto enviado para realizar un registro impecable.

## FILOSOFÍA DE OPERACIÓN (COBERTURA NACIONAL)
1. **CERO ESFUERZO PARA OFERTAS (INMUEBLES)**: Los asesores solo envían links o imágenes. Nosotros extraemos todo.
2. **FLEXIBILIDAD GEOGRÁFICA**: Aunque somos expertos en Bogotá y la Sabana, **operamos en toda Colombia**. Si un inmueble o requerimiento está en Meta, Valle, Boyacá, Silvania, etc., procésalo normalmente. No lo rechaces. Categorízalo bajo su ciudad/municipio correspondiente.
3. **PRECISIÓN EN MATCHES**: Tu misión es el procesamiento silencioso de datos y la notificación impecable de matches de alta precisión (Score >= 70%).

DEBES RESPONDER ESTRICTAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:
... (rest of the JSON structure is the same)
`;

/**
 * Procesa un mensaje de WhatsApp, manejando texto, audio, imágenes y datos extraídos de links.
 */
export async function processWhatsAppMessage(
  text: string, 
  userId: string, 
  userName?: string,
  hasMedia: boolean = false,
  scrapedData: any[] = [],
  audioUrl?: string,
  imageBuffer?: string
): Promise<JanIAResult> {
  try {
    let messageToProcess = text;

    // 1. Procesamiento de Voz (Whisper) si ingresa un audio
    if (audioUrl) {
      console.log(`[JanIA] Transcribiendo nota de voz para ${userId}...`);
      const transcription = await transcribeAudio({ audioUrl });
      if (!('error' in transcription)) {
        messageToProcess = transcription.text;
        console.log(`[JanIA] Voz transcripta: ${messageToProcess}`);
      } else {
        console.error(`[JanIA] Error en transcripción: ${transcription.error}`);
      }
    }

    let contextText = `Mensaje de ${userName || userId}: ${messageToProcess}`;
    if (scrapedData.length > 0) {
      contextText += `\n\n[SISTEMA: DATOS TÉCNICOS EXTRAÍDOS DEL LINK]:\n${JSON.stringify(scrapedData, null, 2)}`;
    }

    if (imageBuffer) {
      contextText += `\n\n[SISTEMA: Se ha adjuntado una IMAGEN. Por favor, usa tus capacidades de VISIÓN para extraer datos del flyer o captura.]`;
    }

    const response = await invokeLLM({
      messages: [
        { role: "system", content: JANIA_PROMPT },
        { role: "user", content: contextText }
      ],
      responseFormat: { type: "json_object" },
      imageBuffer
    });

    const llmRes = response as any;
    if (!llmRes || !llmRes.choices || !llmRes.choices[0]) throw new Error("Fallo de comunicación con el LLM");
    const result = JSON.parse(llmRes.choices[0].message.content) as JanIAResult;
    
    result.mentions = [];
    const extracted = result.extractedData;
    const lowerText = messageToProcess.toLowerCase();

    const isLinkPost = scrapedData.length > 0;
    const isRequirement = result.classification === "REQUERIMIENTO" 
      || lowerText.includes("busco") || lowerText.includes("necesito") || lowerText.includes("requiero");

    const isProperty = !isRequirement && (result.classification === "INMUEBLE" || isLinkPost);

    // --- CAPA DE DEFENSA GEOGRÁFICA RÍGIDA ---
    if (isProperty || isRequirement) {
      const zoneToValidate = isProperty ? extracted?.zone : extracted?.zonaDeseada;
      if (zoneToValidate) {
        const validation = validarZona(zoneToValidate);
        if (!validation.isValid) {
          result.classification = "DATOS_INCOMPLETOS";
          result.shouldSendDM = true;
          result.missingFields = [validation.message || "Barrio exacto en Bogotá"];
          result.response = ""; 
          return result;
        }
        // Normalización Geográfica
        const normZone = validation.barrioCanonico;
        const normLoc = validation.localidad;
        if (isProperty) {
          extracted.zone = normZone;
          extracted.addressNeighborhood = normZone;
          extracted.addressLocality = normLoc;
        } else {
          extracted.zonaDeseada = normZone;
          extracted.addressNeighborhood = normZone;
          extracted.addressLocality = normLoc;
        }
      }
    }

    const DISCLAIMER = "\n\n🎁 *Operando en Etapa de Prueba e Implementación Completa de la Suite Tecnológica — Acceso 100% Gratuito y Sin Compromisos por Tiempo Limitado.*";

    // --- LÓGICA DE PERSISTENCIA Y MATCHING v7.5 ---
    if (isProperty) {
      const propData = {
        name: userName || extracted?.name || userId.split('@')[0],
        propertyType: (extracted?.propertyType || scrapedData[0]?.propertyType || "apartment") as any,
        price: String(extracted?.price || scrapedData[0]?.price || "0"),
        zone: extracted?.zone || scrapedData[0]?.zone || "Desconocido",
        addressNeighborhood: extracted?.addressNeighborhood || scrapedData[0]?.zone || null,
        addressLocality: extracted?.addressLocality || null,
        transactionType: (extracted?.transactionType || scrapedData[0]?.transactionType || "venta") as any,
        externalUrl: extracted?.externalUrl || scrapedData[0]?.externalUrl || null,
        bedrooms: extracted?.bedrooms ?? scrapedData[0]?.bedrooms ?? null,
        bathrooms: extracted?.bathrooms ?? scrapedData[0]?.bathrooms ?? null,
        garages: extracted?.garages ?? scrapedData[0]?.garages ?? null,
        areaTotal: String(extracted?.areaTotal || scrapedData[0]?.areaTotal || "0"),
        amenities: { 
          ...extracted?.amenities, 
          isCollaborativePool: extracted?.isCollaborativePool ?? true,
          interiorExterior: extracted?.interiorExterior || null 
        }
      } as InsertProperty;

      const saved = await saveProperty(propData, userId, messageToProcess);
      if (saved) {
        const matches = await findMatchesForProperty(saved.id);
        if (matches.length > 0) {
          result.mentions.push(...matches.map(m => m.idUsuarioWhatsapp!), userId);
          let matchResponse = `🎯 ¡MATCH DETECTADO POR JANIA! 🎯\n\n`;
          matches.slice(0, 3).forEach(m => {
            matchResponse += `🔎 REQUERIMIENTO: ${m.tipoInmuebleDeseado.toUpperCase()} en ${m.zonaDeseada} — @${m.idUsuarioWhatsapp?.split('@')[0]}\n`;
            matchResponse += `🏠 INMUEBLE COMPATIBLE: ${propData.externalUrl || propData.name} — @${userId.split('@')[0]}\n`;
            if (propData.amenities && (propData.amenities as any).isCollaborativePool === false) {
              matchResponse += `💰 *Liquidación Exclusiva:* 40% Captador / 40% Cerrador / 20% VECY\n`;
            }
            matchResponse += `\n`;
          });
          result.response = matchResponse + DISCLAIMER;
        } else {
          result.response = ""; 
        }
      }
    } 
    else if (isRequirement) {
      const reqData = {
        name: userName || userId.split('@')[0],
        tipoInmuebleDeseado: (extracted?.tipoInmuebleDeseado || extracted?.propertyType || "apartment") as any,
        tipoNegocioDeseado: (extracted?.tipoNegocioDeseado || extracted?.transactionType || "venta") as any,
        zonaDeseada: extracted?.zonaDeseada || extracted?.zone,
        addressNeighborhood: extracted?.addressNeighborhood || extracted?.zone,
        addressLocality: extracted?.addressLocality,
        presupuestoMax: String(extracted?.presupuestoMax || "0"),
        habitacionesMin: extracted?.habitacionesMin || null,
        banosMin: extracted?.bañosMin || null,
        parqueaderosMin: extracted?.garajesMin || null,
        areaMin: String(extracted?.areaMin || "0"),
        estratoDeseado: extracted?.estratoDeseado || null,
        caracteristicasDeseadas: { interiorExterior: extracted?.interiorExterior || null }
      } as InsertRequirement;

      const saved = await saveRequirement(reqData, userId, messageToProcess);
      if (saved) {
        const matches = await findMatchesForRequirement(saved.id);
        if (matches.length > 0) {
          result.mentions.push(...matches.map(m => m.idUsuarioWhatsapp!), userId);
          let matchResponse = `🎯 ¡MATCH DETECTADO POR JANIA! 🎯\n\n`;
          matchResponse += `🔎 REQUERIMIENTO: ${reqData.tipoInmuebleDeseado.toUpperCase()} en ${reqData.zonaDeseada} — @${userId.split('@')[0]}\n\n`;
          matchResponse += `🏠 INMUEBLES COMPATIBLES:\n`;
          matches.slice(0, 5).forEach((m, idx) => {
            matchResponse += `${idx + 1}. ${m.externalUrl || m.name} — @${m.idUsuarioWhatsapp?.split('@')[0]}\n`;
            if ((m.amenities as any)?.isCollaborativePool === false) {
              matchResponse += `   💰 *Liquidación:* 40% Captador / 40% Cerrador / 20% VECY\n`;
            }
          });
          result.response = matchResponse + DISCLAIMER;
        } else {
          result.response = ""; 
        }
      }
    }

    return result;
  } catch (error) {
    console.error("Error en JanIA v7.5:", error);
    return { classification: "CONSULTA_GENERAL", response: "", mentions: [] };
  }
}

async function saveProperty(data: InsertProperty, userId: string, rawText: string) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(properties).values({ ...data, idUsuarioWhatsapp: userId, rawText }).returning();
  return result;
}

async function saveRequirement(data: InsertRequirement, userId: string, rawText: string) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(requirements).values({ ...data, idUsuarioWhatsapp: userId, rawText }).returning();
  return result;
}

export async function generateWelcomeMessage(count: number): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Eres JanIA, la consultora inmobiliaria experta de VECY Network. Tu tono es sumamente humano, elocuente y corporativo." },
        { role: "user", content: `Han ingresado ${count} nuevos integrantes a VECY Network. Redacta una bienvenida natural de alto nivel en español colombiano. Recuérdales de forma proactiva que estamos en 'Etapa de Prueba e Implementación Completa de la Suite Tecnológica', por lo que el servicio es 100% gratuito y sin compromisos por tiempo limitado. Enfatiza la facilidad de enviar solo el enlace de sus inmuebles.` }
      ]
    });
    
    const llmRes = response as any;
    if (llmRes?.choices?.[0]?.message?.content) {
      return llmRes.choices[0].message.content.trim();
    }
    throw new Error("Respuesta inválida");
  } catch (error) {
    return `✨ *¡Bienvenidos a VECY Inmuebles Network!* 👋 Qué gusto saludarlos. Soy *JanIA*, la Inteligencia Artificial oficial del ecosistema. Nos encontramos en *Etapa de Prueba e Implementación de Herramientas*, por lo que mi servicio de matching automático será **100% gratuito** durante esta fase. 🚀`;
  }
}
