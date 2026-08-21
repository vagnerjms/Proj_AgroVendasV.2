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
 * Calcula comissão do intermediador/corretor e o saldo líquido a repassar ao produtor.
 * @param {number|string} valorComercialVP
 * @param {number|string} taxaPercentual (padrão 3%)
 * @returns {{ taxaPercentual: number, comissao: number, liquidoProdutor: number }}
 */
function calculateCommission(valorComercialVP, taxaPercentual = 3.0) {
  const valorVP = roundMoney(valorComercialVP);
  const taxa = Number(taxaPercentual) || 3.0;
  const comissao = roundMoney(valorVP * (taxa / 100));
  const liquidoProdutor = roundMoney(valorVP - comissao);

  return {
    taxaPercentual: taxa,
    comissao,
    liquidoProdutor
  };
}

module.exports = {
  roundMoney,
  TAX_RATES,
  calculateFiscalDeductions,
  calculateCommission
};
