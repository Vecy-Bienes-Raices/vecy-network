/**
 * HOME PAGE - VECY TECH REAL ESTATE
 * 
 * Design: Minimalismo Corporativo Oscuro con Acentos Dorados
 * Secciones principales: Hero, Propiedades, Servicios, Blog, Inversores
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import Navbar from '@/components/Navbar';
import CaseStudyCarousel from '@/components/CaseStudyCarousel';
import SimilarPropertiesCarousel from '@/components/SimilarPropertiesCarousel';
import { ChevronRight, MapPin, DollarSign, Bed, Bath, Square, TrendingUp, BookOpen, Users, Download, Search, Building2, BarChart3, Scale, CircleDollarSign } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import NetworkBackground from '@/components/NetworkBackground';

export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading, error, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  const [activeTab, setActiveTab] = useState('all');

  // Datos reales de propiedades destacadas - Sinergia con Fichas de Github
  const properties = [
    {
      id: 'apto-cantalejo',
      name: 'Apartamento en Cantalejo',
      price: '$470.000.000',
      location: 'Bogotá, Suba',
      beds: 3,
      baths: 2,
      sqft: '71',
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800',
      featured: true,
    },
    {
      id: 'apto-cedritos-ubik',
      name: 'Apartamento Cedritos UBIK',
      price: '$450.000.000',
      location: 'Bogotá, Usaquén',
      beds: 2,
      baths: 2,
      sqft: '54',
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
          <div className="max-w-4xl mx-auto animate-fade-in pointer-events-none">
            <p className="text-accent font-display tracking-[0.3em] uppercase text-sm mb-4 glow-gold-sm">
              Ecosistema Inmobiliario 100% Digital
            </p>
            <h1 className="text-5xl md:text-8xl font-display font-bold tracking-tighter text-white mb-6 leading-tight">
              VECY <span className="text-gradient-gold">NETWORK</span>
            </h1>
            <h2 className="text-xl md:text-2xl text-gray-200 mb-8 font-light italic tracking-wide">
              "Sal de lo convencional. Evoluciona hacia lo extraordinario."
            </h2>
            <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              El bróker virtual definitivo. Fusionamos el rigor jurídico con 
              <span className="text-accent font-semibold mx-1">Inteligencia Artificial de vanguardia</span> para 
              estructurar negocios inmobiliarios inteligentes.
            </p>
            <div className="flex flex-col md:flex-row gap-6 justify-center pointer-events-auto">
              <button className="btn-gold px-10 py-4 text-base tracking-widest" onClick={() => navigate('/properties')}>
                EXPLORAR ACTIVOS
              </button>
              <button className="btn-gold-outline px-10 py-4 text-base tracking-widest" onClick={() => navigate('/contact')}>
                INVERTIR AHORA
              </button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce cursor-pointer" onClick={() => document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' })}>
          <ChevronRight className="rotate-90 text-accent/50 hover:text-accent transition-colors" size={40} />
        </div>
      </section>

      {/* PROPIEDADES DESTACADAS */}
      <section id="properties" className="py-20 bg-gradient-dark">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-display font-bold tracking-wider mb-4 text-white">PROPIEDADES DESTACADAS</h2>
            <div className="line-electric w-32 mx-auto mb-6"></div>
            <p className="text-gray-300 max-w-2xl mx-auto font-light">
              Selección exclusiva de propiedades premium en las mejores ubicaciones de Bogotá
            </p>
          </div>

          {/* Grid de propiedades */}
          <div className="grid md:grid-cols-3 gap-8">
            {properties.map((prop, idx) => (
              <div
                key={prop.id}
                className="card-float group overflow-hidden hover:glow-gold transition-all duration-300 animate-slide-in-up"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {/* Imagen */}
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={prop.image}
                    alt={prop.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  {prop.featured && (
                    <div className="absolute top-4 right-4 bg-accent text-accent-foreground px-4 py-2 rounded-lg font-bold text-sm">
                      DESTACADO
                    </div>
                  )}
                </div>

                {/* Contenido */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">{prop.name}</h3>
                  <div className="flex items-center gap-2 text-gray-300 mb-4">
                    <MapPin size={16} className="text-accent" />
                    <span className="text-sm">{prop.location}</span>
                  </div>

                  {/* Precio destacado */}
                  <div className="mb-4 pb-4 border-b border-white/10">
                    <p className="text-3xl font-bold text-accent">{prop.price}</p>
                  </div>

                  {/* Características */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <Bed size={20} className="mx-auto text-accent mb-2" />
                      <p className="text-sm text-gray-300">{prop.beds} Hab</p>
                    </div>
                    <div className="text-center">
                      <Bath size={20} className="mx-auto text-accent mb-2" />
                      <p className="text-sm text-gray-300">{prop.baths} Baños</p>
                    </div>
                    <div className="text-center">
                      <Square size={20} className="mx-auto text-accent mb-2" />
                      <p className="text-sm text-gray-300">{prop.sqft} m²</p>
                    </div>
                  </div>

                  <button className="w-full btn-gold text-sm">VER DETALLES</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARACIÓN DE MERCADO */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-display font-bold tracking-wider mb-4">ANÁLISIS DE MERCADO BOGOTÁ</h2>
            <div className="line-gold w-24 mx-auto mb-6"></div>
            <p className="text-gray-300">Comparativa interactiva de precios y tendencias inmobiliarias</p>
          </div>

          {/* Tabla de comparación */}
          <div className="glass rounded-2xl p-8 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-accent font-bold uppercase tracking-wider">Zona</th>
                  <th className="text-left py-4 px-4 text-accent font-bold uppercase tracking-wider">Precio Promedio</th>
                  <th className="text-left py-4 px-4 text-accent font-bold uppercase tracking-wider">Variación Anual</th>
                  <th className="text-left py-4 px-4 text-accent font-bold uppercase tracking-wider">Demanda</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { zone: 'Zona Rosa', price: '$750K - $1.2M', change: '+12%', demand: 'Muy Alta' },
                  { zone: 'Chapinero', price: '$400K - $700K', change: '+8%', demand: 'Alta' },
                  { zone: 'Usaquén', price: '$550K - $950K', change: '+15%', demand: 'Muy Alta' },
                  { zone: 'Teusaquillo', price: '$350K - $600K', change: '+6%', demand: 'Media' },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 text-white font-semibold">{row.zone}</td>
                    <td className="py-4 px-4 text-accent font-bold">{row.price}</td>
                    <td className="py-4 px-4 text-green-400 font-bold">{row.change}</td>
                    <td className="py-4 px-4 text-gray-200">{row.demand}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SERVICIOS PROFESIONALES */}
      <section id="services" className="py-20 bg-gradient-to-b from-black to-background">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-display font-bold tracking-wider mb-4">SERVICIOS PROFESIONALES</h2>
            <div className="line-gold w-24 mx-auto mb-6"></div>
            <p className="text-gray-300">Soluciones integrales para tus necesidades inmobiliarias</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, idx) => (
              <div key={idx} className="card-float p-8 hover:glow-gold transition-all duration-300 transform hover:-translate-y-2">
                <div className="mb-6 flex justify-center">{service.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-4 text-center">{service.title}</h3>
                <p className="text-gray-300 text-center leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BLOG Y OPINIONES */}
      <section id="blog" className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-display font-bold tracking-wider mb-4">BLOG Y LIDERAZGO INTELECTUAL</h2>
            <div className="line-gold w-24 mx-auto mb-6"></div>
            <p className="text-gray-300">Análisis, tendencias y insights del mercado inmobiliario</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {blogPosts.map((post, idx) => (
              <div
                key={post.id}
                className="card-float overflow-hidden hover:glow-gold-sm transition-all duration-300 animate-slide-in-up"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <img src={post.image} alt={post.title} className="w-full h-64 object-cover" />
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-white mb-3">{post.title}</h3>
                  <p className="text-gray-300 mb-4">{post.excerpt}</p>
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                    <span>{post.author}</span>
                    <span>{post.date}</span>
                  </div>
                  <button className="btn-gold-outline w-full text-sm">LEER MÁS</button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button className="btn-gold">VER TODOS LOS ARTÍCULOS</button>
          </div>
        </div>
      </section>

      {/* CENTRO DE INVERSORES */}
      <section id="investors" className="py-20 bg-gradient-to-b from-black to-background">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-display font-bold tracking-wider mb-4">CENTRO DE INVERSORES</h2>
            <div className="line-gold w-24 mx-auto mb-6"></div>
            <p className="text-gray-300">Recursos y reportes para propietarios e inversores</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Reportes */}
            <div className="card-float p-8">
              <TrendingUp size={40} className="text-accent mb-4" />
              <h3 className="text-2xl font-bold text-white mb-4">Reportes de Mercado</h3>
              <p className="text-gray-300 mb-6">
                Acceso a análisis detallados sobre el comportamiento del mercado inmobiliario en Bogotá.
              </p>
              <button className="btn-gold w-full flex items-center justify-center gap-2">
                <Download size={18} />
                DESCARGAR REPORTES
              </button>
            </div>

            {/* Herramientas */}
            <div className="card-float p-8">
              <Search size={40} className="text-accent mb-4" />
              <h3 className="text-2xl font-bold text-white mb-4">Herramientas de Búsqueda</h3>
              <p className="text-gray-300 mb-6">
                Plataforma avanzada para buscar y comparar propiedades con filtros personalizados.
              </p>
              <button className="btn-gold w-full">ACCEDER A HERRAMIENTAS</button>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {[
              { number: '500+', label: 'Propiedades Listadas' },
              { number: '2.5K+', label: 'Inversores Activos' },
              { number: '$2.1B', label: 'Volumen Transaccionado' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <p className="number-highlight mb-2">{stat.number}</p>
                <p className="text-gray-300 uppercase tracking-wider text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black border-t border-white/10 py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider">Vecy</h4>
              <p className="text-gray-300 text-sm">Liderazgo en tecnología inmobiliaria y servicios profesionales.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider">Navegación</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#properties" className="hover:text-accent transition-colors">Propiedades</a></li>
                <li><a href="#services" className="hover:text-accent transition-colors">Servicios</a></li>
                <li><a href="#blog" className="hover:text-accent transition-colors">Blog</a></li>
                <li><a href="#investors" className="hover:text-accent transition-colors">Inversores</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#" className="hover:text-accent transition-colors">Términos</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Privacidad</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Cookies</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider">Contacto</h4>
              <p className="text-gray-300 text-sm">
                Bogotá, Colombia<br />
                +57 (1) 1234-5678<br />
                vecybienesraices@gmail.com
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2026 Vecy. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
