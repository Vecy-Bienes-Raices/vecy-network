/**
 * Geography and Text Normalization Module
 * Version: 3.0 — Cobertura nacional Colombia
 */
import { buscarLugarColombia } from './colombia-geography';
import { geocodeAddress } from './geocoding';
import { getDb } from '../db';
import { colombiaGeography } from '../../drizzle/schema';
import { sql } from 'drizzle-orm';
import { lookupBarriosByPerimeter } from './geo-lookup';
import { lookupVereda } from './veredas-lookup';

export const BARRIOS_LAS_SANTAS = [
  "Santa Bárbara",
  "Santa Bárbara Central",
  "Santa Bárbara Norte",
  "Santa Bárbara Oriental",
  "Santa Bárbara Occidental",
  "Santa Ana",
  "Santa Ana Central",
  "Santa Ana Oriental",
  "Santa Ana Occidental",
  "Santa Paula",
  "Santa Bibiana",
  ];

export const GENERIC_ZONES_SET = new Set([
  "bogota", "bogota d c", "bogota dc", "medellin", "cali", "barranquilla", 
  "colombia", "norte", "sur", "centro", "n/e", "na", "null", "undefined", ""
]);


export function isLasSantasZone(zoneStr: string | null | undefined): boolean {
  if (!zoneStr) return false;
  const zn = zoneStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return zn.includes("las santas") || zn.includes("todas las santas") || zn === "santas";
}

