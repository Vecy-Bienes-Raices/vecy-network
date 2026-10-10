import React, { useEffect, useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  Users, 
  Search, 
  MapPin, 
  DollarSign, 
  Bed, 
  Bath, 
  MessageCircle, 
  Zap,
  Filter,
  Loader2,
  Plus,
  PlusCircle,
  Home,
  Briefcase,
  Sparkles
} from 'lucide-react';
import NetworkBackground from '@/components/NetworkBackground';
import { ScrollReveal } from '@/components/ScrollReveal';
import { supabase } from '@/lib/supabase';
import { useLocation } from 'wouter';
import UnifiedPublishModal from '@/components/publish/UnifiedPublishModal';

// --- Tipos para los Requerimientos ---
interface Requirement {
  id: number;
  name: string;
  tipoInmuebleDeseado: string;
  tipoNegocioDeseado: string;
  ciudadDeseada: string;
  zonaDeseada: string | null;
  addressNeighborhood: string | null;
  presupuestoMax: number | string;
  habitacionesMin: number | null;
  banosMin: number | null;
  createdAt: string;
  userId: number;
  user?: {
    name: string;
    phone: string;
  };
}

export default function RequirementsMarketplace() {
  const [, navigate] = useLocation();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [isPublishOpen, setIsPublishOpen] = useState(false);

  useEffect(() => {
    fetchRequirements();
  }, []);

  const fetchRequirements = async () => {
    setLoading(true);
    try {
      // Intentamos obtener los requerimientos con la info del usuario (asesor)
      const { data, error } = await supabase
        .from('requirements')
        .select(`
          *,
          user:userId (
            name,
            phone
          )
        `)
        .eq('status', 'active')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      setRequirements(data || []);
    } catch (err) {
      console.error('Error fetching requirements:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequirements = requirements.filter(req => 
    req.tipoInmuebleDeseado.toLowerCase().includes(filter.toLowerCase()) ||
    (req.addressNeighborhood || req.zonaDeseada || '').toLowerCase().includes(filter.toLowerCase())
  );

  // Paginación Doctrinal y Selector de Lotes por Página
  const [pageSize, setPageSize] = useState<number>(9);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, pageSize]);

  const totalItems = filteredRequirements.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedRequirements = useMemo(() => {
    if (pageSize >= totalItems) return filteredRequirements;
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRequirements.slice(startIndex, startIndex + pageSize);
  }, [filteredRequirements, currentPage, pageSize, totalItems]);

  const formatPrice = (price: number | string) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(Number(price));
  };

  const handleWhatsAppClick = (phone: string, req: Requirement) => {
    const message = `Hola, vi el requerimiento en VECY para un(a) ${req.tipoInmuebleDeseado} en ${req.addressNeighborhood || req.zonaDeseada || 'Bogotá'}. Tengo el inmueble match.`;
    window.open(`https://wa.me/${phone.replace(/\+/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative pt-36 pb-16 overflow-hidden border-b border-white/5 bg-gradient-to-b from-black via-zinc-950 to-background">
        <NetworkBackground />
        <div className="container relative z-10 text-center max-w-4xl mx-auto px-4">
          <ScrollReveal delay={0.1}>
            <p className="vecy-accent-tag text-center">MARKETPLACE DE DEMANDAS CALIFICADAS</p>

            <h1 className="vecy-title-hero uppercase tracking-tight">
              TIENDA <span className="text-gradient-gold">DEMANDAS</span>
            </h1>

            <div className="line-electric w-36 sm:w-44 mx-auto my-5"></div>

            <p className="vecy-subtitle max-w-2xl mx-auto text-sm sm:text-base text-zinc-300">
              Conecta con asesores que ya tienen el comprador verificado. 
              Si tienes el inventario que coincide con el requerimiento, <span className="font-bold text-white">tienes el cierre asegurado</span>.
            </p>

            {/* ── Contador de Demandas Calificadas y Acción Principal Contextual Única ── */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900/90 border border-white/10 shadow-lg backdrop-blur-md">
                <Briefcase className="w-4 h-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-widest text-zinc-300">
                  Demandas Activas:
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs bg-primary/20 text-primary font-black">
                  {requirements.length}
                </span>
              </div>

              <button
                onClick={() => setIsPublishOpen(true)}
                className="btn-gold px-8 py-3.5 text-xs tracking-widest uppercase font-black gap-2.5 inline-flex items-center shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:scale-105 transition-all cursor-pointer"
                title="Publicar requerimiento o demanda de compra/arriendo con asistencia de JanIA"
              >
                <Plus className="w-4 h-4 text-black" />
                <span>+ PUBLICAR DEMANDA</span>
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* FILTROS */}
      <section className="py-4 sm:py-6 bg-zinc-950 border-b border-white/10 sticky top-20 z-30 shadow-2xl">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-6">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Filtrar por barrio, zona o tipo de inmueble..."
                className="w-full bg-zinc-900/90 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-primary/60"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-zinc-400 uppercase tracking-widest text-[10px] font-bold">
                <Filter className="w-4 h-4 text-primary" />
                <span>Demandas Activas en Vivo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GRID DE REQUERIMIENTOS */}
      <section className="py-14 bg-background relative" id="demandas-grid-anchor">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-4 border-b border-white/5">
            <div>
              <h2 className="vecy-title-section text-xl sm:text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                <span>{totalItems} {totalItems === 1 ? 'Demanda Activa' : 'Demandas Activas'}</span>
                {filter && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-white/10 font-bold">
                    "{filter}"
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-semibold">
                Requerimientos verificados con presupuesto y comprador real
                {totalItems > 0 && pageSize < totalItems && (
                  <span className="text-primary font-bold ml-2">
                    · Página {currentPage} de {totalPages} (Mostrando {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalItems)})
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Selector de Demandas por Página */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Mostrar:
                </span>
                <div className="inline-flex rounded-xl bg-zinc-900/90 border border-white/10 p-1">
                  {[6, 9, 12, 24, 150].map((size) => (
                    <button
                      key={size}
                      onClick={() => setPageSize(size)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        pageSize === size 
                          ? 'bg-primary text-black font-black shadow-sm' 
                          : 'text-zinc-400 hover:text-white'
                      }`}
                      title={size === 150 ? 'Mostrar todas las demandas' : `Mostrar ${size} demandas por página`}
                    >
                      {size === 150 ? 'Todas' : size}
                    </button>
                  ))}
                </div>
              </div>

              {filter && (
                <button
                  onClick={() => setFilter('')}
                  className="text-xs font-bold uppercase tracking-wider text-primary hover:underline cursor-pointer"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">Sincronizando Demandas...</p>
            </div>
          ) : filteredRequirements.length === 0 ? (
            <div className="text-center py-40 border-2 border-dashed border-white/5 rounded-[2rem]">
              <Users className="w-12 h-12 text-gray-700 mx-auto mb-6" />
              <p className="text-gray-500 uppercase tracking-widest font-bold">No se encontraron requerimientos activos.</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedRequirements.map((req, idx) => (
                <ScrollReveal key={req.id} delay={0.08 * (idx % 3)} direction="up" className="h-full">
                  <div className="vecy-card-apple p-6 sm:p-7 flex flex-col justify-between h-full group hover:glow-gold transition-all duration-500 border-primary/20">
                    <div className="flex-1 flex flex-col">
                      {/* Header: Tipo de Inmueble */}
                      <div className="flex justify-between items-start mb-6">
                        <div className="bg-primary/10 border border-primary/25 px-3 py-1 rounded-full">
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                            {req.tipoInmuebleDeseado}
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase font-mono">
                          {new Date(req.createdAt).toLocaleDateString('es-CO')}
                        </div>
                      </div>

                      {/* Ubicación */}
                      <div className="space-y-4 mb-6">
                        <div className="flex items-start gap-3.5">
                          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors border border-white/5">
                            <MapPin className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Barrios de Interés</p>
                            <p className="text-white font-bold leading-snug text-sm">
                              {req.addressNeighborhood || req.zonaDeseada || 'Cualquier zona'}
                            </p>
                            <p className="text-gray-400 text-xs mt-0.5">{req.ciudadDeseada}</p>
                          </div>
                        </div>

                        {/* Presupuesto */}
                        <div className="flex items-start gap-3.5 bg-black/40 border border-white/5 rounded-2xl p-3.5">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                            <DollarSign className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Presupuesto Máximo</p>
                            <p className="text-primary text-lg sm:text-xl font-black font-mono">
                              {req.presupuestoMax ? formatPrice(req.presupuestoMax) : 'A convenir'}
                            </p>
                          </div>
                        </div>

                        {/* Distribución */}
                        <div className="flex gap-6 pt-4 border-t border-white/5">
                          <div className="flex items-center gap-2">
                            <Bed className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-bold text-white">{req.habitacionesMin || 0}+ Hab</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Bath className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-bold text-white">{req.banosMin || 0}+ Baños</span>
                          </div>
                        </div>
                      </div>

                      {/* Perfil del Asesor */}
                      <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5 mt-auto mb-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 flex-shrink-0">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Asesor a Cargo</p>
                            <p className="text-white text-xs sm:text-sm font-bold truncate">{req.user?.name || 'Agente VECY'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botón de Match Ergonómico Táctil */}
                    <div className="mt-2 pt-3 border-t border-white/5">
                      <button 
                        onClick={() => req.user?.phone && handleWhatsAppClick(req.user.phone, req)}
                        disabled={!req.user?.phone}
                        className="btn-gold w-full min-h-[46px] py-3.5 px-4 rounded-xl text-[10px] tracking-[0.18em] font-black group-hover:glow-gold-sm disabled:opacity-50 active:scale-[0.98] touch-manipulation transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                      >
                        <Zap className="w-3.5 h-3.5 inline-block shrink-0" />
                        <span>TENGO EL INMUEBLE MATCH</span>
                      </button>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* ── BARRA DE PAGINACIÓN FLUIDA & SELECTOR DE PÁGINAS ── */}
            {totalPages > 1 && (
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/10">
                <div className="text-xs text-zinc-400 font-mono">
                  Mostrando <strong className="text-white">{(currentPage - 1) * pageSize + 1}</strong> - <strong className="text-white">{Math.min(currentPage * pageSize, totalItems)}</strong> de <strong className="text-primary">{totalItems}</strong> requerimientos
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  <button
                    onClick={() => {
                      setCurrentPage(prev => Math.max(prev - 1, 1));
                      const el = document.getElementById('demandas-grid-anchor');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    disabled={currentPage === 1}
                    className="btn-gold-outline px-3 py-2 text-xs rounded-xl disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    title="Página Anterior"
                  >
                    ← Anterior
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((pageNum, i, arr) => {
                      const prev = arr[i - 1];
                      return (
                        <React.Fragment key={pageNum}>
                          {prev && pageNum - prev > 1 && (
                            <span className="px-1.5 text-zinc-500 font-mono">...</span>
                          )}
                          <button
                            onClick={() => {
                              setCurrentPage(pageNum);
                              const el = document.getElementById('demandas-grid-anchor');
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`min-w-[36px] h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              currentPage === pageNum
                                ? 'btn-gold shadow-md text-black font-black'
                                : 'btn-gold-outline text-zinc-300 hover:text-white'
                            }`}
                          >
                            {pageNum}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    onClick={() => {
                      setCurrentPage(prev => Math.min(prev + 1, totalPages));
                      const el = document.getElementById('demandas-grid-anchor');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    disabled={currentPage === totalPages}
                    className="btn-gold-outline px-3 py-2 text-xs rounded-xl disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    title="Página Siguiente"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-32 bg-gradient-dark relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px separator-gold" />
        <div className="container relative z-10 text-center">
          <ScrollReveal>
            <h2 className="vecy-title-section uppercase tracking-tighter">¿TIENES UN <span className="text-primary">COMPRADOR</span>?</h2>
            <p className="vecy-subtitle max-w-2xl mx-auto mb-12 uppercase tracking-widest text-xs font-bold mt-4">
              Publica tu requerimiento y deja que la red encuentre el inmueble perfecto por ti.
            </p>
            <button 
              onClick={() => setIsPublishOpen(true)}
              className="btn-gold px-10 sm:px-14 py-4 sm:py-5 text-sm sm:text-base font-black tracking-widest uppercase hover:scale-105 transition-all shadow-[0_0_35px_rgba(191,149,63,0.35)] hover:shadow-[0_0_55px_rgba(191,149,63,0.6)] cursor-pointer rounded-2xl inline-flex items-center justify-center gap-3"
            >
              <PlusCircle className="w-5 h-5 shrink-0" />
              PUBLICAR MI REQUERIMIENTO
            </button>
          </ScrollReveal>
        </div>
      </section>

      <Footer />

      {/* MODAL DE PUBLICACIÓN UNIFICADO */}
      <UnifiedPublishModal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        defaultTab="demanda"
        onSuccess={fetchRequirements}
      />
    </div>
  );
}
