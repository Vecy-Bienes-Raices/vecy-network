import React, { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import {
  LogOut, Home, Building2, Users, MessageSquare, BarChart3, Menu, X, GitBranch, Shield
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import AdminProperties from '@/components/admin/AdminProperties';
import AdminLeads from '@/components/admin/AdminLeads';
import AdminConversations from '@/components/admin/AdminConversations';
import AdminReports from '@/components/admin/AdminReports';
import AdminGitHubSync from '@/components/admin/AdminGitHubSync';

const tabs = [
  { id: 'properties', label: 'Inmuebles', icon: Building2 },
  { id: 'leads', label: 'Prospectos', icon: Users },
  { id: 'conversations', label: 'Conversaciones', icon: MessageSquare },
  { id: 'reports', label: 'Reportes', icon: BarChart3 },
  { id: 'github', label: 'GitHub Sync', icon: GitBranch },
];

export default function Admin() {
  const { user, logout, loading } = useAuth();
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  if (!user || !['admin', 'agent'].includes(user.role as string)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="panel-card p-10 text-center max-w-sm">
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4 opacity-70" />
          <h1 className="text-xl font-bold text-foreground mb-2">Acceso Denegado</h1>
          <p className="text-muted-foreground text-sm mb-6">No tienes permisos para acceder a esta área.</p>
          <button onClick={() => navigate('/')} className="btn-electric w-full">
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'properties':    return <AdminProperties />;
      case 'github':        return <AdminGitHubSync />;
      case 'leads':         return <AdminLeads />;
      case 'conversations': return <AdminConversations />;
      case 'reports':       return <AdminReports />;
      default:              return <AdminProperties />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex text-foreground">

      {/* ===== SIDEBAR ===== */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} 
          flex-shrink-0 bg-card border-r border-border flex flex-col z-20 
          transition-all duration-300 ease-in-out`}
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
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-secondary ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Botón de expandir cuando está colapsado */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="mx-auto mt-3 text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-secondary block"
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
                onClick={() => setActiveTab(tab.id)}
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
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Top bar */}
        <header className="bg-card/80 backdrop-blur-md border-b border-border px-8 py-5 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              {tabs.find(t => t.id === activeTab)?.label ?? 'Panel'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <p className="text-muted-foreground text-xs uppercase tracking-widest font-semibold">
                {user?.name ?? 'Administrador'}
                <span className="text-border mx-2">|</span>
                {(user?.role as string) === 'admin' ? (
                  <span className="text-primary">Superadmin</span>
                ) : (
                  <span>Captador</span>
                )}
              </p>
            </div>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Sistema Activo</p>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-background animate-fade-in">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
