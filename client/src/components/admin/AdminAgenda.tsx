import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { trpc } from '@/lib/trpc';
import {
  CalendarCheck, Search, ShieldCheck, ExternalLink, Copy, Check,
  MessageSquare, Eye, Users, FileText, RefreshCw, X, Clock,
  MapPin, Building2, Phone, Mail, ShieldAlert, Download, Share2
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAgenda() {
  const [searchTerm, setSearchTerm] = useState('');
  const [perfilFilter, setPerfilFilter] = useState('all');
  const [copiedDoc, setCopiedDoc] = useState<string | null>(null);
  const [selectedSolicitud, setSelectedSolicitud] = useState<any | null>(null);

  // Queries tRPC
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = trpc.agenda.getStats.useQuery();
  const { data: agendaData, isLoading: agendaLoading, refetch: refetchAgenda } = trpc.agenda.getAll.useQuery({
    search: searchTerm,
    perfil: perfilFilter,
    limit: 100,
  });

  // Cerrar modal con tecla Escape y bloquear scroll de body
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedSolicitud(null);
    };
    if (selectedSolicitud) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedSolicitud]);

  const handleRefresh = () => {
    refetchStats();
    refetchAgenda();
    toast.success('Datos de agenda actualizados');
  };

  const copyToClipboard = (text: string, label: string = 'Documento') => {
    if (!text) return;
    const cleanText = text.toString().replace(/[^0-9a-zA-Z]/g, '');
    navigator.clipboard.writeText(cleanText);
    setCopiedDoc(text);
    toast.success(`${label} copiado al portapapeles: ${cleanText}`);
    setTimeout(() => setCopiedDoc(null), 2500);
  };

  const copyFullSummaryToClipboard = (sol: any) => {
    if (!sol) return;
    const solNum = sol.solicitudId || sol.id;
    const cleanPhone = (sol.solicitanteCelular || '').replace(/\D/g, '');
    const summaryText = `*📋 RESUMEN OFICIAL DE SOLICITUD VECY #${solNum}*
────────────────────────
👤 *Solicitante:* ${sol.solicitanteNombre || 'N/A'}
💼 *Perfil:* ${sol.solicitantePerfil || 'Cliente'} (${sol.solicitanteTipoPersona || 'Persona Natural'})
🆔 *Documento:* ${sol.solicitanteTipoDocumento || 'Doc'}: ${sol.solicitanteNumeroDocumento || 'N/A'}
📱 *Celular:* ${sol.solicitanteCelular || 'N/A'}
✉️ *Email:* ${sol.solicitanteEmail || 'N/A'}
${sol.solicitanteRepresentanteLegal ? `🏛️ *Rep. Legal:* ${sol.solicitanteRepresentanteLegal}\n` : ''}
🏠 *Inmueble:* ${sol.nombreInmueble || 'N/A'}
🏷️ *Código:* ${sol.codigoInmueble || 'N/A'}
🔑 *Operación:* ${sol.opcionNegocio || 'Venta'}
📌 *Servicio:* ${sol.servicioSolicitado || 'Visitar inmueble'}
🗓️ *Fecha Cita:* ${sol.fechaCitaTexto || 'Por coordinar'}
⏰ *Hora Cita:* ${sol.horaCita || 'Pendiente'}
${sol.interesadoNombre ? `\n🤝 *Cliente Referido:* ${sol.interesadoNombre} (${sol.interesadoTipoDocumento || 'Doc'}: ${sol.interesadoDocumento || 'N/A'})\n` : ''}
${sol.firmaFechahoraAudit ? `✍️ *Firma Auditada:* ${new Date(sol.firmaFechahoraAudit).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}\n` : ''}
Sistema: Vecy Network — Bolsa Inmobiliaria Colaborativa`;

    navigator.clipboard.writeText(summaryText);
    toast.success(`Resumen completo de la solicitud #${solNum} copiado`);
  };

  const items = agendaData?.items || [];

  return (
    <div className="space-y-6 pt-4 animate-fade-in font-sans">
      {/* ===== HEADER & KPI CARDS ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <CalendarCheck className="w-6 h-6 text-primary" />
            Gestión Centralizada de Citas y Agenda Pro
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Administra solicitudes de visitas, verificación de identidad y acuerdos de puntas compartidas (50/50).
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-primary border border-white/10 transition-all self-start sm:self-auto cursor-pointer"
          title="Actualizar datos"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${agendaLoading ? 'animate-spin' : ''}`} />
          <span>Refrescar</span>
        </button>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Total Solicitudes</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">
            {statsLoading ? '...' : (statsData?.total ?? 0)}
          </p>
          <p className="text-[10px] text-primary/80 mt-1">Histórico completo unificado</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Agentes / Contrato</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">
            {statsLoading ? '...' : (statsData?.agentes ?? 0)}
          </p>
          <p className="text-[10px] text-amber-400/80 mt-1">Puntas compartidas (50/50)</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Clientes Directos</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">
            {statsLoading ? '...' : (statsData?.directos ?? 0)}
          </p>
          <p className="text-[10px] text-blue-400/80 mt-1">Prospectos interesados</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Firmas Auditadas</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">
            {statsLoading ? '...' : (statsData?.conFirma ?? 0)}
          </p>
          <p className="text-[10px] text-emerald-400/80 mt-1">Con validez jurídica</p>
        </div>
      </div>

      {/* ===== SEARCH & FILTERS BAR ===== */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por #, nombre, documento, código..."
            className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">Filtrar:</span>
          <select
            value={perfilFilter}
            onChange={(e) => setPerfilFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
          >
            <option value="all">Todos los Perfiles</option>
            <option value="agente">Solo Agentes / Inmobiliarias</option>
            <option value="directo">Solo Clientes Directos</option>
          </select>
        </div>
      </div>

      {/* ===== TABLE OF SOLICITUDES ===== */}
      <div className="rounded-2xl border border-white/5 bg-zinc-900/40 overflow-hidden backdrop-blur-md">
        {agendaLoading ? (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <p className="text-xs font-mono uppercase tracking-widest animate-pulse">Cargando solicitudes...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <CalendarCheck className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
            <p className="text-sm font-semibold text-foreground">No se encontraron solicitudes</p>
            <p className="text-xs mt-1">Prueba cambiando los términos de búsqueda o filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-black/60 text-muted-foreground uppercase tracking-widest text-[10px] border-b border-white/5">
                <tr>
                  <th className="py-3.5 px-4 font-bold"># Solicitud</th>
                  <th className="py-3.5 px-4 font-bold">Fecha Cita</th>
                  <th className="py-3.5 px-4 font-bold">Solicitante</th>
                  <th className="py-3.5 px-4 font-bold">Inmueble</th>
                  <th className="py-3.5 px-4 font-bold text-center">Verificación 1-Clic</th>
                  <th className="py-3.5 px-4 font-bold text-center">Firma / Contrato</th>
                  <th className="py-3.5 px-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((item) => {
                  const perfilLower = (item.solicitantePerfil || '').toLowerCase();
                  const isAgent = perfilLower.includes('agente') || perfilLower.includes('inmobiliaria') || perfilLower.includes('broker') || perfilLower.includes('bróker');
                  const docNum = item.solicitanteNumeroDocumento || '';
                  const cleanPhone = (item.solicitanteCelular || '').replace(/\D/g, '');
                  const formattedPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
                  const waMessage = encodeURIComponent(
                    `Hola ${item.solicitanteNombre || ''}, te saludamos de VECY BIENES RAÍCES respecto a tu solicitud de agenda #${item.solicitudId || item.id} para el inmueble: ${item.nombreInmueble || item.codigoInmueble || ''}.`
                  );

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Solicitud ID */}
                      <td className="py-4 px-4 font-mono font-bold text-primary whitespace-nowrap">
                        <span className="px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary">
                          #{item.solicitudId || item.id}
                        </span>
                      </td>

                      {/* Fecha Cita */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                            {item.fechaCitaTexto || 'Por confirmar'}
                          </span>
                          <span className="text-[11px] text-muted-foreground mt-0.5">
                            {item.horaCita || 'Hora pendiente'}
                          </span>
                        </div>
                      </td>

                      {/* Solicitante */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col min-w-[160px]">
                          <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                            {item.solicitanteNombre || 'Sin nombre'}
                            {isAgent && (
                              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-extrabold">
                                Colega
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                            <span>{item.solicitanteTipoDocumento || 'Doc'}:</span>
                            <span className="font-mono text-zinc-300 font-semibold">{docNum || 'N/A'}</span>
                            {docNum && (
                              <button
                                onClick={() => copyToClipboard(docNum, 'Documento')}
                                className="text-zinc-500 hover:text-primary transition-colors p-0.5 cursor-pointer"
                                title="Copiar documento"
                              >
                                {copiedDoc === docNum ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                            {item.solicitanteCelular && (
                              <a
                                href={`https://wa.me/${formattedPhone}?text=${waMessage}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors font-semibold"
                                title="Abrir WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>{item.solicitanteCelular}</span>
                              </a>
                            )}
                            {item.solicitanteEmail && (
                              <span className="text-zinc-500 truncate max-w-[140px]" title={item.solicitanteEmail}>
                                {item.solicitanteEmail}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Inmueble */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col min-w-[150px]">
                          <span className="font-medium text-foreground line-clamp-1" title={item.nombreInmueble || ''}>
                            {item.nombreInmueble || 'Inmueble no especificado'}
                          </span>
                          {item.codigoInmueble && (
                            <span className="text-[11px] font-mono text-primary font-semibold mt-0.5">
                              Ref: {item.codigoInmueble}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            Operación: <strong className="text-zinc-300">{item.opcionNegocio || 'Venta'}</strong>
                          </span>
                        </div>
                      </td>

                      {/* Verificación Rápida 1 Clic */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5">
                          <a
                            href="https://antecedentes.policia.gov.co:7005/WebJudicial/"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => copyToClipboard(docNum, 'Cédula para Policía')}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-zinc-300 hover:text-primary transition-all text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            title="1-Clic: Copia cédula y abre Antecedentes Policía NAL"
                          >
                            👮 <span className="hidden xl:inline">Policía</span>
                          </a>

                          <a
                            href="https://verifiquese.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => copyToClipboard(docNum, 'Cédula para Verifíquese')}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-zinc-300 hover:text-primary transition-all text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            title="1-Clic: Copia cédula y abre Verifíquese"
                          >
                            🔍 <span className="hidden xl:inline">Verifíquese</span>
                          </a>

                          <a
                            href="https://muisca.dian.gov.co/WebRutMuisca/DefConsultaEstadoRUT.faces"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => copyToClipboard(docNum, 'NIT/RUT para DIAN')}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-zinc-300 hover:text-primary transition-all text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            title="1-Clic: Copia NIT y abre Consulta RUT DIAN"
                          >
                            🏛️ <span className="hidden xl:inline">DIAN</span>
                          </a>

                          <a
                            href="https://www.rues.org.co/"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => copyToClipboard(docNum, 'Identificación para RUES')}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-zinc-300 hover:text-primary transition-all text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            title="1-Clic: Copia número y abre RUES Cámaras de Comercio"
                          >
                            🏢 <span className="hidden xl:inline">RUES</span>
                          </a>
                        </div>
                      </td>

                      {/* Firma / Contrato */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {item.firmaVirtualBase64 ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Firmado
                            </span>
                            {item.firmaFechahoraAudit && (
                              <span className="text-[9px] text-zinc-500">
                                {new Date(item.firmaFechahoraAudit).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-500">No aplica firma</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedSolicitud(item)}
                          className="px-3.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/25 border border-primary/30 text-primary hover:text-white transition-all text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(191,149,63,0.15)]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Ficha</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== MODAL DE DETALLE COMPLETO (PORTAL DIRECTO A BODY PARA EVITAR BLOQUEO DE SCROLL/TRANSFORMS) ===== */}
      {selectedSolicitud && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedSolicitud(null);
          }}
        >
          <div
            className="bg-[#121212] border border-[#bf953f]/40 rounded-2xl sm:rounded-3xl max-w-3xl w-full p-4 sm:p-7 space-y-5 shadow-[0_0_50px_rgba(0,0,0,0.9)] relative animate-fade-in my-auto max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Estilo Correo Vecy Oficial */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-black border border-[#bf953f]/40 flex items-center justify-center p-2 shadow-[0_0_15px_rgba(191,149,63,0.2)] shrink-0">
                  <img
                    src="/logo-vecy.png"
                    alt="Vecy Logo"
                    className="w-full h-full object-contain filter drop-shadow-[0_0_6px_rgba(191,149,63,0.5)]"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs sm:text-sm text-transparent bg-clip-text bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#bf953f] tracking-wider uppercase">
                      NUEVA SOLICITUD RECIBIDA #{selectedSolicitud.solicitudId || selectedSolicitud.id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 uppercase">
                      {selectedSolicitud.solicitantePerfil || 'Cliente'}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground mt-0.5">
                    Solicitante: <span className="text-white">{selectedSolicitud.solicitanteNombre || 'Sin nombre'}</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    A continuación, el resumen de los datos ingresados en el formulario oficial de Vecy Agenda:
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSolicitud(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
                title="Cerrar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo con Scroll Suave */}
            <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-4 scrollbar-thin">
              {/* TABLA ORGANIZADA ESTILO CORREO OFICIAL (IMAGEN 1) */}
              <div className="rounded-xl border border-[#bf953f]/30 overflow-hidden bg-black/50 shadow-inner">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#bf953f]/25 via-[#bf953f]/15 to-transparent border-b border-[#bf953f]/40 text-[#fcf6ba]">
                      <th className="py-2.5 px-4 font-bold text-[11px] uppercase tracking-wider w-2/5 sm:w-1/3">
                        Campo
                      </th>
                      <th className="py-2.5 px-4 font-bold text-[11px] uppercase tracking-wider w-3/5 sm:w-2/3">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">solicitante nombre</td>
                      <td className="py-2 px-4 text-foreground font-sans font-bold text-sm">
                        {selectedSolicitud.solicitanteNombre || 'N/A'}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">solicitante tipo persona</td>
                      <td className="py-2 px-4 text-zinc-200 font-sans">
                        {selectedSolicitud.solicitanteTipoPersona || 'Persona Natural'}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">solicitante perfil</td>
                      <td className="py-2 px-4 text-zinc-200 font-sans">
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
                          {selectedSolicitud.solicitantePerfil || 'Cliente'}
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">solicitante email</td>
                      <td className="py-2 px-4 text-primary">
                        <div className="flex items-center gap-2">
                          <a
                            href={`mailto:${selectedSolicitud.solicitanteEmail}`}
                            className="hover:underline truncate"
                          >
                            {selectedSolicitud.solicitanteEmail || 'N/A'}
                          </a>
                          {selectedSolicitud.solicitanteEmail && (
                            <button
                              onClick={() => copyToClipboard(selectedSolicitud.solicitanteEmail, 'Correo')}
                              className="text-zinc-500 hover:text-primary p-0.5 cursor-pointer"
                              title="Copiar correo"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">solicitante celular</td>
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-200 font-bold">{selectedSolicitud.solicitanteCelular || 'N/A'}</span>
                          {selectedSolicitud.solicitanteCelular && (
                            <a
                              href={`https://wa.me/${(selectedSolicitud.solicitanteCelular || '').replace(/\D/g, '').startsWith('57') ? (selectedSolicitud.solicitanteCelular || '').replace(/\D/g, '') : `57${(selectedSolicitud.solicitanteCelular || '').replace(/\D/g, '')}`}?text=${encodeURIComponent(`Hola ${selectedSolicitud.solicitanteNombre || ''}, te saludamos de VECY BIENES RAÍCES respecto a tu solicitud de agenda #${selectedSolicitud.solicitudId || selectedSolicitud.id} para ${selectedSolicitud.nombreInmueble || selectedSolicitud.codigoInmueble || 'el inmueble'}.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold inline-flex items-center gap-1 hover:bg-emerald-500/25 transition-all"
                              title="Abrir WhatsApp"
                            >
                              <MessageSquare className="w-2.5 h-2.5" />
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">solicitante tipo documento</td>
                      <td className="py-2 px-4 text-zinc-200 font-sans">
                        {selectedSolicitud.solicitanteTipoDocumento || 'Cédula de ciudadanía'}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">solicitante numero documento</td>
                      <td className="py-2 px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-foreground text-sm">{selectedSolicitud.solicitanteNumeroDocumento || 'N/A'}</strong>
                          {selectedSolicitud.solicitanteNumeroDocumento && (
                            <>
                              <button
                                onClick={() => copyToClipboard(selectedSolicitud.solicitanteNumeroDocumento, 'Documento')}
                                className="text-zinc-500 hover:text-primary p-0.5 cursor-pointer"
                                title="Copiar documento"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <div className="flex items-center gap-1 ml-2">
                                <a
                                  href="https://antecedentes.policia.gov.co:7005/WebJudicial/"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => copyToClipboard(selectedSolicitud.solicitanteNumeroDocumento, 'Cédula Policía')}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-primary/20 text-zinc-300 hover:text-primary border border-white/10"
                                  title="Antecedentes Policía"
                                >
                                  👮 Policía
                                </a>
                                <a
                                  href="https://verifiquese.com/"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => copyToClipboard(selectedSolicitud.solicitanteNumeroDocumento, 'Cédula Verifíquese')}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-primary/20 text-zinc-300 hover:text-primary border border-white/10"
                                  title="Verifíquese"
                                >
                                  🔍 Verifíquese
                                </a>
                                <a
                                  href="https://muisca.dian.gov.co/WebRutMuisca/DefConsultaEstadoRUT.faces"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => copyToClipboard(selectedSolicitud.solicitanteNumeroDocumento, 'NIT DIAN')}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-primary/20 text-zinc-300 hover:text-primary border border-white/10"
                                  title="DIAN RUT"
                                >
                                  🏛️ DIAN
                                </a>
                                <a
                                  href="https://www.rues.org.co/"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => copyToClipboard(selectedSolicitud.solicitanteNumeroDocumento, 'ID RUES')}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-primary/20 text-zinc-300 hover:text-primary border border-white/10"
                                  title="RUES Cámaras"
                                >
                                  🏢 RUES
                                </a>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {selectedSolicitud.solicitanteRepresentanteLegal && (
                      <tr className="hover:bg-white/[0.02]">
                        <td className="py-2 px-4 text-zinc-400 font-sans font-medium">solicitante representante legal</td>
                        <td className="py-2 px-4 text-zinc-200 font-sans font-bold">
                          {selectedSolicitud.solicitanteRepresentanteLegal}
                        </td>
                      </tr>
                    )}
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">servicio solicitado</td>
                      <td className="py-2 px-4 text-zinc-200 font-sans font-semibold">
                        {selectedSolicitud.servicioSolicitado || 'Visitar inmueble'}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">opcion negocio</td>
                      <td className="py-2 px-4 text-amber-400 font-sans font-bold">
                        {selectedSolicitud.opcionNegocio || 'Venta'}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">nombre inmueble</td>
                      <td className="py-2 px-4 text-foreground font-sans font-bold">
                        {selectedSolicitud.nombreInmueble || 'N/A'}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">codigo inmueble</td>
                      <td className="py-2 px-4 text-primary font-bold">
                        <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/30">
                          {selectedSolicitud.codigoInmueble || 'N/A'}
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">cantidad personas</td>
                      <td className="py-2 px-4 text-zinc-200">
                        {selectedSolicitud.cantidadPersonas ? `${selectedSolicitud.cantidadPersonas} persona(s)` : 'Vacío'}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">tipo cliente</td>
                      <td className="py-2 px-4 text-zinc-200 font-sans">
                        {selectedSolicitud.tipoCliente || 'Persona'}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">interesado nombre</td>
                      <td className="py-2 px-4 text-zinc-200 font-sans">
                        {selectedSolicitud.interesadoNombre || 'No registra'}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">interesado tipo documento</td>
                      <td className="py-2 px-4 text-zinc-200 font-sans">
                        {selectedSolicitud.interesadoTipoDocumento || 'Cédula de ciudadanía'}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">interesado documento</td>
                      <td className="py-2 px-4 text-zinc-200">
                        {selectedSolicitud.interesadoDocumento || 'No registra'}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">firma fechahora audit</td>
                      <td className="py-2 px-4 text-emerald-400 font-mono text-[11px]">
                        {selectedSolicitud.firmaFechahoraAudit
                          ? new Date(selectedSolicitud.firmaFechahoraAudit).toISOString()
                          : 'Pendiente de firma'}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">fecha cita texto</td>
                      <td className="py-2 px-4 text-foreground font-sans font-bold">
                        {selectedSolicitud.fechaCitaTexto || 'Por coordinar'}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">hora cita</td>
                      <td className="py-2 px-4 text-foreground font-bold">
                        {selectedSolicitud.horaCita || 'Pendiente'}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">solicitud id</td>
                      <td className="py-2 px-4 text-primary font-bold">
                        {selectedSolicitud.solicitudId || selectedSolicitud.id}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">id</td>
                      <td className="py-2 px-4 text-zinc-400">
                        {selectedSolicitud.id}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ACOMPAÑANTES SI LOS HAY */}
              {(() => {
                let acompList = selectedSolicitud.acompanantes;
                if (typeof acompList === 'string') {
                  try { acompList = JSON.parse(acompList); } catch (_) { acompList = []; }
                }
                if (!Array.isArray(acompList) || acompList.length === 0) return null;

                return (
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#fcf6ba] flex items-center gap-2">
                      👥 Acompañantes Autorizados ({acompList.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {acompList.map((ac: any, i: number) => (
                        <div key={i} className="p-2 rounded-lg bg-white/5 border border-white/5 text-xs flex items-center justify-between">
                          <div>
                            <p className="font-bold text-foreground">{ac.nombre || 'Acompañante'}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">Doc: {ac.documento || 'N/A'}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                            {ac.parentesco === 'Otro' ? ac.parentescoOtro : ac.parentesco || 'Acompañante'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* FIRMA ELECTRÓNICA VIRTUAL AUDITADA */}
              {selectedSolicitud.firmaVirtualBase64 && (
                <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                      ✍️ Firma Electrónica Registrada (Auditoría Forense)
                    </h4>
                    <span className="text-[10px] font-mono text-emerald-400/80">
                      Válida Legalmente
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-white flex items-center justify-center max-w-sm mx-auto shadow-md">
                    <img
                      src={selectedSolicitud.firmaVirtualBase64}
                      alt="Firma Virtual"
                      className="max-h-24 object-contain"
                    />
                  </div>
                  {selectedSolicitud.firmaFechahoraAudit && (
                    <p className="text-[10px] text-zinc-400 text-center font-mono">
                      Timestamp auditado: {new Date(selectedSolicitud.firmaFechahoraAudit).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
                    </p>
                  )}
                </div>
              )}

              {/* CONTRATO ADJUNTO EN STORAGE (SI ES AGENTE / CONTRATO GENERADO) */}
              {(() => {
                const solPerfil = (selectedSolicitud.solicitantePerfil || '').toLowerCase();
                const isAgent = solPerfil.includes('agente') || solPerfil.includes('inmobiliaria') || solPerfil.includes('broker') || solPerfil.includes('bróker');
                const solNum = selectedSolicitud.solicitudId || selectedSolicitud.id;
                const safeName = (selectedSolicitud.solicitanteNombre || '').replace(/\s+/g, '_');
                const pdfFileName = `Contrato_Puntas_${solNum}_${safeName}.pdf`;
                const storageUrl = `https://knzmpoprlmbonejshfys.supabase.co/storage/v1/object/public/contratos/${pdfFileName}`;

                if (!isAgent && !selectedSolicitud.firmaVirtualBase64) return null;

                return (
                  <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-[#bf953f]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          {pdfFileName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Contrato de Puntas Compartidas (50/50) con firma digital y cláusula de no elusión
                        </p>
                      </div>
                    </div>
                    <a
                      href={storageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-[#bf953f]/20 hover:bg-[#bf953f]/30 text-[#fcf6ba] border border-[#bf953f]/40 text-xs font-bold inline-flex items-center gap-2 transition-all shrink-0 cursor-pointer shadow-[0_0_12px_rgba(191,149,63,0.2)]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Ver Contrato PDF</span>
                    </a>
                  </div>
                );
              })()}
            </div>

            {/* Footer de Acciones del Modal */}
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyFullSummaryToClipboard(selectedSolicitud)}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Copiar resumen en texto plano"
                >
                  <Share2 className="w-3.5 h-3.5 text-primary" />
                  <span>Copiar Resumen</span>
                </button>

                {selectedSolicitud.solicitanteCelular && (
                  <a
                    href={`https://wa.me/${(selectedSolicitud.solicitanteCelular || '').replace(/\D/g, '').startsWith('57') ? (selectedSolicitud.solicitanteCelular || '').replace(/\D/g, '') : `57${(selectedSolicitud.solicitanteCelular || '').replace(/\D/g, '')}`}?text=${encodeURIComponent(`Hola ${selectedSolicitud.solicitanteNombre || ''}, te saludamos de VECY BIENES RAÍCES respecto a tu solicitud de agenda #${selectedSolicitud.solicitudId || selectedSolicitud.id} para el inmueble ${selectedSolicitud.nombreInmueble || selectedSolicitud.codigoInmueble || ''}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>

              <button
                onClick={() => setSelectedSolicitud(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-foreground transition-all cursor-pointer"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
