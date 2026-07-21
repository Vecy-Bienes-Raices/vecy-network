/**
 * Voice transcription helper using internal Speech-to-Text service
 *
 * Frontend implementation guide:
 * 1. Capture audio using MediaRecorder API
 * 2. Upload audio to storage (e.g., S3) to get URL
 * 3. Call transcription with the URL
 * 
 * Example usage:
 * ```tsx
 * // Frontend component
 * const transcribeMutation = trpc.voice.transcribe.useMutation({
 *   onSuccess: (data) => {
 *     console.log(data.text); // Full transcription
 *     console.log(data.language); // Detected language
 *     console.log(data.segments); // Timestamped segments
 *   }
 * });
 * 
 * // After uploading audio to storage
 * transcribeMutation.mutate({
 *   audioUrl: uploadedAudioUrl,
 *   language: 'en', // optional
 *   prompt: 'Transcribe the meeting' // optional
 * });
 * ```
 */
import { ENV } from "./env";
import axios from "axios";
import { spawn } from "child_process";

export type TranscribeOptions = {
  audioUrl: string; // URL to the audio file (e.g., S3 URL)
  language?: string; // Optional: specify language code (e.g., "en", "es", "zh")
  prompt?: string; // Optional: custom prompt for the transcription
};

// Native Whisper API segment format
export type WhisperSegment = {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
};

// Native Whisper API response format
export type WhisperResponse = {
  task: "transcribe";
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
};

export type TranscriptionResponse = WhisperResponse; // Return native Whisper API response directly

export type TranscriptionError = {
  error: string;
  code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "UPLOAD_FAILED" | "SERVICE_ERROR";
  details?: string;
};

/**
 * Transcode a WebM audio buffer to WAV format using ffmpeg.
 */
async function transcodeWebmToWav(inputBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i", "pipe:0",           // Read from stdin
      "-vn",                    // Disable video
      "-c:a", "pcm_s16le",      // Output uncompressed WAV (PCM 16-bit)
      "-ac", "1",               // Mono
      "-ar", "16000",           // 16kHz
      "-f", "wav",              // WAV container
      "pipe:1"                  // Write to stdout
    ]);

    const chunks: Buffer[] = [];
    ffmpeg.stdout.on("data", (chunk) => chunks.push(chunk));
    
    let stderrData = "";
    ffmpeg.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`ffmpeg falló con código ${code}. Stderr: ${stderrData}`));
      }
    });

    ffmpeg.on("error", (err) => {
      reject(err);
    });

    ffmpeg.stdin.write(inputBuffer);
    ffmpeg.stdin.end();
  });
}

/**
 * Transcribe audio to text using the internal Speech-to-Text service
 * 
 * @param options - Audio data and metadata
 * @returns Transcription result or error
 */
async function transcribeAudioWithGemini(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ENV.forgeApiKey;
  if (!apiKey) {
    throw new Error("No GEMINI_API_KEY or GOOGLE_API_KEY found for transcription fallback.");
  }
  const model = "gemini-2.5-flash";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let cleanMime = mimeType.split(';')[0].trim().toLowerCase();
  let bufferToUse = audioBuffer;

  if (cleanMime.includes("webm") || cleanMime.includes("octet-stream")) {
    try {
      console.log(`[STT-Fallback] Detectado audio en formato ${cleanMime}. Transcodificando a WAV usando ffmpeg...`);
      bufferToUse = await transcodeWebmToWav(audioBuffer);
      cleanMime = "audio/wav";
    } catch (e: any) {
      console.error(`[STT-Fallback] Error al transcodificar de WebM/octet-stream a WAV con ffmpeg:`, e.message);
      // Intentamos continuar con el buffer original si no se puede transcodificar
    }
  }

  if (cleanMime === 'audio/x-wav' || cleanMime === 'audio/wave') cleanMime = 'audio/wav';
  if (cleanMime === 'audio/mpeg3' || cleanMime === 'audio/x-mpeg-3') cleanMime = 'audio/mpeg';

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: "Transcribe el siguiente audio a texto en español de manera exacta y fluida. Devuelve únicamente el texto de la transcripción literal del audio, sin agregar introducciones, notas de autor ni comentarios adicionales. Si el audio está completamente vacío o solo contiene ruido ininteligible, devuelve una cadena vacía." },
          {
            inline_data: {
              mime_type: cleanMime,
              data: bufferToUse.toString("base64")
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048
    }
  };

  const response = await axios.post(apiUrl, payload, { timeout: 15000 });
  if (response.data.candidates && response.data.candidates[0]) {
    return response.data.candidates[0].content.parts[0].text.trim();
  }
  throw new Error("Empty candidate response from Gemini API");
}

