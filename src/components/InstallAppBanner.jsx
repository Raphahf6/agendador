import React, { useState, useEffect } from 'react';
import { X, Download, Share, PlusSquare, Smartphone } from 'lucide-react';

const InstallAppBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Verifica se o usuário já fechou o banner recentemente (últimos 7 dias)
    const hiddenUntil = localStorage.getItem('horalis_install_hidden_until');
    if (hiddenUntil && new Date() < new Date(hiddenUntil)) {
      return;
    }

    // 2. Detecta iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Se for iOS, verifica se já está em modo "standalone" (instalado)
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIosDevice && !isStandalone) {
      setIsVisible(true);
    }

    // 4. Captura evento do Android/Chrome
    const handleBeforeInstallPrompt = (e) => {
      console.log("📢 Evento beforeinstallprompt DISPARADO!"); // OLHE O CONSOLE
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Salva para não mostrar de novo por 7 dias
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    localStorage.setItem('horalis_install_hidden_until', nextWeek.toISOString());
  };


  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-2xl border border-slate-700 relative max-w-md mx-auto">
        
        <button 
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-cyan-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-cyan-900/50">
            <Smartphone className="w-7 h-7 text-white" />
          </div>

          <div className="flex-1">
            <h4 className="font-bold text-lg mb-1">Instalar Aplicativo</h4>
            
            {/* LÓGICA DE EXIBIÇÃO: IOS vs ANDROID */}
            {isIOS ? (
              <div className="text-sm text-slate-300 space-y-2">
                <p>Para instalar no seu iPhone:</p>
                <div className="flex items-center gap-2">
                  1. Toque em <Share className="w-4 h-4 text-blue-400" /> <strong>Compartilhar</strong>
                </div>
                <div className="flex items-center gap-2">
                  2. Selecione <PlusSquare className="w-4 h-4 text-gray-400" /> <strong>Adicionar à Tela de Início</strong>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-300 mb-3">
                  Tenha acesso rápido à sua agenda direto da tela inicial, sem abrir o navegador.
                </p>
                <button 
                  onClick={handleInstallClick}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Instalar Agora
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallAppBanner;