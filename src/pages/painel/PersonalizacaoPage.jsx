import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    Palette, Loader2, Save, Image as ImageIcon, Link as LinkIcon, Type, 
    AlertTriangle, Copy, Check, Feather, MapPin, Phone, Instagram, 
    Facebook, CreditCard, Wifi, Car, Coffee, PawPrint, Info, Plus, Trash2, Baby, Eye, X 
} from 'lucide-react';
import { auth } from '@/firebaseConfig';
import { useSalon } from './PainelLayout';
import ImageWithFallback from '@/ui/ImageWithFallback';
import BookingPagePreview from '@/components/BookingPagePreview'; 
import toast from 'react-hot-toast';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- ESTILOS PREMIUM (RESTAURADOS) ---
const CIANO_COLOR_TEXT = 'text-cyan-800';
const CIANO_BG_CLASS = 'bg-cyan-800';
const CIANO_BG_HOVER_CLASS = 'hover:bg-cyan-900';

// Cards e Inputs Premium
const CARD_CLASS = "bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 mb-8 transition-all hover:shadow-md";
const SECTION_TITLE = "text-lg font-bold text-gray-900 mb-6 flex items-center gap-3 pb-4 border-b border-gray-50";
const LABEL_CLASS = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1";

const INPUT_CONTAINER = "relative group";
const INPUT_ICON = "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-cyan-600 transition-colors";
const INPUT_FIELD = "w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-cyan-500/20 focus:bg-white transition-all duration-200 placeholder:text-gray-400";

// Inputs Sociais Premium
const SOCIAL_INPUT_WRAPPER = "flex items-center bg-gray-50 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-cyan-500/20 focus-within:bg-white transition-all";
const SOCIAL_PREFIX = "pl-4 pr-2 text-gray-400 font-medium select-none text-sm";
const SOCIAL_INPUT = "w-full py-3.5 bg-transparent border-none outline-none font-medium text-gray-900 placeholder:text-gray-400";

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

const amenitiesOptions = [
    { key: 'Wi-Fi', label: 'Wi-Fi Grátis', icon: Wifi },
    { key: 'Estacionamento', label: 'Estacionamento', icon: Car },
    { key: 'Café/Bebidas', label: 'Café/Bebidas', icon: Coffee },
    { key: 'Atende Crianças', label: 'Atende Crianças', icon: Baby },
];

// Helper de URL
const extractUsername = (url, domain) => {
    if (!url || typeof url !== 'string') return '';
    if (!url.includes(domain)) return url.replace('@', '');
    let clean = url.replace(`https://${domain}/`, '').replace(`https://www.${domain}/`, '').replace(`http://${domain}/`, '');
    if (clean.endsWith('/')) clean = clean.slice(0, -1);
    return clean.replace('@', '');
};

