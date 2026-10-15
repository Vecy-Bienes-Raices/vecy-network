/**
 * JanIA Vision - VECY BIENES RAÍCES
 * Lógica de análisis de flyers y visión artificial multimodal ultraligera con Gemini.
 * Versión v33.11 (33.11.0) — Robustez multimodal contra caídas y reintentos adaptativos.
 */
import axios from "axios";
import { FlyerVisionResult } from "./types";
import { 
  geminiKeyManager, 
  assertKeyAllowedForExecution 
} from "../geminiKeyManager";

/**
 * Extractor visual especializado y ultraligero para Flyers y Afiches Inmobiliarios.
 * Procesa afiches de Oferta o Demanda con Gemini Flash / cascada multi-modelo
 * con reintentos defensivos contra caídas, saturación de red o cuotas.
 */
export async function extractFlyerVision(imageBufferBase64: string): Promise<FlyerVisionResult | null> {
  if (!imageBufferBase64 || imageBufferBase64.trim() === '') return null;

  const freeKeys = geminiKeyManager.getFreeKeys();
  const paidKey = geminiKeyManager.getPaidKey();
  const candidateKeys = paidKey ? [...freeKeys, paidKey] : freeKeys;

  if (candidateKeys.length === 0) {
    console.warn("[JanIA-Vision] ⚠️ No hay claves de Gemini configuradas para análisis visual.");
    return {
      isFlyerOrBanner: false,
      classification: "CONSULTA_GENERAL",
      transactionType: "venta",
      flyerVerbatimText: ""
    };
  }

  // Modelos estables y de alta disponibilidad ordenados por velocidad y cuota
  const models = [
    "gemini-2.5-flash",
    "gemini-flash-lite-latest",
    "gemini-flash-latest",
    "gemini-2.5-flash-lite",
    "gemini-1.5-flash"
  ];

  const prompt = `Eres la IA experta en visión documental y extracción de flyers inmobiliarios de VECY Bienes Raíces en Colombia.
Analiza la imagen enviada a un chat o grupo de WhatsApp.
Determina si es:
1. "INMUEBLE" (Oferta de venta, arriendo o permuta de una propiedad CON TEXTO PUBLICITARIO IMPRESO).
2. "REQUERIMIENTO" (Demanda o búsqueda: un asesor o cliente busca/necesita/compra un inmueble para un cliente, constructora o marca en expansión CON TEXTO PUBLICITARIO IMPRESO).
3. "CONSULTA_GENERAL" (Fotografía ambiental común sin texto publicitario sobreimpreso —fachadas, salas, comedores, cocinas, baños, piscinas, jardines, planos mudos—, comprobante bancario, foto familiar, meme o ajeno a bienes raíces).

REGLAS CRÍTICAS DE CLASIFICACIÓN:
- REGLA DE ORO DE AFICHES/FLYERS: Si la imagen es una simple FOTO FOTOGRÁFICA AMBIENTAL (la foto de una casa, un edificio, una sala, una chimenea, una persona, una mascota, un meme) SIN texto publicitario tipográfico impreso con especificaciones comerciales (precios, metros, contacto), DEBES clasificarla OBLIGATORIAMENTE como "CONSULTA_GENERAL" con isFlyerOrBanner: false y flyerVerbatimText: "".
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
        const response = await axios.post(apiUrl, payload, { timeout: 8000 });
        const textCandidate = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textCandidate && typeof textCandidate === "string") {
          let parsed: FlyerVisionResult;
          try {
            parsed = JSON.parse(textCandidate) as FlyerVisionResult;
          } catch (jsonErr) {
            console.warn(`[JanIA-Vision] Error parseando respuesta JSON de ${model}:`, jsonErr);
            continue;
          }

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
            console.log(`[JanIA-Vision] ℹ️ Imagen descartada como flyer: Es foto ambiental, meme o sin texto comercial sobreimpreso (${parsed?.classification || 'CONSULTA_GENERAL'}, isFlyer: ${parsed?.isFlyerOrBanner}, texto: ${parsed?.flyerVerbatimText?.length || 0} chars).`);
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
        console.warn(`[JanIA-Vision] ⚠️ Intento con ${model} (Key #${i + 1}) falló (${status || err.message}). Pasando a fallback.`);
        // Si la clave falló por cuota, timeout o red, continuar al siguiente intento sin romper el servidor
        continue;
      }
    }
  }

  console.warn("[JanIA-Vision] ℹ️ Cascada visual agotada o en modo fallback defensivo.");
  return {
    isFlyerOrBanner: false,
    classification: "CONSULTA_GENERAL",
    transactionType: "venta",
    flyerVerbatimText: ""
  };
}

/**
 * Envoltorio defensivo universal que garantiza que NUNCA lance una excepción ni retorne null
 */
export async function extractFlyerVisionSafely(imageBufferBase64: string): Promise<FlyerVisionResult> {
  try {
    const res = await extractFlyerVision(imageBufferBase64);
    if (res) return res;
  } catch (err: any) {
    console.error("[JanIA-Vision-Safe] Excepción capturada en visión segura:", err?.message || err);
  }
  return {
    isFlyerOrBanner: false,
    classification: "CONSULTA_GENERAL",
    transactionType: "venta",
    flyerVerbatimText: ""
  };
}

