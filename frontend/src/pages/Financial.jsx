import React, { useState, useEffect } from 'react';
import { DollarSign, FileSpreadsheet, ArrowUpRight, ArrowDownRight, ShieldCheck, CheckCircle2, Building2, Coins } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { api } from '../services/api';

export default function Financial({ view = 'overview' }) {
  const [sales, setSales] = useState([]);
  const [financial, setFinancial] = useState({
    totalAReceber: 0.00,
    totalAReceberNF: 0.00,
    totalAReceberVP: 0.00,
    totalAPagar: 0.00,
    totalRecebido: 0.00,
    vencidos: 0.00,
    totalFunrural: 0.00,
    totalPrevidencia: 0.00,
    totalRat: 0.00,
    totalSenar: 0.00,
    totalComissao: 0.00,
    totalLiquidoProdutor: 0.00,
    salesCount: 0
  });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [salesData, finData] = await Promise.all([
        api.get('/api/sales'),
        api.get('/api/financial')
      ]);
      if (Array.isArray(salesData)) setSales(salesData);
      if (finData) setFinancial(finData);
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <div className="text-xs font-bold text-[#091b2e] uppercase">INICIO / FINANCEIRO & FISCAL</div>
        <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
          {view === 'funrural' ? 'Apuração e Retenção de FUNRURAL' : 'Contas, Cobrança e Fluxo Financeiro'}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Posição financeira consolidada em tempo real da base de dados do MongoDB ({financial.salesCount || sales.length} vendas cadastradas).
        </p>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
            <span>Total a Receber (NF)</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900">
            {formatCurrency(financial.totalAReceberNF || financial.totalAReceber)}
          </div>
          <span className="text-[11px] text-gray-400 block font-medium">Faturamento bruto faturado</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
            <span>Total Comercial (VP)</span>
            <ArrowUpRight className="w-4 h-4 text-[#df7b1b]" />
          </div>
          <div className="text-2xl font-extrabold text-blue-950">
            {formatCurrency(financial.totalAReceberVP)}
          </div>
          <span className="text-[11px] text-gray-400 block font-medium">Base de cotação / caixas</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
            <span>Total a Pagar</span>
            <ArrowDownRight className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900">
            {formatCurrency(financial.totalAPagar)}
          </div>
          <span className="text-[11px] text-gray-400 block font-medium">Compras e produtores</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
            <span>FUNRURAL Total Retido (1,63%)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-extrabold text-[#091b2e]">
            {formatCurrency(financial.totalFunrural)}
          </div>
          <span className="text-[11px] text-emerald-700 block font-medium">Dedução fiscal consolidada</span>
        </div>
      </div>

      {/* Funrural Detail breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Detalhamento de Alíquotas FUNRURAL (Sobre Comercialização de Produção - 1,63%)
          </h2>
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            Retenção Oficial Total: {formatCurrency(financial.totalFunrural)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-100">
            <span className="text-gray-500 block font-semibold">Previdência Social (1,20%)</span>
            <span className="text-lg font-bold text-gray-900 mt-1 block">
              {formatCurrency(financial.totalPrevidencia)}
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5 block">Contribuição previdenciária</span>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-100">
            <span className="text-gray-500 block font-semibold">RAT / GILRAT (0,10%)</span>
            <span className="text-lg font-bold text-gray-900 mt-1 block">
              {formatCurrency(financial.totalRat)}
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5 block">Riscos ambientais do trabalho</span>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-100">
            <span className="text-gray-500 block font-semibold">SENAR (0,33%)</span>
            <span className="text-lg font-bold text-gray-900 mt-1 block">
              {formatCurrency(financial.totalSenar)}
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5 block">Fundo de capacitação rural</span>
          </div>
        </div>
      </div>

      {/* Receivables Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Títulos e Notas Vinculadas</h2>
          <span className="text-xs font-semibold text-gray-500 bg-white px-2.5 py-0.5 rounded border border-gray-200">
            {sales.length} registros no banco
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#091b2e] text-white font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Operação</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4 text-right">Valor Bruto (NF)</th>
                <th className="py-3 px-4 text-right">FUNRURAL (1,63%)</th>
                <th className="py-3 px-4 text-right">Comissão (3%)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sales.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-gray-900">
                    {s.id} 
                    <span className="block font-normal text-gray-400 text-[11px]">{formatDate(s.saleDate)}</span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-gray-800">{s.client}</td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">{formatCurrency(s.totalOperation)}</td>
                  <td className="py-3 px-4 text-right text-red-600 font-medium">-{formatCurrency(s.funruralTotal)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-blue-900">{formatCurrency(s.totalCommission)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      s.paymentStatus === 'Recebido' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-100 text-amber-900'
                    }`}>
                      {s.paymentStatus || 'A Receber'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
