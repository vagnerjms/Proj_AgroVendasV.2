import React from 'react';
import { Building2, FileSpreadsheet } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { DATA_LABELS } from '../../constants/dataLabels';

/**
 * Resumo por loja — prestação comercial (sem FUNRURAL; FUNRURAL só na Apuração).
 */
export default function StoreSummaryTable({
  stores = [],
  currentTotal = {},
  selectedLoja = 'ALL'
}) {
  const totalLabel = selectedLoja === 'ALL' ? 'TOTAL GERAL' : `TOTAL (${selectedLoja})`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-3 page-break-after print:shadow-none print:border-none">
      <div className="bg-[#1b4363] text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-sky-200" />
          <span className="text-xs font-black uppercase tracking-wider">
            Resumo por loja — {DATA_LABELS.valorNegociadoVP} e {DATA_LABELS.saldoAReceber}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-sky-100 bg-sky-900/40 px-2.5 py-0.5 rounded">
          Fonte: planilha Valores por carga
        </span>
      </div>

      <div className="overflow-x-auto p-4 pt-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#245b85] text-white font-bold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Loja / comprador</th>
              <th className="py-2.5 px-2 text-center">Cargas</th>
              <th className="py-2.5 px-2 text-center print-hide-col">Sem NF</th>
              <th className="py-2.5 px-3 text-right print-hide-col">Peso (kg)</th>
              <th className="py-2.5 px-3 text-right bg-[#1e3a8a]">{DATA_LABELS.valorNegociadoVP}</th>
              <th className="py-2.5 px-3 text-right">{DATA_LABELS.valorNF}</th>
              <th className="py-2.5 px-3 text-right bg-[#92400e] print-hide-col">{DATA_LABELS.saldoAReceber}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {stores.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  Nenhuma loja no período/filtro.
                </td>
              </tr>
            ) : (
              stores.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-3 font-bold text-gray-900">
                    <span className="inline-flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-[#245b85] shrink-0" />
                      {row.loja}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center font-bold text-gray-900">{row.pedidosVenda}</td>
                  <td className="py-3 px-2 text-center text-amber-700 font-medium print-hide-col">
                    {row.pedidosSemNF > 0 ? (
                      <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[10px] font-bold">
                        {row.pedidosSemNF}
                      </span>
                    ) : '0'}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-gray-900 print-hide-col">{formatNumber(row.pesoColheita, 0)}</td>
                  <td className="py-3 px-3 text-right font-black text-blue-950 bg-blue-50/50">
                    {formatCurrency(row.totalVendaAReceber)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-gray-900">{formatCurrency(row.valorTotalNF)}</td>
                  <td className="py-3 px-3 text-right font-black text-amber-950 bg-amber-50/50 print-hide-col">
                    {formatCurrency(row.valorALiquidar)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-[#bfe2a5] font-black text-xs text-gray-950 border-t-2 border-emerald-800">
            <tr>
              <td className="py-3 px-3 uppercase font-black text-gray-950">{totalLabel}</td>
              <td className="py-3 px-2 text-center font-black">{currentTotal.pedidosVenda}</td>
              <td className="py-3 px-2 text-center font-black text-amber-950 print-hide-col">{currentTotal.pedidosSemNF}</td>
              <td className="py-3 px-3 text-right font-black print-hide-col">{formatNumber(currentTotal.pesoColheita, 0)}</td>
              <td className="py-3 px-3 text-right font-black bg-[#93c5fd]">
                {formatCurrency(currentTotal.totalVendaAReceber)}
              </td>
              <td className="py-3 px-3 text-right font-black">{formatCurrency(currentTotal.valorTotalNF)}</td>
              <td className="py-3 px-3 text-right font-black text-amber-950 bg-[#fde68a] print-hide-col">
                {formatCurrency(currentTotal.valorTotalALiquidar ?? currentTotal.valorALiquidar)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
