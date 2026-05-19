import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import PropertyCard from '@/components/PropertyCard';
import { useLocation } from 'wouter';
import { 
  Building2, 
  Search, 
  TrendingUp, 
  MapPin, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import NetworkBackground from '@/components/NetworkBackground';
import { ScrollReveal } from '@/components/ScrollReveal';

const mockProperties = [
  {
    id: 1,
    title: "Edificio de Conservación Teusaquillo",
    price: "$2.800.000.000",
    location: "Teusaquillo, Bogotá",
    beds: 12,
    baths: 8,
    sqft: 450,
    image: "https://images.unsplash.com/photo-1577495508048-b635879837f1?q=80&w=2000&auto=format&fit=crop"
  },
  {
    id: 2,
    title: "Apartamento de Lujo Santa Bárbara",
    price: "$1.450.000.000",
    location: "Santa Bárbara, Bogotá",
    beds: 3,
    baths: 4,
    sqft: 185,
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop"
  },
  {
    id: 3,
    title: "Casa Moderna en Chicó Alto",
    price: "$5.200.000.000",
    location: "Chicó Alto, Bogotá",
    beds: 4,
    baths: 5,
    sqft: 320,
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2000&auto=format&fit=crop"
  }
];

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden border-b border-white/5 pt-20">
        <NetworkBackground />
        
        <div className="container relative z-10 px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal direction="left" delay={0.2}>
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="vecy-accent-tag">Tecnología de Vanguardia</span>
                  <div className="h-px w-12 bg-primary/40"></div>
                </div>
                
                <h1 className="vecy-title-hero text-left mb-6">
                  LA <span className="text-gradient-gold uppercase">EVOLUCIÓN</span><br />
                  INEVITABLE DEL SECTOR
                </h1>
                
                <p className="vecy-subtitle text-left max-w-xl mb-10 text-xl md:text-2xl leading-relaxed">
                  Eliminamos la fricción inmobiliaria con Inteligencia Artificial. 
                  <span className="text-white font-bold block mt-4 italic opacity-80">Cero Esfuerzo. Máxima Precisión.</span>
                </p>
                
                <div className="flex flex-col sm:flex-row gap-5">
                  <button 
                    onClick={() => navigate('/properties')}
                    className="btn-gold px-10 py-5 text-lg tracking-[0.2em] font-bold group"
                  >
                    EXPLORAR ACTIVOS
                    <ArrowRight className="inline-block ml-3 group-hover:translate-x-2 transition-transform" />
                  </button>
                  <button 
                    onClick={() => navigate('/historia')}
                    className="btn-gold-outline px-10 py-5 text-lg tracking-[0.2em] font-bold hover:bg-white/5"
                  >
                    NUESTRA VISIÓN
                  </button>
                </div>

                <div className="mt-16 grid grid-cols-3 gap-8 border-t border-white/5 pt-12 max-w-lg">
                  <div>
                    <p className="text-primary text-3xl font-display font-black mb-1 tracking-tighter">8+</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Años de Visión</p>
                  </div>
                  <div>
                    <p className="text-primary text-3xl font-display font-black mb-1 tracking-tighter">100%</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Cero Papel</p>
                  </div>
                  <div>
                    <p className="text-primary text-3xl font-display font-black mb-1 tracking-tighter">∞</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Efecto Viral</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={0.4} className="hidden lg:block">
              <div className="relative group">
                {/* Floating Elements */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 blur-[100px] rounded-full group-hover:bg-primary/30 transition-all duration-700 animate-pulse"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/20 blur-[120px] rounded-full group-hover:bg-primary/40 transition-all duration-700 delay-300"></div>
                
                <div className="vecy-card-apple p-1 relative overflow-hidden group hover:scale-[1.02] transition-all duration-700 border-primary/20">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <video 
                    autoPlay 
                    muted 
                    loop 
                    playsInline
                    className="w-full aspect-video object-cover rounded-2xl"
                    poster="/portada_vecy_1.png"
                  >
                    <source src="/video_promocional.mp4" type="video/mp4" />
                  </video>
                  <div className="absolute top-6 right-6">
                    <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
                      <span className="text-[10px] font-bold text-white tracking-[0.2em] uppercase">VECY CORE ACTIVO</span>
                    </div>
                  </div>
                </div>

                {/* Info Overlay */}
                <div className="absolute -bottom-12 -right-8 max-w-[280px] p-6 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700 delay-200">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Matching Real-Time</h4>
                      <p className="text-[10px] text-gray-400">JanIA Procesando 24/7</p>
                    </div>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-primary animate-shimmer"></div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
          <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-white">Explorar</span>
          <div className="w-px h-12 bg-gradient-to-b from-primary to-transparent"></div>
        </div>
      </section>

      {/* FEATURED PROPERTIES */}
      <section className="py-32 bg-background relative z-10">
        <div className="container">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div>
                <p className="vecy-accent-tag mb-4">Portafolio Curado</p>
                <h2 className="vecy-title-section text-left">PROPIEDADES <span className="text-primary">DE AUTOR</span></h2>
              </div>
              <button 
                onClick={() => navigate('/properties')}
                className="text-[12px] font-black text-white hover:text-primary transition-colors flex items-center gap-2 group tracking-[0.2em]"
              >
                VER TODO EL INVENTARIO <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {mockProperties.map((prop, index) => (
              <ScrollReveal key={prop.id} delay={index * 0.1}>
                <div className="group cursor-pointer">
                  <div className="vecy-card-apple p-0 overflow-hidden border-white/5 group-hover:border-primary/40 transition-all duration-500">
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <img 
                        src={prop.image} 
                        alt={prop.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60"></div>
                      <div className="absolute bottom-0 left-0 p-8 w-full">
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="text-[10px] font-bold text-white tracking-[0.2em] uppercase">{prop.location}</span>
                        </div>
                        <h3 className="text-2xl font-display font-black text-white group-hover:text-primary transition-colors mb-4">{prop.title}</h3>
                        <div className="text-primary text-2xl font-display font-black tracking-tighter mb-4">{prop.price}</div>
                        
                        <div className="flex items-center gap-6 border-t border-white/10 pt-6 mt-4">
                          <span className="text-xs text-gray-300 font-bold uppercase">{prop.beds} HAB</span>
                          <span className="text-xs text-gray-300 font-bold uppercase">{prop.baths} BAÑOS</span>
                          <span className="text-xs text-gray-300 font-bold uppercase">{prop.sqft} m²</span>
                        </div>
                      </div>
                    </div>

                    <button className="btn-gold-outline w-full text-sm py-3 tracking-widest uppercase" onClick={() => navigate(`/property/${prop.id}`)}>
                      VER DETALLES
                    </button>
                  </div>
                </div>
              </ScrollReveal>
            ))}
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

      <footer className="bg-black border-t border-white/10 py-20 relative z-10">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="col-span-2">
              <img src="/logo-vecy.png" alt="Vecy" className="h-12 mb-8" />
              <p className="vecy-paragraph max-w-md">
                VECY es la red inmobiliaria inteligente que está redefiniendo los estándares de eficiencia en Colombia. 
                Lideramos con tecnología y operamos con visión humana.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold tracking-[0.2em] uppercase mb-8">Compañía</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/historia')}>Nuestra Historia</li>
                <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/properties')}>Propiedades</li>
                <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/admin')}>Admin</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold tracking-[0.2em] uppercase mb-8">Contacto</h4>
              <p className="text-gray-500 text-sm mb-4">Bogotá, Colombia</p>
              <p className="text-primary text-sm font-bold">contacto@vecy.co</p>
            </div>
          </div>
          <div className="border-t border-white/5 mt-20 pt-8 text-center">
            <p className="text-[10px] text-gray-700 uppercase tracking-[0.5em]">
              © 2026 VECY Network — Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
