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
  Loader2
} from 'lucide-react';
import NetworkBackground from '@/components/NetworkBackground';
import { ScrollReveal } from '@/components/ScrollReveal';
import { supabase } from '@/lib/supabase';
import { useLocation } from 'wouter';

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
      <section className="relative pt-40 pb-20 overflow-hidden border-b border-white/5">
        <NetworkBackground />
        <div className="container relative z-10 text-center">
          <ScrollReveal delay={0.2}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Search className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Marketplace de Demandas</span>
            </div>
            <h1 className="vecy-title-hero">
              TIENDA DE <span className="text-gradient-gold">REQUERIMIENTOS</span>
            </h1>
            <p className="vecy-subtitle max-w-3xl mx-auto">
              Conecta con asesores que ya tienen el comprador calificado. 
              Si tienes el inventario, <span className="font-bold text-white">tienes el cierre asegurado</span>.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* FILTROS */}
      <section className="py-8 bg-black/50 backdrop-blur-xl border-b border-white/10 sticky top-20 z-30">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Filtrar por barrio o tipo..."
                className="input-vecy w-full pl-12 py-3 rounded-full text-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-500 uppercase tracking-widest text-[10px] font-bold">
                <Filter className="w-4 h-4" />
                <span>Ordenar: Más Recientes</span>
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
              onClick={() => navigate('/contact')}
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
    </div>
  );
}
