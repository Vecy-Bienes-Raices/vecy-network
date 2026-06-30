import { getDb } from "../db";
import { and, eq } from "drizzle-orm";
import { propertyMatches, properties, requirements } from "../../drizzle/schema";
import { normalizarTextoGeografico } from "./geography";

/**
 * Motor de Matching VECY CORE v12.00 (TypeScript)
 * Calcula el matchScore en TypeScript para evaluar lógicas complejas de JSONB,
 * rangos de área y tolerancias de campos N/A por tipo de inmueble.
 */

function hasAledanos(text: string): boolean {
  if (!text) return false;
  const n = normalizarTextoGeografico(text);
  return n.includes("aledan") || n.includes("cercan") || n.includes("alrededor") || n.includes("similar") || n.includes("proxim") || n.includes("otro");
}

export function matchesGeography(
  reqZoneRaw: string,
  propZoneRaw: string,
  reqLocRaw: string,
  propLocRaw: string,
  reqCityRaw: string,
  propCityRaw: string
): { matches: boolean; score: number } {
  const reqCity = normalizarTextoGeografico(reqCityRaw || "");
  const propCity = normalizarTextoGeografico(propCityRaw || "");
  const reqZone = normalizarTextoGeografico(reqZoneRaw || "");
  const propZone = normalizarTextoGeografico(propZoneRaw || "");
  const reqLoc = normalizarTextoGeografico(reqLocRaw || "");
  const propLoc = normalizarTextoGeografico(propLocRaw || "");

  // 1. SIEMPRE: Municipio / Ciudad exacto es obligatorio (Filtro duro)
  if (reqCity && propCity && reqCity !== propCity) {
    return { matches: false, score: 0 };
  }

  // Si no se especifica barrio/zona ni localidad en el requerimiento, pasa
  if (!reqZone && !reqLoc) {
    return { matches: true, score: 25 }; // Todo el municipio pasa
  }

  // 2. Definimos las equivalencias de zonas coloquiales (F4)
  const equivalenciasZonas: Record<string, string[]> = {
    "las santas": [
      "santa barbara oriental", "santa barbara central", "santa barbara occidental",
      "santa ana oriental", "santa ana occidental", "santa paula", "santa bibiana",
      "san patricio", "navarra", "chico navarra", "molinos norte", "usaquen", "multicentro"
    ],
    "zona santas": [
      "santa barbara oriental", "santa barbara central", "santa barbara occidental",
      "santa ana oriental", "santa ana occidental", "santa paula", "santa bibiana",
      "san patricio", "navarra", "chico navarra", "molinos norte", "usaquen", "multicentro"
    ],
    "santas de usaquen": [
      "santa barbara oriental", "santa barbara central", "santa barbara occidental",
      "santa ana oriental", "santa ana occidental", "santa paula", "santa bibiana",
      "san patricio", "navarra", "chico navarra", "molinos norte", "usaquen", "multicentro"
    ],
    "sector santas": [
      "santa barbara oriental", "santa barbara central", "santa barbara occidental",
      "santa ana oriental", "santa ana occidental", "santa paula", "santa bibiana",
      "san patricio", "navarra", "chico navarra", "molinos norte", "usaquen", "multicentro"
    ],
    "barrios santa norte": [
      "santa barbara oriental", "santa barbara central", "santa barbara occidental",
      "santa ana oriental", "santa ana occidental", "santa paula", "santa bibiana",
      "san patricio", "navarra", "chico navarra", "molinos norte", "usaquen", "multicentro"
    ],
    "el chico": ["chico norte", "chico reservado", "chico reservado norte", "chico", "chico navarra", "chico sur"],
    "chico": ["chico norte", "chico reservado", "chico reservado norte", "chico", "chico navarra", "chico sur"],
    "lagos": ["lagos de torca", "club los lagartos", "el lago"],
    "las lomas": ["lomas de niza", "lomas"]
  };

  // Helper para expandir una frase si es zona coloquial o devolverla tal cual
  const expandirZona = (phrase: string): string[] => {
    if (equivalenciasZonas[phrase]) {
      return equivalenciasZonas[phrase];
    }
    return [phrase];
  };

  // Helper para limpiar y extraer frases individuales
  const splitPhrases = (text: string): string[] => {
    if (!text) return [];
    let norm = normalizarTextoGeografico(text);
    
    // Quitar frases de proximidad
    norm = norm.replace(/\b(u\s+)?otros\s+barrios\s+aledanos\b/gi, "");
    norm = norm.replace(/\b(y|o|u)\s+aledanos\b/gi, "");
    norm = norm.replace(/\b(y|o|u)\s+sectores\s+cercanos\b/gi, "");
    norm = norm.replace(/\b(y|o|u)\s+alrededores\b/gi, "");
    norm = norm.replace(/\b(y|o)\s+similares\b/gi, "");
    norm = norm.replace(/\baledanos\b/gi, "");
    norm = norm.replace(/\bcercanos\b/gi, "");
    norm = norm.replace(/\balrededores\b/gi, "");
    
    return norm.split(/,|\/|\s+y\s+|\s+o\s+|\s+e\s+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  };

  const reqPhrases = splitPhrases(reqZoneRaw);
  const propPhrases = splitPhrases(propZoneRaw);

  const reqExpanded = reqPhrases.flatMap(expandirZona);
  const propExpanded = propPhrases.flatMap(expandirZona);

  // Palabras genéricas geográficas que no deben ser usadas para coincidencia parcial
  const palabrasGenericas = new Set([
    "santa", "santo", "san", "del", "los", "las", "la", "el", "villa", "vista",
    "alto", "altos", "bajo", "bajos", "nueva", "nuevo", "valle", "valles",
    "portal", "portales", "rincon", "brisas", "colina", "colinas", "bosque",
    "bosques", "prado", "prados", "real", "lago", "lagos", "norte", "sur",
    "occidente", "oriente", "centro", "sector", "zona", "barrio", "vereda"
  ]);

  const esCoincidenciaAproximada = (p1: string, p2: string): boolean => {
    if (p1 === p2) return true;
    if (palabrasGenericas.has(p1) || palabrasGenericas.has(p2)) {
      return false;
    }
    return p1.includes(p2) || p2.includes(p1);
  };

  // 3. Evaluar coincidencia nominal en barrios (con expansión de zonas coloquiales)
  if (reqExpanded.length > 0 && propExpanded.length > 0) {
    for (const rp of reqExpanded) {
      for (const pp of propExpanded) {
        if (esCoincidenciaAproximada(rp, pp)) {
          return { matches: true, score: 25 };
        }
      }
    }
  }

  // 4. Si el requerimiento pide barrios específicos pero NO menciona "aledaños", "cercanos", etc.
  // entonces la ubicación DEBE ser exacta. Si no ha coincidido arriba, descartamos (0).
  const tieneAledanos = hasAledanos(reqZoneRaw);

  if (!tieneAledanos) {
    if (reqExpanded.length > 0) {
      return { matches: false, score: 0 };
    }
  }

  // 5. CASO 4: El requerimiento incluye "aledaños", "cercanos", "u otros":
  // Aceptamos propiedades en barrios contiguos del mismo municipio y la misma localidad/comuna.
  if (tieneAledanos && reqLoc && propLoc && reqLoc !== "bogota" && propLoc !== "bogota" && reqLoc === propLoc) {
    return { matches: true, score: 15 };
  }

  // 6. Si no hay match nominal ni por localidad aledaña, y ambos especifican algo concreto, es mismatch.
  const isReqLocSpec = reqLoc && reqLoc !== "bogota";
  const isPropLocSpec = propLoc && propLoc !== "bogota";
  const isReqZoneSpec = reqZone && reqZone !== "bogota" && reqExpanded.length > 0;
  const isPropZoneSpec = propZone && propZone !== "bogota" && propExpanded.length > 0;

  if ((isReqLocSpec || isReqZoneSpec) && (isPropLocSpec || isPropZoneSpec)) {
    return { matches: false, score: 0 };
  }

  // 7. Misma ciudad por defecto (si al menos uno es genérico y no hay mismatch explícito)
  if (reqCity && propCity && reqCity === propCity) {
    return { matches: true, score: 10 };
  }

  return { matches: false, score: 0 };
}

export function calcularScoreMatch(requirement: any, property: any): number {
  // Hard mismatches
  // 1. Tipo de inmueble debe ser idéntico
  const reqType = requirement.tipoInmuebleDeseado || requirement.propertyType;
  const propType = property.propertyType;
  if (reqType && propType && reqType.toLowerCase() !== propType.toLowerCase()) {
    return 0;
  }

  // 2. Tipo de negocio — intersección de conjuntos (no igualdad exacta)
  // Un inmueble en "venta" puede hacer match con un requerimiento de "permuta"
  // ya que el comprador puede proponer permuta sobre un inmueble listado en venta.
  const reqBiz = requirement.tipoNegocioDeseado || requirement.transactionType;
  const propBiz = property.transactionType;
  const reqTypes: string[] = Array.isArray(requirement.tiposNegocioAceptados) && requirement.tiposNegocioAceptados.length > 0
    ? requirement.tiposNegocioAceptados
    : (reqBiz ? [reqBiz] : ["venta"]);
  const propTypes: string[] = Array.isArray(property.acceptedTransactionTypes) && property.acceptedTransactionTypes.length > 0
    ? property.acceptedTransactionTypes
    : (propBiz ? [propBiz] : ["venta"]);

  // Regla de compatibilidad: venta <-> permuta son compatibles (permuta es una forma de pagar la venta)
  const typesCompatible = reqTypes.some(rt =>
    propTypes.some(pt =>
      pt === rt ||
      (rt === "venta" && pt === "permuta") ||
      (rt === "permuta" && pt === "venta") ||
      (rt === "venta" && pt === "aporte") ||
      (rt === "aporte" && pt === "venta")
    )
  );
  if (!typesCompatible) {
    return 0; // Hard mismatch: tipos de negocio completamente incompatibles
  }

  // 3. Validación Geográfica Nacional (Ciudad, Localidad y Zona)
  const reqCity = requirement.ciudadDeseada || requirement.city || "";
  const propCity = property.city || property.addressCity || "";
  const reqLoc = requirement.addressLocality || "";
  const propLoc = property.addressLocality || "";
  const reqZone = requirement.zonaDeseada || requirement.addressNeighborhood || "";
  const propZone = property.zone || property.addressNeighborhood || "";

  const geoResult = matchesGeography(reqZone, propZone, reqLoc, propLoc, reqCity, propCity);
  if (!geoResult.matches) {
    return 0; // Hard geographic mismatch
  }

  // 4. Habitaciones exactas
  const reqBedrooms = requirement.habitacionesMin;
  if (reqBedrooms !== null && reqBedrooms !== undefined && reqBedrooms !== "NA" && String(reqBedrooms).trim() !== "") {
    const pBedrooms = property.bedrooms !== null && property.bedrooms !== undefined ? Number(property.bedrooms) : 0;
    if (pBedrooms !== Number(reqBedrooms)) {
      return 0; // Hard mismatch: exact bedrooms required
    }
  }

  // 5. Baños exactos
  const reqBathrooms = requirement.banosMin;
  if (reqBathrooms !== null && reqBathrooms !== undefined && reqBathrooms !== "NA" && String(reqBathrooms).trim() !== "") {
    const pBathrooms = property.bathrooms !== null && property.bathrooms !== undefined ? Number(property.bathrooms) : 0;
    if (pBathrooms !== Number(reqBathrooms)) {
      return 0; // Hard mismatch: exact bathrooms required
    }
  }

  // 6. Parqueaderos exactos
  const reqGarages = requirement.parqueaderosMin;
  if (reqGarages !== null && reqGarages !== undefined && reqGarages !== "NA" && String(reqGarages).trim() !== "") {
    const pGarages = property.garages !== null && property.garages !== undefined ? Number(property.garages) : 0;
    if (pGarages !== Number(reqGarages)) {
      return 0; // Hard mismatch: exact garages required
    }
  }

  // 7. Interior / Exterior mismatch
  const reqIntExt = requirement.caracteristicasDeseadas?.interiorExterior || requirement.interiorExterior;
  const propIntExt = property.amenities?.interiorExterior || property.interiorExterior;
  if (reqIntExt && propIntExt && reqIntExt !== "NA" && propIntExt !== "NA" && reqIntExt.trim() !== "" && propIntExt.trim() !== "") {
    if (reqIntExt.toLowerCase() !== propIntExt.toLowerCase()) {
      return 0; // Hard mismatch
    }
  }

  // 8. Validación de características especiales exactas solicitadas (Terraza, Balcón, Chimenea, Club House, Estudio)
  const reqText = normalizarTextoGeografico(requirement.rawText || "");
  const propText = normalizarTextoGeografico(property.rawText || property.description || "");

  const keywordsToCheck = [
    { key: "terraza", terms: ["terraza"] },
    { key: "balcon", terms: ["balcon", "balcón"] },
    { key: "chimenea", terms: ["chimene"] },
    { key: "clubhouse", terms: ["club house", "clubhouse", "club-house"] },
    { key: "estudio", terms: ["estudio"] }
  ];

  for (const kw of keywordsToCheck) {
    const reqMentions = kw.terms.some(t => reqText.includes(t));
    if (reqMentions) {
      const propHasIt = kw.terms.some(t => propText.includes(t));
      if (!propHasIt) {
        return 0; // Hard mismatch: la característica especial solicitada debe estar presente
      }
    }
  }

  // 9. Número de pisos si es casa (debe ser exacto)
  const reqFloor = requirement.caracteristicasDeseadas?.floorDetail || requirement.floorDetail;
  const propFloor = property.floorDetail || property.amenities?.floorDetail;
  if (propType === "house" && reqFloor && propFloor && reqFloor !== "NA" && propFloor !== "NA" && reqFloor.trim() !== "" && propFloor.trim() !== "") {
    const cleanFloor = (f: string) => normalizarTextoGeografico(f).replace(/\b(pisos|niveles|piso|nivel|plantas|planta)\b/g, "").trim();
    if (cleanFloor(reqFloor) !== cleanFloor(propFloor)) {
      return 0; // Hard mismatch: número de pisos para casas debe ser exacto
    }
  }

  // 10. Piso de ubicación en altura si es apartamento (igual o a lo sumo un piso por encima)
  if (propType === "apartment" && reqFloor && propFloor && reqFloor !== "NA" && propFloor !== "NA" && reqFloor.trim() !== "" && propFloor.trim() !== "") {
    const rFNum = parseInt(reqFloor.replace(/\D/g, ""));
    const pFNum = parseInt(propFloor.replace(/\D/g, ""));
    if (!isNaN(rFNum) && !isNaN(pFNum)) {
      if (pFNum !== rFNum && pFNum !== rFNum + 1) {
        return 0; // Hard mismatch: debe ser igual o a lo sumo un piso por encima
      }
    } else {
      if (propFloor.toLowerCase() !== reqFloor.toLowerCase()) {
        return 0; // Hard mismatch
      }
    }
  }

  // PUNTOS Y MÁXIMOS POSIBLES
  let totalPoints = 0;
  let maxPoints = 0;

  // 1. Tipo de Inmueble (Peso: 20)
  maxPoints += 20;
  totalPoints += 20;

  // 2. Precios (Peso: 25)
  const budgetMax = parseFloat(requirement.presupuestoMax || "0");
  const price = parseFloat(property.price || "0");
  if (budgetMax > 0 && price > 0) {
    // Si el precio supera al presupuesto en más del 5%, es un Hard Mismatch
    if (price > budgetMax * 1.05) {
      return 0;
    }
    maxPoints += 25;
    if (price <= budgetMax) {
      totalPoints += 25;
    } else if (price <= budgetMax * 1.05) {
      totalPoints += 15;
    }
  }

  // 3. Áreas (Peso: 20)
  const areaMin = parseFloat(requirement.areaMin || "0");
  const areaProp = parseFloat(property.areaTotal || property.areaPrivate || "0");
  if (areaMin > 0 && areaProp > 0) {
    // Si el área es menor que el mínimo, o supera el 30% por encima, es un Hard Mismatch
    if (areaProp < areaMin || areaProp > areaMin * 1.30) {
      return 0;
    }
    maxPoints += 20;
    if (areaProp >= areaMin && areaProp <= areaMin * 1.15) {
      totalPoints += 20;
    } else {
      totalPoints += 10;
    }
  }

  // 4. Habitaciones, Baños, Garajes y Estrato (Peso: 20)
  // Habitaciones (Peso: 7)
  if (reqBedrooms !== null && reqBedrooms !== undefined && reqBedrooms !== "NA" && String(reqBedrooms).trim() !== "") {
    maxPoints += 7;
    const pBedrooms = property.bedrooms !== null && property.bedrooms !== undefined ? Number(property.bedrooms) : 0;
    if (pBedrooms === Number(reqBedrooms)) {
      totalPoints += 7;
    }
  }
  // Baños (Peso: 5)
  if (reqBathrooms !== null && reqBathrooms !== undefined && reqBathrooms !== "NA" && String(reqBathrooms).trim() !== "") {
    maxPoints += 5;
    const pBathrooms = property.bathrooms !== null && property.bathrooms !== undefined ? Number(property.bathrooms) : 0;
    if (pBathrooms === Number(reqBathrooms)) {
      totalPoints += 5;
    }
  }
  // Garajes (Peso: 5)
  if (reqGarages !== null && reqGarages !== undefined && reqGarages !== "NA" && String(reqGarages).trim() !== "") {
    maxPoints += 5;
    const pGarages = property.garages !== null && property.garages !== undefined ? Number(property.garages) : 0;
    if (pGarages === Number(reqGarages)) {
      totalPoints += 5;
    }
  }
  // Estrato (Peso: 3)
  if (requirement.estratoDeseado !== null && requirement.estratoDeseado !== undefined) {
    let targetEstratos: number[] = [];
    if (Array.isArray(requirement.estratoDeseado)) {
      targetEstratos = requirement.estratoDeseado.map(Number);
    } else if (typeof requirement.estratoDeseado === 'number') {
      targetEstratos = [requirement.estratoDeseado];
    } else if (typeof requirement.estratoDeseado === 'string' && requirement.estratoDeseado !== 'NA' && requirement.estratoDeseado.trim() !== '') {
      try {
        const parsed = JSON.parse(requirement.estratoDeseado);
        if (Array.isArray(parsed)) {
          targetEstratos = parsed.map(Number);
        } else {
          targetEstratos = [Number(parsed)];
        }
      } catch {
        targetEstratos = [parseInt(requirement.estratoDeseado)];
      }
    }
    if (targetEstratos.length > 0 && targetEstratos.every(e => !isNaN(e))) {
      const propStratum = property.stratum !== null && property.stratum !== undefined ? Number(property.stratum) : null;
      if (propStratum !== null) {
        // Si el estrato difiere en más de 1 nivel, es un Hard Mismatch
        const hasCloseEstrato = targetEstratos.some(e => Math.abs(e - propStratum) <= 1);
        if (!hasCloseEstrato) {
          return 0;
        }
        maxPoints += 3;
        if (targetEstratos.includes(propStratum)) {
          totalPoints += 3;
        } else if (targetEstratos.some(e => Math.abs(e - propStratum) === 1)) {
          totalPoints += 2;
        }
      }
    }
  }

  // 5. Estructurales Específicos (Peso: 15)
  // Ubicación del edificio (Interior/Exterior/NA) - 3 pts
  if (reqIntExt && reqIntExt !== "NA" && reqIntExt !== "N/A" && reqIntExt.trim() !== "") {
    maxPoints += 3;
    if (propIntExt && propIntExt.toLowerCase() === reqIntExt.toLowerCase()) {
      totalPoints += 3;
    }
  }

  // Cuarto y Baño de servicio (Si/No/NA) - 2 pts
  const reqServicio = requirement.caracteristicasDeseadas?.cuartoBanoServicio;
  const propServicio = property.amenities?.cuartoBanoServicio;
  if (reqServicio && reqServicio !== "NA" && reqServicio !== "N/A" && reqServicio.trim() !== "") {
    maxPoints += 2;
    if (propServicio && (propServicio === reqServicio || String(propServicio).toLowerCase() === String(reqServicio).toLowerCase())) {
      totalPoints += 2;
    }
  }

  // Tipo de Cocina (Cerrada/Abierta/etc.) - 2 pts
  const reqCocina = requirement.caracteristicasDeseadas?.cocina;
  const propCocina = property.amenities?.cocina;
  if (reqCocina && reqCocina !== "NA" && reqCocina !== "N/A" && reqCocina.trim() !== "") {
    maxPoints += 2;
    if (propCocina && propCocina.toLowerCase() === reqCocina.toLowerCase()) {
      totalPoints += 2;
    }
  }

  // Zona de lavandería e independencia - 3 pts
  const reqLavanderia = requirement.caracteristicasDeseadas?.lavanderiaIndependiente;
  const propLavanderia = property.amenities?.lavanderiaIndependiente;
  if (reqLavanderia && reqLavanderia !== "NA" && reqLavanderia !== "N/A" && reqLavanderia.trim() !== "") {
    maxPoints += 3;
    if (propLavanderia && (propLavanderia === reqLavanderia || String(propLavanderia).toLowerCase() === String(reqLavanderia).toLowerCase())) {
      totalPoints += 3;
    }
  }

  // Tipo de Pisos (Cruce de arreglos) - 2 pts
  const reqPisos = requirement.caracteristicasDeseadas?.tipoPisos;
  const propPisos = property.amenities?.tipoPisos;
  if (Array.isArray(reqPisos) && reqPisos.length > 0) {
    maxPoints += 2;
    if (Array.isArray(propPisos) && propPisos.some(p => reqPisos.includes(p))) {
      totalPoints += 2;
    }
  }

  // Piso de ubicación - 1 pt
  if (reqFloor && reqFloor !== "NA" && reqFloor !== "N/A" && reqFloor.trim() !== "") {
    maxPoints += 1;
    if (propFloor && propFloor !== "NA" && propFloor !== "N/A" && propFloor.trim() !== "") {
      if (propType === "apartment") {
        const rFNum = parseInt(reqFloor.replace(/\D/g, ""));
        const pFNum = parseInt(propFloor.replace(/\D/g, ""));
        if (!isNaN(rFNum) && !isNaN(pFNum)) {
          if (Math.abs(rFNum - pFNum) <= 2) {
            totalPoints += 1;
          }
        } else if (propFloor.toLowerCase() === reqFloor.toLowerCase() || propFloor.toLowerCase().includes(reqFloor.toLowerCase()) || reqFloor.toLowerCase().includes(propFloor.toLowerCase())) {
          totalPoints += 1;
        }
      } else {
        if (propFloor.toLowerCase() === reqFloor.toLowerCase() || propFloor.toLowerCase().includes(reqFloor.toLowerCase()) || reqFloor.toLowerCase().includes(propFloor.toLowerCase())) {
          totalPoints += 1;
        }
      }
    }
  }

  // Depósitos y Antigüedad - 2 pts
  const reqDepositos = requirement.caracteristicasDeseadas?.depositos;
  const propDepositos = property.amenities?.depositos;
  if (reqDepositos !== undefined && reqDepositos !== null && reqDepositos !== "NA" && reqDepositos !== "N/A") {
    maxPoints += 1;
    if (propDepositos !== undefined && propDepositos !== null && Number(propDepositos) >= Number(reqDepositos)) {
      totalPoints += 1;
    }
  }

  const reqAntiguedad = requirement.caracteristicasDeseadas?.antiguedad;
  const propAntiguedad = property.antiguedadAnos || property.amenities?.antiguedad;
  if (reqAntiguedad !== undefined && reqAntiguedad !== null && reqAntiguedad !== "NA" && reqAntiguedad !== "N/A") {
    maxPoints += 1;
    if (propAntiguedad !== undefined && propAntiguedad !== null && String(propAntiguedad).toLowerCase() === String(reqAntiguedad).toLowerCase()) {
      totalPoints += 1;
    }
  }

  const score = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;
  return score;
}

export function evaluarMatch(requirement: any, property: any): boolean {
  return calcularScoreMatch(requirement, property) >= 70;
}

/**
 * Busca requerimientos que hagan match con un inmueble recién publicado.
 */
export async function findMatchesForProperty(propertyId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const [property] = await db.select().from(properties).where(eq(properties.id, propertyId));
    if (!property) return [];

    // Carga TODOS los requerimientos activos — el score se encarga de filtrar compatibilidad
    const activeRequirements = await db
      .select()
      .from(requirements)
      .where(eq(requirements.status, "active"));

    const validMatches = [];

    for (const req of activeRequirements) {
      const score = calcularScoreMatch(req, property);
      if (score >= 70) {
        let matchId: number;
        const existing = await db.select().from(propertyMatches).where(
          and(
            eq(propertyMatches.propertyId, propertyId),
            eq(propertyMatches.requirementId, req.id)
          )
        ).limit(1);
        if (existing.length > 0) {
          matchId = existing[0].id;
        } else {
          const [newMatch] = await db.insert(propertyMatches).values({
            propertyId: propertyId,
            requirementId: req.id,
            matchScore: score.toFixed(2),
            matchReason: `VECY CORE TS Scoring: ${score.toFixed(2)}/100`,
            status: "suggested",
            ownerConfirmed: false,
            seekerConfirmed: false,
          }).returning();
          matchId = newMatch.id;
        }

        validMatches.push({
          ...req,
          score: score,
          matchId: matchId,
          idUsuarioWhatsapp: req.idUsuarioWhatsapp,
        });
      }
    }

    console.log(`[Matching] Inmueble #${propertyId}: ${validMatches.length} matches detectados.`);
    return validMatches;
  } catch (e: any) {
    console.error("[Matching] Error en findMatchesForProperty:", e.message);
    return [];
  }
}

