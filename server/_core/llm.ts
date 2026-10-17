import axios from "axios";
import { ENV } from "./env";
import { 
  geminiKeyManager, 
  assertKeyAllowedForExecution, 
  markKeyCooldown, 
  getActiveKey, 
  getFreeKeys, 
  getPaidKey, 
  getAllAvailableKeys,
  isTestEnvironment
} from "./geminiKeyManager";

export type LLMProvider = "google" | "anthropic";

/**
 * Gestor Inteligente de Claves y Modelos de Google Gemini (v33.00)
 * - Nivel 1: Pool Round-Robin Activo de 4 Claves Gratuitas ($0 COP)
 * - Nivel 2: Respaldo de Emergencia de Pago 24/7 (GEMINI_PAID_KEY) solo ante 429 simultáneo en las 4 gratuitas
 * - Retorno Automático: Retorna a Nivel 1 tan pronto expira el cooldown de 60s
 * - Blindaje en Tests: Bloqueo inmutable de GEMINI_PAID_KEY en entorno de pruebas
 * - Cascada de Modelos (gemini-3.5-flash-lite -> gemini-flash-lite-latest -> gemini-3.5-flash -> gemini-flash-latest)
 * - Control de Concurrencia y Cola de Pacing para evitar saturar el RPM
 */

// Aliases para retrocompatibilidad
export const getGeminiKeys = getAllAvailableKeys;
export const getActiveRoundRobinKey = getActiveKey;
export const getActiveFailoverKey = getActiveKey;

// Modelos ordenados por prioridad de fallback (gemini-2.5-flash como principal en llaves gratuitas - v33.16)
const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
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
  const inTest = isTestEnvironment();
  const targetModels = inTest ? modelsToTry.slice(0, 1) : modelsToTry;
  const totalAttempts = inTest ? 1 : Math.max(allKeys.length, 5);

  for (const currentModel of targetModels) {
    let modelUnavailable = false;
    // Intentar a través de las claves del Pool (Nivel 1 Gratis -> Nivel 2 Pago de Emergencia)
    for (let keyAttempt = 0; keyAttempt < totalAttempts; keyAttempt++) {
      if (modelUnavailable) break;
      const activeKeyInfo = geminiKeyManager.getActiveKey();
      const activeKey = activeKeyInfo.key;
      const keyNum = activeKeyInfo.index;
      const tierTag = activeKeyInfo.isPaid ? "Nivel 2 Pago 🚨" : `Nivel 1 Gratis #${keyNum}`;

      // Blindaje de seguridad en pruebas: Si intenta usar la clave de pago en test, abortar localmente
      assertKeyAllowedForExecution(activeKey);

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${activeKey}`;

      for (let attempt = 1; attempt <= 1; attempt++) {
        try {
          if (!inTest) await paceRequest();
          console.log(`[JanIA-LLM] Ejecutando IA con ${currentModel} (${tierTag}: ...${activeKey.slice(-6)})...`);
          
          // Timeout seguro de 12 segundos: si Google tarda, no bloquea el servidor ni causa 504 a la web
          const response = await axios.post(apiUrl, payload, { timeout: inTest ? 600 : 12000 });

          if (response.data.candidates && response.data.candidates[0]) {
            const parts: any[] = response.data.candidates[0].content?.parts || [];
            const fnCallPart = parts.find((p: any) => p && p.functionCall);
            const firstPart = parts[0];
            if (fnCallPart && fnCallPart.functionCall) {
              const rawFn = fnCallPart.functionCall;
              let normalizedArgs = rawFn.args ?? rawFn.arguments ?? {};
              if (typeof normalizedArgs === "string") {
                try {
                  normalizedArgs = JSON.parse(normalizedArgs);
                } catch (_) {
                  normalizedArgs = {};
                }
              }
              const normalizedFnCall = {
                ...rawFn,
                args: normalizedArgs,
                arguments: normalizedArgs
              };
              return {
                choices: [{
                  message: {
                    content: JSON.stringify({ functionCall: normalizedFnCall }),
                    functionCall: normalizedFnCall
                  }
                }]
              };
            }
            if (firstPart) {
              const text = firstPart.text;
              if (text && text.trim() !== '') {
                return { choices: [{ message: { content: text } }] };
              }
            }
          }

          console.warn(`[JanIA-LLM] Respuesta vacía de ${currentModel}. Reintentando...`);
          await new Promise(r => setTimeout(r, 1000));

        } catch (error: any) {
          lastError = error;
          const status = error.response?.status;
          const errorMsg = error.response?.data?.error?.message || error.message;

          // Si el modelo fue retirado o no está disponible (404 / "no longer available"), pasar de inmediato al siguiente modelo sin gastar las demás claves
          if (status === 404 || /no longer available|not found for API version|is not found/i.test(String(errorMsg || ""))) {
            console.warn(`[JanIA-LLM] Modelo ${currentModel} no disponible (${errorMsg}). Conmutando inmediatamente al siguiente modelo.`);
            modelUnavailable = true;
            break;
          }

          // 429: Rate Limit (15 RPM) o Cuota saturada en este modelo/clave
          if (status === 429) {
            geminiKeyManager.markKeyCooldown(activeKey, 60, "Rate Limit / Saturación de Modelo (429)");
            break; // Saltar a la siguiente clave del Failover
          }

          // 503: Servidor saturado en Google -> Pausar esta clave por 45s y pasar a la siguiente
          if (status === 503) {
            geminiKeyManager.markKeyCooldown(activeKey, 45, "Google Server Saturation (503 UNAVAILABLE)");
            break; // Saltar a la siguiente clave del Failover
          }

          // Timeout de Axios (>25s) -> Pausar esta clave por 60s para no retrasar los sockets de WhatsApp
          if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            geminiKeyManager.markKeyCooldown(activeKey, 60, "Timeout > 25s");
            console.warn(`[JanIA-LLM] ⏱️ Timeout de 25s excedido en Clave (${tierTag}). Conmutando a siguiente clave de inmediato.`);
            break;
          }

          if (status === 500 || status === 502) {
            console.warn(`[JanIA-LLM] Error ${status} de Google. Reintentando en 1s...`);
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }

          console.error(`[JanIA-LLM] Error en ${currentModel} (Clave #${keyNum}):`, errorMsg);
          break; // Error no recuperable con esta clave, saltar a la siguiente
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
