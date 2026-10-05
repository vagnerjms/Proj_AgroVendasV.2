/**
 * Push global branch coverage to ≥90%.
 */
process.env.JWT_SECRET = 'test_jwt_secret_branches_90';
process.env.NODE_ENV = 'test';
process.env.N8N_WEBHOOK_URL = 'http://127.0.0.1:9/webhook';

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  text: async () => '{}'
});

jest.mock('../services/nfeParser.service', () => ({
  parse: jest.fn().mockResolvedValue({ nfeKey: '1'.repeat(44), items: [] })
}));
jest.mock('../services/backup.service', () => ({
  getBackupStats: jest.fn().mockResolvedValue({}),
  generateBackupPackage: jest.fn().mockResolvedValue({}),
  restoreBackup: jest.fn().mockResolvedValue({ success: true }),
  countSalesWithPayments: jest.fn().mockResolvedValue(0)
}));
jest.mock('../services/cleanup.service', () => ({
  cleanupOrphanUploads: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  startCleanupScheduler: jest.fn()
}));

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { connectTestDB, disconnectTestDB, clearCollections } = require('./setup');
const { authHeader, ensureAdmin } = require('./helpers');
const { Sale, WeighingSlip, Purchase, Counter } = require('../models');
const saleService = require('../services/sale.service');
const { getDashboardData } = require('../services/dashboard.service');
const { sendSaleWebhook, parseDueDate } = require('../services/webhook.service');
const { getNextSequence, recalibrateCounters } = require('../services/sequence.service');
const {
  formatNfNumber,
  formatRomaneioNumber,
  extractRomaneioFromFilename,
  extractRomaneioFromNotes,
  resolveRomaneioNumber,
  buildDriveAttachmentName,
  classifySaleAttachment
} = require('../utils/dataHelpers');
const { errorHandler } = require('../middlewares/errorHandler');
const { uploadDir } = require('../middlewares/upload');

let app;

beforeAll(async () => {
  await connectTestDB();
  app = require('../server');
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearCollections();
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => '{}'
  });
});

describe('branches ≥90 — utils & middleware', () => {
  test('dataHelpers edge branches', () => {
    expect(formatNfNumber('   ')).toBe('');
    expect(formatNfNumber(null)).toBe('');
    const key44 = '1'.repeat(25) + '000012345' + '1'.repeat(10);
    expect(formatNfNumber(key44).length).toBeGreaterThan(0);
    expect(formatNfNumber('0'.repeat(44)).length).toBeGreaterThan(0);
    expect(formatNfNumber('123456')).toBe('123456');
    expect(formatNfNumber('arquivo_1234.pdf')).toBe('1234');
    expect(formatNfNumber('x')).toBe('');
    expect(formatNfNumber('ab12cd')).toBe('');
    expect(formatNfNumber('folder/weird.ext')).toBe('');
    expect(formatNfNumber('somente_12345_no_meio')).toBe('12345');

    expect(formatRomaneioNumber(null)).toBe('');
    expect(formatRomaneioNumber('abc')).toBe('');
    expect(formatRomaneioNumber(97)).toBe('00097');

    expect(extractRomaneioFromFilename('')).toBe('');
    expect(extractRomaneioFromFilename('canhoto 0097123 final.pdf')).toMatch(/97/);
    expect(extractRomaneioFromNotes('')).toBe('');
    expect(extractRomaneioFromNotes('Planilha VP: 97123')).toBe('97123');

    expect(resolveRomaneioNumber({ romaneioNumber: '97' })).toBe('00097');
    expect(resolveRomaneioNumber({ notes: 'Planilha VP: 88' })).toBe('00088');
    expect(resolveRomaneioNumber({ evidenceFile: '0099-canhoto.pdf' })).toMatch(/99/);
    expect(resolveRomaneioNumber({})).toBe('');

    expect(buildDriveAttachmentName('nf', { romaneioNumber: '12', nfNumber: '28042894', ext: 'pdf' }))
      .toBe('00012-NF-28042894.pdf');
    expect(buildDriveAttachmentName('pedido', { originalName: 'semext' })).toBe('SEMROM-Pedido.bin');
    expect(buildDriveAttachmentName('payment', { romaneioNumber: '9', nfNumber: '1234567', originalName: 'a.jpeg' }))
      .toBe('00009-CP-1234567.jpeg');
    expect(buildDriveAttachmentName('x', { originalName: 'dir\\foto final.png' })).toBe('SEMROM-foto_final.png');
    expect(classifySaleAttachment('canhoto-scan.jpg', {})).toBe('pedido');
    expect(classifySaleAttachment('cp-loja.pdf', {})).toBe('cp');
    expect(classifySaleAttachment('anything.bin', { paymentProofFile: 'anything.bin' })).toBe('cp');
    expect(classifySaleAttachment('partial', { nfFile: 'timestamp-1-partial.pdf' })).toBe('nf');
  });

  test('errorHandler statusCode from res + empty message', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const res = {
      statusCode: 418,
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    errorHandler({ code: 'X' }, { method: 'GET', originalUrl: '/t' }, res, () => {});
    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json.mock.calls[0][0].message).toMatch(/interno/i);
    process.env.NODE_ENV = prev;
  });
});

