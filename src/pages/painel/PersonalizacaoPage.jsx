import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Palette, Loader2, Save, Image as ImageIcon, Link as LinkIcon, Type,
    AlertTriangle, Eye, Copy, Check, Feather, MapPin, Phone, Instagram,
    Facebook, CreditCard, Wifi, Car, Coffee, PawPrint, Info, Plus, Trash2, Baby
} from 'lucide-react';
import { auth } from '@/firebaseConfig';
import { useSalon } from './PainelLayout';
import ImageWithFallback from '@/ui/ImageWithFallback';
import BookingPagePreview from '@/components/BookingPagePreview';
import toast from 'react-hot-toast';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// Estilos
const CIANO_COLOR_TEXT = 'text-cyan-800';
const CIANO_BG_CLASS = 'bg-cyan-800';
const CIANO_BG_HOVER_CLASS = 'hover:bg-cyan-900';
const CARD_CLASS = "p-6 bg-white rounded-xl shadow-sm border border-gray-200 mb-6";
const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";
const INPUT_CLASS = "w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-800 focus:border-cyan-800 text-sm";
const SIMPLE_INPUT_CLASS = "w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-800 outline-none text-sm";

// 🌟 NOVOS ESTILOS para inputs com prefixo (Redes Sociais)
const PREFIX_INPUT_CONTAINER = "flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-cyan-800 focus-within:border-cyan-800 transition-all";
const PREFIX_LABEL = "bg-gray-50 text-gray-500 px-3 py-2 border-r border-gray-300 text-sm whitespace-nowrap";
const PREFIX_INPUT = "flex-1 p-2 outline-none text-sm text-gray-800 placeholder-gray-400";


const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

const amenitiesOptions = [
    { key: 'Wifi', label: 'Wi-Fi Grátis', icon: Wifi },
    { key: 'Estacionamento', label: 'Estacionamento', icon: Car },
    { key: 'Cafe/Bebidas', label: 'Café/Bebidas', icon: Coffee },
    { key: 'Atende Criancas', label: 'Aceita Crianças', icon: Baby },
];

// 🌟 NOVO HELPER: Extrai o nome de usuário da URL completa
const extractUsername = (url, domain) => {
    if (!url || !url.includes(domain)) return ''; // Retorna vazio se não for a URL esperada
    
    // Tenta extrair o que vem depois de ".com/"
    let username = url.split(domain + '/')[1] || '';
    
    // Remove barras no final
    if (username.endsWith('/')) {
        username = username.slice(0, -1);
    }
    // Remove o @ se o usuário salvou com @
    return username.replace('@', '');
};


