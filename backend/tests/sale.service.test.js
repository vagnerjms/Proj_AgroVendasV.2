process.env.JWT_SECRET = 'test_jwt_secret_agrovenda_ci_2026';
global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '{}' });

const { connectTestDB, disconnectTestDB, clearCollections } = require('./setup');
const { Sale, WeighingSlip, Client } = require('../models');
const saleService = require('../services/sale.service');

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

function baseBody(overrides = {}) {
  return {
    client: 'Loja Alpha',
    origin: 'Bruno Peres',
    saleDate: '2025-08-01',
    totalOperation: 40000,
    valorTotalVP: 50000,
    feeValue: 3,
    totalVolumes: 100,
    totalKg: 2900,
    nfFile: 'NF-001234.pdf',
    evidenceFile: '09733-foto.jpeg',
    items: [{ product: 'Cenoura', quantity: 100, kg: 2900, boxWeightKg: 29, price: 2, valorTotalVP: 50000 }],
    paymentTermDays: 30,
    ...overrides
  };
}

describe('sale.service — create/update', () => {
  test('createSale gera VP, pesagem e rejeita nfeKey duplicada', async () => {
    const sale = await saleService.createSale(baseBody({
      nfeKey: '12345678901234567890123456789012345678901234',
      notes: 'Produtor: Bruno | Planilha VP: 9733',
      romaneioNumber: ''
    }));
    expect(sale.id).toMatch(/^VP/);
    expect(sale.status).toBe('Faturado');
    expect(sale.romaneioNumber).toBe('09733');
    const slip = await WeighingSlip.findOne({ saleId: sale.id });
    expect(slip).toBeTruthy();

    await expect(saleService.createSale(baseBody({
      nfeKey: '12345678901234567890123456789012345678901234'
    }))).rejects.toMatchObject({ statusCode: 409 });

    const semNf = await saleService.createSale(baseBody({
      nfFile: null,
      nfeKey: '',
      totalOperation: 0,
      paymentTermDays: 0
    }));
    expect(semNf.status).toBe('Pendente NF');
    expect(semNf.paymentTerms).toBe('À Vista');
  });

  test('updateSale sincroniza slip e 404', async () => {
    const sale = await saleService.createSale(baseBody());
    const updated = await saleService.updateSale(sale.id, {
      client: 'Nova Loja',
      truckPlate: 'XYZ9Z99',
      driverName: 'Joao',
      saleDate: '2025-08-10',
      totalKg: 3000,
      items: [{ product: 'Batata', quantity: 100, kg: 3000, boxWeightKg: 25 }],
      notes: 'batata',
      evidenceFile: '09800-x.jpeg'
    });
    expect(updated.client).toBe('Nova Loja');
    expect(updated.romaneioNumber).toBe('09800');

    await expect(saleService.updateSale('VP999', { client: 'X' })).rejects.toMatchObject({
      statusCode: 404
    });
  });
});

