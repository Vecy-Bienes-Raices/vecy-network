import React from 'react';
import Navbar from '@/components/Navbar';
import NetworkBackground from '@/components/NetworkBackground';
import { ScrollReveal } from '@/components/ScrollReveal';
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  Database, 
  FileCheck, 
  UserCheck, 
  Mail, 
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useLocation } from 'wouter';

export default function PoliticaPrivacidad() {
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
              <ShieldCheck className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-primary">Protección de Datos Personales</span>
            </div>
            <h1 className="vecy-title-hero text-3xl sm:text-5xl font-black">
              POLÍTICA DE <span className="text-gradient-gold">PRIVACIDAD</span>
            </h1>
            <p className="vecy-subtitle max-w-2xl mx-auto text-sm sm:text-base text-gray-300 mt-4">
              Tratamiento de Datos Personales, Régimen de Hábeas Data y Seguridad Informática de <span className="text-white font-bold">VECY BIENES RAÍCES</span>.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6 text-[11px] font-mono text-gray-400">
              <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10">Ley Estatutaria 1581 de 2012</span>
              <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10">Decreto 1377 de 2013</span>
              <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10">Circular SIC 002 de 2015</span>
              <span className="bg-primary/15 text-primary px-3 py-1 rounded-full border border-primary/30 font-semibold">Vigencia: Octubre 2026</span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CONTENIDO PRINCIPAL */}
      <main className="container max-w-5xl mx-auto px-4 py-16 space-y-16">

        {/* 1. IDENTIFICACIÓN DEL RESPONSABLE */}
        <section className="glass p-8 sm:p-10 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-primary">Sección 1</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Responsable del Tratamiento de Datos</h2>
            </div>
          </div>
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
            <strong className="text-white">VECY BIENES RAÍCES</strong>, con domicilio principal en la ciudad de Bogotá D.C., Colombia, correo electrónico de atención oficial <strong className="text-primary">contacto@vecy.co</strong> y línea oficial bróker <strong className="text-white">+57 316 656 9719</strong>, actúa como <strong className="text-white">Responsable del Tratamiento de Datos Personales</strong> respecto de la información que recolecta, almacena, utiliza, circula o suprime a través de su portal web, su ecosistema móvil, el bot de inteligencia artificial <strong className="text-primary">JanIA</strong> y la plataforma de agendamiento <strong className="text-white">Vecy Agenda Pro</strong>.
          </p>
        </section>

        {/* 2. DATOS RECOLECTADOS Y FORMA DE CAPTURA */}
        <section className="glass p-8 sm:p-10 rounded-2xl border border-white/10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-primary">Sección 2</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Datos Recolectados y Mecanismos de Captura</h2>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="p-5 rounded-xl bg-black/50 border border-white/10 space-y-2">
              <h4 className="text-white font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" /> Datos de Identificación y Contacto
              </h4>
              <p className="text-gray-400 text-xs leading-relaxed">
                Nombres y apellidos completos, tipo y número de documento (Cédula de Ciudadanía, Cédula de Extranjería, Pasaporte, Permiso por Protección Temporal PPT o NIT), número de teléfono móvil WhatsApp y dirección de correo electrónico.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-black/50 border border-white/10 space-y-2">
              <h4 className="text-white font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" /> Datos de Inmuebles y Negocio
              </h4>
              <p className="text-gray-400 text-xs leading-relaxed">
                Ubicación del inmueble, dirección, estrato, área, número de matrícula inmobiliaria, canon de arriendo, precio de venta, fotografías y características físicas facilitadas por propietarios o agentes autorizados.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-black/50 border border-white/10 space-y-2">
              <h4 className="text-white font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" /> Validación Preventiva de Seguridad
              </h4>
              <p className="text-gray-400 text-xs leading-relaxed">
                Verificación de identidad y validación preventiva de antecedentes en bases de datos públicas oficiales (Policía Nacional, Procuraduría General de la Nación, ADRES/BDUA), exclusivamente con el fin de garantizar la seguridad de las partes en visitas presenciales a inmuebles privados.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-black/50 border border-white/10 space-y-2">
              <h4 className="text-white font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" /> Datos Técnicos y Telemetría Forense
              </h4>
              <p className="text-gray-400 text-xs leading-relaxed">
                Dirección IP de conexión, navegador, hora y fecha UTC-5 de interacciones en botones de contacto ("WhatsApp", "Llamada") y trazo gráfico de firma digital capturado en Vecy Agenda para la emisión de contratos bajo la Ley 527 de 1999.
              </p>
            </div>
          </div>
        </section>

        {/* 3. FINALIDADES DEL TRATAMIENTO */}
        <section className="glass p-8 sm:p-10 rounded-2xl border border-white/10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-primary">Sección 3</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Finalidades del Tratamiento</h2>
            </div>
          </div>

          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
            La información personal recolectada por VECY BIENES RAÍCES se destina única y exclusivamente a los siguientes propósitos legítimos:
          </p>

          <ul className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="text-primary font-bold">1.</span>
              <span><strong>Gestión de Corretaje Inmobiliario y Agendamiento:</strong> Coordinar, validar y confirmar visitas presenciales o virtuales a través de Vecy Agenda, notificando a propietarios, agentes y visitantes.</span>
            </li>
            <li className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="text-primary font-bold">2.</span>
              <span><strong>Generación de Contratos Digitales Blindados:</strong> Estampar la información requerida en contratos de visita, mandatos y acuerdos de corretaje con Código Único de Verificación (CUV), Código QR dinámico y Hash SHA-256 bajo la Ley 527 de 1999.</span>
            </li>
            <li className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="text-primary font-bold">3.</span>
              <span><strong>Algoritmo de Matching con Inteligencia Artificial:</strong> Cruzar de manera automatizada ofertas inmobiliarias y requerimientos de clientes mediante el motor de JanIA para encontrar compradores o arrendatarios compatibles al 85% - 100%.</span>
            </li>
            <li className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="text-primary font-bold">4.</span>
              <span><strong>Seguridad Física de Inmuebles:</strong> Identificar fehacientemente a las personas que ingresan a propiedades privadas para mitigar riesgos de suplantación o hechos delictivos.</span>
            </li>
            <li className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="text-primary font-bold">5.</span>
              <span><strong>Trazabilidad y No Elusión:</strong> Registrar la telemetría forense de clics y enlaces de marca blanca para garantizar el respeto de las comisiones del asesor captador, el difusor y la plataforma.</span>
            </li>
          </ul>
        </section>

        {/* 4. DERECHOS DE LOS TITULARES (HABEAS DATA) */}
        <section className="glass p-8 sm:p-10 rounded-2xl border border-white/10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-primary">Sección 4</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Derechos de los Titulares (Ley 1581 de 2012)</h2>
            </div>
          </div>

          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
            De conformidad con el <strong className="text-white">Artículo 8 de la Ley 1581 de 2012</strong>, usted como titular de datos personales tiene los siguientes derechos:
          </p>

          <div className="grid sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="p-4 rounded-xl bg-black/50 border border-white/10">
              <strong className="text-white block mb-1">a) Conocer, actualizar y rectificar</strong>
              <p className="text-gray-400 text-xs">Acceder a sus datos personales en cualquier momento y solicitar la corrección de datos inexactos o incompletos.</p>
            </div>
            <div className="p-4 rounded-xl bg-black/50 border border-white/10">
              <strong className="text-white block mb-1">b) Solicitar prueba de la autorización</strong>
              <p className="text-gray-400 text-xs">Obtener copia de la constancia digital en la cual otorgó su autorización para el tratamiento.</p>
            </div>
            <div className="p-4 rounded-xl bg-black/50 border border-white/10">
              <strong className="text-white block mb-1">c) Ser informado del uso</strong>
              <p className="text-gray-400 text-xs">Conocer con precisión qué destino y tratamiento se le está dando a su información.</p>
            </div>
            <div className="p-4 rounded-xl bg-black/50 border border-white/10">
              <strong className="text-white block mb-1">d) Revocar autorización y supresión</strong>
              <p className="text-gray-400 text-xs">Solicitar la eliminación de sus datos cuando no medie deber legal o contractual de permanencia (como contratos vigentes).</p>
            </div>
          </div>
        </section>

        {/* 5. CANAL DE ATENCIÓN Y PROCEDIMIENTO */}
        <section className="glass p-8 sm:p-10 rounded-2xl border border-white/10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-primary">Sección 5</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Canales y Procedimiento para el Ejercicio de Derechos</h2>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-black/60 border border-primary/30 space-y-3">
            <p className="text-sm text-gray-300">
              Para ejercer cualquiera de sus derechos de Hábeas Data, el titular debe remitir una solicitud formal por escrito a:
            </p>
            <div className="flex items-center gap-3 text-primary font-mono text-sm bg-primary/10 p-3 rounded-lg border border-primary/25">
              <Mail className="w-4 h-4 text-primary" />
              <strong>contacto@vecy.co</strong>
              <span className="text-xs text-gray-400 ml-auto">(Asunto: Solicitud Hábeas Data)</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              La solicitud será atendida en un plazo máximo de <strong className="text-white">diez (10) días hábiles</strong> para consultas y <strong className="text-white">quince (15) días hábiles</strong> para reclamos, conforme a los términos de ley.
            </p>
          </div>
        </section>

        {/* 6. COMPROMISO CONTRA LA VENTA DE DATOS */}
        <section className="glass p-8 sm:p-10 rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/5 to-transparent space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-emerald-400">Compromiso Sagrado</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Cero Venta o Alquiler de Bases de Datos</h2>
            </div>
          </div>
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
            <strong className="text-white">VECY BIENES RAÍCES JAMÁS comercializa, arrienda, subasta ni transfiere</strong> sus bases de datos personales a empresas de publicidad masiva, centrales de telemercadeo o terceras partes ajenas a la intermediación inmobiliaria solicitada por usted. Su confianza y la privacidad de su patrimonio son nuestro valor más preciado.
          </p>
          <div className="pt-4 flex flex-wrap gap-4 items-center justify-between border-t border-white/10">
            <span className="text-xs text-gray-500">Última actualización: Octubre 2026 · Bogotá D.C., Colombia</span>
            <button
              onClick={() => navigate('/terminos-y-condiciones')}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
            >
              Consultar Términos y Condiciones <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

      </main>

      {/* FOOTER INSTITUCIONAL */}
      <footer className="bg-black border-t border-white/10 py-16 relative z-10">
        <div className="container max-w-5xl mx-auto px-4 text-center space-y-4">
          <img src="/logo-vecy.png" alt="Vecy" className="h-10 mx-auto opacity-80" />
          <p className="text-xs text-gray-500 max-w-lg mx-auto">
            VECY BIENES RAÍCES — La evolución inevitable para el sector de los bienes raíces en Colombia.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-400 pt-2">
            <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/')}>Inicio</span>
            <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/historia')}>Nuestra Historia</span>
            <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/red-colaboracion')}>Bolsa Colaborativa</span>
            <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/terminos-y-condiciones')}>Términos y Condiciones</span>
            <span className="hover:text-primary cursor-pointer transition-colors text-primary font-bold" onClick={() => navigate('/politica-privacidad')}>Política de Privacidad</span>
          </div>
          <p className="text-[10px] text-gray-700 uppercase tracking-[0.4em] pt-4">
            © 2026 VECY Bienes Raíces — Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
