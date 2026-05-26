// @ts-nocheck
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  Upload, 
  X, 
  MessageSquare, 
  Volume2, 
  Loader, 
  Sparkles, 
  PanelLeftClose, 
  PanelLeft, 
  Plus, 
  History,
  Settings,
  MoreVertical,
  Paperclip,
  Image as ImageIcon,
  Brain,
  Cpu,
  Database,
  Search,
  FileText,
  Bell,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import Navbar from '@/components/Navbar';

interface Message {
  id: string;
  role: 'user' | 'janIA';
  content: string;
  messageType: 'text' | 'image' | 'audio' | 'file' | 'video';
  attachments?: string[];
  timestamp: Date;
}

// ─── JANIA PROCESS LOADER (Gemini & Multi-task Style) ─────────────────────────
function JanIARealtimeLoader() {
  const [step, setStep] = useState(0);
  const steps = [
    { text: "Pensando", detail: "Orquestando JanIA v2.0 (Gemini Engine)...", icon: Brain, color: "text-[#bf953f]" },
    { text: "Analizando lenguaje natural", detail: "Procesando semántica del mensaje...", icon: Cpu, color: "text-blue-400" },
    { text: "Rastreando inmuebles", detail: "Buscando en base de datos nacional...", icon: Database, color: "text-emerald-400" },
    { text: "Rastreando requerimientos", detail: "Analizando demandas activas...", icon: Search, color: "text-cyan-400" },
    { text: "Buscando posibilidades de Match", detail: "Cruzando coeficientes de afinidad...", icon: Sparkles, color: "text-amber-400" },
    { text: "Generando informe técnico", detail: "Estructurando ficha Gold Edition...", icon: FileText, color: "text-[#bf953f]" },
    { text: "Notificando a la red de contactos", detail: "Preparando cola de envíos directos...", icon: Bell, color: "text-red-400" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % steps.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-6 items-start w-full"
    >
      {/* Avatar Container with glowing rings */}
      <div className="relative flex-shrink-0 w-10 h-10 mt-1">
        {/* Animated glow halo */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{ 
            duration: 2.5, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#00d2ff] opacity-60 blur-sm"
        />
        
        {/* Actual Avatar */}
        <div className="relative w-full h-full rounded-full overflow-hidden border border-primary/30 bg-black z-10">
          <img src="/jania_perfil.png" className="w-full h-full object-cover animate-pulse" alt="JanIA Profile" />
        </div>
      </div>

      {/* Main Processing Box */}
      <div className="flex-1 max-w-[85%] space-y-2">
        <div className="bg-[#0c0c0c] border border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
          
          {/* Gemini-like waving aura background */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-[#bf953f]/5 via-[#00d2ff]/5 to-pink-500/5 opacity-40 blur-xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 ${currentStep.color}`}>
                <Icon className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    {currentStep.text}
                  </h4>
                  {/* Animated Ellipsis */}
                  <span className="flex gap-1 items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" />
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1 font-light">
                  {currentStep.detail}
                </p>
              </div>
            </div>
          </div>

          {/* Running Progress Bar (Gemini Style) */}
          <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden mt-6">
            <motion.div 
              initial={{ left: "-100%" }}
              animate={{ left: "100%" }}
              transition={{ 
                duration: 2.2, 
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-[#bf953f] via-[#fcf6ba] via-[#00d2ff] to-transparent"
            />
          </div>

          {/* Holographic terminal specs underneath */}
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-zinc-500 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-ping" />
              ENGINE: JANIA_GEMINI_CO
            </span>
            <span>MODEL_STATUS: ONLINE</span>
            <span>NEURAL_RESOLVER: TRUE</span>
          </div>

        </div>
        
        <p className="text-[9px] font-black uppercase tracking-widest opacity-30 text-left">
          Procesamiento Neuronal en Curso
        </p>
      </div>
    </motion.div>
  );
}

export default function JanIAConsole() {
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random()}`);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatMutation = trpc.janIA.chat.useMutation();
  const analyzeFileMutation = trpc.janIA.analyzeFile.useMutation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'janIA',
        content: '¡Bienvenido a la Consola de Inteligencia de VECY Network! 🏛️\n\nSoy JanIA, tu Agente IA y Cerebro Logístico. He sido diseñada para optimizar cada engranaje de tu gestión inmobiliaria.\n\n**¿Qué negocio vamos a cerrar hoy?**',
        messageType: 'text',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue,
      messageType: 'text',
      timestamp: new Date(),
    };

    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await chatMutation.mutateAsync({
        sessionId,
        message: inputValue,
      });

      const janIAMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'janIA',
        content: response.content,
        messageType: 'text',
        timestamp: new Date(),
      };

      setMessages((prev: Message[]) => [...prev, janIAMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'janIA',
        content: 'Lo siento, ocurrió un error técnico. Por favor, intenta de nuevo.',
        messageType: 'text',
        timestamp: new Date(),
      };
      setMessages((prev: Message[]) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      const response = await fetch('/api/janIA/upload', { method: 'POST', body: formData });
      const data = await response.json();
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: `[Archivo: ${file.name}]`,
        messageType: file.type.startsWith('image/') ? 'image' : 'file',
        attachments: [data.fileUrl],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      const janIAResponse = await analyzeFileMutation.mutateAsync({
        sessionId,
        fileUrl: data.fileUrl,
        fileType: file.type,
      });
      const janIAMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'janIA',
        content: janIAResponse.analysis,
        messageType: 'text',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, janIAMessage]);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-bold text-accent">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex h-screen bg-[#050505] text-foreground selection:bg-primary/30 overflow-hidden font-sans">
      {/* Sidebar - Gemini Style */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-[#0a0a0a] border-r border-white/5 flex flex-col z-30"
      >
        <div className="p-4 flex flex-col h-full overflow-hidden">
          <Button 
            variant="ghost" 
            className="mb-8 w-full justify-start gap-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl py-6"
            onClick={() => setMessages([])}
          >
            <Plus className="w-5 h-5 text-primary" />
            <span className="font-bold uppercase tracking-widest text-[10px]">Nuevo Chat</span>
          </Button>

          <div className="flex-1 space-y-2 overflow-y-auto scrollbar-hide">
            <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] mb-4 px-2">Recientes</p>
            <div className="space-y-1">
              {['Análisis Sector Cedritos', 'Match Apartamento Pasadena', 'Consulta Bolsa Puntos'].map((chat, i) => (
                <button key={i} className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-xs text-gray-400 truncate flex items-center gap-3 group transition-all">
                  <MessageSquare className="w-3 h-3 opacity-30 group-hover:text-primary" />
                  {chat}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-1">
            <button className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-3">
              <Settings className="w-4 h-4" /> Configuración
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-400">
              {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white tracking-[0.3em] uppercase">JanIA Console</span>
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/20">
              <img src="/jania_perfil.png" className="w-full h-full object-cover" alt="JanIA Profile" />
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-gray-400">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pt-8 pb-32">
          <div className="max-w-4xl mx-auto px-6 space-y-12">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-6 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'janIA' && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden glow-gold-sm mt-1">
                      <img src="/jania_perfil.png" className="w-full h-full object-cover" alt="JanIA Profile" />
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] space-y-2 ${message.role === 'user' ? 'order-first' : ''}`}>
                    <div className={`p-6 rounded-3xl ${
                      message.role === 'user' 
                        ? 'bg-primary text-black font-bold shadow-gold-sm' 
                        : 'bg-white/[0.03] border border-white/5 text-gray-200'
                    }`}>
                      <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                        {renderMessageContent(message.content)}
                      </p>
                    </div>
                    <p className={`text-[9px] font-black uppercase tracking-widest opacity-30 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {message.timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mt-1 border border-white/10">
                      <Users className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isLoading && (
              <JanIARealtimeLoader />
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - Gemini Pill Design */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent">
          <div className="max-w-4xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 rounded-[2.5rem] blur opacity-0 group-focus-within:opacity-100 transition duration-1000 group-focus-within:duration-200"></div>
              
              <div className="relative bg-[#111111] border border-white/10 rounded-[2.5rem] flex items-end p-2 min-h-[64px] shadow-2xl transition-all duration-300 focus-within:border-primary/30">
                <div className="flex items-center p-2 gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-gray-500 hover:text-primary hover:bg-white/5 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                </div>

                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={1}
                  placeholder="Escribe a JanIA (Ej: ¿Qué inmuebles tienes en Cedritos?)"
                  className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-gray-600 py-4 px-2 resize-none max-h-40 overflow-y-auto scrollbar-hide text-sm"
                />

                <div className="flex items-center p-2 gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`text-gray-500 hover:text-primary hover:bg-white/5 rounded-full ${isRecording ? 'text-red-500 animate-pulse' : ''}`}
                  >
                    <Mic className="w-5 h-5" />
                  </Button>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    size="icon"
                    className={`rounded-full w-10 h-10 transition-all ${
                      inputValue.trim() 
                        ? 'bg-primary text-black shadow-gold-sm hover:scale-105' 
                        : 'bg-white/5 text-gray-700'
                    }`}
                  >
                    {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            
            <p className="text-[9px] text-center text-gray-700 mt-4 font-black uppercase tracking-[0.3em]">
              JanIA Console 2026 — Inteligencia de Grado Militar para Negocios Inmobiliarios
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}


