// frontend/src/pages/painel/CalendarioPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'; // Adicionado useRef
import { useParams } from 'react-router-dom';
import axios from 'axios';
import HoralisFullCalendar from '@/components/HoralisFullCalendar';
import {
  format,
  addMonths,
  subMonths,
  startOfToday,
  setHours, 
  setMinutes,
  parseISO
} from 'date-fns';
import { Loader2, X, Clock, User, Phone, DollarSign, PlusCircle } from "lucide-react"; 
import { auth, db } from '@/firebaseConfig'; // <<< IMPORTA 'db' (FIRESTORE)
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore"; // <<< IMPORTA FUNÇÕES DO FIRESTORE
import toast from 'react-hot-toast'; // <<< IMPORTA O TOAST

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- ARRAY DE CORES DA MARCA HORALIS ---
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
  if (!isOpen || !event) return null;

  // Obtendo dados de extendedProps do evento
  // NOTE: O backend envia os campos 'customerName', 'customerPhone', etc.
  const { customerName, customerPhone, serviceName, durationMinutes } = event.extendedProps || {};

  // As propriedades start/end são objetos Date (graças ao FullCalendar)
  const startTime = event.start.toLocaleString('pt-BR');
  const endTime = event.end.toLocaleString('pt-BR');

  // Assumimos que 'durationMinutes' foi adicionado ao extendedProps no backend
  const duration = event.extendedProps.durationMinutes || "30";

  return (
    // Modal Overlay
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl">

        {/* Cabeçalho do Modal */}
        <div className="flex justify-between items-center p-5 border-b" style={{ backgroundColor: event.backgroundColor }}>
          <h2 className="text-xl font-semibold text-white">
            {event.title}
          </h2>
          <button onClick={onClose} className="text-white hover:opacity-80">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 space-y-4">

          <p className="text-sm font-medium text-gray-700">Detalhes do Agendamento:</p>

          {/* Linha de Horário e Serviço */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Clock className="w-5 h-5 text-gray-500" />
            <div>
              {/* Formata a data para exibir HH:MM */}
              <p className="text-base font-semibold">{format(event.start, 'dd/MM HH:mm')} - {format(event.end, 'HH:mm')}</p>
              <p className="text-xs text-gray-500">Serviço: {serviceName || event.title.split(' - ')[0]} ({duration} min)</p>
            </div>
          </div>

          {/* Linha de Cliente */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-1">Dados do Cliente:</p>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-gray-900">{customerName || 'Não Informado'}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <Phone className="w-5 h-5 text-purple-600" />
              <span className="text-gray-600">{customerPhone || 'N/A'}</span>
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
// --- Fim do Componente Modal para Detalhes/Ações do Evento ---

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
  const [events, setEvents] = useState([]); // Armazena os eventos carregados
  const [loading, setLoading] = useState(true); // Controla o loading INICIAL
  const [error, setError] = useState(null);
  const { salaoId } = useParams();
  const calendarRef = useRef(null);
  
  // --- Ref para controlar o carregamento inicial ---
  // Isso impede que o toast dispare para todos os eventos na primeira carga
  const isInitialLoad = useRef(true); 
  // --- Fim da Ref ---

  // --- Estados dos Modais ---
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [initialSlot, setInitialSlot] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // --- REMOVIDA A FUNÇÃO 'loadEventsFromAPI' (axios) ---
  // --- REMOVIDO O 'useEffect' antigo que chamava 'loadEventsFromAPI' ---

  // --- HOOK DE ATUALIZAÇÃO EM TEMPO REAL (onSnapshot) ---
  useEffect(() => {
    // Não faz nada se não tiver o salaoId ou o usuário logado
    const currentUser = auth.currentUser;
    if (!salaoId || !currentUser) {
        setLoading(false);
        setError("Usuário não autenticado ou ID do salão inválido.");
        return;
    }

    setLoading(true);
    
    // 1. Define a coleção que queremos "ouvir"
    const agendamentosRef = collection(db, 'cabeleireiros', salaoId, 'agendamentos');
    
    // 2. Cria o "Ouvinte" (Listener)
    const unsubscribe = onSnapshot(agendamentosRef, (querySnapshot) => {
        console.log("[Firestore Listener] Novos dados recebidos!");
        const rawEvents = [];
        
        // --- LÓGICA DE DETECÇÃO DE MUDANÇAS (Para o Toast) ---
        querySnapshot.docChanges().forEach((change) => {
            // Se o documento foi ADICIONADO e NÃO é a carga inicial
            if (change.type === "added" && !isInitialLoad.current) {
                const newData = change.doc.data();
                console.log("Novo Agendamento Detectado:", newData.serviceName);
                toast.success(
                    `Novo Agendamento: ${newData.serviceName} - ${newData.customerName}`,
                    { icon: '✨' }
                );
            }
        });
        // --- FIM DA LÓGICA DO TOAST ---
        
        // Processa a lista inteira para renderizar (como no seu código)
        querySnapshot.forEach((doc) => {
            const data = doc.data(); // Usa .data() (JavaScript)

            const startTime = data.startTime?.toDate(); // Converte Timestamp
            const endTime = data.endTime?.toDate();

            if (startTime && endTime) {
                const colorIndex = rawEvents.length % HORALIS_EVENT_COLORS.length;
                const color = HORALIS_EVENT_COLORS[colorIndex];

                rawEvents.push({
                    id: doc.id,
                    title: `${data.serviceName} - ${data.customerName}`,
                    start: startTime,
                    end: endTime,
                    backgroundColor: color,
                    borderColor: color,
                    extendedProps: {
                        customerName: data.customerName,
                        customerPhone: data.customerPhone,
                        serviceName: data.serviceName,
                        durationMinutes: data.durationMinutes
                    }
                });
            } else {
                console.warn("Agendamento ignorado (data inválida):", doc.id);
            }
        });

        setEvents(rawEvents); // Atualiza o estado do React
        setLoading(false); // Para o loading inicial
        isInitialLoad.current = false; // Marca que a carga inicial terminou

    }, (err) => {
        // Callback de Erro do Listener
        console.error("[Firestore Listener] Erro:", err);
        setError("Não foi possível conectar à agenda em tempo real.");
        setLoading(false);
    });

    // 4. Função de Limpeza (Cleanup)
    return () => {
        console.log("[Firestore Listener] Desconectando...");
        unsubscribe(); // Para o listener
    };

  }, [salaoId]); // Dependência: só recria o listener se o salaoId mudar
  // --- FIM DO HOOK ---
  
  // --- REMOVIDO: handleDatesSet (Não é mais necessário) ---
  // O onSnapshot cuida de todas as atualizações de data


  const handleDatesSet = (dateInfo) => {
    // Este é o método que o FullCalendar chama quando a visão muda (mês, semana, dia)
    const start = format(dateInfo.start, "yyyy-MM-dd'T'HH:mm:ssXXX");
    const end = format(dateInfo.end, "yyyy-MM-dd'T'HH:mm:ssXXX");
    loadEventsFromAPI(start, end);
  };


  // 1. CLIQUE EM EVENTO EXISTENTE (Abre modal de Detalhes)
  const handleEventClick = (clickInfo) => {
    // console.log("Evento clicado:", clickInfo.event);
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

    // 1. Inicializa o slot com a data/hora clicada (objeto Date)
    setInitialSlot(dateInfo.date);
    // 2. Abre o modal
    setIsManualModalOpen(true); // <<< LINHA QUE FALTAVA
  };
  // --- Fim dos Manipuladores ---


  // --- Funções de Recarregamento/Fechamento do Modal ---
  const handleManualSaveSuccess = () => {
    setIsManualModalOpen(false); // Fecha o modal

    // NÃO PRECISAMOS MAIS CHAMAR refetchEvents()!
    // O onSnapshot vai detetar o novo agendamento (criado pelo modal)
    // e atualizar a UI (o estado 'events') automaticamente.
  };

  // --- Renderização Principal ---
  if (loading) { // Mostra o loading SÓ na primeira carga
    return (
      <div className="flex flex-col gap-4 min-h-[400px] items-center justify-center bg-white rounded-xl shadow p-6">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="text-gray-600">Conectando à agenda...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Agenda Horalis</h1>

      {/* Botão de Adicionar Agendamento Manual (Abre Modal) */}
      

      <HoralisFullCalendar
        calendarRef={calendarRef}
        events={events} // Passa a lista DE ESTADO (que é atualizada pelo onSnapshot)

        // REMOVIDO: datesSet={fetchEvents} (Não é mais necessário)

        eventClick={handleEventClick}
        dateClick={handleDateClick}
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
        onSaveSuccess={handleManualSaveSuccess} // Será criada no futuro
      />
    </div>
  );
}

export default CalendarioPage;