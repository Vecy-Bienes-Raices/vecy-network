import React, { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { getLoginUrl } from '@/const';
import {
  LogOut, Home, Building2, Users, MessageSquare, BarChart3, Menu, X, GitBranch, Shield, Sparkles, ClipboardList, Radio
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import AdminProperties from '@/components/admin/AdminProperties';
import AdminLeads from '@/components/admin/AdminLeads';
import AdminConversations from '@/components/admin/AdminConversations';
import AdminReports from '@/components/admin/AdminReports';
import AdminGitHubSync from '@/components/admin/AdminGitHubSync';
import AdminMatches from '@/components/admin/AdminMatches';
import AdminRequirements from '@/components/admin/AdminRequirements';
import { getColombiaCurrentDateString } from '@/lib/dateUtils';

const tabs = [
  { id: 'properties', label: 'Inmuebles', icon: Building2 },
  { id: 'requirements', label: 'Requerimientos', icon: ClipboardList },
  { id: 'matches', label: 'Coincidencias', icon: Sparkles },
  { id: 'leads', label: 'Prospectos', icon: Users },
  { id: 'conversations', label: 'Conversaciones', icon: MessageSquare },
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
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : false);
  const [activeTab, setActiveTab] = useState('properties');

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

  if (!['admin', 'agent'].includes(user.role as string)) {
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
    switch (activeTab) {
      case 'properties':    return <AdminProperties />;
      case 'requirements':  return <AdminRequirements />;
      case 'matches':       return <AdminMatches />;
      case 'github':        return <AdminGitHubSync />;
      case 'leads':         return <AdminLeads />;
      case 'conversations': return <AdminConversations />;
      case 'reports':       return <AdminReports />;
      default:              return <AdminProperties />;
    }
  };


  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row text-foreground relative overflow-x-hidden">

      {/* ===== MOBILE BACKDROP OVERLAY ===== */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-fade-in" 
        />
      )}

      {/* ===== SIDEBAR ===== */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 bg-card border-r border-border flex flex-col 
          transition-all duration-300 ease-in-out shadow-2xl md:shadow-none
          ${sidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20'}`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-border flex items-center justify-between min-h-[72px]">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 animate-fade-in">
              <img
                src="/logo-vecy.png"
                alt="Vecy Network"
                className="h-9 w-auto object-contain"
              />
              <p className="text-muted-foreground text-[9px] uppercase tracking-[0.3em] whitespace-nowrap">
                Panel Admin
              </p>
            </div>
          ) : (
            <div className="mx-auto">
              <img
                src="/logo-vecy.png"
                alt="Vecy"
                className="h-7 w-auto object-contain opacity-80"
              />
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-secondary ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Botón de expandir cuando está colapsado en desktop */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="hidden md:block mx-auto mt-3 text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-secondary"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className={`nav-item-vecy w-full ${isActive ? 'active' : ''} ${!sidebarOpen ? 'justify-center' : ''}`}
                title={!sidebarOpen ? tab.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="truncate">{tab.label}</span>
                )}
                {isActive && sidebarOpen && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-1">
          <button
            onClick={() => navigate('/')}
            className={`nav-item-vecy w-full ${!sidebarOpen ? 'justify-center' : ''}`}
            title={!sidebarOpen ? 'Sitio Público' : undefined}
          >
            <Home className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Sitio Público</span>}
          </button>
          <button
            onClick={logout}
            className={`nav-item-vecy w-full text-destructive/70 hover:text-destructive hover:bg-destructive/5 ${!sidebarOpen ? 'justify-center' : ''}`}
            title={!sidebarOpen ? 'Cerrar Sesión' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden w-full">

        {/* Top bar */}
        <header className="bg-card/90 backdrop-blur-md border-b border-border px-4 sm:px-8 py-3.5 sm:py-5 flex flex-col sm:flex-row gap-3 sm:items-center justify-between sticky top-0 z-30">
          <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
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

        {/* MOBILE SLIDING TABS BAR */}
        <div className="flex md:hidden overflow-x-auto whitespace-nowrap gap-1.5 px-3 py-2 bg-black/40 border-b border-white/5 scrollbar-none z-20">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-[#bf953f] text-black shadow-md' 
                    : 'bg-white/5 text-zinc-400 border border-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
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
