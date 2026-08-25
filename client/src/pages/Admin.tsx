import React, { useState, Suspense, lazy } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { getLoginUrl } from '@/const';
import {
  LogOut, Home, Building2, Users, BarChart3, Menu, X, GitBranch, Shield, Sparkles, ClipboardList, Radio, PanelLeftClose
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { getColombiaCurrentDateString } from '@/lib/dateUtils';

// Lazy loading modular de cada pestaña del panel administrativo para máxima velocidad
const AdminProperties = lazy(() => import('@/components/admin/AdminProperties'));
const AdminRequirements = lazy(() => import('@/components/admin/AdminRequirements'));
const AdminMatches = lazy(() => import('@/components/admin/AdminMatches'));
const AdminLeads = lazy(() => import('@/components/admin/AdminLeads'));
const AdminReports = lazy(() => import('@/components/admin/AdminReports'));
const AdminGitHubSync = lazy(() => import('@/components/admin/AdminGitHubSync'));

function TabLoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] w-full gap-3 py-12">
      <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      <p className="text-zinc-400 text-xs font-mono uppercase tracking-widest animate-pulse">Cargando módulo...</p>
    </div>
  );
}

const tabs = [
  { id: 'properties', label: 'Inmuebles', icon: Building2 },
  { id: 'requirements', label: 'Requerimientos', icon: ClipboardList },
  { id: 'matches', label: 'Coincidencias', icon: Sparkles },
  { id: 'leads', label: 'Prospectos', icon: Users },
  { id: 'reports', label: 'Reportes', icon: BarChart3 },
  { id: 'github', label: 'GitHub Sync', icon: GitBranch },
];

