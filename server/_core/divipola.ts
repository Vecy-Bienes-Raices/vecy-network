import fs from 'fs';
import path from 'path';

let municipalitiesMap: Map<string, string> = new Map();

export const initDivipola = () => {
  try {
    const jsonPath = path.join(process.cwd(), 'server', 'data', 'divipola.json');
    
    municipalitiesMap.clear();

    if (!fs.existsSync(jsonPath)) {
      console.warn("Divipola JSON data file not found at", jsonPath);
      return;
    }

    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const list: Array<{ codigoDpto: string; departamento: string; codigoMpio: string; municipio: string }> = JSON.parse(raw);
    for (const item of list) {
      if (item.municipio) {
        const normalizedKey = item.municipio.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        let titleCased = item.municipio.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
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
