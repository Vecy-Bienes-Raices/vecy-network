import axios from "axios";
import { ENV } from "./env";

export type LLMProvider = "google" | "anthropic";

/**
 * Gestor Inteligente de Claves y Modelos de Google Gemini (v22.7)
 * - Pool de Claves con rotación automática ante errores 429 / Rate Limit
 * - Cascada de Modelos (gemini-2.5-flash -> gemini-2.0-flash -> gemini-1.5-flash)
 * - Control de Concurrencia y Cola de Pacing para evitar saturar el RPM
 */

const keyCooldowns = new Map<string, number>();

function getGeminiKeys(): string[] {
  const keysSet = new Set<string>();
  
  // Claves múltiples separadas por coma
  const multiKeys = (process.env.GEMINI_API_KEYS || "").split(",").map(k => k.trim()).filter(Boolean);
  multiKeys.forEach(k => keysSet.add(k));

  if (process.env.GEMINI_API_KEY) keysSet.add(process.env.GEMINI_API_KEY.trim());
  if (process.env.GOOGLE_API_KEY) keysSet.add(process.env.GOOGLE_API_KEY.trim());
  if (process.env.GEMINI_BACKUP_KEY) keysSet.add(process.env.GEMINI_BACKUP_KEY.trim());
  if (ENV.forgeApiKey) keysSet.add(ENV.forgeApiKey.trim());

  return Array.from(keysSet);
}

function getNextAvailableKey(): string {
  const allKeys = getGeminiKeys();
  if (allKeys.length === 0) {
    throw new Error("No hay ninguna GEMINI_API_KEY configurada en el entorno.");
  }

  const now = Date.now();
  // Buscar una clave que no esté en cooldown
  for (const key of allKeys) {
    const cooldownUntil = keyCooldowns.get(key) || 0;
    if (now > cooldownUntil) {
      return key;
    }
  }

  // Si todas están en cooldown, usar la que tenga el cooldown más cercano a expirar
  return allKeys[0];
}

function markKeyCooldown(key: string, seconds: number = 30) {
  keyCooldowns.set(key, Date.now() + seconds * 1000);
  console.warn(`[JanIA-LLM] Clave Gemini puesta en pausa por ${seconds}s debido a Rate Limit (429).`);
}

// Modelos ordenados por prioridad de fallback (validados y activos en Google API)
const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-flash-lite-latest"
];

// Semáforo de concurrencia y pacing para no disparar llamadas simultáneas
let lastCallTimestamp = 0;
const MIN_CALL_INTERVAL_MS = 600; // Mínimo 600ms entre llamadas a Google

async function paceRequest() {
  const now = Date.now();
  const elapsed = now - lastCallTimestamp;
  if (elapsed < MIN_CALL_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, MIN_CALL_INTERVAL_MS - elapsed));
  }
  lastCallTimestamp = Date.now();
}

/**
 * Invocación genérica a modelos de IA.
 */
export async function invokeLLM({ 
  messages, 
  responseFormat, 
  provider = "google",
  model,
  imageBuffer,
  pdfBuffer,
  pdfMimeType,
  enableSearch = false,
  tools,
  temperature
}: { 
  messages: any[], 
  responseFormat?: any, 
  provider?: LLMProvider,
  model?: string,
  imageBuffer?: string, 
  pdfBuffer?: string, 
  pdfMimeType?: string, 
  enableSearch?: boolean,
  tools?: any[],
  temperature?: number
}): Promise<{ choices: { message: { content: string; functionCall?: any } }[] }> {
  if (provider === "anthropic") {
    return await invokeClaude(messages, responseFormat) as any;
  }
  return await invokeGemini(messages, responseFormat, model, imageBuffer, pdfBuffer, pdfMimeType, enableSearch, tools);
}

/**
 * Invocación a Google Gemini con cascada de modelos, rotación de claves y retry inteligente
 */
