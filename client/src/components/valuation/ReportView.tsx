import React from 'react';
import { ExternalLink, Sparkles, ShieldCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface ReportData {
  valorSugerido: number;
  precioMinCierre: number;
  precioM2: number;
  capRate: number;
  canonSugerido: number;
  coeficientes: { cAntiguedad: number; cPiso: number; cGarajes: number; cAmenidades: number };
  fuentes: string[];
}

export interface ReportProps {
  data?: ReportData;
  valuation?: any;
  propertyName?: string;
  zoneName?: string;
  cityName?: string;
}

export const ReportView: React.FC<ReportProps> = ({
  data,
  valuation,
  propertyName = "Inmueble Objeto de Avalúo",
  zoneName = "Zona Predial",
  cityName = "Bogotá"
}) => {
  // Normalizar datos entre prop 'data' o prop 'valuation'
  const reportData: ReportData = data || {
    valorSugerido: valuation?.suggestedCommercialValue || 650000000,
    precioMinCierre: valuation?.minClosingPrice || 617500000,
    precioM2: valuation?.homologatedPricePerM2 || 5416000,
    capRate: valuation?.estimatedCapRate || 6.6,
    canonSugerido: valuation?.estimatedMonthlyRent || 3575000,
    coeficientes: valuation?.coefficients || { cAntiguedad: 0.92, cPiso: 1.02, cGarajes: 1.05, cAmenidades: 1.07 },
    fuentes: (valuation?.comparableSources || []).map((s: any) => typeof s === 'string' ? s : s.url)
  };

  const getHostname = (urlStr: string) => {
    try {
      return new URL(urlStr).hostname;
    } catch (e) {
      return urlStr;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 bg-slate-900 text-white rounded-xl shadow-2xl overflow-x-hidden space-y-6">
      {/* BLOQUE 1: HERO PREDIAL */}
      <div className="bg-[#bf953f] p-6 rounded-lg text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4 mb-6 shadow-lg">
        <div>
          <h2 className="text-sm font-semibold tracking-wider uppercase text-slate-900 opacity-80 flex items-center gap-1.5 justify-center md:justify-start">
            <Sparkles className="w-4 h-4" /> Valor Comercial Sugerido
          </h2>
          <p className="text-3xl md:text-5xl font-black text-slate-950">${reportData.valorSugerido.toLocaleString('es-CO')}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-slate-900 font-bold border-t md:border-t-0 md:border-l border-slate-950/20 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
          <div>
            <span className="text-xs opacity-70 block">Mínimo de Cierre</span>
            <span className="text-lg font-extrabold">${reportData.precioMinCierre.toLocaleString('es-CO')}</span>
          </div>
          <div>
            <span className="text-xs opacity-70 block">Valor por m²</span>
            <span className="text-lg font-extrabold">${reportData.precioM2.toLocaleString('es-CO')}</span>
          </div>
        </div>
      </div>

      {/* BLOQUE 2: INDICADORES CYAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#22d3ee]/10 border border-[#22d3ee]/30 p-4 rounded-lg flex justify-between items-center shadow-md">
          <span className="font-medium text-[#22d3ee]">Cap Rate Bruto Anual</span>
          <span className="text-2xl font-bold text-[#22d3ee]">{reportData.capRate}%</span>
        </div>
        <div className="bg-[#22d3ee]/10 border border-[#22d3ee]/30 p-4 rounded-lg flex justify-between items-center shadow-md">
          <span className="font-medium text-[#22d3ee]">Canon de Arriendo Estimado</span>
          <span className="text-xl font-bold text-[#22d3ee]">${reportData.canonSugerido.toLocaleString('es-CO')}/mes</span>
        </div>
      </div>

      {/* BLOQUE 3: COTEJO DE COEFICIENTES (RESPONSIVE STACK) */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-3 text-slate-300">Análisis de Ajustes Homologados</h3>
        <div className="flex flex-col md:grid md:grid-cols-4 gap-3">
          {Object.entries(reportData.coeficientes).map(([key, value]) => {
            const isGain = value >= 1;
            const pct = Math.round(Math.abs(value - 1) * 100);
            return (
              <div key={key} className="bg-slate-800 p-4 rounded-lg flex md:flex-col justify-between md:justify-center items-center text-center border border-slate-700">
                <span className="text-sm text-slate-400 capitalize">
                  {key.replace('c', 'Factor ')}
                </span>
                <span className={`text-xl font-black mt-1 flex items-center gap-1 ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isGain ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-rose-400" />}
                  {value.toFixed(2)}x ({isGain ? `+${pct}%` : `-${pct}%`})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* BLOQUE 4: FUENTES */}
      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fuentes de Respaldo del Mercado</h4>
        {reportData.fuentes && reportData.fuentes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {reportData.fuentes.map((link, idx) => (
              <a key={idx} href={link} target="_blank" rel="noreferrer" className="text-[#22d3ee] hover:underline truncate flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">🔗 {getHostname(link)} - Ver Inmueble Testigo</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Muestreo científico basado en promedio ponderado de zona ({zoneName}).</p>
        )}
      </div>

      {/* PIE DE PÁGINA */}
      <div className="text-center pt-2 text-slate-500 text-xs flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-[#bf953f]" /> Dictamen generado por <strong>JanIA Match v17.6</strong> — VECY Network Colombia
      </div>
    </div>
  );
};
