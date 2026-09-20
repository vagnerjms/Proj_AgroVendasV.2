/**
 * Módulo de Cálculos Financeiros e Conciliação Contábil — AgroVenda V2
 * Centraliza as regras de negócio de cotações, deduções fiscais (FUNRURAL)
 * e liquidação (Total, Parcial e Pendente).
 */

/**
 * Calcula a decomposição do FUNRURAL (1,63% = Previdência 1,20% + RAT 0,10% + SENAR 0,33%)
 */
export function calculateFunrural(totalNF = 0) {
  const base = Number(totalNF) || 0;
  const previdenciaSocial = base * 0.012;
  const rat = base * 0.001;
  const senar = base * 0.0033;
  const funruralTotal = previdenciaSocial + rat + senar; // 1.63%
  return {
    previdenciaSocial,
    rat,
    senar,
    funruralTotal
  };
}

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

  const percentPaid = totalLiquido > 0 ? Math.min(100, (valorLiquidado / totalLiquido) * 100) : (isSettled ? 100 : 0);

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
    isFullySettled: isSettled,
    isPartial,
    statusLabel,
    paymentStatus: statusLabel,
    percentPaid
  };
}

/**
 * Alias para resumo financeiro
 */
export function calculateSummary(params = {}) {
  return calculateLiquidation(params);
}

/**
 * Converte com precisão entradas monetárias digitadas pelo usuário (pt-BR ou en-US) para número decimal puro.
 * Suporta: "1200,23", "1200.23", "1.200,23", "1,200.23", números puros e strings com prefixo R$.
 */
export function parseMoneyInput(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let s = String(val).replace(/R\$\s*/gi, '').trim();
  if (!s) return 0;

  // Se contém tanto ponto quanto vírgula
  if (s.includes('.') && s.includes(',')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // Padrão brasileiro: "1.200,23" -> remove o ponto de milhar e troca vírgula por ponto
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Padrão americano: "1,200.23" -> remove a vírgula de milhar
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    // Apenas vírgula: "1200,23" -> troca vírgula por ponto decimal
    s = s.replace(',', '.');
  }
  // Se tem apenas ponto ("1200.23" gerado por input[type=number] ou digitado), mantém o ponto como separador decimal!

  const num = parseFloat(s);
  return isNaN(num) || !isFinite(num) ? 0 : Math.round((num + Number.EPSILON) * 100) / 100;
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



