import axios from 'axios';
import { ENV } from './env';

const PROJECT_ID = "jania-evaluadora-pro";
const LOCATION = "us-central1";

export type Role = "system" | "user" | "assistant";

export type Message = {
  role: Role;
  content: string;
};

export type InvokeParams = {
  messages: Message[];
  responseFormat?: {
    type: "json_object";
  };
};

export type InvokeResult = {
  choices: {
    message: Message;
  }[];
};

/**
 * Invocación Directa a Vertex AI (Infraestructura Pro) vía REST
 * Esto usa la API Key pero conecta con la potencia de Google Cloud Vertex
 */
export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const validMessages = params.messages.filter(m => m.content && m.content.trim() !== "");
  
  // Gemini 2.0 Flash en Vertex (Escalable y Económico)
  const MODEL = "gemini-2.0-flash-001";
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent?key=${ENV.forgeApiKey}`;

  const systemMessage = validMessages.find(m => m.role === "system");
  const userMessages = validMessages.filter(m => m.role !== "system");

  const contents = userMessages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const payload = {
    contents,
    systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 800,
      responseMimeType: params.responseFormat?.type === "json_object" ? "application/json" : "text/plain",
    }
  };

  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Vertex-PRO] Usando ${MODEL} (intento ${attempt}/${MAX_RETRIES})...`);
      
      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return { 
        choices: [{ 
          message: { 
            role: "assistant", 
            content: content.trim() 
          } 
        }] 
      };

    } catch (error: any) {
      const errorMsg = error.response?.data?.[0]?.error?.message || error.response?.data?.error?.message || error.message;
      
      // Si el error es de cuota (429), esperamos un poco
      if (error.response?.status === 429 && attempt < MAX_RETRIES) {
        console.warn(`[Vertex-PRO] Cuota alcanzada. Esperando ${attempt * 5}s...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 5000));
        continue;
      }

      console.error(`[Vertex-PRO Error] Intento ${attempt}:`, errorMsg);
      if (attempt === MAX_RETRIES) throw new Error(errorMsg);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw new Error("No se pudo conectar con Vertex AI PRO");
}
