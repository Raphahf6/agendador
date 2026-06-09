import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Bot,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  MessageSquareText,
  Power,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react';

import { apiGet, apiPost, apiPut } from '@/lib/horalisApi';
import { getErrorMessage } from '@/utils/horalisRuntime';
import { useSalon } from './PainelLayout';

const DEFAULT_SETTINGS = {
  enabled: false,
  attendant_name: 'Atendente Horalis',
  persona_summary: '',
  tone_instructions: 'Use mensagens curtas, naturais, educadas e acolhedoras. Evite parecer robotico.',
  business_rules: 'Nao confirme horarios sem consultar a agenda. Quando nao tiver certeza, encaminhe para atendimento humano.',
  opening_message: 'Oi, tudo bem? Posso te ajudar a agendar. Qual servico voce gostaria de fazer?',
  conversation_example: '',
  sample_dialogues: [],
  fallback_message: 'Vou confirmar essa informacao com a equipe e ja retorno com seguranca.',
  handoff_message: 'Vou chamar uma pessoa da equipe para continuar seu atendimento.',
  model: 'gpt-5.4-mini',
  max_output_tokens: 450,
};

const PERSONA_PRESETS = [
  {
    id: 'acolhedor',
    label: 'Acolhedor',
    persona: 'Atendente calorosa, paciente e segura. Trata o cliente pelo nome quando souber, confirma preferencias e passa tranquilidade em cada etapa.',
    tone: 'Use frases naturais, com gentileza e objetividade. Evite excesso de formalidade. Pergunte uma coisa por vez e confirme dados importantes antes de agir.',
  },
  {
    id: 'premium',
    label: 'Premium',
    persona: 'Consultora elegante e precisa. Valoriza experiencia, conforto e cuidado personalizado sem soar distante.',
    tone: 'Use linguagem refinada, curta e confiante. Evite girias. Reforce disponibilidade, profissionalismo e proximo passo com clareza.',
  },
  {
    id: 'objetivo',
    label: 'Objetivo',
    persona: 'Atendente pratica e direta. Resolve o agendamento com o menor numero de mensagens possivel mantendo educacao.',
    tone: 'Use respostas enxutas. Liste opcoes quando houver horarios. Solicite apenas o dado faltante e evite textos longos.',
  },
  {
    id: 'natural',
    label: 'Natural',
    persona: 'Atendente com conversa leve, humana e proxima. Mantem profissionalismo, mas responde como uma pessoa real da recepcao.',
    tone: 'Use linguagem simples, simpatica e natural. Pode usar pequenas expressoes de acolhimento, sem exageros e sem prometer o que nao foi consultado.',
  },
];

const TEST_SCENARIOS = [
  'Oi, quero ver horarios disponiveis para amanha.',
  'Quero confirmar um horario hoje a tarde. Meu nome e Ana e meu WhatsApp e 11999999999.',
  'Preciso marcar com um profissional especifico e pagar o sinal.',
];

const fieldClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100';
const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500';

function normalizeSettings(data = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...data };
  return {
    ...merged,
    enabled: merged.enabled === true,
    sample_dialogues: Array.isArray(merged.sample_dialogues) ? merged.sample_dialogues : [],
    max_output_tokens: Number(merged.max_output_tokens || DEFAULT_SETTINGS.max_output_tokens),
  };
}

function samplesToText(samples) {
  return Array.isArray(samples) ? samples.join('\n') : '';
}

function textToSamples(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function actionLabel(type) {
  const labels = {
    list_slots: 'Consultou horarios',
    create_booking: 'Criou agendamento',
    create_booking_with_signal: 'Criou agendamento com sinal',
    slot_unavailable: 'Horario indisponivel',
    hybrid_list_slots: 'Consultou horarios sem IA',
    handoff: 'Chamou humano',
  };
  return labels[type] || type || 'Acao';
}

function routeLabel(route) {
  if (route === 'hybrid') return 'Hibrido sem IA';
  if (route === 'openai') return 'OpenAI';
  return '';
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-cyan-600" aria-hidden="true" />
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
        <dd className="truncate text-sm font-bold text-gray-900">{value}</dd>
      </div>
    </div>
  );
}

