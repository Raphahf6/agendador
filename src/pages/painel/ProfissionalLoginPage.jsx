// frontend/src/pages/painel/ProfissionalLoginPage.jsx
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from "firebase/auth";
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { auth } from '@/firebaseConfig'; 
import { User, Lock } from 'lucide-react';
import axios from 'axios'; // Para chamar o endpoint que busca o ID

// A URL base da API
const API_BASE_URL = "http://localhost:8000/api/v1"; 

function ProfissionalLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // O salaoId da URL (ex: /painel/default/login) não é mais usado para a rota final
  const { salaoId: initialSalaoId } = useParams(); 

  // Função para buscar o token e o ID do salão
  const getSalãoIdAndRedirect = async (user) => {
    // 1. Gera o token JWT real para autenticar no backend
    const token = await user.getIdToken();
    
    try {
      // 2. Chama o novo endpoint PROTEGIDO
      const response = await axios.get(`${API_BASE_URL}/admin/user/salao-id`, {
        headers: {
          Authorization: `Bearer ${token}` // Envia o token real
        }
      });
      
      const realSalãoId = response.data.salao_id;

      // 3. Redireciona para a rota FINAL (Painel/Calendário)
      const redirectPath = `/painel/${realSalãoId}/calendario`;
      
      console.log(`Login Profissional Sucedido. Redirecionando para: ${redirectPath}`);
      navigate(redirectPath, { replace: true }); 

    } catch (apiError) {
      console.error("Erro ao buscar ID do Salão:", apiError);
      
      // Se falhar, desloga o usuário (ele não pode acessar o painel)
      await auth.signOut(); 
      
      // Define o erro para o formulário
      setError(apiError.response?.data?.detail || "Erro ao conectar conta. Verifique seu cadastro no Horalis.");
    }
  };


  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Tenta fazer login no Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 2. Login Firebase bem-sucedido. Busca o ID real do salão
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
    <div className="flex flex-col items-center justify-center min-h-[50vh] bg-gray-100/50">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-center text-gray-800">Acesso ao Painel</h2>
        <p className="text-sm text-center text-gray-600">Acesse o painel de administração da sua agenda.</p>
        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Campo Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1"> E-mail </label>
             <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="email" type="email" required
                  className="mt-1 block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="Seu e-mail de administrador"
                />
             </div>
          </div>
          
          {/* Campo Senha */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1"> Senha </label>
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="password" type="password" required
                  className="mt-1 block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="Sua senha"
                />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs text-red-700 text-center">{error}</p>
            </div>
          )}

          {/* Botão de Login */}
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" viewBox="0 0 24 24">...</svg>
              ) : (
                'Entrar no Painel'
              )}
            </button>
          </div>
        </form>

        {/* Link para Cadastro */}
        <p className="text-sm text-center text-gray-600 pt-4 border-t border-gray-200">
          Ainda não tem cadastro?{' '}
          <Link 
             to={`/cadastro`} 
             className="font-medium text-purple-600 hover:text-purple-500 underline"
          >
            Cadastre-se agora
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ProfissionalLoginPage;