import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import HourglassLoading from './HourglassLoading';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

function ServiceList({ salaoId, onDataLoaded, onServiceClick, primaryColor }) {
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
                const response = await axios.get(`${API_BASE_URL}/saloes/${salaoId}/servicos`);
                if (response.data && typeof response.data === 'object') {
                    responseData = response.data;
                    servicesData = Array.isArray(response.data.servicos) ? response.data.servicos : [];
                } else {
                    throw new Error("Formato de resposta inesperado.");
                }
            } catch (err) {
                console.error("ServiceList Error:", err);
                fetchError = err.response?.data?.detail || err.message || "Erro ao carregar dados.";
                responseData = null;
                servicesData = [];
            } finally {
                if (isMounted) {
                    setServices(servicesData);
                    setError(fetchError);
                    onDataLoaded(responseData, fetchError);
                    setLoading(false);
                }
            }
        };
        fetchSalonData();
        return () => { isMounted = false; };
    }, [salaoId, onDataLoaded]);

    if (loading) {
        return <HourglassLoading message="Carregando Serviços" primaryColor={primary} />;
    }

    if (error) {
        return (
            <div className="py-12 text-center">
                <p className="text-red-500 font-medium">Não foi possível carregar os serviços.</p>
                <button onClick={() => window.location.reload()} className="mt-4 text-sm underline text-gray-500 hover:text-gray-800">Tentar Novamente</button>
            </div>
        );
    }

    if (services.length === 0) {
        return (
            <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-500">Nenhum serviço disponível no momento.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {services.map((service) => (
                <div
                    key={service.id}
                    onClick={() => onServiceClick(service)}
                    // 🌟 NOVO DESIGN: Item de Lista Limpo (Sem Card)
                    className="group relative flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 cursor-pointer"
                >
                    {/* Informações do Serviço */}
                    <div className="flex-1 pr-4">
                        <div className="flex items-center justify-between sm:justify-start gap-3 mb-1">
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                                {service.nome_servico}
                            </h3>
                            {/* Preço Mobile (Visível apenas em telas pequenas) */}
                            <span className="sm:hidden font-bold text-lg" style={{ color: primary }}>
                                {service.preco != null ? `R$ ${Number(service.preco).toFixed(2).replace('.', ',')}` : 'Grátis'}
                            </span>
                        </div>
                        
                        {service.descricao && (
                            <p className="text-sm text-gray-500 line-clamp-2 mb-2 sm:mb-0 leading-relaxed">
                                {service.descricao}
                            </p>
                        )}
                        
                        {/* Duração (Mobile/Desktop) */}
                        <div className="flex items-center gap-1 text-xs font-medium text-gray-400 mt-1">
                            <Icon icon={Clock} className="w-3 h-3" />
                            <span>{service.duracao_minutos} min</span>
                        </div>
                    </div>

                    {/* Coluna de Ação (Preço + Botão) - Desktop */}
                    <div className="hidden sm:flex flex-col items-end gap-3 pl-4 border-l border-gray-100 min-w-[140px]">
                        <span className="text-xl font-bold tracking-tight" style={{ color: primary }}>
                            {service.preco != null ? `R$ ${Number(service.preco).toFixed(2).replace('.', ',')}` : 'Grátis'}
                        </span>
                        
                        <button 
                            className="opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300 inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-sm"
                            style={{ backgroundColor: primary }}
                        >
                            Agendar <Icon icon={ArrowRight} className="w-3 h-3 ml-1" />
                        </button>
                    </div>

                    {/* Botão Mobile (Sempre visível, sutil) */}
                    <div className="sm:hidden w-full mt-4 pt-3 border-t border-gray-50 flex justify-end">
                        <span className="text-xs font-bold uppercase tracking-wider flex items-center" style={{ color: primary }}>
                            Agendar Horário <Icon icon={ArrowRight} className="w-3 h-3 ml-1" />
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default ServiceList;