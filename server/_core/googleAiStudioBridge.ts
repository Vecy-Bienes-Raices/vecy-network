import "dotenv/config";
import axios from "axios";
import { sanitizeDoctrinalText } from "./doctrinalSanitizer";

/**
 * Conector Seguro a Google AI Studio — VECY BIENES RAÍCES (v32.77)
 * 
 * Permite a Antigravity y al equipo de desarrollo interactuar directamente
 * con Google AI Studio usando claves gratuitas oficiales de Google, garantizando
 * filtrado estricto de privacidad antes de consumir o exponer conocimiento.
 */

export interface AiStudioRequestOptions {
  model?: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  sanitizeOutput?: boolean;
}

export interface AiStudioResponse {
  success: boolean;
  content: string;
  modelUsed: string;
  sanitizationSummary?: string;
  error?: string;
}

const DEFAULT_MODEL = "gemini-3.8-flash";

/**
 * Obtiene el pool de claves de Google AI Studio configuradas en el entorno
 */
function getAiStudioKeys(): string[] {
  const primary = process.env.GEMINI_API_KEY?.trim();
  const pool = process.env.GEMINI_API_KEYS?.split(",").map(k => k.trim()).filter(Boolean) || [];
  const keys = [primary, ...pool].filter((k): k is string => !!k && k.length > 10);
  return Array.from(new Set(keys));
}

/**
 * Ejecuta una consulta directa a Google AI Studio con failover inteligente entre claves
 */
export async function queryGoogleAiStudio(
  prompt: string,
  options: AiStudioRequestOptions = {}
): Promise<AiStudioResponse> {
  const keys = getAiStudioKeys();
  if (keys.length === 0) {
    return {
      success: false,
      content: "",
      modelUsed: "",
      error: "No se encontraron claves de API de Google AI Studio (GEMINI_API_KEY) en el entorno."
    };
  }

  const model = options.model || DEFAULT_MODEL;
  const systemInstruction = options.systemInstruction;
  const temperature = options.temperature ?? 0.7;
  const maxOutputTokens = options.maxOutputTokens ?? 8192;
  const sanitizeOutput = options.sanitizeOutput ?? true;

  const payload: any = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature,
      topP: 0.95,
      maxOutputTokens
    }
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  let lastErrorMsg = "";

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    try {
      const response = await axios.post(url, payload, { timeout: 30000 });
      const parts = response.data?.candidates?.[0]?.content?.parts || [];
      const rawText = parts.map((p: any) => p.text || "").filter(Boolean).join("\n");

      if (rawText && typeof rawText === "string") {
        if (sanitizeOutput) {
          const sanitized = sanitizeDoctrinalText(rawText);
          return {
            success: true,
            content: sanitized.sanitizedText,
            modelUsed: model,
            sanitizationSummary: sanitized.summary
          };
        }

        return {
          success: true,
          content: rawText,
          modelUsed: model
        };
      }
    } catch (err: any) {
      lastErrorMsg = err?.response?.data?.error?.message || err.message;
      // Continuar al siguiente intento con la siguiente clave
    }
  }

  return {
    success: false,
    content: "",
    modelUsed: model,
    error: `Error al consultar Google AI Studio tras probar todas las claves: ${lastErrorMsg}`
  };
}

/**
 * Health check para verificar la conectividad con Google AI Studio y listar modelos activos
 */
export async function checkAiStudioHealth(): Promise<{ healthy: boolean; modelsCount: number; sampleModels: string[]; error?: string }> {
  const keys = getAiStudioKeys();
  if (keys.length === 0) {
    return { healthy: false, modelsCount: 0, sampleModels: [], error: "No API keys configured" };
  }

  const key = keys[0];
  try {
    const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, { timeout: 10000 });
    const models = res.data?.models || [];
    const names: string[] = models.map((m: any) => m.name.replace("models/", ""));
    // Filtrar y destacar los modelos insignia de vanguardia
    const flagshipList = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash", "antigravity-preview-latest", "deep-research-max-preview-04-2026"];
    const highlighted = names.filter(n => flagshipList.includes(n));
    const finalSamples = Array.from(new Set([...highlighted, ...names])).slice(0, 10);
    return {
      healthy: true,
      modelsCount: models.length,
      sampleModels: finalSamples
    };
  } catch (err: any) {
    return {
      healthy: false,
      modelsCount: 0,
      sampleModels: [],
      error: err?.message
    };
  }
}

// Ejecución directa por CLI para pruebas y diagnósticos rápidos
if (process.argv[1]?.endsWith("googleAiStudioBridge.ts") || process.argv[1]?.endsWith("googleAiStudioBridge.js")) {
  (async () => {
    console.log("--- CHEQUEO DE SALUD GOOGLE AI STUDIO ---");
    const health = await checkAiStudioHealth();
    console.log("Estado de conexión:", health.healthy ? "✅ CONECTADO EXITOSAMENTE" : "❌ FALLIDO");
    console.log("Modelos disponibles:", health.modelsCount);
    console.log("Modelos Insignia destacados:", health.sampleModels);

    if (health.healthy) {
      const customPrompt = process.argv.slice(2).join(" ").trim();
      const promptToUse = customPrompt || "Explica en dos líneas la regla de oro del requerimiento inmobiliario en Colombia.";
      console.log(`\n--- CONSULTANDO GOOGLE AI STUDIO (GEMINI 3.8 FLASH) ---`);
      console.log(`Pregunta enviada: "${promptToUse}"\n`);
      const res = await queryGoogleAiStudio(promptToUse, {
        model: "gemini-3.8-flash"
      });
      console.log("Respuesta de Gemini 3.8:");
      console.log(res.content);
      console.log("\nModelo usado:", res.modelUsed);
      console.log("Filtro de Privacidad:", res.sanitizationSummary);
    }
  })().catch(console.error);
}
