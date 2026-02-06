import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Send, UserPlus, Loader2, AlertTriangle, Link as LinkIcon, QrCode,
    Check, Eye, X, Users, UserCheck, UserX, Copy, Mail, Sparkles, Zap,Clock
} from 'lucide-react'; // Adicionei MagicWand se quiser usar como icone de template
import { auth } from '@/firebaseConfig';
import { QRCodeCanvas } from 'qrcode.react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import HourglassLoading from '@/components/HourglassLoading';
import { useSalon } from './PainelLayout';

const API_BASE_URL = "https://api-agendador-2n55.onrender.com/api/v1";

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// 🌟 NOVOS MODELOS DE E-MAIL (COPYWRITING) 🌟
const EMAIL_TEMPLATES = {
    todos: {
        subject: '✨ Novidades especiais para você no [Nome do Salão]!',
        message: `Olá! Temos novidades incríveis esperando por você.\n\nPreparamos condições especiais e novos horários para você cuidar do seu visual com a qualidade que merece.\n\nNão perca tempo, clique no botão abaixo e garanta seu horário agora mesmo!`
    },
    inativos: {
        subject: 'Saudades de você! 💔 Temos um presente...',
        message: `Olá! Faz tempo que não te vemos por aqui e estamos com saudades.\n\nComo você é um cliente especial, queremos te convidar para voltar. Nossos profissionais estão prontos para te atender.\n\nQue tal agendar uma visita essa semana? Estamos te esperando!`
    },
    recentes: {
        subject: 'Bem-vindo(a) à família! 🌟 O que achou?',
        message: `Olá! Adoramos te receber recentemente.\n\nEsperamos que tenha gostado da experiência. Cuidar de você é a nossa prioridade.\n\nJá estamos prontos para o seu próximo atendimento. Garanta seu horário com antecedência clicando abaixo!`
    }
};

