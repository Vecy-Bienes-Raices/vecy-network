import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import NetworkBackground from '@/components/NetworkBackground';
import { ScrollReveal } from '@/components/ScrollReveal';
import {
  Printer,
  ArrowRight,
  ShieldCheck,
  Lock,
  Mail,
  UserCheck,
  FileCheck,
  Eye,
  Database
} from 'lucide-react';
import { useLocation } from 'wouter';

export default function PoliticaPrivacidad() {
  const [, navigate] = useLocation();

  React.useEffect(() => {
    const prevTitle = document.title;
    document.title = "VECY Bienes Raíces — Política de Privacidad";
    return () => {
      document.title = prevTitle;
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 print:bg-white print:text-black">
      <Navbar />

      {/* CABECERO SUPERIOR WEB (ESTILO LIMPIO CON RAYITA 3D) */}
      <section className="relative pt-36 pb-12 bg-gradient-to-b from-black via-zinc-950 to-background overflow-hidden border-b border-white/5 no-print print:hidden">
        <NetworkBackground />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[320px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="container relative z-10 text-center max-w-4xl mx-auto px-4">
          <ScrollReveal delay={0.1}>
            {/* Tag limpio sin burbujas */}
            <div className="vecy-accent-tag">
              PROTECCIÓN DE DATOS PERSONALES & HÁBEAS DATA
            </div>

            {/* Título de la página con rayita 3D */}
            <h1 className="vecy-title-hero text-3xl sm:text-5xl font-black">
              POLÍTICA DE <span className="text-gradient-gold">PRIVACIDAD</span>
            </h1>

            {/* Rayita tridimensional debajo del título */}
            <div className="line-electric w-32 sm:w-48 mx-auto my-3" />

            {/* Subtítulo limpio y fluido */}
            <p className="vecy-subtitle max-w-2xl mx-auto text-sm sm:text-base text-gray-300 mt-2">
              Tratamiento de Datos Personales, Régimen de Hábeas Data y Seguridad Informática de <span className="text-white font-bold">VECY BIENES RAÍCES</span>.
            </p>

            {/* Barra de herramientas para descargar/imprimir */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <button
                onClick={handlePrint}
                className="btn-gold px-6 py-2.5 rounded-lg flex items-center gap-2 text-xs sm:text-sm font-bold shadow-lg cursor-pointer"
                title="Descargar o imprimir documento oficial membretado en hoja blanca y letra negra"
              >
                <Printer className="w-4 h-4" />
                <span>Descargar PDF / Imprimir Documento</span>
              </button>

              <button
                onClick={() => navigate('/terminos-y-condiciones')}
                className="px-5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-gray-300 hover:text-white hover:border-primary/40 text-xs sm:text-sm font-medium flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Ver Términos y Condiciones</span>
                <ArrowRight className="w-3.5 h-3.5 text-primary" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-[11px] font-mono text-gray-400">
              <span>Ley Estatutaria 1581 de 2012</span>
              <span>•</span>
              <span>Decreto 1377 de 2013</span>
              <span>•</span>
              <span>Circular SIC 002 de 2015</span>
              <span>•</span>
              <span className="text-primary font-semibold">Vigencia: Octubre 2026 (v32.69)</span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* DOCUMENTO FORMAL (CARD TIPO VIDRIO ESMERILADO CON ILUMINACIÓN TRASERA & CONVERSIÓN MONOCROMÁTICA EN IMPRESIÓN/PDF) */}
      <main className="container max-w-4xl mx-auto px-4 py-8 sm:py-12 print:max-w-none print:w-full print:p-0 print:m-0">
        <article className="print-document-sheet relative w-full bg-[#12161f]/85 backdrop-blur-2xl border border-[#bf953f]/30 rounded-3xl shadow-[0_0_60px_rgba(191,149,63,0.12)] overflow-hidden flex flex-col font-sans transition-all print:bg-white print:text-black print:border-none print:shadow-none print:rounded-none print:p-0">

          {/* CABECERO CON ACCENTO DORADO Y CRISTAL TRANSLÚCIDO */}
          <header className="bg-white/[0.03] border-b border-[#bf953f]/20 p-6 sm:p-8 print:bg-white print:border-b-2 print:border-black print:p-0 print:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#bf953f]/10 border border-[#bf953f]/30 p-2 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(191,149,63,0.2)] print:border-none print:shadow-none print:p-0">
                  <img
                    src="/logo-vecy.png"
                    alt="VECY BIENES RAÍCES"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase print:text-black">
                      VECY BIENES RAÍCES
                    </h2>
                    <span className="text-[10px] font-bold text-[#bf953f] bg-[#bf953f]/10 border border-[#bf953f]/20 px-2 py-0.5 rounded-full uppercase print:border-black print:text-black">
                      HÁBEAS DATA OFICIAL
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-[#bf953f] mt-0.5 print:text-black">
                    SISTEMA COLABORATIVO DE CORRETAJE INMOBILIARIO & CONTRATACIÓN DIGITAL
                  </p>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5 print:text-gray-600">
                    Bogotá D.C., Colombia · Correo: contacto@vecy.co · PBX: +57 316 656 9719
                  </p>
                </div>
              </div>
              <div className="sm:text-right text-[11px] font-mono text-zinc-300 bg-white/[0.03] sm:bg-transparent p-3 sm:p-0 rounded-xl border border-white/5 sm:border-none print:text-black print:bg-transparent print:border-none">
                <div><strong>FOLIO:</strong> <span className="text-[#bf953f] font-bold print:text-black">VECY-PRIV-2026-COL</span></div>
                <div><strong>FECHA:</strong> Octubre de 2026</div>
                <div><strong>ESTADO:</strong> <span className="text-emerald-400 font-bold print:text-black">Vigente Oficial</span></div>
              </div>
            </div>

            {/* Cuadro notarial y de validez digital (Estilo Sub-Card Vidrio Esmerilado Luminoso) */}
            <div className="mt-6 pt-5 border-t border-white/5 grid sm:grid-cols-2 gap-3 text-xs bg-white/[0.03] p-4 sm:p-5 rounded-2xl border border-white/10 print:bg-white print:border-gray-300 print:text-black print:p-2">
              <div>
                <span className="font-bold text-zinc-200 block print:text-black">Instrumento Jurídico:</span>
                <span className="text-zinc-400 print:text-gray-700">Manual y Política de Tratamiento de Datos Personales (Hábeas Data)</span>
              </div>
              <div>
                <span className="font-bold text-zinc-200 block print:text-black">Marco Legal Aplicable:</span>
                <span className="text-zinc-400 print:text-gray-700">Ley 1581 de 2012, Decreto 1377 de 2013 y Art. 15 C.P.</span>
              </div>
              <div>
                <span className="font-bold text-zinc-200 block print:text-black">Código Único de Validación (CUV):</span>
                <span className="font-mono text-[#bf953f] font-bold print:text-black">VECY-PRIVACY-2026-BOG-9978</span>
              </div>
              <div>
                <span className="font-bold text-zinc-200 block print:text-black">Huella Digital (SHA-256):</span>
                <span className="font-mono text-[10px] text-zinc-400 break-all print:text-gray-700">f7c13b5e408892d1847c21008745ea98711823901bcae528471029381948ba12</span>
              </div>
            </div>
          </header>

          {/* CUERPO CONTINUO DEL DOCUMENTO */}
          <div className="p-6 sm:p-10 space-y-8 text-sm sm:text-[15px] text-zinc-300 leading-relaxed text-left print:text-black print:p-0 print:space-y-4">

            {/* ARTÍCULO 1 */}
            <section className="space-y-3 pb-6 border-b border-white/5 print:border-b print:border-gray-300 print:pb-3">
              <div className="border-b border-white/10 pb-2 mb-3 print:border-b print:border-gray-400">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-[#bf953f] bg-[#bf953f]/10 border border-[#bf953f]/20 px-2 py-0.5 rounded tracking-wider uppercase font-mono print:text-black print:bg-transparent print:border-black">
                    Artículo 1
                  </span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold print:text-gray-600">
                    Identificación
                  </span>
                </div>
                <h3 className="clause-header text-base sm:text-lg font-bold text-white tracking-tight print:text-black">
                  Identificación del Responsable del Tratamiento
                </h3>
              </div>
              <p>
                <strong className="text-white print:text-black">VECY BIENES RAÍCES</strong>, con domicilio principal en la ciudad de Bogotá D.C., Colombia, correo electrónico oficial de contacto <strong className="text-white print:text-black">contacto@vecy.co</strong>, línea oficial del bróker <strong className="text-white print:text-black">+57 316 656 9719</strong> y portal web <strong className="text-white print:text-black">https://vecy-network.vercel.app</strong>, actúa como <strong className="text-white print:text-black">Responsable del Tratamiento de Datos Personales</strong> respecto de la información que recolecta, almacena, utiliza, circula o suprime a través de sus plataformas digitales, canales de mensajería, el bot de Inteligencia Artificial <strong className="text-[#bf953f] print:text-black">JanIA</strong> y el sistema de agendamiento <strong className="text-white print:text-black">Vecy Agenda Pro</strong>.
              </p>
            </section>

            {/* ARTÍCULO 2 */}
            <section className="space-y-3 pb-6 border-b border-white/5 print:border-b print:border-gray-300 print:pb-3">
              <div className="border-b border-white/10 pb-2 mb-3 print:border-b print:border-gray-400">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-[#bf953f] bg-[#bf953f]/10 border border-[#bf953f]/20 px-2 py-0.5 rounded tracking-wider uppercase font-mono print:text-black print:bg-transparent print:border-black">
                    Artículo 2
                  </span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold print:text-gray-600">
                    Datos Capturados
                  </span>
                </div>
                <h3 className="clause-header text-base sm:text-lg font-bold text-white tracking-tight print:text-black">
                  Datos Personales Objeto de Tratamiento y Mecanismos de Captura
                </h3>
              </div>
              <p>
                En el desarrollo de sus actividades de corretaje inmobiliario, intermediación colaborativa y desarrollo tecnológico, VECY BIENES RAÍCES recolecta los siguientes datos:
              </p>
              <div className="space-y-2.5 pl-1 sm:pl-2">
                <div className="border-l-4 border-[#bf953f] bg-white/[0.03] p-3.5 rounded-r-xl print:bg-white print:border-l-4 print:border-black">
                  <strong className="text-white block mb-0.5 print:text-black">a) Datos de Identificación y Contacto:</strong>
                  <span className="text-zinc-300 print:text-gray-700">Nombres y apellidos completos, tipo y número de identificación (Cédula de Ciudadanía, Cédula de Extranjería, Pasaporte, Permiso por Protección Temporal PPT o NIT), número de teléfono móvil WhatsApp y dirección de correo electrónico.</span>
                </div>
                <div className="border-l-4 border-amber-500 bg-white/[0.03] p-3.5 rounded-r-xl print:bg-white print:border-l-4 print:border-black">
                  <strong className="text-white block mb-0.5 print:text-black">b) Datos de Inmuebles y Operación:</strong>
                  <span className="text-zinc-300 print:text-gray-700">Ubicación del predio, dirección, estrato socioeconómico, área construida y privada, número de matrícula inmobiliaria, valor de canon o precio de venta y características físicas suministradas por los propietarios o asesores autorizados.</span>
                </div>
                <div className="border-l-4 border-emerald-500 bg-white/[0.03] p-3.5 rounded-r-xl print:bg-white print:border-l-4 print:border-black">
                  <strong className="text-white block mb-0.5 print:text-black">c) Validación Preventiva de Seguridad:</strong>
                  <span className="text-zinc-300 print:text-gray-700">Consulta y verificación en fuentes públicas oficiales (Policía Nacional de Colombia, Procuraduría General de la Nación, ADRES/BDUA), realizada exclusivamente con la finalidad de salvaguardar la seguridad física de los propietarios, ocupantes y asesores en visitas a predios privados.</span>
                </div>
                <div className="border-l-4 border-cyan-500 bg-white/[0.03] p-3.5 rounded-r-xl print:bg-white print:border-l-4 print:border-black">
                  <strong className="text-white block mb-0.5 print:text-black">d) Telemetría Forense y Mensajes de Datos:</strong>
                  <span className="text-zinc-300 print:text-gray-700">Registro de direcciones IP, fecha y hora exacta (UTC-5 Bogotá), identificador de enlaces únicos de marca blanca y trazo digital de firma manuscrita capturada en pantalla para la emisión de contratos bajo la Ley 527 de 1999.</span>
                </div>
              </div>
            </section>

            {/* ARTÍCULO 3 */}
            <section className="space-y-3 pb-6 border-b border-white/5 print:border-b print:border-gray-300 print:pb-3">
              <div className="border-b border-white/10 pb-2 mb-3 print:border-b print:border-gray-400">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-[#bf953f] bg-[#bf953f]/10 border border-[#bf953f]/20 px-2 py-0.5 rounded tracking-wider uppercase font-mono print:text-black print:bg-transparent print:border-black">
                    Artículo 3
                  </span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold print:text-gray-600">
                    Propósito
                  </span>
                </div>
                <h3 className="clause-header text-base sm:text-lg font-bold text-white tracking-tight print:text-black">
                  Finalidades Legítimas del Tratamiento
                </h3>
              </div>
              <p>
                Los datos personales recolectados se destinan exclusivamente a las siguientes finalidades legítimas y proporcionales:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-zinc-300 pl-2 print:text-gray-700">
                <li><strong className="text-white print:text-black">Gestión y Agendamiento de Citas:</strong> Notificar, coordinar y confirmar visitas inmobiliarias entre propietarios, asesores captadores, colocadores y clientes a través de Vecy Agenda.</li>
                <li><strong className="text-white print:text-black">Formalización Contractual Digital:</strong> Estampar la información necesaria en actas de visita, órdenes de corretaje y contratos de mandato con Código Único de Validación (CUV) y Hash SHA-256.</li>
                <li><strong className="text-white print:text-black">Cruce Inteligente con IA (JanIA):</strong> Ejecutar el algoritmo de compatibilidad entre ofertas y demandas inmobiliarias para generar matches de alta afinidad (85% a 100%).</li>
                <li><strong className="text-white print:text-black">Seguridad Preventiva:</strong> Mitigar riesgos de suplantación de identidad o hechos delictivos durante el acceso a bienes raíces residenciales y comerciales.</li>
                <li><strong className="text-white print:text-black">Protección de Comisiones Colaborativas:</strong> Certificar el nexo causal de mediación y la trazabilidad de los asesores difusores para liquidar con transparencia las comisiones correspondientes.</li>
              </ul>
            </section>

            {/* ARTÍCULO 4 */}
            <section className="space-y-3 pb-6 border-b border-white/5 print:border-b print:border-gray-300 print:pb-3">
              <div className="border-b border-white/10 pb-2 mb-3 print:border-b print:border-gray-400">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-[#bf953f] bg-[#bf953f]/10 border border-[#bf953f]/20 px-2 py-0.5 rounded tracking-wider uppercase font-mono print:text-black print:bg-transparent print:border-black">
                    Artículo 4
                  </span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold print:text-gray-600">
                    Derechos del Titular
                  </span>
                </div>
                <h3 className="clause-header text-base sm:text-lg font-bold text-white tracking-tight print:text-black">
                  Derechos de los Titulares de la Información (Ley 1581 de 2012)
                </h3>
              </div>
              <p>
                De conformidad con el <strong className="text-white print:text-black">Artículo 8 de la Ley 1581 de 2012</strong>, todo titular de datos personales cuenta con los siguientes derechos inalienables:
              </p>
              <ul className="list-disc list-inside space-y-1 text-zinc-300 pl-2 print:text-gray-700">
                <li><strong className="text-white print:text-black">Conocer, actualizar y rectificar</strong> sus datos personales frente a VECY BIENES RAÍCES respecto de datos parciales, inexactos, incompletos o fraccionados.</li>
                <li><strong className="text-white print:text-black">Solicitar prueba</strong> de la autorización otorgada para el tratamiento de sus datos, salvo en los casos expresamente exceptuados por la ley.</li>
                <li><strong className="text-white print:text-black">Ser informado</strong> por VECY BIENES RAÍCES, previa solicitud formal, acerca del uso que se le ha dado a sus datos personales.</li>
                <li><strong className="text-white print:text-black">Presentar quejas</strong> ante la Superintendencia de Industria y Comercio (SIC) por infracciones a lo dispuesto en la legislación de Hábeas Data.</li>
                <li><strong className="text-white print:text-black">Revocar la autorización o solicitar la supresión</strong> del dato cuando en el tratamiento no se respeten los principios, derechos y garantías constitucionales o legales, o cuando no medie obligación legal o contractual vigente de permanencia.</li>
              </ul>
            </section>

            {/* ARTÍCULO 5 */}
            <section className="space-y-3 pb-6 border-b border-white/5 print:border-b print:border-gray-300 print:pb-3">
              <div className="border-b border-white/10 pb-2 mb-3 print:border-b print:border-gray-400">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-[#bf953f] bg-[#bf953f]/10 border border-[#bf953f]/20 px-2 py-0.5 rounded tracking-wider uppercase font-mono print:text-black print:bg-transparent print:border-black">
                    Artículo 5
                  </span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold print:text-gray-600">
                    Canales de Atención
                  </span>
                </div>
                <h3 className="clause-header text-base sm:text-lg font-bold text-white tracking-tight print:text-black">
                  Canales y Procedimiento para el Ejercicio de Derechos de Hábeas Data
                </h3>
              </div>
              <p>
                Los titulares de la información o sus apoderados debidamente autorizados podrán ejercer sus derechos mediante comunicación formal enviada al correo electrónico oficial:
              </p>
              <div className="bg-white/[0.03] border border-[#bf953f]/30 p-4 rounded-xl font-mono text-xs sm:text-sm text-zinc-200 print:bg-white print:border-gray-300 print:text-black">
                <strong className="text-[#bf953f] print:text-black">Correo Oficial de Hábeas Data:</strong> contacto@vecy.co <br />
                <span className="text-zinc-400 text-xs mt-1 block print:text-gray-700">Asunto requerido: "Ejercicio de Derechos Hábeas Data — [Nombre Completo y Documento]"</span>
              </div>
              <p>
                Las <strong className="text-white print:text-black">consultas</strong> serán atendidas en un plazo máximo de diez (10) días hábiles contados a partir de su recepción. Los <strong className="text-white print:text-black">reclamos</strong> que busquen la corrección, actualización o supresión de datos se resolverán en un término máximo de quince (15) días hábiles, conforme a los términos de ley.
              </p>
            </section>

            {/* ARTÍCULO 6 */}
            <section className="space-y-3 pb-6 border-b border-white/5 print:border-b print:border-gray-300 print:pb-3">
              <div className="border-b border-white/10 pb-2 mb-3 print:border-b print:border-gray-400">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-[#bf953f] bg-[#bf953f]/10 border border-[#bf953f]/20 px-2 py-0.5 rounded tracking-wider uppercase font-mono print:text-black print:bg-transparent print:border-black">
                    Artículo 6
                  </span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold print:text-gray-600">
                    Garantía Institucional
                  </span>
                </div>
                <h3 className="clause-header text-base sm:text-lg font-bold text-white tracking-tight print:text-black">
                  Compromiso Innegociable Contra la Venta o Alquiler de Bases de Datos
                </h3>
              </div>
              <p>
                <strong className="text-white print:text-black">VECY BIENES RAÍCES prohíbe terminantemente y jamás realiza</strong> la venta, subasta, cesión lucrativa o alquiler de los datos personales de sus usuarios a centrales de publicidad masiva, compañías de telemercadeo o entidades externas sin relación directa con la operación inmobiliaria contratada. La custodia del patrimonio y la intimidad de las familias y asesores vinculados es un principio institucional no sujeto a transacción.
              </p>
            </section>

            {/* ARTÍCULO 7 */}
            <section className="space-y-3 pb-6 border-b border-white/5 print:border-b print:border-gray-300 print:pb-3">
              <div className="border-b border-white/10 pb-2 mb-3 print:border-b print:border-gray-400">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-[#bf953f] bg-[#bf953f]/10 border border-[#bf953f]/20 px-2 py-0.5 rounded tracking-wider uppercase font-mono print:text-black print:bg-transparent print:border-black">
                    Artículo 7
                  </span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold print:text-gray-600">
                    Seguridad
                  </span>
                </div>
                <h3 className="clause-header text-base sm:text-lg font-bold text-white tracking-tight print:text-black">
                  Seguridad de la Información y Telemetría
                </h3>
              </div>
              <p>
                VECY BIENES RAÍCES implementa medidas de seguridad técnicas, humanas y administrativas de nivel bancario e industrial para evitar la adulteración, pérdida, consulta no autorizada o uso fraudulento de la información. El acceso a los datos está restringido bajo credenciales cifradas y roles estrictos de superadministrador.
              </p>
            </section>

            {/* ARTÍCULO 8 */}
            <section className="space-y-3">
              <div className="border-b border-white/10 pb-2 mb-3 print:border-b print:border-gray-400">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-[#bf953f] bg-[#bf953f]/10 border border-[#bf953f]/20 px-2 py-0.5 rounded tracking-wider uppercase font-mono print:text-black print:bg-transparent print:border-black">
                    Artículo 8
                  </span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold print:text-gray-600">
                    Vigencia Legal
                  </span>
                </div>
                <h3 className="clause-header text-base sm:text-lg font-bold text-white tracking-tight print:text-black">
                  Vigencia de las Bases de Datos y Modificaciones
                </h3>
              </div>
              <p>
                La presente Política de Tratamiento de Datos Personales entra en vigencia a partir del mes de <strong className="text-white print:text-black">octubre de 2026</strong>. Las bases de datos se mantendrán vigentes durante el tiempo que subsista la relación comercial o legal con el titular, más los plazos legales de prescripción mercantil y tributaria aplicables en Colombia.
              </p>
            </section>

          </div>

          {/* PIE DE PÁGINA MEMBRETADO FORMAL */}
          <footer className="bg-white/[0.03] border-t border-[#bf953f]/20 p-5 sm:p-6 text-xs text-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-4 print:bg-white print:border-t-2 print:border-black print:text-black print:p-0 print:mt-6">
            <div>
              <p className="font-bold text-zinc-200 print:text-black">
                VECY BIENES RAÍCES — Dirección Jurídica y Tecnológica
              </p>
              <p className="text-[11px] text-zinc-500 print:text-gray-600">
                Manual y Política de Tratamiento de Datos bajo la Ley 1581 de 2012 · Bogotá D.C., Colombia
              </p>
            </div>
            <div className="text-right text-[11px] font-mono text-[#bf953f] font-semibold print:text-black">
              https://vecy-network.vercel.app/privacidad
            </div>
          </footer>

        </article>
      </main>

      <Footer />
    </div>
  );
}
