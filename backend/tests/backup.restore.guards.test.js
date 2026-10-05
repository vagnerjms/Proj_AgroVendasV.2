process.env.JWT_SECRET = 'test_jwt_secret_agrovenda_ci_2026';
process.env.NODE_ENV = 'test';

jest.mock('../services/backup.service', () => ({
  getBackupStats: jest.fn().mockResolvedValue({ salesCount: 0 }),
  generateBackupPackage: jest.fn().mockResolvedValue({ version: 1, sales: [] }),
  restoreBackup: jest.fn().mockResolvedValue({ success: true, restoredStats: { sales: 0 } }),
  countSalesWithPayments: jest.fn().mockResolvedValue(0)
}));

const request = require('supertest');
const { connectTestDB, disconnectTestDB, clearCollections } = require('./setup');
const { authHeader } = require('./helpers');
const backupService = require('../services/backup.service');

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
});
