import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  Leaf, 
  Wifi, 
  Mail, 
  Zap, 
  Globe, 
  ExternalLink, 
  Skull,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Cpu
} from 'lucide-react';
import NetworkBackground from '@/components/NetworkBackground';
import { useLocation } from 'wouter';
import { ScrollReveal } from '@/components/ScrollReveal';

export default function NuestraHistoria() {
  const [, navigate] = useLocation();

  const timeline = [
    {
      year: "2018",
      title: "El Origen Pionero: El Primer Broker Virtual Inmobiliario",
      description: "VECY nace bajo la visión transformadora de Eduardo A. Rivera y Jani Alves con un principio innegociable: operar 100% digital. Fuimos pioneros en implementar Formularios Web Automatizados para captación, peritaje y perfilamiento cuando todo el gremio inmobiliario dependía exclusivamente del papel y la lentitud presencial.",
      icon: <Globe className="w-6 h-6 text-primary" />,
      badges: ["100% Digital", "Formularios Web"]
    },
    {
      year: "2020",
      title: "Resiliencia Operativa y Cero Interrupciones",
      description: "Mientras la pandemia mundial paralizaba oficinas físicas, notarías y portales tradicionales, la infraestructura de VECY continuó operando al 100%. Agendamientos virtuales, recorridos en video de alta fidelidad y validación remota protegieron la inversión de nuestros clientes sin detener una sola negociación.",
      icon: <Wifi className="w-6 h-6 text-primary" />,
      badges: ["Operación Continua", "Cero Cuarentenas"]
    },
    {
      year: "2022",
      title: "Poder del Blindaje Legal con Mensajes de Datos",
      description: "Institucionalizamos el correo electrónico corporativo y los mensajes de datos como herramientas de blindaje jurídico pleno para corretajes y alianzas (Arts. 1340 y 1341 del Código de Comercio y Ley 527 de 1999). Frente a un mercado que tachaba el email de obsoleto, demostramos su valor probatorio inatacable.",
      icon: <Mail className="w-6 h-6 text-primary" />,
      badges: ["Ley 527 de 1999", "Seguridad Probatoria"]
    },
    {
      year: "2024",
      title: "Génesis de JanIA: Inteligencia Artificial en WhatsApp",
      description: "Nace JanIA, la primera Inteligencia Artificial especializada en bienes raíces para Colombia. Conectada nativamente a WhatsApp vía WebSocket, JanIA asume la extracción automática de datos, clasificación de inmuebles y el cruce algorítmico inmediato de ofertas con requerimientos en tiempo real.",
      icon: <Cpu className="w-6 h-6 text-primary" />,
      badges: ["IA Inmobiliaria", "WhatsApp Socket"]
    },
    {
      year: "2026",
      title: "VECY GOLD & El Súper Portal Colaborativo",
      description: "Consagración de la plataforma colaborativa definitiva: Vecy Agenda con validación de identidad preventiva por IA, Bolsa Inmobiliaria Colaborativa 40/20/40 con fichas de marca blanca, esquema 80/20 para captadores con 5 días de gracia y contratos digitales con sellos criptográficos CUV, SHA-256 y código QR inmutable.",
      icon: <Zap className="w-6 h-6 text-primary" />,
      badges: ["Ecosistema Gold", "Contratos Criptográficos con QR"],
      links: [
        { label: "Vecy Avalúos", url: "https://vecy-avaluos.netlify.app/" },
        { label: "Agenda Pro", url: "https://vecy-agenda-pro.vercel.app/" },
        { label: "Academia VECY", url: "https://vecy-academia.vercel.app/" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />

      {/* ── HERO SECTION UNIFICADO ── */}
      <section className="relative pt-36 pb-16 overflow-hidden border-b border-white/5 bg-gradient-to-b from-black via-zinc-950 to-background">
        <NetworkBackground />
        {/* Glow de fondo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[320px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="container relative z-10 text-center max-w-4xl mx-auto px-4">
          <ScrollReveal delay={0.1}>
            <p className="vecy-accent-tag text-center">IDENTIDAD CORPORATIVA & TRAYECTORIA</p>

            <h1 className="vecy-title-hero uppercase tracking-tight">
              SOMOS <span className="text-gradient-gold">VECY BIENES RAÍCES</span>
            </h1>

            <div className="line-electric w-36 sm:w-44 mx-auto my-5"></div>

            <p className="vecy-subtitle max-w-2xl mx-auto text-sm sm:text-base text-zinc-300">
              Liderando la evolución inmobiliaria en Colombia con 8 años de visión tecnológica, corretaje virtual de élite y un compromiso inquebrantable con la transparencia y el medio ambiente.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── MANIFIESTO COMPARATIVO: DINOSAURIOS VS EVOLUCIÓN INEVITABLE ── */}
      <section className="py-20 sm:py-24 bg-gradient-dark border-b border-white/5 relative">
        <div className="container px-4 sm:px-6">
          <ScrollReveal delay={0.1}>
            <div className="text-center mb-14">
              <p className="vecy-accent-tag">La Brecha de la Industria</p>
              <h2 className="vecy-title-section">
                PARADIGMAS DEL <span className="text-gradient-gold">SECTOR</span>
              </h2>
              <div className="line-gold w-24 mx-auto mt-3"></div>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">
            {/* CARD 1: DINOSAURIOS INMOBILIARIOS */}
            <ScrollReveal direction="left" delay={0.15}>
              <div className="vecy-card-apple border-red-500/20 bg-red-950/10 group hover:border-red-500/40 transition-all p-6 sm:p-8 md:p-10 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                      <Skull className="w-8 h-8 text-red-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400 block">El Pasado Ineficiente</span>
                      <h3 className="text-xl sm:text-2xl font-display font-bold text-white uppercase tracking-wider">
                        DINOSAURIOS INMOBILIARIOS
                      </h3>
                    </div>
                  </div>

                  <ul className="space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed">
                    <li className="flex gap-3 items-start">
                      <span className="text-red-500 font-bold shrink-0 mt-0.5">✕</span>
                      <span><strong className="text-white">Los actuales portales inmobiliarios</strong> y buscadores obsoletos que cobran sumas exorbitantes por búsquedas manuales ciegas, desactualizadas y saturadas de spam publicitario, ignorando la Inteligencia Artificial.</span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="text-red-500 font-bold shrink-0 mt-0.5">✕</span>
                      <span><strong className="text-white">Asesores anclados al pasado</strong> que tildan el correo electrónico y la tecnología de innecesarios por falta de visión, temor a la automatización y apego a la informalidad.</span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="text-red-500 font-bold shrink-0 mt-0.5">✕</span>
                      <span><strong className="text-white">Opacidad y tercerías deshonestas</strong> con intermediarios fantasmas que entorpecen negociaciones, ocultan datos de las partes y retienen comisiones sin ningún soporte legal ni nexo causal probado.</span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="text-red-500 font-bold shrink-0 mt-0.5">✕</span>
                      <span><strong className="text-white">Contaminación visual en fachadas</strong> con avisos físicos de papel, lonas y carteles obsoletos que saturan el espacio público y destruyen el entorno ambiental.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-red-500/15 flex items-center justify-between text-[11px] text-red-400 font-bold uppercase tracking-wider">
                  <span>Modelo en Vía de Extinción</span>
                  <span>Sin Soporte IA</span>
                </div>
              </div>
            </ScrollReveal>

            {/* CARD 2: VECY BIENES RAÍCES: EVOLUCIÓN INEVITABLE */}
            <ScrollReveal direction="right" delay={0.15}>
              <div className="vecy-card-apple border-[#d4af37]/30 bg-primary/5 group hover:border-[#d4af37]/60 shadow-[0_0_35px_rgba(191,149,63,0.1)] transition-all p-6 sm:p-8 md:p-10 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                      <Zap className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary block">El Nuevo Estándar</span>
                      <h3 className="text-xl sm:text-2xl font-display font-bold text-white uppercase tracking-wider">
                        VECY BIENES RAÍCES: EVOLUCIÓN INEVITABLE
                      </h3>
                    </div>
                  </div>

                  <ul className="space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed">
                    <li className="flex gap-3 items-start">
                      <span className="text-primary font-bold shrink-0 mt-0.5">✓</span>
                      <span><strong className="text-white">JanIA como Inteligencia Artificial de Élite</strong>, ejecutando matching matemático quirúrgico 24/7 entre ofertas y requerimientos en WhatsApp y la web en milisegundos.</span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="text-primary font-bold shrink-0 mt-0.5">✓</span>
                      <span><strong className="text-white">Blindaje jurídico integral</strong> con telemetría forense, correo electrónico certificado y contratos digitales inmediatos con Código Único de Validación (CUV), SHA-256 y QR inmutable (Ley 527 de 1999).</span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="text-primary font-bold shrink-0 mt-0.5">✓</span>
                      <span><strong className="text-white">Modelo colaborativo equitativo</strong> con esquema 80/20 para captación directa con tecnología VECY (5 días de gracia a $0 COP) y Bolsa Colaborativa 40/20/40 de marca blanca para la red difusora.</span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="text-primary font-bold shrink-0 mt-0.5">✓</span>
                      <span><strong className="text-white">Defensores del medio ambiente</strong>: Cero Avisos de ventana, Cero Desperdicio de Papel, 100% transacciones digitales y máxima velocidad de cierre.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-primary/20 flex items-center justify-between text-[11px] text-primary font-bold uppercase tracking-wider">
                  <span>Tecnología Validada</span>
                  <span>JanIA Ecosistema Activo</span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── TRAYECTORIA HISTÓRICA CON AÑOS LUMINOSOS Y DESTACADOS ── */}
      <section className="py-20 sm:py-28 bg-background relative overflow-hidden">
        <div className="container px-4 sm:px-6">
          <ScrollReveal>
            <div className="text-center mb-16 sm:mb-20">
              <p className="vecy-accent-tag">Hitos Reales Desde 2018</p>
              <h2 className="vecy-title-section">
                NUESTRA <span className="text-primary uppercase">TRAYECTORIA</span>
              </h2>
              <div className="line-gold w-32 mx-auto mt-4"></div>
            </div>
          </ScrollReveal>

          <div className="relative max-w-5xl mx-auto">
            {/* Línea central del timeline para pantallas md+ */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-px bg-gradient-to-b from-primary/30 via-primary/50 to-transparent hidden md:block"></div>

            <div className="space-y-16 sm:space-y-24">
              {timeline.map((item, idx) => (
                <ScrollReveal 
                  key={idx} 
                  direction={idx % 2 === 0 ? 'right' : 'left'}
                  delay={0.1}
                >
                  <div className={`relative flex flex-col md:flex-row items-center gap-8 ${idx % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                    {/* Timeline Dot Central */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-14 h-14 rounded-2xl bg-zinc-950 border-2 border-primary flex items-center justify-center z-20 shadow-[0_0_20px_rgba(212,175,55,0.4)] hidden md:flex">
                      {item.icon}
                    </div>

                    {/* Content Card */}
                    <div className="w-full md:w-1/2 px-2 sm:px-4">
                      <div className="vecy-card-apple p-6 sm:p-8 md:p-10 border-white/10 hover:border-primary/50 group transition-all">
                        {/* AÑO DESTACADO CON BRILLO DORADO DE ALTO IMPACTO (NO TENUE) */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-400/25 to-amber-500/20 border border-[#d4af37]/60 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                            <span className="text-2xl sm:text-3xl font-black text-gradient-gold tracking-wider">
                              {item.year}
                            </span>
                          </div>
                          
                          <div className="md:hidden w-10 h-10 rounded-xl bg-zinc-900 border border-primary/40 flex items-center justify-center">
                            {item.icon}
                          </div>
                        </div>

                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 group-hover:text-amber-300 transition-colors">
                          {item.title}
                        </h3>

                        <p className="vecy-paragraph text-xs sm:text-sm text-gray-300 mb-6 leading-relaxed">
                          {item.description}
                        </p>

                        {/* Badges de soporte */}
                        {item.badges && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {item.badges.map((b, bIdx) => (
                              <span key={bIdx} className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-zinc-300">
                                {b}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Enlaces de herramientas oficiales */}
                        {item.links && (
                          <div className="flex flex-wrap gap-3 pt-3 border-t border-white/10">
                            {item.links.map((link, lIdx) => (
                              <a 
                                key={lIdx} 
                                href={link.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-[11px] font-bold text-primary flex items-center gap-1.5 hover:text-white transition-colors uppercase tracking-[0.15em] bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/25"
                              >
                                <span>{link.label}</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="hidden md:block w-1/2"></div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPROMISO VERDE & DEFENSORÍA AMBIENTAL ── */}
      <section className="py-20 sm:py-24 bg-gradient-dark border-y border-white/5 relative overflow-hidden">
        <div className="container text-center relative z-10 max-w-4xl mx-auto px-4">
          <ScrollReveal delay={0.15}>
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_25px_rgba(16,185,129,0.25)]">
              <Leaf className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-emerald-400 uppercase tracking-[0.25em] text-xs font-bold mb-3">Sostenibilidad Inmobiliaria</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-white mb-6">
              COMPROMISO <span className="text-emerald-400 uppercase">Verde Innegociable</span>
            </h2>
            <p className="vecy-subtitle max-w-2xl mx-auto text-sm sm:text-base text-gray-300">
              Nuestra esencia es digital porque amamos el planeta físico. Desde 2018 hemos evitado miles de avisos de plástico en ventanas y toneladas de papel en contratos impresos, reduciendo drásticamente la huella de carbono y dignificando las fachadas de las ciudades.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── CTA FINAL CON BOTÓN DORADO 3D ── */}
      <section className="py-24 sm:py-32 bg-background relative overflow-hidden">
        <div className="container text-center relative z-10 max-w-3xl mx-auto px-4">
          <ScrollReveal>
            <h2 className="vecy-title-hero text-3xl sm:text-5xl font-black">
              SÉ PARTE DE LA <span className="text-gradient-gold uppercase">Evolución</span>
            </h2>
            <p className="vecy-subtitle max-w-xl mx-auto text-sm sm:text-base mb-10 text-gray-300">
              Deja atrás la era de los dinosaurios inmobiliarios. Únete a la red colaborativa más avanzada de Colombia y multiplica tus cierres con tecnología inteligente.
            </p>
            <button 
              onClick={() => navigate('/agent-dashboard')} 
              className="btn-gold px-12 py-4 text-sm sm:text-base tracking-widest uppercase cursor-pointer"
            >
              Empezar Ahora en la Red
            </button>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
