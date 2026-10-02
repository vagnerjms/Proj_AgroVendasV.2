process.env.JWT_SECRET = 'test_jwt_secret_agrovenda_ci_2026';
process.env.NODE_ENV = 'test';

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  text: async () => JSON.stringify({ ok: true })
});

jest.mock('../services/nfeParser.service', () => ({
  parse: jest.fn().mockResolvedValue({
    nfeKey: '11111111111111111111111111111111111111111111',
    items: [{ product: 'Cenoura NFe', quantity: 10, kg: 290 }]
  })
}));

jest.mock('../services/backup.service', () => ({
  getBackupStats: jest.fn().mockResolvedValue({ salesCount: 0 }),
  generateBackupPackage: jest.fn().mockResolvedValue({ version: 1, sales: [] }),
  restoreBackup: jest.fn().mockResolvedValue({ success: true, restored: 1 })
}));

jest.mock('../services/cleanup.service', () => ({
  cleanupOrphanUploads: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  startCleanupScheduler: jest.fn()
}));

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { connectTestDB, disconnectTestDB, clearCollections } = require('./setup');
const { authHeader, ensureAdmin, ADMIN_PERMS } = require('./helpers');
const { User, Sale, Client, Product, Purchase, WeighingSlip } = require('../models');
const { hashPassword, generateToken } = require('../middlewares/auth');
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
});

describe('GET /api/health', () => {
  test('retorna status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.database).toBeTruthy();
  });
});

describe('auth routes', () => {
  test('login sucesso, erros e bootstrap admin', async () => {
    await ensureAdmin({ password: 'Admin123!' });

    const ok = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@agrovenda.com.br', password: 'Admin123!' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();

    const alias = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin', password: 'Admin123!' });
    expect(alias.status).toBe(200);

    expect((await request(app).post('/api/auth/login').send({})).status).toBe(400);
    expect((await request(app).post('/api/auth/login').send({
      email: 'nobody@x.com', password: 'x'
    })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({
      email: 'admin@agrovenda.com.br', password: 'wrong'
    })).status).toBe(401);

    await User.updateOne({ email: 'admin@agrovenda.com.br' }, { status: 'Inativo' });
    expect((await request(app).post('/api/auth/login').send({
      email: 'admin@agrovenda.com.br', password: 'Admin123!'
    })).status).toBe(403);

    await clearCollections();
    const seeded = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin', password: 'Admin123!' });
    expect(seeded.status).toBe(200);

    // plain password upgrade
    await User.deleteMany({});
    await User.create({
      id: 'USR-010',
      name: 'Plain',
      email: 'plain@agrovenda.com.br',
      password: 'Plain123!',
      role: 'Operador Comercial',
      status: 'Ativo',
      permissions: ADMIN_PERMS
    });
    const upgraded = await request(app)
      .post('/api/auth/login')
      .send({ email: 'plain@agrovenda.com.br', password: 'Plain123!' });
    expect(upgraded.status).toBe(200);
    const u = await User.findOne({ email: 'plain@agrovenda.com.br' });
    expect(u.password.startsWith('$2')).toBe(true);
  });
});

