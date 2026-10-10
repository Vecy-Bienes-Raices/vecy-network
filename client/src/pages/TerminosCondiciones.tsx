import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import NetworkBackground from '@/components/NetworkBackground';
import { ScrollReveal } from '@/components/ScrollReveal';
import { 
  Printer, 
  ArrowRight,
  ShieldCheck,
  FileText,
  Scale,
  QrCode,
  Lock,
  Download
} from 'lucide-react';
import { useLocation } from 'wouter';

export default function TerminosCondiciones() {
  const [, navigate] = useLocation();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />

      {/* CABECERO SUPERIOR WEB (ESTILO LIMPIO CON RAYITA 3D) */}
      <section className="relative pt-36 pb-12 bg-gradient-to-b from-black via-zinc-950 to-background overflow-hidden border-b border-white/5 no-print">
        <NetworkBackground />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[320px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="container relative z-10 text-center max-w-4xl mx-auto px-4">
          <ScrollReveal delay={0.1}>
            {/* Tag limpio sin burbujas */}
            <div className="vecy-accent-tag">
              MARCO JURÍDICO INSTITUCIONAL
            </div>

            {/* Título de la página con rayita 3D */}
            <h1 className="vecy-title-hero text-3xl sm:text-5xl font-black">
              TÉRMINOS Y <span className="text-gradient-gold">CONDICIONES</span>
            </h1>

            {/* Rayita tridimensional debajo del título */}
            <div className="line-electric w-32 sm:w-48 mx-auto my-3" />

            {/* Subtítulo limpio y fluido */}
            <p className="vecy-subtitle max-w-2xl mx-auto text-sm sm:text-base text-gray-300 mt-2">
              Régimen General de Uso del Ecosistema Tecnológico, Corretaje Inmobiliario, Aceleración en Red y Contratación Digital de <span className="text-white font-bold">VECY BIENES RAÍCES</span>.
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
                onClick={() => navigate('/politica-privacidad')}
                className="px-5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-gray-300 hover:text-white hover:border-primary/40 text-xs sm:text-sm font-medium flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Ver Política de Privacidad</span>
                <ArrowRight className="w-3.5 h-3.5 text-primary" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-[11px] font-mono text-gray-400">
              <span>Ley 527 de 1999</span>
              <span>•</span>
              <span>Decreto 2364 de 2012</span>
              <span>•</span>
              <span>Arts. 1340 - 1346 C.Co.</span>
              <span>•</span>
              <span className="text-primary font-semibold">Vigencia: Octubre 2026 (v32.69)</span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* DOCUMENTO FORMAL (CARD TIPO VIDRIO ESMERILADO CON ILUMINACIÓN TRASERA & CONVERSIÓN MONOCROMÁTICA EN IMPRESIÓN/PDF) */}
      <main className="container max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <article className="print-document-sheet relative w-full bg-zinc-900 border border-[#bf953f]/30 rounded-3xl shadow-[0_0_60px_rgba(191,149,63,0.12)] overflow-hidden flex flex-col font-sans transition-all">
          
          {/* CABECERO CON ACCENTO DORADO Y DEGRADÉ INSTITUCIONAL */}
          <header className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border-b border-[#bf953f]/20 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#bf953f]/10 border border-[#bf953f]/30 p-2 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(191,149,63,0.2)]">
                  <img 
                    src="/logo-vecy.png" 
                    alt="VECY BIENES RAÍCES" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                      VECY BIENES RAÍCES
                    </h2>
                    <span className="text-[10px] font-bold text-[#bf953f] bg-[#bf953f]/10 border border-[#bf953f]/20 px-2 py-0.5 rounded-full uppercase">
                      CONTRATO OFICIAL
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-[#bf953f] mt-0.5">
                    SISTEMA COLABORATIVO DE CORRETAJE INMOBILIARIO & CONTRATACIÓN DIGITAL
                  </p>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    Bogotá D.C., Colombia · Correo: contacto@vecy.co · PBX: +57 316 656 9719
                  </p>
                </div>
              </div>
              <div className="sm:text-right text-[11px] font-mono text-zinc-300 bg-black/40 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-white/5 sm:border-none">
                <div><strong>FOLIO:</strong> <span className="text-[#bf953f] font-bold">VECY-TYC-2026-COL</span></div>
                <div><strong>FECHA:</strong> Octubre de 2026</div>
                <div><strong>ESTADO:</strong> <span className="text-emerald-400 font-bold">Vigente Oficial</span></div>
              </div>
            </div>

            {/* Cuadro notarial y de validez digital (Estilo Sub-Card Vidrio Esmerilado) */}
            <div className="mt-6 pt-5 border-t border-white/5 grid sm:grid-cols-2 gap-3 text-xs bg-black/40 p-4 sm:p-5 rounded-2xl border border-white/5">
              <div>
                <span className="font-bold text-zinc-200 block">Instrumento Jurídico:</span>
                <span className="text-zinc-400">Contrato de Adhesión Mercantil y Términos Generales de Uso</span>
              </div>
              <div>
                <span className="font-bold text-zinc-200 block">Marco Legal Aplicable:</span>
                <span className="text-zinc-400">Ley 527 de 1999, Decreto 2364 de 2012 y Arts. 1340-1346 C.Co.</span>
              </div>
              <div>
                <span className="font-bold text-zinc-200 block">Código Único de Validación (CUV):</span>
                <span className="font-mono text-[#bf953f] font-bold">VECY-TERMS-2026-BOG-9978</span>
              </div>
              <div>
                <span className="font-bold text-zinc-200 block">Huella Digital (SHA-256):</span>
                <span className="font-mono text-[10px] text-zinc-400 break-all">a94f6e8b2c45d19087ea71f49633e21098bfcd45761a2938475960ab3e89c1df</span>
              </div>
            </div>
          </header>

          {/* CUERPO CONTINUO DEL DOCUMENTO */}
          <div className="p-6 sm:p-10 space-y-8 text-sm sm:text-[15px] text-zinc-300 leading-relaxed text-justify">
            
            {/* CLÁUSULA PRIMERA */}
            <section className="bg-zinc-950/80 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-3">
              <h3 className="clause-header text-base sm:text-lg font-bold text-white border-b border-white/10 pb-2 uppercase tracking-wide flex items-center gap-2">
                <span className="text-[#bf953f] font-black">Cláusula Primera.</span> — Preámbulo, Naturaleza Jurídica y Aceptación de los Términos
              </h3>
              <p>
                El presente instrumento reglamenta las relaciones jurídicas, comerciales y operativas entre <strong className="text-white">VECY BIENES RAÍCES</strong> y toda persona natural o jurídica (en adelante, el <strong className="text-white">"Usuario"</strong> o el <strong className="text-white">"Asesor Inmobiliario"</strong>) que acceda, navegue, registre inmuebles o requerimientos, utilice herramientas de Inteligencia Artificial (JanIA), genere fichas publicitarias de marca blanca, agende citas a través de Vecy Agenda o participe en la Bolsa Inmobiliaria Colaborativa.
              </p>
              <p>
                El ingreso, consulta y utilización de la plataforma implica el conocimiento pleno y la <strong className="text-white">aceptación expresa, incondicional e irrevocable</strong> de todas las cláusulas aquí consagradas, bajo el principio de la autonomía de la voluntad privada consagrado en el <strong className="text-white">Artículo 1602 del Código Civil Colombiano</strong>. Toda persona que no acepte estos términos deberá abstenerse de utilizar el ecosistema.
              </p>
            </section>

            {/* CLÁUSULA SEGUNDA */}
            <section className="space-y-4">
              <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
                <h3 className="clause-header text-base sm:text-lg font-bold text-white border-b border-white/10 pb-2 uppercase tracking-wide flex items-center gap-2">
                  <span className="text-[#bf953f] font-black">Cláusula Segunda.</span> — Modelos de Retribución, Comisiones, Bolsa Colaborativa y Período de Gracia Inmediata
                </h3>
                <p>
                  De conformidad con el <strong className="text-white">Artículo 1341 del Código de Comercio de Colombia</strong>, la remuneración del corretaje es de libre estipulación entre las partes. VECY BIENES RAÍCES consagra una arquitectura tarifaria transparente y sustancialmente más ventajosa para el asesor que las franquicias tradicionales, estructurada en los siguientes esquemas:
                </p>

                <div className="space-y-4 pt-2">
                  {/* MODELO 1: GRACIA (ESMERALDA) */}
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold text-sm uppercase tracking-wide">
                          1. Período de Gracia Inmediata (Días 1 a 5 Calendario)
                        </span>
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded">
                          $0 COP VECY
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-300">
                        Si el asesor cierra la negociación dentro de los primeros <strong className="text-white">cinco (5) días calendario</strong> contados a partir de la publicación inicial en la plataforma (por tratarse de clientes o gestiones preexistentes del propio asesor), <strong className="text-emerald-300">VECY BIENES RAÍCES no cobrará valor alguno ($0 COP)</strong>. El asesor retiene el 100% íntegro de su comisión, sin retenciones ni comisiones ocultas.
                      </p>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <p className="text-2xl font-black text-white">100%</p>
                      <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Asesor Total
                      </span>
                    </div>
                  </div>

                  {/* MODELO 2: CIERRE DIRECTO 80/20 (DORADO/ÁMBAR) */}
                  <div className="bg-[#bf953f]/10 border border-[#bf953f]/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[#bf953f] font-bold text-sm uppercase tracking-wide">
                          2. Cierre Directo con Tecnología VECY (Día 6 en adelante)
                        </span>
                        <span className="text-[10px] font-bold text-[#bf953f] bg-[#bf953f]/20 border border-[#bf953f]/30 px-2 py-0.5 rounded">
                          Modelo 80% / 20%
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-300">
                        Si el asesor capta y cierra directamente con un comprador o arrendatario tras haberse beneficiado de la infraestructura de VECY (tienda virtual personalizada, fichas de marca blanca, atención automatizada por JanIA, indexación y difusión en red):
                      </p>
                      <ul className="list-disc list-inside text-xs sm:text-sm text-zinc-300 space-y-1">
                        <li><strong className="text-white">80% Neto para el Asesor Captador:</strong> Conservando una retribución significativamente mayor al estándar tradicional del mercado.</li>
                        <li><strong className="text-white">10% para la Bolsa Colaborativa:</strong> Destinado a premiar a los colegas difusores que viralizaron el enlace de marca blanca.</li>
                        <li><strong className="text-white">10% para Soporte y Tecnología VECY:</strong> Destinado al mantenimiento de infraestructura, servidores, IA y asesoría documental.</li>
                      </ul>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <p className="text-2xl font-black text-white">80 / 20</p>
                      <span className="text-[10px] text-[#bf953f] font-semibold bg-[#bf953f]/10 px-2 py-0.5 rounded border border-[#bf953f]/20">
                        Cierre Directo
                      </span>
                    </div>
                  </div>

                  {/* MODELO 3: RED COLABORATIVA 40/20/40 (CIAN/AZUL ELÉCTRICO) */}
                  <div className="bg-[#22d3ee]/10 border border-[#22d3ee]/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[#22d3ee] font-bold text-sm uppercase tracking-wide">
                          3. Operación Compartida en Red Colaborativa
                        </span>
                        <span className="text-[10px] font-bold text-[#22d3ee] bg-[#22d3ee]/20 border border-[#22d3ee]/30 px-2 py-0.5 rounded">
                          Modelo Institucional 40% / 20% / 40%
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-300">
                        Cuando la compraventa o arrendamiento se perfecciona mediante la concurrencia de un asesor colocador que aporta y presenta formalmente al cliente a través de <strong className="text-white">Vecy Agenda</strong>:
                      </p>
                      <ul className="list-disc list-inside text-xs sm:text-sm text-zinc-300 space-y-1">
                        <li><strong className="text-white">40% para el Asesor Captador:</strong> Quien aportó la propiedad y gestiona la relación con el propietario.</li>
                        <li><strong className="text-white">20% para Aceleración y Soporte:</strong> Distribuido en 10% para la Bolsa de Agentes Difusores y 10% para VECY BIENES RAÍCES.</li>
                        <li><strong className="text-white">40% para el Asesor Colocador:</strong> Quien agendó formalmente al cliente interesado, coordinó la visita y acompañó el cierre.</li>
                      </ul>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <p className="text-2xl font-black text-white">40/20/40</p>
                      <span className="text-[10px] text-[#22d3ee] font-semibold bg-[#22d3ee]/10 px-2 py-0.5 rounded border border-[#22d3ee]/20">
                        Alianza Tripartita
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* CLÁUSULA TERCERA */}
            <section className="bg-zinc-950/80 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-3">
              <h3 className="clause-header text-base sm:text-lg font-bold text-white border-b border-white/10 pb-2 uppercase tracking-wide flex items-center gap-2">
                <span className="text-[#bf953f] font-black">Cláusula Tercera.</span> — Telemetría Forense Digital y Plena Prueba del Nexo Causal
              </h3>
              <p>
                Al amparo de los <strong className="text-white">Artículos 1340 y 1341 del Código de Comercio</strong>, el derecho a la remuneración del corretaje nace cuando el negocio se celebra como consecuencia directa o indirecta de la labor de mediación o de la infraestructura provista.
              </p>
              <p>
                Los enlaces parametrizados de marca blanca, los botones de contacto (WhatsApp, llamada telefónica y reserva de citas) y las consultas canalizadas por la Inteligencia Artificial JanIA incorporan <strong className="text-white">trazabilidad forense digital</strong> que registra: dirección IP de origen, estampa de tiempo legal UTC-5 (Bogotá), token del asesor difusor y código del inmueble.
              </p>
              <p>
                De conformidad con la <strong className="text-white">Ley 527 de 1999 (Ley de Comercio Electrónico de Colombia)</strong>, estos registros constituyen <strong className="text-white">Mensajes de Datos con plena fuerza probatoria</strong>, sirviendo como prueba incontrovertible de la causalidad entre la infraestructura facilitada por VECY BIENES RAÍCES y el perfeccionamiento del negocio mercantil.
              </p>
            </section>

            {/* CLÁUSULA CUARTA */}
            <section className="bg-zinc-950/80 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-3">
              <h3 className="clause-header text-base sm:text-lg font-bold text-white border-b border-white/10 pb-2 uppercase tracking-wide flex items-center gap-2">
                <span className="text-[#bf953f] font-black">Cláusula Cuarta.</span> — Obligación de No Elusión (Anti-Bypass), Vigencia Posterior y Cláusula Penal Ejecutiva
              </h3>
              <p>
                <strong className="text-white">Deber de Lealtad y No Elusión:</strong> Los usuarios y asesores se obligan a no eludir, puentear ni excluir a VECY BIENES RAÍCES ni a los asesores participantes de la red. Queda expresamente prohibido celebrar negocios directos o paralelos con clientes, propietarios o prospectos originados o contactados a través del ecosistema para evadir las comisiones acordadas.
              </p>
              <p>
                <strong className="text-white">Vigencia Posterior (12 Meses):</strong> La obligación de no elusión permanecerá vigente durante todo el término de publicación del inmueble o requerimiento y se extenderá por <strong className="text-white">doce (12) meses posteriores</strong> contados a partir de su desactivación formal, respecto de cualquier contacto registrado en la telemetría del sistema.
              </p>
              <p>
                <strong className="text-white">Cláusula Penal y Mérito Ejecutivo:</strong> El incumplimiento comprobado de la obligación de no elusión generará a favor de VECY BIENES RAÍCES y de los asesores perjudicados el cobro de una sanción penal contractual equivalente al <strong className="text-[#bf953f] font-bold">cien por ciento (100%) de la comisión total de la operación</strong>. Para su cobro, las constancias digitales, contratos emitidos y registros de auditoría prestarán <strong className="text-white">Mérito Ejecutivo</strong> de conformidad con el Código General del Proceso, sin necesidad de requerimiento previo en mora, al cual se renuncia expresamente.
              </p>
            </section>

            {/* CLÁUSULA QUINTA */}
            <section className="bg-zinc-950/80 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-3">
              <h3 className="clause-header text-base sm:text-lg font-bold text-white border-b border-white/10 pb-2 uppercase tracking-wide flex items-center gap-2">
                <span className="text-[#bf953f] font-black">Cláusula Quinta.</span> — Contratación Digital, Firma Electrónica y Sello Criptográfico
              </h3>
              <p>
                Los contratos de visita, mandatos de corretaje y acuerdos de comisión generados por <strong className="text-white">Vecy Agenda Pro</strong> cumplen cabalmente los requisitos consagrados en la <strong className="text-white">Ley 527 de 1999</strong> y el <strong className="text-white">Decreto 2364 de 2012</strong>:
              </p>
              <ul className="list-disc list-inside space-y-1 text-zinc-300 pl-2">
                <li><strong className="text-white">Código Único de Validación (CUV):</strong> Identificador alfanumérico secuencial que individualiza el documento.</li>
                <li><strong className="text-white">Huella Matemática SHA-256:</strong> Garantiza la inalterabilidad e integridad absoluta del contenido desde su generación.</li>
                <li><strong className="text-white">Código QR Dinámico:</strong> Permite a las partes y autoridades judiciales validar en tiempo real el estado y texto original en el servidor.</li>
                <li><strong className="text-white">Firma Electrónica Válida:</strong> La captura del trazo manuscrito en pantalla táctil o la autenticación por código OTP certifica la identidad de los firmantes.</li>
              </ul>
            </section>

            {/* CLÁUSULA SEXTA */}
            <section className="bg-zinc-950/80 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-3">
              <h3 className="clause-header text-base sm:text-lg font-bold text-white border-b border-white/10 pb-2 uppercase tracking-wide flex items-center gap-2">
                <span className="text-[#bf953f] font-black">Cláusula Sexta.</span> — Ética Profesional, Veracidad de la Oferta y Propiedad Intelectual
              </h3>
              <p>
                Todo asesor declara bajo la gravedad de juramento que cuenta con la debida autorización del propietario para comercializar los inmuebles que registre en la plataforma. Está terminantemente prohibido publicar inmuebles ficticios, duplicados no autorizados o información engañosa.
              </p>
              <p>
                El software, los algoritmos de cruce de datos de JanIA, los diseños gráficos y la marca <strong className="text-white">VECY BIENES RAÍCES</strong> son de propiedad exclusiva de sus creadores y están amparados por las leyes de propiedad industrial y derechos de autor de Colombia.
              </p>
            </section>

            {/* CLÁUSULA SÉPTIMA */}
            <section className="bg-zinc-950/80 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-3">
              <h3 className="clause-header text-base sm:text-lg font-bold text-white border-b border-white/10 pb-2 uppercase tracking-wide flex items-center gap-2">
                <span className="text-[#bf953f] font-black">Cláusula Séptima.</span> — Jurisdicción, Resolución de Conflictos y Domicilio Contractual
              </h3>
              <p>
                El presente acuerdo se rige e interpreta íntegramente de acuerdo con las leyes de la <strong className="text-white">República de Colombia</strong>. Cualquier diferencia, controversia o litigio que surja entre las partes derivado de la ejecución del presente contrato será sometido preferentemente a arreglo directo o conciliación prejudicial. En su defecto, las partes fijan como domicilio contractual a la ciudad de <strong className="text-white">Bogotá D.C., Colombia</strong>.
              </p>
            </section>

          </div>

          {/* PIE DE PÁGINA MEMBRETADO FORMAL (ESTILO TAX MODAL) */}
          <footer className="bg-black/50 border-t border-white/10 p-5 sm:p-6 text-xs text-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold text-zinc-200">
                VECY BIENES RAÍCES — Dirección Jurídica y Tecnológica
              </p>
              <p className="text-[11px] text-zinc-500">
                Documento Oficial Válido y Vinculante bajo la Ley 527 de 1999 · Bogotá D.C., Colombia
              </p>
            </div>
            <div className="text-right text-[11px] font-mono text-[#bf953f] font-semibold">
              https://vecy-network.vercel.app/terminos
            </div>
          </footer>

        </article>
      </main>

      <Footer />
    </div>
  );
}
