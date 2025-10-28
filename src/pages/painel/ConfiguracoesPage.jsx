// frontend/src/pages/painel/ConfiguracoesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
// import { Card } from '@/ui/card'; // Usaremos divs
import { Settings, Loader2, Save, Lock, Mail, AlertTriangle, CheckCircle, ExternalLink, XCircle } from 'lucide-react'; // Adicionado XCircle
import { auth, db } from '@/firebaseConfig';
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore"; // Adicionado updateDoc
import axios from 'axios';

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

function ConfiguracoesPage() {
    const { salaoId } = useParams();
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSavingPassword, setIsSavingPassword] = useState(false); // Renomeado para clareza
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isSyncEnabled, setIsSyncEnabled] = useState(false);
    const [isSyncLoading, setIsSyncLoading] = useState(false); // Usado para conectar e desconectar
    const [searchParams, setSearchParams] = useSearchParams();

    // --- Lógica de Busca ---
    const fetchUserData = useCallback(async () => {
        // ... (lógica fetchUserData existente, sem alterações funcionais) ...
         setLoading(true); setError(null); setSuccess(null);
         const currentUser = auth.currentUser;
         if (!currentUser) { setError("Sessão expirada."); setLoading(false); return; }

         try {
            setEmail(currentUser.email || '');
            const salaoDocRef = doc(db, 'cabeleireiros', salaoId);
            // Usando getDoc uma vez para a carga inicial, onSnapshot pode ser overkill aqui
            // a menos que você queira que o status mude se outro admin mexer.
            // Por simplicidade, vamos usar getDoc. Se precisar de tempo real, volte para onSnapshot.
            const docSnap = await getDoc(salaoDocRef);
             if (docSnap.exists()) {
                 const data = docSnap.data();
                 setIsSyncEnabled(data.google_sync_enabled === true);
             } else { console.warn("Documento do salão não encontrado."); }

            // Verifica params da URL
            if (searchParams.get('sync') === 'success') {
                setSuccess("Sincronização com Google Calendar ativada!");
                setIsSyncEnabled(true); // Força atualização visual imediata
                searchParams.delete('sync'); setSearchParams(searchParams);
            } else if (searchParams.get('sync') === 'error') {
                setError("Falha ao sincronizar com Google Calendar.");
                searchParams.delete('sync'); setSearchParams(searchParams);
            }
         } catch (err) { setError("Não foi possível carregar as configurações.");
         } finally { setLoading(false); }
    }, [salaoId, searchParams, setSearchParams]);

    useEffect(() => { fetchUserData(); }, [fetchUserData]);

    // --- Lógica de Alteração de Senha ---
    const handleSubmitPassword = async (e) => {
        // ... (lógica handleSubmitPassword existente, trocando isSaving por isSavingPassword) ...
         e.preventDefault();
         setIsSavingPassword(true); setError(null); setSuccess(null);
         const currentUser = auth.currentUser;
         if (!currentUser) { setError("Sessão expirada."); setIsSavingPassword(false); return; }
         if (newPassword && newPassword !== confirmPassword) { setError("As novas senhas não coincidem."); setIsSavingPassword(false); return; }
         if (newPassword && newPassword.length < 6) { setError("Nova senha muito curta (mínimo 6 caracteres)."); setIsSavingPassword(false); return; }
         if (!currentPassword) { setError("Senha atual é obrigatória para alterar."); setIsSavingPassword(false); return; }
         // Não permite salvar se a nova senha estiver vazia (usuário só quer testar a atual?)
         if (!newPassword) { setError("Digite a nova senha."); setIsSavingPassword(false); return;}


         try {
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, newPassword);
            setSuccess("Senha da conta atualizada com sucesso!");
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
         } catch (err) {
            if (err.code === 'auth/wrong-password') { setError("Senha atual incorreta."); }
            else { setError("Falha ao alterar senha."); }
         } finally { setIsSavingPassword(false); }
    };

    // --- Lógica: Iniciar Sincronização Google ---
    const handleGoogleSync = async () => {
        // ... (lógica handleGoogleSync existente, usando axios para pegar URL) ...
         setIsSyncLoading(true); setError(null);
         try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Sessão expirada.");
            const token = await currentUser.getIdToken();
            // Assumindo que o backend RETORNA a URL de autorização
            const response = await axios.get(`${API_BASE_URL}/admin/google/auth/start`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const { authorization_url } = response.data;
            if (authorization_url) {
                window.location.href = authorization_url; // Redireciona
            } else {
                 throw new Error("URL de autorização não recebida.");
            }
         } catch (err) {
             setError("Não foi possível iniciar a conexão com o Google.");
             setIsSyncLoading(false);
         }
         // Não seta isSyncLoading para false aqui, pois a página será redirecionada
    };

    // --- <<< ADICIONADO: Lógica Desconectar Sincronização >>> ---
    const handleDisableSync = async () => {
        if (!window.confirm("Tem certeza que deseja desconectar o Google Calendar? Você pode reconectar depois.")) {
            return;
        }
        setIsSyncLoading(true); // Reutiliza o estado de loading
        setError(null);
        setSuccess(null);

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Sessão expirada.");
            const token = await currentUser.getIdToken();

            // --- PONTO IMPORTANTE: BACKEND ---
            // Você PRECISA criar este endpoint no seu backend (admin_routes.py)
            // Método: PATCH (ou DELETE, se preferir)
            // Rota: Ex: /admin/google/auth/disconnect/{salaoId} ou /admin/clientes/{salaoId}/google-sync
            // Lógica do Backend:
            // 1. Autenticar usuário
            // 2. Pegar salaoId da URL
            // 3. Usar `db.collection('cabeleireiros').document(salaoId).update({...})` para:
            //    - `google_sync_enabled: False`
            //    - `google_refresh_token: firestore.DELETE_FIELD` (ou None)
            // 4. Retornar sucesso (ex: status 200 ou 204)

            // Chamada ao endpoint (EXEMPLO com PATCH)
            await axios.patch(`${API_BASE_URL}/admin/clientes/${salaoId}/google-sync`,
                { enabled: false }, // Corpo simples indicando a desativação
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Se chegou aqui, o backend atualizou o Firestore
            setIsSyncEnabled(false); // Atualiza a UI
            setSuccess("Sincronização com Google Calendar desativada.");

        } catch (err) {
            console.error("Erro ao desconectar Google Calendar:", err);
            setError("Não foi possível desconectar a sincronização. Tente novamente.");
        } finally {
            setIsSyncLoading(false);
        }
    };
    // --- <<< FIM DA ADIÇÃO >>> ---

    // --- Renderização Loading/Error ---
    if (loading) {
        return (
             // <<< ALTERADO: Card e Spinner Ciano >>>
            <div className="p-6 text-center bg-white rounded-lg shadow-md border border-gray-200 min-h-[300px] flex flex-col items-center justify-center font-sans">
                <Loader2 className={`h-8 w-8 animate-spin ${CIANO_COLOR_TEXT} mb-3`} />
                <p className="text-gray-600">Carregando configurações...</p>
            </div>
        );
     }
    // Mostra erro GERAL se houver E não estiver carregando ou salvando senha
    const showError = error && !loading && !isSavingPassword && !isSyncLoading;

    return (
        // Adicionado font-sans
        <div className="max-w-3xl mx-auto font-sans space-y-8">
             {/* <<< ALTERADO: Título com Ícone Ciano >>> */}
            <h2 className={`text-2xl font-bold text-gray-900 flex items-center ${CIANO_COLOR_TEXT}`}>
                <Icon icon={Settings} className="w-6 h-6 mr-3" />
                Configurações da Conta e Sincronização
            </h2>

            {/* Mensagens Globais */}
            {showError && (
                 <div className="p-4 bg-red-100 text-red-700 rounded-lg shadow border border-red-200 flex items-center gap-2">
                    <Icon icon={AlertTriangle} className="w-5 h-5 flex-shrink-0"/> <p>{error}</p>
                 </div>
            )}
            {success && (
                 <div className="p-4 bg-green-100 text-green-700 rounded-lg shadow border border-green-200 flex items-center gap-2">
                     <Icon icon={CheckCircle} className="w-5 h-5 flex-shrink-0"/> <p>{success}</p>
                 </div>
            )}

            {/* --- SEÇÃO GOOGLE CALENDAR --- */}
             {/* <<< ALTERADO: Card com bg-white, shadow-sm, border >>> */}
            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-100"> {/* Ajustado estilo título */}
                    Sincronização com Google Calendar
                </h3>
                {isSyncEnabled ? (
                    // Estado Conectado
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <Icon icon={CheckCircle} className="w-12 h-12 text-green-500 mx-auto mb-3" /> {/* Aumentado ícone */}
                        <p className="font-semibold text-green-800">Sincronização Ativa!</p>
                        <p className="text-sm text-gray-600 mt-1 mb-4">
                            Sua agenda Horalis está conectada ao seu Google Calendar.
                        </p>
                         {/* <<< ALTERADO: Botão Desconectar Vermelho >>> */}
                        <button
                            onClick={handleDisableSync}
                            disabled={isSyncLoading} // Desabilita durante o processo
                            className="inline-flex items-center justify-center px-4 py-1.5 bg-red-600 text-white rounded-md text-xs font-medium shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            {isSyncLoading ? <Loader2 className="w-4 h-4 animate-spin stroke-current" /> : <Icon icon={XCircle} className="w-4 h-4 mr-1"/>}
                            {isSyncLoading ? 'Desconectando...' : 'Desconectar'}
                        </button>
                    </div>
                ) : (
                    // Estado Desconectado
                    <div className="text-center p-4">
                        <p className="text-gray-600 mb-5 text-sm leading-relaxed"> {/* Ajustado texto */}
                            Conecte sua conta do Google Calendar para sincronizar seus eventos pessoais
                            e bloquear horários automaticamente na agenda Horalis, evitando conflitos.
                        </p>
                         {/* <<< ALTERADO: Botão Conectar Ciano >>> */}
                        <button
                            onClick={handleGoogleSync}
                            disabled={isSyncLoading}
                            className={`inline-flex items-center justify-center w-full max-w-xs mx-auto px-6 py-3 ${CIANO_COLOR_BG} text-white rounded-lg shadow-sm ${CIANO_COLOR_BG_HOVER} transition-colors disabled:opacity-50`}
                        >
                            {isSyncLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin stroke-current mr-2" />
                            ) : (
                                <Icon icon={ExternalLink} className="w-5 h-5 mr-2" />
                            )}
                            {isSyncLoading ? 'Aguardando Google...' : 'Conectar com Google Calendar'}
                        </button>
                    </div>
                )}
            </div>

            {/* --- SEÇÃO DADOS DE ACESSO (SENHA) --- */}
             {/* <<< ALTERADO: Card com bg-white, shadow-sm, border >>> */}
            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <form onSubmit={handleSubmitPassword}>
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-100">Dados de Acesso</h3>
                    <div className="space-y-4">
                        {/* E-mail (Somente Leitura) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail (Login)</label>
                             {/* <<< ALTERADO: Input simulado com bg-gray-50 >>> */}
                            <div className="flex items-center border border-gray-300 rounded-md p-2 h-10 bg-gray-50 text-gray-500">
                                <Icon icon={Mail} className="w-5 h-5 mr-2"/>
                                <span className="text-gray-900 font-medium truncate">{email}</span> {/* Adicionado truncate */}
                            </div>
                        </div>

                        <h4 className="font-medium text-gray-700 pt-4 border-t border-gray-100 !mt-6">Alterar Senha</h4> {/* Adicionado !mt-6 */}

                        {/* Senha Atual */}
                        <div>
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">Senha Atual*</label>
                            <div className="relative">
                               <Icon icon={Lock} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                                {/* <<< ALTERADO: Foco Ciano >>> */}
                               <input id="currentPassword" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                                      className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} h-10 sm:text-sm`}
                                      disabled={isSavingPassword} placeholder="Sua senha atual"/>
                           </div>
                        </div>
                        {/* Nova Senha */}
                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                             <div className="relative">
                               <Icon icon={Lock} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                                {/* <<< ALTERADO: Foco Ciano >>> */}
                               <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                                      className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} h-10 sm:text-sm`}
                                      disabled={isSavingPassword} placeholder="Mínimo 6 caracteres"/>
                           </div>
                        </div>
                        {/* Confirmar Nova Senha */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                             <div className="relative">
                               <Icon icon={Lock} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                                {/* <<< ALTERADO: Foco Ciano (erro mantém vermelho) >>> */}
                               <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                      className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-1 h-10 sm:text-sm ${
                                        newPassword && confirmPassword && newPassword !== confirmPassword
                                        ? 'border-red-500 focus:ring-red-400 focus:border-red-500'
                                        : `border-gray-300 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`
                                      }`}
                                      disabled={isSavingPassword} placeholder="Repita a nova senha"/>
                           </div>
                        </div>
                    </div>

                    {/* Botão Salvar Senha */}
                    <div className="flex justify-end pt-6 border-t border-gray-100 mt-6">
                        <button
                            type="submit"
                             // <<< ALTERADO: Botão Ciano >>>
                            className={`flex items-center px-6 py-2.5 ${CIANO_COLOR_BG} text-white rounded-lg shadow-sm ${CIANO_COLOR_BG_HOVER} transition-colors disabled:opacity-50`}
                            // Desabilita se salvando OU se o campo nova senha estiver vazio
                            disabled={isSavingPassword || !newPassword.trim()}
                        >
                            {isSavingPassword ? ( <Loader2 className="w-5 h-5 animate-spin stroke-current mr-2" /> ) : ( <Icon icon={Save} className="w-5 h-5 mr-2" /> )}
                            {isSavingPassword ? 'Salvando...' : 'Alterar Senha'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ConfiguracoesPage;