import React, { useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLocation } from 'wouter';
import { ArrowRight } from 'lucide-react';
import NetworkBackground from '@/components/NetworkBackground';
import { ScrollReveal } from '@/components/ScrollReveal';
import PropertyCard from '@/components/PropertyCard';
import { trpc } from '@/lib/trpc';

const fallbackAuthorProperties = [
  {
    id: 1,
    name: "Edificio de Conservación Teusaquillo",
    propertyType: "edificio" as const,
    transactionType: "venta",
    price: 2800000000,
    location: "Teusaquillo, Bogotá",
    zone: "Norte",
    neighborhood: "Teusaquillo",
    city: "Bogotá",
    bedrooms: 12,
    bathrooms: 8,
    area: 450,
    parking: 4,
    images: ["https://images.unsplash.com/photo-1577495508048-b635879837f1?q=80&w=2000&auto=format&fit=crop"],
    featured: true
  },
  {
    id: 2,
    name: "Apartamento de Lujo Santa Bárbara",
    propertyType: "apartamento" as const,
    transactionType: "venta",
    price: 1450000000,
    location: "Santa Bárbara, Bogotá",
    zone: "Norte",
    neighborhood: "Santa Bárbara",
    city: "Bogotá",
    bedrooms: 3,
    bathrooms: 4,
    area: 185,
    parking: 2,
    images: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop"],
    featured: true
  },
  {
    id: 3,
    name: "Casa Moderna en Chicó Alto",
    propertyType: "casa" as const,
    transactionType: "venta",
    price: 5200000000,
    location: "Chicó Alto, Bogotá",
    zone: "Norte",
    neighborhood: "Chicó Alto",
    city: "Bogotá",
    bedrooms: 4,
    bathrooms: 5,
    area: 320,
    parking: 3,
    images: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2000&auto=format&fit=crop"],
    featured: true
  }
];