export default function AtendimentoAgentPage() {
  const { salaoId, salonDetails } = useSalon();
  const navigate = useNavigate();
  const primaryColor = salonDetails?.cor_primaria || '#0E7490';

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [samplesText, setSamplesText] = useState('');
  const [agentContext, setAgentContext] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState('acolhedor');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [previewMessage, setPreviewMessage] = useState('Oi, gostaria de marcar uma avaliacao essa semana.');
  const [previewReply, setPreviewReply] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [previewStatus, setPreviewStatus] = useState('');
  const [previewActions, setPreviewActions] = useState([]);
  const [previewSlots, setPreviewSlots] = useState([]);
  const [previewPayment, setPreviewPayment] = useState(null);
  const [previewAppointment, setPreviewAppointment] = useState(null);
  const [previewRoute, setPreviewRoute] = useState('');
  const [previewHistory, setPreviewHistory] = useState([]);
  const [previewConversationId, setPreviewConversationId] = useState('');
  const [previewMemoryPersisted, setPreviewMemoryPersisted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAgentData() {
      if (!salaoId) return;
      setLoading(true);
      setPageError('');

      try {
        const [settingsResponse, contextResponse] = await Promise.all([
          apiGet(`/admin/agent/${salaoId}/settings`),
          apiGet(`/admin/agent/${salaoId}/context`),
        ]);
        if (cancelled) return;
        const normalized = normalizeSettings(settingsResponse.data);
        setSettings(normalized);
        setSamplesText(samplesToText(normalized.sample_dialogues));
        setAgentContext(contextResponse.data || null);
      } catch (err) {
        if (!cancelled) setPageError(getErrorMessage(err, 'Nao foi possivel carregar o agente.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAgentData();
    return () => {
      cancelled = true;
    };
  }, [salaoId]);

  useEffect(() => {
    if (!salaoId) return;
    setPreviewConversationId(window.localStorage.getItem(`horalis-agent-preview:${salaoId}`) || '');
  }, [salaoId]);

  const contextMetrics = useMemo(() => {
    const services = agentContext?.services?.length || 0;
    const professionals = agentContext?.professionals?.length || 0;
    const signal = agentContext?.clinic?.cobrar_sinal
      ? formatCurrency(agentContext.clinic.sinal_valor)
      : 'Desativado';
    const calendar = agentContext?.clinic?.google_sync_enabled ? 'Google Agenda' : 'Agenda Horalis';

    return { services, professionals, signal, calendar };
  }, [agentContext]);

  const updateField = (field, value) => {
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const applyPreset = (preset) => {
    setSelectedPreset(preset.id);
    setSettings((current) => ({
      ...current,
      persona_summary: preset.persona,
      tone_instructions: preset.tone,
    }));
  };

  const clearPreviewResult = () => {
    setPreviewError('');
    setPreviewReply('');
    setPreviewStatus('');
    setPreviewActions([]);
    setPreviewSlots([]);
    setPreviewPayment(null);
    setPreviewAppointment(null);
    setPreviewRoute('');
    setPreviewMemoryPersisted(false);
  };

  const resetPreviewConversation = () => {
    clearPreviewResult();
    setPreviewHistory([]);
    setPreviewConversationId('');
    if (salaoId) window.localStorage.removeItem(`horalis-agent-preview:${salaoId}`);
    setPreviewMessage('Oi, gostaria de marcar uma avaliacao essa semana.');
  };

  const handleSave = async () => {
    setSaving(true);
    setPageError('');

    try {
      const payload = {
        ...settings,
        sample_dialogues: textToSamples(samplesText),
        max_output_tokens: Number(settings.max_output_tokens || DEFAULT_SETTINGS.max_output_tokens),
      };
      const response = await apiPut(`/admin/agent/${salaoId}/settings`, payload);
      const normalized = normalizeSettings(response.data);
      setSettings(normalized);
      setSamplesText(samplesToText(normalized.sample_dialogues));
      toast.success('Agente salvo.');
    } catch (err) {
      const message = getErrorMessage(err, 'Falha ao salvar o agente.');
      setPageError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async (event) => {
    event.preventDefault();
    if (!previewMessage.trim()) {
      toast.error('Digite uma mensagem para testar.');
      return;
    }

    setPreviewing(true);
    clearPreviewResult();

    try {
      const messageToSend = previewMessage.trim();
      const historyBefore = previewHistory;
      const userEntry = { role: 'user', content: messageToSend };
      const response = await apiPost(`/admin/agent/${salaoId}/chat`, {
        message: messageToSend,
        history: historyBefore,
        conversation_id: previewConversationId || undefined,
        channel: 'preview',
      });
      setPreviewReply(response.data?.reply || 'Sem resposta.');
      setPreviewStatus(response.data?.status || '');
      setPreviewActions(Array.isArray(response.data?.actions) ? response.data.actions : []);
      setPreviewSlots(Array.isArray(response.data?.slots) ? response.data.slots : []);
      setPreviewPayment(response.data?.payment || null);
      setPreviewAppointment(response.data?.appointment || null);
      setPreviewRoute(response.data?.routed_by || '');
      setPreviewMemoryPersisted(response.data?.memory_persisted === true);
      if (response.data?.conversation_id) {
        setPreviewConversationId(response.data.conversation_id);
        window.localStorage.setItem(`horalis-agent-preview:${salaoId}`, response.data.conversation_id);
      }
      setPreviewHistory([
        ...historyBefore,
        userEntry,
        {
          role: 'assistant',
          content: response.data?.reply || 'Sem resposta.',
          status: response.data?.status || '',
          routed_by: response.data?.routed_by || '',
          field: response.data?.field || '',
          plan: response.data?.plan || null,
          actions: Array.isArray(response.data?.actions) ? response.data.actions : [],
          slots: Array.isArray(response.data?.slots) ? response.data.slots : [],
          appointment: response.data?.appointment || null,
          payment: response.data?.payment || null,
        },
      ]);
      setPreviewMessage('');
    } catch (err) {
      setPreviewError(getErrorMessage(err, 'Nao foi possivel testar o agente.'));
    } finally {
      setPreviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
            <Bot className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agente de Atendimento</h1>
            <p className="text-sm text-gray-500">{salonDetails?.nome_salao}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          style={{ backgroundColor: primaryColor }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </button>
      </div>

      {pageError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <p>{pageError}</p>
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={MessageSquareText} label="Servicos" value={contextMetrics.services} />
          <Metric icon={Users} label="Profissionais" value={contextMetrics.professionals} />
          <Metric icon={CreditCard} label="Sinal" value={contextMetrics.signal} />
          <Metric icon={CalendarDays} label="Agenda" value={contextMetrics.calendar} />
        </dl>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="space-y-6">
          <Section icon={Power} title="Status">
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_170px]">
              <label className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <span className="text-sm font-semibold text-gray-800">Agente ativo</span>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(event) => updateField('enabled', event.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
              </label>
              <div>
                <label className={labelClass}>Nome do atendente</label>
                <input
                  className={fieldClass}
                  value={settings.attendant_name}
                  onChange={(event) => updateField('attendant_name', event.target.value)}
                  maxLength={80}
                />
              </div>
              <div>
                <label className={labelClass}>Modelo</label>
                <select
                  className={fieldClass}
                  value={settings.model}
                  onChange={(event) => updateField('model', event.target.value)}
                >
                  <option value="gpt-5.4-mini">gpt-5.4-mini</option>
                  <option value="gpt-5.4-nano">gpt-5.4-nano</option>
                  <option value="gpt-5.5">gpt-5.5</option>
                </select>
              </div>
            </div>
          </Section>

          <Section icon={Sparkles} title="Persona">
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-4">
                {PERSONA_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      selectedPreset === preset.id
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-800'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-cyan-200'
                    }`}
                  >
                    <Wand2 className="h-4 w-4" aria-hidden="true" />
                    {preset.label}
                  </button>
                ))}
              </div>
              <div>
                <label className={labelClass}>Personalidade</label>
                <textarea
                  className={`${fieldClass} min-h-28 resize-y`}
                  value={settings.persona_summary}
                  onChange={(event) => updateField('persona_summary', event.target.value)}
                  maxLength={2000}
                />
              </div>
              <div>
                <label className={labelClass}>Tom de voz</label>
                <textarea
                  className={`${fieldClass} min-h-28 resize-y`}
                  value={settings.tone_instructions}
                  onChange={(event) => updateField('tone_instructions', event.target.value)}
                  maxLength={2000}
                />
              </div>
            </div>
          </Section>

          <Section icon={MessageSquareText} title="Fluxo">
            <div className="grid gap-4">
              <div>
                <label className={labelClass}>Mensagem inicial</label>
                <textarea
                  className={`${fieldClass} min-h-24 resize-y`}
                  value={settings.opening_message}
                  onChange={(event) => updateField('opening_message', event.target.value)}
                  maxLength={800}
                  placeholder="Oi, tudo bem? Posso te ajudar a agendar. Qual servico voce gostaria de fazer?"
                />
              </div>
              <div>
                <label className={labelClass}>Exemplo completo de atendimento</label>
                <textarea
                  className={`${fieldClass} min-h-64 resize-y font-mono text-xs leading-relaxed`}
                  value={settings.conversation_example}
                  onChange={(event) => updateField('conversation_example', event.target.value)}
                  maxLength={8000}
                  placeholder={`Atendente: Oi, tudo bem? Posso te ajudar a agendar. Qual servico voce gostaria de fazer?\nCliente: Corte de cabelo.\nAtendente: Perfeito, para corte de cabelo. Qual dia ou periodo voce prefere?\nCliente: Sexta a tarde.\nAtendente: Vou consultar a agenda e ja te passo as melhores opcoes.`}
                />
              </div>
            </div>
          </Section>

          <Section icon={ShieldCheck} title="Regras">
            <div className="grid gap-4">
              <div>
                <label className={labelClass}>Regras da clinica</label>
                <textarea
                  className={`${fieldClass} min-h-32 resize-y`}
                  value={settings.business_rules}
                  onChange={(event) => updateField('business_rules', event.target.value)}
                  maxLength={4000}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Fallback</label>
                  <textarea
                    className={`${fieldClass} min-h-24 resize-y`}
                    value={settings.fallback_message}
                    onChange={(event) => updateField('fallback_message', event.target.value)}
                    maxLength={800}
                  />
                </div>
                <div>
                  <label className={labelClass}>Handoff humano</label>
                  <textarea
                    className={`${fieldClass} min-h-24 resize-y`}
                    value={settings.handoff_message}
                    onChange={(event) => updateField('handoff_message', event.target.value)}
                    maxLength={800}
                  />
                </div>
              </div>
            </div>
          </Section>

          <Section icon={MessageSquareText} title="Frases curtas">
            <label className={labelClass}>Uma referencia por linha</label>
            <textarea
              className={`${fieldClass} min-h-40 resize-y`}
              value={samplesText}
              onChange={(event) => setSamplesText(event.target.value)}
              placeholder="Perfeito, vou consultar a agenda e ja te passo as melhores opcoes."
            />
          </Section>
        </div>

        <aside className="space-y-6">
          <Section icon={Bot} title="Teste">
            <form onSubmit={handlePreview} className="space-y-4">
              <div className="grid gap-2">
                {TEST_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario}
                    type="button"
                    onClick={() => {
                      setPreviewHistory([]);
                      setPreviewMessage(scenario);
                      clearPreviewResult();
                    }}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-700 transition hover:border-cyan-200 hover:bg-cyan-50"
                  >
                    {scenario}
                  </button>
                ))}
              </div>
              {previewHistory.length > 0 && (
                <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
                  {previewHistory.map((entry, index) => (
                    <div
                      key={`${entry.role}-${index}`}
                      className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[88%] rounded-lg px-3 py-2 text-sm ${
                        entry.role === 'user'
                          ? 'bg-gray-900 text-white'
                          : 'bg-white text-gray-800 ring-1 ring-gray-200'
                      }`}
                      >
                        <p className="whitespace-pre-wrap">{entry.content}</p>
                        {entry.role === 'assistant' && entry.routed_by && (
                          <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                            {routeLabel(entry.routed_by)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <label className={labelClass}>Mensagem do cliente</label>
                <textarea
                  className={`${fieldClass} min-h-28 resize-y`}
                  value={previewMessage}
                  onChange={(event) => setPreviewMessage(event.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={previewing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Testar atendente
              </button>
              <button
                type="button"
                onClick={resetPreviewConversation}
                className="inline-flex w-full items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
              >
                Limpar conversa
              </button>
            </form>

            {(previewReply || previewError) && (
              <div className={`mt-5 rounded-lg border p-4 text-sm ${previewError ? 'border-red-200 bg-red-50 text-red-700' : 'border-cyan-100 bg-cyan-50 text-gray-800'}`}>
                {previewError || previewReply}
              </div>
            )}

            {(previewStatus || previewActions.length > 0) && !previewError && (
              <div className="mt-4 space-y-3">
                {previewStatus && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-700">
                    <CheckCircle2 className="h-3.5 w-3.5 text-cyan-600" aria-hidden="true" />
                    {previewStatus}
                  </div>
                )}
                {previewRoute && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                    {routeLabel(previewRoute)}
                  </div>
                )}
                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-700">
                  {previewMemoryPersisted ? 'Memoria Supabase' : 'Memoria local'}
                </div>
                {previewActions.map((action, index) => (
                  <div key={`${action.type}-${index}`} className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
                    <p className="font-semibold text-gray-900">{actionLabel(action.type)}</p>
                    {Array.isArray(action.slots) && action.slots.length > 0 && (
                      <p className="mt-1 text-xs text-gray-500">{action.slots.slice(0, 4).map(formatDateTime).join(' | ')}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {previewSlots.length > 0 && !previewError && (
              <div className="mt-4">
                <label className={labelClass}>Horarios</label>
                <div className="flex flex-wrap gap-2">
                  {previewSlots.slice(0, 8).map((slot) => (
                    <span key={slot} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                      {formatDateTime(slot)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {previewPayment && !previewError && (
              <div className="mt-4 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-bold">Sinal {formatCurrency(previewPayment.amount)}</p>
                <p>Status: {previewPayment.status}</p>
                {previewPayment.qr_code && (
                  <textarea
                    readOnly
                    className="h-24 w-full resize-none rounded-lg border border-emerald-200 bg-white p-2 text-xs text-gray-700 outline-none"
                    value={previewPayment.qr_code}
                  />
                )}
              </div>
            )}

            {previewAppointment && !previewError && (
              <div className="mt-4 space-y-3 rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
                <p className="font-semibold text-gray-900">{previewAppointment.serviceName || previewAppointment.service_name || 'Agendamento'}</p>
                <p>{formatDateTime(previewAppointment.startTime || previewAppointment.start_time)}</p>
                <button
                  type="button"
                  onClick={() => navigate(`/painel/${salaoId}/calendario`)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-cyan-800"
                >
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  Abrir agenda
                </button>
              </div>
            )}
          </Section>

          <Section icon={ShieldCheck} title="Limites">
            <div>
              <label className={labelClass}>Maximo de tokens</label>
              <input
                type="number"
                min={120}
                max={1200}
                step={10}
                className={fieldClass}
                value={settings.max_output_tokens}
                onChange={(event) => updateField('max_output_tokens', event.target.value)}
              />
            </div>
          </Section>
        </aside>
      </div>
    </div>
  );
}
