import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  FileText, 
  ShieldCheck 
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

/**
 * Cards de Indicadores (KPIs) para a tela de Agenda e Alertas
 * Renderiza métricas específicas dependendo da aba ativa ('lojas' ou 'produtores').
 */
export default function AgendaKpiCards({
  activeTab,
  // Lojas KPIs
  totalALiquidarProgramado = 0,
  totalVPProgramado = 0,
  totalPedidosAbertos = 0,
  totalRecebido = 0,
  scheduleListCount = 0,
  // Produtores KPIs
  totalProdutorAPagar = 0,
  totalNFProgramado = 0,
  totalFunruralRetido = 0,
  totalProdutorPago = 0
}) {
  if (activeTab === 'lojas') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
            <span>Total a Receber (Em Aberto)</span>
            <DollarSign className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-black text-amber-900">
            {formatCurrency(totalALiquidarProgramado)}
          </div>
          <span className="text-[11px] text-gray-400 block">Saldo pendente a receber das lojas</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
            <span>Total Comercial VP Programado</span>
            <TrendingUp className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-2xl font-black text-blue-950">
            {formatCurrency(totalVPProgramado)}
          </div>
          <span className="text-[11px] text-gray-400 block">Cotação comercial das {scheduleListCount} VPs</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
            <span>Lojas com Saldo Aberto</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900">
            {totalPedidosAbertos} entregas
          </div>
          <span className="text-[11px] text-gray-400 block">Pendentes ou recebimento parcial</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
            <span>Total Recebido (Quitado)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatCurrency(totalRecebido)}
          </div>
          <span className="text-[11px] text-gray-400 block">Valores já quitados pelas lojas</span>
        </div>
      </div>
    );
  }

  // Produtores
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
        <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
          <span>Total a Repassar (Em Aberto)</span>
          <DollarSign className="w-4 h-4 text-amber-700" />
        </div>
        <div className="text-2xl font-black text-amber-900">
          {formatCurrency(totalProdutorAPagar)}
        </div>
        <span className="text-[11px] text-gray-400 block">Saldo líquido a repassar aos produtores</span>
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
        <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
          <span>Total Faturado em NF</span>
          <FileText className="w-4 h-4 text-emerald-800" />
        </div>
        <div className="text-2xl font-black text-gray-900">
          {formatCurrency(totalNFProgramado)}
        </div>
        <span className="text-[11px] text-gray-400 block">Base bruta de faturamento das notas</span>
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
        <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
          <span>(-) FUNRURAL Retido (1,63%)</span>
          <ShieldCheck className="w-4 h-4 text-red-600" />
        </div>
        <div className="text-2xl font-black text-red-600">
          -{formatCurrency(totalFunruralRetido)}
        </div>
        <span className="text-[11px] text-gray-400 block">Tributos retidos sobre o valor da NF</span>
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-1">
        <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
          <span>Total Já Repassado</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="text-2xl font-black text-emerald-700">
          {formatCurrency(totalProdutorPago)}
        </div>
        <span className="text-[11px] text-gray-400 block">Valores já transferidos aos produtores</span>
      </div>
    </div>
  );
}
