/**
 * 🏢 VECY NETWORK — SERVICIO DE ENTREVISTA MINUCIOSA Y PERFILAMIENTO INMOBILIARIO
 * Doctrina Fundacional de Eduardo A. Rivera (v33.79 — Octubre 2026)
 *
 * "Estamos perdiendo clientes; lo correcto es que JanIA primero lo salude cálidamente
 * por su nombre, valore la oportunidad, y luego le haga las preguntas correspondientes
 * acerca de lo que busca su cliente (área aproximada, habitaciones exactas, piso y altura,
 * exterior/interior, baños, antigüedad, parqueaderos independientes/lineales, tipo de cocina,
 * balcón, chimenea, depósito, amenidades del conjunto/edificio, presupuesto real, si es en
 * efectivo o crédito aprobado y con qué banco, cuota de administración y zonas alternativas).
 * 
 * Mientras los requerimientos sean tan sencillos y escuetos, hay que aterrizar al agente
 * con señorío profesional, haciéndole ver que no podemos salir a improvisar visitas ni hacerle
 * perder el tiempo a su cliente, y recomendarle que indague a fondo lo que su comprador busca.
 * Y así lo debe saber hacer JanIA para cada tipo de propiedad."
 */

import { extractFirstName } from "./parsers";
import { resolveNameAndGender, extractIntroducedName } from "../nameAndGenderResolver";
import { getGreetingByTime } from "../whatsapp-utils";

export interface RequirementProfilingAnalysis {
  isRequirement: boolean;
  isIncompleteOrHollow: boolean;
  propertyType: "apartamento" | "casa" | "lote" | "bodega" | "oficina" | "finca" | "general";
  transactionType: "compra" | "arriendo";
  zoneOrSector: string;
  hasBudgetFigures: boolean;
  hasBedrooms: boolean;
  hasArea: boolean;
  hasFinancingDetails: boolean;
  isAgentRepresentingClient: boolean;
  missingPoints: string[];
}

/**
 * Analiza un texto para determinar si contiene un requerimiento inmobiliario y si es escueto/incompleto.
 */
