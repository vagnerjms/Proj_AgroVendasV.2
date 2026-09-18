/**
 * Módulo de Cálculos Financeiros e Conciliação Contábil — AgroVenda V2
 * Centraliza as regras de negócio de cotações, deduções fiscais (FUNRURAL)
 * e liquidação (Total, Parcial e Pendente).
 */

/**
 * Calcula a conciliação completa de uma venda com suporte a liquidação parcial
 */
export function calculateLiquidation(sale = {}) {
  const itemValorNF = Number(sale.valorTotalNF) || Number(sale.totalOperation) || Number(sale.valorNF) || 0;
  
  // Extração ou cálculo do FUNRURAL
  const funrural = (sale.funrural !== undefined && sale.funrural !== null) 
    ? Number(sale.funrural) 
    : (Number(sale.funruralTotal) || (itemValorNF * 0.0163));

  // Extração do Valor Comercial (VP)
  let valorVP = Number(sale.valorTotalVP) || Number(sale.valorVP) || 0;
  if (!valorVP && sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
    valorVP = sale.items.reduce((acc, it) => {
      const itKg = Number(it.kg) || 0;
      const bw = Number(it.boxWeightKg) || 25;
      const itVol = Number(it.quantity) || (itKg > 0 && bw > 0 ? itKg / bw : 0);
      const q = Number(it.dailyQuote) || 0;
      if (q > 0) {
        const isQKg = (q > 0 && q <= 10.0) || (it.unit && it.unit.includes('Granel')) || bw === 1;
        return acc + (isQKg ? (itKg * q) : (itVol * q));
      }
      if (Number(it.valorTotalVP) > 0) return acc + Number(it.valorTotalVP);
      if (Number(it.total) > 0) return acc + Number(it.total);
      return acc;
    }, 0);
  }
  if (!valorVP) valorVP = itemValorNF;

  // Total Líquido Oficial da Venda (Total Comercial - FUNRURAL)
  const totalLiquido = Math.max(0, valorVP - funrural);
  const paidAmount = Number(sale.paidAmount) || 0;

  // Status de Liquidação
  const isSettled = sale.paymentStatus === 'Recebido' || sale.status === 'Concluído' || (paidAmount > 0 && paidAmount >= totalLiquido - 0.01);
  const isPartial = !isSettled && (sale.paymentStatus === 'Parcial' || (paidAmount > 0 && paidAmount < totalLiquido));

  const valorLiquidado = isSettled 
    ? totalLiquido 
    : (isPartial ? Math.min(paidAmount, totalLiquido) : 0);

  const valorALiquidar = isSettled 
    ? 0 
    : (isPartial ? Math.max(0, totalLiquido - paidAmount) : totalLiquido);

  const liquidoNF = Math.max(0, itemValorNF - funrural);

  let statusLabel = 'A Receber';
  if (isSettled) statusLabel = 'Recebido';
  else if (isPartial) statusLabel = 'Parcial';

  return {
    valorVP,
    valorTotalNF: itemValorNF,
    funrural,
    totalLiquido,
    paidAmount,
    valorLiquidado,
    valorALiquidar,
    liquidoNF,
    isSettled,
    isPartial,
    statusLabel
  };
}

/**
 * Limpa o nome do produto removendo sufixos de embalagem
 */
export function cleanProductName(name) {
  if (!name) return 'Produto';
  let n = name.trim();
  n = n.replace(/\s*\(Caixa\s*\d*kg\)/i, '')
       .replace(/\s*\(Sacas?\s*\d*kg\)/i, '')
       .replace(/\s*\(\d+\s*kg\)/i, '')
       .replace(/\s*\(Caixa\)/i, '')
       .replace(/\s*\(Saca\)/i, '')
       .trim();
  return n || name.trim();
}
