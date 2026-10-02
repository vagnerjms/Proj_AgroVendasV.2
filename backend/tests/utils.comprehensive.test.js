const {
  roundMoney,
  calculateFiscalDeductions,
  calculateCommission,
  calculateLiquidationValue,
  getSaleCommercialValue,
  calculateCommercialNet,
  TAX_RATES
} = require('../utils/money');
const { escapeRegex, sanitizeInput } = require('../utils/security');
const { CANONICAL_PRODUCERS, normalizeProducerOrigin } = require('../utils/producer');
const { formatNfNumber } = require('../utils/dataHelpers');
const { connectTestDB, disconnectTestDB, clearCollections } = require('./setup');
const { Client } = require('../models');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearCollections();
});

describe('money — branches restantes', () => {
  test('roundMoney trata NaN/Infinity', () => {
    expect(roundMoney('x')).toBe(0);
    expect(roundMoney(Infinity)).toBe(0);
    expect(roundMoney(10.555)).toBe(10.56);
  });

  test('calculateFiscalDeductions zero e TAX_RATES', () => {
    expect(calculateFiscalDeductions(0).funruralTotal).toBe(0);
    expect(TAX_RATES.FUNRURAL_TOTAL).toBeCloseTo(0.0163);
  });

  test('calculateCommission compat 2 args (fee como 2º)', () => {
    const r = calculateCommission(10000, 5);
    expect(r.taxaPercentual).toBe(5);
    expect(r.comissao).toBe(500);
    expect(r.liquidoProdutor).toBe(0);
  });

  test('calculateLiquidationValue', () => {
    const r = calculateLiquidationValue(10000, 8000);
    expect(r.valorComercialVP).toBe(10000);
    expect(r.funruralTotal).toBe(calculateFiscalDeductions(8000).funruralTotal);
    expect(r.valorLiquidar).toBe(roundMoney(10000 - r.funruralTotal));
  });

  test('getSaleCommercialValue — items, valorVP, cotação e notes', () => {
    expect(getSaleCommercialValue(null)).toBe(0);

    expect(getSaleCommercialValue({
      items: [{ product: 'Cenoura', kg: 290, quantity: 10, dailyQuote: 45, boxWeightKg: 29 }]
    })).toBe(450);

    expect(getSaleCommercialValue({
      items: [{ product: 'Batata', kg: 100, dailyQuote: 2, unit: 'Granel (kg)', boxWeightKg: 1 }]
    })).toBe(200);

    expect(getSaleCommercialValue({
      items: [{ product: 'Cenoura', valorTotalVP: 1234 }]
    })).toBe(1234);

    expect(getSaleCommercialValue({
      items: [{ product: 'X', total: 999 }]
    })).toBe(999);

    expect(getSaleCommercialValue({
      items: [{ product: 'Y' }],
      valorVP: 777
    })).toBe(777);

    expect(getSaleCommercialValue({
      notes: 'Cotação: R$ 3,50 | batata',
      totalKg: 100,
      totalVolumes: 0
    })).toBe(350);

    expect(getSaleCommercialValue({
      dailyQuote: 45,
      totalVolumes: 10,
      totalKg: 290
    })).toBe(450);

    expect(getSaleCommercialValue({
      totalOperation: 1500
    })).toBe(1500);
  });

  test('calculateCommercialNet com frete/comissão', () => {
    const net = calculateCommercialNet(10000, 8000, 100, 50);
    expect(net.frete).toBe(100);
    expect(net.comissaoDesconto).toBe(50);
    expect(net.liquidoPelaNF).toBeGreaterThan(0);
  });
});

describe('security', () => {
  test('escapeRegex e sanitizeInput', () => {
    expect(escapeRegex(null)).toBe('');
    expect(escapeRegex('a+b*c?')).toContain('\\+');
    expect(sanitizeInput(null)).toBe('');
    expect(sanitizeInput('  hello\0world  ', 5)).toBe('hello');
  });
});

describe('producer util + normalize', () => {
  test('exporta canônicos e normaliza', async () => {
    expect(CANONICAL_PRODUCERS.length).toBeGreaterThan(0);
    expect(await normalizeProducerOrigin('CARLOS CESAR CANTELE')).toContain('CANTELE');
    expect(await normalizeProducerOrigin('Bruno Peres')).toContain('BRUNO PERES');
    expect(await normalizeProducerOrigin('', 'Produtor: Joao Silva | ok')).toBe('JOAO SILVA');
    expect(await normalizeProducerOrigin('')).toBe('Produtor Rural');
    expect(await normalizeProducerOrigin('Fulano (Uberaba/MG)')).toBe('FULANO (UBERABA/MG)');
    expect(await normalizeProducerOrigin('simples')).toBe('SIMPLES');

    await Client.create({
      id: 'CLI-99',
      name: 'Produtor Cruzado',
      type: 'Produtor',
      city: 'Catalao',
      uf: 'GO'
    });
    expect(await normalizeProducerOrigin('Produtor Cruzado')).toContain('CATALAO');
  });
});

describe('dataHelpers edge', () => {
  test('fallback digits curtos no basename', () => {
    expect(formatNfNumber('nota_1234.pdf')).toBe('1234');
  });
});
