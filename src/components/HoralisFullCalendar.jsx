// frontend/src/components/HoralisFullCalendar.jsx
import React from 'react'; // useRef e useEffect não são necessários aqui
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid' 
import timeGridPlugin from '@fullcalendar/timegrid' 
import interactionPlugin from '@fullcalendar/interaction' 
import { ptBR } from 'date-fns/locale'; 

/**
 * Props:
 * - events (array): A lista de eventos (agendamentos) para exibir.
 * - calendarRef (React Ref): Referência para acessar a API do FullCalendar
 * - ...rest (spread): Todas as outras props do FullCalendar 
 * (como dateClick, eventClick, editable, eventDrop, etc.)
 */
function HoralisFullCalendar({ 
  events, 
  calendarRef,
  // <<< MUDANÇA: 'dateClick', 'eventClick' e 'datesSet' removidos daqui
  ...rest // <<< MUDANÇA: Captura todas as outras props (editable, eventDrop, etc.)
}) {
  
  // --- CONFIGURAÇÃO DE RESPONSIVIDADE (Permanece a mesma) ---
  const headerToolbarConfig = {
    left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay'
  };
  const mobileHeaderToolbarConfig = {
    left: 'prev,next today', 
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
        events={events} // Recebe a lista (real ou vazia)
        
        // <<< MUDANÇA: Repassa todas as outras props >>>
        // Isso inclui 'dateClick', 'eventClick', 'editable', e 'eventDrop'
        // que foram passadas pelo CalendarioPage.jsx
        {...rest} 
        
        // <<< MUDANÇA: Removido 'datesSet' (era obsoleto) >>>
        
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