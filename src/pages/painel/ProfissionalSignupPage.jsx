import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, User, Phone, Loader2, LogIn, Check, CreditCard, ArrowRight, QrCode, Copy } from 'lucide-react';
import AOS from 'aos';
import 'aos/dist/aos.css';

// --- Imports do Mercado Pago ---
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
// --- Fim dos Imports ---

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- Inicialização do Mercado Pago ---
initMercadoPago("APP_USR-5aba548a-9868-41c3-927a-03bbdf9ca311", {
  locale: 'pt-BR'
});
// --- Fim da Inicialização ---

// Definições de Cor
const CIANO_COLOR_TEXT = 'text-cyan-600';
const CIANO_COLOR_BG = 'bg-cyan-800';
const CIANO_COLOR_BG_HOVER = 'hover:bg-cyan-700';
const CIANO_RING_FOCUS = 'focus:ring-cyan-400';
const CIANO_BORDER_FOCUS = 'focus:border-cyan-400';

// Helper Ícone
const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} />
);

// --- Função: Parse de Erro da API ---
const parseApiError = (err) => {
  const defaultError = "Ocorreu um erro. Verifique os dados e tente novamente.";
  try {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
    if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) {
      return detail[0].msg;
    }
    if (typeof detail === 'object' && detail !== null && detail.msg) {
        return detail.msg;
    }
    return defaultError;
  } catch (e) {
    return defaultError;
  }
};
// --- FIM DA FUNÇÃO ---


