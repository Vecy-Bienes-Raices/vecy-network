import React from 'react';
import Navbar from '@/components/Navbar';
import { 
  Leaf, 
  Wifi, 
  Smartphone, 
  Mail, 
  Zap,
  Globe,
  ArrowRight,
  ExternalLink,
  Skull
} from 'lucide-react';
import NetworkBackground from '@/components/NetworkBackground';
import { useLocation } from 'wouter';
import { ScrollReveal } from '@/components/ScrollReveal';

export default function NuestraHistoria() {
  const [, navigate] = useLocation();

  const timeline = [
    {
      year: "2018",
      title: "El Origen: Broker Virtual Inmobiliario",
      description: "VECY nace con una visión disruptiva: operar 100% digital. Fuimos pioneros en el uso de JotForm para automatizar corretajes y procesos legales cuando todos usaban papel.",
      icon: <Globe className="w-6 h-6 text-primary" />,
      links: [
        { label: "Legado Wix 2018", url: "https://vecybienesraices.wixsite.com/brokervirtual" },
        { label: "Misión Original", url: "https://vecybienesraices.wixsite.com/brokervirtual/mision" }
      ]
    },
    {
      year: "2020",
      title: "Resiliencia en Tiempos de Crisis",
      description: "Mientras la pandemia cerraba oficinas, VECY operaba sin interrupciones. Ya teníamos agendamientos virtuales, visitas por video y firmas digitales operativas desde 2018.",
      icon: <Wifi className="w-6 h-6 text-primary" />
    },
    {
      year: "2022",
      title: "Poder del Blindaje Digital",
      description: "Convertimos el Correo Electrónico en una herramienta de blindaje legal para alianzas y corretajes, mientras el mercado lo tildaba de obsoleto.",
      icon: <Mail className="w-6 h-6 text-primary" />
    },
    {
      year: "2024-2026",
      title: "Evolución Inevitable de la IA",
      description: "Surgimiento del ecosistema VECY GOLD. Integración total de JanIA, Avalúos Pro y agendamiento inteligente para extinguir la ineficiencia.",
      icon: <Zap className="w-6 h-6 text-primary" />,
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

      {/* HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden border-b border-white/5">
        <NetworkBackground />
        <div className="container relative z-10 text-center">
          <ScrollReveal delay={0.2}>
            <p className="vecy-accent-tag">Nuestra Identidad Corporativa</p>
            <h1 className="vecy-title-hero">
              SOMOS <span className="text-gradient-gold uppercase">VECY</span>
            </h1>
            <p className="vecy-subtitle max-w-3xl mx-auto">
              Liderando la evolución inmobiliaria con 8 años de visión tecnológica y un compromiso inquebrantable con la eficiencia.
            </p>
            <div className="line-electric w-48 mx-auto mt-8"></div>
          </ScrollReveal>
        </div>
      </section>

      {/* MANIFIESTO */}
      <section className="py-24 bg-gradient-dark">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12">
            {/* LOS DINOSAURIOS */}
            <ScrollReveal direction="left" delay={0.1}>
              <div className="vecy-card-apple border-red-500/10 bg-red-500/5 group hover:border-red-500/30">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <Skull className="w-8 h-8 text-red-500 opacity-70 group-hover:scale-110 transition-transform" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">Los Dinosaurios</h2>
                </div>
                <ul className="space-y-4 text-gray-400">
                  <li className="flex gap-3"><span className="text-red-500 font-bold">✕</span> Portales con buscadores obsoletos que ignoran la IA.</li>
                  <li className="flex gap-3"><span className="text-red-500 font-bold">✕</span> Agentes que tildan el email de obsoleto por falta de visión.</li>
                  <li className="flex gap-3"><span className="text-red-500 font-bold">✕</span> Negativa ante el avance tecnológico y la auto-preparación.</li>
                  <li className="flex gap-3"><span className="text-red-500 font-bold">✕</span> Contaminación con avisos físicos y desperdicio de papel.</li>
                </ul>
              </div>
            </ScrollReveal>

            {/* EVOLUCIÓN INEVITABLE */}
            <ScrollReveal direction="right" delay={0.1}>
              <div className="vecy-card-apple border-primary/10 bg-primary/5 group hover:border-primary/40 shadow-[0_0_30px_rgba(191,149,63,0.05)]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider">Evolución Inevitable</h2>
                </div>
                <ul className="space-y-4 text-gray-400">
                  <li className="flex gap-3"><span className="text-primary font-bold">✓</span> Matching quirúrgico y proactivo gestionado por JanIA.</li>
                  <li className="flex gap-3"><span className="text-primary font-bold">✓</span> Blindaje total de procesos vía Email y Firma Digital.</li>
                  <li className="flex gap-3"><span className="text-primary font-bold">✓</span> 8 años de trayectoria perfeccionando el corretaje virtual.</li>
                  <li className="flex gap-3"><span className="text-primary font-bold">✓</span> Defensores del medio ambiente: Cero Avisos, Cero Papel.</li>
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* TRAYECTORIA */}
      <section className="py-24 bg-background relative overflow-hidden">
        <div className="container">
          <ScrollReveal>
            <div className="text-center mb-20">
              <h2 className="vecy-title-section">NUESTRA <span className="text-primary uppercase">TRAYECTORIA</span></h2>
              <div className="line-gold w-32 mx-auto mt-4"></div>
            </div>
          </ScrollReveal>

          <div className="relative max-w-5xl mx-auto">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-px bg-white/10 hidden md:block"></div>

            <div className="space-y-32">
              {timeline.map((item, idx) => (
                <ScrollReveal 
                  key={idx} 
                  direction={idx % 2 === 0 ? 'right' : 'left'}
                  delay={0.1}
                >
                  <div className={`relative flex flex-col md:flex-row items-center gap-8 ${idx % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                    {/* Timeline Dot */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full bg-card border-2 border-primary flex items-center justify-center z-20 shadow-gold-sm hidden md:flex">
                      {item.icon}
                    </div>

                    {/* Content Card */}
                    <div className="w-full md:w-1/2 px-4">
                      <div className="vecy-card-apple p-10 hover:border-primary/40 group">
                        <span className="text-6xl font-black text-primary/10 block mb-4 group-hover:text-primary/20 transition-colors">{item.year}</span>
                        <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                        <p className="vecy-paragraph text-sm mb-6">
                          {item.description}
                        </p>
                        {item.links && (
                          <div className="flex flex-wrap gap-4">
                            {item.links.map((link, lIdx) => (
                              <a 
                                key={lIdx} 
                                href={link.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-[10px] font-bold text-primary flex items-center gap-1 hover:text-white transition-colors uppercase tracking-[0.2em]"
                              >
                                {link.label} <ExternalLink className="w-3 h-3" />
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

      {/* COMPROMISO VERDE */}
      <section className="py-24 bg-gradient-dark border-y border-white/5 relative overflow-hidden">
        <div className="container text-center relative z-10">
          <ScrollReveal delay={0.2}>
            <Leaf className="w-16 h-16 text-green-500 mx-auto mb-8 animate-pulse" />
            <h2 className="text-4xl md:text-6xl font-display font-black text-white mb-8">
              COMPROMISO <span className="text-green-500 uppercase">Verde</span>
            </h2>
            <p className="vecy-subtitle max-w-3xl mx-auto">
              Nuestra naturaleza es digital porque amamos la física. Desde 2018 hemos eliminado miles de avisos de ventana y toneladas de papel, reduciendo drásticamente la huella de carbono del corretaje inmobiliario.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-32 bg-background relative overflow-hidden">
        <div className="container text-center relative z-10">
          <ScrollReveal>
            <h2 className="vecy-title-hero">
              SÉ PARTE DE LA <span className="text-gradient-gold uppercase">Evolución</span>
            </h2>
            <p className="vecy-subtitle max-w-2xl mx-auto mb-12">
              Deja atrás la era de los dinosaurios. Únete a la red inmobiliaria más avanzada de Colombia y evoluciona hacia lo extraordinario.
            </p>
            <button 
              onClick={() => navigate('/agent-dashboard')} 
              className="btn-gold px-16 py-6 text-xl tracking-widest uppercase hover:scale-105 transition-transform"
            >
              Empezar Ahora
            </button>
          </ScrollReveal>
        </div>
      </section>

      <footer className="bg-black border-t border-white/10 py-12">
        <div className="container text-center">
          <img src="/logo-vecy.png" alt="Vecy" className="h-10 mx-auto mb-6 opacity-20" />
          <p className="text-gray-600 text-[10px] uppercase tracking-[0.3em]">
            VECY Bienes Raíces — Innovando desde 2018.
          </p>
        </div>
      </footer>
    </div>
  );
}