export function analyzeRequirementCompleteness(text: string): RequirementProfilingAnalysis {
  const clean = (text || "").trim();
  const lower = clean.toLowerCase();

  // 1. Detección de requerimiento o búsqueda inmobiliaria
  const hasReqKeywords = /\b(?:tengo\s+(?:un\s+)?cliente(?:\s+que\s+busca|\s+buscando|\s+para|\s+interesado)?|cliente\s+(?:buscando|busca|interesado|para)|(?:estoy\s+)?buscando\s+(?:un\s+|una\s+)?(?:apartamento|apto|casa|bodega|oficina|lote|finca|local|inmueble|propiedad)|(?:necesito|requiero|se\s+busca|busco)\s+(?:un\s+|una\s+)?(?:apartamento|apto|casa|bodega|oficina|lote|finca|local|inmueble|propiedad)|escribo\s+para\s+probar\s+(?:el\s+)?servicio.*(?:cliente|busco|inmueble))\b/i.test(lower);

  if (!hasReqKeywords) {
    return {
      isRequirement: false,
      isIncompleteOrHollow: false,
      propertyType: "general",
      transactionType: "compra",
      zoneOrSector: "",
      hasBudgetFigures: false,
      hasBedrooms: false,
      hasArea: false,
      hasFinancingDetails: false,
      isAgentRepresentingClient: false,
      missingPoints: []
    };
  }

  // 2. Detección de si es un colega/agente representando a un cliente
  const isAgentRepresentingClient = /\b(?:tengo\s+(?:un\s+)?cliente|mi\s+cliente|para\s+(?:un\s+)?cliente|cliente\s+buscando|att\.?|atentamente|asesor|broker|inmobiliaria)\b/i.test(lower);

  // 3. Tipología de propiedad
  let propertyType: "apartamento" | "casa" | "lote" | "bodega" | "oficina" | "finca" | "general" = "apartamento";
  if (/\b(?:casa|casas|casa-lote|townhouse)\b/i.test(lower)) {
    propertyType = "casa";
  } else if (/\b(?:lote|lotes|terreno|terrenos|predio\s+rural|solar)\b/i.test(lower)) {
    propertyType = "lote";
  } else if (/\b(?:bodega|bodegas|parque\s+industrial|nave\s+industrial|almac[eé]n)\b/i.test(lower)) {
    propertyType = "bodega";
  } else if (/\b(?:oficina|oficinas|local|locales|consultorio|consultorios)\b/i.test(lower)) {
    propertyType = "oficina";
  } else if (/\b(?:finca|fincas|hacienda|parcela|predio\s+campestre)\b/i.test(lower)) {
    propertyType = "finca";
  } else if (/\b(?:apartamento|apto|aptos|apartamentos|penthouse|loft|estudio)\b/i.test(lower)) {
    propertyType = "apartamento";
  }

  // 4. Tipo de negocio (compra vs arriendo)
  let transactionType: "compra" | "arriendo" = "compra";
  if (/\b(?:arriendo|alquiler|arrendar|canon)\b/i.test(lower)) {
    transactionType = "arriendo";
  }

  // 5. Detección de zona / barrio
  let zoneOrSector = "";
  const zoneMatch = lower.match(/\ben\s+([a-záéíóúñ\s]{3,30})(?:,|\.|\bconjunto|\bcuenta|\bpresupuesto|$)/i);
  if (zoneMatch && zoneMatch[1]) {
    const rawZone = zoneMatch[1].trim()
      .replace(/\b(?:conjunto|con|para|de|ya|que|recursos|efectivo)\b.*$/i, "")
      .trim();
    if (rawZone.length >= 3 && !/^(?:venta|arriendo|bogota|bogotá|colombia)$/i.test(rawZone)) {
      zoneOrSector = rawZone
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }
  if (!zoneOrSector && /\bvilla\s+magdala\b/i.test(lower)) {
    zoneOrSector = "Villa Magdala";
  }

  // 6. Evaluación de completitud
  // Presupuesto con cifras numéricas reales (ej. 500 millones, $800M, 4.5M, etc.)
  const hasBudgetFigures = /\b(?:\$\s*\d+|\d+\s*(?:millones|millon|millón|mil|k|m)\b|\d{6,11})/i.test(lower);
  
  // Alcobas / habitaciones
  const hasBedrooms = /\b(?:\d+\s*(?:alcobas?|habitaci[oó]n(?:es)?|habs?|piezas?)|(?:una|dos|tres|cuatro)\s*(?:alcobas?|habitaciones))\b/i.test(lower);

  // Área m²
  const hasArea = /\b(?:\d+\s*(?:m2|mts2?|metros(?:\s+cuadrados)?))\b/i.test(lower);

  // Detalles financieros / forma de pago
  const hasFinancingDetails = /\b(?:cr[eé]dito\s+(?:aprobado|hipotecario)|leasing|banco|contado|efectivo\s+\d+|recursos\s+propios\s+\d+)/i.test(lower);

  const missingPoints: string[] = [];
  if (!hasBudgetFigures) missingPoints.push("Presupuesto en cifras numéricas");
  if (!hasBedrooms && (propertyType === "apartamento" || propertyType === "casa" || propertyType === "finca")) {
    missingPoints.push("Número exacto de habitaciones");
  }
  if (!hasArea) missingPoints.push("Área aproximada en m²");
  if (!hasFinancingDetails) missingPoints.push("Forma de pago y estado de crédito/efectivo");

  // Es incompleto o escueto si le falta presupuesto numérico o habitaciones/área
  const isIncompleteOrHollow = !hasBudgetFigures || !hasBedrooms || !hasArea;

  return {
    isRequirement: true,
    isIncompleteOrHollow,
    propertyType,
    transactionType,
    zoneOrSector,
    hasBudgetFigures,
    hasBedrooms,
    hasArea,
    hasFinancingDetails,
    isAgentRepresentingClient,
    missingPoints
  };
}

export interface ProfilingInterviewOptions {
  displayName?: string;
  timeSalutation?: string;
  propertyType?: "apartamento" | "casa" | "lote" | "bodega" | "oficina" | "finca" | "general";
  transactionType?: "compra" | "arriendo";
  zoneOrSector?: string;
  isAgent?: boolean;
  rawUserText?: string;
}

/**
 * Construye la entrevista minuciosa, estructurada y pedagógica de JanIA
 * para aterrizar al colega o usuario y perfilar al 100% el requerimiento.
 */
export function buildDetailedProfilingInterview(options: ProfilingInterviewOptions): string {
  const timeSalutation = options.timeSalutation || getGreetingByTime();
  const displayName = options.displayName ? options.displayName.trim() : "";
  const propType = options.propertyType || "apartamento";
  const txType = options.transactionType || "compra";
  const zone = options.zoneOrSector || "";
  const isAgent = options.isAgent !== false;

  const greetingHeader = `¡${timeSalutation}${displayName ? `, ${displayName}` : ""}! 👋`;

  let sectorPraise = "";
  if (zone) {
    sectorPraise = `¡Excelente oportunidad! **${zone}** es una zona de gran proyección y alta demanda en nuestro mercado inmobiliario. 🏙️✨\n\n`;
  } else {
    sectorPraise = `¡Excelente iniciativa! Qué alegría saludarte y conocer la búsqueda de tu cliente. 🤝✨\n\n`;
  }

  // 1. Mensaje de aterrizaje profesional y señorío doctrinario
  let pedagogyIntro = "";
  if (isAgent) {
    pedagogyIntro =
      `Ahora bien, colega: para que el motor de cruces (**MATCH**) de nuestra red **VECY BIENES RAÍCES** funcione con máxima efectividad y encontremos exactamente la propiedad que enamore a tu cliente sin hacerle perder tiempo en visitas infructuosas que luego descarte, **no podemos radicar un requerimiento tan genérico o escueto**.\n\n` +
      `En finca raíz de alto rendimiento, un buen asesor debe aterrizar y conocer a fondo lo que su comprador anhela y necesita antes de salir a buscar al mercado. Así cerramos negocios con rapidez y total solvencia. 💼✨\n\n` +
      `Para estructurar una ficha técnica impecable y activar de inmediato el cruce certero en nuestra red, por favor consúltale a tu cliente (o si ya los tienes claros, compárteme) estos puntos clave indispensables:\n\n`;
  } else {
    pedagogyIntro =
      `Para que nuestro motor de cruces (**MATCH**) en **VECY BIENES RAÍCES** filtre con precisión milimétrica y encontremos la propiedad perfecta para ti sin hacerte perder tiempo en visitas que no se ajusten a lo que buscas, necesitamos perfilar tu búsqueda en detalle.\n\n` +
      `Por favor compárteme estos datos clave indispensables:\n\n`;
  }

  // 2. Batería de preguntas según el tipo de propiedad
  let questionsBody = "";

  switch (propType) {
    case "apartamento": {
      questionsBody =
        `💰 **1. Presupuesto y Capacidad Financiera (Crucial):**\n` +
        `• ¿Cuál es el presupuesto máximo de ${txType} en pesos colombianos (COP)?\n` +
        `• ${txType === 'compra' ? '¿Cuenta con el 100% de los recursos en efectivo de contado, o incluye crédito hipotecario / leasing habitacional? Si es con crédito: ¿cuánto tiene preaprobado o aprobado, con qué banco, y con cuánto efectivo real cuenta para la cuota inicial y gastos de escrituración?' : '¿Qué presupuesto mensual tiene disponible y cuenta con codeudor solvente o póliza de arrendamiento (Fianza / Aseguradora)?'}\n` +
        `• ¿De cuánto es el valor mensual de la cuota de administración que busca o está dispuesto a pagar?\n\n` +
        `🛏️ **2. Espacios y Distribución (Regla de Coincidencia Exacta VECY):**\n` +
        `• ¿Área construida aproximada en m²?\n` +
        `• ¿Cuántas habitaciones exactas requiere? *(En VECY la coincidencia en alcobas es estricta: 1=1, 2=2, 3=3; no aproximamos habitaciones)*.\n` +
        `• ¿Cuántos baños completos y si requiere baño social adicional?\n` +
        `• ¿Cuántos parqueaderos necesita y de qué tipo (independientes o lineales cubiertos)? ¿Requiere depósito / cuarto útil?\n\n` +
        `🏢 **3. Altura, Iluminación y Confort Interior:**\n` +
        `• ¿En qué rango de pisos le interesa (piso bajo 1-3, intermedio 4-7, o alto 8+ con vista)? ¿Es indispensable que cuente con ascensor?\n` +
        `• ¿Lo busca exterior (con vista y buena entrada de sol de mañana o tarde) o interior tranquilo?\n` +
        `• ¿Qué antigüedad máxima del edificio o conjunto está dispuesto a tolerar?\n` +
        `• ¿Qué tipo de cocina quiere su cliente? *(¿Abierta tipo americano con barra o isla, o cerrada tradicional e independiente? ¿Integral moderna o clásica?)*.\n` +
        `• ¿Desea balcón, terraza o chimenea?\n\n` +
        `🏊‍♂️ **4. Conjunto Residencial y Amenidades:**\n` +
        `• ¿Qué amenidades y zonas comunes anhela que tenga el conjunto? *(Gimnasio dotado, salón social comunal, parque infantil, zonas húmedas / sauna / turco, sala de juegos, coworking, zonas verdes, parqueadero de visitantes)*.\n\n` +
        `📍 **5. Ubicación y Alternativas:**\n` +
        `• ¿La búsqueda está cerrada exclusivamente a ${zone || 'esta zona'}, o si aparece una excelente opción en sectores aledaños le interesaría considerarla?`;
      break;
    }

    case "casa": {
      questionsBody =
        `💰 **1. Presupuesto y Capacidad Financiera:**\n` +
        `• ¿Cuál es el presupuesto máximo de ${txType} en pesos colombianos (COP)?\n` +
        `• ¿La compra es 100% de contado o requiere crédito hipotecario / leasing habitacional (cuánto aprobado y en qué banco)?\n` +
        `• Si es en conjunto cerrado, ¿cuál es el tope de cuota de administración mensual que busca?\n\n` +
        `🏡 **2. Niveles, Áreas y Espacios:**\n` +
        `• ¿De cuántos niveles o pisos busca la casa (1, 2 o 3 niveles)? ¿Requiere alcoba principal en el primer piso?\n` +
        `• ¿Área construida aproximada en m² y área de lote o jardín privado?\n` +
        `• ¿Cuántas habitaciones y baños exactos requiere?\n` +
        `• ¿Cuántos parqueaderos necesita (cubiertos o descubiertos)?\n` +
        `• ¿Requiere patio interior, zona de BBQ, estudio o cuarto y baño de servicio (CBS)?\n\n` +
        `🌳 **3. Entorno, Seguridad y Cocina:**\n` +
        `• ¿La busca en conjunto cerrado con vigilancia 24/7 y amenidades (piscina, club house, canchas), o casa tradicional independiente sobre vía residencial?\n` +
        `• ¿Qué tipo de cocina anhela (abierta con isla o cerrada tradicional)?\n` +
        `• ¿Zonas aledañas o municipios vecinos que también esté dispuesto a contemplar?`;
      break;
    }

    case "lote": {
      questionsBody =
        `💰 **1. Presupuesto y Destinación:**\n` +
        `• ¿Cuál es el presupuesto máximo de compra en pesos colombianos (COP)?\n` +
        `• ¿El pago es de contado o contempla alguna figura mixta / permuta?\n` +
        `• ¿Cuál es la vocación o uso proyectado del lote (construcción de vivienda unifamiliar/campestre, desarrollo inmobiliario multifamiliar en altura, comercial o industrial)?\n\n` +
        `📐 **2. Metraje y Topografía:**\n` +
        `• ¿Área mínima requerida en m² o hectáreas/fanegadas?\n` +
        `• ¿Topografía indispensable: plano, semiplano o con pendiente moderada?\n\n` +
        `🏛️ **3. Norma Urbanística y Servicios:**\n` +
        `• Si es urbano: ¿qué norma POT o índice de ocupación/construcción y alturas requiere?\n` +
        `• ¿Cuenta con disponibilidad inmediata de servicios públicos (agua, energía, gas, alcantarillado)?\n` +
        `• ¿Vía de acceso pavimentada indispensable? ¿Requiere que esté dentro de parcelación cerrada?`;
      break;
    }

    case "bodega": {
      questionsBody =
        `💰 **1. Presupuesto y Operación:**\n` +
        `• ¿Cuál es el presupuesto de compra o canon mensual de arriendo en COP (+ administración de parque industrial)?\n` +
        `• ¿Para qué tipo de actividad se usará (almacenamiento, logística, manufactura, alimentos o comercio)?\n\n` +
        `🏗️ **2. Especificaciones Técnicas y Carga:**\n` +
        `• ¿Área total requerida (desglosada en área libre de bodega + área de oficinas administrativas)?\n` +
        `• ¿Qué altura libre a cumbrera/cercha necesita (ej. 7m, 9m, 12m)?\n` +
        `• ¿Qué capacidad eléctrica en KVA o subestación requiere para su maquinaria?\n` +
        `• ¿Resistencia de piso mínima exigida (ej. 4 a 8 toneladas por m²)?\n\n` +
        `🚛 **3. Logística, Accesos y Seguridad:**\n` +
        `• ¿Cuántos muelles de carga requiere (a nivel o deprimidos con plataforma niveladora)?\n` +
        `• ¿Requiere patio de maniobras para tractomulas o camiones pesados?\n` +
        `• ¿La busca en parque empresarial/industrial cerrado con vigilancia 24/7 o bodega independiente?`;
      break;
    }

    case "oficina": {
      questionsBody =
        `💰 **1. Presupuesto y Condiciones:**\n` +
        `• ¿Cuál es el presupuesto de compra o canon de arriendo mensual en COP (+ cuota de administración)?\n` +
        `• ¿Qué actividad comercial, profesional o de servicios se desarrollará?\n\n` +
        `🏢 **2. Área, Distribución y Acabados:**\n` +
        `• ¿Área aproximada en m²?\n` +
        `• ¿La prefiere en planta libre para adecuar, o ya adecuada con divisiones, salas de juntas y cableado estructurado?\n` +
        `• ¿Batería de baños privada interna o comunal por piso?\n` +
        `• ¿Piso alto con vista e iluminación natural? ¿Ascensores inteligentes?\n\n` +
        `🚗 **3. Parqueaderos y Acceso:**\n` +
        `• ¿Cuántos garajes privados fijos necesita y requiere parqueadero de visitantes para clientes?\n` +
        `• ¿En qué edificios o corredores empresariales específicos le interesa?`;
      break;
    }

    case "finca": {
      questionsBody =
        `💰 **1. Presupuesto y Vocación:**\n` +
        `• ¿Cuál es el presupuesto máximo de compra en pesos colombianos (COP)?\n` +
        `• ¿Cuál es la vocación principal: descanso/recreo familiar, agroturismo, ganadería o agricultura/cultivos?\n\n` +
        `🌄 **2. Extensión, Clima y Terreno:**\n` +
        `• ¿Extensión requerida en fanegadas, hectáreas o m²?\n` +
        `• ¿Clima deseado (cálido, templado o frío) y distancia/tiempo máximo de viaje desde la ciudad principal?\n` +
        `• ¿Topografía plana, ondulada o mixta?\n\n` +
        `💧 **3. Fuentes Hídricas e Infraestructura:**\n` +
        `• ¿Cuenta con nacedero de agua propio, reservorio, quebrada o acueducto veredal?\n` +
        `• ¿Qué construcciones requiere (casa principal amoblada, casa de mayordomo, pesebreras, galpones, piscina)?\n` +
        `• ¿Estado de la vía de acceso (pavimentada o placa huella)?`;
      break;
    }

    default: {
      questionsBody =
        `💰 **1. Presupuesto y Finanzas:** Presupuesto máximo en COP, forma de pago (efectivo vs crédito aprobado/banco) y tope de administración.\n` +
        `📐 **2. Dimensiones y Espacios:** Área aproximada en m², habitaciones y baños exactos, y parqueaderos indispensables.\n` +
        `🏢 **3. Confort y Acabados:** Piso, vista exterior/interior, tipo de cocina, balcón y amenidades del conjunto.\n` +
        `📍 **4. Zonas:** Barrio exacto y sectores aledaños alternativos que acepte.`;
      break;
    }
  }

  // 3. Cierre y llamado a la acción comercial colaborativo (40/20/40) y solicitud persuasiva de reseña en Google
  const googleReviewCta = `\n\n⭐ *Por cierto, ${displayName || (isAgent ? 'colega' : 'amigo/a')}: como estás probando en vivo la tecnología de JanIA para el gremio, ¿nos regalarías tu calificación de 5 estrellas y un comentario en Google para seguir impulsando la red?* 👉 https://g.page/r/CctNbwU6UpX5EBM/review ⭐⭐⭐⭐⭐`;

  const closingCta =
    `\n\n${isAgent ? 'Consúltale estos puntos clave a tu cliente (o si ya los tienes en mente, compártemelos por aquí punto a punto o en una nota de voz). 🎙️📲\n\n' : 'Compárteme estos datos por aquí o en una nota de voz para estructurar tu búsqueda. 🎙️📲\n\n'}` +
    `Con este perfil 100% afinado, activamos de inmediato el radar de **MATCH** en la red de **VECY BIENES RAÍCES** para encontrar la opción soñada y cerrar este negocio juntos${isAgent ? ' bajo nuestro modelo colaborativo **40/20/40**' : ''}. 🤝🚀` +
    googleReviewCta;

  return `${greetingHeader}\n\n${sectorPraise}${pedagogyIntro}${questionsBody}${closingCta}`;
}
