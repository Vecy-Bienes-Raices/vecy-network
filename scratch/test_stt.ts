import { transcribeAudioBuffer } from "../server/_core/voiceTranscription";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Starting STT test...");
  // Create a dummy audio buffer (1000 bytes of zeros) or load a real file if exists
  const dummyBuffer = Buffer.alloc(1000);
  const mimeType = "audio/webm";

  try {
    const result = await transcribeAudioBuffer(dummyBuffer, mimeType);
    console.log("Transcription result:", result);
  } catch (error: any) {
    console.error("Transcription error caught:", error.message || error);
    if (error.response) {
      console.error("API error response details:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

main();
