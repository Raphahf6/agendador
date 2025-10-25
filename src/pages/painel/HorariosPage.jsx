// frontend/src/pages/painel/HorariosPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card } from '@/ui/card';
import { Clock, Loader2, Save, CalendarDays, AlertTriangle } from 'lucide-react'; 
import { auth } from '@/firebaseConfig'; 

// URL da API (deve estar correta para o seu ambiente)
const API_BASE_URL = "https://api-agendador.onrender.com/api/v1"; 

// Estrutura padrão para inicializar o estado
const DIAS_DA_SEMANA = [
    { name: "Segunda-feira", dbKey: "monday" }, 
    { name: "Terça-feira", dbKey: "tuesday" }, 
    { name: "Quarta-feira", dbKey: "wednesday" }, 
    { name: "Quinta-feira", dbKey: "thursday" }, 
    { name: "Sexta-feira", dbKey: "friday" }, 
    { name: "Sábado", dbKey: "saturday" }, 
    { name: "Domingo", dbKey: "sunday" }
];

function HorariosPage() {
    const { salaoId } = useParams();
    // O estado agora é simplificado, usando os campos do modelo do backend
    const [diasTrabalho, setDiasTrabalho] = useState([]); // Array de strings (dbKey)
    const [horarioInicio, setHorarioInicio] = useState("09:00");
    const [horarioFim, setHorarioFim] = useState("18:00");
    
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    // --- Lógica de Busca (GET) ---
    const fetchHorarios = useCallback(async () => {
        if (!salaoId) { setError("ID do Salão não encontrado."); setLoading(false); return; }
        
        const currentUser = auth.currentUser;
        if (!currentUser) { setError("Sessão expirada. Faça login novamente."); setLoading(false); return; }
        const token = await currentUser.getIdToken(); 

        setLoading(true);
        setError(null);
        
        try {
            // Busca os detalhes COMPLETOs do salão
            const response = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const data = response.data;
            
            // 1. Atualiza os dias de trabalho (array de strings)
            setDiasTrabalho(data.dias_trabalho || []);
            // 2. Atualiza os horários
            setHorarioInicio(data.horario_inicio || "09:00");
            setHorarioFim(data.horario_fim || "18:00");

        } catch (err) {
            console.error("Erro ao buscar horários:", err.response?.data?.detail || err.message);
            setError("Não foi possível carregar os horários. Verifique a autenticação.");
        } finally {
            setLoading(false);
        }
    }, [salaoId]);

    useEffect(() => {
        fetchHorarios();
    }, [fetchHorarios]);

    // --- Lógica de Manipulação do Formulário ---
    const handleToggle = (dbKey) => {
        setDiasTrabalho(prev => 
            prev.includes(dbKey)
            ? prev.filter(key => key !== dbKey) // Se já está aberto, fecha
            : [...prev, dbKey] // Se está fechado, abre
        );
    };

    const handleTimeChange = (value) => {
        // Validação simples de tempo (HH:MM)
        if (value.length === 5 && value.includes(':')) {
            setHorarioInicio(value);
        }
    };
    
    // --- Lógica de Salvamento (PUT) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        // Validação simples
        if (diasTrabalho.length === 0) {
            setError("Seu salão não pode estar fechado todos os dias!");
            setIsSaving(false);
            return;
        }
        if (horarioInicio >= horarioFim) {
             setError("O horário de início deve ser anterior ao horário de fim.");
             setIsSaving(false);
             return;
        }

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Sessão expirada.");
            const token = await currentUser.getIdToken(); 

            // 1. Busca os dados COMPLETOs do salão para não perder outras configurações
            const salonResponse = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const salonData = salonResponse.data;
            
            // 2. Prepara o payload para o PUT, atualizando os campos do backend
            const payload = {
                ...salonData, 
                id: salaoId, 
                dias_trabalho: diasTrabalho, // Array de chaves do DB
                horario_inicio: horarioInicio,
                horario_fim: horarioFim,
            };
            
            // 3. Envia o PUT
            await axios.put(`${API_BASE_URL}/admin/clientes/${salaoId}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            alert("Horários salvos com sucesso!");

        } catch (err) {
            console.error("Erro ao salvar horários:", err.response?.data?.detail || err.message);
            setError("Falha ao salvar horários. Tente novamente.");
        } finally {
            setIsSaving(false);
        }
    };
    
    // --- Renderização ---
    if (loading) {
        return (
            <Card className="p-6 text-center shadow min-h-[300px] flex items-center justify-center">
                 <Loader2 className="h-6 w-6 animate-spin text-purple-600 mx-auto mb-2" />
                 <p className="text-gray-600">Carregando horários...</p>
            </Card>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg shadow">
                <h3 className="font-semibold mb-2">Erro</h3>
                <p className="flex items-center"><AlertTriangle className="w-5 h-5 mr-2"/> {error}</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <CalendarDays className="w-6 h-6 mr-3 text-purple-600" />
                Configurar Horário de Funcionamento
            </h2>

            <Card className="p-6 shadow-lg">
                <form onSubmit={handleSubmit}>
                    
                    {/* Campos de Horário Padrão */}
                    <div className="flex justify-between items-center mb-6 pb-4 border-b">
                        <p className="font-semibold text-gray-700">Horário Padrão:</p>
                        <div className="flex space-x-3 items-center">
                            <input
                                type="time"
                                value={horarioInicio}
                                onChange={(e) => setHorarioInicio(e.target.value)}
                                className="border border-gray-300 rounded-md p-2 text-center text-sm"
                                disabled={isSaving}
                                required
                            />
                            <span className="text-gray-500">às</span>
                            <input
                                type="time"
                                value={horarioFim}
                                onChange={(e) => setHorarioFim(e.target.value)}
                                className="border border-gray-300 rounded-md p-2 text-center text-sm"
                                disabled={isSaving}
                                required
                            />
                        </div>
                    </div>


                    {/* Toggles dos Dias da Semana */}
                    <div className="space-y-4">
                        <p className="font-semibold text-gray-700 mb-2">Dias de Trabalho:</p>
                        {DIAS_DA_SEMANA.map((item) => (
                            <div key={item.dbKey} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                                
                                <label htmlFor={`toggle-${item.dbKey}`} className={`font-medium ${diasTrabalho.includes(item.dbKey) ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {item.name}
                                </label>

                                {/* Switch (Toggle) */}
                                <input
                                    type="checkbox"
                                    id={`toggle-${item.dbKey}`}
                                    checked={diasTrabalho.includes(item.dbKey)}
                                    onChange={() => handleToggle(item.dbKey)}
                                    disabled={isSaving}
                                    // Usando classes Tailwind para estilizar o switch nativo
                                    className="h-6 w-11 rounded-full appearance-none bg-gray-200 checked:bg-green-500 transition duration-200 cursor-pointer"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Mensagem de Erro e Botão Salvar */}
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
                            {isSaving ? 'Salvando...' : 'Salvar Horários'}
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
}

export default HorariosPage;