/**
 * SERVICIO OFICIAL DE LIQUIDACIÓN DE GASTOS NOTARIALES, REGISTRO Y DOCTRINA JURÍDICA — VECY NETWORK
 * Normativa Notarial y Registral de Colombia (Superintendencia de Notariado y Registro - SNR 2026,
 * Ley 258/1996, Ley 854/2003, Ley 70/1931, Ley 397/1997, Ley 1185/2008 y Estatuto Tributario).
 * 
 * Modos y figuras contempladas:
 * 1. COMPRAVENTA TRADICIONAL (Libre de gravámenes)
 * 2. PREDIO CON HIPOTECA (Cancelación / Levantamiento de hipoteca por vendedor)
 * 3. COMPRA CON CRÉDITO HIPOTECARIO (Constitución de hipoteca a favor del banco)
 * 4. PREDIO CON LEASING HABITACIONAL / COMPRA CON LEASING (Cesión vs Adquisición con entidad financiera)
 * 5. AFECTACIÓN A VIVIENDA FAMILIAR (Ley 258/1996 y Ley 854/2003 - Firma obligatoria de ambos cónyuges)
 * 6. PATRIMONIO DE FAMILIA INEMBARGABLE (Ley 70/1931 - Hijos menores vs mayores de edad)
 * 7. BIEN DE INTERÉS CULTURAL (BIC) / PATRIMONIO CULTURAL (Restricción bancaria para créditos, IDPC)
 * 8. MEDIDAS CAUTELARES / EMBARGOS (Objeto ilícito Art. 1521 C.C. - Bloqueo absoluto)
 */

import { VALOR_UVT_2026 } from './taxEngine';

export interface NotarialExpenseParams {
  precioVenta: number;
  estadoPredio?: 'libre' | 'hipoteca' | 'leasing'; // Situación jurídica del predio del vendedor
  formaPago?: 'contado' | 'hipoteca' | 'leasing';  // Forma de pago del comprador
  montoCredito?: number;                         // Valor financiado si aplica
  saldoHipotecaVendedor?: number;                // Saldo hipoteca del vendedor
  ciudad?: string;                               // Ciudad (por defecto Bogotá D.C.)
  vendedorEsPersonaJuridica?: boolean;           // Si el vendedor es empresa / persona jurídica (Retención $0)
  esViviendaInteresSocial?: boolean;             // Si es VIS / VIP (Tarifas preferenciales Ley 1537)
  esCesionLeasing?: boolean;                     // Si es cesión de contrato de leasing pura
  afectacionViviendaFamiliar?: boolean;          // Tiene afectación a vivienda familiar (Ley 258/1996)
  patrimonioFamilia?: boolean;                   // Tiene patrimonio de familia inembargable (Ley 70/1931)
  bienInteresCultural?: boolean;                 // Es Bien de Interés Cultural (BIC) / Patrimonio histórico
  embargoMedidaCautelar?: boolean;               // Registra embargo o medida cautelar judicial
}

export interface NotarialExpenseResult {
  precioVenta: number;
  estadoPredio: 'libre' | 'hipoteca' | 'leasing';
  formaPago: 'contado' | 'hipoteca' | 'leasing';
  ciudad: string;
  esInviableJuridicamente?: boolean;             // Si tiene embargo activo
  vendedorEsPersonaJuridica?: boolean;
  esViviendaInteresSocial?: boolean;
  gastosVendedor: {
    derechosNotariales50Pct: number;
    otrosGastosCopiasFolios: number;
    ivaNotarial: number;
    retencionFuente: number;
    tarifaRetencionPct: number;
    cancelacionHipoteca: number;
    cancelacionAfectacionVivienda: number;
    cancelacionPatrimonioFamilia: number;
    subtotalVendedor: number;
  };
  gastosComprador: {
    derechosNotariales50Pct: number;
    otrosGastosCopiasFolios: number;
    ivaNotarial: number;
    impuestoRegistroBeneficencia: number;
    derechosRegistroOrip: number;
    constitucionHipoteca: number;
    subtotalComprador: number;
  };
  totalGastosAproximados: number;
  ahorroLeasingDetectado?: number;
  advertenciasJuridicas: string[];
  reportText: string;
}

/**
 * Rangos de porcentaje oficiales de Derechos Notariales según cuantía (SNR / Notaría 19)
 */
export function getNotarialFeeRate(precio: number, esVis: boolean = false): number {
  if (esVis) return 0.0027; // Beneficio del 50% Ley 1537/2012
  if (precio < 100_000_001) return 0.0059;   // 0.59%
  if (precio < 500_000_001) return 0.0040;   // 0.40%
  if (precio < 1_000_000_001) return 0.0038; // 0.38%
  return 0.0036;                             // 0.36% (> 1.000 millones)
}

/**
 * Rangos de porcentaje oficiales de Derechos de Registro ORIP según cuantía (SNR / Notaría 19)
 */
export function getRegistryFeeRate(precio: number, esVis: boolean = false): number {
  if (esVis) return 0.0035; // Tarifa preferencial VIS
  if (precio < 136_278_900) return 0.00632;  // 0.632%
  if (precio < 236_216_760) return 0.00785;  // 0.785%
  if (precio < 349_782_510) return 0.00874;  // 0.874%
  return 0.00924;                            // 0.924% (> 349 millones)
}

/**
 * Liquida los gastos notariales, impuestos de registro y analiza contingencias jurídicas.
 * Incorpora la doctrina técnica de la Superintendencia de Notariado y Registro (SNR 2026)
 * y las mejores prácticas de la Notaría 19 de Bogotá.
 */
