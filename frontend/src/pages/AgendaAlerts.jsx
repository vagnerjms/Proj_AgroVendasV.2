import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Printer, 
  RefreshCw,
  BarChart3,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { api } from '../services/api';
import { calculateLiquidation } from '../utils/calculations';
import { resolveRomaneioNumber, nfDisplayLabel } from '../utils/dataHelpers';
import AgendaKpiCards from '../components/agenda/AgendaKpiCards';
import AgendaLojasTable from '../components/agenda/AgendaLojasTable';
import MultiStoreSelect from '../components/reports/MultiStoreSelect';
import MultiProductSelect from '../components/reports/MultiProductSelect';
import PaymentProofPreviewModal from '../components/sales/PaymentProofPreviewModal';

export default function AgendaAlerts({ setCurrentPage }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notification, setNotification] = useState('');
  const [showKpis, setShowKpis] = useState(true);

  // Filtros - Recebimentos de Lojas
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

  // Estados de Upload / Modal / Visualização
  const [previewEvidence, setPreviewEvidence] = useState(null);
  const [selectedStores, setSelectedStores] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const storesInitRef = useRef(false);
  const productsInitRef = useRef(false);

  const goToFiscal = () => {
    if (typeof setCurrentPage === 'function') setCurrentPage('financial');
  };

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

  // Agenda = só lembretes; baixas ficam no Fiscal

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
    const nfNumber = nfDisplayLabel(s);
    
    // Cálculos consolidados canônicos para Loja e Produtor
    const liq = calculateLiquidation(s);
    const valorVP = liq.valorVP;

    let cotacao = Number(s.dailyQuote) || 0;
    if (!cotacao && s.notes) {
      const m = s.notes.match(/Cotação:?\s*R\$\s*([\d,.]+)/i);
      if (m) cotacao = parseFloat(m[1].replace(',', '.'));
    }

    const caixas = Number(s.totalVolumes) || (Number(s.totalKg) > 0 ? (Number(s.totalKg) / 29) : 0);

    // Contas do Produtor (Base: Valor Total da Nota Fiscal / Thais)
    const totalNF = liq.valorTotalNF;
    const funrural = liq.funrural;
    const liquidoProdutor = liq.liquidoNF;
    const producerPaid = liq.producerPaidAmount;
    const saldoProdutor = liq.producerAPagar;
    
    const isProducerFullySettled = liq.isProducerSettled;
    const isProducerPartial = liq.isProducerPartial;
    const producerPercentPaid = totalNF > 0 ? (producerPaid / totalNF) * 100 : 0;
    const producerStatus = s.producerPaymentStatus || (isProducerFullySettled ? 'Pago' : (isProducerPartial ? 'Parcial' : 'A Pagar'));

    const product = s.items?.[0]?.product || s.product || (() => {
      const m = (s.notes || '').match(/(cenoura|cebola|batata|alho|tomate)/i);
      return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() : '';
    })();

    return {
      ...s,
      product,
      romaneioNumber: resolveRomaneioNumber(s),
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

  // Opções de Lojas para filtros
  const uniqueLojas = Array.from(new Set(sales.map(s => s.client))).filter(Boolean);
  const uniqueProducts = Array.from(new Set(scheduleList.map(s => s.product).filter(Boolean))).sort();

  useEffect(() => {
    if (!storesInitRef.current && uniqueLojas.length > 0) {
      setSelectedStores([...uniqueLojas].sort());
      storesInitRef.current = true;
    }
  }, [uniqueLojas]);

  useEffect(() => {
    if (!productsInitRef.current && uniqueProducts.length > 0) {
      setSelectedProducts(uniqueProducts);
      productsInitRef.current = true;
    }
  }, [uniqueProducts]);

  const matchProductFilter = (item) => {
    if (!productsInitRef.current) return true;
    if (selectedProducts.length === 0) return false;
    return selectedProducts.includes(item.product);
  };

  const matchStoresFilter = (client) => {
    if (!storesInitRef.current) return true;
    if (!selectedStores || selectedStores.length === 0) return false;
    return selectedStores.includes(client);
  };

  // Filtros aplicados para Lojas
  const filteredScheduleLojas = scheduleList.filter(item => {
    const matchLoja = matchStoresFilter(item.client);
    const matchStatus = statusFilter === 'ALL' ||
      (statusFilter === 'RECEBIDO' && item.isFullySettled) ||
      (statusFilter === 'PARCIAL' && item.isPartial) ||
      (statusFilter === 'PENDENTE' && !item.isFullySettled && !item.isPartial);
    const matchSearch = (item.client || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.nfNumber || '').toLowerCase().includes(search.toLowerCase());
    return matchLoja && matchStatus && matchSearch && matchProductFilter(item);
  });

  // KPIs - Recebimentos
  const totalALiquidarProgramado = scheduleList.reduce((acc, s) => acc + s.valorALiquidar, 0);
  const totalRecebido = scheduleList.reduce((acc, s) => acc + s.valorLiquidado, 0);
  const totalVPProgramado = scheduleList.reduce((acc, s) => acc + s.valorVP, 0);
  const totalPedidosAbertos = scheduleList.filter(s => !s.isFullySettled).length;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="text-xs font-bold text-[#091b2e] tracking-wider uppercase flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#F97316]" />
            <span>AGROVENDA — CRONOGRAMA FINANCEIRO SEPARADO</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">
            Agenda & Alertas Financeiros
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Lembretes de vencimento e recebimentos das lojas. Baixas no Fiscal.
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

      {/* Filtros globais produto + multi-loja + status */}
      <div className="flex flex-wrap items-center gap-3">
        <MultiStoreSelect
          stores={uniqueLojas}
          selectedStores={selectedStores}
          onChange={setSelectedStores}
        />
        <MultiProductSelect
          products={uniqueProducts}
          selectedProducts={selectedProducts}
          onChange={setSelectedProducts}
        />
        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
          {[
            { id: 'ALL', label: 'Todos', active: 'bg-white text-gray-900 shadow-2xs font-bold' },
            { id: 'PENDENTE', label: 'A Receber', active: 'bg-amber-100 text-amber-900' },
            { id: 'PARCIAL', label: 'Parcial', active: 'bg-blue-100 text-blue-900' },
            { id: 'RECEBIDO', label: 'Recebido', active: 'bg-emerald-100 text-emerald-800' }
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
                statusFilter === f.id ? (f.active || 'bg-white text-gray-900 shadow-2xs font-bold') : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 font-medium">
          Agenda = lembretes de vencimento. Baixas no Fiscal.
        </p>
        <button
          type="button"
          onClick={() => setShowKpis(!showKpis)}
          className="ml-auto text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
          title={showKpis ? 'Ocultar cards de resumo' : 'Exibir cards de resumo'}
        >
          <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
          <span>{showKpis ? 'Ocultar Resumo' : 'Ver Resumo'}</span>
          {showKpis ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Cards de Resumo (KPIs) — só Recebimentos */}
      {showKpis && (
        <AgendaKpiCards
          activeTab="lojas"
          totalALiquidarProgramado={totalALiquidarProgramado}
          totalVPProgramado={totalVPProgramado}
          totalPedidosAbertos={totalPedidosAbertos}
          totalRecebido={totalRecebido}
          scheduleListCount={scheduleList.length}
          totalProdutorAPagar={0}
          totalNFProgramado={0}
          totalFunruralRetido={0}
          totalProdutorPago={0}
        />
      )}

      <AgendaLojasTable
        filteredScheduleLojas={filteredScheduleLojas}
        scheduleListCount={scheduleList.length}
        search={search}
        setSearch={setSearch}
        onGoToFiscal={goToFiscal}
        onPreviewEvidence={setPreviewEvidence}
      />

      {previewEvidence && (
        <PaymentProofPreviewModal
          filename={previewEvidence}
          onClose={() => setPreviewEvidence(null)}
        />
      )}
    </div>
  );
}
