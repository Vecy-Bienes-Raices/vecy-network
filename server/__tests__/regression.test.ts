import { describe, it, expect } from "vitest";
import { parseColombianPriceOrBudget, extractFallbackDataFromText, extractFirstName } from "../_core/janIA";
import {
  checkTransactionCompatibility,
  isHollowListing,
  explicarMatch,
  isNonRealEstateText
} from "../_core/matching";
import {
  getDynamicFallbackItem,
  enforceGreetingAccuracy,
  enforceJanIAIdentity,
  ROTATING_FALLBACK_CATALOG
} from "../_core/cronService";
import {
  normalizeAdvisorPhone,
  isLidIdentifier,
  isGenericName,
  preserveVerifiedAdvisorContact,
  lookupAdvisorSync,
  brokerDirectoryCache,
} from "../_core/advisors";

describe("VECY NETWORK — SUITE DE REGRESIÓN DOCTRINAL AUTOMATIZADA", () => {
  // ─────────────────────────────────────────────────────────────
  // 1. EXTRACTOR DE PRECIOS Y PRESUPUESTOS (parseColombianPriceOrBudget)
  // ─────────────────────────────────────────────────────────────
  describe("1. Extracción de Precios y Presupuestos Colombianos", () => {
    it("debe procesar montos expresados en millones correctamente", () => {
      const price = parseColombianPriceOrBudget("540", "millones", true);
      expect(price).toBe(540_000_000);
    });

    it("debe procesar montos con decimales en millones", () => {
      const price = parseColombianPriceOrBudget("1.5", "millones", false);
      expect(price).toBe(1_500_000);
    });

    it("debe procesar montos en miles de millones cuando se especifica explícitamente", () => {
      const price = parseColombianPriceOrBudget("1.8", "mil millones", true);
      expect(price).toBe(1_800_000_000);
    });

    it("JAMÁS debe multiplicar enteros pequeños (<30) por 1.000 millones (Regla v31.67)", () => {
      // El número 15 de edad NO debe transformarse en 15 mil millones ($15.000.000.000)
      const price = parseColombianPriceOrBudget("15", "", true);
      expect(price).not.toBe(15_000_000_000);
    });

    it("debe formatear valores directos con puntos de miles", () => {
      const price = parseColombianPriceOrBudget("1.471.000", "", false);
      expect(price).toBe(1_471_000);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. REGLAS DOCTRINALES DE COMPATIBILIDAD DE NEGOCIO (checkTransactionCompatibility)
  // ─────────────────────────────────────────────────────────────
  describe("2. Compatibilidad Doctrinal de Transacciones", () => {
    it("Arriendo vs Venta pura debe ser 0% IMPOSIBLE (Bloqueo Absoluto)", () => {
      expect(checkTransactionCompatibility("arriendo", "venta")).toBe(false);
      expect(checkTransactionCompatibility("venta", "arriendo")).toBe(false);
    });

    it("Arriendo vs Arriendo con Opción de Compra debe ser 0% IMPOSIBLE (Regla Doctrinal v17.2)", () => {
      expect(checkTransactionCompatibility("arriendo", "arriendo_con_opcion_de_compra")).toBe(false);
    });

    it("Arriendo vs Arriendo puro debe ser 100% COMPATIBLE", () => {
      expect(checkTransactionCompatibility("arriendo", "arriendo")).toBe(true);
    });

    it("Arriendo vs Venta o Arriendo debe ser 100% COMPATIBLE", () => {
      expect(checkTransactionCompatibility("arriendo", "venta_o_arriendo")).toBe(true);
      expect(checkTransactionCompatibility("venta_o_arriendo", "arriendo")).toBe(true);
    });

    it("Venta vs Venta pura debe ser 100% COMPATIBLE", () => {
      expect(checkTransactionCompatibility("venta", "venta")).toBe(true);
    });

    it("Venta vs Venta o Arriendo debe ser 100% COMPATIBLE", () => {
      expect(checkTransactionCompatibility("venta", "venta_o_arriendo")).toBe(true);
    });

    it("Venta vs Venta con Permuta debe ser 100% COMPATIBLE", () => {
      expect(checkTransactionCompatibility("venta", "venta_permuta")).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. DETECCIÓN DE PUBLICACIONES HUECAS Y RESCATE INMOBILIARIO (isHollowListing)
  // ─────────────────────────────────────────────────────────────
  describe("3. Filtro de Seguridad Comercial (isHollowListing)", () => {
    it("debe rechazar saludos, felicitaciones y textos sin contexto", () => {
      expect(isHollowListing("Buenos días a todos en el grupo").isHollow).toBe(true);
      expect(isHollowListing("Feliz navidad colegas").isHollow).toBe(true);
      expect(isHollowListing("Alguien tiene un contacto en notarías?").isHollow).toBe(true);
    });

    it("debe RESCATAR publicaciones reales concisas con tipología y negocio (v31.68)", () => {
      const res = isHollowListing("En Renta, magnifica casa en conjunto Cerrado");
      expect(res.isHollow).toBe(false);
    });

    it("debe aceptar ofertas estructuradas normales", () => {
      const res = isHollowListing("Vendo hermoso apartamento en Chicó, 3 alcobas, 2 baños, 90m2, $550 millones");
      expect(res.isHollow).toBe(false);
    });

    it("debe detectar textos no inmobiliarios mediante isNonRealEstateText", () => {
      expect(isNonRealEstateText("Vendo volqueta doble troque modelo 2020")).toBe(true);
      expect(isNonRealEstateText("Apartamento en arriendo")).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. FILTROS DUROS DE CONFORT Y MATCHING (explicarMatch)
  // ─────────────────────────────────────────────────────────────
  describe("4. Filtros Duros Inquebrantables del Algoritmo de Matching", () => {
    const baseReq = {
      id: 1,
      propertyType: "apartment",
      tipoInmuebleDeseado: "apartment",
      transactionType: "venta",
      tipoNegocioDeseado: "venta",
      presupuestoMax: 500_000_000,
      presupuestoMin: 400_000_000,
      areaMin: 80,
      areaMax: 120,
      bedrooms: 3,
      bathrooms: 2,
      garages: 2,
      city: "Bogotá",
      neighborhood: "Chicó",
      zonaDeseada: "Chicó, Bogotá",
      rawText: "Busco apartamento en venta en Chicó, Bogotá. Presupuesto hasta $500 millones, mínimo 80 m2, 3 alcobas, 2 baños, 2 garajes.",
      status: "active"
    };

    const baseProp = {
      id: 100,
      propertyType: "apartment",
      transactionType: "venta",
      price: 480_000_000,
      rentPrice: null,
      area: 95,
      bedrooms: 3,
      bathrooms: 2,
      garages: 2,
      city: "Bogotá",
      neighborhood: "Chicó",
      address: "Calle 92 con 15",
      rawText: "Vendo hermoso apartamento en Chicó, Bogotá. 95 m2, 3 alcobas, 2 baños, 2 garajes independientes. Valor: $480.000.000.",
      status: "active"
    };

    it("debe otorgar alto score (>= 85%) ante coincidencia óptima", () => {
      const result = explicarMatch(baseReq, baseProp);
      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.blockers.length).toBe(0);
    });

    it("debe BLOQUEAR a 0% si el tipo de transacción es incompatible", () => {
      const propRent = {
        ...baseProp,
        transactionType: "arriendo",
        price: 0,
        rentPrice: 4_000_000,
        rawText: "Apartamento en arriendo en Chicó, canon $4.000.000 con admon, 95m2, 3 alcobas, 2 baños, 2 garajes"
      };
      const result = explicarMatch(baseReq, propRent);
      expect(result.score).toBe(0);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it("debe BLOQUEAR a 0% si el precio de la oferta supera el presupuesto máximo", () => {
      const propExpensive = {
        ...baseProp,
        price: 650_000_000, // Presupuesto max era 500M
        rawText: "Vendo hermoso apartamento en Chicó, Bogotá. 95 m2, 3 alcobas, 2 baños, 2 garajes. Valor: $650.000.000."
      };
      const result = explicarMatch(baseReq, propExpensive);
      expect(result.score).toBe(0);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it("debe BLOQUEAR a 0% si la oferta de arriendo tiene canon $0 o no especificado (v31.67)", () => {
      const reqRent = {
        ...baseReq,
        transactionType: "arriendo",
        tipoNegocioDeseado: "arriendo",
        presupuestoMax: 5_000_000,
        presupuestoMin: 4_000_000,
        rawText: "Busco apartamento en arriendo en Chicó, Bogotá, presupuesto de 4 a 5 millones, 3 alcobas, 2 baños"
      };
      const propNoRent = {
        ...baseProp,
        transactionType: "arriendo",
        rentPrice: 0,
        price: 0,
        rawText: "En arriendo apartamento en Chicó, Bogotá. 95 m2, 3 alcobas, 2 baños, 2 garajes. Preguntar por canon."
      };
      const result = explicarMatch(reqRent, propNoRent);
      expect(result.score).toBe(0);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it("FILTRO DURO DE CONFORT: Si Oferta tiene MENOS garajes que Demanda -> 0% Match Inviable", () => {
      const propFewGarages = {
        ...baseProp,
        garages: 1, // Demanda exige 2
        rawText: "Vendo hermoso apartamento en Chicó, Bogotá. 95 m2, 3 alcobas, 2 baños, 1 garaje. Valor: $480.000.000."
      };
      const result = explicarMatch(baseReq, propFewGarages);
      expect(result.score).toBe(0);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it("FILTRO DURO DE CONFORT: Si Oferta tiene IGUAL O MÁS garajes -> Aprobado", () => {
      const propMoreGarages = {
        ...baseProp,
        garages: 3, // Demanda exige 2, oferta tiene 3
        rawText: "Vendo hermoso apartamento en Chicó, Bogotá. 95 m2, 3 alcobas, 2 baños, 3 garajes independientes. Valor: $480.000.000."
      };
      const result = explicarMatch(baseReq, propMoreGarages);
      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.blockers.length).toBe(0);
    });

    it("FILTRO DURO DE CONFORT: Si Oferta tiene MENOS habitaciones que Demanda -> 0% Match Inviable", () => {
      const propFewRooms = {
        ...baseProp,
        bedrooms: 2, // Demanda exige 3
        rawText: "Vendo hermoso apartamento en Chicó, Bogotá. 95 m2, 2 alcobas, 2 baños, 2 garajes. Valor: $480.000.000."
      };
      const result = explicarMatch(baseReq, propFewRooms);
      expect(result.score).toBe(0);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it("FILTRO DURO DE CONFORT: Si Oferta tiene MENOS baños que Demanda -> 0% Match Inviable", () => {
      const propFewBaths = {
        ...baseProp,
        bathrooms: 1, // Demanda exige 2
        rawText: "Vendo hermoso apartamento en Chicó, Bogotá. 95 m2, 3 alcobas, 1 baño, 2 garajes. Valor: $480.000.000."
      };
      const result = explicarMatch(baseReq, propFewBaths);
      expect(result.score).toBe(0);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it("TOLERANCIA 0% EN ÁREA: Si Oferta tiene menor metraje que el mínimo exigido -> 0% Match Inviable", () => {
      const propSmallArea = {
        ...baseProp,
        area: 70, // Demanda exige min 80m2
        rawText: "Vendo hermoso apartamento en Chicó, Bogotá. 70 m2, 3 alcobas, 2 baños, 2 garajes. Valor: $480.000.000."
      };
      const result = explicarMatch(baseReq, propSmallArea);
      expect(result.score).toBe(0);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it("FILTRO GEOGRÁFICO DURO: Inmuebles en ciudades distintas no hacen match", () => {
      const propMedellin = {
        ...baseProp,
        city: "Medellín",
        neighborhood: "El Poblado",
        rawText: "Vendo hermoso apartamento en El Poblado, Medellín. 95 m2, 3 alcobas, 2 baños, 2 garajes. Valor: $480.000.000."
      };
      const result = explicarMatch(baseReq, propMedellin);
      expect(result.score).toBe(0);
      expect(result.blockers.length).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. EXTRACTOR DETERMINISTA AUTÓNOMO (extractFallbackDataFromText)
  // ─────────────────────────────────────────────────────────────
  describe("5. Extractor Determinista Autónomo ($0 COP)", () => {
    it("debe extraer tipología, canon y cuartos en arriendos", () => {
      const text = "Se arrienda hermoso apartamento en Cedritos, canon $3.200.000 con admon incluida, 2 alcobas, 2 baños, 1 garaje";
      const data = extractFallbackDataFromText(text);
      expect(data.transactionType).toBe("arriendo");
      expect(data.propertyType).toBe("apartment");
      expect(data.rentPrice).toBe(3_200_000);
      expect(data.bedrooms).toBe(2);
      expect(data.bathrooms).toBe(2);
      expect(data.garages).toBe(1);
    });

    it("debe extraer venta, precio y área en ventas", () => {
      const text = "Vendo casa en Usaquén, 180 m2, valor $850 millones, 4 alcobas, 3 parqueaderos";
      const data = extractFallbackDataFromText(text);
      expect(data.transactionType).toBe("venta");
      expect(data.propertyType).toBe("house");
      expect(data.price).toBe(850_000_000);
      expect(data.area).toBe(180);
      expect(data.bedrooms).toBe(4);
      expect(data.garages).toBe(3);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. NOMBRES COMPUESTOS COLOMBIANOS (extractFirstName)
  // ─────────────────────────────────────────────────────────────
  describe("6. Extracción de Nombres Compuestos Colombianos", () => {
    it("debe reconocer Maria Fernanda como nombre compuesto", () => {
      expect(extractFirstName("Maria Fernanda Gomez")).toBe("Maria Fernanda");
    });

    it("debe reconocer Juan Pablo como nombre compuesto", () => {
      expect(extractFirstName("Juan Pablo Montoya")).toBe("Juan Pablo");
    });

    it("debe reconocer Andrés Camilo como nombre compuesto", () => {
      expect(extractFirstName("Andrés Camilo Pérez")).toBe("Andrés Camilo");
    });

    it("debe reconocer José Orlando como nombre compuesto", () => {
      expect(extractFirstName("José Orlando Riveros")).toBe("José Orlando");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. DIFUSIÓN DIARIA ÚNICA Y MEMORIA TEMÁTICA DE JANIA (v31.71)
  // ─────────────────────────────────────────────────────────────
  describe("7. Difusión Diaria Única y Memoria Temática de JanIA (v31.71)", () => {
    it("ROTATING_FALLBACK_CATALOG debe tener al menos 2 temas ricos por cada día de la semana", () => {
      const days = [
        "lunes_arranque",
        "martes_juridico",
        "miercoles_marketing",
        "jueves_tributario",
        "viernes_avaluos",
        "sabado_cafe",
        "domingo_soporte"
      ];
      for (const day of days) {
        const items = ROTATING_FALLBACK_CATALOG[day];
        expect(items).toBeDefined();
        expect(items.length).toBeGreaterThanOrEqual(2);
        for (const item of items) {
          expect(item.topicTitle.length).toBeGreaterThan(10);
          expect(item.voiceText.length).toBeGreaterThan(50);
          expect(item.captionText.length).toBeGreaterThan(100);
        }
      }
    });

    it("getDynamicFallbackItem debe rotar temas según la fecha y no devolver siempre el mismo", () => {
      const date1 = new Date(2026, 8, 17); // Día A
      const date2 = new Date(2026, 8, 18); // Día B
      const item1 = getDynamicFallbackItem("jueves_tributario", date1);
      const item2 = getDynamicFallbackItem("jueves_tributario", date2);
      expect(item1.topicTitle).toBeDefined();
      expect(item2.topicTitle).toBeDefined();
      expect(item1.topicTitle).not.toBe(item2.topicTitle);
    });

    it("enforceGreetingAccuracy debe ajustar saludos según periodo del día en Colombia", () => {
      expect(enforceGreetingAccuracy("buenos días colegas", "tarde")).toContain("Buenas tardes");
      expect(enforceGreetingAccuracy("buenas tardes colegas", "mañana")).toContain("Buenos días");
      expect(enforceGreetingAccuracy("buenos días colegas", "noche")).toContain("Buenas noches");
    });

    it("enforceJanIAIdentity debe evitar que JanIA suplante a los fundadores", () => {
      const text = "Hola, te saluda Jani Alves y les traigo novedades de corretaje";
      const sanitized = enforceJanIAIdentity(text);
      expect(sanitized).not.toContain("te saluda Jani Alves");
      expect(sanitized).toContain("JanIA");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 8. TERCERÍA INMOBILIARIA 50/50 Y CHOQUES DOCTRINALES (v31.72)
  // ─────────────────────────────────────────────────────────────
  describe("8. Tercería Inmobiliaria 50/50 y Choques Doctrinales de Distribución (v31.72)", () => {
    it("extractFallbackDataFromText debe detectar 'no tercería' y estudio obligatorio", () => {
      const text = "Apto en venta Chicó 120m2, 3 hab, 2 baños, estudio cerrado, comisión 50-50 no tercería, piso 6";
      const parsed = extractFallbackDataFromText(text);
      expect(parsed.aceptaTerceria).toBe(false);
      expect(parsed.standByDirectoVecy).toBe(true);
      expect(parsed.caracteristicasDeseadas?.estudio).toBe("obligatorio");
    });

    it("Oferta con 'NO TERCERÍA' vs Demanda de Intermediario Colega debe quedar en STANDBY DIRECTO VECY (0%)", () => {
      const prop = {
        id: 501,
        propertyType: "apartment",
        transactionType: "venta",
        addressCity: "Bogotá",
        barrio: "Chicó",
        price: 800_000_000,
        areaTotal: 120,
        bedrooms: 3,
        bathrooms: 2,
        garages: 2,
        stratum: 5,
        aceptaTerceria: false,
        standByDirectoVecy: true,
        rawText: "Excelente apartamento en venta en el barrio Chicó, área 120m2, consta de 3 habitaciones amplias, 2 baños completos, garaje doble cubierto, valor $800.000.000. Comisión 50/50 NO TERCERÍA."
      };
      const req = {
        id: 901,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "venta",
        ciudadDeseada: "Bogotá",
        zonaDeseada: "Chicó",
        presupuestoMax: 850_000_000,
        areaMin: 100,
        habitacionesMin: 3,
        banosMin: 2,
        parqueaderosMin: 1,
        estratoDeseado: [5],
        origenTipo: "grupo_externo",
        rawText: "Colega inmobiliaria aliada busca apartamento en venta en Chicó para cliente calificado, presupuesto 850 millones, compartir comisión 50/50."
      };
      const result = explicarMatch(req, prop);
      expect(result.score).toBe(0);
      expect(result.blockers.some(b => b.includes("Standby Directo Vecy") || b.includes("NO TERCERÍA"))).toBe(true);
    });

    it("Demanda con 'ESTUDIO OBLIGATORIO' debe bloquear oferta sin estudio ni sala de TV (0%)", () => {
      const prop = {
        id: 502,
        propertyType: "apartment",
        transactionType: "venta",
        addressCity: "Bogotá",
        barrio: "Cedritos",
        price: 450_000_000,
        areaTotal: 90,
        bedrooms: 3,
        bathrooms: 2,
        garages: 1,
        stratum: 4,
        rawText: "Apartamento en venta en Cedritos, área de 90m2, cuenta con 3 alcobas, 2 baños, sala comedor corrida, cocina integral, 1 garaje privado, valor $450.000.000."
      };
      const req = {
        id: 902,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "venta",
        ciudadDeseada: "Bogotá",
        zonaDeseada: "Cedritos",
        presupuestoMax: 480_000_000,
        areaMin: 85,
        habitacionesMin: 3,
        banosMin: 2,
        parqueaderosMin: 1,
        estratoDeseado: [4],
        rawText: "Busco apartamento en Cedritos, 3 alcobas, presupuesto 480 millones, indispensable con estudio obligatorio para home office."
      };
      const result = explicarMatch(req, prop);
      expect(result.score).toBe(0);
      expect(result.blockers.some(b => b.includes("ESTUDIO OBLIGATORIO"))).toBe(true);
    });

    it("Demanda con piso mínimo ('del piso 5 hacia arriba') debe bloquear oferta en piso inferior", () => {
      const prop = {
        id: 503,
        propertyType: "apartment",
        transactionType: "venta",
        addressCity: "Bogotá",
        barrio: "Santa Bárbara",
        price: 600_000_000,
        areaTotal: 100,
        bedrooms: 3,
        bathrooms: 2,
        garages: 2,
        stratum: 5,
        floor: 2,
        rawText: "Apartamento en Santa Bárbara piso 2, área 100m2, consta de 3 alcobas, 2 baños, 2 garajes independientes, precio $600.000.000."
      };
      const req = {
        id: 903,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "venta",
        ciudadDeseada: "Bogotá",
        zonaDeseada: "Santa Bárbara",
        presupuestoMax: 650_000_000,
        areaMin: 95,
        habitacionesMin: 3,
        banosMin: 2,
        parqueaderosMin: 2,
        estratoDeseado: [5],
        rawText: "Busco en Santa Bárbara 3 alcobas, presupuesto 650 millones, únicamente ven opciones del piso 5 hacia arriba con vista agradable."
      };
      const result = explicarMatch(req, prop);
      expect(result.score).toBe(0);
      expect(result.blockers.some(b => b.includes("Choque de Nivel / Altura") && b.includes("piso 5"))).toBe(true);
    });

    it("Demanda que exige inmueble muy luminoso debe bloquear oferta interior", () => {
      const prop = {
        id: 504,
        propertyType: "apartment",
        transactionType: "venta",
        addressCity: "Bogotá",
        barrio: "Rosales",
        price: 900_000_000,
        areaTotal: 110,
        bedrooms: 2,
        bathrooms: 2,
        garages: 2,
        stratum: 6,
        rawText: "Apartamento en Rosales, 110m2, 2 habitaciones, 2 baños, garaje doble, apto interior tranquilo."
      };
      const req = {
        id: 904,
        tipoInmuebleDeseado: "apartment",
        tipoNegocioDeseado: "venta",
        ciudadDeseada: "Bogotá",
        zonaDeseada: "Rosales",
        presupuestoMax: 950_000_000,
        areaMin: 100,
        habitacionesMin: 2,
        banosMin: 2,
        parqueaderosMin: 1,
        estratoDeseado: [6],
        rawText: "Busco en Rosales 2 habitaciones, exterior muy iluminado y muy luminoso."
      };
      const result = explicarMatch(req, prop);
      expect(result.score).toBe(0);
      expect(result.blockers.some(b => b.includes("Choque de Confort Lumínico") || b.includes("INTERIOR"))).toBe(true);
    });

    it("Req #1541 vs Prop #2208 (Match #M14530): debe aplicar guillotina total 0% por precio (+80%), área (+53%) y ubicación", () => {
      const rawReq1541 = `Busco para cliente directo apto, con estas características: YA VENDIO LE URGE COMPRAR
• Zona: entre calle 89 y 92 de la 13 a la 7ª.
• M2: 180 – 200
• Indispensable: Terraza o balcón
• Ubicación: Exterior: X Interior:
• Moderno o clásico: no tan antiguo
• Cocina abierta o cerrada: no importa, pero no vieja
• Número habitaciones: 3
• Estudio: Si
• Número baños: 3 y auxiliar
• Cuarto y baño de servicio: mejor o baño servicio
• Número de piso: después del 2
• Número de parqueaderos: 2 amplios para camionetas
• Vigilancia o automatizado: vigilancia
• Presupuesto: 1,800 MILLONES CONTADO
• Si tienes el inmueble compartimos 50-50`;

      // 1. Validar extracción de fallback
      const extracted = extractFallbackDataFromText(rawReq1541);
      expect(extracted.presupuestoMax).toBe(1_800_000_000);
      expect(extracted.areaMin).toBe(180);
      expect(extracted.areaMax).toBe(200);
      expect(extracted.zone.toLowerCase()).toMatch(/cabrera|chic/);

      // 2. Validar que el cotejo contra Prop #2208 resulta en 0% absoluto (Guillotina)
      const prop2208 = {
        id: 2208,
        propertyType: "apartment",
        transactionType: "venta",
        addressCity: "Bogotá",
        zone: "Bogotá",
        price: 3_250_000_000,
        areaTotal: 306,
        bedrooms: 3,
        bathrooms: 4,
        garages: 6,
        rawText: "Apartamento en venta Bogotá 306 m2, 3 habitaciones, 4 baños, 6 garajes, terraza, $3.250.000.000"
      };

      const req1541 = {
        id: 1541,
        propertyType: "apartment",
        tipoInmuebleDeseado: "apartment",
        transactionType: "venta",
        tipoNegocioDeseado: "venta",
        addressCity: "Bogotá",
        ciudadDeseada: "Bogotá",
        zonaDeseada: extracted.zone,
        presupuestoMax: extracted.presupuestoMax,
        areaMin: extracted.areaMin,
        rawText: rawReq1541
      };

      const matchExplanation = explicarMatch(req1541, prop2208);
      expect(matchExplanation.score).toBe(0);
      expect(matchExplanation.blockers.length).toBeGreaterThan(0);
    });

    it("Match #M14570 (Req #378 vs Prop #3363): debe guillotinar a 0% por Cocina Cerrada, CBS Indispensable y Disponibilidad Incompatible", () => {
      const rawReq378 = `Busco Arriendo para Ya !
2 o 3 alcobas
Cocina cerrada
CBS (indispensable)
Pisos en madera
Parqueadero Visitantss
Planta eléctrica
Solo estos Barrios: Cabrera, Retiro, Nogal, Chico Museo
Presupuesto: $12.000.000`;

      const rawProp3363 = `*Arriendo lindo apto en el Nogal duplex*
79 con 8
169 mts
4 piso
Techos altos. Ventaneria de piso a techo
Ascensor directo al apto
Cocina abierta moderna
Baño de servicio
Sala comedor amplios
Baño social
3 cuartos el principal con Walk in closet y baño
Canon $10mm
Admin $1.800
Vigilancia 24-7
Dos parqueaderos
Disponible para finales de nov.`;

      // 1. Validar extracción correcta de Propiedad #3363 sin cruce de saltos de línea
      const extractedProp = extractFallbackDataFromText(rawProp3363);
      expect(extractedProp.area).toBe(169);
      expect(extractedProp.garages).toBe(2); // Debe ser 2, NO 7 por 'Vigilancia 24-7\nDos parqueaderos'
      expect(extractedProp.adminFee).toBe(1_800_000); // Admin $1.800 -> 1.800.000 COP
      expect(extractedProp.bedrooms).toBe(3);
      expect(extractedProp.bathrooms).toBe(3);

      const prop3363 = {
        id: 3363,
        propertyType: "apartment",
        transactionType: "arriendo",
        addressCity: "Bogotá",
        zone: "El Nogal",
        rentPrice: 10_000_000,
        adminFee: 1_800_000,
        areaTotal: 169,
        bedrooms: 3,
        bathrooms: 3,
        garages: 2,
        amenities: {
          cocina: "Abierta",
          cbs: false,
          cuartoBanoServicio: "Solo Baño de Servicio"
        },
        rawText: rawProp3363
      };

      const req378 = {
        id: 378,
        propertyType: "apartment",
        tipoInmuebleDeseado: "apartment",
        transactionType: "arriendo",
        tipoNegocioDeseado: "arriendo",
        addressCity: "Bogotá",
        ciudadDeseada: "Bogotá",
        zonaDeseada: "Nogal, Cabrera, Retiro",
        presupuestoMax: 12_000_000,
        caracteristicasDeseadas: {
          cocina: "Cerrada",
          cbs: "indispensable"
        },
        demandsCBSMandatory: true,
        rawText: rawReq378
      };

      const matchExplanation = explicarMatch(req378, prop3363);
      expect(matchExplanation.score).toBe(0);
      expect(matchExplanation.blockers.length).toBeGreaterThan(0);
      // Debe contener bloqueos explícitos
      const allBlockers = matchExplanation.blockers.join(" ");
      expect(allBlockers).toMatch(/Cocina|CBS|Disponibilidad/i);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 10. CARACTERÍSTICAS ESPECIALES EN DURO (Doctrina v31.87)
  // ─────────────────────────────────────────────────────────────
  describe("10. Características Especiales En Duro y Antigüedad Estricta (v31.87)", () => {
    it("debe aplicar guillotina 0% en duro si demanda pide máx 18 años y la oferta tiene 20 años", () => {
      const req = {
        id: 101,
        propertyType: "apartment",
        transactionType: "venta",
        presupuestoMax: 900_000_000,
        areaMin: 90,
        habitacionesMin: 2,
        banosMin: 2,
        parqueaderosMin: 1,
        antiguedadMax: 18,
        rawText: "Busco apartamento en venta en Cedritos, presupuesto hasta 900M, área 90m2, 2 habs, 2 baños, 1 garaje, necesito que tenga una antigüedad máxima de 18 años."
      };

      const prop = {
        id: 201,
        propertyType: "apartment",
        transactionType: "venta",
        price: 850_000_000,
        areaTotal: 95,
        bedrooms: 2,
        bathrooms: 2,
        garages: 1,
        antiguedadAnos: 20,
        rawText: "Apartamento en venta Cedritos $850M, 95m2, 2 alcobas, 2 baños, 1 garaje, tiene 20 años de construido."
      };

      const res = explicarMatch(req, prop);
      expect(res.score).toBe(0);
      const allBlockers = res.blockers.join(" ");
      expect(allBlockers).toMatch(/Antigüedad/i);
    });

    it("debe aplicar guillotina 0% si la demanda exige cocina abierta y la oferta tiene cocina cerrada", () => {
      const req = {
        id: 102,
        propertyType: "apartment",
        transactionType: "venta",
        presupuestoMax: 1_200_000_000,
        areaMin: 100,
        habitacionesMin: 3,
        banosMin: 2,
        parqueaderosMin: 2,
        caracteristicasDeseadas: { cocina: "Abierta" },
        rawText: "Busco apto en venta en Chicó, presupuesto $1.200M, le encantan las cocinas abiertas tipo americana, 3 alcobas, 2 baños, 2 parqueaderos."
      };

      const prop = {
        id: 202,
        propertyType: "apartment",
        transactionType: "venta",
        price: 1_150_000_000,
        areaTotal: 110,
        bedrooms: 3,
        bathrooms: 3,
        garages: 2,
        amenities: { cocina: "Cerrada" },
        rawText: "Vendo apto en Chicó $1.150M, 110m2, 3 habs, 3 baños, cocina cerrada tradicional independiente, 2 parqueaderos."
      };

      const res = explicarMatch(req, prop);
      expect(res.score).toBe(0);
      const allBlockers = res.blockers.join(" ");
      expect(allBlockers).toMatch(/Cocina/i);
    });

    it("debe aplicar guillotina 0% si la demanda exige carro eléctrico y el predio no tiene infraestructura", () => {
      const req = {
        id: 103,
        propertyType: "apartment",
        transactionType: "venta",
        presupuestoMax: 1_500_000_000,
        areaMin: 120,
        habitacionesMin: 3,
        banosMin: 3,
        parqueaderosMin: 2,
        rawText: "Busco apto en Rosales, presupuesto 1500 millones, 3 alcobas, indispensable que tenga adecuación para carro eléctrico."
      };

      const prop = {
        id: 203,
        propertyType: "apartment",
        transactionType: "venta",
        price: 1_400_000_000,
        areaTotal: 130,
        bedrooms: 3,
        bathrooms: 3,
        garages: 2,
        antiguedadAnos: 28,
        rawText: "Hermoso apartamento en Rosales $1.400M, 130m2, 3 alcobas, 28 años de construido, 2 garajes."
      };

      const res = explicarMatch(req, prop);
      expect(res.score).toBe(0);
      const allBlockers = res.blockers.join(" ");
      expect(allBlockers).toMatch(/Vehículo Eléctrico|carro eléctrico/i);
    });

    it("debe aplicar guillotina 0% si la demanda exige garajes independientes y la oferta ofrece lineales", () => {
      const req = {
        id: 104,
        propertyType: "apartment",
        transactionType: "venta",
        presupuestoMax: 800_000_000,
        areaMin: 85,
        habitacionesMin: 2,
        banosMin: 2,
        parqueaderosMin: 2,
        rawText: "Busco apartamento en Chapinero Alto, 2 parqueaderos estrictamente independientes no lineal, presupuesto 800M."
      };

      const prop = {
        id: 204,
        propertyType: "apartment",
        transactionType: "venta",
        price: 780_000_000,
        areaTotal: 90,
        bedrooms: 2,
        bathrooms: 2,
        garages: 2,
        garageType: "lineal",
        rawText: "Apartamento en Chapinero Alto $780M, 90m2, 2 garajes lineales en servidumbre."
      };

      const res = explicarMatch(req, prop);
      expect(res.score).toBe(0);
      const allBlockers = res.blockers.join(" ");
      expect(allBlockers).toMatch(/Parqueadero|lineal/i);
    });

    it("debe ACEPTAR y premiar con plus/confort cuando la oferta tiene IGUAL O MÁS alcobas, baños o área", () => {
      const req = {
        id: 105,
        propertyType: "apartment",
        transactionType: "venta",
        presupuestoMax: 900_000_000,
        areaMin: 80,
        habitacionesMin: 2,
        banosMin: 2,
        parqueaderosMin: 1,
        rawText: "Busco apto en Cedritos, min 80m2, 2 alcobas, 2 baños, 1 parqueadero."
      };

      const prop = {
        id: 205,
        propertyType: "apartment",
        transactionType: "venta",
        price: 880_000_000,
        areaTotal: 92,
        bedrooms: 3, // Más de lo pedido -> Confort
        bathrooms: 3, // Más de lo pedido -> Confort
        garages: 2,   // Más de lo pedido -> Confort
        antiguedadAnos: 5,
        rawText: "Excelente apto en Cedritos $880M, 92m2, 3 alcobas amplias, 3 baños, 2 garajes independientes, 5 años."
      };

      const res = explicarMatch(req, prop);
      expect(res.score).toBeGreaterThanOrEqual(85);
      expect(res.blockers.length).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 11. DIRECTORIO PERMANENTE DE ASESORES — PERSISTENCIA INDESTRUCTIBLE (v31.88)
  // ─────────────────────────────────────────────────────────────
  describe("11. Directorio Permanente de Asesores e Identidad Indestructible (v31.88)", () => {
    it("debe normalizar celulares colombianos a 12 dígitos y excluir radicalmente la línea oficial JanIA Bot (+573192919978)", () => {
      // Teléfono regular 10 dígitos -> 573...
      expect(normalizeAdvisorPhone("3101234567")).toBe("573101234567");
      expect(normalizeAdvisorPhone("+57 310 123 4567")).toBe("573101234567");
      expect(normalizeAdvisorPhone("573101234567@s.whatsapp.net")).toBe("573101234567");

      // ⛔ EXCLUSIÓN RADICAL: Número oficial de JanIA Bot Socket Baileys
      expect(normalizeAdvisorPhone("573192919978")).toBeNull();
      expect(normalizeAdvisorPhone("+57 319 291 9978")).toBeNull();
      expect(normalizeAdvisorPhone("3192919978")).toBeNull();
      expect(normalizeAdvisorPhone("573192919978@s.whatsapp.net")).toBeNull();
    });

    it("debe detectar correctamente identificadores internos LID de WhatsApp y rechazar considerarlos teléfonos", () => {
      expect(isLidIdentifier("259514976747768")).toBe(true);
      expect(isLidIdentifier("259514976747768@lid")).toBe(true);
      expect(isLidIdentifier("120363417740040773@g.us")).toBe(true);
      expect(isLidIdentifier("3101234567")).toBe(false);
      expect(isLidIdentifier("573101234567")).toBe(false);

      expect(normalizeAdvisorPhone("259514976747768")).toBeNull();
      expect(normalizeAdvisorPhone("259514976747768@lid")).toBeNull();
    });

    it("debe detectar nombres genéricos y diferenciarlos de nombres reales de asesores", () => {
      expect(isGenericName("Asesor +573101234567")).toBe(true);
      expect(isGenericName("asesor")).toBe(true);
      expect(isGenericName("Nuevo Asesor")).toBe(true);
      expect(isGenericName("colega")).toBe(true);
      expect(isGenericName("Sin Nombre")).toBe(true);
      expect(isGenericName("")).toBe(true);
      expect(isGenericName(null)).toBe(true);

      expect(isGenericName("Carlos Gómez")).toBe(false);
      expect(isGenericName("Erika Del Pilar")).toBe(false);
      expect(isGenericName("Inmobiliaria Santa María")).toBe(false);
    });

    it("preserveVerifiedAdvisorContact: NUNCA debe permitir que un LID entrante sobreescriba un teléfono verificado guardado por Eduardo", () => {
      const existingPhone = "573105551234";
      const existingName = "Erika Del Pilar";
      const incomingLid = "259514976747768@lid";
      const incomingGenericName = "Asesor +259514976747768";

      const preserved = preserveVerifiedAdvisorContact(existingPhone, existingName, incomingLid, incomingGenericName);

      // El teléfono verificado se mantiene intacto para siempre
      expect(preserved.effectivePhone).toBe("573105551234");
      // El nombre real se mantiene intacto para siempre
      expect(preserved.effectiveName).toBe("Erika Del Pilar");
    });

    it("preserveVerifiedAdvisorContact: debe resolver el teléfono real cuando un LID entrante ya fue mapeado a un asesor en el directorio", () => {
      // Simular que el LID fue previamente asociado en el caché/directorio
      brokerDirectoryCache.set("259514976747768", { phone: "573159998877", name: "Mauricio Morales" });

      const incomingLid = "259514976747768";
      const preserved = preserveVerifiedAdvisorContact(null, null, incomingLid, null);

      expect(preserved.effectivePhone).toBe("573159998877");
      expect(preserved.effectiveName).toBe("Mauricio Morales");
    });

    it("lookupAdvisorSync: debe resolver contactos en 0ms desde memoria por teléfono, LID o nombre", () => {
      brokerDirectoryCache.set("573187776655", { phone: "573187776655", name: "Diana Quintero" });
      brokerDirectoryCache.set("diana quintero", { phone: "573187776655", name: "Diana Quintero" });

      const byPhone = lookupAdvisorSync("573187776655");
      expect(byPhone).toBeDefined();
      expect(byPhone?.phone).toBe("573187776655");
      expect(byPhone?.name).toBe("Diana Quintero");

      const byName = lookupAdvisorSync(null, "Diana Quintero");
      expect(byName).toBeDefined();
      expect(byName?.phone).toBe("573187776655");
    });
  });
});

