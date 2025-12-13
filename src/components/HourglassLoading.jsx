import React from 'react';

const HourglassLoading = ({ primaryColor, width = "w-64", message = "Carregando..." }) => {
    // Cor padrão: Um azul "tech" sofisticado, mas aceita a cor da sua marca.
    const activeColor = primaryColor || '#0ea5e9';

    const keyframes = `
        @keyframes shimmer-flow {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(20%); } /* Fica um pouco mais no meio para dar sensação de processamento */
            100% { transform: translateX(100%); }
        }
        @keyframes pulse-glow {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
        }
    `;

    return (
        <div className="flex flex-col items-center justify-center p-8 w-full">
            <style>{keyframes}</style>
            
            {/* Container de Texto e Status (Alinhado à esquerda da barra para leitura natural) */}
            <div className={`flex justify-between items-end ${width} mb-2`}>
                <span className="text-sm font-semibold text-gray-700 tracking-tight">
                    {message}
                </span>
                {/* Indicador visual de atividade (opcional, mas adiciona "vida") */}
                <div className="flex space-x-1">
                    <div className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>

            {/* A BARRA DE VIDRO (Container) */}
            <div 
                className={`relative h-2.5 ${width} bg-gray-200/50 rounded-full overflow-hidden backdrop-blur-sm shadow-inner ring-1 ring-black/5`}
            >
                {/* O LÍQUIDO/LUZ (Conteúdo Animado) */}
                <div 
                    className="absolute top-0 bottom-0 left-0 w-full rounded-full"
                    style={{
                        // O gradiente cria a sensação de "cometa" ou feixe de luz
                        background: `linear-gradient(90deg, transparent 0%, ${activeColor} 50%, transparent 100%)`,
                        animation: 'shimmer-flow 2s infinite cubic-bezier(0.4, 0, 0.2, 1)', // Cubic-bezier para dar "peso" ao movimento
                        opacity: 0.9,
                    }}
                >
                    {/* Brilho intenso no centro da barra ("Hotspot") */}
                    <div className="absolute top-0 bottom-0 left-1/2 w-20 -translate-x-1/2 bg-white/40 blur-md"></div>
                </div>
                
                {/* Reflexo de vidro estático por cima (Glass effect) */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>
            </div>

            {/* Sombra de brilho suave abaixo da barra (reflete a cor primária no "chão") */}
            <div 
                className={`mt-4 h-1 ${width} rounded-full blur-xl opacity-20`}
                style={{ backgroundColor: activeColor, animation: 'pulse-glow 2s ease-in-out infinite' }}
            ></div>
        </div>
    );
};

export default HourglassLoading;