describe('sale.service — settle / unsettle loja', () => {
  test('parcial, total, syncProducer e erros', async () => {
    const sale = await saleService.createSale(baseBody());

    await expect(saleService.settleSale(sale.id, { isPartial: true, paidAmount: 0 }))
      .rejects.toMatchObject({ statusCode: 400 });

    await expect(saleService.settleSale(sale.id, { isPartial: true, paidAmount: 999999 }))
      .rejects.toMatchObject({ statusCode: 400 });

    const partial = await saleService.settleSale(sale.id, {
      isPartial: true,
      paidAmount: 10000,
      paymentProofFile: 'proof.pdf',
      paymentMethod: 'PIX'
    });
    expect(partial.paymentStatus).toBe('Parcial');

    const full = await saleService.settleSale(sale.id, {
      isPartial: true,
      paidAmount: 40000,
      paymentProofFile: 'proof2.pdf'
    });
    expect(full.paymentStatus).toBe('Recebido');

    const sale2 = await saleService.createSale(baseBody({ nfeKey: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }));
    const settled = await saleService.settleSale(sale2.id, {
      isPartial: false,
      syncProducerPayment: true,
      paymentProofFile: 'p.pdf'
    });
    expect(settled.paymentStatus).toBe('Recebido');
    expect(settled.producerPaymentStatus).toBe('Pago');
    expect(settled.status).toBe('Concluído');

    await expect(saleService.settleSale('NOPE', {})).rejects.toMatchObject({ statusCode: 404 });
  });

  test('desconto manual: reduz recebido, mantém VP, exige observação', async () => {
    const sale = await saleService.createSale(baseBody({
      nfeKey: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    }));
    const vp = 50000;

    await expect(saleService.settleSale(sale.id, {
      isPartial: false,
      discountAmount: 413.79,
      notes: ''
    })).rejects.toMatchObject({ statusCode: 400 });

    await expect(saleService.settleSale(sale.id, {
      isPartial: false,
      discountAmount: vp + 1,
      notes: 'desconto inválido'
    })).rejects.toMatchObject({ statusCode: 400 });

    await expect(saleService.settleSale(sale.id, {
      isPartial: true,
      paidAmount: 1000,
      discountAmount: 2000,
      notes: 'desconto maior que parcial'
    })).rejects.toMatchObject({ statusCode: 400 });

    const partialDisc = await saleService.settleSale(sale.id, {
      isPartial: true,
      paidAmount: 10000,
      discountAmount: 500,
      notes: 'Desconto parcial de teste',
      paymentMethod: 'PIX'
    });
    expect(partialDisc.paymentStatus).toBe('Parcial');
    expect(partialDisc.paidAmount).toBeCloseTo(9500, 2);
    expect(partialDisc.paymentHistory[0].discountAmount).toBeCloseTo(500, 2);
    expect(Number(partialDisc.totalOperation)).toBe(Number(sale.totalOperation));
    expect(Number(partialDisc.valorTotalVP || sale.valorTotalVP)).toBe(vp);

    const withDisc = await saleService.settleSale(sale.id, {
      isPartial: false,
      discountAmount: 413.79,
      notes: 'Ajuste acerto manual — gap cheque vs VP−FUNRURAL(NF)',
      paymentMethod: 'Cheque'
    });

    expect(withDisc.paymentStatus).toBe('Parcial');
    expect(withDisc.paidAmount).toBeCloseTo(9500 + (vp - 9500 - 413.79), 2);
    expect(withDisc.paymentHistory).toHaveLength(2);
    expect(withDisc.paymentHistory[1].discountAmount).toBeCloseTo(413.79, 2);
    expect(withDisc.paymentHistory[1].notes).toMatch(/Ajuste acerto/);
    // VP comercial / NF não são alterados pelo desconto
    expect(Number(withDisc.totalOperation)).toBe(Number(sale.totalOperation));

    // Sem NF + desconto → permanece Pendente NF; defaults de método/cheque
    const semNf = await saleService.createSale(baseBody({
      nfFile: null,
      nfeKey: '',
      totalOperation: 0,
      paymentTermDays: 0
    }));
    const discSemNf = await saleService.settleSale(semNf.id, {
      isPartial: false,
      discountAmount: 100,
      notes: 'Desconto sem NF',
      paymentMethod: '',
      checkNumber: null,
      checkBank: null,
      checkDueDate: null
    });
    expect(discSemNf.paymentStatus).toBe('Parcial');
    expect(discSemNf.status).toBe('Pendente NF');
    expect(discSemNf.paymentHistory[0].paymentMethod).toBe('PIX');
    expect(discSemNf.paidAmount).toBeCloseTo(vp - 100, 2);
  });

  test('unsettle last e full', async () => {
    const sale = await saleService.createSale(baseBody());
    await saleService.settleSale(sale.id, { isPartial: true, paidAmount: 10000, paymentProofFile: 'a.pdf' });
    await saleService.settleSale(sale.id, { isPartial: true, paidAmount: 5000, paymentProofFile: 'b.pdf' });

    const last = await saleService.unsettleSale(sale.id, { mode: 'last' });
    expect(last.paymentStatus).toBe('Parcial');
    expect(last.paymentProofFile).toBe('a.pdf');

    const cleared = await saleService.unsettleSale(sale.id, {});
    expect(cleared.paidAmount).toBe(0);
    expect(cleared.paymentStatus).toBe('A Receber');

    await expect(saleService.unsettleSale('NOPE', {})).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('sale.service — producer settle/unsettle', () => {
  test('parcial, total, syncClient e unsettle', async () => {
    const sale = await saleService.createSale(baseBody());

    await expect(saleService.settleProducerPayment(sale.id, { isPartial: true, paidAmount: 0 }))
      .rejects.toMatchObject({ statusCode: 400 });
    await expect(saleService.settleProducerPayment(sale.id, { isPartial: true, paidAmount: 999999 }))
      .rejects.toMatchObject({ statusCode: 400 });

    const partial = await saleService.settleProducerPayment(sale.id, {
      isPartial: true,
      paidAmount: 10000,
      paymentProofFile: 'pp.pdf'
    });
    expect(partial.producerPaymentStatus).toBe('Parcial');

    const full = await saleService.settleProducerPayment(sale.id, {
      isPartial: false,
      paymentProofFile: 'pp2.pdf'
    });
    expect(full.producerPaymentStatus).toBe('Pago');

    const sale2 = await saleService.createSale(baseBody({ nfeKey: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }));
    const synced = await saleService.settleProducerPayment(sale2.id, {
      isPartial: false,
      syncClientPayment: true
    });
    expect(synced.status).toBe('Concluído');
    expect(synced.paymentStatus).toBe('Recebido');

    const last = await saleService.unsettleProducerPayment(sale.id, { mode: 'last' });
    expect(last.producerPaymentStatus).toMatch(/Parcial|A Pagar|Pago/);

    const cleared = await saleService.unsettleProducerPayment(sale.id, {});
    expect(cleared.producerPaidAmount).toBe(0);

    await expect(saleService.settleProducerPayment('NOPE', {})).rejects.toMatchObject({ statusCode: 404 });
    await expect(saleService.unsettleProducerPayment('NOPE', {})).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('sale.service — normalize / agenda / sync weight', () => {
  test('normalizeSaleNfStatus', () => {
    expect(saleService.normalizeSaleNfStatus(null)).toBeNull();
    expect(saleService.normalizeSaleNfStatus({ nfFile: 'NF.pdf', status: 'Pendente NF', paymentStatus: 'A Receber' }).status)
      .toBe('Faturado');
    expect(saleService.normalizeSaleNfStatus({ nfFile: 'NF.pdf', status: 'Pendente NF', paymentStatus: 'Recebido' }).status)
      .toBe('Concluído');
    expect(saleService.normalizeSaleNfStatus({ nfFile: null, status: 'Faturado' }).status)
      .toBe('Pendente NF');
  });

  test('getAgendaEvents', async () => {
    await Sale.create({
      id: 'VP100',
      operationType: 'Intermediação (Corretagem / Comissão)',
      saleDate: '2025-01-01',
      client: 'Loja Agenda',
      totalOperation: 1000,
      valorTotalVP: 1200,
      paymentTermDays: 10,
      notes: 'Vencimento: 15/02/2025 | ok',
      totalVolumes: 10
    });
    const events = await saleService.getAgendaEvents();
    expect(events.length).toBe(1);
    expect(events[0].dueDate).toBeTruthy();
  });

  test('syncSaleWeightFromSlip', async () => {
    const sale = await saleService.createSale(baseBody({
      dailyQuote: 45,
      notes: 'Cotação: R$ 45,00'
    }));
    const slip = await WeighingSlip.findOne({ saleId: sale.id });
    const synced = await saleService.syncSaleWeightFromSlip(slip, 3190, 'dest');
    expect(synced.totalKg).toBe(3190);
    expect(synced.notes).toMatch(/Pesagem/);

    expect(await saleService.syncSaleWeightFromSlip(null, 10, 'dest')).toBeNull();
    expect(await saleService.syncSaleWeightFromSlip({ id: 'X' }, 0, 'dest')).toBeNull();
    expect(await saleService.syncSaleWeightFromSlip({ id: 'PSG-9', saleId: '' }, 100, 'dest')).toBeNull();
  });
});
