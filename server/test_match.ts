import { getDb } from "./db";
import { requirements, properties } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { explicarMatch } from "./_core/matching";

async function run() {
  const db = await getDb();
  
  const req = await db.query.requirements.findFirst({
    where: eq(requirements.id, 252)
  });
  
  const prop = await db.query.properties.findFirst({
    where: eq(properties.id, 216)
  });
  
  if (req && prop) {
    console.log("Req Budget:", req.presupuestoMax, req.transactionType);
    console.log("Prop Price:", prop.price, "Rent:", prop.priceRent, prop.transactionType);
    
    const explanation = explicarMatch(req as any, prop as any);
    console.log(JSON.stringify(explanation, null, 2));
  } else {
    console.log("Not found");
  }
}

run().catch(console.error).finally(() => process.exit(0));
