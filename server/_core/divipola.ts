import fs from 'fs';
import path from 'path';

let municipalitiesMap: Map<string, string> = new Map();

export const initDivipola = () => {
  try {
    const filePath = path.join(process.cwd(), 'server', 'data', 'divipola.csv');
    if (!fs.existsSync(filePath)) {
      console.warn("Divipola CSV not found at", filePath);
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    municipalitiesMap.clear();

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line properly considering quotes
      const parts = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
      if (!parts || parts.length < 4) continue;
      
      // The format is: "Code Dept","Name Dept","Code Mun","Name Mun"
      let munName = parts[3].replace(/^,?"?|"?$/g, '').trim();
      
      if (munName) {
        // Normalize name: lowercase, remove accents for the key
        const normalizedKey = munName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        
        // Let's store the title cased version for canonical output
        let titleCased = munName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        
        municipalitiesMap.set(normalizedKey, titleCased);
      }
    }
    
    // Custom aliases for Bogotá
    municipalitiesMap.set("bogota", "Bogotá, D.C.");
    municipalitiesMap.set("bogota d.c.", "Bogotá, D.C.");
    municipalitiesMap.set("bogota, d.c.", "Bogotá, D.C.");
    municipalitiesMap.set("bogota dc", "Bogotá, D.C.");
    municipalitiesMap.set("bogota d.c", "Bogotá, D.C.");

    console.log(`[Divipola] Loaded ${municipalitiesMap.size} municipalities from Divipola.`);
  } catch (err) {
    console.error("[Divipola] Error loading Divipola:", err);
  }
};

export const validateCity = (cityName: string | null | undefined): string | null => {
  if (!cityName || typeof cityName !== 'string') return null;
  if (municipalitiesMap.size === 0) {
    initDivipola();
  }
  
  const normalized = cityName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  
  return municipalitiesMap.get(normalized) || null;
};
