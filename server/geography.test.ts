import { describe, it, expect, vi } from 'vitest';
import { validarZona } from './_core/geography';
import { matchesGeography, calcularScoreMatch } from './_core/matching';

// Mock the external Google Geocoding API to prevent hitting real quotas during test runs
vi.mock('./_core/geocoding', () => {
  return {
    geocodeAddress: vi.fn(async (address: string) => {
      const lower = address.toLowerCase();
      if (lower.includes("cedritos")) {
        return {
          isValid: true,
          city: "Bogotá",
          zone: "Cedritos",
          locality: "Usaquén",
          latitude: "4.7212",
          longitude: "-74.0321",
          formattedAddress: "Cedritos, Bogotá, Colombia"
        };
      }
      if (lower.includes("chia")) {
        return {
          isValid: true,
          city: "Chía",
          zone: "Chía",
          locality: "Chía",
          latitude: "4.8665",
          longitude: "-74.0500",
          formattedAddress: "Chía, Cundinamarca, Colombia"
        };
      }
      // Return null to simulate no result or API error, triggering local fallback
      return null;
    })
  };
});

describe('validarZona and Geography Resolution (Async Hybrid)', () => {
  it('should validate known Bogota neighborhoods correctly using Google Maps Geocoding', async () => {
    const res = await validarZona("Cedritos", "Bogotá");
    expect(res.isValid).toBe(true);
    expect(res.city).toBe("Bogotá");
    expect(res.isMunicipio).toBe(false);
    expect(res.latitude).toBe("4.7212");
  });

  it('should fallback to Bogota if an unmapped neighborhood (e.g. Bonanza) is incorrectly extracted as the city', async () => {
    // Google API returns null (triggering local fallback)
    const res = await validarZona("Bonanza", "Bonanza");
    expect(res.isValid).toBe(true);
    expect(res.city).toBe("Bogotá");
    expect(res.isMunicipio).toBe(false);
  });

  it('should fallback to Bogota if another unmapped neighborhood (e.g. Balcón de Lindaraja) is incorrectly extracted as the city', async () => {
    // Google API returns null (triggering local fallback)
    const res = await validarZona("Balcón de Lindaraja", "Balcón de Lindaraja");
    expect(res.isValid).toBe(true);
    expect(res.city).toBe("Bogotá");
    expect(res.isMunicipio).toBe(false);
  });

  it('should correctly validate real external municipalities via Google Geocoding', async () => {
    const res = await validarZona("Chía", "Chía");
    expect(res.isValid).toBe(true);
    expect(res.city).toBe("Chía"); // Google returns canonical Chía
    expect(res.isMunicipio).toBe(true);
  });

  it('should correctly validate other major Colombian cities using local DB lookup fallback', async () => {
    // Google API returns null (triggering local DIVIPOLA DB lookup)
    const res = await validarZona("El Poblado", "Medellín");
    expect(res.isValid).toBe(true);
    expect(res.city).toBe("Medellin"); // DB returns Medellin normalized
    expect(res.isMunicipio).toBe(true);
  });
});

