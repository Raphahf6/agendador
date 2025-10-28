// frontend/src/components/ServiceList.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoadingSpinner from './LoadingSpinner';
// import { Card } from '@/ui/card'; // <<< REMOVIDO: Usaremos div com Tailwind
import { DollarSign, Clock, Sparkles, ArrowRight } from 'lucide-react'; // Adicionado ArrowRight

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// <<< DEFINIÇÕES DE COR >>>
const CIANO_COLOR_TEXT = 'text-cyan-800';
const CIANO_BORDER_CLASS = 'border-cyan-800'; // Para a borda lateral

// Helper Ícone Simples
const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);


function ServiceList({ salaoId, onDataLoaded, onServiceClick }) {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const fetchSalonData = async () => {
            if (!salaoId) {
                if (isMounted) { setError("ID do salão não fornecido."); setLoading(false); onDataLoaded(null, "ID do salão não fornecido."); }
                return;
            }
            if (isMounted) { setLoading(true); setError(null); }

            let salonDetails = null;
            let servicesData = [];
            let fetchError = null;

            try {
                const response = await axios.get(`${API_BASE_URL}/saloes/${salaoId}/servicos`);
                if (response.data && typeof response.data === 'object') {
                    salonDetails = { // Extrai apenas o necessário para onDataLoaded
                        nome_salao: response.data.nome_salao || 'Nome Indefinido',
                        tagline: response.data.tagline || '',
                        url_logo: response.data.url_logo || null,
                        // Cores não são mais necessárias aqui
                    };
                    servicesData = Array.isArray(response.data.servicos) ? response.data.servicos : [];
                } else {
                    throw new Error("Formato de resposta inesperado da API.");
                }
            } catch (err) {
                console.error("ServiceList: ERRO na chamada axios:", err);
                fetchError = err.response?.data?.detail || err.message || "Não foi possível carregar os dados.";
                salonDetails = null;
                servicesData = [];
            } finally {
                if (isMounted) {
                    setServices(servicesData);
                    setError(fetchError);
                    setLoading(false);
                    onDataLoaded(salonDetails, fetchError); // Passa os dados (ou null) e o erro
                }
            }
        };
        fetchSalonData();
        return () => { isMounted = false; };
    }, [salaoId, onDataLoaded]); // Dependências corretas

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-10">
                 {/* <<< ALTERADO: Cor do Spinner >>> */}
                <LoadingSpinner size="h-8 w-8" color={CIANO_COLOR_TEXT} />
                <p className="text-gray-500 text-sm mt-3">Carregando serviços...</p>
            </div>
        );
    }

    if (error) {
        // Exibe o erro de forma mais destacada
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
                <p className="text-red-700 font-medium">Erro ao carregar</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
         );
    }

     if (services.length === 0) {
        return (
             <div className="p-6 bg-gray-100 border border-gray-200 rounded-lg text-center">
                <p className="text-gray-600">Nenhum serviço cadastrado.</p>
            </div>
        );
    }

    return (
        // Container dos cards
        <div className="px-1 sm:px-4 pb-4"> {/* Ajustado padding horizontal */}
            <div className="space-y-4"> {/* Aumentado space-y */}
                {services.map((service) => (
                    // <<< ALTERADO: Card agora é um div estilizado >>>
                    <div
                        key={service.id}
                        onClick={() => onServiceClick(service)}
                        // Estilos do card: fundo branco, borda lateral ciano, sombra sutil, efeito hover
                        className={`group bg-white rounded-lg border ${CIANO_BORDER_CLASS} border-l-4 border-gray-200 shadow-sm cursor-pointer transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1`}
                    >
                        {/* Removido círculo decorativo */}
                        {/* Padding interno */}
                        <div className="p-4">
                            {/* Nome do Serviço */}
                            <h3 className="text-lg font-semibold text-gray-800 mb-2 group-hover:text-cyan-700 transition-colors"> {/* Aumentado tamanho da fonte */}
                                {service.nome_servico}
                            </h3>

                            {/* Informações (Duração e Preço) */}
                            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-3 text-sm"> {/* Adicionado flex-wrap */}
                                <div className="flex items-center gap-1.5 text-gray-500">
                                    <Icon icon={Clock} className="w-4 h-4 text-gray-400" />
                                    <span>{service.duracao_minutos} min</span>
                                </div>
                                {/* Preço (se existir) */}
                                {service.preco != null && service.preco >= 0 && ( // Permite preço 0
                                     <div className="flex items-center gap-1 text-green-700 font-medium">
                                        {/* <Icon icon={DollarSign} className="w-4 h-4 text-green-500" /> */} {/* Ícone opcional */}
                                        <span>R$ {Number(service.preco).toFixed(2).replace('.', ',')}</span>
                                     </div>
                                )}
                            </div>

                            {/* Link/Texto "Agende agora" */}
                             {/* <<< ALTERADO: Cor Ciano, Ícone ArrowRight no hover >>> */}
                            <div className={`flex items-center gap-1.5 ${CIANO_COLOR_TEXT} font-medium text-sm mt-3`}>
                                <Icon icon={Sparkles} className="w-4 h-4" />
                                <span>Agende agora</span>
                                <Icon icon={ArrowRight} className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ml-1"/> {/* Seta aparece no hover */}
                            </div>
                        </div>
                    </div>
                ))}
                {/* Rodapé da lista (opcional) */}
                {/* <div className="text-center pt-4">
                     <p className="text-xs text-gray-400">✨ Agendamento rápido e fácil</p>
                 </div> */}
            </div>
        </div>
    );
}

export default ServiceList;