export function liquidarGastosNotariales(params: NotarialExpenseParams): NotarialExpenseResult {
  const precioVenta = Math.max(0, Number(params.precioVenta) || 0);
  const estadoPredio = params.estadoPredio || 'libre';
  const formaPago = params.formaPago || 'contado';
  const ciudad = params.ciudad || 'Bogotá';
  const vendedorEsPersonaJuridica = !!params.vendedorEsPersonaJuridica;
  const esVis = !!params.esViviendaInteresSocial;
  const advertenciasJuridicas: string[] = [];

  // 0. Alerta Crítica: Embargo / Medida Cautelar (Art. 1521 Código Civil)
  if (params.embargoMedidaCautelar) {
    advertenciasJuridicas.push(
      '⛔ *ALERTA CRÍTICA DE EMBARGO:* El inmueble tiene una medida cautelar o embargo judicial vigente. La ley colombiana prohíbe su venta (objeto ilícito). Para firmar promesa o escritura se requiere radicar previamente el oficio de desembargo emitido por el juzgado ante la Oficina de Registro (ORIP).'
    );
  }

  // 1. Tarifa Retención en la Fuente (Vendedor)
  // Si el vendedor es persona jurídica, NO paga retención en notaría (autorretención en renta periódica)
  const limite20kUvt = 20000 * VALOR_UVT_2026; // $1.006.360.000 COP en 2026
  let tarifaRetencionPct = 0;
  let retencionFuente = 0;

  if (vendedorEsPersonaJuridica) {
    tarifaRetencionPct = 0;
    retencionFuente = 0;
    advertenciasJuridicas.push(
      '🏢 *Vendedor Persona Jurídica:* No causa retención en la fuente en notaría si la sociedad aporta RUT con condición de autorretenedora o declara renta periódica.'
    );
  } else {
    tarifaRetencionPct = precioVenta > limite20kUvt ? 2.5 : 1.0;
    retencionFuente = Math.round(precioVenta * (tarifaRetencionPct / 100));
  }

  // 2. Derechos Notariales de Compraventa (repartido 50/50 según rangos SNR / Notaría 19)
  const notarialFeeRate = getNotarialFeeRate(precioVenta, esVis);
  const derechosNotarialesTotales = Math.round(precioVenta * notarialFeeRate);
  const derechosNotariales50Pct = Math.round(derechosNotarialesTotales / 2);

  // Otros gastos notariales (copias de matriz, hojas notariales, biometría en línea)
  const otrosGastosVendedor = esVis ? 50000 : 100000;
  const otrosGastosComprador = esVis ? 50000 : 100000;

  // IVA Notarial (19% sobre derechos notariales y papelería)
  const ivaVendedor = Math.round((derechosNotariales50Pct + otrosGastosVendedor) * 0.19);
  const ivaComprador = Math.round((derechosNotariales50Pct + otrosGastosComprador) * 0.19);

  // 3. Gastos del Vendedor
  let cancelacionHipotecaVendedor = 0;
  if (estadoPredio === 'hipoteca') {
    // Cancelación y levantamiento de hipoteca en la misma escritura
    cancelacionHipotecaVendedor = Math.round(Math.min(1200000, Math.max(550000, precioVenta * 0.0015)));
    advertenciasJuridicas.push(
      '🏦 *Predio con Hipoteca:* El banco acreedor debe expedir la minuta de cancelación de hipoteca y certificado de saldo a la fecha para anexar a la escritura pública.'
    );
  }

  let cancelacionAfectacionVivienda = 0;
  if (params.afectacionViviendaFamiliar) {
    // Cancelación de Afectación a Vivienda Familiar (Acto sin cuantía en notaría + ORIP ~$600.000 total)
    cancelacionAfectacionVivienda = 600000;
    advertenciasJuridicas.push(
      '💍 *Afectación a Vivienda Familiar (Ley 258/1996):* Es OBLIGATORIO que ambos cónyuges o compañeros permanentes firmen la escritura de cancelación. Si uno de los dos no comparece, la notaría no autoriza la venta.'
    );
  }

  let cancelacionPatrimonioFamilia = 0;
  if (params.patrimonioFamilia) {
    cancelacionPatrimonioFamilia = 600000;
    advertenciasJuridicas.push(
      '👨‍👩‍👧‍👦 *Patrimonio de Familia Inembargable (Ley 70/1931):* Si hay hijos menores de edad, la cancelación requiere autorización judicial o trámite notarial con concepto del Defensor de Familia del ICBF. Si los hijos son mayores, ambos padres firman aportando los registros civiles.'
    );
  }

  const subtotalVendedor = 
    derechosNotariales50Pct + 
    otrosGastosVendedor +
    ivaVendedor +
    retencionFuente + 
    cancelacionHipotecaVendedor + 
    cancelacionAfectacionVivienda + 
    cancelacionPatrimonioFamilia;

  // 4. Gastos del Comprador
  const registryRate = getRegistryFeeRate(precioVenta, esVis);
  let impuestoRegistro = Math.round(precioVenta * 0.01); // 1.0% Beneficencia Bogotá
  let derechosRegistroOrip = Math.round((precioVenta * registryRate) * 1.02 + (esVis ? 30000 : 100000)); // ORIP + sistematización
  let constitucionHipotecaComprador = 0;
  let ahorroLeasingDetectado = 0;

  const esCesion = params.esCesionLeasing || (estadoPredio === 'leasing' && formaPago === 'leasing');

  if (esCesion) {
    // 💡 CESIÓN DE CONTRATO DE LEASING HABITACIONAL:
    // El inmueble continúa a nombre del banco fiduciario. No hay cambio de dominio en matrícula inmobiliaria.
    // AHORRO: Se elimina el 1% de beneficencia y el 0.75-0.92% de registro de compraventa.
    ahorroLeasingDetectado = impuestoRegistro + derechosRegistroOrip;
    impuestoRegistro = 0;
    derechosRegistroOrip = 0;
    advertenciasJuridicas.push(
      '📑 *Cesión de Leasing Habitacional:* Se formaliza mediante cesión de derechos con la entidad bancaria y reconocimiento de firmas en notaría, ahorrando el pago de impuesto de beneficencia y registro de matrícula.'
    );
  } else if (formaPago === 'hipoteca') {
    const montoCredito = params.montoCredito && params.montoCredito > 0 
      ? params.montoCredito 
      : Math.round(precioVenta * 0.70);
    // Gastos notariales y de registro de la hipoteca a favor del banco (~1.1% del crédito)
    constitucionHipotecaComprador = Math.round(montoCredito * 0.011);
  }

  // 5. Alerta de Bien de Interés Cultural (BIC) / Patrimonio Cultural
  if (params.bienInteresCultural) {
    advertenciasJuridicas.push(
      '🏛️ *Bien de Interés Cultural (BIC) / Conservación Patrimonial:* Los bancos comerciales generalmente NO aprueban crédito hipotecario ni leasing sobre predios BIC por restricciones estructurales y de disposición. Si el comprador va a financiar, debe consultar con su banco previamente o negociar pago de CONTADO. Asimismo, cualquier remodelación requiere licencia especial del IDPC o Ministerio de Cultura.'
    );
  }

  const subtotalComprador = 
    derechosNotariales50Pct + 
    otrosGastosComprador +
    ivaComprador +
    impuestoRegistro + 
    derechosRegistroOrip + 
    constitucionHipotecaComprador;
    
  const totalGastosAproximados = subtotalVendedor + subtotalComprador;

  // 6. Construcción del texto formateado conciso para WhatsApp
  const reportText = formatNotarialExpenseText({
    precioVenta,
    estadoPredio,
    formaPago,
    ciudad,
    vendedorEsPersonaJuridica,
    esViviendaInteresSocial: esVis,
    derechosNotariales50Pct,
    otrosGastosVendedor,
    otrosGastosComprador,
    ivaVendedor,
    ivaComprador,
    retencionFuente,
    tarifaRetencionPct,
    cancelacionHipotecaVendedor,
    cancelacionAfectacionVivienda,
    cancelacionPatrimonioFamilia,
    subtotalVendedor,
    impuestoRegistro,
    derechosRegistroOrip,
    constitucionHipotecaComprador,
    subtotalComprador,
    totalGastosAproximados,
    ahorroLeasingDetectado,
    esCesionLeasing: esCesion,
    advertenciasJuridicas,
    embargoMedidaCautelar: !!params.embargoMedidaCautelar
  });

  return {
    precioVenta,
    estadoPredio,
    formaPago,
    ciudad,
    esInviableJuridicamente: !!params.embargoMedidaCautelar,
    vendedorEsPersonaJuridica,
    esViviendaInteresSocial: esVis,
    gastosVendedor: {
      derechosNotariales50Pct,
      otrosGastosCopiasFolios: otrosGastosVendedor,
      ivaNotarial: ivaVendedor,
      retencionFuente,
      tarifaRetencionPct,
      cancelacionHipoteca: cancelacionHipotecaVendedor,
      cancelacionAfectacionVivienda,
      cancelacionPatrimonioFamilia,
      subtotalVendedor
    },
    gastosComprador: {
      derechosNotariales50Pct,
      otrosGastosCopiasFolios: otrosGastosComprador,
      ivaNotarial: ivaComprador,
      impuestoRegistroBeneficencia: impuestoRegistro,
      derechosRegistroOrip,
      constitucionHipoteca: constitucionHipotecaComprador,
      subtotalComprador
    },
    totalGastosAproximados,
    ahorroLeasingDetectado: ahorroLeasingDetectado > 0 ? ahorroLeasingDetectado : undefined,
    advertenciasJuridicas,
    reportText
  };
}

