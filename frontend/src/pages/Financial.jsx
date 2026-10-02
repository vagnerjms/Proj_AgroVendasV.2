import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  Tractor,
  Building2,
  Paperclip,
  FileText
} from 'lucide-react';
import { formatCurrency, formatDate, getCleanFileName } from '../utils/formatters';
import { api } from '../services/api';
import { calculateLiquidation, calculateFunrural } from '../utils/calculations';
import { nfDisplayLabel, resolveRomaneioNumber, quantityOf, formatQuantity, resolveProductUnit } from '../utils/dataHelpers';
import { DATA_LABELS } from '../constants/dataLabels';
import SettleModal from '../components/sales/SettleModal';
import MultiStoreSelect from '../components/reports/MultiStoreSelect';
import MultiProductSelect from '../components/reports/MultiProductSelect';
import MultiProducerSelect from '../components/reports/MultiProducerSelect';
import SaleAttachmentLinks from '../components/sales/SaleAttachmentLinks';
import PaymentProofPreviewModal from '../components/sales/PaymentProofPreviewModal';

function paymentMethodLabel(sale) {
  const hist = Array.isArray(sale.paymentHistory) ? sale.paymentHistory : [];
  const paid = Number(sale.paidAmount) > 0;
  const hasHistory = hist.some((h) => h && (h.paymentMethod || Number(h.amount) > 0));
  // Só exibe forma de pagamento após quitação parcial ou total
  if (!paid && !hasHistory) return '—';

  const lastWithMethod = [...hist].reverse().find((h) => h?.paymentMethod);
  const method = lastWithMethod?.paymentMethod || '';
  if (!method) return '—';
  if (method === 'Cheque') return 'Cheque';
  if (method === 'TED/DOC') return 'TED/DOC';
  return method;
}

function settlementDiscountInfo(sale) {
  const hist = Array.isArray(sale.paymentHistory) ? sale.paymentHistory : [];
  const totalDiscount = hist.reduce((acc, h) => acc + (Number(h?.discountAmount) || 0), 0);
  const lastWithDisc = [...hist].reverse().find((h) => Number(h?.discountAmount) > 0 || (h?.notes && Number(h?.discountAmount) > 0));
  const note = lastWithDisc?.notes || hist.filter((h) => h?.notes).slice(-1)[0]?.notes || '';
  return {
    totalDiscount: Math.round((totalDiscount + Number.EPSILON) * 100) / 100,
    note: note || ''
  };
}

function extractProductName(sale) {
  if (sale.items?.[0]?.product) return sale.items[0].product;
  if (sale.product) return sale.product;
  if (sale.notes) {
    const m = sale.notes.match(/(cenoura|cebola|batata|alho|tomate|ab[oó]bora)/i);
    if (m) return m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
  }
  return 'Outros';
}

function extractProducerName(sale) {
  const origin = (sale.origin || '').trim();
  if (origin) {
    // "NOME (Cidade/UF)" → NOME
    const bare = origin.replace(/\s*\([^)]*\)\s*$/, '').trim();
    return bare || origin;
  }
  if (sale.producer) return String(sale.producer).trim();
  return 'Sem produtor';
}

