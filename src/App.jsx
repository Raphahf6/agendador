// frontend/src/App.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useParams, Navigate, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';

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
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from './firebaseConfig';
import HorariosPage from './pages/painel/HorariosPage';
import { Toaster } from 'react-hot-toast';
import AssinaturaPage from './pages/painel/AssinaturaPage';
import ClientesPage from './pages/painel/ClientesPage';
// --- FIM DOS NOVOS IMPORTS ---

// --- Imports do Mercado Pago ---
import { initMercadoPago } from '@mercadopago/sdk-react';
const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- Rota Protegida (Helper) ---
function ProtectedPanelRoute({ children, user, location }) {
    const { salaoId } = useParams();
    const navigate = useNavigate();

    // 1. Auth ainda carregando? Mostra loading.
    if (user === undefined) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <p className="text-gray-600 animate-pulse">Verificando autenticação...</p>
            </div>
        );
    }

    // 2. Não logado? Redireciona para login
    if (!user) {
        // <<< CORREÇÃO AQUI >>>
        // O estado 'from' deve ser a string do pathname, e não o objeto 'location' inteiro.
        return <Navigate
            to={`/login`}
            state={{ from: location.pathname }} // Passa a STRING do pathname
            replace
        />;
        // <<< FIM DA CORREÇÃO >>>
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
        mp_public_key: null,
        sinal_valor: 0
    });
    const [loadingSalonData, setLoadingSalonData] = useState(true);
    const [errorSalon, setErrorSalon] = useState(null);
    const navigate = useNavigate();

    // Estado de controle do SDK de Pagamento
    const [sdkReady, setSdkReady] = useState(false);

    useEffect(() => {
        // Esta função tenta capturar o ID anti-fraude uma vez
        const captureDeviceId = () => {
            const deviceIdElement = document.querySelector('input[name="__mpoffline_device_id"]');
            if (deviceIdElement && deviceIdElement.value) {
                setDeviceId(deviceIdElement.value);
                console.log("Device ID capturado:", deviceIdElement.value);
                return true;
            }
            return false;
        };

        if (salonDetails.mp_public_key && salonDetails.sinal_valor > 0) {
            // Se o SDK já está inicializado, damos um tempo para o MP carregar o campo no DOM
            const interval = setInterval(() => {
                if (captureDeviceId()) {
                    clearInterval(interval);
                }
            }, 500);
            return () => clearInterval(interval);
        }
    }, [sdkReady, salonDetails.mp_public_key, salonDetails.sinal_valor]);
    // --- Fim da Captura ---

    // --- Funções Handle (Callbacks) ---
    const handleDataLoaded = useCallback((details, error = null) => {
        setLoadingSalonData(false);
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
                mp_public_key: details.mp_public_key,
                sinal_valor: details.sinal_valor
            }));
            setErrorSalon(null);

            // --- INICIALIZAÇÃO DINÂMICA (FLUXO INTELIGENTE) ---
            const key = details.mp_public_key;
            const sinal = details.sinal_valor || 0;

            if (key && sinal > 0) {
                // Tem chave E tem valor de sinal? INICIA O SDK.
                try {
                    console.log("Inicializando MercadoPago SDK com a chave do salão...");
                    initMercadoPago(key, { locale: 'pt-BR' });
                    setSdkReady(true); // Libera o fluxo de pagamento
                } catch (sdkError) {
                    console.error("Erro ao inicializar SDK do MP:", sdkError);
                    setErrorSalon("Erro ao carregar o módulo de pagamento (SDK).");
                    setSdkReady(false);
                }
            } else {
                // Não tem chave ou o sinal é 0? Libera o fluxo gratuito.
                console.log("Chave de pagamento não configurada ou sinal é zero. SDK não iniciado (Modo Gratuito).");
                setSdkReady(true); // Libera a renderização
            }
            // --- FIM DA INICIALIZAÇÃO ---

        } else {
            console.error("handleDataLoaded: Detalhes inválidos!", details);
            setErrorSalon("Erro inesperado.");
            setSdkReady(false);
        }
    }, []);

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

    // --- Lógica de Renderização ---
    const renderContent = () => {
        if (loadingSalonData && !errorSalon) {
            return <ServiceList
                salaoId={salaoId}
                onDataLoaded={handleDataLoaded}
                onServiceClick={handleServiceSelect}
            />;
        }
        if (errorSalon) {
            return <p className="p-4 text-center text-red-600">{errorSalon}</p>;
        }
        if (appointmentConfirmed) {
            return <ConfirmationPage
                appointmentDetails={appointmentConfirmed}
                onGoBack={handleGoBackHome}
                salonName={salonDetails.nome_salao}
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
                    deviceId={deviceId} // <<< PASSA A PROP DEVICE ID
                />;
            } else {
                return (
                    <div className="flex flex-col items-center justify-center p-10">
                        <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
                        <p className="text-gray-600 mt-3">Carregando gateway de pagamento...</p>
                    </div>
                );
            }
        }
        // Fallback: mostra a lista de serviços
        return (


            <ServiceList
                salaoId={salaoId}
                onDataLoaded={handleDataLoaded}
                onServiceClick={handleServiceSelect}
            />

        );
    };




    // --- RETURN Principal ---
    return (
        <div className="w-full min-h-screen bg-gray-50 font-sans flex flex-col items-center">
            <div className="w-full max-w-2xl flex flex-col flex-grow">

                {!appointmentConfirmed && (
                    <header className="pt-8 pb-6 px-4 text-center relative w-full">
                        {selectedService && (
                            <div className="absolute top-4 left-2 sm:left-4 z-10">
                                <button
                                    onClick={handleBackFromScheduler}
                                    className="text-gray-600 hover:text-gray-900 font-medium flex items-center p-2 rounded transition-colors hover:bg-gray-200 text-sm"
                                >
                                    <Icon icon={ArrowLeft} className="h-4 w-4 mr-1" />
                                    Voltar
                                </button>
                            </div>
                        )}
                        {!selectedService && !loadingSalonData && !errorSalon && (
                            <div className="flex flex-col items-center">
                                {salonDetails.url_logo && (
                                    <img
                                        alt={salonDetails.nome_salao}
                                        src={salonDetails.url_logo}
                                        className="w-20 h-20 rounded-full mb-4 border-2 border-white shadow-md object-cover"
                                    />
                                )}
                                <h1 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">
                                    {salonDetails.nome_salao}
                                </h1>
                                <p className="text-base text-gray-500 font-light mb-6">
                                    {salonDetails.tagline}
                                </p>
                                <div className="w-full px-2 mt-4">
                                    <h2 className="text-1xl font-semibold text-gray-800 text-center mb-2">
                                        Selecione um Serviço
                                    </h2>
                                    <p className="text-sm text-center text-gray-500">
                                        Escolha o serviço desejado para agendar
                                    </p>
                                </div>
                            </div>
                        )}
                        {loadingSalonData && !errorSalon && !selectedService && (<div className="h-28"></div>)}
                        {errorSalon && !selectedService && (<p className="text-red-600 mt-4">Erro ao carregar.</p>)}
                    </header>
                )}

                <main className={`flex-grow w-full ${!appointmentConfirmed ? "px-4 pb-4" : ""}`}>
                    {renderContent()}
                </main>

                {!appointmentConfirmed && !selectedService && !loadingSalonData && !errorSalon && (
                    <footer className="w-full text-center px-4 py-6 mt-auto border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                            © {new Date().getFullYear()} Horalis. Todos os direitos reservados.
                        </p>
                    </footer>
                )}
            </div>
        </div>
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