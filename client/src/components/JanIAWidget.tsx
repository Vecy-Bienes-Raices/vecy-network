// @ts-nocheck
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Upload, X, MessageSquare, Volume2, Loader, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'janIA';
  content: string;
  messageType: 'text' | 'image' | 'audio' | 'file' | 'video';
  attachments?: string[];
  timestamp: Date;
}

interface JanIAWidgetProps {
  propertyId?: number;
  leadId?: number;
}

export default function JanIAWidget({ propertyId, leadId }: JanIAWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random()}`);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize conversation
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'janIA',
        content: '¡Hola! Soy JanIA, tu Consultora Senior Inmobiliaria. 🏢\n\nEstoy aquí para acompañarte a explorar nuestro portafolio de **oportunidades exclusivas**, ofrecerte nuestros análisis de mercado, o gestionar rápidamente tu agenda para visitar ese inmueble que ha capturado tu atención.\n\nPara poder brindarte un servicio de alto nivel, **¿con quién tengo el gusto de hablar y por dónde preferirías que comencemos?**',
        messageType: 'text',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen]);

  // Send text message
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
      // Call JanIA API
      const response = await trpc.janIA.chat.useMutation().mutateAsync({
        sessionId,
        message: inputValue,
        propertyId,
        leadId,
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
        content: 'Disculpa, ocurrió un error. Por favor intenta de nuevo.',
        messageType: 'text',
        timestamp: new Date(),
      };
      setMessages((prev: Message[]) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Start recording audio
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await handleAudioUpload(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('No se pudo acceder al micrófono. Por favor verifica los permisos.');
    }
  };

  // Stop recording audio
  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Handle audio upload
  const handleAudioUpload = async (audioBlob: Blob) => {
    setIsLoading(true);
    try {
      // Upload audio and transcribe
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('sessionId', sessionId);

      const response = await fetch('/api/janIA/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      // Add user message with audio
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: data.transcription || '[Audio enviado]',
        messageType: 'audio',
        attachments: [data.audioUrl],
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);

      // Get JanIA response
      const janIAResponse = await trpc.janIA.chat.useMutation().mutateAsync({
        sessionId,
        message: data.transcription || 'Audio message',
        propertyId,
        leadId,
      });

      const janIAMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'janIA',
        content: janIAResponse.content,
        messageType: 'text',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, janIAMessage]);
    } catch (error) {
      console.error('Error processing audio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);

      const response = await fetch('/api/janIA/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      // Add user message with file
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: `[Archivo: ${file.name}]`,
        messageType: file.type.startsWith('image/') ? 'image' : 'file',
        attachments: [data.fileUrl],
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);

      // Get JanIA analysis
      const janIAResponse = await trpc.janIA.analyzeFile.useMutation().mutateAsync({
        sessionId,
        fileUrl: data.fileUrl,
        fileType: file.type,
        propertyId,
        leadId,
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

  // Text to speech
  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-CO';
      window.speechSynthesis.speak(utterance);
    }
  };

  // Renderizador super ligero de Markdown para convertir **texto** en Bold
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
    <>
      {/* Floating Button (Responsivo: 64px móvil, 96px desktop) */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center z-40 glow-gold pulse-glow overflow-hidden"
          title="Chat con JanIA"
        >
          <video 
            src="/jania.mp4" 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover contrast-110 saturate-105" 
          />
        </motion.button>
      )}

      {/* Chat Widget */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-96 h-[600px] z-50 flex flex-col glass card-float rounded-2xl glow-gold-sm"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-black via-accent/20 to-black p-4 rounded-t-2xl flex items-center justify-between border-b border-accent/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden glow-gold-sm">
                  <video src="/jania.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-primary font-bold text-sm tracking-widest uppercase">JanIA</h3>
                  <p className="text-muted-foreground text-[10px] uppercase tracking-tighter">Tu Compañera Experta en IA</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-primary transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.map((message: Message, index: number) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, x: message.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-black rounded-tr-none font-medium'
                        : 'glass-light text-foreground rounded-tl-none border border-accent/10'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderMessageContent(message.content)}</p>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.attachments.map((attachment: string, idx: number) => (
                          <div key={idx} className="text-xs flex items-center gap-1 opacity-70">
                            <Upload className="w-3 h-3" />
                            <span>{attachment.split('/').pop()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className={`text-[10px] mt-2 opacity-50 ${message.role === 'user' ? 'text-black/70' : 'text-foreground/50'}`}>
                      {message.timestamp.toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="glass-light px-4 py-3 rounded-2xl rounded-tl-none border border-accent/10">
                    <div className="flex gap-1.5">
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-black/40 border-t border-accent/20 rounded-b-2xl space-y-4">
              {/* Actions */}
              <div className="flex gap-2">
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*,application/pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-accent/20 text-primary hover:bg-accent/10 h-10 rounded-xl transition-all"
                    disabled={isLoading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Archivo</span>
                  </Button>
                </label>

                {!isRecording ? (
                  <Button
                    onClick={handleStartRecording}
                    size="sm"
                    className="flex-1 btn-gold-outline h-10 rounded-xl"
                    disabled={isLoading}
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Audio</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleStopRecording}
                    size="sm"
                    className="flex-1 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 h-10 rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Detener</span>
                    </div>
                  </Button>
                )}
              </div>

              {/* Text Input */}
              <div className="relative group">
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Pregúntame lo que quieras sobre propiedades Vecy..."
                  className="w-full bg-black/60 border border-accent/20 text-foreground placeholder:text-muted-foreground/40 px-4 py-3 pr-12 rounded-xl focus:outline-none focus:border-primary/50 transition-all text-sm shadow-inner"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                    inputValue.trim() ? 'bg-primary text-black glow-gold-sm' : 'text-muted-foreground'
                  }`}
                  disabled={isLoading || !inputValue.trim()}
                >
                  {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>

              {/* Voice Feedback */}
              <button
                className="w-full py-1 text-center text-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-2"
                onClick={() => {
                  const lastMessage = messages[messages.length - 1];
                  if (lastMessage?.role === 'janIA') {
                    handleSpeak(lastMessage.content);
                  }
                }}
              >
                <Volume2 className="w-3 h-3" />
                <span className="text-[10px] uppercase font-bold tracking-tighter">Escuchar última respuesta</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
