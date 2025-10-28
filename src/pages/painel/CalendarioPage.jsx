// frontend/src/pages/painel/CalendarioPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import HoralisFullCalendar from '@/components/HoralisFullCalendar'; // Assume que existe
import { format } from 'date-fns';
import { differenceInMinutes } from 'date-fns'; // <<< IMPORTADO >>>
import { Loader2, X, Clock, User, Phone, CheckCircle, ArrowLeft, Edit3, Trash2 } from "lucide-react"; // Adicionado Ícones faltantes
import { auth, db } from '@/firebaseConfig';
import { collection, onSnapshot } from "firebase/firestore";
import toast from 'react-hot-toast';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// <<< DEFINIÇÕES DE COR (Para consistência) >>>
const CIANO_COLOR_TEXT = 'text-cyan-600';
const CIANO_COLOR_BG = 'bg-cyan-600';
const CIANO_COLOR_BG_HOVER = 'hover:bg-cyan-700';
const CIANO_RING_FOCUS = 'focus:ring-cyan-400';
const CIANO_BORDER_FOCUS = 'focus:border-cyan-400';

// Helper Ícone Simples
const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// Cores para eventos (pode ajustar)
const HORALIS_EVENT_COLORS = [
  '#3788D8', '#1B9AAA', '#7C3AED', '#37D88B', '#EC4899', '#F59E0B', '#10B981'
];

// --- COMPONENTES MODAL ---

