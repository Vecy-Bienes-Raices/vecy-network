import React, { useState } from 'react';
import { MessageSquare, Clock, User, TrendingUp, Search, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function AdminConversations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);

  // Mock data
  const conversations = [
    {
      id: 1,
      sessionId: 'sess_001',
      topic: 'Búsqueda de propiedad',
      messageCount: 12,
      sentiment: 'positive',
      duration: '15 min',
      lastMessage: 'Gracias por la información, me interesa la propiedad',
      timestamp: '2026-03-28 14:30',
      messages: [
        { role: 'user', content: 'Hola, busco un apartamento en Zona Rosa' },
        { role: 'janIA', content: 'Perfecto, tenemos varias opciones en Zona Rosa. ¿Cuál es tu presupuesto?' },
        { role: 'user', content: 'Entre $400,000 y $600,000' },
        { role: 'janIA', content: 'Excelente, te recomiendo estas 3 propiedades...' },
      ],
    },
    {
      id: 2,
      sessionId: 'sess_002',
      topic: 'Consulta normativa',
      messageCount: 8,
      sentiment: 'neutral',
      duration: '10 min',
      lastMessage: '¿Cuáles son los impuestos a pagar?',
      timestamp: '2026-03-28 13:15',
      messages: [
        { role: 'user', content: '¿Qué impuestos debo pagar al comprar una propiedad?' },
        { role: 'janIA', content: 'En Colombia, los impuestos principales son...' },
      ],
    },
    {
      id: 3,
      sessionId: 'sess_003',
      topic: 'Inversión inmobiliaria',
      messageCount: 20,
      sentiment: 'positive',
      duration: '25 min',
      lastMessage: 'Quiero invertir en varias propiedades',
      timestamp: '2026-03-28 11:45',
      messages: [
        { role: 'user', content: 'Estoy interesado en invertir en bienes raíces' },
        { role: 'janIA', content: 'Excelente oportunidad. ¿Cuál es tu capital disponible?' },
      ],
    },
  ];

  const filteredConversations = conversations.filter(c =>
    c.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.sessionId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedData = conversations.find(c => c.id === selectedConversation);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-900/50 text-green-300';
      case 'neutral':
        return 'bg-yellow-900/50 text-yellow-300';
      case 'negative':
        return 'bg-red-900/50 text-red-300';
      default:
        return 'bg-gray-900/50 text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Análisis de Conversaciones</h2>
          <p className="text-zinc-500">Total: {conversations.length} conversaciones</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
        <Input
          placeholder="Buscar conversaciones..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-black border-white/10 text-white"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-700/50 rounded-lg p-4">
          <p className="text-blue-300 text-sm mb-1">Conversaciones Totales</p>
          <p className="text-3xl font-bold text-blue-400">{conversations.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-900/20 to-black border border-green-700/50 rounded-lg p-4">
          <p className="text-green-300 text-sm mb-1">Sentimiento Positivo</p>
          <p className="text-3xl font-bold text-green-400">{conversations.filter(c => c.sentiment === 'positive').length}</p>
        </div>
        <div className="bg-gradient-to-br from-black/10 to-black border border-white/10 rounded-lg p-4">
          <p className="text-zinc-500 text-sm mb-1">Promedio Mensajes</p>
          <p className="text-3xl font-bold text-zinc-500">
            {Math.round(conversations.reduce((acc, c) => acc + c.messageCount, 0) / conversations.length)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1 bg-gradient-to-br from-black/10 to-black border border-white/10 rounded-lg overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
                className={`w-full p-4 border-b border-white/10 text-left transition ${
                  selectedConversation === conversation.id
                    ? 'bg-white/5'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-semibold text-sm">{conversation.topic}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getSentimentColor(conversation.sentiment)}`}>
                    {conversation.sentiment === 'positive' ? 'Positivo' : conversation.sentiment === 'neutral' ? 'Neutral' : 'Negativo'}
                  </span>
                </div>
                <p className="text-zinc-500 text-xs mb-2">{conversation.sessionId}</p>
                <div className="flex items-center gap-4 text-zinc-500 text-xs">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {conversation.messageCount}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {conversation.duration}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Detail */}
        <div className="lg:col-span-2 bg-gradient-to-br from-black/10 to-black border border-white/10 rounded-lg p-6">
          {selectedData ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">{selectedData.topic}</h3>
                <div className="flex items-center gap-4 text-sm text-zinc-500 mb-4">
                  <span>{selectedData.sessionId}</span>
                  <span>•</span>
                  <span>{selectedData.timestamp}</span>
                  <span>•</span>
                  <span className={`px-2 py-1 rounded ${getSentimentColor(selectedData.sentiment)}`}>
                    {selectedData.sentiment === 'positive' ? 'Positivo' : selectedData.sentiment === 'neutral' ? 'Neutral' : 'Negativo'}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {selectedData.messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-zinc-900 text-white'
                          : 'bg-white/5 text-zinc-500 border border-white/10'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-zinc-500 text-xs mb-1">Total Mensajes</p>
                  <p className="text-2xl font-bold text-white">{selectedData.messageCount}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs mb-1">Duración</p>
                  <p className="text-2xl font-bold text-white">{selectedData.duration}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500">
              <p>Selecciona una conversación para ver los detalles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
