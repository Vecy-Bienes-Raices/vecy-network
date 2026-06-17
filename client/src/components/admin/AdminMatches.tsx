import React, { useState } from 'react';
import { Mail, Phone, MapPin, Search, Download, Building2, User, Clock, ArrowRight, Sparkles, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';

export default function AdminMatches() {
  const [searchTerm, setSearchTerm] = useState('');
  const [minScore, setMinScore] = useState('70');

  // Fetch matches from server
  const { data: matches = [], isLoading } = trpc.janIA.getAllMatches.useQuery();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'suggested':
        return 'bg-blue-900/50 text-blue-300 border border-blue-500/20';
      case 'interested':
        return 'bg-amber-900/50 text-amber-300 border border-amber-500/20';
      case 'viewed':
        return 'bg-purple-900/50 text-purple-300 border border-purple-500/20';
      case 'converted':
        return 'bg-green-900/50 text-green-300 border border-green-500/20';
      case 'rejected':
        return 'bg-red-900/50 text-red-300 border border-red-500/20';
      default:
        return 'bg-zinc-950 text-zinc-300 border border-zinc-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      suggested: 'Sugerido',
      interested: 'Interesado',
      viewed: 'Visto',
      converted: 'Convertido',
      rejected: 'Rechazado',
    };
    return labels[status] || status;
  };

  const formatPrice = (price: string | number) => {
    const parsed = parseFloat(String(price));
    if (isNaN(parsed) || parsed === 0) return 'N/A';
    return parsed.toLocaleString('es-CO') + ' COP';
  };

  const translatePropertyType = (type: string) => {
    const map: Record<string, string> = {
      apartment: 'Apartamento',
      house: 'Casa',
      building: 'Edificio',
      warehouse: 'Bodega',
      office: 'Oficina',
      farm: 'Finca',
      land: 'Lote',
      loft: 'Loft',
      consultorio: 'Consultorio',
    };
    return map[type?.toLowerCase()] || type;
  };

  const filteredMatches = matches.filter(match => {
    const property = match.property || {};
    const requirement = match.requirement || {};
    
    const propSearchStr = `${property.name} ${property.city} ${property.zone} ${property.idUsuarioWhatsapp}`.toLowerCase();
    const reqSearchStr = `${requirement.name} ${requirement.ciudadDeseada} ${requirement.zonaDeseada} ${requirement.idUsuarioWhatsapp}`.toLowerCase();
    
    const matchesSearch = propSearchStr.includes(searchTerm.toLowerCase()) || 
                          reqSearchStr.includes(searchTerm.toLowerCase());
                          
    const scoreVal = parseFloat(String(match.matchScore || '0'));
    const matchesScore = scoreVal >= parseFloat(minScore);
    
    return matchesSearch && matchesScore;
  });

  const exportData = () => {
    // Basic CSV export
    const headers = ['ID Coincidencia', 'Porcentaje Match', 'Propiedad', 'Propietario Telefono', 'Requerimiento', 'Interesado Telefono', 'Estado', 'Fecha'];
    const rows = filteredMatches.map(m => [
      `M${m.id}`,
      `${parseFloat(String(m.matchScore)).toFixed(0)}%`,
      m.property?.name,
      m.property?.idUsuarioWhatsapp ? `+${m.property.idUsuarioWhatsapp}` : 'N/A',
      m.requirement?.name,
      m.requirement?.idUsuarioWhatsapp ? `+${m.requirement.idUsuarioWhatsapp}` : 'N/A',
      m.status,
      new Date(m.createdAt).toLocaleDateString('es-CO')
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `coincidencias_vecy_network_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Reporte de Coincidencias (Matches)</h2>
          <p className="text-zinc-500">
            {isLoading ? 'Cargando coincidencias...' : `Total: ${matches.length} matches en el sistema | Filtrados: ${filteredMatches.length}`}
          </p>
        </div>
        <Button 
          disabled={filteredMatches.length === 0}
          onClick={exportData} 
          className="bg-zinc-900 hover:bg-zinc-800 text-white flex items-center gap-2 border border-white/5"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-64">
          <Input
            placeholder="Buscar por barrio, nombre o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-black border-white/10 text-white"
          />
        </div>
        <div className="flex items-center gap-2 bg-black border border-white/10 rounded-md px-3 text-white">
          <Percent className="w-4 h-4 text-zinc-500" />
          <span className="text-sm text-zinc-400">Match Mínimo:</span>
          <select
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            className="bg-transparent border-none text-white focus:ring-0 text-sm font-semibold cursor-pointer"
          >
            <option className="bg-black" value="50">50%</option>
            <option className="bg-black" value="60">60%</option>
            <option className="bg-black" value="70">70%</option>
            <option className="bg-black" value="80">80%</option>
            <option className="bg-black" value="90">90%</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-zinc-500 text-sm">Buscando reportes de matching...</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="panel-card p-20 text-center border border-white/5 rounded-xl bg-gradient-to-b from-card/30 to-black/10">
          <Sparkles className="w-12 h-12 text-primary mx-auto mb-4 opacity-40 animate-pulse" />
          <h3 className="text-lg font-semibold text-zinc-300">No se encontraron coincidencias</h3>
          <p className="text-zinc-500 text-sm mt-1">Ajusta los filtros o realiza nuevas búsquedas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredMatches.map((match) => {
            const property = match.property || {};
            const requirement = match.requirement || {};
            const scoreNum = parseFloat(String(match.matchScore || '0')).toFixed(0);

            return (
              <div 
                key={match.id}
                className="bg-gradient-to-br from-card/80 via-card/50 to-black/30 border border-white/5 hover:border-primary/20 rounded-xl p-6 transition-all duration-300 relative overflow-hidden group shadow-lg"
              >
                {/* Neon match indicator on the left edge */}
                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-b from-primary via-blue-500 to-indigo-600 opacity-60 group-hover:opacity-100 transition-opacity" />

                {/* Top bar info */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4 mb-5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded">
                      #M{match.id}
                    </span>
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(match.createdAt).toLocaleDateString('es-CO')} - {new Date(match.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${getStatusColor(match.status)}`}>
                      {getStatusLabel(match.status)}
                    </span>
                    <div className="flex items-center gap-1 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-sm font-bold border border-green-500/20">
                      <Sparkles className="w-4 h-4" />
                      <span>{scoreNum}% Match</span>
                    </div>
                  </div>
                </div>

                {/* Match Dual View */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative">
                  
                  {/* REQUIREMENT CARD */}
                  <div className="space-y-4 bg-zinc-950/40 p-4 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-widest uppercase">
                      <Search className="w-4 h-4" />
                      <span>REQUERIMIENTO (BÚSQUEDA)</span>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-lg">{requirement.name}</h4>
                      <p className="text-zinc-500 text-xs mt-1 italic">"{requirement.rawText || 'Sin descripción'}"</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm border-t border-white/5 pt-3">
                      <div>
                        <span className="text-zinc-500 text-xs block">Tipo & Negocio</span>
                        <span className="text-zinc-300 font-medium">{translatePropertyType(requirement.tipoInmuebleDeseado)} ({requirement.tipoNegocioDeseado?.toUpperCase()})</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-xs block">Ubicación buscada</span>
                        <span className="text-zinc-300 font-medium flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          {requirement.ciudadDeseada} {requirement.zonaDeseada ? `- ${requirement.zonaDeseada}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="bg-primary/5 p-3 rounded flex items-center justify-between border border-primary/10">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Autor del requerimiento</span>
                          <span className="text-zinc-300 text-xs font-semibold">Asesor Asociado</span>
                        </div>
                      </div>
                      <a 
                        href={`https://wa.me/${requirement.idUsuarioWhatsapp}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold px-3 py-1.5 rounded text-xs transition"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        +{requirement.idUsuarioWhatsapp}
                      </a>
                    </div>
                  </div>

                  {/* Neon connector arrow in the middle for large screens */}
                  <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center w-10 h-10 rounded-full bg-zinc-900 border border-white/10 shadow-2xl z-10 text-primary group-hover:scale-110 transition-transform">
                    <ArrowRight className="w-5 h-5" />
                  </div>

                  {/* PROPERTY CARD */}
                  <div className="space-y-4 bg-zinc-950/40 p-4 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm tracking-widest uppercase">
                      <Building2 className="w-4 h-4" />
                      <span>PROPIEDAD (OFERTA)</span>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-lg">{property.name}</h4>
                      <p className="text-zinc-500 text-xs mt-1 italic">"{property.rawText || 'Sin descripción'}"</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm border-t border-white/5 pt-3">
                      <div>
                        <span className="text-zinc-500 text-xs block">Valor Activo</span>
                        <span className="text-green-400 font-bold">{formatPrice(property.price)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-xs block">Ubicación física</span>
                        <span className="text-zinc-300 font-medium flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                          {property.city} {property.zone ? `- ${property.zone}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="bg-indigo-500/5 p-3 rounded flex items-center justify-between border border-indigo-500/10">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-400" />
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Propietario / Captador</span>
                          <span className="text-zinc-300 text-xs font-semibold">Asesor Captador</span>
                        </div>
                      </div>
                      <a 
                        href={`https://wa.me/${property.idUsuarioWhatsapp}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold px-3 py-1.5 rounded text-xs transition"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        +{property.idUsuarioWhatsapp}
                      </a>
                    </div>
                  </div>

                </div>

                {/* Reason description */}
                {match.matchReason && (
                  <div className="mt-4 bg-white/5 border border-white/5 rounded p-3 text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-300">Justificación Técnica del Matching:</span> {match.matchReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
