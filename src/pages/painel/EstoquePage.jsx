import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
    Package, Plus, Search, AlertTriangle, CheckCircle, XCircle, 
    TrendingUp, DollarSign, MoreHorizontal, Trash2, Edit3, Minus
} from 'lucide-react';
import { useSalon } from './PainelLayout';
import HourglassLoading from '@/components/HourglassLoading';
import toast from 'react-hot-toast';
import { auth } from '@/firebaseConfig';

const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- COMPONENTES VISUAIS ---

// 1. Card de Resumo (Topo)
const StockSummaryCard = ({ title, value, subtitle, icon: IconComp, colorClass, bgClass }) => (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-3xl font-extrabold text-gray-900">{value}</h3>
            <p className={`text-xs font-medium mt-1 ${colorClass}`}>{subtitle}</p>
        </div>
        <div className={`p-3 rounded-2xl ${bgClass} ${colorClass}`}>
            <IconComp className="w-6 h-6" />
        </div>
    </div>
);

// 2. Card de Produto (Lista)
const ProductCard = ({ product, onEdit, onDelete, onAdjust }) => {
    // Define estilo baseado no status
    const statusStyles = {
        critical: { border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-700', icon: XCircle, label: 'Esgotado' },
        low: { border: 'border-yellow-200', bg: 'bg-yellow-50', text: 'text-yellow-700', icon: AlertTriangle, label: 'Baixo' },
        ok: { border: 'border-transparent', bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle, label: 'Em dia' },
    };
    const style = statusStyles[product.status] || statusStyles.ok;
    const StatusIcon = style.icon;

    return (
        <div className={`group bg-white p-5 rounded-2xl shadow-sm border transition-all hover:shadow-md ${product.status === 'ok' ? 'border-gray-100' : style.border}`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${style.bg} ${style.text}`}>
                    <StatusIcon className="w-3.5 h-3.5" /> {style.label}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(product)} className="p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg"><Edit3 className="w-4 h-4"/></button>
                    <button onClick={() => onDelete(product.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                </div>
            </div>

            <h3 className="font-bold text-gray-900 text-lg mb-1 truncate">{product.nome}</h3>
            <p className="text-xs text-gray-500 mb-4 uppercase tracking-wide">{product.categoria}</p>

            <div className="flex items-end justify-between">
                <div>
                    <p className="text-xs text-gray-400 mb-0.5">Quantidade</p>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => onAdjust(product.id, -1)}
                            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <span className={`text-xl font-extrabold ${product.quantidade_atual <= product.quantidade_minima ? 'text-red-600' : 'text-gray-900'}`}>
                            {product.quantidade_atual}
                        </span>
                        <button 
                            onClick={() => onAdjust(product.id, 1)}
                            className="w-8 h-8 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white flex items-center justify-center transition-colors shadow-md shadow-cyan-200"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-400 mb-0.5">Custo</p>
                    <p className="font-bold text-gray-700">R$ {product.preco_custo.toFixed(2)}</p>
                </div>
            </div>
        </div>
    );
};

// 3. Modal de Produto
const ProductModal = ({ isOpen, onClose, onSave, initialData, primaryColor }) => {
    const [formData, setFormData] = useState({
        nome: '', categoria: 'Geral', quantidade_atual: 0, quantidade_minima: 5, preco_custo: 0, preco_venda: 0
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) setFormData(initialData);
            else setFormData({ nome: '', categoria: 'Geral', quantidade_atual: 0, quantidade_minima: 5, preco_custo: 0, preco_venda: 0 });
        }
    }, [isOpen, initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...formData, 
            quantidade_atual: parseInt(formData.quantidade_atual),
            quantidade_minima: parseInt(formData.quantidade_minima),
            preco_custo: parseFloat(formData.preco_custo),
            preco_venda: parseFloat(formData.preco_venda)
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">{initialData ? 'Editar Produto' : 'Novo Produto'}</h3>
                    <button onClick={onClose}><XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Produto</label>
                        <input required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="Ex: Shampoo Premium" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                            <select value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none">
                                <option value="Geral">Geral</option>
                                <option value="Revenda">Revenda</option>
                                <option value="Consumo">Consumo Interno</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estoque Atual</label>
                            <input type="number" required value={formData.quantidade_atual} onChange={e => setFormData({...formData, quantidade_atual: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 text-red-500">Mínimo (Alerta)</label>
                            <input type="number" required value={formData.quantidade_minima} onChange={e => setFormData({...formData, quantidade_minima: e.target.value})} className="w-full p-3 bg-red-50 text-red-900 rounded-xl border-none outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preço Custo</label>
                            <input type="number" step="0.01" required value={formData.preco_custo} onChange={e => setFormData({...formData, preco_custo: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none" />
                        </div>
                    </div>
                    <button type="submit" className="w-full py-4 rounded-xl text-white font-bold shadow-lg mt-4 hover:opacity-90 transition-opacity" style={{ backgroundColor: primaryColor }}>Salvar Produto</button>
                </form>
            </div>
        </div>
    );
};

// --- PÁGINA PRINCIPAL ---
export default function EstoquePage() {
    const { salaoId, salonDetails } = useSalon();
    const primaryColor = salonDetails?.cor_primaria || '#00ACC1';
    
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    // Fetch
    const fetchProducts = useCallback(async () => {
        if (!salaoId || !auth.currentUser) return;
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await axios.get(`${API_BASE_URL}/admin/estoque/produtos`, { headers: { Authorization: `Bearer ${token}` } });
            setProducts(res.data);
        } catch (err) { console.error(err); toast.error("Erro ao carregar estoque."); } 
        finally { setLoading(false); }
    }, [salaoId]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    // Actions
    const handleSave = async (data) => {
        try {
            const token = await auth.currentUser.getIdToken();
            const headers = { Authorization: `Bearer ${token}` };
            
            if (editingProduct) {
                await axios.put(`${API_BASE_URL}/admin/estoque/produtos/${editingProduct.id}`, data, { headers });
                toast.success("Produto atualizado!");
            } else {
                await axios.post(`${API_BASE_URL}/admin/estoque/produtos`, data, { headers });
                toast.success("Produto criado!");
            }
            setIsModalOpen(false);
            fetchProducts();
        } catch (err) { toast.error("Erro ao salvar."); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Excluir produto?")) return;
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.delete(`${API_BASE_URL}/admin/estoque/produtos/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Excluído.");
            fetchProducts();
        } catch (err) { toast.error("Erro ao excluir."); }
    };

    const handleQuickAdjust = async (id, amount) => {
        // Otimista
        setProducts(prev => prev.map(p => {
            if (p.id === id) {
                const newQty = Math.max(0, p.quantidade_atual + amount);
                // Recalcula status visualmente
                let newStatus = 'ok';
                if (newQty === 0) newStatus = 'critical';
                else if (newQty <= p.quantidade_minima) newStatus = 'low';
                return { ...p, quantidade_atual: newQty, status: newStatus };
            }
            return p;
        }));

        try {
            const token = await auth.currentUser.getIdToken();
            await axios.patch(`${API_BASE_URL}/admin/estoque/produtos/${id}/ajuste`, null, { 
                params: { amount },
                headers: { Authorization: `Bearer ${token}` } 
            });
        } catch (err) { 
            toast.error("Erro na sincronização.");
            fetchProducts(); // Reverte em caso de erro
        }
    };

    // Filtro
    const filtered = products.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()));

    // Resumo
    const totalItems = products.reduce((acc, p) => acc + p.quantidade_atual, 0);
    const totalValue = products.reduce((acc, p) => acc + (p.quantidade_atual * p.preco_custo), 0);
    const lowStockCount = products.filter(p => p.status === 'low' || p.status === 'critical').length;

    if (loading) return <div className="h-96 flex items-center justify-center"><HourglassLoading /></div>;

    return (
        <div className="font-sans pb-20 max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                            <Package className="w-6 h-6" style={{ color: primaryColor }} />
                        </div>
                        Controle de Estoque
                    </h1>
                    <p className="text-gray-500 mt-1 ml-12 text-sm">Gerencie seus produtos e evite faltas.</p>
                </div>
                
                <button 
                    onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-6 py-3 text-white rounded-xl font-bold shadow-lg transition-all hover:-translate-y-0.5"
                    style={{ backgroundColor: primaryColor }}
                >
                    <Plus className="w-5 h-5" /> Novo Produto
                </button>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StockSummaryCard 
                    title="Itens em Estoque" 
                    value={totalItems} 
                    subtitle={`${products.length} produtos cadastrados`}
                    icon={Package} colorClass="text-cyan-700" bgClass="bg-cyan-50" 
                />
                <StockSummaryCard 
                    title="Valor em Caixa" 
                    value={`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    subtitle="Custo total do inventário"
                    icon={DollarSign} colorClass="text-emerald-700" bgClass="bg-emerald-50" 
                />
                <StockSummaryCard 
                    title="Atenção Necessária" 
                    value={lowStockCount} 
                    subtitle="Produtos com estoque baixo/zerado"
                    icon={AlertTriangle} colorClass="text-orange-700" bgClass="bg-orange-50" 
                />
            </div>

            {/* Barra de Pesquisa */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-8 flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Buscar produto..." 
                    className="flex-1 outline-none text-gray-700 placeholder-gray-400 bg-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Grid de Produtos */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum produto encontrado.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map(product => (
                        <ProductCard 
                            key={product.id} 
                            product={product} 
                            onEdit={() => { setEditingProduct(product); setIsModalOpen(true); }}
                            onDelete={handleDelete}
                            onAdjust={handleQuickAdjust}
                        />
                    ))}
                </div>
            )}

            <ProductModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSave}
                initialData={editingProduct}
                primaryColor={primaryColor}
            />
        </div>
    );
}