// frontend/src/components/HoralisFullCalendar.jsx
import React from 'react'; // useRef e useEffect não são necessários aqui
import { useState, useEffect, useRef } from 'react';
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

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // 2. Define as configurações (agora o 'right' do desktop também tem dia/mês)
  const headerToolbarConfig = {
    left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay'
  };
 const mobileHeaderToolbarConfig = {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridDay' // Correto: Sem 'timeGridWeek'
  };
  // 3. useEffect para verificar o tamanho da tela no carregamento e no resize
  useEffect(() => {
    const checkMobile = () => {
      const mobileCheck = window.innerWidth < 768;
      // Só atualiza o estado se o valor realmente mudou
      if (mobileCheck !== isMobile) {
        setIsMobile(mobileCheck);
      }
    };

    window.addEventListener('resize', checkMobile);
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobile]); // Dependência 'isMobile' para comparar com o valor atual
     
  // --- CONFIGURAÇÃO DE RESPONSIVIDADE (Permanece a mesma) ---


  return (
    <div className="p-0 sm:p-4 bg-white rounded-xl shadow-lg border border-gray-100">
      
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        events={events}
        locale={ptBR}

        // --- USA O ESTADO CORRIGIDO ---
        // Agora 'isMobile' terá o valor correto (true/false) ANTES da primeira renderização
        headerToolbar={isMobile ? mobileHeaderToolbarConfig : headerToolbarConfig}
        initialView={isMobile ? "timeGridDay" : "timeGridWeek"}

        // --- REMOVIDO o handler 'windowResize' manual (o useEffect cuida disso) ---

        // --- Configs Visuais (sem alteração) ---
        allDaySlot={false}
        buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia' }}
        slotDuration="00:15:00"
        slotLabelInterval="01:00"
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        contentHeight="auto"
        nowIndicator={true}
        slotMinTime="07:00"
        slotMaxTime="23:00"

        // Passa todas as outras props (dateClick, eventClick, select, etc.)
        {...rest}
      />
    </div>
  )
}

export default HoralisFullCalendar;