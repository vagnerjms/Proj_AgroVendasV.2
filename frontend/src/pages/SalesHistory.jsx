import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Printer, 
  Edit, 
  Trash2, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Settings,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { formatCurrency, formatDate, formatKg, formatNumber, getCleanFileName } from '../utils/formatters';
import ContractModal from '../components/ContractModal';
import { api } from '../services/api';
import { calculateLiquidation, getValorTotalVP } from '../utils/calculations';
import { resolveRomaneioNumber, nfDisplayLabel, quantityOf, formatQuantity, resolveProductUnit } from '../utils/dataHelpers';
import { DATA_LABELS } from '../constants/dataLabels';
import SaleDetailModal from '../components/sales/SaleDetailModal';
import SaleEditModal from '../components/sales/SaleEditModal';
import MultiStoreSelect from '../components/reports/MultiStoreSelect';
import MultiProductSelect from '../components/reports/MultiProductSelect';

const DEFAULT_COLUMNS = {
  id: true,
  romaneioNumber: true,
  saleDate: true,
  nfeDate: true,
  client: true,
  totalKg: true,
  quantity: true,
  valorTotalVP: true,
  totalOperation: true,
  net: true,
  status: true,
  actions: true
};

const COLUMN_DEFINITIONS = [
  { id: 'id', label: DATA_LABELS.vpNumber },
  { id: 'romaneioNumber', label: DATA_LABELS.romaneioNumber },
  { id: 'saleDate', label: 'Data da VP' },
  { id: 'nfeDate', label: 'Data da NF' },
  { id: 'client', label: 'Destinatário (Cliente)' },
  { id: 'totalKg', label: DATA_LABELS.weightKg },
  { id: 'quantity', label: DATA_LABELS.quantity },
  { id: 'valorTotalVP', label: DATA_LABELS.valorComercialVP },
  { id: 'totalOperation', label: DATA_LABELS.valorNF },
  { id: 'net', label: DATA_LABELS.saldoAReceber },
  { id: 'status', label: 'Status' },
  { id: 'actions', label: 'Ações' }
];

