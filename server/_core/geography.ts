/**
 * Geography and Text Normalization Module
 * Version: 3.0 — Cobertura nacional Colombia
 */
import { buscarLugarColombia } from './colombia-geography';
import { geocodeAddress } from './geocoding';
import { getDb } from '../db';
import { colombiaGeography } from '../../drizzle/schema';
import { sql } from 'drizzle-orm';

export const DICCIONARIO_BOGOTA: Record<string, { localidad: string, barrios: string[] }> = {
  "usaquen": {
    localidad: "Usaquén",
    barrios: [
      "Cedritos", "Los Cedros", "Santa Bárbara", "Santa Bárbara Central",
      "Santa Bárbara Norte", "El Chicó", "Chicó Norte", "Chicó Reservado",
      "Usaquén", "Toberín", "Country Club", "San Patricio", "La Uribe",
      "Verbenal", "Barrancas", "Horizontes", "La Cita", "Tibabita",
      "La Cerámica", "La Unión", "Los Arrayanes", "Bosque Medina"
    ]
  },
  "chapinero": {
    localidad: "Chapinero",
    barrios: [
      "El Lago", "El Retiro", "Rosales", "Los Rosales", "La Cabrera",
      "Chicó Reservado Norte", "Chapinero Central", "Chapinero Alto",
      "Pardo Rubio", "Quinta Camacho", "El Castillo", "San Luis", "Juan XXIII",
      // Barrio El Refugio — franja norte de Chapinero, Calle 85-90 entre Cr 5 y 11
      "El Refugio"
    ]
  },
  "suba": {
    localidad: "Suba",
    barrios: [
      // Suba tradicional
      "Niza", "Alhambra", "Floresta", "Lisboa", "Prado Veraniego", "Santa Cecilia",
      "La Campiña", "Suba Centro", "Tibabuyes", "Rincón", "La Gaitana",
      "Bilbao", "Casablanca", "El Rinconcito", "Britalia",
      // Norte de Suba (campestre / alto estrato)
      "Guaymaral", "Lagos de Torca", "La Conejera", "Torca",
      "San Pedro de Torca", "El Pradío", "Suba Rural", "Hacienda San Simón",
      "Hacienda San Sebastián", "Club Los Lagartos", "Mirandela",
      "San José del Prado", "El Cerezo", "La Isabela"
    ]
  },
  "barrios unidos": {
    localidad: "Barrios Unidos",
    barrios: [
      "Doce de Octubre", "Los Andes", "Polo Club", "Jorge Eliécer Gaitán",
      "La Patria", "Alcázares", "Siete de Agosto", "Lourdes", "San Felipe"
    ]
  },
  "teusaquillo": {
    localidad: "Teusaquillo",
    barrios: [
      "Quinta Paredes", "Armenia", "Palermo", "La Esmeralda", "Ciudad Salitre Occidental",
      "Teusaquillo", "La Soledad", "Nicolás de Federmann", "La Magdalena"
    ]
  },
  "engativa": {
    localidad: "Engativá",
    barrios: [
      "Engativá", "Boyacá Real", "Normandía", "Santa Helenita", "Villa Amalia",
      "Álamos", "Las Ferias", "Bolivia", "Garcimédina", "Quirigua"
    ]
  },
  "fontibon": {
    localidad: "Fontibón",
    barrios: [
      "Fontibón", "Modelia", "Capellanía", "Hayuelos", "Ciudad Salitre Oriental",
      "Tintal Norte", "Zona Franca", "San Pablo"
    ]
  },
  "kennedy": {
    localidad: "Kennedy",
    barrios: [
      "Kennedy Central", "Patio Bonito", "Bavaria", "Castilla", "Timiza",
      "Américas", "Gran Britalia", "Techo", "Corabastos", "Kennedy Occidental"
    ]
  },
  "bosa": {
    localidad: "Bosa",
    barrios: [
      "Bosa Central", "El Porvenir", "Bosa La Libertad", "Apogeo", "Santafé",
      "San Bernardino", "El Recreo"
    ]
  },
  "puente aranda": {
    localidad: "Puente Aranda",
    barrios: [
      "Puente Aranda", "Ciudad Montes", "Muzú", "Alcázares Sur",
      "Pradera", "Galán"
    ]
  },
  "antonio narino": {
    localidad: "Antonio Nariño",
    barrios: ["Restrepo", "Eduardo Santos", "Trinidad Galán", "Bravo Páez", "Quiroga"]
  },
  "rafael uribe": {
    localidad: "Rafael Uribe Uribe",
    barrios: [
      "Marco Fidel Suárez", "Muzu", "La Colonia", "Miragüez", "San Agustín",
      "Diana Turbay", "Marruecos"
    ]
  },
  "santa fe": {
    localidad: "Santa Fe",
    barrios: [
      "Las Cruces", "La Macarena", "La Candelaria", "Lourdes", "El Campin",
      "Germania", "Bosque Izquierdo"
    ]
  },
  "la candelaria": {
    localidad: "La Candelaria",
    barrios: ["La Candelaria", "Centro Histórico", "Las Aguas"]
  },
  "los martires": {
    localidad: "Los Mártires",
    barrios: ["La Favorita", "Eduardo Santos", "El Progreso", "Ricaurte"]
  },
  "san cristobal": {
    localidad: "San Cristóbal",
    barrios: ["20 de Julio", "La Victoria", "El Sosiego", "San Cristóbal"]
  },
  "usme": {
    localidad: "Usme",
    barrios: ["Usme Centro", "El Triangulo", "Comuneros", "Alfonso López"]
  },
  "tunjuelito": {
    localidad: "Tunjuelito",
    barrios: ["Tunjuelito", "Venecia", "Abraham Lincoln", "Falla"]
  },
  "ciudad bolivar": {
    localidad: "Ciudad Bolívar",
    barrios: ["Lucero", "El Tesoro", "Ismael Perdomo", "Meissen", "Sierra Morena"]
  }
};

