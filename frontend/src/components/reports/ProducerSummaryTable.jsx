import React from 'react';
import { Tractor, FileText, CheckCircle2, DollarSign, Clock, ShieldCheck } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export default function ProducerSummaryTable({ 
  producers = [], 
  totalGeral = {}, 
  selectedProducer = 'ALL' 
}) {
  return (
    <div className="space-y-6">
      
      {/* 5 Cards de Resumo Exclusivo do Produtor (Base 100% Nota Fiscal) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        
        {/* Card 1: Total da Operação (NF a Repassar) */}
        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
            <span className="truncate">Total Operação (NF)</span>
            <FileText className="w-4 h-4 text-blue-700 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-gray-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalGeral.valorTotalNF)}>
            {formatCurrency(totalGeral.valorTotalNF)}
          </div>
          <span className="text-[11px] text-gray-400 block truncate">
            {totalGeral.nfs || 0} Notas Fiscais emitidas
          </span>
        </div>

        {/* Card 2: Total Já Repassado */}
        <div className="bg-white p-4 sm:p-4.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/20 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-black text-emerald-900 uppercase">
            <span className="truncate">Total Já Repassado</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-emerald-700 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalGeral.repassesPagos)}>
            {formatCurrency(totalGeral.repassesPagos)}
          </div>
          <span className="text-[11px] text-emerald-800 font-semibold block truncate">
            Pagamentos PIX/TED realizados
          </span>
        </div>

        {/* Card 3: Saldo a Repassar */}
        <div className="bg-white p-4 sm:p-4.5 rounded-xl border-2 border-amber-400 bg-amber-50/30 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-black text-amber-900 uppercase">
            <span className="truncate">Saldo a Repassar</span>
            <Clock className="w-4 h-4 text-amber-600 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-amber-950 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalGeral.saldoAPagar)}>
            {formatCurrency(totalGeral.saldoAPagar)}
          </div>
          <span className="text-[11px] text-amber-800 font-semibold block truncate">
            Pendente de transferência
          </span>
        </div>

        {/* Card 4: FUNRURAL (1,63% Informativo) */}
        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
            <span className="truncate">FUNRURAL (1,63% Info)</span>
            <ShieldCheck className="w-4 h-4 text-red-600 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-red-600 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalGeral.funrural)}>
            {formatCurrency(totalGeral.funrural)}
          </div>
          <span className="text-[11px] text-gray-400 block truncate">
            Tributo a recolher pelo produtor
          </span>
        </div>

        {/* Card 5: Líquido Fiscal Estimado */}
        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
            <span className="truncate">Líquido Fiscal Est.</span>
            <DollarSign className="w-4 h-4 text-emerald-700 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-emerald-950 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalGeral.liquidoProdutor)}>
            {formatCurrency(totalGeral.liquidoProdutor)}
          </div>
          <span className="text-[11px] text-gray-400 block truncate">
            Total NF - FUNRURAL
          </span>
        </div>
      </div>

      {/* Tabela de Consolidação por Produtor */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-3 page-break-after print:shadow-none print:border-none">
        <div className="bg-[#173e27] text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tractor className="w-4 h-4 text-emerald-200" />
            <span className="text-xs font-black uppercase tracking-wider">
              Resumo por Produtor Rural — Base Estrita no Valor da Nota Fiscal (NF)
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-100 bg-emerald-900/40 px-2.5 py-0.5 rounded">
            Repasse Integral da NF (FUNRURAL Informativo 1,63%)
          </span>
        </div>

        <div className="overflow-x-auto p-4 pt-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#1e5234] text-white font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Produtor Rural (Origem)</th>
                <th className="py-2.5 px-2 text-center">NFs</th>
                <th className="py-2.5 px-2 text-center">Entregas</th>
                <th className="py-2.5 px-3 text-right">Peso NF (kg)</th>
                <th className="py-2.5 px-3 text-right">CXS Entregues</th>
                <th className="py-2.5 px-3 text-right">Total Faturado NF</th>
                <th className="py-2.5 px-3 text-right text-red-200">FUNRURAL (1,63% Info)</th>
                <th className="py-2.5 px-3 text-right bg-[#14532d]">Líquido Fiscal Est.</th>
                <th className="py-2.5 px-3 text-right bg-[#166534]">Já Repassado (R$)</th>
                <th className="py-2.5 px-3 text-right bg-[#92400e]">Saldo a Pagar (R$)</th>
                <th className="py-2.5 px-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {producers.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-8 text-center text-gray-400">
                    Nenhum lançamento de produtor encontrado para o período/filtro selecionado.
                  </td>
                </tr>
              ) : (
                producers.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3 font-bold text-gray-900 flex items-center gap-2">
                      <Tractor className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                      <span>{row.producer}</span>
                    </td>
                    <td className="py-3 px-2 text-center font-medium text-gray-700">{row.nfs}</td>
                    <td className="py-3 px-2 text-center font-bold text-gray-900">{row.pedidos}</td>
                    <td className="py-3 px-3 text-right text-gray-700 font-medium">{formatNumber(row.pesoNF, 2)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-800">{formatNumber(row.cxsVendidas, 2)}</td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900">{formatCurrency(row.valorTotalNF)}</td>
                    <td className="py-3 px-3 text-right text-red-600 font-medium">-{formatCurrency(row.funrural)}</td>
                    <td className="py-3 px-3 text-right font-black text-emerald-950 bg-emerald-50/50">
                      {formatCurrency(row.liquidoProdutor)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-800 bg-emerald-50/60">
                      {row.repassesPagos > 0 ? formatCurrency(row.repassesPagos) : <span className="text-gray-400 font-normal">-</span>}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-amber-900 bg-amber-50/60">
                      {row.saldoAPagar > 0 ? formatCurrency(row.saldoAPagar) : <span className="text-gray-400 font-normal">-</span>}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        row.status === 'Quitado' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : (row.status === 'Parcial' 
                              ? 'bg-blue-100 text-blue-900' 
                              : 'bg-amber-100 text-amber-900')
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-[#bfe2a5] font-black text-xs text-gray-950 border-t-2 border-emerald-800">
              <tr>
                <td className="py-3 px-3 uppercase font-black text-gray-950">
                  {selectedProducer === 'ALL' ? 'TOTAL GERAL PRODUTORES' : `TOTAL (${selectedProducer})`}
                </td>
                <td className="py-3 px-2 text-center font-black">{totalGeral.nfs || 0}</td>
                <td className="py-3 px-2 text-center font-black">{totalGeral.pedidos || 0}</td>
                <td className="py-3 px-3 text-right font-black">{formatNumber(totalGeral.pesoNF, 2)}</td>
                <td className="py-3 px-3 text-right font-black">{formatNumber(totalGeral.cxsVendidas, 2)}</td>
                <td className="py-3 px-3 text-right font-black">{formatCurrency(totalGeral.valorTotalNF)}</td>
                <td className="py-3 px-3 text-right font-black text-red-900">-{formatCurrency(totalGeral.funrural)}</td>
                <td className="py-3 px-3 text-right font-black text-emerald-950 bg-[#aedb8e]">
                  {formatCurrency(totalGeral.liquidoProdutor)}
                </td>
                <td className="py-3 px-3 text-right font-black text-emerald-950 bg-[#a7f3d0]">
                  {formatCurrency(totalGeral.repassesPagos)}
                </td>
                <td className="py-3 px-3 text-right font-black text-amber-950 bg-[#fde68a]">
                  {formatCurrency(totalGeral.saldoAPagar)}
                </td>
                <td className="py-3 px-2 text-center font-black">-</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-4 py-2.5 bg-emerald-50/70 border-t border-emerald-100 flex items-center justify-between text-[11px] text-emerald-950 font-medium">
          <span>🌾 <strong>Nota Contábil:</strong> A AgroVenda repassa 100% do valor faturado das notas ao Produtor Rural. O FUNRURAL (1,63%) é discriminado como indicativo fiscal para escrituração e retenção direta pelo produtor.</span>
        </div>
      </div>
    </div>
  );
}
