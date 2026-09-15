/**
 * PROPERTIES PAGE (OFERTAS) - VECY TECH REAL ESTATE GOLD EDITION
 *
 * Catálogo inteligente de Ofertas Inmobiliarias Auditadas.
 * Arquitectura:
 * - Filtros del lado del servidor (tRPC + PostgreSQL) para evitar cortes de paginación.
 * - Switcher de Catálogo Doctrinal: OFERTAS (Inmuebles) ↔ DEMANDAS (Requerimientos).
 * - Botón de acción contextual único: "+ PUBLICAR OFERTA".
 * - Búsqueda en tiempo real por micro-barrios y ciudades.
 */

import Navbar from '@/components/Navbar';
import PropertyCard from '@/components/PropertyCard';
import { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { 
  Loader2, 
  PlusCircle, 
  Search, 
  X, 
  ArrowUpDown, 
  Sparkles, 
  Building2, 
  Home, 
  Briefcase, 
  MapPin, 
  RefreshCw 
} from 'lucide-react';
import { ScrollReveal } from '@/components/ScrollReveal';
import { useAuth } from '@/_core/hooks/useAuth';
import UnifiedPublishModal from '@/components/publish/UnifiedPublishModal';

// ─── Tipos y Filtros Doctrinales ──────────────────────────────────────────────
type FilterType = 
  | 'all' 
  | 'house' 
  | 'apartment' 
  | 'office' 
  | 'commercial' 
  | 'land' 
  | 'building' 
  | 'farm' 
  | 'warehouse' 
  | 'hotel';

const FILTER_CONFIG: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'house', label: 'Casas' },
  { id: 'apartment', label: 'Apartamentos' },
  { id: 'office', label: 'Oficinas' },
  { id: 'commercial', label: 'Comercial' },
  { id: 'land', label: 'Lotes / Terrenos' },
  { id: 'building', label: 'Edificios' },
  { id: 'farm', label: 'Fincas' },
  { id: 'warehouse', label: 'Bodegas' },
  { id: 'hotel', label: 'Hoteles' },
];

const SUGGESTED_NEIGHBORHOODS = [
  'Morato',
  'Chicó',
  'Rosales',
  'Santa Bárbara',
  'Cedritos',
  'Suba',
  'Usaquén',
  'Chapinero',
];

