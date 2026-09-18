import React from 'react';
import { Building2, BadgePercent } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export default function CommissionsTable({ 
  stores = [], 
  currentTotal = {}, 
  selectedLoja = 'ALL' 
}) {
  return (
    <div className="space-y-6">
      
      {/* Cards de Resumo Consolidado com Comissões */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
          <span className="text-gray-500 text-xs font-bold uppercase block">Total Comercial (VP)</span>
          <span className="text-2xl font-black text-blue-950">{formatCurrency(currentTotal.totalVendaAReceber)}</span>
          <span className="text-[11px] text-gray-400 block">{currentTotal.pedidosVenda} Pedidos de Venda</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
          <span className="text-gray-500 text-xs font-bold uppercase block">Total Faturado NF</span>
          <span className="text-2xl font-black text-gray-900">{formatCurrency(currentTotal.valorTotalNF)}</span>
          <span className="text-[11px] text-gray-400 block">{currentTotal.nfs} Notas Emitidas</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
          <span className="text-gray-500 text-xs font-bold uppercase block">(-) FUNRURAL (1,63%)</span>
          <span className="text-2xl font-black text-red-600">-{formatCurrency(currentTotal.funrural)}</span>
          <span className="text-[11px] text-gray-400 block">Dedução tributária</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm space-y-1">
          <span className="text-blue-800 text-xs font-bold uppercase block">Comissão AgroVenda (3%)</span>
          <span className="text-2xl font-black text-blue-900">{formatCurrency(currentTotal.totalComissao)}</span>
          <span className="text-[11px] text-blue-600 block font-semibold">Taxa média 3,0%</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm space-y-1">
          <span className="text-emerald-800 text-xs font-bold uppercase block">(=) Líquido Produtor</span>
          <span className="text-2xl font-black text-emerald-950">{formatCurrency(currentTotal.totalLiquidoProdutor)}</span>
          <span className="text-[11px] text-emerald-700 block font-semibold">Saldo a repassar</span>
        </div>
      </div>

      {/* Matriz Geral por Loja com Comissões */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-3 page-break-after print:shadow-none print:border-none">
        <div className="bg-[#173e27] text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BadgePercent className="w-4 h-4 text-emerald-200" />
            <span className="text-xs font-black uppercase tracking-wider">
              Fechamento por Loja com Comissões & Repasse Líquido
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-100 bg-emerald-900/40 px-2.5 py-0.5 rounded">
            Base Comercial VP + Comissão 3,0%
          </span>
        </div>

        <div className="overflow-x-auto p-4 pt-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#1e5234] text-white font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Loja / Comprador</th>
                <th className="py-2.5 px-2 text-center">NFs</th>
                <th className="py-2.5 px-2 text-center">VPs</th>
                <th className="py-2.5 px-3 text-right">CXS (29kg)</th>
                <th className="py-2.5 px-3 text-right">Valor Total NF</th>
                <th className="py-2.5 px-3 text-right">FUNRURAL</th>
                <th className="py-2.5 px-3 text-right bg-[#173e27]">Total Comercial (VP)</th>
                <th className="py-2.5 px-3 text-right bg-[#14532d]">Valor Liquidado (R$)</th>
                <th className="py-2.5 px-3 text-right bg-[#92400e]">Valor a Liquidar (R$)</th>
                <th className="py-2.5 px-2 text-center">Taxa (%)</th>
                <th className="py-2.5 px-3 text-right bg-blue-900/80">Comissão (R$)</th>
                <th className="py-2.5 px-3 text-right bg-emerald-900/90">Líquido Produtor (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stores.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-3 font-bold text-gray-900 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-emerald-800" />
                    {row.loja}
                  </td>
                  <td className="py-3 px-2 text-center font-medium text-gray-700">{row.nfs}</td>
                  <td className="py-3 px-2 text-center font-bold text-gray-900">{row.pedidosVenda}</td>
                  <td className="py-3 px-3 text-right font-semibold text-gray-800">{formatNumber(row.cxsVendidas, 2)}</td>
                  <td className="py-3 px-3 text-right font-bold text-gray-900">{formatCurrency(row.valorTotalNF)}</td>
                  <td className="py-3 px-3 text-right text-red-600 font-medium">-{formatCurrency(row.funrural)}</td>
                  <td className="py-3 px-3 text-right font-black text-blue-950 bg-blue-50/40">
                    {formatCurrency(row.totalVendaAReceber)}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-emerald-800 bg-emerald-50/50">
                    {formatCurrency(row.valorLiquidado)}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-amber-900 bg-amber-50/50">
                    {formatCurrency(row.valorALiquidar)}
                  </td>
                  <td className="py-3 px-2 text-center text-gray-700 font-bold">3,0%</td>
                  <td className="py-3 px-3 text-right font-black text-blue-950 bg-blue-50/40">
                    {formatCurrency(row.totalComissao)}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-emerald-950 bg-emerald-50/60">
                    {formatCurrency(row.totalLiquidoProdutor)}
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
                <td className="py-3 px-3 text-right font-black">{formatNumber(currentTotal.cxsVendidas, 2)}</td>
                <td className="py-3 px-3 text-right font-black">{formatCurrency(currentTotal.valorTotalNF)}</td>
                <td className="py-3 px-3 text-right font-black text-red-900">-{formatCurrency(currentTotal.funrural)}</td>
                <td className="py-3 px-3 text-right font-black text-blue-950 bg-[#83c457]">
                  {formatCurrency(currentTotal.totalVendaAReceber)}
                </td>
                <td className="py-3 px-3 text-right font-black text-emerald-950 bg-[#a7f3d0]">
                  {formatCurrency(currentTotal.valorTotalLiquidado)}
                </td>
                <td className="py-3 px-3 text-right font-black text-amber-950 bg-[#fde68a]">
                  {formatCurrency(currentTotal.valorTotalALiquidar)}
                </td>
                <td className="py-3 px-2 text-center font-black">3,0%</td>
                <td className="py-3 px-3 text-right font-black text-blue-950 bg-[#93c5fd]">
                  {formatCurrency(currentTotal.totalComissao)}
                </td>
                <td className="py-3 px-3 text-right font-black text-emerald-950 bg-[#6ee7b7]">
                  {formatCurrency(currentTotal.totalLiquidoProdutor)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
