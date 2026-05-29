import 'dotenv/config';
import { getDb } from '../server/db';
import { properties, requirements } from '../drizzle/schema';
import { inArray } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) return;

  const props = await db.select().from(properties).where(inArray(properties.id, [106, 110]));
  const reqs = await db.select().from(requirements).where(inArray(requirements.id, [25, 27]));

  console.log('--- PROPERTIES ---');
  props.forEach(p => {
    console.log(`ID: ${p.id} | Name: ${p.name} | City: ${p.city} | Zone: ${p.zone} | Type: ${p.propertyType} | Trans: ${p.transactionType} | Price: ${p.price}`);
  });

  console.log('--- REQUIREMENTS ---');
  reqs.forEach(r => {
    console.log(`ID: ${r.id} | Name: ${r.name} | Ciudad: ${r.ciudadDeseada} | Zona: ${r.zonaDeseada} | Type: ${r.tipoInmuebleDeseado} | Trans: ${r.tipoNegocioDeseado} | Budget: ${r.presupuestoMax}`);
  });
}

main().catch(console.error);
