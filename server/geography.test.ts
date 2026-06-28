import { describe, it, expect, vi } from 'vitest';
import { validarZona } from './_core/geography';
import { matchesGeography } from './_core/matching';

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
});