async function invokeGemini(
  messages: any[], 
  responseFormat?: any, 
  customModel?: string,
  imageBuffer?: string, 
  pdfBuffer?: string, 
  pdfMimeType?: string, 
  enableSearch?: boolean,
  tools?: any[]
) {
  const modelsToTry = customModel ? [customModel, ...FALLBACK_MODELS.filter(m => m !== customModel)] : FALLBACK_MODELS;
  const allKeys = getGeminiKeys();

  const systemMessage = messages.find(m => m.role === "system");
  const userMessages = messages.filter(m => m.role !== "system");

  const contents = userMessages.map((m, idx) => {
    const parts: any[] = [{ text: m.content }];
    
    if (idx === userMessages.length - 1 && m.role !== "assistant") {
      if (imageBuffer) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBuffer
          }
        });
      }
      if (pdfBuffer) {
        parts.push({
          inlineData: {
            mimeType: pdfMimeType || "application/pdf",
            data: pdfBuffer
          }
        });
      }
    }

    return {
      role: m.role === "assistant" ? "model" : "user",
      parts
    };
  });

  const canUseSearch = !!enableSearch && !imageBuffer && !pdfBuffer;

  const payload: any = {
    contents,
    systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
    generationConfig: {
      temperature: (responseFormat?.type === "json_object" && !canUseSearch) ? 0.2 : 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 4096,
      responseMimeType: (responseFormat?.type === "json_object" && !canUseSearch) ? "application/json" : "text/plain",
      responseSchema: (responseFormat?.type === "json_object" && !canUseSearch) ? responseFormat?.schema : undefined,
    }
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  } else if (canUseSearch) {
    payload.tools = [{ googleSearch: {} }];
  }

  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    for (let keyAttempt = 0; keyAttempt < Math.max(allKeys.length, 1); keyAttempt++) {
      const activeKey = getNextAvailableKey();
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${activeKey}`;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await paceRequest();
          console.log(`[JanIA-LLM] Ejecutando IA con ${currentModel} (Clave: ...${activeKey.slice(-6)}, Intento ${attempt})...`);
          
          const response = await axios.post(apiUrl, payload, { timeout: 45000 });

          if (response.data.candidates && response.data.candidates[0]) {
            const firstPart = response.data.candidates[0].content?.parts?.[0];
            if (firstPart) {
              if (firstPart.functionCall) {
                return {
                  choices: [{
                    message: {
                      content: JSON.stringify({ functionCall: firstPart.functionCall }),
                      functionCall: firstPart.functionCall
                    }
                  }]
                };
              }
              const text = firstPart.text;
              if (text && text.trim() !== '') {
                return { choices: [{ message: { content: text } }] };
              }
            }
          }

          console.warn(`[JanIA-LLM] Respuesta vacía de ${currentModel}. Reintentando...`);
          await new Promise(r => setTimeout(r, 1500));

        } catch (error: any) {
          lastError = error;
          const status = error.response?.status;
          const errorMsg = error.response?.data?.error?.message || error.message;

          if (status === 429) {
            // Extraer segundos sugeridos por Google si vienen en el mensaje
            const retryMatch = errorMsg.match(/retry in ([\d\.]+)s/i);
            const waitSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 20;
            markKeyCooldown(activeKey, waitSec);

            console.warn(`[JanIA-LLM] ⚠️ Rate limit (429) en ${currentModel}. Cambiando de clave o modelo...`);
            break; // Salir del loop de intentos de esta clave y probar siguiente clave/modelo
          }

          if (status === 503 || status === 500) {
            console.warn(`[JanIA-LLM] Error ${status} de servidor Google. Reintentando en 2s...`);
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }

          console.error(`[JanIA-LLM] Error en ${currentModel}:`, errorMsg);
          break; // Error no recuperable con esta clave/modelo, probar siguiente
        }
      }
    }
  }

  console.error("[Gemini Cascade Exhausted]: Todos los modelos y claves de Gemini fallaron:", lastError?.message || lastError);
  throw lastError || new Error("No fue posible obtener respuesta de ningún modelo de Gemini");
}

/**
 * Placeholder para Anthropic Claude
 */
async function invokeClaude(messages: any[], responseFormat?: any) {
  console.log("[JanIA-LLM] Intentando procesar con Claude (Anthropic)...");
  throw new Error("El proveedor Anthropic está preparado en código pero requiere API KEY y activación financiera.");
}
