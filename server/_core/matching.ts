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

  // B. city (Ciudad) — usamos addressCity como fuente primaria si existe,
  // ya que el campo city a veces contiene el barrio en vez de la ciudad.
  const CIUDADES_CO = ["bogota", "medellin", "cali", "barranquilla", "cartagena",
    "bucaramanga", "pereira", "manizales", "cucuta", "ibague", "santa marta",
    "villavicencio", "pasto", "monteria", "valledupar", "sincelejo", "chia",
    "zipaquira", "cajica", "envigado", "bello", "sabaneta", "itagui", "tenjo", "mosquera"];

  const resolveCityField = (raw1: string, raw2: string): string => {
    const n1 = normalizarTextoGeografico(raw1 || "");
    const n2 = normalizarTextoGeografico(raw2 || "");
    // Preferir el que coincide con alguna ciudad colombiana conocida
    if (CIUDADES_CO.some(c => n1.includes(c) || n1 === c)) return n1;
    if (CIUDADES_CO.some(c => n2.includes(c) || n2 === c)) return n2;
    return n1 || n2; // fallback: usar el primero disponible
  };

  const reqCity = resolveCityField(requirement.ciudadDeseada || "", requirement.city || "");
  const propCity = resolveCityField(property.addressCity || "", property.city || "");
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

/**
 * MÓDULO 5 & MÓDULO 6: Motor de Match Real y Alertas Directas y Confidenciales a Socios
 * Reglas estrictas de Eduardo: mismo tipo, mismo barrio/ciudad, área ±10%, precio+admin dentro del presupuesto, mismas habitaciones.
 */
