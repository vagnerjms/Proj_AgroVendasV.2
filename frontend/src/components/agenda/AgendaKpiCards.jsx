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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
            <span className="truncate">Total a Receber (Em Aberto)</span>
            <DollarSign className="w-4 h-4 text-amber-700 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-amber-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalALiquidarProgramado)}>
            {formatCurrency(totalALiquidarProgramado)}
          </div>
          <span className="text-[11px] text-gray-400 block truncate">Saldo pendente a receber das lojas</span>
        </div>

        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
            <span className="truncate">Total Comercial VP Programado</span>
            <TrendingUp className="w-4 h-4 text-blue-700 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-blue-950 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalVPProgramado)}>
            {formatCurrency(totalVPProgramado)}
          </div>
          <span className="text-[11px] text-gray-400 block truncate">Cotação comercial das {scheduleListCount} VPs</span>
        </div>

        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
            <span className="truncate">Lojas com Saldo Aberto</span>
            <Clock className="w-4 h-4 text-amber-600 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-amber-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
            {totalPedidosAbertos} entregas
          </div>
          <span className="text-[11px] text-gray-400 block truncate">Pendentes ou recebimento parcial</span>
        </div>

        <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
            <span className="truncate">Total Recebido (Quitado)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl xl:text-2xl font-black text-emerald-700 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalRecebido)}>
            {formatCurrency(totalRecebido)}
          </div>
          <span className="text-[11px] text-gray-400 block truncate">Valores já quitados pelas lojas</span>
        </div>
      </div>
    );
  }

  // Produtores
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5 min-w-0">
        <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
          <span className="truncate">Total a Repassar (Em Aberto)</span>
          <DollarSign className="w-4 h-4 text-amber-700 shrink-0 ml-1" />
        </div>
        <div className="text-lg sm:text-xl xl:text-2xl font-black text-amber-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalProdutorAPagar)}>
          {formatCurrency(totalProdutorAPagar)}
        </div>
        <span className="text-[11px] text-gray-400 block truncate">Saldo a repassar (Produtor recebe 100% da NF)</span>
      </div>

      <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5 min-w-0">
        <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
          <span className="truncate">Total Faturado em NF</span>
          <FileText className="w-4 h-4 text-emerald-800 shrink-0 ml-1" />
        </div>
        <div className="text-lg sm:text-xl xl:text-2xl font-black text-gray-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalNFProgramado)}>
          {formatCurrency(totalNFProgramado)}
        </div>
        <span className="text-[11px] text-gray-400 block truncate">Base de faturamento integral (100% ao produtor)</span>
      </div>

      <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5 min-w-0">
        <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
          <span className="truncate">FUNRURAL Destacado (1,63%)</span>
          <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 ml-1" />
        </div>
        <div className="text-lg sm:text-xl xl:text-2xl font-black text-blue-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalFunruralRetido)}>
          {formatCurrency(totalFunruralRetido)}
        </div>
        <span className="text-[11px] text-gray-400 block truncate">Informativo fiscal — Recolhido pelo produtor</span>
      </div>

      <div className="bg-white p-4 sm:p-4.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5 min-w-0">
        <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
          <span className="truncate">Total Já Repassado</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />
        </div>
        <div className="text-lg sm:text-xl xl:text-2xl font-black text-emerald-700 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={formatCurrency(totalProdutorPago)}>
          {formatCurrency(totalProdutorPago)}
        </div>
        <span className="text-[11px] text-gray-400 block truncate">Valores já transferidos aos produtores</span>
      </div>
    </div>
  );
}
