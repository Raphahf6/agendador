import React, { useState, useEffect, useCallback, useRef } from 'react';

const FullScreenLoading = () => {
    // COR FIXA para evitar a transição visual. Usaremos um cinza escuro neutro (gray-700).
    const fixedSplashColor = 'rgb(8 145 178)';
    const [showSplash, setShowSplash] = useState(true);
    const [isFadingOut, setIsFadingOut] = useState(false);


    // CSS Keyframes para a animação da ampulheta
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
        <div
            className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'} bg-white`}
            style={{ display: showSplash ? 'flex' : 'none' }}
        >
            <style>{keyframes}</style>
            <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="hourglass-pulse">

                {/* Contorno da Ampulheta */}
                <path d="M20 20 H 80 L 80 80 H 20 L 20 20 Z M 50 50 L 80 80 M 50 50 L 20 80 M 50 50 L 80 20 M 50 50 L 20 20" stroke={fixedSplashColor} strokeWidth="4" fill="none" strokeLinejoin="round" />

                {/* Base Superior do Preenchimento */}
                <rect x="25" y="25" width="50" height="25" fill={fixedSplashColor} opacity="0.1" />

                {/* Areia Descendo (Animada) */}
                <rect x="48" y="50" width="4" height="25" fill={fixedSplashColor} className="sand-pour" />

                {/* Base Inferior do Preenchimento */}
                <rect x="25" y="50" width="50" height="25" fill={fixedSplashColor} opacity="0.1" />

                {/* Linha Divisória */}
                <line x1="20" y1="50" x2="80" y2="50" stroke={fixedSplashColor} strokeWidth="2" />
            </svg>

            <p className="mt-8 text-2xl font-bold tracking-wider animate-pulse" style={{ color: fixedSplashColor }}>
                Horalis
            </p>
            <p className="mt-2 text-md text-gray-500">
                Preparando seu Agendamento
            </p>
        </div>
    );
};

export default FullScreenLoading;