import React from 'react';
import { Building2, ChevronDown, ChevronUp, Paperclip, FileText } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { authorizedUploadUrl, formatQuantity, resolveProductUnit, abbreviateUnit, formatRomaneioNumber } from '../../utils/dataHelpers';
import { DATA_LABELS } from '../../constants/dataLabels';

function AttachmentLinks({ it }) {
  const hasEvidence = it.evidenceFile && it.evidenceFile !== '-';
  const hasNf = it.rawNfFile || (it.nfFile && it.nfFile !== '-' && it.nfFile !== 'SEM NF' && it.nfFile !== 'Pendente');
  if (!hasEvidence && !hasNf) {
    return <span className="text-gray-400 text-[10px]">-</span>;
  }
  return (
    <div className="flex flex-col items-center gap-1">
      {hasEvidence && (
        <a
          href={authorizedUploadUrl(it.rawEvidenceFile || it.evidenceFile)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition-colors max-w-[140px] truncate"
          title={`Pedido/Romaneio: ${it.evidenceFile}`}
        >
          <Paperclip className="w-3 h-3 shrink-0" />
          <span className="truncate">Pedido</span>
        </a>
      )}
      {hasNf && (
        <a
          href={authorizedUploadUrl(it.rawNfFile || it.nfFile)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition-colors max-w-[140px] truncate"
          title={`NF: ${it.nfFile}`}
        >
          <FileText className="w-3 h-3 shrink-0" />
          <span className="truncate">NF</span>
        </a>
      )}
    </div>
  );
}

function romaneioOf(it) {
  if (it.romaneioNumber != null && String(it.romaneioNumber).trim() !== '') {
    return formatRomaneioNumber(it.romaneioNumber) || String(it.romaneioNumber);
  }
  const notes = it.notes || it.observacoes || '';
  const m = String(notes).match(/Planilha\s*VP:\s*(\d+)/i);
  return m ? formatRomaneioNumber(m[1]) : '—';
}

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
          <div key={lIdx} className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden page-break-avoid print:border print:border-gray-300 print:shadow-none print:mb-4 ${lIdx < stores.length - 1 ? 'print:page-break-after' : ''}`}>
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
                      VP: <strong className="text-blue-900">{formatCurrency(lojaGroup.totalVendaAReceber)}</strong>
                    </span>
                    <span className="text-gray-500">
                      NF: <strong className="text-gray-900">{formatCurrency(lojaGroup.valorTotalNF)}</strong>
                    </span>
                    <span className="text-gray-500">
                      Liquidado: <strong className="text-emerald-800">{formatCurrency(lojaGroup.valorLiquidado)}</strong>
                    </span>
                    <span className="text-gray-500">
                      Saldo a receber: <strong className="text-amber-800">{formatCurrency(lojaGroup.valorALiquidar)}</strong>
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

            <div className={`overflow-x-auto p-4 pt-2 ${isExpanded ? 'block' : 'hidden print:block'}`}>
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px]">
                  {showCommissions ? (
                    <tr>
                      <th className="py-2 px-3">Nº VP</th>
                      <th className="py-2 px-2">Data</th>
                      <th className="py-2 px-3">Nº NF</th>
                      <th className="py-2 px-3 text-right">{DATA_LABELS.quantity}</th>
                      <th className="py-2 px-3 text-right bg-blue-50 text-blue-950">Valor VP</th>
                      <th className="py-2 px-3 text-right">Valor NF</th>
                      <th className="py-2 px-3 text-right bg-emerald-50 text-emerald-950 font-bold">Valor Liquidado</th>
                      <th className="py-2 px-3 text-right bg-amber-50 text-amber-950 font-bold">Valor a Liquidar</th>
                      <th className="py-2 px-3 text-center">Taxa Com.</th>
                      <th className="py-2 px-3 text-right bg-blue-50/50 font-bold text-blue-900">Comissão (R$)</th>
                      <th className="py-2 px-3 text-right bg-emerald-50/50 font-bold text-emerald-950">Líquido Produtor (R$)</th>
                      <th className="py-2 px-3 text-center">Vencimento</th>
                      <th className="py-2 px-3 text-center whitespace-nowrap min-w-[6.5rem]">Status</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="py-2 px-3 print-hide-col">{DATA_LABELS.vpNumber}</th>
                      <th className="py-2 px-2 whitespace-nowrap">{DATA_LABELS.romaneioNumber}</th>
                      <th className="py-2 px-2">Data</th>
                      <th className="py-2 px-2">Produtor</th>
                      <th className="py-2 px-2">Produto</th>
                      <th className="py-2 px-3 print-hide-col">{DATA_LABELS.nfNumber}</th>
                      <th className="py-2 px-3 text-right print-hide-col">{DATA_LABELS.weightKg}</th>
                      <th className="py-2 px-3 text-right print-hide-col">{DATA_LABELS.quantity}</th>
                      <th className="py-2 px-3 text-right print-hide-col">Cotação</th>
                      <th className="py-2 px-3 text-right bg-blue-50 text-blue-950 font-bold">{DATA_LABELS.valorNegociadoVP}</th>
                      <th className="py-2 px-3 text-right">{DATA_LABELS.valorNF}</th>
                      <th className="py-2 px-3 text-right bg-amber-50 text-amber-950 font-bold print-hide-col">{DATA_LABELS.saldoAReceber}</th>
                      <th className="py-2 px-3 text-center">Vencimento</th>
                      <th className="py-2 px-3 text-center whitespace-nowrap min-w-[6.5rem]">Status</th>
                      <th className="py-2 px-3 text-right">Fundo rural</th>
                      <th className="py-2 px-3 text-center print-hide-col">Anexos</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lojaGroup.itens?.map((it, rIdx) => {
                    const isSettled = it.paymentStatus === 'Recebido' || it.status === 'Concluído' || it.status === 'Recebido';
                    const isPartial = it.paymentStatus === 'Parcial';
                    const itLiquidado = Number(it.valorLiquidado ?? it.liquido) || 0;
                    const itALiquidar = Number(it.valorALiquidar) || 0;
                    const qtyLabel = formatQuantity(it.cxs, abbreviateUnit(resolveProductUnit(it)));
                    const liquidoProdutor = it.liquidoPeloVP ?? it.liquidoProdutor ?? 0;
                    const produtorLabel = it.producer || it.origin || '—';
                    const funruralVal = Number(it.funrural) || 0;
                    const statusLabel = isSettled ? 'Liquidado' : (isPartial ? 'Parcial' : 'A Receber');
                    const statusClass = isSettled
                      ? 'bg-emerald-100 text-emerald-800'
                      : (isPartial ? 'bg-blue-100 text-blue-900 border border-blue-200' : 'bg-amber-100 text-amber-900');

                    if (showCommissions) {
                      return (
                        <tr key={rIdx} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-2 px-3">
                            <div className="font-bold text-[#173e27]">{it.vp}</div>
                            <div className="text-[10px] text-gray-500 font-medium truncate max-w-[140px]" title={it.product}>{it.product}</div>
                          </td>
                          <td className="py-2 px-2 text-gray-600">{it.dataVP}</td>
                          <td className="py-2 px-3 font-semibold text-gray-800">{it.nf}</td>
                          <td className="py-2 px-3 text-right font-bold text-gray-900">{qtyLabel}</td>
                          <td className="py-2 px-3 text-right font-black text-blue-950 bg-blue-50/40">{formatCurrency(it.valorVP)}</td>
                          <td className="py-2 px-3 text-right font-bold text-gray-900">{formatCurrency(it.valorNF)}</td>
                          <td className="py-2 px-3 text-right font-black text-emerald-800 bg-emerald-50/40">
                            {itLiquidado > 0 ? formatCurrency(itLiquidado) : <span className="text-gray-400 font-normal">-</span>}
                          </td>
                          <td className="py-2 px-3 text-right font-black text-amber-900 bg-amber-50/40">
                            {itALiquidar > 0 ? formatCurrency(itALiquidar) : <span className="text-gray-400 font-normal">-</span>}
                          </td>
                          <td className="py-2 px-3 text-center font-semibold text-gray-700">{Number(it.taxaComissao ?? 3.0).toFixed(1)}%</td>
                          <td className="py-2 px-3 text-right font-black text-blue-900 bg-blue-50/30">{formatCurrency(it.comissao)}</td>
                          <td className="py-2 px-3 text-right font-black text-emerald-950 bg-emerald-50/30">{formatCurrency(liquidoProdutor)}</td>
                          <td className="py-2 px-3 text-center text-gray-600">{it.venc}</td>
                          <td className="py-2 px-3 text-center whitespace-nowrap min-w-[6.5rem]">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={rIdx} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-2 px-3 print-hide-col">
                          <div className="font-bold text-[#173e27]">{it.vp}</div>
                        </td>
                        <td className="py-2 px-2 font-mono text-gray-800 font-semibold whitespace-nowrap">{romaneioOf(it)}</td>
                        <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{it.dataVP}</td>
                        <td className="py-2 px-2 text-gray-800 font-medium truncate max-w-[160px]" title={produtorLabel}>{produtorLabel}</td>
                        <td className="py-2 px-2 text-gray-800 font-semibold truncate max-w-[140px]" title={it.product}>{it.product || '—'}</td>
                        <td className="py-2 px-3 font-semibold text-gray-800 print-hide-col">{it.nf}</td>
                        <td className="py-2 px-3 text-right text-gray-600 print-hide-col">{formatNumber(it.pesoNF || it.pesoColheita, 0)}</td>
                        <td className="py-2 px-3 text-right font-bold text-gray-900 print-hide-col">{qtyLabel}</td>
                        <td className="py-2 px-3 text-right text-gray-700 print-hide-col">
                          {Number(it.cotacao) > 0 ? formatCurrency(it.cotacao) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-blue-950 bg-blue-50/40">{formatCurrency(it.valorVP)}</td>
                        <td className="py-2 px-3 text-right font-bold text-gray-900">
                          {Number(it.valorNF) > 0 ? formatCurrency(it.valorNF) : <span className="text-amber-700 text-[10px]">SEM NF</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-amber-900 bg-amber-50/40 print-hide-col">
                          {itALiquidar > 0 ? formatCurrency(itALiquidar) : <span className="text-gray-400 font-normal">-</span>}
                        </td>
                        <td className="py-2 px-3 text-center text-gray-600 whitespace-nowrap">{it.venc}</td>
                        <td className="py-2 px-3 text-center whitespace-nowrap min-w-[6.5rem]">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-gray-800">
                          {funruralVal > 0 ? formatCurrency(funruralVal) : <span className="text-gray-400 font-normal">-</span>}
                        </td>
                        <td className="py-2 px-3 text-center print-hide-col">
                          <AttachmentLinks it={it} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-100 font-bold text-xs border-t-2 border-gray-300">
                  {showCommissions ? (
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 uppercase text-gray-700 font-extrabold">TOTAL {lojaGroup.loja.split(' ')[0]}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-900">{formatQuantity(lojaGroup.cxsVendidas)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-blue-900">{formatCurrency(lojaGroup.totalVendaAReceber)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-gray-900">{formatCurrency(lojaGroup.valorTotalNF)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-950 bg-emerald-100/60">{formatCurrency(lojaGroup.valorLiquidado)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-amber-950 bg-amber-100/60">{formatCurrency(lojaGroup.valorALiquidar)}</td>
                      <td className="py-2.5 px-3 text-center">3,0%</td>
                      <td className="py-2.5 px-3 text-right font-black text-blue-950 bg-blue-100">{formatCurrency(lojaGroup.totalComissao)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-950 bg-emerald-100">{formatCurrency(lojaGroup.totalLiquidoProdutor)}</td>
                      <td colSpan={2} className="py-2.5 px-3 text-center text-gray-600 font-bold text-[10px]">
                        {lojaGroup.itens?.filter(it => it.paymentStatus === 'Recebido' || it.status === 'Concluído').length} / {lojaGroup.itens?.length || 0} Quitados
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 uppercase text-gray-700 font-extrabold">TOTAL {lojaGroup.loja.split(' ')[0]}</td>
                      <td className="py-2.5 px-3 print-hide-col" />
                      <td className="py-2.5 px-3 text-right font-bold text-gray-900 print-hide-col">{formatNumber(lojaGroup.pesoNF, 0)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-900 print-hide-col">{formatQuantity(lojaGroup.cxsVendidas)}</td>
                      <td className="py-2.5 px-3 print-hide-col" />
                      <td className="py-2.5 px-3 text-right font-black text-blue-900">{formatCurrency(lojaGroup.totalVendaAReceber)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-gray-900">{formatCurrency(lojaGroup.valorTotalNF)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-amber-950 bg-amber-100/60 print-hide-col">{formatCurrency(lojaGroup.valorALiquidar)}</td>
                      <td colSpan={2} className="py-2.5 px-3" />
                      <td className="py-2.5 px-3 text-right font-black text-gray-900">
                        {formatCurrency(lojaGroup.itens?.reduce((acc, it) => acc + (Number(it.funrural) || 0), 0) || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-600 font-bold text-[10px] print-hide-col">
                        {lojaGroup.itens?.filter(it => it.paymentStatus === 'Recebido' || it.status === 'Concluído').length} / {lojaGroup.itens?.length || 0} Quitados
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
