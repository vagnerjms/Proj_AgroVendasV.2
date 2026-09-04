import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Building2, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  DollarSign, 
  Printer, 
  ArrowUpRight,
  TrendingUp,
  FileText,
  RefreshCw,
  Paperclip,
  X,
  Eye,
  ExternalLink,
  Camera,
  Image,
  Upload,
  RotateCcw
} from 'lucide-react';
import { formatCurrency, formatNumber, getCleanFileName } from '../utils/formatters';

export default function AgendaAlerts({ setCurrentPage }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedLoja, setSelectedLoja] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState('');
  const [uploadingSaleId, setUploadingSaleId] = useState(null);
  const [previewEvidence, setPreviewEvidence] = useState(null);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sales');
      if (res.ok) {
        const data = await res.json();
        setSales(data);
      }
    } catch (err) {
      console.error('Erro ao buscar agenda de recebimentos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sales/sync-all-webhooks', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message || 'Todas as vendas foram enviadas para o Webhook do n8n / Google Calendar com sucesso!');
      } else {
        alert(data.error || 'Erro ao sincronizar vendas.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao sincronizar com webhook.');
    } finally {
      setSyncing(false);
    }
  };

  const handleSettle = async (saleId) => {
    if (!window.confirm(`Deseja confirmar o recebimento integral da venda ${saleId}?`)) return;
    try {
      const res = await fetch(`/api/sales/${saleId}/settle`, { method: 'POST' });
      if (res.ok) {
        showNotification(`Recebimento da venda ${saleId} registrado com sucesso!`);
        fetchSales();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnsettle = async (saleId) => {
    if (!window.confirm(`Deseja reverter a liquidação da venda ${saleId} (retornar para status 'A Receber')?`)) return;
    try {
      const res = await fetch(`/api/sales/${saleId}/unsettle`, { method: 'POST' });
      if (res.ok) {
        showNotification(`Liquidação da venda ${saleId} revertida com sucesso! Status alterado para 'A Receber'.`);
        fetchSales();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao reverter liquidação.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao reverter liquidação.');
    }
  };

  const handleUploadEvidence = async (saleId, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    setUploadingSaleId(saleId);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        const fname = data.filename || file.name;
        
        // Atualiza a venda no backend com o arquivo de comprovante de liquidação (sem sobrescrever a imagem da venda)
        const updateRes = await fetch(`/api/sales/${saleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentProofFile: fname })
        });
        
        if (updateRes.ok) {
          showNotification(`Comprovante de liquidação anexado à venda ${saleId} com sucesso!`);
          fetchSales();
        } else {
          alert('Erro ao vincular comprovante à venda.');
        }
      } else {
        alert('Falha ao enviar arquivo de comprovante.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão no upload do comprovante.');
    } finally {
      setUploadingSaleId(null);
    }
  };

  const handleRemoveEvidence = async (saleId, e) => {
    e?.stopPropagation?.();
    if (!window.confirm(`Deseja excluir o comprovante de liquidação anexado da venda ${saleId}?`)) return;

    try {
      const res = await fetch(`/api/sales/${saleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentProofFile: null })
      });
      if (res.ok) {
        showNotification(`Comprovante de liquidação da venda ${saleId} removido com sucesso.`);
        fetchSales();
      } else {
        alert('Erro ao remover comprovante.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao remover comprovante.');
    }
  };

  // Helper to extract due date from sale.dueDate, notes or saleDate + paymentTermDays
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
    // Default fallback using paymentTermDays or 30 days
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

  // Process schedule list
  const scheduleList = sales.map(s => {
    const dueDateObj = parseDueDate(s);
    const nfNumber = s.nfFile ? s.nfFile.replace(/^\d{10,15}(-\d+)?-/, '').replace('NF-', '').replace('.pdf', '') : (s.nfeKey ? s.nfeKey.slice(-8) : 'Pendente');
    
    // Extract Cotação and VP Value
    let cotacao = Number(s.dailyQuote) || 0;
    if (!cotacao && s.notes) {
      const m = s.notes.match(/Cotação:?\s*R\$\s*([\d,.]+)/i);
      if (m) cotacao = parseFloat(m[1].replace(',', '.'));
    }
    if (!cotacao) cotacao = 45.0;

    const caixas = s.totalVolumes || (s.totalKg > 0 ? (s.totalKg / 29) : 0);
    const valorVP = Number(s.valorTotalVP) > 0 ? Number(s.valorTotalVP) : (caixas * cotacao);
    const valorLiquidoNF = Math.max(0, (s.totalOperation || 0) - (s.funruralTotal || 0));

    return {
      ...s,
      dueDateFormatted: dueDateObj.formatted,
      dueDateIso: dueDateObj.isoDate,
      nfNumber,
      cotacao,
      caixas,
      valorVP,
      valorLiquidoNF
    };
  }).sort((a, b) => a.dueDateIso.localeCompare(b.dueDateIso));

  // Extract unique stores
  const uniqueLojas = Array.from(new Set(sales.map(s => s.client))).filter(Boolean);

  // Filtered List
  const filteredSchedule = scheduleList.filter(item => {
    const matchLoja = selectedLoja === 'ALL' || item.client === selectedLoja;
    const matchStatus = statusFilter === 'ALL' || 
      (statusFilter === 'RECEBIDO' && item.paymentStatus === 'Recebido') ||
      (statusFilter === 'PENDENTE' && item.paymentStatus !== 'Recebido');
    const matchSearch = item.client.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase()) ||
      item.nfNumber.toLowerCase().includes(search.toLowerCase());
    return matchLoja && matchStatus && matchSearch;
  });

  // KPI Calculations
  const totalProgramado = scheduleList
    .filter(s => s.paymentStatus !== 'Recebido')
    .reduce((acc, s) => acc + s.valorLiquidoNF, 0);

  const totalRecebido = scheduleList
    .filter(s => s.paymentStatus === 'Recebido')
    .reduce((acc, s) => acc + s.valorLiquidoNF, 0);

  const totalVPProgramado = scheduleList
    .filter(s => s.paymentStatus !== 'Recebido')
    .reduce((acc, s) => acc + s.valorVP, 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="text-xs font-bold text-[#091b2e] tracking-wider uppercase flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#df7b1b]" />
            <span>AGROVENDA — CRONOGRAMA FINANCEIRO</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">
            Agenda & Alertas de Recebimento por Loja
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Acompanhamento de datas de vencimento, prazos de pagamento e liquidação dos pedidos de venda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            title="Dispara todos os lançamentos de vendas para o Webhook do n8n / Google Agenda"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sincronizando com n8n...' : '⚡ Sincronizar Tudo c/ Google Agenda'}</span>
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

      {/* Notifications */}
      {notification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* 4 Cards de Resumo da Agenda */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
            <span>Total Líquido a Receber</span>
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black text-[#173e27]">
            {formatCurrency(totalProgramado)}
          </div>
          <span className="text-[11px] text-gray-400 block">Base em NFs faturadas</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
            <span>Total Comercial VP Programado</span>
            <TrendingUp className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-2xl font-black text-blue-950">
            {formatCurrency(totalVPProgramado)}
          </div>
          <span className="text-[11px] text-gray-400 block">Cotação comercial das 34 VPs</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
            <span>Pedidos em Aberto</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900">
            {scheduleList.filter(s => s.paymentStatus !== 'Recebido').length} entregas
          </div>
          <span className="text-[11px] text-gray-400 block">Aguardando data de vencimento</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
            <span>Total Liquidado</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatCurrency(totalRecebido)}
          </div>
          <span className="text-[11px] text-gray-400 block">Vendas já recebidas</span>
        </div>
      </div>

      {/* Filtros da Agenda */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por Loja, VP ou NF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-xs rounded-lg pl-8 pr-3 py-2 outline-none w-64 focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <select
            value={selectedLoja}
            onChange={(e) => setSelectedLoja(e.target.value)}
            className="bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 font-semibold text-gray-800 outline-none"
          >
            <option value="ALL">Todas as Lojas ({uniqueLojas.length})</option>
            {uniqueLojas.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 font-semibold text-gray-800 outline-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDENTE">Em Aberto / A Receber</option>
            <option value="RECEBIDO">Liquidados / Recebidos</option>
          </select>
        </div>

        <span className="text-xs text-gray-500 font-semibold">
          Exibindo <strong>{filteredSchedule.length}</strong> de {scheduleList.length} recebimentos
        </span>
      </div>

      {/* Tabela da Agenda com as Datas de Vencimento por Loja */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Data Vencimento</th>
                <th className="py-3 px-4">Loja / Comprador</th>
                <th className="py-3 px-3 text-center">Nº VP</th>
                <th className="py-3 px-3 text-center">Nº NF</th>
                <th className="py-3 px-3 text-right">Caixas (29kg)</th>
                <th className="py-3 px-3 text-right">Líquido NF</th>
                <th className="py-3 px-3 text-right font-black text-blue-900">Total VP (Comercial)</th>
                <th className="py-3 px-3 text-center">Status Pagamento</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSchedule.map((item, idx) => {
                const isPaid = item.paymentStatus === 'Recebido';
                return (
                  <tr key={idx} className={`hover:bg-gray-50/80 transition-colors ${isPaid ? 'bg-gray-50/40 opacity-75' : ''}`}>
                    
                    {/* Data Vencimento */}
                    <td className="py-3 px-4 font-black text-gray-900 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{item.dueDateFormatted}</span>
                    </td>

                    {/* Loja / Comprador */}
                    <td className="py-3 px-4 font-bold text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <span>{item.client}</span>
                      </div>
                    </td>

                    {/* Nº VP */}
                    <td className="py-3 px-3 text-center font-bold text-[#173e27]">
                      {item.id}
                    </td>

                    {/* Nº NF */}
                    <td className="py-3 px-3 text-center text-gray-700 font-semibold">
                      {item.nfNumber}
                    </td>

                    {/* Caixas */}
                    <td className="py-3 px-3 text-right font-semibold text-gray-800">
                      {formatNumber(item.caixas, 2)} cx
                    </td>

                    {/* Líquido NF */}
                    <td className="py-3 px-3 text-right font-black text-emerald-950">
                      {formatCurrency(item.valorLiquidoNF)}
                    </td>

                    {/* Total VP */}
                    <td className="py-3 px-3 text-right font-black text-blue-950 bg-blue-50/30">
                      {formatCurrency(item.valorVP)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}>
                        {isPaid ? 'Recebido' : 'A Receber'}
                      </span>
                    </td>

                    {/* Ação */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {/* Botão Liquidar */}
                        {!isPaid ? (
                          <button
                            type="button"
                            onClick={() => handleSettle(item.id)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
                            title="Confirmar recebimento do valor"
                          >
                            Liquidar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUnsettle(item.id)}
                            className="text-[10px] text-emerald-800 hover:text-amber-900 font-bold bg-emerald-50 hover:bg-amber-100 px-2.5 py-1 rounded-md border border-emerald-200 hover:border-amber-300 transition-all cursor-pointer group flex items-center gap-1 shadow-2xs"
                            title="Clique para reverter liquidação (voltar para 'A Receber')"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 group-hover:hidden" />
                            <RotateCcw className="w-3 h-3 text-amber-700 hidden group-hover:inline" />
                            <span className="group-hover:hidden">Liquidado</span>
                            <span className="hidden group-hover:inline">Reverter</span>
                          </button>
                        )}

                        {/* Comprovante de Pagamento / Liquidação (Upload / Preview / Excluir) */}
                        {item.paymentProofFile ? (
                          <div className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => setPreviewEvidence(item.paymentProofFile)}
                              className="text-blue-700 hover:text-blue-900 px-1.5 py-1 text-[10px] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                              title="Visualizar comprovante de liquidação anexado"
                            >
                              <Paperclip className="w-3 h-3 text-blue-600" />
                              <span className="hidden sm:inline">Comprovante</span>
                            </button>
                            
                            {/* Botão X para excluir o comprovante de liquidação */}
                            <button
                              type="button"
                              onClick={(e) => handleRemoveEvidence(item.id, e)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-100 p-1 rounded-md transition-colors cursor-pointer"
                              title="Excluir comprovante de liquidação"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label 
                            className={`p-1.5 rounded-lg border border-dashed border-gray-300 hover:border-emerald-600 bg-gray-50 hover:bg-emerald-50/50 text-gray-500 hover:text-emerald-800 cursor-pointer transition-all flex items-center gap-1 text-[10px] font-semibold ${
                              uploadingSaleId === item.id ? 'opacity-50 pointer-events-none' : ''
                            }`}
                            title="Anexar comprovante de liquidação / PIX"
                          >
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              disabled={uploadingSaleId === item.id}
                              onChange={(e) => handleUploadEvidence(item.id, e.target.files?.[0])}
                              className="hidden"
                            />
                            {uploadingSaleId === item.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Paperclip className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden xl:inline">Anexar</span>
                          </label>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
                <span className="text-xs font-bold text-gray-900">Comprovante de Pagamento</span>
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
                  alt="Comprovante de Pagamento" 
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
