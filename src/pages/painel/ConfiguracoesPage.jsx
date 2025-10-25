// frontend/src/pages/painel/ConfiguracoesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom'; // Adicionado useSearchParams
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth"; 
import { Card } from '@/ui/card';
import { Settings, Loader2, Save, User, Lock, Mail, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'; // Adicionados ícones
import { auth, db } from '@/firebaseConfig'; // Importa auth e db
import { doc, getDoc, onSnapshot } from "firebase/firestore"; // Para verificar o status da sincronização
import axios from 'axios';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1"; 

function ConfiguracoesPage() {
    const { salaoId } = useParams();
    
    // Estados do formulário de senha
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState(''); 
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null); 

    // --- NOVOS ESTADOS PARA SINCRONIZAÇÃO ---
    const [isSyncEnabled, setIsSyncEnabled] = useState(false);
    const [isSyncLoading, setIsSyncLoading] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams(); // Para ler ?sync=success
    // --- FIM DOS NOVOS ESTADOS ---

    // --- Lógica de Busca (GET) ---
    // Busca o email do usuário E o status da sincronização
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
            // 1. Busca o email do Auth
            setEmail(currentUser.email || '');

            // 2. Ouve (onSnapshot) o documento do salão para o status da sincronização
            const salaoDocRef = doc(db, 'cabeleireiros', salaoId);
            const unsubscribe = onSnapshot(salaoDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setIsSyncEnabled(data.google_sync_enabled === true);
                } else {
                    console.warn("Documento do salão não encontrado no Firestore.");
                }
            });
            
            // 3. Verifica se a URL tem ?sync=success (retorno do OAuth)
            if (searchParams.get('sync') === 'success') {
                setSuccess("Sincronização com Google Calendar ativada com sucesso!");
                searchParams.delete('sync'); // Limpa a URL
                setSearchParams(searchParams);
            } else if (searchParams.get('sync') === 'error') {
                setError("Falha ao sincronizar com Google Calendar. Tente novamente.");
                searchParams.delete('sync'); // Limpa a URL
                setSearchParams(searchParams);
            }
            
            return unsubscribe; // Retorna a função de cleanup do listener

        } catch (err) {
            console.error("Erro ao carregar dados do usuário:", err);
            setError("Não foi possível carregar as configurações da conta.");
        } finally {
            setLoading(false);
        }
    }, [salaoId, searchParams, setSearchParams]);

    useEffect(() => {
        let unsubscribe;
        fetchUserData().then(cleanup => {
            unsubscribe = cleanup;
        });
        
        // Função de cleanup do useEffect
        return () => {
            if (unsubscribe) {
                unsubscribe(); // Para o listener do Firestore
            }
        };
    }, [fetchUserData]); // Re-executa se fetchUserData mudar

    // --- Lógica de Alteração de Senha (PUT para Senha) ---
    const handleSubmitPassword = async (e) => {
        // ... (código da handleSubmit, reauthenticateWithCredential, updatePassword) ...
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        setSuccess(null);
        
        const currentUser = auth.currentUser;
        if (!currentUser) { /* ... (tratamento de erro) ... */ return; }

        // Validações
        if (newPassword.length > 0 && newPassword !== confirmPassword) { /* ... */ }
        if (newPassword.length > 0 && newPassword.length < 6) { /* ... */ }
        if (newPassword.length === 0) { /* ... */ }
        if (!currentPassword) { /* ... */ }

        try {
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, newPassword);
            setSuccess("Senha da conta atualizada com sucesso!");
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err) {
            console.error("Erro ao salvar senha:", err.message);
            if (err.code === 'auth/wrong-password') {
                setError("A senha atual fornecida está incorreta.");
            } else { setError("Falha ao alterar senha. Por favor, tente novamente."); }
        } finally {
            setIsSaving(false);
        }
    };
    
    // --- NOVA LÓGICA: Iniciar Sincronização com Google ---
    const handleGoogleSync = async () => {
        setIsSyncLoading(true);
        setError(null);
        
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Sessão expirada.");
            const token = await currentUser.getIdToken(); 

            // 1. Chama o endpoint de INÍCIO do OAuth2
            const response = await axios.get(`${API_BASE_URL}/admin/google/auth/start`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // 2. O backend respondeu com a URL de autorização do Google
            // (Isso geralmente acontece se o fetch for feito com 'manual' redirect)
            // Mas como estamos usando 'axios', o backend (FastAPI) já deve ter retornado 307
            // e o axios pode ter o URL final.
            // Para garantir, vamos assumir que a API retorna um JSON com a URL.
            
            // --- Ajuste no backend admin_routes.py ---
            // O backend deve retornar um JSON, não um RedirectResponse para o axios
            // Se o backend RETORNA a URL:
            // const { authorization_url } = response.data;
            // window.location.href = authorization_url; // Redireciona o usuário
            
            // SE O BACKEND REDIRECIONA (307), o axios falha.
            // A forma mais fácil é mudar o frontend para NÃO USAR AXIOS para isso:
            
            // 3. Redireciona o navegador diretamente para o endpoint de início
            const authUrl = `${API_BASE_URL}/admin/google/auth/start`;
            // Anexa o token no cabeçalho (não é trivial para um redirecionamento)
            
            // --- Abordagem Mais Simples ---
            // Abrir a URL de autenticação (que é protegida) numa nova aba
            // O navegador enviará o token (se estivermos usando cookies de auth)
            // Mas não estamos.
            
            // --- CORREÇÃO DE LÓGICA ---
            // O endpoint /admin/google/auth/start precisa do token.
            // A forma mais fácil é o *frontend* montar a URL de auth? Não.
            // A forma mais fácil é o AXIOS pegar a URL do redirect.
            
            // Vamos assumir que o backend (FastAPI) retorna a URL num JSON:
            // (Isto requer uma MUDANÇA no backend/admin_routes.py)
            
            // --- ASSUMINDO QUE O BACKEND JÁ FOI CORRIGIDO (próximo passo) ---
            const { authorization_url } = response.data;
            window.location.href = authorization_url; // Redireciona o usuário para o Google
            
        } catch (err) {
             console.error("Erro ao iniciar sincronização:", err);
             setError("Não foi possível conectar ao Google. Tente novamente.");
             setIsSyncLoading(false);
        }
    };
    // --- FIM DA NOVA LÓGICA ---
    
    // --- Renderização ---
    if (loading) { /* ... JSX de Loading ... */ }

    return (
        <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Settings className="w-6 h-6 mr-3 text-gray-600" />
                Configurações da Conta
            </h2>

            {/* Mensagens de Sucesso/Erro Globais */}
            {error && (
                <div className="p-4 mb-4 bg-red-100 text-red-700 rounded-lg shadow">
                     <p className="flex items-center"><AlertTriangle className="w-5 h-5 mr-2"/> {error}</p>
                </div>
            )}
            {success && (
                <div className="p-4 mb-4 bg-green-100 text-green-700 rounded-lg shadow">
                     <p className="flex items-center"><CheckCircle className="w-5 h-5 mr-2"/> {success}</p>
                </div>
            )}

            {/* --- SEÇÃO DE SINCRONIZAÇÃO GOOGLE CALENDAR --- */}
            <Card className="p-6 shadow-lg mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">
                    Sincronização com Google Calendar
                </h3>
                {isSyncEnabled ? (
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
                        <p className="font-semibold text-green-800">Sincronização Ativa!</p>
                        <p className="text-sm text-gray-600 mt-1">
                            Sua agenda Horalis está conectada ao seu Google Calendar.
                        </p>
                        <button 
                            className="mt-4 text-xs text-red-600 hover:underline"
                            // onClick={handleDisableSync} // (Função futura)
                        >
                            Desconectar
                        </button>
                    </div>
                ) : (
                    <div className="text-center p-4">
                        <p className="text-gray-600 mb-4">
                            Conecte sua conta do Google Calendar para sincronizar seus eventos pessoais
                            e bloquear horários na sua agenda Horalis automaticamente.
                        </p>
                        <button
                            onClick={handleGoogleSync}
                            disabled={isSyncLoading}
                            className="flex items-center justify-center w-full max-w-xs mx-auto px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {isSyncLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <ExternalLink className="w-5 h-5 mr-2" /> // Ícone do Google
                            )}
                            {isSyncLoading ? 'Aguardando Google...' : 'Conectar com Google'}
                        </button>
                    </div>
                )}
            </Card>
            {/* --- FIM DA SEÇÃO GOOGLE --- */}


            <Card className="p-6 shadow-lg">
                <form onSubmit={handleSubmitPassword}>
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

                        {/* --- Campos de Senha (como antes) --- */}
                        <h4 className="font-medium text-gray-700 pt-4 border-t border-gray-100">Alterar Senha</h4>
                        <div>
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">Senha Atual*</label>
                             <div className="mt-1 flex items-center border border-gray-300 rounded-md p-2">
                                <Lock className="w-5 h-5 mr-2 text-gray-500"/>
                                <input id="currentPassword" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full focus:outline-none" disabled={isSaving} placeholder="Sua senha atual"/>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Nova Senha</label>
                             <div className="mt-1 flex items-center border border-gray-300 rounded-md p-2">
                                <Lock className="w-5 h-5 mr-2 text-gray-500"/>
                                <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full focus:outline-none" disabled={isSaving} placeholder="Mínimo 6 caracteres"/>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
                             <div className="mt-1 flex items-center border border-gray-300 rounded-md p-2">
                                <Lock className="w-5 h-5 mr-2 text-gray-500"/>
                                <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full focus:outline-none" disabled={isSaving} placeholder="Repita a nova senha"/>
                            </div>
                        </div>
                    </div>
                    {/* FIM SEÇÃO DADOS DA CONTA */}

                    <div className="flex justify-end pt-6 border-t mt-6">
                        <button
                            type="submit"
                            className="flex items-center px-6 py-2 bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700 transition-colors disabled:opacity-50"
                            disabled={isSaving || (newPassword.length === 0)} 
                        >
                            {isSaving ? ( <Loader2 className="w-5 h-5 animate-spin mr-2" /> ) : ( <Save className="w-5 h-5 mr-2" /> )}
                            {isSaving ? 'Salvando...' : 'Alterar Senha'}
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
}

export default ConfiguracoesPage;