describe('matchesGeography Scoring', () => {
  it('should return exact match score for identical neighborhoods', () => {
    const res = matchesGeography("Chicó Reservado", "Chicó Reservado", "", "", "Bogotá", "Bogotá");
    expect(res.matches).toBe(true);
    expect(res.score).toBe(25);
  });

  it('should return hard mismatch (0 score) for different neighborhoods that are both specific and in Bogota', () => {
    const res = matchesGeography("La Candelaria", "Chicó Reservado", "santa fe", "chapinero", "Bogotá", "Bogotá");
    expect(res.matches).toBe(false);
    expect(res.score).toBe(0);
  });

  it('should match successfully when both normalized to Bogota and have matching unmapped neighborhoods', () => {
    const res = matchesGeography("Bonanza", "Bonanza", "", "", "Bogotá", "Bogotá");
    expect(res.matches).toBe(true);
    expect(res.score).toBe(25);
  });

  it('should NOT match different neighborhoods containing generic words like santa', () => {
    const res = matchesGeography("Santa Teresa", "Santa Bárbara Occidental", "usaquen", "usaquen", "Bogotá", "Bogotá");
    expect(res.matches).toBe(false);
    expect(res.score).toBe(0);
  });

  it('should match zone coloquial Las Santas with Santa Bárbara Occidental', () => {
    const res = matchesGeography("Las Santas", "Santa Bárbara Occidental", "usaquen", "usaquen", "Bogotá", "Bogotá");
    expect(res.matches).toBe(true);
    expect(res.score).toBe(25);
  });

  it('should match when aledanos is specified and they share the same locality', () => {
    const res = matchesGeography("Cedritos, Colina, Santa Teresa, El Redil, u otros barrios aledaños", "Santa Bárbara Occidental", "usaquen", "usaquen", "Bogotá", "Bogotá");
    expect(res.matches).toBe(true);
    expect(res.score).toBe(15);
  });

  it('should NOT match when aledanos is NOT specified and neighborhoods do not overlap', () => {
    const res = matchesGeography("Cedritos, Colina, Santa Teresa, El Redil", "Santa Bárbara Occidental", "usaquen", "usaquen", "Bogotá", "Bogotá");
    expect(res.matches).toBe(false);
    expect(res.score).toBe(0);
  });
});

