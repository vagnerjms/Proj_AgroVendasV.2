import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  FileSpreadsheet, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  Coins,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  X
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { api } from '../services/api';
import { calculateLiquidation } from '../utils/calculations';

export default function Financial({ view = 'overview' }) {
  const [sales, setSales] = useState([]);
  const [financial, setFinancial] = useState({
    totalAReceber: 0.00,
    totalAReceberNF: 0.00,
    totalAReceberVP: 0.00,
    totalAPagar: 0.00,
    totalRecebido: 0.00,
    vencidos: 0.00,
    totalFunrural: 0.00,
    totalPrevidencia: 0.00,
    totalRat: 0.00,
    totalSenar: 0.00,
    totalComissao: 0.00,
    totalLiquidoProdutor: 0.00,
    salesCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

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

  useEffect(() => {
    loadData();
  }, []);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      // Status filter
      if (statusFilter === 'RECEIVED' && s.paymentStatus !== 'Recebido') return false;
      if (statusFilter === 'PENDING' && s.paymentStatus === 'Recebido') return false;

      // Search term filter
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const idMatch = (s.id || '').toLowerCase().includes(term);
      const clientMatch = (s.client || '').toLowerCase().includes(term);
      const docMatch = (s.clientDocument || '').toLowerCase().includes(term);
      const originMatch = (s.origin || '').toLowerCase().includes(term);
      const statusMatch = (s.paymentStatus || '').toLowerCase().includes(term);
      return idMatch || clientMatch || docMatch || originMatch || statusMatch;
    });
  }, [sales, statusFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSales = filteredSales.slice(startIndex, startIndex + pageSize);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <div className="text-xs font-bold text-[#091b2e] uppercase">INICIO / FINANCEIRO & FISCAL</div>
        <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
          {view === 'funrural' ? 'Apuração e Retenção de FUNRURAL' : 'Contas, Cobrança e Fluxo Financeiro'}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Posição financeira consolidada em tempo real da base de dados do MongoDB ({financial.salesCount || sales.length} vendas cadastradas).
        </p>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-blue-200 bg-blue-50/20 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-blue-800 text-xs font-bold uppercase">
            <span className="truncate">Total Comercial (VP)</span>
            <ArrowUpRight className="w-4 h-4 text-[#df7b1b] shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-blue-950 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(financial.totalComercialVP || financial.totalAReceberVP)}>
            {formatCurrency(financial.totalComercialVP || financial.totalAReceberVP)}
          </div>
          <span className="text-[11px] text-blue-600 block font-medium truncate">Base de cotação / caixas</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-4.5 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
            <span className="truncate">(-) FUNRURAL (1,63% s/ NF)</span>
            <ShieldCheck className="w-4 h-4 text-red-600 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-red-600 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={`- ${formatCurrency(financial.totalFunrural)}`}>
            - {formatCurrency(financial.totalFunrural)}
          </div>
          <span className="text-[11px] text-gray-400 block font-medium truncate">Dedução apurada s/ Nota</span>
        </div>

        <div className="bg-white rounded-xl border-2 border-emerald-500 bg-emerald-50/40 p-4 sm:p-4.5 shadow-md space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-emerald-900 text-xs font-black uppercase">
            <span className="truncate">(=) Valor a Liquidar</span>
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-emerald-950 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(financial.totalALiquidar || financial.totalAReceber || ((financial.totalComercialVP || financial.totalAReceberVP) - financial.totalFunrural))}>
            {formatCurrency(financial.totalALiquidar || financial.totalAReceber || ((financial.totalComercialVP || financial.totalAReceberVP) - financial.totalFunrural))}
          </div>
          <span className="text-[11px] text-emerald-800 block font-bold truncate">Total Comercial - FUNRURAL</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-4.5 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
            <span className="truncate">Total Faturado (NF)</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-gray-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(financial.totalFaturadoNF || financial.totalAReceberNF)}>
            {formatCurrency(financial.totalFaturadoNF || financial.totalAReceberNF)}
          </div>
          <span className="text-[11px] text-gray-400 block font-medium truncate">Líquido NF: {formatCurrency(financial.liquidoNF || ((financial.totalFaturadoNF || financial.totalAReceberNF) - financial.totalFunrural))}</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-4.5 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
            <span className="truncate">Total a Pagar</span>
            <ArrowDownRight className="w-4 h-4 text-red-600 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-gray-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(financial.totalAPagar)}>
            {formatCurrency(financial.totalAPagar)}
          </div>
          <span className="text-[11px] text-gray-400 block font-medium truncate">Compras de produtores</span>
        </div>
      </div>

      {/* Funrural Detail breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Detalhamento de Alíquotas FUNRURAL (Sobre Comercialização de Produção - 1,63%)
          </h2>
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            Retenção Oficial Total: {formatCurrency(financial.totalFunrural)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-100">
            <span className="text-gray-500 block font-semibold">Previdência Social (1,20%)</span>
            <span className="text-lg font-bold text-gray-900 mt-1 block">
              {formatCurrency(financial.totalPrevidencia)}
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5 block">Contribuição previdenciária</span>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-100">
            <span className="text-gray-500 block font-semibold">RAT / GILRAT (0,10%)</span>
            <span className="text-lg font-bold text-gray-900 mt-1 block">
              {formatCurrency(financial.totalRat)}
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5 block">Riscos ambientais do trabalho</span>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-100">
            <span className="text-gray-500 block font-semibold">SENAR (0,33%)</span>
            <span className="text-lg font-bold text-gray-900 mt-1 block">
              {formatCurrency(financial.totalSenar)}
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5 block">Fundo de capacitação rural</span>
          </div>
        </div>
      </div>

      {/* Receivables Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header & Controls Bar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Títulos e Notas Vinculadas</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Exibindo {filteredSales.length === 0 ? 0 : startIndex + 1} a {Math.min(startIndex + pageSize, filteredSales.length)} de {filteredSales.length} registros
                {filteredSales.length !== sales.length && ` (filtrado de ${sales.length} vendas)`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
                {sales.length} no banco
              </span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar por código VP, cliente ou documento..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#091b2e] focus:border-transparent outline-none transition-all shadow-2xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filters & Page Size */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs">
                <button
                  type="button"
                  onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    statusFilter === 'ALL'
                      ? 'bg-white text-gray-900 shadow-2xs font-bold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('PENDING'); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    statusFilter === 'PENDING'
                      ? 'bg-amber-100 text-amber-900 shadow-2xs font-bold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  A Receber
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('RECEIVED'); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    statusFilter === 'RECEIVED'
                      ? 'bg-emerald-100 text-emerald-900 shadow-2xs font-bold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Recebidos
                </button>
              </div>

              {/* Page Size Selector */}
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span className="hidden sm:inline">Exibir:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-gray-200 text-xs rounded-lg px-2 py-1 font-semibold text-gray-700 outline-none shadow-2xs cursor-pointer"
                >
                  <option value={15}>15 por pág.</option>
                  <option value={30}>30 por pág.</option>
                  <option value={50}>50 por pág.</option>
                  <option value={100}>100 por pág.</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#091b2e] text-white font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Operação</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4 text-right">Comercial (VP)</th>
                <th className="py-3 px-4 text-right">Valor Bruto (NF)</th>
                <th className="py-3 px-4 text-right">FUNRURAL (NF)</th>
                <th className="py-3 px-4 text-right text-emerald-300">Valor a Liquidar</th>
                <th className="py-3 px-4 text-right">Comissão (3%)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[#091b2e] border-t-transparent rounded-full animate-spin" />
                      <span>Carregando dados financeiros...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 italic">
                    Nenhum título ou registro financeiro encontrado para os critérios pesquisados.
                  </td>
                </tr>
              ) : (
                paginatedSales.map(s => {
                  const liq = calculateLiquidation(s);
                  const vp = liq.valorVP;
                  const funrural = liq.funrural;
                  const aLiquidar = liq.totalLiquido;

                  return (
                    <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {s.id} 
                        <span className="block font-normal text-gray-400 text-[11px]">{formatDate(s.saleDate)}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-800">{s.client}</td>
                      <td className="py-3 px-4 text-right font-bold text-blue-950">{formatCurrency(vp)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-700">{formatCurrency(s.totalOperation)}</td>
                      <td className="py-3 px-4 text-right text-red-600 font-medium">-{formatCurrency(funrural)}</td>
                      <td className="py-3 px-4 text-right font-black text-emerald-950 bg-emerald-50/30">{formatCurrency(aLiquidar)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-blue-900">{formatCurrency(s.totalCommission)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          s.paymentStatus === 'Recebido' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {s.paymentStatus || 'A Receber'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-200 bg-gray-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-gray-500 font-medium">
              Página <span className="font-bold text-gray-900">{currentPage}</span> de <span className="font-bold text-gray-900">{totalPages}</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <React.Fragment key={page}>
                        {prev && page - prev > 1 && <span className="text-gray-400 px-1">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentPage === page
                              ? 'bg-[#091b2e] text-white shadow-2xs'
                              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
              >
                <span>Próxima</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
