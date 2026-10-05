process.env.JWT_SECRET = 'test_jwt_secret_agrovenda_ci_2026';
process.env.NODE_ENV = 'test';

jest.mock('../services/cleanup.service', () => ({
  cleanupOrphanUploads: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  startCleanupScheduler: jest.fn()
}));

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { connectTestDB, disconnectTestDB, clearCollections } = require('./setup');
const { authHeader } = require('./helpers');
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
});

describe('GET /uploads — auth + 404 (sem SPA)', () => {
  test('arquivo inexistente com ?token= válido → 404 texto (não HTML dashboard)', async () => {
    const { token } = await authHeader();
    const res = await request(app).get(`/uploads/missing-e2e-fixture.pdf?token=${token}`);

    expect(res.status).toBe(404);
    expect(String(res.headers['content-type'] || '')).toMatch(/text\/plain/i);
    expect(res.text).toMatch(/n[aã]o encontrado/i);
    expect(res.text).not.toMatch(/<!DOCTYPE html>/i);
    expect(res.text).not.toMatch(/dashboard/i);
  });

  test('arquivo existente com ?token= JWT válido → 200', async () => {
    const { token } = await authHeader();
    const fixtureName = `fixture-upload-${Date.now()}.txt`;
    const fixturePath = path.join(uploadDir, fixtureName);
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(fixturePath, 'agrovenda-upload-ok');

    try {
      const res = await request(app).get(`/uploads/${fixtureName}?token=${token}`);
      expect(res.status).toBe(200);
      expect(res.text).toBe('agrovenda-upload-ok');
    } finally {
      try { fs.unlinkSync(fixturePath); } catch (_) {}
    }
  });

  test('sem token → 401', async () => {
    const res = await request(app).get('/uploads/qualquer.pdf');
    expect(res.status).toBe(401);
  });

  test('alias VP012 - NF-xxx.pdf resolve ficheiro Multer no disco → 200', async () => {
    const { token } = await authHeader();
    const diskName = `1790984754718-961184305-NF-28008239.pdf`;
    const aliasName = 'VP012 - NF-28008239.pdf';
    const fixturePath = path.join(uploadDir, diskName);
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(fixturePath, 'nf-pdf-content');

    try {
      const res = await request(app)
        .get(`/uploads/${encodeURIComponent(aliasName)}?token=${token}`)
        .buffer(true)
        .parse((res, cb) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        });
      expect(res.status).toBe(200);
      expect(Buffer.isBuffer(res.body) ? res.body.toString('utf8') : String(res.text || '')).toBe('nf-pdf-content');
    } finally {
      try { fs.unlinkSync(fixturePath); } catch (_) {}
    }
  });
});
