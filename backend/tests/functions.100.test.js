/**
 * Close remaining FNDA:0 functions → 100% functions coverage.
 */
process.env.JWT_SECRET = 'test_jwt_secret_functions_100';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { connectTestDB, disconnectTestDB, clearCollections } = require('./setup');
const { authHeader } = require('./helpers');
const saleService = require('../services/sale.service');
const productService = require('../services/product.service');
const { createNodeFetchBridge, triggerN8nReport } = require('../services/report.service');
const { uploadDir } = require('../middlewares/upload');

jest.mock('../services/nfeParser.service', () => ({
  parse: jest.fn().mockResolvedValue({
    nfeKey: '55555555555555555555555555555555555555555555',
    items: [{ product: 'Func Prod', quantity: 1, kg: 10 }]
  })
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

let app;

async function flushMicrotasks() {
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
}

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

describe('functions 100%', () => {
  test('sale create/update ensureProductsRegistered.catch callbacks', async () => {
    const spy = jest
      .spyOn(productService, 'ensureProductsRegistered')
      .mockRejectedValue(new Error('catalog down'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const sale = await saleService.createSale({
      client: 'Catch Loja',
      origin: 'Bruno Peres',
      saleDate: '2025-02-01',
      totalOperation: 2000,
      valorTotalVP: 2200,
      nfFile: 'NF.pdf',
      items: [{ product: 'Produto Catch', quantity: 1, kg: 29, dailyQuote: 40 }],
      feeValue: 3,
      totalKg: 29,
      totalVolumes: 1
    });
    await flushMicrotasks();

    await saleService.updateSale(sale.id, {
      items: [{ product: 'Produto Catch 2', quantity: 2, kg: 58, dailyQuote: 40 }],
      totalKg: 58,
      totalVolumes: 2
    });
    await flushMicrotasks();

    expect(spy).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    spy.mockRestore();
    warn.mockRestore();
  });

  test('upload nfe parse ensureProductsRegistered.catch callback', async () => {
    const auth = await authHeader();
    const NfeParser = require('../services/nfeParser.service');
    const spy = jest
      .spyOn(productService, 'ensureProductsRegistered')
      .mockRejectedValue(new Error('prod fail'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    NfeParser.parse.mockResolvedValueOnce({
      nfeKey: '66666666666666666666666666666666666666666666',
      items: [{ product: 'Auto Prod', quantity: 1, kg: 10 }]
    });

    const res = await request(app)
      .post('/api/nfe/parse')
      .set(auth.headers)
      .field('xmlContent', '<nfe>ok</nfe>');
    expect(res.status).toBe(200);
    await flushMicrotasks();

    expect(spy).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    spy.mockRestore();
    warn.mockRestore();
  });

  test('createNodeFetchBridge then-callback (node-fetch path)', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const bridge = createNodeFetchBridge(async () => ({ default: mockFetch }));
    await bridge('http://example.com/hook', { method: 'POST', body: '{}' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://example.com/hook',
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('triggerN8nReport abort timeout callback fires', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    try {
      global.fetch = jest.fn(
        (_url, opts) =>
          new Promise((_resolve, reject) => {
            if (opts?.signal) {
              opts.signal.addEventListener('abort', () => {
                const err = new Error('aborted');
                err.name = 'AbortError';
                reject(err);
              });
            }
          })
      );

      let caught;
      const pending = triggerN8nReport(
        { name: 'U' },
        {
          webhookUrl: 'http://127.0.0.1:9/hook-abort',
          activeTab: 'lojas',
          excelHtml: '<html></html>'
        }
      ).catch((e) => {
        caught = e;
      });

      await jest.advanceTimersByTimeAsync(15000);
      await pending;
      expect(caught).toMatchObject({ name: 'AbortError' });
    } finally {
      jest.useRealTimers();
    }
  });

  test('auth setInterval filter runs with populated loginAttempts', async () => {
    jest.resetModules();

    const intervalCallbacks = [];
    const setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation((fn, ms, ...rest) => {
      if (ms === 5 * 60 * 1000) {
        intervalCallbacks.push(fn);
        return 999;
      }
      return setTimeout(fn, ms, ...rest);
    });

    jest.doMock('../db', () => ({
      User: {
        findOne: jest.fn().mockResolvedValue(null),
        countDocuments: jest.fn().mockResolvedValue(1)
      }
    }));

    const express = require('express');
    const authRoutes = require('../routes/auth.routes');
    const isolated = express();
    isolated.use(express.json());
    isolated.use('/api/auth', authRoutes);

    for (let i = 0; i < 3; i++) {
      await request(isolated)
        .post('/api/auth/login')
        .send({ email: `nobody${i}@x.com`, password: 'wrong' });
    }

    expect(intervalCallbacks.length).toBeGreaterThanOrEqual(1);
    intervalCallbacks[0]();

    setIntervalSpy.mockRestore();
    jest.dontMock('../db');
    jest.resetModules();
  });
});
