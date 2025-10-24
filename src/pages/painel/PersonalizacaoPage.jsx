// frontend/src/pages/painel/PersonalizacaoPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card } from '@/ui/card';
import { Palette, Loader2, Save, Image, Link, Type } from 'lucide-react'; 
import { auth } from '@/firebaseConfig';
import { ImageWithFallback } from '@/ui/ImageWithFallback';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1"; 

function PersonalizacaoPage() {
    const { salaoId } = useParams();
    // Estado que reflete os campos do modelo ClientDetail
    const [formData, setFormData] = useState({
        nome_salao: '',
        tagline: '',
        url_logo: '',
        cor_primaria: '#6366F1',
        cor_secundaria: '#EC4899',
        cor_gradiente_inicio: '#F3E8FF',
        cor_gradiente_fim: '#FFFFFF'
    });

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    // --- Lógica de Busca (GET) ---
    const fetchPersonalizacao = useCallback(async () => {
        if (!salaoId) { setError("ID do Salão não encontrado."); setLoading(false); return; }
        
        const currentUser = auth.currentUser;
        if (!currentUser) { setError("Sessão expirada."); setLoading(false); return; }
        const token = await currentUser.getIdToken(); 

        setLoading(true);
        setError(null);
        
        try {
            // Busca os detalhes COMPLETOs do salão
            const response = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const data = response.data;
            
            // Atualiza o estado com os dados de personalização
            setFormData({
                nome_salao: data.nome_salao || '',
                tagline: data.tagline || '',
                url_logo: data.url_logo || '',
                cor_primaria: data.cor_primaria || '#6366F1',
                cor_secundaria: data.cor_secundaria || '#EC4899',
                cor_gradiente_inicio: data.cor_gradiente_inicio || '#F3E8FF',
                cor_gradiente_fim: data.cor_gradiente_fim || '#FFFFFF'
            });

        } catch (err) {
            console.error("Erro ao buscar dados:", err.response?.data?.detail || err.message);
            setError("Não foi possível carregar as configurações de personalização.");
        } finally {
            setLoading(false);
        }
    }, [salaoId]);

    useEffect(() => {
        fetchPersonalizacao();
    }, [fetchPersonalizacao]);

    // --- Lógica de Manipulação do Formulário ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // --- Lógica de Salvamento (PUT) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        // Validação básica (Nome do Salão é obrigatório para PUT)
        if (!formData.nome_salao.trim()) {
            setError("O nome do salão é obrigatório.");
            setIsSaving(false);
            return;
        }

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Sessão expirada.");
            const token = await currentUser.getIdToken(); 

            // 1. Busca os dados COMPLETOs do salão (incluindo serviços e horários)
            // para não sobrescrever o que não está neste formulário.
            const salonResponse = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const salonData = salonResponse.data;
            
            // 2. Prepara o payload para o PUT, atualizando APENAS os campos de personalização
            const payload = {
                ...salonData, // Todos os dados existentes
                id: salaoId, 
                // Sobrescreve apenas os campos do formulário atual:
                nome_salao: formData.nome_salao,
                tagline: formData.tagline,
                url_logo: formData.url_logo,
                cor_primaria: formData.cor_primaria,
                cor_secundaria: formData.cor_secundaria,
                cor_gradiente_inicio: formData.cor_gradiente_inicio,
                cor_gradiente_fim: formData.cor_gradiente_fim,
            };
            
            // 3. Envia o PUT
            await axios.put(`${API_BASE_URL}/admin/clientes/${salaoId}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            alert("Personalização salva com sucesso!");

        } catch (err) {
            console.error("Erro ao salvar personalização:", err);
            setError("Falha ao salvar personalização. Tente novamente.");
        } finally {
            setIsSaving(false);
        }
    };
    
    // --- Renderização ---
    if (loading) {
        return (
            <Card className="p-6 text-center shadow min-h-[300px] flex items-center justify-center">
                 <Loader2 className="h-6 w-6 animate-spin text-purple-600 mx-auto mb-2" />
                 <p className="text-gray-600">Carregando configurações...</p>
            </Card>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg shadow">
                <h3 className="font-semibold mb-2">Erro</h3>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Palette className="w-6 h-6 mr-3 text-pink-600" />
                Personalização da Página de Agendamento
            </h2>

            <Card className="p-6 shadow-lg">
                <form onSubmit={handleSubmit}>
                    
                    {/* PRÉ-VISUALIZAÇÃO DA LOGO E NOME */}
                    <div className="flex flex-col items-center justify-center mb-8 pb-6 border-b border-gray-100">
                        {formData.url_logo && (
                            <ImageWithFallback 
                                src={formData.url_logo} 
                                alt={formData.nome_salao || 'Logo'}
                                className="w-24 h-24 rounded-full mb-3 border-4 border-white shadow-md object-cover"
                            />
                        )}
                        <h3 className="text-2xl font-bold text-gray-800">{formData.nome_salao || 'Nome do Salão'}</h3>
                        <p className="text-gray-500 text-sm">{formData.tagline || 'Sua descrição aqui'}</p>
                        <p className="mt-4 text-xs text-gray-500">Pré-visualização da Identidade Visual</p>
                    </div>

                    {/* CAMPOS DE TEXTO E URL */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label htmlFor="nome_salao" className="block text-sm font-medium text-gray-700">Nome do Salão*</label>
                            <div className="mt-1 flex items-center border border-gray-300 rounded-md p-2 bg-gray-50">
                                <span className="text-gray-500 mr-2"><Type className="w-5 h-5"/></span>
                                <input name="nome_salao" id="nome_salao" type="text" value={formData.nome_salao} onChange={handleChange} className="w-full bg-gray-50 focus:outline-none" disabled={isSaving} required/>
                            </div>
                        </div>
                         <div>
                            <label htmlFor="tagline" className="block text-sm font-medium text-gray-700">Tagline (Descrição Curta)</label>
                            <div className="mt-1 flex items-center border border-gray-300 rounded-md p-2">
                                <span className="text-gray-500 mr-2"><Link className="w-5 h-5"/></span>
                                <input name="tagline" id="tagline" type="text" value={formData.tagline} onChange={handleChange} className="w-full focus:outline-none" disabled={isSaving} placeholder="Ex: Beleza e bem-estar"/>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="url_logo" className="block text-sm font-medium text-gray-700">URL da Logo (PNG ou JPG)</label>
                            <div className="mt-1 flex items-center border border-gray-300 rounded-md p-2">
                                <span className="text-gray-500 mr-2"><Image className="w-5 h-5"/></span>
                                <input name="url_logo" id="url_logo" type="url" value={formData.url_logo} onChange={handleChange} className="w-full focus:outline-none" disabled={isSaving} placeholder="Cole o link da sua imagem aqui"/>
                            </div>
                        </div>
                    </div>


                    {/* SELETORES DE COR */}
                    <h3 className="text-lg font-semibold text-gray-700 mb-4 pt-4 border-t border-gray-100">Cores da Página</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {/* Cor Primária */}
                        <div>
                            <label htmlFor="cor_primaria" className="block text-sm font-medium text-gray-700 mb-1">Primária (Títulos)</label>
                            <input name="cor_primaria" id="cor_primaria" type="color" value={formData.cor_primaria} onChange={handleChange} className="w-full h-10 cursor-pointer border border-gray-300 rounded-md p-0.5" disabled={isSaving}/>
                        </div>
                        {/* Cor Secundária */}
                        <div>
                            <label htmlFor="cor_secundaria" className="block text-sm font-medium text-gray-700 mb-1">Secundária (Gradiente)</label>
                            <input name="cor_secundaria" id="cor_secundaria" type="color" value={formData.cor_secundaria} onChange={handleChange} className="w-full h-10 cursor-pointer border border-gray-300 rounded-md p-0.5" disabled={isSaving}/>
                        </div>
                        {/* Gradiente Início (Fundo) */}
                        <div>
                            <label htmlFor="cor_gradiente_inicio" className="block text-sm font-medium text-gray-700 mb-1">Fundo (Início)</label>
                            <input name="cor_gradiente_inicio" id="cor_gradiente_inicio" type="color" value={formData.cor_gradiente_inicio} onChange={handleChange} className="w-full h-10 cursor-pointer border border-gray-300 rounded-md p-0.5" disabled={isSaving}/>
                        </div>
                        {/* Gradiente Fim (Fundo) */}
                        <div>
                            <label htmlFor="cor_gradiente_fim" className="block text-sm font-medium text-gray-700 mb-1">Fundo (Fim)</label>
                            <input name="cor_gradiente_fim" id="cor_gradiente_fim" type="color" value={formData.cor_gradiente_fim} onChange={handleChange} className="w-full h-10 cursor-pointer border border-gray-300 rounded-md p-0.5" disabled={isSaving}/>
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

                    <div className="flex justify-end pt-6 border-t mt-6">
                        <button
                            type="submit"
                            className="flex items-center px-6 py-2 bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700 transition-colors disabled:opacity-50"
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <Save className="w-5 h-5 mr-2" />
                            )}
                            {isSaving ? 'Salvando...' : 'Salvar Personalização'}
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
}

export default PersonalizacaoPage;