// frontend/src/pages/painel/CalendarioPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import HoralisFullCalendar from '@/components/HoralisFullCalendar';
import {
  format,
  addMonths,
  subMonths,
  startOfToday,
  setHours, // Adicionado para inicializar hora do agendamento manual
  setMinutes
} from 'date-fns';
import { Loader2, X, Clock, User, Phone, DollarSign, PlusCircle } from "lucide-react"; // Adicionado PlusCircle
import { auth } from '@/firebaseConfig';
const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- ARRAY DE CORES DA MARCA HORALIS ---
// Usaremos estas cores para dar um visual agradável aos agendamentos
const HORALIS_EVENT_COLORS = [
  '#3788D8', // Azul (Padrão)
  '#1B9AAA', // Ciano
  '#D83788', // Pink
  '#7C3AED', // Roxo (Violet)
  '#37D88B', // Verde
  '#EC4899', // Rosa
];
// --- FIM DO ARRAY DE CORES ---


// --- Componente Modal para Detalhes/Ações do Evento ---
const EventDetailsModal = ({ isOpen, onClose, event }) => {
  // ... (Este componente permanece o mesmo para Visualização) ...
  if (!isOpen || !event) return null;

  const { customerName, customerPhone, serviceName, durationMinutes } = event.extendedProps || {};

  return (
    // Modal Overlay (JSX)
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl">
        <div className="flex justify-between items-center p-5 border-b" style={{ backgroundColor: event.backgroundColor }}>
          <h2 className="text-xl font-semibold text-white">
            {event.title}
          </h2>
          <button onClick={onClose} className="text-white hover:opacity-80">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm font-medium text-gray-700">Detalhes do Agendamento:</p>

          {/* Linha de Detalhes (Horário) */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Clock className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-base font-semibold">{format(event.start, 'dd/MM HH:mm')} - {format(event.end, 'HH:mm')}</p>
              <p className="text-xs text-gray-500">Total: {serviceName || 'Serviço'} ({durationMinutes || 30} min)</p>
            </div>
          </div>

          {/* Linha de Cliente */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-1">Dados do Cliente:</p>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-gray-900">{customerName}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <Phone className="w-5 h-5 text-purple-600" />
              <span className="text-gray-600">{customerPhone}</span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors">
              Cancelar Agendamento
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Reagendar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Componente Modal para CRIAR Agendamento Manual ---
const ManualBookingModal = ({ isOpen, onClose, salaoId, initialDateTime, onSaveSuccess }) => {
  // ESTADOS PARA O FORMULÁRIO MANUAL
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceName, setServiceName] = useState(''); // Nome do serviço (customizado)
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Define a hora/data inicial do formulário (do slot clicado)
  useEffect(() => {
    if (initialDateTime) {
      // Inicializa o nome do serviço com a data formatada
      setServiceName(`Agendamento - ${format(initialDateTime, 'dd/MM - HH:mm')}`);
    }
  }, [initialDateTime]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Validação simples
    if (!name.trim() || !phone.trim() || !serviceName.trim() || duration < 10) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      setLoading(false);
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Sessão expirada.");
      const token = await currentUser.getIdToken();

      // 2. Prepara os dados para o NOVO ENDPOINT (POST /admin/calendario/agendar)
      const payload = {
        salao_id: salaoId,
        start_time: initialDateTime.toISOString(), // Data/Hora do slot clicado
        duration_minutes: duration,
        customer_name: name.trim(),
        customer_phone: phone,
        service_name: serviceName.trim(), // Nome do serviço customizado
        // Note: Não precisamos de service_id, pois não estamos a usar a lista de serviços
      };

      // 3. Chamada à API (Backend precisará de um endpoint POST /admin/calendario/agendar)
      await axios.post(`${API_BASE_URL}/admin/calendario/agendar`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 4. Sucesso: Recarrega o calendário e fecha o modal
      onSaveSuccess();
      onClose();

    } catch (err) {
      console.error("Erro ao agendar manualmente:", err);
      setError(err.response?.data?.detail || "Falha ao salvar agendamento manual.");
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    // Modal Overlay (JSX)
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            Agendamento Manual
          </h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-900">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm font-semibold text-purple-600">
            Horário: {initialDateTime ? format(initialDateTime, 'dd/MM/yyyy HH:mm') : 'Indefinido'}
          </p>

          {/* Campo Nome do Cliente */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Cliente*</label>
            <input name="name" id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" disabled={loading} required placeholder="Nome do Cliente" />
          </div>

          {/* Campo Telefone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telefone</label>
            <input name="phone" id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" disabled={loading} placeholder="Opcional" />
          </div>

          {/* Campo Serviço Customizado */}
          <div>
            <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700">Descrição do Serviço*</label>
            <input name="serviceName" id="serviceName" type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" disabled={loading} required placeholder="Ex: Corte e Química" />
          </div>

          {/* Duração */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Duração (min)*</label>
            <input name="duration" id="duration" type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 0)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" disabled={loading} required min="10" />
          </div>

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'Salvar Agendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


function CalendarioPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { salaoId } = useParams();

  // --- Estados do Modal Manual ---
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [initialSlot, setInitialSlot] = useState(null); // Slot clicado no calendário
  // --- Fim dos Estados do Modal Manual ---

  // --- Estados do Modal de Detalhes ---
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  // --- Fim dos Estados do Modal de Detalhes ---




  // Função para buscar os eventos (compatível com a API FullCalendar)
  const fetchEvents = useCallback(async (fetchInfo, successCallback, failureCallback) => {

    const currentUser = auth.currentUser;
    if (!currentUser) { failureCallback({ message: "Sessão expirada." }); return; }
    const token = await currentUser.getIdToken();

    if (!events.length) setLoading(true);
    setError(null);

    try {
      const start = format(fetchInfo.start, "yyyy-MM-dd'T'HH:mm:ssXXX");
      const end = format(fetchInfo.end, "yyyy-MM-dd'T'HH:mm:ssXXX");

      const response = await axios.get(`${API_BASE_URL}/admin/calendario/${salaoId}/eventos`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { start: start, end: end }
      });

      const rawEvents = Array.isArray(response.data) ? response.data : [];

      // 1. LÓGICA DE ATRIBUIÇÃO DE CORES:
      const coloredEvents = rawEvents.map((event, index) => {
        // Usa o índice do agendamento para escolher uma cor do array
        const colorIndex = index % HORALIS_EVENT_COLORS.length;
        const color = HORALIS_EVENT_COLORS[colorIndex];

        return {
          ...event,
          backgroundColor: color,
          borderColor: color,
          // Garante que o start e end sejam strings ISO para o FullCalendar
          start: event.start,
          end: event.end,
          // Duração (necessário para o modal)
          durationMinutes: event.extendedProps.durationMinutes || 30
        };
      });

      setEvents(coloredEvents);
      successCallback(coloredEvents); // Manda para o FullCalendar

    } catch (err) {
      console.error("[FullCalendar] ERRO ao buscar:", err.response?.data?.detail || err.message);
      const errorMsg = err.response?.data?.detail || err.message || "Não foi possível carregar os agendamentos.";
      setError(errorMsg);
      failureCallback({ message: errorMsg });
    } finally {
      if (!events.length) setLoading(false);
    }
  }, [salaoId, events.length]); // Depende do salaoId e do events.length


  // Hook para Disparo Inicial (Garante que a primeira busca aconteça)
  useEffect(() => {
    if (auth.currentUser && !events.length && loading) {
      const today = new Date();
      const initialFetchInfo = {
        start: subMonths(today, 1),
        end: addMonths(today, 3)
      };
      fetchEvents(initialFetchInfo, (newEvents) => {
        setEvents(newEvents);
        setLoading(false);
      }, (error) => {
        setError(error);
        setLoading(false);
      });
    } else if (!auth.currentUser && loading) {
      setError("Sessão expirada. Por favor, faça login.");
      setLoading(false);
    }
  }, [salaoId, events.length, loading, fetchEvents]);


  // --- Manipuladores de Interação do FullCalendar ---
  // 1. CLIQUE EM EVENTO EXISTENTE (Abre modal de Detalhes)
  const handleEventClick = (clickInfo) => {
    // Formata o evento para ser exibido no modal
    const eventData = {
      title: clickInfo.event.title,
      start: clickInfo.event.start,
      end: clickInfo.event.end,
      backgroundColor: clickInfo.event.backgroundColor,
      extendedProps: clickInfo.event.extendedProps,
    };
    setSelectedEvent(eventData);
    setIsDetailsModalOpen(true);
  };

  // 2. CLIQUE EM SLOT VAGO (Abre modal de Criação Manual)
  const handleDateClick = (dateInfo) => {
    console.log("Slot vago clicado:", dateInfo.dateStr);
    // 1. Inicializa o slot com a data/hora clicada
    setInitialSlot(dateInfo.date);
    // 2. Abre o modal
    setIsManualModalOpen(true);
  };
  // --- Fim dos Manipuladores ---

  // --- Funções de Recarregamento/Fechamento do Modal ---
  const handleManualSaveSuccess = () => {
    // Quando um agendamento é salvo, disparamos o fetchEvents para recarregar a agenda
    const today = new Date();
    const fetchInfo = { start: subMonths(today, 1), end: addMonths(today, 3) };
    fetchEvents(fetchInfo, (newEvents) => setEvents(newEvents), (error) => setError(error));
  };
  // --- Fim das Funções de Recarregamento ---


  // Renderização de Loading ou Erro inicial
  if (loading && events.length === 0) {
    return (
      <div className="flex flex-col gap-4 min-h-[400px] items-center justify-center bg-white rounded-xl shadow p-6">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="text-gray-600">Carregando agenda...</p>
      </div>
    );
  }

  if (error) { /* ... JSX de Erro ... */ }

  // --- Renderização Principal ---
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Agenda Horalis</h1>

      {/* Botão de Adicionar Agendamento Manual (Abre Modal) */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setInitialSlot(setMinutes(setHours(new Date(), 9), 0)); setIsManualModalOpen(true); }} // Slot padrão de 9:00
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700 transition-colors"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Adicionar Manualmente
        </button>
      </div>

      <HoralisFullCalendar
        events={events}
        datesSet={fetchEvents}
        eventClick={handleEventClick} // Configura o clique no evento
        dateClick={handleDateClick} // Configura o clique em slot vago (para agendar manual)
        initialView="timeGridWeek"
      />

      {/* 1. MODAL DE VISUALIZAÇÃO DE DETALHES */}
      <EventDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        event={selectedEvent}
      />

      {/* 2. MODAL DE CRIAÇÃO MANUAL */}
      <ManualBookingModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        salaoId={salaoId}
        initialDateTime={initialSlot}
        onSaveSuccess={handleManualSaveSuccess} // Recarrega a agenda após salvar
      />
    </div>
  );
}

export default CalendarioPage;