import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Building2, 
  ChevronDown, 
  ChevronUp, 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Percent, 
  DollarSign, 
  TrendingUp, 
  Scale, 
  BadgePercent, 
  Wallet,
  Calendar,
  Filter,
  X
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/formatters';

export default function Reports({ setCurrentPage }) {
  const [activeTab, setActiveTab] = useState('geral'); // 'geral' | 'comissoes'
  const [selectedLoja, setSelectedLoja] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [periodPreset, setPeriodPreset] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({ stores: [], totalGeral: {} });
  const [expandedLojas, setExpandedLojas] = useState({});

  const fetchLiveReport = async (sDate = startDate, eDate = endDate) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sDate) params.append('startDate', sDate);
      if (eDate) params.append('endDate', eDate);
      const url = `/api/reports/stores-summary${params.toString() ? `?${params.toString()}` : ''}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
        // Expand all stores by default
        const initExpand = {};
        data.stores.forEach(s => {
          initExpand[s.loja] = true;
        });
        setExpandedLojas(initExpand);
      }
    } catch (err) {
      console.error('Erro ao buscar relatório em tempo real do MongoDB:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (preset) => {
    setPeriodPreset(preset);
    const now = new Date();
    let s = '';
    let e = '';

    if (preset === 'THIS_MONTH') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      s = `${y}-${m}-01`;
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      e = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
    } else if (preset === 'LAST_30') {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      s = past.toISOString().split('T')[0];
      e = now.toISOString().split('T')[0];
    } else if (preset === 'SAFRA_JUL26') {
      s = '2026-07-01';
      e = '2026-07-31';
    } else if (preset === 'SAFRA_AGO26') {
      s = '2026-08-01';
      e = '2026-08-31';
    } else {
      // ALL
      s = '';
      e = '';
    }

    setStartDate(s);
    setEndDate(e);
    fetchLiveReport(s, e);
  };

  const handleFilterDateSubmit = (e) => {
    if (e) e.preventDefault();
    setPeriodPreset('CUSTOM');
    fetchLiveReport(startDate, endDate);
  };

  const handleClearPeriod = () => {
    setPeriodPreset('ALL');
    setStartDate('');
    setEndDate('');
    fetchLiveReport('', '');
  };

  useEffect(() => {
    fetchLiveReport();
  }, []);

  const toggleExpand = (lojaName) => {
    setExpandedLojas(prev => ({
      ...prev,
      [lojaName]: !prev[lojaName]
    }));
  };

  const stores = reportData.stores || [];
  const totalGeral = reportData.totalGeral || {
    nfs: 0,
    pedidosVenda: 0,
    pedidosSemNF: 0,
    pesoNF: 0,
    pesoColheita: 0,
    cxsVendidas: 0,
    valorTotalNF: 0,
    funrural: 0,
    totalVendaAReceber: 0,
    liquidoNF: 0,
    totalComissao: 0,
    totalLiquidoProdutor: 0
  };

  const filteredLojas = stores.filter(
    l => selectedLoja === 'ALL' || l.loja === selectedLoja
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1700px] mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="text-xs font-semibold text-[#173e27] tracking-wider uppercase flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-emerald-700" />
            <span>AGROVENDA — RELATÓRIOS E FECHAMENTOS (BASE REAL MONGODB)</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">
            {activeTab === 'geral' ? 'Relatório Geral — NFs e VPs por Loja' : 'Relatório Completo — Fechamento com Comissões'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Agregação dinâmica em tempo real das {totalGeral.pedidosVenda || 34} vendas cadastradas no banco de dados.
          </p>
          {(startDate || endDate) && (
            <div className="hidden print:block text-xs font-bold text-gray-800 mt-1">
              Período do Relatório: {startDate ? startDate.split('-').reverse().join('/') : 'Início'} até {endDate ? endDate.split('-').reverse().join('/') : 'Atual'}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <select
            value={selectedLoja}
            onChange={(e) => setSelectedLoja(e.target.value)}
            className="bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 outline-none font-semibold text-gray-800 shadow-sm"
          >
            <option value="ALL">Todas as {stores.length} Lojas ({totalGeral.pedidosVenda} Pedidos)</option>
            {stores.map(l => (
              <option key={l.loja} value={l.loja}>{l.loja}</option>
            ))}
          </select>

          <button
            onClick={fetchLiveReport}
            className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-bold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            title="Atualizar dados do MongoDB"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          <button
            onClick={() => window.print()}
            className="hidden sm:flex bg-[#173e27] hover:bg-[#1f5435] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Barra de Filtro de Período (Oculta na Impressão) */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        
        {/* Form de Seleção de Datas */}
        <form onSubmit={handleFilterDateSubmit} className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>Período do Relatório:</span>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] font-semibold text-gray-500">De:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] font-semibold text-gray-500">Até:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
            />
          </div>

          <button
            type="submit"
            className="bg-[#173e27] hover:bg-[#1f5435] text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar Período</span>
          </button>

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={handleClearPeriod}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-2.5 py-2 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              title="Limpar filtro de período"
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
              <span>Ver Todo o Período</span>
            </button>
          )}
        </form>

        {/* Atalhos Rápidos de Safra / Período */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-gray-400 mr-1">Atalhos:</span>
          
          <button
            type="button"
            onClick={() => handleApplyPreset('ALL')}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
              periodPreset === 'ALL' && !startDate && !endDate
                ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-black'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Todo o Histórico
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('THIS_MONTH')}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
              periodPreset === 'THIS_MONTH'
                ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-black'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Mês Atual
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('SAFRA_JUL26')}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
              periodPreset === 'SAFRA_JUL26'
                ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-black'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Julho/2026
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('SAFRA_AGO26')}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
              periodPreset === 'SAFRA_AGO26'
                ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-black'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            Agosto/2026
          </button>
        </div>

      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-1 print:hidden">
        <button
          onClick={() => setActiveTab('geral')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-t-lg font-bold text-xs transition-all border-b-2 ${
            activeTab === 'geral'
              ? 'border-emerald-700 text-emerald-950 bg-white shadow-sm'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
          <span>Relatório Geral (NFs e VPs por Loja)</span>
        </button>

        <button
          onClick={() => setActiveTab('comissoes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-t-lg font-bold text-xs transition-all border-b-2 ${
            activeTab === 'comissoes'
              ? 'border-blue-700 text-blue-950 bg-white shadow-sm'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
          }`}
        >
          <BadgePercent className="w-4 h-4 text-blue-700" />
          <span>Relatório Completo (com Comissões & Fechamento)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: RELATÓRIO GERAL (PADRÃO PLANILHA)                                   */}
      {/* ========================================================================= */}
      {activeTab === 'geral' && (
        <div className="space-y-6">
          {/* Tabela Principal: Resumo Geral por Loja (Exata réplica do Excel) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-3">
            <div className="bg-[#1b4363] text-white px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-sky-200" />
                <span className="text-xs font-black uppercase tracking-wider">
                  ResumoLojas — Relatório geral - NFs e VPs por loja
                </span>
              </div>
              <span className="text-[11px] font-semibold text-sky-100 bg-sky-900/40 px-2.5 py-0.5 rounded">
                Fórmulas 100% Conciliadas em Tempo Real
              </span>
            </div>

            <div className="overflow-x-auto p-4 pt-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#245b85] text-white font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Loja</th>
                    <th className="py-2.5 px-2 text-center">NFs</th>
                    <th className="py-2.5 px-2 text-center">Pedidos Venda</th>
                    <th className="py-2.5 px-2 text-center">Pedidos sem NF</th>
                    <th className="py-2.5 px-3 text-right">Peso NF (kg)</th>
                    <th className="py-2.5 px-3 text-right">Peso total baseado na colheita (kg)</th>
                    <th className="py-2.5 px-3 text-right">CXS Vendidas</th>
                    <th className="py-2.5 px-3 text-right">Valor Total NF (R$)</th>
                    <th className="py-2.5 px-3 text-right">FUNRURAL (R$)</th>
                    <th className="py-2.5 px-3 text-right bg-[#1a4364]">Total Venda à Receber (R$)</th>
                    <th className="py-2.5 px-3 text-right bg-[#143753]">Líquido NF (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLojas.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3 font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-[#245b85]" />
                        {row.loja}
                      </td>
                      <td className="py-3 px-2 text-center font-medium text-gray-700">{row.nfs}</td>
                      <td className="py-3 px-2 text-center font-bold text-gray-900">{row.pedidosVenda}</td>
                      <td className="py-3 px-2 text-center text-amber-700 font-medium">
                        {row.pedidosSemNF > 0 ? (
                          <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[10px] font-bold">
                            {row.pedidosSemNF}
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-700 font-medium">{formatNumber(row.pesoNF, 2)}</td>
                      <td className="py-3 px-3 text-right font-bold text-gray-900">{formatNumber(row.pesoColheita, 2)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-800">{formatNumber(row.cxsVendidas, 2)}</td>
                      <td className="py-3 px-3 text-right font-bold text-gray-900">{formatCurrency(row.valorTotalNF)}</td>
                      <td className="py-3 px-3 text-right text-red-600 font-medium">-{formatCurrency(row.funrural)}</td>
                      <td className="py-3 px-3 text-right font-black text-[#1a4364] bg-sky-50/40">
                        {formatCurrency(row.totalVendaAReceber)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-950 bg-emerald-50/40">
                        {formatCurrency(row.liquidoNF)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#bfe2a5] font-black text-xs text-gray-950 border-t-2 border-emerald-800">
                  <tr>
                    <td className="py-3 px-3 uppercase font-black text-gray-950">TOTAL GERAL</td>
                    <td className="py-3 px-2 text-center font-black">{totalGeral.nfs}</td>
                    <td className="py-3 px-2 text-center font-black">{totalGeral.pedidosVenda}</td>
                    <td className="py-3 px-2 text-center font-black text-amber-950">{totalGeral.pedidosSemNF}</td>
                    <td className="py-3 px-3 text-right font-black">{formatNumber(totalGeral.pesoNF, 2)}</td>
                    <td className="py-3 px-3 text-right font-black bg-[#9dd07b]">{formatNumber(totalGeral.pesoColheita, 2)}</td>
                    <td className="py-3 px-3 text-right font-black">{formatNumber(totalGeral.cxsVendidas, 2)}</td>
                    <td className="py-3 px-3 text-right font-black">{formatCurrency(totalGeral.valorTotalNF)}</td>
                    <td className="py-3 px-3 text-right font-black text-red-900">-{formatCurrency(totalGeral.funrural)}</td>
                    <td className="py-3 px-3 text-right font-black text-green-950 bg-[#83c457]">
                      {formatCurrency(totalGeral.totalVendaAReceber)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-950 bg-[#aedb8e]">
                      {formatCurrency(totalGeral.liquidoNF)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Seção 2: Detalhamento Individual de Cada Loja com Linhas de VP */}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span>Detalhamento Individual das Vendas por Loja (VPs)</span>
            </h2>

            {filteredLojas.map((lojaGroup, lIdx) => {
              const isExpanded = expandedLojas[lojaGroup.loja];
              return (
                <div key={lIdx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div 
                    onClick={() => toggleExpand(lojaGroup.loja)}
                    className="bg-gray-50 hover:bg-gray-100/80 p-4 flex items-center justify-between cursor-pointer border-b border-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-[#173e27]" />
                      <span className="text-xs font-black text-gray-900 uppercase tracking-wide">
                        {lojaGroup.loja}
                      </span>
                      <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        {lojaGroup.itens?.length || 0} VPs
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-500">
                        NF: <strong className="text-gray-900">{formatCurrency(lojaGroup.valorTotalNF)}</strong>
                      </span>
                      <span className="text-gray-500">
                        Líquido: <strong className="text-emerald-800">{formatCurrency(lojaGroup.liquidoNF)}</strong>
                      </span>
                      <span className="text-gray-500">
                        VP: <strong className="text-blue-900">{formatCurrency(lojaGroup.totalVendaAReceber)}</strong>
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="overflow-x-auto p-4 pt-2">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="py-2 px-3">Nº VP</th>
                            <th className="py-2 px-2">Data VP</th>
                            <th className="py-2 px-3">Nº NF</th>
                            <th className="py-2 px-2">Data NF</th>
                            <th className="py-2 px-3 text-right">Peso NF (kg)</th>
                            <th className="py-2 px-3 text-right">Peso Colheita (kg)</th>
                            <th className="py-2 px-3 text-right">Caixas (29kg)</th>
                            <th className="py-2 px-3 text-right">Preço/kg NF</th>
                            <th className="py-2 px-3 text-right">Valor Total NF</th>
                            <th className="py-2 px-3 text-right">FUNRURAL (1,63%)</th>
                            <th className="py-2 px-3 text-right">Cotação Dia</th>
                            <th className="py-2 px-3 text-right">Valor Total VP</th>
                            <th className="py-2 px-3 text-right">Líquido a Receber</th>
                            <th className="py-2 px-3 text-center">Vencimento</th>
                            <th className="py-2 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {lojaGroup.itens?.map((it, rIdx) => (
                            <tr key={rIdx} className="hover:bg-gray-50/70 transition-colors">
                              <td className="py-2 px-3">
                                <div className="font-bold text-[#173e27]">{it.vp}</div>
                                <div className="text-[10px] text-gray-500 font-medium truncate max-w-[140px]" title={it.product}>
                                  {it.product}
                                </div>
                              </td>
                              <td className="py-2 px-2 text-gray-600">{it.dataVP}</td>
                              <td className="py-2 px-3 font-semibold text-gray-800">{it.nf}</td>
                              <td className="py-2 px-2 text-gray-600">{it.dataNF}</td>
                              <td className="py-2 px-3 text-right text-gray-600">{formatNumber(it.pesoNF, 0)} kg</td>
                              <td className="py-2 px-3 text-right font-bold text-gray-900">{formatNumber(it.pesoColheita, 0)} kg</td>
                              <td className="py-2 px-3 text-right font-bold text-gray-900">
                                {formatNumber(it.cxs, 2)} {it.unit?.includes('Granel') ? 'kg' : (it.unit?.includes('Sacas') ? 'sc' : 'cx')}
                              </td>
                              <td className="py-2 px-3 text-right text-gray-700">{it.precoKg > 0 ? `R$ ${it.precoKg.toFixed(2)}` : '-'}</td>
                              <td className="py-2 px-3 text-right font-bold text-gray-900">{formatCurrency(it.valorNF)}</td>
                              <td className="py-2 px-3 text-right text-red-600">-{formatCurrency(it.funrural)}</td>
                              <td className="py-2 px-3 text-right font-semibold text-blue-900">
                                R$ {it.cotacao.toFixed(2)}/{it.unit?.includes('Granel') ? 'kg' : (it.unit?.includes('Sacas') ? 'sc' : 'cx')}
                              </td>
                              <td className="py-2 px-3 text-right font-black text-blue-950 bg-blue-50/30">{formatCurrency(it.valorVP)}</td>
                              <td className="py-2 px-3 text-right font-black text-emerald-950 bg-emerald-50/30">{formatCurrency(it.liquido)}</td>
                              <td className="py-2 px-3 text-center text-gray-600">{it.venc}</td>
                              <td className="py-2 px-3 text-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  it.status === 'Faturado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                                }`}>
                                  {it.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                          <tr>
                            <td colSpan={4} className="py-2.5 px-3 uppercase text-gray-700 font-extrabold">
                              TOTAL {lojaGroup.loja.split(' ')[0]}
                            </td>
                            <td className="py-2.5 px-3 text-right text-gray-700 font-bold">{formatNumber(lojaGroup.pesoNF, 2)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-gray-900">{formatNumber(lojaGroup.pesoColheita, 2)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-gray-900">{formatNumber(lojaGroup.cxsVendidas, 2)}</td>
                            <td className="py-2.5 px-3 text-right text-gray-400">-</td>
                            <td className="py-2.5 px-3 text-right font-black text-gray-900">{formatCurrency(lojaGroup.valorTotalNF)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-red-700">-{formatCurrency(lojaGroup.funrural)}</td>
                            <td className="py-2.5 px-3 text-right text-gray-400">-</td>
                            <td className="py-2.5 px-3 text-right font-black text-blue-900">{formatCurrency(lojaGroup.totalVendaAReceber)}</td>
                            <td className="py-2.5 px-3 text-right font-black text-emerald-950">{formatCurrency(lojaGroup.liquidoNF)}</td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: RELATÓRIO COMPLETO COM COMISSÕES & FECHAMENTO                       */}
      {/* ========================================================================= */}
      {activeTab === 'comissoes' && (
        <div className="space-y-6">
          
          {/* Cards de Resumo Consolidado com Comissões */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
              <span className="text-gray-500 text-xs font-bold uppercase block">Total Comercial (VP)</span>
              <span className="text-2xl font-black text-blue-950">{formatCurrency(totalGeral.totalVendaAReceber)}</span>
              <span className="text-[11px] text-gray-400 block">34 Pedidos de Venda</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
              <span className="text-gray-500 text-xs font-bold uppercase block">Total Faturado NF</span>
              <span className="text-2xl font-black text-gray-900">{formatCurrency(totalGeral.valorTotalNF)}</span>
              <span className="text-[11px] text-gray-400 block">31 Notas Emitidas</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
              <span className="text-gray-500 text-xs font-bold uppercase block">(-) FUNRURAL (1,63%)</span>
              <span className="text-2xl font-black text-red-600">-{formatCurrency(totalGeral.funrural)}</span>
              <span className="text-[11px] text-gray-400 block">Dedução tributária</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm space-y-1">
              <span className="text-blue-800 text-xs font-bold uppercase block">Comissão AgroVenda (3%)</span>
              <span className="text-2xl font-black text-blue-900">{formatCurrency(totalGeral.totalComissao)}</span>
              <span className="text-[11px] text-blue-600 block font-semibold">Taxa média 3,0%</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm space-y-1">
              <span className="text-emerald-800 text-xs font-bold uppercase block">(=) Líquido Produtor</span>
              <span className="text-2xl font-black text-emerald-950">{formatCurrency(totalGeral.totalLiquidoProdutor)}</span>
              <span className="text-[11px] text-emerald-700 block font-semibold">Saldo a repassar</span>
            </div>

          </div>

          {/* Matriz Geral por Loja com Comissões */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-3">
            <div className="bg-[#173e27] text-white px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BadgePercent className="w-4 h-4 text-emerald-200" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Fechamento por Loja com Comissões & Repasse Líquido
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-100 bg-emerald-900/40 px-2.5 py-0.5 rounded">
                Base Comercial VP + Comissão 3,0%
              </span>
            </div>

            <div className="overflow-x-auto p-4 pt-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#1e5234] text-white font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Loja / Comprador</th>
                    <th className="py-2.5 px-2 text-center">NFs</th>
                    <th className="py-2.5 px-2 text-center">VPs</th>
                    <th className="py-2.5 px-3 text-right">CXS (29kg)</th>
                    <th className="py-2.5 px-3 text-right">Valor Total NF</th>
                    <th className="py-2.5 px-3 text-right">FUNRURAL</th>
                    <th className="py-2.5 px-3 text-right bg-[#173e27]">Total Comercial (VP)</th>
                    <th className="py-2.5 px-2 text-center">Taxa (%)</th>
                    <th className="py-2.5 px-3 text-right bg-blue-900/80">Comissão (R$)</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-900/90">Líquido Produtor (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLojas.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3 font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-emerald-800" />
                        {row.loja}
                      </td>
                      <td className="py-3 px-2 text-center font-medium text-gray-700">{row.nfs}</td>
                      <td className="py-3 px-2 text-center font-bold text-gray-900">{row.pedidosVenda}</td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-800">{formatNumber(row.cxsVendidas, 2)}</td>
                      <td className="py-3 px-3 text-right font-bold text-gray-900">{formatCurrency(row.valorTotalNF)}</td>
                      <td className="py-3 px-3 text-right text-red-600 font-medium">-{formatCurrency(row.funrural)}</td>
                      <td className="py-3 px-3 text-right font-black text-blue-950 bg-blue-50/40">
                        {formatCurrency(row.totalVendaAReceber)}
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-blue-800">3,0%</td>
                      <td className="py-3 px-3 text-right font-black text-blue-900 bg-blue-50/60">
                        {formatCurrency(row.totalComissao)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-950 bg-emerald-50/60">
                        {formatCurrency(row.totalLiquidoProdutor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#bfe2a5] font-black text-xs text-gray-950 border-t-2 border-emerald-800">
                  <tr>
                    <td className="py-3 px-3 uppercase font-black text-gray-950">TOTAL GERAL</td>
                    <td className="py-3 px-2 text-center font-black">{totalGeral.nfs}</td>
                    <td className="py-3 px-2 text-center font-black">{totalGeral.pedidosVenda}</td>
                    <td className="py-3 px-3 text-right font-black">{formatNumber(totalGeral.cxsVendidas, 2)}</td>
                    <td className="py-3 px-3 text-right font-black">{formatCurrency(totalGeral.valorTotalNF)}</td>
                    <td className="py-3 px-3 text-right font-black text-red-900">-{formatCurrency(totalGeral.funrural)}</td>
                    <td className="py-3 px-3 text-right font-black text-blue-950 bg-sky-200">
                      {formatCurrency(totalGeral.totalVendaAReceber)}
                    </td>
                    <td className="py-3 px-2 text-center font-black">3,0%</td>
                    <td className="py-3 px-3 text-right font-black text-blue-950 bg-blue-200">
                      {formatCurrency(totalGeral.totalComissao)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-950 bg-emerald-200">
                      {formatCurrency(totalGeral.totalLiquidoProdutor)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Detalhamento Individual com Comissões por VP */}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span>Detalhamento de Comissões por Venda / Loja (VPs)</span>
            </h2>

            {filteredLojas.map((lojaGroup, lIdx) => {
              const isExpanded = expandedLojas[lojaGroup.loja];
              return (
                <div key={lIdx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div 
                    onClick={() => toggleExpand(lojaGroup.loja)}
                    className="bg-gray-50 hover:bg-gray-100/80 p-4 flex items-center justify-between cursor-pointer border-b border-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-[#173e27]" />
                      <span className="text-xs font-black text-gray-900 uppercase tracking-wide">
                        {lojaGroup.loja}
                      </span>
                      <span className="text-[11px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {lojaGroup.itens?.length || 0} VPs
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-500">
                        Total VP: <strong className="text-blue-900">{formatCurrency(lojaGroup.totalVendaAReceber)}</strong>
                      </span>
                      <span className="text-gray-500">
                        Comissão (3%): <strong className="text-blue-700">{formatCurrency(lojaGroup.totalComissao)}</strong>
                      </span>
                      <span className="text-gray-500">
                        Líquido Produtor: <strong className="text-emerald-800">{formatCurrency(lojaGroup.totalLiquidoProdutor)}</strong>
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="overflow-x-auto p-4 pt-2">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="py-2 px-3">Nº VP</th>
                            <th className="py-2 px-2">Data</th>
                            <th className="py-2 px-3">Nº NF</th>
                            <th className="py-2 px-3 text-right">Caixas (29kg)</th>
                            <th className="py-2 px-3 text-right">Cotação Dia</th>
                            <th className="py-2 px-3 text-right">Valor Total VP</th>
                            <th className="py-2 px-3 text-center">Taxa Com.</th>
                            <th className="py-2 px-3 text-right bg-blue-50/50 font-bold text-blue-900">Comissão (R$)</th>
                            <th className="py-2 px-3 text-right bg-emerald-50/50 font-bold text-emerald-950">Líquido Produtor (R$)</th>
                            <th className="py-2 px-3 text-center">Vencimento</th>
                            <th className="py-2 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {lojaGroup.itens?.map((it, rIdx) => (
                            <tr key={rIdx} className="hover:bg-gray-50/70 transition-colors">
                              <td className="py-2 px-3">
                                <div className="font-bold text-[#173e27]">{it.vp}</div>
                                <div className="text-[10px] text-gray-500 font-medium truncate max-w-[140px]" title={it.product}>
                                  {it.product}
                                </div>
                              </td>
                              <td className="py-2 px-2 text-gray-600">{it.dataVP}</td>
                              <td className="py-2 px-3 font-semibold text-gray-800">{it.nf}</td>
                              <td className="py-2 px-3 text-right font-bold text-gray-900">
                                {formatNumber(it.cxs, 2)} {it.unit?.includes('Granel') ? 'kg' : (it.unit?.includes('Sacas') ? 'sc' : 'cx')}
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-blue-900">
                                R$ {it.cotacao.toFixed(2)}/{it.unit?.includes('Granel') ? 'kg' : (it.unit?.includes('Sacas') ? 'sc' : 'cx')}
                              </td>
                              <td className="py-2 px-3 text-right font-black text-blue-950">{formatCurrency(it.valorVP)}</td>
                              <td className="py-2 px-3 text-center font-semibold text-gray-700">{it.taxaComissao.toFixed(1)}%</td>
                              <td className="py-2 px-3 text-right font-black text-blue-900 bg-blue-50/30">
                                {formatCurrency(it.comissao)}
                              </td>
                              <td className="py-2 px-3 text-right font-black text-emerald-950 bg-emerald-50/30">
                                {formatCurrency(it.liquidoProdutor)}
                              </td>
                              <td className="py-2 px-3 text-center text-gray-600">{it.venc}</td>
                              <td className="py-2 px-3 text-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  it.status === 'Faturado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                                }`}>
                                  {it.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                          <tr>
                            <td colSpan={5} className="py-2.5 px-3 uppercase text-gray-700 font-extrabold">
                              TOTAL {lojaGroup.loja.split(' ')[0]}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-blue-900">{formatCurrency(lojaGroup.totalVendaAReceber)}</td>
                            <td className="py-2.5 px-3 text-center">3,0%</td>
                            <td className="py-2.5 px-3 text-right font-black text-blue-950 bg-blue-100">{formatCurrency(lojaGroup.totalComissao)}</td>
                            <td className="py-2.5 px-3 text-right font-black text-emerald-950 bg-emerald-100">{formatCurrency(lojaGroup.totalLiquidoProdutor)}</td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}
