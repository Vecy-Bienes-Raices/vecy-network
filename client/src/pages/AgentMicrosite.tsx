import React, { useState, useMemo } from 'react';
import { useRoute, Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import AgentProToolsWidget from '@/components/AgentProToolsWidget';
import {
  Building2, MapPin, Bed, Bath, Car, Ruler, Phone, Mail,
  CalendarCheck, Download, EyeOff, Palette, Search, Sparkles,
  ShieldCheck, ExternalLink, Loader2, Share2
} from 'lucide-react';
import ShareModal from '@/components/ShareModal';

export default function AgentMicrosite() {
  const [, paramsS] = useRoute('/s/:slug');
  const [, paramsAgencia] = useRoute('/agencia/:slug');
  const slug = paramsS?.slug || paramsAgencia?.slug || '';

  const [searchTerm, setSearchTerm] = useState('');
  const [txFilter, setTxFilter] = useState<string>('all');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareConfig, setShareConfig] = useState({ url: '', text: '', title: '' });

  const { data, isLoading, error } = trpc.agent.getStoreBySubdomain.useQuery(
    { slug },
    { enabled: !!slug }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
        <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Cargando Portal Inmobiliario...</p>
      </div>
    );
  }

  if (error || !data?.agent) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-6 text-center">
        <Building2 className="w-16 h-16 text-zinc-700 mb-4" />
        <h1 className="text-2xl font-black mb-2">Sitio Web de Agente No Encontrado</h1>
        <p className="text-zinc-400 text-sm mb-6 max-w-md">
          El subdominio o enlace solicitado aún no ha sido activado. Puedes crear tu propio sitio gratis desde tu Dashboard en Vecy Bienes Raíces.
        </p>
        <Link href="/agent-dashboard">
          <a className="px-6 py-3 bg-amber-500 text-black font-black rounded-xl text-xs uppercase tracking-widest">
            Crear Mi Sitio en Vecy
          </a>
        </Link>
      </div>
    );
  }

  const { agent, properties } = data;
  const theme = (agent.themeConfig as any) || {};
  const tools = (agent.activeTools as any) || {};
  const primaryColor = theme.primaryColor || '#0f4c81';
  const secondaryColor = theme.secondaryColor || '#0f172a';
  const agencyName = theme.agencyName || agent.name || 'Inmobiliaria Asociada';
  const slogan = theme.slogan || 'Portafolio Inmobiliario Certificado • Red Colaborativa Vecy';
  const contactPhone = theme.contactPhone || agent.phone || '+57 316 6569719';
  const contactEmail = theme.contactEmail || agent.email || '';

  const filteredProperties = useMemo(() => {
    return (properties || []).filter((p: any) => {
      const matchesTx = txFilter === 'all' || (p.transactionType || '').toLowerCase().includes(txFilter);
      const q = searchTerm.toLowerCase().trim();
      const matchesQuery =
        !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.zone || '').toLowerCase().includes(q) ||
        (p.addressNeighborhood || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q);
      return matchesTx && matchesQuery;
    });
  }, [properties, txFilter, searchTerm]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-['Outfit',sans-serif]">
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* CABECERA PERSONALIZADA DEL SUSCRIPTOR                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl"
        style={{ backgroundColor: `${secondaryColor}f2` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {agent.customLogoUrl ? (
              <img
                src={agent.customLogoUrl}
                alt={agencyName}
                className="h-12 max-w-[160px] object-contain rounded-lg bg-white/5 p-1"
              />
            ) : (
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                {agencyName.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white leading-none">
                {agencyName}
              </h1>
              <p className="text-[11px] text-zinc-300 mt-1 hidden sm:block">{slogan}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href={`/agenda?agentId=${agent.id}`}
              className="px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
              style={{ backgroundColor: primaryColor }}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Agenda Pro</span>
            </a>

            {contactPhone && (
              <a
                href={`https://wa.me/${contactPhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden md:inline">WhatsApp Directo</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* HERO BANNER CON COLORES DE LA MARCA DEL SUSCRIPTOR                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section
        className="py-14 px-4 border-b border-white/10 relative overflow-hidden"
        style={{
          background: `radial-gradient(circle at top right, ${primaryColor}45 0%, ${secondaryColor} 70%, #09090b 100%)`,
        }}
      >
        <div className="max-w-7xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-white">
            <ShieldCheck className="w-4 h-4" style={{ color: primaryColor }} />
            <span>Portafolio Oficial Verificado • Tecnología Vecy Network</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight max-w-3xl mx-auto leading-tight">
            Encuentra tu próximo inmueble con <span style={{ color: primaryColor }}>{agencyName}</span>
          </h2>
          <p className="text-zinc-300 text-sm sm:text-base max-w-2xl mx-auto">
            Descarga fichas técnicas personalizadas, simula tu financiación y agenda visitas con validación de seguridad en línea.
          </p>

          {/* Buscador y Filtros */}
          <div className="max-w-3xl mx-auto pt-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por barrio, zona o tipo de inmueble..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-black/70 border border-white/15 text-sm text-white outline-none focus:border-white/40"
              />
            </div>
            <select
              value={txFilter}
              onChange={(e) => setTxFilter(e.target.value)}
              className="px-4 py-3.5 rounded-2xl bg-black/70 border border-white/15 text-sm text-white font-semibold outline-none"
            >
              <option value="all">Todos los Negocios</option>
              <option value="venta">En Venta</option>
              <option value="arriendo">En Arriendo</option>
              <option value="permuta">Permuta</option>
            </select>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* CATÁLOGO DE INMUEBLES CON DESCARGA DE FICHAS CON MARCA Y NEUTRAS   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black uppercase tracking-wider">
              Catálogo Disponible ({filteredProperties.length})
            </h3>
            <p className="text-xs text-zinc-400">
              Cada ficha cuenta con descarga en PDF con marca de {agencyName} o en Marca Blanca Neutra para aliados.
            </p>
          </div>
        </div>

        {filteredProperties.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/50 rounded-3xl border border-white/10">
            <p className="text-zinc-400 text-sm">No se encontraron inmuebles con ese filtro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filteredProperties.map((prop: any) => {
              const imgs = Array.isArray(prop.images) && prop.images.length > 0
                ? prop.images
                : ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'];
              const brandedFichaUrl = `/ficha/${prop.id}?mode=branded&agentId=${agent.id}`;
              const neutralFichaUrl = `/ficha/${prop.id}?mode=neutral`;
              const detailUrl = `/property/${prop.id}?mode=branded&agentId=${agent.id}`;
              const agendaUrl = `/agenda/${prop.id}?agentId=${agent.id}&nombre=${encodeURIComponent(prop.name)}`;

              return (
                <div
                  key={prop.id}
                  className="bg-zinc-900/90 rounded-3xl overflow-hidden border border-white/10 hover:border-white/25 transition-all flex flex-col justify-between shadow-xl group"
                >
                  <div>
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={imgs[0]}
                        alt={prop.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div
                        className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-lg"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {(prop.transactionType || 'venta').replace(/_/g, ' ')}
                      </div>
                      <div className="absolute bottom-3 right-3 px-3.5 py-1.5 rounded-xl bg-black/85 backdrop-blur-md text-white font-black text-base border border-white/15">
                        ${Number(prop.price || 0).toLocaleString('es-CO')} COP
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold">
                        <MapPin className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                        <span>{prop.addressNeighborhood || prop.zone}, {prop.city || 'Bogotá'}</span>
                      </div>

                      <h4 className="text-base font-extrabold text-white line-clamp-2 leading-snug">
                        {prop.name}
                      </h4>

                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10 text-center text-xs">
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Área</span>
                          <strong className="text-white">{prop.areaTotal || '-'} m²</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Hab</span>
                          <strong className="text-white">{prop.bedrooms ?? '-'}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Baños</span>
                          <strong className="text-white">{prop.bathrooms ?? '-'}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Garaje</span>
                          <strong className="text-white">{prop.garages ?? '0'}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botonera Dual de Ficha Con Marca / Marca Blanca Neutra / Agenda Pro */}
                  <div className="p-5 pt-0 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={brandedFichaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-white flex items-center justify-center gap-1.5 shadow"
                        style={{ backgroundColor: primaryColor }}
                        title="Descargar Ficha PDF con Marca y Colores de esta Agencia"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Ficha Con Marca</span>
                      </a>

                      <a
                        href={neutralFichaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center gap-1.5 border border-white/10"
                        title="Descargar Ficha PDF 100% Neutra Sin Contactos ni Colores para Terceros"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Ficha Sin Marca</span>
                      </a>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={detailUrl}
                        className="py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1.5 border border-white/10"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ver Detalles</span>
                      </a>

                      <a
                        href={agendaUrl}
                        className="py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1.5"
                      >
                        <CalendarCheck className="w-3.5 h-3.5" />
                        <span>Agendar Visita</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer del Micro-Sitio del Suscriptor */}
      <footer className="border-t border-white/10 py-10 px-4 text-center text-xs text-zinc-400" style={{ backgroundColor: secondaryColor }}>
        <div className="max-w-5xl mx-auto space-y-2">
          <p className="font-black text-white text-sm uppercase tracking-wider">{agencyName}</p>
          <p>
            {contactPhone && <span className="mr-4">WhatsApp: {contactPhone}</span>}
            {contactEmail && <span>Correo: {contactEmail}</span>}
          </p>
          <p className="text-[11px] text-zinc-500 pt-2">
            Impulsado por la Red Colaborativa Inmobiliaria <strong>VECY BIENES RAÍCES</strong> • Publicación Ilimitada con IA
          </p>
        </div>
      </footer>

      {/* Widget Flotante del Agente IA Personalizable del Suscriptor */}
      <AgentProToolsWidget
        agent={agent as any}
        propertyContext={`Sitio web oficial de ${agencyName} con ${filteredProperties.length} inmuebles activos.`}
      />

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        modalTitle={shareConfig.title}
        url={shareConfig.url}
        text={shareConfig.text}
      />
    </div>
  );
}
