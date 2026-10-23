/**
 * Rastreabilidade: multi-CP no ledger, collector, parser, cancel soft.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_agrovenda_ci_2026';
global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' });

const { connectTestDB, disconnectTestDB, clearCollections } = require('./setup');
const { Sale } = require('../models');
const saleService = require('../services/sale.service');
const {
  collectSaleAttachmentTargets,
  buildDriveSuggestedPath,
  buildDriveAttachmentName
} = require('../utils/dataHelpers');
const { parseMoneyBr, parseDateBr, detectMethod } = require('../services/paymentProofParser.service');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearCollections();
});

describe('collectSaleAttachmentTargets', () => {
  test('inclui todos CPs do paymentHistory + escalar', () => {
    const sale = {
      nfFile: 'nf.pdf',
      evidenceFile: 'ped.jpeg',
      paymentProofFile: 'last.pdf',
      paymentHistory: [
        { paymentProofFile: 'a.pdf', paymentProofFiles: ['a.pdf', 'a2.pdf'] },
        { paymentProofFile: 'b.pdf', paymentProofFiles: [] }
      ]
    };
    const c = collectSaleAttachmentTargets(sale);
    expect(c.nf).toBe('nf.pdf');
    expect(c.evidence).toBe('ped.jpeg');
    expect(c.clientProofs).toEqual(expect.arrayContaining(['a.pdf', 'a2.pdf', 'b.pdf', 'last.pdf']));
    expect(new Set(c.clientProofs).size).toBe(c.clientProofs.length);
  });
});

describe('buildDriveSuggestedPath', () => {
  test('path SaaS AgroVenda/tenant/loja/VP', () => {
    const p = buildDriveSuggestedPath({
      tenantSlug: 'acme',
      client: 'Loja Alpha',
      saleId: 'VP0100'
    });
    expect(p.suggestedPath).toBe('AgroVenda/acme/Loja_Alpha/VP0100');
    expect(p.saleFolder).toBe('VP0100');
  });

  test('fallbacks tenant/loja/VP vazios', () => {
    const prev = process.env.TENANT_SLUG;
    delete process.env.TENANT_SLUG;
    const p = buildDriveSuggestedPath({ tenantSlug: '!!!', client: '', saleId: '' });
    expect(p.tenantSlug).toBe('default');
    const pEmptyTenant = buildDriveSuggestedPath({ tenantSlug: '____', storeName: 'Loja', saleId: 'VP1' });
    expect(pEmptyTenant.tenantSlug).toBe('default');
    expect(p.storeFolder).toBe('Sem_Loja');
    expect(p.saleFolder).toBe('SEMVP');
    expect(p.suggestedPath).toContain('AgroVenda/');
    process.env.TENANT_SLUG = 'from_env';
    const p2 = buildDriveSuggestedPath({ storeName: 'Mercado Beta', saleId: 'VP9' });
    expect(p2.tenantSlug).toBe('from_env');
    expect(p2.storeFolder).toBe('Mercado_Beta');
    expect(p2.suggestedFolder).toContain('VP9');
    const p3 = buildDriveSuggestedPath({
      tenantSlug: 'tenantok',
      storeName: '@@@',
      client: '@@@',
      saleId: '   '
    });
    expect(p3.storeFolder).toBe('Sem_Loja');
    expect(p3.saleFolder).toBe('SEMVP');
    if (prev !== undefined) process.env.TENANT_SLUG = prev;
    else delete process.env.TENANT_SLUG;
  });
});

describe('collectSaleAttachmentTargets producer', () => {
  test('coleta proofs do produtor', () => {
    const c = collectSaleAttachmentTargets({
      producerPaymentProofFile: 'pp.pdf',
      producerPaymentHistory: [
        { paymentProofFile: 'p1.pdf', paymentProofFiles: ['p1b.pdf'] }
      ]
    });
    expect(c.producerProofs).toEqual(expect.arrayContaining(['pp.pdf', 'p1.pdf', 'p1b.pdf']));
  });
});

describe('paymentProofParser heuristics', () => {
  test('extrai valor data e PIX do texto', () => {
    const text = 'Comprovante PIX\nValor: R$ 1.234,56\nData: 15/08/2026\nE2E: ABC123XYZ999';
    expect(parseMoneyBr(text)).toBe(1234.56);
    expect(parseDateBr(text)).toBe('2026-08-15');
    expect(detectMethod(text)).toBe('PIX');
  });
});

describe('settleSale multi-proof ledger', () => {
  test('duas parciais agregam paidAmount e preservam ambos proofs', async () => {
    const sale = await saleService.createSale({
      client: 'Loja T',
      origin: 'Bruno Peres',
      saleDate: '2025-01-01',
      totalOperation: 10000,
      valorTotalVP: 10000,
      nfFile: 'NF.pdf',
      items: [{ product: 'Cenoura', valorTotalVP: 10000, kg: 290, quantity: 10 }],
      feeValue: 3,
      totalKg: 290,
      totalVolumes: 10
    });

    await saleService.settleSale(sale.id, {
      isPartial: true,
      paidAmount: 4000,
      paymentProofFile: 'a.pdf'
    });
    const mid = await Sale.findOne({ id: sale.id });
    expect(mid.paidAmount).toBe(4000);
    expect(mid.paymentHistory).toHaveLength(1);
    expect(mid.paymentHistory[0].paymentProofFiles).toContain('a.pdf');
    expect(mid.paymentProofFile).toBe('a.pdf');

    await saleService.settleSale(sale.id, {
      isPartial: true,
      paidAmount: 6000,
      paymentProofFiles: ['b.pdf', 'b2.pdf', 'b.pdf', ''],
      paymentProofFile: 'b2.pdf'
    });
    const done = await Sale.findOne({ id: sale.id });
    expect(done.paidAmount).toBe(10000);
    expect(done.paymentStatus).toBe('Recebido');
    expect(done.paymentHistory).toHaveLength(2);
    expect(done.paymentHistory[0].paymentProofFile).toBe('a.pdf');
    expect(done.paymentHistory[1].paymentProofFiles).toEqual(expect.arrayContaining(['b.pdf', 'b2.pdf']));
    expect(done.paymentProofFile).toBe('b2.pdf');

    const collected = collectSaleAttachmentTargets(done.toObject());
    expect(collected.clientProofs).toEqual(expect.arrayContaining(['a.pdf', 'b.pdf', 'b2.pdf']));

    const afterUnsettle = await saleService.unsettleSale(sale.id, { mode: 'last' });
    expect(afterUnsettle.paymentStatus).toBe('Parcial');
    expect(afterUnsettle.paidAmount).toBe(4000);
    expect(afterUnsettle.paymentProofFile).toBe('a.pdf');
    expect(afterUnsettle.paymentHistory).toHaveLength(1);
  });

  test('appendPaymentProofs não altera paidAmount e acumula files', async () => {
    const sale = await saleService.createSale({
      client: 'Loja P',
      origin: 'Bruno Peres',
      saleDate: '2025-01-01',
      totalOperation: 5000,
      valorTotalVP: 5000,
      items: [{ product: 'Cenoura', valorTotalVP: 5000 }],
      feeValue: 3
    });
    await saleService.settleSale(sale.id, {
      isPartial: true,
      paidAmount: 2000,
      paymentProofFile: 'first.pdf'
    });
    const before = await Sale.findOne({ id: sale.id });
    expect(before.paidAmount).toBe(2000);
    await saleService.appendPaymentProofs(sale.id, {
      paymentProofFiles: ['extra1.pdf', 'extra2.pdf']
    });
    const after = await Sale.findOne({ id: sale.id });
    expect(after.paidAmount).toBe(2000);
    const last = after.paymentHistory[after.paymentHistory.length - 1];
    expect(last.paymentProofFiles).toEqual(expect.arrayContaining(['first.pdf', 'extra1.pdf', 'extra2.pdf']));
  });

  test('appendPaymentProofs cria evento documental se history vazio; producer; erro sem file', async () => {
    const sale = await saleService.createSale({
      client: 'Loja D',
      origin: 'Bruno Peres',
      saleDate: '2025-01-01',
      totalOperation: 3000,
      valorTotalVP: 3000,
      nfFile: 'n.pdf',
      items: [{ product: 'Cenoura', valorTotalVP: 3000 }],
      feeValue: 3
    });
    await saleService.appendPaymentProofs(sale.id, { paymentProofFile: 'solo.pdf' });
    const doc = await Sale.findOne({ id: sale.id });
    expect(doc.paymentHistory).toHaveLength(1);
    expect(doc.paymentHistory[0].amount).toBe(0);
    expect(doc.paidAmount).toBe(0);

    await saleService.appendPaymentProofs(sale.id, {
      target: 'producer',
      paymentProofFiles: ['prod.pdf']
    });
    const withProd = await Sale.findOne({ id: sale.id });
    expect(withProd.producerPaymentHistory.length).toBeGreaterThanOrEqual(1);
    expect(withProd.producerPaymentProofFile).toBe('prod.pdf');

    await saleService.appendPaymentProofs(sale.id, {
      target: 'producer',
      paymentProofFile: 'prod2.pdf'
    });
    const withProd2 = await Sale.findOne({ id: sale.id });
    const lastP = withProd2.producerPaymentHistory[withProd2.producerPaymentHistory.length - 1];
    expect(lastP.paymentProofFiles).toEqual(expect.arrayContaining(['prod.pdf', 'prod2.pdf']));

    await expect(saleService.appendPaymentProofs(sale.id, {})).rejects.toThrow(/comprovante/i);
    await expect(saleService.appendPaymentProofs('VP-INEXISTENTE', { paymentProofFile: 'x.pdf' }))
      .rejects.toThrow(/não encontrada/i);
  });

  test('cancelSale soft — documento permanece', async () => {
    const sale = await saleService.createSale({
      client: 'Loja C',
      origin: 'Bruno Peres',
      saleDate: '2025-01-01',
      totalOperation: 1000,
      valorTotalVP: 1000,
      items: [{ product: 'Cenoura', valorTotalVP: 1000 }],
      feeValue: 3
    });
    const id = sale.id;
    await saleService.cancelSale(id);
    const still = await Sale.findOne({ id });
    expect(still).toBeTruthy();
    expect(still.status).toBe('Cancelada');
    const again = await saleService.deleteSale(id);
    expect(again.status).toBe('Cancelada');
  });
});

describe('CP naming seq', () => {
  test('CP01 e CP02 distintos', () => {
    expect(buildDriveAttachmentName('cp', { romaneioNumber: '9733', nfNumber: '123456', ext: '.pdf', seq: 1 }))
      .toBe('09733-CP01-123456.pdf');
    expect(buildDriveAttachmentName('cp', { romaneioNumber: '9733', nfNumber: '123456', ext: '.pdf', seq: 2 }))
      .toBe('09733-CP02-123456.pdf');
  });
});
