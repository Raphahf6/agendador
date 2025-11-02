// frontend/src/pages/painel/MarketingPage.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Send, UserPlus, Loader2, AlertTriangle, Link as LinkIcon, QrCode, Check, Eye, X, Users, UserCheck, UserX, Info } from 'lucide-react'; // Adicionado Info
import { auth } from '@/firebaseConfig';
import { QRCodeCanvas } from 'qrcode.react';
import { format, parseISO } from 'date-fns'; // Importa format e parseISO
import { ptBR } from 'date-fns/locale';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";
const CIANO_TEXT_CLASS = 'text-cyan-800';
const CIANO_BG_CLASS = 'bg-cyan-800';
const CIANO_BG_HOVER_CLASS = 'hover:bg-cyan-900';
const HORALIS_MAIN_COLOR = '#0E7490'; 

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// --- MODAL DE PRÉ-VISUALIZAÇÃO (Sem alterações) ---
const PreviewEmailModal = ({ isOpen, onClose, subject, message, salonName }) => {
    if (!isOpen) return null;

    const emailHtmlContent = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; color: #333; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <h1 style="color: #E91E63; font-size: 24px; border-bottom: 2px solid #eee; padding-bottom: 10px;">${subject}</h1>
                <p>Olá, <strong>[Nome do Cliente]</strong>!</p>
                <p>A equipe do <strong>${salonName}</strong> tem uma novidade especial para você:</p>
                
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
    const { salaoId } = useParams();
    const [subject, setSubject] = useState('Novidade exclusiva da sua marca!');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [segmento, setSegmento] = useState('todos'); 
    const [linkCopied, setLinkCopied] = useState(false);
    const copyTimeoutRef = useRef(null);
    const publicUrl = `https://horalis.app/agendar/${salaoId}`; 

    const [salonName, setSalonName] = useState("Seu Salão");
    const [loadingSalonData, setLoadingSalonData] = useState(true);

    // --- <<< NOVOS ESTADOS PARA A COTA >>> ---
    const [cotaTotal, setCotaTotal] = useState(100); // Padrão
    const [cotaUsada, setCotaUsada] = useState(0);
    const [cotaResetEm, setCotaResetEm] = useState(null);
    // --- <<< FIM DOS NOVOS ESTADOS >>> ---


    // --- useEffect para buscar os dados do salão (AGORA INCLUI COTAS) ---
    const fetchSalonData = useCallback(async () => {
        if (!auth.currentUser || !salaoId) return;
        setLoadingSalonData(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const response = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, { 
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data) {
                setSalonName(response.data.nome_salao || "Seu Salão");
                
                // --- <<< ATUALIZA OS DADOS DA COTA >>> ---
                setCotaTotal(response.data.marketing_cota_total || 100);
                setCotaUsada(response.data.marketing_cota_usada || 0);
                if (response.data.marketing_cota_reset_em) {
                    setCotaResetEm(parseISO(response.data.marketing_cota_reset_em));
                }
                // --- <<< FIM DA ATUALIZAÇÃO >>> ---
            }
        } catch (error) {
            console.error("Erro ao buscar dados do salão:", error);
            toast.error("Não foi possível carregar os dados do salão.");
        } finally {
            setLoadingSalonData(false);
        }
    }, [salaoId]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                fetchSalonData();
            } else {
                setLoadingSalonData(false); 
            }
        });
        return () => unsubscribe();
    }, [fetchSalonData]);


    // --- Lógica de Envio de E-mail (idêntica) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMessage('');
        
        if (!message.trim() || !subject.trim()) {
            toast.error("Assunto e mensagem são obrigatórios.");
            return;
        }

        // <<< VERIFICAÇÃO DE COTA ANTES DO CONFIRM >>>
        if (cotaUsada >= cotaTotal) {
            toast.error("Você atingiu seu limite de 100 e-mails de marketing este mês.");
            return;
        }

        if (!window.confirm(`CONFIRMAR ENVIO: Deseja realmente enviar este e-mail para o segmento selecionado?`)) {
            return;
        }

        setLoading(true);
        const toastId = toast.loading("Iniciando disparo em massa (Isso pode levar alguns minutos)...");

        try {
            const token = await auth.currentUser.getIdToken(); 
            const response = await axios.post(`${API_BASE_URL}/admin/marketing/enviar-massa`, {
                salao_id: salaoId,
                subject: subject.trim(),
                message: message.trim(),
                segmento: segmento, 
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            setSuccessMessage(response.data.message); 
            toast.success("Disparo de Marketing iniciado!", { id: toastId });
            setMessage('');
            setSubject('Novidade exclusiva da sua marca!');
            
            // Recarrega os dados da cota após o envio
            fetchSalonData(); 

        } catch (err) {
            // O backend agora retorna 403 se a cota estourar durante o envio
            const detail = err.response?.data?.detail || err.response?.data?.message || "Erro interno de conexão ou timeout.";
            toast.error(detail, { id: toastId });
        } finally {
            setLoading(false);
        }
    };
    
    // --- Funções do Kit Bio (idênticas) ---
    const copyLink = () => {
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        navigator.clipboard.writeText(publicUrl).then(() => {
            setLinkCopied(true);
            toast.success("Link público copiado!");
            copyTimeoutRef.current = setTimeout(() => setLinkCopied(false), 2000);
        }).catch(err => {
            toast.error('Erro ao copiar link.');
            console.error('Erro ao copiar: ', err);
        });
    };

    const downloadStylishQRCode = async () => {
        const toastId = toast.loading("Gerando seu pôster de QR Code...");
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const imageWidth = 800;
        const imageHeight = 1000;
        canvas.width = imageWidth;
        canvas.height = imageHeight;

        // 1. Fundo
        ctx.fillStyle = HORALIS_MAIN_COLOR; 
        ctx.fillRect(0, 0, imageWidth, imageHeight);
       
        // 2. Nome do Estabelecimento
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 70px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(salonName, imageWidth / 2, 200); 

        // 3. QR Code
        const qrCodeSize = 350; 
        const qrCodeX = (imageWidth - qrCodeSize) / 2;
        const qrCodeY = 300; 

        const qrCodeTempCanvas = document.getElementById('horalis-qrcode-canvas'); 
        if (qrCodeTempCanvas) {
            ctx.fillStyle = '#ffffff'; 
            ctx.fillRect(qrCodeX - 25, qrCodeY - 25, qrCodeSize + 50, qrCodeSize + 50); 
            ctx.drawImage(qrCodeTempCanvas, qrCodeX, qrCodeY, qrCodeSize, qrCodeSize);
        } else {
            console.error("Canvas do QR Code não encontrado.");
            toast.error("Erro ao gerar QR Code.", { id: toastId });
            return;
        }
       
        // 4. Texto chamativo
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("Escaneie para Agendar!", imageWidth / 2, qrCodeY + qrCodeSize + 100);

        // 5. URL
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '30px Arial';
        ctx.fillText(publicUrl.replace('https://', ''), imageWidth / 2, qrCodeY + qrCodeSize + 160);

        // 6. Download
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `poster-qrcode-${salaoId}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        toast.success("Download do Pôster de QR Code iniciado!", { id: toastId });
    };

    // --- Calcula a porcentagem da cota usada ---
    const cotaPercentual = (cotaUsada / cotaTotal) * 100;

    return (
        <div className="space-y-6">
            <h2 className={`text-2xl font-bold text-gray-900 flex items-center ${CIANO_TEXT_CLASS}`}>
                <Icon icon={UserPlus} className="w-6 h-6 mr-3" />
                Marketing & Aquisição de Clientes
            </h2>
            
            {/* --- Card Kit "Link na Bio" (idêntico) --- */}
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
                        className="text-sm text-gray-700 bg-transparent flex-1 focus:outline-none"
                    />
                    <button
                        onClick={copyLink}
                        className={`flex-shrink-0 flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                            linkCopied
                            ? 'bg-green-100 text-green-700'
                            : `${CIANO_BG_CLASS} text-white ${CIANO_BG_HOVER_CLASS}`
                        }`}
                    >
                        <Icon icon={linkCopied ? Check : LinkIcon} className="w-4 h-4 mr-1.5"/>
                        {linkCopied ? "Copiado!" : "Copiar"}
                    </button>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row items-center gap-6">
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
                            disabled={loadingSalonData}
                            className={`inline-flex items-center px-4 py-2 text-sm font-semibold text-white ${CIANO_BG_CLASS} rounded-lg shadow-sm ${CIANO_BG_HOVER_CLASS} transition-colors disabled:opacity-50`}
                        >
                            <Icon icon={QrCode} className="w-4 h-4 mr-2" />
                            {loadingSalonData ? 'Carregando dados...' : 'Baixar Pôster (PNG)'}
                        </button>
                    </div>
                </div>
            </div>
            
            {/* --- <<< NOVO CARD: STATUS DA COTA DE E-MAIL >>> --- */}
            <div className="bg-white p-6 shadow-md rounded-lg border border-gray-200 max-w-2xl mx-auto">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Cota de E-mail Marketing</h3>
                {loadingSalonData ? (
                    <div className="flex justify-center py-4"><Loader2 className={`w-6 h-6 animate-spin ${CIANO_TEXT_CLASS}`} /></div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-sm font-medium text-gray-700">
                                E-mails enviados este mês:
                            </p>
                            <p className={`text-lg font-bold ${cotaUsada >= cotaTotal ? 'text-red-600' : CIANO_TEXT_CLASS}`}>
                                {cotaUsada} / {cotaTotal}
                            </p>
                        </div>
                        {/* Barra de Progresso */}
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                                className={`h-2.5 rounded-full ${cotaUsada >= cotaTotal ? 'bg-red-600' : CIANO_BG_CLASS}`} 
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

            {/* Aviso de E-mail em Massa */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg flex items-center gap-3 max-w-2xl mx-auto">
                 <Icon icon={AlertTriangle} className="w-5 h-5 flex-shrink-0"/> 
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
                    
                    {/* --- Seletor de Segmento --- */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Público-Alvo (Segmento)*</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label 
                                onClick={() => setSegmento('todos')}
                                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${segmento === 'todos' ? 'border-cyan-700 bg-cyan-50 ring-2 ring-cyan-600' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                            >
                                <Icon icon={Users} className={`w-5 h-5 mr-2 ${segmento === 'todos' ? CIANO_TEXT_CLASS : 'text-gray-500'}`} />
                                <span className="text-sm font-medium text-gray-800">Todos os Clientes</span>
                            </label>
                            
                            <label 
                                onClick={() => setSegmento('inativos')}
                                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${segmento === 'inativos' ? 'border-cyan-700 bg-cyan-50 ring-2 ring-cyan-600' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                            >
                                <Icon icon={UserX} className={`w-5 h-5 mr-2 ${segmento === 'inativos' ? CIANO_TEXT_CLASS : 'text-gray-500'}`} />
                                <span className="text-sm font-medium text-gray-800">Inativos (60d+)</span>
                            </label>

                            <label 
                                onClick={() => setSegmento('recentes')}
                                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${segmento === 'recentes' ? 'border-cyan-700 bg-cyan-50 ring-2 ring-cyan-600' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                            >
                                <Icon icon={UserCheck} className={`w-5 h-5 mr-2 ${segmento === 'recentes' ? CIANO_TEXT_CLASS : 'text-gray-500'}`} />
                                <span className="text-sm font-medium text-gray-800">Recentes (30d)</span>
                            </label>
                        </div>
                    </div>

                    {/* Campo Assunto */}
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
                    
                    {/* Campo Mensagem */}
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

                    {/* Botões */}
                    <div className="flex justify-between items-center pt-4">
                        <button
                            type="button"
                            onClick={() => setIsPreviewOpen(true)}
                            disabled={!message.trim() || !subject.trim() || loadingSalonData}
                            className="flex items-center px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            <Icon icon={Eye} className="w-5 h-5 mr-2" />
                            Pré-visualizar
                        </button>

                        <button
                            type="submit"
                            className={`flex items-center px-6 py-2.5 text-base font-semibold text-white ${CIANO_BG_CLASS} rounded-lg shadow-md ${CIANO_BG_HOVER_CLASS} transition-colors disabled:opacity-50`}
                            disabled={loading || !message.trim() || !subject.trim() || cotaUsada >= cotaTotal}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                            <Icon icon={Send} className="w-5 h-5 mr-2" />
                            {loading ? 'Disparando...' : (cotaUsada >= cotaTotal ? 'Limite Atingido' : 'Enviar para Segmento')}
                        </button>
                    </div>
                </form>
            </div>

            {/* Renderiza o Modal de Preview */}
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