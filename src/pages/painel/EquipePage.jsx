import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Users, Plus, Trash2, UserCircle, Briefcase, Loader2, X, Save, Clock, Check, ChevronDown } from 'lucide-react';
import { auth } from '@/firebaseConfig';
import { useSalon } from './PainelLayout';
import HourglassLoading from '@/components/HourglassLoading';
import toast from 'react-hot-toast';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

const DIAS_DA_SEMANA = [
    { name: "Segunda", key: "monday" }, { name: "Terça", key: "tuesday" },
    { name: "Quarta", key: "wednesday" }, { name: "Quinta", key: "thursday" },
    { name: "Sexta", key: "friday" }, { name: "Sábado", key: "saturday" },
    { name: "Domingo", key: "sunday" }
];

// Horário padrão para inicializar
const DEFAULT_DAY_SCHEDULE = { isOpen: true, openTime: '09:00', closeTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00' };

// --- SUB-COMPONENTE: Modal de Profissional (Com Abas) ---
const ProfessionalModal = ({ isOpen, onClose, onSave, initialData, primaryColor }) => {
    const [tab, setTab] = useState('dados'); // 'dados' | 'horarios'
    const [formData, setFormData] = useState({ 
        nome: '', cargo: '', foto_url: '', 
        horario_trabalho: {} // Estrutura: { monday: {isOpen: true...}, ... }
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Garante que horario_trabalho seja um objeto
                setFormData({ ...initialData, horario_trabalho: initialData.horario_trabalho || {} });
            } else {
                setFormData({ nome: '', cargo: '', foto_url: '', horario_trabalho: {} });
            }
            setTab('dados');
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nome) return;
        setLoading(true);
        await onSave(formData);
        setLoading(false);
        onClose();
    };

    // Handler para atualizar horário de um dia
    const updateDay = (dayKey, field, value) => {
        setFormData(prev => {
            const currentDay = prev.horario_trabalho[dayKey] || { ...DEFAULT_DAY_SCHEDULE };
            return {
                ...prev,
                horario_trabalho: {
                    ...prev.horario_trabalho,
                    [dayKey]: { ...currentDay, [field]: value }
                }
            };
        });
    };

    const toggleDay = (dayKey) => {
        setFormData(prev => {
            const currentDay = prev.horario_trabalho[dayKey];
            if (currentDay) {
                // Se já existe configuração, inverte o isOpen
                return {
                    ...prev,
                    horario_trabalho: {
                        ...prev.horario_trabalho,
                        [dayKey]: { ...currentDay, isOpen: !currentDay.isOpen }
                    }
                };
            } else {
                // Se não existe, cria como ABERTO (sobrescrevendo o padrão do salão)
                return {
                    ...prev,
                    horario_trabalho: {
                        ...prev.horario_trabalho,
                        [dayKey]: { ...DEFAULT_DAY_SCHEDULE, isOpen: true }
                    }
                };
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-900">{initialData ? 'Editar Profissional' : 'Novo Profissional'}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    <button 
                        onClick={() => setTab('dados')}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === 'dados' ? 'text-cyan-700 border-b-2 border-cyan-700' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Dados Básicos
                    </button>
                    <button 
                        onClick={() => setTab('horarios')}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === 'horarios' ? 'text-cyan-700 border-b-2 border-cyan-700' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Horários Personalizados
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {tab === 'dados' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome*</label>
                                <input required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="Ex: João Silva" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cargo</label>
                                <input value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="Ex: Barbeiro Master" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Foto URL</label>
                                <input value={formData.foto_url} onChange={e => setFormData({...formData, foto_url: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="https://..." />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-xs text-gray-500 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <span className="font-bold">Nota:</span> Se não configurar, o profissional seguirá o horário geral do salão. Configure aqui apenas as exceções (ex: folgas, horários diferentes).
                            </p>
                            
                            {DIAS_DA_SEMANA.map((day) => {
                                // Se o dia existe no objeto, usamos. Se não, consideramos "Padrão do Salão" (visual cinza)
                                const config = formData.horario_trabalho[day.key];
                                const isActive = config !== undefined; // Se está definido no override
                                const isOpen = config?.isOpen;

                                return (
                                    <div key={day.key} className={`border rounded-xl p-3 transition-all ${isActive ? 'border-cyan-200 bg-white shadow-sm' : 'border-gray-100 bg-gray-50 opacity-70'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isActive} 
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            // Ativa edição para este dia (copia default)
                                                            updateDay(day.key, 'isOpen', true);
                                                        } else {
                                                            // Remove do objeto (volta ao padrão do salão)
                                                            const newSchedule = { ...formData.horario_trabalho };
                                                            delete newSchedule[day.key];
                                                            setFormData({ ...formData, horario_trabalho: newSchedule });
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                                                />
                                                <span className={`font-bold text-sm ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>{day.name}</span>
                                            </div>
                                            {isActive && (
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs text-gray-500">Trabalha?</label>
                                                    <button 
                                                        type="button"
                                                        onClick={() => updateDay(day.key, 'isOpen', !isOpen)}
                                                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isOpen ? 'bg-green-500' : 'bg-gray-300'}`}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isOpen ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {isActive && isOpen && (
                                            <div className="grid grid-cols-2 gap-3 mt-2 animate-in fade-in">
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Início</label>
                                                    <input type="time" value={config.openTime} onChange={e => updateDay(day.key, 'openTime', e.target.value)} className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-cyan-500" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Fim</label>
                                                    <input type="time" value={config.closeTime} onChange={e => updateDay(day.key, 'closeTime', e.target.value)} className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-cyan-500" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-100 bg-white">
                    <button type="submit" onClick={handleSubmit} disabled={loading} className="w-full py-3 rounded-xl text-white font-bold shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Profissional'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Card de Profissional (Mantido, com botão de editar)
const ProfessionalCard = ({ pro, onEdit, onDelete, primaryColor }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-center justify-between group">
        <div className="flex items-center gap-4">
            {pro.foto_url ? (
                <img src={pro.foto_url} alt={pro.nome} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
            ) : (
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <UserCircle className="w-8 h-8" />
                </div>
            )}
            <div>
                <h3 className="font-bold text-gray-900 text-lg">{pro.nome}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> {pro.cargo}
                </p>
            </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(pro)} className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg"><Icon icon={Save} className="w-4 h-4"/></button> {/* Ícone de Edit genérico ou use Edit3 */}
            <button onClick={() => onDelete(pro.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
        </div>
    </div>
);

export default function EquipePage() {
    const { salaoId, salonDetails } = useSalon();
    const primaryColor = salonDetails?.cor_primaria || '#0E7490';
    const [professionals, setProfessionals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPro, setEditingPro] = useState(null);

    const fetchTeam = useCallback(async () => {
        if (!salaoId || !auth.currentUser) return;
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await axios.get(`${API_BASE_URL}/admin/equipe`, { headers: { Authorization: `Bearer ${token}` } });
            setProfessionals(res.data);
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    }, [salaoId]);

    useEffect(() => { fetchTeam(); }, [fetchTeam]);

    const handleSave = async (data) => {
        try {
            const token = await auth.currentUser.getIdToken();
            const headers = { Authorization: `Bearer ${token}` };
            
            if (editingPro) {
                // Assumindo rota PUT para update (precisa criar se não tiver)
                // Se não tiver PUT, pode deletar e criar, mas o ideal é atualizar
                // Vamos usar POST mesmo se o backend aceitar upsert ou criar nova rota PUT.
                // POR ENQUANTO: Vou deletar e recriar para simplificar se você não tiver rota PUT específica, 
                // mas o ideal é ter um @router.put("/{pro_id}") no team_routes.py
                // Vou assumir que você vai criar a rota PUT ou usar a lógica abaixo.
                
                // SUGESTÃO: Adicione a rota PUT no backend. Se não, avise.
                await axios.delete(`${API_BASE_URL}/admin/equipe/${editingPro.id}`, { headers });
                await axios.post(`${API_BASE_URL}/admin/equipe`, data, { headers });
            } else {
                await axios.post(`${API_BASE_URL}/admin/equipe`, data, { headers });
            }
            
            toast.success("Salvo com sucesso!");
            fetchTeam();
        } catch (e) { toast.error("Erro ao salvar."); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Remover este profissional?")) return;
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.delete(`${API_BASE_URL}/admin/equipe/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Removido.");
            fetchTeam();
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
                    <p className="text-gray-500 mt-1 ml-12 text-sm">Cadastre seus profissionais e horários específicos.</p>
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
                primaryColor={primaryColor}
            />
        </div>
    );
}