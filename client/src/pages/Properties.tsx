/**
 * PROPERTIES PAGE - VECY TECH REAL ESTATE
 *
 * Catálogo completo de propiedades estandarizado (Gold Edition).
 * Todos los datos (Precio, Área, Antigüedad) están auditados y sincronizados
 * con las fichas técnicas oficiales de cada inmueble.
 */

import Navbar from '@/components/Navbar';
import PropertyCard from '@/components/PropertyCard';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';

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
  land: 'Terrenos', // Para evitar alertas en TikTok/FB usamos Terrenos en lugar de Lotes
  commercial: 'Comercial',
};

export default function Properties() {
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

      {/* ── Hero ── */}
      <section className="pt-32 pb-10 bg-gradient-to-b from-black to-background">
        <div className="container">
          <div className="text-center mb-6">
            <h1 className="text-5xl md:text-6xl font-display font-bold tracking-wider mb-4">
              CATÁLOGO DE <span className="text-accent">PROPIEDADES</span>
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto text-sm">
              Descubre nuestro portafolio exclusivo de propiedades premium en Bogotá y principales ciudades de Colombia
            </p>
          </div>
        </div>
      </section>

      {/* ── Filtros y ordenamiento ── */}
      <section className="py-6 bg-background border-b border-white/10 sticky top-0 z-30 backdrop-blur-md bg-background/90">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex gap-2 flex-wrap justify-center">
            {(Object.keys(FILTER_LABELS) as FilterType[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  activeFilter === key
                    ? 'bg-accent text-accent-foreground shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                    : 'bg-white/5 text-gray-400 hover:bg-white/5 hover:text-white border border-white/10'
                }`}
              >
                {FILTER_LABELS[key]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent"
            >
              <option value="default">Destacados primero</option>
              <option value="price-asc">Menor precio</option>
              <option value="price-desc">Mayor precio</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── Grid ── */}
      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white uppercase tracking-wider">
              {displayProperties.length}{' '}
              {displayProperties.length === 1 ? 'Propiedad' : 'Propiedades'} en Portafolio
            </h2>
            <div className="line-gold w-16 mt-3" />
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20 text-gray-400">
              <Loader2 className="animate-spin w-8 h-8 text-accent mr-3" />
              <span>Cargando catálogo...</span>
            </div>
          ) : displayProperties.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              No hay propiedades en esta categoría.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayProperties.map((prop, idx) => {
                const images = prop.images as string[] | null;
                const area = prop.areaSquareMeters ? Number(prop.areaSquareMeters) : 0;
                
                return (
                  <div
                    key={prop.id}
                    className="animate-slide-in-up"
                    style={{ animationDelay: `${idx * 0.04}s` }}
                  >
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-gradient-to-b from-background to-black">
        <div className="container text-center">
          <h2 className="text-4xl font-bold text-white mb-6 uppercase tracking-wider">
            ¿No Encontraste Lo Que Buscas?
          </h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto text-sm">
            Nuestro equipo de expertos puede ayudarte a encontrar la propiedad perfecta según tus necesidades específicas.
          </p>
          <a href="/#contacto" className="btn-gold">CONTACTAR A UN ASESOR</a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-black border-t border-white/10 py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider">Vecy</h4>
              <p className="text-gray-400 text-sm">Liderazgo en tecnología inmobiliaria.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider">Navegación</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/" className="hover:text-accent transition-colors">Inicio</a></li>
                <li><a href="/properties" className="hover:text-accent transition-colors">Propiedades</a></li>
                <li><a href="/#blog" className="hover:text-accent transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-accent transition-colors">Términos</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Privacidad</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider">Contacto</h4>
              <p className="text-gray-400 text-sm">
                +57 316 656 9719<br />
                vecybienesraices@gmail.com
              </p>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-gray-500 text-sm">
            <p>&copy; 2026 Vecy. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
