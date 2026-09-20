import React from 'react';
import { Truck, Camera, CheckCircle2, Edit, Trash2 } from 'lucide-react';
import { formatNumber, formatDate } from '../../utils/formatters';

export default function WeighingTable({
  slips = [],
  loading = false,
  statusFilter = 'all',
  setStatusFilter,
  onOpenResolve,
  onOpenEdit,
  onDeleteSlip,
  onPreviewImage
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
            <tr>
              <th className="py-3 px-4">Romaneio / Data</th>
              <th className="py-3 px-4">Veículo / Motorista</th>
              <th className="py-3 px-4">Cliente / Produto</th>
              <th className="py-3 px-4 text-right">Peso Origem</th>
              <th className="py-3 px-4 text-right">Peso Destino</th>
              <th className="py-3 px-4 text-right">Quebra (Diferença)</th>
              <th className="py-3 px-4 text-center">Classificação</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-gray-400">
                  Carregando romaneios...
                </td>
              </tr>
            ) : slips.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-14 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-gray-900 text-sm">
                      {statusFilter === 'Divergente' 
                        ? 'Nenhuma divergência pendente de pesagem!' 
                        : 'Nenhum romaneio encontrado'}
                    </span>
                    <p className="text-xs text-gray-500 text-center leading-relaxed">
                      {statusFilter === 'Divergente'
                        ? 'Todas as cargas recebidas estão em conformidade com as notas e limites de tolerância contratual.'
                        : 'Tente alterar os termos de busca ou o filtro de status selecionado.'}
                    </p>
                    {statusFilter !== 'all' && setStatusFilter && (
                      <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className="mt-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                      >
                        Limpar Filtros e Ver Todos
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              slips.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-gray-900">{s.id}</div>
                    <div className="text-gray-400 text-[11px]">{formatDate(s.date)}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-bold">{s.truckPlate}</span>
                      {(s.ticketImage || s.attachment) && (
                        <button
                          type="button"
                          onClick={() => onPreviewImage(s.ticketImage || s.attachment)}
                          className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-1 rounded-md transition-colors cursor-pointer"
                          title="Visualizar foto do romaneio"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="text-gray-500 text-[11px] mt-0.5">{s.driverName}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{s.client}</div>
                    <div className="text-gray-400 text-[11px]">{s.product}</div>
                  </td>

                  <td className="py-3 px-4 text-right font-medium text-gray-700">
                    {formatNumber(s.originWeightKg, 0)} kg
                  </td>

                  <td className="py-3 px-4 text-right font-medium text-gray-900">
                    {formatNumber(s.destWeightKg, 0)} kg
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className={`font-bold ${s.weightDifferenceKg > (s.originWeightKg * (s.tolerancePct / 100)) ? 'text-orange-600' : 'text-gray-800'}`}>
                      -{formatNumber(s.weightDifferenceKg, 0)} kg
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {s.weightDifferencePct}% (tol: {s.tolerancePct}%)
                    </div>
                  </td>

                  <td className="py-3 px-4 text-center text-[11px] text-gray-600">
                    <span>U: {s.humidityPct}% • I: {s.impurityPct}%</span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      s.status === 'Divergente'
                        ? 'bg-orange-100 text-orange-800 border border-orange-200'
                        : (s.status === 'Ajustado' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800')
                    }`}>
                      {s.status}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {s.status === 'Divergente' && (
                        <button
                          onClick={() => onOpenResolve(s)}
                          className="bg-[#173e27] hover:bg-[#1f5435] text-white text-[11px] font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer"
                        >
                          Tratar
                        </button>
                      )}
                      <button
                        onClick={() => onOpenEdit(s)}
                        className="text-gray-600 hover:text-emerald-700 p-1 rounded hover:bg-gray-100 cursor-pointer"
                        title="Editar romaneio"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteSlip(s)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer"
                        title="Excluir romaneio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