describe('CRUD routes authenticated', () => {
  let headers;

  beforeEach(async () => {
    const auth = await authHeader();
    headers = auth.headers;
  });

  test('clients CRUD + filtros + bloqueio referencial', async () => {
    const created = await request(app)
      .post('/api/clients')
      .set(headers)
      .send({ name: 'Cliente A', document: '123', type: 'Comprador', city: 'Goiania', uf: 'go' });
    expect(created.status).toBe(201);

    expect((await request(app).post('/api/clients').set(headers).send({})).status).toBe(400);
    expect((await request(app).post('/api/clients').set(headers).send({
      name: 'Dup', document: '123'
    })).status).toBe(400);

    const list = await request(app).get('/api/clients?type=Comprador&search=Cliente').set(headers);
    expect(list.status).toBe(200);
    expect(list.body.length).toBe(1);

    const upd = await request(app)
      .put(`/api/clients/${created.body.id}`)
      .set(headers)
      .send({ city: 'Anapolis', uf: 'go' });
    expect(upd.body.city).toBe('Anapolis');
    expect(upd.body.uf).toBe('GO');

    expect((await request(app).put('/api/clients/NOPE').set(headers).send({ name: 'X' })).status).toBe(404);

    const del = await request(app).delete(`/api/clients/${created.body.id}`).set(headers);
    expect(del.status).toBe(200);

    const c2 = await request(app).post('/api/clients').set(headers)
      .send({ name: 'Com Venda', type: 'Comprador' });
    await Sale.create({
      id: 'VP1',
      operationType: 'Intermediação (Corretagem / Comissão)',
      saleDate: '2025-01-01',
      client: 'Com Venda',
      totalOperation: 1
    });
    expect((await request(app).delete(`/api/clients/${c2.body.id}`).set(headers)).status).toBe(400);
    expect((await request(app).delete('/api/clients/NOPE').set(headers)).status).toBe(404);
  });

  test('products CRUD', async () => {
    const parent = await request(app).post('/api/products').set(headers)
      .send({ name: 'Batata', category: 'Hortifruti', defaultUnit: 'Sacas (sc)', unitKg: 25 });
    expect(parent.status).toBe(201);

    const created = await request(app).post('/api/products').set(headers)
      .send({ name: 'Soja Premium', parentProductId: parent.body.id });
    expect(created.status).toBe(201);
    expect(created.body.category).toBe('Grãos');
    expect(created.body.parentProductId).toBe(parent.body.id);

    const orphan = await request(app).post('/api/products').set(headers)
      .send({ name: 'Milho Temp', parentProductId: '   ' });
    expect(orphan.status).toBe(201);
    expect(orphan.body.parentProductId == null).toBe(true);
    expect((await request(app).delete(`/api/products/${orphan.body.id}`).set(headers)).status).toBe(200);

    const childLink = await request(app).post('/api/products').set(headers)
      .send({ name: 'Batata Especial Temp', category: 'Hortifruti', parentProductId: parent.body.id });
    expect(childLink.status).toBe(201);
    const clearParent = await request(app).put(`/api/products/${childLink.body.id}`).set(headers)
      .send({ parentProductId: '' });
    expect(clearParent.status).toBe(200);
    expect(clearParent.body.parentProductId == null).toBe(true);
    expect((await request(app).delete(`/api/products/${childLink.body.id}`).set(headers)).status).toBe(200);

    expect((await request(app).post('/api/products').set(headers).send({})).status).toBe(400);
    expect((await request(app).post('/api/products').set(headers).send({ name: 'Soja Premium' })).status).toBe(400);

    const list = await request(app).get('/api/products?search=Soja').set(headers);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.length).toBeGreaterThanOrEqual(1);

    const byCat = await request(app).get('/api/products?category=all').set(headers);
    expect(byCat.status).toBe(200);

    const upd = await request(app).put(`/api/products/${created.body.id}`).set(headers)
      .send({
        currentStock: 10,
        unitKg: 60,
        averageCost: 1.5,
        defaultUnit: 'Sacas',
        category: 'Grãos',
        name: 'Soja Premium',
        parentProductId: null
      });
    expect(upd.status).toBe(200);
    expect(upd.body.currentStock).toBe(10);
    expect(upd.body.parentProductId == null).toBe(true);
    expect((await request(app).put('/api/products/NOPE').set(headers).send({ name: 'X' })).status).toBe(404);

    const del = await request(app).delete(`/api/products/${created.body.id}`).set(headers);
    expect(del.status).toBe(200);
    expect((await request(app).delete(`/api/products/${parent.body.id}`).set(headers)).status).toBe(200);

    const p2 = await request(app).post('/api/products').set(headers).send({ name: 'Cenoura' });
    await Sale.create({
      id: 'VP2',
      operationType: 'Intermediação (Corretagem / Comissão)',
      saleDate: '2025-01-01',
      client: 'C',
      totalOperation: 1,
      items: [{ product: 'Cenoura' }]
    });
    expect((await request(app).delete(`/api/products/${p2.body.id}`).set(headers)).status).toBe(400);
    expect((await request(app).delete('/api/products/NOPE').set(headers)).status).toBe(404);
  });

  test('purchases CRUD', async () => {
    const created = await request(app).post('/api/purchases').set(headers).send({
      producer: 'Prod',
      product: 'Caixa',
      quantity: 10,
      unitPrice: 5,
      total: 50
    });
    expect(created.status).toBe(201);

    const list = await request(app).get('/api/purchases?status=Recebido&search=Caixa').set(headers);
    expect(list.body.length).toBe(1);

    const upd = await request(app).put(`/api/purchases/${created.body.id}`).set(headers)
      .send({ paymentStatus: 'Pago', paidAmount: 50 });
    expect(upd.body.paymentStatus).toBe('Pago');
    expect((await request(app).put('/api/purchases/NOPE').set(headers).send({})).status).toBe(404);

    expect((await request(app).delete(`/api/purchases/${created.body.id}`).set(headers)).status).toBe(200);
    expect((await request(app).delete('/api/purchases/NOPE').set(headers)).status).toBe(404);
  });

  test('users CRUD + proteções', async () => {
    const list = await request(app).get('/api/users').set(headers);
    expect(list.status).toBe(200);

    await clearCollections();
    const auth2 = await authHeader();
    const emptyList = await request(app).get('/api/users').set(auth2.headers);
    expect(emptyList.status).toBe(200);

    const headers2 = auth2.headers;
    const created = await request(app).post('/api/users').set(headers2).send({
      name: 'Operador',
      email: 'op@agrovenda.com.br',
      password: 'Op123!',
      role: 'Operador Comercial'
    });
    expect(created.status).toBe(201);
    expect(created.body.password).toBeUndefined();

    expect((await request(app).post('/api/users').set(headers2).send({ name: 'X' })).status).toBe(400);
    expect((await request(app).post('/api/users').set(headers2).send({
      email: 'op@agrovenda.com.br', name: 'Dup'
    })).status).toBe(409);

    const upd = await request(app).put(`/api/users/${created.body.id}`).set(headers2)
      .send({ phone: '1199', password: 'NewPass1!', email: 'op2@agrovenda.com.br' });
    expect(upd.body.phone).toBe('1199');

    expect((await request(app).put('/api/users/NOPE').set(headers2).send({ name: 'X' })).status).toBe(404);

    const admin = await User.findOne({ role: 'Administrador Geral' });
    expect((await request(app).delete(`/api/users/${admin.id}`).set(headers2)).status).toBe(400);

    const selfHeaders = {
      Authorization: `Bearer ${generateToken({
        id: created.body.id,
        name: 'Operador',
        email: 'op2@agrovenda.com.br',
        role: 'Administrador Geral',
        permissions: ADMIN_PERMS
      })}`
    };
    await User.updateOne({ id: created.body.id }, { role: 'Administrador Geral', status: 'Ativo' });
    await User.create({
      id: 'USR-099',
      name: 'Other Admin',
      email: 'other@agrovenda.com.br',
      password: await hashPassword('x'),
      role: 'Administrador Geral',
      status: 'Ativo',
      permissions: ADMIN_PERMS
    });
    expect((await request(app).delete(`/api/users/${created.body.id}`).set(selfHeaders)).status).toBe(400);

    expect((await request(app).delete('/api/users/USR-099').set(headers2)).status).toBe(200);
    expect((await request(app).delete('/api/users/NOPE').set(headers2)).status).toBe(404);
  });

  test('dashboard, financial, reports, notifications', async () => {
    await Sale.create({
      id: 'VP10',
      operationType: 'Intermediação (Corretagem / Comissão)',
      saleDate: '2025-05-01',
      client: 'Loja R',
      origin: 'Bruno Peres',
      totalOperation: 10000,
      valorTotalVP: 12000,
      status: 'Faturado',
      nfFile: 'NF.pdf',
      totalKg: 1000,
      totalVolumes: 30
    });

    expect((await request(app).get('/api/dashboard').set(headers)).status).toBe(200);
    expect((await request(app).get('/api/dashboard?startDate=2025-01-01&endDate=2025-12-31').set(headers)).status).toBe(200);
    expect((await request(app).get('/api/financial').set(headers)).status).toBe(200);
    expect((await request(app).get('/api/reports/stores-summary').set(headers)).status).toBe(200);
    expect((await request(app).get('/api/reports/producers-summary').set(headers)).status).toBe(200);

    const trigger = await request(app).post('/api/reports/trigger-n8n').set(headers)
      .send({ webhookUrl: 'http://example.com/hook', activeTab: 'lojas' });
    expect(trigger.status).toBe(200);

    expect((await request(app).get('/api/notifications').set(headers)).status).toBe(200);
    expect((await request(app).post('/api/notifications/refresh').set(headers)).status).toBe(200);
  });

  test('sales routes cobertura', async () => {
    const created = await request(app).post('/api/sales').set(headers).send({
      client: 'Loja S',
      origin: 'Bruno Peres',
      saleDate: '2025-04-01',
      totalOperation: 8000,
      valorTotalVP: 10000,
      nfFile: 'NF-8000.pdf',
      evidenceFile: '09750-x.jpeg',
      items: [{ product: 'Cenoura', quantity: 50, kg: 1450, dailyQuote: 40 }],
      nfeKey: '22222222222222222222222222222222222222222222',
      feeValue: 3,
      totalVolumes: 50,
      totalKg: 1450
    });
    expect(created.status).toBe(201);
    const id = created.body.id;

    expect((await request(app).get('/api/sales').set(headers)).status).toBe(200);
    expect((await request(app).get('/api/sales?status=Faturado&search=Loja&page=1&limit=10').set(headers)).status).toBe(200);
    expect((await request(app).get('/api/sales?status=Pendente%20NF').set(headers)).status).toBe(200);
    expect((await request(app).get('/api/sales?operationType=all&status=Cancelada').set(headers)).status).toBe(200);
    expect((await request(app).get('/api/sales/agenda-events').set(headers)).status).toBe(200);
    expect((await request(app).get(`/api/sales/${id}`).set(headers)).status).toBe(200);
    expect((await request(app).get('/api/sales/NOPE').set(headers)).status).toBe(404);

    const check = await request(app)
      .get('/api/sales/check-nfe/22222222222222222222222222222222222222222222')
      .set(headers);
    expect(check.body.exists).toBe(true);
    expect((await request(app).get('/api/sales/check-nfe/short').set(headers)).body.exists).toBe(false);

    const upd = await request(app).put(`/api/sales/${id}`).set(headers)
      .send({ client: 'Loja S2', romaneioNumber: '9750' });
    expect(upd.body.client).toBe('Loja S2');

    expect((await request(app).post(`/api/sales/${id}/settle`).set(headers)
      .send({ isPartial: true, paidAmount: 1000 })).status).toBe(200);
    expect((await request(app).post(`/api/sales/${id}/unsettle`).set(headers)
      .send({ mode: 'last' })).status).toBe(200);
    expect((await request(app).post(`/api/sales/${id}/settle-producer`).set(headers)
      .send({ isPartial: true, paidAmount: 1000 })).status).toBe(200);
    expect((await request(app).post(`/api/sales/${id}/unsettle-producer`).set(headers)
      .send({})).status).toBe(200);
    expect((await request(app).post(`/api/sales/${id}/sync-calendar`).set(headers)).status).toBe(200);
    expect((await request(app).post('/api/sales/NOPE/sync-calendar').set(headers)).status).toBe(404);

    // sync-all with single sale (250ms delay once)
    expect((await request(app).post('/api/sales/sync-all-webhooks').set(headers)).status).toBe(200);

    expect((await request(app).post(`/api/sales/${id}/cancel`).set(headers)).status).toBe(200);
    expect((await request(app).delete(`/api/sales/${id}`).set(headers)).status).toBe(200);
  });

  test('weighings CRUD + resolve', async () => {
    await Sale.create({
      id: 'VP500',
      operationType: 'Intermediação (Corretagem / Comissão)',
      saleDate: '2025-03-01',
      client: 'Loja W',
      totalOperation: 5000,
      valorTotalVP: 6000,
      totalKg: 2900,
      totalVolumes: 100,
      dailyQuote: 45,
      items: [{ product: 'Cenoura', kg: 2900, quantity: 100, boxWeightKg: 29, price: 2 }]
    });

    const created = await request(app).post('/api/weighings').set(headers).send({
      saleId: 'VP500',
      client: 'Loja W',
      originWeightKg: 3000,
      destWeightKg: 2900,
      tolerancePct: 0.1,
      ticketImage: 'ticket.jpg'
    });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('Divergente');
    const wid = created.body.id;

    expect((await request(app).get('/api/weighings?status=Divergente&search=VP500&page=1&limit=5').set(headers)).status).toBe(200);

    const upd = await request(app).put(`/api/weighings/${wid}`).set(headers).send({
      originWeightKg: 3000,
      destWeightKg: 2900,
      weightChoice: 'dest',
      applyWeightToSale: true,
      discountKg: 0
    });
    expect(upd.status).toBe(200);
    expect(upd.body.saleUpdated).toBe(true);

    const created2 = await request(app).post('/api/weighings').set(headers).send({
      saleId: 'ROM-VP500',
      originWeightKg: 3100,
      destWeightKg: 3000,
      tolerancePct: 0.1
    });
    await request(app).put(`/api/weighings/${created2.body.id}`).set(headers).send({
      originWeightKg: 3100,
      destWeightKg: 3000,
      weightChoice: 'origin'
    });
    await request(app).put(`/api/weighings/${created2.body.id}`).set(headers).send({
      originWeightKg: 3100,
      destWeightKg: 3000
    });
    expect((await request(app).put('/api/weighings/NOPE').set(headers).send({
      originWeightKg: 1, destWeightKg: 1
    })).status).toBe(404);

    const resolve = await request(app).put(`/api/weighings/${wid}/resolve`).set(headers)
      .send({ action: 'Ajustado', weightChoice: 'origin', resolutionNotes: 'ok' });
    expect(resolve.status).toBe(200);

    expect((await request(app).put('/api/weighings/NOPE/resolve').set(headers).send({})).status).toBe(404);

    expect((await request(app).delete(`/api/weighings/${wid}`).set(headers)).status).toBe(200);
    expect((await request(app).delete('/api/weighings/NOPE').set(headers)).status).toBe(404);
  });

  test('upload + backup + unauthorized', async () => {
    expect((await request(app).get('/api/sales')).status).toBe(401);

    const tmp = path.join(uploadDir, 'tmp-upload-test.txt');
    fs.writeFileSync(tmp, 'hello');

    const up = await request(app)
      .post('/api/upload')
      .set(headers)
      .attach('file', tmp);
    expect(up.status).toBe(200);
    expect(up.body.filename).toBeTruthy();

    expect((await request(app).post('/api/upload').set(headers)).status).toBe(400);

    const nfe = await request(app)
      .post('/api/nfe/parse')
      .set(headers)
      .field('xmlContent', '<nfe>ok</nfe>');
    expect(nfe.status).toBe(200);

    expect((await request(app).post('/api/nfe/parse').set(headers)).status).toBe(400);

    expect((await request(app).post('/api/upload/cleanup').set(headers)).status).toBe(200);

    expect((await request(app).get('/api/backup/stats').set(headers)).status).toBe(200);
    expect((await request(app).get('/api/backup/export').set(headers)).status).toBe(200);

    const restore = await request(app)
      .post('/api/backup/restore')
      .set(headers)
      .send({ backupJson: { sales: [] } });
    expect(restore.status).toBe(200);

    expect((await request(app).post('/api/backup/restore').set(headers).send({})).status).toBe(400);

    // operator without backup permission
    const opToken = generateToken({
      id: 'USR-OP',
      name: 'Op',
      email: 'opx@x.com',
      role: 'Operador',
      permissions: { ...ADMIN_PERMS, backup_sistema: false, cadastros_users: false }
    });
    expect((await request(app).get('/api/backup/stats').set({ Authorization: `Bearer ${opToken}` })).status).toBe(403);

    try { fs.unlinkSync(tmp); } catch (_) {}
  });
});
