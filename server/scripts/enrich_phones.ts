import 'dotenv/config';
import { getDb } from '../db';
import { properties, requirements } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export function extractColombianPhoneFromText(text: string | null | undefined): string | null {
  if (!text) return null;
  const clean = text.replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0]/g, ' ');

  // 1. Enlaces directos wa.me
  const waMatch = clean.match(/wa\.me\/(?:57)?(3\d{9})/i);
  if (waMatch) return '57' + waMatch[1];

  // 2. Prefijos de contacto
  const contactMatch = clean.match(/(?:tel[eé]fono|tel|celular|cel|whatsapp|wapp|wa|contacto|llamar|inf|info|informaci[oó]n|asesor|escribir|comunicarse|m[oó]vil)\s*:?\s*(?:\+?57\s*)?(3[\d\s.\-]{8,14})/i);
  if (contactMatch) {
    const digits = contactMatch[1].replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('3')) {
      return '57' + digits;
    }
  }

  // 3. Patrón celular Colombia (3xx xxx xxxx)
  const genericMatches = clean.matchAll(/(?:\+?57\s*)?(3\d{2}[\s.\-]?\d{3}[\s.\-]?\d{4})\b/g);
  for (const m of genericMatches) {
    const digits = m[1].replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('3')) {
      const idx = m.index ?? 0;
      const before = clean.substring(Math.max(0, idx - 15), idx).toLowerCase();
      const after = clean.substring(idx + m[0].length, idx + m[0].length + 15).toLowerCase();
      
      if (before.includes('$') || before.includes('precio') || before.includes('canon') || before.includes('ppto') || before.includes('presupuesto')) {
        continue;
      }
      if (after.includes('millon') || after.includes('mil') || after.includes('m2') || after.includes('mts') || after.includes('pesos')) {
        continue;
      }
      return '57' + digits;
    }
  }
  return null;
}

async function main() {
  const db = await getDb();
  if (!db) return;
  
  const allProps = await db.select().from(properties);
  const allReqs = await db.select().from(requirements);
  
  let propUpdated = 0;
  let reqUpdated = 0;
  
  for (const p of allProps) {
    const isLidOrNull = !p.idUsuarioWhatsapp || p.idUsuarioWhatsapp.length > 13 || p.idUsuarioWhatsapp.startsWith('1203');
    if (isLidOrNull) {
      const textToSearch = [p.rawText, p.description, p.name].filter(Boolean).join(' ');
      const phone = extractColombianPhoneFromText(textToSearch);
      if (phone) {
        await db.update(properties).set({ idUsuarioWhatsapp: phone }).where(eq(properties.id, p.id));
        propUpdated++;
      }
    }
  }
  
  for (const r of allReqs) {
    const isLidOrNull = !r.idUsuarioWhatsapp || r.idUsuarioWhatsapp.length > 13 || r.idUsuarioWhatsapp.startsWith('1203');
    if (isLidOrNull) {
      const textToSearch = [r.rawText, r.name].filter(Boolean).join(' ');
      const phone = extractColombianPhoneFromText(textToSearch);
      if (phone) {
        await db.update(requirements).set({ idUsuarioWhatsapp: phone }).where(eq(requirements.id, r.id));
        reqUpdated++;
      }
    }
  }
  
  console.log(`✅ Inmuebles enriquecidos con teléfono real extraído: ${propUpdated}`);
  console.log(`✅ Requerimientos enriquecidos con teléfono real extraído: ${reqUpdated}`);
  process.exit(0);
}

main().catch(console.error);
