import React, { useState } from 'react';
import { BarChart3, Download, Calendar, TrendingUp, Home, FileSearch, Sparkles, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';

export default function AdminReports() {
  const [dateRange, setDateRange] = useState('month');

  const { data: stats, isLoading } = trpc.janIA.getReportStats.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const fmt = (n: number | undefined) => (n ?? 0).toLocaleString('es-CO');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Reportes y Análisis</h2>
          <p className="text-zinc-500">Dashboard de métricas en tiempo real · Datos directos de la base de datos</p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-black border border-white/10 text-white rounded-md text-sm"
          >
            <option value="week">Esta Semana</option>
            <option value="month">Este Mes</option>
            <option value="quarter">Este Trimestre</option>
            <option value="year">Este Año</option>
          </select>
          <Button className="bg-zinc-900 hover:bg-zinc-800 text-white flex items-center gap-2 text-sm border border-white/10">
            <Download className="w-4 h-4" />
            Descargar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#bf953f]/30 border-t-[#bf953f] animate-spin" />
          <p className="text-zinc-500 text-sm">Cargando estadísticas reales...</p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Propiedades */}
            <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-700/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-blue-300 font-semibold text-sm">Inmuebles</h3>
                <Home className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">{fmt(stats?.properties.total)}</p>
              <div className="space-y-1 text-xs text-blue-200">
                <p>Activos: <span className="font-bold text-blue-300">{fmt(stats?.properties.active)}</span></p>
                <p>Inactivos: <span className="font-bold text-zinc-400">{fmt((stats?.properties.total ?? 0) - (stats?.properties.active ?? 0))}</span></p>
              </div>
            </div>

            {/* Requerimientos */}
            <div className="bg-gradient-to-br from-emerald-900/20 to-black border border-emerald-700/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-emerald-300 font-semibold text-sm">Requerimientos</h3>
                <FileSearch className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">{fmt(stats?.requirements.total)}</p>
              <div className="space-y-1 text-xs text-emerald-200">
                <p>Activos: <span className="font-bold text-emerald-300">{fmt(stats?.requirements.active)}</span></p>
                <p>Cerrados: <span className="font-bold text-zinc-400">{fmt((stats?.requirements.total ?? 0) - (stats?.requirements.active ?? 0))}</span></p>
              </div>
            </div>

            {/* Coincidencias */}
            <div className="bg-gradient-to-br from-[#bf953f]/20 to-black border border-[#bf953f]/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#bf953f] font-semibold text-sm">Coincidencias</h3>
                <Sparkles className="w-5 h-5 text-[#bf953f]" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">{fmt(stats?.matches.total)}</p>
              <div className="space-y-1 text-xs text-[#bf953f]/70">
                <p>Matches detectados por JanIA</p>
                <p className="text-zinc-500">Registrados en la base de datos</p>
              </div>
            </div>

            {/* Conversaciones */}
            <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-700/30 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-purple-300 font-semibold text-sm">Conversaciones</h3>
                <MessageSquare className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">{fmt(stats?.conversations.total)}</p>
              <div className="space-y-1 text-xs text-purple-200">
                <p>Total de sesiones registradas</p>
                <p className="text-zinc-500">Web + WhatsApp</p>
              </div>
            </div>
          </div>

          {/* Tendencia Mensual */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Propiedades por mes */}
            <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Inmuebles Captados por Mes
              </h3>
              {(stats?.monthlyProps ?? []).length === 0 ? (
                <p className="text-zinc-500 text-sm">Sin datos para mostrar.</p>
              ) : (
                <div className="space-y-3">
                  {(stats?.monthlyProps ?? []).map((row, i) => {
                    const max = Math.max(...(stats?.monthlyProps ?? []).map(r => r.total), 1);
                    const pct = Math.round((row.total / max) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-zinc-400 w-20 shrink-0">{row.mes}</span>
                        <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-blue-300 w-8 text-right">{row.total}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Requerimientos por mes */}
            <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Requerimientos Captados por Mes
              </h3>
              {(stats?.monthlyReqs ?? []).length === 0 ? (
                <p className="text-zinc-500 text-sm">Sin datos para mostrar.</p>
              ) : (
                <div className="space-y-3">
                  {(stats?.monthlyReqs ?? []).map((row, i) => {
                    const max = Math.max(...(stats?.monthlyReqs ?? []).map(r => r.total), 1);
                    const pct = Math.round((row.total / max) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-zinc-400 w-20 shrink-0">{row.mes}</span>
                        <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-emerald-300 w-8 text-right">{row.total}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-400" />
              Resumen del Sistema
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-zinc-500 text-xs mb-1">Total inmuebles en DB</p>
                <p className="font-bold text-white">{fmt(stats?.properties.total)}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs mb-1">Total requerimientos en DB</p>
                <p className="font-bold text-white">{fmt(stats?.requirements.total)}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs mb-1">Matches detectados</p>
                <p className="font-bold text-[#bf953f]">{fmt(stats?.matches.total)}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs mb-1">Conversaciones totales</p>
                <p className="font-bold text-white">{fmt(stats?.conversations.total)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
