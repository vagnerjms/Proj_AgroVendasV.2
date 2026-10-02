/**
 * Isolates auth module load to cover production JWT_SECRET fatal branch.
 */
describe('auth production JWT_SECRET', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    jest.resetModules();
  });

  test('throws when production sem JWT_SECRET', () => {
    jest.resetModules();
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    expect(() => require('../middlewares/auth')).toThrow(/JWT_SECRET/);
  });

  test('loads with JWT_SECRET in production', () => {
    jest.resetModules();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'prod_secret_test_value';
    const auth = require('../middlewares/auth');
    expect(auth.JWT_SECRET).toBe('prod_secret_test_value');
  });
});
