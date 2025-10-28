import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Link2, Sparkles, Clock, Users, Zap, Check, ArrowRight, Phone, LogIn, Menu, X } from 'lucide-react';
import { ImageWithFallback } from '@/ui/ImageWithFallback';
import AOS from 'aos';
import 'aos/dist/aos.css';

const WHATSAPP_LNK = "https://w.app/rebdigitalsolucoes";
const BRAND_NAME = "Horalis";

const CIANO_COLOR = 'cyan-600';
const CIANO_HOVER = 'cyan-700';
const CIANO_TEXT_CLASS = `text-${CIANO_COLOR}`;
const CIANO_BG_CLASS = `bg-${CIANO_COLOR}`;
const CIANO_BG_HOVER_CLASS = `hover:bg-${CIANO_HOVER}`;

export function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      offset: 100,
    });
  }, []);

  // Helper para renderizar ícones com classes base
  const renderIcon = (IconComponent, extraClasses = "") => (
    <IconComponent className={`stroke-current ${extraClasses}`} />
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">

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
            <a
              href={WHATSAPP_LNK}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white ${CIANO_BG_CLASS} rounded-lg shadow-sm ${CIANO_BG_HOVER_CLASS} transition-all`}
            >
              Quero Cadastrar!
              {renderIcon(ArrowRight, "w-4 h-4 ml-1")}
            </a>
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
              <a
                href={WHATSAPP_LNK}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-base font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {renderIcon(Phone, "w-5 h-5")} Contate-nos
              </a>
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
                {renderIcon(Sparkles, `w-4 h-4`)}
                <span className={`text-sm font-medium`}>{BRAND_NAME} Agendamento Inteligente</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
                <span className="block">Foque no seu Trabalho.</span>
                <span className={`block`}>
                  Deixe a Agenda Conosco
                </span>
              </h1>
               {/* <<< TEXTO ORIGINAL RESTAURADO >>> */}
              <p className="text-gray-600 text-lg" data-aos="fade-up" data-aos-delay="100">
                Simplifique sua vida! Seus clientes agendam pelo link, e os compromissos aparecem automaticamente na sua Google Agenda. Sem desorganização, sem esquecimentos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4" data-aos="fade-up" data-aos-delay="200">
                <a
                  href={WHATSAPP_LNK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white ${CIANO_BG_CLASS} rounded-lg shadow-md ${CIANO_BG_HOVER_CLASS} hover:shadow-lg transition-all transform hover:scale-105`}
                >
                  Quero Cadastrar Meu Salão
                  {renderIcon(ArrowRight, "ml-2 w-5 h-5")}
                </a>
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
                <ImageWithFallback src="/calendario.png" alt="Interface Horalis" className="w-full h-auto object-cover" />
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
             {/* <<< TEXTO ORIGINAL RESTAURADO >>> */}
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
               {/* <<< TEXTO ORIGINAL RESTAURADO >>> */}
              <p className="text-sm text-gray-500">
                Faça seu cadastro conosco e receba um link único: (horalis.com/agenda/seu-id-unico) que leva ao seu Horalis personalizado com sua logo, serviços e cores para compartilhar com seus clientes.
              </p>
            </div>
            {/* Step 2 */}
            <div className="relative p-8 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all group" data-aos="fade-up" data-aos-delay="200">
              <div className={`absolute -top-4 -left-4 w-12 h-12 rounded-full ${CIANO_BG_CLASS} flex items-center justify-center text-white shadow-lg text-lg font-bold`}>2</div>
               <div className={`w-16 h-16 rounded-2xl ${CIANO_BG_CLASS} flex items-center justify-center mb-6 group-hover:scale-105 transition-transform text-white`}>
                 {renderIcon(Users, "w-8 h-8")}
               </div>
               <h3 className="text-lg font-semibold mb-3 text-gray-900">Compartilhe</h3>
                {/* <<< TEXTO ORIGINAL RESTAURADO >>> */}
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
                {/* <<< TEXTO ORIGINAL RESTAURADO >>> */}
               <p className="text-sm text-gray-500">
                 Os agendamentos aparecem automaticamente na sua Horalis agenda no seu painel e na sua Google Agenda. Simples assim!
               </p>
             </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div data-aos="fade-up" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div className="order-2 lg:order-1" data-aos="fade-right">
              <div className="relative max-w-sm w-full rounded-2xl overflow-hidden shadow-lg border border-gray-200">
                <ImageWithFallback src="sistema-landing.png" alt="Calendário Horalis" className="w-full h-auto"/>
              </div>
            </div>
            {/* Benefits List */}
            <div className="order-1 lg:order-2 space-y-6" data-aos="fade-left">
              <h2 className="text-3xl font-bold mb-8 text-gray-900">
                Por que escolher {BRAND_NAME}?
              </h2>
              <div className="space-y-4">
                 {/* <<< TEXTOS ORIGINAIS RESTAURADOS >>> */}
                {[
                  { icon: Zap, title: 'Rápido e Automático', description: 'Sem formulários complicados. Seu cliente agenda em segundos.' },
                  { icon: Calendar, title: 'Integração com Google', description: 'Todos os agendamentos vão direto para sua Google Agenda.' },
                  { icon: Clock, title: 'Economize Tempo', description: 'Nunca mais perca tempo anotando agendamentos manualmente.' },
                  { icon: Users, title: 'Experiência do Cliente', description: 'Eleve a experiência do seu cliente com um sistema de agendamentos feito sob medida.' },
                ].map((benefit, index) => (
                  <div key={index} className="flex gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 hover:bg-white transition-all">
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

      {/* CTA Section */}
      <div data-aos="fade-up" className={`py-20 ${CIANO_BG_CLASS}`}>
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
           {/* <<< TEXTO ORIGINAL RESTAURADO >>> */}
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
            className={`inline-flex items-center justify-center bg-white ${CIANO_TEXT_CLASS} hover:bg-gray-100 px-12 py-4 text-base font-semibold rounded-lg shadow-xl hover:shadow-2xl transition-all transform hover:scale-105`}
          >
             {/* <<< TEXTO ORIGINAL RESTAURADO >>> */}
            Entre em contato conosco
            {renderIcon(ArrowRight, "ml-2 w-5 h-5")}
          </a>
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
               {/* <<< TEXTO ORIGINAL RESTAURADO >>> */}
              <p className="text-sm text-gray-500">
                Simplifique sua agenda, encante seus clientes
              </p>
            </div>
            <div className="flex gap-6 text-sm text-gray-600">
               {/* <<< TEXTOS ORIGINAIS RESTAURADOS >>> */}
              <a href={WHATSAPP_LNK} target="_blank" rel="noopener noreferrer" className={`hover:${CIANO_TEXT_CLASS} transition-colors`}>Sobre</a>
              <a href={WHATSAPP_LNK} target="_blank" rel="noopener noreferrer" className={`hover:${CIANO_TEXT_CLASS} transition-colors`}>Recursos</a>
              <a href={WHATSAPP_LNK} target="_blank" rel="noopener noreferrer" className={`hover:${CIANO_TEXT_CLASS} transition-colors`}>Preços</a>
              <a href={WHATSAPP_LNK} target="_blank" rel="noopener noreferrer" className={`hover:${CIANO_TEXT_CLASS} transition-colors`}>Contato</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} {BRAND_NAME}. Todos os direitos reservados.
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;