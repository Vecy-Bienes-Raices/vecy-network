import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
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

      {/* HERO SECTION — BOLSA INMOBILIARIA COLABORATIVA */}
      <section className="relative pt-36 pb-16 bg-gradient-to-b from-black via-zinc-950 to-background overflow-hidden border-b border-white/5">
        <NetworkBackground />
        {/* Glow de fondo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[320px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="container relative z-10 text-center max-w-4xl mx-auto px-4">
          <ScrollReveal delay={0.1}>
            <p className="vecy-accent-tag text-center">ECONOMÍA COLABORATIVA INMOBILIARIA 2.0</p>

            <h1 className="vecy-title-hero uppercase tracking-tight">
              BOLSA INMOBILIARIA <span className="text-gradient-gold">COLABORATIVA</span>
            </h1>

            <div className="line-electric w-36 sm:w-44 mx-auto my-5"></div>

            <p className="vecy-subtitle max-w-3xl mx-auto text-sm sm:text-base text-zinc-300">
              En VECY BIENES RAÍCES erradicamos el gasto en publicidad tradicional. Convertimos a toda la comunidad 
              de agentes en el <span className="font-bold text-white uppercase">motor orgánico de marketing en red</span>. 
              Gana comisiones reales compartiendo inmuebles con <span className="font-bold text-gradient-gold uppercase">fichas de marca blanca</span> sin necesidad de tener un gran inventario propio.
            </p>

            {/* PESTAÑAS DE ACCESO DIRECTO A LA BOLSA */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button 
                onClick={() => navigate('/ofertas')}
                className="btn-gold px-8 py-4 text-xs font-black tracking-widest uppercase flex items-center gap-2.5 cursor-pointer shadow-lg"
              >
                <Share2 className="w-4 h-4 text-[#120e03]" />
                Explorar Ofertas de la Bolsa
              </button>
              <button 
                onClick={() => navigate('/demandas')}
                className="btn-gold-outline px-8 py-4 text-xs font-black tracking-widest uppercase flex items-center gap-2.5 cursor-pointer shadow-lg"
              >
                <Target className="w-4 h-4 text-primary" />
                Explorar Demandas de la Bolsa
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ¿CÓMO FUNCIONA LA BOLSA COLABORATIVA? */}
      <section className="py-24 bg-gradient-dark border-t border-white/5">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <ScrollReveal direction="left">
                <div className="inline-block px-3.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-3">
                  Apalancamiento Masivo para Agentes
                </div>
                <h2 className="vecy-title-section">
                  ¿Cómo Funciona la <span className="text-gradient-gold uppercase">Bolsa Colaborativa</span>?
                </h2>
                <div className="line-electric w-24 mb-6"></div>
                <p className="vecy-paragraph text-base leading-relaxed">
                  ¿Te acabas de registrar en VECY y solo tienes 1 o 2 inmuebles? <strong>¡No importa!</strong> La Bolsa 
                  Inmobiliaria te permite comercializar el portafolio completo de la red. Tomas cualquier propiedad, 
                  generas tu enlace con <strong>Ficha de Marca Blanca (sin logos ni contactos de VECY)</strong> y lo viralizas en tus redes sociales.
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
                        <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                        <p className="vecy-paragraph text-sm mb-0 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>

            {/* ESQUEMA VISUAL DE COMISIÓN 40 / 20 / 40 */}
            <ScrollReveal direction="right" delay={0.3}>
              <div className="vecy-card-apple p-10 relative overflow-hidden bg-white/[0.02] border border-white/10 shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -z-10" />
                <h3 className="text-xl font-bold text-center text-white mb-2 tracking-widest uppercase text-balance">
                  Modelo Oficial 40 / 20 / 40
                </h3>
                <p className="text-xs text-center text-gray-400 mb-8 uppercase tracking-wider">
                  Reparto Transparente sobre la Comisión Total (3% Venta / 1er Canon Arriendo)
                </p>
                
                <div className="space-y-4">
                  {/* PUNTA CAPTADORA */}
                  <div className="relative h-16 bg-white/5 rounded-xl border border-white/15 flex items-center px-5 overflow-hidden group">
                    <div className="absolute inset-0 bg-white/10 w-[40%] transition-all" />
                    <div className="flex flex-col relative">
                      <span className="text-xs font-black text-white uppercase tracking-wider">PUNTA CAPTADORA (OFERTA)</span>
                      <span className="text-[10px] text-gray-400">Dueño del mandato que sube el inmueble</span>
                    </div>
                    <span className="ml-auto relative text-xl font-black text-white">40%</span>
                  </div>

                  {/* BOLSA INTERMEDIA (20%) = 10% BOLSA COLABORATIVA + 10% VECY */}
                  <div className="relative p-4 bg-primary/5 rounded-2xl border-2 border-primary/40 space-y-3 glow-gold-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-primary" /> Participación Intermedia (20%)
                      </span>
                      <span className="text-xs font-black text-primary">20% Total</span>
                    </div>

                    {/* 10% BOLSA COLABORATIVA */}
                    <div className="relative h-12 bg-black/50 rounded-lg border border-primary/30 flex items-center px-4 overflow-hidden">
                      <div className="absolute inset-0 bg-primary/20 w-[50%] animate-pulse" />
                      <div className="flex flex-col relative">
                        <span className="text-xs font-black text-amber-300 uppercase">BOLSA COLABORATIVA (RED)</span>
                        <span className="text-[9px] text-gray-400">Difusores que viralizan con Marca Blanca (Reparto por puntos)</span>
                      </div>
                      <span className="ml-auto relative text-base font-black text-primary">10%</span>
                    </div>

                    {/* 10% VECY PLATAFORMA */}
                    <div className="relative h-12 bg-black/50 rounded-lg border border-white/10 flex items-center px-4 overflow-hidden">
                      <div className="absolute inset-0 bg-white/5 w-[50%]" />
                      <div className="flex flex-col relative">
                        <span className="text-xs font-black text-white uppercase">VECY BIENES RAÍCES</span>
                        <span className="text-[9px] text-gray-400">Súper Portal, IA JanIA 24/7, Vecy Agenda y Respaldo Legal</span>
                      </div>
                      <span className="ml-auto relative text-base font-black text-gray-300">10%</span>
                    </div>
                  </div>

                  {/* PUNTA COLOCADORA */}
                  <div className="relative h-16 bg-white/5 rounded-xl border border-white/15 flex items-center px-5 overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/10 w-[40%] transition-all" />
                    <div className="flex flex-col relative">
                      <span className="text-xs font-black text-white uppercase tracking-wider">PUNTA COLOCADORA (DEMANDA)</span>
                      <span className="text-[10px] text-gray-400">Quien aporta al cliente comprador/arrendatario vía Vecy Agenda</span>
                    </div>
                    <span className="ml-auto relative text-xl font-black text-primary">40%</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10 text-center">
                  <p className="text-[11px] text-amber-300/80 uppercase tracking-tight leading-relaxed">
                    🌟 <strong>¡Premio Doble Eureka!</strong> Si difundiste en la Bolsa y además conseguiste al cliente, 
                    ¡te llevas el <strong>40% como Colocador MÁS tu liquidación en dinero por los puntos de la Bolsa (10%)</strong>!
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
            <p className="vecy-subtitle max-w-2xl mx-auto uppercase tracking-widest text-xs font-bold mt-4">
              Ganas por viralizar en la bolsa, ganas por captar, ganas por colocar.
            </p>
            <div className="line-gold w-32 mx-auto mt-6"></div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* ESCENARIO A: VIRALIZACIÓN EN LA BOLSA */}
            <ScrollReveal direction="up" delay={0.1}>
              <div className="vecy-card-apple border-primary/20 bg-primary/5 p-10 h-full relative group flex flex-col">
                <div className="absolute top-4 right-4 bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Opción Bolsa</div>
                <div className="flex items-center gap-4 mb-8">
                  <Share2 className="w-10 h-10 text-primary" />
                  <h3 className="text-xl font-bold text-white uppercase leading-tight">Solo <br/>Viralizas</h3>
                </div>
                <p className="vecy-paragraph text-sm mb-8 flex-1 leading-relaxed">
                  Compartes la <strong>Ficha de Marca Blanca</strong> (sin logos de VECY) en tus redes y estados. Tags y mini-bots registran tus clics. Si no consigues el cliente, <strong>no perdiste tu tiempo</strong>: al cerrarse la venta, te consignamos tu parte del 10%.
                </p>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-gray-400 text-[10px] uppercase font-bold">Tu Tarea</span>
                    <span className="text-white text-[10px] font-black uppercase">Viralizar con Marca Blanca</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-gray-400 text-[10px] uppercase font-bold">Tu Recompensa</span>
                    <span className="text-primary text-base font-black uppercase">Reparto de la Bolsa (10%)</span>
                  </div>
                </div>
                <div className="bg-black/40 p-4 rounded-xl border border-white/5 italic text-gray-400 text-[10px] leading-relaxed">
                  "Monetizas tus redes sociales y tu tiempo ayudando a que los inmuebles se vendan volando."
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
                <p className="vecy-paragraph text-sm mb-8 flex-1 leading-relaxed">
                  Tienes el mandato del inmueble. Lo subes al portal y te ahorras millones en pauta de Facebook/Google. Decenas de colegas en la Bolsa lo difunden por ti.
                </p>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-gray-400 text-[10px] uppercase font-bold">Tu Tarea</span>
                    <span className="text-white text-[10px] font-black uppercase">Captación y Gestión</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-gray-400 text-[10px] uppercase font-bold">Tu Recompensa</span>
                    <span className="text-white text-base font-black uppercase">40% Asegurado</span>
                  </div>
                </div>
                <div className="bg-black/40 p-4 rounded-xl border border-white/5 italic text-gray-400 text-[10px] leading-relaxed text-center">
                  Vendes mucho más rápido gracias a un ejército de difusores moviendo tu propiedad.
                </div>
              </div>
            </ScrollReveal>

            {/* ESCENARIO C: COLOCACIÓN Y CIERRE */}
            <ScrollReveal direction="up" delay={0.3}>
              <div className="vecy-card-apple border-accent/40 bg-accent/5 p-10 h-full relative group shadow-[0_0_50px_rgba(191,149,63,0.1)] flex flex-col">
                <div className="absolute top-4 right-4 bg-accent/20 text-accent px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Colocador Pro</div>
                <div className="flex items-center gap-4 mb-8">
                  <Target className="w-10 h-10 text-accent" />
                  <h3 className="text-xl font-bold text-white uppercase leading-tight">Tú Traes al <br/>Cliente</h3>
                </div>
                <p className="vecy-paragraph text-sm mb-8 flex-1 leading-relaxed">
                  Presentas al cliente formalmente a través del sistema <strong>Vecy Agenda</strong>, asistes a la visita y acompañas el cierre.
                </p>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-gray-400 text-[10px] uppercase font-bold">Tu Tarea</span>
                    <span className="text-white text-[10px] font-black uppercase">Presentar vía Vecy Agenda y Cerrar</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                    <span className="text-gray-400 text-[10px] uppercase font-bold">Tu Recompensa</span>
                    <span className="text-accent text-2xl font-black uppercase tracking-tighter">40% Íntegro</span>
                  </div>
                </div>
                <div className="bg-black/40 p-4 rounded-xl border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest text-center">
                  ¡Premio máximo garantizado por presentar al cliente y cerrar!
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

      <Footer />
    </div>
  );
}
