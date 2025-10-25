// frontend/src/pages/painel/ProfissionalSignupPage.jsx
import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import { auth } from '@/firebaseConfig'; 
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios'; 
import { Mail, Lock, User, Phone, ArrowRight, Loader2 } from 'lucide-react'; // Ícones
import AOS from 'aos'; // Para a animação
import 'aos/dist/aos.css'; // Estilos do AOS
import { LogIn,Check } from 'lucide-react';

// URL da API (deve estar correta para o seu ambiente)
const API_BASE_URL = "https://api-agendador.onrender.com/api/v1"; 

function ProfissionalSignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // Campo de confirmação de senha
  const [nomeSalao, setNomeSalao] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Inicializa o AOS
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
    
    // 1. Validação de Senha/Campos
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    // Remove caracteres não numéricos do WhatsApp
    const cleanedWhatsapp = whatsapp.replace(/\D/g, '');
    if (cleanedWhatsapp.length < 10 || cleanedWhatsapp.length > 11) { 
      setError("Telefone inválido. Use apenas números (DDD + Número).");
      return;
    }
    
    const formattedWhatsapp = `+55${cleanedWhatsapp}`; 

    setLoading(true);

    try {
      // 2. CRIAÇÃO DO USUÁRIO NO FIREBASE
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 3. REGISTRO DO SALÃO NO FIRESTORE VIA BACKEND (USANDO TOKEN)
      const token = await user.getIdToken(); // Gera um token para autenticar no POST /admin/clientes

      const dataToSubmit = {
        nome_salao: nomeSalao.trim(),
        numero_whatsapp: formattedWhatsapp, // O ID único
        calendar_id: email, // Usamos o e-mail como ID inicial do calendário (conforme lógica anterior)
        // O modelo NewClientData no backend aplicará os defaults (cores, tagline, etc.)
      };
      
      // Chamada à API para criar o documento do Salão no Firestore
      const response = await axios.post(`${API_BASE_URL}/admin/clientes`, dataToSubmit, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 4. Se o salão foi criado no Firestore (status 201), atualiza o nome de exibição no Firebase
      await updateProfile(user, { displayName: nomeSalao.trim() });

      // 5. Sucesso: Desloga o usuário e o envia para a página de login
      await signOut(auth); // Força o logout para que ele entre pelo fluxo normal

      setSuccess("Cadastro concluído! Você já pode fazer o login.");
      setTimeout(() => {
        navigate(`/painel/${numero_whatsapp}/calendario`); // Redireciona para a página de login
      }, 2000); // Atraso de 2s para mostrar a mensagem de sucesso

    } catch (err) {
      console.error("Erro no cadastro:", err.code, err.message);
      
      // Se a conta Firebase foi criada, mas a chamada à API falhou, precisamos
      // idealmente deletar o usuário do Firebase. (Isso é complexo e exige reautenticação)
      
      if (err.code === 'auth/email-already-in-use') {
        setError("Este e-mail já está cadastrado. Tente fazer login.");
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
          <p className="text-gray-600 mt-1">Crie sua conta profissional</p>
        </div>

        {/* 2. O Card Branco */}
        <div className="bg-white p-8 shadow-xl border border-gray-100 rounded-2xl">
          
          {/* Se houver sucesso, mostra a mensagem de sucesso */}
          {success ? (
            <div className="text-center space-y-4">
                <Check className="w-16 h-16 text-green-500 mx-auto bg-green-100 rounded-full p-3" />
                <h3 className="text-xl font-semibold text-gray-800">Sucesso!</h3>
                <p className="text-gray-600">{success}</p>
                <Link to="/login" className="inline-block font-medium text-purple-600 hover:text-purple-700 underline">
                    Ir para o Login
                </Link>
            </div>
          ) : (
          
          /* Caso contrário, mostra o formulário */
          <form onSubmit={handleSignup} className="space-y-4">
            
            {/* 1. Dados do Salão */}
            <div className="space-y-2">
              <label htmlFor="nomeSalao" className="text-sm font-medium text-gray-700">Nome do Salão</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  id="nomeSalao" type="text" placeholder="Nome do seu estabelecimento" required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg h-12 focus:outline-none focus:ring-2 focus:ring-purple-400" 
                  value={nomeSalao}
                  onChange={(e) => setNomeSalao(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="whatsapp" className="text-sm font-medium text-gray-700">Seu WhatsApp (para ID)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  id="whatsapp" type="tel" placeholder="DDD + Número (ex: 11987654321)" required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg h-12 focus:outline-none focus:ring-2 focus:ring-purple-400" 
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* 2. Dados de Acesso */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">Seu E-mail (para Login)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  id="email" type="email" placeholder="seuemail@exemplo.com" required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg h-12 focus:outline-none focus:ring-2 focus:ring-purple-400" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">Sua Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  id="password" type="password" placeholder="Mínimo 6 caracteres" required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg h-12 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirme sua Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  id="confirmPassword" type="password" placeholder="Repita a senha" required
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg h-12 focus:outline-none focus:ring-2 ${
                      confirmPassword && password !== confirmPassword 
                      ? 'border-red-500 focus:ring-red-400' 
                      : 'border-gray-300 focus:ring-purple-400'
                  }`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  <ArrowRight className="w-5 h-5 mr-2" /> Criar minha conta
                </>
              )}
            </button>

            {/* 7. Link de Login */}
            <div className="text-center text-sm text-gray-600 pt-6 border-t border-gray-100">
              Já tem uma conta?{' '}
              <Link to="/login" className="font-semibold text-purple-600 hover:text-purple-700 hover:underline">
                Acesse seu Painel <LogIn className="w-4 h-4 inline" />
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