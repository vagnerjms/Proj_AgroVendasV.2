import React from 'react';
import { Building2, ChevronDown, ChevronUp, Paperclip } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export default function StoreDetailList({ 
  stores = [], 
  expandedLojas = {}, 
  toggleExpand,
  showCommissions = false
}) {
  return (
    <div className="space-y-4 pt-2 print:space-y-6">
      <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2 print:text-xs">
        <span>
          {showCommissions 
            ? 'Detalhamento de Comissões por Venda / Loja (VPs)' 
            : 'Detalhamento Individual das Vendas por Loja (VPs)'}
        </span>
      </h2>

      {stores.map((lojaGroup, lIdx) => {
        const isExpanded = expandedLojas[lojaGroup.loja];
        return (
          <div key={lIdx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden page-break-avoid print:border print:border-gray-300 print:shadow-none print:mb-4">
            
            {/* Header da Loja */}
            <div 
              onClick={() => toggleExpand(lojaGroup.loja)}
              className="bg-gray-50 hover:bg-gray-100/80 p-4 flex items-center justify-between cursor-pointer border-b border-gray-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-[#173e27]" />
                <span className="text-xs font-black text-gray-900 uppercase tracking-wide">
                  {lojaGroup.loja}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  showCommissions ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {lojaGroup.itens?.length || 0} VPs
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                {!showCommissions ? (
                  <>
                    <span className="text-gray-500">
                      NF: <strong className="text-gray-900">{formatCurrency(lojaGroup.valorTotalNF)}</strong>
                    </span>
                    <span className="text-gray-500">
                      Liquidado: <strong className="text-emerald-800">{formatCurrency(lojaGroup.valorLiquidado)}</strong>
                    </span>
                    <span className="text-gray-500">
                      A Liquidar: <strong className="text-amber-800">{formatCurrency(lojaGroup.valorALiquidar)}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-500">
                      Total VP: <strong className="text-blue-900">{formatCurrency(lojaGroup.totalVendaAReceber)}</strong>
                    </span>
                    <span className="text-gray-500">
                      Liquidado: <strong className="text-emerald-800">{formatCurrency(lojaGroup.valorLiquidado)}</strong>
                    </span>
                    <span className="text-gray-500">
                      A Liquidar: <strong className="text-amber-800">{formatCurrency(lojaGroup.valorALiquidar)}</strong>
                    </span>
                    <span className="text-gray-500">
                      Comissão (3%): <strong className="text-blue-700">{formatCurrency(lojaGroup.totalComissao)}</strong>
                    </span>
                    <span className="text-gray-500">
                      Líquido Produtor: <strong className="text-emerald-800">{formatCurrency(lojaGroup.totalLiquidoProdutor)}</strong>
                    </span>
                  </>
                )}
                <span className="print:hidden">
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </span>
              </div>
            </div>

            {/* Tabela de Vendas da Loja */}
            <div className={`overflow-x-auto p-4 pt-2 ${isExpanded ? 'block' : 'hidden print:block'}`}>
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px]">
                  {showCommissions ? (
                    <tr>
                      <th className="py-2 px-3">Nº VP</th>
                      <th className="py-2 px-2">Data</th>
                      <th className="py-2 px-3">Nº NF</th>
                      <th className="py-2 px-3 text-right">Caixas</th>
                      <th className="py-2 px-3 text-right">Cotação Dia</th>
                      <th className="py-2 px-3 text-right">Valor Total VP</th>
                      <th className="py-2 px-3 text-right bg-emerald-50 text-emerald-950 font-bold">Valor Liquidado</th>
                      <th className="py-2 px-3 text-right bg-amber-50 text-amber-950 font-bold">Valor a Liquidar</th>
                      <th className="py-2 px-3 text-center">Taxa Com.</th>
                      <th className="py-2 px-3 text-right bg-blue-50/50 font-bold text-blue-900">Comissão (R$)</th>
                      <th className="py-2 px-3 text-right bg-emerald-50/50 font-bold text-emerald-950">Líquido Produtor (R$)</th>
                      <th className="py-2 px-3 text-center">Vencimento</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="py-2 px-3">Nº VP</th>
                      <th className="py-2 px-2">Data VP</th>
                      <th className="py-2 px-3">Nº NF</th>
                      <th className="py-2 px-2">Data NF</th>
                      <th className="py-2 px-3 text-right">Peso NF (kg)</th>
                      <th className="py-2 px-3 text-right">Peso Colheita (kg)</th>
                      <th className="py-2 px-3 text-right">Volumes / Caixas</th>
                      <th className="py-2 px-3 text-right">Preço/kg NF</th>
                      <th className="py-2 px-3 text-right">Valor Total NF</th>
                      <th className="py-2 px-3 text-right">FUNRURAL (1,63%)</th>
                      <th className="py-2 px-3 text-right">Cotação Dia</th>
                      <th className="py-2 px-3 text-right bg-emerald-50 text-emerald-950 font-bold">Valor Liquidado</th>
                      <th className="py-2 px-3 text-right bg-amber-50 text-amber-950 font-bold">Valor a Liquidar</th>
                      <th className="py-2 px-3 text-right">Líquido da NF</th>
                      <th className="py-2 px-3 text-center">Vencimento</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-center">Anexo / Imagem</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lojaGroup.itens?.map((it, rIdx) => {
                    const isSettled = it.paymentStatus === 'Recebido' || it.status === 'Concluído' || it.status === 'Recebido';
                    const isPartial = it.paymentStatus === 'Parcial';
                    const itLiquidado = Number(it.valorLiquidado ?? it.liquido) || 0;
                    const itALiquidar = Number(it.valorALiquidar) || 0;
                    const unitAbbr = it.unit?.toLowerCase().includes('saca') || it.product?.toLowerCase().includes('batata') ? 'sc' : (it.unit?.toLowerCase().includes('granel') ? 'kg' : 'cx');
                    const cotacaoUnit = it.cotacao <= 10.0 ? 'kg' : unitAbbr;

                    if (showCommissions) {
                      return (
                        <tr key={rIdx} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-2 px-3">
                            <div className="font-bold text-[#173e27]">{it.vp}</div>
                            <div className="text-[10px] text-gray-500 font-medium truncate max-w-[140px]" title={it.product}>
                              {it.product}
                            </div>
                            <div className="text-[10px] text-blue-800 font-medium truncate max-w-[140px]" title={`Produtor: ${it.producer || it.origin}`}>
                              🌾 {it.producer || it.origin || 'Produtor Rural'}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-gray-600">{it.dataVP}</td>
                          <td className="py-2 px-3 font-semibold text-gray-800">{it.nf}</td>
                          <td className="py-2 px-3 text-right font-bold text-gray-900">
                            {formatNumber(it.cxs, 2)} {unitAbbr}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-blue-900">
                            R$ {Number(it.cotacao || 0).toFixed(2)}/{cotacaoUnit}
                          </td>
                          <td className="py-2 px-3 text-right font-black text-blue-950">{formatCurrency(it.valorVP)}</td>
                          <td className="py-2 px-3 text-right font-black text-emerald-800 bg-emerald-50/40">
                            {itLiquidado > 0 ? formatCurrency(itLiquidado) : <span className="text-gray-400 font-normal">-</span>}
                          </td>
                          <td className="py-2 px-3 text-right font-black text-amber-900 bg-amber-50/40">
                            {itALiquidar > 0 ? formatCurrency(itALiquidar) : <span className="text-gray-400 font-normal">-</span>}
                          </td>
                          <td className="py-2 px-3 text-center font-semibold text-gray-700">{Number(it.taxaComissao ?? 3.0).toFixed(1)}%</td>
                          <td className="py-2 px-3 text-right font-black text-blue-900 bg-blue-50/30">
                            {formatCurrency(it.comissao)}
                          </td>
                          <td className="py-2 px-3 text-right font-black text-emerald-950 bg-emerald-50/30">
                            {formatCurrency(it.liquidoProdutor)}
                          </td>
                          <td className="py-2 px-3 text-center text-gray-600">{it.venc}</td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isSettled 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : (isPartial 
                                      ? 'bg-blue-100 text-blue-900 border border-blue-200' 
                                      : 'bg-amber-100 text-amber-900')
                              }`}>
                                {isSettled ? 'Liquidado' : (isPartial ? 'Parcial' : 'A Receber')}
                              </span>
                              {itLiquidado > 0 && (
                                <span className="text-[9px] font-extrabold text-gray-500">
                                  {it.paymentMethod === 'Cheque' ? '📄 Cheque' : (it.paymentMethod === 'TED/DOC' ? '🏦 TED/DOC' : '⚡ PIX')}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={rIdx} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-2 px-3">
                          <div className="font-bold text-[#173e27]">{it.vp}</div>
                          <div className="text-[10px] text-gray-600 font-semibold truncate max-w-[220px]" title={it.product}>
                            {it.product}
                          </div>
                          <div className="text-[10px] text-blue-800 font-medium truncate max-w-[220px]" title={`Produtor: ${it.producer || it.origin}`}>
                            🌾 {it.producer || it.origin || 'Produtor Rural'}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-gray-600">{it.dataVP}</td>
                        <td className="py-2 px-3 font-semibold text-gray-800">{it.nf}</td>
                        <td className="py-2 px-2 text-gray-600">{it.dataNF}</td>
                        <td className="py-2 px-3 text-right text-gray-600">{formatNumber(it.pesoNF, 0)} kg</td>
                        <td className="py-2 px-3 text-right font-bold text-gray-900">{formatNumber(it.pesoColheita, 0)} kg</td>
                        <td className="py-2 px-3 text-right font-bold text-gray-900">
                          {formatNumber(it.cxs, 2)} {unitAbbr}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-700">{it.precoKg > 0 ? `R$ ${it.precoKg.toFixed(2)}` : '-'}</td>
                        <td className="py-2 px-3 text-right font-bold text-gray-900">{formatCurrency(it.valorNF)}</td>
                        <td className="py-2 px-3 text-right text-red-600">-{formatCurrency(it.funrural)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-blue-900">
                          R$ {Number(it.cotacao || 0).toFixed(2)}/{cotacaoUnit}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-emerald-800 bg-emerald-50/40">
                          {itLiquidado > 0 ? formatCurrency(itLiquidado) : <span className="text-gray-400 font-normal">-</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-amber-900 bg-amber-50/40">
                          {itALiquidar > 0 ? formatCurrency(itALiquidar) : <span className="text-gray-400 font-normal">-</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-emerald-950 bg-emerald-50/30">
                          {formatCurrency(it.liquidoNF || Math.max(0, (Number(it.valorNF) || 0) - (Number(it.funrural) || 0)))}
                        </td>
                        <td className="py-2 px-3 text-center text-gray-600">{it.venc}</td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isSettled 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : (isPartial 
                                    ? 'bg-blue-100 text-blue-900 border border-blue-200' 
                                    : 'bg-amber-100 text-amber-900')
                            }`}>
                              {isSettled ? 'Liquidado' : (isPartial ? 'Parcial' : 'A Receber')}
                            </span>
                            {itLiquidado > 0 && (
                              <span className="text-[9px] font-extrabold text-gray-500">
                                {it.paymentMethod === 'Cheque' ? '📄 Cheque' : (it.paymentMethod === 'TED/DOC' ? '🏦 TED/DOC' : '⚡ PIX')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {it.evidenceFile && it.evidenceFile !== '-' ? (
                            <a
                              href={`/uploads/${it.rawEvidenceFile || it.evidenceFile}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition-colors max-w-[130px] truncate"
                              title={it.evidenceFile}
                            >
                              <Paperclip className="w-3 h-3 text-blue-600 shrink-0" />
                              <span className="truncate">{it.evidenceFile}</span>
                            </a>
                          ) : (
                            <span className="text-gray-400 text-[10px]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                  {showCommissions ? (
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 uppercase text-gray-700 font-extrabold">
                        TOTAL {lojaGroup.loja.split(' ')[0]}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-900">{formatNumber(lojaGroup.cxsVendidas, 2)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-400">-</td>
                      <td className="py-2.5 px-3 text-right font-black text-blue-900">{formatCurrency(lojaGroup.totalVendaAReceber)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-950 bg-emerald-100/60">{formatCurrency(lojaGroup.valorLiquidado)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-amber-950 bg-amber-100/60">{formatCurrency(lojaGroup.valorALiquidar)}</td>
                      <td className="py-2.5 px-3 text-center">3,0%</td>
                      <td className="py-2.5 px-3 text-right font-black text-blue-950 bg-blue-100">{formatCurrency(lojaGroup.totalComissao)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-950 bg-emerald-100">{formatCurrency(lojaGroup.totalLiquidoProdutor)}</td>
                      <td colSpan={2} className="py-2.5 px-3 text-center text-gray-600 font-bold text-[10px]">
                        {lojaGroup.itens?.filter(it => it.paymentStatus === 'Recebido' || it.status === 'Concluído' || it.status === 'Recebido').length} / {lojaGroup.itens?.length || 0} Quitados
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 uppercase text-gray-700 font-extrabold">
                        TOTAL {lojaGroup.loja.split(' ')[0]}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-700 font-bold">{formatNumber(lojaGroup.pesoNF, 2)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-900">{formatNumber(lojaGroup.pesoColheita, 2)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-900">{formatNumber(lojaGroup.cxsVendidas, 2)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-400">-</td>
                      <td className="py-2.5 px-3 text-right font-black text-gray-900">{formatCurrency(lojaGroup.valorTotalNF)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-red-600">-{formatCurrency(lojaGroup.funrural)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-400">-</td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-950 bg-emerald-100/60">{formatCurrency(lojaGroup.valorLiquidado)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-amber-950 bg-amber-100/60">{formatCurrency(lojaGroup.valorALiquidar)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-950 bg-emerald-100/60">{formatCurrency(lojaGroup.liquidoNF)}</td>
                      <td colSpan={3} className="py-2.5 px-3 text-center text-gray-600 font-bold text-[10px]">
                        {lojaGroup.itens?.filter(it => it.paymentStatus === 'Recebido' || it.status === 'Concluído' || it.status === 'Recebido').length} / {lojaGroup.itens?.length || 0} Quitados
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
