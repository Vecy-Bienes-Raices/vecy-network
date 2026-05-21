/**
 * Colombia Geographic Database — VECY Network
 * Cobertura: 32 departamentos, capitales, municipios principales y veredas conocidas
 */

export interface DepartamentoInfo {
  nombre: string;
  capital: string;
  municipios: string[];
}

export const DEPARTAMENTOS_COLOMBIA: Record<string, DepartamentoInfo> = {
  "antioquia": {
    nombre: "Antioquia",
    capital: "Medellín",
    municipios: [
      "Medellín", "Bello", "Itagüí", "Envigado", "Apartadó", "Turbo", "Rionegro",
      "Caucasia", "Sabaneta", "La Estrella", "Copacabana", "Girardota", "Barbosa",
      "Caldas", "Marinilla", "El Carmen de Viboral", "Guarne", "La Ceja", "Retiro",
      "Sonsón", "Andes", "Jericó", "Jardín", "Ciudad Bolívar", "Fredonia",
      "Yarumal", "Santa Rosa de Osos", "Segovia", "Zaragoza", "Puerto Berrío",
      "El Bagre", "Cáceres", "Tarazá", "Valdivia", "Anorí"
    ]
  },
  "atlantico": {
    nombre: "Atlántico",
    capital: "Barranquilla",
    municipios: [
      "Barranquilla", "Soledad", "Malambo", "Sabanalarga", "Baranoa",
      "Puerto Colombia", "Galapa", "Polonuevo", "Ponedera", "Santo Tomás",
      "Palmar de Varela", "Sabanagrande", "Usiacurí", "Juan de Acosta"
    ]
  },
  "bolivar": {
    nombre: "Bolívar",
    capital: "Cartagena",
    municipios: [
      "Cartagena", "Magangué", "Mompós", "El Carmen de Bolívar", "Turbaco",
      "Arjona", "San Juan Nepomuceno", "Marialabaja", "Villanueva", "Cicuco",
      "San Jacinto", "Zambrano", "Plato", "Calamar"
    ]
  },
  "boyaca": {
    nombre: "Boyacá",
    capital: "Tunja",
    municipios: [
      "Tunja", "Duitama", "Sogamoso", "Chiquinquirá", "Paipa", "Villa de Leyva",
      "Moniquirá", "Guateque", "Miraflores", "Soatá", "Socha", "Tibasosa",
      "Nobsa", "Santa Rosa de Viterbo", "Garagoa", "Ramiriquí", "Samacá",
      "Ventaquemada", "Jenesano", "Tuta", "Combita", "Motavita"
    ]
  },
  "caldas": {
    nombre: "Caldas",
    capital: "Manizales",
    municipios: [
      "Manizales", "La Dorada", "Riosucio", "Chinchiná", "Villamaría",
      "Palestina", "Anserma", "Viterbo", "Supía", "Neira", "Manzanares",
      "Marquetalia", "Samaná", "Pensilvania"
    ]
  },
  "caqueta": {
    nombre: "Caquetá",
    capital: "Florencia",
    municipios: [
      "Florencia", "San Vicente del Caguán", "Puerto Rico", "El Doncello",
      "Cartagena del Chairá", "Belén de los Andaquíes", "Albania", "Curillo",
      "Valparaíso", "La Montañita", "Morelia", "Milán", "Solano", "Solita"
    ]
  },
  "casanare": {
    nombre: "Casanare",
    capital: "Yopal",
    municipios: [
      "Yopal", "Aguazul", "Villanueva", "Tauramena", "Monterrey", "Paz de Ariporo",
      "Trinidad", "Orocué", "Hato Corozal", "Pore", "Maní", "Sabanalarga"
    ]
  },
  "cauca": {
    nombre: "Cauca",
    capital: "Popayán",
    municipios: [
      "Popayán", "Santander de Quilichao", "Puerto Tejada", "El Tambo",
      "Miranda", "Piendamó", "Cajibío", "Timbío", "Caloto", "Padilla",
      "Corinto", "Silvia", "Rosas", "La Sierra", "Bolívar", "La Vega"
    ]
  },
  "cesar": {
    nombre: "Cesar",
    capital: "Valledupar",
    municipios: [
      "Valledupar", "Aguachica", "Agustín Codazzi", "Becerril", "Bosconia",
      "Chimichagua", "El Copey", "El Paso", "La Jagua de Ibirico", "La Paz",
      "Manaure", "Pailitas", "Pelaya", "Rio de Oro", "San Diego", "Tamalameque"
    ]
  },
  "choco": {
    nombre: "Chocó",
    capital: "Quibdó",
    municipios: [
      "Quibdó", "Istmina", "Tadó", "Condoto", "Riosucio", "Bahía Solano",
      "Nuquí", "Bojayá", "Unguía", "Acandí", "Juradó", "Medio Baudó",
      "Nóvita", "Sipí"
    ]
  },
  "cordoba": {
    nombre: "Córdoba",
    capital: "Montería",
    municipios: [
      "Montería", "Cereté", "Lorica", "Sahagún", "Montelíbano", "Tierralta",
      "Valencia", "Planeta Rica", "Ciénaga de Oro", "San Pelayo", "Chinú",
      "Ayapel", "Buenavista", "La Apartada", "Pueblo Nuevo"
    ]
  },
  "cundinamarca": {
    nombre: "Cundinamarca",
    capital: "Bogotá",
    municipios: [
      "Bogotá", "Soacha", "Fusagasugá", "Zipaquirá", "Facatativá", "Chía",
      "Mosquera", "Madrid", "Funza", "Cajicá", "Tocancipá", "Sopó", "La Calera",
      "Cota", "Tabio", "Tenjo", "El Rosal", "Bojacá", "Subachoque",
      "Gachancipá", "Sibaté", "Girardot", "Villeta", "Guaduas", "Ubaté",
      "Chocontá", "Suesca", "Nemocón", "Pacho", "La Mesa", "Anapoima",
      "Apulo", "Cachipay", "El Colegio", "Viotá", "Arbeláez", "Pasca",
      "Silvania", "Tibacuy", "Nilo"
    ]
  },
  "guainia": {
    nombre: "Guainía",
    capital: "Inírida",
    municipios: ["Inírida", "Barranco Minas", "Mapiripana", "San Felipe"]
  },
  "guaviare": {
    nombre: "Guaviare",
    capital: "San José del Guaviare",
    municipios: [
      "San José del Guaviare", "El Retorno", "Calamar", "Miraflores"
    ]
  },
  "huila": {
    nombre: "Huila",
    capital: "Neiva",
    municipios: [
      "Neiva", "Pitalito", "Garzon", "La Plata", "Campoalegre", "Palermo",
      "Rivera", "Gigante", "Isnos", "San Agustín", "Timaná", "Saladoblanco",
      "Acevedo", "Oporapa", "Tarqui", "Altamira", "El Agrado"
    ]
  },
  "la guajira": {
    nombre: "La Guajira",
    capital: "Riohacha",
    municipios: [
      "Riohacha", "Maicao", "Uribia", "Manaure", "Fonseca", "San Juan del Cesar",
      "Barrancas", "Albania", "Distracción", "El Molino", "Hatonuevo",
      "La Jagua del Pilar", "Urumita", "Villanueva"
    ]
  },
  "magdalena": {
    nombre: "Magdalena",
    capital: "Santa Marta",
    municipios: [
      "Santa Marta", "Ciénaga", "Fundación", "Plato", "El Banco", "Pivijay",
      "Ariguaní", "Salamina", "Sitionuevo", "Remolino", "El Piñón",
      "Pedraza", "Zapayán", "Tenerife"
    ]
  },
  "meta": {
    nombre: "Meta",
    capital: "Villavicencio",
    municipios: [
      "Villavicencio", "Acacías", "Granada", "San Martín", "Restrepo",
      "Cumaral", "Guamal", "El Dorado", "Mesetas", "La Macarena",
      "Puerto López", "Puerto Gaitán", "Puerto Lleras", "Fuente de Oro",
      "San Carlos de Guaroa", "Vista Hermosa"
    ]
  },
  "narino": {
    nombre: "Nariño",
    capital: "Pasto",
    municipios: [
      "Pasto", "Tumaco", "Ipiales", "Túquerres", "La Unión", "Samaniego",
      "El Charco", "Barbacoas", "Olaya Herrera", "Roberto Payán",
      "Policarpa", "Cumbitara", "Los Andes", "Leiva"
    ]
  },
  "norte de santander": {
    nombre: "Norte de Santander",
    capital: "Cúcuta",
    municipios: [
      "Cúcuta", "Ocaña", "Pamplona", "Villa del Rosario", "Los Patios",
      "El Zulia", "Tibú", "Sardinata", "Convención", "San Calixto",
      "Hacarí", "La Playa", "Bucarasica", "Abrego"
    ]
  },
  "putumayo": {
    nombre: "Putumayo",
    capital: "Mocoa",
    municipios: [
      "Mocoa", "Puerto Asís", "Orito", "Valle del Guamuez", "San Miguel",
      "Puerto Caicedo", "Villagarzón", "Puerto Guzmán", "Sibundoy",
      "San Francisco", "Colón", "Santiago"
    ]
  },
  "quindio": {
    nombre: "Quindío",
    capital: "Armenia",
    municipios: [
      "Armenia", "Calarcá", "Montenegro", "La Tebaida", "Quimbaya",
      "Circasia", "Salento", "Filandia", "Génova", "Pijao", "Córdoba",
      "Buenavista"
    ]
  },
  "risaralda": {
    nombre: "Risaralda",
    capital: "Pereira",
    municipios: [
      "Pereira", "Dosquebradas", "Santa Rosa de Cabal", "Cartago",
      "La Virginia", "Marsella", "Quinchía", "Belén de Umbría", "Guática",
      "Apía", "Santuario", "Mistrató", "Pueblo Rico", "Balboa"
    ]
  },
  "san andres": {
    nombre: "San Andrés y Providencia",
    capital: "San Andrés",
    municipios: ["San Andrés", "Providencia", "Santa Catalina"]
  },
  "santander": {
    nombre: "Santander",
    capital: "Bucaramanga",
    municipios: [
      "Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja",
      "San Gil", "Socorro", "Málaga", "Vélez", "Barbosa", "Rionegro",
      "Lebrija", "El Playón", "Sabana de Torres", "Puerto Wilches",
      "Landázuri", "Charalá", "Mogotes", "Páramo"
    ]
  },
  "sucre": {
    nombre: "Sucre",
    capital: "Sincelejo",
    municipios: [
      "Sincelejo", "Corozal", "Sampués", "San Marcos", "Tolú", "Coveñas",
      "Morroa", "El Roble", "Palmito", "Galeras", "Majagual",
      "San Benito Abad", "La Unión", "Ovejas"
    ]
  },
  "tolima": {
    nombre: "Tolima",
    capital: "Ibagué",
    municipios: [
      "Ibagué", "Espinal", "Melgar", "Honda", "Líbano", "Armero",
      "Fresno", "Mariquita", "Ambalema", "Venadillo", "Lérida",
      "Purificación", "Natagaima", "Coyaima", "Ataco", "Planadas"
    ]
  },
  "valle del cauca": {
    nombre: "Valle del Cauca",
    capital: "Cali",
    municipios: [
      "Cali", "Buenaventura", "Palmira", "Tuluá", "Buga", "Cartago",
      "Jamundí", "Yumbo", "Dagua", "La Cumbre", "El Cerrito", "Ginebra",
      "Guacarí", "Restrepo", "Ansermanuevo", "Obando", "La Unión",
      "Roldanillo", "Zarzal", "Caicedonia", "Sevilla", "El Cairo",
      "Versalles", "El Dovio", "Trujillo", "Riofrío", "Andalucía",
      "San Pedro", "Yotoco", "Vijes", "Candelaria", "Florida"
    ]
  },
  "vaupes": {
    nombre: "Vaupés",
    capital: "Mitú",
    municipios: ["Mitú", "Carurú", "Taraira", "Pacoa"]
  },
  "vichada": {
    nombre: "Vichada",
    capital: "Puerto Carreño",
    municipios: ["Puerto Carreño", "La Primavera", "Santa Rosalía", "Cumaribo"]
  },
  "amazonas": {
    nombre: "Amazonas",
    capital: "Leticia",
    municipios: ["Leticia", "Puerto Nariño"]
  },
  "arauca": {
    nombre: "Arauca",
    capital: "Arauca",
    municipios: [
      "Arauca", "Arauquita", "Saravena", "Tame", "Fortul", "Puerto Rondón", "Cravo Norte"
    ]
  }
};

