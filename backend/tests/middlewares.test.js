process.env.JWT_SECRET = 'test_jwt_secret_agrovenda_ci_2026';

const {
  generateToken,
  hashPassword,
  comparePassword,
  requireAuth,
  requirePermission,
  requireAdmin,
  JWT_SECRET
} = require('../middlewares/auth');
const { errorHandler } = require('../middlewares/errorHandler');
const { sanitizeFilename, upload, uploadDir } = require('../middlewares/upload');
const { mockRes } = require('./helpers');
const fs = require('fs');
const path = require('path');

describe('auth middleware', () => {
  test('generateToken / hash / compare', async () => {
    const token = generateToken({
      id: 'USR-1',
      name: 'A',
      email: 'a@a.com',
      role: 'Administrador Geral',
      permissions: {}
    });
    expect(typeof token).toBe('string');
    expect(JWT_SECRET).toBeTruthy();

    expect(await hashPassword('')).toBe('');
    const hashed = await hashPassword('Secret123!');
    expect(hashed.startsWith('$2')).toBe(true);
    expect(await hashPassword(hashed)).toBe(hashed);
    expect(await comparePassword('Secret123!', hashed)).toBe(true);
    expect(await comparePassword('wrong', hashed)).toBe(false);
    expect(await comparePassword('plain', 'plain')).toBe(true);
    expect(await comparePassword('', 'x')).toBe(false);
  });

  test('requireAuth — header, cookie, query e erros', async () => {
    const user = { id: '1', role: 'Administrador Geral' };
    const token = generateToken(user);

    await new Promise((resolve) => {
      requireAuth({ headers: { authorization: `Bearer ${token}` }, query: {} }, mockRes(), resolve);
    });
    await new Promise((resolve) => {
      requireAuth({ headers: { cookie: `agrovenda_token=${token}` }, query: {} }, mockRes(), resolve);
    });
    await new Promise((resolve) => {
      requireAuth({ headers: {}, query: { token } }, mockRes(), resolve);
    });

    const res401 = mockRes();
    requireAuth({ headers: {}, query: {} }, res401, () => {});
    expect(res401.statusCode).toBe(401);

    const res403 = mockRes();
    await new Promise((resolve) => {
      const r = mockRes();
      r.status = (code) => {
        r.statusCode = code;
        resolve(r);
        return r;
      };
      requireAuth({ headers: { authorization: 'Bearer bad.token.here' }, query: {} }, r, () => resolve(r));
    }).then((r) => {
      expect(r.statusCode).toBe(403);
    });
  });

  test('requirePermission e requireAdmin', () => {
    const res401 = mockRes();
    requirePermission('dashboard')({ user: null }, res401, jest.fn());
    expect(res401.statusCode).toBe(401);

    const nextAdmin = jest.fn();
    requirePermission('x')({ user: { role: 'Administrador Geral' } }, mockRes(), nextAdmin);
    expect(nextAdmin).toHaveBeenCalled();

    const nextPerm = jest.fn();
    requirePermission('relatorios')({
      user: { role: 'Operador', permissions: { relatorios: true } }
    }, mockRes(), nextPerm);
    expect(nextPerm).toHaveBeenCalled();

    const res403 = mockRes();
    requirePermission('backup_sistema')({
      user: { role: 'Operador', permissions: {} }
    }, res403, jest.fn());
    expect(res403.statusCode).toBe(403);

    const nextOk = jest.fn();
    requireAdmin({ user: { role: 'Administrador Geral' } }, mockRes(), nextOk);
    expect(nextOk).toHaveBeenCalled();

    const resAdmin = mockRes();
    requireAdmin({ user: { role: 'Operador' } }, resAdmin, jest.fn());
    expect(resAdmin.statusCode).toBe(403);
  });
});

describe('errorHandler', () => {
  test('responde com stack fora de produção', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    const err = new Error('boom');
    err.statusCode = 418;
    err.code = 'TEAPOT';
    err.stack = 'stack';
    const res = mockRes();
    errorHandler(err, { method: 'GET', originalUrl: '/x' }, res, jest.fn());
    expect(res.statusCode).toBe(418);
    expect(res.body.message).toBe('boom');
    expect(res.body.stack).toBe('stack');
    process.env.NODE_ENV = prev;
  });

  test('produção omite stack', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const res = mockRes();
    res.statusCode = 200;
    errorHandler(new Error('fail'), { method: 'POST', originalUrl: '/y' }, res, jest.fn());
    expect(res.statusCode).toBe(500);
    expect(res.body.stack).toBeUndefined();
    process.env.NODE_ENV = prev;
  });
});

describe('upload middleware', () => {
  test('sanitizeFilename e uploadDir', () => {
    expect(sanitizeFilename('')).toBe('arquivo');
    expect(sanitizeFilename('Nota Fiscal (1).pdf')).toMatch(/Nota_Fiscal/);
    expect(fs.existsSync(uploadDir)).toBe(true);
  });

  test('fileFilter aceita mime/ext e rejeita inválido', (done) => {
    const filter = upload.fileFilter;
    filter({}, { mimetype: 'application/pdf', originalname: 'a.pdf' }, (err, ok) => {
      expect(ok).toBe(true);
      filter({}, { mimetype: 'image/jpeg', originalname: 'a.jpg' }, (err2, ok2) => {
        expect(ok2).toBe(true);
        filter({}, { mimetype: 'text/html', originalname: 'x.html' }, (err3, ok3) => {
          expect(err3).toBeInstanceOf(Error);
          expect(ok3).toBe(false);
          done();
        });
      });
    });
  });

  test('storage destination e filename', (done) => {
    const storage = upload.storage;
    storage._handleFile(
      {},
      {
        stream: require('stream').Readable.from(['x']),
        originalname: 'canhoto çao.pdf',
        mimetype: 'application/pdf'
      },
      (err, info) => {
        expect(err).toBeFalsy();
        expect(info.filename).toMatch(/canhoto/);
        if (info.path && fs.existsSync(info.path)) {
          fs.unlinkSync(info.path);
        }
        done();
      }
    );
  });
});
