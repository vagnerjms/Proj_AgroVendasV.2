import React from 'react';
import { Calculator } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatQuantity, resolveProductUnit } from '../../utils/dataHelpers';
import { DATA_LABELS } from '../../constants/dataLabels';

/**
 * Resumo comercial da venda.
 * Destaque: Valor negociado (cotação). NF informativa. FUNRURAL só na Apuração.
 */
export default function SaleFiscalSummary({
  saleItems = [],
  totalWeightKg = 0,
  totalVolumes = 0,
  effectiveTotalNF = 0,
  valorTotalVP = 0,
  feeValue = 3.0,
  totalCommission = 0,
  submitting = false
}) {
  const quantityUnit = resolveProductUnit(saleItems[0] || {});

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4 sticky top-6">
      <h2 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-3 flex items-center justify-between">
        <span>Resumo da Operação</span>
        <Calculator className="w-4 h-4 text-emerald-700" />
      </h2>

      <div className="space-y-3 text-xs">
        <div className="flex justify-between text-gray-600">
          <span>Produtos ({saleItems.length}):</span>
          <span
            className="font-bold text-gray-900 truncate max-w-[170px]"
            title={saleItems.map(it => it.product).filter(Boolean).join(', ')}
          >
            {saleItems.map(it => it.product).filter(Boolean).join(', ') || 'Nenhum'}
          </span>
        </div>

        <div className="flex justify-between text-gray-600">
          <span>Peso Total Carga:</span>
          <span className="font-bold text-gray-900">{formatNumber(totalWeightKg, 0)} kg</span>
        </div>

        <div className="flex justify-between text-gray-600 gap-2">
          <span>{DATA_LABELS.quantity}:</span>
          <span className="font-bold text-gray-900 text-right">
            {formatQuantity(totalVolumes, '')}
            {quantityUnit ? (
              <span className="ml-1 text-[10px] font-semibold text-gray-500">{quantityUnit}</span>
            ) : null}
          </span>
        </div>

        <div className="flex justify-between items-center text-blue-950 font-black text-sm border-2 border-blue-300 bg-blue-50 p-3 rounded-xl shadow-sm">
          <span className="text-blue-900 font-bold">
            {DATA_LABELS.valorComercialVP}:
          </span>
          <span className="text-blue-950 font-black text-base">
            {formatCurrency(valorTotalVP)}
          </span>
        </div>

        <div className="flex justify-between text-gray-600 border-t border-gray-100 pt-2">
          <span>{DATA_LABELS.valorNF}:</span>
          <span className="font-semibold text-gray-800">{formatCurrency(effectiveTotalNF)}</span>
        </div>

        <div className="flex justify-between text-gray-800 font-bold border-t border-gray-100 pt-2">
          <span>Comissão AgroVenda ({feeValue}%):</span>
          <span className="text-sm">{formatCurrency(totalCommission)}</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-[#091b2e] hover:bg-[#132c4a] text-white font-bold text-xs py-3.5 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
      >
        {submitting ? 'Gravando no MongoDB...' : 'Confirmar & Gravar Venda'}
      </button>
    </div>
  );
}