function BotStatusWidget() {
  const { data: status, isLoading } = trpc.janIA.getBotStatus.useQuery(undefined, {
    refetchInterval: 30000, // Refrescar cada 30 segundos
    refetchOnWindowFocus: false,
  });

  if (isLoading || !status) {
    return (
      <div className="flex items-center gap-2 text-zinc-500 text-xs bg-zinc-900/50 px-3 py-1.5 rounded-xl border border-white/5 w-full sm:w-auto">
        <Radio className="w-3.5 h-3.5 animate-pulse text-zinc-400 shrink-0" />
        <span className="truncate">Cargando estado del bot...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
      {/* Indicador de conexión con verde eléctrico fluorescente incandescente */}
      <div className="flex items-center gap-2 bg-zinc-900/90 border border-[#00ff66]/20 px-3 py-1.5 rounded-xl text-xs backdrop-blur-md shadow-[0_0_10px_rgba(0,255,102,0.1)] shrink-0">
        <span className={`w-2.5 h-2.5 rounded-full ${status.isReady ? 'bg-[#00ff66] shadow-[0_0_12px_#00ff66] animate-pulse' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`} />
        <span className={`font-bold ${status.isReady ? 'text-[#00ff66] drop-shadow-[0_0_6px_rgba(0,255,102,0.6)]' : 'text-zinc-300'}`}>
          JanIA: {status.isReady ? 'Activo' : 'Offline'}
        </span>
        {status.phone && (
          <span className="text-[10px] text-emerald-300/80 font-mono font-medium border-l border-white/10 pl-2">
            +{status.phone}
          </span>
        )}
      </div>

      {/* Contadores del día en tiempo real */}
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-400 font-bold shrink-0">
        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg border border-emerald-500/20 whitespace-nowrap">
          {status.todayProperties} Inm. Hoy
        </span>
        <span className="bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-lg border border-indigo-500/20 whitespace-nowrap">
          {status.todayRequirements} Reqs Hoy
        </span>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user, logout, loading } = useAuth();
  const [, navigate] = useLocation();
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('vecy_admin_sidebar_expanded');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.innerWidth >= 1024;
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('properties');

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vecy_admin_sidebar_expanded', String(next));
      } catch (e) {}
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="panel-card p-10 text-center max-w-sm">
          <Shield className="w-12 h-12 text-accent mx-auto mb-4 opacity-70" />
          <h1 className="text-xl font-bold text-foreground mb-2">Iniciar Sesión</h1>
          <p className="text-muted-foreground text-sm mb-6">Debes iniciar sesión con una cuenta autorizada para acceder al panel.</p>
          <button onClick={() => { window.location.href = getLoginUrl(); }} className="btn-gold w-full">
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  const ADMIN_EMAILS = [
    'vecybienesraices@gmail.com',
    'edduinnova@gmail.com',
    'jani79alves@gmail.com',
    'eduardoariveram@gmail.com',
    'eddu.mendoza@gmail.com',
    'mejorpontealdia@gmail.com'
  ];

  const isAuthorized = user && (ADMIN_EMAILS.includes((user.email || '').toLowerCase()) || ['admin', 'agent'].includes(user.role as string));

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="panel-card p-10 text-center max-w-md">
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4 opacity-70" />
          <h1 className="text-xl font-bold text-foreground mb-2">Acceso Denegado</h1>
          <p className="text-muted-foreground text-sm mb-2">
            Tu cuenta (<span className="text-accent">{user.email}</span>) no tiene permisos de administrador o agente.
          </p>
          <p className="text-muted-foreground text-xs mb-6">
            Por favor, ponte en contacto con soporte técnico para actualizar tu rol a "agent" o "admin".
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={() => logout()} className="btn-electric w-full">
              Cerrar Sesión / Cambiar Cuenta
            </button>
            <button onClick={() => navigate('/')} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    let Component;
    switch (activeTab) {
      case 'properties':    Component = <AdminProperties />; break;
      case 'requirements':  Component = <AdminRequirements />; break;
      case 'matches':       Component = <AdminMatches />; break;
      case 'github':        Component = <AdminGitHubSync />; break;
      case 'leads':         Component = <AdminLeads />; break;
      case 'reports':       Component = <AdminReports />; break;
      default:              Component = <AdminProperties />; break;
    }

    return (
      <Suspense fallback={<TabLoadingSkeleton />}>
        {Component}
      </Suspense>
    );
  };

  return (
    <div className="h-screen bg-background flex flex-col md:flex-row text-foreground relative overflow-hidden font-sans">

      {/* ===== MOBILE BACKDROP OVERLAY ===== */}
      {mobileDrawerOpen && (
        <div 
          onClick={() => setMobileDrawerOpen(false)} 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden animate-fade-in transition-opacity" 
        />
      )}

      {/* ===== SIDEBAR (FIXED ON DESKTOP & COLLAPSIBLE) ===== */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-50 bg-[#0a0a0a] border-r border-white/5 flex flex-col shrink-0 h-full
          transition-all duration-300 ease-in-out shadow-2xl md:shadow-none
          ${mobileDrawerOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
          ${sidebarExpanded ? 'md:w-64' : 'md:w-20'}
        `}
      >
        {/* Logo & Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between min-h-[72px] shrink-0">
          {/* Desktop View Header */}
          <div className="hidden md:flex items-center justify-between w-full">
            {sidebarExpanded ? (
              <>
                <div className="flex items-center gap-3 animate-fade-in overflow-hidden">
                  <img
                    src="/logo-vecy.png"
                    alt="Vecy Network"
                    className="h-8 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(191,149,63,0.3)] shrink-0"
                  />
                  <div className="flex flex-col">
                    <span className="font-sans font-black text-transparent bg-clip-text bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#bf953f] tracking-[0.15em] text-xs uppercase leading-tight">
                      Vecy Network
                    </span>
                    <p className="text-muted-foreground text-[9px] uppercase tracking-[0.25em] whitespace-nowrap">
                      Panel Admin
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleSidebar}
                  className="text-zinc-400 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-white/5 ml-2 shrink-0 border border-transparent hover:border-white/10"
                  title="Contraer menú"
                >
                  <PanelLeftClose className="w-4 h-4 text-primary/80 hover:text-primary" />
                </button>
              </>
            ) : (
              <div className="w-full flex items-center justify-center">
                <button
                  onClick={toggleSidebar}
                  className="p-1.5 rounded-xl hover:bg-white/5 transition-all text-zinc-400 hover:text-white group border border-transparent hover:border-white/10"
                  title="Expandir menú"
                >
                  <img
                    src="/logo-vecy.png"
                    alt="Vecy"
                    className="h-7 w-auto object-contain filter drop-shadow-[0_0_6px_rgba(191,149,63,0.4)] group-hover:scale-105 transition-transform"
                  />
                </button>
              </div>
            )}
          </div>

          {/* Mobile View Header */}
          <div className="flex md:hidden items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <img
                src="/logo-vecy.png"
                alt="Vecy Network"
                className="h-8 w-auto object-contain"
              />
              <div className="flex flex-col">
                <span className="font-sans font-black text-transparent bg-clip-text bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#bf953f] tracking-[0.15em] text-xs uppercase leading-tight">
                  Vecy Network
                </span>
                <p className="text-muted-foreground text-[9px] uppercase tracking-[0.25em]">
                  Panel Admin
                </p>
              </div>
            </div>
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-white/5"
              title="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileDrawerOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative
                  ${isActive 
                    ? 'bg-gradient-to-r from-[#bf953f]/20 via-[#bf953f]/10 to-transparent text-[#fcf6ba] border border-[#bf953f]/30 shadow-[0_0_15px_rgba(191,149,63,0.1)]' 
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-transparent'}
                  ${!sidebarExpanded ? 'md:justify-center md:px-0' : ''}
                `}
                title={!sidebarExpanded ? tab.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-primary' : 'text-zinc-400 group-hover:text-zinc-200'}`} />
                
                <span className={`truncate ${!sidebarExpanded ? 'md:hidden' : ''}`}>
                  {tab.label}
                </span>

                {isActive && (
                  <span className={`w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_#bf953f] ml-auto shrink-0 ${!sidebarExpanded ? 'md:hidden' : ''}`} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Links */}
        <div className="p-3 border-t border-white/5 space-y-1.5 shrink-0 bg-black/20">
          <button
            onClick={() => navigate('/')}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all
              ${!sidebarExpanded ? 'md:justify-center md:px-0' : ''}
            `}
            title={!sidebarExpanded ? 'Sitio Público' : undefined}
          >
            <Home className="w-4 h-4 shrink-0 text-zinc-400" />
            <span className={`truncate ${!sidebarExpanded ? 'md:hidden' : ''}`}>Sitio Público</span>
          </button>
          <button
            onClick={logout}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all
              ${!sidebarExpanded ? 'md:justify-center md:px-0' : ''}
            `}
            title={!sidebarExpanded ? 'Cerrar Sesión' : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0 text-red-400/80" />
            <span className={`truncate ${!sidebarExpanded ? 'md:hidden' : ''}`}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden w-full">

        {/* Top bar */}
        <header className="bg-card/90 backdrop-blur-md border-b border-border px-4 sm:px-8 py-3.5 sm:py-5 flex flex-col sm:flex-row gap-3 sm:items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="md:hidden p-2 text-zinc-300 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl"
                title="Abrir menú"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                  {tabs.find(t => t.id === activeTab)?.label ?? 'Panel'}
                </h1>
                <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <p className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-widest font-semibold">
                    {user?.name ?? 'Administrador'}
                    <span className="text-border mx-1.5 sm:mx-2">|</span>
                    {(user?.role as string) === 'admin' ? (
                      <span className="text-primary">Superadmin</span>
                    ) : (
                      <span>Captador</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 w-full sm:w-auto">
            {/* BOT STATUS INDICATOR */}
            <BotStatusWidget />
            
            <div className="hidden lg:block text-right border-l border-border pl-6">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Sistema Activo</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                {getColombiaCurrentDateString()}
              </p>
            </div>
          </div>
        </header>

        {/* MOBILE SLIDING TABS BAR — Estilo Pill Deslizable 100% Responsivo */}
        <div className="flex md:hidden items-center gap-2 px-3 py-2.5 bg-[#0a0a0a] border-b border-white/10 overflow-x-auto scrollbar-none z-20 shrink-0 w-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex shrink-0 items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#bf953f] text-black shadow-[0_0_12px_rgba(191,149,63,0.3)] font-extrabold' 
                    : 'bg-white/5 text-zinc-300 border border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-black' : 'text-primary'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 bg-background animate-fade-in">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
