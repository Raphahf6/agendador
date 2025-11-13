import React, { useState, useEffect, createContext, useContext } from 'react';
import { NavLink, Outlet, useLocation, useParams, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import {
    Calendar, Settings, Scissors, Palette, Menu, LogOut, X, TimerIcon,
    BarChart2, CreditCard, Users, Send, Loader2, ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from '@/firebaseConfig';
import toast from 'react-hot-toast';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- 1. CONTEXTO GLOBAL (MANTIDO) ---
const SalonContext = createContext({
    salonDetails: null,
    loading: true,
    error: null,
    salaoId: null
});

export const useSalon = () => useContext(SalonContext);

// --- 2. PROVEDOR (MANTIDO E OTIMIZADO) ---
function SalonProvider({ children }) {
    const { salaoId } = useParams();
    const [salonDetails, setSalonDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const primaryColorHex = '#00ACC1'; // Default fallback

    useEffect(() => {
        if (!salaoId) {
            setError("ID do salão não fornecido.");
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                navigate('/login', { replace: true });
                return;
            }

            try {
                const token = await user.getIdToken();
                const response = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data && response.data.nome_salao) {
                    setSalonDetails(response.data);
                    setError(null);
                } else {
                    throw new Error("Dados incompletos.");
                }
            } catch (err) {
                console.error("Erro Load:", err);
                if (err.response?.status === 403) navigate(`/painel/${salaoId}/assinatura`);
                else if (err.response?.status === 401) signOut(auth);
                else setError("Erro ao carregar dados.");
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [salaoId, navigate]);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-cyan-600" /></div>;
    if (error) return <div className="min-h-screen flex items-center justify-center bg-red-50 text-red-600 p-4">{error}</div>;

    return <SalonContext.Provider value={{ salonDetails, loading: false, error: null, salaoId, primaryColorHex }}>{children}</SalonContext.Provider>;
}

// --- ITEM DE NAVEGAÇÃO (COMPONENTIZADO) ---
const NavItem = ({ to, icon: Icon, label, onClick }) => (
    <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) => cn(
            "group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 mx-3 mb-1",
            isActive 
                ? "bg-cyan-500/10 text-cyan-400" 
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
        )}
    >
        {({ isActive }) => (
            <>
                <Icon className={cn("w-5 h-5 mr-3 transition-colors", isActive ? "text-cyan-400" : "text-gray-500 group-hover:text-white")} />
                <span className="flex-1">{label}</span>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />}
            </>
        )}
    </NavLink>
);

const navigation = [
    { name: 'Visão Geral', href: 'visaoGeral', icon: BarChart2 },
    { name: 'Calendário', href: 'calendario', icon: Calendar },
    { name: 'Meus Serviços', href: 'servicos', icon: Scissors },
    { name: 'Meus Clientes', href: 'clientes', icon: Users },
    { name: 'Marketing', href: 'marketing', icon: Send },
    { name: 'Horários', href: 'horarios', icon: TimerIcon },
    { name: 'Personalização', href: 'personalizacao', icon: Palette },
    { name: 'Assinatura', href: 'assinatura', icon: CreditCard },
    { name: 'Configurações', href: 'configuracoes', icon: Settings },
];

// --- COMPONENTE DE LAYOUT VISUAL ---
function PainelLayoutComponent() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { salaoId, salonDetails } = useSalon();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    // Conteúdo da Sidebar (Reutilizável)
    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-[#111827] text-white border-r border-gray-800">
            {/* Header Sidebar */}
            <div className="flex items-center h-20 px-6 border-b border-gray-800">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                        Hora<span className="text-cyan-400"> lis</span>
                    </h1>
                    <p className="text-xs text-gray-500 truncate max-w-[180px] mt-0.5">
                        {salonDetails?.nome_salao}
                    </p>
                </div>
            </div>

            {/* Links de Navegação (Scrollável) */}
            <nav className="flex-1 overflow-y-auto py-6 custom-scrollbar">
                {navigation.map((item) => (
                    <NavItem 
                        key={item.name} 
                        to={`/painel/${salaoId}/${item.href}`} 
                        icon={item.icon} 
                        label={item.name} 
                        onClick={() => setMobileMenuOpen(false)} // Fecha menu no mobile ao clicar
                    />
                ))}
            </nav>

            {/* Footer Sidebar */}
            <div className="p-4 border-t border-gray-800 bg-[#0f1623]">
                <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-400 rounded-xl hover:bg-red-500/10 transition-colors"
                >
                    <LogOut className="w-5 h-5 mr-3" />
                    Sair do Sistema
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex">
            
            {/* 1. SIDEBAR DESKTOP (Fixa e sempre visível em telas grandes) */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col z-50">
                <SidebarContent />
            </div>

            {/* 2. SIDEBAR MOBILE (Drawer/Gaveta) */}
            {/* Overlay Escuro */}
            {mobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-[60] lg:hidden transition-opacity"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Menu Deslizante */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-[70] w-72 bg-[#111827] transform transition-transform duration-300 ease-in-out lg:hidden shadow-2xl",
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <SidebarContent />
                {/* Botão fechar no mobile */}
                <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-white/10 rounded-full"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* 3. ÁREA DE CONTEÚDO PRINCIPAL */}
            <div className="flex-1 flex flex-col lg:pl-64 min-h-screen transition-all duration-300">
                
                {/* Header Mobile (Apenas aparece em telas pequenas) */}
                <header className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm lg:hidden">
                    <button 
                        type="button" 
                        className="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 lg:hidden"
                        onClick={() => setMobileMenuOpen(true)}
                    >
                        <span className="sr-only">Abrir menu</span>
                        <Menu className="h-6 w-6" aria-hidden="true" />
                    </button>
                    <span className="text-lg font-bold text-gray-900">Hora<span className="text-cyan-600">lis</span></span>
                </header>

                {/* Conteúdo da Página (Outlet) */}
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