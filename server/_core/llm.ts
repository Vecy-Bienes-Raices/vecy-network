import axios from "axios";
import { ENV } from "./env";

/**
 * Invocación a Google Gemini vía REST (Google AI Studio)
 * Usando la nueva llave VECY INMUEBLES NETWORK sin restricciones.
 */
export async function invokeLLM({ messages, responseFormat }: { messages: any[], responseFormat?: any }) {
  const API_KEY = process.env.GEMINI_API_KEY || ENV.forgeApiKey;
  
  // Usamos 'gemini-flash-latest' que en este proyecto apunta a una versión de alto rendimiento
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
        maxOutputTokens: 2048,
        responseMimeType: responseFormat?.type === "json_object" ? "application/json" : "text/plain",
      }
    };

    console.log(`[JanIA-LLM] Procesando con ${MODEL}...`);

    const response = await axios.post(API_URL, payload, {
      headers: { "Content-Type": "application/json" }
    });

    if (response.data.candidates && response.data.candidates[0]) {
      const text = response.data.candidates[0].content.parts[0].text;
      return {
        choices: [
          {
            message: {
              content: text
            }
          }
        ]
      };
    } else {
      throw new Error("Respuesta de IA vacía o inválida");
    }
  } catch (error: any) {
    const errorDetail = error.response?.data?.error?.message || error.message;
    console.error("[Gemini Error]:", errorDetail);
    throw error;
  }
}
