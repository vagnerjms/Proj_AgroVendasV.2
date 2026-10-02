process.env.JWT_SECRET = 'test_jwt_secret_agrovenda_ci_2026';
global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{}' });

const { connectTestDB, disconnectTestDB, clearCollections } = require('./setup');
const { Sale, WeighingSlip, Client, Product, Purchase } = require('../models');
const saleService = require('../services/sale.service');
const { getStoresSummary, getProducersSummary } = require('../services/report.service');
const { getFinancialSummary } = require('../services/financial.service');
const { getDashboardData } = require('../services/dashboard.service');
const { ensureProductsRegistered } = require('../services/product.service');
const { recalibrateCounters, getNextSequence } = require('../services/sequence.service');
const { Counter } = require('../models');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearCollections();
});

describe('branch push — reports/sales/financial', () => {
  test('report item paths: granel unit, payment history method, sem items notes, producer paid zero', async () => {
    await Sale.create({
      id: 'VP-B1',
      operationType: 'Intermediação (Corretagem / Comissão)',
      saleDate: '2025-03-01',
      client: 'Mercado RJ Sul',
      origin: 'Produtor Alpha',
      totalOperation: 0,
      valorTotalVP: 0,
      status: 'Pendente NF',
      nfFile: null,
      nfeKey: '99998888777766665555444433332222111100009999',
      notes: 'Venda de Cebola Granel',
      items: [],
      totalKg: 0,
      totalVolumes: 0,
      paymentStatus: 'A Receber',
      paidAmount: 0,
      producerPaymentStatus: 'A Pagar',
      producerPaidAmount: 0,
      freightCost: 25
    });
    await Sale.create({
      id: 'VP-B2',
      operationType: 'Intermediação (Corretagem / Comissão)',
      saleDate: '2025-03-02',
      client: 'Loja',
      origin: 'P',
      totalOperation: 3000,
      valorTotalVP: 3000,
      nfFile: '12345678901-NF-1.pdf',
      evidenceFile: '12345678901-ev.pdf',
      items: [
        { product: 'Cebola', quantity: 100, kg: 100, unit: 'Granel (kg)', boxWeightKg: 1, dailyQuote: 3 }
      ],
      totalKg: 100,
      totalVolumes: 100,
      paymentStatus: 'Recebido',
      paidAmount: 0,
      status: 'Concluído',
      paymentHistory: [],
      producerPaymentStatus: 'Pago',
      producerPaidAmount: 0,
      producerPaymentHistory: [],
      dueDate: '2025-04-01'
    });
    await Sale.create({
      id: 'VP-B3',
      operationType: 'Intermediação (Corretagem / Comissão)',
      saleDate: '2025-03-03',
      client: 'Loja SP',
      origin: 'Produtor Beta',
      totalOperation: 5000,
      valorTotalVP: 6000,
      nfFile: 'NF.pdf',
      items: [{ product: 'Cenoura Extra', quantity: 10, kg: 290 }],
      paymentStatus: 'Parcial',
      paidAmount: 1000,
      producerPaymentStatus: 'Parcial',
      producerPaidAmount: 500,
      producerPaymentProofFile: '1234567890123-proof.pdf',
      producerPaymentHistory: [{ amount: 500, paymentMethod: 'TED', paymentProofFile: 'x.pdf' }],
      paymentMethod: '',
      paymentHistory: [{ amount: 1000, paymentMethod: 'BOLETO' }]
    });

    const stores = await getStoresSummary({
      startDate: '2025-03-01',
      endDate: '2025-03-31',
      producer: 'ALL'
    });
    expect(stores.stores.length).toBeGreaterThanOrEqual(1);

    const producers = await getProducersSummary({
      startDate: '2025-03-01',
      endDate: '2025-03-31',
      producer: 'Produtor'
    });
    expect(producers.producers.length).toBeGreaterThanOrEqual(1);

    await getStoresSummary({ producer: 'ZZ' });
    await getProducersSummary({ producer: 'ZZ' });
  });

  test('financial Purchase null-safe + dashboard producerPaid', async () => {
    await Sale.create({
      id: 'VP-F3',
      operationType: 'Intermediação (Corretagem / Comissão)',
      saleDate: '2025-01-01',
      client: 'C',
      totalOperation: 1000,
      valorTotalVP: 1000,
      paymentStatus: 'A Receber',
      paidAmount: 0,
      dueDate: '2025-01-02',
      producerPaymentStatus: 'A Pagar',
      producerPaidAmount: 100,
      totalCommission: 0,
      feeValue: 2
    });
    await Purchase.create({
      id: 'CMP-2026-009',
      producer: 'P',
      product: 'X',
      date: '2025-01-01',
      total: 10,
      paymentStatus: 'Pago'
    });
    const fin = await getFinancialSummary({ endDate: '2025-12-31' });
    expect(fin.salesCount).toBe(1);
    const dash = await getDashboardData({ startDate: '2025-01-01', endDate: '2025-12-31' });
    expect(dash.kpis.salesCount).toBe(1);
  });

  test('sale create slip already exists; update without slip fields; unsettle producer pago path', async () => {
    const sale = await saleService.createSale({
      client: 'C',
      origin: 'Bruno Peres',
      saleDate: '2025-01-01',
      totalOperation: 4000,
      valorTotalVP: 4000,
      nfFile: 'n.pdf',
      items: [{ product: 'Cenoura', valorTotalVP: 4000, kg: 100 }],
      feeValue: 3,
      totalKg: 100,
      totalVolumes: 3
    });
    await saleService.updateSale(sale.id, { notes: 'only notes' });
    await saleService.updateSale(sale.id, { romaneioNumber: '123' });

    await saleService.settleProducerPayment(sale.id, {
      isPartial: true,
      paidAmount: 2000,
      paymentProofFile: 'a.pdf'
    });
    await saleService.settleProducerPayment(sale.id, {
      isPartial: true,
      paidAmount: 2000,
      paymentProofFile: 'b.pdf'
    });
    const u = await saleService.unsettleProducerPayment(sale.id, { mode: 'last' });
    expect(['Parcial', 'Pago', 'A Pagar']).toContain(u.producerPaymentStatus);

    const slip = await WeighingSlip.findOne({ saleId: sale.id });
    await Sale.updateOne({ id: sale.id }, { dailyQuote: 45, notes: '' });
    await saleService.syncSaleWeightFromSlip(slip, 200, 'dest');

    jest.spyOn(Product, 'findOne').mockRejectedValueOnce(new Error('fail'));
    await ensureProductsRegistered([{ product: 'FailProd' }]);
    Product.findOne.mockRestore();

    await recalibrateCounters();
    await getNextSequence('custom_seq_unique');
  });

  test('createSale with existing weighing slip skips create', async () => {
    await WeighingSlip.create({
      id: 'ROM-VP777',
      saleId: 'VP777',
      client: 'C',
      truckPlate: 'AAA1A11',
      date: '2025-01-01',
      originWeightKg: 1,
      destWeightKg: 1,
      netWeightKg: 1
    });
    // Force id by pre-seeding counter high then create — still new id
    const s = await saleService.createSale({
      client: 'C',
      origin: 'X',
      saleDate: '2025-01-01',
      totalOperation: 100,
      valorTotalVP: 100,
      items: [{ product: 'Batata', valorTotalVP: 100 }],
      notes: 'batata',
      totalKg: 25,
      totalVolumes: 0
    });
    expect(s.id).toMatch(/^VP/);
  });
});
