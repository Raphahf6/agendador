import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
    Users, Plus, Trash2, UserCircle, Briefcase, Loader2, X, Save, 
    Clock, Check, ChevronDown, Scissors, Percent 
} from 'lucide-react';
import { auth } from '@/firebaseConfig';
import { useSalon } from './PainelLayout';
import HourglassLoading from '@/components/HourglassLoading';
import toast from 'react-hot-toast';

const API_BASE_URL = "https://api-agendador-2n55.onrender.com/api/v1";

const DIAS_DA_SEMANA = [
    { name: "Segunda", key: "monday" }, { name: "Terça", key: "tuesday" },
    { name: "Quarta", key: "wednesday" }, { name: "Quinta", key: "thursday" },
    { name: "Sexta", key: "friday" }, { name: "Sábado", key: "saturday" },
    { name: "Domingo", key: "sunday" }
];

const DEFAULT_DAY_SCHEDULE = { isOpen: true, openTime: '09:00', closeTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00' };

// --- Modal de Profissional ---
const ProfessionalModal = ({ isOpen, onClose, onSave, initialData, availableServices, primaryColor }) => {
    const [tab, setTab] = useState('dados');
    const [formData, setFormData] = useState({
        nome: '', cargo: '', foto_url: '',
        horario_trabalho: {},
        servicos: [],
        descricao: '',
        email: '',
        telefone: '',
        comissao: '' // ✨ Novo Campo de Comissão
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    ...initialData,
                    horario_trabalho: initialData.horario_trabalho || {},
                    servicos: initialData.servicos || [],
                    comissao: initialData.comissao || '' // Carrega comissão existente
                });
            } else {
                setFormData({ nome: '', cargo: '', foto_url: '', horario_trabalho: {}, servicos: [], descricao: '', email: '', telefone: '', comissao: '' });
            }
            setTab('dados');
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nome) return;
        setLoading(true);
        
        // Garante que comissão seja número ou 0
        const dataToSave = {
            ...formData,
            comissao: formData.comissao ? parseFloat(formData.comissao) : 0
        };

        await onSave(dataToSave);
        setLoading(false);
        onClose();
    };

    // Helpers de Horário e Serviços (Mantidos)
    const updateDay = (dayKey, field, value) => {
        setFormData(prev => {
            const currentDay = prev.horario_trabalho[dayKey] || { ...DEFAULT_DAY_SCHEDULE };
            return { ...prev, horario_trabalho: { ...prev.horario_trabalho, [dayKey]: { ...currentDay, [field]: value } } };
        });
    };

    const toggleService = (serviceId) => {
        setFormData(prev => {
            const currentServices = prev.servicos || [];
            if (currentServices.includes(serviceId)) {
                return { ...prev, servicos: currentServices.filter(id => id !== serviceId) };
            } else {
                return { ...prev, servicos: [...currentServices, serviceId] };
            }
        });
    };

    const toggleAllServices = () => {
        if (formData.servicos.length === availableServices.length) {
            setFormData(prev => ({ ...prev, servicos: [] }));
        } else {
            setFormData(prev => ({ ...prev, servicos: availableServices.map(s => s.id) }));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] border border-gray-100">
                
                {/* HEADER FIXO */}
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 leading-tight">
                            {initialData ? 'Editar Profissional' : 'Novo Integrante'}
                        </h3>
                        <p className="text-xs text-gray-400 font-medium">Dados e Comissão</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* TABS */}
                <div className="flex px-2 border-b border-gray-100 bg-gray-50/50">
                    {['dados', 'servicos', 'horarios'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 py-4 px-2 text-sm font-bold transition-all relative ${
                                tab === t ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {t === 'dados' ? 'Dados' : t === 'servicos' ? 'Serviços' : 'Horários'}
                            {tab === t && (
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-t-full" style={{ backgroundColor: primaryColor }} />
                            )}
                        </button>
                    ))}
                </div>

                {/* CONTEÚDO */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
                    
                    {tab === 'dados' && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo*</label>
                                    <input required value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} className="w-full p-3.5 bg-gray-50 rounded-2xl border border-gray-100 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all" placeholder="Ex: João Silva" />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Cargo</label>
                                        <input value={formData.cargo} onChange={e => setFormData({ ...formData, cargo: e.target.value })} className="w-full p-3.5 bg-gray-50 rounded-2xl border border-gray-100 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all" placeholder="Ex: Barbeiro" />
                                    </div>
                                    {/* ✨ CAMPO DE COMISSÃO */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                                            <Percent className="w-3 h-3" /> Comissão (%)
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max="100" 
                                                value={formData.comissao} 
                                                onChange={e => setFormData({ ...formData, comissao: e.target.value })} 
                                                className="w-full p-3.5 bg-green-50 rounded-2xl border border-green-100 focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-green-800 font-bold" 
                                                placeholder="0" 
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600 font-bold">%</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Descrição / Bio</label>
                                    <textarea
                                        value={formData.descricao}
                                        onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                                        className="w-full p-3.5 bg-gray-50 rounded-2xl border border-gray-100 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all resize-none"
                                        placeholder="Conte um pouco sobre a experiência..."
                                        rows="3"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Telefone</label>
                                        <input type="tel" value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: e.target.value })} className="w-full p-3.5 bg-gray-50 rounded-2xl border border-gray-100 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all" placeholder="(XX) 9..." />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">E-mail</label>
                                        <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-3.5 bg-gray-50 rounded-2xl border border-gray-100 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all" placeholder="email@exemplo.com" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Link da Foto (URL)</label>
                                    <input value={formData.foto_url} onChange={e => setFormData({ ...formData, foto_url: e.target.value })} className="w-full p-3.5 bg-gray-50 rounded-2xl border border-gray-100 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all" placeholder="https://imagem.com/foto.jpg" />
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'servicos' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            {/* ... (Conteúdo da aba Serviços mantido igual) ... */}
                            <div className="flex justify-between items-center p-2 bg-gray-50 rounded-xl mb-2">
                                <p className="text-[11px] font-bold text-gray-500 uppercase ml-1">Serviços habilitados</p>
                                <button type="button" onClick={toggleAllServices} className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-white transition-all" style={{ color: primaryColor }}>
                                    {formData.servicos.length === availableServices.length ? 'Remover Todos' : 'Selecionar Todos'}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {availableServices.map((service) => {
                                    const isSelected = formData.servicos.includes(service.id);
                                    return (
                                        <div key={service.id} onClick={() => toggleService(service.id)} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'border-cyan-500 bg-cyan-50/30' : 'border-gray-50 bg-gray-50 hover:border-gray-200'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'bg-white border-gray-200'}`}>
                                                    {isSelected && <Check className="w-4 h-4 text-white" />}
                                                </div>
                                                <span className={`text-sm font-bold ${isSelected ? 'text-cyan-900' : 'text-gray-600'}`}>{service.nome_servico}</span>
                                            </div>
                                            <span className="text-xs font-bold text-gray-400">R$ {service.preco}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {tab === 'horarios' && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                            {/* ... (Conteúdo da aba Horários mantido igual) ... */}
                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 mb-4">
                                <p className="text-[11px] text-amber-700 leading-relaxed"><strong className="block mb-0.5">Customização de Escala:</strong> Marque os dias que este profissional trabalha diferente do padrão do salão.</p>
                            </div>
                            {DIAS_DA_SEMANA.map((day) => {
                                const config = formData.horario_trabalho[day.key];
                                const isActive = config !== undefined;
                                const isOpen = config?.isOpen;
                                return (
                                    <div key={day.key} className={`border-2 rounded-2xl p-4 transition-all ${isActive ? 'border-cyan-100 bg-white' : 'border-gray-50 bg-gray-50/50 opacity-60'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <input type="checkbox" checked={isActive} onChange={(e) => { if (e.target.checked) updateDay(day.key, 'isOpen', true); else { const newSchedule = { ...formData.horario_trabalho }; delete newSchedule[day.key]; setFormData({ ...formData, horario_trabalho: newSchedule }); } }} className="w-5 h-5 text-cyan-600 rounded-lg border-gray-300 focus:ring-cyan-500" />
                                                <span className={`font-bold text-sm ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>{day.name}</span>
                                            </div>
                                            {isActive && ( <button type="button" onClick={() => updateDay(day.key, 'isOpen', !isOpen)} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{isOpen ? 'Disponível' : 'Folga'}</button> )}
                                        </div>
                                        {isActive && isOpen && (
                                            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-50">
                                                <div><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Entrada</label><input type="time" value={config.openTime} onChange={e => updateDay(day.key, 'openTime', e.target.value)} className="w-full p-2 bg-gray-50 rounded-xl border-none text-sm font-medium" /></div>
                                                <div><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Saída</label><input type="time" value={config.closeTime} onChange={e => updateDay(day.key, 'closeTime', e.target.value)} className="w-full p-2 bg-gray-50 rounded-xl border-none text-sm font-medium" /></div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                    <button type="submit" onClick={handleSubmit} disabled={loading} className="w-full py-4 rounded-2xl text-white font-bold shadow-xl shadow-cyan-900/10 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2" style={{ backgroundColor: primaryColor }}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Integrante'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Card de Profissional (Com Tag de Comissão) ---
const ProfessionalCard = ({ pro, onEdit, onDelete, primaryColor }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-center justify-between group">
        <div className="flex items-center gap-4">
            {pro.foto_url ? (
                <img src={pro.foto_url} alt={pro.nome} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
            ) : (
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><UserCircle className="w-8 h-8" /></div>
            )}
            <div>
                <h3 className="font-bold text-gray-900 text-lg">{pro.nome}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-gray-500 flex items-center gap-1"><Briefcase className="w-3 h-3" /> {pro.cargo}</p>
                    
                    {/* ✨ VISUALIZAÇÃO DA COMISSÃO */}
                    {pro.comissao > 0 && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-green-100">
                            <Percent className="w-3 h-3" /> {pro.comissao}%
                        </span>
                    )}
                </div>

                {pro.servicos && pro.servicos.length > 0 && (
                    <p className="text-xs text-cyan-600 mt-1 bg-cyan-50 px-2 py-0.5 rounded-md inline-block font-medium">
                        {pro.servicos.length} serviços habilitados
                    </p>
                )}
            </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(pro)} className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg"><Save className="w-4 h-4" /></button>
            <button onClick={() => onDelete(pro.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
        </div>
    </div>
);

// --- PÁGINA PRINCIPAL ---
export default function EquipePage() {
    const { salaoId, salonDetails } = useSalon();
    const primaryColor = salonDetails?.cor_primaria || '#0E7490';
    const [professionals, setProfessionals] = useState([]);
    const [services, setServices] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPro, setEditingPro] = useState(null);

    const fetchData = useCallback(async () => {
        if (!salaoId || !auth.currentUser) return;
        try {
            const token = await auth.currentUser.getIdToken();
            const [teamRes, salonRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/admin/equipe`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setProfessionals(teamRes.data);
            setServices(salonRes.data.servicos || []);
        } catch (err) { console.error(err); toast.error("Erro ao carregar dados."); }
        finally { setLoading(false); }
    }, [salaoId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSave = async (data) => {
        try {
            const token = await auth.currentUser.getIdToken();
            const headers = { Authorization: `Bearer ${token}` };
            
            if (editingPro) {
                // AGORA USA PUT (Atualiza mantendo o ID e o histórico)
                await axios.put(`${API_BASE_URL}/admin/equipe/${editingPro.id}`, data, { headers });
            } else {
                // CRIA NOVO
                await axios.post(`${API_BASE_URL}/admin/equipe`, data, { headers });
            }
            toast.success("Salvo com sucesso!");
            fetchData();
        } catch (e) { 
            console.error(e);
            toast.error("Erro ao salvar."); 
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Remover este profissional?")) return;
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.delete(`${API_BASE_URL}/admin/equipe/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Removido.");
            fetchData();
        } catch (e) { toast.error("Erro ao remover."); }
    };

    if (loading) return <div className="h-96 flex items-center justify-center"><HourglassLoading /></div>;

    return (
        <div className="font-sans pb-20 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                            <Users className="w-6 h-6" style={{ color: primaryColor }} />
                        </div>
                        Minha Equipe
                    </h1>
                    <p className="text-gray-500 mt-1 ml-12 text-sm">Cadastre seus profissionais e defina as comissões.</p>
                </div>
                <button
                    onClick={() => { setEditingPro(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-6 py-3 text-white rounded-xl font-bold shadow-lg transition-all hover:-translate-y-0.5"
                    style={{ backgroundColor: primaryColor }}
                >
                    <Plus className="w-5 h-5" /> Adicionar Membro
                </button>
            </div>

            {professionals.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Sua equipe está vazia.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {professionals.map(pro => (
                        <ProfessionalCard
                            key={pro.id}
                            pro={pro}
                            onEdit={() => { setEditingPro(pro); setIsModalOpen(true); }}
                            onDelete={handleDelete}
                            primaryColor={primaryColor}
                        />
                    ))}
                </div>
            )}

            <ProfessionalModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingPro}
                availableServices={services}
                primaryColor={primaryColor}
            />
        </div>
    );
}