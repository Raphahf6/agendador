import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '@/firebaseConfig';
import {
    collection, query, where, getDocs, onSnapshot, orderBy, limit, Timestamp
} from "firebase/firestore";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Loader2, Calendar, Users, BarChart2, Bell, TrendingUp, Filter, Check, UserPlus, DollarSign, Clock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import axios from 'axios';
import { useSalon } from './PainelLayout';
import HourglassLoading from '@/components/HourglassLoading';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// Hook para clicar fora
function useOnClickOutside(ref, handler) {
    useEffect(() => {
        const listener = (event) => {
            if (!ref.current || ref.current.contains(event.target)) return;
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

// --- Componente de Filtro Moderno ---
const ChartFilter = ({ currentPeriod, onPeriodChange, filterOptions, primaryColor }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);
    useOnClickOutside(ref, () => setIsOpen(false));
    const label = filterOptions.find(opt => opt.value === currentPeriod)?.label || 'Período';

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center text-xs font-semibold bg-white border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
            >
                <Icon icon={Filter} className="w-3 h-3 mr-1.5" />
                {label}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {filterOptions.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => { onPeriodChange(opt.value); setIsOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-xs font-medium flex items-center transition-colors ${currentPeriod === opt.value ? 'bg-gray-50 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            {currentPeriod === opt.value && <Icon icon={Check} className="w-3 h-3 mr-2 text-green-500" />}
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Componente KPI Card Premium ---
const KpiCard = ({ title, value, icon: IconComp, isLoading, colorClass, bgClass, filterPeriod, onFilterChange, filterOptions, primaryColor }) => {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group transition-all duration-300 hover:shadow-md">
            {/* Header do Card */}
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${bgClass}`}>
                    <Icon icon={IconComp} className={`w-6 h-6 ${colorClass}`} />
                </div>
                {filterOptions && (
                    <ChartFilter
                        currentPeriod={filterPeriod}
                        onPeriodChange={onFilterChange}
                        filterOptions={filterOptions}
                        primaryColor={primaryColor}
                    />
                )}
            </div>

            {/* Valor e Título */}
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                {isLoading ? (
                    <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
                ) : (
                    <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        {value ?? '-'}
                    </h3>
                )}
            </div>
        </div>
    );
};

// --- Componente Item de Agendamento (Timeline) ---
const TimelineItem = ({ agendamento, primaryColor }) => {
    const time = agendamento.startTime ? format(agendamento.startTime.toDate(), "HH:mm") : '--:--';
    const date = agendamento.startTime ? format(agendamento.startTime.toDate(), "dd/MM") : '--/--';

    return (
        <div className="flex group p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
            {/* Coluna Hora */}
            <div className="flex flex-col items-center mr-4 pt-1">
                <span className="text-sm font-bold text-gray-900">{time}</span>
                <span className="text-[10px] font-medium text-gray-400 uppercase">{date}</span>
            </div>

            {/* Linha Vertical (Visual) */}
            <div className="w-1 bg-gray-100 rounded-full mr-4 group-hover:bg-gray-200 transition-colors" style={{ backgroundColor: `${primaryColor}20` }}></div>

            {/* Detalhes */}
            <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900 mb-0.5">{agendamento.customerName || 'Cliente'}</h4>
                <p className="text-xs text-gray-500 font-medium flex items-center">
                    {agendamento.serviceName || 'Serviço'}
                </p>
            </div>

            {/* Status (Exemplo simples) */}
            <div className="self-center">
                <div className="w-2 h-2 rounded-full bg-green-500" title="Confirmado"></div>
            </div>
        </div>
    );
};


export default function VisaoGeralPage() {
    const { salaoId, salonDetails } = useSalon(); // Pega cores do contexto
    const navigate = useNavigate();

    // Cores
    const primaryColor = salonDetails?.cor_primaria || '#0E7490';

    // Estados de Filtro
    const [agendamentosFoco, setAgendamentosFoco] = useState('hoje');
    const [novosClientesPeriodo, setNovosClientesPeriodo] = useState('hoje');
    const [receitaPeriodo, setReceitaPeriodo] = useState('hoje');
    const [agendamentosPeriodo, setAgendamentosPeriodo] = useState(7);

    // Estados de Dados
    const [kpiData, setKpiData] = useState({});
    const [chartData, setChartData] = useState([]);
    const [proximosAgendamentos, setProximosAgendamentos] = useState([]);

    // Loadings
    const [loadingKpi, setLoadingKpi] = useState(true);
    const [loadingProximos, setLoadingProximos] = useState(true);
    const [error, setError] = useState(null);

    // Opções de Filtro
    const periodOptions = [
        { value: 'hoje', label: 'Hoje' },
        { value: 'semana', label: '7 Dias' },
        { value: 'mes', label: 'Mês' }
    ];
    const chartOptions = [
        { value: 7, label: '7 Dias' },
        { value: 15, label: '15 Dias' },
        { value: 30, label: '30 Dias' },
    ];

    // Fetch KPI Data
    useEffect(() => {
        const fetchData = async () => {
            if (!salaoId || !auth.currentUser) return;
            setLoadingKpi(true);
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
                setKpiData(response.data);
                setChartData(response.data.chart_data);
            } catch (err) {
                console.error(err);
                setError("Erro ao carregar dados.");
            } finally {
                setLoadingKpi(false);
            }
        };
        fetchData();
    }, [salaoId, agendamentosFoco, novosClientesPeriodo, receitaPeriodo, agendamentosPeriodo]);

    // Fetch Próximos Agendamentos (Firestore Realtime)
    useEffect(() => {
        if (!salaoId) return;
        const q = query(
            collection(db, 'cabeleireiros', salaoId, 'agendamentos'),
            where("startTime", ">=", Timestamp.now()),
            where("status", "!=", "cancelado"),
            orderBy("startTime", "asc"),
            limit(5)
        );
        const unsubscribe = onSnapshot(q, (snap) => {
            setProximosAgendamentos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoadingProximos(false);
        });
        return () => unsubscribe();
    }, [salaoId]);

    if (!salaoId) return <div className="p-8 text-center"><HourglassLoading /></div>;

    return (
        <div className="font-sans pb-20">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                        <Icon icon={BarChart2} className="w-6 h-6" style={{ color: primaryColor }} />
                    </div>
                    Visão Geral
                </h1>
                <p className="text-gray-500 mt-1 ml-12 text-sm">Acompanhe o desempenho do seu negócio em tempo real.</p>
            </div>

            {error && <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">{error}</div>}

            {/* Grid de KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

                <KpiCard
                    title="Agendamentos"
                    value={kpiData.agendamentos_foco_valor}
                    icon={Calendar}
                    colorClass="text-blue-600"
                    bgClass="bg-blue-50"
                    filterPeriod={agendamentosFoco}
                    onFilterChange={setAgendamentosFoco}
                    filterOptions={[{ value: 'hoje', label: 'Hoje' }, { value: 'prox7dias', label: '7 Dias' }]}
                    isLoading={loadingKpi}
                    primaryColor={primaryColor}
                />

                <KpiCard
                    title="Receita Estimada"
                    value={kpiData.receita_estimada ? `R$ ${kpiData.receita_estimada}` : null}
                    icon={DollarSign}
                    colorClass="text-green-600"
                    bgClass="bg-green-50"
                    filterPeriod={receitaPeriodo}
                    onFilterChange={setReceitaPeriodo}
                    filterOptions={periodOptions}
                    isLoading={loadingKpi}
                    primaryColor={primaryColor}
                />

                <KpiCard
                    title="Novos Clientes"
                    value={kpiData.novos_clientes_valor}
                    icon={UserPlus}
                    colorClass="text-purple-600"
                    bgClass="bg-purple-50"
                    filterPeriod={novosClientesPeriodo}
                    onFilterChange={setNovosClientesPeriodo}
                    filterOptions={periodOptions}
                    isLoading={loadingKpi}
                    primaryColor={primaryColor}
                />

                <KpiCard
                    title="Total no Mês"
                    value={kpiData.novos24h} // Ajuste conforme seu backend retorna o total do mês
                    icon={Users}
                    colorClass="text-orange-600"
                    bgClass="bg-orange-50"
                    isLoading={loadingKpi}
                    primaryColor={primaryColor}
                />
            </div>

            {/* Conteúdo Principal: Gráfico + Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Coluna 1: Gráfico (2/3) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-900">Fluxo de Agendamentos</h3>
                        <ChartFilter
                            currentPeriod={agendamentosPeriodo}
                            onPeriodChange={setAgendamentosPeriodo}
                            filterOptions={chartOptions}
                            primaryColor={primaryColor}
                        />
                    </div>

                    <div className="h-80 w-full">
                        {loadingKpi ? (
                            <div className="h-full flex items-center justify-center"><HourglassLoading /></div>
                        ) : chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                                    <Tooltip
                                        cursor={{ fill: '#F3F4F6' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="Agendamentos" fill={primaryColor} radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">Sem dados para o período.</div>
                        )}
                    </div>
                </div>

                {/* Coluna 2: Próximos Agendamentos (1/3) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-900">Próximos</h3>
                        <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">Em breve</span>
                    </div>

                    {loadingProximos ? (
                        <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
                    ) : proximosAgendamentos.length > 0 ? (
                        <div className="space-y-2">
                            {proximosAgendamentos.map(agd => (
                                <TimelineItem key={agd.id} agendamento={agd} primaryColor={primaryColor} />
                            ))}
                        </div>
                    ) : (
                        <div className="py-10 text-center text-gray-400 text-sm">
                            Nenhum agendamento futuro.
                        </div>
                    )}

                    <button className="w-full mt-6 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-dashed border-gray-200 hover:border-gray-300">
                        Ver Agenda Completa
                    </button>
                </div>

            </div>
        </div>
    );
}