export default function SalesHistory({ setCurrentPage, onEditSale }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOperation, setSelectedOperation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [search, setSearch] = useState(() => {
    try {
      const saved = sessionStorage.getItem('agrovenda_filter_entity');
      if (saved) {
        sessionStorage.removeItem('agrovenda_filter_entity');
        return saved;
      }
    } catch (e) {}
    return '';
  });
  const [viewSale, setViewSale] = useState(null);
  const [contractSale, setContractSale] = useState(null);
  const [selectedStores, setSelectedStores] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const storesInitRef = useRef(false);
  const productsInitRef = useRef(false);

  // Persistent Sorting State
  const [sortField, setSortField] = useState(() => {
    try {
      return localStorage.getItem('agrovenda_sales_sort_field') || 'id';
    } catch {
      return 'id';
    }
  });

  const [sortDirection, setSortDirection] = useState(() => {
    try {
      return localStorage.getItem('agrovenda_sales_sort_direction') || 'asc';
    } catch {
      return 'asc';
    }
  });

  const handleSortChange = (field) => {
    let nextDir = 'asc';
    if (sortField === field) {
      nextDir = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      if (['saleDate', 'nfeDate', 'valorTotalVP', 'totalOperation', 'net'].includes(field)) {
        nextDir = 'desc';
      } else {
        nextDir = 'asc';
      }
    }
    setSortField(field);
    setSortDirection(nextDir);
    try {
      localStorage.setItem('agrovenda_sales_sort_field', field);
      localStorage.setItem('agrovenda_sales_sort_direction', nextDir);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectSort = (value) => {
    const [field, dir] = value.split('_');
    setSortField(field);
    setSortDirection(dir);
    try {
      localStorage.setItem('agrovenda_sales_sort_field', field);
      localStorage.setItem('agrovenda_sales_sort_direction', dir);
    } catch (e) {
      console.error(e);
    }
  };

  // Column Visibility State with Persistence
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('agrovenda_sales_visible_columns');
      if (saved) {
        return { ...DEFAULT_COLUMNS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_COLUMNS;
  });

  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const columnMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
        setShowColumnMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleColumn = (colId) => {
    setVisibleColumns((prev) => {
      const updated = { ...prev, [colId]: !prev[colId] };
      try {
        localStorage.setItem('agrovenda_sales_visible_columns', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const resetColumns = () => {
    setVisibleColumns(DEFAULT_COLUMNS);
    try {
      localStorage.setItem('agrovenda_sales_visible_columns', JSON.stringify(DEFAULT_COLUMNS));
    } catch (e) {
      console.error(e);
    }
  };

  const activeColumnCount = Object.values(visibleColumns).filter(Boolean).length || 1;

  // Edit Sale Modal State
  const [editingSale, setEditingSale] = useState(null);
  const [editForm, setEditForm] = useState({
    client: '',
    origin: '',
    destCity: '',
    destUF: '',
    notes: '',
    feeValue: 3.0,
    status: 'Faturado',
    paymentStatus: 'A Receber'
  });

  const [notification, setNotification] = useState('');
  const [errorNotification, setErrorNotification] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/sales', {
        operationType: selectedOperation,
        status: selectedStatus,
        search: search || undefined
      });
      if (Array.isArray(data)) {
        setSales(data);
      }
    } catch (err) {
      console.error('Erro ao carregar vendas:', err);
      showErrorNotification(err.message || 'Falha de conexão ao carregar vendas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [selectedOperation, selectedStatus]);

  const showNotification = (msg) => {
    setNotification(msg);
    setErrorNotification('');
    const timer = setTimeout(() => setNotification(''), 3500);
    return () => clearTimeout(timer);
  };

  const showErrorNotification = (msg) => {
    setErrorNotification(msg);
    setNotification('');
    const timer = setTimeout(() => setErrorNotification(''), 4500);
    return () => clearTimeout(timer);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSales();
  };

  const handleOpenEdit = (sale) => {
    setEditingSale(sale);
    setEditForm({
      client: sale.client,
      origin: sale.origin || '',
      destCity: sale.destCity || '',
      destUF: sale.destUF || '',
      notes: sale.notes || '',
      feeValue: sale.feeValue || 3.0,
      status: sale.status || 'Faturado',
      paymentStatus: sale.paymentStatus || 'A Receber'
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingSale || submittingEdit) return;
    setSubmittingEdit(true);
    try {
      await api.put(`/api/sales/${editingSale.id}`, editForm);
      showNotification(`Venda ${editingSale.id} atualizada com sucesso!`);
      setEditingSale(null);
      fetchSales();
    } catch (err) {
      console.error(err);
      showErrorNotification(err.message || 'Erro de conexão ao salvar alterações da venda.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteSale = async (sale) => {
    if (!window.confirm(`Tem certeza que deseja cancelar a venda ${sale.id} de ${sale.client}?`)) return;
    try {
      await api.post(`/api/sales/${sale.id}/cancel`);
      showNotification(`Venda ${sale.id} cancelada com sucesso.`);
      fetchSales();
    } catch (err) {
      console.error(err);
      showErrorNotification(err.message || 'Erro de rede ao tentar cancelar venda.');
    }
  };

  // Saldo a receber = VP comercial − já liquidado (via calculateLiquidation)
  const getNetReceivable = (sale) => {
    const liq = calculateLiquidation(sale);
    return liq.valorALiquidar;
  };

  // Sort logic with numerical, string and date support
  const sortedSales = [...sales].sort((a, b) => {
    if (sortField === 'id') {
      const numA = parseInt(String(a.id).replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.id).replace(/\D/g, ''), 10) || 0;
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    }

    if (sortField === 'saleDate') {
      const dateA = new Date(a.saleDate || 0).getTime();
      const dateB = new Date(b.saleDate || 0).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }

    if (sortField === 'nfeDate') {
      const dateA = new Date(a.nfeDate || a.saleDate || 0).getTime();
      const dateB = new Date(b.nfeDate || b.saleDate || 0).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }

    if (sortField === 'client') {
      const nameA = (a.client || '').toLowerCase();
      const nameB = (b.client || '').toLowerCase();
      return sortDirection === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    }

    if (sortField === 'totalKg') {
      const kgA = Number(a.totalKg) || 0;
      const kgB = Number(b.totalKg) || 0;
      return sortDirection === 'asc' ? kgA - kgB : kgB - kgA;
    }

    if (sortField === 'valorTotalVP') {
      const vpA = getValorTotalVP(a);
      const vpB = getValorTotalVP(b);
      return sortDirection === 'asc' ? vpA - vpB : vpB - vpA;
    }

    if (sortField === 'totalOperation') {
      const opA = Number(a.totalOperation) || 0;
      const opB = Number(b.totalOperation) || 0;
      return sortDirection === 'asc' ? opA - opB : opB - opA;
    }

    if (sortField === 'net') {
      const netA = getNetReceivable(a);
      const netB = getNetReceivable(b);
      return sortDirection === 'asc' ? netA - netB : netB - netA;
    }

    if (sortField === 'status') {
      const stA = (a.status || '').toLowerCase();
      const stB = (b.status || '').toLowerCase();
      return sortDirection === 'asc' ? stA.localeCompare(stB) : stB.localeCompare(stA);
    }

    return 0;
  });

  const extractProduct = (s) => {
    if (s.items?.[0]?.product) return s.items[0].product;
    const m = (s.notes || '').match(/(cenoura|cebola|batata|alho|tomate)/i);
    return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() : '';
  };

  const uniqueLojasForFilter = [...new Set(sales.map(s => s.client).filter(Boolean))].sort();
  const uniqueProductsForFilter = [...new Set(sales.map(extractProduct).filter(Boolean))].sort();

  useEffect(() => {
    if (!storesInitRef.current && uniqueLojasForFilter.length > 0) {
      setSelectedStores(uniqueLojasForFilter);
      storesInitRef.current = true;
    }
  }, [uniqueLojasForFilter]);

  useEffect(() => {
    if (!productsInitRef.current && uniqueProductsForFilter.length > 0) {
      setSelectedProducts(uniqueProductsForFilter);
      productsInitRef.current = true;
    }
  }, [uniqueProductsForFilter]);

  const displaySales = sortedSales.filter(s => {
    if (!includeCancelled && (s.status === 'Cancelada' || s.cancelled === true)) return false;
    if (storesInitRef.current) {
      if (selectedStores.length === 0) return false;
      if (!selectedStores.includes(s.client)) return false;
    }
    if (productsInitRef.current) {
      if (selectedProducts.length === 0) return false;
      if (!selectedProducts.includes(extractProduct(s))) return false;
    }
    if (search) {
      const term = search.toLowerCase();
      const nf = nfDisplayLabel(s).toLowerCase();
      const rom = resolveRomaneioNumber(s).toLowerCase();
      const match =
        (s.id || '').toLowerCase().includes(term) ||
        nf.includes(term) ||
        rom.includes(term) ||
        (s.client || '').toLowerCase().includes(term) ||
        (s.origin || '').toLowerCase().includes(term) ||
        extractProduct(s).toLowerCase().includes(term);
      if (!match) return false;
    }
    return true;
  });

  const totalSalesCount = sales.filter(s => includeCancelled || (s.status !== 'Cancelada' && !s.cancelled)).length;
  const renderSortIndicator = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-emerald-800 ml-1 font-extrabold" />
    ) : (
      <ArrowDown className="w-3 h-3 text-emerald-800 ml-1 font-extrabold" />
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1700px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#091b2e] tracking-wider uppercase">
            <span className="hover:underline cursor-pointer" onClick={() => setCurrentPage('dashboard')}>INICIO</span> / HISTÓRICO DE VENDAS
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
            Histórico & Rastreio de Vendas / VP
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Discriminação de Valor Comercial (VP), NF, FUNRURAL e saldo a liquidar. Baixas no Fiscal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => alert('Exportando relatório consolidado de vendas e comissões para Excel/CSV...')}
            className="hidden sm:flex bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Excel
          </button>

          <button
            onClick={() => setCurrentPage('new-sale')}
            className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Venda / VP
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {errorNotification && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorNotification}</span>
        </div>
      )}

      {/* Filter and Search Bar with Persistent Sorting Control */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[280px] relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por código VP, cliente destinatário, nota fiscal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#091b2e]"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Ordenação Persistente */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 shadow-sm">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#091b2e] shrink-0" />
            <span className="text-[11px] font-bold text-gray-700">Ordem:</span>
            <select
              value={`${sortField}_${sortDirection}`}
              onChange={(e) => handleSelectSort(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
            >
              <option value="id_asc">Código VP (Crescente)</option>
              <option value="id_desc">Código VP (Decrescente)</option>
              <option value="saleDate_desc">Data da VP (Mais Recente Primeiro)</option>
              <option value="saleDate_asc">Data da VP (Mais Antiga Primeiro)</option>
              <option value="nfeDate_desc">Data da NF (Mais Recente Primeiro)</option>
              <option value="nfeDate_asc">Data da NF (Mais Antiga Primeiro)</option>
              <option value="client_asc">Cliente (A → Z)</option>
              <option value="client_desc">Cliente (Z → A)</option>
              <option value="valorTotalVP_desc">Valor Total Comercial (Maior → Menor)</option>
              <option value="valorTotalVP_asc">Valor Total Comercial (Menor → Maior)</option>
              <option value="totalOperation_desc">Valor Total NF (Maior → Menor)</option>
              <option value="totalOperation_asc">Valor Total NF (Menor → Maior)</option>
              <option value="net_desc">{DATA_LABELS.saldoAReceber} (Maior → Menor)</option>
              <option value="totalKg_desc">Peso Total (kg) (Maior → Menor)</option>
              <option value="status_asc">Status da Operação</option>
            </select>
          </div>

          <select
            value={selectedOperation}
            onChange={(e) => setSelectedOperation(e.target.value)}
            className="bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 outline-none font-medium text-gray-700"
          >
            <option value="all">Todos os Tipos de Operação</option>
            <option value="Intermediação (Corretagem / Comissão)">Intermediação / Corretagem</option>
            <option value="Venda Particular / Repasse Direto">Venda Particular / VP</option>
            <option value="Revenda Padrão (Compra e Venda)">Revenda Padrão</option>
            <option value="Venda de Estoque Próprio">Estoque Próprio</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 outline-none font-medium text-gray-700"
          >
            <option value="all">Todos os Status</option>
            <option value="Faturado">Faturado</option>
            <option value="Pendente NF">Pendente NF</option>
            <option value="Concluído">Concluído</option>
            <option value="Cancelada">Cancelada</option>
          </select>

          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg px-3 py-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeCancelled}
              onChange={(e) => setIncludeCancelled(e.target.checked)}
              className="w-3.5 h-3.5 text-[#F97316] accent-[#F97316] rounded border-gray-300 cursor-pointer"
            />
            <span>{DATA_LABELS.includeCancelled}</span>
          </label>

          <MultiStoreSelect
            stores={uniqueLojasForFilter}
            selectedStores={selectedStores}
            onChange={setSelectedStores}
          />

          <MultiProductSelect
            products={uniqueProductsForFilter}
            selectedProducts={selectedProducts}
            onChange={setSelectedProducts}
          />

          {/* Botão de Engrenagem / Seletor de Colunas Visíveis */}
          <div className="relative" ref={columnMenuRef}>
            <button
              type="button"
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className={`px-3 py-2 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                showColumnMenu 
                  ? 'bg-amber-50 border-[#F97316] text-[#F97316] ring-2 ring-[#F97316]/20' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              title="Configurar colunas exibidas na tabela"
            >
              <Settings className={`w-3.5 h-3.5 ${showColumnMenu ? 'text-[#F97316]' : 'text-gray-500'}`} />
              <span className="hidden sm:inline">Colunas</span>
            </button>

            {/* Menu Popover das Colunas */}
            {showColumnMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-3 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800">
                    <Settings className="w-3.5 h-3.5 text-[#F97316]" />
                    <span>Exibir Colunas</span>
                  </div>
                  <button
                    type="button"
                    onClick={resetColumns}
                    className="text-[10px] text-[#F97316] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    title="Restaurar visualização original de todas as colunas"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Restaurar
                  </button>
                </div>
                
                <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                  {COLUMN_DEFINITIONS.map((col) => {
                    const isChecked = !!visibleColumns[col.id];
                    return (
                      <label
                        key={col.id}
                        className="flex items-center justify-between px-2.5 py-1.5 hover:bg-amber-50/50 rounded-lg cursor-pointer select-none transition-colors group"
                      >
                        <span className={`text-xs ${isChecked ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                          {col.label}
                        </span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleColumn(col.id)}
                          className="w-4 h-4 text-[#F97316] accent-[#F97316] rounded border-gray-300 focus:ring-[#F97316] cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
                
                <div className="pt-2 mt-2 border-t border-gray-100 text-[10px] text-gray-400 text-center">
                  Preferências salvas automaticamente
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 font-medium px-1">
        Exibindo <strong className="text-gray-800">{displaySales.length}</strong> de <strong className="text-gray-800">{totalSalesCount}</strong> vendas
      </div>
      {/* Sales Table with Clickable Sortable Headers */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                {visibleColumns.id && (
                  <th 
                    onClick={() => handleSortChange('id')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-gray-100/80 group transition-colors"
                    title="Clique para ordenar por Nº VP"
                  >
                    <div className="flex items-center">
                      <span>{DATA_LABELS.vpNumber}</span>
                      {renderSortIndicator('id')}
                    </div>
                  </th>
                )}

                {visibleColumns.romaneioNumber && (
                  <th className="py-3.5 px-4">
                    <span>{DATA_LABELS.romaneioNumber}</span>
                  </th>
                )}

                {visibleColumns.saleDate && (
                  <th 
                    onClick={() => handleSortChange('saleDate')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-gray-100/80 group transition-colors"
                    title="Clique para ordenar por Data da VP"
                  >
                    <div className="flex items-center">
                      <span>Data da VP</span>
                      {renderSortIndicator('saleDate')}
                    </div>
                  </th>
                )}

                {visibleColumns.nfeDate && (
                  <th 
                    onClick={() => handleSortChange('nfeDate')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-gray-100/80 group transition-colors"
                    title="Clique para ordenar por Data da NF"
                  >
                    <div className="flex items-center">
                      <span>Data da NF</span>
                      {renderSortIndicator('nfeDate')}
                    </div>
                  </th>
                )}

                {visibleColumns.client && (
                  <th 
                    onClick={() => handleSortChange('client')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-gray-100/80 group transition-colors"
                    title="Clique para ordenar por Destinatário"
                  >
                    <div className="flex items-center">
                      <span>Destinatário (Cliente)</span>
                      {renderSortIndicator('client')}
                    </div>
                  </th>
                )}

                {visibleColumns.totalKg && (
                  <th 
                    onClick={() => handleSortChange('totalKg')}
                    className="py-3.5 px-4 text-right cursor-pointer select-none hover:bg-gray-100/80 group transition-colors"
                    title={`Clique para ordenar por ${DATA_LABELS.weightKg}`}
                  >
                    <div className="flex items-center justify-end">
                      <span>{DATA_LABELS.weightKg}</span>
                      {renderSortIndicator('totalKg')}
                    </div>
                  </th>
                )}

                {visibleColumns.quantity && (
                  <th
                    className="py-3.5 px-4 text-right"
                    title={DATA_LABELS.quantity}
                  >
                    <div className="flex items-center justify-end">
                      <span>{DATA_LABELS.quantity}</span>
                    </div>
                  </th>
                )}

                {visibleColumns.valorTotalVP && (
                  <th 
                    onClick={() => handleSortChange('valorTotalVP')}
                    className="py-3.5 px-4 text-right cursor-pointer select-none hover:bg-gray-100/80 group transition-colors text-blue-950 font-bold bg-blue-50/30"
                    title="Clique para ordenar por Valor Total Comercial"
                  >
                    <div className="flex items-center justify-end">
                      <span>Valor Total Comercial</span>
                      {renderSortIndicator('valorTotalVP')}
                    </div>
                  </th>
                )}

                {visibleColumns.totalOperation && (
                  <th 
                    onClick={() => handleSortChange('totalOperation')}
                    className="py-3.5 px-4 text-right bg-gray-50/50 cursor-pointer select-none hover:bg-gray-100/80 group transition-colors"
                    title="Clique para ordenar por Valor Total da NF"
                  >
                    <div className="flex items-center justify-end">
                      <span>Valor Total da NF</span>
                      {renderSortIndicator('totalOperation')}
                    </div>
                  </th>
                )}

                {visibleColumns.net && (
                  <th 
                    onClick={() => handleSortChange('net')}
                    className="py-3.5 px-4 text-right font-bold text-gray-900 bg-emerald-50/30 cursor-pointer select-none hover:bg-emerald-100/50 group transition-colors"
                    title={`Clique para ordenar por ${DATA_LABELS.saldoAReceber}`}
                  >
                    <div className="flex items-center justify-end">
                      <span>{DATA_LABELS.saldoAReceber}</span>
                      {renderSortIndicator('net')}
                    </div>
                  </th>
                )}

                {visibleColumns.status && (
                  <th 
                    onClick={() => handleSortChange('status')}
                    className="py-3.5 px-4 text-center cursor-pointer select-none hover:bg-gray-100/80 group transition-colors"
                    title="Clique para ordenar por Status"
                  >
                    <div className="flex items-center justify-center">
                      <span>Status</span>
                      {renderSortIndicator('status')}
                    </div>
                  </th>
                )}

                {visibleColumns.actions && (
                  <th className="py-3.5 px-4 text-center">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={activeColumnCount} className="py-12 text-center text-gray-400">
                    Carregando negociações...
                  </td>
                </tr>
              ) : displaySales.length === 0 ? (
                <tr>
                  <td colSpan={activeColumnCount} className="py-12 text-center text-gray-400">
                    Nenhuma venda encontrada para os critérios selecionados.
                  </td>
                </tr>
              ) : (
                displaySales.map((sale) => {
                  const net = getNetReceivable(sale);
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50/80 transition-colors">
                      {visibleColumns.id && (
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900 font-mono">{sale.id}</div>
                          <div className="text-gray-400 text-[11px] truncate max-w-[160px]" title={nfDisplayLabel(sale)}>
                            {nfDisplayLabel(sale)}
                          </div>
                        </td>
                      )}

                      {visibleColumns.romaneioNumber && (
                        <td className="py-3 px-4 font-mono text-gray-700">
                          {resolveRomaneioNumber(sale) || '—'}
                        </td>
                      )}

                      {visibleColumns.saleDate && (
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-800">{formatDate(sale.saleDate)}</div>
                          <div className="text-gray-400 text-[10px]">
                            {sale.dueDate ? `Venc: ${formatDate(sale.dueDate)}` : (sale.notes?.includes('Vencimento') ? sale.notes.split('Vencimento:')[1]?.split('.')[0] : '')}
                          </div>
                        </td>
                      )}

                      {visibleColumns.nfeDate && (
                        <td className="py-3 px-4">
                          {sale.nfFile || sale.nfeKey || sale.nfeDate ? (
                            <>
                              <div className="font-semibold text-gray-800">
                                {formatDate(sale.nfeDate || sale.saleDate)}
                              </div>
                              <div className="text-emerald-700 font-mono text-[10px] truncate max-w-[160px]" title={getCleanFileName(sale.nfFile)}>
                                {sale.nfFile ? getCleanFileName(sale.nfFile).replace('.pdf', '') : (sale.nfeKey ? `...${sale.nfeKey.slice(-6)}` : 'Emitida')}
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-400 text-[11px] font-medium">Pendente NF</span>
                          )}
                        </td>
                      )}

                      {visibleColumns.client && (
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900 truncate max-w-[200px]" title={sale.client}>
                            {sale.client}
                          </div>
                          <div className="text-gray-500 text-[11px] flex flex-wrap gap-1 mt-0.5">
                            {sale.items && sale.items.length > 1 ? (
                              <span className="bg-emerald-50 text-emerald-900 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                                {sale.items.length} produtos ({sale.items.map(it => it.product).join(' + ')})
                              </span>
                            ) : (
                              <span>{sale.items?.[0]?.product || 'Cenoura'}</span>
                            )}
                          </div>
                        </td>
                      )}

                      {visibleColumns.totalKg && (
                        <td className="py-3 px-4 text-right">
                          <div className="font-bold text-gray-900">{formatNumber(sale.totalKg, 0)} kg</div>
                        </td>
                      )}

                      {visibleColumns.quantity && (
                        <td className="py-3 px-4 text-right">
                          <div className="font-bold text-gray-900">
                            {formatQuantity(quantityOf(sale), resolveProductUnit(sale))}
                          </div>
                        </td>
                      )}

                      {/* Valor Total de VP */}
                      {visibleColumns.valorTotalVP && (
                        <td className="py-3 px-4 text-right font-extrabold text-blue-950 bg-blue-50/10">
                          {formatCurrency(getValorTotalVP(sale))}
                          <span className="block text-[10px] text-gray-400 font-normal">Base Comercial</span>
                        </td>
                      )}

                      {/* Valor Total da NF */}
                      {visibleColumns.totalOperation && (
                        <td className="py-3 px-4 text-right font-bold text-gray-900 bg-gray-50/40">
                          {formatCurrency(sale.totalOperation)}
                        </td>
                      )}

                      {/* SALDO A RECEBER */}
                      {visibleColumns.net && (() => {
                        const liq = calculateLiquidation(sale);
                        return (
                          <td className="py-3 px-4 text-right font-extrabold text-emerald-950 bg-emerald-50/30">
                            {formatCurrency(liq.valorALiquidar)}
                            {liq.valorLiquidado > 0 && (
                              <span className="block text-[10px] text-emerald-700 font-normal">
                                Pago: {formatCurrency(liq.valorLiquidado)}
                              </span>
                            )}
                          </td>
                        );
                      })()}

                      {visibleColumns.status && (
                        <td className="py-3 px-4 text-center">
                          {(() => {
                            if (sale.status === 'Cancelada' || sale.cancelled) {
                              return (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700">
                                  Cancelada
                                </span>
                              );
                            }
                            const hasNf = !!(sale.nfFile && sale.nfFile.trim());
                            const liq = calculateLiquidation(sale);

                            let badgeColor = 'bg-amber-100 text-amber-900 border border-amber-200';
                            let label = 'A Receber';

                            if (liq.isFullySettled) {
                              badgeColor = 'bg-emerald-100 text-emerald-800';
                              label = 'Recebido';
                            } else if (liq.isPartial) {
                              badgeColor = 'bg-blue-100 text-blue-900 border border-blue-200';
                              label = `Parcial (${liq.percentPaid.toFixed(0)}%)`;
                            } else if (!hasNf) {
                              badgeColor = 'bg-amber-100 text-amber-800';
                              label = 'Pendente NF';
                            }

                            return (
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
                                {label}
                              </span>
                            );
                          })()}
                        </td>
                      )}

                      {visibleColumns.actions && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Ver detalhes */}
                            <button
                              onClick={() => setViewSale(sale)}
                              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-1.5 rounded transition-colors cursor-pointer"
                              title="Ver detalhes da negociação / Rastreio VP"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Imprimir Contrato Agrícola */}
                            <button
                              onClick={() => setContractSale(sale)}
                              className="text-blue-700 hover:bg-blue-50 p-1.5 rounded transition-colors cursor-pointer"
                              title="Imprimir Contrato Agrícola / Confirmação de Negócio"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Editar - Abre o Formulário Completo */}
                            <button
                              onClick={() => onEditSale ? onEditSale(sale) : handleOpenEdit(sale)}
                              className="text-emerald-700 hover:bg-emerald-50 p-1.5 rounded transition-colors cursor-pointer"
                              title="Editar todos os dados da venda no formulário completo"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Baixar no Fiscal */}
                            {!calculateLiquidation(sale).isFullySettled && (
                              <button
                                onClick={() => setCurrentPage?.('financial')}
                                className="text-emerald-700 hover:bg-emerald-50 p-1.5 rounded transition-colors cursor-pointer"
                                title="Baixas de recebimento são feitas no Fiscal"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Cancelar */}
                            <button
                              onClick={() => handleDeleteSale(sale)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors cursor-pointer"
                              title="Cancelar venda"
                              disabled={sale.status === 'Cancelada'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Detalhes da Venda e Rastreio (Modular) */}
      <SaleDetailModal
        viewSale={viewSale}
        onClose={() => setViewSale(null)}
        onOpenContract={(sale) => {
          setContractSale(sale);
          setViewSale(null);
        }}
        onOpenSettle={() => {
          setViewSale(null);
          setCurrentPage?.('financial');
        }}
        getValorTotalVP={getValorTotalVP}
      />

      {/* Modal: Editar Venda (Modular) */}
      <SaleEditModal
        editingSale={editingSale}
        editForm={editForm}
        setEditForm={setEditForm}
        onClose={() => setEditingSale(null)}
        onSaveEdit={handleSaveEdit}
        submittingEdit={submittingEdit}
      />

      {/* Contract Print Modal */}
      {contractSale && (
        <ContractModal
          sale={contractSale}
          onClose={() => setContractSale(null)}
        />
      )}
    </div>
  );
}