// --- SUB-COMPONENTE: CARD DE SELEÇÃO DE PÚBLICO ---
const AudienceCard = ({ id, title, description, icon: IconComp, isSelected, onClick, primaryColor }) => (
    <button
        type="button"
        onClick={onClick}
        className={`relative flex flex-col items-start p-5 rounded-2xl border-2 transition-all duration-200 w-full text-left group hover:shadow-md
        ${isSelected
                ? 'bg-white shadow-md'
                : 'bg-white border-gray-100 hover:border-gray-200'
            }`}
        style={{
            borderColor: isSelected ? primaryColor : undefined,
            backgroundColor: isSelected ? `${primaryColor}08` : undefined
        }}
    >
        <div className={`p-3 rounded-xl mb-3 transition-colors ${isSelected ? 'text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}
            style={{ backgroundColor: isSelected ? primaryColor : undefined }}>
            <IconComp className="w-6 h-6" />
        </div>
        <h3 className={`font-bold text-lg ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{title}</h3>
        <p className="text-sm text-gray-500 mt-1 leading-snug">{description}</p>

        {isSelected && (
            <div className="absolute top-4 right-4 p-1 rounded-full" style={{ color: primaryColor }}>
                <Icon icon={Check} className="w-5 h-5" />
            </div>
        )}
    </button>
);

// --- SUB-COMPONENTE: PROGRESSO CIRCULAR ---
const QuotaWidget = ({ used, total, resetDate, primaryColor }) => {
    const percentage = Math.min((used / total) * 100, 100);
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    const isCritical = used >= total;

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">Cota Mensal</h3>
                <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-extrabold ${isCritical ? 'text-red-600' : 'text-gray-900'}`}>{used}</span>
                    <span className="text-gray-400 font-medium">/ {total} e-mails</span>
                </div>
                {resetDate && (
                    <p className="text-xs text-gray-400 mt-2 flex items-center">
                        <Icon icon={Clock} className="w-3 h-3 mr-1" />
                        Renova em {format(resetDate, 'dd/MM', { locale: ptBR })}
                    </p>
                )}
            </div>

            <div className="relative w-20 h-20 flex-shrink-0">
                <svg className="transform -rotate-90 w-full h-full">
                    <circle cx="40" cy="40" r={radius} stroke="#F3F4F6" strokeWidth="8" fill="transparent" />
                    <circle
                        cx="40" cy="40" r={radius} stroke={isCritical ? '#DC2626' : primaryColor} strokeWidth="8"
                        fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round" className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-600">
                    {Math.round(percentage)}%
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENTE: PREVIEW DE CELULAR ---
const PhonePreviewModal = ({ isOpen, onClose, subject, message, salonName }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">

            {/* Botão Fechar (Agora Sólido e Visível) */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 z-50 bg-white text-gray-900 hover:bg-gray-200 p-3 rounded-full shadow-xl transition-transform hover:scale-110"
                title="Fechar Preview"
            >
                <Icon icon={X} className="w-6 h-6" />
            </button>

            <div className="relative w-full max-w-sm bg-gray-900 rounded-[3rem] shadow-2xl border-[8px] border-gray-800 overflow-hidden h-[80vh] flex flex-col">

                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-xl z-20"></div>
                <div className="bg-gray-100 flex-1 overflow-y-auto pt-12 pb-8 px-4 no-scrollbar">

                    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                                {salonName ? salonName[0] : 'S'}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">{salonName}</p>
                                <p className="text-xs text-gray-500">para mim</p>
                            </div>
                            <span className="ml-auto text-xs text-gray-400">Agora</span>
                        </div>

                        <h2 className="text-lg font-bold text-gray-900 mb-4 leading-tight">{subject || "(Sem Assunto)"}</h2>

                        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans"
                            dangerouslySetInnerHTML={{ __html: message ? message.replace(/\n/g, '<br/>') : "(Sua mensagem aparecerá aqui)" }} />

                        <div className="mt-8 pt-4 border-t border-gray-100 text-center">
                            <button className="px-6 py-2 bg-black text-white rounded-full text-xs font-bold">
                                Agendar Agora
                            </button>
                            <p className="text-[10px] text-gray-400 mt-4">Enviado via Horalis</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default function MarketingPage() {
    const { salaoId, salonDetails, loading: loadingContext } = useSalon();

    const primaryColor = salonDetails?.cor_primaria || '#0E7490';

    // Estados iniciais com o modelo "Todos" carregado
    const [segmento, setSegmento] = useState('todos');
    const [subject, setSubject] = useState(EMAIL_TEMPLATES.todos.subject);
    const [message, setMessage] = useState(EMAIL_TEMPLATES.todos.message);

    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const copyTimeoutRef = useRef(null);

    const salonName = salonDetails?.nome_salao || "Seu Salão";
    const publicUrl = `https://horalis.app/agendar/${salaoId}`;
    const cotaTotal = salonDetails?.marketing_cota_total || 100;
    const cotaUsada = salonDetails?.marketing_cota_usada || 0;
    const cotaResetEm = salonDetails?.marketing_cota_reset_em ? parseISO(salonDetails.marketing_cota_reset_em) : null;

    const fetchSalonData = useCallback(async () => { /* ... */ }, [salaoId]);

    // 🌟 NOVO HANDLER: Troca de Segmento e Carrega Template 🌟
    const handleSegmentChange = (newSegment) => {
        setSegmento(newSegment);

        // Carrega o template correspondente
        const template = EMAIL_TEMPLATES[newSegment];
        if (template) {
            // Substitui [Nome do Salão] pelo nome real
            const realSubject = template.subject.replace('[Nome do Salão]', salonName);
            setSubject(realSubject);
            setMessage(template.message);

            // Feedback visual sutil
            toast.success(`Modelo para "${newSegment.toUpperCase()}" aplicado!`, {
                icon: '🪄',
                style: { fontSize: '13px' }
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMessage('');
        if (!message.trim() || !subject.trim()) return toast.error("Preencha o assunto e a mensagem.");
        if (cotaUsada >= cotaTotal) return toast.error("Limite de e-mails atingido.");
        if (!window.confirm(`Enviar para o segmento: ${segmento.toUpperCase()}?`)) return;

        setLoading(true);
        const toastId = toast.loading("Preparando envio...");

        try {
            const token = await auth.currentUser.getIdToken();
            const response = await axios.post(`${API_BASE_URL}/admin/marketing/enviar-massa`, {
                salao_id: salaoId, subject: subject.trim(), message: message.trim(), segmento: segmento,
            }, { headers: { Authorization: `Bearer ${token}` } });

            setSuccessMessage(response.data.message);
            toast.success("Campanha enviada!", { id: toastId });

            // Reseta para o padrão (Todos) após envio
            setMessage('');
            setSubject('');
        } catch (err) {
            toast.error(err.response?.data?.detail || "Erro ao enviar.", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(publicUrl).then(() => {
            setLinkCopied(true);
            toast.success("Link copiado!");
            setTimeout(() => setLinkCopied(false), 2000);
        });
    };

    const downloadStylishQRCode = async () => {
        if (!salaoId) return;
        const toastId = toast.loading("Gerando arte...");

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 800; canvas.height = 1000;

        ctx.fillStyle = primaryColor;
        ctx.fillRect(0, 0, 800, 1000);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 60px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(salonName, 400, 150);

        ctx.font = '30px sans-serif';
        ctx.fillText("Agende seu horário online", 400, 220);

        const qrCanvas = document.getElementById('horalis-qrcode-canvas');
        if (qrCanvas) {
            ctx.fillStyle = 'white';
            ctx.fillRect(200, 300, 400, 400);
            ctx.drawImage(qrCanvas, 220, 320, 360, 360);
        }

        const link = document.createElement('a');
        link.download = `qrcode-${salonName}.png`;
        link.href = canvas.toDataURL();
        link.click();
        toast.success("Download iniciado!", { id: toastId });
    };

    if (loadingContext || !salaoId) return <div className="h-96 flex items-center justify-center"><HourglassLoading /></div>;

    return (
        <div className="font-sans pb-20 max-w-5xl mx-auto">

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                            <Icon icon={Zap} className="w-6 h-6" style={{ color: primaryColor }} />
                        </div>
                        Central de Marketing
                    </h1>
                    <p className="text-gray-500 mt-2">Atraia e fidelize clientes com ferramentas automáticas.</p>
                </div>

                <div className="w-full md:w-auto">
                    <QuotaWidget used={cotaUsada} total={cotaTotal} resetDate={cotaResetEm} primaryColor={primaryColor} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* COLUNA ESQUERDA (Divulgação) */}
                <div className="space-y-6">

                    {/* Link na Bio */}
                    <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}DD 100%)` }}>
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                                <Icon icon={Sparkles} className="w-5 h-5" /> Seu Link de Agendamento
                            </h3>
                            <p className="text-white/80 text-sm mb-6">O link mágico para sua bio.</p>

                            <div className="flex items-center bg-white/10 backdrop-blur-md rounded-xl p-1 border border-white/20">
                                <div className="bg-white/20 p-2 rounded-lg mr-2">
                                    <Icon icon={LinkIcon} className="w-4 h-4 text-white" />
                                </div>
                                <input value={publicUrl} readOnly className="bg-transparent text-white text-xs flex-1 outline-none w-full min-w-0" />
                                <button onClick={copyLink} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <Icon icon={linkCopied ? Check : Copy} className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    </div>

                    {/* QR Code */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-gray-50 rounded-xl text-gray-600">
                                <Icon icon={QrCode} className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">QR Code de Balcão</h3>
                                <p className="text-xs text-gray-500">Imprima e coloque na recepção.</p>
                            </div>
                        </div>
                        <div className="hidden"><QRCodeCanvas id="horalis-qrcode-canvas" value={publicUrl} size={512} /></div>
                        <button onClick={downloadStylishQRCode} disabled={loadingContext} className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                            <Icon icon={QrCode} className="w-4 h-4" /> Baixar Pôster
                        </button>
                    </div>
                </div>

                {/* COLUNA DIREITA (Campanha) */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className={`p-2 rounded-lg bg-blue-50 text-blue-600`}>
                                <Icon icon={Mail} className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Nova Campanha de E-mail</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Seleção de Público */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">1. Selecione o Público</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <AudienceCard
                                        id="todos" title="Todos" description="Base completa de clientes."
                                        icon={Users} isSelected={segmento === 'todos'}
                                        onClick={() => handleSegmentChange('todos')}
                                        primaryColor={primaryColor}
                                    />
                                    <AudienceCard
                                        id="inativos" title="Sumidos" description="Não visitam há +60 dias."
                                        icon={UserX} isSelected={segmento === 'inativos'}
                                        onClick={() => handleSegmentChange('inativos')}
                                        primaryColor={primaryColor}
                                    />
                                    <AudienceCard
                                        id="recentes" title="Novos" description="Cadastrados nos últimos 30 dias."
                                        icon={UserCheck} isSelected={segmento === 'recentes'}
                                        onClick={() => handleSegmentChange('recentes')}
                                        primaryColor={primaryColor}
                                    />
                                </div>
                            </div>

                            {/* Conteúdo */}
                            <div className="space-y-4">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">2. Conteúdo Automático</label>

                                <div>
                                    <input
                                        value={subject} onChange={(e) => setSubject(e.target.value)}
                                        placeholder="Assunto do E-mail"
                                        className="w-full text-lg font-semibold placeholder-gray-300 border-b-2 border-gray-100 py-2 focus:outline-none focus:border-gray-300 transition-colors"
                                    />
                                </div>

                                <div className="relative">
                                    <textarea
                                        value={message} onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Escreva sua mensagem..."
                                        rows={6}
                                        className="w-full p-4 bg-gray-50 rounded-xl border-0 text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-gray-200 resize-none"
                                    />
                                </div>
                            </div>

                            {/* Ações */}
                            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsPreviewOpen(true)} className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-900 font-medium text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors w-full sm:w-auto">
                                    <Icon icon={Eye} className="w-4 h-4" /> Ver no Celular
                                </button>
                                <div className="flex-1 w-full sm:w-auto" />
                                <button type="submit" disabled={loading || cotaUsada >= cotaTotal} className="w-full sm:w-auto px-8 py-3 rounded-xl text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" style={{ backgroundColor: primaryColor }}>
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    {loading ? 'Enviando...' : 'Disparar Campanha'}
                                </button>
                            </div>

                            {successMessage && (
                                <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 text-center animate-in fade-in">{successMessage}</div>
                            )}
                        </form>
                    </div>
                </div>
            </div>

            {/* Modal Preview (Botão Fechar Melhorado) */}
            <PhonePreviewModal
                isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)}
                subject={subject} message={message} salonName={salonName}
            />
        </div>
    );
}