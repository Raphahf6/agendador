import React, { useState, useEffect, createContext, useContext } from 'react';
import { NavLink, Outlet, useLocation, useParams, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import {
    Calendar, Settings, Scissors, Palette, Menu, LogOut, X, TimerIcon,
    BarChart2, CreditCard, Users, Send, Loader2
} from 'lucide-react';
import axios from 'axios';
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from '@/firebaseConfig';
import toast from 'react-hot-toast';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// ----------------------------------------------------
// I. PALETA DE CORES (UX Light Theme Ajustada)
// ----------------------------------------------------
const PALETTE = {
    BG_BASE_LIGHT: '#FFFFFF',
    BG_SIDEBAR_DARK: '#111827', 
    TEXT_LIGHT: '#F8FAFC',
    TEXT_SUBTLE: '#9CA3AF', 
    BORDER_DARK: '#374151', 
    BORDER_LIGHT: '#D1D5DB', 
};


// ----------------------------------------------------
// --- CONTEXTO & PROVEDOR (Mantidos) ---
// ----------------------------------------------------
const SalonContext = createContext({
    salonDetails: null,
    loading: true,
    error: null,
    salaoId: null
});

export const useSalon = () => useContext(SalonContext);

function SalonProvider({ children }) {
    const { salaoId } = useParams();
    const [salonDetails, setSalonDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const primaryColorHex = '#00ACC1'; 

    useEffect(() => {
        if (!salaoId) { /* ... (lógica) ... */ return; }
        const unsubscribe = onAuthStateChanged(auth, async (user) => { /* ... (lógica) ... */ });
        return () => unsubscribe();
    }, [salaoId, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: PALETTE.BG_BASE_LIGHT }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColorHex }} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-800 p-4">
                <p className="text-red-100 text-center">{error}</p>
            </div>
        );
    }

    const contextValue = { salonDetails, loading: false, error: null, salaoId, primaryColorHex };
    return (
        <SalonContext.Provider value={contextValue}>
            {children}
        </SalonContext.Provider>
    );
}

// ----------------------------------------------------
// --- FIM DO PROVEDOR ---
// ----------------------------------------------------


const navigation = [
    { name: 'Visão Geral', href: 'visaoGeral', icon: BarChart2 },
    { name: 'Calendário', href: 'calendario', icon: Calendar },
    { name: 'Meus Serviços', href: 'servicos', icon: Scissors },
    { name: 'Meus Clientes', href: 'clientes', icon: Users },
    { name: 'Marketing', href: 'marketing', icon: Send },
    { name: 'Horario de Funcionamento', href: 'horarios', icon: TimerIcon },
    { name: 'Pagina de Agendamento e Personalização', href: 'personalizacao', icon: Palette },
    { name: 'Assinatura', href: 'assinatura', icon: CreditCard },
    { name: 'Configurações', href: 'configuracoes', icon: Settings },
];

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);


