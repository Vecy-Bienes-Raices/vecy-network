import React, { useState } from 'react';
import { BarChart3, Download, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminReports() {
  const [dateRange, setDateRange] = useState('month');

  const reportData = {
    properties: {
      total: 45,
      active: 38,
      pending: 7,
      sold: 12,
    },
    leads: {
      total: 156,
      new: 32,
      contacted: 89,
      qualified: 35,
      converted: 12,
    },
    conversations: {
      total: 234,
      avgDuration: '12 min',
      avgMessages: 8,
      positiveRate: '78%',
    },
    revenue: {
      estimated: '$2,450,000',
      commissions: '$245,000',
      avgDealSize: '$204,166',
    },
  };

  const monthlyData = [
    { month: 'Enero', properties: 8, leads: 24, conversions: 2 },
    { month: 'Febrero', properties: 12, leads: 38, conversions: 4 },
    { month: 'Marzo', properties: 15, leads: 42, conversions: 6 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Reportes y Análisis</h2>
          <p className="text-zinc-500">Dashboard de métricas y desempeño</p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-black border border-white/10 text-white rounded-md"
          >
            <option value="week">Esta Semana</option>
            <option value="month">Este Mes</option>
            <option value="quarter">Este Trimestre</option>
            <option value="year">Este Año</option>
          </select>
          <Button className="bg-zinc-900 hover:bg-zinc-900 text-white flex items-center gap-2">
            <Download className="w-4 h-4" />
            Descargar
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Properties */}
        <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-700/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-blue-300 font-semibold">Propiedades</h3>
            <BarChart3 className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-2">{reportData.properties.total}</p>
          <div className="space-y-1 text-xs text-blue-200">
            <p>Activas: {reportData.properties.active}</p>
            <p>Vendidas: {reportData.properties.sold}</p>
          </div>
        </div>

        {/* Leads */}
        <div className="bg-gradient-to-br from-green-900/20 to-black border border-green-700/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-green-300 font-semibold">Leads</h3>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-2">{reportData.leads.total}</p>
          <div className="space-y-1 text-xs text-green-200">
            <p>Conversión: {Math.round((reportData.leads.converted / reportData.leads.total) * 100)}%</p>
            <p>Nuevos: {reportData.leads.new}</p>
          </div>
        </div>

        {/* Conversations */}
        <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-700/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-purple-300 font-semibold">Conversaciones</h3>
            <BarChart3 className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-2">{reportData.conversations.total}</p>
          <div className="space-y-1 text-xs text-purple-200">
            <p>Duración Promedio: {reportData.conversations.avgDuration}</p>
            <p>Sentimiento Positivo: {reportData.conversations.positiveRate}</p>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-gradient-to-br from-black/10 to-black border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-500 font-semibold">Ingresos</h3>
            <TrendingUp className="w-5 h-5 text-zinc-500" />
          </div>
          <p className="text-3xl font-bold text-white mb-2">{reportData.revenue.estimated}</p>
          <div className="space-y-1 text-xs text-zinc-500">
            <p>Comisiones: {reportData.revenue.commissions}</p>
            <p>Promedio por Venta: {reportData.revenue.avgDealSize}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <div className="bg-gradient-to-br from-black/10 to-black border border-white/10 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-6">Tendencias Mensuales</h3>
          <div className="space-y-4">
            {monthlyData.map((data, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-500">{data.month}</span>
                  <span className="text-zinc-500 font-semibold">{data.properties} propiedades</span>
                </div>
                <div className="w-full bg-black rounded-full h-2 overflow-hidden border border-white/10">
                  <div
                    className="bg-gradient-to-r from-black/10 to-black/20 h-full"
                    style={{ width: `${(data.properties / 15) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Funnel */}
        <div className="bg-gradient-to-br from-black/10 to-black border border-white/10 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-6">Embudo de Conversión</h3>
          <div className="space-y-3">
            {[
              { label: 'Leads Nuevos', value: reportData.leads.new, color: 'bg-blue-600' },
              { label: 'Contactados', value: reportData.leads.contacted, color: 'bg-yellow-600' },
              { label: 'Calificados', value: reportData.leads.qualified, color: 'bg-green-600' },
              { label: 'Convertidos', value: reportData.leads.converted, color: 'bg-zinc-900' },
            ].map((item, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-500">{item.label}</span>
                  <span className="text-white font-semibold">{item.value}</span>
                </div>
                <div className="w-full bg-black rounded-full h-3 overflow-hidden border border-white/10">
                  <div
                    className={`${item.color} h-full`}
                    style={{ width: `${(item.value / reportData.leads.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Report */}
      <div className="bg-gradient-to-br from-black/10 to-black border border-white/10 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">Resumen Detallado</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-zinc-500 font-semibold mb-3">Desempeño de Propiedades</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li>• Total de propiedades listadas: {reportData.properties.total}</li>
              <li>• Propiedades activas: {reportData.properties.active}</li>
              <li>• Propiedades vendidas: {reportData.properties.sold}</li>
              <li>• Tasa de venta: {Math.round((reportData.properties.sold / reportData.properties.total) * 100)}%</li>
            </ul>
          </div>
          <div>
            <h4 className="text-zinc-500 font-semibold mb-3">Desempeño de Leads</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li>• Total de leads: {reportData.leads.total}</li>
              <li>• Leads convertidos: {reportData.leads.converted}</li>
              <li>• Tasa de conversión: {Math.round((reportData.leads.converted / reportData.leads.total) * 100)}%</li>
              <li>• Valor promedio por venta: {reportData.revenue.avgDealSize}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
