import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
    User, Mail, Phone, MapPin, Sparkles, ArrowRight, Check, 
    Loader2, Palette, Scissors, Users, Clock, Settings, Play
} from 'lucide-react';
import { auth } from '@/firebaseConfig';
import { onAuthStateChanged } from "firebase/auth";
import toast from 'react-hot-toast';
import BookingPagePreview from '@/components/BookingPagePreview';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- ESTILOS ---
const PRIMARY_BG = "bg-cyan-700";
const PRIMARY_HOVER = "hover:bg-cyan-800";
const INPUT_CLASS = "w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl text-gray-900 font-medium focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all outline-none placeholder:text-gray-400 text-sm";
const ICON_CLASS = "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-cyan-600 transition-colors";

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// =============================================================================
// SUB-COMPONENTES (STEPS)
// =============================================================================

// 1. IDENTIDADE (Formulário Básico)
const StepIdentity = ({ data, onChange, onNext }) => (
    <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-cyan-700 shadow-sm">
                <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Vamos começar!</h2>
            <p className="text-gray-500">Configure o visual básico do seu agendamento.</p>
        </div>

        <div className="space-y-4">
            <div className="relative group">
                <label className="sr-only">Nome do Negócio</label>
                <Icon icon={User} className={ICON_CLASS} />
                <input 
                    value={data.nome_salao} 
                    onChange={e => onChange('nome_salao', e.target.value)} 
                    className={INPUT_CLASS} 
                    placeholder="Nome do Salão (Ex: Studio Elite)" 
                    autoFocus 
                />
            </div>
            
            <div className="relative group">
                <label className="sr-only">Slogan</label>
                <Icon icon={Sparkles} className={ICON_CLASS} />
                <input 
                    value={data.tagline} 
                    onChange={e => onChange('tagline', e.target.value)} 
                    className={INPUT_CLASS} 
                    placeholder="Slogan (Ex: Realçando sua beleza)" 
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative group">
                    <Icon icon={Phone} className={ICON_CLASS} />
                    <input 
                        value={data.telefone} 
                        onChange={e => onChange('telefone', e.target.value)} 
                        className={INPUT_CLASS} 
                        placeholder="WhatsApp (DDD+Num)" 
                    />
                </div>
                <div className="relative group">
                    <Icon icon={Mail} className={ICON_CLASS} />
                    <input 
                        value={data.calendar_id} 
                        onChange={e => onChange('calendar_id', e.target.value)} 
                        className={INPUT_CLASS} 
                        placeholder="E-mail Principal" 
                        type="email"
                    />
                </div>
            </div>

            <div className="relative group">
                <label className="sr-only">Endereço</label>
                <Icon icon={MapPin} className={ICON_CLASS} />
                <input 
                    value={data.endereco_completo} 
                    onChange={e => onChange('endereco_completo', e.target.value)} 
                    className={INPUT_CLASS} 
                    placeholder="Endereço Completo" 
                />
            </div>
            
            <div className="pt-4 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Cor da Marca</label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:border-cyan-200 transition-colors">
                    <input 
                        type="color" 
                        value={data.cor_primaria} 
                        onChange={e => onChange('cor_primaria', e.target.value)} 
                        className="w-10 h-10 rounded-lg cursor-pointer border-none p-0 bg-transparent" 
                    />
                    <div>
                        <p className="text-sm font-bold text-gray-700">Cor Principal</p>
                        <p className="text-xs text-gray-400 font-mono">{data.cor_primaria}</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex justify-end pt-4">
            <button 
                onClick={onNext} 
                disabled={!data.nome_salao} 
                className={`w-full py-4 rounded-xl text-white font-bold shadow-lg ${PRIMARY_BG} ${PRIMARY_HOVER} disabled:opacity-50 transition-all flex justify-center items-center gap-2`}
            >
                Continuar <ArrowRight className="w-5 h-5" />
            </button>
        </div>
    </div>
);

