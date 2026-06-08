import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  DollarSign,
  Filter,
  MessageCircle,
  Scissors,
  Search,
  User,
  XCircle,
} from 'lucide-react';
import { format, isToday, isTomorrow, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import HourglassLoading from '@/components/HourglassLoading';
import { apiGet, fetchAppointments } from '@/lib/horalisApi';
import { useSalon } from './PainelLayout';

function getStatusConfig(status) {
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
      return { color: 'bg-gray-100 text-gray-600', label: status || 'Indefinido', icon: Clock };
  }
}

function AgendamentoCard({ data, nomeSalao }) {
  const statusConfig = getStatusConfig(data.status);
  const StatusIcon = statusConfig.icon;
  const dateObj = data.startDate || new Date();
  let dateLabel = format(dateObj, "dd 'de' MMMM", { locale: ptBR });
  if (isToday(dateObj)) dateLabel = 'Hoje';
  else if (isTomorrow(dateObj)) dateLabel = 'Amanha';
  const timeLabel = format(dateObj, 'HH:mm');

  const handleWhatsAppClick = () => {
    if (!data.customerPhone) {
      window.alert('Cliente sem telefone cadastrado.');
      return;
    }

    const cleanNumber = String(data.customerPhone).replace(/\D/g, '');
    const ddi = cleanNumber.startsWith('55') ? '' : '55';
    const message = `Ola ${data.customerName}!%0A%0AAqui e do *${nomeSalao}*! Passando para lembrar do seu agendamento de *${data.serviceName}* conosco.%0A%0AData: ${dateLabel.toLowerCase()}%0AHorario: ${timeLabel}%0A%0APodemos confirmar sua presenca?`;
    window.open(`https://wa.me/${ddi}${cleanNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md sm:flex-row sm:items-center">
      <div className={`absolute bottom-0 left-0 top-0 w-1.5 ${statusConfig.color.replace('bg-', 'bg-opacity-50 bg-')}`} />

      <div className="flex min-w-[70px] flex-col items-center justify-center rounded-xl border border-gray-100 bg-gray-50 p-2">
        <span className="text-lg font-bold text-gray-900">{timeLabel}</span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{dateLabel}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="truncate text-base font-bold text-gray-900">{data.customerName}</h3>
          {data.paymentStatus === 'paid_signal' && (
            <span className="flex items-center gap-1 rounded-full border border-green-100 bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-600">
              <DollarSign className="h-3 w-3" /> Sinal Pago
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:items-center sm:gap-4">
          <span className="flex items-center gap-1.5">
            <Scissors className="h-4 w-4 text-cyan-600" />
            {data.serviceName}
          </span>
          {data.professionalName && (
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-purple-500" />
              {data.professionalName}
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 flex w-full flex-row items-center justify-between gap-3 sm:mt-0 sm:w-auto sm:flex-col sm:items-end">
        <div className="flex flex-col items-end">
          <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold ${statusConfig.color}`}>
            <StatusIcon className="h-3.5 w-3.5" /> {statusConfig.label}
          </span>
          <span className="mt-1 text-sm font-bold text-gray-900">
            R$ {Number(data.servicePrice || 0).toFixed(2).replace('.', ',')}
          </span>
        </div>

        <button onClick={handleWhatsAppClick} className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-green-600">
          <MessageCircle className="h-4 w-4" />
          Lembrar Cliente
        </button>
      </div>
    </div>
  );
}

export default function MeusAgendamentosPage() {
  const { salaoId, salonDetails } = useSalon();
  const [agendamentos, setAgendamentos] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProfessional, setFilterProfessional] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchPros() {
      if (!salaoId) return;
      try {
        const response = await apiGet('/admin/equipe');
        setProfessionals(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Erro ao carregar equipe', err);
      }
    }

    fetchPros();
  }, [salaoId]);

  const loadAppointments = useCallback(async ({ silent = false } = {}) => {
    if (!salaoId) return;
    if (!silent) setLoading(true);

    try {
      const list = await fetchAppointments(salaoId, {
        start: startOfDay(new Date()).toISOString(),
        include_cancelled: true,
        limit: 100,
      });
      setAgendamentos(list);
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err);
    } finally {
      setLoading(false);
    }
  }, [salaoId]);

  useEffect(() => {
    loadAppointments();
    const timer = window.setInterval(() => loadAppointments({ silent: true }), 30000);
    return () => window.clearInterval(timer);
  }, [loadAppointments]);

  const filteredList = useMemo(() => agendamentos.filter((item) => {
    const search = searchTerm.toLowerCase();
    const searchMatch = String(item.customerName || '').toLowerCase().includes(search)
      || String(item.serviceName || '').toLowerCase().includes(search);
    const proMatch = filterProfessional === 'todos' || item.professionalId === filterProfessional;

    let statusMatch = true;
    if (filterStatus === 'confirmados') statusMatch = item.status === 'confirmado';
    if (filterStatus === 'pendentes') statusMatch = item.status === 'pending_payment' || item.status === 'pending';
    if (filterStatus === 'cancelados') statusMatch = item.status === 'cancelado';

    return searchMatch && proMatch && statusMatch;
  }), [agendamentos, searchTerm, filterProfessional, filterStatus]);

  if (loading) return <div className="flex h-96 items-center justify-center"><HourglassLoading message="Buscando agenda..." /></div>;

  return (
    <div className="mx-auto max-w-5xl pb-20 font-sans">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
          <div className="rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
            <Calendar className="h-6 w-6 text-cyan-700" />
          </div>
          Meus Agendamentos
        </h1>
        <p className="ml-12 mt-1 text-sm text-gray-500">Visualize e gerencie os compromissos futuros da equipe.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-12">
        <div className="relative md:col-span-5">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cliente ou servico..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="relative md:col-span-4">
          <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <select
            className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-8 text-sm font-medium text-gray-700 transition-all focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            value={filterProfessional}
            onChange={(event) => setFilterProfessional(event.target.value)}
          >
            <option value="todos">Todos os Profissionais</option>
            {professionals.map((pro) => <option key={pro.id} value={pro.id}>{pro.nome}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        <div className="relative md:col-span-3">
          <Filter className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <select
            className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-8 text-sm font-medium text-gray-700 transition-all focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
          >
            <option value="todos">Todos Status</option>
            <option value="confirmados">Confirmados</option>
            <option value="pendentes">Pendentes</option>
            <option value="cancelados">Cancelados</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
            <Calendar className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="font-medium text-gray-500">Nenhum agendamento encontrado.</p>
          </div>
        ) : (
          filteredList.map((agendamento) => (
            <AgendamentoCard key={agendamento.id} data={agendamento} nomeSalao={salonDetails?.nome_salao || 'Horalis'} />
          ))
        )}
      </div>
    </div>
  );
}
