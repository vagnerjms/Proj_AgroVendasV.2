process.env.JWT_SECRET = 'test_jwt_secret_agrovenda_ci_2026';

jest.mock('../services/nfeParser.service', () => ({
  parse: jest.fn()
    .mockResolvedValueOnce({ nfeKey: 'k', items: [{ product: 'X' }] })
    .mockRejectedValue(new Error('xml inválido'))
}));

jest.mock('../services/backup.service', () => ({
  getBackupStats: jest.fn().mockResolvedValue({ salesCount: 1 }),
  generateBackupPackage: jest.fn().mockResolvedValue({ ok: true }),
  restoreBackup: jest.fn().mockResolvedValue({ success: true }),
  countSalesWithPayments: jest.fn().mockResolvedValue(0)
}));

jest.mock('../services/cleanup.service', () => ({
  cleanupOrphanUploads: jest.fn()
    .mockResolvedValueOnce({ deletedCount: 1 })
    .mockRejectedValueOnce(new Error('cleanup fail')),
  startCleanupScheduler: jest.fn()
}));

jest.mock('../services/report.service', () => ({
  getStoresSummary: jest.fn().mockResolvedValue({ stores: [] }),
  getProducersSummary: jest.fn().mockResolvedValue({ producers: [] }),
  triggerN8nReport: jest.fn().mockResolvedValue({ success: true })
}));

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { connectTestDB, disconnectTestDB, clearCollections } = require('./setup');
const { authHeader } = require('./helpers');
const {
  Sale, Client, Product, Purchase, WeighingSlip, User
} = require('../models');
const { uploadDir } = require('../middlewares/upload');
const reportSvc = require('../services/report.service');
const { deleteSale } = require('../services/sale.service');
const { sendSaleWebhook } = require('../services/webhook.service');

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
  reportSvc.getStoresSummary.mockResolvedValue({ stores: [] });
  reportSvc.getProducersSummary.mockResolvedValue({ producers: [] });
  reportSvc.triggerN8nReport.mockResolvedValue({ success: true });
});

