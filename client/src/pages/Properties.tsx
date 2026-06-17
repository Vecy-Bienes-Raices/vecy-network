/**
 * PROPERTIES PAGE - VECY TECH REAL ESTATE
 *
 * Catálogo completo de propiedades estandarizado (Gold Edition).
 */

import Navbar from '@/components/Navbar';
import PropertyCard from '@/components/PropertyCard';
import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';
import { ScrollReveal } from '@/components/ScrollReveal';

// ─── Filtros ──────────────────────────────────────────────────────────────────
type FilterType = 'all' | 'apartment' | 'house' | 'building' | 'hotel' | 'farm' | 'office' | 'warehouse' | 'land' | 'commercial';

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'Todos',
  apartment: 'Apartamentos',
  house: 'Casas',
  building: 'Edificios',
  hotel: 'Hoteles',
  farm: 'Fincas',
  office: 'Oficinas',
  warehouse: 'Bodegas',
  land: 'Terrenos',
  commercial: 'Comercial',
};

export default function Properties() {
  const [, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default');

  const { data: propertiesData, isLoading } = trpc.properties.list.useQuery();

  const displayProperties = useMemo(() => {
    if (!propertiesData) return [];

    let list = activeFilter === 'all'
      ? propertiesData
      : propertiesData.filter((p) => p.propertyType === activeFilter);

    if (sortBy === 'price-asc') list = [...list].sort((a, b) => Number(a.price) - Number(b.price));
    if (sortBy === 'price-desc') list = [...list].sort((a, b) => Number(b.price) - Number(a.price));

    return list;
  }, [activeFilter, sortBy, propertiesData]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-40 pb-16 bg-gradient-to-b from-black to-background overflow-hidden border-b border-white/5">
        <div className="container relative z-10 text-center">
          <ScrollReveal delay={0.2}>
            <p className="vecy-accent-tag">Catálogo Exclusivo</p>
            <h1 className="vecy-title-hero uppercase">
              PORTAFOLIO DE <span className="text-gradient-gold">ACTIVOS</span>
            </h1>
            <p className="vecy-subtitle max-w-2xl mx-auto">
              Descubre propiedades premium auditadas y sincronizadas bajo el estándar Gold Edition de VECY Network.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Filtros y ordenamiento */}
      <section className="py-8 bg-background/80 backdrop-blur-xl border-b border-white/10 sticky top-20 z-30">
        <div className="container flex flex-col lg:flex-row items-center justify-between gap-6">
          <ScrollReveal direction="none" delay={0.1}>
            <div className="flex gap-2 flex-wrap justify-center lg:justify-start">
              {(Object.keys(FILTER_LABELS) as FilterType[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                    activeFilter === key
                      ? 'bg-accent text-accent-foreground shadow-[0_0_20px_rgba(191,149,63,0.3)] scale-105'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {FILTER_LABELS[key]}
                </button>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal direction="none" delay={0.2}>
            <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-transparent text-gray-300 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="default" className="bg-card">Destacados</option>
                <option value="price-asc" className="bg-card">Menor precio</option>
                <option value="price-desc" className="bg-card">Mayor precio</option>
              </select>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Grid de Propiedades */}
      <section className="py-20 bg-background">
        <div className="container">
          <ScrollReveal>
            <div className="mb-12">
              <h2 className="vecy-title-section">
                {displayProperties.length}{' '}
                {displayProperties.length === 1 ? 'Propiedad' : 'Propiedades'} Disponibles
              </h2>
              <div className="line-gold w-16 mt-4" />
            </div>
          </ScrollReveal>

          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-40 text-gray-400 gap-4">
              <Loader2 className="animate-spin w-10 h-10 text-accent" />
              <p className="text-xs uppercase tracking-widest font-bold">Escaneando ecosistema...</p>
            </div>
          ) : displayProperties.length === 0 ? (
            <div className="text-center py-40 border-2 border-dashed border-white/5 rounded-3xl">
              <p className="text-gray-500 uppercase tracking-widest font-bold italic">No se detectaron activos en esta categoría.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayProperties.map((prop, idx) => {
                const images = prop.images as string[] | null;
                const area = prop.areaTotal ? Number(prop.areaTotal) : 0;
                
                return (
                  <ScrollReveal key={prop.id} delay={(idx % 3) * 0.1} direction="up">
                    <PropertyCard 
                      id={prop.id}
                      name={prop.name}
                      propertyType={prop.propertyType as any}
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

      {/* CTA Final */}
      <section className="py-32 bg-gradient-to-t from-black to-background">
        <div className="container text-center">
          <ScrollReveal>
            <h2 className="vecy-title-hero uppercase">¿Buscas algo <span className="text-gradient-gold">específico</span>?</h2>
            <p className="vecy-subtitle max-w-2xl mx-auto mb-10">
              Activa nuestro motor de búsqueda personalizado y deja que JanIA encuentre el match perfecto para ti.
            </p>
            <button 
              onClick={() => navigate('/contact')}
              className="btn-gold px-12 py-5 text-lg tracking-widest uppercase"
            >
              CONTACTAR ASESOR
            </button>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-20">
        <div className="container text-center">
          <img src="/logo-vecy.png" alt="Vecy" className="h-10 mx-auto mb-8 opacity-40 grayscale" />
          <div className="flex justify-center gap-8 mb-12">
            <button onClick={() => navigate('/')} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-primary transition-colors">Inicio</button>
            <button onClick={() => navigate('/historia')} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-primary transition-colors">Historia</button>
            <button onClick={() => navigate('/services')} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-primary transition-colors">Servicios</button>
          </div>
          <p className="text-gray-600 text-[10px] uppercase tracking-[0.4em]">
            &copy; 2026 VECY NETWORK. Hecho para el Futuro.
          </p>
        </div>
      </footer>
    </div>
  );
}
