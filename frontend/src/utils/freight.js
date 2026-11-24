/** Frete da venda: R$/unidade × volumes, senão freightCost absoluto. */
export function freightOf(sale = {}) {
  const perUnit = Number(sale.freightPricePerUnit) || 0;
  const vols = Number(sale.totalVolumes) || 0;
  if (perUnit > 0 && vols > 0) {
    return Math.round((perUnit * vols + Number.EPSILON) * 100) / 100;
  }
  const cost = Number(sale.freightCost) || 0;
  return Math.round((cost + Number.EPSILON) * 100) / 100;
}

export function formatFreightMoney(n) {
  const v = Number(n) || 0;
  if (v <= 0) return '';
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
