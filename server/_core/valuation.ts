/**
 * Motor de Homologación de Precios de Avalúos Comerciales (ACM) - VECY Network v17.6
 * Algoritmo matemático de castigos/premios por coeficientes prediales.
 */

export interface HomologationParams {
  basePricePerM2: number;
  antiguedadAnos: number;
  tieneAscensor: boolean;
  piso: number;
  garajes: number;
  esClubHouse: boolean;
}

export interface ValuationInput {
  propertyTitle?: string;
  zone: string;
  city: string;
  areaM2: number;
  baseZonePricePerM2: number;
  ageYears: number;
  floorNumber?: number;
  hasElevator?: boolean;
  garages?: number;
  hasClubHouse?: boolean;
  comparableSources?: Array<{ name?: string; url: string; price?: number; area?: number }>;
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
  suggestedCommercialValue: number;
  minClosingPrice: number;
  estimatedMonthlyRent: number;
  estimatedCapRate: number;
  totalAreaM2: number;
  coefficients: {
    cAntiguedad: number;
    cPiso: number;
    cGarajes: number;
    cAmenidades: number;
  };
  factorBreakdown: {
    ageFactor: FactorBreakdown;
    floorFactor: FactorBreakdown;
    garageFactor: FactorBreakdown;
    amenitiesFactor: FactorBreakdown;
  };
  totalHomologationFactor: number;
  comparableSources: Array<{ name?: string; url: string; price?: number; area?: number }>;
  generatedAt: string;
}

/**
 * Función doctrinal de homologación de precios por metro cuadrado
 */
export function calcularPrecioHomologado(params: HomologationParams): {
  precioM2Homologado: number;
  coeficientes: {
    cAntiguedad: number;
    cPiso: number;
    cGarajes: number;
    cAmenidades: number;
  };
} {
  let cAntiguedad = 1.0;
  if (params.antiguedadAnos >= 6 && params.antiguedadAnos <= 15) cAntiguedad = 0.92;
  else if (params.antiguedadAnos > 15) cAntiguedad = 0.85;

  let cPiso = 1.0;
  if (params.tieneAscensor) {
    cPiso = params.piso <= 2 ? 0.95 : 1.02;
  } else {
    if (params.piso <= 2) cPiso = 1.0;
    else if (params.piso === 3) cPiso = 0.93;
    else if (params.piso >= 4) cPiso = 0.85;
  }

  const cGarajes = params.garajes >= 2 ? 1.05 : params.garajes === 1 ? 1.0 : 0.88;
  const cAmenidades = params.esClubHouse ? 1.07 : 1.0;

  const precioM2Homologado = params.basePricePerM2 * cAntiguedad * cPiso * cGarajes * cAmenidades;

  return {
    precioM2Homologado,
    coeficientes: { cAntiguedad, cPiso, cGarajes, cAmenidades }
  };
}

/**
 * Calculador extendido de avalúo predial para informes completos
 */
export function calculatePropertyValuation(input: ValuationInput): ValuationResult {
  const result = calcularPrecioHomologado({
    basePricePerM2: input.baseZonePricePerM2,
    antiguedadAnos: input.ageYears,
    tieneAscensor: input.hasElevator ?? true,
    piso: input.floorNumber ?? 3,
    garajes: input.garages ?? 0,
    esClubHouse: input.hasClubHouse ?? false
  });

  const { cAntiguedad, cPiso, cGarajes, cAmenidades } = result.coeficientes;
  const homologatedPricePerM2 = Math.round(result.precioM2Homologado);
  const totalFactor = cAntiguedad * cPiso * cGarajes * cAmenidades;

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
      cAntiguedad,
      cPiso,
      cGarajes,
      cAmenidades
    },
    factorBreakdown: {
      ageFactor: {
        name: "Antigüedad",
        coefficient: cAntiguedad,
        effect: cAntiguedad > 1 ? 'PREMIO' : cAntiguedad < 1 ? 'CASTIGO' : 'NEUTRO',
        percentageChange: cAntiguedad >= 1 ? `+${Math.round((cAntiguedad - 1) * 100)}%` : `-${Math.round((1 - cAntiguedad) * 100)}%`,
        description: `Factor por antigüedad de ${input.ageYears} años`
      },
      floorFactor: {
        name: "Piso / Altura",
        coefficient: cPiso,
        effect: cPiso > 1 ? 'PREMIO' : cPiso < 1 ? 'CASTIGO' : 'NEUTRO',
        percentageChange: cPiso >= 1 ? `+${Math.round((cPiso - 1) * 100)}%` : `-${Math.round((1 - cPiso) * 100)}%`,
        description: `Piso ${input.floorNumber ?? 3} (${input.hasElevator ?? true ? 'Con Ascensor' : 'Sin Ascensor'})`
      },
      garageFactor: {
        name: "Garajes",
        coefficient: cGarajes,
        effect: cGarajes > 1 ? 'PREMIO' : cGarajes < 1 ? 'CASTIGO' : 'NEUTRO',
        percentageChange: cGarajes >= 1 ? `+${Math.round((cGarajes - 1) * 100)}%` : `-${Math.round((1 - cGarajes) * 100)}%`,
        description: `${input.garages ?? 0} parqueaderos privados`
      },
      amenitiesFactor: {
        name: "Amenidades",
        coefficient: cAmenidades,
        effect: cAmenidades > 1 ? 'PREMIO' : cAmenidades < 1 ? 'CASTIGO' : 'NEUTRO',
        percentageChange: cAmenidades >= 1 ? `+${Math.round((cAmenidades - 1) * 100)}%` : `-${Math.round((1 - cAmenidades) * 100)}%`,
        description: input.hasClubHouse ? "Club House con piscina, gimnasio y 24/7" : "Edificio tradicional"
      }
    },
    totalHomologationFactor: Number(totalFactor.toFixed(4)),
    comparableSources: input.comparableSources || [],
    generatedAt: new Date().toISOString()
  };
}
