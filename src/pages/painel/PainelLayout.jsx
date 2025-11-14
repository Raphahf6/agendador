import React, { useState, useEffect, createContext, useContext } from 'react';
import { NavLink, Outlet, useLocation, useParams, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import {
    Calendar, Settings, Scissors, Palette, Menu, LogOut, X, TimerIcon,
    BarChart2, CreditCard, Users, Send, Loader2, CirclePercent, Boxes, 
    UsersIcon, CalendarDays, HelpCircle, ExternalLink
} from 'lucide-react';
import axios from 'axios';
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from '@/firebaseConfig';
import toast from 'react-hot-toast';
import { isAfter, parseISO } from 'date-fns';
import Joyride, { STATUS } from 'react-joyride';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- CONTEXTO ---
const SalonContext = createContext({
    salonDetails: null,
    loading: true,
    error: null,
    salaoId: null
});

export const useSalon = () => useContext(SalonContext);

// --- NAVEGAÇÃO (Definida fora para ser estática) ---
const navigation = [
    { name: 'Dashboard', href: 'visaoGeral', icon: BarChart2, tourClass: 'tour-dashboard' },
    { name: 'Calendário', href: 'calendario', icon: Calendar, tourClass: 'tour-calendario' },
    { name: 'Meus Serviços', href: 'servicos', icon: Scissors, tourClass: 'tour-servicos' },
    { name: 'Minha Equipe', href: 'equipe', icon: UsersIcon, tourClass: 'tour-equipe' },
    { name: 'Agendamentos', href: 'agendamentos', icon: CalendarDays, tourClass: 'tour-agendamentos' },
    { name: 'Meus Clientes', href: 'clientes', icon: Users, tourClass: 'tour-clientes' },
    { name: 'Financeiro', href: 'financeiro', icon: CirclePercent, tourClass: 'tour-financeiro' },
    { name: 'Estoque', href: 'estoque', icon: Boxes, tourClass: 'tour-estoque' },
    { name: 'Marketing', href: 'marketing', icon: Send, tourClass: 'tour-marketing' },
    { name: 'Horários', href: 'horarios', icon: TimerIcon, tourClass: 'tour-horarios' },
    { name: 'Personalização', href: 'personalizacao', icon: Palette, tourClass: 'tour-personalizacao' },
    { name: 'Assinatura', href: 'assinatura', icon: CreditCard, tourClass: 'tour-assinatura' },
    { name: 'Configurações', href: 'configuracoes', icon: Settings, tourClass: 'tour-configuracoes' },
];

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// --- PROVEDOR ---
function SalonProvider({ children }) {
    const { salaoId } = useParams();
    const [salonDetails, setSalonDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const primaryColorHex = '#00ACC1';

    useEffect(() => {
        if (!salaoId) { setError("ID do salão não fornecido."); setLoading(false); return; }
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) { navigate('/login', { replace: true }); return; }
            try {
                const token = await user.getIdToken();
                const response = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, { headers: { Authorization: `Bearer ${token}` } });
                if (response.data) { setSalonDetails(response.data); setError(null); } 
                else throw new Error("Dados incompletos.");
            } catch (err) {
                if (err.response?.status === 401) signOut(auth);
                else setError("Erro ao carregar dados.");
            } finally { setLoading(false); }
        });
        return () => unsubscribe();
    }, [salaoId, navigate]);

    if (loading || !salonDetails) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-cyan-600" /></div>;
    if (error) return <div className="min-h-screen flex items-center justify-center bg-red-50 text-red-600 p-4">{error}</div>;

    return <SalonContext.Provider value={{ salonDetails, loading: false, error: null, salaoId, primaryColorHex }}>{children}</SalonContext.Provider>;
}

