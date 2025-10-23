import React, { useState, useEffect } from 'react';
import axios from 'axios';

// O ID do salão será fixo por enquanto. No futuro, ele virá da URL.
// Use o ID de teste que você cadastrou.
// ATENÇÃO: Use a porta 8000 se o seu FastAPI estiver rodando lá.
const API_BASE_URL = "https://api-agendador.onrender.com/"; 

function ServiceList({ salaoId, onDataLoaded, onServiceClick }) {
  
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
    let isMounted = true;
    const fetchSalonData = async () => {
        if (!salaoId) { /* ... (erro ID não fornecido) ... */ return; }
        if (isMounted) { setLoading(true); setError(null); }

        let salonDetails = null;
        let servicesData = [];
        let fetchError = null;

        try {
            
             const response = await axios.get(`${API_BASE_URL}/saloes/${salaoId}/servicos`, {
             
            });
           

            // --- VALIDAÇÃO DA RESPOSTA ---
            if (response.data && typeof response.data === 'object') {
                salonDetails = { // Extrai detalhes com fallbacks seguros
                    nome_salao: response.data.nome_salao || 'Nome Indefinido',
                    tagline: response.data.tagline || '',
                    url_logo: response.data.url_logo || null,
                    cor_primaria: response.data.cor_primaria || '#6366F1',
                    cor_secundaria: response.data.cor_secundaria || '#EC4899',
                    cor_gradiente_inicio: response.data.cor_gradiente_inicio || '#F3E8FF',
                    cor_gradiente_fim: response.data.cor_gradiente_fim || '#FFFFFF',
                };
                // Garante que 'servicos' seja sempre um array
                servicesData = Array.isArray(response.data.servicos) ? response.data.servicos : [];
            } else {
                // Se a resposta não for um objeto válido
                throw new Error("Formato de resposta inesperado da API.");
            }
            // --- FIM DA VALIDAÇÃO ---

        } catch (err) {
            console.error("ServiceList: ERRO na chamada axios ou processamento:", err);
            fetchError = err.response?.data?.detail || err.message || "Não foi possível carregar os dados.";
            salonDetails = null; // Garante que detalhes sejam nulos em caso de erro
            servicesData = [];

        } finally {
            if (isMounted) {
                setServices(servicesData);
                setError(fetchError);
                setLoading(false);
                // Log antes de chamar onDataLoaded para ter certeza dos valores
                
                onDataLoaded(salonDetails, fetchError); 
            }
        }
    };
    fetchSalonData();
    return () => { isMounted = false; };
}, [salaoId, onDataLoaded]);
  if (loading) {
    return <div className="p-4 text-center text-white">Carregando serviços...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-400">{error}</div>;
  }

  return (
        <div className="px-4 pb-4"> {/* Removido bg e min-h-screen, pois o App.jsx controla */}
            {/* O título agora fica no App.jsx */}

            <div className="space-y-3"> {/* Espaçamento entre cards ligeiramente menor */}
            {services.map((service) => (
                // Card com mais padding interno (p-6), cantos mais arredondados (rounded-xl) e sombra sutil
                <div
                    key={service.id}
                    onClick={() => onServiceClick(service)} 
                    className="bg-white p-6 shadow rounded-xl transition duration-200 ease-in-out hover:shadow-md cursor-pointer border border-gray-100 flex justify-between items-center" 
                >
                    {/* Conteúdo do Card */}
                    <div>
                        {/* Nome do Serviço com mais destaque */}
                        <h3 className="mb-2"> {service.nome_servico}</h3>
                       
                        {/* Duração com ícone e mais espaçamento */}
                        <p className="text-sm text-gray-500 flex items-center"> {/* Aumentado tamanho */}
                            <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Duração: {service.duracao_minutos} min
                        </p>
                    </div>
                    {/* Ícone de seta mais sutil */}
                    <svg className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </div>
            ))}
        </div>
            {/* Removido o <p> de rodapé */}
        </div>
    );
}

export default ServiceList;