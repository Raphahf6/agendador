import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// Corrigido: Renomeando o ícone Lock para LockIcon para evitar conflito com a interface nativa do navegador (Web Locks API).
import { Calendar, Link2, Sparkles, Clock, Users, Zap, Check, ArrowRight, Phone, LogIn, Menu, X, Smartphone, Mail, Loader2, QrCode, Copy, CreditCard, User, Lock as LockIcon } from 'lucide-react';
import { ImageWithFallback } from '@/ui/ImageWithFallback';
import AOS from 'aos';
import 'aos/dist/aos.css';
import axios from 'axios';

// Imports do Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// --- CONFIGURAÇÕES GLOBAIS ---
const WHATSAPP_LNK = "https://wa.me/5511936200327?text=Ol%C3%A1,%20Gostaria%20de%20saber%20mais%20sobre%20o%20horalis";
const BRAND_NAME = "Horalis";
const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- Definições de Cor ---
const CIANO_COLOR = 'cyan-800';
const CIANO_HOVER = 'cyan-700';
const CIANO_TEXT_CLASS = `text-${CIANO_COLOR}`;
const CIANO_BG_CLASS = `bg-${CIANO_COLOR}`;
const CIANO_BG_HOVER_CLASS = `hover:bg-${CIANO_HOVER}`;
const CIANO_RGB_COLOR = 'rgb(14, 116, 144)';

// --- Inicialização do Mercado Pago ---
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
initMercadoPago("APP_USR-5aba548a-9868-41c3-927a-03bbdf9ca311", {
  locale: 'pt-BR'
});

// --- Helpers e Componentes Simples ---

const FeatureItem = ({ text }) => (
  <li className="flex items-center gap-3">
    <Check className="w-5 h-5 text-green-500 flex-shrink-0 stroke-current" />
    <span className="text-gray-700">{text}</span>
  </li>
);

const proFeatures = [
  "Agendamentos Ilimitados",
  "Link para Agendamentos Personalizado",
  "Integração com Google Agenda",
  "Notificações por E-mail",
  "Lembretes Automáticos",
  "Gestão de Clientes"
];

// Revertendo renderIcon para ser usado pela LandingPage (onde funciona) e injetado no Modal.
const renderIcon = (IconComponent, extraClasses = "") => (
  <IconComponent className={`stroke-current ${extraClasses}`} />
);

// --- Função: Parse de Erro da API ---
const parseApiError = (err) => {
  const defaultError = "Ocorreu um erro. Verifique os dados e tente novamente.";
  try {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') { return detail; }
    if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) { return detail[0].msg; }
    if (typeof detail === 'object' && detail !== null && detail.msg) { return detail.msg; }
    return defaultError;
  } catch (e) {
    return defaultError;
  }
};


// =======================================================
// === 1. LÓGICA DO CADASTRO E PAGAMENTO (DENTRO DO MODAL) ===
// =======================================================

