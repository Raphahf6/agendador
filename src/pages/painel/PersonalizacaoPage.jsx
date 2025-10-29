// frontend/src/pages/painel/PersonalizacaoPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'; // Importado useRef
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Palette, Loader2, Save, Image, Link as LinkIcon, Type, AlertTriangle, Eye, Copy, Check } from 'lucide-react'; // Importado Copy, Check, LinkIcon
import { auth } from '@/firebaseConfig';
import { ImageWithFallback } from '@/ui/ImageWithFallback'; // Assume que existe
import BookingPagePreview from '@/components/BookingPagePreview'; // Assume que existe

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// Definições de Cor
const CIANO_COLOR_TEXT = 'text-cyan-600';
const CIANO_COLOR_BG = 'bg-cyan-600';
const CIANO_COLOR_BG_HOVER = 'hover:bg-cyan-700';
const CIANO_RING_FOCUS = 'focus:ring-cyan-400';
const CIANO_BORDER_FOCUS = 'focus:border-cyan-400';

// Helper Ícone Simples
const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

function PersonalizacaoPage() {
    const { salaoId } = useParams();
    const [formData, setFormData] = useState({ nome_salao: '', tagline: '', url_logo: '' });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [linkCopied, setLinkCopied] = useState(false); // Estado para feedback de cópia
    const copyTimeoutRef = useRef(null); // Ref para o timeout

    // fetchPersonalizacao (sem alterações funcionais)
    const fetchPersonalizacao = useCallback(async () => {
        // ... (lógica fetch existente) ...
        if (!salaoId) { setError("ID do Salão inválido."); setLoading(false); return; }
        const currentUser = auth.currentUser;
        if (!currentUser) { setError("Sessão expirada."); setLoading(false); return; }
        const token = await currentUser.getIdToken();
        setLoading(true); setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, { headers: { Authorization: `Bearer ${token}` } });
            const data = response.data;
            setFormData({ nome_salao: data.nome_salao || '', tagline: data.tagline || '', url_logo: data.url_logo || '' });
        } catch (err) { setError("Não foi possível carregar as configurações."); }
        finally { setLoading(false); }
    }, [salaoId]);

    useEffect(() => { fetchPersonalizacao(); }, [fetchPersonalizacao]);

    // handleChange (sem alterações)
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
     };

    // handleSubmit (sem alterações funcionais)
    const handleSubmit = async (e) => {
        // ... (lógica submit existente) ...
         e.preventDefault();
         setIsSaving(true); setError(null);
         if (!formData.nome_salao.trim()) { setError("O nome do salão é obrigatório."); setIsSaving(false); return; }
         try {
             const currentUser = auth.currentUser; if (!currentUser) throw new Error("Sessão expirada.");
             const token = await currentUser.getIdToken();
             const salonResponse = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, { headers: { Authorization: `Bearer ${token}` } });
             const salonData = salonResponse.data;
             const payload = {
                 ...salonData, id: salaoId,
                 nome_salao: formData.nome_salao.trim(),
                 tagline: formData.tagline.trim(),
                 url_logo: formData.url_logo.trim() || null,
             };
             await axios.put(`${API_BASE_URL}/admin/clientes/${salaoId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
             alert("Personalização salva com sucesso!");
         } catch (err) { setError("Falha ao salvar personalização.");
         } finally { setIsSaving(false); }
    };

    // --- Função para Copiar Link (CORRIGIDA COM LOGS) ---
    const copyLink = () => {
        console.log("copyLink chamada. Estado linkCopied:", linkCopied); // Log 1

        // <<< CONFIRME ESTA URL BASE >>>
        const publicUrl = `https://horalis.app/agendar/${salaoId}`;

        // Limpa timeout anterior se existir
        if (copyTimeoutRef.current) {
            console.log("Limpando timeout anterior:", copyTimeoutRef.current); // Log 2
            clearTimeout(copyTimeoutRef.current);
            copyTimeoutRef.current = null;
        }

        // Tenta copiar
        navigator.clipboard.writeText(publicUrl).then(() => {
            console.log("Copiado com sucesso! Definindo linkCopied = true"); // Log 3
            setLinkCopied(true);

            // Define timeout para resetar
            copyTimeoutRef.current = setTimeout(() => {
                console.log("Timeout executado. Definindo linkCopied = false"); // Log 4
                setLinkCopied(false);
                copyTimeoutRef.current = null;
            }, 2000); // 2 segundos

        }).catch(err => {
            console.error('Erro ao copiar link:', err); // Log 5 (Erro detalhado)
            alert('Não foi possível copiar o link. Verifique as permissões do navegador.'); // Alert
            // <<< ADICIONADO: Reseta o estado em caso de erro >>>
            setLinkCopied(false);
            if (copyTimeoutRef.current) { // Limpeza extra em caso de erro
               clearTimeout(copyTimeoutRef.current);
               copyTimeoutRef.current = null;
            }
        });
    };

    // useEffect de Cleanup para o timeout (sem alterações)
    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []); // Roda só no mount/unmount


    // --- Renderização Loading/Error (sem alterações) ---
    if (loading) {
        return (
            <div className="p-6 text-center bg-white rounded-lg shadow-md border border-gray-200 min-h-[300px] flex flex-col items-center justify-center font-sans">
                <Loader2 className={`h-8 w-8 animate-spin ${CIANO_COLOR_TEXT} mb-3`} />
                <p className="text-gray-600">Carregando personalização...</p>
            </div>
        );
     }
    if (error && !isSaving) {
        return (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg shadow border border-red-200 font-sans flex items-center gap-2">
                 <Icon icon={AlertTriangle} className="w-5 h-5 flex-shrink-0"/> <p>{error}</p>
            </div>
        );
    }

    // --- Renderização Principal ---
    return (
        <div className="font-sans">
            {/* Título */}
            <h2 className={`text-2xl font-bold text-gray-900 mb-6 flex items-center ${CIANO_COLOR_TEXT}`}>
                <Icon icon={Palette} className="w-6 h-6 mr-3" />
                Personalização da Página de Agendamento
            </h2>

            <div className="grid lg:grid-cols-2 gap-8 items-start">

                {/* Coluna 1: Formulário */}
                <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 space-y-6">
                    <form onSubmit={handleSubmit}>
                        {/* Pré-visualização Simples */}
                        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                             {formData.url_logo ? (
                                <ImageWithFallback src={formData.url_logo} alt="Logo Preview" className="w-14 h-14 rounded-full border border-gray-200 object-cover flex-shrink-0"/>
                             ) : (
                                <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0"> <Icon icon={Image} className="w-7 h-7"/> </div>
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
                                    <Icon icon={Type} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                                    <input name="nome_salao" id="nome_salao" type="text" value={formData.nome_salao} onChange={handleChange} className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} h-10 sm:text-sm`} disabled={isSaving} required/>
                                </div>
                            </div>
                            {/* Tagline */}
                            <div>
                                <label htmlFor="tagline" className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
                                <div className="relative">
                                   <Icon icon={LinkIcon} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                                   <input name="tagline" id="tagline" type="text" value={formData.tagline} onChange={handleChange} className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} h-10 sm:text-sm`} disabled={isSaving} placeholder="Ex: Beleza e bem-estar"/>
                               </div>
                            </div>
                            {/* URL Logo */}
                            <div>
                                <label htmlFor="url_logo" className="block text-sm font-medium text-gray-700 mb-1">URL da Logo</label>
                                <div className="relative">
                                    <Icon icon={Image} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                                    <input name="url_logo" id="url_logo" type="url" value={formData.url_logo} onChange={handleChange} className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} h-10 sm:text-sm`} disabled={isSaving} placeholder="https://exemplo.com/sua-logo.png"/>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Cole o link direto da imagem (hospedada online).</p>
                            </div>
                        </div>

                        {/* Erro Geral */}
                        {error && !isSaving && <p className="text-sm text-red-600 mt-4 text-center">{error}</p>}

                        {/* Botão Salvar */}
                      
                    </form>

                    {/* --- SEÇÃO LINK PÚBLICO (COM BOTÃO CORRIGIDO) --- */}
                    <div className="pt-6 border-t border-gray-100 mt-6 space-y-3">
                         <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                            <Icon icon={LinkIcon} className={`w-5 h-5 mr-2 ${CIANO_COLOR_TEXT}`}/>
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
                                // Adiciona onClick para selecionar o texto ao clicar no input (opcional)
                                onClick={(e) => e.target.select()}
                            />
                            {/* Botão Copiar (CORRIGIDO) */}
                            <button
                                type="button"
                                onClick={copyLink} // Chama a função corrigida
                                className={`flex-shrink-0 flex items-center justify-center px-3 py-1.5 rounded-md text-sm transition-colors duration-200 ease-in-out ${
                                    linkCopied
                                    ? 'bg-green-100 text-green-700' // Estado Copiado
                                    : `${CIANO_COLOR_BG} text-white ${CIANO_COLOR_BG_HOVER}` // Estado Normal
                                }`}
                                title={linkCopied ? "Link Copiado!" : "Copiar Link"}
                            >
                                {linkCopied ? (
                                    <> <Icon icon={Check} className="w-4 h-4 mr-1"/> Copiado! </>
                                ) : (
                                     <Icon icon={Copy} className="w-4 h-4"/>
                                )}
                            </button>
                         </div>
                    </div>
                    {/* --- FIM DA SEÇÃO LINK --- */}
                      <div className="flex justify-end pt-6 border-t border-gray-100 mt-6">
                            <button
                                type="submit"
                                className={`flex items-center px-6 py-2.5 ${CIANO_COLOR_BG} text-white rounded-lg shadow-sm ${CIANO_COLOR_BG_HOVER} transition-colors disabled:opacity-50`}
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin stroke-current mr-2" /> : <Icon icon={Save} className="w-5 h-5 mr-2" />}
                                {isSaving ? 'Salvando...' : 'Salvar Personalização'}
                            </button>
                        </div>
                </div>

                {/* Coluna 2: Preview */}
                <div className="lg:sticky lg:top-24">
                     <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                        <Icon icon={Eye} className={`w-5 h-5 mr-2 ${CIANO_COLOR_TEXT}`}/>
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