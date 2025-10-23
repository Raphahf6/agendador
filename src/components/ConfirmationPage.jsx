import React from 'react';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

function ConfirmationPage({ appointmentDetails, onGoBack }) {
  // Se não houver detalhes, mostra uma mensagem genérica (segurança)
  if (!appointmentDetails) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-green-600 mb-4">Agendamento Concluído!</h1>
        <p className="text-gray-700 mb-6">Verifique sua agenda para os detalhes.</p>
        <button
          onClick={onGoBack}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition duration-300"
        >
          Agendar Outro Horário
        </button>
      </div>
    );
  }

  // Formata a data/hora para exibição amigável
  const formattedTime = format(new Date(appointmentDetails.startTime), "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <div className="p-6 text-center flex flex-col items-center min-h-screen justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Ícone de Check Verde */}
      <svg className="w-16 h-16 text-green-500 mb-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>

      <h1 className="text-3xl font-bold text-green-700 mb-3">Agendamento Confirmado!</h1>

      <p className="text-gray-800 text-lg mb-2">Seu horário para:</p>
      <p className="text-xl font-semibold text-blue-700 mb-4">{appointmentDetails.serviceName}</p>

      <p className="text-gray-800 text-lg mb-6">Está marcado para:</p>
      <p className="text-xl font-semibold text-blue-700 mb-8">{formattedTime}</p>

      <button
        onClick={onGoBack}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-xl transition duration-300 transform hover:scale-105"
      >
        Agendar Outro Horário
      </button>
    </div>
  );
}

export default ConfirmationPage;