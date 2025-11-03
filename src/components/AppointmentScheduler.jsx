// frontend/src/components/AppointmentScheduler.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { format, isBefore, startOfToday, parseISO } from 'date-fns';
import { Clock, User, Phone, DollarSign, Mail, Loader2, ArrowRight, Copy } from 'lucide-react';
import HoralisCalendar from './HoralisCalendar';
import toast from 'react-hot-toast';
import { QRCodeCanvas } from 'qrcode.react';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- DEFINIÇÕES DE COR FIXAS REMOVIDAS ---
// O estilo será aplicado via CSS Variables ou Inline Style

const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// --- Componente PIX (Ajustado para usar a cor primária no botão) ---
const PixPayment = ({ pixData, salaoId, agendamentoId, onCopy, onPaymentSuccess, primaryColor }) => {

  const primary = primaryColor || '#0E7490'; // Fallback

  // Polling para verificar o status do pagamento (mantido)
  useEffect(() => {
    if (!pixData?.payment_id || !salaoId || !agendamentoId) {
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

  }, [pixData?.payment_id, salaoId, agendamentoId, onPaymentSuccess]);

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
        // APLICAÇÃO DA COR NO BOTÃO
        style={{ backgroundColor: primary, borderColor: primary }}
        className={`w-full flex items-center justify-center mt-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors hover:opacity-90`}
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
function AppointmentScheduler({ salaoId, selectedService, onAppointmentSuccess, sinalValor, publicKeyExists, primaryColor }) {
  //                                                                                                                       ^ NOVO PROP
  const primary = primaryColor || '#0E7490'; // Fallback
  // Define as classes de foco dinamicamente
  const focusRingClass = `focus:ring-[${primary}]`;
  const focusBorderClass = `focus:border-[${primary}]`;

  // --- LÓGICA DO FLUXO INTELIGENTE ---
  const requiresPayment = publicKeyExists && sinalValor > 0;
  const sinalAmount = sinalValor || 0;
  // --- FIM DA LÓGICA ---

  // --- Estados do Fluxo (mantidos) ---
  const [step, setStep] = useState(1);
  const [pixData, setPixData] = useState(null);
  const [agendamentoIdPendente, setAgendamentoIdPendente] = useState(null);

  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errorSlots, setErrorSlots] = useState(null);
  const [isBooking, setIsBooking] = useState(false);

  // --- Estados do Formulário (mantidos) ---
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [confirmCustomerPhone, setConfirmCustomerPhone] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [validationError, setValidationError] = useState('');
  const [paymentError, setPaymentError] = useState(null);

  // --- EFEITO PARA INJETAR O SCRIPT DE SEGURANÇA (mantido) ---
  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://www.mercadopago.com/v2/security.js"]');
    if (existingScript) {
      console.log("MP Security Script já presente.");
      return;
    }

    const script = document.createElement('script');
    script.src = "https://www.mercadopago.com/v2/security.js";
    script.setAttribute('view', 'checkout');
    script.setAttribute('output', 'deviceId');
    script.onload = () => {
      console.log("MP Security Script carregado e Device ID gerado.");
    };
    script.onerror = (e) => {
      console.error("Erro ao carregar MP Security Script:", e);
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);
  // --- FIM DO EFEITO ---

  // --- Validação Condicional do CPF (mantida) ---
  const isFormValid =
    selectedSlot &&
    customerName.trim().length > 2 &&
    customerEmail.trim() &&
    customerPhone.replace(/\D/g, '').length >= 10 &&
    customerPhone === confirmCustomerPhone &&
    (!requiresPayment || (requiresPayment && customerCpf.replace(/\D/g, '').length === 11)) &&
    !isBooking;

  const serviceName = selectedService?.nome_servico || 'Serviço';
  const serviceDuration = selectedService?.duracao_minutos || 0;
  const servicePrice = selectedService?.preco || 0;

  // --- Lógica de busca de horários (mantida) ---
  useEffect(() => {
    let isMounted = true;
    const fetchSlots = async () => {
      if (!selectedDate || !salaoId || !selectedService?.id) {
        if (isMounted) {
          setErrorSlots("Selecione um serviço e data.");
          setAvailableSlots([]); setLoadingSlots(false);
        } return;
      }
      if (isMounted) { setLoadingSlots(true); setSelectedSlot(null); setValidationError(''); setErrorSlots(null); }
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

  // --- Handle DateSelect (mantido) ---
  const handleDateSelect = (date) => {
    if (isBefore(date, startOfToday())) return;
    setSelectedDate(date);
    setSelectedSlot(null);
    setValidationError('');
  };

  // --- FUNÇÃO DE AGENDAMENTO GRATUITO (mantida) ---
  const handleFreeBooking = async () => {
    setIsBooking(true);
    setValidationError('');
    const toastId = toast.loading("Confirmando seu agendamento...");

    try {
      const startTimeISO = selectedSlot.toISOString();

      await axios.post(`${API_BASE_URL}/agendamentos`, {
        salao_id: salaoId,
        service_id: selectedService.id,
        start_time: startTimeISO,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        customer_phone: customerPhone.replace(/\D/g, ''),
      });

      toast.success("Agendamento confirmado!", { id: toastId });

      onAppointmentSuccess({
        serviceName,
        startTime: startTimeISO,
        customerName: customerName.trim(),
        paymentStatus: 'free',
        paymentData: null
      });

    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao agendar. Tente novamente.', { id: toastId });
      setValidationError(`Erro: ${error.response?.data?.detail || 'Tente novamente.'}`);
      setIsBooking(false);
    }
  };
  // --- FIM DO FLUXO GRATUITO ---

  // --- FUNÇÃO: GERAÇÃO DIRETA DO PIX (mantida) ---
  const handleGeneratePix = async () => {
    setIsBooking(true);
    setPaymentError(null);
    setStep(2);

    try {
      const payload = createBasePayload('pix');
      const response = await axios.post(`${API_BASE_URL}/agendamentos/iniciar-pagamento-sinal`, payload);

      setPixData(response.data.payment_data);
      setAgendamentoIdPendente(response.data.payment_data.agendamento_id_ref);

    } catch (err) {
      console.error("Erro ao gerar PIX:", err.response);
      const detail = err.response?.data?.detail || "Não foi possível gerar o PIX.";
      setPaymentError(detail);
      setStep(1); // Volta para o passo de dados se falhar
    } finally {
      setIsBooking(false);
    }
  };
  // --- FIM DA GERAÇÃO PIX ---

  // --- FUNÇÃO PRINCIPAL DE PROSSEGUIR (mantida) ---
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
      // 1. FLUXO PAGO: Vai direto para a Geração do PIX
      handleGeneratePix();
    } else {
      // 2. FLUXO GRATUITO: Chama o agendamento direto (endpoint antigo)
      handleFreeBooking();
    }
  };
  // --- FIM DA FUNÇÃO ---

  // --- Helper: Cria o payload base (mantido) ---
  const createBasePayload = (paymentMethodId) => {
    const deviceId = window.deviceId || window.MP_DEVICE_SESSION_ID;

    if (!deviceId) {
      console.warn("MP Device ID não encontrado. O risco de fraude aumenta. Checar carregamento do script.");
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
      device_session_id: deviceId || null,
      payer: {
        email: customerEmail.trim(),
        identification: {
          type: 'CPF',
          number: customerCpf.replace(/\D/g, '')
        }
      }
    };
  };
  // REMOVIDO: handleCardPaymentSubmit e cardPaymentBrickCustomization

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
          <h2 className="text-xl font-bold mb-1" style={{ color: primary }}>
            {serviceName}
          </h2>
          <div className="flex items-center gap-4 text-sm text-gray-500 font-light mt-2">
            <div className="flex items-center gap-1.5">
              <Icon icon={Clock} className="w-4 h-4 text-gray-400" />
              <span>Duração: {serviceDuration} min</span>
            </div>
            {/* Mostra "Sinal" apenas se o pagamento for obrigatório */}
            {requiresPayment && (
              <div className="flex items-center gap-1.5">
                <Icon icon={DollarSign} className="w-4 h-4 text-gray-400" />
                <span style={{ color: primary }}>Sinal de Reserva: R$ {sinalAmount.toFixed(2).replace('.', ',')}</span>
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
                      className={`p-3 rounded-lg text-sm font-medium transition duration-150 ease-in-out shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1`}
                      // ESTILIZAÇÃO DINÂMICA
                      style={{
                        color: isSelected ? 'white' : 'inherit',
                        backgroundColor: isSelected ? primary : (isDisabled ? 'rgb(229, 231, 235)' : 'white'),
                        borderColor: isDisabled ? 'rgb(209, 213, 219)' : (isSelected ? primary : 'rgb(209, 213, 219)'),
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        // Adiciona o foco da cor primária
                        '--tw-ring-color': primary,
                        '--tw-border-color': isSelected ? primary : 'rgb(209, 213, 219)'
                      }}
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

            {/* Campos de formulário - Aplicação da cor de foco */}
            <div>
              <label htmlFor="customerName" className="block text-xs font-medium text-gray-600 mb-1"> Seu Nome* </label>
              <div className="relative">
                <Icon icon={User} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input id="customerName" type="text" autoComplete="name" required placeholder="Nome Completo"
                  className={`appearance-none block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-1`}
                  style={{ '--tw-ring-color': primary, '--tw-border-color': primary }}
                  value={customerName} onChange={(e) => setCustomerName(e.target.value)} disabled={isBooking} />
              </div>
            </div>
            {/* Campo E-mail */}
            <div>
              <label htmlFor="customerEmail" className="block text-xs font-medium text-gray-600 mb-1"> Seu E-mail* </label>
              <div className="relative">
                <Icon icon={Mail} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input id="customerEmail" type="email" autoComplete="email" required placeholder="seuemail@dominio.com"
                  className={`appearance-none block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-1`}
                  style={{ '--tw-ring-color': primary, '--tw-border-color': primary }}
                  value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} disabled={isBooking} />
              </div>
            </div>
            {/* Campo Telefone */}
            <div>
              <label htmlFor="customerPhone" className="block text-xs font-medium text-gray-600 mb-1"> Seu Telefone (WhatsApp)* </label>
              <div className="relative">
                <Icon icon={Phone} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input id="customerPhone" type="tel" autoComplete="tel" required placeholder="DDD + Número"
                  className={`appearance-none block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-1`}
                  style={{ '--tw-ring-color': primary, '--tw-border-color': primary }}
                  value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} disabled={isBooking} />
              </div>
            </div>
            {/* Campo Confirmação Telefone */}
            <div>
              <label htmlFor="confirmCustomerPhone" className="block text-xs font-medium text-gray-600 mb-1"> Confirme seu Telefone* </label>
              <div className="relative">
                <Icon icon={Phone} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input id="confirmCustomerPhone" type="tel" required placeholder="Digite novamente"
                  className={`appearance-none block w-full pl-9 pr-3 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-1 sm:text-sm ${confirmCustomerPhone && customerPhone !== confirmCustomerPhone
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : `border-gray-300`
                    }`}
                  style={{
                    '--tw-ring-color': primary,
                    '--tw-border-color': primary
                  }}
                  value={confirmCustomerPhone} onChange={(e) => setConfirmCustomerPhone(e.target.value)} disabled={isBooking} />
              </div>
            </div>

            {/* Campo CPF (Renderização Condicional) */}
            {requiresPayment && (
              <div>
                <label htmlFor="customerCpf" className="block text-xs font-medium text-gray-600 mb-1"> Seu CPF (para o pagamento)* </label>
                <div className="relative">
                  <Icon icon={User} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input id="customerCpf" type="tel" autoComplete="off" required={requiresPayment} placeholder="000.000.000-00"
                    className={`appearance-none block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-1 sm:text-sm`}
                    style={{ '--tw-ring-color': primary, '--tw-border-color': primary }}
                    value={customerCpf} onChange={(e) => setCustomerCpf(e.target.value)} disabled={isBooking} />
                </div>
              </div>
            )}

            {validationError && (<p className="text-xs text-red-600 text-center mt-2">{validationError}</p>)}
          </div>
        )}
      </div>


      {/* ETAPA 2: EXECUÇÃO DO PAGAMENTO (APENAS PIX) */}
      <div style={{ display: step === 2 ? 'block' : 'none' }}>
        <h3 className="text-gray-700 font-medium text-lg mb-4 text-center">4. Finalizar Pagamento via PIX</h3>

        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100 text-sm">
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-gray-600">Serviço:</span>
            <span className="font-semibold text-gray-800">{serviceName}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-gray-600">Valor do Sinal:</span>
            <span className={`font-bold text-xl`} style={{ color: primary }}>R$ {sinalAmount.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        {paymentError && (
          <div className="p-3 mb-4 text-center bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{paymentError}</p>
          </div>
        )}

        {/* Caso: PIX */}
        {pixData && !isBooking ? (
          <PixPayment
            pixData={pixData}
            salaoId={salaoId}
            agendamentoId={agendamentoIdPendente}
            onCopy={handleCopyPix}
            primaryColor={primary} // Passa a cor para o subcomponente PIX
            onPaymentSuccess={() => onAppointmentSuccess({
              serviceName,
              startTime: selectedSlot.toISOString(),
              customerName: customerName.trim(),
              paymentStatus: 'approved',
              paymentData: pixData
            })}
          />
        ) : (
          <div className="relative h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: primary }} />
            <p className="text-sm text-gray-600 ml-2">Gerando PIX...</p>
          </div>
        )}
      </div>


      {/* --- Botão Final de Ação --- */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)] z-10">
        <div className="max-w-md mx-auto">
          {/* Botão do Passo 1 (Inteligente) */}
          <button
            onClick={handleProceed}
            style={{
              display: step === 1 ? 'flex' : 'none',
              backgroundColor: isFormValid ? primary : 'rgb(156, 163, 175)', // bg-gray-400
              opacity: isFormValid ? 1 : 0.6 // Controla o hover/disabled
            }}
            className={`w-full py-3 rounded-lg text-white font-bold transition duration-300 ease-in-out shadow-md flex items-center justify-center cursor-pointer`}
            disabled={!isFormValid || isBooking}
          >
            {isBooking ? (
              <Loader2 className="w-5 h-5 animate-spin stroke-current" />
            ) : (
              requiresPayment ? (
                <>
                  Ir para Pagamento PIX (R$ {sinalAmount.toFixed(2).replace('.', ',')})
                  <Icon icon={ArrowRight} className="w-5 h-5 ml-2" />
                </>
              ) : (
                'Confirmar Agendamento'
              )
            )}
          </button>

          {/* Botão "Voltar" do Passo 2 (Pagamento) */}
          <button
            onClick={() => {
              setStep(1); // Sempre volta para o passo 1
              setPaymentError(null);
              setPixData(null);
              setAgendamentoIdPendente(null);
            }}
            style={{ display: step === 2 ? 'flex' : 'none' }}
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