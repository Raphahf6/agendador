// frontend/src/components/HoralisCalendar.jsx
import React, { useState } from 'react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils"; // Importa o utilitário 'cn' do shadcn

// <<< DEFINIÇÕES DE COR >>>
const CIANO_COLOR_TEXT = 'text-cyan-600';
const CIANO_COLOR_BG = 'bg-cyan-600';

// Helper Ícone Simples
const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);


/**
 * Props:
 * - selectedDate (Date): A data atualmente selecionada.
 * - onDateSelect (function): Função chamada quando uma data é clicada.
 * - REMOVIDO: styleOptions
 */
// <<< ALTERADO: Removido styleOptions das props >>>
function HoralisCalendar({ selectedDate, onDateSelect }) {
  const [displayDate, setDisplayDate] = useState(selectedDate || new Date());

  // <<< REMOVIDO: Cores dinâmicas >>>
  // const corPrimaria = styleOptions?.cor_primaria || '#6366F1';

  const goToNextMonth = () => setDisplayDate(addMonths(displayDate, 1));
  const goToPreviousMonth = () => setDisplayDate(subMonths(displayDate, 1));

  const firstDayOfMonth = startOfMonth(displayDate);
  const lastDayOfMonth = endOfMonth(displayDate);
  const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
  const startingDayOfWeek = getDay(firstDayOfMonth);
  const paddingDays = Array.from({ length: startingDayOfWeek });
  const weekDaysHeader = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    // Container principal: fundo branco, sombra, borda, fonte
    <div className="w-full max-w-sm mx-auto bg-white rounded-xl shadow-md border border-gray-100 p-4 font-sans"> {/* Ajustado shadow */}

      {/* 1. Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        {/* Botão Anterior (Cinza) */}
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-300" // Adicionado focus ring
          aria-label="Mês anterior"
        >
          <Icon icon={ChevronLeft} className="w-5 h-5" />
        </button>

        {/* <<< ALTERADO: Título Mês/Ano (Ciano) >>> */}
        <div className={`text-lg font-semibold ${CIANO_COLOR_TEXT} capitalize`}>
          {format(displayDate, 'MMMM yyyy', { locale: ptBR })}
        </div>

        {/* Botão Próximo (Cinza) */}
        <button
          type="button"
          onClick={goToNextMonth}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-300" // Adicionado focus ring
          aria-label="Próximo mês"
        >
          <Icon icon={ChevronRight} className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Corpo: Grid dos Dias */}
      <div className="grid grid-cols-7 gap-y-1 text-center"> {/* Adicionado text-center */}
        {/* Cabeçalho Dias Semana */}
        {weekDaysHeader.map((day) => (
          <div key={day} className="text-xs font-medium text-gray-400 uppercase pt-1 pb-2">
            {day}
          </div>
        ))}

        {/* Células Vazias */}
        {paddingDays.map((_, index) => (
          <div key={`padding-${index}`} className="h-10 w-10"></div>
        ))}

        {/* Células dos Dias */}
        {daysInMonth.map((day) => {
          const isSelected = isSameDay(day, selectedDate || null);
          const isCurrentDay = isToday(day);

          return (
            <div key={day.toISOString()} className="flex justify-center items-center h-10"> {/* Adicionado h-10 */}
              <button
                type="button"
                onClick={() => onDateSelect(day)}
                className={cn(
                  "h-9 w-9 flex items-center justify-center rounded-full text-sm font-medium transition-all duration-150 ease-in-out",
                  // Estilo Padrão
                  "text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-1",
                  // Estilo "Hoje" (se não selecionado) - Usando Ciano para o texto
                  !isSelected && isCurrentDay && `bg-cyan-50 ${CIANO_COLOR_TEXT} font-semibold`,
                  // <<< ALTERADO: Estilo "Selecionado" (Ciano) >>>
                  isSelected && `${CIANO_COLOR_BG} text-white shadow-md hover:bg-opacity-90`
                )}
                 // <<< REMOVIDO: style={isSelected ? { backgroundColor: corPrimaria } : {}} >>>
              >
                {format(day, 'd')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default HoralisCalendar;