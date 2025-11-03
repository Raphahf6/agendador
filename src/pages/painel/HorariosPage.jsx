// frontend/src/pages/painel/HorariosPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
// REMOVIDO: { useParams }
import axios from 'axios';
import { Loader2, Save, CalendarDays, AlertTriangle } from 'lucide-react';
import { auth } from '@/firebaseConfig';
// IMPORTAÇÃO CRÍTICA: Use o hook do PainelLayout
import { useSalon } from './PainelLayout';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// <<< DEFINIÇÕES DE COR >>>
const CIANO_COLOR_TEXT = 'text-cyan-600';
const CIANO_COLOR_BG = 'bg-cyan-600';
const CIANO_COLOR_BG_HOVER = 'hover:bg-cyan-700';
const CIANO_RING_FOCUS = 'focus:ring-cyan-400';
const CIANO_BORDER_FOCUS = 'focus:border-cyan-400';
const CIANO_CHECKED_BG = 'checked:bg-cyan-600'; // Para o toggle

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

function HorariosPage() {
    // NOVO: Obtém salaoId do contexto
    const { salaoId } = useSalon();

    const [diasTrabalho, setDiasTrabalho] = useState([]);
    const [horarioInicio, setHorarioInicio] = useState("09:00");
    const [horarioFim, setHorarioFim] = useState("18:00");
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    // --- Lógica de Busca (GET) ---
    const fetchHorarios = useCallback(async () => {
        // Bloqueia a execução se o salaoId ainda não estiver carregado
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
            setDiasTrabalho(data.dias_trabalho || []);
            setHorarioInicio(data.horario_inicio || "09:00");
            setHorarioFim(data.horario_fim || "18:00");
        } catch (err) {
            setError("Não foi possível carregar os horários.");
        } finally { setLoading(false); }
    }, [salaoId]); // Depende APENAS do salaoId

    useEffect(() => {
        // Dispara a busca quando o salaoId estiver pronto
        if (salaoId) {
            fetchHorarios();
        }
    }, [fetchHorarios, salaoId]);

    // --- Lógica de Manipulação do Formulário (mantida) ---
    const handleToggle = (dbKey) => {
        setDiasTrabalho(prev =>
            prev.includes(dbKey) ? prev.filter(key => key !== dbKey) : [...prev, dbKey]
        );
    };

    // --- Lógica de Salvamento (PUT) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true); setError(null);

        // Validação e Bloqueio
        if (!salaoId) { setError("Erro: ID do salão não carregado."); setIsSaving(false); return; }
        if (diasTrabalho.length === 0) { setError("Selecione pelo menos um dia de trabalho."); setIsSaving(false); return; }
        if (horarioInicio >= horarioFim) { setError("Horário de início deve ser anterior ao de fim."); setIsSaving(false); return; }

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Sessão expirada.");

            const token = await currentUser.getIdToken();
            // Busca dados completos
            const salonResponse = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, { headers: { Authorization: `Bearer ${token}` } });
            const salonData = salonResponse.data;
            // Prepara payload
            const payload = {
                ...salonData, id: salaoId,
                dias_trabalho: diasTrabalho, horario_inicio: horarioInicio, horario_fim: horarioFim,
            };
            // Envia PUT
            await axios.put(`${API_BASE_URL}/admin/clientes/${salaoId}`, payload, { headers: { Authorization: `Bearer ${token}` } });

            // Usa toast em vez de alert
            alert("Horários salvos com sucesso!");

        } catch (err) {
            setError("Falha ao salvar horários.");
        } finally { setIsSaving(false); }
    };

    // --- Renderização Loading/Error ---
    // Adicionamos !salaoId na condição de loading
    if (loading || !salaoId) {
        return (
            <div className="p-6 text-center bg-white rounded-lg shadow-md border border-gray-200 min-h-[300px] flex flex-col items-center justify-center font-sans">
                <Loader2 className={`h-8 w-8 animate-spin ${CIANO_COLOR_TEXT} mb-3`} />
                <p className="text-gray-600">{!salaoId ? 'Aguardando dados do painel...' : 'Carregando horários...'}</p>
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

                    {/* Horário Padrão */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-gray-100">
                        <p className="font-semibold text-gray-700 mb-2 sm:mb-0">Horário Padrão:</p>
                        <div className="flex space-x-3 items-center">
                            <input
                                type="time" value={horarioInicio} onChange={(e) => setHorarioInicio(e.target.value)}
                                className={`border border-gray-300 rounded-md p-2 text-center text-sm h-10 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`}
                                disabled={isSaving} required
                            />
                            <span className="text-gray-500">às</span>
                            <input
                                type="time" value={horarioFim} onChange={(e) => setHorarioFim(e.target.value)}
                                className={`border border-gray-300 rounded-md p-2 text-center text-sm h-10 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`}
                                disabled={isSaving} required
                            />
                        </div>
                    </div>

                    {/* Dias da Semana */}
                    <div className="space-y-3">
                        <p className="font-semibold text-gray-700 mb-3">Dias de Trabalho:</p>
                        {DIAS_DA_SEMANA.map((item) => {
                            const isChecked = diasTrabalho.includes(item.dbKey);
                            return (
                                <div key={item.dbKey} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <label htmlFor={`toggle-${item.dbKey}`} className={`font-medium cursor-pointer ${isChecked ? 'text-gray-800' : 'text-gray-500'}`}>
                                        {item.name}
                                    </label>
                                    {/* Switch Customizado com Tailwind */}
                                    <label htmlFor={`toggle-${item.dbKey}`} className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            id={`toggle-${item.dbKey}`}
                                            className="sr-only peer"
                                            checked={isChecked}
                                            onChange={() => handleToggle(item.dbKey)}
                                            disabled={isSaving}
                                        />
                                        {/* Fundo do toggle */}
                                        <div className={`w-11 h-6 bg-gray-300 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-1 ${CIANO_RING_FOCUS} peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600`}></div>
                                    </label>
                                </div>
                            );
                        })}
                    </div>

                    {/* Erro Geral (mostrado fora do loop, antes do botão) */}
                    {error && !isSaving && <p className="text-sm text-red-600 mt-4 text-center">{error}</p>}

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

export default HorariosPage;