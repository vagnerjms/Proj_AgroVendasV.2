import React, { useState, useEffect } from 'react';
import { DollarSign, FileSpreadsheet, ArrowUpRight, ArrowDownRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function Financial({ view = 'overview' }) {
  const [sales, setSales] = useState([]);
  const [financial, setFinancial] = useState({
    totalAReceber: 1139246.39,
    totalAPagar: 0.00,
    vencidos: 0.00
  });

  useEffect(() => {
    fetch('/api/sales')
      .then(res => res.json())
      .then(setSales)
      .catch(console.error);

    fetch('/api/financial')
      .then(res => res.json())
      .then(setFinancial)
      .catch(console.error);
  }, []);

  const totalFunrural = sales.reduce((acc, s) => acc + (s.funruralTotal || 0), 0);
  const totalPrevidencia = sales.reduce((acc, s) => acc + (s.previdenciaSocial || 0), 0);
  const totalRat = sales.reduce((acc, s) => acc + (s.rat || 0), 0);
  const totalSenar = sales.reduce((acc, s) => acc + (s.senar || 0), 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <div className="text-xs font-bold text-[#091b2e] uppercase">INICIO / FINANCEIRO & FISCAL</div>
        <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
          {view === 'funrural' ? 'Apuração e Retenção de FUNRURAL' : 'Contas, Cobrança e Fluxo Financeiro'}
        </h1>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
            <span>Total a Receber</span>
            <ArrowUpRight className="w-4 h-4 text-[#df7b1b]" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">
            {formatCurrency(financial.totalAReceber)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
            <span>Total a Pagar</span>
            <ArrowDownRight className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">
            {formatCurrency(financial.totalAPagar)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
            <span>FUNRURAL Total Retido (1,63%)</span>
            <ShieldCheck className="w-4 h-4 text-[#df7b1b]" />
          </div>
          <div className="text-2xl font-extrabold text-[#091b2e] mt-2">
            {formatCurrency(totalFunrural)}
          </div>
        </div>
      </div>

      {/* Funrural Detail breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-gray-900">
          Detalhamento de Alíquotas FUNRURAL (Sobre Comercialização de Produção)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-100">
            <span className="text-gray-500 block font-semibold">Previdência Social (1,30%)</span>
            <span className="text-lg font-bold text-gray-900 mt-1 block">{formatCurrency(totalPrevidencia)}</span>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-100">
            <span className="text-gray-500 block font-semibold">RAT / GILRAT (0,10%)</span>
            <span className="text-lg font-bold text-gray-900 mt-1 block">{formatCurrency(totalRat)}</span>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-100">
            <span className="text-gray-500 block font-semibold">SENAR (0,23%)</span>
            <span className="text-lg font-bold text-gray-900 mt-1 block">{formatCurrency(totalSenar)}</span>
          </div>
        </div>
      </div>

      {/* Receivables Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xs font-bold text-gray-700 uppercase">Títulos e Notas Vinculadas</h2>
          <span className="text-xs text-gray-400">{sales.length} registros</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
            <tr>
              <th className="py-3 px-4">Operação</th>
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4 text-right">Valor Bruto</th>
              <th className="py-3 px-4 text-right">FUNRURAL</th>
              <th className="py-3 px-4 text-right">Comissão</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sales.map(s => (
              <tr key={s.id} className="hover:bg-gray-50/80">
                <td className="py-3 px-4 font-bold text-gray-900">{s.id} <span className="block font-normal text-gray-400 text-[11px]">{formatDate(s.saleDate)}</span></td>
                <td className="py-3 px-4 font-semibold text-gray-800">{s.client}</td>
                <td className="py-3 px-4 text-right font-bold text-gray-900">{formatCurrency(s.totalOperation)}</td>
                <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(s.funruralTotal)}</td>
                <td className="py-3 px-4 text-right font-semibold text-emerald-800">{formatCurrency(s.totalCommission)}</td>
                <td className="py-3 px-4 text-center">
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{s.paymentStatus || 'A Receber'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