describe('calcularScoreMatch Exact Parameters and Tolerances', () => {
  const baseReq = {
    tipoInmuebleDeseado: "apartment",
    tipoNegocioDeseado: "venta",
    ciudadDeseada: "Bogotá",
    zonaDeseada: "Cedritos",
    presupuestoMax: "1000000000", // 1000 Million COP
    areaMin: "100",
    habitacionesMin: 3,
    banosMin: 2,
    parqueaderosMin: 2,
    caracteristicasDeseadas: {},
    rawText: "Busco apartamento en Cedritos"
  };

  const baseProp = {
    propertyType: "apartment",
    transactionType: "venta",
    city: "Bogotá",
    zone: "Cedritos",
    price: "1000000000",
    areaTotal: "100",
    bedrooms: 3,
    bathrooms: 2,
    garages: 2,
    amenities: {},
    rawText: "Vendo apartamento en Cedritos"
  };

  it('should match base exact property with 100% score', () => {
    const score = calcularScoreMatch(baseReq, baseProp);
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it('should fail match (0 score) if bedrooms do not match exactly', () => {
    // 3 requested, 4 offered -> mismatch
    const propMoreBeds = { ...baseProp, bedrooms: 4 };
    expect(calcularScoreMatch(baseReq, propMoreBeds)).toBe(0);

    // 3 requested, 2 offered -> mismatch
    const propFewerBeds = { ...baseProp, bedrooms: 2 };
    expect(calcularScoreMatch(baseReq, propFewerBeds)).toBe(0);
  });

  it('should fail match (0 score) if bathrooms do not match exactly', () => {
    const propMoreBaths = { ...baseProp, bathrooms: 3 };
    expect(calcularScoreMatch(baseReq, propMoreBaths)).toBe(0);
  });

  it('should fail match (0 score) if garages do not match exactly', () => {
    const propMoreGarages = { ...baseProp, garages: 3 };
    expect(calcularScoreMatch(baseReq, propMoreGarages)).toBe(0);
  });

  it('should allow price up to 5% above budget but fail if higher', () => {
    // 5% above (1050 Million) -> matches
    const prop1050M = { ...baseProp, price: "1050000000" };
    expect(calcularScoreMatch(baseReq, prop1050M)).toBeGreaterThanOrEqual(70);

    // 6% above (1060 Million) -> hard mismatch (0)
    const prop1060M = { ...baseProp, price: "1060000000" };
    expect(calcularScoreMatch(baseReq, prop1060M)).toBe(0);
  });

  it('should fail if area is below exact or above 130%', () => {
    // 84% of areaMin (84 sqm) -> hard mismatch (0)
    const prop84Sqm = { ...baseProp, areaTotal: "84" };
    expect(calcularScoreMatch(baseReq, prop84Sqm)).toBe(0);

    // 99% of areaMin (99 sqm) -> hard mismatch (0)
    const prop99Sqm = { ...baseProp, areaTotal: "99" };
    expect(calcularScoreMatch(baseReq, prop99Sqm)).toBe(0);

    // 131% of areaMin (131 sqm) -> hard mismatch (0)
    const prop131Sqm = { ...baseProp, areaTotal: "131" };
    expect(calcularScoreMatch(baseReq, prop131Sqm)).toBe(0);

    // Exact areaMin (100 sqm) -> matches
    const prop100Sqm = { ...baseProp, areaTotal: "100" };
    expect(calcularScoreMatch(baseReq, prop100Sqm)).toBeGreaterThanOrEqual(70);

    // 115% of areaMin (115 sqm) -> matches
    const prop115Sqm = { ...baseProp, areaTotal: "115" };
    expect(calcularScoreMatch(baseReq, prop115Sqm)).toBeGreaterThanOrEqual(70);
  });

  it('should enforce special amenities (Terraza, Balcon, Chimenea, Clubhouse, Estudio) exactly when requested', () => {
    const reqWithTerrace = {
      ...baseReq,
      rawText: "Busco apartamento con terraza en Cedritos"
    };

    // Property has terrace -> matches
    const propWithTerrace = {
      ...baseProp,
      rawText: "Lindo apartamento con terraza"
    };
    expect(calcularScoreMatch(reqWithTerrace, propWithTerrace)).toBeGreaterThanOrEqual(70);

    // Property does not have terrace -> fails (0)
    const propWithoutTerrace = {
      ...baseProp,
      rawText: "Lindo apartamento sin te-rra-za"
    };
    expect(calcularScoreMatch(reqWithTerrace, propWithoutTerrace)).toBe(0);
  });

  it('should check house levels exactly, and keep apartment floors equal or 1 floor above', () => {
    // House floor match
    const houseReq = {
      ...baseReq,
      tipoInmuebleDeseado: "house",
      floorDetail: "3 niveles"
    };
    const housePropCorrect = {
      ...baseProp,
      propertyType: "house",
      floorDetail: "3 niveles"
    };
    expect(calcularScoreMatch(houseReq, housePropCorrect)).toBeGreaterThanOrEqual(70);

    const housePropWrong = {
      ...baseProp,
      propertyType: "house",
      floorDetail: "2 pisos"
    };
    expect(calcularScoreMatch(houseReq, housePropWrong)).toBe(0);

    // Apartment floor: 3rd floor requested
    const aptReq = {
      ...baseReq,
      floorDetail: "piso 3"
    };

    // Floor 4 offered (1 floor above) -> matches
    const aptPropPlus1 = {
      ...baseProp,
      floorDetail: "piso 4"
    };
    expect(calcularScoreMatch(aptReq, aptPropPlus1)).toBeGreaterThanOrEqual(70);

    // Floor 3 offered (exact) -> matches
    const aptPropExact = {
      ...baseProp,
      floorDetail: "piso 3"
    };
    expect(calcularScoreMatch(aptReq, aptPropExact)).toBeGreaterThanOrEqual(70);

    // Floor 2 offered (below) -> fails (0)
    const aptPropBelow = {
      ...baseProp,
      floorDetail: "piso 2"
    };
    expect(calcularScoreMatch(aptReq, aptPropBelow)).toBe(0);

    // Floor 5 offered (2 floors above) -> fails (0)
    const aptPropPlus2 = {
      ...baseProp,
      floorDetail: "piso 5"
    };
    expect(calcularScoreMatch(aptReq, aptPropBelow)).toBe(0);
  });
});
