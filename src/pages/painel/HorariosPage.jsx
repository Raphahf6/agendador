import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Loader2, Save, CalendarDays, AlertTriangle, Clock, ChevronDown, Copy } from 'lucide-react';
import { auth } from '@/firebaseConfig';
import { useSalon } from './PainelLayout';
import HourglassLoading from '@/components/HourglassLoading';
import toast from 'react-hot-toast';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

const DIAS_DA_SEMANA = [
    { name: "Segunda-feira", dbKey: "monday" }, { name: "Terça-feira", dbKey: "tuesday" },
    { name: "Quarta-feira", dbKey: "wednesday" }, { name: "Quinta-feira", dbKey: "thursday" },
    { name: "Sexta-feira", dbKey: "friday" }, { name: "Sábado", dbKey: "saturday" },
    { name: "Domingo", dbKey: "sunday" }
];

const initialSchedule = DIAS_DA_SEMANA.reduce((acc, item) => {
    acc[item.dbKey] = {
        isOpen: item.dbKey !== 'sunday', 
        openTime: '09:00', closeTime: '18:00',
        hasLunch: true, 
        lunchStart: '12:00', lunchEnd: '13:00',
    };
    return acc;
}, {});

// ===================================================
// --- 🌟 NOVOS SUB-COMPONENTES DE DESIGN PREMIUM 🌟 ---
// ===================================================

