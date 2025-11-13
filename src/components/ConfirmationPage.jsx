import React from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, Calendar, Sparkles, Users, ArrowLeft, CalendarPlus, MapPin } from 'lucide-react';

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// --- HELPER: Gerador de Link de Calendário ---
// (Simplificado - idealmente isso seria uma biblioteca ou um .ics file)
const getCalendarLink = (details, salonName) => {
    try {
        const title = encodeURIComponent(`Agendamento: ${details.serviceName} em ${salonName}`);
        const startTime = parseISO(details.startTime);
        
        // Formato UTC (Google Calendar)
        const googleStartTime = format(startTime, "yyyyMMdd'T'HHmmss");
        const googleEndTime = format(new Date(startTime.getTime() + (details.durationMinutes || 60) * 60000), "yyyyMMdd'T'HHmmss");

        return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${googleStartTime}/${googleEndTime}&details=${encodeURIComponent(`Agendado via Horalis. Serviço: ${details.serviceName}`)}`;

    } catch (e) {
        return "#";
    }
};

function ConfirmationPage({ appointmentDetails, onGoBack, salonName, primaryColor }) {
    
    // Define a cor primária
    const primary = primaryColor || '#0E7490';

    // Fallback de segurança (mantido)
    if (!appointmentDetails || !appointmentDetails.startTime || !appointmentDetails.serviceName) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
                <h1 className="text-xl font-semibold text-gray-800 mb-4">Agendamento Enviado</h1>
                <p className="text-gray-600 mb-6">Seu pedido de agendamento foi processado.</p>
                <button
                    onClick={onGoBack}
                    style={{ backgroundColor: primary }}
                    className={`inline-flex items-center justify-center px-6 py-2.5 text-base font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition-colors`}
                >
                    <Icon icon={ArrowLeft} className="w-4 h-4 mr-2"/> Voltar
                </button>
            </div>
        );
    }

    // Formata a data/hora
    let formattedDate = "Data inválida";
    let formattedTime = "Hora inválida";
    try {
        const dateObject = parseISO(appointmentDetails.startTime);
        // "Terça-feira, 25 de Dezembro"
        formattedDate = format(dateObject, "EEEE, dd 'de' MMMM", { locale: ptBR });
        // "14:30"
        formattedTime = format(dateObject, "HH:mm", { locale: ptBR });
    } catch (e) {
        console.error("Erro ao formatar data:", e);
    }

    // Link do Google Agenda
    const gCalLink = getCalendarLink(appointmentDetails, salonName);

    return (
        <div className="flex flex-col items-center justify-center p-4 sm:p-0 transition-all duration-500 animate-in fade-in slide-in-from-bottom-5">
            
            {/* 1. Banner de Sucesso */}
            <div 
                className="w-full p-5 sm:p-6 rounded-2xl flex items-center gap-4 mb-6"
                style={{ backgroundColor: `${primary}1A` }} // Fundo com 10% de opacidade
            >
                <Icon 
                    icon={CheckCircle} 
                    className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0" 
                    style={{ color: primary }} 
                />
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                        Agendamento Confirmado!
                    </h1>
                    <p className="text-gray-600 text-base mt-1">
                        Seu horário foi reservado com sucesso, {appointmentDetails.customerName}!
                    </p>
                </div>
            </div>

            {/* 2. Resumo do Agendamento (Design Limpo) */}
            <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
                <ul className="divide-y divide-gray-100">
                    <li className="flex flex-col sm:flex-row justify-between sm:items-center p-4 sm:p-5">
                        <span className="text-sm font-medium text-gray-500 mb-1 sm:mb-0">Serviço:</span>
                        <span className="font-bold text-gray-900 text-lg text-left sm:text-right">{appointmentDetails.serviceName}</span>
                    </li>
                    <li className="flex flex-col sm:flex-row justify-between sm:items-center p-4 sm:p-5">
                        <span className="text-sm font-medium text-gray-500 mb-1 sm:mb-0">Quando:</span>
                        <div className="text-left sm:text-right">
                            <span className="font-bold text-gray-900 text-lg capitalize">{formattedDate}</span>
                            <span className="font-medium text-gray-700 text-lg"> às {formattedTime}</span>
                        </div>
                    </li>
                    <li className="flex flex-col sm:flex-row justify-between sm:items-center p-4 sm:p-5">
                        <span className="text-sm font-medium text-gray-500 mb-1 sm:mb-0">Local:</span>
                        <span className="font-bold text-gray-900 text-lg text-left sm:text-right">{salonName}</span>
                    </li>
                </ul>
            </div>

            {/* 3. Próximos Passos (Ação Premium) */}
            <div className="w-full mb-8">
                <h3 className="font-semibold text-gray-700 mb-3 text-center">Próximos Passos:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a
                        href={gCalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white rounded-lg shadow-md hover:opacity-90 transition-all"
                        style={{ backgroundColor: primary }}
                    >
                        <Icon icon={CalendarPlus} className="w-5 h-5" />
                        Adicionar ao Google Agenda
                    </a>
                    
                    <button
                        onClick={onGoBack}
                        className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Agendar Outro Serviço
                    </button>
                </div>
            </div>

            {/* 4. Informações Adicionais */}
            <div className="text-sm text-gray-500 text-center space-y-1">
                <p>Você receberá um e-mail de confirmação em breve.</p>
                <p>Precisa cancelar ou reagendar? Por favor, entre em contato com o estabelecimento.</p>
            </div>
        </div>
    );
}

export default ConfirmationPage;