// frontend/src/pages/painel/AssinaturaPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { auth, db } from '@/firebaseConfig';
import { doc, getDoc } from "firebase/firestore";
import { format, differenceInDays, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, AlertTriangle, CheckCircle, CreditCard, Star, Calendar, Link2, Bell, Users, Clock } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast'; // Importando toast
import HourglassLoading from '@/components/HourglassLoading';
import { DISPLAY_PRICE_SETUP } from '@/utils/pricing';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// Definições de Cor
const CIANO_COLOR_TEXT = 'text-cyan-800';
const CIANO_COLOR_BG = 'bg-cyan-800';
const CIANO_COLOR_BG_HOVER = 'hover:bg-cyan-900';

// Helper Ícone
const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// Componente de Benefício
const FeatureItem = ({ icon, text }) => (
  <li className="flex items-center gap-3">
    <Icon icon={CheckCircle} className="w-5 h-5 text-green-500 flex-shrink-0" />
    <span className="text-gray-700">{text}</span>
  </li>
);

function AssinaturaPage() {
  const { salaoId } = useParams();
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubscribing, setIsSubscribing] = useState(false); // Para o botão de assinar

  // Busca os dados de assinatura do salão
  const fetchSubscriptionData = useCallback(async () => {
    if (!salaoId || !auth.currentUser) return;
    setLoading(true); setError(null);

    try {
      const token = await auth.currentUser.getIdToken();
      // Usamos o endpoint que retorna *todos* os dados, incluindo os de assinatura
      const response = await axios.get(`https://api-agendador.onrender.com/api/v1/admin/clientes/${salaoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = response.data;
      if (data) {
        // Converte os Timestamps (que vêm como string ISO) para Datas
        const subData = {
          status: data.subscriptionStatus || 'trialing',
          trialEndsAt: data.trialEndsAt ? parseISO(data.trialEndsAt) : null,
        };
        setSubscriptionData(subData);
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

  // --- <<< ALTERADO: Lógica do botão "Assinar Agora" >>> ---
  const handleSubscribeClick = async () => {
    setIsSubscribing(true);
    setError(null);
    console.log("Iniciando processo de assinatura...");
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Sessão expirada. Faça login novamente.");
      const token = await currentUser.getIdToken();

      // 1. Chamar o backend para criar o link de checkout
      // O corpo pode ser vazio, pois o backend usa o token/salaoId
      const response = await axios.post(
        `${API_BASE_URL}/admin/pagamentos/criar-assinatura`, 
        {}, // Corpo vazio
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 2. Backend retorna a URL do Mercado Pago
      const { checkout_url } = response.data;

      if (checkout_url) {
        // 3. Redireciona o usuário para o checkout do Mercado Pago
        // O usuário sairá do seu site e irá para o Mercado Pago
        window.location.href = checkout_url;
      } else {
        throw new Error("URL de checkout não recebida do servidor.");
      }

    } catch (err) {
      // Se algo der errado ANTES do redirecionamento, mostre um erro
      console.error("Erro ao criar link de assinatura:", err);
      toast.error(err.response?.data?.detail || "Não foi possível iniciar a assinatura. Tente novamente.");
      setIsSubscribing(false); // Reseta o botão Apenas em caso de erro
    }
    // Não definimos setLoading(false) no 'finally' porque em caso de sucesso,
    // o usuário é redirecionado, então não precisamos resetar o botão.
  };
  // --- <<< FIM DA ALTERAÇÃO >>> ---

  // --- Componente de Status (Sem alteração) ---
  const StatusCard = () => {
    if (!subscriptionData) return null;
    const { status, trialEndsAt } = subscriptionData;
    const now = new Date();

    if (status === 'active') {
      return (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <Icon icon={CheckCircle} className="w-6 h-6 text-green-600" />
          <div>
            <p className="font-semibold text-green-800">Plano Horalis Pro Ativo</p>
            <p className="text-sm text-green-700">Sua assinatura está em dia.</p>
          </div>
        </div>
      );
    }
    
    if (status === 'trialing' && trialEndsAt && isAfter(trialEndsAt, now)) {
      const daysLeft = differenceInDays(trialEndsAt, now);
      return (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
          <Icon icon={Star} className="w-6 h-6 text-blue-600" />
          <div>
            <p className="font-semibold text-blue-800">Você está no Período de Teste Gratuito!</p>
            <p className="text-sm text-blue-700">
              Você tem mais <span className="font-bold">{daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}</span> restantes.
            </p>
          </div>
        </div>
      );
    }
    
    // Teste expirado ou status 'cancelled', 'paused', 'pending'
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
        <Icon icon={AlertTriangle} className="w-6 h-6 text-red-600" />
        <div>
          <p className="font-semibold text-red-800">
            {status === 'trialing' ? 'Seu período de teste expirou!' : 'Sua assinatura não está ativa.'}
          </p>
          <p className="text-sm text-red-700">Para continuar usando o Horalis, por favor, assine um plano.</p>
        </div>
      </div>
    );
  };

  // --- Renderização Loading/Error (Sem alteração) ---
  if (loading) {
    return (
      <div className="p-6 text-center bg-white rounded-lg shadow-md border border-gray-200 min-h-[300px] flex flex-col items-center justify-center font-sans">
           <HourglassLoading message="Carregando assinatura..."/>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-lg shadow border border-red-200 font-sans flex items-center gap-2">
          <Icon icon={AlertTriangle} className="w-5 h-5 flex-shrink-0"/> <p>{error}</p>
      </div>
    );
  }
  
  // --- Renderização Principal (Sem alteração) ---
  return (
    <div className="font-sans max-w-4xl mx-auto space-y-6">
      <h2 className={`text-2xl font-bold text-gray-900 flex items-center ${CIANO_COLOR_TEXT}`}>
        <Icon icon={CreditCard} className="w-6 h-6 mr-3" />
        Minha Assinatura
      </h2>

      {/* 1. Card de Status Atual */}
      <StatusCard />

      {/* 2. Card do Plano Pro */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">Plano Horalis Pro</h3>
          <p className="text-gray-600 mb-6">Todos os recursos que você precisa para automatizar sua agenda e focar no seu negócio.</p>
          
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mb-8">
            <ul className="space-y-2.5">
              <FeatureItem icon={Calendar} text="Agendamentos Ilimitados" />
              <FeatureItem icon={Link2} text="Link Público Personalizado" />
              <FeatureItem icon={Calendar} text="Integração com Google Agenda" />
            </ul>
             <ul className="space-y-2.5">
              <FeatureItem icon={Bell} text="Notificações por E-mail (Cliente)" />
              <FeatureItem icon={Clock} text="Lembretes Automáticos (Em breve)" />
              <FeatureItem icon={Users} text="Gestão de Clientes (Em breve)" />
            </ul>
          </div>

          <div className="text-center sm:text-left">
            <p className="text-gray-500">Preço</p>
            <p className="text-4xl font-bold text-gray-900 mb-1">{DISPLAY_PRICE_SETUP}<span className="text-lg font-normal text-gray-500">/mês</span></p>
            <p className="text-sm text-gray-500">PIX, Boleto ou Cartão de Crédito via Mercado Pago.</p>
          </div>
        </div>
        
        {/* Botão de Ação */}
        {subscriptionData?.status !== 'active' && (
          <div className="bg-gray-50 p-6 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleSubscribeClick}
              disabled={isSubscribing}
              className={`flex items-center justify-center px-8 py-3 text-base font-semibold text-white ${CIANO_COLOR_BG} rounded-lg shadow-sm ${CIANO_COLOR_BG_HOVER} transition-colors disabled:opacity-50`}
            >
              {isSubscribing ? (
                <Loader2 className="w-5 h-5 animate-spin stroke-current mr-2" />
              ) : (
                <Icon icon={Star} className="w-5 h-5 mr-2" />
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