import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  TrendingUp, 
  Clock, 
  FileCheck2, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight,
  TrendingDown,
  Layers,
  ArrowRight
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { api } from '../services/api';

export default function Dashboard({ setCurrentPage }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  const fetchDashboard = async (sDate = '', eDate = '') => {
    setLoading(true);
    try {
      const data = await api.get('/api/dashboard', { startDate: sDate, endDate: eDate });
      setDashboardData(data);
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    fetchDashboard(startDate, endDate);
  };

  const kpis = dashboardData?.kpis || {
    salesCount: 34,
    totalSold: 1186046.72,
    totalSoldGrowth: '+0%',
    totalAReceber: 1186046.72,
    totalAPagar: 0,
    grossProfit: 35581.40,
    targetReached: true
  };

  const alerts = dashboardData?.alerts || {
    vencidos: 0,
    notasPendentes: 3,
    divergentes: 0
  };

  const transactions = dashboardData?.lastTransactions || [
    { date: '08/08/2026', module: 'Venda VP-09744', value: 13639.66 },
    { date: '06/08/2026', module: 'Venda VP-09743', value: 43012.07 },
    { date: '05/08/2026', module: 'Venda VP-09742', value: 47264.00 },
    { date: '05/08/2026', module: 'Venda VP-09741', value: 41843.20 },
    { date: '05/08/2026', module: 'Venda VP-09740', value: 36439.20 }
  ];

  const performanceDays = dashboardData?.performanceDays || [];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Date Filter Bar */}
      <form onSubmit={handleFilter} className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600">Data Inicial:</label>
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-gray-300 text-gray-800 text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#091b2e] focus:border-transparent outline-none shadow-sm"
              placeholder="dd/mm/aaaa"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600">Data Final:</label>
          <div className="relative">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-gray-300 text-gray-800 text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#091b2e] focus:border-transparent outline-none shadow-sm"
              placeholder="dd/mm/aaaa"
            />
          </div>
        </div>

        <button
          type="submit"
          className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-semibold px-5 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          Filtrar Período
        </button>

        {(startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              fetchDashboard('', '');
            }}
            className="text-xs text-gray-500 hover:text-gray-700 underline ml-2"
          >
            Limpar filtro
          </button>
        )}
      </form>

      {/* Row 1: 4 KPI Cards (Original Balance) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vendas do Período */}
        <div 
          onClick={() => setCurrentPage('sales-history')}
          className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 tracking-wider uppercase group-hover:text-[#df7b1b] transition-colors">
              VENDAS DO PERÍODO
            </span>
            <span className="w-4 h-4 bg-blue-600 rounded text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
              ✓
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {kpis.salesCount}
            </div>
            <span className="inline-block mt-2 text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              vendas
            </span>
          </div>
        </div>

        {/* Total Vendido */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-[11px] font-bold text-gray-500 tracking-wider uppercase block">
            TOTAL VENDIDO
          </span>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {formatCurrency(kpis.totalSold)}
            </div>
            <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-[#c87a1e]">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {kpis.totalSoldGrowth} em relação ao período anterior
            </span>
          </div>
        </div>

        {/* Total a Receber */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-[11px] font-bold text-gray-500 tracking-wider uppercase block">
            TOTAL A RECEBER
          </span>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {formatCurrency(kpis.totalAReceber)}
            </div>
            <span className="inline-block mt-2 text-[11px] font-medium text-gray-500">
              Total a pagar {formatCurrency(kpis.totalAPagar)}
            </span>
          </div>
        </div>

        {/* Lucratividade Bruta */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-[11px] font-bold text-gray-500 tracking-wider uppercase block">
            LUCRATIVIDADE BRUTA
          </span>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {formatCurrency(kpis.grossProfit)}
            </div>
            <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-[#c87a1e]">
              <CheckCircle2 className="w-3 h-3 text-[#d97706]" />
              meta atingida
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Status / Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vencidos */}
        <div className="bg-white rounded-xl border border-[#d4984f]/60 p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#fbf3e6] text-[#c87a1e] flex items-center justify-center border border-[#d4984f]/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase block">
                VENCIDOS
              </span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(alerts.vencidos)}
              </span>
            </div>
          </div>
        </div>

        {/* Notas Pendentes */}
        <div 
          onClick={() => setCurrentPage('reports')}
          className="bg-white rounded-xl border border-[#d4984f]/60 p-4 flex items-center justify-between shadow-xs hover:border-[#d4984f] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#fbf3e6] text-[#c87a1e] flex items-center justify-center border border-[#d4984f]/30">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase block">
                NOTAS PENDENTES
              </span>
              <span className="text-lg font-bold text-gray-900">
                {alerts.notasPendentes}
              </span>
            </div>
          </div>
          <span className="text-xs text-[#c87a1e] font-semibold group-hover:underline flex items-center gap-0.5">
            Ver <ArrowRight className="w-3 h-3" />
          </span>
        </div>

        {/* Divergentes */}
        <div 
          onClick={() => setCurrentPage('weighing-slips')}
          className="bg-white rounded-xl border border-[#d4984f]/60 p-4 flex items-center justify-between shadow-xs hover:border-[#d4984f] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#fbf3e6] text-[#c87a1e] flex items-center justify-center border border-[#d4984f]/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase block">
                DIVERGENTES (PESAGEM)
              </span>
              <span className="text-lg font-bold text-gray-900">
                {alerts.divergentes}
              </span>
            </div>
          </div>
          <span className="text-xs text-[#c87a1e] font-semibold group-hover:underline flex items-center gap-1">
            Conferir <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* Row 3: Indicators & Last 5 Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Indicators Chart Area */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-700 tracking-wider uppercase">
              INDICADORES DE DESEMPENHO (ÚLTIMOS 7 DIAS)
            </h2>
            <span className="text-xs text-gray-400">Visão Diária</span>
          </div>

          <div className="h-60 flex flex-col justify-end relative pt-6">
            <div className="w-full h-44 flex items-end justify-between px-4 border-b border-gray-200 relative">
              {performanceDays.map((item, idx) => {
                const barColors = ['#eed9bf', '#e2ba87', '#d99b52', '#cc7f33', '#c87217', '#b85b1b', '#8f380f'];
                const color = barColors[idx % barColors.length];
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 group relative">
                    <div className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 bg-gray-800 text-white px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                      {formatCurrency(item.total)} ({item.count} ops)
                    </div>
                    <div 
                      className="w-10 rounded-t-md transition-all cursor-pointer hover:brightness-110 shadow-xs"
                      style={{ 
                        height: `${Math.max(16, Math.min(140, (item.total / 50000) * 120))}px`,
                        backgroundColor: color
                      }}
                    ></div>
                    <span className="text-[10px] font-medium text-gray-500">{item.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="w-full h-[3px] bg-gradient-to-r from-[#eed9bf] via-[#d99b52] to-[#8f380f] rounded-full mt-3"></div>
          </div>
        </div>

        {/* Last 5 Transactions Table */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-700 tracking-wider uppercase">
              ÚLTIMAS 5 TRANSAÇÕES
            </h2>
            <button 
              onClick={() => setCurrentPage('sales-history')}
              className="text-xs text-[#091b2e] font-semibold hover:text-[#df7b1b] transition-colors"
            >
              Ver todas
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100 pb-2">
                  <th className="py-2.5 font-semibold">Data</th>
                  <th className="py-2.5 font-semibold">Módulo</th>
                  <th className="py-2.5 font-semibold text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 font-medium text-gray-600">{tx.date}</td>
                    <td className="py-3 text-gray-600 font-semibold">{tx.module}</td>
                    <td className="py-3 text-right font-bold text-gray-900">
                      {formatCurrency(tx.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
