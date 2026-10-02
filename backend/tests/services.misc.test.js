process.env.JWT_SECRET = 'test_jwt_secret_agrovenda_ci_2026';
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  text: async () => JSON.stringify({ ok: true })
});

const { connectTestDB, disconnectTestDB, clearCollections } = require('./setup');
const { Sale, Purchase, Product, Client, Counter } = require('../models');
const { getFinancialSummary } = require('../services/financial.service');
const { getDashboardData } = require('../services/dashboard.service');
const { getNextSequence, recalibrateCounters } = require('../services/sequence.service');
const { ensureProductsRegistered, syncAllSalesProducts } = require('../services/product.service');
const { normalizeProducerOrigin } = require('../services/producer.service');
const { sendSaleWebhook, parseDueDate } = require('../services/webhook.service');
const {
  getStoresSummary,
  getProducersSummary,
  triggerN8nReport
} = require('../services/report.service');
const fs = require('fs');
const path = require('path');
const { uploadDir } = require('../middlewares/upload');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearCollections();
  jest.clearAllMocks();
});

async function seedSale(overrides = {}) {
  return Sale.create({
    id: 'VP200',
    operationType: 'Intermediação (Corretagem / Comissão)',
    saleDate: '2025-06-01',
    client: 'Loja Beta',
    origin: 'CARLOS CESAR CANTELE',
    totalOperation: 20000,
    valorTotalVP: 25000,
    paidAmount: 0,
    paymentStatus: 'A Receber',
    producerPaidAmount: 0,
    producerPaymentStatus: 'A Pagar',
    status: 'Faturado',
    feeValue: 3,
    totalCommission: 750,
    totalVolumes: 200,
    totalKg: 5800,
    nfFile: 'NF-200.pdf',
    evidenceFile: 'ev.pdf',
    dueDate: '2020-01-01',
    items: [
      { product: 'Cenoura', quantity: 100, kg: 2900, boxWeightKg: 29, dailyQuote: 40 },
      { product: 'Batata', quantity: 100, kg: 2500, boxWeightKg: 25, dailyQuote: 50 }
    ],
    freightCost: 100,
    notes: 'Venda de Cenoura + Batata | Planilha VP: 8800',
    ...overrides
  });
}

describe('financial.service', () => {
  test('filtros, recebido, parcial, vencido, purchases e commission fallback', async () => {
    await seedSale();
    await seedSale({
      id: 'VP201',
      paymentStatus: 'Recebido',
      paidAmount: 25000,
      dueDate: '2030-01-01',
      totalCommission: 0
    });
    await seedSale({
      id: 'VP202',
      paidAmount: 5000,
      paymentStatus: 'Parcial',
      dueDate: '',
      paymentTermDays: 1,
      saleDate: '2020-01-01',
      valorTotalVP: 0,
      totalVolumes: 10,
      dailyQuote: 40,
      totalOperation: 0,
      nfFile: null
    });
    await Purchase.create({
      id: 'CMP-2026-001',
      producer: 'X',
      product: 'Caixa',
      date: '2025-01-01',
      quantity: 1,
      total: 500,
      paymentStatus: 'A Pagar'
    });
    await seedSale({
      id: 'VP203',
      producerPaymentStatus: 'Pago',
      producerPaidAmount: 20000
    });

    const all = await getFinancialSummary({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      client: 'Beta'
    });
    expect(all.salesCount).toBeGreaterThan(0);
    expect(all.totalAPagar).toBeGreaterThanOrEqual(0);

    const byStatus = await getFinancialSummary({ status: 'Recebido' });
    expect(byStatus.totalRecebido).toBeGreaterThan(0);
  });
});

describe('dashboard.service', () => {
  test('KPIs com período e sem período', async () => {
    await seedSale();
    await Purchase.create({
      id: 'CMP-2026-002',
      producer: 'Y',
      product: 'Saco',
      date: '2025-01-01',
      total: 100,
      paymentStatus: 'A Pagar'
    });
    const data = await getDashboardData({ startDate: '2025-01-01', endDate: '2025-12-31' });
    expect(data.kpis.salesCount).toBe(1);
    expect(data.performanceDays).toHaveLength(7);
    expect(data.alerts).toBeTruthy();

    const open = await getDashboardData({});
    expect(open.kpis).toBeTruthy();
  });
});

describe('sequence.service', () => {
  test('getNextSequence e recalibrateCounters', async () => {
    await Sale.create({
      id: 'VP050',
      operationType: 'Intermediação (Corretagem / Comissão)',
      saleDate: '2025-01-01',
      client: 'C',
      totalOperation: 1
    });
    const seq = await getNextSequence('sale_vp_id', Sale, 'VP');
    expect(seq).toBeGreaterThanOrEqual(51);
    const seq2 = await getNextSequence('sale_vp_id');
    expect(seq2).toBe(seq + 1);
    await recalibrateCounters();
    const counter = await Counter.findById('sale_vp_id');
    expect(counter.seq).toBeGreaterThanOrEqual(50);
  });
});

