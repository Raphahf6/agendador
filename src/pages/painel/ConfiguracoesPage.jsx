import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { 
    Settings, Loader2, Save, Lock, Mail, AlertTriangle, CheckCircle, 
    ExternalLink, XCircle, Key, DollarSign, CreditCard, RefreshCw 
} from 'lucide-react';
import { auth, db } from '@/firebaseConfig';
import { doc, getDoc } from "firebase/firestore"; 
import axios from 'axios';
import toast from 'react-hot-toast';
import HourglassLoading from '@/components/HourglassLoading';
import { useSalon } from './PainelLayout'; // Usa o contexto para recarregar dados globais se precisar

const API_BASE_URL = "https://api-agendador-2n55.onrender.com/api/v1";

// --- Estilos Premium ---
const CARD_CLASS = "bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 mb-6";
const SECTION_TITLE = "text-lg font-bold text-gray-900 mb-1";
const SECTION_SUBTITLE = "text-sm text-gray-500 mb-6";
const BTN_PRIMARY = "bg-cyan-700 hover:bg-cyan-800 text-white shadow-md";
const BTN_DANGER = "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200";

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

export default function ConfiguracoesPage() {
    const { salaoId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Estados Gerais
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    
    // Mercado Pago
    const [isMpConnected, setIsMpConnected] = useState(false);
    const [sinalValor, setSinalValor] = useState(0);
    const [loadingMp, setLoadingMp] = useState(false);

    // Google Calendar
    const [isGoogleSyncEnabled, setIsGoogleSyncEnabled] = useState(false);
    const [loadingGoogle, setLoadingGoogle] = useState(false);

    // Senha
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loadingPassword, setLoadingPassword] = useState(false);

    // 1. BUSCA DADOS
    const fetchSettings = useCallback(async () => {
        if (!salaoId || !auth.currentUser) return;
        setLoading(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const user = auth.currentUser;
            setEmail(user.email);

            // Busca dados do salão
            const docRef = doc(db, 'cabeleireiros', salaoId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                // Mercado Pago
                setIsMpConnected(!!data.mp_access_token); // Se tem token, está conectado
                setSinalValor(data.sinal_valor || 0);
                // Google
                setIsGoogleSyncEnabled(data.google_sync_enabled === true);
            }

            // Verifica Retornos de OAuth (URL Params)
            if (searchParams.get('mp_sync') === 'success') {
                toast.success("Mercado Pago conectado!");
                setIsMpConnected(true);
                setSearchParams({}); // Limpa URL
            }
            if (searchParams.get('sync') === 'success') { // Google
                toast.success("Agenda Google sincronizada!");
                setIsGoogleSyncEnabled(true);
                setSearchParams({});
            }

        } catch (err) {
            console.error(err);
            toast.error("Erro ao carregar configurações.");
        } finally {
            setLoading(false);
        }
    }, [salaoId, searchParams, setSearchParams]);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    // --- HANDLERS MERCADO PAGO ---
    const handleConnectMP = async () => {
        setLoadingMp(true);
        const toastId = toast.loading("Redirecionando...");
        try {
            const token = await auth.currentUser.getIdToken();
            const response = await axios.get(`${API_BASE_URL}/admin/mercadopago/auth/start`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.auth_url) {
                window.location.href = response.data.auth_url;
            } else {
                throw new Error("URL de auth não recebida");
            }
        } catch (err) {
            toast.error("Erro ao conectar MP.", { id: toastId });
            setLoadingMp(false);
        }
    };

    const handleDisconnectMP = async () => {
        if (!window.confirm("Desconectar Mercado Pago? Você deixará de receber sinais.")) return;
        setLoadingMp(true);
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.patch(`${API_BASE_URL}/admin/mercadopago/disconnect/${salaoId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsMpConnected(false);
            toast.success("Desconectado.");
        } catch (err) {
            toast.error("Erro ao desconectar.");
        } finally { setLoadingMp(false); }
    };

    const handleSaveSinal = async () => {
        setLoadingMp(true);
        try {
            const token = await auth.currentUser.getIdToken();
            // Atualiza apenas o valor do sinal
            // Podemos usar a rota genérica de update do cliente ou uma específica se tiver
            // Vamos usar a de update cliente que é mais segura/genérica se a de pagamento específica não existir ou for complexa
            // Mas como você tem a rota PATCH /configuracoes/pagamento no código antigo, vamos tentar manter algo similar ou usar o update geral
            
            // Update via rota geral de cliente (mais garantido com o código atual)
            const currentRes = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, { headers: { Authorization: `Bearer ${token}` } });
            await axios.put(`${API_BASE_URL}/admin/clientes/${salaoId}`, {
                ...currentRes.data,
                id: salaoId,
                sinal_valor: parseFloat(sinalValor)
            }, { headers: { Authorization: `Bearer ${token}` } });

            toast.success("Valor do sinal atualizado!");
        } catch (err) {
            toast.error("Erro ao salvar valor.");
        } finally { setLoadingMp(false); }
    };

    // --- HANDLERS GOOGLE ---
    const handleConnectGoogle = async () => {
        setLoadingGoogle(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const response = await axios.get(`${API_BASE_URL}/admin/google/auth/start`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.authorization_url) {
                window.location.href = response.data.authorization_url;
            }
        } catch (err) {
            toast.error("Erro ao conectar Google.");
            setLoadingGoogle(false);
        }
    };

    const handleDisconnectGoogle = async () => {
        if (!window.confirm("Parar de sincronizar com Google Calendar?")) return;
        setLoadingGoogle(true);
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.patch(`${API_BASE_URL}/admin/clientes/${salaoId}/google-sync`, { enabled: false }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsGoogleSyncEnabled(false);
            toast.success("Sincronização parada.");
        } catch (err) { toast.error("Erro ao desconectar."); }
        finally { setLoadingGoogle(false); }
    };

    // --- HANDLER SENHA ---
    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) return toast.error("Senhas não conferem.");
        if (newPassword.length < 6) return toast.error("Mínimo 6 caracteres.");
        
        setLoadingPassword(true);
        try {
            const user = auth.currentUser;
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            toast.success("Senha alterada com sucesso!");
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err) {
            if (err.code === 'auth/wrong-password') toast.error("Senha atual incorreta.");
            else toast.error("Erro ao alterar senha.");
        } finally { setLoadingPassword(false); }
    };

    if (loading) return <div className="h-96 flex items-center justify-center"><HourglassLoading message="Carregando configurações..." /></div>;

    return (
        <div className="font-sans pb-20 max-w-4xl mx-auto">
            
            {/* Header */}
            <div className="mb-8 flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                    <Settings className="w-6 h-6 text-cyan-700" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
                    <p className="text-sm text-gray-500">Gerencie integrações e segurança.</p>
                </div>
            </div>

            {/* 1. INTEGRAÇÃO MERCADO PAGO */}
            <div className={CARD_CLASS}>
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className={SECTION_TITLE}>Pagamentos Online</h3>
                        <p className={SECTION_SUBTITLE}>Receba sinais via PIX automaticamente.</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${isMpConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${isMpConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {isMpConnected ? 'Conectado' : 'Desconectado'}
                    </div>
                </div>

                {isMpConnected ? (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-3">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-green-800">Conta Vinculada</p>
                                <p className="text-xs text-green-600">Os pagamentos caem direto na sua conta Mercado Pago.</p>
                            </div>
                            <button onClick={handleDisconnectMP} disabled={loadingMp} className="text-xs font-bold text-red-500 hover:underline">
                                Desconectar
                            </button>
                        </div>

                        <div className="flex items-end gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor do Sinal (R$)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input 
                                        type="number" 
                                        value={sinalValor} 
                                        onChange={e => setSinalValor(e.target.value)} 
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none font-bold text-gray-900"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Deixe 0 para não cobrar sinal.</p>
                            </div>
                            <button 
                                onClick={handleSaveSinal} 
                                disabled={loadingMp}
                                className={`px-6 py-2.5 rounded-lg font-bold text-white text-sm transition-all ${BTN_PRIMARY} disabled:opacity-50`}
                            >
                                {loadingMp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar Valor'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-50 p-6 rounded-xl text-center border border-dashed border-gray-300">
                        <CreditCard className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium mb-4">Conecte sua conta para evitar "No-Shows" (faltas).</p>
                        <button 
                            onClick={handleConnectMP} 
                            disabled={loadingMp}
                            className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold shadow-sm transition-all flex items-center justify-center gap-2 mx-auto"
                        >
                            {loadingMp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Conectar Mercado Pago'}
                        </button>
                    </div>
                )}
            </div>

            {/* 2. GOOGLE CALENDAR */}
            <div className={CARD_CLASS}>
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className={SECTION_TITLE}>Sincronização de Agenda</h3>
                        <p className={SECTION_SUBTITLE}>Evite conflitos com seus compromissos pessoais.</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${isGoogleSyncEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${isGoogleSyncEnabled ? 'bg-blue-500' : 'bg-gray-400'}`} />
                        {isGoogleSyncEnabled ? 'Sincronizado' : 'Offline'}
                    </div>
                </div>

                {isGoogleSyncEnabled ? (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                        <RefreshCw className="w-5 h-5 text-blue-600" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-blue-800">Google Calendar Ativo</p>
                            <p className="text-xs text-blue-600">Seus eventos pessoais bloqueiam horários no Horalis.</p>
                        </div>
                        <button onClick={handleDisconnectGoogle} disabled={loadingGoogle} className="text-xs font-bold text-red-500 hover:underline">
                            Parar Sync
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={handleConnectGoogle} 
                        disabled={loadingGoogle}
                        className="w-full py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                    >
                        {loadingGoogle ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                        Conectar Google Calendar
                    </button>
                )}
            </div>

            {/* 3. SEGURANÇA (Senha) */}
            <div className={CARD_CLASS}>
                <h3 className={SECTION_TITLE}>Segurança</h3>
                <p className={SECTION_SUBTITLE}>Alterar senha de acesso.</p>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha Atual</label>
                            <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full pl-9 p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-sm outline-none focus:border-cyan-500 transition-all" /></div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nova Senha</label>
                            <div className="relative"><Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-9 p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-sm outline-none focus:border-cyan-500 transition-all" /></div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmar</label>
                            <div className="relative"><Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full pl-9 p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-sm outline-none focus:border-cyan-500 transition-all" /></div>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={loadingPassword || !newPassword} className={`px-6 py-2 rounded-lg text-white font-bold text-sm shadow-sm transition-all ${BTN_PRIMARY} disabled:opacity-50`}>
                            {loadingPassword ? 'Alterando...' : 'Atualizar Senha'}
                        </button>
                    </div>
                </form>
            </div>

        </div>
    );
}