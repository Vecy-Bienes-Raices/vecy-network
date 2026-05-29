import { getDb } from "../db";
import { and, eq } from "drizzle-orm";
import { propertyMatches, properties, requirements } from "../../drizzle/schema";
import { normalizarTextoGeografico } from "./geography";

/**
 * Motor de Matching VECY CORE v12.00 (TypeScript)
 * Calcula el matchScore en TypeScript para evaluar lógicas complejas de JSONB,
 * rangos de área y tolerancias de campos N/A por tipo de inmueble.
 */

export function calcularScoreMatch(requirement: any, property: any): number {
  // Hard mismatches
  // 1. Tipo de inmueble debe ser idéntico
  const reqType = requirement.tipoInmuebleDeseado || requirement.propertyType;
  const propType = property.propertyType;
  if (reqType && propType && reqType.toLowerCase() !== propType.toLowerCase()) {
    return 0;
  }

  // 2. Tipo de negocio debe ser idéntico
  const reqBiz = requirement.tipoNegocioDeseado || requirement.transactionType;
  const propBiz = property.transactionType;
  if (reqBiz && propBiz && reqBiz.toLowerCase() !== propBiz.toLowerCase()) {
    return 0;
  }

  // 3. Ciudad debe ser la misma
  const reqCity = normalizarTextoGeografico(requirement.ciudadDeseada || requirement.city || "");
  const propCity = normalizarTextoGeografico(property.city || property.addressCity || "");
  if (reqCity && propCity && reqCity !== propCity) {
    return 0;
  }

  // 3.1. Localidad/Sector Mismatch (Si ambas están definidas y son diferentes localidades principales, es un mismatch rotundo)
  const reqLoc = normalizarTextoGeografico(requirement.addressLocality || "");
  const propLoc = normalizarTextoGeografico(property.addressLocality || "");
  if (reqLoc && propLoc && reqLoc !== propLoc) {
    return 0; // Hard mismatch: ej. Suba vs La Candelaria
  }

  // 4. Habitaciones mínimas
  const reqBedrooms = requirement.habitacionesMin;
  if (reqBedrooms !== null && reqBedrooms !== undefined && reqBedrooms !== "NA" && String(reqBedrooms).trim() !== "") {
    const pBedrooms = property.bedrooms !== null && property.bedrooms !== undefined ? Number(property.bedrooms) : 0;
    if (pBedrooms < Number(reqBedrooms)) {
      return 0; // Hard mismatch
    }
  }

  // 5. Baños mínimos
  const reqBathrooms = requirement.banosMin;
  if (reqBathrooms !== null && reqBathrooms !== undefined && reqBathrooms !== "NA" && String(reqBathrooms).trim() !== "") {
    const pBathrooms = property.bathrooms !== null && property.bathrooms !== undefined ? Number(property.bathrooms) : 0;
    if (pBathrooms < Number(reqBathrooms)) {
      return 0; // Hard mismatch
    }
  }

  // 6. Parqueaderos mínimos
  const reqGarages = requirement.parqueaderosMin;
  if (reqGarages !== null && reqGarages !== undefined && reqGarages !== "NA" && String(reqGarages).trim() !== "") {
    const pGarages = property.garages !== null && property.garages !== undefined ? Number(property.garages) : 0;
    if (pGarages < Number(reqGarages)) {
      return 0; // Hard mismatch
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

  // PUNTOS Y MÁXIMOS POSIBLES
  let totalPoints = 0;
  let maxPoints = 0;

  // 1. Ubicación (Peso: 25)
  maxPoints += 25;
  const reqZone = normalizarTextoGeografico(requirement.zonaDeseada || requirement.addressNeighborhood || "");
  const propZone = normalizarTextoGeografico(property.zone || property.addressNeighborhood || "");

  if (reqZone && propZone && reqZone === propZone) {
    totalPoints += 25;
  } else if (reqLoc && propLoc && reqLoc === propLoc) {
    totalPoints += 15;
  } else if (reqCity && propCity && reqCity === propCity) {
    totalPoints += 10;
  }

  // 2. Precios (Peso: 25)
  const budgetMax = parseFloat(requirement.presupuestoMax || "0");
  const price = parseFloat(property.price || "0");
  if (budgetMax > 0 && price > 0) {
    maxPoints += 25;
    if (price <= budgetMax) {
      totalPoints += 25;
    } else if (price <= budgetMax * 1.10) {
      totalPoints += 15;
    } else if (price <= budgetMax * 1.20) {
      totalPoints += 5;
    }
  }

  // 3. Áreas (Peso: 10)
  const areaMin = parseFloat(requirement.areaMin || "0");
  const areaProp = parseFloat(property.areaTotal || property.areaPrivate || "0");
  if (areaMin > 0 && areaProp > 0) {
    maxPoints += 10;
    if (areaProp >= areaMin * 0.85 && areaProp <= areaMin * 1.15) {
      totalPoints += 10;
    } else if (areaProp >= areaMin * 0.70 && areaProp <= areaMin * 1.30) {
      totalPoints += 5;
    }
  }

  // 4. Habitaciones, Baños y Garajes (Peso: 20)
  // Habitaciones (Peso: 8)
  if (reqBedrooms !== null && reqBedrooms !== undefined && reqBedrooms !== "NA" && String(reqBedrooms).trim() !== "") {
    maxPoints += 8;
    const pBedrooms = property.bedrooms !== null && property.bedrooms !== undefined ? Number(property.bedrooms) : 0;
    if (pBedrooms >= Number(reqBedrooms)) {
      totalPoints += 8;
    }
  }
  // Baños (Peso: 6)
  if (reqBathrooms !== null && reqBathrooms !== undefined && reqBathrooms !== "NA" && String(reqBathrooms).trim() !== "") {
    maxPoints += 6;
    const pBathrooms = property.bathrooms !== null && property.bathrooms !== undefined ? Number(property.bathrooms) : 0;
    if (pBathrooms >= Number(reqBathrooms)) {
      totalPoints += 6;
    }
  }
  // Garajes (Peso: 6)
  if (reqGarages !== null && reqGarages !== undefined && reqGarages !== "NA" && String(reqGarages).trim() !== "") {
    maxPoints += 6;
    const pGarages = property.garages !== null && property.garages !== undefined ? Number(property.garages) : 0;
    if (pGarages >= Number(reqGarages)) {
      totalPoints += 6;
    }
  }

  // 5. Estrato (Peso: 5)
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
      maxPoints += 5;
      const propStratum = property.stratum !== null && property.stratum !== undefined ? Number(property.stratum) : null;
      if (propStratum !== null) {
        if (targetEstratos.includes(propStratum)) {
          totalPoints += 5;
        } else if (targetEstratos.some(e => Math.abs(e - propStratum) === 1)) {
          totalPoints += 3;
        }
      }
    }
  }

  // 6. Estructurales Específicos (Peso: 15)
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
  const reqFloor = requirement.caracteristicasDeseadas?.floorDetail || requirement.floorDetail;
  const propFloor = property.floorDetail || property.amenities?.floorDetail;
  if (reqFloor && reqFloor !== "NA" && reqFloor !== "N/A" && reqFloor.trim() !== "") {
    maxPoints += 1;
    if (propFloor && (propFloor.toLowerCase() === reqFloor.toLowerCase() || propFloor.toLowerCase().includes(reqFloor.toLowerCase()) || reqFloor.toLowerCase().includes(propFloor.toLowerCase()))) {
      totalPoints += 1;
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

    const activeRequirements = await db
      .select()
      .from(requirements)
      .where(
        and(
          eq(requirements.status, "active"),
          eq(requirements.tipoInmuebleDeseado, property.propertyType),
          eq(requirements.tipoNegocioDeseado, property.transactionType)
        )
      );

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

    const availableProperties = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.available, true),
          eq(properties.propertyType, req.tipoInmuebleDeseado),
          eq(properties.transactionType, req.tipoNegocioDeseado)
        )
      );

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
