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

function sanitizeKey(k: string): string {
  if (!k) return "";
  return k.replace(/^["']|["']$/g, "").trim();
}

function getGeminiKeys(): string[] {
  const keysSet = new Set<string>();
  
  // Claves múltiples separadas por coma
  const multiKeys = (process.env.GEMINI_API_KEYS || "").split(",").map(sanitizeKey).filter(Boolean);
  multiKeys.forEach(k => keysSet.add(k));

  // Claves individuales numeradas (GEMINI_API_KEY_1, GEMINI_API_KEY_2, ...)
  for (let i = 1; i <= 10; i++) {
    const k = sanitizeKey(process.env[`GEMINI_API_KEY_${i}`] || "");
    if (k) keysSet.add(k);
  }

  if (process.env.GEMINI_API_KEY) {
    const k = sanitizeKey(process.env.GEMINI_API_KEY);
    if (k) keysSet.add(k);
  }
  if (process.env.GOOGLE_API_KEY) {
    const k = sanitizeKey(process.env.GOOGLE_API_KEY);
    if (k) keysSet.add(k);
  }
  if (process.env.GEMINI_BACKUP_KEY) {
    const k = sanitizeKey(process.env.GEMINI_BACKUP_KEY);
    if (k) keysSet.add(k);
  }
  if (ENV.forgeApiKey) {
    const k = sanitizeKey(ENV.forgeApiKey);
    if (k) keysSet.add(k);
  }

  return Array.from(keysSet);
}

/**
 * FAILOVER SECUENCIAL DOCTRINAL (v31.62):
 * - Usa SIEMPRE la Clave #1 (Primaria) mientras esté disponible y con cuota.
 * - Si la Clave #1 se agota (429) o satura (503), pasa a la Clave #2.
 * - Si la #2 se agota, pasa a la Clave #3, y así sucesivamente.
 * - Cero Round-Robin: no desgasta todas las claves a la vez ni salta innecesariamente.
 */
function getActiveFailoverKey(): { key: string; index: number } {
  const allKeys = getGeminiKeys();
  if (allKeys.length === 0) {
    throw new Error("No hay ninguna GEMINI_API_KEY configurada en el entorno.");
  }

  const now = Date.now();
  // Buscar en orden de prioridad estricta la primera clave que NO esté en cooldown
  for (let i = 0; i < allKeys.length; i++) {
    const key = allKeys[i];
    const cooldownUntil = keyCooldowns.get(key) || 0;
    if (now > cooldownUntil) {
      return { key, index: i + 1 };
    }
  }

  // Si todas las claves están en cooldown, seleccionar la que más pronto se descongele
  let bestKey = allKeys[0];
  let minCooldown = keyCooldowns.get(bestKey) || Infinity;
  let bestIdx = 1;
  for (let i = 0; i < allKeys.length; i++) {
    const k = allKeys[i];
    const cd = keyCooldowns.get(k) || Infinity;
    if (cd < minCooldown) {
      minCooldown = cd;
      bestKey = k;
      bestIdx = i + 1;
    }
  }
  return { key: bestKey, index: bestIdx };
}

function markKeyCooldown(key: string, seconds: number = 60, reason: string = "Rate Limit (429)") {
  keyCooldowns.set(key, Date.now() + seconds * 1000);
  console.warn(`[JanIA-LLM] 🛡️ Clave Gemini (...${key.slice(-6)}) en pausa por ${seconds}s debido a ${reason}. Saltando a siguiente clave.`);
}

// Modelos ordenados por prioridad de fallback (100% compatibles y activos en Google API)
const FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-flash-latest",
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

  for (const currentModel of modelsToTry) {
    // Intentar a través de las claves disponibles en cascada secuencial
    for (let keyAttempt = 0; keyAttempt < Math.max(allKeys.length, 1); keyAttempt++) {
      const { key: activeKey, index: keyNum } = getActiveFailoverKey();
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${activeKey}`;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await paceRequest();
          console.log(`[JanIA-LLM] Ejecutando IA con ${currentModel} (Clave #${keyNum}: ...${activeKey.slice(-6)}, Intento ${attempt})...`);
          
          // Timeout seguro de 25 segundos: permite procesar prompts complejos de 25k tokens sin abortar prematuramente
          const response = await axios.post(apiUrl, payload, { timeout: 25000 });

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
          await new Promise(r => setTimeout(r, 1000));

        } catch (error: any) {
          lastError = error;
          const status = error.response?.status;
          const errorMsg = error.response?.data?.error?.message || error.message;

          // 429: Rate Limit (15 RPM) o Cuota en esta clave -> Pausar esta clave solo por 60s (ventana por minuto) y pasar a la siguiente
          if (status === 429) {
            markKeyCooldown(activeKey, 60, "Rate Limit 15 RPM / Cuota (429)");
            break; // Saltar a la siguiente clave del Failover
          }

          // 503: Servidor saturado en Google -> Pausar esta clave por 45s y pasar a la siguiente
          if (status === 503) {
            markKeyCooldown(activeKey, 45, "Google Server Saturation (503 UNAVAILABLE)");
            break; // Saltar a la siguiente clave del Failover
          }

          // Timeout de Axios (>25s) -> Pausar esta clave por 60s para no retrasar los sockets de WhatsApp
          if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            markKeyCooldown(activeKey, 60, "Timeout > 25s");
            console.warn(`[JanIA-LLM] ⏱️ Timeout de 25s excedido en Clave #${keyNum}. Conmutando a siguiente clave de inmediato.`);
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