export async function transcribeAudioBuffer(
  audioBuffer: Buffer,
  mimeType: string,
  prompt?: string
): Promise<string> {
  // Check file size (16MB limit)
  const sizeMB = audioBuffer.length / (1024 * 1024);
  if (sizeMB > 16) {
    throw new Error(`Audio file exceeds maximum size limit (16MB). Current size: ${sizeMB.toFixed(2)}MB`);
  }

  // Fallback to Gemini if Forge API is not configured
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    console.log(`[STT-Fallback] Forge API no configurada. Transcribiendo usando Gemini directamente...`);
    return await transcribeAudioWithGemini(audioBuffer, mimeType);
  }

  // Create FormData for Whisper API
  const formData = new FormData();
  const filename = `audio.${getFileExtension(mimeType)}`;
  const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
  formData.append("file", audioBlob, filename);
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");

  const defaultPrompt = prompt || "Notas de voz sobre bienes raíces, Real Estate, inversiones, corretaje, inmuebles, apartamentos y casas en Bogotá, Colombia. Vocabulario técnico y comercial obligatorio: venpermuto, permuta, corretaje, bróker, avalúo, estrato, arras, linderos, desenglobe, Wasi, Habi, Usaquén, Cedritos, Chicó, Rosales, Cabrera, Retiro, Santa Bárbara, San Patricio, Toberín, Suba, Niza, Alhambra.";
  formData.append("prompt", defaultPrompt);

  const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL("v1/audio/transcriptions", baseUrl).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${ENV.forgeApiKey}`,
      "Accept-Encoding": "identity",
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Transcription service request failed (${response.status}): ${errorText}`);
  }

  const whisperResponse = await response.json() as WhisperResponse;
  if (!whisperResponse.text || typeof whisperResponse.text !== 'string') {
    throw new Error("Invalid transcription response: missing text field");
  }

  return whisperResponse.text;
}

export async function transcribeAudio(
  options: TranscribeOptions
): Promise<TranscriptionResponse | TranscriptionError> {
  try {
    // Step 1: Download audio from URL
    let audioBuffer: Buffer;
    let mimeType: string;
    try {
      const response = await fetch(options.audioUrl);
      if (!response.ok) {
        return {
          error: "Failed to download audio file",
          code: "INVALID_FORMAT",
          details: `HTTP ${response.status}: ${response.statusText}`
        };
      }
      
      audioBuffer = Buffer.from(await response.arrayBuffer());
      mimeType = response.headers.get('content-type') || 'audio/mpeg';
    } catch (error) {
      return {
        error: "Failed to fetch audio file",
        code: "SERVICE_ERROR",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }

    try {
      const text = await transcribeAudioBuffer(audioBuffer, mimeType, options.prompt);
      return {
        task: "transcribe",
        language: "es",
        duration: 0,
        text: text,
        segments: []
      };
    } catch (transcriptionError: any) {
      return {
        error: "Voice transcription failed",
        code: "TRANSCRIPTION_FAILED",
        details: transcriptionError.message || "Unknown error"
      };
    }
  } catch (error) {
    return {
      error: "Voice transcription failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}

/**
 * Helper function to get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/ogg': 'ogg',
    'audio/m4a': 'm4a',
    'audio/mp4': 'm4a',
  };
  
  return mimeToExt[mimeType] || 'audio';
}

/**
 * Helper function to get full language name from ISO code
 */
function getLanguageName(langCode: string): string {
  const langMap: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'pl': 'Polish',
    'tr': 'Turkish',
    'sv': 'Swedish',
    'da': 'Danish',
    'no': 'Norwegian',
    'fi': 'Finnish',
  };
  
  return langMap[langCode] || langCode;
}

/**
 * Example tRPC procedure implementation:
 * 
 * ```ts
 * // In server/routers.ts
 * import { transcribeAudio } from "./_core/voiceTranscription";
 * 
 * export const voiceRouter = router({
 *   transcribe: protectedProcedure
 *     .input(z.object({
 *       audioUrl: z.string(),
 *       language: z.string().optional(),
 *       prompt: z.string().optional(),
 *     }))
 *     .mutation(async ({ input, ctx }) => {
 *       const result = await transcribeAudio(input);
 *       
 *       // Check if it's an error
 *       if ('error' in result) {
 *         throw new TRPCError({
 *           code: 'BAD_REQUEST',
 *           message: result.error,
 *           cause: result,
 *         });
 *       }
 *       
 *       // Optionally save transcription to database
 *       await db.insert(transcriptions).values({
 *         userId: ctx.user.id,
 *         text: result.text,
 *         duration: result.duration,
 *         language: result.language,
 *         audioUrl: input.audioUrl,
 *         createdAt: new Date(),
 *       });
 *       
 *       return result;
 *     }),
 * });
 * ```
 */