function PainelLayoutComponent() {
    const location = useLocation();
    const { salaoId, salonDetails, primaryColorHex } = useSalon();
    const navigate = useNavigate();
    
    const COLLAPSED_WIDTH_CLASS = 'w-20'; // 80px
    const EXPANDED_WIDTH_CLASS = 'w-64'; // 256px
    
    // 🌟 CORREÇÃO FINAL: Usaremos um estado para controlar o colapso
    const [isMobile, setIsMobile] = useState(false); 

    useEffect(() => {
        const checkMobile = () => {
            // Se for maior ou igual a 1024px, NÃO é mobile (False)
            setIsMobile(window.innerWidth < 1024);
        };

        checkMobile(); 
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []); 

    // isCollapsed é TRUE no mobile, FALSE no desktop (largura > 1024px)
    const isCollapsed = isMobile;

    const handleLogout = async () => { /* ... (lógica mantida) ... */ };
    const isCurrent = (pathSuffix) => location.pathname === `/painel/${salaoId}/${pathSuffix}`;
    

    const SidebarContent = ({ isCollapsed }) => (
        <div 
            className="flex flex-col flex-grow overflow-y-auto" 
            style={{ backgroundColor: PALETTE.BG_SIDEBAR_DARK }}
        >
            {/* Logo/Nome (Topo) */}
            <div className="flex items-center flex-shrink-0 px-4 pt-5 pb-4 border-b" style={{ borderColor: PALETTE.BORDER_DARK }}>
                <div className={`flex flex-col overflow-hidden ${isCollapsed ? 'items-center px-0' : 'px-0'}`}>
                    
                    {/* Área do Logo Expandido (Desktop) */}
                    {/* 🌟 AJUSTADO: Se NÃO estiver colapsado (ou seja, desktop), mostra o logo completo */}
                    <div className={`${isCollapsed ? 'hidden' : 'flex flex-col'}`}>
                        <span 
                            className="text-2xl font-extrabold" 
                            style={{ color: PALETTE.TEXT_LIGHT }}
                        >
                            Hora<span className="text-cyan-600"> lis</span>
                        </span>
                        <p 
                            className="text-sm mt-0.5 truncate" 
                            style={{ color: PALETTE.TEXT_SUBTLE }} 
                            title={salonDetails?.nome_salao}
                        >
                            {salonDetails?.nome_salao || 'Carregando...'}
                        </p>
                    </div>

                    {/* ÁREA DO LOGO COLAPSADO (Mobile) */}
                    {/* 🌟 AJUSTADO: Se ESTIVER colapsado (ou seja, mobile), mostra o logo abreviado */}
                    {isCollapsed && (
                        <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white" 
                           
                        >
                             <img src="/favicon.png" alt="Logo" />
                        </div>
                    )}
                </div>
            </div>
            
            {/* Nav Links */}
            <nav className="flex-1 py-6 space-y-2">
                {navigation.map((item) => {
                    const targetPath = `/painel/${salaoId}/${item.href}`;
                    const isActive = isCurrent(item.href);
                    
                    return (
                        <NavLink
                            key={item.name}
                            to={targetPath}
                            className={cn(
                                'group flex items-center py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                                isCollapsed ? 'justify-center px-0 mx-auto w-12' : 'px-3 mx-4' 
                            )}
                            style={{ 
                                color: isActive ? primaryColorHex : PALETTE.TEXT_LIGHT,
                                backgroundColor: isActive ? `${primaryColorHex}1A` : 'transparent', 
                            }}
                        >
                            <Icon 
                                icon={item.icon} 
                                className={`w-6 h-6 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} 
                                style={{ color: isActive ? primaryColorHex : PALETTE.TEXT_SUBTLE }} 
                            />
                            <span className={isCollapsed ? 'sr-only' : 'block'}>
                                {item.name}
                            </span>
                        </NavLink>
                    );
                })}
            </nav>

            {/* Rodapé do Sidebar - Ações do Usuário */}
             <div className="p-4 border-t" style={{ borderColor: PALETTE.BORDER_DARK }}>
                <button
                    onClick={handleLogout}
                    className={cn(
                        "flex items-center w-full py-2 text-sm font-medium rounded-lg transition-colors text-red-500 hover:bg-red-900/20",
                        isCollapsed ? 'justify-center px-0 mx-auto w-12' : 'px-3'
                    )}
                >
                    <Icon icon={LogOut} className={`w-6 h-6 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
                    <span className={isCollapsed ? 'sr-only' : 'block'}>
                        Sair
                    </span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-white text-gray-800">
            
            {/* 🌟 SIDEBAR: Fixa com largura condicional 🌟 */}
            <div 
                // Largura no mobile: w-20. Largura no desktop: lg:w-64
                className={`fixed inset-y-0 left-0 z-30 flex flex-col ${COLLAPSED_WIDTH_CLASS} lg:${EXPANDED_WIDTH_CLASS}`} 
                style={{ borderColor: PALETTE.BORDER_DARK }}
            >
                {/* O isCollapsed é passado para controlar o TEXTO */}
                <SidebarContent isCollapsed={isCollapsed} />
            </div>

            {/* --- Conteúdo Principal --- */}
            <div 
                // Padding esquerdo: pl-20 (mobile) E lg:pl-64 (desktop)
                className="pl-20 lg:pl-64 flex flex-col flex-1 min-h-screen"
            >
                <main className="flex-1">
                    <div className="py-6">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                            <Outlet /> 
                        </div>
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