export default function Properties() {
  const [, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [transactionFilter, setTransactionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'area-desc'>('default');
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [publishTab, setPublishTab] = useState<'oferta' | 'demanda'>('oferta');
  const { user } = useAuth();

  // Debounce para búsqueda en tiempo real
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 280);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Consulta al backend pasando los filtros a PostgreSQL (límite 150)
  const { data: propertiesData, isLoading, isFetching, refetch } = trpc.properties.list.useQuery({
    type: activeFilter === 'all' ? undefined : activeFilter,
    transactionType: transactionFilter === 'all' ? undefined : transactionFilter,
    search: debouncedSearch || undefined,
    limit: 150,
  });

  // Ordenamiento en cliente del lote traído
  const displayProperties = useMemo(() => {
    if (!propertiesData) return [];
    let list = [...propertiesData];

    if (sortBy === 'price-asc') {
      list.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === 'area-desc') {
      list.sort((a, b) => (Number(b.areaTotal) || 0) - (Number(a.areaTotal) || 0));
    }

    return list;
  }, [propertiesData, sortBy]);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />

      {/* ── HERO SECTION GOLD LUXURY ── */}
      <section className="relative pt-36 pb-16 overflow-hidden border-b border-white/5 bg-gradient-to-b from-black via-zinc-950 to-background">
        {/* Glow de fondo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[320px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="container relative z-10 text-center">
          <ScrollReveal delay={0.1}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-5 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">
                Red Colaborativa de Inmuebles Auditados
              </span>
            </div>

            <h1 className="vecy-title-hero uppercase tracking-tight">
              TIENDA <span className="text-gradient-gold">OFERTAS</span>
            </h1>

            <p className="vecy-subtitle max-w-2xl mx-auto text-sm sm:text-base text-zinc-400">
              Explora inventario inmobiliario verificado en tiempo real. 
              Contacta captadores oficiales, coordina visitas y cierra negocios con respaldo legal.
            </p>

            {/* ── Contador de Ofertas Auditadas y Acción Principal Contextual Única ── */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900/90 border border-white/10 shadow-lg backdrop-blur-md">
                <Home className="w-4 h-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-widest text-zinc-300">
                  Ofertas Activas:
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs bg-primary/20 text-primary font-black">
                  {propertiesData?.length || 0}
                </span>
              </div>

              <button
                onClick={() => {
                  setPublishTab('oferta');
                  setIsPublishOpen(true);
                }}
                className="btn-gold px-8 py-3.5 text-xs tracking-widest uppercase font-black gap-2.5 inline-flex items-center shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:scale-105 transition-all cursor-pointer"
                title="Publicar nuevo inmueble u oferta con asistencia instantánea de JanIA"
              >
                <PlusCircle className="w-4 h-4 text-black" />
                <span>+ PUBLICAR OFERTA</span>
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── BARRA DE FILTROS, BÚSQUEDA Y CONTROL ── */}
      <section className="py-6 bg-background/90 backdrop-blur-2xl border-b border-white/10 sticky top-20 z-30 transition-all">
        <div className="container space-y-4">
          {/* Fila 1: Filtros de Tipología en Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {FILTER_CONFIG.map((f) => {
              const isSelected = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#bf953f] to-[#aa771c] text-black shadow-[0_0_20px_rgba(191,149,63,0.35)] scale-105 font-black'
                      : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Fila 2: Buscador inteligente, selector de transacción y ordenamiento */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Buscador de Micro-barrio o Código */}
            <div className="relative w-full lg:w-96">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por barrio (Morato, Chicó), ciudad o código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/90 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Borrar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Micro-barrios de acceso rápido */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mr-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary" /> Barrios:
              </span>
              {SUGGESTED_NEIGHBORHOODS.slice(0, 5).map((barrio) => (
                <button
                  key={barrio}
                  onClick={() => setSearchQuery(barrio)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    searchQuery.toLowerCase() === barrio.toLowerCase()
                      ? 'bg-primary/20 text-primary border border-primary/40'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5'
                  }`}
                >
                  {barrio}
                </button>
              ))}
            </div>

            {/* Controles de Transacción y Ordenamiento */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
              {/* Filtro de Negocio */}
              <div className="flex items-center gap-2 bg-zinc-900/90 px-3 py-2 rounded-xl border border-white/10">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Negocio:</span>
                <select
                  value={transactionFilter}
                  onChange={(e) => setTransactionFilter(e.target.value)}
                  className="bg-transparent text-zinc-200 text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-zinc-900 text-white">Todos</option>
                  <option value="venta" className="bg-zinc-900 text-white">Venta</option>
                  <option value="arriendo" className="bg-zinc-900 text-white">Arriendo</option>
                  <option value="venta_o_arriendo" className="bg-zinc-900 text-white">Venta o Arriendo</option>
                  <option value="permuta" className="bg-zinc-900 text-white">Permuta</option>
                </select>
              </div>

              {/* Ordenar */}
              <div className="flex items-center gap-2 bg-zinc-900/90 px-3 py-2 rounded-xl border border-white/10">
                <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-transparent text-zinc-200 text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="default" className="bg-zinc-900 text-white">Más Recientes</option>
                  <option value="price-asc" className="bg-zinc-900 text-white">Menor Precio</option>
                  <option value="price-desc" className="bg-zinc-900 text-white">Mayor Precio</option>
                  <option value="area-desc" className="bg-zinc-900 text-white">Mayor Área (m²)</option>
                </select>
              </div>

              {/* Botón Refrescar */}
              <button
                onClick={() => refetch()}
                className={`p-2.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:border-primary/40 transition-all cursor-pointer ${
                  isFetching ? 'animate-spin text-primary' : ''
                }`}
                title="Actualizar catálogo"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── LISTADO DE INMUEBLES AUDITADOS ── */}
      <section className="py-14 bg-background">
        <div className="container">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="vecy-title-section text-xl sm:text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                <span>{displayProperties.length} {displayProperties.length === 1 ? 'Oferta Disponible' : 'Ofertas Disponibles'}</span>
                {activeFilter !== 'all' && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 font-bold uppercase">
                    {FILTER_CONFIG.find(f => f.id === activeFilter)?.label}
                  </span>
                )}
                {debouncedSearch && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-white/10 font-bold">
                    "{debouncedSearch}"
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-semibold">
                Inventario verificado con captadores directos y fotos de alta resolución
              </p>
            </div>

            {(debouncedSearch || activeFilter !== 'all' || transactionFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                  setTransactionFilter('all');
                }}
                className="text-xs font-bold uppercase tracking-wider text-primary hover:underline self-start sm:self-auto cursor-pointer"
              >
                Restablecer todos los filtros
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-36 text-zinc-400 gap-4">
              <Loader2 className="animate-spin w-10 h-10 text-primary" />
              <p className="text-xs uppercase tracking-widest font-bold text-zinc-500 animate-pulse">
                Consultando inventario en PostgreSQL VPS...
              </p>
            </div>
          ) : displayProperties.length === 0 ? (
            <div className="text-center py-28 border-2 border-dashed border-white/10 rounded-3xl bg-zinc-950/40 p-8">
              <Building2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">
                No se encontraron ofertas con estos criterios
              </h3>
              <p className="text-zinc-400 text-xs max-w-md mx-auto mb-6">
                Intenta ajustando el micro-barrio o seleccionando "Todos" para explorar todo el inventario auditado.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                  setTransactionFilter('all');
                }}
                className="btn-gold-outline px-6 py-2.5 text-xs font-black uppercase tracking-widest cursor-pointer"
              >
                Ver Todas las Ofertas
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayProperties.map((prop, idx) => {
                const images = prop.images as string[] | null;
                const area = prop.areaTotal ? Number(prop.areaTotal) : 0;
                const piso = (prop as any).floorDetail || (prop.amenities as any)?.pisoEdificio || undefined;

                return (
                  <ScrollReveal key={prop.id} delay={(idx % 3) * 0.08} direction="up">
                    <PropertyCard 
                      id={prop.id}
                      name={prop.name}
                      propertyType={prop.propertyType as any}
                      transactionType={prop.transactionType || undefined}
                      price={Number(prop.price)}
                      location={prop.location || ''}
                      zone={prop.zone}
                      neighborhood={prop.addressNeighborhood || undefined}
                      locality={prop.addressLocality || undefined}
                      city={prop.addressCity || prop.city || 'Bogotá'}
                      bedrooms={prop.bedrooms || 0}
                      bathrooms={prop.bathrooms || 0}
                      area={area}
                      parking={prop.garages || 0}
                      piso={piso}
                      yearBuilt={prop.yearBuilt || undefined}
                      image={images?.[0] || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop'}
                      gallery={images || []}
                      featured={prop.featured || false}
                    />
                  </ScrollReveal>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── BANNER ASESORÍA Y CAPTACIÓN ── */}
      <section className="py-24 bg-gradient-to-t from-black via-zinc-950 to-background border-t border-white/5">
        <div className="container text-center max-w-3xl">
          <ScrollReveal>
            <h2 className="vecy-title-hero uppercase text-2xl sm:text-4xl mb-4">
              ¿Tienes un inmueble o buscas algo <span className="text-gradient-gold">exclusivo</span>?
            </h2>
            <p className="vecy-subtitle text-sm text-zinc-400 mb-8 leading-relaxed">
              Publica tu oferta en la red para multiplicar visitas con colegas auditados, o activa a JanIA para encontrar el inmueble exacto que tu cliente necesita.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button 
                onClick={() => {
                  setPublishTab('oferta');
                  setIsPublishOpen(true);
                }}
                className="btn-gold px-8 py-4 text-xs font-black tracking-widest uppercase cursor-pointer"
              >
                + SUBIR MI INMUEBLE AHORA
              </button>
              <button 
                onClick={() => navigate('/demandas')}
                className="btn-gold-outline px-8 py-4 text-xs font-black tracking-widest uppercase cursor-pointer"
              >
                VER DEMANDAS ACTIVAS
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── FOOTER MINIMALISTA ── */}
      <footer className="bg-black border-t border-white/10 py-16">
        <div className="container text-center">
          <img src="/logo-vecy.png" alt="Vecy" className="h-10 mx-auto mb-6 opacity-60 hover:opacity-100 transition-opacity" />
          <div className="flex justify-center gap-8 mb-8">
            <button onClick={() => navigate('/')} className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-primary transition-colors cursor-pointer">Inicio</button>
            <button onClick={() => navigate('/historia')} className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-primary transition-colors cursor-pointer">Historia</button>
            <button onClick={() => navigate('/ofertas')} className="text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-colors cursor-pointer">Ofertas</button>
            <button onClick={() => navigate('/demandas')} className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-primary transition-colors cursor-pointer">Demandas</button>
            <button onClick={() => navigate('/services')} className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-primary transition-colors cursor-pointer">Servicios</button>
          </div>
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.3em]">
            &copy; 2026 VECY NETWORK. Red Colaborativa Inmobiliaria de Colombia.
          </p>
        </div>
      </footer>

      {/* Modal Unificado de Publicación */}
      <UnifiedPublishModal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        defaultTab={publishTab}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
