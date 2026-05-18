import { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Bed, 
  Bath, 
  Maximize, 
  ChevronRight, 
  BarChart3, 
  Scale, 
  CircleDollarSign,
  Zap,
  Shield,
  Search
} from 'lucide-react';
import { useLocation } from 'wouter';
import Navbar from '@/components/Navbar';
import NetworkBackground from '@/components/NetworkBackground';
import CaseStudyCarousel from '@/components/CaseStudyCarousel';
import SimilarPropertiesCarousel from '@/components/SimilarPropertiesCarousel';
import { ScrollReveal } from '@/components/ScrollReveal';

export default function Home() {
  const [, navigate] = useLocation();

  // Datos de propiedades destacadas (simulados)
  const properties = [
    {
      id: 'edificio-teusaquillo',
      name: 'Edificio Teusaquillo - Inversión Pro',
      price: '$2.450.000.000',
      location: 'Bogotá, Teusaquillo',
      beds: 12,
      baths: 8,
      sqft: '450',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop',
      featured: true,
    },
    {
      id: 'apto-santa-barbara',
      name: 'Apartamento Santa Bárbara Alta',
      price: '$1.150.000.000',
      location: 'Bogotá, Usaquén',
      beds: 3,
      baths: 3,
      sqft: '145',
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800',
      featured: true,
    },
    {
      id: 'apto-cedritos-zaira',
      name: 'Apartamento Cedritos - Zaira y Andréa',
      price: '$480.000.000',
      location: 'Bogotá, Usaquén',
      beds: 3,
      baths: 2,
      sqft: '83',
      image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=800',
      featured: true,
    },
  ];

  // Datos de blog
  const blogPosts = [
    {
      id: 1,
      title: 'Tendencias del Mercado Inmobiliario 2026',
      excerpt: 'Análisis profundo de las tendencias que están transformando el mercado de bienes raíces en Bogotá.',
      author: 'Carlos Mendoza',
      date: 'Mar 25, 2026',
      image: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663473049862/LD7yumWfXzokVvfeMUE2DU/blog-expertise-EquvMH32g8aQEWw6p8Myi6.webp',
    },
    {
      id: 2,
      title: 'Cómo Invertir en Propiedades de Alto Rendimiento',
      excerpt: 'Estrategias probadas para maximizar tu retorno de inversión en el sector inmobiliario.',
      author: 'María González',
      date: 'Mar 22, 2026',
      image: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663473049862/LD7yumWfXzokVvfeMUE2DU/blog-expertise-EquvMH32g8aQEWw6p8Myi6.webp',
    },
  ];

  // Datos de servicios
  const services = [
    {
      icon: <Building2 size={48} className="text-accent glow-gold-sm rounded-full p-2 bg-black/50" />,
      title: 'Asesoramiento Inmobiliario',
      description: 'Consultoría experta para encontrar la propiedad perfecta según tus necesidades.',
    },
    {
      icon: <BarChart3 size={48} className="text-accent glow-gold-sm rounded-full p-2 bg-black/50" />,
      title: 'Análisis de Mercado',
      description: 'Reportes detallados sobre tendencias y oportunidades de inversión en Bogotá.',
    },
    {
      icon: <Scale size={48} className="text-accent glow-gold-sm rounded-full p-2 bg-black/50" />,
      title: 'Asesoramiento Legal',
      description: 'Apoyo legal completo en transacciones inmobiliarias y cumplimiento normativo.',
    },
    {
      icon: <CircleDollarSign size={48} className="text-accent glow-gold-sm rounded-full p-2 bg-black/50" />,
      title: 'Financiamiento',
      description: 'Conexión con instituciones financieras para optimizar tu inversión.',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* HERO SECTION */}
      <section
        id="home"
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        <NetworkBackground />

        {/* Contenido Hero */}
        <div className="container relative z-10 text-center">
          <ScrollReveal delay={0.2}>
            <div className="max-w-4xl mx-auto pointer-events-none">
              <p className="vecy-accent-tag">
                Ecosistema Inmobiliario 100% Digital
              </p>
              <h1 className="vecy-title-hero uppercase">
                VECY <span className="text-gradient-gold">NETWORK</span>
              </h1>
              <h2 className="text-xl md:text-2xl text-gray-200 mb-8 font-light italic tracking-wide">
                "Sal de lo convencional. Evoluciona hacia lo extraordinario."
              </h2>
              <p className="vecy-paragraph max-w-2xl mx-auto mb-10">
                El bróker virtual definitivo. Fusionamos el rigor jurídico con 
                <span className="text-accent font-semibold mx-1">Inteligencia Artificial de vanguardia</span> para 
                estructurar negocios inmobiliarios inteligentes.
              </p>
              <div className="flex flex-col md:flex-row gap-6 justify-center pointer-events-auto">
                <button className="btn-gold px-10 py-4 text-base tracking-widest uppercase" onClick={() => navigate('/properties')}>
                  EXPLORAR ACTIVOS
                </button>
                <button className="btn-gold-outline px-10 py-4 text-base tracking-widest uppercase" onClick={() => navigate('/contact')}>
                  INVERTIR AHORA
                </button>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce cursor-pointer" onClick={() => document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' })}>
          <ChevronRight className="rotate-90 text-accent/50 hover:text-accent transition-colors" size={40} />
        </div>
      </section>

      {/* PROPIEDADES DESTACADAS */}
      <section id="properties" className="py-24 bg-gradient-dark">
        <div className="container">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="vecy-title-section uppercase">PROPIEDADES DESTACADAS</h2>
              <div className="line-electric w-32 mx-auto mb-6"></div>
              <p className="vecy-subtitle max-w-2xl mx-auto">
                Selección exclusiva de propiedades premium en las mejores ubicaciones de Bogotá
              </p>
            </div>
          </ScrollReveal>

          {/* Grid de propiedades */}
          <div className="grid md:grid-cols-3 gap-8">
            {properties.map((prop, idx) => (
              <ScrollReveal key={prop.id} delay={idx * 0.1} direction="up">
                <div
                  className="vecy-card-apple group overflow-hidden hover:glow-gold transition-all duration-500 p-0"
                >
                  {/* Imagen */}
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={prop.image}
                      alt={prop.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {prop.featured && (
                      <div className="absolute top-4 right-4 bg-accent text-accent-foreground px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest">
                        DESTACADO
                      </div>
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="p-8">
                    <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">{prop.name}</h3>
                    <div className="flex items-center gap-2 text-gray-400 mb-6">
                      <MapPin size={16} className="text-accent" />
                      <span className="text-xs uppercase tracking-wider">{prop.location}</span>
                    </div>

                    {/* Precio destacado */}
                    <div className="mb-6 pb-6 border-b border-white/10">
                      <p className="text-3xl font-black text-accent">{prop.price}</p>
                    </div>

                    {/* Características */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="text-center">
                        <Bed size={20} className="mx-auto text-accent mb-2" />
                        <span className="text-xs text-gray-300 font-bold uppercase">{prop.beds} Hab</span>
                      </div>
                      <div className="text-center">
                        <Bath size={20} className="mx-auto text-accent mb-2" />
                        <span className="text-xs text-gray-300 font-bold uppercase">{prop.baths} Baños</span>
                      </div>
                      <div className="text-center">
                        <Maximize size={20} className="mx-auto text-accent mb-2" />
                        <span className="text-xs text-gray-300 font-bold uppercase">{prop.sqft} m²</span>
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

      {/* SECCIÓN DE IMPACTO: ARMAGEDÓN */}
      <section className="py-24 bg-background relative overflow-hidden border-y border-white/5">
        <div className="container relative z-10 text-center">
          <ScrollReveal direction="none">
            <h2 className="vecy-title-hero">
              EL <span className="text-gradient-gold uppercase">ARMAGEDÓN</span> INMOBILIARIO
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

      {/* SERVICIOS */}
      <section id="services" className="py-24 bg-gradient-dark">
        <div className="container">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="vecy-title-section uppercase tracking-tighter">Nuestros <span className="text-primary">Servicios</span></h2>
              <div className="line-gold w-32 mx-auto"></div>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-4 gap-8">
            {services.map((service, idx) => (
              <ScrollReveal key={idx} delay={idx * 0.1} direction="up">
                <div className="vecy-card-apple h-full hover:bg-white/[0.08] transition-all text-center group">
                  <div className="mb-6 flex justify-center group-hover:scale-110 transition-transform duration-500">{service.icon}</div>
                  <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wide">{service.title}</h3>
                  <p className="vecy-paragraph text-sm mb-0">
                    {service.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIOS / CASOS DE ÉXITO */}
      <section className="py-24 bg-background overflow-hidden">
        <div className="container">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="vecy-title-section uppercase tracking-widest underline decoration-primary decoration-4 underline-offset-8">Casos de Éxito</h2>
              <p className="vecy-subtitle mt-12 max-w-2xl mx-auto">
                Resultados reales en tiempo récord gracias a nuestro ecosistema digital
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.2} direction="none">
            <CaseStudyCarousel />
          </ScrollReveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black border-t border-white/10 py-20">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <img src="/logo-vecy.png" alt="Vecy" className="h-10 w-auto" />
                <h2 className="text-2xl font-display font-bold text-white tracking-widest uppercase">VECY NETWORK</h2>
              </div>
              <p className="vecy-paragraph max-w-md text-sm">
                Líderes en la transformación digital inmobiliaria de Colombia. 
                Desde 2018 extinguiendo la burocracia y el papel.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Empresa</h4>
              <ul className="space-y-4 text-sm text-gray-500 uppercase tracking-widest font-bold">
                <li><button onClick={() => navigate('/historia')} className="hover:text-primary transition-colors">Nosotros</button></li>
                <li><button onClick={() => navigate('/services')} className="hover:text-primary transition-colors">Servicios</button></li>
                <li><button onClick={() => navigate('/blog')} className="hover:text-primary transition-colors">Blog</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Soporte</h4>
              <ul className="space-y-4 text-sm text-gray-500 uppercase tracking-widest font-bold">
                <li><button onClick={() => navigate('/contact')} className="hover:text-primary transition-colors">Contacto</button></li>
                <li><a href="#" className="hover:text-primary transition-colors">Términos</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacidad</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-center text-gray-500 text-[10px] uppercase tracking-[0.3em]">
            <p>&copy; 2026 VECY NETWORK. Todos los derechos reservados. | Hecho en Colombia 🇨🇴</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
