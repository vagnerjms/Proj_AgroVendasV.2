const { connectTestDB, disconnectTestDB, clearCollections } = require('./setup');
const { Sale } = require('../models');
const { cancelSale, deleteSale } = require('../services/sale.service');

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
    id: 'VP8800',
    operationType: 'Intermediação (Corretagem / Comissão)',
    saleDate: '2025-09-01',
    client: 'Loja Cancel',
    origin: 'Produtor Teste',
    totalOperation: 10000,
    valorTotalVP: 12000,
    paidAmount: 0,
    paymentStatus: 'A Receber',
    producerPaidAmount: 0,
    producerPaymentStatus: 'A Pagar',
    status: 'Faturado',
    feeValue: 3,
    totalCommission: 360,
    funruralTotal: 163,
    totalVolumes: 100,
    totalKg: 2900,
    romaneioNumber: '09733',
    ...overrides
  };
}

describe('cancelSale (soft cancel)', () => {
  test('POST-like cancel marca status Cancelada e mantém o documento', async () => {
    await Sale.create(baseSale());

    const cancelled = await cancelSale('VP8800');

    expect(cancelled.status).toBe('Cancelada');
    expect(cancelled.id).toBe('VP8800');
    expect(cancelled.romaneioNumber).toBe('09733');

    const stillThere = await Sale.findOne({ id: 'VP8800' }).lean();
    expect(stillThere).toBeTruthy();
    expect(stillThere.status).toBe('Cancelada');
  });

  test('cancel idempotente se já Cancelada', async () => {
    await Sale.create(baseSale({ status: 'Cancelada' }));
    const again = await cancelSale('VP8800');
    expect(again.status).toBe('Cancelada');
    expect(await Sale.countDocuments({ id: 'VP8800' })).toBe(1);
  });

  test('DELETE legado (deleteSale) também soft-cancela', async () => {
    await Sale.create(baseSale({ id: 'VP8801' }));
    const result = await deleteSale('VP8801');
    expect(result.status).toBe('Cancelada');
    expect(await Sale.findOne({ id: 'VP8801' })).toBeTruthy();
  });

  test('venda inexistente → 404', async () => {
    await expect(cancelSale('VP9999')).rejects.toMatchObject({
      message: 'Venda não encontrada',
      statusCode: 404
    });
  });
});
