process.env.JWT_SECRET = 'test_jwt_secret_agrovenda_ci_2026';
process.env.NODE_ENV = 'test';

jest.mock('../services/backup.service', () => ({
  getBackupStats: jest.fn().mockResolvedValue({ salesCount: 0 }),
  generateBackupPackage: jest.fn().mockResolvedValue({ version: 1, sales: [] }),
  restoreBackup: jest.fn().mockResolvedValue({ success: true, restoredStats: { sales: 0 } }),
  countSalesWithPayments: jest.fn().mockResolvedValue(0)
}));

const path = require('path');
const fs = require('fs');
const os = require('os');
const request = require('supertest');
const { connectTestDB, disconnectTestDB, clearCollections } = require('./setup');
const { authHeader } = require('./helpers');
const backupService = require('../services/backup.service');
const { BACKUP_RESTORE_MAX_BYTES, upload } = require('../middlewares/upload');

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
  backupService.countSalesWithPayments.mockResolvedValue(0);
  backupService.restoreBackup.mockResolvedValue({ success: true, restoredStats: { sales: 0 } });
});

describe('backup restore guards', () => {
  test('restore sem confirmPhrase → 400', async () => {
    const { headers } = await authHeader();
    const res = await request(app)
      .post('/api/backup/restore')
      .set(headers)
      .send({ backupJson: { sales: [] } });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/RESTAURAR/i);
    expect(backupService.restoreBackup).not.toHaveBeenCalled();
  });

  test('restore com baixas no DB e sem acknowledgePaymentsLoss → 409', async () => {
    const { headers } = await authHeader();
    backupService.countSalesWithPayments.mockResolvedValueOnce(3);

    const res = await request(app)
      .post('/api/backup/restore')
      .set(headers)
      .send({
        backupJson: { sales: [] },
        confirmPhrase: 'RESTAURAR'
      });

    expect(res.status).toBe(409);
    expect(res.body.salesWithPayments).toBe(3);
    expect(backupService.restoreBackup).not.toHaveBeenCalled();
  });

  test('restore com frase + acknowledge → 200 (mock service)', async () => {
    const { headers } = await authHeader();
    backupService.countSalesWithPayments.mockResolvedValueOnce(2);

    const res = await request(app)
      .post('/api/backup/restore')
      .set(headers)
      .send({
        backupJson: { sales: [] },
        confirmPhrase: 'RESTAURAR',
        acknowledgePaymentsLoss: true
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(backupService.restoreBackup).toHaveBeenCalledTimes(1);
  });

  test('backupUpload aceita pacote > 15MB (acima do upload genérico)', async () => {
    expect(BACKUP_RESTORE_MAX_BYTES).toBe(100 * 1024 * 1024);
    expect(upload.limits.fileSize).toBe(15 * 1024 * 1024);
    expect(BACKUP_RESTORE_MAX_BYTES).toBeGreaterThan(upload.limits.fileSize);

    const { headers } = await authHeader();
    const tmp = path.join(os.tmpdir(), `agrovenda-restore-over15-${Date.now()}.json`);
    // ~16MB — acima do limite genérico de anexos, abaixo do limite de restore
    const payload = JSON.stringify({
      database: { sales: [], clients: [], products: [], weighingSlips: [] },
      files: [],
      pad: 'x'.repeat(16 * 1024 * 1024)
    });
    fs.writeFileSync(tmp, payload);

    try {
      const res = await request(app)
        .post('/api/backup/restore')
        .set(headers)
        .field('confirmPhrase', 'RESTAURAR')
        .field('acknowledgePaymentsLoss', 'true')
        .attach('backupFile', tmp);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(backupService.restoreBackup).toHaveBeenCalledTimes(1);
    } finally {
      fs.unlinkSync(tmp);
    }
  });
});
