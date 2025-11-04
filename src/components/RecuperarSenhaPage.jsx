// frontend/src/pages/painel/RecuperarSenhaPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/firebaseConfig'; // Importa seu objeto auth
import toast from 'react-hot-toast';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

const CIANO_COLOR_BG = 'bg-cyan-800';
const CIANO_COLOR_BG_HOVER = 'hover:bg-cyan-900';
const CIANO_RING_FOCUS = 'focus:ring-cyan-400';

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

function RecuperarSenhaPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!email.trim()) {
            toast.error("Por favor, insira seu e-mail.");
            setLoading(false);
            return;
        }

        try {
            // Chama a função nativa do Firebase para envio do e-mail
            await sendPasswordResetEmail(auth, email.trim());

            // MUDANÇA: A mensagem agora instrui o cliente a checar o spam.
            toast.success("Link de redefinição enviado! Verifique sua caixa de entrada (e a pasta SPAM, por via das dúvidas!).");

            // Redireciona o usuário de volta para a página de login
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (error) {
            // Trata erros comuns do Firebase
            let errorMessage = "Erro ao enviar. Tente novamente.";
            if (error.code === 'auth/user-not-found') {
                errorMessage = "E-mail não encontrado. Verifique se digitou corretamente.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "E-mail inválido.";
            }
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Esqueceu a Senha?</h2>
                <p className="text-gray-600 mb-6">
                    Enviaremos um link seguro para o seu e-mail para redefinição.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Campo E-mail */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                        <div className="relative">
                            <Icon icon={Mail} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg h-10 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} focus:border-cyan-500`}
                                disabled={loading}
                                required
                            />
                        </div>
                    </div>

                    {/* Botão de Envio */}
                    <button
                        type="submit"
                        className={`w-full flex items-center justify-center px-4 py-3 text-white rounded-lg font-semibold shadow-md ${CIANO_COLOR_BG} ${CIANO_COLOR_BG_HOVER} transition-colors disabled:opacity-50`}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Icon icon={Mail} className="w-5 h-5 mr-2" />}
                        {loading ? 'Enviando...' : 'Redefinir Senha'}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <Link to="/login" className="inline-flex items-center text-sm text-gray-600 hover:text-cyan-700 transition-colors">
                        <Icon icon={ArrowLeft} className="w-4 h-4 mr-1" /> Voltar para o Login
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default RecuperarSenhaPage;