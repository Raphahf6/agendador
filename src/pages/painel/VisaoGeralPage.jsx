import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '@/firebaseConfig';
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { format, startOfDay, endOfDay } from 'date-fns';
import { 
    Calendar, TrendingUp, DollarSign, 
    Clock, ArrowRight, Zap, MessageCircle, Eye, EyeOff, BarChart2, Activity
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import axios from 'axios';
import { useSalon } from './PainelLayout';
import HourglassLoading from '@/components/HourglassLoading';

const API_BASE_URL = "https://api-agendador-2n55.onrender.com/api/v1";

// --- COMPONENTES DE APOIO ---

const KpiCard = ({ title, value, icon: IconComp, colorClass, bgClass, isPrivate, showPrivate }) => (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full relative overflow-hidden group">
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500 ${colorClass}`}>
            <IconComp className="w-16 h-16" />
        </div>
        
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className={`p-3 rounded-2xl ${bgClass} ${colorClass}`}>
                <IconComp className="w-6 h-6" />
            </div>
        </div>
        
        <div className="relative z-10">
            <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {isPrivate && !showPrivate ? "R$ ••••" : value}
            </h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">{title}</p>
        </div>
    </div>
);

const NextClientItem = ({ agendamento }) => {
    const time = agendamento.startTime ? format(agendamento.startTime.toDate(), "HH:mm") : '--:--';
    const whatsappLink = `https://wa.me/${agendamento.customerPhone?.replace(/\D/g, '')}`;

    return (
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all group">
            <div className="flex-shrink-0 w-14 h-14 bg-white rounded-xl flex flex-col items-center justify-center border border-gray-200 shadow-sm">
                <span className="text-lg font-bold text-gray-900">{time}</span>
            </div>
            
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 truncate">{agendamento.customerName}</h4>
                <p className="text-sm text-gray-500 truncate">{agendamento.serviceName}</p>
            </div>

            <a 
                href={whatsappLink} 
                target="_blank" 
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-green-100 text-green-600 hover:bg-green-500 hover:text-white transition-colors"
            >
                <MessageCircle className="w-5 h-5" />
            </a>
        </div>
    );
};

// --- PÁGINA PRINCIPAL ---

export default function VisaoGeralPage() {
    const { salaoId, salonDetails } = useSalon();
    const primaryColor = salonDetails?.cor_primaria || '#0E7490';
    const navigate = useNavigate();

    // Estados
    const [loading, setLoading] = useState(true);
    const [showPrivate, setShowPrivate] = useState(false); 
    const [todayStats, setTodayStats] = useState({ count: 0, revenue: 0 });
    const [nextAppointments, setNextAppointments] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [monthRevenue, setMonthRevenue] = useState(0);

    // 1. Listener Realtime (Regra Restritiva: Apenas 'confirmado')
    useEffect(() => {
        if (!salaoId) return;
        
        const today = new Date();
        const start = startOfDay(today);
        const end = endOfDay(today);

        const qToday = query(
            collection(db, 'cabeleireiros', salaoId, 'agendamentos'),
            where("startTime", ">=", start),
            where("startTime", "<=", end)
        );

        const qNext = query(
            collection(db, 'cabeleireiros', salaoId, 'agendamentos'),
            where("startTime", ">=", new Date()),
            where("status", "==", "confirmado"), // Lista apenas os confirmados na lateral
            orderBy("startTime", "asc"),
            limit(5)
        );

        const unsubscribeToday = onSnapshot(qToday, (snapshot) => {
            let count = 0;
            let revenue = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                // --- REGRA RESTRITIVA: Só entra no cálculo se for 'confirmado' ---
                if (data.status === 'confirmado') {
                    count++;
                    revenue += parseFloat(data.servicePrice || 0);
                }
            });
            setTodayStats({ count, revenue });
        });

        const unsubscribeNext = onSnapshot(qNext, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNextAppointments(list);
            setLoading(false);
        });

        return () => { unsubscribeToday(); unsubscribeNext(); };
    }, [salaoId]);

    // 2. Fetch Dados do Gráfico e Mês (Garante que a API siga a mesma regra)
    // 2. FETCH DADOS HISTÓRICOS - CORRIGIDO COM FILTRO RESTRITIVO
