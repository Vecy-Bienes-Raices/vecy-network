/**
 * geo-lookup.ts — Motor de GeoLookup Determinístico VECY Network
 * Fuente: IDECA / Catastro Bogotá D.C. (CC BY 4.0) — Actualización junio 2026
 *
 * Convierte un perímetro (calles/carreras) en una lista de barrios/sectores
 * catastrales oficiales usando Point-in-Polygon real (polígono irregular).
 *
 * Arquitectura híbrida:
 * 1. JanIA extrae {calleNorte, calleSur, craOriente, craOccidente} del texto natural
 * 2. Este motor convierte esas variables a coordenadas geográficas (lat/lng)
 * 3. Construye un polígono de 4 vértices (trapezoide, no rectángulo) usando
 *    puntos de anclaje reales de la malla vial de Bogotá
 * 4. Hace Point-in-Polygon contra los 1230 sectores catastrales de IDECA
 */

import fs from 'fs';
import path from 'path';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface GeoPerimeter {
  calleNorte: number;    // Calle más alta (límite norte)
  calleSur: number;      // Calle más baja (límite sur)
  craOriente: number;    // Carrera más baja (límite este — los cerros son Cra 1-7)
  craOccidente: number;  // Carrera más alta (límite oeste)
  ciudad?: string;       // Default: 'Bogotá'
}

export interface GeoLookupResult {
  barrios: string[];       // Nombres en Title Case (sin tildes corregidos)
  sectoresCatastrales: string[];  // Nombres exactos del catastro (mayúsculas)
  totalSectores: number;
  ciudad: string;
  fuente: string;
}

// ─── Cache en memoria ─────────────────────────────────────────────────────────

let sectorData: { sectors: SectorEntry[] } | null = null;

interface SectorEntry {
  nombre: string;
  codigo: string;
  tipo: number;
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  rings: number[][][];
}

function loadSectors(city: string = 'bogota'): SectorEntry[] {
  if (sectorData) return sectorData.sectors;

  const filePath = path.join(__dirname, '..', 'data', `${city}_sectores.json`);
  if (!fs.existsSync(filePath)) {
    console.warn(`[GeoLookup] Archivo no encontrado: ${filePath}`);
    return [];
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  sectorData = JSON.parse(raw);
  console.log(`[GeoLookup] Cargados ${sectorData!.sectors.length} sectores catastrales de ${city}`);
  return sectorData!.sectors;
}

// ─── Conversión Calle/Carrera → Lat/Lng (Bogotá) ────────────────────────────
//
// Bogotá tiene una malla vial que NO es perfectamente rectangular:
// - La Carrera 7 es diagonal (se inclina al oriente a medida que sube)
// - Las calles tienen ligeras variaciones según la localidad
//
// Usamos puntos de anclaje reales (intersecciones conocidas) para interpolar
// con mayor precisión que una fórmula lineal simple.
//
// Puntos de anclaje calibrados (Cra 7 — eje diagonal):
//   Calle 26 / Cra 7:  lat=4.6156, lng=-74.0665
//   Calle 45 / Cra 7:  lat=4.6326, lng=-74.0631
//   Calle 72 / Cra 7:  lat=4.6567, lng=-74.0559
//   Calle 100 / Cra 7: lat=4.6843, lng=-74.0495
//   Calle 116 / Cra 7: lat=4.6986, lng=-74.0461
//   Calle 140 / Cra 7: lat=4.7200, lng=-74.0409
//   Calle 170 / Cra 7: lat=4.7466, lng=-74.0344
//
// Para otras carreras, interpolamos horizontalmente:
//   Cada unidad de carrera ≈ -0.00090 grados de longitud (dirección oeste)
//   Con ajuste por la rotación ~15° de la malla de Bogotá

interface LatLng { lat: number; lng: number; }

// Puntos de anclaje Carrera 7 (eje diagonal de referencia)
const CRA7_ANCHORS: { calle: number; lat: number; lng: number }[] = [
  { calle: 6,   lat: 4.5974, lng: -74.0762 },
  { calle: 26,  lat: 4.6156, lng: -74.0665 },
  { calle: 45,  lat: 4.6326, lng: -74.0631 },
  { calle: 57,  lat: 4.6432, lng: -74.0606 },
  { calle: 63,  lat: 4.6487, lng: -74.0592 },
  { calle: 72,  lat: 4.6567, lng: -74.0559 },
  { calle: 85,  lat: 4.6688, lng: -74.0524 },
  { calle: 100, lat: 4.6843, lng: -74.0495 },
  { calle: 116, lat: 4.6986, lng: -74.0461 },
  { calle: 127, lat: 4.7085, lng: -74.0438 },
  { calle: 140, lat: 4.7200, lng: -74.0409 },
  { calle: 170, lat: 4.7466, lng: -74.0344 },
];

// Ancho aproximado por carrera en grados de longitud (Bogotá central/norte)
const LNG_PER_CRA = 0.000895; // ~100m por carrera
// Rotación de la malla: cada carrera al norte también ajusta ligeramente el lat
const LAT_PER_CRA = 0.000050; // ajuste latitudinal por la rotación

function interpolateCra7(calle: number): LatLng {
  const anchors = CRA7_ANCHORS;

  // Buscar el segmento correcto
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (calle >= a.calle && calle <= b.calle) {
      const t = (calle - a.calle) / (b.calle - a.calle);
      return {
        lat: a.lat + t * (b.lat - a.lat),
        lng: a.lng + t * (b.lng - a.lng),
      };
    }
  }

  // Extrapolación fuera de rango
  if (calle < anchors[0].calle) return { lat: anchors[0].lat, lng: anchors[0].lng };
  const last = anchors[anchors.length - 1];
  const prev = anchors[anchors.length - 2];
  const slope_lat = (last.lat - prev.lat) / (last.calle - prev.calle);
  const slope_lng = (last.lng - prev.lng) / (last.calle - prev.calle);
  return {
    lat: last.lat + slope_lat * (calle - last.calle),
    lng: last.lng + slope_lng * (calle - last.calle),
  };
}