export const MUNICIPIOS_CERCANOS = [
  "Chía", "Cajicá", "Sopó", "La Calera", "Cota", "Funza", "Mosquera",
  "Madrid", "Facatativá", "Zípaquirá", "Tocancipá", "Tenjo", "Tabio",
  "El Rosal", "Bojacá", "Subachoque", "Gachancipá"
];

export type BarrioInfo = {
  barrioCanonico: string;
  localidad: string;
  isMunicipio?: boolean;
};

// Generar mapas de búsqueda normalizados
export const MAPA_BARRIOS: Record<string, BarrioInfo> = {};
export const MAPA_LOCALIDADES: Record<string, string> = {};

// Poblamos barrios de Bogotá
for (const [key, info] of Object.entries(DICCIONARIO_BOGOTA)) {
  const normLocalidad = normalizarTextoGeografico(info.localidad);
  MAPA_LOCALIDADES[normLocalidad] = info.localidad;

  for (const barrio of info.barrios) {
    const normBarrio = normalizarTextoGeografico(barrio);
    MAPA_BARRIOS[normBarrio] = {
      barrioCanonico: barrio,
      localidad: info.localidad
    };
  }
}

// Poblamos municipios
for (const mun of MUNICIPIOS_CERCANOS) {
  const normMun = normalizarTextoGeografico(mun);
  MAPA_BARRIOS[normMun] = {
    barrioCanonico: mun,
    localidad: "Sabana de Bogotá",
    isMunicipio: true
  };
}

/**
 * Normaliza un texto geográfico convirtiéndolo a minúsculas, quitando tildes
 * (y ñ -> n), removiendo dobles espacios, y expandiendo abreviaciones comunes.
 */
