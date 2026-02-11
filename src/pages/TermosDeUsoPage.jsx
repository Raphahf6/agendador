import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ShieldAlert, ArrowLeft, Scale, AlertTriangle, CheckCircle } from 'lucide-react';
import { LogoHoralis } from '@/components/Logo';

const Section = ({ title, children }) => (
  <div className="mb-8 border-b border-gray-100 pb-8 last:border-0">
    <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
      {title}
    </h3>
    <div className="text-slate-600 text-sm leading-relaxed space-y-4 text-justify">
      {children}
    </div>
  </div>
);

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <LogoHoralis size="h-8" darkText={true} />
            </Link>
          </div>
          <Link to="/" className="text-sm font-medium text-slate-600 hover:text-cyan-700 flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar para o início
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12">
          
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Scale className="w-8 h-8 text-cyan-700" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Termos e Condições de Uso</h1>
            <p className="text-slate-500">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>

          {/* CLÁUSULAS ESPECÍFICAS PARA SEU MODELO DE NEGÓCIO */}
          
          <Section title="1. Aceitação e Objeto">
            <p>
              Estes Termos de Uso regem o acesso e utilização da plataforma <strong>HORALIS</strong>, um software de gestão de agendamentos e comissões (SaaS - Software as a Service). Ao contratar nossos serviços, pagar a taxa de implantação ou utilizar nosso software, você ("CONTRATANTE") concorda expressamente com todas as cláusulas aqui descritas.
            </p>
            <p>
              A HORALIS atua meramente como uma <strong>ferramenta tecnológica intermediária</strong> para facilitar a organização de agenda e gestão de equipe. Não possuímos vínculo empregatício com seus profissionais, nem responsabilidade sobre os serviços de beleza/estética prestados em seu estabelecimento.
            </p>
          </Section>

          <Section title="2. Modelo de Contratação (Concierge)">
            <p>
              Nosso serviço opera no modelo de "Implantação Assistida". O acesso ao sistema é liberado após o pagamento da <strong>Taxa de Setup/Implantação</strong>. Esta taxa é única e refere-se exclusivamente ao serviço de configuração inicial (cadastro de profissionais, serviços e horários) realizado por nossa equipe.
            </p>
            <p>
              <strong>2.1 Assinatura:</strong> Após o período de degustação (se aplicável), o uso continuado da plataforma está condicionado ao pagamento da mensalidade vigente. O não pagamento acarretará no bloqueio temporário do acesso administrativo, mantendo-se os dados salvos por até 90 dias.
            </p>
          </Section>

          <Section title="3. Responsabilidades do Usuário">
            <p>
              O CONTRATANTE declara-se ciente de que é o único responsável por:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Pela veracidade dos dados inseridos (preços, horários, comissões);</li>
              <li>Pelo cumprimento das obrigações trabalhistas e fiscais com sua própria equipe/profissionais cadastrados na plataforma;</li>
              <li>Pela qualidade e entrega dos serviços agendados pelos seus clientes finais.</li>
            </ul>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mt-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-800 text-xs font-medium">
                A HORALIS não se responsabiliza por eventuais conflitos, "no-shows" (ausências) ou disputas financeiras entre o estabelecimento e seus clientes finais.
              </p>
            </div>
          </Section>

          <Section title="4. Integrações e Pagamentos (Mercado Pago/Google)">
            <p>
              <strong>4.1 Sinais e Pagamentos:</strong> A plataforma oferece integração com gateways de pagamento (ex: Mercado Pago) para cobrança de sinais antecipados. A HORALIS não processa pagamentos diretamente, não retém valores e não atua como instituição bancária. Qualquer problema relacionado a estornos, fraudes ou bloqueios de saldo deve ser tratado diretamente com a processadora de pagamentos.
            </p>
            <p>
              <strong>4.2 Google Calendar:</strong> A funcionalidade de sincronização com o Google Calendar depende da disponibilidade da API do Google. A HORALIS não garante sincronização em tempo real em caso de instabilidade nos servidores do Google ou revogação de permissões pelo usuário.
            </p>
          </Section>

          <Section title="5. Limitação de Responsabilidade">
            <p>
              Em nenhuma hipótese a HORALIS, seus sócios ou desenvolvedores serão responsáveis por danos indiretos, lucros cessantes, perda de dados ou interrupção de negócios decorrentes do uso ou incapacidade de uso do software.
            </p>
            <p>
              O software é fornecido "no estado em que se encontra" ("as is"), sem garantias de que será livre de erros ou ininterrupto, embora nossa equipe trabalhe continuamente para manter a estabilidade do sistema (SLA alvo de 99%).
            </p>
          </Section>

          <Section title="6. Propriedade Intelectual">
            <p>
              Todos os direitos sobre o código-fonte, design, marca e banco de dados da HORALIS são de propriedade exclusiva da HORALIS INC. A contratação do serviço concede ao usuário apenas uma licença de uso revogável, não exclusiva e intransferível. É estritamente proibida a engenharia reversa, cópia ou distribuição do software.
            </p>
          </Section>

          <Section title="7. Cancelamento">
            <p>
              Não exigimos fidelidade. O CONTRATANTE pode cancelar a assinatura a qualquer momento, sem multa, bastando interromper os pagamentos mensais. A Taxa de Implantação inicial não é reembolsável após a execução do serviço de configuração.
            </p>
          </Section>

          <div className="mt-12 pt-8 border-t border-slate-200 text-center">
            <p className="text-slate-500 text-sm mb-6">
              Ao clicar em "Entrar" ou utilizar o sistema, você confirma que leu e aceitou estes termos.
            </p>
            <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">
              <CheckCircle className="w-5 h-5" /> Entendido, voltar ao início
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}