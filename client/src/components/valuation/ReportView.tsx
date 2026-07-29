import React from 'react';
import { ValuationResult } from '../../../../server/_core/valuation';
import { 
  Building2, 
  ExternalLink, 
  Award, 
  DollarSign, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  Sparkles, 
  MapPin, 
  ShieldCheck,
  Calculator,
  Layers,
  FileCheck
} from 'lucide-react';

interface ReportViewProps {
  valuation: ValuationResult;
  propertyName?: string;
  zoneName?: string;
  cityName?: string;
}

export const ReportView: React.FC<ReportViewProps> = ({
  valuation,
  propertyName = "Inmueble Objeto de Avalúo",
  zoneName = "Zona Predial",
  cityName = "Bogotá"
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  const factorsList = [
    valuation.coefficients.ageFactor,
    valuation.coefficients.floorFactor,
    valuation.coefficients.garageFactor,
    valuation.coefficients.amenitiesFactor
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 text-zinc-100 font-sans p-2 sm:p-4">
      {/* HEADER DEL REPORTE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/80 border border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-[#bf953f]/10 text-[#bf953f] border border-[#bf953f]/20 text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Reporte Científico ACM v17.6
            </span>
            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {zoneName}, {cityName}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            {propertyName}
          </h2>
          <p className="text-xs text-zinc-400">
            Área Total Evaluada: <strong className="text-zinc-200">{valuation.totalAreaM2} m²</strong> | Promedio Base Zona: <strong className="text-zinc-200">{formatCurrency(valuation.baseZonePricePerM2)}/m²</strong>
          </p>
        </div>

        <div className="text-left sm:text-right flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
          <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Fecha del Análisis</p>
          <p className="text-xs text-zinc-300 font-medium">
            {new Date(valuation.generatedAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* BLOQUE 1: TARJETA DE IDENTIDAD PREDIAL (HERO - FONDO DORADO #bf953f / SLATE) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#bf953f]/20 via-zinc-900 to-zinc-950 border border-[#bf953f]/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#bf953f]/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#bf953f]" />
              <span className="text-xs uppercase tracking-widest font-black text-[#bf953f]">
                Valor Comercial Sugerido de Mercado
              </span>
            </div>
            
            <div className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">
              {formatCurrency(valuation.suggestedCommercialValue)}
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <div className="bg-black/40 border border-[#bf953f]/30 px-3.5 py-2 rounded-xl">
                <p className="text-[10px] text-zinc-400 uppercase font-semibold">Valor Final Homologado / m²</p>
                <p className="text-sm sm:text-base font-bold text-[#bf953f]">
                  {formatCurrency(valuation.homologatedPricePerM2)} <span className="text-xs text-zinc-400 font-normal">/m²</span>
                </p>
              </div>

              <div className="bg-black/40 border border-white/10 px-3.5 py-2 rounded-xl">
                <p className="text-[10px] text-zinc-400 uppercase font-semibold">Precio Mínimo de Cierre (-5%)</p>
                <p className="text-sm sm:text-base font-bold text-emerald-400">
                  {formatCurrency(valuation.minClosingPrice)}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-black/50 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium">Coeficiente Total Homologado:</span>
              <span className={`text-sm font-bold px-2.5 py-0.5 rounded-lg ${
                valuation.totalHomologationFactor >= 1.0 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {(valuation.totalHomologationFactor * 100).toFixed(1)}% ({valuation.totalHomologationFactor >= 1.0 ? '+' : ''}{((valuation.totalHomologationFactor - 1) * 100).toFixed(1)}%)
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 italic leading-relaxed">
              El valor predial ha sido ajustado científicamente aplicando matrices de depreciación predial, elevación de piso, parqueaderos y amenidades del conjunto.
            </p>
          </div>
        </div>
      </div>

      {/* BLOQUE 2: INDICADORES CLAVE DE RENDIMIENTO (FONDO CYAN #22d3ee DE BAJA OPACIDAD) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Cap Rate Estimado */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-5 backdrop-blur-xl flex items-center justify-between gap-4 shadow-lg hover:border-cyan-500/50 transition-all">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Percent className="w-4 h-4" /> Cap Rate Estimado
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white">
              {valuation.estimatedCapRate}% <span className="text-xs text-cyan-300 font-normal">anual</span>
            </p>
            <p className="text-[11px] text-zinc-400">
              Rentabilidad porcentual anual estimada sobre el valor comercial.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 flex-shrink-0">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        {/* Canon de Arriendo Estimado */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-5 backdrop-blur-xl flex items-center justify-between gap-4 shadow-lg hover:border-cyan-500/50 transition-all">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <DollarSign className="w-4 h-4" /> Canon de Arriendo Estimado
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white">
              {formatCurrency(valuation.estimatedMonthlyRent)} <span className="text-xs text-cyan-300 font-normal">/mes</span>
            </p>
            <p className="text-[11px] text-zinc-400">
              Canon mensual sugerido de renta con administración incluida.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 flex-shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* BLOQUE 3: TABLA DE COTEJO DE HOMOLOGACIÓN (RESPONSIVE STACK) */}
      <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#bf953f]" /> Tabla de Cotejo y Coeficientes de Homologación
          </h3>
          <span className="text-xs text-zinc-400 hidden sm:inline">Matrices Prediales v17.6</span>
        </div>

        {/* MODO ESCRITORIO (md:block) */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-zinc-400 uppercase font-semibold text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Factor Ponderado</th>
                <th className="py-3 px-4">Efecto</th>
                <th className="py-3 px-4">Coeficiente</th>
                <th className="py-3 px-4">Variación</th>
                <th className="py-3 px-4">Justificación Predial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-200">
              {factorsList.map((factor, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-bold text-white">{factor.name}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      factor.effect === 'PREMIO'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : factor.effect === 'CASTIGO'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                    }`}>
                      {factor.effect === 'PREMIO' && <ArrowUpRight className="w-3 h-3" />}
                      {factor.effect === 'CASTIGO' && <ArrowDownRight className="w-3 h-3" />}
                      {factor.effect === 'NEUTRO' && <Minus className="w-3 h-3" />}
                      {factor.effect}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-zinc-300">{factor.coefficient.toFixed(2)}</td>
                  <td className={`py-3 px-4 font-bold ${
                    factor.effect === 'PREMIO' ? 'text-emerald-400' : factor.effect === 'CASTIGO' ? 'text-rose-400' : 'text-zinc-400'
                  }`}>
                    {factor.percentageChange}
                  </td>
                  <td className="py-3 px-4 text-zinc-300 italic">{factor.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MODO MÓVIL (grid grid-cols-1 gap-3 md:hidden - RESPONSIVE STACK) */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {factorsList.map((factor, idx) => (
            <div key={idx} className="bg-zinc-950/70 border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white">{factor.name}</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  factor.effect === 'PREMIO'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : factor.effect === 'CASTIGO'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                }`}>
                  {factor.effect === 'PREMIO' && <ArrowUpRight className="w-3 h-3 text-emerald-400" />}
                  {factor.effect === 'CASTIGO' && <ArrowDownRight className="w-3 h-3 text-rose-400" />}
                  {factor.effect} ({factor.percentageChange})
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-white/5">
                <span>Coeficiente: <strong className="text-white font-mono">{factor.coefficient.toFixed(2)}</strong></span>
                <span className="italic text-right text-[11px] text-zinc-300 max-w-[200px] truncate">{factor.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BLOQUE 4: FUENTES DE RESPALDO INMOBILIARIO (INVESTIGACIÓN WEB EN VIVO) */}
      <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" /> Fuentes de Respaldo Inmobiliario (Muestreo de Mercado)
          </h3>
          <span className="text-xs text-zinc-400">{valuation.comparableSources.length} comparables encontrados</span>
        </div>

        {valuation.comparableSources.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {valuation.comparableSources.map((source, idx) => (
              <div key={idx} className="bg-zinc-950/70 border border-white/10 hover:border-cyan-500/40 rounded-2xl p-4 space-y-2 transition-all group">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                    {source.name}
                  </h4>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors flex-shrink-0"
                    title="Ver publicación original"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-white/5">
                  <span>Precio: <strong className="text-white">{formatCurrency(source.price)}</strong></span>
                  <span>Área: <strong className="text-zinc-200">{source.area} m²</strong></span>
                  <span>$/m²: <strong className="text-cyan-400">{formatCurrency(Math.round(source.price / (source.area || 1)))}</strong></span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-950/40 border border-dashed border-white/10 rounded-2xl p-6 text-center text-zinc-400 text-xs space-y-1">
            <FileCheck className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
            <p className="font-semibold text-zinc-300">Muestreo basado en Promedio Ponderado de Zona ({zoneName})</p>
            <p className="text-[11px] text-zinc-500">
              No hay enlaces directos adjuntos a esta muestra, el cálculo se ejecutó utilizando los promedios de avalúos cadastrales e inmobiliarios vigentes en el sector.
            </p>
          </div>
        )}
      </div>

      {/* PIE DE PÁGINA Y NOTA LEGAL */}
      <div className="text-center pt-2 pb-4 space-y-1 text-zinc-500 text-[11px]">
        <p className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#bf953f]" /> Dictamen generado autónomamente por <strong>JanIA Match v17.6</strong> — VECY Network Colombia
        </p>
        <p>Este informe de homologación es una herramienta científica de orientación comercial y tasación para corretaje inmobiliario.</p>
      </div>
    </div>
  );
};
