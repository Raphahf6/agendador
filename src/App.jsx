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
import { ArrowLeft } from 'lucide-react';

// --- Imports do NOVO PAINEL ---
import PainelLayout from './pages/painel/PainelLayout';
import VisaoGeral from './pages/painel/VisaoGeralPage';
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
import { Toaster } from 'react-hot-toast';
import VisaoGeralPage from './pages/painel/VisaoGeralPage';
import AssinaturaPage from './pages/painel/AssinaturaPage';
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

const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

function SalonScheduler() {
    const { salaoId } = useParams();
    const [selectedService, setSelectedService] = useState(null);
    const [appointmentConfirmed, setAppointmentConfirmed] = useState(null);
    // <<< ALTERADO: Removidas cores dinâmicas do estado inicial >>>
    const [salonDetails, setSalonDetails] = useState({
        nome_salao: '', tagline: '', url_logo: ''
        // Cores Ciano/Branco/Cinza serão aplicadas diretamente nos componentes
    });
    const [loadingSalonData, setLoadingSalonData] = useState(true);
    const [errorSalon, setErrorSalon] = useState(null);
    const navigate = useNavigate(); // Para navegação programática

    // --- Funções Handle (sem alteração na lógica interna) ---
    const handleDataLoaded = useCallback((details, error = null) => {
        setLoadingSalonData(false);
        if (error) {
            setErrorSalon(error);
            setSalonDetails(prev => ({ ...prev, nome_salao: 'Erro ao Carregar' }));
        } else if (details && typeof details === 'object') {
            // Apenas atualiza os dados básicos, não mais as cores
            setSalonDetails(prev => ({
                ...prev,
                nome_salao: details.nome_salao,
                tagline: details.tagline,
                url_logo: details.url_logo
            }));
            setErrorSalon(null);
        } else {
            console.error("handleDataLoaded: Detalhes inválidos!", details);
            setErrorSalon("Erro inesperado.");
            setSalonDetails(prev => ({ ...prev, nome_salao: 'Erro' }));
        }
    }, []);

    const handleServiceSelect = useCallback((service) => {
        setSelectedService(service);
        setAppointmentConfirmed(null);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll suave
    }, []);

    const handleAppointmentSuccess = useCallback((details) => {
        setAppointmentConfirmed(details);
        setSelectedService(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleGoBackHome = useCallback(() => {
        setAppointmentConfirmed(null);
        setSelectedService(null);
        // Opcional: navegar para algum lugar específico ou apenas resetar o estado
    }, []);

    const handleBackFromScheduler = useCallback(() => {
        setSelectedService(null);
        // Opcional: scroll suave de volta para a lista de serviços se necessário
    }, []);
    // --- Fim Funções Handle ---

    if (!salaoId) {
        return <p className="p-4 text-center text-red-600">ID do Salão inválido na URL.</p>;
    }

    // --- Lógica de Renderização (sem alteração interna) ---
    const renderContent = () => {
        // <<< ALTERADO: Remove styleProps de cores dinâmicas >>>
        // Os componentes filhos usarão o tema Ciano diretamente
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
                salonName={salonDetails.nome_salao} // Passa o nome do salão
            />;
        }
        if (selectedService) {
            return <AppointmentScheduler
                salaoId={salaoId}
                selectedService={selectedService}
                onAppointmentSuccess={handleAppointmentSuccess}
                // styleOptions não é mais necessário para cores
            />;
        }
        // Fallback: mostra a lista de serviços se nenhum outro estado for ativo
        return <ServiceList
            salaoId={salaoId}
            onDataLoaded={handleDataLoaded} // Permite recarregar se necessário
            onServiceClick={handleServiceSelect}
        />;
    };

    // --- RETURN Principal ---
    return (
        // <<< ALTERADO: Fundo cinza claro, removido style={backgroundStyle} >>>
        <div className="w-full min-h-screen bg-gray-50 font-sans flex flex-col items-center">

            {/* Container principal para limitar a largura no desktop */}
            <div className="w-full max-w-2xl flex flex-col flex-grow">

                {/* Cabeçalho Condicional */}
                {!appointmentConfirmed && (
                    <header className="pt-8 pb-6 px-4 text-center relative w-full">
                        {/* Botão Voltar (quando serviço selecionado) */}
                        {selectedService && (
                            <div className="absolute top-4 left-2 sm:left-4 z-10"> {/* Ajustado posicionamento */}
                                <button
                                    onClick={handleBackFromScheduler}
                                    className="text-gray-600 hover:text-gray-900 font-medium flex items-center p-2 rounded transition-colors hover:bg-gray-200 text-sm" // Fundo hover mais sutil
                                >
                                    <Icon icon={ArrowLeft} className="h-4 w-4 mr-1"/> {/* Usando Icon helper */}
                                    Voltar
                                </button>
                            </div>
                        )}
                        {/* Detalhes do Salão (quando nenhum serviço selecionado) */}
                        {!selectedService && !loadingSalonData && !errorSalon && (
                            <div className="flex flex-col items-center">
                                {salonDetails.url_logo && (
                                    <img
                                        alt={salonDetails.nome_salao}
                                        src={salonDetails.url_logo}
                                        className="w-20 h-20 rounded-full mb-4 border-2 border-white shadow-md object-cover" // Sombra mais sutil
                                    />
                                )}
                                {/* <<< ALTERADO: Título H1 sem gradiente >>> */}
                                <h1 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">
                                    {salonDetails.nome_salao}
                                </h1>
                                <p className="text-base text-gray-500 font-light mb-6"> {/* Reduzido margin bottom */}
                                    {salonDetails.tagline}
                                </p>
                                {/* Título "Selecione um Serviço" (pode ser movido para ServiceList se preferir) */}
                                <div className="w-full px-2 mt-4"> {/* Adicionado margin top */}
                                    <h2 className="text-1xl font-semibold text-gray-800 text-center mb-2">
                                        Selecione um Serviço
                                    </h2>
                                    <p className="text-sm text-center text-gray-500">
                                        Escolha o serviço desejado para agendar
                                    </p>
                                </div>
                            </div>
                        )}
                        {/* Indicadores de Loading/Erro no Header (simplificados) */}
                        {loadingSalonData && !errorSalon && !selectedService && (<div className="h-28"></div>)/* Espaço reservado */}
                        {errorSalon && !selectedService && (<p className="text-red-600 mt-4">Erro ao carregar.</p>)}
                    </header>
                )}

                {/* Conteúdo Principal (ServiceList, Scheduler ou Confirmation) */}
                <main className={`flex-grow w-full ${!appointmentConfirmed ? "px-4 pb-4" : ""}`}>
                    {renderContent()}
                </main>

                {/* Footer Condicional */}
                {!appointmentConfirmed && !selectedService && !loadingSalonData && !errorSalon && (
                    <footer className="w-full text-center px-4 py-6 mt-auto border-t border-gray-200"> {/* Adicionado border-t */}
                        <p className="text-xs text-gray-500">
                            © {new Date().getFullYear()} Horalis. Todos os direitos reservados.
                        </p>
                    </footer>
                )}
            </div>
        </div>
    );
}


function App() {
    return (
        <div className="relative min-h-screen">

            {/* --- ADIÇÃO DO TOASTER --- */}
           {/* Este componente renderiza os pop-ups de notificação */}
           <Toaster 
                position="top-right" // Posição
                reverseOrder={false}
                toastOptions={{
                    duration: 5000, // Duração de 5 segundos
                    style: {
                        background: '#333',
                        color: '#fff',
                    },
                }}
           />
           {/* --- FIM DA ADIÇÃO --- */}

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
                    <Route index element={<Navigate to="visaoGeral" replace />} />
                    <Route path="visaoGeral" element={<VisaoGeralPage />} />
                    <Route path="calendario" element={<CalendarioPage />} />
                    <Route path="servicos" element={<ServicosPage />} />
                    <Route path="horarios" element={<HorariosPage />} />
                    <Route path="personalizacao" element={<PersonalizacaoPage />} />
                    <Route path="configuracoes" element={<ConfiguracoesPage />} />
                    <Route path="assinatura" element={<AssinaturaPage />} />

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