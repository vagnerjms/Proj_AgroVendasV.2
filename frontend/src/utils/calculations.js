/**
 * Módulo de Cálculos Financeiros e Conciliação Contábil — AgroVenda V2
 * Centraliza as regras de negócio de cotações, deduções fiscais (FUNRURAL)
 * e liquidação (Total, Parcial e Pendente).
 */
import { TAX_RATES } from '../constants/agriConstants';

/**
 * Arredonda um valor numérico para exatamente 2 casas decimais (Half-Up).
 * Elimina imprecisões de ponto flutuante IEEE 754.
 */
export function roundMoney(value) {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return 0.0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula a decomposição do FUNRURAL (1,63% = Previdência 1,20% + RAT 0,10% + SENAR 0,33%)
 * com soma exata centesimal idêntica ao backend.
 */
export function calculateFunrural(totalNF = 0) {
  const base = roundMoney(totalNF);
  if (base <= 0) {
    return {
      previdenciaSocial: 0,
      rat: 0,
      senar: 0,
      funruralTotal: 0
    };
  }

  const previdenciaSocial = roundMoney(base * (TAX_RATES.PREVIDENCIA || 0.0120));
  const rat = roundMoney(base * (TAX_RATES.RAT || 0.0010));
  const senar = roundMoney(base * (TAX_RATES.SENAR || 0.0033));
  const funruralTotal = roundMoney(previdenciaSocial + rat + senar);

  return {
    previdenciaSocial,
    rat,
    senar,
    funruralTotal
  };
}

/**
 * Função canônica única para apuração do Valor Total Comercial (VP).
 * Suporta:
 * 1. Soma dos itens múltiplos da venda (se existirem itens cadastrados);
 * 2. Cotações por caixa vs por kg (<= 10.0 ou Granel);
 * 3. Peso padrão por cultura (Batata 25kg, Granel 1kg, Cenoura/Padrão 29kg);
 * 4. Extração de cotação via Regex em notas ('Cotação: R$ ...');
 * 5. Fallback consistente para totalOperation / total faturado.
 */
export function getValorTotalVP(sale = {}) {
  if (!sale) return 0;

  // 1. Prioriza soma dos sub-itens da venda
  if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
    const itemsSum = sale.items.reduce((acc, it) => {
      const itKg = Number(it.kg) || 0;
      const bw = Number(it.boxWeightKg) || 25;
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

  // 2. Propriedade explícita gravada no registro
  if (Number(sale.valorTotalVP) > 0) {
    return roundMoney(sale.valorTotalVP);
  }
  if (Number(sale.valorVP) > 0) {
    return roundMoney(sale.valorVP);
  }

  // 3. Heurística com cotação informada ou presente nas observações
  let cotacao = Number(sale.dailyQuote) || 0;
  if (!cotacao && sale.notes) {
    const matchCot = sale.notes.match(/Cotação:?\s*R\$\s*([\d,.]+)/i);
    if (matchCot) cotacao = parseFloat(matchCot[1].replace(',', '.'));
  }

  const kg = Number(sale.totalKg) || 0;
  const isBatata = (sale.items && sale.items.some(it => it.product?.toLowerCase().includes('batata'))) || (sale.notes && sale.notes.toLowerCase().includes('batata'));
  const bw = isBatata ? 25 : 29;
  const caixas = Number(sale.totalVolumes) || (kg > 0 ? (kg / bw) : 0);

  // Se a cotação foi informada em R$/kg (ex: R$ 2,15/kg), multiplica pelo peso total em kg
  if (cotacao > 0 && cotacao <= 10.0 && kg > 0) {
    return roundMoney(kg * cotacao);
  }

  if (cotacao > 10.0) {
    return roundMoney(caixas * cotacao);
  }

  return roundMoney(Number(sale.totalOperation) || (caixas * (cotacao || 45.0)));
}

/**
 * Calcula a conciliação financeira completa de uma venda com suporte a liquidação parcial
 */
export function calculateLiquidation(sale = {}) {
  const itemValorNF = roundMoney(Number(sale.valorTotalNF) || Number(sale.totalOperation) || Number(sale.valorNF) || 0);
  
  // Extração ou cálculo do FUNRURAL
  let funrural = 0;
  if (sale.funrural !== undefined && sale.funrural !== null) {
    funrural = roundMoney(sale.funrural);
  } else if (Number(sale.funruralTotal) > 0) {
    funrural = roundMoney(sale.funruralTotal);
  } else {
    funrural = calculateFunrural(itemValorNF).funruralTotal;
  }

  // Extração do Valor Comercial (VP) via função centralizada
  const valorVP = getValorTotalVP(sale) || itemValorNF;

  // Total Líquido Oficial da Venda (Total Comercial - FUNRURAL)
  const totalLiquido = roundMoney(Math.max(0, valorVP - funrural));
  const paidAmount = roundMoney(Math.max(Number(sale.producerPaidAmount) || 0, Number(sale.paidAmount) || 0));

  // Status de Liquidação (Unificado: Todo o valor é repassado ao produtor)
  const isSettled = sale.producerPaymentStatus === 'Pago' || sale.paymentStatus === 'Recebido' || sale.status === 'Concluído' || (paidAmount > 0 && paidAmount >= itemValorNF - 0.05);
  const isPartial = !isSettled && (sale.producerPaymentStatus === 'Parcial' || sale.paymentStatus === 'Parcial' || paidAmount > 0);

  const valorLiquidado = isSettled 
    ? (paidAmount > 0 ? paidAmount : itemValorNF) 
    : (isPartial ? paidAmount : 0);

  const liquidoNF = roundMoney(Math.max(0, itemValorNF - funrural));

  const valorALiquidar = isSettled 
    ? 0 
    : (isPartial ? roundMoney(Math.max(0, itemValorNF - paidAmount)) : itemValorNF);

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
  return isNaN(num) || !isFinite(num) ? 0 : roundMoney(num);
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
