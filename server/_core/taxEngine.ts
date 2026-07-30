/**
 * Motor Tributario de Inmuebles en Colombia — Normativa DIAN v17.6
 * Calcula la Retención en la Fuente por Venta y el Impuesto a la Ganancia Ocasional.
 */

export const VALOR_UVT_2026 = 50318;

export interface TaxCalculationParams {
  precioVenta: number;
  costoFiscal: number; // Precio de adquisición original + mejoras notariales/construcción
  anosPosesion: number;
  esViviendaHabitacion: boolean;
}

export interface TaxCalculationResult {
  valorUVT: number;
  precioVenta: number;
  costoFiscal: number;
  utilidadCalculada: number;
  anosPosesion: number;
  retencionFuente: number;
  tarifaRetencionPorcentaje: number;
  esSupera20kUvt: boolean;
  exencionViviendaAplicada: number;
  utilidadGravableGananciaOcasional: number;
  gananciaOcasional: number;
  tarifaGananciaOcasionalPorcentaje: number;
  esRentaOrdinaria: boolean;
  notas: string;
}

/**
 * Liquida los impuestos aplicables a la venta de bienes raíces en Colombia (Personas Naturales)
 */
export function liquidarImpuestosVenta(params: TaxCalculationParams): TaxCalculationResult {
  const precioVenta = Math.max(0, params.precioVenta || 0);
  const costoFiscal = Math.max(0, params.costoFiscal || 0);
  const anosPosesion = Math.max(0, params.anosPosesion || 0);

  // 1. Cálculo de Retención en la Fuente (1% general, 2.5% si supera 20.000 UVT)
  const limiteUvtRetencion = 20000 * VALOR_UVT_2026; // 1.006.360.000 COP
  const esSupera20kUvt = precioVenta > limiteUvtRetencion;
  const tarifaRetencion = esSupera20kUvt ? 0.025 : 0.01;
  const retencionFuente = Math.round(precioVenta * tarifaRetencion);

  // 2. Cálculo de Ganancia Ocasional
  const utilidadOriginal = Math.max(0, precioVenta - costoFiscal);
  let utilidadGravable = utilidadOriginal;
  let exencionViviendaAplicada = 0;
  let gananciaOcasional = 0;
  let esRentaOrdinaria = false;
  let tarifaGananciaOcasionalPorcentaje = 15;
  let notas = "";

  if (anosPosesion < 2) {
    esRentaOrdinaria = true;
    tarifaGananciaOcasionalPorcentaje = 0;
    gananciaOcasional = 0;
    notas = "Al tener menos de 2 años de posesión, la utilidad califica como Renta Líquida Ordinaria y se suma a la cédula general de la persona natural (Tarifa progresiva DIAN del 0% al 39%).";
  } else {
    // Aplicar exención de vivienda de habitación (Primeras 5.000 UVT de utilidad exentas, Art. 311-1 E.T.)
    if (params.esViviendaHabitacion) {
      const exencionMaxima = 5000 * VALOR_UVT_2026; // 251.590.000 COP
      exencionViviendaAplicada = Math.min(utilidadOriginal, exencionMaxima);
      utilidadGravable = Math.max(0, utilidadOriginal - exencionViviendaAplicada);
      notas = `Se aplicó el beneficio de exención por vivienda de habitación (Hasta 5.000 UVT = $${exencionMaxima.toLocaleString('es-CO')} de utilidad exentas, Art. 311-1 E.T. abonando el producto a AFC/nueva vivienda). `;
    }
    // Tarifa única del 15% según Estatuto Tributario vigente (Art. 300 y ss. E.T.)
    gananciaOcasional = Math.round(utilidadGravable * 0.15);
    notas += "Aplica tarifa única del 15% por Ganancia Ocasional sobre la utilidad neta gravable.";
  }

  return {
    valorUVT: VALOR_UVT_2026,
    precioVenta,
    costoFiscal,
    utilidadCalculada: utilidadOriginal,
    anosPosesion,
    retencionFuente,
    tarifaRetencionPorcentaje: tarifaRetencion * 100,
    esSupera20kUvt,
    exencionViviendaAplicada,
    utilidadGravableGananciaOcasional: utilidadGravable,
    gananciaOcasional,
    tarifaGananciaOcasionalPorcentaje,
    esRentaOrdinaria,
    notas: notas.trim()
  };
}
