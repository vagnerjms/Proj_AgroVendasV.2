// Garante ambiente de teste mesmo se o shell ficou com NODE_ENV=production (ex.: e2e).
process.env.NODE_ENV = 'test';
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_agrovenda_ci_2026';
}
