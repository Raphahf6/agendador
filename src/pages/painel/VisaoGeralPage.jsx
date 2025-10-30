// frontend/src/pages/painel/VisaoGeralPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { auth, db } from '@/firebaseConfig';
import {
    collection, query, where, getDocs, onSnapshot, orderBy, limit, Timestamp
} from "firebase/firestore";
import { format, startOfDay, endOfDay, addDays, subDays, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Loader2, Calendar, Users, BarChart2, Bell, CheckCircle, AlertTriangle, TrendingUp, CalendarPlus,
    Filter, Check, CalendarDays, ArrowRight, Copy, Link as LinkIcon, Edit // Importado Copy e LinkIcon
} from 'lucide-react';
// Importa Recharts
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';

// --- DEFINIÇÕES DE COR (Baseado na sua Landing Page estável) ---
const CIANO_TEXT_CLASS = 'text-cyan-800'; // Usando 800 como na sua Landing Page
const CIANO_BG_CLASS = 'bg-cyan-800';
const CIANO_BG_HOVER_CLASS = 'hover:bg-cyan-900'; // 900 para hover
const CIANO_LIGHT_BG = 'bg-cyan-50';
const CIANO_RING_FOCUS = 'focus:ring-cyan-800';
const CIANO_FILL_COLOR = '#0E7490'; // Hex code para cyan-800

// --- Helper Ícone Simples ---
const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// --- Hook customizado para fechar dropdown ao clicar fora ---
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

