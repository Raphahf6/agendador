import React, { useEffect } from 'react';
import { Button } from '@/ui/button'; // Assumindo que você tem este componente
import { Card } from '@/ui/card'; // Assumindo que você tem este componente
import { Calendar, Link2, Sparkles, Clock, Users, Zap, Check, ArrowRight, Phone } from 'lucide-react';
import { ImageWithFallback } from '@/ui/ImageWithFallback'; // Assumindo que o caminho está correto
import AOS from 'aos';
import 'aos/dist/aos.css';

// Link único do WhatsApp para todos os CTAs
const WHATSAPP_LNK = "https://w.app/rebdigitalsolucoes";
const BRAND_NAME = "Horalis"; // Definindo o nome da marca

export function LandingPage({ onGetStarted }) { // A prop onGetStarted não é mais usada, mas mantida

    useEffect(() => {
    AOS.init({
      duration: 1000, 
      once: true,      
      offset: 100,     
    });
  }, []); 

  return (
    
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 text-gray-800"> {/* Texto padrão escuro */}
        
      {/* --- Cabeçalho --- */}
      <header className="sticky top-0 w-full bg-white/90 backdrop-blur-sm border-b border-gray-200 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            {BRAND_NAME}
          </h1>
          <a
            href={WHATSAPP_LNK}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all font-semibold"
          >
            Quero Cadastrar ✨ 
            <Phone className="w-4 h-4 ml-1" />
          </a>
        </div>
      </header>
      
      {/* Hero Section */}
      <div data-aos="fade-right" data-aos-duration="1000" className="relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-300 rounded-full blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-300 rounded-full blur-3xl opacity-20 translate-x-1/2 translate-y-1/2" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="space-y-8" data-aos="fade-up"> {/* Animação no container de texto */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-700">{BRAND_NAME} Agendamento Inteligente</span>
              </div>
              
              <h1 className="text-3xl sm:text-5xl md:text-4xl font-bold tracking-tighter leading-tight text-gray-900"> {/* Cor de texto padrão */}
                <span className="block">Automatize</span>
                <span className="block bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Direto na sua Agenda
                </span>
              </h1>
              
              <p className="text-gray-600 text-lg" data-aos="fade-up" data-aos-delay="200">
                Simplifique sua vida! Seus clientes agendam pelo link, e os compromissos aparecem automaticamente na sua Google Agenda. Sem complicação, sem papel, sem esquecimentos.
              </p>

              <div className="flex flex-col sm:flex-row gap-4" data-aos="fade-up" data-aos-delay="400">
                {/* Botão principal agora é um link <a> estilizado */}
                <a 
                  href={WHATSAPP_LNK}
                  target="_blank" // Abre em nova aba
                  rel="noopener noreferrer" // Boa prática de segurança
                  // Aplicando as classes do <Button> diretamente no <a>
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg shadow-lg hover:from-pink-700 hover:to-purple-700 hover:shadow-xl transition-all transform hover:scale-105"
                >
                  Começar Agora
                  <ArrowRight className="ml-2 w-5 h-5" />
                </a>
                {/* Botão "Ver Demonstração" removido conforme solicitado */}
              </div>

              {/* Stats */}
              <div className="flex gap-8 pt-8" data-aos="fade-up" data-aos-delay="500">
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    100%
                  </div>
                  <p className="text-sm text-gray-500">Automático</p>
                </div>
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    24/7
                  </div>
                  <p className="text-sm text-gray-500">Disponível</p>
                </div>
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    Zero
                  </div>
                  <p className="text-sm text-gray-500">Papel</p>
                </div>
              </div>
            </div>

            {/* --- CORREÇÃO DA IMAGEM --- */}
            {/* Right Column - Image (Tamanho Ajustado) */}
            <div className="relative flex justify-center items-center" data-aos="fade-left" data-aos-delay="200">
              {/* Elemento de fundo (blur) */}
              <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-purple-600 rounded-3xl blur-2xl opacity-30 animate-pulse" />
              
              {/* Container da Imagem com tamanho restrito */}
              <div className="relative max-w-sm w-full rounded-3xl overflow-hidden shadow-2xl"> {/* max-w-sm restringe o tamanho */}
                <ImageWithFallback
                  src="/sistema-landing.png"
                  alt="Interface do sistema de agendamento Horalis"
                  className="w-full h-auto object-cover" // object-cover garante preenchimento
                  // Removidos width e height estáticos, Tailwind controla
                />
              </div>
            </div>
            {/* --- FIM DA CORREÇÃO --- */}

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

