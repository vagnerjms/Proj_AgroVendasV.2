// Funrural breakdown: 1.63% total (Previdência Social 1,30%, RAT 0,10%, SENAR 0,23%)
export function calculateFunrural(totalOperation) {
  const total = Number(totalOperation) || 0;
  const previdencia = total * 0.0130;
  const rat = total * 0.0010;
  const senar = total * 0.0023;
  const funruralTotal = previdencia + rat + senar;

  return {
    previdencia,
    rat,
    senar,
    funruralTotal
  };
}

/**
 * Cálculo de alta precisão a partir da pesagem total em Kilos (kg):
 * 1. totalKg
 * 2. caixas = totalKg / unitKg (ex: 29kg para caixa de cenoura)
 * 3. valorTotalNF = totalKg * precoKg (ou caixas * precoCaixa)
 * 4. funrural = valorTotalNF * 0.0163 (deduzido da NF)
 * 5. liquidoAReceber = valorTotalNF - funrural
 * 6. valorTotalVP = caixas * cotacaoCaixa
 * 7. comissao = valorTotalNF * (feeValue / 100)
 */
export function calculatePreciseSale({
  totalKg = 0,
  unitKg = 29,
  precoKg = 0,
  cotacaoCaixa = 0,
  feeType = 'Porcentagem (%)',
  feeValue = 3.0
}) {
  const kg = Number(totalKg) || 0;
  const uKg = Number(unitKg) || 29;
  const pKg = Number(precoKg) || 0;
  const cot = Number(cotacaoCaixa) || 0;

  // 1. Quantidade exata de caixas
  const caixas = uKg > 0 ? (kg / uKg) : 0;

  // 2. Valor Total da NF
  const valorTotalNF = pKg > 0 ? (kg * pKg) : (caixas * (cot || 0));

  // 3. FUNRURAL (1,63% deduzido da NF)
  const funrural = calculateFunrural(valorTotalNF);

  // 4. Líquido a Receber (Valor NF - FUNRURAL)
  const liquidoAReceber = Math.max(0, valorTotalNF - funrural.funruralTotal);

  // 5. Valor Total da VP (Comercial / Cotação do dia)
  const valorTotalVP = caixas * cot;

  // 6. Comissão AgroVenda (Calculada sobre a base comercial / Total VP)
  let totalCommission = 0;
  const val = Number(feeValue) || 0;
  if (feeType === 'Porcentagem (%)') {
    totalCommission = valorTotalVP * (val / 100);
  } else if (feeType === 'Valor Fixo por Saca/Volume') {
    totalCommission = caixas * val;
  } else if (feeType === 'Valor Fixo Total') {
    totalCommission = val;
  }

  return {
    totalKg: kg,
    unitKg: uKg,
    totalVolumes: caixas,
    precoKg: pKg,
    cotacaoCaixa: cot,
    totalOperation: valorTotalNF,
    funruralTotal: funrural.funruralTotal,
    previdenciaSocial: funrural.previdencia,
    rat: funrural.rat,
    senar: funrural.senar,
    liquidoAReceber: liquidoAReceber,
    valorTotalVP: valorTotalVP,
    totalCommission: totalCommission
  };
}

export function calculateSummary({ items = [], feeType = 'Porcentagem (%)', feeValue = 3.0 }) {
  let totalVolumes = 0;
  let totalKg = 0;
  let totalOperation = 0;

  items.forEach(item => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const unitKg = item.unit === 'Caixas (29kg)' ? 29 : (item.unit === 'Sacas (60kg)' ? 60 : (item.unit === 'Sacas (40kg)' ? 40 : (item.unit === 'Toneladas (1000kg)' ? 1000 : 1)));
    
    if (item.kg && Number(item.kg) > 0) {
      const kg = Number(item.kg);
      totalKg += kg;
      totalVolumes += kg / unitKg;
      totalOperation += item.pricePerKg ? (kg * Number(item.pricePerKg)) : (qty * price);
    } else {
      totalVolumes += qty;
      totalKg += qty * unitKg;
      totalOperation += qty * price;
    }
  });

  // Calculate commission
  let totalCommission = 0;
  const val = Number(feeValue) || 0;
  if (feeType === 'Porcentagem (%)') {
    totalCommission = totalOperation * (val / 100);
  } else if (feeType === 'Valor Fixo por Saca/Volume') {
    totalCommission = totalVolumes * val;
  } else if (feeType === 'Valor Fixo Total') {
    totalCommission = val;
  }

  const funrural = calculateFunrural(totalOperation);
  const liquidoAReceber = Math.max(0, totalOperation - funrural.funruralTotal);

  return {
    totalVolumes,
    totalKg,
    totalOperation,
    totalCommission,
    liquidoAReceber,
    ...funrural
  };
}
