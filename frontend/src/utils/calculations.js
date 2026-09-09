// Funrural breakdown: 1.63% total (Previdência Social 1,20%, RAT 0,10%, SENAR 0,33%)
export function calculateFunrural(totalOperation) {
  const total = Number(totalOperation) || 0;
  const previdencia = Math.round((total * 0.0120 + Number.EPSILON) * 100) / 100;
  const rat = Math.round((total * 0.0010 + Number.EPSILON) * 100) / 100;
  const senar = Math.round((total * 0.0033 + Number.EPSILON) * 100) / 100;
  const funruralTotal = Math.round((previdencia + rat + senar + Number.EPSILON) * 100) / 100;

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
 * 5. valorTotalVP = caixas * cotacaoCaixa (ou kg * cotacao se a granel / cotacao por kg)
 * 6. liquidoAReceber (Valor a Liquidar) = Total Comercial (VP) - FUNRURAL (calculado sobre a NF)
 * 7. comissao = valorTotalVP * (feeValue / 100)
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

  // 4. Valor Total da VP (Comercial / Cotação do dia)
  // Se a cotação for <= 10.0 (ex: R$ 2,15/kg) ou se unitKg === 1 (Granel), multiplica pelo peso total em kg
  const valorTotalVP = (cot > 0 && cot <= 10.0) || uKg === 1
    ? (kg * cot)
    : (caixas * cot);

  // 5. Valor a Liquidar / Líquido a Receber: Total Comercial (VP) - Funrural (sobre NF)
  const baseComercial = valorTotalVP > 0 ? valorTotalVP : valorTotalNF;
  const liquidoAReceber = Math.max(0, baseComercial - funrural.funruralTotal);

  // 6. Comissão AgroVenda (Calculada sobre a base comercial / Total VP)
  let totalCommission = 0;
  const val = Number(feeValue) || 0;
  if (feeType === 'Porcentagem (%)') {
    totalCommission = baseComercial * (val / 100);
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
    valorLiquidar: liquidoAReceber,
    valorTotalVP: valorTotalVP,
    totalCommission: totalCommission
  };
}

export function calculateSummary({ items = [], feeType = 'Porcentagem (%)', feeValue = 3.0 }) {
  let totalVolumes = 0;
  let totalKg = 0;
  let totalOperation = 0;
  let totalValorVP = 0;

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

    if (item.valorTotalVP) {
      totalValorVP += Number(item.valorTotalVP);
    }
  });

  const baseComercial = totalValorVP > 0 ? totalValorVP : totalOperation;

  // Calculate commission
  let totalCommission = 0;
  const val = Number(feeValue) || 0;
  if (feeType === 'Porcentagem (%)') {
    totalCommission = baseComercial * (val / 100);
  } else if (feeType === 'Valor Fixo por Saca/Volume') {
    totalCommission = totalVolumes * val;
  } else if (feeType === 'Valor Fixo Total') {
    totalCommission = val;
  }

  const funrural = calculateFunrural(totalOperation);
  const liquidoAReceber = Math.max(0, baseComercial - funrural.funruralTotal);

  return {
    totalVolumes,
    totalKg,
    totalOperation,
    valorTotalVP: totalValorVP,
    totalCommission,
    liquidoAReceber,
    valorLiquidar: liquidoAReceber,
    ...funrural
  };
}
