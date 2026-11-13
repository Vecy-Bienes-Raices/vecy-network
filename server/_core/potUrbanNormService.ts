import {
  BROKER_OFFICIAL_PHONE,
  BROKER_OFFICIAL_WHATSAPP_LINK
} from "./commercialFunnelService";
import { generatePotUrbanNormPdf } from "./jania/legalDocumentPdfService";

export type PotTreatment =
  | "RENOVACION_URBANA"
  | "CONSOLIDACION"
  | "DESARROLLO"
  | "CONSERVACION"
  | "MEJORAMIENTO_INTEGRAL";

export type PotActivityArea =
  | "ESTRUCTURANTE_ACTIVIDADES_ECONOMICAS"
  | "ESTRUCTURANTE_VIVIENDA_VIS"
  | "PROXIMIDAD_SOPORTES_URBANOS"
  | "PROXIMIDAD_GENERADORA_SOPORTES"
  | "GRANDES_SERVICIOS_METROPOLITANOS";

export type PotAlertLevel = "ALTA" | "MEDIA" | "BAJA" | "SIN_REPORTE";

export interface PotLiveGisData {
  source: "IDECA_LIVE" | "IDECA_SINUPOT_LIVE" | "DETERMINISTIC_POT_555";
  endpointsQueried: string[];
  chip?: string;
  cedulaCatastral?: string;
  codigoLote?: string;
  codigoManzana?: string;
  direccionOficial?: string;
  barrioCatastral?: string;
  localidad?: string;
  uplCodigo?: string;
  uplNombre?: string;
  uplVocacion?: string;
  upzCodigo?: string;
  upzNombre?: string;
  zonaEstacionamiento?: string;
  clasificacionSuelo?: string;
  estratoCatastral?: number;
  areaTerrenoM2?: number;
  areaConstruidaActualM2?: number;
  pisosExistentes?: number;
  vetustez?: number;
  usoPredominanteManzana?: string;
  proyectoRenoBo?: string;
  amenazaRemocion?: string;
  sinupotTratamientoLive?: string;
  sinupotAreaActividadLive?: string;
  centroid?: { lat: number; lon: number };
}

export interface PotParsedQuery {
  isPotRequest: boolean;
  isConceptualOnly: boolean;
  isSpecificPredio: boolean;
  needsPredioGuidance: boolean;
  chip?: string;
  direccion?: string;
  barrioOSector?: string;
  uplOUzpMentioned?: string;
  tipoInmueble?:
    | "lote"
    | "casalote"
    | "casa"
    | "edificio"
    | "local"
    | "oficina"
    | "bodega"
    | "apartamento"
    | "predio";
  objetivoEvaluacion:
    | "construir_desarrollar"
    | "remodelar_ampliar"
    | "uso_comercial_servicios"
    | "norma_general";
  areaLoteM2?: number;
  frenteMetros?: number;
  pisosDeseados?: number;
}

export interface PotUrbanNormReport {
  querySummary: string;
  isSpecificPredio: boolean;
  identificacion: {
    chip: string;
    direccion: string;
    barrio: string;
    localidad: string;
    upl: string;
    upz: string;
    clasificacionSuelo: string;
    estrato: string;
    areaTerrenoM2: number | null;
    areaConstruidaActualM2: number | null;
    frenteMetros: number | null;
    pisosActuales: number | null;
  };
  normaPot555: {
    decretoMarco: string;
    tratamientoCode: PotTreatment;
    tratamientoNombre: string;
    tratamientoDetalle: string;
    areaActividadCode: PotActivityArea;
    areaActividadNombre: string;
    indiceOcupacionMax: number;
    indiceConstruccionBase: number;
    indiceConstruccionMaxConIncentivos: number;
    alturaMaximaPisos: string;
    pisosEstimadosBase: number;
    pisosEstimadosMax: number;
    tipologiaEdificatoria: string;
    antejardinMinimo: string;
    aislamientos: string;
    usosPermitidosPrincipales: string[];
    usosRestringidosOCondicionados: string[];
  };
  alertasYRestricciones: {
    reservaVial: { nivel: PotAlertLevel; detalle: string };
    rondaHidrica: { nivel: PotAlertLevel; detalle: string };
    riesgoRemocionMasa: { nivel: PotAlertLevel; detalle: string };
    bienInteresCultural: { nivel: PotAlertLevel; detalle: string };
    observaciones: string[];
  };
  potencialConstructivoYComercial: {
    aplicaCalculoVolumetrico: boolean;
    areaLoteBaseM2: number | null;
    frenteBaseMetros: number | null;
    areaMaximaOcupablePiso1M2: number | null;
    areaMaximaConstruibleBaseM2: number | null;
    areaMaximaConstruibleIncentivosM2: number | null;
    unidadesEstimadasVivienda: string | null;
    evaluacionFrente: string;
    veredictoComercial: string;
    recomendacionesTecnicas: string[];
  };
  liveGis: PotLiveGisData;
  enlacesOficiales: {
    sinupot: string;
    mapasBogota: string;
    ideca: string;
    curadurias: string;
  };
  whatsappSummary: string;
  analyzedAtIso: string;
}

export interface PotWhatsAppExecutionResult {
  isPotRequest: boolean;
  needsPredioGuidance: boolean;
  report?: PotUrbanNormReport;
  responseText: string;
  reactionEmoji: string;
  pdfBuffer?: Buffer;
  pdfFileName?: string;
}

const IDECA_BASE = "https://serviciosgis.catastrobogota.gov.co/arcgis/rest/services";
const SINUPOT_BASE = "https://sinupot.sdp.gov.co/serverp/rest/services/POT555";

const SINUPOT_URL = "https://sinupot.sdp.gov.co/";
const MAPAS_BOGOTA_URL = "https://mapas.bogota.gov.co/";
const IDECA_URL = "https://www.ideca.gov.co/";
const CURADURIAS_SDP_URL = "https://www.sdp.gov.co/content/sinupot-0";

