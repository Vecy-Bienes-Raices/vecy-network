import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import NetworkBackground from '@/components/NetworkBackground';
import { 
  Building2, 
  Coins, 
  Scale, 
  BrainCircuit, 
  Laptop, 
  FileCheck2, 
  ArrowRight, 
  Star, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  MessageSquare,
  Bot,
  FileText,
  BadgeCheck,
  Calculator,
  Landmark,
  Zap,
  Cpu,
  Search,
  BellRing,
  GitCompare,
  TrendingUp,
  Layers
} from 'lucide-react';
import { ScrollReveal } from '@/components/ScrollReveal';
import { useLocation } from 'wouter';

interface FreeJanIAService {
  id: string;
  badge: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  ctaText: string;
  waMessage: string;
}

interface CommercialService {
  id: string;
  badge: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  ctaText: string;
  waMessage: string;
}

// 🤖 BÓVEDA DE TRÁMITES Y CERTIFICADOS GRATUITOS 24/7 CON JANIA BOT (SOCKET BAILEYS: +573192919978)
const freeJanIAServices: FreeJanIAService[] = [
  {
    id: "seguridad-visitas",
    badge: "100% GRATUITO • CERO RIESGOS",
    title: "Filtro de Seguridad para Visitas a Inmuebles",
    description: "Protege tu tranquilidad y la de tu familia. Antes de mostrar una propiedad o asistir a una cita, JanIA valida de manera fácil y confidencial los documentos de los visitantes por WhatsApp para que sepas con certeza a quién le abres la puerta.",
    icon: <BadgeCheck className="w-9 h-9 text-emerald-400" />,
    features: [
      "Filtro de seguridad antes de mostrar cualquier inmueble",
      "Validación de documentos de visitantes y compradores",
      "Protección para propietarios, familias y asesores",
      "Respuesta en segundos directamente por WhatsApp"
    ],
    ctaText: "Pedir Filtro de Seguridad por WhatsApp",
    waMessage: "Hola JanIA, quiero validar la identidad de un visitante para mostrar una propiedad de manera segura."
  },
  {
    id: "predial-pdf",
    badge: "100% GRATUITO • EN 1 MINUTO",
    title: "Factura Predial y Certificado de Pago en PDF por WhatsApp",
    description: "Te enviamos la factura del impuesto predial lista para pagar en bancos y su paz y salvo o certificado de pago al día en archivo PDF directo a tu WhatsApp. Sin filas ni páginas lentas, solo envíanos el código de tu inmueble.",
    icon: <FileText className="w-9 h-9 text-emerald-400" />,
    features: [
      "Factura lista con código de barras para pagar en bancos",
      "Certificado oficial de pago y paz y salvo en PDF",
      "Válido para trámites de compraventa y bancos",
      "Entrega inmediata a tu chat de WhatsApp"
    ],
    ctaText: "Pedir Predial por WhatsApp",
    waMessage: "Hola JanIA, por favor sácame la factura y certificado de pago del impuesto predial en PDF."
  },
  {
    id: "idu-valorizacion",
    badge: "100% GRATUITO • PARA ESCRITURAS",
    title: "Paz y Salvo del IDU en PDF para Notaría",
    description: "El documento oficial que te exigen obligatoriamente en la notaría para firmar escrituras y vender tu inmueble en Bogotá. Te lo entregamos en PDF oficial por WhatsApp al instante, gratis y sin intermediarios.",
    icon: <Landmark className="w-9 h-9 text-emerald-400" />,
    features: [
      "Documento oficial en PDF con número de radicado",
      "Exigido en notaría para firmar escrituras de venta",
      "Verificación rápida de estado de cuenta",
      "Entrega 100% gratuita y sin filas"
    ],
    ctaText: "Pedir Paz y Salvo IDU por WhatsApp",
    waMessage: "Hola JanIA, por favor sácame el paz y salvo de valorización del IDU para escriturar."
  },
  {
    id: "simulador-notarial",
    badge: "100% GRATUITO • FÁCIL Y AL GRANO",
    title: "Cálculo Rápido de Gastos de Notaría y Escrituras",
    description: "¿Quieres saber cuánto dinero necesitas para escriturar? Te calculamos en segundos los gastos exactos de notaría, impuestos y registro, explicándote en español claro y sin enredos cuánto le corresponde pagar al comprador y cuánto al vendedor.",
    icon: <Calculator className="w-9 h-9 text-emerald-400" />,
    features: [
      "Cálculo exacto de derechos notariales e impuestos",
      "Cuentas claras: cuánto paga el comprador y cuánto el vendedor",
      "Evita sorpresas y cobros inesperados el día de la firma",
      "Respuestas sencillas y comprensibles en segundos"
    ],
    ctaText: "Calcular Gastos de Notaría",
    waMessage: "Hola JanIA, ayúdame a calcular cuánto se paga de notaría y registro para comprar o vender un inmueble."
  }
];

