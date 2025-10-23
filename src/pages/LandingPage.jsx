import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Calendar, Link2, Sparkles, Clock, Users, Zap, Check, ArrowRight } from 'lucide-react';
import ImageWithFallback from '@/ui/ImageWithFallback';
import React, { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css'; // Import AOS CSS

const WHATSAPP_LNK = "https://w.app/rebdigitalsolucoes"

export function LandingPage({ onGetStarted }) {

    useEffect(() => {
    AOS.init({
      // Configurações Opcionais:
      duration: 1000, // Duração da animação (em ms)
      once: true,      // Se a animação deve acontecer apenas uma vez
      offset: 100,     // Distância (em px) do fundo para disparar a animação
    });
  }, []); // O array vazio [] garante que isso rode apenas uma vez
  // --- FIM DA INICIALIZAÇÃO ---

  return (
    
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
        
      {/* Hero Section */}
      <div data-aos="fade-right" data-aos-duration="1000" className="relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-300 rounded-full blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-300 rounded-full blur-3xl opacity-20 translate-x-1/2 translate-y-1/2" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-700">Horalis de Agendamento Inteligente</span>
              </div>
              
              <h1 className="leading-tight">
                <span className="block">Agendamentos</span>
                <span className="block bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Direto na sua Agenda
                </span>
              </h1>
              
              <p className="text-muted-foreground text-lg">
                Simplifique sua vida! Seus clientes agendam pelo link, e os compromissos aparecem automaticamente na sua Google Agenda. Sem complicação, sem papel, sem esquecimentos.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <a href={WHATSAPP_LNK}>
                <Button 
                  onClick={onGetStarted}
                  className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white px-8 py-6 shadow-lg hover:shadow-xl transition-all"
                >
                
                  Começar Agora
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                </a>
                
               
              </div>

              {/* Stats */}
              <div className="flex gap-8 pt-8">
                <div>
                  <div className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    100%
                  </div>
                  <p className="text-sm text-muted-foreground">Automático</p>
                </div>
                <div>
                  <div className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    24/7
                  </div>
                  <p className="text-sm text-muted-foreground">Disponível</p>
                </div>
                <div>
                  <div className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    0
                  </div>
                  <p className="text-sm text-muted-foreground">Papel</p>
                </div>
              </div>
            </div>

            {/* Right Column - Image */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-purple-600 rounded-3xl blur-2xl opacity-30 animate-pulse" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1580618672591-eb180b1a973f?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1169"
                  alt="Profissional de beleza"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div data-aos="fade-up" data-aos-duration="1000" className="text-center mb-16">
            <h2 className="mb-4">Como Funciona</h2>
            <p className="text-muted-foreground text-lg">
              Apenas 3 passos simples para começar
            </p>
          </div>

          <div data-aos="fade-up" data-aos-duration="1000" className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <Card className="relative p-8 border-0 shadow-lg hover:shadow-xl transition-all group">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                1
              </div>
              
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Link2 className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="mb-3">Receba seu Link</h3>
              <p className="text-muted-foreground">
                Faça seu cadastro conosco e receba um link único: (horalis.com/agenda/seu-id-unico) que leva ao seu Horalis personalizado com sua logo serviços e cores para compartilhar com seus clientes. 
              </p>
            </Card>

            {/* Step 2 */}
            <Card className="relative p-8 border-0 shadow-lg hover:shadow-xl transition-all group">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                2
              </div>
              
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="mb-3">Compartilhe</h3>
              <p className="text-muted-foreground">
                Envie o link para seus clientes por WhatsApp, Instagram, SMS ou qualquer rede social.
              </p>
            </Card>

            {/* Step 3 */}
            <Card className="relative p-8 border-0 shadow-lg hover:shadow-xl transition-all group">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                3
              </div>
              
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="mb-3">Receba Agendamentos</h3>
              <p className="text-muted-foreground">
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
            <div className="order-2 lg:order-1">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1729860648922-a79abb2fbcf0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFydHBob25lJTIwY2FsZW5kYXIlMjBhcHB8ZW58MXx8fHwxNzYxMTg5MjI5fDA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Calendário no smartphone"
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Benefits List */}
            <div className="order-1 lg:order-2 space-y-6">
              <h2 className="mb-8">
                Por que escolher nosso sistema?
              </h2>

              <div className="space-y-4">
                {[
                  {
                    icon: <Zap className="w-6 h-6" />,
                    title: 'Rápido e Automático',
                    description: 'Sem formulários complicados. Seu cliente agenda em segundos.'
                  },
                  {
                    icon: <Calendar className="w-6 h-6" />,
                    title: 'Integração com Google',
                    description: 'Todos os agendamentos vão direto para sua Google Agenda.'
                  },
                  {
                    icon: <Clock className="w-6 h-6" />,
                    title: 'Economize Tempo',
                    description: 'Nunca mais perca tempo anotando agendamentos manualmente.'
                  },
                  {
                    icon: <Users className="w-6 h-6" />,
                    title: 'Experiência do Cliente',
                    description: 'Ele a experiencia do seu cliente com um sistema de agendamentos feito por medida.'
                  },
                ].map((benefit, index) => (
                  <div key={index} className="flex gap-4 p-4 rounded-xl bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-all">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white">
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 className="mb-1">{benefit.title}</h3>
                      <p className="text-muted-foreground text-sm">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div data-aos="fade-up" data-aos-duration="1000" className="py-20 bg-gradient-to-r from-pink-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className="mb-6 text-white">
            Pronto para simplificar seus agendamentos?
          </h2>
          <p className="text-lg mb-8 text-white/90">
            Junte-se a centenas de profissionais que já transformaram a forma de gerenciar agendamentos.
          </p>
          <a href={WHATSAPP_LNK}>  
          <Button 
            onClick={onGetStarted}
            className="bg-white text-purple-600 hover:bg-gray-100 px-12 py-6 shadow-xl hover:shadow-2xl transition-all"
          >
            Entre em contato conosco
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          </a>

          
        </div>
      </div>

      {/* Footer */}
      <div data-aos="fade-up" data-aos-duration="1000" className="py-12 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Horalis
              </h3>
              <p className="text-sm text-muted-foreground">
                Simplifique sua agenda, encante seus clientes
              </p>
            </div>
            
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href={WHATSAPP_LNK} className="hover:text-purple-600 transition-colors">Sobre</a>
              <a href={WHATSAPP_LNK} className="hover:text-purple-600 transition-colors">Recursos</a>
              <a href={WHATSAPP_LNK} className="hover:text-purple-600 transition-colors">Preços</a>
              <a href={WHATSAPP_LNK} className="hover:text-purple-600 transition-colors">Contato</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2025 Horalis. Todos os direitos reservados.
          </div>
        </div>
      </div>
    </div>
  );
}
