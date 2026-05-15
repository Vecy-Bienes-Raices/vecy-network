import "dotenv/config";
import { getDb } from "./server/db";
import { properties } from "./drizzle/schema";
import { eq, like, or } from "drizzle-orm";

async function deleteUnknowns() {
  const db = await getDb();
  if (!db) {
    console.error("No database connection");
    return;
  }
  
  const allProps = await db.select().from(properties);
  console.log("Current properties in DB:");
  allProps.forEach(p => console.log(`- ID: ${p.id} | Name: ${p.name}`));

  // Delete properties containing 'Ulrich' or 'Calleja' if they are the unknown ones.
  // Wait, there is a valid "Casa en La Calleja" from our seed list!
  // The unknown one is "Apartamento La Calleja" and "Apartamento Cedritos Ulrich".
  
  const toDelete = allProps.filter(p => p.id === 1);

  console.log("Deleting the following:", toDelete.map(p => p.name));

  for (const p of toDelete) {
    await db.delete(properties).where(eq(properties.id, p.id));
    console.log(`Deleted: ${p.name}`);
  }

  process.exit(0);
}

deleteUnknowns().catch(console.error);
