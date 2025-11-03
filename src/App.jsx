import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useParams, Navigate, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from './firebaseConfig';
import { Toaster } from 'react-hot-toast';
// Axios é necessário para a requisição, mas não é usado diretamente neste arquivo pai

// Imports dos Componentes de Agendamento
import ServiceList from './components/ServiceList';
import AppointmentScheduler from './components/AppointmentScheduler';
import ConfirmationPage from './components/ConfirmationPage';
import HoralisCalendar from './components/HoralisCalendar';

// Imports da Landing Page
import { LandingPage } from './pages/LandingPage';
import { ImageWithFallback } from '@/ui/ImageWithFallback';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ClienteDetailPage from './pages/painel/ClienteDetailPage';
import MarketingPage from './pages/painel/MarketingPage';

// --- Imports do NOVO PAINEL ---
import PainelLayout from './pages/painel/PainelLayout';
import VisaoGeralPage from './pages/painel/VisaoGeralPage';
import CalendarioPage from './pages/painel/CalendarioPage';
import ServicosPage from './pages/painel/ServicosPage';
import PersonalizacaoPage from './pages/painel/PersonalizacaoPage';
import ConfiguracoesPage from './pages/painel/ConfiguracoesPage';
import ProfissionalLoginPage from './pages/painel/ProfissionalLoginPage';
import ProfissionalSignupPage from './pages/painel/ProfissionalSignupPage';
import HorariosPage from './pages/painel/HorariosPage';
import AssinaturaPage from './pages/painel/AssinaturaPage';
import ClientesPage from './pages/painel/ClientesPage';
// --- FIM DOS NOVOS IMPORTS ---
import HourglassLoading from './components/HourglassLoading';
import FullScreenLoading from './components/FullScreenLoading';

// --- Imports do Mercado Pago ---
import { initMercadoPago } from '@mercadopago/sdk-react';
const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- Componente de Loading (Ampulheta - Reutilizável) ---


// --- Rota Protegida (Helper) ---
function ProtectedPanelRoute({ children, user, location }) {
    const { salaoId } = useParams();
    const navigate = useNavigate();

    // 1. Auth ainda carregando? Mostra loading.
    if (user === undefined) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                {/* NOVO: Usando HourglassLoading */}
                <HourglassLoading message="Verificando autenticação..." primaryColor="#4B5563" />
            </div>
        );
    }

    // 2. Não logado? Redireciona para login
    if (!user) {
        return <Navigate
            to={`/login`}
            state={{ from: location.pathname }}
            replace
        />;
    }
    return children;
}

