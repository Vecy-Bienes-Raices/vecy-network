import React, { useState } from 'react';
import { Mail, Phone, MapPin, TrendingUp, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminLeads() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data
  const leads = [
    {
      id: 1,
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '+57 300 123 4567',
      inquiryType: 'buy',
      budget: '$400,000 - $600,000',
      zone: 'Zona Rosa',
      status: 'new',
      date: '2026-03-28',
      messages: 5,
    },
    {
      id: 2,
      name: 'María García',
      email: 'maria@example.com',
      phone: '+57 310 987 6543',
      inquiryType: 'invest',
      budget: '$1,000,000+',
      zone: 'Chapinero',
      status: 'contacted',
      date: '2026-03-27',
      messages: 12,
    },
    {
      id: 3,
      name: 'Carlos López',
      email: 'carlos@example.com',
      phone: '+57 320 555 1234',
      inquiryType: 'rent',
      budget: '$2,000 - $3,000/mes',
      zone: 'Usaquén',
      status: 'qualified',
      date: '2026-03-26',
      messages: 8,
    },
  ];

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-900/50 text-blue-300';
      case 'contacted':
        return 'bg-yellow-900/50 text-yellow-300';
      case 'qualified':
        return 'bg-green-900/50 text-green-300';
      default:
        return 'bg-gray-900/50 text-gray-300';
    }
  };

  const getInquiryLabel = (type: string) => {
    const labels: Record<string, string> = {
      buy: 'Compra',
      sell: 'Venta',
      rent: 'Alquiler',
      invest: 'Inversión',
      general: 'General',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Gestión de Leads</h2>
          <p className="text-zinc-500">Total: {leads.length} leads | Nuevos: {leads.filter(l => l.status === 'new').length}</p>
        </div>
        <Button className="bg-zinc-900 hover:bg-zinc-900 text-white flex items-center gap-2">
          <Download className="w-4 h-4" />
          Exportar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-64">
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-black border-white/10 text-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-black border border-white/10 text-white rounded-md"
        >
          <option value="all">Todos los Estados</option>
          <option value="new">Nuevos</option>
          <option value="contacted">Contactados</option>
          <option value="qualified">Calificados</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Nuevos', value: leads.filter(l => l.status === 'new').length, color: 'blue' },
          { label: 'Contactados', value: leads.filter(l => l.status === 'contacted').length, color: 'yellow' },
          { label: 'Calificados', value: leads.filter(l => l.status === 'qualified').length, color: 'green' },
          { label: 'Tasa Conversión', value: '33%', color: 'amber' },
        ].map((stat, idx) => (
          <div
            key={idx}
            className={`bg-gradient-to-br from-${stat.color}-900/20 to-black border border-${stat.color}-700/50 rounded-lg p-4`}
          >
            <p className={`text-${stat.color}-300 text-sm mb-1`}>{stat.label}</p>
            <p className={`text-3xl font-bold text-${stat.color}-400`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Leads Table */}
      <div className="bg-gradient-to-br from-black/10 to-black border border-white/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-4 text-left text-zinc-500 font-semibold">Nombre</th>
                <th className="px-6 py-4 text-left text-zinc-500 font-semibold">Contacto</th>
                <th className="px-6 py-4 text-left text-zinc-500 font-semibold">Tipo</th>
                <th className="px-6 py-4 text-left text-zinc-500 font-semibold">Presupuesto</th>
                <th className="px-6 py-4 text-left text-zinc-500 font-semibold">Zona</th>
                <th className="px-6 py-4 text-left text-zinc-500 font-semibold">Estado</th>
                <th className="px-6 py-4 text-left text-zinc-500 font-semibold">Mensajes</th>
                <th className="px-6 py-4 text-left text-zinc-500 font-semibold">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-white/10 hover:bg-white/5 transition">
                  <td className="px-6 py-4 text-white font-medium">{lead.name}</td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-zinc-500 text-sm">
                        <Mail className="w-4 h-4" />
                        {lead.email}
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500 text-sm">
                        <Phone className="w-4 h-4" />
                        {lead.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-500">{getInquiryLabel(lead.inquiryType)}</td>
                  <td className="px-6 py-4 text-zinc-500 font-semibold">{lead.budget}</td>
                  <td className="px-6 py-4 text-zinc-500 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {lead.zone}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(lead.status)}`}>
                      {lead.status === 'new' ? 'Nuevo' : lead.status === 'contacted' ? 'Contactado' : 'Calificado'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-zinc-500">
                      <TrendingUp className="w-4 h-4" />
                      {lead.messages}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-500 text-sm">{lead.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
