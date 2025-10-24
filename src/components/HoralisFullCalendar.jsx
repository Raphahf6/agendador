// frontend/src/components/HoralisFullCalendar.jsx
// Versão FINAL - Recebe a lista de eventos DIRETAMENTE como prop 'events'

import React from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid' // Para a visão de Mês
import timeGridPlugin from '@fullcalendar/timegrid' // Para a visão de Semana/Dia
import interactionPlugin from '@fullcalendar/interaction' // Para clicar e selecionar
import { ptBR } from 'date-fns/locale'; 

// --- DADOS DE EXEMPLO (MOCK) ---
// Usado como fallback se a API retornar uma lista vazia
const mockEvents = [
  {
    id: 'MOCK-1', 
    title: 'Corte - Raphael Menezes (Exemplo)',
    start: new Date().toISOString().split('T')[0] + 'T10:00:00', 
    end: new Date().toISOString().split('T')[0] + 'T10:45:00',
    backgroundColor: '#3788D8', 
    borderColor: '#3788D8',
    extendedProps: { 
      customerName: 'Raphael Menezes',
      customerPhone: '+5511988062634'
    }
  },
  {
    id: 'MOCK-2',
    title: 'Barba Terapia - Cliente Teste (Exemplo)',
    start: new Date().toISOString().split('T')[0] + 'T14:00:00', 
    end: new Date().toISOString().split('T')[0] + 'T14:30:00',
    backgroundColor: '#EC4899',
    borderColor: '#D83788'
  },
  {
    id: 'MOCK-3',
    title: 'Luzes - Cliente Teste 2 (Exemplo)',
    start: '2025-10-25T11:00:00', 
    end: '2025-10-25T15:00:00',
    backgroundColor: '#37D88B',
    borderColor: '#37D88B'
  }
]
// --- FIM DOS DADOS DE EXEMPLO ---

/**
 * Props:
 * - events (array): A lista de eventos (agendamentos) para exibir.
 * - onDateClick (function): Função chamada quando um slot de data/hora é clicado.
 * - onEventClick (function): Função chamada quando um evento existente é clicado.
 */
function HoralisFullCalendar({ 
  events, // Recebe a lista de eventos diretamente (já carregada pelo CalendarioPage)
  onDateClick, 
  onEventClick 
}) {
  
  // Função para lidar com o clique em um horário vago
  const handleDateClick = (arg) => {
    console.log("Slot de horário vago clicado:", arg.dateStr);
    // No futuro, aqui podemos abrir um modal para agendamento manual do salão
    if (onDateClick) {
      onDateClick(arg);
    }
  };

  // Função para lidar com o clique em um agendamento existente
  const handleEventClick = (arg) => {
    console.log("Evento existente clicado:", arg.event.title);
    alert(
      `Agendamento Selecionado:\n` +
      `Serviço: ${arg.event.title}\n` +
      `Início: ${arg.event.start.toLocaleString()}\n` +
      `Fim: ${arg.event.end.toLocaleString()}\n` +
      `Detalhes: ${arg.event.extendedProps.customerName || 'Não informado'}\n` +
      `Telefone: ${arg.event.extendedProps.customerPhone || 'Não informado'}`
    );
    if (onEventClick) {
      onEventClick(arg);
    }
  };

  // --- CONFIGURAÇÃO DE RESPONSIVIDADE ---
  const headerToolbarConfig = {
    left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay'
  };
  const mobileHeaderToolbarConfig = {
    left: 'prev,next', center: 'title', right: 'timeGridDay,dayGridMonth' 
  };
  
  // Define qual lista de eventos usar: real (se existir) ou mock (se vazia)
  const eventsToDisplay = (events && events.length > 0) ? events : mockEvents;

  return (
    <div className="p-0 sm:p-4 bg-white rounded-xl shadow-lg border border-gray-100">
      
      <FullCalendar
        // --- PLUGINS ---
        plugins={[
          dayGridPlugin,
          timeGridPlugin,
          interactionPlugin
        ]}
        
        // --- RESPONSIVIDADE ---
        // Usa a detecção de largura para inicializar a visão correta
        headerToolbar={window.innerWidth < 768 ? mobileHeaderToolbarConfig : headerToolbarConfig} 
        initialView={window.innerWidth < 768 ? "timeGridDay" : "timeGridWeek"}
        windowResize={(arg) => {
            if (arg.view.calendar) { // Garante que o calendário não quebre ao redimensionar
                if (window.innerWidth < 768) { 
                    arg.view.calendar.changeView('timeGridDay');
                    arg.view.calendar.setOption('headerToolbar', mobileHeaderToolbarConfig); 
                } else { 
                    arg.view.calendar.changeView('timeGridWeek');
                    arg.view.calendar.setOption('headerToolbar', headerToolbarConfig); 
                }
            }
        }}
        
        // --- EVENTOS (A MUDANÇA CRUCIAL) ---
        // Usamos 'initialEvents' para carregar a lista na montagem
        initialEvents={eventsToDisplay} 
        
        // Se quisermos carregar dados dinamicamente, usaríamos 'events' como função (mas não aqui)
        
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
        dateClick={handleDateClick} 
        eventClick={handleEventClick} 
      />
    </div>
  )
}

export default HoralisFullCalendar;