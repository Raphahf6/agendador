import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, Users, Zap, Check,
  Menu, X, Smartphone,
  Eye,
  Instagram, Facebook, MessageCircle, Star, Bell,
  HandCoins, Sparkles, Quote,
  Percent, Headset, ShieldCheck,
  MousePointerClick, CalendarCheck, CheckCircle2 // Novos ícones importados
} from 'lucide-react';
import { LogoHoralis } from '@/components/Logo';
import SignupModalContent from '@/components/landing/SignupModalContent';
import { ImageWithFallback } from '@/ui/ImageWithFallback';
import AOS from 'aos';
import 'aos/dist/aos.css';
import LeadQualificationModal from './LeadQualificationModal';

// --- CONFIGURAÇÕES ---
const WHATSAPP_LNK = "https://wa.me/5511936200327?text=Ol%C3%A1%2C%20gostaria%20de%20entender%20como%20o%20Horalis%20funciona%20para%20o%20meu%20neg%C3%B3cio.";
const REAL_MICROSITE_LINK = "https://horalis.app/agendar/5511988062634";
const BUTTON_PRIMARY = "bg-cyan-700 hover:bg-cyan-800 text-white shadow-lg shadow-cyan-700/20";
const BUTTON_OUTLINE = "border border-slate-300 text-slate-700 hover:bg-slate-50";

const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// --- COMPONENTE: ITEM DE FAQ ---
const FaqItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-5 text-left focus:outline-none group"
      >
        <span className="text-base font-semibold text-slate-800 group-hover:text-cyan-700 transition-colors">{question}</span>
        {isOpen ? <div className="text-cyan-600 font-bold">-</div> : <div className="text-slate-400 font-bold">+</div>}
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-48 opacity-100 pb-5' : 'max-h-0 opacity-0'}`}>
        <p className="text-slate-600 text-sm leading-relaxed">{answer}</p>
      </div>
    </div>
  );
};

// --- COMPONENTE: CARD DE FUNCIONALIDADE ---
const FeatureCard = ({ icon: IconComp, title, description }) => (
  <div className="p-8 bg-white border border-slate-200 rounded-xl hover:shadow-xl hover:border-cyan-100 transition-all duration-300 group h-full" data-aos="fade-up">
    <div className="w-12 h-12 bg-cyan-50 rounded-lg flex items-center justify-center mb-6 group-hover:bg-cyan-100 transition-colors">
      <IconComp className="w-6 h-6 text-cyan-700" />
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-3">{title}</h3>
    <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
  </div>
);