// 💎 PORTAFOLIO DE SERVICIOS ESTRATÉGICOS & BRÓKER (ATENCIÓN HUMANA: +573166569719)
const commercialServices: CommercialService[] = [
  {
    id: "inmuebles-autor",
    badge: "CORRETAJE DE ALTA GAMA",
    title: "Red Colaborativa & Inmuebles de Autor",
    description: "Comercialización de propiedades exclusivas mediante nuestra red de más de 300 asesores y el modelo institucional 40/20/40. Difusión sin letreros invasivos y fichas de Marca Blanca que aceleran las ventas hasta 3 veces más rápido.",
    icon: <Building2 className="w-10 h-10 text-primary" />,
    features: [
      "Comercialización discreta de inmuebles prémium",
      "Modelo colaborativo institucional 40 / 20 / 40",
      "Fichas de Marca Blanca para colegas aliados",
      "Cierre asistido y acompañamiento de punta a punta"
    ],
    ctaText: "Consignar o Buscar Inmueble",
    waMessage: "¡Hola Eduardo y Jani! Me interesa conocer más sobre la comercialización de inmuebles y la red colaborativa 40/20/40 de Vecy Bienes Raíces."
  },
  {
    id: "garantia-hipotecaria",
    badge: "LIQUIDEZ PATRIMONIAL",
    title: "Préstamos con Garantía Hipotecaria (Libre Inversión)",
    description: "Gestionamos soluciones de liquidez y créditos de libre inversión respaldados sobre activos inmobiliarios propios (residenciales y comerciales) a través de particulares y fondos privados. Ideal para capital de trabajo, proyectos o consolidación de pasivos.",
    icon: <Coins className="w-10 h-10 text-primary" />,
    features: [
      "Créditos de libre inversión con respaldo inmobiliario",
      "Financiación a través de particulares y fondos privados",
      "Evaluación técnica y ágil de la garantía real",
      "Asesoría sin las trabas de la banca tradicional"
    ],
    ctaText: "Consultar Opciones de Liquidez",
    waMessage: "¡Hola Vecy Bienes Raíces! Quisiera información y asesoría sobre préstamos de libre inversión con garantía hipotecaria sobre inmuebles propios."
  },
  {
    id: "blindaje-juridico",
    badge: "DEFENSA Y RECUPERACIÓN",
    title: "Blindaje Jurídico & Recuperación de Comisiones",
    description: "Especialistas en derecho inmobiliario operativo. Redactamos promesas y contratos blindados, gestionamos cobros pre-jurídicos para recuperación efectiva de comisiones impagas e incumplimientos, y asesoramos en saneamiento de historial crediticio (Hábeas Data).",
    icon: <Scale className="w-10 h-10 text-primary" />,
    features: [
      "Redacción profesional de promesas y contratos de arriendo",
      "Cobro pre-jurídico y recuperación de comisiones impagas",
      "Gestión de incumplimientos contractuales y mediación",
      "Asesoría de Hábeas Data y saneamiento crediticio"
    ],
    ctaText: "Agendar Asesoría Legal",
    waMessage: "¡Hola equipo Vecy! Necesito asesoría jurídica inmobiliaria (redacción de contratos / recuperación de comisiones / resolución de conflicto)."
  },
  {
    id: "avaluos-ia",
    badge: "BIG DATA & VALUACIÓN",
    title: "Avalúos Comerciales & Estudios de Mercado con IA",
    description: "Desarrollado con nuestra inteligencia JanIA. Analizamos miles de puntos de datos de mercado en Bogotá y las principales ciudades de Colombia para fijar el precio técnico exacto de venta o canon de arriendo, eliminando meses de incertidumbre comercial.",
    icon: <BrainCircuit className="w-10 h-10 text-primary" />,
    features: [
      "Estimación algorítmica de precio de venta y canon de arriendo",
      "Análisis comparativo de mercado y plusvalía sectorial",
      "Reportes ejecutivos de viabilidad y rentabilidad",
      "Soporte documental técnico para negociaciones justas"
    ],
    ctaText: "Solicitar Avalúo con IA",
    waMessage: "¡Hola JanIA y equipo Vecy! Quisiera solicitar un estudio de mercado y avalúo técnico con IA para un inmueble en Bogotá/Colombia."
  },
  {
    id: "proptech-soluciones",
    badge: "TECNOLOGÍA COMO SERVICIO",
    title: "Soluciones PropTech & Desarrollo Web para Agentes",
    description: "Empoderamos a agentes inmobiliarios e inmobiliarias independientes con infraestructura digital de vanguardia: páginas web personalizadas, tiendas inmobiliarias, formularios inteligentes de reserva con verificación documental (como Vecy Agenda) y ciberseguridad.",
    icon: <Laptop className="w-10 h-10 text-primary" />,
    features: [
      "Desarrollo de páginas web y tiendas inmobiliarias modernas",
      "Implementación de Vecy Agenda con verificación de identidad",
      "Bots conversacionales y automatización inmobiliaria con IA",
      "Ciberseguridad y protección de datos para agentes"
    ],
    ctaText: "Cotizar Solución Digital",
    waMessage: "¡Hola Eduardo! Me interesa desarrollar mi sitio web / tienda inmobiliaria o implementar Vecy Agenda y tecnología para mi marca inmobiliaria."
  },
  {
    id: "tramites-notariales",
    badge: "SANEAMIENTO Y TRÁMITES",
    title: "Saneamiento Notarial & Conciliación Inmobiliaria",
    description: "Acompañamiento y radicación en Notarías y Oficinas de Registro (ORIP). Gestionamos desenglobes, sucesiones, levantamiento de patrimonio de familia, afectación a vivienda familiar, estudios de tradición de 20 años y radicación oportuna de escrituras.",
    icon: <FileCheck2 className="w-10 h-10 text-primary" />,
    features: [
      "Estudio de títulos con trazabilidad de 20 años",
      "Cancelación de afectación familiar y patrimonio de familia",
      "Gestión de desenglobes, hipotecas y sucesiones notariales",
      "Radicación y seguimiento en Registro de Instrumentos Públicos"
    ],
    ctaText: "Consultar Trámite Notarial",
    waMessage: "¡Hola Vecy! Requiero apoyo y gestión en un trámite notarial / estudio de títulos / registro de instrumentos públicos."
  }
];

