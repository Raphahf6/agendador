import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { format, isBefore, startOfToday, parseISO } from 'date-fns';
import { Clock, User, Phone, Mail, Loader2, ArrowRight, Copy, Sun, Moon, Sunset } from 'lucide-react';
import HoralisCalendar from './HoralisCalendar';
import toast from 'react-hot-toast';
import { QRCodeCanvas } from 'qrcode.react';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// --- Componente PIX (Mantido) ---
const PixPayment = ({ pixData, salaoId, agendamentoId, onCopy, onPaymentSuccess, primaryColor }) => {
  const primary = primaryColor || '#0E7490';

  useEffect(() => {
    if (!pixData?.payment_id || !salaoId || !agendamentoId) return;
    const intervalId = setInterval(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/auth/check-agendamento-status/${salaoId}/${agendamentoId}`);
        if (response.data.status === 'approved') {
          clearInterval(intervalId);
          toast.success("Pagamento PIX confirmado!");
          onPaymentSuccess();
        }
      } catch (err) { console.error("[PIX Polling] Erro:", err); }
    }, 5000);
    return () => clearInterval(intervalId);
  }, [pixData?.payment_id, salaoId, agendamentoId, onPaymentSuccess]);

  return (
    <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
      <h4 className="text-xl font-bold text-gray-800">Pague com PIX</h4>
      <p className="text-sm text-gray-600 mt-1 mb-4 text-center">Escaneie o QR Code abaixo com seu app do banco.</p>
      <div className="p-3 bg-white border border-gray-300 rounded-lg shadow-sm">
        <QRCodeCanvas value={pixData.qr_code} size={200} bgColor={"#ffffff"} fgColor={"#000000"} level={"L"} />
      </div>
      <div className="w-full p-2 bg-gray-200 border border-gray-300 rounded-lg text-xs text-gray-700 break-words my-2 font-mono mt-4">
        {pixData.qr_code}
      </div>
      <button onClick={() => onCopy(pixData.qr_code)} style={{ backgroundColor: primary }} className={`w-full flex items-center justify-center mt-2 px-4 py-3 text-sm font-semibold text-white rounded-lg transition-colors hover:opacity-90 shadow-lg`}>
        <Icon icon={Copy} className="w-4 h-4 mr-2" /> Copiar Código PIX
      </button>
    </div>
  );
};

// --- SUB-COMPONENTE: GRUPO DE HORÁRIOS ---
const TimeSlotGroup = ({ title, icon, slots, selectedSlot, onSelect, isDisabled, primaryColor }) => {
  if (slots.length === 0) return null;

  return (
    <div className="mb-5">
      <h3 className="text-base font-semibold text-gray-500 mb-3 flex items-center">
        <Icon icon={icon} className="w-4 h-4 mr-2" /> {title}
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {slots.map((slotDate) => {
          const isSelected = selectedSlot && selectedSlot.getTime() === slotDate.getTime();
          return (
            <button
              key={slotDate.toISOString()}
              onClick={() => onSelect(slotDate)}
              className={`
                                p-3 rounded-full text-sm font-semibold transition duration-150 ease-in-out 
                                focus:outline-none focus:ring-2 focus:ring-offset-1 
                                ${isSelected ? 'text-white shadow-md transform scale-105' : 'bg-gray-50 text-gray-700 border border-gray-100 hover:border-gray-300 hover:bg-white'}
                            `}
              style={{
                backgroundColor: isSelected ? primaryColor : undefined,
                borderColor: isSelected ? primaryColor : undefined,
                '--tw-ring-color': primaryColor,
              }}
              disabled={isDisabled}
            >
              {format(slotDate, 'HH:mm')}
            </button>
          );
        })}
      </div>
    </div>
  );
};


// ----------------------------------------------------
// --- COMPONENTE PRINCIPAL (APPOINTMENT SCHEDULER) ---
// ----------------------------------------------------
function AppointmentScheduler({ salaoId, selectedService, onAppointmentSuccess, sinalValor, publicKeyExists, primaryColor, onBackClick }) {
  const primary = primaryColor || '#0E7490';
  const requiresPayment = publicKeyExists && sinalValor > 0;
  const sinalAmount = sinalValor || 0;

  const [step, setStep] = useState(1);
  const [pixData, setPixData] = useState(null);
  const [agendamentoIdPendente, setAgendamentoIdPendente] = useState(null);

  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errorSlots, setErrorSlots] = useState(null);
  const [isBooking, setIsBooking] = useState(false);

  // Formulário
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [confirmCustomerPhone, setConfirmCustomerPhone] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [validationError, setValidationError] = useState('');
  const [paymentError, setPaymentError] = useState(null);

  // Script MP
  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://www.mercadopago.com/v2/security.js"]');
    if (existingScript) return;
    const script = document.createElement('script');
    script.src = "https://www.mercadopago.com/v2/security.js";
    script.setAttribute('view', 'checkout');
    script.setAttribute('output', 'deviceId');
    document.body.appendChild(script);
    return () => { if (script.parentNode) script.parentNode.removeChild(script); };
  }, []);

  const isFormValid = selectedSlot && customerName.trim().length > 2 && customerEmail.trim() && customerPhone.replace(/\D/g, '').length >= 10 && customerPhone === confirmCustomerPhone && (!requiresPayment || (requiresPayment && customerCpf.replace(/\D/g, '').length === 11)) && !isBooking;
  const serviceName = selectedService?.nome_servico || 'Serviço';
  const serviceDuration = selectedService?.duracao_minutos || 0;

  // Fetch Slots
  useEffect(() => {
    let isMounted = true;
    const fetchSlots = async () => {
      if (!selectedDate || !salaoId || !selectedService?.id) {
        if (isMounted) { setErrorSlots("Selecione um serviço e data."); setAvailableSlots([]); setLoadingSlots(false); }
        return;
      }
      if (isMounted) { setLoadingSlots(true); setSelectedSlot(null); setValidationError(''); setErrorSlots(null); }
      try {
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        const response = await axios.get(`${API_BASE_URL}/saloes/${salaoId}/horarios-disponiveis`, {
          params: { service_id: selectedService.id, date: formattedDate },
        });
        if (isMounted) {
          if (response.data?.horarios_disponiveis) {
            const sortedSlots = response.data.horarios_disponiveis.map(slot => parseISO(slot)).sort((a, b) => a - b);
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

  // 🌟 🌟 CORREÇÃO AQUI: AGRUPAMENTO E FILTRAGEM 🌟 🌟
  // Agora removemos completamente os horários passados da lista visível
  const groupedSlots = useMemo(() => {
    const now = new Date(); // Hora atual para comparação
    const manha = [];
    const tarde = [];
    const noite = [];

    availableSlots.forEach(slotDate => {
      // 🛑 FILTRO: Se o horário do slot for anterior a AGORA, ignora.
      // Isso remove os horários "indisponíveis" da visualização.
      if (isBefore(slotDate, now)) {
        return;
      }

      const hour = slotDate.getHours();
      if (hour < 12) {
        manha.push(slotDate);
      } else if (hour >= 12 && hour < 18) {
        tarde.push(slotDate);
      } else {
        noite.push(slotDate);
      }
    });
    return { manha, tarde, noite };
  }, [availableSlots]);


  const handleDateSelect = (date) => {
    if (isBefore(date, startOfToday())) return;
    setSelectedDate(date);
    setSelectedSlot(null);
    setValidationError('');
  };

  const handleFreeBooking = async () => {
    setIsBooking(true);
    setValidationError('');
    const toastId = toast.loading("Confirmando seu agendamento...");
    try {
      const startTimeISO = selectedSlot.toISOString();
      await axios.post(`${API_BASE_URL}/agendamentos`, {
        salao_id: salaoId, service_id: selectedService.id, start_time: startTimeISO,
        customer_name: customerName.trim(), customer_email: customerEmail.trim(), customer_phone: customerPhone.replace(/\D/g, ''),
      });
      toast.success("Agendamento confirmado!", { id: toastId });
      onAppointmentSuccess({ serviceName, startTime: startTimeISO, customerName: customerName.trim(), paymentStatus: 'free' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao agendar.', { id: toastId });
      setValidationError(`Erro: ${error.response?.data?.detail || 'Tente novamente.'}`);
      setIsBooking(false);
    }
  };

  const handleGeneratePix = async () => {
    setIsBooking(true); setPaymentError(null); setStep(2);
    try {
      const payload = createBasePayload('pix');
      const response = await axios.post(`${API_BASE_URL}/agendamentos/iniciar-pagamento-sinal`, payload);
      setPixData(response.data.payment_data);
      setAgendamentoIdPendente(response.data.payment_data.agendamento_id_ref);
    } catch (err) {
      console.error("Erro PIX:", err.response);
      setPaymentError(err.response?.data?.detail || "Não foi possível gerar o PIX.");
      setStep(1);
    } finally { setIsBooking(false); }
  };

  const handleProceed = (e) => {
    e.preventDefault(); setValidationError(''); setPaymentError(null);
    if (!isFormValid) {
      if (customerPhone !== confirmCustomerPhone) setValidationError("Os telefones não coincidem.");
      else if (requiresPayment && customerCpf.replace(/\D/g, '').length !== 11) setValidationError("CPF inválido.");
      else setValidationError("Preencha todos os campos.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail.trim())) { setValidationError("E-mail inválido."); return; }
    requiresPayment ? handleGeneratePix() : handleFreeBooking();
  };

  const createBasePayload = (paymentMethodId) => {
    const deviceId = window.deviceId || window.MP_DEVICE_SESSION_ID;
    return {
      salao_id: salaoId, service_id: selectedService.id, start_time: selectedSlot.toISOString(),
      customer_name: customerName.trim(), customer_email: customerEmail.trim(), customer_phone: customerPhone.replace(/\D/g, ''),
      payment_method_id: paymentMethodId, transaction_amount: sinalAmount, device_session_id: deviceId || null,
      payer: { email: customerEmail.trim(), identification: { type: 'CPF', number: customerCpf.replace(/\D/g, '') } }
    };
  };

  const hasAnySlot = groupedSlots.manha.length > 0 || groupedSlots.tarde.length > 0 || groupedSlots.noite.length > 0;

  return (
    <div className="font-sans">
      <div style={{ display: step === 1 ? 'block' : 'none' }}>
        {/* Card Serviço */}
        <div className="bg-gray-50/80 rounded-xl p-4 sm:p-5 mb-6 border border-gray-100">
          <h2 className="text-xl font-bold mb-1" style={{ color: primary }}>{serviceName}</h2>
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
            <div className="flex items-center gap-1.5"><Icon icon={Clock} className="w-4 h-4 text-gray-400" /><span>{serviceDuration} min</span></div>
            {requiresPayment && <div className="flex items-center gap-1.5 text-gray-700 font-medium">Sinal: R$ {sinalAmount.toFixed(2).replace('.', ',')}</div>}
          </div>
        </div>

        {/* Calendário */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-3 text-sm">1. Escolha a Data</label>
          <HoralisCalendar selectedDate={selectedDate} onDateSelect={handleDateSelect} primaryColor={primary} />
        </div>

        {/* Horários */}
        <div className="mb-8">
          <label className="block text-gray-700 font-medium mb-4 text-sm">2. Selecione o Horário</label>
          {loadingSlots && (<p className="text-center text-sm text-gray-500 py-4">Buscando horários...</p>)}
          {errorSlots && (<div className="p-3 text-center bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{errorSlots}</p></div>)}

          {/* Mensagem se não houver slots APÓS o filtro de horário passado */}
          {!loadingSlots && !errorSlots && !hasAnySlot && (
            <div className="p-4 text-center bg-gray-100 border border-gray-200 rounded-lg"><p className="text-sm text-gray-500">Nenhum horário disponível para esta data.</p></div>
          )}

          {!loadingSlots && !errorSlots && hasAnySlot && (
            <div className="animate-in fade-in duration-500">
              <TimeSlotGroup title="Manhã" icon={Sun} slots={groupedSlots.manha} selectedSlot={selectedSlot} onSelect={setSelectedSlot} isDisabled={isBooking} primaryColor={primary} />
              <TimeSlotGroup title="Tarde" icon={Sunset} slots={groupedSlots.tarde} selectedSlot={selectedSlot} onSelect={setSelectedSlot} isDisabled={isBooking} primaryColor={primary} />
              <TimeSlotGroup title="Noite" icon={Moon} slots={groupedSlots.noite} selectedSlot={selectedSlot} onSelect={setSelectedSlot} isDisabled={isBooking} primaryColor={primary} />
            </div>
          )}
        </div>

        {/* Formulário */}
        {selectedSlot && (
          <div className="mb-8 space-y-4 animate-in fade-in duration-300">
            <h3 className="text-gray-700 font-medium text-sm mb-3 border-t border-gray-100 pt-6">3. Seus Dados</h3>
            <div className="space-y-4">
              <div className="relative"><Icon icon={User} className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input type="text" placeholder="Nome Completo" className="pl-9 pr-3 py-2.5 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-1" style={{ '--tw-ring-color': primary, '--tw-border-color': primary }} value={customerName} onChange={e => setCustomerName(e.target.value)} disabled={isBooking} /></div>
              <div className="relative"><Icon icon={Mail} className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input type="email" placeholder="E-mail" className="pl-9 pr-3 py-2.5 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-1" style={{ '--tw-ring-color': primary, '--tw-border-color': primary }} value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} disabled={isBooking} /></div>
              <div className="relative"><Icon icon={Phone} className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input type="tel" placeholder="WhatsApp (DDD + Número)" className="pl-9 pr-3 py-2.5 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-1" style={{ '--tw-ring-color': primary, '--tw-border-color': primary }} value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} disabled={isBooking} /></div>
              <div className="relative"><Icon icon={Phone} className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input type="tel" placeholder="Confirme o WhatsApp" className={`pl-9 pr-3 py-2.5 w-full border rounded-lg focus:outline-none focus:ring-1 ${confirmCustomerPhone && customerPhone !== confirmCustomerPhone ? 'border-red-500' : 'border-gray-300'}`} style={{ '--tw-ring-color': primary, '--tw-border-color': primary }} value={confirmCustomerPhone} onChange={e => setConfirmCustomerPhone(e.target.value)} disabled={isBooking} /></div>
              {requiresPayment && (
                <div className="relative"><Icon icon={User} className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input type="tel" placeholder="CPF (somente números)" className="pl-9 pr-3 py-2.5 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-1" style={{ '--tw-ring-color': primary, '--tw-border-color': primary }} value={customerCpf} onChange={e => setCustomerCpf(e.target.value)} disabled={isBooking} /></div>
              )}
            </div>
            {validationError && (<p className="text-xs text-red-600 text-center mt-2">{validationError}</p>)}
          </div>
        )}
      </div>

      {/* ETAPA 2: Pagamento */}
      <div style={{ display: step === 2 ? 'block' : 'none' }}>
        <h3 className="text-gray-700 font-medium text-lg mb-4 text-center">4. Finalizar Pagamento via PIX</h3>
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100 text-sm flex justify-between items-center">
          <span className="text-gray-600">Total a pagar:</span>
          <span className="font-bold text-xl" style={{ color: primary }}>R$ {sinalAmount.toFixed(2).replace('.', ',')}</span>
        </div>
        {paymentError && (<div className="p-3 mb-4 text-center bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-600">{paymentError}</p></div>)}
        {pixData && !isBooking ? (
          <PixPayment pixData={pixData} salaoId={salaoId} agendamentoId={agendamentoIdPendente} onCopy={(c) => { navigator.clipboard.writeText(c); toast.success("Copiado!"); }} primaryColor={primary} onPaymentSuccess={() => onAppointmentSuccess({ serviceName, startTime: selectedSlot.toISOString(), customerName: customerName.trim(), paymentStatus: 'approved', paymentData: pixData })} />
        ) : (
          <div className="relative h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: primary }} /></div>
        )}
      </div>

      {/* Botões Finais */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)] z-10">
        <div className="max-w-md mx-auto flex gap-3">
          <button onClick={handleProceed} style={{ display: step === 1 ? 'flex' : 'none', backgroundColor: isFormValid ? primary : 'rgb(156, 163, 175)', opacity: isFormValid ? 1 : 0.6 }} className="w-full py-3 rounded-lg text-white font-bold shadow-lg flex items-center justify-center transition-all" disabled={!isFormValid || isBooking}>
            {isBooking ? <Loader2 className="w-5 h-5 animate-spin" /> : (requiresPayment ? <>Pagar Sinal <ArrowRight className="w-5 h-5 ml-2" /></> : 'Confirmar Agendamento')}
          </button>
          <button onClick={() => { setStep(1); setPixData(null); }} style={{ display: step === 2 ? 'flex' : 'none' }} className="w-full py-3 rounded-lg text-gray-700 font-bold bg-gray-200 hover:bg-gray-300 flex items-center justify-center">Voltar</button>
        </div>
      </div>
    </div>
  );
}

export default AppointmentScheduler;