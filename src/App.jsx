import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useParams, Navigate, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from './firebaseConfig';
import { Toaster } from 'react-hot-toast';
// Axios é necessário para a requisição, mas não é usado diretamente neste arquivo pai
import HandleAuthActions from './components/HandleAuthActions';
import ResetarSenhaPage from './components/ResetarSenhaPage';

// Imports dos Componentes de Agendamento
import ServiceList from './components/ServiceList';
import AppointmentScheduler from './components/AppointmentScheduler';
import ConfirmationPage from './components/ConfirmationPage';
import HoralisCalendar from './components/HoralisCalendar';
import RecuperarSenhaPage from './components/RecuperarSenhaPage';

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
import { SalonMicrosite } from './components/SalonMicrosite';
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
                <HourglassLoading message="Verificando autenticação..."/>
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
                <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
                <Route path="/auth/actions" element={<HandleAuthActions />} />
                <Route path="/resetar-senha" element={<ResetarSenhaPage />} />

                {/* Rota de Agendamento (Pública) */}
                <Route path="/agendar/:salaoId" element={<SalonMicrosite/>} />

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
