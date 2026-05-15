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
export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  const validMessages = params.messages.filter(m => m.content && m.content.trim().length > 0);
  if (validMessages.filter(m => m.role !== "system").length === 0) {
    return { choices: [{ message: { role: "assistant", content: "" } }] };
  }

  const genAI = new GoogleGenerativeAI(ENV.forgeApiKey);
  
  // Nombres de modelos verificados en tu consola
  const MAIN_MODEL = "gemini-flash-latest";
  const FALLBACK_MODEL = "gemini-pro-latest";

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

  try {
    console.log(`[LLM] Usando ${MAIN_MODEL}...`);
    const model = genAI.getGenerativeModel({ model: MAIN_MODEL });
    const result = await model.generateContent({
      contents,
      systemInstruction: systemMessage ? { role: 'system', parts: [{ text: systemMessage.content }] } : undefined,
      generationConfig: config,
    });
    return { choices: [{ message: { role: "assistant", content: (await result.response).text() } }] };
  } catch (error: any) {
    console.warn(`[LLM Warn] Falló ${MAIN_MODEL}: ${error.message}`);
    
    try {
        console.log(`[LLM] Reintentando con ${FALLBACK_MODEL}...`);
        const model = genAI.getGenerativeModel({ model: FALLBACK_MODEL });
        // Fallback robusto combinando todo en un prompt si falla la estructura de chat
        const prompt = validMessages.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join("\n\n");
        const result = await model.generateContent(prompt);
        return { choices: [{ message: { role: "assistant", content: (await result.response).text() } }] };
    } catch (e: any) {
        console.error(`[LLM Critical Error] Ambos modelos fallaron: ${e.message}`);
        throw e;
    }
  }
}
