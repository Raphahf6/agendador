// src/components/ui/calendar.jsx (Adaptado do seu código TSX)
"use client"; // Mantém a diretiva

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react"; // Usa a versão instalada
import { DayPicker } from "react-day-picker"; // Usa a versão instalada
import { ptBR } from 'date-fns/locale'; // Mantém o locale

import { cn } from "@/lib/utils"; // Mantém o utilitário
import { buttonVariants } from "@/ui/button"; // Mantém a importação

// Removemos as anotações de tipo das props
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale = ptBR, // Mantém o locale padrão
  ...props // O resto das props são passadas diretamente
}) {
  
    return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      locale={locale} 
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(/*...*/), // Mantém
        nav_button_previous: "absolute left-1", // Mantém
        nav_button_next: "absolute right-1", // Mantém
        table: "w-full border-collapse space-y-1", // Mantém

        // --- CORREÇÕES AQUI ---
        head_row: "flex justify-around mb-1", // <<< REMOVIDO 'flex' - Deixa o navegador usar display: table-row. Mantém justify e margin.
        head_cell:
          "text-gray-500 rounded-md w-9 font-normal text-xs uppercase text-center", // <<< Corrigido 'muted-foreground', adicionado text-center explícito
        row: "flex w-full mt-2 justify-around", // <<< REMOVIDO 'flex' - Deixa o navegador usar display: table-row. Mantém justify e margin.
        cell: cn( // Estilo da célula
            "relative h-9 w-9 p-0 text-center text-sm", // <<< Garante centralização
            "focus-within:relative focus-within:z-20",
             props.mode === "range" 
              ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
              : "[&:has([aria-selected])]:rounded-md",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100" // Aumentado h/w-8 para h/w-9
        ),
        day_range_start: "day-range-start", // Mantido para range
        day_range_end: "day-range-end",     // Mantido para range
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50", // Simplificado
          // "aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30", // Removido estilo complexo de outside selecionado por clareza
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames, // Permite sobrescrever via props
      }}
      components={{
        // Removemos a anotação de tipo { className, ...props } mas mantemos a lógica
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />, // Corrigido 'size-4' para h-4 w-4
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />, // Corrigido 'size-4' para h-4 w-4
      }}
      {...props} // Passa o resto das props para o DayPicker
    />
  );
}
Calendar.displayName = "Calendar"

export { Calendar }