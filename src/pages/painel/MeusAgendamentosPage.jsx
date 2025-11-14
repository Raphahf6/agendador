import React, { useState, useEffect, useMemo } from 'react';
import { 
    Calendar, Search, Filter, User, Clock, CheckCircle, 
    AlertCircle, XCircle, DollarSign, ChevronDown, Scissors 
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db, auth } from '@/firebaseConfig';
import { useSalon } from './PainelLayout';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import HourglassLoading from '@/components/HourglassLoading';
import axios from 'axios';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- Helper de Cores e Status ---
const getStatusConfig = (status) => {
    switch (status) {
        case 'confirmado':
        case 'approved':
            return { color: 'bg-green-100 text-green-700', label: 'Confirmado', icon: CheckCircle };
        case 'pending_payment':
        case 'pending':
            return { color: 'bg-yellow-100 text-yellow-700', label: 'Pendente', icon: AlertCircle };
        case 'cancelado':
        case 'cancelled':
            return { color: 'bg-red-100 text-red-700', label: 'Cancelado', icon: XCircle };
        default:
            return { color: 'bg-gray-100 text-gray-600', label: status, icon: Clock };
    }
};

// --- Componente Card de Agendamento ---
const AgendamentoCard = ({ data }) => {
    const statusConfig = getStatusConfig(data.status);
    const StatusIcon = statusConfig.icon;
    
    // Formatação de Data Amigável
    const dateObj = data.startTime ? data.startTime.toDate() : new Date();
    let dateLabel = format(dateObj, "dd 'de' MMMM", { locale: ptBR });
    if (isToday(dateObj)) dateLabel = "Hoje";
    else if (isTomorrow(dateObj)) dateLabel = "Amanhã";

    const timeLabel = format(dateObj, "HH:mm");

    return (
        <div className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center gap-4 relative overflow-hidden">
            
            {/* Barra lateral de status */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusConfig.color.replace('bg-', 'bg-opacity-50 bg-')}`}></div>

            {/* Coluna Horário */}
            <div className="flex flex-col items-center justify-center min-w-[70px] bg-gray-50 rounded-xl p-2 border border-gray-100">
                <span className="text-lg font-bold text-gray-900">{timeLabel}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{dateLabel}</span>
            </div>

            {/* Detalhes Principais */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-gray-900 truncate">{data.customerName}</h3>
                    {data.paymentStatus === 'paid_signal' && (
                        <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded-full flex items-center gap-1 border border-green-100">
                            <DollarSign className="w-3 h-3" /> Sinal Pago
                        </span>
                    )}
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                        <Scissors className="w-4 h-4 text-cyan-600" />
                        {data.serviceName}
                    </span>
                    {data.professionalName && (
                        <span className="flex items-center gap-1.5">
                            <User className="w-4 h-4 text-purple-500" />
                            {data.professionalName}
                        </span>
                    )}
                </div>
            </div>

            {/* Status e Valor */}
            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto mt-2 sm:mt-0">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${statusConfig.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" /> {statusConfig.label}
                </span>
                <span className="text-sm font-bold text-gray-900 mt-1">
                    R$ {data.servicePrice ? Number(data.servicePrice).toFixed(2).replace('.', ',') : '0,00'}
                </span>
            </div>
        </div>
    );
};

// --- PÁGINA PRINCIPAL ---
export default function MeusAgendamentosPage() {
    const { salaoId, salonDetails } = useSalon();
    const [agendamentos, setAgendamentos] = useState([]);
    const [professionals, setProfessionals] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filtros
    const [filterProfessional, setFilterProfessional] = useState('todos');
    const [filterStatus, setFilterStatus] = useState('todos');
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Carregar Lista de Profissionais (para o filtro)
    useEffect(() => {
        const fetchPros = async () => {
            if (!salaoId || !auth.currentUser) return;
            try {
                const token = await auth.currentUser.getIdToken();
                const res = await axios.get(`${API_BASE_URL}/admin/equipe`, { headers: { Authorization: `Bearer ${token}` } });
                setProfessionals(res.data);
            } catch (e) { console.error("Erro ao carregar equipe", e); }
        };
        fetchPros();
    }, [salaoId]);

    // 2. Listener Realtime de Agendamentos (Futuros)
    useEffect(() => {
        if (!salaoId) return;
        setLoading(true);

        // Busca agendamentos de hoje em diante
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const q = query(
            collection(db, 'cabeleireiros', salaoId, 'agendamentos'),
            where("startTime", ">=", startOfToday),
            orderBy("startTime", "asc"),
            limit(100) // Limite de segurança para não travar a UI
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAgendamentos(list);
            setLoading(false);
        }, (error) => {
            console.error("Erro no listener:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [salaoId]);

    // 3. Lógica de Filtragem Local
    const filteredList = useMemo(() => {
        return agendamentos.filter(item => {
            // Filtro de Texto (Nome Cliente ou Serviço)
            const searchMatch = 
                item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.serviceName.toLowerCase().includes(searchTerm.toLowerCase());
            
            // Filtro de Profissional
            const proMatch = filterProfessional === 'todos' || item.professionalId === filterProfessional;

            // Filtro de Status
            let statusMatch = true;
            if (filterStatus === 'confirmados') statusMatch = item.status === 'confirmado';
            if (filterStatus === 'pendentes') statusMatch = item.status === 'pending_payment';
            if (filterStatus === 'cancelados') statusMatch = item.status === 'cancelado';

            return searchMatch && proMatch && statusMatch;
        });
    }, [agendamentos, searchTerm, filterProfessional, filterStatus]);

    if (loading) return <div className="h-96 flex items-center justify-center"><HourglassLoading message="Buscando agenda..." /></div>;

    return (
        <div className="font-sans pb-20 max-w-5xl mx-auto">
            
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                        <Calendar className="w-6 h-6 text-cyan-700" />
                    </div>
                    Meus Agendamentos
                </h1>
                <p className="text-gray-500 mt-1 ml-12 text-sm">Visualize e gerencie os compromissos futuros da equipe.</p>
            </div>

            {/* Barra de Filtros (Card) */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Busca */}
                <div className="md:col-span-5 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar cliente ou serviço..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filtro Profissional */}
                <div className="md:col-span-4 relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select 
                        className="w-full pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-gray-700 font-medium"
                        value={filterProfessional}
                        onChange={(e) => setFilterProfessional(e.target.value)}
                    >
                        <option value="todos">Todos os Profissionais</option>
                        {professionals.map(pro => (
                            <option key={pro.id} value={pro.id}>{pro.nome}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Filtro Status */}
                <div className="md:col-span-3 relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select 
                        className="w-full pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-gray-700 font-medium"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="todos">Todos Status</option>
                        <option value="confirmados">Confirmados</option>
                        <option value="pendentes">Pendentes</option>
                        <option value="cancelados">Cancelados</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Lista de Agendamentos */}
            <div className="space-y-3">
                {filteredList.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">Nenhum agendamento encontrado.</p>
                        {searchTerm || filterProfessional !== 'todos' ? (
                            <button 
                                onClick={() => { setSearchTerm(''); setFilterProfessional('todos'); setFilterStatus('todos'); }}
                                className="mt-2 text-sm text-cyan-600 font-bold hover:underline"
                            >
                                Limpar filtros
                            </button>
                        ) : null}
                    </div>
                ) : (
                    filteredList.map(agendamento => (
                        <AgendamentoCard key={agendamento.id} data={agendamento} />
                    ))
                )}
            </div>
        </div>
    );
}