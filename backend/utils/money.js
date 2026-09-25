/**
 * Módulo de Precisão Financeira e Contábil — AgroVenda V2
 * Elimina imprecisões de ponto flutuante IEEE 754 no cálculo de tributos e comissões agrícolas.
 */

/**
 * Arredonda um valor numérico para exatamente 2 casas decimais (Half-Up).
 * @param {number|string} value
 * @returns {number}
 */
function roundMoney(value) {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return 0.0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Alíquotas Oficiais do FUNRURAL (Produtor Rural Pessoa Física)
 * Total: 1,63%
 */
const TAX_RATES = {
  PREVIDENCIA: 0.0120, // 1,20% Previdência Social
  RAT: 0.0010,         // 0,10% Riscos Ambientais do Trabalho
  SENAR: 0.0033,       // 0,33% Fundo SENAR
  FUNRURAL_TOTAL: 0.0163 // 1,63% Total Consolidado
};

/**
 * Calcula todas as deduções fiscais do FUNRURAL com soma exata dos centavos componentes.
 * @param {number|string} totalOperation
 * @returns {{ previdencia: number, rat: number, senar: number, funruralTotal: number, liquidoNF: number }}
 */
function calculateFiscalDeductions(totalOperation) {
  const total = roundMoney(totalOperation);
  if (total <= 0) {
    return { previdencia: 0, rat: 0, senar: 0, funruralTotal: 0, liquidoNF: 0 };
  }

  const previdencia = roundMoney(total * TAX_RATES.PREVIDENCIA);
  const rat = roundMoney(total * TAX_RATES.RAT);
  const senar = roundMoney(total * TAX_RATES.SENAR);
  // A retenção total do FUNRURAL é a soma exata dos seus 3 componentes tributários
  const funruralTotal = roundMoney(previdencia + rat + senar);
  const liquidoNF = roundMoney(total - funruralTotal);

  return {
    previdencia,
    rat,
    senar,
    funruralTotal,
    liquidoNF
  };
}

/**
 * Calcula comissão do intermediador/corretor, spread comercial e o saldo líquido a repassar ao produtor.
 * @param {number|string} valorComercialVP
 * @param {number|string} totalOperationNF
 * @param {number|string} taxaPercentual (padrão 3%)
 * @returns {{ taxaPercentual: number, comissao: number, liquidoProdutor: number, spreadComercial: number, lucroCorretor: number }}
 */
function calculateCommission(valorComercialVP, totalOperationNF, taxaPercentual = 3.0) {
  const valorVP = roundMoney(valorComercialVP);
  let valorNF = 0;
  let taxa = 3.0;

  if (arguments.length === 2 && Number(totalOperationNF) <= 100.0 && Number(totalOperationNF) > 0) {
    // Compatibilidade para chamada calculateCommission(valorVP, feeValue)
    taxa = Number(totalOperationNF);
    valorNF = 0;
  } else {
    valorNF = roundMoney(totalOperationNF || 0);
    taxa = Number(taxaPercentual) || 3.0;
  }

  // Dedução de FUNRURAL é calculada sobre a NF
  const fiscal = calculateFiscalDeductions(valorNF > 0 ? valorNF : valorVP);
  // O repasse líquido ao produtor é rigorosamente o valor da NF menos FUNRURAL
  const liquidoProdutor = roundMoney(Math.max(0, (valorNF > 0 ? valorNF : valorVP) - fiscal.funruralTotal));

  // Comissão de corretagem (calculada sobre a base comercial da venda)
  const comissao = roundMoney(valorVP * (taxa / 100));

  // Spread comercial: diferença entre o valor recebido da loja (VP) e o valor faturado da NF do produtor
  const spreadComercial = roundMoney(Math.max(0, valorVP - (valorNF > 0 ? valorNF : valorVP)));

  // Lucro total da AgroVenda: spread comercial + comissão de corretagem
  const lucroCorretor = roundMoney(spreadComercial + comissao);

  return {
    taxaPercentual: taxa,
    comissao,
    liquidoProdutor,
    spreadComercial,
    lucroCorretor
  };
}

/**
 * Calcula o Valor a Liquidar (Receber) da operação: Total Comercial (VP) - Funrural (calculado sobre a NF)
 * @param {number|string} valorComercialVP
 * @param {number|string} totalOperationNF
 * @returns {{ valorComercialVP: number, totalOperationNF: number, funruralTotal: number, valorLiquidar: number }}
 */
function calculateLiquidationValue(valorComercialVP, totalOperationNF) {
  const valorVP = roundMoney(valorComercialVP);
  const valorNF = roundMoney(totalOperationNF);
  const fiscal = calculateFiscalDeductions(valorNF > 0 ? valorNF : valorVP);
  const valorLiquidar = roundMoney(Math.max(0, valorVP - fiscal.funruralTotal));
  return {
    valorComercialVP: valorVP,
    totalOperationNF: valorNF,
    funruralTotal: fiscal.funruralTotal,
    valorLiquidar
  };
}

/**
 * Apuração canônica do Valor Comercial (VP) da Venda no Backend
 * Harmonizado rigorosamente com frontend/src/utils/calculations.js
 * @param {object} sale
 * @returns {number}
 */
function getSaleCommercialValue(sale) {
  if (!sale) return 0.0;

  // 1. Soma dos itens múltiplos da venda (se existirem itens com cotação/valor)
  if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
    const itemsSum = sale.items.reduce((acc, it) => {
      const itKg = Number(it.kg) || 0;
      const isBatata = (it.product && it.product.toLowerCase().includes('batata')) || (sale.notes && sale.notes.toLowerCase().includes('batata'));
      const bw = Number(it.boxWeightKg) || (isBatata ? 25 : 29);
      const itVol = Number(it.quantity) || (itKg > 0 && bw > 0 ? (itKg / bw) : 0);
      const q = Number(it.dailyQuote) || 0;
      if (q > 0) {
        const isQKg = (q > 0 && q <= 10.0) || (it.unit && it.unit.includes('Granel')) || bw === 1;
        return acc + (isQKg ? (itKg * q) : (itVol * q));
      }
      if (Number(it.valorTotalVP) > 0) return acc + Number(it.valorTotalVP);
      if (Number(it.total) > 0) return acc + Number(it.total);
      return acc;
    }, 0);

    if (itemsSum > 0) return roundMoney(itemsSum);
  }

  // 2. Campo explícito gravado no documento
  if (Number(sale.valorTotalVP) > 0) {
    return roundMoney(sale.valorTotalVP);
  }
  if (Number(sale.valorVP) > 0) {
    return roundMoney(sale.valorVP);
  }

  // 3. Cotação informada ou identificada em notas
  let cotacao = Number(sale.dailyQuote) || 0;
  if (!cotacao && sale.notes) {
    const matchCot = sale.notes.match(/Cotação:?\s*R\$\s*([\d,.]+)/i);
    if (matchCot) cotacao = parseFloat(matchCot[1].replace(',', '.'));
  }

  const kg = Number(sale.totalKg) || 0;
  const isBatata = (sale.items && sale.items.some(it => it.product?.toLowerCase().includes('batata'))) || (sale.notes && sale.notes.toLowerCase().includes('batata'));
  const bw = isBatata ? 25 : 29;
  const caixas = Number(sale.totalVolumes) || (kg > 0 && bw > 0 ? (kg / bw) : 0);

  if (cotacao > 0 && cotacao <= 10.0 && kg > 0) {
    return roundMoney(kg * cotacao);
  }
  if (cotacao > 10.0 && caixas > 0) {
    return roundMoney(caixas * cotacao);
  }

  return roundMoney(Number(sale.totalOperation) || 0);
}

module.exports = {
  roundMoney,
  TAX_RATES,
  calculateFiscalDeductions,
  calculateCommission,
  calculateLiquidationValue,
  getSaleCommercialValue
};
