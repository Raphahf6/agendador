import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Eye, ArrowLeft, Database, UserCheck, ShieldCheck } from 'lucide-react';
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

export default function PoliticaPrivacidadePage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
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
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Política de Privacidade</h1>
            <p className="text-slate-500">Em conformidade com a LGPD (Lei nº 13.709/2018)</p>
          </div>

          <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl mb-8">
            <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <Database className="w-4 h-4" /> Resumo para o Dono do Salão (Controlador):
            </h4>
            <p className="text-sm text-blue-800">
              Para fins da LGPD, <strong>você (estabelecimento) é o Controlador</strong> dos dados dos seus clientes finais. A <strong>HORALIS atua como Operadora</strong>, processando esses dados em seu nome para permitir o agendamento.
            </p>
          </div>

          <Section title="1. Dados Coletados">
            <p>
              A HORALIS coleta e processa dois tipos de dados:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Dados do Contratante (Você):</strong> Nome, e-mail, telefone, CPF/CNPJ e dados de pagamento. Finalidade: Gestão da assinatura e emissão de nota fiscal.</li>
              <li><strong>Dados de Terceiros (Seus Clientes):</strong> Nome e telefone celular inseridos no sistema de agendamento. Finalidade: Permitir a reserva de horário e envio de lembretes automáticos.</li>
            </ul>
          </Section>

          <Section title="2. Compartilhamento de Dados">
            <p>
              Não vendemos dados. As informações são compartilhadas apenas com parceiros estritamente necessários para a operação do sistema:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Google (Cloud & Calendar):</strong> Para hospedagem segura (banco de dados) e integração com agendas.</li>
              <li><strong>Mercado Pago / Gateways:</strong> Para processamento de pagamentos de sinais ou assinaturas. A HORALIS não armazena dados completos de cartão de crédito.</li>
              <li><strong>WhatsApp (APIs):</strong> Para envio de notificações automáticas aos seus clientes (quando contratado).</li>
            </ul>
          </Section>

          <Section title="3. Segurança e Armazenamento">
            <p>
              Utilizamos infraestrutura de nuvem de ponta (Google Cloud Platform / Firebase) com criptografia em trânsito (SSL/TLS) e em repouso. O acesso ao banco de dados é restrito à equipe técnica autorizada da HORALIS mediante autenticação forte.
            </p>
            <p>
              Apesar de adotarmos as melhores práticas de mercado, nenhum sistema é 100% imune a ataques. Em caso de incidente de segurança relevante, notificaremos os Controladores afetados conforme prazos legais.
            </p>
          </Section>

          <Section title="4. Seus Direitos (e de seus Clientes)">
            <p>
              Conforme a LGPD, você e seus clientes têm direito a:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Confirmar a existência de tratamento de dados;</li>
              <li>Acessar os dados armazenados;</li>
              <li>Corrigir dados incompletos ou desatualizados;</li>
              <li>Solicitar a exclusão de dados (respeitando-se os prazos legais de guarda fiscal/jurídica).</li>
            </ul>
            <p>
              Para solicitar a exclusão de dados de um cliente final seu, basta utilizar a função "Excluir Cliente" dentro do painel administrativo. Isso removerá as informações de nossa base ativa.
            </p>
          </Section>

          <Section title="5. Cookies e Tecnologias de Rastreamento">
            <p>
              Utilizamos cookies essenciais para manter sua sessão de login ativa e segura (Autenticação). Também podemos utilizar cookies analíticos anônimos para entender como o sistema é utilizado e melhorar a performance. Não utilizamos cookies de publicidade de terceiros dentro do painel administrativo.
            </p>
          </Section>

          <Section title="6. Contato do Encarregado (DPO)">
            <p>
              Para dúvidas sobre proteção de dados ou solicitações administrativas relacionadas à LGPD, entre em contato através do e-mail: <strong className="text-slate-900">suporte@horalis.app</strong>.
            </p>
          </Section>

          <div className="mt-12 pt-8 border-t border-slate-200 text-center">
            <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors">
              <ShieldCheck className="w-5 h-5" /> Entendido, voltar ao início
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}