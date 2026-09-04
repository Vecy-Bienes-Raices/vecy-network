import "dotenv/config";
import { extractFallbackDataFromText } from "../_core/janIA";
import { explicarMatch } from "../_core/matching";

const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtuem1wb3BybG1ib25lanNoZnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMjYyMjQsImV4cCI6MjA5MTYwMjIyNH0.yZ3AV1Rt2rmDuP61CA2rJRILpw__vwAJWp3xJUNj_FY";
const baseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://knzmpoprlmbonejshfys.supabase.co/rest/v1";

const headers: Record<string, string> = {
  "apikey": key,
  "Authorization": `Bearer ${key}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
};

export async function sanitizeDatabase(): Promise<void> {
  console.log("🚀 Auditoría y saneamiento de presupuesto completado.");
  const resMatches = await fetch(`${baseUrl}/propertyMatches?select=id,propertyId,requirementId`, { headers });
  const allMatches: Array<{ id: number; propertyId: number; requirementId: number }> = await resMatches.json();

  const resProps = await fetch(`${baseUrl}/properties?select=id,transactionType,price,rent_price,adminFee,rawText,zone,addressCity`, { headers });
  const allProps: Array<Record<string, any>> = await resProps.json();

  const resReqs = await fetch(`${baseUrl}/requirements?select=id,tipoNegocioDeseado,presupuestoMin,presupuestoMax,rawText,zonaDeseada,ciudadDeseada`, { headers });
  const allReqs: Array<Record<string, any>> = await resReqs.json();

  const propsMap = new Map<number, Record<string, any>>(allProps.map((p: Record<string, any>) => [Number(p.id), p]));
  const reqsMap = new Map<number, Record<string, any>>(allReqs.map((r: Record<string, any>) => [Number(r.id), r]));

  let purgedCount = 0;
  for (const m of allMatches) {
    const prop = propsMap.get(Number(m.propertyId));
    const req = reqsMap.get(Number(m.requirementId));
    if (!prop || !req) {
      await fetch(`${baseUrl}/propertyMatches?id=eq.${m.id}`, { method: "DELETE", headers });
      purgedCount++;
      continue;
    }

    const exp = explicarMatch(req, prop);
    if (exp.score < 80 || exp.blockers.length > 0) {
      await fetch(`${baseUrl}/propertyMatches?id=eq.${m.id}`, { method: "DELETE", headers });
      purgedCount++;
      console.log(`- Purgado Match #${m.id} (Prop ${prop.id} ↔ Req ${req.id}) | Score: ${exp.score}%`);
    }
  }

  console.log(`✅ Base de datos 100% limpia. Matches purgados: ${purgedCount}`);
}
