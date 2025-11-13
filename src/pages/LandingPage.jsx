import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Link2, Sparkles, Clock, Users, Zap, Check, ArrowRight, Menu, X, Smartphone, Mail, Star, ShieldCheck, LogIn } from 'lucide-react';
import { DISPLAY_PRICE_SETUP } from '@/utils/pricing';
import SignupModalContent from '@/components/landing/SignupModalContent';
import { ImageWithFallback } from '@/ui/ImageWithFallback';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import AOS from 'aos';
import 'aos/dist/aos.css';

// Configs
const BRAND_NAME = "Horalis";
const WHATSAPP_LNK = "https://wa.me/5511936200327?text=Ol%C3%A1,%20quero%20conhecer%20o%20Horalis!";

// Cores do SaaS (Usando Ciano como base)
const PRIMARY_COLOR = '#0E7490'; 
const PRIMARY_BG_CLASS = 'bg-cyan-800';
const PRIMARY_HOVER_CLASS = 'hover:bg-cyan-900';
const TEXT_PRIMARY_CLASS = 'text-cyan-800';

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

export function LandingPage() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const precosRef = useRef(null);

    useEffect(() => {
        AOS.init({ duration: 800, once: true });
        const script = document.createElement('script');
        script.src = "https://www.mercadopago.com/v2/security.js";
        script.setAttribute('data-public-key', "APP_USR-5aba548a-9868-41c3-927a-03bbdf9ca311"); 
        document.body.appendChild(script);
        return () => { if (document.body.contains(script)) document.body.removeChild(script); };
    }, []);

    useEffect(() => {
        document.body.style.overflow = isModalOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isModalOpen]);

    const handleScrollToPrecos = (e) => {
        e.preventDefault();
        precosRef.current?.scrollIntoView({ behavior: 'smooth' });
        setIsMenuOpen(false);
    };

    const carouselSlides = [
        { imgSrc: "/visao-geral.png", title: "Painel de Controle Completo", desc: "Tenha uma visão 360º do seu negócio em tempo real." },
        { imgSrc: "/calendario.png", title: "Agenda Inteligente", desc: "Organize seus horários e evite conflitos automaticamente." },
        { imgSrc: "/pagina-agendamentos.png", title: "Site de Agendamento", desc: "Seu cliente agenda sozinho, 24h por dia." }
    ];

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden selection:bg-cyan-100">
            
            {/* --- NAVBAR FLUTUANTE --- */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isMenuOpen ? 'bg-white' : 'bg-white/90 backdrop-blur-md'} border-b border-gray-100`}>
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Logo Simples */}
                        <div className={`w-10 h-10 rounded-xl ${PRIMARY_BG_CLASS} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>H</div>
                        <span className="text-2xl font-bold tracking-tight">Horalis</span>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#funcionalidades" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Funcionalidades</a>
                        <a href="#precos" onClick={handleScrollToPrecos} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Preços</a>
                        <div className="flex items-center gap-4 ml-4">
                            <Link to="/login" className="text-sm font-semibold text-gray-900 hover:text-cyan-700">Entrar</Link>
                            <button onClick={() => setIsModalOpen(true)} className={`px-5 py-2.5 text-sm font-bold text-white rounded-full shadow-lg shadow-cyan-500/30 ${PRIMARY_BG_CLASS} ${PRIMARY_HOVER_CLASS} transition-all hover:-translate-y-0.5`}>
                                Testar Grátis
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-gray-600">
                        <Icon icon={isMenuOpen ? X : Menu} className="w-6 h-6" />
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-100 absolute w-full p-6 flex flex-col gap-4 shadow-xl">
                        <Link to="/login" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 font-medium"><Icon icon={LogIn} className="w-5 h-5"/> Acessar Painel</Link>
                        <button onClick={() => {setIsModalOpen(true); setIsMenuOpen(false);}} className={`w-full py-3 rounded-xl text-white font-bold ${PRIMARY_BG_CLASS}`}>Começar Agora</button>
                    </div>
                )}
            </nav>

            {/* --- HERO SECTION --- */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                {/* Background Decorativo */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-cyan-50/50 rounded-full blur-3xl -z-10"></div>
                
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-50 border border-cyan-100 text-cyan-800 text-sm font-medium mb-8 animate-fade-in-up">
                        <Icon icon={Sparkles} className="w-4 h-4" /> O sistema mais simples para o seu salão
                    </div>
                    
                    <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 text-gray-900 leading-tight" data-aos="fade-up">
                        Sua agenda cheia.<br/>
                        <span className={`text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600`}>Seu tempo livre.</span>
                    </h1>
                    
                    <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed" data-aos="fade-up" data-aos-delay="100">
                        Automatize agendamentos, reduza faltas e gerencie seu negócio de beleza com a plataforma feita para quem quer crescer.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16" data-aos="fade-up" data-aos-delay="200">
                        <button onClick={() => setIsModalOpen(true)} className={`px-8 py-4 rounded-full text-white font-bold text-lg shadow-xl shadow-cyan-600/20 ${PRIMARY_BG_CLASS} ${PRIMARY_HOVER_CLASS} transition-all hover:-translate-y-1 w-full sm:w-auto flex items-center justify-center gap-2`}>
                            Começar Gratuitamente <Icon icon={ArrowRight} className="w-5 h-5" />
                        </button>
                        <p className="text-sm text-gray-500">Sem cartão de crédito • Cancela quando quiser</p>
                    </div>

                    {/* Hero Image (Dashboard Preview) */}
                    <div className="relative max-w-5xl mx-auto mt-12" data-aos="fade-up" data-aos-delay="300">
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-20"></div>
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200/50 bg-white">
                            <ImageWithFallback src="/visao-geral.png" alt="Dashboard Horalis" className="w-full h-auto" />
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FEATURES GRID --- */}
            <section id="funcionalidades" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Tudo o que você precisa</h2>
                        <p className="text-gray-500">Ferramentas poderosas em uma interface simples.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: Link2, title: "Link na Bio", desc: "Seu site próprio de agendamento. O cliente clica, escolhe e agenda em segundos." },
                            { icon: Calendar, title: "Agenda Google", desc: "Sincronização bidirecional. Seus compromissos pessoais e profissionais em um só lugar." },
                            { icon: Zap, title: "Sem No-Shows", desc: "Cobrança de sinal (PIX) automática para garantir que o cliente compareça." },
                            { icon: Mail, title: "Marketing Automático", desc: "E-mails para aniversariantes e clientes sumidos para lotar sua agenda." },
                            { icon: Users, title: "CRM Simples", desc: "Histórico completo de cada cliente: o que fez, quanto gastou e quando volta." },
                            { icon: Smartphone, title: "100% Mobile", desc: "Gerencie seu salão pelo celular, de onde estiver. Sem apps pesados." }
                        ].map((feat, i) => (
                            <div key={i} className="p-8 rounded-2xl bg-gray-50 hover:bg-white border border-transparent hover:border-gray-100 hover:shadow-xl transition-all duration-300 group" data-aos="fade-up" data-aos-delay={i * 100}>
                                <div className={`w-12 h-12 rounded-xl ${PRIMARY_BG_CLASS} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>
                                    <Icon icon={feat.icon} className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{feat.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- CAROUSEL SECTION (Mantida mas com estilo novo) --- */}
            <section className="py-24 bg-gray-900 text-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div data-aos="fade-right">
                            <h2 className="text-3xl md:text-4xl font-bold mb-6">Veja o Horalis em ação</h2>
                            <p className="text-gray-400 text-lg mb-8">
                                Uma interface pensada para quem não tem tempo a perder. Rápida, bonita e eficiente.
                            </p>
                            <div className="flex flex-col gap-4">
                                {carouselSlides.map((slide, i) => (
                                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors">
                                        <div className="mt-1 w-6 h-6 rounded-full border border-cyan-500 flex items-center justify-center text-xs text-cyan-500 font-bold">{i+1}</div>
                                        <div>
                                            <h4 className="font-bold text-lg">{slide.title}</h4>
                                            <p className="text-sm text-gray-400">{slide.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="relative h-[500px] w-full" data-aos="fade-left">
                            <Swiper
                                modules={[Navigation, Pagination, Autoplay, EffectFade]}
                                effect="fade"
                                autoplay={{ delay: 4000 }}
                                loop={true}
                                className="h-full rounded-2xl shadow-2xl border border-white/10 bg-gray-800"
                            >
                                {carouselSlides.map((slide, index) => (
                                    <SwiperSlide key={index}>
                                        <img src={slide.imgSrc} alt={slide.title} className="w-full h-full object-cover opacity-90" />
                                        <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/90 to-transparent">
                                            <p className="text-white font-bold">{slide.title}</p>
                                        </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- PRICING SECTION --- */}
            <section id="precos" ref={precosRef} className="py-24 bg-white relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Investimento Simples</h2>
                        <p className="text-gray-500">Tudo incluso. Sem surpresas.</p>
                    </div>

                    <div className="max-w-lg mx-auto" data-aos="zoom-in">
                        <div className="relative p-8 rounded-3xl bg-white border-2 border-cyan-100 shadow-2xl shadow-cyan-100/50 overflow-hidden">
                            <div className="absolute top-0 right-0 bg-cyan-100 text-cyan-800 text-xs font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wide">Mais Popular</div>
                            
                            <h3 className="text-xl font-bold text-gray-900">Plano PRO</h3>
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-5xl font-extrabold text-gray-900">{DISPLAY_PRICE_SETUP}</span>
                                <span className="text-gray-500 font-medium">/mês</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">Teste grátis. Cancele quando quiser.</p>

                            <hr className="my-8 border-gray-100"/>

                            <ul className="space-y-4 mb-8">
                                {[
                                    "Agendamentos Ilimitados", "Microsite Personalizado", "Pagamento de Sinal (PIX)",
                                    "Notificações Automáticas", "Gestão de Clientes", "Suporte Prioritário"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-gray-700">
                                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                                            <Check className="w-3 h-3" />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>

                            <button 
                                onClick={() => setIsModalOpen(true)}
                                className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg ${PRIMARY_BG_CLASS} ${PRIMARY_HOVER_CLASS} transition-all hover:scale-[1.02]`}
                            >
                                Começar Agora
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="bg-gray-50 pt-16 pb-8 border-t border-gray-200">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg ${PRIMARY_BG_CLASS} flex items-center justify-center text-white font-bold`}>H</div>
                        <span className="text-xl font-bold text-gray-900">Horalis</span>
                    </div>
                    <div className="flex gap-8 text-sm text-gray-600 font-medium">
                        <a href="#" className="hover:text-cyan-700">Termos de Uso</a>
                        <a href="#" className="hover:text-cyan-700">Privacidade</a>
                        <a href={WHATSAPP_LNK} className="hover:text-cyan-700">Contato</a>
                    </div>
                    <p className="text-sm text-gray-400">© {new Date().getFullYear()} Horalis Inc.</p>
                </div>
            </footer>

            {/* --- MODAL DE CADASTRO --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <SignupModalContent closeModal={() => setIsModalOpen(false)} isModalOpen={isModalOpen} />
                    </div>
                </div>
            )}
        </div>
    );
}