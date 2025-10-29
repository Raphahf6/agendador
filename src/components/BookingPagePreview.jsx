// frontend/src/components/BookingPagePreview.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, DollarSign, Sparkles, ArrowRight } from 'lucide-react'; // Ícones necessários
import { ImageWithFallback } from '@/ui/ImageWithFallback'; // Reutiliza seu componente de imagem
import LoadingSpinner from './LoadingSpinner'; // Reutiliza seu spinner

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// Cores (para consistência)
const CIANO_COLOR_TEXT = 'text-cyan-600';
const CIANO_COLOR_BG = 'bg-cyan-600';
const CIANO_BORDER_CLASS = 'border-cyan-800';

// Helper Ícone
const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// Componente Card de Serviço (Simplificado para o Preview)
const PreviewServiceCard = ({ service }) => (
  <div className={`group bg-white rounded-lg border border-l-4 ${CIANO_BORDER_CLASS} border-gray-200 shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-0.5 cursor-pointer`}> {/* Ajustado hover e borda */}
    <div className="p-4">
      <h3 className="text-base font-semibold text-gray-800 mb-1.5 group-hover:text-cyan-700 transition-colors truncate"> {/* Ajustado tamanho/margin */}
        {service.nome_servico}
      </h3>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2 text-xs"> {/* Ajustado tamanho/gap */}
        <div className="flex items-center gap-1 text-gray-500">
          <Icon icon={Clock} className="w-3.5 h-3.5 text-gray-400" />
          <span>{service.duracao_minutos} min</span>
        </div>
        {service.preco != null && service.preco >= 0 && (
          <div className="flex items-center gap-1 text-green-700 font-medium">
            <span>R$ {Number(service.preco).toFixed(2).replace('.', ',')}</span>
          </div>
        )}
      </div>
      <div className={`flex items-center gap-1 ${CIANO_COLOR_TEXT} font-medium text-xs`}>
        <Icon icon={Sparkles} className="w-3.5 h-3.5" />
        <span>Agendar agora</span>
         <Icon icon={ArrowRight} className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1"/>
      </div>
    </div>
  </div>
);


function BookingPagePreview({ salaoId, nomeSalao, tagline, logoUrl }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Busca os serviços uma vez quando o componente monta ou salaoId muda
  useEffect(() => {
    let isMounted = true;
    const fetchServicesForPreview = async () => {
      if (!salaoId) {
          if(isMounted) { setError("ID inválido"); setLoading(false); }
          return;
      }
      if(isMounted) { setLoading(true); setError(null); }
      try {
        // Usa o endpoint público para buscar detalhes E serviços
        const response = await axios.get(`${API_BASE_URL}/saloes/${salaoId}/servicos`);
        if (isMounted && response.data?.servicos) {
           // Pega apenas os 3 primeiros serviços para o preview
          setServices(Array.isArray(response.data.servicos) ? response.data.servicos.slice(0, 3) : []);
        } else if (isMounted) {
            setServices([]); // Garante array vazio
        }
      } catch (err) {
        if (isMounted) { setError("Erro ao carregar serviços para preview."); console.error(err); }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchServicesForPreview();
    return () => { isMounted = false; };
  }, [salaoId]);

  return (
    // Container do Preview - Simula a estrutura da página pública
    <div className="w-full bg-gray-50 font-sans rounded-lg border border-gray-300 shadow-inner overflow-hidden max-h-[600px] overflow-y-auto"> {/* Max height com scroll */}
      {/* Cabeçalho do Preview */}
      <header className="pt-6 pb-5 px-4 text-center bg-white border-b border-gray-200 sticky top-0 z-10"> {/* Sticky header */}
        <div className="flex flex-col items-center">
          {logoUrl ? (
            <ImageWithFallback
              alt={nomeSalao || 'Logo'}
              src={logoUrl}
              className="w-16 h-16 rounded-full mb-3 border-2 border-white shadow-md object-cover" // Tamanho menor
            />
          ) : (
             <div className="w-16 h-16 rounded-full mb-3 bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                <Icon icon={Image} className="w-8 h-8"/>
             </div>
          )}
          {/* Nome e Tagline vêm das props (estado do formulário) */}
          <h1 className="text-xl font-bold text-gray-900 mb-0.5 tracking-tight">
            {nomeSalao || 'Nome do Salão'}
          </h1>
          <p className="text-sm text-gray-500 font-light">
            {tagline || 'Sua tagline aqui'}
          </p>
        </div>
         {/* Subtítulo Fixo */}
         <div className="mt-4 pt-4 border-t border-gray-100 w-full px-2">
             <h2 className="text-base font-semibold text-gray-800 text-center mb-1">
                 Selecione um Serviço
             </h2>
             <p className="text-xs text-center text-gray-500">
                 Pré-visualização dos serviços disponíveis:
             </p>
         </div>
      </header>

      {/* Corpo do Preview (Lista de Serviços) */}
      <main className="p-4">
        {loading && (
          <div className="flex justify-center py-6">
            <LoadingSpinner size="h-6 w-6" color={CIANO_COLOR_TEXT} />
          </div>
        )}
        {error && <p className="text-center text-red-500 text-xs py-4">{error}</p>}
        {!loading && !error && services.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-4">Nenhum serviço encontrado.</p>
        )}
        {!loading && !error && services.length > 0 && (
          <div className="space-y-3">
            {services.map(service => (
              // Usa o componente de card simplificado
              <PreviewServiceCard key={service.id || service.nome_servico} service={service} />
            ))}
             {/* Indicador de Mais Serviços */}
             {services.length === 3 && (
                 <p className="text-center text-xs text-gray-400 pt-2">... e mais serviços.</p>
             )}
          </div>
        )}
      </main>

       {/* Footer Fixo (simulado) */}
       <footer className="w-full text-center p-3 mt-auto bg-white border-t border-gray-200 sticky bottom-0 z-10">
         <p className="text-xs text-gray-400">
            Preview - Agendamento via Horalis
         </p>
       </footer>

    </div>
  );
}

export default BookingPagePreview;