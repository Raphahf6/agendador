import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, Clock, Users, Zap, Check,
  Menu, X, Smartphone, ShieldCheck,
  CreditCard, TrendingUp, Eye,
  Instagram, Facebook, MessageCircle, Star, Bell,
  BookDashed,
  LayoutDashboard,
  DollarSign,
  HandCoins,
  Mail
} from 'lucide-react';
import { LogoHoralis } from '@/components/Logo';
import { DISPLAY_PRICE_SETUP } from '@/utils/pricing'; // Certifique-se que isso exibe o valor da mensalidade (ex: R$ 59,90)
import SignupModalContent from '@/components/landing/SignupModalContent';
import { ImageWithFallback } from '@/ui/ImageWithFallback';
import AOS from 'aos';
import 'aos/dist/aos.css';

// --- CONFIGURAÇÕES ---
// Adicionei uma mensagem pré-definida no link do WhatsApp para facilitar a venda
const WHATSAPP_LNK = "https://wa.me/5511936200327?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20a%20implanta%C3%A7%C3%A3o%20do%20Horalis%20e%20os%2030%20dias%20gr%C3%A1tis.";
const REAL_MICROSITE_LINK = "https://horalis.app/agendar/5511988062634";
const PRIMARY_COLOR_CLASS = "text-cyan-700";
const BUTTON_PRIMARY = "bg-cyan-700 hover:bg-cyan-800 text-white shadow-lg shadow-cyan-700/20";
const BUTTON_OUTLINE = "border border-slate-300 text-slate-700 hover:bg-slate-50";

const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// --- COMPONENTE: ITEM DE FAQ (Atualizado para o novo modelo) ---
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