// Set de búsqueda normalizada: municipio/ciudad → {departamento, nombreCanónico}
export interface LugarInfo {
  nombreCanonico: string;
  departamento: string;
  esCApital: boolean;
}

export const MAPA_COLOMBIA: Record<string, LugarInfo> = {};

// Función de normalización simple (sin dependencia circular)
function norm(txt: string): string {
  return txt.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ").trim();
}

// Poblar el mapa
for (const [deptKey, info] of Object.entries(DEPARTAMENTOS_COLOMBIA)) {
  // Agregar el departamento mismo
  MAPA_COLOMBIA[norm(info.nombre)] = {
    nombreCanonico: info.nombre,
    departamento: info.nombre,
    esCApital: false
  };

  // Agregar cada municipio
  for (const mun of info.municipios) {
    const key = norm(mun);
    if (!MAPA_COLOMBIA[key]) {
      MAPA_COLOMBIA[key] = {
        nombreCanonico: mun,
        departamento: info.nombre,
        esCApital: mun === info.capital
      };
    }
  }
}

/**
 * Busca si un texto contiene algún municipio, ciudad o departamento colombiano.
 * Devuelve el lugar MÁS ESPECÍFICO encontrado (la coincidencia más larga).
 * Ejemplo: "Bogotá-Suba-Guaymaral-Lagos de Torca" → preferirá "lagos de torca" (15 chars)
 * sobre "bogota" (6 chars).
 */
export function buscarLugarColombia(texto: string): LugarInfo | null {
  const n = norm(texto);
  // Búsqueda exacta primero
  if (MAPA_COLOMBIA[n]) return MAPA_COLOMBIA[n];
  
  // Búsqueda parcial: encontrar TODOS los lugares en el texto y devolver el más específico (más largo)
  let bestMatch: LugarInfo | null = null;
  let bestKeyLength = 0;

  for (const [key, lugar] of Object.entries(MAPA_COLOMBIA)) {
    if (key.length >= 4 && n.includes(key) && key.length > bestKeyLength) {
      bestMatch = lugar;
      bestKeyLength = key.length;
    }
  }
  return bestMatch;
}
