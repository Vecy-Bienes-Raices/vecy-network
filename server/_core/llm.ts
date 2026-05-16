import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "./env";

export type Role = "system" | "user" | "assistant";

export type Message = {
  role: Role;
  content: string;
};

export type InvokeParams = {
  messages: Message[];
  responseFormat?: { type: "json_object" };
};

export type InvokeResult = {
  choices: Array<{
    message: {
      role: Role;
      content: string;
    };
  }>;
};

/**
 * Invoke Google Gemini API (Ultra-Stable & Verified)
 */
// Extrae el tiempo de espera sugerido por Google cuando responde 429
function extractRetryDelay(errorMessage: string): number {
  const match = errorMessage.match(/retryDelay['":\s]+["']?(\d+)s/);
  if (match) return parseInt(match[1]) * 1000 + 1000; // +1 segundo extra de margen
  return 15000; // 15 segundos por defecto si no especifica
}

const PROJECT_ID = "jania-evaluadora-pro";
const LOCATION = "us-central1"; // La región más económica y estable

const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const validMessages = params.messages.filter(m => m.content && m.content.trim() !== "");
  
  // Usamos Gemini 2.0 Flash: Potente pero MUY barato ($0.10/M tokens)
  const MAIN_MODEL = "gemini-2.0-flash-001"; 

  const systemMessage = validMessages.find(m => m.role === "system");
  const userMessages = validMessages.filter(m => m.role !== "system");

  const contents = userMessages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const config = {
    temperature: 0.2, // Más bajo = más preciso y menos "alucinaciones"
    maxOutputTokens: 500, // LÍMITE DE SEGURIDAD: Evita respuestas excesivamente largas que cuesten más
    responseMimeType: params.responseFormat?.type === "json_object" ? "application/json" : "text/plain",
  };

  const MAX_RETRIES = 2;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[VertexAI] Usando ${MAIN_MODEL} (intento ${attempt}/${MAX_RETRIES})...`);
      
      const model = vertexAI.getGenerativeModel({ 
        model: MAIN_MODEL,
        generationConfig: config,
        systemInstruction: systemMessage ? { role: 'system', parts: [{ text: systemMessage.content }] } : undefined,
      });

      const result = await model.generateContent({ contents });
      const response = await result.response;
      const content = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

      return { choices: [{ message: { role: "assistant", content } }] };

    } catch (error: any) {
      console.error(`[VertexAI Error] Intento ${attempt}:`, error.message);
      if (attempt === MAX_RETRIES) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
  throw new Error("[LLM] Error inesperado en el loop de reintentos.");
}
