// frontend/src/pages/painel/PainelLayout.jsx
// (Agora busca os dados do salão com base no ID da URL)

import React, { useState, useEffect, useCallback } from 'react';
// Importa useParams para ler o ID da URL
import { NavLink, Outlet, useLocation, useParams, useNavigate} from 'react-router-dom'; 
import { cn } from "@/lib/utils"; 
import {
  Calendar,
  Settings,
  Scissors,
  Palette,
  Menu,
  LogOut,
  X,
  LayoutDashboard,
  TimerIcon
} from 'lucide-react';
import axios from 'axios'; // Para buscar os dados
import { ImageWithFallback } from '@/ui/ImageWithFallback'; // Para a logo
import LoadingSpinner from '@/components/LoadingSpinner'; // Para o loading
import { signOut } from "firebase/auth"; // Para o log-out
import { auth } from '@/firebaseConfig'; // Importa a instância de autenticação

// API Config (Mesma do frontend cliente)
const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// Itens do Menu (sem alterações)
const navigation = [
  { name: 'Calendário', href: 'calendario', icon: Calendar },
  { name: 'Meus Serviços', href: 'servicos', icon: Scissors },
  { name: 'Horario de Funcionamento', href: 'horarios', icon: TimerIcon },
  { name: 'Personalização', href: 'personalizacao', icon: Palette },
  { name: 'Configurações', href: 'configuracoes', icon: Settings },
];

function PainelLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation(); 
  
  // --- NOVOS ESTADOS PARA BUSCAR DADOS DO SALÃO ---
  const { salaoId } = useParams(); // Pega o ID (ex: +5511...) da URL
  const [salonDetails, setSalonDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); 
  // --- FIM DOS NOVOS ESTADOS ---

  const handleLogout = async () => {
    
    try {
      await signOut(auth); // Desloga o usuário do Firebase
      console.log("Log-out de profissional bem-sucedido.");
      // Redireciona para a página de login principal
      navigate('/login', { replace: true }); 
    } catch (e) {
      console.error("Erro ao fazer Log-out:", e);
      // Se a sessão expirou, apenas redireciona para a página de login
      navigate('/login', { replace: true }); 
    }
  };

  // --- EFEITO PARA BUSCAR OS DADOS DO SALÃO ---
  useEffect(() => {
    if (!salaoId) {
      setError("ID do salão não fornecido na URL.");
      setLoading(false);
      return;
    }

    const fetchSalonData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Usamos o mesmo endpoint público que a página de agendamento usa
        const response = await axios.get(`${API_BASE_URL}/saloes/${salaoId}/servicos`);
        if (response.data) {
          setSalonDetails(response.data);
        } else {
          throw new Error("Formato de resposta inesperado.");
        }
      } catch (err) {
        console.error("Erro ao buscar dados do salão:", err);
        setError(err.response?.data?.detail || "Não foi possível carregar os dados do salão.");
      } finally {
        setLoading(false);
      }
    };

    fetchSalonData();
  }, [salaoId]); // Busca sempre que o salaoId na URL mudar
  // --- FIM DO EFEITO ---

  // Função para verificar se o link está ativo
  // Modificada para funcionar com o 'useParams' (não precisamos mais de hrefBase)
  const isCurrent = (pathSuffix) => location.pathname === `/painel/${salaoId}/${pathSuffix}`;

  // --- RENDERIZAÇÃO CONDICIONAL ---
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
      <div className="flex min-h-screen items-center justify-center bg-red-50">
        <p className="p-4 text-red-700">{error}</p>
      </div>
    );
  }
  // --- FIM DA RENDERIZAÇÃO CONDICIONAL ---


  return (
    <div>
      {/* Menu Lateral Mobile (escondido em telas maiores) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Fechar sidebar</span>
                <X className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            {/* Logo e Navegação (Mobile) */}
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                 {/* --- LOGO DINÂMICA --- */}
                 {salonDetails?.url_logo ? (
                     <ImageWithFallback 
                        src={salonDetails.url_logo} 
                        alt={salonDetails.nome_salao}
                        className="h-10 w-10 rounded-full object-cover"
                     />
                 ) : (
                     <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                       Horalis
                     </h1>
                 )}
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => {
                  // Links agora são relativos ao salaoId
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
                      <item.icon className={cn( current ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500', 'mr-4 flex-shrink-0 h-6 w-6' )} aria-hidden="true" />
                      {item.name}
                    </NavLink>
                    
                  );
                })}

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-2 py-2 mt-4 text-base font-medium text-red-600 rounded-md hover:bg-red-50 hover:text-red-700 transition-colors"
                >
                    <LogOut className="mr-4 flex-shrink-0 h-6 w-6" aria-hidden="true" />
                    Sair
                </button>
              </nav>
            </div>
          </div>
          <div className="flex-shrink-0 w-14" aria-hidden="true"></div>
        </div>
      )}

      {/* Menu Lateral Desktop (fixo) */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow border-r border-gray-200 pt-5 bg-white overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 space-x-3">
             {/* --- LOGO E NOME DINÂMICOS --- */}
             {salonDetails?.url_logo && (
                 <ImageWithFallback 
                    src={salonDetails.url_logo} 
                    alt={salonDetails.nome_salao}
                    className="h-10 w-10 rounded-full object-cover"
                 />
             )}
             <h1 className="text-2xl font-bold bg-gradient bg-clip-text text-transparent"style={{ backgroundImage: `linear-gradient(to right, ${salonDetails.cor_primaria}, ${salonDetails.cor_secundaria})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
               {salonDetails?.nome_salao || 'Horalis'}
             </h1>
          </div>
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
                      <item.icon className={cn( current ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500', 'mr-3 flex-shrink-0 h-6 w-6' )} aria-hidden="true" />
                      {item.name}
                    </NavLink>
                 );
              })}
              <div className="px-2 pb-4 pt-2 border-t border-gray-200">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-2 py-2 text-sm font-medium'text-gray-700 rounded-md hover:bg-red-50 hover:text-gray-700 transition-colors"
                >
                    <LogOut className="mr-3 flex-shrink-0 h-6 w-6" aria-hidden="true" />
                    Sair
                </button>
            </div>
            {/* --- FIM BOTÃO LOG-OUT DESKTOP --- */}
            </nav>
          </div>
        </div>
      </div>

      {/* --- Conteúdo Principal --- */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Header (apenas em mobile, para o botão 'Menu') */}
        <div className="sticky top-0 z-10 lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-100">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Abrir sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Área de conteúdo principal */}
        <main className="flex-1 bg-gray-100">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {/* O <Outlet /> renderiza o componente da sub-rota */}
              <Outlet /> 
            </div>
          </div>
        </main>
      </div>
       <footer className="w-full text-center p-6 mt-8 text-xs text-gray-500">
        © {new Date().getFullYear()} Horalis. Todos os direitos reservados.
      </footer>
    </div>
  )
}

export default PainelLayout;