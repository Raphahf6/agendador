import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Loader2, Save, CalendarDays, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { auth } from '@/firebaseConfig';
import { useSalon } from './PainelLayout';
import HourglassLoading from '@/components/HourglassLoading';
import toast from 'react-hot-toast'; // Usar toast em vez de alert

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// <<< DEFINIÇÕES DE COR >>>
const CIANO_COLOR_TEXT = 'text-cyan-600';
const CIANO_COLOR_BG = 'bg-cyan-600';
const CIANO_COLOR_BG_HOVER = 'hover:bg-cyan-700';
const CIANO_RING_FOCUS = 'focus:ring-cyan-400';
const CIANO_BORDER_FOCUS = 'focus:border-cyan-400';

// Helper Ícone Simples
const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

const DIAS_DA_SEMANA = [
    { name: "Segunda-feira", dbKey: "monday" }, { name: "Terça-feira", dbKey: "tuesday" },
    { name: "Quarta-feira", dbKey: "wednesday" }, { name: "Quinta-feira", dbKey: "thursday" },
    { name: "Sexta-feira", dbKey: "friday" }, { name: "Sábado", dbKey: "saturday" },
    { name: "Domingo", dbKey: "sunday" }
];

// --- ESTRUTURA INICIAL POR DIA ---
const initialSchedule = DIAS_DA_SEMANA.reduce((acc, item) => {
    acc[item.dbKey] = {
        isOpen: item.dbKey !== 'sunday', // Abre todos exceto Domingo por padrão
        openTime: '09:00',
        closeTime: '18:00',
        hasLunch: true, // NOVO: Campo para ativar/desativar o almoço
        lunchStart: '12:00',
        lunchEnd: '13:00',
    };
    return acc;
}, {});

// --- Componente Auxiliar: Input de Tempo Simples ---
const TimeInput = ({ id, label, value, onChange, disabled, className = "" }) => (
    <div className="flex flex-col">
        <label htmlFor={id} className="text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="relative">
            <input
                id={id}
                type="time"
                value={value}
                onChange={onChange}
                disabled={disabled}
                required
                className={`w-full pl-8 pr-3 py-2 border rounded-lg transition-colors text-sm h-10 
                            ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}
                            ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-300'}`}
            />
            <Clock className={`w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 ${disabled ? 'text-gray-400' : CIANO_COLOR_TEXT}`} />
        </div>
    </div>
);