describe('error paths and leftover functions', () => {
  test('CRUD catch 500s', async () => {
    const { headers } = await authHeader();

    jest.spyOn(Client, 'find').mockReturnValueOnce({
      sort: () => ({ lean: () => Promise.reject(new Error('db')) })
    });
    expect((await request(app).get('/api/clients').set(headers)).status).toBe(500);
    Client.find.mockRestore();

    jest.spyOn(Product, 'find').mockReturnValueOnce({
      sort: () => ({ lean: () => Promise.reject(new Error('db')) })
    });
    expect((await request(app).get('/api/products').set(headers)).status).toBe(500);
    Product.find.mockRestore();

    jest.spyOn(Purchase, 'find').mockReturnValueOnce({
      sort: () => ({ lean: () => Promise.reject(new Error('db')) })
    });
    expect((await request(app).get('/api/purchases').set(headers)).status).toBe(500);
    Purchase.find.mockRestore();

    jest.spyOn(WeighingSlip, 'countDocuments').mockRejectedValueOnce(new Error('db'));
    expect((await request(app).get('/api/weighings').set(headers)).status).toBe(500);
    WeighingSlip.countDocuments.mockRestore();

    jest.spyOn(User, 'find').mockReturnValueOnce({
      sort: () => ({ lean: () => Promise.reject(new Error('u')) })
    });
    expect((await request(app).get('/api/users').set(headers)).status).toBe(500);
    User.find.mockRestore();
  });

  test('reports/notifications catch via mocks', async () => {
    const { headers } = await authHeader();
    reportSvc.getStoresSummary.mockRejectedValueOnce(new Error('r'));
    expect((await request(app).get('/api/reports/stores-summary').set(headers)).status).toBe(500);
    reportSvc.getProducersSummary.mockRejectedValueOnce(new Error('r'));
    expect((await request(app).get('/api/reports/producers-summary').set(headers)).status).toBe(500);
    reportSvc.triggerN8nReport.mockRejectedValueOnce(new Error('r'));
    expect((await request(app).post('/api/reports/trigger-n8n').set(headers)
      .send({ webhookUrl: 'http://x.com' })).status).toBe(500);

    const audit = require('../services/audit.service');
    jest.spyOn(audit, 'generateNotifications').mockRejectedValueOnce(new Error('n'));
    expect((await request(app).get('/api/notifications').set(headers)).status).toBe(500);
    audit.generateNotifications.mockRestore();
    jest.spyOn(audit, 'generateNotifications').mockRejectedValueOnce(new Error('n'));
    expect((await request(app).post('/api/notifications/refresh').set(headers)).status).toBe(500);
    audit.generateNotifications.mockRestore();
  });

  test('upload/nfe/cleanup/backup errors', async () => {
    const { headers } = await authHeader();
    // multer reject via unsupported extension without crashing superagent
    const res = await request(app)
      .post('/api/upload')
      .set(headers)
      .field('file', 'not-a-file');
    expect([400, 500]).toContain(res.status);

    const xml = path.join(uploadDir, 'fail-nfe.xml');
    fs.writeFileSync(xml, '<nfe/>');
    const NfeParser = require('../services/nfeParser.service');
    NfeParser.parse.mockReset();
    NfeParser.parse.mockImplementation(() => Promise.reject(new Error('xml inválido')));
    const nfeFail = await request(app).post('/api/nfe/parse').set(headers).attach('file', xml);
    expect(nfeFail.status).toBe(400);

    // nfe multer error path (no file)
    const nfeNoFile = await request(app).post('/api/nfe/parse').set(headers).send({});
    expect(nfeNoFile.status).toBe(400);

    const cleanup = require('../services/cleanup.service');
    cleanup.cleanupOrphanUploads.mockResolvedValueOnce({ deletedCount: 1 });
    expect((await request(app).post('/api/upload/cleanup').set(headers)).status).toBe(200);
    cleanup.cleanupOrphanUploads.mockRejectedValueOnce(new Error('cleanup fail'));
    expect((await request(app).post('/api/upload/cleanup').set(headers)).status).toBe(500);

    const backup = require('../services/backup.service');
    backup.getBackupStats.mockRejectedValueOnce(new Error('b'));
    expect((await request(app).get('/api/backup/stats').set(headers)).status).toBe(500);
    backup.generateBackupPackage.mockRejectedValueOnce(new Error('b'));
    expect((await request(app).get('/api/backup/export').set(headers)).status).toBe(500);
    backup.restoreBackup.mockRejectedValueOnce(new Error('b'));
    expect((await request(app).post('/api/backup/restore').set(headers)
      .send({ backupJson: { sales: [] }, confirmPhrase: 'RESTAURAR' })).status).toBe(500);

    try { fs.unlinkSync(xml); } catch (_) {}
  });

  test('auth rate limit + login 500', async () => {
    const prevDisable = process.env.DISABLE_AUTH_RATE_LIMIT;
    const prevE2e = process.env.E2E;
    delete process.env.DISABLE_AUTH_RATE_LIMIT;
    delete process.env.E2E;
    try {
      // use unique IP-ish email flood then different email for 500
      for (let i = 0; i < 12; i++) {
        await request(app).post('/api/auth/login').send({ email: 'rl@x.com', password: 'bad' });
      }
      const limited = await request(app).post('/api/auth/login').send({ email: 'rl@x.com', password: 'bad' });
      expect(limited.status).toBe(429);

      // Cobre o catch 500 do login sem interferência do rate-limit
      process.env.DISABLE_AUTH_RATE_LIMIT = '1';
      jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('auth boom'));
      const boom = await request(app).post('/api/auth/login')
        .send({ email: 'ok@x.com', password: 'x' });
      expect(boom.status).toBe(500);
      User.findOne.mockRestore();
    } finally {
      if (prevDisable !== undefined) process.env.DISABLE_AUTH_RATE_LIMIT = prevDisable;
      else delete process.env.DISABLE_AUTH_RATE_LIMIT;
      if (prevE2e !== undefined) process.env.E2E = prevE2e;
      else delete process.env.E2E;
    }
  });

  test('deleteSale + webhook setImmediate flush + sale settle syncProducer false branch', async () => {
    await Sale.create({
      id: 'VPDEL',
      operationType: 'Intermediação (Corretagem / Comissão)',
      saleDate: '2025-01-01',
      client: 'C',
      totalOperation: 100,
      status: 'Faturado',
      nfFile: 'a.pdf'
    });
    const cancelled = await deleteSale('VPDEL');
    expect(cancelled.status).toBe('Cancelada');

    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '{}' });
    await sendSaleWebhook('sale.created', {
      id: 'VPFLUSH',
      client: 'Cliente Teste',
      saleDate: '2025-01-01',
      totalOperation: 100,
      valorTotalVP: 100,
      nfFile: null,
      nfeKey: '12345678',
      paymentTermDays: 30
    });
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setTimeout(r, 50));

    const saleSvc = require('../services/sale.service');
    const s = await saleSvc.createSale({
      client: 'L',
      origin: 'Bruno Peres',
      saleDate: '2025-01-01',
      totalOperation: 2000,
      valorTotalVP: 2000,
      nfFile: 'nf.pdf',
      items: [{ product: 'Cenoura', valorTotalVP: 2000 }],
      feeValue: 3
    });
    const settled = await saleSvc.settleSale(s.id, { isPartial: false, syncProducerPayment: false });
    expect(settled.paymentStatus).toBe('Recebido');
    expect(settled.producerPaymentStatus).not.toBe('Pago');
  });
});