export function normalizarTextoGeografico(texto: string): string {
  if (!texto) return "";
  let n = texto.toLowerCase();
  
  // Quitar tildes (normalización NFD y regex de acentos)
  n = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Específicamente ñ -> n
  n = n.replace(/ñ/g, "n");
  
  // Limpiar saltos de línea y tabuladores
  n = n.replace(/[\r\n\t]/g, " ");
  
  // Reemplazar caracteres no alfanuméricos por espacios
  n = n.replace(/[^a-z0-9]/g, " ");
  
  // Eliminar espacios dobles y trim
  n = n.replace(/\s+/g, " ").trim();
  
  // Expandir abreviaciones comunes
  n = n.replace(/\bsta\b/g, "santa");
  n = n.replace(/\bsto\b/g, "santo");
  n = n.replace(/\bapto\b/g, "apartamento");
  n = n.replace(/\bhab\b/g, "habitacion");
  n = n.replace(/\bhabs\b/g, "habitaciones");
  n = n.replace(/\bfusa\b/g, "fusagasuga");
  n = n.replace(/\bfaca\b/g, "facatativa");
  n = n.replace(/\bzipa\b/g, "zipaquira");
  n = n.replace(/\bgirardor\b/g, "girardot");
  
  return n;
}

export type ValidacionZonaResult = {
  isValid: boolean;
  barrioCanonico?: string;
  localidad?: string;
  city?: string;
  isMunicipio?: boolean;
  errorType?: "DATOS_INCOMPLETOS" | "AMBIGUO";
  message?: string;
  latitude?: string;
  longitude?: string;
};

/**
 * Valida si una zona ingresada corresponde a un barrio exacto,
 * maneja ambigüedades, sectores amplios y busca coincidencias en toda Colombia.
 * Híbrido: Google Maps Geocoding API + Fallback local base de datos DIVIPOLA (DANE).
 */
