import { describe, it, expect } from "vitest";
import {
  parseColombianCurrency,
  parseArea,
  parseAdminFee,
  parseMaxAge,
  evaluateDualBusinessMatch,
  formatRequirementField
} from "../../shared/colombianRealEstateParser";

describe("VECY NETWORK — SUITE DE VALIDACIÓN ARQUITECTURAL COLOMBIANA", () => {
  describe("1. Extracción de Precios y Monedas Colombianas", () => {
    it("debe extraer '$1 450 Millones' con espacio como 1.450.000.000 COP", () => {
      const price = parseColombianCurrency("VENTA: $1 450 Millones NEGOCIABLES");
      expect(price).toBe(1_450_000_000);
    });

    it("debe extraer 'Max $1700M' como 1.700.000.000 COP", () => {
      const budget = parseColombianCurrency("Presupuesto para compra: Max $1700M");
      expect(budget).toBe(1_700_000_000);
    });

    it("debe extraer 'Presupuesto para alquiler: $10M' como 10.000.000 COP", () => {
      const rent = parseColombianCurrency("Presupuesto para alquiler: $10M");
      expect(rent).toBe(10_000_000);
    });

    it("debe extraer 'max $2M de administración' como 2.000.000 COP", () => {
      const admin = parseColombianCurrency("max $2M de administración");
      expect(admin).toBe(2_000_000);
    });

    it("debe extraer cifras directas colombianas: '$8.300.000' y '$9.500.000'", () => {
      expect(parseColombianCurrency("$8.300.000 incluida administración")).toBe(8_300_000);
      expect(parseColombianCurrency("Presupuesto max admin incluida $9.500.000")).toBe(9_500_000);
    });
  });

  describe("2. Extracción de Área con 'm', 'm2', 'mts'", () => {
    it("debe extraer 'Minimo 160m' (con m simple sin el 2) como 160", () => {
      const area = parseArea("• Minimo 160m");
      expect(area).toBe(160);
    });

    it("debe extraer 'Área: 230M2' como 230", () => {
      const area = parseArea("• Área: 230M2");
      expect(area).toBe(230);
    });
  });

  describe("3. Extracción y Estado de Administración", () => {
    it("debe marcar '+ Adm' como requiresInquiry: true", () => {
      const res = parseAdminFee("ARRENDAMIENTO: $11 millones + Adm");
      expect(res.requiresInquiry).toBe(true);
      expect(res.isIncluded).toBe(false);
    });

    it("debe extraer 'max $2M de administración' con fee de 2.000.000", () => {
      const res = parseAdminFee("Presupuesto para alquiler: $10M y max $2M de administración.");
      expect(res.fee).toBe(2_000_000);
      expect(res.isIncluded).toBe(false);
    });

    it("debe marcar 'incluida administración' como isIncluded: true", () => {
      const res = parseAdminFee("$8.300.000 incluida administración");
      expect(res.isIncluded).toBe(true);
    });
  });

  describe("4. Extracción de Antigüedad", () => {
    it("debe extraer '*Maximo* 20 años de antiguedad' con asteriscos de markdown como 20", () => {
      const age = parseMaxAge("• *Maximo* 20 años de antiguedad.");
      expect(age).toBe(20);
    });
  });

  describe("5. Algoritmo de Negocio Dual (Caso Rosales)", () => {
    it("debe evaluar ambos carriles (Venta y Arriendo) simultáneamente", () => {
      const prop = {
        priceSale: 1_450_000_000,
        priceRent: 11_000_000,
        adminRequiresInquiry: true,
        rawText: "VENTA: $1 450 Millones NEGOCIABLES ARRENDAMIENTO: $11 millones + Adm"
      };
      const req = {
        budgetBuyMax: 1_700_000_000,
        budgetRentMax: 10_000_000,
        rawText: "Presupuesto para compra: Max $1700M Presupuesto para alquiler: $10M"
      };

      const result = evaluateDualBusinessMatch(prop, req);
      expect(result.isDual).toBe(true);
      expect(result.bestTrack).toBe("BOTH");
      // En venta, 1450M <= 1700M -> status exact
      expect(result.saleEvaluation.status).toBe("exact");
      // En arriendo, 11M vs 10M -> margen aceptable warn
      expect(result.rentEvaluation.status).toBe("warn");
      // Final score es el mejor carril (venta = 1.0)
      expect(result.finalScore).toBe(1.0);
    });
  });

  describe("6. Regla de Oro para Formateo de Celdas", () => {
    it("no debe mostrar 'Flexible / Sin restricción' si hay un valor o texto explícito", () => {
      expect(formatRequirementField(160, "m²")).toBe("160 m²");
      expect(formatRequirementField(null, "m²", "Mínimo 160m")).toBe("Mínimo 160m");
      expect(formatRequirementField(null, "años")).toBe("Sin restricción especificada");
    });
  });
});