// --- Ícone Helper ---
const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// --- Componente PAI do Agendamento Público ---
function SalonScheduler() {
    const { salaoId } = useParams();
    const [selectedService, setSelectedService] = useState(null);
    const [appointmentConfirmed, setAppointmentConfirmed] = useState(null);
    const [deviceId, setDeviceId] = useState(null);
    const [salonDetails, setSalonDetails] = useState({
        nome_salao: '',
        tagline: '',
        url_logo: '',
        cor_primaria: '',
        cor_secundaria: '',
        mp_public_key: null,
        sinal_valor: 0
    });
    const [loadingSalonData, setLoadingSalonData] = useState(true);
    const [errorSalon, setErrorSalon] = useState(null);
    const [sdkReady, setSdkReady] = useState(false);

    // NOVO ESTADO: Controla a visibilidade e o fade-out do splash screen
    const [showSplash, setShowSplash] = useState(true);
    const [isFadingOut, setIsFadingOut] = useState(false);

    // Efeito para gerenciar o timing do Splash Screen (Smart Loading)
    useEffect(() => {
        // Se os dados estão carregados (loadingSalonData = false) e o splash ainda está visível
        if (!loadingSalonData && showSplash && !errorSalon) {
            const minDuration = 2000; // Tempo mínimo de 2 segundos após o carregamento dos dados

            const minDurationTimer = setTimeout(() => {
                // Inicia o processo de fade-out (opacidade 0)
                setIsFadingOut(true);

                // Espera o tempo da transição CSS (500ms) e então desmonta o componente
                const fadeOutDuration = 500;
                const hideTimer = setTimeout(() => {
                    setShowSplash(false);
                }, fadeOutDuration);

                return () => clearTimeout(hideTimer);

            }, minDuration); // Atraso de 2 segundos

            return () => clearTimeout(minDurationTimer);
        }
        // Se loadingSalonData falhou, desativamos o splash imediatamente para mostrar o erro.
        if (errorSalon && showSplash) {
            setShowSplash(false);
        }

    }, [loadingSalonData, showSplash, errorSalon]);


    // Componente FullScreenLoading (Ampulheta Animada)

    // Função para aplicar as cores via variáveis CSS
    const applyThemeColors = useCallback((details) => {
        const primary = details.cor_primaria || '#0E7490';
        const secondary = details.cor_secundaria || '#FFFFFF';

        document.documentElement.style.setProperty('--color-primary-salon', primary);
        document.documentElement.style.setProperty('--color-secondary-salon', secondary);

        console.log(`Cores aplicadas: Primary=${primary}, Secondary=${secondary}`);
    }, []);

    // Função handleDataLoaded (Mantida para ser chamada pelo ServiceList)
    const handleDataLoaded = useCallback((details, error = null) => {
        setLoadingSalonData(false); // <--- Este é o gatilho para o timer do splash screen
        if (error) {
            setErrorSalon(error);
            setSalonDetails(prev => ({ ...prev, nome_salao: 'Erro ao Carregar' }));
            setSdkReady(false);
            return;
        }

        if (details && typeof details === 'object') {
            setSalonDetails(prev => ({
                ...prev,
                nome_salao: details.nome_salao,
                tagline: details.tagline,
                url_logo: details.url_logo,
                cor_primaria: details.cor_primaria || '#0E7490',
                cor_secundaria: details.cor_secundaria || '#FFFFFF',
                mp_public_key: details.mp_public_key,
                sinal_valor: details.sinal_valor
            }));
            setErrorSalon(null);

            applyThemeColors(details);

            const key = details.mp_public_key;
            const sinal = details.sinal_valor || 0;

            if (key && sinal > 0) {
                try {
                    console.log("Inicializando MercadoPago SDK com a chave do salão...");
                    initMercadoPago(key, { locale: 'pt-BR' });
                    setSdkReady(true);
                } catch (sdkError) {
                    console.error("Erro ao inicializar SDK do MP:", sdkError);
                    setErrorSalon("Erro ao carregar o módulo de pagamento (SDK).");
                    setSdkReady(false);
                }
            } else {
                console.log("Chave de pagamento não configurada ou sinal é zero. SDK não iniciado (Modo Gratuito).");
                setSdkReady(true);
            }
        } else {
            console.error("handleDataLoaded: Detalhes inválidos!", details);
            setErrorSalon("Erro inesperado.");
            setSdkReady(false);

        }
    }, [applyThemeColors]);


    // Efeito: Captura de Device ID
    useEffect(() => {
        const captureDeviceId = () => {
            const deviceIdElement = document.querySelector('input[name="__mpoffline_device_id"]');
            if (deviceIdElement && deviceIdElement.value) {
                setDeviceId(deviceIdElement.value);
                console.log("Device ID capturado:", deviceIdElement.value);
                return true;
            }
            return false;
        };

        if (salonDetails.mp_public_key && salonDetails.sinal_valor > 0 && sdkReady) {
            const interval = setInterval(() => {
                if (captureDeviceId()) {
                    clearInterval(interval);
                }
            }, 500);
            return () => clearInterval(interval);
        }
    }, [sdkReady, salonDetails.mp_public_key, salonDetails.sinal_valor]);


    const handleServiceSelect = useCallback((service) => {
        setSelectedService(service);
        setAppointmentConfirmed(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleAppointmentSuccess = useCallback((details) => {
        setAppointmentConfirmed(details);
        setSelectedService(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleGoBackHome = useCallback(() => {
        setAppointmentConfirmed(null);
        setSelectedService(null);
    }, []);

    const handleBackFromScheduler = useCallback(() => {
        setSelectedService(null);
    }, []);

    if (!salaoId) {
        return <p className="p-4 text-center text-red-600">ID do Salão inválido na URL.</p>;
    }

    const renderContent = () => {
        const primaryColor = salonDetails.cor_primaria || '#0E7490';

        // Bloco condicional removido para garantir que o ServiceList seja montado.
        // A visibilidade é controlada pelo componente FullScreenLoading.

        if (errorSalon) {
            // Este erro só é visível se o showSplash já tiver sido desativado pelo useEffect
            return <p className="p-4 text-center text-red-600">{errorSalon}</p>;
        }

        if (appointmentConfirmed) {
            return <ConfirmationPage
                appointmentDetails={appointmentConfirmed}
                onGoBack={handleGoBackHome}
                salonName={salonDetails.nome_salao}
                primaryColor={primaryColor}
            />;
        }

        if (selectedService) {
            if (sdkReady) {
                return <AppointmentScheduler
                    salaoId={salaoId}
                    selectedService={selectedService}
                    onAppointmentSuccess={handleAppointmentSuccess}
                    sinalValor={salonDetails.sinal_valor || 0}
                    publicKeyExists={!!salonDetails.mp_public_key}
                    deviceId={deviceId}
                    primaryColor={primaryColor}
                />;
            } else {
                return (
                    // Antigo: <div className="flex flex-col items-center justify-center p-10">...</div>
                    // NOVO: Usando HourglassLoading
                    <HourglassLoading message="Carregando gateway de pagamento..." primaryColor={primaryColor} />
                );
            }
        }

        // Renderiza ServiceList sempre que estiver na tela inicial, 
        // permitindo que o onDataLoaded dispare o fetch inicial.
        return (
            <ServiceList
                salaoId={salaoId}
                onDataLoaded={handleDataLoaded}
                onServiceClick={handleServiceSelect}
                primaryColor={primaryColor}
            />
        );
    };

    // Usamos o Fragment (<> </>) para renderizar o splash screen como irmão do conteúdo principal
    return (
        <>
            {/* O Full Screen Splash só é montado se showSplash for true */}
            {showSplash && <FullScreenLoading />}

            {/* O conteúdo principal da aplicação só fica visível quando o splash sumir.
                A opacidade garante o fade-in/fade-out suave. */}
            <div
                className={`w-full min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 py-8 px-4 sm:px-6 lg:px-8 transition-opacity duration-500 ${showSplash ? 'opacity-0' : 'opacity-100'}`}
                style={{ pointerEvents: showSplash ? 'none' : 'auto' }}
            >
                {/* CARD CONTAINER PREMIUM */}
                <div className="w-full max-w-3xl mx-auto">
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">

                        {/* CABEÇALHO PREMIUM - Separado visualmente */}
                        {!appointmentConfirmed && (
                            <header className="relative w-full bg-white">
                                {/* Background decorativo com gradiente */}
                                <div
                                    className="absolute inset-0 opacity-5"
                                    style={{
                                        background: `linear-gradient(135deg, ${salonDetails.cor_primaria || '#0E7490'} 0%, transparent 100%)`
                                    }}
                                />

                                <div className="relative">
                                    {/* Botão Voltar: CORREÇÃO DO Z-INDEX */}
                                    {selectedService && (
                                        <div className="absolute top-6 left-4 sm:left-8 z-50">
                                            <button
                                                onClick={handleBackFromScheduler}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-x-1 border border-gray-100"
                                            >
                                                <ArrowLeft className="h-4 w-4 text-gray-600" />
                                                <span className="text-gray-700">Voltar</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* ESPAÇADOR PARA FORÇAR ALTURA DO HEADER QUANDO O BOTÃO ESTÁ ATIVO */}
                                    {selectedService && (
                                        <div className="pt-20 sm:pt-16" />
                                    )}


                                    {/* Conteúdo do Cabeçalho */}
                                    {!selectedService && !loadingSalonData && !errorSalon && (
                                        <div className="pt-12 pb-8 px-4 sm:px-8">
                                            <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
                                                {/* Logo com efeito premium */}
                                                {salonDetails.url_logo && (
                                                    <div className="relative mb-6">
                                                        <div
                                                            className="absolute inset-0 rounded-full blur-2xl opacity-20"
                                                            style={{ backgroundColor: salonDetails.cor_primaria }}
                                                        />
                                                        <img
                                                            alt={salonDetails.nome_salao}
                                                            src={salonDetails.url_logo}
                                                            className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-2xl object-cover ring-4 ring-gray-100"
                                                        />
                                                    </div>
                                                )}

                                                {/* Nome do Salão */}
                                                <h1 className="mb-3 tracking-tight bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent">
                                                    {salonDetails.nome_salao}
                                                </h1>

                                                {/* Tagline */}
                                                {salonDetails.tagline && (
                                                    <p className="text-gray-600 mb-8 max-w-md">
                                                        {salonDetails.tagline}
                                                    </p>
                                                )}

                                                {/* Separador decorativo */}
                                                <div className="flex items-center gap-3 mb-8">
                                                    <div className="h-px w-12 bg-gradient-to-r from-transparent to-gray-300" />
                                                    <div
                                                        className="w-2 h-2 rounded-full"
                                                        style={{ backgroundColor: salonDetails.cor_primaria }}
                                                    />
                                                    <div className="h-px w-12 bg-gradient-to-l from-transparent to-gray-300" />
                                                </div>

                                                {/* Título da Seção de Serviços */}
                                                <div className="w-full">
                                                    <h2
                                                        className="mb-2 tracking-tight"
                                                        style={{ color: salonDetails.cor_primaria || '#0E7490' }}
                                                    >
                                                        Nossos Serviços
                                                    </h2>
                                                    <p className="text-gray-600">
                                                        Escolha o serviço desejado para agendar seu horário
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Bloco de loading/error no cabeçalho (apenas visível se o splash sumiu e o loading/error persiste) */}
                                    {!showSplash && loadingSalonData && !errorSalon && !selectedService && (
                                        // Antigo: <div className="h-32 flex items-center justify-center">...</div>
                                        // NOVO: Usando HourglassLoading para o loading de dados
                                        <div className="h-32 flex items-center justify-center">
                                            <HourglassLoading message="Carregando dados..." primaryColor={salonDetails.cor_primaria} size="w-8 h-8" />
                                        </div>
                                    )}

                                    {!showSplash && errorSalon && !selectedService && (
                                        <p className="text-red-600 text-center py-8">Erro ao carregar.</p>
                                    )}
                                </div>

                                {/* Linha separadora sutil */}
                                {!selectedService && !loadingSalonData && !errorSalon && (
                                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                                )}
                            </header>
                        )}

                        {/* CONTEÚDO PRINCIPAL - Cards de Serviço */}
                        <main className={`w-full bg-gradient-to-b from-white to-gray-50/30 ${!appointmentConfirmed ? "px-4 sm:px-8 py-8" : ""}`}>
                            {renderContent()}
                        </main>

                        {/* FOOTER */}
                        {!appointmentConfirmed && !selectedService && !loadingSalonData && !errorSalon && (
                            <footer className="w-full text-center px-4 py-6 bg-gray-50/50 border-t border-gray-100">
                                <p className="text-gray-500 text-sm">
                                    © {new Date().getFullYear()} Horalis. Todos os direitos reservados.
                                </p>
                            </footer>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// --- Componente APP Principal ---
function App() {
    const [user, setUser] = useState(undefined);
    const location = useLocation();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="relative min-h-screen">
            <Toaster
                position="top-right"
                reverseOrder={false}
                toastOptions={{
                    duration: 5000,
                    style: { background: '#333', color: '#fff' },
                }}
            />

            <Routes>
                <Route path="/" element={<LandingPage />} />

                {/* --- ROTAS DE AUTENTICAÇÃO PÚBLICA --- */}
                <Route path="/login" element={<ProfissionalLoginPage />} />
                <Route path="/cadastro" element={<ProfissionalSignupPage />} />

                {/* Rota de Agendamento (Pública) */}
                <Route path="/agendar/:salaoId" element={<SalonScheduler />} />

                {/* --- ROTA DO PAINEL PROTEGIDA (Pai) --- */}
                <Route
                    path="/painel/:salaoId"
                    element={
                        <ProtectedPanelRoute user={user} location={location}>
                            <PainelLayout />
                        </ProtectedPanelRoute>
                    }
                >
                    <Route index element={<Navigate to="visaoGeral" replace />} />
                    <Route path="visaoGeral" element={<VisaoGeralPage />} />
                    <Route path="calendario" element={<CalendarioPage />} />
                    <Route path="clientes" element={<ClientesPage />} />
                    <Route path="clientes/:clienteId" element={<ClienteDetailPage />} />
                    <Route path="servicos" element={<ServicosPage />} />
                    <Route path="horarios" element={<HorariosPage />} />
                    <Route path="personalizacao" element={<PersonalizacaoPage />} />
                    <Route path="configuracoes" element={<ConfiguracoesPage />} />
                    <Route path="assinatura" element={<AssinaturaPage />} />
                    <Route path="marketing" element={<MarketingPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

export default App;
