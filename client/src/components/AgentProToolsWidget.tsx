import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Bot, X, Send, Sparkles, Calculator, CalendarCheck, Loader2, MessageSquare, UserCheck, Building2, CheckCircle2, FileText } from 'lucide-react';

interface AgentProToolsWidgetProps {
  agent: {
    id: number;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    customLogoUrl?: string | null;
    themeConfig?: any;
    activeTools?: any;
  };
  propertyContext?: string;
  propertyPrice?: number;
  propertyId?: number;
  showRoiCalculatorInline?: boolean;
}

export const PERSONALITY_BADGES: Record<string, { label: string; desc: string }> = {
  normal: { label: 'Normal', desc: 'Equilibrada y servicial' },
  audaz: { label: 'Audaz', desc: 'Persuasiva y enfocada en cierres' },
  profesional: { label: 'Profesional', desc: 'Ejecutiva, técnica y jurídica' },
  extrovertida: { label: 'Extrovertida', desc: 'Entusiasta, cálida y carismática' },
  seria: { label: 'Seria', desc: 'Directa a cifras y datos exactos' },
  cordial: { label: 'Cordial', desc: 'Empática, familiar y hospitalaria' },
};

export default function AgentProToolsWidget({
  agent,
  propertyContext,
  propertyPrice = 450000000,
  propertyId,
  showRoiCalculatorInline = false,
}: AgentProToolsWidgetProps) {
  const theme = (agent?.themeConfig as any) || {};
  const tools = (agent?.activeTools as any) || {};
  const aiConfig = tools.aiAgentWidget || { enabled: true };
  const roiConfig = tools.roiCalculator || { enabled: true, defaultInterestRateEA: 11.5 };

  const primaryColor = theme.primaryColor || '#0f4c81';
  const secondaryColor = theme.secondaryColor || '#0f172a';
  const agencyName = theme.agencyName || agent?.name || 'Agencia Inmobiliaria';
  const botName = aiConfig.agentName || (aiConfig.gender === 'male' ? 'Mateo IA' : 'Sofía IA');
  const personalityKey = aiConfig.personality || 'profesional';

  const [isOpen, setIsOpen] = useState(false);
  const [inputMsg, setInputMsg] = useState('');
  const [showVisitorForm, setShowVisitorForm] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [statusAnnouncement, setStatusAnnouncement] = useState('');

  type ChatBubble = {
    role: 'user' | 'assistant';
    content: string;
    matchedProperties?: Array<{
      id: number;
      name: string;
      transactionType: string | null;
      priceCop: number;
      city: string | null;
      zone: string | null;
      bedrooms: number | null;
      isOwnProperty: boolean;
    }>;
    notarialSummary?: string | null;
    financialSummary?: string | null;
    leadId?: number | null;
    visitBooked?: boolean;
    appointmentCode?: string | null;
    blockedByQuota?: boolean;
  };

  const [messages, setMessages] = useState<ChatBubble[]>([
    {
      role: 'assistant',
      content:
        aiConfig.welcomeMessage ||
        `¡Hola! Soy ${botName}, tu asistente de inteligencia artificial en ${agencyName}. ¿En qué te puedo colaborar hoy sobre nuestros inmuebles, cálculos notariales o agendamiento de visitas?`,
    },
  ]);

  // Estado para el Simulador Hipotecario & ROI
  const [downPaymentPct, setDownPaymentPct] = useState(30);
  const [years, setYears] = useState(20);
  const [interestRateEA, setInterestRateEA] = useState(Number(roiConfig.defaultInterestRateEA || 11.5));

  const chatMutation = trpc.agent.chatWithCustomAgent.useMutation({
    onSuccess: (data: any) => {
      const bubble: ChatBubble = {
        role: 'assistant',
        content: data.reply,
        matchedProperties: Array.isArray(data.matchedProperties) ? data.matchedProperties : [],
        notarialSummary: data.notarialSummary ?? null,
        financialSummary: data.financialSummary ?? null,
        leadId: data.leadId ?? null,
        visitBooked: Boolean(data.visitBooked),
        appointmentCode: data.appointmentCode ?? null,
        blockedByQuota: Boolean(data.blockedByQuota),
      };
      setMessages((prev) => [...prev, bubble]);
      setStatusAnnouncement(`${data.botName || botName} respondió a tu consulta.`);
    },
    onError: () => {
      const fallback = `Con gusto te atendemos de inmediato en nuestro WhatsApp directo ${theme.contactPhone || agent?.phone || '+57 316 6569719'}.`;
      setMessages((prev) => [...prev, { role: 'assistant', content: fallback }]);
      setStatusAnnouncement('Respuesta de respaldo enviada por el asistente.');
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || chatMutation.isPending) return;
    const text = inputMsg.trim();
    const nextHistory = [...messages, { role: 'user' as const, content: text }];
    setMessages(nextHistory);
    setInputMsg('');
    setStatusAnnouncement(`${botName} está consultando el inventario...`);
    chatMutation.mutate({
      agentUserId: agent.id,
      message: text,
      propertyContext,
      propertyId,
      visitorName: visitorName.trim() || undefined,
      visitorEmail: visitorEmail.trim() || undefined,
      visitorPhone: visitorPhone.trim() || undefined,
      history: nextHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    });
  };

  // Cálculo financiero hipotecario colombiano
  const loanAmount = Math.max(0, propertyPrice * (1 - downPaymentPct / 100));
  const monthlyRate = Math.pow(1 + interestRateEA / 100, 1 / 12) - 1;
  const totalMonths = years * 12;
  const monthlyInstallment =
    monthlyRate > 0 && totalMonths > 0
      ? (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalMonths))
      : loanAmount / (totalMonths || 1);
  const estimatedMonthlyRent = propertyPrice * 0.0058; // ~0.58% mensual promedio

  return (
    <>
      {/* 1. Simulador Hipotecario & Rentabilidad ROI (Si se solicita en línea) */}
      {showRoiCalculatorInline && roiConfig.enabled !== false && (
        <div
          className="rounded-3xl p-6 sm:p-8 border shadow-2xl bg-zinc-900/90 text-white space-y-6 my-8"
          style={{ borderColor: `${primaryColor}55` }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-wider">
                  Simulador Financiero & ROI — {agencyName}
                </h3>
                <p className="text-xs text-zinc-400">
                  Proyección de crédito hipotecario y renta estimada para este activo
                </p>
              </div>
            </div>
            <span
              className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Herramienta Pro Activa
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-6 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between font-bold">
                <span className="text-zinc-400">Cuota Inicial ({downPaymentPct}%)</span>
                <span className="text-white">${Math.round((propertyPrice * downPaymentPct) / 100).toLocaleString('es-CO')}</span>
              </div>
              <input
                type="range"
                min={20}
                max={80}
                step={5}
                value={downPaymentPct}
                onChange={(e) => setDownPaymentPct(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between font-bold">
                <span className="text-zinc-400">Plazo del Crédito</span>
                <span className="text-white">{years} años ({totalMonths} meses)</span>
              </div>
              <input
                type="range"
                min={5}
                max={30}
                step={5}
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between font-bold">
                <span className="text-zinc-400">Tasa Efectiva Anual (E.A.)</span>
                <span className="text-white">{interestRateEA}% E.A.</span>
              </div>
              <input
                type="range"
                min={8}
                max={18}
                step={0.5}
                value={interestRateEA}
                onChange={(e) => setInterestRateEA(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Monto a Financiar</span>
              <span className="text-xl font-black text-white">
                ${Math.round(loanAmount).toLocaleString('es-CO')} COP
              </span>
            </div>
            <div
              className="p-4 rounded-2xl border"
              style={{ backgroundColor: `${primaryColor}20`, borderColor: `${primaryColor}60` }}
            >
              <span className="text-[10px] uppercase font-bold text-zinc-300 block">Cuota Mensual Estimada</span>
              <span className="text-xl font-black text-white">
                ${Math.round(monthlyInstallment).toLocaleString('es-CO')} / mes
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Canon Renta Estimado (~0.58%)</span>
              <span className="text-xl font-black text-emerald-400">
                ${Math.round(estimatedMonthlyRent).toLocaleString('es-CO')} / mes
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Widget Flotante del Agente IA Personalizable del Suscriptor */}
      {aiConfig.enabled !== false && (
        <div className="fixed bottom-24 right-6 z-50 print:hidden">
          {!isOpen ? (
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-3 px-4 py-3 rounded-full text-white shadow-2xl hover:scale-105 transition-all cursor-pointer border border-white/20"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
              }}
            >
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center overflow-hidden border border-white/30">
                {aiConfig.avatarUrl ? (
                  <img src={aiConfig.avatarUrl} alt={botName} className="w-full h-full object-cover" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="text-left pr-1">
                <span className="text-xs font-black block leading-tight">{botName}</span>
                <span className="text-[10px] text-white/80 block">
                  {aiConfig.gender === 'male' ? 'Asesor IA' : 'Asesora IA'} • {PERSONALITY_BADGES[personalityKey]?.label || 'Ejecutiva'}
                </span>
              </div>
            </button>
          ) : (
            <div className="w-[350px] sm:w-[390px] bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in">
              {/* Header del Agente IA */}
              <div
                className="p-4 text-white flex items-center justify-between"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border border-white/30">
                    {aiConfig.avatarUrl ? (
                      <img src={aiConfig.avatarUrl} alt={botName} className="w-full h-full object-cover" />
                    ) : (
                      <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-black">{botName}</h4>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-black/30 font-bold uppercase">
                        {PERSONALITY_BADGES[personalityKey]?.label || 'IA'}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/80 truncate max-w-[200px]">{agencyName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Región viva accesible */}
              <div role="status" aria-live="polite" className="sr-only">
                {statusAnnouncement}
              </div>

              {/* Mensajes */}
              <div className="p-4 h-72 overflow-y-auto space-y-3 bg-zinc-950 text-xs">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed space-y-2 ${
                        m.role === 'user'
                          ? 'text-white font-medium'
                          : 'bg-zinc-900 text-zinc-200 border border-white/10'
                      }`}
                      style={m.role === 'user' ? { backgroundColor: primaryColor } : undefined}
                    >
                      <p>{m.content}</p>

                      {m.role === 'assistant' && m.matchedProperties && m.matchedProperties.length > 0 && (
                        <div className="pt-1.5 border-t border-white/10 space-y-1.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> Inmuebles encontrados ({m.matchedProperties.length})
                          </div>
                          {m.matchedProperties.slice(0, 3).map((p) => (
                            <a
                              key={p.id}
                              href={`/propiedad/${p.id}`}
                              className="block p-2 rounded-lg bg-black/40 border border-white/10 hover:border-amber-400/40 transition-colors"
                            >
                              <div className="font-bold text-[11px] text-white truncate">{p.name}</div>
                              <div className="text-[10px] text-zinc-400 flex items-center justify-between gap-2">
                                <span>{p.zone || p.city || 'Colombia'}</span>
                                <span className="text-amber-300 font-semibold">
                                  ${Math.round(p.priceCop || 0).toLocaleString('es-CO')}
                                </span>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}

                      {m.role === 'assistant' && (m.notarialSummary || m.financialSummary) && (
                        <div className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 flex items-start gap-1.5">
                          <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{m.notarialSummary || m.financialSummary}</span>
                        </div>
                      )}

                      {m.role === 'assistant' && (m.visitBooked || m.leadId) && (
                        <div className="text-[10px] text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>
                            {m.visitBooked && m.appointmentCode
                              ? `Visita pre-agendada (${m.appointmentCode})`
                              : `Contacto registrado en CRM (#${m.leadId})`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-900 text-zinc-400 border border-white/10 rounded-2xl px-3.5 py-2 flex items-center gap-2 text-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{botName} está escribiendo...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Panel opcional datos de contacto para agendar visita desde el chat */}
              {showVisitorForm && (
                <div className="px-3 py-2.5 bg-zinc-900/95 border-t border-white/10 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">Tus datos para visitas / cotizaciones</span>
                    <button
                      type="button"
                      onClick={() => setShowVisitorForm(false)}
                      className="text-zinc-400 hover:text-white text-[10px]"
                    >
                      Ocultar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    <div>
                      <label htmlFor={`widget-name-${agent.id}`} className="sr-only">Tu nombre</label>
                      <input
                        id={`widget-name-${agent.id}`}
                        type="text"
                        autoComplete="name"
                        value={visitorName}
                        onChange={(e) => setVisitorName(e.target.value)}
                        placeholder="Tu nombre completo"
                        className="w-full bg-black border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label htmlFor={`widget-phone-${agent.id}`} className="sr-only">Tu WhatsApp</label>
                        <input
                          id={`widget-phone-${agent.id}`}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={visitorPhone}
                          onChange={(e) => setVisitorPhone(e.target.value)}
                          placeholder="WhatsApp (ej. 316...)"
                          className="w-full bg-black border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label htmlFor={`widget-email-${agent.id}`} className="sr-only">Tu correo</label>
                        <input
                          id={`widget-email-${agent.id}`}
                          type="email"
                          autoComplete="email"
                          value={visitorEmail}
                          onChange={(e) => setVisitorEmail(e.target.value)}
                          placeholder="tu@correo.com"
                          className="w-full bg-black border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Botón rápido a Vecy Agenda Pro del Suscriptor y datos de visita */}
              <div className="px-3 py-2 bg-zinc-900/90 border-t border-white/5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowVisitorForm((v) => !v)}
                  className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-bold text-zinc-200 border border-white/10"
                >
                  {visitorPhone || visitorEmail ? 'Datos listos ✓' : 'Mis datos'}
                </button>
                <a
                  href={propertyId ? `/agenda/${propertyId}?agentId=${agent.id}` : `/agenda?agentId=${agent.id}`}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-bold text-amber-400 flex items-center justify-center gap-1.5 border border-amber-500/20"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Agenda Pro</span>
                </a>
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="p-3 bg-zinc-900 border-t border-white/10 flex items-center gap-2">
                <label htmlFor={`widget-msg-${agent.id}`} className="sr-only">Mensaje para {botName}</label>
                <input
                  id={`widget-msg-${agent.id}`}
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing) return;
                  }}
                  placeholder={`Pregúntale a ${botName} o agenda visita...`}
                  className="flex-1 bg-black border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-white/40"
                />
                <button
                  type="submit"
                  disabled={chatMutation.isPending || !inputMsg.trim()}
                  className="p-2.5 rounded-xl text-white disabled:opacity-40 cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                  aria-label="Enviar mensaje"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
}