/**
 * Convierte intersección calle/carrera a coordenadas lat/lng reales en Bogotá.
 * Usa puntos de anclaje de la Carrera 7 y luego desplaza según la carrera.
 */
export function calleCarreraToLatLng(calle: number, carrera: number): LatLng {
  // Punto base en la Carrera 7 para esta calle
  const base = interpolateCra7(calle);

  // Desplazamiento desde Carrera 7 hacia la carrera objetivo
  // En Bogotá, las carreras aumentan hacia el occidente (más negativo en lng)
  // Carrera 7 → Carrera 1 (cerros): va al este (+ lng)
  // Carrera 7 → Carrera 30, 68, etc.: va al oeste (- lng)
  const deltaCra = carrera - 7; // positivo = al oeste
  const deltaLng = -deltaCra * LNG_PER_CRA;
  const deltaLat = -deltaCra * LAT_PER_CRA; // ajuste por rotación de la malla

  return {
    lat: base.lat + deltaLat,
    lng: base.lng + deltaLng,
  };
}

/**
 * Construye el polígono (trapezoide irregular) del perímetro dado.
 * 4 vértices: SW, NW, NE, SE (en sentido antihorario)
 */
function buildPerimeterPolygon(p: GeoPerimeter): LatLng[] {
  const sw = calleCarreraToLatLng(p.calleSur,   p.craOccidente); // Sur-Oeste
  const nw = calleCarreraToLatLng(p.calleNorte, p.craOccidente); // Norte-Oeste
  const ne = calleCarreraToLatLng(p.calleNorte, p.craOriente);   // Norte-Este
  const se = calleCarreraToLatLng(p.calleSur,   p.craOriente);   // Sur-Este
  return [sw, nw, ne, se];
}

// ─── Ray Casting Point-in-Polygon ────────────────────────────────────────────

/**
 * Algoritmo Ray Casting: determina si un punto está dentro de un polígono.
 * Funciona con polígonos irregulares (trapezoides, polígonos concavos, etc.)
 */
function pointInPolygon(point: LatLng, ring: number[][]): boolean {
  const { lat, lng } = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]; // lng, lat
    const xj = ring[j][0], yj = ring[j][1];

    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Verifica si un polígono del catastro (con múltiples rings) intersecta
 * con el perímetro dado. Usa bbox para pre-filtrar y ahorrar cálculos.
 */