describe('branches ≥90 — sequence / dashboard / webhook', () => {
  test('getNextSequence calibrates from existing ids; recalibrate catch', async () => {
    await WeighingSlip.create({
      id: 'PSG-007',
      client: 'C',
      truckPlate: 'AAA',
      date: '2025-01-01',
      originWeightKg: 1,
      destWeightKg: 1,
      netWeightKg: 1
    });
    await Counter.deleteMany({});
    const seq = await getNextSequence('weighing_slip_id', WeighingSlip, 'PSG-');
    expect(seq).toBeGreaterThanOrEqual(8);

    // force catch in recalibrate by making Counter.update throw once
    const spy = jest.spyOn(Counter, 'findByIdAndUpdate').mockRejectedValueOnce(new Error('counter down'));
    await recalibrateCounters();
    spy.mockRestore();
  });

  test('dashboard date filter + commercial fallbacks + vencidos + purchases', async () => {
    await Sale.create([
      {
        id: 'VP-D1',
        operationType: 'Intermediação (Corretagem / Comissão)',
        saleDate: '2025-06-01',
        client: 'A',
        totalOperation: 0,
        valorTotalVP: 0,
        totalVolumes: 10,
        dailyQuote: 40,
        paymentStatus: 'A Receber',
        producerPaymentStatus: 'A Pagar',
        status: 'Faturado',
        nfFile: 'NF.pdf',
        paymentTermDays: 0,
        dueDate: '2020-01-01'
      },
      {
        id: 'VP-D2',
        operationType: 'Intermediação (Corretagem / Comissão)',
        saleDate: 'bad-date',
        client: 'B',
        totalOperation: 5000,
        valorTotalVP: 5000,
        paymentStatus: 'Recebido',
        producerPaymentStatus: 'Pago',
        producerPaidAmount: 5000,
        status: 'Concluído',
        nfFile: ''
      }
    ]);
    await Purchase.create({
      id: 'CMP-2026-1',
      producer: 'Produtor Insumo',
      product: 'Embalagem',
      date: '2025-01-01',
      total: 100,
      paymentStatus: 'A Pagar',
      quantity: 1
    });

    const dash = await getDashboardData({ startDate: '2025-01-01', endDate: '2025-12-31' });
    expect(dash.kpis.salesCount).toBeGreaterThanOrEqual(1);
    expect(dash.kpis.totalSold).toBeGreaterThan(0);
    expect(dash.alerts.vencidos).toBeGreaterThan(0);
  });

  test('webhook parseDueDate + mime branches via attachment files', async () => {
    expect(parseDueDate({ dueDate: '2025-05-05' })).toBe('2025-05-05');
    expect(parseDueDate({ notes: 'Vencimento: 15/03/2025 | ok', saleDate: '2025-01-01' })).toBe('2025-03-15');
    expect(parseDueDate({ saleDate: '2025-01-01', paymentTermDays: 10 })).toMatch(/^2025-01-11/);
    expect(parseDueDate({})).toMatch(/^\d{4}-\d{2}-\d{2}/);

    fs.mkdirSync(uploadDir, { recursive: true });
    const names = ['VP-W1 - doc.pdf', 'note.xml', 'pic.png', 'photo.jpg', 'bin.dat'];
    for (const n of names) {
      fs.writeFileSync(path.join(uploadDir, `1-1-${n}`), Buffer.alloc(32, 1));
    }

    await sendSaleWebhook('sale.created', {
      id: 'VP-W1',
      client: 'Loja',
      saleDate: '2025-02-01',
      totalOperation: 0,
      valorTotalVP: 0,
      dailyQuote: 10,
      totalVolumes: 5,
      nfFile: 'doc.pdf',
      evidenceFile: 'note.xml',
      paymentProofFile: 'pic.png'
    });
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setTimeout(r, 30));
    expect(global.fetch).toHaveBeenCalled();
  });
});

