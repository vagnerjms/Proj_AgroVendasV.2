process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_agrovenda_ci_2026';
process.env.NODE_ENV = 'test';
global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' });

jest.mock('../services/cleanup.service', () => ({
  cleanupOrphanUploads: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  startCleanupScheduler: jest.fn()
}));

const request = require('supertest');
const { connectTestDB, disconnectTestDB, clearCollections } = require('./setup');
const { authHeader } = require('./helpers');
const { WeighingSlip } = require('../models');
const { getNextSequence } = require('../services/sequence.service');
const { reconcilePatioSlip, findPatioCandidates } = require('../services/reconcilePatio.service');

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
});

describe('pátio + conciliação', () => {
  test('reconcile matched por nfNumber e peso dentro da tolerância', async () => {
    const seq = await getNextSequence('weighing_slip_id', WeighingSlip, 'PSG-');
    await WeighingSlip.create({
      id: `PSG-${String(seq).padStart(3, '0')}`,
      saleId: '',
      client: 'Aguardando',
      truckPlate: 'ABC1D23',
      driverName: 'João',
      date: '2025-01-01',
      originWeightKg: 1000,
      destWeightKg: 980,
      netWeightKg: 980,
      source: 'patio',
      nfNumber: '28042894',
      nfeKey: '',
      status: 'AguardandoVenda',
      matchStatus: 'unmatched'
    });

    const result = await reconcilePatioSlip({
      saleId: 'VP0099',
      nfNumber: '28042894',
      totalKg: 982,
      truckPlate: 'ABC1D23'
    });

    expect(result.status).toBe('matched');
    expect(result.slip.saleId).toBe('VP0099');
    expect(result.slip.matchStatus).toBe('matched');
  });

  test('findPatioCandidates vazio sem chaves', async () => {
    const list = await findPatioCandidates({});
    expect(list).toEqual([]);
  });

  test('divergent quando peso fora da tolerância', async () => {
    const seq = await getNextSequence('weighing_slip_id', WeighingSlip, 'PSG-');
    await WeighingSlip.create({
      id: `PSG-${String(seq).padStart(3, '0')}`,
      saleId: '',
      client: 'Aguardando',
      truckPlate: 'XYZ9Z99',
      driverName: 'Maria',
      date: '2025-01-01',
      originWeightKg: 2000,
      destWeightKg: 2000,
      netWeightKg: 2000,
      source: 'patio',
      nfNumber: '11112222',
      status: 'AguardandoVenda',
      matchStatus: 'unmatched'
    });

    const result = await reconcilePatioSlip({
      saleId: 'VP0100',
      nfNumber: '11112222',
      totalKg: 1500
    }, { weightTolerancePct: 0.25 });

    expect(result.status).toBe('divergent');
    expect(result.slip.matchStatus).toBe('divergent');
  });

  test('POST /api/weighings/patio cria slip sem venda', async () => {
    const auth = await authHeader();
    const headers = auth.headers;

    const res = await request(app)
      .post('/api/weighings/patio')
      .set(headers)
      .send({
        truckPlate: 'DEF2E34',
        nfNumber: '99887766',
        originWeightKg: 500,
        destWeightKg: 495,
        nfPhotoFile: 'Patio-NF-99887766.jpeg',
        scaleRomaneioImage: 'Patio-RomaneioBalanca.jpg'
      });

    expect(res.status).toBe(201);
    expect(res.body.source).toBe('patio');
    expect(res.body.saleId).toBe('');
    expect(res.body.status).toBe('AguardandoVenda');
    expect(res.body.matchStatus).toBe('unmatched');
  });

  test('GET candidates + POST reconcile via API', async () => {
    const auth = await authHeader();
    const headers = auth.headers;

    const seq = await getNextSequence('weighing_slip_id', WeighingSlip, 'PSG-');
    const slipId = `PSG-${String(seq).padStart(3, '0')}`;
    await WeighingSlip.create({
      id: slipId,
      saleId: '',
      client: 'Aguardando',
      truckPlate: 'GHI3H45',
      driverName: 'Pedro',
      date: '2025-01-02',
      originWeightKg: 800,
      destWeightKg: 800,
      netWeightKg: 800,
      source: 'patio',
      nfNumber: '55667788',
      status: 'AguardandoVenda',
      matchStatus: 'unmatched'
    });

    const cand = await request(app)
      .get('/api/weighings/patio/candidates?nfNumber=55667788&truckPlate=GHI3H45')
      .set(headers);
    expect(cand.status).toBe(200);
    expect(cand.body.candidates.length).toBeGreaterThanOrEqual(1);

    const rec = await request(app)
      .post('/api/weighings/patio/reconcile')
      .set(headers)
      .send({
        saleId: 'VP0200',
        nfNumber: '55667788',
        totalKg: 800,
        patioSlipId: slipId
      });
    expect(rec.status).toBe(200);
    expect(rec.body.status).toBe('matched');
    expect(rec.body.slip.saleId).toBe('VP0200');
  });

  test('POST /api/weighings/patio valida placa e anexos', async () => {
    const auth = await authHeader();
    const headers = auth.headers;

    const noPlate = await request(app)
      .post('/api/weighings/patio')
      .set(headers)
      .send({ nfPhotoFile: 'x.jpg' });
    expect(noPlate.status).toBe(400);

    const noFiles = await request(app)
      .post('/api/weighings/patio')
      .set(headers)
      .send({ truckPlate: 'AAA1A11' });
    expect(noFiles.status).toBe(400);
  });

  test('reconcile unmatched sem candidatos e match por chave SEFAZ', async () => {
    const empty = await reconcilePatioSlip({
      saleId: 'VP0300',
      nfNumber: '99999999',
      totalKg: 100
    });
    expect(empty.status).toBe('unmatched');

    const key = '35240112345678000190550010000012341123456789';
    const seq = await getNextSequence('weighing_slip_id', WeighingSlip, 'PSG-');
    await WeighingSlip.create({
      id: `PSG-${String(seq).padStart(3, '0')}`,
      saleId: '',
      client: 'Aguardando',
      truckPlate: 'JKL4K56',
      driverName: 'Ana',
      date: '2025-01-03',
      originWeightKg: 300,
      destWeightKg: 300,
      netWeightKg: 300,
      source: 'patio',
      nfeKey: key,
      nfNumber: '1234',
      status: 'AguardandoVenda',
      matchStatus: 'unmatched'
    });

    const byKey = await reconcilePatioSlip({
      saleId: 'VP0301',
      nfeKey: key,
      totalKg: 300
    });
    expect(byKey.status).toBe('matched');

    const byPlate = await findPatioCandidates({ truckPlate: 'JKL4K56' });
    expect(Array.isArray(byPlate)).toBe(true);
  });

  test('skipPatioReconcile na criação não vincula captura automática', async () => {
    const saleService = require('../services/sale.service');
    const seq = await getNextSequence('weighing_slip_id', WeighingSlip, 'PSG-');
    const slipId = `PSG-${String(seq).padStart(3, '0')}`;
    await WeighingSlip.create({
      id: slipId,
      saleId: '',
      client: 'Aguardando',
      truckPlate: 'SKIP1S11',
      driverName: 'Z',
      date: '2025-01-07',
      originWeightKg: 400,
      destWeightKg: 400,
      netWeightKg: 400,
      source: 'patio',
      nfNumber: '77889900',
      status: 'AguardandoVenda',
      matchStatus: 'unmatched'
    });

    const sale = await saleService.createSale({
      client: 'Loja Skip',
      origin: 'Produtor',
      saleDate: '2025-01-07',
      totalOperation: 1000,
      valorTotalVP: 1000,
      totalKg: 400,
      truckPlate: 'SKIP1S11',
      nfFile: 'NF-77889900.pdf',
      nfNumber: '77889900',
      skipPatioReconcile: true,
      items: [{ product: 'Cenoura', valorTotalVP: 1000 }],
      feeValue: 3
    });

    const slip = await WeighingSlip.findOne({ id: slipId }).lean();
    expect(slip.saleId).toBe('');
    expect(sale.id).toMatch(/^VP/);
  });

  test('re-conciliação desvincula romaneio de pátio anterior da mesma VP', async () => {
    const seq1 = await getNextSequence('weighing_slip_id', WeighingSlip, 'PSG-');
    const seq2 = await getNextSequence('weighing_slip_id', WeighingSlip, 'PSG-');
    const a = `PSG-${String(seq1).padStart(3, '0')}`;
    const b = `PSG-${String(seq2).padStart(3, '0')}`;
    await WeighingSlip.create({
      id: a,
      saleId: 'VP0500',
      client: 'Aguardando',
      truckPlate: 'OLD1O11',
      driverName: 'X',
      date: '2025-01-05',
      originWeightKg: 100,
      destWeightKg: 100,
      netWeightKg: 100,
      source: 'patio',
      nfNumber: '10010010',
      status: 'Aprovado',
      matchStatus: 'matched'
    });
    await WeighingSlip.create({
      id: b,
      saleId: '',
      client: 'Aguardando',
      truckPlate: 'NEW2N22',
      driverName: 'Y',
      date: '2025-01-06',
      originWeightKg: 100,
      destWeightKg: 100,
      netWeightKg: 100,
      source: 'patio',
      nfNumber: '20020020',
      status: 'AguardandoVenda',
      matchStatus: 'unmatched'
    });

    const result = await reconcilePatioSlip({
      saleId: 'VP0500',
      nfNumber: '20020020',
      totalKg: 100,
      patioSlipId: b
    });
    expect(result.status).toBe('matched');
    expect(result.slip.id).toBe(b);

    const old = await WeighingSlip.findOne({ id: a }).lean();
    expect(old.saleId).toBe('');
    expect(old.matchStatus).toBe('unmatched');
  });

  test('forced patioSlipId vincula mesmo com NF divergente de peso', async () => {
    const seq = await getNextSequence('weighing_slip_id', WeighingSlip, 'PSG-');
    const slipId = `PSG-${String(seq).padStart(3, '0')}`;
    await WeighingSlip.create({
      id: slipId,
      saleId: '',
      client: 'Aguardando',
      truckPlate: 'MNO5M67',
      driverName: 'Leo',
      date: '2025-01-04',
      originWeightKg: 1000,
      destWeightKg: 1000,
      netWeightKg: 1000,
      source: 'patio',
      nfNumber: '44556677',
      status: 'AguardandoVenda',
      matchStatus: 'unmatched'
    });

    const result = await reconcilePatioSlip({
      saleId: 'VP0400',
      nfNumber: '44556677',
      totalKg: 500,
      patioSlipId: slipId
    }, { weightTolerancePct: 0.25 });

    expect(result.status).toBe('divergent');
    expect(result.slip.saleId).toBe('VP0400');
  });
});
