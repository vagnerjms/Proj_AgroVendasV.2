/**
 * Cobre branches catch de conciliação pátio em create/update sale.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_agrovenda_ci_2026';
process.env.NODE_ENV = 'test';
global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' });

jest.mock('../services/reconcilePatio.service', () => {
  const actual = jest.requireActual('../services/reconcilePatio.service');
  return {
    ...actual,
    reconcilePatioSlip: jest.fn((...args) => actual.reconcilePatioSlip(...args))
  };
});

jest.mock('../services/cleanup.service', () => ({
  cleanupOrphanUploads: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  startCleanupScheduler: jest.fn()
}));

const { connectTestDB, disconnectTestDB, clearCollections } = require('./setup');
const saleService = require('../services/sale.service');
const { reconcilePatioSlip } = require('../services/reconcilePatio.service');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearCollections();
  jest.clearAllMocks();
  reconcilePatioSlip.mockImplementation((...args) =>
    jest.requireActual('../services/reconcilePatio.service').reconcilePatioSlip(...args)
  );
});

describe('patio reconcile catch branches', () => {
  test('createSale engole erro de reconcilePatioSlip', async () => {
    reconcilePatioSlip.mockRejectedValueOnce(new Error('patio boom create'));
    const sale = await saleService.createSale({
      client: 'Loja Catch',
      origin: 'Produtor',
      saleDate: '2025-03-01',
      totalOperation: 100,
      valorTotalVP: 100,
      totalKg: 10,
      nfFile: 'NF-1.pdf',
      nfNumber: '111',
      items: [{ product: 'Cenoura', valorTotalVP: 100 }],
      feeValue: 3
    });
    expect(sale.id).toMatch(/^VP/);
  });

  test('updateSale engole erro de reconcilePatioSlip', async () => {
    const sale = await saleService.createSale({
      client: 'Loja Catch Upd',
      origin: 'Produtor',
      saleDate: '2025-03-02',
      totalOperation: 100,
      valorTotalVP: 100,
      totalKg: 10,
      skipPatioReconcile: true,
      items: [{ product: 'Cenoura', valorTotalVP: 100 }],
      feeValue: 3
    });
    reconcilePatioSlip.mockRejectedValueOnce(new Error('patio boom update'));
    const updated = await saleService.updateSale(sale.id, {
      totalKg: 11,
      nfNumber: '222',
      truckPlate: 'ZZZ9Z99'
    });
    expect(updated.totalKg).toBe(11);
  });
});
