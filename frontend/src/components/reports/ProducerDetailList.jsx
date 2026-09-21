import React from 'react';
import { Tractor, ChevronDown, ChevronUp, Paperclip, ExternalLink } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export default function ProducerDetailList({ 
  producers = [], 
  expandedProducers = {}, 
  toggleExpandProducer 
}) {
  return (
    <div className="space-y-4 pt-2 print:space-y-6">
      <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2 print:text-xs">
        <Tractor className="w-4 h-4 text-emerald-800" />
        <span>Detalhamento Individual de Entregas por Produtor Rural (Base NF)</span>
      </h2>

      {producers.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-400 text-xs">
          Nenhuma entrega de produtor encontrada para o período selecionado.
        </div>
      ) : (
        producers.map((prodGroup, pIdx) => {
          const isExpanded = expandedProducers[prodGroup.producer] !== false; // Padrão aberto
          const itens = prodGroup.itens || [];

          return (
            <div key={pIdx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden page-break-avoid print:border print:border-gray-300 print:shadow-none print:mb-4">
              
              {/* Header do Produtor */}
              <div 
                onClick={() => toggleExpandProducer && toggleExpandProducer(prodGroup.producer)}
                className="bg-emerald-50/50 hover:bg-emerald-50 p-4 flex items-center justify-between cursor-pointer border-b border-gray-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Tractor className="w-4 h-4 text-emerald-800" />
                  <span className="text-xs font-black text-gray-900 uppercase tracking-wide">
                    {prodGroup.producer}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {itens.length} Entregas
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <span className="text-gray-500">
                    Total NF: <strong className="text-gray-900">{formatCurrency(prodGroup.valorTotalNF)}</strong>
                  </span>
                  <span className="text-gray-500">
                    Líquido Produtor: <strong className="text-emerald-800">{formatCurrency(prodGroup.liquidoProdutor)}</strong>
                  </span>
                  <span className="text-gray-500">
                    Já Repassado: <strong className="text-emerald-800">{formatCurrency(prodGroup.repassesPagos)}</strong>
                  </span>
                  <span className="text-gray-500">
                    Saldo a Pagar: <strong className="text-amber-800">{formatCurrency(prodGroup.saldoAPagar)}</strong>
                  </span>
                  
                  <span className="print:hidden">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </span>
                </div>
              </div>

              {/* Tabela de Entregas do Produtor */}
              <div className={`overflow-x-auto p-4 pt-2 ${isExpanded ? 'block' : 'hidden print:block'}`}>
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Nº da NF</th>
                      <th className="py-2.5 px-3">Produto / Cultura</th>
                      <th className="py-2.5 px-3">Loja Destino</th>
                      <th className="py-2.5 px-3 text-right">Peso NF (kg)</th>
                      <th className="py-2.5 px-3 text-right">Volumes (cx)</th>
                      <th className="py-2.5 px-3 text-right">Preço/kg NF</th>
                      <th className="py-2.5 px-3 text-right">Total da NF</th>
                      <th className="py-2.5 px-3 text-right text-red-600">FUNRURAL (1,63% Info)</th>
                      <th className="py-2.5 px-3 text-right bg-emerald-50 text-emerald-950 font-bold">Líquido Fiscal Est.</th>
                      <th className="py-2.5 px-3 text-right bg-emerald-50/70 text-emerald-900 font-bold">Já Repassado</th>
                      <th className="py-2.5 px-3 text-right bg-amber-50 text-amber-950 font-bold">Saldo a Repassar</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center print:hidden">Comprovante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itens.map((it, rIdx) => {
                      const isPaid = it.statusRepasse === 'Pago';
                      const isPartial = it.statusRepasse === 'Parcial';

                      return (
                        <tr key={rIdx} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-2 px-3 text-gray-600 font-medium whitespace-nowrap">
                            {it.date}
                          </td>
                          <td className="py-2 px-3 font-bold text-gray-900 whitespace-nowrap">
                            {it.nf}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-semibold text-gray-800">{it.product}</span>
                          </td>
                          <td className="py-2 px-3 text-gray-600 truncate max-w-[130px]" title={it.lojaDestino}>
                            {it.lojaDestino}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-700 whitespace-nowrap">
                            {formatNumber(it.pesoNF, 0)} kg
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                            {formatNumber(it.cxs, 2)}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-700 whitespace-nowrap">
                            {it.precoKg > 0 ? `R$ ${it.precoKg.toFixed(2)}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-black text-gray-900 whitespace-nowrap">
                            {formatCurrency(it.valorNF)}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-red-600 whitespace-nowrap">
                            -{formatCurrency(it.funrural)}
                          </td>
                          <td className="py-2 px-3 text-right font-black text-emerald-950 bg-emerald-50/40 whitespace-nowrap">
                            {formatCurrency(it.liquidoProdutor)}
                          </td>
                          <td className="py-2 px-3 text-right font-black text-emerald-800 bg-emerald-50/40 whitespace-nowrap">
                            {it.repassado > 0 ? formatCurrency(it.repassado) : <span className="text-gray-400 font-normal">-</span>}
                          </td>
                          <td className="py-2 px-3 text-right font-black text-amber-900 bg-amber-50/40 whitespace-nowrap">
                            {it.saldo > 0 ? formatCurrency(it.saldo) : <span className="text-gray-400 font-normal">-</span>}
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isPaid 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : (isPartial 
                                      ? 'bg-blue-100 text-blue-900' 
                                      : 'bg-amber-100 text-amber-900')
                              }`}>
                                {it.statusRepasse}
                              </span>
                              {it.repassado > 0 && (
                                <span className="text-[9px] font-extrabold text-gray-500">
                                  {it.paymentMethod === 'Cheque' ? '📄 Cheque' : (it.paymentMethod === 'TED/DOC' ? '🏦 TED/DOC' : '⚡ PIX')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap print:hidden">
                            {it.producerProofFile ? (
                              <a
                                href={`/uploads/${it.rawProducerProofFile || it.producerProofFile}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition-colors"
                                title="Ver comprovante bancário de repasse"
                              >
                                <Paperclip className="w-3 h-3 text-blue-600" />
                                <span>{it.paymentMethod || 'Comprovante'}</span>
                              </a>
                            ) : (
                              <span className="text-gray-400 text-[10px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#bfe2a5] font-black text-xs text-gray-950 border-t-2 border-emerald-800">
                      <td colSpan="4" className="py-2.5 px-3 uppercase">
                        SUBTOTAL {prodGroup.producer}
                      </td>
                      <td className="py-2.5 px-3 text-right">{formatNumber(prodGroup.pesoNF, 2)} kg</td>
                      <td className="py-2.5 px-3 text-right">{formatNumber(prodGroup.cxsVendidas, 2)}</td>
                      <td className="py-2.5 px-3 text-center">-</td>
                      <td className="py-2.5 px-3 text-right">{formatCurrency(prodGroup.valorTotalNF)}</td>
                      <td className="py-2.5 px-3 text-right text-red-900">-{formatCurrency(prodGroup.funrural)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-950 bg-[#aedb8e]">{formatCurrency(prodGroup.liquidoProdutor)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-950 bg-[#a7f3d0]">{formatCurrency(prodGroup.repassesPagos)}</td>
                      <td className="py-2.5 px-3 text-right text-amber-950 bg-[#fde68a]">{formatCurrency(prodGroup.saldoAPagar)}</td>
                      <td colSpan="2" className="py-2.5 px-3 text-center">-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
