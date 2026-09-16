import React from 'react';
import { X } from 'lucide-react';

export default function ProductModal({
  isOpen,
  onClose,
  onSubmit,
  editingProduct,
  productForm,
  setProductForm,
  submitting
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <h3 className="text-base font-bold text-gray-900">
            {editingProduct ? `Editar Produto: ${editingProduct.name}` : 'Novo Cadastro de Produto / Grão'}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nome do Produto</label>
            <input
              type="text"
              required
              placeholder="Ex: Soja Grão Comercial Safra 25/26"
              value={productForm.name}
              onChange={e => setProductForm({ ...productForm, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#091b2e]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Categoria</label>
            <select
              value={productForm.category}
              onChange={e => setProductForm({ ...productForm, category: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#091b2e] font-semibold"
            >
              <option value="Hortifruti">Hortifruti</option>
              <option value="Grãos">Grãos</option>
              <option value="Legumes & Verduras">Legumes & Verduras</option>
              <option value="Frutas">Frutas</option>
              <option value="Insumos">Insumos</option>
              <option value="Sementes">Sementes</option>
              <option value="Café">Café</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Embalagem / Unidade</label>
            <select
              value={productForm.defaultUnit}
              onChange={e => {
                const u = e.target.value;
                let kg = productForm.unitKg;
                if (u === 'Caixas (cx)') kg = 29;
                else if (u === 'Sacas (sc)') kg = 60;
                else if (u === 'Granel (kg)') kg = 1;
                else if (u === 'Toneladas (ton)') kg = 1000;
                else if (u === 'Bins (bin)') kg = 400;
                else if (u === 'Fardos / Pacotes (fd)') kg = 10;
                else if (u === 'Paletes (pal)') kg = 800;
                setProductForm({ ...productForm, defaultUnit: u, unitKg: kg });
              }}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#091b2e] font-semibold text-gray-800"
            >
              <option value="Caixas (cx)">Caixas (cx)</option>
              <option value="Sacas (sc)">Sacas (sc)</option>
              <option value="Granel (kg)">Granel (kg)</option>
              <option value="Toneladas (ton)">Toneladas (ton)</option>
              <option value="Bins (bin)">Bins (bin)</option>
              <option value="Fardos / Pacotes (fd)">Fardos / Pacotes (fd)</option>
              <option value="Paletes (pal)">Paletes (pal)</option>
              <option value="Outro (Personalizado)">Outro (Personalizado)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Peso Unitário (kg) *</label>
            <input
              type="number"
              step="0.1"
              required
              placeholder="Ex: 29, 60, 20..."
              value={productForm.unitKg}
              onChange={e => setProductForm({ ...productForm, unitKg: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#091b2e] font-bold text-gray-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Estoque Inicial (unidades)</label>
            <input
              type="number"
              value={productForm.currentStock}
              onChange={e => setProductForm({ ...productForm, currentStock: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#091b2e]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Custo Médio Ponderado (R$)</label>
            <input
              type="number"
              step="0.01"
              value={productForm.averageCost}
              onChange={e => setProductForm({ ...productForm, averageCost: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#091b2e]"
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
            <span>{submitting ? 'Gravando...' : (editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