export default function Financial({ view = 'overview', setCurrentPage }) {
  const [sales, setSales] = useState([]);
  const [financial, setFinancial] = useState({
    totalAReceber: 0,
    totalAReceberNF: 0,
    totalAReceberVP: 0,
    totalAPagar: 0,
    totalRecebido: 0,
    totalFunrural: 0,
    totalPrevidencia: 0,
    totalRat: 0,
    totalSenar: 0,
    totalComissao: 0,
    salesCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedStores, setSelectedStores] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedProducers, setSelectedProducers] = useState([]);
  const [currentPage, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [settleSaleModal, setSettleSaleModal] = useState(null);
  const [settleTarget, setSettleTarget] = useState('client');
  const [notification, setNotification] = useState('');
  const [previewProof, setPreviewProof] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const storesInitRef = useRef(false);
  const productsInitRef = useRef(false);
  const producersInitRef = useRef(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [salesData, finData] = await Promise.all([
        api.get('/api/sales'),
        api.get('/api/financial')
      ]);
      if (Array.isArray(salesData)) setSales(salesData);
      if (finData) setFinancial(finData);
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const uniqueLojas = useMemo(() => [...new Set(sales.map(s => s.client).filter(Boolean))].sort(), [sales]);
  const uniqueProducts = useMemo(() => [...new Set(sales.map(extractProductName).filter(Boolean))].sort(), [sales]);
  const uniqueProducers = useMemo(() => [...new Set(sales.map(extractProducerName).filter(Boolean))].sort(), [sales]);

  useEffect(() => {
    if (!storesInitRef.current && uniqueLojas.length > 0) {
      setSelectedStores(uniqueLojas);
      storesInitRef.current = true;
    }
  }, [uniqueLojas]);

  useEffect(() => {
    if (!productsInitRef.current && uniqueProducts.length > 0) {
      setSelectedProducts(uniqueProducts);
      productsInitRef.current = true;
    }
  }, [uniqueProducts]);

  useEffect(() => {
    if (!producersInitRef.current && uniqueProducers.length > 0) {
      setSelectedProducers(uniqueProducers);
      producersInitRef.current = true;
    }
  }, [uniqueProducers]);

  const productMatches = (sale) => {
    if (selectedProducts.length === 0) return false;
    return selectedProducts.includes(extractProductName(sale));
  };

  const producerMatches = (sale) => {
    if (selectedProducers.length === 0) return false;
    return selectedProducers.includes(extractProducerName(sale));
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleUnsettleClient = async (saleId) => {
    if (!window.confirm(`Reverter recebimento da loja na venda ${saleId}?`)) return;
    try {
      await api.post(`/api/sales/${saleId}/unsettle`);
      showNotification(`Recebimento da venda ${saleId} revertido.`);
      loadData();
    } catch (err) {
      alert(err.message || 'Erro ao reverter recebimento');
    }
  };

  const handleUnsettleProducer = async (saleId) => {
    if (!window.confirm(`Reverter repasse ao produtor na venda ${saleId}?`)) return;
    try {
      await api.post(`/api/sales/${saleId}/unsettle-producer`);
      showNotification(`Repasse do produtor na venda ${saleId} revertido.`);
      loadData();
    } catch (err) {
      alert(err.message || 'Erro ao reverter repasse');
    }
  };

  const handleUploadProof = async (saleId, file, target = 'client') => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploadingId(`${target}-${saleId}`);
    try {
      const data = await api.upload('/api/upload', formData);
      const fname = data?.filename || file.name;
      const patch = target === 'producer'
        ? { producerPaymentProofFile: fname }
        : { paymentProofFile: fname };
      await api.put(`/api/sales/${saleId}`, patch);
      showNotification(`Comprovante anexado à ${saleId}.`);
      loadData();
    } catch (err) {
      alert(err.message || 'Erro no upload');
    } finally {
      setUploadingId(null);
    }
  };

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const liq = calculateLiquidation(s);
      if (statusFilter === 'RECEIVED' && !liq.isFullySettled) return false;
      if (statusFilter === 'PENDING' && liq.isFullySettled) return false;
      if (statusFilter === 'PARTIAL' && !liq.isPartial) return false;

      // vazio = nenhuma loja / produto / produtor
      if (selectedStores.length === 0) return false;
      if (!selectedStores.includes(s.client)) return false;
      if (!productMatches(s)) return false;
      if (!producerMatches(s)) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const nf = nfDisplayLabel(s).toLowerCase();
      const rom = resolveRomaneioNumber(s).toLowerCase();
      return (
        (s.id || '').toLowerCase().includes(term) ||
        nf.includes(term) ||
        rom.includes(term) ||
        (s.client || '').toLowerCase().includes(term) ||
        (s.origin || '').toLowerCase().includes(term) ||
        extractProductName(s).toLowerCase().includes(term) ||
        (s.paymentStatus || '').toLowerCase().includes(term)
      );
    });
  }, [sales, statusFilter, searchTerm, selectedStores, selectedProducts, selectedProducers]);

  const totalsFiltered = useMemo(() => {
    return filteredSales.reduce((acc, s) => {
      const liq = calculateLiquidation(s);
      const fr = calculateFunrural(liq.valorTotalNF);
      acc.vp += liq.valorVP;
      acc.nf += liq.valorTotalNF;
      acc.recebido += liq.valorLiquidado;
      acc.saldo += liq.valorALiquidar;
      acc.peso += Number(s.totalKg) || 0;
      acc.caixas += quantityOf(s);
      acc.funrural += liq.funrural;
      acc.previdencia += fr.previdenciaSocial;
      acc.rat += fr.rat;
      acc.senar += fr.senar;
      acc.diff += Math.max(0, liq.valorVP - liq.valorTotalNF);
      return acc;
    }, { vp: 0, nf: 0, recebido: 0, saldo: 0, peso: 0, caixas: 0, funrural: 0, previdencia: 0, rat: 0, senar: 0, diff: 0 });
  }, [filteredSales]);

  const funruralRows = useMemo(() => {
    return sales
      .filter(s => {
        if (selectedStores.length === 0) return false;
        if (!selectedStores.includes(s.client)) return false;
        if (!productMatches(s)) return false;
        if (!producerMatches(s)) return false;
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        const nf = nfDisplayLabel(s).toLowerCase();
        const rom = resolveRomaneioNumber(s).toLowerCase();
        return (
          (s.id || '').toLowerCase().includes(term) ||
          nf.includes(term) ||
          rom.includes(term) ||
          (s.client || '').toLowerCase().includes(term) ||
          (s.origin || '').toLowerCase().includes(term) ||
          extractProductName(s).toLowerCase().includes(term)
        );
      })
      .map(s => {
        const liq = calculateLiquidation(s);
        const fr = calculateFunrural(liq.valorTotalNF);
        return { sale: s, liq, fr };
      });
  }, [sales, selectedStores, selectedProducts, selectedProducers, searchTerm]);

  const funruralTotals = useMemo(() => {
    return funruralRows.reduce((acc, row) => {
      acc.vp += row.liq.valorVP;
      acc.nf += row.liq.valorTotalNF;
      acc.funrural += row.fr.funruralTotal;
      acc.previdencia += row.fr.previdenciaSocial;
      acc.rat += row.fr.rat;
      acc.senar += row.fr.senar;
      return acc;
    }, { vp: 0, nf: 0, funrural: 0, previdencia: 0, rat: 0, senar: 0 });
  }, [funruralRows]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) setPage(1);
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSales = filteredSales.slice(startIndex, startIndex + pageSize);

  // —— Apuração FUNRURAL (tela dedicada) ——
  if (view === 'funrural') {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-[1700px] mx-auto space-y-6">
        <div>
          <div className="text-xs font-bold text-[#091b2e] uppercase">INICIO / FINANCEIRO & FISCAL</div>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Apuração e Retenção de FUNRURAL</h1>
          <p className="text-xs text-gray-500 mt-0.5">Consulta dedicada das alíquotas (1,63% s/ NF). Não opera baixas nesta tela.</p>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="VP, NF, loja, produto..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#091b2e] outline-none"
            />
          </div>
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="text-xs font-bold text-red-700 uppercase">FUNRURAL Total</div>
            <div className="text-2xl font-black text-red-600 mt-1">-{formatCurrency(funruralTotals.funrural)}</div>
          </div>
          <div className="bg-white rounded-xl border border-emerald-100 p-5 bg-emerald-50/40">
            <div className="text-xs font-bold text-gray-600">Previdência (1,20%)</div>
            <div className="text-xl font-black text-gray-900 mt-1">{formatCurrency(funruralTotals.previdencia)}</div>
          </div>
          <div className="bg-white rounded-xl border border-emerald-100 p-5 bg-emerald-50/40">
            <div className="text-xs font-bold text-gray-600">RAT (0,10%)</div>
            <div className="text-xl font-black text-gray-900 mt-1">{formatCurrency(funruralTotals.rat)}</div>
          </div>
          <div className="bg-white rounded-xl border border-emerald-100 p-5 bg-emerald-50/40">
            <div className="text-xs font-bold text-gray-600">SENAR (0,33%)</div>
            <div className="text-xl font-black text-gray-900 mt-1">{formatCurrency(funruralTotals.senar)}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 bg-gray-50/60">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Detalhamento por venda — VP, NF e FUNRURAL
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {funruralRows.length} venda(s) · retenção total <strong>{formatCurrency(funruralTotals.funrural)}</strong> sobre NF {formatCurrency(funruralTotals.nf)}.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#091b2e] text-white font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">{DATA_LABELS.vpNumber}</th>
                  <th className="py-2.5 px-3">{DATA_LABELS.romaneioNumber}</th>
                  <th className="py-2.5 px-3">Loja</th>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3">{DATA_LABELS.nfNumber}</th>
                  <th className="py-2.5 px-2 text-right bg-blue-900/50">Valor VP</th>
                  <th className="py-2.5 px-2 text-right">Valor NF</th>
                  <th className="py-2.5 px-2 text-right">Previdência</th>
                  <th className="py-2.5 px-2 text-right">RAT</th>
                  <th className="py-2.5 px-2 text-right">SENAR</th>
                  <th className="py-2.5 px-2 text-right text-red-200">FUNRURAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {funruralRows.length === 0 ? (
                  <tr><td colSpan={12} className="py-10 text-center text-gray-400">Nenhuma venda no filtro.</td></tr>
                ) : funruralRows.map(({ sale: s, liq, fr }) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3 whitespace-nowrap">{formatDate(s.saleDate)}</td>
                    <td className="py-2 px-3 font-mono font-bold text-[#173e27]">{s.id}</td>
                    <td className="py-2 px-3 font-mono text-gray-700">{resolveRomaneioNumber(s) || '—'}</td>
                    <td className="py-2 px-3 font-semibold">{s.client}</td>
                    <td className="py-2 px-3">{extractProductName(s)}</td>
                    <td className="py-2 px-3">{nfDisplayLabel(s)}</td>
                    <td className="py-2 px-2 text-right font-black text-blue-950 bg-blue-50/40">{formatCurrency(liq.valorVP)}</td>
                    <td className="py-2 px-2 text-right font-bold">{formatCurrency(liq.valorTotalNF)}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(fr.previdenciaSocial)}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(fr.rat)}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(fr.senar)}</td>
                    <td className="py-2 px-2 text-right font-black text-red-700">-{formatCurrency(fr.funruralTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                <tr>
                  <td colSpan={6} className="py-2.5 px-3 uppercase text-gray-700">TOTAL (filtro)</td>
                  <td className="py-2.5 px-2 text-right text-blue-950">{formatCurrency(funruralTotals.vp)}</td>
                  <td className="py-2.5 px-2 text-right">{formatCurrency(funruralTotals.nf)}</td>
                  <td className="py-2.5 px-2 text-right">{formatCurrency(funruralTotals.previdencia)}</td>
                  <td className="py-2.5 px-2 text-right">{formatCurrency(funruralTotals.rat)}</td>
                  <td className="py-2.5 px-2 text-right">{formatCurrency(funruralTotals.senar)}</td>
                  <td className="py-2.5 px-2 text-right text-red-800">-{formatCurrency(funruralTotals.funrural)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1700px] mx-auto space-y-6">
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg">
          {notification}
        </div>
      )}

      <div>
        <div className="text-xs font-bold text-[#091b2e] uppercase">INICIO / FINANCEIRO & FISCAL</div>
        <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Fiscal — Baixas, Cobrança e Fluxo</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Caixa operacional: receber das lojas (Valor negociado). FUNRURAL: consulte Apuração FUNRURAL.
        </p>
      </div>

      {/* KPIs do filtro ativo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-blue-200 bg-blue-50/20 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-blue-800 text-xs font-bold uppercase">
            <span className="truncate">Total Comercial</span>
            <ArrowUpRight className="w-4 h-4 text-[#F97316] shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-950">
            {formatCurrency(totalsFiltered.vp)}
          </div>
          <span className="text-[11px] text-blue-600 font-medium">Valor negociado no filtro</span>
        </div>

        <div className="bg-white rounded-xl border-2 border-emerald-500 bg-emerald-50/40 p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between text-emerald-900 text-xs font-black uppercase">
            <span className="truncate">Saldo Lojas (VP)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-950">
            {formatCurrency(totalsFiltered.saldo)}
          </div>
          <span className="text-[11px] text-emerald-800 font-bold">VP − já recebido</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
            <span className="truncate">Já Recebido</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-black text-gray-900">
            {formatCurrency(totalsFiltered.recebido)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
            <span className="truncate">Total Faturado (NF)</span>
            <ArrowDownRight className="w-4 h-4 text-gray-400 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-black text-gray-900">
            {formatCurrency(totalsFiltered.nf)}
          </div>
          <span className="text-[11px] text-gray-400">Referência fiscal no filtro</span>
        </div>
      </div>

      {/* Tabela unificada Baixas + Rastreio */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                placeholder="VP, NF, romaneio, loja, produtor, produto..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#091b2e] outline-none"
              />
              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-gray-400 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <MultiStoreSelect
              stores={uniqueLojas}
              selectedStores={selectedStores}
              onChange={(v) => { setSelectedStores(v); setPage(1); }}
            />

            <MultiProductSelect
              products={uniqueProducts}
              selectedProducts={selectedProducts}
              onChange={(v) => { setSelectedProducts(v); setPage(1); }}
            />

            <MultiProducerSelect
              producers={uniqueProducers}
              selectedProducers={selectedProducers}
              onChange={(v) => { setSelectedProducers(v); setPage(1); }}
            />

            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs flex-wrap">
              {[
                { id: 'ALL', label: 'Todos' },
                { id: 'PENDING', label: 'A Receber', active: 'bg-amber-100 text-amber-900' },
                { id: 'PARTIAL', label: 'Parcial', active: 'bg-blue-100 text-blue-900' },
                { id: 'RECEIVED', label: 'Recebidos', active: 'bg-emerald-100 text-emerald-900' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setStatusFilter(f.id); setPage(1); }}
                  className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                    statusFilter === f.id ? (f.active || 'bg-white text-gray-900 shadow-2xs font-bold') : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-gray-500">
            {filteredSales.length} registro(s) · somas do filtro: VP {formatCurrency(totalsFiltered.vp)} · Recebido {formatCurrency(totalsFiltered.recebido)} · Saldo {formatCurrency(totalsFiltered.saldo)}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#091b2e] text-white font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-2">Data</th>
                <th className="py-3 px-2">{DATA_LABELS.vpNumber}</th>
                <th className="py-3 px-2">{DATA_LABELS.romaneioNumber}</th>
                <th className="py-3 px-2 text-center">{DATA_LABELS.nfNumber}</th>
                <th className="py-3 px-2">Loja</th>
                <th className="py-3 px-2">Produtor</th>
                <th className="py-3 px-2">Produto</th>
                <th className="py-3 px-2 text-right">{DATA_LABELS.quantity}</th>
                <th className="py-3 px-2 text-right bg-blue-900/50">{DATA_LABELS.valorNegociadoVP}</th>
                <th className="py-3 px-2 text-right">{DATA_LABELS.valorNF}</th>
                <th className="py-3 px-2 text-right text-emerald-300">Valor Recebido</th>
                <th className="py-3 px-2 text-right text-amber-300">{DATA_LABELS.saldoAReceber}</th>
                <th className="py-3 px-2">Vencimento</th>
                <th className="py-3 px-2 text-center">Status</th>
                <th className="py-3 px-2 text-center">{DATA_LABELS.formaPagamento}</th>
                <th className="py-3 px-2 text-center">Anexos</th>
                <th className="py-3 px-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={17} className="py-12 text-center text-gray-400">Carregando...</td></tr>
              ) : paginatedSales.length === 0 ? (
                <tr><td colSpan={17} className="py-12 text-center text-gray-400 italic">Nenhum título encontrado.</td></tr>
              ) : (
                paginatedSales.map(s => {
                  const liq = calculateLiquidation(s);
                  const discInfo = settlementDiscountInfo(s);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/80">
                      <td className="py-2.5 px-2 whitespace-nowrap">{formatDate(s.saleDate)}</td>
                      <td className="py-2.5 px-2 font-mono font-bold text-[#173e27] text-[11px]">{s.id}</td>
                      <td className="py-2.5 px-2 font-mono text-gray-700">{resolveRomaneioNumber(s) || '—'}</td>
                      <td className="py-2.5 px-2 text-center font-semibold text-gray-700">{nfDisplayLabel(s)}</td>
                      <td className="py-2.5 px-2 font-semibold text-gray-800">
                        <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3 text-gray-400" />{s.client}</span>
                      </td>
                      <td className="py-2.5 px-2 text-gray-600 text-[11px]">
                        <span className="inline-flex items-center gap-1"><Tractor className="w-3 h-3 text-emerald-700" />{s.origin || '—'}</span>
                      </td>
                      <td className="py-2.5 px-2 text-emerald-800 font-medium">{extractProductName(s)}</td>
                      <td className="py-2.5 px-2 text-right">{formatQuantity(quantityOf(s), resolveProductUnit(s))}</td>
                      <td className="py-2.5 px-2 text-right font-black text-blue-950 bg-blue-50/40">{formatCurrency(liq.valorVP)}</td>
                      <td className="py-2.5 px-2 text-right font-semibold text-gray-800">{formatCurrency(liq.valorTotalNF)}</td>
                      <td className="py-2.5 px-2 text-right font-black text-emerald-800 bg-emerald-50/30">
                        {liq.valorLiquidado > 0 ? formatCurrency(liq.valorLiquidado) : <span className="text-gray-400 font-normal">-</span>}
                        {discInfo.totalDiscount > 0 && (
                          <div className="text-[9px] font-bold text-amber-800 mt-0.5" title={discInfo.note || ''}>
                            − desc. {formatCurrency(discInfo.totalDiscount)}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right font-black text-amber-900 bg-amber-50/30">
                        {liq.valorALiquidar > 0 ? formatCurrency(liq.valorALiquidar) : <span className="text-gray-400 font-normal">-</span>}
                        {discInfo.note && discInfo.totalDiscount > 0 && (
                          <div className="text-[9px] font-semibold text-amber-800/90 mt-0.5 max-w-[9rem] ml-auto truncate" title={discInfo.note}>
                            {discInfo.note}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">{s.dueDate ? formatDate(s.dueDate) : '—'}</td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap min-w-[6.5rem]">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          liq.isFullySettled ? 'bg-emerald-100 text-emerald-800'
                            : liq.isPartial ? 'bg-blue-100 text-blue-900 border border-blue-200'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {liq.statusLabel}{liq.isPartial && liq.percentPaid ? ` (${liq.percentPaid.toFixed(0)}%)` : ''}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-[10px] font-bold text-gray-700">
                        {paymentMethodLabel(s)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <SaleAttachmentLinks sale={s} onPreviewProof={setPreviewProof} />
                      </td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {!liq.isFullySettled && (
                            <button
                              type="button"
                              onClick={() => { setSettleTarget('client'); setSettleSaleModal(s); }}
                              className={`${liq.isPartial ? 'bg-blue-700 hover:bg-blue-800' : 'bg-emerald-700 hover:bg-emerald-800'} text-white font-bold text-[10px] px-2 py-1.5 rounded-lg cursor-pointer`}
                            >
                              {liq.isPartial ? 'Receber (+)' : 'Receber'}
                            </button>
                          )}
                          {liq.paidAmount > 0 && (
                            <button type="button" onClick={() => handleUnsettleClient(s.id)}
                              className="text-[10px] text-amber-800 font-bold bg-amber-50 px-1.5 py-1 rounded border border-amber-200 cursor-pointer" title="Estornar">
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
              <tr>
                <td colSpan={7} className="py-2.5 px-2 uppercase text-gray-700">TOTAL (filtro)</td>
                <td className="py-2.5 px-2 text-right">{formatQuantity(totalsFiltered.caixas)}</td>
                <td className="py-2.5 px-2 text-right text-blue-950">{formatCurrency(totalsFiltered.vp)}</td>
                <td className="py-2.5 px-2 text-right">{formatCurrency(totalsFiltered.nf)}</td>
                <td className="py-2.5 px-2 text-right text-emerald-800">{formatCurrency(totalsFiltered.recebido)}</td>
                <td className="py-2.5 px-2 text-right text-amber-900">{formatCurrency(totalsFiltered.saldo)}</td>
                <td colSpan={5} />
              </tr>
            </tfoot>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-200 bg-gray-50/60 flex items-center justify-between text-xs">
            <span>Página {currentPage} / {totalPages}</span>
            <div className="flex gap-1.5">
              <button type="button" disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border rounded-lg disabled:opacity-40 cursor-pointer flex items-center gap-1">
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-white border rounded-lg disabled:opacity-40 cursor-pointer flex items-center gap-1">
                Próxima <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <SettleModal
        isOpen={!!settleSaleModal}
        sale={settleSaleModal}
        target={settleTarget}
        onClose={() => setSettleSaleModal(null)}
        onSettled={() => {
          loadData();
          showNotification(settleTarget === 'producer' ? 'Repasse registrado!' : 'Recebimento registrado!');
        }}
      />

      {previewProof && (
        <PaymentProofPreviewModal
          filename={previewProof}
          onClose={() => setPreviewProof(null)}
        />
      )}
    </div>
  );
}
