import React, { useState, useEffect, useCallback } from 'react';
import { 
    DollarSign, TrendingUp, TrendingDown, Wallet, Plus, 
    ArrowUpRight, ArrowDownRight, Trash2, CheckCircle, AlertCircle, Filter, ArrowDown
} from 'lucide-react';
import { useSalon } from './PainelLayout';
import HourglassLoading from '@/components/HourglassLoading';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { format, parseISO } from 'date-fns'; // 🌟 parseISO adicionado aqui
import { ptBR } from 'date-fns/locale';
import axios from 'axios';
import { auth } from '@/firebaseConfig';
import toast from 'react-hot-toast';

const API_BASE_URL = "https://api-agendador-2n55.onrender.com/api/v1";

// Cores do Tema
const INCOME_COLOR = '#10B981'; // Emerald 500
const EXPENSE_COLOR = '#F43F5E'; // Rose 500
const PROFIT_COLOR = '#00ACC1'; // Ciano Horalis

// --- COMPONENTES UI ---

// 1. Card Financeiro (Hero)
const FinanceCard = ({ title, value, type = 'neutral', icon: Icon, trend }) => {
    const colors = {
        income: { bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100' },
        expense: { bg: 'bg-rose-50', text: 'text-rose-700', iconBg: 'bg-rose-100' },
        neutral: { bg: 'bg-white', text: 'text-gray-900', iconBg: 'bg-cyan-50 text-cyan-700' },
    };
    const style = colors[type];

    return (
        <div className={`relative overflow-hidden rounded-3xl p-6 border border-gray-100 shadow-sm transition-all hover:shadow-md ${type === 'neutral' ? 'bg-white' : style.bg}`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{title}</p>
                    <h3 className={`text-3xl font-extrabold ${style.text}`}>{value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${style.iconBg}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            
            {trend && (
                <div className="flex items-center text-xs font-medium opacity-80">
                    {type === 'income' ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                    <span>{trend} vs. período anterior</span>
                </div>
            )}
        </div>
    );
};

// 2. Modal de Adicionar Despesa
const AddExpenseModal = ({ isOpen, onClose, onSave, primaryColor }) => {
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('fixa'); // fixa ou variavel
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onSave({ description: desc, amount: parseFloat(amount), category, date, status: 'pending' });
        setIsSubmitting(false);
        onClose();
        setDesc(''); setAmount(''); // Reset
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900">Nova Despesa</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowDown className="w-5 h-5 text-gray-500"/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição</label>
                        <input required value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Conta de Luz" className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-cyan-500 outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor (R$)</label>
                            <input required type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-cyan-500 outline-none transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                            <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-cyan-500 outline-none transition-all" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setCategory('fixa')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${category === 'fixa' ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-50 text-gray-500'}`}>Custo Fixo</button>
                            <button type="button" onClick={() => setCategory('variavel')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${category === 'variavel' ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-50 text-gray-500'}`}>Variável</button>
                        </div>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full py-3.5 rounded-xl text-white font-bold shadow-lg mt-4 hover:opacity-90 transition-opacity" style={{ backgroundColor: primaryColor }}>
                        {isSubmitting ? 'Salvando...' : 'Adicionar Despesa'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// ==================================================
// PÁGINA PRINCIPAL
// ==================================================
export default function FinanceiroPage() {
    const { salaoId, salonDetails } = useSalon();
    const primaryColor = salonDetails?.cor_primaria || '#00ACC1';
    
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month'); // month, week
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Estado REAL dos dados
    const [summary, setSummary] = useState({
        total_revenue: 0,
        total_expenses: 0,
        net_profit: 0,
        expenses_list: [],
        chart_data: []
    });

    // --- 1. BUSCAR DADOS (INTEGRAÇÃO REAL) ---
    const fetchData = useCallback(async () => {
        if (!salaoId || !auth.currentUser) return;
        setLoading(true);
        
        try {
            const token = await auth.currentUser.getIdToken();
            const response = await axios.get(`${API_BASE_URL}/admin/financeiro/resumo`, {
                params: { period }, // Envia 'week' ou 'month'
                headers: { Authorization: `Bearer ${token}` }
            });
            setSummary(response.data);
        } catch (err) {
            console.error("Erro financeiro:", err);
            toast.error("Erro ao atualizar dados financeiros.");
        } finally {
            setLoading(false);
        }
    }, [salaoId, period]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- 2. HANDLERS (AÇÕES) ---

    const handleAddExpense = async (newExpense) => {
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.post(`${API_BASE_URL}/admin/financeiro/despesas`, newExpense, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Despesa salva!");
            fetchData(); // Recarrega para atualizar saldo e gráfico
        } catch (e) {
            console.error(e);
            toast.error("Erro ao salvar despesa.");
        }
    };

    const toggleExpenseStatus = async (id) => {
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.patch(`${API_BASE_URL}/admin/financeiro/despesas/${id}/toggle`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Atualização Otimista (UI first)
            setSummary(prev => ({
                ...prev,
                expenses_list: prev.expenses_list.map(e => e.id === id ? {...e, status: e.status === 'paid' ? 'pending' : 'paid'} : e)
            }));
        } catch (e) { toast.error("Erro ao atualizar status."); }
    };

    const deleteExpense = async (id) => {
        if(!window.confirm("Remover esta despesa?")) return;
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.delete(`${API_BASE_URL}/admin/financeiro/despesas/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Despesa removida.");
            fetchData();
        } catch (e) { toast.error("Erro ao remover."); }
    };

    if (loading && !summary.chart_data.length) return <div className="h-96 flex items-center justify-center"><HourglassLoading message="Calculando finanças..." /></div>;

    return (
        <div className="font-sans pb-20 max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                            <DollarSign className="w-6 h-6 text-emerald-600" />
                        </div>
                        Controle Financeiro
                    </h1>
                    <p className="text-gray-500 mt-1 ml-12 text-sm">Gerencie seu fluxo de caixa e lucratividade.</p>
                </div>
                
                <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                    <button onClick={() => setPeriod('week')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${period === 'week' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Semana</button>
                    <button onClick={() => setPeriod('month')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${period === 'month' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Mês</button>
                </div>
            </div>

            {/* 1. Cards de Resumo (DADOS REAIS) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <FinanceCard 
                    title="Entradas (Receita)" 
                    value={`R$ ${summary.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    type="income" 
                    icon={TrendingUp} 
                />
                <FinanceCard 
                    title="Saídas (Despesas)" 
                    value={`R$ ${summary.total_expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    type="expense" 
                    icon={TrendingDown} 
                />
                <FinanceCard 
                    title="Lucro Líquido" 
                    value={`R$ ${summary.net_profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    type="neutral" 
                    icon={Wallet} 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 2. Gráfico de Fluxo (DADOS REAIS) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-900 text-lg">Fluxo de Caixa</h3>
                        <div className="flex gap-4 text-xs font-medium">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Entradas</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Saídas</span>
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={summary.chart_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={INCOME_COLOR} stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor={INCOME_COLOR} stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={EXPENSE_COLOR} stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor={EXPENSE_COLOR} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '12px', color: 'white' }}
                                    labelStyle={{ fontWeight: 'bold', color: '#9CA3AF', marginBottom: '5px' }}
                                />
                                <Area type="monotone" dataKey="entradas" stroke={INCOME_COLOR} strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" name="Receita" />
                                <Area type="monotone" dataKey="saidas" stroke={EXPENSE_COLOR} strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" name="Despesa" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. Lista de Despesas (DADOS REAIS) */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-900 text-lg">Minhas Despesas</h3>
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="p-2 rounded-full bg-gray-900 text-white hover:bg-gray-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 max-h-[400px]">
                        {summary.expenses_list.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400">
                                <Wallet className="w-10 h-10 mb-2 opacity-20" />
                                <p className="text-sm">Nenhuma despesa registrada.</p>
                            </div>
                        ) : (
                            summary.expenses_list.map(expense => (
                                <div key={expense.id} className="group flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-transparent hover:border-gray-200 hover:bg-white transition-all">
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => toggleExpenseStatus(expense.id)}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${expense.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400 hover:bg-gray-300'}`}
                                            title={expense.status === 'paid' ? "Marcar como pendente" : "Marcar como pago"}
                                        >
                                            {expense.status === 'paid' ? <CheckCircle className="w-5 h-5" /> : <div className="w-3 h-3 rounded-full bg-gray-400" />}
                                        </button>
                                        <div>
                                            <p className={`font-bold text-sm ${expense.status === 'paid' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{expense.description}</p>
                                            {/* Correção de ParseISO aqui também */}
                                            <p className="text-xs text-gray-500">{format(parseISO(expense.date), 'dd/MM')} • {expense.category === 'fixa' ? 'Fixo' : 'Variável'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-2">
                                        <p className="font-bold text-rose-600 text-sm">- R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        <button onClick={() => deleteExpense(expense.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    {/* Rodapé da lista: Total Pendente */}
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                        <span className="text-gray-500">Total Pendente:</span>
                        <span className="font-bold text-gray-900">
                            R$ {summary.expenses_list.filter(e => e.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>

            <AddExpenseModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleAddExpense}
                primaryColor={primaryColor}
            />
        </div>
    );
}