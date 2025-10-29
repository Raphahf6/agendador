// frontend/src/pages/painel/ServicosPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
// import { Card } from '@/ui/card'; // Removido Card (usaremos divs)
import { Scissors, DollarSign, Clock, Loader2, PlusCircle, Trash2, X, Edit3 } from 'lucide-react'; // Adicionado Edit3
import { auth } from '@/firebaseConfig';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// <<< DEFINIÇÕES DE COR >>>
const CIANO_COLOR_TEXT = 'text-cyan-600';
const CIANO_COLOR_BG = 'bg-cyan-800';
const CIANO_COLOR_BG_HOVER = 'hover:bg-cyan-700';
const CIANO_RING_FOCUS = 'focus:ring-cyan-400';
const CIANO_BORDER_FOCUS = 'focus:border-cyan-400';

// Helper Ícone Simples
const Icon = ({ icon: IconComponent, className = "" }) => (
  <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// --- COMPONENTE MODAL DE EDIÇÃO/CRIAÇÃO ---
const ServiceFormModal = ({ isOpen, onClose, serviceData, salaoId, currentServices, onSaveSuccess }) => {
    const [formData, setFormData] = useState(() => ({
        id: serviceData?.id || null,
        nome_servico: serviceData?.nome_servico || '',
        duracao_minutos: serviceData?.duracao_minutos || 30,
        preco: serviceData?.preco || 0,
        descricao: serviceData?.descricao || '',
    }));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const isNew = formData.id === null;

    useEffect(() => {
        setFormData({
            id: serviceData?.id || null,
            nome_servico: serviceData?.nome_servico || '',
            duracao_minutos: serviceData?.duracao_minutos || 30,
            preco: serviceData?.preco || 0,
            descricao: serviceData?.descricao || '',
        });
        setError('');
    }, [serviceData, isOpen]); // Resetar no fechamento também

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'duracao_minutos' || name === 'preco' ? (Number(value) || 0) : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        if (!formData.nome_servico.trim() || !formData.duracao_minutos) {
            setError("Nome e Duração são obrigatórios."); setLoading(false); return;
        }

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("Sessão expirada.");
            const token = await currentUser.getIdToken();

            // Pega dados atuais do salão
            const salonResponse = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const salonData = salonResponse.data;

            let newServicesList;
            if (isNew) {
                const serviceToSave = { ...formData }; delete serviceToSave.id;
                // Garante que a lista de serviços exista antes de adicionar
                newServicesList = [...(salonData.servicos || []), serviceToSave];
            } else {
                newServicesList = (salonData.servicos || []).map(s =>
                    s.id === formData.id ? { ...formData } : s
                );
            }

            const payload = { ...salonData, id: salaoId, servicos: newServicesList };
            await axios.put(`${API_BASE_URL}/admin/clientes/${salaoId}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            onSaveSuccess(); onClose();
        } catch (err) {
            console.error("Erro ao salvar serviço:", err);
            setError(err.response?.data?.detail || "Falha ao salvar serviço.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"> {/* Aumentado opacity */}
             {/* <<< ALTERADO: Card com bg-white, rounded-xl >>> */}
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
                {/* Cabeçalho do Modal */}
                <div className="flex justify-between items-center p-5 border-b border-gray-200"> {/* Ajustado padding */}
                    <h2 className="text-xl font-semibold text-gray-800">
                        {isNew ? 'Adicionar Novo Serviço' : `Editar Serviço`}
                    </h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
                        <Icon icon={X} className="w-5 h-5" /> {/* Ajustado tamanho */}
                    </button>
                </div>
                {/* Formulário */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto"> {/* Adicionado max-h e overflow */}
                    <div>
                        <label htmlFor="nome_servico" className="block text-sm font-medium text-gray-700 mb-1">Nome do Serviço*</label>
                        <input name="nome_servico" id="nome_servico" type="text" value={formData.nome_servico} onChange={handleChange}
                               // <<< ALTERADO: Foco Ciano >>>
                               className={`w-full border border-gray-300 rounded-md p-2 h-10 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`} disabled={loading} required/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="duracao_minutos" className="block text-sm font-medium text-gray-700 mb-1">Duração (min)*</label>
                            <input name="duracao_minutos" id="duracao_minutos" type="number" value={formData.duracao_minutos} onChange={handleChange}
                                   // <<< ALTERADO: Foco Ciano >>>
                                   className={`w-full border border-gray-300 rounded-md p-2 h-10 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`} disabled={loading} required min="5"/> {/* Min 5 min */}
                        </div>
                        <div>
                            <label htmlFor="preco" className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                            <input name="preco" id="preco" type="number" step="0.01" value={formData.preco} onChange={handleChange}
                                   // <<< ALTERADO: Foco Ciano >>>
                                   className={`w-full border border-gray-300 rounded-md p-2 h-10 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS}`} disabled={loading} min="0"/>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">Descrição (Opcional)</label>
                        <textarea name="descricao" id="descricao" rows="3" value={formData.descricao} onChange={handleChange}
                                  // <<< ALTERADO: Foco Ciano >>>
                                  className={`w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 ${CIANO_RING_FOCUS} ${CIANO_BORDER_FOCUS} resize-none`} disabled={loading} /> {/* Desabilitado resize */}
                    </div>

                    {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}

                    {/* Botão Salvar */}
                    <div className="flex justify-end pt-4 border-t border-gray-100"> {/* Adicionado border-t */}
                        <button
                            type="submit"
                             // <<< ALTERADO: Botão Ciano >>>
                            className={`flex items-center px-6 py-2.5 ${CIANO_COLOR_BG} text-white rounded-lg shadow-sm ${CIANO_COLOR_BG_HOVER} transition-colors disabled:opacity-50`}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin stroke-current mr-2" /> : null}
                            {isNew ? 'Adicionar Serviço' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

function ServicosPage() {
  const { salaoId } = useParams();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Função fetchServices (sem alteração funcional)
  const fetchServices = useCallback(async () => {
    // ... (lógica fetchServices existente, garantindo que retorna ID) ...
     if (!salaoId) { setError("ID do Salão inválido."); setLoading(false); return; }
     const currentUser = auth.currentUser;
     if (!currentUser) { setError("Sessão expirada."); setLoading(false); return; }
     const token = await currentUser.getIdToken();
     setLoading(true); setError(null);
     try {
        const response = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        // Garante que 'servicos' exista e seja um array antes de mapear
        const servicesData = response.data?.servicos || [];
        if (Array.isArray(servicesData)) {
            const servicesWithKeys = servicesData.map((s, index) => ({
                ...s, id: s.id || `temp-${Date.now()}-${index}` // ID mais robusto
            }));
            setServices(servicesWithKeys);
        } else { setServices([]); }
     } catch (err) {
        setError(err.response?.data?.detail || "Não foi possível carregar os serviços.");
     } finally { setLoading(false); }
  }, [salaoId]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  // Função handleRemove (sem alteração funcional)
  const handleRemove = async (serviceIdToRemove) => {
    // ... (lógica handleRemove existente, usando PUT) ...
      if (!window.confirm("Remover este serviço?")) return;
      setIsDeleting(true); setError(null);
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Sessão expirada.");
        const token = await currentUser.getIdToken();
        const salonResponse = await axios.get(`${API_BASE_URL}/admin/clientes/${salaoId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const salonData = salonResponse.data;
        const updatedServices = (salonData.servicos || []).filter(s => s.id !== serviceIdToRemove);
        const payload = { ...salonData, servicos: updatedServices };
        await axios.put(`${API_BASE_URL}/admin/clientes/${salaoId}`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        await fetchServices(); // Recarrega
      } catch (err) {
        setError("Falha ao remover serviço.");
      } finally { setIsDeleting(false); }
  };

  const handleEdit = (service) => { setEditingService(service); setIsModalOpen(true); };
  const handleAdd = () => { setEditingService(null); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingService(null); };

  // Renderização Loading/Error
  if (loading || isDeleting) {
    return (
      // <<< ALTERADO: Card e Spinner Ciano >>>
      <div className="p-6 text-center bg-white rounded-lg shadow-md border border-gray-200 min-h-[300px] flex flex-col items-center justify-center font-sans">
          <Loader2 className={`h-8 w-8 animate-spin ${CIANO_COLOR_TEXT} mb-3`} />
          <p className="text-gray-600">{isDeleting ? 'Removendo serviço...' : 'Carregando serviços...'}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-lg shadow border border-red-200 font-sans">
          <h3 className="font-semibold mb-2">Erro</h3>
          <p>{error}</p>
      </div>
    );
  }

  // Renderização Principal
  return (
    <div className="font-sans"> {/* Adicionado font-sans */}
       {/* <<< ALTERADO: Título com Ícone Ciano >>> */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        {/* O Ícone agora herda text-gray-900, mas podemos deixá-lo cinza médio se preferir */}
        <Icon icon={Scissors} className="w-6 h-6 mr-3" /> {/* Ícone cinza médio */}
        Gerenciar Meus Serviços
      </h2>

       {/* <<< ALTERADO: Botão Adicionar Verde (padrão para adição) ou Ciano >>> */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleAdd}
           // Classes Ciano aplicadas
          className={`flex items-center px-4 py-2 ${CIANO_COLOR_BG} text-white rounded-lg shadow-sm ${CIANO_COLOR_BG_HOVER} transition-colors`}
        >
          <Icon icon={PlusCircle} className="w-5 h-5 mr-2" />
          Adicionar Serviço
        </button>
      </div>

      {/* Lista de Serviços */}
      <div className="space-y-4">
        {services.length === 0 && (
            <div className="p-6 text-center text-gray-500 bg-white rounded-lg border border-gray-200 shadow-sm">Nenhum serviço cadastrado ainda.</div>
        )}

        {services.map((service) => (
           // <<< ALTERADO: Card com bg-white, shadow-sm, border >>>
          <div key={service.id} className="p-5 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start gap-4"> {/* Adicionado flex-col/sm:flex-row e gap */}
            {/* Informações do Serviço */}
            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-gray-800 mb-1"> {/* Reduzido tamanho fonte */}
                {service.nome_servico}
              </h3>
              {service.descricao && ( // Mostra descrição apenas se existir
                 <p className="text-sm text-gray-500 mb-2">{service.descricao}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 items-center"> {/* Adicionado flex-wrap e items-center */}
                <span className="flex items-center gap-1">
                  <Icon icon={Clock} className="w-4 h-4 text-gray-400" />
                  {service.duracao_minutos} min
                </span>
                <span className="flex items-center gap-1 font-medium"> {/* Removido font-bold */}
                  <Icon icon={DollarSign} className="w-4 h-4 text-gray-400" />
                  {service.preco != null && service.preco >= 0 ? `R$ ${Number(service.preco).toFixed(2).replace('.', ',')}` : 'Grátis'}
                </span>
              </div>
            </div>

            {/* Botões de Ação */}
             {/* <<< ALTERADO: Botões com Ciano (editar) e Vermelho (remover) >>> */}
            <div className="flex gap-2 flex-shrink-0 mt-3 sm:mt-0"> {/* Adicionado margin top mobile */}
              <button
                title="Editar Serviço"
                onClick={() => handleEdit(service)}
                 // Cor Ciano para Editar
                className={`p-2 rounded-full ${CIANO_COLOR_TEXT} hover:bg-cyan-50 transition-colors`}
              >
                 <Icon icon={Edit3} className="w-5 h-5"/> {/* Ícone de Editar */}
              </button>
              <button
                title="Remover Serviço"
                onClick={() => handleRemove(service.id)}
                 // Cor Vermelha para Remover
                className="p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                disabled={isDeleting}
              >
                <Icon icon={Trash2} className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <ServiceFormModal
        isOpen={isModalOpen}
        onClose={handleClose}
        serviceData={editingService}
        salaoId={salaoId}
        currentServices={services}
        onSaveSuccess={fetchServices}
      />
    </div>
  );
}

export default ServicosPage;