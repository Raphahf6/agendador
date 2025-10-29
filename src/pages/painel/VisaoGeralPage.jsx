// frontend/src/pages/painel/VisaoGeralPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom'; // Adicionado Link
import { auth, db } from '@/firebaseConfig';
import {
    collection, query, where, getDocs, onSnapshot, orderBy, limit, Timestamp, doc, getDoc
} from "firebase/firestore";
import { format, startOfDay, endOfDay, addDays, subDays, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Calendar, Users, BarChart2, Bell, CheckCircle, AlertTriangle, TrendingUp, CalendarPlus, CalendarDays } from 'lucide-react'; // Ícones
import LoadingSpinner from '@/components/LoadingSpinner'; // Reutiliza seu spinner

// Definições de Cor
const CIANO_COLOR_TEXT = 'text-cyan-600';

// Helper Ícone
const Icon = ({ icon: IconComponent, className = "" }) => (
    <IconComponent className={`stroke-current ${className}`} aria-hidden="true" />
);

// Componente Card KPI
const KpiCard = ({ title, value, icon: IconComp, isLoading }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center space-x-4">
        <div className={`p-3 rounded-full bg-cyan-50 ${CIANO_COLOR_TEXT}`}>
            <Icon icon={IconComp} className="w-6 h-6" />
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400 mt-1" />
            ) : (
                <p className="text-2xl font-bold text-gray-900">{value ?? '-'}</p>
            )}
        </div>
    </div>
);

// Componente Item da Lista de Notificações
const NotificationItem = ({ agendamento }) => {
    const formattedTime = agendamento.startTime ? format(agendamento.startTime.toDate(), 'dd/MM HH:mm') : 'Data inválida';
    const createdAtTime = agendamento.createdAt ? formatDistanceToNow(agendamento.createdAt.toDate(), { locale: ptBR, addSuffix: true }) : '';

    return (
        <li className="flex items-start space-x-3 py-3 border-b border-gray-100 last:border-b-0">
            <div className={`p-1.5 rounded-full bg-cyan-50 ${CIANO_COLOR_TEXT} mt-1`}>
                <Icon icon={CalendarPlus} className="w-4 h-4" />
            </div>
            <div className="flex-1">
                <p className="text-sm text-gray-800 leading-snug"> {/* Ajustado leading */}
                    Novo agendamento: <span className="font-semibold">{agendamento.serviceName || 'Serviço'}</span> com <span className="font-semibold">{agendamento.customerName || 'Cliente'}</span> em {formattedTime}.
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{createdAtTime}</p>
            </div>
        </li>
    );
};


