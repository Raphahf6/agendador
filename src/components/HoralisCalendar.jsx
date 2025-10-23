// frontend/src/components/HoralisCalendar.jsx
import React, { useState } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay, // 0 = Dom, 1 = Seg
  isSameDay,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils"; // Importa o utilitário 'cn' do shadcn

/**
 * Props:
 * - selectedDate (Date): A data atualmente selecionada.
 * - onDateSelect (function): Função chamada quando uma data é clicada.
 * - styleOptions (object): Objeto com as cores dinâmicas { corPrimaria, corSecundaria, ... }.
 */
function HoralisCalendar({ selectedDate, onDateSelect, styleOptions }) {
  // Estado para controlar o mês que está sendo exibido
  const [displayDate, setDisplayDate] = useState(selectedDate || new Date());

  // Cores dinâmicas com fallbacks
  const corPrimaria = styleOptions?.cor_primaria || '#6366F1';

  // --- Funções de Navegação ---
  const goToNextMonth = () => {
    setDisplayDate(addMonths(displayDate, 1));
  };
  const goToPreviousMonth = () => {
    setDisplayDate(subMonths(displayDate, 1));
  };

  // --- Geração dos Dias ---
  const firstDayOfMonth = startOfMonth(displayDate);
  const lastDayOfMonth = endOfMonth(displayDate);
  
  // Cria um array com todos os objetos Date para o mês atual
  const daysInMonth = eachDayOfInterval({
    start: firstDayOfMonth,
    end: lastDayOfMonth,
  });

  // Encontra o dia da semana em que o mês começa (0 = Domingo)
  const startingDayOfWeek = getDay(firstDayOfMonth);

  // Cria um array de placeholders (células vazias) para os dias antes do dia 1
  const paddingDays = Array.from({ length: startingDayOfWeek });

  // Cabeçalhos dos dias da semana
  const weekDaysHeader = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    // Container principal do calendário: fundo branco, sombra, bordas arredondadas
    <div className="w-full max-w-sm mx-auto bg-white rounded-xl shadow-lg border border-gray-100 p-4">
      
      {/* 1. Cabeçalho: Navegação e Mês/Ano */}
      <div className="flex items-center justify-between mb-4">
        {/* Botão Mês Anterior */}
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Título Mês/Ano */}
        <div 
          className="text-lg font-semibold text-gray-800 capitalize"
          // Aplica o gradiente de texto no título, como você gosta
          style={{
              background: `linear-gradient(to right, ${styleOptions?.cor_primaria || '#EC4899'}, ${styleOptions?.cor_secundaria || '#8B5CF6'})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block'
          }}
        >
          {format(displayDate, 'MMMM yyyy', { locale: ptBR })}
        </div>

        {/* Botão Próximo Mês */}
        <button
          type="button"
          onClick={goToNextMonth}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Corpo: Grid dos Dias */}
      <div className="grid grid-cols-7 gap-y-1">
        {/* Cabeçalho dos Dias da Semana (Dom, Seg, Ter...) */}
        {weekDaysHeader.map((day) => (
          <div
            key={day}
            className="text-xs font-medium text-center text-gray-400 uppercase pt-1 pb-2"
          >
            {day}
          </div>
        ))}

        {/* Células Vazias (padding) */}
        {paddingDays.map((_, index) => (
          <div key={`padding-${index}`} className="h-10 w-10"></div> // Placeholder
        ))}

        {/* Células dos Dias */}
        {daysInMonth.map((day) => {
          const isSelected = isSameDay(day, selectedDate || null);
          const isCurrentDay = isToday(day);
          
          return (
            <div key={day.toString()} className="flex justify-center items-center">
              <button
                type="button"
                onClick={() => onDateSelect(day)}
                // 'cn' mescla classes Tailwind de forma inteligente
                className={cn(
                  "h-9 w-9 flex items-center justify-center rounded-full text-sm font-medium transition-all duration-150",
                  // Estilos Padrão
                  "text-gray-700 hover:bg-gray-100",
                  
                  // Estilo "Hoje" (se não selecionado)
                  !isSelected && isCurrentDay && "bg-gray-100 text-blue-600 font-bold",
                  
                  // Estilo "Selecionado" (com cor primária dinâmica)
                  isSelected && "text-white shadow-lg"
                )}
                // Aplica a cor primária dinâmica como fundo se selecionado
                style={isSelected ? { backgroundColor: corPrimaria } : {}}
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
