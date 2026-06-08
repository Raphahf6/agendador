import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  Clock,
  DollarSign,
  Filter,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Scissors,
  Search,
  User,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { endOfDay, format, isToday, isTomorrow, startOfDay } from 'date-fns';

import HourglassLoading from '@/components/HourglassLoading';
import { apiDelete, apiGet, apiPatch, apiPost, fetchAppointments, fetchClinic } from '@/lib/horalisApi';
import { getErrorMessage } from '@/utils/horalisRuntime';
import { useSalon } from './PainelLayout';

const TODAY = () => format(new Date(), 'yyyy-MM-dd');

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

function dateFromInput(value, hour = '00:00:00') {
  const date = new Date(`${value}T${hour}`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatDateLabel(dateObj) {
  if (!dateObj) return '-';
  if (isToday(dateObj)) return 'Hoje';
  if (isTomorrow(dateObj)) return 'Amanha';
  return format(dateObj, 'dd/MM');
}

function cleanPhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function serviceAllowsProfessional(serviceId, professional) {
  const services = Array.isArray(professional?.servicos) ? professional.servicos.map(String) : [];
  return !serviceId || services.length === 0 || services.includes(String(serviceId));
}

function createBookingState(date = TODAY()) {
  return {
    customerId: '',
    customerQuery: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    serviceId: '',
    professionalId: '',
    date,
    slot: '',
    notes: '',
  };
}

function SummaryCard({ title, value, subtext, icon: Icon, tone = 'cyan' }) {
  const tones = {
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    gray: 'bg-gray-50 text-gray-700 border-gray-100',
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{title}</p>
          <p className="mt-2 text-2xl font-black text-gray-900">{value}</p>
          {subtext && <p className="mt-1 text-xs font-medium text-gray-500">{subtext}</p>}
        </div>
        <div className={`rounded-xl border p-2 ${tones[tone] || tones.cyan}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = getStatusConfig(status);
  const StatusIcon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${config.color}`}>
      <StatusIcon className="h-3.5 w-3.5" /> {config.label}
    </span>
  );
}

function AppointmentRow({ appointment, salonName, salaoId, onCancel, onConfirm }) {
  const start = appointment.startDate || new Date();
  const end = appointment.endDate || new Date(start.getTime() + Number(appointment.durationMinutes || 30) * 60000);
  const isCancelled = appointment.status === 'cancelado' || appointment.status === 'cancelled';
  const canConfirm = !isCancelled && appointment.status !== 'confirmado' && appointment.status !== 'approved';
  const customerId = appointment.customer_id || appointment.customerId;

  const handleWhatsAppClick = () => {
    if (!appointment.customerPhone) {
      toast.error('Cliente sem telefone cadastrado.');
      return;
    }

    const number = cleanPhone(appointment.customerPhone);
    const ddi = number.startsWith('55') ? '' : '55';
    const message = `Ola ${appointment.customerName}!%0A%0AAqui e do *${salonName}*. Passando para lembrar do seu agendamento de *${appointment.serviceName}*.%0A%0AData: ${formatDateLabel(start).toLowerCase()}%0AHorario: ${format(start, 'HH:mm')}%0A%0APodemos confirmar sua presenca?`;
    window.open(`https://wa.me/${ddi}${number}?text=${message}`, '_blank');
  };

  return (
    <div className="group grid gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-gray-200 hover:shadow-md lg:grid-cols-[120px_1fr_auto] lg:items-center">
      <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-1">
        <span className="text-2xl font-black text-gray-900">{format(start, 'HH:mm')}</span>
        <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
          {formatDateLabel(start)} ate {format(end, 'HH:mm')}
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-bold text-gray-900">{appointment.customerName || 'Cliente'}</h3>
          <StatusBadge status={appointment.status} />
          {appointment.paymentStatus && appointment.paymentStatus !== 'free' && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
              <DollarSign className="h-3.5 w-3.5" /> {appointment.paymentStatus}
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <span className="flex items-center gap-1.5">
            <Scissors className="h-4 w-4 text-cyan-600" />
            {appointment.serviceName || 'Servico'}
          </span>
          {appointment.professionalName && (
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-purple-500" />
              {appointment.professionalName}
            </span>
          )}
          <span className="font-bold text-gray-900">
            R$ {Number(appointment.servicePrice || 0).toFixed(2).replace('.', ',')}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 lg:justify-end">
        {customerId && (
          <Link
            to={`/painel/${salaoId}/clientes/${customerId}`}
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Cliente
          </Link>
        )}
        {canConfirm && (
          <button onClick={() => onConfirm(appointment)} className="rounded-xl bg-green-50 px-3 py-2 text-xs font-bold text-green-700 transition-colors hover:bg-green-100">
            Confirmar
          </button>
        )}
        {!isCancelled && (
          <button onClick={handleWhatsAppClick} className="inline-flex items-center gap-1.5 rounded-xl bg-green-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-green-600">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </button>
        )}
        {!isCancelled && (
          <button onClick={() => onCancel(appointment)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-100">
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

function BookingPanel({
  booking,
  setBooking,
  customers,
  services,
  professionals,
  slots,
  loadingSlots,
  saving,
  onSubmit,
  onReset,
  primaryColor,
}) {
  const selectedService = services.find((service) => service.id === booking.serviceId);
  const eligibleProfessionals = useMemo(
    () => professionals.filter((professional) => serviceAllowsProfessional(booking.serviceId, professional)),
    [professionals, booking.serviceId],
  );
  const filteredCustomers = useMemo(() => {
    const term = booking.customerQuery.trim().toLowerCase();
    if (!term) return customers.slice(0, 5);
    const phoneTerm = cleanPhone(term);
    return customers
      .filter((customer) => {
        const phone = cleanPhone(customer.whatsapp || customer.customerPhone);
        return String(customer.nome || '').toLowerCase().includes(term)
          || String(customer.email || '').toLowerCase().includes(term)
          || Boolean(phoneTerm && phone.includes(phoneTerm));
      })
      .slice(0, 5);
  }, [customers, booking.customerQuery]);

  const applyCustomer = (customer) => {
    setBooking((current) => ({
      ...current,
      customerId: customer.id,
      customerQuery: customer.nome || '',
      customerName: customer.nome || '',
      customerPhone: customer.whatsapp || '',
      customerEmail: customer.email || '',
    }));
  };

  const update = (field, value) => {
    setBooking((current) => ({ ...current, [field]: value }));
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-20">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900">Novo agendamento</h2>
          <p className="text-sm text-gray-500">Escolha um horario livre e confirme sem abrir calendario.</p>
        </div>
        <button onClick={onReset} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-50">
          Limpar
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Cliente</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={booking.customerQuery}
              onChange={(event) => {
                const value = event.target.value;
                setBooking((current) => ({
                  ...current,
                  customerId: '',
                  customerQuery: value,
                  customerName: value,
                }));
              }}
              placeholder="Buscar ou criar cliente"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
          {filteredCustomers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => applyCustomer(customer)}
                  className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${booking.customerId === customer.id ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {customer.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Nome*</label>
            <input value={booking.customerName} onChange={(event) => update('customerName', event.target.value)} className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:border-cyan-500" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">WhatsApp</label>
            <input value={booking.customerPhone} onChange={(event) => update('customerPhone', event.target.value)} className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:border-cyan-500" placeholder="(00) 00000-0000" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">E-mail</label>
          <input type="email" value={booking.customerEmail} onChange={(event) => update('customerEmail', event.target.value)} className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:border-cyan-500" placeholder="cliente@email.com" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Servico*</label>
          <select
            value={booking.serviceId}
            onChange={(event) => setBooking((current) => ({ ...current, serviceId: event.target.value, professionalId: '', slot: '' }))}
            className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm outline-none focus:border-cyan-500"
            required
          >
            <option value="">Selecione um servico</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.nome_servico} ({service.duracao_minutos || 30} min)
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Profissional</label>
            <select
              value={booking.professionalId}
              onChange={(event) => setBooking((current) => ({ ...current, professionalId: event.target.value, slot: '' }))}
              className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm outline-none focus:border-cyan-500"
            >
              <option value="">Agenda geral</option>
              {eligibleProfessionals.map((professional) => (
                <option key={professional.id} value={professional.id}>{professional.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Data*</label>
            <input type="date" min={TODAY()} value={booking.date} onChange={(event) => setBooking((current) => ({ ...current, date: event.target.value, slot: '' }))} className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:border-cyan-500" required />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">Horarios disponiveis</label>
            {selectedService && <span className="text-xs font-bold text-gray-400">{selectedService.duracao_minutos || 30} min</span>}
          </div>
          <div className="min-h-[72px] rounded-xl border border-gray-100 bg-gray-50 p-2">
            {loadingSlots ? (
              <div className="flex h-14 items-center justify-center text-sm font-medium text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando horarios
              </div>
            ) : slots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.slice(0, 16).map((slot) => {
                  const selected = booking.slot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => update('slot', slot)}
                      className={`rounded-lg px-2 py-2 text-sm font-bold transition-all ${selected ? 'text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                      style={selected ? { backgroundColor: primaryColor } : undefined}
                    >
                      {format(new Date(slot), 'HH:mm')}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-14 items-center justify-center text-center text-sm font-medium text-gray-500">
                {booking.serviceId ? 'Nenhum horario livre para os filtros.' : 'Selecione um servico para ver horarios.'}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Observacao</label>
          <textarea value={booking.notes} onChange={(event) => update('notes', event.target.value)} rows={3} className="w-full resize-none rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:border-cyan-500" placeholder="Preferencias, observacoes internas..." />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: primaryColor }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Criar agendamento
        </button>
      </form>
    </section>
  );
}

export default function MeusAgendamentosPage() {
  const { salaoId, salonDetails } = useSalon();
  const primaryColor = salonDetails?.cor_primaria || '#0E7490';

  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slots, setSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(TODAY());
  const [filterProfessional, setFilterProfessional] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('ativos');
  const [searchTerm, setSearchTerm] = useState('');
  const [booking, setBooking] = useState(() => createBookingState(TODAY()));

  const activeServices = useMemo(() => services.filter((service) => service?.active !== false), [services]);
  const activeProfessionals = useMemo(() => professionals.filter((professional) => professional?.active !== false), [professionals]);

  const loadResources = useCallback(async () => {
    if (!salaoId) return;
    try {
      const [clinicResponse, customersResponse] = await Promise.all([
        fetchClinic(salaoId),
        apiGet(`/admin/clientes/${salaoId}/lista-crm`),
      ]);
      setServices(Array.isArray(clinicResponse.servicos) ? clinicResponse.servicos : []);
      setProfessionals(Array.isArray(clinicResponse.profissionais) ? clinicResponse.profissionais : []);
      setCustomers(Array.isArray(customersResponse.data) ? customersResponse.data : []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Nao foi possivel carregar dados da central.'));
    }
  }, [salaoId]);

  const loadAppointments = useCallback(async ({ silent = false } = {}) => {
    if (!salaoId) return;
    if (!silent) setLoading(true);

    try {
      const start = startOfDay(dateFromInput(selectedDate));
      const end = endOfDay(dateFromInput(selectedDate));
      const list = await fetchAppointments(salaoId, {
        start: start.toISOString(),
        end: end.toISOString(),
        include_cancelled: true,
        limit: 500,
      });
      setAppointments(list);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao carregar agendamentos.'));
    } finally {
      setLoading(false);
    }
  }, [salaoId, selectedDate]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  useEffect(() => {
    loadAppointments();
    const timer = window.setInterval(() => loadAppointments({ silent: true }), 30000);
    return () => window.clearInterval(timer);
  }, [loadAppointments]);

  useEffect(() => {
    setBooking((current) => ({ ...current, date: selectedDate, slot: '' }));
  }, [selectedDate]);

  useEffect(() => {
    let cancelled = false;
    async function loadSlots() {
      if (!salaoId || !booking.serviceId || !booking.date) {
        setSlots([]);
        return;
      }

      setLoadingSlots(true);
      try {
        const response = await apiGet(`/saloes/${salaoId}/horarios-disponiveis`, {
          params: {
            service_id: booking.serviceId,
            date: booking.date,
            professional_id: booking.professionalId || undefined,
          },
        });
        const nextSlots = Array.isArray(response.data?.horarios_disponiveis) ? response.data.horarios_disponiveis : [];
        if (!cancelled) {
          setSlots(nextSlots);
          setBooking((current) => nextSlots.includes(current.slot) ? current : { ...current, slot: '' });
        }
      } catch (err) {
        if (!cancelled) {
          setSlots([]);
          toast.error(getErrorMessage(err, 'Nao foi possivel buscar horarios.'));
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    }

    loadSlots();
    return () => { cancelled = true; };
  }, [salaoId, booking.serviceId, booking.date, booking.professionalId]);

  const filteredAppointments = useMemo(() => appointments.filter((item) => {
    const search = searchTerm.toLowerCase().trim();
    const searchMatch = !search
      || String(item.customerName || '').toLowerCase().includes(search)
      || String(item.serviceName || '').toLowerCase().includes(search)
      || cleanPhone(item.customerPhone).includes(cleanPhone(search));
    const proMatch = filterProfessional === 'todos' || item.professionalId === filterProfessional;

    let statusMatch = true;
    if (filterStatus === 'ativos') statusMatch = item.status !== 'cancelado' && item.status !== 'cancelled';
    if (filterStatus === 'confirmados') statusMatch = item.status === 'confirmado' || item.status === 'approved';
    if (filterStatus === 'pendentes') statusMatch = item.status === 'pending_payment' || item.status === 'pending';
    if (filterStatus === 'cancelados') statusMatch = item.status === 'cancelado' || item.status === 'cancelled';

    return searchMatch && proMatch && statusMatch;
  }), [appointments, searchTerm, filterProfessional, filterStatus]);

  const groupedAppointments = useMemo(() => {
    const now = new Date();
    const groups = { agora: [], proximos: [], passados: [], cancelados: [] };

    filteredAppointments
      .slice()
      .sort((a, b) => (a.startDate?.getTime() || 0) - (b.startDate?.getTime() || 0))
      .forEach((appointment) => {
        const start = appointment.startDate || new Date(0);
        const end = appointment.endDate || new Date(start.getTime() + Number(appointment.durationMinutes || 30) * 60000);
        const cancelled = appointment.status === 'cancelado' || appointment.status === 'cancelled';
        if (cancelled) groups.cancelados.push(appointment);
        else if (start <= now && end >= now) groups.agora.push(appointment);
        else if (start > now) groups.proximos.push(appointment);
        else groups.passados.push(appointment);
      });

    return groups;
  }, [filteredAppointments]);

  const summary = useMemo(() => {
    const active = appointments.filter((item) => item.status !== 'cancelado' && item.status !== 'cancelled');
    const confirmed = active.filter((item) => item.status === 'confirmado' || item.status === 'approved');
    const pending = active.filter((item) => item.status === 'pending_payment' || item.status === 'pending');
    const cancelled = appointments.filter((item) => item.status === 'cancelado' || item.status === 'cancelled');
    const revenue = active.reduce((sum, item) => sum + Number(item.servicePrice || 0), 0);

    return {
      total: appointments.length,
      confirmed: confirmed.length,
      pending: pending.length,
      cancelled: cancelled.length,
      revenue,
    };
  }, [appointments]);

  const resetBooking = () => {
    setBooking(createBookingState(selectedDate));
    setSlots([]);
  };

  const handleCreateAppointment = async (event) => {
    event.preventDefault();
    const service = activeServices.find((item) => item.id === booking.serviceId);
    const professional = activeProfessionals.find((item) => item.id === booking.professionalId);

    if (!service) {
      toast.error('Selecione um servico.');
      return;
    }
    if (!booking.slot) {
      toast.error('Selecione um horario disponivel.');
      return;
    }
    if (!booking.customerName.trim()) {
      toast.error('Informe o nome do cliente.');
      return;
    }

    setSaving(true);
    try {
      await apiPost('/admin/calendario/agendar', {
        salao_id: salaoId,
        start_time: booking.slot,
        duration_minutes: Number(service.duracao_minutos || 30),
        customer_name: booking.customerName.trim(),
        customer_phone: booking.customerPhone,
        customer_email: booking.customerEmail,
        service_id: service.id,
        service_name: service.nome_servico,
        service_price: Number(service.preco || 0),
        professional_id: professional?.id || null,
        professional_name: professional?.nome || null,
        notes: booking.notes || null,
      });

      toast.success('Agendamento criado.');
      resetBooking();
      await Promise.all([loadAppointments({ silent: true }), loadResources()]);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Nao foi possivel criar o agendamento.'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAppointment = async (appointment) => {
    if (!window.confirm(`Cancelar o agendamento de ${appointment.customerName || 'cliente'}?`)) return;
    try {
      await apiDelete(`/admin/calendario/${salaoId}/agendamentos/${appointment.id}`);
      toast.success('Agendamento cancelado.');
      await loadAppointments({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Nao foi possivel cancelar.'));
    }
  };

  const handleConfirmAppointment = async (appointment) => {
    try {
      await apiPatch(`/admin/calendario/${salaoId}/agendamentos/${appointment.id}`, { status: 'confirmado' });
      toast.success('Agendamento confirmado.');
      await loadAppointments({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Nao foi possivel confirmar.'));
    }
  };

  const renderGroup = (title, items, description) => {
    if (!items.length) return null;
    return (
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-gray-500">{title}</h2>
          {description && <p className="text-xs font-medium text-gray-400">{description}</p>}
        </div>
        {items.map((appointment) => (
          <AppointmentRow
            key={appointment.id}
            appointment={appointment}
            salonName={salonDetails?.nome_salao || 'Horalis'}
            salaoId={salaoId}
            onCancel={handleCancelAppointment}
            onConfirm={handleConfirmAppointment}
          />
        ))}
      </section>
    );
  };

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><HourglassLoading message="Buscando agendamentos..." /></div>;
  }

  return (
    <div className="mx-auto max-w-7xl pb-20 font-sans">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-black text-gray-900">
            <div className="rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
              <CalendarDays className="h-6 w-6 text-cyan-700" />
            </div>
            Central de Agendamentos
          </h1>
          <p className="ml-12 mt-1 text-sm text-gray-500">Crie, confirme e acompanhe a rotina do dia sem abrir o calendario.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSelectedDate(TODAY())} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50">
            Hoje
          </button>
          <button onClick={() => loadAppointments({ silent: true })} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="No dia" value={summary.total} subtext={formatDateLabel(dateFromInput(selectedDate))} icon={Calendar} tone="cyan" />
        <SummaryCard title="Confirmados" value={summary.confirmed} subtext="agenda ativa" icon={CheckCircle} tone="green" />
        <SummaryCard title="Pendentes" value={summary.pending} subtext="precisam atencao" icon={AlertCircle} tone="yellow" />
        <SummaryCard title="Cancelados" value={summary.cancelled} subtext="fora da agenda" icon={XCircle} tone="red" />
        <SummaryCard title="Previsto" value={`R$ ${summary.revenue.toFixed(2).replace('.', ',')}`} subtext="sem cancelados" icon={DollarSign} tone="gray" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-12">
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Data</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value || TODAY())}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-cyan-500 focus:bg-white"
              />
            </div>

            <div className="relative md:col-span-4">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Busca</label>
              <Search className="absolute left-3 top-[38px] h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cliente, servico ou telefone"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-cyan-500 focus:bg-white"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="relative md:col-span-3">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Profissional</label>
              <User className="absolute left-3 top-[38px] h-5 w-5 -translate-y-1/2 text-gray-400" />
              <select
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-8 text-sm font-bold text-gray-700 outline-none focus:border-cyan-500 focus:bg-white"
                value={filterProfessional}
                onChange={(event) => setFilterProfessional(event.target.value)}
              >
                <option value="todos">Todos</option>
                {activeProfessionals.map((pro) => <option key={pro.id} value={pro.id}>{pro.nome}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-[38px] h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="relative md:col-span-2">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">Status</label>
              <Filter className="absolute left-3 top-[38px] h-5 w-5 -translate-y-1/2 text-gray-400" />
              <select
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-8 text-sm font-bold text-gray-700 outline-none focus:border-cyan-500 focus:bg-white"
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
              >
                <option value="ativos">Ativos</option>
                <option value="todos">Todos</option>
                <option value="confirmados">Confirmados</option>
                <option value="pendentes">Pendentes</option>
                <option value="cancelados">Cancelados</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-[38px] h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div className="space-y-6">
            {filteredAppointments.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
                <Calendar className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p className="font-bold text-gray-500">Nenhum agendamento encontrado.</p>
                <p className="mt-1 text-sm text-gray-400">Crie um novo agendamento no painel ao lado.</p>
              </div>
            ) : (
              <>
                {renderGroup('Agora', groupedAppointments.agora, 'em atendimento neste momento')}
                {renderGroup('Proximos', groupedAppointments.proximos, 'fila cronologica do dia')}
                {renderGroup('Passados', groupedAppointments.passados, 'ja encerrados neste dia')}
                {renderGroup('Cancelados', groupedAppointments.cancelados, 'mantidos para conferencia')}
              </>
            )}
          </div>
        </div>

        <BookingPanel
          booking={booking}
          setBooking={setBooking}
          customers={customers}
          services={activeServices}
          professionals={activeProfessionals}
          slots={slots}
          loadingSlots={loadingSlots}
          saving={saving}
          onSubmit={handleCreateAppointment}
          onReset={resetBooking}
          primaryColor={primaryColor}
        />
      </div>
    </div>
  );
}
