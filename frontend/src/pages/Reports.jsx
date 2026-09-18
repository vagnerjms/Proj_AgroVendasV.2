import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Building2, 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle2, 
  DollarSign, 
  BadgePercent, 
  Calendar, 
  Filter, 
  X, 
  CloudUpload, 
  FileDown, 
  Settings, 
  AlertTriangle, 
  Clock 
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { api } from '../services/api';
import { buildExcelReportHtml } from '../utils/reportExcelBuilder';
import { calculateLiquidation } from '../utils/calculations';

// Subcomponentes modulares
import StoreSummaryTable from '../components/reports/StoreSummaryTable';
import StoreDetailList from '../components/reports/StoreDetailList';
import CommissionsTable from '../components/reports/CommissionsTable';
import N8nWebhookModal from '../components/reports/N8nWebhookModal';

export default function Reports({ setCurrentPage }) {
  const [activeTab, setActiveTab] = useState('geral'); // 'geral' | 'comissoes'
  const [selectedLoja, setSelectedLoja] = useState('ALL');
  const [selectedProducer, setSelectedProducer] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [periodPreset, setPeriodPreset] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({ stores: [], totalGeral: {}, producers: [] });
  const [expandedLojas, setExpandedLojas] = useState({});

  // Integração com Google Drive / n8n Webhook
  const [savingDrive, setSavingDrive] = useState(false);
  const [driveNotification, setDriveNotification] = useState('');
  const [driveError, setDriveError] = useState('');
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('agrovenda_n8n_drive_webhook') || '');

  const stores = reportData.stores || [];
  const rawTotalGeral = reportData.totalGeral || {
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

  // Lista de produtores disponíveis para filtro
  const availableProducers = (reportData.producers && reportData.producers.length > 0)
    ? reportData.producers
    : [...new Set(stores.flatMap(s => (s.itens || []).map(it => it.producer || it.origin)).filter(Boolean))].sort();

  // Filtragem dinâmica por Loja e por Produtor com cálculo preciso de liquidação
  const filteredLojas = stores
    .filter(l => selectedLoja === 'ALL' || l.loja === selectedLoja)
    .map(store => {
      if (selectedProducer === 'ALL') return store;
      const matchingItens = (store.itens || []).filter(it => (it.producer === selectedProducer || it.origin === selectedProducer));
      if (matchingItens.length === 0) return null;

      const nfs = matchingItens.filter(it => it.status === 'Faturado' || (it.nf && it.nf !== 'Pendente')).length;
      const pedidosSemNF = matchingItens.length - nfs;
      const pesoNF = matchingItens.reduce((acc, it) => acc + (Number(it.pesoNF) || 0), 0);
      const cxsVendidas = matchingItens.reduce((acc, it) => acc + (Number(it.cxs) || 0), 0);
      const valorTotalNF = matchingItens.reduce((acc, it) => acc + (Number(it.valorNF) || 0), 0);
      const funrural = matchingItens.reduce((acc, it) => acc + (Number(it.funrural) || 0), 0);
      const totalVendaAReceber = matchingItens.reduce((acc, it) => acc + (Number(it.valorVP) || 0), 0);
      const totalComissao = matchingItens.reduce((acc, it) => acc + (Number(it.comissao) || 0), 0);
      const totalLiquidoProdutor = matchingItens.reduce((acc, it) => acc + (Number(it.liquidoProdutor) || 0), 0);
      
      const valorLiquidado = matchingItens.reduce((acc, it) => {
        const liq = calculateLiquidation(it);
        return acc + liq.valorLiquidado;
      }, 0);
      const valorALiquidar = matchingItens.reduce((acc, it) => {
        const liq = calculateLiquidation(it);
        return acc + liq.valorALiquidar;
      }, 0);

      return {
        ...store,
        pedidosVenda: matchingItens.length,
        nfs,
        pedidosSemNF,
        pesoNF,
        pesoColheita: pesoNF,
        cxsVendidas: Number(cxsVendidas.toFixed(2)),
        valorTotalNF,
        funrural,
        totalVendaAReceber,
        liquidoNF: valorTotalNF - funrural,
        totalComissao,
        totalLiquidoProdutor,
        valorLiquidado,
        valorALiquidar,
        itens: matchingItens
      };
    })
    .filter(Boolean);

  // Métricas Consolidadas de Liquidação Financeira
  const allFilteredItens = filteredLojas.flatMap(s => s.itens || []);
  const valorTotalGeralVP = allFilteredItens.reduce((acc, it) => acc + (Number(it.valorVP) || 0), 0) || rawTotalGeral.totalVendaAReceber;
  
  const valorTotalLiquidado = allFilteredItens.reduce((acc, it) => {
    return acc + calculateLiquidation(it).valorLiquidado;
  }, 0);

  const valorTotalALiquidar = allFilteredItens.reduce((acc, it) => {
    return acc + calculateLiquidation(it).valorALiquidar;
  }, 0);

  const totalVPsLiquidadas = allFilteredItens.filter(it => calculateLiquidation(it).isFullySettled).length;
  const totalVPsALiquidar = allFilteredItens.filter(it => !calculateLiquidation(it).isFullySettled).length;

  // Dynamic totals: recalculates based on filteredLojas
  const currentTotal = (selectedLoja === 'ALL' && selectedProducer === 'ALL')
    ? {
        ...rawTotalGeral,
        valorTotalLiquidado: rawTotalGeral.valorTotalLiquidado ?? valorTotalLiquidado,
        valorTotalALiquidar: rawTotalGeral.valorTotalALiquidar ?? valorTotalALiquidar
      }
    : filteredLojas.reduce((acc, row) => ({
        nfs: acc.nfs + (row.nfs || 0),
        pedidosVenda: acc.pedidosVenda + (row.pedidosVenda || 0),
        pedidosSemNF: acc.pedidosSemNF + (row.pedidosSemNF || 0),
        pesoNF: acc.pesoNF + (row.pesoNF || 0),
        pesoColheita: acc.pesoColheita + (row.pesoColheita || 0),
        cxsVendidas: acc.cxsVendidas + (row.cxsVendidas || 0),
        valorTotalNF: acc.valorTotalNF + (row.valorTotalNF || 0),
        funrural: acc.funrural + (row.funrural || 0),
        totalVendaAReceber: acc.totalVendaAReceber + (row.totalVendaAReceber || 0),
        liquidoNF: acc.liquidoNF + (row.liquidoNF || 0),
        totalComissao: acc.totalComissao + (row.totalComissao || 0),
        totalLiquidoProdutor: acc.totalLiquidoProdutor + (row.totalLiquidoProdutor || 0),
        valorTotalLiquidado: acc.valorTotalLiquidado + (row.valorLiquidado || 0),
        valorTotalALiquidar: acc.valorTotalALiquidar + (row.valorALiquidar || 0)
      }), {
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
        totalLiquidoProdutor: 0,
        valorTotalLiquidado: 0,
        valorTotalALiquidar: 0
      });

  const saveWebhookConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('agrovenda_n8n_drive_webhook', webhookUrl);
    setShowWebhookModal(false);
    setDriveNotification('URL do Webhook do n8n salva com sucesso!');
    setTimeout(() => setDriveNotification(''), 4000);
  };

  const handleTriggerDrive = async () => {
    const activeUrl = webhookUrl || localStorage.getItem('agrovenda_n8n_drive_webhook');
    if (!activeUrl) {
      setShowWebhookModal(true);
      return;
    }

    setSavingDrive(true);
    setDriveNotification('');
    setDriveError('');
    try {
      const excelHtml = buildExcelContent();
      const res = await api.post('/api/reports/trigger-n8n', {
        webhookUrl: activeUrl,
        startDate: startDate || null,
        endDate: endDate || null,
        selectedLoja: selectedLoja,
        selectedProducer: selectedProducer,
        activeTab: activeTab,
        excelHtml: excelHtml,
        filteredStores: filteredLojas,
        currentTotal: currentTotal
      });

      if (res.success) {
        setDriveNotification('✅ Relatório filtrado enviado e salvo com sucesso no Google Drive!');
      } else {
        setDriveError(res.message || 'Erro ao processar no n8n.');
      }
    } catch (err) {
      console.error(err);
      setDriveError(err.message || 'Falha ao conectar com o n8n. Verifique se o n8n está rodando.');
    } finally {
      setSavingDrive(false);
      setTimeout(() => {
        setDriveNotification('');
        setDriveError('');
      }, 6000);
    }
  };

  const buildExcelContent = () => buildExcelReportHtml(filteredLojas, currentTotal, { startDate, endDate, selectedLoja, selectedProducer });

  const handleDownloadExcelDirect = () => {
    const excelContent = buildExcelContent();
    const safeLoja = selectedLoja === 'ALL' ? 'Geral' : selectedLoja.replace(/[^a-zA-Z0-9]/g, '_');
    const safeProd = selectedProducer === 'ALL' ? '' : `_${selectedProducer.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio_AgroVenda_${safeLoja}${safeProd}_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fetchLiveReport = async (sDate = startDate, eDate = endDate, prod = selectedProducer) => {
    const finalStart = (typeof sDate === 'string') ? sDate : (typeof startDate === 'string' ? startDate : '');
    const finalEnd = (typeof eDate === 'string') ? eDate : (typeof endDate === 'string' ? endDate : '');
    const finalProd = (typeof prod === 'string') ? prod : (typeof selectedProducer === 'string' ? selectedProducer : '');
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (finalStart) params.append('startDate', finalStart);
      if (finalEnd) params.append('endDate', finalEnd);
      if (finalProd && finalProd !== 'ALL') params.append('producer', finalProd);
      const url = `/api/reports/stores-summary${params.toString() ? `?${params.toString()}` : ''}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
        const initExpand = {};
        (data.stores || []).forEach(s => {
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

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1700px] mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="text-xs font-bold text-[#091b2e] tracking-wider uppercase flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#df7b1b]" />
            <span>AGROVENDA — RELATÓRIOS E FECHAMENTOS (BASE REAL MONGODB)</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">
            {activeTab === 'geral' ? 'Relatório Geral — NFs e VPs por Loja' : 'Relatório Completo — Fechamento com Comissões'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Agregação dinâmica em tempo real das {currentTotal.pedidosVenda || 0} vendas {selectedLoja !== 'ALL' ? `de ${selectedLoja}` : ''} {selectedProducer !== 'ALL' ? `• Produtor: ${selectedProducer}` : ''} {selectedLoja === 'ALL' && selectedProducer === 'ALL' ? 'cadastradas no banco de dados' : ''}.
          </p>
          {(startDate || endDate) && (
            <div className="hidden print:block text-xs font-bold text-gray-800 mt-1">
              Período do Relatório: {startDate ? startDate.split('-').reverse().join('/') : 'Início'} até {endDate ? endDate.split('-').reverse().join('/') : 'Atual'}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {/* Seletor de Loja */}
          <select
            value={selectedLoja}
            onChange={(e) => setSelectedLoja(e.target.value)}
            className="bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 outline-none font-semibold text-gray-800 shadow-sm"
          >
            <option value="ALL">Todas as {stores.length} Lojas ({rawTotalGeral.pedidosVenda || 0} Pedidos)</option>
            {stores.map(l => (
              <option key={l.loja} value={l.loja}>{l.loja} ({l.pedidosVenda} Pedidos)</option>
            ))}
          </select>

          {/* Seletor de Produtor */}
          <select
            value={selectedProducer}
            onChange={(e) => setSelectedProducer(e.target.value)}
            className="bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 outline-none font-semibold text-gray-800 shadow-sm"
          >
            <option value="ALL">Todos os Produtores ({availableProducers.length})</option>
            {availableProducers.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <button
            onClick={() => fetchLiveReport(startDate, endDate)}
            className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-bold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Atualizar dados do MongoDB"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          {/* Botão Baixar Excel Direto */}
          <button
            onClick={handleDownloadExcelDirect}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Baixar planilha formatada para Excel (.xls)"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Baixar Excel</span>
          </button>

          {/* Botão Salvar no Google Drive via n8n */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleTriggerDrive}
              disabled={savingDrive}
              className="bg-[#0e3b5e] hover:bg-[#134d7a] disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Disparar fluxo do n8n para salvar planilha formatada no Google Drive"
            >
              <CloudUpload className={`w-3.5 h-3.5 ${savingDrive ? 'animate-bounce' : ''}`} />
              <span>{savingDrive ? 'Enviando ao Drive...' : 'Salvar no Drive'}</span>
            </button>
            <button
              onClick={() => setShowWebhookModal(true)}
              className="p-2 border border-gray-300 bg-white hover:bg-gray-100 text-gray-600 rounded-lg shadow-sm cursor-pointer"
              title="Configurar Webhook do n8n"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="hidden sm:flex bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Notificações do Google Drive / n8n */}
      {driveNotification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-bold shadow-xs animate-fadeIn print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{driveNotification}</span>
          </div>
          <button onClick={() => setDriveNotification('')} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {driveError && (
        <div className="bg-red-50 border border-red-300 text-red-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-bold shadow-xs animate-fadeIn print:hidden">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{driveError}</span>
          </div>
          <button onClick={() => setDriveError('')} className="text-red-700 hover:text-red-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal de Configuração do Webhook do n8n */}
      <N8nWebhookModal
        show={showWebhookModal}
        onClose={() => setShowWebhookModal(false)}
        webhookUrl={webhookUrl}
        setWebhookUrl={setWebhookUrl}
        onSave={saveWebhookConfig}
      />

      {/* Barra de Filtro de Período (Oculta na Impressão) */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        
        {/* Form de Seleção de Datas */}
        <form onSubmit={handleFilterDateSubmit} className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
            <Calendar className="w-4 h-4 text-[#df7b1b]" />
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
            className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
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

      {/* Cards de Resumo Financeiro & Status de Liquidação */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:grid-cols-3">
        {/* Card Valor Total */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-blue-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
              Valor Total Comercial (VP)
            </span>
            <span className="text-xl sm:text-2xl font-black text-blue-950 mt-1 block">
              {formatCurrency(valorTotalGeralVP)}
            </span>
            <span className="text-[10px] text-gray-500 font-medium">
              {allFilteredItens.length} vendas (VPs) no filtro
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-800 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Card Valor Liquidado */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-emerald-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Valor Total Liquidado
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-800 mt-1 block">
              {formatCurrency(valorTotalLiquidado)}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium">
              {totalVPsLiquidadas} VPs recebidas / quitadas
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card Valor a Liquidar */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
              Valor a Liquidar (Em Aberto)
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-900 mt-1 block">
              {formatCurrency(valorTotalALiquidar)}
            </span>
            <span className="text-[10px] text-amber-700 font-medium">
              {totalVPsALiquidar} VPs pendentes de recebimento
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-1 print:hidden">
        <button
          onClick={() => setActiveTab('geral')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-t-lg font-bold text-xs transition-all border-b-2 cursor-pointer ${
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
          className={`flex items-center gap-2 px-5 py-2.5 rounded-t-lg font-bold text-xs transition-all border-b-2 cursor-pointer ${
            activeTab === 'comissoes'
              ? 'border-blue-700 text-blue-950 bg-white shadow-sm'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
          }`}
        >
          <BadgePercent className="w-4 h-4 text-blue-700" />
          <span>Relatório Completo (com Comissões & Fechamento)</span>
        </button>
      </div>

      {/* ABA 1: RELATÓRIO GERAL */}
      {activeTab === 'geral' && (
        <div className="space-y-6">
          <StoreSummaryTable 
            stores={filteredLojas} 
            currentTotal={currentTotal} 
            selectedLoja={selectedLoja} 
          />
          <StoreDetailList 
            stores={filteredLojas} 
            expandedLojas={expandedLojas} 
            toggleExpand={toggleExpand} 
            showCommissions={false}
          />
        </div>
      )}

      {/* ABA 2: RELATÓRIO COMPLETO COM COMISSÕES */}
      {activeTab === 'comissoes' && (
        <div className="space-y-6">
          <CommissionsTable 
            stores={filteredLojas} 
            currentTotal={currentTotal} 
            selectedLoja={selectedLoja} 
          />
          <StoreDetailList 
            stores={filteredLojas} 
            expandedLojas={expandedLojas} 
            toggleExpand={toggleExpand} 
            showCommissions={true}
          />
        </div>
      )}

    </div>
  );
}
