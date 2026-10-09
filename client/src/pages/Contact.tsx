import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import NetworkBackground from '@/components/NetworkBackground';
import { ScrollReveal } from '@/components/ScrollReveal';
import { Mail, Phone, MapPin, Send, MessageSquare, Sparkles } from 'lucide-react';

export default function Contact() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />

      {/* Hero Section Unificado */}
      <section className="relative pt-36 pb-16 bg-gradient-to-b from-black via-zinc-950 to-background overflow-hidden border-b border-white/5">
        <NetworkBackground />
        {/* Glow de fondo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[320px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="container relative z-10 text-center max-w-4xl mx-auto px-4">
          <ScrollReveal delay={0.1}>
            <p className="vecy-accent-tag text-center">ATENCIÓN INMOBILIARIA PERSONALIZADA</p>

            <h1 className="vecy-title-hero uppercase tracking-tight">
              ESTAMOS EN <span className="text-gradient-gold">CONTACTO</span>
            </h1>

            <div className="line-electric w-36 sm:w-44 mx-auto my-5"></div>

            <p className="vecy-subtitle max-w-2xl mx-auto text-sm sm:text-base text-zinc-300">
              Tu próxima inversión o alianza inmobiliaria comienza con una conversación. Contáctanos por WhatsApp o formulario directo.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Form and info section */}
      <section className="py-20 bg-background overflow-hidden relative">
        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-16">
            
            {/* Contact Info Chips */}
            <div className="animate-slide-in-left">
              <h2 className="text-3xl font-bold text-white mb-8 tracking-wider uppercase">Sede Administrativa</h2>
              <div className="space-y-8">
                <div className="flex items-center gap-6 p-6 glass rounded-2xl border-white/10 hover:glow-gold-sm transition-all">
                  <div className="bg-white/5 p-4 rounded-xl">
                    <MapPin className="text-accent w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Ubicación Estratégica</h4>
                    <p className="text-gray-400">Cra. 14a #118-21, Usaquén, Bogotá</p>
                  </div>
                </div>

                <a 
                  href="https://wa.me/573192919978?text=%C2%A1Hola%20Vecy!%20%F0%9F%91%8B%20Estoy%20interesado%20en%20conocer%20m%C3%A1s%20sobre%20las%20oportunidades%20de%20inversi%C3%B3n%20inmobiliaria%20inteligente.%20%F0%9F%8F%A2%20%C2%BFPodr%C3%ADan%20asesorarme?"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-6 p-6 glass rounded-2xl border-white/10 hover:glow-gold-sm transition-all group"
                >
                  <div className="bg-white/5 p-4 rounded-xl group-hover:bg-accent/20 transition-colors">
                    <Phone className="text-accent w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg uppercase">WhatsApp Concierge</h4>
                    <p className="text-gray-400">+57 316 656 9719</p>
                  </div>
                </a>

                <div className="flex items-center gap-6 p-6 glass rounded-2xl border-white/10 hover:glow-gold-sm transition-all">
                  <div className="bg-white/5 p-4 rounded-xl">
                    <Mail className="text-accent w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Correo Directo</h4>
                    <p className="text-gray-400">vecybienesraices@gmail.com</p>
                  </div>
                </div>

                {/* Google Review Shortcut */}
                <a 
                  href="https://g.page/r/CctNbwU6UpX5EBM/review"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gold-outline w-full py-6 flex items-center justify-center gap-4 text-xs font-bold tracking-widest mt-4"
                >
                   CALIFICAR NUESTRAS OPERACIONES ⭐⭐⭐⭐⭐
                </a>
              </div>

              {/* Map Embed - Updated to Cra 14a #118 */}
              <div className="mt-12 rounded-3xl overflow-hidden glass border-white/10 h-64 hover:glow-gold transition-all duration-500">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3976.241315802319!2d-74.0435422!3d4.7001402!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f9a94e1d1d1d1%3A0x1d1d1d1d1d1d1d1d!2sCra.%2014a%20%23118-21%2C%20Bogot%C3%A1!5e0!3m2!1ses!2sco!4v1711920000000!5m2!1ses!2sco" 
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg)' }} 
                  allowFullScreen
                ></iframe>
              </div>
            </div>

            {/* Contact Form */}
            <div className="animate-slide-in-right">
              <div className="glass p-10 rounded-3xl border-white/10 relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <h2 className="text-3xl font-bold text-white mb-8 tracking-wider uppercase relative z-10">Agenda Una Asesoría</h2>
                
                <form className="space-y-6 relative z-10">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-accent uppercase tracking-widest">Nombre del Inversionista</label>
                      <input type="text" className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-accent transition-all" placeholder="Ej. Juan Pérez" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-accent uppercase tracking-widest">Correo Corporativo</label>
                      <input type="email" className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-accent transition-all" placeholder="juan@inversion.com" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-accent uppercase tracking-widest">Detalles del Patrimonio o Activo</label>
                    <textarea rows={4} className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-accent transition-all" placeholder="Descríbenos tu interés (Compra, Venta, Estructuración Financiera)..."></textarea>
                  </div>

                  <button type="submit" className="w-full btn-gold py-6 flex items-center justify-center gap-4 text-lg font-bold tracking-widest uppercase">
                    INICIAR GESTIÓN <Send size={20} />
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-gray-400 text-sm mb-4">¿Buscas agilidad 100% digital?</p>
                  <a 
                    href="https://wa.me/573192919978"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-accent font-bold mx-auto hover:glow-gold-sm transition-all w-fit px-4 py-2 rounded-lg"
                  >
                    <MessageSquare size={18} /> ESCRIBIR AL WHATSAPP MÁSTER
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
