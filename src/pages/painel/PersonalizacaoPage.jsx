// frontend/src/pages/painel/PersonalizacaoPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
// REMOVIDO: { useParams }
import axios from 'axios';
import { Palette, Loader2, Save, Image as ImageIcon, Link as LinkIcon, Type, AlertTriangle, Eye, Copy, Check } from 'lucide-react';
import { auth } from '@/firebaseConfig';
// IMPORTAÇÃO CRÍTICA: Use o hook do PainelLayout
import { useSalon } from './PainelLayout';
import ImageWithFallback from '@/ui/ImageWithFallback'; // Assumindo este componente existe
import BookingPagePreview from '@/components/BookingPagePreview'; // Assume que está em /components/
import toast from 'react-hot-toast';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- Definições de Cor ---
const CIANO_COLOR_TEXT = 'text-cyan-800';
const CIANO_COLOR_BG = 'bg-cyan-800';
const CIANO_COLOR_BG_HOVER = 'hover:bg-cyan-900';
const CIANO_RING_FOCUS = 'focus:ring-cyan-800';
const CIANO_BORDER_FOCUS = 'focus:border-cyan-800';
const CIANO_BG_CLASS = 'bg-cyan-800';
const CIANO_BG_HOVER_CLASS = 'hover:bg-cyan-900';

// --- Helper Ícone Simples ---
const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

