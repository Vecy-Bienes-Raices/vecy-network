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
 * Invoke Google Gemini API (Simplified & Stable)
 */
export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  try {
    const genAI = new GoogleGenerativeAI(ENV.forgeApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemMessage = params.messages.find(m => m.role === "system");
    const userMessages = params.messages.filter(m => m.role !== "system");

    const contents = userMessages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const result = await model.generateContent({
      contents: contents,
      systemInstruction: systemMessage ? systemMessage.content : undefined,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: params.responseFormat?.type === "json_object" ? "application/json" : "text/plain",
      },
    });

    const response = await result.response;
    const text = response.text();

    return {
      choices: [{
        message: {
          role: "assistant",
          content: text || "Lo siento, no pude procesar el mensaje.",
        },
      }],
    };
  } catch (error: any) {
    console.error(`[LLM ERROR] ${error.message}`);
    throw error;
  }
}
