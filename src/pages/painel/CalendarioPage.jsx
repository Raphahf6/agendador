// frontend/src/pages/painel/CalendarioPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios'; 
import HoralisFullCalendar from '@/components/HoralisFullCalendar';
import { 
  format, 
  addMonths, 
  subMonths,
} from 'date-fns'; 
import { Loader2 } from "lucide-react"; 
// --- NOVO IMPORT ---
import { auth } from '@/firebaseConfig'; // Importa a instância de autenticação
// --- FIM DO NOVO IMPORT ---


const API_BASE_URL = "https://api-agendador.onrender.com/api/v1"; 

function CalendarioPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { salaoId } = useParams(); 
  
  // --- REMOÇÃO DO MOCK_TOKEN e ADIÇÃO DO OBSERVER ---
  // A lógica de user/token será gerenciada no useEffect e passará a ser REAL
  const [user, setUser] = useState(null); // Estado para o usuário autenticado
  // --- FIM DA REMOÇÃO ---

  // Observa o estado de autenticação (Garante que o componente sabe quando o login acontece)
 

  // Função para buscar os eventos (compatível com a API FullCalendar)
  const fetchEvents = useCallback(async (fetchInfo, successCallback, failureCallback) => {
    
    // 1. OBTEM O TOKEN REAL
    const currentUser = auth.currentUser;
    if (!currentUser) {
        // Se o usuário não estiver logado, não pode buscar.
        failureCallback({ message: "Sessão expirada. Faça login novamente." });
        // Redirecionamento deve ser tratado no componente ProtectedRoute do App.jsx
        return;
    }
    // Obtém o token JWT real do Firebase
    const token = await currentUser.getIdToken(); 
    // FIM DA OBTENÇÃO DO TOKEN REAL

    if (!events.length) setLoading(true); 
    setError(null);

    try {
      const start = format(fetchInfo.start, "yyyy-MM-dd'T'HH:mm:ssXXX"); 
      const end = format(fetchInfo.end, "yyyy-MM-dd'T'HH:mm:ssXXX");     

      const response = await axios.get(`${API_BASE_URL}/admin/calendario/${salaoId}/eventos`, {
        headers: {
          Authorization: `Bearer ${token}` // <<< ENVIA O TOKEN REAL AQUI
        },
        params: {
          start: start,
          end: end
        }
      });
      
      console.log(`[FullCalendar] Sucesso: Recebidos ${response.data.length} eventos.`);

      if (Array.isArray(response.data)) {
         setEvents(response.data); 
         successCallback(response.data); 
      } else {
         throw new Error("Resposta da API de eventos não é um array válido.");
      }

    } catch (err) {
      console.error("[FullCalendar] ERRO ao buscar:", err.response?.data?.detail || err.message);
      const errorMsg = err.response?.data?.detail || err.message || "Não foi possível carregar os agendamentos.";
      setError(errorMsg);
      failureCallback({ message: errorMsg }); 
    } finally {
      if (!events.length) setLoading(false); 
    }
  }, [salaoId]); // Depende apenas do salaoId


  // Hook para disparar a primeira busca
  useEffect(() => {
    // Dispara a primeira busca manualmente na montagem, se o usuário estiver presente
    if (auth.currentUser && !events.length) { 
        const today = new Date();
        const initialFetchInfo = {
            start: subMonths(today, 1),
            end: addMonths(today, 3)
        };
        // Chama a função de busca com os argumentos do FullCalendar
        fetchEvents(initialFetchInfo, (events) => setEvents(events), (error) => setError(error));
    }
  }, [salaoId, events.length, fetchEvents]);


  // Renderização de Loading ou Erro inicial
  

  if (error) { /* ... (JSX de erro) ... */ }

  // --- Renderização Principal ---
  return (
    <div>
      <HoralisFullCalendar
        // Passamos a função fetchEvents (que usa o token real) para o FullCalendar
        events={fetchEvents} 
        initialEvents={events} // Passa o array de eventos para renderização inicial
      />
    </div>
  );
}

export default CalendarioPage;