function VisaoGeralPage() {
    const { salaoId } = useParams();
    const [kpiData, setKpiData] = useState({ hoje: null, prox7dias: null, novos24h: null, receitaHoje: null });
    const [ultimosAgendamentos, setUltimosAgendamentos] = useState([]);
    const [loadingKpi, setLoadingKpi] = useState(true);
    const [loadingNotificacoes, setLoadingNotificacoes] = useState(true);
    const [error, setError] = useState(null);

    // --- Busca de Dados para KPIs ---
    const fetchKpiData = useCallback(async () => {
        if (!salaoId || !auth.currentUser) return;
        setLoadingKpi(true);
        setError(null); // Limpa erro anterior

        try {
            const token = await auth.currentUser.getIdToken(); // Necessário para futuras chamadas API, se mover lógica
            const agendamentosRef = collection(db, 'cabeleireiros', salaoId, 'agendamentos');

            // Datas de referência (com fuso local, mas Firestore usa UTC)
            const hojeInicio = startOfDay(new Date());
            const hojeFim = endOfDay(new Date());
            const amanhaInicio = startOfDay(addDays(new Date(), 1));
            const prox7DiasFim = startOfDay(addDays(new Date(), 7));
            const ultimas24h = subDays(new Date(), 1);

            // 1. Agendamentos Hoje (Query)
            const hojeQuery = query(agendamentosRef,
                where("startTime", ">=", Timestamp.fromDate(hojeInicio)),
                where("startTime", "<", Timestamp.fromDate(amanhaInicio))
            );
            const hojeSnapshot = await getDocs(hojeQuery);
            const agendamentosHojeList = hojeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const countHoje = hojeSnapshot.size;

            // 2. Receita Estimada Hoje (Cálculo Ineficiente - RECOMENDA-SE SALVAR PREÇO NO AGENDAMENTO)
            let receitaEstimada = 0;
            const servicePriceCache = {}; // Cache simples para evitar buscar o mesmo serviço várias vezes
            for (const agd of agendamentosHojeList) {
                if (agd.serviceId) { // Só calcula se tiver serviceId
                    try {
                        let preco = servicePriceCache[agd.serviceId];
                        if (preco === undefined) { // Se não está no cache
                            const servicoRef = doc(db, 'cabeleireiros', salaoId, 'servicos', agd.serviceId);
                            const servicoSnap = await getDoc(servicoRef);
                            if (servicoSnap.exists()) {
                                preco = servicoSnap.data()?.preco ?? 0;
                                servicePriceCache[agd.serviceId] = preco; // Salva no cache
                            } else {
                                preco = 0; // Serviço não encontrado
                                servicePriceCache[agd.serviceId] = 0;
                            }
                        }
                        receitaEstimada += Number(preco);
                    } catch (serviceErr) {
                        console.warn(`Erro ao buscar preço do serviço ${agd.serviceId}:`, serviceErr);
                    }
                }
            }

            // 3. Agendamentos Próximos 7 Dias (Query)
            const prox7DiasQuery = query(agendamentosRef,
                where("startTime", ">=", Timestamp.fromDate(hojeInicio)), // Começa de hoje
                where("startTime", "<", Timestamp.fromDate(prox7DiasFim))
            );
            const prox7DiasSnapshot = await getDocs(prox7DiasQuery);
            const countProx7Dias = prox7DiasSnapshot.size;

            // 4. Novos Agendamentos (Últimas 24h) (Query)
            const novos24hQuery = query(agendamentosRef,
                where("createdAt", ">=", Timestamp.fromDate(ultimas24h))
            );
            const novos24hSnapshot = await getDocs(novos24hQuery);
            const countNovos24h = novos24hSnapshot.size;

            // Atualiza o estado
            setKpiData({
                hoje: countHoje,
                prox7dias: countProx7Dias,
                novos24h: countNovos24h,
                receitaHoje: receitaEstimada > 0 ? receitaEstimada.toFixed(2).replace('.', ',') : '0,00', // Formata como R$
            });

        } catch (err) {
            console.error("Erro ao buscar KPIs:", err);
            setError("Não foi possível carregar os indicadores.");
        } finally {
            setLoadingKpi(false);
        }
    }, [salaoId]);

    // --- Listener para Últimos Agendamentos (Notificações) ---
    useEffect(() => {
        if (!salaoId) return;
        setLoadingNotificacoes(true);

        const agendamentosRef = collection(db, 'cabeleireiros', salaoId, 'agendamentos');
        const q = query(agendamentosRef, orderBy("createdAt", "desc"), limit(5)); // Pega os 5 mais recentes

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const notifications = [];
            querySnapshot.forEach((doc) => {
                notifications.push({ id: doc.id, ...doc.data() });
            });
            setUltimosAgendamentos(notifications);
            setLoadingNotificacoes(false);
        }, (err) => {
            console.error("Erro no listener de notificações:", err);
            setError("Erro ao carregar últimos agendamentos.");
            setLoadingNotificacoes(false);
        });

        // Cleanup listener no desmontar
        return () => unsubscribe();
    }, [salaoId]);

    // Busca KPIs quando o componente monta
    useEffect(() => {
        fetchKpiData();
    }, [fetchKpiData]);

    // --- Renderização ---
    return (
        <div className="font-sans space-y-8">
            {/* Título */}
            <h2 className={`text-2xl font-bold text-gray-900 flex items-center ${CIANO_COLOR_TEXT}`}>
                <Icon icon={BarChart2} className="w-6 h-6 mr-3" /> {/* Ícone Dashboard */}
                Visão Geral
            </h2>

            {/* Mensagem de Erro Geral */}
            {error && (
                <div className="p-4 bg-red-100 text-red-700 rounded-lg shadow border border-red-200 flex items-center gap-2">
                    <Icon icon={AlertTriangle} className="w-5 h-5 flex-shrink-0"/> <p>{error}</p>
                </div>
            )}

            {/* Grid de KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <KpiCard title="Agendamentos Hoje" value={kpiData.hoje} icon={Calendar} isLoading={loadingKpi} />
                <KpiCard title="Receita Estimada (Hoje)" value={kpiData.receitaHoje !== null ? `R$ ${kpiData.receitaHoje}` : null} icon={TrendingUp} isLoading={loadingKpi} />
                <KpiCard title="Agend. Próx. 7 Dias" value={kpiData.prox7dias} icon={CalendarDays} isLoading={loadingKpi} />
                <KpiCard title="Novos Agend. (24h)" value={kpiData.novos24h} icon={Users} isLoading={loadingKpi} />
            </div>

            {/* Seção Últimos Agendamentos */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                 <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <Icon icon={Bell} className={`w-5 h-5 mr-2 ${CIANO_COLOR_TEXT}`}/>
                    Últimos Agendamentos Recebidos
                 </h3>
                 {loadingNotificacoes ? (
                     <div className="flex justify-center py-4"> <Loader2 className={`w-6 h-6 animate-spin ${CIANO_COLOR_TEXT}`} /> </div>
                 ) : ultimosAgendamentos.length === 0 ? (
                     <p className="text-sm text-gray-500 text-center py-4">Nenhum agendamento recente.</p>
                 ) : (
                    <ul className="space-y-1"> {/* Diminuído space */}
                        {ultimosAgendamentos.map(agd => <NotificationItem key={agd.id} agendamento={agd} />)}
                    </ul>
                 )}
            </div>

            {/* Placeholder para Gráficos Futuros */}
            {/* <div className="grid lg:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">Gráfico Agendamentos/Dia</div>
                 <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">Gráfico Serviços Mais Usados</div>
            </div> */}

        </div>
    );
}

export default VisaoGeralPage;