import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Eye,
  X,
  Printer,
  DollarSign,
  Edit,
  Trash2,
  TrendingUp,
  Receipt,
  FileCheck2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { formatCurrency, formatDate, formatKg, formatNumber } from '../utils/formatters';
import ContractModal from '../components/ContractModal';

export default function SalesHistory({ setCurrentPage, onEditSale }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOperation, setSelectedOperation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [viewSale, setViewSale] = useState(null);
  const [contractSale, setContractSale] = useState(null);

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
      if (['saleDate', 'totalOperation', 'net', 'feeValue'].includes(field)) {
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

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedOperation !== 'all') params.append('operationType', selectedOperation);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (search) params.append('search', search);

      const res = await fetch(`/api/sales?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSales(data);
      }
    } catch (err) {
      console.error('Erro ao carregar vendas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [selectedOperation, selectedStatus]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
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
    if (!editingSale) return;
    try {
      const res = await fetch(`/api/sales/${editingSale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        showNotification(`Venda ${editingSale.id} atualizada com sucesso!`);
        setEditingSale(null);
        fetchSales();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSale = async (sale) => {
    if (!window.confirm(`Tem certeza que deseja cancelar e excluir a venda ${sale.id} de ${sale.client}?`)) return;
    try {
      const res = await fetch(`/api/sales/${sale.id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification(`Venda ${sale.id} excluída com sucesso.`);
        fetchSales();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSettle = async (saleId) => {
    if (!window.confirm(`Deseja registrar o recebimento e liquidação integral da venda ${saleId}?`)) return;
    try {
      const res = await fetch(`/api/sales/${saleId}/settle`, { method: 'POST' });
      if (res.ok) {
        showNotification(`Venda ${saleId} liquidada com sucesso!`);
        fetchSales();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper calculation for Líquido a Receber (Valor NF - Funrural)
  const getNetReceivable = (sale) => {
    const nfTotal = Number(sale.totalOperation) || 0;
    const funrural = Number(sale.funruralTotal) || (nfTotal * 0.0163);
    return Math.max(0, nfTotal - funrural);
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

    if (sortField === 'feeValue') {
      const comA = (Number(a.totalOperation) || 0) * ((Number(a.feeValue) || 3) / 100);
      const comB = (Number(b.totalOperation) || 0) * ((Number(b.feeValue) || 3) / 100);
      return sortDirection === 'asc' ? comA - comB : comB - comA;
    }

    if (sortField === 'status') {
      const stA = (a.status || '').toLowerCase();
      const stB = (b.status || '').toLowerCase();
      return sortDirection === 'asc' ? stA.localeCompare(stB) : stB.localeCompare(stA);
    }

    return 0;
  });

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
          <div className="text-xs font-semibold text-[#173e27] tracking-wider uppercase">
            <span className="hover:underline cursor-pointer" onClick={() => setCurrentPage('dashboard')}>INICIO</span> / HISTÓRICO DE VENDAS
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
            Histórico & Rastreio de Vendas / VP
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Discriminação de Valor de NF, Dedução do FUNRURAL (1,63%), Líquido a Receber, Cotação do Dia e Comissão (3%).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => alert('Exportando relatório consolidado de vendas e comissões para Excel/CSV...')}
            className="hidden sm:flex bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Excel
          </button>

          <button
            onClick={() => setCurrentPage('new-sale')}
            className="bg-[#173e27] hover:bg-[#1f5435] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Venda / VP
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
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
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1d5a37]"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Ordenação Persistente */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 shadow-sm">
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="text-[11px] font-bold text-gray-700">Ordem:</span>
            <select
              value={`${sortField}_${sortDirection}`}
              onChange={(e) => handleSelectSort(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
            >
              <option value="id_asc">Código VP (Crescente: VP001 → VP034)</option>
              <option value="id_desc">Código VP (Decrescente: VP034 → VP001)</option>
              <option value="saleDate_desc">Data (Mais Recente Primeiro)</option>
              <option value="saleDate_asc">Data (Mais Antiga Primeiro)</option>
              <option value="client_asc">Cliente (A → Z)</option>
              <option value="client_desc">Cliente (Z → A)</option>
              <option value="totalOperation_desc">Valor Total NF (Maior → Menor)</option>
              <option value="totalOperation_asc">Valor Total NF (Menor → Maior)</option>
              <option value="net_desc">Líquido a Receber (Maior → Menor)</option>
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
          </select>
        </div>
      </div>

      {/* Sales Table with Clickable Sortable Headers */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th 
                  onClick={() => handleSortChange('id')}
                  className="py-3.5 px-4 cursor-pointer select-none hover:bg-gray-100/80 group transition-colors"
                  title="Clique para ordenar por Código VP"
                >
                  <div className="flex items-center">
                    <span>Cód VP / NF</span>
                    {renderSortIndicator('id')}
                  </div>
                </th>

                <th 
                  onClick={() => handleSortChange('saleDate')}
                  className="py-3.5 px-4 cursor-pointer select-none hover:bg-gray-100/80 group transition-colors"
                  title="Clique para ordenar por Data"
                >
                  <div className="flex items-center">
                    <span>Data VP / NF</span>
                    {renderSortIndicator('saleDate')}
                  </div>
                </th>

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

                <th 
                  onClick={() => handleSortChange('totalKg')}
                  className="py-3.5 px-4 text-right cursor-pointer select-none hover:bg-gray-100/80 group transition-colors"
                  title="Clique para ordenar por Peso"
                >
                  <div className="flex items-center justify-end">
                    <span>Peso (kg) / Caixas</span>
                    {renderSortIndicator('totalKg')}
                  </div>
                </th>

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

                <th className="py-3.5 px-4 text-right text-red-600 bg-red-50/30">
                  (-) FUNRURAL (1,63%)
                </th>

                <th 
                  onClick={() => handleSortChange('net')}
                  className="py-3.5 px-4 text-right font-bold text-gray-900 bg-emerald-50/30 cursor-pointer select-none hover:bg-emerald-100/50 group transition-colors"
                  title="Clique para ordenar por Líquido a Receber"
                >
                  <div className="flex items-center justify-end">
                    <span>(=) Líquido a Receber</span>
                    {renderSortIndicator('net')}
                  </div>
                </th>

                <th 
                  onClick={() => handleSortChange('feeValue')}
                  className="py-3.5 px-4 text-right text-emerald-800 cursor-pointer select-none hover:bg-gray-100/80 group transition-colors"
                  title="Clique para ordenar por Comissão"
                >
                  <div className="flex items-center justify-end">
                    <span>Comissão (3%)</span>
                    {renderSortIndicator('feeValue')}
                  </div>
                </th>

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

                <th className="py-3.5 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    Carregando negociações...
                  </td>
                </tr>
              ) : sortedSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    Nenhuma venda encontrada para os critérios selecionados.
                  </td>
                </tr>
              ) : (
                sortedSales.map((sale) => {
                  const net = getNetReceivable(sale);
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 font-mono">{sale.id}</div>
                        <div className="text-gray-400 text-[11px]">
                          {sale.nfFile ? sale.nfFile.replace('.pdf', '') : 'Pendente NF'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-800">{formatDate(sale.saleDate)}</div>
                        <div className="text-gray-400 text-[10px]">
                          {sale.notes?.includes('Vencimento') ? sale.notes.split('Vencimento:')[1]?.split('.')[0] : ''}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900 truncate max-w-[200px]" title={sale.client}>
                          {sale.client}
                        </div>
                        <div className="text-gray-400 text-[11px]">
                          {sale.items?.[0]?.product || 'Cenoura'}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="font-bold text-gray-900">{formatNumber(sale.totalKg, 0)} kg</div>
                        <div className="text-gray-500 text-[11px]">
                          {formatNumber(sale.totalVolumes, 2)} cx (29kg)
                        </div>
                      </td>

                      {/* Valor Total da NF */}
                      <td className="py-3 px-4 text-right font-bold text-gray-900 bg-gray-50/40">
                        {formatCurrency(sale.totalOperation)}
                      </td>

                      {/* FUNRURAL DEDUZIDO DA NOTA */}
                      <td className="py-3 px-4 text-right font-medium text-red-600 bg-red-50/20">
                        -{formatCurrency(sale.funruralTotal)}
                      </td>

                      {/* LÍQUIDO A RECEBER (VALOR NF - FUNRURAL) */}
                      <td className="py-3 px-4 text-right font-extrabold text-emerald-950 bg-emerald-50/30">
                        {formatCurrency(net)}
                      </td>

                      {/* Comissão 3% */}
                      <td className="py-3 px-4 text-right font-bold text-emerald-800">
                        {formatCurrency(sale.totalCommission)}
                        <span className="block text-[10px] text-gray-400 font-normal">3,0%</span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          sale.paymentStatus === 'Recebido'
                            ? 'bg-emerald-100 text-emerald-800'
                            : (sale.status === 'Pendente NF' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800')
                        }`}>
                          {sale.paymentStatus === 'Recebido' ? 'Recebido' : (sale.status === 'Pendente NF' ? 'Pendente NF' : 'Em aberto')}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Ver detalhes */}
                          <button
                            onClick={() => setViewSale(sale)}
                            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-1.5 rounded transition-colors"
                            title="Ver detalhes da negociação / Rastreio VP"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Imprimir Contrato Agrícola */}
                          <button
                            onClick={() => setContractSale(sale)}
                            className="text-blue-700 hover:bg-blue-50 p-1.5 rounded transition-colors"
                            title="Imprimir Contrato Agrícola / Confirmação de Negócio"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Editar - Abre o Formulário Completo */}
                          <button
                            onClick={() => onEditSale ? onEditSale(sale) : handleOpenEdit(sale)}
                            className="text-emerald-700 hover:bg-emerald-50 p-1.5 rounded transition-colors"
                            title="Editar todos os dados da venda no formulário completo"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Liquidar */}
                          {sale.paymentStatus !== 'Recebido' && (
                            <button
                              onClick={() => handleSettle(sale.id)}
                              className="text-amber-700 hover:bg-amber-50 p-1.5 rounded transition-colors"
                              title="Dar baixa / Registrar recebimento"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Excluir */}
                          <button
                            onClick={() => handleDeleteSale(sale)}
                            className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                            title="Excluir negociação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Detalhes da Venda e Rastreio */}
      {viewSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  {viewSale.operationType}
                </span>
                <h3 className="text-lg font-bold text-gray-900">Rastreio & Detalhes da Venda {viewSale.id}</h3>
              </div>
              <button 
                onClick={() => setViewSale(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <span className="text-gray-500 block">Destinatário (Comprador):</span>
                <span className="font-bold text-gray-900 text-sm">{viewSale.client}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Remetente (Produtor):</span>
                <span className="font-semibold text-gray-900">{viewSale.origin || 'BRUNO PERES ROMEIRO'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Data da Operação (VP):</span>
                <span className="font-semibold text-gray-900">{formatDate(viewSale.saleDate)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Documento Fiscal:</span>
                <span className="font-semibold text-emerald-700 font-mono">{viewSale.nfFile || 'Pendente de emissão'}</span>
              </div>
            </div>

            {/* Itens e Pesos */}
            <div className="bg-white rounded-lg p-3 border border-gray-200 text-xs space-y-2">
              <div className="font-bold text-gray-800 flex items-center justify-between border-b border-gray-100 pb-2">
                <span>Produto: {viewSale.items?.[0]?.product || 'Cenoura (Caixa 29kg)'}</span>
                <span>{formatNumber(viewSale.totalKg, 0)} kg ({formatNumber(viewSale.totalVolumes, 2)} caixas)</span>
              </div>
              <div className="text-gray-600 text-[11px]">
                {viewSale.notes}
              </div>
            </div>

            {/* Breakdown Financeiro: NF vs FUNRURAL vs Líquido vs VP */}
            <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-200 space-y-2.5 text-xs">
              <span className="text-xs font-bold text-[#173e27] uppercase tracking-wider block border-b border-emerald-200 pb-1">
                Demonstrativo Financeiro & Dedução Fiscal:
              </span>

              <div className="flex justify-between text-gray-800 font-semibold">
                <span>Valor Total da Nota Fiscal (NF):</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(viewSale.totalOperation)}</span>
              </div>

              <div className="flex justify-between text-red-600 font-semibold">
                <span>(-) FUNRURAL Deduzido da Nota (1,63%):</span>
                <span className="text-sm font-bold">-{formatCurrency(viewSale.funruralTotal)}</span>
              </div>

              <div className="pl-4 text-[11px] text-gray-500 space-y-0.5 border-l-2 border-red-200 my-1">
                <div className="flex justify-between"><span>↳ Previdência Social (1,30%):</span><span>{formatCurrency(viewSale.previdenciaSocial)}</span></div>
                <div className="flex justify-between"><span>↳ RAT (0,10%):</span><span>{formatCurrency(viewSale.rat)}</span></div>
                <div className="flex justify-between"><span>↳ SENAR (0,23%):</span><span>{formatCurrency(viewSale.senar)}</span></div>
              </div>

              <div className="flex justify-between text-emerald-950 font-extrabold text-sm pt-2 border-t border-emerald-200">
                <span>(=) Valor Líquido a Receber / Repassar:</span>
                <span className="text-base text-emerald-900">{formatCurrency(getNetReceivable(viewSale))}</span>
              </div>

              <div className="flex justify-between text-[#173e27] font-bold pt-2 border-t border-emerald-100">
                <span>Comissão AgroVenda (3,0% Corretagem):</span>
                <span>{formatCurrency(viewSale.totalCommission)}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                onClick={() => {
                  setContractSale(viewSale);
                  setViewSale(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Contrato
              </button>

              <button
                onClick={() => setViewSale(null)}
                className="bg-[#173e27] text-white text-xs font-semibold px-5 py-2 rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Venda */}
      {editingSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveEdit} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase">{editingSale.operationType}</span>
                <h3 className="text-base font-bold text-gray-900">Editar Venda {editingSale.id}</h3>
              </div>
              <button type="button" onClick={() => setEditingSale(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Cliente Destinatário</label>
              <input
                type="text"
                required
                value={editForm.client}
                onChange={e => setEditForm({ ...editForm, client: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status Operacional</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
                >
                  <option value="Faturado">Faturado</option>
                  <option value="Pendente NF">Pendente NF</option>
                  <option value="Concluído">Concluído</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status Pagamento</label>
                <select
                  value={editForm.paymentStatus}
                  onChange={e => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
                >
                  <option value="A Receber">A Receber</option>
                  <option value="Recebido">Recebido (Liquidado)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Observações da Negociação</label>
              <textarea
                rows={2}
                value={editForm.notes}
                onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-[#173e27] hover:bg-[#1f5435] text-white text-xs font-semibold px-4 py-2 rounded-lg"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

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