interface FormatParams {
  precioVenta: number;
  estadoPredio: 'libre' | 'hipoteca' | 'leasing';
  formaPago: 'contado' | 'hipoteca' | 'leasing';
  ciudad: string;
  vendedorEsPersonaJuridica?: boolean;
  esViviendaInteresSocial?: boolean;
  derechosNotariales50Pct: number;
  otrosGastosVendedor: number;
  otrosGastosComprador: number;
  ivaVendedor: number;
  ivaComprador: number;
  retencionFuente: number;
  tarifaRetencionPct: number;
  cancelacionHipotecaVendedor: number;
  cancelacionAfectacionVivienda: number;
  cancelacionPatrimonioFamilia: number;
  subtotalVendedor: number;
  impuestoRegistro: number;
  derechosRegistroOrip: number;
  constitucionHipotecaComprador: number;
  subtotalComprador: number;
  totalGastosAproximados: number;
  ahorroLeasingDetectado: number;
  esCesionLeasing: boolean;
  advertenciasJuridicas: string[];
  embargoMedidaCautelar: boolean;
}

function formatCurrency(val: number): string {
  return `$${Math.round(val).toLocaleString('es-CO')}`;
}

/**
 * Genera el texto para WhatsApp de forma concisa, cálida y sin párrafos kilométricos
 */
