/**
 * Script de Purga y Desactivación de Duplicados & Sincronización Global v25.1
 */
import 'dotenv/config';
import { getDb } from '../db';
import { requirements, properties, propertyMatches, notificationLogs, matchFeedback } from '../../drizzle/schema';
import { eq, inArray } from 'drizzle-orm';

async function purgeDuplicatesAndResync() {
  const db = await getDb();
  if (!db) {
    console.error('❌ Error: No hay conexión a base de datos.');
    process.exit(1);
  }

  console.log('🚀 Iniciando desactivación y purga de duplicados...');

  // ── 1. DESACTIVAR REQUERIMIENTOS DUPLICADOS ──
  const allReqs = await db.select().from(requirements);
  const seenReqs = new Map<string, typeof allReqs[0]>();
  const duplicateReqIds: number[] = [];

  for (const r of allReqs) {
    const normText = (r.rawText || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!normText || normText.length < 15) continue;
    if (seenReqs.has(normText)) {
      duplicateReqIds.push(r.id);
      console.log(`Req duplicado: ID #${r.id} es clon de ID #${seenReqs.get(normText)!.id}`);
    } else {
      seenReqs.set(normText, r);
    }
  }

  console.log(`📋 Encontrados ${duplicateReqIds.length} requerimientos duplicados.`);

  if (duplicateReqIds.length > 0) {
    for (const reqId of duplicateReqIds) {
      // 1. Borrar notificationLogs y matchFeedback de matches asociados
      const matches = await db.select({ id: propertyMatches.id }).from(propertyMatches).where(eq(propertyMatches.requirementId, reqId));
      for (const m of matches) {
        await db.delete(notificationLogs).where(eq(notificationLogs.matchId, m.id));
        await db.delete(matchFeedback).where(eq(matchFeedback.matchId, m.id));
      }
      // 2. Borrar matches
      await db.delete(propertyMatches).where(eq(propertyMatches.requirementId, reqId));
      // 3. Marcar requerimiento como expirado/inactivo
      await db.update(requirements).set({ status: "expired" }).where(eq(requirements.id, reqId));
    }
    console.log(`✅ ${duplicateReqIds.length} requerimientos duplicados desactivados y matches purgados.`);
  }

  // ── 2. DESACTIVAR PROPIEDADES DUPLICADAS ──
  const allProps = await db.select().from(properties);
  const seenProps = new Map<string, typeof allProps[0]>();
  const duplicatePropIds: number[] = [];

  for (const p of allProps) {
    const normText = (p.rawText || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!normText || normText.length < 20) continue;
    if (seenProps.has(normText)) {
      duplicatePropIds.push(p.id);
      console.log(`Propiedad duplicada: ID #${p.id} es clon de ID #${seenProps.get(normText)!.id}`);
    } else {
      seenProps.set(normText, p);
    }
  }

  console.log(`🏠 Encontradas ${duplicatePropIds.length} propiedades duplicadas.`);

  if (duplicatePropIds.length > 0) {
    for (const propId of duplicatePropIds) {
      const matches = await db.select({ id: propertyMatches.id }).from(propertyMatches).where(eq(propertyMatches.propertyId, propId));
      for (const m of matches) {
        await db.delete(notificationLogs).where(eq(notificationLogs.matchId, m.id));
        await db.delete(matchFeedback).where(eq(matchFeedback.matchId, m.id));
      }
      await db.delete(propertyMatches).where(eq(propertyMatches.propertyId, propId));
      await db.update(properties).set({ available: false }).where(eq(properties.id, propId));
    }
    console.log(`✅ ${duplicatePropIds.length} propiedades duplicadas desactivadas y matches purgados.`);
  }

  // ── 3. PURGA DE PROPIEDADES FALSAS (EJ: #1562) ──
  const falseProp = await db.select().from(properties).where(eq(properties.id, 1562));
  if (falseProp.length > 0) {
    console.log(`🧹 Desactivando propiedad falsa #1562...`);
    const matches = await db.select({ id: propertyMatches.id }).from(propertyMatches).where(eq(propertyMatches.propertyId, 1562));
    for (const m of matches) {
      await db.delete(notificationLogs).where(eq(notificationLogs.matchId, m.id));
      await db.delete(matchFeedback).where(eq(matchFeedback.matchId, m.id));
    }
    await db.delete(propertyMatches).where(eq(propertyMatches.propertyId, 1562));
    await db.update(properties).set({ available: false }).where(eq(properties.id, 1562));
    console.log(`✅ Propiedad falsa #1562 desactivada.`);
  }

  console.log('✨ Desactivación de duplicados completada con éxito.');
}

purgeDuplicatesAndResync()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error en script de duplicados:', err);
    process.exit(1);
  });
