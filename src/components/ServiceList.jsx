import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoadingSpinner from './LoadingSpinner';
import { Card } from '@/ui/card';
import { DollarSign, Clock, Sparkles } from 'lucide-react';
// O ID do salão será fixo por enquanto. No futuro, ele virá da URL.
// Use o ID de teste que você cadastrou.
// ATENÇÃO: Use a porta 8000 se o seu FastAPI estiver rodando lá.
const API_BASE_URL = "https://api-agendador.onrender.com";

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
        return <div className="flex flex-col items-center justify-center p-10">
            <LoadingSpinner size="h-8 w-8" color="text-purple-500" />
            <p className="text-gray-500 text-sm mt-3">Carregando dados do salão...</p>
        </div>;
    }

    if (error) {
        return <div className="p-4 text-center text-red-400">{error}</div>;
    }

    return (
        <div className="px-4 pb-4">

            <div className="space-y-3">
                {services.map((service) => (
                    // Card com mais padding interno (p-6), cantos mais arredondados (rounded-xl) e sombra suti
                    <Card
                        key={service.id}
                        onClick={() => onServiceClick(service)}
                        className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl border-0"
                    >

                        {/* Decorative Circle */}
                        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/30 blur-2xl group-hover:scale-150 transition-transform duration-500" />

                        <div className="relative p-6">
                            {/* Icon Container */}


                            {/* Service Name */}
                            <h3 className="mb-3 group-hover:translate-x-1 transition-transform duration-300">
                                {service.nome_servico}
                            </h3>

                            {/* Info Grid */}
                            <div className="flex items-center justify-between gap-4 mb-4">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm">{service.duracao_minutos} min</span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <DollarSign className="w-4 h-4 text-green-600" />
                                    <span className="text-green-700">R$ {service.preco}</span>
                                </div>
                            </div>

                            {/* Popular Badge (opcional - pode ser passado como prop) */}
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-yellow-500" />
                                <span className="text-xs text-muted-foreground">Agende agora</span>
                            </div>

                            {/* Hover Arrow Indicator */}
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
                <div className="text-center space-y-2">
                    <p className="text-muted-foreground">
                        ✨ Agendamento rápido e fácil
                    </p>

                </div>
            </div>
        </div>
    );
}

export default ServiceList;