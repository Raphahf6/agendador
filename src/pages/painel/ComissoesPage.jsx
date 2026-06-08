import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  DollarSign,
  FileCheck,
  PieChart,
  Users,
  Wallet,
} from 'lucide-react';
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import HourglassLoading from '@/components/HourglassLoading';
import { apiGet, fetchAppointments } from '@/lib/horalisApi';
import { useSalon } from './PainelLayout';

function SummaryCard({ title, value, subtext, icon: Icon, colorClass, bgClass }) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className={`rounded-2xl p-4 ${bgClass} ${colorClass}`}>
        <Icon className="h-8 w-8" />
      </div>
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-gray-400">{title}</p>
        <h3 className="text-2xl font-extrabold text-gray-900">{value}</h3>
        {subtext && <p className="mt-1 text-xs text-gray-500">{subtext}</p>}
      </div>
    </div>
  );
}

export default function ComissoesPage() {
  const { salaoId, salonDetails } = useSalon();
  const primaryColor = salonDetails?.cor_primaria || '#0E7490';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [professionals, setProfessionals] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [expandedProId, setExpandedProId] = useState(null);

  useEffect(() => {
    async function fetchData() {
      if (!salaoId) return;
      setLoading(true);

      try {
        const [teamRes, appsData] = await Promise.all([
          apiGet('/admin/equipe'),
          fetchAppointments(salaoId, {
            start: startOfMonth(currentDate).toISOString(),
            end: endOfMonth(currentDate).toISOString(),
            status: 'confirmado',
            limit: 1000,
          }),
        ]);

        setProfessionals(Array.isArray(teamRes.data) ? teamRes.data : []);
        setAppointments(appsData);
      } catch (error) {
        console.error('Erro ao calcular comissoes:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [salaoId, currentDate]);

  const reportData = useMemo(() => professionals.map((pro) => {
    const proApps = appointments.filter((app) => app.professionalId === pro.id);
    const totalGenerated = proApps.reduce((acc, app) => acc + (Number(app.servicePrice) || 0), 0);
    const commissionRate = Number(pro.comissao || 0);
    const commissionValue = totalGenerated * (commissionRate / 100);

    return {
      ...pro,
      totalGenerated,
      commissionRate,
      commissionValue,
      appointments: proApps.sort((a, b) => (a.startDate?.getTime() || 0) - (b.startDate?.getTime() || 0)),
    };
  }).sort((a, b) => b.commissionValue - a.commissionValue), [professionals, appointments]);

  const totalRevenue = reportData.reduce((acc, item) => acc + item.totalGenerated, 0);
  const totalCommissions = reportData.reduce((acc, item) => acc + item.commissionValue, 0);

  if (loading) return <div className="flex h-96 items-center justify-center"><HourglassLoading message="Calculando comissoes..." /></div>;

  return (
    <div className="mx-auto max-w-5xl pb-20 font-sans">
      <div className="mb-10 flex flex-col items-center justify-between gap-6 md:flex-row">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
            <div className="rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
              <Wallet className="h-6 w-6" style={{ color: primaryColor }} />
            </div>
            Relatorio de Comissoes
          </h1>
          <p className="ml-12 mt-1 text-sm text-gray-500">Fechamento financeiro da equipe.</p>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
          <button onClick={() => setCurrentDate((date) => subMonths(date, 1))} className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100" aria-label="Mes anterior">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex min-w-[140px] items-center justify-center gap-2 px-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="font-bold capitalize text-gray-800">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
          </div>
          <button onClick={() => setCurrentDate((date) => addMonths(date, 1))} className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100" aria-label="Proximo mes">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <SummaryCard
          title="Faturamento Bruto (Equipe)"
          value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtext={`${appointments.length} servicos realizados no periodo`}
          icon={DollarSign}
          bgClass="bg-blue-50"
          colorClass="text-blue-600"
        />
        <SummaryCard
          title="Total de Comissoes a Pagar"
          value={`R$ ${totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtext="Valor liquido a repassar"
          icon={PieChart}
          bgClass="bg-green-50"
          colorClass="text-green-600"
        />
      </div>

      <div className="space-y-4">
        {reportData.map((pro) => (
          <div key={pro.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md">
            <button
              onClick={() => setExpandedProId(expandedProId === pro.id ? null : pro.id)}
              className="flex w-full cursor-pointer flex-col items-center justify-between gap-6 p-6 text-left md:flex-row"
            >
              <div className="flex w-full items-center gap-4 md:w-auto">
                {pro.foto_url ? (
                  <img src={pro.foto_url} alt={pro.nome} className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-sm" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-400">
                    {String(pro.nome || '?').charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{pro.nome}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">{pro.commissionRate}% Comissao</span>
                    <span className="text-xs text-gray-400">• {pro.appointments.length} servicos</span>
                  </div>
                </div>
              </div>

              <div className="flex w-full items-center justify-between gap-8 md:w-auto md:justify-end">
                <div className="text-right">
                  <p className="text-xs font-bold uppercase text-gray-400">Gerou</p>
                  <p className="text-sm font-semibold text-gray-600">R$ {pro.totalGenerated.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-2 text-right">
                  <p className="text-xs font-bold uppercase text-green-600">Recebe</p>
                  <p className="text-xl font-extrabold text-green-700">R$ {pro.commissionValue.toFixed(2)}</p>
                </div>
                <div className="text-gray-300">{expandedProId === pro.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</div>
              </div>
            </button>

            {expandedProId === pro.id && (
              <div className="border-t border-gray-100 bg-gray-50/50 p-6">
                <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-700">
                  <FileCheck className="h-4 w-4" /> Detalhamento dos Servicos
                </h4>
                {pro.appointments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-gray-200 text-xs font-bold uppercase text-gray-400">
                        <tr>
                          <th className="pb-3 pl-2">Data/Hora</th>
                          <th className="pb-3">Cliente</th>
                          <th className="pb-3">Servico</th>
                          <th className="pb-3 text-right">Valor Cheio</th>
                          <th className="pb-3 pr-2 text-right">Comissao Calc.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pro.appointments.map((app) => (
                          <tr key={app.id} className="transition-colors hover:bg-gray-50">
                            <td className="py-3 pl-2 font-medium text-gray-700">{app.startDate ? format(app.startDate, "dd/MM 'as' HH:mm") : '-'}</td>
                            <td className="py-3 text-gray-600">{app.customerName}</td>
                            <td className="py-3 text-gray-600">{app.serviceName}</td>
                            <td className="py-3 text-right font-bold text-gray-900">R$ {Number(app.servicePrice || 0).toFixed(2)}</td>
                            <td className="py-3 pr-2 text-right font-bold text-green-600">+ R$ {(Number(app.servicePrice || 0) * (pro.commissionRate / 100)).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="py-4 text-center text-gray-400">Nenhum servico confirmado neste periodo.</p>
                )}
              </div>
            )}
          </div>
        ))}

        {reportData.length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
            <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="font-medium text-gray-500">Nenhum profissional com comissao gerada neste mes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
