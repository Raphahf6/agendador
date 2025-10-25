// frontend/src/components/HoralisFullCalendar.jsx
// Versão FINAL - Recebe a lista de eventos (MESMO QUE VAZIA)
import React, { useRef, useEffect } from 'react'; // Adicionado useRef e useEffect
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid' 
import timeGridPlugin from '@fullcalendar/timegrid' 
import interactionPlugin from '@fullcalendar/interaction' 
import { ptBR } from 'date-fns/locale'; 

// --- DADOS DE EXEMPLO (MOCK) REMOVIDOS ---
// O componente agora espera apenas a lista de eventos reais.
// --- FIM DA REMOÇÃO ---

/**
 * Props:
 * - events (array): A lista de eventos (agendamentos) para exibir.
 * - dateClick (function): Função chamada quando um slot de data/hora é clicado. 
 * - eventClick (function): Função chamada quando um evento existente é clicado.
 * - datesSet (function): Função chamada quando a visão do calendário muda.
 * - calendarRef (React Ref): Referência para acessar a API do FullCalendar
 */
function HoralisFullCalendar({ 
  events, 
  dateClick, 
  eventClick,
  datesSet,
  calendarRef // <<< Recebe a ref do componente pai
}) {
  
  // --- CONFIGURAÇÃO DE RESPONSIVIDADE (Permanece a mesma) ---
  const headerToolbarConfig = {
    left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay'
  };
  const mobileHeaderToolbarConfig = {
    left: 'prev,next today', // Adicionado 'today' para mobile
    center: 'title',
    right: 'timeGridDay,dayGridMonth'
  };

  return (
    <div className="p-0 sm:p-4 bg-white rounded-xl shadow-lg border border-gray-100">
      
      <FullCalendar
        // --- Passa a Ref ---
        ref={calendarRef}

        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        
        // --- RESPONSIVIDADE ---
        headerToolbar={window.innerWidth < 768 ? mobileHeaderToolbarConfig : headerToolbarConfig} 
        initialView={window.innerWidth < 768 ? "timeGridDay" : "timeGridWeek"}
        windowResize={(arg) => {
            if (arg.view.calendar) { 
                if (window.innerWidth < 768) { 
                    arg.view.calendar.changeView('timeGridDay');
                    arg.view.calendar.setOption('headerToolbar', mobileHeaderToolbarConfig); 
                } else { 
                    arg.view.calendar.changeView('timeGridWeek');
                    arg.view.calendar.setOption('headerToolbar', headerToolbarConfig); 
                }
            }
        }}
        
        // --- PROPS DE INTERATIVIDADE CORRIGIDAS ---
        // Agora, se 'events' for [], o calendário renderizará vazio
        events={events} // <<< Recebe a lista (real ou vazia)
        dateClick={dateClick} 
        eventClick={eventClick} 
        datesSet={datesSet} 
        
        // --- CONFIGURAÇÕES DE VISUALIZAÇÃO ---
        allDaySlot={false} 
        locale={ptBR} 
        buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia' }}
        slotMinTime="08:00:00" 
        slotMaxTime="20:00:00" 
        slotDuration="00:15:00" 
        slotLabelInterval="01:00" 
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }} 
        contentHeight="auto" 
        selectable={true} 
        selectMirror={true}
      />
    </div>
  )
}

export default HoralisFullCalendar;