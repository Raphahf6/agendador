// frontend/src/components/AppointmentScheduler.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { format, isBefore, startOfToday, parseISO } from 'date-fns';
import { Clock, User, Phone, DollarSign, Mail, Loader2, ArrowRight, CreditCard, Copy } from 'lucide-react';
import HoralisCalendar from './HoralisCalendar';
import toast from 'react-hot-toast';

// <<< initMercadoPago FOI REMOVIDO DAQUI >>>
// (SDK é inicializado no App.jsx/SalonScheduler)
import { CardPayment } from '@mercadopago/sdk-react';
import { QRCodeCanvas } from 'qrcode.react';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- DEFINIÇÕES DE COR ---
const CIANO_COLOR_TEXT = 'text-cyan-600';
const CIANO_COLOR_BG = 'bg-cyan-600';
const CIANO_COLOR_BG_HOVER = 'hover:bg-cyan-700';
const CIANO_RING_FOCUS = 'focus:ring-cyan-500';
const CIANO_BORDER_FOCUS = 'focus:border-cyan-500';

const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// --- Componente PIX (Sem alterações) ---
const PixPayment = ({ pixData, salaoId, agendamentoId, onCopy, onPaymentSuccess }) => {
    
    // Polling para verificar o status do pagamento
    useEffect(() => {
        if (!pixData.payment_id || !salaoId || !agendamentoId) {
            console.warn("[PIX Polling] IDs ausentes. Polling não iniciado.");
            return;
        }

        console.log(`[PIX Polling] Iniciando verificação para Agendamento ID: ${agendamentoId}`);

        const intervalId = setInterval(async () => {
            try {
                // Chama o endpoint público de verificação de agendamento
                const response = await axios.get(`${API_BASE_URL}/auth/check-agendamento-status/${salaoId}/${agendamentoId}`);
                
                if (response.data.status === 'approved') {
                    console.log("[PIX Polling] Pagamento APROVADO!");
                    clearInterval(intervalId);
                    toast.success("Pagamento PIX confirmado!");
                    onPaymentSuccess(); // Chama a função de sucesso principal
                } else {
                    console.log(`[PIX Polling] Status: ${response.data.status}`);
                }
            } catch (err) {
                console.error("[PIX Polling] Erro ao verificar status:", err);
            }
        }, 5000); // Verifica a cada 5 segundos

        return () => clearInterval(intervalId);

    }, [pixData.payment_id, salaoId, agendamentoId, onPaymentSuccess]);

    return (
        <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-800">Pague com PIX</h4>
            <p className="text-sm text-gray-600 mt-1 mb-4 text-center">Escaneie o QR Code abaixo com seu app do banco.</p>
            <div className="p-3 bg-white border border-gray-300 rounded-lg">
                <QRCodeCanvas
                    value={pixData.qr_code} 
                    size={200}
                    bgColor={"#ffffff"}
                    fgColor={"#000000"}
                    level={"L"}
                />
            </div>
            <p className="text-sm text-gray-600 mt-4 text-center">Ou copie o código:</p>
            <div className="w-full p-2 bg-gray-200 border border-gray-300 rounded-lg text-xs text-gray-700 break-words my-2">
                {pixData.qr_code}
            </div>
            <button
                onClick={() => onCopy(pixData.qr_code)}
                className={`w-full flex items-center justify-center mt-2 px-4 py-2 text-sm font-semibold text-white ${CIANO_COLOR_BG} rounded-lg ${CIANO_COLOR_BG_HOVER} transition-colors`}
            >
                <Icon icon={Copy} className="w-4 h-4 mr-2" />
                Copiar Código PIX
            </button>
            <p className="text-xs text-gray-500 mt-4 text-center">
                Após o pagamento, o agendamento será confirmado automaticamente.
            </p>
        </div>
    );
};
// --- FIM DO COMPONENTE PIX ---