// 2. TOUR / TUTORIAL (Onde configurar o resto)
const StepTutorial = ({ onFinish, loading }) => (
    <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 text-center">
        <div>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 shadow-sm">
                <Check className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Identidade Configurada!</h2>
            <p className="text-gray-500 mt-2">
                Agora, seu próximo passo é preencher o sistema pelo Painel.
            </p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 text-left space-y-4 shadow-inner">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Próximos Passos:</h3>
            
            <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm text-cyan-600"><Scissors className="w-5 h-5"/></div>
                <div>
                    <p className="font-bold text-gray-800 text-sm">1. Cadastre Serviços</p>
                    <p className="text-xs text-gray-500">Vá em <strong>"Meus Serviços"</strong> para adicionar cortes, barbas, etc.</p>
                </div>
            </div>

            <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm text-purple-600"><Users className="w-5 h-5"/></div>
                <div>
                    <p className="font-bold text-gray-800 text-sm">2. Monte sua Equipe</p>
                    <p className="text-xs text-gray-500">Vá em <strong>"Minha Equipe"</strong> para adicionar funcionários.</p>
                </div>
            </div>

            <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm text-orange-600"><Clock className="w-5 h-5"/></div>
                <div>
                    <p className="font-bold text-gray-800 text-sm">3. Ajuste Horários</p>
                    <p className="text-xs text-gray-500">Vá em <strong>"Horários"</strong> para definir abertura e fechamento.</p>
                </div>
            </div>
        </div>

        <button 
            onClick={onFinish} 
            disabled={loading}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-xl ${PRIMARY_BG} ${PRIMARY_HOVER} transition-all transform hover:scale-105 flex items-center justify-center gap-2`}
        >
            {loading ? <Loader2 className="w-6 h-6 animate-spin"/> : <Play className="w-5 h-5 fill-current" />}
            {loading ? 'Finalizando...' : 'Ir para o Painel'}
        </button>
    </div>
);

// =============================================================================
// PÁGINA PRINCIPAL
// =============================================================================
export default function SetupPage() {
    const { salaoId } = useParams();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [authChecking, setAuthChecking] = useState(true);

    // Estado Simplificado (Apenas Identidade)
    const [setupData, setSetupData] = useState({
        nome_salao: '',
        tagline: '',
        telefone: '',
        calendar_id: '', // E-mail
        endereco_completo: '',
        cor_primaria: '#0E7490'
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) navigate('/login');
            else {
                // Preenche e-mail automaticamente
                setSetupData(prev => ({ ...prev, calendar_id: user.email || '' }));
                setAuthChecking(false);
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleChange = (field, value) => {
        setSetupData(prev => ({ ...prev, [field]: value }));
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const headers = { Authorization: `Bearer ${token}` };

            // 1. Prepara Payload (Apenas Identidade + Flag de Setup)
            const salonPayload = {
                id: salaoId,
                nome_salao: setupData.nome_salao,
                tagline: setupData.tagline,
                telefone: setupData.telefone,
                calendar_id: setupData.calendar_id,
                endereco_completo: setupData.endereco_completo,
                cor_primaria: setupData.cor_primaria,
                setupCompleted: true // 🌟 MARCA COMO CONCLUÍDO
            };

            // 2. Busca dados atuais para não sobrescrever nada importante (merge seguro)
            const currentRes = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, { headers });
            const currentData = currentRes.data;

            // 3. Salva
            await axios.put(`${API_BASE_URL}/admin/clientes/${salaoId}`, { ...currentData, ...salonPayload }, { headers });

            toast.success("Configuração inicial concluída!");
            navigate(`/painel/${salaoId}/visaoGeral`);

        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar. Tente novamente.");
            setLoading(false);
        }
    };

    if (authChecking) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 animate-spin text-cyan-700" /></div>;

    return (
        <div className="min-h-screen bg-gray-100 flex font-sans overflow-hidden">
            
            {/* ESQUERDA: WIZARD (Centralizado e Limpo) */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center p-6 sm:p-12 lg:p-20 bg-white shadow-2xl relative z-20 overflow-y-auto h-screen">
                
                {/* Progresso */}
                <div className="mb-8 max-w-md mx-auto w-full">
                    <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        <span>Passo {step} de 2</span>
                        <span>{step === 1 ? '50%' : '100%'}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-600 transition-all duration-500 ease-out" style={{ width: step === 1 ? '50%' : '100%' }}></div>
                    </div>
                </div>

                <div className="max-w-md mx-auto w-full pb-10">
                    {step === 1 && <StepIdentity data={setupData} onChange={handleChange} onNext={() => setStep(2)} />}
                    {step === 2 && <StepTutorial onFinish={handleFinish} loading={loading} />}
                </div>
            </div>

            {/* DIREITA: PREVIEW LIVE (Mostra a identidade sendo construída) */}
            <div className="hidden lg:flex lg:w-1/2 bg-gray-100 items-center justify-center relative p-10 h-screen">
                <div className="relative w-[380px] h-[750px] bg-gray-900 rounded-[3rem] border-[8px] border-gray-900 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-xl z-20"></div>
                    
                    {/* O Preview agora só mostra o visual básico, já que não temos serviços ainda */}
                    <div className="w-full h-full bg-white overflow-y-auto custom-scrollbar">
                        <BookingPagePreview 
                            salaoId="preview"
                            nomeSalao={setupData.nome_salao || "Seu Salão"}
                            tagline={setupData.tagline}
                            primaryColor={setupData.cor_primaria}
                            telefone={setupData.telefone}
                            endereco={setupData.endereco_completo}
                            // Mocks vazios para o preview não quebrar
                            professionalsMock={[]} 
                            servicesMock={[]} 
                            redesSociais={{}}
                        />
                        
                        {/* Overlay Educativo no Preview */}
                        {step === 2 && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-in fade-in">
                                <div>
                                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                                        <Check className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Visual Configurado!</h3>
                                    <p className="text-white/80 text-sm mt-2">
                                        Seu site já tem nome e cor. Adicione serviços no painel para ele ficar completo.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <p className="absolute bottom-10 text-gray-400 text-sm font-medium">Visualização em tempo real</p>
            </div>

        </div>
    );
}