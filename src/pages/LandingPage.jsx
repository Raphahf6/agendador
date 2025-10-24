import React, { useEffect, useState } from 'react'; // Adicionado useState
import { Link } from 'react-router-dom'; // Importa Link do Router
import { Button } from '@/ui/button'; 
import { Card } from '@/ui/card';
import { Calendar, Link2, Sparkles, Clock, Users, Zap, Check, ArrowRight, Phone, LogIn, Menu, X } from 'lucide-react'; // Adicionados LogIn, Menu, X
import { ImageWithFallback } from '@/ui/ImageWithFallback'; 
import AOS from 'aos';
import 'aos/dist/aos.css';

// Link único do WhatsApp para todos os CTAs
const WHATSAPP_LNK = "https://w.app/rebdigitalsolucoes";
const BRAND_NAME = "Horalis"; 
const DEFAULT_SALAO_ID = "00000000000"; // Placeholder para a rota de login

export function LandingPage() {
    const [isMenuOpen, setIsMenuOpen] = useState(false); // Estado para o menu hamburguer mobile

    useEffect(() => {
        AOS.init({
            duration: 1000, 
            once: true,      
            offset: 100,     
        });
    }, []); 

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 text-gray-800">

        {/* --- Cabeçalho --- */}
        <header className="sticky top-0 w-full bg-white/90 backdrop-blur-sm border-b border-gray-200 z-20">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    {BRAND_NAME}
                </h1>
                
                {/* Botão de Login (Desktop) */}
                <div className="hidden sm:flex items-center gap-4">
                    <Link
                        to={`/login`} // Rota de Login do Painel
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                    >
                        <LogIn className="w-4 h-4" />
                        Acesso ao Painel
                    </Link>

                    <a
                        href={WHATSAPP_LNK}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg shadow-lg hover:from-pink-700 hover:to-purple-700 transition-all"
                    >
                        Quero Cadastrar!
                        <ArrowRight className="w-4 h-4 ml-1" />
                    </a>
                </div>

                {/* Botão Hamburguer (Mobile) */}
                <button
                    className="sm:hidden p-2 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Abrir Menu"
                >
                    {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Menu Dropdown Mobile */}
            {isMenuOpen && (
                <div className="absolute top-full left-0 right-0 bg-white/95 backdrop-blur-sm shadow-md sm:hidden z-30">
                    <div className="flex flex-col p-4 space-y-2">
                        <Link
                            to={`/painel/${DEFAULT_SALAO_ID}/login`}
                            className="flex items-center gap-2 px-3 py-2 text-base font-medium text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <LogIn className="w-5 h-5" /> Acesso ao Painel
                        </Link>
                        <a
                            href={WHATSAPP_LNK}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 text-base font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <Phone className="w-5 h-5" /> Falar com Horalis
                        </a>
                    </div>
                </div>
            )}
        </header>
      
        {/* Hero Section */}
        <div data-aos="fade-right" data-aos-duration="1000" className="relative overflow-hidden">
            {/* ... (restante do código Hero Section) ... */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-purple-300 rounded-full blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-300 rounded-full blur-3xl opacity-20 translate-x-1/2 translate-y-1/2" />
            
            <div className="relative max-w-7xl mx-auto px-6 py-20">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left Column - Text Content */}
                    <div className="space-y-8" data-aos="fade-up">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <span className="text-sm text-purple-700">{BRAND_NAME} Agendamento Inteligente</span>
                        </div>
                        
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter leading-snug text-gray-900">
                            <span className="block">Foque no seu Trabalho.</span>
                            <span className="block bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                                Deixe a Agenda Conosco
                            </span>
                        </h1>
                        
                        <p className="text-gray-600 text-lg" data-aos="fade-up" data-aos-delay="200">
                            Simplifique sua vida! Seus clientes agendam pelo link, e os compromissos aparecem automaticamente na sua Google Agenda. Sem desorganização, sem esquecimentos.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4" data-aos="fade-up" data-aos-delay="400">
                            <a
                                href={WHATSAPP_LNK}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg shadow-lg hover:from-pink-700 hover:to-purple-700 hover:shadow-xl transition-all transform hover:scale-105"
                            >
                                Quero Cadastrar Meu Salão
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </a>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-8 pt-8" data-aos="fade-up" data-aos-delay="500">
                            <div>
                                <div className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">100%</div>
                                <p className="text-sm text-gray-500">Automático</p>
                            </div>
                            <div>
                                <div className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">24/7</div>
                                <p className="text-sm text-gray-500">Disponível</p>
                            </div>
                            <div>
                                <div className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">100%</div>
                                <p className="text-sm text-gray-500">Digital</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Image (Tamanho Ajustado) */}
                    <div className="relative flex justify-center items-center lg:justify-end" data-aos="fade-left" data-aos-delay="200">
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-purple-600 rounded-3xl blur-2xl opacity-30 animate-pulse" />
                        <div className="relative max-w-sm w-full rounded-3xl overflow-hidden shadow-2xl">
                            <ImageWithFallback src="/sistema-landing.png" alt="Interface do sistema de agendamento Horalis" className="w-full h-auto object-cover" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* How It Works Section */}
        <div className="py-20 bg-white/50 backdrop-blur-sm">
            {/* ... (Conteúdo da seção How It Works) ... */}
        </div>

        {/* Benefits Section */}
        <div data-aos="fade-up" data-aos-duration="1000" className="py-20">
            {/* ... (Conteúdo da Seção de Benefícios) ... */}
        </div>

        {/* CTA Section (Botão Atualizado para <a>) */}
        <div data-aos="fade-up" data-aos-duration="1000" className="py-20 bg-gradient-to-r from-pink-600 to-purple-600">
            <div className="max-w-4xl mx-auto px-6 text-center text-white">
                <h2 className="text-4xl font-bold mb-6 text-white">
                    Pronto para simplificar seus agendamentos?
                </h2>
                <p className="text-lg mb-8 text-white/90">
                    Junte-se a centenas de profissionais que já transformaram a forma de gerenciar agendamentos.
                </p>
                <a
                    href={WHATSAPP_LNK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center bg-white text-purple-600 hover:bg-gray-100 px-12 py-4 text-base font-semibold rounded-lg shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
                >
                    Entre em contato conosco
                    <ArrowRight className="ml-2 w-5 h-5" />
                </a>
            </div>
        </div>

        {/* Footer (Links Atualizados para <a>) */}
        <div data-aos="fade-up" data-aos-duration="1000" className="py-12 bg-white/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                            {BRAND_NAME}
                        </h3>
                        <p className="text-sm text-gray-500">
                            Simplifique sua agenda, encante seus clientes
                        </p>
                    </div>

                    <div className="flex gap-6 text-sm text-gray-600">
                        <a href={WHATSAPP_LNK} target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 transition-colors">Sobre</a>
                        <a href={WHATSAPP_LNK} target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 transition-colors">Recursos</a>
                        <a href={WHATSAPP_LNK} target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 transition-colors">Preços</a>
                        <a href={WHATSAPP_LNK} target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 transition-colors">Contato</a>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
                    © 2025 {BRAND_NAME}. Todos os direitos reservados.
                </div>
            </div>
        </div>
    </div>
  );
}