// --- COMPONENTE PRINCIPAL ---
function AppointmentScheduler({ salaoId, selectedService, onAppointmentSuccess, sinalValor, publicKeyExists }) {
  
  // --- <<< LÓGICA DO FLUXO INTELIGENTE >>> ---
  // Define se o pagamento é obrigatório
  const requiresPayment = publicKeyExists && sinalValor > 0;
  const sinalAmount = sinalValor || 0;
  // --- <<< FIM DA LÓGICA >>> ---

  // --- Estados do Fluxo ---
  const [step, setStep] = useState(1); // 1 = Dados, 2 = Escolha Pagamento, 3 = Pagamento
  const [paymentMethod, setPaymentMethod] = useState(null); 
  const [pixData, setPixData] = useState(null); 
  const [agendamentoIdPendente, setAgendamentoIdPendente] = useState(null); 
  
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errorSlots, setErrorSlots] = useState(null);
  const [isBooking, setIsBooking] = useState(false); 
  
  // --- Estados do Formulário (Passo 1) ---
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [confirmCustomerPhone, setConfirmCustomerPhone] = useState('');
  const [customerCpf, setCustomerCpf] = useState(''); // Obrigatório apenas se 'requiresPayment'
  const [validationError, setValidationError] = useState('');
  const [paymentError, setPaymentError] = useState(null);

  // --- <<< CORREÇÃO: Validação Condicional do CPF >>> ---
  const isFormValid =
      selectedSlot &&
      customerName.trim().length > 2 &&
      customerEmail.trim() &&
      customerPhone.replace(/\D/g, '').length >= 10 &&
      customerPhone === confirmCustomerPhone &&
      // CPF só é obrigatório se o pagamento for exigido
      (!requiresPayment || (requiresPayment && customerCpf.replace(/\D/g, '').length === 11)) &&
      !isBooking;
  // --- <<< FIM DA CORREÇÃO >>> ---

  const serviceName = selectedService?.nome_servico || 'Serviço';
  const serviceDuration = selectedService?.duracao_minutos || 0;
  const servicePrice = selectedService?.preco || 0;

  // --- Lógica de busca de horários (sem alteração) ---
  useEffect(() => {
    let isMounted = true;
    const fetchSlots = async () => {
       if (!selectedDate || !salaoId || !selectedService?.id) {
        if(isMounted) {
            setErrorSlots("Selecione um serviço e data.");
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

  // --- Handle DateSelect (sem alteração) ---
  const handleDateSelect = (date) => {
    if (isBefore(date, startOfToday())) return;
    setSelectedDate(date);
    setSelectedSlot(null);
    setValidationError('');
  };

  // --- <<< FUNÇÃO DE AGENDAMENTO GRATUITO (FLUXO ANTIGO) >>> ---
  const handleFreeBooking = async () => {
    setIsBooking(true);
    setValidationError('');
    const toastId = toast.loading("Confirmando seu agendamento...");
    
    try {
        const startTimeISO = selectedSlot.toISOString();
        
        // Chama o endpoint ANTIGO E GRATUITO
        await axios.post(`${API_BASE_URL}/agendamentos`, { 
            salao_id: salaoId,
            service_id: selectedService.id,
            start_time: startTimeISO,
            customer_name: customerName.trim(),
            customer_email: customerEmail.trim(),
            customer_phone: customerPhone.replace(/\D/g, ''),
        });
        
        toast.success("Agendamento confirmado!", { id: toastId });
        
        // Chama a tela de sucesso (sem dados de pagamento)
        onAppointmentSuccess({
            serviceName, 
            startTime: startTimeISO, 
            customerName: customerName.trim(),
            paymentStatus: 'free', // Status customizado para "gratuito"
            paymentData: null
        });

    } catch (error) {
        // Erro 409 (Conflito de Horário) ou 500
        toast.error(error.response?.data?.detail || 'Erro ao agendar. Tente novamente.', { id: toastId });
        setValidationError(`Erro: ${error.response?.data?.detail || 'Tente novamente.'}`);
        setIsBooking(false); // Permite tentar de novo
    }
  };
  // --- <<< FIM DO FLUXO GRATUITO >>> ---


  // --- <<< FUNÇÃO PRINCIPAL DE PROSSEGUIR (FLUXO INTELIGENTE) >>> ---
  const handleProceed = (e) => {
    e.preventDefault();
    setValidationError('');
    setPaymentError(null);

    // Validações
    if (!isFormValid) { 
        if (customerPhone !== confirmCustomerPhone) setValidationError("Os telefones não coincidem.");
        else if (requiresPayment && customerCpf.replace(/\D/g, '').length !== 11) setValidationError("CPF inválido (11 dígitos).");
        else setValidationError("Preencha todos os campos corretamente.");
        return; 
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail.trim())) { setValidationError("Formato de e-mail inválido."); return; }
    
    // --- Bifurcação da Lógica ---
    if (requiresPayment) {
        // 1. FLUXO PAGO: Avança para a seleção de pagamento
        setStep(2);
    } else {
        // 2. FLUXO GRATUITO: Chama o agendamento direto (endpoint antigo)
        handleFreeBooking(); 
    }
  };
  // --- <<< FIM DA FUNÇÃO >>> ---

  // --- ETAPA 2: Seleção do Método (só é chamado se requiresPayment=true) ---
  const handleSelectPaymentMethod = async (method) => {
    setPaymentMethod(method);
    setStep(3); 

    if (method === 'pix') {
        setIsBooking(true); 
        setPaymentError(null);
        
        try {
            const payload = createBasePayload('pix'); 
            const response = await axios.post(`${API_BASE_URL}/agendamentos/iniciar-pagamento-sinal`, payload);
            
            setPixData(response.data.payment_data); 
            setAgendamentoIdPendente(response.data.payment_data.agendamento_id_ref); 
            
        } catch (err) {
            console.error("Erro ao gerar PIX:", err.response);
            const detail = err.response?.data?.detail || "Não foi possível gerar o PIX.";
            setPaymentError(detail);
            setStep(2); 
        } finally {
            setIsBooking(false);
        }
    }
  };

  // --- Helper: Cria o payload base (só é usado no fluxo pago) ---
  const createBasePayload = (paymentMethodId) => {
    const deviceId = document.getElementById('__mpoffline_device_id')?.value;
    if (!deviceId) {
        console.warn("MP Device ID não encontrado. O risco de fraude aumenta.");
    }
    return {
        salao_id: salaoId,
        service_id: selectedService.id,
        start_time: selectedSlot.toISOString(),
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        customer_phone: customerPhone.replace(/\D/g, ''),
        payment_method_id: paymentMethodId,
        transaction_amount: sinalAmount,
        payer: {
          email: customerEmail.trim(),
          identification: {
            type: 'CPF',
            number: customerCpf.replace(/\D/g, '')
          }
        }
    };
  };

  // --- ETAPA 3: Submissão do Cartão (só é chamado se requiresPayment=true) ---
  const handleCardPaymentSubmit = async (formData) => {
    setIsBooking(true);
    setPaymentError(null);

    const basePayload = createBasePayload(formData.payment_method_id);
    
    const finalPayload = {
        ...basePayload,
        token: formData.token,
        issuer_id: formData.issuer_id,
        installments: formData.installments,
    };

    return new Promise((resolve, reject) => {
        axios.post(`${API_BASE_URL}/agendamentos/iniciar-pagamento-sinal`, finalPayload)
            .then((response) => {
                // SUCESSO (Cartão aprovado)
                setIsBooking(false);
                onAppointmentSuccess({
                    serviceName, 
                    startTime: selectedSlot.toISOString(), 
                    customerName: customerName.trim(),
                    paymentStatus: response.data.status, // 'approved'
                    paymentData: null
                });
                resolve(); 
            })
            .catch((err) => {
                // ERRO (Cartão Rejeitado, Horário Ocupado, etc.)
                setIsBooking(false);
                const detail = err.response?.data?.detail || "Não foi possível processar seu pagamento.";
                setPaymentError(detail);
                setStep(2); 
                reject();
            });
    });
  };
  
  // Configuração do Brick de Cartão
  const cardPaymentBrickCustomization = {
    visual: { style: { theme: 'default' } },
    paymentMethods: {
      creditCard: 'all',
      debitCard: 'all',
      ticket: [], 
      bankTransfer: [],
      pix: [], 
    },
  };
  
  const handleCopyPix = (code) => {
      navigator.clipboard.writeText(code).then(() => {
          toast.success("Código PIX copiado!");
      }).catch(err => {
          toast.error('Erro ao copiar código.');
      });
  };


  // --- Renderização ---
  return (
    <div className="px-4 pb-32 font-sans">
        
        {/* --- ETAPA 1: DADOS E HORÁRIOS --- */}
        <div style={{ display: step === 1 ? 'block' : 'none' }}>
            {/* Card detalhes do serviço */}
            <div className="bg-white rounded-xl p-5 mb-6 shadow-sm border border-gray-100">
                <h2 className={`text-xl font-bold mb-1 ${CIANO_COLOR_TEXT}`}>
                {serviceName}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-500 font-light mt-2">
                    <div className="flex items-center gap-1.5">
                        <Icon icon={Clock} className="w-4 h-4 text-gray-400" />
                        <span>Duração: {serviceDuration} min</span>
                    </div>
                    {/* <<< MUDANÇA: Mostra "Sinal" apenas se o pagamento for obrigatório >>> */}
                    {requiresPayment && (
                        <div className="flex items-center gap-1.5">
                        <Icon icon={DollarSign} className="w-4 h-4 text-gray-400" />
                        <span>Sinal de Reserva: R$ {sinalAmount.toFixed(2).replace('.', ',')}</span>
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
                            const isDisabled = isBefore(slotDate, new Date()); 
                            return (
                                <button
                                    key={slotDate.toISOString()}
                                    onClick={() => { if (!isDisabled) { setSelectedSlot(slotDate); setValidationError(''); } }}
                                    className={`p-3 rounded-lg text-sm font-medium transition duration-150 ease-in-out shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 ${CIANO_RING_FOCUS} ${
                                    isDisabled
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : isSelected
                                        ? `${CIANO_COLOR_BG} text-white shadow-md`
                                        : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
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
                        <label htmlFor="customerName" className="block text-xs font-medium text-gray-600 mb-1"> Seu Nome* </label>
                        <div className="relative">
                            <Icon icon={User} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                            <input id="customerName" type="text" autoComplete="name" required placeholder="Nome Completo"
                                   className={`appearance-none block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} sm:text-sm`}
                                   value={customerName} onChange={(e) => setCustomerName(e.target.value)} disabled={isBooking} />
                        </div>
                    </div>
                    {/* Campo E-mail */}
                    <div>
                        <label htmlFor="customerEmail" className="block text-xs font-medium text-gray-600 mb-1"> Seu E-mail* </label>
                        <div className="relative">
                            <Icon icon={Mail} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                            <input id="customerEmail" type="email" autoComplete="email" required placeholder="seuemail@dominio.com"
                                   className={`appearance-none block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} sm:text-sm`}
                                   value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} disabled={isBooking} />
                        </div>
                    </div>
                    {/* Campo Telefone */}
                    <div>
                        <label htmlFor="customerPhone" className="block text-xs font-medium text-gray-600 mb-1"> Seu Telefone (WhatsApp)* </label>
                        <div className="relative">
                           <Icon icon={Phone} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                           <input id="customerPhone" type="tel" autoComplete="tel" required placeholder="DDD + Número"
                                   className={`appearance-none block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} sm:text-sm`}
                                   value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} disabled={isBooking} />
                        </div>
                    </div>
                    {/* Campo Confirmação Telefone */}
                    <div>
                        <label htmlFor="confirmCustomerPhone" className="block text-xs font-medium text-gray-600 mb-1"> Confirme seu Telefone* </label>
                        <div className="relative">
                            <Icon icon={Phone} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                            <input id="confirmCustomerPhone" type="tel" required placeholder="Digite novamente"
                                   className={`appearance-none block w-full pl-9 pr-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-1 sm:text-sm ${
                                    confirmCustomerPhone && customerPhone !== confirmCustomerPhone
                                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                    : `border-gray-300 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`
                                   }`}
                                   value={confirmCustomerPhone} onChange={(e) => setConfirmCustomerPhone(e.target.value)} disabled={isBooking} />
                        </div>
                    </div>
                     
                    {/* <<< CORREÇÃO: Campo CPF (Renderização Condicional) >>> */}
                    {requiresPayment && (
                        <div>
                            <label htmlFor="customerCpf" className="block text-xs font-medium text-gray-600 mb-1"> Seu CPF (para o pagamento)* </label>
                            <div className="relative">
                                <Icon icon={User} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                                <input id="customerCpf" type="tel" autoComplete="off" required={requiresPayment} placeholder="000.000.000-00"
                                    className={`appearance-none block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} sm:text-sm`}
                                    value={customerCpf} onChange={(e) => setCustomerCpf(e.target.value)} disabled={isBooking} />
                            </div>
                        </div>
                    )}
                    {/* --- <<< FIM DA CORREÇÃO >>> --- */}
                    
                    {validationError && (<p className="text-xs text-red-600 text-center mt-2">{validationError}</p>)}
                </div>
            )}
        </div>
        

        {/* --- ETAPA 2: ESCOLHA DO PAGAMENTO --- */}
        <div style={{ display: step === 2 ? 'block' : 'none' }}>
            <h3 className="text-gray-700 font-medium text-lg mb-4 text-center">4. Escolha como pagar o sinal</h3>
            
            <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100 text-sm">
                <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-gray-600">Serviço:</span>
                    <span className="font-semibold text-gray-800">{serviceName}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                    <span className="text-gray-600">Valor do Sinal:</span>
                    <span className={`font-bold text-xl ${CIANO_COLOR_TEXT}`}>R$ {sinalAmount.toFixed(2).replace('.', ',')}</span>
                </div>
            </div>

            {paymentError && (
                <div className="p-3 mb-4 text-center bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{paymentError}</p>
                </div>
            )}

            <div className="space-y-4">
                <button
                    onClick={() => handleSelectPaymentMethod('card')}
                    className="w-full flex items-center justify-center p-4 bg-white border border-gray-300 rounded-lg shadow-sm hover:border-cyan-600 hover:bg-cyan-50"
                >
                    <Icon icon={CreditCard} className="w-5 h-5 mr-3 text-cyan-700" />
                    <span className="text-base font-semibold text-gray-800">Cartão de Crédito ou Débito</span>
                </button>
                <button
                    onClick={() => handleSelectPaymentMethod('pix')}
                    className="w-full flex items-center justify-center p-4 bg-white border border-gray-300 rounded-lg shadow-sm hover:border-cyan-600 hover:bg-cyan-50"
                >
                    <Icon icon={Copy} className="w-5 h-5 mr-3 text-cyan-700" />
                    <span className="text-base font-semibold text-gray-800">PIX (Copia e Cola / QR Code)</span>
                </button>
            </div>
        </div>

        {/* --- ETAPA 3: EXECUÇÃO DO PAGAMENTO --- */}
        <div style={{ display: step === 3 ? 'block' : 'none' }}>
            
            {/* Caso 1: Cartão */}
            {paymentMethod === 'card' && (
                <div id="card-payment-brick-container">
                    {isBooking && (
                        <div className="relative h-64 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
                        </div>
                    )}
                    <div style={{ display: isBooking ? 'none' : 'block' }}>
                        <CardPayment
                            initialization={{
                                amount: sinalAmount,
                                payer: {
                                    email: customerEmail,
                                    identification: {
                                        type: 'CPF',
                                        number: customerCpf.replace(/\D/g, '')
                                    },
                                },
                            }}
                            customization={cardPaymentBrickCustomization}
                            onSubmit={handleCardPaymentSubmit}
                            onError={(error) => {
                                console.error("Erro no Brick de Cartão:", error);
                                setPaymentError(error.message || "Erro ao processar cartão.");
                            }}
                            onReady={() => console.log("Brick de Cartão pronto.")}
                        />
                    </div>
                </div>
            )}
            
            {/* Caso 2: PIX */}
            {paymentMethod === 'pix' && pixData && !isBooking && (
                <PixPayment 
                    pixData={pixData} 
                    salaoId={salaoId}
                    agendamentoId={agendamentoIdPendente} 
                    onCopy={handleCopyPix}
                    onPaymentSuccess={() => onAppointmentSuccess({ 
                         serviceName, 
                         startTime: selectedSlot.toISOString(), 
                         customerName: customerName.trim(),
                         paymentStatus: 'approved',
                         paymentData: pixData 
                    })} 
                />
            )}
            {paymentMethod === 'pix' && isBooking && ( 
                <div className="relative h-64 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
                    <p className="text-sm text-gray-600 ml-2">Gerando PIX...</p>
                </div>
            )}
        </div>


        {/* --- Botão Final de Ação --- */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)] z-10">
            <div className="max-w-md mx-auto">
                {/* Botão do Passo 1 (Inteligente) */}
                <button
                    onClick={handleProceed} // <<< CHAMA A NOVA FUNÇÃO DE BIFURCAÇÃO >>>
                    style={{ display: step === 1 ? 'flex' : 'none' }}
                    className={`w-full py-3 rounded-lg text-white font-bold transition duration-300 ease-in-out shadow-md flex items-center justify-center ${
                    isFormValid
                    ? `${CIANO_COLOR_BG} ${CIANO_COLOR_BG_HOVER}`
                    : 'bg-gray-400 cursor-not-allowed'
                    }`}
                    disabled={!isFormValid || isBooking}
                >
                    {isBooking ? (
                        <Loader2 className="w-5 h-5 animate-spin stroke-current" />
                    ) : (
                        // <<< MUDANÇA: Texto do botão muda >>>
                        requiresPayment ? (
                            <>
                                Ir para Pagamento (R$ {sinalAmount.toFixed(2).replace('.', ',')})
                                <Icon icon={ArrowRight} className="w-5 h-5 ml-2" />
                            </>
                        ) : (
                            'Confirmar Agendamento'
                        )
                    )}
                </button>

                {/* Botão "Voltar" do Passo 2 e 3 */}
                <button
                    onClick={() => { 
                        setStep(step === 3 ? 2 : 1); 
                        setPaymentError(null); 
                        setPixData(null);
                        setAgendamentoIdPendente(null);
                    }}
                    style={{ display: step > 1 ? 'flex' : 'none' }}
                    className={`w-full py-3 rounded-lg text-gray-700 font-bold bg-gray-200 hover:bg-gray-300 transition duration-300 ease-in-out shadow-sm flex items-center justify-center`}
                    disabled={isBooking}
                >
                    Voltar
                </button>
            </div>
        </div>
    </div>
  );
}

export default AppointmentScheduler;