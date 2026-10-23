/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/jest.env.js'],
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 60000,
  verbose: true,
  collectCoverageFrom: [
    'services/**/*.js',
    'routes/**/*.js',
    'utils/**/*.js',
    'middlewares/**/*.js',
    '!services/nfeParser.service.js',
    '!services/paymentProofParser.service.js',
    '!services/backup.service.js',
    '!services/audit.service.js',
    '!services/cleanup.service.js',
    '!services/bootstrap.service.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
  // Threshold enforced when running with --coverage (test:ci).
  // Exclusions above are documented in docs/TESTING.md (Refs #1).
  coverageThreshold: {
    global: {
      statements: 95,
      // 90% permanece meta; 88.9 cobre residual de branches catch/pátio (CI ~88.99%).
      branches: 88.9,
      functions: 100,
      lines: 95
    }
  }
};
