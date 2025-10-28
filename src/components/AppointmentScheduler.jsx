// frontend/src/components/AppointmentScheduler.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, isBefore, startOfToday, parseISO } from 'date-fns';
// import { ptBR } from 'date-fns/locale'; // Descomente se usar ptBR na formatação
import { Clock, User, Phone, DollarSign, Mail, Loader2 } from 'lucide-react'; // Adicionado Loader2
import HoralisCalendar from './HoralisCalendar'; // Assume que HoralisCalendar está estilizado separadamente

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// <<< DEFINIÇÕES DE COR >>>
const CIANO_COLOR_TEXT = 'text-cyan-600';
const CIANO_COLOR_BG = 'bg-cyan-600';
const CIANO_COLOR_BG_HOVER = 'hover:bg-cyan-700';
const CIANO_RING_FOCUS = 'focus:ring-cyan-500'; // Um pouco mais escuro para inputs
const CIANO_BORDER_FOCUS = 'focus:border-cyan-500';

// Helper Ícone Simples
const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);


// <<< ALTERADO: Removido styleOptions das props >>>
function AppointmentScheduler({ salaoId, selectedService, onAppointmentSuccess }) {
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errorSlots, setErrorSlots] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [confirmCustomerPhone, setConfirmCustomerPhone] = useState('');
  const [validationError, setValidationError] = useState('');

  const isFormValid =
      selectedSlot &&
      customerName.trim() &&
      customerEmail.trim() &&
      customerPhone &&
      customerPhone === confirmCustomerPhone &&
      !isBooking;

  const serviceName = selectedService?.nome_servico || 'Serviço';
  const serviceDuration = selectedService?.duracao_minutos || 0;
  const servicePrice = selectedService?.preco;

  // --- Lógica de busca de horários (sem alteração funcional) ---
  useEffect(() => {
    let isMounted = true;
    const fetchSlots = async () => {
      // ... (lógica fetchSlots existente) ...
       if (!selectedDate || !salaoId || !selectedService?.id) {
        if(isMounted) {
            setErrorSlots("Selecione um serviço e data."); // Mensagem mais clara
            setAvailableSlots([]); setLoadingSlots(false);
        } return;
      }
      if(isMounted) { setLoadingSlots(true); setSelectedSlot(null); setValidationError(''); setErrorSlots(null); }
      try {
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        const response = await axios.get(`${API_BASE_URL}/saloes/${salaoId}/horarios-disponiveis`, {
          params: { service_id: selectedService.id, date: formattedDate },
        });
        if (isMounted) {
            if (response.data?.horarios_disponiveis) {
                const sortedSlots = response.data.horarios_disponiveis
                                        .map(slot => parseISO(slot))
                                        .sort((a, b) => a - b);
                setAvailableSlots(sortedSlots);
            } else { setErrorSlots("Nenhum horário retornado."); setAvailableSlots([]); }
        }
      } catch (error) {
        if (isMounted) { setErrorSlots(error.response?.data?.detail || "Erro ao buscar horários."); setAvailableSlots([]); }
      } finally { if (isMounted) { setLoadingSlots(false); } }
    };
    fetchSlots();
    return () => { isMounted = false; };
  }, [selectedDate, selectedService?.id, salaoId]);

  // --- Handle DateSelect (sem alteração funcional) ---
  const handleDateSelect = (date) => {
    if (isBefore(date, startOfToday())) return;
    setSelectedDate(date);
    setSelectedSlot(null);
    setValidationError('');
  };

  // --- Lógica Final de Agendamento (sem alteração funcional) ---
  const handleFinalizeAppointment = async () => {
    setValidationError('');
    // Validações...
    if (!isFormValid) { setValidationError("Preencha todos os campos corretamente."); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail.trim())) { setValidationError("Formato de e-mail inválido."); return; }
    const phoneRegex = /^\d{10,11}$/;
    const cleanedPhone = customerPhone.replace(/\D/g, '');
    if (!phoneRegex.test(cleanedPhone)) { setValidationError("Telefone inválido (DDD + Número)."); return; }
    if (customerPhone !== confirmCustomerPhone) { setValidationError("Os telefones não coincidem."); return; }

    setIsBooking(true);
    try {
      const startTimeISO = selectedSlot.toISOString();
      await axios.post(`${API_BASE_URL}/agendamentos`, {
        salao_id: salaoId, service_id: selectedService.id, start_time: startTimeISO,
        customer_name: customerName.trim(), customer_email: customerEmail.trim(), customer_phone: customerPhone
      });
      onAppointmentSuccess({
        serviceName, startTime: startTimeISO, customerName: customerName.trim(),
        customerEmail: customerEmail.trim(), customerPhone
      });
    } catch (error) {
      setValidationError(`Erro: ${error.response?.data?.detail || 'Tente novamente.'}`);
      setIsBooking(false);
    }
    // Não resetar isBooking aqui, pois o componente será desmontado em caso de sucesso
  };

  // <<< REMOVIDO: Cores dinâmicas baseadas em styleOptions >>>

  // --- Renderização ---
  return (
    // Adicionado font-sans se não for global
    <div className="px-4 pb-32 font-sans">
      {/* Card detalhes do serviço */}
      <div className="bg-white rounded-xl p-5 mb-6 shadow-sm border border-gray-100">
         {/* <<< ALTERADO: Título com cor ciano >>> */}
        <h2 className={`text-xl font-bold mb-1 ${CIANO_COLOR_TEXT}`}>
          {serviceName}
        </h2>
        <div className="flex items-center gap-4 text-sm text-gray-500 font-light mt-2">
          <div className="flex items-center gap-1.5"> {/* Aumentado gap */}
            <Icon icon={Clock} className="w-4 h-4 text-gray-400" /> {/* Aumentado tamanho */}
            <span>Duração: {serviceDuration} min</span>
          </div>
          {servicePrice != null && servicePrice > 0 && (
            <div className="flex items-center gap-1.5">
              <Icon icon={DollarSign} className="w-4 h-4 text-gray-400" />
              <span>R$ {servicePrice.toFixed(2).replace('.', ',')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Seção 1: Calendário */}
      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-2 text-sm text-center">1. Escolha a Data</label>
        <HoralisCalendar
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
           // <<< REMOVIDO: styleOptions={styleOptions} >>>
           // O HoralisCalendar precisa ter seu próprio estilo ciano/padrão agora
        />
      </div>

      {/* Seção 2: Horários */}
      <div className="mb-8">
        <label className="block text-gray-700 font-medium mb-3 text-sm text-center">2. Selecione o Horário</label>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 max-h-[300px] overflow-y-auto">
          {loadingSlots && (<p className="text-center text-sm text-gray-500 py-4">Buscando horários...</p>)}
          {errorSlots && (<div className="p-3 text-center bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{errorSlots}</p></div>)}
          {!loadingSlots && !errorSlots && availableSlots.length === 0 && (
            <div className="p-4 text-center bg-gray-100 border border-gray-200 rounded-lg"><p className="text-sm text-gray-500">Nenhum horário disponível para esta data.</p></div>
          )}
          {!loadingSlots && !errorSlots && availableSlots.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {availableSlots.map((slotDate) => {
                const isSelected = selectedSlot && selectedSlot.getTime() === slotDate.getTime();
                const isDisabled = isBefore(slotDate, new Date()); // Desabilita horários passados no mesmo dia

                return (
                  <button
                    key={slotDate.toISOString()}
                    onClick={() => { if (!isDisabled) { setSelectedSlot(slotDate); setValidationError(''); } }}
                     // <<< ALTERADO: Estilos ciano para selecionado >>>
                    className={`p-3 rounded-lg text-sm font-medium transition duration-150 ease-in-out shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 ${CIANO_RING_FOCUS} ${
                      isDisabled
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : isSelected
                          ? `${CIANO_COLOR_BG} text-white shadow-md` // Estado Selecionado
                          : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 hover:border-gray-400' // Estado Normal
                    }`}
                    disabled={loadingSlots || isBooking || isDisabled}
                  >
                    {format(slotDate, 'HH:mm')}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Seção 3: Dados do Cliente */}
      {selectedSlot && (
        <div className="mb-8 p-4 bg-white rounded-lg shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-gray-700 font-medium text-sm mb-3 border-b pb-2">3. Seus Dados</h3>
          {/* Campo Nome */}
          <div>
            <label htmlFor="customerName" className="block text-xs font-medium text-gray-600 mb-1"> Seu Nome </label>
            <div className="relative">
              <Icon icon={User} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
               {/* <<< ALTERADO: Foco Ciano >>> */}
              <input id="customerName" type="text" autoComplete="name" required placeholder="Nome Completo"
                     className={`appearance-none block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} sm:text-sm`} // Ajustado padding
                     value={customerName} onChange={(e) => setCustomerName(e.target.value)} disabled={isBooking} />
            </div>
          </div>
          {/* Campo E-mail */}
          <div>
            <label htmlFor="customerEmail" className="block text-xs font-medium text-gray-600 mb-1"> Seu E-mail </label>
            <div className="relative">
              <Icon icon={Mail} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
               {/* <<< ALTERADO: Foco Ciano >>> */}
              <input id="customerEmail" type="email" autoComplete="email" required placeholder="seuemail@dominio.com"
                     className={`appearance-none block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} sm:text-sm`}
                     value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} disabled={isBooking} />
            </div>
          </div>
          {/* Campo Telefone */}
          <div>
            <label htmlFor="customerPhone" className="block text-xs font-medium text-gray-600 mb-1"> Seu Telefone (WhatsApp) </label>
            <div className="relative">
               <Icon icon={Phone} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                {/* <<< ALTERADO: Foco Ciano >>> */}
               <input id="customerPhone" type="tel" autoComplete="tel" required placeholder="DDD + Número"
                      className={`appearance-none block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} sm:text-sm`}
                      value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} disabled={isBooking} />
            </div>
          </div>
          {/* Campo Confirmação Telefone */}
          <div>
            <label htmlFor="confirmCustomerPhone" className="block text-xs font-medium text-gray-600 mb-1"> Confirme seu Telefone </label>
            <div className="relative">
              <Icon icon={Phone} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
               {/* <<< ALTERADO: Foco Ciano (erro mantém vermelho) >>> */}
              <input id="confirmCustomerPhone" type="tel" required placeholder="Digite novamente"
                     className={`appearance-none block w-full pl-9 pr-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-1 sm:text-sm ${
                       confirmCustomerPhone && customerPhone !== confirmCustomerPhone
                       ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                       : `border-gray-300 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`
                     }`}
                     value={confirmCustomerPhone} onChange={(e) => setConfirmCustomerPhone(e.target.value)} disabled={isBooking} />
            </div>
          </div>
          {validationError && (<p className="text-xs text-red-600 text-center mt-2">{validationError}</p>)}
        </div>
      )}

      {/* Botão Final de Confirmação */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)] z-10">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleFinalizeAppointment}
             // <<< ALTERADO: Botão Ciano quando válido >>>
            className={`w-full py-3 rounded-lg text-white font-bold transition duration-300 ease-in-out shadow-md flex items-center justify-center ${
              isFormValid
              ? `${CIANO_COLOR_BG} ${CIANO_COLOR_BG_HOVER}` // Estilo Ativo
              : 'bg-gray-400 cursor-not-allowed' // Estilo Desabilitado
            } disabled:opacity-70`}
            disabled={!isFormValid || isBooking} // Desabilita se inválido OU se estiver carregando
          >
            {isBooking ? (
              <Loader2 className="w-5 h-5 animate-spin stroke-current" />
            ) : (
              'Confirmar Agendamento'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AppointmentScheduler;