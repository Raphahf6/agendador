// frontend/src/components/ServiceList.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoadingSpinner from './LoadingSpinner';
import { DollarSign, Clock, Sparkles, ArrowRight } from 'lucide-react';
import HourglassLoading from './HourglassLoading';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// Helper Ícone Simples
const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);



// Adicionado prop primaryColor
function ServiceList({ salaoId, onDataLoaded, onServiceClick, primaryColor }) {

    // Variável de cor primária para uso em style
    const primary = primaryColor || '#0E7490';

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

            let responseData = null;
            let servicesData = [];
            let fetchError = null;

            try {
                // ASSUMIMOS QUE ESTE É UM ENDPOINT PÚBLICO (sem token de autorização)
                const response = await axios.get(`${API_BASE_URL}/saloes/${salaoId}/servicos`);

                if (response.data && typeof response.data === 'object') {
                    responseData = response.data;
                    servicesData = Array.isArray(response.data.servicos) ? response.data.servicos : [];
                } else {
                    throw new Error("Formato de resposta inesperado da API.");
                }
            } catch (err) {
                console.error("ServiceList: ERRO na chamada axios:", err);
                // Se a API retornar 403/401, o erro será tratado aqui sem loop infinito
                fetchError = err.response?.data?.detail || err.message || "Não foi possível carregar os dados.";
                responseData = null;
                servicesData = [];
            } finally {
                if (isMounted) {
                    setServices(servicesData);
                    setError(fetchError);
                    onDataLoaded(responseData, fetchError);
                    setLoading(false); // Garante que o loading para
                }
            }
        };
        fetchSalonData();
        return () => { isMounted = false; };
    }, [salaoId, onDataLoaded]);

    if (loading) {
        return (
          <HourglassLoading message="Carregando Serviços" primaryColor={primaryColor} />
        );
    }

    if (error) {
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
        <div className="px-1 sm:px-4 pb-4">
            <div className="space-y-4">
                {services.map((service) => (
                    <div
                        key={service.id}
                        onClick={() => onServiceClick(service)}
                        // Aplica cor da borda lateral via style inline
                        className={`group bg-white rounded-lg border border-l-4 border-gray-200 shadow-sm cursor-pointer transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1`}
                        style={{ borderLeftColor: primary, borderRightColor: 'rgb(229, 231, 235)', borderTopColor: 'rgb(229, 231, 235)', borderBottomColor: 'rgb(229, 231, 235)' }}
                    >
                        <div className="p-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2 transition-colors">
                                {service.nome_servico}
                            </h3>

                            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-3 text-sm">
                                <div className="flex items-center gap-1.5 text-gray-500">
                                    <Icon icon={Clock} className="w-4 h-4 text-gray-400" />
                                    <span>{service.duracao_minutos} min</span>
                                </div>
                                {service.preco != null && service.preco >= 0 && (
                                    <div className="flex items-center gap-1 text-green-700 font-medium">
                                        <span>R$ {Number(service.preco).toFixed(2).replace('.', ',')}</span>
                                    </div>
                                )}
                            </div>

                            {/* Aplica a cor primária no link de ação */}
                            <div className={`flex items-center gap-1.5 font-medium text-sm mt-3`} style={{ color: primary }}>
                                
                                <span>Agende agora</span>
                                <Icon icon={ArrowRight} className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ServiceList;