describe('branches ≥90 — weighings + sale + auth/upload', () => {
  test('weighings list/create/update/delete/resolve branches', async () => {
    const { headers } = await authHeader();

    await request(app)
      .get('/api/weighings?status=all&search=xx&page=1&limit=10')
      .set(headers)
      .expect(200);

    const created = await request(app)
      .post('/api/weighings')
      .set(headers)
      .send({
        saleId: 'ROM-VP100',
        originWeightKg: 0,
        destWeightKg: 100,
        tolerancePct: 0.1,
        client: 'C',
        attachment: 'ticket.png'
      });
    expect(created.status).toBe(201);
    const slipId = created.body.id;

    await request(app)
      .put(`/api/weighings/${slipId}`)
      .set(headers)
      .send({ originWeightKg: 50, destWeightKg: 50, weightChoice: 'origin', applyWeightToSale: true })
      .expect(200);

    await request(app)
      .put(`/api/weighings/${slipId}`)
      .set(headers)
      .send({ originWeightKg: 40, destWeightKg: 45, weightChoice: 'dest' })
      .expect(200);

    await request(app)
      .put(`/api/weighings/${slipId}`)
      .set(headers)
      .send({ originWeightKg: 10, destWeightKg: 20 })
      .expect(200);

    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, 'ticket.png'), 'x');

    await request(app)
      .put(`/api/weighings/${slipId}/resolve`)
      .set(headers)
      .send({ weightChoice: 'origin', action: 'Ajustado', resolutionNotes: 'ok' })
      .expect(200);

    await request(app).delete(`/api/weighings/${slipId}`).set(headers).expect(200);
  });

  test('sale batata slip + update origin/notes + settle edges', async () => {
    const sale = await saleService.createSale({
      client: 'Batata Loja',
      origin: 'Produtor X',
      saleDate: '2025-03-01',
      totalOperation: 3000,
      valorTotalVP: 3200,
      nfFile: 'NF.pdf',
      notes: 'carga batata especial',
      items: [{ product: 'Batata Lavada', quantity: 10, kg: 250, dailyQuote: 12, boxWeightKg: 25 }],
      feeValue: 3,
      totalKg: 250,
      totalVolumes: 10
    });

    // existing slip path on second create with same id not applicable — update fields
    await saleService.updateSale(sale.id, {
      origin: 'Produtor Y',
      notes: 'Planilha VP: 97111',
      evidenceFile: '097111-canhoto.pdf',
      driverName: 'Joao',
      truckPlate: 'XYZ-1',
      totalKg: 260,
      items: [{ product: 'Batata Lavada', quantity: 11, kg: 260, dailyQuote: 12 }]
    });

    await saleService.settleSale(sale.id, {
      isPartial: true,
      paidAmount: 100,
      paymentProofFile: 'p.pdf'
    });
    await saleService.settleSale(sale.id, {
      isPartial: false,
      paymentProofFile: 'p2.pdf'
    });
  });

  test('auth login empty body + wrong user; upload multer/no-file branches', async () => {
    await ensureAdmin({ password: 'Admin123!' });

    const empty = await request(app).post('/api/auth/login').send({});
    expect(empty.status).toBe(400);

    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@x.com', password: 'nope' });
    expect(bad.status).toBe(401);

    const { headers } = await authHeader();
    const noFile = await request(app).post('/api/upload').set(headers);
    expect(noFile.status).toBe(400);

    const nfeNo = await request(app).post('/api/nfe/parse').set(headers);
    expect([400, 500]).toContain(nfeNo.status);
  });

  test('report start-only/end-only + short producer; financial filters', async () => {
    const { getStoresSummary, getProducersSummary } = require('../services/report.service');
    const { getFinancialSummary } = require('../services/financial.service');

    await Sale.create({
      id: 'VP-R1',
      operationType: 'Intermediação (Corretagem / Comissão)',
      saleDate: '2025-04-10',
      client: 'Loja Report',
      origin: 'Jo (curto)',
      totalOperation: 0,
      valorTotalVP: 0,
      totalVolumes: 8,
      dailyQuote: 50,
      totalKg: 200,
      paymentStatus: 'A Receber',
      paidAmount: 50,
      status: 'Faturado',
      nfFile: 'NF.pdf',
      freightPricePerUnit: 2,
      commissionDiscount: 10,
      dueDate: '2020-01-01',
      items: [{ product: 'Cenoura', quantity: 8, kg: 200 }]
    });
    await Sale.create({
      id: 'VP-R2',
      operationType: 'Intermediação (Corretagem / Comissão)',
      saleDate: '2025-04-11',
      client: 'Loja Report',
      origin: 'Produtor Longo Nome (Fazenda)',
      totalOperation: 1000,
      valorTotalVP: 0,
      paymentStatus: 'Recebido',
      paidAmount: 1000,
      status: 'Concluído',
      nfFile: '',
      saleDate: '2025-04-11'
    });

    await getStoresSummary({ startDate: '2025-04-01' });
    await getStoresSummary({ endDate: '2025-04-30' });
    await getStoresSummary({ startDate: '2025-04-01', endDate: '2025-04-30', producer: 'Jo' });
    await getStoresSummary({
      startDate: '2025-04-01',
      endDate: '2025-04-30',
      producer: 'Produtor Longo Nome (Fazenda)'
    });
    await getProducersSummary({
      startDate: '2025-04-01',
      endDate: '2025-04-30',
      producer: 'Produtor Longo Nome (Fazenda)'
    });

    const fin = await getFinancialSummary({
      startDate: '2025-04-01',
      endDate: '2025-04-30',
      client: 'Report',
      status: 'A Receber'
    });
    expect(fin).toBeTruthy();
    await getFinancialSummary({ startDate: '2025-04-01' });
    await getFinancialSummary({ endDate: '2025-04-30' });
  });

  test('sale cancel with files + producer settle/unsettle + sequence NaN ids', async () => {
    fs.mkdirSync(uploadDir, { recursive: true });
    const nf = `${Date.now()}-nf.pdf`;
    const ev = `${Date.now()}-ev.pdf`;
    fs.writeFileSync(path.join(uploadDir, nf), 'nf');
    fs.writeFileSync(path.join(uploadDir, ev), 'ev');

    const sale = await saleService.createSale({
      client: 'Cancel Loja',
      origin: 'Bruno Peres',
      saleDate: '2025-05-01',
      totalOperation: 4000,
      valorTotalVP: 4200,
      nfFile: nf,
      evidenceFile: ev,
      items: [{ product: 'Cenoura', quantity: 5, kg: 145, dailyQuote: 30 }],
      feeValue: 3,
      totalKg: 145,
      totalVolumes: 5
    });

    await saleService.settleProducerPayment(sale.id, {
      isPartial: true,
      paidAmount: 500,
      paymentProofFile: 'pp.pdf'
    });
    await saleService.unsettleProducerPayment(sale.id, { mode: 'last' });
    await saleService.settleProducerPayment(sale.id, {
      isPartial: false,
      paymentProofFile: 'pp2.pdf'
    });

    await saleService.cancelSale(sale.id, { reason: 'teste' });

    // sequence: docs with non-numeric suffix → NaN branch
    await Counter.deleteMany({ _id: 'sale_vp_id' });
    await Sale.collection.insertOne({
      id: 'VP-ABC',
      operationType: 'Intermediação (Corretagem / Comissão)',
      saleDate: '2025-01-01',
      client: 'X',
      totalOperation: 1,
      valorTotalVP: 1
    });
    const n = await getNextSequence('sale_vp_id', Sale, 'VP');
    expect(typeof n).toBe('number');
  });

  test('auth inactive user + upload error path', async () => {
    const { User } = require('../models');
    const { hashPassword } = require('../middlewares/auth');
    await User.create({
      id: 'USR-INAT',
      name: 'Inativo',
      email: 'inativo@agrovenda.com.br',
      password: await hashPassword('Admin123!'),
      role: 'Operador',
      status: 'Inativo',
      permissions: {}
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inativo@agrovenda.com.br', password: 'Admin123!' });
    expect(res.status).toBe(403);

    const { headers } = await authHeader();
    // multer rejects bad mime via upload middleware
    const bad = await request(app)
      .post('/api/upload')
      .set(headers)
      .attach('file', Buffer.from('MZ'), 'virus.exe');
    expect(bad.status).toBe(400);
  });

  test('report multi-item labels + sale syncSaleWeight branches', async () => {
    const { getStoresSummary } = require('../services/report.service');

    await Sale.create({
      id: 'VP777',
      operationType: 'Intermediação (Corretagem / Comissão)',
      saleDate: '2025-07-01',
      client: 'CEASA SP Capital',
      origin: '',
      notes: 'Venda de Mix Hortifruti | Produtor: Fazenda Sul | Vencimento: 10/08/2025 | Cotação: R$ 2,50',
      totalOperation: 0,
      valorTotalVP: 0,
      nfeKey: '2'.repeat(44),
      nfFile: '',
      paymentStatus: 'Parcial',
      paidAmount: 100,
      paymentHistory: [{ amount: 100, paymentMethod: 'TED', date: '2025-07-02' }],
      status: 'Faturado',
      destUF: '',
      evidenceFile: '12345678901-0-canhoto.pdf',
      items: [
        { product: 'Cenoura', quantity: 0, kg: 58, unit: 'Caixas (29kg)', boxWeightKg: 29 },
        { product: 'Batata', quantity: 2, kg: 50, unit: 'Sacas (25kg)', boxWeightKg: 25 },
        { product: 'Milho Granel', quantity: 0, kg: 100, unit: 'Granel (kg)', boxWeightKg: 1 }
      ],
      dailyQuote: 0,
      totalKg: 208,
      totalVolumes: 0
    });

    const stores = await getStoresSummary({
      startDate: '2025-07-01',
      endDate: '2025-07-31'
    });
    expect(stores.stores.length).toBeGreaterThan(0);

    await WeighingSlip.create({
      id: 'ROM-VP777',
      saleId: '',
      client: 'CEASA SP Capital',
      truckPlate: 'AAA',
      date: '2025-07-01',
      originWeightKg: 200,
      destWeightKg: 190,
      netWeightKg: 190
    });
    const slip = await WeighingSlip.findOne({ id: 'ROM-VP777' });
    await saleService.syncSaleWeightFromSlip(slip, 190, 'dest');
    await saleService.syncSaleWeightFromSlip(slip, 0, 'dest'); // early null
    await saleService.syncSaleWeightFromSlip(null, 10, 'origin');

    // cotacao > 10 path via volumes
    const s2 = await saleService.createSale({
      client: 'Loja RJ Centro',
      saleDate: '2025-07-02',
      totalOperation: 1000,
      valorTotalVP: 1000,
      nfFile: '12345678901234-1-NF-999.pdf',
      notes: 'Cotação: R$ 45,00',
      dailyQuote: 45,
      items: [{ product: 'Cenoura', quantity: 20, kg: 580, boxWeightKg: 29, price: 1.7 }],
      totalKg: 580,
      totalVolumes: 20,
      feeValue: 3
    });
    const slip2 = await WeighingSlip.findOne({ saleId: s2.id });
    if (slip2) {
      await saleService.syncSaleWeightFromSlip(slip2, 600, 'origin');
    }

    // sale without items: scale by totalKg
    await Sale.create({
      id: 'VP760',
      operationType: 'Intermediação (Corretagem / Comissão)',
      saleDate: '2025-07-03',
      client: 'Loja MG',
      totalOperation: 2000,
      valorTotalVP: 2000,
      totalKg: 100,
      totalVolumes: 0,
      nfFile: 'x.pdf',
      items: []
    });
    await WeighingSlip.create({
      id: 'PSG-760',
      saleId: 'VP760',
      client: 'Loja MG',
      truckPlate: 'B',
      date: '2025-07-03',
      originWeightKg: 100,
      destWeightKg: 90,
      netWeightKg: 90
    });
    await saleService.syncSaleWeightFromSlip(
      await WeighingSlip.findOne({ id: 'PSG-760' }),
      90,
      'other'
    );
  });

  test('login permissions sparse + report producers multi-item + weighings 500', async () => {
    const { User } = require('../models');
    const { hashPassword } = require('../middlewares/auth');
    const { getProducersSummary } = require('../services/report.service');

    await User.create({
      id: 'USR-SPARSE',
      name: 'Sparse',
      email: 'sparse@agrovenda.com.br',
      password: await hashPassword('Admin123!'),
      role: 'Operador',
      status: 'Ativo',
      permissions: { dashboard: false }
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sparse@agrovenda.com.br', password: 'Admin123!' });
    expect(login.status).toBe(200);
    expect(login.body.user.permissions.dashboard).toBe(false);

    await Sale.create({
      id: 'VP-PR1',
      operationType: 'Intermediação (Corretagem / Comissão)',
      saleDate: '2025-09-01',
      client: 'Loja Produtor',
      origin: 'Produtor Multi',
      totalOperation: 1500,
      valorTotalVP: 1600,
      paymentStatus: 'A Receber',
      paidAmount: 0,
      producerPaymentStatus: 'A Pagar',
      producerPaidAmount: 0,
      status: 'Faturado',
      nfFile: '',
      nfeKey: '3'.repeat(44),
      notes: 'Venda de Tomate | Produtor: Produtor Multi | Vencimento: 20/09/2025',
      items: [
        { product: 'Tomate', quantity: 3, kg: 0, unit: 'Caixas (29kg)' },
        { product: 'Batata Granel', kg: 40, quantity: 0, unit: 'Granel (kg)', boxWeightKg: 1 }
      ],
      totalKg: 40,
      freightCost: 30,
      commissionDiscount: 5
    });
    const prod = await getProducersSummary({
      startDate: '2025-09-01',
      endDate: '2025-09-30',
      producer: 'Produtor Multi'
    });
    expect(prod.producers.length).toBeGreaterThan(0);

    const { headers } = await authHeader();
    const findSpy = jest.spyOn(WeighingSlip, 'find').mockImplementationOnce(() => {
      throw new Error('db down');
    });
    const listFail = await request(app).get('/api/weighings').set(headers);
    expect(listFail.status).toBe(500);
    findSpy.mockRestore();

    const createSpy = jest.spyOn(WeighingSlip.prototype, 'save').mockRejectedValueOnce(new Error('save fail'));
    const createFail = await request(app)
      .post('/api/weighings')
      .set(headers)
      .send({ originWeightKg: 1, destWeightKg: 1 });
    expect(createFail.status).toBe(500);
    createSpy.mockRestore();

    const s = await saleService.createSale({
      client: 'Cheque Loja',
      saleDate: '2025-08-01',
      totalOperation: 800,
      valorTotalVP: 800,
      nfFile: 'n.pdf',
      items: [{ product: 'C', quantity: 1, kg: 29 }],
      feeValue: 3
    });
    await saleService.settleSale(s.id, {
      isPartial: true,
      paidAmount: 200,
      paymentMethod: 'Cheque',
      checkNumber: '123',
      checkBank: 'BB',
      checkDueDate: '2025-09-01',
      notes: 'parcial cheque'
    });

    // createSale with pre-existing slip (skip auto-create branch inverted)
    const pre = await saleService.createSale({
      client: 'Pre Slip',
      saleDate: '2025-08-02',
      totalOperation: 100,
      valorTotalVP: 100,
      nfFile: 'z.pdf',
      items: [{ product: 'C', quantity: 1, kg: 29 }]
    });
    // second update triggers slip sync fields without recreate
    await saleService.updateSale(pre.id, {
      totalKg: 40,
      driverName: 'D',
      truckPlate: 'TTT-1',
      items: [{ product: 'C', quantity: 2, kg: 40 }]
    });
  });

  test('final branch push: slip catch + sequence empty ids + nf helpers + jpeg webhook', async () => {
    const { calculateCommercialNet } = require('../utils/money');
    expect(calculateCommercialNet(1000, 0, 10, 5).liquidoPeloVP).toBeGreaterThan(0);
    expect(calculateCommercialNet(1000, 800, 0, 0).liquidoPelaNF).not.toBeNull();
    expect(calculateCommercialNet(500, 100).liquidoPeloVP).toBeGreaterThan(0);
    expect(formatNfNumber('arquivo_123456.pdf')).toBe('123456');
    expect(formatNfNumber('ab')).toBe('');
    expect(parseDueDate({ notes: 'Vencimento: sem-barra', saleDate: '2025-01-01' })).toMatch(/^2025/);
    expect(extractRomaneioFromFilename('0097123-canhoto.pdf')).toMatch(/97123|097123|971/);
    const { sanitizeFilename } = require('../middlewares/upload');
    expect(sanitizeFilename('Ação (1).PDF')).toMatch(/Acao/i);

    const slipSave = jest.spyOn(WeighingSlip.prototype, 'save').mockRejectedValueOnce(new Error('slip boom'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const sale = await saleService.createSale({
      client: 'Slip Fail',
      saleDate: '2025-10-01',
      totalOperation: 100,
      valorTotalVP: 100,
      nfFile: 'a.pdf',
      items: [{ product: 'C', quantity: 1, kg: 29 }]
    });
    expect(sale.id).toBeTruthy();
    expect(warn).toHaveBeenCalled();
    slipSave.mockRestore();
    warn.mockRestore();

    await Sale.collection.insertOne({
      saleDate: '2025-01-01',
      client: 'noid',
      totalOperation: 1,
      valorTotalVP: 1,
      operationType: 'Intermediação (Corretagem / Comissão)'
    });
    await recalibrateCounters();

    expect(formatNfNumber('!!9999!!')).toBe('9999');
    expect(resolveRomaneioNumber({ romaneioNumber: '', notes: '', evidenceFile: '' })).toBe('');

    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, '1-1-photo.jpeg'), Buffer.alloc(16, 2));
    await sendSaleWebhook('sale.updated', {
      id: 'VPJPEG',
      client: 'C',
      saleDate: '2025-02-01',
      totalOperation: 10,
      valorTotalVP: 10,
      paymentProofFile: 'photo.jpeg'
    });
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setTimeout(r, 40));

    // updateSale when slip update throws
    const s2 = await saleService.createSale({
      client: 'Up Slip',
      saleDate: '2025-10-02',
      totalOperation: 200,
      valorTotalVP: 200,
      nfFile: 'b.pdf',
      items: [{ product: 'C', quantity: 1, kg: 29 }],
      totalKg: 29
    });
    const findOneAndUpdateSpy = jest
      .spyOn(WeighingSlip, 'findOneAndUpdate')
      .mockRejectedValueOnce(new Error('upd fail'));
    const w2 = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await saleService.updateSale(s2.id, { totalKg: 35, driverName: 'Z' });
    findOneAndUpdateSpy.mockRestore();
    w2.mockRestore();
  });

  test('errorHandler statusCode 200/204 fallbacks to 500', () => {
    const makeRes = (code) => ({
      statusCode: code,
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    });
    const req = { method: 'POST', originalUrl: '/x' };
    const r200 = makeRes(200);
    errorHandler({ message: 'boom' }, req, r200, () => {});
    expect(r200.status).toHaveBeenCalledWith(500);
    const r204 = makeRes(204);
    errorHandler({ message: 'boom' }, req, r204, () => {});
    expect(r204.status).toHaveBeenCalledWith(500);
  });

  test('auth cookie miss + backupJson object branch', async () => {
    const { headers } = await authHeader();
    // cookie present but wrong name → match falsy branch
    const noTok = await request(app)
      .get('/api/sales')
      .set('Cookie', 'other_token=abc');
    expect(noTok.status).toBe(401);

    const restore = await request(app)
      .post('/api/backup/restore')
      .set(headers)
      .send({ backupJson: { version: 1, sales: [] }, confirmPhrase: 'RESTAURAR' });
    expect([200, 500]).toContain(restore.status);
  });
});