export default function Services() {
  const [, navigate] = useLocation();

  // Contacto con JanIA Bot en WhatsApp (+573192919978)
  const handleJanIAContact = (customMessage: string) => {
    const encoded = encodeURIComponent(customMessage);
    window.open(`https://wa.me/573192919978?text=${encoded}`, '_blank');
  };

  // Contacto Comercial con Bróker Humano (+573166569719)
  const handleBrokerContact = (customMessage: string) => {
    const encoded = encodeURIComponent(customMessage);
    window.open(`https://wa.me/573166569719?text=${encoded}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-36 pb-20 bg-gradient-to-b from-black via-zinc-950 to-background overflow-hidden border-b border-white/5">
        <NetworkBackground />
        {/* Glow de fondo áurico */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[320px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="container relative z-10 text-center max-w-4xl mx-auto px-4">
          <ScrollReveal delay={0.1}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-accent text-xs font-bold tracking-widest uppercase mb-4 shadow-[0_0_20px_rgba(191,149,63,0.15)]">
              <Sparkles size={14} className="text-primary animate-pulse" />
              PRIMER PORTAL CON INTELIGENCIA ARTIFICIAL EN COLOMBIA
            </div>

            <h1 className="vecy-title-hero uppercase tracking-tight text-3xl sm:text-5xl font-extrabold text-white">
              EL CORAZÓN PROPTECH: <span className="text-gradient-gold">MATCH INMOBILIARIO CON IA</span>
            </h1>

            <div className="line-electric w-36 sm:w-48 mx-auto my-6"></div>

            <p className="vecy-subtitle max-w-3xl mx-auto text-sm sm:text-base text-zinc-300 leading-relaxed font-medium">
              Erradicamos los clasificados pasivos donde los inmuebles tardan 9 meses en venderse. Vecy es el primer portal en Colombia con un cerebro cognitivo activo (JanIA) que cruza Ofertas con Demandas en milisegundos, cerrando negocios en tiempo récord.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* 🧠 SECCIÓN PROTAGONISTA: EL MOTOR DE MATCH CRUZADO CON IA (EL SANTO GRIAL DE VECY) */}
      <section className="py-20 bg-gradient-to-b from-black via-[#0d111a] to-background border-b border-primary/30 relative overflow-hidden">
        {/* Luces neurales de fondo */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="container max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <ScrollReveal delay={0.1}>
            <div className="vecy-card-apple p-8 sm:p-14 border-primary/40 bg-gradient-to-br from-[#121622]/95 via-[#0e121b]/95 to-black/95 shadow-[0_0_80px_rgba(191,149,63,0.2)] relative">
              
              <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
                {/* Texto Explicativo del Santo Grial */}
                <div className="lg:w-7/12">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-accent text-[11px] font-extrabold tracking-widest uppercase mb-4 shadow-[0_0_20px_rgba(191,149,63,0.2)]">
                    <Cpu size={14} className="text-primary animate-pulse" />
                    TECNOLOGÍA PROPIETARIA ÚNICA EN LATINOAMÉRICA
                  </div>

                  <h2 className="text-2xl sm:text-4xl font-extrabold text-white uppercase tracking-tight mb-5 leading-tight">
                    ¿POR QUÉ SOMOS EL PRIMER PORTAL QUE <span className="text-gradient-gold">USA IA EN REALIDAD</span>?
                  </h2>

                  <p className="text-zinc-300 text-sm sm:text-base leading-relaxed mb-6 font-normal">
                    Los portales inmobiliarios tradicionales (Metrocuadrado, FincaRaíz, Ciencuadras) son <strong>directorios pasivos</strong>: tú publicas un aviso y te sientas a rezar para que alguien filtre entre 50.000 fotos. En <strong>VECY BIENES RAÍCES</strong>, el portal trabaja activamente para ti las 24 horas del día.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4 mb-8">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-2.5 text-primary font-bold text-sm mb-1.5 uppercase tracking-wider">
                        <GitCompare size={17} />
                        <span>Cruce Oferta ↔ Demanda</span>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        El único portal donde los clientes publican lo que <strong>buscan</strong>. JanIA coteja 11 atributos prediales y conecta oferta con demanda en milisegundos.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm mb-1.5 uppercase tracking-wider">
                        <ShieldCheck size={17} />
                        <span>Umbral Riguroso (85%-100%)</span>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Cero falsos positivos. Filtros duros inquebrantables de tipología, ubicación, presupuesto y especificaciones para garantizar negocios viables.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-2.5 text-accent font-bold text-sm mb-1.5 uppercase tracking-wider">
                        <BellRing size={17} />
                        <span>Alertas y Match Proactivo</span>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Al producirse una coincidencia, el sistema notifica de inmediato al Captador y Colocador para coordinar visita y cerrar en días.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm mb-1.5 uppercase tracking-wider">
                        <Layers size={17} />
                        <span>Modelo Justo 40 / 20 / 40</span>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Alianzas transparentes entre colegas para vender y arrendar con fichas de Marca Blanca y bolsa colaborativa para agentes.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <button 
                      onClick={() => navigate('/ofertas')}
                      className="btn-gold px-7 py-3.5 text-xs font-extrabold tracking-widest uppercase shadow-[0_0_30px_rgba(191,149,63,0.3)] w-full sm:w-auto"
                    >
                      EXPLORAR OFERTAS ACTIVAS
                    </button>
                    <button 
                      onClick={() => navigate('/demandas')}
                      className="btn-gold-subtle px-7 py-3.5 text-xs font-extrabold tracking-widest uppercase w-full sm:w-auto"
                    >
                      MERCADO DE DEMANDAS
                    </button>
                    <button 
                      onClick={() => handleJanIAContact("JanIA, explícame cómo funciona el algoritmo de MATCH inmobiliario y cómo encuentro compradores para mis inmuebles.")}
                      className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-black transition-all text-xs font-extrabold uppercase flex items-center justify-center gap-2"
                    >
                      <Bot size={15} />
                      PROBAR MATCH CON JANIA
                    </button>
                  </div>
                </div>

                {/* Diagrama Visual Interactivo del Cerebro de JanIA */}
                <div className="lg:w-5/12 w-full">
                  <div className="p-6 sm:p-8 rounded-2xl bg-black/60 border border-primary/30 backdrop-blur-md shadow-2xl relative">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                          <Cpu size={20} />
                        </div>
                        <div>
                          <h4 className="text-white font-bold text-sm uppercase">JanIA Match Engine v32</h4>
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                            Algoritmo Activo 24/7
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/30">
                        100 PTS
                      </span>
                    </div>

                    <div className="space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-zinc-300 font-sans">🏠 Oferta: Inmueble de Autor</span>
                        <span className="text-accent font-semibold">Captador 40%</span>
                      </div>
                      
                      <div className="text-center py-1">
                        <span className="text-[10px] font-sans px-3 py-1 rounded-full bg-primary/20 text-accent border border-primary/30">
                          ⚡ Cruce Multidimensional 85% - 100% ⚡
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-zinc-300 font-sans">📝 Demanda: Requerimiento de Cliente</span>
                        <span className="text-emerald-400 font-semibold">Colocador 40%</span>
                      </div>

                      <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 font-sans text-xs flex items-center gap-2 mt-4">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                        <span><strong>¡MATCH PERFECTO DETECTADO!</strong> Notificación inmediata por WhatsApp y cita agendada en Vecy Agenda.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 🚀 SECCIÓN DESTACADA: TRÁMITES Y CERTIFICADOS GRATUITOS 24/7 CON JANIA */}
      <section className="py-20 bg-gradient-to-b from-[#0e121a] to-background border-b border-primary/20 relative">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal delay={0.1}>
            <div className="text-center max-w-3xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-extrabold tracking-widest uppercase mb-3 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
                <Bot size={14} className="text-emerald-400" />
                JANIA EXPRESS • 100% GRATUITO • TIEMPO RÉCORD EN WHATSAPP
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white uppercase tracking-tight">
                TRÁMITES Y CERTIFICADOS <span className="text-gradient-gold">SIN COSTO 24/7</span>
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm mt-3 font-medium">
                Nuestra Inteligencia Artificial JanIA resuelve en segundos los trámites y certificaciones que antes tomaban días de filas y costos innecesarios. Directo a tu WhatsApp.
              </p>
            </div>
          </ScrollReveal>

          {/* Grid de Servicios Gratuitos de JanIA */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {freeJanIAServices.map((item, idx) => (
              <ScrollReveal key={item.id} delay={idx * 0.08} direction="up" className="h-full">
                <div className="vecy-card-apple p-6 flex flex-col justify-between h-full group hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all duration-500 relative bg-[#10141d]/90 border-emerald-500/20">
                  
                  <div>
                    {/* Header con Icono y Badge */}
                    <div className="flex items-center justify-between gap-3 mb-5">
                      <div className="w-14 h-14 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.15)] group-hover:scale-105 transition-transform">
                        {item.icon}
                      </div>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white mb-2.5 uppercase tracking-wide group-hover:text-emerald-400 transition-colors">
                      {item.title}
                    </h3>

                    <p className="text-zinc-300 text-xs mb-5 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="space-y-2 mb-6 border-t border-white/5 pt-4">
                      {item.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2 text-[11px] text-zinc-300 font-medium">
                          <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-emerald-500/15">
                    <button 
                      onClick={() => handleJanIAContact(item.waMessage)}
                      className="w-full py-3 px-3 rounded-xl flex items-center justify-center gap-2 text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-black transition-all duration-300 shadow-sm"
                    >
                      <Bot size={14} />
                      <span>{item.ctaText}</span>
                    </button>
                  </div>

                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* 💼 SERVICIOS ESTRATÉGICOS Y DE NEGOCIO (ASESORÍA INTEGRAL & PROPTECH) */}
      <section className="py-24 bg-background">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal delay={0.1}>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="vecy-accent-tag text-center">SOLUCIONES INTEGRALES</span>
              <h2 className="vecy-title-section uppercase tracking-tight text-2xl sm:text-4xl font-extrabold text-white mt-2">
                SERVICIOS <span className="text-gradient-gold">ESTRATÉGICOS Y DE AUTOR</span>
              </h2>
              <div className="line-electric w-28 mx-auto my-4"></div>
              <p className="text-zinc-400 text-xs sm:text-sm font-medium">
                Acompañamiento especializado por parte de Eduardo Rivera y Jani Alves para inversionistas, propietarios, agencias y agentes inmobiliarios.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {commercialServices.map((service, idx) => (
              <ScrollReveal key={service.id} delay={idx * 0.08} direction="up" className="h-full">
                <div className="vecy-card-apple p-7 sm:p-8 flex flex-col justify-between h-full group hover:glow-gold transition-all duration-500 border-primary/25 relative">
                  
                  {/* Contenido Superior */}
                  <div>
                    {/* Badge & Icono */}
                    <div className="flex items-center justify-between gap-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-[#1a202c]/90 border border-primary/30 flex items-center justify-center shadow-[0_0_25px_rgba(191,149,63,0.15)] group-hover:scale-105 transition-transform duration-300">
                        {service.icon}
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-accent">
                        {service.badge}
                      </span>
                    </div>

                    {/* Título */}
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 uppercase tracking-wide group-hover:text-accent transition-colors leading-snug">
                      {service.title}
                    </h3>

                    {/* Descripción */}
                    <p className="text-zinc-300 text-xs sm:text-sm mb-6 leading-relaxed font-normal">
                      {service.description}
                    </p>

                    {/* Lista de Características */}
                    <div className="space-y-2.5 mb-8 border-t border-white/5 pt-5">
                      {service.features.map((feature, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2.5 text-xs text-zinc-300 font-medium">
                          <CheckCircle2 size={15} className="text-primary mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Botón de Acción a WhatsApp Bróker */}
                  <div className="pt-4 border-t border-primary/15">
                    <button 
                      onClick={() => handleBrokerContact(service.waMessage)}
                      className="btn-gold-subtle w-full py-3.5 px-4 rounded-xl flex items-center justify-center gap-2.5 text-xs font-bold uppercase tracking-wider group-hover:btn-gold transition-all duration-300 shadow-md"
                    >
                      <MessageSquare size={15} />
                      <span>{service.ctaText}</span>
                    </button>
                  </div>

                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section Principal */}
      <section className="py-24 bg-gradient-to-t from-black to-background border-t border-white/5">
        <div className="container max-w-5xl mx-auto px-4">
          <ScrollReveal>
            <div className="vecy-card-apple p-10 sm:p-16 text-center border-primary/30 max-w-4xl mx-auto overflow-hidden relative shadow-[0_0_60px_rgba(191,149,63,0.15)]">
               
               <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-6 text-primary shadow-[0_0_30px_rgba(191,149,63,0.3)]">
                 <ShieldCheck className="w-8 h-8" />
               </div>

               <h2 className="vecy-title-section uppercase text-2xl sm:text-4xl font-extrabold text-white mb-4">
                 ¿TIENES UN CASO O <span className="text-gradient-gold">REQUERIMIENTO ESPECIAL</span>?
               </h2>
               
               <p className="vecy-subtitle mb-8 max-w-2xl mx-auto text-sm sm:text-base text-zinc-300 font-medium">
                 Ya sea que quieras conectar tu inmueble con nuestro motor de MATCH con IA, conseguir liquidez hipotecaria, recuperar comisiones impagas o crear tu propia tienda inmobiliaria, nuestro equipo directivo te atiende directamente.
               </p>

               <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                 <button 
                   onClick={() => handleBrokerContact("¡Hola Eduardo y Jani! Me gustaría agendar una asesoría privada con la dirección de Vecy Bienes Raíces.")} 
                   className="btn-gold px-8 py-4 text-xs sm:text-sm font-bold tracking-widest uppercase shadow-[0_0_35px_rgba(191,149,63,0.35)] w-full sm:w-auto"
                 >
                   HABLAR CON NUESTRO BRÓKER
                 </button>
                 <button 
                   onClick={() => navigate('/contact')} 
                   className="btn-gold-subtle px-8 py-4 text-xs sm:text-sm font-bold tracking-widest uppercase w-full sm:w-auto"
                 >
                   FORMULARIO DE CONTACTO
                 </button>
               </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
