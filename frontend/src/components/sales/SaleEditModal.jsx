import React from 'react';
import { X } from 'lucide-react';

/**
 * Modal de Edição Rápida da Venda
 * Permite alterar cliente, observações e status operacional e de pagamento.
 */
export default function SaleEditModal({
  editingSale,
  editForm,
  setEditForm,
  onClose,
  onSaveEdit,
  submittingEdit
}) {
  if (!editingSale) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <form onSubmit={onSaveEdit} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase">{editingSale.operationType}</span>
            <h3 className="text-base font-bold text-gray-900">Editar Venda {editingSale.id}</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Cliente Destinatário</label>
          <input
            type="text"
            required
            value={editForm.client}
            onChange={e => setEditForm({ ...editForm, client: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Status Operacional</label>
            <select
              value={editForm.status}
              onChange={e => setEditForm({ ...editForm, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
            >
              <option value="Faturado">Faturado</option>
              <option value="Pendente NF">Pendente NF</option>
              <option value="Concluído">Concluído</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Status Pagamento</label>
            <select
              value={editForm.paymentStatus}
              onChange={e => setEditForm({ ...editForm, paymentStatus: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
            >
              <option value="A Receber">A Receber</option>
              <option value="Parcial">Parcial</option>
              <option value="Recebido">Recebido (Liquidado)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Observações da Negociação</label>
          <textarea
            rows={2}
            value={editForm.notes}
            onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            disabled={submittingEdit}
            onClick={onClose}
            className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submittingEdit}
            className="bg-[#091b2e] hover:bg-[#132c4a] disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-2"
          >
            {submittingEdit && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <span>{submittingEdit ? 'Gravando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
