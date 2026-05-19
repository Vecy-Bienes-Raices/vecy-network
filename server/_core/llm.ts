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
  provider = "google" 
}: { 
  messages: any[], 
  responseFormat?: any,
  provider?: LLMProvider
}) {
  if (provider === "anthropic") {
    return await invokeClaude(messages, responseFormat);
  }
  return await invokeGemini(messages, responseFormat);
}

/**
 * Invocación a Google Gemini (Google AI Studio)
 */
async function invokeGemini(messages: any[], responseFormat?: any) {
  const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || ENV.forgeApiKey;
  const MODEL = "gemini-flash-latest";
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const systemMessage = messages.find(m => m.role === "system");
    const userMessages = messages.filter(m => m.role !== "system");

    const contents = userMessages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const payload = {
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

    console.log(`[JanIA-LLM] Procesando con Gemini (${MODEL})...`);
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
 * Placeholder para Anthropic Claude (Estructura preparada para Fase 2/3)
 */
async function invokeClaude(messages: any[], responseFormat?: any) {
  // Nota para el futuro: Cuando tengamos los recursos, implementar la llamada a Anthropic API aquí.
  // Se requerirá la librería @anthropic-ai/sdk o axios a https://api.anthropic.com/v1/messages
  console.log("[JanIA-LLM] Intentando procesar con Claude (Anthropic)...");
  throw new Error("El proveedor Anthropic está preparado en código pero requiere API KEY y activación financiera.");
}
