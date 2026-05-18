import React from 'react';
import Navbar from '@/components/Navbar';
import { 
  Users, 
  Zap, 
  Share2, 
  TrendingUp, 
  Target, 
  ShieldCheck, 
  ChevronRight, 
  Coins, 
  Network,
  Award
} from 'lucide-react';
import NetworkBackground from '@/components/NetworkBackground';
import { useLocation } from 'wouter';

export default function RedColaboracion() {
  const [, navigate] = useLocation();

  const steps = [
    {
      icon: <Share2 className="w-8 h-8 text-primary" />,
      title: "1. Viraliza",
      description: "Comparte cualquier inmueble del ecosistema VECY (propio o ajeno) en tus redes sociales y WhatsApp."
    },
    {
      icon: <Zap className="w-8 h-8 text-primary" />,
      title: "2. Acumula Puntos",
      description: "Cada clic y visualización generada por tus enlaces trackeables te otorga Puntos en tiempo real."
    },
    {
      icon: <Award className="w-8 h-8 text-primary" />,
      title: "3. Gana en el Cierre",
      description: "Al cerrarse el negocio, tus puntos se transforman automáticamente en una comisión de la bolsa de difusores."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <NetworkBackground />
        <div className="container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
            <Zap className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Economía Colaborativa 2.0</span>
          </div>
          <h1 className="text-5xl md:text-8xl font-display font-black tracking-tighter text-white mb-6 leading-tight animate-fade-in">
            RED DE <span className="text-gradient-gold italic">COLABORACIÓN</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed animate-fade-in delay-100">
            En VECY NETWORK no gastamos en publicidad tradicional. Premiamos tu influencia. 
            Ayuda a tus colegas a vender y **gana una parte de la comisión** sin ser el captador ni el comprador.
          </p>
        </div>
      </section>

      {/* ¿CÓMO FUNCIONA EL GANA-GANA? */}
      <section className="py-24 bg-gradient-dark">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl font-display font-bold text-white leading-tight">
                El Fin de la Era <span className="text-primary italic">Dinosaurio</span>.
              </h2>
              <div className="line-electric w-24"></div>
              <p className="text-gray-400 text-lg">
                Los portales tradicionales te cobran por publicar y se quedan con tu dinero. En VECY, 
                creamos un motor de **viralidad humana** donde todos los engranajes ganan.
              </p>
              
              <div className="space-y-6">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex gap-6 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/30 transition-all group">
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:glow-gold-sm transition-all">
                      {step.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ESQUEMA VISUAL DE COMISIÓN */}
            <div className="panel-card p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -z-10" />
              <h3 className="text-2xl font-bold text-center text-white mb-10 tracking-widest uppercase">Reparto de Comisión Armagedón</h3>
              
              <div className="space-y-4">
                {/* VECY SHARE */}
                <div className="relative h-12 bg-white/5 rounded-lg border border-white/10 flex items-center px-4 overflow-hidden group">
                  <div className="absolute inset-0 bg-primary/20 w-[15%] transition-all group-hover:bg-primary/30" />
                  <span className="relative text-xs font-bold text-primary">VECY NETWORK (Plataforma + IA)</span>
                  <span className="ml-auto relative text-xs font-black">15%</span>
                </div>

                {/* BOLSAS DE DIFUSORES */}
                <div className="relative h-16 bg-white/5 rounded-lg border border-primary/40 flex items-center px-4 overflow-hidden group glow-gold-sm">
                  <div className="absolute inset-0 bg-primary/40 w-[25%] animate-pulse" />
                  <div className="flex flex-col relative">
                    <span className="text-xs font-black text-white">RED DE DIFUSORES (PUNTOS)</span>
                    <span className="text-[10px] text-gray-300">Agentes que compartieron el activo</span>
                  </div>
                  <span className="ml-auto relative text-lg font-black text-primary">25%</span>
                </div>

                {/* VENDEDOR Y COMPRADOR */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative h-24 bg-white/5 rounded-lg border border-white/10 flex flex-col justify-center items-center group">
                    <div className="absolute inset-0 bg-white/5 h-1/2 bottom-0 w-full" />
                    <Users className="w-6 h-6 text-gray-400 mb-2" />
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">Captador</span>
                    <span className="text-xl font-black text-white">30%</span>
                  </div>
                  <div className="relative h-24 bg-white/5 rounded-lg border border-white/10 flex flex-col justify-center items-center group">
                    <div className="absolute inset-0 bg-white/5 h-1/2 bottom-0 w-full" />
                    <Target className="w-6 h-6 text-gray-400 mb-2" />
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">Comprador</span>
                    <span className="text-xl font-black text-white">30%</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/10 text-center">
                <p className="text-xs text-gray-500 italic">
                  * Ejemplo basado en un reparto estándar de comisión del 3% o 5% del valor del inmueble.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POR QUÉ ES ATRACTIVO */}
      <section className="py-24 bg-background">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-display font-bold text-white mb-4">¿POR QUÉ <span className="text-primary">UNIRSE</span>?</h2>
            <div className="line-gold w-32 mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="panel-card p-8 hover:glow-gold transition-all">
              <Coins className="w-12 h-12 text-primary mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">Ingresos Pasivos</h3>
              <p className="text-gray-400 leading-relaxed">
                Gana dinero incluso si no tienes inventario propio. Tu única tarea es hacer que los inmuebles de la red lleguen a más personas.
              </p>
            </div>
            <div className="panel-card p-8 hover:glow-gold transition-all">
              <Network className="w-12 h-12 text-primary mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">Poder de Red</h3>
              <p className="text-gray-400 leading-relaxed">
                Accede a una fuerza de ventas masiva. Cuando tú publicas, cientos de colegas se convierten en tus promotores por incentivos claros.
              </p>
            </div>
            <div className="panel-card p-8 hover:glow-gold transition-all">
              <ShieldCheck className="w-12 h-12 text-primary mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">Transparencia Total</h3>
              <p className="text-gray-400 leading-relaxed">
                Todo queda registrado en nuestro Ledger inmutable. Sabrás exactamente cuántos puntos tienes y cuánto ganarás al cierre.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 -skew-y-3 transform origin-right" />
        <div className="container relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-display font-black text-white mb-8">
            ¿LISTO PARA <span className="text-primary italic">EVOLUCIONAR</span>?
          </h2>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Únete a la primera red inmobiliaria en Colombia que realmente premia el voz a voz.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button 
              onClick={() => navigate('/agent-dashboard')}
              className="btn-gold px-12 py-5 text-lg tracking-widest"
            >
              EMPEZAR A GANAR PUNTOS
            </button>
            <button 
              onClick={() => navigate('/contact')}
              className="btn-gold-outline px-12 py-5 text-lg tracking-widest"
            >
              SOLICITAR INFORMACIÓN
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black border-t border-white/10 py-12">
        <div className="container text-center">
          <img src="/logo-vecy.png" alt="Vecy" className="h-10 mx-auto mb-6 opacity-50" />
          <p className="text-gray-500 text-sm">
            &copy; 2026 VECY NETWORK. El Futuro del Real Estate es Colaborativo.
          </p>
        </div>
      </footer>
    </div>
  );
}