export default function PersonalizacaoPage() {
    const { salaoId, salonDetails, loading: loadingContext } = useSalon();
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [linkCopied, setLinkCopied] = useState(false);
    const copyTimeoutRef = useRef(null);
    
    // Estado para controlar o Modal de Preview no Mobile
    const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

    const [formData, setFormData] = useState({
        nome_salao: '', tagline: '', url_logo: '',
        primary_color: '#0E7490', secondary_color: '#FFFFFF',
        email_footer_message: 'Powered by Horalis',
        telefone: '', endereco_completo: '',
        formas_pagamento: '',
        redes_sociais: { instagram: '', facebook: '' },
        comodidades: {},
        fotos_carousel: []
    });
    
    const [newPhotoUrl, setNewPhotoUrl] = useState('');

    // Carregar dados
    useEffect(() => {
        if (salonDetails) {
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
                redes_sociais: { instagram: instaUser, facebook: faceUser },
                comodidades: salonDetails.comodidades || {},
                fotos_carousel: salonDetails.fotos_carousel || [],
            }));
        }
    }, [salonDetails]);

    // Handlers
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSocialChange = (e) => {
        const { name, value } = e.target;
        const cleanedValue = value.replace(/\s/g, '').replace('@', '').replace('https://', '');
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

            const instaUser = formData.redes_sociais.instagram.trim();
            const faceUser = formData.redes_sociais.facebook.trim();

            const payload = {
                ...salonDetails,
                id: salaoId,
                ...formData,
                cor_primaria: formData.primary_color,
                cor_secundaria: formData.secondary_color,
                redes_sociais: {
                    instagram: instaUser ? `https://instagram.com/${instaUser}` : '',
                    facebook: faceUser ? `https://facebook.com/${faceUser}` : ''
                }
            };

            await axios.put(`${API_BASE_URL}/admin/clientes/${salaoId}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Salvo com sucesso!");
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
        navigator.clipboard.writeText(publicUrl).then(() => {
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
            toast.success("Link copiado!");
        });
    };

    if (loadingContext || !salaoId) return <div className="h-96 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-cyan-800"/></div>;

    return (
        <div className="font-sans pb-32 max-w-[1600px] mx-auto"> {/* Max width maior para acomodar o preview */}
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                            <Palette className="w-6 h-6 text-cyan-600" />
                        </div>
                        Personalizar Microsite
                    </h1>
                    <p className="text-gray-500 mt-1 ml-12 text-sm">Edite a aparência e informações da sua página de agendamento.</p>
                </div>
                
                {/* Botão Salvar (Topo Desktop) */}
                <button 
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="hidden md:flex items-center gap-2 px-8 py-3 bg-cyan-600 text-white rounded-xl font-bold shadow-lg shadow-cyan-200 hover:bg-cyan-700 transition-all transform hover:-translate-y-0.5 disabled:opacity-70"
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>

            {error && (
                <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-2">
                    <Icon icon={AlertTriangle} className="w-5 h-5 flex-shrink-0" /> <p>{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                
                {/* --- COLUNA 1: FORMULÁRIO (Ocupa 7/12 no desktop) --- */}
                <div className="lg:col-span-7 space-y-8">
                    
                    {/* 1. Identidade Visual */}
                    <div className={CARD_CLASS}>
                        <h3 className={SECTION_TITLE}><Icon icon={Type} className="w-5 h-5 text-cyan-600"/> Identidade Visual</h3>
                        <div className="space-y-5">
                            <div className={INPUT_CONTAINER}>
                                <label className={LABEL_CLASS}>Nome do Estabelecimento</label>
                                <Icon icon={Type} className={INPUT_ICON} />
                                <input name="nome_salao" value={formData.nome_salao || ''} onChange={handleChange} className={INPUT_FIELD} placeholder="Ex: Studio Horalis" />
                            </div>
                            <div className={INPUT_CONTAINER}>
                                <label className={LABEL_CLASS}>Slogan (Tagline)</label>
                                <Icon icon={Feather} className={INPUT_ICON} />
                                <input name="tagline" value={formData.tagline || ''} onChange={handleChange} className={INPUT_FIELD} placeholder="Ex: Onde a beleza acontece" />
                            </div>
                            
                            <div>
                                <label className={LABEL_CLASS}>Cor da Marca</label>
                                <div className="flex items-center gap-3 mt-1 bg-gray-50 p-2 rounded-xl border border-gray-100 w-full sm:w-auto">
                                    <input type="color" name="primary_color" value={formData.primary_color || '#0E7490'} onChange={handleChange} className="w-12 h-12 rounded-lg cursor-pointer border-none p-0 bg-transparent" />
                                    <span className="font-mono text-sm text-gray-600 pr-2">{formData.primary_color}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Localização e Contato */}
                    <div className={CARD_CLASS}>
                        <h3 className={SECTION_TITLE}><Icon icon={MapPin} className="w-5 h-5 text-cyan-600"/> Localização & Contato</h3>
                        <div className="space-y-5">
                            <div className={INPUT_CONTAINER}>
                                <label className={LABEL_CLASS}>Endereço Completo</label>
                                <Icon icon={MapPin} className={INPUT_ICON} />
                                <input name="endereco_completo" value={formData.endereco_completo || ''} onChange={handleChange} className={INPUT_FIELD} placeholder="Rua, Número, Bairro, Cidade" />
                            </div>
                            <div className={INPUT_CONTAINER}>
                                <label className={LABEL_CLASS}>WhatsApp / Telefone</label>
                                <Icon icon={Phone} className={INPUT_ICON} />
                                <input name="telefone" value={formData.telefone || ''} onChange={handleChange} className={INPUT_FIELD} placeholder="(XX) 99999-9999" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={LABEL_CLASS}>Instagram</label>
                                    <div className={SOCIAL_INPUT_WRAPPER}>
                                        <span className={SOCIAL_PREFIX}>@</span>
                                        <input name="instagram" value={formData.redes_sociais.instagram || ''} onChange={handleSocialChange} className={SOCIAL_INPUT} placeholder="seusalao" />
                                    </div>
                                </div>
                                <div>
                                    <label className={LABEL_CLASS}>Facebook</label>
                                    <div className={SOCIAL_INPUT_WRAPPER}>
                                        <span className={SOCIAL_PREFIX}>fb.com/</span>
                                        <input name="facebook" value={formData.redes_sociais.facebook || ''} onChange={handleSocialChange} className={SOCIAL_INPUT} placeholder="pagina" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Detalhes do Espaço */}
                    <div className={CARD_CLASS}>
                        <h3 className={SECTION_TITLE}><Icon icon={Info} className="w-5 h-5 text-cyan-600"/> Detalhes do Espaço</h3>
                        <div className="mb-6">
                            <div className={INPUT_CONTAINER}>
                                <label className={LABEL_CLASS}>Formas de Pagamento</label>
                                <Icon icon={CreditCard} className={INPUT_ICON} />
                                <input name="formas_pagamento" value={formData.formas_pagamento || ''} onChange={handleChange} className={INPUT_FIELD} placeholder="Ex: Pix, Cartão, Dinheiro" />
                            </div>
                        </div>
                        <label className={LABEL_CLASS}>Comodidades</label>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            {amenitiesOptions.map((item) => (
                                <div 
                                    key={item.key}
                                    onClick={() => toggleAmenity(item.key)}
                                    className={`cursor-pointer flex items-center p-3 rounded-xl border transition-all duration-200 ${formData.comodidades[item.key] ? 'bg-cyan-50 border-cyan-500 text-cyan-800 shadow-sm' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'}`}
                                >
                                    <item.icon className={`w-5 h-5 mr-3 ${formData.comodidades[item.key] ? 'text-cyan-600' : 'text-gray-400'}`} />
                                    <span className="text-sm font-semibold">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 4. Galeria de Fotos */}
                    <div className={CARD_CLASS}>
                        <h3 className={SECTION_TITLE}><Icon icon={ImageIcon} className="w-5 h-5 text-cyan-600"/> Galeria de Fotos</h3>
                        <div className="flex gap-3 mb-6">
                            <div className="flex-grow relative">
                                <input value={newPhotoUrl} onChange={(e) => setNewPhotoUrl(e.target.value)} className="w-full pl-4 pr-4 py-3 bg-gray-50 border-none rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-cyan-500/20" placeholder="Cole a URL da imagem (https://...)" />
                            </div>
                            <button type="button" onClick={handleAddPhoto} className="bg-cyan-100 text-cyan-700 px-5 rounded-xl hover:bg-cyan-200 font-bold flex items-center"><Plus className="w-5 h-5" /></button>
                        </div>
                        
                        {formData.fotos_carousel.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {formData.fotos_carousel.map((foto, index) => (
                                    <div key={index} className="relative group aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-sm border border-gray-100">
                                        <img src={foto.url} alt="Preview" className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => handleRemovePhoto(index)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-all duration-300 backdrop-blur-sm">
                                            <Trash2 className="w-6 h-6 drop-shadow-md" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
                                <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-400 font-medium text-sm">Nenhuma foto adicionada.</p>
                            </div>
                        )}
                    </div>

                    {/* Link Público */}
                    <div className="p-6 bg-gray-900 rounded-2xl text-white shadow-lg mb-24 lg:mb-0">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                            <LinkIcon className="w-4 h-4 mr-2"/> Link de Agendamento
                        </h3>
                        <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/10">
                            <div className="pl-4 pr-2 py-2 flex-grow text-sm font-mono text-cyan-300 truncate">
                                https://horalis.app/agendar/{salaoId}
                            </div>
                            <button onClick={copyLink} className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors flex items-center gap-2">
                                {linkCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                {linkCopied ? 'Copiado' : 'Copiar'}
                            </button>
                        </div>
                    </div>

                </div>

                {/* --- COLUNA 2: PREVIEW (Sticky Desktop) --- */}
                {/* Visível apenas em telas grandes */}
                <div className="hidden lg:block lg:col-span-5 sticky top-8 h-[calc(100vh-4rem)]">
                    <div className="bg-gray-100 p-6 rounded-[2.5rem] border-[8px] border-white shadow-2xl h-full flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-white rounded-b-2xl z-20 shadow-sm"></div>
                        <div className="flex-1 bg-white rounded-2xl overflow-hidden border border-gray-200 relative">
                            <div className="absolute inset-0 overflow-y-auto custom-scrollbar bg-[#FAFAFA]">
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
                                    redesSociais={{
                                        instagram: formData.redes_sociais.instagram ? `https://instagram.com/${formData.redes_sociais.instagram}` : '',
                                        facebook: formData.redes_sociais.facebook ? `https://facebook.com/${formData.redes_sociais.facebook}` : ''
                                    }}
                                    formasPagamento={formData.formas_pagamento}
                                    comodidades={formData.comodidades}
                                />
                            </div>
                        </div>
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-4 font-medium">Pré-visualização em tempo real</p>
                </div>

            </div>

            {/* --- FAB: BOTÃO PREVIEW (MOBILE) --- */}
            {/* Botão flutuante para abrir o preview no celular */}
            <button
                onClick={() => setMobilePreviewOpen(true)}
                className="lg:hidden fixed bottom-20 right-6 z-40 flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-full shadow-xl font-bold border border-gray-700 hover:scale-105 transition-transform"
            >
                <Eye className="w-5 h-5" /> Ver Preview
            </button>

            {/* --- BOTÃO SALVAR FIXO (MOBILE) --- */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                <button 
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className={`flex items-center justify-center w-full gap-2 px-6 py-3 bg-cyan-600 text-white rounded-xl font-bold shadow-lg shadow-cyan-200 hover:bg-cyan-700 transition-all disabled:opacity-70`}
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>

            {/* --- MODAL DE PREVIEW (MOBILE) --- */}
            {mobilePreviewOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 lg:hidden">
                    <button 
                        onClick={() => setMobilePreviewOpen(false)}
                        className="absolute top-6 right-6 z-50 bg-white text-gray-900 hover:bg-gray-200 p-3 rounded-full shadow-xl transition-transform hover:scale-110"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="bg-gray-100 p-2 rounded-[2rem] border-[4px] border-white shadow-2xl w-full max-w-sm h-[80vh] flex flex-col relative overflow-hidden">
                        <div className="flex-1 bg-white rounded-xl overflow-hidden border border-gray-200 relative">
                            <div className="absolute inset-0 overflow-y-auto custom-scrollbar bg-[#FAFAFA]">
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
                                    redesSociais={{
                                        instagram: formData.redes_sociais.instagram ? `https://instagram.com/${formData.redes_sociais.instagram}` : '',
                                        facebook: formData.redes_sociais.facebook ? `https://facebook.com/${formData.redes_sociais.facebook}` : ''
                                    }}
                                    formasPagamento={formData.formas_pagamento}
                                    comodidades={formData.comodidades}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}