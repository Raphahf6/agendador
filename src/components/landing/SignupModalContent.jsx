import React, { useState } from 'react';
import { Payment } from '@mercadopago/sdk-react';
import { Link } from 'react-router-dom';
import { useSignupPayment } from '@/hooks/useSignupPayment';
// Importe todos os ícones e helpers necessários para a renderização
import { Link2, Sparkles, Clock, Users, Zap, Check, ArrowRight, Phone, LogIn, Menu, X, Smartphone, Mail, Loader2, QrCode, Copy, CreditCard, User, Lock as LockIcon } from 'lucide-react';
import { MONTHLY_PRICE_AMOUNT } from '@/utils/pricing';
import { DISPLAY_PRICE_SETUP } from '@/utils/pricing';
// --- CONFIGURAÇÕES DE COR E CONSTANTES (Ajuste conforme o seu arquivo) ---
const BRAND_NAME = "Horalis";
const CIANO_COLOR = 'cyan-800';
const CIANO_BG_CLASS = `bg-${CIANO_COLOR}`;
const CIANO_BG_HOVER_CLASS = `hover:bg-cyan-700`;
const CIANO_TEXT_CLASS = `text-${CIANO_COLOR}`;

// Única definição do renderIcon (ou use a versão da LandingPage)
const renderIcon = (IconComponent, extraClasses = "") => (
    <IconComponent className={`stroke-current ${extraClasses}`} />
);

