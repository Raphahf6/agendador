import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from "firebase/auth";
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '@/firebaseConfig';
import { Mail, Lock, LogIn, ArrowRight, Loader2 } from 'lucide-react';
import axios from 'axios';
import AOS from 'aos';
import 'aos/dist/aos.css';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- Definições de Cor (Ciano Horalis) ---
const CIANO_COLOR_TEXT = 'text-cyan-600';
const CIANO_COLOR_BG = 'bg-cyan-800';
const CIANO_COLOR_BG_HOVER = 'hover:bg-cyan-700';
const CIANO_RING_FOCUS = 'focus:ring-cyan-400';
const CIANO_BORDER_FOCUS = 'focus:border-cyan-400';

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// --- Imagem de Fundo (Qualidade Premium) ---
const heroImageUrl = "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?q=80&w=2000&auto=format&fit=crop";

function ProfissionalLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        AOS.init({
            duration: 800,
            once: true,
        });
    }, []);

    const getSalaoIdAndRedirect = async (user) => {
        const token = await user.getIdToken();
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/user/salao-id`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const realSalaoId = response.data.salao_id;
            const fromLocation = location.state?.from;
            let fromPath = null;

            if (fromLocation) {
                if (typeof fromLocation === 'string') fromPath = fromLocation;
                else if (typeof fromLocation === 'object' && fromLocation.pathname) fromPath = fromLocation.pathname;
            }

            if (fromPath && fromPath.startsWith('/painel/') && fromPath.includes(realSalaoId)) {
                navigate(fromPath, { replace: true });
                return;
            }
            
            const redirectPath = `/painel/${realSalaoId}/visaoGeral`;
            navigate(redirectPath, { replace: true });
        } catch (apiError) {
            console.error("Erro ao buscar ID do Salão:", apiError);
            await auth.signOut();
            setError(apiError.response?.data?.detail || "Erro ao conectar conta.");
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await getSalaoIdAndRedirect(userCredential.user); 
        } catch (err) {
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError("E-mail ou senha inválidos.");
            } else {
                setError("Ocorreu um erro ao fazer login.");
            }
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-gray-50 flex font-sans">
            
            {/* --- 1. LADO ESQUERDO: IMAGEM E BRANDING (DESKTOP) --- */}
            <div 
                className="hidden lg:flex lg:flex-1 bg-cover bg-center relative" 
                style={{ backgroundImage: `url(${heroImageUrl})` }}
                data-aos="fade-right"
            >
                {/* Overlay Escuro */}
                <div className="absolute inset-0 bg-black opacity-40 z-0"></div>
                
                {/* Conteúdo de Valor */}
                <div className="relative z-10 flex flex-col justify-end p-12 text-white">
                    <h2 className="text-4xl font-bold leading-tight mb-4">
                        A gestão do seu negócio em um só lugar.
                    </h2>
                    <p className="text-lg text-white/80">
                        Horalis transforma sua agenda manual em uma poderosa ferramenta de captação e fidelização.
                    </p>
                </div>
            </div>

            {/* --- 2. LADO DIREITO: FORMULÁRIO DE LOGIN (MOBILE E DESKTOP) --- */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12">
                
                <div className="w-full max-w-md" data-aos="fade-up" data-aos-delay="100">

                    {/* Logo Horalis */}
                    <div className="text-center mb-8">
                        <Link to="/">
                            <h1 className={`text-4xl font-bold text-gray-900`}>
                                Hora<span className={CIANO_COLOR_TEXT}>lis</span>
                            </h1>
                        </Link>
                        <p className="text-gray-600 mt-2 text-sm">Acesso ao Painel do Profissional</p>
                    </div>

                    {/* Card Branco */}
                    <div className="bg-white p-8 shadow-xl border border-gray-100 rounded-2xl">
                        <form onSubmit={handleLogin} className="space-y-6">

                            {/* Campo Email */}
                            <div className="space-y-1">
                                <label htmlFor="email" className="text-sm font-medium text-gray-700">E-mail</label>
                                <div className="relative">
                                    <Icon icon={Mail} className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="email" type="email" placeholder="seuemail@salao.com" required
                                        className={`w-full pl-12 pr-4 py-3 border border-gray-200 bg-gray-50 rounded-lg h-12 focus:outline-none focus:bg-white focus:ring-2 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            {/* Campo Senha */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label htmlFor="password" className="text-sm font-medium text-gray-700">Senha</label>
                                    <Link to="/recuperar-senha" className={`text-xs font-medium ${CIANO_COLOR_TEXT} hover:underline`}>
                                        Esqueceu a senha?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Icon icon={Lock} className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="password" type="password" placeholder="••••••••" required
                                        className={`w-full pl-12 pr-4 py-3 border border-gray-200 bg-gray-50 rounded-lg h-12 focus:outline-none focus:bg-white focus:ring-2 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            {/* Erro */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            {/* Botão Entrar */}
                            <button
                                type="submit"
                                className={`w-full h-12 flex items-center justify-center text-base font-semibold text-white ${CIANO_COLOR_BG} rounded-lg shadow-lg ${CIANO_COLOR_BG_HOVER} transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-70 hover:shadow-cyan-500/30 transform hover:-translate-y-0.5`}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin stroke-current" />
                                ) : (
                                    <>
                                        <Icon icon={LogIn} className="w-5 h-5 mr-2" /> Entrar
                                    </>
                                )}
                            </button>

                            {/* Link de Cadastro */}
                            {/*<div className="text-center pt-4 border-t border-gray-100">
                                <p className="text-sm text-gray-600">
                                    Ainda não tem uma conta? 
                                    <Link to="/cadastro" className={`font-semibold ${CIANO_COLOR_TEXT} hover:underline ml-1`}>
                                        Cadastre-se aqui
                                    </Link>
                                </p>
                            </div>
                            */}

                        </form>
                    </div>
                </div>

                {/* Footer */}
                <footer className="w-full text-center p-6 mt-8 text-xs text-gray-500">
                    © {new Date().getFullYear()} Horalis. Todos os direitos reservados.
                </footer>
            </div>
        </div>
    );
}

export default ProfissionalLoginPage;