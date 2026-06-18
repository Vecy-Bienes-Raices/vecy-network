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
 * Invocación a Google Gemini (Google AI Studio) utilizando la infraestructura de frontera 3.1 Flash-Lite
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
  // Migración estratégica al modelo de bajo costo para pruebas masivas
  const MODEL = "gemini-2.5-flash";
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const systemMessage = messages.find(m => m.role === "system");
    const userMessages = messages.filter(m => m.role !== "system");

    const contents = userMessages.map((m, idx) => {
      const parts: any[] = [{ text: m.content }];
      
      // Si es el último mensaje del usuario y tenemos un buffer de imagen o PDF, los adjuntamos
      if (idx === userMessages.length - 1 && m.role !== "assistant") {
        if (imageBuffer) {
          parts.push({
            inline_data: {
              mime_type: "image/jpeg", // Asumimos JPEG por defecto del buffer de WhatsApp
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

    console.log(`[JanIA-LLM] Procesando con infraestructura optimizada: Gemini (${MODEL}) [Search: ${enableSearch}]...`);
    const response = await axios.post(API_URL, payload);

    if (response.data.candidates && response.data.candidates[0]) {
      return {
        choices: [{ message: { content: response.data.candidates[0].content.parts[0].text } }]
      };
    }
    throw new Error("Respuesta de Gemini vacía");
  } catch (error: any) {
    console.error("[Gemini Error]:", error.response?.data?.error?.message || error.message);
    throw error;
  }
}

/**
 * Placeholder para Anthropic Claude (Estructura preparada para fases futuras)
 */
async function invokeClaude(messages: any[], responseFormat?: any) {
  console.log("[JanIA-LLM] Intentando procesar con Claude (Anthropic)...");
  throw new Error("El proveedor Anthropic está preparado en código pero requiere API KEY y activación financiera.");
}
