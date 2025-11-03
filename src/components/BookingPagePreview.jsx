// frontend/src/components/BookingPagePreview.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, DollarSign, Sparkles, ArrowRight, ImageIcon, ArrowLeft } from 'lucide-react';
import { ImageWithFallback } from '@/ui/ImageWithFallback'; // Reutiliza seu componente de imagem
import LoadingSpinner from './LoadingSpinner'; // Reutiliza seu spinner

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// Helper Ícone
const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// Componente Card de Serviço (Simplificado para o Preview)
const PreviewServiceCard = ({ service, primaryColor }) => {
  const primary = primaryColor || '#0E7490';

  return (
    <div
      className={`group bg-white rounded-xl border border-l-4 border-gray-200 shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-0.5 cursor-pointer`}
      style={{ borderLeftColor: primary }} // Borda Lateral
    >
      <div className="p-4">
        <h3 className="text-base font-semibold text-gray-800 mb-1.5 group-hover:text-cyan-700 transition-colors truncate">
          {service.nome_servico}
        </h3>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2 text-xs">
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
        {/* Aplica a cor primária no link de ação */}
        <div className="flex items-center gap-1 font-medium text-xs" style={{ color: primary }}>
          <Icon icon={Sparkles} className="w-3.5 h-3.5" />
          <span>Agendar agora</span>
          <Icon icon={ArrowRight} className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
        </div>
      </div>
    </div>
  );
};


