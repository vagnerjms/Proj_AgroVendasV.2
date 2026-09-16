import React from 'react';
import { Package, Trash2, Plus } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export default function SaleItemsTable({
  saleItems,
  clients,
  products,
  selectedClient,
  onClientSelect,
  onAddItem,
  onRemoveItem,
  onItemProductSelect,
  onItemFieldChange,
  totalWeightKg,
  totalVolumes,
  valorTotalVP,
  funrural,
  liquidoAReceber,
  effectiveTotalNF
}) {
  const parseNum = (val) => {
    if (val === '' || val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let s = String(val).trim();
    if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',')) s = s.replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-3">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-700" />
          <div>
            <h2 className="text-sm font-extrabold text-gray-900">Itens da Venda & Produtos (Carga Mista)</h2>
            <span className="text-[11px] text-gray-500">
              Adicione um ou múltiplos produtos para a mesma operação/nota fiscal. O sistema consolida pesos, caixas e totais fiscais e comerciais.
            </span>
          </div>
        </div>
      </div>

      {/* SELETOR DE CLIENTE COMPRADOR */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <label className="block text-xs font-bold text-gray-800 mb-1">
          Cliente / Destinatário Comprador *
        </label>
        <select
          required
          value={selectedClient}
          onChange={(e) => onClientSelect(e.target.value)}
          className="w-full bg-white border border-gray-300 text-xs rounded-lg px-3 py-2.5 font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#1d5a37] shadow-sm"
        >
          <option value="">-- Selecione o Cliente Comprador --</option>
          {!clients.some(c => c.name === selectedClient) && selectedClient && (
            <option value={selectedClient}>{selectedClient} (Importado da NF-e)</option>
          )}
          {clients.map(c => (
            <option key={c.id || c.name} value={c.name}>
              {c.name} {c.city ? `(${c.city}/${c.state || c.uf || 'SP'})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* LISTA DE PRODUTOS DA VENDA */}
      <div className="space-y-4">
        {saleItems.map((item, index) => {
          const isItemGranel = (item.unit && (item.unit.includes('Granel') || item.unit.includes('(kg)'))) || (item.product && (item.product.toLowerCase().includes('cebola') || item.product.includes('Granel') || item.product.includes('(kg)'))) || Number(item.boxWeightKg) === 1;
          const isItemSacas = !isItemGranel && (item.unit?.toLowerCase().includes('saca') || item.unit?.toLowerCase().includes('sc') || item.product?.toLowerCase().includes('batata'));
          const unitShort = isItemGranel ? 'kg' : (isItemSacas ? 'sc' : 'cx');
          const itemKg = parseNum(item.totalKg);
          const boxW = parseNum(item.boxWeightKg) || (isItemGranel ? 1 : 29);
          const itemVol = isItemGranel ? itemKg : (boxW > 0 ? (itemKg / boxW) : 0);
          const itemP = parseNum(item.pricePerKg);
          const itemNfVal = item.totalNf !== '' && item.totalNf !== undefined ? parseNum(item.totalNf) : (itemKg * itemP);
          const itemQuote = parseNum(item.dailyQuote);
          const isQuoteKg = (itemQuote > 0 && itemQuote <= 10.0) || isItemGranel;
          const itemVPVal = itemQuote > 0 ? (isQuoteKg ? (itemKg * itemQuote) : (itemVol * itemQuote)) : itemNfVal;

          return (
            <div 
              key={item.id || index}
              className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3 transition-all hover:border-emerald-300"
            >
              {/* Header do Item */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md">
                    Item #{index + 1}
                  </span>
                  <span className="text-xs font-bold text-gray-800">
                    {item.product || 'Selecione o Produto'}
                  </span>
                  <span className="text-[10px] text-gray-600 font-semibold bg-white px-2 py-0.5 rounded border border-gray-200">
                    {item.unit || 'Sacas (25kg)'}
                  </span>
                </div>

                {saleItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveItem(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-md transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="Excluir este produto da venda"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover</span>
                  </button>
                )}
              </div>

              {/* Linha 1: Seleção de Produto e Unidade */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Produto / Commodity *
                  </label>
                  <select
                    required
                    value={item.product}
                    onChange={(e) => onItemProductSelect(index, e.target.value)}
                    className="w-full bg-white border border-gray-300 text-xs rounded-lg px-2.5 py-2 font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#1d5a37]"
                  >
                    <option value="">-- Escolha o Produto --</option>
                    {!products.some(p => p.name === item.product) && item.product && (
                      <option value={item.product}>{item.product} (Importado)</option>
                    )}
                    {products.map(p => (
                      <option key={p.id || p.name} value={p.name}>
                        {p.name} — {p.defaultUnit || `${p.unitKg}kg`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Embalagem / Padrão
                  </label>
                  <select
                    value={item.unit}
                    onChange={(e) => onItemFieldChange(index, 'unit', e.target.value)}
                    className="w-full bg-white border border-gray-300 text-xs rounded-lg px-2.5 py-2 font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-[#1d5a37]"
                  >
                    <option value="Caixas (29kg)">Caixas (29kg) — Cenoura / Padrão</option>
                    <option value="Caixas (20kg)">Caixas / Sacos (20kg) — Beterraba</option>
                    <option value="Sacas (50kg)">Sacas (50kg) — Batata Especial</option>
                    <option value="Sacas (25kg)">Sacas (25kg) — Batata / Cebola</option>
                    <option value="Sacas (60kg)">Sacas (60kg) — Grãos / Soja / Milho</option>
                    <option value="Granel (kg)">Granel (kg) — Raízes / Granel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Peso Padrão Embalagem (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    disabled={isItemGranel}
                    value={item.boxWeightKg}
                    onChange={(e) => onItemFieldChange(index, 'boxWeightKg', e.target.value)}
                    className={`w-full border rounded-lg px-2.5 py-2 text-xs font-bold outline-none ${
                      isItemGranel ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              {/* Linha 2: Pesos, Preços e Cotações */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 bg-white p-3 rounded-lg border border-slate-200">
                
                {/* Peso Total do Item */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
                    1. Peso Total (kg) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 17400"
                    value={item.totalKg}
                    onChange={(e) => onItemFieldChange(index, 'totalKg', e.target.value)}
                    className="w-full bg-emerald-50/40 border border-emerald-300 text-xs rounded-lg px-2 py-1.5 font-extrabold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                {/* Caixas Calculadas */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
                    2. Volumes ({unitShort})
                  </label>
                  <div className="w-full bg-gray-50 border border-gray-200 text-xs rounded-lg px-2 py-1.5 font-extrabold text-gray-900 whitespace-nowrap overflow-x-auto">
                    {formatNumber(itemVol, isItemGranel ? 0 : 2)} {unitShort}
                  </div>
                </div>

                {/* Preço Unitário NF (R$/kg) */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
                    3. Preço NF (R$/kg)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 1,41"
                    value={item.pricePerKg}
                    onChange={(e) => onItemFieldChange(index, 'pricePerKg', e.target.value)}
                    className="w-full bg-white border border-gray-300 text-xs rounded-lg px-2 py-1.5 font-bold text-gray-900 outline-none"
                  />
                </div>

                {/* Cotação do Dia Comercial */}
                <div>
                  <label className="block text-[10px] font-bold text-emerald-900 mb-0.5">
                    4. Cotação (R$/{unitShort})
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 45,00"
                    value={item.dailyQuote}
                    onChange={(e) => onItemFieldChange(index, 'dailyQuote', e.target.value)}
                    className="w-full bg-blue-50/40 border border-blue-300 text-xs rounded-lg px-2 py-1.5 font-bold text-blue-950 outline-none"
                  />
                </div>

                {/* Subtotal NF */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
                    Subtotal NF (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={item.totalNf}
                    onChange={(e) => onItemFieldChange(index, 'totalNf', e.target.value)}
                    className="w-full bg-white border border-emerald-400 text-xs rounded-lg px-2 py-1.5 font-extrabold text-emerald-950 outline-none"
                  />
                </div>

                {/* Subtotal Comercial VP */}
                <div>
                  <label className="block text-[10px] font-bold text-blue-900 mb-0.5">
                    Subtotal VP (R$)
                  </label>
                  <div className="w-full bg-blue-50 border border-blue-200 text-xs rounded-lg px-2 py-1.5 font-black text-blue-950 whitespace-nowrap overflow-x-auto">
                    {formatCurrency(itemVPVal)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* BOTÃO ADICIONAR OUTRO PRODUTO */}
      <div className="flex justify-center pt-1">
        <button
          type="button"
          onClick={onAddItem}
          className="bg-white hover:bg-slate-100 border border-dashed border-slate-300 hover:border-emerald-600 text-slate-700 hover:text-emerald-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer w-full justify-center shadow-2xs"
        >
          <Plus className="w-4 h-4 text-emerald-700" />
          <span>Adicionar Outro Produto na Mesma Venda / Carga Mista</span>
        </button>
      </div>

      {/* BARRA DE TOTAIS CONSOLIDADOS DA VENDA */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 text-xs">
        <div className="min-w-0">
          <span className="block text-[10px] font-bold text-emerald-800 uppercase truncate">Peso Total Carga</span>
          <span className="text-sm font-black text-gray-900 truncate block" title={`${formatNumber(totalWeightKg, 0)} kg`}>{formatNumber(totalWeightKg, 0)} kg</span>
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] font-bold text-emerald-800 uppercase truncate">Total Volumes</span>
          <span className="text-sm font-black text-gray-900 truncate block" title={`${formatNumber(totalVolumes, 2)} vol`}>{formatNumber(totalVolumes, 2)} vol</span>
        </div>
        <div className="bg-blue-50/90 p-2 rounded-lg border border-blue-200 min-w-0">
          <span className="block text-[10px] font-bold text-blue-900 uppercase truncate">Total Comercial (VP)</span>
          <span className="text-sm font-black text-blue-950 truncate block" title={formatCurrency(valorTotalVP)}>{formatCurrency(valorTotalVP)}</span>
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] font-bold text-red-700 uppercase truncate">(-) FUNRURAL (s/ NF)</span>
          <span className="text-sm font-black text-red-600 truncate block" title={formatCurrency(funrural?.funruralTotal || 0)}>-{formatCurrency(funrural?.funruralTotal || 0)}</span>
        </div>
        <div className="bg-emerald-100/90 p-2 rounded-lg border border-emerald-300 min-w-0">
          <span className="block text-[10px] font-bold text-emerald-900 uppercase truncate">(=) Valor a Liquidar</span>
          <span className="text-sm font-black text-emerald-950 truncate block" title={formatCurrency(liquidoAReceber)}>{formatCurrency(liquidoAReceber)}</span>
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] font-bold text-gray-600 uppercase truncate">Valor Total NF</span>
          <span className="text-sm font-bold text-gray-800 truncate block" title={formatCurrency(effectiveTotalNF)}>{formatCurrency(effectiveTotalNF)}</span>
        </div>
      </div>
    </div>
  );
}
