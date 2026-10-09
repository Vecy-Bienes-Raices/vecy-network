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

      {/* DOCUMENTO FORMAL MEMBRETADO (HOJA BLANCA CON LETRA NEGRA) */}
      <main className="container max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <article className="print-document-sheet bg-white text-zinc-900 shadow-2xl rounded-2xl border border-zinc-200 p-8 sm:p-14 md:p-16 max-w-4xl mx-auto font-sans leading-relaxed transition-all">
          
          {/* CABECERO MEMBRETADO OFICIAL */}
          <header className="border-b-2 border-zinc-900 pb-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <img 
                  src="/logo-vecy.png" 
                  alt="VECY BIENES RAÍCES" 
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                />
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 uppercase">
                    VECY BIENES RAÍCES
                  </h2>
                  <p className="text-xs sm:text-sm font-semibold text-zinc-700">
                    SISTEMA COLABORATIVO DE CORRETAJE INMOBILIARIO & CONTRATACIÓN DIGITAL
                  </p>
                  <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    Bogotá D.C., Colombia · Correo: contacto@vecy.co · PBX: +57 316 656 9719
                  </p>
                </div>
              </div>
              <div className="sm:text-right text-[11px] font-mono text-zinc-600 bg-zinc-50 sm:bg-transparent p-2.5 sm:p-0 rounded border border-zinc-200 sm:border-none">
                <div><strong>FOLIO:</strong> VECY-TYC-2026-COL</div>
                <div><strong>FECHA:</strong> Octubre de 2026</div>
                <div><strong>ESTADO:</strong> Vigente Oficial</div>
              </div>
            </div>

            {/* Cuadro notarial y de validez digital */}
            <div className="mt-6 pt-4 border-t border-zinc-200 grid sm:grid-cols-2 gap-3 text-xs bg-zinc-50 p-4 rounded-lg border border-zinc-200">
              <div>
                <span className="font-bold text-zinc-800 block">Instrumento Jurídico:</span>
                <span className="text-zinc-600">Contrato de Adhesión Mercantil y Términos Generales de Uso</span>
              </div>
              <div>
                <span className="font-bold text-zinc-800 block">Marco Legal Aplicable:</span>
                <span className="text-zinc-600">Ley 527 de 1999, Decreto 2364 de 2012 y Arts. 1340-1346 C.Co.</span>
              </div>
              <div>
                <span className="font-bold text-zinc-800 block">Código Único de Validación (CUV):</span>
                <span className="font-mono text-zinc-700">VECY-TERMS-2026-BOG-9978</span>
              </div>
              <div>
                <span className="font-bold text-zinc-800 block">Huella Digital (SHA-256):</span>
                <span className="font-mono text-[10px] text-zinc-600 break-all">a94f6e8b2c45d19087ea71f49633e21098bfcd45761a2938475960ab3e89c1df</span>
              </div>
            </div>
          </header>

          {/* CUERPO CONTINUO DEL DOCUMENTO */}
          <div className="space-y-8 text-sm sm:text-[15px] text-zinc-800 leading-relaxed text-justify">
            
            {/* CLÁUSULA PRIMERA */}
            <section className="space-y-3">
              <h3 className="clause-header text-base sm:text-lg font-bold text-zinc-950 border-b border-zinc-200 pb-1.5 uppercase tracking-wide">
                Cláusula Primera. — Preámbulo, Naturaleza Jurídica y Aceptación de los Términos
              </h3>
              <p>
                El presente instrumento reglamenta las relaciones jurídicas, comerciales y operativas entre <strong>VECY BIENES RAÍCES</strong> y toda persona natural o jurídica (en adelante, el <strong>"Usuario"</strong> o el <strong>"Asesor Inmobiliario"</strong>) que acceda, navegue, registre inmuebles o requerimientos, utilice herramientas de Inteligencia Artificial (JanIA), genere fichas publicitarias de marca blanca, agende citas a través de Vecy Agenda o participe en la Bolsa Inmobiliaria Colaborativa.
              </p>
              <p>
                El ingreso, consulta y utilización de la plataforma implica el conocimiento pleno y la <strong>aceptación expresa, incondicional e irrevocable</strong> de todas las cláusulas aquí consagradas, bajo el principio de la autonomía de la voluntad privada consagrado en el <strong>Artículo 1602 del Código Civil Colombiano</strong>. Toda persona que no acepte estos términos deberá abstenerse de utilizar el ecosistema.
              </p>
            </section>

            {/* CLÁUSULA SEGUNDA */}
            <section className="space-y-4">
              <h3 className="clause-header text-base sm:text-lg font-bold text-zinc-950 border-b border-zinc-200 pb-1.5 uppercase tracking-wide">
                Cláusula Segunda. — Modelos de Retribución, Comisiones, Bolsa Colaborativa y Período de Gracia Inmediata
              </h3>
              <p>
                De conformidad con el <strong>Artículo 1341 del Código de Comercio de Colombia</strong>, la remuneración del corretaje es de libre estipulación entre las partes. VECY BIENES RAÍCES consagra una arquitectura tarifaria transparente y sustancialmente más ventajosa para el asesor que las franquicias tradicionales, estructurada en los siguientes esquemas:
              </p>

              <div className="space-y-3 pl-2 sm:pl-4">
                <div className="border-l-4 border-emerald-600 pl-4 py-1">
                  <h4 className="font-bold text-zinc-950 text-sm">
                    1. Período de Gracia Inmediata (Días 1 a 5 Calendario) — 100% Asesor / $0 COP VECY:
                  </h4>
                  <p className="text-zinc-700 mt-1">
                    Si el asesor cierra la negociación dentro de los primeros <strong>cinco (5) días calendario</strong> contados a partir de la publicación inicial en la plataforma (por tratarse de clientes o gestiones preexistentes del propio asesor), <strong>VECY BIENES RAÍCES no cobrará valor alguno ($0 COP)</strong>. El asesor retiene el 100% íntegro de su comisión, sin retenciones ni comisiones ocultas.
                  </p>
                </div>

                <div className="border-l-4 border-amber-600 pl-4 py-1">
                  <h4 className="font-bold text-zinc-950 text-sm">
                    2. Cierre Directo con Tecnología VECY (Día 6 en adelante) — Modelo 80% / 20%:
                  </h4>
                  <p className="text-zinc-700 mt-1">
                    Si el asesor capta y cierra directamente con un comprador o arrendatario tras haberse beneficiado de la infraestructura de VECY (tienda virtual personalizada, fichas de marca blanca, atención automatizada por JanIA, indexación y difusión en red):
                  </p>
                  <ul className="list-disc list-inside mt-1.5 text-zinc-700 space-y-1">
                    <li><strong>80% Neto para el Asesor Captador:</strong> Conservando una retribución significativamente mayor al estándar tradicional del mercado.</li>
                    <li><strong>10% para la Bolsa Colaborativa:</strong> Destinado a premiar a los colegas difusores que viralizaron el enlace de marca blanca.</li>
                    <li><strong>10% para Soporte y Tecnología VECY:</strong> Destinado al mantenimiento de infraestructura, servidores, IA y asesoría documental.</li>
                  </ul>
                </div>

                <div className="border-l-4 border-blue-600 pl-4 py-1">
                  <h4 className="font-bold text-zinc-950 text-sm">
                    3. Operación Compartida en Red Colaborativa — Modelo 40% / 20% / 40%:
                  </h4>
                  <p className="text-zinc-700 mt-1">
                    Cuando la compraventa o arrendamiento se perfecciona mediante la concurrencia de un asesor colocador que aporta y presenta formalmente al cliente a través de <strong>Vecy Agenda</strong>:
                  </p>
                  <ul className="list-disc list-inside mt-1.5 text-zinc-700 space-y-1">
                    <li><strong>40% para el Asesor Captador:</strong> Quien aportó la propiedad y gestiona la relación con el propietario.</li>
                    <li><strong>20% para Aceleración y Soporte:</strong> Distribuido en 10% para la Bolsa de Agentes Difusores y 10% para VECY BIENES RAÍCES.</li>
                    <li><strong>40% para el Asesor Colocador:</strong> Quien agendó formalmente al cliente interesado, coordinó la visita y acompañó el cierre.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* CLÁUSULA TERCERA */}
            <section className="space-y-3">
              <h3 className="clause-header text-base sm:text-lg font-bold text-zinc-950 border-b border-zinc-200 pb-1.5 uppercase tracking-wide">
                Cláusula Tercera. — Telemetría Forense Digital y Plena Prueba del Nexo Causal
              </h3>
              <p>
                Al amparo de los <strong>Artículos 1340 y 1341 del Código de Comercio</strong>, el derecho a la remuneración del corretaje nace cuando el negocio se celebra como consecuencia directa o indirecta de la labor de mediación o de la infraestructura provista.
              </p>
              <p>
                Los enlaces parametrizados de marca blanca, los botones de contacto (WhatsApp, llamada telefónica y reserva de citas) y las consultas canalizadas por la Inteligencia Artificial JanIA incorporan <strong>trazabilidad forense digital</strong> que registra: dirección IP de origen, estampa de tiempo legal UTC-5 (Bogotá), token del asesor difusor y código del inmueble.
              </p>
              <p>
                De conformidad con la <strong>Ley 527 de 1999 (Ley de Comercio Electrónico de Colombia)</strong>, estos registros constituyen <strong>Mensajes de Datos con plena fuerza probatoria</strong>, sirviendo como prueba incontrovertible de la causalidad entre la infraestructura facilitada por VECY BIENES RAÍCES y el perfeccionamiento del negocio mercantil.
              </p>
            </section>

            {/* CLÁUSULA CUARTA */}
            <section className="space-y-3">
              <h3 className="clause-header text-base sm:text-lg font-bold text-zinc-950 border-b border-zinc-200 pb-1.5 uppercase tracking-wide">
                Cláusula Cuarta. — Obligación de No Elusión (Anti-Bypass), Vigencia Posterior y Cláusula Penal Ejecutiva
              </h3>
              <p>
                <strong>Deber de Lealtad y No Elusión:</strong> Los usuarios y asesores se obligan a no eludir, puentear ni excluir a VECY BIENES RAÍCES ni a los asesores participantes de la red. Queda expresamente prohibido celebrar negocios directos o paralelos con clientes, propietarios o prospectos originados o contactados a través del ecosistema para evadir las comisiones acordadas.
              </p>
              <p>
                <strong>Vigencia Posterior (12 Meses):</strong> La obligación de no elusión permanecerá vigente durante todo el término de publicación del inmueble o requerimiento y se extenderá por <strong>doce (12) meses posteriores</strong> contados a partir de su desactivación formal, respecto de cualquier contacto registrado en la telemetría del sistema.
              </p>
              <p>
                <strong>Cláusula Penal y Mérito Ejecutivo:</strong> El incumplimiento comprobado de la obligación de no elusión generará a favor de VECY BIENES RAÍCES y de los asesores perjudicados el cobro de una sanción penal contractual equivalente al <strong>cien por ciento (100%) de la comisión total de la operación</strong>. Para su cobro, las constancias digitales, contratos emitidos y registros de auditoría prestarán <strong>Mérito Ejecutivo</strong> de conformidad con el Código General del Proceso, sin necesidad de requerimiento previo en mora, al cual se renuncia expresamente.
              </p>
            </section>

            {/* CLÁUSULA QUINTA */}
            <section className="space-y-3">
              <h3 className="clause-header text-base sm:text-lg font-bold text-zinc-950 border-b border-zinc-200 pb-1.5 uppercase tracking-wide">
                Cláusula Quinta. — Contratación Digital, Firma Electrónica y Sello Criptográfico
              </h3>
              <p>
                Los contratos de visita, mandatos de corretaje y acuerdos de comisión generados por <strong>Vecy Agenda Pro</strong> cumplen cabalmente los requisitos consagrados en la <strong>Ley 527 de 1999</strong> y el <strong>Decreto 2364 de 2012</strong>:
              </p>
              <ul className="list-disc list-inside space-y-1 text-zinc-700 pl-2">
                <li><strong>Código Único de Validación (CUV):</strong> Identificador alfanumérico secuencial que individualiza el documento.</li>
                <li><strong>Huella Matemática SHA-256:</strong> Garantiza la inalterabilidad e integridad absoluta del contenido desde su generación.</li>
                <li><strong>Código QR Dinámico:</strong> Permite a las partes y autoridades judiciales validar en tiempo real el estado y texto original en el servidor.</li>
                <li><strong>Firma Electrónica Válida:</strong> La captura del trazo manuscrito en pantalla táctil o la autenticación por código OTP certifica la identidad de los firmantes.</li>
              </ul>
            </section>

            {/* CLÁUSULA SEXTA */}
            <section className="space-y-3">
              <h3 className="clause-header text-base sm:text-lg font-bold text-zinc-950 border-b border-zinc-200 pb-1.5 uppercase tracking-wide">
                Cláusula Sexta. — Ética Profesional, Veracidad de la Oferta y Propiedad Intelectual
              </h3>
              <p>
                Todo asesor declara bajo la gravedad de juramento que cuenta con la debida autorización del propietario para comercializar los inmuebles que registre en la plataforma. Está terminantemente prohibido publicar inmuebles ficticios, duplicados no autorizados o información engañosa.
              </p>
              <p>
                El software, los algoritmos de cruce de datos de JanIA, los diseños gráficos y la marca <strong>VECY BIENES RAÍCES</strong> son de propiedad exclusiva de sus creadores y están amparados por las leyes de propiedad industrial y derechos de autor de Colombia.
              </p>
            </section>

            {/* CLÁUSULA SÉPTIMA */}
            <section className="space-y-3">
              <h3 className="clause-header text-base sm:text-lg font-bold text-zinc-950 border-b border-zinc-200 pb-1.5 uppercase tracking-wide">
                Cláusula Séptima. — Jurisdicción, Resolución de Conflictos y Domicilio Contractual
              </h3>
              <p>
                El presente acuerdo se rige e interpreta íntegramente de acuerdo con las leyes de la <strong>República de Colombia</strong>. Cualquier diferencia, controversia o litigio que surja entre las partes derivado de la ejecución del presente contrato será sometido preferentemente a arreglo directo o conciliación prejudicial. En su defecto, las partes fijan como domicilio contractual a la ciudad de <strong>Bogotá D.C., Colombia</strong>.
              </p>
            </section>

          </div>

          {/* PIE DE PÁGINA MEMBRETADO FORMAL */}
          <footer className="mt-12 pt-6 border-t-2 border-zinc-900 text-xs text-zinc-600 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold text-zinc-900">
                VECY BIENES RAÍCES — Dirección Jurídica y Tecnológica
              </p>
              <p className="text-[11px] text-zinc-500">
                Documento Oficial Válido y Vinculante bajo la Ley 527 de 1999 · Bogotá D.C., Colombia
              </p>
            </div>
            <div className="text-right text-[11px] font-mono text-zinc-500">
              https://vecy-network.vercel.app/terminos
            </div>
          </footer>

        </article>
      </main>

      <Footer />
    </div>
  );
}