function normalizeNoAccents(value?: string | null): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMentions(text?: string | null): string {
  return String(text || "")
    .replace(/@\d{7,18}\b/g, " ")
    .replace(/@jania\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeArcGisLiteral(value: string): string {
  return value.replace(/[^A-Za-z0-9\s\-]/g, "").trim().toUpperCase();
}

function formatNumberCo(val: number): string {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(val);
}

interface SectorProfile {
  key: string;
  aliases: string[];
  barrioDisplay: string;
  localidad: string;
  upl: string;
  upz: string;
  estratoTipico: number;
  tratamientoCode: PotTreatment;
  areaActividadCode: PotActivityArea;
  io: number;
  icBase: number;
  icMax: number;
  pisosBase: number;
  pisosMax: number;
  tipologia: string;
  antejardin: string;
  bicFlag?: PotAlertLevel;
  rondaFlag?: PotAlertLevel;
  riesgoFlag?: PotAlertLevel;
  vialFlag?: PotAlertLevel;
  notaSector: string;
}

const BOGOTA_SECTOR_PROFILES: SectorProfile[] = [
  {
    key: "chico_93_cabrera",
    aliases: [
      "chico", "el chico", "chico norte", "chico reservado", "rincon del chico",
      "parque de la 93", "la cabrera", "el nogal", "el retiro", "zona t", "antiguo country",
      "espacio 93", "calle 85", "calle 93"
    ],
    barrioDisplay: "Chicó / La Cabrera / Zona 93",
    localidad: "Chapinero",
    upl: "UPL14 - Chapinero",
    upz: "UPZ 97 - Chicó Lago / UPZ 88 - El Refugio",
    estratoTipico: 6,
    tratamientoCode: "RENOVACION_URBANA",
    areaActividadCode: "ESTRUCTURANTE_ACTIVIDADES_ECONOMICAS",
    io: 0.7,
    icBase: 3.5,
    icMax: 5.5,
    pisosBase: 8,
    pisosMax: 15,
    tipologia: "Continua / Aislada según frente de lote y perfil vial (V-1 a V-4)",
    antejardin: "5.0 m sobre ejes estructurantes / 3.5 m en vías locales consolidadas",
    vialFlag: "MEDIA",
    notaSector:
      "Alta demanda corporativa, residencial premium y comercio de alto perfil. Ejes Carrera 11, Carrera 15, Calle 93 y Calle 100 admiten mayor altura mediante englobe y cargas urbanísticas."
  },
  {
    key: "chapinero_central_marly_quinta",
    aliases: [
      "chapinero", "chapinero central", "chapinero alto", "marly", "quinta camacho",
      "sucre", "pardo rubio", "lourdes", "emaus", "zona g", "rosales"
    ],
    barrioDisplay: "Chapinero / Quinta Camacho / Rosales",
    localidad: "Chapinero",
    upl: "UPL14 - Chapinero",
    upz: "UPZ 99 - Chapinero / UPZ 90 - Pardo Rubio",
    estratoTipico: 5,
    tratamientoCode: "RENOVACION_URBANA",
    areaActividadCode: "ESTRUCTURANTE_ACTIVIDADES_ECONOMICAS",
    io: 0.7,
    icBase: 3.2,
    icMax: 5.0,
    pisosBase: 6,
    pisosMax: 12,
    tipologia: "Continua en ejes mixtos; Conservación puntual en inmuebles BIC de Quinta Camacho",
    antejardin: "3.0 m a 5.0 m según empate de manzana y perfil vial",
    bicFlag: "MEDIA",
    riesgoFlag: "MEDIA",
    notaSector:
      "Sector mixto estratégico universitario, gastronómico (Zona G) y residencial. Verificar si el predio colinda con BIC en Quinta Camacho o franja de Cerros Orientales en Rosales/Pardo Rubio."
  },
  {
    key: "santa_barbara_usaquen",
    aliases: [
      "santa barbara", "santa ana", "la carolina", "bella suiza", "multicentro",
      "san patricio", "unicentro", "usaquen", "molinos norte", "la calleja", "country"
    ],
    barrioDisplay: "Santa Bárbara / Usaquén / Santa Ana",
    localidad: "Usaquén",
    upl: "UPL26 - Usaquén",
    upz: "UPZ 14 - Santa Bárbara / UPZ 13 - Los Cedros",
    estratoTipico: 6,
    tratamientoCode: "CONSOLIDACION",
    areaActividadCode: "PROXIMIDAD_SOPORTES_URBANOS",
    io: 0.65,
    icBase: 2.8,
    icMax: 4.2,
    pisosBase: 5,
    pisosMax: 10,
    tipologia: "Aislada o Semicontinua con antejardines amplios (ejes Cra 7a, Cra 9a, Cll 116, Cll 127)",
    antejardin: "5.0 m en ejes arteriales / 3.5 m a 4.0 m en vías locales residenciales",
    bicFlag: "BAJA",
    notaSector:
      "Mercado sólido para multifamiliar de gama media-alta, consultorios médicos (eje Fundación Santa Fe) y comercio zonal. En Usaquén Fundacional verificar perímetro BIC."
  },
  {
    key: "cedritos_contador_colina",
    aliases: [
      "cedritos", "cedro golf", "cedro bolivar", "contador", "belmira", "lisboa",
      "colina", "colina campestre", "mazuren", "prado veraniego", "victoria norte",
      "nueva autopista", "alcala"
    ],
    barrioDisplay: "Cedritos / Contador / Colina Campestre",
    localidad: "Usaquén / Suba",
    upl: "UPL26 - Usaquén / UPL29 - Britalia",
    upz: "UPZ 13 - Los Cedros / UPZ 19 - El Prado",
    estratoTipico: 4,
    tratamientoCode: "CONSOLIDACION",
    areaActividadCode: "PROXIMIDAD_GENERADORA_SOPORTES",
    io: 0.7,
    icBase: 2.6,
    icMax: 3.6,
    pisosBase: 5,
    pisosMax: 8,
    tipologia: "Continua / Semicontinua para vivienda multifamiliar y comercio vecinal",
    antejardin: "3.5 m a 5.0 m según perfil vial (Cll 134, Cll 140, Cll 147, Av. 19)",
    notaSector:
      "Alta absorción en vivienda multifamiliar de 5 a 8 pisos y comercio de proximidad en primer piso sobre ejes principales (Av. 19, Cra 15, Cll 140, Cll 147)."
  },
  {
    key: "niza_floresta_pontevedra_pasadena",
    aliases: [
      "niza", "la floresta", "pontevedra", "pasadena", "potosi", "andes", "morato",
      "san nicolas", "santa rosa", "suba", "batan", "malibu"
    ],
    barrioDisplay: "Niza / La Floresta / Pontevedra / Suba",
    localidad: "Suba",
    upl: "UPL27 - Niza / UPL28 - Suba",
    upz: "UPZ 25 - La Floresta / UPZ 24 - Niza",
    estratoTipico: 5,
    tratamientoCode: "CONSOLIDACION",
    areaActividadCode: "PROXIMIDAD_SOPORTES_URBANOS",
    io: 0.65,
    icBase: 2.5,
    icMax: 3.6,
    pisosBase: 4,
    pisosMax: 8,
    tipologia: "Semicontinua / Aislada en manzanas residenciales; mayor altura en ejes Av. Suba y Cll 116",
    antejardin: "4.0 m a 5.0 m",
    rondaFlag: "BAJA",
    notaSector:
      "Sector residencial consolidado con excelente acceso por Av. Suba, Calle 116 y Av. Boyacá. Revisar cercanía al Humedal Córdoba o canales en predios colindantes."
  },
  {
    key: "toberin_industrial_puente_aranda_fontibon",
    aliases: [
      "toberin", "puente aranda", "zona industrial", "montevideo", "fontibon",
      "alamos", "zona franca", "ricaurte", "pensilvania", "salazar gomez",
      "granjas de techo", "carvajal", "sevillana"
    ],
    barrioDisplay: "Toberín / Puente Aranda / Fontibón Industrial",
    localidad: "Usaquén / Puente Aranda / Fontibón",
    upl: "UPL21 - Puente Aranda / UPL12 - Fontibón / UPL29 - Britalia",
    upz: "UPZ 111 - Puente Aranda / UPZ 112 - Granjas de Techo / UPZ 12 - Toberín",
    estratoTipico: 3,
    tratamientoCode: "RENOVACION_URBANA",
    areaActividadCode: "GRANDES_SERVICIOS_METROPOLITANOS",
    io: 0.75,
    icBase: 3.2,
    icMax: 4.5,
    pisosBase: 4,
    pisosMax: 8,
    tipologia: "Nave industrial / Plataforma logística / Edificio corporativo y comercial",
    antejardin: "3.0 m a 5.0 m según vía arterial o zona de maniobra de carga",
    vialFlag: "MEDIA",
    notaSector:
      "Vocación logística, bodegaje urbano, industria liviana/mediana y comercio mayorista. En Fontibón/Engativá validar cono de aproximación y ruido aeroportuario El Dorado."
  },
  {
    key: "salitre_teusaquillo_galerias",
    aliases: [
      "salitre", "ciudad salitre", "teusaquillo", "galerias", "nicolas de federman",
      "campin", "palermo", "la soledad", "park way", "santa teresita", "modelia", "hayuelos"
    ],
    barrioDisplay: "Salitre / Teusaquillo / Galerías",
    localidad: "Teusaquillo / Fontibón",
    upl: "UPL30 - Salitre / UPL23 - Teusaquillo",
    upz: "UPZ 109 - Ciudad Salitre / UPZ 101 - Teusaquillo / UPZ 100 - Galerías",
    estratoTipico: 4,
    tratamientoCode: "RENOVACION_URBANA",
    areaActividadCode: "ESTRUCTURANTE_ACTIVIDADES_ECONOMICAS",
    io: 0.68,
    icBase: 3.0,
    icMax: 4.8,
    pisosBase: 5,
    pisosMax: 12,
    tipologia: "Continua en ejes comerciales (Av. El Dorado, NQS, Cll 53); Conservación en La Soledad/Teusaquillo BIC",
    antejardin: "3.5 m a 5.0 m",
    bicFlag: "MEDIA",
    notaSector:
      "Corredor de alta conectividad (Av. 26, NQS, Av. Esperanza). En La Soledad / Park Way verificar inventario de Conservación Patrimonial (BIC) antes de proyectar demolición."
  },
  {
    key: "candelaria_centro_historico",
    aliases: [
      "la candelaria", "candelaria", "centro historico", "las nieves", "la macarena",
      "bosque izquierdo", "la merced", "veracruz", "santa fe", "centro internacional"
    ],
    barrioDisplay: "Centro Histórico / La Candelaria / Macarena",
    localidad: "La Candelaria / Santa Fe",
    upl: "UPL24 - Centro Histórico",
    upz: "UPZ 94 - La Candelaria / UPZ 93 - Las Nieves",
    estratoTipico: 3,
    tratamientoCode: "CONSERVACION",
    areaActividadCode: "ESTRUCTURANTE_ACTIVIDADES_ECONOMICAS",
    io: 0.6,
    icBase: 1.8,
    icMax: 2.6,
    pisosBase: 2,
    pisosMax: 4,
    tipologia: "Patrimonial / Empate histórico continuo (sujeto a aprobación IDPC)",
    antejardin: "0.0 m (paramento histórico a línea de fachada)",
    bicFlag: "ALTA",
    notaSector:
      "Sector de Interés Cultural (PEMPC / IDPC). Excelente vocación cultural, gastronómica, coliving universitario y turismo patrimonial, pero cualquier obra exige anteproyecto ante el IDPC."
  },
  {
    key: "torca_guaymaral_expansion",
    aliases: [
      "guaymaral", "torca", "lagos de torca", "san antonio norte", "tibor",
      "arrayanes", "san jose de bavaria"
    ],
    barrioDisplay: "Torca / Guaymaral / San José de Bavaria",
    localidad: "Usaquén / Suba",
    upl: "UPL25 - Torca / UPL27 - Niza",
    upz: "UPZ 1 - Paseo de los Libertadores / UPZ 3 - Guaymaral",
    estratoTipico: 5,
    tratamientoCode: "DESARROLLO",
    areaActividadCode: "PROXIMIDAD_SOPORTES_URBANOS",
    io: 0.5,
    icBase: 1.8,
    icMax: 3.0,
    pisosBase: 3,
    pisosMax: 8,
    tipologia: "Aislada / Desarrollo por Plan Parcial con cesiones obligatorias (POZ Norte - Lagos de Torca)",
    antejardin: "5.0 m o superior según perfil ambiental y plan parcial",
    rondaFlag: "ALTA",
    notaSector:
      "Áreas sujetas a Planes Parciales (Lagos de Torca) o suelo suburbano/ronda del Humedal Torca-Guaymaral. Verificar cargas y beneficios y EEP antes de valorar m² urbanizable."
  },
  {
    key: "kennedy_tintal_castilla_bosa_restrepo",
    aliases: [
      "kennedy", "tintal", "castilla", "marsella", "bosa", "restrepo", "olaya",
      "san jorge", "tunja", "tunjuelito", "ciudad montes", "vergel", "patio bonito", "engativa"
    ],
    barrioDisplay: "Kennedy / Castilla / Tintal / Restrepo / Engativá",
    localidad: "Kennedy / Antonio Nariño / Bosa / Engativá",
    upl: "UPL15 - Kennedy / UPL13 - Tintal / UPL22 - Restrepo / UPL31 - Engativá",
    upz: "UPZ 46 - Castilla / UPZ 38 - Restrepo / UPZ 47 - Kennedy Central",
    estratoTipico: 3,
    tratamientoCode: "CONSOLIDACION",
    areaActividadCode: "PROXIMIDAD_GENERADORA_SOPORTES",
    io: 0.7,
    icBase: 2.4,
    icMax: 3.4,
    pisosBase: 4,
    pisosMax: 6,
    tipologia: "Continua de densidad media (vivienda bifamiliar/multifamiliar + comercio zonal en 1er piso)",
    antejardin: "3.0 m según empate de cuadra",
    notaSector:
      "Alta demanda de vivienda VIS/No-VIS asequible, comercio vecinal y servicios en ejes principales (Av. Primero de Mayo, Av. Boyacá, Av. Américas, Av. Ciudad de Cali)."
  }
];

/**
 * Determina si una pregunta es puramente conceptual sobre POT/urbanismo
 * (sin CHIP, sin dirección, sin lote con área/frente y sin consulta de norma de un predio/sector).
 */
export function isConceptualPotQuestion(text?: string | null): boolean {
  const clean = stripMentions(text);
  if (!clean) return false;
  const norm = normalizeNoAccents(clean).toLowerCase();

  const hasChip = /\bAAA[0-9]{4}[A-Z0-9]{4}\b/i.test(clean);
  const hasAddress = Boolean(extractBogotaAddress(clean));
  const hasLotWithMeasures =
    /\b(?:lote|casalote|casa\s*lote|terreno|predio|bodega|local|oficina)\b/i.test(norm) &&
    /\b\d+(?:[.,]\d+)?\s*(?:m2|mts|metros)\b/i.test(norm);

  if (hasChip || hasAddress || hasLotWithMeasures) return false;

  return (
    /\b(?:que\s+(?:es|son)\s+(?:el\s+|la\s+|los\s+|las\s+|un\s+|una\s+)?(?:pot|decreto\s*555|sinupot|ideca|upl|upz|indice\s+de\s+ocupacion|indice\s+de\s+construccion|tratamiento\s+urbanistico|area\s+de\s+actividad|antejardin|aislamientos?|ronda\s+hidrica|reserva\s+vial|bien\s+de\s+interes\s+cultural|\bbic\b|curaduria\s+urbana|licencia\s+de\s+construccion|plusvalia|edificabilidad)|diferencia\s+entre\s+(?:upz\s+y\s+upl|indice\s+de\s+ocupacion|antejardin\s+y\s+aislamiento)|como\s+(?:funciona|se\s+calcula|se\s+aplica|se\s+mide)\s+(?:la\s+norma\s+(?:de\s+)?|el\s+|la\s+|los\s+|las\s+)?(?:pot|decreto\s*555|sinupot|ideca|upl|upz|tratamiento\s+(?:de\s+)?(?:renovacion|consolidacion|desarrollo|conservacion)|aislamientos?|antejardin|indice\s+de\s+(?:ocupacion|construccion)|area\s+de\s+actividad|edificabilidad|ronda\s+hidrica|reserva\s+vial|licencia\s+de\s+construccion|plusvalia)|para\s+que\s+sirve\s+(?:el\s+|la\s+)?(?:sinupot|ideca|upl|upz|pot))\b/i.test(
      norm
    ) && !/\b(?:analiza|revisa|consulta|evalua|dime\s+la\s+norma|prefactibilidad|que\s+se\s+puede\s+construir|cuantos\s+pisos)\b/i.test(norm)
  );
}

export function extractBogotaAddress(text?: string | null): string | undefined {
  const clean = stripMentions(text);
  if (!clean) return undefined;
  const match = clean.match(
    /\b((?:calle|cll?\.?|carrera|cra?\.?|kr\.?|diagonal|diag\.?|dg\.?|transversal|transv?\.?|tv\.?|avenida|av\.?|ak\.?|ac\.?)\s+[0-9]{1,3}[A-Za-z]?(?:\s+(?:bis|sur|este))?\s*(?:#|no\.?|nro\.?|n[uú]mero)?\s*[0-9]{1,3}[A-Za-z]?(?:\s*(?:[-–]|con)\s*[0-9]{1,3}[A-Za-z]?)?)\b/i
  );
  if (!match || !match[1]) return undefined;
  const candidate = match[1].trim();
  // Evitar falsos positivos cortos como "calle 85" sin nomenclatura completa cuando no viene precedido de dirección
  if (!/(?:#|[-–]|no\.?|nro\.?|\d+\s+[0-9]{1,2}\s+[0-9]{1,2})/i.test(candidate) && candidate.split(/\s+/).length < 4) {
    return undefined;
  }
  return candidate;
}

function findMatchingSectorProfile(textNormLower: string): SectorProfile | undefined {
  for (const prof of BOGOTA_SECTOR_PROFILES) {
    for (const alias of prof.aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\b`, "i").test(textNormLower)) {
        return prof;
      }
    }
  }
  return undefined;
}

export function parsePotUrbanQuery(text?: string | null): PotParsedQuery {
  const clean = stripMentions(text);
  if (!clean) {
    return {
      isPotRequest: false,
      isConceptualOnly: false,
      isSpecificPredio: false,
      needsPredioGuidance: false,
      objetivoEvaluacion: "norma_general"
    };
  }

  const normLower = normalizeNoAccents(clean).toLowerCase();

  // No capturar solicitudes que son claramente Estudio de Títulos CTL, IDU o Predial puro o ACM puro
  const isCtlIntent = /\b(?:estudio\s+de\s+titulos|certificado\s+de\s+tradicion|\bctl\b|falsa\s+tradicion|anotacion(?:es)?\s+nro)\b/i.test(
    normLower
  );
  const isIduIntent = /\b(?:paz\s+y\s+salvo\s+(?:del\s+)?idu|valorizacion\s+idu|webidu)\b/i.test(normLower);
  const isPredialIntent = /\b(?:factura\s+(?:del\s+)?predial|descarga(?:r|me)?\s+(?:el\s+)?predial|impuesto\s+predial)\b/i.test(
    normLower
  );

  const chipMatch = clean.match(/\b(AAA[0-9]{4}[A-Z0-9]{4})\b/i);
  const chip = chipMatch ? chipMatch[1].toUpperCase() : undefined;
  const direccion = extractBogotaAddress(clean);

  // Detectar UPL / UPZ explícita
  const uplMatch = clean.match(/\b(UPL\s*\d{1,2}(?:\s+[A-Za-zÁÉÍÓÚáéíóúñÑ]+)?)\b/i);
  const upzMatch = clean.match(/\b(UPZ\s*\d{1,3}(?:\s+[A-Za-zÁÉÍÓÚáéíóúñÑ]+)?)\b/i);
  const uplOUzpMentioned = uplMatch?.[1]?.trim() || upzMatch?.[1]?.trim();

  // Detectar área del lote (m2)
  let areaLoteM2: number | undefined;
  const lotAreaMatch1 = clean.match(
    /(?:lote|terreno|predio|casalote|casa|bodega|local|oficina|area(?:\s+de\s+lote|\s+del\s+terreno)?)\s*(?:de|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mts2?|metros?\s*cuadrados?)\b/i
  );
  const lotAreaMatch2 = clean.match(
    /\b(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mts2?|metros?\s*cuadrados?)\s*(?:de\s+(?:lote|terreno|area|predio))?\b/i
  );
  const rawAreaStr = lotAreaMatch1?.[1] || lotAreaMatch2?.[1];
  if (rawAreaStr) {
    const parsedArea = parseFloat(rawAreaStr.replace(",", "."));
    if (!isNaN(parsedArea) && parsedArea >= 20 && parsedArea <= 200000) {
      areaLoteM2 = parsedArea;
    }
  }

  // Detectar frente en metros
  let frenteMetros: number | undefined;
  const frenteMatch =
    clean.match(/\bfrente\s*(?:de|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:m\b|ml\b|mts\b|metros?\b)/i) ||
    clean.match(/\b(\d+(?:[.,]\d+)?)\s*(?:m\b|ml\b|mts\b|metros?\b)\s+de\s+frente\b/i);
  if (frenteMatch?.[1]) {
    const parsedFrente = parseFloat(frenteMatch[1].replace(",", "."));
    if (!isNaN(parsedFrente) && parsedFrente >= 2 && parsedFrente <= 500) {
      frenteMetros = parsedFrente;
    }
  }

  // Detectar pisos deseados
  let pisosDeseados: number | undefined;
  const pisosMatch = clean.match(/\b(\d{1,2})\s*pisos?\b/i);
  if (pisosMatch?.[1]) {
    pisosDeseados = parseInt(pisosMatch[1], 10);
  }

  // Detectar tipo de inmueble
  let tipoInmueble: PotParsedQuery["tipoInmueble"];
  if (/\bcasa\s*lote|casalote\b/i.test(normLower)) tipoInmueble = "casalote";
  else if (/\blote|terreno|solar\b/i.test(normLower)) tipoInmueble = "lote";
  else if (/\bbodega|nave\b/i.test(normLower)) tipoInmueble = "bodega";
  else if (/\bedificio\b/i.test(normLower)) tipoInmueble = "edificio";
  else if (/\blocal\b/i.test(normLower)) tipoInmueble = "local";
  else if (/\boficina\b/i.test(normLower)) tipoInmueble = "oficina";
  else if (/\bcasa\b/i.test(normLower)) tipoInmueble = "casa";
  else if (/\bapartamento|apto\b/i.test(normLower)) tipoInmueble = "apartamento";
  else if (chip || direccion) tipoInmueble = "predio";

  // Detectar barrio / sector
  const matchedSector = findMatchingSectorProfile(normLower);
  let barrioOSector = matchedSector?.barrioDisplay;
  if (!barrioOSector) {
    const sectorMatch = clean.match(
      /\b(?:en\s+(?:el\s+)?(?:barrio|sector)(?:\s+de)?|barrio|sector)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s]{3,36}?)(?=\s+(?:para|con|de\s+\d|chip|norma|pot|uso|y\b)|[.,;?!]|$)/i
    );
    if (sectorMatch?.[1]) {
      barrioOSector = sectorMatch[1].trim();
    }
  }

  // Señales explícitas de análisis POT / Norma Urbana
  const hasStrongPotKeyword =
    /\b(?:pot\b|decreto\s*555|sinupot|ideca|mapas\s*bogota|norma\s+urbana|normativa\s+urbana|cedula\s+normativa|tratamiento\s+urbanistico|area\s+de\s+actividad|indice\s+de\s+ocupacion|indice\s+de\s+construccion|edificabilidad|potencial\s+constructivo|prefactibilidad|uso\s+del?\s+suelo|usos\s+permitidos|pisos\s+permitidos|altura\s+maxima|cuantos\s+pisos\s+(?:se\s+pueden?|puedo)\s+construir|que\s+se\s+puede\s+construir|antejardin\s+y\s+aislamiento|ronda\s+hidrica|reserva\s+vial|bien\s+de\s+interes\s+cultural|\bupl\b|\bupz\b)\b/i.test(
      normLower
    );

  // Descartar si es un ACM / Avalúo puro sin solicitud explícita de norma urbana/POT
  const isPureAcmRequest =
    /\b(?:hazme\s+un\s+acm|\bacm\b|analisis\s+comparativo\s+de\s+mercado|avaluo\s+comercial|cuanto\s+vale\s+(?:el\s+m2|esta\s+casa|este\s+apto))\b/i.test(
      normLower
    ) && !hasStrongPotKeyword;

  const isConceptualOnly = isConceptualPotQuestion(clean);

  // Objetivo de evaluación
  let objetivoEvaluacion: PotParsedQuery["objetivoEvaluacion"] = "norma_general";
  if (/\b(?:remodelar|ampliar|adecuar|reforzar|reciclar)\b/i.test(normLower)) {
    objetivoEvaluacion = "remodelar_ampliar";
  } else if (
    /\b(?:construir|desarrollar|edificio|torre|proyecto|pisos|constructibilidad|prefactibilidad|englobar|demoler)\b/i.test(
      normLower
    )
  ) {
    objetivoEvaluacion = "construir_desarrollar";
  } else if (
    /\b(?:local|oficina|bodega|comercio|restaurante|consultorio|uso\s+comercial|habilitar|licencia\s+de\s+funcionamiento|uso\s+del?\s+suelo)\b/i.test(
      normLower
    )
  ) {
    objetivoEvaluacion = "uso_comercial_servicios";
  }

  const hasPredioTarget = Boolean(
    chip ||
      direccion ||
      uplOUzpMentioned ||
      barrioOSector ||
      (tipoInmueble && (areaLoteM2 !== undefined || frenteMetros !== undefined))
  );

  const isSpecificPredio = Boolean(
    chip ||
      direccion ||
      (tipoInmueble && (areaLoteM2 !== undefined || frenteMetros !== undefined || Boolean(barrioOSector)))
  );

  const hasExplicitActionVerb =
    /\b(?:analiza(?:r|me)?|revisa(?:r|me)?|consulta(?:r|me)?|evalua(?:r|me)?|calcula(?:r|me)?|estudia(?:r|me)?|dime|muestra(?:me)?|saca(?:r|me)?|verifica(?:r|me)?|necesito|quiero|haz(?:me)?|prefactibilidad)\b/i.test(
      normLower
    );

  const isPotRequest =
    !isCtlIntent &&
    !isIduIntent &&
    !isPredialIntent &&
    !isPureAcmRequest &&
    !isConceptualOnly &&
    hasStrongPotKeyword &&
    (hasPredioTarget || hasExplicitActionVerb);

  const needsPredioGuidance = isPotRequest && !hasPredioTarget;

  return {
    isPotRequest,
    isConceptualOnly,
    isSpecificPredio,
    needsPredioGuidance,
    chip,
    direccion,
    barrioOSector,
    uplOUzpMentioned,
    tipoInmueble,
    objetivoEvaluacion,
    areaLoteM2,
    frenteMetros,
    pisosDeseados
  };
}

/**
 * Helper público rápido para interceptores de DM, Grupos y WhatsApp.
 */
export function isPotUrbanNormRequest(text?: string | null): boolean {
  return parsePotUrbanQuery(text).isPotRequest;
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 4500): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeAddressForCatastroPrefix(rawDir: string): string {
  let clean = normalizeNoAccents(rawDir).toUpperCase();
  clean = clean
    .replace(/\bAVENIDA\s+CARRERA\b/g, "AK")
    .replace(/\bAVENIDA\s+CALLE\b/g, "AC")
    .replace(/\bCARRERA\b|\bCRA\.?\b|\bKR\.?\b/g, "KR")
    .replace(/\bCALLE\b|\bCLL?\.?\b/g, "CL")
    .replace(/\bDIAGONAL\b|\bDIAG\.?\b|\bDG\.?\b/g, "DG")
    .replace(/\bTRANSVERSAL\b|\bTRANSV?\.?\b|\bTV\.?\b/g, "TV")
    .replace(/\bAVENIDA\b|\bAV\.?\b/g, "AV")
    .replace(/[#\-–]/g, " ")
    .replace(/\b(?:NO|NRO|NUMERO)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Tomar los primeros 4 tokens clave para LIKE flexible (ej: "KR 14A 127 65" -> "KR 14A 127")
  const tokens = clean.split(" ").filter(Boolean).slice(0, 4);
  return tokens.join(" ");
}

function computePolygonCentroid(rings?: number[][][]): { lat: number; lon: number } | undefined {
  if (!rings || !rings[0] || rings[0].length === 0) return undefined;
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (const pt of rings[0]) {
    if (Array.isArray(pt) && pt.length >= 2 && typeof pt[0] === "number" && typeof pt[1] === "number") {
      sumX += pt[0];
      sumY += pt[1];
      count += 1;
    }
  }
  if (count === 0) return undefined;
  return { lon: sumX / count, lat: sumY / count };
}

/**
 * Consulta en vivo los geoservicios oficiales de IDECA / Catastro Bogotá (ArcGIS REST)
 * y, si está disponible, SINUPOT SDP. En modo test (`NODE_ENV=test`) o ante timeouts,
 * retorna degradación limpia sin errores para activar la matriz determinística POT 555.
 */
export async function queryIdecaAndSinupotLive(
  parsed: PotParsedQuery,
  options?: { enableLiveGis?: boolean }
): Promise<PotLiveGisData> {
  const allowLive = options?.enableLiveGis ?? process.env.NODE_ENV !== "test";
  const result: PotLiveGisData = {
    source: "DETERMINISTIC_POT_555",
    endpointsQueried: []
  };

  if (!allowLive) {
    return result;
  }

  try {
    let predioAttr: Record<string, any> | null = null;
    let lotCode = "";

    // 1. Búsqueda catastral en IDECA Lote/Predio por CHIP o Dirección
    if (parsed.chip) {
      const safeChip = sanitizeArcGisLiteral(parsed.chip);
      const predioUrl =
        `${IDECA_BASE}/catastro/lote/MapServer/3/query` +
        `?where=PRECHIP%3D%27${encodeURIComponent(safeChip)}%27` +
        `&outFields=PRECHIP,PRECEDCATA,PREDIRECC,PRENBARRIO,PREATERRE,PREACONST,BARMANPRE,PRECDESTIN,PRECUSO,PREVETUSTZ&f=json`;
      result.endpointsQueried.push("IDECA:catastro/lote/MapServer/3");
      const data = await fetchJsonWithTimeout(predioUrl);
      if (data?.features?.length > 0) {
        predioAttr = data.features[0].attributes || null;
      }

      const estratoUrl =
        `${IDECA_BASE}/catastro/lote/MapServer/1/query` +
        `?where=ESOCHIP%3D%27${encodeURIComponent(safeChip)}%27&outFields=ESOCHIP,ESOESTRATO&f=json`;
      const estratoData = await fetchJsonWithTimeout(estratoUrl, 3000);
      const rawEstrato = estratoData?.features?.[0]?.attributes?.ESOESTRATO;
      if (typeof rawEstrato === "number" && rawEstrato >= 1 && rawEstrato <= 6) {
        result.estratoCatastral = rawEstrato;
      }
    } else if (parsed.direccion) {
      const dirPrefix = sanitizeArcGisLiteral(normalizeAddressForCatastroPrefix(parsed.direccion));
      if (dirPrefix.length >= 5) {
        const dirUrl =
          `${IDECA_BASE}/catastro/lote/MapServer/3/query` +
          `?where=${encodeURIComponent(`PREDIRECC LIKE '${dirPrefix}%'`)}` +
          `&outFields=PRECHIP,PRECEDCATA,PREDIRECC,PRENBARRIO,PREATERRE,PREACONST,BARMANPRE,PRECDESTIN,PRECUSO,PREVETUSTZ&resultRecordCount=3&f=json`;
        result.endpointsQueried.push("IDECA:catastro/lote/MapServer/3");
        const data = await fetchJsonWithTimeout(dirUrl);
        if (data?.features?.length > 0) {
          predioAttr = data.features[0].attributes || null;
        }
      }
    }

    if (predioAttr) {
      result.source = "IDECA_LIVE";
      result.chip = predioAttr.PRECHIP || parsed.chip;
      result.cedulaCatastral = predioAttr.PRECEDCATA || undefined;
      result.direccionOficial = predioAttr.PREDIRECC || undefined;
      result.barrioCatastral = predioAttr.PRENBARRIO || undefined;
      result.codigoLote = predioAttr.BARMANPRE || undefined;
      result.codigoManzana = predioAttr.BARMANPRE ? String(predioAttr.BARMANPRE).slice(0, 9) : undefined;
      if (typeof predioAttr.PREATERRE === "number" && predioAttr.PREATERRE > 0) {
        result.areaTerrenoM2 = predioAttr.PREATERRE;
      }
      if (typeof predioAttr.PREACONST === "number" && predioAttr.PREACONST > 0) {
        result.areaConstruidaActualM2 = predioAttr.PREACONST;
      }
      if (typeof predioAttr.PREVETUSTZ === "number" && predioAttr.PREVETUSTZ > 1800) {
        result.vetustez = predioAttr.PREVETUSTZ;
      }
      lotCode = String(predioAttr.BARMANPRE || "");
    }

    // 2. Obtener polígono del lote y centroide + pisos existentes + uso predominante
    if (lotCode) {
      const safeLot = sanitizeArcGisLiteral(lotCode);
      const [geomData, constrData, usoData] = await Promise.all([
        fetchJsonWithTimeout(
          `${IDECA_BASE}/catastro/lote/MapServer/0/query?where=LOTCODIGO%3D%27${encodeURIComponent(safeLot)}%27&outFields=LOTCODIGO,MANZCODIGO&returnGeometry=true&outSR=4326&f=json`
        ),
        fetchJsonWithTimeout(
          `${IDECA_BASE}/catastro/construccion/MapServer/0/query?where=LOTECODIGO%3D%27${encodeURIComponent(safeLot)}%27&outFields=CONNPISOS,CONALTURA&returnGeometry=false&f=json`,
          3500
        ),
        fetchJsonWithTimeout(
          `${IDECA_BASE}/catastro/usopredominante/MapServer/0/query?where=MANCODIGO%3D%27${encodeURIComponent(safeLot.slice(0, 9))}%27&outFields=GRUPOUSOECON&returnGeometry=false&resultRecordCount=3&f=json`,
          3500
        )
      ]);
      result.endpointsQueried.push("IDECA:catastro/lote/MapServer/0");

      const rings = geomData?.features?.[0]?.geometry?.rings;
      result.centroid = computePolygonCentroid(rings);

      if (constrData?.features?.length > 0) {
        const maxFloors = Math.max(
          ...constrData.features.map((f: any) => Number(f?.attributes?.CONNPISOS || 0))
        );
        if (maxFloors > 0) result.pisosExistentes = maxFloors;
      }
      if (usoData?.features?.length > 0) {
        result.usoPredominanteManzana = String(usoData.features[0]?.attributes?.GRUPOUSOECON || "");
      }
    }

    // 3. Intersección espacial sobre UPL, UPZ, Localidad, Suelo, Riesgos, RenoBo y SINUPOT
    if (result.centroid) {
      const pt = `${result.centroid.lon},${result.centroid.lat}`;
      const spatialParams =
        `geometry=${encodeURIComponent(pt)}&geometryType=esriGeometryPoint&inSR=4326` +
        `&spatialRel=esriSpatialRelIntersects&returnGeometry=false&f=json`;

      const [uplRes, upzRes, locRes, sueloRes, riesgoRes, renoboRes, sinupotRes] = await Promise.all([
        fetchJsonWithTimeout(`${IDECA_BASE}/ordenamientoterritorial/unidadplaneamientolocal/MapServer/0/query?${spatialParams}&outFields=CODIGO_UPL,NOMBRE,VOCACION`),
        fetchJsonWithTimeout(`${IDECA_BASE}/ordenamientoterritorial/unidadplaneamientozonal/MapServer/0/query?${spatialParams}&outFields=CODIGO_UPZ,NOMBRE,ZONA_ESTACIONAMIENTO`),
        fetchJsonWithTimeout(`${IDECA_BASE}/ordenamientoterritorial/localidad/MapServer/0/query?${spatialParams}&outFields=LOCNOMBRE`),
        fetchJsonWithTimeout(`${IDECA_BASE}/ordenamientoterritorial/suelo/MapServer/0/query?${spatialParams}&outFields=SUECSUELO,SUEAADMIN`),
        fetchJsonWithTimeout(`${IDECA_BASE}/emergencias/gestionriesgos/MapServer/2/query?${spatialParams}&outFields=RESPONSABLE,AMENAZA`, 3500),
        fetchJsonWithTimeout(`${IDECA_BASE}/ordenamientoterritorial/GeoRenoBo/MapServer/0/query?${spatialParams}&outFields=PROYECTO,ESTADO,FASE`, 3000),
        fetchJsonWithTimeout(`${SINUPOT_BASE}/NORMA_URBANISTICA_Y_OT/MapServer/0/query?${spatialParams}&outFields=*`, 3000)
      ]);

      result.endpointsQueried.push(
        "IDECA:unidadplaneamientolocal",
        "IDECA:unidadplaneamientozonal",
        "IDECA:localidad",
        "IDECA:suelo",
        "IDECA:gestionriesgos"
      );

      const uplAttr = uplRes?.features?.[0]?.attributes;
      if (uplAttr) {
        result.uplCodigo = uplAttr.CODIGO_UPL;
        result.uplNombre = uplAttr.NOMBRE;
        result.uplVocacion = uplAttr.VOCACION;
      }
      const upzAttr = upzRes?.features?.[0]?.attributes;
      if (upzAttr) {
        result.upzCodigo = upzAttr.CODIGO_UPZ;
        result.upzNombre = upzAttr.NOMBRE;
        result.zonaEstacionamiento = upzAttr.ZONA_ESTACIONAMIENTO;
      }
      const locAttr = locRes?.features?.[0]?.attributes;
      if (locAttr?.LOCNOMBRE) {
        result.localidad = locAttr.LOCNOMBRE;
      }
      const sueloAttr = sueloRes?.features?.[0]?.attributes;
      if (sueloAttr?.SUECSUELO !== undefined) {
        const code = Number(sueloAttr.SUECSUELO);
        result.clasificacionSuelo =
          code === 1 ? "Suelo Urbano" : code === 2 ? "Suelo de Expansión Urbana" : "Suelo Rural / Protección";
      }
      const riesgoAttr = riesgoRes?.features?.[0]?.attributes;
      if (riesgoAttr?.AMENAZA) {
        result.amenazaRemocion = `${riesgoAttr.AMENAZA} (${riesgoAttr.RESPONSABLE || "IDIGER"})`;
      }
      const renoboAttr = renoboRes?.features?.[0]?.attributes;
      if (renoboAttr?.PROYECTO) {
        result.proyectoRenoBo = `${renoboAttr.PROYECTO} (${renoboAttr.ESTADO || "Activo"})`;
      }
      const sinupotAttr = sinupotRes?.features?.[0]?.attributes;
      if (sinupotAttr) {
        result.source = "IDECA_SINUPOT_LIVE";
        result.endpointsQueried.push("SINUPOT:POT555/NORMA_URBANISTICA_Y_OT");
        result.sinupotTratamientoLive = sinupotAttr.TRATAMIENTO || sinupotAttr.NOM_TRATAMIENTO || undefined;
        result.sinupotAreaActividadLive = sinupotAttr.AREA_ACTIVIDAD || sinupotAttr.NOM_AREA_ACT || undefined;
      }
    }
  } catch {
    // Fallback determinístico limpio garantizado
  }

  return result;
}

function getTreatmentMeta(code: PotTreatment): { nombre: string; detalle: string } {
  switch (code) {
    case "RENOVACION_URBANA":
      return {
        nombre: "Renovación Urbana (Reactivación / Redesarrollo — POT Dec. 555/2021)",
        detalle:
          "Promueve mayor aprovechamiento edificatorio y mezcla de usos mediante densificación, englobe predial y aportes de cargas urbanísticas / espacio público."
      };
    case "CONSOLIDACION":
      return {
        nombre: "Consolidación Urbana (POT Dec. 555/2021)",
        detalle:
          "Mantiene la estructura urbana existente permitiendo reemplazo o ampliación gradual de edificaciones acorde al frente del lote, empate y perfil vial."
      };
    case "DESARROLLO":
      return {
        nombre: "Desarrollo (Urbanización / Plan Parcial — POT Dec. 555/2021)",
        detalle:
          "Aplica a grandes predios o áreas por urbanizar que requieren licencia de urbanización o Plan Parcial con cesiones obligatorias para parques, vías y equipamientos."
      };
    case "CONSERVACION":
      return {
        nombre: "Conservación Patrimonial (BIC / SIC — POT Dec. 555/2021)",
        detalle:
          "Protege valores arquitectónicos, urbanos o históricos; las demoliciones totales están restringidas y toda intervención exige autorización previa del IDPC."
      };
    case "MEJORAMIENTO_INTEGRAL":
      return {
        nombre: "Mejoramiento Integral (POT Dec. 555/2021)",
        detalle:
          "Orientado a cualificar barrios de origen informal ya legalizados mediante infraestructura de soportes urbanos, regularización y vivienda."
      };
  }
}

function getActivityAreaMeta(code: PotActivityArea): {
  nombre: string;
  usosPrincipales: string[];
  usosRestringidos: string[];
} {
  switch (code) {
    case "ESTRUCTURANTE_ACTIVIDADES_ECONOMICAS":
      return {
        nombre: "Área de Actividad Estructurante — Receptora de Actividades Económicas",
        usosPrincipales: [
          "Vivienda multifamiliar y coliving (en pisos superiores o ejes mixtos)",
          "Comercio zonal y metropolitano de bienes y servicios en primeros pisos",
          "Oficinas corporativas, consultorios médicos/profesionales y servicios financieros",
          "Hotelería, restaurantes, servicios empresariales y equipamientos dotacionales"
        ],
        usosRestringidos: [
          "Industria pesada o manufactura de alto impacto ambiental",
          "Servicios de alto impacto (diversión nocturna/moteles) sin mitigación ni distancia mínima",
          "Bodegaje de carga pesada sobre vías peatonales o locales residenciales"
        ]
      };
    case "ESTRUCTURANTE_VIVIENDA_VIS":
      return {
        nombre: "Área de Actividad Estructurante — Receptora de Vivienda de Interés Social",
        usosPrincipales: [
          "Vivienda multifamiliar VIS, VIP y No-VIS",
          "Comercio y servicios de proximidad en primer piso (obligación de zócalo activo)",
          "Equipamientos educativos, culturales y de cuidado"
        ],
        usosRestringidos: [
          "Industria mediana o pesada y logística de alto tonelaje",
          "Establecimientos nocturnos ruidosos contiguos a vivienda"
        ]
      };
    case "GRANDES_SERVICIOS_METROPOLITANOS":
      return {
        nombre: "Área de Actividad de Grandes Servicios Metropolitanos / Productiva",
        usosPrincipales: [
          "Bodegas logísticas, almacenamiento, centros de distribución y última milla",
          "Industria liviana y mediana de bajo impacto ambiental (tecnología, manufactura limpia)",
          "Comercio mayorista/técnico, concesionarios, talleres autorizados y oficinas operativas"
        ],
        usosRestringidos: [
          "Vivienda nueva en polígonos netamente industriales o bajo afectación de ruido aeroportuario",
          "Industria contaminante de alto riesgo sin plan de manejo ambiental SDA"
        ]
      };
    case "PROXIMIDAD_SOPORTES_URBANOS":
      return {
        nombre: "Área de Actividad de Proximidad — Receptora de Soportes Urbanos",
        usosPrincipales: [
          "Vivienda unifamiliar, bifamiliar y multifamiliar",
          "Comercio y servicios básicos vecinales en primer piso sobre ejes locales/zonales",
          "Oficinas de baja escala, consultorios y equipamientos de cercanía (cuidado, educación)"
        ],
        usosRestringidos: [
          "Comercio de gran escala (> 500 m²) en vías locales no arteriales",
          "Bodegas industriales, talleres mecánicos, bares/discotecas y alto impacto"
        ]
      };
    case "PROXIMIDAD_GENERADORA_SOPORTES":
      return {
        nombre: "Área de Actividad de Proximidad — Generadora de Soportes Urbanos",
        usosPrincipales: [
          "Vivienda multifamiliar de densidad media y vivienda unifamiliar/bifamiliar",
          "Comercio barrial de proximidad (tiendas, panaderías, farmacias, cafés) en 1er piso",
          "Servicios profesionales, coworking vecinal y dotacionales locales"
        ],
        usosRestringidos: [
          "Comercio metropolitano o centros comerciales de gran formato sin frente arterial",
          "Bodegaje pesado, industria transformadora y establecimientos nocturnos de alto impacto"
        ]
      };
  }
}

/**
 * Motor determinístico principal: combina datos GIS reales (si existen) con la matriz
 * normativa del POT Bogotá (Decreto 555 de 2021) y calcula prefactibilidad constructiva.
 */
export function buildPotUrbanNormReport(
  parsed: PotParsedQuery,
  liveGis: PotLiveGisData
): PotUrbanNormReport {
  const sectorHintText = normalizeNoAccents(
    [
      parsed.barrioOSector,
      parsed.uplOUzpMentioned,
      liveGis.barrioCatastral,
      liveGis.uplNombre,
      liveGis.upzNombre,
      liveGis.localidad
    ]
      .filter(Boolean)
      .join(" ")
  ).toLowerCase();

  const sectorProfile =
    findMatchingSectorProfile(sectorHintText) || BOGOTA_SECTOR_PROFILES[2]; // Default equilibrado consolidación urbana

  // Ajustar tratamiento/actividad si viene dato vivo de SINUPOT, RenoBo o uso industrial/bodega
  let tratamientoCode = sectorProfile.tratamientoCode;
  let areaActividadCode = sectorProfile.areaActividadCode;
  if (liveGis.proyectoRenoBo) {
    tratamientoCode = "RENOVACION_URBANA";
    areaActividadCode = "ESTRUCTURANTE_ACTIVIDADES_ECONOMICAS";
  } else if (
    parsed.tipoInmueble === "bodega" &&
    tratamientoCode !== "CONSERVACION"
  ) {
    areaActividadCode = "GRANDES_SERVICIOS_METROPOLITANOS";
  }

  if (liveGis.sinupotTratamientoLive) {
    const sTrat = normalizeNoAccents(liveGis.sinupotTratamientoLive).toUpperCase();
    if (sTrat.includes("RENOV")) tratamientoCode = "RENOVACION_URBANA";
    else if (sTrat.includes("CONSOL")) tratamientoCode = "CONSOLIDACION";
    else if (sTrat.includes("DESARR")) tratamientoCode = "DESARROLLO";
    else if (sTrat.includes("CONSERV")) tratamientoCode = "CONSERVACION";
    else if (sTrat.includes("MEJOR")) tratamientoCode = "MEJORAMIENTO_INTEGRAL";
  }

  const tratMeta = getTreatmentMeta(tratamientoCode);
  const actMeta = getActivityAreaMeta(areaActividadCode);

  const areaBase = parsed.areaLoteM2 ?? liveGis.areaTerrenoM2 ?? null;
  const frenteBase = parsed.frenteMetros ?? null;

  // Ajuste por frente y tamaño del predio en el IC / pisos estimados
  let io = sectorProfile.io;
  let icBase = sectorProfile.icBase;
  let icMax = sectorProfile.icMax;
  let pisosBase = sectorProfile.pisosBase;
  let pisosMax = sectorProfile.pisosMax;

  if (frenteBase !== null && frenteBase < 8) {
    icBase = Math.min(icBase, 2.2);
    icMax = Math.min(icMax, 2.8);
    pisosBase = Math.min(pisosBase, 4);
    pisosMax = Math.min(pisosMax, 5);
  } else if (areaBase !== null && areaBase >= 1000 && (frenteBase === null || frenteBase >= 18)) {
    icMax = Number((icMax + 0.5).toFixed(2));
    pisosMax = Math.min(18, pisosMax + 2);
  }

  // Cálculo volumétrico y constructivo
  const aplicaCalculo = areaBase !== null && areaBase > 0;
  const ocupableP1 = aplicaCalculo ? Math.round(areaBase! * io) : null;
  const construibleBase = aplicaCalculo ? Math.round(areaBase! * icBase) : null;
  const construibleMax = aplicaCalculo ? Math.round(areaBase! * icMax) : null;

  let unidadesEstimadas: string | null = null;
  if (construibleBase !== null && parsed.tipoInmueble !== "bodega") {
    const areaVendibleAprox = construibleBase * 0.78;
    const minUnidades = Math.max(1, Math.floor(areaVendibleAprox / 75));
    const maxUnidades = Math.max(minUnidades, Math.floor(areaVendibleAprox / 48));
    unidadesEstimadas = `${minUnidades} a ${maxUnidades} unidades (promedio 48–75 m² vendibles, descontando ~22% de puntos fijos/circulaciones)`;
  }

  let evaluacionFrente = "";
  if (frenteBase !== null) {
    if (frenteBase < 8) {
      evaluacionFrente =
        `Frente estrecho (${frenteBase} m < 8 m): restringe la altura y dificulta rampa de sótano vehicular. Ideal para remodelación comercial/unifamiliar o ENGLOBE con predio vecino para desbloquear mayor altura e IC.`;
    } else if (frenteBase < 12) {
      evaluacionFrente =
        `Frente intermedio (${frenteBase} m): viable para edificio boutique de mediana altura o casa comercial/oficina en tipología continua/semicontinua con parqueaderos en primer piso o semisótano.`;
    } else {
      evaluacionFrente =
        `Frente óptimo (${frenteBase} m ≥ 12 m): permite doble crujía, rampa de sótano vehicular cómoda y aprovechamiento completo del índice de construcción y altura del sector.`;
    }
  } else {
    evaluacionFrente =
      "Frente no suministrado: en Bogotá (Dec. 555/2021), frentes < 8 m limitan altura y sótanos; frentes ≥ 12–15 m habilitan desarrollo vertical pleno o englobe estratégico.";
  }

  let veredictoComercial = "";
  if (tratamientoCode === "CONSERVACION") {
    veredictoComercial =
      "Vocación patrimonial (Conservación): alto valor para comercio boutique, restauración, hotelería cultural, coworking o coliving mediante adecuación/restauración con aval del IDPC (no apto para demolición total en altura).";
  } else if (parsed.objetivoEvaluacion === "uso_comercial_servicios" || parsed.tipoInmueble === "bodega" || parsed.tipoInmueble === "local" || parsed.tipoInmueble === "oficina") {
    veredictoComercial =
      `Viabilidad comercial favorable en ${actMeta.nombre}: verificar únicamente ancho del perfil vial frente al predio y área neta de atención para confirmar escala permitida (barrial, zonal o metropolitana).`;
  } else if (parsed.objetivoEvaluacion === "remodelar_ampliar") {
    veredictoComercial =
      "Viabilidad de remodelación o ampliación estructural: permite reciclar o densificar la edificación existente respetando antejardín, empate volumétrico y aislamientos posteriores del Dec. 555/2021.";
  } else {
    veredictoComercial =
      tratamientoCode === "RENOVACION_URBANA"
        ? `Alto potencial constructor y de valorización residual (${tratMeta.nombre}): zona apta para desarrollo vertical o venta a constructora, potenciable mediante englobe si se busca superar el IC base.`
        : `Potencial constructivo equilibrado (${tratMeta.nombre}): apto para proyecto multifamiliar boutique o uso mixto de proximidad de ${pisosBase} a ${pisosMax} pisos.`;
  }

  // Alertas normativas, ambientales y patrimoniales
  const bicLevel: PotAlertLevel = sectorProfile.bicFlag || "BAJA";
  const rondaLevel: PotAlertLevel = sectorProfile.rondaFlag || "BAJA";
  const riesgoLevel: PotAlertLevel = liveGis.amenazaRemocion
    ? "ALTA"
    : sectorProfile.riesgoFlag || "BAJA";
  const vialLevel: PotAlertLevel = sectorProfile.vialFlag || "BAJA";

  const observacionesAlertas: string[] = [sectorProfile.notaSector];
  if (liveGis.proyectoRenoBo) {
    observacionesAlertas.push(
      `Predio localizado dentro de polígono de proyecto RenoBo: ${liveGis.proyectoRenoBo}.`
    );
  }
  if (liveGis.usoPredominanteManzana) {
    observacionesAlertas.push(
      `Uso predominante catastral reportado por IDECA en la manzana: ${liveGis.usoPredominanteManzana}.`
    );
  }

  const chipDisplay = liveGis.chip || parsed.chip || "No suministrado (consulta por sector/dirección)";
  const direccionDisplay =
    liveGis.direccionOficial || parsed.direccion || "No suministrada (análisis por sector/UPL)";
  const barrioDisplay = liveGis.barrioCatastral || parsed.barrioOSector || sectorProfile.barrioDisplay;
  const localidadDisplay = liveGis.localidad || sectorProfile.localidad;
  const uplDisplay =
    liveGis.uplCodigo && liveGis.uplNombre
      ? `${liveGis.uplCodigo} - ${liveGis.uplNombre}`
      : parsed.uplOUzpMentioned || sectorProfile.upl;
  const upzDisplay =
    liveGis.upzCodigo && liveGis.upzNombre
      ? `UPZ ${liveGis.upzCodigo} - ${liveGis.upzNombre}`
      : sectorProfile.upz;
  const sueloDisplay = liveGis.clasificacionSuelo || "Suelo Urbano (Bogotá D.C.)";
  const estratoNum = liveGis.estratoCatastral ?? sectorProfile.estratoTipico;
  const estratoDisplay = `Estrato ${estratoNum}${liveGis.estratoCatastral ? " (IDECA)" : " (referencial sector)"}`;

  const recomendacionesTecnicas: string[] = [
    `Descargar la Cédula Normativa oficial con el CHIP en SINUPOT (${SINUPOT_URL}) antes de estructurar promesa de compraventa o diseño arquitectónico.`,
    `Confirmar en Curaduría Urbana el perfil vial exacto (V-1 a V-9) del frente del predio, pues define la altura definitiva, antejardín y exigencia de parqueaderos/biciestacionamientos.`,
    frenteBase !== null && frenteBase < 10
      ? "Evaluar englobe con predio colindante para superar restricciones de frente, optimizar rampa de parqueaderos y capturar incentivos de edificabilidad del POT 555."
      : "Modelar cabida arquitectónica descontando aislamientos (3–5 m), antejardín y ~22% de circulaciones/puntos fijos para validar m² netos vendibles."
  ];
  if (bicLevel === "ALTA" || bicLevel === "MEDIA") {
    recomendacionesTecnicas.push(
      "Solicitar concepto previo ante el Instituto Distrital de Patrimonio Cultural (IDPC) si el predio o su colindante figuran como Bien de Interés Cultural (BIC)."
    );
  }

  const sourceLabel =
    liveGis.source === "IDECA_SINUPOT_LIVE"
      ? "IDECA / Catastro Bogotá + SINUPOT en vivo + POT Decreto 555 de 2021"
      : liveGis.source === "IDECA_LIVE"
      ? "IDECA / Catastro Bogotá en vivo + Matriz POT Decreto 555 de 2021"
      : "Matriz Normativa POT Decreto 555 de 2021 (Referencia SINUPOT / IDECA)";

  const volumetricLines = aplicaCalculo
    ? [
        `• *Área base del lote:* ${formatNumberCo(areaBase!)} m²${frenteBase ? ` (Frente: ${formatNumberCo(frenteBase)} m)` : ""}`,
        `• *Huella máxima ocupable Piso 1 (IO ${io}):* ~${formatNumberCo(ocupableP1!)} m²`,
        `• *Área máxima construible base (IC ${icBase}):* ~${formatNumberCo(construibleBase!)} m²`,
        `• *Techo construible con incentivos/cargas (IC ${icMax}):* ~${formatNumberCo(construibleMax!)} m²`,
        unidadesEstimadas ? `• *Estimación de unidades:* ${unidadesEstimadas}` : ""
      ]
        .filter(Boolean)
        .join("\n")
    : `• *Cálculo volumétrico:* Comparte el *área exacta del lote (m²)* y el *frente (m)* (o su CHIP AAA...) para estimar la huella máxima ocupable y los m² construibles.`;

  const whatsappSummary =
    `📐 *ANÁLISIS POT & NORMA URBANA — VECY BIENES RAÍCES* 🇨🇴\n` +
    `_(Fuente: ${sourceLabel})_\n\n` +
    `1️⃣ *IDENTIFICACIÓN URBANÍSTICA DEL PREDIO:*\n` +
    `• *CHIP:* ${chipDisplay}\n` +
    `• *Dirección:* ${direccionDisplay}\n` +
    `• *Barrio / Sector:* ${barrioDisplay} (*Localidad:* ${localidadDisplay})\n` +
    `• *UPL / UPZ:* ${uplDisplay} | ${upzDisplay}\n` +
    `• *Clasificación del Suelo:* ${sueloDisplay} | *${estratoDisplay}*\n` +
    (liveGis.areaConstruidaActualM2
      ? `• *Construcción actual (Catastro):* ${formatNumberCo(liveGis.areaConstruidaActualM2)} m²${liveGis.pisosExistentes ? ` (${liveGis.pisosExistentes} pisos)` : ""}\n`
      : "") +
    `\n2️⃣ *PARÁMETROS NORMATIVOS POT (DECRETO 555 DE 2021):*\n` +
    `• *Tratamiento Urbanístico:* ${tratMeta.nombre}\n` +
    `• *Área de Actividad:* ${actMeta.nombre}\n` +
    `• *Índice de Ocupación (IO máx):* ${io} (${Math.round(io * 100)}%)\n` +
    `• *Índice de Construcción (IC):* Base ${icBase} | Hasta ${icMax} con incentivos/cargas\n` +
    `• *Altura Máxima Estimada:* ${pisosBase} a ${pisosMax} pisos _(sujeta a frente y perfil vial)_\n` +
    `• *Tipología Edificatoria:* ${sectorProfile.tipologia}\n` +
    `• *Antejardín y Aislamientos:* Antejardín ${sectorProfile.antejardin}. Aislamiento posterior mín. 3.0 m a 5.0 m según altura (lateral desde 0 m en empate continuo o 3.0 m aislado).\n\n` +
    `3️⃣ *USOS DEL SUELO (POT 555):*\n` +
    `• *Permitidos Principales:* ${actMeta.usosPrincipales.slice(0, 3).join("; ")}.\n` +
    `• *Restringidos / Condicionados:* ${actMeta.usosRestringidos.slice(0, 2).join("; ")}.\n\n` +
    `4️⃣ *POTENCIAL CONSTRUCTIVO / COMERCIAL:*\n` +
    `${volumetricLines}\n` +
    `• *Análisis de Frente:* ${evaluacionFrente}\n` +
    `• *Veredicto Comercial:* ${veredictoComercial}\n\n` +
    `5️⃣ *ALERTAS NORMATIVAS Y AMBIENTALES:*\n` +
    `• *Reserva Vial:* ${vialLevel} | *Ronda Hídrica (EEP):* ${rondaLevel}\n` +
    `• *Riesgo / Remoción en Masa:* ${riesgoLevel}${liveGis.amenazaRemocion ? ` (${liveGis.amenazaRemocion})` : ""} | *Patrimonio BIC:* ${bicLevel}\n\n` +
    `🌐 *Validación Oficial en Línea:* SINUPOT (${SINUPOT_URL}) | Mapas Bogotá (${MAPAS_BOGOTA_URL})\n\n` +
    `⚠️ *Alerta de Riesgo Patrimonial y Urbanístico:* Este concepto preliminar orienta la prefactibilidad; antes de comprar, firmar promesa o radicar licencia, se debe validar la cédula normativa oficial y reserva vial exacta ante Curaduría Urbana / SDP.\n\n` +
    `📲 *Factibilidad Constructora y Consultoría Urbanística VECY:* Comunícate con *Eduardo A. Rivera* y *Jani Alves* en nuestra línea oficial de bróker: *${BROKER_OFFICIAL_PHONE}* (${BROKER_OFFICIAL_WHATSAPP_LINK}).`;

  return {
    querySummary: [chipDisplay, barrioDisplay, areaBase ? `${areaBase} m²` : ""].filter(Boolean).join(" | "),
    isSpecificPredio: parsed.isSpecificPredio,
    identificacion: {
      chip: chipDisplay,
      direccion: direccionDisplay,
      barrio: barrioDisplay,
      localidad: localidadDisplay,
      upl: uplDisplay,
      upz: upzDisplay,
      clasificacionSuelo: sueloDisplay,
      estrato: estratoDisplay,
      areaTerrenoM2: areaBase,
      areaConstruidaActualM2: liveGis.areaConstruidaActualM2 ?? null,
      frenteMetros: frenteBase,
      pisosActuales: liveGis.pisosExistentes ?? null
    },
    normaPot555: {
      decretoMarco: "Decreto Distrital 555 de 2021 (POT Bogotá Reverdece)",
      tratamientoCode,
      tratamientoNombre: tratMeta.nombre,
      tratamientoDetalle: tratMeta.detalle,
      areaActividadCode,
      areaActividadNombre: actMeta.nombre,
      indiceOcupacionMax: io,
      indiceConstruccionBase: icBase,
      indiceConstruccionMaxConIncentivos: icMax,
      alturaMaximaPisos: `${pisosBase} a ${pisosMax} pisos (sujeta a frente de lote y perfil vial)`,
      pisosEstimadosBase: pisosBase,
      pisosEstimadosMax: pisosMax,
      tipologiaEdificatoria: sectorProfile.tipologia,
      antejardinMinimo: sectorProfile.antejardin,
      aislamientos:
        "Aislamiento posterior mínimo 3.0 m a 5.0 m según altura; lateral 0 m en empate continuo o 3.0–4.0 m en tipología aislada.",
      usosPermitidosPrincipales: actMeta.usosPrincipales,
      usosRestringidosOCondicionados: actMeta.usosRestringidos
    },
    alertasYRestricciones: {
      reservaVial: {
        nivel: vialLevel,
        detalle:
          vialLevel === "MEDIA"
            ? "Posible afectación de paramento o ampliación sobre corredores arteriales (validar trazado exacto en SINUPOT / IDU)."
            : "Sin alerta preliminar de reserva vial mayor; corroborar línea de paramento en Curaduría Urbana."
      },
      rondaHidrica: {
        nivel: rondaLevel,
        detalle:
          rondaLevel === "ALTA"
            ? "Proximidad a Estructura Ecológica Principal / ZMPA / Humedal (franja no edificable de 30 m a 100 m según cuerpo hídrico)."
            : "Sin cruce directo con ronda hídrica mayor reportado en capa base; validar quebradas locales si aplica."
      },
      riesgoRemocionMasa: {
        nivel: riesgoLevel,
        detalle: liveGis.amenazaRemocion
          ? `Capa IDIGER reporta: ${liveGis.amenazaRemocion}. Requiere estudio geotécnico detallado para licencia.`
          : riesgoLevel === "MEDIA"
          ? "Sector cercano a pie de monte / ladera oriental; verificar zonificación geotécnica e IDIGER."
          : "Amenaza baja o sin restricción crítica reportada en capa base."
      },
      bienInteresCultural: {
        nivel: bicLevel,
        detalle:
          bicLevel === "ALTA"
            ? "Sector/Inmueble de Interés Cultural (SIC/BIC): toda intervención requiere anteproyecto aprobado por el IDPC."
            : bicLevel === "MEDIA"
            ? "Presencia puntual de inmuebles BIC en el sector: verificar en SINUPOT si el predio o sus colindantes son BIC."
            : "Sin declaratoria BIC generalizada en el sector (confirmar ficha individual en SINUPOT)."
      },
      observaciones: observacionesAlertas
    },
    potencialConstructivoYComercial: {
      aplicaCalculoVolumetrico: aplicaCalculo,
      areaLoteBaseM2: areaBase,
      frenteBaseMetros: frenteBase,
      areaMaximaOcupablePiso1M2: ocupableP1,
      areaMaximaConstruibleBaseM2: construibleBase,
      areaMaximaConstruibleIncentivosM2: construibleMax,
      unidadesEstimadasVivienda: unidadesEstimadas,
      evaluacionFrente,
      veredictoComercial,
      recomendacionesTecnicas
    },
    liveGis,
    enlacesOficiales: {
      sinupot: SINUPOT_URL,
      mapasBogota: MAPAS_BOGOTA_URL,
      ideca: IDECA_URL,
      curadurias: CURADURIAS_SDP_URL
    },
    whatsappSummary,
    analyzedAtIso: new Date().toISOString()
  };
}

/**
 * Orquestador end-to-end para WhatsApp (DM y Grupos):
 * 1. Discrimina solicitudes conceptuales vs análisis real de predio/sector.
 * 2. Consulta IDECA / Catastro Bogotá / SINUPOT en vivo (con fallback determinístico a POT 555).
 * 3. Si es un predio específico (CHIP/dirección/lote), genera Concepto en PDF Membretado de VECY.
 */
export async function analyzePotUrbanNormFromWhatsAppInput(params: {
  text?: string | null;
  requesterName?: string | null;
  enableLiveGis?: boolean;
}): Promise<PotWhatsAppExecutionResult> {
  const cleanText = stripMentions(params.text);
  const parsed = parsePotUrbanQuery(cleanText);

  if (!parsed.isPotRequest) {
    return {
      isPotRequest: false,
      needsPredioGuidance: false,
      responseText: "",
      reactionEmoji: ""
    };
  }

  if (parsed.needsPredioGuidance) {
    return {
      isPotRequest: true,
      needsPredioGuidance: true,
      reactionEmoji: "📐",
      responseText:
        `📐 *ANÁLISIS POT & NORMA URBANA EN VIVO (SINUPOT / IDECA) — VECY BIENES RAÍCES* 🇨🇴\n\n` +
        `Con el mayor gusto reviso la norma urbanística (Decreto 555 de 2021) y el potencial constructivo o comercial de tu predio.\n\n` +
        `Para generar tu análisis completo y el *Concepto Preliminar en PDF Membretado*, envíame por favor uno o varios de estos datos:\n` +
        `1️⃣ *Código CHIP* del predio (ej: \`AAA0058EEXS\`).\n` +
        `2️⃣ *Dirección exacta* en Bogotá (ej: \`Calle 85 # 12-40\`) o *Barrio / UPL / UPZ*.\n` +
        `3️⃣ *Área del lote (m²) y frente (m)* junto con el objetivo (construir pisos, remodelar o habilitar uso comercial/bodega/oficina).\n\n` +
        `🌐 También puedes consultar tu cédula oficial directamente en SINUPOT: ${SINUPOT_URL}\n` +
        `📲 Para factibilidad constructora formal con nuestros directores: *${BROKER_OFFICIAL_PHONE}* (${BROKER_OFFICIAL_WHATSAPP_LINK}).`
    };
  }

  const liveGis = await queryIdecaAndSinupotLive(parsed, {
    enableLiveGis: params.enableLiveGis
  });

  const report = buildPotUrbanNormReport(parsed, liveGis);

  let pdfBuffer: Buffer | undefined;
  let pdfFileName: string | undefined;

  if (report.isSpecificPredio) {
    try {
      const pdfRes = await generatePotUrbanNormPdf(report, {
        requestedBy: params.requesterName || undefined
      });
      pdfBuffer = pdfRes.pdfBuffer;
      pdfFileName = pdfRes.fileName;
    } catch (pdfErr: any) {
      console.warn("[potUrbanNormService] Error generando PDF POT:", pdfErr?.message || pdfErr);
    }
  }

  const pdfNotice =
    pdfBuffer && pdfFileName
      ? `\n\n📄 *Adjunto:* Concepto Preliminar de Norma Urbana y Prefactibilidad POT en PDF Membretado (*${pdfFileName}*).`
      : "";

  return {
    isPotRequest: true,
    needsPredioGuidance: false,
    report,
    responseText: `${report.whatsappSummary}${pdfNotice}`,
    reactionEmoji: "📐",
    pdfBuffer,
    pdfFileName
  };
}

