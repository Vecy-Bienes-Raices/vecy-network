/**
 * CATÁLOGO DE BENCHMARKS Y EJERCICIOS DE ENTRENAMIENTO PARA JANIA
 * 
 * Este catálogo almacena los especímenes patrón de validación doctrinal para JanIA.
 * El Espécimen 100 es el patrón oro de un MATCH PERFECTO (todas las 88 casillas en VERDE EXACTO).
 * A partir de este espécimen se construyen variaciones pedagógicas (95%, 90%, 85%) para entrenar
 * y calibrar el motor de coincidencia y aprendizaje de JanIA.
 */

export interface BenchmarkSpecimen {
  id: string;
  name: string;
  targetScore: number;
  description: string;
  property: Record<string, any>;
  requirement: Record<string, any>;
}

export const PERFECT_100_SPECIMEN: BenchmarkSpecimen = {
  id: "BENCHMARK-100-GOLDEN",
  name: "Apartamento 180m² Chicó Norte (Patrón Oro 100% Exacto)",
  targetScore: 100.0,
  description: "Coincidencia matemáticamente exacta en las 88 casillas: precio, canon, área, piso, alcobas, baños, garajes, estrato, antigüedad, remodelado, tipología de cocina, CBS, y las 70 amenidades estándar e internas.",
  property: {
    id: 3380,
    name: "Apartamento en Venta en Chicó Norte 180m² Piso 5 (Test 100% Exacto)",
    propertyType: "apartment",
    transactionType: "venta",
    price: 1800000000,
    currency: "COP",
    city: "Bogotá",
    zone: "Chicó Norte",
    address_locality: "Chapinero",
    address_neighborhood: "Chicó Norte",
    bedrooms: 3,
    bathrooms: 3,
    garages: 2,
    stratum: 6,
    floor_detail: "Piso 5",
    areaTotal: 180,
    areaPrivate: 180,
    yearBuilt: 2016,
    antiguedadAnos: 10,
    isAmoblado: false,
    adminFee: 1200000,
    garageType: "independiente",
    amenities: {
      bbq: true,
      cbs: true,
      cava: true,
      moto: true,
      piso: "Piso 5",
      balcon: true,
      estudio: true,
      ascensor: true,
      deposito: true,
      vigilancia: true,
      visitantes: true,
      kitchenType: "Integral",
      interiorExterior: "Exterior"
    }
  },
  requirement: {
    id: 1544,
    name: "Apartamento 180m² en Chicó Norte Venta (Test 100% Exacto)",
    tipoInmuebleDeseado: "apartment",
    tipoNegocioDeseado: "venta",
    ciudadDeseada: "Bogotá",
    zonaDeseada: "Chicó Norte",
    presupuestoMin: 1800000000,
    presupuestoMax: 1800000000,
    currency: "COP",
    areaMin: 180,
    habitacionesMin: 3,
    banosMin: 3,
    parqueaderosMin: 2,
    estratoDeseado: [6],
    caracteristicasDeseadas: {
      piso: "Piso 5",
      kitchenType: "Integral",
      antiguedadMax: 10,
      interiorExterior: "Exterior"
    }
  }
};

/**
 * Generador de variantes pedagógicas para entrenamiento de JanIA
 */
export function generateTrainingVariant(base: BenchmarkSpecimen, targetScore: number): BenchmarkSpecimen {
  const variant = JSON.parse(JSON.stringify(base)) as BenchmarkSpecimen;
  variant.id = `BENCHMARK-${targetScore}-TRAINING`;
  variant.targetScore = targetScore;

  if (targetScore === 95) {
    variant.name = `${base.name} [Variante 95% - Plus Ofertado]`;
    variant.description = "Un plus ofertado en garajes (3 garajes ofertados vs 2 solicitados) y 5 años de antigüedad.";
    variant.property.garages = 3;
    variant.property.antiguedadAnos = 5;
  } else if (targetScore === 90) {
    variant.name = `${base.name} [Variante 90% - Aproximaciones Menores]`;
    variant.description = "Diferencia leve de área (170m² ofertados vs 180m² solicitados, dentro de tolerancia del 6%).";
    variant.property.areaTotal = 170;
  } else if (targetScore === 85) {
    variant.name = `${base.name} [Variante 85% - Límite de Entrada]`;
    variant.description = "Precio en el límite superior y ausencia de amenidad secundaria opcional (cava de vinos).";
    delete variant.property.amenities.cava;
  }

  return variant;
}
