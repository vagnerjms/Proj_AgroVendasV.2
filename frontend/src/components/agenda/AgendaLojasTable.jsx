import React, { useRef } from 'react';
import { 
  Search, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  RotateCcw, 
  Paperclip, 
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

/**
 * Tabela e Filtros de Recebimentos de Lojas (Contas a Receber)
 * Exibe prazos de recebimento, valores faturados, cotações VP e status de quitação.
 */
export default function AgendaLojasTable({
  filteredScheduleLojas = [],
  scheduleListCount = 0,
  search = '',
  setSearch,
  selectedLoja = 'ALL',
  setSelectedLoja,
  uniqueLojas = [],
  statusFilter = 'ALL',
  setStatusFilter,
  uploadingSaleId = null,
  onSettleClick,
  onUnsettleClick,
  onPreviewEvidence,
  onRemoveEvidence,
  onUploadEvidence
}) {
  const tableRef = useRef(null);

  const scrollTable = (direction) => {
    if (tableRef.current) {
      const offset = direction === 'right' ? 380 : -380;
      tableRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros - Lojas */}
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
            <option value="ALL">Todas as Lojas / Redes</option>
            {uniqueLojas.map((loja, idx) => (
              <option key={idx} value={loja}>{loja}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 font-semibold text-gray-800 outline-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDENTE">Pendentes (A Receber / Parcial)</option>
            <option value="PARCIAL">Parcialmente Pagos</option>
            <option value="RECEBIDO">Liquidados (Recebidos)</option>
          </select>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Botões de Rolagem Lateral Rápida */}
          <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200 shadow-2xs">
            <button
              type="button"
              onClick={() => scrollTable('left')}
              className="px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
              title="Deslizar tabela para o início (esquerda)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Início</span>
            </button>
            <button
              type="button"
              onClick={() => scrollTable('right')}
              className="px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
              title="Deslizar tabela para a direita (Ações)"
            >
              <span className="hidden sm:inline">Ações</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
            Exibindo <strong>{filteredScheduleLojas.length}</strong> de {scheduleListCount}
          </span>
        </div>
      </div>

      {/* Tabela de Recebimentos de Lojas com Rolagem Interna e Cabeçalho Sticky */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div 
          ref={tableRef}
          className="overflow-x-auto overflow-y-auto max-h-[620px] 2xl:max-h-[720px] relative scroll-smooth focus:outline-none"
          tabIndex={0}
        >
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200 sticky top-0 z-20 shadow-xs">
              <tr>
                <th className="py-2.5 px-3">Data Vencimento</th>
                <th className="py-2.5 px-3 min-w-[150px]">Loja / Comprador</th>
                <th className="py-2.5 px-2 text-center">Nº VP</th>
                <th className="py-2.5 px-2 text-center">Nº NF</th>
                <th className="py-2.5 px-2 text-right">Caixas</th>
                <th className="py-2.5 px-2.5 text-right font-black text-gray-900 bg-gray-100/70">Total NF (Faturado)</th>
                <th className="py-2.5 px-2.5 text-right font-bold text-blue-900 bg-blue-50/20">Total VP (Cotação)</th>
                <th className="py-2.5 px-2.5 text-right font-black text-emerald-800 bg-emerald-50/40">Valor Recebido</th>
                <th className="py-2.5 px-2.5 text-right font-black text-amber-900 bg-amber-50/40">Saldo a Receber</th>
                <th className="py-2.5 px-2 text-center">Status Pagamento</th>
                <th className="py-2.5 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredScheduleLojas.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-8 text-center text-gray-400">
                    Nenhum recebimento de loja encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredScheduleLojas.map((item, idx) => {
                  const isPaid = item.isFullySettled;
                  const isPartial = item.isPartial;
                  return (
                    <tr key={idx} className={`hover:bg-gray-50/80 transition-colors ${isPaid ? 'bg-gray-50/40 opacity-80' : ''}`}>
                      
                      {/* Data Vencimento */}
                      <td className="py-2.5 px-3 font-black text-gray-900 flex items-center gap-2 whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>{item.dueDateFormatted}</span>
                      </td>

                      {/* Loja / Comprador */}
                      <td className="py-2.5 px-3 font-bold text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{item.client}</span>
                        </div>
                      </td>

                      {/* Nº VP */}
                      <td className="py-2.5 px-2 text-center font-bold text-[#173e27]">
                        {item.id}
                      </td>

                      {/* Nº NF */}
                      <td className="py-2.5 px-2 text-center text-gray-700 font-semibold">
                        {item.nfNumber}
                      </td>

                      {/* Caixas */}
                      <td className="py-2.5 px-2 text-right font-semibold text-gray-800 whitespace-nowrap">
                        {formatNumber(item.caixas, 2)} cx
                      </td>

                      {/* Total NF Faturado */}
                      <td className="py-2.5 px-2.5 text-right font-black text-gray-950 bg-gray-100/70 whitespace-nowrap">
                        {formatCurrency(item.totalOperation)}
                      </td>

                      {/* Total VP Comercial */}
                      <td className="py-2.5 px-2.5 text-right font-bold text-blue-950 bg-blue-50/30 whitespace-nowrap">
                        {formatCurrency(item.valorVP)}
                      </td>

                      {/* Valor Recebido */}
                      <td className="py-2.5 px-2.5 text-right font-black text-emerald-800 bg-emerald-50/40 whitespace-nowrap">
                        {item.valorLiquidado > 0 ? formatCurrency(item.valorLiquidado) : <span className="text-gray-400 font-normal">-</span>}
                      </td>

                      {/* Saldo a Receber */}
                      <td className="py-2.5 px-2.5 text-right font-black text-amber-900 bg-amber-50/40 whitespace-nowrap">
                        {item.valorALiquidar > 0 ? formatCurrency(item.valorALiquidar) : <span className="text-gray-400 font-normal">-</span>}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            isPaid 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : (isPartial 
                                  ? 'bg-blue-100 text-blue-900 border border-blue-200' 
                                  : 'bg-amber-100 text-amber-900 border border-amber-200')
                          }`}>
                            {isPaid ? 'Recebido' : (isPartial ? `Parcial (${item.percentPaid?.toFixed(0)}%)` : 'A Receber')}
                          </span>
                          {(isPaid || isPartial) && (
                            <span className="text-[9px] font-extrabold text-gray-500">
                              {item.paymentMethod === 'Cheque' ? '📄 Cheque' : (item.paymentMethod === 'TED/DOC' ? '🏦 TED/DOC' : '⚡ PIX')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {/* Botão Liquidar / Quitar Loja */}
                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => onSettleClick(item)}
                              className={`${isPartial ? 'bg-blue-700 hover:bg-blue-800' : 'bg-emerald-700 hover:bg-emerald-800'} text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs`}
                              title={isPartial ? 'Registrar novo recebimento parcial ou quitar saldo da loja' : 'Registrar recebimento total ou parcial da loja'}
                            >
                              {isPartial ? 'Receber (+)' : 'Receber'}
                            </button>
                          )}

                          {/* Reverter recebimento */}
                          {(isPaid || (item.valorLiquidado > 0) || (item.paidAmount > 0)) && (
                            <button
                              type="button"
                              onClick={() => onUnsettleClick(item.id)}
                              className="text-[10px] text-emerald-800 hover:text-amber-900 font-bold bg-emerald-50 hover:bg-amber-100 px-2 py-1 rounded-md border border-emerald-200 hover:border-amber-300 transition-all cursor-pointer group flex items-center gap-1 shadow-2xs"
                              title="Clique para estornar / reverter recebimento da loja"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 group-hover:hidden" />
                              <RotateCcw className="w-3 h-3 text-amber-700 hidden group-hover:inline" />
                              <span className="group-hover:hidden">{isPaid ? 'Recebido' : 'Estornar'}</span>
                              <span className="hidden group-hover:inline">Reverter</span>
                            </button>
                          )}

                          {/* Comprovante da Loja */}
                          {item.paymentProofFile ? (
                            <div className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => onPreviewEvidence(item.paymentProofFile)}
                                className="text-blue-700 hover:text-blue-900 px-1.5 py-1 text-[10px] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                                title="Visualizar comprovante de recebimento anexado"
                              >
                                <Paperclip className="w-3 h-3 text-blue-600" />
                                <span className="hidden sm:inline">Comprovante</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => onRemoveEvidence(item.id, e)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-100 p-1 rounded-md transition-colors cursor-pointer"
                                title="Excluir comprovante de recebimento"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <label 
                              className={`p-1.5 rounded-lg border border-dashed border-gray-300 hover:border-emerald-600 bg-gray-50 hover:bg-emerald-50/50 text-gray-500 hover:text-emerald-800 cursor-pointer transition-all flex items-center gap-1 text-[10px] font-semibold ${
                                uploadingSaleId === `client-${item.id}` ? 'opacity-50 pointer-events-none' : ''
                              }`}
                              title="Anexar comprovante de recebimento da loja"
                            >
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                disabled={uploadingSaleId === `client-${item.id}`}
                                onChange={(e) => onUploadEvidence(item.id, e.target.files?.[0])}
                                className="hidden"
                              />
                              {uploadingSaleId === `client-${item.id}` ? (
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