function SignupModalContent({ closeModal, isModalOpen, renderIcon }) {
  // --- Estado de Fluxo ---
  const [step, setStep] = useState(1);
  const [pixData, setPixData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);

  // Estados do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nomeSalao, setNomeSalao] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cpf, setCpf] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [paymentError, setPaymentError] = useState(null);

  // Limpa o polling ao fechar o modal
  useEffect(() => {
    if (!isModalOpen && pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen]);


  // --- FUNÇÃO CRÍTICA: POLLING PARA CONFIRMAÇÃO DO PIX (SIMULADA) ---
  const startPolling = (paymentId) => {
    // Para a simulação anterior, se houver
    if (pollingInterval) clearInterval(pollingInterval);

    let checks = 0;
    const maxChecks = 40; // 40 verificações * 3 segundos = 2 minutos de polling

    const interval = setInterval(async () => {
      checks++;
      console.log(`[POLLING REAL] Verificando status para Payment ID: ${paymentId}. Tentativa ${checks}/${maxChecks}...`);

      try {
        // Chama a nova rota de backend que verifica o Firestore
        const response = await axios.get(`${API_BASE_URL}/auth/check-payment-status/${paymentId}`);
        const status = response.data.status;

        if (status === 'approved') {
          console.log("POLLING: Pagamento aprovado pelo Backend.");
          clearInterval(interval);
          setPollingInterval(null);
          setStep(4); // Vai para o Passo 4 (Sucesso)
          return;
        }

        // Se o status for rejected, cancelled, etc.
        if (status !== 'pending' && status !== 'trialing') {
          console.log(`POLLING: Pagamento falhou. Status: ${status}`);
          clearInterval(interval);
          setPollingInterval(null);
          // Retorna o usuário ao passo 1 com uma mensagem de erro
          setError(response.data.message || "Pagamento rejeitado. Tente novamente.");
          setStep(1);
          return;
        }

      } catch (error) {
        console.error("Erro durante o polling:", error);
        // Continua o polling em caso de erro temporário de rede.
      }

      if (checks >= maxChecks) {
        clearInterval(interval);
        setPollingInterval(null);
        setError("Tempo limite de espera excedido. Pagamento ainda pendente. Verifique o status pelo login em instantes.");
        console.warn("POLLING: Tempo limite atingido.");
      }
    }, 3000);

    setPollingInterval(interval);
  };
  // --- FIM DA FUNÇÃO CRÍTICA ---


  // --- ETAPA 1 - Validar o Formulário ---
  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setPaymentError(null);

    // Validações
    if (password !== confirmPassword) { setError("As senhas não coincidem."); return; }
    if (password.length < 6) { setError("A senha deve ter pelo menos 6 caracteres."); return; }
    if (!nomeSalao.trim()) { setError("O nome do salão é obrigatório."); return; }
    const cleanedWhatsapp = whatsapp.replace(/\D/g, '');
    if (cleanedWhatsapp.length < 10 || cleanedWhatsapp.length > 11) { setError("Telefone inválido."); return; }
    const cleanedCpf = cpf.replace(/\D/g, '');
    if (cleanedCpf.length !== 11) { setError("CPF inválido. Deve conter 11 dígitos."); return; }

    setStep(2);
  };

  // --- Funções de Pagamento (Idênticas ao anterior) ---
  const handleCardPaymentSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    setPaymentError(null);

    const formattedWhatsapp = `+55${whatsapp.replace(/\D/g, '')}`;
    const payload = {
      email, password, nome_salao: nomeSalao.trim(), numero_whatsapp: formattedWhatsapp,
      token: formData.token, issuer_id: formData.issuer_id, payment_method_id: formData.payment_method_id,
      transaction_amount: formData.transaction_amount, installments: formData.installments,
      payer: {
        email: formData.payer.email,
        identification: formData.payer.identification,
      }
    };

    return new Promise((resolve, reject) => {
      axios.post(`${API_BASE_URL}/auth/criar-conta-paga`, payload)
        .then(() => {
          setLoading(false);
          setStep(4);
          resolve();
        })
        .catch((err) => {
          setLoading(false);
          const friendlyError = parseApiError(err);
          setError(friendlyError);
          setPaymentError(friendlyError);
          reject();
        });
    });
  };

  const handlePixPayment = async () => {
    setLoading(true);
    setError(null); setPaymentError(null); setPixData(null);

    const cleanedCpf = cpf.replace(/\D/g, '');
    const formattedWhatsapp = `+55${whatsapp.replace(/\D/g, '')}`;

    const payload = {
      email, password, nome_salao: nomeSalao.trim(), numero_whatsapp: formattedWhatsapp,
      payment_method_id: 'pix', transaction_amount: 0.99,
      payer: { email, identification: { type: 'CPF', number: cleanedCpf } }
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/criar-conta-paga`, payload);

      const qr_code = response.data?.payment_data?.qr_code;
      const qr_code_base64 = response.data?.payment_data?.qr_code_base64;
      const payment_id = response.data?.payment_data?.payment_id;

      if (qr_code && qr_code_base64 && payment_id) {
        setPixData({ qr_code, qr_code_base64, payment_id });
        setStep(3);
        startPolling(payment_id);
      } else {
        setError("Ocorreu um erro ao gerar o PIX. Dados incompletos da API.");
      }

    } catch (err) {
      const friendlyError = parseApiError(err);
      setError(friendlyError);
      setStep(1);
    } finally {
      setLoading(false);
    }
  };


  // --- Configuração do Brick (APENAS CARTÕES) ---
  const paymentBrickCustomization = {
    paymentMethods: { creditCard: "all", debitCard: "all" },
    visual: { style: { theme: 'default' } }
  };

  // Helper para copiar
  const copyToClipboard = (text) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed"; textArea.style.opacity = 0;
      document.body.appendChild(textArea); textArea.focus(); textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Falha ao copiar:", err);
    }
  };


  // --- Renderização do Modal ---
  return (
    <div
      // CLASSE CORRIGIDA: Usa max-w-2xl para PIX e max-w-3xl para formulário, a partir do tamanho 'md'
      className={`bg-white p-8 shadow-xl border border-gray-200 rounded-xl relative overflow-y-auto max-h-[90vh]
                ${step === 3
          ? 'max-w-md md:max-w-3xl' // PIX: Fica mais estreito
          : 'max-w-lg md:max-w-2xl' // Formulário/Sucesso: Fica mais largo
        }`}
    >
      <button
        onClick={closeModal}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        aria-label="Fechar"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Título e Subtítulo */}
      <div className="text-center mb-6 border-b pb-4">
        <h2 className="text-3xl font-extrabold text-gray-900">
          {BRAND_NAME} <span className={CIANO_TEXT_CLASS}>Pro</span>
        </h2>
        <p className="text-gray-600 mt-1">
          {step === 1 && "Crie sua conta profissional 🚀"}
          {step === 2 && "Finalize sua assinatura de R$ 0,99"}
          {step === 3 && "PIX gerado! Escaneie para pagar."}
          {step === 4 && "Sucesso Total! 🎉"}
        </p>
      </div>

      {/* Passo 1: Formulário de Dados */}
      {step === 1 && (
        <div className="space-y-4">

          <div className="space-y-1">
            <label htmlFor="nomeSalao" className="text-sm font-medium text-gray-700">Nome do Salão</label>
            <div className="relative">
              {renderIcon(User, "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400")}
              <input id="nomeSalao" type="text" placeholder="Seu Estúdio de Beleza" required className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg h-11 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400`} value={nomeSalao} onChange={(e) => setNomeSalao(e.target.value)} disabled={loading} />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="whatsapp" className="text-sm font-medium text-gray-700">Seu WhatsApp (ID de Acesso)</label>
            <div className="relative">
              {renderIcon(Phone, "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400")}
              <input id="whatsapp" type="tel" placeholder="DDD + Número (ex: 11987654321)" required className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg h-11 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400`} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div className="space-y-1 pt-3 border-t border-gray-100">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">Seu E-mail (Notificações)</label>
            <div className="relative">
              {renderIcon(Mail, "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400")}
              <input id="email" type="email" placeholder="seuemail@exemplo.com" required className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg h-11 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400`} value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="cpf" className="text-sm font-medium text-gray-700">CPF (para o Pagamento)</label>
            <div className="relative">
              {renderIcon(CreditCard, "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400")}
              <input id="cpf" type="tel" placeholder="000.000.000-00" required className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg h-11 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400`} value={cpf} onChange={(e) => setCpf(e.target.value)} disabled={loading} maxLength={14} />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">Sua Senha</label>
            <div className="relative">
              {renderIcon(LockIcon, "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400")}
              <input id="password" type="password" placeholder="Mínimo 6 caracteres" required className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg h-11 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400`} value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirme sua Senha</label>
            <div className="relative">
              {renderIcon(LockIcon, "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400")}
              <input id="confirmPassword" type="password" placeholder="Repita a senha" required className={`w-full pl-10 pr-4 py-2.5 border rounded-lg h-11 focus:outline-none focus:ring-2 ${confirmPassword && password !== confirmPassword ? 'border-red-500 focus:ring-red-400 focus:border-red-500' : `border-gray-300 focus:ring-cyan-400 focus:border-cyan-400`}`} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} />
            </div>
          </div>

          {error && (<div className="p-3 bg-red-100 border border-red-200 rounded-md text-center"><p className="text-sm text-red-700">{error}</p></div>)}

          <button type="button" onClick={handleFormSubmit} className={`w-full h-11 flex items-center justify-center text-base font-semibold text-white ${CIANO_BG_CLASS} rounded-lg shadow-md ${CIANO_BG_HOVER_CLASS} transition-colors disabled:opacity-70`} disabled={loading}>
            {loading ? renderIcon(Loader2, "w-5 h-5 animate-spin") : <>{renderIcon(ArrowRight, "w-5 h-5 mr-2")} Ir para o Pagamento</>}
          </button>
        </div>
      )}

      {/* Passo 2: Pagamento (Cartão ou PIX) */}
      {step === 2 && (
        <div className="space-y-4">

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex justify-between items-center text-sm">
            <div>
              <p className="text-gray-600 truncate">Conta: <span className="font-medium text-gray-800">{email}</span></p>
              <p className="text-gray-600 truncate">Salão: <span className="font-medium text-gray-800">{nomeSalao}</span></p>
            </div>
            <button onClick={() => { setStep(1); setError(null); setPaymentError(null); }} className={`text-xs ${CIANO_TEXT_CLASS} hover:underline font-medium`} disabled={loading}>
              {renderIcon(ArrowRight, "w-4 h-4 inline rotate-180 mr-1")}Editar
            </button>
          </div>

          {(error || paymentError) && (<div className="p-3 bg-red-100 border border-red-200 rounded-md text-center"><p className="text-sm text-red-700">{error || paymentError}</p></div>)}

          {/* Opção PIX (Botão Customizado) */}
          <button type="button" onClick={handlePixPayment} className={`w-full h-12 flex items-center justify-center text-base font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:opacity-70`} disabled={loading}>
            {loading ? renderIcon(Loader2, "w-5 h-5 animate-spin") : <>{renderIcon(QrCode, "w-5 h-5 mr-2")} Pagar com PIX (R$ 0,99)</>}
          </button>

          {/* Divisor OU */}
          <div className="flex items-center gap-2 my-4">
            <hr className="flex-grow border-t border-gray-200" />
            <span className="text-sm text-gray-500">OU</span>
            <hr className="flex-grow border-t border-gray-200" />
          </div>

          {/* Brick (SÓ CARTÕES) */}
          <div className="mt-2">
            <p className="text-sm font-medium text-gray-700 mb-2">Pagar com Cartão</p>
            <Payment
              initialization={{
                amount: 0.99,
                payer: {
                  email: email,
                  identification: { type: 'CPF', number: cpf.replace(/\D/g, '') },
                },
              }}
              customization={paymentBrickCustomization}
              onSubmit={handleCardPaymentSubmit}
              onError={(error) => {
                setPaymentError(error.message || "Erro ao processar dados de pagamento.");
              }}
            />
          </div>
        </div>
      )}

      {/* Passo 3: Exibição do PIX e Polling */}
      {step === 3 && pixData && (
        <div className="flex flex-col items-center p-4">
          <p className="text-lg font-semibold text-gray-800 mb-4">Seu PIX foi gerado com sucesso!</p>

          <img
            src={`data:image/png;base64,${pixData.qr_code_base64}`}
            alt="PIX QR Code"
            className="w-48 h-48 border-4 border-cyan-300 shadow-lg rounded-xl mb-4"
          />

          <p className="text-sm text-gray-600 mb-2">Código Copia e Cola:</p>
          <div className="w-full relative">
            <textarea readOnly value={pixData.qr_code} className="w-full p-2 pr-12 border border-gray-300 rounded-lg text-xs font-mono bg-gray-50 resize-none h-20" />
            <button type="button" onClick={() => copyToClipboard(pixData.qr_code)} className={`absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-lg ${CIANO_BG_CLASS} text-white hover:opacity-90 transition-opacity`}>
              {renderIcon(copied ? Check : Copy, "w-4 h-4")}
            </button>
          </div>

          <div className={`flex items-center justify-center gap-2 mt-6 ${CIANO_TEXT_CLASS} bg-cyan-50 p-3 rounded-lg w-full`}>
            {renderIcon(Loader2, "w-5 h-5 animate-spin")}
            <span className="font-medium text-sm">Aguardando confirmação do PIX...</span>
          </div>

          <p className="text-xs text-gray-500 mt-2">Você será redirecionado automaticamente ao ser aprovado.</p>
        </div>
      )}

      {/* Passo 4: Tela de Sucesso */}
      {step === 4 && (
        <div className="text-center p-6 space-y-4">
          {renderIcon(Check, "w-16 h-16 mx-auto text-green-500 bg-green-100 p-2 rounded-full")}
          <h3 className="text-2xl font-bold text-gray-900">Pagamento Confirmado!</h3>
          <p className="text-lg text-gray-600">Sua conta {BRAND_NAME} Pro está **ATIVA** e pronta para gerenciar seus agendamentos!</p>
          <button
            onClick={() => { closeModal(); navigate('/login'); }}
            className={`w-full h-12 flex items-center justify-center text-base font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transition-colors mt-6`}
          >
            {renderIcon(LogIn, "w-5 h-5 mr-2")} Fazer Login Agora
          </button>
          <Link to="/ajuda" className={`${CIANO_TEXT_CLASS} text-sm hover:underline block pt-2`}>Precisa de ajuda?</Link>
        </div>
      )}

      {/* Rodapé do Modal (exceto no Sucesso) */}
      {step !== 4 && (
        <div className="text-center text-sm text-gray-600 pt-4 border-t border-gray-100 mt-4">
          Já tem uma conta?{' '}
          <Link to="/login" className={`font-semibold ${CIANO_TEXT_CLASS} hover:underline`}>
            Acesse seu Painel {renderIcon(LogIn, "w-4 h-4 inline")}
          </Link>
        </div>
      )}
    </div>
  );
}


