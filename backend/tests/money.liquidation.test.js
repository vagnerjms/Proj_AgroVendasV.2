const {
  roundMoney,
  calculateCommission,
  getSaleCommercialValue,
  calculateFiscalDeductions,
  calculateCommercialNet
} = require('../utils/money');

describe('money — liquidação VP vs NF', () => {
  test('VP > NF com pagamento = NF → spread e liquidoProdutor corretos', () => {
    const vp = 50000;
    const nf = 40000;
    const result = calculateCommission(vp, nf, 3);

    expect(result.liquidoProdutor).toBe(roundMoney(nf - calculateFiscalDeductions(nf).funruralTotal));
    expect(result.spreadComercial).toBe(10000);
    expect(result.comissao).toBe(1500);
  });

  test('SEM NF: liquidoProdutor = 0 (não fallback VP)', () => {
    const result = calculateCommission(48122.41, 0, 3);
    expect(result.liquidoProdutor).toBe(0);
    expect(result.spreadComercial).toBe(0);
    expect(result.comissao).toBe(roundMoney(48122.41 * 0.03));
  });

  test('planilha VP9734 SEM NF: FUNRURAL estimado no VP e líquido comercial', () => {
    const vp = 48122.41;
    const net = calculateCommercialNet(vp, 0, 0, 0);
    expect(net.funruralEstimado).toBe(true);
    expect(net.funrural).toBeCloseTo(784.4, 1);
    expect(net.liquidoPeloVP).toBeCloseTo(47338.02, 1);
    expect(net.liquidoPelaNF).toBeNull();
  });

  test('com NF: FUNRURAL sobre NF; líquido VP e NF distintos', () => {
    const vp = 33129.31;
    const nf = 27989;
    const net = calculateCommercialNet(vp, nf, 0, 0);
    expect(net.funruralEstimado).toBe(false);
    expect(net.funrural).toBe(calculateFiscalDeductions(nf).funruralTotal);
    expect(net.liquidoPeloVP).toBe(roundMoney(vp - net.funrural));
    expect(net.liquidoPelaNF).toBe(roundMoney(nf - net.funrural));
  });

  test('getSaleCommercialValue prioriza valorTotalVP', () => {
    const sale = {
      valorTotalVP: 25070.5,
      totalOperation: 20000,
      dailyQuote: 45,
      totalVolumes: 100
    };
    expect(getSaleCommercialValue(sale)).toBe(25070.5);
  });

  test('parcial loja: pago NF com VP maior deixa saldo VP − pago', () => {
    const vp = 50000;
    const paid = 40000;
    const saldo = roundMoney(Math.max(0, vp - paid));
    expect(saldo).toBe(10000);
    expect(paid < vp - 0.05).toBe(true);
  });
});
