import React from 'react';
import { DollarSign, TrendingUp, Building2, Tractor, BadgePercent, Coins, ArrowUpRight } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export default function BrokerProfitTable({ 
  stores = [], 
  currentTotal = {}, 
  selectedLoja = 'ALL' 
}) {
  const allItens = stores.flatMap(s => s.itens || []);

  const totalVP = allItens.reduce((acc, it) => acc + (Number(it.valorVP) || 0), 0);
  const totalNF = allItens.reduce((acc, it) => acc + (Number(it.valorNF) || 0), 0);
  const totalFunrural = allItens.reduce((acc, it) => acc + (Number(it.funrural) || 0), 0);
  const totalLiquidoProdutor = allItens.reduce((acc, it) => acc + (Number(it.liquidoProdutor) || Math.max(0, (Number(it.valorNF) || 0) - (Number(it.funrural) || 0))), 0);
  const totalSpread = allItens.reduce((acc, it) => acc + (Number(it.spreadComercial) || Math.max(0, (Number(it.valorVP) || 0) - (Number(it.valorNF) || 0))), 0);
  const totalComissao = allItens.reduce((acc, it) => acc + (Number(it.comissao) || 0), 0);
  const totalLucroAgroVenda = totalSpread + totalComissao;

  return (
    <div className="space-y-6">
      
      {/* 5 Cards de Conciliação e Lucro do Corretor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        
        {/* Card 1: Recebimento Loja (VP) */}
        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-bold text-blue-900 uppercase">
            <span className="truncate">Recebimento Lojas (VP)</span>
            <Building2 className="w-4 h-4 text-blue-700 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-blue-950 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalVP)}>
            {formatCurrency(totalVP)}
          </div>
          <span className="text-[11px] text-blue-600 block font-medium truncate">
            Cotação diária das {allItens.length} vendas
          </span>
        </div>

        {/* Card 2: Custo das NFs dos Produtores */}
        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
            <span className="truncate">(-) Total NFs Produtores</span>
            <Tractor className="w-4 h-4 text-gray-600 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-gray-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalNF)}>
            {formatCurrency(totalNF)}
          </div>
          <span className="text-[11px] text-gray-400 block truncate">
            Base faturada dos produtores
          </span>
        </div>

        {/* Card 3: Spread Comercial Bruto */}
        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-bold text-amber-900 uppercase">
            <span className="truncate">(=) Spread Comercial (VP - NF)</span>
            <TrendingUp className="w-4 h-4 text-amber-700 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-amber-950 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalSpread)}>
            {formatCurrency(totalSpread)}
          </div>
          <span className="text-[11px] text-amber-800 font-semibold block truncate">
            Margem de negociação
          </span>
        </div>

        {/* Card 4: Comissões */}
        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
            <span className="truncate">(+) Comissões Corretagem</span>
            <BadgePercent className="w-4 h-4 text-blue-600 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-blue-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalComissao)}>
            {formatCurrency(totalComissao)}
          </div>
          <span className="text-[11px] text-gray-400 block truncate">
            Taxas de intermediação
          </span>
        </div>

        {/* Card 5: Lucro Total do Corretor */}
        <div className="bg-white p-4 sm:p-4.5 rounded-xl border-2 border-emerald-600 bg-emerald-50/40 shadow-md space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-black text-emerald-950 uppercase">
            <span className="truncate">(=) Lucro Total AgroVenda</span>
            <Coins className="w-4 h-4 text-emerald-700 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-emerald-950 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalLucroAgroVenda)}>
            {formatCurrency(totalLucroAgroVenda)}
          </div>
          <span className="text-[11px] text-emerald-800 font-bold block truncate">
            Spread + Comissões
          </span>
        </div>
      </div>

      {/* Tabela de Conciliação e Margens */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-3 page-break-after print:shadow-none print:border-none">
        <div className="bg-[#091b2e] text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#df7b1b]" />
            <span className="text-xs font-black uppercase tracking-wider">
              Fechamento do Corretor — Confronto VP Comercial (Loja) vs. NF (Produtor)
            </span>
          </div>
          <span className="text-[11px] font-semibold text-amber-300 bg-black/30 px-2.5 py-0.5 rounded">
            Uso Estritamente Interno AgroVenda
          </span>
        </div>

        <div className="overflow-x-auto p-4 pt-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#132c4a] text-white font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Loja / Comprador</th>
                <th className="py-2.5 px-3">Produtor Rural</th>
                <th className="py-2.5 px-2 text-center">Nº VP</th>
                <th className="py-2.5 px-2 text-center">Nº NF</th>
                <th className="py-2.5 px-3 text-right">Caixas</th>
                <th className="py-2.5 px-3 text-right">Cotação Loja</th>
                <th className="py-2.5 px-3 text-right bg-blue-900/80 font-black">Total Comercial VP</th>
                <th className="py-2.5 px-3 text-right bg-gray-700">Total NF Produtor</th>
                <th className="py-2.5 px-3 text-right text-red-300">(-) FUNRURAL</th>
                <th className="py-2.5 px-3 text-right bg-emerald-950">Líquido Produtor</th>
                <th className="py-2.5 px-3 text-right bg-amber-900/90 font-black">Spread (VP - NF)</th>
                <th className="py-2.5 px-3 text-right bg-emerald-900 font-black">Lucro AgroVenda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {allItens.map((it, idx) => {
                const itemVP = Number(it.valorVP) || 0;
                const itemNF = Number(it.valorNF) || 0;
                const itemFunrural = Number(it.funrural) || 0;
                const itemLiquidoProd = Number(it.liquidoProdutor) || Math.max(0, itemNF - itemFunrural);
                const itemSpread = Number(it.spreadComercial) || Math.max(0, itemVP - itemNF);
                const itemComissao = Number(it.comissao) || 0;
                const itemLucro = itemSpread + itemComissao;

                return (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3 font-bold text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{it.client || 'Loja'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-700">
                      <div className="flex items-center gap-1.5">
                        <Tractor className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>{it.producer || it.origin || 'Produtor Rural'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-[#173e27]">{it.vp}</td>
                    <td className="py-3 px-2 text-center font-semibold text-gray-800">{it.nf}</td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                      {formatNumber(it.cxs, 2)} cx
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-blue-900 whitespace-nowrap">
                      R$ {Number(it.cotacao || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-blue-950 bg-blue-50/40 whitespace-nowrap">
                      {formatCurrency(itemVP)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900 bg-gray-50/50 whitespace-nowrap">
                      {formatCurrency(itemNF)}
                    </td>
                    <td className="py-3 px-3 text-right text-red-600 font-medium whitespace-nowrap">
                      -{formatCurrency(itemFunrural)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-950 bg-emerald-50/30 whitespace-nowrap">
                      {formatCurrency(itemLiquidoProd)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-amber-950 bg-amber-50/50 whitespace-nowrap">
                      {formatCurrency(itemSpread)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-950 bg-emerald-100/50 whitespace-nowrap">
                      {formatCurrency(itemLucro)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[#091b2e] font-black text-xs text-white border-t-2 border-amber-400">
              <tr>
                <td colSpan="4" className="py-3 px-3 uppercase text-amber-400 font-black">
                  TOTAL CONSOLIDADO CORRETOR
                </td>
                <td className="py-3 px-3 text-right font-black">
                  {formatNumber(allItens.reduce((acc, it) => acc + (Number(it.cxs) || 0), 0), 2)} cx
                </td>
                <td className="py-3 px-3 text-center">-</td>
                <td className="py-3 px-3 text-right font-black bg-blue-950 text-blue-200">
                  {formatCurrency(totalVP)}
                </td>
                <td className="py-3 px-3 text-right font-black bg-gray-800 text-gray-100">
                  {formatCurrency(totalNF)}
                </td>
                <td className="py-3 px-3 text-right font-black text-red-300">
                  -{formatCurrency(totalFunrural)}
                </td>
                <td className="py-3 px-3 text-right font-black bg-emerald-950 text-emerald-200">
                  {formatCurrency(totalLiquidoProdutor)}
                </td>
                <td className="py-3 px-3 text-right font-black bg-amber-950 text-amber-200">
                  {formatCurrency(totalSpread)}
                </td>
                <td className="py-3 px-3 text-right font-black bg-emerald-900 text-emerald-200">
                  {formatCurrency(totalLucroAgroVenda)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