function formatNotarialExpenseText(p: FormatParams): string {
  const labelPredio = p.estadoPredio === 'hipoteca' ? 'Con Hipoteca' : p.estadoPredio === 'leasing' ? 'Con Leasing' : 'Libre de gravámenes';
  const labelPago = p.formaPago === 'hipoteca' ? 'Crédito Hipotecario' : p.formaPago === 'leasing' ? 'Leasing Habitacional' : 'Contado';

  let t = `⚖️ *LIQUIDACIÓN ESTIMADA DE GASTOS NOTARIALES Y REGISTRO* 🇨🇴\n`;
  t += `🏢 *Inmueble:* ${formatCurrency(p.precioVenta)} (${p.ciudad}) | *Figura:* ${labelPredio} / ${labelPago}\n`;
  if (p.esViviendaInteresSocial) {
    t += `🏷️ *Tipo:* Vivienda de Interés Social (VIS - Tarifas preferenciales Ley 1537)\n`;
  }
  t += `\n`;

  t += `👤 *A CARGO DEL VENDEDOR:*\n`;
  t += `• 50% Derechos Notariales: *${formatCurrency(p.derechosNotariales50Pct)}*\n`;
  t += `• Papelería, copias y biometría: *${formatCurrency(p.otrosGastosVendedor)}*\n`;
  t += `• IVA notarial (19%): *${formatCurrency(p.ivaVendedor)}*\n`;
  if (p.vendedorEsPersonaJuridica) {
    t += `• Retención en la fuente (0% - Persona Jurídica): *$0 COP* (autorretención en renta)\n`;
  } else {
    t += `• Retención en la fuente (${p.tarifaRetencionPct}%): *${formatCurrency(p.retencionFuente)}*\n`;
  }
  if (p.cancelacionHipotecaVendedor > 0) {
    t += `• Cancelación de Hipoteca del banco: *${formatCurrency(p.cancelacionHipotecaVendedor)}*\n`;
  }
  if (p.cancelacionAfectacionVivienda > 0) {
    t += `• Cancelación Afectación Familiar (Ley 258): *${formatCurrency(p.cancelacionAfectacionVivienda)}*\n`;
  }
  if (p.cancelacionPatrimonioFamilia > 0) {
    t += `• Cancelación Patrimonio de Familia: *${formatCurrency(p.cancelacionPatrimonioFamilia)}*\n`;
  }
  t += `👉 *Subtotal Vendedor: ~${formatCurrency(p.subtotalVendedor)} COP*\n\n`;

  t += `👤 *A CARGO DEL COMPRADOR:*\n`;
  t += `• 50% Derechos Notariales: *${formatCurrency(p.derechosNotariales50Pct)}*\n`;
  t += `• Papelería, copias y biometría: *${formatCurrency(p.otrosGastosComprador)}*\n`;
  t += `• IVA notarial (19%): *${formatCurrency(p.ivaComprador)}*\n`;
  if (p.impuestoRegistro > 0) {
    t += `• Impuesto de Registro / Beneficencia (1%): *${formatCurrency(p.impuestoRegistro)}*\n`;
  }
  if (p.derechosRegistroOrip > 0) {
    t += `• Derechos de Registro SNR / ORIP + sistematización: *${formatCurrency(p.derechosRegistroOrip)}*\n`;
  }
  if (p.constitucionHipotecaComprador > 0) {
    t += `• Registro de Crédito Hipotecario (~1.1%): *${formatCurrency(p.constitucionHipotecaComprador)}*\n`;
  }
  t += `👉 *Subtotal Comprador: ~${formatCurrency(p.subtotalComprador)} COP*\n\n`;

  if (p.ahorroLeasingDetectado > 0) {
    t += `✨ *Ahorro por Cesión de Leasing:* Al no haber cambio de dueño en matrícula, el comprador se ahorra aproximadamente *${formatCurrency(p.ahorroLeasingDetectado)}* en beneficencia y registro de compraventa.\n\n`;
  }

  if (p.advertenciasJuridicas.length > 0) {
    t += `🔍 *Cláusulas y Consideraciones Especiales:*\n`;
    p.advertenciasJuridicas.forEach(adv => {
      t += `${adv}\n`;
    });
    t += `\n`;
  }

  t += `💡 *Total aproximado escrituración:* ~${formatCurrency(p.totalGastosAproximados)} COP.\n`;
  t += `_Cálculo informativo conforme a tarifas vigentes SNR 2026 y estándares notariales. Si vas a firmar promesa de compraventa, podemos revisar las cláusulas para total tranquilidad de las partes 🤝✨_`;

  return t;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMORIA DE SESIONES PENDIENTES DE LIQUIDACIÓN NOTARIAL (cuando faltan datos)
// ─────────────────────────────────────────────────────────────────────────────
interface PendingNotarialSession {
  timestamp: number;
  partialParams?: Partial<NotarialExpenseParams>;
}

const pendingNotarialSessions = new Map<string, PendingNotarialSession>();
const NOTARIAL_SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutos

export function hasPendingNotarialSession(senderId: string): boolean {
  const session = pendingNotarialSessions.get(senderId);
  if (!session) return false;
  if (Date.now() - session.timestamp > NOTARIAL_SESSION_TTL_MS) {
    pendingNotarialSessions.delete(senderId);
    return false;
  }
  return true;
}

export function setPendingNotarialSession(senderId: string, partial?: Partial<NotarialExpenseParams>): void {
  pendingNotarialSessions.set(senderId, {
    timestamp: Date.now(),
    partialParams: partial
  });
}

export function clearPendingNotarialSession(senderId: string): void {
  pendingNotarialSessions.delete(senderId);
}

export function getPendingNotarialSession(senderId: string): PendingNotarialSession | null {
  if (!hasPendingNotarialSession(senderId)) return null;
  return pendingNotarialSessions.get(senderId) || null;
}

/**
 * Responde dudas jurídicas y doctrinales sobre figuras notariales colombianas
 * (Bien de Interés Cultural BIC, Afectación a Vivienda Familiar, Patrimonio de Familia, Embargos, Créditos,
 * Preguntas Frecuentes Notaría 19: quién paga qué, retención, beneficencia, VIS, personas jurídicas).
 */
export function explainNotarialFigures(text: string): { isQuestion: boolean; answerText?: string } {
  if (!text || typeof text !== 'string') return { isQuestion: false };
  const lower = text.trim().toLowerCase();

  // 0. Comparación de anotaciones diferentes (Patrimonio Cultural vs Patrimonio de Familia)
  const isComparisonPatrimonio =
    (/(?:patrimonio\s*cultural|inter[eé]s\s*cultural)/i.test(lower) && /(?:patrimonio\s*de\s*familia)/i.test(lower)) ||
    /(?:diferencia.*patrimonio|anotaciones\s*diferentes)/i.test(lower);

  if (isComparisonPatrimonio) {
    return {
      isQuestion: true,
      answerText:
        `⚖️ *Diferencia entre Patrimonio de Familia y Patrimonio Cultural (BIC):*\n\n` +
        `Son dos figuras totalmente distintas que aparecen en el folio de matrícula:\n\n` +
        `1️⃣ *Patrimonio de Familia Inembargable (Ley 70/1931):* Protege a la familia contra embargos. Si hay hijos menores, exige aval del ICBF para poder vender.\n` +
        `2️⃣ *Patrimonio Cultural / Bien de Interés Cultural (Ley 397/1997):* Es una protección urbanística/arquitectónica del Estado. Hace que *los bancos NO aprueben crédito hipotecario*, obligando casi siempre a comprar de contado.\n\n` +
        `¿Tienes la matrícula inmobiliaria del predio o quieres que liquidemos los gastos notariales? 🤝`
    };
  }

  // 1. Bien de Interés Cultural (BIC) / Patrimonio Cultural o Arquitectónico
  const isBicQuestion = 
    /(?:inter[eé]s\s+cultural|patrimonio\s+cultural|patrimonio\s+hist[oó]rico|bic\b|conservaci[oó]n\s+arquitect[oó]nica)/i.test(lower) &&
    /(?:qu[eé]\s+(?:sucede|pasa|implica|es|significa)|impide|afecta|banco|cr[eé]dito|leasing|prestan|vender|comprar|negociaci[oó]n|diferen|anotaci[oó]n|inconveniente)/i.test(lower);

  if (isBicQuestion) {
    return {
      isQuestion: true,
      answerText:
        `🏛️ *Bien de Interés Cultural (BIC) o Patrimonio Cultural:*\n\n` +
        `Es una anotación registral de conservación histórica y arquitectónica (declarada por el IDPC en Bogotá o el Ministerio de Cultura a nivel nacional).\n\n` +
        `⚠️ *¿Por qué dificulta o impide la negociación con crédito bancario?*\n` +
        `Los bancos comerciales en Colombia (Bancolombia, Davivienda, BBVA, etc.) *generalmente NO aprueban crédito hipotecario ni leasing habitacional* sobre predios catalogados como BIC, debido a:\n` +
        `1️⃣ *Restricciones estrictas de intervención:* No se pueden demoler ni hacer reformas estructurales o de fachada sin visto bueno y licencias del IDPC/MinCultura que demoran 1 a 2 años.\n` +
        `2️⃣ *Dificultad de liquidación judicial:* Ante un eventual remate o ejecución por mora, estos bienes tienen un mercado muy restringido.\n\n` +
        `👉 *Conclusión práctica:* Si el inmueble es BIC, la compraventa casi siempre debe pactarse de *CONTADO (recursos propios)* o mediante crédito de libre inversión con otra garantía. Si quieres, ¡podemos liquidarte los gastos de escrituración de contado de una vez! 🤝✨`
    };
  }

  // 2. Afectación a Vivienda Familiar vs Sin Afectación (Ley 258/1996 y Ley 854/2003)
  const isAfectacionQuestion =
    /(?:afectaci[oó]n\s*(?:a\s*)?vivienda\s*familiar|afectaci[oó]n\s*familiar|sin\s*afectaci[oó]n)/i.test(lower) &&
    /(?:qu[eé]\s+(?:sucede|pasa|implica|es|significa)|c[oó]mo\s+funciona|se\s*puede\s*vender|ambos|c[oó]nyuge|espos[oa]|firmar|cancelar|notar[ií]a|diferen)/i.test(lower);

  if (isAfectacionQuestion) {
    return {
      isQuestion: true,
      answerText:
        `💍 *Afectación a Vivienda Familiar (Ley 258 de 1996 y Ley 854 de 2003):*\n\n` +
        `Protege el inmueble donde reside la pareja casada o en unión marital de hecho:\n\n` +
        `• *Con afectación familiar:* No impide la venta, pero es *OBLIGATORIA la comparecencia y firma de AMBOS cónyuges o compañeros permanentes* para cancelarla en la misma escritura. Si uno de ellos no firma (por conflicto, separación de hecho o falta de poder notarial), la notaría *NO puede autorizar la venta*.\n` +
        `• *Sin afectación familiar:* El vendedor comparece solo y declara bajo gravedad de juramento en la escritura que no tiene cónyuge con quien habite allí, que tiene otro predio afectado o que el bien no está destinado a vivienda familiar.\n\n` +
        `¿Deseas que te liquide los gastos de cancelación de la afectación y compraventa para este predio? 🤝`
    };
  }

  // 3. Patrimonio de Familia Inembargable (Ley 70/1931) vs Menores de edad
  const isPatrimonioFamiliaQuestion =
    /(?:patrimonio\s*de\s*familia|inembargable)/i.test(lower) &&
    /(?:qu[eé]\s+(?:sucede|pasa|implica|es|significa)|c[oó]mo\s+funciona|hijos|menores|icbf|cancelar|vender|juez|notar[ií]a|diferen)/i.test(lower);

  if (isPatrimonioFamiliaQuestion) {
    return {
      isQuestion: true,
      answerText:
        `👨‍👩‍👧‍👦 *Patrimonio de Familia Inembargable (Ley 70 de 1931):*\n\n` +
        `Es una figura jurídica que protege el techo del hogar contra embargos de acreedores (hasta 250 SMMLV) a favor de cónyuges e hijos:\n\n` +
        `⚠️ *¿Cuándo traba o impide la negociación?*\n` +
        `• *Si hay hijos menores de edad:* ¡NO se puede cancelar en notaría con una simple firma! Requiere trámite judicial o notarial con intervención y *concepto favorable previo del Defensor de Familia del ICBF*, demostrando que se subrogará en otro inmueble para no desproteger a los menores. Este trámite toma semanas o meses.\n` +
        `• *Si los hijos ya cumplieron 18 años:* Los padres pueden cancelarlo voluntariamente en notaría aportando los registros civiles que acrediten la mayoría de edad.\n\n` +
        `Es una anotación completamente distinta al Patrimonio Cultural/BIC. Si necesitas liquidar los costos de su levantamiento, con gusto te apoyo.`
    };
  }

  // 4. Compra con Crédito Hipotecario vs Contado vs Leasing
  const isCreditQuestion =
    /(?:compra\s*con\s*cr[eé]dito|cr[eé]dito\s*hipotecario|leasing\s*habitacional|cesi[oó]n\s*de\s*leasing)/i.test(lower) &&
    /(?:qu[eé]\s+(?:sucede|pasa|implica|gastos?|cuesta)|c[oó]mo\s+funciona|diferencia|ahorro|notar[ií]a|procedimiento)/i.test(lower);

  if (isCreditQuestion) {
    return {
      isQuestion: true,
      answerText:
        `💳 *Compra con Crédito vs Leasing vs Contado:* \n\n` +
        `• *De Contado:* El comprador paga el 50% de notaría (~0.27%), 1% de beneficencia y ~0.75% de registro ORIP.\n` +
        `• *Con Crédito Hipotecario:* El comprador asume además la constitución de hipoteca a favor del banco (~1.1% del valor financiado). El desembolso se realiza tras registrar la escritura en la ORIP.\n` +
        `• *Cesión de Leasing:* ¡Ahorro millonario! Al no haber cambio de dueño registral (el banco fiduciario sigue en matrícula), el comprador se ahorra el 1.75% en beneficencia y registro de compraventa.\n\n` +
        `Dime el valor del inmueble y te calculo los valores exactos para ambas partes 🤝✨`
    };
  }

  // 5. Embargo / Medida Cautelar (Art. 1521 Código Civil)
  const isEmbargoQuestion =
    /(?:embargo|medida\s*cautelar|embargado)/i.test(lower) &&
    /(?:qu[eé]\s+(?:sucede|pasa|implica|es)|se\s*puede\s*vender|notar[ií]a|promesa|negociar)/i.test(lower);

  if (isEmbargoQuestion) {
    return {
      isQuestion: true,
      answerText:
        `⛔ *Inmueble con Embargo Judicial (Art. 1521 Código Civil):*\n\n` +
        `Vender un predio embargado acarrea *objeto ilícito*. Ninguna notaría puede autorizar la escritura ni es jurídicamente válido firmar promesa de venta sin que el juzgado competente haya emitido el oficio de desembargo y este quede cancelado en la ORIP.\n\n` +
        `Para avanzar con seguridad, primero debe radicarse y levantarse el embargo en la Oficina de Registro.`
    };
  }

  // 6. ¿Quién paga los gastos notariales? (Costumbre y Ley en Colombia)
  const isQuienPagaQuestion =
    /(?:qui[eé]n\s+paga|le\s+corresponde\s+a\s+qui[eé]n|a\s+cargo\s+de\s+qui[eé]n)/i.test(lower) &&
    /(?:gastos\s+notariales|escrituraci[oó]n|notar[ií]a|beneficencia|registro|retenci[oó]n)/i.test(lower);

  if (isQuienPagaQuestion) {
    return {
      isQuestion: true,
      answerText:
        `⚖️ *¿Quién paga qué en la notaría y registro?* 🇨🇴\n\n` +
        `Por ley y costumbre comercial en Colombia:\n` +
        `• *50% Derechos Notariales:* Comprador 50% y Vendedor 50% (~0.27% cada uno).\n` +
        `• *Retención en la Fuente (1% o 2.5%):* La asume el *VENDEDOR* (si es persona natural; si es empresa, $0 en notaría).\n` +
        `• *Impuesto de Beneficencia (1%):* Lo asume el *COMPRADOR*.\n` +
        `• *Derechos de Registro ORIP (~0.75% a 0.92%):* Los asume el *COMPRADOR*.\n` +
        `• *Constitución de Hipoteca Bancaria:* La asume el *COMPRADOR*.\n` +
        `• *Cancelación de Hipoteca Previa:* La asume el *VENDEDOR*.\n\n` +
        `¿Deseas que te liquide los valores exactos para un inmueble? 🤝`
    };
  }

  // 7. Retención en la fuente (Estatuto Tributario Art. 398 y 401)
  const isRetencionQuestion =
    /(?:retenci[oó]n\s+en\s+la\s+fuente|retenci[oó]n\s+notar[ií]a|cu[aá]nto\s+es\s+la\s+retenci[oó]n)/i.test(lower) &&
    /(?:compraventa|inmueble|venta|porcentaje|cu[aá]nto|aplica)/i.test(lower);

  if (isRetencionQuestion) {
    return {
      isQuestion: true,
      answerText:
        `💰 *Retención en la Fuente en Compraventa de Inmuebles:* 🇨🇴\n\n` +
        `• *Persona Natural:* Paga el 1.0% sobre el precio de venta si el predio no supera 20.000 UVT ($1.006.360.000 COP en 2026). Si excede las 20.000 UVT, se aplica el 2.5% sobre el exceso.\n` +
        `• *Persona Jurídica (Empresas/Constructoras):* La notaría *NO le retiene nada ($0)*, ya que las sociedades aplican autorretención en su declaración periódica de renta.\n` +
        `• *¿Quién la paga?:* Siempre el *VENDEDOR* al momento de firmar la escritura pública.`
    };
  }

  // 8. Beneficencia y Registro
  const isBeneficenciaQuestion =
    /(?:beneficencia|impuesto\s+de\s+registro|registro\s+orip)/i.test(lower) &&
    /(?:qu[eé]\s+es|porcentaje|cu[aá]nto|qui[eé]n\s+paga|oficina\s+de\s+instrumentos)/i.test(lower);

  if (isBeneficenciaQuestion) {
    return {
      isQuestion: true,
      answerText:
        `📜 *Impuesto de Beneficencia y Derechos de Registro (ORIP):* 🇨🇴\n\n` +
        `Son los dos pagos requeridos para que la Oficina de Registro de Instrumentos Públicos asiente la nueva titularidad en el Certificado de Tradición:\n` +
        `• *Beneficencia (Gobernación / Bogotá):* 1.0% sobre el valor del negocio.\n` +
        `• *Derechos de Registro ORIP (SNR):* Entre 0.63% y 0.92% según la cuantía, más gastos de sistematización.\n` +
        `• *Total aproximado de registro:* ~1.67% a 1.95% a cargo del *COMPRADOR*.\n` +
        `_(En Cesión de Leasing Habitacional no aplica, logrando un ahorro millonario)_ ✨`
    };
  }

  // 9. Vivienda de Interés Social (VIS / VIP - Ley 1537)
  const isVisQuestion =
    /(?:vivienda\s+de\s+inter[eé]s\s+social|inmueble\s+vis|tarifa\s+vis)/i.test(lower) &&
    /(?:gastos|notar[ií]a|descuento|beneficio|registro|cu[aá]nto)/i.test(lower);

  if (isVisQuestion) {
    return {
      isQuestion: true,
      answerText:
        `🏡 *Gastos Notariales en Vivienda de Interés Social (VIS / VIP):* 🇨🇴\n\n` +
        `Por ley (Ley 1537 de 2012 y decretos de la SNR), los inmuebles VIS gozan de tarifas preferenciales:\n` +
        `• *Derechos Notariales:* Tienen un 50% de descuento sobre la tarifa ordinaria (~0.27% total repartido entre ambas partes).\n` +
        `• *Derechos de Registro ORIP:* Tarifa reducida subsidiada.\n` +
        `• Para compraventa nueva de constructora, las tarifas de escrituración de actos exentos o VIS se liquidan con topes preferenciales.`
    };
  }

  // 10. Usufructo (Constitución y Cancelación)
  const isUsufructoQuestion =
    /(?:usufructo)/i.test(lower) &&
    /(?:cancelaci[oó]n|constituci[oó]n|qu[eé]\s+es|gastos|notar[ií]a|c[oó]mo\s+funciona)/i.test(lower);

  if (isUsufructoQuestion) {
    return {
      isQuestion: true,
      answerText:
        `🌿 *Cancelación o Constitución de Usufructo:* 🇨🇴\n\n` +
        `• *Constitución:* Desmembra la propiedad en nuda propiedad y derecho de uso/goce. Paga derechos notariales y registro.\n` +
        `• *Cancelación (por fallecimiento o renuncia):* Se liquida como acto sin cuantía (~$107.814 de derechos notariales con IVA más copias y registro en ORIP), consolidando la plena propiedad en el nudo propietario.`
    };
  }

  return { isQuestion: false };
}

/**
 * Detecta si un mensaje solicita liquidación o cálculo de gastos notariales/escrituración,
 * o si el usuario indica que va para la notaría o va a firmar promesa.
 */
export function extractNotarialExpenseParams(text: string, senderId?: string): {
  found: boolean;
  params?: NotarialExpenseParams;
  needsMoreInfo?: boolean;
} {
  if (!text || typeof text !== 'string') return { found: false };

  const clean = text.trim();
  const lower = clean.toLowerCase();

  const keywords = [
    'gastos notariales', 'gasto notarial', 'gastos de escrituración', 'gastos escrituración',
    'gastos de escrituracion', 'escrituración', 'escrituracion', 'liquidar notaria',
    'liquidar notaría', 'costo notaria', 'costos notaria', 'cuánto vale la notaría',
    'cuanto vale la notaria', 'cuanto cobra la notaria', 'cuánto cobra la notaría',
    'cuanto se va en notaria', 'cuánto se va en notaría', 'gastos de registro',
    'firmar promesa', 'promesa de compraventa', 'promesa compraventa', 'voy para la notaría',
    'voy a la notaria', 'voy a notaria', 'voy para notaria', 'firmar escrituras', 'gastos notariale',
    'derechos notariales', 'liquidación notarial', 'impuesto de registro'
  ];

  const hasPending = senderId ? hasPendingNotarialSession(senderId) : false;
  const hasNotarialIntent = keywords.some(kw => lower.includes(kw));

  if (!hasNotarialIntent && !hasPending) {
    return { found: false };
  }

  // 1. Detección de Precio
  let precio = 0;
  const mMillones = clean.match(/(?:\$|\b)(\d+(?:[\.,]\d+)?)\s*(?:millones|millón|millon|m\b)/i);
  if (mMillones) {
    const rawNum = parseFloat(mMillones[1].replace(',', '.'));
    precio = rawNum * 1000000;
  } else {
    const mNum = clean.match(/(?:\$|\b)(\d{1,3}(?:\.\d{3}){2,3}|\d{7,11})\b/);
    if (mNum) {
      precio = parseInt(mNum[1].replace(/\./g, ''), 10);
    }
  }

  // Si no se proporcionó el valor numérico, pedir los 3 datos clave
  if (precio < 10000000) {
    return {
      found: true,
      needsMoreInfo: true
    };
  }

  // 2. Detección de Estado del Predio
  let estadoPredio: 'libre' | 'hipoteca' | 'leasing' = 'libre';
  if (/predio.*(?:leasing|locatario)|inmueble.*(?:leasing)|tiene\s+leasing/i.test(lower)) {
    estadoPredio = 'leasing';
  } else if (/predio.*(?:hipoteca|gravamen)|inmueble.*(?:hipoteca)|tiene\s+hipoteca|con\s+hipoteca|hipotecado/i.test(lower)) {
    estadoPredio = 'hipoteca';
  }

  // 3. Detección de Forma de Pago
  let formaPago: 'contado' | 'hipoteca' | 'leasing' = 'contado';
  if (/compra.*(?:leasing)|paga.*(?:leasing)|con\s+leasing\s+habitacional/i.test(lower)) {
    formaPago = 'leasing';
  } else if (/compra.*(?:cr[eé]dito|hipoteca|banco|pr[eé]stamo)|con\s+cr[eé]dito|con\s+hipoteca/i.test(lower)) {
    formaPago = 'hipoteca';
  } else if (/contado|recursos\s+propios|efectivo/i.test(lower)) {
    formaPago = 'contado';
  }

  // 4. Parámetros adicionales jurídicos
  const afectacionViviendaFamiliar = /afectaci[oó]n|vivienda\s+familiar/i.test(lower) && !/sin\s+afectaci[oó]n/i.test(lower);
  const patrimonioFamilia = /patrimonio\s+de\s+familia|inembargable/i.test(lower);
  const bienInteresCultural = /inter[eé]s\s+cultural|patrimonio\s+cultural|patrimonio\s+hist[oó]rico|bic\b/i.test(lower);
  const embargoMedidaCautelar = /embargo|embargado|medida\s+cautelar/i.test(lower);
  const vendedorEsPersonaJuridica = /persona\s+jur[ií]dica|empresa|sociedad|constructora|inmobiliaria\s+vende/i.test(lower);
  const esViviendaInteresSocial = /\bvis\b|inter[eé]s\s+social|\bvip\b/i.test(lower);

  return {
    found: true,
    needsMoreInfo: false,
    params: {
      precioVenta: precio,
      estadoPredio,
      formaPago,
      ciudad: 'Bogotá',
      vendedorEsPersonaJuridica,
      esViviendaInteresSocial,
      afectacionViviendaFamiliar,
      patrimonioFamilia,
      bienInteresCultural,
      embargoMedidaCautelar
    }
  };
}

export interface NotarialExecutionResult {
  isNotarialRequest: boolean;
  reportText?: string;
  calculatedResult?: NotarialExpenseResult;
  isEducationalAnswer?: boolean;
}

/**
 * Procesa la asistencia o liquidación de gastos notariales desde WhatsApp
 * gestionando respuestas explicativas breves o liquidaciones numéricas completas.
 */
export async function executeNotarialAssistanceFromWhatsApp(
  text: string,
  senderId: string,
  isPrivateDm: boolean = true
): Promise<NotarialExecutionResult> {
  // 1. Verificar si es una pregunta doctrinal o jurídica sobre figuras notariales
  const explanation = explainNotarialFigures(text);
  if (explanation.isQuestion && explanation.answerText) {
    return {
      isNotarialRequest: true,
      isEducationalAnswer: true,
      reportText: explanation.answerText
    };
  }

  // 2. Extraer parámetros de liquidación
  const detection = extractNotarialExpenseParams(text, senderId);
  if (!detection.found) {
    return { isNotarialRequest: false };
  }

  // CASO: Faltan datos (el usuario no dijo el valor o solo dijo que iba para la notaría)
  if (detection.needsMoreInfo || !detection.params) {
    setPendingNotarialSession(senderId);

    const promptText =
      `¡Con mucho gusto te liquido los gastos de notaría y registro al centavo! ⚖️🇨🇴\n\n` +
      `Para darte el desglose exacto de cuánto paga el comprador y cuánto el vendedor, por favor confírmame:\n` +
      `1️⃣ *Valor de la compraventa:* (Ej: 350 millones o el valor pactado).\n` +
      `2️⃣ *Estado del predio:* ¿Libre de gravámenes, con hipoteca activa o con leasing habitacional?\n` +
      `3️⃣ *Forma de pago:* ¿De contado, con crédito hipotecario o con leasing?\n\n` +
      `_(Si el predio tiene afectación a vivienda familiar, patrimonio de familia o es Bien de Interés Cultural BIC, me avisas para calcular la figura exacta)_ 🤝✨`;

    return {
      isNotarialRequest: true,
      reportText: promptText
    };
  }

  // CASO: Parámetros completos → Liquidar gastos notariales y de registro
  clearPendingNotarialSession(senderId);
  const calcResult = liquidarGastosNotariales(detection.params);

  return {
    isNotarialRequest: true,
    reportText: calcResult.reportText,
    calculatedResult: calcResult
  };
}

