import React from 'react';
import Navbar from '@/components/Navbar';
import { Shield, BarChart3, Gavel, Landmark, ArrowRight, Star } from 'lucide-react';
import { ScrollReveal } from '@/components/ScrollReveal';
import { useLocation } from 'wouter';

const services = [
  {
    title: "Asesoramiento Inmobiliario Premium",
    description: "Consultoría experta para encontrar la propiedad perfecta. Analizamos tus necesidades y presupuesto para ofrecerte opciones exclusivas que no están en el mercado abierto.",
    icon: <Shield className="w-12 h-12 text-accent" />,
    features: ["Búsqueda personalizada", "Visitas VIP", "Negociación de contratos"]
  },
  {
    title: "Análisis de Mercado Avanzado",
    description: "Utilizamos Big Data e Inteligencia Artificial (JanIA) para proyectar rentabilidades, plusvalías y tendencias en los barrios más exclusivos de Bogotá.",
    icon: <BarChart3 className="w-12 h-12 text-accent" />,
    features: ["Reportes de ROI", "Estudios de gentrificación", "Análisis comparativo"]
  },
  {
    title: "Gestión Legal y Notarial",
    description: "Apoyo legal completo para asegurar que tu inversión sea segura y transparente. Nos encargamos de todo el papeleo y la validación jurídica.",
    icon: <Gavel className="w-12 h-12 text-accent" />,
    features: ["Estudio de títulos", "Promesas de compraventa", "Escrituración rápida"]
  },
  {
    title: "Estructuración Financiera",
    description: "Te conectamos con las mejores opciones de financiamiento y optimizamos tu carga impositiva para maximizar el retorno neto de tu inversión.",
    icon: <Landmark className="w-12 h-12 text-accent" />,
    features: ["Créditos hipotecarios", "Leasing habitacional", "Optimización tributaria"]
  }
];

export default function Services() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-40 pb-20 bg-gradient-to-b from-black to-background overflow-hidden relative border-b border-white/5">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-white/5 blur-[120px] pointer-events-none"></div>
        
        <div className="container relative z-10 text-center">
          <ScrollReveal delay={0.2}>
            <p className="vecy-accent-tag">Excelencia Operativa</p>
            <h1 className="vecy-title-hero">
              NUESTROS <span className="text-gradient-gold">SERVICIOS</span>
            </h1>
            <div className="line-electric w-32 mx-auto mb-8"></div>
            <p className="vecy-subtitle max-w-2xl mx-auto font-light leading-relaxed">
              Combinamos tecnología de punta con décadas de experiencia para ofrecerte una gestión inmobiliaria de élite.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24 bg-background">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12">
            {services.map((service, idx) => (
              <ScrollReveal key={idx} delay={idx * 0.1} direction="up">
                <div 
                  className="card-float p-10 group hover:glow-gold transition-all duration-500"
                >
                  <div className="mb-6 transform group-hover:scale-110 transition-transform duration-500">
                    {service.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4 uppercase tracking-wide group-hover:text-accent transition-colors">
                    {service.title}
                  </h3>
                  <p className="vecy-paragraph text-sm mb-8 leading-relaxed">
                    {service.description}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {service.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-3 text-sm text-gray-400 font-bold uppercase tracking-wider">
                        <Star size={14} className="text-accent" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button className="flex items-center gap-2 text-accent font-bold hover:gap-4 transition-all uppercase tracking-widest text-[10px]">
                    Saber más <ArrowRight size={16} />
                  </button>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-gradient-to-t from-black to-background">
        <div className="container">
          <ScrollReveal>
            <div className="vecy-card-apple p-16 text-center border-white/10 max-w-5xl mx-auto overflow-hidden relative">
               <h2 className="vecy-title-section uppercase mb-6">
                 ¿LISTO PARA TU <span className="text-primary">PRÓXIMA INVERSIÓN</span>?
               </h2>
               <p className="vecy-subtitle mb-10 max-w-2xl mx-auto">
                 Agenda una consultoría privada con nuestros expertos y descubre cómo podemos ayudarte a construir un portafolio de rentas reales.
               </p>
               <button onClick={() => navigate('/contact')} className="btn-gold px-12 py-5 text-lg tracking-widest uppercase">
                 AGENDAR CONSULTORÍA GRATUITA
               </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-20 relative z-10">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="col-span-2 text-center md:text-left">
              <img src="/logo-vecy.png" alt="Vecy" className="h-10 mb-8 mx-auto md:mx-0 opacity-40 grayscale" />
              <p className="vecy-paragraph max-w-md">
                VECY es tu red inmobiliaria inteligente que está redefiniendo los estándares de eficiencia en Colombia. 
              </p>
            </div>
            <div className="text-center md:text-left">
              <h4 className="text-white font-bold tracking-[0.2em] uppercase mb-8 text-xs">Compañía</h4>
              <ul className="space-y-4 text-xs text-gray-500 uppercase font-bold tracking-widest">
                <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/historia')}>Nuestra Historia</li>
                <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/properties')}>Propiedades</li>
              </ul>
            </div>
            <div className="text-center md:text-left">
              <h4 className="text-white font-bold tracking-[0.2em] uppercase mb-8 text-xs">Contacto</h4>
              <p className="text-gray-500 text-xs mb-4 font-bold uppercase tracking-widest">Bogotá, Colombia</p>
              <p className="text-primary text-xs font-bold tracking-widest">contacto@vecy.co</p>
            </div>
          </div>
          <div className="border-t border-white/5 mt-20 pt-8 text-center">
            <p className="text-[10px] text-gray-700 uppercase tracking-[0.5em]">
              © 2026 VECY Network — Tu Red Inmobiliaria Inteligente.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