export function isBarrioInLasSantas(barrioStr: string | null | undefined): boolean {
  if (!barrioStr) return false;
  const bn = barrioStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return BARRIOS_LAS_SANTAS.some(b => bn.includes(b.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
}

export const DICCIONARIO_BOGOTA: Record<string, { localidad: string, barrios: string[] }> = {
  "usaquen": {
    localidad: "Usaquén",
    barrios: [
      "Cedritos", "Los Cedros", "Santa Bárbara", "Santa Bárbara Central", "Santa Bárbara Occidental", "Santa Bárbara Oriental",
      "Santa Bárbara Norte", "Las Santas", "Todas las Santas", "Santa Ana", "Santa Ana Central", "Santa Ana Oriental", "Santa Ana Occidental",
      "Santa Paula", "Santa Bibiana", "San Patricio", "Santa Teresa", "Chicó Navarra", "Navarra",
      "Usaquén", "Toberín", "Country Club", "La Uribe",
      "Verbenal", "Barrancas", "Horizontes", "La Cita", "Tibabita",
      "La Cerámica", "La Unión", "Los Arrayanes", "Bosque Medina",
      "La Calleja", "Calleja Baja", "Calleja Alta", "Bosque De Pinos",
      "Bella Suiza", "Colina Campestre", "Los Alcaparros", "La Carolina", "Mazurén",
      "San Antonio Norte", "Gratamira Mónica"
    ]
  },
  "chapinero": {
    localidad: "Chapinero",
    barrios: [
      "El Chicó", "Chicó Norte", "Chicó Norte II", "Chicó Norte III", "Chicó Reservado", "Chicó Reservado Norte",
      "El Nogal", "Club El Nogal", "El Lago", "El Retiro", "Rosales", "Los Rosales", "La Cabrera",
      "Chapinero Central", "Chapinero Alto", "Pardo Rubio", "Quinta Camacho", "El Castillo", "San Luis", "Juan XXIII",
      "El Refugio", "El Bosque", "Granada", "Porciúncula", "Lago Gaitán", "Espartillal", "La Salle", "Marly", "Rincón del Chicó", "Antiguo Country"
    ]
  },

  "suba": {
    localidad: "Suba",
    barrios: [
      // Suba tradicional
      "Niza", "Alhambra", "Floresta", "Lisboa", "Prado Veraniego", "Santa Cecilia",
      "La Campiña", "Suba Centro", "Tibabuyes", "Rincón", "La Gaitana",
      "Bilbao", "Casablanca", "El Rinconcito", "Britalia",
      // Norte de Suba / Macroproyectos y Clubes
      "Alejandría", "Carmel Club", "Cantalejo", "Sotavento", "San José de Bavaria", "Victoria Norte", "Britalia Norte",
      // Norte campestre / alto estrato
      "Guaymaral", "Lagos de Torca", "La Conejera", "Torca",
      "San Pedro de Torca", "El Pradío", "Suba Rural", "Hacienda San Simón",
      "Hacienda San Sebastián", "Club Los Lagartos", "Mirandela",
      "San José del Prado", "El Cerezo", "La Isabela",
      // Suba estrato alto - Niza / Gratamira
      "Gratamira", "Gratamira Mónica", "Bella Suiza", "Cerros de Suba",
      "Niza Suba", "Reservado de Niza", "El Country", "Pasadena"
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
  let n = String(texto).toLowerCase();
  
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

  // --- CAPA 0: Tabla de Equivalencias Aprendidas de Zona y DIVIPOLA Nacional (zone_aliases) v21.20 ---
  const knownAliasMap: Record<string, { barrioCanonico: string; city: string; localidad?: string; isMunicipio: boolean }> = {
    // Sabana Norte / Cundinamarca Suburbs (DIVIPOLA DANE)
    "san simon": { barrioCanonico: "San Simón", city: "Bogotá", localidad: "Guaymaral / Suba", isMunicipio: false },
    "guaymaral": { barrioCanonico: "Guaymaral", city: "Bogotá", localidad: "Guaymaral / Suba", isMunicipio: false },
    "hacienda fontanar": { barrioCanonico: "Hacienda Fontanar", city: "Chía", localidad: "Chía", isMunicipio: true },
    "hacienda forntanar": { barrioCanonico: "Hacienda Fontanar", city: "Chía", localidad: "Chía", isMunicipio: true },
    "fontanar": { barrioCanonico: "Hacienda Fontanar", city: "Chía", localidad: "Chía", isMunicipio: true },
    "fagua": { barrioCanonico: "Fagua", city: "Chía", localidad: "Chía", isMunicipio: true },
    "potosi": { barrioCanonico: "Potosí", city: "Sopó", localidad: "Sopó", isMunicipio: true },
    "sindamanoy": { barrioCanonico: "Sindamanoy", city: "Chía", localidad: "Chía", isMunicipio: true },
    "yerbabuena": { barrioCanonico: "Yerbabuena", city: "Chía", localidad: "Chía", isMunicipio: true },
    "yerbabona": { barrioCanonico: "Yerbabuena", city: "Chía", localidad: "Chía", isMunicipio: true },
    "briceno": { barrioCanonico: "Briceño", city: "Sopó", localidad: "Sopó", isMunicipio: true },
    "hatogrande": { barrioCanonico: "Hatogrande", city: "Sopó", localidad: "Sopó", isMunicipio: true },
    "chia": { barrioCanonico: "Chía", city: "Chía", localidad: "Chía", isMunicipio: true },
    "sopo": { barrioCanonico: "Sopó", city: "Sopó", localidad: "Sopó", isMunicipio: true },
    "cajica": { barrioCanonico: "Cajicá", city: "Cajicá", localidad: "Cajicá", isMunicipio: true },
    "cota": { barrioCanonico: "Cota", city: "Cota", localidad: "Cota", isMunicipio: true },
    "la calera": { barrioCanonico: "La Calera", city: "La Calera", localidad: "La Calera", isMunicipio: true },
    "zipaquira": { barrioCanonico: "Zipaquirá", city: "Zipaquirá", localidad: "Zipaquirá", isMunicipio: true },

    // Bogotá Urban Sectors
    "nueva autopista": { barrioCanonico: "Cedritos", city: "Bogotá", localidad: "Usaquén", isMunicipio: false },
    "marlboro": { barrioCanonico: "Chicó Norte", city: "Bogotá", localidad: "Usaquén", isMunicipio: false },
    "zona marlboro": { barrioCanonico: "Chicó Norte", city: "Bogotá", localidad: "Usaquén", isMunicipio: false },
    "buganvilia": { barrioCanonico: "Bella Suiza", city: "Bogotá", localidad: "Usaquén", isMunicipio: false },
    "recodo del country": { barrioCanonico: "El Country", city: "Bogotá", localidad: "Usaquén", isMunicipio: false },
    "multicentro": { barrioCanonico: "Santa Bárbara", city: "Bogotá", localidad: "Usaquén", isMunicipio: false },
    "bosques del marques": { barrioCanonico: "Bosques de Bella Suiza", city: "Bogotá", localidad: "Usaquén", isMunicipio: false },
    "santas": { barrioCanonico: "Santa Bárbara", city: "Bogotá", localidad: "Usaquén", isMunicipio: false },
    "prado veraniego": { barrioCanonico: "Prado Veraniego", city: "Bogotá", localidad: "Suba", isMunicipio: false }
  };

  const normZoneLower = normZone.toLowerCase().trim();
  if (knownAliasMap[normZoneLower]) {
    const alias = knownAliasMap[normZoneLower];
    console.log(`[Geocoding-Alias] DIVIPOLA Alias resuelto "${zona}" ➔ "${alias.barrioCanonico}" (${alias.city})`);
    return {
      isValid: true,
      barrioCanonico: alias.barrioCanonico,
      localidad: alias.localidad || alias.city,
      city: alias.city,
      isMunicipio: alias.isMunicipio
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

  // --- CAPA 0.5: Coincidencia Directa con Barrio Urbano Principal de Bogotá ---
  if ((!ciudad || normalizarTextoGeografico(ciudad) === "bogota") && MAPA_BARRIOS[normZone]) {
    const info = MAPA_BARRIOS[normZone];
    return {
      isValid: true,
      barrioCanonico: info.barrioCanonico,
      localidad: info.localidad,
      city: info.isMunicipio ? info.barrioCanonico : "Bogotá",
      isMunicipio: info.isMunicipio || false
    };
  }

  // --- CAPA 0.6: Resolución Oficial de Veredas Nacionales (IGAC 33.435 Veredas) ---
  const isExplicitVereda = /\bvereda\b/i.test(zona);
  const veredaMatch = lookupVereda(zona, ciudad);
  if (veredaMatch && (isExplicitVereda || (ciudad && normalizarTextoGeografico(ciudad) !== "bogota") || !MAPA_BARRIOS[normZone])) {
    const veredaTitle = veredaMatch.vereda.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    const mpioTitle = veredaMatch.municipio.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    console.log(`[Geocoding-Vereda] IGAC Vereda resuelta "${zona}" ➔ "Vereda ${veredaTitle}" (${mpioTitle}, ${veredaMatch.departamento})`);
    return {
      isValid: true,
      barrioCanonico: `Vereda ${veredaTitle}`,
      localidad: mpioTitle,
      city: mpioTitle,
      isMunicipio: true
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

  // 1. Detección de "Sur" y Extracción de Calles (minSt, maxSt, isSur)
  const isSur = norm.includes("sur");
  
  let minSt: number | undefined;
  let maxSt: number | undefined;

  // Reconocimiento de Avenidas Hito para Calles
  if (norm.includes("avenida el dorado") || norm.includes("av el dorado") || norm.includes("av. el dorado")) {
    minSt = 26;
  }
  if (norm.includes("primero de mayo") || norm.includes("1 de mayo")) {
    minSt = 22; // Calle 22 Sur
  }

  let calleMatch = norm.match(/(?:calle|cll|cl|c|entre\s+la|de\s+la|desde\s+la)?\s*(\d+)\s*(?:sur)?\s*(?:y|a|a\s+la|-|hasta|\s+y\s+la|\s+a\s+la|\s+a\s+|\s+y\s+)\s*(?:la\s*)?(?:calle|cll|cl|c)?\s*(\d+)\s*(?:sur)?/i)
    || norm.match(/entre\s+(?:la\s*)?(\d+)\s+(?:y|a|hasta)\s+(?:la\s*)?(\d+)/i);

  const singleCalleMatch = norm.match(/(?:calle|cll|cl|c)\s*(\d+)/i);
  const relativeNorthMatch = norm.match(/(?:calle|cll|cl|c)\s*(\d+)\s*(?:hacia\s+arriba|para\s+arriba|al\s+norte|hacia\s+el\s+norte)/i);

  if (calleMatch) {
    const c1 = parseInt(calleMatch[1]);
    const c2 = parseInt(calleMatch[2]);
    minSt = minSt !== undefined ? Math.min(minSt, c1, c2) : Math.min(c1, c2);
    maxSt = maxSt !== undefined ? Math.max(maxSt, c1, c2) : Math.max(c1, c2);
  } else if (relativeNorthMatch) {
    minSt = parseInt(relativeNorthMatch[1]);
    maxSt = Math.min(minSt + 50, 240);
  } else if (singleCalleMatch && minSt !== undefined) {
    const c1 = parseInt(singleCalleMatch[1]);
    maxSt = Math.max(minSt, c1);
    minSt = Math.min(minSt, c1);
  } else {
    return { resuelto: false, barrios: [], descripcion: "No es un cuadrante vial resoluble por rango de calles", confianza: "ninguna" };
  }

  // 2. Extraer Carreras / Avenidas / Longitudes (minLon, maxLon)
  const LON_CERROS    = -74.0150;
  const LON_OCCIDENTE = -74.1900;
  const LON_AUTOPISTA = -74.0535;
  const LON_SEPTIMA   = -74.0350;
  const LON_CARACAS   = -74.0800;
  const LON_CRA10     = -74.0740;
  const LON_AV68      = -74.1100;
  const LON_BOYACA    = -74.1250;
  const LON_CALI      = -74.1450;

  const getLonFromCra = (craNum: number): number => {
    if (craNum <= 7) return LON_SEPTIMA;
    if (craNum >= 45 && !isSur) return LON_AUTOPISTA;
    return -74.0650 - (craNum * 0.00085);
  };

  let minLon = LON_OCCIDENTE;
  let maxLon = LON_CERROS;

  const isArribaAuto = norm.includes("arriba de la autopista") || norm.includes("arriba de la auto") || norm.includes("oriente de la autopista");
  const isAbajoAuto = norm.includes("abajo de la autopista") || norm.includes("abajo de la auto") || norm.includes("occidente de la autopista");
  const isArriba7 = norm.includes("arriba de la 7") || norm.includes("arriba de la septima") || norm.includes("arriba de la séptima");
  const isArribaBoyaca = norm.includes("arriba de la boyaca") || norm.includes("arriba de la boyacá");
  const isAbajoBoyaca = norm.includes("abajo de la boyaca") || norm.includes("abajo de la boyacá") || norm.includes("boyaca hacia abajo") || norm.includes("boyaca al occidente");

  // Detección de Hitos de Carreras/Avenidas
  let landmarkLons: number[] = [];
  if (norm.includes("avenida caracas") || norm.includes("av caracas") || norm.includes("caracas")) landmarkLons.push(LON_CARACAS);
  if (norm.includes("carrera 10") || norm.includes("cra 10") || norm.includes("cr 10") || norm.includes("carreras 10")) landmarkLons.push(LON_CRA10);
  if (norm.includes("avenida 68") || norm.includes("av 68")) landmarkLons.push(LON_AV68);
  if (norm.includes("boyaca") || norm.includes("boyacá")) landmarkLons.push(LON_BOYACA);
  if (norm.includes("ciudad de cali") || norm.includes("av cali")) landmarkLons.push(LON_CALI);

  const craMatch = norm.match(/(?:carrera|cra|cr|k|kr|carreras|cras|krs)\s*(\d+)\s*(?:y|a|a\s+la|-|hasta|\s+y\s+la|\s+a\s+|\s+y\s+)\s*(?:carrera|cra|cr|k|kr|carreras|cras|krs)?\s*(\d+)/i)
    || norm.match(/(?:con\s+)?carreras?\s*(\d+)\s*(?:a|y|-)\s*(\d+)/i)
    || norm.match(/entre\s+(?:la\s*)?(?:autopista|auto)\s+y\s+(?:la\s*)?(?:carrera|cra|cr|k|kr)?\s*(\d+)/i)
    || norm.match(/entre\s+(?:la\s*)?(?:carrera|cra|cr|k|kr)?\s*(\d+)\s+y\s+(?:la\s*)?(?:autopista|auto)/i);

  if (craMatch) {
    let cra1: number, cra2: number;
    if (norm.includes("autopista") || norm.includes("auto")) {
      cra1 = 45;
      cra2 = parseInt(craMatch[1]);
    } else {
      cra1 = parseInt(craMatch[1]);
      cra2 = parseInt(craMatch[2]);
    }
    landmarkLons.push(getLonFromCra(cra1), getLonFromCra(cra2));
  }

  if (landmarkLons.length >= 2) {
    minLon = Math.min(...landmarkLons) - 0.003;
    maxLon = Math.max(...landmarkLons) + 0.003;
  } else if (landmarkLons.length === 1 && isAbajoBoyaca) {
    minLon = LON_OCCIDENTE;
    maxLon = landmarkLons[0] + 0.002;
  } else if (landmarkLons.length === 1 && isArribaBoyaca) {
    minLon = landmarkLons[0] - 0.002;
    maxLon = LON_CERROS;
  } else if (isArribaAuto) {
    minLon = LON_AUTOPISTA;
    maxLon = LON_CERROS;
  } else if (isAbajoAuto) {
    minLon = LON_OCCIDENTE;
    maxLon = LON_AUTOPISTA;
  } else if (isArriba7) {
    minLon = LON_SEPTIMA;
    maxLon = LON_CERROS;
  } else if (isArribaBoyaca) {
    minLon = LON_BOYACA;
    maxLon = LON_CERROS;
  } else if (isAbajoBoyaca) {
    minLon = LON_OCCIDENTE;
    maxLon = LON_BOYACA;
  }

  // 3. Consulta de Intersección Geométrica Espacial PostGIS sobre barrios_bogota_geojson en Supabase
  try {
    const db = await getDb();
    if (db) {
      let minLat: number, maxLat: number;
      if (isSur) {
        minLat = 4.597 - (maxSt * 0.00094);
        maxLat = 4.597 - (minSt * 0.00094);
      } else {
        minLat = 4.597 + (minSt * 0.00094);
        maxLat = 4.597 + (maxSt * 0.00094);
      }

      const spatialQuery = sql`
        SELECT DISTINCT scanombre
        FROM barrios_bogota_geojson
        WHERE ST_Intersects(geometry, ST_MakeEnvelope(${minLon}, ${minLat}, ${maxLon}, ${maxLat}, 4326))
        ORDER BY scanombre;
      `;

      const rows: any = await db.execute(spatialQuery);

      if (rows && rows.length > 0) {
        const barrios = rows.map((r: any) => String(r.scanombre).trim());
        console.log(`[Geocoding-Cuadrante] Intersección espacial IDECA (${barrios.length} sectores catastrales) resuelto [alta_geometria_ideca] ➔ "${barrios.slice(0, 10).join(', ')}${barrios.length > 10 ? '...' : ''}"`);
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

  // 3.5 RESOLUCIÓN DETERMINÍSTICA LOCAL IDECA (1,230 Sectores Catastrales Oficiales Bogotá)
  try {
    let craMinNum = 1;
    let craMaxNum = 30;
    if (craMatch) {
      const k1 = parseInt(craMatch[1]);
      const k2 = parseInt(craMatch[2]);
      if (!isNaN(k1) && !isNaN(k2)) {
        craMinNum = Math.min(k1, k2);
        craMaxNum = Math.max(k1, k2);
      }
    } else if (isArribaAuto) {
      craMinNum = 1;
      craMaxNum = 45;
    } else if (isAbajoAuto) {
      craMinNum = 45;
      craMaxNum = 120;
    } else if (isArriba7) {
      craMinNum = 1;
      craMaxNum = 7;
    }

    const idecaResult = lookupBarriosByPerimeter({
      calleNorte: maxSt,
      calleSur: minSt,
      craOriente: craMinNum,
      craOccidente: craMaxNum,
      ciudad: "bogota"
    });

    if (idecaResult.barrios && idecaResult.barrios.length > 0) {
      console.log(`[Geocoding-Cuadrante] Intersección local IDECA (${idecaResult.barrios.length} sectores catastrales) resuelto ➔ "${idecaResult.barrios.slice(0, 10).join(', ')}"`);
      return {
        resuelto: true,
        barrios: idecaResult.barrios,
        descripcion: `Intersección local IDECA (${idecaResult.barrios.length} sectores catastrales)`,
        confianza: "alta_geometria_ideca_local"
      };
    }
  } catch (idecaErr: any) {
    console.warn("[Geocoding-Cuadrante-IDECA] Error en motor local IDECA:", idecaErr?.message || idecaErr);
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
    candidateBarrios = ["Rincón del Chicó", "Chicó", "Chicó Norte", "Chicó Reservado", "La Cabrera", "Antiguo Country"];
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

export interface DeduccionGeograficaResult {
  neighborhood: string | null;   // Barrio / Vereda / Caserío (null si no se resolvió)
  locality: string | null;       // Localidad / Comuna (null si no se resolvió)
  city: string;                  // Ciudad / Municipio
  department: string;            // Departamento
  confidence: string;
}


/**
/**
 * Deduce la geografía tripartita (Barrio/Vereda, Localidad/Comuna, Ciudad/Municipio)
 * utilizando reglas contextuales del texto y diccionarios DANE/IDECA.
 * 
 * REGLA DE ORO DOCTRINAL:
 * El nombre del grupo de WhatsApp (groupName) NUNCA debe contaminar ni inventar
 * el barrio del predio. La verdad predial reside exclusivamente en el texto y datos extraídos.
 */
export function deducirGeografiaTripartita(
  inputZone: string | null | undefined,
  inputCity: string | null | undefined,
  groupName: string | null | undefined,
  rawText: string | null | undefined
): DeduccionGeograficaResult {
  const normZone = inputZone ? normalizarTextoGeografico(inputZone) : "";
  const normCity = inputCity ? normalizarTextoGeografico(inputCity) : "";
  const normGroup = groupName ? normalizarTextoGeografico(groupName) : "";
  const normText = rawText ? normalizarTextoGeografico(rawText) : "";
  
  // Texto exclusivo del predio (Sin contaminación del grupo)
  const textCombined = `${normZone} ${normCity} ${normText}`;

  // 1. REGLA CESAR / VALLEDUPAR
  const cesarKeywords = ["cesar", "valledupar", "aguachica", "bosconia", "codazzi", "la paz cesar"];
  if (cesarKeywords.some(k => textCombined.includes(k))) {
    let neighborhood = (inputZone && inputZone.trim() !== "" && !cesarKeywords.includes(normZone)) ? inputZone.trim() : "Valledupar";
    if (textCombined.includes("lisboa")) neighborhood = "Lisboa";
    else if (textCombined.includes("novalito")) neighborhood = "Novalito";
    else if (textCombined.includes("los cortijos")) neighborhood = "Los Cortijos";
    return {
      neighborhood,
      locality: "Valledupar",
      city: "Valledupar",
      department: "Cesar",
      confidence: "alta_deduccion_cesar"
    };
  }

  // 2. REGLA SANTANDER / BUCARAMANGA Y ÁREA METROPOLITANA
  const santanderKeywords = [
    "bucaramanga", "floridablanca", "giron", "piedecuesta", "san gil", "barrancabermeja",
    "santander", "ruitoque", "cabecera del llano", "cabecera", "canaveral", "cañaveral", "sotomayor"
  ];
  if (santanderKeywords.some(k => textCombined.includes(k))) {
    let city = "Bucaramanga";
    if (textCombined.includes("floridablanca") || textCombined.includes("canaveral") || textCombined.includes("cañaveral") || textCombined.includes("ruitoque")) city = "Floridablanca";
    else if (textCombined.includes("piedecuesta")) city = "Piedecuesta";
    else if (textCombined.includes("giron") || textCombined.includes("girón")) city = "Girón";
    else if (textCombined.includes("barrancabermeja")) city = "Barrancabermeja";
    else if (textCombined.includes("san gil")) city = "San Gil";

    let neighborhood = city;
    if (textCombined.includes("cabecera")) neighborhood = "Cabecera del Llano";
    else if (textCombined.includes("ruitoque")) neighborhood = "Ruitoque Condominio";
    else if (textCombined.includes("canaveral") || textCombined.includes("cañaveral")) neighborhood = "Cañaveral";
    else if (textCombined.includes("sotomayor")) neighborhood = "Sotomayor";
    else if (inputZone && inputZone.trim() !== "" && inputZone.toLowerCase() !== "na") neighborhood = inputZone.trim();

    return {
      neighborhood,
      locality: "Área Metropolitana Bucaramanga",
      city,
      department: "Santander",
      confidence: "alta_deduccion_santander"
    };
  }

  // 3. REGLA BOLÍVAR / CARTAGENA
  const cartagenaKeywords = [
    "cartagena", "bocagrande", "castillogrande", "manga", "crespo", "laguito", "el laguito",
    "serena del mar", "morros", "los morros", "pie de la popa", "getsemani", "centro historico cartagena"
  ];
  if (cartagenaKeywords.some(k => textCombined.includes(k))) {
    let neighborhood = "Cartagena";
    if (textCombined.includes("bocagrande")) neighborhood = "Bocagrande";
    else if (textCombined.includes("castillogrande")) neighborhood = "Castillogrande";
    else if (textCombined.includes("manga")) neighborhood = "Manga";
    else if (textCombined.includes("crespo")) neighborhood = "Crespo";
    else if (textCombined.includes("laguito")) neighborhood = "El Laguito";
    else if (textCombined.includes("serena del mar")) neighborhood = "Serena del Mar";
    else if (inputZone && inputZone.trim() !== "" && inputZone.toLowerCase() !== "na") neighborhood = inputZone.trim();

    return {
      neighborhood,
      locality: "Cartagena",
      city: "Cartagena",
      department: "Bolívar",
      confidence: "alta_deduccion_cartagena"
    };
  }

  // 4. REGLA MAGDALENA / SANTA MARTA
  const santaMartaKeywords = [
    "santa marta", "rodadero", "el rodadero", "bello horizonte", "pozos colorados",
    "taganga", "playa dormida", "magdalena"
  ];
  if (santaMartaKeywords.some(k => textCombined.includes(k))) {
    let neighborhood = "Santa Marta";
    if (textCombined.includes("rodadero")) neighborhood = "El Rodadero";
    else if (textCombined.includes("bello horizonte")) neighborhood = "Bello Horizonte";
    else if (textCombined.includes("pozos colorados")) neighborhood = "Pozos Colorados";
    else if (inputZone && inputZone.trim() !== "" && inputZone.toLowerCase() !== "na") neighborhood = inputZone.trim();

    return {
      neighborhood,
      locality: "Santa Marta",
      city: "Santa Marta",
      department: "Magdalena",
      confidence: "alta_deduccion_santamarta"
    };
  }

  // 5. REGLA RISARALDA / PEREIRA Y EJE CAFETERO
  const pereiraKeywords = ["pereira", "dosquebradas", "cerritos", "pinares", "alpes pereira", "circasia", "risaralda"];
  if (pereiraKeywords.some(k => textCombined.includes(k))) {
    let city = textCombined.includes("dosquebradas") ? "Dosquebradas" : "Pereira";
    let neighborhood = city;
    if (textCombined.includes("cerritos")) neighborhood = "Cerritos";
    else if (textCombined.includes("pinares")) neighborhood = "Pinares";
    else if (inputZone && inputZone.trim() !== "" && inputZone.toLowerCase() !== "na") neighborhood = inputZone.trim();

    return {
      neighborhood,
      locality: "Área Metropolitana Centro Occidente",
      city,
      department: "Risaralda",
      confidence: "alta_deduccion_pereira"
    };
  }

  // 6. REGLA CALDAS / MANIZALES
  const manizalesKeywords = ["manizales", "villamaria", "palermo manizales", "cable manizales", "caldas"];
  if (manizalesKeywords.some(k => textCombined.includes(k))) {
    return {
      neighborhood: inputZone?.trim() || "Manizales",
      locality: "Manizales",
      city: textCombined.includes("villamaria") ? "Villamaría" : "Manizales",
      department: "Caldas",
      confidence: "alta_deduccion_manizales"
    };
  }

  // 7. REGLA QUINDÍO / ARMENIA
  const armeniaKeywords = ["armenia", "calarca", "quimbaya", "montenegro", "quindio"];
  if (armeniaKeywords.some(k => textCombined.includes(k))) {
    return {
      neighborhood: inputZone?.trim() || "Armenia",
      locality: "Armenia",
      city: textCombined.includes("calarca") ? "Calarcá" : textCombined.includes("quimbaya") ? "Quimbaya" : "Armenia",
      department: "Quindío",
      confidence: "alta_deduccion_armenia"
    };
  }

  // 8. REGLA TOLIMA / IBAGUÉ
  const tolimaKeywords = ["ibague", "espinal", "melgar", "carmen de apicala", "flandes", "tolima"];
  if (tolimaKeywords.some(k => textCombined.includes(k))) {
    let city = "Ibagué";
    if (textCombined.includes("melgar")) city = "Melgar";
    else if (textCombined.includes("carmen de apicala")) city = "Carmen de Apicalá";
    else if (textCombined.includes("espinal")) city = "El Espinal";

    return {
      neighborhood: inputZone?.trim() || city,
      locality: city,
      city,
      department: "Tolima",
      confidence: "alta_deduccion_tolima"
    };
  }

  // 9. REGLA META / VILLAVICENCIO
  const metaKeywords = ["villavicencio", "acacias", "restrepo meta", "cumaral", "meta"];
  if (metaKeywords.some(k => textCombined.includes(k))) {
    return {
      neighborhood: inputZone?.trim() || "Villavicencio",
      locality: "Villavicencio",
      city: textCombined.includes("acacias") ? "Acacías" : "Villavicencio",
      department: "Meta",
      confidence: "alta_deduccion_meta"
    };
  }

  // 10. REGLA CALI Y VALLE DEL CAUCA
  const caliSectors = [
    "alamos", "brisas de los alamos", "menga", "chipichape", "la flora", "santa monica",
    "ciudad jardin", "valle del lili", "san fernando", "granada", "el penon", "juanambu",
    "pance", "bochalema", "caney", "el caney", "tequendama", "normandie", "imbanaco", "cali",
    "jamundi", "yumbo", "palmira", "valle del cauca"
  ];
  const isCali = normCity === "cali" || (normCity === "" && normGroup.includes("cali") && !textCombined.includes("bogota")) || caliSectors.some(s => textCombined.includes(s));

  if (isCali) {
    let neighborhood = "Cali";
    let locality = "Cali Urbano";
    let city = "Cali";
    if (textCombined.includes("jamundi") || textCombined.includes("jamundí")) {
      neighborhood = "Jamundí";
      locality = "Jamundí";
      city = "Jamundí";
    } else if (textCombined.includes("alamos") || textCombined.includes("brisas de los alamos")) {
      neighborhood = "Brisas de los Álamos";
      locality = "Comuna 2 (Norte)";
    } else if (textCombined.includes("menga") || textCombined.includes("chipichape") || textCombined.includes("la flora")) {
      neighborhood = textCombined.includes("menga") ? "Menga" : textCombined.includes("chipichape") ? "Chipichape" : "La Flora";
      locality = "Comuna 2 (Norte)";
    } else if (textCombined.includes("ciudad jardin")) {
      neighborhood = "Ciudad Jardín";
      locality = "Comuna 22 (Sur)";
    } else if (textCombined.includes("valle del lili") || textCombined.includes("lili")) {
      neighborhood = "Valle del Lili";
      locality = "Comuna 17 (Sur)";
    } else if (textCombined.includes("san fernando") || textCombined.includes("tequendama") || textCombined.includes("imbanaco")) {
      neighborhood = "San Fernando";
      locality = "Comuna 19";
    } else if (textCombined.includes("granada") || textCombined.includes("penon") || textCombined.includes("juanambu")) {
      neighborhood = textCombined.includes("granada") ? "Granada" : textCombined.includes("juanambu") ? "Juanambú" : "El Peñón";
      locality = "Comuna 3 (Oeste)";
    } else if (inputZone && inputZone.trim() !== "" && inputZone.toLowerCase() !== "na") {
      neighborhood = inputZone.trim();
    }
    return {
      neighborhood,
      locality,
      city,
      department: "Valle del Cauca",
      confidence: "alta_deduccion_cali"
    };
  }

  // 11. REGLA MEDELLÍN Y ÁREA METROPOLITANA
  const medellinSectors = [
    "poblado", "el poblado", "laureles", "estadio", "belen", "envigado", "sabaneta", "itagui",
    "rionegro", "la ceja", "el retiro", "la estrella", "copacabana", "girardota", "medellin", "antioquia"
  ];
  const isMedellin = normCity === "medellin" || (normCity === "" && normGroup.includes("medellin") && !textCombined.includes("bogota")) || medellinSectors.some(s => textCombined.includes(s));

  if (isMedellin) {
    let neighborhood = "Medellín";
    let locality = "Valle de Aburrá";
    let city = "Medellín";
    if (textCombined.includes("poblado")) {
      neighborhood = "El Poblado";
      locality = "Comuna 14 (El Poblado)";
    } else if (textCombined.includes("laureles") || textCombined.includes("estadio")) {
      neighborhood = "Laureles";
      locality = "Comuna 11 (Laureles-Estadio)";
    } else if (textCombined.includes("belen")) {
      neighborhood = "Belén";
      locality = "Comuna 16 (Belén)";
    } else if (textCombined.includes("envigado")) {
      neighborhood = "Envigado";
      locality = "Envigado";
      city = "Envigado";
    } else if (textCombined.includes("sabaneta")) {
      neighborhood = "Sabaneta";
      locality = "Sabaneta";
      city = "Sabaneta";
    } else if (textCombined.includes("rionegro")) {
      neighborhood = "Rionegro";
      locality = "Rionegro";
      city = "Rionegro";
    } else if (textCombined.includes("la ceja")) {
      neighborhood = "La Ceja";
      locality = "Oriente Antioqueño";
      city = "La Ceja";
    } else if (inputZone && inputZone.trim() !== "" && inputZone.toLowerCase() !== "na") {
      neighborhood = inputZone.trim();
    }
    return {
      neighborhood,
      locality,
      city,
      department: "Antioquia",
      confidence: "alta_deduccion_medellin"
    };
  }

  // 12. REGLA SABANA DE BOGOTÁ Y CUNDINAMARCA
  const sabanaSectors: Record<string, string> = {
    "chia": "Chía", "cajica": "Cajicá", "sopo": "Sopó", "cota": "Cota",
    "la calera": "La Calera", "zipaquira": "Zipaquirá", "funza": "Funza",
    "mosquera": "Mosquera", "madrid": "Madrid", "facatativa": "Facatativá",
    "fusagasuga": "Fusagasugá", "girardot": "Girardot", "anapoima": "Anapoima",
    "la mesa": "La Mesa", "villeta": "Villeta", "subachoque": "Subachoque",
    "tabio": "Tabio", "tenjo": "Tenjo", "tocancipa": "Tocancipá"
  };
  for (const [sKey, sName] of Object.entries(sabanaSectors)) {
    if (textCombined.includes(sKey)) {
      return {
        neighborhood: sName,
        locality: sName,
        city: sName,
        department: "Cundinamarca",
        confidence: "alta_deduccion_sabana"
      };
    }
  }

  // ── 13. EMPAREJAMIENTO JERÁRQUICO BOGOTÁ D.C. ──
  const isGenericZone = !inputZone ||
    inputZone.trim() === "" ||
    normalizarTextoGeografico(inputZone).trim() === "na" ||
    normalizarTextoGeografico(inputZone).includes("bogota") ||
    normalizarTextoGeografico(inputZone).includes("bogotá");

  let neighborhood: string | null = isGenericZone ? null : (inputZone?.trim() || null);
  let locality: string | null = null;
  let foundBarrio = false;

  // Limpieza de frases de proximidad publicitaria para no confundir puntos de referencia con el barrio predial
  const cleanSearchText = normText
    .replace(/\b(?:a\s+minutos\s+de|a\s+pocos\s+minutos\s+de|cerca\s+de|cerca\s+a|proximo\s+a|frente\s+a|diagonal\s+a|al\s+lado\s+de|hacia)\s+[^,\.\n]+/gi, " ")
    .replace(/\bhacienda\s+santa\s+barbara\b/gi, "centro_comercial")
    .replace(/\bcentro\s+andino\b/gi, "centro_comercial")
    .replace(/\bunilago\b/gi, "centro_comercial")
    .replace(/\bunicentro\b/gi, "centro_comercial")
    .replace(/\bparque\s+(?:del\s+|el\s+)?virrey\b/gi, "parque")
    .replace(/\bparque\s+93\b/gi, "parque")
    .replace(/\bparque\s+de\s+la\s+93\b/gi, "parque");

  // NOTA MANDATORIA: cleanSearchCombined SOLO usa el texto del predio, NUNCA normGroup
  const cleanSearchCombined = `${normZone} ${cleanSearchText}`;

  // Alias y complejos residenciales conocidos de Bogotá
  const COMPLEX_ALIASES: Record<string, { neighborhood: string; locality: string }> = {
    "alejandria": { neighborhood: "Alejandría", locality: "Suba" },
    "carmel club": { neighborhood: "Carmel Club", locality: "Suba" },
    "cantalejo": { neighborhood: "Cantalejo", locality: "Suba" },
    "sotavento": { neighborhood: "Sotavento", locality: "Suba" },
    "san jose de bavaria": { neighborhood: "San José de Bavaria", locality: "Suba" },
    "victoria norte": { neighborhood: "Victoria Norte", locality: "Suba" },
    "britalia norte": { neighborhood: "Britalia Norte", locality: "Suba" },
    "balcones de medina": { neighborhood: "Bosque Medina", locality: "Usaquén" },
    "bosque medina": { neighborhood: "Bosque Medina", locality: "Usaquén" },
    "chico navarra": { neighborhood: "Chicó Navarra", locality: "Usaquén" },
    "navarra": { neighborhood: "Chicó Navarra", locality: "Usaquén" },
    "chico norte": { neighborhood: "Chicó Norte", locality: "Chapinero" },
    "chico reservado": { neighborhood: "Chicó Reservado", locality: "Chapinero" },
    "rincon del chico": { neighborhood: "Rincón del Chicó", locality: "Chapinero" },
    "los rosales": { neighborhood: "Rosales", locality: "Chapinero" },
    "la cabrera": { neighborhood: "La Cabrera", locality: "Chapinero" },
    "el nogal": { neighborhood: "El Nogal", locality: "Chapinero" },
    "santa ana oriental": { neighborhood: "Santa Ana Oriental", locality: "Usaquén" },
    "santa barbara central": { neighborhood: "Santa Bárbara Central", locality: "Usaquén" },
    "santa barbara (central)": { neighborhood: "Santa Bárbara Central", locality: "Usaquén" },
    "santa barbara occidental": { neighborhood: "Santa Bárbara Occidental", locality: "Usaquén" },
    "santa barbara oriental": { neighborhood: "Santa Bárbara Oriental", locality: "Usaquén" },
    "santa barbara alta": { neighborhood: "Santa Bárbara Alta", locality: "Usaquén" },
    "niza norte": { neighborhood: "Niza Norte", locality: "Suba" },
    "niza antigua": { neighborhood: "Niza", locality: "Suba" },
    "nuevo country": { neighborhood: "Nuevo Country", locality: "Usaquén" },
    "bella suiza": { neighborhood: "Bella Suiza", locality: "Usaquén" },
    "bella suiza baja": { neighborhood: "Bella Suiza", locality: "Usaquén" },
  };

  for (const [alias, data] of Object.entries(COMPLEX_ALIASES)) {
    if (cleanSearchCombined.includes(alias)) {
      neighborhood = data.neighborhood;
      locality = data.locality;
      foundBarrio = true;
      break;
    }
  }

  // Si no es alias compuesto, buscar en el diccionario de Bogotá ordenado por longitud descendente
  if (!foundBarrio) {
    const allBarriosWithLoc: Array<{ name: string; locality: string; norm: string }> = [];
    for (const [, info] of Object.entries(DICCIONARIO_BOGOTA)) {
      for (const b of info.barrios) {
        allBarriosWithLoc.push({
          name: b,
          locality: info.localidad,
          norm: normalizarTextoGeografico(b)
        });
      }
    }
    allBarriosWithLoc.sort((a, b) => b.norm.length - a.norm.length);

    // Prioridad 1: Coincidencia en inputZone
    if (!isGenericZone) {
      for (const item of allBarriosWithLoc) {
        if (item.norm === normZone || (normZone.includes(item.norm) && item.norm.length > 4)) {
          neighborhood = item.name;
          locality = item.locality;
          foundBarrio = true;
          break;
        }
      }
    }

    // Prioridad 2: Coincidencia en el texto del predio (cleanSearchCombined)
    if (!foundBarrio) {
      for (const item of allBarriosWithLoc) {
        if (cleanSearchCombined.includes(item.norm) && item.norm.length > 4) {
          neighborhood = item.name;
          locality = item.locality;
          foundBarrio = true;
          break;
        }
      }
    }
  }

  if (!foundBarrio) {
    neighborhood = isGenericZone ? null : (inputZone && !GENERIC_ZONES_SET.has(normalizarTextoGeografico(inputZone)) ? inputZone.trim() : null);
    locality = null;
  }

  return {
    neighborhood,
    locality,
    city: "Bogotá, D.C.",
    department: "Cundinamarca / D.C.",
    confidence: foundBarrio ? "alta_deduccion_bogota" : "pendiente_revision_ubicacion"
  };
}

/**
 * Extractor inteligente de intersecciones viales (Calles y Carreras) de Colombia
 * Identifica cruces como "83 con 5", "cll 127 con cra 7", "cra 15 con 93", "calle 100 # 19-20"
 */
export function extractIntersectionFromText(text: string | null | undefined): { calle: number; carrera: number } | null {
  if (!text) return null;
  const clean = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, " ");

  // 1. "cra 15 con 93", "carrera 7 con 83", "septima con 116", "7ma con 127", "kr 11 con 85"
  const pCra = clean.match(/(?:carrera|cra|cr|k|kr|septima|7ma)\s*(\d{1,3})?\s*(?:con|y|#|no\.?|x)\s*(?:calle|cll|c\b)?\s*(\d{1,3})(?:a|b|c|ta|da|ra|ma)?\b/i);
  if (pCra) {
    let cra = pCra[1] ? parseInt(pCra[1], 10) : (clean.includes("septima") || clean.includes("7ma") ? 7 : 0);
    const calle = parseInt(pCra[2], 10);
    if (cra > 0 && calle > 0 && calle <= 240 && cra <= 150) {
      return { calle, carrera: cra };
    }
  }

  // 2. "calle 83 con 5", "cll 83 con cra 5", "en la 83 con 5", "83 con 5ta", "calle 83 # 5-20"
  const pCll = clean.match(/(?:en\s+la|calle|cll|c\s*\.?\s*)?\s*(\d{1,3})(?:a|b|c)?\s*(?:con|#|no\.?|y|x)\s*(?:carrera|cra|cr|k|kr|septima|7ma)?\s*(\d{1,3})?(?:a|b|c|ta|da|ra|ma)?\b/i);
  if (pCll) {
    const num1 = parseInt(pCll[1], 10);
    let num2 = pCll[2] ? parseInt(pCll[2], 10) : (pCll[0].includes("septima") || pCll[0].includes("7ma") ? 7 : 0);
    if (num1 >= 1 && num1 <= 240 && num2 >= 1 && num2 <= 150) {
      return { calle: num1, carrera: num2 };
    }
  }

  return null;
}

/**
 * Resuelve una intersección o cruce vial hacia su Barrio Catastral exacto,
 * Localidad y Ciudad utilizando el polígono IDECA Catastro de Bogotá.
 */
export function resolveIntersectionToBarrio(text: string | null | undefined): {
  barrio: string;
  barriosAlternos: string[];
  localidad: string;
  ciudad: string;
} | null {
  const coords = extractIntersectionFromText(text);
  if (!coords) return null;

  const perimeter = {
    calleNorte: Math.min(240, coords.calle + 1),
    calleSur: Math.max(1, coords.calle - 1),
    craOriente: Math.max(1, coords.carrera - 1),
    craOccidente: Math.min(150, coords.carrera + 1),
    ciudad: 'bogota'
  };

  const lookup = lookupBarriosByPerimeter(perimeter);
  let locality = 'Chapinero';
  if (coords.calle >= 100 && coords.carrera <= 60) locality = 'Usaquén';
  else if (coords.calle >= 100 && coords.carrera > 60) locality = 'Suba';
  else if (coords.calle < 100 && coords.calle >= 39) locality = 'Chapinero';
  else if (coords.calle < 39 && coords.calle >= 1) locality = 'Santa Fe';

  const primaryBarrio = lookup.barrios[0] || `Calle ${coords.calle} con Cra ${coords.carrera}`;

  return {
    barrio: primaryBarrio,
    barriosAlternos: lookup.barrios,
    localidad: locality,
    ciudad: 'Bogotá, D.C.'
  };
}


