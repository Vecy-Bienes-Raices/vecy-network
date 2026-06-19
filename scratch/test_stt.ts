import { transcribeAudioBuffer } from "../server/_core/voiceTranscription";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  console.log("Starting WebM to WAV Transcoding and STT test...");
  
  const audioPath = path.resolve(process.cwd(), "scratch/test-out-direct.ogg");
  if (!fs.existsSync(audioPath)) {
    console.error(`Audio file not found at ${audioPath}`);
    return;
  }

  const audioBuffer = fs.readFileSync(audioPath);
  console.log(`Loaded audio file size: ${audioBuffer.length} bytes`);
  
  // We pass "audio/webm" to force the transcodeWebmToWav path in transcribeAudioBuffer
  const mimeType = "audio/webm";

  try {
    const result = await transcribeAudioBuffer(audioBuffer, mimeType);
    console.log("-----------------------------------------");
    console.log("Transcription result:");
    console.log(result);
    console.log("-----------------------------------------");
    console.log("✓ STT Test Successful!");
  } catch (error: any) {
    console.error("❌ Transcription error caught:", error.message || error);
    if (error.response) {
      console.error("API error response details:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

main();
