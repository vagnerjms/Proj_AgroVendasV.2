import React from 'react';
import { 
  X, 
  FileText, 
  Paperclip, 
  Printer, 
  DollarSign 
} from 'lucide-react';
import { formatCurrency, formatDate, formatNumber, getCleanFileName } from '../../utils/formatters';
import { calculateLiquidation } from '../../utils/calculations';

/**
 * Modal Detalhado de Rastreio da Venda / VP
 * Exibe dados cadastrais, anexos de carga e comprovantes, itens da operação com pesagens,
 * demonstrativo financeiro e histórico de pagamentos e repasses.
 */
export default function SaleDetailModal({
  viewSale,
  onClose,
  onOpenContract,
  onOpenSettle,
  getValorTotalVP
}) {
  if (!viewSale) return null;

  const liq = calculateLiquidation(viewSale);

  const calculateVP = (sale) => {
    if (typeof getValorTotalVP === 'function') {
      return getValorTotalVP(sale);
    }
    return Number(sale.valorTotalVP) || Number(sale.totalOperation) || 0;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              {viewSale.operationType}
            </span>
            <h3 className="text-lg font-bold text-gray-900">Rastreio & Detalhes da Venda {viewSale.id}</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div>
            <span className="text-gray-500 block">Destinatário (Comprador):</span>
            <span className="font-bold text-gray-900 text-sm">{viewSale.client}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Remetente (Produtor):</span>
            <span className="font-semibold text-gray-900">{viewSale.origin || 'BRUNO PERES ROMEIRO'}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Data da Operação (VP):</span>
            <span className="font-semibold text-gray-900">{formatDate(viewSale.saleDate)}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Documento Fiscal:</span>
            {viewSale.nfFile ? (
              <a 
                href={`/uploads/${viewSale.nfFile}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-semibold text-emerald-700 hover:underline font-mono flex items-center gap-1" 
                title={getCleanFileName(viewSale.nfFile)}
              >
                <FileText className="w-3 h-3" />
                <span className="truncate max-w-[260px]">{getCleanFileName(viewSale.nfFile)}</span>
              </a>
            ) : (
              <span className="font-semibold text-gray-400">Pendente de emissão</span>
            )}
          </div>
          {viewSale.evidenceFile && (
            <div>
              <span className="text-gray-500 block">Anexo da Venda (Imagem / Carga):</span>
              <a 
                href={`/uploads/${viewSale.evidenceFile}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-semibold text-blue-700 hover:underline font-mono flex items-center gap-1" 
                title={getCleanFileName(viewSale.evidenceFile)}
              >
                <Paperclip className="w-3 h-3" />
                <span className="truncate max-w-[260px]">{getCleanFileName(viewSale.evidenceFile)}</span>
              </a>
            </div>
          )}
          {viewSale.paymentProofFile && (
            <div>
              <span className="text-gray-500 block">Comprovante de Liquidação:</span>
              <a 
                href={`/uploads/${viewSale.paymentProofFile}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-semibold text-emerald-700 hover:underline font-mono flex items-center gap-1" 
                title={getCleanFileName(viewSale.paymentProofFile)}
              >
                <Paperclip className="w-3 h-3" />
                <span className="truncate max-w-[260px]">{getCleanFileName(viewSale.paymentProofFile)}</span>
              </a>
            </div>
          )}
        </div>

        {/* Itens e Pesos */}
        <div className="bg-white rounded-xl p-3.5 border border-gray-200 text-xs space-y-2.5">
          <div className="font-bold text-gray-800 flex items-center justify-between border-b border-gray-100 pb-2">
            <span>Itens da Operação ({viewSale.items?.length || 1})</span>
            <span className="font-black text-gray-900">
              {formatNumber(viewSale.totalKg, 0)} kg ({formatNumber(viewSale.totalVolumes || (viewSale.totalKg / 29), 2)} caixas eq.)
            </span>
          </div>
          
          {viewSale.items && viewSale.items.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {viewSale.items.map((it, i) => (
                <div key={i} className="py-1.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-gray-900">{it.product || 'Produto'}</span>
                    <span className="text-gray-400 text-[11px] ml-2">({it.unit || 'Caixas 29kg'})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-gray-900">{formatNumber(it.kg, 0)} kg</span>
                    <span className="text-gray-500 text-[11px] ml-2">({formatNumber(it.quantity, 0)} vol)</span>
                    {it.total ? <span className="font-bold text-emerald-800 ml-2">· {formatCurrency(it.total)}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {viewSale.notes && (
            <div className="text-gray-600 text-[11px] bg-gray-50 p-2 rounded-lg border border-gray-100">
              {viewSale.notes}
            </div>
          )}
        </div>

        {/* Breakdown Financeiro: VP vs NF vs FUNRURAL vs Valor Liquidado / A Liquidar */}
        <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-200 space-y-2.5 text-xs">
          <span className="text-xs font-bold text-[#173e27] uppercase tracking-wider block border-b border-emerald-200 pb-1">
            Demonstrativo Financeiro & Liquidação:
          </span>

          <div className="flex justify-between text-blue-900 font-bold">
            <span>Total Comercial (VP):</span>
            <span className="text-sm font-black text-blue-950">{formatCurrency(calculateVP(viewSale))}</span>
          </div>

          <div className="flex justify-between text-gray-700 font-medium">
            <span>Valor Faturado na Nota Fiscal (NF):</span>
            <span className="font-semibold text-gray-900">{formatCurrency(viewSale.totalOperation)}</span>
          </div>

          <div className="flex justify-between text-red-600 font-semibold">
            <span>(-) FUNRURAL (1,63% apurado s/ NF):</span>
            <span className="text-sm font-bold">-{formatCurrency(viewSale.funruralTotal)}</span>
          </div>

          <div className="flex justify-between text-gray-800 font-bold pt-2 border-t border-emerald-200">
            <span>Total Líquido da Venda:</span>
            <span>{formatCurrency(liq.totalLiquido)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-emerald-100/70 p-2.5 rounded-lg border border-emerald-300">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Total Liquidado (Pago)</span>
              <span className="text-sm font-black text-emerald-950">{formatCurrency(liq.valorLiquidado)}</span>
            </div>
            <div className="bg-amber-100/70 p-2.5 rounded-lg border border-amber-300">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Saldo a Liquidar</span>
              <span className="text-sm font-black text-amber-950">{formatCurrency(liq.valorALiquidar)}</span>
            </div>
          </div>

          {viewSale.paymentHistory && viewSale.paymentHistory.length > 0 && (
            <div className="pt-2 border-t border-emerald-200">
              <span className="font-bold text-gray-700 block mb-1">Histórico de Pagamentos Recebidos:</span>
              <div className="space-y-1">
                {viewSale.paymentHistory.map((ph, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] bg-white p-2 rounded-lg border border-gray-200">
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                        <span>📅 {ph.date || formatDate(ph.createdAt)}</span>
                        {ph.paymentMethod === 'Cheque' ? (
                          <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                            Cheque {ph.checkNumber ? `Nº ${ph.checkNumber}` : ''}
                          </span>
                        ) : ph.paymentMethod === 'TED/DOC' ? (
                          <span className="bg-purple-50 text-purple-800 border border-purple-200 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                            TED/DOC
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                            PIX
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 flex flex-wrap items-center gap-1 mt-0.5">
                        {ph.checkBank && <span>Banco: <b>{ph.checkBank}</b> •</span>}
                        {ph.checkDueDate && <span>Bom p/: <b>{formatDate(ph.checkDueDate)}</b> •</span>}
                        <span>{ph.notes || 'Recebimento'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-emerald-800">{formatCurrency(ph.amount)}</span>
                      {ph.paymentProofFile && (
                        <a
                          href={`/uploads/${ph.paymentProofFile}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-[10px] font-bold underline"
                        >
                          Anexo
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewSale.producerPaymentHistory && viewSale.producerPaymentHistory.length > 0 && (
            <div className="pt-2 border-t border-amber-200">
              <span className="font-bold text-gray-700 block mb-1">Histórico de Repasses ao Produtor:</span>
              <div className="space-y-1">
                {viewSale.producerPaymentHistory.map((ph, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] bg-white p-2 rounded-lg border border-amber-200">
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                        <span>📅 {ph.date || formatDate(ph.createdAt)}</span>
                        {ph.paymentMethod === 'Cheque' ? (
                          <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                            Cheque {ph.checkNumber ? `Nº ${ph.checkNumber}` : ''}
                          </span>
                        ) : ph.paymentMethod === 'TED/DOC' ? (
                          <span className="bg-purple-50 text-purple-800 border border-purple-200 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                            TED/DOC
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                            PIX
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 flex flex-wrap items-center gap-1 mt-0.5">
                        {ph.checkBank && <span>Banco: <b>{ph.checkBank}</b> •</span>}
                        {ph.checkDueDate && <span>Bom p/: <b>{formatDate(ph.checkDueDate)}</b> •</span>}
                        <span>{ph.notes || 'Repasse ao Produtor'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-amber-900">{formatCurrency(ph.amount)}</span>
                      {ph.paymentProofFile && (
                        <a
                          href={`/uploads/${ph.paymentProofFile}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-[10px] font-bold underline"
                        >
                          Comprovante
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenContract(viewSale)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Contrato
            </button>

            {!liq.isFullySettled && (
              <button
                onClick={() => onOpenSettle(viewSale)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5" />
                Registrar Pagamento
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="bg-[#173e27] hover:bg-[#1f5033] text-white text-xs font-semibold px-5 py-2 rounded-lg cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
