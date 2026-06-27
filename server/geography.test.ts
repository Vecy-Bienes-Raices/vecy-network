import { describe, it, expect } from 'vitest';
import { validarZona } from './_core/geography';
import { matchesGeography } from './_core/matching';

describe('validarZona and Geography Resolution', () => {
  it('should validate known Bogota neighborhoods correctly', () => {
    const res = validarZona("Cedritos", "Bogotá");
    expect(res.isValid).toBe(true);
    expect(res.city).toBe("Bogotá");
    expect(res.isMunicipio).toBe(false);
  });

  it('should fallback to Bogota if an unmapped neighborhood (e.g. Bonanza) is incorrectly extracted as the city', () => {
    // LLM extracted city: "Bonanza", zone: "Bonanza"
    const res = validarZona("Bonanza", "Bonanza");
    expect(res.isValid).toBe(true);
    expect(res.city).toBe("Bogotá");
    expect(res.isMunicipio).toBe(false);
  });

  it('should fallback to Bogota if another unmapped neighborhood (e.g. Balcón de Lindaraja) is incorrectly extracted as the city', () => {
    // LLM extracted city: "Balcón de Lindaraja", zone: "Balcón de Lindaraja"
    const res = validarZona("Balcón de Lindaraja", "Balcón de Lindaraja");
    expect(res.isValid).toBe(true);
    expect(res.city).toBe("Bogotá");
    expect(res.isMunicipio).toBe(false);
  });

  it('should correctly validate real external municipalities', () => {
    const res = validarZona("Chía", "Chía");
    expect(res.isValid).toBe(true);
    expect(res.city).toBe("Chia");
    expect(res.isMunicipio).toBe(true);
  });

  it('should correctly validate other major Colombian cities', () => {
    const res = validarZona("El Poblado", "Medellín");
    expect(res.isValid).toBe(true);
    expect(res.city).toBe("Medellin");
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
    // Previously: req: city=Bogotá, neighborhood=Bonanza
    // prop: city=Bonanza, neighborhood=Bonanza -> which we just fixed to resolve prop to city=Bogotá, neighborhood=Bonanza
    const res = matchesGeography("Bonanza", "Bonanza", "", "", "Bogotá", "Bogotá");
    expect(res.matches).toBe(true);
    expect(res.score).toBe(25);
  });
});
