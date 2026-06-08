import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Bot,
  Loader2,
  MessageSquareText,
  Power,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { auth } from '@/firebaseConfig';
import { useSalon } from './PainelLayout';
import { getErrorMessage } from '@/utils/horalisRuntime';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const DEFAULT_SETTINGS = {
  enabled: false,
  attendant_name: 'Atendente Horalis',
  persona_summary: '',
  tone_instructions: 'Use mensagens curtas, naturais, educadas e acolhedoras. Evite parecer robotico.',
  business_rules: 'Nao confirme horarios sem consultar a agenda. Quando nao tiver certeza, encaminhe para atendimento humano.',
  sample_dialogues: [],
  fallback_message: 'Vou confirmar essa informacao com a equipe e ja retorno com seguranca.',
  handoff_message: 'Vou chamar uma pessoa da equipe para continuar seu atendimento.',
  model: 'gpt-5.4-mini',
  max_output_tokens: 450,
};

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

export default function AtendimentoAgentPage() {
  const { salaoId, salonDetails } = useSalon();
  const primaryColor = salonDetails?.cor_primaria || '#0E7490';

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [samplesText, setSamplesText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [previewMessage, setPreviewMessage] = useState('Oi, gostaria de marcar uma avaliacao essa semana.');
  const [previewReply, setPreviewReply] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      if (!salaoId || !auth.currentUser) return;
      setLoading(true);
      setPageError('');

      try {
        const token = await auth.currentUser.getIdToken();
        const response = await axios.get(`${API_BASE_URL}/admin/agent/${salaoId}/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        const normalized = normalizeSettings(response.data);
        setSettings(normalized);
        setSamplesText(samplesToText(normalized.sample_dialogues));
      } catch (err) {
        if (!cancelled) setPageError(getErrorMessage(err, 'Nao foi possivel carregar o agente.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, [salaoId]);

  const updateField = (field, value) => {
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setPageError('');

    try {
      const token = await auth.currentUser.getIdToken();
      const payload = {
        ...settings,
        sample_dialogues: textToSamples(samplesText),
        max_output_tokens: Number(settings.max_output_tokens || DEFAULT_SETTINGS.max_output_tokens),
      };
      const response = await axios.put(`${API_BASE_URL}/admin/agent/${salaoId}/settings`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
    setPreviewError('');
    setPreviewReply('');

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await axios.post(`${API_BASE_URL}/admin/agent/${salaoId}/preview`, {
        message: previewMessage,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPreviewReply(response.data?.reply || 'Sem resposta.');
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <Section icon={Power} title="Status">
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_160px]">
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
            <div className="grid gap-4">
              <div>
                <label className={labelClass}>Resumo da personalidade</label>
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

          <Section icon={MessageSquareText} title="Exemplos">
            <label className={labelClass}>Uma fala por linha</label>
            <textarea
              className={`${fieldClass} min-h-40 resize-y`}
              value={samplesText}
              onChange={(event) => setSamplesText(event.target.value)}
              placeholder="Oi, tudo bem? Me passa seu nome e o melhor horario que eu vejo aqui pra voce."
            />
          </Section>
        </div>

        <aside className="space-y-6">
          <Section icon={Bot} title="Preview">
            <form onSubmit={handlePreview} className="space-y-4">
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
                Testar resposta
              </button>
            </form>

            {(previewReply || previewError) && (
              <div className={`mt-5 rounded-lg border p-4 text-sm ${previewError ? 'border-red-200 bg-red-50 text-red-700' : 'border-cyan-100 bg-cyan-50 text-gray-800'}`}>
                {previewError || previewReply}
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
