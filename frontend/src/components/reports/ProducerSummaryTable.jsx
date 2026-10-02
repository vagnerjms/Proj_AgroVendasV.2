import React from 'react';
import { Tractor, FileText, CheckCircle2, Clock } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { DATA_LABELS } from '../../constants/dataLabels';

/**
 * Prestação de contas ao produtor — base valor negociado (VP),
 * alinhada à planilha "Valores por carga". FUNRURAL só na Apuração.
 */
export default function ProducerSummaryTable({
  producers = [],
  totalGeral = {},
  selectedProducer = 'ALL'
}) {
  const valorNegociado = totalGeral.valorTotalVP ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-bold text-blue-900 uppercase">
            <span className="truncate">{DATA_LABELS.valorNegociadoVP}</span>
            <FileText className="w-4 h-4 text-blue-700 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-blue-950 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(valorNegociado)}>
            {formatCurrency(valorNegociado)}
          </div>
          <span className="text-[11px] text-blue-700 block truncate">
            {totalGeral.pedidos || 0} cargas · NF ref. {formatCurrency(totalGeral.valorTotalNF)}
          </span>
        </div>

        <div className="bg-white p-4 sm:p-4.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/20 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-black text-emerald-900 uppercase">
            <span className="truncate">Já Repassado</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-emerald-700 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalGeral.repassesPagos)}>
            {formatCurrency(totalGeral.repassesPagos)}
          </div>
          <span className="text-[11px] text-emerald-800 font-semibold block truncate">
            Pagamentos PIX/TED realizados
          </span>
        </div>

        <div className="bg-white p-4 sm:p-4.5 rounded-xl border-2 border-amber-400 bg-amber-50/30 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-black text-amber-900 uppercase">
            <span className="truncate">Saldo a Pagar</span>
            <Clock className="w-4 h-4 text-amber-600 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-amber-950 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalGeral.saldoAPagar)}>
            {formatCurrency(totalGeral.saldoAPagar)}
          </div>
          <span className="text-[11px] text-amber-800 font-semibold block truncate">
            Sobre o valor negociado
          </span>
        </div>

        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
            <span className="truncate">{DATA_LABELS.valorNF}</span>
            <FileText className="w-4 h-4 text-gray-500 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-gray-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalGeral.valorTotalNF)}>
            {formatCurrency(totalGeral.valorTotalNF)}
          </div>
          <span className="text-[11px] text-gray-400 block truncate">
            Referência fiscal
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-3 page-break-after print:shadow-none print:border-none">
        <div className="bg-[#173e27] text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tractor className="w-4 h-4 text-emerald-200" />
            <span className="text-xs font-black uppercase tracking-wider">
              Resumo por Produtor — Base {DATA_LABELS.valorNegociadoVP}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-100 bg-emerald-900/40 px-2.5 py-0.5 rounded">
            Alinhado à planilha Valores por carga
          </span>
        </div>

        <div className="overflow-x-auto p-4 pt-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#1e5234] text-white font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Produtor Rural</th>
                <th className="py-2.5 px-2 text-center">Cargas</th>
                <th className="py-2.5 px-2 text-center">NFs</th>
                <th className="py-2.5 px-3 text-right">Peso (kg)</th>
                <th className="py-2.5 px-3 text-right bg-blue-900/40">{DATA_LABELS.valorNegociadoVP}</th>
                <th className="py-2.5 px-3 text-right">{DATA_LABELS.valorNF}</th>
                <th className="py-2.5 px-3 text-right bg-[#166534]">Já Repassado</th>
                <th className="py-2.5 px-3 text-right bg-[#92400e]">Saldo a Pagar</th>
                <th className="py-2.5 px-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {producers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-gray-400">
                    Nenhum lançamento de produtor encontrado para o período/filtro selecionado.
                  </td>
                </tr>
              ) : (
                producers.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3 font-bold text-gray-900">
                      <span className="inline-flex items-center gap-2">
                        <Tractor className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                        <span>{row.producer}</span>
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-gray-900">{row.pedidos}</td>
                    <td className="py-3 px-2 text-center font-medium text-gray-700">{row.nfs}</td>
                    <td className="py-3 px-3 text-right text-gray-700 font-medium">{formatNumber(row.pesoNF, 0)}</td>
                    <td className="py-3 px-3 text-right font-black text-blue-950 bg-blue-50/40">
                      {formatCurrency(row.valorTotalVP)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900">{formatCurrency(row.valorTotalNF)}</td>
                    <td className="py-3 px-3 text-right font-black text-emerald-800">{formatCurrency(row.repassesPagos)}</td>
                    <td className="py-3 px-3 text-right font-black text-amber-900">{formatCurrency(row.saldoAPagar)}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        row.status === 'Quitado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : row.status === 'Parcial'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-amber-100 text-amber-900'
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
                <td className="py-3 px-3 uppercase">
                  {selectedProducer === 'ALL' ? 'TOTAL GERAL' : `TOTAL (${selectedProducer})`}
                </td>
                <td className="py-3 px-2 text-center">{totalGeral.pedidos}</td>
                <td className="py-3 px-2 text-center">{totalGeral.nfs}</td>
                <td className="py-3 px-3 text-right">{formatNumber(totalGeral.pesoNF, 0)}</td>
                <td className="py-3 px-3 text-right bg-[#93c5fd]">{formatCurrency(totalGeral.valorTotalVP)}</td>
                <td className="py-3 px-3 text-right">{formatCurrency(totalGeral.valorTotalNF)}</td>
                <td className="py-3 px-3 text-right">{formatCurrency(totalGeral.repassesPagos)}</td>
                <td className="py-3 px-3 text-right">{formatCurrency(totalGeral.saldoAPagar)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
