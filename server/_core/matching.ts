import { getDb } from "../db";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { propertyMatches, properties, requirements } from "../../drizzle/schema";

/**
 * Busca requerimientos que hagan match con un inmueble recién publicado.
 * Compara zona, tipo de negocio, tipo de inmueble y precio.
 */
export async function findMatchesForProperty(propertyId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    // Obtener el inmueble recién publicado
    const [property] = await db.select().from(properties).where(eq(properties.id, propertyId));
    if (!property) return [];

    // Buscar requerimientos activos que coincidan
    const allReqs = await db.select().from(requirements);
    
    const validMatches = [];
    
    for (const req of allReqs) {
      let score = 0;

      // Match por tipo de negocio (venta/arriendo) - peso alto
      if (req.tipoNegocioDeseado === property.transactionType) score += 40;
      else continue; // Si el tipo de negocio no coincide, skip

      // Match por tipo de inmueble
      if (req.tipoInmuebleDeseado === property.propertyType) score += 30;

      // Match por zona (búsqueda parcial)
      if (req.zonaDeseada && property.zone) {
        const zonaReq = req.zonaDeseada.toLowerCase();
        const zonaProp = property.zone.toLowerCase();
        if (zonaReq.includes(zonaProp) || zonaProp.includes(zonaReq)) score += 20;
      }

      // Match por presupuesto
      const price = parseFloat(property.price?.toString() || "0");
      if (req.presupuestoMax && price > 0) {
        const max = parseFloat(req.presupuestoMax.toString());
        if (price <= max) score += 10;
        else if (price <= max * 1.15) score += 5; // Dentro del 15% del presupuesto
      }

      if (score >= 40) { // Umbral mínimo: coincide tipo de negocio + algo más
        // Guardar el match en la tabla propertyMatches
        await db.insert(propertyMatches).values({
          propertyId: propertyId,
          requirementId: req.id,
          matchScore: score.toString(),
          status: "suggested",
        }).onConflictDoNothing();

        validMatches.push({
          ...req,
          score,
          idUsuarioWhatsapp: req.idUsuarioWhatsapp,
        });
      }
    }

    console.log(`[Matching] Inmueble #${propertyId}: ${validMatches.length} matches encontrados`);
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
    const allProps = await db.select().from(properties);
    
    const validMatches = [];

    for (const property of allProps) {
      let score = 0;

      // Match por tipo de negocio - peso alto
      if (req.tipoNegocioDeseado === property.transactionType) score += 40;
      else continue;

      // Match por tipo de inmueble
      if (req.tipoInmuebleDeseado === property.propertyType) score += 30;

      // Match por zona
      if (req.zonaDeseada && property.zone) {
        const zonaReq = req.zonaDeseada.toLowerCase();
        const zonaProp = property.zone.toLowerCase();
        if (zonaReq.includes(zonaProp) || zonaProp.includes(zonaReq)) score += 20;
      }

      // Match por presupuesto
      const price = parseFloat(property.price?.toString() || "0");
      if (req.presupuestoMax && price > 0) {
        const max = parseFloat(req.presupuestoMax.toString());
        if (price <= max) score += 10;
        else if (price <= max * 1.15) score += 5;
      }

      if (score >= 40) {
        await db.insert(propertyMatches).values({
          propertyId: property.id,
          requirementId: requirementId,
          matchScore: score.toString(),
          status: "suggested",
        }).onConflictDoNothing();

        validMatches.push({
          ...property,
          score,
          idUsuarioWhatsapp: property.idUsuarioWhatsapp,
        });
      }
    }

    console.log(`[Matching] Requerimiento #${requirementId}: ${validMatches.length} matches encontrados`);
    return validMatches;
  } catch (e: any) {
    console.error("[Matching] Error buscando matches para requerimiento:", e.message);
    return [];
  }
}