function sectorIntersectsPerimeter(
  sector: SectorEntry,
  perimeterPoly: LatLng[],
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): boolean {
  // Pre-filtro rápido: si los bbox no se solapan, descartamos
  const [sMinLng, sMinLat, sMaxLng, sMaxLat] = sector.bbox;
  if (sMaxLng < bbox.minLng || sMinLng > bbox.maxLng) return false;
  if (sMaxLat < bbox.minLat || sMinLat > bbox.maxLat) return false;

  // Verificación exacta: ¿algún punto del sector cae dentro del polígono del perímetro?
  // Y también: ¿el centroide del sector está dentro del perímetro?
  const centroidLat = (sMinLat + sMaxLat) / 2;
  const centroidLng = (sMinLng + sMaxLng) / 2;

  if (pointInPolygon({ lat: centroidLat, lng: centroidLng }, perimeterPoly.map(p => [p.lng, p.lat]))) {
    return true;
  }

  // Verificar si algún vértice del sector cae dentro del perímetro
  for (const ring of sector.rings) {
    // Muestrear hasta 8 puntos del ring para eficiencia
    const step = Math.max(1, Math.floor(ring.length / 8));
    for (let i = 0; i < ring.length; i += step) {
      const [lng, lat] = ring[i];
      if (pointInPolygon({ lat, lng }, perimeterPoly.map(p => [p.lng, p.lat]))) {
        return true;
      }
    }
  }

  return false;
}

// ─── Normalización de nombres ─────────────────────────────────────────────────

/**
 * Convierte "EL NOGAL" → "El Nogal" y maneja tildes perdidas en el catastro.
 * También aplica correcciones de tildes conocidas.
 */
const TILDE_CORRECTIONS: Record<string, string> = {
  'EMAUS': 'Emaús',
  'SANTA BARBARA': 'Santa Bárbara',
  'RINCON DEL CHICO': 'Rincón del Chicó',
  'CEDRITOS DEL SUR': 'Cedritos del Sur',
  'CHICO NORTE': 'Chicó Norte',
  'CHICO NORTE II SECTOR': 'Chicó Norte II Sector',
  'CHICO NORTE III SECTOR': 'Chicó Norte III Sector',
  'CHICO SUR': 'Chicó Sur',
  'EL CHICO': 'El Chicó',
  'CHICO LAGO': 'Chicó Lago',
  'LOS ROSALES': 'Los Rosales',
};

function toTitleCase(name: string): string {
  if (TILDE_CORRECTIONS[name]) return TILDE_CORRECTIONS[name];

  const minorWords = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'a', 'al']);
  return name
    .toLowerCase()
    .split(' ')
    .map((word, i) => (i === 0 || !minorWords.has(word))
      ? word.charAt(0).toUpperCase() + word.slice(1)
      : word)
    .join(' ');
}

// ─── Función Principal Exportada ──────────────────────────────────────────────

/**
 * Dado un perímetro en calles/carreras, retorna los sectores catastrales
 * de Bogotá que caen dentro de ese perímetro.
 *
 * @example
 * const result = await lookupBarriosByPerimeter({
 *   calleNorte: 85, calleSur: 72, craOriente: 4, craOccidente: 11
 * });
 * // → { barrios: ["La Cabrera", "El Nogal", "Los Rosales", "Emaús"], ... }
 */
export function lookupBarriosByPerimeter(perimeter: GeoPerimeter): GeoLookupResult {
  const ciudad = perimeter.ciudad?.toLowerCase() || 'bogota';
  const sectors = loadSectors(ciudad);

  if (sectors.length === 0) {
    return { barrios: [], sectoresCatastrales: [], totalSectores: 0, ciudad, fuente: 'N/A' };
  }

  // 1. Construir polígono irregular del perímetro (trapezoide por la diagonal Cra 7)
  const perimeterPoly = buildPerimeterPolygon(perimeter);

  // 2. Calcular bbox del perímetro para pre-filtro rápido
  const lats = perimeterPoly.map(p => p.lat);
  const lngs = perimeterPoly.map(p => p.lng);
  const bbox = {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };

  // 3. Filtrar sectores que intersectan con el perímetro
  const matched = sectors.filter(s => sectorIntersectsPerimeter(s, perimeterPoly, bbox));

  // 4. Deduplicar por nombre y convertir a Title Case
  const uniqueNames = new Map<string, string>();
  for (const s of matched) {
    if (!uniqueNames.has(s.nombre)) {
      uniqueNames.set(s.nombre, toTitleCase(s.nombre));
    }
  }

  const sectoresCatastrales = [...uniqueNames.keys()].sort();
  const barrios = [...uniqueNames.values()].sort();

  return {
    barrios,
    sectoresCatastrales,
    totalSectores: matched.length,
    ciudad,
    fuente: 'IDECA-CadastroBogota-2026-06',
  };
}

/**
 * Normaliza texto para búsqueda SQL (elimina tildes, minúsculas).
 * Usar con ILIKE en queries de Drizzle/PostgreSQL.
 *
 * @example
 * const term = normalizeForSearch("El Nogal"); // → "el nogal"
 * // En SQL: WHERE zone ILIKE '%el nogal%'
 */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // eliminar tildes
    .replace(/ñ/g, 'n')
    .trim();
}
