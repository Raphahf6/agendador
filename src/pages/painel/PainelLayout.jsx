// frontend/src/pages/painel/PainelLayout.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useLocation, useParams, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import {
  Calendar, Settings, Scissors, Palette, Menu, LogOut, X, TimerIcon,
  LayoutDashboard, CreditCard, BarChart2
} from 'lucide-react';
import axios from 'axios';
import LoadingSpinner from '@/components/LoadingSpinner';
// <<< MUDANÇAS AQUI >>>
import { signOut, onAuthStateChanged } from "firebase/auth"; // Importa o onAuthStateChanged
import { auth } from '@/firebaseConfig';
import toast from 'react-hot-toast'; // Importa o toast para avisos
// <<< FIM DAS MUDANÇAS >>>

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

const navigation = [
  { name: 'Visão Geral', href: 'visaoGeral', icon: BarChart2 },
  { name: 'Calendário', href: 'calendario', icon: Calendar },
  { name: 'Meus Serviços', href: 'servicos', icon: Scissors },
  { name: 'Horario de Funcionamento', href: 'horarios', icon: TimerIcon },
  { name: 'Pagina de Agendamento e Personalização', href: 'personalizacao', icon: Palette },
  { name: 'Assinatura', href: 'assinatura', icon: CreditCard },
  { name: 'Configurações', href: 'configuracoes', icon: Settings },
];

// Helper Ícone Simples
const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);


function PainelLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { salaoId } = useParams();
  const [salonDetails, setSalonDetails] = useState(null);
  const [loading, setLoading] = useState(true); // Este agora é o loading principal
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("Log-out de profissional bem-sucedido.");
      navigate('/login', { replace: true });
    } catch (e) {
      console.error("Erro ao fazer Log-out:", e);
      navigate('/login', { replace: true });
    }
  };

  // --- <<< MUDANÇA CRÍTICA: useEffect agora verifica Auth + Assinatura >>> ---
  useEffect(() => {
    if (!salaoId) {
      setError("ID do salão não fornecido na URL.");
      setLoading(false);
      return;
    }

    // 1. Inicia o listener do Firebase Auth para saber QUEM está logado
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 2. Usuário está logado. Vamos buscar seus dados protegidos.
        setLoading(true);
        setError(null);
        try {
          const token = await user.getIdToken();

          // 3. CHAMA O ENDPOINT PROTEGIDO
          // (Que agora verifica o status da assinatura no backend)
          const response = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.data) {
            // 4. SUCESSO: Assinatura 'active' ou 'trialing' válida
            setSalonDetails(response.data);
          } else {
            throw new Error("Formato de resposta inesperado.");
          }
        } catch (err) {
          console.error("Erro ao buscar dados do salão:", err.response);

          // 5. FALHA: Captura o erro 403 (Assinatura não ativa)
          if (err.response?.status === 403) {
            toast.error("Sua assinatura não está ativa. Por favor, complete o pagamento.");
            // Redireciona IMEDIATAMENTE para a página de assinatura
            navigate(`/painel/${salaoId}/assinatura`, { replace: true });
          } else {
            // Outro erro (ex: 404, 500)
            setError(err.response?.data?.detail || "Não foi possível carregar os dados do salão.");
            // Se o token for inválido, desloga
            if (err.response?.status === 401) {
              handleLogout();
            }
          }
        } finally {
          setLoading(false);
        }
      } else {
        // 6. Usuário NÃO está logado
        console.log("Nenhum usuário logado, redirecionando para /login...");
        navigate('/login', { replace: true });
      }
    });

    // Cleanup do listener
    return () => unsubscribe();

  }, [salaoId, navigate]); // Adiciona 'navigate' às dependências
  // --- <<< FIM DA MUDANÇA >>> ---


  const isCurrent = (pathSuffix) => location.pathname === `/painel/${salaoId}/${pathSuffix}`;

  // Renderização condicional (Loading/Error)
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <LoadingSpinner />
        <p className="ml-3 text-gray-600">Carregando painel...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-50 p-4">
        <p className="text-red-700 text-center">{error}</p>
      </div>
    );
  }

  // Se não está carregando e não deu erro, os 'salonDetails' existem
  // e o usuário está "active", então podemos renderizar o painel.
  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Sidebar Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          {/* Overlay */}
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
          {/* Conteúdo Sidebar */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            {/* Botão Fechar */}
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Fechar sidebar</span>
                <Icon icon={X} className="h-6 w-6 text-white" />
              </button>
            </div>
            {/* Logo/Nome (Mobile) */}
            <div className="flex-shrink-0 px-4 pt-5 pb-4 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">Horalis</h1>
              <p className="text-sm text-gray-500 mt-1 truncate">
                {salonDetails?.nome_salao || 'Carregando...'}
              </p>
            </div>
            {/* Navegação (Mobile) */}
            <div className="mt-5 flex-1 h-0 overflow-y-auto">
              <nav className="px-2 space-y-1">
                {navigation.map((item) => {
                  const targetPath = `/painel/${salaoId}/${item.href}`;
                  const current = isCurrent(item.href);
                  return (
                    <NavLink
                      key={item.name}
                      to={targetPath}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        current ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        'group flex items-center px-2 py-2 text-base font-medium rounded-md'
                      )}
                    >
                      <Icon icon={item.icon} className={cn(current ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500', 'mr-4 flex-shrink-0 h-6 w-6')} />
                      {item.name}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
            {/* Botão Sair (Mobile) */}
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center group px-2 py-2 text-base font-medium text-gray-600 rounded-md hover:bg-red-50 hover:text-red-700"
              >
                <Icon icon={LogOut} className="mr-4 h-6 w-6 text-gray-400 group-hover:text-red-500" />
                Sair
              </button>
            </div>
          </div>
          <div className="flex-shrink-0 w-14" aria-hidden="true"></div> {/* Para empurrar o conteúdo */}
        </div>
      )}

      {/* Sidebar Desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow border-r border-gray-200 bg-white overflow-y-auto">
          {/* Logo/Nome (Desktop) */}
          <div className="flex items-center flex-shrink-0 px-4 pt-5 pb-4 border-b border-gray-200">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-gray-900">Horalis</h1>
              <p className="text-sm text-gray-500 mt-0.5 truncate" title={salonDetails?.nome_salao}>
                {salonDetails?.nome_salao || 'Carregando...'}
              </p>
            </div>
          </div>
          {/* Navegação (Desktop) */}
          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              {navigation.map((item) => {
                const targetPath = `/painel/${salaoId}/${item.href}`;
                const current = isCurrent(item.href);
                return (
                  <NavLink
                    key={item.name}
                    to={targetPath}
                    className={cn(
                      current ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                    )}
                  >
                    <Icon icon={item.icon} className={cn(current ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500', 'mr-3 flex-shrink-0 h-6 w-6')} />
                    {item.name}
                  </NavLink>
                );
              })}
            </nav>
          </div>
          {/* Botão Sair (Desktop) */}
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center group px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-red-50 hover:text-red-700"
            >
              <Icon icon={LogOut} className="mr-3 h-6 w-6 text-gray-400 group-hover:text-red-500" />
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* --- Conteúdo Principal --- */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen">
        {/* Header Mobile (Botão Menu) */}
        <div className="sticky top-0 z-10 lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-100 border-b border-gray-200">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-500"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Abrir sidebar</span>
            <Icon icon={Menu} className="h-6 w-6" />
          </button>
        </div>

        {/* Área de conteúdo principal */}
        <main className="flex-1 bg-gray-100">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet /> {/* Renderiza CalendarioPage, ServicosPage, etc. */}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default PainelLayout;