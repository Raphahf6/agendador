// frontend/src/App.jsx (Versão CORRIGIDA - Fundo Gradiente Suave)
import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useParams, Navigate, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import ServiceList from './components/ServiceList';
import AppointmentScheduler from './components/AppointmentScheduler';
import ConfirmationPage from './components/ConfirmationPage';
import { LandingPage } from './pages/LandingPage';

// --- Componente SalonScheduler (COMPLETO e SEM 'user') ---
function SalonScheduler() { 
    const { salaoId } = useParams();

    const [selectedService, setSelectedService] = useState(null);
    const [appointmentConfirmed, setAppointmentConfirmed] = useState(null);
    const [salonDetails, setSalonDetails] = useState({
        nome_salao: '', tagline: '', url_logo: '', 
        cor_primaria: '#6366F1', cor_secundaria: '#EC4899',
        // Fallbacks para um gradiente MUITO suave
        cor_gradiente_inicio: '#F3F4F6', // Um cinza bem claro, quase branco
        cor_gradiente_fim: '#F8FAFC' // Um branco ainda mais sutil
    });
    const [loadingSalonData, setLoadingSalonData] = useState(true); 
    const [errorSalon, setErrorSalon] = useState(null);

    // --- Funções Handle COMPLETAS e SIMPLIFICADAS ---
     const handleDataLoaded = useCallback((details, error = null) => {
        setLoadingSalonData(false); 
        if (error) {
            setErrorSalon(error);
            setSalonDetails(prevDetails => ({ 
                 ...prevDetails, nome_salao: 'Erro ao Carregar', tagline: '', url_logo: '',
            }));
        } else if (details && typeof details === 'object') {
            setSalonDetails(prevDetails => {
                // Ao carregar os detalhes do salão, ajustamos as cores do gradiente de fundo
                // Pegamos a cor primária e secundária e as tornamos mais claras/transparentes para o fundo
                const basePrimary = details.cor_primaria || '#6366F1';
                const baseSecondary = details.cor_secundaria || '#EC4899';

                // Podemos usar uma ferramenta para clarear a cor ou simplesmente usar uma cor fixa muito clara
                // Para simplificar e garantir legibilidade, vamos misturar com branco ou usar tons pastel.
                // Uma forma simples é usar uma cor fixa MUITO clara no início e a cor primaria com um pouco de opacidade no fim.
                // OU, como o cliente pediu, vamos clarear a cor_primaria para usar no gradiente
                
                // Função simples para clarear um HEX (sem grandes bibliotecas)
                const lightenColor = (hex, percent) => {
                    const num = parseInt(hex.replace("#", ""), 16);
                    const amt = Math.round(2.55 * percent);
                    const R = (num >> 16) + amt;
                    const B = (num >> 8 & 0x00FF) + amt;
                    const G = (num & 0x0000FF) + amt;
                    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1);
                };

                const corFundoSuaveInicio = lightenColor(basePrimary, 75); // Clareia a cor primária em 75%
                const corFundoSuaveFim = lightenColor(baseSecondary, 75); // Clareia a cor secundária em 75%
                // Ou, se preferir um gradiente mais sutil do tipo "névoa":
                // const corFundoSuaveInicio = '#FBF8F9'; // Quase branco
                // const corFundoSuaveFim = lightenColor(basePrimary, 60); // A cor primária, mais clara

                return { 
                    ...prevDetails, 
                    ...details,
                    cor_gradiente_inicio: corFundoSuaveInicio, // Aplicando a cor mais clara
                    cor_gradiente_fim: corFundoSuaveFim      // Aplicando a cor mais clara
                }; 
            }); 
            setErrorSalon(null); 
        } else {
             console.error("handleDataLoaded: Detalhes inválidos recebidos!", details);
             setErrorSalon("Erro inesperado ao processar dados.");
             setSalonDetails(prevDetails => ({ ...prevDetails, nome_salao: 'Erro Inesperado' }));
        }
    }, []); 

     const handleServiceSelect = useCallback((service) => { 
         setSelectedService(service); 
         setAppointmentConfirmed(null); 
         window.scrollTo(0, 0); 
     }, []); 

     const handleAppointmentSuccess = useCallback((details) => { 
         setAppointmentConfirmed(details); 
         setSelectedService(null); 
         window.scrollTo(0, 0);
     }, []); 

     const handleGoBackHome = useCallback(() => { 
         setAppointmentConfirmed(null); 
         setSelectedService(null); 
     }, []); 

     const handleBackFromScheduler = useCallback(() => { 
         setSelectedService(null); 
     }, []); 
    // --- Fim das Funções Handle ---

     if (!salaoId) { 
         return <p className="p-4 text-center text-red-600">ID do Salão inválido na URL.</p>;
     }

    // --- Lógica de Renderização ---
    const renderContent = () => {
        const styleProps = { styleOptions: salonDetails };

        if (loadingSalonData && !errorSalon) {
             return <ServiceList 
                      salaoId={salaoId} 
                      onDataLoaded={handleDataLoaded} 
                      onServiceClick={handleServiceSelect} 
                   />; 
        }
        if (errorSalon) {
            return <p className="p-4 text-center text-red-600">{errorSalon}</p>;
        }
        if (appointmentConfirmed) {
          return <ConfirmationPage 
                    appointmentDetails={appointmentConfirmed} 
                    onGoBack={handleGoBackHome} 
                    {...styleProps}
                 />;
        } 
        if (selectedService) {
             return <AppointmentScheduler 
                       salaoId={salaoId} 
                       selectedService={selectedService} 
                       onAppointmentSuccess={handleAppointmentSuccess} 
                       {...styleProps}
                    />;
        }
        return <ServiceList 
                  salaoId={salaoId} 
                  onDataLoaded={handleDataLoaded} 
                  onServiceClick={handleServiceSelect} 
               />; 
      };

    // --- OBJETO DE ESTILO DINÂMICO PARA O FUNDO ---
    const backgroundStyle = {
        background: `linear-gradient(to bottom right, ${salonDetails.cor_gradiente_inicio}, ${salonDetails.cor_gradiente_fim})`,
        minHeight: '100vh',
    };

    // --- RETURN Principal do SalonScheduler ---
    return (
        <div style={backgroundStyle} className="w-full font-sans"> 
            
            {/* Cabeçalho Condicional */}
            {!appointmentConfirmed && (
                <header className="pt-8 pb-6 px-4 text-center relative">
                    {/* Botão Voltar */}
                    {selectedService && ( 
                         <div className="absolute top-4 left-2 z-10"> 
                            <button onClick={handleBackFromScheduler} className="text-gray-600 hover:text-gray-900 font-medium flex items-center p-2 rounded transition-colors hover:bg-white/30 text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                Voltar
                            </button>
                        </div> 
                    )}
                    
                    {/* Logo, Nome e Tagline */}
                    {!selectedService && !loadingSalonData && !errorSalon && ( 
                        <div className="flex flex-col items-center"> 
                            {salonDetails.url_logo && ( <img alt={salonDetails.nome_salao} src={salonDetails.url_logo} className="w-20 h-20 rounded-full mb-4 border-2 border-white shadow-lg object-cover" /> )}
                            <h1 className="text-2xl mb-1 bg-gradient-to-r bg-clip-text text-transparent tracking-tight" style={{ backgroundImage: `linear-gradient(to right, ${salonDetails.cor_primaria}, ${salonDetails.cor_secundaria})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} > {salonDetails.nome_salao} </h1>
                            <p className="text-base text-gray-600 font-light mb-8"> {salonDetails.tagline} </p>
                             <div className="w-full px-2">
                                <h2 className="text-center mb-2"> Selecione um Serviço </h2>
                                <p className="text-center text-muted-foreground"> Escolha o serviço desejado para agendar </p>
                            </div>
                        </div>
                    )}
                    {/* Loading/Erro iniciais */}
                    {loadingSalonData && !errorSalon && !selectedService && ( <p className="text-gray-600 animate-pulse">Carregando dados do salão...</p> )}
                    {errorSalon && !selectedService && ( <p className="text-red-600">Erro ao carregar dados do salão.</p> )}
                  
                    
                </header>
            )}
            
            <main className={!appointmentConfirmed ? "pb-24 px-4" : ""}> 
                 {renderContent()}
            </main>
        </div>
    );
} // Fim do SalonScheduler


// --- Componente App Principal (Simplificado - SEM Autenticação) ---
function App() {
   return (
       <div className="relative min-h-screen"> 
           <Routes>
              <Route path="/agendar/:salaoId" element={<SalonScheduler />} /> 
              <Route 
                 path="/" 
                 element={<LandingPage></LandingPage> } 
              />
              <Route path="*" element={<Navigate to="/" replace />} /> 
           </Routes>
       </div>
   );
} // Fim do App

export default App;

