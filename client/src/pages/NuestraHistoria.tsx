import React from 'react';
import Navbar from '@/components/Navbar';
import { 
  History, 
  Leaf, 
  Wifi, 
  Smartphone, 
  Mail, 
  Signature, 
  TrendingUp,
  ShieldAlert,
  Skull,
  Zap,
  Globe,
  Award,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import NetworkBackground from '@/components/NetworkBackground';
import { useLocation } from 'wouter';

export default function NuestraHistoria() {
  const [, navigate] = useLocation();

  const timeline = [
    {
      year: "2018",
      title: "El Nacimiento del Broker Virtual",
      description: "VECY nace con una visión inaudita: operar sin oficinas físicas. Implementamos JotForm para digitalizar corretajes y procesos notariales desde el día 1.",
      icon: <Globe className="w-6 h-6 text-primary" />,
      links: [
        { label: "Ver legado Wix", url: "https://vecybienesraices.wixsite.com/brokervirtual" }
      ]
    },
    {
      year: "2020",
      title: "Resiliencia Total en Pandemia",
      description: "Mientras el mundo se detenía, VECY continuó operando con agendamientos y visitas virtuales. Nuestra infraestructura digital ya estaba lista para la crisis.",
      icon: <Wifi className="w-6 h-6 text-primary" />
    },
    {
      year: "2022",
      title: "Consolidación Tecnológica",
      description: "Evolucionamos hacia la automatización en redes sociales y comercialización potenciada por video, eliminando definitivamente los avisos físicos.",
      icon: <Smartphone className="w-6 h-6 text-primary" />
    },
    {
      year: "2024-2026",
      title: "El Armagedón de la IA",
      description: "Integración de JanIA como cerebro central. Nacen Vecy-Avaluos, Agenda-Pro y Phoenix. El fin oficial de la era arcaica inmobiliaria.",
      icon: <Zap className="w-6 h-6 text-primary" />,
      links: [
        { label: "Vecy Avalúos", url: "https://vecy-avaluos.netlify.app/" },
        { label: "Agenda Pro", url: "https://vecy-agenda-pro.vercel.app/" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />

      {/* HERO SECTION: DINOSAURIOS VS ARMAGEDON */}
      <section className="relative pt-32 pb-24 overflow-hidden border-b border-white/5">
        <NetworkBackground />
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl md:text-9xl font-display font-black tracking-tighter text-white mb-8 leading-none animate-fade-in">
              EL <span className="text-gradient-gold">ARMAGEDÓN</span>
            </h1>
            <p className="text-2xl text-gray-400 font-light mb-12 animate-fade-in delay-100 italic">
              "No somos una empresa nueva; somos 8 años de evolución imparable."
            </p>
            <div className="line-electric w-48 mx-auto mb-16"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 mt-12">
            {/* LOS DINOSAURIOS */}
            <div className="panel-card p-10 border-red-500/20 bg-red-500/5 group hover:border-red-500/40 transition-all">
              <div className="flex items-center gap-4 mb-6">
                <Skull className="w-10 h-10 text-red-500 opacity-70 group-hover:scale-110 transition-transform" />
                <h2 className="text-3xl font-display font-bold text-white uppercase tracking-wider">Los Dinosaurios</h2>
              </div>
              <ul className="space-y-4 text-gray-400 text-sm">
                <li className="flex gap-3"><span className="text-red-500">✕</span> Portales con buscadores de filtros obsoletos y lentos.</li>
                <li className="flex gap-3"><span className="text-red-500">✕</span> Agentes que ignoran el poder legal y técnico del Email.</li>
                <li className="flex gap-3"><span className="text-red-500">✕</span> Empresas que se niegan a implementar la IA en sus procesos.</li>
                <li className="flex gap-3"><span className="text-red-500">✕</span> Contaminación visual con avisos físicos y desperdicio de papel.</li>
              </ul>
            </div>

            {/* EL ARMAGEDÓN */}
            <div className="panel-card p-10 border-primary/20 bg-primary/5 group hover:border-primary/40 transition-all">
              <div className="flex items-center gap-4 mb-6">
                <Zap className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
                <h2 className="text-3xl font-display font-bold text-white uppercase tracking-wider">El Armagedón (Nosotros)</h2>
              </div>
              <ul className="space-y-4 text-gray-400 text-sm">
                <li className="flex gap-3"><span className="text-primary">✓</span> Matching inteligente por IA en segundos, no días.</li>
                <li className="flex gap-3"><span className="text-primary">✓</span> Blindaje de alianzas mediante Firma Digital y Correo Pro.</li>
                <li className="flex gap-3"><span className="text-primary">✓</span> Ecosistema 100% Virtual y Global (Sin oficinas, más agilidad).</li>
                <li className="flex gap-3"><span className="text-primary">✓</span> Defensa del medio ambiente: Cero Avisos, Cero Papel.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* TIMELINE SECTION */}
      <section className="py-24 bg-gradient-dark">
        <div className="container">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-display font-bold text-white mb-4">NUESTRA <span className="text-primary">TRAYECTORIA</span></h2>
            <div className="line-gold w-32 mx-auto"></div>
          </div>

          <div className="relative max-w-5xl mx-auto">
            {/* Vertical Line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-px bg-white/10 hidden md:block"></div>

            <div className="space-y-24">
              {timeline.map((item, idx) => (
                <div key={idx} className={`relative flex flex-col md:flex-row items-center gap-8 ${idx % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                  {/* Timeline Dot */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full bg-card border-2 border-primary flex items-center justify-center z-20 shadow-[0_0_20px_rgba(191,149,63,0.3)] hidden md:flex">
                    {item.icon}
                  </div>

                  {/* Content */}
                  <div className="w-full md:w-1/2 px-4">
                    <div className="panel-card p-8 hover:glow-gold-sm transition-all text-center md:text-left">
                      <span className="text-5xl font-black text-primary/20 block mb-2">{item.year}</span>
                      <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                      <p className="text-gray-400 leading-relaxed mb-6">
                        {item.description}
                      </p>
                      {item.links && (
                        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                          {item.links.map((link, lIdx) => (
                            <a 
                              key={lIdx} 
                              href={link.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-primary flex items-center gap-1 hover:text-white transition-colors uppercase tracking-widest"
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
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ENVIRONMENTAL COMMITMENT */}
      <section className="py-24 border-y border-white/5 bg-background relative overflow-hidden">
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Leaf className="w-16 h-16 text-green-500 mx-auto mb-8 animate-bounce" />
            <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-8 leading-tight">
              TECNOLOGÍA QUE <span className="text-green-500">RESPIRA</span>
            </h2>
            <p className="text-xl text-gray-400 leading-relaxed">
              Desde 2018, nuestra misión ha sido inseparable de la defensa del medio ambiente. 
              Eliminamos los **avisos físicos** que contaminan visualmente nuestras ciudades y reducimos 
              las emisiones de CO2 mediante visitas virtuales y firmas electrónicas (Ley 527/99).
            </p>
          </div>
        </div>
      </section>

      {/* TOOLS ECOSYSTEM */}
      <section className="py-24 bg-gradient-dark">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-display font-bold text-white mb-4 uppercase tracking-tighter">EL ECOSISTEMA <span className="text-primary">GOLD</span></h2>
            <p className="text-gray-400">Hoy somos mucho más que un broker; somos el motor del futuro.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "Vecy Avalúos", desc: "Tasación inteligente con Big Data.", url: "https://vecy-avaluos.netlify.app/" },
              { name: "Agenda Pro", desc: "Agendamiento automatizado sin fricción.", url: "https://vecy-agenda-pro.vercel.app/" },
              { name: "Academia VECY", desc: "Formación de élite para agentes 2.0.", url: "https://vecy-academia.vercel.app/" },
              { name: "JanIA AI", desc: "La super agente que lo orquesta todo.", url: "/red-colaboracion" }
            ].map((tool, idx) => (
              <div key={idx} className="panel-card p-6 text-center hover:bg-primary/5 transition-all group cursor-pointer" onClick={() => tool.url.startsWith('http') ? window.open(tool.url, '_blank') : navigate(tool.url)}>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors">{tool.name}</h3>
                <p className="text-xs text-gray-500 mb-4">{tool.desc}</p>
                <div className="text-primary text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-1">
                  Explorar <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-32 bg-background relative">
        <div className="container text-center">
          <h2 className="text-5xl md:text-7xl font-display font-black text-white mb-12">
            ÚNETE AL <span className="text-gradient-gold">AVANCE</span>
          </h2>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto font-light">
            No permitas que la era arcaica limite tu potencial. Es hora de dejar atrás los métodos de 2018 y abrazar el mañana.
          </p>
          <button 
            onClick={() => navigate('/agent-dashboard')}
            className="btn-gold px-16 py-6 text-xl tracking-widest"
          >
            SÉ PARTE DEL ARMAGEDÓN
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black border-t border-white/10 py-12">
        <div className="container text-center">
          <img src="/logo-vecy.png" alt="Vecy" className="h-12 mx-auto mb-6 opacity-30 grayscale" />
          <p className="text-gray-600 text-xs tracking-widest uppercase">
            Vecy Bienes Raíces — Broker Virtual Inmobiliario desde 2018.
          </p>
        </div>
      </footer>
    </div>
  );
}