export async function validarZona(zona: string, ciudad?: string, textoCompleto?: string, isRequirement: boolean = false): Promise<ValidacionZonaResult> {
  const normZone = normalizarTextoGeografico(zona);
  const normCity = ciudad ? normalizarTextoGeografico(ciudad) : "";
  const normFullText = textoCompleto ? normalizarTextoGeografico(textoCompleto) : "";

  if (!normZone) {
    return { isValid: false, errorType: "DATOS_INCOMPLETOS", message: "Pedir zona específica" };
  }

  // 1. Verificar ambigüedades explícitas (Reglas de Bogotá)
  if (normZone === "cedros") {
    return {
      isValid: false,
      errorType: "AMBIGUO",
      message: "¿Te refieres a Cedritos o a Los Cedros? Por favor aclara para registrarlo."
    };
  }

  if (normZone === "chico") {
    return {
      isValid: false,
      errorType: "AMBIGUO",
      message: "¿Te refieres a El Chicó, Chicó Norte o Chicó Reservado? Por favor aclara."
    };
  }

  if (normZone === "usaquen") {
    return {
      isValid: false,
      errorType: "AMBIGUO",
      message: "Usaquén es una localidad muy grande. ¿Qué barrio específico dentro de Usaquén buscas o vendes?"
    };
  }

  // --- CAPA 0: Tabla de Equivalencias Aprendidas de Zona (zone_aliases) v21.15 ---
  const knownAliasMap: Record<string, string> = {
    "nueva autopista": "Cedritos",
    "marlboro": "Chicó Norte",
    "zona marlboro": "Chicó Norte",
    "buganvilia": "Bella Suiza",
    "recodo del country": "El Country",
    "multicentro": "Santa Bárbara",
    "bosques del marques": "Bosques de Bella Suiza",
    "santas": "Santa Bárbara"
  };
  const normZoneLower = normZone.toLowerCase().trim();
  if (knownAliasMap[normZoneLower]) {
    const resuelto = knownAliasMap[normZoneLower];
    console.log(`[Geocoding-Alias] Alias de zona resuelto "${zona}" ➔ "${resuelto}" (vía zone_aliases, sin gastar Maps API)`);
    return {
      isValid: true,
      barrioCanonico: resuelto,
      localidad: "Bogotá",
      city: "Bogotá",
      isMunicipio: false
    };
  }

  // --- CAPA 0.5: Resolución Generalizable de Cuadrantes Viales (v21.16 - Addendum v6 / IDECA Spatial) ---
  const cuadranteRes = await resolverCuadranteVial(normZoneLower);
  if (cuadranteRes.resuelto && cuadranteRes.barrios.length > 0) {
    const resueltoStr = cuadranteRes.barrios.join(", ");
    console.log(`[Geocoding-Cuadrante] ${cuadranteRes.descripcion} resuelto [${cuadranteRes.confianza}] ➔ "${resueltoStr}"`);
    return {
      isValid: true,
      barrioCanonico: resueltoStr,
      localidad: "Bogotá",
      city: "Bogotá",
      isMunicipio: false
    };
  }

  // --- CAPA DE GEOLOCALIZACIÓN 1: Google Maps Geocoding API ---
  const queryAddress = ciudad && normalizarTextoGeografico(ciudad) !== "bogota"
    ? `${zona}, ${ciudad}, Colombia`
    : `${zona}, Bogotá, Colombia`;

  const googleResult = await geocodeAddress(queryAddress);
  if (googleResult) {
    if (googleResult.isValid) {
      const normGoogleCity = normalizarTextoGeografico(googleResult.city);
      const isBogota = normGoogleCity === "bogota";

      return {
        isValid: true,
        barrioCanonico: googleResult.zone,
        localidad: googleResult.locality,
        city: googleResult.city,
        isMunicipio: !isBogota,
        latitude: googleResult.latitude,
        longitude: googleResult.longitude
      };
    } else if (googleResult.isApiError) {
      console.warn(`[validarZona] API de Google Maps falló (Status/Keys). Activando fallback silencioso con coordenadas nulas para no descartar el registro.`);
      return {
        isValid: true,
        barrioCanonico: zona.trim(),
        localidad: ciudad || "Bogotá",
        city: ciudad || "Bogotá",
        isMunicipio: ciudad ? normalizarTextoGeografico(ciudad) !== "bogota" : false,
        latitude: undefined,
        longitude: undefined
      };
    }
  }

  // --- CAPA DE GEOLOCALIZACIÓN 2: Fallback local (DIVIPOLA & Diccionarios estáticos) ---
  const db = await getDb();
  let lugar: any = null;
  const normSimple = (txt: string) => txt.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ").trim();

  // 2. PRIORIDAD 1: Si el usuario especificó una ciudad nacional de la DIVIPOLA en la DB
  if (db && ciudad) {
    const cleanCity = ciudad.trim();
    try {
      const [divipolaMatch] = await db
        .select()
        .from(colombiaGeography)
        .where(sql`LOWER(name_mun) = LOWER(${cleanCity})`)
        .limit(1);

      if (divipolaMatch && normalizarTextoGeografico(divipolaMatch.nameMun) !== "bogota") {
        return {
          isValid: true,
          barrioCanonico: zona.trim(),
          localidad: divipolaMatch.nameDept,
          city: divipolaMatch.nameMun,
          isMunicipio: true
        };
      }
    } catch (err: any) {
      console.error("[Geography-DB] Error consultando DIVIPOLA por ciudad:", err.message);
    }
  }

  // 3. PRIORIDAD 2: Coincidencia exacta con el diccionario estático de Bogotá
  if (MAPA_BARRIOS[normZone]) {
    const info = MAPA_BARRIOS[normZone];
    return {
      isValid: true,
      barrioCanonico: info.barrioCanonico,
      localidad: info.localidad,
      city: info.isMunicipio ? info.barrioCanonico : "Bogotá",
      isMunicipio: info.isMunicipio || false
    };
  }

  // 4. PRIORIDAD 3: Buscar en la base de datos DIVIPOLA usando el nombre de la zona (si es un municipio externo)
  if (db && normZone) {
    try {
      const [divipolaMatch] = await db
        .select()
        .from(colombiaGeography)
        .where(sql`LOWER(name_mun) = LOWER(${zona.trim()})`)
        .limit(1);

      if (divipolaMatch && normalizarTextoGeografico(divipolaMatch.nameMun) !== "bogota") {
        return {
          isValid: true,
          barrioCanonico: divipolaMatch.nameMun,
          localidad: divipolaMatch.nameDept,
          city: divipolaMatch.nameMun,
          isMunicipio: true
        };
      }
    } catch (err: any) {
      console.error("[Geography-DB] Error consultando DIVIPOLA por zona:", err.message);
    }
  }

  // 5. PRIORIDAD 4: Fallback estático nacional (buscarLugarColombia)
  if (normZone) {
    lugar = buscarLugarColombia(zona);
  }
  if (!lugar && textoCompleto) {
    lugar = buscarLugarColombia(textoCompleto);
  }

  if (lugar && normSimple(lugar.nombreCanonico) !== "bogota") {
    const cleanText = (txt: string) => txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    const formattedCity = cleanText(lugar.nombreCanonico);
    const formattedDept = cleanText(lugar.departamento);

    return {
      isValid: true,
      barrioCanonico: zona ? zona.trim() : formattedCity,
      localidad: formattedDept,
      city: formattedCity,
      isMunicipio: true
    };
  }

  // 6. PRIORIDAD 5: Validaciones de datos incompletos locales (Localidades solas o sectores amplios)
  if (MAPA_LOCALIDADES[normZone]) {
    if (isRequirement) {
      return {
        isValid: true,
        barrioCanonico: MAPA_LOCALIDADES[normZone],
        localidad: MAPA_LOCALIDADES[normZone],
        city: "Bogotá",
        isMunicipio: false
      };
    }
    return {
      isValid: false,
      errorType: "DATOS_INCOMPLETOS",
      message: `Mencionaste la localidad de *${MAPA_LOCALIDADES[normZone]}*. Para hacer match necesito que me digas el barrio exacto.`
    };
  }

  const sectoresAmplios = ["norte", "norte de bogota", "sur", "centro", "occidente", "salitre", "bogota", "sabana de bogota", "municipios cercanos"];
  if (sectoresAmplios.includes(normZone)) {
    if (isRequirement) {
      return {
        isValid: true,
        barrioCanonico: zona.trim(),
        localidad: "Bogotá",
        city: "Bogotá",
        isMunicipio: false
      };
    }
    return {
      isValid: false,
      errorType: "DATOS_INCOMPLETOS",
      message: "Mencionaste una zona muy amplia. Por favor, dime el barrio exacto o municipio específico."
    };
  }

  // 7. PRIORIDAD 6: Si la zona tiene largo suficiente, se acepta dinámicamente como barrio de Bogotá o de una ciudad válida
  if (normZone && normZone.length >= 3) {
    const cleanText = (txt: string) => txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    let finalCity = "Bogotá";
    let isMun = false;

    if (ciudad) {
      const cleanCity = cleanText(ciudad);
      const lugarCity = buscarLugarColombia(cleanCity);
      if (lugarCity && normalizarTextoGeografico(lugarCity.nombreCanonico) !== "bogota") {
        finalCity = cleanText(lugarCity.nombreCanonico);
        isMun = true;
      }
    }

    return {
      isValid: true,
      barrioCanonico: zona.trim(),
      localidad: isMun ? finalCity : "Bogotá",
      city: finalCity,
      isMunicipio: isMun
    };
  }

  return {
    isValid: false,
    errorType: "DATOS_INCOMPLETOS",
    message: "No logré identificar la ubicación. Por favor dime la ciudad, municipio o barrio exacto."
  };
}

