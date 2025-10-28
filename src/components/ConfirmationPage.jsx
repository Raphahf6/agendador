// frontend/src/components/ConfirmationPage.jsx
import React from 'react';
import { format, parseISO } from 'date-fns'; // Adicionado parseISO
import { ptBR } from 'date-fns/locale'; // Corrigido import para ptBR
import { CheckCircle, Calendar, Clock, ArrowLeft,Sparkles,Users } from 'lucide-react'; // Adicionado CheckCircle, Calendar, Clock, ArrowLeft

// <<< DEFINIÇÕES DE COR >>>
const CIANO_COLOR_TEXT = 'text-cyan-600';
const CIANO_COLOR_BG = 'bg-cyan-600';
const CIANO_COLOR_BG_HOVER = 'hover:bg-cyan-700';


// Helper Ícone Simples
const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// <<< ALTERADO: Adicionado salonName como prop opcional >>>
function ConfirmationPage({ appointmentDetails, onGoBack, salonName }) {
  // Fallback se detalhes não chegarem
  if (!appointmentDetails || !appointmentDetails.startTime || !appointmentDetails.serviceName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-white rounded-lg shadow-md border border-gray-200">
         {/* Ícone de Alerta ou Info */}
        <h1 className="text-xl font-semibold text-gray-800 mb-4">Agendamento Enviado</h1>
        <p className="text-gray-600 mb-6">Seu pedido de agendamento foi processado. Verifique os detalhes ou contate o salão se necessário.</p>
        <button
          onClick={onGoBack}
           // <<< ALTERADO: Botão Ciano >>>
          className={`inline-flex items-center justify-center px-6 py-2.5 text-base font-semibold text-white ${CIANO_COLOR_BG} rounded-lg shadow-sm ${CIANO_COLOR_BG_HOVER} transition-colors`}
        >
          <Icon icon={ArrowLeft} className="w-4 h-4 mr-2"/> Voltar à Lista de Serviços
        </button>
      </div>
    );
  }

  // Formata a data/hora
  let formattedTime = "Data/Hora inválida";
  try {
    // Usa parseISO para garantir que a string seja interpretada corretamente
    const dateObject = parseISO(appointmentDetails.startTime);
    formattedTime = format(dateObject, "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  } catch (e) {
    console.error("Erro ao formatar data:", e);
  }

  return (
     // <<< ALTERADO: Fundo cinza claro >>>
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 bg-gray-50 min-h-[calc(100vh-100px)]"> {/* Ajuste min-height conforme necessário */}

      {/* Card Principal */}
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8 text-center">

        {/* Ícone de Sucesso */}
         {/* <<< ALTERADO: Ícone CheckCircle Ciano >>> */}
        <Icon icon={CheckCircle} className={`w-16 h-16 ${CIANO_COLOR_TEXT} mx-auto mb-5`} />

         {/* <<< ALTERADO: Título Ciano >>> */}
        <h1 className={`text-2xl sm:text-3xl font-bold ${CIANO_COLOR_TEXT} mb-3`}>Agendamento Confirmado!</h1>

        <p className="text-gray-600 text-base mb-6">
          Seu horário foi reservado com sucesso!
        </p>  

        {/* Detalhes do Agendamento */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left space-y-3">
          <p className="text-sm font-medium text-gray-800 border-b pb-2 mb-3">Detalhes:</p>
          {/* Serviço */}
          <div className="flex items-start gap-3">
             <span className="text-gray-400 mt-0.5"><Icon icon={Sparkles} className="w-4 h-4"/></span> {/* Usando Sparkles para serviço */}
             <div>
                <p className="text-xs text-gray-500">Serviço</p>
                <p className="font-semibold text-gray-900">{appointmentDetails.serviceName}</p>
             </div>
          </div>
           {/* Data/Hora */}
          <div className="flex items-start gap-3">
             <span className="text-gray-400 mt-0.5"><Icon icon={Calendar} className="w-4 h-4"/></span>
             <div>
                <p className="text-xs text-gray-500">Data e Hora</p>
                <p className="font-semibold text-gray-900 capitalize">{formattedTime}</p> {/* Capitalize para 'Terça-feira', etc. */}
             </div>
          </div>
           {/* Local (Opcional, se tiver nome do salão) */}
           {salonName && (
             <div className="flex items-start gap-3">
               <span className="text-gray-400 mt-0.5"><Icon icon={Users} className="w-4 h-4"/></span> {/* Ícone genérico para local */}
               <div>
                  <p className="text-xs text-gray-500">Local</p>
                  <p className="font-semibold text-gray-900">{salonName}</p>
               </div>
             </div>
           )}
        </div>

         {/* Próximos Passos / Informações */}
         <div className="text-sm text-gray-500 mb-8 space-y-1">
             <p>Você receberá um e-mail de confirmação em breve.</p>
             <p>Precisa cancelar ou reagendar? Por favor, entre em contato diretamente com o estabelecimento.</p>
             {/* Adicionar telefone do salão aqui se disponível */}
         </div>


        {/* Botão Principal */}
        <button
          onClick={onGoBack}
           // <<< ALTERADO: Botão Ciano >>>
          className={`w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-white ${CIANO_COLOR_BG} rounded-lg shadow-sm ${CIANO_COLOR_BG_HOVER} transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2`}
        >
          Agendar Outro Serviço
        </button>

         {/* Link Opcional para Voltar */}
         {/* <div className="mt-4">
            <button onClick={onGoBack} className="text-xs text-gray-500 hover:text-gray-700 hover:underline">
                 Ou voltar para a lista de serviços
             </button>
         </div> */}

      </div>
       {/* Footer Simples */}
       <footer className="w-full text-center p-4 mt-6 text-xs text-gray-400">
         Agendamento via Horalis
       </footer>
    </div>
  );
}

export default ConfirmationPage;