// --- 🌟 COMPONENTE SIDEBAR ISOLADO (CORREÇÃO CRÍTICA) 🌟 ---
// Ao tirar de dentro do PainelLayoutComponent, ele não desmonta a cada render.
const Sidebar = ({ salonDetails, salaoId, location, setMobileMenuOpen, runTour, startTourManually, handleLogout }) => {
    return (
        <div className="flex flex-col h-full bg-[#111827] text-white border-r border-gray-800">
            <div className="flex items-center h-20 px-6 border-b border-gray-800">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                        Hora<span className="text-cyan-400">lis</span>
                    </h1>
                    <p className="text-xs text-gray-500 truncate max-w-[180px] mt-0.5">
                        {salonDetails?.nome_salao}
                    </p>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 custom-scrollbar dark-scrollbar">
                {navigation.map((item) => {
                    const isActive = location.pathname.includes(item.href);
                    const targetPath = `/painel/${salaoId}/${item.href}`;
                    
                    return (
                        <NavLink
                            key={item.name}
                            to={targetPath}
                            // Só fecha se o tour NÃO estiver rodando
                            onClick={() => { if (!runTour) setMobileMenuOpen(false); }}
                            className={cn(
                                `group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 mx-3 mb-1 ${item.tourClass}`,
                                isActive 
                                    ? "bg-cyan-500/10 text-cyan-400" 
                                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                            )}
                        >
                            <Icon icon={item.icon} className={cn("w-5 h-5 mr-3 transition-colors", isActive ? "text-cyan-400" : "text-gray-500 group-hover:text-white")} />
                            <span className="flex-1">{item.name}</span>
                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />}
                        </NavLink>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-800 bg-[#0f1623] space-y-3">
                <a 
                    href={`https://horalis.app/agendar/${salaoId}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="tour-meu-site flex items-center justify-center w-full px-4 py-2.5 text-xs font-bold text-cyan-400 border border-cyan-900/50 bg-cyan-900/10 rounded-xl hover:bg-cyan-900/30 transition-all group"
                >
                    <ExternalLink className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" /> Meu Site
                </a>

                <button 
                    onClick={startTourManually}
                    className="tour-ajuda flex items-center justify-center w-full px-4 py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <HelpCircle className="w-4 h-4 mr-2" /> Ajuda / Tour
                </button>

                <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-xs font-medium text-red-400/80 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors">
                    <LogOut className="w-4 h-4 mr-2" /> Sair
                </button>
            </div>
        </div>
    );
};

// --- COMPONENTE DE LAYOUT PRINCIPAL ---
function PainelLayoutComponent() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();
    const { salaoId, salonDetails, primaryColorHex } = useSalon();
    const navigate = useNavigate();
    const [runTour, setRunTour] = useState(false);

    // Estado simples para mobile
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    const startTourManually = () => {
        setRunTour(true);
    };

    // Configuração do Tour
    const steps = [
        {
            target: 'body',
            content: (
                <div className="text-center">
                    <h3 className="font-bold text-lg text-cyan-700 mb-2">Bem-vindo ao Horalis! 🎉</h3>
                    <p>Vamos fazer um tour rápido para você dominar seu novo painel.</p>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        { target: '.tour-dashboard', content: 'Visão geral do seu dia: faturamento e clientes.' },
        { target: '.tour-calendario', content: 'Sua agenda principal. Gerencie todos os horários aqui.' },
        { target: '.tour-servicos', content: 'Cadastre seus serviços e preços.' },
        { target: '.tour-equipe', content: 'Adicione profissionais e seus horários.' },
        { target: '.tour-clientes', content: 'Histórico e CRM dos seus clientes.' },
        { target: '.tour-financeiro', content: 'Registre despesas e veja o lucro líquido.' },
        { target: '.tour-marketing', content: 'Envie e-mails automáticos e campanhas.' },
        { target: '.tour-personalizacao', content: 'Personalize o visual do seu site de agendamento.' },
        { target: '.tour-configuracoes', content: 'Conecte Mercado Pago (PIX) e Google Agenda.' },
        { target: '.tour-meu-site', content: 'Clique aqui para ver seu Site de Agendamento real.' },
        { target: '.tour-ajuda', content: 'Dúvidas? Clique aqui para ver este tour novamente.' }
    ];

    // Iniciar Tour (1ª vez)
    useEffect(() => {
        if (salonDetails && salaoId) {
            const hasSeenTour = localStorage.getItem(`horalis_tour_seen_${salaoId}`);
            if (!hasSeenTour) {
                setTimeout(() => setRunTour(true), 1500);
            }
        }
    }, [salonDetails, salaoId]);

    const handleJoyrideCallback = (data) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setRunTour(false);
            localStorage.setItem(`horalis_tour_seen_${salaoId}`, 'true');
            toast.success("Tour concluído!", { icon: '🚀' });
        }
    };

    // Guarda de Rotas
    useEffect(() => {
        if (!salonDetails) return;
        if (!salonDetails.setupCompleted && !location.pathname.includes('/setup')) {
            navigate(`/painel/${salaoId}/setup`, { replace: true });
            return;
        }
        if (location.pathname.includes('/setup')) return;

        const { subscriptionStatus, trialEndsAt } = salonDetails;
        const now = new Date();
        let isSubscriptionValid = false;
        if (subscriptionStatus === 'active') isSubscriptionValid = true;
        else if (subscriptionStatus === 'trialing' && trialEndsAt) {
            const trialDate = typeof trialEndsAt === 'string' ? parseISO(trialEndsAt) : trialEndsAt;
            if (isAfter(trialDate, now)) isSubscriptionValid = true;
        }

        if (!isSubscriptionValid && !location.pathname.includes('/assinatura')) {
            if (location.pathname !== `/painel/${salaoId}/assinatura`) toast.error("Seu período de teste acabou.", { id: 'trial-expired-toast', duration: 5000 });
            navigate(`/painel/${salaoId}/assinatura`, { replace: true });
        }
    }, [salonDetails, location.pathname, navigate, salaoId]);

    return (
        <div className="min-h-screen bg-gray-50 flex">
            
            <Joyride
                steps={steps}
                run={runTour}
                continuous={true}
                showSkipButton={true}
                showProgress={true}
                callback={handleJoyrideCallback}
                disableOverlayClose={true}
                scrollOffset={100}
                spotlightClicks={false} 
                styles={{
                    options: {
                        primaryColor: primaryColorHex,
                        zIndex: 10000,
                        textColor: '#333',
                        backgroundColor: '#fff',
                    },
                    buttonNext: { backgroundColor: primaryColorHex, color: '#fff', fontWeight: 'bold', borderRadius: '8px' },
                    tooltip: { borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', padding: '20px' }
                }}
                locale={{ back: 'Voltar', close: 'Fechar', last: 'Concluir', next: 'Próximo', skip: 'Pular' }}
            />

            {/* Sidebar Desktop */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col z-50">
                <Sidebar 
                    salonDetails={salonDetails} 
                    salaoId={salaoId} 
                    location={location} 
                    setMobileMenuOpen={setMobileMenuOpen} 
                    runTour={runTour} 
                    startTourManually={startTourManually} 
                    handleLogout={handleLogout} 
                />
            </div>

            {/* Sidebar Mobile (Overlay + Drawer) */}
            {/* Lógica: Se mobileMenuOpen OU se o tour estiver rodando, mostra a sidebar */}
            {(mobileMenuOpen || (isMobile && runTour)) && (
                <div 
                    className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-[60] lg:hidden transition-opacity"
                    // Só fecha se o tour NÃO estiver rodando
                    onClick={() => { if (!runTour) setMobileMenuOpen(false); }}
                />
            )}
            
            <div className={cn(
                "fixed inset-y-0 left-0 z-[70] w-72 bg-[#111827] transform transition-transform duration-300 ease-in-out lg:hidden shadow-2xl",
                (mobileMenuOpen || (isMobile && runTour)) ? "translate-x-0" : "-translate-x-full"
            )}>
                <Sidebar 
                    salonDetails={salonDetails} 
                    salaoId={salaoId} 
                    location={location} 
                    setMobileMenuOpen={setMobileMenuOpen} 
                    runTour={runTour} 
                    startTourManually={startTourManually} 
                    handleLogout={handleLogout} 
                />
                {/* Botão Fechar Mobile: Oculto durante o tour para evitar cliques acidentais */}
                {!runTour && (
                    <button 
                        onClick={() => setMobileMenuOpen(false)}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-white/10 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 flex flex-col lg:pl-64 min-h-screen transition-all duration-300">
                <header className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm lg:hidden">
                    <button type="button" className="-m-2.5 p-2.5 text-gray-700 lg:hidden" onClick={() => setMobileMenuOpen(true)}>
                        <span className="sr-only">Abrir menu</span>
                        <Menu className="h-6 w-6" aria-hidden="true" />
                    </button>
                    <span className="text-lg font-bold text-gray-900">Hora<span className="text-cyan-600">lis</span></span>
                </header>

                <main className="flex-1 py-8">
                    <div className="px-4 sm:px-6 lg:px-8 max-w-8xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}

const PainelLayout = () => (
    <SalonProvider>
        <PainelLayoutComponent />
    </SalonProvider>
);

export default PainelLayout;