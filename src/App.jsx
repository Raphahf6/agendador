// frontend/src/App.jsx (Definindo as Sub-rotas do Painel)
import React, { useState, useEffect, useCallback } from 'react';
// Imports do React Router
import { Routes, Route, useParams, Navigate, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
// Imports dos Componentes de Agendamento
import ServiceList from './components/ServiceList';
import AppointmentScheduler from './components/AppointmentScheduler';
import ConfirmationPage from './components/ConfirmationPage';
import HoralisCalendar from './components/HoralisCalendar';
// Imports da Landing Page
import { LandingPage } from './pages/LandingPage';
import { ImageWithFallback } from '@/ui/ImageWithFallback';

// --- Imports do NOVO PAINEL ---
import PainelLayout from './pages/painel/PainelLayout';
import VisaoGeral from './pages/painel/VisaoGeral';
import CalendarioPage from './pages/painel/CalendarioPage';
import ServicosPage from './pages/painel/ServicosPage';
import PersonalizacaoPage from './pages/painel/PersonalizacaoPage';
import ConfiguracoesPage from './pages/painel/ConfiguracoesPage';
import ProfissionalLoginPage from './pages/painel/ProfissionalLoginPage'; // <<< NOVO IMPORT
import ProfissionalSignupPage from './pages/painel/ProfissionalSignupPage'; // <<< NOVO IMPORT
import { onAuthStateChanged, signOut } from "firebase/auth"; // Imports do Firebase Auth
import { auth } from './firebaseConfig';
import { useRef } from 'react';
import HorariosPage from './pages/painel/HorariosPage';
// --- FIM DOS NOVOS IMPORTS ---

// --- Componente SalonScheduler (COMPLETO e SEM 'user') ---
// Esta função permanece exatamente como estava (controla o /agendar/:salaoId)

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
        // Passamos a URL atual (/painel/:salaoId/...) para voltar depois
        return <Navigate
            to={`/painel/${salaoId}/login`} // Redireciona para o login ESPECÍFICO do painel
            state={{ from: location }} // Guarda a URL completa para redirecionar
            replace
        />;
    }

    // 3. Logado, mas o UID NÃO BATE com o salaoId da URL
    // NOTE: No futuro, a lógica aqui deve verificar se o user.uid do Firebase
    // corresponde ao salaoId, ou se ele é o Super Admin. Por enquanto, assumimos que se 
    // ele está logado, ele pode ver o painel.
    // if (user.email !== `${salaoId}@example.com`) { ... }

    // 4. Se logado, renderiza o componente filho.
    return children;
}

