import React, { useRef } from 'react';
import {
  Search,
  Calendar,
  Building2,
  Paperclip,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { formatQuantity, resolveProductUnit, quantityOf, abbreviateUnit } from '../../utils/dataHelpers';
import { DATA_LABELS } from '../../constants/dataLabels';

/**
 * Tabela de lembretes de vencimento — Recebimentos de Lojas (somente leitura operacional).
 * Baixas (Receber/Estornar) ficam exclusivamente no Fiscal.
 * Filtros de loja/produto/status ficam na página (MultiSelect + chips).
 */
export default function AgendaLojasTable({
  filteredScheduleLojas = [],
  scheduleListCount = 0,
  search = '',
  setSearch,
  uploadingSaleId = null,
  onGoToFiscal,
  onPreviewEvidence
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
        </div>

        <div className="flex items-center gap-2.5">
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
                <th className="py-2.5 px-2 text-center">Nº Romaneio</th>
                <th className="py-2.5 px-2 text-center">Nº NF</th>
                <th className="py-2.5 px-2 text-right">{DATA_LABELS.quantity}</th>
                <th className="py-2.5 px-2.5 text-right font-black text-gray-900 bg-gray-100/70">Total NF (Faturado)</th>
                <th className="py-2.5 px-2.5 text-right font-bold text-blue-900 bg-blue-50/20">Total VP (Comercial)</th>
                <th className="py-2.5 px-2.5 text-right font-black text-emerald-800 bg-emerald-50/40">Valor Recebido</th>
                <th className="py-2.5 px-2.5 text-right font-black text-amber-900 bg-amber-50/40">{DATA_LABELS.saldoAReceber}</th>
                <th className="py-2.5 px-2 text-center">Status Pagamento</th>
                <th className="py-2.5 px-3 text-center">Lembrete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredScheduleLojas.length === 0 ? (
                <tr>
                  <td colSpan="12" className="py-8 text-center text-gray-400">
                    Nenhum recebimento de loja encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredScheduleLojas.map((item, idx) => {
                  const isPaid = item.isFullySettled;
                  const isPartial = item.isPartial;
                  return (
                    <tr key={idx} className={`hover:bg-gray-50/80 transition-colors ${isPaid ? 'bg-gray-50/40 opacity-80' : ''}`}>
                      <td className="py-2.5 px-3 font-black text-gray-900 flex items-center gap-2 whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>{item.dueDateFormatted}</span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{item.client}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-[#173e27]">{item.id}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-gray-700">{item.romaneioNumber || '—'}</td>
                      <td className="py-2.5 px-2 text-center text-gray-700 font-semibold">{item.nfNumber}</td>
                      <td className="py-2.5 px-2 text-right font-semibold text-gray-800 whitespace-nowrap">
                        {formatQuantity(quantityOf(item) || item.caixas, abbreviateUnit(resolveProductUnit(item)))}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-black text-gray-950 bg-gray-100/70 whitespace-nowrap">
                        {formatCurrency(item.totalOperation)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-blue-950 bg-blue-50/30 whitespace-nowrap">
                        {formatCurrency(item.valorVP)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-black text-emerald-800 bg-emerald-50/40 whitespace-nowrap">
                        {item.valorLiquidado > 0 ? formatCurrency(item.valorLiquidado) : <span className="text-gray-400 font-normal">-</span>}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-black text-amber-900 bg-amber-50/40 whitespace-nowrap">
                        {item.valorALiquidar > 0 ? formatCurrency(item.valorALiquidar) : <span className="text-gray-400 font-normal">-</span>}
                      </td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800'
                            : (isPartial
                                ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                : 'bg-amber-100 text-amber-900 border border-amber-200')
                        }`}>
                          {isPaid ? 'Recebido' : (isPartial ? `Parcial (${item.percentPaid?.toFixed(0)}%)` : 'A Receber')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => onGoToFiscal?.(item)}
                              className="text-[10px] font-bold text-[#091b2e] bg-gray-100 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 px-2.5 py-1.5 rounded-lg cursor-pointer"
                              title="Baixas de recebimento são feitas no Fiscal"
                            >
                              Baixar no Fiscal
                            </button>
                          )}
                          {item.paymentProofFile && (
                            <button
                              type="button"
                              onClick={() => onPreviewEvidence(item.paymentProofFile)}
                              className="text-blue-700 hover:text-blue-900 px-1.5 py-1 text-[10px] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                              title="Visualizar comprovante"
                            >
                              <Paperclip className="w-3 h-3 text-blue-600" />
                              <span>Comprovante</span>
                            </button>
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
