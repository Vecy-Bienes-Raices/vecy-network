/**
 * VECY NETWORK — CATÁLOGO GEOGRÁFICO NACIONAL Y TIPOLOGÍAS INMOBILIARIAS
 * Cobertura integral: 32 Departamentos + Bogotá D.C. (20 Localidades),
 * principales ciudades/municipios/comunas y clasificación adaptativa por tipo de inmueble.
 */

export interface ColombiaDepartmentCatalog {
  departamento: string;
  capital: string;
  municipios: string[];
}

export const COLOMBIA_DEPARTMENTS: ColombiaDepartmentCatalog[] = [
  {
    departamento: "Bogotá D.C.",
    capital: "Bogotá, D.C.",
    municipios: ["Bogotá, D.C."],
  },
  {
    departamento: "Antioquia",
    capital: "Medellín",
    municipios: [
      "Medellín", "Envigado", "Sabaneta", "Itagüí", "Bello", "La Estrella",
      "Copacabana", "Girardota", "Barbosa", "Caldas", "Rionegro", "La Ceja",
      "El Retiro", "Marinilla", "Guarne", "El Carmen de Viboral", "Guatapé",
      "Santa Fe de Antioquia", "Apartadó", "Turbo", "Sopetrán", "San Jerónimo",
    ],
  },
  {
    departamento: "Cundinamarca",
    capital: "Bogotá",
    municipios: [
      "Chía", "Cajicá", "Cota", "Sopó", "La Calera", "Tabio", "Tenjo",
      "Zipaquirá", "Tocancipá", "Gachancipá", "Funza", "Mosquera", "Madrid",
      "Facatativá", "Soacha", "Sibaté", "Fusagasugá", "Girardot", "Ricaurte",
      "Anapoima", "La Mesa", "Villeta", "Guaduas", "Subachoque", "Bojacá",
      "El Rosal", "Ubaté", "Guatavita", "Sesquilé", "Suesca", "Chocontá",
      "Silvania", "Nilo", "Chinauta", "Melgar (ver Tolima)",
    ].filter((m) => !m.includes("ver Tolima")),
  },
  {
    departamento: "Valle del Cauca",
    capital: "Cali",
    municipios: [
      "Cali", "Jamundí", "Yumbo", "Palmira", "Candelaria", "Buga", "Tuluá",
      "Cartago", "Buenaventura", "Dagua", "La Cumbre", "El Cerrito", "Restrepo",
      "Calima El Darién", "Zarzal", "Sevilla", "Caicedonia",
    ],
  },
  {
    departamento: "Atlántico",
    capital: "Barranquilla",
    municipios: [
      "Barranquilla", "Puerto Colombia", "Soledad", "Malambo", "Galapa",
      "Sabanalarga", "Baranoa", "Tubará", "Juan de Acosta", "Usiacurí",
    ],
  },
  {
    departamento: "Bolívar",
    capital: "Cartagena",
    municipios: [
      "Cartagena", "Turbaco", "Arjona", "Magangué", "Mompós",
      "El Carmen de Bolívar", "Santa Catalina", "Clemencia", "María La Baja",
    ],
  },
  {
    departamento: "Santander",
    capital: "Bucaramanga",
    municipios: [
      "Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Lebrija",
      "Barrancabermeja", "San Gil", "Barichara", "Socorro", "Mesa de los Santos",
      "Curití", "Rionegro", "Barbosa",
    ],
  },
  {
    departamento: "Risaralda",
    capital: "Pereira",
    municipios: [
      "Pereira", "Dosquebradas", "Santa Rosa de Cabal", "La Virginia",
      "Marsella", "Belén de Umbría", "Quinchía",
    ],
  },
  {
    departamento: "Caldas",
    capital: "Manizales",
    municipios: [
      "Manizales", "Villamaría", "Chinchiná", "La Dorada", "Palestina",
      "Neira", "Anserma", "Riosucio", "Supía",
    ],
  },
  {
    departamento: "Quindío",
    capital: "Armenia",
    municipios: [
      "Armenia", "Calarcá", "Montenegro", "Circasia", "La Tebaida",
      "Quimbaya", "Salento", "Filandia", "Buenavista",
    ],
  },
  {
    departamento: "Magdalena",
    capital: "Santa Marta",
    municipios: [
      "Santa Marta", "Ciénaga", "Fundación", "Plato", "El Banco", "Zona Bananera",
    ],
  },
  {
    departamento: "Tolima",
    capital: "Ibagué",
    municipios: [
      "Ibagué", "Melgar", "Carmen de Apicalá", "Flandes", "El Espinal",
      "Honda", "Mariquita", "Líbano", "Prado",
    ],
  },
  {
    departamento: "Meta",
    capital: "Villavicencio",
    municipios: [
      "Villavicencio", "Acacías", "Restrepo", "Cumaral", "Granada",
      "Puerto López", "Puerto Gaitán", "San Martín", "Guamal",
    ],
  },
  {
    departamento: "Norte de Santander",
    capital: "Cúcuta",
    municipios: ["Cúcuta", "Los Patios", "Villa del Rosario", "Ocaña", "Pamplona"],
  },
  {
    departamento: "Boyacá",
    capital: "Tunja",
    municipios: [
      "Tunja", "Duitama", "Sogamoso", "Paipa", "Villa de Leyva",
      "Chiquinquirá", "Nobsa", "Tibasosa", "Moniquirá", "Sutamarchán",
    ],
  },
  {
    departamento: "Huila",
    capital: "Neiva",
    municipios: ["Neiva", "Rivera", "Pitalito", "Garzón", "La Plata", "San Agustín", "Palermo"],
  },
  {
    departamento: "Cesar",
    capital: "Valledupar",
    municipios: ["Valledupar", "Aguachica", "Agustín Codazzi", "Bosconia", "La Paz"],
  },
  {
    departamento: "Córdoba",
    capital: "Montería",
    municipios: ["Montería", "Cereté", "Lorica", "Sahagún", "Montelíbano", "San Antero"],
  },
  {
    departamento: "Sucre",
    capital: "Sincelejo",
    municipios: ["Sincelejo", "Tolú", "Coveñas", "Corozal", "San Marcos"],
  },
  {
    departamento: "Nariño",
    capital: "Pasto",
    municipios: ["Pasto", "Ipiales", "Tumaco", "Chachagüí", "Túquerres"],
  },
  {
    departamento: "Cauca",
    capital: "Popayán",
    municipios: ["Popayán", "Santander de Quilichao", "Puerto Tejada", "Timbío", "Piendamó"],
  },
  {
    departamento: "Casanare",
    capital: "Yopal",
    municipios: ["Yopal", "Aguazul", "Villanueva", "Tauramena", "Paz de Ariporo"],
  },
  {
    departamento: "La Guajira",
    capital: "Riohacha",
    municipios: ["Riohacha", "Maicao", "Uribia", "Fonseca", "Dibulla", "Palomino"],
  },
  {
    departamento: "Caquetá",
    capital: "Florencia",
    municipios: ["Florencia", "San Vicente del Caguán", "Puerto Rico"],
  },
  {
    departamento: "Chocó",
    capital: "Quibdó",
    municipios: ["Quibdó", "Istmina", "Bahía Solano", "Nuquí", "Capurganá"],
  },
  {
    departamento: "Putumayo",
    capital: "Mocoa",
    municipios: ["Mocoa", "Puerto Asís", "Orito", "Sibundoy"],
  },
  {
    departamento: "Arauca",
    capital: "Arauca",
    municipios: ["Arauca", "Saravena", "Tame", "Arauquita"],
  },
  {
    departamento: "San Andrés y Providencia",
    capital: "San Andrés",
    municipios: ["San Andrés", "Providencia"],
  },
  {
    departamento: "Amazonas",
    capital: "Leticia",
    municipios: ["Leticia", "Puerto Nariño"],
  },
  {
    departamento: "Guaviare",
    capital: "San José del Guaviare",
    municipios: ["San José del Guaviare", "El Retorno"],
  },
  {
    departamento: "Guainía",
    capital: "Inírida",
    municipios: ["Inírida"],
  },
  {
    departamento: "Vaupés",
    capital: "Mitú",
    municipios: ["Mitú"],
  },
  {
    departamento: "Vichada",
    capital: "Puerto Carreño",
    municipios: ["Puerto Carreño", "La Primavera"],
  },
];

