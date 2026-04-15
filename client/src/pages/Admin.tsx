import React, { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation, useRoute } from 'wouter';
import { LogOut, Home, Building2, Users, MessageSquare, BarChart3, Menu, X, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import AdminProperties from '@/components/admin/AdminProperties';
import AdminLeads from '@/components/admin/AdminLeads';
import AdminConversations from '@/components/admin/AdminConversations';
import AdminReports from '@/components/admin/AdminReports';
import AdminGitHubSync from '@/components/admin/AdminGitHubSync';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';

export default function Admin() {
  const { user, logout, loading } = useAuth();
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('properties');

  // Check if user is admin
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-500">Cargando...</div>
      </div>
    );
  }

  if (!user || !['admin', 'agent'].includes(user.role as string)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Acceso Denegado</h1>
          <p className="text-zinc-500 mb-6">No tienes permisos para acceder a esta área.</p>
          <Button
            onClick={() => navigate('/')}
            className="bg-zinc-900 hover:bg-zinc-900 text-white"
          >
            Volver al Inicio
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'properties', label: 'Propiedades', icon: Building2 },
    { id: 'github', label: 'GitHub Sync', icon: GitBranch },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'conversations', label: 'Conversaciones', icon: MessageSquare },
    { id: 'reports', label: 'Reportes', icon: BarChart3 },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'properties':
        return <AdminProperties />;
      case 'github':
        return <AdminGitHubSync />;
      case 'leads':
        return <AdminLeads />;
      case 'conversations':
        return <AdminConversations />;
      case 'reports':
        return <AdminReports />;
      default:
        return <AdminProperties />;
    }
  };

  return (
    <div className="min-h-screen bg-black flex text-foreground font-sans">
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        orientation="vertical" 
        className="flex-1 flex overflow-hidden"
      >
        {/* Sidebar */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`${
            sidebarOpen ? 'w-72' : 'w-24'
          } glass border-r border-accent/20 transition-all duration-500 flex flex-col z-20 relative`}
        >
          {/* Logo Section */}
          <div className="p-8 border-b border-accent/10 flex items-center justify-between">
            <AnimatePresence mode="wait">
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-gold-sm">
                    <span className="text-black font-black text-xs">V</span>
                  </div>
                  <div>
                    <h2 className="text-primary font-bold text-lg tracking-widest uppercase Playfair Display">VECY</h2>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-medium">Gold Edition</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-primary hover:text-white transition-colors p-2 rounded-full hover:bg-accent/10"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-4 overflow-y-auto scrollbar-hide py-8">
            <TabsList className="flex flex-col h-auto bg-transparent gap-2 items-stretch p-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={`
                      relative flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-300 group
                      data-[state=active]:bg-accent/10 data-[state=active]:text-primary data-[state=active]:glow-gold-sm
                      data-[state=inactive]:text-muted-foreground hover:text-white hover:bg-accent/5
                      justify-start border border-transparent data-[state=active]:border-accent/30
                    `}
                  >
                    <div className="relative">
                      <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110`} />
                      <div className="absolute -inset-2 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {sidebarOpen && (
                      <span className="text-sm font-semibold tracking-wide lowercase first-letter:uppercase">
                        {tab.label}
                      </span>
                    )}
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-accent/10 space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-4 px-5 py-3 text-muted-foreground hover:text-primary hover:bg-accent/5 rounded-xl transition-all duration-300 group"
            >
              <Home className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              {sidebarOpen && <span className="text-sm font-medium tracking-wide">Sitio Público</span>}
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center gap-4 px-5 py-3 text-red-400/70 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all duration-300 group"
            >
              <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              {sidebarOpen && <span className="text-sm font-medium tracking-wide">Cerrar Sesión</span>}
            </button>
          </div>
        </motion.div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-[#050505] relative overflow-hidden">
          {/* Background Gradient Effect */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mt-64" />
          
          {/* Top Bar */}
          <div className="bg-black/40 backdrop-blur-md border-b border-accent/10 py-8 px-10 flex items-center justify-between sticky top-0 z-10">
            <div>
              <motion.h1 
                key={activeTab}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-black tracking-tight text-white Playfair Display lowercase first-letter:uppercase"
              >
                {activeTab === 'github' ? 'Sincronización' : tabs.find(t => t.id === activeTab)?.label}
              </motion.h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
                  {user?.name || 'Administrador'} <span className="text-accent/40 mx-2">|</span> ID: 00{user?.id || 1}
                </p>
              </div>
            </div>
            
            <div className="text-right hidden md:block">
              <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-1">Status: Online</p>
              <p className="text-muted-foreground text-[10px] uppercase tracking-tighter">
                {new Date().toLocaleDateString('es-CO', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Dynamic Content with TabsContent */}
          <div className="flex-1 overflow-y-auto p-10 relative z-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="min-h-full"
              >
                <TabsContent value="properties" className="m-0 mt-0 focus-visible:outline-none h-full">
                  <AdminProperties />
                </TabsContent>
                <TabsContent value="github" className="m-0 mt-0 focus-visible:outline-none h-full">
                  <AdminGitHubSync />
                </TabsContent>
                <TabsContent value="leads" className="m-0 mt-0 focus-visible:outline-none h-full">
                  <AdminLeads />
                </TabsContent>
                <TabsContent value="conversations" className="m-0 mt-0 focus-visible:outline-none h-full">
                  <AdminConversations />
                </TabsContent>
                <TabsContent value="reports" className="m-0 mt-0 focus-visible:outline-none h-full">
                  <AdminReports />
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
