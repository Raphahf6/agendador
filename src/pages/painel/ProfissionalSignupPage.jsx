// frontend/src/pages/painel/ProfissionalSignupPage.jsx
import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth"; // Adicionado updateProfile
import { auth } from '@/firebaseConfig'; // Importa do seu config
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios'; // Para chamar a API e registrar o salão

// URL da API (usada para registrar o salão no backend)
const API_BASE_URL = "http://localhost:8000/api/v1"; 

function ProfissionalSignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomeSalao, setNomeSalao] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { salaoId } = useParams(); // Pega o ID da URL

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // 1. Validação de Senha/Campos
    if (password.length < 6) {
        setError("A senha deve ter pelo menos 6 caracteres.");
        return;
    }
    if (whatsapp.length < 10) { // Validação simples
        setError("Por favor, preencha o número do WhatsApp completo (DDD+Número).");
        return;
    }
    
    // Garante que o número começa com +55 (para o modelo Pydantic do backend)
    const formattedWhatsapp = whatsapp.startsWith('+') ? whatsapp : `+55${whatsapp.replace(/\D/g, '')}`; 

    setLoading(true);

    try {
      // 2. CRIAÇÃO DO USUÁRIO NO FIREBASE
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 3. REGISTRO DO SALÃO NO FIRESTORE VIA BACKEND (USANDO TOKEN)
      // O endpoint de cadastro de cliente (POST /admin/clientes) que criamos 
      // é PROTEGIDO. Para acessá-lo, o próprio usuário precisa gerar um token.
      
      // O problema é que o usuário acabou de ser criado e não está logado como admin ainda.
      // O fluxo ideal é: Criar usuário -> Logar o usuário -> Gerar Token -> Chamar API.
      // No entanto, vamos assumir que ESTA rota (de cadastro inicial) é TEMPORARIAMENTE
      // pública no backend ou que o usuário precisará fazer login manualmente após o cadastro.

      // Para o self-service, vamos usar o token de admin MOCK temporariamente no backend para criar a conta
      // OU, como o cadastro no Firebase foi BEM SUCEDIDO, agora usamos a API para criar o salão no Firestore:
      
      const token = await user.getIdToken(); // Gera um token para autenticar no POST /admin/clientes

      // Prepara os dados para a API (NewClientData)
      const dataToSubmit = {
        nome_salao: nomeSalao.trim(),
        numero_whatsapp: formattedWhatsapp, // O ID único
        calendar_id: email, // Usamos o e-mail como ID inicial do calendário
        tagline: "Sua nova agenda Horalis",
        // O resto dos campos (dias, horas, cores) usarão os defaults do backend
      };
      
      // Chamada à API para criar o documento do Salão no Firestore
      const response = await axios.post(`${API_BASE_URL}/admin/clientes`, dataToSubmit, {
        headers: {
          Authorization: `Bearer ${token}` // Autentica com o token do novo usuário (será verificado no backend)
        }
      });
      
      // 4. Se o salão foi criado no Firestore (status 201), atualiza o nome de exibição no Firebase
      await updateProfile(user, { displayName: nomeSalao.trim() });

      // 5. Redireciona o usuário (já logado) para o seu painel
      setSuccess("Cadastro concluído! Aceda ao seu painel.");
      setTimeout(() => {
        navigate(`/painel/${formattedWhatsapp}/calendario`, { replace: true });
      }, 1500);


    } catch (err) {
      console.error("Erro no cadastro:", err.code, err.message);

      // Se a conta Firebase foi criada, mas a chamada à API falhou, a conta precisa ser deletada
      if (userCredential?.user) {
          await signOut(auth); // Desloga o usuário
          // auth.deleteUser(userCredential.user.uid); // Não podemos fazer isso do frontend, o admin backend faria
      }

      if (err.code === 'auth/email-already-in-use') {
        setError("Este e-mail já está cadastrado. Faça login.");
      } else if (err.code === 'auth/weak-password') {
         setError("A senha é muito fraca. Use pelo menos 6 caracteres.");
      } else if (err.code === 'auth/invalid-email') {
         setError("O formato do e-mail é inválido.");
      } else if (err.response?.status === 409) {
         setError("Este número de WhatsApp já está cadastrado no Horalis.");
      } else {
        setError("Erro ao criar conta ou cadastrar salão. Tente novamente.");
      }
      
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] bg-gray-50/50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-center text-gray-800">Cadastre Seu Salão</h2>
        <p className="text-sm text-center text-gray-600">Crie seu login de administrador do Horalis.</p>
        
        <form onSubmit={handleSignup} className="space-y-4">
          
          {/* Campo Nome do Salão */}
          <div>
            <label htmlFor="nomeSalao" className="block text-sm font-medium text-gray-700 mb-1"> Nome do Salão </label>
            <input
              id="nomeSalao" type="text" required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              value={nomeSalao}
              onChange={(e) => setNomeSalao(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Campo WhatsApp */}
          <div>
            <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1"> WhatsApp (para ID) </label>
            <input
              id="whatsapp" type="tel" required
              placeholder="11987654321"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Campo Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1"> Seu E-mail (Login) </label>
            <input
              id="email" type="email" required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          
          {/* Campo Senha */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1"> Senha </label>
            <input
              id="password" type="password" required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs text-red-700 text-center">{error}</p>
            </div>
          )}
          {/* Mensagem de Sucesso */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-xs text-green-700 text-center">{success}</p>
            </div>
          )}

          {/* Botão de Cadastro */}
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" viewBox="0 0 24 24">...</svg>
              ) : (
                'Cadastrar e Entrar'
              )}
            </button>
          </div>
        </form>

        {/* Link para Login */}
        <p className="text-sm text-center text-gray-600 pt-4 border-t border-gray-200">
          Já tem uma conta?{' '}
          <Link 
             to={`/login`} 
             className="font-medium text-blue-600 hover:text-blue-500 underline"
          >
            Acesse seu Painel
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ProfissionalSignupPage;