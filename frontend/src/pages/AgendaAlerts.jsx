import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Building2, 
  CheckCircle2, 
  Printer, 
  FileText,
  RefreshCw,
  Paperclip,
  X,
  ExternalLink,
  Tractor
} from 'lucide-react';
import { formatCurrency, formatNumber, getCleanFileName } from '../utils/formatters';
import { api } from '../services/api';
import { calculateLiquidation } from '../utils/calculations';
import SettleModal from '../components/sales/SettleModal';
import AgendaKpiCards from '../components/agenda/AgendaKpiCards';
import AgendaLojasTable from '../components/agenda/AgendaLojasTable';
import AgendaProdutoresTable from '../components/agenda/AgendaProdutoresTable';

export default function AgendaAlerts({ setCurrentPage }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notification, setNotification] = useState('');
  
  // Controle de Abas: 'lojas' (Contas a Receber) vs 'produtores' (Contas a Pagar)
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedTab = sessionStorage.getItem('agrovenda_agenda_tab');
      if (savedTab) {
        sessionStorage.removeItem('agrovenda_agenda_tab');
        return savedTab;
      }
    } catch (e) {}
    return 'lojas';
  });

  // Filtros - Aba Lojas
  const [selectedLoja, setSelectedLoja] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState(() => {
    try {
      const savedEntity = sessionStorage.getItem('agrovenda_filter_entity');
      if (savedEntity) {
        sessionStorage.removeItem('agrovenda_filter_entity');
        return savedEntity;
      }
    } catch (e) {}
    return '';
  });

  // Filtros - Aba Produtores
  const [selectedProducer, setSelectedProducer] = useState('ALL');
  const [selectedProducerLoja, setSelectedProducerLoja] = useState('ALL');
  const [producerStatusFilter, setProducerStatusFilter] = useState('ALL');
  const [searchProducer, setSearchProducer] = useState(() => {
    try {
      const savedEntity = sessionStorage.getItem('agrovenda_filter_entity');
      if (savedEntity) {
        return savedEntity;
      }
    } catch (e) {}
    return '';
  });

  // Estados de Upload / Modal / Visualização
  const [uploadingSaleId, setUploadingSaleId] = useState(null);
  const [previewEvidence, setPreviewEvidence] = useState(null);
  const [settleSaleModal, setSettleSaleModal] = useState(null);
  const [settleTarget, setSettleTarget] = useState('client'); // 'client' | 'producer'

  const fetchSales = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/sales');
      if (Array.isArray(data)) {
        setSales(data);
      }
    } catch (err) {
      console.error('Erro ao buscar agenda:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const data = await api.post('/api/sales/sync-all-webhooks');
      showNotification(data?.message || 'Todas as vendas foram enviadas para o Webhook do n8n / Google Calendar com sucesso!');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro ao sincronizar vendas via webhook.');
    } finally {
      setSyncing(false);
    }
  };

  // --- Handlers de Recebimento de Lojas ---
  const handleUnsettleClient = async (saleId) => {
    if (!window.confirm(`Deseja reverter o recebimento da venda ${saleId} (retornar para status 'A Receber')?`)) return;
    try {
      await api.post(`/api/sales/${saleId}/unsettle`);
      showNotification(`Recebimento da venda ${saleId} revertido com sucesso! Status alterado para 'A Receber'.`);
      fetchSales();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro ao reverter liquidação da loja.');
    }
  };

  const handleUploadClientEvidence = async (saleId, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    setUploadingSaleId(`client-${saleId}`);
    try {
      const data = await api.upload('/api/upload', formData);
      const fname = data?.filename || file.name;
      await api.put(`/api/sales/${saleId}`, { paymentProofFile: fname });
      showNotification(`Comprovante de recebimento anexado à venda ${saleId} com sucesso!`);
      fetchSales();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro no upload do comprovante.');
    } finally {
      setUploadingSaleId(null);
    }
  };

  const handleRemoveClientEvidence = async (saleId, e) => {
    e?.stopPropagation?.();
    if (!window.confirm(`Deseja excluir o comprovante de recebimento da venda ${saleId}?`)) return;

    try {
      await api.put(`/api/sales/${saleId}`, { paymentProofFile: null });
      showNotification(`Comprovante de recebimento da venda ${saleId} removido com sucesso.`);
      fetchSales();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro de conexão ao remover comprovante.');
    }
  };

  // --- Handlers de Repasse a Produtores ---
  const handleUnsettleProducer = async (saleId) => {
    if (!window.confirm(`Deseja reverter o repasse ao produtor da venda ${saleId} (retornar para status 'A Pagar')?`)) return;
    try {
      await api.post(`/api/sales/${saleId}/unsettle-producer`);
      showNotification(`Repasse ao produtor da venda ${saleId} revertido com sucesso! Status alterado para 'A Pagar'.`);
      fetchSales();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro ao reverter repasse do produtor.');
    }
  };

  const handleUploadProducerEvidence = async (saleId, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    setUploadingSaleId(`producer-${saleId}`);
    try {
      const data = await api.upload('/api/upload', formData);
      const fname = data?.filename || file.name;
      await api.put(`/api/sales/${saleId}`, { producerPaymentProofFile: fname });
      showNotification(`Comprovante de repasse ao produtor anexado à venda ${saleId} com sucesso!`);
      fetchSales();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro no upload do comprovante.');
    } finally {
      setUploadingSaleId(null);
    }
  };

  const handleRemoveProducerEvidence = async (saleId, e) => {
    e?.stopPropagation?.();
    if (!window.confirm(`Deseja excluir o comprovante de repasse ao produtor da venda ${saleId}?`)) return;

    try {
      await api.put(`/api/sales/${saleId}`, { producerPaymentProofFile: null });
      showNotification(`Comprovante de repasse da venda ${saleId} removido com sucesso.`);
      fetchSales();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro de conexão ao remover comprovante.');
    }
  };

  // Helper para extrair data de vencimento
  const parseDueDate = (sale) => {
    if (sale.dueDate) {
      const parts = sale.dueDate.split('-');
      if (parts.length === 3) {
        return {
          formatted: `${parts[2]}/${parts[1]}/${parts[0]}`,
          isoDate: sale.dueDate
        };
      }
    }
    if (sale.notes) {
      const match = sale.notes.match(/Vencimento:\s*([^\s|]+)/i);
      if (match && match[1]) {
        const parts = match[1].split('/');
        if (parts.length === 3) {
          return {
            formatted: match[1],
            isoDate: `${parts[2]}-${parts[1]}-${parts[0]}`
          };
        }
      }
    }
    if (sale.saleDate) {
      const days = Number(sale.paymentTermDays) !== undefined && !isNaN(Number(sale.paymentTermDays)) ? Number(sale.paymentTermDays) : 30;
      const d = new Date(sale.saleDate + 'T12:00:00');
      d.setDate(d.getDate() + days);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return {
        formatted: `${day}/${month}/${year}`,
        isoDate: d.toISOString().split('T')[0]
      };
    }
    return { formatted: 'A Definir', isoDate: '9999-12-31' };
  };

  // Processa a lista com os cálculos para Loja e Produtor
  const scheduleList = sales.map(s => {
    const dueDateObj = parseDueDate(s);
    const nfNumber = s.nfFile ? s.nfFile.replace(/^\d{10,15}(-\d+)?-/, '').replace('NF-', '').replace('.pdf', '') : (s.nfeKey ? s.nfeKey.slice(-8) : 'Pendente');
    
    // Cálculos consolidados canônicos para Loja e Produtor
    const liq = calculateLiquidation(s);
    const valorVP = liq.valorVP;

    let cotacao = Number(s.dailyQuote) || 0;
    if (!cotacao && s.notes) {
      const m = s.notes.match(/Cotação:?\s*R\$\s*([\d,.]+)/i);
      if (m) cotacao = parseFloat(m[1].replace(',', '.'));
    }
    if (!cotacao) cotacao = 45.0;

    const caixas = Number(s.totalVolumes) || (Number(s.totalKg) > 0 ? (Number(s.totalKg) / 29) : 0);

    // Contas do Produtor (Base: Valor Total da Nota Fiscal)
    const totalNF = Number(s.totalOperation) || 0;
    const funrural = liq.funrural;
    const liquidoProdutor = Math.max(0, totalNF - funrural);
    const producerPaid = Number(s.producerPaidAmount) || 0;
    const saldoProdutor = Math.max(0, totalNF - producerPaid);
    
    const isProducerFullySettled = s.producerPaymentStatus === 'Pago' || (totalNF > 0 && producerPaid >= totalNF - 0.01);
    const isProducerPartial = s.producerPaymentStatus === 'Parcial' || (producerPaid > 0 && producerPaid < totalNF - 0.01);
    const producerPercentPaid = totalNF > 0 ? (producerPaid / totalNF) * 100 : 0;
    const producerStatus = s.producerPaymentStatus || (isProducerFullySettled ? 'Pago' : (isProducerPartial ? 'Parcial' : 'A Pagar'));

    return {
      ...s,
      dueDateFormatted: dueDateObj.formatted,
      dueDateIso: dueDateObj.isoDate,
      nfNumber,
      cotacao,
      caixas,
      // Loja
      valorVP,
      valorLiquidado: liq.valorLiquidado,
      valorALiquidar: liq.valorALiquidar,
      totalLiquido: liq.totalLiquido,
      paymentStatus: liq.paymentStatus,
      isFullySettled: liq.isFullySettled,
      isPartial: liq.isPartial,
      percentPaid: liq.percentPaid,
      // Produtor
      producerOrigin: s.origin || 'Produtor Rural',
      totalNF,
      funrural,
      liquidoProdutor,
      producerPaid,
      saldoProdutor,
      isProducerFullySettled,
      isProducerPartial,
      producerPercentPaid,
      producerStatus
    };
  }).sort((a, b) => a.dueDateIso.localeCompare(b.dueDateIso));

  // Opções de Lojas e Produtores para filtros
  const uniqueLojas = Array.from(new Set(sales.map(s => s.client))).filter(Boolean);
  const uniqueProducers = Array.from(new Set(sales.map(s => s.origin))).filter(Boolean);

  // Filtros aplicados para Lojas
  const filteredScheduleLojas = scheduleList.filter(item => {
    const matchLoja = selectedLoja === 'ALL' || item.client === selectedLoja;
    const matchStatus = statusFilter === 'ALL' || 
      (statusFilter === 'RECEBIDO' && item.isFullySettled) ||
      (statusFilter === 'PARCIAL' && item.isPartial) ||
      (statusFilter === 'PENDENTE' && !item.isFullySettled);
    const matchSearch = (item.client || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.nfNumber || '').toLowerCase().includes(search.toLowerCase());
    return matchLoja && matchStatus && matchSearch;
  });

  // Filtros aplicados para Produtores
  const filteredScheduleProdutores = scheduleList.filter(item => {
    const matchProducer = selectedProducer === 'ALL' || item.producerOrigin === selectedProducer;
    const matchLoja = selectedProducerLoja === 'ALL' || item.client === selectedProducerLoja;
    const matchStatus = producerStatusFilter === 'ALL' || 
      (producerStatusFilter === 'PAGO' && item.isProducerFullySettled) ||
      (producerStatusFilter === 'PARCIAL' && item.isProducerPartial) ||
      (producerStatusFilter === 'A_PAGAR' && !item.isProducerFullySettled && !item.isProducerPartial);
    const matchSearch = (item.producerOrigin || '').toLowerCase().includes(searchProducer.toLowerCase()) ||
      (item.client || '').toLowerCase().includes(searchProducer.toLowerCase()) ||
      (item.id || '').toLowerCase().includes(searchProducer.toLowerCase()) ||
      (item.nfNumber || '').toLowerCase().includes(searchProducer.toLowerCase());
    return matchProducer && matchLoja && matchStatus && matchSearch;
  });

  // KPIs - Aba Lojas (Recebimentos)
  const totalALiquidarProgramado = scheduleList.reduce((acc, s) => acc + s.valorALiquidar, 0);
  const totalRecebido = scheduleList.reduce((acc, s) => acc + s.valorLiquidado, 0);
  const totalVPProgramado = scheduleList.reduce((acc, s) => acc + s.valorVP, 0);
  const totalPedidosAbertos = scheduleList.filter(s => !s.isFullySettled).length;

  // KPIs - Aba Produtores (Repasses)
  const totalProdutorAPagar = scheduleList.reduce((acc, s) => acc + s.saldoProdutor, 0);
  const totalNFProgramado = scheduleList.reduce((acc, s) => acc + s.totalNF, 0);
  const totalFunruralRetido = scheduleList.reduce((acc, s) => acc + s.funrural, 0);
  const totalProdutorPago = scheduleList.reduce((acc, s) => acc + s.producerPaid, 0);
  const totalProdutoresPendentes = scheduleList.filter(s => !s.isProducerFullySettled).length;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="text-xs font-bold text-[#091b2e] tracking-wider uppercase flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#df7b1b]" />
            <span>AGROVENDA — CRONOGRAMA FINANCEIRO SEPARADO</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">
            Agenda & Alertas Financeiros
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Gestão segregada entre <strong>Recebimento de Lojas (VP Comercial)</strong> e <strong>Repasse a Produtores (Valor NF com FUNRURAL)</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            title="Dispara todos os lançamentos e arquivos de vendas para o Webhook do n8n (Google Agenda & Google Drive)"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sincronizando com n8n...' : '⚡ Sincronizar Tudo (Agenda & Drive)'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir Cronograma
          </button>
        </div>
      </div>

      {/* Notificação Toast */}
      {notification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm shadow-xs animate-in fade-in duration-150">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{notification}</span>
        </div>
      )}

      {/* Seletor de Abas Dedicadas (Lojas vs Produtores) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('lojas')}
          className={`flex items-center justify-between sm:justify-start gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'lojas'
              ? 'bg-[#091b2e] text-white shadow-md'
              : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Building2 className={`w-4 h-4 ${activeTab === 'lojas' ? 'text-[#df7b1b]' : 'text-gray-400'}`} />
            <span>📥 Recebimentos de Lojas (Contas a Receber)</span>
          </div>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
            activeTab === 'lojas' ? 'bg-[#df7b1b] text-white' : 'bg-gray-100 text-gray-700'
          }`}>
            {totalPedidosAbertos} abertos
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('produtores')}
          className={`flex items-center justify-between sm:justify-start gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'produtores'
              ? 'bg-emerald-800 text-white shadow-md'
              : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Tractor className={`w-4 h-4 ${activeTab === 'produtores' ? 'text-amber-300' : 'text-gray-400'}`} />
            <span>📤 Repasses a Produtores (Contas a Pagar)</span>
          </div>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
            activeTab === 'produtores' ? 'bg-amber-400 text-emerald-950' : 'bg-gray-100 text-gray-700'
          }`}>
            {totalProdutoresPendentes} a pagar
          </span>
        </button>
      </div>

      {/* Cards de Resumo (KPIs) Modular */}
      <AgendaKpiCards
        activeTab={activeTab}
        totalALiquidarProgramado={totalALiquidarProgramado}
        totalVPProgramado={totalVPProgramado}
        totalPedidosAbertos={totalPedidosAbertos}
        totalRecebido={totalRecebido}
        scheduleListCount={scheduleList.length}
        totalProdutorAPagar={totalProdutorAPagar}
        totalNFProgramado={totalNFProgramado}
        totalFunruralRetido={totalFunruralRetido}
        totalProdutorPago={totalProdutorPago}
      />

      {/* Tabela de Recebimentos de Lojas (Modular) */}
      {activeTab === 'lojas' && (
        <AgendaLojasTable
          filteredScheduleLojas={filteredScheduleLojas}
          scheduleListCount={scheduleList.length}
          search={search}
          setSearch={setSearch}
          selectedLoja={selectedLoja}
          setSelectedLoja={setSelectedLoja}
          uniqueLojas={uniqueLojas}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          uploadingSaleId={uploadingSaleId}
          onSettleClick={(item) => {
            setSettleTarget('client');
            setSettleSaleModal(item);
          }}
          onUnsettleClick={handleUnsettleClient}
          onPreviewEvidence={setPreviewEvidence}
          onRemoveEvidence={handleRemoveClientEvidence}
          onUploadEvidence={handleUploadClientEvidence}
        />
      )}

      {/* Tabela de Repasses a Produtores (Modular) */}
      {activeTab === 'produtores' && (
        <AgendaProdutoresTable
          filteredScheduleProdutores={filteredScheduleProdutores}
          scheduleListCount={scheduleList.length}
          searchProducer={searchProducer}
          setSearchProducer={setSearchProducer}
          selectedProducer={selectedProducer}
          setSelectedProducer={setSelectedProducer}
          uniqueProducers={uniqueProducers}
          selectedLoja={selectedProducerLoja}
          setSelectedLoja={setSelectedProducerLoja}
          uniqueLojas={uniqueLojas}
          producerStatusFilter={producerStatusFilter}
          setProducerStatusFilter={setProducerStatusFilter}
          uploadingSaleId={uploadingSaleId}
          onSettleClick={(item) => {
            setSettleTarget('producer');
            setSettleSaleModal(item);
          }}
          onUnsettleClick={handleUnsettleProducer}
          onPreviewEvidence={setPreviewEvidence}
          onRemoveEvidence={handleRemoveProducerEvidence}
          onUploadEvidence={handleUploadProducerEvidence}
        />
      )}

      {/* SettleModal para quitação total e parcial (Loja ou Produtor) */}
      <SettleModal
        isOpen={!!settleSaleModal}
        sale={settleSaleModal}
        target={settleTarget}
        onClose={() => setSettleSaleModal(null)}
        onSettled={() => {
          fetchSales();
          showNotification(settleTarget === 'producer' 
            ? 'Repasse ao produtor registrado com sucesso!' 
            : 'Recebimento da loja registrado com sucesso!');
        }}
      />

      {/* Modal Lightbox: Visualizar Comprovante em Alta Resolução */}
      {previewEvidence && (
        <div 
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setPreviewEvidence(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full p-4 shadow-2xl overflow-hidden space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-gray-900">Comprovante Financeiro</span>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={`/uploads/${previewEvidence}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir original</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewEvidence(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center bg-gray-900/5 rounded-xl p-2 min-h-[260px] max-h-[70vh] overflow-auto">
              {previewEvidence.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                <img 
                  src={`/uploads/${previewEvidence}`} 
                  alt="Comprovante Financeiro" 
                  className="max-h-[65vh] w-auto object-contain rounded-lg shadow-sm"
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto" />
                  <div className="text-xs font-semibold text-gray-700">{previewEvidence}</div>
                  <a
                    href={`/uploads/${previewEvidence}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-[#091b2e] text-white text-xs font-bold px-4 py-2 rounded-lg"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Baixar / Abrir Documento</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
