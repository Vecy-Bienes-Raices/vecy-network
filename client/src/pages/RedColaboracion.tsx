import React from 'react';
import Navbar from '@/components/Navbar';
import { 
  Users, 
  Zap, 
  Share2, 
  Target, 
  ShieldCheck, 
  Coins, 
  Network,
  Award
} from 'lucide-react';
import NetworkBackground from '@/components/NetworkBackground';
import { useLocation } from 'wouter';
import { ScrollReveal } from '@/components/ScrollReveal';

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
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <NetworkBackground />
        <div className="container relative z-10 text-center">
          <ScrollReveal delay={0.2}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Zap className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Economía Colaborativa 2.0</span>
            </div>
            <h1 className="vecy-title-hero">
              RED DE <span className="text-gradient-gold">COLABORACIÓN</span>
            </h1>
            <p className="vecy-subtitle max-w-3xl mx-auto">
              En VECY NETWORK no gastamos en publicidad tradicional. Premiamos tu influencia. 
              Ayuda a tus colegas a vender y <span className="font-bold text-white uppercase">gana una parte de la comisión</span> sin ser el captador ni el comprador.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ¿CÓMO FUNCIONA EL GANA-GANA? */}
      <section className="py-24 bg-gradient-dark">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <ScrollReveal direction="left">
                <h2 className="vecy-title-section">
                  La Evolución <span className="text-primary uppercase">Inevitable</span>.
                </h2>
                <div className="line-electric w-24 mb-6"></div>
                <p className="vecy-paragraph text-lg">
                  Los portales tradicionales te cobran por publicar y se quedan con tu dinero. En VECY, 
                  creamos un motor de <span className="font-bold text-white uppercase">viralidad humana</span> donde todos los engranajes ganan.
                </p>
              </ScrollReveal>
              
              <div className="space-y-6">
                {steps.map((step, idx) => (
                  <ScrollReveal key={idx} direction="left" delay={0.1 * idx}>
                    <div className="vecy-card-apple flex gap-6 p-6 hover:border-primary/30 group">
                      <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:glow-gold-sm transition-all">
                        {step.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                        <p className="vecy-paragraph text-sm mb-0 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>

            {/* ESQUEMA VISUAL DE COMISIÓN */}
            <ScrollReveal direction="right" delay={0.3}>
              <div className="vecy-card-apple p-10 relative overflow-hidden bg-white/[0.02]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -z-10" />
                <h3 className="text-2xl font-bold text-center text-white mb-10 tracking-widest uppercase text-balance">Reparto de Comisión: La Evolución Inevitable</h3>
                
                <div className="space-y-4">
                  {/* VECY SHARE */}
                  <div className="relative h-12 bg-white/5 rounded-lg border border-white/10 flex items-center px-4 overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/20 w-[15%] transition-all group-hover:bg-primary/30" />
                    <span className="relative text-xs font-bold text-primary uppercase">VECY NETWORK (Plataforma + IA)</span>
                    <span className="ml-auto relative text-xs font-black">15%</span>
                  </div>

                  {/* BOLSAS DE DIFUSORES */}
                  <div className="relative h-16 bg-white/5 rounded-lg border border-primary/40 flex items-center px-4 overflow-hidden group glow-gold-sm">
                    <div className="absolute inset-0 bg-primary/40 w-[15%] animate-pulse" />
                    <div className="flex flex-col relative">
                      <span className="text-xs font-black text-white uppercase">RED DE DIFUSORES (PUNTOS)</span>
                      <span className="text-[10px] text-gray-300">Agentes que compartieron el activo</span>
                    </div>
                    <span className="ml-auto relative text-lg font-black text-primary">15%</span>
                  </div>

                  {/* VENDEDOR Y COMPRADOR */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative h-24 bg-white/5 rounded-lg border border-white/10 flex flex-col justify-center items-center group">
                      <div className="absolute inset-0 bg-primary/10 h-1/2 bottom-0 w-full" />
                      <Users className="w-6 h-6 text-gray-400 mb-2" />
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">Captador</span>
                      <span className="text-xl font-black text-white">35%</span>
                    </div>
                    <div className="relative h-24 bg-white/5 rounded-lg border border-white/10 flex flex-col justify-center items-center group">
                      <div className="absolute inset-0 bg-primary/10 h-1/2 bottom-0 w-full" />
                      <Target className="w-6 h-6 text-gray-400 mb-2" />
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">Comprador</span>
                      <span className="text-xl font-black text-white">35%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/10 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-tighter">
                    * Ejemplo basado en un reparto estándar de comisión del 3% o 5% del valor del inmueble.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* MATRIZ DE GANANCIAS */}
      <section className="py-24 bg-background relative overflow-hidden">
        <div className="container relative z-10">
          <div className="text-center mb-16">
            <h2 className="vecy-title-section uppercase tracking-tighter">MATRIZ DE <span className="text-primary">GANANCIAS</span></h2>
            <p className="vecy-subtitle max-w-2xl mx-auto uppercase tracking-widest text-xs font-bold mt-4">Ganas por viralizar, ganas por captar, ganas por cerrar.</p>
            <div className="line-gold w-32 mx-auto mt-6"></div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* ESCENARIO A: VIRALIZACIÓN */}
            <ScrollReveal direction="up" delay={0.1}>
              <div className="vecy-card-apple border-primary/20 bg-primary/5 p-10 h-full relative group flex flex-col">
                <div className="absolute top-4 right-4 bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Opción Red</div>
                <div className="flex items-center gap-4 mb-8">
                  <Share2 className="w-10 h-10 text-primary" />
                  <h3 className="text-xl font-bold text-white uppercase leading-tight">Solo <br/>Viralizas</h3>
                </div>
                <p className="vecy-paragraph text-sm mb-8 flex-1">
                  Compartes el enlace de "Red de Apoyo" (Sin Marca) en tus redes. Acumulas puntos por cada clic y visualización.
                </p>
                <div className="space-y-4 mb-10">
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-gray-400 text-[10px] uppercase font-bold">Tu Tarea</span>
                    <span className="text-white text-[10px] font-black uppercase">Difundir la Red</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-gray-400 text-[10px] uppercase font-bold">Tu Recompensa</span>
                    <span className="text-primary text-base font-black uppercase">15% Global</span>
                  </div>
                </div>
                <div className="bg-black/40 p-5 rounded-2xl border border-white/5 italic text-gray-500 text-[10px] leading-relaxed">
                  "Participas en la bolsa de puntos junto a otros difusores. Ganas por el simple hecho de ayudar a que el negocio sea visible."
                </div>
              </div>
            </ScrollReveal>

            {/* ESCENARIO B: CAPTACIÓN */}
            <ScrollReveal direction="up" delay={0.2}>
              <div className="vecy-card-apple border-white/20 bg-white/5 p-10 h-full relative group flex flex-col shadow-[0_20px_40px_rgba(255,255,255,0.02)]">
                <div className="absolute top-4 right-4 bg-white/10 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Dueño del Activo</div>
                <div className="flex items-center gap-4 mb-8">
                  <ShieldCheck className="w-10 h-10 text-primary" />
                  <h3 className="text-xl font-bold text-white uppercase leading-tight">Tú <br/>Captas</h3>
                </div>
                <p className="vecy-paragraph text-sm mb-8 flex-1">
                  Tienes el inmueble bajo mandato directo. Lo subes a VECY y dejas que nuestra red de cientos de agentes lo viralice.
                </p>
                <div className="space-y-4 mb-10">
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-gray-400 text-[10px] uppercase font-bold">Tu Tarea</span>
                    <span className="text-white text-[10px] font-black uppercase">Captación y Gestión</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-gray-400 text-[10px] uppercase font-bold">Tu Recompensa</span>
                    <span className="text-white text-base font-black uppercase">35% Íntegro</span>
                  </div>
                </div>
                <div className="bg-black/40 p-5 rounded-2xl border border-white/5 italic text-gray-500 text-[10px] leading-relaxed text-center">
                  Aseguras tu comisión por haber traído el inventario de calidad al ecosistema.
                </div>
              </div>
            </ScrollReveal>

            {/* ESCENARIO C: CIERRE */}
            <ScrollReveal direction="up" delay={0.3}>
              <div className="vecy-card-apple border-accent/40 bg-accent/5 p-10 h-full relative group shadow-[0_0_50px_rgba(191,149,63,0.1)] flex flex-col">
                <div className="absolute top-4 right-4 bg-accent/20 text-accent px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Cerrador Pro</div>
                <div className="flex items-center gap-4 mb-8">
                  <Target className="w-10 h-10 text-accent" />
                  <h3 className="text-xl font-bold text-white uppercase leading-tight">Tú Traes al <br/>Comprador</h3>
                </div>
                <p className="vecy-paragraph text-sm mb-8 flex-1">
                  Viralizaste el inmueble y un cliente te contactó. Gestionas la visita y cierras el negocio con éxito.
                </p>
                <div className="space-y-4 mb-10">
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-gray-400 text-[10px] uppercase font-bold">Tu Tarea</span>
                    <span className="text-white text-[10px] font-black uppercase">Cierre de Negocio</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-gray-400 text-[10px] uppercase font-bold">Tu Recompensa</span>
                    <span className="text-accent text-2xl font-black uppercase tracking-tighter">35% Íntegro</span>
                  </div>
                </div>
                <div className="bg-black/40 p-5 rounded-2xl border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest text-center">
                  ¡Premio máximo por cerrar la operación!
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* POR QUÉ ES ATRACTIVO */}
      <section className="py-24 bg-background">
        <div className="container">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="vecy-title-section uppercase tracking-tighter">¿POR QUÉ <span className="text-primary">UNIRSE</span>?</h2>
              <div className="line-gold w-32 mx-auto mt-4"></div>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            <ScrollReveal delay={0.1}>
              <div className="vecy-card-apple h-full hover:glow-gold transition-all">
                <Coins className="w-12 h-12 text-primary mb-6" />
                <h3 className="text-2xl font-bold text-white mb-4 uppercase">Ingresos Pasivos</h3>
                <p className="vecy-paragraph text-sm mb-0">
                  Gana dinero incluso si no tienes inventario propio. Tu única tarea es hacer que los inmuebles de la red lleguen a más personas.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <div className="vecy-card-apple h-full hover:glow-gold transition-all">
                <Network className="w-12 h-12 text-primary mb-6" />
                <h3 className="text-2xl font-bold text-white mb-4 uppercase">Poder de Red</h3>
                <p className="vecy-paragraph text-sm mb-0">
                  Accede a una fuerza de ventas masiva. Cuando tú publicas, cientos de colegas se convierten en tus promotores por incentivos claros.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <div className="vecy-card-apple h-full hover:glow-gold transition-all">
                <ShieldCheck className="w-12 h-12 text-primary mb-6" />
                <h3 className="text-2xl font-bold text-white mb-4 uppercase">Transparencia Total</h3>
                <p className="vecy-paragraph text-sm mb-0">
                  Todo queda registrado en nuestro Ledger inmutable. Sabrás exactamente cuántos puntos tienes y cuánto ganarás al cierre.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 -skew-y-3 transform origin-right" />
        <div className="container relative z-10 text-center">
          <ScrollReveal>
            <h2 className="vecy-title-hero uppercase">
              ¿LISTO PARA <span className="text-primary uppercase">EVOLUCIONAR</span>?
            </h2>
            <p className="vecy-subtitle max-w-2xl mx-auto mb-12 uppercase tracking-widest text-sm font-bold">
              Únete a la primera red inmobiliaria en Colombia que realmente premia el voz a voz.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button 
                onClick={() => navigate('/agent-dashboard')}
                className="btn-gold px-12 py-5 text-lg tracking-widest uppercase hover:scale-105 transition-transform"
              >
                EMPEZAR A GANAR PUNTOS
              </button>
              <button 
                onClick={() => navigate('/contact')}
                className="btn-gold-outline px-12 py-5 text-lg tracking-widest uppercase"
              >
                SOLICITAR INFORMACIÓN
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black border-t border-white/10 py-12">
        <div className="container text-center">
          <img src="/logo-vecy.png" alt="Vecy" className="h-10 mx-auto mb-6 opacity-50 grayscale" />
          <p className="text-gray-500 text-[10px] uppercase tracking-[0.3em]">
            &copy; 2026 VECY NETWORK. El Futuro del Real Estate es Colaborativo.
          </p>
        </div>
      </footer>
    </div>
  );
}
