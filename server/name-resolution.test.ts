import { describe, it, expect } from 'vitest';
import { isGenericName } from './_core/janIA';

describe('isGenericName helper', () => {
  it('should identify empty, null, or undefined names as generic', () => {
    expect(isGenericName(null)).toBe(true);
    expect(isGenericName(undefined)).toBe(true);
    expect(isGenericName('')).toBe(true);
    expect(isGenericName('   ')).toBe(true);
  });

  it('should identify specific placeholders as generic', () => {
    expect(isGenericName('Nuevo Asesor')).toBe(true);
    expect(isGenericName('Asesor')).toBe(true);
    expect(isGenericName('colega')).toBe(true);
    expect(isGenericName('Asesor +573192919978')).toBe(true);
  });

  it('should identify actual real names as NOT generic', () => {
    expect(isGenericName('Eduardo A. Rivera')).toBe(false);
    expect(isGenericName('Carolina')).toBe(false);
    expect(isGenericName('Diana Carrillo')).toBe(false);
  });
});
