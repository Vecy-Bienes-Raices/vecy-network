import { getDb } from '../db';
import { properties, propertyMatches, requirements, notificationLogs, matchFeedback } from '../../drizzle/schema';
import { eq, inArray } from 'drizzle-orm';

export function isHollowText(text: string | null | undefined): { isHollow: boolean; reason: string } {
  if (!text || text.trim() === '') {
    return { isHollow: true, reason: 'Texto vacío o nulo' };
  }
  const clean = text.trim();
  
  // Si contiene un enlace externo válido, tiene ficha técnica en la web
  if (/https?:\/\/[^\s]+/i.test(clean)) {
    return { isHollow: false, reason: 'Contiene enlace externo' };
  }

  // Descartar mensajes conversacionales típicos de WhatsApp
  const lower = clean.toLowerCase();
  if (
    lower.startsWith('hola ') ||
    lower.startsWith('buenas ') ||
    lower.startsWith('buen dia') ||
    lower.startsWith('buenos dias') ||
    lower.includes('quien tiene') ||
    lower.includes('quién tiene') ||
    lower.includes('quien mando') ||
    lower.includes('quién mandó') ||
    lower.includes('cual es el presupuesto') ||
    lower.includes('cuál es el presupuesto') ||
    lower.includes('sigue estando disponible') ||
    lower.includes('escribir al interno') ||
    lower.includes('fotos por interno') ||
    lower.includes('info por interno')
  ) {
    return { isHollow: true, reason: `Mensaje conversacional o consulta informal: "${clean}"` };
  }

  const words = clean.split(/\s+/).filter(Boolean);
  
  // Si tiene menos de 15 palabras y no tiene enlace
  if (words.length < 15) {
    const hasPrice = /(?:\$|\b(?:millones|mdp|cop|pesos|precio|canon|valor)\b|\d{3,}\.\d{3})/i.test(clean);
    const hasArea = /(?:\b(?:m2|mts|metros)\b)/i.test(clean);
    const hasRooms = /(?:\b(?:alcobas?|hab(?:itaciones)?|cuartos?|dormitorios?|baños?)\b)/i.test(clean);
    const hasAddress = /(?:\b(?:calle|carrera|cll|cra|diagonal|diag|transversal|trans|clle|cr)\b\s*\d+)/i.test(clean);

    // Contar cuántos datos técnicos mínimos reales están en el texto
    let techCount = 0;
    if (hasPrice) techCount++;
    if (hasArea) techCount++;
    if (hasRooms) techCount++;
    if (hasAddress) techCount++;

    // Si no tiene al menos 2 datos técnicos explícitos en el texto, es una frase hueca / teaser
    if (techCount < 2) {
      return { 
        isHollow: true, 
        reason: `Frase suelta/teaser sin ficha técnica mínima (${words.length} palabras, ${techCount} datos técnicos): "${clean}"` 
      };
    }
  }

  return { isHollow: false, reason: 'Texto con suficiente información comercial' };
}

async function run() {
  const db = await getDb();
  if (!db) {
    console.error('No database connection');
    return;
  }

  console.log('=== AUDITORÍA DE PUBLICACIONES HUECAS / FRASES SUELTAS ===');
  
  const allProps = await db.select().from(properties);
  const hollowProps = allProps.filter(p => isHollowText(p.rawText).isHollow);
  
  console.log(`Total propiedades en BD: ${allProps.length}`);
  console.log(`Propiedades huecas detectadas: ${hollowProps.length}`);

  const hollowPropIds = hollowProps.map(p => p.id);
  
  // Matches vinculados a estas propiedades
  const matches = await db.select().from(propertyMatches);
  const matchesToPurge = matches.filter(m => hollowPropIds.includes(m.propertyId));

  console.log(`Total matches en BD: ${matches.length}`);
  console.log(`Matches espurios vinculados a propiedades huecas: ${matchesToPurge.length}`);

  for (const m of matchesToPurge) {
    const p = hollowProps.find(hp => hp.id === m.propertyId);
    console.log(` -> Match #M${m.id} (Score: ${m.matchScore}) vincula Prop #${m.propertyId} ("${p?.rawText?.replace(/\n/g, ' ')}")`);
  }

  // Eliminar matches espurios
  if (matchesToPurge.length > 0) {
    const matchIds = matchesToPurge.map(m => m.id);
    
    // Desvincular foreign keys
    await db.update(notificationLogs).set({ matchId: null }).where(inArray(notificationLogs.matchId, matchIds));
    await db.delete(matchFeedback).where(inArray(matchFeedback.matchId, matchIds));
    
    // Eliminar de propertyMatches
    await db.delete(propertyMatches).where(inArray(propertyMatches.id, matchIds));
    console.log(`\n✅ ${matchIds.length} matches espurios purgados exitosamente de propertyMatches.`);
  }

  // Marcar propiedades huecas como no disponibles
  if (hollowPropIds.length > 0) {
    await db.update(properties).set({ available: false }).where(inArray(properties.id, hollowPropIds));
    console.log(`✅ ${hollowPropIds.length} propiedades huecas marcadas como no disponibles (available = false).`);
  }

  console.log('=== PURGA FINALIZADA CON ÉXITO ===');
}

run().catch(console.error);
