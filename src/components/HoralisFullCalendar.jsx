// frontend/src/components/HoralisFullCalendar.jsx
import React from 'react';
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid' 
import timeGridPlugin from '@fullcalendar/timegrid' 
import interactionPlugin from '@fullcalendar/interaction' 
import { ptBR } from 'date-fns/locale'; 

/**
 * <<< VERSÃO REFATORADA >>>
 * Este componente agora é "burro".
 * Ele não tem mais header, nem wrapper, nem lógica de responsividade.
 * Ele apenas renderiza a GRADE do calendário.
 * Todo o controle (header, sidebar, etc) foi movido para 'CalendarioPage.jsx'.
 */
function HoralisFullCalendar({ 
  calendarRef,
  ...rest // Captura todas as props (events, dateClick, eventClick, initialView, datesSet, etc.)
}) {

  return (
    <FullCalendar
      ref={calendarRef}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      locale={ptBR}

      // <<< MUDANÇA CRUCIAL: O header nativo foi removido >>>
      headerToolbar={false} 

      // --- Configs Visuais (mantidas) ---
      allDaySlot={false}
      buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia' }}
      slotDuration="00:15:00"
      slotLabelInterval="01:00"
      slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
      
      // <<< MUDANÇA: Altura dinâmica >>>
      // contentHeight="auto" // Removido para 'height="100%"'
      height="100%" // O calendário vai preencher o container pai
      
      nowIndicator={true}
      slotMinTime="07:00"
      slotMaxTime="23:00"

      // Passa todas as outras props (events, dateClick, eventClick, select, etc.)
      {...rest}
    />
  )
}

export default HoralisFullCalendar;