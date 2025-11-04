// src/pages/LandingPage.jsx

import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
// Importações de ícones que são usadas na Landing Page
import { Calendar, Link2, Sparkles, Clock, Users, Zap, Check, ArrowRight, Phone, LogIn, Menu, X, Smartphone, Mail, Lock as LockIcon } from 'lucide-react';
import { DISPLAY_PRICE_SETUP } from '@/utils/pricing';
// Importa os novos componentes/helpers
import SignupModalContent from '@/components/landing/SignupModalContent';
import { ImageWithFallback } from '@/ui/ImageWithFallback';
// import { parseApiError } from '@/utils/apiHelpers'; // Não é necessário aqui, mas mantemos o comentário para referência
// Imports do Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import AOS from 'aos';
import 'aos/dist/aos.css';


// --- CONFIGURAÇÕES GLOBAIS (APENAS CONSTANTES DE RENDERIZAÇÃO) ---
const WHATSAPP_LNK = "https://wa.me/5511936200327?text=Ol%C3%A1,%20Gostaria%20de%20saber%20mais%20sobre%20o%20horalis";
const BRAND_NAME = "Horalis";

// --- Definições de Cor ---
const CIANO_COLOR = 'cyan-800';
const CIANO_HOVER = 'cyan-700';
const CIANO_TEXT_CLASS = `text-${CIANO_COLOR}`;
const CIANO_BG_CLASS = `bg-${CIANO_COLOR}`;
const CIANO_BG_HOVER_CLASS = `hover:bg-${CIANO_HOVER}`;
const CIANO_RGB_COLOR = 'rgb(14, 116, 144)';


// --- Componentes Simples (Mantidos aqui) ---
const FeatureItem = ({ text }) => (
  <li className="flex items-center gap-3">
    <Check className="w-5 h-5 text-green-500 flex-shrink-0 stroke-current" />
    <span className="text-gray-700">{text}</span>
  </li>
);

const proFeatures = [
  "Agendamentos Ilimitados",
  "Pagamento de Sinal integrado",
  "Link para Agendamentos Personalizado",
  "Integração com Google Agenda",
  "Notificações por E-mail",
  "Lembretes Automáticos",
  "Gestão de Clientes",
  "E-mail Marketing",
  "Dashboards previsão de caixa e muito mais"

];

// --- ÚNICA DEFINIÇÃO DO renderIcon ---
// Usada tanto na LandingPage quanto passada para o Modal
const renderIcon = (IconComponent, extraClasses = "") => (
  <IconComponent className={`stroke-current ${extraClasses}`} />
);
// --- FIM DA DEFINIÇÃO ÚNICA ---


