import React from 'react';
import { Building2, FileSpreadsheet } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export default function StoreSummaryTable({ 
  stores = [], 
  currentTotal = {}, 
  selectedLoja = 'ALL' 
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-3 page-break-after print:shadow-none print:border-none">
      <div className="bg-[#1b4363] text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-sky-200" />
          <span className="text-xs font-black uppercase tracking-wider">
            ResumoLojas — Relatório geral - NFs e VPs por loja
          </span>
        </div>
        <span className="text-[11px] font-semibold text-sky-100 bg-sky-900/40 px-2.5 py-0.5 rounded">
          Fórmulas 100% Conciliadas em Tempo Real
        </span>
      </div>

      <div className="overflow-x-auto p-4 pt-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#245b85] text-white font-bold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Loja</th>
              <th className="py-2.5 px-2 text-center">NFs</th>
              <th className="py-2.5 px-2 text-center">Pedidos Venda</th>
              <th className="py-2.5 px-2 text-center">Pedidos sem NF</th>
              <th className="py-2.5 px-3 text-right">Peso NF (kg)</th>
              <th className="py-2.5 px-3 text-right">Peso total baseado na colheita (kg)</th>
              <th className="py-2.5 px-3 text-right">CXS Vendidas</th>
              <th className="py-2.5 px-3 text-right">Valor Total NF (R$)</th>
              <th className="py-2.5 px-3 text-right">FUNRURAL (R$)</th>
              <th className="py-2.5 px-3 text-right bg-[#166534]">Valor Liquidado (R$)</th>
              <th className="py-2.5 px-3 text-right bg-[#b45309]">Valor a Liquidar (R$)</th>
              <th className="py-2.5 px-3 text-right bg-[#143753]">Líquido NF (R$)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {stores.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-3 font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[#245b85]" />
                  {row.loja}
                </td>
                <td className="py-3 px-2 text-center font-medium text-gray-700">{row.nfs}</td>
                <td className="py-3 px-2 text-center font-bold text-gray-900">{row.pedidosVenda}</td>
                <td className="py-3 px-2 text-center text-amber-700 font-medium">
                  {row.pedidosSemNF > 0 ? (
                    <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[10px] font-bold">
                      {row.pedidosSemNF}
                    </span>
                  ) : (
                    '0'
                  )}
                </td>
                <td className="py-3 px-3 text-right text-gray-700 font-medium">{formatNumber(row.pesoNF, 2)}</td>
                <td className="py-3 px-3 text-right font-bold text-gray-900">{formatNumber(row.pesoColheita, 2)}</td>
                <td className="py-3 px-3 text-right font-semibold text-gray-800">{formatNumber(row.cxsVendidas, 2)}</td>
                <td className="py-3 px-3 text-right font-bold text-gray-900">{formatCurrency(row.valorTotalNF)}</td>
                <td className="py-3 px-3 text-right text-red-600 font-medium">-{formatCurrency(row.funrural)}</td>
                <td className="py-3 px-3 text-right font-black text-emerald-800 bg-emerald-50/60">
                  {formatCurrency(row.valorLiquidado)}
                </td>
                <td className="py-3 px-3 text-right font-black text-amber-900 bg-amber-50/60">
                  {formatCurrency(row.valorALiquidar)}
                </td>
                <td className="py-3 px-3 text-right font-black text-emerald-950 bg-emerald-50/40">
                  {formatCurrency(row.liquidoNF)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-[#bfe2a5] font-black text-xs text-gray-950 border-t-2 border-emerald-800">
            <tr>
              <td className="py-3 px-3 uppercase font-black text-gray-950">
                {selectedLoja === 'ALL' ? 'TOTAL GERAL' : `TOTAL (${selectedLoja})`}
              </td>
              <td className="py-3 px-2 text-center font-black">{currentTotal.nfs}</td>
              <td className="py-3 px-2 text-center font-black">{currentTotal.pedidosVenda}</td>
              <td className="py-3 px-2 text-center font-black text-amber-950">{currentTotal.pedidosSemNF}</td>
              <td className="py-3 px-3 text-right font-black">{formatNumber(currentTotal.pesoNF, 2)}</td>
              <td className="py-3 px-3 text-right font-black bg-[#9dd07b]">{formatNumber(currentTotal.pesoColheita, 2)}</td>
              <td className="py-3 px-3 text-right font-black">{formatNumber(currentTotal.cxsVendidas, 2)}</td>
              <td className="py-3 px-3 text-right font-black">{formatCurrency(currentTotal.valorTotalNF)}</td>
              <td className="py-3 px-3 text-right font-black text-red-900">-{formatCurrency(currentTotal.funrural)}</td>
              <td className="py-3 px-3 text-right font-black text-emerald-950 bg-[#a7f3d0]">
                {formatCurrency(currentTotal.valorTotalLiquidado)}
              </td>
              <td className="py-3 px-3 text-right font-black text-amber-950 bg-[#fde68a]">
                {formatCurrency(currentTotal.valorTotalALiquidar)}
              </td>
              <td className="py-3 px-3 text-right font-black text-emerald-950 bg-[#aedb8e]">
                {formatCurrency(currentTotal.liquidoNF)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
