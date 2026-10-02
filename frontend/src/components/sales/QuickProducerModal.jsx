import React from 'react';
import { AlertCircle, Plus, X } from 'lucide-react';

export default function QuickProducerModal({
  unmatchedProducer,
  matchedProducer,
  registeringProducer,
  onQuickRegister,
  onDismiss
}) {
  if (!unmatchedProducer || matchedProducer) return null;

  return (
    <div className="bg-amber-50/95 border-2 border-amber-400 p-4 rounded-xl shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
            Produtor / Emitente da NF-e — conferência necessária
          </span>
        </div>
        <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300 w-fit">
          Não cadastrado — sem vínculo automático
        </span>
      </div>

      <div className="text-xs text-amber-950">
        Emitente na nota: <strong className="text-gray-950 font-black text-sm">&quot;{unmatchedProducer.name || '(nome não lido)'}&quot;</strong>
        {' '}(CPF/CNPJ: <strong>{unmatchedProducer.document || 'Não informado'}</strong>
        {unmatchedProducer.ie ? ` · IE: ${unmatchedProducer.ie}` : ''}
        {unmatchedProducer.city ? ` · ${unmatchedProducer.city}/${unmatchedProducer.uf || ''}` : ''}).
        Cadastre só após conferir, ou selecione um produtor já existente.
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
        <button
          type="button"
          disabled={registeringProducer || !unmatchedProducer.name}
          onClick={onQuickRegister}
          className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-extrabold px-4 py-2.5 rounded-lg shadow flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {registeringProducer ? 'Salvando...' : 'Cadastrar produtor (após conferir)'}
        </button>
        {typeof onDismiss === 'function' && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs font-bold text-amber-950 border border-amber-400 bg-white hover:bg-amber-100 px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Ignorar / escolher existente
          </button>
        )}
      </div>
    </div>
  );
}
