import fs from 'fs';

const logFile = '/home/eduardo/.gemini/antigravity/brain/978a6582-e4a2-48bc-810d-a194c6e1d761/.system_generated/logs/overview.txt';
const lines = fs.readFileSync(logFile, 'utf8').split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const data = JSON.parse(line);
    if (data.step_index === 104 || data.content?.includes("MÓDULO: INTELIGENCIA DE CAMPOS")) {
      fs.writeFileSync('/home/eduardo/PROYECTOS/vecy-network/extracted_request.txt', data.content);
      console.log("Successfully extracted request to extracted_request.txt!");
      process.exit(0);
    }
  } catch (e) {
    // ignore parse errors for partially written lines
  }
}

console.log("Request not found in logs.");
process.exit(1);