/**
 * Las 20 Localidades oficiales de Bogotá D.C. (Norte, Centro, Occidente, Sur y Rural)
 */
export const BOGOTA_LOCALITIES: string[] = [
  "Usaquén",
  "Chapinero",
  "Santa Fe",
  "San Cristóbal",
  "Usme",
  "Tunjuelito",
  "Bosa",
  "Kennedy",
  "Fontibón",
  "Engativá",
  "Suba",
  "Barrios Unidos",
  "Teusaquillo",
  "Los Mártires",
  "Antonio Nariño",
  "Puente Aranda",
  "La Candelaria",
  "Rafael Uribe Uribe",
  "Ciudad Bolívar",
  "Sumapaz",
];

/**
 * Localidades / Comunas sugeridas para las principales ciudades del país
 * (el usuario siempre puede escribir cualquier otra comuna, zona o vereda libremente).
 */
export const CITY_LOCALITIES_MAP: Record<string, string[]> = {
  "bogota": BOGOTA_LOCALITIES,
  "medellin": [
    "Comuna 14 (El Poblado)",
    "Comuna 11 (Laureles - Estadio)",
    "Comuna 16 (Belén)",
    "Comuna 12 (La América)",
    "Comuna 10 (La Candelaria - Centro)",
    "Comuna 15 (Guayabal)",
    "Comuna 7 (Robledo)",
    "Comuna 5 (Castilla)",
    "Comuna 4 (Aranjuez)",
    "Comuna 9 (Buenos Aires)",
    "Comuna 13 (San Javier)",
    "Corregimiento El Poblado / Las Palmas",
    "Corregimiento Santa Elena",
    "Corregimiento San Antonio de Prado",
  ],
  "cali": [
    "Sur (Comuna 17 / Comuna 22 - Pance / Ciudad Jardín / Valle del Lili)",
    "Oeste (Comuna 2 / Comuna 19 - El Peñón / Granada / Normandía / Santa Teresita)",
    "Norte (Comuna 2 - Menga / Chipichape / La Flora / Santa Mónica)",
    "Centro (Comuna 3 - San Antonio / Centenario / Versalles)",
    "Suroriente / Surcentro (Comuna 10 / 19 - El Limonar / Ingenio / San Fernando)",
    "Oriente (Aguablanca / Alfonso López)",
    "Corregimiento Pance / La Buitrera / Dapa",
  ],
  "barranquilla": [
    "Localidad Riomar (Alto Prado / Villa Santos / Buenavista / El Golf)",
    "Localidad Norte - Centro Histórico (El Prado / Recreo / Centro)",
    "Localidad Metropolitana",
    "Localidad Suroccidente",
    "Localidad Suroriente",
    "Corredor Universitario / Villa Campestre",
  ],
  "cartagena": [
    "Localidad Histórica y del Caribe Norte (Bocagrande / Castillogrande / Manga / Centro)",
    "Zona Norte (Serena del Mar / La Boquilla / Manzanillo)",
    "Localidad De la Virgen y Turística",
    "Localidad Industrial y de la Bahía (Mamonal / El Bosque)",
  ],
  "bucaramanga": [
    "Cabecera / Sotomayor (Comuna 12)",
    "Norte / Centro / García Rovira",
    "Comuna 13 (Oriental / Álvarez)",
    "Comuna 17 (Mutis / Real de Minas)",
    "Cañaveral / Lagos (Floridablanca)",
    "Ruitoque / Mensulí",
  ],
  "pereira": [
    "Cerritos / Galicia",
    "Álamos / Pinares / Circunvalar",
    "Centro / Cuba",
    "Dosquebradas / La Pradera",
    "Vía Armenia / Condina",
  ],
  "santa marta": [
    "El Rodadero / Gaira",
    "Bello Horizonte / Pozos Colorados",
    "Centro Histórico / El Prado",
    "Minca / Sierra Nevada",
  ],
};