function ProfissionalSignupPage() {
  // --- Estado de Fluxo ---
  const [step, setStep] = useState(1); 
  const [pixData, setPixData] = useState(null); 
  const [copied, setCopied] = useState(false); 

  // Estados do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nomeSalao, setNomeSalao] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cpf, setCpf] = useState(''); // <<< NOVO ESTADO PARA O CPF
  const [error, setError] = useState(''); 
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Estado para o Brick de Pagamento
  const [paymentError, setPaymentError] = useState(null); 

  useEffect(() => {
    AOS.init({ duration: 800, once: true });
  }, []);


  // --- ETAPA 1 - Validar o Formulário ---
  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setPaymentError(null);

    // Validações
    if (password !== confirmPassword) {
      setError("As senhas não coincidem."); return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres."); return;
    }
    if (!nomeSalao.trim()) {
      setError("O nome do salão é obrigatório."); return;
    }
    const cleanedWhatsapp = whatsapp.replace(/\D/g, '');
    if (cleanedWhatsapp.length < 10 || cleanedWhatsapp.length > 11) {
      setError("Telefone inválido. Use apenas números (DDD + Número)."); return;
    }

    // --- <<< NOVA VALIDAÇÃO DE CPF >>> ---
    const cleanedCpf = cpf.replace(/\D/g, '');
    if (cleanedCpf.length !== 11) {
      setError("CPF inválido. Deve conter 11 dígitos."); return;
    }
    // --- FIM DA VALIDAÇÃO ---

    console.log("Passo 1 concluído. Mostrando pagamento.");
    setStep(2);
  };

  // --- Função de Pagamento (APENAS CARTÃO) ---
  const handleCardPaymentSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    setPaymentError(null);
    console.log("Formulário de Cartão submetido (Brick):", formData);

    const formattedWhatsapp = `+55${whatsapp.replace(/\D/g, '')}`;

    const payload = {
      email: email,
      password: password,
      nome_salao: nomeSalao.trim(),
      numero_whatsapp: formattedWhatsapp,
      token: formData.token,
      issuer_id: formData.issuer_id,
      payment_method_id: formData.payment_method_id,
      transaction_amount: formData.transaction_amount,
      installments: formData.installments,
      // O formData.payer já vem do Brick com o CPF que o usuário digitou
      payer: {
        email: formData.payer.email,
        identification: formData.payer.identification, 
      }
    };

    return new Promise((resolve, reject) => {
      axios.post(`${API_BASE_URL}/auth/criar-conta-paga`, payload)
        .then((response) => {
          // SUCESSO
          console.log("Resposta do Backend (Cartão):", response.data);
          setLoading(false);
          navigate('/login?cadastro=sucesso');
          resolve();
        })
        .catch((err) => {
          // ERRO
          console.error("Erro no processo de cadastro/pagamento (Cartão):", err.response);
          setLoading(false);
          const friendlyError = parseApiError(err);
          setError(friendlyError);
          setPaymentError(friendlyError); 
          reject(); 
        });
    });
  };

  // --- Função de Pagamento (PIX) ---
  const handlePixPayment = async () => {
    setLoading(true);
    setError(null);
    setPaymentError(null);
    setPixData(null);
    console.log("Iniciando pagamento com PIX...");

    const formattedWhatsapp = `+55${whatsapp.replace(/\D/g, '')}`;
    const cleanedCpf = cpf.replace(/\D/g, ''); // Limpa o CPF

    const payload = {
      email: email,
      password: password,
      nome_salao: nomeSalao.trim(),
      numero_whatsapp: formattedWhatsapp,
      payment_method_id: 'pix',
      transaction_amount: 0.99, 
      
      // --- <<< ALTERAÇÃO CRÍTICA: ENVIANDO PAYER COMPLETO >>> ---
      payer: {
        email: email,
        identification: {
          type: 'CPF', // Informa que é um CPF
          number: cleanedCpf // Envia o número do CPF
        }
      }
      // --- FIM DA ALTERAÇÃO ---
    };

    try {
      // O 'await' está na linha correta
      const response = await axios.post(`${API_BASE_URL}/auth/criar-conta-paga`, payload);
      
      // SUCESSO 
      console.log("Resposta do Backend (PIX):", response.data);

      const qr_code = response.data?.payment_data?.qr_code;
      const qr_code_base64 = response.data?.payment_data?.qr_code_base64;

      if (qr_code && qr_code_base64) {
        setPixData({ qr_code, qr_code_base64 });
        setStep(3); // Vai para o Passo 3
      } else {
        console.error("Backend não retornou dados do PIX esperados.");
        setError("Ocorreu um erro ao gerar o PIX. Tente novamente.");
      }

    } catch (err) {
      // ERRO
      console.error("Erro ao criar PIX:", err.response); // Log do erro 500
      const friendlyError = parseApiError(err);
      setError(friendlyError);
      setStep(1); // Volta para o passo 1 em caso de erro grave
    } finally {
      setLoading(false);
    }
  };


  // --- Configuração do Brick (APENAS CARTÕES) ---
  const paymentBrickCustomization = {
    paymentMethods: {
      creditCard: "all",
      debitCard: "all",
    },
    visual: {
      style: {
        theme: 'default',
      }
    }
  };

  // Helper para copiar
  const copyToClipboard = (text) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed"; 
      textArea.style.opacity = 0;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); 
    } catch (err) {
      console.error("Falha ao copiar:", err);
    }
  };

  // --- O JSX de renderização (com renderização condicional '&&') ---
  return (
    <div className="min-h-screen w-full bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md" data-aos="fade-up">

        {/* 1. Logo Horalis */}
        <div className="text-center mb-8">
          <Link to="/">
            <h1 className="text-4xl font-bold text-gray-900">
              Horalis
            </h1>
          </Link>
          <p className="text-gray-600 mt-2">
            {step === 1 && "Crie sua conta profissional"}
            {step === 2 && "Escolha sua forma de pagamento"}
            {step === 3 && "Conclua seu pagamento PIX"}
          </p>
        </div>

        {/* 2. O Card Branco */}
        <div className="bg-white p-8 shadow-lg border border-gray-200 rounded-xl">

          {/* --- PASSO 1: Formulário de Dados --- */}
          {step === 1 && (
            <div className="space-y-4">
              {/* 1. Dados do Salão */}
              <div className="space-y-1">
                <label htmlFor="nomeSalao" className="text-sm font-medium text-gray-700">Nome do Salão</label>
                <div className="relative">
                  <Icon icon={User} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="nomeSalao" type="text" placeholder="Nome do seu estabelecimento" required
                    className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg h-11 focus:outline-none focus:ring-2 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`}
                    value={nomeSalao}
                    onChange={(e) => setNomeSalao(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="whatsapp" className="text-sm font-medium text-gray-700">Seu WhatsApp (será seu ID)</label>
                <div className="relative">
                  <Icon icon={Phone} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="whatsapp" type="tel" placeholder="DDD + Número (ex: 11987654321)" required
                    className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg h-11 focus:outline-none focus:ring-2 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`}
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* 2. Dados de Acesso */}
              <div className="space-y-1 pt-3 border-t border-gray-100">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">Seu E-mail (para Login)</label>
                <div className="relative">
                  <Icon icon={Mail} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email" type="email" placeholder="seuemail@exemplo.com" required
                    className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg h-11 focus:outline-none focus:ring-2 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* --- <<< NOVO CAMPO DE CPF >>> --- */}
              <div className="space-y-1">
                <label htmlFor="cpf" className="text-sm font-medium text-gray-700">CPF (para o pagamento)</label>
                <div className="relative">
                  {/* Pode usar o ícone de User ou outro de sua preferência */}
                  <Icon icon={User} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /> 
                  <input
                    id="cpf" type="tel" placeholder="000.000.000-00" required
                    className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg h-11 focus:outline-none focus:ring-2 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`}
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    disabled={loading}
                    maxLength={14} // Ajuda a formatar (11 números + 2 pontos + 1 traço)
                  />
                </div>
              </div>
              {/* --- <<< FIM DO CAMPO DE CPF >>> --- */}


              <div className="space-y-1">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">Sua Senha</label>
                <div className="relative">
                  <Icon icon={Lock} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="password" type="password" placeholder="Mínimo 6 caracteres" required
                    className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg h-11 focus:outline-none focus:ring-2 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirme sua Senha</label>
                <div className="relative">
                  <Icon icon={Lock} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="confirmPassword" type="password" placeholder="Repita a senha" required
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg h-11 focus:outline-none focus:ring-2 ${confirmPassword && password !== confirmPassword
                        ? 'border-red-500 focus:ring-red-400 focus:border-red-500'
                        : `border-gray-300 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`
                      }`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Erro de validação */}
              {error && (
                <div className="p-3 bg-red-100 border border-red-200 rounded-md text-center">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Botão do Passo 1 */}
              <button
                type="button"
                onClick={handleFormSubmit}
                className={`w-full h-11 flex items-center justify-center text-base font-semibold text-white ${CIANO_COLOR_BG} rounded-lg shadow-sm ${CIANO_COLOR_BG_HOVER} transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-70`}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Icon icon={ArrowRight} className="w-5 h-5 mr-2" /> Próximo (Pagamento)</>}
              </button>
            </div>
          )}


          {/* --- PASSO 2: Formulário de Pagamento --- */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Resumo dos Dados */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600 truncate">Conta: <span className="font-medium text-gray-800">{email}</span></p>
                    <p className="text-sm text-gray-600 truncate">Salão: <span className="font-medium text-gray-800">{nomeSalao}</span></p>
                  </div>
                  <button
                    onClick={() => { setStep(1); setError(null); setPaymentError(null); }}
                    className="text-xs text-cyan-600 hover:underline font-medium"
                    disabled={loading}
                  >
                    Editar
                  </button>
                </div>
              </div>

              {/* Erro (vindo do backend ou do Brick) */}
              {(error || paymentError) && (
                <div className="p-3 bg-red-100 border border-red-200 rounded-md text-center">
                  <p className="text-sm text-red-700">{error || paymentError}</p>
                </div>
              )}

              {/* Container do Brick (AGORA SÓ PARA CARTÕES) */}
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Pagar com Cartão</p>
                <Payment
                  initialization={{
                    amount: 0.99, 
                    payer: {
                      email: email, 
                      // --- <<< ALTERAÇÃO: Pré-preenchendo o CPF no Brick >>> ---
                      identification: {
                        type: 'CPF', 
                        number: cpf.replace(/\D/g, ''), // Puxa o CPF do Passo 1
                      },
                      // --- FIM DA ALTERAÇÃO ---
                    },
                  }}
                  customization={paymentBrickCustomization}
                  onSubmit={handleCardPaymentSubmit} 
                  onError={(error) => {
                    console.error("Erro no Brick:", error);
                    setPaymentError(error.message || "Erro ao processar dados de pagamento.");
                  }}
                  onReady={() => console.log("Brick de Cartão pronto.")}
                />
              </div>

              {/* Divisor OU */}
              <div className="flex items-center gap-2 my-4">
                <hr className="flex-grow border-t border-gray-200" />
                <span className="text-sm text-gray-500">OU</span>
                <hr className="flex-grow border-t border-gray-200" />
              </div>

              {/* --- Botão de Pagar com PIX --- */}
              <button
                type="button"
                onClick={handlePixPayment}
                className={`w-full h-11 flex items-center justify-center text-base font-semibold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-70`}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Icon icon={QrCode} className="w-5 h-5 mr-2" /> Pagar com PIX</>}
              </button>
            </div>
          )}
          
          {/* --- NOVO: PASSO 3: Exibição do PIX --- */}
          {step === 3 && (
            <div className="space-y-4">
              {pixData && (
                <div className="flex flex-col items-center">
                  <p className="text-sm text-gray-600 mb-2">Escaneie o QR Code ou copie o código:</p>
                  <img
                    src={`data:image/png;base64,${pixData.qr_code_base64}`}
                    alt="PIX QR Code"
                    className="w-60 h-60 border border-gray-300 rounded-lg"
                  />
                  <textarea
                    readOnly
                    value={pixData.qr_code}
                    className="w-full p-2 mt-4 border border-gray-300 rounded-lg text-xs font-mono bg-gray-50 resize-none h-28"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(pixData.qr_code)}
                    className={`w-full h-11 mt-2 flex items-center justify-center text-base font-semibold text-white ${CIANO_COLOR_BG} rounded-lg shadow-sm ${CIANO_COLOR_BG_HOVER} transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2`}
                  >
                    <Icon icon={copied ? Check : Copy} className="w-5 h-5 mr-2" />
                    {copied ? "Copiado!" : "Copiar Código PIX"}
                  </button>
                  <p className="text-sm text-gray-500 mt-4">
                    Após o pagamento, seu acesso será liberado.
                  </p>
                  <button
                    onClick={() => navigate('/login')}
                    className="text-sm text-cyan-600 hover:underline font-medium mt-2"
                  >
                    Ir para o Login
                  </button>
                </div>
              )}
            </div>
          )}

          {/* --- Loading Global (para o PIX) --- */}
          {loading && step !== 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processando...</span>
            </div>
          )}

          {/* Link de Login (Sempre visível, exceto no PIX) */}
          {step !== 3 && (
            <div className="text-center text-sm text-gray-600 pt-4 border-t border-gray-100">
              Já tem uma conta?{' '}
              <Link to="/login" className={`font-semibold ${CIANO_COLOR_TEXT} hover:underline`}>
                Acesse seu Painel <Icon icon={LogIn} className="w-4 h-4 inline" />
              </Link>
            </div>
          )}

        </div>
      </div>

      {/* 8. Footer */}
      <footer className="w-full text-center p-6 mt-8 text-xs text-gray-500">
        © {new Date().getFullYear()} Horalis. Todos os direitos reservados.
      </footer>
    </div>
  );
}

export default ProfissionalSignupPage;