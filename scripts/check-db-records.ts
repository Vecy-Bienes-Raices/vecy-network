import { config } from 'dotenv';
config();

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { properties, requirements } from '../drizzle/schema';
import { desc, eq } from 'drizzle-orm';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('❌ DATABASE_URL no definida'); process.exit(1); }

  const client = postgres(url, { prepare: false });
  const db = drizzle(client);

  const props = await db.select({
    id: properties.id,
    name: properties.name,
    zone: properties.zone,
    idUsuarioWhatsapp: properties.idUsuarioWhatsapp,
    createdAt: properties.createdAt,
  }).from(properties).orderBy(desc(properties.createdAt)).limit(15);

  const reqs = await db.select({
    id: requirements.id,
    name: requirements.name,
    idUsuarioWhatsapp: requirements.idUsuarioWhatsapp,
    createdAt: requirements.createdAt,
  }).from(requirements).orderBy(desc(requirements.createdAt)).limit(15);

  console.log('=== PROPERTIES (últimas 15) ===');
  console.table(props);
  console.log(`Total mostradas: ${props.length}`);

  console.log('\n=== REQUIREMENTS (últimas 15) ===');
  console.table(reqs);
  console.log(`Total mostradas: ${reqs.length}`);

  // Corregir registros con nombre genérico
  const badNames = ['TestUser', 'Asesor', 'Colega'];
  let fixedCount = 0;

  for (const p of props) {
    if (!p.name || badNames.includes(p.name) || p.name.startsWith('Asesor ')) {
      const phone = (p.idUsuarioWhatsapp || '').split('@')[0];
      const newName = phone ? `Asesor-${phone}` : p.name;
      if (newName !== p.name) {
        await db.update(properties).set({ name: newName }).where(eq(properties.id, p.id));
        console.log(`✅ Property ID ${p.id}: "${p.name}" → "${newName}"`);
        fixedCount++;
      }
    }
  }

  for (const r of reqs) {
    if (!r.name || badNames.includes(r.name) || (r.name || '').startsWith('Asesor ')) {
      const phone = (r.idUsuarioWhatsapp || '').split('@')[0];
      const newName = phone ? `Asesor-${phone}` : r.name;
      if (newName !== r.name) {
        await db.update(requirements).set({ name: newName }).where(eq(requirements.id, r.id));
        console.log(`✅ Requirement ID ${r.id}: "${r.name}" → "${newName}"`);
        fixedCount++;
      }
    }
  }

  if (fixedCount === 0) console.log('\n✨ No hay registros con nombres genéricos que corregir.');
  else console.log(`\n✅ ${fixedCount} registro(s) corregido(s).`);

  await client.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
