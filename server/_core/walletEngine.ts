/**
 * Motor de Aspersión Financiera y Monedero VECY — v17.7
 * Gestiona el reparto de comisiones (35% / 35% / 15% / 15%), Incentivos Acumulables
 * y el Bono de Descuento de Gastos Notariales para el Comprador Directo.
 */

export interface PoolAgenteBolsa {
  brokerId: string;
  puntosPorcentaje: number; // Porcentaje relativo atribuido en la bolsa (0-100)
}

export interface LiquidacionMatrizVecyParams {
  valorVentaInmueble: number;       // Ej: 1.000.000.000 COP
  brokerVendedorId: string;
  brokerCompradorId: string | null; // null si el comprador es DIRECTO
  poolBolsaAgentes: PoolAgenteBolsa[]; // Participantes en la bolsa colaborativa
}

export interface DispersionBrokerItem {
  role: "AGENTE_VENDEDOR" | "AGENTE_COMPRADOR" | "VIRALIZADOR_BOLSA";
  brokerId: string;
  pagoBase35COP?: number;
  bonoBolsaAcumuladoCOP?: number;
  totalRecibidoCOP: number;
  porcentajeComisionTotal: number;
}

export interface LiquidacionMaestraResult {
  valorVentaInmuebleCOP: number;
  comisionTotalCapturadaCOP: number;  // 3% sobre valor de venta
  fondoPuntaVendedorCOP: number;       // 35%
  fondoPuntaCompradorCOP: number;      // 35%
  ingresoPlataformaVecyCOP: number;    // 15%
  fondoBolsaColaborativaCOP: number;   // 15%
  esCompradorDirecto: boolean;
  bonoDescuentoCompradorDirectoCOP: number; // 35% regalado al comprador directo para notarías
  dispersionBrokers: DispersionBrokerItem[];
  generatedAt: string;
}

/**
 * Ejecuta la liquidación financiera maestra VECY (35% / 35% / 15% / 15%)
 */
export function ejecutarLiquidacionMaestraVecy(params: LiquidacionMatrizVecyParams): LiquidacionMaestraResult {
  const valorVenta = Math.max(0, params.valorVentaInmueble || 0);
  const comisionTotal3Porc = valorVenta * 0.03; // 3% comisión sobre venta

  const fondoPuntaVendedor = comisionTotal3Porc * 0.35; // 35%
  const fondoPuntaComprador = comisionTotal3Porc * 0.35; // 35%
  const fondoPlataformaVecy = comisionTotal3Porc * 0.15; // 15%
  const fondoBolsaColaborativa = comisionTotal3Porc * 0.15; // 15%

  const liquidacionFinal: DispersionBrokerItem[] = [];
  let bonoDescuentoCompradorDirecto = 0;
  const esCompradorDirecto = !params.brokerCompradorId;

  // 1. Suma total de puntos otorgados en la Bolsa Colaborativa
  const sumaPuntosBolsa = params.poolBolsaAgentes.reduce((acc, curr) => acc + (curr.puntosPorcentaje || 0), 0);

  // 2. Liquidación Agente Vendedor (35% Base + Puntos Acumulados de la Bolsa)
  const puntosVendedorBolsa = params.poolBolsaAgentes.find(a => a.brokerId === params.brokerVendedorId)?.puntosPorcentaje || 0;
  const participacionBolsaVendedor = sumaPuntosBolsa > 0 ? (puntosVendedorBolsa / 100) * fondoBolsaColaborativa : 0;
  const totalVendedor = fondoPuntaVendedor + participacionBolsaVendedor;

  liquidacionFinal.push({
    role: "AGENTE_VENDEDOR",
    brokerId: params.brokerVendedorId,
    pagoBase35COP: fondoPuntaVendedor,
    bonoBolsaAcumuladoCOP: participacionBolsaVendedor,
    totalRecibidoCOP: totalVendedor,
    porcentajeComisionTotal: comisionTotal3Porc > 0 ? Number(((totalVendedor / comisionTotal3Porc) * 100).toFixed(2)) : 0
  });

  // 3. Liquidación Punta Demanda (Agente Comprador vs. Comprador Directo)
  if (params.brokerCompradorId) {
    const puntosCompradorBolsa = params.poolBolsaAgentes.find(a => a.brokerId === params.brokerCompradorId)?.puntosPorcentaje || 0;
    const participacionBolsaComprador = sumaPuntosBolsa > 0 ? (puntosCompradorBolsa / 100) * fondoBolsaColaborativa : 0;
    const totalComprador = fondoPuntaComprador + participacionBolsaComprador;

    liquidacionFinal.push({
      role: "AGENTE_COMPRADOR",
      brokerId: params.brokerCompradorId,
      pagoBase35COP: fondoPuntaComprador,
      bonoBolsaAcumuladoCOP: participacionBolsaComprador,
      totalRecibidoCOP: totalComprador,
      porcentajeComisionTotal: comisionTotal3Porc > 0 ? Number(((totalComprador / comisionTotal3Porc) * 100).toFixed(2)) : 0
    });
  } else {
    // ¡Comprador Directo!: El 35% de la Punta Demanda se transforma en Bono Sorpresa para Gastos Notariales
    bonoDescuentoCompradorDirecto = fondoPuntaComprador;
  }

  // 4. Agregar a los viralizadores de la bolsa que no son ni vendedor ni comprador
  params.poolBolsaAgentes.forEach(agente => {
    if (agente.brokerId !== params.brokerVendedorId && agente.brokerId !== params.brokerCompradorId) {
      const dineroBolsa = sumaPuntosBolsa > 0 ? (agente.puntosPorcentaje / 100) * fondoBolsaColaborativa : 0;
      if (dineroBolsa > 0) {
        liquidacionFinal.push({
          role: "VIRALIZADOR_BOLSA",
          brokerId: agente.brokerId,
          bonoBolsaAcumuladoCOP: dineroBolsa,
          totalRecibidoCOP: dineroBolsa,
          porcentajeComisionTotal: comisionTotal3Porc > 0 ? Number(((dineroBolsa / comisionTotal3Porc) * 100).toFixed(2)) : 0
        });
      }
    }
  });

  return {
    valorVentaInmuebleCOP: valorVenta,
    comisionTotalCapturadaCOP: comisionTotal3Porc,
    fondoPuntaVendedorCOP: fondoPuntaVendedor,
    fondoPuntaCompradorCOP: fondoPuntaComprador,
    ingresoPlataformaVecyCOP: fondoPlataformaVecy,
    fondoBolsaColaborativaCOP: fondoBolsaColaborativa,
    esCompradorDirecto,
    bonoDescuentoCompradorDirectoCOP: bonoDescuentoCompradorDirecto,
    dispersionBrokers: liquidacionFinal,
    generatedAt: new Date().toISOString()
  };
}
