// frontend/src/pages/painel/ClientesPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Mail, Phone, Clock, Loader2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);



// --- Componente principal ---
function ClientesPage() {
    const { salaoId } = useParams();
    const navigate = useNavigate();
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Supondo que você use uma cor CIANO_COLOR_TEXT
    const CIANO_TEXT_CLASS = 'text-cyan-800';

    // 1. Fetch de Clientes
    useEffect(() => {
        const fetchClientes = async () => {
            // OBS: Este endpoint deve ser criado no backend (Passo 3)
            const URL = `${API_BASE_URL}/admin/clientes/${salaoId}/lista-crm`; 
            
            setLoading(true);
            setError(null);
            try {
                // OBS: O token será injetado pelo seu sistema de autenticação ou deve ser passado explicitamente.
                // Vou assumir que o sistema de autenticação (como o axios interceptor) adiciona o token
                const response = await axios.get(URL);
                
                // Mapeia os dados do Firestore/Backend
                const mappedClientes = response.data.map(c => ({
                    ...c,
                    // Garante que as datas são objetos Date/parseadas
                    data_cadastro: c.data_cadastro ? parseISO(c.data_cadastro) : null,
                    ultima_visita: c.ultima_visita ? parseISO(c.ultima_visita) : null,
                }));

                setClientes(mappedClientes);
            } catch (err) {
                console.error("Erro ao buscar lista de clientes:", err);
                setError(err.response?.data?.detail || "Não foi possível carregar a lista de clientes.");
            } finally {
                setLoading(false);
            }
        };

        fetchClientes();
    }, [salaoId]);


    // 2. Lógica de Filtragem (Frontend)
    const filteredClientes = clientes.filter(cliente => {
        const term = searchTerm.toLowerCase();
        return (
            cliente.nome.toLowerCase().includes(term) ||
            cliente.email.toLowerCase().includes(term) ||
            cliente.whatsapp.includes(term.replace(/\D/g, '')) // Permite buscar por número limpo
        );
    });

    // --- Renderização de Status ---
    if (loading) {
        return <div className="flex justify-center py-10"><Loader2 className={`w-8 h-8 animate-spin ${CIANO_TEXT_CLASS}`} /></div>;
    }
    if (error) {
        return <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className={`text-2xl font-bold text-gray-900 flex items-center`}>
                <Icon icon={User} className={`w-6 h-6 mr-3 ${CIANO_TEXT_CLASS}`} />
                Meus Clientes ({clientes.length})
            </h2>

            {/* Barra de Pesquisa */}
            <div className="relative">
                <Icon icon={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar por nome, e-mail ou WhatsApp..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
                />
            </div>
            
            {/* Tabela de Clientes */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Cliente
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                                Contato
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Última Visita
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredClientes.length > 0 ? (
                            filteredClientes.map((cliente) => (
                                <tr key={cliente.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/painel/${salaoId}/clientes/${cliente.id}`)}>
                                    {/* Nome e E-mail */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{cliente.nome}</div>
                                        <div className="text-sm text-gray-500 hidden sm:block">{cliente.email}</div>
                                    </td>
                                    {/* Contato (Mobile esconde) */}
                                    <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                        <div className="text-sm text-gray-900 flex items-center">
                                            <Icon icon={Phone} className="w-4 h-4 mr-1 text-gray-400" />
                                            {cliente.whatsapp}
                                        </div>
                                    </td>
                                    {/* Última Visita */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {cliente.ultima_visita ? (
                                            <span title={format(cliente.ultima_visita, 'dd/MM/yyyy HH:mm', { locale: ptBR })}>
                                                {formatDistanceToNow(cliente.ultima_visita, { addSuffix: true, locale: ptBR })}
                                            </span>
                                        ) : 'Primeira visita'}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" className="px-6 py-10 text-center text-gray-500">
                                    Nenhum cliente encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ClientesPage;