describe('product.service', () => {
  test('ensureProductsRegistered categorias e sync', async () => {
    const items = [
      { product: 'Soja Grão', price: 2 },
      { product: 'Batata Inglesa', kg: 100, total: 200 },
      { product: 'Cebola Roxa' },
      { product: 'Beterraba' },
      { product: 'Cenoura Extra', unit: 'Caixas (29kg)', boxWeightKg: 29 },
      { product: 'Soja Grão' }
    ];
    const regs = await ensureProductsRegistered(items);
    expect(regs.length).toBeGreaterThanOrEqual(5);
    expect(await Product.countDocuments()).toBeGreaterThanOrEqual(5);

    await Sale.create({
      id: 'VP300',
      operationType: 'Intermediação (Corretagem / Comissão)',
      saleDate: '2025-01-01',
      client: 'C',
      totalOperation: 1,
      items: [{ product: 'Milho Amarelo' }]
    });
    await syncAllSalesProducts();
    expect(await Product.findOne({ name: /Milho/i })).toBeTruthy();
    expect(await ensureProductsRegistered([])).toEqual([]);
    expect(await ensureProductsRegistered(null)).toEqual([]);
  });
});

describe('producer.service branches', () => {
  test('client só cidade e invalid', async () => {
    await Client.create({ id: 'CLI-1', name: 'Produtor Cidade', city: 'Goiania', type: 'Produtor' });
    expect(await normalizeProducerOrigin('Produtor Cidade')).toContain('GOIANIA');
    await Client.create({ id: 'CLI-2', name: 'Sem Cidade', type: 'Produtor' });
    expect(await normalizeProducerOrigin('Sem Cidade')).toBe('SEM CIDADE');
    expect(await normalizeProducerOrigin(null)).toBe('Produtor Rural');
  });
});

describe('webhook.service', () => {
  test('parseDueDate variantes', () => {
    expect(parseDueDate({ dueDate: '2025-05-01' })).toBe('2025-05-01');
    expect(parseDueDate({ notes: 'Vencimento: 10/03/2025', saleDate: '2025-01-01' })).toBe('2025-03-10');
    expect(parseDueDate({ saleDate: '2025-01-01', paymentTermDays: 15 })).toMatch(/^2025/);
    expect(parseDueDate({})).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('sendSaleWebhook com arquivo em disco', async () => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const fname = 'NF-webhook-test.pdf';
    const fpath = path.join(uploadDir, fname);
    fs.writeFileSync(fpath, 'pdf-content-test');

    await sendSaleWebhook('sale.created', {
      id: 'VP900',
      client: 'Loja Webhook',
      saleDate: '2025-07-01',
      totalOperation: 1000,
      valorTotalVP: 0,
      dailyQuote: 40,
      totalVolumes: 10,
      nfFile: fname,
      evidenceFile: fname,
      paymentTermDays: 30,
      notes: 'Vencimento: 01/08/2025'
    });

    await new Promise(r => setTimeout(r, 50));
    fs.unlinkSync(fpath);
  });
});

describe('report.service', () => {
  test('stores e producers summary com filtros', async () => {
    await seedSale({ freightPricePerUnit: 1, commissionDiscount: 50 });
    await seedSale({
      id: 'VP201',
      client: 'Loja RJ Market',
      origin: 'AB',
      paymentStatus: 'Recebido',
      paidAmount: 25000,
      status: 'Concluído',
      nfFile: null,
      notes: 'Venda de Tomate | Produtor: AB'
    });

    const stores = await getStoresSummary({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      producer: 'CARLOS CESAR CANTELE (NOVA PONTE/MG)'
    });
    expect(stores.stores.length).toBeGreaterThanOrEqual(1);
    expect(stores.totalGeral).toBeTruthy();

    await getStoresSummary({ startDate: '2025-06-01' });
    await getStoresSummary({ endDate: '2025-06-30' });
    await getStoresSummary({ producer: 'AB' });

    const producers = await getProducersSummary({
      startDate: '2025-01-01',
      endDate: '2025-12-31'
    });
    expect(producers.producers.length).toBeGreaterThanOrEqual(1);

    await getProducersSummary({ startDate: '2025-06-01', producer: 'CARLOS' });
    await getProducersSummary({ endDate: '2025-12-31', producer: 'XY' });
  });

  test('triggerN8nReport valida URL e envia', async () => {
    await expect(triggerN8nReport(null, {})).rejects.toMatchObject({ statusCode: 400 });
    await expect(triggerN8nReport(null, { webhookUrl: 'ftp://x' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(triggerN8nReport(null, { webhookUrl: 'http://169.254.169.254/x' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(triggerN8nReport(null, { webhookUrl: 'not-a-url' })).rejects.toMatchObject({ statusCode: 400 });

    const result = await triggerN8nReport(
      { name: 'Admin' },
      {
        webhookUrl: 'http://example.com/webhook',
        startDate: '2025-01-01',
        endDate: '2025-02-01',
        selectedLoja: 'Loja Beta',
        activeTab: 'produtor',
        excelHtml: '<html>ok</html>',
        filteredStores: [],
        currentTotal: {}
      }
    );
    expect(result.success).toBe(true);

    await triggerN8nReport({ name: 'A' }, {
      webhookUrl: 'https://hooks.example.com/x',
      activeTab: 'corretor'
    });
  });
});
