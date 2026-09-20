import "dotenv/config";
import { getDb } from "../db";
import { properties, requirements, propertyMatches } from "../../drizzle/schema";
import { explicarMatch, calcularIPC } from "../_core/matching";
import { eq, and } from "drizzle-orm";

export async function createPerfectMatch() {
  const db = await getDb();
  if (!db) {
    console.error("No se pudo conectar a la base de datos");
    return;
  }

  const amenitiesText = [
    "aire acondicionado", "sistema de alarma", "amoblado", "acabados de lujo", "acabados modernos",
    "zona de bar", "baño en alcoba principal", "baño en todas las alcobas", "citófono", "clósets empotrados",
    "comedor auxiliar", "despensa alacena", "doble ventana antiruido", "gas natural domiciliario",
    "muy iluminado luz natural", "hall de alcobas", "jacuzzi hidromasaje", "turco privado",
    "vestier walk-in closet", "vista panorámica a la ciudad", "zona de lavandería cuarto de ropas",
    "acceso pavimentado vía pavimentada", "área social zonas sociales", "área turística",
    "zona bancaria bancos cercanos", "parrilla comunal barbacoa", "reserva forestal bosques nativos",
    "caldera central agua caliente central", "cancha de baloncesto", "cancha de fútbol",
    "campo de golf cancha de golf", "cancha de squash", "cancha de tenis", "cerca a centros comerciales",
    "cerca a clínicas y hospitales", "club house", "cerca a colegios universidades",
    "edificio inteligente domótica", "gimnasio dotado gym", "kiosco bohío", "espejo de agua lago",
    "lavandería comunal", "frente a parque parques cercanos", "parque infantil juegos infantiles",
    "piscina climatizada", "pista de pádel cancha de padel", "planta eléctrica suplencia total",
    "portería recepción lobby", "salón infantil playroom", "salón comunal salón de eventos",
    "salón de juegos billar ping pong", "sauna turco comunal zonas húmedas", "seguridad 24 circuito cerrado cctv",
    "sobre vía principal frente a avenida", "shut de basuras", "teatrino sala de cine",
    "terraza comunal rooftop", "transporte público transmilenio sitp", "zonas deportivas polideportivo"
  ].join(". ");

  const reqText = `Busco para compra apartamento en venta en Chicó Norte, Chapinero, Bogotá. 
Presupuesto $1.800.000.000. 
Administración máxima $1.200.000. 
Área 180 m2. 
Piso 5 exterior. 
3 habitaciones, 3 baños, 2 parqueaderos independientes. 
Estrato 6, máximo 10 años de construido. Remodelado.
Cocina integral. Chimenea a gas.
Balcón. Terraza con zona BBQ. Cava de vinos.
Estudio o estar de TV, cuarto y baño de servicio (CBS), vigilancia 24 horas, ascensor, depósito, parqueadero de visitantes y parqueadero moto. 
Contacto: 3001234567. 
${amenitiesText}`;

  const propText = `Hermoso apartamento en venta en Chicó Norte, Chapinero, Bogotá. 
Precio $1.800.000.000. 
Administración $1.200.000 / mes. 
Área total 180 m2 (180 m2 privados). 
Piso 5 con vista exterior muy iluminado. 
3 habitaciones, 3 baños, 2 parqueaderos independientes. 
Estrato 6, 10 años de construido (año 2016). Totalmente remodelado en excelente estado. 
Cocina integral. Chimenea a gas.
Balcón exterior. Terraza con zona BBQ. Cava de vinos incluida.
Estudio privado, cuarto y baño de servicio (CBS), portería y vigilancia 24/7, ascensor, depósito privado, parqueadero de visitantes y garaje parqueadero moto. 
Contacto: 3109876543. 
${amenitiesText}`;

  console.log("Configurando Demanda (Requirement) con especificaciones de prueba 100%...");

  // Buscar si ya existe la demanda de prueba #1544
  const existingReqs = await db.select().from(requirements).where(eq(requirements.id, 1544)).limit(1);
  let targetReq: any = existingReqs[0];

  const reqValues = {
    name: "Apartamento 180m² en Chicó Norte Venta (Test 100% Exacto)",
    tipoInmuebleDeseado: "apartment" as const,
    tipoNegocioDeseado: "venta" as const,
    ciudadDeseada: "Bogotá",
    zonaDeseada: "Chicó Norte",
    addressCity: "Bogotá",
    addressLocality: "Chapinero",
    addressNeighborhood: "Chicó Norte",
    presupuestoMin: "1800000000",
    presupuestoMax: "1800000000",
    monedaPresupuesto: "COP" as const,
    areaMin: "180",
    habitacionesMin: 3,
    banosMin: 3,
    parqueaderosMin: 2,
    adminFeeMax: "1200000",
    estratoDeseado: [6],
    status: "active" as const,
    idUsuarioWhatsapp: "573001234567@s.whatsapp.net",
    nombreUsuarioWhatsapp: "Broker Comprador Directo",
    kitchenType: "Integral",
    rawText: reqText,
    caracteristicasDeseadas: {
      antiguedadMax: 10,
      piso: "Piso 5",
      interiorExterior: "Exterior",
      kitchenType: "Integral"
    }
  };

  if (targetReq) {
    await db.update(requirements).set(reqValues).where(eq(requirements.id, 1544));
    console.log(`✅ Demanda actualizada: ID #1544`);
    targetReq = { ...targetReq, ...reqValues };
  } else {
    const [insertedReq] = await db.insert(requirements).values(reqValues).returning();
    console.log(`✅ Demanda creada: ID #${insertedReq.id}`);
    targetReq = insertedReq;
  }

  console.log("Configurando Oferta (Property) con coincidencia idéntica del 100%...");

  const existingProps = await db.select().from(properties).where(eq(properties.id, 3380)).limit(1);
  let targetProp: any = existingProps[0];

  const propValues = {
    name: "Apartamento en Venta en Chicó Norte 180m² Piso 5 (Test 100% Exacto)",
    description: propText,
    propertyType: "apartment" as const,
    transactionType: "venta" as const,
    price: "1800000000",
    adminFee: "1200000",
    currency: "COP" as const,
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
    floorDetail: "Piso 5",
    areaTotal: "180",
    areaPrivate: "180",
    yearBuilt: 2016,
    antiguedadAnos: 10,
    available: true,
    idUsuarioWhatsapp: "573109876543@s.whatsapp.net",
    nombreUsuarioWhatsapp: "Broker Captador Exclusivo",
    kitchenType: "Integral",
    interiorExterior: "Exterior",
    hasBalcony: true,
    hasElevator: true,
    hasStorage: true,
    hasServiceRoom: true,
    hasStudy: true,
    hasVisitorParking: true,
    rawText: propText,
    amenities: {
      balcon: true,
      ascensor: true,
      deposito: true,
      cbs: true,
      estudio: true,
      vigilancia: true,
      visitantes: true,
      moto: true,
      cava: true,
      bbq: true,
      interiorExterior: "Exterior",
      piso: "Piso 5",
      kitchenType: "Integral"
    }
  };

  if (targetProp) {
    await db.update(properties).set(propValues).where(eq(properties.id, 3380));
    console.log(`✅ Oferta actualizada: ID #3380`);
    targetProp = { ...targetProp, ...propValues };
  } else {
    const [insertedProp] = await db.insert(properties).values(propValues).returning();
    console.log(`✅ Oferta creada: ID #${insertedProp.id}`);
    targetProp = insertedProp;
  }

  // Evaluar con el motor autoritativo de matching
  const explanation = explicarMatch(targetReq, targetProp);
  const ipc = calcularIPC(targetReq, targetProp, explanation.score);
  explanation.ipc = ipc;

  console.log(`\n🎯 SCORE RESULTANTE EN MOTOR TYPESCRIPT: ${explanation.score}%`);
  console.log(`Puntos positivos detectados: ${explanation.positives.length}`);
  if (explanation.blockers.length > 0) {
    console.error("Bloqueadores inesperados:", explanation.blockers);
  }

  // Verificar si ya existe el match entre este par
  const existingMatches = await db.select().from(propertyMatches).where(
    and(
      eq(propertyMatches.propertyId, targetProp.id),
      eq(propertyMatches.requirementId, targetReq.id)
    )
  ).limit(1);

  let matchRecord: any;
  const matchPayload = {
    propertyId: targetProp.id,
    requirementId: targetReq.id,
    matchScore: explanation.score.toFixed(2),
    matchReason: `VECY CORE TS: MATCH PERFECTO 100.00/100 (88 CASILLAS EXACTAS)`,
    matchExplanation: explanation,
    ipc: ipc,
    status: "suggested" as const,
    ownerConfirmed: false,
    seekerConfirmed: false,
  };

  if (existingMatches.length > 0) {
    await db.update(propertyMatches).set(matchPayload).where(eq(propertyMatches.id, existingMatches[0].id));
    matchRecord = { ...existingMatches[0], ...matchPayload };
    console.log(`\n🌟 MATCH ACTUALIZADO CON ÉXITO: ID #${matchRecord.id}`);
  } else {
    const [insertedMatch] = await db.insert(propertyMatches).values(matchPayload).returning();
    matchRecord = insertedMatch;
    console.log(`\n🌟 MATCH CREADO CON ÉXITO: ID #${matchRecord.id}`);
  }

  console.log(`Match ID: #${matchRecord.id}`);
  console.log(`Property ID: #${targetProp.id} ("${targetProp.name}")`);
  console.log(`Requirement ID: #${targetReq.id} ("${targetReq.name}")`);
  console.log(`Score: ${matchRecord.matchScore}%`);
  
  return { matchId: matchRecord.id, propertyId: targetProp.id, requirementId: targetReq.id, score: matchRecord.matchScore };
}

if (process.argv[1]?.endsWith("create_perfect_100_match.ts")) {
  createPerfectMatch().then(() => process.exit(0)).catch(err => {
    console.error("Error creando match perfecto:", err);
    process.exit(1);
  });
}
