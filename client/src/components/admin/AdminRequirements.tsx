import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { 
  Search, ClipboardList, Filter, Calendar, MapPin, 
  DollarSign, Building2, SlidersHorizontal, ArrowUpDown, ExternalLink
} from 'lucide-react';

export default function AdminRequirements() {
  const { data: requirements = [], isLoading, refetch } = trpc.janIA.getAllRequirements.useQuery();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterNeg, setFilterNeg] = useState('all');

  // Filtrado de requerimientos
  const filteredReqs = requirements.filter((r: any) => {
    const raw = (r.rawText || r.name || '').toLowerCase();
    const searchMatch = 
      raw.includes(search.toLowerCase()) || 
      (r.idUsuarioWhatsapp || '').includes(search);
      
    const typeMatch = filterType === 'all' || r.tipoInmuebleDeseado === filterType;
    const negMatch = filterNeg === 'all' || r.tipoNegocioDeseado === filterNeg;

    return searchMatch && typeMatch && negMatch;
  });

  const formatPhoneDisplay = (phone: string | null) => {
    if (!phone) return 'Sin teléfono';
    const clean = phone.split('@')[0];
    return `+${clean.substring(0, 2)} ${clean.substring(2, 5)} ${clean.substring(5, 8)} ${clean.substring(8)}`;
  };

  const formatCOP = (val: string | number | null) => {
    if (!val) return "N/E";
    const num = parseFloat(String(val));
    if (isNaN(num) || num === 0) return "N/E";
    return num.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
  };

  const translateType = (type: string | null) => {
    if (!type) return 'N/E';
    const dict: Record<string, string> = {
      apartment: 'Apartamento',
      house: 'Casa',
      building: 'Edificio',
      warehouse: 'Bodega',
      farm: 'Finca',
      hotel: 'Hotel',
      office: 'Oficina',
      land: 'Lote/Terreno',
      commercial: 'Local Comercial',
      loft: 'Loft',
      consultorio: 'Consultorio'
    };
    return dict[type] || type;
  };

  const translateNeg = (neg: string | null) => {
    if (!neg) return 'N/E';
    const dict: Record<string, string> = {
      venta: 'Venta',
      arriendo: 'Arriendo',
      arriendo_temporal: 'Renta Temporal'
    };
    return dict[neg] || neg;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ENCABEZADO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-widest text-[#bf953f] flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-[#bf953f]" />
            Buscador de Requerimientos (Demanda)
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Historial de búsquedas y necesidades de clientes captadas en tiempo real desde los grupos y DMs.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 px-4 py-2 rounded-xl text-center">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Total Requerimientos</p>
            <p className="text-xl font-black text-white">{isLoading ? '...' : requirements.length}</p>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* BUSCADOR */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por teléfono o palabras clave..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-[#bf953f]/50 transition-colors"
          />
        </div>

        {/* FILTRAR TIPO INMUEBLE */}
        <div className="relative">
          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white appearance-none focus:outline-none focus:border-[#bf953f]/50 transition-colors"
          >
            <option value="all">Todos los Inmuebles</option>
            <option value="apartment">Apartamento</option>
            <option value="loft">Loft</option>
            <option value="house">Casa</option>
            <option value="office">Oficina</option>
            <option value="commercial">Local Comercial</option>
            <option value="warehouse">Bodega</option>
            <option value="land">Lote/Terreno</option>
            <option value="consultorio">Consultorio</option>
          </select>
        </div>

        {/* FILTRAR TIPO NEGOCIO */}
        <div className="relative">
          <SlidersHorizontal className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <select
            value={filterNeg}
            onChange={(e) => setFilterNeg(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white appearance-none focus:outline-none focus:border-[#bf953f]/50 transition-colors"
          >
            <option value="all">Todos los Negocios</option>
            <option value="venta">Venta</option>
            <option value="arriendo">Arriendo</option>
            <option value="arriendo_temporal">Renta Temporal</option>
          </select>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      {isLoading ? (
        <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-12 text-center text-zinc-500 text-xs">
          Cargando requerimientos de la base de datos...
        </div>
      ) : filteredReqs.length === 0 ? (
        <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-12 text-center text-zinc-500 text-xs">
          No se encontraron requerimientos registrados con los criterios seleccionados.
        </div>
      ) : (
        <div className="bg-zinc-900/30 border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                  <th className="py-3.5 px-4 w-12">ID</th>
                  <th className="py-3.5 px-4 w-44">Buscador (Contacto)</th>
                  <th className="py-3.5 px-4">Descripción del Requerimiento</th>
                  <th className="py-3.5 px-4 w-36">Tipo Inmueble</th>
                  <th className="py-3.5 px-4 w-32">Negocio</th>
                  <th className="py-3.5 px-4 w-40">Presupuesto</th>
                  <th className="py-3.5 px-4 w-32">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredReqs.map((r: any) => {
                  const rawPhone = r.idUsuarioWhatsapp?.split('@')[0] || '';
                  
                  return (
                    <tr key={r.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 px-4 font-mono text-zinc-500">#{r.id}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-bold text-zinc-200">{formatPhoneDisplay(r.idUsuarioWhatsapp)}</p>
                            <p className="text-[10px] text-zinc-500 font-mono select-all">+{rawPhone}</p>
                          </div>
                          {rawPhone && (
                            <a 
                              href={`https://wa.me/${rawPhone}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-[#25D366] hover:bg-[#20ba5a] text-black text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 transition-colors"
                            >
                              WA <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="max-w-md">
                          <p className="font-bold text-zinc-300 mb-1">{r.name || 'Búsqueda de Inmueble'}</p>
                          <p className="text-[11px] text-zinc-500 font-mono leading-relaxed bg-black/20 p-2 rounded-lg border border-white/5 line-clamp-2 hover:line-clamp-none transition-all duration-300">
                            {r.rawText || 'Sin descripción detallada.'}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-1 rounded text-[10px] font-bold">
                          {translateType(r.tipoInmuebleDeseado)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
                          r.tipoNegocioDeseado === 'venta' 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}>
                          {translateNeg(r.tipoNegocioDeseado)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-zinc-300 font-mono font-bold">
                        {formatCOP(r.presupuestoMax)}
                      </td>
                      <td className="py-4 px-4 text-zinc-500 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(r.createdAt).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: '2-digit'
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
