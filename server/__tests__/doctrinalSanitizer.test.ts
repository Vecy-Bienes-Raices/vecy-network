import { describe, it, expect } from "vitest";
import { sanitizeDoctrinalText, validatePromptSafety } from "../_core/doctrinalSanitizer";

describe("Doctrinal Sanitizer & Privacy Firewall (v32.77)", () => {
  it("Debe proteger números de teléfono personales preservando las líneas oficiales de Vecy", () => {
    const raw = "Llamar a Pedro al 3124567890 o al +57 320 987 6543, pero el oficial de Vecy es +573192919978 y atención bróker al +573166569719";
    const res = sanitizeDoctrinalText(raw);

    expect(res.sanitizedText).toContain("[TELÉFONO_PROTEGIDO]");
    expect(res.sanitizedText).not.toContain("3124567890");
    expect(res.sanitizedText).not.toContain("320 987 6543");
    // Líneas oficiales de Vecy deben permanecer intactas
    expect(res.sanitizedText).toContain("+573192919978");
    expect(res.sanitizedText).toContain("+573166569719");
    expect(res.detectedSensitiveItems.length).toBeGreaterThanOrEqual(2);
  });

  it("Debe anonimizar nombres propios en disputas o carteras privadas", () => {
    const raw = "En el caso con Orlando Bermúdez sobre la comisión del 3% en Chicó, no quiso pagar.";
    const res = sanitizeDoctrinalText(raw);

    expect(res.sanitizedText).not.toContain("Orlando Bermúdez");
    expect(res.sanitizedText).toContain("un colega de corretaje renuente al pago");
    expect(res.detectedSensitiveItems.some(i => i.includes("Orlando"))).toBe(true);
  });

  it("Debe proteger direcciones domiciliarias exactas", () => {
    const raw = "El predio queda en la Calle 127 # 15-45 Apto 502 en Bogotá";
    const res = sanitizeDoctrinalText(raw);

    expect(res.sanitizedText).not.toContain("Calle 127 # 15-45 Apto 502");
    expect(res.sanitizedText).toContain("[PREDIO_EN_SECTOR_RESIDENCIAL]");
  });

  it("Debe detectar y proteger cédulas no anonimizadas", () => {
    const raw = "El comprador se identifica con C.C. 52.805.482";
    const res = sanitizeDoctrinalText(raw);

    expect(res.sanitizedText).not.toContain("52.805.482");
    expect(res.sanitizedText).toContain("C.C. [DOCUMENTO_PROTEGIDO]");
  });

  it("Debe validar seguridad de prompt público rechazando teléfonos no oficiales", () => {
    const unsafePrompt = "Escribe a este WhatsApp 3158889900 para acordar la venta";
    const checkUnsafe = validatePromptSafety(unsafePrompt);
    expect(checkUnsafe.isValid).toBe(false);
    expect(checkUnsafe.reasons.length).toBeGreaterThan(0);

    const safePrompt = "Escribe a nuestra línea oficial de bróker al +57 316 656 9719 o a JanIA al +57 319 291 9978";
    const checkSafe = validatePromptSafety(safePrompt);
    expect(checkSafe.isValid).toBe(true);
    expect(checkSafe.reasons.length).toBe(0);
  });
});