function SalonScheduler() {
    const { salaoId } = useParams();
    const [selectedService, setSelectedService] = useState(null);
    const [appointmentConfirmed, setAppointmentConfirmed] = useState(null);
    const [salonDetails, setSalonDetails] = useState({
        nome_salao: '', tagline: '', url_logo: '',
        cor_primaria: '#6366F1', cor_secundaria: '#EC4899',
        cor_gradiente_inicio: '#F3E8FF',
        cor_gradiente_fim: '#FFFFFF'
    });
    const [loadingSalonData, setLoadingSalonData] = useState(true);
    const [errorSalon, setErrorSalon] = useState(null);

    // --- Funções Handle (Completas) ---
    const handleDataLoaded = useCallback((details, error = null) => {
        setLoadingSalonData(false);
        if (error) {
            setErrorSalon(error);
            setSalonDetails(prevDetails => ({
                ...prevDetails, nome_salao: 'Erro ao Carregar', tagline: '', url_logo: '',
            }));
        } else if (details && typeof details === 'object') {
            setSalonDetails(prevDetails => ({ ...prevDetails, ...details }));
            setErrorSalon(null);
        } else {
            console.error("handleDataLoaded: Detalhes inválidos recebidos!", details);
            setErrorSalon("Erro inesperado ao processar dados.");
            setSalonDetails(prevDetails => ({ ...prevDetails, nome_salao: 'Erro Inesperado' }));
        }
    }, []);

    const handleServiceSelect = useCallback((service) => {
        setSelectedService(service);
        setAppointmentConfirmed(null);
        window.scrollTo(0, 0);
    }, []);

    const handleAppointmentSuccess = useCallback((details) => {
        setAppointmentConfirmed(details);
        setSelectedService(null);
        window.scrollTo(0, 0);
    }, []);

    const handleGoBackHome = useCallback(() => {
        setAppointmentConfirmed(null);
        setSelectedService(null);
    }, []);

    const handleBackFromScheduler = useCallback(() => {
        setSelectedService(null);
    }, []);
    // --- Fim das Funções Handle ---

    if (!salaoId) {
        return <p className="p-4 text-center text-red-600">ID do Salão inválido na URL.</p>;
    }

    // --- Lógica de Renderização ---
    const renderContent = () => {
        const styleProps = { styleOptions: salonDetails };
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
                {...styleProps}
            />;
        }
        if (selectedService) {
            return <AppointmentScheduler
                salaoId={salaoId}
                selectedService={selectedService}
                onAppointmentSuccess={handleAppointmentSuccess}
                {...styleProps}
            />;
        }
        return <ServiceList
            salaoId={salaoId}
            onDataLoaded={handleDataLoaded}
            onServiceClick={handleServiceSelect}
        />;
    };

    // --- Estilo de Fundo ---
    const backgroundStyle = {
        background: `linear-gradient(to bottom right, ${salonDetails.cor_gradiente_inicio}10, ${salonDetails.cor_gradiente_fim}10)`,
        minHeight: '100vh',
    };

    // --- RETURN Principal do SalonScheduler ---
    return (
        <div style={backgroundStyle} className="w-full font-sans flex flex-col">

            {!appointmentConfirmed && (
                <header className="pt-8 pb-6 px-4 text-center relative">
                    {selectedService && (
                        <div className="absolute top-4 left-2 z-10">
                            <button onClick={handleBackFromScheduler} className="text-gray-600 hover:text-gray-900 font-medium flex items-center p-2 rounded transition-colors hover:bg-white/30 text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                Voltar
                            </button>
                        </div>
                    )}
                    {!selectedService && !loadingSalonData && !errorSalon && (
                        <div className="flex flex-col items-center">
                            {salonDetails.url_logo && (<ImageWithFallback alt={salonDetails.nome_salao} src={salonDetails.url_logo} className="w-20 h-20 rounded-full mb-4 border-2 border-white shadow-lg object-cover" />)}
                            <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r bg-clip-text text-transparent tracking-tight" style={{ backgroundImage: `linear-gradient(to right, ${salonDetails.cor_primaria}, ${salonDetails.cor_secundaria})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} > {salonDetails.nome_salao} </h1>
                            <p className="text-base text-gray-600 font-light mb-8"> {salonDetails.tagline} </p>
                            <div className="w-full px-2">
                                <h2 className="text-lg text-gray-800 mb-2 text-left font-semibold"> Selecione um Serviço </h2>
                                <p className="text-sm text-gray-600 mb-4 text-left font-light"> Escolha o serviço desejado para agendar </p>
                            </div>
                        </div>
                    )}
                    {loadingSalonData && !errorSalon && !selectedService && (<p className="text-gray-600 animate-pulse">Carregando dados do salão...</p>)}
                    {errorSalon && !selectedService && (<p className="text-red-600">Erro ao carregar dados do salão.</p>)}
                    {selectedService && !appointmentConfirmed && (
                        <h1 className="text-2xl font-bold text-center pt-2 bg-gradient-to-r bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${salonDetails.cor_primaria}, ${salonDetails.cor_secundaria})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} >
                            Agendar: {selectedService.nome_servico}
                        </h1>
                    )}
                </header>
            )}

            <main className={`flex-grow ${!appointmentConfirmed ? "px-4" : ""}`}>
                {renderContent()}
            </main>
            {!appointmentConfirmed && !selectedService && !loadingSalonData && !errorSalon && (
                <footer className="w-full text-center px-4 py-6 mt-auto">
                    <p className="text-xs text-gray-500">
                        © {new Date().getFullYear()} Horalis. Todos os direitos reservados.
                    </p>
                </footer>
            )}
        </div>
    );
} // Fim do SalonScheduler


function App() {
    return (
        <div className="relative min-h-screen">

            <Routes>
                {/* Rota da Landing Page */}
                <Route path="/" element={<LandingPage />} />

                {/* --- ROTAS DE AUTENTICAÇÃO PÚBLICA (Fora do /painel) --- */}
                {/* O Login do Profissional agora está em /login */}
                <Route path="/login" element={<ProfissionalLoginPage />} />
                {/* O Cadastro do Profissional agora está em /cadastro */}
                <Route path="/cadastro" element={<ProfissionalSignupPage />} />

                {/* Rota de Agendamento (Para o cliente final) */}
                <Route path="/agendar/:salaoId" element={<SalonScheduler />} />

                {/* --- ROTA DO PAINEL PROTEGIDA (Pai) --- */}
                {/* Removido o login e cadastro daqui. Se não estiver logado, o ProtectedRoute interno irá redirecionar para /login */}
                <Route path="/painel/:salaoId" element={<PainelLayout />}>
                    {/* SUB-ROTAS (Renderizadas dentro do PainelLayout) */}
                    {/* Estas rotas agora são /painel/:salaoId/calendario */}
                    <Route index element={<Navigate to="calendario" replace />} />
                    <Route path="calendario" element={<CalendarioPage />} />
                    <Route path="servicos" element={<ServicosPage />} />
                    <Route path="horarios" element={ <HorariosPage /> } />
                    <Route path="personalizacao" element={<PersonalizacaoPage />} />
                    <Route path="configuracoes" element={<ConfiguracoesPage />} />

                    {/* Rotas de Autenticação Aninhadas REMOVIDAS daqui: */}
                    {/* <Route path="login" element={<ProfissionalLoginPage />} /> */}
                    {/* <Route path="cadastro" element={<ProfissionalSignupPage />} /> */}
                </Route>
                {/* --- FIM DA ROTA DO PAINEL PROTEGIDA --- */}

                {/* Rota Curinga */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
} // Fim do App

export default App;