export function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const precosRef = useRef(null);

  useEffect(() => {
    // Carrega o script de segurança do Mercado Pago dinamicamente
    const script = document.createElement('script');
    script.src = "https://www.mercadopago.com/v2/security.js";
    script.setAttribute('data-public-key', "APP_USR-5aba548a-9868-41c3-927a-03bbdf9ca311");
    script.id = 'mercadopago-security';

    // Garante que o script seja adicionado ao final do <body>
    document.body.appendChild(script);

    // Limpeza: Remove o script quando o componente for desmontado (boa prática)
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // --- EFEITOS ---
  useEffect(() => {
    // Inicialização do AOS (Animação)
    AOS.init({ duration: 1000, once: true, offset: 100 });

    // Bloqueio de rolagem ao abrir o modal
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);


  // --- HANDLERS ---
  const handleScrollToPrecos = (e) => {
    e.preventDefault();
    precosRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (isMenuOpen) { setIsMenuOpen(false); }
  };

  // --- DADOS PARA O CARROSSEL ---
  const carouselSlides = [
    {
      imgSrc: "/pagina-agendamentos.png",
      title: "Sua Página de Agendamento Profissional",
      description: "Ofereça aos seus clientes uma experiência de agendamento 24/7. Eles podem ver seus serviços, preços e horários em uma página linda e direta."
    },
    {
      imgSrc: "/pagina-personalizacao.png",
      title: "Deixe com a Cara do Seu Studio",
      description: "Personalize sua página de agendamento com seu logo, nome e slogan. Veja as mudanças em tempo real e crie uma marca forte e profissional."
    },
    {
      imgSrc: "/calendario.png",
      title: "Agenda Inteligente e Centralizada",
      description: "Gerencie todos os horários em um calendário integrado ao Google."
    },
    {
      imgSrc: "/visao-geral.png",
      title: "Seu Negócio na Palma da Mão",
      description: "Acompanhe sua receita, novos agendamentos e futuros em um dashboard que mostra o que realmente importa para o seu sucesso."
    }
  ];


  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans overflow-x-hidden">

      {/* --- Cabeçalho --- */}
      <header className="sticky top-0 w-full bg-white border-b border-gray-200 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className={`text-2xl font-bold`}>
            {BRAND_NAME}
          </h1>
          <nav className="hidden sm:flex items-center gap-4">
            <Link
              to={`/login`}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg hover:bg-cyan-50 transition-colors`}
            >
              {renderIcon(LogIn, "w-4 h-4")}
              Acesso ao Painel
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white ${CIANO_BG_CLASS} rounded-lg shadow-sm ${CIANO_BG_HOVER_CLASS} transition-all`}
            >
              Quero Cadastrar!
              {renderIcon(ArrowRight, "w-4 h-4 ml-1")}
            </button>
          </nav>
          <button
            className="sm:hidden p-2 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Abrir Menu"
          >
            {isMenuOpen ? renderIcon(X, "w-6 h-6") : renderIcon(Menu, "w-6 h-6")}
          </button>
        </div>
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white shadow-md sm:hidden z-30 border-t border-gray-200">
            <div className="flex flex-col p-4 space-y-2">
              <Link
                to={`/login`}
                className={`flex items-center gap-2 px-3 py-2 text-base font-medium ${CIANO_TEXT_CLASS} hover:bg-cyan-50 rounded-md transition-colors`}
                onClick={() => setIsMenuOpen(false)}
              >
                {renderIcon(LogIn, "w-5 h-5")} Acesso ao Painel
              </Link>
              <button
                onClick={() => { setIsModalOpen(true); setIsMenuOpen(false); }}
                className={`flex items-center gap-2 px-3 py-2 text-base font-medium text-white ${CIANO_BG_CLASS} ${CIANO_BG_HOVER_CLASS} rounded-md transition-colors`}
              >
                {renderIcon(ArrowRight, "w-5 h-5")} Cadastre-se
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <div data-aos="fade-in" className="relative bg-white py-20">
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-8" data-aos="fade-up">
              <div className={`inline-flex items-center gap-2 px-4 py-2 bg-cyan-50 rounded-full border border-cyan-100 shadow-sm`}>
                {renderIcon(Sparkles, `w-4 h-4 ${CIANO_TEXT_CLASS}`)}
                <span className={`text-sm font-medium ${CIANO_TEXT_CLASS}`}>{BRAND_NAME} Agendamento Inteligente</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
                <span className="block">Foque no seu Trabalho.</span>
                <span className={`block ${CIANO_TEXT_CLASS}`}>
                  Deixe a Agenda Conosco
                </span>
              </h1>
              <p className="text-gray-600 text-lg" data-aos="fade-up" data-aos-delay="100">
                Simplifique sua vida! Seus clientes agendam pelo link, e os compromissos aparecem automaticamente na sua Google Agenda. Sem desorganização, sem esquecimentos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4" data-aos="fade-up" data-aos-delay="200">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className={`inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white ${CIANO_BG_CLASS} rounded-lg shadow-md ${CIANO_BG_HOVER_CLASS} hover:shadow-lg transition-all transform hover:scale-105`}
                >
                  Quero Cadastrar Meu Comercio
                  {renderIcon(ArrowRight, "ml-2 w-5 h-5")}
                </button>
              </div>
              <div className="flex gap-8 pt-8" data-aos="fade-up" data-aos-delay="300">
                <div>
                  <div className={`text-3xl font-bold ${CIANO_TEXT_CLASS}`}>100%</div>
                  <p className="text-sm text-gray-500">Automático</p>
                </div>
                <div>
                  <div className={`text-3xl font-bold ${CIANO_TEXT_CLASS}`}>24/7</div>
                  <p className="text-sm text-gray-500">Disponível</p>
                </div>
                <div>
                  <div className={`text-3xl font-bold ${CIANO_TEXT_CLASS}`}>0</div>
                  <p className="text-sm text-gray-500">Complicações</p>
                </div>
              </div>
            </div>
            {/* Right Column */}
            <div className="relative flex justify-center items-center lg:justify-end" data-aos="fade-left" data-aos-delay="100">
              <div className="relative rounded-2xl overflow-hidden shadow-lg border border-gray-200">
                <ImageWithFallback src="/visao-geral.png" alt="Interface Horalis" className="w-full h-auto object-cover" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div data-aos="fade-up" className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Como Funciona</h2>
            <p className="text-gray-600 text-lg">
              Apenas 3 passos simples para começar
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative p-8 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all group" data-aos="fade-up" data-aos-delay="100">
              <div className={`absolute -top-4 -left-4 w-12 h-12 rounded-full ${CIANO_BG_CLASS} flex items-center justify-center text-white shadow-lg text-lg font-bold`}>1</div>
              <div className={`w-16 h-16 rounded-2xl ${CIANO_BG_CLASS} flex items-center justify-center mb-6 group-hover:scale-105 transition-transform text-white`}>
                {renderIcon(Link2, "w-8 h-8")}
              </div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Receba seu Link</h3>
              <p className="text-sm text-gray-500">
                Faça seu cadastro conosco e receba um link único: (horalis.app/agenda/seu-id-unico) que leva ao seu Horalis personalizado com sua logo, serviços e cores para compartilhar com seus clientes.
              </p>
            </div>
            {/* Step 2 */}
            <div className="relative p-8 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all group" data-aos="fade-up" data-aos-delay="200">
              <div className={`absolute -top-4 -left-4 w-12 h-12 rounded-full ${CIANO_BG_CLASS} flex items-center justify-center text-white shadow-lg text-lg font-bold`}>2</div>
              <div className={`w-16 h-16 rounded-2xl ${CIANO_BG_CLASS} flex items-center justify-center mb-6 group-hover:scale-105 transition-transform text-white`}>
                {renderIcon(Users, "w-8 h-8")}
              </div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Compartilhe</h3>
              <p className="text-sm text-gray-500">
                Envie o link para seus clientes por WhatsApp, Instagram, SMS ou qualquer rede social.
              </p>
            </div>
            {/* Step 3 */}
            <div className="relative p-8 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all group" data-aos="fade-up" data-aos-delay="300">
              <div className={`absolute -top-4 -left-4 w-12 h-12 rounded-full ${CIANO_BG_CLASS} flex items-center justify-center text-white shadow-lg text-lg font-bold`}>3</div>
              <div className={`w-16 h-16 rounded-2xl ${CIANO_BG_CLASS} flex items-center justify-center mb-6 group-hover:scale-105 transition-transform text-white`}>
                {renderIcon(Calendar, "w-8 h-8")}
              </div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Receba Agendamentos</h3>
              <p className="text-sm text-gray-500">
                Os agendamentos aparecem automaticamente na sua Horalis agenda no seu painel e na sua Google Agenda. Simples assim!
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* --- SEÇÃO DE CARROSSEL --- */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div data-aos="fade-up" className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Conheça o {BRAND_NAME} por Dentro</h2>
            <p className="text-gray-600 text-lg">
              Um tour rápido pelas telas que vão transformar sua gestão, da visão do cliente ao seu painel de controle.
            </p>
          </div>

          <div data-aos="fade-up" data-aos-delay="100" className="horalis-swiper-container">
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              spaceBetween={30}
              slidesPerView={1}
              centeredSlides={true}
              pagination={{ clickable: true }}
              navigation={true}
              autoplay={{
                delay: 5000,
                disableOnInteraction: false
              }}
              loop={true}
              className="horalis-swiper"
            >
              {carouselSlides.map((slide, index) => (
                <SwiperSlide key={index}>
                  <div className="flex flex-col items-center text-center pb-16">

                    <div className="relative rounded-2xl overflow-hidden shadow-lg border border-gray-200 mb-8 max-w-4xl w-full h-96 bg-gray-900 flex justify-center items-center mx-auto">
                      <ImageWithFallback
                        src={slide.imgSrc}
                        alt={slide.title}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Textos */}
                    <h3 className="text-2xl font-semibold mb-3 text-gray-900">{slide.title}</h3>
                    <p className="text-gray-600 text-lg max-w-2xl px-4">
                      {slide.description}
                    </p>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>

        {/* Estilos das Setas (Mantidos no JSX, mas idealmente em um arquivo CSS global) */}
        <style>{`
                    .horalis-swiper-container {
                        position: relative;
                        width: 100%;
                    }
                    .horalis-swiper .swiper-button-prev,
                    .horalis-swiper .swiper-button-next {
                        color: ${CIANO_RGB_COLOR};
                        transition: all 0.2s ease-in-out;
                        background-color: rgba(255, 255, 255, 0.9);
                        width: 44px;
                        height: 44px;
                        border-radius: 9999px;
                        border: 1px solid rgba(0, 0, 0, 0.05);
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                    }
                    .horalis-swiper .swiper-button-prev::after,
                    .horalis-swiper .swiper-button-next::after {
                        font-size: 1.25rem;
                        font-weight: 700;
                    }
                    .horalis-swiper .swiper-button-prev:hover,
                    .horalis-swiper .swiper-button-next:hover {
                        transform: scale(1.05);
                        background-color: rgba(255, 255, 255, 1);
                    }
                    .horalis-swiper .swiper-pagination-bullet-active {
                        background-color: ${CIANO_RGB_COLOR};
                    }
                `}</style>
      </div>


      {/* Benefits Section */}
      <div data-aos="fade-up" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div className="order-2 lg:order-1" data-aos="fade-right">
              <div className="relative max-w-sm w-full rounded-2xl overflow-hidden shadow-lg border border-gray-200">
                <ImageWithFallback src="/pagina-agendamentos.png" alt="Calendário Horalis" className="w-full h-auto" />
              </div>
            </div>
            {/* Benefits List */}
            <div className="order-1 lg:order-2 space-y-6" data-aos="fade-left">
              <h2 className="text-3xl font-bold mb-8 text-gray-900">
                Por que escolher {BRAND_NAME}?
              </h2>
              <div className="space-y-4">
                {[
                  { icon: Mail, title: 'Lembretes automaticos', description: 'Notificações e-mails de confirmação cancelamento e muito mais, mantenha seu cliente sempre atualizado.' },
                  { icon: Smartphone, title: 'Responsividade', description: 'Sistema totalmente responsivo podendo utilizar tanto no celular como no computador' },
                  { icon: Zap, title: 'Rápido e Automático', description: 'Sem formulários complicados. Seu cliente agenda em segundos.' },
                  { icon: Calendar, title: 'Integração com Google', description: 'Todos os agendamentos vão direto para sua Google Agenda.' },
                  { icon: Clock, title: 'Economize Tempo', description: 'Nunca mais perca tempo anotando agendamentos manualmente.' },
                  { icon: Users, title: 'Experiência do Cliente', description: 'Eleve a experiência do seu cliente com um sistema de agendamentos feito sob medida.' },

                ].map((benefit, index) => (
                  <div key={index} className="flex gap-4 p-4 rounded-xl bg-white border border-gray-200 hover:bg-white transition-all hover:shadow-md">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${CIANO_BG_CLASS} flex items-center justify-center text-white`}>
                      {renderIcon(benefit.icon, "w-6 h-6")}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1 text-gray-900">{benefit.title}</h3>
                      <p className="text-sm text-gray-500">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- SEÇÃO DE PREÇOS --- */}
      <div data-aos="fade-up" className="py-20 bg-white" ref={precosRef}>
        <div className="max-w-7xl mx-auto px-6">
          {/* Título da Seção */}
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Um plano completo</h2>
            <p className="text-gray-600 text-lg">
              Sem taxas escondidas. Todos os recursos que você precisa, por um preço justo.
            </p>
          </div>

          {/* Card de Preço Único */}
          <div className="max-w-lg mx-auto bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden transform hover:scale-[1.02] transition-transform duration-300">
            <div className="p-8">
              <h3 className={`text-lg font-semibold ${CIANO_TEXT_CLASS} uppercase`}>Plano {BRAND_NAME} Pro</h3>
              <p className="text-gray-600 mt-1">Todos os recursos para automatizar sua agenda.</p>

              <div className="my-6">
                <p className="text-5xl font-bold text-gray-900">{DISPLAY_PRICE_SETUP}</p>
                <p className="text-lg font-medium text-gray-500">/mês</p>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className={`w-full inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white ${CIANO_BG_CLASS} rounded-lg shadow-md ${CIANO_BG_HOVER_CLASS} hover:shadow-lg transition-all transform hover:scale-105`}
              >
                Começar Agora
                {renderIcon(ArrowRight, "ml-2 w-5 h-5")}
              </button>
              <p className="text-center text-sm text-gray-500 mt-4">Pagamentos por Pix ou Cartão.</p>
            </div>

            <div className="bg-gray-50 p-8 border-t border-gray-100">
              <h4 className="text-base font-semibold text-gray-900 mb-4">Tudo incluído:</h4>
              <ul className="space-y-3">
                {proFeatures.map((feature, index) => (
                  <FeatureItem key={index} text={feature} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div data-aos="fade-up" className={`py-20 ${CIANO_BG_CLASS}`}>
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className="text-4xl font-bold mb-6 text-white">
            Pronto para simplificar seus agendamentos?
          </h2>
          <p className="text-lg mb-8 text-white/90">
            Junte-se a centenas de profissionais que já transformaram a forma de gerenciar agendamentos.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className={`inline-flex items-center justify-center bg-white ${CIANO_TEXT_CLASS} hover:bg-gray-100 px-12 py-4 text-base font-semibold rounded-lg shadow-xl hover:shadow-2xl transition-all transform hover:scale-105`}
          >
            Começar agora {DISPLAY_PRICE_SETUP}
            {renderIcon(ArrowRight, "ml-2 w-5 h-5")}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div data-aos="fade-up" className="py-12 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className={`text-xl font-bold`}>
                {BRAND_NAME}
              </h3>
              <p className="text-sm text-gray-500">
                Simplifique sua agenda, encante seus clientes
              </p>
            </div>
            <div className="flex gap-6 text-sm text-gray-600">
              <a
                href="#precos"
                onClick={handleScrollToPrecos}
                className={`hover:${CIANO_TEXT_CLASS} transition-colors cursor-pointer`}
              >
                Preços
              </a>
              <a href={WHATSAPP_LNK} target="_blank" rel="noopener noreferrer" className={`hover:${CIANO_TEXT_CLASS} transition-colors`}>Contato</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} {BRAND_NAME}. Todos os direitos reservados.
          </div>
        </div>
      </div>

      {/* --- ESTRUTURA DO MODAL (usa o novo componente) --- */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm transition-opacity duration-300 ease-out"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="transition-transform duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
            data-aos="zoom-in"
            data-aos-duration="300"
          >
            <SignupModalContent
              closeModal={() => setIsModalOpen(false)}
              isModalOpen={isModalOpen}
            />
          </div>
        </div>
      )}
      {/* --- FIM DA ESTRUTURA DO MODAL --- */}

    </div>
  );
}