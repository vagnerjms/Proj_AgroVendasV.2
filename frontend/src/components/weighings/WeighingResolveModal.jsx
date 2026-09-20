import React from 'react';
import { X, Check } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

export default function WeighingResolveModal({
  resolvingSlip = null,
  onClose,
  onResolve,
  resolveWeightChoice = 'dest',
  setResolveWeightChoice,
  resolutionNotes = '',
  setResolutionNotes,
  submittingResolution = false
}) {
  if (!resolvingSlip) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <span className="text-xs font-bold text-orange-600 uppercase">Tratamento de Divergência</span>
            <h3 className="text-base font-bold text-gray-900">Romaneio {resolvingSlip.id} ({resolvingSlip.truckPlate})</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs space-y-1 text-orange-900">
          <div className="flex justify-between"><span>Peso Origem:</span><strong>{formatNumber(resolvingSlip.originWeightKg, 0)} kg</strong></div>
          <div className="flex justify-between"><span>Peso Destino:</span><strong>{formatNumber(resolvingSlip.destWeightKg, 0)} kg</strong></div>
          <div className="flex justify-between font-bold text-red-700">
            <span>Quebra Detectada:</span>
            <span>-{resolvingSlip.weightDifferenceKg} kg ({resolvingSlip.weightDifferencePct}%)</span>
          </div>
          <div className="flex justify-between text-gray-500 text-[10px]">
            <span>Tolerância Contratual:</span>
            <span>{resolvingSlip.tolerancePct}% (~{Math.round(resolvingSlip.originWeightKg * 0.0025)} kg)</span>
          </div>
        </div>

        {/* Opção Considerar Peso Origem vs Destino */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
            ⚖️ Escolha qual peso fixar na Venda ({resolvingSlip.saleId || resolvingSlip.id.replace('ROM-', '')})
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setResolveWeightChoice('origin')}
              className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                resolveWeightChoice === 'origin'
                  ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 text-blue-950 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600">Considerar Peso Origem</span>
                <input type="radio" checked={resolveWeightChoice === 'origin'} readOnly className="text-blue-600" />
              </div>
              <span className="text-sm font-extrabold text-slate-900">{formatNumber(resolvingSlip.originWeightKg, 0)} kg</span>
              <span className="text-[10px] text-slate-500">~{Math.round((resolvingSlip.originWeightKg || 0) / 29)} caixas</span>
            </button>

            <button
              type="button"
              onClick={() => setResolveWeightChoice('dest')}
              className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                resolveWeightChoice === 'dest'
                  ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600">Considerar Peso Destino</span>
                <input type="radio" checked={resolveWeightChoice === 'dest'} readOnly className="text-emerald-600" />
              </div>
              <span className="text-sm font-extrabold text-slate-900">{formatNumber(resolvingSlip.destWeightKg, 0)} kg</span>
              <span className="text-[10px] text-slate-500">~{Math.round((resolvingSlip.destWeightKg || 0) / 29)} caixas</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500 italic">
            * O peso escolhido será aplicado à venda para recalcular o faturamento da nota, eliminando a quebra pendente.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Parecer / Justificativa da Conciliação</label>
          <textarea
            rows={2}
            value={resolutionNotes}
            onChange={e => setResolutionNotes(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
            placeholder="Descreva o acordo com o comprador/transportadora..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={submittingResolution}
            onClick={() => onResolve('Ajustado')}
            className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{submittingResolution ? 'Ajustando...' : 'Ajustar Peso na Venda'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