// --- Componente 1: Switch Moderno ---
const SwitchToggle = ({ checked, onChange, disabled, primaryColor }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onChange}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2`}
            style={{ 
                backgroundColor: checked ? primaryColor : '#E5E7EB',
                '--tw-ring-color': primaryColor
            }}
        >
            <span className="sr-only">Ativar/Desativar</span>
            <span
                aria-hidden="true"
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    checked ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
        </button>
    );
};

// --- Componente 2: Input de Hora Limpo ---
const TimeInput = ({ label, value, onChange, disabled }) => (
    <div className="flex-1">
        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        <input
            type="time"
            value={value || ''}
            onChange={onChange}
            disabled={disabled}
            required
            className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:border-cyan-500 focus:ring-cyan-500"
        />
    </div>
);

// --- Componente 3: Linha de Dia (Substitui o DayCard) ---
const DayRow = ({ dayKey, dayName, daySchedule, updateSchedule, disabled, primaryColor }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { isOpen, openTime, closeTime, hasLunch, lunchStart, lunchEnd } = daySchedule;

    const toggleOpen = () => {
        updateSchedule(dayKey, { isOpen: !isOpen });
    };
    
    const handleChange = (field, value) => {
        updateSchedule(dayKey, { [field]: value });
    };

    const toggleLunch = () => {
        const newHasLunch = !hasLunch;
        updateSchedule(dayKey, { 
            hasLunch: newHasLunch,
            // Se ativar, define valores padrão
            lunchStart: newHasLunch && !lunchStart ? '12:00' : (newHasLunch ? lunchStart : null),
            lunchEnd: newHasLunch && !lunchEnd ? '13:00' : (newHasLunch ? lunchEnd : null),
        });
    };

    return (
        <div className={`p-4 rounded-xl shadow-sm transition-all duration-300 border ${isOpen ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}`}>
            {/* Cabeçalho do Dia (Sempre visível) */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <SwitchToggle 
                        checked={isOpen} 
                        onChange={toggleOpen} 
                        disabled={disabled}
                        primaryColor={primaryColor}
                    />
                    <span className={`font-bold text-lg ${isOpen ? 'text-gray-900' : 'text-gray-400'}`}>
                        {dayName}
                    </span>
                </div>
                
                <div className="flex items-center gap-4">
                    <span className={`text-sm font-medium ${isOpen ? 'text-gray-700' : 'text-gray-400'}`}>
                        {isOpen ? `${openTime} - ${closeTime}` : 'Fechado'}
                    </span>
                    {isOpen && (
                        <button type="button" onClick={() => setIsExpanded(!isExpanded)} className="p-1 text-gray-400 hover:text-gray-700">
                            <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
                        </button>
                    )}
                </div>
            </div>

            {/* Detalhes (Expandido) */}
            {isOpen && isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-5 animate-in fade-in duration-300">
                    
                    {/* Horário de Funcionamento */}
                    <div className="grid grid-cols-2 gap-4">
                        <TimeInput
                            label="Abre às"
                            value={openTime}
                            onChange={(e) => handleChange('openTime', e.target.value)}
                            disabled={disabled}
                        />
                        <TimeInput
                            label="Fecha às"
                            value={closeTime}
                            onChange={(e) => handleChange('closeTime', e.target.value)}
                            disabled={disabled}
                        />
                    </div>

                    {/* Horário de Almoço */}
                    <div className="p-4 rounded-lg bg-gray-50 border border-gray-200/80">
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-sm font-bold text-gray-700">
                                Intervalo de Almoço
                            </label>
                            <SwitchToggle 
                                checked={hasLunch} 
                                onChange={toggleLunch} 
                                disabled={disabled}
                                primaryColor={primaryColor}
                            />
                        </div>
                        {hasLunch && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                                <TimeInput
                                    label="Início Almoço"
                                    value={lunchStart}
                                    onChange={(e) => handleChange('lunchStart', e.target.value)}
                                    disabled={disabled}
                                />
                                <TimeInput
                                    label="Fim Almoço"
                                    value={lunchEnd}
                                    onChange={(e) => handleChange('lunchEnd', e.target.value)}
                                    disabled={disabled}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


// --- COMPONENTE PRINCIPAL ---
export default function HorariosPage() {
    const { salaoId, salonDetails } = useSalon();
    const primaryColor = salonDetails?.cor_primaria || '#0E7490';
    
    const [schedule, setSchedule] = useState(initialSchedule);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    // Lógica de Busca (GET)
    const fetchHorarios = useCallback(async () => {
        if (!salaoId || !auth.currentUser) { setLoading(false); return; }
        
        setLoading(true); setError(null);
        try {
            const token = await auth.currentUser.getIdToken();
            const response = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data;

            // Combina o estado inicial com os dados do banco
            const mergedSchedule = { ...initialSchedule };
            if (data.horario_trabalho_detalhado) {
                for (const dayKey in mergedSchedule) {
                    if (data.horario_trabalho_detalhado[dayKey]) {
                        mergedSchedule[dayKey] = { ...mergedSchedule[dayKey], ...data.horario_trabalho_detalhado[dayKey] };
                    }
                }
            }
            setSchedule(mergedSchedule);
        } catch (err) {
            setError("Não foi possível carregar os horários. Usando padrão.");
        } finally { setLoading(false); }
    }, [salaoId]);

    useEffect(() => {
        if (salaoId) fetchHorarios();
    }, [fetchHorarios, salaoId]);


    // Handler para atualizar o estado localmente (usado pelo DayRow)
    const updateSchedule = useCallback((dayKey, newValues) => {
        setSchedule(prevSchedule => {
            const updatedDay = { ...prevSchedule[dayKey], ...newValues };
            
            // Garante valores padrão ao ativar o almoço
            if (newValues.hasLunch === true) {
                updatedDay.lunchStart = updatedDay.lunchStart || '12:00';
                updatedDay.lunchEnd = updatedDay.lunchEnd || '13:00';
            }
            if (newValues.hasLunch === false) {
                updatedDay.lunchStart = null;
                updatedDay.lunchEnd = null;
            }
            
            return { ...prevSchedule, [dayKey]: updatedDay };
        });
    }, []);

    // 🌟 BOTÃO MÁGICO: Replicar Horários
    const handleReplicateHours = () => {
        if (!schedule['monday']) return;
        
        const mondaySchedule = schedule['monday'];
        
        if (!window.confirm(`Replicar os horários de Segunda-feira (${mondaySchedule.openTime}-${mondaySchedule.closeTime}) para Terça, Quarta, Quinta e Sexta?`)) {
            return;
        }

        setSchedule(prev => {
            const newSchedule = { ...prev };
            ['tuesday', 'wednesday', 'thursday', 'friday'].forEach(dayKey => {
                newSchedule[dayKey] = { ...mondaySchedule }; // Copia os valores
            });
            return newSchedule;
        });

        toast.success("Horários replicados! Clique em 'Salvar' para confirmar.");
    };

    // Lógica de Salvamento (PUT)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true); setError(null);

        if (!salaoId) { setError("Erro: ID do salão."); setIsSaving(false); return; }

        // --- VALIDAÇÃO DE HORÁRIOS ---
        for (const dayKey of DIAS_DA_SEMANA.map(d => d.dbKey)) {
            const day = schedule[dayKey];
            if (day.isOpen) {
                if (day.openTime >= day.closeTime) {
                    setError(`O horário de fechamento em ${dayNames[dayKey]} deve ser posterior ao de abertura.`);
                    setIsSaving(false);
                    return;
                }
                if (day.hasLunch) {
                    if (!day.lunchStart || !day.lunchEnd) {
                        setError(`Horários de almoço inválidos em ${dayNames[dayKey]}.`);
                        setIsSaving(false);
                        return;
                    }
                    if (day.lunchStart >= day.lunchEnd) {
                        setError(`O fim do almoço em ${dayNames[dayKey]} deve ser posterior ao início.`);
                        setIsSaving(false);
                        return;
                    }
                    if (day.lunchStart <= day.openTime || day.lunchEnd >= day.closeTime) {
                        setError(`O almoço em ${dayNames[dayKey]} deve estar dentro do horário de funcionamento.`);
                        setIsSaving(false);
                        return;
                    }
                }
            }
        }
        // --- FIM DA VALIDAÇÃO ---

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Sessão expirada.");
            const token = await currentUser.getIdToken();
            
            // Pegamos os dados atuais para não sobrescrever outros campos
            const salonResponse = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, { headers: { Authorization: `Bearer ${token}` } });
            const salonData = salonResponse.data;

            const payload = {
                ...salonData,
                id: salaoId,
                horario_trabalho_detalhado: schedule,
                // Limpa dados antigos (legado)
                dias_trabalho: undefined,
                horario_inicio: undefined,
                horario_fim: undefined,
            };

            await axios.put(`${API_BASE_URL}/admin/clientes/${salaoId}`, payload, { headers: { Authorization: `Bearer ${token}` } });

            toast.success("Horários salvos com sucesso!");

        } catch (err) {
            console.error("Erro ao salvar:", err);
            toast.error("Falha ao salvar horários.");
        } finally { setIsSaving(false); }
    };

    // --- Renderização Loading/Error ---
    if (loading || !salaoId) {
        return (
            <div className="h-96 flex items-center justify-center">
                <HourglassLoading message='Carregando horários...' primaryColor={primaryColor} />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto font-sans pb-32">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                    <Icon icon={CalendarDays} className="w-6 h-6" style={{ color: primaryColor }} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Horário de Funcionamento
                    </h1>
                    <p className="text-sm text-gray-500">Defina os horários que aparecerão no seu site.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                    
                    {/* 🌟 BOTÃO MÁGICO (REPLICAR) 🌟 */}
                    <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Icon icon={Copy} className="w-5 h-5 text-gray-400" />
                            <div>
                                <h4 className="font-semibold text-gray-800">Economize Tempo</h4>
                                <p className="text-sm text-gray-500">Copiar horário de Segunda para Terça a Sexta.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleReplicateHours}
                            disabled={isSaving}
                            className="w-full sm:w-auto flex-shrink-0 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors"
                            style={{ backgroundColor: primaryColor }}
                        >
                            Replicar Horários
                        </button>
                    </div>
                    
                    {error && !isSaving && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 text-sm flex items-center gap-2">
                            <Icon icon={AlertTriangle} className="w-5 h-5" /> {error}
                        </div>
                    )}
                    
                    {/* 🌟 NOVAS LINHAS DE DIA 🌟 */}
                    <div className="space-y-3">
                        {DIAS_DA_SEMANA.map((item) => (
                            <DayRow
                                key={item.dbKey}
                                dayKey={item.dbKey}
                                dayName={item.name}
                                daySchedule={schedule[item.dbKey] || initialSchedule[item.dbKey]}
                                updateSchedule={updateSchedule}
                                disabled={isSaving}
                                primaryColor={primaryColor}
                            />
                        ))}
                    </div>

                </div>

                {/* Botão Salvar (Fixo no rodapé) */}
                <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-10">
                    <div className="max-w-3xl mx-auto flex justify-end">
                        <button
                            type="submit"
                            className="flex items-center px-6 py-3 text-white rounded-lg shadow-lg transition-all font-bold"
                            style={{ backgroundColor: primaryColor }}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                            {isSaving ? 'Salvando...' : 'Salvar Horários'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}