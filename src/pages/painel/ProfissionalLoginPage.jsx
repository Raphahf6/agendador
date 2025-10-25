// frontend/src/pages/painel/ProfissionalLoginPage.jsx
import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from "firebase/auth";
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { auth } from '@/firebaseConfig'; 
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react'; // Ícones
import axios from 'axios'; 
import AOS from 'aos'; // Para a animação
import 'aos/dist/aos.css'; // Estilos do AOS
import { Loader2 } from 'lucide-react';

// URL da API 
const API_BASE_URL = "https://api-agendador.onrender.com/api/v1"; 

function ProfissionalLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Inicializa o AOS
  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
    });
  }, []);

  // Função para buscar o token e o ID do salão
  const getSalãoIdAndRedirect = async (user) => {
    const token = await user.getIdToken();
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/user/salao-id`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const realSalãoId = response.data.salao_id;
      
      // Tenta redirecionar para onde o usuário queria ir (se houver)
      const from = location.state?.from;
      if (from && from.startsWith('/painel/')) {
        // Se o ID da URL for diferente do ID do usuário, redireciona para o ID correto
        if (from.includes(realSalãoId)) {
          navigate(from, { replace: true });
          return;
        }
      }
      
      // Redirecionamento padrão
      const redirectPath = `/painel/${realSalãoId}/calendario`;
      console.log(`Login Profissional Sucedido. Redirecionando para: ${redirectPath}`);
      navigate(redirectPath, { replace: true }); 

    } catch (apiError) {
      console.error("Erro ao buscar ID do Salão:", apiError);
      await auth.signOut(); 
      setError(apiError.response?.data?.detail || "Erro ao conectar conta. Verifique seu cadastro no Horalis.");
    }
  };


  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await getSalãoIdAndRedirect(user);

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
    // Container principal com o fundo gradiente suave
    <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex flex-col items-center justify-center p-4">
      
      {/* Container do Card com animação */}
      <div className="w-full max-w-md" data-aos="fade-up">
        
        {/* 1. Logo Horalis (no topo) */}
        <div className="text-center mb-6">
          <Link to="/"> {/* Link para a Landing Page */}
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Horalis
            </h1>
          </Link>
          <p className="text-gray-600 mt-1">Acesso ao Painel do Profissional</p>
        </div>

        {/* 2. O Card Branco */}
        <div className="bg-white p-8 shadow-xl border border-gray-100 rounded-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* 3. Campo Email (com ícone) */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  id="email" 
                  type="email" 
                  placeholder="seuemail@salao.com"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg h-12 focus:outline-none focus:ring-2 focus:ring-purple-400" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* 4. Campo Senha (com ícone) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">Senha</label>
                <Link to="/esqueci-senha" // Rota futura (placeholder)
                  className="text-xs font-medium text-purple-600 hover:text-purple-700 transition-colors"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  id="password" 
                  type="password"
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg h-12 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* 5. Erro (se houver) */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-center">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* 6. Botão (com gradiente) */}
            <button
              type="submit"
              className="w-full h-12 flex items-center justify-center text-base font-semibold text-white bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg shadow-md hover:from-pink-700 hover:to-purple-700 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-70 disabled:scale-100"
              disabled={loading}
            >
              {loading ? (
                 <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" /> Entrar
                </>
              )}
            </button>

            {/* 7. Link de Cadastro */}
            <div className="text-center text-sm text-gray-600 pt-6 border-t border-gray-100">
              Não tem uma conta?{' '}
              <Link to="/cadastro" className="font-semibold text-purple-600 hover:text-purple-700 hover:underline">
                Cadastre-se aqui <ArrowRight className="w-4 h-4 inline" />
              </Link>
            </div>
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