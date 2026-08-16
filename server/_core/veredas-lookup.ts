import fs from "fs";
import path from "path";

export interface VeredaInfo {
  vereda: string;
  municipio: string;
  departamento: string;
  dptoMpio: string;
  codigoVer: string;
  areaHa: number;
}

let veredasCache: VeredaInfo[] = [];
let veredasByNameMap: Map<string, VeredaInfo[]> = new Map();
let veredasByMpioMap: Map<string, VeredaInfo[]> = new Map();
let isInitialized = false;

function normalize(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function initVeredasLookup(): void {
  if (isInitialized && veredasCache.length > 0) return;

  try {
    const indexPath = path.join(process.cwd(), "server/data/colombia_veredas_index.json");
    if (!fs.existsSync(indexPath)) {
      console.warn(`[VeredasLookup] No se encontró el índice de veredas en: ${indexPath}`);
      return;
    }

    const raw = fs.readFileSync(indexPath, "utf8");
    veredasCache = JSON.parse(raw);
    veredasByNameMap.clear();
    veredasByMpioMap.clear();

    for (const item of veredasCache) {
      const normVereda = normalize(item.vereda);
      const normMpio = normalize(item.municipio);

      // 1. Mapeo por nombre de vereda
      if (!veredasByNameMap.has(normVereda)) {
        veredasByNameMap.set(normVereda, []);
      }
      veredasByNameMap.get(normVereda)!.push(item);

      // 2. Mapeo por municipio
      if (!veredasByMpioMap.has(normMpio)) {
        veredasByMpioMap.set(normMpio, []);
      }
      veredasByMpioMap.get(normMpio)!.push(item);
    }

    isInitialized = true;
    console.log(`[VeredasLookup] ✅ Indexadas ${veredasCache.length} veredas de Colombia en memoria.`);
  } catch (err: any) {
    console.error(`[VeredasLookup] Error inicializando veredas:`, err.message);
  }
}

/**
 * Busca si un texto corresponde a una vereda oficial de Colombia.
 * Si se pasa un municipio opcional, prioriza las veredas de ese municipio.
 */
export function lookupVereda(texto: string, municipioHint?: string): VeredaInfo | null {
  if (!texto) return null;
  if (!isInitialized) initVeredasLookup();

  const cleanText = normalize(texto).replace(/\bvereda\b/g, "").trim();
  if (!cleanText) return null;

  const matches = veredasByNameMap.get(cleanText);
  if (!matches || matches.length === 0) {
    return null;
  }

  // Si solo hay una coincidencia en toda Colombia, la retornamos
  if (matches.length === 1) {
    return matches[0];
  }

  // Si hay varias coincidencias con el mismo nombre y tenemos hint de municipio
  if (municipioHint) {
    const normHint = normalize(municipioHint);
    const exactMpio = matches.find(m => normalize(m.municipio) === normHint);
    if (exactMpio) return exactMpio;
  }

  // Si no hay hint o no coincide, retornamos la primera más representativa
  return matches[0];
}

/**
 * Retorna todas las veredas de un municipio determinado.
 */
export function getVeredasByMunicipio(municipio: string): VeredaInfo[] {
  if (!municipio) return [];
  if (!isInitialized) initVeredasLookup();

  const normMpio = normalize(municipio);
  return veredasByMpioMap.get(normMpio) || [];
}
