import { describe, it, expect } from 'vitest';
import { cleanVoiceText } from './_core/whatsapp';

describe('cleanVoiceText', () => {
  it('should pass normal clean text unchanged', () => {
    const text = 'Hola colegas, espero que tengan un excelente día. Hoy les comparto esta propiedad.';
    expect(cleanVoiceText(text)).toBe(text);
  });

  it('should strip double curly braces containing preambles', () => {
    const input = '{{Aquí tienes la propuesta de guión, redactada con un tono natural y fluidopara que suene exactamente como un mensaje de voz}} Hola a todos, paso por aquí a saludarlos.';
    const expected = 'Hola a todos, paso por aquí a saludarlos.';
    expect(cleanVoiceText(input)).toBe(expected);
  });

  it('should strip square brackets containing meta instructions', () => {
    const input = '[Nota de voz de JanIA]: Hola colegas, ¿cómo están?';
    const expected = 'Hola colegas, ¿cómo están?';
    expect(cleanVoiceText(input)).toBe(expected);
  });

  it('should strip external wrapping quotation marks', () => {
    const input = '"Hola colegas, ¿cómo están?"';
    const expected = 'Hola colegas, ¿cómo están?';
    expect(cleanVoiceText(input)).toBe(expected);
  });

  it('should handle typical Spanish LLM conversational preambles', () => {
    const inputs = [
      'Aquí tienes la propuesta de guión: Hola colegas, ¿cómo están?',
      'Claro, aquí tienes el texto de la nota de voz: Hola colegas, ¿cómo están?',
      'Propuesta de guión de voz: Hola colegas, ¿cómo están?',
      'Guion de audio: Hola colegas, ¿cómo están?',
      'Nota de voz: Hola colegas, ¿cómo están?',
      'Aquí está la propuesta de guión: "Hola colegas, ¿cómo están?"'
    ];
    
    inputs.forEach(input => {
      expect(cleanVoiceText(input)).toBe('Hola colegas, ¿cómo están?');
    });
  });
});