// --- Componente Auxiliar: Card de Dia (Com Horário de Almoço) ---
const DayCard = React.memo(({ dayKey, dayName, daySchedule, updateSchedule, disabled }) => {
    // Usamos um estado interno para controlar a expansão, mas o estado principal (isOpen)
    // vem do daySchedule para ser persistente.
    const [isExpanded, setIsExpanded] = useState(daySchedule.isOpen);

    const toggleOpen = useCallback(() => {
        updateSchedule(dayKey, { isOpen: !daySchedule.isOpen });
        setIsExpanded(!daySchedule.isOpen);
    }, [dayKey, daySchedule.isOpen, updateSchedule]);

    const handleChange = useCallback((field, value) => {
        // Se desativarmos o almoço, limpamos os valores no estado principal para não salvar lixo
        if (field === 'hasLunch' && value === false) {
            updateSchedule(dayKey, { hasLunch: false, lunchStart: null, lunchEnd: null });
        } else {
            updateSchedule(dayKey, { [field]: value });
        }
    }, [dayKey, updateSchedule]);

    return (
        <div className={`p-4 rounded-xl shadow-sm transition-all border 
                        ${daySchedule.isOpen ? 'bg-white border-cyan-100' : 'bg-gray-50 border-gray-200'}`}
        >
            {/* Cabeçalho do Dia (Toggle de Abertura) */}
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(daySchedule.isOpen ? !isExpanded : isExpanded)}>
                <div className="flex items-center gap-3">
                    <label htmlFor={`toggle-${dayKey}`} className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            id={`toggle-${dayKey}`}
                            className="sr-only peer"
                            checked={daySchedule.isOpen}
                            onChange={toggleOpen}
                            disabled={disabled}
                        />
                        {/* Switch Customizado com Tailwind */}
                        <div className={`w-11 h-6 bg-gray-300 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-1 ${CIANO_RING_FOCUS} peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600`}></div>
                    </label>
                    <span className={`font-semibold text-lg ${daySchedule.isOpen ? 'text-gray-800' : 'text-gray-500'}`}>
                        {dayName} {daySchedule.isOpen ? ' (Aberto)' : ' (Fechado)'}
                    </span>
                </div>
                {daySchedule.isOpen && (isExpanded ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />)}
            </div>

            {/* Configurações (Apenas se o dia estiver aberto e expandido) */}
            {daySchedule.isOpen && isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">

                    {/* Horário de Funcionamento Principal */}
                    <div className="grid grid-cols-2 gap-4">
                        <TimeInput
                            id={`${dayKey}-open`} label="Abre às"
                            value={daySchedule.openTime}
                            onChange={(e) => handleChange('openTime', e.target.value)}
                            disabled={disabled}
                        />
                        <TimeInput
                            id={`${dayKey}-close`} label="Fecha às"
                            value={daySchedule.closeTime}
                            onChange={(e) => handleChange('closeTime', e.target.value)}
                            disabled={disabled}
                        />
                    </div>

                    {/* Horário de Almoço (Nova Estrutura) */}
                    <div className="border border-dashed border-gray-300 p-3 rounded-lg bg-cyan-50/50">
                        <div className="flex items-center justify-between mb-3">
                            <label htmlFor={`${dayKey}-lunch-toggle`} className="text-sm font-bold text-cyan-700">
                                Intervalo de Almoço
                            </label>
                            <input
                                type="checkbox"
                                id={`${dayKey}-lunch-toggle`}
                                checked={daySchedule.hasLunch}
                                onChange={(e) => handleChange('hasLunch', e.target.checked)}
                                className="w-5 h-5 rounded text-cyan-600 focus:ring-cyan-500"
                                disabled={disabled}
                            />
                        </div>

                        {daySchedule.hasLunch && (
                            <div className="grid grid-cols-2 gap-4">
                                <TimeInput
                                    id={`${dayKey}-lunch-start`}
                                    label="Início Almoço"
                                    value={daySchedule.lunchStart || '12:00'}
                                    onChange={(e) => handleChange('lunchStart', e.target.value)}
                                    disabled={disabled}
                                />
                                <TimeInput
                                    id={`${dayKey}-lunch-end`}
                                    label="Fim Almoço"
                                    value={daySchedule.lunchEnd || '13:00'}
                                    onChange={(e) => handleChange('lunchEnd', e.target.value)}
                                    disabled={disabled}
                                />
                            </div>
                        )}
                        {!daySchedule.hasLunch && (
                            <p className="text-xs text-gray-500 text-center py-2">Não há intervalo de almoço neste dia.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});


// --- COMPONENTE PRINCIPAL ---
export default function HorariosPage() {
    const { salaoId } = useSalon();
    const [schedule, setSchedule] = useState(initialSchedule);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    // 1. Lógica de Busca (GET)
    const fetchHorarios = useCallback(async () => {
        // ... (Seu código de fetch permanece inalterado) ...
        if (!salaoId) { setLoading(false); return; }

        const currentUser = auth.currentUser;
        if (!currentUser) { setError("Sessão expirada."); setLoading(false); return; }

        const token = await currentUser.getIdToken();
        setLoading(true); setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data;

            if (data.horario_trabalho_detalhado) {
                setSchedule(prev => ({ ...prev, ...data.horario_trabalho_detalhado }));
            } else if (data.dias_trabalho) {
                const newSchedule = DIAS_DA_SEMANA.reduce((acc, item) => {
                    const isWorking = data.dias_trabalho.includes(item.dbKey);
                    acc[item.dbKey] = {
                        ...initialSchedule[item.dbKey],
                        isOpen: isWorking,
                        openTime: data.horario_inicio || initialSchedule[item.dbKey].openTime,
                        closeTime: data.horario_fim || initialSchedule[item.dbKey].closeTime,
                    };
                    return acc;
                }, {});
                setSchedule(newSchedule);
            }
        } catch (err) {
            setError("Não foi possível carregar os horários. Usando padrão.");
        } finally { setLoading(false); }
    }, [salaoId]);

    useEffect(() => {
        if (salaoId) {
            fetchHorarios();
        }
    }, [fetchHorarios, salaoId]);


    // 2. Handler para atualizar o estado localmente (usado pelo DayCard)
    const updateSchedule = useCallback((dayKey, newValues) => {
        setSchedule(prevSchedule => {
            const updatedDay = { ...prevSchedule[dayKey], ...newValues };

            // >>> CORREÇÃO CRÍTICA: Inicializa os valores ao ativar o almoço <<<
            // Verifica se está ativando o almoço E se os campos estão vazios no estado
            if (newValues.hasLunch === true) {
                updatedDay.lunchStart = updatedDay.lunchStart || '12:00';
                updatedDay.lunchEnd = updatedDay.lunchEnd || '13:00';
            }

            // Limpa o estado se desativar o almoço (boa prática)
            if (newValues.hasLunch === false) {
                updatedDay.lunchStart = null;
                updatedDay.lunchEnd = null;
            }

            return {
                ...prevSchedule,
                [dayKey]: updatedDay,
            };
        });
    }, []);

    // 3. Lógica de Salvamento (PUT)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true); setError(null);

        if (!salaoId) { setError("Erro: ID do salão não carregado."); setIsSaving(false); return; }

        const workingDays = Object.values(schedule).filter(day => day.isOpen);
        if (workingDays.length === 0) { setError("Selecione pelo menos um dia de trabalho."); setIsSaving(false); return; }

        // --- VALIDAÇÃO DE HORÁRIOS CRÍTICA ---
        for (const day of workingDays) {
            const dayName = DIAS_DA_SEMANA.find(d => d.dbKey === Object.keys(schedule).find(key => schedule[key] === day)).name;

            if (day.openTime >= day.closeTime) {
                setError(`O horário de fechamento em ${dayName} deve ser posterior ao de abertura.`);
                setIsSaving(false);
                return;
            }

            if (day.hasLunch) {
                // MUDANÇA CRÍTICA: A validação do frontend é executada aqui

                if (!day.lunchStart || !day.lunchEnd) {
                    // Esta checagem é redundante se updateSchedule funcionar, mas a mantemos como segurança final.
                    setError(`Obrigatório: Os horários de início e fim do almoço em ${dayName} devem ser preenchidos.`);
                    setIsSaving(false);
                    return;
                }

                // Validação de ordem (aonde o erro estava)
                if (day.lunchStart >= day.lunchEnd) {
                    setError(`O fim do almoço em ${dayName} deve ser posterior ao início.`);
                    setIsSaving(false);
                    return;
                }

                // Validação de intervalo de almoço dentro do horário de funcionamento
                if (day.lunchStart <= day.openTime || day.lunchEnd >= day.closeTime || day.lunchStart >= day.closeTime || day.lunchEnd <= day.openTime) {
                    setError(`O intervalo de almoço em ${dayName} deve estar completamente dentro do horário de funcionamento (${day.openTime} às ${day.closeTime}).`);
                    setIsSaving(false);
                    return;
                }
            }
        }
        // --- FIM DA VALIDAÇÃO ---


        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Sessão expirada.");

            const token = await currentUser.getIdToken();

            const salonResponse = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, { headers: { Authorization: `Bearer ${token}` } });
            const salonData = salonResponse.data;

            const payload = {
                ...salonData,
                id: salaoId,
                horario_trabalho_detalhado: schedule,
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
            <div className="p-6 text-center bg-white rounded-lg shadow-md border border-gray-200 min-h-[300px] flex flex-col items-center justify-center font-sans">
                {!salaoId ? <HourglassLoading message="Carregando dados do painel..." /> : <HourglassLoading message='Carregando horarios...' />}
            </div>
        );
    }
    if (error && !isSaving) {
        return (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg shadow border border-red-200 font-sans flex items-center gap-2">
                <Icon icon={AlertTriangle} className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
            </div>
        );
    }

    // --- Renderização Principal ---
    return (
        <div className="max-w-3xl mx-auto font-sans">
            <h2 className={`text-2xl font-bold text-gray-900 mb-6 flex items-center ${CIANO_COLOR_TEXT}`}>
                <Icon icon={CalendarDays} className="w-6 h-6 mr-3" />
                Configurar Horário de Funcionamento
            </h2>

            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <form onSubmit={handleSubmit}>

                    {error && !isSaving && <p className="text-sm text-red-600 mb-4 text-center p-2 bg-red-50 rounded-lg">{error}</p>}

                    {/* Cards de Dias da Semana (Novo Fluxo) */}
                    <div className="space-y-4">
                        <p className="font-semibold text-gray-700 mb-2 border-b pb-2">Configuração Detalhada por Dia:</p>
                        {DIAS_DA_SEMANA.map((item) => (
                            <DayCard
                                key={item.dbKey}
                                dayKey={item.dbKey}
                                dayName={item.name}
                                daySchedule={schedule[item.dbKey] || initialSchedule[item.dbKey]}
                                updateSchedule={updateSchedule}
                                disabled={isSaving}
                            />
                        ))}
                    </div>

                    {/* Botão Salvar */}
                    <div className="flex justify-end pt-6 border-t border-gray-100 mt-6">
                        <button
                            type="submit"
                            className={`flex items-center px-6 py-2.5 ${CIANO_COLOR_BG} text-white rounded-lg shadow-sm ${CIANO_COLOR_BG_HOVER} transition-colors disabled:opacity-50`}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin stroke-current mr-2" />
                            ) : (
                                <Icon icon={Save} className="w-5 h-5 mr-2" />
                            )}
                            {isSaving ? 'Salvando...' : 'Salvar Horários'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}