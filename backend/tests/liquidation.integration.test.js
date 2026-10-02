const { connectTestDB, disconnectTestDB, clearCollections } = require('./setup');
const { Sale } = require('../models');
const { getFinancialSummary } = require('../services/financial.service');
const { getStoresSummary } = require('../services/report.service');
const { settleSale, settleProducerPayment } = require('../services/sale.service');
const { WeighingSlip } = require('../models');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearCollections();
});

function baseSale(overrides = {}) {
  return {
    id: 'VP9999',
    operationType: 'Intermediação (Corretagem / Comissão)',
    saleDate: '2025-09-01',
    client: 'Loja Teste',
    origin: 'Bruno Peres',
    totalOperation: 40000,
    valorTotalVP: 50000,
    paidAmount: 0,
    paymentStatus: 'A Receber',
    producerPaidAmount: 0,
    producerPaymentStatus: 'A Pagar',
    status: 'Faturado',
    feeValue: 3,
    totalCommission: 1500,
    funruralTotal: 652,
    totalVolumes: 1000,
    totalKg: 29000,
    nfFile: 'NF-teste.pdf',
    evidenceFile: 'romaneio.pdf',
    ...overrides
  };
}

describe('settleSale vs settleProducerPayment', () => {
  test('loja liquida contra VP; pagamento parcial = NF marca Parcial', async () => {
    await Sale.create(baseSale());

    const updated = await settleSale('VP9999', {
      isPartial: true,
      paidAmount: 40000,
      paymentMethod: 'PIX'
    });

    expect(updated.paymentStatus).toBe('Parcial');
    expect(updated.paidAmount).toBe(40000);
    expect(50000 - updated.paidAmount).toBe(10000);
  });

  test('produtor liquida contra NF', async () => {
    await Sale.create(baseSale());

    const updated = await settleProducerPayment('VP9999', {
      isPartial: false,
      paymentMethod: 'PIX'
    });

    expect(updated.producerPaymentStatus).toBe('Pago');
    expect(updated.producerPaidAmount).toBe(40000);
  });

  test('SEM NF: settleProducer com totalOperation 0 não inventa a pagar', async () => {
    await Sale.create(baseSale({
      id: 'VP9734',
      totalOperation: 0,
      valorTotalVP: 48122.41,
      nfFile: null,
      status: 'Pendente NF',
      producerPaymentStatus: 'A Pagar'
    }));

    const fin = await getFinancialSummary({});
    expect(fin.totalAPagar).toBe(0);
  });
});

describe('financial SEM NF', () => {
  test('loja a receber = VP; produtor a pagar = 0', async () => {
    await Sale.create(baseSale({
      id: 'VP9734',
      totalOperation: 0,
      valorTotalVP: 48122.41,
      nfFile: null,
      status: 'Pendente NF'
    }));

    const fin = await getFinancialSummary({});
    expect(fin.totalAReceberVP).toBeCloseTo(48122.41, 1);
    expect(fin.totalAPagar).toBe(0);
  });
});

describe('report SEM NF + VP comercial', () => {
  test('valorNF=0, VP preservado, romaneioNumber é canhoto (não VP)', async () => {
    await Sale.create(baseSale({
      id: 'VP9734',
      totalOperation: 0,
      valorTotalVP: 48122.41,
      nfFile: null,
      status: 'Pendente NF',
      paymentStatus: 'A Receber',
      romaneioNumber: '',
      evidenceFile: 'romaneio.pdf'
    }));
    await WeighingSlip.create({
      id: 'PSG-001',
      saleId: 'VP9734',
      client: 'Loja Teste',
      truckPlate: 'ABC1D23',
      date: '2025-09-01',
      originWeightKg: 10000,
      destWeightKg: 10000,
      netWeightKg: 10000,
      status: 'Aprovado'
    });

    const report = await getStoresSummary({});
    const store = report.stores?.[0] || report[0];
    const items = store?.itens || store?.items || [];
    const item = items.find(i => i.vp === 'VP9734' || i.id === 'VP9734') || items[0];

    expect(item).toBeTruthy();
    expect(Number(item.valorNF) || 0).toBe(0);
    expect(Number(item.valorVP)).toBeCloseTo(48122.41, 1);
    expect(item.vp).toBe('VP9734');
    // Canhoto 097xxx — nunca igual ao id VP
    expect(item.romaneioNumber).toBe('');
    expect(item.romaneioNumber).not.toBe('VP9734');
    expect(item.weighingSlipId).toBe('PSG-001');
    expect(item.funruralEstimado).toBe(true);
    expect(Number(item.liquidoPeloVP)).toBeCloseTo(47338.02, 1);
    expect(item.liquidoPelaNF).toBeNull();
  });

  test('romaneioNumber resolve de notes (Planilha VP → 097xxx)', async () => {
    await Sale.create(baseSale({
      id: 'VP9801',
      notes: 'Venda de Cenoura | Planilha VP: 9733',
      romaneioNumber: '',
      evidenceFile: null
    }));

    const report = await getStoresSummary({});
    const store = report.stores?.[0] || report[0];
    const item = (store?.itens || []).find(i => i.vp === 'VP9801');

    expect(item).toBeTruthy();
    expect(item.romaneioNumber).toBe('09733');
    expect(item.romaneioNumber).not.toBe('VP9801');
  });

  test('pagamento = NF com VP maior aparece Parcial no report', async () => {
    await Sale.create(baseSale({
      paidAmount: 40000,
      paymentStatus: 'Parcial'
    }));

    const report = await getStoresSummary({});
    const store = report.stores?.[0] || report[0];
    const item = (store?.itens || [])[0];
    expect(item.paymentStatus).toBe('Parcial');
    expect(Number(item.valorALiquidar)).toBeCloseTo(10000, 0);
  });
});
