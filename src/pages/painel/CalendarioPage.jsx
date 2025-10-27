// frontend/src/pages/painel/CalendarioPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import HoralisFullCalendar from '@/components/HoralisFullCalendar';
import {
  format,
  // (imports não utilizados removidos para limpeza)
} from 'date-fns';
import { Loader2, X, Clock, User, Phone } from "lucide-react"; // <<< Removido PlusCircle, DollarSign
import { auth, db } from '@/firebaseConfig';
import { collection, onSnapshot } from "firebase/firestore"; // <<< Simplificado
import toast from 'react-hot-toast';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";
const HORALIS_EVENT_COLORS = [
  '#3788D8', '#1B9AAA', '#D83788', '#7C3AED', '#37D88B', '#EC4899',
];

// --- Componente Modal para Detalhes/Ações do Evento ---
// <<< MUDANÇA: Adicionadas props 'salaoId' e 'onCancelSuccess' >>>
const EventDetailsModal = ({ isOpen, onClose, event, salaoId, onCancelSuccess }) => {
  // <<< MUDANÇA: Adicionado estado de loading para o botão de cancelar >>>
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !event) return null;

  const { customerName, customerPhone, serviceName, durationMinutes } = event.extendedProps || {};
  const duration = durationMinutes || "30";

  // <<< MUDANÇA: Lógica para o botão "Cancelar Agendamento" >>>
  const handleCancelAppointment = async () => {
    // 1. Confirmação
    if (!window.confirm("Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.")) {
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Cancelando agendamento...");

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Sessão expirada.");
      const token = await currentUser.getIdToken();
      
      // 2. Chama a API de DELETE
      await axios.delete(
        `${API_BASE_URL}/admin/calendario/${salaoId}/agendamentos/${event.id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // 3. Sucesso
      toast.success("Agendamento cancelado!", { id: toastId });
      onCancelSuccess(); // Fecha o modal (o onSnapshot vai atualizar o calendário)

    } catch (err) {
      console.error("Erro ao cancelar agendamento:", err);
      toast.error(err.response?.data?.detail || "Falha ao cancelar.", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl">

        {/* Cabeçalho do Modal */}
        <div className="flex justify-between items-center p-5 border-b" style={{ backgroundColor: event.backgroundColor }}>
          <h2 className="text-xl font-semibold text-white">
            {event.title}
          </h2>
          <button onClick={onClose} className="text-white hover:opacity-80" disabled={isLoading}>
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
            {/* <<< MUDANÇA: Botão de Cancelar agora é funcional >>> */}
            <button
              onClick={handleCancelAppointment}
              disabled={isLoading}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Cancelar Agendamento
            </button>
            
            {/* <<< MUDANÇA: Botão "Reagendar" removido. >>> */}
            {/* A função de reagendar será feita com drag-and-drop no calendário */}
            
          </div>
        </div>
      </div>
    </div>
  );
};
// --- Fim do Componente Modal para Detalhes/Ações do Evento ---

// --- Componente Modal para CRIAR Agendamento Manual (Sem alterações) ---
const ManualBookingModal = ({ isOpen, onClose, salaoId, initialDateTime, onSaveSuccess }) => {
  // (Este componente permanece 100% igual ao que você enviou)
  // ... (código do ManualBookingModal) ...
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceName, setServiceName] = useState(''); 
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialDateTime) {
      setServiceName(`Agendamento - ${format(initialDateTime, 'dd/MM - HH:mm')}`);
    } else {
      // Limpa campos quando o modal é reaberto sem data (se necessário)
      setName('');
      setPhone('');
      setServiceName('');
      setDuration(30);
      setError(null);
    }
  }, [initialDateTime]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!name.trim() || !serviceName.trim() || duration < 10) {
      setError("Por favor, preencha nome, descrição e duração (mín. 10 min).");
      setLoading(false);
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Sessão expirada.");
      const token = await currentUser.getIdToken();

      const payload = {
        salao_id: salaoId,
        start_time: initialDateTime.toISOString(),
        duration_minutes: duration,
        customer_name: name.trim(),
        customer_phone: phone.trim() || null, // Envia null se vazio
        service_name: serviceName.trim(),
      };

      await axios.post(`${API_BASE_URL}/admin/calendario/agendar`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      onSaveSuccess(); // Chama a função de sucesso (que fecha o modal)
      
      // Limpa o formulário para a próxima vez
      setName('');
      setPhone('');
      setServiceName('');
      setDuration(30);
      setError(null);

    } catch (err) {
      console.error("Erro ao agendar manualmente:", err);
      setError(err.response?.data?.detail || "Falha ao salvar agendamento manual.");
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
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

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Cliente*</label>
            <input name="name" id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" disabled={loading} required placeholder="Nome do Cliente" />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telefone</label>
            <input name="phone" id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" disabled={loading} placeholder="Opcional" />
          </div>

          <div>
            <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700">Descrição do Serviço*</label>
            <input name="serviceName" id="serviceName" type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" disabled={loading} required placeholder="Ex: Corte e Química" />
          </div>

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
// --- Fim do Componente Modal Manual ---


function CalendarioPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { salaoId } = useParams();
  const calendarRef = useRef(null);
  const isInitialLoad = useRef(true); 

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [initialSlot, setInitialSlot] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // --- HOOK DE ATUALIZAÇÃO EM TEMPO REAL (onSnapshot) ---
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!salaoId || !currentUser) {
      setLoading(false);
      setError("Usuário não autenticado ou ID do salão inválido.");
      return;
    }

    setLoading(true);
    const agendamentosRef = collection(db, 'cabeleireiros', salaoId, 'agendamentos');
    
    const unsubscribe = onSnapshot(agendamentosRef, (querySnapshot) => {
      console.log("[Firestore Listener] Novos dados recebidos!");
      const rawEvents = [];
      
      querySnapshot.docChanges().forEach((change) => {
        if (change.type === "added" && !isInitialLoad.current) {
          const newData = change.doc.data();
          console.log("Novo Agendamento Detectado:", newData.serviceName);
          toast.success(
            `Novo Agendamento: ${newData.serviceName} - ${newData.customerName}`,
            { icon: '✨' }
          );
        }
        // <<< MUDANÇA: Adicionado toast para remoção >>>
        if (change.type === "removed" && !isInitialLoad.current) {
            const removedData = change.doc.data();
            toast('Agendamento removido.', { icon: '🗑️' });
        }
      });
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const startTime = data.startTime?.toDate();
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
              durationMinutes: data.durationMinutes,
              // <<< MUDANÇA: Passa o googleEventId (se existir) >>>
              googleEventId: data.googleEventId 
            }
          });
        } else {
          console.warn("Agendamento ignorado (data inválida):", doc.id);
        }
      });

      setEvents(rawEvents);
      setLoading(false);
      isInitialLoad.current = false;

    }, (err) => {
      console.error("[Firestore Listener] Erro:", err);
      setError("Não foi possível conectar à agenda em tempo real.");
      setLoading(false);
    });

    return () => {
      console.log("[Firestore Listener] Desconectando...");
      unsubscribe();
    };

  }, [salaoId]);
  
  // --- <<< MUDANÇA: Removida a função 'handleDatesSet' (obsoleta) >>> ---

  // 1. CLIQUE EM EVENTO EXISTENTE
  const handleEventClick = (clickInfo) => {
    // <<< MUDANÇA: Passa o 'id' do evento para o modal >>>
    // O 'id' aqui é o ID do Documento do Firestore
    setSelectedEvent({
      id: clickInfo.event.id, // <<< ESSENCIAL PARA O DELETE
      title: clickInfo.event.title,
      start: clickInfo.event.start,
      end: clickInfo.event.end,
      backgroundColor: clickInfo.event.backgroundColor,
      extendedProps: clickInfo.event.extendedProps,
    });
    setIsDetailsModalOpen(true);
  };

  // 2. CLIQUE EM SLOT VAGO
  const handleDateClick = (dateInfo) => {
    console.log("Slot vago clicado:", dateInfo.dateStr);
    setInitialSlot(dateInfo.date);
    setIsManualModalOpen(true); 
  };
  
  // <<< MUDANÇA: Adicionada função de REAGENDAMENTO (Drag-and-Drop) >>>
  const handleEventDrop = useCallback(async (dropInfo) => {
    const { event } = dropInfo;
    const agendamentoId = event.id;
    const newStartTime = event.start.toISOString();

    // 1. Confirmação
    if (!window.confirm(`Reagendar "${event.title}" para ${format(event.start, 'dd/MM HH:mm')}?`)) {
      dropInfo.revert(); // Desfaz a mudança visual
      return;
    }

    const toastId = toast.loading("Reagendando...");
    try {
      const token = await auth.currentUser.getIdToken();
      
      // 2. Prepara o corpo da requisição PATCH
      const payload = { 
        new_start_time: newStartTime 
      };

      // 3. Chama a API
      await axios.patch(
        `${API_BASE_URL}/admin/calendario/${salaoId}/agendamentos/${agendamentoId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 4. Sucesso
      toast.success("Reagendado com sucesso!", { id: toastId });
      // O onSnapshot vai cuidar de atualizar a UI, 
      // mostrando o evento na posição correta (vinda do Firestore)

    } catch (err) {
      console.error("Erro ao reagendar (arrastar):", err);
      toast.error(err.response?.data?.detail || "Falha ao reagendar.", { id: toastId });
      dropInfo.revert(); // Desfaz a mudança visual em caso de erro
    }
  }, [salaoId]); // Depende do salaoId

  const handleManualSaveSuccess = () => {
    setIsManualModalOpen(false);
    // onSnapshot cuida do resto!
  };

  if (loading) {
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
      
      {/* Explicação: 
        Para reagendar, apenas arraste o evento no calendário.
        Para cancelar, clique no evento e use o botão "Cancelar".
        Para criar um novo, clique em um slot vago.
      */}

      <HoralisFullCalendar
        calendarRef={calendarRef}
        events={events}
        
        // <<< MUDANÇA: Habilita "arrastar" (editable) e define a função (eventDrop) >>>
        editable={true} 
        eventDrop={handleEventDrop}

        eventClick={handleEventClick}
        dateClick={handleDateClick}
        initialView="timeGridWeek"
        
        // <<< MUDANÇA: Removido 'datesSet' (obsoleto) >>>
      />

      {/* 1. MODAL DE VISUALIZAÇÃO DE DETALHES */}
      <EventDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        event={selectedEvent}
        // <<< MUDANÇA: Passa as props necessárias para o Cancelar >>>
        salaoId={salaoId}
        onCancelSuccess={() => setIsDetailsModalOpen(false)}
      />

      {/* 2. MODAL DE CRIAÇÃO MANUAL */}
      <ManualBookingModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        salaoId={salaoId}
        initialDateTime={initialSlot}
        onSaveSuccess={handleManualSaveSuccess}
      />
    </div>
  );
}

export default CalendarioPage;