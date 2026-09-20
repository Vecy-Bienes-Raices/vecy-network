import "dotenv/config";
import { getDb } from "../db";
import { properties, requirements, propertyMatches } from "../../drizzle/schema";
import { explicarMatch, calcularIPC } from "../_core/matching";
import { eq } from "drizzle-orm";

export async function createPerfectMatch() {
  const db = await getDb();
  if (!db) {
    console.error("No se pudo conectar a la base de datos");
    return;
  }

  console.log("Creando Demanda (Requirement) con especificaciones de prueba 100%...");
  
  const reqText = `Busco para cliente directo apto en venta en Chicó Norte, Chapinero, Bogotá. 
Presupuesto $1.800.000.000. 
Administración máxima $1.200.000. 
Área 180 a 200 m2. 
Piso 5 exterior. 
3 habitaciones, 3 baños, 2 parqueaderos independientes. 
Estrato 6, máximo 10 años de construido. Remodelado.
Indispensable balcón, estudio o estar de TV, cuarto y baño de servicio (CBS), vigilancia 24 horas, ascensor, depósito y parqueadero de visitantes. 
Contacto: 3001234567`;

  const [newReq] = await db.insert(requirements).values({
    name: "Apartamento 180m² en Chicó Norte Venta",
    tipoInmuebleDeseado: "apartment",
    tipoNegocioDeseado: "venta",
    ciudadDeseada: "Bogotá",
    zonaDeseada: "Chicó Norte",
    addressCity: "Bogotá",
    addressLocality: "Chapinero",
    addressNeighborhood: "Chicó Norte",
    presupuestoMin: "1500000000",
    presupuestoMax: "1800000000",
    monedaPresupuesto: "COP",
    areaMin: "180",
    habitacionesMin: 3,
    banosMin: 3,
    parqueaderosMin: 2,
    adminFeeMax: "1200000",
    estratoDeseado: [6],
    status: "active",
    idUsuarioWhatsapp: "573001234567@s.whatsapp.net",
    nombreUsuarioWhatsapp: "Broker Comprador Directo",
    rawText: reqText,
    caracteristicasDeseadas: {
      antiguedadMax: 10,
      piso: "PISO 5",
      interiorExterior: "Exterior"
    }
  }).returning();

  console.log(`✅ Demanda creada: ID #${newReq.id}`);

  console.log("Creando Oferta (Property) con coincidencia idéntica del 100%...");

  const propText = `Hermoso apartamento en venta en Chicó Norte, Chapinero, Bogotá. 
Precio $1.800.000.000. 
Administración $950.000. 
Área total 185 m2 (180 m2 privados). 
Ubicado en piso 5 con espectacular vista exterior muy iluminado. 
3 habitaciones, 3 baños, 2 parqueaderos independientes. 
Estrato 6, 8 años de construido (año 2018). Totalmente remodelado en excelente estado. 
Cuenta con balcón exterior, estudio privado, cuarto y baño de servicio (CBS), vigilancia 24 horas, ascensor directo, depósito privado y parqueadero para visitantes. 
Contacto: 3109876543`;

  const [newProp] = await db.insert(properties).values({
    name: "Apartamento en Venta en Chicó Norte 185m² Piso 5",
    description: propText,
    propertyType: "apartment",
    transactionType: "venta",
    price: "1800000000",
    adminFee: "950000",
    currency: "COP",
    city: "Bogotá",
    zone: "Chicó Norte",
    addressCity: "Bogotá",
    addressLocality: "Chapinero",
    addressNeighborhood: "Chicó Norte",
    bedrooms: 3,
    bathrooms: 3,
    garages: 2,
    garageType: "independiente",
    stratum: 6,
    floorDetail: "PISO 5",
    areaTotal: "185",
    areaPrivate: "180",
    yearBuilt: 2018,
    antiguedadAnos: 8,
    available: true,
    idUsuarioWhatsapp: "573109876543@s.whatsapp.net",
    nombreUsuarioWhatsapp: "Broker Captador Exclusivo",
    rawText: propText,
    amenities: {
      balcon: true,
      estudio: true,
      cbs: true,
      ascensor: true,
      deposito: true,
      vigilancia: true,
      visitantes: true,
      interiorExterior: "Exterior",
      piso: "PISO 5"
    }
  }).returning();

  console.log(`✅ Oferta creada: ID #${newProp.id}`);

  // Evaluar con el motor autoritativo de matching
  const explanation = explicarMatch(newReq, newProp);
  const ipc = calcularIPC(newReq, newProp, explanation.score);
  explanation.ipc = ipc;

  console.log(`\n🎯 SCORE RESULTANTE EN MOTOR TYPESCRIPT: ${explanation.score}%`);
  console.log("Puntos positivos detectados:");
  explanation.positives.forEach(p => console.log(` - ${p}`));
  if (explanation.blockers.length > 0) {
    console.error("Bloqueadores inesperados:", explanation.blockers);
  }

  // Insertar el match en la tabla propertyMatches
  const [match] = await db.insert(propertyMatches).values({
    propertyId: newProp.id,
    requirementId: newReq.id,
    matchScore: explanation.score.toFixed(2),
    matchReason: `VECY CORE TS: MATCH PERFECTO 100.00/100`,
    matchExplanation: explanation,
    ipc: ipc,
    status: "suggested",
    ownerConfirmed: false,
    seekerConfirmed: false,
  }).returning();

  console.log(`\n🌟 MATCH PERFECTO 100% REGISTRADO CON ÉXITO:`);
  console.log(`Match ID: #${match.id}`);
  console.log(`Property ID: #${newProp.id} ("${newProp.name}")`);
  console.log(`Requirement ID: #${newReq.id} ("${newReq.zonaDeseada} - ${newReq.presupuestoMax}")`);
  console.log(`Score: ${match.matchScore}%`);
  
  return { matchId: match.id, propertyId: newProp.id, requirementId: newReq.id, score: match.matchScore };
}

if (process.argv[1]?.endsWith("create_perfect_100_match.ts")) {
  createPerfectMatch().then(() => process.exit(0)).catch(err => {
    console.error("Error creando match perfecto:", err);
    process.exit(1);
  });
}