function BookingPagePreview({ salaoId, nomeSalao, tagline, logoUrl, primaryColor, secondaryColor, previewState = 'services' }) {
  // previewState pode ser 'services' (padrão) ou 'scheduler' (simula a tela de agendamento)
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fallback de cores
  const primary = primaryColor || '#0E7490';
  const secondary = secondaryColor || '#FFFFFF';
  const showBackButton = previewState === 'scheduler';

  // Aplica as cores via variáveis CSS (simulação)
  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary-salon', primary);
    document.documentElement.style.setProperty('--color-secondary-salon', secondary);
  }, [primary, secondary]);

  // Busca os serviços uma vez quando o componente monta ou salaoId muda
  useEffect(() => {
    let isMounted = true;
    const fetchServicesForPreview = async () => {
      if (!salaoId) {
        if (isMounted) { setError("ID inválido"); setLoading(false); }
        return;
      }
      if (isMounted) { setLoading(true); setError(null); }
      try {
        // Endpoint público para buscar detalhes E serviços
        const response = await axios.get(`${API_BASE_URL}/saloes/${salaoId}/servicos`);
        if (isMounted && response.data?.servicos) {
          // Pega apenas os 3 primeiros serviços para o preview
          setServices(Array.isArray(response.data.servicos) ? response.data.servicos.slice(0, 3) : []);
        } else if (isMounted) {
          setServices([]); // Garante array vazio
        }
      } catch (err) {
        if (isMounted) { setError("Verifique se você tem serviços cadastrados."); console.error(err); }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchServicesForPreview();
    return () => { isMounted = false; };
  }, [salaoId]);

  // Conteúdo de Preview simulado para a tela de Agendamento
  const SchedulerPreviewContent = () => (
    <div className="p-4 space-y-4">
      {/* Simulação de um card de serviço selecionado */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <h4 className="text-lg font-bold text-gray-800" style={{ color: primary }}>Serviço Selecionado (Mock)</h4>
        <p className="text-sm text-gray-500">Detalhes do Agendamento aqui.</p>
      </div>
      {/* Simulação do Calendário / Seleção de Profissional */}
      <div className="bg-gray-100 p-6 rounded-xl border-2 border-dashed border-gray-300 text-center text-gray-600">
        Calendário de Horários (Simulação)
      </div>
      {/* Simulação do Formulário de Cliente */}
      <div className="bg-gray-100 p-6 rounded-xl border-2 border-dashed border-gray-300 text-center text-gray-600">
        Formulário de Dados do Cliente (Simulação)
      </div>
    </div>
  );


  // Renderiza o Loading Spinner original se showBackButton estiver false E houver loading
  const renderLoading = () => (
    <div className="flex justify-center py-6">
      <LoadingSpinner size="h-6 w-6" color={primary} />
    </div>
  );

  return (
    // Container Externa (Simula o fundo gradiente da página pública)
    <div className="w-full bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 py-8 px-4 sm:px-6 lg:px-8 max-h-[600px] overflow-y-auto">
      
      {/* CARD CONTAINER PREMIUM */}
      <div className="w-full max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          
          {/* CABEÇALHO PREMIUM - Estrutura Adaptada */}
          <header className="relative w-full bg-white">
            {/* Background decorativo com gradiente */}
            <div 
              className="absolute inset-0 opacity-5"
              style={{
                background: `linear-gradient(135deg, ${primary} 0%, transparent 100%)`
              }}
            />
            
            <div className="relative">
              {/* Botão Voltar (Simulado) */}
              {showBackButton && (
                <div className="absolute top-6 left-4 sm:left-8 z-50"> 
                  <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-lg border border-gray-100 opacity-80 cursor-default"
                  >
                    <ArrowLeft className="h-4 w-4 text-gray-600" />
                    <span className="text-gray-700">Voltar</span>
                  </button>
                </div>
              )}

              {/* ESPAÇADOR para o Botão Voltar */}
              {showBackButton && (
                  <div className="pt-20 sm:pt-16" />
              )}
              
              {/* Conteúdo do Cabeçalho (Visível apenas na tela de serviços - estado padrão) */}
              {!showBackButton && (
                <div className="pt-12 pb-8 px-4 sm:px-8">
                  <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
                    
                    {/* Logo com efeito premium */}
                    {logoUrl ? (
                      <div className="relative mb-6">
                        <div 
                          className="absolute inset-0 rounded-full blur-2xl opacity-20"
                          style={{ backgroundColor: primary }}
                        />
                        <ImageWithFallback
                          alt={nomeSalao || 'Logo'}
                          src={logoUrl}
                          className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-2xl object-cover ring-4 ring-gray-100"
                        />
                      </div>
                    ) : (
                      <div className="relative mb-6">
                        <div 
                          className="absolute inset-0 rounded-full blur-2xl opacity-20"
                          style={{ backgroundColor: primary }}
                        />
                        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-2xl object-cover ring-4 ring-gray-100 bg-gray-100 flex items-center justify-center text-gray-400">
                            <Icon icon={ImageIcon} className="w-12 h-12" />
                        </div>
                      </div>
                    )}

                    {/* Nome do Salão */}
                    <h1 className="mb-3 tracking-tight bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      {nomeSalao || 'Nome do Salão'}
                    </h1>

                                                  
                                               
                    {/* Tagline */}
                    <p className="text-gray-600 mb-8 max-w-md">
                      {tagline || 'Sua tagline de impacto aqui!'}
                    </p>

                    {/* Separador decorativo */}
                    <div className="flex items-center gap-3 mb-8">
                      <div className="h-px w-12 bg-gradient-to-r from-transparent to-gray-300" />
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: primary }}
                      />
                      <div className="h-px w-12 bg-gradient-to-l from-transparent to-gray-300" />
                    </div>

                    {/* Título da Seção de Serviços */}
                    <div className="w-full">
                      <h2 
                        className="mb-2 tracking-tight"
                        style={{ color: primary }}
                      >
                        Nossos Serviços
                      </h2>
                      <p className="text-gray-600">
                        Escolha o serviço desejado para agendar seu horário
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Linha separadora sutil */}
            {!showBackButton && (
              <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            )}
          </header>

          {/* CONTEÚDO PRINCIPAL - Lista de Serviços ou Scheduler */}
          <main className={`w-full bg-gradient-to-b from-white to-gray-50/30 px-4 sm:px-8 py-8`}>
            {showBackButton ? (
              <SchedulerPreviewContent />
            ) : (
              // Conteúdo da lista de serviços
              <>
                {loading && renderLoading()}
                {error && <p className="text-center text-red-500 text-sm py-4">{error}</p>}
                {!loading && !error && services.length === 0 && (
                  <p className="text-center text-gray-500 text-sm py-4">Nenhum serviço encontrado. Cadastre um!</p>
                )}
                {!loading && !error && services.length > 0 && (
                  <div className="space-y-4 max-w-lg mx-auto">
                    {services.map(service => (
                      <PreviewServiceCard
                        key={service.id || service.nome_servico}
                        service={service}
                        primaryColor={primary}
                      />
                    ))}
                    {services.length === 3 && (
                      <p className="text-center text-xs text-gray-400 pt-2">... e mais serviços.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </main>

          {/* FOOTER */}
          {!showBackButton && (
            <footer className="w-full text-center px-4 py-6 bg-gray-50/50 border-t border-gray-100">
              <p className="text-gray-500 text-sm">
                © {new Date().getFullYear()} Horalis. Todos os direitos reservados.
              </p>
            </footer>
          )}

        </div>
      </div>
    </div>
  );
}

export default BookingPagePreview;