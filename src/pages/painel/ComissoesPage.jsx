import React, { useState, useEffect, useMemo } from 'react';
import { 
    Calendar, Users, DollarSign, ChevronLeft, ChevronRight, 
    ChevronDown, ChevronUp, FileCheck, Wallet, PieChart
} from 'lucide-react';
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db, auth } from '@/firebaseConfig';
import { useSalon } from './PainelLayout';
import { startOfMonth, endOfMonth, format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import HourglassLoading from '@/components/HourglassLoading';
import axios from 'axios';

const API_BASE_URL = "https://api-agendador-2n55.onrender.com/api/v1";

// --- Card de Resumo (Topo) ---
const SummaryCard = ({ title, value, subtext, icon: Icon, colorClass, bgClass }) => (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className={`p-4 rounded-2xl ${bgClass} ${colorClass}`}>
            <Icon className="w-8 h-8" />
        </div>
        <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">{title}</p>
            <h3 className="text-2xl font-extrabold text-gray-900">{value}</h3>
            {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
    </div>
);

export default function ComissoesPage() {
    const { salaoId, salonDetails } = useSalon();
    const primaryColor = salonDetails?.cor_primaria || '#0E7490';
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [professionals, setProfessionals] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [expandedProId, setExpandedProId] = useState(null);

    // 1. Carregar Dados (Profissionais + Agendamentos do Mês)
    useEffect(() => {
        const fetchData = async () => {
            if (!salaoId || !auth.currentUser) return;
            setLoading(true);
            try {
                const token = await auth.currentUser.getIdToken();
                
                // A. Buscar Profissionais (para pegar a % de comissão atual)
                const teamRes = await axios.get(`${API_BASE_URL}/admin/equipe`, { 
                    headers: { Authorization: `Bearer ${token}` } 
                });
                setProfessionals(teamRes.data);

                // B. Buscar Agendamentos do Mês (Apenas Confirmados)
                const start = startOfMonth(currentDate);
                const end = endOfMonth(currentDate);
                
                const q = query(
                    collection(db, 'cabeleireiros', salaoId, 'agendamentos'),
                    where("startTime", ">=", start),
                    where("startTime", "<=", end),
                    where("status", "==", "confirmado") // 🌟 Regra de Ouro: Só paga o que foi confirmado
                );

                const snapshot = await getDocs(q);
                const appsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAppointments(appsData);

            } catch (error) {
                console.error("Erro ao calcular comissões:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [salaoId, currentDate]);

    // 2. Lógica de Cálculo (Cruzar Agendamentos x Profissionais)
    const reportData = useMemo(() => {
        return professionals.map(pro => {
            // Filtra agendamentos deste profissional
            const proApps = appointments.filter(app => app.professionalId === pro.id);
            
            // Soma o total gerado (Bruto)
            const totalGenerated = proApps.reduce((acc, app) => acc + (parseFloat(app.servicePrice) || 0), 0);
            
            // Calcula comissão (Baseado na % do cadastro do profissional)
            const commissionRate = pro.comissao || 0; 
            const commissionValue = totalGenerated * (commissionRate / 100);

            return {
                ...pro,
                totalGenerated,
                commissionRate,
                commissionValue,
                appointments: proApps.sort((a, b) => a.startTime - b.startTime) // Ordenar por data
            };
        }).sort((a, b) => b.commissionValue - a.commissionValue); // Ordenar quem ganha mais primeiro
    }, [professionals, appointments]);

    // Totais Gerais
    const totalRevenue = reportData.reduce((acc, item) => acc + item.totalGenerated, 0);
    const totalCommissions = reportData.reduce((acc, item) => acc + item.commissionValue, 0);

    // Navegação de Mês
    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    if (loading) return <div className="h-96 flex items-center justify-center"><HourglassLoading message="Calculando comissões..." /></div>;

    return (
        <div className="font-sans pb-20 max-w-5xl mx-auto">
            
            {/* --- HEADER E SELETOR DE DATA --- */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                            <Wallet className="w-6 h-6" style={{ color: primaryColor }} />
                        </div>
                        Relatório de Comissões
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm ml-12">Fechamento financeiro da equipe.</p>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 px-2 min-w-[140px] justify-center">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-bold text-gray-800 capitalize">
                            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                        </span>
                    </div>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* --- CARDS DE RESUMO --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <SummaryCard 
                    title="Faturamento Bruto (Equipe)" 
                    value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subtext={`${appointments.length} serviços realizados no período`}
                    icon={DollarSign}
                    bgClass="bg-blue-50"
                    colorClass="text-blue-600"
                />
                <SummaryCard 
                    title="Total de Comissões a Pagar" 
                    value={`R$ ${totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subtext="Valor líquido a repassar"
                    icon={PieChart}
                    bgClass="bg-green-50"
                    colorClass="text-green-600"
                />
            </div>

            {/* --- LISTA DE PROFISSIONAIS (ACORDEÃO) --- */}
            <div className="space-y-4">
                {reportData.map((pro) => (
                    <div key={pro.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
                        
                        {/* CABEÇALHO DO CARD (Sempre Visível) */}
                        <div 
                            onClick={() => setExpandedProId(expandedProId === pro.id ? null : pro.id)}
                            className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer"
                        >
                            {/* Info do Profissional */}
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                {pro.foto_url ? (
                                    <img src={pro.foto_url} alt={pro.nome} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-lg">
                                        {pro.nome.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">{pro.nome}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md flex items-center gap-1">
                                            {pro.commissionRate}% Comissão
                                        </span>
                                        <span className="text-xs text-gray-400">• {pro.appointments.length} serviços</span>
                                    </div>
                                </div>
                            </div>

                            {/* Valores Financeiros */}
                            <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                                <div className="text-right">
                                    <p className="text-xs font-bold text-gray-400 uppercase">Gerou</p>
                                    <p className="text-sm font-semibold text-gray-600">R$ {pro.totalGenerated.toFixed(2)}</p>
                                </div>
                                <div className="text-right bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                                    <p className="text-xs font-bold text-green-600 uppercase">Recebe</p>
                                    <p className="text-xl font-extrabold text-green-700">R$ {pro.commissionValue.toFixed(2)}</p>
                                </div>
                                <div className="text-gray-300">
                                    {expandedProId === pro.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </div>
                            </div>
                        </div>

                        {/* DETALHES DOS SERVIÇOS (Expansível) */}
                        {expandedProId === pro.id && (
                            <div className="bg-gray-50/50 border-t border-gray-100 p-6 animate-in slide-in-from-top-2 duration-200">
                                <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                    <FileCheck className="w-4 h-4" /> Detalhamento dos Serviços
                                </h4>
                                
                                {pro.appointments.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-gray-400 uppercase font-bold border-b border-gray-200">
                                                <tr>
                                                    <th className="pb-3 pl-2">Data/Hora</th>
                                                    <th className="pb-3">Cliente</th>
                                                    <th className="pb-3">Serviço</th>
                                                    <th className="pb-3 text-right">Valor Cheio</th>
                                                    <th className="pb-3 text-right pr-2">Comissão Calc.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {pro.appointments.map((app) => (
                                                    <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="py-3 pl-2 font-medium text-gray-700">
                                                            {app.startTime ? format(app.startTime.toDate(), "dd/MM 'às' HH:mm") : '-'}
                                                        </td>
                                                        <td className="py-3 text-gray-600">{app.customerName}</td>
                                                        <td className="py-3 text-gray-600">{app.serviceName}</td>
                                                        <td className="py-3 text-right font-bold text-gray-900">
                                                            R$ {parseFloat(app.servicePrice).toFixed(2)}
                                                        </td>
                                                        <td className="py-3 text-right font-bold text-green-600 pr-2">
                                                            + R$ {(parseFloat(app.servicePrice) * (pro.commissionRate / 100)).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-gray-400 text-center py-4">Nenhum serviço confirmado neste período.</p>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {reportData.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">Nenhum profissional com comissão gerada neste mês.</p>
                    </div>
                )}
            </div>
        </div>
    );
}