// --- Componente KpiCard (Com filtro customizado) ---
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

    const handleFilterSelect = (value) => {
        onFilterChange(value);
        setIsFilterOpen(false);
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between min-h-[100px]">
            <div className="flex justify-between items-start">
                <p className="text-sm text-gray-500">{title}</p>
                {hasFilter && (
                    <div className="relative inline-block text-left" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="h-6 w-6 text-gray-400 hover:text-gray-700 -mt-1 -mr-1 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
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
                                            className={`w-full text-left flex items-center px-4 py-2 text-sm ${
                                                filterPeriod === option.value
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

// --- Componente ProximoAgendamentoItem ---
const ProximoAgendamentoItem = ({ agendamento }) => {
    const formattedTime = agendamento.startTime
        ? format(agendamento.startTime.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR })
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
    const { salaoId } = useParams();
    const navigate = useNavigate();
    const [kpiData, setKpiData] = useState({ hoje: null, prox7dias: null, novos24h: null, receitaEstimada: null });
    const [proximosAgendamentos, setProximosAgendamentos] = useState([]);
    const [chartData7Days, setChartData7Days] = useState([]);
    const [loadingKpi, setLoadingKpi] = useState(true);
    const [loadingProximos, setLoadingProximos] = useState(true);
    const [loadingChart, setLoadingChart] = useState(true);
    const [error, setError] = useState(null);
    const [receitaPeriodo, setReceitaPeriodo] = useState('hoje');
    const [receitaTitulo, setReceitaTitulo] = useState('Receita Estimada (Hoje)');
    const [linkCopied, setLinkCopied] = useState(false);
    const copyTimeoutRef = useRef(null);

    const receitaFilterOptions = [
        { value: 'hoje', label: 'Hoje' },
        { value: 'semana', label: 'Próx. 7 Dias' },
        { value: 'mes', label: 'Próx. 30 Dias' }
    ];

    // --- fetchKpiData (com dados do gráfico e filtros) ---
    const fetchKpiData = useCallback(async () => {
        if (!salaoId || !auth.currentUser) return;
        setLoadingKpi(true); setLoadingChart(true);
        // setError(null); // Não limpa erro para usuário ver

        try {
            const agendamentosRef = collection(db, 'cabeleireiros', salaoId, 'agendamentos');
            const now = new Date();
            const hojeInicio = startOfDay(now);
            const amanhaInicio = startOfDay(addDays(now, 1));
            const prox7DiasFim = startOfDay(addDays(now, 7));
            const ultimas24h = subDays(now, 1);
            const ultimos7DiasInicio = startOfDay(subDays(now, 6));

            // --- Queries de Contagem (com filtro "cancelado") ---
            const hojeQuery = query(agendamentosRef, where("startTime", ">=", Timestamp.fromDate(hojeInicio)), where("startTime", "<", Timestamp.fromDate(amanhaInicio)), where("status", "!=", "cancelado"));
            const prox7DiasQuery = query(agendamentosRef, where("startTime", ">=", Timestamp.fromDate(hojeInicio)), where("startTime", "<", Timestamp.fromDate(prox7DiasFim)), where("status", "!=", "cancelado"));
            const novos24hQuery = query(agendamentosRef, where("createdAt", ">=", Timestamp.fromDate(ultimas24h)), where("status", "!=", "cancelado"));
            
            const [hojeSnapshot, prox7DiasSnapshot, novos24hSnapshot] = await Promise.all([
                getDocs(hojeQuery), getDocs(prox7DiasQuery), getDocs(novos24hQuery)
            ]);
            const countHoje = hojeSnapshot.size;
            const countProx7Dias = prox7DiasSnapshot.size;
            const countNovos24h = novos24hSnapshot.size;

            // --- Query de Receita (com filtro "cancelado") ---
            let receitaStartDate, receitaEndDate, newTitulo;
            if (receitaPeriodo === 'hoje') {
                receitaStartDate = hojeInicio; receitaEndDate = endOfDay(now); newTitulo = 'Receita Prevista (Hoje)';
            } else if (receitaPeriodo === 'semana') {
                receitaStartDate = hojeInicio; receitaEndDate = endOfDay(addDays(now, 7)); newTitulo = 'Receita (7d)';
            } else { // 'mes'
                receitaStartDate = hojeInicio; receitaEndDate = endOfDay(addDays(now, 30)); newTitulo = 'Receita (30d)';
            }
            setReceitaTitulo(newTitulo);

            const receitaQuery = query(agendamentosRef, where("startTime", ">=", Timestamp.fromDate(receitaStartDate)), where("startTime", "<=", Timestamp.fromDate(receitaEndDate)), where("status", "!=", "cancelado"));
            const receitaSnapshot = await getDocs(receitaQuery);
            let receitaEstimada = 0;
            receitaSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.servicePrice != null && typeof data.servicePrice === 'number') {
                    receitaEstimada += data.servicePrice;
                }
            });
            const receitaFormatada = receitaEstimada.toFixed(2).replace('.', ',');

            setKpiData({
                hoje: countHoje, prox7dias: countProx7Dias, novos24h: countNovos24h,
                receitaEstimada: receitaFormatada,
            });
            setLoadingKpi(false);

            // --- Query para Gráfico (com filtro "cancelado") ---
            const chartQuery = query(agendamentosRef, where("startTime", ">=", Timestamp.fromDate(ultimos7DiasInicio)), where("startTime", "<=", Timestamp.fromDate(endOfDay(now))), where("status", "!=", "cancelado"));
            const chartSnapshot = await getDocs(chartQuery);
            
            const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            let diasArray = [];
            for (let i = 6; i >= 0; i--) {
                const data = subDays(now, i);
                diasArray.push({
                    name: diasDaSemana[data.getDay()],
                    Agendamentos: 0,
                    fullDate: format(data, 'yyyy-MM-dd')
                });
            }
            chartSnapshot.forEach(doc => {
                const dataAgendamento = doc.data().startTime.toDate();
                const diaFormatado = format(dataAgendamento, 'yyyy-MM-dd');
                const diaIndex = diasArray.findIndex(d => d.fullDate === diaFormatado);
                if (diaIndex !== -1) { diasArray[diaIndex].Agendamentos++; }
            });
            
            setChartData7Days(diasArray);
            setLoadingChart(false);
        } catch (err) {
            console.error("Erro ao buscar dados do Dashboard:", err);
            if (err.code === 'failed-precondition') { setError("Índice do Firestore necessário. Verifique o console de debug (F12) para o link de criação do índice."); }
            else { setError("Não foi possível carregar os dados do dashboard."); }
            setLoadingKpi(false); setLoadingChart(false);
        }
    }, [salaoId, receitaPeriodo]);

    // --- Listener Próximos Agendamentos (com filtro "cancelado") ---
    useEffect(() => {
        if (!salaoId) return;
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
    }, [salaoId]);

    // Busca KPIs
    useEffect(() => { fetchKpiData(); }, [fetchKpiData]);

    // --- Função Copiar Link ---
    const copyLink = () => {
        const publicUrl = `https://horalis.app/agendar/${salaoId}`; // <<< USANDO NOVO DOMÍNIO
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
    // Cleanup do timeout
    useEffect(() => () => { if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current); }, []);

    // --- Renderização ---
    return (
        <div className="font-sans space-y-6">
            {/* <<< ALTERADO: Título e Botão Copiar Link lado a lado >>> */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className={`text-2xl font-bold text-gray-900 flex items-center ${CIANO_TEXT_CLASS}`}>
                    <Icon icon={BarChart2} className="w-6 h-6 mr-3" />
                    Visão Geral
                </h2>
                
                {/* Botão Conciso de Copiar Link */}
                <button
                    type="button"
                    onClick={copyLink}
                    className={`flex-shrink-0 flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 ease-in-out shadow-sm ${
                        linkCopied
                        ? 'bg-green-100 text-green-700' // Verde quando copiado
                        : `${CIANO_BG_CLASS} text-white ${CIANO_BG_HOVER_CLASS}` // Ciano normal
                    }`}
                >
                    <Icon icon={linkCopied ? Check : LinkIcon} className="w-4 h-4 mr-2"/>
                    {linkCopied ? "Link Copiado!" : "Link de Agendamentos"}
                </button>
            </div>
            {/* <<< FIM DA ALTERAÇÃO >>> */}


            {error && (
                <div className="p-4 bg-red-100 text-red-700 rounded-lg shadow border border-red-200 flex items-center gap-2">
                    <Icon icon={AlertTriangle} className="w-5 h-5 flex-shrink-0"/> <p>{error}</p>
                </div>
            )}

            {/* 1. KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <KpiCard title="Agendamentos Hoje" value={kpiData.hoje} icon={Calendar} isLoading={loadingKpi} />
                <KpiCard
                    title={receitaTitulo}
                    value={kpiData.receitaEstimada !== null ? `R$ ${kpiData.receitaEstimada}` : null}
                    icon={TrendingUp} isLoading={loadingKpi}
                    filterPeriod={receitaPeriodo} onFilterChange={setReceitaPeriodo} filterOptions={receitaFilterOptions}
                />
                <KpiCard title="Agend. Próx. 7 Dias" value={kpiData.prox7dias} icon={CalendarDays} isLoading={loadingKpi} />
                <KpiCard title="Novos Agend. (24h)" value={kpiData.novos24h} icon={Users} isLoading={loadingKpi} />
            </div>

            {/* <<< REMOVIDO: Card "Ações Rápidas" >>> */}

            {/* 2. Gráfico e Próximos Agendamentos (Grid de 2 colunas) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Coluna Gráfico */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Agendamentos (Últimos 7 Dias)</h3>
                    {loadingChart ? (
                        <div className="flex justify-center items-center h-64 sm:h-80">
                            <Loader2 className={`w-8 h-8 animate-spin ${CIANO_TEXT_CLASS}`} />
                        </div>
                    ) : (
                        <div className="w-full h-64 sm:h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData7Days} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
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
                        <Icon icon={Bell} className={`w-5 h-5 mr-2 ${CIANO_TEXT_CLASS}`}/>
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