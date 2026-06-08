import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { endOfDay, format, startOfDay } from 'date-fns';
import {
  Activity,
  ArrowRight,
  BarChart2,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  MessageCircle,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import HourglassLoading from '@/components/HourglassLoading';
import { apiGet, fetchAppointments } from '@/lib/horalisApi';
import { useSalon } from './PainelLayout';

function KpiCard({ title, value, icon: IconComp, colorClass, bgClass, isPrivate, showPrivate }) {
  return (
    <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className={`absolute right-0 top-0 p-4 opacity-10 transition-opacity duration-500 group-hover:scale-110 group-hover:opacity-20 ${colorClass}`}>
        <IconComp className="h-16 w-16" />
      </div>
      <div className="relative z-10 mb-4 flex items-start justify-between">
        <div className={`rounded-2xl p-3 ${bgClass} ${colorClass}`}>
          <IconComp className="h-6 w-6" />
        </div>
      </div>
      <div className="relative z-10">
        <h3 className="text-3xl font-extrabold tracking-tight text-gray-900">
          {isPrivate && !showPrivate ? 'R$ ••••' : value}
        </h3>
        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-400">{title}</p>
      </div>
    </div>
  );
}

function NextClientItem({ agendamento }) {
  const time = agendamento.startDate ? format(agendamento.startDate, 'HH:mm') : '--:--';
  const cleanPhone = String(agendamento.customerPhone || '').replace(/\D/g, '');
  const whatsappLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`}` : null;

  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-all hover:bg-white hover:shadow-sm">
      <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm">
        <span className="text-lg font-bold text-gray-900">{time}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-bold text-gray-900">{agendamento.customerName}</h4>
        <p className="truncate text-sm text-gray-500">{agendamento.serviceName}</p>
      </div>
      {whatsappLink && (
        <a href={whatsappLink} target="_blank" rel="noreferrer" className="rounded-xl bg-green-100 p-2.5 text-green-600 transition-colors hover:bg-green-500 hover:text-white" aria-label="Abrir WhatsApp">
          <MessageCircle className="h-5 w-5" />
        </a>
      )}
    </div>
  );
}

export default function VisaoGeralPage() {
  const { salaoId, salonDetails } = useSalon();
  const primaryColor = salonDetails?.cor_primaria || '#0E7490';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [showPrivate, setShowPrivate] = useState(false);
  const [todayStats, setTodayStats] = useState({ count: 0, revenue: 0 });
  const [nextAppointments, setNextAppointments] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [monthRevenue, setMonthRevenue] = useState(0);

  const loadAppointmentsSummary = useCallback(async ({ silent = false } = {}) => {
    if (!salaoId) return;
    if (!silent) setLoading(true);

    try {
      const now = new Date();
      const [todayAppointments, upcomingAppointments] = await Promise.all([
        fetchAppointments(salaoId, {
          start: startOfDay(now).toISOString(),
          end: endOfDay(now).toISOString(),
          status: 'confirmado',
          limit: 200,
        }),
        fetchAppointments(salaoId, {
          start: now.toISOString(),
          status: 'confirmado',
          limit: 5,
        }),
      ]);

      const revenue = todayAppointments.reduce((sum, appointment) => sum + Number(appointment.servicePrice || 0), 0);
      setTodayStats({ count: todayAppointments.length, revenue });
      setNextAppointments(upcomingAppointments);
    } catch (err) {
      console.error('Erro ao carregar agenda do dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [salaoId]);

  useEffect(() => {
    loadAppointmentsSummary();
    const timer = window.setInterval(() => loadAppointmentsSummary({ silent: true }), 30000);
    return () => window.clearInterval(timer);
  }, [loadAppointmentsSummary]);

  useEffect(() => {
    async function fetchFinancials() {
      if (!salaoId) return;
      try {
        const response = await apiGet('/admin/financeiro/resumo', {
          params: { period: 'month', status: 'confirmado' },
        });

        const chart = Array.isArray(response.data?.chart_data)
          ? response.data.chart_data.map((day) => ({
            name: day.day,
            volume: day.agendamentos_confirmados_count || day.volume || 0,
            faturamento: day.entradas_confirmadas || day.entradas || 0,
          }))
          : [];

        setMonthRevenue(Number(response.data?.total_confirmed_revenue ?? response.data?.total_revenue ?? 0));
        setChartData(chart);
      } catch (err) {
        console.error('Erro ao carregar dados financeiros:', err);
      }
    }

    fetchFinancials();
  }, [salaoId]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><HourglassLoading /></div>;

  return (
    <div className="mx-auto max-w-7xl pb-20 font-sans">
      <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            {getGreeting()}, <span style={{ color: primaryColor }}>{salonDetails?.nome_salao}</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">Resumo de faturamento confirmado.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowPrivate((value) => !value)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50"
          >
            {showPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPrivate ? 'Privacidade' : 'Ver Valores'}
          </button>
          <button
            onClick={() => navigate(`/painel/${salaoId}/calendario`)}
            className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl"
            style={{ backgroundColor: primaryColor }}
          >
            <Zap className="h-4 w-4 fill-current" /> Novo Agendamento
          </button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <KpiCard title="Agendamentos Confirmados" value={todayStats.count} icon={Calendar} bgClass="bg-blue-100" colorClass="text-blue-600" />
        <KpiCard title="Receita Confirmada (Hoje)" value={`R$ ${todayStats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={DollarSign} bgClass="bg-emerald-100" colorClass="text-emerald-600" isPrivate showPrivate={showPrivate} />
        <KpiCard title="Receita Confirmada (Mes)" value={`R$ ${monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={TrendingUp} bgClass="bg-purple-100" colorClass="text-purple-600" isPrivate showPrivate={showPrivate} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{showPrivate ? 'Fluxo Financeiro Confirmado' : 'Volume de Atendimentos'}</h3>
              <p className="text-xs uppercase tracking-wider text-gray-400">Ultimos 30 dias</p>
            </div>
            <Activity className="h-5 w-5 text-gray-300" />
          </div>

          <div className="h-72 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFade" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={primaryColor} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '12px', color: 'white' }} formatter={(val) => (showPrivate ? [`R$ ${val}`, 'Receita'] : [val, 'Agendamentos'])} />
                  <Area type="monotone" dataKey={showPrivate ? 'faturamento' : 'volume'} stroke={primaryColor} strokeWidth={3} fill="url(#colorFade)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-gray-300">
                <BarChart2 className="h-10 w-10 opacity-20" />
                <p className="text-sm">Sem dados confirmados.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex h-full flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Proximos Confirmados</h3>
            <button onClick={() => navigate(`/painel/${salaoId}/calendario`)} className="text-xs font-bold text-cyan-600 hover:underline">
              Ver Tudo
            </button>
          </div>

          <div className="custom-scrollbar max-h-[350px] flex-1 space-y-3 overflow-y-auto pr-1">
            {nextAppointments.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-gray-400">
                <Clock className="mb-2 h-10 w-10 opacity-20" />
                <p className="text-sm">Nenhum confirmado para hoje.</p>
              </div>
            ) : (
              nextAppointments.map((appointment) => <NextClientItem key={appointment.id} agendamento={appointment} />)
            )}
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4">
            <button onClick={() => navigate(`/painel/${salaoId}/calendario`)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-50 py-3 text-xs font-bold text-gray-700 transition-all hover:bg-gray-100">
              Ir para Agenda <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