function SignupModalContent({ closeModal, isModalOpen }) {
    // 1. CHAMA O HOOK: Consome toda a lógica de negócio
    const {
        step, setStep,
        formData, updateFormField,
        pixData,
        error,
        loading,
        handleFormSubmit,
        handleCardPaymentSubmit,
        handlePixPayment,
        navigate,
    } = useSignupPayment(isModalOpen);

    const [copied, setCopied] = useState(false);

    // Helper para copiar (UI-related)
    const copyToClipboard = (text) => {
        // Usa navigator.clipboard para melhor compatibilidade em browsers modernos
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => {
            console.error("Falha ao copiar:", err);
            // Fallback para document.execCommand('copy') se necessário
        });
    };
    
    // Configuração do Brick (APENAS CARTÕES)
    const paymentBrickCustomization = {
        paymentMethods: { creditCard: "all", debitCard: "all" },
        visual: { style: { theme: 'default' } }
    };
    
    // Handler de fechamento (para o rollback seguro, se necessário)
    // O hook useSignupPayment deve fornecer um handler que inclua o rollback seguro.
    const onClose = () => {
        // Chamada direta ao closeModal. A lógica de rollback por expiração
        // agora está no backend (cria-conta-paga), tornando o fechamento seguro.
        closeModal();
    };


    // --- RENDERIZAÇÃO: JSX + Handlers do Hook ---
    return (
        <div
          className={`bg-white p-8 shadow-xl border border-gray-200 rounded-xl relative overflow-y-auto max-h-[90vh]
          ${step === 3 ? 'max-w-md md:max-w-3xl' : 'max-w-lg md:max-w-2xl'}`}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center mb-6 border-b pb-4">
            <h2 className="text-3xl font-extrabold text-gray-900">
              {BRAND_NAME} <span className={CIANO_TEXT_CLASS}>Pro</span>
            </h2>
            <p className="text-gray-600 mt-1">
              {step === 1 && "Crie sua conta profissional 🚀"}
              {step === 2 && "Finalize sua assinatura de R$ 0,99"}
              {step === 3 && "PIX gerado! Escaneie para pagar."}
              {step === 4 && "Sucesso Total! 🎉"}
            </p>
          </div>

          {/* Passo 1: Formulário de Dados */}
          {step === 1 && (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="nomeSalao" className="text-sm font-medium text-gray-700">Nome do Salão</label>
                <div className="relative">
                  {renderIcon(User, "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400")}
                  <input id="nomeSalao" type="text" placeholder="Seu Estúdio de Beleza" required className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg h-11 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400`} value={formData.nomeSalao} onChange={(e) => updateFormField('nomeSalao', e.target.value)} disabled={loading} />
                </div>
              </div>
              
              <div className="space-y-1">
                <label htmlFor="whatsapp" className="text-sm font-medium text-gray-700">Seu WhatsApp (ID de Acesso)</label>
                <div className="relative">
                  {renderIcon(Phone, "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400")}
                  <input id="whatsapp" type="tel" placeholder="DDD + Número (ex: 11987654321)" required className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg h-11 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400`} value={formData.whatsapp} onChange={(e) => updateFormField('whatsapp', e.target.value)} disabled={loading} />
                </div>
              </div>

              <div className="space-y-1 pt-3 border-t border-gray-100">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">Seu E-mail (Notificações)</label>
                <div className="relative">
                  {renderIcon(Mail, "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400")}
                  <input id="email" type="email" placeholder="seuemail@exemplo.com" required className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg h-11 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400`} value={formData.email} onChange={(e) => updateFormField('email', e.target.value)} disabled={loading} />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="cpf" className="text-sm font-medium text-gray-700">CPF (para o Pagamento)</label>
                <div className="relative">
                  {renderIcon(CreditCard, "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400")}
                  <input id="cpf" type="tel" placeholder="000.000.000-00" required className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg h-11 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400`} value={formData.cpf} onChange={(e) => updateFormField('cpf', e.target.value)} disabled={loading} maxLength={14} />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">Sua Senha</label>
                <div className="relative">
                  {renderIcon(LockIcon, "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400")}
                  <input id="password" type="password" placeholder="Mínimo 6 caracteres" required className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg h-11 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400`} value={formData.password} onChange={(e) => updateFormField('password', e.target.value)} disabled={loading} />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirme sua Senha</label>
                <div className="relative">
                  {renderIcon(LockIcon, "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400")}
                  <input id="confirmPassword" type="password" placeholder="Repita a senha" required className={`w-full pl-10 pr-4 py-2.5 border rounded-lg h-11 focus:outline-none focus:ring-2 ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-500 focus:ring-red-400 focus:border-red-500' : `border-gray-300 focus:ring-cyan-400 focus:border-cyan-400`}`} value={formData.confirmPassword} onChange={(e) => updateFormField('confirmPassword', e.target.value)} disabled={loading} />
                </div>
              </div>

              {error && (<div className="p-3 bg-red-100 border border-red-200 rounded-md text-center"><p className="text-sm text-red-700">{error}</p></div>)}

              <button type="submit" className={`w-full h-11 flex items-center justify-center text-base font-semibold text-white ${CIANO_BG_CLASS} rounded-lg shadow-md ${CIANO_BG_HOVER_CLASS} transition-colors disabled:opacity-70`} disabled={loading}>
                {loading ? renderIcon(Loader2, "w-5 h-5 animate-spin") : <>{renderIcon(ArrowRight, "w-5 h-5 mr-2")} Ir para o Pagamento</>}
              </button>
            </form>
          )}

          {/* Passo 2: Pagamento (Cartão ou PIX) */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex justify-between items-center text-sm">
                <div>
                  <p className="text-gray-600 truncate">Conta: <span className="font-medium text-gray-800">{formData.email}</span></p>
                  <p className="text-gray-600 truncate">Salão: <span className="font-medium text-gray-800">{formData.nomeSalao}</span></p>
                </div>
                <button onClick={() => setStep(1)} className={`text-xs ${CIANO_TEXT_CLASS} hover:underline font-medium`} disabled={loading}>
                  {renderIcon(ArrowRight, "w-4 h-4 inline rotate-180 mr-1")}Editar
                </button>
              </div>

              {error && (<div className="p-3 bg-red-100 border border-red-200 rounded-md text-center"><p className="text-sm text-red-700">{error}</p></div>)}

              {/* Opção PIX (Botão Customizado) */}
              <button type="button" onClick={handlePixPayment} className={`w-full h-12 flex items-center justify-center text-base font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:opacity-70`} disabled={loading}>
                {loading ? renderIcon(Loader2, "w-5 h-5 animate-spin") : <>{renderIcon(QrCode, "w-5 h-5 mr-2")} Pagar com PIX {DISPLAY_PRICE_SETUP}</>}
              </button>

              <div className="flex items-center gap-2 my-4">
                <hr className="flex-grow border-t border-gray-200" />
                <span className="text-sm text-gray-500">OU</span>
                <hr className="flex-grow border-t border-gray-200" />
              </div>

              {/* Brick (SÓ CARTÕES) */}
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Pagar com Cartão</p>
                <Payment
                  // A chave força a remontagem, garantindo que o Brick inicialize no DOM correto
                  key={step} 
                  initialization={{
                    amount: MONTHLY_PRICE_AMOUNT,
                    payer: {
                      email: formData.email,
                      identification: { 
                        type: 'CPF', 
                        number: formData.cpf.replace(/\D/g, '') 
                      },
                      // CORREÇÃO CRÍTICA: Adicionando entityType no camelCase para inicialização do Brick
                      entityType: 'individual', 
                    },
                  }}
                  customization={paymentBrickCustomization}
                  onSubmit={handleCardPaymentSubmit}
                  onError={(err) => {
                    console.error("Erro no Brick:", err);
                    // O erro de inicialização é um aviso; o erro de submissão é tratado pelo onSubmit
                  }}
                />
              </div>
            </div>
          )}

          {/* Passo 3: Exibição do PIX e Polling */}
          {step === 3 && pixData && (
            <div className="flex flex-col items-center p-4">
              <p className="text-lg font-semibold text-gray-800 mb-4">Seu PIX foi gerado com sucesso!</p>

              {/* QR Code */}
              <img
                src={`data:image/png;base64,${pixData.qr_code_base64}`}
                alt="PIX QR Code"
                className="w-48 h-48 border-4 border-cyan-300 shadow-lg rounded-xl mb-4"
              />

              <p className="text-sm text-gray-600 mb-2">Código Copia e Cola:</p>
              <div className="w-full relative">
                <textarea readOnly value={pixData.qr_code} className="w-full p-2 pr-12 border border-gray-300 rounded-lg text-xs font-mono bg-gray-50 resize-none h-20" />
                <button type="button" onClick={() => copyToClipboard(pixData.qr_code)} className={`absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-lg ${CIANO_BG_CLASS} text-white hover:opacity-90 transition-opacity`}>
                  {renderIcon(copied ? Check : Copy, "w-4 h-4")}
                </button>
              </div>

              <div className={`flex items-center justify-center gap-2 mt-6 ${CIANO_TEXT_CLASS} bg-cyan-50 p-3 rounded-lg w-full`}>
                {renderIcon(Loader2, "w-5 h-5 animate-spin")}
                <span className="font-medium text-sm">Aguardando confirmação do PIX...</span>
              </div>

              <p className="text-xs text-gray-500 mt-2">Você será redirecionado automaticamente ao ser aprovado.</p>
            </div>
          )}

          {/* Passo 4: Tela de Sucesso */}
          {step === 4 && (
            <div className="text-center p-6 space-y-4">
              {renderIcon(Check, "w-16 h-16 mx-auto text-green-500 bg-green-100 p-2 rounded-full")}
              <h3 className="text-2xl font-bold text-gray-900">Pagamento Confirmado!</h3>
              <p className="text-lg text-gray-600">Sua conta {BRAND_NAME} Pro está **ATIVA** e pronta para gerenciar seus agendamentos!</p>
              <button
                onClick={() => { onClose(); navigate('/login'); }}
                className={`w-full h-12 flex items-center justify-center text-base font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transition-colors mt-6`}
              >
                {renderIcon(LogIn, "w-5 h-5 mr-2")} Fazer Login Agora
              </button>
              <Link to="/ajuda" className={`${CIANO_TEXT_CLASS} text-sm hover:underline block pt-2`}>Precisa de ajuda?</Link>
            </div>
          )}

          {/* Rodapé do Modal */}
          {step !== 4 && (
            <div className="text-center text-sm text-gray-600 pt-4 border-t border-gray-100 mt-4">
              Já tem uma conta?{' '}
              <Link to="/login" className={`font-semibold ${CIANO_TEXT_CLASS} hover:underline`}>
                Acesse seu Painel {renderIcon(LogIn, "w-4 h-4 inline")}
              </Link>
            </div>
          )}
        </div>
    );
}

export default SignupModalContent;