// --- COMPONENTE: PASSO A PASSO (Atualizado para Implantação) ---
const StepCard = ({ number, title, description, highlight = false }) => (
  <div className={`relative flex flex-col items-center text-center p-8 rounded-2xl transition-all ${highlight ? 'bg-cyan-50 border border-cyan-100 shadow-md transform md:-translate-y-2' : 'bg-white'}`} data-aos="fade-up">
    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold mb-4 shadow-lg ${highlight ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-white shadow-slate-200'}`}>
      {number}
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
    <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
  </div>
);

// =============================================================================
// PÁGINA PRINCIPAL
// =============================================================================

export function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    AOS.init({ duration: 600, once: true });
    // Scripts do Mercado Pago mantidos
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

  // Função auxiliar para abrir WhatsApp
  const openWhatsApp = () => {
    window.open(WHATSAPP_LNK, '_blank');
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">

      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoHoralis size="h-8" darkText={true} />
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#como-funciona" className="text-sm font-medium text-slate-600 hover:text-cyan-700 transition-colors">Como Funciona</a>
            <a href="#funcionalidades" className="text-sm font-medium text-slate-600 hover:text-cyan-700 transition-colors">Funcionalidades</a>
            <a href="#planos" className="text-sm font-medium text-slate-600 hover:text-cyan-700 transition-colors">Planos</a>

            <div className="flex items-center gap-3 ml-4">
              <Link to="/login" className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${BUTTON_OUTLINE}`}>
                Painel do Cliente
              </Link>
              <button onClick={openWhatsApp} className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-2 ${BUTTON_PRIMARY}`}>
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
            <Link to="/login" className="w-full py-3 text-center rounded-lg border border-slate-300 font-bold text-slate-700">Painel do Cliente</Link>
            <button onClick={() => { openWhatsApp(); setIsMenuOpen(false); }} className={`w-full py-3 rounded-lg font-bold flex justify-center gap-2 ${BUTTON_PRIMARY}`}>
              <MessageCircle className="w-5 h-5" /> Falar no WhatsApp
            </button>
          </div>
        )}
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 bg-slate-50 border-b border-slate-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">

          {/* LADO ESQUERDO: Texto e CTA */}
          <div className="text-center lg:text-left z-10 order-1 lg:order-1" data-aos="fade-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-cyan-700 text-xs font-bold uppercase tracking-wide mb-6 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              Sistema de Agendamentos online
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
              Sua agenda digital pronta para usar, <span className="text-cyan-700">sem dor de cabeça</span>.
            </h1>

            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              Chega de perder horas no WhatsApp agendando horários. Tenha sua agenda online 24/7, elimine faltas com a cobrança de sinal via PIX e envie lembretes automáticos para seus clientes.
              <br className="hidden lg:block" />
              E o diferencial: <strong className="text-slate-900">nós cuidamos de toda a implantação inicial para você</strong>. Entregamos o sistema pronto para uso, com seus serviços, horários e equipe já cadastrados.
            </p>

           

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button onClick={openWhatsApp} className={`px-8 py-4 rounded-lg font-bold text-lg transition-transform hover:-translate-y-0.5 w-full sm:w-auto flex items-center justify-center gap-2 ${BUTTON_PRIMARY}`}>
                <MessageCircle className="w-5 h-5" />
                Solicitar Implantação
              </button>
              <a href="#como-funciona" className={`px-8 py-4 rounded-lg font-bold text-lg transition-colors w-full sm:w-auto flex items-center justify-center ${BUTTON_OUTLINE}`}>
                Entenda como funciona
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-sm text-slate-500 font-medium">
              <span className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm"><Zap className="w-4 h-4 text-cyan-600" /> Entrega Rápida</span>
              <span className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm"><Star className="w-4 h-4 text-cyan-600" /> Suporte VIP</span>
            </div>
          </div>

          {/* LADO DIREITO: Mockup Celular */}
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

      {/* --- COMO COMEÇAR (NOVO MODELO) --- */}
      <section id="como-funciona" className="py-24 bg-white relative overflow-hidden">
        {/* Elemento de fundo decorativo */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-slate-50 to-white -z-10"></div>

        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Esqueça tutoriais complicados</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              No Horalis, nós acreditamos que você deve focar em atender seus clientes, não em programar sistemas. Veja como é simples:
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Linha conectora desktop */}
            <div className="hidden md:block absolute top-14 left-1/6 right-1/6 h-0.5 bg-slate-200 -z-10 w-2/3 mx-auto"></div>

            <StepCard
              number="1"
              title="Solicite a Implantação"
              description="Chame nosso consultor no WhatsApp. Vamos entender suas necessidades, serviços e preços."
            />
            <StepCard
              number="2"
              title="Nós Configuramos Tudo"
              description="Nossa equipe cadastra sua logo, cores, profissionais, horários e regras de agendamento."
              highlight={true}
            />
            <StepCard
              number="3"
              title="Receba Pronto"
              description="Em até 24h, você recebe o login e senha com a agenda pronta para faturar. E ganha 30 dias grátis."
            />
          </div>

          <div className="text-center mt-12">
            <button onClick={openWhatsApp} className={`px-10 py-4 rounded-lg font-bold text-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 mx-auto ${BUTTON_PRIMARY}`}>
              <MessageCircle className="w-5 h-5" />
              Quero minha agenda configurada
            </button>
          </div>
        </div>
      </section>

      {/* --- SOBRE (Institucional) --- */}
      <section id="sobre" className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="text-sm font-bold text-cyan-700 uppercase tracking-wider mb-2 block">Nosso Compromisso</span>
          <h2 className="text-3xl font-bold text-slate-900 mb-8">Tecnologia com atendimento humano</h2>
          <p className="text-lg text-slate-600 leading-relaxed mb-12">
            Nascemos com o propósito de eliminar a desorganização de pequenos e médios negócios.
            Diferente de outros apps onde você é apenas um número, aqui nós seguramos na sua mão para garantir que o sistema funcione para você.
          </p>
        </div>
      </section>

      {/* --- FUNCIONALIDADES --- */}
      <section id="funcionalidades" className="py-24 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Tudo o que já vai configurado para você</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Uma suíte completa de ferramentas que nossa equipe ativa e personaliza no seu perfil.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Smartphone} title="Microsite Próprio"
              description="Seu link exclusivo e profissional. O cliente acessa e agenda sem baixar nada, 24 horas por dia."
            />
            <FeatureCard
              icon={Calendar} title="Agenda Digital Inteligente"
              description="Visualize sua semana, bloqueie horários e reorganize compromissos com arrastar e soltar."
            />
            <FeatureCard
              icon={HandCoins} title="CRM integrado"
              description="Tenha sua base de clientes sempre em mãos, com histórico de atendimentos e anotações importantes. Podendo enviar lembretes de manutenção e promoções para clientes que não retornam a um tempo."
            />
            <FeatureCard
              icon={Users} title="Gestão de Equipe"
              description="Cadastre sua equipe horarios e delegue os serviços."
            />
            <FeatureCard
              icon={Zap} title="Sinal via PIX (Anti-Furo)"
              description="Reduza faltas a zero. O sistema cobra um sinal antecipado no agendamento automaticamente."
            />
            <FeatureCard
              icon={CreditCard} title="Pagamentos Automáticos"
              description="Integração total com Mercado Pago. O dinheiro cai direto na sua conta, com segurança total."
            />
            <FeatureCard
              icon={Bell} title="Lembretes"
              description="O sistema envia lembretes automáticos para seu cliente, evitando esquecimentos."
            />
            <FeatureCard
              icon={DollarSign} title="Controle de caixa e estoque"
              description="Tenha acesso ao controle financeiro e de estoque integrado, facilitando a gestão do seu negócio."
            />
            <FeatureCard
              icon={Mail} title="Marketing"
              description="Envie e-mails promocionais e notificações para sua base de clientes diretamente pelo sistema. Mantenha seus clientes ativos e saiba quais clientes não retornam a um tempo."
            />
          </div>
        </div>
      </section>

      {/* --- PREÇOS (Atualizado para Setup + 30 dias) --- */}
      <section id="planos" className="py-24 bg-slate-900 text-white relative overflow-hidden">
        {/* Detalhe de fundo */}
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Investimento Simples e Transparente</h2>
          <p className="text-slate-300 mb-12 max-w-2xl mx-auto">
            Sem pegadinhas. Pague a implantação para ter tudo pronto e ganhe o primeiro mês.
          </p>

          <div className="max-w-md mx-auto bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden transform hover:scale-105 transition-transform duration-300">
            {/* Cabeçalho do Card */}
            <div className="bg-slate-100 p-6 border-b border-slate-200">
              <h3 className="text-2xl font-bold text-slate-800">Plano Concierge</h3>
              <p className="text-sm text-slate-500 mt-1">Nós fazemos tudo por você</p>
            </div>

            <div className="p-8">
              {/* Preço de Setup */}
              <div className="mb-6">
                <span className="block text-sm font-bold text-cyan-700 uppercase tracking-wide mb-1">Taxa Única de Implantação</span>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl font-extrabold text-slate-900">R$ 50,00</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">Valor pago uma única vez na contratação</p>
              </div>

              {/* Separador + Oferta */}
              <div className="bg-cyan-50 rounded-lg p-4 mb-8 border border-cyan-100">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold text-cyan-900">BÔNUS EXCLUSIVO</span>
                </div>
                <p className="text-cyan-800 text-sm font-medium">
                  Ganhe <span className="font-bold underline">30 DIAS GRÁTIS</span>.
                </p>
                <p className="text-xs text-cyan-600 mt-1">
                  Após 30 dias, apenas {DISPLAY_PRICE_SETUP || "R$ 59,90"}/mês.
                </p>
              </div>

              <ul className="space-y-4 mb-8 text-left">
                {[
                  "Configuração completa feita por especialista",
                  "Cadastro de serviços e equipe",
                  "Treinamento de uso (Onboarding)",
                  "Suporte prioritário no WhatsApp",
                  "CRM Integrado: Sua base de clientes sempre em mãos",
                  "Bonus: Controle de caixa e estoque",
                  "Agendamentos Ilimitados",
                  "Todas as funções liberadas"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-700 font-medium text-sm">
                    <Check className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>

              <button onClick={openWhatsApp} className={`w-full py-4 rounded-lg font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${BUTTON_PRIMARY}`}>
                <MessageCircle className="w-5 h-5" />
                Agendar Implantação
              </button>
              <p className="text-xs text-slate-400 mt-4">Sem fidelidade. Cancele quando quiser.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FAQ (Perguntas Frequentes) --- */}
      <section id="faq" className="py-24 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Dúvidas Frequentes</h2>
          <div className="space-y-2">
            <FaqItem
              question="Como funciona a implantação?"
              answer="Após o pagamento da taxa de setup, nosso consultor entra em contato para pegar sua lista de serviços, preços e horários. Em até 24h, nós configuramos tudo e te entregamos o acesso pronto."
            />
            <FaqItem
              question="Por que cobrar taxa de implantação?"
              answer="Diferente de apps 'faça você mesmo', nós dedicamos um especialista real para configurar sua conta e garantir que tudo esteja perfeito. É um serviço personalizado."
            />
            <FaqItem
              question="O que acontece após os 30 dias grátis?"
              answer="Se você gostar (e temos certeza que vai!), você começa a pagar apenas a mensalidade do sistema. Se não quiser continuar, basta cancelar sem multa nenhuma."
            />
            <FaqItem
              question="Como recebo o dinheiro dos sinais?"
              answer="O sistema é integrado ao Mercado Pago. O valor do sinal pago pelo cliente cai diretamente na sua conta do Mercado Pago na hora, com segurança total."
            />
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4">
                <LogoHoralis size="h-8" darkText={true} />
              </div>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                Transformando a forma como seu estabelecimento agenda com tecnologia e atendimento humanizado.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#funcionalidades" className="hover:text-cyan-700 transition-colors">Funcionalidades</a></li>
                <li><a href="#planos" className="hover:text-cyan-700 transition-colors">Planos e Setup</a></li>
                <li><a href={REAL_MICROSITE_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-700 transition-colors">Ver Exemplo</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-4">Fale Conosco</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><button onClick={openWhatsApp} className="hover:text-cyan-700 transition-colors text-left">WhatsApp de Vendas</button></li>
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

      {/* MODAL MANTIDO APENAS PARA QUEM JÁ TEM CONTA OU LOGIN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}>
          <div className="relative w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <SignupModalContent closeModal={() => setIsModalOpen(false)} isModalOpen={isModalOpen} />
          </div>
        </div>
      )}
    </div>
  );
}