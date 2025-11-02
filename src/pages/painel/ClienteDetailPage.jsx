// frontend/src/pages/painel/ClienteDetailPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
    User, Mail, Phone, Clock, Loader2, ArrowLeft, Calendar, DollarSign, Send, X, AlertTriangle,
    MessageSquare, Tag, CheckCircle, Trash2, Edit3, Clock10, CalendarDays
} from 'lucide-react';
import toast from 'react-hot-toast';

// OBS: Certifique-se de importar o objeto 'auth' para obter o token JWT no modal de agendamento.
import { auth } from '@/firebaseConfig'; // Assumindo que auth está disponível

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";
const CIANO_TEXT_CLASS = 'text-cyan-800';
const CIANO_BG_CLASS = 'bg-cyan-800';
const CIANO_BG_HOVER_CLASS = 'hover:bg-cyan-900';

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// --- COMPONENTE AUXILIAR 1: MODAL DE E-MAIL PROMOCIONAL ---
const EmailPromoModal = ({ isOpen, onClose, clienteId, salaoId, customerName, customerEmail, salonName }) => {
    const [subject, setSubject] = useState(`Oferta Exclusiva para você, ${customerName}!`);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) {
            toast.error("A mensagem não pode estar vazia.");
            return;
        }

        setLoading(true);
        const toastId = toast.loading("Enviando e-mail promocional...");
        
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.post(`${API_BASE_URL}/admin/clientes/enviar-promocional`, {
                cliente_id: clienteId,
                salao_id: salaoId,
                subject: subject.trim(),
                message: message.trim(),
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            toast.success("E-mail promocional enviado!", { id: toastId });
            onClose(); 
            setSubject(`Oferta Exclusiva para você, ${customerName}!`);
            setMessage('');

        } catch (err) {
            const detail = err.response?.data?.detail || "Falha ao enviar. Erro de conexão.";
            toast.error(detail, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    if (!customerEmail || customerEmail.toLowerCase() === 'n/a') {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl p-6 text-center">
                    <Icon icon={AlertTriangle} className="w-8 h-8 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">E-mail Ausente</h3>
                    <p className="text-gray-600 mb-6">
                        Não é possível enviar e-mail promocional. O perfil do cliente não possui um endereço de e-mail válido.
                    </p>
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 text-sm font-semibold text-white ${CIANO_BG_CLASS} rounded-lg ${CIANO_BG_HOVER_CLASS} transition-colors`}
                    >
                        Entendido
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
                {/* Cabeçalho */}
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                        <Icon icon={Send} className={`w-5 h-5 mr-2 ${CIANO_TEXT_CLASS}`} />
                        Enviar E-mail para {customerName}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700" disabled={loading}>
                        <Icon icon={X} className="w-6 h-6" />
                    </button>
                </div>
                
                {/* Formulário */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <p className="text-sm text-gray-600">
                        Remetente: <span className="font-medium text-gray-800">{salonName}</span> | Destinatário: <span className="font-medium text-gray-800">{customerEmail}</span>
                    </p>

                    {/* Campo Assunto */}
                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Assunto do E-mail*</label>
                        <input
                            id="subject"
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 h-10 focus:ring-cyan-500 focus:border-cyan-500"
                            required
                            minLength={5}
                            disabled={loading}
                        />
                    </div>
                    
                    {/* Campo Mensagem */}
                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Corpo da Mensagem (pode usar HTML básico)</label>
                        <textarea
                            id="message"
                            rows="6"
                            placeholder="Ex: Sentimos sua falta! Use o código PROMO10 no seu próximo agendamento."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-cyan-500 focus:border-cyan-500"
                            required
                            minLength={10}
                            disabled={loading}
                        />
                        <p className="text-xs text-gray-500 mt-1">Sua mensagem será enviada com sua identidade visual (salão e cores).</p>
                    </div>

                    {/* Botão de Submissão */}
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className={`flex items-center px-6 py-2.5 text-sm font-semibold text-white ${CIANO_BG_CLASS} rounded-lg shadow-sm ${CIANO_BG_HOVER_CLASS} transition-colors disabled:opacity-50`}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                            {loading ? 'Enviando...' : 'Enviar Agora'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
// --- FIM DO MODAL DE E-MAIL PROMOCIONAL ---


// --- COMPONENTE AUXILIAR 2: MODAL DE AGENDAMENTO DE SERVIÇO DIRETO ---
const AgendamentoServiceModal = ({ isOpen, onClose, cliente, salaoId, onSaveSuccess }) => {
    const [services, setServices] = useState([]);
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [duration, setDuration] = useState(30);
    const [initialDateTime, setInitialDateTime] = useState(''); // Data e Hora como string
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch da lista de serviços
    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            const fetchServices = async () => {
                try {
                    const token = await auth.currentUser.getIdToken();
                    const response = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, { headers: { Authorization: `Bearer ${token}` } });
                    setServices(response.data.servicos || []); 
                } catch (err) {
                    setError("Falha ao carregar a lista de serviços.");
                } finally {
                    setLoading(false);
                }
            };
            fetchServices();
        }
    }, [isOpen, salaoId]);

    const handleServiceChange = (e) => {
        const serviceId = e.target.value;
        setSelectedServiceId(serviceId);
        const service = services.find(s => s.id === serviceId);
        if (service) {
            setDuration(service.duracao_minutos);
        } else {
            setDuration(30);
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validações
        if (!selectedServiceId || !initialDateTime) {
            setError("Selecione o serviço e preencha a data/hora.");
            return;
        }

        setLoading(true);
        const toastId = toast.loading("Agendando serviço...");
        
        try {
            const token = await auth.currentUser.getIdToken();
            
            // --- CORREÇÃO DO FUSO HORÁRIO AQUI ---
            // 1. Cria um objeto Date a partir da string de data/hora local
            const localDate = new Date(initialDateTime); 
            
            // 2. Converte para o formato ISO 8601 UTC (ex: "2025-11-02T01:20:00.000Z")
            // Isso garante que o *momento exato* selecionado seja salvo corretamente,
            // independentemente do fuso horário do usuário.
            const startTimeISO = localDate.toISOString(); 
            // ------------------------------------
            
            const service = services.find(s => s.id === selectedServiceId);
            
            const payload = {
                salao_id: salaoId,
                // AGORA É UM FORMATO ISO UTC CORRETO
                start_time: startTimeISO, 
                duration_minutes: duration,
                customer_name: cliente.nome,
                customer_phone: cliente.whatsapp,
                customer_email: cliente.email,
                service_name: service.nome_servico,
                service_id: selectedServiceId,
                service_price: service.preco || 0.00,
                cliente_id: cliente.id 
            };

            await axios.post(`${API_BASE_URL}/admin/calendario/agendar`, payload, { 
                headers: { Authorization: `Bearer ${token}` } 
            });

            toast.success("Agendamento criado e e-mail enviado!", { id: toastId });
            onSaveSuccess(); // Força a recarga da timeline
            onClose();

        } catch (err) {
            console.error("Erro ao agendar:", err.response);
            const detail = err.response?.data?.detail || "Horário indisponível ou erro no servidor.";
            toast.error(detail, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;
    
    // Pega a data/hora mínima (agora)
    const now = new Date();
    const isoDateNow = format(now, "yyyy-MM-dd'T'HH:mm");


    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
                {/* Cabeçalho */}
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">Agendar para {cliente.nome}</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700" disabled={loading}>
                        <Icon icon={X} className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                    
                    {/* Cliente */}
                    <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-100">
                        <p className="text-sm font-semibold text-cyan-800">Cliente: {cliente.nome}</p>
                    </div>

                    {/* Serviço */}
                    <div>
                        <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-1">Serviço*</label>
                        <select 
                            id="service" 
                            value={selectedServiceId}
                            onChange={handleServiceChange}
                            className="w-full border border-gray-300 rounded-lg p-2 h-10 focus:ring-cyan-500 focus:border-cyan-500 bg-white"
                            required
                            disabled={loading || services.length === 0}
                        >
                            <option value="">
                                {loading && services.length === 0 ? 'Carregando serviços...' : 'Selecione um serviço'}
                            </option>
                            {services.map(service => (
                                <option key={service.id} value={service.id}>
                                    {service.nome_servico} (R$ {service.preco} / {service.duracao_minutos} min)
                                </option>
                            ))}
                        </select>
                        {services.length === 0 && !loading && <p className="text-sm text-red-500 mt-1">Nenhum serviço encontrado. Verifique a tela de Meus Serviços.</p>}
                    </div>
                    
                    {/* Data e Hora */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="datetime" className="block text-sm font-medium text-gray-700 mb-1">Data e Hora*</label>
                            <input 
                                type="datetime-local"
                                id="datetime"
                                value={initialDateTime}
                                onChange={(e) => setInitialDateTime(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 h-10 focus:ring-cyan-500 focus:border-cyan-500"
                                min={isoDateNow.substring(0, 16)} // Bloqueia passado
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">Duração (min)</label>
                            <input 
                                type="number"
                                id="duration"
                                value={duration}
                                readOnly
                                className="w-full border border-gray-300 rounded-lg p-2 h-10 bg-gray-100 text-gray-700"
                            />
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}
                    
                    {/* Botão Salvar */}
                    <div className="flex justify-end pt-4 border-t border-gray-100">
                        <button 
                            type="submit"
                            className={`flex items-center px-6 py-2.5 text-sm font-semibold text-white ${CIANO_BG_CLASS} rounded-lg shadow-sm ${CIANO_BG_HOVER_CLASS} transition-colors disabled:opacity-50`}
                            disabled={loading || !selectedServiceId || !initialDateTime}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                            {loading ? 'Agendando...' : 'Confirmar Agendamento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
// --- FIM DO COMPONENTE AUXILIAR 2 ---


function ClienteDetailPage() {
    const { salaoId, clienteId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isAgendamentoModalOpen, setIsAgendamentoModalOpen] = useState(false); 
    
    // Estados para o formulário de Notas
    const [novaNota, setNovaNota] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);
    
    const setTimelineNeedsRefresh = useCallback(() => {
        // Recarregar os dados para atualizar o timeline
        if (!loading) { // Só recarrega se não estiver já carregando
            fetchDetails(); 
        }
    }, [loading]); 


    // Fetch dos detalhes e histórico (AGORA REUTILIZÁVEL)
    const fetchDetails = useCallback(async () => {
        const URL = `${API_BASE_URL}/admin/clientes/${salaoId}/detalhes-crm/${clienteId}`; 
        setLoading(true);
        setError(null);
        try {
            const token = await auth.currentUser.getIdToken(); // Token para a rota protegida
            const response = await axios.get(URL, { headers: { Authorization: `Bearer ${token}` } });
            const apiData = response.data;

            // Mapeia Timestamps (para data_evento)
            const mappedTimeline = apiData.historico_agendamentos.map(item => ({
                ...item,
                data_evento: item.data_evento ? parseISO(item.data_evento) : null,
            }));

            // Calcula o gasto total
            const totalGasto = mappedTimeline
                .filter(item => item.tipo === 'Agendamento')
                .reduce((total, item) => total + (item.dados.servicePrice || 0), 0)
                .toFixed(2).replace('.', ',');
                
            const totalVisitas = mappedTimeline
                .filter(item => item.tipo === 'Agendamento' && item.dados.status !== 'cancelado')
                .length;


            setData({
                cliente: apiData.cliente,
                timeline: mappedTimeline, // O novo array unificado
                totalGasto: totalGasto,
                totalVisitas: totalVisitas
            });

        } catch (err) {
            console.error("Erro ao buscar detalhes do cliente:", err);
            setError(err.response?.data?.detail || "Cliente não encontrado ou erro de conexão.");
        } finally {
            setLoading(false);
        }
    }, [salaoId, clienteId]);
    
    // Dispara o fetch na montagem 
    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]); 

    // --- LÓGICA DE SALVAR NOTA (AGORA COM ATUALIZAÇÃO LOCAL) ---
    const handleSaveNote = async (e) => {
        e.preventDefault();
        
        if (!novaNota.trim() || novaNota.trim().length < 5) {
            toast.error("A nota precisa ter pelo menos 5 caracteres.");
            return;
        }
        const notaTexto = novaNota.trim();

        setIsSavingNote(true);
        const toastId = toast.loading("Salvando nota...");

        try {
            const token = await auth.currentUser.getIdToken();
            const response = await axios.post(`${API_BASE_URL}/admin/clientes/adicionar-nota`, {
                cliente_id: clienteId,
                salao_id: salaoId,
                nota_texto: notaTexto,
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            const savedNote = response.data; // O backend já retorna o TimelineItem
            
            // --- ATUALIZAÇÃO LOCAL (UX Rápida) ---
            const newTimelineItem = {
                ...savedNote,
                data_evento: parseISO(savedNote.data_evento), // Converte a string ISO
            };
            
            setData(prevData => ({
                ...prevData,
                // Adiciona o novo item e reordena a timeline
                timeline: [newTimelineItem, ...prevData.timeline].sort((a, b) => b.data_evento - a.data_evento)
            }));
            // --- FIM DA ATUALIZAÇÃO LOCAL ---
            
            toast.success("Nota salva com sucesso!", { id: toastId });
            setNovaNota(''); // Limpa o campo

        } catch (err) {
            const detail = err.response?.data?.detail || "Falha ao salvar a nota.";
            toast.error(detail, { id: toastId });
        } finally {
            setIsSavingNote(false);
        }
    };


    // --- Renderização de Status ---
    if (loading) {
        return <div className="flex justify-center py-10"><Loader2 className={`w-8 h-8 animate-spin ${CIANO_TEXT_CLASS}`} /></div>;
    }
    if (error) {
        return <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>;
    }
    if (!data || !data.cliente) {
        return <div className="p-4 text-center text-gray-500">Dados indisponíveis.</div>;
    }

    const { cliente, timeline, totalGasto, totalVisitas } = data;
    const salonName = "Studio Horalis"; // Placeholder seguro


    return (
        <div className="space-y-6">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <button
                    onClick={() => navigate(-1)}
                    className={`flex items-center text-sm font-medium text-gray-600 hover:${CIANO_TEXT_CLASS}`}
                >
                    <Icon icon={ArrowLeft} className="w-5 h-5 mr-2" /> Voltar para a lista
                </button>
            </div>
            
            {/* Título e Ações */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-3xl font-bold text-gray-900 flex items-center">
                    <Icon icon={User} className={`w-7 h-7 mr-3 ${CIANO_TEXT_CLASS}`} />
                    {cliente.nome}
                </h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsAgendamentoModalOpen(true)}
                        className={`flex items-center justify-center px-4 py-2 text-sm font-semibold text-white ${CIANO_BG_CLASS} rounded-lg shadow-sm ${CIANO_BG_HOVER_CLASS} transition-colors`}
                    >
                        <Icon icon={Calendar} className="w-4 h-4 mr-2" /> Agendar Serviço
                    </button>
                    <button
                        onClick={() => setIsEmailModalOpen(true)}
                        className={`flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-green-500 rounded-lg shadow-sm hover:bg-green-600 transition-colors`}
                    >
                        <Icon icon={Send} className="w-4 h-4 mr-2" /> Enviar E-mail
                    </button>
                </div>
            </div>


            {/* Informações de Perfil e KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Contato */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200 space-y-3">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">Contato e Registro</h3>
                    <p className="flex items-center text-sm text-gray-700">
                        <Icon icon={Mail} className={`w-5 h-5 mr-3 text-gray-500`} />
                        {cliente.email}
                    </p>
                    <p className="flex items-center text-sm text-gray-700">
                        <Icon icon={Phone} className={`w-5 h-5 mr-3 text-gray-500`} />
                        {cliente.whatsapp}
                    </p>
                    <p className="flex items-center text-sm text-gray-700 pt-2 border-t border-gray-100">
                        <Icon icon={Clock} className={`w-5 h-5 mr-3 text-gray-500`} />
                        Cliente desde: {cliente.data_cadastro ? format(parseISO(cliente.data_cadastro), 'dd/MM/yyyy') : 'N/A'}
                    </p>
                </div>
                
                {/* 2. KPIs de Histórico */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200 space-y-3">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">Métricas de Fidelidade</h3>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Total Gasto:</span>
                        <span className={`text-xl font-bold ${CIANO_TEXT_CLASS}`}>R$ {totalGasto}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Total de Visitas:</span>
                        <span className="text-xl font-bold text-gray-900">{totalVisitas}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Última Vez:</span>
                        <span className="text-sm font-medium text-gray-900">
                            {cliente.ultima_visita ? formatDistanceToNow(parseISO(cliente.ultima_visita), { addSuffix: true, locale: ptBR }) : 'Nunca visitou'}
                        </span>
                    </div>
                </div>
                
                {/* 3. Formulário de Notas Manuais */}
                <form onSubmit={handleSaveNote} className="bg-white p-6 rounded-lg shadow border border-gray-200 space-y-3">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">Adicionar Nota Interna</h3>
                    <textarea
                        rows="4"
                        value={novaNota}
                        onChange={(e) => setNovaNota(e.target.value)}
                        placeholder="Ex: Gosta de café preto. Perguntar sobre a viagem de férias."
                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-cyan-500 focus:border-cyan-500"
                        disabled={isSavingNote}
                    />
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className={`flex items-center px-4 py-2 text-sm font-semibold text-white ${CIANO_BG_CLASS} rounded-lg ${CIANO_BG_HOVER_CLASS} transition-colors disabled:opacity-50`}
                            disabled={isSavingNote || novaNota.trim().length < 5} 
                        >
                            {isSavingNote ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Icon icon={Tag} className="w-4 h-4 mr-2" />}
                            {isSavingNote ? 'Salvando...' : 'Salvar Nota'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Histórico de Agendamentos (Timeline) */}
            <div className="pt-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Timeline de Interações</h3>
                
                <div className="space-y-4">
                    {timeline.length > 0 ? (
                        timeline.map((item) => (
                            <div key={item.id} className="flex space-x-4">
                                
                                {/* Ícone e Linha do Tempo */}
                                <div className="flex flex-col items-center">
                                    {/* Ícone */}
                                    <div className={`p-2 rounded-full text-white shadow-md ${
                                        item.tipo === 'Agendamento' ? 'bg-cyan-600' : 
                                        item.tipo === 'NotaManual' ? 'bg-indigo-600' :
                                        'bg-green-600'
                                    }`}>
                                        <Icon icon={
                                            item.tipo === 'Agendamento' ? Calendar : 
                                            item.tipo === 'NotaManual' ? MessageSquare :
                                            Send
                                        } className="w-5 h-5" />
                                    </div>
                                    {/* Linha (apenas se não for o último) */}
                                    {item !== timeline[timeline.length - 1] && (
                                        <div className="w-0.5 h-full bg-gray-300 min-h-[30px]" />
                                    )}
                                </div>

                                {/* Conteúdo da Timeline */}
                                <div className="flex-1 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-semibold text-gray-900">
                                            {item.tipo === 'Agendamento' ? 
                                                item.dados.status === 'cancelado' ? `Agendamento Cancelado (${item.dados.serviceName})` : `Agendamento: ${item.dados.serviceName}` : 
                                            item.tipo === 'NotaManual' ? 
                                                `Nota Manual (por ${item.dados.enviado_por?.split('@')[0] || 'Admin'})` : 
                                            `E-mail Enviado: ${item.dados.assunto || 'Promoção'}`
                                            }
                                        </p>
                                        <p className="text-xs text-gray-500 whitespace-nowrap">
                                            {item.data_evento ? format(item.data_evento, 'dd/MM/yyyy HH:mm') : 'Data Indisponível'}
                                        </p>
                                    </div>
                                    
                                    {/* Detalhes específicos do conteúdo */}
                                    <div className="mt-2 text-sm text-gray-700 space-y-1">
                                        {item.tipo === 'Agendamento' ? (
                                            <p>Horário: <span className="font-medium">{item.data_evento ? format(item.data_evento, 'HH:mm') : 'N/A'}</span> | Preço: R$ {(item.dados.servicePrice || 0).toFixed(2).replace('.', ',')}</p>
                                        ) : item.tipo === 'NotaManual' ? (
                                            <p className="italic">{item.dados.texto}</p>
                                        ) : (
                                            <p className="italic text-gray-600">Assunto: {item.dados.assunto || item.dados.message_preview || 'N/A'}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-gray-500 py-10">Nenhuma interação registrada ainda.</div>
                    )}
                </div>
            </div>
            
            {/* --- Renderiza o Modal de E-mail --- */}
            {isEmailModalOpen && (
                <EmailPromoModal
                    isOpen={isEmailModalOpen}
                    onClose={() => setIsEmailModalOpen(false)}
                    clienteId={clienteId}
                    salaoId={salaoId}
                    customerName={cliente.nome}
                    customerEmail={cliente.email}
                    salonName={salonName} 
                />
            )}
            
            {/* --- Renderiza o Modal de Agendamento --- */}
            {isAgendamentoModalOpen && (
                <AgendamentoServiceModal
                    isOpen={isAgendamentoModalOpen}
                    onClose={() => setIsAgendamentoModalOpen(false)}
                    // Passa um objeto cliente simplificado que contém o ID
                    cliente={{ id: clienteId, nome: cliente.nome, whatsapp: cliente.whatsapp, email: cliente.email }}
                    salaoId={salaoId}
                    // Força a recarga da Timeline
                    onSaveSuccess={setTimelineNeedsRefresh} 
                />
            )}
        </div>
    );
}

export default ClienteDetailPage;