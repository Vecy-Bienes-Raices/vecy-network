/**
 * JanIA Vision - VECY BIENES RAÍCES
 * Lógica de análisis de flyers y visión artificial multimodal ultraligera con Gemini.
 */
import axios from "axios";
import { FlyerVisionResult } from "./types";
import { 
  geminiKeyManager, 
  assertKeyAllowedForExecution 
} from "../geminiKeyManager";

/**
 * Extractor visual especializado y ultraligero para Flyers y Afiches Inmobiliarios (v31.22).
 * Procesa afiches de Oferta o Demanda en < 2 segundos con Gemini 2.5 Flash / cascada multi-modelo
 * sin sobrecargar el prompt base de 25k tokens y evitando cuellos de botella.
 */
export async function extractFlyerVision(imageBufferBase64: string): Promise<FlyerVisionResult | null> {
  if (!imageBufferBase64 || imageBufferBase64.trim() === '') return null;

  const freeKeys = geminiKeyManager.getFreeKeys();
  const paidKey = geminiKeyManager.getPaidKey();
  const candidateKeys = paidKey ? [...freeKeys, paidKey] : freeKeys;

  if (candidateKeys.length === 0) {
    console.warn("[JanIA-Vision] ⚠️ No hay claves de Gemini configuradas para análisis visual.");
    return null;
  }

  const models = [
    "gemini-flash-lite-latest",
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash"
  ];

  const prompt = `Eres la IA experta en visión documental y extracción de flyers inmobiliarios de VECY Bienes Raíces en Colombia.
Analiza la imagen enviada a un grupo inmobiliario de WhatsApp.
Determina si es:
1. "INMUEBLE" (Oferta de venta, arriendo o permuta de una propiedad CON TEXTO PUBLICITARIO IMPRESO).
2. "REQUERIMIENTO" (Demanda o búsqueda: un asesor o cliente busca/necesita/compra un inmueble para un cliente, constructora o marca en expansión CON TEXTO PUBLICITARIO IMPRESO).
3. "CONSULTA_GENERAL" (Fotografía ambiental común sin texto publicitario sobreimpreso —fachadas, salas, comedores, cocinas, baños, piscinas, jardines, planos mudos—, comprobante bancario, meme o ajeno a bienes raíces).

REGLAS CRÍTICAS DE CLASIFICACIÓN:
- REGLA DE ORO DE AFICHES/FLYERS: Si la imagen es una simple FOTO FOTOGRÁFICA AMBIENTAL (la foto de una casa, un edificio, una sala, una chimenea) SIN texto publicitario tipográfico impreso con especificaciones comerciales (precios, metros, contacto), DEBES clasificarla OBLIGATORIAMENTE como "CONSULTA_GENERAL" con isFlyerOrBanner: false y flyerVerbatimText: "".
- Si el flyer contiene texto tipográfico con términos como "BUSCO", "BUSCAMOS", "SE BUSCA", "SE REQUIERE", "COMPRO", "COMPRAMOS", "MARCAS EN EXPANSIÓN", "CONSTRUCTORES BUSCAN", "CLIENTE COMPRA" o similares, clasifica OBLIGATORIAMENTE como "REQUERIMIENTO" (isFlyerOrBanner: true).
- Si el flyer contiene texto tipográfico con términos como "VENDO", "VENDEMOS", "SE VENDE", "EN VENTA", "OFREZCO", "ARRIENDO", "SE ARRIENDA", "DISPONIBLE", "OPEN HOUSE" o describe un inmueble específico ofertado con especificaciones, clasifica como "INMUEBLE" (isFlyerOrBanner: true).

Si es INMUEBLE o REQUERIMIENTO (exclusivamente si tiene texto sobreimpreso):
- isFlyerOrBanner: boolean (true ÚNICAMENTE si tiene texto publicitario o comercial sobreimpreso con datos, false si es foto limpia ambiental).
- classification: "INMUEBLE" | "REQUERIMIENTO" | "CONSULTA_GENERAL".
- transactionType: "venta" | "arriendo" | "venta_permuta" | "arriendo_temporal".
- propertyType: string (ej. "lote", "bodega", "apartamento", "casa", "oficina", "local", "finca", "edificio", "apartaestudio").
- title: string (título conciso del inmueble o solicitud, ej. "Busco Lotes para Constructores", "Apartamento en Venta en Cedritos").
- price: number en COP sin puntos ni comas (ej. 800000000). Si es arriendo puro o no hay precio, poner null.
- rentPrice: number en COP si es arriendo.
- presupuestoMax: number en COP si es REQUERIMIENTO (presupuesto máximo de compra o canon máximo si lo indica).
- area: number en metros cuadrados m² (ej. 600, 450). Si es rango (ej. 600 - 1600), poner el mínimo o promedio.
- bedrooms: number (número de habitaciones o alcobas si aplica).
- bathrooms: number (número de baños si aplica).
- garages: number (número de parqueaderos/garajes si aplica).
- city: string (ciudad, ej. "Bogotá", "Medellín", "Chía", "Cali", "Nacional", etc.).
- zone: string (barrio, sector o subzonas mencionadas, ej. "Pablo VI, Cedritos", "Suba", "Chicó", etc.).
- contactPhone: string (teléfono celular de 10 dígitos legible en el flyer, ej. "3112911829" o "573112911829").
- contactName: string (nombre del asesor o inmobiliaria anunciante, ej. "Juan Pablo Tobo", "Inmo Propiedades").
- flyerVerbatimText: string (transcripción textual completa y fiel de TODO el texto legible en el flyer).

Devuelve EXCLUSIVAMENTE un JSON válido con esta estructura.`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: "image/jpeg", data: imageBufferBase64 } }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: "application/json"
    }
  };

  for (const model of models) {
    for (let i = 0; i < candidateKeys.length; i++) {
      const apiKey = candidateKeys[i];
      assertKeyAllowedForExecution(apiKey); // Blindaje inmutable: nunca ejecutar clave de pago en tests
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      try {
        console.log(`[JanIA-Vision] 👁️ Analizando flyer con ${model} (Key #${i + 1})...`);
        const response = await axios.post(apiUrl, payload, { timeout: 6000 });
        const textCandidate = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textCandidate && typeof textCandidate === "string") {
          const parsed = JSON.parse(textCandidate) as FlyerVisionResult;
          const hasCommercialText = !!(parsed.flyerVerbatimText && parsed.flyerVerbatimText.trim().length >= 15);
          const isGenuineFlyer = !!(parsed.isFlyerOrBanner && hasCommercialText && (parsed.classification === "INMUEBLE" || parsed.classification === "REQUERIMIENTO"));

          if (parsed && isGenuineFlyer) {
            // Asignar el emoji doctrinal (Matriz v23.0)
            const tx = (parsed.transactionType || "").toLowerCase();
            const isPermuta = tx.includes("permuta") || tx === "venta_permuta";
            const isRent = tx.includes("arriendo") || tx === "arriendo_temporal";
            if (parsed.classification === "INMUEBLE") {
              parsed.reactionEmoji = isPermuta ? "🔀" : (isRent ? "👌" : "👍");
            } else if (parsed.classification === "REQUERIMIENTO") {
              parsed.reactionEmoji = isPermuta ? "🔄" : (isRent ? "✏️" : "📝");
            }
            console.log(`[JanIA-Vision] ✅ Flyer clasificado exitosamente como ${parsed.classification} (${parsed.reactionEmoji}) con ${model}: "${parsed.title || ''}"`);
            return parsed;
          } else {
            console.log(`[JanIA-Vision] ℹ️ Imagen descartada: Es foto ambiental o sin texto comercial sobreimpreso (${parsed?.classification || 'CONSULTA_GENERAL'}, isFlyer: ${parsed?.isFlyerOrBanner}, texto: ${parsed?.flyerVerbatimText?.length || 0} chars).`);
            if (parsed) {
              parsed.isFlyerOrBanner = false;
              parsed.classification = "CONSULTA_GENERAL";
              parsed.reactionEmoji = undefined;
            }
            return parsed;
          }
        }
      } catch (err: any) {
        const status = err.response?.status;
        console.warn(`[JanIA-Vision] ⚠️ Intento con ${model} (Key #${i + 1}) falló (${status || err.message}).`);
        // Si la clave falló por cuota, pago o timeout, pasar a la siguiente clave sin bloquear
        continue;
      }
    }
  }

  console.error("[JanIA-Vision] ❌ No fue posible analizar el flyer con ningún modelo/clave de Gemini.");
  return null;
}
