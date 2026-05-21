/**
 * Geography and Text Normalization Module
 * Version: 3.0 — Cobertura nacional Colombia
 */
import { buscarLugarColombia } from './colombia-geography';

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
      "Pardo Rubio", "Quinta Camacho", "El Castillo", "San Luis", "Juan XXIII"
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
      "La Patria", "Alcázares", "Siete de Agosto", "Lourdes"
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
      "Tintal Norte", "Zona Franca", "San Pablo", "El Refugio"
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
  
  // Quitar caracteres no alfanuméricos excepto espacios
  n = n.replace(/[^a-z0-9 ]/g, "");
  
  // Eliminar espacios dobles y trim
  n = n.replace(/\s+/g, " ").trim();
  
  // Expandir abreviaciones comunes
  n = n.replace(/\bsta\b/g, "santa");
  n = n.replace(/\bsto\b/g, "santo");
  n = n.replace(/\bapto\b/g, "apartamento");
  n = n.replace(/\bhab\b/g, "habitacion");
  n = n.replace(/\bhabs\b/g, "habitaciones");
  
  return n;
}

export type ValidacionZonaResult = {
  isValid: boolean;
  barrioCanonico?: string;
  localidad?: string;
  isMunicipio?: boolean;
  errorType?: "DATOS_INCOMPLETOS" | "AMBIGUO";
  message?: string;
};

/**
 * Valida si una zona ingresada corresponde a un barrio exacto,
 * maneja ambigüedades y sectores amplios.
 */
export function validarZona(zona: string): ValidacionZonaResult {
  const norm = normalizarTextoGeografico(zona);
  if (!norm) {
    return { isValid: false, errorType: "DATOS_INCOMPLETOS", message: "Pedir zona específica" };
  }

  // Verificar ambigüedades explícitas de la regla
  if (norm === "cedros") {
    return {
      isValid: false,
      errorType: "AMBIGUO",
      message: "¿Te refieres a Cedritos o a Los Cedros? Por favor aclara para registrarlo."
    };
  }

  if (norm === "chico") {
    return {
      isValid: false,
      errorType: "AMBIGUO",
      message: "¿Te refieres a El Chicó, Chicó Norte o Chicó Reservado? Por favor aclara."
    };
  }

  if (norm === "usaquen") {
    return {
      isValid: false,
      errorType: "AMBIGUO",
      message: "Usaquén es una localidad muy grande. ¿Qué barrio específico dentro de Usaquén buscas o vendes?"
    };
  }

  // Si coincide exactamente con un barrio/municipio registrado
  if (MAPA_BARRIOS[norm]) {
    const info = MAPA_BARRIOS[norm];
    return {
      isValid: true,
      barrioCanonico: info.barrioCanonico,
      localidad: info.localidad,
      isMunicipio: info.isMunicipio || false
    };
  }

  // Si es una localidad completa (sin especificar barrio)
  if (MAPA_LOCALIDADES[norm]) {
    return {
      isValid: false,
      errorType: "DATOS_INCOMPLETOS",
      message: `Mencionaste la localidad de *${MAPA_LOCALIDADES[norm]}*. Para hacer match necesito que me digas el barrio exacto.`
    };
  }

  // Si es un sector amplio o ciudad sola
  const sectoresAmplios = ["norte", "norte de bogota", "sur", "centro", "occidente", "salitre", "bogota", "sabana de bogota", "municipios cercanos"];
  if (sectoresAmplios.includes(norm)) {
    return {
      isValid: false,
      errorType: "DATOS_INCOMPLETOS",
      message: "Mencionaste una zona muy amplia. Por favor, dime el barrio exacto o municipio específico."
    };
  }

  // === PASO 3: Búsqueda en base de datos nacional de Colombia ===
  // Para zonas fuera de Bogotá: aceptar si se identifica cualquier ciudad, municipio o departamento colombiano
  const lugarColombia = buscarLugarColombia(zona);
  if (lugarColombia) {
    // Estandarización Canónica Nacional (v11.35)
    // Extraemos nombres oficiales, quitamos tildes y capitalizamos para simetría total en DB
    const cleanText = (txt: string) => txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    const formattedCity = cleanText(lugarColombia.nombreCanonico);
    const formattedDept = cleanText(lugarColombia.departamento);

    return {
      isValid: true,
      barrioCanonico: formattedCity,
      localidad: formattedDept,
      isMunicipio: true
    };
  }

  // === PASO 4: Zona completamente desconocida ===
  // No se encontró en Bogotá ni en ningún municipio colombiano
  return {
    isValid: false,
    errorType: "DATOS_INCOMPLETOS",
    message: "No logré identificar la ubicación. Por favor dime la ciudad, municipio o barrio exacto donde está el inmueble."
  };
}
