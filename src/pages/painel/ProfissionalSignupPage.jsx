// frontend/src/pages/painel/ProfissionalSignupPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, User, Phone, Loader2, LogIn, Check, CreditCard } from 'lucide-react';
import AOS from 'aos';
import 'aos/dist/aos.css';

// --- <<< NOVOS IMPORTS DO MERCADO PAGO >>> ---
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
// --- <<< FIM DOS NOVOS IMPORTS >>> ---

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- <<< INICIALIZAÇÃO DO MERCADO PAGO >>> ---
// (Coloque sua Public Key aqui, encontrada no painel do MP)
initMercadoPago(MERCADO_PAGO_PUBLIC_KEY, {
  locale: 'pt-BR'
});
// --- <<< FIM DA INICIALIZAÇÃO >>> ---

// Definições de Cor (idênticas)
const CIANO_COLOR_TEXT = 'text-cyan-600';
const CIANO_COLOR_BG = 'bg-cyan-800';
const CIANO_COLOR_BG_HOVER = 'hover:bg-cyan-700';
const CIANO_RING_FOCUS = 'focus:ring-cyan-400';
const CIANO_BORDER_FOCUS = 'focus:border-cyan-400';

// Helper Ícone (idêntico)
const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} />
);

function ProfissionalSignupPage() {
  // Estados do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nomeSalao, setNomeSalao] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Estado para o Brick de Pagamento
  const [paymentError, setPaymentError] = useState(null);

  useEffect(() => {
    AOS.init({ duration: 800, once: true });
  }, []);

  // --- <<< MUDANÇA CRÍTICA: Lógica de Pagamento "On Submit" >>> ---
  // Esta função é chamada pelo *Brick do MercadoPago* quando o usuário clica em pagar.
  // Ela já contém os dados do cartão tokenizados (formData).
  const handlePaymentSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    setPaymentError(null);
    console.log("Formulário de pagamento submetido (Brick):", formData);

    // 1. Validações dos NOSSOS campos (email, senha, etc.)
    if (password !== confirmPassword) {
      setError("As senhas não coincidem."); setLoading(false); return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres."); setLoading(false); return;
    }
    const cleanedWhatsapp = whatsapp.replace(/\D/g, '');
    if (cleanedWhatsapp.length < 10 || cleanedWhatsapp.length > 11) {
      setError("Telefone inválido. Use apenas números (DDD + Número)."); setLoading(false); return;
    }
    const formattedWhatsapp = `+55${cleanedWhatsapp}`;

    // 2. Monta o Payload COMPLETO (Dados do User + Dados do Pagamento)
    const payload = {
      // Dados do Usuário
      email: email,
      password: password,
      nome_salao: nomeSalao.trim(),
      numero_whatsapp: formattedWhatsapp,

      // Dados do Pagamento (vindos do formData do Brick)
      token: formData.token,
      issuer_id: formData.issuer_id,
      payment_method_id: formData.payment_method_id,
      transaction_amount: formData.transaction_amount,
      installments: formData.installments,
      payer: {
        email: formData.payer.email,
        identification: formData.payer.identification,
      }
    };

    // 3. Envia TUDO para o backend processar
    try {
      // Este é um NOVO endpoint que vamos criar no backend
      const response = await axios.post(`${API_BASE_URL}/auth/criar-conta-paga`, payload);

      // 4. Sucesso! Backend processou o pagamento.
      console.log("Resposta do Backend:", response.data);
      setLoading(false);

      // Redireciona para o login com uma mensagem de sucesso
      navigate('/login?cadastro=sucesso');

    } catch (err) {
      // 5. Erro!
      console.error("Erro no processo de cadastro/pagamento:", err.response);
      setLoading(false);

      // Mostra o erro vindo do backend (Ex: "Fundos insuficientes", "E-mail já existe")
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Não foi possível processar seu pagamento. Verifique os dados.");
      }
    }
  };
  // --- <<< FIM DA NOVA LÓGICA >>> ---

  // Configurações visuais do Brick de Pagamento
  const paymentBrickCustomization = {
    theme: 'default', // ou 'dark', 'bootstrap'
    visual: {
      style: {
        theme: 'default', // 'default' (fundo branco) ou 'bootstrap' (fundo cinza)
      }
    },
    paymentMethods: {
      creditCard: 'all',
      // (Você pode desabilitar outros se quiser)
      // debitCard: 'all',
      // ticket: 'all',
      // bankTransfer: 'all',
      // pix: 'all',
    },
  };

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
          <p className="text-gray-600 mt-2">Crie sua conta profissional</p>
        </div>

        {/* 2. O Card Branco */}
        <div className="bg-white p-8 shadow-lg border border-gray-200 rounded-xl">
          {/* Este não é mais um <form> real. 
            O "Payment" Brick do MP cuida da submissão. 
          */}
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

            {/* --- Resumo do Preço --- */}
            {/* ... (código idêntico) ... */}

            {/* 5. Erro (Nosso Erro Interno) */}
            {error && (
              <div className="p-3 bg-red-100 border border-red-200 rounded-md text-center">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* --- <<< NOVO: Container de Pagamento Brick >>> --- */}
            <div className="pt-4 mt-4 border-t border-gray-100">
              <label className="text-sm font-medium text-gray-700">Dados de Pagamento</label>
              <div id="payment-brick-container" className="mt-2">
                <Payment
                  initialization={{
                    amount: 19.90, // O PREÇO QUE VOCÊ ME DISSE
                    preferenceId: null, // Não usamos preferenceId para este fluxo
                    payer: {
                      email: email, // Pré-preenche o email
                    },
                  }}
                  customization={paymentBrickCustomization}
                  onSubmit={handlePaymentSubmit}
                  onError={(error) => {
                    // Erro do Brick (ex: CPF inválido)
                    console.error("Erro no Brick:", error);
                    setPaymentError(error.message || "Erro ao processar dados de pagamento.");
                  }}
                  onReady={() => {
                    // Callback quando o Brick está pronto
                    console.log("Brick de pagamento pronto.");
                  }}
                />
                {paymentError && (
                  <p className="text-sm text-red-600 mt-2">{paymentError}</p>
                )}
              </div>
            </div>
            {/* --- <<< FIM DO BRICK >>> --- */}

            {/* O botão "Pagar" agora é renderizado DENTRO do Brick <Payment> */}
            {/* Por isso, o botão de submit antigo foi removido. */}

            {/* 7. Link de Login */}
            <div className="text-center text-sm text-gray-600 pt-4 border-t border-gray-100">
              Já tem uma conta?{' '}
              <Link to="/login" className={`font-semibold ${CIANO_COLOR_TEXT} hover:underline`}>
                Acesse seu Painel <Icon icon={LogIn} className="w-4 h-4 inline" />
              </Link>
            </div>
          </div>
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