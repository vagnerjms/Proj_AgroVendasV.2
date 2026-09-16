import React from 'react';
import { X } from 'lucide-react';

export default function ClientModal({
  isOpen,
  onClose,
  onSubmit,
  editingClient,
  clientForm,
  setClientForm,
  submitting
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <h3 className="text-base font-bold text-gray-900">
            {editingClient ? `Editar Parceiro: ${editingClient.name}` : 'Novo Cadastro de Cliente / Produtor'}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Razão Social / Nome</label>
            <input
              type="text"
              required
              placeholder="Ex: Cooperativa Agrícola Central"
              value={clientForm.name}
              onChange={e => setClientForm({ ...clientForm, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo</label>
            <select
              value={clientForm.type}
              onChange={e => setClientForm({ ...clientForm, type: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37] font-semibold"
            >
              <option value="Comprador">Comprador</option>
              <option value="Produtor">Produtor</option>
              <option value="Ambos">Ambos</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">CNPJ / CPF</label>
            <input
              type="text"
              placeholder="00.000.000/0000-00"
              value={clientForm.document}
              onChange={e => setClientForm({ ...clientForm, document: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Inscrição Estadual (IE)</label>
            <input
              type="text"
              placeholder="Ex: 000.000.000.000 ou ISENTO"
              value={clientForm.ie}
              onChange={e => setClientForm({ ...clientForm, ie: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Telefone / WhatsApp</label>
            <input
              type="text"
              placeholder="(34) 99876-1122"
              value={clientForm.phone}
              onChange={e => setClientForm({ ...clientForm, phone: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail Comercial</label>
            <input
              type="email"
              placeholder="contato@empresa.com.br"
              value={clientForm.email}
              onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Cidade</label>
            <input
              type="text"
              placeholder="Ex: São Gotardo"
              value={clientForm.city}
              onChange={e => setClientForm({ ...clientForm, city: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">UF</label>
            <input
              type="text"
              maxLength={2}
              placeholder="MG"
              value={clientForm.uf}
              onChange={e => setClientForm({ ...clientForm, uf: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1d5a37] uppercase"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="bg-[#091b2e] hover:bg-[#132c4a] disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            {submitting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <span>{submitting ? 'Gravando...' : (editingClient ? 'Salvar Alterações' : 'Cadastrar Parceiro')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