/**
 * Busca inmuebles que hagan match con un requerimiento recién publicado.
 */
export async function findMatchesForRequirement(requirementId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const [req] = await db.select().from(requirements).where(eq(requirements.id, requirementId));
    if (!req) return [];

    // Carga TODOS los inmuebles disponibles — el score se encarga de filtrar compatibilidad
    const availableProperties = await db
      .select()
      .from(properties)
      .where(eq(properties.available, true));

    const validMatches = [];

    for (const prop of availableProperties) {
      const score = calcularScoreMatch(req, prop);
      if (score >= 70) {
        let matchId: number;
        const existing = await db.select().from(propertyMatches).where(
          and(
            eq(propertyMatches.propertyId, prop.id),
            eq(propertyMatches.requirementId, requirementId)
          )
        ).limit(1);
        if (existing.length > 0) {
          matchId = existing[0].id;
        } else {
          const [newMatch] = await db.insert(propertyMatches).values({
            propertyId: prop.id,
            requirementId: requirementId,
            matchScore: score.toFixed(2),
            matchReason: `VECY CORE TS Scoring: ${score.toFixed(2)}/100`,
            status: "suggested",
            ownerConfirmed: false,
            seekerConfirmed: false,
          }).returning();
          matchId = newMatch.id;
        }

        validMatches.push({
          ...prop,
          score: score,
          matchId: matchId,
          idUsuarioWhatsapp: prop.idUsuarioWhatsapp,
        });
      }
    }

    console.log(`[Matching] Requerimiento #${requirementId}: ${validMatches.length} matches detectados.`);
    return validMatches;
  } catch (e: any) {
    console.error("[Matching] Error en findMatchesForRequirement:", e.message);
    return [];
  }
}
