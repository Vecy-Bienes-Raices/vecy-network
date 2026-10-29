/**
 * VECY NETWORK — Real Estate Marketing Engine v33.42
 * Biblioteca de 10 Habilidades Especializadas de Marketing Inmobiliario
 * Metodología Inbound Inmobiliaria VECY adaptada 100% al corretaje colombiano.
 */

export interface PropertyMarketingAuditResult {
  score: number; // 0 a 100
  dimensions: {
    claridadPropuestaValor: { score: number; feedback: string }; // Peso 15%
    perfilClienteIdeal: { score: number; feedback: string }; // Peso 10%
    diferenciacionSwapTest: { score: number; feedback: string }; // Peso 15%
    datosTecnicosCompletos: { score: number; feedback: string }; // Peso 15%
    precioYMetrajeHomologado: { score: number; feedback: string }; // Peso 10%
    entornoYConectividad: { score: number; feedback: string }; // Peso 10%
    pruebaSocialYConfianza: { score: number; feedback: string }; // Peso 5%
    llamadoALaAccionCTA: { score: number; feedback: string }; // Peso 10%
    escaneabilidadYFormato: { score: number; feedback: string }; // Peso 5%
    atractivoVisualYMultimedia: { score: number; feedback: string }; // Peso 5%
  };
  fortalezas: string[];
  oportunidadesMejora: string[];
  fichaOptimizadaSugerida: string;
}

export interface RealEstateIcpProfile {
  arquetipo: string; // ej: "Inversionista de Renta Corta", "Familia en Expansión", "Empresario Logístico"
  nivelIngresosEstrato: string;
  motivadoresPrincipales: string[];
  doloresYObjecionesFrecuentes: string[];
  criteriosNoNegociables: string[];
  canalesEfectivos: string[];
}

/**
 * 1. ICP BUILDER INMOBILIARIO
 * Genera el perfil de cliente ideal para un inmueble o requerimiento.
 */
export function buildRealEstateIcp(tipoInmueble: string, tipoNegocio: string, barrioOCiudad: string, precioOCanon: number, caracteristicas: string = ""): RealEstateIcpProfile {
  const tLower = (tipoInmueble || "").toLowerCase();
  const isArriendo = (tipoNegocio || "").toLowerCase().includes("arriendo");
  const cLower = caracteristicas.toLowerCase();

  if (tLower.includes("lote") || tLower.includes("bodega") || tLower.includes("edificio")) {
    return {
      arquetipo: "Constructor, Desarrollador o Inversionista Corporativo",
      nivelIngresosEstrato: "Corporativo / Inversionista Institucional o Patrimonial",
      motivadoresPrincipales: [
        "Edificabilidad e índice de ocupación bajo POT (Dec. 555/2021)",
        "Uso del suelo comercial/industrial y capacidad eléctrica/vial",
        "Retorno de inversión (Cap Rate y Plusvalía de desarrollo)"
      ],
      doloresYObjecionesFrecuentes: [
        "Incertidumbre jurídica en licencias o afectaciones viales",
        "Tiempos muertos de preventa o tramitología curaduría",
        "Sobrecostos en adecuaciones de servicios públicos"
      ],
      criteriosNoNegociables: [
        "Uso del suelo compatible y CHIP catastral saneado",
        "CTL libre de embargos o hipotecas no negociadas",
        "Acceso para transporte de carga o vías principales"
      ],
      canalesEfectivos: ["Grupos especializados VECY", "Contacto directo con directores VECY 3166569719", "Fichas técnicas ejecutivas"]
    };
  }

  if (tLower.includes("local") || tLower.includes("oficina")) {
    return {
      arquetipo: "Comerciante, Marca en Expansión o Profesional Independiente",
      nivelIngresosEstrato: "Comercial / Empresa Mediana",
      motivadoresPrincipales: [
        "Tráfico peatonal y vehicular de la zona",
        "Visibilidad de fachada y vitrina",
        "Relación canon vs. ventas esperadas"
      ],
      doloresYObjecionesFrecuentes: [
        "Valor alto de administración de conjunto o centro comercial",
        "Restricciones de horarios de operación",
        "Pólizas de seguro de arrendamiento estrictas"
      ],
      criteriosNoNegociables: [
        "Uso comercial permitido",
        "Capacidad de parqueo para clientes",
        "Punto de agua/baño privado"
      ],
      canalesEfectivos: ["Marketplace WhatsApp", "Portales aliados", "Cruces de demanda en red VECY"]
    };
  }

  // Vivienda residencial
  if (isArriendo) {
    return {
      arquetipo: "Familia o Ejecutivo en Arriendo buscando Calidad de Vida",
      nivelIngresosEstrato: "Ingresos demostrables 2.5x a 3x del canon",
      motivadoresPrincipales: [
        "Cercanía a lugares de trabajo, colegios y transporte masivo",
        "Seguridad del sector y conjunto cerrado",
        "Espacios bien distribuidos, cocina cómoda e iluminación"
      ],
      doloresYObjecionesFrecuentes: [
        "Demoras en aseguradoras (Sura, Fianza, El Libertador)",
        "Incrementos desproporcionados de canon o cuota extraordinaria",
        "Falta de mantenimiento previo por parte del dueño"
      ],
      criteriosNoNegociables: [
        "Canon + administración dentro de presupuesto exacto",
        "Parqueadero propio cubierto",
        "Mascotas permitidas (si aplica)"
      ],
      canalesEfectivos: ["Fichas estandarizadas Grupo 1 VECY", "Canales de difusión", "Portales de finca raíz"]
    };
  }

  return {
    arquetipo: "Comprador de Vivienda para Hogar o Inversión Patrimonial",
    nivelIngresosEstrato: "Estrato medio-alto con capacidad de crédito hipotecario o recursos propios",
    motivadoresPrincipales: [
      "Patrimonio familiar y valorización constante de la zona",
      "Confort, tranquilidad acústica y amenidades (gimnasio, zonas verdes)",
      "Seguridad jurídica en el título de propiedad"
    ],
    doloresYObjecionesFrecuentes: [
      "Miedo a comprar con vicios ocultos o problemas de tradición",
      "Trámites lentos en bancos y notarías",
      "Precios inflados fuera de la realidad de mercado"
    ],
    criteriosNoNegociables: [
      "Documentación saneada (Escritura, CTL, Paz y Salvo)",
      "Habitaciones y baños suficientes para la familia",
      "Precio justo validado con sondeo comercial"
    ],
    canalesEfectivos: ["Red colaborativa VECY 40/20/40", "Mesa de Coincidencias", "Portales aliados"]
  };
}

