import React, { useState } from 'react';
import { MessageSquare, Clock, User, TrendingUp, Search, Eye, Loader2, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';

export default function AdminConversations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Fetch real-time conversations from database
  const { data: conversations = [], isLoading: loadingConvs, refetch: refetchConvs } = trpc.janIA.getAllConversations.useQuery();

  // Fetch selected conversation messages
  const { data: messages = [], isLoading: loadingMessages, refetch: refetchMessages } = trpc.janIA.getConversationMessages.useQuery(
    { sessionId: selectedSessionId || '' },
    { enabled: !!selectedSessionId }
  );

  const filteredConversations = conversations.filter(c =>
    (c.sessionId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.lastMessage || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedData = conversations.find(c => c.sessionId === selectedSessionId);

  // Helper to format timestamps nicely
  const formatDate = (dateStr: any) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Detect conversation source (WhatsApp vs Web)
  const getSourceBadge = (sessionId: string) => {
    if (!sessionId) return null;
    if (sessionId.includes('@')) {
      // WhatsApp JID formatting
      const cleanPhone = sessionId.split('@')[0];
      return (
        <div className="flex flex-col gap-1 items-start">
          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase tracking-wider">
            WhatsApp
          </span>
          <span className="text-[11px] font-mono text-zinc-400 font-semibold">+{cleanPhone}</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1 items-start">
        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-950 text-blue-400 border border-blue-800 uppercase tracking-wider">
          Web Chat
        </span>
        <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[130px]">{sessionId.substring(0, 16)}...</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Monitoreo de Conversaciones</h2>
          <p className="text-zinc-500">Conversaciones totales activas: {conversations.length}</p>
        </div>
        <Button 
          onClick={() => { refetchConvs(); if (selectedSessionId) refetchMessages(); }}
          variant="outline" 
          className="border-white/10 text-white hover:bg-white/5 gap-2"
          disabled={loadingConvs || loadingMessages}
        >
          <RefreshCw className={`w-4 h-4 ${(loadingConvs || loadingMessages) ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
        <Input
          placeholder="Buscar por número, ID de sesión o mensaje..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-black border-white/10 text-white placeholder:text-zinc-600 focus:border-primary/50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1 bg-gradient-to-br from-black/20 to-black border border-white/10 rounded-xl overflow-hidden flex flex-col h-[550px]">
          <div className="p-4 border-b border-white/10 bg-zinc-950/40">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Chats Recientes</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {loadingConvs ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs">Cargando conversaciones...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-600 text-xs py-10">
                Ninguna conversación encontrada.
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedSessionId(conversation.sessionId)}
                  className={`w-full p-4 text-left transition flex flex-col gap-2 ${
                    selectedSessionId === conversation.sessionId
                      ? 'bg-primary/10 border-l-2 border-primary'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    {getSourceBadge(conversation.sessionId || '')}
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {formatDate(conversation.updatedAt).split(' ')[1] || ''}
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs line-clamp-2 italic bg-black/35 p-2 rounded border border-white/5 mt-1">
                    {conversation.lastMessage || 'Sin mensajes registrados.'}
                  </p>
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>Actividad: {formatDate(conversation.updatedAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversation Detail */}
        <div className="lg:col-span-2 bg-gradient-to-br from-black/20 to-black border border-white/10 rounded-xl p-6 flex flex-col h-[550px]">
          {selectedData ? (
            <div className="flex flex-col h-full justify-between">
              {/* Top info */}
              <div className="border-b border-white/10 pb-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      Sesión: {selectedData.sessionId}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Última interacción: {formatDate(selectedData.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Message History area */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <p className="text-xs">Cargando mensajes del historial...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-zinc-600 text-xs">
                    No hay mensajes en esta conversación.
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div 
                      key={msg.id || idx} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                          msg.role === 'user'
                            ? 'bg-zinc-900 text-white rounded-tr-none border border-zinc-800 shadow-md'
                            : 'bg-primary/10 text-zinc-100 rounded-tl-none border border-primary/20 shadow-md'
                        }`}
                      >
                        <span className="text-[9px] font-bold uppercase tracking-wider block text-zinc-500 mb-1">
                          {msg.role === 'user' ? 'Usuario' : 'JanIA v3.5'}
                        </span>
                        <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <span className="text-[9px] text-zinc-600 block text-right mt-1.5">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom statistics panel */}
              <div className="bg-zinc-950/40 border border-white/5 rounded-lg p-3 text-xs text-zinc-500 flex justify-between items-center">
                <span>Total de mensajes en hilo: <strong>{messages.length}</strong></span>
                <span>ID Conversación: <strong>#{selectedData.id}</strong></span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-3">
              <MessageSquare className="w-10 h-10 opacity-30 text-primary" />
              <p className="text-xs">Selecciona un chat de la lista izquierda para monitorear la conversación real con JanIA</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
