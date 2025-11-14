import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
    ArrowLeft, Clock, MapPin, Wifi, Car, Coffee, Users, 
    Phone, Instagram, Facebook, Share2, CalendarCheck, MessageCircle,
    DollarSign, Star, User as UserIcon 
} from 'lucide-react';

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay, EffectFade } from 'swiper/modules'; 
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

// Componentes Internos
import ServiceList from '@/components/ServiceList'; 
import HourglassLoading from '@/components/HourglassLoading';
import ConfirmationPage from '@/components/ConfirmationPage'; 
import AppointmentScheduler from '@/components/AppointmentScheduler'; 

// Helpers e Configs
const initMercadoPago = (key, options) => { console.log(`MP SDK: ${key}`); };
const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// --- HELPERS DE FORMATAÇÃO ---
const formatPhoneVisual = (phone) => {
    if (!phone) return "";
    let numbers = phone.replace(/\D/g, '');
    if (numbers.startsWith('55') && numbers.length > 11) {
        numbers = numbers.substring(2);
    }
    if (numbers.length === 11) {
        return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
    }
    if (numbers.length === 10) {
        return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 6)}-${numbers.substring(6)}`;
    }
    return numbers;
};
const getWhatsAppLink = (phone) => {
    if (!phone) return "#";
    const numbers = phone.replace(/\D/g, '');
    return `https://wa.me/${numbers}`;
};
const checkIsOpen = (schedule) => {
    if (!schedule || typeof schedule !== 'object') return false;
    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayKey = days[now.getDay()]; 
    const todayData = schedule[currentDayKey];
    if (!todayData || !todayData.isOpen) return false;
    const getMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = getMinutes(todayData.openTime);
    const closeMinutes = getMinutes(todayData.closeTime);
    if (todayData.hasLunch) {
        const lunchStart = getMinutes(todayData.lunchStart);
        const lunchEnd = getMinutes(todayData.lunchEnd);
        if (currentMinutes >= lunchStart && currentMinutes < lunchEnd) return false;
    }
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
};
const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const dayNames = { monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua', thursday: 'Qui', friday: 'Sex', saturday: 'Sáb', sunday: 'Dom' };
const formatHoursForDisplay = (map) => {
    if (!map || typeof map !== 'object') return [];
    return dayOrder.map(k => {
        const d = map[k];
        if (!d) return null;
        return { day: dayNames[k], ...d };
    }).filter(Boolean);
};
const amenitiesMap = {
    wifi: { icon: Wifi, label: 'Wi-Fi' },
    estacionamento: { icon: Car, label: 'Estacionamento' },
    cafe: { icon: Coffee, label: 'Café' },
};

// --- SUB-COMPONENTE: SPLASH SCREEN PREMIUM ---
const PremiumSplash = ({ isFadingOut, primaryColor }) => (
    <div className={`fixed inset-0 z-[60] flex flex-col items-center justify-center bg-white transition-opacity duration-700 ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="relative">
            <div className="absolute inset-0 bg-white/50 blur-xl rounded-full animate-pulse" style={{ backgroundColor: `${primaryColor}20` }}></div>
            <HourglassLoading message="" primaryColor={primaryColor} />
        </div>
        <p className="mt-4 text-gray-400 text-sm tracking-[0.2em] uppercase font-medium animate-pulse">Carregando Experiência</p>
    </div>
);

// --- SUB-COMPONENTE: TELA DE SALÃO INDISPONÍVEL ---
const SalonSuspended = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-3">Agendamento Indisponível</h1>
            <p className="text-gray-600 mb-6">
                O sistema de agendamento deste estabelecimento está temporariamente pausado.
            </p>
            <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-800">
                Por favor, entre em contato diretamente com o estabelecimento por telefone ou redes sociais para agendar.
            </div>
            <p className="mt-8 text-xs text-gray-400">Powered by Horalis</p>
        </div>
    </div>
);

// --- SUB-COMPONENTE: SELEÇÃO DE PROFISSIONAL (CORRIGIDO) ---
const ProfessionalSelection = ({ professionals, onSelect, primaryColor }) => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 py-4">
            <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Escolha um Profissional</h3>
            <p className="text-sm text-gray-500 text-center mb-6">Selecione quem realizará o seu atendimento.</p>
            
            <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
                
                {/* Lista de Profissionais */}
                {professionals.map((pro) => (
                    <div 
                        key={pro.id}
                        onClick={() => onSelect(pro)}
                        className="flex gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-cyan-200 hover:shadow-md transition-all cursor-pointer group items-start"
                    >
                        {pro.foto_url ? (
                            <img src={pro.foto_url} alt={pro.nome} className="w-16 h-16 rounded-2xl object-cover border-2 border-gray-50 shadow-sm flex-shrink-0" />
                        ) : (
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                                <UserIcon className="w-8 h-8" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg leading-tight">{pro.nome}</h4>
                                    <p className="text-xs font-bold text-cyan-700 uppercase tracking-wider mt-0.5 mb-1">{pro.cargo || 'Profissional'}</p>
                                </div>
                                {/* Ícone de seta ou seleção sutil */}
                                <div className="text-gray-300 group-hover:text-cyan-500 transition-colors">
                                    <Icon icon={ArrowLeft} className="w-5 h-5 rotate-180" />
                                </div>
                            </div>
                            
                            {/* 🌟 DESCRIÇÃO ELEGANTE 🌟 */}
                            {pro.descricao && (
                                <p className="text-sm text-gray-500 mt-2 leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                                    {pro.descricao}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- SUB-COMPONENTE: HERO SECTION ---
const HeroSection = ({ details, onBack, isFlowActive, isOpenNow }) => {
    const photos = details.fotos_carousel?.length > 0 ? details.fotos_carousel : [{ url: "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?q=80&w=2000&auto=format&fit=crop", alt: "Atmosphere" }];

    return (
        <div className="relative w-full h-[50vh] lg:h-[60vh] overflow-hidden rounded-b-[2rem] lg:rounded-b-[3rem] shadow-2xl z-10">
            <Swiper
                modules={[Pagination, Autoplay, EffectFade]}
                slidesPerView={1}
                pagination={{ clickable: true, dynamicBullets: true }}
                autoplay={{ delay: 5000, disableOnInteraction: false }}
                effect="fade"
                loop={true}
                className="w-full h-full"
            >
                {photos.map((p, i) => (
                    <SwiperSlide key={i}>
                        <div className="w-full h-full relative">
                            <img src={p.url} alt={p.alt} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>

            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-20">
                {isFlowActive ? (
                    <button onClick={onBack} className="bg-white/20 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/30 transition-all border border-white/10">
                        <Icon icon={ArrowLeft} className="w-6 h-6" />
                    </button>
                ) : <div />}
                <button className="bg-white/20 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/30 transition-all border border-white/10">
                    <Icon icon={Share2} className="w-5 h-5" />
                </button>
            </div>

            <div className="absolute bottom-0 left-0 w-full p-6 lg:p-12 pb-10 z-20">
                <div className="flex items-end justify-between">
                    <div className="max-w-2xl">
                        {details.url_logo && (
                            <img src={details.url_logo} alt="Logo" className="w-16 h-16 rounded-2xl mb-4 border-2 border-white/20 shadow-lg" />
                        )}
                        <h1 className="text-4xl lg:text-6xl font-bold text-white tracking-tight mb-2 leading-none">
                            {details.nome_salao}
                        </h1>
                        <p className="text-white/80 text-lg lg:text-xl font-light line-clamp-2 mb-4">
                            {details.tagline || "Experiência única em beleza e bem-estar."}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-4" title="Avaliação 5.0">
                            <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Icon key={i} icon={Star} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                ))}
                            </div>
                            <span className="text-white font-bold text-lg">5.0</span>
                        </div>
                    </div>
                    
                    <div className={`flex items-center gap-2 backdrop-blur-md border px-4 py-2 rounded-full ${isOpenNow ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'}`}>
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isOpenNow ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span className={`text-sm font-medium ${isOpenNow ? 'text-green-100' : 'text-red-100'}`}>
                            {isOpenNow ? 'Aberto' : 'Fechado'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENTE: INFO BAR ---
const InfoFloatingBar = ({ details, primaryColor }) => (
    <div className="relative -mt-8 mx-4 lg:mx-auto max-w-5xl z-20">
        <div className="bg-white shadow-xl rounded-2xl p-4 lg:p-6 flex flex-col lg:flex-row lg:items-center gap-6 border border-gray-100">
            
            <div className="flex items-start gap-4 flex-1">
                <div className="p-3 rounded-xl bg-gray-50 text-gray-600">
                    <Icon icon={MapPin} className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Localização</h3>
                    <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                        {details.endereco_completo || "Endereço não informado"}
                    </p>
                    {details.endereco_completo && (
                        <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.endereco_completo)}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs font-semibold mt-2 inline-flex items-center hover:underline"
                            style={{ color: primaryColor }}
                        >
                            Ver no mapa <Icon icon={MapPin} className="w-3 h-3 ml-1" />
                        </a>
                    )}
                </div>
            </div>

            <div className="w-px h-12 bg-gray-200 hidden lg:block" />

            <div className="flex items-start gap-4 flex-1">
                <div className="p-3 rounded-xl bg-green-50 text-green-600">
                    <Icon icon={MessageCircle} className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Fale Conosco</h3>
                    <a 
                        href={getWhatsAppLink(details.telefone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-800 font-medium text-base mt-1 block hover:text-green-600 transition-colors"
                    >
                        {formatPhoneVisual(details.telefone) || "Telefone indisponível"}
                    </a>
                    <div className="flex gap-3 mt-2">
                        {details.redes_sociais?.instagram && (
                            <a href={details.redes_sociais.instagram} className="text-gray-400 hover:text-pink-600 transition-colors"><Icon icon={Instagram} className="w-5 h-5"/></a>
                        )}
                        {details.redes_sociais?.facebook && (
                            <a href={details.redes_sociais.facebook} className="text-gray-400 hover:text-blue-600 transition-colors"><Icon icon={Facebook} className="w-5 h-5"/></a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// ----------------------------------------------------
// --- COMPONENTE PRINCIPAL ---
// ----------------------------------------------------
export function SalonMicrosite() {
    const { salaoId } = useParams();
    
    // Estados de Fluxo
    const [selectedService, setSelectedService] = useState(null);
    const [selectedProfessional, setSelectedProfessional] = useState(null);
    const [isChoosingProfessional, setIsChoosingProfessional] = useState(false);
    const [filteredProfessionals, setFilteredProfessionals] = useState([]);
    const [appointmentConfirmed, setAppointmentConfirmed] = useState(null);
    
    const [deviceId, setDeviceId] = useState(null);
    const [isSuspended, setIsSuspended] = useState(false);

    const [salonDetails, setSalonDetails] = useState({
        nome_salao: '', tagline: '', url_logo: '', cor_primaria: '#0E7490', cor_secundaria: '#FFFFFF',
        mp_public_key: null, sinal_valor: 0,
        endereco_completo: '', horario_trabalho_detalhado: {}, comodidades: {}, 
        fotos_carousel: [], formas_pagamento: '', telefone: '', redes_sociais: {},
        profissionais: [] 
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sdkReady, setSdkReady] = useState(false);
    const [showSplash, setShowSplash] = useState(true);
    const [isFadingOut, setIsFadingOut] = useState(false);

    const orderedHours = useMemo(() => formatHoursForDisplay(salonDetails.horario_trabalho_detalhado), [salonDetails.horario_trabalho_detalhado]);
    const isOpenNow = checkIsOpen(salonDetails.horario_trabalho_detalhado);

    const isSchedulingFlowActive = !!selectedService || !!appointmentConfirmed;

    useEffect(() => {
        if (!loading && showSplash && !error) {
            setTimeout(() => {
                setIsFadingOut(true);
                setTimeout(() => setShowSplash(false), 700);
            }, 1500);
        }
    }, [loading, showSplash, error]);

    const applyTheme = useCallback((details) => {
        document.documentElement.style.setProperty('--color-primary-salon', details.cor_primaria || '#0E7490');
    }, []);

    const handleDataLoaded = useCallback((details, err) => {
        setLoading(false);
        if (err) { 
            if (err.includes("403")) {
                setIsSuspended(true);
            } else {
                setError(err); 
            }
            return; 
        }
        if (details) {
            setSalonDetails(prev => ({ ...prev, ...details }));
            applyTheme(details);
            if (details.mp_public_key) {
                try { initMercadoPago(details.mp_public_key, { locale: 'pt-BR' }); setSdkReady(true); } 
                catch (e) { console.error(e); }
            } else { setSdkReady(true); }
        }
    }, [applyTheme]);

    // --- HANDLER 1: Clicou no Serviço ---
    const handleServiceSelect = (service) => { 
        setSelectedService(service); 
        
        if (salonDetails.profissionais && salonDetails.profissionais.length > 0) {
            // Filtra profissionais que fazem este serviço
            const eligiblePros = salonDetails.profissionais.filter(pro => {
                if (!pro.servicos || pro.servicos.length === 0) return true; // Se não tem lista, faz tudo
                return pro.servicos.includes(service.id);
            });

            if (eligiblePros.length > 0) {
                setFilteredProfessionals(eligiblePros);
                setIsChoosingProfessional(true);
            } else {
                // Se ninguém faz, assume agenda geral (sem profissional específico)
                setSelectedProfessional(null);
                setIsChoosingProfessional(false);
            }
        } else {
            setSelectedProfessional(null);
            setIsChoosingProfessional(false);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    };

    // --- HANDLER 2: Escolheu o Profissional ---
    const handleProfessionalSelect = (professional) => {
        setSelectedProfessional(professional);
        setIsChoosingProfessional(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- HANDLER 3: Voltar ---
    const handleBack = () => { 
        if (appointmentConfirmed) {
            setAppointmentConfirmed(null);
            setSelectedService(null);
            setSelectedProfessional(null);
            setIsChoosingProfessional(false);
        } else if (isChoosingProfessional) {
            setIsChoosingProfessional(false);
            setSelectedService(null);
        } else if (selectedService) {
            if (salonDetails.profissionais && salonDetails.profissionais.length > 0 && filteredProfessionals.length > 0) {
                setIsChoosingProfessional(true); 
                setSelectedProfessional(null);
            } else {
                setSelectedService(null);
            }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSuccess = (d) => { setAppointmentConfirmed(d); setSelectedService(null); setIsChoosingProfessional(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const handleHome = () => { setAppointmentConfirmed(null); setSelectedService(null); setIsChoosingProfessional(false); setSelectedProfessional(null); };

    const renderMainContent = () => {
        if (error) return <div className="text-center py-20 text-red-500">{error}</div>;
        
        if (appointmentConfirmed) return <ConfirmationPage appointmentDetails={appointmentConfirmed} onGoBack={handleHome} salonName={salonDetails.nome_salao} primaryColor={salonDetails.cor_primaria} />;
        
        if (selectedService && isChoosingProfessional) {
            return (
                <div className="max-w-3xl mx-auto">
                    <ProfessionalSelection 
                        professionals={filteredProfessionals} 
                        onSelect={handleProfessionalSelect} 
                        primaryColor={salonDetails.cor_primaria}
                    />
                </div>
            );
        }

        if (selectedService && !isChoosingProfessional) {
            return sdkReady ? (
                <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Finalizar Agendamento</h2>
                    
                    <div className="mb-6 flex items-center gap-3 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                        <span className="font-bold text-gray-900">{selectedService.nome_servico}</span>
                        {selectedProfessional ? (
                            <>
                                <span className="text-gray-300">|</span>
                                <span className="flex items-center gap-1"><UserIcon className="w-3 h-3"/> {selectedProfessional.nome}</span>
                            </>
                        ) : (
                            <>
                                <span className="text-gray-300">|</span>
                                <span className="italic">Profissional: Qualquer um</span>
                            </>
                        )}
                    </div>

                    <AppointmentScheduler 
                        salaoId={salaoId} 
                        selectedService={selectedService} 
                        onAppointmentSuccess={handleSuccess} 
                        sinalValor={salonDetails.sinal_valor} 
                        publicKeyExists={!!salonDetails.mp_public_key} 
                        deviceId={deviceId} 
                        primaryColor={salonDetails.cor_primaria} 
                        onBackClick={handleBack}
                        selectedProfessional={selectedProfessional} 
                    />
                </div>
            ) : <div className="py-20 flex justify-center"><HourglassLoading message="Carregando Pagamento..." primaryColor={salonDetails.cor_primaria} /></div>;
        }

        // Home (Lista de Serviços)
        return (
            <div className="max-w-5xl mx-auto grid lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Nossos Serviços</h2>
                        <p className="text-gray-500 mb-6">Selecione um serviço para começar.</p>
                        
                        <ServiceList 
                            salaoId={salaoId} 
                            onDataLoaded={handleDataLoaded} 
                            onServiceClick={handleServiceSelect} 
                            primaryColor={salonDetails.cor_primaria} 
                        />
                    </div>
                </div>
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 sticky top-8">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                            <Icon icon={Clock} className="w-5 h-5 mr-2" style={{ color: salonDetails.cor_primaria }} />
                            Horários
                        </h3>
                        <ul className="space-y-3 text-sm">
                            {orderedHours.map((h, i) => (
                                <li key={i} className="flex justify-between items-center pb-2 border-b border-gray-200/50 last:border-0">
                                    <span className="text-gray-600 font-medium">{h.day}</span>
                                    {h.isOpen ? 
                                        <span className="text-gray-900 font-semibold">{h.openTime} - {h.closeTime}</span> : 
                                        <span className="text-red-400 font-medium text-xs bg-red-50 px-2 py-1 rounded-full">Fechado</span>
                                    }
                                </li>
                            ))}
                        </ul>

                        {Object.keys(salonDetails.comodidades).length > 0 && (
                            <div className="mt-8">
                                <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">Comodidades</h3>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(salonDetails.comodidades).filter(([_, v]) => v).map(([k]) => (
                                        <span key={k} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-gray-200 text-gray-600">
                                            {k}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-gray-200/60">
                            <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider flex items-center">
                                <Icon icon={DollarSign} className="w-4 h-4 mr-1" style={{ color: salonDetails.cor_primaria }} />
                                Pagamento
                            </h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                {salonDetails.formas_pagamento || 'Dinheiro, Cartão, Pix.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (isSuspended) {
        return <SalonSuspended />;
    }
    
    return (
        <>
            {showSplash && <PremiumSplash isFadingOut={isFadingOut} primaryColor={salonDetails.cor_primaria} />}

            <div className={`min-h-screen bg-[#FAFAFA] font-sans selection:bg-black/10 transition-opacity duration-700 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
                
                <HeroSection 
                    details={salonDetails} 
                    onBack={handleBack} 
                    isFlowActive={isSchedulingFlowActive}
                    isOpenNow={isOpenNow} 
                />

                {!isSchedulingFlowActive && (
                    <InfoFloatingBar details={salonDetails} primaryColor={salonDetails.cor_primaria} />
                )}

                <div className="px-4 py-12 lg:py-16">
                    {renderMainContent()}
                </div>

                <footer className="py-8 text-center border-t border-gray-200 mt-auto bg-white">
                    <p className="text-sm text-gray-400 font-medium">
                        Powered by <span className="text-gray-900 font-bold">Horalis</span>
                    </p>
                </footer>
            </div>
        </>
    );
}