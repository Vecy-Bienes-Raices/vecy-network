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
  HelpCircle,
  Calculator,
  Play,
  Pause,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/_core/hooks/useAuth';
import { TaxCalculatorModal } from '../components/tax/TaxCalculatorModal';

interface Message {
  id: string;
  role: 'user' | 'janIA';
  content: string;
  messageType: 'text' | 'image' | 'audio' | 'file' | 'video';
  attachments?: string[];
  timestamp: Date;
}

// // ─── JANIA COMPACT NEURAL THINKING & VOICE SYNTHESIS PILL (Gemini Live / Antigravity Style) ─
function JanIARealtimeLoader() {
  const [statusIndex, setStatusIndex] = useState(0);
  const statuses = [
    { text: "JanIA está pensando...", hint: "Razonando con Gemini 2.5 Flash" },
    { text: "Analizando tu consulta...", hint: "Estructurando contexto legal y comercial" },
    { text: "Rastreando base de datos...", hint: "Consultando red nacional en PostgreSQL" },
    { text: "Buscando coincidencias y match...", hint: "Evaluando afinidad 85% - 100%" },
    { text: "Generando síntesis...", hint: "Preparando respuesta y voz femenina de estudio" }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statuses.length);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  const current = statuses[statusIndex];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -5, scale: 0.98 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex items-center gap-3.5 w-full max-w-xl py-1 my-1"
    >
      {/* Avatar Container with subtle breathing golden halo */}
      <div className="relative flex-shrink-0 w-9 h-9">
        <motion.div 
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: [0.35, 0.75, 0.35],
          }}
          transition={{ 
            duration: 2.4, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#00d2ff] blur-[3px]"
        />
        <div className="relative w-full h-full rounded-full overflow-hidden border border-[#bf953f]/50 bg-black z-10 shadow-md">
          <img src="/jania_perfil.png" className="w-full h-full object-cover" alt="JanIA" />
        </div>
      </div>

      {/* Compact Futuristic Thinking Pill */}
      <div className="relative flex items-center gap-3.5 px-4 py-2.5 rounded-2xl bg-zinc-950/85 border border-[#bf953f]/25 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md overflow-hidden">
        {/* Shimmer line across top */}
        <motion.div 
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-0 right-0 h-[1.5px] w-1/3 bg-gradient-to-r from-transparent via-[#fcf6ba] to-transparent"
        />

        {/* Animated Voice/Thinking Waveform Bars (WhatsApp & Gemini Live Style) */}
        <div className="flex items-center gap-[3px] h-4 shrink-0">
          {[0.4, 0.85, 1, 0.6, 0.95, 0.5].map((scaleFactor, i) => (
            <motion.span
              key={i}
              animate={{
                height: ["4px", `${Math.round(scaleFactor * 16)}px`, "4px"],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 0.9 + (i % 3) * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.12,
              }}
              className="w-[2.5px] rounded-full bg-gradient-to-t from-[#bf953f] to-[#fcf6ba]"
            />
          ))}
        </div>

        {/* Thinking Status Text */}
        <div className="flex flex-col min-w-[170px]">
          <span className="text-xs font-medium text-white tracking-wide flex items-center gap-1.5">
            {current.text}
          </span>
          <span className="text-[10px] text-zinc-400 font-light tracking-normal truncate">
            {current.hint}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── BRAND OFFICIAL LOGO COMPONENT (Replaces Old Sparkle Star) ────────────────
function VecySparkle() {
  return (
    <img
      src="/logo-vecy.png"
      alt="Vecy Bienes Raíces"
      className="h-10 w-10 object-contain filter drop-shadow-[0_0_10px_rgba(191,149,63,0.4)] shrink-0 transition-transform duration-300 hover:scale-105"
    />
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
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
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

    // Si es un archivo de audio (nota de voz reenviada, .ogg, .mp3, .m4a, etc.)
    if (file.type.startsWith('audio/') || file.name.toLowerCase().match(/\.(ogg|mp3|wav|m4a|aac|webm)$/i)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      await handleVoiceNoteUpload(file);
      return;
    }

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
      
      const janIAMsgId = `msg-${Date.now()}`;
      const janIAMessage: Message = {
        id: janIAMsgId,
        role: 'janIA',
        content: janIAResponse.analysis,
        messageType: 'text',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, janIAMessage]);
      
      // Auto-reproducir voz de JanIA
      try {
        playMessageVoice(janIAMsgId, janIAResponse.analysis);
      } catch (e) {
        console.warn('Voice play error:', e);
      }

      if (isAuthenticated) {
        refetchConversations();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[#bf953f] bg-[#bf953f]/10 border border-[#bf953f]/20 hover:bg-[#bf953f]/20 rounded-xl px-2.5 py-1 text-xs font-bold flex items-center gap-1.5 ml-1"
                onClick={() => setIsTaxModalOpen(true)}
                title="Calculadora Tributaria DIAN v17.6"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Calculadora DIAN</span>
              </Button>
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
              <div className="flex flex-col">
                <span className="font-['Audiowide'] text-white tracking-[0.16em] text-sm uppercase leading-none">
                  VECY
                </span>
                <span className="font-['Audiowide'] text-gradient-gold tracking-[0.14em] text-[9px] uppercase leading-tight mt-0.5">
                  BIENES RAÍCES
                </span>
              </div>
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

                          {/* 📄 TARJETA DE DOCUMENTO OFICIAL DESCARGABLE (Factura Predial / Certificados / PDF) */}
                          {message.role === 'janIA' && /(?:factura\s*predial|certificado\s*de\s*pago|descargar\s*pdf|\.pdf\b|chip\s*aaa)/i.test(message.content) && (
                            <div className="mt-4 p-3.5 rounded-2xl bg-zinc-950/80 border border-primary/30 flex items-center justify-between gap-3 shadow-lg hover:border-primary/60 transition-all">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5 text-red-400" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold text-white truncate">
                                    Documento Oficial Tributario / Predial
                                  </span>
                                  <span className="text-[10px] text-zinc-400 truncate">
                                    PDF Oficial Bogotá — Descarga directa generada por JanIA
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const urlMatch = message.content.match(/https?:\/\/[^\s)]+/);
                                  if (urlMatch) {
                                    window.open(urlMatch[0], '_blank');
                                  } else {
                                    window.open(`https://wa.me/573166569719?text=${encodeURIComponent('Hola Eduardo y Jani, solicito copia oficial en PDF del trámite consultado con JanIA en la web.')}`, '_blank');
                                  }
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#bf953f] to-[#aa771c] text-black text-xs font-bold hover:brightness-110 transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Descargar PDF</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Interactive Voice Note & Timestamp Bar */}
                        <div className="flex items-center gap-3 mt-1.5">
                          <p className={`text-[9px] font-black uppercase tracking-widest opacity-30 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                            {message.timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {message.role === 'janIA' && (
                            <button
                              onClick={() => playMessageVoice(message.id, message.content)}
                              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs transition-all ${
                                playingId === message.id
                                  ? 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_12px_rgba(191,149,63,0.3)]'
                                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5'
                              }`}
                              title={playingId === message.id ? "Pausar nota de voz" : "Escuchar nota de voz de JanIA"}
                            >
                              {playingId === message.id ? (
                                <Pause className="w-3.5 h-3.5 text-primary shrink-0" />
                              ) : (
                                <Play className="w-3.5 h-3.5 text-primary shrink-0" />
                              )}
                              <span className="text-[11px] font-medium">
                                {playingId === message.id ? "Reproduciendo..." : "Nota de voz"}
                              </span>
                              {/* WhatsApp style waveform bars */}
                              <div className="flex items-center gap-[2.5px] h-3 ml-0.5">
                                {[0.4, 0.9, 0.6, 1, 0.5, 0.85].map((factor, i) => (
                                  <span
                                    key={i}
                                    className={`w-[2px] rounded-full transition-all duration-200 ${
                                      playingId === message.id 
                                        ? 'bg-primary animate-pulse' 
                                        : 'bg-zinc-600'
                                    }`}
                                    style={{
                                      height: playingId === message.id ? `${Math.round(factor * 12)}px` : '4px',
                                      animationDelay: `${i * 120}ms`
                                    }}
                                  />
                                ))}
                              </div>
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

      {/* Tax Calculator Modal (DIAN v17.6) */}
      <TaxCalculatorModal
        isOpen={isTaxModalOpen}
        onClose={() => setIsTaxModalOpen(false)}
        onSendToChat={(summary) => setInputValue(summary)}
      />
    </div>
  );
}
