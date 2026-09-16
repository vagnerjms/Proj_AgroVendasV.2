import React from 'react';
import { AlertCircle, Plus } from 'lucide-react';

export default function QuickProducerModal({
  unmatchedProducer,
  matchedProducer,
  registeringProducer,
  onQuickRegister
}) {
  if (!unmatchedProducer || matchedProducer) return null;

  return (
    <div className="bg-amber-50/95 border-2 border-amber-400 p-4 rounded-xl shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
            Novo Produtor Identificado na NF-e
          </span>
        </div>
        <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300 w-fit">
          Não Cadastrado na Base
        </span>
      </div>

      <div className="text-xs text-amber-950">
        O emitente identificado na nota fiscal <strong className="text-gray-950 font-black text-sm">"{unmatchedProducer.name}"</strong> (CPF/CNPJ: <strong>{unmatchedProducer.document || 'Não informado'}</strong> {unmatchedProducer.ie ? `· IE: ${unmatchedProducer.ie}` : ''} · {unmatchedProducer.city}/{unmatchedProducer.uf}) ainda não possui cadastro no sistema.
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
        <button
          type="button"
          disabled={registeringProducer}
          onClick={onQuickRegister}
          className="bg-[#091b2e] hover:bg-[#132c4a] text-white text-xs font-extrabold px-4 py-2.5 rounded-lg shadow flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {registeringProducer ? 'Salvando Produtor no Banco...' : 'Cadastrar Produtor no Sistema (1 clique)'}
        </button>
        <span className="text-[11px] text-amber-900 font-medium">
          ✨ Salva automaticamente na tabela de Clientes & Produtores com todos os dados fiscais da nota.
        </span>
      </div>
    </div>
  );
}
