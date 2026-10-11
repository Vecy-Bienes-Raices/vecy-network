import React, { useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLocation } from 'wouter';
import { 
  MapPin, 
  ArrowRight,
  Zap,
  Cpu,
  Sparkles,
  GitCompare,
  ShieldCheck,
  CheckCircle2,
  BellRing,
  Bot,
  Layers,
  Search,
  Check
} from 'lucide-react';
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

  const handleJanIAContact = (customMessage: string) => {
    const encoded = encodeURIComponent(customMessage);
    window.open(`https://wa.me/573192919978?text=${encoded}`, '_blank');
  };

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
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-accent text-xs font-bold tracking-widest uppercase mb-6 shadow-[0_0_20px_rgba(191,149,63,0.15)]">
                  <Sparkles size={14} className="text-primary animate-pulse" />
                  PRIMER PORTAL INMOBILIARIO CON VERDADERA IA EN COLOMBIA
                </div>
                
                <h1 className="flex flex-col items-center mb-6">
                  <span className="font-['Audiowide'] text-white text-6xl sm:text-7xl md:text-8xl lg:text-9xl tracking-[0.16em] uppercase leading-none drop-shadow-[0_4px_30px_rgba(255,255,255,0.2)]">
                    VECY
                  </span>
                  <span className="font-['Audiowide'] text-gradient-gold text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-[0.25em] uppercase leading-tight mt-3">
                    BIENES RAÍCES
                  </span>
                </h1>
                
                <p className="vecy-subtitle max-w-3xl mx-auto mb-8 text-lg sm:text-xl md:text-2xl leading-relaxed text-zinc-300">
                  Erradicamos los clasificados pasivos. Nuestro motor cognitivo <strong className="text-white">JanIA</strong> cruza activamente Ofertas y Demandas en tiempo real: encuentra compradores y propiedades con precisión matemática y jurídica del 85% al 100%.
                  <span className="text-gradient-gold font-bold block mt-3 uppercase tracking-widest text-xs sm:text-sm">
                    🤖 JanIA Match Engine 24/7 • Cruce Activo de Negocios en Segundos
                  </span>
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-2xl mx-auto">
                  <button 
                    onClick={() => navigate('/ofertas')}
                    className="btn-gold px-8 py-4 text-sm sm:text-base tracking-[0.15em] font-bold group w-full sm:w-auto shadow-[0_0_30px_rgba(191,149,63,0.3)]"
                  >
                    EXPLORAR ACTIVOS
                    <ArrowRight className="inline-block ml-2 group-hover:translate-x-2 transition-transform" />
                  </button>
                  <button 
                    onClick={() => {
                      const el = document.getElementById('match-ia-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="btn-gold-subtle px-8 py-4 text-sm sm:text-base tracking-[0.15em] font-bold w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    <Cpu className="w-4 h-4 text-primary" />
                    CÓMO FUNCIONA EL MATCH
                  </button>
                  <button 
                    onClick={() => navigate('/demandas')}
                    className="btn-gold-outline px-8 py-4 text-sm sm:text-base tracking-[0.15em] font-bold w-full sm:w-auto"
                  >
                    VER DEMANDAS
                  </button>
                </div>

                <div className="mt-14 flex flex-wrap justify-center gap-8 sm:gap-14 border-t border-white/5 pt-10">
                  <div>
                    <p className="text-gradient-gold text-2xl sm:text-3xl font-display font-black mb-1 tracking-tighter">85% - 100%</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Umbral de Match</p>
                  </div>
                  <div>
                    <p className="text-gradient-gold text-2xl sm:text-3xl font-display font-black mb-1 tracking-tighter">10</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Variables con IA</p>
                  </div>
                  <div>
                    <p className="text-gradient-gold text-2xl sm:text-3xl font-display font-black mb-1 tracking-tighter">24/7</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Cruce en Tiempo Real</p>
                  </div>
                  <div>
                    <p className="text-gradient-gold text-2xl sm:text-3xl font-display font-black mb-1 tracking-tighter">100%</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Ecosistema Digital</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div 
          onClick={() => {
            const el = document.getElementById('match-ia-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-white">Descubre el Match</span>
          <div className="w-px h-12 bg-gradient-to-b from-primary to-transparent"></div>
        </div>
      </section>

      {/* 🧠 SECCIÓN PROTAGONISTA: EL PRIMER PORTAL INMOBILIARIO QUE USA IA EN REALIDAD — SISTEMA DE MATCH 24/7 */}
      <section id="match-ia-section" className="py-24 bg-gradient-to-b from-black via-[#0d111a] to-background border-b border-primary/30 relative overflow-hidden">
        {/* Luces neurales de fondo */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-primary/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="container max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <ScrollReveal delay={0.1}>
            <div className="text-center max-w-4xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-accent text-xs font-bold tracking-widest uppercase mb-4 shadow-[0_0_20px_rgba(191,149,63,0.15)]">
                <Cpu size={14} className="text-primary animate-pulse" />
                EL SANTO GRIAL PROPTECH • TECNOLOGÍA PROPIETARIA ÚNICA EN COLOMBIA
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white uppercase tracking-tight mb-6">
                EL PRIMER PORTAL QUE <span className="text-gradient-gold">USA IA EN REALIDAD</span>
              </h2>
              <div className="line-electric w-40 mx-auto mb-6"></div>
              <p className="text-zinc-300 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
                Los portales tradicionales como Metrocuadrado o FincaRaíz son <strong>cementerios pasivos de inmuebles</strong>: tú publicas y esperas meses a ver si alguien busca. En <strong className="text-white">Vecy Bienes Raíces</strong> no esperamos: nuestro cerebro de Inteligencia Artificial (<strong className="text-primary">JanIA</strong>) cruza activamente cada inmueble con las necesidades reales de compradores e inversionistas las 24 horas del día.
              </p>
            </div>

            <div className="vecy-card-apple p-6 sm:p-12 border-primary/40 bg-gradient-to-br from-[#121622]/95 via-[#0e121b]/95 to-black/95 shadow-[0_0_80px_rgba(191,149,63,0.2)]">
              <div className="grid lg:grid-cols-12 gap-10 items-center">
                
                {/* Columna Izquierda: Los 4 Pilares del Match Engine */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="border-b border-white/10 pb-4">
                    <span className="text-xs font-bold text-primary uppercase tracking-widest">ARQUITECTURA DE COGNICIÓN PREDIAL</span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">Cómo Funciona el Motor de Match Cruzado 24/7</h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 transition-colors">
                      <div className="flex items-center gap-2.5 text-primary font-bold text-sm mb-2 uppercase tracking-wider">
                        <Bot size={18} className="text-primary" />
                        <span>1. Ingesta Semántica</span>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        JanIA procesa lenguaje natural libre desde WhatsApp y el portal. Extrae especificaciones sin formularios aburridos ni fricción.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 transition-colors">
                      <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm mb-2 uppercase tracking-wider">
                        <GitCompare size={18} className="text-emerald-400" />
                        <span>2. Cruce de 10 Variables</span>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Ponderación matemática de 100 puntos: Tipo, negocio, ubicación, presupuesto, áreas, alcobas, baños, garajes y antigüedad.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 transition-colors">
                      <div className="flex items-center gap-2.5 text-accent font-bold text-sm mb-2 uppercase tracking-wider">
                        <ShieldCheck size={18} className="text-accent" />
                        <span>3. Filtros Duros (85%-100%)</span>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Cero falsos positivos. Si el área es menor a lo exigido o el precio supera el presupuesto: match descartado automáticamente.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 transition-colors">
                      <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm mb-2 uppercase tracking-wider">
                        <BellRing size={18} className="text-amber-400" />
                        <span>4. Notificación Instantánea</span>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Al producirse el match, el sistema notifica de inmediato al Captador y Colocador para coordinar visita y cerrar el negocio.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button 
                      onClick={() => navigate('/demandas')}
                      className="btn-gold px-6 py-3.5 text-xs font-extrabold tracking-widest uppercase shadow-[0_0_25px_rgba(191,149,63,0.3)] flex-1 sm:flex-none"
                    >
                      PUBLICAR MI DEMANDA
                    </button>
                    <button 
                      onClick={() => navigate('/ofertas')}
                      className="btn-gold-subtle px-6 py-3.5 text-xs font-extrabold tracking-widest uppercase flex-1 sm:flex-none"
                    >
                      EXPLORAR OFERTAS
                    </button>
                    <button 
                      onClick={() => handleJanIAContact("JanIA, quiero publicar lo que estoy buscando para que tu motor de MATCH me encuentre el inmueble ideal.")}
                      className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-black transition-all text-xs font-extrabold uppercase flex items-center justify-center gap-2"
                    >
                      <Bot size={15} />
                      PROBAR MATCH CON JANIA
                    </button>
                  </div>
                </div>

                {/* Columna Derecha: Tarjeta de Simulación en Vivo (JanIA Match Engine v32) */}
                <div className="lg:col-span-5">
                  <div className="p-6 sm:p-7 rounded-2xl bg-black/70 border border-primary/40 backdrop-blur-md shadow-2xl relative">
                    <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                          <Cpu size={18} />
                        </div>
                        <div>
                          <h4 className="text-white font-bold text-xs uppercase tracking-wider">JanIA Match Engine v32</h4>
                          <span className="text-[10px] text-zinc-400">Bogotá D.C. & Sabana Norte</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        ACTIVO 24/7
                      </span>
                    </div>

                    {/* Comparador Visual Oferta vs Demanda */}
                    <div className="space-y-3.5 mb-5">
                      {/* Oferta Captada */}
                      <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px] font-bold text-primary uppercase">🏠 OFERTA CAPTADA #VECY-842</span>
                          <span className="text-[10px] text-zinc-400">Bogotá • Rosales</span>
                        </div>
                        <p className="text-white text-xs font-semibold">Apartamento de Autor • $1.650.000.000 COP</p>
                        <p className="text-[11px] text-zinc-400 mt-1">165 m² • 3 Alcobas • 4 Baños • 3 Garajes Indep • Estrato 6</p>
                      </div>

                      {/* Demanda Registrada */}
                      <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px] font-bold text-emerald-400 uppercase">🎯 REQUERIMIENTO CLIENTE #REQ-190</span>
                          <span className="text-[10px] text-zinc-400">Comprador Calificado</span>
                        </div>
                        <p className="text-white text-xs font-semibold">Busca en Rosales / Chicó • Presupuesto: $1.700.000.000 COP</p>
                        <p className="text-[11px] text-zinc-400 mt-1">Mínimo 150 m² • 3 Alcobas • Garajes Independientes</p>
                      </div>

                      {/* Barra de Match Result */}
                      <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                            <Sparkles size={14} className="text-primary animate-pulse" />
                            MATCH EXITOSO CONFIRMADO
                          </span>
                          <span className="text-xs font-black text-primary">96% COMPATIBILIDAD</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-2">
                          <div className="h-full bg-gradient-to-r from-primary to-amber-300 w-[96%] rounded-full shadow-[0_0_15px_rgba(191,149,63,0.8)]"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[10px] text-zinc-300 pt-1">
                          <div className="flex items-center gap-1">
                            <Check size={11} className="text-emerald-400" />
                            <span>Ubicación: 20/20 pts</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Check size={11} className="text-emerald-400" />
                            <span>Presupuesto: 15/15 pts</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Check size={11} className="text-emerald-400" />
                            <span>Área Confort: 10/10 pts</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Check size={11} className="text-emerald-400" />
                            <span>Garaje Indep: 4/4 pts</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-center pt-1">
                      <p className="text-[11px] text-zinc-400 italic">
                        ⚡ Notificación automática enviada a las partes en 8 segundos vía WhatsApp.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* FEATURED PROPERTIES — CON EL MISMO ESTILO EXACTO DE LA TIENDA DE OFERTAS */}
      <section className="py-24 bg-background relative z-10">
        <div className="container px-4 md:px-6">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div>
                <p className="vecy-accent-tag mb-4">Portafolio Curado</p>
                <h2 className="vecy-title-section text-left">PROPIEDADES <span className="text-gradient-gold">DE AUTOR</span></h2>
              </div>
              <button 
                onClick={() => navigate('/ofertas')}
                className="text-[12px] font-black text-white hover:text-primary transition-colors flex items-center gap-2 group tracking-[0.2em] cursor-pointer"
              >
                VER TODO EL INVENTARIO <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
