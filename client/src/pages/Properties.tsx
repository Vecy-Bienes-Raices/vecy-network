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

// ─── PORTAFOLIO OFICIAL VECY BIENES RAÍCES ────────────────────────────────────
// GitHub: Vecy-Bienes-Raices
// Sincronización Técnica: 01-04-2026
// ─────────────────────────────────────────────────────────────────────────────
const PORTFOLIO = [

  // ══════════════════════════════════════════════════════════
  // EDIFICIOS
  // ══════════════════════════════════════════════════════════

  {
    id: 'edificio-teusaquillo',
    name: 'Edificio en San Luis',
    propertyType: 'building' as const,
    price: 3_000_000_000,
    location: 'Bogotá, Teusaquillo',
    neighborhood: 'San Luis',
    locality: 'Teusaquillo',
    city: 'Bogotá',
    bedrooms: 20, // 20 Hab + Local/Officinas
    bathrooms: 15,
    area: 1068,
    parking: 0,
    yearBuilt: 2024, // Recién remodelado
    featured: true,
    fichaUrl: 'https://edificio-teusaquillo-bogota.netlify.app/',
    image: 'https://edificio-teusaquillo-bogota.netlify.app/assets/1.png',
    gallery: [
      'https://edificio-teusaquillo-bogota.netlify.app/assets/1.png',
    ],
    description: 'Venta de edificio híbrido en Teusaquillo rentando $18.9M. 4 pisos: local, clínica, oficinas y 20 hab. ideales para Airbnb. Recién remodelado.',
  },

  {
    id: 'edificio-santa-barbara',
    name: 'Edificio en Santa Bárbara',
    propertyType: 'building' as const,
    price: 18_000_000_000, // Auditado: $18.000 Millones
    location: 'Bogotá, Usaquén',
    neighborhood: 'Santa Bárbara',
    locality: 'Usaquén',
    city: 'Bogotá',
    bedrooms: 26, // Auditado: 26 Apartamentos
    bathrooms: 26,
    area: 5000,
    parking: 43,
    yearBuilt: 2009, // Auditado: Año 2009
    featured: true,
    fichaUrl: 'https://edificio-santa-barbara-bogota.netlify.app/',
    image: 'https://static.wixstatic.com/media/334454_47f092e1f6bc419b8641c50b62c8d482~mv2.jpg',
    gallery: [
      'https://static.wixstatic.com/media/334454_47f092e1f6bc419b8641c50b62c8d482~mv2.jpg',
    ],
    description: 'Edificio completo en venta con 26 apartamentos en Santa Bárbara, Usaquén. 5.000 m² construidos, 43 parqueaderos, amenidades completas.',
  },

  {
    id: 'edificio-castellana',
    name: 'Edificio en La Castellana',
    propertyType: 'building' as const,
    price: 5_000_000_000, // Auditado: $5.000 Millones
    location: 'Bogotá, Barrios Unidos',
    neighborhood: 'La Castellana',
    locality: 'Barrios Unidos',
    city: 'Bogotá',
    bedrooms: 7, // Auditado: 7 Apartamentos
    bathrooms: 7,
    area: 871,
    parking: 9,
    yearBuilt: 2002, // Auditado: Año 2002
    featured: true,
    fichaUrl: 'https://edificio-castellana-bogota.netlify.app/',
    image: 'https://edificio-castellana-bogota.netlify.app/assets/1.jpg',
    gallery: [
      'https://edificio-castellana-bogota.netlify.app/assets/1.jpg',
    ],
    description: 'Edificio exclusivo en La Castellana, Bogotá. 871 m², 5 pisos, 7 apartamentos independientes incluyendo Pent-house. Ideal inversión.',
  },

  // ══════════════════════════════════════════════════════════
  // HOTEL
  // ══════════════════════════════════════════════════════════

  {
    id: 'hotel-quinta-paredes',
    name: 'Hotel en Quinta Paredes',
    propertyType: 'hotel' as const,
    price: 2_500_000_000, // Auditado: $2.500 Millones
    location: 'Bogotá, Teusaquillo',
    neighborhood: 'Quinta Paredes',
    locality: 'Teusaquillo',
    city: 'Bogotá',
    bedrooms: 14, // 14 Hab + Penthouse
    bathrooms: 15,
    area: 493, // Auditado: 493 m2
    parking: 1,
    yearBuilt: 2012,
    featured: true,
    fichaUrl: 'https://hotel-quinta-paredes-bogota.netlify.app/',
    image: 'https://hotel-quinta-paredes-bogota.netlify.app/assets/1.1.png',
    gallery: [
      'https://hotel-quinta-paredes-bogota.netlify.app/assets/1.1.png',
    ],
    description: 'Hotel Cerca de Corferias: Elegancia y Rentabilidad Estratégica. 14 Habitaciones, Penthouse, Rentabilidad Comprobada.',
  },

  // ══════════════════════════════════════════════════════════
  // CASAS
  // ══════════════════════════════════════════════════════════

  {
    id: 'casa-la-calleja',
    name: 'Casa en La Calleja',
    propertyType: 'house' as const,
    price: 890_000_000, // Auditado: $890 Millones
    location: 'Bogotá, Usaquén',
    neighborhood: 'La Calleja',
    locality: 'Usaquén',
    city: 'Bogotá',
    bedrooms: 3, // 3 Hab + 2 Estudios
    bathrooms: 3,
    area: 150, // Auditado: 150 m2 construidos
    parking: 2,
    yearBuilt: 1976, // Auditado: 1976 (Remodelada 2015)
    featured: true,
    fichaUrl: 'https://casa-la-calleja-bogota.netlify.app/',
    image: 'https://casa-la-calleja-bogota.netlify.app/assets/14.jpg',
    gallery: [
      'https://casa-la-calleja-bogota.netlify.app/assets/14.jpg',
    ],
    description: 'Casa chalet de 150m² con 3 habitaciones, 3 baños, estudio, terrazas y remodelación integral. Oportunidad única en La Calleja.',
  },

  {
    id: 'casa-polo-club',
    name: 'Casa en Polo Club',
    propertyType: 'house' as const,
    price: 1_250_000_000, // Auditado: $1.250 Millones
    location: 'Bogotá, Barrios Unidos',
    neighborhood: 'Polo Club',
    locality: 'Chapinero',
    city: 'Bogotá',
    bedrooms: 5,
    bathrooms: 4,
    area: 205,
    parking: 3,
    yearBuilt: 1986, // Auditado: 1986
    featured: true,
    fichaUrl: 'https://casa-polo-club-bogota.netlify.app/',
    image: 'https://casa-polo-club-bogota.netlify.app/assets/1.jpg',
    gallery: [
      'https://casa-polo-club-bogota.netlify.app/assets/1.jpg',
    ],
    description: 'Excelente oportunidad. Casa de 204.79 m² en el barrio Polo Club, Bogotá. 5 habitaciones, 4 baños, 3 parqueaderos, patio automatizado.',
  },

  // ══════════════════════════════════════════════════════════
  // APARTAMENTOS
  // ══════════════════════════════════════════════════════════

  {
    id: 'apto-cedritos-nuevo',
    name: 'Apartamento en Cedritos',
    propertyType: 'apartment' as const,
    price: 1300000000,
    location: 'Bogotá, Usaquén',
    neighborhood: 'Cedritos',
    locality: 'Usaquén',
    city: 'Bogotá',
    bedrooms: 3,
    bathrooms: 4,
    area: 152,
    parking: 2,
    yearBuilt: 2026,
    featured: true,
    fichaUrl: 'https://ap-nuevo-cedritos-bog.netlify.app/',
    image: 'https://ap-nuevo-cedritos-bog.netlify.app/assets/portada_video_fotos_redes_enlaces.png',
    gallery: [
      'https://ap-nuevo-cedritos-bog.netlify.app/assets/portada_video_fotos_redes_enlaces.png',
    ],
    description: '¡Oportunidad única! 151.70m² + Terraza Privada 84m². 3 Hab c/u con baño. Proyecto premium en Cedritos.',
  },

  {
    id: 'apto-cantalejo',
    name: 'Apartamento en Cantalejo',
    propertyType: 'apartment' as const,
    price: 470000000,
    location: 'Bogotá, Suba',
    neighborhood: 'Cantalejo',
    locality: 'Suba',
    city: 'Bogotá',
    bedrooms: 3,
    bathrooms: 2,
    area: 71,
    parking: 1,
    yearBuilt: 2018,
    featured: true,
    fichaUrl: 'https://ap-cantalejo-bogota.netlify.app/',
    image: 'https://ap-cantalejo-bogota.netlify.app/assets/1.jpeg',
    gallery: [
      'https://ap-cantalejo-bogota.netlify.app/assets/1.jpeg',
    ],
    description: 'Inversión en Cantalejo. Apartamento iluminado de 71m² (3 Hab + Estudio + Balcón). Zona de alta valorización.',
  },

  {
    id: 'apto-bucaramanga',
    name: 'Apartamento en Floridablanca',
    propertyType: 'apartment' as const,
    price: 500000000,
    location: 'Bucaramanga, Santander',
    neighborhood: 'Floridablanca',
    locality: 'Floridablanca',
    city: 'Floridablanca',
    bedrooms: 3,
    bathrooms: 2,
    area: 130,
    parking: 1,
    yearBuilt: 2014,
    featured: true,
    fichaUrl: 'https://apartamento-bumanga-santander.netlify.app/',
    image: 'https://apartamento-bumanga-santander.netlify.app/assets/3.jpeg',
    gallery: [
      'https://apartamento-bumanga-santander.netlify.app/assets/3.jpeg',
    ],
    description: 'Espectacular apartamento de 130m² en Floridablanca. Terraza Privada, 3 Alcobas y Club House. Permuta 50/50 Bogotá.',
  },

  {
    id: 'apto-cedritos-venta',
    name: 'Apartamento en Cedritos - Zaira',
    propertyType: 'apartment' as const,
    price: 480000000,
    location: 'Bogotá, Usaquén',
    neighborhood: 'Cedritos',
    locality: 'Usaquén',
    city: 'Bogotá',
    bedrooms: 3,
    bathrooms: 2,
    area: 83,
    parking: 1,
    yearBuilt: 1993,
    featured: false,
    fichaUrl: 'https://ap-cedritos-bog-ce01.netlify.app/',
    image: 'https://ap-cedritos-bog-ce01.netlify.app/assets/1.jpeg',
    gallery: [
      'https://ap-cedritos-bog-ce01.netlify.app/assets/1.jpeg',
    ],
    description: '¿Buscas apartamento clásico en Cedritos? Gran inmueble de 83m², 3 alcobas, 2 baños y estudio. Potencial inmenso para remodelar.',
  },

  {
    id: 'apto-san-patricio',
    name: 'Apartamento en San Patricio',
    propertyType: 'apartment' as const,
    price: 2_000_000_000,
    location: 'Bogotá, Usaquén',
    neighborhood: 'San Patricio',
    locality: 'Usaquén',
    city: 'Bogotá',
    bedrooms: 5,
    bathrooms: 5,
    area: 243,
    parking: 3,
    yearBuilt: 2004, // Auditado: 2004
    featured: true,
    fichaUrl: 'https://apto-san-patricio-bog.netlify.app/',
    image: 'https://apto-san-patricio-bog.netlify.app/assets/1.jpg',
    gallery: [
      'https://apto-san-patricio-bog.netlify.app/assets/1.jpg',
    ],
    description: 'Apartamento en San Patricio Bogotá - $2.000 Millones - 243m² - 5 Habitaciones - 5 Baños - 3 Garajes - Estrato 6. Exclusividad.',
  },

  {
    id: 'apto-mirador-puerto-suba',
    name: 'Apartamento en Mirador del Puerto',
    propertyType: 'apartment' as const,
    price: 680_000_000, // Auditado: $680 Millones
    location: 'Bogotá, Suba',
    neighborhood: 'Mirador del Puerto',
    locality: 'Suba',
    city: 'Bogotá',
    bedrooms: 3,
    bathrooms: 2,
    area: 120, // 120 m2
    parking: 2,
    yearBuilt: 1990, // Auditado: 1990
    featured: false,
    fichaUrl: 'https://apto-mirador-puerto-suba.netlify.app/',
    image: 'https://apto-mirador-puerto-suba.netlify.app/assets/0.0.png',
    gallery: [
      'https://apto-mirador-puerto-suba.netlify.app/assets/0.0.png',
    ],
    description: 'Descubre este amplio apartamento de 120 m² en Mirador del Puerto, Suba. Vista al Club Los Lagartos y excelentes amenidades.',
  },

];

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

  const displayProperties = useMemo(() => {
    let list = activeFilter === 'all'
      ? PORTFOLIO
      : PORTFOLIO.filter((p) => p.propertyType === activeFilter);

    if (sortBy === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);

    return list;
  }, [activeFilter, sortBy]);

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

          {displayProperties.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              No hay propiedades en esta categoría.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayProperties.map((prop, idx) => (
                <div
                  key={prop.id}
                  className="animate-slide-in-up"
                  style={{ animationDelay: `${idx * 0.04}s` }}
                >
                  <PropertyCard {...prop} />
                </div>
              ))}
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