/**
 * Desambiguador de Barrios Compuestos / Inventados (v18.0)
 *
 * Cuando los asesores escriben dos barrios colindantes como si fueran uno solo
 * (ej: "Chicó Refugio", "Rosales Cabrera", "Cedritos Country"),
 * esta función los separa en un array independiente para que el motor de matching
 * pueda cruzar ambas zonas de forma correcta.
 *
 * @param zona  String de zona tal como lo escribió el asesor.
 * @returns     Array de barrios canónicos. Si no hay ambigüedad → [zona].
 */
export function desambiguarBarriosCompuestos(zona: string): string[] {
  if (!zona || zona.trim().length === 0) return [zona];

  // Mapa de pares de barrios colindantes conocidos del norte de Bogotá.
  const PARES_CONOCIDOS: Record<string, string[]> = {
    // Chicó + Refugio (Usaquén ↔ Chapinero)
    "chico refugio":       ["El Chicó", "El Refugio"],
    "el chico refugio":    ["El Chicó", "El Refugio"],
    "chico el refugio":    ["El Chicó", "El Refugio"],
    "chico-refugio":       ["El Chicó", "El Refugio"],
    // Rosales + Cabrera (Chapinero)
    "rosales cabrera":     ["Rosales", "La Cabrera"],
    "la cabrera rosales":  ["Rosales", "La Cabrera"],
    "cabrera rosales":     ["Rosales", "La Cabrera"],
    // Rosales + Virrey
    "rosales virrey":      ["Rosales", "El Virrey"],
    "virrey rosales":      ["Rosales", "El Virrey"],
    // Cedritos + Country
    "cedritos country":    ["Cedritos", "Country Club"],
    "country cedritos":    ["Cedritos", "Country Club"],
    // Santa Bárbara + Chicó
    "santa barbara chico": ["Santa Bárbara", "El Chicó"],
    // Niza + Alhambra
    "niza alhambra":       ["Niza", "Alhambra"],
    // Lago + Retiro
    "lago retiro":         ["El Lago", "El Retiro"],
    "retiro lago":         ["El Lago", "El Retiro"],
    // Salitre + Modelia
    "salitre modelia":     ["Ciudad Salitre Oriental", "Modelia"],
  };

  const normInput = normalizarTextoGeografico(zona);
  if (PARES_CONOCIDOS[normInput]) {
    console.log(`[Geography-Disambiguate] "${zona}" → ${JSON.stringify(PARES_CONOCIDOS[normInput])}`);
    return PARES_CONOCIDOS[normInput];
  }

  // Detección dinámica: verificar si el string contiene DOS barrios del diccionario de localidades distintas
  const normWords = normInput.split(" ").filter((w: string) => w.length >= 3);
  if (normWords.length >= 2) {
    for (let splitAt = 1; splitAt < normWords.length; splitAt++) {
      const part1 = normWords.slice(0, splitAt).join(" ");
      const part2 = normWords.slice(splitAt).join(" ");
      const barrio1 = MAPA_BARRIOS[part1];
      const barrio2 = MAPA_BARRIOS[part2];
      if (barrio1 && barrio2 && barrio1.localidad !== barrio2.localidad) {
        const result = [barrio1.barrioCanonico, barrio2.barrioCanonico];
        console.log(`[Geography-Disambiguate-Dynamic] "${zona}" → ${JSON.stringify(result)}`);
        return result;
      }
    }
  }

  // Sin ambigüedad → devolver zona original como array unitario
  return [zona.trim()];
}

