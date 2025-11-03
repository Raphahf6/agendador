// frontend/src/pages/painel/VisaoGeralPage.jsx
import React, { useState, useEffect, useRef } from 'react';
// REMOVIDO: { useParams }
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '@/firebaseConfig';
import {
    collection, query, where, getDocs, onSnapshot, orderBy, limit, Timestamp
} from "firebase/firestore";
import { format, startOfDay, endOfDay, addDays, subDays, formatDistanceToNow, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Loader2, Calendar, Users, BarChart2, Bell, CheckCircle, AlertTriangle, TrendingUp, CalendarDays,
    Filter, Check, Link as LinkIcon, Edit, UserPlus
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import axios from 'axios';
// IMPORTAÇÃO CRÍTICA: Use o hook do PainelLayout (assumindo que SalonProvider está configurado)
import { useSalon } from './PainelLayout';
// Ajuste o caminho conforme a estrutura real do seu projeto
const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- DEFINIÇÕES DE COR (idênticas) ---
const CIANO_TEXT_CLASS = 'text-cyan-800';
const CIANO_BG_CLASS = 'bg-cyan-800';
const CIANO_BG_HOVER_CLASS = 'hover:bg-cyan-900';
const CIANO_LIGHT_BG = 'bg-cyan-50';
const CIANO_RING_FOCUS = 'focus:ring-cyan-800';
const CIANO_FILL_COLOR = '#0E7490';

// --- Helper Ícone Simples (idêntico) ---
const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// --- Hook customizado para fechar dropdown ao clicar fora (idêntico) ---
function useOnClickOutside(ref, handler) {
    useEffect(() => {
        const listener = (event) => {
            if (!ref.current || ref.current.contains(event.target)) {
                return;
            }
            handler(event);
        };
        document.addEventListener("mousedown", listener);
        document.addEventListener("touchstart", listener);
        return () => {
            document.removeEventListener("mousedown", listener);
            document.removeEventListener("touchstart", listener);
        };
    }, [ref, handler]);
}
// --- Fim do Hook ---

// --- Componente ChartFilter (idêntico) ---
const ChartFilter = ({ currentPeriod, onPeriodChange, filterOptions }) => {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const dropdownRef = useRef(null);
    useOnClickOutside(dropdownRef, () => setIsFilterOpen(false));

    const handleFilterSelect = (value) => {
        onPeriodChange(value);
        setIsFilterOpen(false);
    };

    const currentLabel = filterOptions.find(opt => opt.value === currentPeriod)?.label || 'Período';

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center text-sm font-semibold transition-colors rounded-lg px-2 py-1 ${CIANO_LIGHT_BG} ${CIANO_TEXT_CLASS} hover:bg-cyan-100`}
                aria-expanded={isFilterOpen}
            >
                <Icon icon={Filter} className="w-4 h-4 mr-1" />
                {currentLabel}
            </button>
            {isFilterOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 focus:outline-none">
                    <div className="py-1">
                        {filterOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleFilterSelect(option.value)}
                                className={`w-full text-left flex items-center px-4 py-2 text-sm ${currentPeriod === option.value
                                    ? `font-semibold text-cyan-900 ${CIANO_LIGHT_BG}`
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                {currentPeriod === option.value && (
                                    <Icon icon={Check} className="w-4 h-4 mr-2 -ml-1" />
                                )}
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
// --- Fim ChartFilter ---

// --- Componente KpiCard (idêntico) ---
const KpiCard = ({
    title,
    value,
    icon: IconComp,
    isLoading,
    filterPeriod,
    onFilterChange,
    filterOptions
}) => {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const dropdownRef = useRef(null);
    useOnClickOutside(dropdownRef, () => setIsFilterOpen(false));
    const hasFilter = typeof onFilterChange === 'function';

    // Obtém o rótulo do filtro ativo ou usa o Título base
    const currentLabel = filterOptions?.find(opt => opt.value === filterPeriod)?.label || title;

    const handleFilterSelect = (value) => {
        onFilterChange(value);
        setIsFilterOpen(false);
    };

    const mainTitle = title;


    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between min-h-[100px]">
            <div className="flex justify-between items-start">
                {/* Título Principal Fixo + Rótulo do Filtro */}
                <p className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-700">{mainTitle}</span>
                    {hasFilter && `: ${currentLabel}`}
                </p>

                {hasFilter && (
                    <div className="relative inline-block text-left" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="h-6 w-6 text-gray-400 hover:text-gray-700 -mt-1 -mr-1 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                            title="Filtrar período"
                        >
                            <Icon icon={Filter} className="w-4 h-4" />
                            <span className="sr-only">Filtrar período</span>
                        </button>
                        {isFilterOpen && (
                            <div className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 focus:outline-none">
                                <div className="py-1">
                                    {filterOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => handleFilterSelect(option.value)}
                                            className={`w-full text-left flex items-center px-4 py-2 text-sm ${filterPeriod === option.value
                                                ? `font-semibold text-cyan-900 ${CIANO_LIGHT_BG}`
                                                : 'text-gray-700 hover:bg-gray-100'
                                                }`}
                                        >
                                            {filterPeriod === option.value && (
                                                <Icon icon={Check} className="w-4 h-4 mr-2 -ml-1" />
                                            )}
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="flex items-center space-x-3 mt-2">
                <div className={`p-2.5 rounded-full ${CIANO_LIGHT_BG} ${CIANO_TEXT_CLASS}`}>
                    <Icon icon={IconComp} className="w-5 h-5" />
                </div>
                {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                ) : (
                    <p className="text-3xl font-bold text-gray-900">{value ?? '-'}</p>
                )}
            </div>
        </div>
    );
};
// --- Fim KpiCard ---

// --- Componente ProximoAgendamentoItem (idêntico) ---
const ProximoAgendamentoItem = ({ agendamento }) => {
    const formattedTime = agendamento.startTime
        ? format(agendamento.startTime.toDate(), "dd/MM 'às' HH:mm', 'yy", { locale: ptBR })
        : 'Data inválida';

    return (
        <li className="flex items-start space-x-3 py-3 border-b border-gray-100 last:border-b-0">
            <div className={`p-1.5 rounded-full ${CIANO_LIGHT_BG} ${CIANO_TEXT_CLASS} mt-1`}>
                <Icon icon={Calendar} className="w-4 h-4" />
            </div>
            <div className="flex-1">
                <p className="text-sm text-gray-800 leading-snug">
                    <span className="font-semibold">{agendamento.serviceName || 'Serviço'}</span> com <span className="font-semibold">{agendamento.customerName || 'Cliente'}</span>
                </p>
                <p className="text-sm font-medium text-gray-500 mt-0.5">{formattedTime}</p>
            </div>
        </li>
    );
};
// --- Fim ProximoAgendamentoItem ---


// --- Componente Principal da Página ---
function VisaoGeralPage() {
    // REMOÇÃO: Não precisa mais do useParams!
    // const { salaoId } = useParams();

    // <<<< NOVO: Obtém o salaoId e outros dados globais do contexto >>>>
    const { salaoId } = useSalon();

    const navigate = useNavigate();
    const [agendamentosFoco, setAgendamentosFoco] = useState('hoje');
    const [kpiData, setKpiData] = useState({
        receitaEstimada: null,
        agendamentosFocoValor: null,
        novosClientesValor: null,
        hoje: null,
        prox7dias: null,
        novos24h: null
    });

    const [proximosAgendamentos, setProximosAgendamentos] = useState([]);
    const [novosClientesPeriodo, setNovosClientesPeriodo] = useState('hoje');
    const [agendamentosPeriodo, setAgendamentosPeriodo] = useState(7);
    const [chartData, setChartData] = useState([]);

    // Mantemos o loading de dados específicos desta página
    const [loadingKpi, setLoadingKpi] = useState(true);
    const [loadingProximos, setLoadingProximos] = useState(true);
    const [loadingChart, setLoadingChart] = useState(true);
    const [error, setError] = useState(null);

    const [receitaPeriodo, setReceitaPeriodo] = useState('hoje');
    const [receitaTitulo, setReceitaTitulo] = useState('Receita Estimada');
    const [linkCopied, setLinkCopied] = useState(false);
    const copyTimeoutRef = useRef(null);

    // --- Opções de Filtro (idênticas) ---
    const receitaFilterOptions = [
        { value: 'hoje', label: 'Hoje' },
        { value: 'semana', label: 'Próx. 7 Dias' },
        { value: 'mes', label: 'Mês Atual' }
    ];
    const agendamentosFilterOptions = [
        { value: 7, label: 'Últimos 7 Dias' },
        { value: 15, label: 'Últimos 15 Dias' },
        { value: 30, label: 'Últimos 30 Dias' },
    ];
    const novosClientesFilterOptions = [
        { value: 'hoje', label: 'Hoje' },
        { value: '7dias', label: 'Últimos 7 Dias' },
        { value: '30dias', label: 'Últimos 30 Dias' }
    ];

    // --- fetchKpiData (Agora usa salaoId do contexto) ---
    // Mantemos a função interna ao useEffect para evitar o erro de re-renderização
    const fetchKpiData = async () => {
        if (!salaoId || !auth.currentUser) return; // Garante que o salaoId existe

        setLoadingKpi(true);
        setLoadingChart(true);

        try {
            const token = await auth.currentUser.getIdToken();

            const response = await axios.get(`${API_BASE_URL}/admin/dashboard-data/${salaoId}`, {
                params: {
                    agendamentos_foco_periodo: agendamentosFoco,
                    novos_clientes_periodo: novosClientesPeriodo,
                    agendamentos_grafico_dias: agendamentosPeriodo,
                    receita_periodo: receitaPeriodo,
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = response.data;

            // --- ATUALIZAÇÃO DOS ESTADOS ---
            setKpiData(prev => ({
                ...prev,
                receitaEstimada: data.receita_estimada,
                agendamentosFocoValor: data.agendamentos_foco_valor,
                novosClientesValor: data.novos_clientes_valor,
            }));

            setChartData(data.chart_data);

            setLoadingKpi(false);
            setLoadingChart(false);

        } catch (err) {
            console.error("Erro ao buscar dados do Dashboard:", err);
            if (err.code === 'failed-precondition') { setError("Índice do Firestore necessário."); }
            else if (err.response?.status === 403) { setError("Acesso negado. Assinatura pendente ou expirada."); }
            else { setError(err.response?.data?.detail || "Não foi possível carregar os dados do dashboard."); }

            setLoadingKpi(false);
            setLoadingChart(false);
        }
    };

    // --- Listener Próximos Agendamentos (Firestore) ---
    // AGORA DEPENDE APENAS DE salaoId
    useEffect(() => {
        if (!salaoId) return; // Bloqueia se o ID ainda não chegou do contexto

        setLoadingProximos(true);
        const agendamentosRef = collection(db, 'cabeleireiros', salaoId, 'agendamentos');
        const q = query(
            agendamentosRef,
            where("startTime", ">=", Timestamp.now()),
            where("status", "!=", "cancelado"),
            orderBy("startTime", "asc"),
            limit(5)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const proximos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProximosAgendamentos(proximos);
            setLoadingProximos(false);
        }, (err) => {
            console.error("Erro no listener de próximos agendamentos:", err);
            if (err.code === 'failed-precondition') { setError("Índice do Firestore necessário para 'Próximos Agendamentos'. Verifique o console."); }
            else { setError("Erro ao carregar próximos agendamentos."); }
            setLoadingProximos(false);
        });
        return () => unsubscribe();
    }, [salaoId]); // Depende do salaoId do contexto

    // --- Busca KPIs e Gráfico (API) ---
    useEffect(() => {
        if (salaoId) { // Só busca se o salaoId for válido
            fetchKpiData();
        }
    }, [
        salaoId, // Novo: Gatilho inicial
        receitaPeriodo,
        agendamentosPeriodo,
        agendamentosFoco,
        novosClientesPeriodo
    ]);

    // --- Função Copiar Link (mantida) ---
    const copyLink = () => {
        if (!salaoId) return; // Garante que o ID existe antes de tentar copiar
        const publicUrl = `https://horalis.app/agendar/${salaoId}`;
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        navigator.clipboard.writeText(publicUrl).then(() => {
            setLinkCopied(true);
            toast.success("Link público copiado!");
            copyTimeoutRef.current = setTimeout(() => setLinkCopied(false), 2000);
        }).catch(err => {
            toast.error('Erro ao copiar link.');
            console.error('Erro ao copiar: ', err);
        });
    };
    useEffect(() => () => { if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current); }, []);

    // --- Helper para o Título do KPI Consolidado (mantido) ---
    const getAgendamentosFocoTitle = () => {
        const option = [
            { value: 'hoje', label: 'Agendamentos Hoje' },
            { value: 'prox7dias', label: 'Próx. 7 Dias' },
            { value: 'novos24h', label: 'Novos Agend. (24h)' }
        ].find(opt => opt.value === agendamentosFoco);
        return option ? option.label : 'Agendamentos';
    };


    // --- Renderização (Mantida) ---
    return (
        <div className="font-sans space-y-6">
            {/* Título e Botão Copiar Link */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className={`text-2xl font-bold text-gray-900 flex items-center ${CIANO_TEXT_CLASS}`}>
                    <Icon icon={BarChart2} className="w-6 h-6 mr-3" />
                    Visão Geral
                </h2>

               
            </div>

            {error && (
                <div className="p-4 bg-red-100 text-red-700 rounded-lg shadow border border-red-200 flex items-center gap-2">
                    <Icon icon={AlertTriangle} className="w-5 h-5 flex-shrink-0" /> <p>{error}</p>
                </div>
            )}

            {/* 1. KPIs (4 COLUNAS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">

                {/* 1. KPI CONSOLIDADO DE AGENDAMENTOS */}
                <KpiCard
                    title="Agendamentos em Foco"
                    value={kpiData.agendamentosFocoValor}
                    icon={CalendarDays}
                    isLoading={loadingKpi}
                    filterPeriod={agendamentosFoco}
                    onFilterChange={setAgendamentosFoco}
                    filterOptions={[
                        { value: 'hoje', label: 'Hoje' },
                        { value: 'prox7dias', label: 'Próx. 7 Dias' },
                        { value: 'novos24h', label: 'Novos (24h)' }
                    ]}
                />

                {/* 2. KPI RECEITA */}
                <KpiCard
                    title={receitaTitulo}
                    value={kpiData.receitaEstimada !== null ? `R$ ${kpiData.receitaEstimada}` : null}
                    icon={TrendingUp} isLoading={loadingKpi}
                    filterPeriod={receitaPeriodo} onFilterChange={setReceitaPeriodo} filterOptions={receitaFilterOptions}
                />

                {/* 3. NOVO KPI CLIENTES */}
                <KpiCard
                    title="Novos Clientes"
                    value={kpiData.novosClientesValor}
                    icon={UserPlus}
                    isLoading={loadingKpi}
                    filterPeriod={novosClientesPeriodo}
                    onFilterChange={setNovosClientesPeriodo}
                    filterOptions={novosClientesFilterOptions}
                />

                {/* 4. Coluna extra (Total no Mês) */}
                <KpiCard
                    title="Total no Mês"
                    value={kpiData.novos24h} icon={Users} isLoading={loadingKpi} />

            </div>

            {/* 2. Gráfico e Próximos Agendamentos (Grid de 2 colunas) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Coluna Gráfico */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Agendamentos Históricos</h3>

                        {/* Filtro do Gráfico (idêntico) */}
                        <ChartFilter
                            currentPeriod={agendamentosPeriodo}
                            onPeriodChange={setAgendamentosPeriodo}
                            filterOptions={agendamentosFilterOptions}
                        />
                    </div>

                    {loadingChart ? (
                        <div className="flex justify-center items-center h-64 sm:h-80">
                            <Loader2 className={`w-8 h-8 animate-spin ${CIANO_TEXT_CLASS}`} />
                        </div>
                    ) : chartData.length === 0 ? (
                        <div className="flex justify-center items-center h-64 sm:h-80 text-gray-500">
                            <p>Nenhum agendamento encontrado para este período.</p>
                        </div>
                    ) : (
                        <div className="w-full h-64 sm:h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                                        labelStyle={{ color: '#000', fontWeight: 'bold' }}
                                    />
                                    <Bar dataKey="Agendamentos" fill={CIANO_FILL_COLOR} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Coluna Próximos Agendamentos */}
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                        <Icon icon={Bell} className={`w-5 h-5 mr-2 ${CIANO_TEXT_CLASS}`} />
                        Próximos Agendamentos
                    </h3>
                    {loadingProximos ? (
                        <div className="flex justify-center py-4"> <Loader2 className={`w-6 h-6 animate-spin ${CIANO_TEXT_CLASS}`} /> </div>
                    ) : proximosAgendamentos.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">Nenhum agendamento futuro.</p>
                    ) : (
                        <ul className="space-y-1 max-h-[340px] overflow-y-auto">
                            {proximosAgendamentos.map(agd => <ProximoAgendamentoItem key={agd.id} agendamento={agd} />)}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

export default VisaoGeralPage;