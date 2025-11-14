import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '@/firebaseConfig';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from "firebase/firestore";
import { format, isSameDay, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Calendar, Users, TrendingUp, DollarSign, 
    Clock, ArrowRight, Zap, MessageCircle, Wallet, Eye, BarChart2
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import axios from 'axios';
import { useSalon } from './PainelLayout';
import HourglassLoading from '@/components/HourglassLoading';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- COMPONENTES UI ---

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// 1. Card KPI (Estilo Glass/Clean)
const KpiCard = ({ title, value, icon: IconComp, colorClass, bgClass, trend }) => (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full relative overflow-hidden group">
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500 ${colorClass}`}>
            <IconComp className="w-16 h-16" />
        </div>
        
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className={`p-3 rounded-2xl ${bgClass} ${colorClass}`}>
                <IconComp className="w-6 h-6" />
            </div>
            {trend && (
                <span className="bg-green-50 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" /> {trend}
                </span>
            )}
        </div>
        
        <div className="relative z-10">
            <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">{title}</p>
        </div>
    </div>
);

// 2. Item da Lista "Próximos"
const NextClientItem = ({ agendamento, primaryColor }) => {
    const time = agendamento.startTime ? format(agendamento.startTime.toDate(), "HH:mm") : '--:--';
    const whatsappLink = `https://wa.me/${agendamento.customerPhone?.replace(/\D/g, '')}`;

    return (
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all group">
            <div className="flex-shrink-0 w-14 h-14 bg-white rounded-xl flex flex-col items-center justify-center border border-gray-200 shadow-sm">
                <span className="text-lg font-bold text-gray-900">{time}</span>
            </div>
            
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 truncate">{agendamento.customerName}</h4>
                <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                    {agendamento.serviceName} 
                    {agendamento.professionalName && <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 ml-1">{agendamento.professionalName}</span>}
                </p>
            </div>

            <a 
                href={whatsappLink} 
                target="_blank" 
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-green-100 text-green-600 hover:bg-green-500 hover:text-white transition-colors"
                title="Chamar no WhatsApp"
            >
                <MessageCircle className="w-5 h-5" />
            </a>
        </div>
    );
};

export default function VisaoGeralPage() {
    const { salaoId, salonDetails } = useSalon();
    const primaryColor = salonDetails?.cor_primaria || '#0E7490';
    const navigate = useNavigate();

    // Estados
    const [loading, setLoading] = useState(true);
    const [todayStats, setTodayStats] = useState({ count: 0, revenue: 0 });
    const [nextAppointments, setNextAppointments] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [monthRevenue, setMonthRevenue] = useState(0);

    // 1. LISTENER REALTIME (Hoje e Próximos)
    useEffect(() => {
        if (!salaoId) return;
        
        const today = new Date();
        const start = startOfDay(today);
        const end = endOfDay(today);

        // Query para Agendamentos de HOJE (Para KPIs)
        const qToday = query(
            collection(db, 'cabeleireiros', salaoId, 'agendamentos'),
            where("startTime", ">=", start),
            where("startTime", "<=", end)
        );

        // Query para Próximos (Daqui pra frente)
        const qNext = query(
            collection(db, 'cabeleireiros', salaoId, 'agendamentos'),
            where("startTime", ">=", new Date()), // De agora em diante
            where("status", "in", ["confirmado", "pending_payment"]), // Apenas válidos
            orderBy("startTime", "asc"),
            limit(5)
        );

        const unsubscribeToday = onSnapshot(qToday, (snapshot) => {
            let count = 0;
            let revenue = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.status !== 'cancelado') {
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

    // 2. FETCH DADOS HISTÓRICOS (Gráfico e Faturamento Mensal)
    useEffect(() => {
        const fetchFinancials = async () => {
            if (!salaoId || !auth.currentUser) return;
            try {
                const token = await auth.currentUser.getIdToken();
                // Usa o endpoint financeiro que já criamos para pegar o mês atual
                const response = await axios.get(`${API_BASE_URL}/admin/financeiro/resumo`, {
                    params: { period: 'month' },
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                setMonthRevenue(response.data.total_revenue);
                // Prepara dados para o gráfico (simplificado para Entradas)
                const chart = response.data.chart_data.map(d => ({
                    name: d.day,
                    faturamento: d.entradas
                }));
                setChartData(chart);

            } catch (err) {
                console.error("Erro ao carregar financeiro:", err);
            }
        };
        fetchFinancials();
    }, [salaoId]);

    // Saudação baseada na hora
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        {getGreeting()}, <span style={{ color: primaryColor }}>{salonDetails?.nome_salao}</span>
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        Aqui está o raio-x do seu negócio hoje.
                    </p>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => navigate(`/painel/${salaoId}/financeiro`)}
                        className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                    >
                        <Wallet className="w-4 h-4" /> Lançar Despesa
                    </button>
                    <button 
                        onClick={() => navigate(`/painel/${salaoId}/calendario`)} // Ou modal de novo agendamento
                        className="flex items-center gap-2 px-6 py-2.5 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <Zap className="w-4 h-4 fill-current" /> Novo Agendamento
                    </button>
                </div>
            </div>

            {/* GRID DE KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <KpiCard 
                    title="Faturamento Hoje" 
                    value={`R$ ${todayStats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    bgClass="bg-emerald-100"
                    colorClass="text-emerald-600"
                />
                <KpiCard 
                    title="Agendamentos Hoje" 
                    value={todayStats.count}
                    icon={Calendar}
                    bgClass="bg-blue-100"
                    colorClass="text-blue-600"
                />
                <KpiCard 
                    title="Faturamento do Mês" 
                    value={`R$ ${monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={TrendingUp}
                    bgClass="bg-purple-100"
                    colorClass="text-purple-600"
                    trend="Acumulado"
                />
            </div>

            {/* MAIN CONTENT (Chart + Lista) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* GRÁFICO DE RECEITA (2/3) */}
                <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Fluxo de Receita</h3>
                            <p className="text-xs text-gray-400 uppercase tracking-wider">Últimos 30 dias</p>
                        </div>
                        <button onClick={() => navigate(`/painel/${salaoId}/financeiro`)} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                            <Eye className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="h-72 w-full">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={primaryColor} stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor={primaryColor} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} dy={10} interval="preserveStartEnd" />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '12px', color: 'white', fontSize: '12px' }}
                                        cursor={{ stroke: primaryColor, strokeWidth: 2 }}
                                        formatter={(value) => [`R$ ${value}`, 'Faturamento']}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="faturamento" 
                                        stroke={primaryColor} 
                                        strokeWidth={3} 
                                        fill="url(#colorRevenue)" 
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300">
                                <BarChart2 className="w-10 h-10 mb-2 opacity-20" />
                                <p className="text-sm">Sem dados suficientes.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* PRÓXIMOS CLIENTES (1/3) */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Próximos Clientes</h3>
                        <button 
                            onClick={() => navigate(`/painel/${salaoId}/agendamentos`)}
                            className="text-xs font-bold text-cyan-600 hover:underline"
                        >
                            Ver Todos
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 max-h-[350px]">
                        {nextAppointments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-8 text-gray-400">
                                <Clock className="w-10 h-10 mb-2 opacity-20" />
                                <p className="text-sm text-center">Agenda livre por enquanto.</p>
                            </div>
                        ) : (
                            nextAppointments.map((agd) => (
                                <NextClientItem 
                                    key={agd.id} 
                                    agendamento={agd} 
                                    primaryColor={primaryColor} 
                                />
                            ))
                        )}
                    </div>
                    
                    {nextAppointments.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <button 
                                onClick={() => navigate(`/painel/${salaoId}/calendario`)}
                                className="w-full py-3 rounded-xl bg-gray-50 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                            >
                                Ir para o Calendário <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}