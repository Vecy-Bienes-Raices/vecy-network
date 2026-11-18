import fs from 'fs';
import path from 'path';

export interface DivipolaEntry {
  codigoDpto: string;
  departamento: string;
  codigoMpio: string;
  municipio: string;
  tipo: string;
}

const SPANISH_SMALL_WORDS = new Set(["de", "del", "la", "las", "los", "y", "en", "el"]);

function toSpanishTitleCase(raw: string): string {
  return (raw || "")
    .trim()
    .split(/\s+/)
    .map((w, idx) => {
      const low = w.toLowerCase();
      if (idx > 0 && SPANISH_SMALL_WORDS.has(low)) return low;
      return low.charAt(0).toUpperCase() + low.slice(1);
    })
    .join(" ");
}

function normDivipola(txt: string): string {
  return (txt || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Municipios homónimos con barrios famosos de Bogotá/Medellín/Cali o palabras comunes:
// en texto libre solo se deducen si aparece también su departamento o la palabra "municipio".
const AMBIGUOUS_MUNICIPALITIES = new Set([
  "belen", "castilla", "restrepo", "prado", "santa barbara", "santa rosa",
  "san antonio", "san francisco", "san felipe", "san jose", "san luis",
  "san marcos", "san vicente", "la floresta", "la paz", "la union",
  "la victoria", "la mesa", "santa lucia", "la palma", "el rosal",
  "el banco", "el paso", "el prado", "el castillo", "venecia", "granada",
  "palermo", "florencia", "alcala", "caldas", "bolivar", "santander",
  "cordoba", "sucre", "narino", "morales", "colombia", "california",
  "uribe", "pizarro", "el dorado", "colon", "rosario", "miraflores",
  "guadalupe", "ricaurte", "la vega", "la playa", "la gloria", "la merced",
  "san diego", "san carlos", "san pedro", "san juan", "el peñol", "armenia",
  "bello", "estrella", "retiro", "santuario", "caicedonia", "sevilla", "geneva",
  "espanol", "espinal", "guamo", "andes", "jardin", "jerico", "titiribi"
]);

let municipalitiesMap: Map<string, string> = new Map();
let divipolaDetailsMap: Map<string, DivipolaEntry> = new Map();
let divipolaEntriesSorted: Array<{ key: string; entry: DivipolaEntry }> = [];
let initialized = false;

export const initDivipola = () => {
  try {
    const jsonPath = path.join(process.cwd(), 'server', 'data', 'divipola.json');

    municipalitiesMap.clear();
    divipolaDetailsMap.clear();
    divipolaEntriesSorted = [];

    if (!fs.existsSync(jsonPath)) {
      console.warn("Divipola JSON data file not found at", jsonPath);
      return;
    }

    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const list: Array<{ codigoDpto: string; departamento: string; codigoMpio: string; municipio: string; tipo?: string }> = JSON.parse(raw);
    for (const item of list) {
      if (item.municipio) {
        const normalizedKey = normDivipola(item.municipio);
        const titleCased = toSpanishTitleCase(item.municipio);
        const deptTitle = item.departamento
          ? (item.departamento.toUpperCase().includes("BOGOT") ? "Bogotá, D.C." : toSpanishTitleCase(item.departamento))
          : "";
        municipalitiesMap.set(normalizedKey, titleCased);

        const entry: DivipolaEntry = {
          codigoDpto: item.codigoDpto || "",
          departamento: deptTitle,
          codigoMpio: item.codigoMpio || "",
          municipio: normalizedKey === "bogota d c" || normalizedKey === "bogota, d.c." ? "Bogotá, D.C." : titleCased,
          tipo: item.tipo || "Municipio",
        };
        if (!divipolaDetailsMap.has(normalizedKey)) {
          divipolaDetailsMap.set(normalizedKey, entry);
        }
        if (normalizedKey.length >= 4) {
          divipolaEntriesSorted.push({ key: normalizedKey, entry });
        }
      }
    }

    divipolaEntriesSorted.sort((a, b) => b.key.length - a.key.length);

    // Custom aliases for Bogotá
    municipalitiesMap.set("bogota", "Bogotá, D.C.");
    municipalitiesMap.set("bogota d.c.", "Bogotá, D.C.");
    municipalitiesMap.set("bogota, d.c.", "Bogotá, D.C.");
    municipalitiesMap.set("bogota dc", "Bogotá, D.C.");
    municipalitiesMap.set("bogota d.c", "Bogotá, D.C.");

    const bogotaEntry: DivipolaEntry = {
      codigoDpto: "11",
      departamento: "Bogotá, D.C.",
      codigoMpio: "11001",
      municipio: "Bogotá, D.C.",
      tipo: "Distrito Capital",
    };
    divipolaDetailsMap.set("bogota", bogotaEntry);
    divipolaDetailsMap.set("bogota d.c.", bogotaEntry);
    divipolaDetailsMap.set("bogota dc", bogotaEntry);

    initialized = true;
    console.log(`[Divipola] Loaded ${municipalitiesMap.size} municipalities from Divipola.`);
  } catch (err) {
    console.error("[Divipola] Error loading Divipola:", err);
  }
};

export const validateCity = (cityName: string | null | undefined): string | null => {
  if (!cityName || typeof cityName !== 'string') return null;
  if (!initialized || municipalitiesMap.size === 0) {
    initDivipola();
  }

  const normalized = normDivipola(cityName);

  return municipalitiesMap.get(normalized) || null;
};

/**
 * Busca un municipio por nombre exacto en los 1.122 municipios oficiales DIVIPOLA (DANE).
 */
export const lookupDivipolaMunicipality = (cityName: string | null | undefined): DivipolaEntry | null => {
  if (!cityName || typeof cityName !== 'string') return null;
  if (!initialized || divipolaDetailsMap.size === 0) {
    initDivipola();
  }
  const normalized = normDivipola(cityName);
  return divipolaDetailsMap.get(normalized) || null;
};

/**
 * Busca el municipio DIVIPOLA más específico mencionado dentro de un texto libre,
 * protegiendo nombres homónimos de barrios urbanos salvo cuando hay contexto explícito.
 */
export const findDivipolaInText = (text: string | null | undefined): DivipolaEntry | null => {
  if (!text || typeof text !== 'string') return null;
  if (!initialized || divipolaEntriesSorted.length === 0) {
    initDivipola();
  }
  const normTxt = normDivipola(text);
  if (!normTxt) return null;

  for (const { key, entry } of divipolaEntriesSorted) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`);
    if (!regex.test(normTxt)) continue;

    if (AMBIGUOUS_MUNICIPALITIES.has(key)) {
      const normDept = normDivipola(entry.departamento);
      const hasDept = normDept.length >= 4 && new RegExp(`(?:^|\\s)${normDept}(?:\\s|$)`).test(normTxt);
      const hasExplicitMpio = new RegExp(`\\bmunicipio\\s+(?:de\\s+)?${escaped}\\b`).test(normTxt);
      if (!hasDept && !hasExplicitMpio) continue;
    }

    return entry;
  }
  return null;
};

export const getDivipolaCount = (): number => {
  if (!initialized || divipolaEntriesSorted.length === 0) {
    initDivipola();
  }
  return divipolaEntriesSorted.length;
};