function normGeoKey(val: string): string {
  return (val || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getSuggestedLocalitiesForCity(city: string | null | undefined): string[] {
  const n = normGeoKey(city || "");
  if (!n) return [];
  if (n.includes("bogota")) return CITY_LOCALITIES_MAP["bogota"];
  if (n.includes("medellin")) return CITY_LOCALITIES_MAP["medellin"];
  if (n.includes("cali")) return CITY_LOCALITIES_MAP["cali"];
  if (n.includes("barranquilla")) return CITY_LOCALITIES_MAP["barranquilla"];
  if (n.includes("cartagena")) return CITY_LOCALITIES_MAP["cartagena"];
  if (n.includes("bucaramanga")) return CITY_LOCALITIES_MAP["bucaramanga"];
  if (n.includes("pereira")) return CITY_LOCALITIES_MAP["pereira"];
  if (n.includes("santa marta")) return CITY_LOCALITIES_MAP["santa marta"];
  return [];
}

export function findDepartmentForCity(city: string | null | undefined): string {
  const n = normGeoKey(city || "");
  if (!n) return "";
  if (n.includes("bogota")) return "Bogotá D.C.";
  for (const dep of COLOMBIA_DEPARTMENTS) {
    if (normGeoKey(dep.capital) === n) return dep.departamento;
    if (dep.municipios.some((m) => normGeoKey(m) === n)) return dep.departamento;
  }
  return "";
}

/**
 * Genera el prefijo oficial de 3 letras de la ciudad para códigos de referencia (ej: ID-MED-POB01, ID-BOG-CHI12)
 */
export function getPropertyRefCityPrefix(city: string | null | undefined): string {
  const n = normGeoKey(city || "");
  if (!n) return "COL";
  if (n.includes("bogota")) return "BOG";
  if (n.includes("medellin")) return "MED";
  if (n.includes("cali")) return "CAL";
  if (n.includes("barranquilla")) return "BAQ";
  if (n.includes("cartagena")) return "CTG";
  if (n.includes("bucaramanga")) return "BGA";
  if (n.includes("pereira")) return "PEI";
  if (n.includes("manizales")) return "MZL";
  if (n.includes("armenia")) return "AXM";
  if (n.includes("santa marta")) return "SMR";
  if (n.includes("villavicencio")) return "VVC";
  if (n.includes("ibague")) return "IBE";
  if (n.includes("cucuta")) return "CUC";
  if (n.includes("valledupar")) return "VUP";
  if (n.includes("monteria")) return "MTR";
  if (n.includes("rionegro")) return "RNG";
  if (n.includes("envigado")) return "ENV";
  if (n.includes("chia")) return "CHI";
  if (n.includes("cajica")) return "CAJ";
  if (n.includes("soacha")) return "SOA";
  const cleanLetters = n.replace(/[^a-z]/g, "").toUpperCase();
  return cleanLetters.slice(0, 3) || "COL";
}

export type PropertyCategoryGroup =
  | "land"
  | "office_consultorio"
  | "commercial_warehouse"
  | "rural_farm"
  | "building_hotel"
  | "residential";

export function getPropertyCategoryGroup(propertyType: string | null | undefined): PropertyCategoryGroup {
  const t = normGeoKey(propertyType || "");
  if (t === "land" || t.includes("lote") || t.includes("terreno")) return "land";
  if (t === "office" || t === "consultorio" || t.includes("oficina") || t.includes("consultorio")) return "office_consultorio";
  if (t === "commercial" || t === "warehouse" || t.includes("local") || t.includes("bodega")) return "commercial_warehouse";
  if (t === "farm" || t.includes("finca")) return "rural_farm";
  if (t === "building" || t === "hotel" || t.includes("edificio") || t.includes("hotel") || t.includes("hostal")) return "building_hotel";
  return "residential";
}

// 19 Tipos exactos de inmuebles tanto en OFERTAS como en DEMANDAS (Doctrina Eduardo A. Rivera)
export const PROPERTY_TYPES_EXACT = [
  "Apartaestudio",
  "Apartamento",
  "Apartamento Dúplex",
  "Pent House",
  "Pent House Dúplex",
  "Bodega",
  "Cabaña",
  "Casa",
  "Casa Campestre",
  "Casa Quinta",
  "Edificio",
  "Finca",
  "Hostal",
  "Hotel",
  "Aparta Hotel",
  "Local",
  "Lote / Terreno",
  "Oficina",
  "Villa",
] as const;

