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
  Users,
  LogOut,
  Sliders,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/_core/hooks/useAuth';

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
    { text: "Pensando", detail: "Orquestando JanIA v2.5 (Gemini Engine)...", icon: Brain, color: "text-[#bf953f]" },
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

// ─── BRAND SPARKLE COMPONENT ──────────────────────────────────────────────────
function VecySparkle() {
  return (
    <svg className="w-5 h-5 text-primary filter drop-shadow-[0_0_8px_rgba(191,149,63,0.5)] animate-pulse shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" fill="currentColor"/>
    </svg>
  );
}

export default function JanIAConsole() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('pro'); // 'pro' | 'flash'
  const [sessionId, setSessionId] = useState(() => `session-${Date.now()}-${Math.random()}`);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const playMessageVoice = (msgId: string, text: string) => {
    if (playingId === msgId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const cleanText = text
      .replace(/[*#_`~\[\]]/g, "")
      .replace(/[\u{1F300}-\u{1FAD6}]/gu, "")
      .trim();

    const audioUrl = `/api/jania/tts?text=${encodeURIComponent(cleanText)}`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingId(msgId);
    
    audio.play().catch(err => {
      console.error("Error playing audio:", err);
      setPlayingId(null);
    });

    audio.onended = () => {
      setPlayingId(null);
    };
  };

  // ── VOICE NOTE RECORDING ────────────────────────────────────────────────────
  const handleStartVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach(t => t.stop());
        await handleVoiceNoteUpload(audioBlob);
      };

      mediaRecorder.start(250); // collect data every 250ms
      setIsVoiceRecording(true);
    } catch (err) {
      console.error('Mic error:', err);
      alert('No se pudo acceder al micrófono. Verifica los permisos de tu navegador.');
    }
  };

  const handleStopVoiceRecording = () => {
    if (mediaRecorderRef.current && isVoiceRecording) {
      mediaRecorderRef.current.stop();
      setIsVoiceRecording(false);
    }
  };

  const handleVoiceNoteUpload = async (audioBlob: Blob) => {
    setIsLoading(true);
    const userMsgId = `msg-${Date.now()}`;
    try {
      // Show placeholder while transcribing
      const placeholderMsg: Message = {
        id: userMsgId,
        role: 'user',
        content: '🎤 Transcribiendo nota de voz...',
        messageType: 'audio',
        timestamp: new Date(),
      };
      setMessages((prev: Message[]) => [...prev, placeholderMsg]);

      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-note.webm');
      formData.append('sessionId', sessionId);

      const transcribeRes = await fetch('/api/janIA/transcribe', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const transcribeData = await transcribeRes.json();
      const transcribedText = transcribeData.transcription?.trim() || '[Nota de voz]';

      // Update placeholder with actual transcription
      setMessages((prev: Message[]) =>
        prev.map(m => m.id === userMsgId
          ? { ...m, content: `🎤 ${transcribedText}` }
          : m
        )
      );

      const response = await chatMutation.mutateAsync({ sessionId, message: transcribedText });

      const janIAMsgId = `msg-${Date.now()}`;
      const janIAMessage: Message = {
        id: janIAMsgId,
        role: 'janIA',
        content: response.content,
        messageType: 'text',
        timestamp: new Date(),
      };
      setMessages((prev: Message[]) => [...prev, janIAMessage]);

      // User sent voice → JanIA always responds with voice (conversational mode)
      const textToSpeak = (response as any).voiceResponse || response.content;
      playMessageVoice(janIAMsgId, textToSpeak);

      if (isAuthenticated) refetchConversations();
    } catch (err) {
      console.error('Voice note error:', err);
      setMessages((prev: Message[]) => [
        ...prev.filter(m => m.id !== userMsgId),
        { id: `msg-${Date.now()}`, role: 'janIA', content: '🎤 No pude procesar el audio. Intenta de nuevo.', messageType: 'text', timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  // ────────────────────────────────────────────────────────────────────────────

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries & Mutations
  const chatMutation = trpc.janIA.chat.useMutation();
  const analyzeFileMutation = trpc.janIA.analyzeFile.useMutation();
  
  const { data: conversationsData, refetch: refetchConversations } = trpc.janIA.getUserConversations.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: historyMessages } = trpc.janIA.getConversationMessages.useQuery(
    { sessionId },
    {
      enabled: !!sessionId && isAuthenticated,
    }
  );

  const deleteConversationMutation = trpc.janIA.deleteConversation.useMutation({
    onSuccess: () => {
      refetchConversations();
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync historical messages
  useEffect(() => {
    if (historyMessages && historyMessages.length > 0) {
      const mapped: Message[] = historyMessages.map((m: any) => ({
        id: `msg-${m.id}`,
        role: m.role as 'user' | 'janIA',
        content: m.content,
        messageType: m.messageType as any,
        timestamp: new Date(m.createdAt),
      }));
      setMessages(mapped);
    } else if (historyMessages && historyMessages.length === 0) {
      setMessages([]);
    }
  }, [historyMessages]);

  const handleNewChat = () => {
    setSessionId(`session-${Date.now()}-${Math.random()}`);
    setMessages([]);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, targetSessionId: string) => {
    e.stopPropagation();
    try {
      await deleteConversationMutation.mutateAsync({ sessionId: targetSessionId });
      if (sessionId === targetSessionId) {
        handleNewChat();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

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

      const textContent = response?.content || (response as any)?.response || "¡Hola! ¿En qué puedo ayudarte hoy?";
      const janIAMsgId = `msg-${Date.now()}`;
      const janIAMessage: Message = {
        id: janIAMsgId,
        role: 'janIA',
        content: textContent,
        messageType: 'text',
        timestamp: new Date(),
      };

      setMessages((prev: Message[]) => [...prev, janIAMessage]);

      // Auto-play JanIA voice when the LLM signals it wants audio
      if ((response as any)?.wantsVoice) {
        try {
          const textToSpeak = (response as any).voiceResponse || textContent;
          playMessageVoice(janIAMsgId, textToSpeak);
        } catch (vErr) {
          console.warn("Voice playback notice:", vErr);
        }
      }

      // Refresh sidebar list if user is logged in
      if (isAuthenticated && refetchConversations) {
        try {
          refetchConversations();
        } catch (rErr) {
          console.warn("Refetch notice:", rErr);
        }
      }
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
      
      if (isAuthenticated) {
        refetchConversations();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Browser-native speech recognition dictation
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta el reconocimiento de voz. Te recomendamos usar Google Chrome.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CO';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setInputValue((prev) => prev + (prev ? ' ' : '') + speechToText);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const renderMessageContent = (content: string) => {
    if (!content) return null;
    const unifiedContent = content.replace(/\*\*/g, '*');
    const parts = unifiedContent.split(/(\*[^*\n]+?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <strong key={index} className="font-bold text-accent">
            {part.slice(1, -1)}
          </strong>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Check if chat history is empty
  const isChatEmpty = messages.length === 0;

  // Custom User/Profile popover menu
  const renderProfilePopover = () => {
    if (!isProfileMenuOpen) return null;
    return (
      <>
        <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
        <div 
          className={`absolute z-50 bg-[#0e0e0e] border border-white/10 rounded-2xl p-2 w-64 shadow-2xl space-y-1 transition-all ${
            isSidebarOpen ? 'bottom-16 left-4' : 'bottom-16 left-12'
          }`}
        >
          <div className="px-3 py-2 border-b border-white/5">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-sans">Menú JanIA</p>
          </div>
          
          <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 text-xs text-zinc-300 flex items-center gap-3 transition-colors">
            <History className="w-4 h-4 text-primary/70" />
            <span>Actividad</span>
          </button>
          
          <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 text-xs text-zinc-300 flex items-center gap-3 transition-colors">
            <Brain className="w-4 h-4 text-primary/70" />
            <span>Inteligencia personalizada</span>
          </button>

          <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 text-xs text-zinc-300 flex items-center gap-3 transition-colors">
            <Cpu className="w-4 h-4 text-primary/70" />
            <span>Límites de uso</span>
          </button>

          <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 text-xs text-zinc-300 flex items-center gap-3 transition-colors">
            <Sparkles className="w-4 h-4 text-primary/70" />
            <span>Actualizar a JanIA Ultra</span>
          </button>
          
          <div className="border-t border-white/5 my-1" />

          <button 
            onClick={() => {
              if (isAuthenticated) {
                logout();
              } else {
                window.location.href = '/login';
              }
              setIsProfileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 text-xs text-red-400 flex items-center gap-3 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{isAuthenticated ? "Cerrar sesión" : "Iniciar sesión"}</span>
          </button>
          
          <div className="border-t border-white/5 my-1" />
          
          <div className="px-3 py-1.5 text-[10px] text-zinc-500 leading-tight">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
            Bogotá, Colombia <br />
            <span className="text-[9px] text-zinc-600 block mt-0.5">Según tu dirección IP</span>
          </div>
        </div>
      </>
    );
  };

  // Render Pill-shaped Input Bar
  const renderInputPill = (isLanding: boolean) => {
    return (
      <div className={`relative w-full group ${isLanding ? 'mt-8' : ''}`}>
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#bf953f]/10 via-primary/20 to-[#bf953f]/10 rounded-[2rem] blur opacity-0 group-focus-within:opacity-100 transition duration-300"></div>
        
        <div className="relative bg-[#0e0e0e] border border-white/10 rounded-[2rem] flex flex-col p-2 min-h-[64px] shadow-2xl transition-all duration-300 focus-within:border-primary/40">
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
            placeholder="Pregúntale a JanIA..."
            className="w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-zinc-500 py-3 px-4 resize-none max-h-40 overflow-y-auto scrollbar-hide text-sm focus:outline-none"
          />
          
          <div className="flex items-center justify-between px-3 pb-1 pt-2 border-t border-white/5">
            {/* Left Tools */}
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-zinc-400 hover:text-primary hover:bg-white/5 rounded-full w-9 h-9"
                onClick={() => fileInputRef.current?.click()}
                title="Subir archivo"
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
            
            {/* Right Tools */}
            <div className="flex items-center gap-3">
              {/* Active IA Model Badge */}
              <div className="bg-[#bf953f]/10 border border-[#bf953f]/30 text-primary text-[10px] uppercase font-bold tracking-wider rounded-full py-1.5 px-3.5 select-none font-sans">
                JanIA Pro (Gold)
              </div>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={isVoiceRecording ? handleStopVoiceRecording : handleStartVoiceRecording}
                className={`text-zinc-400 hover:text-primary hover:bg-white/5 rounded-full w-9 h-9 transition-all ${
                  isVoiceRecording ? 'text-red-500 animate-pulse bg-red-500/10 scale-110' : ''
                }`}
                title={isVoiceRecording ? '⏹ Detener y enviar nota de voz' : '🎤 Enviar nota de voz'}
              >
                <Mic className="w-5 h-5" />
              </Button>
              
              <Button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="icon"
                className={`rounded-full w-9 h-9 transition-all flex items-center justify-center ${
                  inputValue.trim() 
                    ? 'bg-primary text-black shadow-gold-sm hover:scale-105' 
                    : 'bg-white/5 text-zinc-600 cursor-not-allowed'
                }`}
              >
                {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#050505] text-foreground selection:bg-primary/30 overflow-hidden font-sans">
      {/* Backdrop for mobile when sidebar is open */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Collapsible Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : (isMobile ? 0 : 64) }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={`bg-[#0a0a0a] border-r border-white/5 flex flex-col z-30 h-full overflow-hidden ${
          isMobile ? 'fixed left-0 top-0 shadow-2xl' : 'relative'
        }`}
      >
        {/* Top brand area */}
        {isSidebarOpen ? (
          <div className="flex items-center justify-between p-4 h-16 border-b border-white/5">
            <div className="flex items-center gap-3">
              <VecySparkle />
              <span className="font-sans font-black text-transparent bg-clip-text bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#bf953f] tracking-[0.15em] text-sm uppercase">Vecy IA</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-full shrink-0">
              <PanelLeftClose className="w-5 h-5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center p-4 h-16 border-b border-white/5">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="w-8 h-8 flex items-center justify-center hover:opacity-80 active:scale-95 transition-all duration-200 focus:outline-none"
              title="Abrir barra lateral"
            >
              <img src="/logo-vecy.png" className="w-full h-full object-contain filter drop-shadow-[0_0_6px_rgba(191,149,63,0.4)]" alt="Vecy" />
            </button>
          </div>
        )}

        {/* New Chat Button */}
        {isSidebarOpen ? (
          <div className="p-4 shrink-0">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-full py-6 px-4 border border-white/10"
              onClick={handleNewChat}
            >
              <Plus className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Nuevo chat</span>
            </Button>
          </div>
        ) : (
          <div className="p-4 flex justify-center shrink-0">
            <Button 
              variant="ghost" 
              size="icon"
              className="bg-white/5 hover:bg-white/10 text-gray-300 rounded-full w-10 h-10 border border-white/10 flex items-center justify-center"
              onClick={handleNewChat}
              title="Nuevo chat"
            >
              <Plus className="w-5 h-5 text-primary" />
            </Button>
          </div>
        )}

        {/* Search & Library Icons */}
        {isSidebarOpen ? (
          <div className="px-4 space-y-1 shrink-0">
            <button className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-xs text-zinc-400 flex items-center gap-4 transition-all">
              <Search className="w-4 h-4 text-zinc-500" />
              <span>Buscar chats</span>
            </button>
            <button className="w-full text-left p-3 rounded-xl hover:bg-white/5 text-xs text-zinc-400 flex items-center gap-4 transition-all">
              <History className="w-4 h-4 text-zinc-500" />
              <span>Biblioteca</span>
            </button>
          </div>
        ) : (
          <div className="px-4 py-2 space-y-3 flex flex-col items-center shrink-0">
            <button className="p-2.5 rounded-full hover:bg-white/5 text-zinc-400 transition-all" title="Buscar chats">
              <Search className="w-4 h-4" />
            </button>
            <button className="p-2.5 rounded-full hover:bg-white/5 text-zinc-400 transition-all" title="Biblioteca">
              <History className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Recent Conversations */}
        {isSidebarOpen ? (
          <div className="flex-1 px-4 py-4 overflow-y-auto scrollbar-hide space-y-2">
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] px-2 mb-2">Recientes</p>
            
            {!isAuthenticated ? (
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-center space-y-3">
                <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                  Inicia sesión o regístrate para conservar tu historial de chat.
                </p>
                <Button 
                  size="sm" 
                  className="w-full text-[10px] uppercase font-bold py-1 bg-primary text-black rounded-full hover:scale-105 transition-transform"
                  onClick={() => navigate('/login')}
                >
                  Registrarse
                </Button>
              </div>
            ) : conversationsData && conversationsData.length > 0 ? (
              <div className="space-y-1">
                {conversationsData.map((conv: any) => {
                  const isActive = sessionId === conv.sessionId;
                  return (
                    <div 
                      key={conv.id} 
                      onClick={() => setSessionId(conv.sessionId)}
                      className={`w-full group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                        isActive ? 'bg-white/10 text-white font-medium' : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate flex-1">
                        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-zinc-500'}`} />
                        <span className="text-xs truncate">{conv.lastMessage || 'Conversación sin título'}</span>
                      </div>
                      
                      <button 
                        onClick={(e) => handleDeleteConversation(e, conv.sessionId)}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 transition-opacity shrink-0"
                        title="Eliminar chat"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic px-2">No hay chats recientes.</p>
            )}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Bottom Profile info */}
        {isSidebarOpen ? (
          <div className="p-4 border-t border-white/5 space-y-1 relative shrink-0">
            <div 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/5 transition-colors cursor-pointer text-left w-full justify-between"
            >
              <div className="flex items-center gap-3 truncate">
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-primary/20 shrink-0 bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'V'}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-zinc-200 truncate leading-none">
                    {user?.name || "Vecy Bienes Raíces"}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate mt-1">
                    {user?.role === 'admin' ? 'Administrador' : user?.role === 'agent' ? 'Agente Pro' : 'Invitado'}
                  </p>
                </div>
              </div>
              <Settings className="w-4 h-4 text-zinc-500 shrink-0 hover:text-zinc-300" />
            </div>
            {renderProfilePopover()}
          </div>
        ) : (
          <div className="p-4 border-t border-white/5 flex flex-col items-center gap-4 relative shrink-0">
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-8 h-8 rounded-full overflow-hidden border border-primary/20 bg-primary/10 flex items-center justify-center font-bold text-primary text-xs shrink-0 cursor-pointer"
              title={user?.name || "Vecy Bienes Raíces"}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'V'}
            </button>
            {renderProfilePopover()}
          </div>
        )}
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full bg-[#050505] overflow-hidden">
        {/* Mobile Sidebar Toggle */}
        {isMobile && !isSidebarOpen && (
          <div className="absolute top-4 left-4 z-20">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSidebarOpen(true)} 
              className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-full w-9 h-9 flex items-center justify-center border border-white/10 bg-black/40 backdrop-blur-md"
              title="Abrir menú"
            >
              <PanelLeft className="w-5 h-5 text-primary" />
            </Button>
          </div>
        )}

        {/* Floating exit control at top right */}
        <div className="absolute top-4 right-6 z-20 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')} 
            className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-full w-9 h-9 flex items-center justify-center"
            title="Cerrar Consola"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {isChatEmpty ? (
          /* Empty/Landing Layout style Gemini */
          <div className="flex-1 flex flex-col justify-center items-center px-4 relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <div 
                className="w-[850px] h-[320px] rounded-[50%] opacity-85 blur-[80px] animate-pulse duration-[6s]" 
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(252, 246, 186, 0.25) 0%, rgba(191, 149, 63, 0.12) 50%, transparent 70%)'
                }}
              />
            </div>

            <div className="w-full max-w-2xl text-center space-y-8 z-10">
              <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white/90 font-sans leading-tight">
                Manos a la obra, <span className="bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#bf953f] bg-clip-text text-transparent font-bold">
                  {user?.name ? user.name.split(' ')[0] : 'Vecy'}
                </span>
              </h1>
              
              <div className="w-full">
                {renderInputPill(true)}
              </div>
            </div>
          </div>
        ) : (
          /* Chatting/Conversational Layout */
          <div className="flex-1 flex flex-col h-full relative overflow-hidden">
            {/* Conversations list container */}
            <div className="flex-1 overflow-y-auto scrollbar-hide pt-16 pb-32">
              <div className="max-w-3xl mx-auto px-6 space-y-8">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-6 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'janIA' && (
                        <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border border-primary/30 bg-black mt-1">
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
                        <div className="flex items-center gap-3 mt-1">
                          <p className={`text-[9px] font-black uppercase tracking-widest opacity-30 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                            {message.timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {message.role === 'janIA' && (
                            <button
                              onClick={() => playMessageVoice(message.id, message.content)}
                              className="text-zinc-500 hover:text-primary transition-colors p-1 rounded-full hover:bg-white/5 flex items-center justify-center"
                              title="Escuchar respuesta"
                            >
                              <Volume2 className={`w-3.5 h-3.5 ${playingId === message.id ? 'text-primary animate-pulse' : ''}`} />
                            </button>
                          )}
                        </div>
                      </div>

                      {message.role === 'user' && (
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mt-1 border border-white/10 font-bold text-zinc-300">
                          {user?.name ? user.name.charAt(0).toUpperCase() : 'V'}
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

            {/* Bottom floating input pill */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent">
              <div className="max-w-3xl mx-auto">
                {renderInputPill(false)}
                <p className="text-[9px] text-center text-zinc-700 mt-4 font-black uppercase tracking-[0.3em] font-sans">
                  JanIA Console 2026 — Inteligencia Neuronal para Bienes Raíces
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