// =======================================================
// === 2. COMPONENTE PRINCIPAL (LANDING PAGE) ===
// =======================================================

export function LandingPage() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false); // ADICIONADO: Estado para o Modal
    const precosRef = useRef(null);
    const navigate = useNavigate();

    // --- <<< NOVO: EFEITO PARA BLOQUEAR A ROLAGEM >>> ---
    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = 'hidden'; // Adiciona overflow-hidden
        } else {
            document.body.style.overflow = ''; // Remove (volta ao normal)
        }
        
        // Limpeza: Garante que a rolagem seja reativada se o componente for desmontado
        return () => {
            document.body.style.overflow = '';
        };
    }, [isModalOpen]);

  const handleScrollToPrecos = (e) => {
    e.preventDefault();
    precosRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  // --- DEFINIÇÃO LOCAL DO renderIcon ---
  const renderIcon = (IconComponent, extraClasses = "") => (
    <IconComponent className={`stroke-current ${extraClasses}`} />
  );
  // --- FIM DA DEFINIÇÃO LOCAL ---

  // --- DADOS PARA O CARROSSEL (Seu código original) ---
  const carouselSlides = [
    {
      imgSrc: "/pagina-agendamentos.png",
      title: "Sua Página de Agendamento Profissional",
      description: "Ofereça aos seus clientes uma experiência de agendamento 24/7. Eles podem ver seus serviços, preços e horários em uma página linda e direta."
    },
    {
      imgSrc: "/pagina-personalizacao.png",
      title: "Deixe com a Cara do Seu Studio",
      description: "Personalize sua página de agendamento com seu logo, nome e slogan. Veja as mudanças em tempo real e crie uma marca forte e profissional."
    },
    {
      imgSrc: "/calendario.png",
      title: "Agenda Inteligente e Centralizada",
      description: "Gerencie todos os horários em um calendário integrado ao Google."
    },
    {
      imgSrc: "/visao-geral.png",
      title: "Seu Negócio na Palma da Mão",
      description: "Acompanhe sua receita, novos agendamentos e futuros em um dashboard que mostra o que realmente importa para o seu sucesso."
    }
  ];

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      offset: 100,
    });
  }, []);


  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">

      {/* --- Cabeçalho --- */}
      <header className="sticky top-0 w-full bg-white border-b border-gray-200 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className={`text-2xl font-bold`}>
            {BRAND_NAME}
          </h1>
          <nav className="hidden sm:flex items-center gap-4">
            <Link
              to={`/login`}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg hover:bg-cyan-50 transition-colors`}
            >
              {renderIcon(LogIn, "w-4 h-4")}
              Acesso ao Painel
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white ${CIANO_BG_CLASS} rounded-lg shadow-sm ${CIANO_BG_HOVER_CLASS} transition-all`}
            >
              Quero Cadastrar!
              {renderIcon(ArrowRight, "w-4 h-4 ml-1")}
            </button>
          </nav>
          <button
            className="sm:hidden p-2 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Abrir Menu"
          >
            {isMenuOpen ? renderIcon(X, "w-6 h-6") : renderIcon(Menu, "w-6 h-6")}
          </button>
        </div>
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white shadow-md sm:hidden z-30 border-t border-gray-200">
            <div className="flex flex-col p-4 space-y-2">
              <Link
                to={`/login`}
                className={`flex items-center gap-2 px-3 py-2 text-base font-medium ${CIANO_TEXT_CLASS} hover:bg-cyan-50 rounded-md transition-colors`}
                onClick={() => setIsMenuOpen(false)}
              >
                {renderIcon(LogIn, "w-5 h-5")} Acesso ao Painel
              </Link>
              <button
                onClick={() => { setIsModalOpen(true); setIsMenuOpen(false); }}
                className={`flex items-center gap-2 px-3 py-2 text-base font-medium text-white ${CIANO_BG_CLASS} ${CIANO_BG_HOVER_CLASS} rounded-md transition-colors`}
              >
                {renderIcon(ArrowRight, "w-5 h-5")} Cadastre-se
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <div data-aos="fade-in" className="relative bg-white py-20">
        {/* ... (resto do seu código principal, inalterado) ... */}
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-8" data-aos="fade-up">
              <div className={`inline-flex items-center gap-2 px-4 py-2 bg-cyan-50 rounded-full border border-cyan-100 shadow-sm`}>
                {renderIcon(Sparkles, `w-4 h-4 ${CIANO_TEXT_CLASS}`)}
                <span className={`text-sm font-medium ${CIANO_TEXT_CLASS}`}>{BRAND_NAME} Agendamento Inteligente</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
                <span className="block">Foque no seu Trabalho.</span>
                <span className={`block ${CIANO_TEXT_CLASS}`}>
                  Deixe a Agenda Conosco
                </span>
              </h1>
              <p className="text-gray-600 text-lg" data-aos="fade-up" data-aos-delay="100">
                Simplifique sua vida! Seus clientes agendam pelo link, e os compromissos aparecem automaticamente na sua Google Agenda. Sem desorganização, sem esquecimentos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4" data-aos="fade-up" data-aos-delay="200">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className={`inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white ${CIANO_BG_CLASS} rounded-lg shadow-md ${CIANO_BG_HOVER_CLASS} hover:shadow-lg transition-all transform hover:scale-105`}
                >
                  Quero Cadastrar Meu Comercio
                  {renderIcon(ArrowRight, "ml-2 w-5 h-5")}
                </button>
              </div>
              <div className="flex gap-8 pt-8" data-aos="fade-up" data-aos-delay="300">
                <div>
                  <div className={`text-3xl font-bold ${CIANO_TEXT_CLASS}`}>100%</div>
                  <p className="text-sm text-gray-500">Automático</p>
                </div>
                <div>
                  <div className={`text-3xl font-bold ${CIANO_TEXT_CLASS}`}>24/7</div>
                  <p className="text-sm text-gray-500">Disponível</p>
                </div>
                <div>
                  <div className={`text-3xl font-bold ${CIANO_TEXT_CLASS}`}>0</div>
                  <p className="text-sm text-gray-500">Complicações</p>
                </div>
              </div>
            </div>
            {/* Right Column */}
            <div className="relative flex justify-center items-center lg:justify-end" data-aos="fade-left" data-aos-delay="100">
              <div className="relative rounded-2xl overflow-hidden shadow-lg border border-gray-200">
                <ImageWithFallback src="/visao-geral.png" alt="Interface Horalis" className="w-full h-auto object-cover" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20 bg-gray-50">
        {/* ... (O restante da sua Landing Page está inalterado) ... */}
        <div className="max-w-7xl mx-auto px-6">
          <div data-aos="fade-up" className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Como Funciona</h2>
            <p className="text-gray-600 text-lg">
              Apenas 3 passos simples para começar
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative p-8 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all group" data-aos="fade-up" data-aos-delay="100">
              <div className={`absolute -top-4 -left-4 w-12 h-12 rounded-full ${CIANO_BG_CLASS} flex items-center justify-center text-white shadow-lg text-lg font-bold`}>1</div>
              <div className={`w-16 h-16 rounded-2xl ${CIANO_BG_CLASS} flex items-center justify-center mb-6 group-hover:scale-105 transition-transform text-white`}>
                {renderIcon(Link2, "w-8 h-8")}
              </div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Receba seu Link</h3>
              <p className="text-sm text-gray-500">
                Faça seu cadastro conosco e receba um link único: (horalis.app/agenda/seu-id-unico) que leva ao seu Horalis personalizado com sua logo, serviços e cores para compartilhar com seus clientes.
              </p>
            </div>
            {/* Step 2 */}
            <div className="relative p-8 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all group" data-aos="fade-up" data-aos-delay="200">
              <div className={`absolute -top-4 -left-4 w-12 h-12 rounded-full ${CIANO_BG_CLASS} flex items-center justify-center text-white shadow-lg text-lg font-bold`}>2</div>
              <div className={`w-16 h-16 rounded-2xl ${CIANO_BG_CLASS} flex items-center justify-center mb-6 group-hover:scale-105 transition-transform text-white`}>
                {renderIcon(Users, "w-8 h-8")}
              </div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Compartilhe</h3>
              <p className="text-sm text-gray-500">
                Envie o link para seus clientes por WhatsApp, Instagram, SMS ou qualquer rede social.
              </p>
            </div>
            {/* Step 3 */}
            <div className="relative p-8 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all group" data-aos="fade-up" data-aos-delay="300">
              <div className={`absolute -top-4 -left-4 w-12 h-12 rounded-full ${CIANO_BG_CLASS} flex items-center justify-center text-white shadow-lg text-lg font-bold`}>3</div>
              <div className={`w-16 h-16 rounded-2xl ${CIANO_BG_CLASS} flex items-center justify-center mb-6 group-hover:scale-105 transition-transform text-white`}>
                {renderIcon(Calendar, "w-8 h-8")}
              </div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Receba Agendamentos</h3>
              <p className="text-sm text-gray-500">
                Os agendamentos aparecem automaticamente na sua Horalis agenda no seu painel e na sua Google Agenda. Simples assim!
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* --- SEÇÃO DE CARROSSEL --- */}
      <div className="py-20 bg-white">
        {/* ... (continua seu código) ... */}
        <div className="max-w-7xl mx-auto px-6">
          <div data-aos="fade-up" className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Conheça o {BRAND_NAME} por Dentro</h2>
            <p className="text-gray-600 text-lg">
              Um tour rápido pelas telas que vão transformar sua gestão, da visão do cliente ao seu painel de controle.
            </p>
          </div>

          <div data-aos="fade-up" data-aos-delay="100" className="horalis-swiper-container">
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              spaceBetween={30}
              slidesPerView={1}
              centeredSlides={true}
              pagination={{ clickable: true }}
              navigation={true}
              autoplay={{
                delay: 5000,
                disableOnInteraction: false
              }}
              loop={true}
              className="horalis-swiper"
            >
              {carouselSlides.map((slide, index) => (
                <SwiperSlide key={index}>
                  <div className="flex flex-col items-center text-center pb-16">

                    <div className="relative rounded-2xl overflow-hidden shadow-lg border border-gray-200 mb-8 max-w-4xl w-full h-96 bg-gray-900 flex justify-center items-center mx-auto">
                      <ImageWithFallback
                        src={slide.imgSrc}
                        alt={slide.title}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Textos */}
                    <h3 className="text-2xl font-semibold mb-3 text-gray-900">{slide.title}</h3>
                    <p className="text-gray-600 text-lg max-w-2xl px-4">
                      {slide.description}
                    </p>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>

        {/* Estilos das Setas */}
        <style>{`
          .horalis-swiper-container {
            position: relative;
            width: 100%;
          }
          .horalis-swiper .swiper-button-prev,
          .horalis-swiper .swiper-button-next {
            color: ${CIANO_RGB_COLOR};
            transition: all 0.2s ease-in-out;
            background-color: rgba(255, 255, 255, 0.9);
            width: 44px;
            height: 44px;
            border-radius: 9999px;
            border: 1px solid rgba(0, 0, 0, 0.05);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          }
          .horalis-swiper .swiper-button-prev::after,
          .horalis-swiper .swiper-button-next::after {
            font-size: 1.25rem;
            font-weight: 700;
          }
          .horalis-swiper .swiper-button-prev:hover,
          .horalis-swiper .swiper-button-next:hover {
            transform: scale(1.05);
            background-color: rgba(255, 255, 255, 1);
          }
          .horalis-swiper .swiper-pagination-bullet-active {
            background-color: ${CIANO_RGB_COLOR};
          }
        `}</style>
      </div>


      {/* Benefits Section */}
      <div data-aos="fade-up" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div className="order-2 lg:order-1" data-aos="fade-right">
              <div className="relative max-w-sm w-full rounded-2xl overflow-hidden shadow-lg border border-gray-200">
                <ImageWithFallback src="/pagina-agendamentos.png" alt="Calendário Horalis" className="w-full h-auto" />
              </div>
            </div>
            {/* Benefits List */}
            <div className="order-1 lg:order-2 space-y-6" data-aos="fade-left">
              <h2 className="text-3xl font-bold mb-8 text-gray-900">
                Por que escolher {BRAND_NAME}?
              </h2>
              <div className="space-y-4">
                {[
                  { icon: Mail, title: 'Lembretes automaticos', description: 'Notificações e-mails de confirmação cancelamento e muito mais, mantenha seu cliente sempre atualizado.' },
                  { icon: Smartphone, title: 'Responsividade', description: 'Sistema totalmente responsivo podendo utilizar tanto no celular como no computador' },
                  { icon: Zap, title: 'Rápido e Automático', description: 'Sem formulários complicados. Seu cliente agenda em segundos.' },
                  { icon: Calendar, title: 'Integração com Google', description: 'Todos os agendamentos vão direto para sua Google Agenda.' },
                  { icon: Clock, title: 'Economize Tempo', description: 'Nunca mais perca tempo anotando agendamentos manualmente.' },
                  { icon: Users, title: 'Experiência do Cliente', description: 'Eleve a experiência do seu cliente com um sistema de agendamentos feito sob medida.' },

                ].map((benefit, index) => (
                  <div key={index} className="flex gap-4 p-4 rounded-xl bg-white border border-gray-200 hover:bg-white transition-all hover:shadow-md">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${CIANO_BG_CLASS} flex items-center justify-center text-white`}>
                      {renderIcon(benefit.icon, "w-6 h-6")}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1 text-gray-900">{benefit.title}</h3>
                      <p className="text-sm text-gray-500">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- SEÇÃO DE PREÇOS --- */}
      <div data-aos="fade-up" className="py-20 bg-white" ref={precosRef}>
        <div className="max-w-7xl mx-auto px-6">
          {/* Título da Seção */}
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Um plano completo</h2>
            <p className="text-gray-600 text-lg">
              Sem taxas escondidas. Todos os recursos que você precisa, por um preço justo.
            </p>
            <p className="text-xl font-bold text-green-600 mt-4">
              Teste Grátis de 7 Dias! Apenas R$ 0,99 para começar.
            </p>
          </div>

          {/* Card de Preço Único */}
          <div className="max-w-lg mx-auto bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden transform hover:scale-[1.02] transition-transform duration-300">
            <div className="p-8">
              <h3 className={`text-lg font-semibold ${CIANO_TEXT_CLASS} uppercase`}>Plano {BRAND_NAME} Pro</h3>
              <p className="text-gray-600 mt-1">Todos os recursos para automatizar sua agenda.</p>

              <div className="my-6">
                <p className="text-5xl font-bold text-gray-900">R$ 19,90</p>
                <p className="text-lg font-medium text-gray-500">/mês</p>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className={`w-full inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white ${CIANO_BG_CLASS} rounded-lg shadow-md ${CIANO_BG_HOVER_CLASS} hover:shadow-lg transition-all transform hover:scale-105`}
              >
                Começar Agora
                {renderIcon(ArrowRight, "ml-2 w-5 h-5")}
              </button>
              <p className="text-center text-sm text-gray-500 mt-4">Pagamentos por Pix ou Cartão.</p>
            </div>

            <div className="bg-gray-50 p-8 border-t border-gray-100">
              <h4 className="text-base font-semibold text-gray-900 mb-4">Tudo incluído:</h4>
              <ul className="space-y-3">
                {proFeatures.map((feature, index) => (
                  <FeatureItem key={index} text={feature} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div data-aos="fade-up" className={`py-20 ${CIANO_BG_CLASS}`}>
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className="text-4xl font-bold mb-6 text-white">
            Pronto para simplificar seus agendamentos?
          </h2>
          <p className="text-lg mb-8 text-white/90">
            Junte-se a centenas de profissionais que já transformaram a forma de gerenciar agendamentos.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className={`inline-flex items-center justify-center bg-white ${CIANO_TEXT_CLASS} hover:bg-gray-100 px-12 py-4 text-base font-semibold rounded-lg shadow-xl hover:shadow-2xl transition-all transform hover:scale-105`}
          >
            Começar agora (R$ 0,99)
            {renderIcon(ArrowRight, "ml-2 w-5 h-5")}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div data-aos="fade-up" className="py-12 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className={`text-xl font-bold`}>
                {BRAND_NAME}
              </h3>
              <p className="text-sm text-gray-500">
                Simplifique sua agenda, encante seus clientes
              </p>
            </div>
            <div className="flex gap-6 text-sm text-gray-600">
              <a
                href="#precos"
                onClick={handleScrollToPrecos}
                className={`hover:${CIANO_TEXT_CLASS} transition-colors cursor-pointer`}
              >
                Preços
              </a>
              <a href={WHATSAPP_LNK} target="_blank" rel="noopener noreferrer" className={`hover:${CIANO_TEXT_CLASS} transition-colors`}>Contato</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} {BRAND_NAME}. Todos os direitos reservados.
          </div>
        </div>
      </div>

      {/* --- ESTRUTURA DO MODAL --- */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm transition-opacity duration-300 ease-out"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="transition-transform duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
            data-aos="zoom-in"
            data-aos-duration="300"
          >
            <SignupModalContent
              closeModal={() => setIsModalOpen(false)}
              isModalOpen={isModalOpen}
              renderIcon={renderIcon}
            />
          </div>
        </div>
      )}
      {/* --- FIM DA ESTRUTURA DO MODAL --- */}

    </div>
  );
}