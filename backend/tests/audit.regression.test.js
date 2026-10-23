/**
 * Fase 1 — regressão das 5 correções de auditoria (pátio / Drive / cleanup / cancel).
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_agrovenda_ci_2026';
process.env.N8N_WEBHOOK_URL = 'http://n8n.test/webhook/agrovenda';
process.env.NODE_ENV = 'test';

global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' });

jest.mock('../services/cleanup.service', () => {
  const actual = jest.requireActual('../services/cleanup.service');
  return {
    ...actual,
    startCleanupScheduler: jest.fn()
  };
});

const fs = require('fs');
const path = require('path');
const { connectTestDB, disconnectTestDB, clearCollections } = require('./setup');
const { Sale, WeighingSlip } = require('../models');
const saleService = require('../services/sale.service');
const { getNextSequence } = require('../services/sequence.service');
const { sendSaleWebhook } = require('../services/webhook.service');
const { cleanupOrphanUploads } = require('../services/cleanup.service');
const { uploadDir } = require('../middlewares/upload');

beforeAll(async () => {
  await connectTestDB();
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearCollections();
  jest.clearAllMocks();
  global.fetch.mockResolvedValue({ ok: true, status: 200, text: async () => '' });
});

function writeUpload(name, content = 'x') {
  const p = path.join(uploadDir, name);
  fs.writeFileSync(p, content);
  // backdate mtime so cleanup would delete if orphaned
  const old = Date.now() - 2 * 60 * 60 * 1000;
  fs.utimesSync(p, new Date(old), new Date(old));
  return name;
}

describe('auditoria regressão — 5 correções', () => {
  test('createSale com patioReconcile=skip não vincula', async () => {
    const seq = await getNextSequence('weighing_slip_id', WeighingSlip, 'PSG-');
    const slipId = `PSG-${String(seq).padStart(3, '0')}`;
    await WeighingSlip.create({
      id: slipId,
      saleId: '',
      client: 'Aguardando',
      truckPlate: 'SKP2S22',
      driverName: 'M',
      date: '2025-02-08',
      originWeightKg: 120,
      destWeightKg: 120,
      netWeightKg: 120,
      source: 'patio',
      nfNumber: '44556677',
      status: 'AguardandoVenda',
      matchStatus: 'unmatched'
    });

    await saleService.createSale({
      client: 'Loja Skip Str',
      origin: 'Produtor',
      saleDate: '2025-02-08',
      totalOperation: 400,
      valorTotalVP: 400,
      totalKg: 120,
      truckPlate: 'SKP2S22',
      nfFile: 'NF-44556677.pdf',
      nfNumber: '44556677',
      patioReconcile: 'skip',
      items: [{ product: 'Cenoura', valorTotalVP: 400 }],
      feeValue: 3
    });

    const slip = await WeighingSlip.findOne({ id: slipId }).lean();
    expect(slip.saleId).toBe('');
  });

  test('createSale sem skip auto-vincula slip de pátio por NF', async () => {
    const seq = await getNextSequence('weighing_slip_id', WeighingSlip, 'PSG-');
    const slipId = `PSG-${String(seq).padStart(3, '0')}`;
    await WeighingSlip.create({
      id: slipId,
      saleId: '',
      client: 'Aguardando',
      truckPlate: 'AUT1A11',
      driverName: 'Moto',
      date: '2025-02-01',
      originWeightKg: 500,
      destWeightKg: 500,
      netWeightKg: 500,
      source: 'patio',
      nfNumber: '33445566',
      status: 'AguardandoVenda',
      matchStatus: 'unmatched'
    });

    const sale = await saleService.createSale({
      client: 'Loja Auto',
      origin: 'Produtor',
      saleDate: '2025-02-01',
      totalOperation: 2000,
      valorTotalVP: 2000,
      totalKg: 500,
      truckPlate: 'AUT1A11',
      nfFile: 'NF-33445566.pdf',
      nfNumber: '33445566',
      items: [{ product: 'Cenoura', valorTotalVP: 2000 }],
      feeValue: 3
    });

    const slip = await WeighingSlip.findOne({ id: slipId }).lean();
    expect(slip.saleId).toBe(sale.id);
    expect(['matched', 'divergent']).toContain(slip.matchStatus);
  });

  test('webhook: 2 paymentProofFiles no mesmo settle → CP01 e CP02 distintos', async () => {
    const a = writeUpload('cp-multi-a.pdf', 'aaa');
    const b = writeUpload('cp-multi-b.pdf', 'bbb');

    await sendSaleWebhook('sale.settled', {
      id: 'VP7701',
      client: 'Loja Multi CP',
      saleDate: '2025-02-02',
      totalOperation: 3000,
      valorTotalVP: 3000,
      paymentStatus: 'Parcial',
      status: 'Faturado',
      romaneioNumber: '10001',
      paymentHistory: [{
        seq: 1,
        amount: 1500,
        paymentProofFile: a,
        paymentProofFiles: [a, b]
      }]
    });

    await new Promise((r) => setTimeout(r, 80));
    expect(global.fetch).toHaveBeenCalled();
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    const cpNames = (body.files || [])
      .filter((f) => f.kind === 'cp')
      .map((f) => f.filename);
    expect(cpNames.length).toBeGreaterThanOrEqual(2);
    expect(cpNames.some((n) => /CP01/i.test(n))).toBe(true);
    expect(cpNames.some((n) => /CP02/i.test(n))).toBe(true);
    expect(new Set(cpNames).size).toBe(cpNames.length);

    fs.unlinkSync(path.join(uploadDir, a));
    fs.unlinkSync(path.join(uploadDir, b));
  });

  test('cleanup não remove nfPhotoFile de slip pátio', async () => {
    const photo = writeUpload('Patio-NF-audit-keep.jpeg', 'img');
    const seq = await getNextSequence('weighing_slip_id', WeighingSlip, 'PSG-');
    await WeighingSlip.create({
      id: `PSG-${String(seq).padStart(3, '0')}`,
      saleId: '',
      client: 'Aguardando',
      truckPlate: 'CLN1C11',
      driverName: 'M',
      date: '2025-02-03',
      originWeightKg: 1,
      destWeightKg: 1,
      netWeightKg: 1,
      source: 'patio',
      nfPhotoFile: photo,
      ticketImage: '',
      attachment: '',
      status: 'AguardandoVenda'
    });

    const result = await cleanupOrphanUploads();
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(uploadDir, photo))).toBe(true);
    fs.unlinkSync(path.join(uploadDir, photo));
  });

  test('cancelSale desvincula slip source=patio', async () => {
    const sale = await saleService.createSale({
      client: 'Loja Cancel Patio',
      origin: 'Produtor',
      saleDate: '2025-02-04',
      totalOperation: 1000,
      valorTotalVP: 1000,
      totalKg: 100,
      items: [{ product: 'Cenoura', valorTotalVP: 1000 }],
      feeValue: 3,
      skipPatioReconcile: true
    });

    const seq = await getNextSequence('weighing_slip_id', WeighingSlip, 'PSG-');
    const slipId = `PSG-${String(seq).padStart(3, '0')}`;
    await WeighingSlip.create({
      id: slipId,
      saleId: sale.id,
      client: sale.client,
      truckPlate: 'CXL1X11',
      driverName: 'M',
      date: '2025-02-04',
      originWeightKg: 100,
      destWeightKg: 100,
      netWeightKg: 100,
      source: 'patio',
      status: 'Aprovado',
      matchStatus: 'matched'
    });

    await saleService.cancelSale(sale.id);
    const slip = await WeighingSlip.findOne({ id: slipId }).lean();
    expect(slip.saleId).toBe('');
    expect(slip.matchStatus).toBe('unmatched');
    expect(slip.status).toBe('AguardandoVenda');
  });

  test('updateSale com patioReconcile=skip não re-vincula', async () => {
    const sale = await saleService.createSale({
      client: 'Loja Upd Skip2',
      origin: 'Produtor',
      saleDate: '2025-02-11',
      totalOperation: 500,
      valorTotalVP: 500,
      totalKg: 50,
      skipPatioReconcile: true,
      items: [{ product: 'Cenoura', valorTotalVP: 500 }],
      feeValue: 3
    });
    const seq = await getNextSequence('weighing_slip_id', WeighingSlip, 'PSG-');
    const slipId = `PSG-${String(seq).padStart(3, '0')}`;
    await WeighingSlip.create({
      id: slipId,
      saleId: '',
      client: 'Aguardando',
      truckPlate: 'SKP3S33',
      driverName: 'M',
      date: '2025-02-11',
      originWeightKg: 50,
      destWeightKg: 50,
      netWeightKg: 50,
      source: 'patio',
      nfNumber: '12121212',
      status: 'AguardandoVenda',
      matchStatus: 'unmatched'
    });
    await saleService.updateSale(sale.id, {
      totalKg: 50,
      nfNumber: '12121212',
      truckPlate: 'SKP3S33',
      patioReconcile: 'skip'
    });
    expect((await WeighingSlip.findOne({ id: slipId }).lean()).saleId).toBe('');
  });

  test('updateSale com skipPatioReconcile não re-vincula', async () => {
    const seq = await getNextSequence('weighing_slip_id', WeighingSlip, 'PSG-');
    const slipId = `PSG-${String(seq).padStart(3, '0')}`;
    await WeighingSlip.create({
      id: slipId,
      saleId: '',
      client: 'Aguardando',
      truckPlate: 'UPD1U11',
      driverName: 'M',
      date: '2025-02-06',
      originWeightKg: 300,
      destWeightKg: 300,
      netWeightKg: 300,
      source: 'patio',
      nfNumber: '66778899',
      status: 'AguardandoVenda',
      matchStatus: 'unmatched'
    });

    const sale = await saleService.createSale({
      client: 'Loja Upd Skip',
      origin: 'Produtor',
      saleDate: '2025-02-06',
      totalOperation: 900,
      valorTotalVP: 900,
      totalKg: 300,
      truckPlate: 'UPD1U11',
      nfFile: 'NF-66778899.pdf',
      nfNumber: '66778899',
      skipPatioReconcile: true,
      items: [{ product: 'Cenoura', valorTotalVP: 900 }],
      feeValue: 3
    });

    await saleService.updateSale(sale.id, {
      totalKg: 300,
      nfNumber: '66778899',
      truckPlate: 'UPD1U11',
      skipPatioReconcile: true
    });

    const slip = await WeighingSlip.findOne({ id: slipId }).lean();
    expect(slip.saleId).toBe('');
  });

  test('updateSale sem skip re-tenta conciliação pátio', async () => {
    const seq = await getNextSequence('weighing_slip_id', WeighingSlip, 'PSG-');
    const slipId = `PSG-${String(seq).padStart(3, '0')}`;
    await WeighingSlip.create({
      id: slipId,
      saleId: '',
      client: 'Aguardando',
      truckPlate: 'UPD2U22',
      driverName: 'M',
      date: '2025-02-07',
      originWeightKg: 250,
      destWeightKg: 250,
      netWeightKg: 250,
      source: 'patio',
      nfNumber: '11223344',
      status: 'AguardandoVenda',
      matchStatus: 'unmatched'
    });

    const sale = await saleService.createSale({
      client: 'Loja Upd Auto',
      origin: 'Produtor',
      saleDate: '2025-02-07',
      totalOperation: 800,
      valorTotalVP: 800,
      totalKg: 100,
      skipPatioReconcile: true,
      items: [{ product: 'Cenoura', valorTotalVP: 800 }],
      feeValue: 3
    });

    await saleService.updateSale(sale.id, {
      totalKg: 250,
      nfNumber: '11223344',
      truckPlate: 'UPD2U22',
      nfFile: 'NF-11223344.pdf'
    });

    const slip = await WeighingSlip.findOne({ id: slipId }).lean();
    expect(slip.saleId).toBe(sale.id);
  });

  test('webhook inclui anexos patio_nf e patio_romaneio do slip vinculado', async () => {
    const nfPhoto = writeUpload('Patio-NF-wh-audit.jpeg', 'nf');
    const scale = writeUpload('Patio-RomaneioBalanca-wh.jpg', 'sc');

    await WeighingSlip.create({
      id: 'PSG-WH1',
      saleId: 'VP7702',
      client: 'Loja Patio WH',
      truckPlate: 'WHB1W11',
      driverName: 'M',
      date: '2025-02-05',
      originWeightKg: 200,
      destWeightKg: 200,
      netWeightKg: 200,
      source: 'patio',
      nfPhotoFile: nfPhoto,
      scaleRomaneioImage: scale,
      status: 'Aprovado',
      matchStatus: 'matched'
    });

    await sendSaleWebhook('sale.created', {
      id: 'VP7702',
      client: 'Loja Patio WH',
      saleDate: '2025-02-05',
      totalOperation: 500,
      valorTotalVP: 500,
      status: 'Faturado',
      paymentStatus: 'A Receber',
      nfFile: null
    });

    await new Promise((r) => setTimeout(r, 80));
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    const kinds = (body.files || []).map((f) => f.kind);
    expect(kinds).toEqual(expect.arrayContaining(['patio_nf', 'patio_romaneio']));

    fs.unlinkSync(path.join(uploadDir, nfPhoto));
    fs.unlinkSync(path.join(uploadDir, scale));
  });

  test('webhook usa ticketImage como patio_romaneio se scaleRomaneioImage vazio', async () => {
    const nfPhoto = writeUpload('Patio-NF-wh-ticket.jpeg', 'nf2');
    const ticket = writeUpload('Patio-ticket-fallback.jpg', 'tk');

    await WeighingSlip.create({
      id: 'PSG-WH2',
      saleId: 'VP7703',
      client: 'Loja Ticket',
      truckPlate: 'TKT1T11',
      driverName: 'M',
      date: '2025-02-09',
      originWeightKg: 180,
      destWeightKg: 180,
      netWeightKg: 180,
      source: 'patio',
      nfPhotoFile: nfPhoto,
      scaleRomaneioImage: '',
      ticketImage: ticket,
      status: 'Aprovado',
      matchStatus: 'matched'
    });

    await sendSaleWebhook('sale.updated', {
      id: 'VP7703',
      client: 'Loja Ticket',
      saleDate: '2025-02-09',
      totalOperation: 400,
      valorTotalVP: 400,
      status: 'Faturado',
      paymentStatus: 'A Receber'
    });

    await new Promise((r) => setTimeout(r, 100));
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    const kinds = (body.files || []).map((f) => f.kind);
    expect(kinds).toEqual(expect.arrayContaining(['patio_nf', 'patio_romaneio']));

    fs.unlinkSync(path.join(uploadDir, nfPhoto));
    fs.unlinkSync(path.join(uploadDir, ticket));
  });

  test('createSale match divergente ainda vincula patio', async () => {
    const seq = await getNextSequence('weighing_slip_id', WeighingSlip, 'PSG-');
    const slipId = `PSG-${String(seq).padStart(3, '0')}`;
    await WeighingSlip.create({
      id: slipId,
      saleId: '',
      client: 'Aguardando',
      truckPlate: 'DIV1D11',
      driverName: 'M',
      date: '2025-02-10',
      originWeightKg: 1000,
      destWeightKg: 1000,
      netWeightKg: 1000,
      source: 'patio',
      nfNumber: '99887766',
      status: 'AguardandoVenda',
      matchStatus: 'unmatched'
    });

    const sale = await saleService.createSale({
      client: 'Loja Div',
      origin: 'Produtor',
      saleDate: '2025-02-10',
      totalOperation: 1000,
      valorTotalVP: 1000,
      totalKg: 500,
      truckPlate: 'DIV1D11',
      nfFile: 'NF-99887766.pdf',
      nfNumber: '99887766',
      items: [{ product: 'Cenoura', valorTotalVP: 1000 }],
      feeValue: 3
    });

    const slip = await WeighingSlip.findOne({ id: slipId }).lean();
    expect(slip.saleId).toBe(sale.id);
    expect(slip.matchStatus).toBe('divergent');
  });
});
