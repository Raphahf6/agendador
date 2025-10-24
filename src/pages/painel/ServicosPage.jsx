// frontend/src/pages/painel/ServicosPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card } from '@/ui/card';
import { Scissors, DollarSign, Clock, Loader2, PlusCircle, Trash2, X } from 'lucide-react'; 
import { auth } from '@/firebaseConfig'; // Importa a instância de autenticação

// URL da API 
const API_BASE_URL = "https://api-agendador.onrender.com/api/v1"; 

// --- COMPONENTE MODAL DE EDIÇÃO/CRIAÇÃO ---
const ServiceFormModal = ({ isOpen, onClose, serviceData, salaoId, currentServices, onSaveSuccess }) => {
    // Inicializa o estado do formulário com os dados do serviço (ou vazio para novo)
    const [formData, setFormData] = useState(() => ({
        id: serviceData?.id || null, // Se existir, é edição
        nome_servico: serviceData?.nome_servico || '',
        duracao_minutos: serviceData?.duracao_minutos || 30,
        preco: serviceData?.preco || 0,
        descricao: serviceData?.descricao || '',
    }));

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isNew = formData.id === null; // Flag para saber se é criação

    // Sincroniza o estado do formulário com os dados recebidos (útil para edição)
    useEffect(() => {
        setFormData({
            id: serviceData?.id || null, 
            nome_servico: serviceData?.nome_servico || '',
            duracao_minutos: serviceData?.duracao_minutos || 30,
            preco: serviceData?.preco || 0,
            descricao: serviceData?.descricao || '',
        });
        setError('');
    }, [serviceData]); // Re-renderiza quando o serviço a ser editado muda

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'duracao_minutos' || name === 'preco' ? (Number(value) || 0) : value, // Garante que preço e duração são números
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validação básica
        if (!formData.nome_servico.trim() || !formData.duracao_minutos) {
            setError("Nome e Duração são obrigatórios.");
            setLoading(false);
            return;
        }

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Sessão expirada.");
            const token = await currentUser.getIdToken();

            // 1. Prepara a nova lista completa de serviços
            let newServicesList;

            if (isNew) {
                // Adição: Adiciona o novo serviço ao array existente, sem o ID temporário
                const serviceToSave = { ...formData };
                delete serviceToSave.id; // Remove o ID temporário
                newServicesList = [...currentServices, serviceToSave];

            } else {
                // Edição: Mapeia a lista existente e substitui o item editado
                // Filtra os serviços temporários (sem ID) para garantir que eles não entrem no PUT.
                newServicesList = currentServices
                    .filter(s => s.id !== formData.id || s.id.startsWith('temp-'))
                    .map(s => {
                        // Se for o serviço editado, usa os dados do formulário
                        if (s.id === formData.id) {
                            // Retorna o objeto de serviço, removendo IDs temporários se existirem
                            const updatedService = { ...formData };
                            if (updatedService.id.startsWith('temp-')) {
                                delete updatedService.id; 
                            }
                            return updatedService;
                        }
                        return s;
                    });
            }
            
            // 2. Chama o endpoint GET para obter os dados principais do salão (para não sobrescrever nada)
            const salonResponse = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const salonData = salonResponse.data;
            
            // 3. Prepara o payload para o PUT (atualização total do cliente)
            const payload = {
                ...salonData, // Todos os dados existentes do salão (cores, tagline, etc.)
                id: salaoId, // O ID do salão
                servicos: newServicesList, // A lista de serviços ATUALIZADA
            };
            
            // 4. Envia o PUT
            await axios.put(`${API_BASE_URL}/admin/clientes/${salaoId}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // 5. Sucesso
            onSaveSuccess(); // Notifica o componente pai para recarregar a lista
            onClose(); // Fecha o modal
            
        } catch (err) {
            console.error("Erro ao salvar serviço:", err);
            setError(err.response?.data?.detail || "Falha ao salvar serviço.");
            setLoading(false);
        }
    };

    if (!isOpen) return null; // Não renderiza se não estiver aberto

    return (
        // Modal Overlay
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">
                        {isNew ? 'Adicionar Novo Serviço' : `Editar ${serviceData?.nome_servico || 'Serviço'}`}
                    </h2>
                    <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-900">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    
                    {/* Campos do Formulário... (sem alterações) */}
                    <div>
                        <label htmlFor="nome_servico" className="block text-sm font-medium text-gray-700">Nome do Serviço*</label>
                        <input name="nome_servico" id="nome_servico" type="text" value={formData.nome_servico} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2" disabled={loading} required/>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="duracao_minutos" className="block text-sm font-medium text-gray-700">Duração (min)*</label>
                            <input name="duracao_minutos" id="duracao_minutos" type="number" value={formData.duracao_minutos} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2" disabled={loading} required min="10"/>
                        </div>
                        <div>
                            <label htmlFor="preco" className="block text-sm font-medium text-gray-700">Preço (R$)</label>
                            <input name="preco" id="preco" type="number" step="0.01" value={formData.preco} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2" disabled={loading} min="0"/>
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">Descrição</label>
                        <textarea name="descricao" id="descricao" rows="2" value={formData.descricao} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2" disabled={loading} />
                    </div>

                    {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
                    
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition-colors disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : isNew ? 'Adicionar Serviço' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
};
// --- FIM DO COMPONENTE MODAL ---


function ServicosPage() {
  const { salaoId } = useParams(); // Pega o ID do salão da URL
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null); 
  const [isDeleting, setIsDeleting] = useState(false); // Novo estado para o loading de exclusão


  // Função para buscar a lista de serviços (useCallback para estabilidade)
  const fetchServices = useCallback(async () => {
    if (!salaoId) { setError("ID do Salão não encontrado."); setLoading(false); return; }
    
    const currentUser = auth.currentUser;

    if (!currentUser) { setError("Sessão expirada. Faça login novamente para ver os serviços."); setLoading(false); return; }
    const token = await currentUser.getIdToken(); 
    setLoading(true);
    setError(null);
    
    try {
        const response = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, {
            headers: {
                Authorization: `Bearer ${token}` 
            }
        });
        
        if (response.data && Array.isArray(response.data.servicos)) {
            // Garante que todos os serviços têm um ID para a prop 'key'
            const servicesWithKeys = response.data.servicos.map((s, index) => ({
                ...s,
                // Cria um ID temporário se o serviço não tiver um ID (Ex: novos serviços antes de serem salvos)
                id: s.id || `temp-${index}` 
            }));
            setServices(servicesWithKeys);
        } else {
            setServices([]); 
        }
    } catch (err) {
        console.error("Erro ao buscar serviços:", err.response?.data?.detail || err.message);
        setError(err.response?.data?.detail || "Não foi possível carregar os serviços. Verifique a autenticação.");
    } finally {
        setLoading(false);
    }
  }, [salaoId]); 

  // Dispara a busca inicial
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);


  // --- FUNÇÃO DE EXCLUSÃO (NOVA LÓGICA) ---
  const handleRemove = async (serviceId) => {
    if (!window.confirm("Tem certeza que deseja remover este serviço? Esta ação não pode ser desfeita.")) {
        return;
    }
    
    setIsDeleting(true);
    setError(null); // Limpa erros anteriores
    
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Sessão expirada.");
        const token = await currentUser.getIdToken(); 

        // 1. Busca os dados atuais do salão
        const salonResponse = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const salonData = salonResponse.data;

        // 2. Filtra o array de serviços para remover o serviço com o ID correspondente
        // Usamos o ID que o serviço tinha no Firetore (se tiver), ou o ID temporário do frontend.
        const updatedServices = salonData.servicos.filter(s => s.id !== serviceId);

        // 3. Prepara o payload para o PUT
        const payload = {
            ...salonData, // Todos os dados existentes
            servicos: updatedServices, // Lista filtrada
        };
        
        // 4. Envia o PUT
        await axios.put(`${API_BASE_URL}/admin/clientes/${salaoId}`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // 5. Sucesso: Recarrega a lista
        await fetchServices();

    } catch (err) {
        console.error("Erro ao remover serviço:", err.response?.data?.detail || err.message);
        setError("Falha ao remover serviço. Tente novamente.");
    } finally {
        setIsDeleting(false);
    }
  };
  // --- FIM DA FUNÇÃO DE EXCLUSÃO ---

  // Funções do Modal (sem alterações)
  const handleEdit = (service) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingService(null); 
  };
  
  // --- Renderização ---
  if (loading || isDeleting) { // Adiciona isDeleting ao loading
    return (
        <Card className="p-6 text-center shadow min-h-[300px] flex items-center justify-center">
             <Loader2 className="h-6 w-6 animate-spin text-purple-600 mx-auto mb-2" />
             <p className="text-gray-600">{isDeleting ? 'Removendo serviço...' : 'Carregando serviços...'}</p>
        </Card>
    );
  }

  if (error) {
    return (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg shadow">
            <h3 className="font-semibold mb-2">Erro</h3>
            <p>{error}</p>
        </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <Scissors className="w-6 h-6 mr-3 text-purple-600" />
        Gerenciar Meus Serviços
      </h2>

      {/* Botão para Adicionar Novo Serviço */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleAdd} 
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition-colors"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Adicionar Serviço
        </button>
      </div>

      {/* Lista de Serviços */}
      <div className="space-y-4">
        {services.length === 0 && (
            <Card className="p-6 text-center text-gray-500">Nenhum serviço cadastrado ainda.</Card>
        )}
        
        {services.map((service) => (
          <Card key={service.id} className="p-5 bg-white shadow-md border-gray-100 flex justify-between items-start">
            <div className="flex-grow">
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                {service.nome_servico}
              </h3>
              <p className="text-sm text-gray-500 mb-2">{service.descricao}</p>
              
              <div className="flex gap-4 text-sm text-gray-600">
                {/* Duração */}
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {service.duracao_minutos} min
                </span>
                {/* Preço */}
                <span className="flex items-center gap-1 font-bold">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  {service.preco ? `R$ ${service.preco.toFixed(2).replace('.', ',')}` : 'Grátis'}
                </span>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-2 flex-shrink-0">
              <button 
                title="Editar Serviço" 
                onClick={() => handleEdit(service)} 
                className="p-2 rounded-full text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </button>
              <button 
                title="Remover Serviço" 
                onClick={() => handleRemove(service.id)} // Chama a nova lógica de remoção
                className="p-2 rounded-full text-red-600 hover:bg-red-50 transition-colors"
                disabled={isDeleting}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </Card>
        ))}
      </div>
      
      {/* --- RENDERIZAÇÃO DO MODAL --- */}
      <ServiceFormModal 
        isOpen={isModalOpen}
        onClose={handleClose}
        serviceData={editingService} 
        salaoId={salaoId}
        currentServices={services} 
        onSaveSuccess={fetchServices} 
      />
      {/* --- FIM DA RENDERIZAÇÃO DO MODAL --- */}

    </div>
  );
}

export default ServicosPage;