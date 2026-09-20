import React from 'react';
import { 
  Search, 
  Calendar, 
  Tractor, 
  Building2, 
  CheckCircle2, 
  RotateCcw, 
  Paperclip, 
  X 
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

/**
 * Tabela e Filtros de Repasses a Produtores Rurais (Contas a Pagar)
 * Exibe prazos de repasse, retenção de FUNRURAL (1,63%), líquido ao produtor
 * e histórico de comprovantes PIX/TED.
 */
export default function AgendaProdutoresTable({
  filteredScheduleProdutores = [],
  scheduleListCount = 0,
  searchProducer = '',
  setSearchProducer,
  selectedProducer = 'ALL',
  setSelectedProducer,
  uniqueProducers = [],
  producerStatusFilter = 'ALL',
  setProducerStatusFilter,
  uploadingSaleId = null,
  onSettleClick,
  onUnsettleClick,
  onPreviewEvidence,
  onRemoveEvidence,
  onUploadEvidence
}) {
  return (
    <div className="space-y-6">
      {/* Filtros - Produtores */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por Produtor, Origem, NF ou VP..."
              value={searchProducer}
              onChange={(e) => setSearchProducer(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-xs rounded-lg pl-8 pr-3 py-2 outline-none w-72 focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <select
            value={selectedProducer}
            onChange={(e) => setSelectedProducer(e.target.value)}
            className="bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 font-semibold text-gray-800 outline-none"
          >
            <option value="ALL">Todos os Produtores / Origens</option>
            {uniqueProducers.map((prod, idx) => (
              <option key={idx} value={prod}>{prod}</option>
            ))}
          </select>

          <select
            value={producerStatusFilter}
            onChange={(e) => setProducerStatusFilter(e.target.value)}
            className="bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 font-semibold text-gray-800 outline-none"
          >
            <option value="ALL">Todos os Status de Repasse</option>
            <option value="A_PAGAR">Pendentes (A Pagar)</option>
            <option value="PARCIAL">Repasses Parciais</option>
            <option value="PAGO">Quitados (100% Repassados)</option>
          </select>
        </div>

        <span className="text-xs font-semibold text-gray-500">
          Exibindo <strong>{filteredScheduleProdutores.length}</strong> de {scheduleListCount} repasses
        </span>
      </div>

      {/* Tabela de Repasses a Produtores */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Data Vencimento</th>
                <th className="py-3 px-4">Produtor Rural (Origem)</th>
                <th className="py-3 px-3">Loja Destino</th>
                <th className="py-3 px-3 text-center">Nº NF</th>
                <th className="py-3 px-3 text-center">Nº VP</th>
                <th className="py-3 px-3 text-right">Caixas</th>
                <th className="py-3 px-3 text-right font-black text-gray-900 bg-gray-100/60">TOTAL NF</th>
                <th className="py-3 px-3 text-right font-semibold text-red-600">(-) FUNRURAL (1,63%)</th>
                <th className="py-3 px-3 text-right font-black text-blue-950 bg-blue-50/40">(=) Líquido Produtor</th>
                <th className="py-3 px-3 text-right font-black text-emerald-800 bg-emerald-50/40">Já Repassado</th>
                <th className="py-3 px-3 text-right font-black text-amber-900 bg-amber-50/40">Saldo a Pagar</th>
                <th className="py-3 px-3 text-center">Status Repasse</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredScheduleProdutores.length === 0 ? (
                <tr>
                  <td colSpan="13" className="py-8 text-center text-gray-400">
                    Nenhum repasse a produtor encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredScheduleProdutores.map((item, idx) => {
                  const isProducerPaid = item.isProducerFullySettled;
                  const isProducerPart = item.isProducerPartial;
                  return (
                    <tr key={idx} className={`hover:bg-gray-50/80 transition-colors ${isProducerPaid ? 'bg-gray-50/40 opacity-80' : ''}`}>
                      
                      {/* Data Vencimento */}
                      <td className="py-3 px-4 font-black text-gray-900 flex items-center gap-2 whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>{item.dueDateFormatted}</span>
                      </td>

                      {/* Produtor Rural (Origem) */}
                      <td className="py-3 px-4 font-bold text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <Tractor className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>{item.producerOrigin}</span>
                        </div>
                      </td>

                      {/* Loja Destino */}
                      <td className="py-3 px-3 font-medium text-gray-700">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate max-w-[120px]" title={item.client}>{item.client}</span>
                        </div>
                      </td>

                      {/* Nº NF */}
                      <td className="py-3 px-3 text-center font-bold text-gray-900">
                        {item.nfNumber}
                      </td>

                      {/* Nº VP */}
                      <td className="py-3 px-3 text-center text-gray-600 font-medium">
                        {item.id}
                      </td>

                      {/* Caixas */}
                      <td className="py-3 px-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                        {formatNumber(item.caixas, 2)} cx
                      </td>

                      {/* TOTAL NF */}
                      <td className="py-3 px-3 text-right font-black text-gray-950 bg-gray-100/70 whitespace-nowrap">
                        {formatCurrency(item.totalNF)}
                      </td>

                      {/* (-) FUNRURAL 1,63% */}
                      <td className="py-3 px-3 text-right font-semibold text-red-600 whitespace-nowrap">
                        -{formatCurrency(item.funrural)}
                      </td>

                      {/* (=) Líquido Produtor */}
                      <td className="py-3 px-3 text-right font-black text-blue-950 bg-blue-50/50 whitespace-nowrap">
                        {formatCurrency(item.liquidoProdutor)}
                      </td>

                      {/* Já Repassado */}
                      <td className="py-3 px-3 text-right font-black text-emerald-800 bg-emerald-50/40 whitespace-nowrap">
                        {item.producerPaid > 0 ? formatCurrency(item.producerPaid) : <span className="text-gray-400 font-normal">-</span>}
                      </td>

                      {/* Saldo a Pagar */}
                      <td className="py-3 px-3 text-right font-black text-amber-900 bg-amber-50/40 whitespace-nowrap">
                        {item.saldoProdutor > 0 ? formatCurrency(item.saldoProdutor) : <span className="text-gray-400 font-normal">-</span>}
                      </td>

                      {/* Status Repasse */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            isProducerPaid 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : (isProducerPart 
                                  ? 'bg-blue-100 text-blue-900 border border-blue-200' 
                                  : 'bg-amber-100 text-amber-900 border border-amber-200')
                          }`}>
                            {isProducerPaid ? 'Pago' : (isProducerPart ? `Parcial (${item.producerPercentPaid?.toFixed(0)}%)` : 'A Pagar')}
                          </span>
                          {(isProducerPaid || isProducerPart) && (
                            <span className="text-[9px] font-extrabold text-gray-500">
                              {item.producerPaymentMethod === 'Cheque' ? '📄 Cheque' : (item.producerPaymentMethod === 'TED/DOC' ? '🏦 TED/DOC' : '⚡ PIX')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ações Produtor */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {/* Botão Repassar ao Produtor */}
                          {!isProducerPaid && (
                            <button
                              type="button"
                              onClick={() => onSettleClick(item)}
                              className={`${isProducerPart ? 'bg-blue-700 hover:bg-blue-800' : 'bg-emerald-700 hover:bg-emerald-800'} text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs`}
                              title={isProducerPart ? 'Adicionar novo repasse parcial ou quitar saldo do produtor' : 'Registrar repasse integral ou parcial ao produtor rural'}
                            >
                              {isProducerPart ? 'Repassar (+)' : 'Repassar'}
                            </button>
                          )}

                          {/* Reverter repasse */}
                          {(isProducerPaid || (item.producerPaid > 0)) && (
                            <button
                              type="button"
                              onClick={() => onUnsettleClick(item.id)}
                              className="text-[10px] text-emerald-800 hover:text-amber-900 font-bold bg-emerald-50 hover:bg-amber-100 px-2 py-1 rounded-md border border-emerald-200 hover:border-amber-300 transition-all cursor-pointer group flex items-center gap-1 shadow-2xs"
                              title="Clique para reverter repasse (retornar para 'A Pagar')"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 group-hover:hidden" />
                              <RotateCcw className="w-3 h-3 text-amber-700 hidden group-hover:inline" />
                              <span className="group-hover:hidden">{isProducerPaid ? 'Repassado' : 'Estornar'}</span>
                              <span className="hidden group-hover:inline">Reverter</span>
                            </button>
                          )}

                          {/* Comprovante PIX/TED do Produtor */}
                          {item.producerPaymentProofFile ? (
                            <div className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => onPreviewEvidence(item.producerPaymentProofFile)}
                                className="text-blue-700 hover:text-blue-900 px-1.5 py-1 text-[10px] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                                title="Visualizar comprovante de repasse ao produtor"
                              >
                                <Paperclip className="w-3 h-3 text-blue-600" />
                                <span className="hidden sm:inline">Comprovante</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => onRemoveEvidence(item.id, e)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-100 p-1 rounded-md transition-colors cursor-pointer"
                                title="Excluir comprovante de repasse ao produtor"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <label 
                              className={`p-1.5 rounded-lg border border-dashed border-gray-300 hover:border-emerald-600 bg-gray-50 hover:bg-emerald-50/50 text-gray-500 hover:text-emerald-800 cursor-pointer transition-all flex items-center gap-1 text-[10px] font-semibold ${
                                uploadingSaleId === `producer-${item.id}` ? 'opacity-50 pointer-events-none' : ''
                              }`}
                              title="Anexar comprovante de repasse PIX/TED do produtor"
                            >
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                disabled={uploadingSaleId === `producer-${item.id}`}
                                onChange={(e) => onUploadEvidence(item.id, e.target.files?.[0])}
                                className="hidden"
                              />
                              {uploadingSaleId === `producer-${item.id}` ? (
                                <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Paperclip className="w-3.5 h-3.5" />
                              )}
                              <span className="hidden xl:inline">Anexar</span>
                            </label>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
