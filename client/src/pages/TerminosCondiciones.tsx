import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import NetworkBackground from '@/components/NetworkBackground';
import { ScrollReveal } from '@/components/ScrollReveal';
import { 
  ShieldCheck, 
  Scale, 
  Zap, 
  Clock, 
  Lock, 
  FileText, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Database
} from 'lucide-react';
import { useLocation } from 'wouter';

export default function TerminosCondiciones() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative min-h-[55vh] flex items-center justify-center overflow-hidden pt-24 pb-12 border-b border-white/5">
        <NetworkBackground />
        <div className="container relative z-10 text-center max-w-4xl mx-auto px-4">
          <ScrollReveal delay={0.1}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25 mb-5">
              <Scale className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-primary">Marco Jurídico Institucional</span>
            </div>
            <h1 className="vecy-title-hero text-3xl sm:text-5xl font-black">
              TÉRMINOS Y <span className="text-gradient-gold">CONDICIONES</span>
            </h1>
            <p className="vecy-subtitle max-w-2xl mx-auto text-sm sm:text-base text-gray-300 mt-4">
              Régimen General de Uso del Ecosistema Tecnológico, Corretaje Inmobiliario, Aceleración en Red y Contratación Digital de <span className="text-white font-bold">VECY BIENES RAÍCES</span>.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6 text-[11px] font-mono text-gray-400">
              <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10">Ley 527 de 1999</span>
              <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10">Decreto 2364 de 2012</span>
              <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10">Arts. 1340 - 1346 C.Co.</span>
              <span className="bg-primary/15 text-primary px-3 py-1 rounded-full border border-primary/30 font-semibold">Versión Vigente: Octubre 2026</span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CONTENIDO PRINCIPAL */}
      <main className="container max-w-5xl mx-auto px-4 py-16 space-y-16">

        {/* 1. PREÁMBULO Y NATURALEZA JURÍDICA */}
        <section className="glass p-8 sm:p-10 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-primary">Capítulo I</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Preámbulo y Aceptación de los Términos</h2>
            </div>
          </div>
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
            El presente instrumento reglamenta las relaciones jurídicas, mercantiles y operativas entre <strong className="text-white">VECY BIENES RAÍCES</strong> y toda persona natural o jurídica (en adelante, el <strong className="text-white">"Usuario"</strong> o <strong className="text-white">"Asesor Inmobiliario"</strong>) que acceda, navegue, registre inmuebles o requerimientos, utilice herramientas de Inteligencia Artificial (JanIA), genere fichas publicitarias de marca blanca, agende citas mediante Vecy Agenda o participe en la Bolsa Inmobiliaria Colaborativa.
          </p>
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
            El acceso, registro y utilización de la plataforma implica el conocimiento pleno y la <strong className="text-primary">aceptación expresa, incondicional e irrevocable</strong> de todas las cláusulas aquí consagradas, bajo el principio de la autonomía de la voluntad privada consagrado en el <strong className="text-white">Artículo 1602 del Código Civil Colombiano</strong>.
          </p>
        </section>

        {/* 2. MATRIZ OFICIAL DE RETRIBUCIÓN Y COMISIONES */}
        <section className="glass p-8 sm:p-10 rounded-2xl border border-primary/30 relative overflow-hidden space-y-8 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-primary">Capítulo II</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Modelos de Retribución, Comisiones y Período de Gracia</h2>
            </div>
          </div>

          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
            Al amparo del <strong className="text-white">Artículo 1341 del Código de Comercio</strong>, la remuneración del corredor es de libre fijación entre las partes. VECY BIENES RAÍCES establece una arquitectura tarifaria transparente, equitativa y sustancialmente más beneficiosa para el asesor que las franquicias tradicionales:
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Tarjeta 1: Gracia 5 días */}
            <div className="p-6 rounded-xl bg-black/60 border border-emerald-500/30 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">Días 1 a 5</span>
                  <Clock className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Período de Gracia Inmediata</h3>
                <div className="text-3xl font-black text-emerald-400 my-2">100% / $0 COP</div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Si el asesor cierra la negociación dentro de los primeros <strong className="text-white">5 días calendario</strong> contados desde la publicación inicial (por clientes propios preexistentes), <strong className="text-emerald-300">VECY no cobra absolutamente nada</strong>. El asesor retiene el 100% íntegro de su comisión.
                </p>
              </div>
              <div className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 text-center">
                Cero retención · Gratitud total
              </div>
            </div>

            {/* Tarjeta 2: Venta Directa 80/20 */}
            <div className="p-6 rounded-xl bg-black/60 border border-primary/50 flex flex-col justify-between space-y-4 shadow-[0_0_20px_rgba(191,149,63,0.15)]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">Día 6 en adelante</span>
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-white">Venta Directa con Tecnología VECY</h3>
                <div className="text-3xl font-black text-gradient-gold my-2">80% / 20%</div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Si el asesor cierra con un comprador directo tras beneficiarse de la tienda virtual, fichas digitales, atención de JanIA y difusión en red:
                  <br />
                  • <strong className="text-white">80% Neto para el Asesor</strong> (muy superior al 40-50% de franquicias tradicionales).
                  <br />
                  • <strong className="text-primary">10%</strong> para la Bolsa Colaborativa de colegas difusores.
                  <br />
                  • <strong className="text-primary">10%</strong> para soporte y tecnología VECY.
                </p>
              </div>
              <div className="text-[10px] font-mono text-primary bg-primary/10 px-2.5 py-1 rounded border border-primary/25 text-center font-bold">
                El asesor conserva la gran mayoría
              </div>
            </div>

            {/* Tarjeta 3: Red Colaborativa 40/20/40 */}
            <div className="p-6 rounded-xl bg-black/60 border border-blue-500/30 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400">Operación Compartida</span>
                  <Database className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Bolsa Colaborativa en Red</h3>
                <div className="text-3xl font-black text-blue-400 my-2">40 / 20 / 40</div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Cuando la venta o arriendo se perfecciona gracias a un colega colocador que aporta al comprador formalmente a través de <strong className="text-white">Vecy Agenda</strong>:
                  <br />
                  • <strong className="text-white">40%</strong> Asesor Captador.
                  <br />
                  • <strong className="text-blue-300">20%</strong> Aceleración y Soporte (10% Bolsa + 10% VECY).
                  <br />
                  • <strong className="text-white">40%</strong> Asesor Colocador.
                </p>
              </div>
              <div className="text-[10px] font-mono text-blue-400/80 bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/20 text-center">
                Sin intermediarios fantasmas
              </div>
            </div>
          </div>
        </section>

        {/* 3. TELEMETRÍA FORENSE Y PRUEBA DEL NEXO CAUSAL */}
        <section className="glass p-8 sm:p-10 rounded-2xl border border-white/10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-primary">Capítulo III</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Telemetría Digital Forense y Plena Prueba del Nexo Causal</h2>
            </div>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-gray-300 leading-relaxed">
            <p>
              En virtud de los <strong className="text-white">Artículos 1340 y 1341 del Código de Comercio</strong>, el corretaje se perfecciona cuando el negocio se celebra como consecuencia directa o indirecta de la labor de mediación.
            </p>
            <div className="p-5 rounded-xl bg-black/50 border border-white/10 space-y-3">
              <h4 className="text-white font-bold text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Registros de Telemetría con Valor Probatorio Inmutable:
              </h4>
              <p className="text-xs sm:text-sm text-gray-400">
                Los enlaces de difusión de marca blanca, los botones de interacción ("Contactar por WhatsApp", "Llamar al Asesor", "Agendar Visita") y las consultas atendidas por JanIA incorporan <strong className="text-white">tokens de trazabilidad criptográfica</strong>. El sistema almacena:
              </p>
              <ul className="grid sm:grid-cols-2 gap-2 text-xs font-mono text-gray-300">
                <li className="bg-white/5 p-2 rounded border border-white/5">• Dirección IP y geolocalización aproximada</li>
                <li className="bg-white/5 p-2 rounded border border-white/5">• Estampa de tiempo legal UTC-5 (Bogotá)</li>
                <li className="bg-white/5 p-2 rounded border border-white/5">• Token de identificación de ficha e inmueble</li>
                <li className="bg-white/5 p-2 rounded border border-white/5">• Agente difusor y trazabilidad de clics únicos</li>
              </ul>
            </div>
            <p>
              Al amparo de la <strong className="text-white">Ley 527 de 1999 (Ley de Comercio Electrónico)</strong>, estos registros de auditoría constituyen <strong className="text-primary font-semibold">Mensajes de Datos con plena fuerza probatoria y ejecutoria judicial</strong>. El asesor acepta que la constancia de que un cliente interactuó a través de estos canales constituye prueba incontrovertible de la causalidad entre la infraestructura provista por VECY y el cierre del negocio.
            </p>
          </div>
        </section>

        {/* 4. CLÁUSULA DE NO ELUSIÓN (NON-CIRCUMVENTION) Y CLÁUSULA PENAL */}
        <section className="glass p-8 sm:p-10 rounded-2xl border border-red-500/20 bg-gradient-to-b from-red-500/5 to-transparent space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-red-400">Capítulo IV</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Cláusula de No Elusión (Anti-Bypass) y Régimen Penal</h2>
            </div>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-gray-300 leading-relaxed">
            <p>
              <strong className="text-white">Obligación de No Elusión:</strong> Los asesores y usuarios se comprometen formalmente a no eludir, puentear ni excluir a VECY BIENES RAÍCES ni a los colegas participantes de la red. Queda terminantemente prohibido acordar cierres privados, contratos paralelos o modificaciones contractuales directas a espaldas de la plataforma con clientes, propietarios o terceros vinculados originados en el ecosistema.
            </p>
            <p>
              <strong className="text-white">Vigencia Posterior (12 Meses):</strong> La obligación de no elusión subsistirá durante todo el tiempo en que el inmueble o requerimiento permanezca publicado en el ecosistema y se extenderá por <strong className="text-white">doce (12) meses calendarios posteriores</strong> a su retiro o desactivación, respecto de cualquier persona o prospecto registrado en la base de datos o telemetría.
            </p>
            <div className="p-5 rounded-xl bg-black/60 border border-red-500/30 space-y-2">
              <h4 className="text-red-400 font-bold text-sm uppercase tracking-wide">Cláusula Penal Ejecutiva</h4>
              <p className="text-xs sm:text-sm text-gray-300">
                El incumplimiento grave de esta disposición dará lugar a la exigibilidad inmediata de una <strong className="text-white">sanción penal equivalente al 100% de la comisión total pactada</strong> de la operación inmobiliaria en favor de VECY BIENES RAÍCES y los agentes perjudicados. Para el cobro de esta obligación, los registros informáticos y contratos digitales prestan <strong className="text-red-300 font-bold">Mérito Ejecutivo</strong> suficiente sin necesidad de requerimiento previo en mora, al cual se renuncia expresamente.
              </p>
            </div>
          </div>
        </section>

        {/* 5. FIRMA ELECTRÓNICA, CUV Y VALIDACIÓN POR QR */}
        <section className="glass p-8 sm:p-10 rounded-2xl border border-white/10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-primary">Capítulo V</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Contratos Digitales con Sello Criptográfico y Validación QR</h2>
            </div>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-gray-300 leading-relaxed">
            <p>
              Todos los contratos de visita, alianzas de corretaje y órdenes de corretaje emitidos a través de <strong className="text-white">Vecy Agenda Pro</strong> y el servicio contractual de VECY se rigen por la <strong className="text-white">Ley 527 de 1999</strong> y el <strong className="text-white">Decreto 2364 de 2012</strong>:
            </p>
            <div className="grid sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <span className="text-primary font-bold font-mono">1. CUV Único</span>
                <p className="text-gray-400">Cada documento cuenta con un Código Único de Verificación alfanumérico estampado en cada folio.</p>
              </div>
              <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <span className="text-primary font-bold font-mono">2. Hash SHA-256</span>
                <p className="text-gray-400">Huella digital matemática inmutable que certifica que el contenido no ha sufrido modificaciones.</p>
              </div>
              <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <span className="text-primary font-bold font-mono">3. Código QR Dinámico</span>
                <p className="text-gray-400">Permite a cualquier parte o autoridad judicial certificar la autenticidad del documento en tiempo real en la web oficial.</p>
              </div>
            </div>
            <p>
              La captura gráfica del trazo manuscrito, la confirmación de código OTP o la aceptación mediante botón interactivo cumplen a cabalidad los requisitos de confiabilidad, autenticidad e integridad contemplados en el Decreto 2364 de 2012 para firmas electrónicas.
            </p>
          </div>
        </section>

        {/* 6. MODIFICACIONES Y LEGISLACIÓN APLICABLE */}
        <section className="glass p-8 sm:p-10 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-primary">Capítulo VI</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Jurisdicción y Ley Aplicable</h2>
            </div>
          </div>
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
            Estos términos se interpretan y ejecutan de conformidad exclusiva con las leyes de la <strong className="text-white">República de Colombia</strong>. Cualquier diferencia, controversia o reclamo que no pueda conciliarse directamente entre las partes será sometido a los jueces competentes de la ciudad de <strong className="text-white">Bogotá D.C., Colombia</strong>.
          </p>
          <div className="pt-4 flex flex-wrap gap-4 items-center justify-between border-t border-white/10">
            <span className="text-xs text-gray-500">VECY BIENES RAÍCES — Dirección Jurídica y Tecnológica</span>
            <button
              onClick={() => navigate('/politica-privacidad')}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
            >
              Consultar Política de Privacidad <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
