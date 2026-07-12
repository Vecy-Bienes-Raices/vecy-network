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
  // 1. REGLAS DE FILTRADO ESTRICTO (HARD FILTERS - 0% MATCH SI NO CUMPLEN)

  // A. transactionType (Venta o Arriendo)
  const reqBiz = (requirement.tipoNegocioDeseado || requirement.transactionType || "").toLowerCase();
  const propBiz = (property.transactionType || "").toLowerCase();
  if (!reqBiz || !propBiz || reqBiz !== propBiz) {
    return 0;
  }

  // B. city (Ciudad)
  const reqCity = normalizarTextoGeografico(requirement.ciudadDeseada || requirement.city || "");
  const propCity = normalizarTextoGeografico(property.city || property.addressCity || "");
  if (!reqCity || !propCity || reqCity !== propCity) {
    return 0;
  }

  // Parse prices, budgets, areas and layout numbers
  const price = parseFloat(String(property.price || "0"));
  const budgetMin = parseFloat(String(requirement.presupuestoMin || "0"));
  const budgetMax = parseFloat(String(requirement.presupuestoMax || "0"));
  
  const reqZone = normalizarTextoGeografico(requirement.zonaDeseada || requirement.addressNeighborhood || "");
  const propZone = normalizarTextoGeografico(property.zone || property.addressNeighborhood || "");

  const reqLoc = normalizarTextoGeografico(requirement.addressLocality || "");
  const propLoc = normalizarTextoGeografico(property.addressLocality || "");

  const reqType = (requirement.tipoInmuebleDeseado || requirement.propertyType || "").toLowerCase();
  const propType = (property.propertyType || "").toLowerCase();

  const pBedrooms = property.bedrooms !== null && property.bedrooms !== undefined ? Number(property.bedrooms) : 0;
  const reqBedrooms = requirement.habitacionesMin !== null && requirement.habitacionesMin !== undefined ? Number(requirement.habitacionesMin) : 0;

  const pBathrooms = property.bathrooms !== null && property.bathrooms !== undefined ? Number(property.bathrooms) : 0;
  const reqBathrooms = requirement.banosMin !== null && requirement.banosMin !== undefined ? Number(requirement.banosMin) : 0;

  const pGarages = property.garages !== null && property.garages !== undefined ? Number(property.garages) : 0;
  const reqGarages = requirement.parqueaderosMin !== null && requirement.parqueaderosMin !== undefined ? Number(requirement.parqueaderosMin) : 0;

  // Helpers for exact match checks
  const samePropertyType = reqType === propType;
  const sameZone = reqZone && propZone && (reqZone === propZone || reqZone.includes(propZone) || propZone.includes(reqZone));
  
  // Price matching checks
  const priceInBudget = (budgetMax > 0 ? price <= budgetMax : true) && (budgetMin > 0 ? price >= budgetMin : true);
  const priceWithin5PercentOver = budgetMax > 0 ? (price > budgetMax && price <= budgetMax * 1.05) : false;
  const priceWithin6To15PercentOver = budgetMax > 0 ? (price > budgetMax * 1.05 && price <= budgetMax * 1.15) : false;

  // Layout matching checks
  const meetsBedrooms = pBedrooms >= reqBedrooms;
  const meetsBathrooms = pBathrooms >= reqBathrooms;
  const meetsLayout = meetsBedrooms && meetsBathrooms;

  // Missing layout by exactly 1 unit
  const missingExactly1Bedroom = reqBedrooms > 0 && pBedrooms === (reqBedrooms - 1);
  const missingExactly1Garage = reqGarages > 0 && pGarages === (reqGarages - 1);

  // EVALUAR NIVELES DE COINCIDENCIA (SCORING TIERS)

  // --- TIER 1: Match 90% - 100% (Coincidencia Ideal) ---
  if (
    samePropertyType &&
    sameZone &&
    (priceInBudget || priceWithin5PercentOver) &&
    meetsLayout
  ) {
    // Si cumple perfecto, 100%. Si está 1-5% sobre presupuesto o tiene just-meets, 95%.
    return priceInBudget ? 100 : 92;
  }

  // --- TIER 2: Match 70% - 80% (Coincidencia Muy Alta) ---
  if (samePropertyType && sameZone) {
    // Condición A: El precio se sale del presupuesto entre un 6% y un 15%
    if (priceWithin6To15PercentOver && meetsLayout) {
      return 78;
    }
    // Condición B: Precio es perfecto, pero le falta 1 habitación o 1 parqueadero
    if (priceInBudget && meetsBathrooms && ((missingExactly1Bedroom && pGarages >= reqGarages) || (meetsBedrooms && missingExactly1Garage))) {
      return 75;
    }
  }

  // --- TIER 3: Match 50% - 60% (Alternativa Geográfica) ---
  // Mismo propertyType, price encaja perfecto, no está en el barrio exacto, pero coincide la localidad (addressLocality)
  const sameLocality = reqLoc && propLoc && reqLoc === propLoc;
  if (
    samePropertyType &&
    priceInBudget &&
    !sameZone &&
    sameLocality
  ) {
    return 55;
  }

  // --- TIER 4: Match 30% - 40% (Match Exploratorio) ---
  // Price encaja perfecto, misma zone, pero difiere en el propertyType
  if (
    priceInBudget &&
    sameZone &&
    !samePropertyType
  ) {
    return 35;
  }

  // Si no encaja en ninguna categoría, es un 0%
  return 0;
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
