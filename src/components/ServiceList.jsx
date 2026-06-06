import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ArrowRight, Clock, Search, X } from 'lucide-react';
import HourglassLoading from './HourglassLoading';
import { getErrorMessage, normalizePublicClinicPayload } from '@/utils/horalisRuntime';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const Icon = ({ icon: IconComponent, className = '' }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

const formatPrice = (value) => {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) return 'Gratis';
  return `R$ ${price.toFixed(2).replace('.', ',')}`;
};

function ServiceList({ salaoId, onDataLoaded, onServiceClick, primaryColor }) {
  const primary = primaryColor || '#0E7490';
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchSalonData = async () => {
      if (!salaoId) {
        const message = 'ID do estabelecimento nao fornecido.';
        if (isMounted) {
          setError(message);
          setLoading(false);
          onDataLoaded?.(null, message);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
        setError(null);
      }

      let responseData = null;
      let servicesData = [];
      let fetchError = null;

      try {
        const response = await axios.get(`${API_BASE_URL}/saloes/${salaoId}/servicos`, {
          headers: { Accept: 'application/json' },
        });

        if (typeof response.data === 'string') {
          const looksLikeHtml = response.data.trim().startsWith('<!doctype') || response.data.trim().startsWith('<html');
          throw new Error(
            looksLikeHtml
              ? 'A rota da API caiu no fallback do frontend. Aguarde a nova publicacao e tente novamente.'
              : 'A API retornou texto em vez de JSON.'
          );
        }

        responseData = normalizePublicClinicPayload(response.data, salaoId);
        servicesData = responseData?.servicos || [];
      } catch (err) {
        console.error('ServiceList Error:', err);
        fetchError = err?.response?.status === 403
          ? '403: Estabelecimento indisponivel.'
          : getErrorMessage(err, 'Erro ao carregar dados.');
      }

      if (isMounted) {
        setServices(servicesData);
        setError(fetchError);
        onDataLoaded?.(responseData, fetchError);
        setLoading(false);
      }
    };

    fetchSalonData();
    return () => {
      isMounted = false;
    };
  }, [salaoId, onDataLoaded, retryKey]);

  const filteredServices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return services;
    return services.filter((service) => String(service.nome_servico || '').toLowerCase().includes(term));
  }, [services, searchTerm]);

  if (loading) {
    return <HourglassLoading message="Carregando servicos" primaryColor={primary} />;
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-500 font-medium">Nao foi possivel carregar os servicos.</p>
        <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">{error}</p>
        <button
          type="button"
          onClick={() => setRetryKey((key) => key + 1)}
          className="mt-4 text-sm underline text-gray-500 hover:text-gray-800"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <p className="text-gray-500">Nenhum servico disponivel no momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Icon icon={Search} className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar servico..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all"
          style={{ '--tw-ring-color': primary }}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
            aria-label="Limpar busca"
          >
            <Icon icon={X} className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {filteredServices.length > 0 ? (
          filteredServices.map((service) => (
            <div
              key={service.id}
              onClick={() => onServiceClick?.(service)}
              className="group relative flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 cursor-pointer"
            >
              <div className="flex-1 pr-4">
                <div className="flex items-center justify-between sm:justify-start gap-3 mb-1">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                    {service.nome_servico}
                  </h3>
                  <span className="sm:hidden font-bold text-lg" style={{ color: primary }}>
                    {formatPrice(service.preco)}
                  </span>
                </div>

                {service.descricao && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-2 sm:mb-0 leading-relaxed">
                    {service.descricao}
                  </p>
                )}

                <div className="flex items-center gap-1 text-xs font-medium text-gray-400 mt-1">
                  <Icon icon={Clock} className="w-3 h-3" />
                  <span>{service.duracao_minutos} min</span>
                </div>
              </div>

              <div className="hidden sm:flex flex-col items-end gap-3 pl-4 border-l border-gray-100 min-w-[140px]">
                <span className="text-xl font-bold tracking-tight" style={{ color: primary }}>
                  {formatPrice(service.preco)}
                </span>

                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300 inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-sm"
                  style={{ backgroundColor: primary }}
                >
                  Agendar <Icon icon={ArrowRight} className="w-3 h-3 ml-1" />
                </button>
              </div>

              <div className="sm:hidden w-full mt-4 pt-3 border-t border-gray-50 flex justify-end">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center" style={{ color: primary }}>
                  Agendar horario <Icon icon={ArrowRight} className="w-3 h-3 ml-1" />
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-500 font-medium">Nenhum servico encontrado para "{searchTerm}".</p>
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="mt-2 text-sm font-semibold hover:underline"
              style={{ color: primary }}
            >
              Limpar pesquisa
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ServiceList;
