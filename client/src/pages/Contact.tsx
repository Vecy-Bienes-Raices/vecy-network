import React from 'react';
import Navbar from '@/components/Navbar';
import { Mail, Phone, MapPin, Send, MessageSquare } from 'lucide-react';

export default function Contact() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-12 bg-gradient-to-b from-black to-background">
        <div className="container text-center">
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-wider mb-6 animate-fade-in">
            ESTAMOS EN <span className="text-gradient-gold">CONTACTO</span>
          </h1>
          <div className="line-electric w-24 mx-auto mb-6"></div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto font-light lg:text-2xl">
            Tu próxima inversión inmobiliaria comienza con una conversación.
          </p>
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
                  href="https://wa.me/573166569719?text=%C2%A1Hola%20Vecy!%20%F0%9F%91%8B%20Estoy%20interesado%20en%20conocer%20m%C3%A1s%20sobre%20las%20oportunidades%20de%20inversi%C3%B3n%20inmobiliaria%20inteligente.%20%F0%9F%8F%A2%20%C2%BFPodr%C3%ADan%20asesorarme?"
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
                    href="https://wa.me/573166569719"
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

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-12">
        <div className="container text-center text-gray-400 text-sm">
          <p>&copy; 2026 Vecy. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
