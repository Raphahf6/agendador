import React, { useCallback, useEffect, useRef, useState } from 'react';
import { format, differenceInMinutes, isBefore, parse, setHours, setMinutes } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MessageCircle,
  Plus,
  User,
  X,
} from 'lucide-react';

import HoralisCalendar from '@/components/HoralisCalendar';
import HoralisFullCalendar from '@/components/HoralisFullCalendar';
import HourglassLoading from '@/components/HourglassLoading';
import { auth } from '@/firebaseConfig';
import { apiDelete, apiPatch, apiPost, fetchAppointments, fetchClinic } from '@/lib/horalisApi';
import { useSalon } from './PainelLayout';

const HORALIS_EVENT_COLORS = ['#3788D8', '#1B9AAA', '#7C3AED', '#37D88B', '#EC4899', '#F59E0B', '#10B981'];

const Icon = ({ icon: IconComponent, className = '' }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

function CalendarHeader({
  onToday,
  onPrev,
  onNext,
  calendarTitle,
  currentView,
  onViewChange,
  popoverDate,
  onPopoverDateSelect,
  isMobile,
  primaryColor,
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef(null);
  useOnClickOutside(popoverRef, () => setIsPopoverOpen(false));

  const handleDateSelect = (date) => {
    onPopoverDateSelect(date);
    setIsPopoverOpen(false);
  };

  return (
    <header className="relative z-20 flex flex-shrink-0 flex-col items-start justify-between border-b border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-6">
      <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-start">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button onClick={onPrev} className="rounded-md p-1.5 text-gray-500 shadow-sm transition-all hover:bg-white hover:text-gray-900" aria-label="Periodo anterior">
            <Icon icon={ChevronLeft} className="h-5 w-5" />
          </button>
          <button onClick={onToday} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-600 hover:text-gray-900">
            Hoje
          </button>
          <button onClick={onNext} className="rounded-md p-1.5 text-gray-500 shadow-sm transition-all hover:bg-white hover:text-gray-900" aria-label="Proximo periodo">
            <Icon icon={ChevronRight} className="h-5 w-5" />
          </button>
        </div>

        <div className="relative" ref={popoverRef}>
          <button
            onClick={() => setIsPopoverOpen((open) => !open)}
            className="flex items-center gap-2 text-xl font-bold text-gray-900 transition-opacity hover:opacity-70 sm:text-2xl"
          >
            {calendarTitle}
            <Icon icon={CalendarIcon} className="h-5 w-5 text-gray-400" />
          </button>

          {isPopoverOpen && (
            <div className="absolute left-0 top-full z-50 mt-4 rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl">
              <HoralisCalendar selectedDate={popoverDate} onDateSelect={handleDateSelect} primaryColor={primaryColor} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 w-full sm:mt-0 sm:w-auto">
        <div className="flex rounded-lg bg-gray-100 p-1">
          {!isMobile && (
            <button
              onClick={() => onViewChange('timeGridWeek')}
              className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-all ${currentView === 'timeGridWeek' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Semana
            </button>
          )}
          <button
            onClick={() => onViewChange('timeGridDay')}
            className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-all ${currentView === 'timeGridDay' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Dia
          </button>
          <button
            onClick={() => onViewChange('dayGridMonth')}
            className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-all ${currentView === 'dayGridMonth' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Mes
          </button>
        </div>
      </div>
    </header>
  );
}

function formatPhoneNumber(phone) {
  if (!phone) return 'N/A';
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length === 11) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  if (cleaned.length === 10) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  return phone;
}

function buildWhatsappLink(phone, name, service, dateTime) {
  if (!phone) return null;
  const cleaned = String(phone).replace(/\D/g, '');
  const target = cleaned.length <= 11 ? `55${cleaned}` : cleaned;
  const msg = `Ola ${name || ''}, passando para confirmar seu agendamento de ${service || 'servico'} no dia ${dateTime || ''}.`;
  return `https://wa.me/${target}?text=${encodeURIComponent(msg)}`;
}

function EventDetailsModal({ isOpen, onClose, event, salaoId, onCancelSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  if (!isOpen || !event) return null;

  const { customerName, customerPhone, serviceName, durationMinutes, customerEmail } = event.extendedProps;
  const formattedDateTime = event.start ? format(event.start, "dd/MM 'as' HH:mm") : '';
  const duration = durationMinutes || (event.end ? differenceInMinutes(event.end, event.start) : 'N/A');
  const whatsappLink = buildWhatsappLink(customerPhone, customerName, serviceName, formattedDateTime);

  const handleCancel = async () => {
    if (!window.confirm('Cancelar este agendamento?')) return;
    setIsLoading(true);
    try {
      await apiDelete(`/admin/calendario/${salaoId}/agendamentos/${event.id}`);
      toast.success('Cancelado!');
      onCancelSuccess();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao cancelar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50/50 p-6">
          <div>
            <h2 className="text-lg font-bold leading-tight text-gray-900">{serviceName || 'Servico'}</h2>
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
              <Icon icon={Clock} className="h-3 w-3" /> {duration} min
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700" aria-label="Fechar">
            <Icon icon={X} className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-blue-600">
              {customerName ? customerName[0].toUpperCase() : <Icon icon={User} className="h-6 w-6" />}
            </div>
            <div>
              <p className="font-bold text-gray-900">{customerName || 'Sem nome'}</p>
              <p className="text-sm text-gray-500">{customerEmail || 'Sem e-mail'}</p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Data e hora</span>
              <span className="text-sm font-semibold text-gray-900">{formattedDateTime}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Telefone</span>
              <span className="text-sm font-semibold text-gray-900">{formatPhoneNumber(customerPhone)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            {customerPhone && (
              <a href={whatsappLink} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-500 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-600">
                <Icon icon={MessageCircle} className="h-4 w-4" /> Confirmar
              </a>
            )}
            <button onClick={handleCancel} disabled={isLoading} className="flex-1 rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
              {isLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Cancelar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManualBookingModal({ isOpen, onClose, salaoId, initialDateTime, initialDuration, onSaveSuccess, services, primaryColor }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [duration, setDuration] = useState(initialDuration || 30);
  const [date, setDate] = useState(initialDateTime ? new Date(initialDateTime) : new Date());
  const [time, setTime] = useState(initialDateTime ? format(new Date(initialDateTime), 'HH:mm') : '09:00');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setPhone('');
    setEmail('');
    setServiceId('');
    if (initialDateTime) {
      setDate(initialDateTime);
      setTime(format(initialDateTime, 'HH:mm'));
    }
    setDuration(initialDuration || 30);
  }, [isOpen, initialDateTime, initialDuration]);

  const handleServiceChange = (event) => {
    const sid = event.target.value;
    setServiceId(sid);
    const service = services.find((item) => item.id === sid);
    if (service) setDuration(service.duracao_minutos || 30);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const finalDate = setMinutes(setHours(date, hours), minutes);
      const service = services.find((item) => item.id === serviceId);

      await apiPost('/admin/calendario/agendar', {
        salao_id: salaoId,
        start_time: finalDate.toISOString(),
        duration_minutes: Number(duration || service?.duracao_minutos || 30),
        customer_name: name,
        customer_phone: phone,
        customer_email: email,
        service_id: serviceId,
        service_name: service?.nome_servico || 'Servico Manual',
        service_price: Number(service?.preco || 0),
      });

      toast.success('Agendado com sucesso!');
      onSaveSuccess();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Novo Agendamento Manual</h2>
          <button onClick={onClose} aria-label="Fechar">
            <Icon icon={X} className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Data</label>
              <input type="date" value={format(date, 'yyyy-MM-dd')} onChange={(event) => setDate(parse(event.target.value, 'yyyy-MM-dd', new Date()))} className="w-full rounded-lg border p-2 text-sm outline-none focus:ring-2 focus:ring-opacity-50" style={{ borderColor: primaryColor, '--tw-ring-color': primaryColor }} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Hora</label>
              <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="w-full rounded-lg border p-2 text-sm outline-none focus:ring-2 focus:ring-opacity-50" style={{ borderColor: primaryColor, '--tw-ring-color': primaryColor }} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Nome do cliente*</label>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome completo" className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-blue-500" required />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Telefone / WhatsApp</label>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(XX) 99999-9999" className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">E-mail</label>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="cliente@email.com" className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Servico*</label>
            <select value={serviceId} onChange={handleServiceChange} className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm outline-none" required>
              <option value="">Selecione um servico...</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.nome_servico} ({service.duracao_minutos} min)
                </option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={loading} className="mt-2 w-full rounded-xl py-3 font-bold text-white shadow-md transition-opacity hover:opacity-90" style={{ backgroundColor: primaryColor }}>
            {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Salvar Agendamento'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CalendarioPage() {
  const { salaoId, salonDetails } = useSalon();
  const primaryColor = salonDetails?.cor_primaria || '#0E7490';

  const [events, setEvents] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [initialSlot, setInitialSlot] = useState(null);
  const [initialDuration, setInitialDuration] = useState(null);
  const [calendarTitle, setCalendarTitle] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [currentView, setCurrentView] = useState(window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek');
  const [currentDate, setCurrentDate] = useState(new Date());

  const calendarRef = useRef(null);
  const isInitialLoad = useRef(true);
  const knownAppointmentIds = useRef(new Set());

  const loadAppointments = useCallback(async ({ silent = false } = {}) => {
    if (!salaoId || !auth.currentUser) {
      if (!salaoId) setError('ID do salao nao encontrado.');
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    try {
      const appointments = await fetchAppointments(salaoId, { status: 'not_cancelled', limit: 1000 });
      const currentIds = new Set();
      const nextEvents = appointments
        .filter((appointment) => appointment.startDate && appointment.endDate)
        .map((appointment) => {
          currentIds.add(appointment.id);
          if (!isInitialLoad.current && !knownAppointmentIds.current.has(appointment.id)) {
            toast.success(`Novo: ${appointment.serviceName}`, { icon: '✨', style: { fontSize: '12px' } });
          }

          const colorIndex = Math.abs(String(appointment.id || '').charCodeAt(0) % HORALIS_EVENT_COLORS.length);
          return {
            id: appointment.id,
            title: `${appointment.customerName || 'Cliente'} - ${appointment.serviceName || 'Servico'}`,
            start: appointment.startDate,
            end: appointment.endDate,
            backgroundColor: HORALIS_EVENT_COLORS[colorIndex],
            borderColor: 'transparent',
            textColor: '#FFFFFF',
            extendedProps: appointment,
          };
        });

      knownAppointmentIds.current = currentIds;
      setEvents(nextEvents);
      setError(null);
    } catch (err) {
      setError('Erro ao conectar a agenda.');
      console.error(err);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [salaoId]);

  useEffect(() => {
    const checkMobile = () => {
      const mobileCheck = window.innerWidth < 768;
      setIsMobile(mobileCheck);
      if (mobileCheck) {
        setCurrentView('timeGridDay');
        calendarRef.current?.getApi()?.changeView('timeGridDay');
      }
    };
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadAppointments();
    const timer = window.setInterval(() => loadAppointments({ silent: true }), 30000);
    return () => window.clearInterval(timer);
  }, [loadAppointments]);

  useEffect(() => {
    let cancelled = false;
    async function loadServices() {
      if (!salaoId || !auth.currentUser) return;
      try {
        const clinic = await fetchClinic(salaoId);
        if (!cancelled) setServices(Array.isArray(clinic.servicos) ? clinic.servicos : []);
      } catch (err) {
        if (!cancelled) {
          setServices([]);
          toast.error('Nao foi possivel carregar os servicos.');
        }
      }
    }
    loadServices();
    return () => { cancelled = true; };
  }, [salaoId]);

  const getCalendarApi = () => calendarRef.current?.getApi();
  const handleTodayClick = () => { getCalendarApi()?.today(); setCurrentDate(new Date()); };
  const handlePrevClick = () => getCalendarApi()?.prev();
  const handleNextClick = () => getCalendarApi()?.next();
  const handleViewChange = (newView) => {
    getCalendarApi()?.changeView(newView);
    setCurrentView(newView);
  };
  const handleDateSelect = (date) => {
    if (!date) return;
    getCalendarApi()?.gotoDate(date);
    setCurrentDate(date);
  };
  const handleDatesSet = (dateInfo) => {
    setCalendarTitle(dateInfo.view.title);
    setCurrentDate(dateInfo.view.currentStart);
    setCurrentView(dateInfo.view.type);
  };

  const handleEventClick = (clickInfo) => {
    setSelectedEvent({
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      start: clickInfo.event.start,
      end: clickInfo.event.end,
      backgroundColor: clickInfo.event.backgroundColor,
      extendedProps: clickInfo.event.extendedProps,
    });
    setIsDetailsModalOpen(true);
  };

  const handleDateClick = (dateInfo) => {
    const api = getCalendarApi();
    if (api?.view.type === 'dayGridMonth') {
      api.changeView('timeGridDay', dateInfo.date);
      setCurrentView('timeGridDay');
    }
  };

  const handleTimeSelect = (selectInfo) => {
    if (selectInfo.view.type === 'dayGridMonth') {
      calendarRef.current?.getApi().unselect();
      return;
    }
    if (isBefore(selectInfo.start, new Date())) {
      toast.error('Horario passado nao permitido.');
      calendarRef.current?.getApi().unselect();
      return;
    }
    const durationMinutes = differenceInMinutes(selectInfo.end, selectInfo.start);
    setInitialSlot(selectInfo.start);
    setInitialDuration(durationMinutes > 0 ? durationMinutes : 30);
    setIsManualModalOpen(true);
    calendarRef.current?.getApi().unselect();
  };

  const handleEventDrop = useCallback(async (dropInfo) => {
    const { event } = dropInfo;
    if (isBefore(event.start, new Date())) {
      toast.error('Nao e possivel reagendar para o passado.');
      dropInfo.revert();
      return;
    }
    if (!window.confirm(`Reagendar para ${format(event.start, 'dd/MM HH:mm')}?`)) {
      dropInfo.revert();
      return;
    }
    const toastId = toast.loading('Reagendando...');
    try {
      await apiPatch(`/admin/calendario/${salaoId}/agendamentos/${event.id}`, { new_start_time: event.start.toISOString() });
      toast.success('Reagendado!', { id: toastId });
      await loadAppointments({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao reagendar.', { id: toastId });
      dropInfo.revert();
    }
  }, [salaoId, loadAppointments]);

  const handleManualSaveSuccess = () => {
    setIsManualModalOpen(false);
    setInitialSlot(null);
    setInitialDuration(null);
    loadAppointments({ silent: true });
  };

  if (loading && isInitialLoad.current) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center">
        <HourglassLoading message="Carregando Agenda..." primaryColor={primaryColor} />
      </div>
    );
  }

  if (error) {
    return <div className="m-4 rounded-2xl border border-red-100 bg-red-50 p-8 text-center font-medium text-red-700">{error}</div>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50 font-sans">
      <CalendarHeader
        onToday={handleTodayClick}
        onPrev={handlePrevClick}
        onNext={handleNextClick}
        calendarTitle={calendarTitle}
        currentView={currentView}
        onViewChange={handleViewChange}
        popoverDate={currentDate}
        onPopoverDateSelect={handleDateSelect}
        isMobile={isMobile}
        primaryColor={primaryColor}
      />

      <div className="flex-1 overflow-hidden p-4 sm:p-6">
        <div className="relative h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <HoralisFullCalendar
            calendarRef={calendarRef}
            events={events}
            editable
            eventDrop={handleEventDrop}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            select={handleTimeSelect}
            selectable
            selectMirror
            selectOverlap={false}
            longPressDelay={250}
            eventDurationEditable={false}
            initialView={currentView}
            datesSet={handleDatesSet}
            primaryColor={primaryColor}
          />
        </div>
      </div>

      <button
        onClick={() => {
          setInitialSlot(null);
          setInitialDuration(30);
          setIsManualModalOpen(true);
        }}
        className="fixed bottom-8 right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-all duration-300 hover:scale-110 hover:rotate-90"
        style={{ backgroundColor: primaryColor }}
        title="Novo Agendamento"
      >
        <Icon icon={Plus} className="h-7 w-7" />
      </button>

      <EventDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        event={selectedEvent}
        salaoId={salaoId}
        onCancelSuccess={() => {
          setIsDetailsModalOpen(false);
          loadAppointments({ silent: true });
        }}
      />
      <ManualBookingModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setInitialSlot(null);
          setInitialDuration(null);
        }}
        salaoId={salaoId}
        initialDateTime={initialSlot}
        initialDuration={initialDuration}
        onSaveSuccess={handleManualSaveSuccess}
        services={services}
        primaryColor={primaryColor}
      />
    </div>
  );
}