export async function executeMatchEngine(propertyId: number | null, requirementId: number | null): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    let props: typeof properties.$inferSelect[] = [];
    let reqs: typeof requirements.$inferSelect[] = [];

    if (propertyId) {
      props = await db.select().from(properties).where(eq(properties.id, propertyId));
    } else {
      props = await db.select().from(properties).where(eq(properties.available, true));
    }

    if (requirementId) {
      reqs = await db.select().from(requirements).where(eq(requirements.id, requirementId));
    } else {
      reqs = await db.select().from(requirements).where(eq(requirements.status, "active"));
    }

    const { users } = await import("../../drizzle/schema");

    const formatCurrency = (val: number) =>
      new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

    // Limpia el JID/teléfono a un número colombiano real (57XXXXXXXXXX)
    const cleanPhone = (raw: string): string => {
      if (!raw) return "";
      // Extraer solo dígitos
      let digits = raw.replace(/[^0-9]/g, "");
      // Quitar el código 57 si ya está incluido al inicio para reconstruirlo limpio
      if (digits.startsWith("57") && digits.length > 11) {
        digits = digits.slice(2);
      }
      // Si empieza con 0 (celular colombiano local), quitar el 0
      if (digits.startsWith("0") && digits.length === 10) {
        digits = digits.slice(1);
      }
      // Solo aceptar números de Colombia: 10 dígitos empezando por 3
      if (digits.length === 10 && digits.startsWith("3")) {
        return `57${digits}`;
      }
      // Si ya tiene 12 dígitos y empieza con 57, es válido
      if (digits.length === 12 && digits.startsWith("57")) {
        return digits;
      }
      // Retornar vacío si no es un número colombiano real
      return "";
    };

    for (const prop of props) {
      for (const req of reqs) {

        // ── FILTRO 1: Mismo tipo de negocio (Venta / Arriendo) ──────────────
        const pBiz = (prop.transactionType || "").toLowerCase();
        const rBiz = (req.tipoNegocioDeseado || "").toLowerCase();
        if (!pBiz || !rBiz || pBiz !== rBiz) continue;

        // ── FILTRO 2: Mismo tipo de inmueble ─────────────────────────────────
        const pType = (prop.propertyType || "").toLowerCase();
        const rType = (req.tipoInmuebleDeseado || "").toLowerCase();
        if (!pType || !rType || pType !== rType) continue;

        // ── FILTRO 3: Misma ciudad ────────────────────────────────────────────
        const pCity = normalizarTextoGeografico(prop.city || prop.addressCity || "");
        const rCity = normalizarTextoGeografico(req.ciudadDeseada || "");
        if (!pCity || !rCity || pCity !== rCity) continue;

        // ── FILTRO 4: Mismo barrio (zona) — coincidencia estricta ─────────────
        const pZone = normalizarTextoGeografico(prop.zone || prop.addressNeighborhood || "");
        const rZone = normalizarTextoGeografico(req.zonaDeseada || req.addressNeighborhood || "");
        // Si el requerimiento especifica zona, DEBE coincidir exactamente o por inclusión
        if (rZone && pZone) {
          const zonaMatch = rZone === pZone || rZone.includes(pZone) || pZone.includes(rZone);
          if (!zonaMatch) continue;
        }

        // ── FILTRO 5: Área dentro de un rango pequeño (±10%) ─────────────────
        const pArea = parseFloat(String(prop.areaTotal || prop.areaPrivate || "0"));
        const rAreaMin = parseFloat(String(req.areaMin || "0"));
        // Solo hay areaMin en requerimientos, usar ±10% como límite superior
        if (pArea > 0 && rAreaMin > 0) {
          const areaMaxLimit = rAreaMin * 1.10;
          const areaMinLimit = rAreaMin * 0.90;
          if (pArea < areaMinLimit || pArea > areaMaxLimit) continue;
        }

        // ── FILTRO 6: Precio dentro del presupuesto (incluida administración) ──
        const price = parseFloat(String(prop.price || "0"));
        const adminFee = parseFloat(String(prop.adminFee || "0"));
        const totalCost = price + adminFee; // Para arriendo la admin suma al costo real
        const budgetMax = parseFloat(String(req.presupuestoMax || "0"));
        const budgetMin = parseFloat(String(req.presupuestoMin || "0"));
        if (budgetMax > 0 && totalCost > budgetMax * 1.05) continue; // Tolerancia del 5%
        if (budgetMin > 0 && price < budgetMin * 0.90) continue;

        // ── FILTRO 7: Habitaciones ────────────────────────────────────────────
        const pBedrooms = Number(prop.bedrooms || 0);
        const rBedrooms = Number(req.habitacionesMin || 0);
        // Si el requerimiento especifica habitaciones, el inmueble debe tenerlas
        if (rBedrooms > 0 && pBedrooms > 0 && pBedrooms < rBedrooms) continue;

        // ── CÁLCULO DE SCORE ──────────────────────────────────────────────────
        // Con todos los filtros pasados, calcular score según qué tan exactos son los datos
        let score = 70;
        const zonaExacta = rZone && pZone && (rZone === pZone || rZone.includes(pZone) || pZone.includes(rZone));
        const precioExacto = price <= (budgetMax > 0 ? budgetMax : price);
        const habitacionesExactas = rBedrooms === 0 || pBedrooms === rBedrooms;
        const areaExacta = rAreaMin === 0 || (pArea > 0 && Math.abs(pArea - rAreaMin) / rAreaMin <= 0.05);

        if (zonaExacta) score += 10;
        if (precioExacto) score += 10;
        if (habitacionesExactas) score += 5;
        if (areaExacta) score += 5;
        score = Math.min(score, 100);

        // ── REGISTRO EN BASE DE DATOS ─────────────────────────────────────────
        let matchId: number;
        let isNewMatch = false;

        const existing = await db.select().from(propertyMatches).where(
          and(
            eq(propertyMatches.propertyId, prop.id),
            eq(propertyMatches.requirementId, req.id)
          )
        ).limit(1);

        if (existing.length > 0) {
          matchId = existing[0].id;
          await db.update(propertyMatches).set({
            matchScore: score.toFixed(2),
            matchReason: `VECY Core Engine: Match estricto ${score}%`,
            createdAt: new Date()
          }).where(eq(propertyMatches.id, matchId));
        } else {
          isNewMatch = true;
          const [newMatch] = await db.insert(propertyMatches).values({
            propertyId: prop.id,
            requirementId: req.id,
            matchScore: score.toFixed(2),
            matchReason: `VECY Core Engine: Match estricto ${score}%`,
            status: "suggested",
            ownerConfirmed: false,
            seekerConfirmed: false,
          }).returning();
          matchId = newMatch.id;
        }

        // ── ALERTA PRIVADA CONFIDENCIAL A EDUARDO Y JANI ─────────────────────
        if (isNewMatch) {
          const [propUser] = await db.select().from(users).where(eq(users.phone, prop.idUsuarioWhatsapp || "")).limit(1);
          const [reqUser] = await db.select().from(users).where(eq(users.phone, req.idUsuarioWhatsapp || "")).limit(1);

          const ownerName = propUser?.name || prop.name || "Colega Oferente";
          const ownerRawPhone = prop.idUsuarioWhatsapp || propUser?.phone || "";
          const ownerPhone = cleanPhone(ownerRawPhone);
          const ownerPhoneDisplay = ownerPhone ? `+${ownerPhone}` : "No disponible";
          const ownerWaLink = ownerPhone ? `https://wa.me/${ownerPhone}` : "No disponible";

          const seekerName = reqUser?.name || req.name || "Colega Demandante";
          const seekerRawPhone = req.idUsuarioWhatsapp || reqUser?.phone || "";
          const seekerPhone = cleanPhone(seekerRawPhone);
          const seekerPhoneDisplay = seekerPhone ? `+${seekerPhone}` : "No disponible";
          const seekerWaLink = seekerPhone ? `https://wa.me/${seekerPhone}` : "No disponible";

          const headerEmoji = score === 100 ? "💘" : "🎯";
          const headerText = score === 100
            ? "COINCIDENCIA INMOBILIARIA 100% PERFECTA"
            : "COINCIDENCIA INMOBILIARIA DETECTADA";

          const alertMsg =
            `${headerEmoji} *[${headerText}]*\n` +
            `📊 *Match: ${score}%*  |  🆔 Ref: #M${matchId}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `🏠 *INMUEBLE OFERTADO:*\n` +
            `  • Tipo: ${prop.propertyType?.toUpperCase() || "N/A"}\n` +
            `  • Negocio: ${prop.transactionType?.toUpperCase() || "N/A"}\n` +
            `  • Ciudad: ${prop.city || "N/A"}\n` +
            `  • Barrio: ${prop.zone || prop.addressNeighborhood || "N/A"}\n` +
            `  • Área: ${pArea > 0 ? `${pArea} m²` : "N/A"}\n` +
            `  • Habitaciones: ${pBedrooms > 0 ? pBedrooms : "N/A"}\n` +
            `  • Precio: ${price > 0 ? formatCurrency(price) : "N/A"}${adminFee > 0 ? ` + Adm. ${formatCurrency(adminFee)}` : ""}\n\n` +
            `🔍 *REQUERIMIENTO:*\n` +
            `  • Tipo: ${req.tipoInmuebleDeseado?.toUpperCase() || "N/A"}\n` +
            `  • Negocio: ${req.tipoNegocioDeseado?.toUpperCase() || "N/A"}\n` +
            `  • Ciudad: ${req.ciudadDeseada || "N/A"}\n` +
            `  • Barrio deseado: ${req.zonaDeseada || req.addressNeighborhood || "N/A"}\n` +
            `  • Área mín: ${rAreaMin > 0 ? `${rAreaMin} m²` : "N/A"}\n` +
            `  • Habitaciones mín: ${rBedrooms > 0 ? rBedrooms : "N/A"}\n` +
            `  • Presupuesto: ${budgetMin > 0 ? formatCurrency(budgetMin) : "Desde N/A"} – ${budgetMax > 0 ? formatCurrency(budgetMax) : "Hasta N/A"}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `👥 *CONTACTOS:*\n\n` +
            `🔑 *Oferente (${ownerName}):*\n` +
            `  📞 ${ownerPhoneDisplay}\n` +
            `  🔗 ${ownerWaLink}\n\n` +
            `🔎 *Demandante (${seekerName}):*\n` +
            `  📞 ${seekerPhoneDisplay}\n` +
            `  🔗 ${seekerWaLink}\n\n` +
            `💼 _Coordinar el contacto directo de forma confidencial._`;

          await sendDirectAlertToAdmins(alertMsg);
          console.log(`[Matching-Engine] ✅ Match #${matchId} (${score}%) registrado y alertado a admins.`);
        }
      }
    }
  } catch (err: any) {
    console.error("[Matching-Engine] Error running match engine:", err.message || err);
  }
}

async function sendDirectAlertToAdmins(message: string): Promise<void> {

  const matchBot = (global as any).janiaMatchBotInstance;
  if (matchBot && matchBot.isReady) {
    console.log("[Matching-Notification] Enviando alerta de Match a administradores vía Baileys...");
    await matchBot.queuedSend("573192919978@s.whatsapp.net", message).catch((e: any) => console.error("Error al notificar a Eduardo por Baileys:", e));
    await matchBot.queuedSend("573188096811@s.whatsapp.net", message).catch((e: any) => console.error("Error al notificar a Jani por Baileys:", e));
    return;
  }

  const wwebClient = (global as any).whatsappClient;
  if (wwebClient) {
    console.log("[Matching-Notification] Enviando alerta de Match a administradores vía WWEBJS...");
    await wwebClient.sendMessage("573192919978@c.us", message).catch((e: any) => console.error("Error al notificar a Eduardo por WWEBJS:", e));
    await wwebClient.sendMessage("573188096811@c.us", message).catch((e: any) => console.error("Error al notificar a Jani por WWEBJS:", e));
    return;
  }

  console.warn("[Matching-Notification] Ningún cliente de WhatsApp disponible en global para enviar la alerta.");
}
