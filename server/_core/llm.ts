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

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  const validMessages = params.messages.filter(m => m.content && m.content.trim().length > 0);
  if (validMessages.filter(m => m.role !== "system").length === 0) {
    return { choices: [{ message: { role: "assistant", content: "" } }] };
  }

  const genAI = new GoogleGenerativeAI(ENV.forgeApiKey);
  
  const MAIN_MODEL = "gemini-flash-latest";

  // El servidor Node.js no envía Referer automáticamente como un navegador.
  // Esta línea lo agrega manualmente usando localhost:5701 que está en la lista
  // de URLs permitidas de la llave de Google Cloud. Es seguro y necesario.
  const requestOptions = {
    customHeaders: { "Referer": "http://localhost:5701/" }
  };

  const systemMessage = validMessages.find(m => m.role === "system");
  const userMessages = validMessages.filter(m => m.role !== "system");

  const contents = userMessages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const config = {
    temperature: 0.7,
    maxOutputTokens: 2048,
    responseMimeType: params.responseFormat?.type === "json_object" ? "application/json" : "text/plain",
  };

  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[LLM] Usando ${MAIN_MODEL} (intento ${attempt}/${MAX_RETRIES})...`);
      const model = genAI.getGenerativeModel({ model: MAIN_MODEL }, requestOptions);
      const result = await model.generateContent({
        contents,
        systemInstruction: systemMessage ? { role: 'system', parts: [{ text: systemMessage.content }] } : undefined,
        generationConfig: config,
      });
      return { choices: [{ message: { role: "assistant", content: (await result.response).text() } }] };
    } catch (error: any) {
      const is429 = error.message?.includes('429') || error.status === 429;
      
      if (is429 && attempt < MAX_RETRIES) {
        const waitMs = extractRetryDelay(error.message);
        console.warn(`[LLM] Cuota excedida, esperando ${waitMs/1000}s antes de reintentar...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }
      
      console.warn(`[LLM Warn] Falló ${MAIN_MODEL} (intento ${attempt}): ${error.message}`);

      if (attempt === MAX_RETRIES) {
        console.error(`[LLM Critical Error] ${MAX_RETRIES} intentos fallidos. Abortando.`);
        throw error;
      }
    }
  }

  // Este punto nunca debería alcanzarse
  throw new Error("[LLM] Error inesperado en el loop de reintentos.");
}
