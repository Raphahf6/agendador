import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Scissors, DollarSign, Clock, Loader2, Plus, Trash2, X, Edit3, Search, AlertCircle,Save } from 'lucide-react';
import { auth } from '@/firebaseConfig';
import HourglassLoading from '@/components/HourglassLoading';
import { useSalon } from './PainelLayout';
import toast from 'react-hot-toast';

const API_BASE_URL = "https://api-agendador-2n55.onrender.com/api/v1";

// --- Componentes de UI Reutilizáveis (Estilo Premium) ---
const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// Input Moderno
const ModernInput = ({ label, icon: IconComp, ...props }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{label}</label>
        <div className="relative group">
            {IconComp && <IconComp className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-cyan-600 transition-colors" />}
            <input 
                {...props}
                className={`w-full ${IconComp ? 'pl-12' : 'pl-4'} pr-4 py-3.5 bg-gray-50 border-none rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-cyan-500/20 focus:bg-white transition-all duration-200 placeholder:text-gray-400`}
            />
        </div>
    </div>
);

// Modal Moderno
const ServiceFormModal = ({ isOpen, onClose, serviceData, salaoId, onSaveSuccess }) => {
    const [formData, setFormData] = useState({
        id: null, nome_servico: '', duracao_minutos: 30, preco: 0, descricao: '',
    });
    const [loading, setLoading] = useState(false);
    const isNew = formData.id === null;

    useEffect(() => {
        setFormData({
            id: serviceData?.id || null,
            nome_servico: serviceData?.nome_servico || '',
            duracao_minutos: serviceData?.duracao_minutos || 30,
            preco: serviceData?.preco || 0,
            descricao: serviceData?.descricao || '',
        });
    }, [serviceData, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'duracao_minutos' || name === 'preco' ? (Number(value) || 0) : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nome_servico.trim()) return toast.error("Nome do serviço é obrigatório.");
        
        setLoading(true);
        try {
            const token = await auth.currentUser.getIdToken();
            // Busca dados atuais
            const salonResponse = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, { headers: { Authorization: `Bearer ${token}` } });
            const salonData = salonResponse.data;

            let newServicesList;
            if (isNew) {
                const serviceToSave = { ...formData }; delete serviceToSave.id;
                newServicesList = [...(salonData.servicos || []), serviceToSave];
            } else {
                newServicesList = (salonData.servicos || []).map(s => s.id === formData.id ? { ...formData } : s);
            }

            await axios.put(`${API_BASE_URL}/admin/clientes/${salaoId}`, { ...salonData, id: salaoId, servicos: newServicesList }, { headers: { Authorization: `Bearer ${token}` } });
            
            toast.success(isNew ? "Serviço criado!" : "Serviço atualizado!");
            onSaveSuccess(); onClose();
        } catch (err) {
            toast.error("Erro ao salvar serviço.");
        } finally { setLoading(false); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden scale-100">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">{isNew ? 'Novo Serviço' : 'Editar Serviço'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <ModernInput name="nome_servico" label="Nome do Serviço" icon={Scissors} value={formData.nome_servico} onChange={handleChange} placeholder="Ex: Corte Degradê" required autoFocus />
                    <div className="grid grid-cols-2 gap-4">
                        <ModernInput name="duracao_minutos" label="Duração (min)" icon={Clock} type="number" value={formData.duracao_minutos} onChange={handleChange} min="5" required />
                        <ModernInput name="preco" label="Preço (R$)" icon={DollarSign} type="number" step="0.01" value={formData.preco} onChange={handleChange} min="0" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 block mb-1.5">Descrição</label>
                        <textarea name="descricao" rows="3" value={formData.descricao} onChange={handleChange} className="w-full p-4 bg-gray-50 border-none rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-cyan-500/20 focus:bg-white transition-all resize-none placeholder:text-gray-400" placeholder="Detalhes do serviço..." />
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold shadow-lg shadow-cyan-200 transition-all transform active:scale-95 flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isNew ? <Plus className="w-5 h-5" /> : <Save className="w-5 h-5" />)}
                        {isNew ? 'Criar Serviço' : 'Salvar Alterações'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default function ServicosPage() {
    const { salaoId } = useSalon();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchServices = useCallback(async () => {
        if (!salaoId || !auth.currentUser) return;
        setLoading(true); setError(null);
        try {
            const token = await auth.currentUser.getIdToken();
            const response = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, { headers: { Authorization: `Bearer ${token}` } });
            
            const rawServices = response.data?.servicos || [];
            // Garante IDs únicos temporários se não existirem
            const servicesWithKeys = rawServices.map((s, i) => ({ ...s, id: s.id || `temp-${Date.now()}-${i}` }));
            setServices(servicesWithKeys);
        } catch (err) { setError("Erro ao carregar serviços."); } 
        finally { setLoading(false); }
    }, [salaoId]);

    useEffect(() => { fetchServices(); }, [fetchServices]);

    const handleRemove = async (id) => {
        if (!window.confirm("Tem certeza que deseja excluir este serviço?")) return;
        const toastId = toast.loading("Removendo...");
        try {
            const token = await auth.currentUser.getIdToken();
            const salonResponse = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, { headers: { Authorization: `Bearer ${token}` } });
            const updatedServices = (salonResponse.data.servicos || []).filter(s => s.id !== id);
            await axios.put(`${API_BASE_URL}/admin/clientes/${salaoId}`, { ...salonResponse.data, id: salaoId, servicos: updatedServices }, { headers: { Authorization: `Bearer ${token}` } });
            
            await fetchServices();
            toast.success("Serviço removido!", { id: toastId });
        } catch (err) { toast.error("Erro ao remover.", { id: toastId }); }
    };

    const filteredServices = services.filter(s => s.nome_servico.toLowerCase().includes(searchTerm.toLowerCase()));

    if (loading && services.length === 0) return <div className="h-96 flex items-center justify-center"><HourglassLoading /></div>;

    return (
        <div className="max-w-5xl mx-auto font-sans pb-20">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                            <Scissors className="w-6 h-6 text-cyan-600" />
                        </div>
                        Meus Serviços
                    </h1>
                    <p className="text-gray-500 mt-1 ml-12 text-sm">Gerencie o catálogo do seu negócio.</p>
                </div>
                <button 
                    onClick={() => { setEditingService(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-xl font-bold shadow-lg shadow-cyan-200 hover:bg-cyan-700 transition-all transform hover:-translate-y-0.5"
                >
                    <Plus className="w-5 h-5" /> Novo Serviço
                </button>
            </div>

            {/* Barra de Pesquisa */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Buscar serviço..." 
                    className="flex-1 outline-none text-gray-700 placeholder-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Lista */}
            {filteredServices.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Scissors className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">Nenhum serviço encontrado.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredServices.map((service) => (
                        <div key={service.id} className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                            <div className="flex-1 min-w-0 pr-4">
                                <h3 className="text-lg font-bold text-gray-900 truncate">{service.nome_servico}</h3>
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {service.duracao_minutos} min</span>
                                    <span className="flex items-center gap-1 font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                                        R$ {Number(service.preco).toFixed(2).replace('.', ',')}
                                    </span>
                                </div>
                                {service.descricao && <p className="text-xs text-gray-400 mt-2 line-clamp-1">{service.descricao}</p>}
                            </div>
                            
                            <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => { setEditingService(service); setIsModalOpen(true); }}
                                    className="p-2.5 text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-xl transition-colors"
                                    title="Editar"
                                >
                                    <Edit3 className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={() => handleRemove(service.id)}
                                    className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ServiceFormModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                serviceData={editingService} 
                salaoId={salaoId} 
                onSaveSuccess={fetchServices} 
            />
        </div>
    );
}