useEffect(() => {
    const fetchFinancials = async () => {
        if (!salaoId || !auth.currentUser) return;
        try {
            const token = await auth.currentUser.getIdToken();
            const response = await axios.get(`${API_BASE_URL}/admin/financeiro/resumo`, {
                params: { 
                    period: 'month',
                    status: 'confirmado' 
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // --- FILTRO DE SEGURANÇA NO FRONTEND ---
            // Se o seu backend não estiver filtrando corretamente, 
            // garantimos que o total_revenue reflita apenas o que é confirmado
            // Caso o backend envie uma lista de transações em 'chart_data'
            const revenueConfirmada = response.data.chart_data.reduce((acc, dia) => {
                return acc + (dia.entradas_confirmadas || 0); 
            }, 0);

            // Se o seu backend já envia o campo total_revenue, mas ele veio errado:
            // Vamos usar o valor calculado ou o retornado, dependendo da sua API.
            // Para resolver seu problema imediato da imagem:
            setMonthRevenue(response.data.total_confirmed_revenue || 0); 
            
            const chart = response.data.chart_data.map(d => ({
                name: d.day,
                volume: d.agendamentos_confirmados_count || 0,
                faturamento: d.entradas_confirmadas || 0
            }));
            setChartData(chart);

        } catch (err) {
            console.error("Erro ao carregar dados:", err);
        }
    };
    fetchFinancials();
}, [salaoId]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Bom dia";
        if (hour < 18) return "Boa tarde";
        return "Boa noite";
    };

    if (loading) return <div className="h-96 flex items-center justify-center"><HourglassLoading /></div>;

    return (
        <div className="font-sans pb-20 max-w-7xl mx-auto">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        {getGreeting()}, <span style={{ color: primaryColor }}>{salonDetails?.nome_salao}</span>
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">Resumo de faturamento confirmado.</p>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowPrivate(!showPrivate)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"
                    >
                        {showPrivate ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showPrivate ? "Privacidade" : "Ver Valores"}
                    </button>

                    <button 
                        onClick={() => navigate(`/painel/${salaoId}/calendario`)}
                        className="flex items-center gap-2 px-6 py-2.5 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <Zap className="w-4 h-4 fill-current" /> Novo Agendamento
                    </button>
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <KpiCard 
                    title="Agendamentos Confirmados" 
                    value={todayStats.count}
                    icon={Calendar}
                    bgClass="bg-blue-100"
                    colorClass="text-blue-600"
                />
                <KpiCard 
                    title="Receita Confirmada (Hoje)" 
                    value={`R$ ${todayStats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    bgClass="bg-emerald-100"
                    colorClass="text-emerald-600"
                    isPrivate={true}
                    showPrivate={showPrivate}
                />
                <KpiCard 
                    title="Receita Confirmada (Mês)" 
                    value={`R$ ${monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={TrendingUp}
                    bgClass="bg-purple-100"
                    colorClass="text-purple-600"
                    isPrivate={true}
                    showPrivate={showPrivate}
                />
            </div>

            {/* MAIN CONTENT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">
                                {showPrivate ? "Fluxo Financeiro Confirmado" : "Volume de Atendimentos"}
                            </h3>
                            <p className="text-xs text-gray-400 uppercase tracking-wider">Últimos 30 dias</p>
                        </div>
                        <Activity className="text-gray-300 w-5 h-5" />
                    </div>
                    
                    <div className="h-72 w-full">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorFade" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={primaryColor} stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor={primaryColor} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '12px', color: 'white' }}
                                        formatter={(val) => showPrivate ? [`R$ ${val}`, 'Receita'] : [val, 'Agendamentos']}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey={showPrivate ? "faturamento" : "volume"} 
                                        stroke={primaryColor} 
                                        strokeWidth={3} 
                                        fill="url(#colorFade)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300">
                                <BarChart2 className="w-10 h-10 opacity-20" />
                                <p className="text-sm">Sem dados confirmados.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* PRÓXIMOS CLIENTES */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Próximos Confirmados</h3>
                        <button onClick={() => navigate(`/painel/${salaoId}/calendario`)} className="text-xs font-bold text-cyan-600 hover:underline">
                            Ver Tudo
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[350px] custom-scrollbar">
                        {nextAppointments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <Clock className="w-10 h-10 mb-2 opacity-20" />
                                <p className="text-sm">Nenhum confirmado para hoje.</p>
                            </div>
                        ) : (
                            nextAppointments.map((agd) => (
                                <NextClientItem key={agd.id} agendamento={agd} />
                            ))
                        )}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <button 
                            onClick={() => navigate(`/painel/${salaoId}/calendario`)}
                            className="w-full py-3 rounded-xl bg-gray-50 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                        >
                            Ir para Agenda <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}