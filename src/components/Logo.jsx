import React from 'react';

export const LogoHoralis = ({ className = "", size = "h-8", showText = true, darkText = false }) => {
  // Cores extraídas do seu design
  const colors = {
    iconStroke: "#1F2937", // Cor da borda do ícone (quase preto)
    dotBlue: "#3B82F6",    // Azul vibrante dos pontos
    textMain: "#111827",   // Texto 'Horalis' (Escuro)
    textMainLight: "#FFFFFF", // Texto 'Horalis' (Claro para fundo escuro)
    textSub: "#6B7280"     // Texto 'AGENDAMENTOS' (Cinza)
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      
      {/* --- ÍCONE (SVG Vetorial Clean) --- */}
      <svg 
        viewBox="0 0 40 40" 
        className={`${size} w-auto`} 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Borda do Calendário */}
        <rect x="4" y="6" width="32" height="28" rx="4" stroke={colors.iconStroke} strokeWidth="2.5" />
        
        {/* Linha Superior */}
        <path d="M4 14 H36" stroke={colors.iconStroke} strokeWidth="2.5" />
        
        {/* Pontos Azuis (Grid de 2x3) */}
        <circle cx="14" cy="20" r="2" fill={colors.dotBlue} />
        <circle cx="26" cy="20" r="2" fill={colors.dotBlue} />
        
        <circle cx="10" cy="26" r="1.5" fill={colors.dotBlue} />
        <circle cx="20" cy="26" r="1.5" fill={colors.dotBlue} />
        <circle cx="30" cy="26" r="1.5" fill={colors.dotBlue} />
      </svg>

      {/* --- TEXTO --- */}
      {showText && (
        <div className="flex flex-col justify-center">
          <span 
            className="font-extrabold tracking-tight text-xl leading-none"
            style={{ color: darkText ? colors.textMain : colors.textMainLight }}
          >
            Horalis
          </span>
          <span 
            className="text-[0.6rem] font-bold tracking-[0.15em] uppercase leading-none mt-0.5"
            style={{ color: darkText ? colors.textSub : "#9CA3AF" }}
          >
            Agendamentos
          </span>
        </div>
      )}
    </div>
  );
};