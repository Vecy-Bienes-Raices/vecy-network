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
      title: "El Armagedón de la IA",
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
      <section className="relative pt-32 pb-24 overflow-hidden border-b border-white/5">
        <NetworkBackground />
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl md:text-9xl font-display font-black tracking-tighter text-white mb-8 leading-none animate-fade-in text-center">
              SOMOS <span className="text-gradient-gold uppercase">VECY</span>
            </h1>
            <p className="text-2xl text-gray-400 font-light mb-12 animate-fade-in delay-100 text-center">
              "Liderando la evolución inmobiliaria con 8 años de visión tecnológica."
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
                <li className="flex gap-3"><span className="text-red-500 font-bold">✕</span> Portales con buscadores de filtros obsoletos que ignoran la IA.</li>
                <li className="flex gap-3"><span className="text-red-500 font-bold">✕</span> Agentes que creen que el email es obsoleto, sin ver su potencial legal.</li>
                <li className="flex gap-3"><span className="text-red-500 font-bold">✕</span> Negativa ante el avance tecnológico y la auto-preparación digital.</li>
                <li className="flex gap-3"><span className="text-red-500 font-bold">✕</span> Contaminación con avisos físicos y desperdicio de recursos.</li>
              </ul>
            </div>

            {/* EL ARMAGEDÓN */}
            <div className="panel-card p-10 border-primary/20 bg-primary/5 group hover:border-primary/40 transition-all shadow-[0_0_30px_rgba(191,149,63,0.05)]">
              <div className="flex items-center gap-4 mb-6">
                <Zap className="w-10 h-10 text-primary group-hover:scale-110 transition-transform shadow-primary" />
                <h2 className="text-3xl font-display font-bold text-white uppercase tracking-wider">El Armagedón</h2>
              </div>
              <ul className="space-y-4 text-gray-400 text-sm">
                <li className="flex gap-3"><span className="text-primary font-bold">✓</span> Matching quirúrgico y proactivo gestionado por JanIA.</li>
                <li className="flex gap-3"><span className="text-primary font-bold">✓</span> Blindaje total de procesos y alianzas vía Email y Firma Digital.</li>
                <li className="flex gap-3"><span className="text-primary font-bold">✓</span> 8 años de trayectoria perfeccionando el corretaje virtual.</li>
                <li className="flex gap-3"><span className="text-primary font-bold">✓</span> Defensores del medio ambiente: Cero Avisos, Cero Papel.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* TRAJECTORY */}
      <section className="py-24 bg-gradient-dark relative">
        <div className="container">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-display font-bold text-white mb-4 uppercase">Nuestra <span className="text-primary">Trayectoria</span></h2>
            <p className="text-gray-500 uppercase tracking-widest text-xs">Desde 2018 transformando el mercado</p>
            <div className="line-gold w-32 mx-auto mt-4"></div>
          </div>

          <div className="relative max-w-5xl mx-auto">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-px bg-white/10 hidden md:block"></div>

            <div className="space-y-24">
              {timeline.map((item, idx) => (
                <div key={idx} className={`relative flex flex-col md:flex-row items-center gap-8 ${idx % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full bg-card border-2 border-primary flex items-center justify-center z-20 shadow-gold-sm hidden md:flex">
                    {item.icon}
                  </div>
                  <div className="w-full md:w-1/2 px-4">
                    <div className="panel-card p-8 hover:border-primary/40 transition-all">
                      <span className="text-5xl font-black text-primary/10 block mb-2">{item.year}</span>
                      <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                      <p className="text-gray-400 leading-relaxed mb-6 text-sm">
                        {item.description}
                      </p>
                      {item.links && (
                        <div className="flex flex-wrap gap-4">
                          {item.links.map((link, lIdx) => (
                            <a key={lIdx} href={link.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-primary flex items-center gap-1 hover:text-white transition-colors uppercase tracking-[0.2em]">
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
      <section className="py-24 border-y border-white/5 bg-black relative">
        <div className="container text-center">
          <Leaf className="w-16 h-16 text-green-500 mx-auto mb-8 animate-pulse" />
          <h2 className="text-4xl md:text-6xl font-display font-black text-white mb-8">
            COMPROMISO <span className="text-green-500 uppercase">Verde</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto font-light leading-relaxed">
            Nuestra naturaleza es digital porque amamos la física. Desde 2018 hemos eliminado miles de avisos de ventana y toneladas de papel, reduciendo la huella de carbono de cada negocio cerrado.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 bg-background">
        <div className="container text-center">
          <h2 className="text-5xl md:text-8xl font-display font-black text-white mb-8 tracking-tighter">
            ÚNETE AL <span className="text-gradient-gold uppercase">Armagedón</span>
          </h2>
          <p className="text-xl text-gray-500 mb-12 max-w-2xl mx-auto">
            Deja atrás la era de los dinosaurios. Sé parte de la red inmobiliaria más avanzada de Colombia.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button onClick={() => navigate('/agent-dashboard')} className="btn-gold px-16 py-6 text-xl tracking-widest uppercase text-center">
              Empezar Ahora
            </button>
          </div>
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
