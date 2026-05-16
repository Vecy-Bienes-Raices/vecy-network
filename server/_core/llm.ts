import axios from "axios";

const API_KEY = process.env.GEMINI_API_KEY || "TU_API_KEY_AQUÍ";
// Usamos el endpoint de Google AI que soporta API Key directamente con alta cuota (Billing activo)
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;

export async function invokeLLM({ messages, responseFormat }: { messages: any[], responseFormat?: any }) {
  try {
    // Convertimos el formato de mensajes al formato que espera Google Gemini
    const contents = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const payload = {
      contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
        responseMimeType: responseFormat?.type === "json_object" ? "application/json" : "text/plain",
      }
    };

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
    console.error("[Gemini-PRO Error]:", error.response?.data || error.message);
    throw error;
  }
}
