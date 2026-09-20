import React from 'react';
import { Calculator } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

/**
 * Componente Modular de Resumo Financeiro & Fiscal da Venda
 * Apresenta o peso total da carga, volumes, total faturado na NF,
 * detalhamento exato das retenções fiscais de FUNRURAL (1,63%),
 * valor líquido a receber, destaque do Valor Total Comercial (VP)
 * e comissão de corretagem.
 */
export default function SaleFiscalSummary({
  saleItems = [],
  totalWeightKg = 0,
  totalVolumes = 0,
  effectiveTotalNF = 0,
  funrural = { funruralTotal: 0, previdencia: 0, rat: 0, senar: 0 },
  liquidoAReceber = 0,
  valorTotalVP = 0,
  feeValue = 3.0,
  totalCommission = 0,
  submitting = false
}) {
  const isSaca = saleItems.some(it => 
    it.unit?.toLowerCase().includes('saca') || 
    it.product?.toLowerCase().includes('batata')
  );

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

        <div className="flex justify-between text-gray-600">
          <span>Total Volumes:</span>
          <span className="font-bold text-gray-900">
            {formatNumber(totalVolumes, 2)} {isSaca ? 'sc' : 'cx'}
          </span>
        </div>

        <div className="flex justify-between text-gray-800 font-bold border-t border-gray-100 pt-2 text-sm">
          <span>Valor Total da NF:</span>
          <span className="text-[#173e27] font-black">{formatCurrency(effectiveTotalNF)}</span>
        </div>

        <div className="flex justify-between text-red-600 font-semibold">
          <span>(-) FUNRURAL Retido (1,63%):</span>
          <span>-{formatCurrency(funrural.funruralTotal)}</span>
        </div>

        <div className="pl-3 text-[11px] text-gray-400 space-y-0.5 border-l-2 border-red-200">
          <div className="flex justify-between">
            <span>↳ Previdência (1,20%):</span>
            <span>{formatCurrency(funrural.previdencia)}</span>
          </div>
          <div className="flex justify-between">
            <span>↳ RAT (0,10%):</span>
            <span>{formatCurrency(funrural.rat)}</span>
          </div>
          <div className="flex justify-between">
            <span>↳ SENAR (0,33%):</span>
            <span>{formatCurrency(funrural.senar)}</span>
          </div>
        </div>

        <div className="flex justify-between text-emerald-950 font-bold bg-emerald-50/50 p-2 rounded-lg border border-emerald-200">
          <span>(=) Líquido a Receber:</span>
          <span className="font-black text-sm">{formatCurrency(liquidoAReceber)}</span>
        </div>

        {/* VALOR TOTAL COMERCIAL (VP) EM EVIDÊNCIA */}
        <div className="flex justify-between items-center text-blue-950 font-black text-sm border border-blue-200 bg-blue-50/70 p-2.5 rounded-xl shadow-xs">
          <span className="text-blue-900 font-bold">
            Valor Total Comercial:
          </span>
          <span className="text-blue-950 font-black text-base">
            {formatCurrency(valorTotalVP)}
          </span>
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
