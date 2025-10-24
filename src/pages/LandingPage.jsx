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
                <Phone className="w-5 h-5" /> Contate-nos
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
                  <div className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">0</div>
                  <p className="text-sm text-gray-500">Complicações</p>
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
        <div className="max-w-7xl mx-auto px-6">
          <div data-aos="fade-up" data-aos-duration="1000" className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Como Funciona</h2>
            <p className="text-gray-600 text-lg">
              Apenas 3 passos simples para começar
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <Card className="relative p-8 border-0 shadow-lg hover:shadow-xl transition-all group" data-aos="fade-up" data-aos-delay="100">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg text-lg font-bold">1</div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Link2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Receba seu Link</h3>
              <p className="text-sm text-gray-500">
                Faça seu cadastro conosco e receba um link único: (horalis.com/agenda/seu-id-unico) que leva ao seu Horalis personalizado com sua logo, serviços e cores para compartilhar com seus clientes.
              </p>
            </Card>

            {/* Step 2 */}
            <Card className="relative p-8 border-0 shadow-lg hover:shadow-xl transition-all group" data-aos="fade-up" data-aos-delay="200">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg text-lg font-bold">2</div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Compartilhe</h3>
              <p className="text-sm text-gray-500">
                Envie o link para seus clientes por WhatsApp, Instagram, SMS ou qualquer rede social.
              </p>
            </Card>

            {/* Step 3 */}
            <Card className="relative p-8 border-0 shadow-lg hover:shadow-xl transition-all group" data-aos="fade-up" data-aos-delay="300">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg text-lg font-bold">3</div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Receba Agendamentos</h3>
              <p className="text-sm text-gray-500">
                Os agendamentos aparecem automaticamente na sua Google Agenda. Simples assim!
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div data-aos="fade-up" data-aos-duration="1000" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div className="order-2 lg:order-1" data-aos="fade-right">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1729860648922-a79abb2fbcf0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFydHBob25lJTIwY2FsZW5kYXIlMjBhcHB8ZW58MXx8fHwxNzYxMTg5MjI5fDA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Calendário no smartphone"
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Benefits List */}
            <div className="order-1 lg:order-2 space-y-6" data-aos="fade-left">
              <h2 className="text-3xl font-bold mb-8 text-gray-900">
                Por que escolher {BRAND_NAME}?
              </h2>

              <div className="space-y-4">
                {[
                  { icon: <Zap className="w-6 h-6" />, title: 'Rápido e Automático', description: 'Sem formulários complicados. Seu cliente agenda em segundos.' },
                  { icon: <Calendar className="w-6 h-6" />, title: 'Integração com Google', description: 'Todos os agendamentos vão direto para sua Google Agenda.' },
                  { icon: <Clock className="w-6 h-6" />, title: 'Economize Tempo', description: 'Nunca mais perca tempo anotando agendamentos manualmente.' },
                  { icon: <Users className="w-6 h-6" />, title: 'Experiência do Cliente', description: 'Eleve a experiência do seu cliente com um sistema de agendamentos feito sob medida.' },
                ].map((benefit, index) => (
                  <div key={index} className="flex gap-4 p-4 rounded-xl bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-all">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white">
                      {benefit.icon}
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