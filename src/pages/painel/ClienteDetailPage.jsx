// frontend/src/pages/painel/ClienteDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Mail, Phone, Clock, Loader2, ArrowLeft, Calendar, DollarSign, Send, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast'; // Importando toast

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";
const CIANO_TEXT_CLASS = 'text-cyan-800';
const CIANO_BG_CLASS = 'bg-cyan-800';
const CIANO_BG_HOVER_CLASS = 'hover:bg-cyan-900';

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// --- <<< NOVO COMPONENTE: MODAL DE E-MAIL PROMOCIONAL >>> ---
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
            // O token é injetado pelo interceptor do Axios
            await axios.post(`${API_BASE_URL}/admin/clientes/enviar-promocional`, {
                cliente_id: clienteId,
                salao_id: salaoId,
                subject: subject.trim(),
                message: message.trim(), // Enviamos como HTML/Texto
            });
            
            toast.success("E-mail promocional enviado!", { id: toastId });
            onClose(); // Fecha o modal
            setSubject(`Oferta Exclusiva para você, ${customerName}!`); // Reset
            setMessage(''); // Reset

        } catch (err) {
            const detail = err.response?.data?.detail || "Falha ao enviar. Erro de conexão.";
            toast.error(detail, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    if (!customerEmail || customerEmail === 'N/A') {
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
// --- <<< FIM DO NOVO COMPONENTE >>> ---


function ClienteDetailPage() {
    const { salaoId, clienteId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null); // Contém { cliente, historico_agendamentos }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false); // Novo estado

    // Fetch dos detalhes e histórico
    useEffect(() => {
        const fetchDetails = async () => {
            const URL = `${API_BASE_URL}/admin/clientes/${salaoId}/detalhes-crm/${clienteId}`; 
            setLoading(true);
            setError(null);
            try {
                const response = await axios.get(URL);
                const apiData = response.data;

                // Mapeia Timestamps do Backend (que vêm como strings ISO)
                const mappedHistory = apiData.historico_agendamentos.map(item => ({
                    ...item,
                    // Garante que é um objeto Date
                    startTime: item.startTime ? parseISO(item.startTime) : null,
                }));

                setData({
                    cliente: apiData.cliente,
                    historico_agendamentos: mappedHistory
                });

            } catch (err) {
                console.error("Erro ao buscar detalhes do cliente:", err);
                setError(err.response?.data?.detail || "Cliente não encontrado ou erro de conexão.");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [salaoId, clienteId]);
    
    // Calcula o valor total gasto
    const totalGasto = data?.historico_agendamentos.reduce((total, item) => 
        total + (item.servicePrice || 0), 0
    ).toFixed(2).replace('.', ',');

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

    const { cliente, historico_agendamentos } = data;

    // Obtém o nome do salão do owner (assumindo que está no local storage ou contexto, ou faz um fetch simples)
    // Para simplificar, vou assumir que o nome do salão é o 'nome_salao' que veio no ClientDetail/Layout.
    // Como estamos no Admin, podemos puxar o nome_salao do LocalStorage/Contexto, mas vamos usar um placeholder.
    const salonNamePlaceholder = "Studio Horalis"; 


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
                <button
                    onClick={() => setIsModalOpen(true)} // Abre o modal
                    className={`flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-green-500 rounded-lg shadow-sm hover:bg-green-600 transition-colors`}
                >
                    <Icon icon={Send} className="w-4 h-4 mr-2" /> Enviar E-mail
                </button>
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
                        <span className="text-xl font-bold text-gray-900">{historico_agendamentos.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Última Vez:</span>
                        <span className="text-sm font-medium text-gray-900">
                            {cliente.ultima_visita ? formatDistanceToNow(parseISO(cliente.ultima_visita), { addSuffix: true, locale: ptBR }) : 'Nunca visitou'}
                        </span>
                    </div>
                </div>
                
                {/* 3. Placeholder (pode ser usado para notas) */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200 space-y-3">
                    <h3 className="text-lg font-semibold text-gray-800">Notas e Preferências</h3>
                    <p className="text-sm text-gray-500 italic">
                        Aqui o profissional pode adicionar notas sobre as preferências do cliente (ex: "Sempre atrasa 5 minutos", "Prefere café preto").
                    </p>
                </div>
            </div>

            {/* Histórico de Agendamentos (Tabela) */}
            <div className="pt-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Histórico de Agendamentos</h3>
                
                <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Serviço
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Data/Hora
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Preço
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {historico_agendamentos.length > 0 ? (
                                historico_agendamentos.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {item.serviceName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {item.startTime ? format(item.startTime, 'dd/MM/yyyy HH:mm') : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                            R$ {(item.servicePrice || 0).toFixed(2).replace('.', ',')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                item.status === 'cancelado' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                                {item.status === 'cancelado' ? 'Cancelado' : 'Confirmado'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                                        Nenhum agendamento encontrado para este cliente.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* --- Renderiza o Modal --- */}
            {isModalOpen && (
                <EmailPromoModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    clienteId={clienteId}
                    salaoId={salaoId}
                    customerName={cliente.nome}
                    customerEmail={cliente.email}
                    salonName={salonNamePlaceholder} 
                />
            )}
        </div>
    );
}

export default ClienteDetailPage;