function PersonalizacaoPage() {
    // NOVO: Obtém dados do contexto
    const { salaoId, salonDetails, loading: loadingContext } = useSalon();

    const [formData, setFormData] = useState({ nome_salao: '', tagline: '', url_logo: '' });
    // O loading principal é o loadingContext, 'loading' local será apenas para salvar
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [linkCopied, setLinkCopied] = useState(false);
    const copyTimeoutRef = useRef(null);

    // --- NOVO: Popula o formulário com dados do contexto ---
    useEffect(() => {
        if (salonDetails) {
            // Apenas inicializa o formData com os dados do contexto (sem fetch de API redundante)
            setFormData({
                nome_salao: salonDetails.nome_salao || '',
                tagline: salonDetails.tagline || '',
                url_logo: salonDetails.url_logo || '',
            });
        }
    }, [salonDetails]); // Dispara apenas quando os detalhes do salão carregam

    // --- handleChange (mantido) ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- handleSubmit (otimizado para usar salaoId do contexto) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        if (!formData.nome_salao.trim()) {
            setError("O nome do salão é obrigatório.");
            setIsSaving(false);
            return;
        }
        if (!salaoId || !salonDetails) {
            setError("Erro: Dados do salão não carregados.");
            setIsSaving(false);
            return;
        }

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error("Sessão expirada. Faça login novamente.");
            }
            const token = await currentUser.getIdToken();

            // 1. Prepara payload (USANDO dados ATUAIS do contexto/estado, sem GET extra)
            const payload = {
                ...salonDetails, // Preserva serviços, horários, etc., vindos do contexto
                id: salaoId,
                nome_salao: formData.nome_salao.trim(),
                tagline: formData.tagline.trim(),
                url_logo: formData.url_logo.trim() || null,
            };

            // 2. Envia o PUT
            await axios.put(`${API_BASE_URL}/admin/clientes/${salaoId}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Personalização salva com sucesso!");

            // NOTA: No app final, você deve disparar uma RECARGA do SalonProvider
            // para que o menu lateral e outras páginas vejam o novo nome do salão.
            // Aqui, por não termos a função de recarga do provider, disparamos a recarga manual (se existisse)
            // ou simplesmente confiamos que o próximo carregamento do PainelLayout pegará os novos dados.

        } catch (err) {
            let errorMsg = "Falha ao salvar personalização. Tente novamente.";
            if (err.response) {
                errorMsg = err.response.data.detail || "Falha ao salvar. Verifique os dados.";
            } else if (err.message) {
                errorMsg = err.message;
            }
            setError(errorMsg);
            toast.error(errorMsg);

        } finally {
            setIsSaving(false);
        }
    };


    // --- Função para Copiar Link (usando salaoId do contexto) ---
    const copyLink = () => {
        if (!salaoId) {
            toast.error("Aguarde o carregamento do ID do salão.");
            return;
        }

        const publicUrl = `https://horalis.app/agendar/${salaoId}`;

        if (copyTimeoutRef.current) {
            clearTimeout(copyTimeoutRef.current);
            copyTimeoutRef.current = null;
        }

        navigator.clipboard.writeText(publicUrl).then(() => {
            setLinkCopied(true);
            copyTimeoutRef.current = setTimeout(() => {
                setLinkCopied(false);
                copyTimeoutRef.current = null;
            }, 2000);

        }).catch(err => {
            toast.error('Não foi possível copiar o link.');
            setLinkCopied(false);
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
                copyTimeoutRef.current = null;
            }
        });
    };

    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []);


    // --- Renderização Loading/Error ---
    if (loadingContext || !salaoId) {
        return (
            <div className="p-6 text-center bg-white rounded-lg shadow-md border border-gray-200 min-h-[300px] flex flex-col items-center justify-center font-sans">
                <Loader2 className={`h-8 w-8 animate-spin ${CIANO_COLOR_TEXT} mb-3`} />
                <p className="text-gray-600">Carregando dados globais...</p>
            </div>
        );
    }
    if (error && !isSaving) {
        return (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg shadow border border-red-200 font-sans flex items-center gap-2">
                <Icon icon={AlertTriangle} className="w-5 h-5 flex-shrink-0" /> <p>{error}</p>
            </div>
        );
    }

    // --- Renderização Principal ---
    return (
        <div className="font-sans">
            <h2 className={`text-2xl font-bold text-gray-900 mb-6 flex items-center ${CIANO_COLOR_TEXT}`}>
                <Icon icon={Palette} className="w-6 h-6 mr-3" />
                Personalização da Página de Agendamento
            </h2>

            {error && !isSaving && (
                <div className="p-4 mb-4 bg-red-100 text-red-700 rounded-lg shadow border border-red-200 flex items-center gap-2">
                    <Icon icon={AlertTriangle} className="w-5 h-5 flex-shrink-0" /> <p>{error}</p>
                </div>
            )}

            <div className="grid lg:grid-cols-2 gap-8 items-start">
                {/* Coluna 1: Formulário */}
                <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 space-y-6">
                    <form onSubmit={handleSubmit}>
                        {/* Pré-visualização Simples */}
                        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                            {formData.url_logo ? (
                                <ImageWithFallback src={formData.url_logo} alt="Logo Preview" className="w-14 h-14 rounded-full border border-gray-200 object-cover flex-shrink-0" />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
                                    <Icon icon={ImageIcon} className="w-7 h-7" />
                                </div>
                            )}
                            <div className="flex-grow min-w-0">
                                <h3 className="text-lg font-semibold text-gray-800 truncate">{formData.nome_salao || 'Nome do Salão'}</h3>
                                <p className="text-gray-500 text-sm truncate">{formData.tagline || 'Sua tagline aqui'}</p>
                            </div>
                        </div>

                        {/* Campos */}
                        <div className="space-y-4">
                            {/* Nome Salão */}
                            <div>
                                <label htmlFor="nome_salao" className="block text-sm font-medium text-gray-700 mb-1">Nome do Salão*</label>
                                <div className="relative">
                                    <Icon icon={Type} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input name="nome_salao" id="nome_salao" type="text" value={formData.nome_salao} onChange={handleChange}
                                        className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} h-10 sm:text-sm`}
                                        disabled={isSaving} required />
                                </div>
                            </div>
                            {/* Tagline */}
                            <div>
                                <label htmlFor="tagline" className="block text-sm font-medium text-gray-700 mb-1">Tagline (Descrição Curta)</label>
                                <div className="relative">
                                    <Icon icon={LinkIcon} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input name="tagline" id="tagline" type="text" value={formData.tagline} onChange={handleChange}
                                        className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} h-10 sm:text-sm`}
                                        disabled={isSaving} placeholder="Ex: Beleza e bem-estar" />
                                </div>
                            </div>
                            {/* URL Logo */}
                            <div>
                                <label htmlFor="url_logo" className="block text-sm font-medium text-gray-700 mb-1">URL da Logo (Link da Imagem)</label>
                                <div className="relative">
                                    <Icon icon={ImageIcon} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input name="url_logo" id="url_logo" type="url" value={formData.url_logo} onChange={handleChange}
                                        className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} h-10 sm:text-sm`}
                                        disabled={isSaving} placeholder="https://exemplo.com/sua-logo.png" />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Cole o link direto da imagem (hospedada online).</p>
                            </div>
                        </div>

                        {/* Botão Salvar */}
                        <div className="flex justify-end pt-6 border-t border-gray-100 mt-6">
                            <button
                                type="submit"
                                className={`flex items-center px-6 py-2.5 ${CIANO_BG_CLASS} text-white rounded-lg shadow-sm ${CIANO_BG_HOVER_CLASS} transition-colors disabled:opacity-50`}
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin stroke-current mr-2" /> : <Icon icon={Save} className="w-5 h-5 mr-2" />}
                                {isSaving ? 'Salvando...' : 'Salvar Personalização'}
                            </button>
                        </div>
                    </form>

                    {/* --- SEÇÃO LINK PÚBLICO (MANTIDA) --- */}
                    <div className="pt-6 border-t border-gray-100 mt-6 space-y-3">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                            <Icon icon={LinkIcon} className={`w-5 h-5 mr-2 ${CIANO_COLOR_TEXT}`} />
                            Seu Link de Agendamento
                        </h3>
                        <p className="text-sm text-gray-600">
                            Compartilhe este link com seus clientes:
                        </p>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                            <input
                                type="text"
                                value={`https://horalis.app/agendar/${salaoId}`}
                                readOnly
                                className="flex-grow bg-transparent text-sm text-gray-700 focus:outline-none truncate"
                                onClick={(e) => e.target.select()}
                            />
                            {/* Botão Copiar */}
                            <button
                                type="button"
                                onClick={copyLink}
                                className={`flex-shrink-0 flex items-center justify-center px-3 py-1.5 rounded-md text-sm transition-colors duration-200 ease-in-out ${linkCopied
                                    ? 'bg-green-100 text-green-700'
                                    : `${CIANO_COLOR_BG} text-white ${CIANO_COLOR_BG_HOVER}`
                                    }`}
                                title={linkCopied ? "Link Copiado!" : "Copiar Link"}
                            >
                                {linkCopied ? (
                                    <> <Icon icon={Check} className="w-4 h-4 mr-1" /> Copiado! </>
                                ) : (
                                    <Icon icon={Copy} className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>
                    {/* --- FIM DA SEÇÃO LINK --- */}
                </div>

                {/* Coluna 2: Preview */}
                <div className="lg:sticky lg:top-24">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                        <Icon icon={Eye} className={`w-5 h-5 mr-2 ${CIANO_COLOR_TEXT}`} />
                        Pré-visualização da Página de Agendamento
                    </h3>
                    <BookingPagePreview
                        salaoId={salaoId}
                        nomeSalao={formData.nome_salao}
                        tagline={formData.tagline}
                        logoUrl={formData.url_logo}
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center">A aparência final pode variar.</p>
                </div>

            </div>
        </div>
    );
}

export default PersonalizacaoPage;