/**
 * 2. EL SWAP TEST INMOBILIARIO (Diferenciación y Posicionamiento Único)
 * Evalúa si una descripción inmobiliaria es un cliché intercambiable o posee diferenciación real.
 */
export function evaluateSwapTest(description: string): { passes: boolean; clichesFound: string[]; suggestion: string } {
  const cliches: string[] = [];
  const textLower = (description || "").toLowerCase();

  const commonCliches = [
    { pattern: /\blindo(?:\s+apartamento|\s+apto|\s+inmueble)?\b/i, name: "lindo apartamento/apto" },
    { pattern: /\bexcelente\s+ubicaci[oó]n\b/i, name: "excelente ubicación" },
    { pattern: /\bmagn[ií]fica\s+oportunidad\b/i, name: "magnífica oportunidad" },
    { pattern: /\bgran\s+oportunidad\b/i, name: "gran oportunidad" },
    { pattern: /\bmuy\s+iluminado\b/i, name: "muy iluminado" },
    { pattern: /\bacogedor\b/i, name: "acogedor" },
    { pattern: /\bhermoso\b/i, name: "hermoso" },
    { pattern: /\bpara\s+estrenar\b/i, name: "para estrenar (sin año exacto)" }
  ];

  for (const c of commonCliches) {
    if (c.pattern.test(textLower)) {
      cliches.push(c.name);
    }
  }

  const hasSpecificDifferentiators = 
    /\b(?:vista\s+a\s+los\s+cerros|vista\s+panor[aá]mica|remodelado\s+en\s+\d{4}|piso\s+\d+|acabados\s+en\s+madera|terraza\s+de\s+\d+\s*m|patio\s+privado|dep[oó]sito\s+amplio|parqueadero\s+independiente|doble\s+lineal|altura\s+libre|trif[aá]sica|canon\s+incluye\s+adm[oó]n)\b/i.test(textLower);

  const passes = cliches.length <= 1 && hasSpecificDifferentiators;

  return {
    passes,
    clichesFound: cliches,
    suggestion: passes 
      ? "La descripción tiene diferenciación sólida y pasa el Swap Test inmobiliario."
      : "Alerta de Swap Test: La descripción contiene clichés genéricos que cualquier otro apartamento podría usar. Sustitúyelos por hechos medibles (ej: 'vista exterior protegida hacia parque', 'cocina tipo isla remodelada en 2023', 'parqueadero cubierto independiente sin servidumbre')."
  };
}

/**
 * 3. AUDITORÍA DE ANUNCIO INMOBILIARIO (Score 0 a 100)
 * Evalúa una ficha de oferta o demanda en 10 dimensiones con recomendaciones tácticas.
 */
