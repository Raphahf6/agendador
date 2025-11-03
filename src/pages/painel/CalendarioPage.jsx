// frontend/src/pages/painel/CalendarioPage.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
// REMOVIDO: { useParams }
import axios from 'axios';
import HoralisFullCalendar from '@/components/HoralisFullCalendar';
import { format } from 'date-fns';
import { differenceInMinutes, isBefore, setHours, setMinutes, parse, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { auth, db } from '@/firebaseConfig';
import { collection, onSnapshot } from "firebase/firestore";
import toast from 'react-hot-toast';

import HoralisCalendar from '@/components/HoralisCalendar';
import {
  Loader2, X, Clock, User, Phone, Mail,
  ChevronLeft, ChevronRight, Plus
} from "lucide-react";

// IMPORTAÇÃO CRÍTICA: Use o hook do PainelLayout (ajuste o caminho se necessário)
import { useSalon } from './PainelLayout';

// --- Configurações ---
const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";
const CIANO_COLOR_TEXT = 'text-cyan-600';
const CIANO_COLOR_BG = 'bg-cyan-800';
const CIANO_COLOR_BG_HOVER = 'hover:bg-cyan-700';
const CIANO_RING_FOCUS = 'focus:ring-cyan-400';
const CIANO_BORDER_FOCUS = 'focus:border-cyan-400';
const HORALIS_EVENT_COLORS = ['#3788D8', '#1B9AAA', '#7C3AED', '#37D88B', '#EC4899', '#F59E0B', '#10B981'];

const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// --- Hook customizado "DIY" para clique fora (mantido) ---
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

// --- SUB-COMPONENTE: HoralisCalendarHeader (mantido) ---
const HoralisCalendarHeader = ({
  onToday,
  onPrev,
  onNext,
  calendarTitle,
  currentView,
  onViewChange,
  popoverDate,
  onPopoverDateSelect,
  isMobile
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef(null);
  useOnClickOutside(popoverRef, () => setIsPopoverOpen(false));

  const handleDateSelect = (date) => {
    onPopoverDateSelect(date);
    setIsPopoverOpen(false);
  };

  return (
    <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 bg-white">
      {/* Lado Esquerdo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToday}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
        >
          Hoje
        </button>

        {!isMobile && (
          <div className="flex items-center">
            <button
              onClick={onPrev}
              className="p-2 text-gray-500 rounded-full hover:bg-gray-100"
              title="Anterior"
            >
              <Icon icon={ChevronLeft} className="w-5 h-5" />
            </button>
            <button
              onClick={onNext}
              className="p-2 text-gray-500 rounded-full hover:bg-gray-100"
              title="Próximo"
            >
              <Icon icon={ChevronRight} className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* --- Container do Popover --- */}
        <div className="relative" ref={popoverRef}>
          <h2
            className="text-xl font-medium text-gray-800 ml-2 cursor-pointer hover:text-cyan-600 transition-colors"
            title="Selecionar data"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          >
            {calendarTitle}
          </h2>

          {isPopoverOpen && (
            <div
              className="
                absolute top-full left-0 mt-2 z-50 
                bg-white rounded-xl shadow-lg border border-gray-200
              "
            >
              <HoralisCalendar
                selectedDate={popoverDate}
                onDateSelect={handleDateSelect}
              />
            </div>
          )}
        </div>
      </div>

      {/* Lado Direito: Seletor de View */}
      <div>
        <select
          value={currentView}
          onChange={onViewChange}
          className={`
            py-2 pl-3 pr-8 text-sm font-medium text-gray-700 bg-white 
            border border-gray-300 rounded-md shadow-sm 
            focus:outline-none ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}
          `}
        >
          {!isMobile && <option value="timeGridWeek">Semana</option>}
          <option value="timeGridDay">Dia</option>
          <option value="dayGridMonth">Mês</option>
        </select>
      </div>
    </header>
  );
};


// --- COMPONENTE PRINCIPAL DA PÁGINA ---

function CalendarioPage() {
  // OBTENDO salaoId do contexto
  const { salaoId } = useSalon();

  const [events, setEvents] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // REMOVIDO: const { salaoId } = useParams();
  const isInitialLoad = useRef(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [initialSlot, setInitialSlot] = useState(null);
  const [initialDuration, setInitialDuration] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const calendarRef = useRef(null);
  const [calendarTitle, setCalendarTitle] = useState('');

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [currentView, setCurrentView] = useState(window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek');

  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    // ... (lógica do 'checkMobile' idêntica) ...
    const checkMobile = () => {
      const mobileCheck = window.innerWidth < 768;
      if (mobileCheck !== isMobile) {
        setIsMobile(mobileCheck);
        if (mobileCheck) {
          setCurrentView('timeGridDay');
          getCalendarApi()?.changeView('timeGridDay');
        }
      }
    };

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobile]);


  // --- Carregamento de Eventos (onSnapshot) ---
  useEffect(() => {
    const currentUser = auth.currentUser;
    // AGORA CHECA se o salaoId do CONTEXTO existe
    if (!salaoId || !currentUser) {
      setError("Autenticação ou ID do salão inválido."); setLoading(false); return;
    }

    setLoading(true);
    const agendamentosRef = collection(db, 'cabeleireiros', salaoId, 'agendamentos');
    const unsubscribe = onSnapshot(agendamentosRef, (querySnapshot) => {
      const rawEvents = [];
      querySnapshot.docChanges().forEach((change) => {
        if (change.type === "added" && !isInitialLoad.current) {
          const d = change.doc.data(); toast.success(`Novo: ${d.serviceName} - ${d.customerName}`, { icon: '✨' });
        }
        if (change.type === "removed" && !isInitialLoad.current) { toast('Agendamento removido.', { icon: '🗑️' }); }
      });
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const startTime = data.startTime?.toDate(); const endTime = data.endTime?.toDate();
        if (startTime && endTime) {
          const colorIndex = Math.abs(doc.id.charCodeAt(0) % HORALIS_EVENT_COLORS.length);
          rawEvents.push({
            id: doc.id, title: `${data.serviceName || 'Serviço'} - ${data.customerName || 'Cliente'}`,
            start: startTime, end: endTime, backgroundColor: HORALIS_EVENT_COLORS[colorIndex], borderColor: HORALIS_EVENT_COLORS[colorIndex],
            extendedProps: { customerEmail: data.customerEmail, customerName: data.customerName, customerPhone: data.customerPhone, serviceName: data.serviceName, durationMinutes: data.durationMinutes, googleEventId: data.googleEventId }
          });
        }
      });
      setEvents(rawEvents);
      setLoading(false); // Só para de carregar quando os eventos chegam
      isInitialLoad.current = false;
    }, (err) => {
      setError("Erro ao conectar à agenda."); setLoading(false); console.error(err);
    });
    // AGORA DEPENDE DO salaoId do contexto
    return () => unsubscribe();
  }, [salaoId]);

  // --- Carregamento de Serviços (onSnapshot) ---
  useEffect(() => {
    // AGORA CHECA se o salaoId do CONTEXTO existe
    if (!salaoId) return;

    const servicosRef = collection(db, 'cabeleireiros', salaoId, 'servicos');
    const unsubscribe = onSnapshot(servicosRef, (querySnapshot) => {
      const servicosList = [];
      querySnapshot.forEach((doc) => {
        servicosList.push({ id: doc.id, ...doc.data() });
      });
      setServices(servicosList);
    }, (err) => {
      console.error("Erro ao buscar serviços: ", err);
      toast.error("Não foi possível carregar a lista de serviços.");
    });
    // AGORA DEPENDE DO salaoId do contexto
    return () => unsubscribe();
  }, [salaoId]);


  // --- Handlers de Navegação (mantido) ---
  const getCalendarApi = () => {
    if (calendarRef.current) {
      return calendarRef.current.getApi();
    }
    return null;
  };
  // ... (outras funções de navegação mantidas)
  const handleTodayClick = () => {
    const api = getCalendarApi();
    if (api) {
      api.today();
      setCurrentDate(new Date());
    }
  };
  const handlePrevClick = () => {
    const api = getCalendarApi();
    if (api) api.prev();
  };
  const handleNextClick = () => {
    const api = getCalendarApi();
    if (api) api.next();
  };
  const handleViewChange = (e) => {
    const newView = e.target.value;
    const api = getCalendarApi();
    if (api) {
      api.changeView(newView);
      setCurrentView(newView);
    }
  };
  const handleDateSelect = (date) => {
    if (!date) return;
    const api = getCalendarApi();
    if (api) {
      api.gotoDate(date);
    }
    setCurrentDate(date);
  };
  const handleDatesSet = (dateInfo) => {
    setCalendarTitle(dateInfo.view.title);
    setCurrentDate(dateInfo.view.currentStart);
    setCurrentView(dateInfo.view.type);
  };

  // --- Handlers de Interação ---
  const handleEventClick = (clickInfo) => {
    setSelectedEvent({
      id: clickInfo.event.id, title: clickInfo.event.title, start: clickInfo.event.start, end: clickInfo.event.end,
      backgroundColor: clickInfo.event.backgroundColor, extendedProps: clickInfo.event.extendedProps,
    });
    setIsDetailsModalOpen(true);
  };
  const handleDateClick = (dateInfo) => {
    const api = getCalendarApi();
    if (api && api.view.type === 'dayGridMonth') {
      api.changeView('timeGridDay', dateInfo.date);
      setCurrentView('timeGridDay');
      return;
    }
  };
  const handleCreateClick = () => {
    setInitialSlot(null);
    setInitialDuration(30);
    setIsManualModalOpen(true);
  };
  const handleTimeSelect = (selectInfo) => {
    if (selectInfo.view.type === 'dayGridMonth') {
      if (calendarRef.current) { calendarRef.current.getApi().unselect(); }
      return;
    }
    if (isBefore(selectInfo.start, new Date())) {
      toast.error("Não é possível agendar em horários passados.");
      if (calendarRef.current) { calendarRef.current.getApi().unselect(); }
      return;
    }
    const durationMinutes = differenceInMinutes(selectInfo.end, selectInfo.start);
    setInitialSlot(selectInfo.start);
    setInitialDuration(durationMinutes > 0 ? durationMinutes : null);
    setIsManualModalOpen(true);
    if (calendarRef.current) { calendarRef.current.getApi().unselect(); }
  };
  // CORREÇÃO DO CALLBACK: Garante que salaoId esteja na lista de dependências
  const handleEventDrop = useCallback(async (dropInfo) => {
    const { event } = dropInfo;
    if (isBefore(event.start, new Date())) {
      toast.error("Não é possível reagendar para o passado.");
      dropInfo.revert(); return;
    }
    if (!window.confirm(`Reagendar "${event.title}" para ${format(event.start, 'dd/MM HH:mm')}?`)) {
      dropInfo.revert(); return;
    }
    const toastId = toast.loading("Reagendando...");
    try {
      const token = await auth.currentUser.getIdToken();
      // salaoId está seguro e disponível aqui
      await axios.patch(`${API_BASE_URL}/admin/calendario/${salaoId}/agendamentos/${event.id}`,
        { new_start_time: event.start.toISOString() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Reagendado!", { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Falha ao reagendar.", { id: toastId });
      dropInfo.revert();
    }
  }, [salaoId]); // Agora depende do salaoId do contexto

  const handleManualSaveSuccess = () => {
    setIsManualModalOpen(false); setInitialSlot(null); setInitialDuration(null);
  };

  // --- Renderização ---
  // Se o salaoId ainda não veio do contexto, mostramos o loading.
  if (!salaoId || (loading && isInitialLoad.current)) {
    return (
      <div className="flex flex-col items-center justify-center p-10 min-h-[400px]">
        <Loader2 className={`h-8 w-8 animate-spin ${CIANO_COLOR_TEXT} mb-3`} />
        <p className="text-gray-600">Carregando agenda...</p>
      </div>
    );
  }
  if (error) {
    return <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>;
  }

  return (
    <div className="flex h-screen font-sans bg-gray-50 overflow-hidden">
      <main className="flex-1 flex flex-col overflow-hidden">

        <HoralisCalendarHeader
          onToday={handleTodayClick}
          onPrev={handlePrevClick}
          onNext={handleNextClick}
          calendarTitle={calendarTitle}
          currentView={currentView}
          onViewChange={handleViewChange}
          popoverDate={currentDate}
          onPopoverDateSelect={handleDateSelect}
          isMobile={isMobile}
        />

        <div className="flex-1 p-4 overflow-auto">
          <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200">
            <HoralisFullCalendar
              calendarRef={calendarRef}
              events={events}
              editable={true}
              eventDrop={handleEventDrop}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              select={handleTimeSelect}
              selectable={true}
              selectMirror={true}
              selectOverlap={false}
              longPressDelay={250}
              eventDurationEditable={false}
              initialView={currentView}
              datesSet={handleDatesSet}
            />
          </div>
        </div>
      </main>

      <button
        onClick={handleCreateClick}
        className={`
          fixed bottom-6 right-6 z-40
          flex items-center justify-center
          w-14 h-14 rounded-full shadow-lg
          ${CIANO_COLOR_BG} ${CIANO_COLOR_BG_HOVER} text-white
          transition-all duration-300 ease-in-out
          transform hover:scale-105 hover:shadow-xl
          focus:outline-none ${CIANO_RING_FOCUS} focus:ring-4
        `}
        title="Novo Agendamento"
      >
        <Icon icon={Plus} className="w-7 h-7" />
      </button>

      {/* --- Modais --- */}
      <EventDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        event={selectedEvent}
        salaoId={salaoId}
        onCancelSuccess={() => setIsDetailsModalOpen(false)}
      />
      <ManualBookingModal
        isOpen={isManualModalOpen}
        onClose={() => { setIsManualModalOpen(false); setInitialSlot(null); setInitialDuration(null); }}
        salaoId={salaoId} // Passando o ID do contexto para o modal
        initialDateTime={initialSlot}
        initialDuration={initialDuration}
        onSaveSuccess={handleManualSaveSuccess}
        events={events}
        services={services}
      />
    </div>
  );
}

// --- Componente MODAL DE DETALHES (Agora usa salaoId do props) ---
const EventDetailsModal = ({ isOpen, onClose, event, salaoId, onCancelSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  if (!isOpen || !event) return null;

  const extendedProps = event?.extendedProps ?? {};
  const {
    customerName,
    customerPhone,
    serviceName,
    durationMinutes,
    customerEmail
  } = extendedProps;
  const duration = durationMinutes || (event.end && event.start ? differenceInMinutes(event.end, event.start) : "N/A");

  const handleCancelAppointment = async () => {
    if (!window.confirm("Cancelar este agendamento?")) return;
    setIsLoading(true);
    const toastId = toast.loading("Cancelando...");
    try {
      const token = await auth.currentUser.getIdToken();
      // salaoId está sendo usado corretamente aqui
      await axios.delete(`${API_BASE_URL}/admin/calendario/${salaoId}/agendamentos/${event.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Cancelado!", { id: toastId });
      onCancelSuccess();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Falha ao cancelar.", { id: toastId });
    } finally { setIsLoading(false); }
  };
  // ... (restante do modal mantido)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b" style={{ backgroundColor: event.backgroundColor || '#60A5FA' }}>
          <h2 className="text-xl font-semibold text-white truncate pr-4">
            {event.title || 'Detalhes do Agendamento'}
          </h2>
          <button onClick={onClose} className="text-white hover:opacity-80 transition-opacity" disabled={isLoading}>
            <Icon icon={X} className="w-6 h-6" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm font-medium text-gray-700">Detalhes:</p>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Icon icon={Clock} className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-base font-semibold text-gray-800">{event.start ? format(event.start, 'dd/MM HH:mm') : ''} - {event.end ? format(event.end, 'HH:mm') : ''}</p>
              <p className="text-xs text-gray-500">Serviço: {serviceName || event.title?.split(' - ')[0] || 'N/A'} ({duration} min)</p>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">Cliente:</p>
            <div className="flex items-center gap-3 mb-1">
              <Icon icon={User} className={`w-5 h-5 ${CIANO_COLOR_TEXT}`} />
              <span className="font-semibold text-gray-900">{customerName || 'Não Informado'}</span>
            </div>
            {customerEmail && (
              <div className="flex items-center gap-3">
                <Icon icon={Mail} className={`w-5 h-5 ${CIANO_COLOR_TEXT}`} />
                <span className="text-gray-600">{customerEmail}</span>
              </div>
            )}
            {customerPhone && (
              <div className="flex items-center gap-3">
                <Icon icon={Phone} className={`w-5 h-5 ${CIANO_COLOR_TEXT}`} />
                <span className="text-gray-600">{customerPhone}</span>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={handleCancelAppointment}
              disabled={isLoading}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2 stroke-current" /> : null}
              Cancelar Agendamento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- Componente MODAL DE AGENDAMENTO (ManualBookingModal) ---
const ManualBookingModal = ({
  isOpen,
  onClose,
  salaoId, // salaoId recebido via props
  initialDateTime,
  initialDuration,
  onSaveSuccess,
  events,
  services
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [duration, setDuration] = useState(initialDuration || 30);

  const [manualDate, setManualDate] = useState(new Date());
  const [manualTime, setManualTime] = useState('09:00');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
      setCustomerEmail('');
      setError(null);
      setLoading(false);
      setSelectedServiceId('');

      if (initialDateTime) {
        setDuration(initialDuration || 30);
      } else {
        const proximaHora = setMinutes(setHours(new Date(), new Date().getHours() + 1), 0);
        setDuration(initialDuration || 30);
        setManualDate(proximaHora);
        setManualTime(format(proximaHora, 'HH:mm'));
      }
    }
  }, [isOpen, initialDateTime, initialDuration]);

  // Handler para quando o <select> de serviço muda
  const handleServiceChange = (e) => {
    const serviceId = e.target.value;
    setSelectedServiceId(serviceId);

    if (serviceId) {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        // CORREÇÃO: Usando 'duracao_minutos'
        setDuration(service.duracao_minutos); // Atualiza a duração automaticamente
      }
    } else {
      setDuration(30);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !selectedServiceId) {
      setError("Preencha o nome do cliente e selecione um serviço.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = customerEmail.trim();
    if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
      setError("O formato do e-mail é inválido."); return;
    }

    // --- Determina a data/hora final ---
    let finalDateTime;
    if (initialDateTime) {
      finalDateTime = initialDateTime;
    } else {
      try {
        const [hour, minute] = manualTime.split(':').map(Number);
        let combinedDate = setHours(setMinutes(manualDate, minute), hour);

        if (isBefore(combinedDate, new Date())) {
          setError("Não é possível agendar em horários passados.");
          return;
        }
        finalDateTime = combinedDate;
      } catch (err) {
        setError("Formato de hora inválido.");
        return;
      }
    }

    setLoading(true);

    // --- Verificação de Conflito (lógica idêntica) ---
    const proposedStartTime = finalDateTime;
    const proposedEndTime = addMinutes(proposedStartTime, duration);

    const hasConflict = events.some(event => {
      const existingStartTime = event.start;
      const existingEndTime = event.end;
      return (proposedStartTime < existingEndTime) && (proposedEndTime > existingStartTime);
    });

    if (hasConflict) {
      setError("Este horário já está ocupado. Por favor, escolha outro.");
      setLoading(false);
      return;
    }

    const service = services.find(s => s.id === selectedServiceId);
    if (!service) {
      setError("Serviço selecionado não encontrado.");
      setLoading(false);
      return;
    }
    // CORREÇÃO: Usando 'nome_servico'
    const serviceNameFromList = service.nome_servico;

    // Continua para o salvamento
    try {
      const token = await auth.currentUser.getIdToken();
      const payload = {
        salao_id: salaoId, // salaoId está seguro aqui
        start_time: finalDateTime.toISOString(),
        duration_minutes: duration,
        customer_name: name.trim(),
        customer_phone: phone.trim() || null,
        customer_email: trimmedEmail || null,
        service_name: serviceNameFromList,
        service_id: selectedServiceId,
        service_price: service.preco,
      };
      await axios.post(`${API_BASE_URL}/admin/calendario/agendar`, payload, { headers: { Authorization: `Bearer ${token}` } });
      onSaveSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || "Falha ao salvar agendamento.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  // ... (renderização do modal mantida)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Agendamento Manual</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" disabled={loading}>
            <Icon icon={X} className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {initialDateTime ? (
            <p className={`text-sm font-semibold ${CIANO_COLOR_TEXT} bg-cyan-50 p-2 rounded border border-cyan-100`}>
              Horário: {format(initialDateTime, 'dd/MM/yyyy HH:mm')}
            </p>
          ) : (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Selecione a Data</label>
              <div className="flex justify-center">
                <HoralisCalendar
                  selectedDate={manualDate}
                  onDateSelect={setManualDate}
                />
              </div>
              <div>
                <label htmlFor="manual-time" className="block text-sm font-medium text-gray-700 mb-1">Selecione o Horário</label>
                <input
                  type="time"
                  id="manual-time"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className={`w-full border border-gray-300 rounded-md p-2 h-10 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`}
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="manual-name" className="block text-sm font-medium text-gray-700 mb-1">Cliente*</label>
            <input name="name" id="manual-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={`w-full border border-gray-300 rounded-md p-2 h-10 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`} disabled={loading} required placeholder="Nome do Cliente" />
          </div>
          <div>
            <label htmlFor="manual-email" className="block text-sm font-medium text-gray-700 mb-1">E-mail do Cliente (Opcional)</label>
            <input name="email" id="manual-email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className={`w-full border border-gray-300 rounded-md p-2 h-10 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`} disabled={loading} placeholder="Para enviarmos e-mail de confirmação" />
          </div>
          <div>
            <label htmlFor="manual-phone" className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input name="phone" id="manual-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={`w-full border border-gray-300 rounded-md p-2 h-10 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`} disabled={loading} placeholder="(Opcional)" />
          </div>

          {/* --- Select de Serviço --- */}
          <div>
            <label htmlFor="manual-serviceName" className="block text-sm font-medium text-gray-700 mb-1">Serviço*</label>
            <select
              name="serviceName"
              id="manual-serviceName"
              value={selectedServiceId}
              onChange={handleServiceChange}
              className={`w-full border border-gray-300 rounded-md p-2 h-10 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} appearance-none bg-white`}
              disabled={loading || services.length === 0}
              required
            >
              <option value="">
                {services.length === 0 ? "Carregando serviços..." : "Selecione um serviço"}
              </option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.nome_servico} (R$ {service.preco || '0.00'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="manual-duration" className="block text-sm font-medium text-gray-700 mb-1">Duração (min)*</label>
            <input
              name="duration"
              id="manual-duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(Math.max(5, parseInt(e.target.value) || 0))}
              className={`w-full border border-gray-300 rounded-md p-2 h-10 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} bg-gray-50`}
              disabled={loading}
              readOnly={selectedServiceId !== ''} // Trava se um serviço foi selecionado
              required
              min="5"
            />
            {selectedServiceId !== '' && (
              <p className="text-xs text-gray-500 mt-1">A duração é definida automaticamente pelo serviço.</p>
            )}
          </div>

          {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button type="submit" className={`flex items-center px-6 py-2.5 ${CIANO_COLOR_BG} text-white rounded-lg shadow-sm ${CIANO_COLOR_BG_HOVER} transition-colors disabled:opacity-50`} disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin stroke-current mr-2" /> : null}
              {loading ? 'Salvando...' : 'Salvar Agendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default CalendarioPage;