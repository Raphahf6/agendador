// frontend/src/components/AppointmentScheduler.jsx (Versão com HoralisCalendar e Scroll de Horários)
import React, { useState, useEffect } from 'react';
import axios from 'axios';
// REMOVIDO: import DatePicker from 'react-datepicker';
// REMOVIDO: import 'react-datepicker/dist/react-datepicker.css';
import { format, isBefore, startOfToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
// REMOVIDO: import { CalendarIcon, ... } from 'lucide-react';
import { Clock, User, Phone, DollarSign } from 'lucide-react'; // Mantidos os ícones usados
import HoralisCalendar from './HoralisCalendar'; // <<< NOVO IMPORT

// API Config
const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";
// O SALAO_ID vem via props

function AppointmentScheduler({ salaoId, selectedService, onAppointmentSuccess, styleOptions }) {
  // Define a data inicial como hoje, sem permitir datas passadas
  const [selectedDate, setSelectedDate] = useState(startOfToday()); 
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null); 
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errorSlots, setErrorSlots] = useState(null);
  const [isBooking, setIsBooking] = useState(false);

  // --- Estados para Nome e Telefone ---
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [confirmCustomerPhone, setConfirmCustomerPhone] = useState('');
  const [validationError, setValidationError] = useState('');
  
  // --- Variável de estado derivada para controlar o botão ---
  const isFormValid = 
      selectedSlot && 
      customerName.trim() && 
      customerPhone && 
      customerPhone === confirmCustomerPhone &&
      !isBooking; 
  // --- Fim da variável ---

  // Deriva o nome e duração do serviço das props
  const serviceName = selectedService?.nome_servico || 'Serviço';
  const serviceDuration = selectedService?.duracao_minutos || 0;
  const servicePrice = selectedService?.preco; 

  // --- Lógica para buscar horários disponíveis (com parseISO) ---
  useEffect(() => {
    let isMounted = true; 
    const fetchSlots = async () => {
      if (!selectedDate || !salaoId || !selectedService?.id) {
          if(isMounted) {
              setErrorSlots("Dados incompletos para buscar horários.");
              setAvailableSlots([]);
              setLoadingSlots(false);
          }
          return;
      }
      if(isMounted) {
          setLoadingSlots(true);
          setSelectedSlot(null); 
          setValidationError(''); 
          setErrorSlots(null);
      }
      try {
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        // console.log(`Buscando horários...`);
        const response = await axios.get(`${API_BASE_URL}/saloes/${salaoId}/horarios-disponiveis`, {
          params: { service_id: selectedService.id, date: formattedDate },
        });

        if (isMounted) {
            if (response.data && Array.isArray(response.data.horarios_disponiveis)) {
                // Converte as strings ISO do backend para objetos Date
                const sortedSlots = response.data.horarios_disponiveis
                                      .map(slot => parseISO(slot)) // Converte string para Date
                                      .sort((a, b) => a - b); // Ordena por data
                setAvailableSlots(sortedSlots);
                // console.log("Horários recebidos (convertidos para Date):", sortedSlots);
            } else {
                console.error("Formato de resposta inesperado:", response.data);
                setErrorSlots("Formato de resposta inesperado da API.");
                setAvailableSlots([]);
            }
        }
      } catch (error) {
        console.error("Erro detalhado ao buscar horários:", error.response || error);
        if (isMounted) {
            setErrorSlots(error.response?.data?.detail || "Erro ao buscar horários. Tente outra data.");
            setAvailableSlots([]);
        }
      } finally { 
          if (isMounted) { setLoadingSlots(false); } 
      }
    };
    fetchSlots();
    return () => { isMounted = false; };
  }, [selectedDate, selectedService?.id, salaoId]);

  // --- NOVA FUNÇÃO para lidar com a seleção do calendário ---
  const handleDateSelect = (date) => {
    // Garante que a data não seja no passado
    if (isBefore(date, startOfToday())) {
      console.log("Tentativa de selecionar data passada bloqueada.");
      return; // Não faz nada se a data for anterior a hoje
    }
    setSelectedDate(date);
    setSelectedSlot(null); // Limpa o slot ao mudar a data
    setValidationError(''); // Limpa erros
  };
  // --- FIM DA NOVA FUNÇÃO ---

  // --- Lógica Final de Agendamento (COM VALIDAÇÃO) ---
  const handleFinalizeAppointment = async () => {
    // ... (lógica de validação idêntica à anterior) ...
    const isValid = selectedSlot && customerName.trim() && customerPhone && customerPhone === confirmCustomerPhone && !isBooking;
    if (!isValid) { 
         setValidationError("Por favor, preencha todos os campos corretamente.");
         return; 
    }
    const phoneRegex = /^\d{10,11}$/; 
    const cleanedPhone = customerPhone.replace(/\D/g, ''); 
    if (!phoneRegex.test(cleanedPhone)) { 
         setValidationError("Telefone inválido. Use apenas números (DDD + Número).");
         return; 
    }
    if (customerPhone !== confirmCustomerPhone) { 
         setValidationError("Os números de telefone não coincidem.");
         return; 
    }

    setIsBooking(true);
    try {
      // Converte o objeto Date do selectedSlot de volta para string ISO
      const startTimeISO = selectedSlot.toISOString();

      await axios.post(`${API_BASE_URL}/agendamentos`, {
        salao_id: salaoId,
        service_id: selectedService.id,
        start_time: startTimeISO, // Envia a string ISO completa
        customer_name: customerName.trim(), 
        customer_phone: customerPhone 
      });
      onAppointmentSuccess({
        serviceName: serviceName,
        startTime: startTimeISO, // Passa a string ISO
        customerName: customerName.trim(),
        customerPhone: customerPhone
      });
    } catch (error) {
      console.error("Erro ao agendar:", error.response?.data?.detail || error.message);
      setValidationError(`Erro ao agendar: ${error.response?.data?.detail || 'Tente novamente.'}`);
      setIsBooking(false); 
    }
  };

  // --- Cores Dinâmicas ---
  const corPrimaria = styleOptions?.cor_primaria || '#6366F1';
  const corSecundaria = styleOptions?.cor_secundaria || '#EC4899';
  const corGradienteInicio = styleOptions?.cor_gradiente_inicio || '#A78BFA';
  const corGradienteFim = styleOptions?.cor_gradiente_fim || '#F472B6';


  // --- Renderização ---
  return (
    <div className="px-4 pb-32"> 
      {/* Card com detalhes do serviço (Layout Preservado) */}
      <div className="bg-white rounded-xl p-5 mb-6 shadow-sm border border-gray-100">
         <h2 className="text-xl font-bold mb-1 bg-gradient-to-r bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${corPrimaria}, ${corSecundaria})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }} > {serviceName} </h2>
         <div className="flex items-center gap-4 text-sm text-gray-500 font-light mt-2">
           <div className="flex items-center gap-1">
             <Clock className="w-3.5 h-3.5 text-gray-400" /> 
             <span>Duração: {serviceDuration} min</span> 
           </div>
           {servicePrice != null && servicePrice > 0 && (
             <div className="flex items-center gap-1">
               <DollarSign className="w-3.5 h-3.5 text-gray-400" /> 
               <span>R$ {servicePrice.toFixed(2).replace('.', ',')}</span> 
             </div>
           )}
         </div>
      </div>

      {/* --- SEÇÃO 1: CALENDÁRIO CUSTOMIZADO --- */}
      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-2 text-sm text-center">1. Escolha a Data</label>
        <HoralisCalendar
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect} // Usa a nova função handler
            styleOptions={styleOptions} // Passa as cores dinâmicas
        />
      </div>
      {/* --- FIM DA SEÇÃO 1 --- */}

      {/* --- SEÇÃO 2: HORÁRIOS (COM SCROLL) --- */}
      {/* Container principal da Seção 2 */}
      <div className="mb-8">
        <label className="block text-gray-700 font-medium mb-3 text-sm text-center">2. Selecione o Horário</label>
        
        {/* Container para o conteúdo (loading, erro, ou a grade) */}
        {/* Adicionamos uma altura máxima e scroll aqui */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 max-h-[300px] overflow-y-auto"> 
            {loadingSlots && (
                <p className="text-center text-sm text-blue-600 py-4">Buscando horários...</p>
            )}
            {errorSlots && (
                <div className="p-3 text-center bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{errorSlots}</p></div>
            )}
            {!loadingSlots && !errorSlots && selectedDate && availableSlots.length === 0 && (
                <div className="p-4 text-center bg-gray-100 border border-gray-200 rounded-lg"><p className="text-sm text-gray-500">Nenhum horário disponível.</p></div>
            )}
            {!loadingSlots && !errorSlots && selectedDate && availableSlots.length > 0 && (
                // A grade de horários agora está dentro do container com scroll
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {availableSlots.map((slotDate) => { 
                        const isSelected = selectedSlot && selectedSlot.getTime() === slotDate.getTime();
                        const isDisabled = isBefore(slotDate, new Date());
                        
                        return (
                            <button 
                                key={slotDate.toISOString()} 
                                onClick={() => { if (!isDisabled) { setSelectedSlot(slotDate); setValidationError(''); } }}
                                style={isSelected ? { backgroundColor: corPrimaria } : {}} 
                                className={`p-3 rounded-lg text-sm font-medium transition duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 ${ 
                                    isDisabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 
                                    (isSelected ? 'text-white shadow-md ring-blue-400' : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 hover:border-gray-400') 
                                }`}
                                disabled={loadingSlots || isBooking || isDisabled} 
                            >
                                {format(slotDate, 'HH:mm')} 
                            </button>
                        );
                     })}
                </div>
            )}
        </div> {/* Fim do container com scroll */}
      </div>
      {/* --- FIM DA SEÇÃO 2 --- */}

      {/* Seção 3: Dados do Cliente (Layout Preservado) */}
      {selectedSlot && (
        <div className="mb-8 p-4 bg-white rounded-lg shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-gray-700 font-medium text-sm mb-3 border-b pb-2">3. Seus Dados</h3>
            {/* ... (código dos inputs Nome, Telefone, Confirmação igual ao anterior) ... */}
            <div>
              <label htmlFor="customerName" className="block text-xs font-medium text-gray-600 mb-1"> Seu Nome </label>
              <div className="relative rounded-md shadow-sm">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-4 w-4 text-gray-400" /></div>
                 <input id="customerName" name="customerName" type="text" autoComplete="name" required placeholder="Nome Completo" className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" value={customerName} onChange={(e) => setCustomerName(e.target.value)} disabled={isBooking} />
              </div>
            </div>
            <div>
              <label htmlFor="customerPhone" className="block text-xs font-medium text-gray-600 mb-1"> Seu Telefone (WhatsApp) </label>
               <div className="relative rounded-md shadow-sm">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone className="h-4 w-4 text-gray-400" /></div>
                 <input id="customerPhone" name="customerPhone" type="tel" autoComplete="tel" required placeholder="DDD + Número (ex: 11999998888)" className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} disabled={isBooking} />
              </div>
            </div>
            <div>
              <label htmlFor="confirmCustomerPhone" className="block text-xs font-medium text-gray-600 mb-1"> Confirme seu Telefone </label>
               <div className="relative rounded-md shadow-sm">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone className="h-4 w-4 text-gray-400" /></div>
                 <input id="confirmCustomerPhone" name="confirmCustomerPhone" type="tel" required placeholder="Digite o número novamente" className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 sm:text-sm ${ confirmCustomerPhone && customerPhone !== confirmCustomerPhone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500' }`} value={confirmCustomerPhone} onChange={(e) => setConfirmCustomerPhone(e.target.value)} disabled={isBooking} />
              </div>
            </div>
            {validationError && ( <p className="text-xs text-red-600 text-center mt-2">{validationError}</p> )}
        </div>
      )}
      {/* --- FIM DA SEÇÃO --- */}


      {/* Seção Final: Botão de Confirmação (Layout Preservado) */}
       <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)] z-10">
          <div className="max-w-md mx-auto"> 
              <button
                  onClick={handleFinalizeAppointment}
                  style={isFormValid ? { backgroundColor: corPrimaria } : {}} 
                  className={`w-full py-3 rounded-lg text-white font-bold transition duration-300 shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${ !isFormValid ? 'bg-gray-400' : '' }`}
                  disabled={!isFormValid} 
              >
                  {isBooking ? 'Confirmando...' : 'Confirmar Agendamento'}
              </button>
          </div>
      </div>
    </div>
  );
}

export default AppointmentScheduler;

