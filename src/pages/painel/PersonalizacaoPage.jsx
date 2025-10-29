// frontend/src/pages/painel/PersonalizacaoPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
// import { Card } from '@/ui/card'; // Usaremos div
import { Palette, Loader2, Save, Image, Link, Type, AlertTriangle } from 'lucide-react'; // Adicionado AlertTriangle
import { auth } from '@/firebaseConfig';
import { ImageWithFallback } from '@/ui/ImageWithFallback'; // Assume que existe

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// <<< DEFINIÇÕES DE COR >>>
const CIANO_COLOR_TEXT = 'text-cyan-600';
const CIANO_COLOR_BG = 'bg-cyan-800';
const CIANO_COLOR_BG_HOVER = 'hover:bg-cyan-700';
const CIANO_RING_FOCUS = 'focus:ring-cyan-400';
const CIANO_BORDER_FOCUS = 'focus:border-cyan-400';

// Helper Ícone Simples
const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

function PersonalizacaoPage() {
    const { salaoId } = useParams();
    // <<< ALTERADO: Estado formData simplificado >>>
    const [formData, setFormData] = useState({
        nome_salao: '',
        tagline: '',
        url_logo: '',
        // Campos de cor removidos
    });

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    // --- Lógica de Busca (GET) ---
    const fetchPersonalizacao = useCallback(async () => {
        if (!salaoId) { setError("ID do Salão inválido."); setLoading(false); return; }
        const currentUser = auth.currentUser;
        if (!currentUser) { setError("Sessão expirada."); setLoading(false); return; }
        const token = await currentUser.getIdToken();
        setLoading(true); setError(null);

        try {
            const response = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data;
            // <<< ALTERADO: Atualiza apenas os campos relevantes >>>
            setFormData({
                nome_salao: data.nome_salao || '',
                tagline: data.tagline || '',
                url_logo: data.url_logo || '',
            });
        } catch (err) {
            setError("Não foi possível carregar as configurações.");
        } finally {
            setLoading(false);
        }
    }, [salaoId]);

    useEffect(() => { fetchPersonalizacao(); }, [fetchPersonalizacao]);

    // --- Lógica de Manipulação do Formulário ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- Lógica de Salvamento (PUT) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true); setError(null);
        if (!formData.nome_salao.trim()) {
            setError("O nome do salão é obrigatório."); setIsSaving(false); return;
        }

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Sessão expirada.");
            const token = await currentUser.getIdToken();

            // Busca dados completos para preservar outros campos
            const salonResponse = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const salonData = salonResponse.data;

            // <<< ALTERADO: Payload atualiza apenas os campos deste formulário >>>
            const payload = {
                ...salonData, // Mantém dados existentes (serviços, horários, etc.)
                id: salaoId,
                // Sobrescreve apenas os campos de personalização
                nome_salao: formData.nome_salao.trim(),
                tagline: formData.tagline.trim(),
                url_logo: formData.url_logo.trim() || null, // Envia null se vazio
                // Campos de cor não são mais enviados
            };

            await axios.put(`${API_BASE_URL}/admin/clientes/${salaoId}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert("Personalização salva com sucesso!"); // Pode substituir por toast

        } catch (err) {
            setError("Falha ao salvar personalização.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Renderização ---
    if (loading) {
        return (
             // <<< ALTERADO: Card e Spinner Ciano >>>
            <div className="p-6 text-center bg-white rounded-lg shadow-md border border-gray-200 min-h-[300px] flex flex-col items-center justify-center font-sans">
                <Loader2 className={`h-8 w-8 animate-spin ${CIANO_COLOR_TEXT} mb-3`} />
                <p className="text-gray-600">Carregando personalização...</p>
            </div>
        );
    }
    if (error && !isSaving) { // Mostra erro geral apenas se não estiver salvando
        return (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg shadow border border-red-200 font-sans flex items-center gap-2">
                 <Icon icon={AlertTriangle} className="w-5 h-5 flex-shrink-0"/>
                 <p>{error}</p>
            </div>
        );
    }

    return (
        // Adicionado font-sans
        <div className="max-w-4xl mx-auto font-sans">
             {/* <<< ALTERADO: Título com Ícone Ciano >>> */}
            <h2 className={`text-2xl font-bold text-gray-900 mb-6 flex items-center ${CIANO_COLOR_TEXT}`}>
                <Icon icon={Palette} className="w-6 h-6 mr-3" />
                Personalização da Página de Agendamento
            </h2>

             {/* <<< ALTERADO: Card com bg-white, shadow-sm, border >>> */}
            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <form onSubmit={handleSubmit}>

                    {/* PRÉ-VISUALIZAÇÃO */}
                    <div className="flex flex-col items-center justify-center mb-8 pb-6 border-b border-gray-100 text-center">
                        {formData.url_logo ? (
                            <ImageWithFallback
                                src={formData.url_logo}
                                alt={formData.nome_salao || 'Logo'}
                                className="w-20 h-20 rounded-full mb-3 border-2 border-gray-200 shadow-sm object-cover" // Ajustado estilo
                            />
                        ) : (
                            // Placeholder se não houver logo
                            <div className="w-20 h-20 rounded-full mb-3 bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                                <Icon icon={Image} className="w-8 h-8"/>
                            </div>
                        )}
                        <h3 className="text-xl font-semibold text-gray-800">{formData.nome_salao || 'Nome do Salão'}</h3>
                        <p className="text-gray-500 text-sm mt-1">{formData.tagline || 'Sua descrição aqui'}</p>
                        <p className="mt-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Pré-visualização</p>
                    </div>

                    {/* CAMPOS DE TEXTO E URL */}
                    <div className="grid md:grid-cols-2 gap-6 mb-8"> {/* Aumentado mb */}
                        <div>
                            <label htmlFor="nome_salao" className="block text-sm font-medium text-gray-700 mb-1">Nome do Salão*</label>
                            <div className="relative">
                               <Icon icon={Type} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                                {/* <<< ALTERADO: Foco Ciano >>> */}
                               <input name="nome_salao" id="nome_salao" type="text" value={formData.nome_salao} onChange={handleChange}
                                      className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} h-10 sm:text-sm`} // Ajustado padding/height
                                      disabled={isSaving} required/>
                           </div>
                        </div>
                        <div>
                            <label htmlFor="tagline" className="block text-sm font-medium text-gray-700 mb-1">Tagline (Descrição Curta)</label>
                            <div className="relative">
                               <Icon icon={Link} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/> {/* Trocado para Link icon */}
                                {/* <<< ALTERADO: Foco Ciano >>> */}
                               <input name="tagline" id="tagline" type="text" value={formData.tagline} onChange={handleChange}
                                      className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} h-10 sm:text-sm`}
                                      disabled={isSaving} placeholder="Ex: Beleza e bem-estar"/>
                           </div>
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="url_logo" className="block text-sm font-medium text-gray-700 mb-1">URL da Logo (Link da Imagem)</label>
                             <div className="relative">
                                <Icon icon={Image} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                                 {/* <<< ALTERADO: Foco Ciano >>> */}
                                <input name="url_logo" id="url_logo" type="url" value={formData.url_logo} onChange={handleChange}
                                       className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} h-10 sm:text-sm`}
                                       disabled={isSaving} placeholder="https://exemplo.com/sua-logo.png"/>
                           </div>
                           <p className="text-xs text-gray-500 mt-1">Cole o link direto da imagem (hospedada online).</p>
                        </div>
                    </div>

                    {/* <<< REMOVIDO: Seção de Seletores de Cor >>> */}

                    {/* Erro Geral (mostrado antes do botão) */}
                    {error && !isSaving && <p className="text-sm text-red-600 mb-4 text-center">{error}</p>}

                    {/* Botão Salvar */}
                    <div className="flex justify-end pt-6 border-t border-gray-100">
                        <button
                            type="submit"
                             // <<< ALTERADO: Botão Ciano >>>
                            className={`flex items-center px-6 py-2.5 ${CIANO_COLOR_BG} text-white rounded-lg shadow-sm ${CIANO_COLOR_BG_HOVER} transition-colors disabled:opacity-50`}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin stroke-current mr-2" />
                            ) : (
                                <Icon icon={Save} className="w-5 h-5 mr-2" />
                            )}
                            {isSaving ? 'Salvando...' : 'Salvar Personalização'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default PersonalizacaoPage;