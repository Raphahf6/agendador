// frontend/src/components/HoralisFullCalendar.jsx
import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ptBR } from 'date-fns/locale';

// Helper para renderizar o conteúdo interno do evento
const renderEventContent = (eventInfo) => {
    return (
        <div className="horalis-event-inner">
            <div className="horalis-event-time">{eventInfo.timeText}</div>
            <div className="horalis-event-title">{eventInfo.event.title}</div>
        </div>
    );
};

function HoralisFullCalendar({ 
    calendarRef,
    primaryColor, 
    ...rest 
}) {
    
    const primary = primaryColor || '#0E7490';
    // Cor para o fundo do dia atual (10% opacidade)
    const primaryLight = `${primary}1A`; 

    return (
        <div className="h-full w-full relative">
            
            {/* 🌟 CSS CORRIGIDO: CORES VÍVIDAS NOS EVENTOS 🌟 */}
            <style>{`
                /* --- GERAL --- */
                .fc { font-family: inherit; }
                
                /* Bordas sutis na grade */
                .fc-theme-standard td, 
                .fc-theme-standard th,
                .fc-scrollgrid {
                    border-color: #F3F4F6 !important; 
                }

                /* --- CABEÇALHO --- */
                .fc-col-header-cell {
                    background-color: #FAFAFA;
                    padding: 12px 0;
                    border-bottom: 1px solid #E5E7EB !important;
                }
                .fc-col-header-cell-cushion {
                    color: #6B7280;
                    font-size: 12px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    text-decoration: none !important;
                }

                /* --- GRADE DE HORÁRIOS --- */
                .fc-timegrid-slot { height: 3.5rem !important; }
                .fc-timegrid-slot-label-cushion {
                    font-size: 11px;
                    color: #9CA3AF;
                    font-weight: 500;
                    text-transform: uppercase;
                }

                /* --- INDICADORES (Hoje / Agora) --- */
                .fc-day-today {
                    background-color: ${primaryLight} !important;
                }
                .fc-timegrid-now-indicator-line {
                    border-color: ${primary} !important;
                    border-width: 2px !important;
                    z-index: 99;
                }
                .fc-timegrid-now-indicator-arrow {
                    border-color: ${primary} !important;
                    background-color: ${primary} !important;
                }

                /* --- EVENTOS (CORREÇÃO DE COR) --- */
                
                /* O container do evento recebe a cor via style inline do FullCalendar.
                   NÃO podemos usar background: transparent aqui. */
                .fc-timegrid-event-harness-inset .fc-timegrid-event,
                .fc-v-event {
                    border: none !important;
                    border-radius: 6px !important; /* Arredondado */
                    box-shadow: 0 2px 5px rgba(0,0,0,0.15) !important; /* Sombra 3D */
                    opacity: 1 !important; /* Garante visibilidade */
                    margin: 1px 2px !important; /* Espacinho lateral */
                }

                /* Efeito Hover no Evento */
                .fc-v-event:hover {
                    transform: scale(1.02);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2) !important;
                    z-index: 100 !important;
                    transition: all 0.2s ease;
                    cursor: pointer;
                }

                /* Conteúdo interno do evento */
                .fc-event-main {
                    padding: 4px 6px !important;
                    color: #FFFFFF !important; /* Texto Branco Forçado */
                }

                /* Tipografia Interna */
                .horalis-event-inner {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    overflow: hidden;
                }
                .horalis-event-time {
                    font-size: 10px !important;
                    font-weight: 700 !important;
                    opacity: 0.9;
                    margin-bottom: 1px;
                }
                .horalis-event-title {
                    font-size: 11px !important;
                    font-weight: 600 !important;
                    line-height: 1.2;
                    white-space: normal; /* Quebra de linha */
                }
            `}</style>

            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                locale={ptBR}
                headerToolbar={false} 

                // --- Configs Visuais ---
                allDaySlot={false}
                buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia' }}
                slotDuration="00:15:00"
                slotLabelInterval="01:00"
                slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                height="100%"
                nowIndicator={true}
                slotMinTime="07:00"
                slotMaxTime="23:00"

                // Renderizador Customizado
                eventContent={renderEventContent}

                // Passa todas as outras props
                {...rest}
            />
        </div>
    );
}

export default HoralisFullCalendar;