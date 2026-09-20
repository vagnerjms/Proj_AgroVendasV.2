import React from 'react';
import { AlertTriangle, CheckCircle2, Scale } from 'lucide-react';

export default function WeighingKpiCards({ pendingDivergences = 0, slipsCount = 0, onFilterDivergences }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-orange-600 shrink-0" />
          <div>
            <span className="text-xs font-bold text-orange-950 uppercase">Divergências Pendentes</span>
            <span className="text-xl font-extrabold text-orange-900 block">{pendingDivergences} cargas</span>
          </div>
        </div>
        <button
          onClick={onFilterDivergences}
          className="text-xs font-bold bg-orange-200/80 hover:bg-orange-200 text-orange-900 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
        >
          Filtrar
        </button>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
        <div>
          <span className="text-xs font-bold text-emerald-950 uppercase">Tolerância Contratual Padrão</span>
          <span className="text-sm font-semibold text-emerald-900 block">Até 0,25% (Quebra técnica de transporte)</span>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
        <Scale className="w-6 h-6 text-blue-600 shrink-0" />
        <div>
          <span className="text-xs font-bold text-blue-950 uppercase">Total de Romaneios Auditados</span>
          <span className="text-xl font-extrabold text-blue-900 block">{slipsCount} romaneios</span>
        </div>
      </div>
    </div>
  );
}
