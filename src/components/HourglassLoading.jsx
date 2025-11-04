const HourglassLoading = ({ primaryColor, size = "w-12 h-12", message = "Carregando..." }) => {
    // COR FIXA para evitar a transição visual. Usaremos um cinza escuro neutro (gray-700).
    const fixedLoadingColor = primaryColor || 'rgb(8 145 178)';

    // CSS Keyframes para a animação da ampulheta (Localizado aqui para garantir o escopo)
    const keyframes = `
        @keyframes sand-pour {
            0% { transform: scaleY(0); }
            100% { transform: scaleY(1); }
        }
        @keyframes hourglass-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        .sand-pour {
            transform-origin: top;
            animation: sand-pour 1.5s ease-in-out infinite alternate;
        }
        .hourglass-pulse {
            animation: hourglass-pulse 3s ease-in-out infinite;
        }
    `;

    return (
        <div className="flex flex-col items-center justify-center p-10">
            <style>{keyframes}</style>
            <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`hourglass-pulse ${size}`}>
                
                {/* Contorno da Ampulheta */}
                <path d="M20 20 H 80 L 80 80 H 20 L 20 20 Z M 50 50 L 80 80 M 50 50 L 20 80 M 50 50 L 80 20 M 50 50 L 20 20" stroke={fixedLoadingColor} strokeWidth="4" fill="none" strokeLinejoin="round" />
                
                {/* Areia Descendo (Animada) */}
                <rect x="48" y="50" width="4" height="25" fill={fixedLoadingColor} className="sand-pour" />
                
                {/* Linha Divisória */}
                <line x1="20" y1="50" x2="80" y2="50" stroke={fixedLoadingColor} strokeWidth="2" />
            </svg>

            <p className="text-gray-600 mt-3">{message}</p>
        </div>
    );
};

export default HourglassLoading;