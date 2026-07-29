/**
 * Motor de Homologación de Precios de Avalúos Comerciales (ACM) - VECY Network v17.6
 * Algoritmo matemático de castigos/premios por coeficientes prediales.
 */

export interface ValuationInput {
  propertyTitle?: string;
  zone: string;
  city: string;
  areaM2: number;
  baseZonePricePerM2: number; // Promedio Zona ($/m²)
  ageYears: number; // Antigüedad en años
  floorNumber?: number; // Número de piso
  hasElevator?: boolean; // Edificio con ascensor
  garages?: number; // Número de garajes
  hasClubHouse?: boolean; // Piscina, Gimnasio y Vigilancia 24/7
  comparableSources?: Array<{ name: string; url: string; price: number; area: number }>;
}

export interface FactorBreakdown {
  name: string;
  coefficient: number;
  effect: 'PREMIO' | 'CASTIGO' | 'NEUTRO';
  percentageChange: string;
  description: string;
}

export interface ValuationResult {
  baseZonePricePerM2: number;
  homologatedPricePerM2: number;
  suggestedCommercialValue: number; // Valor Comercial Sugerido
  minClosingPrice: number; // Precio Mínimo de Cierre (Rango de negociación -5%)
  estimatedMonthlyRent: number; // Canon de arriendo estimado
  estimatedCapRate: number; // Cap Rate (%)
  totalAreaM2: number;
  coefficients: {
    ageFactor: FactorBreakdown;
    floorFactor: FactorBreakdown;
    garageFactor: FactorBreakdown;
    amenitiesFactor: FactorBreakdown;
  };
  totalHomologationFactor: number;
  comparableSources: Array<{ name: string; url: string; price: number; area: number }>;
  generatedAt: string;
}

/**
  * Factor C_antigüedad (Factor de depreciación predial)
  * - Nuevo (0-5 años): 1.0 (Sin castigo)
  * - Intermedio (6-15 años): 0.92 (Castigo del 8%)
  * - Usado (>15 años): 0.85 (Castigo del 15%)
  */
export function calculateAgeFactor(ageYears: number): FactorBreakdown {
  if (ageYears <= 5) {
    return {
      name: "Antigüedad (Nuevo 0-5 años)",
      coefficient: 1.0,
      effect: "NEUTRO",
      percentageChange: "0%",
      description: "Sin depreciación predial por antigüedad (0-5 años)"
    };
  } else if (ageYears <= 15) {
    return {
      name: "Antigüedad (Intermedio 6-15 años)",
      coefficient: 0.92,
      effect: "CASTIGO",
      percentageChange: "-8%",
      description: "Castigo del 8% por desgaste predial intermedio"
    };
  } else {
    return {
      name: "Antigüedad (Usado >15 años)",
      coefficient: 0.85,
      effect: "CASTIGO",
      percentageChange: "-15%",
      description: "Castigo del 15% por antigüedad superior a 15 años"
    };
  }
}

/**
  * Factor C_piso (Factor de altura y confort)
  * - Con ascensor: Piso 1-2 (0.95 por ruido); Piso 3 en adelante (1.02 por vista/luz).
  * - Sin ascensor: Piso 1-2 (1.0); Piso 3 (0.93); Piso 4 o superior (0.85 castigo duro).
  */
export function calculateFloorFactor(floorNumber: number = 3, hasElevator: boolean = true): FactorBreakdown {
  if (hasElevator) {
    if (floorNumber <= 2) {
      return {
        name: "Piso (Piso 1-2 Con Ascensor)",
        coefficient: 0.95,
        effect: "CASTIGO",
        percentageChange: "-5%",
        description: "Castigo del 5% por mayor ruido e impacto en pisos bajos"
      };
    } else {
      return {
        name: "Piso (Piso 3+ Con Ascensor)",
        coefficient: 1.02,
        effect: "PREMIO",
        percentageChange: "+2%",
        description: "Premio del 2% por excelente vista, luz natural e iluminación"
      };
    }
  } else {
    if (floorNumber <= 2) {
      return {
        name: "Piso (Piso 1-2 Sin Ascensor)",
        coefficient: 1.0,
        effect: "NEUTRO",
        percentageChange: "0%",
        description: "Acceso cómodo por escaleras (Piso 1-2 sin ascensor)"
      };
    } else if (floorNumber === 3) {
      return {
        name: "Piso (Piso 3 Sin Ascensor)",
        coefficient: 0.93,
        effect: "CASTIGO",
        percentageChange: "-7%",
        description: "Castigo del 7% por esfuerzo de acceso a piso 3 sin ascensor"
      };
    } else {
      return {
        name: "Piso (Piso 4+ Sin Ascensor)",
        coefficient: 0.85,
        effect: "CASTIGO",
        percentageChange: "-15%",
        description: "Castigo duro del 15% por acceso superior a piso 4 sin ascensor"
      };
    }
  }
}

