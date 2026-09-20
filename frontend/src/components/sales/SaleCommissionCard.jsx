import React from 'react';

export default function SaleCommissionCard({
  feeType,
  setFeeType,
  feeValue,
  setFeeValue
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
      <h2 className="text-sm font-bold text-gray-900">Comissão de Corretagem AgroVenda</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Taxa</label>
          <select
            value={feeType}
            onChange={(e) => setFeeType(e.target.value)}
            className="w-full bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 outline-none font-semibold"
          >
            <option value="Porcentagem (%)">Porcentagem (%)</option>
            <option value="Valor Fixo por Saca/Volume">Valor Fixo por Volume / Caixa</option>
            <option value="Valor Fixo Total">Valor Fixo Total</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Taxa / Alíquota</label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              value={feeValue}
              onChange={(e) => setFeeValue(Number(e.target.value))}
              className="w-full bg-white border border-gray-300 text-xs rounded-lg px-3 py-2 outline-none font-bold text-gray-900"
            />
            <span className="absolute right-3 top-2 text-xs text-gray-400 pointer-events-none">
              {feeType === 'Porcentagem (%)' ? '%' : 'R$'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
