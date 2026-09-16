import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function ProductsTab({
  products,
  onEditProduct,
  onDeleteProduct
}) {
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-xs">
        Nenhum produto cadastrado no catálogo.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {products.map(p => (
        <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3 hover:border-gray-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {p.category}
                </span>
                <div className="font-bold text-sm text-gray-900 mt-1">{p.name}</div>
              </div>
              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                {p.defaultUnit}
              </span>
            </div>

            <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs mt-3">
              <div>
                <span className="text-[10px] text-gray-400 block font-medium">Peso Unitário</span>
                <span className="font-bold text-gray-800">{p.unitKg || 29} kg</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-medium">Estoque Atual</span>
                <span className="font-bold text-gray-800">{p.currentStock || 0} {p.defaultUnit?.split(' ')?.[1] || 'un'}</span>
              </div>
              <div className="col-span-2 pt-1">
                <span className="text-[10px] text-gray-400 block font-medium">Custo Médio Ponderado</span>
                <span className="font-extrabold text-emerald-800">{formatCurrency(p.averageCost || 0)}</span>
              </div>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
            <button
              onClick={() => onEditProduct(p)}
              className="text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              Editar
            </button>
            <button
              onClick={() => onDeleteProduct(p)}
              className="text-gray-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