export function auditPropertyListing(rawText: string): PropertyMarketingAuditResult {
  const text = rawText || "";
  const tLower = text.toLowerCase();

  // Dimensiones
  const hasPrice = /\$?\s*\d{1,3}(?:[.,]\d{3})*(?:\s*(?:millones|mlls|pesos|cop))?/i.test(text) && !/^\s*\$\s*0\s*$/.test(text);
  const hasArea = /\b\d+(?:[.,]\d+)?\s*(?:m2|mts|metros)\b/i.test(text);
  const hasRooms = /\b\d+\s*(?:alcobas|habitaciones|habs|alc)\b/i.test(text);
  const hasBaths = /\b\d+\s*(?:ba[ñn]os?|baths?)\b/i.test(text);
  const hasGarages = /\b(?:\d+\s*(?:garajes?|parqueaderos?|parq)|sin\s+garaje)\b/i.test(text);
  const hasBarrioOrCity = /\b(?:bogot[aá]|medell[ií]n|cali|chaparral|chiflas|cedritos|choc[oó]|chic[oó]|rosales|salitre|usaqu[eé]n|suba|pablo\s+vi|colina|santa\s+b[aá]rbara|fontib[oó]n|engativ[aá]|norte|sur)\b/i.test(tLower);
  const hasAdmin = /\b(?:adm[oó]n|administraci[oó]n|cuota)\b/i.test(tLower);
  const hasContact = /\b(?:\+?57\s*)?3\d{2}[-\s]?\d{3}[-\s]?\d{4}\b/.test(text) || /\bcontacto\b/i.test(tLower);
  const swapResult = evaluateSwapTest(text);

  let score = 0;
  const fortalezas: string[] = [];
  const oportunidades: string[] = [];

  // 1. Claridad Propuesta de Valor (15 pts)
  let sVal = 0;
  if (/\b(?:venta|arriendo|alquiler|permuta)\b/i.test(tLower)) sVal += 10;
  if (/\b(?:apartamento|casa|local|bodega|oficina|lote|edificio)\b/i.test(tLower)) sVal += 5;
  if (sVal === 15) fortalezas.push("Tipo de negocio y de inmueble perfectamente definidos");
  else oportunidades.push("Especificar de forma inmediata si es Venta o Arriendo y el tipo de inmueble exacto");
  score += sVal;

  // 2. Perfil Cliente Ideal (10 pts)
  let sIcp = 0;
  if (/\b(?:ideal\s+para|para\s+familia|apto\s+para|inversionistas?|estudiantes?|ejecutivos?|empresa)\b/i.test(tLower)) {
    sIcp = 10;
    fortalezas.push("Orientado claramente a un perfil de cliente específico");
  } else {
    sIcp = 5;
    oportunidades.push("Mencionar para quién es ideal la propiedad (familias, ejecutivos, inversionistas)");
  }
  score += sIcp;

  // 3. Diferenciación Swap Test (15 pts)
  let sSwap = swapResult.passes ? 15 : (swapResult.clichesFound.length === 0 ? 10 : 5);
  if (sSwap >= 10) fortalezas.push("Cuenta con rasgos diferenciadores específicos");
  else oportunidades.push("Eliminar frases clichés ('lindo', 'excelente ubicación') y reemplazarlas por ventajas comprobables");
  score += sSwap;

  // 4. Datos Técnicos Completos (15 pts)
  let sTec = 0;
  if (hasArea) sTec += 4;
  if (hasRooms) sTec += 4;
  if (hasBaths) sTec += 4;
  if (hasGarages) sTec += 3;
  if (sTec >= 12) fortalezas.push("Especificaciones físicas completas (área, alcobas, baños, garajes)");
  else oportunidades.push("Aclarar metraje exacto, número de alcobas, baños y parqueaderos");
  score += sTec;

  // 5. Precio y Metraje Homologado (10 pts)
  let sPre = 0;
  if (hasPrice) sPre += 7;
  if (hasAdmin) sPre += 3;
  if (sPre === 10) fortalezas.push("Valor comercial y administración claramente desglosados");
  else oportunidades.push("Indicar claramente si el precio incluye la administración");
  score += sPre;

  // 6. Entorno y Conectividad (10 pts)
  let sEnt = hasBarrioOrCity ? 10 : 3;
  if (sEnt === 10) fortalezas.push("Ubicación sectorial clara (ciudad y barrio)");
  else oportunidades.push("Incluir ciudad y barrio específico de ubicación");
  score += sEnt;

  // 7. Prueba Social y Confianza (5 pts)
  let sPru = /\b(?:estrato\s*\d|a[ñn]o\s*\d{4}|antig[uü]edad|tradici[oó]n|conjunto\s*cerrado|vigilancia\s*24\/7)\b/i.test(tLower) ? 5 : 2;
  score += sPru;

  // 8. Llamado a la Acción CTA (10 pts)
  let sCta = hasContact ? 10 : 2;
  if (sCta === 10) fortalezas.push("Llamado a la acción y canal de contacto presente");
  else oportunidades.push("Agregar un llamado a la acción claro para agendar visitas");
  score += sCta;

  // 9. Escaneabilidad y Formato (5 pts)
  let sEsc = text.includes("\n") && (text.includes("•") || text.includes("-") || text.includes("*")) ? 5 : 2;
  score += sEsc;

  // 10. Atractivo Visual / Multimedia (5 pts)
  let sVis = /\b(?:fotos?|video|recorrido|visita\s*virtual)\b/i.test(tLower) ? 5 : 3;
  score += sVis;

  score = Math.min(100, Math.max(10, score));

  return {
    score,
    dimensions: {
      claridadPropuestaValor: { score: sVal, feedback: sVal === 15 ? "Excelente" : "Definir negocio y tipo" },
      perfilClienteIdeal: { score: sIcp, feedback: sIcp === 10 ? "Segmentado" : "Falta perfilar cliente" },
      diferenciacionSwapTest: { score: sSwap, feedback: swapResult.suggestion },
      datosTecnicosCompletos: { score: sTec, feedback: `${sTec}/15 pts técnicos` },
      precioYMetrajeHomologado: { score: sPre, feedback: hasPrice ? "Precio informado" : "Falta precio" },
      entornoYConectividad: { score: sEnt, feedback: hasBarrioOrCity ? "Ubicación informada" : "Falta barrio" },
      pruebaSocialYConfianza: { score: sPru, feedback: sPru === 5 ? "Genera confianza" : "Sumar estrato o seguridad" },
      llamadoALaAccionCTA: { score: sCta, feedback: hasContact ? "Contacto listo" : "Falta CTA" },
      escaneabilidadYFormato: { score: sEsc, feedback: sEsc === 5 ? "Formato ágil" : "Usar viñetas" },
      atractivoVisualYMultimedia: { score: sVis, feedback: sVis === 5 ? "Multimedia anunciada" : "Ofrecer fotos/video" }
    },
    fortalezas,
    oportunidadesMejora: oportunidades,
    fichaOptimizadaSugerida: `[FICHA SUGERIDA DE ALTO ENGANCHE]\n${text}`
  };
}