/**
 * Resoluidor General de Cuadrantes Viales en Bogotá (v21.18 - IDECA Spatial + Fallback)
 * Realiza intersección geométrica espacial ST_Intersects / ST_MakeEnvelope sobre barrios_bogota_geojson en Supabase.
 * Mantiene la tabla fija únicamente como fallback de respaldo con confianza 'aproximada'.
 */
export async function resolverCuadranteVial(texto: string): Promise<{ resuelto: boolean; barrios: string[]; descripcion: string; confianza: string }> {
  const norm = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // 1. Extraer Calles (minStreet y maxStreet)
  const calleMatch = norm.match(/(?:calle|cll|cl|c|entre\s+la)\s*(\d+)\s*(?:y|a|-|hasta|\s+y\s+la)\s*(\d+)/i) 
    || norm.match(/entre\s+(?:la\s*)?(\d+)\s+y\s+(?:la\s*)?(\d+)/i);

  if (!calleMatch) {
    return { resuelto: false, barrios: [], descripcion: "No es un cuadrante vial resoluble por rango de calles", confianza: "ninguna" };
  }

  const minSt = Math.min(parseInt(calleMatch[1]), parseInt(calleMatch[2]));
  const maxSt = Math.max(parseInt(calleMatch[1]), parseInt(calleMatch[2]));

  // 2. Extraer Carreras / Avenidas si están presentes en la frase
  const craMatch = norm.match(/(?:carrera|cra|cr|kr|cpr|entre\s+la\s+carrera)\s*(\d+)\s*(?:y|a|-|hasta|\s+y\s+la)\s*(\d+)/i);
  let minCra: number | undefined;
  let maxCra: number | undefined;
  if (craMatch) {
    minCra = Math.min(parseInt(craMatch[1]), parseInt(craMatch[2]));
    maxCra = Math.max(parseInt(craMatch[1]), parseInt(craMatch[2]));
  } else if (norm.includes("autopista") || norm.includes("auto")) {
    minCra = 15;
    maxCra = 45;
  } else if (norm.includes("7") || norm.includes("septima") || norm.includes("séptima")) {
    minCra = 1;
    maxCra = 15;
  }

  // 3. Consulta de Intersección Geométrica Espacial PostGIS sobre barrios_bogota_geojson en Supabase
  try {
    const db = await getDb();
    if (db) {
      const minLat = 4.597 + (minSt * 0.00094);
      const maxLat = 4.597 + (maxSt * 0.00094);
      const minLon = maxCra ? (-74.045 - (maxCra * 0.00095)) : -74.080;
      const maxLon = minCra ? (-74.045 - (minCra * 0.00095)) : -74.025;

      const rows: any = await db.execute(sql`
        SELECT DISTINCT scanombre
        FROM barrios_bogota_geojson
        WHERE ST_Intersects(
          geometry,
          ST_MakeEnvelope(${minLon}, ${minLat}, ${maxLon}, ${maxLat}, 4326)
        )
        ORDER BY scanombre;
      `);

      if (rows && rows.length > 0) {
        const barrios = rows.map((r: any) => String(r.scanombre).trim());
        return {
          resuelto: true,
          barrios,
          descripcion: `Intersección espacial IDECA (${barrios.length} sectores catastrales)`,
          confianza: "alta_geometria_ideca"
        };
      }
    }
  } catch (err) {
    console.error("[Geocoding-Cuadrante-Spatial] Error consultando barrios_bogota_geojson:", err);
  }

  // 4. FALLBACK DE RESPALDO CON TABLA FIJA (Confianza Aproximada)
  let candidateBarrios: string[] = [];

  if (minSt >= 1 && maxSt <= 34) {
    candidateBarrios = ["La Candelaria", "Centro", "Las Nieves", "La Macarena", "Teusaquillo"];
  } else if (minSt >= 34 && maxSt <= 63) {
    candidateBarrios = ["Chapinero Central", "Marly", "Palermo", "Teusaquillo", "Galerías"];
  } else if (minSt >= 63 && maxSt <= 85) {
    candidateBarrios = ["Chapinero Alto", "Rosales", "El Nogal", "La Cabrera", "Quinta Camacho", "El Lago"];
  } else if (minSt >= 85 && maxSt <= 106) {
    candidateBarrios = ["Chicó", "El Virrey", "Chicó Norte", "Chicó Reservado", "La Cabrera"];
  } else if (minSt >= 106 && maxSt <= 127) {
    candidateBarrios = ["Santa Bárbara Occidental", "Santa Bárbara Central", "Santa Bárbara Oriental", "La Calleja", "Unicentro", "San Patricio", "El Country"];
  } else if (minSt >= 127 && maxSt <= 153) {
    candidateBarrios = ["Cedritos", "Contador", "Belmira", "Lisboa", "Nueva Autopista"];
  } else if (minSt >= 153 && maxSt <= 175) {
    candidateBarrios = ["Toberín", "Mazurén", "Gilmar", "Colina Campestre", "Orquídeas"];
  } else if (minSt >= 175) {
    candidateBarrios = ["San José de Banderas", "Guaymaral", "San Antonio", "Torca"];
  } else {
    candidateBarrios = ["Santa Bárbara", "Cedritos", "Unicentro", "Chicó"];
  }

  return {
    resuelto: true,
    barrios: candidateBarrios,
    descripcion: `Cuadrante Calles ${minSt}-${maxSt} (Fallback Respaldo Matriz)`,
    confianza: "aproximada"
  };
}
