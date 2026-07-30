import React, { useState } from 'react';
import { liquidarImpuestosVenta, VALOR_UVT_2026, TaxCalculationResult } from '../../../../server/_core/taxEngine';
import { trpc } from '../../lib/trpc';
import { 
  Calculator, 
  DollarSign, 
  Sparkles, 
  ShieldCheck, 
  HelpCircle, 
  X, 
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface TaxCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToChat?: (summaryText: string) => void;
}

export const TaxCalculatorModal: React.FC<TaxCalculatorModalProps> = ({
  isOpen,
  onClose,
  onSendToChat
}) => {
  const [precioVenta, setPrecioVenta] = useState<number>(600000000);
  const [costoFiscal, setCostoFiscal] = useState<number>(350000000);
  const [anosPosesion, setAnosPosesion] = useState<number>(4);
  const [esViviendaHabitacion, setEsViviendaHabitacion] = useState<boolean>(true);

  if (!isOpen) return null;

  const result: TaxCalculationResult = liquidarImpuestosVenta({
    precioVenta,
    costoFiscal,
    anosPosesion,
    esViviendaHabitacion
  });

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleShareToChat = () => {
    if (!onSendToChat) return;
    const text = `📊 *LIQUIDACIÓN TRIBUTARIA PREDIAL DIAN v17.6*\n` +
      `• *Precio de Venta:* ${formatCOP(result.precioVenta)}\n` +
      `• *Costo Fiscal:* ${formatCOP(result.costoFiscal)}\n` +
      `• *Tiempo de Posesión:* ${result.anosPosesion} años\n` +
      `• *Retención en la Fuente (${result.tarifaRetencionPorcentaje}%):* ${formatCOP(result.retencionFuente)}\n` +
      `• *Utilidad Bruta:* ${formatCOP(result.utilidadCalculada)}\n` +
      (result.exencionViviendaAplicada > 0 ? `• *Exención Vivienda Habitación (5.000 UVT):* -${formatCOP(result.exencionViviendaAplicada)}\n` : '') +
      `• *Impuesto Ganancia Ocasional (${result.tarifaGananciaOcasionalPorcentaje}%):* ${formatCOP(result.gananciaOcasional)}\n` +
      `👉 *Notas:* ${result.notas}`;
    
    onSendToChat(text);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-[#bf953f]/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* CABECERA CON ACCENTO DORADO */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border-b border-[#bf953f]/20 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#bf953f]/10 border border-[#bf953f]/30 flex items-center justify-center text-[#bf953f]">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Liquidación Tributaria Predial</h3>
                <span className="text-[10px] font-bold text-[#bf953f] bg-[#bf953f]/10 border border-[#bf953f]/20 px-2 py-0.5 rounded-full uppercase">
                  DIAN v17.6
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Estatuto Tributario Colombia | UVT 2026: <strong className="text-zinc-200">${VALOR_UVT_2026.toLocaleString('es-CO')}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CUERPO CON FORMULARIO E RESULTADOS */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* FORMULARIO DE ENTRADA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/40 border border-white/5 p-4 rounded-2xl">
            {/* Precio de Venta */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Precio de Venta ($ COP)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500 text-xs">$</span>
                <input
                  type="number"
                  value={precioVenta}
                  onChange={(e) => setPrecioVenta(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-7 pr-3 py-2 text-xs font-bold text-white focus:border-[#bf953f] outline-none"
                  placeholder="600000000"
                />
              </div>
            </div>

            {/* Costo Fiscal */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Costo Fiscal Ajustado ($ COP)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500 text-xs">$</span>
                <input
                  type="number"
                  value={costoFiscal}
                  onChange={(e) => setCostoFiscal(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-7 pr-3 py-2 text-xs font-bold text-white focus:border-[#bf953f] outline-none"
                  placeholder="350000000"
                />
              </div>
              <p className="text-[10px] text-zinc-500 italic">Precio compra + escrituración/obras</p>
            </div>

            {/* Años de Posesión */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Tiempo de Posesión (Años)</label>
              <input
                type="number"
                min="0"
                max="99"
                value={anosPosesion}
                onChange={(e) => setAnosPosesion(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-[#bf953f] outline-none"
              />
            </div>

            {/* ¿Es Vivienda de Habitación? */}
            <div className="space-y-1 flex flex-col justify-end">
              <label className="flex items-center gap-2.5 cursor-pointer bg-zinc-950 border border-white/10 p-2.5 rounded-xl hover:border-white/20 transition-colors">
                <input
                  type="checkbox"
                  checked={esViviendaHabitacion}
                  onChange={(e) => setEsViviendaHabitacion(e.target.checked)}
                  className="w-4 h-4 accent-[#bf953f] rounded cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Vivienda de Habitación</span>
                  <span className="text-[10px] text-zinc-400 block">Exención 5.000 UVT Art. 311-1</span>
                </div>
              </label>
            </div>
          </div>

          {/* DESGLOSE DE RESULTADOS TRIBUTARIOS */}
          <div className="space-y-4">
            {/* RETENCIÓN EN LA FUENTE (DORADO #bf953f) */}
            <div className="bg-[#bf953f]/10 border border-[#bf953f]/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[#bf953f] text-xs font-bold uppercase tracking-wider">
                  <FileText className="w-4 h-4" /> Retención en la Fuente ({result.tarifaRetencionPorcentaje}%)
                </div>
                <p className="text-xs text-zinc-300">
                  {result.esSupera20kUvt 
                    ? "Tarifa del 2.5% por superar 20.000 UVT en venta de inmueble (Ley Inversión Social)." 
                    : "Tarifa estándar del 1.0% sobre valor total de venta por escritura pública."}
                </p>
              </div>
              <div className="text-left sm:text-right flex-shrink-0">
                <p className="text-2xl font-black text-white">{formatCOP(result.retencionFuente)}</p>
                <span className="text-[10px] text-[#bf953f] font-semibold bg-[#bf953f]/10 px-2 py-0.5 rounded border border-[#bf953f]/20">
                  Retención Notarial
                </span>
              </div>
            </div>

            {/* GANANCIA OCASIONAL (CYAN #22d3ee) */}
            <div className="bg-[#22d3ee]/10 border border-[#22d3ee]/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[#22d3ee] text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" /> Impuesto a la Ganancia Ocasional ({result.tarifaGananciaOcasionalPorcentaje}%)
                </div>
                <p className="text-xs text-zinc-300">
                  Utilidad Bruta: <strong className="text-white">{formatCOP(result.utilidadCalculada)}</strong>
                  {result.exencionViviendaAplicada > 0 && (
                    <span className="block text-emerald-400 text-[11px] font-semibold mt-0.5">
                      ✓ Exención por Vivienda de Habitación: -{formatCOP(result.exencionViviendaAplicada)} (5.000 UVT)
                    </span>
                  )}
                </p>
              </div>
              <div className="text-left sm:text-right flex-shrink-0">
                <p className="text-2xl font-black text-white">{formatCOP(result.gananciaOcasional)}</p>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                  result.esRentaOrdinaria 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                    : 'bg-[#22d3ee]/20 text-[#22d3ee] border-[#22d3ee]/30'
                }`}>
                  {result.esRentaOrdinaria ? 'Renta Ordinaria Progresiva' : 'Tarifa Única 15% ET'}
                </span>
              </div>
            </div>

            {/* NOTAS Y EXPLICACIÓN DE LA DIAN */}
            <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#bf953f] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-300 leading-relaxed space-y-1">
                <p className="font-bold text-white">Dictamen Fiscal DIAN (Estatuto Tributario):</p>
                <p>{result.notas}</p>
              </div>
            </div>
          </div>
        </div>

        {/* PIE DE PÁGINA CON BOTÓN DE ENVIAR AL CHAT */}
        <div className="bg-black/50 border-t border-white/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-zinc-500 text-center sm:text-left">
            Calculado con UVT 2026 ($50.318 COP) | Normativa Art. 300 y 311-1 E.T.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors w-full sm:w-auto"
            >
              Cerrar
            </button>
            {onSendToChat && (
              <button
                onClick={handleShareToChat}
                className="bg-[#bf953f] hover:bg-[#a37d32] text-zinc-950 font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 w-full sm:w-auto"
              >
                Insertar en Chat JanIA <Sparkles className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
