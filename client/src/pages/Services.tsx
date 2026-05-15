import React from 'react';
import Navbar from '@/components/Navbar';
import { Shield, BarChart3, Gavel, Landmark, ArrowRight, Star } from 'lucide-react';

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
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-b from-black to-background overflow-hidden relative">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-white/5 blur-[120px] pointer-events-none"></div>
        
        <div className="container relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-wider mb-6 animate-fade-in">
            NUESTROS <span className="text-gradient-gold">SERVICIOS</span>
          </h1>
          <div className="line-electric w-32 mx-auto mb-8"></div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto font-light leading-relaxed">
            Combinamos tecnología de punta con décadas de experiencia para ofrecerte una gestión inmobiliaria de élite.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12">
            {services.map((service, idx) => (
              <div 
                key={idx}
                className="card-float p-10 group hover:glow-gold transition-all duration-500 animate-slide-in-up"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="mb-6 transform group-hover:scale-110 transition-transform duration-500">
                  {service.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 uppercase tracking-wide group-hover:text-accent transition-colors">
                  {service.title}
                </h3>
                <p className="text-gray-300 mb-8 leading-relaxed">
                  {service.description}
                </p>
                <ul className="space-y-3 mb-8">
                  {service.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-3 text-sm text-gray-400">
                      <Star size={14} className="text-accent" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className="flex items-center gap-2 text-accent font-bold hover:gap-4 transition-all uppercase tracking-widest text-sm">
                  Saber más <ArrowRight size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-black to-background">
        <div className="container">
          <div className="glass p-12 rounded-3xl text-center border-white/10 max-w-4xl mx-auto overflow-hidden relative">
             {/* Glowing particle effect (CSS only) */}
             <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/5 blur-3xl animate-pulse"></div>
             
             <h2 className="text-4xl font-bold text-white mb-6 uppercase tracking-wider relative z-10">
               ¿Listo Para Tu Próxima Gran Inversión?
             </h2>
             <p className="text-gray-300 mb-8 max-w-2xl mx-auto relative z-10">
               Agenda una consultoría privada con nuestros expertos y descubre cómo podemos ayudarte a construir un portafolio de rentas reales.
             </p>
             <button className="btn-gold relative z-10">
               AGENDAR CONSULTORÍA GRATUITA
             </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-12">
        <div className="container text-center text-gray-400 text-sm">
          <p>&copy; 2026 Vecy. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
