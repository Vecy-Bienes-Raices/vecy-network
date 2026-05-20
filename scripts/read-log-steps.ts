import fs from 'fs';

const logFile = '/home/eduardo/.gemini/antigravity/brain/978a6582-e4a2-48bc-810d-a194c6e1d761/.system_generated/logs/overview.txt';
const lines = fs.readFileSync(logFile, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  try {
    const data = JSON.parse(line);
    console.log(`Step ${data.step_index}: Type: ${data.type}, Source: ${data.source}, Length: ${data.content?.length || 0}`);
  } catch (e) {
    console.log(`Step Line ${i}: Parse error`);
  }
}
process.exit(0);
