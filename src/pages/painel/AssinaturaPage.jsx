import React, { useState, useEffect, useCallback } from 'react';
import { auth } from '@/firebaseConfig';
import { differenceInDays, isAfter, parseISO } from 'date-fns';
import { 
    Loader2, AlertTriangle, CheckCircle, CreditCard, Star, 
    Calendar, Link2, Bell, Users, Clock, Check,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import HourglassLoading from '@/components/HourglassLoading';
import { DISPLAY_PRICE_SETUP } from '@/utils/pricing';
import { useSalon } from './PainelLayout'; // Importa o hook do contexto

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// --- 🌟 NOVO: Componente de Benefício Premium ---
const FeatureItem = ({ text, primaryColor }) => (
    <li className="flex items-start gap-3">
        <div 
            className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}1A` }} // 10% Opacidade
        >
            <Icon icon={Check} className="w-3.5 h-3.5" style={{ color: primaryColor }} />
        </div>
        <span className="text-gray-700 text-sm">{text}</span>
    </li>
);

// --- 🌟 NOVO: Componente de Status Premium ---
const StatusCard = ({ statusData, primaryColor }) => {
    if (!statusData) return null;
    const { status, trialEndsAt } = statusData;
    const now = new Date();

    // --- 1. PLANO ATIVO ---
    if (status === 'active') {
        return (
            <div className="p-5 bg-green-50 rounded-2xl border-2 border-green-100 flex items-center gap-4 shadow-sm">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <Icon icon={CheckCircle} className="w-6 h-6 text-green-600" />
                </div>
                <div>
                    <p className="font-bold text-lg text-green-800">Plano Horalis Pro Ativo</p>
                    <p className="text-sm text-green-700">Obrigado por fazer parte da nossa comunidade!</p>
                </div>
            </div>
        );
    }
    
    // --- 2. EM TESTE (TRIAL) ---
    if (status === 'trialing' && trialEndsAt && isAfter(trialEndsAt, now)) {
        const daysLeft = differenceInDays(trialEndsAt, now);
        return (
            <div className="p-5 rounded-2xl border-2 flex items-center gap-4 shadow-sm"
                 style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30` }}>
                <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                    <Icon icon={CreditCard} className="w-6 h-6" style={{ color: primaryColor }} />
                </div>
                <div>
                    <p className="font-bold text-lg" style={{ color: primaryColor }}>Você está no Período de Teste Gratuito</p>
                    <p className="text-sm" style={{ color: primaryColor }}>
                        Você tem <span className="font-bold">{daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}</span> restantes.
                    </p>
                </div>
            </div>
        );
    }
    
    // --- 3. EXPIRADO / PENDENTE ---
    return (
        <div className="p-5 bg-red-50 rounded-2xl border-2 border-red-100 flex items-center gap-4 shadow-sm">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <Icon icon={AlertTriangle} className="w-6 h-6 text-red-600" />
            </div>
            <div>
                <p className="font-bold text-lg text-red-800">
                    {status === 'trialing' ? 'Seu período de teste expirou!' : 'Sua assinatura não está ativa.'}
                </p>
                <p className="text-sm text-red-700">Para continuar usando o Horalis, por favor, assine um plano.</p>
            </div>
        </div>
    );
};


