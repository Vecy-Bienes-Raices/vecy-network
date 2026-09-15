import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
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
        <div className="container relative z-10 text-center">
          <ScrollReveal delay={0.1}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-5 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">Marketplace de Demandas Calificadas</span>
            </div>
            <h1 className="vecy-title-hero uppercase tracking-tight">
              TIENDA <span className="text-gradient-gold">DEMANDAS</span>
            </h1>
            <p className="vecy-subtitle max-w-2xl mx-auto text-sm sm:text-base text-zinc-400">
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
      <section className="py-6 bg-background/90 backdrop-blur-2xl border-b border-white/10 sticky top-20 z-30">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
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
      <section className="py-20 bg-background relative">
        <div className="container">
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredRequirements.map((req, idx) => (
                <ScrollReveal key={req.id} delay={0.1 * (idx % 3)} direction="up">
                  <div className="vecy-card-apple group hover:glow-gold transition-all duration-500 border-primary/10">
                    {/* Header: Tipo de Inmueble */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                          {req.tipoInmuebleDeseado}
                        </span>
                      </div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase">
                        {new Date(req.createdAt).toLocaleDateString('es-CO')}
                      </div>
                    </div>

                    {/* Ubicación */}
                    <div className="space-y-4 mb-8">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                          <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Barrios de Interés</p>
                          <p className="text-white font-bold leading-tight">
                            {req.addressNeighborhood || req.zonaDeseada || 'Cualquier zona'}
                          </p>
                          <p className="text-gray-400 text-xs mt-1">{req.ciudadDeseada}</p>
                        </div>
                      </div>

                      {/* Presupuesto */}
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                          <DollarSign className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Presupuesto Máximo</p>
                          <p className="text-primary text-xl font-black">
                            {req.presupuestoMax ? formatPrice(req.presupuestoMax) : 'A convenir'}
                          </p>
                        </div>
                      </div>

                      {/* Distribución */}
                      <div className="flex gap-6 mt-6 pt-6 border-t border-white/5">
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
                    <div className="bg-black/40 rounded-2xl p-5 border border-white/5 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Asesor a Cargo</p>
                          <p className="text-white text-sm font-bold">{req.user?.name || 'Agente VECY'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Botón de Match */}
                    <button 
                      onClick={() => req.user?.phone && handleWhatsAppClick(req.user.phone, req)}
                      disabled={!req.user?.phone}
                      className="btn-gold w-full py-4 text-[10px] tracking-[0.2em] font-black group-hover:glow-gold-sm disabled:opacity-50"
                    >
                      <Zap className="w-3 h-3 mr-2" />
                      TENGO EL INMUEBLE MATCH
                    </button>
                  </div>
                </ScrollReveal>
              ))}
            </div>
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
              className="btn-gold-outline px-12 py-5 text-lg tracking-widest uppercase hover:scale-105 transition-transform"
            >
              PUBLICAR MI REQUERIMIENTO
            </button>
          </ScrollReveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black border-t border-white/10 py-12">
        <div className="container text-center">
          <img src="/logo-vecy.png" alt="Vecy" className="h-10 mx-auto mb-6 opacity-30 grayscale" />
          <p className="text-gray-600 text-[10px] uppercase tracking-[0.3em]">
            &copy; 2026 VECY NETWORK. El Futuro del Real Estate es Colaborativo.
          </p>
        </div>
      </footer>

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
