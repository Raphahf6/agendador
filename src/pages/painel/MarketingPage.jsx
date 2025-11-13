import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Send, UserPlus, Loader2, AlertTriangle, Link as LinkIcon, QrCode, Check, Eye, X, Users, UserCheck, UserX, Info, Copy } from 'lucide-react'; 
import { auth } from '@/firebaseConfig';
import { QRCodeCanvas } from 'qrcode.react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import HourglassLoading from '@/components/HourglassLoading';

import { useSalon } from './PainelLayout';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// 🌟 CORES HORALIS (Light Theme) 🌟
const PRIMARY_TEXT = 'text-[#00ACC1]';
const PRIMARY_BG = 'bg-[#00ACC1]';
const PRIMARY_BG_HOVER = 'hover:bg-[#0092A6]';
const HORALIS_MAIN_COLOR = '#00ACC1'; // Cor principal para QR Code Poster

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// --- MODAL DE PRÉ-VISUALIZAÇÃO (Mantido) ---
const PreviewEmailModal = ({ isOpen, onClose, subject, message, salonName }) => { /* ... */ 
    if (!isOpen) return null;

    const emailHtmlContent = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; color: #333; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <h1 style="color: #E91E63; font-size: 24px; border-bottom: 2px solid #eee; padding-bottom: 10px;">${subject}</h1>
                <p>Olá, <strong>[Nome do Cliente]</strong>!</p>
                
                <div style="background-color: #FCE4EC; border-left: 5px solid #FF80AB; margin-top: 20px; margin-bottom: 20px; padding: 15px; border-radius: 4px;">
                    ${message}
                </div>
                
                <p>Esperamos te ver em breve!</p>
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
                Este e-mail foi enviado automaticamente pelo sistema Horalis.
            </div>
        </div>
    `;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Pré-visualização do E-mail</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
                        <Icon icon={X} className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-5 bg-gray-100">
                    <p className="text-sm text-gray-600 mb-2">De: Horalis (Em nome de {salonName})</p>
                    <p className="text-sm text-gray-600 mb-2">Para: [Nome do Cliente] &lt;email.do.cliente@exemplo.com&gt;</p>
                    <p className="text-sm text-gray-600 mb-4">Assunto: <span className="font-medium text-gray-900">{subject}</span></p>
                    <iframe
                        srcDoc={emailHtmlContent}
                        title="Pré-visualização do E-mail"
                        className="w-full h-96 border border-gray-300 rounded-lg"
                    />
                </div>
            </div>
        </div>
    );
};
// --- FIM DO MODAL DE PREVIEW ---


function MarketingPage() {
    const { salaoId, salonDetails, loading: loadingContext } = useSalon();

    const [subject, setSubject] = useState('Novidade exclusiva da sua marca!');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [segmento, setSegmento] = useState('todos');
    const [linkCopied, setLinkCopied] = useState(false);
    const copyTimeoutRef = useRef(null);

    // Valores derivados do contexto, sempre atualizados
    const salonName = salonDetails?.nome_salao || "Seu Salão";
    const publicUrl = `https://horalis.app/agendar/${salaoId}`;

    // Consumo dos dados de cota diretamente do contexto/detalhes
    const cotaTotal = salonDetails?.marketing_cota_total || 100;
    const cotaUsada = salonDetails?.marketing_cota_usada || 0;
    const cotaResetEmRaw = salonDetails?.marketing_cota_reset_em;
    const cotaResetEm = cotaResetEmRaw ? parseISO(cotaResetEmRaw) : null;
    const cotaPercentual = (cotaUsada / cotaTotal) * 100;

    const loadingSalonData = loadingContext;

    const fetchSalonData = useCallback(async () => { /* ... (lógica mantida) ... */ }, [salaoId]);

    const handleSubmit = async (e) => { /* ... (lógica mantida) ... */ };

    // --- Funções do Kit Bio (Mantidas) ---
    const copyLink = () => { /* ... (lógica mantida) ... */ };
    const downloadStylishQRCode = async () => { /* ... (lógica mantida) ... */ };

    return (
        <div className="space-y-6">
            <h2 className={`text-2xl font-bold text-gray-900 flex items-center ${PRIMARY_TEXT}`}>
                <Icon icon={UserPlus} className="w-6 h-6 mr-3" />
                Marketing & Aquisição de Clientes
            </h2>

            {/* --- Card Kit "Link na Bio" --- */}
            <div className="bg-white p-6 shadow-md rounded-lg border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Seu Link de Agendamento</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Este é o link que seus clientes usarão para agendar. Cole na bio do seu Instagram, no status do WhatsApp ou envie diretamente.
                </p>
                <div className="flex items-center w-full bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <Icon icon={LinkIcon} className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                    <input
                        type="text"
                        readOnly
                        value={publicUrl}
                        className="text-sm text-gray-700 bg-transparent flex-1 focus:outline-none min-w-0 truncate"
                    />
                    {/* Botão Copiar (Corrigido para Ícone) */}
                    <button
                        onClick={copyLink}
                        className={`flex-shrink-0 flex items-center justify-center p-2 text-sm font-semibold rounded-lg transition-colors ml-2 
                        ${linkCopied
                            ? 'bg-green-100 text-green-700'
                            : `${PRIMARY_BG} text-white ${PRIMARY_BG_HOVER}`
                        }`}
                        title={linkCopied ? "Copiado!" : "Copiar Link"}
                    >
                        <Icon icon={linkCopied ? Check : Copy} className="w-5 h-5" />
                    </button>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row items-center gap-6">
                    {/* Canvas oculto para gerar a imagem do QR Code (Mantido) */}
                    <div className="hidden">
                        <QRCodeCanvas
                            id="horalis-qrcode-canvas"
                            value={publicUrl}
                            size={512}
                            bgColor={"#ffffff"}
                            fgColor={"#000000"}
                            level={"H"}
                            includeMargin={false}
                        />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <h4 className="font-semibold text-gray-800">Pôster de QR Code (Para Impressão)</h4>
                        <p className="text-sm text-gray-600 mt-1 mb-3">
                            Baixe uma imagem com o QR Code já estilizado com o nome do seu estabelecimento, pronto para impressão.
                        </p>
                        <button
                            onClick={downloadStylishQRCode}
                            disabled={loadingContext}
                            className={`inline-flex items-center px-4 py-2 text-sm font-semibold text-white ${PRIMARY_BG} rounded-lg shadow-sm ${PRIMARY_BG_HOVER} transition-colors disabled:opacity-50`}
                        >
                            <Icon icon={QrCode} className="w-4 h-4 mr-2" />
                            {loadingContext ? 'Carregando dados...' : 'Baixar Pôster (PNG)'}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- COTA DE E-MAIL (Mantido) --- */}
            {/* ... (cota de e-mail e avisos mantidos) ... */}
            <div className="bg-white p-6 shadow-md rounded-lg border border-gray-200 max-w-2xl mx-auto">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Cota de E-mail Marketing</h3>
                {loadingContext ? (
                    <div className="flex justify-center py-4"><HourglassLoading/></div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-sm font-medium text-gray-700">
                                E-mails enviados este mês:
                            </p>
                            <p className={`text-lg font-bold ${cotaUsada >= cotaTotal ? 'text-red-600' : PRIMARY_TEXT}`}>
                                {cotaUsada} / {cotaTotal}
                            </p>
                        </div>
                        {/* Barra de Progresso */}
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className={`h-2.5 rounded-full ${cotaUsada >= cotaTotal ? 'bg-red-600' : PRIMARY_BG}`}
                                style={{ width: `${cotaPercentual > 100 ? 100 : cotaPercentual}%` }}
                            ></div>
                        </div>
                        {cotaResetEm && (
                            <p className="text-xs text-gray-500 text-center">
                                Sua cota será renovada em {format(cotaResetEm, 'dd/MM/yyyy', { locale: ptBR })}.
                            </p>
                        )}
                    </div>
                )}
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg flex items-center gap-3 max-w-2xl mx-auto">
                <Icon icon={AlertTriangle} className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">
                    **ATENÇÃO:** O envio consome sua cota de e-mails. Verifique o segmento e o conteúdo antes de confirmar.
                </p>
            </div>

            {successMessage && (
                <div className="p-4 bg-green-100 border border-green-200 text-green-700 rounded-lg max-w-2xl mx-auto">
                    <p className="font-semibold">{successMessage}</p>
                </div>
            )}


            {/* Card de E-mail em Massa (formulário) */}
            <div className="bg-white p-6 shadow-md rounded-lg border border-gray-200 max-w-2xl mx-auto">
                <h3 className="text-xl font-semibold text-gray-900 mb-5">Criar E-mail Promocional</h3>
                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* --- Seletor de Segmento (Mantido) --- */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Público-Alvo (Segmento)*</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label
                                onClick={() => setSegmento('todos')}
                                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${segmento === 'todos' ? `border-[#0092A6] bg-cyan-50 ring-2 ring-[#00ACC1]` : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                            >
                                <Icon icon={Users} className={`w-5 h-5 mr-2 ${segmento === 'todos' ? PRIMARY_TEXT : 'text-gray-500'}`} />
                                <span className="text-sm font-medium text-gray-800">Todos os Clientes</span>
                            </label>

                            <label
                                onClick={() => setSegmento('inativos')}
                                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${segmento === 'inativos' ? `border-[#0092A6] bg-cyan-50 ring-2 ring-[#00ACC1]` : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                            >
                                <Icon icon={UserX} className={`w-5 h-5 mr-2 ${segmento === 'inativos' ? PRIMARY_TEXT : 'text-gray-500'}`} />
                                <span className="text-sm font-medium text-gray-800">Inativos (60d+)</span>
                            </label>

                            <label
                                onClick={() => setSegmento('recentes')}
                                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${segmento === 'recentes' ? `border-[#0092A6] bg-cyan-50 ring-2 ring-[#00ACC1]` : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                            >
                                <Icon icon={UserCheck} className={`w-5 h-5 mr-2 ${segmento === 'recentes' ? PRIMARY_TEXT : 'text-gray-500'}`} />
                                <span className="text-sm font-medium text-gray-800">Recentes (30d)</span>
                            </label>
                        </div>
                    </div>

                    {/* Campos Assunto e Mensagem (Mantidos) */}
                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Assunto do E-mail*</label>
                        <input
                            id="subject"
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 h-10 focus:ring-cyan-500 focus:border-cyan-500"
                            required
                            minLength={5}
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Corpo da Mensagem (pode usar HTML básico)</label>
                        <textarea
                            id="message"
                            rows="10"
                            placeholder="Escreva sua promoção ou novidade aqui. Ex: <h2>Super Promoção!</h2> Use o código DESCONTO15."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-cyan-500 focus:border-cyan-500"
                            required
                            minLength={10}
                            disabled={loading}
                        />
                    </div>

                    {/* Botões Pré-visualizar e Enviar */}
                    <div className="flex justify-between items-center pt-4">
                        {/* Botão PRÉ-VISUALIZAR */}
                        <button
                            type="button"
                            onClick={() => setIsPreviewOpen(true)}
                            disabled={!message.trim() || !subject.trim() || loadingContext}
                            // 🌟 AJUSTADO: Esconde texto no mobile, padding compacto
                            className="flex items-center px-3 py-2 sm:px-4 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            <Icon icon={Eye} className="w-5 h-5 flex-shrink-0" />
                            <span className="sm:ml-2 hidden sm:inline">
                                Pré-visualizar
                            </span>
                        </button>

                        {/* Botão ENVIAR */}
                        <button
                            type="submit"
                            // 🌟 AJUSTADO: Esconde texto no mobile, padding compacto
                            className={`flex items-center px-3 py-2 sm:px-6 text-base font-semibold text-white ${PRIMARY_BG} rounded-lg shadow-md ${PRIMARY_BG_HOVER} transition-colors disabled:opacity-50`}
                            disabled={loading || !message.trim() || !subject.trim() || cotaUsada >= cotaTotal || loadingContext}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2 sm:mr-2" /> : <Icon icon={Send} className="w-5 h-5 flex-shrink-0 sm:mr-2" />}
                            <span className="sm:inline hidden">
                                {loading ? 'Disparando...' : (cotaUsada >= cotaTotal ? 'Limite Atingido' : 'Enviar para Segmento')}
                            </span>
                        </button>
                    </div>
                </form>
            </div>

            {/* Renderiza o Modal de Preview (Mantido) */}
            <PreviewEmailModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                subject={subject}
                message={message}
                salonName={salonName}
            />
        </div>
    );
}

export default MarketingPage;