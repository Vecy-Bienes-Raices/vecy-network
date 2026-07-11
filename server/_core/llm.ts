import axios from "axios";
import { ENV } from "./env";

export type LLMProvider = "google" | "anthropic";

/**
 * Invocación genérica a modelos de IA.
 * Actualmente soporta Google Gemini y está preparado para Anthropic Claude.
 */
export async function invokeLLM({ 
  messages, 
  responseFormat, 
  provider = "google",
  imageBuffer,
  pdfBuffer,
  pdfMimeType,
  enableSearch = false
}: { 
  messages: any[], 
  responseFormat?: any,
  provider?: LLMProvider,
  imageBuffer?: string,
  pdfBuffer?: string,
  pdfMimeType?: string,
  enableSearch?: boolean
}): Promise<{ choices: { message: { content: string } }[] }> {
  if (provider === "anthropic") {
    return await invokeClaude(messages, responseFormat) as any;
  }
  return await invokeGemini(messages, responseFormat, imageBuffer, pdfBuffer, pdfMimeType, enableSearch);
}

/**
 * Invocación a Google Gemini con retry automático (hasta 3 intentos, backoff exponencial)
 */
async function invokeGemini(
  messages: any[], 
  responseFormat?: any, 
  imageBuffer?: string, 
  pdfBuffer?: string, 
  pdfMimeType?: string, 
  enableSearch?: boolean
) {
  const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ENV.forgeApiKey;
  const MODEL = "gemini-3.1-flash-lite";
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const systemMessage = messages.find(m => m.role === "system");
      const userMessages = messages.filter(m => m.role !== "system");

      const contents = userMessages.map((m, idx) => {
        const parts: any[] = [{ text: m.content }];
        
        if (idx === userMessages.length - 1 && m.role !== "assistant") {
          if (imageBuffer) {
            parts.push({
              inline_data: {
                mime_type: "image/jpeg",
                data: imageBuffer
              }
            });
          }
          if (pdfBuffer) {
            parts.push({
              inline_data: {
                mime_type: pdfMimeType || "application/pdf",
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

      const payload: any = {
        contents,
        systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 4096,
          responseMimeType: responseFormat?.type === "json_object" ? "application/json" : "text/plain",
        }
      };

      if (enableSearch) {
        payload.tools = [{ googleSearch: {} }];
      }

      console.log(`[JanIA-LLM] Intento ${attempt}/${MAX_RETRIES} — Gemini (${MODEL}) [Search: ${enableSearch}]...`);
      const response = await axios.post(API_URL, payload);

      if (response.data.candidates && response.data.candidates[0]) {
        const text = response.data.candidates[0].content?.parts?.[0]?.text;
        if (text && text.trim() !== '') {
          return { choices: [{ message: { content: text } }] };
        }
      }

      // Respuesta vacía — reintentar si quedan intentos
      if (attempt < MAX_RETRIES) {
        const waitMs = attempt * 1500;
        console.warn(`[JanIA-LLM] Respuesta vacía de Gemini (intento ${attempt}). Reintentando en ${waitMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }

      throw new Error("Respuesta de Gemini vacía tras todos los reintentos");

    } catch (error: any) {
      const status = error.response?.status;
      const isRetryable = status === 429 || status === 503 || status === 500;

      if (isRetryable && attempt < MAX_RETRIES) {
        const waitMs = attempt * 2000;
        console.warn(`[JanIA-LLM] Error ${status} de Gemini (intento ${attempt}). Reintentando en ${waitMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }

      console.error("[Gemini Error]:", error.response?.data?.error?.message || error.message);
      throw error;
    }
  }

  // Nunca se alcanza, pero TypeScript lo requiere
  throw new Error("Respuesta de Gemini vacía tras todos los reintentos");
}


/**
 * Placeholder para Anthropic Claude (Estructura preparada para fases futuras)
 */
async function invokeClaude(messages: any[], responseFormat?: any) {
  console.log("[JanIA-LLM] Intentando procesar con Claude (Anthropic)...");
  throw new Error("El proveedor Anthropic está preparado en código pero requiere API KEY y activación financiera.");
}