/**
  * Factor C_garajes (Factor de movilidad)
  * - Cumple o supera el estándar (2 o más): 1.05 (Premio del 5%)
  * - 1 parqueadero: 1.0 (Estándar)
  * - No tiene parqueadero (0): 0.88 (Castigo del 12%)
  */
export function calculateGarageFactor(garages: number = 0): FactorBreakdown {
  if (garages >= 2) {
    return {
      name: "Parqueaderos (2 o más garajes)",
      coefficient: 1.05,
      effect: "PREMIO",
      percentageChange: "+5%",
      description: "Premio del 5% por cumplir o superar el estándar de movilidad"
    };
  } else if (garages === 1) {
    return {
      name: "Parqueaderos (1 garaje)",
      coefficient: 1.0,
      effect: "NEUTRO",
      percentageChange: "0%",
      description: "Estándar residencial de 1 parqueadero privado"
    };
  } else {
    return {
      name: "Parqueaderos (Sin parqueadero)",
      coefficient: 0.88,
      effect: "CASTIGO",
      percentageChange: "-12%",
      description: "Castigo del 12% por falta de parqueadero privado"
    };
  }
}

/**
  * Factor C_amenidades (Club House / Conjunto)
  * - Conjunto con Piscina, Gimnasio y Vigilancia 24/7: 1.07 (Premio del 7%)
  * - Edificio residencial tradicional/independiente: 1.0 (Sin premio)
  */
export function calculateAmenitiesFactor(hasClubHouse: boolean = false): FactorBreakdown {
  if (hasClubHouse) {
    return {
      name: "Amenidades (Club House / Piscina + Gym + 24/7)",
      coefficient: 1.07,
      effect: "PREMIO",
      percentageChange: "+7%",
      description: "Premio del 7% por conjunto cerrado con amenidades completas"
    };
  } else {
    return {
      name: "Amenidades (Edificio Tradicional)",
      coefficient: 1.0,
      effect: "NEUTRO",
      percentageChange: "0%",
      description: "Edificio tradicional sin amenidades tipo club house"
    };
  }
}

/**
  * Ejecuta la homologación predial completa
  */
export function calculatePropertyValuation(input: ValuationInput): ValuationResult {
  const ageFactor = calculateAgeFactor(input.ageYears);
  const floorFactor = calculateFloorFactor(input.floorNumber, input.hasElevator);
  const garageFactor = calculateGarageFactor(input.garages);
  const amenitiesFactor = calculateAmenitiesFactor(input.hasClubHouse);

  const totalFactor = ageFactor.coefficient * floorFactor.coefficient * garageFactor.coefficient * amenitiesFactor.coefficient;
  const homologatedPricePerM2 = Math.round(input.baseZonePricePerM2 * totalFactor);

  const suggestedCommercialValue = Math.round(homologatedPricePerM2 * input.areaM2);
  const minClosingPrice = Math.round(suggestedCommercialValue * 0.95);
  const estimatedMonthlyRent = Math.round(suggestedCommercialValue * 0.0055);
  const estimatedCapRate = Number((((estimatedMonthlyRent * 12) / suggestedCommercialValue) * 100).toFixed(2));

  return {
    baseZonePricePerM2: input.baseZonePricePerM2,
    homologatedPricePerM2,
    suggestedCommercialValue,
    minClosingPrice,
    estimatedMonthlyRent,
    estimatedCapRate,
    totalAreaM2: input.areaM2,
    coefficients: {
      ageFactor,
      floorFactor,
      garageFactor,
      amenitiesFactor
    },
    totalHomologationFactor: Number(totalFactor.toFixed(4)),
    comparableSources: input.comparableSources || [],
    generatedAt: new Date().toISOString()
  };
}