function AssinaturaPage() {
    const { salaoId, salonDetails } = useSalon();
    const [subscriptionData, setSubscriptionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubscribing, setIsSubscribing] = useState(false);

    // Cor primária do contexto
    const primaryColor = salonDetails?.cor_primaria || '#0E7490';

    // Busca os dados de assinatura
    const fetchSubscriptionData = useCallback(async () => {
        if (!salaoId || !auth.currentUser) return;
        setLoading(true); setError(null);

        try {
            const token = await auth.currentUser.getIdToken();
            const response = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data;
            if (data) {
                setSubscriptionData({
                    status: data.subscriptionStatus || 'trialing',
                    trialEndsAt: data.trialEndsAt ? parseISO(data.trialEndsAt) : null,
                });
            } else {
                throw new Error("Dados do salão não encontrados.");
            }
        } catch (err) {
            console.error("Erro ao buscar dados da assinatura:", err);
            setError("Não foi possível carregar os dados da sua assinatura.");
        } finally {
            setLoading(false);
        }
    }, [salaoId]);

    useEffect(() => {
        fetchSubscriptionData();
    }, [fetchSubscriptionData]);

    // Lógica do botão "Assinar Agora"
    const handleSubscribeClick = async () => {
        setIsSubscribing(true);
        setError(null);
        
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Sessão expirada.");
            const token = await currentUser.getIdToken();

            const response = await axios.post(
                `${API_BASE_URL}/admin/pagamentos/criar-assinatura`, 
                {}, 
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const { checkout_url } = response.data;

            if (checkout_url) {
                window.location.href = checkout_url; // Redireciona para o MP
            } else {
                throw new Error("URL de checkout não recebida.");
            }
        } catch (err) {
            toast.error(err.response?.data?.detail || "Não foi possível iniciar a assinatura.");
            setIsSubscribing(false);
        }
    };

    if (loading) {
        return (
            <div className="h-96 flex items-center justify-center">
                <HourglassLoading message="Carregando assinatura..." primaryColor={primaryColor} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
                <Icon icon={AlertTriangle} className="w-5 h-5 flex-shrink-0"/> <p>{error}</p>
            </div>
        );
    }
    
    return (
        <div className="font-sans max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                    <Icon icon={CreditCard} className="w-6 h-6" style={{ color: primaryColor }} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Minha Assinatura
                    </h1>
                    <p className="text-sm text-gray-500">Gerencie seu plano e pagamentos.</p>
                </div>
            </div>

            {/* 1. Card de Status Atual */}
            <StatusCard statusData={subscriptionData} primaryColor={primaryColor} />

            {/* 2. Card do Plano Pro (A Venda) */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                
                {/* Header do Card (Cor Primária) */}
                <div className="p-6 sm:p-8 text-white" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}E0 100%)` }}>
                    <h3 className="text-2xl sm:text-3xl font-bold mb-2">Plano Horalis Pro</h3>
                    <p className="text-white/80 mb-6 text-sm">Acesso total a todas as ferramentas para automatizar seu negócio.</p>
                    
                    <div>
                        <p className="text-5xl font-extrabold tracking-tight">{DISPLAY_PRICE_SETUP}
                            <span className="text-lg font-normal text-white/80 ml-1">/mês</span>
                        </p>
                        <p className="text-sm text-white/70 mt-1">PIX ou Cartão de Crédito via Mercado Pago.</p>
                    </div>
                </div>
                
                {/* Lista de Benefícios */}
                <div className="p-6 sm:p-8 grid sm:grid-cols-2 gap-x-8 gap-y-4">
                    <ul className="space-y-3">
                        <FeatureItem text="Agendamentos Ilimitados" primaryColor={primaryColor} />
                        <FeatureItem text="Microsite Personalizado" primaryColor={primaryColor} />
                        <FeatureItem text="Integração com Google Agenda" primaryColor={primaryColor} />
                        <FeatureItem text="Sinal de Pagamento (PIX)" primaryColor={primaryColor} />
                    </ul>
                    <ul className="space-y-3">
                        <FeatureItem text="E-mail Marketing" primaryColor={primaryColor} />
                        <FeatureItem text="Notificações Automáticas" primaryColor={primaryColor} />
                        <FeatureItem text="Gestão de Clientes (CRM)" primaryColor={primaryColor} />
                        <FeatureItem text="Dashboard de Métricas" primaryColor={primaryColor} />
                    </ul>
                </div>
                
                {/* Botão de Ação */}
                {subscriptionData?.status !== 'active' && (
                    <div className="bg-gray-50 p-6 border-t border-gray-100 flex justify-center sm:justify-end">
                        <button
                            onClick={handleSubscribeClick}
                            disabled={isSubscribing}
                            className="flex items-center justify-center w-full sm:w-auto px-10 py-3.5 text-base font-bold text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 transform hover:scale-105"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {isSubscribing ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <Icon icon={CreditCard} className="w-5 h-5 mr-2" />
                            )}
                            {isSubscribing ? 'Aguardando...' : 'Assinar Agora'}
                        </button>
                    </div>
                )}
            </div>

        </div>
    );
}

export default AssinaturaPage;
