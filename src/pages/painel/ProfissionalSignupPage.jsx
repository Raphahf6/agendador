// frontend/src/pages/painel/ProfissionalSignupPage.jsx
import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import { auth } from '@/firebaseConfig';
import { Link, useNavigate } from 'react-router-dom'; // Removido useParams (não usado)
import axios from 'axios';
import { Mail, Lock, User, Phone, ArrowRight, Loader2, LogIn, Check } from 'lucide-react'; // Ícones
import AOS from 'aos';
import 'aos/dist/aos.css';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// <<< DEFINIÇÕES DE COR >>>
const CIANO_COLOR_TEXT = 'text-cyan-600';
const CIANO_COLOR_BG = 'bg-cyan-600';
const CIANO_COLOR_BG_HOVER = 'hover:bg-cyan-700';
const CIANO_RING_FOCUS = 'focus:ring-cyan-400';
const CIANO_BORDER_FOCUS = 'focus:border-cyan-400';

// Helper Ícone Simples
const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} />
);

function ProfissionalSignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nomeSalao, setNomeSalao] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
    });
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validações
    if (password !== confirmPassword) {
      setError("As senhas não coincidem."); return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres."); return;
    }
    const cleanedWhatsapp = whatsapp.replace(/\D/g, '');
    if (cleanedWhatsapp.length < 10 || cleanedWhatsapp.length > 11) {
      setError("Telefone inválido. Use apenas números (DDD + Número)."); return;
    }
    const formattedWhatsapp = `+55${cleanedWhatsapp}`;

    setLoading(true);

    try {
      // Cria usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const token = await user.getIdToken();

      // Cria registro do salão via API
      const dataToSubmit = {
        nome_salao: nomeSalao.trim(),
        numero_whatsapp: formattedWhatsapp,
        calendar_id: email, // Usa e-mail como ID inicial
      };
      await axios.post(`${API_BASE_URL}/admin/clientes`, dataToSubmit, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Atualiza perfil Firebase (opcional)
      await updateProfile(user, { displayName: nomeSalao.trim() });

      // Sucesso
      await signOut(auth); // Força logout
      setSuccess("Cadastro concluído! Você já pode fazer o login.");
      setTimeout(() => {
        navigate(`/login`); // Redireciona para login
      }, 2500); // Aumentado um pouco o tempo

    } catch (err) {
      console.error("Erro no cadastro:", err.code, err.message, err.response);
      // Tratamento de erros (Firebase e API)
      if (err.code === 'auth/email-already-in-use') { setError("Este e-mail já está cadastrado. Tente fazer login."); }
      else if (err.code === 'auth/weak-password') { setError("A senha é muito fraca. Use pelo menos 6 caracteres."); }
      else if (err.code === 'auth/invalid-email') { setError("O formato do e-mail é inválido."); }
      else if (err.response?.status === 409) { setError("Este número de WhatsApp já está cadastrado no Horalis."); }
      else { setError("Erro ao criar conta ou cadastrar salão. Tente novamente."); }
      setLoading(false);
    }
    // setLoading(false) // Removido daqui para não resetar antes do redirect no sucesso
  };

  return (
    // <<< ALTERADO: Fundo cinza claro, fonte sans >>>
    <div className="min-h-screen w-full bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">

      <div className="w-full max-w-md" data-aos="fade-up">

        {/* 1. Logo Horalis */}
        <div className="text-center mb-8">
          <Link to="/">
             {/* <<< ALTERADO: Logo com texto cinza escuro/preto >>> */}
            <h1 className="text-4xl font-bold text-gray-900">
              Horalis
            </h1>
          </Link>
          <p className="text-gray-600 mt-2">Crie sua conta profissional</p>
        </div>

        {/* 2. O Card Branco */}
        <div className="bg-white p-8 shadow-lg border border-gray-200 rounded-xl">

          {/* Mensagem de Sucesso */}
          {success ? (
            <div className="text-center space-y-4 py-4"> {/* Adicionado padding vertical */}
               {/* <<< ALTERADO: Ícone check verde >>> */}
              <Icon icon={Check} className="w-16 h-16 text-green-500 mx-auto bg-green-100 rounded-full p-3" />
              <h3 className="text-xl font-semibold text-gray-800">Sucesso!</h3>
              <p className="text-gray-600">{success}</p>
               {/* <<< ALTERADO: Link ciano >>> */}
              <Link to="/login" className={`inline-block font-medium ${CIANO_COLOR_TEXT} hover:underline`}>
                  Ir para o Login
              </Link>
            </div>
          ) : (

          /* Formulário de Cadastro */
          <form onSubmit={handleSignup} className="space-y-4"> {/* Diminuído space-y */}

            {/* 1. Dados do Salão */}
            <div className="space-y-1">
              <label htmlFor="nomeSalao" className="text-sm font-medium text-gray-700">Nome do Salão</label>
              <div className="relative">
                <Icon icon={User} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="nomeSalao" type="text" placeholder="Nome do seu estabelecimento" required
                  // <<< ALTERADO: Ring/border ciano no focus >>>
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
                   // <<< ALTERADO: Ring/border ciano no focus >>>
                  className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg h-11 focus:outline-none focus:ring-2 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`}
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* 2. Dados de Acesso */}
            <div className="space-y-1 pt-3 border-t border-gray-100"> {/* Diminuído pt */}
              <label htmlFor="email" className="text-sm font-medium text-gray-700">Seu E-mail (para Login)</label>
              <div className="relative">
                <Icon icon={Mail} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email" type="email" placeholder="seuemail@exemplo.com" required
                   // <<< ALTERADO: Ring/border ciano no focus >>>
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
                   // <<< ALTERADO: Ring/border ciano no focus >>>
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
                   // <<< ALTERADO: Ring/border ciano no focus (erro mantém vermelho) >>>
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg h-11 focus:outline-none focus:ring-2 ${
                      confirmPassword && password !== confirmPassword
                      ? 'border-red-500 focus:ring-red-400 focus:border-red-500' // Mantém erro vermelho
                      : `border-gray-300 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`
                  }`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
               // <<< ALTERADO: Fundo ciano sólido >>>
              className={`w-full h-11 flex items-center justify-center text-base font-semibold text-white ${CIANO_COLOR_BG} rounded-lg shadow-sm ${CIANO_COLOR_BG_HOVER} transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-70`}
              disabled={loading}
            >
              {loading ? (
                 <Loader2 className="w-5 h-5 animate-spin stroke-current" />
              ) : (
                <>
                  <Icon icon={ArrowRight} className="w-5 h-5 mr-2" /> Criar minha conta
                </>
              )}
            </button>

            {/* 7. Link de Login */}
            <div className="text-center text-sm text-gray-600 pt-4 border-t border-gray-100">
              Já tem uma conta?{' '}
               {/* <<< ALTERADO: Link ciano >>> */}
              <Link to="/login" className={`font-semibold ${CIANO_COLOR_TEXT} hover:underline`}>
                Acesse seu Painel <Icon icon={LogIn} className="w-4 h-4 inline" />
              </Link>
            </div>
          </form>
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