// <<< MOVIDO PARA FORA: Modal de Detalhes >>>
const EventDetailsModal = ({ isOpen, onClose, event, salaoId, onCancelSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  if (!isOpen || !event) return null;

  // Usa ?? para fallback caso extendedProps não exista
  const { customerName, customerPhone, serviceName, durationMinutes } = event.extendedProps ?? {};
  const duration = durationMinutes || (event.end && event.start ? differenceInMinutes(event.end, event.start) : "N/A"); // Calcula duração se não vier

  const handleCancelAppointment = async () => {
    if (!window.confirm("Cancelar este agendamento?")) return;
    setIsLoading(true);
    const toastId = toast.loading("Cancelando...");
    try {
      const token = await auth.currentUser.getIdToken();
      await axios.delete(`${API_BASE_URL}/admin/calendario/${salaoId}/agendamentos/${event.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Cancelado!", { id: toastId });
      onCancelSuccess(); // Fecha modal (onSnapshot atualiza)
    } catch (err) {
      toast.error(err.response?.data?.detail || "Falha ao cancelar.", { id: toastId });
    } finally { setIsLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-5 border-b" style={{ backgroundColor: event.backgroundColor || '#60A5FA' /* Azul fallback */ }}>
          <h2 className="text-xl font-semibold text-white truncate pr-4">
            {event.title || 'Detalhes do Agendamento'}
          </h2>
          <button onClick={onClose} className="text-white hover:opacity-80 transition-opacity" disabled={isLoading}>
            <Icon icon={X} className="w-6 h-6" />
          </button>
        </div>
        {/* Corpo */}
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
            {customerPhone && ( // Mostra telefone apenas se existir
              <div className="flex items-center gap-3">
                <Icon icon={Phone} className={`w-5 h-5 ${CIANO_COLOR_TEXT}`} />
                <span className="text-gray-600">{customerPhone}</span>
              </div>
            )}
          </div>
          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={handleCancelAppointment}
              disabled={isLoading}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2 stroke-current" /> : null}
              Cancelar Agendamento
            </button>
             {/* Botão Reagendar removido - Usar Drag-and-Drop */}
          </div>
        </div>
      </div>
    </div>
  );
};


// <<< MOVIDO PARA FORA: Modal de Agendamento Manual >>>
const ManualBookingModal = ({ isOpen, onClose, salaoId, initialDateTime, initialDuration, onSaveSuccess }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState(''); // <<< ADICIONADO: Estado para e-mail >>>
  const [serviceName, setServiceName] = useState('');
  const [duration, setDuration] = useState(initialDuration || 30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Reseta TUDO ao abrir
      setName('');
      setPhone('');
      setCustomerEmail(''); // <<< ADICIONADO: Reset do e-mail >>>
      setServiceName(initialDateTime ? `Agendamento - ${format(initialDateTime, 'dd/MM HH:mm')}` : 'Novo Agendamento');
      setDuration(initialDuration || 30);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, initialDateTime, initialDuration]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    // Validações
    if (!name.trim() || !serviceName.trim() || duration < 5) {
      setError("Preencha nome, descrição e duração (mín. 5 min)."); return;
    }
    // <<< ADICIONADO: Validação opcional de e-mail (se preenchido) >>>
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = customerEmail.trim();
    if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
        setError("O formato do e-mail é inválido."); return;
    }


    setLoading(true);

    try {
      const token = await auth.currentUser.getIdToken();
      const payload = {
        salao_id: salaoId,
        start_time: initialDateTime.toISOString(),
        duration_minutes: duration,
        customer_name: name.trim(),
        customer_phone: phone.trim() || null,
        customer_email: trimmedEmail || null, // <<< ADICIONADO: Envia e-mail ou null >>>
        service_name: serviceName.trim(),
      };
      await axios.post(`${API_BASE_URL}/admin/calendario/agendar`, payload, { headers: { Authorization: `Bearer ${token}` } });
      onSaveSuccess(); // Fecha modal
    } catch (err) {
      setError(err.response?.data?.detail || "Falha ao salvar agendamento.");
    } finally {
       setLoading(false);
    }
  };

  if (!isOpen) return null;

  // --- JSX do Modal ---
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Agendamento Manual</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" disabled={loading}>
            <Icon icon={X} className="w-5 h-5" />
          </button>
        </div>
        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Horário */}
          <p className={`text-sm font-semibold ${CIANO_COLOR_TEXT} bg-cyan-50 p-2 rounded border border-cyan-100`}>
            Horário: {initialDateTime ? format(initialDateTime, 'dd/MM/yyyy HH:mm') : 'Indefinido'}
          </p>
          {/* Nome Cliente */}
          <div>
            <label htmlFor="manual-name" className="block text-sm font-medium text-gray-700 mb-1">Cliente*</label>
            <input name="name" id="manual-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={`w-full border border-gray-300 rounded-md p-2 h-10 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`} disabled={loading} required placeholder="Nome do Cliente" />
          </div>

          {/* <<< ADICIONADO: Campo E-mail Cliente >>> */}
          <div>
            <label htmlFor="manual-email" className="block text-sm font-medium text-gray-700 mb-1">E-mail do Cliente (Opcional)</label>
            <input name="email" id="manual-email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className={`w-full border border-gray-300 rounded-md p-2 h-10 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`} disabled={loading} placeholder="Para enviarmos e-mail de confirmação" />
          </div>
          {/* <<< FIM DA ADIÇÃO >>> */}

          {/* Telefone */}
          <div>
            <label htmlFor="manual-phone" className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input name="phone" id="manual-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={`w-full border border-gray-300 rounded-md p-2 h-10 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`} disabled={loading} placeholder="(Opcional)" />
          </div>
          {/* Descrição Serviço */}
          <div>
            <label htmlFor="manual-serviceName" className="block text-sm font-medium text-gray-700 mb-1">Descrição do Serviço*</label>
            <input name="serviceName" id="manual-serviceName" type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)} className={`w-full border border-gray-300 rounded-md p-2 h-10 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`} disabled={loading} required placeholder="Ex: Corte Masculino" />
          </div>
          {/* Duração */}
          <div>
            <label htmlFor="manual-duration" className="block text-sm font-medium text-gray-700 mb-1">Duração (min)*</label>
            <input name="duration" id="manual-duration" type="number" value={duration} onChange={(e) => setDuration(Math.max(5, parseInt(e.target.value) || 0))} className={`w-full border border-gray-300 rounded-md p-2 h-10 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`} disabled={loading} required min="5"/>
          </div>
          {/* Erro */}
          {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}
          {/* Botão Salvar */}
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

// --- COMPONENTE PRINCIPAL DA PÁGINA ---

function CalendarioPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { salaoId } = useParams();
  const calendarRef = useRef(null);
  const isInitialLoad = useRef(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [initialSlot, setInitialSlot] = useState(null);
  const [initialDuration, setInitialDuration] = useState(null); // <<< ESTADO ADICIONADO >>>
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // --- Carregamento de Eventos (onSnapshot) ---
  useEffect(() => {
    const currentUser = auth.currentUser;
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
          const colorIndex = Math.abs(doc.id.charCodeAt(0) % HORALIS_EVENT_COLORS.length); // Cor mais consistente
          rawEvents.push({
            id: doc.id, title: `${data.serviceName || 'Serviço'} - ${data.customerName || 'Cliente'}`,
            start: startTime, end: endTime, backgroundColor: HORALIS_EVENT_COLORS[colorIndex], borderColor: HORALIS_EVENT_COLORS[colorIndex],
            extendedProps: { customerName: data.customerName, customerPhone: data.customerPhone, serviceName: data.serviceName, durationMinutes: data.durationMinutes, googleEventId: data.googleEventId }
          });
        }
      });
      setEvents(rawEvents); setLoading(false); isInitialLoad.current = false;
    }, (err) => {
      setError("Erro ao conectar à agenda."); setLoading(false); console.error(err);
    });
    return () => unsubscribe();
  }, [salaoId]);

  // --- Handlers de Interação ---
  const handleEventClick = (clickInfo) => {
    setSelectedEvent({
      id: clickInfo.event.id, title: clickInfo.event.title, start: clickInfo.event.start, end: clickInfo.event.end,
      backgroundColor: clickInfo.event.backgroundColor, extendedProps: clickInfo.event.extendedProps,
    });
    setIsDetailsModalOpen(true);
  };

  const handleDateClick = (dateInfo) => { // Clique simples
    setInitialSlot(dateInfo.date);
    setInitialDuration(null); // Usa duração padrão
    setIsManualModalOpen(true);
  };

  const handleTimeSelect = (selectInfo) => { // Seleção de período
    const durationMinutes = differenceInMinutes(selectInfo.end, selectInfo.start);
    setInitialSlot(selectInfo.start);
    setInitialDuration(durationMinutes > 0 ? durationMinutes : null); // Define duração
    setIsManualModalOpen(true);
    if (calendarRef.current) calendarRef.current.getApi().unselect(); // Limpa seleção visual
  };

  const handleEventDrop = useCallback(async (dropInfo) => { // Reagendamento
    const { event } = dropInfo;
    if (!window.confirm(`Reagendar "${event.title}" para ${format(event.start, 'dd/MM HH:mm')}?`)) {
      dropInfo.revert(); return;
    }
    const toastId = toast.loading("Reagendando...");
    try {
      const token = await auth.currentUser.getIdToken();
      await axios.patch(`${API_BASE_URL}/admin/calendario/${salaoId}/agendamentos/${event.id}`,
        { new_start_time: event.start.toISOString() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Reagendado!", { id: toastId }); // onSnapshot atualiza
    } catch (err) {
      toast.error(err.response?.data?.detail || "Falha ao reagendar.", { id: toastId });
      dropInfo.revert();
    }
  }, [salaoId]);

  const handleManualSaveSuccess = () => {
    setIsManualModalOpen(false); setInitialSlot(null); setInitialDuration(null);
  };

  // --- Renderização ---
  if (loading && isInitialLoad.current) { // Loading inicial
    return (
        <div className="flex flex-col items-center justify-center p-10 min-h-[400px]">
            <Loader2 className={`h-8 w-8 animate-spin ${CIANO_COLOR_TEXT} mb-3`} />
            <p className="text-gray-600">Carregando agenda...</p>
        </div>
    );
  }
   if (error) { // Erro no carregamento inicial
     return <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>;
   }

  return (
    <div className="font-sans">
      {/* <h1 className="text-2xl font-semibold text-gray-900 mb-6">Agenda Horalis</h1> */} {/* Título removido do layout */}

      <HoralisFullCalendar
        calendarRef={calendarRef}
        events={events}
        editable={true}
        eventDrop={handleEventDrop}
        eventClick={handleEventClick}
        dateClick={handleDateClick} // Clique simples
        select={handleTimeSelect}   // Seleção de período
        selectable={true}
        selectMirror={true}
        selectOverlap={false}
        longPressDelay={250}      // Otimização touch
        eventDurationEditable={false} // Otimização touch
        initialView="timeGridWeek" // Visão inicial
      />

      {/* Modais */}
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
        salaoId={salaoId}
        initialDateTime={initialSlot}
        initialDuration={initialDuration} // Passa a duração
        onSaveSuccess={handleManualSaveSuccess}
      />
    </div>
  );
}

export default CalendarioPage;