function PersonalizacaoPage() {
    const { salaoId, salonDetails, loading: loadingContext } = useSalon();
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [linkCopied, setLinkCopied] = useState(false);
    const copyTimeoutRef = useRef(null);

    // Estado Unificado do Formulário
    const [formData, setFormData] = useState({
        nome_salao: '', tagline: '', url_logo: '',
        primary_color: '#0E7490', secondary_color: '#FFFFFF',
        email_footer_message: 'Powered by Horalis',
        telefone: '', endereco_completo: '',
        formas_pagamento: '',
        redes_sociais: { instagram: '', facebook: '' }, // Inicia vazio
        comodidades: {},
        fotos_carousel: []
    });

    const [newPhotoUrl, setNewPhotoUrl] = useState('');

    // Carregar dados do contexto
    useEffect(() => {
        if (salonDetails) {
            // 🌟 ATUALIZADO: Extrai o nome de usuário das URLs salvas no DB
            const instaUser = extractUsername(salonDetails.redes_sociais?.instagram, 'instagram.com');
            const faceUser = extractUsername(salonDetails.redes_sociais?.facebook, 'facebook.com');

            setFormData(prev => ({
                ...prev,
                nome_salao: salonDetails.nome_salao || '',
                tagline: salonDetails.tagline || '',
                url_logo: salonDetails.url_logo || '',
                primary_color: salonDetails.cor_primaria || '#0E7490',
                secondary_color: salonDetails.cor_secundaria || '#FFFFFF',
                email_footer_message: salonDetails.email_footer_message || 'Powered by Horalis',
                telefone: salonDetails.telefone || '',
                endereco_completo: salonDetails.endereco_completo || '',
                formas_pagamento: salonDetails.formas_pagamento || '',
                // Seta o formulário apenas com o nome de usuário
                redes_sociais: { 
                    instagram: instaUser, 
                    facebook: faceUser 
                },
                comodidades: salonDetails.comodidades || {},
                fotos_carousel: salonDetails.fotos_carousel || [],
            }));
        }
    }, [salonDetails]);

    // --- Handlers (Mantidos) ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSocialChange = (e) => {
        const { name, value } = e.target;
        // Remove espaços e o @
        const cleanedValue = value.replace(/\s/g, '').replace('@', '');
        
        setFormData(prev => ({
            ...prev,
            redes_sociais: { ...prev.redes_sociais, [name]: cleanedValue }
        }));
    };

    const toggleAmenity = (key) => {
        setFormData(prev => ({
            ...prev,
            comodidades: { ...prev.comodidades, [key]: !prev.comodidades[key] }
        }));
    };

    const handleAddPhoto = () => {
        if (!newPhotoUrl.trim()) return toast.error("Cole a URL da imagem.");
        setFormData(prev => ({
            ...prev,
            fotos_carousel: [...prev.fotos_carousel, { url: newPhotoUrl, alt: 'Foto do Salão' }]
        }));
        setNewPhotoUrl('');
        toast.success("Foto adicionada!");
    };

    const handleRemovePhoto = (index) => {
        const newPhotos = [...formData.fotos_carousel];
        newPhotos.splice(index, 1);
        setFormData(prev => ({ ...prev, fotos_carousel: newPhotos }));
    };

    // --- handleSubmit (Atualizado) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        if (!formData.nome_salao.trim()) {
            setError("O nome do salão é obrigatório.");
            setIsSaving(false);
            return;
        }

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Sessão expirada.");
            const token = await currentUser.getIdToken();
            
            // 🌟 ATUALIZADO: Reconstrói a URL completa antes de salvar
            const instaUser = formData.redes_sociais.instagram.trim();
            const faceUser = formData.redes_sociais.facebook.trim();

            const payload = {
                ...salonDetails,
                id: salaoId,
                ...formData, 
                cor_primaria: formData.primary_color,
                cor_secundaria: formData.secondary_color,
                // Reconstrói o objeto redes_sociais com URLs completas
                redes_sociais: {
                    instagram: instaUser ? `https://www.instagram.com/${instaUser}` : '',
                    facebook: faceUser ? `https://www.facebook.com/${faceUser}` : ''
                }
            };

            await axios.put(`${API_BASE_URL}/admin/clientes/${salaoId}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Configurações salvas com sucesso!");
        } catch (err) {
            const errorMsg = err.response?.data?.detail || err.message || "Falha ao salvar.";
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsSaving(false);
        }
    };

    const copyLink = () => {
        const publicUrl = `https://horalis.app/agendar/${salaoId}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(publicUrl).then(() => {
                setLinkCopied(true);
                copyTimeoutRef.current = setTimeout(() => setLinkCopied(false), 2000);
            });
        } else {
            toast.error('Copie manualmente.');
        }
    };

    if (loadingContext || !salaoId) {
        return <div className="p-6 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-800" /></div>;
    }

    return (
        <div className="font-sans pb-20">
            <h2 className={`text-2xl font-bold text-gray-900 mb-6 flex items-center ${CIANO_COLOR_TEXT}`}>
                <Icon icon={Palette} className="w-6 h-6 mr-3" />
                Configuração do Microsite
            </h2>

            {error && !isSaving && (
                <div className="p-4 mb-4 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
                    <Icon icon={AlertTriangle} className="w-5 h-5 flex-shrink-0" /> <p>{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                {/* --- COLUNA 1: FORMULÁRIO --- */}
                <div className="order-2 lg:order-1">
                    <form onSubmit={handleSubmit}>

                        {/* CARD 1: Identidade Visual (Mantido) */}
                        <div className={CARD_CLASS}>
                            {/* ... (Campos Nome, Tagline, Logo, Cor) ... */}
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Icon icon={Type} className="w-5 h-5 text-cyan-600"/> Identidade Visual</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className={LABEL_CLASS}>Nome do Salão*</label>
                                    <div className="relative">
                                        <Icon icon={Type} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input name="nome_salao" value={formData.nome_salao} onChange={handleChange} className={INPUT_CLASS} disabled={isSaving} required />
                                    </div>
                                </div>
                                <div>
                                    <label className={LABEL_CLASS}>Tagline (Slogan)</label>
                                    <div className="relative">
                                        <Icon icon={Feather} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input name="tagline" value={formData.tagline} onChange={handleChange} className={INPUT_CLASS} disabled={isSaving} placeholder="Ex: Beleza e bem-estar" />
                                    </div>
                                </div>
                                <div>
                                    <label className={LABEL_CLASS}>URL da Logo</label>
                                    <div className="relative">
                                        <Icon icon={ImageIcon} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input name="url_logo" value={formData.url_logo} onChange={handleChange} className={INPUT_CLASS} disabled={isSaving} placeholder="https://..." />
                                    </div>
                                </div>
                                <div>
                                    <label className={LABEL_CLASS}>Cor Primária</label>
                                    <div className="flex items-center gap-2">
                                        <input type="color" name="primary_color" value={formData.primary_color} onChange={handleChange} className="w-10 h-10 rounded cursor-pointer border-0" />
                                        <input name="primary_color" value={formData.primary_color} onChange={handleChange} className={SIMPLE_INPUT_CLASS} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CARD 2: Localização e Contato (Redes Sociais Atualizadas) */}
                        <div className={CARD_CLASS}>
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Icon icon={MapPin} className="w-5 h-5 text-cyan-600" /> Localização & Contato</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className={LABEL_CLASS}>Endereço Completo</label>
                                    <div className="relative">
                                        <Icon icon={MapPin} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input name="endereco_completo" value={formData.endereco_completo} onChange={handleChange} className={INPUT_CLASS} placeholder="Rua, Número, Bairro, Cidade" />
                                    </div>
                                </div>
                                <div>
                                    <label className={LABEL_CLASS}>WhatsApp / Telefone</label>
                                    <div className="relative">
                                        <Icon icon={Phone} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input name="telefone" value={formData.telefone} onChange={handleChange} className={INPUT_CLASS} placeholder="(XX) XXXXX-XXXX" />
                                    </div>
                                </div>
                                
                                {/* 🌟 ATUALIZADO: Campos de Redes Sociais com Prefixo */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={LABEL_CLASS}><Instagram className="w-4 h-4 inline mr-1"/> Instagram</label>
                                        <div className={PREFIX_INPUT_CONTAINER}>
                                            <span className={PREFIX_LABEL}>@</span>
                                            <input 
                                                name="instagram" 
                                                value={formData.redes_sociais.instagram} 
                                                onChange={handleSocialChange} 
                                                className={PREFIX_INPUT} 
                                                placeholder="seusalao" 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}><Facebook className="w-4 h-4 inline mr-1"/> Facebook</label>
                                        <div className={PREFIX_INPUT_CONTAINER}>
                                            <span className={PREFIX_LABEL}>fb.com/</span>
                                            <input 
                                                name="facebook" 
                                                value={formData.redes_sociais.facebook} 
                                                onChange={handleSocialChange} 
                                                className={PREFIX_INPUT} 
                                                placeholder="seusalao" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CARD 3: Detalhes do Espaço (Mantido) */}
                        <div className={CARD_CLASS}>
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Icon icon={Info} className="w-5 h-5 text-cyan-600" /> Detalhes do Espaço</h3>
                            <div className="mb-4">
                                <label className={LABEL_CLASS}>Formas de Pagamento</label>
                                <div className="relative">
                                    <Icon icon={CreditCard} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input name="formas_pagamento" value={formData.formas_pagamento} onChange={handleChange} className={INPUT_CLASS} placeholder="Ex: Pix, Cartão, Dinheiro" />
                                </div>
                            </div>
                            <label className={LABEL_CLASS}>Comodidades</label>
                            <div className="grid grid-cols-2 gap-2">
                                {amenitiesOptions.map((item) => (
                                    <div
                                        key={item.key}
                                        onClick={() => toggleAmenity(item.key)}
                                        className={`cursor-pointer flex items-center p-2 rounded-lg border transition-all ${formData.comodidades[item.key] ? 'bg-cyan-50 border-cyan-500 text-cyan-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        <item.icon className={`w-4 h-4 mr-2 ${formData.comodidades[item.key] ? 'text-cyan-600' : 'text-gray-400'}`} />
                                        <span className="text-sm">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CARD 4: Galeria de Fotos (Mantido) */}
                        <div className={CARD_CLASS}>
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Icon icon={ImageIcon} className="w-5 h-5 text-cyan-600" /> Galeria de Fotos</h3>
                            <div className="flex gap-2 mb-4">
                                <input value={newPhotoUrl} onChange={(e) => setNewPhotoUrl(e.target.value)} className={SIMPLE_INPUT_CLASS} placeholder="URL da imagem (https://...)" />
                                <button type="button" onClick={handleAddPhoto} className="bg-gray-100 text-gray-700 px-3 rounded-lg hover:bg-gray-200 border border-gray-300"><Plus className="w-5 h-5" /></button>
                            </div>
                            {formData.fotos_carousel.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2">
                                    {formData.fotos_carousel.map((foto, index) => (
                                        <div key={index} className="relative group aspect-video bg-gray-100 rounded overflow-hidden">
                                            <img src={foto.url} alt="Preview" className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => handleRemovePhoto(index)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-sm text-gray-400 text-center py-4 border border-dashed rounded-lg">Sem fotos.</p>}
                        </div>

                        {/* Botão Salvar (Mantido) */}
                        <div className="sticky bottom-4 z-10">
                            <button
                                type="submit"
                                className={`flex items-center w-full justify-center px-6 py-3 ${CIANO_BG_CLASS} text-white rounded-lg shadow-lg ${CIANO_BG_HOVER_CLASS} transition-all disabled:opacity-50 font-bold`}
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </form>

                    {/* Link Público (Mantido) */}
                    <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center"><Icon icon={LinkIcon} className="w-4 h-4 mr-2"/> Link de Agendamento</h3>
                        <div className="flex gap-2">
                            <input value={`https://horalis.app/agendar/${salaoId}`} readOnly className="flex-grow bg-white border border-gray-300 rounded p-2 text-sm text-gray-600" />
                            <button onClick={copyLink} className={`px-3 py-2 rounded text-white text-sm ${linkCopied ? 'bg-green-600' : CIANO_BG_CLASS}`}>{linkCopied ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}</button>
                        </div>
                    </div>
                </div>

                {/* --- COLUNA 2: PREVIEW (Mantida) --- */}
                <div className="order-1 lg:order-2 lg:sticky lg:top-8">
                    <div className="bg-gray-100 p-4 rounded-2xl border-4 border-gray-200 shadow-inner">
                        <h3 className="text-center text-gray-500 font-medium mb-2 text-sm">Pré-visualização (Ao Vivo)</h3>
                        <div className="bg-white rounded-xl overflow-hidden shadow-lg h-[600px] overflow-y-auto custom-scrollbar border border-gray-200">
                            <BookingPagePreview
                                salaoId={salaoId}
                                nomeSalao={formData.nome_salao}
                                tagline={formData.tagline}
                                logoUrl={formData.url_logo}
                                primaryColor={formData.primary_color}
                                emailFooter={formData.email_footer_message}
                                telefone={formData.telefone}
                                endereco={formData.endereco_completo}
                                fotos={formData.fotos_carousel}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PersonalizacaoPage;