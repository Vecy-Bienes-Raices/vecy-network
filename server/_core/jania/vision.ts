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

export function detectImageMimeType(base64Data: string, explicitMimeType?: string): string {
  if (explicitMimeType && explicitMimeType.toLowerCase().startsWith("image/")) {
    return explicitMimeType.split(";")[0].trim().toLowerCase();
  }
  const clean = (base64Data || "").trim();
  if (clean.startsWith("iVBORw0KGgo")) return "image/png";
  if (clean.startsWith("UklGR")) return "image/webp";
  if (clean.startsWith("R0lGOD")) return "image/gif";
  return "image/jpeg";
}

export function buildFlyerReactionEmoji(
  classification: FlyerVisionResult["classification"],
  transactionType?: string
): string | undefined {
  if (classification !== "INMUEBLE" && classification !== "REQUERIMIENTO") return undefined;
  const tx = (transactionType || "").toLowerCase();
  const isPermuta = tx.includes("permuta");
  const isRent = tx === "arriendo" || tx === "arriendo_temporal";
  if (classification === "INMUEBLE") {
    return isPermuta ? "🔀" : isRent ? "👌" : "👍";
  }
  return isPermuta ? "🔄" : isRent ? "✏️" : "📝";
}

export function isValidFlyerVisionExtraction(parsed?: Partial<FlyerVisionResult> | null): boolean {
  if (!parsed || !parsed.isFlyerOrBanner) return false;
  if (parsed.classification !== "INMUEBLE" && parsed.classification !== "REQUERIMIENTO") return false;
  const verbatimLen = (parsed.flyerVerbatimText || "").trim().length;
  if (verbatimLen >= 10) return true;
  const hasSpecs = Boolean(
    parsed.propertyType &&
      (parsed.price || parsed.rentPrice || parsed.presupuestoMax || parsed.area || parsed.contactPhone || parsed.city || parsed.zone)
  );
  return hasSpecs;
}

/**
 * Extractor visual especializado y ultraligero para Flyers y Afiches Inmobiliarios.
 * Procesa afiches de Oferta o Demanda con Gemini Flash / cascada multi-modelo
 * con reintentos defensivos contra caídas, saturación de red o cuotas.
 */