export default function Home() {
  const [, navigate] = useLocation();

  const { data: serverProperties } = trpc.properties.list.useQuery({ limit: 6 });

  const authorProperties = useMemo(() => {
    if (serverProperties && serverProperties.length >= 3) {
      return serverProperties.slice(0, 3);
    }
    return fallbackAuthorProperties;
  }, [serverProperties]);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden border-b border-white/5 pt-20">
        <NetworkBackground />
        
        <div className="container relative z-10 px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <ScrollReveal delay={0.2}>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-3 mb-6">
                  <span className="vecy-accent-tag">Tecnología de Vanguardia</span>
                  <div className="h-px w-12 bg-primary/40"></div>
                </div>
                
                <h1 className="vecy-title-hero flex flex-col items-center mb-6">
                  <span className="text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-[0.14em] font-black uppercase leading-none drop-shadow-[0_4px_30px_rgba(255,255,255,0.15)]">
                    VECY
                  </span>
                  <span className="text-gradient-gold text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.22em] font-extrabold uppercase leading-tight mt-3">
                    BIENES RAÍCES
                  </span>
                </h1>
                
                <p className="vecy-subtitle max-w-2xl mx-auto mb-10 text-lg sm:text-xl md:text-2xl leading-relaxed text-zinc-300">
                  La evolución inevitable para el sector de los bienes raíces en Colombia.
                  <span className="text-white font-bold block mt-3 uppercase tracking-widest text-xs sm:text-sm">
                    Tu Red Inmobiliaria Inteligente
                  </span>
                </p>
                
                <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
                  <button 
                    onClick={() => navigate('/ofertas')}
                    className="btn-gold px-10 py-5 text-base sm:text-lg tracking-[0.2em] font-bold group w-full sm:w-auto shadow-[0_0_30px_rgba(191,149,63,0.25)]"
                  >
                    EXPLORAR ACTIVOS
                    <ArrowRight className="inline-block ml-3 group-hover:translate-x-2 transition-transform" />
                  </button>
                  <button 
                    onClick={() => navigate('/historia')}
                    className="btn-gold-outline px-10 py-5 text-base sm:text-lg tracking-[0.2em] font-bold w-full sm:w-auto"
                  >
                    NUESTRA HISTORIA
                  </button>
                </div>

                <div className="mt-16 flex justify-center gap-10 sm:gap-16 border-t border-white/5 pt-12">
                  <div>
                    <p className="text-primary text-2xl sm:text-3xl font-display font-black mb-1 tracking-tighter">8+</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Años de Trayectoria</p>
                  </div>
                  <div>
                    <p className="text-primary text-2xl sm:text-3xl font-display font-black mb-1 tracking-tighter">100%</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Digital & Seguro</p>
                  </div>
                  <div>
                    <p className="text-primary text-2xl sm:text-3xl font-display font-black mb-1 tracking-tighter">40/20/40</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Red Colaborativa</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div 
          onClick={() => {
            window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
          }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-white">Explorar</span>
          <div className="w-px h-12 bg-gradient-to-b from-primary to-transparent"></div>
        </div>
      </section>

      {/* INMUEBLES DESTACADOS — CON EL MISMO ESTILO EXACTO DE LA TIENDA DE OFERTAS */}
      <section className="py-24 bg-background relative z-10">
        <div className="container px-4 md:px-6">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div>
                <p className="vecy-accent-tag mb-4">Oportunidades Seleccionadas</p>
                <h2 className="vecy-title-section text-left">INMUEBLES <span className="text-gradient-gold">DESTACADOS</span></h2>
              </div>
              <button 
                onClick={() => navigate('/ofertas')}
                className="text-[12px] font-black text-white hover:text-primary transition-colors flex items-center gap-2 group tracking-[0.2em] cursor-pointer"
              >
                VER TODAS LAS PROPIEDADES <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {authorProperties.map((prop: any, index: number) => {
              const images = prop.images as string[] | null;
              const area = prop.areaTotal ? Number(prop.areaTotal) : (prop.area || 0);
              const piso = prop.floorDetail || prop.amenities?.pisoEdificio || undefined;

              return (
                <ScrollReveal key={prop.id} delay={index * 0.1} direction="up">
                  <PropertyCard
                    id={prop.id}
                    name={prop.name}
                    propertyType={prop.propertyType as any}
                    transactionType={prop.transactionType || 'venta'}
                    price={Number(prop.price)}
                    location={prop.location || ''}
                    zone={prop.zone}
                    neighborhood={prop.addressNeighborhood || prop.neighborhood}
                    locality={prop.addressLocality}
                    city={prop.addressCity || prop.city || 'Bogotá'}
                    bedrooms={prop.bedrooms || 0}
                    bathrooms={prop.bathrooms || 0}
                    area={area}
                    parking={prop.garages || prop.parking || 0}
                    piso={piso}
                    yearBuilt={prop.yearBuilt}
                    image={images?.[0] || prop.image || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop'}
                    gallery={images || (prop.image ? [prop.image] : [])}
                    featured={prop.featured || false}
                  />
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECCIÓN DE IMPACTO: EVOLUCIÓN INEVITABLE */}
      <section className="py-24 bg-background relative overflow-hidden border-y border-white/5">
        <div className="container relative z-10 text-center">
          <ScrollReveal direction="none">
            <h2 className="vecy-title-hero">
              LA <span className="text-gradient-gold uppercase">EVOLUCIÓN INEVITABLE</span> INMOBILIARIA
            </h2>
            <div className="line-electric w-48 mx-auto mb-10"></div>
            <p className="vecy-subtitle max-w-3xl mx-auto text-xl">
              Estamos extinguiendo los procesos obsoletos de los dinosaurios del sector.
              Velocidad, transparencia y tecnología de punta.
            </p>
            <button
              onClick={() => navigate('/historia')}
              className="btn-gold px-12 py-5 text-lg tracking-widest uppercase shadow-[0_0_30px_rgba(191,149,63,0.2)]"
            >
              CONOCER LA LEYENDA
            </button>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
