import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
    Search, Users, Phone, MoreHorizontal, MessageCircle, Calendar 
} from 'lucide-react';
import { auth } from '@/firebaseConfig';
import { useSalon } from './PainelLayout';
import HourglassLoading from '@/components/HourglassLoading';

const API_BASE_URL = "https://api-agendador-2n55.onrender.com/api/v1";

// --- Helpers Visuais ---
const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// Gera iniciais (Ex: "Ana Silva" -> "AS")
const getInitials = (name) => {
    if (!name) return "C";
    const names = name.trim().split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
};

// Paleta de cores para avatares (Pastéis elegantes)
const AVATAR_COLORS = [
    'bg-blue-100 text-blue-600',
    'bg-green-100 text-green-600',
    'bg-purple-100 text-purple-600',
    'bg-orange-100 text-orange-600',
    'bg-pink-100 text-pink-600',
    'bg-indigo-100 text-indigo-600',
];

const getAvatarColor = (name) => {
    if (!name) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getWhatsAppLink = (phone) => {
    if (!phone) return "#";
    return `https://wa.me/${phone.replace(/\D/g, '')}`;
};

// --- Componente de Linha da Tabela ---
const ClientItem = ({ cliente, onClick }) => {
    // Tratamento seguro para nome vazio
    const nomeDisplay = cliente.nome || "Cliente Sem Nome";
    const initials = getInitials(nomeDisplay);
    const colorClass = getAvatarColor(nomeDisplay);
    
    // Lógica de Status
    let statusBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">Novo</span>;
    if (cliente.ultima_visita) {
        const lastVisitDate = typeof cliente.ultima_visita === 'string' ? parseISO(cliente.ultima_visita) : cliente.ultima_visita;
        const daysSince = (new Date() - lastVisitDate) / (1000 * 60 * 60 * 24);
        
        if (daysSince <= 30) {
            statusBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">Ativo</span>;
        } else {
            statusBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700">Ausente</span>;
        }
    }

    return (
        <div 
            onClick={onClick}
            className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 cursor-pointer gap-4"
        >
            <div className="flex items-center gap-4 flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm flex-shrink-0 ${colorClass}`}>
                    {initials}
                </div>
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-cyan-700 transition-colors truncate">
                        {nomeDisplay}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                        {cliente.email || 'Sem e-mail'}
                    </p>
                </div>
            </div>

            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1 min-w-[120px]">
                {statusBadge}
                <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Icon icon={Calendar} className="w-3 h-3" />
                    {cliente.ultima_visita 
                        ? formatDistanceToNow(typeof cliente.ultima_visita === 'string' ? parseISO(cliente.ultima_visita) : cliente.ultima_visita, { addSuffix: true, locale: ptBR }) 
                        : '-'}
                </span>
            </div>

            <div className="flex items-center justify-end sm:pl-4" onClick={(e) => e.stopPropagation()}>
                {cliente.whatsapp ? (
                    <a 
                        href={getWhatsAppLink(cliente.whatsapp)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 rounded-full text-green-600 hover:bg-green-50 transition-colors border border-transparent hover:border-green-100"
                        title="Conversar no WhatsApp"
                    >
                        <Icon icon={MessageCircle} className="w-5 h-5" />
                    </a>
                ) : (
                    <div className="w-9 h-9" /> 
                )}
                <button className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors ml-1">
                    <Icon icon={MoreHorizontal} className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

// --- Componente Principal ---
export default function ClientesPage() {
    const { salaoId, salonDetails } = useSalon();
    const navigate = useNavigate();
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const primaryColor = salonDetails?.cor_primaria || '#0E7490';

    const fetchClientes = useCallback(async () => {
        if (!salaoId) return;
        setLoading(true);
        setError(null);
        
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Sessão expirada.");
            const token = await currentUser.getIdToken();

            const response = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}/lista-crm`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const mappedClientes = response.data.map(c => ({
                ...c,
                ultima_visita: c.ultima_visita ? parseISO(c.ultima_visita) : null,
            }));

            setClientes(mappedClientes);
        } catch (err) {
            console.error(err);
            setError("Não foi possível carregar a lista de clientes.");
        } finally {
            setLoading(false);
        }
    }, [salaoId]);

    useEffect(() => {
        fetchClientes();
    }, [fetchClientes]);

    // 🌟 LÓGICA DE FILTRAGEM CORRIGIDA E BLINDADA 🌟
    const filteredClientes = useMemo(() => {
        // Se não tiver clientes, retorna vazio
        if (!clientes) return [];
        
        const term = searchTerm.toLowerCase().trim();
        if (!term) return clientes; // Se não tiver busca, retorna todos

        return clientes.filter(c => {
            // Blindagem: Garante que os campos existam antes de usar toLowerCase()
            const nome = (c.nome || '').toLowerCase();
            const email = (c.email || '').toLowerCase();
            const whatsapp = (c.whatsapp || '').replace(/\D/g, '');
            
            // Verifica se o termo de busca é numérico (para busca por telefone)
            const termIsNumeric = /^\d+$/.test(term);

            if (termIsNumeric) {
                return whatsapp.includes(term);
            }

            return nome.includes(term) || email.includes(term);
        });
    }, [clientes, searchTerm]);

    if (loading || !salaoId) {
        return (
            <div className="h-96 flex items-center justify-center">
                <HourglassLoading message="Carregando Clientes..." />
            </div>
        );
    }

    return (
        <div className="font-sans pb-20">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                            <Icon icon={Users} className="w-6 h-6" style={{ color: primaryColor }} />
                        </div>
                        Meus Clientes
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 ml-12">
                        Gerencie sua base e mantenha contato.
                    </p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm font-medium text-gray-600">
                    Total: <span className="text-gray-900 font-bold ml-1">{clientes.length}</span>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6">
                <div className="relative">
                    <Icon icon={Search} className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, e-mail ou telefone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all"
                        style={{ '--tw-ring-color': primaryColor }}
                    />
                </div>
            </div>

            {error ? (
                <div className="p-6 bg-red-50 rounded-xl border border-red-100 text-center text-red-600">
                    {error}
                </div>
            ) : filteredClientes.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon icon={Users} className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">
                        {searchTerm ? `Nenhum resultado para "${searchTerm}"` : 'Nenhum cliente encontrado.'}
                    </p>
                    {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')}
                            className="mt-2 text-sm font-semibold hover:underline"
                            style={{ color: primaryColor }}
                        >
                            Limpar pesquisa
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="hidden sm:flex justify-between px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        <span className="flex-1">Cliente</span>
                        <div className="flex gap-12 mr-14">
                            <span>Status</span>
                            <span>Ações</span>
                        </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {filteredClientes.map(cliente => (
                            <ClientItem 
                                key={cliente.id} 
                                cliente={cliente} 
                                primaryColor={primaryColor}
                                onClick={() => navigate(`/painel/${salaoId}/clientes/${cliente.id}`)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}