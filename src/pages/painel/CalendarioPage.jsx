import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import HoralisFullCalendar from '@/components/HoralisFullCalendar';
import { format, differenceInMinutes, isBefore, setHours, setMinutes, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { auth, db } from '@/firebaseConfig';
import { collection, onSnapshot } from "firebase/firestore";
import toast from 'react-hot-toast';

import HoralisCalendar from '@/components/HoralisCalendar';
import {
    Loader2, X, Clock, User, Phone, Mail,
    ChevronLeft, ChevronRight, Plus, MessageCircle, AlertTriangle, Calendar as CalendarIcon
} from "lucide-react";

import { useSalon } from './PainelLayout';
import HourglassLoading from '@/components/HourglassLoading';

const API_BASE_URL = "https://api-agendador-2n55.onrender.com/api/v1";
const HORALIS_EVENT_COLORS = ['#3788D8', '#1B9AAA', '#7C3AED', '#37D88B', '#EC4899', '#F59E0B', '#10B981'];

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

function useOnClickOutside(ref, handler) {
    useEffect(() => {
        const listener = (event) => {
            if (!ref.current || ref.current.contains(event.target)) return;
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

// --- SUB-COMPONENTE: HEADER PREMIUM ---
const HoralisCalendarHeader = ({
    onToday, onPrev, onNext, calendarTitle, currentView, onViewChange,
    popoverDate, onPopoverDateSelect, isMobile, primaryColor
}) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const popoverRef = useRef(null);
    useOnClickOutside(popoverRef, () => setIsPopoverOpen(false));

    const handleDateSelect = (date) => {
        onPopoverDateSelect(date);
        setIsPopoverOpen(false);
    };

    return (
        <header className="flex-shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 bg-white border-b border-gray-100 shadow-sm z-20 relative">
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
                    <button onClick={onPrev} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white rounded-md transition-all shadow-sm">
                        <Icon icon={ChevronLeft} className="w-5 h-5" />
                    </button>
                    <button onClick={onToday} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 uppercase tracking-wide">
                        Hoje
                    </button>
                    <button onClick={onNext} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white rounded-md transition-all shadow-sm">
                        <Icon icon={ChevronRight} className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative" ref={popoverRef}>
                    <button 
                        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                        className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-gray-900 hover:opacity-70 transition-opacity"
                    >
                        {calendarTitle}
                        <Icon icon={CalendarIcon} className="w-5 h-5 text-gray-400" />
                    </button>

                    {isPopoverOpen && (
                        <div className="absolute top-full left-0 mt-4 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 animate-in fade-in zoom-in-95 duration-200">
                            <HoralisCalendar selectedDate={popoverDate} onDateSelect={handleDateSelect} primaryColor={primaryColor} />
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 sm:mt-0 w-full sm:w-auto">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {!isMobile && (
                        <button
                            onClick={() => onViewChange({ target: { value: 'timeGridWeek' } })}
                            className={`flex-1 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${currentView === 'timeGridWeek' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Semana
                        </button>
                    )}
                    <button
                        onClick={() => onViewChange({ target: { value: 'timeGridDay' } })}
                        className={`flex-1 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${currentView === 'timeGridDay' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Dia
                    </button>
                    <button
                        onClick={() => onViewChange({ target: { value: 'dayGridMonth' } })}
                        className={`flex-1 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${currentView === 'dayGridMonth' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Mês
                    </button>
                </div>
            </div>
        </header>
    );
};


// --- COMPONENTE PRINCIPAL DA PÁGINA ---
function CalendarioPage() {
    const { salaoId, salonDetails } = useSalon();
    const primaryColor = salonDetails?.cor_primaria || '#0E7490';

    const [events, setEvents] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isInitialLoad = useRef(true);
    
    // Modais
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [initialSlot, setInitialSlot] = useState(null);
    const [initialDuration, setInitialDuration] = useState(null);

    const calendarRef = useRef(null);
    const [calendarTitle, setCalendarTitle] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [currentView, setCurrentView] = useState(window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek');
    const [currentDate, setCurrentDate] = useState(new Date());

    // Responsividade
    useEffect(() => {
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

    // Busca de Agendamentos
    useEffect(() => {
        if (!salaoId || !auth.currentUser) {
            if (!salaoId) setError("ID do salão não encontrado.");
            setLoading(false);
            return;
        }

        setLoading(true);
        const agendamentosRef = collection(db, 'cabeleireiros', salaoId, 'agendamentos');
        const unsubscribe = onSnapshot(agendamentosRef, (querySnapshot) => {
            const rawEvents = [];
            querySnapshot.docChanges().forEach((change) => {
                if (change.type === "added" && !isInitialLoad.current) {
                    const d = change.doc.data(); 
                    toast.success(`Novo: ${d.serviceName}`, { icon: '✨', style: { fontSize: '12px' } });
                }
            });
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const startTime = data.startTime?.toDate(); 
                const endTime = data.endTime?.toDate();
                if (startTime && endTime) {
                    const colorIndex = Math.abs(doc.id.charCodeAt(0) % HORALIS_EVENT_COLORS.length);
                    rawEvents.push({
                        id: doc.id, 
                        title: `${data.customerName || 'Cliente'} - ${data.serviceName || 'Serviço'}`,
                        start: startTime, 
                        end: endTime, 
                        backgroundColor: HORALIS_EVENT_COLORS[colorIndex], 
                        borderColor: 'transparent',
                        textColor: '#FFFFFF',
                        extendedProps: { ...data }
                    });
                }
            });
            setEvents(rawEvents);
            setLoading(false);
            isInitialLoad.current = false;
        }, (err) => {
            setError("Erro ao conectar à agenda."); setLoading(false); console.error(err);
        });
        return () => unsubscribe();
    }, [salaoId]);

    // Busca de Serviços
    useEffect(() => {
        if (!salaoId) return;
        const servicosRef = collection(db, 'cabeleireiros', salaoId, 'servicos');
        const unsubscribe = onSnapshot(servicosRef, (querySnapshot) => {
            const list = [];
            querySnapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
            setServices(list);
        });
        return () => unsubscribe();
    }, [salaoId]);

    // API do Calendário
    const getCalendarApi = () => calendarRef.current?.getApi();

    const handleTodayClick = () => { getCalendarApi()?.today(); setCurrentDate(new Date()); };
    const handlePrevClick = () => getCalendarApi()?.prev();
    const handleNextClick = () => getCalendarApi()?.next();
    const handleViewChange = (e) => { 
        const newView = e.target.value; 
        getCalendarApi()?.changeView(newView); 
        setCurrentView(newView); 
    };
    const handleDateSelect = (date) => { 
        if (!date) return; 
        getCalendarApi()?.gotoDate(date); 
        setCurrentDate(date); 
    };
    const handleDatesSet = (dateInfo) => {
        setCalendarTitle(dateInfo.view.title);
        setCurrentDate(dateInfo.view.currentStart);
        setCurrentView(dateInfo.view.type);
    };

    // Interações
    const handleEventClick = (clickInfo) => {
        setSelectedEvent({
            id: clickInfo.event.id, 
            title: clickInfo.event.title, 
            start: clickInfo.event.start, 
            end: clickInfo.event.end,
            backgroundColor: clickInfo.event.backgroundColor, 
            extendedProps: clickInfo.event.extendedProps,
        });
        setIsDetailsModalOpen(true);
    };

    const handleDateClick = (dateInfo) => {
        const api = getCalendarApi();
        if (api && api.view.type === 'dayGridMonth') {
            api.changeView('timeGridDay', dateInfo.date);
            setCurrentView('timeGridDay');
        }
    };

    const handleCreateClick = () => {
        setInitialSlot(null);
        setInitialDuration(30);
        setIsManualModalOpen(true);
    };

    const handleTimeSelect = (selectInfo) => {
        if (selectInfo.view.type === 'dayGridMonth') {
            calendarRef.current?.getApi().unselect();
            return;
        }
        if (isBefore(selectInfo.start, new Date())) {
            toast.error("Horário passado não permitido.");
            calendarRef.current?.getApi().unselect();
            return;
        }
        const durationMinutes = differenceInMinutes(selectInfo.end, selectInfo.start);
        setInitialSlot(selectInfo.start);
        setInitialDuration(durationMinutes > 0 ? durationMinutes : 30);
        setIsManualModalOpen(true);
        calendarRef.current?.getApi().unselect();
    };

    const handleEventDrop = useCallback(async (dropInfo) => {
        const { event } = dropInfo;
        if (isBefore(event.start, new Date())) {
            toast.error("Não é possível reagendar para o passado.");
            dropInfo.revert(); return;
        }
        if (!window.confirm(`Reagendar para ${format(event.start, 'dd/MM HH:mm')}?`)) {
            dropInfo.revert(); return;
        }
        const toastId = toast.loading("Reagendando...");
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.patch(`${API_BASE_URL}/admin/calendario/${salaoId}/agendamentos/${event.id}`,
                { new_start_time: event.start.toISOString() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Reagendado!", { id: toastId });
        } catch (err) {
            toast.error(err.response?.data?.detail || "Falha ao reagendar.", { id: toastId });
            dropInfo.revert();
        }
    }, [salaoId]);

    const handleManualSaveSuccess = () => {
        setIsManualModalOpen(false);
        setInitialSlot(null);
        setInitialDuration(null);
    };

    // Renderização
    if (loading && isInitialLoad.current) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh]">
                <HourglassLoading message='Carregando Agenda...' primaryColor={primaryColor} />
            </div>
        );
    }
    if (error) {
        return <div className="p-8 bg-red-50 text-red-700 rounded-2xl m-4 border border-red-100 text-center font-medium">{error}</div>;
    }

    return (
        <div className="flex h-screen font-sans bg-gray-50 overflow-hidden flex-col">
            
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
                primaryColor={primaryColor}
            />

            <div className="flex-1 p-4 sm:p-6 overflow-hidden">
                <div className="h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
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
                        primaryColor={primaryColor}
                    />
                </div>
            </div>

            <button
                onClick={handleCreateClick}
                className="fixed bottom-8 right-8 z-40 flex items-center justify-center w-14 h-14 rounded-full shadow-xl text-white transition-all duration-300 ease-in-out transform hover:scale-110 hover:rotate-90"
                style={{ backgroundColor: primaryColor }}
                title="Novo Agendamento"
            >
                <Icon icon={Plus} className="w-7 h-7" />
            </button>

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
                initialDuration={initialDuration}
                onSaveSuccess={handleManualSaveSuccess}
                events={events}
                services={services}
                primaryColor={primaryColor}
            />
        </div>
    );
}

// --- FUNÇÕES AUXILIARES E MODAIS ---

const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    const cleaned = ('' + phone).replace(/\D/g, '');
    if (cleaned.length === 11) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    if (cleaned.length === 10) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
    return phone;
};

const buildWhatsappLink = (phone, name, service, dateTime) => {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, '');
    let target = cleaned.length <= 11 ? '55' + cleaned : cleaned;
    const msg = `Olá ${name || ''}, passando para confirmar seu agendamento de ${service || 'serviço'} no dia ${dateTime || ''}.`;
    return `https://wa.me/${target}?text=${encodeURIComponent(msg)}`;
};

// Modal de Detalhes (Estilo Card)
const EventDetailsModal = ({ isOpen, onClose, event, salaoId, onCancelSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);
    if (!isOpen || !event) return null;

    const { customerName, customerPhone, serviceName, durationMinutes, customerEmail } = event.extendedProps;
    const formattedDateTime = event.start ? format(event.start, "dd/MM 'às' HH:mm") : '';
    const duration = durationMinutes || (event.end ? differenceInMinutes(event.end, event.start) : "N/A");
    const whatsappLink = buildWhatsappLink(customerPhone, customerName, serviceName, formattedDateTime);

    const handleCancel = async () => {
        if (!window.confirm("Cancelar este agendamento?")) return;
        setIsLoading(true);
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.delete(`${API_BASE_URL}/admin/calendario/${salaoId}/agendamentos/${event.id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Cancelado!");
            onCancelSuccess();
        } catch (err) { toast.error("Erro ao cancelar."); } finally { setIsLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">{serviceName || "Serviço"}</h2>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                            <Icon icon={Clock} className="w-3 h-3" /> {duration} min
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200 transition-colors"><Icon icon={X} className="w-5 h-5" /></button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg">
                            {customerName ? customerName[0].toUpperCase() : <Icon icon={User} className="w-6 h-6" />}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">{customerName || "Sem nome"}</p>
                            <p className="text-sm text-gray-500">{customerEmail || "Sem e-mail"}</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Data e Hora</span>
                            <span className="text-sm font-semibold text-gray-900">{formattedDateTime}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Telefone</span>
                            <span className="text-sm font-semibold text-gray-900">{formatPhoneNumber(customerPhone)}</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {customerPhone && (
                            <a href={whatsappLink} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium text-sm shadow-sm">
                                <Icon icon={MessageCircle} className="w-4 h-4" /> Confirmar
                            </a>
                        )}
                        <button onClick={handleCancel} disabled={isLoading} className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors font-medium text-sm">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Cancelar"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 🌟 MODAL DE AGENDAMENTO MANUAL (COMPLETO) 🌟
const ManualBookingModal = ({ isOpen, onClose, salaoId, initialDateTime, initialDuration, onSaveSuccess, services, primaryColor }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    // 🌟 Adicionado estado para email
    const [email, setEmail] = useState(''); 
    
    const [serviceId, setServiceId] = useState('');
    const [duration, setDuration] = useState(initialDuration || 30);
    const [date, setDate] = useState(initialDateTime ? new Date(initialDateTime) : new Date());
    const [time, setTime] = useState(initialDateTime ? format(new Date(initialDateTime), 'HH:mm') : '09:00');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setName('');
            setPhone('');
            setEmail(''); // Limpa o email ao abrir
            setServiceId('');
            if (initialDateTime) {
                setDate(initialDateTime);
                setTime(format(initialDateTime, 'HH:mm'));
            }
            setDuration(initialDuration || 30);
        }
    }, [isOpen, initialDateTime, initialDuration]);

    const handleServiceChange = (e) => {
        const sid = e.target.value;
        setServiceId(sid);
        const svc = services.find(s => s.id === sid);
        if (svc) setDuration(svc.duracao_minutos);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const [h, m] = time.split(':').map(Number);
            const finalDate = setMinutes(setHours(date, h), m);
            const svcName = services.find(s => s.id === serviceId)?.nome_servico || 'Serviço Manual';
            
            const token = await auth.currentUser.getIdToken();
            
            // 🌟 Enviando email e telefone no payload para notificações
            await axios.post(`${API_BASE_URL}/admin/calendario/agendar`, {
                salao_id: salaoId, 
                start_time: finalDate.toISOString(), 
                duration_minutes: duration,
                customer_name: name, 
                customer_phone: phone, 
                customer_email: email, // Adicionado
                service_id: serviceId, 
                service_name: svcName, 
                service_price: 0
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            toast.success("Agendado com sucesso!");
            onSaveSuccess();
        } catch (err) { 
            toast.error("Erro ao salvar."); 
            console.error(err);
        } finally { 
            setLoading(false); 
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-900">Novo Agendamento Manual</h2>
                    <button onClick={onClose}><Icon icon={X} className="w-5 h-5 text-gray-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Data e Hora */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Data</label>
                            <input type="date" value={format(date, 'yyyy-MM-dd')} onChange={e => setDate(parse(e.target.value, 'yyyy-MM-dd', new Date()))} className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-opacity-50 outline-none" style={{ borderColor: primaryColor, '--tw-ring-color': primaryColor }} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Hora</label>
                            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-opacity-50" style={{ borderColor: primaryColor, '--tw-ring-color': primaryColor }} />
                        </div>
                    </div>

                    {/* Cliente */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Nome do Cliente*</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome Completo" className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" required />
                    </div>

                    {/* 🌟 CAMPOS RESTAURADOS: Telefone e E-mail */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Telefone / WhatsApp</label>
                            <input 
                                value={phone} 
                                onChange={e => setPhone(e.target.value)} 
                                placeholder="(XX) 99999-9999" 
                                className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">E-mail (Opcional)</label>
                            <input 
                                type="email"
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                placeholder="cliente@email.com" 
                                className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" 
                            />
                        </div>
                    </div>

                    {/* Serviço */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Serviço*</label>
                        <select value={serviceId} onChange={handleServiceChange} className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none bg-white" required>
                            <option value="">Selecione um serviço...</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.nome_servico} ({s.duracao_minutos} min)</option>)}
                        </select>
                    </div>

                    <button type="submit" disabled={loading} className="w-full py-3 text-white font-bold rounded-xl shadow-md hover:opacity-90 transition-opacity mt-2" style={{ backgroundColor: primaryColor }}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Salvar Agendamento"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CalendarioPage;