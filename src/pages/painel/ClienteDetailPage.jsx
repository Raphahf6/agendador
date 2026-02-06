import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    User, Mail, Phone, Clock, ArrowLeft, Calendar, DollarSign, Send, X, 
    MessageCircle, Tag, Loader2, StickyNote, CheckCircle, AlertTriangle, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import HourglassLoading from '@/components/HourglassLoading';
import { auth } from '@/firebaseConfig';
import { useSalon } from './PainelLayout';

const API_BASE_URL = "https://api-agendador-2n55.onrender.com/api/v1";

// --- Estilos & Cores ---
const PRIMARY_COLOR_TEXT = 'text-cyan-700';
const PRIMARY_BG = 'bg-cyan-700';
const PRIMARY_BG_HOVER = 'hover:bg-cyan-800';

// --- Helpers ---
const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

const getInitials = (name) => {
    if (!name) return "C";
    const names = name.trim().split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
};

const getAvatarColor = (name) => {
    const colors = ['bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-purple-100 text-purple-600', 'bg-orange-100 text-orange-600', 'bg-pink-100 text-pink-600'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

// =============================================================================
// MODAL 1: ENVIAR E-MAIL PROMOCIONAL
// =============================================================================
const EmailPromoModal = ({ isOpen, onClose, clienteId, salaoId, customerName, customerEmail, salonName }) => {
    const [subject, setSubject] = useState(`Oferta Exclusiva para você, ${customerName}!`);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) return toast.error("A mensagem não pode estar vazia.");

        setLoading(true);
        const toastId = toast.loading("Enviando e-mail...");

        try {
            const token = await auth.currentUser.getIdToken();
            await axios.post(`${API_BASE_URL}/admin/clientes/enviar-promocional`, {
                cliente_id: clienteId,
                salao_id: salaoId,
                subject: subject.trim(),
                message: message.trim(),
            }, { headers: { Authorization: `Bearer ${token}` } });

            toast.success("E-mail enviado!", { id: toastId });
            onClose();
            setMessage('');
        } catch (err) {
            toast.error("Falha ao enviar.", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-cyan-700" /> Enviar E-mail
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-xs text-gray-500">De: <strong>{salonName}</strong></p>
                    {!customerEmail ? (
                        <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5" /> Cliente sem e-mail cadastrado.
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assunto</label>
                                <input 
                                    value={subject} onChange={(e) => setSubject(e.target.value)}
                                    className="w-full p-3 bg-gray-50 border-none rounded-xl text-gray-900 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mensagem</label>
                                <textarea 
                                    value={message} onChange={(e) => setMessage(e.target.value)}
                                    rows="5"
                                    placeholder="Escreva sua mensagem aqui..."
                                    className="w-full p-3 bg-gray-50 border-none rounded-xl text-gray-900 focus:ring-2 focus:ring-cyan-500/20 outline-none resize-none"
                                    required
                                />
                            </div>
                            <div className="flex justify-end pt-2">
                                <button type="submit" disabled={loading} className={`px-6 py-2.5 rounded-xl font-bold text-white shadow-md transition-all ${PRIMARY_BG} ${PRIMARY_BG_HOVER} disabled:opacity-50 flex items-center gap-2`}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};

// =============================================================================
// MODAL 2: AGENDAMENTO RÁPIDO (Serviço + Data)
// =============================================================================
const AgendamentoServiceModal = ({ isOpen, onClose, cliente, salaoId, onSaveSuccess }) => {
    const [services, setServices] = useState([]);
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [duration, setDuration] = useState(30);
    const [dateTime, setDateTime] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingServices, setFetchingServices] = useState(false);

    // Carrega serviços ao abrir
    useEffect(() => {
        if (isOpen && salaoId) {
            setFetchingServices(true);
            const fetchServices = async () => {
                try {
                    const token = await auth.currentUser.getIdToken();
                    const response = await axios.get(`${API_BASE_URL}/saloes/${salaoId}/servicos`);
                    setServices(response.data.servicos || []);
                } catch (err) { console.error(err); } 
                finally { setFetchingServices(false); }
            };
            fetchServices();
        }
    }, [isOpen, salaoId]);

    const handleServiceChange = (e) => {
        const sid = e.target.value;
        setSelectedServiceId(sid);
        const svc = services.find(s => s.id === sid);
        if (svc) setDuration(svc.duracao_minutos);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const service = services.find(s => s.id === selectedServiceId);
            
            await axios.post(`${API_BASE_URL}/admin/calendario/agendar`, {
                salao_id: salaoId,
                start_time: new Date(dateTime).toISOString(),
                duration_minutes: duration,
                customer_name: cliente.nome,
                customer_phone: cliente.whatsapp,
                customer_email: cliente.email,
                service_name: service.nome_servico,
                service_id: selectedServiceId,
                service_price: service.preco || 0,
                cliente_id: cliente.id
            }, { headers: { Authorization: `Bearer ${token}` } });

            toast.success("Agendado com sucesso!");
            onSaveSuccess();
            onClose();
        } catch (err) {
            toast.error("Erro ao agendar. Verifique o horário.");
        } finally { setLoading(false); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-cyan-700" /> Novo Agendamento
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente</label>
                        <div className="p-3 bg-cyan-50 rounded-xl text-cyan-900 font-bold border border-cyan-100">
                            {cliente.nome}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Serviço</label>
                        <select 
                            value={selectedServiceId} onChange={handleServiceChange} required
                            className="w-full p-3 bg-gray-50 border-none rounded-xl text-gray-900 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                            disabled={fetchingServices}
                        >
                            <option value="">{fetchingServices ? 'Carregando...' : 'Selecione...'}</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.nome_servico} ({s.duracao_minutos} min)</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data/Hora</label>
                            <input 
                                type="datetime-local" required value={dateTime} onChange={e => setDateTime(e.target.value)}
                                className="w-full p-3 bg-gray-50 border-none rounded-xl text-gray-900 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duração</label>
                            <input 
                                type="number" value={duration} readOnly
                                className="w-full p-3 bg-gray-100 border-none rounded-xl text-gray-500 cursor-not-allowed"
                            />
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className={`w-full py-3.5 mt-2 rounded-xl font-bold text-white shadow-md transition-all ${PRIMARY_BG} ${PRIMARY_BG_HOVER} disabled:opacity-50`}>
                        {loading ? 'Agendando...' : 'Confirmar'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// =============================================================================
// PÁGINA PRINCIPAL: DETALHES DO CLIENTE
// =============================================================================
export default function ClienteDetailPage() {
    const { salaoId, salonDetails } = useSalon();
    const { clienteId } = useParams();
    const navigate = useNavigate();
    
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Modais e Notas
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isAgendamentoModalOpen, setIsAgendamentoModalOpen] = useState(false);
    const [novaNota, setNovaNota] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);

    // 🌟 CORREÇÃO: Definindo salonName a partir do contexto 🌟
    const salonName = salonDetails?.nome_salao || "Seu Salão";

    // Fetch Data
    const fetchDetails = useCallback(async () => {
        if (!salaoId) return;
        setLoading(true); setError(null);
        try {
            const token = await auth.currentUser.getIdToken();
            const response = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}/detalhes-crm/${clienteId}`, { headers: { Authorization: `Bearer ${token}` } });
            const apiData = response.data;

            console.log("Dados brutos do cliente:", apiData); // 🔍 DEBUG: Veja isso no console (F12)

            // 1. Mapeia e Ordena a Timeline
            const mappedTimeline = apiData.historico_agendamentos.map(item => ({
                ...item,
                data_evento: item.data_evento ? parseISO(item.data_evento) : null,
            })).sort((a, b) => {
                const dateA = a.data_evento || new Date(0);
                const dateB = b.data_evento || new Date(0);
                return dateB - dateA; // Mais recente primeiro
            });

            // 2. Cálculo Robusto de LTV (Total Gasto)
            const totalGasto = mappedTimeline.reduce((acc, item) => {
                // Verifica se é um item de agendamento (ignora notas/emails)
                // Verifica tanto 'Agendamento' quanto 'agendamento' para garantir
                if (item.tipo?.toLowerCase() !== 'agendamento') return acc;

                const dados = item.dados || {};
                const status = (dados.status || '').toLowerCase();

                // Pula se estiver cancelado ou rejeitado
                if (status.includes('cancelado') || status.includes('canceled') || status.includes('rejeitado')) {
                    return acc;
                }

                // Tenta pegar o preço de várias formas possíveis para garantir
                // servicePrice (padrão novo), preco, price, value...
                const rawPrice = dados.servicePrice ?? dados.service_price ?? dados.preco ?? 0;
                const price = parseFloat(rawPrice);

                return acc + (isNaN(price) ? 0 : price);
            }, 0);

            // 3. Cálculo Robusto de Visitas
            const totalVisitas = mappedTimeline.filter(item => {
                if (item.tipo?.toLowerCase() !== 'agendamento') return false;
                const status = (item.dados?.status || '').toLowerCase();
                return !status.includes('cancelado') && !status.includes('canceled') && !status.includes('rejeitado');
            }).length;

            setData({
                cliente: apiData.cliente,
                timeline: mappedTimeline,
                totalGasto,
                totalVisitas
            });
        } catch (err) {
            console.error(err);
            setError("Erro ao carregar detalhes.");
        } finally { setLoading(false); }
    }, [salaoId, clienteId]);

    useEffect(() => { fetchDetails(); }, [fetchDetails]);

    const refreshTimeline = () => {
        fetchDetails(); 
    };

    // Save Note
    const handleSaveNote = async (e) => {
        e.preventDefault();
        if (!novaNota.trim()) return;
        setIsSavingNote(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const response = await axios.post(`${API_BASE_URL}/admin/clientes/adicionar-nota`, {
                cliente_id: clienteId, salao_id: salaoId, nota_texto: novaNota.trim(),
            }, { headers: { Authorization: `Bearer ${token}` } });

            const savedNote = { ...response.data, data_evento: parseISO(response.data.data_evento) };
            
            setData(prev => ({ ...prev, timeline: [savedNote, ...prev.timeline] }));
            setNovaNota('');
            toast.success("Nota adicionada!");
        } catch (err) { toast.error("Erro ao salvar nota."); } 
        finally { setIsSavingNote(false); }
    };

    if (loading) return <div className="h-96 flex items-center justify-center"><HourglassLoading message='Carregando perfil...' /></div>;
    if (error || !data) return <div className="p-8 text-center text-red-500">{error || "Cliente não encontrado."}</div>;

    const { cliente, timeline, totalGasto, totalVisitas } = data;
    const initials = getInitials(cliente.nome);
    const avatarColor = getAvatarColor(cliente.nome);

    return (
        <div className="font-sans pb-20 max-w-6xl mx-auto px-4 sm:px-6">
            
            {/* Header de Navegação */}
            <button onClick={() => navigate(-1)} className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-800 mb-6 transition-colors group">
                <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Voltar para Lista
            </button>

            {/* 1. HEADER DO CLIENTE (CARD PRINCIPAL) */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 sm:p-10 mb-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-50 to-transparent rounded-bl-full opacity-50 -z-0 transition-transform duration-700 group-hover:scale-110"></div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-8 relative z-10">
                    
                    {/* Avatar Grande */}
                    <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center text-4xl font-bold shadow-xl ${avatarColor} border-4 border-white`}>
                        {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">{cliente.nome}</h1>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6 font-medium">
                            {cliente.email && <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg"><Mail className="w-4 h-4 text-cyan-600"/> {cliente.email}</span>}
                            {cliente.whatsapp && <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg"><Phone className="w-4 h-4 text-cyan-600"/> {cliente.whatsapp}</span>}
                        </div>
                        
                        {/* Badges Dinâmicos */}
                        <div className="flex gap-2">
                            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                Cliente desde {cliente.data_cadastro ? format(parseISO(cliente.data_cadastro), 'MM/yyyy') : 'N/A'}
                            </span>
                            {totalVisitas > 5 && <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1"><Tag className="w-3 h-3"/> Fiel</span>}
                            {totalGasto > 500 && <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1"><DollarSign className="w-3 h-3"/> VIP</span>}
                        </div>
                    </div>

                    {/* Ações Rápidas */}
                    <div className="flex gap-3 w-full md:w-auto">
                        <button onClick={() => setIsAgendamentoModalOpen(true)} className="flex-1 md:flex-none py-3 px-6 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5">
                            <Plus className="w-4 h-4" /> Novo Agendamento
                        </button>
                        <button onClick={() => setIsEmailModalOpen(true)} className="p-3 rounded-xl border-2 border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-gray-200 transition-colors shadow-sm">
                            <Mail className="w-5 h-5" />
                        </button>
                        {cliente.whatsapp && (
                            <a 
                                href={`https://wa.me/${cliente.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                                className="p-3 rounded-xl bg-green-50 text-green-600 border-2 border-green-100 hover:bg-green-100 transition-colors shadow-sm"
                            >
                                <MessageCircle className="w-5 h-5" />
                            </a>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- COLUNA ESQUERDA: KPIs e Notas --- */}
                <div className="space-y-8">
                    
                    {/* KPIs de Valor */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Total Gasto</p>
                            <p className="text-2xl font-extrabold text-emerald-600 tracking-tight">{formatCurrency(totalGasto)}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Visitas</p>
                            <p className="text-2xl font-extrabold text-gray-900 tracking-tight">{totalVisitas}</p>
                        </div>
                    </div>

                    {/* Bloco de Notas */}
                    <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100 shadow-sm">
                        <h3 className="text-lg font-bold text-yellow-900 mb-4 flex items-center gap-2">
                            <StickyNote className="w-5 h-5 text-yellow-500" /> Notas Internas
                        </h3>
                        <form onSubmit={handleSaveNote}>
                            <textarea 
                                value={novaNota}
                                onChange={(e) => setNovaNota(e.target.value)}
                                placeholder="Ex: Prefere café sem açúcar..."
                                rows="4"
                                className="w-full p-4 bg-white/80 border-none rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-yellow-400 focus:bg-white transition-all resize-none mb-3 shadow-sm"
                            />
                            <div className="flex justify-end">
                                <button 
                                    type="submit" 
                                    disabled={isSavingNote || !novaNota.trim()}
                                    className="text-xs font-bold px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                    {isSavingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Adicionar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* --- COLUNA DIREITA: Timeline --- */}
                <div className="lg:col-span-2">
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-lg">
                        <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-cyan-700" /> Histórico
                        </h3>
                        
                        <div className="relative border-l-2 border-gray-100 ml-3 space-y-8">
                            {timeline.length === 0 ? (
                                <div className="pl-8 text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200 mx-6">
                                    <p className="text-gray-400 text-sm font-medium">Nenhuma interação registrada ainda.</p>
                                </div>
                            ) : (
                                timeline.map((item, index) => (
                                    <div key={index} className="relative pl-8 group">
                                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-md z-10 transition-transform group-hover:scale-125
                                            ${item.tipo === 'Agendamento' ? (item.dados.status === 'cancelado' ? 'bg-red-400' : 'bg-cyan-500') : 
                                              item.tipo === 'NotaManual' ? 'bg-yellow-400' : 'bg-purple-400'}`
                                        }></div>

                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide bg-gray-50 px-2 py-0.5 rounded">
                                                {item.data_evento ? formatDistanceToNow(item.data_evento, { addSuffix: true, locale: ptBR }) : '-'}
                                            </span>
                                            <span className="text-xs text-gray-300 font-mono font-medium">
                                                {item.data_evento ? format(item.data_evento, 'dd/MM/yy • HH:mm') : ''}
                                            </span>
                                        </div>

                                        <div className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm group-hover:shadow-md group-hover:border-gray-200 transition-all">
                                            
                                            {item.tipo === 'Agendamento' && (
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 bg-cyan-50 text-cyan-700 rounded-lg"><Calendar className="w-4 h-4" /></div>
                                                            <span className={`font-bold text-base ${item.dados.status === 'cancelado' ? 'text-red-600 line-through' : 'text-gray-900'}`}>
                                                                {item.dados.serviceName || 'Serviço'}
                                                            </span>
                                                        </div>
                                                        {item.dados.status !== 'cancelado' && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">Realizado</span>}
                                                    </div>
                                                    <p className="text-sm text-gray-500 ml-9">
                                                        Valor: <span className="font-medium text-gray-700">R$ {Number(item.dados.servicePrice || 0).toFixed(2).replace('.', ',')}</span> • Duração: {item.dados.durationMinutes} min
                                                    </p>
                                                </div>
                                            )}

                                            {item.tipo === 'NotaManual' && (
                                                <div className="flex gap-3">
                                                    <div className="mt-1"><StickyNote className="w-4 h-4 text-yellow-500" /></div>
                                                    <div className="text-gray-800 text-sm italic leading-relaxed">
                                                        "{item.dados.texto}"
                                                    </div>
                                                </div>
                                            )}

                                            {item.tipo !== 'Agendamento' && item.tipo !== 'NotaManual' && (
                                                <div>
                                                    <p className="font-bold text-purple-700 text-sm mb-1 flex items-center gap-2">
                                                        <div className="p-1 bg-purple-50 rounded"><Mail className="w-3 h-3" /></div>
                                                        E-mail Enviado
                                                    </p>
                                                    <p className="text-sm text-gray-600 ml-6 border-l-2 border-purple-100 pl-3 italic">{item.dados.assunto}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>

            <EmailPromoModal 
                isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} 
                clienteId={clienteId} salaoId={salaoId} customerName={cliente.nome} customerEmail={cliente.email} salonName={salonName} 
            />
            <AgendamentoServiceModal 
                isOpen={isAgendamentoModalOpen} onClose={() => setIsAgendamentoModalOpen(false)} 
                cliente={cliente} salaoId={salaoId} onSaveSuccess={refreshTimeline} 
            />
        </div>
    );
}