import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { trpc } from '@/lib/trpc';
import {
  CalendarCheck, Search, ShieldCheck, ExternalLink, Copy, Check,
  MessageSquare, Eye, Users, FileText, RefreshCw, X, Clock,
  MapPin, Building2, Phone, Mail, ShieldAlert, Download, Share2,
  Edit3, Save, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAgenda() {
  const [searchTerm, setSearchTerm] = useState('');
  const [perfilFilter, setPerfilFilter] = useState('all');
  const [copiedDoc, setCopiedDoc] = useState<string | null>(null);
  const [selectedSolicitud, setSelectedSolicitud] = useState<any | null>(null);

  // Estado de edición de datos de la solicitud
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    solicitanteNombre?: string;
    solicitanteNumeroDocumento?: string;
    solicitanteTipoPersona?: string;
    solicitanteEmail?: string;
    solicitanteCelular?: string;
    solicitantePerfil?: string;
    solicitanteTipoDocumento?: string;
    solicitanteRepresentanteLegal?: string;
    interesadoNombre?: string;
    interesadoDocumento?: string;
    interesadoTipoDocumento?: string;
    acompanantes?: any[];
  }>({});

  const parseAcompanantes = (raw: any): any[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }
    return [];
  };

  // Queries tRPC
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = trpc.agenda.getStats.useQuery();
  const { data: agendaData, isLoading: agendaLoading, refetch: refetchAgenda } = trpc.agenda.getAll.useQuery({
    search: searchTerm,
    perfil: perfilFilter,
    limit: 100,
  });

  // Mutación para guardar cambios en los datos de la solicitud
  const updateSolicitudMutation = trpc.agenda.update.useMutation({
    onSuccess: (res) => {
      toast.success('Datos actualizados y guardados correctamente en la base de datos');
      setIsEditing(false);
      const updatedItem = res.item ? { ...selectedSolicitud, ...res.item } : { ...selectedSolicitud, ...editForm };
      setSelectedSolicitud(updatedItem);
      refetchAgenda();
      refetchStats();
    },
    onError: (err) => {
      toast.error(`Error al guardar cambios: ${err.message}`);
    },
  });

  const handleOpenFicha = (item: any) => {
    setSelectedSolicitud(item);
    setIsEditing(false);
    setEditForm({
      solicitanteNombre: item.solicitanteNombre || '',
      solicitanteNumeroDocumento: item.solicitanteNumeroDocumento || '',
      solicitanteTipoPersona: item.solicitanteTipoPersona || 'Persona Natural',
      solicitanteEmail: item.solicitanteEmail || '',
      solicitanteCelular: item.solicitanteCelular || '',
      solicitantePerfil: item.solicitantePerfil || 'Cliente directo',
      solicitanteTipoDocumento: item.solicitanteTipoDocumento || 'Cédula de ciudadanía',
      solicitanteRepresentanteLegal: item.solicitanteRepresentanteLegal || '',
      interesadoNombre: item.interesadoNombre || '',
      interesadoDocumento: item.interesadoDocumento || '',
      interesadoTipoDocumento: item.interesadoTipoDocumento || 'Cédula de ciudadanía',
      acompanantes: parseAcompanantes(item.acompanantes),
    });
  };

  const handleStartEdit = () => {
    if (!selectedSolicitud) return;
    setEditForm({
      solicitanteNombre: selectedSolicitud.solicitanteNombre || '',
      solicitanteNumeroDocumento: selectedSolicitud.solicitanteNumeroDocumento || '',
      solicitanteTipoPersona: selectedSolicitud.solicitanteTipoPersona || 'Persona Natural',
      solicitanteEmail: selectedSolicitud.solicitanteEmail || '',
      solicitanteCelular: selectedSolicitud.solicitanteCelular || '',
      solicitantePerfil: selectedSolicitud.solicitantePerfil || 'Cliente directo',
      solicitanteTipoDocumento: selectedSolicitud.solicitanteTipoDocumento || 'Cédula de ciudadanía',
      solicitanteRepresentanteLegal: selectedSolicitud.solicitanteRepresentanteLegal || '',
      interesadoNombre: selectedSolicitud.interesadoNombre || '',
      interesadoDocumento: selectedSolicitud.interesadoDocumento || '',
      interesadoTipoDocumento: selectedSolicitud.interesadoTipoDocumento || 'Cédula de ciudadanía',
      acompanantes: parseAcompanantes(selectedSolicitud.acompanantes),
    });
    setIsEditing(true);
  };

  const handleUpdateAcompanante = (index: number, field: string, value: string) => {
    setEditForm((prev) => {
      const list = [...(prev.acompanantes || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, acompanantes: list };
    });
  };

  const handleAddAcompanante = () => {
    setEditForm((prev) => ({
      ...prev,
      acompanantes: [...(prev.acompanantes || []), { nombre: '', documento: '', parentesco: 'Acompañante' }]
    }));
  };

  const handleRemoveAcompanante = (index: number) => {
    setEditForm((prev) => {
      const list = [...(prev.acompanantes || [])];
      list.splice(index, 1);
      return { ...prev, acompanantes: list };
    });
  };

  const handleSaveEdit = () => {
    if (!selectedSolicitud?.id) return;
    updateSolicitudMutation.mutate({
      id: Number(selectedSolicitud.id),
      solicitanteNombre: editForm.solicitanteNombre,
      solicitanteNumeroDocumento: editForm.solicitanteNumeroDocumento,
      solicitanteTipoPersona: editForm.solicitanteTipoPersona,
      solicitanteEmail: editForm.solicitanteEmail,
      solicitanteCelular: editForm.solicitanteCelular,
      solicitantePerfil: editForm.solicitantePerfil,
      solicitanteTipoDocumento: editForm.solicitanteTipoDocumento,
      solicitanteRepresentanteLegal: editForm.solicitanteRepresentanteLegal,
      interesadoNombre: editForm.interesadoNombre,
      interesadoDocumento: editForm.interesadoDocumento,
      interesadoTipoDocumento: editForm.interesadoTipoDocumento,
      acompanantes: editForm.acompanantes,
    });
  };

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

  const renderVerificationButtons = (docNum: string, personName: string, label: string = '') => {
    if (!docNum || docNum === 'N/A' || docNum === 'No registra') return null;
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {personName && personName !== 'No registra' && personName !== 'N/A' && (
          <button
            type="button"
            onClick={() => copyToClipboard(personName, `Nombre ${label}`)}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-zinc-300 hover:text-primary border border-white/10 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:border-primary/40"
            title={`Copiar nombre completo: ${personName}`}
          >
            {copiedDoc === personName ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#bf953f]" />
            )}
            <span>Copiar Nombre</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => copyToClipboard(docNum, `Documento ${label}`)}
          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-zinc-300 hover:text-primary border border-white/10 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:border-primary/40"
          title={`Copiar documento: ${docNum}`}
        >
          {copiedDoc === docNum ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-zinc-400" />
          )}
          <span>Copiar Doc</span>
        </button>

        <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Verificado</span>
        </span>
      </div>
    );
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
Sistema: Vecy Bienes Raíces — Red Inmobiliaria Colaborativa`;

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
                          onClick={() => handleOpenFicha(item)}
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

              <div className="flex items-center gap-2 shrink-0 ml-2">
                {!isEditing ? (
                  <button
                    onClick={handleStartEdit}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    title="Editar nombres, cédulas, correos y roles"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Editar Ficha</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-300 text-xs font-medium transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={updateSolicitudMutation.isPending}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                    >
                      {updateSolicitudMutation.isPending ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Guardar</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (isEditing) setIsEditing(false);
                    setSelectedSolicitud(null);
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Cerrar (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Cuerpo con Scroll Suave */}
            <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-4 scrollbar-thin">
              {/* BANNER INFORMATIVO EN MODO EDICIÓN */}
              {isEditing && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                      <Edit3 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold">Modo de Edición de Identidad y Roles Activado</p>
                      <p className="text-[11px] text-amber-300/80">
                        Edita los nombres y apellidos completos, cédulas, correos y roles (cliente directo, agente, agencia, empresa). Al finalizar, pulsa <strong>Guardar Cambios</strong>.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSaveEdit}
                    disabled={updateSolicitudMutation.isPending}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs inline-flex items-center gap-1.5 shrink-0 transition-all shadow"
                  >
                    {updateSolicitudMutation.isPending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Guardar</span>
                  </button>
                </div>
              )}

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
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.solicitanteNombre ?? ''}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, solicitanteNombre: e.target.value }))}
                            placeholder="Nombres y apellidos completos"
                            className="w-full bg-black/70 border border-amber-500/50 focus:border-amber-400 rounded-lg px-2.5 py-1 text-white text-xs font-bold outline-none ring-1 ring-amber-500/30"
                          />
                        ) : (
                          selectedSolicitud.solicitanteNombre || 'N/A'
                        )}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">solicitante tipo persona</td>
                      <td className="py-2 px-4 text-zinc-200 font-sans">
                        {isEditing ? (
                          <select
                            value={editForm.solicitanteTipoPersona ?? 'Persona Natural'}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, solicitanteTipoPersona: e.target.value }))}
                            className="bg-black/70 border border-amber-500/50 focus:border-amber-400 rounded-lg px-2.5 py-1 text-white text-xs outline-none ring-1 ring-amber-500/30"
                          >
                            <option value="Persona Natural">Persona Natural</option>
                            <option value="Persona Jurídica">Persona Jurídica</option>
                          </select>
                        ) : (
                          selectedSolicitud.solicitanteTipoPersona || 'Persona Natural'
                        )}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">solicitante perfil</td>
                      <td className="py-2 px-4 text-zinc-200 font-sans">
                        {isEditing ? (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <select
                              value={['Cliente directo', 'Agente inmobiliario', 'Inmobiliaria / Agencia', 'Empresa / Constructora', 'Inversionista', 'Propietario'].includes(editForm.solicitantePerfil || '') ? editForm.solicitantePerfil : 'Otro'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditForm((prev) => ({ ...prev, solicitantePerfil: val === 'Otro' ? '' : val }));
                              }}
                              className="bg-black/70 border border-amber-500/50 focus:border-amber-400 rounded-lg px-2.5 py-1 text-white text-xs font-semibold outline-none ring-1 ring-amber-500/30"
                            >
                              <option value="Cliente directo">Cliente directo</option>
                              <option value="Agente inmobiliario">Agente inmobiliario</option>
                              <option value="Inmobiliaria / Agencia">Inmobiliaria / Agencia</option>
                              <option value="Empresa / Constructora">Empresa / Constructora</option>
                              <option value="Inversionista">Inversionista</option>
                              <option value="Propietario">Propietario</option>
                              <option value="Otro">Otro (especificar...)</option>
                            </select>
                            {(!['Cliente directo', 'Agente inmobiliario', 'Inmobiliaria / Agencia', 'Empresa / Constructora', 'Inversionista', 'Propietario'].includes(editForm.solicitantePerfil || '')) && (
                              <input
                                type="text"
                                value={editForm.solicitantePerfil ?? ''}
                                placeholder="Escribe el rol (ej: Bróker, Asesor externo)"
                                onChange={(e) => setEditForm((prev) => ({ ...prev, solicitantePerfil: e.target.value }))}
                                className="bg-black/70 border border-amber-500/50 focus:border-amber-400 rounded-lg px-2.5 py-1 text-white text-xs flex-1 outline-none ring-1 ring-amber-500/30"
                              />
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
                            {selectedSolicitud.solicitantePerfil || 'Cliente'}
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">solicitante email</td>
                      <td className="py-2 px-4 text-primary">
                        {isEditing ? (
                          <input
                            type="email"
                            value={editForm.solicitanteEmail ?? ''}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, solicitanteEmail: e.target.value }))}
                            placeholder="correo@ejemplo.com"
                            className="w-full bg-black/70 border border-amber-500/50 focus:border-amber-400 rounded-lg px-2.5 py-1 text-white text-xs outline-none ring-1 ring-amber-500/30 font-sans"
                          />
                        ) : (
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
                        )}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">solicitante celular</td>
                      <td className="py-2 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.solicitanteCelular ?? ''}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, solicitanteCelular: e.target.value }))}
                            placeholder="Celular / WhatsApp (ej: 3101234567)"
                            className="w-full bg-black/70 border border-amber-500/50 focus:border-amber-400 rounded-lg px-2.5 py-1 text-white text-xs font-mono font-bold outline-none ring-1 ring-amber-500/30"
                          />
                        ) : (
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
                        )}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">solicitante tipo documento</td>
                      <td className="py-2 px-4 text-zinc-200 font-sans">
                        {isEditing ? (
                          <select
                            value={editForm.solicitanteTipoDocumento ?? 'Cédula de ciudadanía'}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, solicitanteTipoDocumento: e.target.value }))}
                            className="bg-black/70 border border-amber-500/50 focus:border-amber-400 rounded-lg px-2.5 py-1 text-white text-xs outline-none ring-1 ring-amber-500/30"
                          >
                            <option value="Cédula de ciudadanía">Cédula de ciudadanía</option>
                            <option value="Cédula de extranjería">Cédula de extranjería</option>
                            <option value="NIT">NIT</option>
                            <option value="Pasaporte">Pasaporte</option>
                            <option value="Tarjeta de identidad">Tarjeta de identidad</option>
                          </select>
                        ) : (
                          selectedSolicitud.solicitanteTipoDocumento || 'Cédula de ciudadanía'
                        )}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">solicitante numero documento</td>
                      <td className="py-2 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.solicitanteNumeroDocumento ?? ''}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, solicitanteNumeroDocumento: e.target.value }))}
                            placeholder="Número de cédula / NIT sin puntos"
                            className="w-full bg-black/70 border border-amber-500/50 focus:border-amber-400 rounded-lg px-2.5 py-1 text-white text-xs font-mono font-bold outline-none ring-1 ring-amber-500/30"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <strong className="text-foreground text-sm font-bold">{selectedSolicitud.solicitanteNumeroDocumento || 'N/A'}</strong>
                            {selectedSolicitud.solicitanteNumeroDocumento && (
                              <button
                                onClick={() => copyToClipboard(selectedSolicitud.solicitanteNumeroDocumento, 'Documento Solicitante')}
                                className="px-2 py-0.5 rounded bg-white/5 hover:bg-primary/20 text-zinc-300 hover:text-primary border border-white/10 text-[11px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                                title="Copiar cédula/NIT del solicitante"
                              >
                                {copiedDoc === selectedSolicitud.solicitanteNumeroDocumento ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>{copiedDoc === selectedSolicitud.solicitanteNumeroDocumento ? '¡Copiado!' : 'Copiar'}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                    {(selectedSolicitud.solicitanteRepresentanteLegal || isEditing) && (
                      <tr className="hover:bg-white/[0.02]">
                        <td className="py-2 px-4 text-zinc-400 font-sans font-medium">solicitante representante legal</td>
                        <td className="py-2 px-4 text-zinc-200 font-sans font-bold">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.solicitanteRepresentanteLegal ?? ''}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, solicitanteRepresentanteLegal: e.target.value }))}
                              placeholder="Nombre del Representante Legal (si aplica)"
                              className="w-full bg-black/70 border border-amber-500/50 focus:border-amber-400 rounded-lg px-2.5 py-1 text-white text-xs outline-none ring-1 ring-amber-500/30"
                            />
                          ) : (
                            selectedSolicitud.solicitanteRepresentanteLegal || 'No registra'
                          )}
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
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.interesadoNombre ?? ''}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, interesadoNombre: e.target.value }))}
                            placeholder="Nombre completo del cliente interesado"
                            className="w-full bg-black/70 border border-amber-500/50 focus:border-amber-400 rounded-lg px-2.5 py-1 text-white text-xs font-bold outline-none ring-1 ring-amber-500/30"
                          />
                        ) : (
                          selectedSolicitud.interesadoNombre || 'No registra'
                        )}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">interesado tipo documento</td>
                      <td className="py-2 px-4 text-zinc-200 font-sans">
                        {isEditing ? (
                          <select
                            value={editForm.interesadoTipoDocumento ?? 'Cédula de ciudadanía'}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, interesadoTipoDocumento: e.target.value }))}
                            className="bg-black/70 border border-amber-500/50 focus:border-amber-400 rounded-lg px-2.5 py-1 text-white text-xs outline-none ring-1 ring-amber-500/30"
                          >
                            <option value="Cédula de ciudadanía">Cédula de ciudadanía</option>
                            <option value="Cédula de extranjería">Cédula de extranjería</option>
                            <option value="NIT">NIT</option>
                            <option value="Pasaporte">Pasaporte</option>
                            <option value="Tarjeta de identidad">Tarjeta de identidad</option>
                          </select>
                        ) : (
                          selectedSolicitud.interesadoTipoDocumento || 'Cédula de ciudadanía'
                        )}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2 px-4 text-zinc-400 font-sans font-medium">interesado documento</td>
                      <td className="py-2 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.interesadoDocumento ?? ''}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, interesadoDocumento: e.target.value }))}
                            placeholder="Cédula del cliente interesado sin puntos"
                            className="w-full bg-black/70 border border-amber-500/50 focus:border-amber-400 rounded-lg px-2.5 py-1 text-white text-xs font-mono font-bold outline-none ring-1 ring-amber-500/30"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <strong className="text-foreground text-sm font-bold">{selectedSolicitud.interesadoDocumento || 'No registra'}</strong>
                            {selectedSolicitud.interesadoDocumento && selectedSolicitud.interesadoDocumento !== 'No registra' && selectedSolicitud.interesadoDocumento !== 'N/A' && (
                              <button
                                onClick={() => copyToClipboard(selectedSolicitud.interesadoDocumento, 'Cédula Cliente Interesado')}
                                className="px-2 py-0.5 rounded bg-white/5 hover:bg-primary/20 text-zinc-300 hover:text-primary border border-white/10 text-[11px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                                title="Copiar cédula del cliente interesado"
                              >
                                {copiedDoc === selectedSolicitud.interesadoDocumento ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>{copiedDoc === selectedSolicitud.interesadoDocumento ? '¡Copiado!' : 'Copiar'}</span>
                              </button>
                            )}
                          </div>
                        )}
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
              {/* ACOMPAÑANTES Y CENTRO DE VERIFICACIÓN DE IDENTIDAD */}
              {(() => {
                let acompList = selectedSolicitud.acompanantes;
                if (typeof acompList === 'string') {
                  try { acompList = JSON.parse(acompList); } catch (_) { acompList = []; }
                }
                if (!Array.isArray(acompList)) acompList = [];

                return (
                  <>
                    {/* ACOMPAÑANTES */}
                    {isEditing ? (
                      <div className="p-4 rounded-xl bg-black/60 border border-amber-500/30 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-amber-300 flex items-center gap-2">
                            👥 Acompañantes Autorizados ({editForm.acompanantes?.length || 0})
                          </h4>
                          <button
                            type="button"
                            onClick={handleAddAcompanante}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <span>+ Agregar Acompañante</span>
                          </button>
                        </div>

                        {(!editForm.acompanantes || editForm.acompanantes.length === 0) ? (
                          <p className="text-[11px] text-zinc-500 italic">No hay acompañantes registrados en esta solicitud.</p>
                        ) : (
                          <div className="space-y-2.5">
                            {editForm.acompanantes.map((ac: any, i: number) => (
                              <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs">
                                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <input
                                    type="text"
                                    value={ac.nombre || ''}
                                    onChange={(e) => handleUpdateAcompanante(i, 'nombre', e.target.value)}
                                    placeholder="Nombre y Apellido"
                                    className="bg-black/70 border border-amber-500/40 rounded px-2 py-1 text-white text-xs outline-none"
                                  />
                                  <input
                                    type="text"
                                    value={ac.documento || ''}
                                    onChange={(e) => handleUpdateAcompanante(i, 'documento', e.target.value)}
                                    placeholder="Número de Documento"
                                    className="bg-black/70 border border-amber-500/40 rounded px-2 py-1 text-white text-xs font-mono outline-none"
                                  />
                                  <input
                                    type="text"
                                    value={ac.parentesco || ''}
                                    onChange={(e) => handleUpdateAcompanante(i, 'parentesco', e.target.value)}
                                    placeholder="Parentesco / Rol"
                                    className="bg-black/70 border border-amber-500/40 rounded px-2 py-1 text-white text-xs outline-none"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAcompanante(i)}
                                  className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/20 text-xs shrink-0 cursor-pointer transition-colors self-end sm:self-center"
                                  title="Eliminar acompañante"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      acompList.length > 0 && (
                        <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-[#fcf6ba] flex items-center gap-2">
                            👥 Acompañantes Autorizados ({acompList.length})
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {acompList.map((ac: any, i: number) => (
                              <div key={i} className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-xs flex items-center justify-between gap-2">
                                <div>
                                  <p className="font-bold text-foreground">{ac.nombre || 'Acompañante'}</p>
                                  <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px]">
                                    <span className="text-zinc-400">Doc:</span>
                                    <strong className="text-zinc-100">{ac.documento || 'N/A'}</strong>
                                    {ac.documento && ac.documento !== 'N/A' && (
                                      <button
                                        onClick={() => copyToClipboard(ac.documento, `Cédula Acompañante (${ac.nombre || ''})`)}
                                        className="p-1 rounded bg-white/5 hover:bg-primary/20 text-zinc-300 hover:text-primary cursor-pointer transition-colors"
                                        title="Copiar documento acompañante"
                                      >
                                        {copiedDoc === ac.documento ? (
                                          <Check className="w-3 h-3 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold shrink-0">
                                  {ac.parentesco === 'Otro' ? ac.parentescoOtro : ac.parentesco || 'Acompañante'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}

                    {/* CENTRO DE IDENTIDADES OFICIALES VERIFICADAS */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-black/50 border border-[#bf953f]/35 space-y-3.5 shadow-inner">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#bf953f] flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-[#bf953f]" />
                            Centro de Identidades Oficiales Verificadas
                          </h4>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            Copia de un clic de los nombres y documentos verificados contra bases de datos oficiales:
                          </p>
                        </div>
                        <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit shrink-0 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" /> Verificación Universal Activa
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {/* 1. Solicitante */}
                        {selectedSolicitud.solicitanteNumeroDocumento && (
                          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                👤
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-white">
                                    {selectedSolicitud.solicitanteNombre || 'Solicitante'}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 uppercase font-semibold">
                                    {selectedSolicitud.solicitantePerfil || 'Solicitante'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                                  <span>{selectedSolicitud.solicitanteTipoDocumento || 'Cédula'}: <strong className="text-white">{selectedSolicitud.solicitanteNumeroDocumento}</strong></span>
                                  <button
                                    onClick={() => copyToClipboard(selectedSolicitud.solicitanteNumeroDocumento, 'Cédula Solicitante')}
                                    className="text-zinc-400 hover:text-primary p-0.5 cursor-pointer flex items-center gap-1 transition-colors"
                                    title="Copiar cédula solicitante"
                                  >
                                    {copiedDoc === selectedSolicitud.solicitanteNumeroDocumento ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                    <span className="text-[10px] text-zinc-400">Copiar</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0">
                              {renderVerificationButtons(selectedSolicitud.solicitanteNumeroDocumento, selectedSolicitud.solicitanteNombre || 'Solicitante', 'Solicitante')}
                            </div>
                          </div>
                        )}

                        {/* 2. Cliente Interesado (si existe documento) */}
                        {selectedSolicitud.interesadoDocumento && selectedSolicitud.interesadoDocumento !== 'No registra' && selectedSolicitud.interesadoDocumento !== 'N/A' && (
                          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                                🎯
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-white">
                                    {selectedSolicitud.interesadoNombre || 'Cliente Interesado'}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase font-semibold">
                                    Cliente Interesado
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                                  <span>{selectedSolicitud.interesadoTipoDocumento || 'Cédula'}: <strong className="text-white">{selectedSolicitud.interesadoDocumento}</strong></span>
                                  <button
                                    onClick={() => copyToClipboard(selectedSolicitud.interesadoDocumento, 'Cédula Cliente Interesado')}
                                    className="text-zinc-400 hover:text-primary p-0.5 cursor-pointer flex items-center gap-1 transition-colors"
                                    title="Copiar cédula cliente interesado"
                                  >
                                    {copiedDoc === selectedSolicitud.interesadoDocumento ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                    <span className="text-[10px] text-zinc-400">Copiar</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0">
                              {renderVerificationButtons(selectedSolicitud.interesadoDocumento, selectedSolicitud.interesadoNombre || 'Cliente Interesado', 'Cliente')}
                            </div>
                          </div>
                        )}

                        {/* 3. Acompañantes con Cédula */}
                        {acompList.map((ac: any, i: number) => {
                          if (!ac.documento || ac.documento === 'N/A' || ac.documento === 'No registra') return null;
                          return (
                            <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-white/10 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                                  👥
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white">
                                      {ac.nombre || `Acompañante #${i + 1}`}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 uppercase font-semibold">
                                      {ac.parentesco === 'Otro' ? ac.parentescoOtro : ac.parentesco || 'Acompañante'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                                    <span>Doc: <strong className="text-white">{ac.documento}</strong></span>
                                    <button
                                      onClick={() => copyToClipboard(ac.documento, `Cédula Acompañante (${ac.nombre || ''})`)}
                                      className="text-zinc-400 hover:text-primary p-0.5 cursor-pointer flex items-center gap-1 transition-colors"
                                      title="Copiar documento de acompañante"
                                    >
                                      {copiedDoc === ac.documento ? (
                                        <Check className="w-3 h-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                      <span className="text-[10px] text-zinc-400">Copiar</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0">
                                {renderVerificationButtons(ac.documento, ac.nombre || `Acompañante ${i + 1}`, 'Acompañante')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
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

              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-zinc-300 transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={updateSolicitudMutation.isPending}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.35)]"
                    >
                      {updateSolicitudMutation.isPending ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Guardar Cambios</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleStartEdit}
                      className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Editar nombres, cédulas, correos y roles"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar Ficha</span>
                    </button>
                    <button
                      onClick={() => setSelectedSolicitud(null)}
                      className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-foreground transition-all cursor-pointer"
                    >
                      Cerrar Ficha
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
