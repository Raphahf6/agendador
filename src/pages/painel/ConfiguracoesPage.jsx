// frontend/src/pages/painel/ConfiguracoesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
// Adicionado os módulos do Firebase para reautenticação
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth"; 
import { Card } from '@/ui/card';
import { Settings, Loader2, Save, User, Lock, Mail, AlertTriangle } from 'lucide-react'; 
import { auth } from '@/firebaseConfig';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1"; 

function ConfiguracoesPage() {
    const { salaoId } = useParams();
    
    // Estado para os dados visíveis e editáveis
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState(''); // <<< NOVO CAMPO
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null); 

    // --- Lógica de Busca (GET) ---
    const fetchUserData = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        
        const currentUser = auth.currentUser;

        if (!currentUser) { 
            setError("Sessão expirada. Faça login novamente."); 
            setLoading(false); 
            return; 
        }
        
        try {
            // O email vem diretamente do objeto de usuário do Firebase
            setEmail(currentUser.email || '');

        } catch (err) {
            console.error("Erro ao carregar dados do usuário:", err);
            setError("Não foi possível carregar o e-mail da conta.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    // --- Lógica de Salvamento (PUT para Senha) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        setSuccess(null);
        
        const currentUser = auth.currentUser;
        if (!currentUser) {
             setError("Sessão expirada. Faça login novamente.");
             setIsSaving(false);
             return;
        }

        // 1. Validações de Nova Senha
        if (newPassword.length === 0) {
             setError("Por favor, digite a nova senha.");
             setIsSaving(false);
             return;
        }
        if (newPassword !== confirmPassword) {
            setError("As novas senhas não coincidem.");
            setIsSaving(false);
            return;
        }
        if (newPassword.length < 6) {
            setError("A nova senha deve ter no mínimo 6 caracteres.");
            setIsSaving(false);
            return;
        }
        if (!currentPassword) {
             setError("Por favor, digite sua senha atual para confirmar a alteração.");
             setIsSaving(false);
             return;
        }

        try {
            // 2. Cria uma credencial com a senha atual (para reautenticação)
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);

            // 3. REAUTENTICAÇÃO: Verifica se a senha atual está correta e se o login é recente.
            // Esta é a etapa de segurança obrigatória
            await reauthenticateWithCredential(currentUser, credential);
            console.log("Reautenticação bem-sucedida. Prosseguindo com a troca de senha.");

            // 4. TROCA DE SENHA (Apenas se a reautenticação for bem-sucedida)
            await updatePassword(currentUser, newPassword);

            setSuccess("Senha da conta atualizada com sucesso!");
            
            // Limpa os campos
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

        } catch (err) {
            console.error("Erro ao salvar senha:", err.message);
            if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError("A senha atual fornecida está incorreta.");
            } else if (err.code === 'auth/user-mismatch' || err.code === 'auth/user-disabled') {
                setError("Erro de autenticação. Por favor, tente novamente.");
            } else {
                setError("Falha ao alterar senha. Por favor, tente novamente.");
            }
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
                <p className="flex items-center"><AlertTriangle className="w-5 h-5 mr-2"/> {error}</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Settings className="w-6 h-6 mr-3 text-gray-600" />
                Configurações da Conta
            </h2>

            <Card className="p-6 shadow-lg">
                <form onSubmit={handleSubmit}>
                    
                    {/* SEÇÃO DADOS DA CONTA */}
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">Dados de Acesso</h3>
                    
                    <div className="space-y-4">
                        {/* Campo E-mail (Somente Leitura) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">E-mail (Login)</label>
                            <div className="mt-1 flex items-center border border-gray-300 rounded-md p-2 bg-gray-50">
                                <Mail className="w-5 h-5 mr-2 text-gray-500"/>
                                <span className="text-gray-900 font-medium">{email}</span>
                            </div>
                        </div>

                        {/* --- NOVO CAMPO: SENHA ATUAL --- */}
                        <h4 className="font-medium text-gray-700 pt-4 border-t border-gray-100">Alterar Senha</h4>
                        
                        <div>
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">Senha Atual*</label>
                             <div className="mt-1 flex items-center border border-gray-300 rounded-md p-2">
                                <Lock className="w-5 h-5 mr-2 text-gray-500"/>
                                <input
                                    id="currentPassword" type="password" required
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full focus:outline-none"
                                    disabled={isSaving}
                                    placeholder="Sua senha atual"
                                />
                            </div>
                        </div>
                        {/* --- FIM NOVO CAMPO --- */}


                        {/* Campo Nova Senha */}
                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Nova Senha</label>
                             <div className="mt-1 flex items-center border border-gray-300 rounded-md p-2">
                                <Lock className="w-5 h-5 mr-2 text-gray-500"/>
                                <input
                                    id="newPassword" type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full focus:outline-none"
                                    disabled={isSaving}
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                        </div>

                        {/* Campo Confirmar Nova Senha */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
                             <div className="mt-1 flex items-center border border-gray-300 rounded-md p-2">
                                <Lock className="w-5 h-5 mr-2 text-gray-500"/>
                                <input
                                    id="confirmPassword" type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full focus:outline-none"
                                    disabled={isSaving}
                                    placeholder="Repita a nova senha"
                                />
                            </div>
                        </div>
                    </div>
                    {/* FIM SEÇÃO DADOS DA CONTA */}


                    {/* Mensagem de Erro e Botão Salvar */}
                    {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
                    {success && <p className="text-sm text-green-600 mt-4">{success}</p>}

                    <div className="flex justify-end pt-6 border-t mt-6">
                        <button
                            type="submit"
                            className="flex items-center px-6 py-2 bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700 transition-colors disabled:opacity-50"
                            // Desabilita se estiver salvando OU se a nova senha estiver vazia
                            disabled={isSaving || (newPassword.length === 0)} 
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <Save className="w-5 h-5 mr-2" />
                            )}
                            {isSaving ? 'Salvando...' : 'Alterar Senha'}
                        </button>
                    </div>
                </form>
            </Card>

            {/* SEÇÃO OUTRAS CONFIGURAÇÕES (Placeholder) */}
            <Card className="p-6 shadow-lg mt-6 bg-gray-50">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Integrações e Faturamento</h3>
                <p className="text-sm text-gray-600">
                    Aqui, no futuro, você poderá gerenciar integrações com Google Agenda (sincronização opcional) e o status da sua subscrição mensal.
                </p>
            </Card>
        </div>
    );
}

export default ConfiguracoesPage;