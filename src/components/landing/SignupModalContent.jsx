import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from '@/firebaseConfig';
import axios from 'axios';
import { 
    User, Phone, Mail, CreditCard, Lock as LockIcon, 
    ArrowRight, Loader2, X, CheckCircle, AlertTriangle 
} from 'lucide-react';
import toast from 'react-hot-toast';

// O endpoint de registro deve ser ajustado conforme sua rota de backend
const API_BASE_URL = "https://api-agendador-2n55.onrender.com/api/v1";

// --- CONFIGURAÇÕES DE COR E ESTILO ---
const BRAND_NAME = "Horalis";
const PRIMARY_COLOR_TEXT = 'text-cyan-600';
const PRIMARY_BG_CLASS = 'bg-cyan-800';
const PRIMARY_BG_HOVER_CLASS = 'hover:bg-cyan-700';
const FOCUS_RING_CLASS = 'focus:ring-cyan-400';
const FOCUS_BORDER_CLASS = 'focus:border-cyan-400';

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

function SignupModalContent({ closeModal, isModalOpen }) {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Form, 2: Success
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        nomeSalao: '',
        whatsapp: '',
        email: '',
        cpf: '',
        password: '',
        confirmPassword: ''
    });

    const updateFormField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (error) setError(null); // Limpa o erro ao digitar
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);

        // Validação Básica Frontend
        if (formData.password !== formData.confirmPassword) {
            setError("As senhas não coincidem.");
            return;
        }
        if (formData.password.length < 6) {
            setError("A senha deve ter pelo menos 6 caracteres.");
            return;
        }
        // Validação de CPF (básica, sem regex complexo aqui)
        // Permite 000.000.000-00 ou 00000000000
        if (!/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(formData.cpf)) {
            setError("CPF inválido. Use o formato 000.000.000-00 ou apenas números.");
            return;
        }
        // Validação de WhatsApp (apenas números, 11 dígitos para DDD+Número)
        if (!/^\d{11}$/.test(formData.whatsapp.replace(/\D/g, ''))) {
            setError("WhatsApp inválido. Inclua o DDD (ex: 11987654321).");
            return;
        }

        setLoading(true);

        try {
            // 1. Cria usuário no Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            // 2. Atualiza perfil (Nome do Salão como Display Name inicial)
            await updateProfile(user, { displayName: formData.nomeSalao });

            // 3. Obtém Token para autenticar no backend
            const token = await user.getIdToken();

            // 4. Chama Backend para criar o registro no Firestore com Trial
            // O backend deve calcular o `trialEndsAt` automaticamente (now + 7 dias)
            await axios.post(`${API_BASE_URL}/auth/register-owner`, {
                nome_salao: formData.nomeSalao,
                whatsapp: formData.whatsapp.replace(/\D/g, ''), // Envia só números
                email: formData.email,
                cpf: formData.cpf.replace(/\D/g, ''), // Envia só números
                uid: user.uid 
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Sucesso
            setStep(2); // Vai para tela de sucesso
            toast.success("Conta criada com sucesso! Boas-vindas ao Horalis!");

        } catch (err) {
            console.error("Erro no cadastro:", err);
            let msg = "Erro ao criar conta. Tente novamente.";
            if (err.code === 'auth/email-already-in-use') msg = "Este e-mail já está em uso.";
            else if (err.code === 'auth/weak-password') msg = "A senha é muito fraca. Use uma senha mais forte.";
            else if (err.response?.data?.detail) msg = err.response.data.detail; // Erros do backend
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Não renderiza se o modal não estiver aberto
    if (!isModalOpen) return null;

    return (
        // A 'div' que envolve o conteúdo do modal.
        // max-w-lg e mx-auto para centralizar e limitar a largura.
        // p-8 (ou p-6 em mobile) para o padding interno.
        // overflow-y-auto e max-h-[95vh] para permitir rolagem APENAS no modal em si se o conteúdo for grande,
        // mas tentando evitar que isso aconteça com o design atual.
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl relative w-full max-w-lg mx-auto transform scale-100 opacity-100 transition-all duration-300 ease-out 
                    overflow-y-auto max-h-[95vh] flex flex-col">
            <button
                onClick={closeModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10 p-2 rounded-full hover:bg-gray-100"
                aria-label="Fechar"
            >
                <X className="w-6 h-6" />
            </button>

            {/* --- CABEÇALHO --- */}
            <div className="text-center border-b border-gray-100 pb-4 mb-6">
                <h2 className="text-2xl font-extrabold text-gray-900">
                    Cadastre-se no <span className={PRIMARY_COLOR_TEXT}>{BRAND_NAME}</span>
                </h2>
                <p className="text-gray-600 mt-1 text-sm">
                    Sua jornada para um salão mais eficiente começa aqui.
                </p>
            </div>

            {/* --- PASSO 1: FORMULÁRIO --- */}
            {step === 1 && (
                <form onSubmit={handleRegister} className="flex flex-col flex-grow space-y-4">
                    
                    {/* Nome do Salão */}
                    <div className="relative">
                        <label htmlFor="nomeSalao" className="sr-only">Nome do seu Negócio</label>
                        <Icon icon={User} className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                            id="nomeSalao" type="text" placeholder="Nome do seu Negócio" required 
                            className={`w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg h-12 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 ${FOCUS_RING_CLASS} ${FOCUS_BORDER_CLASS} transition-all duration-200`} 
                            value={formData.nomeSalao} onChange={(e) => updateFormField('nomeSalao', e.target.value)} disabled={loading} 
                        />
                    </div>

                    {/* WhatsApp */}
                    <div className="relative">
                        <label htmlFor="whatsapp" className="sr-only">WhatsApp</label>
                        <Icon icon={Phone} className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                            id="whatsapp" type="tel" placeholder="WhatsApp (DDD + Número)" required 
                            className={`w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg h-12 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 ${FOCUS_RING_CLASS} ${FOCUS_BORDER_CLASS} transition-all duration-200`} 
                            value={formData.whatsapp} onChange={(e) => updateFormField('whatsapp', e.target.value)} disabled={loading} 
                        />
                    </div>

                    {/* Email */}
                    <div className="relative">
                        <label htmlFor="email" className="sr-only">Seu Melhor E-mail</label>
                        <Icon icon={Mail} className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                            id="email" type="email" placeholder="Seu Melhor E-mail" required 
                            className={`w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg h-12 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 ${FOCUS_RING_CLASS} ${FOCUS_BORDER_CLASS} transition-all duration-200`} 
                            value={formData.email} onChange={(e) => updateFormField('email', e.target.value)} disabled={loading} 
                        />
                    </div>

                    {/* CPF */}
                    <div className="relative">
                        <label htmlFor="cpf" className="sr-only">CPF</label>
                        <Icon icon={CreditCard} className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                            id="cpf" type="tel" placeholder="CPF" required 
                            className={`w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg h-12 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 ${FOCUS_RING_CLASS} ${FOCUS_BORDER_CLASS} transition-all duration-200`} 
                            value={formData.cpf} onChange={(e) => updateFormField('cpf', e.target.value)} disabled={loading} maxLength={14} 
                        />
                    </div>

                    {/* Senha e Confirmar Senha */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative">
                            <label htmlFor="password" className="sr-only">Senha</label>
                            <Icon icon={LockIcon} className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                                id="password" type="password" placeholder="Senha (Mín. 6 caracteres)" required 
                                className={`w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg h-12 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 ${FOCUS_RING_CLASS} ${FOCUS_BORDER_CLASS} transition-all duration-200`} 
                                value={formData.password} onChange={(e) => updateFormField('password', e.target.value)} disabled={loading} 
                            />
                        </div>
                        <div className="relative">
                            <label htmlFor="confirmPassword" className="sr-only">Confirmar Senha</label>
                            <Icon icon={LockIcon} className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                                id="confirmPassword" type="password" placeholder="Confirmar Senha" required 
                                className={`w-full pl-12 pr-4 py-3 border rounded-lg h-12 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-500 focus:ring-red-400 focus:border-red-500' : `border-gray-300 ${FOCUS_RING_CLASS} ${FOCUS_BORDER_CLASS}`} transition-all duration-200`} 
                                value={formData.confirmPassword} onChange={(e) => updateFormField('confirmPassword', e.target.value)} disabled={loading} 
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm animate-in fade-in">
                            <Icon icon={AlertTriangle} className="w-4 h-4 flex-shrink-0" /> {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className={`w-full h-14 mt-4 flex items-center justify-center text-lg font-bold text-white ${PRIMARY_BG_CLASS} rounded-xl shadow-lg ${PRIMARY_BG_HOVER_CLASS} transition-all transform hover:scale-[1.01] disabled:opacity-70 disabled:hover:scale-100 focus:outline-none focus:ring-2 ${FOCUS_RING_CLASS}`} 
                        disabled={loading}
                    >
                        {loading ? <Icon icon={Loader2} className="w-6 h-6 animate-spin" /> : "Começar Teste Grátis"}
                    </button>
                    
                    <p className="text-center text-xs text-gray-500 mt-4">
                        Ao criar conta, você concorda com nossos Termos de Uso e Política de Privacidade.
                    </p>
                </form>
            )}

            {/* --- PASSO 2: SUCESSO --- */}
            {step === 2 && (
                <div className="text-center py-8 animate-in fade-in zoom-in duration-300 flex-grow flex flex-col justify-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Icon icon={CheckCircle} className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Conta Criada!</h3>
                    <p className="text-gray-600 mb-8 max-w-sm mx-auto">
                        Seu período de teste de 7 dias começou. Aproveite o Horalis Pro e eleve seu negócio!
                    </p>
                    <button
                        onClick={() => { closeModal(); navigate('/login'); }} 
                        className={`w-full h-12 flex items-center justify-center text-base font-bold text-white bg-green-600 rounded-xl shadow-md hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400`}
                    >
                        Acessar meu Painel <Icon icon={ArrowRight} className="w-5 h-5 ml-2" />
                    </button>
                </div>
            )}

            {/* Rodapé Login */}
            {step === 1 && (
                <div className="text-center text-sm text-gray-600 pt-6 border-t border-gray-100 mt-6">
                    Já tem uma conta?{' '}
                    <Link to="/login" className={`font-bold ${PRIMARY_COLOR_TEXT} hover:underline`}>
                        Fazer Login
                    </Link>
                </div>
            )}
        </div>
    );
}

export default SignupModalContent;