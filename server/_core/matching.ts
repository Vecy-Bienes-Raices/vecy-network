import { getDb } from "../db";
import { and, eq, sql } from "drizzle-orm";
import { propertyMatches, properties, requirements } from "../../drizzle/schema";
import { normalizarTextoGeografico } from "./geography";

/**
 * Evalúa si una propiedad y un requerimiento cumplen con todas las reglas de matching.
 * Aplica lógica de campos duros (100% obligatoria) y campos flexibles.
 */
export function evaluarMatch(req: any, prop: any): boolean {
  // 1. CAMPOS DUROS (coincidencia 100% obligatoria)
  
  // Barrio
  const propZone = normalizarTextoGeografico(prop.zone || "");
  const reqZone = normalizarTextoGeografico(req.zonaDeseada || "");
  if (propZone !== reqZone) return false;

  // Localidad (derivada de barrio en post-procesamiento o guardada)
  const propLoc = normalizarTextoGeografico(prop.addressLocality || "");
  const reqLoc = normalizarTextoGeografico(req.addressLocality || "");
  if (propLoc !== reqLoc) return false;

  // Ciudad
  const propCity = normalizarTextoGeografico(prop.city || "Bogota");
  const reqCity = normalizarTextoGeografico(req.ciudadDeseada || "Bogota");
  if (propCity !== reqCity) return false;

  // Tipo de inmueble
  if (prop.propertyType !== req.tipoInmuebleDeseado) return false;

  // Habitaciones
  if (Number(prop.bedrooms) !== Number(req.habitacionesMin)) return false;

  // Baños
  if (Number(prop.bathrooms) !== Number(req.banosMin)) return false;

  // Garajes
  if (Number(prop.garages) !== Number(req.parqueaderosMin)) return false;

  // Interior / Exterior (solo aplica para apartment, office, commercial, loft, consultorio)
  const appliesIntExt = ["apartment", "office", "commercial", "loft", "consultorio"].includes(prop.propertyType);
  if (appliesIntExt && prop.propertyType === req.tipoInmuebleDeseado) {
    const propIntExt = normalizarTextoGeografico((prop.amenities as any)?.interiorExterior || "");
    const reqIntExt = normalizarTextoGeografico((req.caracteristicasDeseadas as any)?.interiorExterior || "");
    if (reqIntExt && propIntExt !== reqIntExt) return false;
  }

  // 2. CAMPOS FLEXIBLES (toleran margen razonable)
  
  // Precio (±20% del presupuesto del requerimiento)
  const propPrice = parseFloat(prop.price?.toString() || "0");
  const reqBudget = parseFloat(req.presupuestoMax?.toString() || "0");
  if (reqBudget > 0 && propPrice > 0) {
    const minPrice = reqBudget * 0.80;
    const maxPrice = reqBudget * 1.20;
    if (propPrice < minPrice || propPrice > maxPrice) return false;
  }

  // Área (±15%)
  const propArea = parseFloat(prop.areaTotal?.toString() || prop.areaPrivate?.toString() || "0");
  const reqArea = parseFloat(req.areaMin?.toString() || "0");
  if (reqArea > 0 && propArea > 0) {
    const minArea = reqArea * 0.85;
    const maxArea = reqArea * 1.15;
    if (propArea < minArea || propArea > maxArea) return false;
  }

  // Estrato (±1)
  if (prop.stratum !== null && prop.stratum !== undefined && req.estratoDeseado !== null && req.estratoDeseado !== undefined) {
    let allowedEstratos: number[] = [];
    if (Array.isArray(req.estratoDeseado)) {
      allowedEstratos = req.estratoDeseado.map((e: any) => Number(e));
    } else if (typeof req.estratoDeseado === "number") {
      allowedEstratos = [req.estratoDeseado];
    } else if (typeof req.estratoDeseado === "string") {
      const parsed = parseInt(req.estratoDeseado);
      if (!isNaN(parsed)) allowedEstratos = [parsed];
    }
    
    if (allowedEstratos.length > 0) {
      const propStratum = Number(prop.stratum);
      const matchesEstrato = allowedEstratos.some(e => Math.abs(propStratum - e) <= 1);
      if (!matchesEstrato) return false;
    }
  }

  return true;
}

/**
 * Busca requerimientos que hagan match con un inmueble recién publicado.
 */
export async function findMatchesForProperty(propertyId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    // Obtener el inmueble recién publicado
    const [property] = await db.select().from(properties).where(eq(properties.id, propertyId));
    if (!property) return [];

    // Buscar requerimientos activos
    const allReqs = await db.select().from(requirements).where(eq(requirements.status, "active"));
    
    const validMatches = [];
    
    for (const req of allReqs) {
      if (evaluarMatch(req, property)) {
        // Guardar el match en la tabla propertyMatches
        await db.insert(propertyMatches).values({
          propertyId: propertyId,
          requirementId: req.id,
          matchScore: "100.00",
          status: "suggested",
        }).onConflictDoNothing();

        validMatches.push({
          ...req,
          score: 100,
          idUsuarioWhatsapp: req.idUsuarioWhatsapp,
        });
      }
    }

    console.log(`[Matching] Inmueble #${propertyId}: ${validMatches.length} matches estrictos encontrados`);
    return validMatches;
  } catch (e: any) {
    console.error("[Matching] Error buscando matches para inmueble:", e.message);
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
    // Obtener el requerimiento recién publicado
    const [req] = await db.select().from(requirements).where(eq(requirements.id, requirementId));
    if (!req) return [];

    // Buscar todos los inmuebles disponibles
    const allProps = await db.select().from(properties).where(eq(properties.available, true));
    
    const validMatches = [];

    for (const property of allProps) {
      if (evaluarMatch(req, property)) {
        await db.insert(propertyMatches).values({
          propertyId: property.id,
          requirementId: requirementId,
          matchScore: "100.00",
          status: "suggested",
        }).onConflictDoNothing();

        validMatches.push({
          ...property,
          score: 100,
          idUsuarioWhatsapp: property.idUsuarioWhatsapp,
        });
      }
    }

    console.log(`[Matching] Requerimiento #${requirementId}: ${validMatches.length} matches estrictos encontrados`);
    return validMatches;
  } catch (e: any) {
    console.error("[Matching] Error buscando matches para requerimiento:", e.message);
    return [];
  }
}