export async function extractFlyerVision(imageBufferBase64: string, explicitMimeType?: string): Promise<FlyerVisionResult | null> {
  if (!imageBufferBase64 || imageBufferBase64.trim() === '') return null;

  const cleanB64 = imageBufferBase64.replace(/\s+/g, '');
  const isBase64Pattern = /^[A-Za-z0-9+/]+={0,2}$/.test(cleanB64);
  if (!isBase64Pattern || cleanB64.length < 4 || cleanB64.length % 4 !== 0) {
    return {
      isFlyerOrBanner: false,
      classification: "CONSULTA_GENERAL",
      transactionType: "venta",
      flyerVerbatimText: ""
    };
  }

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

  // Modelos estables y de alta disponibilidad ordenados por velocidad y cuota (v34.28)
  const models = [
    "gemini-flash-lite-latest",
    "gemini-flash-latest",
    "gemini-3.8-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-2.5-flash"
  ];

  const prompt = `Eres la IA experta en visión documental y extracción de flyers inmobiliarios de VECY Bienes Raíces en toda Colombia.
Analiza la imagen enviada a un chat o grupo de WhatsApp.
Determina si es:
1. "INMUEBLE" (Oferta de venta, arriendo, venta o arriendo, permuta, arriendo con opción de compra, temporal o aporte de una propiedad CON TEXTO PUBLICITARIO IMPRESO).
2. "REQUERIMIENTO" (Demanda o búsqueda: un asesor o cliente busca/necesita/compra/permuta/arrienda un inmueble para cliente, constructora o marca en expansión CON TEXTO PUBLICITARIO IMPRESO).
3. "CONSULTA_GENERAL" (Fotografía ambiental común sin texto publicitario sobreimpreso —fachadas, salas, comedores, cocinas, baños, piscinas, jardines, planos mudos—, comprobante bancario, foto familiar, meme o ajeno a bienes raíces).

REGLAS CRÍTICAS DE CLASIFICACIÓN:
- REGLA DE ORO DE AFICHES/FLYERS: Si la imagen es una simple FOTO FOTOGRÁFICA AMBIENTAL (la foto de una casa, un edificio, una sala, una chimenea, una persona, una mascota, un meme) SIN texto publicitario tipográfico impreso con especificaciones comerciales (precios, metros, contacto), DEBES clasificarla OBLIGATORIAMENTE como "CONSULTA_GENERAL" con isFlyerOrBanner: false y flyerVerbatimText: "".
- Si el flyer contiene texto tipográfico con términos como "BUSCO", "BUSCAMOS", "SE BUSCA", "SE REQUIERE", "COMPRO", "COMPRAMOS", "MARCAS EN EXPANSIÓN", "CONSTRUCTORES BUSCAN", "CLIENTE COMPRA", "PERMUTAMOS POR", "ARRIENDO PARA" o similares, clasifica OBLIGATORIAMENTE como "REQUERIMIENTO" (isFlyerOrBanner: true).
- Si el flyer contiene texto tipográfico con términos como "VENDO", "VENDEMOS", "SE VENDE", "EN VENTA", "OFREZCO", "ARRIENDO", "SE ARRIENDA", "SE PERMUTA", "PERMUTO", "DISPONIBLE", "OPEN HOUSE", "VENTA O PERMUTA" o describe un inmueble específico ofertado con especificaciones, clasifica como "INMUEBLE" (isFlyerOrBanner: true).

Si es INMUEBLE o REQUERIMIENTO (exclusivamente si tiene texto sobreimpreso):
- isFlyerOrBanner: boolean (true ÚNICAMENTE si tiene texto publicitario o comercial sobreimpreso con datos, false si es foto limpia ambiental).
- classification: "INMUEBLE" | "REQUERIMIENTO" | "CONSULTA_GENERAL".
- transactionType: "venta" | "arriendo" | "venta_o_arriendo" | "arriendo_temporal" | "arriendo_con_opcion_de_compra" | "permuta" | "venta_permuta" | "aporte".
- propertyType: string (uno de los 19 tipos oficiales VECY: "apartaestudio", "apartamento", "apartamento_duplex", "penthouse", "penthouse_duplex", "bodega", "cabaña", "casa", "casa_campestre", "casa_quinta", "edificio", "finca", "hostal", "hotel", "aparta_hotel", "local", "lote", "oficina", "consultorio", "villa").
- title: string (título conciso del inmueble o solicitud, ej. "Busco Lotes para Constructores", "Finca en Venta/Permuta en Barichara").
- price: number en COP sin puntos ni comas (ej. 800000000). Si es arriendo puro o no hay precio, poner null.
- rentPrice: number en COP si es arriendo.
- presupuestoMax: number en COP si es REQUERIMIENTO (presupuesto máximo de compra o canon máximo si lo indica).
- presupuestoMin: number en COP si es REQUERIMIENTO con rango mínimo.
- adminFee: number en COP si el flyer menciona valor de administración.
- stratum: number (1 a 6 si menciona estrato).
- area: number en metros cuadrados m² (ej. 600, 450; si dice hectáreas multiplica por 10000, si dice fanegadas/plazas multiplica por 6400).
- bedrooms: number (número de habitaciones o alcobas si aplica).
- bathrooms: number (número de baños si aplica).
- garages: number (número de parqueaderos/garajes si aplica).
- department: string (departamento en Colombia si aparece o se deduce del municipio, ej. "Santander", "Antioquia", "Cundinamarca").
- city: string (ciudad o municipio en cualquier lugar de Colombia, ej. "Bogotá", "Medellín", "Barichara", "Guatapé", "Chía", "Cali", etc.).
- locality: string (localidad, comuna o corregimiento si aparece).
- zone: string (barrio, vereda, caserío, sector o subzonas mencionadas, ej. "Vereda Fagua", "Corregimiento Santa Elena", "Cedritos", "El Poblado", etc.).
- contactPhone: string (teléfono celular de 10 dígitos legible en el flyer, ej. "3112911829" o "573112911829").
- contactName: string (nombre del asesor o inmobiliaria anunciante, ej. "Juan Pablo Tobo", "Inmo Propiedades").
- flyerVerbatimText: string (transcripción textual completa y fiel de TODO el texto legible en el flyer).

Devuelve EXCLUSIVAMENTE un JSON válido con esta estructura.`;

  const resolvedMimeType = detectImageMimeType(cleanB64, explicitMimeType);
  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: resolvedMimeType, data: cleanB64 } }
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
      if (geminiKeyManager.isKeyInCooldown(apiKey)) continue;
      assertKeyAllowedForExecution(apiKey); // Blindaje inmutable: nunca ejecutar clave de pago en tests
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      try {
        console.log(`[JanIA-Vision] 👁️ Analizando flyer con ${model} (Key #${i + 1})...`);
        const response = await axios.post(apiUrl, payload, { timeout: 15000 });
        geminiKeyManager.recordLlmUsage(geminiKeyManager.isPaidKey(apiKey));
        const textCandidate = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textCandidate && typeof textCandidate === "string") {
          let parsed: FlyerVisionResult;
          try {
            parsed = JSON.parse(textCandidate) as FlyerVisionResult;
          } catch (jsonErr) {
            console.warn(`[JanIA-Vision] Error parseando respuesta JSON de ${model}:`, jsonErr);
            continue;
          }

          const isGenuineFlyer = isValidFlyerVisionExtraction(parsed);

          if (parsed && isGenuineFlyer) {
            // Asignar el emoji doctrinal (Matriz v23.0)
            parsed.reactionEmoji = buildFlyerReactionEmoji(parsed.classification, parsed.transactionType);
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
        if (status === 429 || status === 503) {
          geminiKeyManager.markKeyCooldown(apiKey, 60, `Vision HTTP ${status}`);
        }
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
export async function extractFlyerVisionSafely(imageBufferBase64: string, explicitMimeType?: string): Promise<FlyerVisionResult> {
  try {
    const res = await extractFlyerVision(imageBufferBase64, explicitMimeType);
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

