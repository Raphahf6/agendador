// frontend/src/pages/painel/ConfiguracoesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { Settings, Loader2, Save, Lock, Mail, AlertTriangle, CheckCircle, ExternalLink, XCircle, Key, DollarSign } from 'lucide-react'; // Adicionado DollarSign
import { auth, db } from '@/firebaseConfig';
import { doc, getDoc, updateDoc } from "firebase/firestore"; 
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

const CIANO_COLOR_TEXT = 'text-cyan-600';
const CIANO_COLOR_BG = 'bg-cyan-800';
const CIANO_COLOR_BG_HOVER = 'hover:bg-cyan-700';
const CIANO_RING_FOCUS = 'focus:ring-cyan-400';
const CIANO_BORDER_FOCUS = 'focus:border-cyan-400';

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

function ConfiguracoesPage() {
    const { salaoId } = useParams();
    
    // Estados de Autenticação e Senha
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // <<< ESTADOS PARA PAGAMENTO >>>
    const [mpPublicKey, setMpPublicKey] = useState('');
    const [sinalValor, setSinalValor] = useState(0); // Valor do Sinal
    const [isSavingPagamento, setIsSavingPagamento] = useState(false);
    // --- Fim dos Estados ---

    // Estados de UI
    const [loading, setLoading] = useState(true);
    const [isSavingPassword, setIsSavingPassword] = useState(false); 
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isSyncEnabled, setIsSyncEnabled] = useState(false);
    const [isSyncLoading, setIsSyncLoading] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    // --- Lógica de Busca (MODIFICADA para incluir a Chave Pública e Sinal) ---
    const fetchUserData = useCallback(async () => {
         setLoading(true); setError(null); setSuccess(null);
         const currentUser = auth.currentUser;
         if (!currentUser) { setError("Sessão expirada."); setLoading(false); return; }

         try {
            setEmail(currentUser.email || '');
            const salaoDocRef = doc(db, 'cabeleireiros', salaoId);
            
            const docSnap = await getDoc(salaoDocRef);
             if (docSnap.exists()) {
                 const data = docSnap.data();
                 setIsSyncEnabled(data.google_sync_enabled === true);
                 
                 // Carrega os dados de pagamento
                 setMpPublicKey(data.mp_public_key || '');
                 setSinalValor(data.sinal_valor || 0); // Carrega o valor do sinal
                 
             } else { console.warn("Documento do salão não encontrado."); }

             // Verifica params da URL (Sincronização Google)
             if (searchParams.get('sync') === 'success') {
                 setSuccess("Sincronização com Google Calendar ativada!");
                 setIsSyncEnabled(true);
                 searchParams.delete('sync'); setSearchParams(searchParams);
             } else if (searchParams.get('sync') === 'error') {
                 setError("Falha ao sincronizar com Google Calendar.");
                 searchParams.delete('sync'); setSearchParams(searchParams);
             }
         } catch (err) { setError("Não foi possível carregar as configurações.");
         } finally { setLoading(false); }
    }, [salaoId, searchParams, setSearchParams]);

    useEffect(() => { fetchUserData(); }, [fetchUserData]);

    // --- Lógica de Alteração de Senha (Sem alteração) ---
    const handleSubmitPassword = async (e) => {
         e.preventDefault();
         setIsSavingPassword(true); setError(null); setSuccess(null);
         const currentUser = auth.currentUser;
         if (!currentUser) { setError("Sessão expirada."); setIsSavingPassword(false); return; }
         if (newPassword && newPassword !== confirmPassword) { setError("As novas senhas não coincidem."); setIsSavingPassword(false); return; }
         if (newPassword && newPassword.length < 6) { setError("Nova senha muito curta (mínimo 6 caracteres)."); setIsSavingPassword(false); return; }
         if (!currentPassword) { setError("Senha atual é obrigatória para alterar."); setIsSavingPassword(false); return; }
         if (!newPassword) { setError("Digite a nova senha."); setIsSavingPassword(false); return;}

         try {
             const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
             await reauthenticateWithCredential(currentUser, credential);
             await updatePassword(currentUser, newPassword);
             setSuccess("Senha da conta atualizada com sucesso!");
             toast.success("Senha atualizada!");
             setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
         } catch (err) {
             let errorMsg = "Falha ao alterar senha.";
             if (err.code === 'auth/wrong-password') { errorMsg = "Senha atual incorreta."; }
             setError(errorMsg);
             toast.error(errorMsg);
         } finally { setIsSavingPassword(false); }
    };
    
    // --- LÓGICA: Salvar Configurações de Pagamento (MODIFICADA) ---
    const handleSavePagamentos = async (e) => {
        e.preventDefault();
        setIsSavingPagamento(true);
        setError(null); setSuccess(null);
        
        const key = mpPublicKey.trim();
        const valor = parseFloat(sinalValor);

        // Validação da chave
        if (key && !key.startsWith('APP_USR-') && !key.startsWith('TEST-')) {
             setError("Chave pública do MercadoPago inválida. Deve começar com 'APP_USR-' ou 'TEST-'.");
             toast.error("Chave pública inválida.");
             setIsSavingPagamento(false);
             return;
        }
        
        if (isNaN(valor) || valor < 0) {
            setError("Valor do sinal inválido. Deve ser um número (ex: 10.50).");
            toast.error("Valor do sinal inválido.");
            setIsSavingPagamento(false);
            return;
        }

        try {
            const salaoDocRef = doc(db, 'cabeleireiros', salaoId);
            await updateDoc(salaoDocRef, {
                mp_public_key: key,
                sinal_valor: valor // Salva o valor numérico
            });

            setSuccess("Configurações de pagamento salvas!");
            toast.success("Configurações de pagamento salvas!");

        } catch (err) {
            console.error("Erro ao salvar configurações de pagamento:", err);
            setError("Falha ao salvar as configurações. Verifique suas regras de segurança do Firestore.");
            toast.error("Falha ao salvar configurações.");
        } finally {
            setIsSavingPagamento(false);
        }
    };
    // --- FIM DA LÓGICA ---


    // --- Lógica: Sincronização Google (Sem alteração) ---
    const handleGoogleSync = async () => {
         setIsSyncLoading(true); setError(null);
         try {
             const currentUser = auth.currentUser;
             if (!currentUser) throw new Error("Sessão expirada.");
             const token = await currentUser.getIdToken();
             const response = await axios.get(`${API_BASE_URL}/admin/google/auth/start`, {
                 headers: { Authorization: `Bearer ${token}` }
             });
             const { authorization_url } = response.data;
             if (authorization_url) {
                 window.location.href = authorization_url; 
             } else {
                throw new Error("URL de autorização não recebida.");
             }
         } catch (err) {
             setError("Não foi possível iniciar a conexão com o Google.");
             setIsSyncLoading(false);
         }
    };

    // --- Lógica Desconectar Sincronização (Sem alteração) ---
    const handleDisableSync = async () => {
        if (!window.confirm("Tem certeza que deseja desconectar o Google Calendar? Você pode reconectar depois.")) {
            return;
        }
        setIsSyncLoading(true); 
        setError(null);
        setSuccess(null);

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Sessão expirada.");
            const token = await currentUser.getIdToken();

            await axios.patch(`${API_BASE_URL}/admin/clientes/${salaoId}/google-sync`,
                { enabled: false }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setIsSyncEnabled(false); 
            setSuccess("Sincronização com Google Calendar desativada.");
            toast.success("Sincronização desativada.");

        } catch (err) {
            console.error("Erro ao desconectar Google Calendar:", err);
            setError("Não foi possível desconectar a sincronização. Tente novamente.");
            toast.error("Falha ao desconectar.");
        } finally {
            setIsSyncLoading(false);
        }
    };

    // --- Renderização Loading/Error ---
    if (loading) {
        return (
            <div className="p-6 text-center bg-white rounded-lg shadow-md border border-gray-200 min-h-[300px] flex flex-col items-center justify-center font-sans">
                <Loader2 className={`h-8 w-8 animate-spin ${CIANO_COLOR_TEXT} mb-3`} />
                <p className="text-gray-600">Carregando configurações...</p>
            </div>
        );
     }
    const showError = error && !loading && !isSavingPassword && !isSyncLoading && !isSavingPagamento;

    return (
        <div className="max-w-3xl mx-auto font-sans space-y-8">
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

            {/* --- SEÇÃO GOOGLE CALENDAR (Sem alteração) --- */}
            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-100">
                    Sincronização com Google Calendar
                </h3>
                {isSyncEnabled ? (
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <Icon icon={CheckCircle} className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <p className="font-semibold text-green-800">Sincronização Ativa!</p>
                        <p className="text-sm text-gray-600 mt-1 mb-4">
                            Sua agenda Horalis está conectada ao seu Google Calendar.
                        </p>
                        <button
                            onClick={handleDisableSync}
                            disabled={isSyncLoading}
                            className="inline-flex items-center justify-center px-4 py-1.5 bg-red-600 text-white rounded-md text-xs font-medium shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            {isSyncLoading ? <Loader2 className="w-4 h-4 animate-spin stroke-current" /> : <Icon icon={XCircle} className="w-4 h-4 mr-1"/>}
                            {isSyncLoading ? 'Desconectando...' : 'Desconectar'}
                        </button>
                    </div>
                ) : (
                    <div className="text-center p-4">
                        <p className="text-gray-600 mb-5 text-sm leading-relaxed">
                            Conecte sua conta do Google Calendar para sincronizar seus eventos pessoais
                            e bloquear horários automaticamente na agenda Horalis, evitando conflitos.
                        </p>
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
            
            {/* --- CARD DE PAGAMENTOS (MODIFICADO) --- */}
            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                 <form onSubmit={handleSavePagamentos}>
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-100">Configurações de Pagamento (MercadoPago)</h3>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Para aceitar pagamentos de sinal dos seus clientes, conecte sua conta do MercadoPago.
                        </p>
                        
                        {/* Campo Chave Pública */}
                        <div>
                            <label htmlFor="mpPublicKey" className="block text-sm font-medium text-gray-700 mb-1">Chave Pública (Public Key)*</label>
                            <div className="relative">
                                <Icon icon={Key} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                                <input id="mpPublicKey" type="text" required 
                                       value={mpPublicKey} 
                                       onChange={(e) => setMpPublicKey(e.target.value)}
                                       className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} h-10 sm:text-sm`}
                                       disabled={isSavingPagamento} 
                                       placeholder="APP_USR-..."
                                />
                            </div>
                        </div>
                        
                        {/* <<< NOVO CAMPO: Valor do Sinal >>> */}
                        <div>
                            <label htmlFor="sinalValor" className="block text-sm font-medium text-gray-700 mb-1">Valor do Sinal (R$)*</label>
                            <div className="relative">
                                <Icon icon={DollarSign} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                                <input 
                                    id="sinalValor" 
                                    type="number" 
                                    step="0.01" 
                                    min="0"
                                    required 
                                    value={sinalValor} 
                                    onChange={(e) => setSinalValor(e.target.valueAsNumber || 0)}
                                    className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} h-10 sm:text-sm`}
                                    disabled={isSavingPagamento} 
                                    placeholder="Ex: 10.50"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Digite 0 para não exigir sinal. (Ex: 10.00 para R$ 10,00)</p>
                        </div>
                        {/* <<< FIM DO NOVO CAMPO >>> */}

                    </div>

                    <div className="flex justify-end pt-6 border-t border-gray-100 mt-6">
                        <button
                            type="submit"
                            className={`flex items-center px-6 py-2.5 ${CIANO_COLOR_BG} text-white rounded-lg shadow-sm ${CIANO_COLOR_BG_HOVER} transition-colors disabled:opacity-50`}
                            disabled={isSavingPagamento}
                        >
                            {isSavingPagamento ? ( <Loader2 className="w-5 h-5 animate-spin stroke-current mr-2" /> ) : ( <Icon icon={Save} className="w-5 h-5 mr-2" /> )}
                            {isSavingPagamento ? 'Salvando...' : 'Salvar Configurações'}
                        </button>
                    </div>
                 </form>
            </div>
            {/* --- FIM DO CARD DE PAGAMENTOS --- */}


            {/* --- SEÇÃO DADOS DE ACESSO (SENHA) --- */}
            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <form onSubmit={handleSubmitPassword}>
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-100">Dados de Acesso</h3>
                    <div className="space-y-4">
                        {/* E-mail (Somente Leitura) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail (Login)</label>
                            <div className="flex items-center border border-gray-300 rounded-md p-2 h-10 bg-gray-50 text-gray-500">
                                <Icon icon={Mail} className="w-5 h-5 mr-2"/>
                                <span className="text-gray-900 font-medium truncate">{email}</span> 
                            </div>
                        </div>

                        <h4 className="font-medium text-gray-700 pt-4 border-t border-gray-100 !mt-6">Alterar Senha</h4> 

                        {/* Senha Atual */}
                        <div>
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">Senha Atual*</label>
                            <div className="relative">
                               <Icon icon={Lock} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
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
                            className={`flex items-center px-6 py-2.5 ${CIANO_COLOR_BG} text-white rounded-lg shadow-sm ${CIANO_COLOR_BG_HOVER} transition-colors disabled:opacity-50`}
                            disabled={isSavingPassword || !newPassword.trim() || !currentPassword.trim()}
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