/**
 * 4. REGLA DOCTRINAL DE GESTIÓN DE COMISIONES (40/20/40 vs 50/50 Standby)
 * Guía la interacción de JanIA para la captura de inmuebles y requerimientos.
 */
export function buildCommissionDoctrineGuide(isAgent: boolean, accepts402040?: boolean): string {
  if (!isAgent) {
    return (
      `USUARIO PROPIETARIO / CLIENTE DIRECTO:\n` +
      `- Acógelo como su asesora y guía especialista en comercialización inmobiliaria.\n` +
      `- Optimiza su ficha con rigor técnico y explícale que VECY Bienes Raíces (+57 316 656 9719) conectará su propiedad con compradores calificados y corredores aliados verificados con acompañamiento legal completo.\n`
    );
  }

  if (accepts402040 === true) {
    return (
      `AGENTE INMOBILIARIO — ALIANZA 40/20/40 ACEPTADA [ALIADA PRIORITARIA]:\n` +
      `- El colega ha aceptado la figura colaborativa 40/20/40 de VECY Network.\n` +
      `- Su inmueble/requerimiento entra al motor de matching con máxima prioridad.\n` +
      `- ANTE COINCIDENCIA (MATCH): NO revelar datos de la contraparte en este chat privado. Notificar a la dirección de VECY al +57 316 656 9719 con el ID del match para que Eduardo y Jani coordinen la mesa de cierre.\n`
    );
  }

  if (accepts402040 === false) {
    return (
      `AGENTE INMOBILIARIO — 50/50 TRADICIONAL [STANDBY DIRECTO VECY]:\n` +
      `- El colega prefiere comisión compartida 50/50 tradicional sin tercería de plataforma.\n` +
      `- JanIA sube de todas formas el inmueble o demanda a la base de datos, etiquetándolo como [🛡️50/50 - NO TERCERÍA].\n` +
      `- El registro queda indexado para la pestaña [🛡️50/50] de la Mesa de Coincidencias en el panel administrativo.\n`
    );
  }

  return (
    `AGENTE INMOBILIARIO — FILTRO DE MODELO DE COMISIÓN:\n` +
    `- Pregúntale con amabilidad, total transparencia y firmeza si acepta la figura colaborativa de la Red VECY 40/20/40 (donde VECY respalda la operación, aporta la plataforma y la bolsa colaborativa con el 20%), o si prefiere registrarlo bajo el modelo 50/50 tradicional para la mesa de coincidencias [🛡️50/50].\n`
  );
}
