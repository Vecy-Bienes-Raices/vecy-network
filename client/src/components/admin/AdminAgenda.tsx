import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  CalendarCheck, Search, ShieldCheck, ExternalLink, Copy, Check,
  MessageSquare, Eye, Users, FileText, RefreshCw, X, Clock,
  MapPin, Building2, Phone, Mail, ShieldAlert
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

  const handleRefresh = () => {
    refetchStats();
    refetchAgenda();
    toast.success('Datos de agenda actualizados');
  };

  const copyToClipboard = (text: string, label: string = 'Documento') => {
    if (!text) return;
    const cleanText = text.replace(/[^0-9a-zA-Z]/g, '');
    navigator.clipboard.writeText(cleanText);
    setCopiedDoc(text);
    toast.success(`${label} copiado al portapapeles: ${cleanText}`);
    setTimeout(() => setCopiedDoc(null), 2500);
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
                  const cleanDoc = docNum.replace(/[^0-9a-zA-Z]/g, '');
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
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary border border-white/10 text-foreground transition-all text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
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

      {/* ===== MODAL DE DETALLE COMPLETO DE LA CITA ===== */}
      {selectedSolicitud && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#121212] border border-primary/30 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/30 text-primary font-mono text-xs font-bold">
                  SOLICITUD #{selectedSolicitud.solicitudId || selectedSolicitud.id}
                </span>
                <h3 className="text-xl font-black text-foreground mt-2">
                  Ficha Completa de Cita y Verificación
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Registrada el {new Date(selectedSolicitud.createdAt || selectedSolicitud.created_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
                </p>
              </div>
              <button
                onClick={() => setSelectedSolicitud(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
              {/* Bloque 1: Solicitante */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  👤 Datos del Solicitante
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Nombre Completo:</span>
                    <strong className="text-foreground text-sm">{selectedSolicitud.solicitanteNombre || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Perfil / Tipo:</span>
                    <span className="text-zinc-300">{selectedSolicitud.solicitantePerfil || 'Cliente'} ({selectedSolicitud.solicitanteTipoPersona || 'Persona Natural'})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Documento de Identidad:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-primary font-bold">{selectedSolicitud.solicitanteTipoDocumento}: {selectedSolicitud.solicitanteNumeroDocumento}</span>
                      <button
                        onClick={() => copyToClipboard(selectedSolicitud.solicitanteNumeroDocumento, 'Documento')}
                        className="text-muted-foreground hover:text-primary p-0.5"
                        title="Copiar"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Celular:</span>
                    <span className="text-zinc-300 font-mono">{selectedSolicitud.solicitanteCelular || 'N/A'}</span>
                  </div>
                  {selectedSolicitud.solicitanteRepresentanteLegal && (
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground block">Representante Legal:</span>
                      <strong className="text-foreground">{selectedSolicitud.solicitanteRepresentanteLegal}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Bloque 2: Cita e Inmueble */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  🏠 Inmueble y Cita Programada
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Inmueble Solicitado:</span>
                    <strong className="text-foreground">{selectedSolicitud.nombreInmueble || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Código Referencia:</span>
                    <span className="font-mono text-primary font-bold">{selectedSolicitud.codigoInmueble || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Fecha de Visita:</span>
                    <span className="text-foreground font-semibold">{selectedSolicitud.fechaCitaTexto || 'Por coordinar'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Hora de la Cita:</span>
                    <span className="text-foreground font-semibold">{selectedSolicitud.horaCita || 'Pendiente'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Servicio Solicitado:</span>
                    <span className="text-zinc-300">{selectedSolicitud.servicioSolicitado || 'Visitar inmueble'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Operación:</span>
                    <span className="text-zinc-300">{selectedSolicitud.opcionNegocio || 'Venta'}</span>
                  </div>
                </div>
              </div>

              {/* Bloque 3: Cliente Referido (Si aplica) */}
              {selectedSolicitud.interesadoNombre && (
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
                    🤝 Cliente Presentado por el Colega
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Nombre del Cliente:</span>
                      <strong className="text-foreground">{selectedSolicitud.interesadoNombre}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Documento del Cliente:</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {selectedSolicitud.interesadoTipoDocumento || 'Doc'}: {selectedSolicitud.interesadoDocumento || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bloque 4: Acompañantes */}
              {selectedSolicitud.acompanantes && Array.isArray(selectedSolicitud.acompanantes) && selectedSolicitud.acompanantes.length > 0 && (
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    👥 Acompañantes Autorizados ({selectedSolicitud.acompanantes.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedSolicitud.acompanantes.map((acomp: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 text-xs">
                        <div>
                          <strong className="text-foreground">{acomp.nombre}</strong>
                          <span className="text-muted-foreground ml-2 font-mono">({acomp.documento})</span>
                        </div>
                        <span className="text-primary font-semibold text-[11px] px-2 py-0.5 rounded bg-primary/10">
                          {acomp.parentesco === 'Otro' ? acomp.parentescoOtro : acomp.parentesco || 'Acompañante'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bloque 5: Firma Virtual */}
              {selectedSolicitud.firmaVirtualBase64 && (
                <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/20 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                    ✍️ Firma Electrónica Registrada
                  </h4>
                  <div className="p-4 rounded-xl bg-white flex items-center justify-center max-w-sm mx-auto shadow-inner">
                    <img
                      src={selectedSolicitud.firmaVirtualBase64}
                      alt="Firma Virtual"
                      className="max-h-24 object-contain filter"
                    />
                  </div>
                  {selectedSolicitud.firmaFechahoraAudit && (
                    <p className="text-[11px] text-zinc-500 text-center font-mono mt-1">
                      Auditoría digital: {new Date(selectedSolicitud.firmaFechahoraAudit).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedSolicitud(null)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-foreground transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