// --- COMPONENTE: PASSO A PASSO (SETUP) ---
const StepCard = ({ number, title, description, highlight = false }) => (
  <div className={`relative flex flex-col items-center text-center p-8 rounded-2xl transition-all ${highlight ? 'bg-cyan-50 border border-cyan-100 shadow-md transform md:-translate-y-2' : 'bg-white'}`} data-aos="fade-up">
    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold mb-4 shadow-lg ${highlight ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-white shadow-slate-200'}`}>
      {number}
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
    <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
  </div>
);

// --- COMPONENTE: FLUXO DO CLIENTE (NOVO) ---
const ClientFlowCard = ({ icon: IconComp, step, title, desc }) => (
  <div className="flex flex-col items-center text-center relative group" data-aos="fade-up">
    <div className="w-20 h-20 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:border-cyan-200 group-hover:shadow-md transition-all relative z-10">
      <IconComp className="w-8 h-8 text-cyan-700" />
      <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-sm font-bold border-4 border-white">
        {step}
      </div>
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
    <p className="text-sm text-slate-500 leading-relaxed max-w-xs">{desc}</p>
  </div>
);

// --- COMPONENTE: PROVA SOCIAL ---
const TestimonialCard = ({ quote, author, role }) => (
  <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 relative hover:shadow-md transition-shadow" data-aos="fade-up">
    <Quote className="w-8 h-8 text-cyan-200 absolute top-6 left-6 -z-10" />
    <div className="flex gap-1 mb-4">
      {[1, 2, 3, 4, 5].map((_, i) => (
        <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
      ))}
    </div>
    <p className="text-slate-700 italic mb-6 leading-relaxed">"{quote}"</p>
    <div>
      <h4 className="font-bold text-slate-900">{author}</h4>
      <span className="text-xs text-slate-500 uppercase tracking-wide font-bold">{role}</span>
    </div>
  </div>
);

// =============================================================================
// PÁGINA PRINCIPAL
// =============================================================================

export function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

  useEffect(() => {
    AOS.init({ duration: 600, once: true });
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

  const handleOpenLeadForm = () => {
    setIsLeadModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">

      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoHoralis size="h-8" darkText={true} />
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#experiencia" className="text-sm font-medium text-slate-600 hover:text-cyan-700 transition-colors">Como Funciona</a>
            <a href="#funcionalidades" className="text-sm font-medium text-slate-600 hover:text-cyan-700 transition-colors">Funcionalidades</a>
            <a href="#depoimentos" className="text-sm font-medium text-slate-600 hover:text-cyan-700 transition-colors">Quem usa</a>

            <div className="flex items-center gap-3 ml-4">
              <Link to="/login" className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${BUTTON_OUTLINE}`}>
                Área do Cliente
              </Link>
              <button onClick={handleOpenLeadForm} className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-2 ${BUTTON_PRIMARY}`}>
                <MessageCircle className="w-4 h-4" />
                Falar com Consultor
              </button>
            </div>
          </div>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-slate-600">
            <Icon icon={isMenuOpen ? X : Menu} className="w-6 h-6" />
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 absolute w-full p-6 flex flex-col gap-4 shadow-xl">
            <Link to="/login" className="w-full py-3 text-center rounded-lg border border-slate-300 font-bold text-slate-700">Área do Cliente</Link>
            <button onClick={() => { openWhatsApp(); setIsMenuOpen(false); }} className={`w-full py-3 rounded-lg font-bold flex justify-center gap-2 ${BUTTON_PRIMARY}`}>
              <MessageCircle className="w-5 h-5" /> Falar com Consultor
            </button>
          </div>
        )}
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 bg-slate-50 border-b border-slate-200 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">

          <div className="text-center lg:text-left order-1" data-aos="fade-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-cyan-700 text-xs font-bold uppercase tracking-wide mb-6 shadow-sm">
              <Sparkles className="w-3 h-3 fill-cyan-700" />
              Agenda Premium Para Autônomos, Salões e Clínicas
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
              Sua agenda digital pronta para usar, <span className="text-cyan-700">sem dor de cabeça.</span>
            </h1>

            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              Chega de perder horas no WhatsApp agendando horários. Tenha sua agenda online 24/7, elimine faltas com a cobrança de sinal e tenha controle total sobre sua equipe.
              <br className="mt-4 block" />
              <strong className="text-slate-900">
                Nós cuidamos de toda a implantação inicial para você. Entregamos o sistema pronto para uso, com seus serviços e horários já cadastrados.
              </strong>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button onClick={handleOpenLeadForm} className={`px-8 py-4 rounded-lg font-bold text-lg transition-transform hover:-translate-y-0.5 w-full sm:w-auto flex items-center justify-center gap-2 ${BUTTON_PRIMARY}`}>
                <MessageCircle className="w-5 h-5" />
                Verificar Disponibilidade
              </button>
              <a href="#experiencia" className={`px-8 py-4 rounded-lg font-bold text-lg transition-colors w-full sm:w-auto flex items-center justify-center ${BUTTON_OUTLINE}`}>
                Ver como funciona
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-sm text-slate-500 font-medium">
              <span className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-600" /> Entrega Rápida</span>
              <span className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-600" /> Planos Flexíveis</span>
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-cyan-600" /> Suporte VIP</span>
            </div>
          </div>

          <div className="relative w-full flex items-center justify-center order-1 lg:order-2" data-aos="fade-left">
            <div className="relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-gradient-to-tr from-cyan-200 to-blue-200 rounded-full blur-3xl opacity-50"></div>
              <div className="relative mx-auto border-gray-900 bg-gray-900 border-[8px] rounded-[2.5rem] h-[600px] w-[300px] shadow-2xl flex flex-col overflow-hidden transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                <div className="absolute top-0 w-full h-6 bg-transparent z-20 flex justify-center">
                  <div className="h-4 w-32 bg-gray-900 rounded-b-xl"></div>
                </div>
                <div className="h-full w-full bg-white overflow-hidden relative rounded-[2rem]">
                  <ImageWithFallback
                    src="/pagina-agendamentos.png"
                    alt="Exemplo de Microsite Horalis no Celular"
                    className="w-full h-full object-cover object-top"
                  />
                  <a
                    href={REAL_MICROSITE_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-cyan-600 text-white font-bold rounded-full shadow-lg hover:bg-cyan-700 transition-colors flex items-center gap-2 w-max"
                  >
                    <Eye className="w-5 h-5" /> Ver Demonstração
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- NOVA SEÇÃO: A EXPERIÊNCIA DO CLIENTE (FLUXO) --- */}
      <section id="experiencia" className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">A experiência que seu cliente vai amar</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Seu cliente agenda em 30 segundos, sem precisar baixar aplicativo e sem te chamar no WhatsApp.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Linha tracejada conectora */}
            <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-0.5 border-t-2 border-dashed border-slate-200 -z-0 w-2/3 mx-auto"></div>

            <ClientFlowCard
              step="1"
              icon={MousePointerClick}
              title="Link na Bio"
              desc="Seu cliente clica no link exclusivo de agendamento no seu perfil Instagram ou WhatsApp."
            />
            <ClientFlowCard
              step="2"
              icon={CalendarCheck}
              title="Escolha Simples"
              desc="Escolhe o serviço e o profissional de preferência. Tudo de forma super simples, sem complicação e sem precisar criar conta."
            />
            <ClientFlowCard
              step="3"
              icon={CheckCircle2}
              title="Agendado!"
              desc="Pronto. Você recebe o aviso na hora e o horário fica bloqueado na agenda."
            />
          </div>
        </div>
      </section>

      {/* --- COMO COMEÇAR (MODELO CONSULTIVO) --- */}
      <section id="como-funciona" className="py-24 bg-slate-50 relative overflow-hidden border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Tecnologia com Atendimento Humano</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Nascemos com o propósito de eliminar a desorganização de pequenos e médios negócios.
              Diferente de outros apps onde você é apenas um número, aqui nós seguramos na sua mão.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <StepCard
              number="1"
              title="Diagnóstico Gratuito"
              description="Converse com nosso especialista no WhatsApp. Vamos entender se você trabalha sozinho ou possui equipe e qual a sua necessidade."
            />
            <StepCard
              number="2"
              title="Configuração VIP"
              description="Nossa equipe cadastra todos os seus serviços, profissionais, regras de comissão e horários para você."
              highlight={true}
            />
            <StepCard
              number="3"
              title="Entrega Pronta"
              description="Você recebe o sistema pronto para faturar. E só começa a pagar a mensalidade se aprovar o uso."
            />
          </div>

          <div className="text-center mt-12">
            <button onClick={handleOpenLeadForm} className={`px-10 py-4 rounded-lg font-bold text-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 mx-auto ${BUTTON_PRIMARY}`}>
              <MessageCircle className="w-5 h-5" />
              Solicitar Análise Sem Compromisso
            </button>
            <p className="text-xs text-slate-400 mt-4 font-medium">Atendemos desde autônomos até grandes clínicas.</p>
          </div>
        </div>
      </section>

      {/* --- FUNCIONALIDADES --- */}
      <section id="funcionalidades" className="py-24 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Tudo o que você precisa em um só lugar</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Ferramentas poderosas, mas extremamente fáceis de usar. Feitas para facilitar sua vida, não para complicar.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Smartphone} title="Link Exclusivo (Microsite)"
              description="Sua recepção 24h. O cliente agenda pelo celular, sem baixar apps e sem precisar de cadastro complexo."
            />
            <FeatureCard
              icon={Users} title="Gestão de Profissionais"
              description="Ideal para quem tem equipe. Controle horários individuais e folgas de cada especialista."
            />
            <FeatureCard
              icon={HandCoins} title="Histórico do Cliente (CRM)"
              description="Saiba exatamente quando o cliente veio, qual serviço fez e anote preferências ou detalhes de tratamentos."
            />
            <FeatureCard
              icon={Zap} title="Sinal via PIX (Anti-No-Show)"
              description="Acabe com o prejuízo de faltas. O sistema pode cobrar um sinal automático para confirmar o horário."
            />
            <FeatureCard
              icon={Bell} title="Lembretes Automáticos"
              description="Reduza esquecimentos. Seu cliente recebe notificações sobre o horário marcado."
            />
            <FeatureCard
              icon={Percent} title="Controle de Comissões"
              description="Saiba exatamente quanto cada profissional produziu no período. Facilitamos o fechamento da sua equipe."
            />

            {/* CARD DE TREINAMENTO & SUPORTE */}
            <div className="md:col-span-3 lg:col-span-3">
              <div className="p-8 bg-cyan-50 border border-cyan-100 rounded-xl hover:shadow-xl transition-all duration-300 group h-full flex flex-col md:flex-row items-center gap-6" data-aos="fade-up">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                  <Headset className="w-8 h-8 text-cyan-700" />
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Medo de não saber usar? Fique tranquilo!</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Nós pegamos na sua mão. Oferecemos <strong>treinamento de uso completo</strong> para você e sua equipe aprenderem em minutos. Além disso, nosso <strong>suporte no WhatsApp</strong> é feito por gente de verdade, pronto para tirar qualquer dúvida na hora.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- PROVA SOCIAL --- */}
      <section id="depoimentos" className="py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-sm font-bold text-cyan-700 uppercase tracking-wider mb-2 block">Confiança</span>
            <h2 className="text-3xl font-bold text-slate-900">Quem usa, recomenda</h2>
            <p className="text-slate-600 mt-4">Junte-se a profissionais que transformaram sua rotina.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard
              quote="Eu trabalho sozinha no meu estúdio e achava que sistema era só para salão grande. O Horalis me salvou de ficar respondendo cliente meia-noite no WhatsApp."
              author="Ana Clara"
              role="Designer de Sobrancelhas"
            />
            <TestimonialCard
              quote="Minha clínica precisava organizar a agenda das doutoras. O sistema resolveu o conflito de horários e o suporte deles é incrível, respondem na hora."
              author="Dra. Juliana Costa"
              role="Biomédica Esteta"
            />
            <TestimonialCard
              quote="O sistema anti-calote (sinal via Pix) é vida! Antes eu tinha 4 a 5 faltas por semana, hoje é zero. Vale cada centavo, mesmo para mim que sou barbeiro solo."
              author="Ricardo Viana"
              role="Barbeiro"
            />
          </div>

          {/* Call to Action Final */}
          <div className="mt-16 bg-slate-900 rounded-3xl p-8 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>

            <div className="relative z-10">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Transforme sua agenda em uma máquina de resultados.</h3>
              <p className="text-slate-400 max-w-lg">
                Tire suas dúvidas diretamente com nossa equipe de implantação. Atendimento consultivo, humano e focado em resolver os gargalos reais da sua operação.
              </p>
            </div>

            <div className="relative z-10 flex flex-col w-full md:w-auto gap-3">
              <button onClick={handleOpenLeadForm} className={`px-8 py-4 rounded-xl font-bold text-lg text-white shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500`}>
                <MessageCircle className="w-5 h-5" />
                Falar com Especialista
              </button>
              <p className="text-center text-xs text-slate-500">Planos Flexiveis.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FAQ --- */}
      <section id="faq" className="py-24 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Dúvidas Frequentes</h2>
          <div className="space-y-2">
            <FaqItem
              question="Eu trabalho sozinho(a), o sistema serve para mim?"
              answer="Com certeza! Temos muitos clientes que são autônomos. O sistema vai funcionar como sua secretária virtual, agendando seus clientes enquanto você trabalha."
            />
            <FaqItem
              question="Quanto custa o serviço?"
              answer="Temos planos especiais para quem está começando e planos mais robustos para clínicas maiores. Chame no WhatsApp que encontramos a melhor opção para o seu bolso."
            />
            <FaqItem
              question="Tenho medo de não saber mexer. É difícil?"
              answer="Fique tranquilo. O sistema é muito simples e intuitivo. Além disso, nós damos um treinamento completo e ficamos disponíveis no WhatsApp para te ajudar no que precisar."
            />
            <FaqItem
              question="Preciso de computador para usar?"
              answer="Não. O Horalis funciona perfeitamente no navegador do seu celular. Você gerencia sua agenda na palma da mão."
            />
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4">
                <LogoHoralis size="h-8" darkText={true} />
              </div>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                Tecnologia fácil e acessível para gestão de agendamentos. De autônomos a grandes clínicas.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-4">Solução</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#funcionalidades" className="hover:text-cyan-700 transition-colors">Funcionalidades</a></li>
                <li><a href="#como-funciona" className="hover:text-cyan-700 transition-colors">Como Funciona</a></li>
                <li><a href={REAL_MICROSITE_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-700 transition-colors">Ver Exemplo</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-4">Contato</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><button onClick={handleOpenLeadForm} className="hover:text-cyan-700 transition-colors text-left">WhatsApp Comercial</button></li>
                <li><a href="mailto:suporte@horalis.app" className="hover:text-cyan-700 transition-colors">E-mail Suporte</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link to="/termos" className="hover:text-cyan-700 transition-colors">Termos de Uso</Link></li>
                <li><Link to="/privacidade" className="hover:text-cyan-700 transition-colors">Política de Privacidade</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} Horalis Inc. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-slate-400 hover:text-cyan-700 transition-colors"><Icon icon={Instagram} className="w-5 h-5" /></a>
              <a href="#" className="text-slate-400 hover:text-cyan-700 transition-colors"><Icon icon={Facebook} className="w-5 h-5" /></a>
            </div>
          </div>
        </div>
      </footer>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}>
          <div className="relative w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <SignupModalContent closeModal={() => setIsModalOpen(false)} isModalOpen={isModalOpen} />
          </div>
        </div>
      )}
      {/* MODAL DE QUALIFICAÇÃO DE LEAD (NOVO) */}
      <LeadQualificationModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
      />
    </div>
  );
}