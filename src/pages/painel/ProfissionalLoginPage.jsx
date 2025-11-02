// frontend/src/pages/painel/ProfissionalLoginPage.jsx
import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from "firebase/auth";
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '@/firebaseConfig';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';
import axios from 'axios';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { Loader2 } from 'lucide-react';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// <<< DEFINIÇÕES DE COR >>>
const CIANO_COLOR_TEXT = 'text-cyan-600';
const CIANO_COLOR_BG = 'bg-cyan-800';
const CIANO_COLOR_BG_HOVER = 'hover:bg-cyan-700';
const CIANO_RING_FOCUS = 'focus:ring-cyan-400';
const CIANO_BORDER_FOCUS = 'focus:border-cyan-400';

// Helper Ícone Simples
const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

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

    // --- <<< CORREÇÃO CRÍTICA AQUI >>> ---
    const getSalaoIdAndRedirect = async (user) => {
        const token = await user.getIdToken();
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/user/salao-id`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const realSalaoId = response.data.salao_id;

            // Pega o 'from' do state (pode ser um objeto ou uma string)
            const fromLocation = location.state?.from;
            let fromPath = null;

            // Verifica o tipo de 'fromLocation'
            if (fromLocation) {
                if (typeof fromLocation === 'string') {
                    // Formato CORRETO (string pura, vindo do App.jsx corrigido)
                    fromPath = fromLocation;
                } else if (typeof fromLocation === 'object' && fromLocation.pathname) {
                    // Formato ANTIGO (objeto, vindo de um App.jsx antigo)
                    fromPath = fromLocation.pathname;
                }
            }

            // Agora, 'fromPath' é garantido como string ou null, e .startsWith() vai funcionar
            if (fromPath && fromPath.startsWith('/painel/') && fromPath.includes(realSalaoId)) {
                navigate(fromPath, { replace: true });
                return;
            }
            
            // Se não, redireciona para o VisaoGeral padrão
            const redirectPath = `/painel/${realSalaoId}/visaoGeral`;
            console.log(`Login Profissional Sucedido. Redirecionando para: ${redirectPath}`);
            navigate(redirectPath, { replace: true });

        } catch (apiError) {
            console.error("Erro ao buscar ID do Salão:", apiError);
            await auth.signOut();
            setError(apiError.response?.data?.detail || "Erro ao conectar conta. Verifique seu cadastro no Horalis.");
        }
    };
    // --- <<< FIM DA CORREÇÃO >>> ---

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await getSalaoIdAndRedirect(userCredential.user); // Chama a função corrigida
        } catch (err) {
            console.error("Erro no login:", err.code, err.message);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError("E-mail ou senha inválidos.");
            } else {
                setError("Ocorreu um erro ao fazer login.");
            }
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md" data-aos="fade-up">

                {/* 1. Logo Horalis */}
                <div className="text-center mb-8">
                    <Link to="/">
                        <h1 className={`text-4xl font-bold text-gray-900`}>
                            Horalis
                        </h1>
                    </Link>
                    <p className="text-gray-600 mt-2">Acesso ao Painel do Profissional</p>
                </div>

                {/* 2. O Card Branco */}
                <div className="bg-white p-8 shadow-lg border border-gray-200 rounded-xl">
                    <form onSubmit={handleLogin} className="space-y-6">

                        {/* 3. Campo Email */}
                        <div className="space-y-1">
                            <label htmlFor="email" className="text-sm font-medium text-gray-700">E-mail</label>
                            <div className="relative">
                                <Icon icon={Mail} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="seuemail@salao.com"
                                    required
                                    className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg h-11 focus:outline-none focus:ring-2 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* 4. Campo Senha */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label htmlFor="password" className="text-sm font-medium text-gray-700">Senha</label>
                                <Link to="/esqueci-senha"
                                    className={`text-xs font-medium ${CIANO_COLOR_TEXT} hover:underline`}
                                >
                                    Esqueceu a senha?
                                </Link>
                            </div>
                            <div className="relative">
                                <Icon icon={Lock} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg h-11 focus:outline-none focus:ring-2 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* 5. Erro */}
                        {error && (
                            <div className="p-3 bg-red-100 border border-red-200 rounded-md text-center">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {/* 6. Botão */}
                        <button
                            type="submit"
                            className={`w-full h-11 flex items-center justify-center text-base font-semibold text-white ${CIANO_COLOR_BG} rounded-lg shadow-sm ${CIANO_COLOR_BG_HOVER} transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-70`}
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
                    </form>
                </div>
            </div>

            {/* 8. Footer */}
            <footer className="w-full text-center p-6 mt-8 text-xs text-gray-500">
                © {new Date().getFullYear()} Horalis. Todos os direitos reservados.
            </footer>
        </div>
    );
}

export default ProfissionalLoginPage;