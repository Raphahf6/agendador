import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, Link as LinkIcon, Clock, Users, Zap, Check,
  ArrowRight, Menu, X, BarChart2, Smartphone, Mail, ShieldCheck,
  DollarSign, PieChart, Settings, HelpCircle, ChevronDown, ChevronUp,
  Bell, Megaphone, CreditCard, Globe, TrendingUp, Eye,
  RefreshCcw,Instagram,Facebook
} from 'lucide-react';
import { LogoHoralis } from '@/components/Logo';
import { DISPLAY_PRICE_SETUP } from '@/utils/pricing';
import SignupModalContent from '@/components/landing/SignupModalContent';
import { ImageWithFallback } from '@/ui/ImageWithFallback';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { updateCardToken } from '@mercadopago/sdk-react';

// --- CONFIGURAÇÕES ---
const WHATSAPP_LNK = "https://wa.me/5511936200327";
const REAL_MICROSITE_LINK = "https://horalis.app/agendar/5511988062634"; // Seu link real
const PRIMARY_COLOR_CLASS = "text-cyan-700";
const BUTTON_PRIMARY = "bg-cyan-700 hover:bg-cyan-800 text-white";
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
        {isOpen ? <ChevronUp className="w-5 h-5 text-cyan-600" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
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

// --- COMPONENTE: PASSO A PASSO ---
const StepCard = ({ number, title, description }) => (
  <div className="relative flex flex-col items-center text-center p-6" data-aos="fade-up">
    <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center text-xl font-bold mb-4 shadow-lg shadow-slate-200">
      {number}
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
    <p className="text-sm text-slate-600">{description}</p>
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

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">

      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-md border-b border-slate-200 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
           <LogoHoralis size="h-8" darkText={true} />
            
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#sobre" className="text-sm font-medium text-slate-600 hover:text-cyan-700 transition-colors">Sobre</a>
            <a href="#funcionalidades" className="text-sm font-medium text-slate-600 hover:text-cyan-700 transition-colors">Funcionalidades</a>
            <a href="#planos" className="text-sm font-medium text-slate-600 hover:text-cyan-700 transition-colors">Planos</a>

            <div className="flex items-center gap-3 ml-4">
              <Link to="/login" className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${BUTTON_OUTLINE}`}>
                Login
              </Link>
              <button onClick={() => setIsModalOpen(true)} className={`px-5 py-2 text-sm font-semibold rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 ${BUTTON_PRIMARY}`}>
                Criar Conta
              </button>
            </div>
          </div>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-slate-600">
            <Icon icon={isMenuOpen ? X : Menu} className="w-6 h-6" />
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 absolute w-full p-6 flex flex-col gap-4 shadow-xl">
            <Link to="/login" className="w-full py-3 text-center rounded-lg border border-slate-300 font-bold text-slate-700">Acessar Painel</Link>
            <button onClick={() => { setIsModalOpen(true); setIsMenuOpen(false); }} className={`w-full py-3 rounded-lg font-bold ${BUTTON_PRIMARY}`}>Cadastre-se</button>
          </div>
        )}
      </nav>

      {/* --- HERO SECTION (Com Mockup Celular e Botão) --- */}
      <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 bg-slate-50 border-b border-slate-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">

          {/* LADO ESQUERDO: Texto e CTA */}
          <div className="text-center lg:text-left z-10 order-1 lg:order-1" data-aos="fade-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-cyan-700 text-xs font-bold uppercase tracking-wide mb-6 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              Gestão Profissional
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
              O sistema de gestão que o seu salão <span className="text-cyan-700">merece</span>.
            </h1>

            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              O Horalis nasceu para facilicar a forma com que sua empresa faz o agendamento dos seus clientes. Agendamentos 24/7 de forma facilitada tudo com uma agenda de facil uso integrada com o Google.
              Configure em poucos minutos, integração com mercado pago podendo configurar valor de sinal para confirmação do agendamento, reduza os No-Shows configurando pagamento de sinal.

            </p>



            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button onClick={() => setIsModalOpen(true)} className={`px-8 py-4 rounded-lg font-bold text-lg shadow-lg transition-transform hover:-translate-y-0.5 w-full sm:w-auto flex items-center justify-center gap-2 ${BUTTON_PRIMARY}`}>
                Comece o seu Teste Grátis de 7 dias ! sem cartão de crédito.
              </button>
              <a href="#funcionalidades" className={`px-8 py-4 rounded-lg font-bold text-lg transition-colors w-full sm:w-auto flex items-center justify-center ${BUTTON_OUTLINE}`}>
                Conhecer Recursos
              </a>
            </div>

            <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-sm text-slate-500 font-medium">
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-cyan-700" /> Dados Seguros</span>
              <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-cyan-700" /> Setup Rápido</span>
            </div>
          </div>

          {/* LADO DIREITO: Visual com Moldura de CELULAR (Corrigido e com Botão) */}
          <div className="relative w-full flex items-center justify-center order-1 lg:order-2" data-aos="fade-left">
            <div className="relative">
              {/* Efeito de brilho atrás */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-gradient-to-tr from-cyan-200 to-blue-200 rounded-full blur-3xl opacity-50"></div>

              {/* MOLDURA DE CELULAR (PHONE MOCKUP) */}
              <div className="relative mx-auto border-gray-900 bg-gray-900 border-[8px] rounded-[2.5rem] h-[600px] w-[300px] shadow-2xl flex flex-col overflow-hidden transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                {/* Notch / Câmera */}
                <div className="absolute top-0 w-full h-6 bg-transparent z-20 flex justify-center">
                  <div className="h-4 w-32 bg-gray-900 rounded-b-xl"></div>
                </div>

                {/* Botões laterais (simulados com borda) */}
                <div className="absolute top-24 -right-[10px] h-16 w-[10px] bg-gray-800 rounded-r-md"></div>
                <div className="absolute top-24 -left-[10px] h-10 w-[10px] bg-gray-800 rounded-l-md"></div>

                {/* Tela do Celular */}
                <div className="h-full w-full bg-white overflow-hidden relative rounded-[2rem]">
                  <ImageWithFallback
                    src="/pagina-agendamentos.png"
                    alt="Exemplo de Microsite Horalis no Celular"
                    className="w-full h-full object-cover object-top"
                  />
                  {/* BOTÃO SOBREPOSTO */}
                  <a
                    href={REAL_MICROSITE_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-cyan-600 text-white font-bold rounded-full shadow-lg hover:bg-cyan-700 transition-colors flex items-center gap-2"
                  >
                    <Eye className="w-5 h-5" /> Visualizar Microsite
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SOBRE E OBJETIVO (Institucional) --- */}
      <section id="sobre" className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="text-sm font-bold text-cyan-700 uppercase tracking-wider mb-2 block">Sobre o Horalis</span>
          <h2 className="text-3xl font-bold text-slate-900 mb-8">Tecnologia a serviço da sua empresa</h2>
          <p className="text-lg text-slate-600 leading-relaxed mb-12">
            Nascemos com o propósito de eliminar a desorganização que impede o crescimento de pequenos e médios negócios.
            Sabemos que o seu talento está no atendimento, não em planilhas.
          </p>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {[
              { title: "Objetivo", desc: "Automatizar processos manuais para que você ganhe tempo livre." },
              { title: "Visão", desc: "Ser a plataforma de gestão mais confiável e intuitiva do mercado." },
              { title: "Segurança", desc: "Seus dados protegidos com criptografia de nuvem." }
            ].map((item, i) => (
              <div key={i} className="p-6 bg-slate-50 rounded-xl border border-slate-100 hover:border-cyan-200 transition-colors">
                <h3 className="font-bold text-slate-900 text-xl mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FUNCIONALIDADES DETALHADAS (Grid Expandido) --- */}
      <section id="funcionalidades" className="py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Funcionalidades do App</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Uma suíte completa de ferramentas desenhada para cobrir todas as necessidades operacionais do seu negócio.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Grupo Agendamento */}
            <FeatureCard
              icon={Smartphone} title="Microsite Próprio"
              description="Seu link exclusivo. O cliente acessa e agenda sem baixar o app e 24/7. Você escolhe seu horario de atendimento e o sistema faz o resto."
            />
            <FeatureCard
              icon={Calendar} title="Agenda Digital"
              description="Visualize sua semana, bloqueie horários e reorganize compromissos facilmente."
            />
            <FeatureCard
              icon={Smartphone} title="Reponsividade"
              description="Gerencie tudo pelo celular, tablet ou computador, de onde estiver."
            />

            {/* Grupo Financeiro & Gestão */}
            <FeatureCard
              icon={Zap} title="Sinal via PIX"
              description="Cobre um valor antecipado no agendamento e reduza o no-show a zero."
            />
            <FeatureCard
              icon={CreditCard} title="Integração Mercado Pago"
              description="Receba pagamentos de forma segura e automática, direto na sua conta."
            />
            <FeatureCard
              icon={TrendingUp} title="Relatórios Gerenciais"
              description="Descubra quais dias têm menos movimento. Use dados para criar campanhas e lotar horários vazios."
            />

            {/* Grupo Marketing & Inteligência */}
            <FeatureCard
              icon={Bell} title="Lembretes Automáticos"
              description="O sistema avisa seu cliente sobre o horário, evitando esquecimentos."
            />
            <FeatureCard
              icon={Megaphone} title="Marketing e Fidelização"
              description="Envie promoções e recupere clientes inativos com campanhas prontas."
            />
            <FeatureCard
              icon={ShieldCheck} title="Sincronia Google"
              description="Integração nativa com Google Agenda para evitar conflitos de horário."
            />
          </div>
        </div>
      </section>

      {/* --- COMO COMEÇAR --- */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-16">Como começar a usar</h2>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-slate-100 -z-10"></div>

            <StepCard number="1" title="Crie sua conta" description="Cadastro gratuito em menos de 2 minutos. Sem cartão de crédito." />
            <StepCard number="2" title="Personalize" description="Configure serviços, horários, logo e cores para deixar com a sua cara." />
            <StepCard number="3" title="Compartilhe" description="Envie seu link de agendamento para clientes e veja a mágica acontecer." />
          </div>

          <div className="text-center mt-12">
            <button onClick={() => setIsModalOpen(true)} className={`px-10 py-3 rounded-lg font-bold text-lg shadow-md transition-all transform hover:-translate-y-0.5 ${BUTTON_PRIMARY}`}>
              Criar Conta Agora
            </button>
          </div>
        </div>
      </section>

      {/* --- PREÇOS --- */}
      <section id="planos" className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Preço justo e transparente</h2>
          <p className="text-slate-400 mb-12">Sem pegadinhas.</p>

          <div className="max-w-md mx-auto bg-white text-slate-900 rounded-2xl p-8 shadow-2xl border-4 border-cyan-600 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-cyan-600 text-white text-xs font-bold px-4 py-1 rounded-bl-xl uppercase tracking-wide">Recomendado</div>
            <h3 className="text-2xl font-bold mb-2">Horalis PRO</h3>
            <div className="flex items-baseline justify-center gap-1 mb-8 border-b border-slate-100 pb-8">
              <span className="text-5xl font-extrabold">{DISPLAY_PRICE_SETUP}</span>
              <span className="text-lg text-slate-500 font-medium">/mês</span>
            </div>
            <ul className="space-y-4 mb-8 text-left">
              {[
                "Agendamentos Ilimitados", "Microsite Personalizado", "Pagamento Online (PIX)",
                "Lembretes Automáticos", "Relatórios Gerenciais", "Suporte Prioritário"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700 font-medium text-sm">
                  <Check className="w-5 h-5 text-cyan-600 flex-shrink-0" /> {item}
                </li>
              ))}
            </ul>
            <button onClick={() => setIsModalOpen(true)} className={`w-full py-4 rounded-lg font-bold text-lg shadow-lg transition-all ${BUTTON_PRIMARY}`}>
              Começar Teste Grátis
            </button>
            <p className="text-xs text-slate-400 mt-4">7 dias grátis • Cancele quando quiser</p>
          </div>
        </div>
      </section>

      {/* --- FAQ (Perguntas Frequentes) --- */}
      <section id="faq" className="py-24 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Dúvidas Frequentes</h2>
          <div className="space-y-2">
            <FaqItem question="Preciso cadastrar cartão para testar?" answer="Não. Você pode criar sua conta e usar todas as funcionalidades gratuitamente por 7 dias sem informar dados de pagamento." />
            <FaqItem question="Como recebo o dinheiro dos agendamentos?" answer="O sistema é integrado ao Mercado Pago. O valor do sinal cai diretamente na sua conta do Mercado Pago na hora, com segurança total." />
            <FaqItem question="O que são os Relatórios Gerenciais?" answer="São gráficos inteligentes que mostram quais dias da semana e horários têm menos movimento, ajudando você a criar promoções estratégicas para preencher sua agenda." />
            <FaqItem question="Posso cancelar minha assinatura?" answer="Sim, a qualquer momento. Não temos contrato de fidelidade. Basta acessar as configurações e cancelar." />
            <FaqItem question="Funciona no celular?" answer="Sim! O Horalis é 100% responsivo e funciona perfeitamente em qualquer celular, tablet ou computador, sem precisar instalar nada." />
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      {/* --- FOOTER PROFISSIONAL --- */}
            <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-6">
                    
                    {/* Parte Superior: Grid de Links e Marca */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                        
                        {/* Coluna 1: Marca e Missão (Ocupa 2 colunas no mobile se quiser, ou 1 padrão) */}
                        <div className="col-span-2 md:col-span-1">
                            <div className="mb-4">
                                <LogoHoralis size="h-8" darkText={true} />
                            </div>
                            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                                Transformando a gestão de salões e barbearias com agendamentos inteligentes.
                            </p>
                        </div>

                        {/* Coluna 2: Produto */}
                        <div>
                            <h4 className="font-bold text-slate-900 mb-4">Produto</h4>
                            <ul className="space-y-2 text-sm text-slate-600">
                                <li><a href="#funcionalidades" className="hover:text-cyan-700 transition-colors">Funcionalidades</a></li>
                                <li><a href="#planos" className="hover:text-cyan-700 transition-colors">Planos e Preços</a></li>
                                <li><a href={REAL_MICROSITE_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-700 transition-colors">Ver Demonstração</a></li>
                                <li><span className="text-cyan-600 text-xs font-bold bg-cyan-50 px-2 py-0.5 rounded-full">Novo</span> Integração Google</li>
                            </ul>
                        </div>

                        {/* Coluna 3: Suporte */}
                        <div>
                            <h4 className="font-bold text-slate-900 mb-4">Suporte</h4>
                            <ul className="space-y-2 text-sm text-slate-600">
                                <li><a href={WHATSAPP_LNK} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-700 transition-colors">Fale Conosco</a></li>
                                <li><a href="#faq" className="hover:text-cyan-700 transition-colors">Central de Ajuda</a></li>
                                <li><a href="#" className="hover:text-cyan-700 transition-colors">Status do Sistema</a></li>
                            </ul>
                        </div>

                        {/* Coluna 4: Legal */}
                        <div>
                            <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-slate-600">
                                <li><a href="#" className="hover:text-cyan-700 transition-colors">Termos de Uso</a></li>
                                <li><a href="#" className="hover:text-cyan-700 transition-colors">Política de Privacidade</a></li>
                                <li><a href="#" className="hover:text-cyan-700 transition-colors">Cookies</a></li>
                            </ul>
                        </div>
                    </div>

                    {/* Parte Inferior: Copyright e Redes Sociais */}
                    <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-slate-400">
                            © {new Date().getFullYear()} Horalis Inc. Todos os direitos reservados.
                        </p>
                        
                        <div className="flex items-center gap-6">
                            {/* Ícones sociais (usando Lucide ou apenas placeholders visuais se preferir) */}
                            <a href="#" className="text-slate-400 hover:text-cyan-700 transition-colors" aria-label="Instagram">
                                <Icon icon={Instagram} className="w-5 h-5" />
                            </a>
                            <a href="#" className="text-slate-400 hover:text-cyan-700 transition-colors" aria-label="Facebook">
                                <Icon icon={Facebook} className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                </div>
            </footer>

      {/* --- MODAL DE CADASTRO --- */}
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
